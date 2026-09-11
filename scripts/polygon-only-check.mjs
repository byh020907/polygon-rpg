import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readVisualQaRequest, VISUAL_QA_RENDERER_IDS } from '../src/app/VisualQaConfig.js';
import {
  readGraphicsReviewRequest,
  normalizeGraphicsReview,
} from '../src/ui/GraphicsReviewConfig.js';
import { createDebugConfiguration } from '../src/ui/DebugConfigurationAdapter.js';

assert.deepEqual(VISUAL_QA_RENDERER_IDS, ['polygon']);
assert.equal(createDebugConfiguration().renderer, 'polygon');
assert.equal(readVisualQaRequest('?visualQa=1&gameStart=pose-idle').renderer, 'polygon');
assert.equal(
  readVisualQaRequest('?visualQa=1&gameStart=pose-idle&visualQaRenderer=retro').renderer,
  'polygon',
);
assert.equal(
  readGraphicsReviewRequest('?graphicsReview=1&reviewRenderer=retro').renderer,
  'polygon',
);
assert.throws(() => normalizeGraphicsReview({ renderer: 'retro' }));
for (const name of [
  'CanvasRetroRenderer',
  'RetroPostProcessor',
  'IntegerPixelSurface',
  'HardEdgePolygonPainter',
  'CanvasPolygonRenderer',
  'DepthPolygonRasterizer',
]) {
  assert.equal(fs.existsSync(`src/rendering/${name}.js`), false, `${name} must be removed`);
}
assert.doesNotMatch(
  fs.readFileSync('index.html', 'utf8'),
  /retro-canvas|pixel-size|posterization-levels|alpha-threshold|debug-renderer/i,
);
assert.doesNotMatch(fs.readFileSync('src/style.css', 'utf8'), /image-rendering:\s*pixelated/);

const appSource = fs.readFileSync('src/app/GameApp.js', 'utf8');
const reviewSource = fs.readFileSync('src/ui/GraphicsReviewController.js', 'utf8');
assert.match(appSource, /WebGlPolygonRenderer/);
assert.match(reviewSource, /WebGlPolygonRenderer/);
assert.doesNotMatch(appSource + reviewSource, /CanvasPolygonRenderer|rasterizeDepthPolygons/);
assert.match(reviewSource, /sharedThumbnailTarget/);

console.log(
  'Polygon-only defaults, legacy URL normalization, WebGL2 game/review renderer and removed CPU raster paths: PASS',
);
