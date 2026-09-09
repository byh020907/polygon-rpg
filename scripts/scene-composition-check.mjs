import assert from 'node:assert/strict';
import { SceneAssetRegistry } from '../src/graphics/scene/SceneAssetRegistry.js';
import {
  defineScenePresentation,
  SceneCompositionRuntime,
} from '../src/graphics/scene/SceneComposition.js';
import {
  SceneCompositionPresenter,
  selectPresentationLod,
  legacyPresentationDepth,
} from '../src/graphics/scene/SceneCompositionPresenter.js';
const asset = (id = 'core') => ({
  schemaVersion: 1,
  id,
  bounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
  parts: [{ id: 'root', parentId: null, bind: [1, 0, 0, 1, 0, 0] }],
  shapes: [
    {
      id: 'panel',
      partId: 'root',
      points: [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ],
      triangles: [
        [0, 1, 2],
        [0, 2, 3],
      ],
      lod: 'common',
      pose: 'base',
      replacement: 'part',
      surfaceNormal: { x: 0, y: 0, z: -1 },
      z: 0,
      fill: '#8899aa',
      opacity: 1,
      structuralOcclusion: 0,
      materialId: 'steel',
      shadowRole: 'none',
      role: 'visual',
    },
  ],
  anchors: [],
  lods: ['far', 'mid', 'near'],
  poses: ['base'],
});
const object = (id = 'machine', assetId = 'core', x = 0) => ({
  id,
  assetId,
  transform: { x, y: 0, z: 0 },
  size: { width: 20, height: 20 },
});
const def = () => ({
  id: 'yard',
  objects: [object()],
  compositions: [
    {
      id: 'left',
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      preloadMargin: 20,
      objectIds: ['machine'],
    },
    {
      id: 'right',
      bounds: { x: 90, y: 0, width: 100, height: 100 },
      preloadMargin: 20,
      objectIds: ['machine'],
    },
  ],
});
const flush = () => new Promise((resolve) => setImmediate(resolve));

// Bounded source/resident budgets, structural validation and eviction/rehydration.
const registry = new SceneAssetRegistry({ maxResident: 2 });
const original = asset();
registry.register(original);
assert.equal(Object.isFrozen(original), false, 'registration must not freeze caller data');
await registry.reconcile([]);
assert.equal(registry.get('core'), null);
await registry.reconcile(['core']);
assert.ok(registry.get('core'));
const oneBytes = registry.snapshot().totalBytes;
const tight = new SceneAssetRegistry({ maxBytes: oneBytes + 100, maxResident: 3 });
tight.register(asset());
assert.throws(() => tight.register(asset('other')), /Total scene asset byte/);
for (const mutate of [
  (a) => (a.parts[0].bind = [1, 0, 0, 0, 0, 0]),
  (a) => (a.shapes[0].triangles = [[0, 1, 9]]),
  (a) => (a.shapes[0].points[0].x = NaN),
  (a) => (a.shapes[0].surfaceNormal.z = 0),
]) {
  const invalid = asset('invalid');
  mutate(invalid);
  assert.throws(() => registry.register(invalid));
}
assert.throws(() => registry.reconcile(['one', 'two', 'three']), /residency/);

// Real async loaders cannot exceed maxPending even if they ignore AbortSignal.
const requests = [];
const asyncRegistry = new SceneAssetRegistry({
  maxResident: 1,
  maxPending: 1,
  load: (id, { signal }) =>
    new Promise((resolve, reject) => requests.push({ id, signal, resolve, reject })),
});
const old = asyncRegistry.reconcile(['first']);
await flush();
const current = asyncRegistry.reconcile(['second']);
await old;
await flush();
assert.equal(requests.length, 1);
assert.equal(requests[0].signal.aborted, true);
requests[0].resolve(asset('first'));
await flush();
assert.equal(asyncRegistry.get('first'), null);
assert.equal(requests.length, 2);
requests[1].reject(new Error('network unavailable'));
await current;
assert.match(asyncRegistry.snapshot().errors.second, /network/);
const retried = asyncRegistry.reconcile(['second']);
await flush();
requests[2].resolve(asset('second'));
await retried;
assert.ok(asyncRegistry.get('second'));
assert.deepEqual(asyncRegistry.snapshot().errors, {});
const stale = asyncRegistry.reconcile(['third']);
await flush();
asyncRegistry.clear();
await stale;
requests[3].resolve(asset('third'));
await flush();
assert.equal(asyncRegistry.get('third'), null);

