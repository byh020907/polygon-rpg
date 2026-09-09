import { normalizeQuaternion, slerpQuaternion } from './Quaternion.js';
const freeze = (v) => {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
};
export function defineAuthoredPoseTrack({ id, keys }) {
  if (typeof id !== 'string' || !id || !Array.isArray(keys) || !keys.length || keys.length > 128)
    throw Error('Authored pose track requires id and bounded keys');
  const copy = structuredClone(keys);
  let previous = -1;
  for (const key of copy) {
    if (!Number.isFinite(key.at) || key.at < 0 || key.at > 1 || key.at <= previous)
      throw Error('Ordered normalized pose time required');
    previous = key.at;
    if (key.poseId !== undefined && (typeof key.poseId !== 'string' || !key.poseId))
      throw Error('Pose id required');
    for (const value of Object.values(key.joints ?? {})) {
      for (const axis of ['x', 'y', 'z'])
        if (value[axis] !== undefined && !Number.isFinite(value[axis]))
          throw Error('Finite compiled joint required');
      if (value.quaternion) value.quaternion = normalizeQuaternion(value.quaternion);
    }
    for (const matrix of Object.values(key.partTransforms ?? {}))
      if (!Array.isArray(matrix) || matrix.length !== 6 || matrix.some((v) => !Number.isFinite(v)))
        throw Error('Invalid authored part matrix');
  }
  if (copy[0].at !== 0) throw Error('Authored pose track must start at zero');
  return freeze({ id, keys: copy });
}
export function sampleAuthoredPoseTrack(track, progress) {
  if (!Number.isFinite(progress)) throw Error('Finite pose progress required');
  const t = Math.max(0, Math.min(1, progress));
  const index = Math.max(
    0,
    track.keys.findLastIndex((k) => k.at <= t),
  );
  const a = track.keys[index],
    b = track.keys[index + 1] ?? a;
  const alpha = a === b ? 0 : (t - a.at) / (b.at - a.at);
  const joints = {};
  for (const [id, value] of Object.entries(a.joints ?? {})) {
    const end = b.joints?.[id];
    joints[id] = { ...value };
    if (end) {
      for (const axis of ['x', 'y', 'z'])
        if (value[axis] !== undefined && end[axis] !== undefined)
          joints[id][axis] = value[axis] + (end[axis] - value[axis]) * alpha;
      if (value.quaternion && end.quaternion)
        joints[id].quaternion = slerpQuaternion(value.quaternion, end.quaternion, alpha);
    }
  }
  const { at: unused, ...override } = a;
  void unused;
  // SVG topology changes only at authored keys; the rig rotations interpolate continuously.
  return freeze({ ...override, ...(Object.keys(joints).length ? { joints } : {}) });
}
