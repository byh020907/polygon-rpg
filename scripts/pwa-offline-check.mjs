import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../public/release-metadata.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));
const serviceWorker = read('sw.js');
const inventory = new Set(globalThis.POLYGON_RPG_RELEASE.assets);
const releaseMetadata = read('public/release-metadata.js');

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
  assert.ok(inventory.has(asset), `${asset} must be present in canonical release inventory`);
}
for (const source of fs.readdirSync(path.join(root, 'src'), { recursive: true })) {
  if (!source.endsWith('.js')) continue;
  const relative = path.join('src', source).replaceAll('\\', '/');
  assert.ok(inventory.has(relative), `${relative}가 offline inventory에서 빠졌습니다.`);
}
assert.match(read('index.html'), /apple-touch-startup-image/);
assert.match(read('index.html'), /<details class="menu-data-notice">/);
assert.match(read('index.html'), /브라우저 데이터를 삭제하면 복구\s+지점도/);
assert.match(read('index.html'), /PWA 진단/);
assert.match(read('index.html'), /pwa\.currentVersion/);
assert.match(read('index.html'), /pwa\.currentBuildId/);
assert.match(read('index.html'), /restartForPwaRelease/);
assert.match(releaseMetadata, /POLYGON_RPG_RELEASE/);
assert.match(
  read('src/app/GameApplication.js'),
  /saveCurrentProgress\(\) \{\s*return this\.currentApp\.saveCurrentProgress\(\);/,
);

assert.match(serviceWorker, /assetDigests/);
assert.match(serviceWorker, /PROBE_URL/);
assert.match(serviceWorker, /PWA_RELEASE_ACTIVATED/);
assert.match(serviceWorker, /PWA_CLIENT_RELEASE/);
console.log('PWA manifest, canonical release inventory and semantic menu contracts: PASS');
