import {
  normalizeQuaternion,
  quaternionFromEuler,
  multiplyQuaternions,
  conjugateQuaternion,
  axisAngleQuaternion,
  slerpQuaternion,
  quaternionMatrix,
  rotateByQuaternion,
} from './Quaternion.js';

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
export const SIDE_VIEW_SKELETON_JOINTS = Object.freeze(Object.keys(JOINT_PARENT));

function canonicalJoint(point) {
  if (!point || !['x', 'y', 'z'].every((key) => Number.isFinite(point[key])))
    throw new TypeError('Local translation requires finite x/y/z.');
  return Object.freeze({
    x: point.x,
    y: point.y,
    z: point.z,
    quaternion: normalizeQuaternion(point.quaternion),
    ...(point.winding
      ? {
          winding: Object.freeze({
            id: point.winding.id,
            angle: point.winding.angle,
            axis: Object.freeze({ ...point.winding.axis }),
          }),
        }
      : {}),
  });
}

// Explicit authoring boundary: Euler inputs are converted once and never kept in runtime frames.
export function defineSkeletonFrame(frame, { boneLengths = {} } = {}) {
  const joints = Object.fromEntries(
    Object.entries(frame.joints).map(([id, point]) => {
      const rotation =
        typeof point.rotation === 'object'
          ? point.rotation
          : { x: point.pitch ?? 0, y: point.yaw ?? 0, z: point.rotation ?? 0 };
      const length = Math.hypot(point.x, point.y, point.z);
      const scale =
        Number.isFinite(boneLengths[id]) && length > 1e-12 ? boneLengths[id] / length : 1;
      return [
        id,
        canonicalJoint({
          x: point.x * scale,
          y: point.y * scale,
          z: point.z * scale,
          quaternion: point.quaternion ?? quaternionFromEuler(rotation),
          winding: point.winding,
        }),
      ];
    }),
  );
  return Object.freeze({ ...frame, joints: Object.freeze(joints) });
}

function interpolateTranslation(from, to, amount, id) {
  if (id === 'root')
    return Object.fromEntries(
      ['x', 'y', 'z'].map((key) => [key, from[key] + (to[key] - from[key]) * amount]),
    );
  const length = Math.hypot(from.x, from.y, from.z);
  const endLength = Math.hypot(to.x, to.y, to.z);
  if (Math.abs(length - endLength) > 1e-6)
    throw new RangeError(id + ' changes bone length across keyframes.');
  if (length < 1e-12) return { x: 0, y: 0, z: 0 };
  const a = { x: from.x / length, y: from.y / length, z: from.z / length };
  const b = { x: to.x / length, y: to.y / length, z: to.z / length };
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  let direction;
  if (dot < -0.999999) {
    const reference = Math.abs(a.x) < 0.8 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const axis = {
      x: a.y * reference.z - a.z * reference.y,
      y: a.z * reference.x - a.x * reference.z,
      z: a.x * reference.y - a.y * reference.x,
    };
    direction = rotateByQuaternion(axisAngleQuaternion(axis, Math.PI * amount), a);
  } else {
    const angle = Math.acos(dot);
    const first = angle < 1e-6 ? 1 - amount : Math.sin((1 - amount) * angle) / Math.sin(angle);
    const second = angle < 1e-6 ? amount : Math.sin(amount * angle) / Math.sin(angle);
    direction = Object.fromEntries(
      ['x', 'y', 'z'].map((key) => [key, a[key] * first + b[key] * second]),
    );
  }
  const normalizer = length / Math.hypot(direction.x, direction.y, direction.z);
  return Object.fromEntries(['x', 'y', 'z'].map((key) => [key, direction[key] * normalizer]));
}

function interpolateRotation(from, to, amount) {
  if (from.winding?.id && from.winding.id === to.winding?.id) {
    const axis = from.winding.axis;
    const angle = from.winding.angle + (to.winding.angle - from.winding.angle) * amount;
    const residual = (joint) =>
      multiplyQuaternions(
        conjugateQuaternion(axisAngleQuaternion(axis, joint.winding.angle)),
        joint.quaternion,
      );
    return {
      quaternion: multiplyQuaternions(
        axisAngleQuaternion(axis, angle),
        slerpQuaternion(residual(from), residual(to), amount),
      ),
      winding: { id: from.winding.id, axis, angle },
    };
  }
  return { quaternion: slerpQuaternion(from.quaternion, to.quaternion, amount) };
}

