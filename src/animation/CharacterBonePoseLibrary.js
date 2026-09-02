import { projectSideViewSkeletonFrame } from './SkeletonPoseProjection.js';
import { rollTimelineMarkerAt } from './RollTimeline.js';

const CHARACTER_FOOT_Y = 80;
const REFERENCE_JUMP_SPEED = 470;

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothStep(value) {
  const bounded = clamp(value);
  return bounded * bounded * (3 - 2 * bounded);
}

function point(x, y) {
  return Object.freeze({ x, y });
}

function pose({
  rootX = 0,
  rootY = 0,
  bodyLean = 0,
  bodyScaleX = 1,
  depthPhase = 0,
  headTilt = 0,
  rearFootX = -8,
  rearFootY = CHARACTER_FOOT_Y,
  leadFootX = 8,
  leadFootY = CHARACTER_FOOT_Y,
  capeLift = 0,
} = {}) {
  return Object.freeze({
    rootOffset: point(rootX, rootY),
    bodyLean,
    bodyScaleX,
    depthPhase,
    headTilt,
    rearFootTarget: point(rearFootX, rearFootY),
    leadFootTarget: point(leadFootX, leadFootY),
    capeLift,
  });
}

function sampleIdle(animationTime) {
  return sampleAuthoredCycle(AUTHORED_PLAYER_UTILITY_FRAMES.idle, animationTime, 2.4);
}

function sampleMovement(animationTime) {
  return sampleAuthoredCycle(AUTHORED_PLAYER_UTILITY_FRAMES.run, animationTime, 7.5);
}

function sampleAirborne(verticalVelocity) {
  return sampleAuthoredPoseFrames(
    verticalVelocity < 0
      ? AUTHORED_PLAYER_UTILITY_FRAMES.jumpRise
      : AUTHORED_PLAYER_UTILITY_FRAMES.jumpFall,
    clamp(Math.abs(verticalVelocity) / REFERENCE_JUMP_SPEED),
  );
}

function sampleGuard(animationTime) {
  return sampleAuthoredCycle(AUTHORED_PLAYER_UTILITY_FRAMES.guard, animationTime, 2.1);
}

function sampleBlockReaction(progress, strength) {
  const recoil = smoothStep(progress) * clamp(strength, 0.4, 1);
  return pose({
    rootX: -2 - recoil * 6,
    rootY: 3 + recoil * 2,
    bodyLean: -0.075 - recoil * 0.11,
    headTilt: 0.045 + recoil * 0.08,
    rearFootX: -16 - recoil * 3,
    rearFootY: CHARACTER_FOOT_Y,
    leadFootX: 15,
    leadFootY: CHARACTER_FOOT_Y - recoil * 2,
    capeLift: 0.18 + recoil * 0.35,
  });
}

function sampleLanding(recovery) {
  return sampleAuthoredPoseFrames(AUTHORED_PLAYER_UTILITY_FRAMES.landing, clamp(recovery));
}

function sampleHitReaction(intensity, knockedOut) {
  return knockedOut
    ? pose({
        rootX: -6,
        rootY: 14,
        bodyLean: 1.18,
        headTilt: -0.42,
        rearFootX: -15,
        rearFootY: 76,
        leadFootX: 18,
        leadFootY: 78,
      })
    : sampleAuthoredPoseFrames(AUTHORED_PLAYER_UTILITY_FRAMES.hit, clamp(intensity));
}

const AUTHORED_ARM_TRANSFORMS = Object.freeze({
  neutral: Object.freeze({
    nearElbow: Object.freeze({ x: 15, y: -18, z: 3, rotation: 0.3 }),
    nearHand: Object.freeze({ x: 15, y: -15, z: 2, rotation: 0.12 }),
    farElbow: Object.freeze({ x: -15, y: -15, z: -3, rotation: -0.3 }),
    farHand: Object.freeze({ x: -20, y: -13, z: -2, rotation: -0.12 }),
  }),
  windup: Object.freeze({
    nearElbow: Object.freeze({ x: -10, y: -29, z: 5, rotation: -0.42 }),
    nearHand: Object.freeze({ x: -16, y: -23, z: 4, rotation: -0.3 }),
    farElbow: Object.freeze({ x: -9, y: -11, z: -3, rotation: 0.16 }),
    farHand: Object.freeze({ x: -14, y: -10, z: -2, rotation: 0.08 }),
  }),
  contact: Object.freeze({
    nearElbow: Object.freeze({ x: 22, y: 5, z: 5, rotation: 0.45 }),
    nearHand: Object.freeze({ x: 26, y: 1, z: 4, rotation: 0.2 }),
    farElbow: Object.freeze({ x: 8, y: -5, z: -3, rotation: -0.16 }),
    farHand: Object.freeze({ x: 11, y: -6, z: -2, rotation: -0.08 }),
  }),
  followThrough: Object.freeze({
    nearElbow: Object.freeze({ x: 24, y: 13, z: 4, rotation: 0.32 }),
    nearHand: Object.freeze({ x: 29, y: 8, z: 3, rotation: 0.12 }),
    farElbow: Object.freeze({ x: 3, y: -10, z: -3, rotation: -0.12 }),
    farHand: Object.freeze({ x: 7, y: -11, z: -2, rotation: -0.08 }),
  }),
});

