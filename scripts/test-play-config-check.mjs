import assert from 'node:assert/strict';
import { readTestPlayRequest, buildTestPlayUrl } from '../src/ui/TestPlayConfig.js';
import { normalizeGraphicsReview, buildGraphicsReviewUrl } from '../src/ui/GraphicsReviewConfig.js';
import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { buildPlayerGameUrl } from '../src/ui/DebugConfigurationAdapter.js';
const href = 'https://example.test/game/?graphicsReview=1';
const selection = normalizeGraphicsReview({
  resourceId: 'player:protagonist',
  actionId: 'roll',
  frameIndex: 12,
  speed: 0.5,
  bones: true,
  mesh: true,
  lighting: 'night',
});
const request = readVisualQaRequest('?visualQa=1&gameStart=pose-idle');
const options = {
  location: { regionId: 'scrapyard', roomId: 'scrap-garage', x: 300, facing: -1 },
  equipmentId: 'training-sword',
};
const url = buildTestPlayUrl(href, { request, options, label: '주인공' }, selection);
const parsed = readTestPlayRequest(url);
assert.deepEqual(parsed.returnSelection, selection);
assert.deepEqual(parsed.options, options);
assert.equal(parsed.request.start, request.start);
const bad = new URL(url);
bad.searchParams.set('testReturn', 'https://other.test/');
assert.throws(() => readTestPlayRequest(bad.href), /복귀/);
bad.searchParams.set('testReturn', href);
bad.searchParams.set('testLocation', '{"x":"bad"}');
assert.throws(() => readTestPlayRequest(bad.href), /위치/);
bad.searchParams.set(
  'testLocation',
  JSON.stringify({ regionId: 'scrapyard', roomId: 'scrap-garage', x: 300, facing: 0 }),
);
assert.throws(() => readTestPlayRequest(bad.href), /위치/);
assert.equal(new URL(buildGraphicsReviewUrl(url, selection)).searchParams.has('testPlay'), false);
assert.equal(new URL(buildPlayerGameUrl(url)).searchParams.has('testPlay'), false);
console.log(
  'PASS test URL: review conditions, scene, equipment, location, same-origin return, malformed location and exit cleanup',
);
