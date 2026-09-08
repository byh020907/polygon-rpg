import { quaternionMatrix } from './Quaternion.js';
// Coordinates are dimensionless; extents and parent axes own all scale/rotation.
export function normalizedLocalPoint(local, parent) {
  if (
    !Array.isArray(local) ||
    local.length < 2 ||
    local.length > 3 ||
    local.some((value) => !Number.isFinite(value) || value < -1 || value > 1)
  )
    throw new RangeError('Local coordinates must be within [-1, 1].');
  const [x, y, z = 0] = local;
  const { origin, axisX, axisY, axisZ = { x: 0, y: 0, depth: 1 }, halfSize } = parent;
  return Object.freeze(
    Object.fromEntries(
      ['x', 'y', 'depth'].map((key) => [
        key,
        (origin[key] ?? 0) +
          (axisX[key] ?? 0) * x * halfSize[0] +
          (axisY[key] ?? 0) * y * halfSize[1] +
          (axisZ[key] ?? 0) * z * (halfSize[2] ?? 0),
      ]),
    ),
  );
}

// Compile a simple concave source outline once, instead of authoring triangle
// indices or filling tool openings with a fan. No per-frame triangulation.
export function childNormalizedFrame(
  parent,
  { offset = [0, 0, 0], size = [1, 1, 1], quaternion = { x: 0, y: 0, z: 0, w: 1 } },
) {
  if (size.length !== 3 || size.some((value) => !Number.isFinite(value) || value <= 0))
    throw new RangeError('Part size must contain three positive ratios.');
  const rotation = quaternionMatrix(quaternion),
    axes = [parent.axisX, parent.axisY, parent.axisZ];
  const vectors = [0, 1, 2].map((column) =>
    Object.fromEntries(
      ['x', 'y', 'depth'].map((key) => [
        key,
        axes.reduce((sum, axis, row) => sum + (axis[key] ?? 0) * rotation[row][column], 0),
      ]),
    ),
  );
  const lengths = vectors.map((v) => Math.hypot(v.x, v.y, v.depth));
  return Object.freeze({
    origin: normalizedLocalPoint(offset, parent),
    ...Object.fromEntries(
      vectors.map((v, i) => [
        ['axisX', 'axisY', 'axisZ'][i],
        Object.freeze(
          Object.fromEntries(Object.entries(v).map(([key, value]) => [key, value / lengths[i]])),
        ),
      ]),
    ),
    // Rotation never stretches a part through a differently proportioned parent.
    halfSize: Object.freeze(parent.halfSize.map((value, i) => value * size[i])),
  });
}

export function triangulateLocalPolygon(points) {
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const area = points.reduce(
    (sum, p, i) =>
      sum + p[0] * points[(i + 1) % points.length][1] - p[1] * points[(i + 1) % points.length][0],
    0,
  );
  const sign = Math.sign(area);
  if (!sign) throw new RangeError('Zero-area design outline');
  const active = points.map((_, i) => i),
    triangles = [];
  while (active.length > 3) {
    let clipped = false;
    for (let i = 0; i < active.length; i++) {
      const a = active[(i + active.length - 1) % active.length],
        b = active[i],
        c = active[(i + 1) % active.length];
      if (cross(points[a], points[b], points[c]) * sign <= 1e-10) continue;
      const inside = active.some(
        (p) =>
          p !== a &&
          p !== b &&
          p !== c &&
          cross(points[a], points[b], points[p]) * sign >= -1e-10 &&
          cross(points[b], points[c], points[p]) * sign >= -1e-10 &&
          cross(points[c], points[a], points[p]) * sign >= -1e-10,
      );
      if (inside) continue;
      triangles.push(Object.freeze([a, b, c]));
      active.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) throw new RangeError('Self-intersecting or degenerate design outline');
  }
  triangles.push(Object.freeze([...active]));
  return Object.freeze(triangles);
}
