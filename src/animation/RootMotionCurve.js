export function defineRootMotionCurve({ id, keys }) {
  if (typeof id !== 'string' || !id || !Array.isArray(keys) || keys.length < 2)
    throw new TypeError('Root motion requires id and keys');
  let previous = -1;
  for (const key of keys) {
    if (
      !['at', 'x', 'y'].every((k) => Number.isFinite(key[k])) ||
      key.at <= previous ||
      key.at < 0 ||
      key.at > 1 ||
      Math.abs(key.x) > 1 ||
      Math.abs(key.y) > 1
    )
      throw new Error('Root motion requires monotonic normalized time and coordinates');
    previous = key.at;
  }
  if (keys[0].at !== 0 || keys.at(-1).at !== 1 || keys[0].x !== 0 || keys.at(-1).x !== 1)
    throw new Error('Root motion endpoints must span time and x from zero to one');
  return Object.freeze({ id, keys: Object.freeze(keys.map((key) => Object.freeze({ ...key }))) });
}
export const LINEAR_ROOT_MOTION_CURVE = defineRootMotionCurve({
  id: 'linear',
  keys: [
    { at: 0, x: 0, y: 0 },
    { at: 1, x: 1, y: 0 },
  ],
});
export function sampleRootMotion(
  curve,
  progress,
  { distance, facing = 1, verticalDistance = distance } = {},
) {
  if (
    !Number.isFinite(progress) ||
    !Number.isFinite(distance) ||
    distance < 0 ||
    !Number.isFinite(verticalDistance) ||
    ![-1, 1].includes(facing)
  )
    throw new Error('Finite root motion warp with facing -1/1 required');
  const t = Math.max(0, Math.min(1, progress));
  const upper = curve.keys.findIndex((key) => key.at >= t);
  const b = curve.keys[upper],
    a = curve.keys[Math.max(0, upper - 1)];
  const alpha = a === b ? 0 : (t - a.at) / (b.at - a.at);
  return Object.freeze({
    x: (a.x + (b.x - a.x) * alpha) * distance * facing,
    y: (a.y + (b.y - a.y) * alpha) * verticalDistance,
  });
}
export function sampleRootMotionDelta(curve, fromProgress, toProgress, options) {
  const from = sampleRootMotion(curve, fromProgress, options),
    to = sampleRootMotion(curve, toProgress, options);
  if (options?.reset) return Object.freeze({ x: 0, y: 0 });
  return Object.freeze({ x: to.x - from.x, y: to.y - from.y });
}
