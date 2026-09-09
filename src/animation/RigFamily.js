import { SIDE_VIEW_SKELETON_PARENTS } from './SkeletonPoseProjection.js';
function immutable(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) immutable(child);
    Object.freeze(value);
  }
  return value;
}
export function defineRigFamily({ id, parents }) {
  if (
    typeof id !== 'string' ||
    !id ||
    !parents ||
    typeof parents !== 'object' ||
    Array.isArray(parents)
  )
    throw new TypeError('Named rig family and parents required');
  const ordered = [],
    visiting = new Set(),
    done = new Set();
  const visit = (joint) => {
    if (done.has(joint)) return;
    if (visiting.has(joint)) throw new Error('Cyclic rig hierarchy');
    if (!Object.hasOwn(parents, joint)) throw new Error('Unknown rig parent ' + joint);
    visiting.add(joint);
    if (parents[joint] !== null) visit(parents[joint]);
    visiting.delete(joint);
    done.add(joint);
    ordered.push(joint);
  };
  Object.keys(parents).forEach(visit);
  if (ordered.filter((j) => parents[j] === null).length !== 1)
    throw new Error('Rig requires exactly one root');
  return immutable({ id, parents: { ...parents }, jointIds: ordered });
}
export const HUMANOID_RIG_FAMILY = defineRigFamily({
  id: 'Humanoid',
  parents: SIDE_VIEW_SKELETON_PARENTS,
});
export const BIPED_RIG_FAMILY = defineRigFamily({
  id: 'Biped',
  parents: {
    root: null,
    body: 'root',
    head: 'body',
    leftHip: 'body',
    leftKnee: 'leftHip',
    leftFoot: 'leftKnee',
    rightHip: 'body',
    rightKnee: 'rightHip',
    rightFoot: 'rightKnee',
  },
});
const legged = (id, count) =>
  defineRigFamily({
    id,
    parents: {
      root: null,
      body: 'root',
      head: 'body',
      ...Object.fromEntries(
        Array.from({ length: count }, (_, i) => [
          [`leg${i + 1}Hip`, 'body'],
          [`leg${i + 1}Knee`, `leg${i + 1}Hip`],
          [`leg${i + 1}Foot`, `leg${i + 1}Knee`],
        ]).flat(),
      ),
    },
  });
export const QUADRUPED_RIG_FAMILY = legged('Quadruped', 4);
export const MULTI_LEG_RIG_FAMILY = legged('MultiLeg', 6);
export const FLYING_RIG_FAMILY = defineRigFamily({
  id: 'Flying',
  parents: {
    root: null,
    body: 'root',
    head: 'body',
    leftWing: 'body',
    leftWingTip: 'leftWing',
    rightWing: 'body',
    rightWingTip: 'rightWing',
    tail: 'body',
  },
});
export const TRACKED_RIG_FAMILY = defineRigFamily({
  id: 'Tracked',
  parents: {
    root: null,
    body: 'root',
    leftTrack: 'body',
    rightTrack: 'body',
    turret: 'body',
    tool: 'turret',
  },
});
export const RIG_FAMILIES = immutable(
  Object.fromEntries(
    [
      HUMANOID_RIG_FAMILY,
      BIPED_RIG_FAMILY,
      QUADRUPED_RIG_FAMILY,
      MULTI_LEG_RIG_FAMILY,
      FLYING_RIG_FAMILY,
      TRACKED_RIG_FAMILY,
    ].map((r) => [r.id, r]),
  ),
);
export function defineCharacterBodyProfile({
  id,
  rigFamilyId = 'Humanoid',
  joints = {},
  stance = { joints: {} },
  extents = {},
}) {
  if (typeof id !== 'string' || !id) throw new TypeError('Body profile requires an id');
  for (const joint of Object.values(joints)) {
    if (joint.length !== undefined && (!Number.isFinite(joint.length) || joint.length < 0))
      throw new Error('Invalid bone length');
    if (joint.scale !== undefined && (!Number.isFinite(joint.scale) || joint.scale <= 0))
      throw new Error('Invalid bone scale');
  }
  for (const change of [...Object.values(joints), ...Object.values(stance.joints ?? {})]) {
    if (
      change.offset &&
      !['x', 'y', 'z'].every(
        (k) => Number.isFinite(change.offset[k]) && Math.abs(change.offset[k]) <= 1,
      )
    )
      throw new Error('Body offset must use parent-normalized [-1,1] coordinates');
    if (
      change.parentExtent &&
      !['x', 'y', 'z'].every(
        (k) => Number.isFinite(change.parentExtent[k]) && change.parentExtent[k] > 0,
      )
    )
      throw new Error('Explicit parent extent must be positive');
    if (change.offset && !change.parentExtent && Object.keys(extents).length === 0)
      throw new Error('Normalized offset requires explicit parentExtent or body extents');
  }
  for (const extent of Object.values(extents))
    if (!['x', 'y', 'z'].every((k) => Number.isFinite(extent[k]) && extent[k] > 0))
      throw new Error('Body extents must be positive');
  return immutable({
    id,
    rigFamilyId,
    joints: structuredClone(joints),
    stance: structuredClone(stance),
    extents: structuredClone(extents),
  });
}
export const DEFAULT_CHARACTER_BODY_PROFILE = defineCharacterBodyProfile({ id: 'player' });
// Named ownership slots intentionally retain the accepted proportions until art approval.
export const CHARACTER_BODY_PROFILES = immutable(
  Object.fromEntries(
    ['player', 'rival', 'owner', 'worker', 'human-raider'].map((id) => [
      id,
      id === 'player' ? DEFAULT_CHARACTER_BODY_PROFILE : defineCharacterBodyProfile({ id }),
    ]),
  ),
);
