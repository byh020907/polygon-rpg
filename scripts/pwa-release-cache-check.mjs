import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the production worker for failure/scoping edges that supplement the
// persistent native-browser A→B test. These are not browser-installation evidence.
const source = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const scope = 'https://game.example/polygon-rpg/';
const prefix = `polygon-rpg-release-v2-${encodeURIComponent(scope)}-`;
const clientCacheName = `polygon-rpg-clients-v2-${encodeURIComponent(scope)}`;
const url = (asset) => new URL(asset, scope).href;
const keyOf = (request) => (typeof request === 'string' ? request : request.url);

function memoryCaches() {
  const stores = new Map();
  return {
    has: async (name) => stores.has(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        put: async (request, response) => entries.set(keyOf(request), response.clone()),
        match: async (request) => entries.get(keyOf(request))?.clone(),
        delete: async (request) => entries.delete(keyOf(request)),
        keys: async () => [...entries.keys()].map((entry) => new Request(entry)),
      };
    },
  };
}

function release(buildId) {
  const files = {
    'index.html': `<html>release ${buildId}</html>`,
    'offline.html': `offline ${buildId}`,
    'sw.js': source,
    'src/main.js': `export const release = '${buildId}';`,
    ...Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`src/part-${i}.js`, `part${i}`])),
  };
  return {
    files,
    metadata: {
      appVersion: '0.2.1',
      buildId,
      assets: Object.keys(files),
      assetDigests: Object.fromEntries(
        Object.entries(files).map(([asset, value]) => [
          asset,
          crypto.createHash('sha256').update(value).digest('hex'),
        ]),
      ),
    },
  };
}

const A = release('build-A');
const B = release('build-B');
const cacheStorage = memoryCaches();
const clients = [
  { id: 'old-client', url: scope, postMessage() {} },
  { id: 'other-scope-client', url: 'https://game.example/other/', postMessage() {} },
];

