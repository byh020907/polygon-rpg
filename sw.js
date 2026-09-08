const expectedBuildId = new URL(self.location.href).searchParams.get('build');
const metadataUrl = new URL('./public/release-metadata.js', self.location.href);
if (expectedBuildId) metadataUrl.searchParams.set('build', expectedBuildId);
importScripts(metadataUrl.href);

const RELEASE = self.POLYGON_RPG_RELEASE;
if (!RELEASE?.buildId || (expectedBuildId && expectedBuildId !== RELEASE.buildId)) {
  throw new Error('요청한 업데이트와 배포 metadata가 다릅니다. 현재 버전을 유지합니다.');
}

const SCOPE = self.registration.scope;
const SCOPE_PATH = new URL(SCOPE).pathname;
const CACHE_PREFIX = `polygon-rpg-release-v2-${encodeURIComponent(SCOPE)}-`;
const CACHE_NAME = `${CACHE_PREFIX}${RELEASE.buildId}`;
const CLIENT_CACHE_NAME = `polygon-rpg-clients-v2-${encodeURIComponent(SCOPE)}`;
const COMPLETE_URL = new URL('./__pwa_release_complete__', SCOPE).href;
const CLIENT_PREFIX = new URL('./__pwa_client__/', SCOPE).href;
const SHELL_URL = new URL('./index.html', SCOPE).href;
const OFFLINE_URL = new URL('./offline.html', SCOPE).href;
const METADATA_URL = new URL('./public/release-metadata.js', SCOPE).href;
const PROBE_URL = new URL('./public/release.json', SCOPE).href;

function isScopeUrl(url) {
  const parsed = new URL(url);
  return parsed.origin === self.location.origin && parsed.pathname.startsWith(SCOPE_PATH);
}

function releaseIdentity(release) {
  if (typeof release?.buildId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(release.buildId)) {
    return null;
  }
  return { appVersion: release.appVersion, buildId: release.buildId };
}

async function readCompleteRelease(buildId) {
  const cacheName = `${CACHE_PREFIX}${buildId}`;
  if (!(await caches.has(cacheName))) return null;
  const cache = await caches.open(cacheName);
  const response = await cache.match(COMPLETE_URL);
  if (!response) return null;
  const complete = await response.json();
  return complete.scope === SCOPE && complete.release?.buildId === buildId
    ? { cache, ...complete }
    : null;
}

async function releaseCache(buildId) {
  const complete = await readCompleteRelease(buildId);
  if (complete) return complete.cache;
  // The published pre-v2 worker did not use a scope key or completion marker.
  // Read its shell only for a pinned old client; never mutate or delete that cache.
  const legacyName = `polygon-rpg-release-${buildId}`;
  if (!(await caches.has(legacyName))) return null;
  const legacy = await caches.open(legacyName);
  return (await legacy.match(SHELL_URL)) && (await legacy.match(METADATA_URL)) ? legacy : null;
}

async function clientRelease(clientId) {
  if (!clientId) return null;
  const cache = await caches.open(CLIENT_CACHE_NAME);
  const response = await cache.match(`${CLIENT_PREFIX}${encodeURIComponent(clientId)}`);
  return response ? releaseIdentity(await response.json()) : null;
}

async function pinClient(clientId, release) {
  const identity = releaseIdentity(release);
  if (!clientId || !identity) return;
  const cache = await caches.open(CLIENT_CACHE_NAME);
  await cache.put(
    `${CLIENT_PREFIX}${encodeURIComponent(clientId)}`,
    new Response(JSON.stringify(identity), { headers: { 'Content-Type': 'application/json' } }),
  );
}

async function scopeClients() {
  return (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(
    (client) => isScopeUrl(client.url),
  );
}

async function pinUnrecordedClients(release) {
  if (!releaseIdentity(release)) return;
  for (const client of await scopeClients()) {
    if (!(await clientRelease(client.id))) await pinClient(client.id, release);
  }
}

async function activeRelease() {
  const active = self.registration.active;
  if (!active) return null;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let finished = false;
    const finish = (release) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      channel.port1.close();
      resolve(releaseIdentity(release));
    };
    const timeout = setTimeout(() => finish(null), 2500);
    channel.port1.onmessage = (event) => finish(event.data?.release);
    try {
      active.postMessage({ type: 'GET_RELEASE_METADATA' }, [channel.port2]);
    } catch {
      finish(null);
    }
  });
}

