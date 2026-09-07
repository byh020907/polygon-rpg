import assert from 'node:assert/strict';
import { rasterizeDepthPolygons } from '../src/rendering/DepthPolygonRasterizer.js';
import { RetroPostProcessor } from '../src/rendering/RetroPostProcessor.js';

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
const coplanarA = { ...blue, id: 'material-a', fill: '#a06030' };
const coplanarB = { ...blue, id: 'material-b', fill: '#507080' };
assert.deepEqual(
  render([coplanarA, coplanarB]).data,
  render([coplanarB, coplanarA]).data,
  'coplanar material owner is stable across submission order',
);
const curved = {
  id: 'curved',
  fill: '#708090',
  stroke: '#111111',
  lineWidth: 4,
  points: [
    { x: 1, y: 1 },
    { x: 15, y: 1 },
    { x: 15, y: 15 },
    { x: 1, y: 15 },
    { x: 8, y: 8 },
  ],
  depths: [0, 0, 0, 0, 10],
  triangles: [
    [0, 1, 4],
    [1, 2, 4],
    [2, 3, 4],
    [3, 0, 4],
  ],
  outlineIndices: [0, 1, 2, 3],
};
assert.deepEqual(
  pixel(render([curved]), 2, 7),
  [17, 17, 17, 255],
  'visible curved contour cannot reject its own interior surface depth',
);
assert.deepEqual(
  pixel(
    render([
      curved,
      { ...curved, id: 'cover', fill: '#ff0000', stroke: null, depths: [20, 20, 20, 20, 20] },
    ]),
    2,
    7,
  ),
  [255, 0, 0, 255],
  'hidden curved contour cannot scratch the foreground',
);
const processor = new RetroPostProcessor();
const sceneOutline = rasterizeDepthPolygons(
  [
    {
      id: 'actor',
      points: [
        { x: 3, y: 3 },
        { x: 10, y: 3 },
        { x: 10, y: 10 },
        { x: 3, y: 10 },
      ],
      depths: [0, 0, 0, 0],
      fill: '#ffffff',
      stroke: '#383838',
      lineWidth: 1,
    },
  ],
  { width: 18, height: 18, silhouetteColor: '#111416' },
);
assert.deepEqual(
  pixel(sceneOutline, 2, 5),
  [17, 20, 22, 255],
  'actor exterior preserves scene outline palette instead of a lighter material edge',
);
const material = { data: new Uint8ClampedArray([146, 92, 48, 255]) };
processor.applyPosterization(material, 4);
assert.ok(
  Math.abs(material.data[0] / material.data[1] - 146 / 92) < 0.03,
  'retro brightness bands retain material hue ratios',
);
assert.ok(Math.abs(material.data[1] / material.data[2] - 92 / 48) < 0.05);
const alpha = { data: new Uint8ClampedArray([60, 160, 180, 70, 60, 160, 180, 70]) };
const litMaterials = {
  data: new Uint8ClampedArray([54, 55, 54, 255, 96, 95, 94, 255, 92, 93, 92, 255]),
};
processor.applyPosterization(litMaterials, 5);
assert.ok(
  litMaterials.data[4] - litMaterials.data[0] >= 20,
  'cell-lit skin remains visibly lighter than cloth after retro quantization',
);
assert.ok(
  litMaterials.data[8] - litMaterials.data[0] >= 15,
  'cell-lit steel remains visibly lighter than cloth',
);
processor.applyAlphaThreshold(alpha, 128, new Set([0]));
assert.equal(
  alpha.data[3],
  70,
  'authored translucent trail survives threshold without becoming opaque',
);
assert.equal(alpha.data[7], 0, 'ordinary unprotected alpha threshold stays functional');
const isolatedTrail = { data: new Uint8ClampedArray(3 * 3 * 4) };
isolatedTrail.data.set([60, 160, 180, 70], 16);
processor.applyOutline(isolatedTrail, 3, 3, 1, '#111111');
assert.equal(
  isolatedTrail.data.filter((value, i) => i % 4 === 3 && value > 0).length,
  1,
  'translucent trail cannot acquire an opaque post-outline',
);
const thinBox = {
  id: 'thin-box',
  points: [
    { x: 2, y: 2 },
    { x: 10, y: 2 },
    { x: 10, y: 10 },
    { x: 2, y: 10 },
  ],
  depths: [5, 5, 5, 5],
  fill: '#708090',
  stroke: '#111111',
  lineWidth: 0.5,
};
for (const offset of [0, 0.2, 0.8]) {
  const shifted = {
    ...thinBox,
    points: thinBox.points.map((p) => ({ x: p.x + offset, y: p.y + offset })),
  };
  const pixels = render([shifted]);
  const start = Math.round(2 + offset),
    end = Math.round(10 + offset);
  for (let coordinate = start; coordinate <= end; coordinate++) {
    assert.deepEqual(
      pixel(pixels, coordinate, start),
      [17, 17, 17, 255],
      'thin top outline remains continuous',
    );
    assert.deepEqual(
      pixel(pixels, start, coordinate),
      [17, 17, 17, 255],
      'thin side outline remains continuous',
    );
  }
}
const backdrop = {
  id: 'backdrop',
  points: [
    { x: 0, y: 0 },
    { x: 17, y: 0 },
    { x: 17, y: 17 },
    { x: 0, y: 17 },
  ],
  depths: [0, 0, 0, 0],
  fill: '#335577',
};
assert.deepEqual(
  pixel(render([backdrop, thinBox]), 10, 5),
  [17, 17, 17, 255],
  'front contour extends continuously over the rear-owned adjacent pixel',
);
const cover = { ...backdrop, id: 'cover-front', depths: [20, 20, 20, 20], fill: '#ff0000' };
assert.deepEqual(
  pixel(render([thinBox, cover]), 10, 5),
  [255, 0, 0, 255],
  'fully hidden contour stays occluded',
);
for (const offset of [0, 0.2, 0.8]) {
  const diagonal = {
    ...thinBox,
    points: [
      { x: 2 + offset, y: 2 + offset },
      { x: 10 + offset, y: 10 + offset },
      { x: 2 + offset, y: 10 + offset },
    ],
    depths: [5, 5, 5],
  };
  const result = render([backdrop, diagonal]);
  for (let coordinate = Math.round(2 + offset); coordinate <= Math.round(10 + offset); coordinate++)
    assert.deepEqual(
      pixel(result, coordinate, coordinate),
      [17, 17, 17, 255],
      'subpixel diagonal remains connected without anti-aliasing',
    );
}
const partialCover = {
  ...cover,
  points: [
    { x: 6, y: 0 },
    { x: 17, y: 0 },
    { x: 17, y: 17 },
    { x: 6, y: 17 },
  ],
};
const partial = render([thinBox, partialCover]);
assert.deepEqual(pixel(partial, 4, 2), [17, 17, 17, 255]);
assert.deepEqual(
  pixel(partial, 8, 2),
  [255, 0, 0, 255],
  'near cover hides only the covered contour',
);
assert.deepEqual(
  render([thinBox, backdrop]).data,
  render([backdrop, thinBox]).data,
  'stroke and opaque ownership stay submission-order independent',
);
const edgeOn = {
  ...thinBox,
  id: 'edge-on',
  points: [
    { x: 2, y: 2 },
    { x: 2.1, y: 2 },
    { x: 2.1, y: 10 },
    { x: 2, y: 10 },
  ],
};
for (let y = 2; y <= 10; y++)
  assert.deepEqual(
    pixel(render([edgeOn]), 2, y),
    [17, 17, 17, 255],
    'edge-on outlined shape retains a one-pixel silhouette without fill samples',
  );
