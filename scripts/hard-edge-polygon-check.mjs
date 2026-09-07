import assert from 'node:assert/strict';
import {
  paintHardEdgePolygon,
  polygonSpans,
  polygonStrokePixels,
} from '../src/rendering/HardEdgePolygonPainter.js';

function surface(width, height) {
  const pixels = new Uint32Array(width * height);
  return {
    canvas: { width, height },
    fillStyle: '#000000',
    pixels,
    fillRect(x, y, w, h) {
      assert.ok(
        [x, y, w, h].every(Number.isInteger),
        'all painted edges must have integer pixel coverage',
      );
      const color = parseInt(this.fillStyle.slice(1), 16);
      for (let row = y; row < y + h; row++)
        for (let column = x; column < x + w; column++) pixels[row * width + column] = color;
    },
  };
}
for (const [width, height] of [
  [1280, 720],
  [844, 390],
]) {
  const context = surface(width, height);
  paintHardEdgePolygon(
    context,
    [
      { x: 1, y: 2 },
      { x: 80, y: 25 },
      { x: 12, y: 75 },
    ],
    { fill: '#aabbcc' },
  );
  paintHardEdgePolygon(
    context,
    [
      { x: 20, y: 10 },
      { x: 90, y: 70 },
      { x: 5, y: 60 },
    ],
    { fill: '#aa3311', stroke: '#111111' },
  );
  assert.deepEqual(
    [...new Set(context.pixels)].sort((a, b) => a - b),
    [0, 0x111111, 0xaa3311, 0xaabbcc].sort((a, b) => a - b),
    'overlapping diagonals cannot invent anti-alias fringe colors',
  );
}
const concave = surface(10, 10);
paintHardEdgePolygon(
  concave,
  [
    { x: 1, y: 1 },
    { x: 7, y: 1 },
    { x: 7, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 7 },
    { x: 1, y: 7 },
  ],
  { fill: '#ffffff' },
);
assert.equal(concave.pixels[4 * 10 + 4], 0, 'concave cutout remains empty');
assert.equal(concave.pixels[4 * 10 + 2], 0xffffff);
const large = [
  { x: -1e8, y: -1e8 },
  { x: 1e8, y: 0 },
  { x: 1e8, y: 1e8 },
  { x: -1e8, y: 1e8 },
];
let spans = 0;
polygonSpans(large, 100, 60, () => {
  spans++;
});
assert.equal(spans, 60, 'offscreen fills are bounded by viewport rows');
const visits = new Set();
polygonStrokePixels(
  [
    { x: -1e8, y: 30 },
    { x: 1e8, y: 30 },
  ],
  100,
  60,
  1,
  (x, y) => {
    const key = y * 100 + x;
    assert.ok(!visits.has(key), 'flat translucent strokes never repeat a pixel at joins');
    visits.add(key);
  },
);
assert.equal(visits.size, 100, 'offscreen strokes clip before integer traversal');
console.log(
  'Hard-edge polygons: palette-exact overlap, concavity, integer diagonal coverage and bounded clipping PASS',
);
