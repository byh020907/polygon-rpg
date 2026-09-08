import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readVisualQaRequest, VISUAL_QA_RENDERER_IDS } from '../src/app/VisualQaConfig.js';
import {
  readGraphicsReviewRequest,
  normalizeGraphicsReview,
} from '../src/ui/GraphicsReviewConfig.js';
import { createDebugConfiguration } from '../src/ui/DebugConfigurationAdapter.js';
import { paintSceneItems } from '../src/rendering/ScenePainter.js';

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
])
  assert.equal(fs.existsSync(`src/rendering/${name}.js`), false, `${name} must be removed`);
assert.doesNotMatch(
  fs.readFileSync('index.html', 'utf8'),
  /retro-canvas|pixel-size|posterization-levels|alpha-threshold|debug-renderer/i,
);
assert.doesNotMatch(fs.readFileSync('src/style.css', 'utf8'), /image-rendering:\s*pixelated/);

// A transformed Canvas must rasterize depth surfaces at output pixels, then
// composite 1:1. A logical-size intermediate would fail these dimensions.
const originalCanvas = globalThis.OffscreenCanvas;
globalThis.OffscreenCanvas = class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  getContext() {
    return {
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData() {},
    };
  }
};
let matrix = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 6 };
const stack = [],
  draws = [];
const context = {
  canvas: { width: 200, height: 100 },
  getTransform: () => matrix,
  save: () => stack.push(matrix),
  restore: () => {
    matrix = stack.pop();
  },
  setTransform: (a, b, c, d, e, f) => {
    matrix = { a, b, c, d, e, f };
  },
  drawImage: (canvas, x, y) =>
    draws.push({ width: canvas.width, height: canvas.height, x, y, matrix }),
};
try {
  paintSceneItems(
    context,
    {
      palette: { outline: '#111111' },
      items: [
        {
          id: 'surface',
          depthGroup: 'actor',
          points: [
            { x: 10, y: 10 },
            { x: 30, y: 10 },
            { x: 10, y: 30 },
          ],
          depths: [0, 0, 0],
          fill: '#aaaaaa',
          stroke: '#111111',
          lineWidth: 1,
        },
      ],
    },
    (p) => p,
    1,
  );
  assert.equal(draws.length, 1);
  assert.deepEqual(draws[0], {
    width: 46,
    height: 46,
    x: 27,
    y: 23,
    matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  });
  assert.equal(matrix.a, 2, 'caller transform must be restored');
} finally {
  if (originalCanvas === undefined) delete globalThis.OffscreenCanvas;
  else globalThis.OffscreenCanvas = originalCanvas;
}
console.log(
  'Polygon-only defaults, legacy URL normalization, deleted effects and backing-resolution depth raster: PASS',
);