function authoredRollFrame({
  id,
  at,
  transition,
  rootX = 0,
  rootY = 0,
  bodyLean = 0,
  headTilt = 0,
  rearFootX = -8,
  rearFootY = CHARACTER_FOOT_Y,
  leadFootX = 8,
  leadFootY = CHARACTER_FOOT_Y,
  depth = 0,
  capeLift = 0,
  armPose = 'neutral',
}) {
  const arm = AUTHORED_ARM_TRANSFORMS[armPose];
  if (!arm) throw new RangeError(`알 수 없는 authored arm pose입니다: ${armPose}`);
  const chestLength = 34;
  const headLength = 17;
  const chestX = Math.sin(bodyLean) * chestLength;
  const chestY = -Math.cos(bodyLean) * chestLength;
  const headX = Math.sin(headTilt) * headLength;
  const headY = -Math.cos(headTilt) * headLength;
  const pelvisY = 48;
  const hipY = 4;
  const kneeY = 12;
  const legBaseY = rootY + pelvisY + hipY + kneeY;
  const localRotation = Object.freeze({
    root: 0,
    pelvis: bodyLean * 0.18,
    chest: bodyLean * 0.72,
    neck: headTilt * 0.28,
    head: headTilt * 0.72,
    nearShoulder: -0.14,
    nearElbow: arm.nearElbow.rotation,
    nearHand: arm.nearHand.rotation,
    farShoulder: 0.14,
    farElbow: arm.farElbow.rotation,
    farHand: arm.farHand.rotation,
    nearHip: -bodyLean * 0.1,
    nearKnee: bodyLean * 0.12,
    nearFoot: 0,
    farHip: bodyLean * 0.1,
    farKnee: -bodyLean * 0.12,
    farFoot: 0,
  });
  const frame = Object.freeze({
    id,
    at,
    transition,
    capeLift,
    joints: Object.freeze(
      Object.fromEntries(
        Object.entries({
          root: { x: rootX, y: rootY, z: 0 },
          pelvis: { x: 0, y: pelvisY, z: 0 },
          chest: { x: chestX, y: chestY, z: depth },
          neck: { x: 1, y: -18, z: depth },
          head: { x: headX, y: headY, z: depth },
          nearShoulder: { x: 8, y: -5, z: 4 + depth },
          nearElbow: { x: arm.nearElbow.x, y: arm.nearElbow.y, z: arm.nearElbow.z + depth },
          nearHand: { x: arm.nearHand.x, y: arm.nearHand.y, z: arm.nearHand.z + depth },
          farShoulder: { x: -8, y: -5, z: -4 + depth },
          farElbow: { x: arm.farElbow.x, y: arm.farElbow.y, z: arm.farElbow.z + depth },
          farHand: { x: arm.farHand.x, y: arm.farHand.y, z: arm.farHand.z + depth },
          nearHip: { x: 8, y: hipY, z: 2 },
          nearKnee: { x: 0, y: kneeY, z: 1 },
          nearFoot: { x: leadFootX - 8, y: leadFootY - legBaseY, z: 0 },
          farHip: { x: -8, y: hipY, z: -2 },
          farKnee: { x: 0, y: kneeY, z: -1 },
          farFoot: { x: rearFootX + 8, y: rearFootY - legBaseY, z: 0 },
        }).map(([jointId, value]) => [
          jointId,
          Object.freeze({ ...value, rotation: localRotation[jointId] }),
        ]),
      ),
    ),
  });
  return Object.freeze({ ...frame, value: projectSideViewSkeletonFrame(frame) });
}

