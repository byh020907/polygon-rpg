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

function freezeRotation(point) {
  if (Number.isFinite(point.rotation)) {
    return Object.freeze({ x: point.pitch ?? 0, y: point.yaw ?? 0, z: point.rotation });
  }
  if (
    point.rotation &&
    Number.isFinite(point.rotation.x) &&
    Number.isFinite(point.rotation.y) &&
    Number.isFinite(point.rotation.z)
  ) {
    return Object.freeze({ ...point.rotation });
  }
  throw new TypeError('3D skeleton joint는 유한한 local rotation이 필요합니다.');
}

function freezePoint(point) {
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(point.z)
  ) {
    throw new TypeError('3D skeleton joint는 유한한 x/y/z와 local rotation이 필요합니다.');
  }
  const rotation3d = freezeRotation(point);
  return Object.freeze({ x: point.x, y: point.y, z: point.z, rotation: rotation3d.z, rotation3d });
}

function rotationMatrix({ x, y, z }) {
  const cosineX = Math.cos(x);
  const sineX = Math.sin(x);
  const cosineY = Math.cos(y);
  const sineY = Math.sin(y);
  const cosineZ = Math.cos(z);
  const sineZ = Math.sin(z);
  return Object.freeze([
    Object.freeze([
      cosineZ * cosineY,
      cosineZ * sineY * sineX - sineZ * cosineX,
      cosineZ * sineY * cosineX + sineZ * sineX,
    ]),
    Object.freeze([
      sineZ * cosineY,
      sineZ * sineY * sineX + cosineZ * cosineX,
      sineZ * sineY * cosineX - cosineZ * sineX,
    ]),
    Object.freeze([-sineY, cosineY * sineX, cosineY * cosineX]),
  ]);
}

function multiplyMatrix(left, right) {
  return Object.freeze(
    left.map((row) =>
      Object.freeze(
        right[0].map((_, column) =>
          row.reduce((sum, value, index) => sum + value * right[index][column], 0),
        ),
      ),
    ),
  );
}

function rotatePoint(matrix, point) {
  return Object.freeze({
    x: matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2] * point.z,
    y: matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2] * point.z,
    z: matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2] * point.z,
  });
}

function composeTransform(parent, local) {
  const offset = rotatePoint(parent.matrix, local);
  const matrix = multiplyMatrix(parent.matrix, rotationMatrix(local.rotation3d));
  return Object.freeze({
    x: parent.x + offset.x,
    y: parent.y + offset.y,
    z: parent.z + offset.z,
    rotation: Math.atan2(matrix[1][0], matrix[0][0]),
    rotation3d: local.rotation3d,
    matrix,
  });
}

function worldJoint(jointId, localJoints, cache) {
  if (cache[jointId]) return cache[jointId];
  const local = localJoints[jointId];
  if (!local) throw new TypeError(`Skeleton frame에 ${jointId} local joint가 필요합니다.`);
  const parentId = JOINT_PARENT[jointId];
  const value = parentId
    ? composeTransform(worldJoint(parentId, localJoints, cache), local)
    : Object.freeze({ ...local, matrix: rotationMatrix(local.rotation3d) });
  cache[jointId] = value;
  return value;
}

function projectJoint(world) {
  // The gameplay world remains 2D. z is presentation-only depth, so it can never alter a collider.
  return Object.freeze({ x: world.x, y: world.y, depth: world.z });
}

function interpolateAngle(from, to, amount) {
  const turn = Math.PI * 2;
  const delta = ((((to - from + Math.PI) % turn) + turn) % turn) - Math.PI;
  return from + delta * amount;
}

/**
 * Blends authored local transforms before their parent chain is composed.  Projected screen
 * anchors must never be interpolated directly: that would discard the parent's intermediate
 * rotation and make a child slide independently of its limb.
 */
export function interpolateSideViewSkeletonFrames(previousFrame, currentFrame, amount) {
  const bounded = Math.max(0, Math.min(1, amount));
  const previous = previousFrame?.joints;
  const current = currentFrame?.joints;
  if (!previous || !current) {
    throw new TypeError('skeleton interpolation에는 두 authored local frame이 필요합니다.');
  }
  return Object.freeze({
    capeLift:
      (previousFrame.capeLift ?? 0) +
      ((currentFrame.capeLift ?? 0) - (previousFrame.capeLift ?? 0)) * bounded,
    joints: Object.freeze(
      Object.fromEntries(
        JOINT_IDS.map((jointId) => {
          const from = freezePoint(previous[jointId]);
          const to = freezePoint(current[jointId]);
          return [
            jointId,
            Object.freeze({
              x: from.x + (to.x - from.x) * bounded,
              y: from.y + (to.y - from.y) * bounded,
              z: from.z + (to.z - from.z) * bounded,
              pitch: interpolateAngle(from.rotation3d.x, to.rotation3d.x, bounded),
              yaw: interpolateAngle(from.rotation3d.y, to.rotation3d.y, bounded),
              rotation: interpolateAngle(from.rotation3d.z, to.rotation3d.z, bounded),
            }),
          ];
        }),
      ),
    ),
  });
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
    skeletonFrame: Object.freeze({ capeLift: frame.capeLift ?? 0, joints: localJoints }),
    worldJoints,
    projectedJoints,
  });
}

export const SIDE_VIEW_SKELETON_JOINTS = JOINT_IDS;
