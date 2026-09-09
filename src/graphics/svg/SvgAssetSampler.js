import { freeze, IDENTITY, inverse, multiply, point } from './SvgMath.js';
export function sampleSvgAsset(asset, { lod = 'near', pose = 'base', partTransforms = {} } = {}) {
  if (asset.schemaVersion !== 1 || !asset.lods.includes(lod) || !asset.poses.includes(pose))
    throw new Error('Unsupported SVG asset/LOD/pose');
  for (const [id, matrix] of Object.entries(partTransforms)) {
    if (
      !asset.parts.some((p) => p.id === id) ||
      !Array.isArray(matrix) ||
      matrix.length !== 6 ||
      matrix.some((v) => !Number.isFinite(v))
    )
      throw new Error('Invalid normalized part transform');
    inverse(matrix);
  }
  const matrices = new Map();
  for (const part of asset.parts) {
    const parent = part.parentId ? matrices.get(part.parentId) : IDENTITY;
    if (!parent) throw new Error('Invalid SVG part hierarchy');
    matrices.set(
      part.id,
      multiply(multiply(parent, part.bind), partTransforms[part.id] ?? IDENTITY),
    );
  }
  const visible = asset.shapes.filter((s) => s.lod === 'common' || s.lod === lod);
  const overrides = visible.filter((s) => s.pose === pose && pose !== 'base');
  const whole = overrides.some((s) => s.replacement === 'whole');
  const replaced = new Set(overrides.map((s) => s.partId));
  const chosen = visible.filter(
    (s) => s.pose === pose || (s.pose === 'base' && !whole && !replaced.has(s.partId)),
  );
  const items = chosen.map((shape) => {
    const matrix = matrices.get(shape.partId),
      inv = inverse(matrix),
      n = shape.surfaceNormal;
    const normal = { x: inv[0] * n.x + inv[1] * n.y, y: inv[2] * n.x + inv[3] * n.y, z: n.z };
    const length = Math.hypot(normal.x, normal.y, normal.z);
    for (const axis of ['x', 'y', 'z']) normal[axis] /= length;
    return {
      id: shape.id,
      partId: shape.partId,
      points: shape.points.map((p) => point(matrix, p)),
      triangles: shape.triangles,
      fill: shape.fill,
      opacity: shape.opacity,
      shadowRole: shape.shadowRole,
      role: shape.role,
      materialId: shape.materialId,
      surfaceNormal: normal,
      structuralOcclusion: shape.structuralOcclusion,
      z: shape.z,
    };
  });
  const anchorCandidates = asset.anchors.filter(
    (a) => (a.lod === 'common' || a.lod === lod) && (a.pose === 'base' || a.pose === pose),
  );
  const selectedAnchors = new Map();
  for (const a of anchorCandidates) {
    const previous = selectedAnchors.get(a.id);
    const priority = (value) => (value.pose === pose ? 2 : 0) + (value.lod === lod ? 1 : 0);
    if (!previous || priority(a) > priority(previous)) selectedAnchors.set(a.id, a);
  }
  const anchors = [...selectedAnchors.values()]
    .filter((a) => !whole || chosen.some((s) => s.partId === a.partId))
    .map((a) => ({ id: a.id, partId: a.partId, ...point(matrices.get(a.partId), a), z: a.z }));
  return freeze({ assetId: asset.id, lod, pose, items, anchors, bounds: asset.bounds });
}
export function exportSvgAsset(asset, options) {
  const sample = sampleSvgAsset(asset, options);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2" id="${asset.id}">\n${sample.items
    .filter((s) => s.role !== 'occluder')
    .map(
      (s) =>
        `  <polygon id="${s.id}" points="${s.points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="${s.fill}" opacity="${s.opacity}"/>`,
    )
    .join('\n')}\n</svg>\n`;
}
