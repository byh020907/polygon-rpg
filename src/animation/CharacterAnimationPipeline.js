import { HUMANOID_RIG_FAMILY, DEFAULT_CHARACTER_BODY_PROFILE } from './RigFamily.js';
import {
  normalizeQuaternion,
  multiplyQuaternions,
  conjugateQuaternion,
  rotateByQuaternion,
  quaternionMatrix,
  slerpQuaternion,
  axisAngleQuaternion,
} from './Quaternion.js';
const identity = Object.freeze({ x: 0, y: 0, z: 0, w: 1 });
const axes = ['x', 'y', 'z'];
const vector = (value, label) => {
  if (!value || !axes.every((k) => Number.isFinite(value[k])))
    throw new TypeError(label + ' requires finite x/y/z');
  return value;
};
const add = (a, b) => Object.fromEntries(axes.map((k) => [k, a[k] + b[k]]));
const sub = (a, b) => Object.fromEntries(axes.map((k) => [k, a[k] - b[k]]));
const scale = (a, s) => Object.fromEntries(axes.map((k) => [k, a[k] * s]));
const dot = (a, b) => axes.reduce((s, k) => s + a[k] * b[k], 0);
const length = (a) => Math.hypot(a.x, a.y, a.z);
const unit = (a) => {
  const n = length(a);
  if (n < 1e-10) throw new Error('Zero direction in contact IK');
  return scale(a, 1 / n);
};
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const frozen = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
};
function rotationBetween(a, b) {
  const from = unit(a),
    to = unit(b),
    d = Math.max(-1, Math.min(1, dot(from, to)));
  if (d > 1 - 1e-10) return identity;
  if (d < -1 + 1e-10)
    return axisAngleQuaternion(
      unit(cross(from, Math.abs(from.x) < 0.8 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 })),
      Math.PI,
    );
  const c = cross(from, to);
  return normalizeQuaternion({ ...c, w: 1 + d });
}
export function composeRigFrame(frame, rigFamily = HUMANOID_RIG_FAMILY) {
  const world = {};
  for (const id of rigFamily.jointIds) {
    const local = vector(frame.joints[id], 'Joint ' + id),
      q = normalizeQuaternion(local.quaternion),
      parent = rigFamily.parents[id] ? world[rigFamily.parents[id]] : null;
    const offset = parent ? rotateByQuaternion(parent.quaternion, local) : local;
    const position = add(parent ?? { x: 0, y: 0, z: 0 }, offset);
    const quaternion = parent ? multiplyQuaternions(parent.quaternion, q) : q;
    world[id] = { ...position, quaternion, matrix: quaternionMatrix(quaternion) };
  }
  return frozen(world);
}
// Legacy clip translations remain internal canonical units. New authored offsets
// cross this boundary only as normalized coordinates multiplied by explicit size.
function authoredOffset(change, id, rig, extents = {}) {
  vector(change.offset, 'Normalized offset');
  if (axes.some((k) => Math.abs(change.offset[k]) > 1))
    throw new Error('Offset must be parent-normalized [-1,1]');
  const extent = change.parentExtent ?? extents[rig.parents[id] ?? id];
  if (!extent || !axes.every((k) => Number.isFinite(extent[k]) && extent[k] > 0))
    throw new Error('Normalized offset requires an explicit parent extent');
  return Object.fromEntries(axes.map((k) => [k, change.offset[k] * extent[k]]));
}
function applyModifier(joints, modifier, rig, extents) {
  if (!modifier) return;
  for (const [id, change] of Object.entries(modifier.joints ?? {})) {
    if (!rig.jointIds.includes(id)) throw new Error('Unknown modifier joint ' + id);
    const joint = joints[id];
    if (change.offset)
      Object.assign(
        joint,
        add(joint, authoredOffset(change, id, rig, modifier.extents ?? extents)),
      );
    if (change.quaternion)
      joint.quaternion = multiplyQuaternions(
        joint.quaternion,
        normalizeQuaternion(change.quaternion),
      );
  }
}
function applyContact(joints, contact, rig) {
  const [rootId, midId, endId] = contact.chain ?? [];
  if (contact.chain?.length !== 3 || rig.parents[midId] !== rootId || rig.parents[endId] !== midId)
    throw new Error('Contact IK requires a contiguous two-bone chain');
  const weight = contact.weight ?? 1;
  if (!Number.isFinite(weight) || weight < 0 || weight > 1)
    throw new Error('Contact weight must be 0..1');
  const before = composeRigFrame({ joints }, rig);
  let target = vector(contact.target, 'Contact target');
  if (contact.targetSpace === 'parent') {
    const parent = before[contact.targetParentId ?? rig.parents[rootId]];
    if (!parent) throw new Error('Contact target parent missing');
    target = add(parent, rotateByQuaternion(parent.quaternion, target));
  } else if (contact.targetSpace && contact.targetSpace !== 'world')
    throw new Error('Unsupported contact target space');
  const root = before[rootId],
    mid = before[midId],
    end = before[endId],
    upper = length(sub(mid, root)),
    lower = length(sub(end, mid));
  if (upper < 1e-8 || lower < 1e-8) throw new Error('Contact requires nonzero bone lengths');
  const toTarget = sub(target, root),
    requestedDistance = length(toTarget),
    direction = requestedDistance > 1e-8 ? unit(toTarget) : unit(sub(mid, root));
  const min = Math.abs(upper - lower) + 1e-7,
    max = upper + lower - 1e-7,
    reach = Math.max(min, Math.min(max, requestedDistance));
  let pole = contact.pole ? sub(vector(contact.pole, 'Contact pole'), root) : sub(mid, root);
  pole = sub(pole, scale(direction, dot(pole, direction)));
  if (length(pole) < 1e-8)
    pole = cross(
      direction,
      Math.abs(direction.z) < 0.8 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 },
    );
  pole = unit(pole);
  const along = (upper * upper + reach * reach - lower * lower) / (2 * reach),
    height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const solvedMid = add(root, add(scale(direction, along), scale(pole, height))),
    solvedEnd = add(root, scale(direction, reach));
  const setWorldRotation = (id, q) => {
    const world = composeRigFrame({ joints }, rig),
      parent = rig.parents[id] ? world[rig.parents[id]] : null;
    joints[id].quaternion = parent
      ? multiplyQuaternions(conjugateQuaternion(parent.quaternion), q)
      : q;
  };
  setWorldRotation(
    rootId,
    multiplyQuaternions(rotationBetween(sub(mid, root), sub(solvedMid, root)), root.quaternion),
  );
  let world = composeRigFrame({ joints }, rig);
  setWorldRotation(
    midId,
    multiplyQuaternions(
      rotationBetween(sub(world[endId], world[midId]), sub(solvedEnd, world[midId])),
      world[midId].quaternion,
    ),
  );
  // Contact changes limb placement while preserving the hand/foot attachment orientation.
  setWorldRotation(endId, end.quaternion);
  for (const id of [rootId, midId, endId])
    joints[id].quaternion = slerpQuaternion(
      before[id] && beforeLocal(before, id, rig),
      joints[id].quaternion,
      weight,
    );
  world = composeRigFrame({ joints }, rig);
  return frozen({
    chain: [rootId, midId, endId],
    weight,
    target: { ...target },
    position: { x: world[endId].x, y: world[endId].y, z: world[endId].z },
    clamped: Math.abs(reach - requestedDistance) > 1e-6,
    requestedDistance,
    solvedDistance: reach,
  });
}
function beforeLocal(world, id, rig) {
  return rig.parents[id]
    ? multiplyQuaternions(
        conjugateQuaternion(world[rig.parents[id]].quaternion),
        world[id].quaternion,
      )
    : world[id].quaternion;
}
export function sampleCharacterAnimation({
  skeletonFrame,
  rigFamily = HUMANOID_RIG_FAMILY,
  bodyProfile,
  characterModifier = null,
  contacts = [],
  authoredOverride = null,
}) {
  bodyProfile ??=
    rigFamily.id === HUMANOID_RIG_FAMILY.id
      ? DEFAULT_CHARACTER_BODY_PROFILE
      : { id: 'default', rigFamilyId: rigFamily.id, joints: {}, stance: {} };
  if (bodyProfile.rigFamilyId !== rigFamily.id) throw new Error('Body profile/rig family mismatch');
  if (!Array.isArray(contacts)) throw new Error('Contacts must be explicit array');
  const joints = Object.fromEntries(
    rigFamily.jointIds.map((id) => {
      const j = vector(skeletonFrame.joints[id], 'Clip joint ' + id);
      return [id, { ...j, quaternion: normalizeQuaternion(j.quaternion) }];
    }),
  );
  for (const [id, profile] of Object.entries(bodyProfile.joints)) {
    if (!joints[id]) throw new Error('Unknown body joint ' + id);
    const joint = joints[id],
      n = length(joint);
    const ratio =
      profile.length !== undefined
        ? n > 1e-10
          ? profile.length / n
          : profile.length === 0
            ? 1
            : NaN
        : (profile.scale ?? 1);
    if (!Number.isFinite(ratio)) throw new Error('Cannot length-retarget zero vector');
    Object.assign(joint, scale(joint, ratio));
    if (profile.offset)
      Object.assign(joint, add(joint, authoredOffset(profile, id, rigFamily, bodyProfile.extents)));
  }
  applyModifier(joints, bodyProfile.stance, rigFamily, bodyProfile.extents);
  applyModifier(joints, characterModifier, rigFamily, bodyProfile.extents);
  const contactReports = contacts.map((c) => applyContact(joints, c, rigFamily));
  if (authoredOverride) {
    if (
      authoredOverride.wholeBody &&
      authoredOverride.joints &&
      rigFamily.jointIds.some((id) => !authoredOverride.joints[id])
    )
      throw new Error('Whole-body joint override requires every joint');
    for (const [id, value] of Object.entries(authoredOverride.joints ?? {})) {
      if (!joints[id]) throw new Error('Unknown authored override joint');
      const next = { ...joints[id], ...value };
      vector(next, 'Authored joint');
      next.quaternion = normalizeQuaternion(next.quaternion);
      joints[id] = next;
    }
    for (const matrix of Object.values(authoredOverride.partTransforms ?? {})) {
      if (!Array.isArray(matrix) || matrix.length !== 6 || matrix.some((n) => !Number.isFinite(n)))
        throw new Error('Invalid authored part transform');
    }
    if (
      authoredOverride.poseId !== undefined &&
      (typeof authoredOverride.poseId !== 'string' || !authoredOverride.poseId)
    )
      throw new Error('Invalid authored pose id');
  }
  const frame = frozen({ ...skeletonFrame, joints });
  return frozen({
    skeletonFrame: frame,
    worldJoints: composeRigFrame(frame, rigFamily),
    contactReports,
    authoredOverride: authoredOverride ? structuredClone(authoredOverride) : null,
  });
}