function loadWorker(
  build,
  { active = null, stale = false, missing = false, expected = null } = {},
) {
  const listeners = new Map();
  const requests = [];
  let skips = 0;
  let claims = 0;
  let unreadBodies = 0;
  let maxUnreadBodies = 0;
  const worker = {
    location: new URL(`sw.js${expected ? `?build=${expected}` : ''}`, scope),
    registration: { scope, active },
    clients: {
      matchAll: async () => clients,
      claim: async () => claims++,
    },
    skipWaiting: async () => skips++,
    addEventListener: (type, callback) => listeners.set(type, callback),
  };
  vm.runInNewContext(source, {
    self: worker,
    caches: cacheStorage,
    crypto: crypto.webcrypto,
    importScripts: (address) => {
      if (expected) assert.equal(new URL(address).searchParams.get('build'), expected);
      worker.POLYGON_RPG_RELEASE = build.metadata;
    },
    fetch: async (request) => {
      requests.push(request);
      const address = new URL(request.url);
      const asset = address.pathname.slice(new URL(scope).pathname.length);
      if (asset === 'public/release.json') {
        return new Response(JSON.stringify({ appVersion: '0.2.1', buildId: 'build-server' }));
      }
      if (asset === 'PRODUCT_GOAL.html') return new Response('<html>project document</html>');
      assert.equal(address.searchParams.get('build'), build.metadata.buildId);
      assert.equal(request.cache, 'reload');
      if (missing && asset === 'src/main.js') return new Response('missing', { status: 503 });
      const response = new Response(
        stale && asset === 'src/main.js' ? A.files[asset] : build.files[asset],
      );
      unreadBodies++;
      maxUnreadBodies = Math.max(maxUnreadBodies, unreadBodies);
      const readBody = response.arrayBuffer.bind(response);
      response.arrayBuffer = async () => {
        unreadBodies--;
        return readBody();
      };
      return response;
    },
    URL,
    Request,
    Response,
    Headers,
    MessageChannel,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  const dispatch = async (type, event = {}) => {
    const pending = [];
    let response;
    listeners.get(type)({
      ...event,
      waitUntil: (promise) => pending.push(promise),
      respondWith: (promise) => {
        response = promise;
      },
    });
    await Promise.all(pending);
    return response;
  };
  const controller = {
    postMessage: (data, ports = []) => void dispatch('message', { data, ports }),
  };
  return {
    dispatch,
    controller,
    requests,
    get skips() {
      return skips;
    },
    get claims() {
      return claims;
    },
    get maxUnreadBodies() {
      return maxUnreadBodies;
    },
  };
}

async function fetchAsset(worker, asset, clientId = 'old-client', navigationId = null) {
  const request = new Request(url(asset));
  if (navigationId) Object.defineProperty(request, 'mode', { value: 'navigate' });
  return worker.dispatch('fetch', { request, clientId, resultingClientId: navigationId });
}

const unrelated = await cacheStorage.open('unrelated-application');
await unrelated.put(url('src/main.js'), new Response('wrong application'));
const otherScopeName = `polygon-rpg-release-v2-${encodeURIComponent('https://game.example/other/')}-old`;
await cacheStorage.open(otherScopeName);

const workerA = loadWorker(A, { expected: A.metadata.buildId });
await workerA.dispatch('install');
assert.equal(workerA.skips, 1);
assert.ok(
  workerA.maxUnreadBodies <= 6,
  'download response bodies must be consumed without pool starvation',
);
await workerA.dispatch('activate');
assert.equal(workerA.claims, 1);
assert.equal(
  await (await fetchAsset(workerA, '?graphicsReview=1', '', 'navigation-A')).text(),
  A.files['index.html'],
);
assert.equal(
  await (await fetchAsset(workerA, 'src/main.js?arbitrary=1')).text(),
  A.files['src/main.js'],
);
const requestCount = workerA.requests.length;
assert.equal((await fetchAsset(workerA, 'src/unknown-new-module.js')).status, 503);
assert.equal(
  workerA.requests.length,
  requestCount,
  'missing release assets must not silently use the network',
);
assert.equal(
  await (await fetchAsset(workerA, 'PRODUCT_GOAL.html', '', 'document-client')).text(),
  '<html>project document</html>',
  'a separate project document may load without entering the release cache',
);

assert.throws(() => loadWorker(B, { expected: 'wrong-build' }), /metadata/);
for (const failure of [{ stale: true }, { missing: true }]) {
  const failedB = loadWorker(B, { active: workerA.controller, ...failure });
  await assert.rejects(failedB.dispatch('install'), /검증 실패|준비 실패/);
  assert.equal(await cacheStorage.has(`${prefix}${B.metadata.buildId}`), false);
  assert.equal(await cacheStorage.has(`${prefix}${A.metadata.buildId}`), true);
  assert.equal(failedB.skips, 0);
}

const workerB = loadWorker(B, { active: workerA.controller, expected: B.metadata.buildId });
await workerB.dispatch('install');
assert.equal(workerB.skips, 0, 'a prepared update must wait for the user');
assert.equal(
  await (await fetchAsset(workerA, '?new-query=while-B-waiting', '', 'waiting-client')).text(),
  A.files['index.html'],
);
clients.push({ id: 'waiting-client', url: `${scope}?new-query=while-B-waiting`, postMessage() {} });
await workerB.dispatch('activate');
assert.equal(await (await fetchAsset(workerB, 'src/main.js')).text(), A.files['src/main.js']);
assert.equal(
  await (await fetchAsset(workerB, 'src/main.js', 'waiting-client')).text(),
  A.files['src/main.js'],
);
assert.equal(await cacheStorage.has(`${prefix}${A.metadata.buildId}`), true);
assert.equal(await cacheStorage.has(otherScopeName), true);
assert.equal(await cacheStorage.has('unrelated-application'), true);

// Restart the worker without in-memory state. The old open page stays pinned to A.
const restartedB = loadWorker(B);
assert.equal(await (await fetchAsset(restartedB, 'src/main.js')).text(), A.files['src/main.js']);
assert.equal(
  await (
    await fetchAsset(restartedB, 'index.html?reload=1', 'old-client', 'reloaded-client')
  ).text(),
  B.files['index.html'],
);
assert.equal(
  await (await fetchAsset(restartedB, 'src/main.js', 'reloaded-client')).text(),
  B.files['src/main.js'],
);
const probe = await fetchAsset(restartedB, 'public/release.json?check=123');
assert.equal((await probe.json()).buildId, 'build-server');
assert.equal(restartedB.requests.at(-1).cache, 'no-store');
const cachedB = await cacheStorage.open(`${prefix}${B.metadata.buildId}`);
assert.equal(await cachedB.match(url('public/release.json')), undefined);
const metadataContext = {};
vm.runInNewContext(
  await (await cachedB.match(url('public/release-metadata.js'))).text(),
  metadataContext,
);
assert.equal(metadataContext.POLYGON_RPG_RELEASE.buildId, B.metadata.buildId);

// The first upgrade from the published unscoped cache must preserve its open page.
await cacheStorage.delete(clientCacheName);
const legacy = await cacheStorage.open(`polygon-rpg-release-${A.metadata.buildId}`);
await legacy.put(url('index.html'), new Response(A.files['index.html']));
await legacy.put(url('public/release-metadata.js'), new Response('legacy metadata'));
await legacy.put(url('src/main.js'), new Response(A.files['src/main.js']));
await cacheStorage.delete(`${prefix}${A.metadata.buildId}`);
await cacheStorage.delete(`${prefix}${B.metadata.buildId}`);
const migratedB = loadWorker(B, { active: workerA.controller });
await migratedB.dispatch('install');
await migratedB.dispatch('activate');
assert.equal(await (await fetchAsset(migratedB, 'src/main.js')).text(), A.files['src/main.js']);
assert.equal(await cacheStorage.has(`polygon-rpg-release-${A.metadata.buildId}`), true);

console.log(
  'Production SW digest failure, scope isolation, query shell, persistent client pins and legacy upgrade: PASS',
);
