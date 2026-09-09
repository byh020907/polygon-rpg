import assert from 'node:assert/strict';
import { createHybridShadowGeometry } from '../src/rendering/HybridShadows.js';
import {
  computeLightContribution,
  createCellLightingSample,
  sampleMaterialLightResponse,
  MATERIAL_LIGHTING_PROFILES,
} from '../src/rendering/CellLighting.js';
import { sampleSvgAsset } from '../src/graphics/svg/SvgAssetSampler.js';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const directional = { kind: 'directional', direction: { x: 0, y: 0, z: 1 }, intensity: 0.6 };
const front = computeLightContribution({
  surfacePosition: { x: 0, y: 0, z: 0 },
  surfaceNormal: { x: 0, y: 0, z: -1 },
  light: directional,
});
near(front.normalDot, 1);
near(front.value, 0.6);
const point = computeLightContribution({
  surfacePosition: { x: 0, y: 0, z: 0 },
  surfaceNormal: { x: 0, y: 0, z: -1 },
  light: { kind: 'point', position: { x: 0, y: 0, z: -5 }, range: 10, intensity: 2 },
});
near(point.distance, 5);
near(point.normalDot, 1);
near(point.value, 0.5);
const old = {
  surfacePosition: { x: 2, y: 3 },
  surfaceNormal: { x: 1, y: -2 },
  light: { kind: 'point', position: { x: 7, y: -3 }, range: 40, intensity: 0.7 },
};
assert.deepEqual(
  computeLightContribution(old),
  computeLightContribution({
    ...old,
    surfacePosition: { ...old.surfacePosition, z: 0 },
    surfaceNormal: { ...old.surfaceNormal, z: 0 },
    light: { ...old.light, position: { ...old.light.position, z: 0 } },
  }),
  'adding optional zero depth preserves 2D contribution exactly',
);
assert.throws(
  () => computeLightContribution({ ...old, surfaceNormal: { x: 0, y: 0, z: 0 } }),
  /zero vector/,
);
assert.throws(
  () => computeLightContribution({ ...old, surfacePosition: { x: 0, y: 0, z: NaN } }),
  /finite/,
);

const materials = [
  'painted-steel',
  'raw-steel',
  'brass',
  'cloth',
  'skin',
  'stone',
  'dirt',
  'glass',
];
const responses = materials.map((m) => sampleMaterialLightResponse(m, 0.85, { x: 3, y: 7 }));
assert.equal(new Set(responses).size, materials.length);
for (const material of materials) {
  assert.ok(Object.isFrozen(MATERIAL_LIGHTING_PROFILES[material]));
  const input = {
    baseColor: '#e27635',
    position: { x: 0, y: 0, z: 0 },
    normal: { x: 0, y: 0, z: -1 },
    material,
    lights: [{ ...directional, intensity: 0.3 }],
    saturationRetention: 1,
  };
  const full = createCellLightingSample(input),
    half = createCellLightingSample({ ...input, structuralOcclusion: 0.5 }),
    closed = createCellLightingSample({ ...input, structuralOcclusion: 1 });
  near(half.rawLuminance, full.rawLuminance * 0.5);
  near(closed.rawLuminance, 0);
  assert.equal(full.mutedColor, '#e27635');
  assert.notEqual(
    createCellLightingSample({ ...input, saturationRetention: undefined }).mutedColor,
    full.mutedColor,
  );
}
assert.throws(
  () =>
    createCellLightingSample({
      baseColor: '#ffffff',
      position: { x: 0, y: 0 },
      normal: { x: 1, y: 0 },
      material: 'glass',
      structuralOcclusion: 1.1,
    }),
  /between 0 and 1/,
);
// SVG's inverse-transpose normal under nonuniform scale reaches the same lighting owner.
const svg = {
  schemaVersion: 1,
  id: 'normal-test',
  lods: ['near'],
  poses: ['base'],
  parts: [{ id: 'root', parentId: null, bind: [2, 0, 0, 1, 0, 0] }],
  shapes: [
    {
      id: 'face',
      partId: 'root',
      lod: 'near',
      pose: 'base',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      triangles: [[0, 1, 2]],
      surfaceNormal: { x: 1, y: 1, z: 0 },
    },
  ],
  anchors: [],
  bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
};
const normal = sampleSvgAsset(svg).items[0].surfaceNormal;
near(normal.x, 0.5 / Math.hypot(0.5, 1));
near(normal.y, 1 / Math.hypot(0.5, 1));
near(
  computeLightContribution({
    surfacePosition: { x: 0, y: 0 },
    surfaceNormal: normal,
    light: { kind: 'directional', direction: { x: -0.5, y: -1, z: 0 }, intensity: 1 },
  }).normalDot,
  1,
);
const blocking = [
  {
    points: [
      { x: 2, y: -1 },
      { x: 3, y: -1 },
      { x: 3, y: 1 },
      { x: 2, y: 1 },
    ],
  },
];
assert.equal(
  computeLightContribution({
    surfacePosition: { x: 0, y: 0, z: 0 },
    surfaceNormal: { x: 1, y: 0, z: 0 },
    light: { kind: 'point', position: { x: 5, y: 0, z: 2 }, range: 20, intensity: 1 },
    occluders: blocking,
  }).occluded,
  true,
);