assert.deepEqual(
  pixel(render([edgeOn, cover]), 2, 5),
  [255, 0, 0, 255],
  'edge-on outline behind a near surface remains hidden',
);
const silhouette = render([thinBox]);
for (let coordinate = 1; coordinate <= 10; coordinate++) {
  assert.deepEqual(
    pixel(silhouette, 1, coordinate),
    [17, 17, 17, 255],
    'opaque owner mask closes left silhouette before world composition',
  );
  assert.deepEqual(
    pixel(silhouette, coordinate, 1),
    [17, 17, 17, 255],
    'opaque owner mask closes top silhouette',
  );
}
const noRing = rasterizeDepthPolygons([thinBox], { width: 18, height: 18, silhouetteWidth: 0 });
assert.deepEqual(pixel(noRing, 1, 5), [0, 0, 0, 0], 'lab can disable the generated silhouette');
const worldComposite = { data: silhouette.data.slice() };
for (let i = 0; i < worldComposite.data.length; i += 4)
  if (worldComposite.data[i + 3] === 0) worldComposite.data.set([100, 80, 60, 255], i);
processor.applyPosterization(worldComposite, 5);
const actorOnly = { data: silhouette.data.slice() };
processor.applyPosterization(actorOnly, 5);
assert.deepEqual(
  pixel(worldComposite, 1, 5),
  pixel(actorOnly, 1, 5),
  'idle actor outline is identical over opaque world and transparent preview',
);
const trailedSilhouette = render([
  thinBox,
  { ...frontTrail, points: backdrop.points, depths: [30, 30, 30, 30] },
]);
assert.deepEqual(
  pixel(trailedSilhouette, 1, 5),
  [17, 17, 17, 255],
  'translucent trail cannot dilute the outer contour',
);
assert.deepEqual(
  trailedSilhouette.depthBuffer,
  silhouette.depthBuffer,
  'trail and generated outline do not change body depth',
);
const plain = render([{ ...thinBox, stroke: null }]);
assert.deepEqual(
  pixel(plain, 1, 5),
  [0, 0, 0, 0],
  'unoutlined glow or plain surface does not seed a silhouette',
);
console.log(
  'Depth polygon raster: crossing, interpolation, trail, outline, surface shading and deterministic sampling PASS',
);