// Definition validation, overlapping composition identity and preload residency.
const runtime = new SceneCompositionRuntime(def(), registry);
for (const change of [
  (d) => (d.objects[0].transform.z = Infinity),
  (d) => (d.objects[0].scale = 0),
  (d) => (d.objects[0].renderBias = 1),
  (d) => (d.objects[0].state = { enabled: 1 }),
  (d) => (d.objects[0].state = { phase: NaN }),
  (d) => (d.compositions[0].objectIds = ['unknown']),
  (d) => d.objects.push(object()),
]) {
  const invalid = def();
  change(invalid);
  assert.throws(() => defineScenePresentation(invalid));
}
assert.throws(
  () =>
    new SceneCompositionRuntime({ ...def(), objects: [object('machine', 'missing')] }, registry),
  /Unknown scene asset/,
);
const state = { machine: { enabled: true, pose: 'base' } };
const snapshot = runtime.snapshot({ x: 95, y: 0, width: 2, height: 10 }, state);
assert.equal(snapshot.objects.length, 1);
assert.equal(snapshot.compositionIds.length, 2);
assert.ok(Object.isFrozen(snapshot.objects[0].state));
assert.equal(Object.isFrozen(state.machine), false);
const preload = runtime.snapshot({ x: 205, y: 0, width: 2, height: 10 });
assert.equal(preload.objects.length, 0);
assert.deepEqual(preload.residentCompositionIds, ['right']);
assert.ok(preload.assets.core);
const outside = runtime.snapshot({ x: 500, y: 0, width: 2, height: 10 });
assert.equal(outside.residency.residentIds.length, 0);
const restored = runtime.snapshot({ x: 0, y: 0, width: 20, height: 20 });
assert.ok(restored.assets.core);
const generation = restored.generation;
runtime.reset();
assert.equal(runtime.snapshot({ x: 0, y: 0, width: 20, height: 20 }).generation, generation + 1);

// Actual presenter projection, stable master bounds, raw hysteresis and display-only bias.
const presenter = new SceneCompositionPresenter();
const project = (p, parallax) => ({ x: p.x * parallax, y: p.y * parallax });
const render = (scene, width = 200, items = []) =>
  presenter.resolve(
    { scenePresentation: scene, items, artDirection: null, lightingOccluders: null },
    { project, viewport: { width, height: 200 } },
  );
const base = runtime.snapshot({ x: 0, y: 0, width: 20, height: 20 });
const biased = { ...base, objects: base.objects.map((o) => ({ ...o, presentationBias: 1 })) };
assert.equal(render(biased).diagnostics.objects[0].lod, 'near');
for (let n = 0; n < 5; n++)
  assert.equal(
    render(biased).diagnostics.objects[0].rawLod,
    'mid',
    'display bias must not feed back into hysteresis',
  );
assert.equal(selectPresentationLod(0.105, 'far'), 'far');
assert.equal(selectPresentationLod(0.12, 'far'), 'mid');
assert.equal(selectPresentationLod(0.095, 'mid'), 'mid');
assert.equal(selectPresentationLod(0.08, 'mid'), 'far');
const override = {
  ...base,
  objects: base.objects.map((o) => ({ ...o, presentationOverride: 'far' })),
};
assert.equal(render(override).diagnostics.objects[0].lod, 'far');
assert.equal(render(base).diagnostics.objects[0].rawLod, 'mid');
const changed = structuredClone(base);
changed.assets.core.shapes[0].points = changed.assets.core.shapes[0].points.map((p) => ({
  x: p.x * 0.1,
  y: p.y * 0.1,
}));
assert.equal(
  render(changed).diagnostics.objects[0].occupancy,
  0.1,
  'LOD shape is never used as bounds',
);
const resetScene = {
  ...base,
  assetGeneration: base.assetGeneration + 1,
  objects: base.objects.map((o) => ({ ...o, size: { width: 19, height: 19 } })),
};
assert.equal(
  render(resetScene).diagnostics.objects[0].rawLod,
  'far',
  'asset generation resets hysteresis',
);

// Legacy binding preserves the first enabled target's bbox and flat presentation.
const legacy = [
  {
    id: 'disabled',
    enabled: false,
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
  },
  {
    id: 'enabled',
    points: [
      { x: 10, y: 20 },
      { x: 30, y: 20 },
      { x: 30, y: 40 },
      { x: 10, y: 40 },
    ],
    stroke: '#123456',
    lineWidth: 3,
    opacity: 0.4,
    renderOrder: 42,
    parallax: 1,
  },
];
const bound = {
  ...base,
  objects: base.objects.map((o) => ({
    ...o,
    legacyItemIds: ['disabled', 'enabled'],
    depthMode: 'flat',
  })),
};
const replaced = render(bound, 200, legacy).frame.items;
assert.equal(replaced.length, 1);
assert.equal(replaced[0].id, 'enabled');
assert.deepEqual(replaced[0].points, legacy[1].points);
assert.equal(replaced[0].stroke, '#123456');
assert.equal(replaced[0].opacity, 0.4);
assert.equal(replaced[0].depthGroup, undefined);
assert.equal(replaced[0].surface, undefined);
assert.equal(legacyPresentationDepth({ renderOrder: 900, parallax: 0.5 }), 1);
const ordering = render({ ...base, objects: [] }, 200, [
  { id: 'front', sceneZ: 0, renderBias: -0.4 },
  { id: 'back', sceneZ: 2, renderBias: 0.4 },
  { id: 'group-one', sceneZ: 1, renderBias: 0.01, depthGroup: 'group' },
  { id: 'middle', sceneZ: 1, renderBias: 0.02 },
  { id: 'group-two', sceneZ: 1, renderBias: 0.03, depthGroup: 'group' },
]).frame.items.map((i) => i.id);
assert.deepEqual(ordering, ['back', 'group-one', 'group-two', 'middle', 'front']);