// This authored strip is a local 3D joint hierarchy. It is projected to 2D cutout anchors,
// never rendered as a 3D mesh or used by 2D collision authority.
const ROLL_POSE_FRAMES = Object.freeze([
  authoredRollFrame({
    id: 'roll-plant',
    at: 0,
    transition: 'hold',
    rootY: 5,
    bodyLean: 0.13,
    headTilt: -0.1,
    rearFootX: -16,
    leadFootX: 15,
    capeLift: 0.3,
  }),
  authoredRollFrame({
    id: 'roll-tuck',
    at: 0.14,
    transition: 'snap',
    rootX: 3,
    rootY: 14,
    bodyLean: 0.38,
    headTilt: -0.28,
    rearFootX: -11,
    rearFootY: 67,
    leadFootX: 12,
    leadFootY: 65,
    depth: 0.4,
    capeLift: 0.75,
  }),
  authoredRollFrame({
    id: 'roll-contact',
    at: 0.36,
    transition: 'linear',
    rootX: 7,
    rootY: 18,
    bodyLean: 0.82,
    headTilt: -0.58,
    rearFootX: -3,
    rearFootY: 60,
    leadFootX: 4,
    leadFootY: 58,
    depth: 1,
    capeLift: 1,
  }),
  authoredRollFrame({
    id: 'roll-unfold',
    at: 0.62,
    transition: 'linear',
    rootX: 9,
    rootY: 12,
    bodyLean: -0.62,
    headTilt: 0.42,
    rearFootX: -5,
    rearFootY: 59,
    leadFootX: 7,
    leadFootY: 63,
    depth: -1,
    capeLift: 0.94,
  }),
  authoredRollFrame({
    id: 'roll-recover',
    at: 0.84,
    transition: 'linear',
    rootX: 4,
    rootY: 4,
    bodyLean: -0.16,
    headTilt: 0.12,
    rearFootX: -15,
    rearFootY: 76,
    leadFootX: 16,
    leadFootY: 80,
    depth: -0.35,
    capeLift: 0.46,
  }),
  authoredRollFrame({
    at: 1,
    transition: 'hold',
    rootY: 0,
    bodyLean: 0.02,
    headTilt: 0,
    rearFootX: -9,
    leadFootX: 9,
    capeLift: 0.18,
  }),
]);

