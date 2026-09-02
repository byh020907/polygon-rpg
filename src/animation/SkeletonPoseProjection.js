const JOINT_PARENT = Object.freeze({
  root: null,
  pelvis: 'root',
  chest: 'pelvis',
  neck: 'chest',
  head: 'neck',
  nearShoulder: 'chest',
  nearElbow: 'nearShoulder',
  nearHand: 'nearElbow',
  farShoulder: 'chest',
  farElbow: 'farShoulder',
  farHand: 'farElbow',
  nearHip: 'pelvis',
  nearKnee: 'nearHip',
  nearFoot: 'nearKnee',
  farHip: 'pelvis',
  farKnee: 'farHip',
  farFoot: 'farKnee',
});

const JOINT_IDS = Object.freeze(Object.keys(JOINT_PARENT));

function freezePoint(point) {
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(point.z) ||
    !Number.isFinite(point.rotation)
  ) {
    throw new TypeError('3D skeleton joint는 유한한 x/y/z와 local rotation이 필요합니다.');
  }
  return Object.freeze({ x: point.x, y: point.y, z: point.z, rotation: point.rotation });
}

function composeTransform(parent, local) {
  const cosine = Math.cos(parent.rotation);
  const sine = Math.sin(parent.rotation);
  return Object.freeze({
    x: parent.x + local.x * cosine - local.y * sine,
    y: parent.y + local.x * sine + local.y * cosine,
    z: parent.z + local.z,
    rotation: parent.rotation + local.rotation,
  });
}

function worldJoint(jointId, localJoints, cache) {
  if (cache[jointId]) return cache[jointId];
  const local = localJoints[jointId];
  if (!local) throw new TypeError(`Skeleton frame에 ${jointId} local joint가 필요합니다.`);
  const parentId = JOINT_PARENT[jointId];
  const value = parentId
    ? composeTransform(worldJoint(parentId, localJoints, cache), local)
    : local;
  cache[jointId] = value;
  return value;
}

function projectJoint(world) {
  // The gameplay world remains 2D. z is presentation-only depth, so it can never alter a collider.
  return Object.freeze({ x: world.x, y: world.y, depth: world.z });
}

function angleFromTo(from, to) {
  return Math.atan2(to.x - from.x, from.y - to.y);
}

/**
 * Resolves authored local 3D joints through their parent graph and projects them through a fixed
 * side-view orthographic camera. The returned compact pose keeps Canvas polygon rendering free of
 * a 3D runtime while exposing projected joints/depth for the cutout owner.
 */
export function projectSideViewSkeletonFrame(frame) {
  if (!frame || typeof frame !== 'object' || !frame.joints || typeof frame.joints !== 'object') {
    throw new TypeError('side-view projection에는 authored skeleton frame이 필요합니다.');
  }
  const localJoints = Object.freeze(
    Object.fromEntries(JOINT_IDS.map((jointId) => [jointId, freezePoint(frame.joints[jointId])])),
  );
  const worldCache = {};
  const worldJoints = Object.freeze(
    Object.fromEntries(
      JOINT_IDS.map((jointId) => [jointId, worldJoint(jointId, localJoints, worldCache)]),
    ),
  );
  const projectedJoints = Object.freeze(
    Object.fromEntries(JOINT_IDS.map((jointId) => [jointId, projectJoint(worldJoints[jointId])])),
  );
  const pelvis = projectedJoints.pelvis;
  const chest = projectedJoints.chest;
  const neck = projectedJoints.neck;
  const head = projectedJoints.head;
  const root = projectedJoints.root;
  const depthDelta = projectedJoints.nearShoulder.depth - projectedJoints.farShoulder.depth;
  return Object.freeze({
    rootOffset: Object.freeze({ x: root.x, y: root.y }),
    bodyLean: angleFromTo(pelvis, chest),
    bodyScaleX: 1,
    depthPhase: Math.max(-1, Math.min(1, depthDelta / 12)),
    headTilt: angleFromTo(neck, head),
    rearFootTarget: Object.freeze({ x: projectedJoints.farFoot.x, y: projectedJoints.farFoot.y }),
    leadFootTarget: Object.freeze({ x: projectedJoints.nearFoot.x, y: projectedJoints.nearFoot.y }),
    capeLift: frame.capeLift ?? 0,
    projectedJoints,
  });
}

export const SIDE_VIEW_SKELETON_JOINTS = JOINT_IDS;