// Occluder/shadow metadata survives null legacy lighting, and stale frames remain untouched.
const casting = structuredClone(base);
casting.objects[0].shadowRole = 'cast';
casting.assets.core.shapes.push({
  ...casting.assets.core.shapes[0],
  id: 'occluder',
  role: 'occluder',
});
const result = render(casting);
assert.equal(result.frame.lightingOccluders.length, 1);
assert.equal(result.frame.artDirection.shadowCasters[0].shadowRole, 'cast');
assert.equal(result.frame.artDirection.shadowCasters[0].occluder.length, 4);
assert.equal(base.objects[0].shadowRole, undefined);
assert.equal(base.assets.core.shapes.length, 1);
// Rotation uses precisely the same transformed point for world and canvas anchors.
const rotated = structuredClone(base);
rotated.objects[0].rotation = Math.PI / 2;
rotated.objects[0].transform = { x: 100, y: -100, z: 0 };
rotated.assets.core.anchors = [
  { id: 'socket', partId: 'root', x: 1, y: 0, z: 0, lod: 'common', pose: 'base' },
];
const anchored = render(rotated).diagnostics.anchors[0];
assert.ok(Math.abs(anchored.world.x - 100) < 1e-8);
assert.ok(Math.abs(anchored.world.y + 90) < 1e-8);
assert.equal(anchored.x, anchored.world.x);
assert.equal(anchored.y, -anchored.world.y);
// A zoomed-out actual viewport must activate compositions outside the old 960-wide view.
const wideRegistry = new SceneAssetRegistry();
wideRegistry.register(asset());
const wideRuntime = new SceneCompositionRuntime(
  {
    id: 'wide',
    objects: [object('remote', 'core', 1000)],
    compositions: [
      {
        id: 'remote-composition',
        bounds: { x: 990, y: -50, width: 20, height: 100 },
        objectIds: ['remote'],
      },
    ],
  },
  wideRegistry,
);
const wide = presenter.resolve(
  { items: [], scenePresentationForView: (v) => wideRuntime.snapshotProjected(v) },
  {
    viewport: { width: 960, height: 540 },
    project: (p) => ({ x: 480 + (p.x - 480) * 0.5, y: 270 + p.y * 0.5 }),
  },
);
assert.equal(wide.diagnostics.objects[0].id, 'remote');
wideRuntime.dispose();
const sparseRegistry = new SceneAssetRegistry();
const sparseObjects = Array.from({ length: 33 }, (_, i) => ({
  ...object('object-' + i, 'asset-' + i, i * 300),
  parallaxScale: i === 0 ? 0 : 1,
}));
for (let i = 0; i < 33; i++) {
  sparseRegistry.register(asset('asset-' + i));
  await sparseRegistry.reconcile([]);
}
const sparseRuntime = new SceneCompositionRuntime(
  {
    id: 'sparse',
    objects: sparseObjects,
    compositions: sparseObjects.map((o, i) => ({
      id: 'composition-' + i,
      bounds: { x: i * 300, y: -20, width: 10, height: 40 },
      objectIds: [o.id],
      preloadMargin: 0,
    })),
  },
  sparseRegistry,
);
const sparse = sparseRuntime.snapshotProjected((p) => ({
  x: 9600 * p - 100,
  y: -100,
  width: 200,
  height: 200,
}));
assert.deepEqual(sparse.compositionIds, ['composition-0', 'composition-32']);
assert.equal(sparse.residency.residentIds.length, 2);
sparseRuntime.dispose();
runtime.dispose();
assert.throws(() => runtime.snapshot({ x: 0, y: 0, width: 1, height: 1 }), /Disposed/);
console.log(
  JSON.stringify({
    status: 'PASS',
    checks: [
      'bounded-async-abort-stale-retry-residency',
      'total-byte-budget-and-compiled-validation',
      'composition-overlap-preload-immutable-state',
      'stable-occupancy-hysteresis-bias-generation',
      'legacy-flat-bounds-and-canonical-group-order',
      'null-lighting-occluder-shadow-preservation',
    ],
  }),
);
