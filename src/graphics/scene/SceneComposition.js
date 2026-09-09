import { defineRegionalMaterialProfile } from './RegionalMaterialProfile.js';
import { freezeSceneData } from './SceneAssetRegistry.js';
import { inverse } from '../svg/SvgMath.js';
const finite = (n, label) => {
  if (!Number.isFinite(n)) throw new TypeError('Finite ' + label + ' required');
  return n;
};
const identifier = (id) => {
  if (typeof id !== 'string' || !/^[a-zA-Z][\w:/.-]{0,159}$/.test(id))
    throw new TypeError('Stable scene ID required');
  return id;
};
function validateData(value, depth = 0) {
  if (depth > 12) throw new RangeError('Scene state nesting budget exceeded');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    finite(value, 'state value');
    return;
  }
  if (!value || typeof value !== 'object' || Object.keys(value).length > 1024)
    throw new TypeError('Serializable scene state required');
  Object.values(value).forEach((v) => validateData(v, depth + 1));
}
function stateData(input = {}) {
  validateData(input);
  const state = { pose: 'base', enabled: true, ...input };
  identifier(state.pose);
  if (typeof state.enabled !== 'boolean') throw new TypeError('Boolean enabled state required');
  if (state.partTransforms !== undefined) {
    if (
      !state.partTransforms ||
      Array.isArray(state.partTransforms) ||
      typeof state.partTransforms !== 'object'
    )
      throw new TypeError('Part transform map required');
    for (const [id, matrix] of Object.entries(state.partTransforms)) {
      identifier(id);
      if (!Array.isArray(matrix) || matrix.length !== 6 || matrix.some((v) => !Number.isFinite(v)))
        throw new TypeError('Finite part transform required');
      inverse(matrix);
    }
  }
  return structuredClone(state);
}
function validateAssetState(object, asset) {
  if (!asset) return;
  if (!asset.poses.includes(object.state.pose))
    throw new Error('Unknown scene pose ' + object.state.pose);
  for (const id of Object.keys(object.state.partTransforms ?? {}))
    if (!asset.parts.some((part) => part.id === id)) throw new Error('Unknown scene part ' + id);
}
export function defineScenePresentation(input) {
  const { id, objects = [], compositions = [] } = structuredClone(input);
  if (
    !Array.isArray(objects) ||
    objects.length > 4096 ||
    !Array.isArray(compositions) ||
    compositions.length > 1024
  )
    throw new RangeError('Scene definition budget exceeded');
  const objectIds = new Set();
  const normalized = objects.map((object) => {
    identifier(object.id);
    if (objectIds.has(object.id)) throw Error('Duplicate world identity ' + object.id);
    objectIds.add(object.id);
    const transform = object.transform ?? { x: 0, y: 0, z: 0 };
    for (const axis of ['x', 'y', 'z']) finite(transform[axis], axis);
    const size = object.size ?? { width: 1, height: 1 };
    if (!(
      size.width > 0 &&
      size.height > 0 &&
      Number.isFinite(size.width) &&
      Number.isFinite(size.height)
    ))
      throw Error('Positive scene size required');
    const rotation = object.rotation ?? 0;
    finite(rotation, 'rotation');
    const material = object.material ? defineRegionalMaterialProfile(object.material) : null;
    const scale = object.scale ?? 1;
    if (!Number.isFinite(scale) || scale <= 0) throw Error('Positive scale required');
    const renderBias = object.renderBias ?? 0;
    if (!Number.isFinite(renderBias) || Math.abs(renderBias) > 0.5)
      throw Error('renderBias is a small same-depth adjustment');
    const parallaxScale = object.parallaxScale ?? 1;
    if (!Number.isFinite(parallaxScale) || parallaxScale < 0 || parallaxScale > 4)
      throw Error('Invalid parallax override');
    const presentationOverride = object.presentationOverride ?? null;
    if (presentationOverride !== null && !['far', 'mid', 'near'].includes(presentationOverride))
      throw Error('Unknown LOD override');
    const presentationBias = object.presentationBias ?? 0;
    if (!Number.isInteger(presentationBias) || Math.abs(presentationBias) > 2)
      throw Error('Invalid LOD bias');
    const tags = object.tags ?? [];
    if (
      !Array.isArray(tags) ||
      tags.length > 64 ||
      tags.some((t) => typeof t !== 'string' || t.length > 160)
    )
      throw Error('Invalid scene tags');
    if (object.depthMode !== undefined && !['flat', 'surface'].includes(object.depthMode))
      throw Error('Unknown depth mode');
    if (object.shadowRole !== undefined && !['none', 'contact', 'cast'].includes(object.shadowRole))
      throw Error('Unknown shadow role');
    if (
      object.shadowOpacity !== undefined &&
      (!Number.isFinite(object.shadowOpacity) ||
        object.shadowOpacity < 0 ||
        object.shadowOpacity > 1)
    )
      throw Error('Invalid shadow opacity');
    if (
      object.legacyItemIds !== undefined &&
      (!Array.isArray(object.legacyItemIds) ||
        object.legacyItemIds.length > 32 ||
        object.legacyItemIds.some((id) => !identifier(id)))
    )
      throw Error('Invalid legacy binding');
    if (object.material !== undefined) validateData(object.material);
    return {
      ...object,
      assetId: identifier(object.assetId),
      transform,
      size,
      scale,
      rotation,
      material,
      parallaxScale,
      renderBias,
      presentationOverride,
      presentationBias,
      tags,
      state: stateData(object.state),
    };
  });
  const compositionIds = new Set();
  const lightIds = new Map();
  const groups = compositions.map((c) => {
    identifier(c.id);
    if (compositionIds.has(c.id)) throw Error('Duplicate composition');
    compositionIds.add(c.id);
    const b = c.bounds;
    for (const key of ['x', 'y', 'width', 'height']) finite(b?.[key], key);
    if (b.width <= 0 || b.height <= 0) throw Error('Positive composition bounds');
    const margin = c.preloadMargin ?? 120;
    if (!Number.isFinite(margin) || margin < 0) throw Error('Invalid preload margin');
    if (!Array.isArray(c.objectIds) || c.objectIds.length > 4096)
      throw Error('Composition object IDs required');
    for (const objectId of c.objectIds)
      if (!objectIds.has(objectId)) throw Error('Unknown world object ' + objectId);
    const lights = c.lights ?? [];
    if (!Array.isArray(lights) || lights.length > 32) throw Error('Composition light budget');
    for (const light of lights) {
      identifier(light.id);
      const prior = lightIds.get(light.id);
      if (prior && JSON.stringify(prior) !== JSON.stringify(light))
        throw Error('Conflicting shared light identity');
      lightIds.set(light.id, light);
      if (
        !['directional', 'point'].includes(light.kind) ||
        !Number.isFinite(light.intensity) ||
        light.intensity < 0
      )
        throw Error('Invalid composition light');
      const vector = light.kind === 'point' ? light.position : light.direction;
      for (const axis of ['x', 'y', 'z']) finite(vector?.[axis], 'light ' + axis);
      if (light.kind === 'point' && !(light.range > 0 && Number.isFinite(light.range)))
        throw Error('Light range required');
    }
    return { ...c, lights, bounds: b, objectIds: [...new Set(c.objectIds)], preloadMargin: margin };
  });
  return freezeSceneData({ id: identifier(id), objects: normalized, compositions: groups });
}
const overlap = (a, b, margin = 0) =>
  a.x + a.width >= b.x - margin &&
  a.x <= b.x + b.width + margin &&
  a.y + a.height >= b.y - margin &&
  a.y <= b.y + b.height + margin;