// These Player actions are pose strips, not a global bob/lean equation.  The fixed frames share
// the same local 3D skeleton and projection contract as the combat clips below.
const AUTHORED_PLAYER_UTILITY_FRAMES = Object.freeze({
  idle: Object.freeze([
    authoredRollFrame({ id: 'idle-rest', at: 0, transition: 'linear', capeLift: 0.12 }),
    authoredRollFrame({
      id: 'idle-breath',
      at: 0.5,
      transition: 'linear',
      rootY: -1,
      bodyLean: 0.025,
      headTilt: -0.02,
      capeLift: 0.18,
    }),
    authoredRollFrame({ id: 'idle-return', at: 1, transition: 'linear', capeLift: 0.12 }),
  ]),
  run: Object.freeze([
    authoredRollFrame({
      id: 'run-contact-near',
      at: 0,
      transition: 'linear',
      rootY: -1,
      bodyLean: 0.1,
      rearFootX: -24,
      leadFootX: 19,
      capeLift: 0.68,
    }),
    authoredRollFrame({
      id: 'run-pass',
      at: 0.25,
      transition: 'linear',
      rootY: -4,
      bodyLean: 0.13,
      rearFootX: -4,
      rearFootY: 65,
      leadFootX: 7,
      leadFootY: 71,
      capeLift: 0.88,
    }),
    authoredRollFrame({
      id: 'run-contact-far',
      at: 0.5,
      transition: 'linear',
      rootY: -1,
      bodyLean: 0.1,
      rearFootX: -19,
      leadFootX: 24,
      capeLift: 0.68,
    }),
    authoredRollFrame({
      id: 'run-recover',
      at: 0.75,
      transition: 'linear',
      rootY: -4,
      bodyLean: 0.13,
      rearFootX: -7,
      rearFootY: 71,
      leadFootX: 4,
      leadFootY: 65,
      capeLift: 0.88,
    }),
    authoredRollFrame({
      id: 'run-loop',
      at: 1,
      transition: 'linear',
      rootY: -1,
      bodyLean: 0.1,
      rearFootX: -24,
      leadFootX: 19,
      capeLift: 0.68,
    }),
  ]),
  jumpRise: Object.freeze([
    authoredRollFrame({
      id: 'jump-crouch',
      at: 0,
      transition: 'hold',
      rootY: 5,
      bodyLean: 0.13,
      rearFootX: -18,
      leadFootX: 17,
      capeLift: 0.32,
    }),
    authoredRollFrame({
      id: 'jump-rise',
      at: 1,
      transition: 'snap',
      rootX: 2,
      rootY: -6,
      bodyLean: 0.12,
      headTilt: -0.08,
      rearFootX: -14,
      rearFootY: 64,
      leadFootX: 13,
      leadFootY: 60,
      capeLift: 0.94,
    }),
  ]),
  jumpFall: Object.freeze([
    authoredRollFrame({
      id: 'fall-tuck',
      at: 0,
      transition: 'hold',
      rootX: 2,
      rootY: -5,
      bodyLean: 0.04,
      headTilt: 0.04,
      rearFootX: -13,
      rearFootY: 64,
      leadFootX: 14,
      leadFootY: 63,
      capeLift: 0.84,
    }),
    authoredRollFrame({
      id: 'fall-brace',
      at: 1,
      transition: 'linear',
      rootX: 1,
      rootY: -1,
      bodyLean: -0.08,
      headTilt: 0.08,
      rearFootX: -17,
      rearFootY: 75,
      leadFootX: 18,
      leadFootY: 72,
      capeLift: 0.62,
    }),
  ]),
  landing: Object.freeze([
    authoredRollFrame({
      id: 'landing-compress',
      at: 0,
      transition: 'hold',
      rootY: 7,
      bodyLean: 0.08,
      rearFootX: -15,
      leadFootX: 15,
      capeLift: 0.36,
    }),
    authoredRollFrame({
      id: 'landing-release',
      at: 1,
      transition: 'linear',
      rootY: 0,
      bodyLean: 0.02,
      rearFootX: -9,
      leadFootX: 9,
      capeLift: 0.18,
    }),
  ]),
  guard: Object.freeze([
    authoredRollFrame({
      id: 'guard-brace',
      at: 0,
      transition: 'linear',
      rootX: -3,
      rootY: 3,
      bodyLean: -0.12,
      headTilt: 0.05,
      rearFootX: -17,
      leadFootX: 15,
      capeLift: 0.2,
      armPose: 'windup',
    }),
    authoredRollFrame({
      id: 'guard-settle',
      at: 1,
      transition: 'linear',
      rootX: -2,
      rootY: 2,
      bodyLean: -0.09,
      headTilt: 0.03,
      rearFootX: -16,
      leadFootX: 14,
      capeLift: 0.16,
      armPose: 'windup',
    }),
  ]),
  hit: Object.freeze([
    authoredRollFrame({
      id: 'hit-contact',
      at: 0,
      transition: 'hold',
      rootX: -8,
      rootY: 4,
      bodyLean: -0.2,
      headTilt: 0.19,
      rearFootX: -16,
      leadFootX: 11,
      capeLift: 0.42,
      armPose: 'contact',
    }),
    authoredRollFrame({
      id: 'hit-recover',
      at: 1,
      transition: 'linear',
      rootX: -1,
      rootY: 1,
      bodyLean: -0.03,
      headTilt: 0.02,
      rearFootX: -10,
      leadFootX: 10,
      capeLift: 0.2,
    }),
  ]),
});

