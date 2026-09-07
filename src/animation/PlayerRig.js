import { defineSkeletonFrame, projectSideViewSkeletonFrame } from './SkeletonPoseProjection.js';

export const PLAYER_RIG = Object.freeze({
  footY: 82,
  pelvisY: 17,
  chestLength: 40,
  neckLength: 9,
  headLength: 10,
  shoulderX: 14,
  shoulderY: -2,
  shoulderDepth: 7,
  hipX: 8,
  hipY: 3,
  hipDepth: 4,
  upperArm: 25,
  forearm: 24,
  thigh: 30,
  shin: 32,
});

// Pose authoring only. Solved transforms are stored as immutable quaternion keys;
// runtime playback never solves IK or adjusts bone lengths.
function chainAngles(x, y, upper, lower, bend) {
  const distance = Math.max(0.001, Math.min(upper + lower - 0.001, Math.hypot(x, y)));
  const direction = Math.atan2(y, x);
  const opening = Math.acos(
    Math.max(
      -1,
      Math.min(1, (upper * upper + distance * distance - lower * lower) / (2 * upper * distance)),
    ),
  );
  const first = direction + opening * bend;
  const targetX = Math.cos(direction) * distance;
  const targetY = Math.sin(direction) * distance;
  const second = Math.atan2(targetY - Math.sin(first) * upper, targetX - Math.cos(first) * upper);
  return { first, second };
}

const rotate = (x, y, angle) => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle),
});

export function authorPlayerRigFrame({
  id,
  at,
  transition = 'linear',
  rootX = 0,
  rootY = 0,
  bodyLean = 0,
  headTilt = 0,
  rearFootX = -8,
  rearFootY = PLAYER_RIG.footY,
  leadFootX = 8,
  leadFootY = PLAYER_RIG.footY,
  depth = 0,
  capeLift = 0,
  armPose = 'neutral',
  wristFlex = 0,
  nearHandTarget = null,
}) {
  const pelvisAngle = bodyLean * 0.8;
  const chestAngle = bodyLean * 0.2;
  const torsoAngle = pelvisAngle + chestAngle;
  const joints = {
    root: { x: rootX, y: rootY, z: 0, rotation: 0 },
    pelvis: { x: 0, y: PLAYER_RIG.pelvisY, z: 0, rotation: pelvisAngle },
    chest: { x: 0, y: -PLAYER_RIG.chestLength, z: 0, rotation: chestAngle, yaw: depth * 0.04 },
    neck: { x: 0, y: -PLAYER_RIG.neckLength, z: 0, rotation: headTilt - torsoAngle },
    head: { x: 0, y: -PLAYER_RIG.headLength, z: 0, rotation: 0 },
  };
  const chestOffset = rotate(0, -PLAYER_RIG.chestLength, pelvisAngle);
  const chest = { x: rootX + chestOffset.x, y: rootY + PLAYER_RIG.pelvisY + chestOffset.y };
  const armTargets = {
    neutral: { x: 27, y: 20, shieldX: -19, shieldY: 15, blade: 0.35 },
    windup: { x: -17, y: -49, shieldX: 7, shieldY: -18, blade: -1.95 },
    contact: { x: 48, y: -20, shieldX: -8, shieldY: -3, blade: wristFlex },
    followThrough: { x: 43, y: 2, shieldX: -20, shieldY: 6, blade: wristFlex },
  };
  const arm = armTargets[armPose];
  if (!arm) throw new RangeError('Unknown authored arm pose: ' + armPose);
  if (nearHandTarget) {
    arm.x = nearHandTarget.x;
    arm.y = nearHandTarget.y;
  }
  if (id.startsWith('counter') && ['contact', 'followThrough'].includes(armPose)) {
    arm.shieldX = 44;
    arm.shieldY = -12;
  } else if (id.startsWith('guard') || id.startsWith('block')) {
    arm.shieldX = 10;
    arm.shieldY = -24;
  }
  for (const [side, sign, footX, footY] of [
    ['near', 1, leadFootX, leadFootY],
    ['far', -1, rearFootX, rearFootY],
  ]) {
    const shoulder = rotate(sign * PLAYER_RIG.shoulderX, PLAYER_RIG.shoulderY, torsoAngle);
    const target =
      side === 'near'
        ? { x: rootX + arm.x, y: rootY + arm.y }
        : { x: rootX + arm.shieldX, y: rootY + arm.shieldY };
    const localTarget = rotate(
      target.x - chest.x - shoulder.x,
      target.y - chest.y - shoulder.y,
      -torsoAngle,
    );
    const armAngles = chainAngles(
      localTarget.x,
      localTarget.y,
      PLAYER_RIG.upperArm,
      PLAYER_RIG.forearm,
      sign,
    );
    const forearmWorldAngle = torsoAngle + armAngles.second;
    joints[side + 'Shoulder'] = {
      x: sign * PLAYER_RIG.shoulderX,
      y: PLAYER_RIG.shoulderY,
      z: sign * PLAYER_RIG.shoulderDepth,
      rotation: armAngles.first - Math.PI / 2,
    };
    joints[side + 'Elbow'] = {
      x: 0,
      y: PLAYER_RIG.upperArm,
      z: 0,
      rotation: armAngles.second - armAngles.first,
    };
    joints[side + 'Hand'] = {
      x: 0,
      y: PLAYER_RIG.forearm,
      z: 0,
      rotation: (side === 'near' ? arm.blade : -0.06) - forearmWorldAngle + Math.PI / 2,
    };
    const hip = rotate(sign * PLAYER_RIG.hipX, PLAYER_RIG.hipY, pelvisAngle);
    const legTarget = rotate(
      footX - rootX - hip.x,
      footY - rootY - PLAYER_RIG.pelvisY - hip.y,
      -pelvisAngle,
    );
    const leg = chainAngles(legTarget.x, legTarget.y, PLAYER_RIG.thigh, PLAYER_RIG.shin, -1);
    joints[side + 'Hip'] = {
      x: sign * PLAYER_RIG.hipX,
      y: PLAYER_RIG.hipY,
      z: sign * PLAYER_RIG.hipDepth,
      rotation: leg.first - Math.PI / 2,
    };
    joints[side + 'Knee'] = { x: 0, y: PLAYER_RIG.thigh, z: 0, rotation: leg.second - leg.first };
    joints[side + 'Foot'] = {
      x: 0,
      y: PLAYER_RIG.shin,
      z: 0,
      rotation: -pelvisAngle - leg.second + Math.PI / 2,
    };
  }
  const frame = defineSkeletonFrame({ id, at, transition, capeLift, joints });
  return Object.freeze({
    ...frame,
    value: Object.freeze({ ...projectSideViewSkeletonFrame(frame), frameId: id }),
  });
}
