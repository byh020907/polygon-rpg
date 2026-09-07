import { projectSideViewSkeletonFrame } from './SkeletonPoseProjection.js';
import {
  axisAngleQuaternion,
  multiplyQuaternions,
  quaternionFromEuler,
  conjugateQuaternion,
} from './Quaternion.js';

// Local joint rotations, in radians. Positive pelvis winding carries every child forward
// through the side camera; flexion is articulated independently, never a rotated image.
const KEYS = [
  // time, turn, pelvis height, spine flexion, neck tuck, hip flexion, knee flexion, tool yaw
  [0, 0, 17, 0, 0, 0, 0, 0],
  [0.12, 0.4, 28, 0.25, 0.3, -0.9, 1.25, 1.42],
  [0.25, 1.25, 25, 0.55, 1.65, -1.65, 2.1, 1.3],
  [0.43, 2.8, 4, 0.5, 1.8, -1.85, 2.3, 1.3],
  [0.59, 4.15, 22, 0.45, 1.7, -1.8, 2.25, 1.3],
  [0.75, 5.5, 40, 0.3, 0.8, -1.2, 1.5, 1.05],
  [0.88, 6.1, 26, 0.12, 0.1, -0.6, 0.8, 0.45],
  [1, Math.PI * 2, 17, 0, 0, 0, 0, 0],
];

export function createForwardRollFrames(neutralFrame) {
  const authoredKeys = Array.from({ length: 101 }, (_, index) => {
    const at = index / 100;
    const nextIndex = KEYS.findIndex((key) => key[0] >= at);
    if (nextIndex <= 0) return [...KEYS[0]];
    const from = KEYS[nextIndex - 1];
    const to = KEYS[nextIndex];
    const amount = (at - from[0]) / (to[0] - from[0]);
    return from.map((value, column) => value + (to[column] - value) * amount);
  });
  return Object.freeze(
    authoredKeys.map(([at, turn, height, spine, neck, hip, knee, toolYaw], index) => {
      const tuck = Math.min(1, Math.abs(hip) / 1.65);
      const joints = Object.fromEntries(
        Object.entries(neutralFrame.joints).map(([id, joint]) => [id, { ...joint }]),
      );
      const zRotation = (angle) => axisAngleQuaternion({ x: 0, y: 0, z: 1 }, angle);
      joints.pelvis.quaternion = zRotation(turn);
      joints.pelvis.winding = Object.freeze({
        id: 'forward-roll',
        axis: Object.freeze({ x: 0, y: 0, z: 1 }),
        angle: turn,
      });
      joints.root.y += height - joints.pelvis.y;
      joints.chest.quaternion = zRotation(spine);
      joints.neck.quaternion = zRotation(neck);
      joints.head.quaternion = zRotation(-neck * 0.3);
      for (const [side, sign] of [
        ['near', 1],
        ['far', -1],
      ]) {
        joints[`${side}Hip`].quaternion = zRotation(hip + sign * tuck * 0.12);
        joints[`${side}Knee`].quaternion = zRotation(knee);
        joints[`${side}Foot`].quaternion = zRotation(-hip - knee);
        joints[`${side}Shoulder`].quaternion = multiplyQuaternions(
          zRotation(tuck * (sign > 0 ? 1.4 : -1.7)),
          joints[`${side}Shoulder`].quaternion,
        );
        joints[`${side}Elbow`].quaternion = multiplyQuaternions(
          zRotation(tuck * (sign > 0 ? 1.1 : -1.1)),
          joints[`${side}Elbow`].quaternion,
        );
      }
      const posed = projectSideViewSkeletonFrame({ joints });
      for (const side of ['near', 'far']) {
        joints[`${side}Hand`].quaternion = multiplyQuaternions(
          conjugateQuaternion(posed.worldJoints[`${side}Elbow`].quaternion),
          quaternionFromEuler({ y: toolYaw, z: turn + (side === 'near' ? 0.35 : -0.06) }),
        );
      }
      const lowestFoot = Math.max(
        posed.projectedJoints.nearFoot.y,
        posed.projectedJoints.farFoot.y,
      );
      if (lowestFoot > 82) joints.root.y -= lowestFoot - 82;
      const frame = Object.freeze({
        id: `forward-roll-${index}`,
        at,
        transition: 'linear',
        capeLift: 0.12 + tuck * 0.35,
        joints: Object.freeze(
          Object.fromEntries(
            Object.entries(joints).map(([id, value]) => [id, Object.freeze(value)]),
          ),
        ),
      });
      return Object.freeze({ ...frame, value: projectSideViewSkeletonFrame(frame) });
    }),
  );
}