// Primary grounded attacks deliberately use the same local-3D, frame-authored format as roll.
// Combat owns timing/contact; these stable pose IDs only project that timeline into cutout joints.
const AUTHORED_COMBAT_POSE_FRAMES = Object.freeze({
  slash: Object.freeze([
    authoredRollFrame({
      id: 'slash-ready',
      at: 0,
      transition: 'hold',
      rootY: 1,
      bodyLean: -0.04,
      headTilt: 0.03,
      rearFootX: -14,
      leadFootX: 14,
      capeLift: 0.2,
      armPose: 'neutral',
    }),
    authoredRollFrame({
      id: 'slash-windup',
      at: 0.24,
      transition: 'hold',
      rootX: -5,
      rootY: 2,
      bodyLean: -0.22,
      headTilt: 0.1,
      rearFootX: -17,
      leadFootX: 11,
      depth: -0.55,
      capeLift: 0.46,
      armPose: 'windup',
    }),
    authoredRollFrame({
      id: 'slash-contact',
      at: 11 / 31,
      transition: 'snap',
      rootX: 8,
      rootY: 3,
      bodyLean: 0.18,
      headTilt: -0.12,
      rearFootX: -12,
      leadFootX: 20,
      depth: 0.75,
      capeLift: 0.88,
      armPose: 'contact',
    }),
    authoredRollFrame({
      id: 'slash-follow-through',
      at: 21 / 31,
      transition: 'linear',
      rootX: 11,
      rootY: 4,
      bodyLean: 0.29,
      headTilt: -0.16,
      rearFootX: -8,
      leadFootX: 23,
      depth: 0.45,
      capeLift: 0.75,
      armPose: 'followThrough',
    }),
    authoredRollFrame({
      id: 'slash-recover',
      at: 1,
      transition: 'linear',
      rootX: 1,
      rootY: 0,
      bodyLean: 0.02,
      headTilt: 0,
      rearFootX: -9,
      leadFootX: 9,
      capeLift: 0.18,
      armPose: 'neutral',
    }),
  ]),
  heavy: Object.freeze([
    authoredRollFrame({
      id: 'heavy-ready',
      at: 0,
      transition: 'hold',
      rootY: 2,
      bodyLean: -0.06,
      headTilt: 0.03,
      rearFootX: -16,
      leadFootX: 16,
      capeLift: 0.2,
      armPose: 'neutral',
    }),
    authoredRollFrame({
      id: 'heavy-load',
      at: 0.27,
      transition: 'hold',
      rootX: -8,
      rootY: 7,
      bodyLean: -0.34,
      headTilt: 0.17,
      rearFootX: -22,
      leadFootX: 10,
      depth: -0.7,
      capeLift: 0.58,
      armPose: 'windup',
    }),
    authoredRollFrame({
      id: 'heavy-contact',
      at: 16 / 46,
      transition: 'snap',
      rootX: 10,
      rootY: 10,
      bodyLean: 0.31,
      headTilt: -0.2,
      rearFootX: -12,
      leadFootX: 25,
      depth: 0.8,
      capeLift: 1,
      armPose: 'contact',
    }),
    authoredRollFrame({
      id: 'heavy-follow-through',
      at: 31 / 46,
      transition: 'linear',
      rootX: 13,
      rootY: 8,
      bodyLean: 0.43,
      headTilt: -0.22,
      rearFootX: -8,
      leadFootX: 26,
      depth: 0.42,
      capeLift: 0.86,
      armPose: 'followThrough',
    }),
    authoredRollFrame({
      id: 'heavy-recover',
      at: 1,
      transition: 'linear',
      rootX: 1,
      rootY: 0,
      bodyLean: 0.02,
      headTilt: 0,
      rearFootX: -9,
      leadFootX: 9,
      capeLift: 0.2,
      armPose: 'neutral',
    }),
  ]),
  rising: Object.freeze([
    authoredRollFrame({
      id: 'rising-ready',
      at: 0,
      transition: 'hold',
      rootY: 3,
      bodyLean: 0.08,
      headTilt: -0.04,
      rearFootX: -18,
      leadFootX: 13,
      capeLift: 0.3,
      armPose: 'neutral',
    }),
    authoredRollFrame({
      id: 'rising-load',
      at: 0.25,
      transition: 'hold',
      rootX: -4,
      rootY: 10,
      bodyLean: 0.3,
      headTilt: -0.13,
      rearFootX: -23,
      leadFootX: 7,
      depth: 0.55,
      capeLift: 0.66,
      armPose: 'windup',
    }),
    authoredRollFrame({
      id: 'rising-contact',
      at: 13 / 36,
      transition: 'snap',
      rootX: 6,
      rootY: -7,
      bodyLean: -0.27,
      headTilt: 0.15,
      rearFootX: -12,
      rearFootY: 70,
      leadFootX: 18,
      leadFootY: 67,
      depth: -0.72,
      capeLift: 0.98,
      armPose: 'contact',
    }),
    authoredRollFrame({
      id: 'rising-follow-through',
      at: 25 / 36,
      transition: 'linear',
      rootX: 8,
      rootY: -4,
      bodyLean: -0.19,
      headTilt: 0.1,
      rearFootX: -10,
      rearFootY: 69,
      leadFootX: 20,
      leadFootY: 70,
      depth: -0.36,
      capeLift: 0.78,
      armPose: 'followThrough',
    }),
    authoredRollFrame({
      id: 'rising-recover',
      at: 1,
      transition: 'linear',
      rootY: 0,
      bodyLean: 0.02,
      headTilt: 0,
      rearFootX: -9,
      leadFootX: 9,
      capeLift: 0.18,
      armPose: 'neutral',
    }),
  ]),
  shieldBash: Object.freeze([
    authoredRollFrame({
      id: 'counter-ready',
      at: 0,
      transition: 'hold',
      rootX: -3,
      rootY: 4,
      bodyLean: -0.15,
      headTilt: 0.06,
      rearFootX: -17,
      leadFootX: 15,
      depth: -0.3,
      capeLift: 0.18,
      armPose: 'neutral',
    }),
    authoredRollFrame({
      id: 'counter-load',
      at: 0.24,
      transition: 'hold',
      rootX: -8,
      rootY: 5,
      bodyLean: -0.26,
      headTilt: 0.12,
      rearFootX: -20,
      leadFootX: 12,
      depth: -0.6,
      capeLift: 0.36,
      armPose: 'windup',
    }),
    authoredRollFrame({
      id: 'counter-contact',
      at: 9 / 26,
      transition: 'snap',
      rootX: 14,
      rootY: 4,
      bodyLean: 0.26,
      headTilt: -0.1,
      rearFootX: -12,
      leadFootX: 27,
      depth: 0.72,
      capeLift: 0.76,
      armPose: 'contact',
    }),
    authoredRollFrame({
      id: 'counter-follow-through',
      at: 18 / 26,
      transition: 'linear',
      rootX: 12,
      rootY: 5,
      bodyLean: 0.16,
      headTilt: -0.06,
      rearFootX: -10,
      leadFootX: 24,
      depth: 0.34,
      capeLift: 0.54,
      armPose: 'followThrough',
    }),
    authoredRollFrame({
      id: 'counter-recover',
      at: 1,
      transition: 'linear',
      rootX: 1,
      rootY: 1,
      bodyLean: 0.02,
      headTilt: 0,
      rearFootX: -9,
      leadFootX: 9,
      capeLift: 0.18,
      armPose: 'neutral',
    }),
  ]),
});

