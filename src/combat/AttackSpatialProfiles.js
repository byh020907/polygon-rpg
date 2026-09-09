import { samplePlayerMotionPose } from '../animation/PlayerMotionPose.js';
import { projectSideViewSkeletonFrame } from '../animation/SkeletonPoseProjection.js';
import { samplePlayerCombatGeometry } from './SharedCombatGeometry.js';

// Authored world-space forward reach sizes the active animation and attached tool.
export const ATTACK_SPATIAL_PROFILES = Object.freeze(
  Object.fromEntries(
    Object.entries({
      slash: 149.5,
      heavy: 145.6,
      thrust: 152.1,
      rising: 152.3,
      spin: 146.2,
      airSlash: 151.1,
      airHeavy: 152.7,
      airReturn: 144.8,
      airSpin: 120.2,
      airCross: 152.3,
      shieldBash: 45.9,
    }).map(([id, reach]) => [id, Object.freeze({ reach })]),
  ),
);

const calibrationCache = new Map();

function sizeShieldArm(bonePose, scale) {
  const frame = bonePose.skeletonFrame;
  if (!frame) return bonePose;
  // Resize local upper/lower arm translations before composing the parent hierarchy.
  // The hand, forearm, shield and visible arm therefore share one attached chain.
  const joints = { ...frame.joints };
  for (const id of ['farElbow', 'farHand']) {
    const joint = joints[id];
    joints[id] = Object.freeze({
      ...joint,
      x: joint.x * scale,
      y: joint.y * scale,
      z: joint.z * scale,
    });
  }
  return Object.freeze({ ...bonePose, ...projectSideViewSkeletonFrame({ ...frame, joints }) });
}

function sizedPose(pose, id, scale) {
  if (id !== 'shieldBash')
    return Object.freeze({
      ...pose,
      targetPose: Object.freeze({ ...pose.targetPose, weaponLengthScale: scale }),
    });
  const bonePose = sizeShieldArm(pose.bonePose, scale);
  const hand = bonePose.projectedJoints.farHand;
  const shieldTarget = Object.freeze({
    x: hand.x - pose.targetPose.bodyOffset.x - bonePose.rootOffset.x,
    y: hand.y - pose.targetPose.bodyOffset.y - bonePose.rootOffset.y,
  });
  return Object.freeze({
    bonePose,
    targetPose: Object.freeze({ ...pose.targetPose, shieldTarget }),
  });
}

function calibrate({ id, reach, start, end, geometryScale, timingFrame, bodyProfile }) {
  const key = `${id}:${reach}:${start}:${end}:${geometryScale}:${timingFrame.durationFrames}:${timingFrame.startupFrames}:${timingFrame.activeFrames}:${JSON.stringify(bodyProfile ?? null)}`;
  if (calibrationCache.has(key)) return calibrationCache.get(key);
  const coefficients = [];
  const firstTick = Math.round(start * timingFrame.durationFrames * 2);
  const endTick = Math.round(end * timingFrame.durationFrames * 2);
  for (let tick = firstTick; tick < endTick; tick += 1) {
    const motionState = Object.freeze({
      id,
      progress: tick / (timingFrame.durationFrames * 2),
      phase: 'active',
      frame: timingFrame,
    });
    const pose = samplePlayerMotionPose({
      motionState,
      boneInput: { isGrounded: !id.startsWith('air') },
      bodyProfile,
    });
    const shapes = [1, 2].map((scale) => {
      const sized = sizedPose(pose, id, scale);
      const geometry = samplePlayerCombatGeometry({
        position: { x: 0, y: 0 },
        facing: 1,
        ...sized,
        geometryScale,
        weaponLengthScale: 1,
      });
      return id === 'shieldBash' ? geometry.shield : geometry.weapon;
    });
    shapes[0].points.forEach((point, pointIndex) => {
      const b = shapes[1].points[pointIndex].x - point.x;
      coefficients.push({ a: point.x - b, b });
    });
  }
  const extent = (scale) => Math.max(...coefficients.map(({ a, b }) => a + b * scale));
  if (!coefficients.some(({ b }) => b > 1e-8)) {
    throw new RangeError(`${id} authored active strip never points toward its designed reach.`);
  }
  if (reach <= extent(0))
    throw new RangeError(`${id} reach must extend beyond the attached hand/shoulder.`);
  let low = 0;
  let high = 1;
  while (extent(high) < reach) {
    high *= 2;
    if (!Number.isFinite(high))
      throw new RangeError(`${id} authored reach cannot be sized finitely.`);
  }
  for (let index = 0; index < 40; index += 1) {
    const middle = (low + high) / 2;
    if (extent(middle) < reach) low = middle;
    else high = middle;
  }
  const result = (low + high) / 2;
  if (calibrationCache.size >= 128) calibrationCache.delete(calibrationCache.keys().next().value);
  calibrationCache.set(key, result);
  return result;
}

export function sizeAttackMotionPose(
  pose,
  { id, reach, start, end, geometryScale, timingFrame, bodyProfile },
) {
  if (!ATTACK_SPATIAL_PROFILES[id] || pose.bonePose.rollMarker) return pose;
  return sizedPose(
    pose,
    id,
    calibrate({ id, reach, start, end, geometryScale, timingFrame, bodyProfile }),
  );
}