async function cacheCompleteRelease(cache, previousRelease) {
  let nextAsset = 0;
  let failure = null;
  const prepareAsset = async () => {
    while (!failure && nextAsset < RELEASE.assets.length) {
      const asset = RELEASE.assets[nextAsset++];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const canonicalUrl = new URL(`./${asset}`, SCOPE);
        if (
          !isScopeUrl(canonicalUrl.href) ||
          !/^[a-f0-9]{64}$/.test(RELEASE.assetDigests?.[asset])
        ) {
          throw new Error(`업데이트 asset 정보가 올바르지 않습니다: ${asset}`);
        }
        const downloadUrl = new URL(canonicalUrl);
        downloadUrl.searchParams.set('build', RELEASE.buildId);
        const response = await fetch(
          new Request(downloadUrl, { cache: 'reload', signal: controller.signal }),
        );
        if (!response.ok) throw new Error(`필수 offline asset 준비 실패: ${asset}`);
        // Consume each body immediately. Waiting for hundreds of response headers first
        // can block a mobile connection pool behind unread response streams.
        const bytes = await response.arrayBuffer();
        const digest = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
          (v) => v.toString(16).padStart(2, '0'),
        ).join('');
        if (digest !== RELEASE.assetDigests[asset]) {
          throw new Error(`배포 파일 검증 실패: ${asset}. 현재 버전을 유지합니다.`);
        }
        const headers = new Headers(response.headers);
        headers.delete('content-encoding');
        headers.delete('content-length');
        await cache.put(
          canonicalUrl.href,
          new Response(bytes, { headers, status: response.status }),
        );
      } catch (error) {
        failure ??= controller.signal.aborted
          ? new Error(`업데이트 다운로드 시간이 초과되었습니다: ${asset}`)
          : error;
      } finally {
        clearTimeout(timeout);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, RELEASE.assets.length) }, prepareAsset));
  if (failure) throw failure;
  // Metadata is the exact object imported by this worker. Hashing its generated file
  // would make the build fingerprint recursive, and refetching could cross deployments.
  await cache.put(
    METADATA_URL,
    new Response(`globalThis.POLYGON_RPG_RELEASE = Object.freeze(${JSON.stringify(RELEASE)});\n`, {
      headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
    }),
  );
  await cache.put(
    COMPLETE_URL,
    new Response(
      JSON.stringify({ scope: SCOPE, release: releaseIdentity(RELEASE), previousRelease }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );
}

async function reportDiagnostic(message) {
  for (const client of await scopeClients()) {
    client.postMessage({ type: 'PWA_DIAGNOSTIC', message });
  }
}

async function installRelease() {
  const previousRelease = await activeRelease();
  if (self.registration.active && !previousRelease) {
    throw new Error('현재 앱 버전을 확인하지 못해 업데이트를 보류합니다. 다시 확인해 주세요.');
  }
  await pinUnrecordedClients(previousRelease);
  if (!(await readCompleteRelease(RELEASE.buildId))) {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cacheCompleteRelease(cache, previousRelease);
    } catch (error) {
      // All in-flight writers have settled before this deletion. Old complete builds
      // and progress storage are independent of this failed preparation.
      await caches.delete(CACHE_NAME);
      throw error;
    }
  }
  if (!self.registration.active) await self.skipWaiting();
}

async function cleanUnusedReleases() {
  const liveClients = await scopeClients();
  const liveIds = new Set(liveClients.map((client) => client.id));
  const protectedBuilds = new Set([RELEASE.buildId]);
  for (const client of liveClients) {
    const pinned = await clientRelease(client.id);
    if (pinned) protectedBuilds.add(pinned.buildId);
  }
  const registry = await caches.open(CLIENT_CACHE_NAME);
  for (const request of await registry.keys()) {
    const clientId = decodeURIComponent(request.url.slice(CLIENT_PREFIX.length));
    if (!liveIds.has(clientId)) await registry.delete(request);
  }
  for (const name of await caches.keys()) {
    if (name.startsWith(CACHE_PREFIX) && !protectedBuilds.has(name.slice(CACHE_PREFIX.length))) {
      await caches.delete(name);
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    installRelease().catch(async (error) => {
      await reportDiagnostic(
        error instanceof Error ? error.message : '필수 offline asset 준비 실패',
      );
      throw error;
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const complete = await readCompleteRelease(RELEASE.buildId);
      if (!complete) throw new Error('완전한 업데이트 cache가 없어 활성화할 수 없습니다.');
      // Also pin pages opened while the new worker was downloading/waiting.
      await pinUnrecordedClients(complete.previousRelease ?? RELEASE);
      await cleanUnusedReleases();
      await self.clients.claim();
      for (const client of await scopeClients()) {
        client.postMessage({ type: 'PWA_RELEASE_ACTIVATED', release: releaseIdentity(RELEASE) });
      }
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'GET_RELEASE_METADATA') {
    event.ports[0]?.postMessage({ type: 'RELEASE_METADATA', release: releaseIdentity(RELEASE) });
  }
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
  if (
    event.data?.type === 'PWA_CLIENT_RELEASE' &&
    event.source?.id &&
    isScopeUrl(event.source.url)
  ) {
    event.waitUntil(
      (async () => {
        const release = releaseIdentity(event.data.release);
        if (release && (await releaseCache(release.buildId)))
          await pinClient(event.source.id, release);
      })(),
    );
  }
});

async function serveRelease(event, url) {
  const navigation = event.request.mode === 'navigate';
  const rootNavigation = navigation && (url.href === SCOPE || url.href === SHELL_URL);
  const identity = navigation ? RELEASE : ((await clientRelease(event.clientId)) ?? RELEASE);
  const cache = await releaseCache(identity.buildId);
  if (cache) {
    const response = await cache.match(rootNavigation ? SHELL_URL : url.href);
    if (response) {
      if (navigation) await pinClient(event.resultingClientId, identity);
      return response;
    }
  }
  // Project documents can live beside the app without becoming game release assets.
  // Only a separate document navigation may use the network; imports never do.
  if (navigation && !rootNavigation) {
    try {
      return await fetch(event.request);
    } catch {
      const offline = await cache?.match(OFFLINE_URL);
      if (offline) return offline;
    }
  }
  void reportDiagnostic(`현재 버전의 파일을 불러올 수 없습니다: ${url.pathname}`);
  return new Response('현재 버전의 파일이 없습니다. 메뉴에서 업데이트를 확인해 주세요.', {
    status: 503,
    statusText: 'Release asset unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !isScopeUrl(event.request.url)) return;
  const url = new URL(event.request.url);
  url.search = '';
  url.hash = '';
  // A timestamped probe must always reach the server, even with an active old shell.
  if (url.href === PROBE_URL) {
    event.respondWith(fetch(new Request(event.request, { cache: 'no-store' })));
    return;
  }
  event.respondWith(serveRelease(event, url));
});