const AUTHORED_COMBAT_FRAME_ANCHORS = Object.freeze({
  slash: Object.freeze({ contact: 11 / 31, followThrough: 21 / 31 }),
  heavy: Object.freeze({ contact: 16 / 46, followThrough: 31 / 46 }),
  rising: Object.freeze({ contact: 13 / 36, followThrough: 25 / 36 }),
  shieldBash: Object.freeze({ contact: 9 / 26, followThrough: 18 / 26 }),
});

function sampleAuthoredPoseFrames(frames, progress) {
  const boundedProgress = clamp(progress);
  const nextIndex = frames.findIndex((frame) => frame.at > boundedProgress);
  if (nextIndex <= 0) {
    const frame = frames.at(-1);
    return Object.freeze({ ...frame.value, frameId: frame.id ?? null });
  }
  const previous = frames[nextIndex - 1];
  const next = frames[nextIndex];
  if (next.transition === 'snap') return Object.freeze({ ...previous.value, frameId: previous.id });
  const amount = (boundedProgress - previous.at) / (next.at - previous.at);
  if (amount <= Number.EPSILON) return Object.freeze({ ...previous.value, frameId: previous.id });
  if (amount >= 1 - Number.EPSILON)
    return Object.freeze({ ...next.value, frameId: next.id ?? null });
  return Object.freeze({
    ...blendBonePose(previous.value, next.value, next.transition === 'hold' ? 0 : amount),
    frameId: previous.id,
  });
}

function sampleAuthoredCycle(frames, animationTime, rate) {
  const progress = (((animationTime * rate) % 1) + 1) % 1;
  return sampleAuthoredPoseFrames(frames, progress);
}

function sampleRoll(progress) {
  const sampled = sampleAuthoredPoseFrames(ROLL_POSE_FRAMES, progress);
  return Object.freeze({ ...sampled, rollMarker: rollTimelineMarkerAt(progress) });
}

