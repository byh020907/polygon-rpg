import { sampleSvgAsset } from '../svg/SvgAssetSampler.js';
import { inverse } from '../svg/SvgMath.js';
export const freezeSceneData = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeSceneData);
    Object.freeze(value);
  }
  return value;
};
const idValid = (id) => typeof id === 'string' && /^[a-zA-Z][\w:/.-]{0,159}$/.test(id);
const matrixValid = (m) => {
  if (!Array.isArray(m) || m.length !== 6 || m.some((v) => !Number.isFinite(v)))
    throw new TypeError('Invalid scene matrix');
  inverse(m);
};
function validateAsset(asset) {
  if (
    !asset ||
    asset.schemaVersion !== 1 ||
    !idValid(asset.id) ||
    !Array.isArray(asset.parts) ||
    !asset.parts.length ||
    asset.parts.length > 256 ||
    !Array.isArray(asset.shapes) ||
    !asset.shapes.length ||
    asset.shapes.length > 256
  )
    throw new TypeError('Invalid compiled scene asset');
  if (
    !Array.isArray(asset.lods) ||
    !asset.lods.length ||
    asset.lods.length > 3 ||
    new Set(asset.lods).size !== asset.lods.length ||
    asset.lods.some((lod) => !['far', 'mid', 'near'].includes(lod)) ||
    !Array.isArray(asset.poses) ||
    !asset.poses.includes('base') ||
    asset.poses.length > 128 ||
    new Set(asset.poses).size !== asset.poses.length ||
    asset.poses.some((pose) => !idValid(pose))
  )
    throw new TypeError('Invalid scene asset variants');
  if (
    !asset.bounds ||
    ['minX', 'minY', 'maxX', 'maxY'].some((key) => !Number.isFinite(asset.bounds[key])) ||
    asset.bounds.minX >= asset.bounds.maxX ||
    asset.bounds.minY >= asset.bounds.maxY
  )
    throw new TypeError('Invalid stable asset bounds');
  const parts = new Set();
  for (const part of asset.parts) {
    if (!idValid(part.id) || parts.has(part.id) || (part.parentId && !parts.has(part.parentId)))
      throw new TypeError('Invalid scene part hierarchy');
    matrixValid(part.bind);
    parts.add(part.id);
  }
  let vertices = 0;
  const shapeIds = new Set();
  for (const shape of asset.shapes) {
    if (
      !idValid(shape.id) ||
      shapeIds.has(shape.id) ||
      !parts.has(shape.partId) ||
      !Array.isArray(shape.points) ||
      shape.points.length < 3 ||
      shape.points.length > 512 ||
      shape.points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
    )
      throw new TypeError('Invalid scene shape');
    if (
      !Array.isArray(shape.triangles) ||
      !shape.triangles.length ||
      shape.triangles.length > 1024 ||
      shape.triangles.some(
        (t) =>
          !Array.isArray(t) ||
          t.length !== 3 ||
          new Set(t).size !== 3 ||
          t.some((i) => !Number.isInteger(i) || i < 0 || i >= shape.points.length),
      )
    )
      throw new TypeError('Invalid scene triangles');
    if (
      !['common', ...asset.lods].includes(shape.lod) ||
      !asset.poses.includes(shape.pose) ||
      !Number.isFinite(shape.z) ||
      !Number.isFinite(shape.opacity) ||
      shape.opacity < 0 ||
      shape.opacity > 1 ||
      !['x', 'y', 'z'].every((axis) => Number.isFinite(shape.surfaceNormal?.[axis])) ||
      Math.hypot(shape.surfaceNormal.x, shape.surfaceNormal.y, shape.surfaceNormal.z) < 1e-9 ||
      !Number.isFinite(shape.structuralOcclusion) ||
      shape.structuralOcclusion < 0 ||
      shape.structuralOcclusion > 1 ||
      !['none', 'contact', 'cast'].includes(shape.shadowRole)
    )
      throw new TypeError('Invalid scene shape metadata');
    shapeIds.add(shape.id);
    vertices += shape.points.length;
  }
  if (vertices > 8192) throw new RangeError('SVG vertex budget exceeded');
  if (
    !Array.isArray(asset.anchors) ||
    asset.anchors.length > 1024 ||
    asset.anchors.some(
      (a) =>
        !idValid(a.id) ||
        !parts.has(a.partId) ||
        !['x', 'y', 'z'].every((axis) => Number.isFinite(a[axis])) ||
        !['common', ...asset.lods].includes(a.lod) ||
        !asset.poses.includes(a.pose),
    )
  )
    throw new TypeError('Invalid scene anchors');
  for (const lod of asset.lods)
    for (const pose of asset.poses) {
      const sample = sampleSvgAsset(asset, { lod, pose });
      if (
        sample.items.some(
          (item) =>
            item.points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)) ||
            Object.values(item.surfaceNormal).some((n) => !Number.isFinite(n)),
        ) ||
        sample.anchors.some((a) => !Number.isFinite(a.x) || !Number.isFinite(a.y))
      )
        throw new TypeError('Nonfinite composed scene geometry');
    }
  return new TextEncoder().encode(JSON.stringify(asset)).byteLength;
}
export class SceneAssetRegistry {
  constructor({
    load = null,
    maxResident = 32,
    maxBytes = 4_000_000,
    maxPending = maxResident,
  } = {}) {
    if (
      ![maxResident, maxBytes, maxPending].every((v) => Number.isInteger(v) && v > 0) ||
      (load !== null && typeof load !== 'function')
    )
      throw new TypeError('Invalid scene residency limits');
    Object.assign(this, { load, maxResident, maxBytes, maxPending });
    this.assets = new Map();
    this.sources = new Map();
    this.sizes = new Map();
    this.pending = new Map();
    this.wanted = new Set();
    this.errors = new Map();
    this.epoch = 0;
    this.generation = 0;
    this.waiters = [];
  }
  store(asset, retained) {
    const bytes = validateAsset(asset);
    const existing = new Set([...this.sources.keys(), ...this.assets.keys()]);
    existing.delete(asset.id);
    const total = [...existing].reduce((sum, id) => sum + this.sizes.get(id), bytes);
    if (total > this.maxBytes) throw new RangeError('Total scene asset byte budget exceeded');
    if (!this.assets.has(asset.id) && this.assets.size >= this.maxResident)
      throw new RangeError('Scene residency budget exceeded');
    const frozen = freezeSceneData(structuredClone(asset));
    if (retained) this.sources.set(asset.id, frozen);
    this.assets.set(asset.id, frozen);
    this.sizes.set(asset.id, bytes);
    ++this.generation;
    return frozen;
  }
  register(asset) {
    const result = this.store(asset, true);
    const request = this.pending.get(asset.id);
    if (request) {
      request.obsolete = true;
      request.controller.abort();
    }
    this.errors.delete(asset.id);
    this.finishWaiters(false);
    return result;
  }
  get(id) {
    return this.assets.get(id) ?? null;
  }
  hasDefinition(id) {
    return this.sources.has(id) || this.assets.has(id) || Boolean(this.load);
  }
  reconcile(assetIds) {
    const wanted = new Set(assetIds);
    if (wanted.size > this.maxResident) throw new RangeError('Scene residency budget exceeded');
    if ([...wanted].some((id) => !idValid(id))) throw new TypeError('Invalid wanted asset ID');
    ++this.epoch;
    this.wanted = wanted;
    this.finishWaiters(true);
    for (const [id, request] of this.pending)
      if (!wanted.has(id)) {
        request.obsolete = true;
        request.controller.abort();
      }
    for (const id of this.assets.keys())
      if (!wanted.has(id)) {
        this.assets.delete(id);
        if (!this.sources.has(id)) this.sizes.delete(id);
        ++this.generation;
      }
    for (const id of wanted) {
      this.errors.delete(id);
      if (!this.assets.has(id) && this.sources.has(id)) this.store(this.sources.get(id), false);
      if (!this.assets.has(id) && !this.load) this.errors.set(id, 'Unknown scene asset: ' + id);
    }
    const done = new Promise((resolve) => this.waiters.push(resolve));
    this.pump();
    return done;
  }
  pump() {
    for (const id of this.wanted) {
      if (this.pending.size >= this.maxPending) break;
      if (this.assets.has(id) || this.pending.has(id) || this.errors.has(id)) continue;
      const request = { controller: new AbortController(), obsolete: false };
      this.pending.set(id, request);
      Promise.resolve()
        .then(() => this.load(id, { signal: request.controller.signal }))
        .then((asset) => {
          if (!request.obsolete && this.wanted.has(id)) {
            if (asset?.id !== id) throw new Error('Asset identity mismatch');
            this.store(asset, false);
            this.errors.delete(id);
          }
        })
        .catch((error) => {
          if (!request.obsolete && this.wanted.has(id))
            this.errors.set(id, String(error?.message ?? error));
        })
        .finally(() => {
          if (this.pending.get(id) === request) this.pending.delete(id);
          this.pump();
        });
    }
    this.finishWaiters(false);
  }
  finishWaiters(force) {
    if (force || [...this.wanted].every((id) => this.assets.has(id) || this.errors.has(id))) {
      const snapshot = this.snapshot();
      this.waiters.splice(0).forEach((resolve) => resolve(snapshot));
    }
  }
  snapshot() {
    const bytes = (ids) => [...ids].reduce((sum, id) => sum + (this.sizes.get(id) ?? 0), 0);
    return freezeSceneData({
      generation: this.generation,
      residentIds: [...this.assets.keys()],
      pendingIds: [...this.pending.keys()],
      wantedIds: [...this.wanted],
      residentBytes: bytes(this.assets.keys()),
      sourceBytes: bytes(this.sources.keys()),
      totalBytes: bytes(new Set([...this.sources.keys(), ...this.assets.keys()])),
      errors: Object.fromEntries(this.errors),
    });
  }
  clear() {
    ++this.epoch;
    ++this.generation;
    this.wanted.clear();
    for (const request of this.pending.values()) {
      request.obsolete = true;
      request.controller.abort();
    }
    this.assets.clear();
    this.sources.clear();
    this.sizes.clear();
    this.errors.clear();
    this.finishWaiters(true);
  }
}
