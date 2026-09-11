import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createStrokeGeometry,
  flattenSurfaceTriangles,
  flattenTriangleIndices,
  triangulatePolygon,
} from '../src/rendering/WebGlGeometry.js';
import { createWebGlScenePlan } from '../src/rendering/WebGlScenePainter.js';

const concave = [
  { x: 0, y: 0 },
  { x: 8, y: 0 },
  { x: 8, y: 8 },
  { x: 4, y: 4 },
  { x: 0, y: 8 },
];
const indices = triangulatePolygon(concave);
assert.equal(indices.length, 9, 'concave pentagon becomes three GPU triangles');
assert.deepEqual(
  triangulatePolygon([...concave].reverse()),
  triangulatePolygon([...concave].reverse()),
  'both windings triangulate deterministically',
);
assert.throws(
  () =>
    triangulatePolygon([
      { x: 0, y: 0 },
      { x: 8, y: 8 },
      { x: 0, y: 8 },
      { x: 8, y: 0 },
    ]),
  /simple/,
);

const points = [
  { x: 1, y: 1 },
  { x: 15, y: 1 },
  { x: 1, y: 15 },
];
const depths = [0, 14, 0];
const flat = flattenSurfaceTriangles(points, depths, [[0, 1, 2]]);
assert.equal(flat.vertexCount, 3);
assert.deepEqual([...flat.depths], depths);
assert.deepEqual([...flattenTriangleIndices(points, [[0, 1, 2]])], [0, 1, 2]);
assert.throws(() => flattenTriangleIndices(points, [[0, 1, 3]]), /out-of-range/);
assert.throws(() => flattenSurfaceTriangles(points, [0, NaN, 0]), /finite/);

const stroke = createStrokeGeometry(
  [
    { x: 2, y: 2 },
    { x: 10, y: 2 },
    { x: 10, y: 10 },
    { x: 2, y: 10 },
  ],
  [5, 5, 5, 5],
  { width: 2, pixelRatio: 2 },
);
assert.equal(stroke.widthInBackingPixels, 4);
assert.equal(stroke.indexCount, 24);
assert.ok(stroke.positions.every(Number.isFinite));

const frame = {
  palette: { outline: '#111416' },
  artDirection: null,
  items: [
    {
      id: 'background-shape',
      points: concave,
      fill: '#334455',
      renderOrder: 0,
    },
    {
      id: 'opaque-body',
      depthGroup: 'actor',
      points,
      depths: [7, 7, 7],
      fill: '#0000ff',
      stroke: '#111111',
      renderOrder: 1,
    },
    {
      id: 'attack-trail',
      depthGroup: 'actor',
      points,
      depths: [20, 20, 20],
      fill: '#00ff00',
      opacity: 0.5,
      depthWrite: false,
      renderOrder: 1,
    },
  ],
};
const plan = createWebGlScenePlan(frame, (point) => point, 1);
assert.deepEqual(
  plan.operations.map((operation) => operation.kind),
  ['painter', 'depth'],
  'scene painter order and group-local depth remain separate passes',
);
assert.equal(plan.operations[1].items[0].depthWrite, true);
assert.equal(plan.operations[1].items[1].depthWrite, false);
assert.equal(plan.operations[1].items[1].opacity, 0.5);

for (const removed of [
  'src/rendering/CanvasHost.js',
  'src/rendering/CanvasPolygonRenderer.js',
  'src/rendering/ScenePainter.js',
  'src/rendering/DepthPolygonRasterizer.js',
  'src/rendering/PolygonCoverage.js',
]) {
  assert.equal(fs.existsSync(removed), false, `${removed} CPU renderer must be removed`);
}
const rendererSource = fs.readFileSync('src/rendering/WebGlPolygonRenderer.js', 'utf8');
assert.doesNotMatch(rendererSource, /createImageData|putImageData|rasterizeDepthPolygons/);
assert.match(rendererSource, /readPixelsForQa/);

console.log(
  'WebGL geometry/scene plan: concave topology, finite depth, triangle strokes, transparent no-write and CPU renderer removal PASS',
);
