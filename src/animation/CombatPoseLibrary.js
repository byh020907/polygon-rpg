import { applyEasing } from './Easing.js';

const DEFAULT_TARGET_POSE = Object.freeze({
  handTarget: Object.freeze({ x: 56, y: -25 }),
  shieldTarget: Object.freeze({ x: -45, y: 2 }),
  swordAngle: -0.7,
  bodyOffset: Object.freeze({ x: 0, y: 0 }),
  bodyLean: 0,
  bodyScaleY: 1,
  trailOpacity: 0,
  trailArc: 0,
});

function keyframe(progress, pose = {}, easing = 'smoothStep') {
  return Object.freeze({ progress, pose: Object.freeze(pose), easing });
}

function definition(keyframes) {
  return Object.freeze({ keyframes: Object.freeze(keyframes) });
}

export const COMBAT_POSE_DEFINITIONS = Object.freeze({
  idle: definition([keyframe(0)]),
  slash: definition([
    keyframe(0),
    keyframe(
      0.17 / 0.52,
      {
        handTarget: { x: 13, y: -71 },
        swordAngle: -1.92,
        bodyOffset: { x: -4, y: 0 },
        bodyLean: -0.08,
      },
      'easeIn',
    ),
    keyframe(
      0.3 / 0.52,
      {
        handTarget: { x: 70, y: 15 },
        swordAngle: 0.3,
        bodyOffset: { x: 8, y: 0 },
        bodyLean: 0.11,
        trailOpacity: 0.9,
        trailArc: 2.05,
      },
      'easeOut',
    ),
    keyframe(1),
  ]),
  thrust: definition([
    keyframe(0),
    keyframe(
      0.13 / 0.42,
      {
        handTarget: { x: 25, y: -20 },
        swordAngle: -0.06,
        bodyOffset: { x: -7, y: 0 },
        bodyLean: -0.04,
      },
      'easeIn',
    ),
    keyframe(
      0.24 / 0.42,
      {
        handTarget: { x: 91, y: -18 },
        swordAngle: -0.03,
        bodyOffset: { x: 13, y: 0 },
        bodyLean: 0.08,
        trailOpacity: 0.68,
        trailArc: 0.22,
      },
      'easeOut',
    ),
    keyframe(1),
  ]),
  heavy: definition([
    keyframe(0),
    keyframe(
      0.28 / 0.76,
      {
        handTarget: { x: -4, y: -83 },
        swordAngle: -1.64,
        bodyOffset: { x: -8, y: -3 },
        bodyLean: -0.15,
      },
      'easeInOut',
    ),
    keyframe(
      0.49 / 0.76,
      {
        handTarget: { x: 62, y: 31 },
        swordAngle: 0.82,
        bodyOffset: { x: 11, y: 5 },
        bodyLean: 0.17,
        trailOpacity: 1,
        trailArc: 2.5,
      },
      'overshoot',
    ),
    keyframe(1),
  ]),
  rising: definition([
    keyframe(0),
    keyframe(
      0.17 / 0.6,
      {
        handTarget: { x: 63, y: 24 },
        swordAngle: 0.56,
        bodyOffset: { x: 5, y: 7 },
        bodyLean: 0.08,
      },
      'easeIn',
    ),
    keyframe(
      0.37 / 0.6,
      {
        handTarget: { x: 21, y: -75 },
        swordAngle: -1.39,
        bodyOffset: { x: 5, y: -6 },
        bodyLean: -0.09,
        trailOpacity: 0.9,
        trailArc: 2.0,
      },
      'easeOut',
    ),
    keyframe(1),
  ]),
  spin: definition([
    keyframe(0),
    keyframe(0.2 / 0.92, {
      handTarget: { x: 61, y: -20 },
      swordAngle: -0.55,
      bodyLean: -0.08,
      trailOpacity: 0.45,
      trailArc: 1.1,
    }),
    keyframe(0.4 / 0.92, {
      handTarget: { x: 50, y: 20 },
      swordAngle: 0.95,
      bodyLean: 0.1,
      trailOpacity: 0.9,
      trailArc: 1.35,
    }),
    keyframe(0.6 / 0.92, {
      handTarget: { x: -20, y: 4 },
      swordAngle: 2.55,
      bodyLean: -0.1,
      trailOpacity: 1,
      trailArc: 1.45,
    }),
    keyframe(0.78 / 0.92, {
      handTarget: { x: 30, y: -62 },
      swordAngle: 4.05,
      bodyLean: 0.07,
      trailOpacity: 0.72,
      trailArc: 1.2,
    }),
    keyframe(1),
  ]),
  guard: definition([
    keyframe(0, {
      handTarget: { x: 31, y: -38 },
      shieldTarget: { x: 35, y: -8 },
      swordAngle: -1.32,
      bodyOffset: { x: -3, y: 2 },
      bodyLean: -0.04,
    }),
  ]),
  crouch: definition([
    keyframe(0, {
      handTarget: { x: 47, y: -9 },
      shieldTarget: { x: -37, y: 17 },
      swordAngle: -0.35,
      bodyOffset: { x: 0, y: 27 },
      bodyLean: 0.03,
      bodyScaleY: 0.72,
    }),
  ]),
});

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function valueAt(pose, key) {
  return pose[key] ?? DEFAULT_TARGET_POSE[key];
}

