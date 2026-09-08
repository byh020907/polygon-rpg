import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  readGraphicsReviewRequest,
  buildGraphicsReviewUrl,
  graphicsReviewFeedback,
} from '../src/ui/GraphicsReviewConfig.js';
import { buildPlayerGameUrl, buildDebugQaUrl } from '../src/ui/DebugConfigurationAdapter.js';
import { GAME_UI_RESOURCES, APP_IMAGE_RESOURCES } from '../src/ui/GameUiCatalog.js';
import { createGraphicsResourceCatalog } from '../src/graphics/GraphicsResourceCatalog.js';

const selection = Object.freeze({
  resourceId: 'enemy:mine-collapse-boss',
  actionId: 'attack:heavy',
  frameIndex: 9,
  view: 'scene',
  renderer: 'polygon',
  scale: '2',
  facing: -1,
  lighting: 'unlit',
  category: 'enemy',
  search: '굴착기',
  viewport: 'desktop',
});
const href = buildGraphicsReviewUrl(
  'https://example.test/game/?visualQa=1&gameStart=scrap-garage-0&debugPanel=1&inputQa=1#review',
  selection,
);
assert.deepEqual(readGraphicsReviewRequest(new URL(href).search), selection);
assert.equal(new URL(href).searchParams.has('inputQa'), false);
assert.equal(readGraphicsReviewRequest(''), null);
for (const query of [
  'frame=-1',
  'frame=1.5',
  'frame=NaN',
  'reviewRenderer=other',
  'reviewScale=0',
  'reviewFacing=0',
  'reviewLighting=fake',
])
  assert.throws(() => readGraphicsReviewRequest(`?graphicsReview=1&${query}`));
const player = new URL(buildPlayerGameUrl(href));
assert.deepEqual([...player.searchParams.keys()], []);
const debug = buildDebugQaUrl(href, {
  start: 'scrap-garage-0',
  frame: 0,
  renderer: 'polygon',
  phase: 'active',
  reducedMotion: false,
});
assert.equal(new URL(debug.href).searchParams.has('graphicsReview'), false);
const catalog = createGraphicsResourceCatalog({
  additionalResources: [...GAME_UI_RESOURCES, ...APP_IMAGE_RESOURCES],
});
for (const resource of GAME_UI_RESOURCES) {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const selector of resource.selector.split(', '))
    assert.ok(
      html.includes(selector.slice(1)),
      `${resource.id} selector must name a production component`,
    );
  assert.deepEqual(catalog.get(resource.id), resource);
}
for (const resource of APP_IMAGE_RESOURCES)
  assert.ok(readFileSync(new URL(`../${resource.source}`, import.meta.url)).length > 100);
const feedback = graphicsReviewFeedback(
  catalog.get(selection.resourceId),
  selection,
  { frameId: 'stable-frame' },
  href,
);
assert.ok(feedback.includes(href) && feedback.includes('stable-frame'));
console.log(
  JSON.stringify({
    passed: true,
    roundTrip: true,
    uiResources: GAME_UI_RESOURCES.length,
    imageResources: APP_IMAGE_RESOURCES.length,
  }),
);
