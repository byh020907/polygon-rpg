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
        handTarget: { x: 62, y: -38 },
        swordAngle: 0.24,
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
      handTarget: { x: 50, y: -48 },
      swordAngle: 0.95,
      bodyLean: 0.1,
      trailOpacity: 0.9,
      trailArc: 1.35,
    }),
    keyframe(0.6 / 0.92, {
      handTarget: { x: -20, y: -56 },
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
    keyframe(0.92, {
      handTarget: { x: 63, y: -18 },
      swordAngle: 5.2,
      bodyLean: 0.03,
      trailOpacity: 0.35,
      trailArc: 0.85,
    }),
    keyframe(1, {
      swordAngle: 5.58,
    }),
  ]),
  airSlash: definition([
    keyframe(0),
    keyframe(0.22, {
      handTarget: { x: 22, y: -52 },
      swordAngle: -1.2,
      bodyLean: -0.08,
    }),
    keyframe(
      0.5,
      {
        handTarget: { x: 88, y: 24 },
        swordAngle: 0.52,
        bodyOffset: { x: 10, y: 6 },
        bodyLean: 0.16,
        trailOpacity: 0.94,
        trailArc: 2.0,
      },
      'easeOut',
    ),
    keyframe(0.78, {
      handTarget: { x: 58, y: 12 },
      swordAngle: 0.28,
      bodyOffset: { x: 5, y: 5 },
      bodyLean: 0.08,
      trailOpacity: 0.3,
      trailArc: 0.8,
    }),
    keyframe(1),
  ]),
  airHeavy: definition([
    keyframe(0),
    keyframe(0.32, {
      handTarget: { x: 24, y: -55 },
      swordAngle: -1.15,
      bodyLean: -0.08,
    }),
    keyframe(
      0.62,
      {
        handTarget: { x: 82, y: 12 },
        swordAngle: 0.38,
        bodyOffset: { x: 10, y: 1 },
        bodyLean: 0.14,
        trailOpacity: 1,
        trailArc: 1.9,
      },
      'overshoot',
    ),
    keyframe(0.78, {
      handTarget: { x: 72, y: 10 },
      swordAngle: 0.3,
      bodyOffset: { x: 7, y: 2 },
      bodyLean: 0.1,
      trailOpacity: 0.42,
      trailArc: 1.05,
    }),
    keyframe(1),
  ]),
  airReturn: definition([
    keyframe(0),
    keyframe(0.22, {
      handTarget: { x: 84, y: 16 },
      swordAngle: 0.4,
      bodyOffset: { x: 6, y: 4 },
    }),
    keyframe(
      0.54,
      {
        handTarget: { x: 8, y: 30 },
        swordAngle: 2.65,
        bodyOffset: { x: -8, y: 7 },
        bodyLean: -0.14,
        trailOpacity: 0.92,
        trailArc: 2.05,
      },
      'easeOut',
    ),
    keyframe(0.8, {
      handTarget: { x: 34, y: 8 },
      swordAngle: 1.9,
      bodyOffset: { x: -3, y: 5 },
      bodyLean: -0.06,
      trailOpacity: 0.28,
      trailArc: 0.75,
    }),
    keyframe(1),
  ]),
  airSpin: definition([
    keyframe(0),
    keyframe(0.28, {
      handTarget: { x: 70, y: -18 },
      swordAngle: -0.42,
      trailOpacity: 0.55,
      trailArc: 1.2,
    }),
    keyframe(0.52, {
      handTarget: { x: -25, y: 6 },
      swordAngle: 2.65,
      bodyLean: -0.12,
      trailOpacity: 1,
      trailArc: 1.55,
    }),
    keyframe(0.76, {
      handTarget: { x: 48, y: -54 },
      swordAngle: 4.18,
      bodyLean: 0.1,
      trailOpacity: 0.82,
      trailArc: 1.35,
    }),
    keyframe(0.92, {
      handTarget: { x: 68, y: -16 },
      swordAngle: 5.15,
      trailOpacity: 0.32,
      trailArc: 0.8,
    }),
    keyframe(1, { swordAngle: 5.58 }),
  ]),
  airCross: definition([
    keyframe(0),
    keyframe(0.3, {
      handTarget: { x: 70, y: 22 },
      swordAngle: 0.52,
      bodyLean: 0.1,
    }),
    keyframe(
      0.62,
      {
        handTarget: { x: 7, y: -76 },
        swordAngle: -1.38,
        bodyOffset: { x: 7, y: 8 },
        bodyLean: -0.12,
        trailOpacity: 0.96,
        trailArc: 2.55,
      },
      'easeOut',
    ),
    keyframe(1),
  ]),
  shieldBash: definition([
    keyframe(0, {
      handTarget: { x: 24, y: -46 },
      shieldTarget: { x: 31, y: -8 },
      swordAngle: -1.4,
      bodyOffset: { x: -5, y: 2 },
      bodyLean: -0.08,
    }),
    keyframe(
      0.48,
      {
        handTarget: { x: 10, y: -54 },
        shieldTarget: { x: 70, y: -9 },
        swordAngle: -1.62,
        bodyOffset: { x: 14, y: 1 },
        bodyLean: 0.18,
      },
      'overshoot',
    ),
    keyframe(0.72, {
      handTarget: { x: 18, y: -48 },
      shieldTarget: { x: 61, y: -8 },
      swordAngle: -1.5,
      bodyOffset: { x: 9, y: 2 },
      bodyLean: 0.1,
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

function sampleDefinitionPose(motionState) {
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
  return interpolatePose(start.pose, end.pose, easedProgress);
}

function smoothStep(amount) {
  const bounded = Math.max(0, Math.min(1, amount));
  return bounded * bounded * (3 - 2 * bounded);
}

function interpolateTransitionPose(previousPose, currentPose, amount) {
  const blended = interpolatePose(previousPose, currentPose, amount);
  const angleDelta = Math.atan2(
    Math.sin(currentPose.swordAngle - previousPose.swordAngle),
    Math.cos(currentPose.swordAngle - previousPose.swordAngle),
  );
  return Object.freeze({
    ...blended,
    swordAngle: previousPose.swordAngle + angleDelta * amount,
  });
}

export function sampleCombatTargetPose(motionState) {
  const currentPose = sampleDefinitionPose(motionState);
  const transitionPose = motionState.transitionFrom
    ? sampleDefinitionPose(motionState.transitionFrom)
    : null;
  const poseResult = transitionPose
    ? interpolateTransitionPose(
        transitionPose,
        currentPose,
        smoothStep(motionState.transitionProgress ?? 1),
      )
    : currentPose;
  return Object.freeze({
    ...poseResult,
    id: motionState.id,
    label: motionState.label,
    progress: motionState.progress,
    phase: motionState.phase,
  });
}
