import { sampleTransientLightIntensity } from './CellLighting.js';
const EPSILON = 1e-8;
const pointValid = (p) =>
  p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.z === undefined || Number.isFinite(p.z));
const freezeShape = (shape) =>
  Object.freeze({
    ...shape,
    points: Object.freeze(shape.points.map((p) => Object.freeze({ x: p.x, y: p.y }))),
  });
function convexHull(points) {
  const sorted = [...new Map(points.map((p) => [p.x + ':' + p.y, p])).values()].sort(
    (a, b) => a.x - b.x || a.y - b.y,
  );
  if (sorted.length < 3) return [];
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const lower = [],
    upper = [];
  for (const p of sorted) {
    while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
    lower.push(p);
  }
  for (const p of [...sorted].reverse()) {
    while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  return hull.length >= 3 ? hull : [];
}
function intensityOf(light) {
  const intensity = light.intensity ?? 1;
  if (!Number.isFinite(intensity) || intensity < 0)
    throw new RangeError('Finite nonnegative shadow light intensity required');
  if (!light.transient) return intensity;
  const timing =
    light.progress === undefined
      ? { lifetimeSeconds: light.lifetimeSeconds, elapsedSeconds: light.elapsedSeconds }
      : { progress: light.progress };
  return sampleTransientLightIntensity({ intensity, ...timing, decayPower: light.decayPower ?? 2 })
    .intensity;
}
// Canvas Y increases downwards. Ground is y=position.y. Its visual depth coordinate
// is screenY=groundY+groundDepthScale*z; depth is an authored extrusion width.
export function createHybridShadowGeometry({
  casters = [],
  lights = [],
  groundDepthScale = 0.16,
  maxLength = 1000,
} = {}) {
  if (
    !Array.isArray(casters) ||
    !Array.isArray(lights) ||
    casters.length > 1024 ||
    lights.length > 64
  )
    throw new RangeError('Shadow input budget exceeded');
  if (
    !Number.isFinite(groundDepthScale) ||
    groundDepthScale <= 0 ||
    !Number.isFinite(maxLength) ||
    maxLength <= 0
  )
    throw new RangeError('Positive finite ground projection limits required');
  const shapes = [];
  for (const caster of casters) {
    const role = caster.shadowRole ?? 'contact';
    if (!['none', 'contact', 'cast'].includes(role)) throw new TypeError('Unknown shadow role');
    if (role === 'none') continue;
    if (
      typeof caster.id !== 'string' ||
      !caster.id ||
      !pointValid(caster.position) ||
      !Number.isFinite(caster.width) ||
      caster.width <= 0 ||
      !Number.isFinite(caster.height) ||
      caster.height < 0
    )
      throw new TypeError('Finite shadow caster dimensions required');
    const opacity = caster.opacity ?? 0.2,
      parallax = caster.parallax ?? 1;
    if (
      !Number.isFinite(opacity) ||
      opacity < 0 ||
      opacity > 1 ||
      !Number.isFinite(parallax) ||
      parallax < 0
    )
      throw new RangeError('Invalid shadow opacity/parallax');
    if (opacity === 0) continue;
    if (role === 'contact') {
      const rx = caster.width / 2,
        ry = Math.max(1, Math.min(caster.width * 0.12, Math.max(2, caster.height * 0.08)));
      const points = Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        return {
          x: caster.position.x + Math.cos(angle) * rx,
          y: caster.position.y + Math.sin(angle) * ry,
        };
      });
      shapes.push(freezeShape({ id: caster.id, shadowRole: role, points, opacity, parallax }));
      continue;
    }
    // A cast shadow needs an authored simplified occluder. No rectangle fallback.
    if (
      !Array.isArray(caster.occluder) ||
      caster.occluder.length < 3 ||
      caster.occluder.length > 512 ||
      caster.occluder.some((p) => !pointValid(p))
    )
      throw new TypeError('Cast shadow requires a finite authored occluder polygon');
    const depth = caster.depth ?? Math.max(2, Math.min(32, caster.width * 0.12));
    if (!Number.isFinite(depth) || depth <= 0)
      throw new RangeError('Positive shadow extrusion depth required');
    const groundY = caster.position.y;
    const vertices = caster.occluder.flatMap((p) =>
      [-0.5, 0.5].map((sign) => ({
        x: p.x,
        y: Math.min(groundY, p.y),
        z: (p.z ?? 0) + depth * sign,
      })),
    );
    lights.forEach((light, index) => {
      const intensity = intensityOf(light);
      if (intensity === 0) return;
      if (light.kind !== 'directional' && light.kind !== 'point')
        throw new TypeError('Unknown shadow light kind');
      if (light.kind === 'directional' && !pointValid(light.direction))
        throw new TypeError('Finite shadow direction required');
      if (light.kind === 'point' && !pointValid(light.position))
        throw new TypeError('Finite shadow light position required');
      // Rays on/under the horizon have no forward intersection with this ground plane.
      if (light.kind === 'directional' && light.direction.y <= EPSILON) return;
      if (light.kind === 'point' && light.position.y >= groundY - EPSILON) return;
      if (light.kind === 'point' && light.range !== undefined) {
        if (!Number.isFinite(light.range) || light.range <= 0)
          throw new RangeError('Positive shadow light range required');
        const distance = Math.hypot(
          light.position.x - caster.position.x,
          light.position.y - groundY,
          light.position.z ?? 0,
        );
        if (distance >= light.range) return;
      }
      const projected = [];
      for (const p of vertices) {
        const ray =
          light.kind === 'directional'
            ? { x: light.direction.x, y: light.direction.y, z: light.direction.z ?? 0 }
            : {
                x: p.x - light.position.x,
                y: p.y - light.position.y,
                z: p.z - (light.position.z ?? 0),
              };
        if (ray.y <= EPSILON) continue;
        const height = groundY - p.y;
        const dx = height * (ray.x / ray.y),
          dz = height * (ray.z / ray.y);
        const length = Math.hypot(dx, dz);
        let offsetX = dx,
          offsetZ = dz;
        if (length > maxLength) {
          // Normalize ratios before multiplication so near-horizon lights remain bounded.
          const planarLength = Math.hypot(ray.x, ray.z);
          offsetX = planarLength > 0 ? (ray.x / planarLength) * maxLength : 0;
          offsetZ = planarLength > 0 ? (ray.z / planarLength) * maxLength : 0;
        }
        const q = { x: p.x + offsetX, y: groundY + (p.z + offsetZ) * groundDepthScale };
        if (Number.isFinite(q.x) && Number.isFinite(q.y)) projected.push(q);
      }
      const points = convexHull(projected);
      if (points.length >= 3)
        shapes.push(
          freezeShape({
            id: caster.id + ':' + (light.id ?? 'light-' + index),
            shadowRole: role,
            points,
            opacity: Math.min(1, opacity * intensity),
            parallax,
          }),
        );
    });
  }
  return Object.freeze(shapes);
}
