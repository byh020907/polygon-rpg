import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReleaseMetadata, releaseProbe } from './generate-release-metadata.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const generatedPath = path.join(root, 'public', 'release-metadata.js');
assert.match(fs.readFileSync(generatedPath, 'utf8'), /POLYGON_RPG_RELEASE/);
await import(`../public/release-metadata.js?checked=${Date.now()}`);
const expected = createReleaseMetadata();
assert.deepEqual(
  globalThis.POLYGON_RPG_RELEASE,
  expected,
  '배포 asset이 바뀌면 npm run release:metadata를 실행해야 합니다.',
);
assert.deepEqual(
  JSON.parse(fs.readFileSync(path.join(root, 'public/release.json'), 'utf8')),
  releaseProbe(expected),
  '경량 업데이트 확인 파일은 release metadata와 같은 generation이어야 합니다.',
);
assert.equal(expected.assets.includes('public/release-metadata.js'), false);
assert.equal(expected.assets.includes('public/release.json'), false);
assert.deepEqual(Object.keys(expected.assetDigests), expected.assets);
for (const digest of Object.values(expected.assetDigests)) assert.match(digest, /^[a-f0-9]{64}$/);
console.log('Release fingerprint, asset integrity and network version probe: PASS');