function interpolatePoint(startPose, endPose, key, amount) {
  const start = valueAt(startPose, key);
  const end = valueAt(endPose, key);
  return Object.freeze({ x: lerp(start.x, end.x, amount), y: lerp(start.y, end.y, amount) });
}

function interpolatePose(startPose, endPose, amount) {
  return Object.freeze({
    handTarget: interpolatePoint(startPose, endPose, 'handTarget', amount),
    shieldTarget: interpolatePoint(startPose, endPose, 'shieldTarget', amount),
    swordAngle: lerp(valueAt(startPose, 'swordAngle'), valueAt(endPose, 'swordAngle'), amount),
    bodyOffset: interpolatePoint(startPose, endPose, 'bodyOffset', amount),
    bodyLean: lerp(valueAt(startPose, 'bodyLean'), valueAt(endPose, 'bodyLean'), amount),
    bodyScaleY: lerp(valueAt(startPose, 'bodyScaleY'), valueAt(endPose, 'bodyScaleY'), amount),
    trailOpacity: Math.max(
      0,
      Math.min(
        1,
        lerp(valueAt(startPose, 'trailOpacity'), valueAt(endPose, 'trailOpacity'), amount),
      ),
    ),
    trailArc: lerp(valueAt(startPose, 'trailArc'), valueAt(endPose, 'trailArc'), amount),
  });
}

export function sampleCombatTargetPose(motionState) {
  const definitionEntry = COMBAT_POSE_DEFINITIONS[motionState.id] ?? COMBAT_POSE_DEFINITIONS.idle;
  const progress = Math.max(0, Math.min(1, motionState.progress));
  const keyframes = definitionEntry.keyframes;
  let start = keyframes[0];
  let end = keyframes[keyframes.length - 1];
  for (let index = 1; index < keyframes.length; index += 1) {
    if (progress <= keyframes[index].progress) {
      end = keyframes[index];
      start = keyframes[index - 1];
      break;
    }
  }
  const segmentDuration = Math.max(0.0001, end.progress - start.progress);
  const segmentProgress = Math.max(0, Math.min(1, (progress - start.progress) / segmentDuration));
  const easedProgress = applyEasing(end.easing, segmentProgress);
  return Object.freeze({
    ...interpolatePose(start.pose, end.pose, easedProgress),
    id: motionState.id,
    label: motionState.label,
    progress: motionState.progress,
    phase: motionState.phase,
  });
}