function remapAuthoredCombatProgress(motionId, progress, frame) {
  const anchors = AUTHORED_COMBAT_FRAME_ANCHORS[motionId];
  const durationFrames = frame?.durationFrames ?? frame?.duration;
  const startupFrames = frame?.startupFrames ?? frame?.startupEnd;
  const activeFrames = frame?.activeFrames ?? frame?.activeEnd - startupFrames;
  if (
    !anchors ||
    !Number.isFinite(durationFrames) ||
    !Number.isFinite(startupFrames) ||
    !Number.isFinite(activeFrames) ||
    durationFrames <= 0
  ) {
    return progress;
  }
  const activeStart = startupFrames / durationFrames;
  const activeEnd = (startupFrames + activeFrames) / durationFrames;
  const bounded = clamp(progress);
  if (bounded <= activeStart) {
    return activeStart <= Number.EPSILON
      ? anchors.contact
      : (bounded / activeStart) * anchors.contact;
  }
  if (bounded <= activeEnd) {
    const span = Math.max(Number.EPSILON, activeEnd - activeStart);
    return (
      anchors.contact + ((bounded - activeStart) / span) * (anchors.followThrough - anchors.contact)
    );
  }
  const span = Math.max(Number.EPSILON, 1 - activeEnd);
  return anchors.followThrough + ((bounded - activeEnd) / span) * (1 - anchors.followThrough);
}

function sampleAuthoredCombat(motionState) {
  const frames = AUTHORED_COMBAT_POSE_FRAMES[motionState.id];
  return frames
    ? sampleAuthoredPoseFrames(
        frames,
        remapAuthoredCombatProgress(motionState.id, motionState.progress, motionState.frame),
      )
    : null;
}

function sampleCombat(motionState) {
  const authored = sampleAuthoredCombat(motionState);
  if (authored) return authored;
  const progress = clamp(motionState.progress);
  const action = Math.sin(progress * Math.PI);

  switch (motionState.id) {
    case 'slash':
      return pose({
        rootX: action * 3,
        rootY: action * 1.5,
        bodyLean: action * 0.035,
        headTilt: -action * 0.1,
        rearFootX: -13,
        leadFootX: 15 + action * 3,
        capeLift: 0.42 + action * 0.34,
      });
    case 'heavy':
      return pose({
        rootX: action * 2,
        rootY: action * 4,
        bodyLean: -0.035 + action * 0.025,
        headTilt: action * 0.075,
        rearFootX: -17,
        leadFootX: 17,
        capeLift: 0.3 + action * 0.25,
      });
    case 'thrust':
      return pose({
        rootX: action * 8,
        rootY: action,
        bodyLean: action * 0.085,
        headTilt: -action * 0.08,
        rearFootX: -15,
        leadFootX: 18 + action * 10,
        capeLift: 0.5 + action * 0.38,
      });
    case 'rising':
      return pose({
        rootX: action * 3,
        rootY: 5 - action * 7,
        bodyLean: -0.06 + action * 0.11,
        headTilt: -action * 0.12,
        rearFootX: -16,
        rearFootY: CHARACTER_FOOT_Y - action * 2,
        leadFootX: 15,
        leadFootY: CHARACTER_FOOT_Y - action * 5,
        capeLift: 0.56 + action * 0.32,
      });
    case 'spin': {
      const spinPhase = smoothStep(Math.max(0, Math.min(1, (progress - 0.08) / 0.8))) * Math.PI * 2;
      const yaw = Math.cos(spinPhase);
      const sweep = Math.sin(spinPhase);
      const hop = Math.sin(clamp(progress) * Math.PI);
      const depthEnvelope =
        smoothStep(clamp(progress / 0.14)) * smoothStep(clamp((1 - progress) / 0.14));
      return pose({
        rootX: sweep * 4,
        rootY: -hop * 12,
        bodyLean: sweep * 0.09,
        bodyScaleX: 0.72 + Math.abs(yaw) * 0.28,
        depthPhase: yaw * depthEnvelope,
        headTilt: -sweep * 0.12,
        rearFootX: -10 + sweep * 3,
        rearFootY: 63 - Math.max(0, yaw) * 3,
        leadFootX: 10 + sweep * 3,
        leadFootY: 63 - Math.max(0, -yaw) * 3,
        capeLift: 0.76 + hop * 0.24,
      });
    }
    case 'airSlash':
      return pose({
        rootX: action * 6,
        rootY: action * 4,
        bodyLean: action * 0.15,
        headTilt: -action * 0.12,
        rearFootX: -14,
        rearFootY: 65,
        leadFootX: 11,
        leadFootY: 60,
        capeLift: 0.88,
      });
    case 'airHeavy':
      return pose({
        rootX: action * 5,
        rootY: -1,
        bodyLean: action * 0.12,
        headTilt: -action * 0.09,
        rearFootX: -12,
        rearFootY: 64,
        leadFootX: 12,
        leadFootY: 60,
        capeLift: 0.92,
      });
    case 'airReturn':
      return pose({
        rootX: -action * 5,
        rootY: action * 5,
        bodyLean: -action * 0.14,
        headTilt: action * 0.11,
        rearFootX: -10,
        rearFootY: 61,
        leadFootX: 15,
        leadFootY: 67,
        capeLift: 0.9,
      });
    case 'airSpin':
      return pose({
        rootY: -3,
        bodyLean: progress * Math.PI * 2,
        headTilt: -progress * Math.PI * 2,
        rearFootX: -8,
        rearFootY: 62,
        leadFootX: 9,
        leadFootY: 60,
        capeLift: 1,
      });
    case 'airCross':
      return pose({
        rootX: action * 5,
        rootY: -1,
        bodyLean: -action * 0.12,
        headTilt: action * 0.1,
        rearFootX: -13,
        rearFootY: 61,
        leadFootX: 12,
        leadFootY: 66,
        capeLift: 0.9,
      });
    case 'shieldBash':
      return pose({
        rootX: action * 11,
        rootY: 2 + action,
        bodyLean: -0.06 + action * 0.2,
        headTilt: -action * 0.08,
        rearFootX: -17,
        leadFootX: 18 + action * 7,
        capeLift: 0.3 + action * 0.34,
      });
    default:
      return pose();
  }
}

