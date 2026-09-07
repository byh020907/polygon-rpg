import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReleaseMetadata } from './generate-release-metadata.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const generatedPath = path.join(root, 'public', 'release-metadata.js');
assert.match(fs.readFileSync(generatedPath, 'utf8'), /POLYGON_RPG_RELEASE/);
await import(`../public/release-metadata.js?checked=${Date.now()}`);
assert.deepEqual(
  globalThis.POLYGON_RPG_RELEASE,
  createReleaseMetadata(),
  '배포 asset이 바뀌면 npm run release:metadata를 실행해야 합니다.',
);
console.log('Release metadata fingerprint and app version: PASS');