const caster = {
  id: 'crane',
  shadowRole: 'cast',
  position: { x: 0, y: 100 },
  width: 20,
  height: 80,
  opacity: 0.25,
  parallax: 0.8,
  depth: 10,
  occluder: [
    { x: -10, y: 100 },
    { x: -10, y: 20 },
    { x: 10, y: 20 },
    { x: 10, y: 100 },
  ],
};
const light = (x = 1, y = 1, z = 0) => ({
  id: 'sun',
  kind: 'directional',
  direction: { x, y, z },
  intensity: 1,
});
const draw = (lights = [light()], override = {}) =>
  createHybridShadowGeometry({ casters: [{ ...caster, ...override }], lights });
const bounds = (shape) => ({
  minX: Math.min(...shape.points.map((p) => p.x)),
  maxX: Math.max(...shape.points.map((p) => p.x)),
  minY: Math.min(...shape.points.map((p) => p.y)),
  maxY: Math.max(...shape.points.map((p) => p.y)),
});
const right = draw()[0],
  left = draw([light(-1)])[0];
near(bounds(right).maxX, 90);
near(bounds(left).minX, -90);
assert.ok(
  bounds(right).maxY > bounds(right).minY,
  'extruded occluder does not collapse into a line',
);
assert.ok(
  Object.isFrozen(right) && Object.isFrozen(right.points) && right.points.every(Object.isFrozen),
);
near(right.parallax, 0.8);
const shapeChanged = draw([light()], {
  occluder: [
    { x: -10, y: 100 },
    { x: 0, y: 60 },
    { x: 10, y: 100 },
  ],
})[0];
assert.ok(bounds(shapeChanged).maxX < bounds(right).maxX, 'actual simple occluder changes shadow');
const lamp = (y) => ({
  id: 'lamp',
  kind: 'point',
  position: { x: -60, y, z: -20 },
  intensity: 1,
  range: 1000,
});
const low = draw([lamp(-20)])[0],
  high = draw([lamp(-300)])[0];
assert.ok(bounds(low).maxX > bounds(high).maxX, 'higher light shortens ray-derived shadow');
const depthLight = draw([light(1, 1, 1)])[0];
assert.ok(
  bounds(depthLight).maxY > bounds(right).maxY,
  'light depth affects orthographic ground projection',
);
const limited = createHybridShadowGeometry({
  casters: [caster],
  lights: [light(1, 0.000001, 1)],
  maxLength: 50,
})[0];
assert.ok(bounds(limited).maxX <= 60);
assert.deepEqual(draw([light(1, 0)]), []);
assert.deepEqual(draw([light(1, -1)]), []);
assert.deepEqual(draw([lamp(100)]), []);
assert.deepEqual(draw([light()], { shadowRole: 'none' }), []);
const contact = draw([], { shadowRole: 'contact' })[0];
assert.equal(contact.points.length, 24);
assert.deepEqual(contact, draw([light(-1, 0.2, 1)], { shadowRole: 'contact' })[0]);
assert.equal(draw([], { shadowRole: undefined })[0].shadowRole, 'contact');
assert.deepEqual(draw([{ ...light(), transient: true, progress: 1 }]), []);
assert.throws(() => draw([light()], { occluder: [] }), /authored occluder/);
for (const shadows of [
  draw(),
  draw([light(0, 1)]),
  draw([lamp(20)]),
  draw([light(1, 1e-7, 1)]),
  draw([], { shadowRole: 'contact' }),
])
  assert.ok(
    shadows.every((s) => s.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))),
  );
console.log(
  JSON.stringify({
    status: 'PASS',
    checks: [
      'exact-2d-and-optional-3d-light-response',
      'svg-transformed-normal-and-occlusion',
      'eight-explicit-materials-and-structural-attenuation',
      'ray-derived-direction-height-silhouette-shadows',
      'contact-cast-none-and-depth-extrusion',
      'bounded-horizon-invalid-and-immutable-output',
    ],
  }),
);