// Local SLERP precedes FK. No projected screen point or Euler angle interpolation.
export function interpolateSideViewSkeletonFrames(previousFrame, currentFrame, amount) {
  const t = Math.max(0, Math.min(1, amount));
  const joints = Object.fromEntries(
    SIDE_VIEW_SKELETON_JOINTS.map((id) => {
      const from = canonicalJoint(previousFrame.joints[id]);
      const to = canonicalJoint(currentFrame.joints[id]);
      return [
        id,
        canonicalJoint({
          ...interpolateTranslation(from, to, t, id),
          ...interpolateRotation(from, to, t),
        }),
      ];
    }),
  );
  return Object.freeze({
    capeLift:
      (previousFrame.capeLift ?? 0) +
      ((currentFrame.capeLift ?? 0) - (previousFrame.capeLift ?? 0)) * t,
    joints: Object.freeze(joints),
  });
}

export function projectSideViewSkeletonFrame(frame) {
  const joints = Object.freeze(
    Object.fromEntries(
      SIDE_VIEW_SKELETON_JOINTS.map((id) => [id, canonicalJoint(frame.joints[id])]),
    ),
  );
  const cache = {};
  const compose = (id) => {
    if (cache[id]) return cache[id];
    const local = joints[id];
    const parent = JOINT_PARENT[id] ? compose(JOINT_PARENT[id]) : null;
    const offset = parent ? rotateByQuaternion(parent.quaternion, local) : local;
    const quaternion = parent
      ? multiplyQuaternions(parent.quaternion, local.quaternion)
      : local.quaternion;
    const matrix = quaternionMatrix(quaternion);
    cache[id] = Object.freeze({
      x: (parent?.x ?? 0) + offset.x,
      y: (parent?.y ?? 0) + offset.y,
      z: (parent?.z ?? 0) + offset.z,
      quaternion,
      matrix,
      rotation: Math.atan2(matrix[1][0], matrix[0][0]),
    });
    return cache[id];
  };
  const worldJoints = Object.freeze(
    Object.fromEntries(SIDE_VIEW_SKELETON_JOINTS.map((id) => [id, compose(id)])),
  );
  const projectedJoints = Object.freeze(
    Object.fromEntries(
      SIDE_VIEW_SKELETON_JOINTS.map((id) => {
        const world = worldJoints[id];
        const axis = (column) =>
          Object.freeze({
            x: world.matrix[0][column],
            y: world.matrix[1][column],
            depth: world.matrix[2][column],
          });
        return [
          id,
          Object.freeze({
            x: world.x,
            y: world.y,
            depth: world.z,
            axisX: axis(0),
            axisY: axis(1),
            axisZ: axis(2),
          }),
        ];
      }),
    ),
  );
  const { pelvis, chest, neck, head, root, nearShoulder, farShoulder } = projectedJoints;
  const angle = (a, b) => Math.atan2(b.x - a.x, a.y - b.y);
  return Object.freeze({
    rootOffset: Object.freeze({ x: root.x, y: root.y }),
    bodyLean: angle(pelvis, chest),
    bodyScaleX: 1,
    depthPhase: Math.max(-1, Math.min(1, (nearShoulder.depth - farShoulder.depth) / 12)),
    headTilt: angle(neck, head),
    rearFootTarget: Object.freeze({ x: projectedJoints.farFoot.x, y: projectedJoints.farFoot.y }),
    leadFootTarget: Object.freeze({ x: projectedJoints.nearFoot.x, y: projectedJoints.nearFoot.y }),
    capeLift: frame.capeLift ?? 0,
    skeletonFrame: Object.freeze({ capeLift: frame.capeLift ?? 0, joints }),
    worldJoints,
    projectedJoints,
  });
}