function blendBonePose(previousPose, currentPose, amount) {
  const blendPoint = (key) =>
    point(
      previousPose[key].x + (currentPose[key].x - previousPose[key].x) * amount,
      previousPose[key].y + (currentPose[key].y - previousPose[key].y) * amount,
    );
  const projectedJoints =
    previousPose.projectedJoints && currentPose.projectedJoints
      ? Object.freeze(
          Object.fromEntries(
            Object.keys(previousPose.projectedJoints).map((jointId) => {
              const previousJoint = previousPose.projectedJoints[jointId];
              const currentJoint = currentPose.projectedJoints[jointId];
              return [
                jointId,
                Object.freeze({
                  x: previousJoint.x + (currentJoint.x - previousJoint.x) * amount,
                  y: previousJoint.y + (currentJoint.y - previousJoint.y) * amount,
                  depth: previousJoint.depth + (currentJoint.depth - previousJoint.depth) * amount,
                }),
              ];
            }),
          ),
        )
      : null;
  return Object.freeze({
    rootOffset: blendPoint('rootOffset'),
    bodyLean: previousPose.bodyLean + (currentPose.bodyLean - previousPose.bodyLean) * amount,
    bodyScaleX:
      previousPose.bodyScaleX + (currentPose.bodyScaleX - previousPose.bodyScaleX) * amount,
    depthPhase:
      previousPose.depthPhase + (currentPose.depthPhase - previousPose.depthPhase) * amount,
    headTilt: previousPose.headTilt + (currentPose.headTilt - previousPose.headTilt) * amount,
    rearFootTarget: blendPoint('rearFootTarget'),
    leadFootTarget: blendPoint('leadFootTarget'),
    capeLift: previousPose.capeLift + (currentPose.capeLift - previousPose.capeLift) * amount,
    ...(projectedJoints ? { projectedJoints } : {}),
  });
}

export function sampleCharacterBonePose({
  animationTime = 0,
  movementIntent = 0,
  isGrounded = true,
  verticalVelocity = 0,
  rollProgress = null,
  landingRecovery = 0,
  hitstunProgress = 0,
  blockstunProgress = 0,
  blockStrength = 0,
  knockedOut = false,
  motionState = Object.freeze({ id: 'idle', progress: 0 }),
} = {}) {
  if (Number.isFinite(rollProgress)) return sampleRoll(rollProgress);
  if (knockedOut || hitstunProgress > 0) return sampleHitReaction(hitstunProgress, knockedOut);
  if (blockstunProgress > 0) return sampleBlockReaction(blockstunProgress, blockStrength);
  if (motionState.id === 'guard') return sampleGuard(animationTime);
  if (motionState.id !== 'idle') {
    const currentPose = sampleCombat(motionState);
    if (!motionState.transitionFrom) return currentPose;
    const previousPose = sampleCombat(motionState.transitionFrom);
    return blendBonePose(
      previousPose,
      currentPose,
      smoothStep(motionState.transitionProgress ?? 1),
    );
  }
  if (!isGrounded) return sampleAirborne(verticalVelocity);
  if (landingRecovery > 0) return sampleLanding(landingRecovery);
  if (movementIntent !== 0) return sampleMovement(animationTime);
  return sampleIdle(animationTime);
}
