import assert from 'node:assert/strict';
import {
  IntegerPixelSurface,
  parsePixelColor,
  replicateIntegerPixels,
} from '../src/rendering/IntegerPixelSurface.js';
import {
  CanvasRetroRenderer,
  resolveRetroPixelGrid,
} from '../src/rendering/CanvasRetroRenderer.js';
import { RetroPostProcessor } from '../src/rendering/RetroPostProcessor.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';

const surface = new IntegerPixelSurface(4, 3);
surface.fillStyle = '#f00';
surface.fillRect(-1, 0, 3, 2);
assert.deepEqual([...surface.data.slice(0, 12)], [255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0]);
surface.save();
surface.fillStyle = 'rgb(0 0 255 / 50%)';
surface.fillRect(0, 0, 1, 1);
assert.deepEqual([...surface.data.slice(0, 4)], [127, 0, 128, 255]);
surface.restore();
assert.equal(surface.fillStyle, '#f00');
assert.equal(surface.globalAlpha, 1);
assert.deepEqual(parsePixelColor('#a1b2c380'), [161, 178, 195, 128]);
assert.deepEqual(parsePixelColor('rgba(10, 20, 30, .25)'), [10, 20, 30, 64]);
assert.deepEqual(parsePixelColor('rgb(100% 0% 0%)'), [255, 0, 0, 255]);
assert.throws(() => parsePixelColor('rgba(1,2,3,NaN)'), TypeError);
assert.throws(() => surface.fillRect(0.5, 0, 1, 1), TypeError);
assert.throws(() => surface.clearRect(0, 0, 1.5, 1), TypeError);
assert.throws(() => surface.compositePixels(new Uint8ClampedArray(4), 1, 1, 0.1, 0), TypeError);
assert.throws(() => surface.resize(2.5, 3), TypeError);
assert.throws(() => {
  surface.globalAlpha = Infinity;
}, TypeError);
surface.globalAlpha = 0.5;
surface.compositePixels(new Uint8ClampedArray([0, 255, 0, 255]), 1, 1, 3, 2);
assert.deepEqual([...surface.data.slice(-4)], [0, 255, 0, 128]);
const before = surface.data.slice();
const image = surface.getImageData(0, 0, 4, 3);
surface.clear();
surface.putImageData(image, 0, 0);
assert.deepEqual(surface.data, before);
new RetroPostProcessor().process(surface, 4, 3, { outlineWidth: 0 });
assert.equal(surface.data[3], 255);
surface.resize(2, 2);
assert.equal(surface.data.length, 16);
assert.ok(surface.data.every((channel) => channel === 0));

const source = new Uint8ClampedArray([
  255, 0, 0, 255, 0, 255, 0, 127, 0, 0, 255, 255, 12, 34, 56, 255, 78, 90, 12, 255, 230, 120, 44, 0,
]);
const triple = replicateIntegerPixels(source, 3, 2, 3);
for (let y = 0; y < 6; y += 1)
  for (let x = 0; x < 9; x += 1) {
    const original = (Math.floor(y / 3) * 3 + Math.floor(x / 3)) * 4;
    assert.deepEqual(
      triple.data.slice((y * 9 + x) * 4, (y * 9 + x) * 4 + 4),
      source.slice(original, original + 4),
    );
  }
assert.throws(() => replicateIntegerPixels(source, 3, 2, 2.5), TypeError);

function viewportFor(cssWidth, cssHeight, ratio) {
  const backingWidth = Math.round(cssWidth * ratio),
    backingHeight = Math.round(cssHeight * ratio);
  const fit = Math.min(backingWidth / 1440, backingHeight / 810);
  const presentationWidth = Math.round(1440 * fit),
    presentationHeight = Math.round(810 * fit);
  return {
    width: 1440,
    height: 810,
    cssWidth,
    cssHeight,
    backingWidth,
    backingHeight,
    presentationWidth,
    presentationHeight,
    presentationX: Math.floor((backingWidth - presentationWidth) / 2),
    presentationY: Math.floor((backingHeight - presentationHeight) / 2),
  };
}