export class SceneCompositionRuntime {
  constructor(definition, assets) {
    this.definition = defineScenePresentation(definition);
    this.assets = assets;
    this.generation = 0;
    this.viewToken = Object.freeze({});
    this.lastWanted = null;
    this.lastSnapshot = null;
    this.disposed = false;
    for (const object of this.definition.objects)
      if (!assets.hasDefinition(object.assetId))
        throw Error('Unknown scene asset ' + object.assetId);
    for (const object of this.definition.objects)
      validateAssetState(object, assets.get(object.assetId));
  }
  snapshotProjected(viewAt, worldState = {}) {
    const views = new Map(
      this.definition.objects.map((o) => [
        o.id,
        viewAt(
          (o.transform.z >= 0 ? 1 / (1 + o.transform.z) : 1 + Math.min(1, -o.transform.z)) *
            o.parallaxScale,
        ),
      ]),
    );
    return this.snapshot(viewAt(1), worldState, views);
  }
  snapshot(view, worldState = {}, projectedViews = null) {
    if (this.disposed) throw Error('Disposed scene composition');
    for (const key of ['x', 'y', 'width', 'height']) finite(view?.[key], key);
    if (view.width <= 0 || view.height <= 0) throw Error('Positive viewport required');
    for (const id of Object.keys(worldState))
      if (!this.definition.objects.some((o) => o.id === id))
        throw Error('Unknown state world identity ' + id);
    const visible = (c, margin = 0) =>
      projectedViews && c.objectIds.length
        ? c.objectIds.some((id) => overlap(c.bounds, projectedViews.get(id), margin))
        : overlap(c.bounds, view, margin);
    const active = this.definition.compositions.filter((c) => visible(c));
    const resident = this.definition.compositions.filter((c) => visible(c, c.preloadMargin));
    const activeIds = new Set(active.flatMap((c) => c.objectIds)),
      residentIds = new Set(resident.flatMap((c) => c.objectIds));
    const desired = [
      ...new Set(
        this.definition.objects.filter((o) => residentIds.has(o.id)).map((o) => o.assetId),
      ),
    ].sort();
    const key = desired.join('\0');
    if (key !== this.lastWanted) {
      this.lastWanted = key;
      void this.assets.reconcile(desired);
    }
    const objects = this.definition.objects
      .filter((o) => activeIds.has(o.id))
      .map((o) => ({ ...o, state: stateData({ ...o.state, ...worldState[o.id] }) }));
    for (const object of objects) validateAssetState(object, this.assets.get(object.assetId));
    return (this.lastSnapshot = freezeSceneData({
      sceneId: this.definition.id,
      viewToken: this.viewToken,
      generation: this.generation,
      assetGeneration: this.assets.generation,
      compositionIds: active.map((c) => c.id),
      residentCompositionIds: resident.map((c) => c.id),
      objects,
      lights: [...new Map(active.flatMap((c) => c.lights).map((l) => [l.id, l])).values()],
      assets: Object.fromEntries(
        desired.map((id) => [id, this.assets.get(id)]).filter(([, a]) => a),
      ),
      residency: this.assets.snapshot(),
    }));
  }
  retry() {
    this.lastWanted = null;
  }
  reset() {
    ++this.generation;
    this.lastWanted = null;
    this.lastSnapshot = null;
    void this.assets.reconcile([]);
  }
  dispose() {
    this.disposed = true;
    void this.assets.reconcile([]);
    this.lastSnapshot = null;
  }
}
