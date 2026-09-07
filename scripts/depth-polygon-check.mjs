import assert from 'node:assert/strict';
import { rasterizeDepthPolygons } from '../src/rendering/DepthPolygonRasterizer.js';

const points = [
  { x: 1, y: 1 },
  { x: 15, y: 1 },
  { x: 1, y: 15 },
];
const red = { points, depths: [0, 14, 0], fill: '#ff0000' };
const blue = { points, depths: [7, 7, 7], fill: '#0000ff' };
const render = (items) => rasterizeDepthPolygons(items, { width: 18, height: 18 });
const pixel = (result, x, y) => [...result.data.slice((y * 18 + x) * 4, (y * 18 + x) * 4 + 4)];
const crossed = render([red, blue]);
assert.deepEqual(
  crossed.data,
  render([blue, red]).data,
  'crossing surfaces must ignore polygon order',
);
assert.deepEqual(pixel(crossed, 3, 3), [0, 0, 255, 255]);
assert.deepEqual(pixel(crossed, 10, 2), [255, 0, 0, 255]);
assert.equal(
  crossed.depthBuffer[2 * 18 + 10],
  9.5,
  'surface depth interpolates within each triangle',
);
const trail = { points, depths: [4, 4, 4], fill: '#00ff00', opacity: 0.5, depthWrite: false };
assert.deepEqual(
  render([blue, trail]).data,
  render([blue]).data,
  'rear translucent trail is occluded',
);
const frontTrail = { ...trail, depths: [20, 20, 20] };
const trailed = render([blue, frontTrail]);
assert.deepEqual(pixel(trailed, 3, 3), [0, 128, 128, 255]);
assert.deepEqual(
  trailed.depthBuffer,
  render([blue]).depthBuffer,
  'trails cannot write opaque depth',
);
const rearOutline = { ...red, depths: [0, 0, 0], stroke: '#ffffff', lineWidth: 3 };
assert.deepEqual(
  pixel(render([rearOutline, blue]), 2, 2),
  [0, 0, 255, 255],
  'rear limb outline cannot bleed through a near surface',
);
const surface = {
  ...blue,
  surface: {
    points,
    depths: [7, 7, 7],
    triangles: [[0, 1, 2]],
    triangleShades: [0.5],
    outlineIndices: [0, 1, 2],
  },
};
assert.deepEqual(pixel(render([surface]), 3, 3), [0, 0, 128, 255]);
assert.deepEqual(
  render([surface]).data,
  render([surface]).data,
  'identical samples reproduce bytes',
);
assert.equal(render([{ points: [], depths: [], fill: '#ffffff' }]).data.some(Boolean), false);
assert.throws(() => render([{ ...blue, depths: [NaN, 0, 0] }]), /finite/);
assert.throws(
  () => render([{ ...blue, points: [{ x: Infinity, y: 0 }, ...points.slice(1)] }]),
  /finite/,
);
assert.throws(() => render([{ ...blue, triangles: [[0, 1, 40]] }]), /index/);
assert.throws(() => rasterizeDepthPolygons([], { width: 100000, height: 100000 }), /bounded/);
assert.throws(() => rasterizeDepthPolygons([], { width: Infinity, height: 10 }), /bounded/);
const collapsed = {
  ...blue,
  points: [
    { x: 2, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 2 },
  ],
};
assert.equal(
  render([collapsed]).data.some(Boolean),
  false,
  'degenerate surfaces finish without raster loops',
);
console.log(
  'Depth polygon raster: crossing, interpolation, trail, outline, surface shading and deterministic sampling PASS',
);
