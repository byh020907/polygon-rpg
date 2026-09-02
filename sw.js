importScripts('./src/pwa/offlineAssetManifest.js');

const CACHE_VERSION = 'polygon-rpg-release-2026-09-02-pwa-5';
const CACHE_NAME = `polygon-rpg-${CACHE_VERSION}`;
const SHELL_URL = new URL('./index.html', self.location).href;
const OFFLINE_URL = new URL('./offline.html', self.location).href;

async function cacheCompleteRelease(cache) {
  const entries = await Promise.all(
    self.POLYGON_RPG_OFFLINE_ASSETS.map(async (asset) => {
      const request = new Request(asset, { cache: 'reload' });
      const response = await fetch(request);
      if (!response.ok) throw new Error(`필수 offline asset 준비 실패: ${asset}`);
      return [request, response];
    }),
  );
  await Promise.all(entries.map(([request, response]) => cache.put(request, response)));
}

async function reportDiagnostic(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'PWA_DIAGNOSTIC', message }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then(async (keys) => {
        const hasActiveRelease = keys.some((key) => key.startsWith('polygon-rpg-'));
        const cache = await caches.open(CACHE_NAME);
        await cacheCompleteRelease(cache);
        if (!hasActiveRelease) await self.skipWaiting();
      })
      .catch(async (error) => {
        await reportDiagnostic(
          error instanceof Error ? error.message : '필수 offline asset 준비 실패',
        );
        throw error;
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith('polygon-rpg-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension:')) return;
  if (event.request.cache === 'reload') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (
          response.ok &&
          requestUrl.pathname.startsWith(self.registration.scope.replace(self.location.origin, ''))
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        if (event.request.mode === 'navigate')
          return (await caches.match(SHELL_URL)) ?? (await caches.match(OFFLINE_URL));
        void reportDiagnostic(`오프라인 asset 누락: ${requestUrl.pathname}`);
        return new Response('', { status: 504, statusText: 'Offline asset unavailable' });
      }
    }),
  );
});
