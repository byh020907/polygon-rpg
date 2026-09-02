import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPwaLifecycleAdapter } from '../src/pwa/PwaLifecycleAdapter.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));
const serviceWorker = read('sw.js');
const inventory = read('src/pwa/offlineAssetManifest.js');

assert.equal(manifest.display, 'standalone');
assert.equal(manifest.orientation, 'landscape');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(
  manifest.icons.some((icon) => icon.purpose === 'maskable'),
  true,
);
for (const icon of manifest.icons) {
  assert.equal(fs.existsSync(path.join(root, icon.src)), true, `${icon.src} 아이콘이 필요합니다.`);
}
for (const asset of [
  'index.html',
  'offline.html',
  'manifest.webmanifest',
  'src/main.js',
  'src/style.css',
]) {
  assert.match(inventory, new RegExp(`['"]\\./${asset.replaceAll('.', '\\.')}['"]`));
}
for (const source of fs.readdirSync(path.join(root, 'src'), { recursive: true })) {
  if (!source.endsWith('.js') || source.endsWith('offlineAssetManifest.js')) continue;
  const relative = path.join('src', source).replaceAll('\\', '/');
  assert.match(
    inventory,
    new RegExp(`['"]\\./${relative.replaceAll('.', '\\.')}['"]`),
    `${relative}가 offline inventory에서 빠졌습니다.`,
  );
}
assert.match(serviceWorker, /cacheCompleteRelease\(cache\)/);
assert.match(serviceWorker, /new Request\(asset, \{ cache: 'reload' \}\)/);
assert.doesNotMatch(serviceWorker, /event\.request\.cache === 'reload'/);
assert.match(serviceWorker, /if \(!hasActiveRelease\) await self\.skipWaiting\(\)/);
assert.match(serviceWorker, /SKIP_WAITING/);
assert.match(serviceWorker, /event\.request\.mode === 'navigate'/);
assert.match(read('index.html'), /apple-touch-startup-image/);
assert.match(read('index.html'), /<details class="menu-data-notice">/);
assert.match(read('index.html'), /browser data를 삭제하면 복구\s+지점도/);
assert.match(read('index.html'), /PWA 진단/);
assert.match(
  read('src/app/GameApplication.js'),
  /saveCurrentProgress\(\) \{\s*return this\.currentApp\.saveCurrentProgress\(\);/,
);

const registrationListeners = new Map();
const serviceWorkerListeners = new Map();
let skipWaitingMessage = null;
const waiting = { postMessage: (message) => (skipWaitingMessage = message) };
const registration = {
  waiting,
  addEventListener: (type, listener) => registrationListeners.set(type, listener),
};
const fakeWindowListeners = new Map();
const fakeWindow = {
  isSecureContext: true,
  matchMedia: () => ({ matches: false }),
  location: {
    reload: () => {
      throw new Error('user-applied update 전에는 reload하면 안 됩니다.');
    },
  },
  navigator: {
    userAgent: 'Mozilla/5.0 (Linux; Android 15)',
    serviceWorker: {
      register: async () => registration,
      addEventListener: (type, listener) => serviceWorkerListeners.set(type, listener),
    },
  },
  addEventListener: (type, listener) => fakeWindowListeners.set(type, listener),
};
const lifecycle = createPwaLifecycleAdapter({ browserWindow: fakeWindow });
await lifecycle.start();
assert.equal(lifecycle.getState().updateReady, true);
assert.equal(await lifecycle.applyUpdate(async () => ({ ok: false, message: '저장 실패' })), false);
assert.equal(skipWaitingMessage, null);
assert.equal(await lifecycle.applyUpdate(async () => ({ ok: true })), true);
assert.deepEqual(skipWaitingMessage, { type: 'SKIP_WAITING' });
serviceWorkerListeners.get('message')({
  data: { type: 'PWA_DIAGNOSTIC', message: 'cache 확인 실패' },
});
assert.match(lifecycle.getState().status, /cache 확인 실패/);

const iosLifecycle = createPwaLifecycleAdapter({
  browserWindow: {
    isSecureContext: true,
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      serviceWorker: {
        register: async () => ({ waiting: null, addEventListener: () => {} }),
        addEventListener: () => {},
      },
    },
  },
});
await iosLifecycle.start();
assert.equal(iosLifecycle.getState().installAvailable, true);
await iosLifecycle.requestInstall();
assert.equal(iosLifecycle.getState().showIosInstallGuide, true);

console.log('PWA manifest, atomic cache inventory, update-save boundary: PASS');