for (const [width, height, ratio] of [
  [1280, 720, 1],
  [844, 390, 1],
  [1301, 733, 1.25],
  [843, 391, 2],
  [1281, 721, 1.5],
]) {
  const viewport = viewportFor(width, height, ratio);
  const grid = resolveRetroPixelGrid(viewport, 6);
  assert.ok(Number.isInteger(grid.integerScale) && grid.integerScale >= 2);
  assert.ok(grid.logicalWidth * grid.integerScale - viewport.presentationWidth < grid.integerScale);
  assert.ok(
    grid.logicalHeight * grid.integerScale - viewport.presentationHeight < grid.integerScale,
  );
  assert.ok(
    Math.abs(
      grid.offsetX +
        (grid.logicalWidth * grid.integerScale) / 2 -
        (viewport.presentationX + viewport.presentationWidth / 2),
    ) <= 0.5,
  );
  assert.ok(
    Math.abs(
      grid.offsetY +
        (grid.logicalHeight * grid.integerScale) / 2 -
        (viewport.presentationY + viewport.presentationHeight / 2),
    ) <= 0.5,
  );
  const expectedProjection = Math.min(
    viewport.presentationWidth / viewport.width,
    viewport.presentationHeight / viewport.height,
  );
  assert.ok(
    Math.abs(grid.projectionScale * grid.integerScale - expectedProjection) < 1e-12,
    'integer grid must preserve world framing',
  );
  const pattern = new Uint8ClampedArray(grid.logicalWidth * grid.logicalHeight * 4);
  for (let y = 0; y < grid.logicalHeight; y += 1)
    for (let x = 0; x < grid.logicalWidth; x += 1) {
      const index = (y * grid.logicalWidth + x) * 4;
      pattern[index] = x % 256;
      pattern[index + 1] = y % 256;
      pattern[index + 3] = 255;
    }
  const output = replicateIntegerPixels(
    pattern,
    grid.logicalWidth,
    grid.logicalHeight,
    grid.integerScale,
    {
      width: viewport.backingWidth,
      height: viewport.backingHeight,
      offsetX: grid.offsetX,
      offsetY: grid.offsetY,
      clipX: viewport.presentationX,
      clipY: viewport.presentationY,
      clipWidth: viewport.presentationWidth,
      clipHeight: viewport.presentationHeight,
    },
  );
  const y = viewport.presentationY + Math.floor(viewport.presentationHeight / 2);
  const runs = [];
  let previous = -1;
  for (
    let x = viewport.presentationX;
    x < viewport.presentationX + viewport.presentationWidth;
    x += 1
  ) {
    const value = output.data[(y * output.width + x) * 4];
    if (value !== previous) {
      runs.push(1);
      previous = value;
    } else runs[runs.length - 1] += 1;
  }
  assert.ok(runs[0] >= 1 && runs[0] <= grid.integerScale);
  assert.ok(runs.at(-1) >= 1 && runs.at(-1) <= grid.integerScale);
  assert.ok(
    runs.slice(1, -1).every((length) => length === grid.integerScale),
    'all interior pixels must have identical integer width',
  );
  const column = viewport.presentationX + Math.floor(viewport.presentationWidth / 2);
  const verticalRuns = [];
  previous = -1;
  for (
    let row = viewport.presentationY;
    row < viewport.presentationY + viewport.presentationHeight;
    row += 1
  ) {
    const value = output.data[(row * output.width + column) * 4 + 1];
    assert.equal(
      output.data[(row * output.width + column) * 4 + 3],
      255,
      'presentation has no introduced empty bars',
    );
    if (value !== previous) {
      verticalRuns.push(1);
      previous = value;
    } else verticalRuns[verticalRuns.length - 1] += 1;
  }
  assert.ok(verticalRuns[0] >= 1 && verticalRuns[0] <= grid.integerScale);
  assert.ok(verticalRuns.at(-1) >= 1 && verticalRuns.at(-1) <= grid.integerScale);
  assert.ok(
    verticalRuns.slice(1, -1).every((length) => length === grid.integerScale),
    'all interior pixels must have identical integer height',
  );
}

// No document, OffscreenCanvas, native fillRect or drawImage exists in this production smoke test.
const viewport = viewportFor(843, 391, 1.25);
let writes = 0;
const host = {
  viewport,
  context: {
    createImageData: (width, height) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: (image, x, y) => {
      writes += 1;
      assert.equal(x, 0);
      assert.equal(y, 0);
      assert.equal(image.width, viewport.backingWidth);
      assert.equal(image.height, viewport.backingHeight);
    },
  },
};
const camera = { getScale: () => 1, worldToScreen: (point) => point };
const renderer = new CanvasRetroRenderer(host, camera);
const scene = createTestGameScene({ mapDefinition: SCRAP_AWAKENING_MAP });
scene.enterTree();
try {
  const result = renderer.render(scene.createRenderFrame(0), {
    showWorldGrid: true,
    pixelSnap: false,
  });
  assert.equal(writes, 1, 'one native presentation upload per completed frame');
  assert.ok(
    renderer.sceneContext.isIntegerPixelSurface && renderer.foregroundContext.isIntegerPixelSurface,
  );
  assert.equal(renderer.sceneCanvas.width, renderer.foregroundCanvas.width);
  assert.equal(renderer.sceneCanvas.height, renderer.foregroundCanvas.height);
  assert.ok(renderer.outputImage.data.some((value) => value > 0));
  assert.ok(result.integerScale >= 2);
} finally {
  scene.exitTree();
}

const gridViewport = {
  width: 9,
  height: 6,
  cssWidth: 9,
  backingWidth: 9,
  backingHeight: 6,
  presentationWidth: 9,
  presentationHeight: 6,
  presentationX: 0,
  presentationY: 0,
};
let gridWrites = 0;
const gridRenderer = new CanvasRetroRenderer(
  {
    viewport: gridViewport,
    context: {
      createImageData: (width, height) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: () => {
        gridWrites += 1;
      },
    },
  },
  camera,
);
gridRenderer.render(
  {
    items: [],
    worldSize: { width: 9, height: 6 },
    gridSize: 10,
    palette: { background: '#000000', arena: '#000000', outline: '#000000' },
  },
  { pixelSize: 3, showWorldGrid: false, showPixelGrid: true },
);
assert.equal(gridWrites, 1);
for (let y = 0; y < 6; y += 1)
  for (let x = 0; x < 9; x += 1) {
    const expected = x % 3 === 0 || y % 3 === 0 ? [23, 23, 24, 255] : [0, 0, 0, 255];
    assert.deepEqual(
      [...gridRenderer.outputImage.data.slice((y * 9 + x) * 4, (y * 9 + x) * 4 + 4)],
      expected,
      'debug grid marks every source-pixel boundary with one backing-pixel line',
    );
  }
assert.ok(
  gridRenderer.sceneContext.data.every((value, index) =>
    index % 4 === 3 ? value === 255 : value === 0,
  ),
  'debug grid must not paint over the low-resolution source pixels',
);
console.log(
  'Integer RGBA spans, alpha, 3x block replication, odd viewport/DPR framing and native-free world rendering PASS',
);
