import {
  interpolateSideViewSkeletonFrames,
  projectSideViewSkeletonFrame,
} from './SkeletonPoseProjection.js';
import { authorPlayerRigFrame } from './PlayerRig.js';
import { createForwardRollFrames } from './ForwardRollClip.js';
import { rollTimelineMarkerAt } from './RollTimeline.js';
import { PLAYER_MOTION_PROFILE } from './PlayerMotionProfile.js';
import { quaternionFromEuler, multiplyQuaternions, conjugateQuaternion } from './Quaternion.js';

const CHARACTER_FOOT_Y = 82;
const REFERENCE_JUMP_SPEED = PLAYER_MOTION_PROFILE.jumpSpeed;
function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothStep(value) {
  const bounded = clamp(value);
  return bounded * bounded * (3 - 2 * bounded);
}

function sampleIdle(animationTime) {
  return sampleAuthoredCycle(
    AUTHORED_PLAYER_UTILITY_FRAMES.idle,
    animationTime,
    PLAYER_MOTION_PROFILE.poseCyclesPerSecond.idle,
  );
}

function sampleMovement(animationTime) {
  return sampleAuthoredCycle(
    AUTHORED_PLAYER_UTILITY_FRAMES.run,
    animationTime,
    PLAYER_MOTION_PROFILE.poseCyclesPerSecond.run,
  );
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
  return sampleAuthoredCycle(
    AUTHORED_PLAYER_UTILITY_FRAMES.guard,
    animationTime,
    PLAYER_MOTION_PROFILE.poseCyclesPerSecond.guard,
  );
}

function sampleBlockReaction(progress, strength) {
  const recoil = smoothStep(progress) * clamp(strength, 0.4, 1);
  return sampleAuthoredPoseFrames(AUTHORED_BLOCK_FRAMES, recoil);
}

function sampleLanding(recovery) {
  return sampleAuthoredPoseFrames(AUTHORED_PLAYER_UTILITY_FRAMES.landing, clamp(recovery));
}

function sampleHitReaction(intensity, knockedOut) {
  return knockedOut
    ? KNOCKED_OUT_FRAME.value
    : sampleAuthoredPoseFrames(AUTHORED_PLAYER_UTILITY_FRAMES.hit, clamp(intensity));
}

function authoredCharacterFrame(options) {
  if (!/^(slash-|heavy-|air-(?:slash|heavy|return|cross)-)/.test(options.id))
    return authorPlayerRigFrame(options);
  const groundedCut = /^(?:slash|heavy)-/.test(options.id);
  const phase =
    groundedCut && options.id.endsWith('-ready')
      ? 'ready'
      : /(?:windup|load)$/.test(options.id)
        ? 'load'
        : options.id.endsWith('contact')
          ? 'contact'
          : options.id.endsWith('follow-through')
            ? 'followThrough'
            : 'settle';
  const yaw = (
    groundedCut
      ? { ready: 0.22, load: 0.52, contact: -0.28, followThrough: -0.68, settle: 0 }
      : { ready: 0, load: 0.85, contact: 0.25, followThrough: -0.6, settle: 0 }
  )[phase];
  // Grounded cuts keep the broad blade visible while it travels below the head:
  // ready -> low rear load -> fast cross-body contact -> weighted follow-through.
  // The previous >90deg depth yaw made the blade collapse edge-on and then flip
  // backwards before contact, which read as a pop rather than a continuous cut.
  const bladeAngle = (
    groundedCut
      ? options.id.startsWith('heavy-')
        ? { ready: 0.38, load: 0.5, contact: -0.42, followThrough: 0.72, settle: 0.35 }
        : { ready: 0.32, load: 0.44, contact: -0.08, followThrough: 0.62, settle: 0.35 }
      : { ready: 0.35, load: 0.2, contact: 0.2, followThrough: 0.3, settle: 0.35 }
  )[phase];
  const bladeYaw = (
    groundedCut
      ? { ready: -0.24, load: -0.36, contact: 0.04, followThrough: 0.42, settle: 0 }
      : { ready: 0, load: 2.35, contact: 1.9, followThrough: -0.55, settle: 0 }
  )[phase];
  const handTarget = (
    groundedCut
      ? {
          ready: { x: options.id.startsWith('heavy-') ? -8 : -6, y: 10 },
          load: { x: options.id.startsWith('heavy-') ? -22 : -18, y: 5 },
          contact: { x: options.id.startsWith('heavy-') ? 13 : 11, y: 4 },
          followThrough: { x: options.id.startsWith('heavy-') ? 40 : 38, y: 14 },
        }
      : {
          load: { x: -12, y: 3 },
          contact: { x: 8, y: 5 },
          followThrough: { x: 35, y: 15 },
        }
  )[phase];
  // Main cuts load beside the ribs and travel across the body in XYZ. The shoulder
  // and wrist remain local joints; no overhead arm target or screen-space blade turn.
  const frame = authorPlayerRigFrame({
    ...options,
    depth: 0,
    armPose:
      phase === 'load' || (phase === 'ready' && groundedCut) ? 'followThrough' : options.armPose,
    wristFlex: bladeAngle,
    nearHandTarget: handTarget,
  });
  const joints = {
    ...frame.joints,
    pelvis: Object.freeze({
      ...frame.joints.pelvis,
      quaternion: multiplyQuaternions(
        frame.joints.pelvis.quaternion,
        quaternionFromEuler({ y: -yaw * 0.25 }),
      ),
    }),
    chest: Object.freeze({
      ...frame.joints.chest,
      quaternion: multiplyQuaternions(
        frame.joints.chest.quaternion,
        quaternionFromEuler({ y: yaw * 1.25 }),
      ),
    }),
  };
  const posed = projectSideViewSkeletonFrame({ ...frame, joints });
  joints.nearHand = Object.freeze({
    ...joints.nearHand,
    quaternion: multiplyQuaternions(
      conjugateQuaternion(posed.worldJoints.nearElbow.quaternion),
      quaternionFromEuler({ y: bladeYaw, z: bladeAngle }),
    ),
  });
  const authored = Object.freeze({ ...frame, joints: Object.freeze(joints) });
  return Object.freeze({
    ...authored,
    value: Object.freeze({
      ...projectSideViewSkeletonFrame(authored),
      frameId: options.id,
    }),
  });
}
const AUTHORED_BLOCK_FRAMES = Object.freeze(
  [0, 1].map((recoil) =>
    authoredCharacterFrame({
      id: `block-recoil-${recoil}`,
      at: recoil,
      transition: 'linear',
      rootX: -2 - recoil * 6,
      rootY: 3 + recoil * 2,
      bodyLean: -0.075 - recoil * 0.11,
      headTilt: 0.045 + recoil * 0.08,
      rearFootX: -16 - recoil * 3,
      rearFootY: CHARACTER_FOOT_Y,
      leadFootX: 15,
      leadFootY: CHARACTER_FOOT_Y - recoil * 2,
      capeLift: 0.18 + recoil * 0.35,
    }),
  ),
);
const KNOCKED_OUT_FRAME = authoredCharacterFrame({
  id: 'knocked-out',
  at: 0,
  rootX: -6,
  rootY: 14,
  bodyLean: 1.18,
  headTilt: -0.42,
  rearFootX: -15,
  rearFootY: 76,
  leadFootX: 18,
  leadFootY: 78,
});

const ROLL_POSE_FRAMES = createForwardRollFrames(
  authoredCharacterFrame({ id: 'roll-neutral', at: 0 }),
);

// These Player actions are pose strips, not a global bob/lean equation.  The fixed frames share
// the same local 3D skeleton and projection contract as the combat clips below.
const AUTHORED_PLAYER_UTILITY_FRAMES = Object.freeze({
  idle: Object.freeze([
    authoredCharacterFrame({ id: 'idle-rest', at: 0, transition: 'linear', capeLift: 0.12 }),
    authoredCharacterFrame({
      id: 'idle-breath',
      at: 0.5,
      transition: 'linear',
      rootY: -1,
      bodyLean: 0.025,
      headTilt: -0.02,
      capeLift: 0.18,
    }),
    authoredCharacterFrame({ id: 'idle-return', at: 1, transition: 'linear', capeLift: 0.12 }),
  ]),
  run: Object.freeze([
    authoredCharacterFrame({
      id: 'run-contact-near',
      at: 0,
      transition: 'linear',
      rootY: -1,
      bodyLean: 0.1,
      rearFootX: -24,
      leadFootX: 19,
      capeLift: 0.68,
    }),
    authoredCharacterFrame({
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
    authoredCharacterFrame({
      id: 'run-contact-far',
      at: 0.5,
      transition: 'linear',
      rootY: -1,
      bodyLean: 0.1,
      rearFootX: -19,
      leadFootX: 24,
      capeLift: 0.68,
    }),
    authoredCharacterFrame({
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
    authoredCharacterFrame({
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
    authoredCharacterFrame({
      id: 'jump-crouch',
      at: 0,
      transition: 'linear',
      rootY: 5,
      bodyLean: 0.13,
      rearFootX: -18,
      leadFootX: 17,
      capeLift: 0.32,
    }),
    authoredCharacterFrame({
      id: 'jump-rise',
      at: 1,
      transition: 'linear',
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
    authoredCharacterFrame({
      id: 'fall-tuck',
      at: 0,
      transition: 'linear',
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
    authoredCharacterFrame({
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
    authoredCharacterFrame({
      id: 'landing-compress',
      at: 0,
      transition: 'linear',
      rootY: 7,
      bodyLean: 0.08,
      rearFootX: -15,
      leadFootX: 15,
      capeLift: 0.36,
    }),
    authoredCharacterFrame({
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
    authoredCharacterFrame({
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
    authoredCharacterFrame({
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
    authoredCharacterFrame({
      id: 'hit-contact',
      at: 0,
      transition: 'linear',
      rootX: -8,
      rootY: 4,
      bodyLean: -0.2,
      headTilt: 0.19,
      rearFootX: -16,
      leadFootX: 11,
      capeLift: 0.42,
      armPose: 'contact',
    }),
    authoredCharacterFrame({
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
    authoredCharacterFrame({
      id: 'slash-ready',
      at: 0,
      transition: 'linear',
      rootY: 1,
      bodyLean: -0.04,
      headTilt: 0.03,
      rearFootX: -14,
      leadFootX: 14,
      capeLift: 0.2,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'slash-windup',
      at: 0.24,
      transition: 'linear',
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
    authoredCharacterFrame({
      id: 'slash-contact',
      wristFlex: -1.3,
      at: 11 / 31,
      transition: 'linear',
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
    authoredCharacterFrame({
      id: 'slash-follow-through',
      wristFlex: 0.25,
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
    authoredCharacterFrame({
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
    authoredCharacterFrame({
      id: 'heavy-ready',
      at: 0,
      transition: 'linear',
      rootY: 2,
      bodyLean: -0.06,
      headTilt: 0.03,
      rearFootX: -16,
      leadFootX: 16,
      capeLift: 0.2,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'heavy-load',
      at: 0.27,
      transition: 'linear',
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
    authoredCharacterFrame({
      id: 'heavy-contact',
      wristFlex: -1.3,
      at: 16 / 46,
      transition: 'linear',
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
    authoredCharacterFrame({
      id: 'heavy-follow-through',
      wristFlex: 0.25,
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
    authoredCharacterFrame({
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
    authoredCharacterFrame({
      id: 'rising-ready',
      at: 0,
      transition: 'linear',
      rootY: 3,
      bodyLean: 0.08,
      headTilt: -0.04,
      rearFootX: -18,
      leadFootX: 13,
      capeLift: 0.3,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'rising-load',
      at: 0.25,
      transition: 'linear',
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
    authoredCharacterFrame({
      id: 'rising-contact',
      wristFlex: 0.35,
      at: 13 / 36,
      transition: 'linear',
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
    authoredCharacterFrame({
      id: 'rising-follow-through',
      wristFlex: -1.7,
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
    authoredCharacterFrame({
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
    authoredCharacterFrame({
      id: 'counter-ready',
      at: 0,
      transition: 'linear',
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
    authoredCharacterFrame({
      id: 'counter-load',
      at: 0.24,
      transition: 'linear',
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
    authoredCharacterFrame({
      id: 'counter-contact',
      at: 9 / 26,
      transition: 'linear',
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
    authoredCharacterFrame({
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
    authoredCharacterFrame({
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
  thrust: Object.freeze([
    authoredCharacterFrame({
      id: 'thrust-ready',
      at: 0,
      transition: 'linear',
      rootY: 1,
      bodyLean: -0.03,
      headTilt: 0.02,
      rearFootX: -15,
      leadFootX: 15,
      capeLift: 0.2,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'thrust-load',
      at: 0.24,
      transition: 'linear',
      rootX: -6,
      rootY: 2,
      bodyLean: -0.2,
      headTilt: 0.09,
      rearFootX: -18,
      leadFootX: 10,
      depth: -0.5,
      capeLift: 0.4,
      armPose: 'windup',
    }),
    authoredCharacterFrame({
      id: 'thrust-contact',
      at: 9 / 25,
      transition: 'linear',
      rootX: 12,
      rootY: 2,
      bodyLean: 0.22,
      headTilt: -0.1,
      rearFootX: -10,
      leadFootX: 24,
      depth: 0.7,
      capeLift: 0.82,
      armPose: 'contact',
    }),
    authoredCharacterFrame({
      id: 'thrust-follow-through',
      at: 16 / 25,
      transition: 'linear',
      rootX: 13,
      rootY: 3,
      bodyLean: 0.3,
      headTilt: -0.14,
      rearFootX: -7,
      leadFootX: 25,
      depth: 0.4,
      capeLift: 0.7,
      armPose: 'followThrough',
    }),
    authoredCharacterFrame({
      id: 'thrust-recover',
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
  spin: Object.freeze([
    authoredCharacterFrame({
      id: 'spin-ready',
      at: 0,
      transition: 'linear',
      rootY: 2,
      bodyLean: -0.05,
      headTilt: 0.02,
      rearFootX: -15,
      leadFootX: 15,
      capeLift: 0.24,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'spin-windup',
      at: 0.22,
      transition: 'linear',
      rootX: -7,
      rootY: 4,
      bodyLean: -0.28,
      headTilt: 0.14,
      rearFootX: -20,
      leadFootX: 11,
      depth: -0.7,
      capeLift: 0.55,
      armPose: 'windup',
    }),
    authoredCharacterFrame({
      id: 'spin-contact',
      at: 17 / 49,
      transition: 'linear',
      rootX: 6,
      rootY: 1,
      bodyLean: 0.14,
      headTilt: -0.08,
      rearFootX: -13,
      leadFootX: 22,
      depth: 0.8,
      capeLift: 0.95,
      armPose: 'contact',
    }),
    authoredCharacterFrame({
      id: 'spin-follow-through',
      at: 33 / 49,
      transition: 'linear',
      rootX: -4,
      rootY: 3,
      bodyLean: -0.12,
      headTilt: 0.06,
      rearFootX: -18,
      leadFootX: 14,
      depth: -0.45,
      capeLift: 0.8,
      armPose: 'followThrough',
    }),
    authoredCharacterFrame({
      id: 'spin-recover',
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
  airSlash: Object.freeze([
    authoredCharacterFrame({
      id: 'air-slash-ready',
      at: 0,
      transition: 'linear',
      rootX: 1,
      rootY: -4,
      bodyLean: 0.06,
      headTilt: -0.03,
      rearFootX: -13,
      rearFootY: 64,
      leadFootX: 13,
      leadFootY: 62,
      capeLift: 0.85,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'air-slash-windup',
      at: 0.22,
      transition: 'linear',
      rootX: -4,
      rootY: -5,
      bodyLean: -0.18,
      headTilt: 0.08,
      rearFootX: -15,
      rearFootY: 65,
      leadFootX: 10,
      leadFootY: 63,
      depth: -0.5,
      capeLift: 0.9,
      armPose: 'windup',
    }),
    authoredCharacterFrame({
      id: 'air-slash-contact',
      wristFlex: -1.3,
      at: 9 / 25,
      transition: 'linear',
      rootX: 9,
      rootY: -3,
      bodyLean: 0.2,
      headTilt: -0.11,
      rearFootX: -11,
      rearFootY: 62,
      leadFootX: 21,
      leadFootY: 60,
      depth: 0.72,
      capeLift: 1,
      armPose: 'contact',
    }),
    authoredCharacterFrame({
      id: 'air-slash-follow-through',
      wristFlex: 0.25,
      at: 16 / 25,
      transition: 'linear',
      rootX: 11,
      rootY: -2,
      bodyLean: 0.28,
      headTilt: -0.14,
      rearFootX: -8,
      rearFootY: 63,
      leadFootX: 23,
      leadFootY: 61,
      depth: 0.4,
      capeLift: 0.9,
      armPose: 'followThrough',
    }),
    authoredCharacterFrame({
      id: 'air-slash-recover',
      at: 1,
      transition: 'linear',
      rootX: 1,
      rootY: -4,
      bodyLean: 0.05,
      headTilt: -0.02,
      rearFootX: -12,
      rearFootY: 64,
      leadFootX: 12,
      leadFootY: 62,
      capeLift: 0.85,
      armPose: 'neutral',
    }),
  ]),
  airHeavy: Object.freeze([
    authoredCharacterFrame({
      id: 'air-heavy-ready',
      at: 0,
      transition: 'linear',
      rootX: 0,
      rootY: -5,
      bodyLean: -0.05,
      headTilt: 0.02,
      rearFootX: -14,
      rearFootY: 64,
      leadFootX: 14,
      leadFootY: 62,
      capeLift: 0.85,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'air-heavy-load',
      at: 0.26,
      transition: 'linear',
      rootX: -6,
      rootY: -7,
      bodyLean: -0.3,
      headTilt: 0.14,
      rearFootX: -18,
      rearFootY: 66,
      leadFootX: 9,
      leadFootY: 63,
      depth: -0.65,
      capeLift: 0.92,
      armPose: 'windup',
    }),
    authoredCharacterFrame({
      id: 'air-heavy-contact',
      wristFlex: -1.3,
      at: 11 / 30,
      transition: 'linear',
      rootX: 10,
      rootY: 2,
      bodyLean: 0.3,
      headTilt: -0.16,
      rearFootX: -10,
      rearFootY: 62,
      leadFootX: 24,
      leadFootY: 60,
      depth: 0.78,
      capeLift: 1,
      armPose: 'contact',
    }),
    authoredCharacterFrame({
      id: 'air-heavy-follow-through',
      wristFlex: 0.25,
      at: 20 / 30,
      transition: 'linear',
      rootX: 12,
      rootY: 4,
      bodyLean: 0.4,
      headTilt: -0.2,
      rearFootX: -7,
      rearFootY: 63,
      leadFootX: 25,
      leadFootY: 61,
      depth: 0.4,
      capeLift: 0.9,
      armPose: 'followThrough',
    }),
    authoredCharacterFrame({
      id: 'air-heavy-recover',
      at: 1,
      transition: 'linear',
      rootX: 1,
      rootY: -4,
      bodyLean: 0.05,
      headTilt: -0.02,
      rearFootX: -12,
      rearFootY: 64,
      leadFootX: 12,
      leadFootY: 62,
      capeLift: 0.85,
      armPose: 'neutral',
    }),
  ]),
  airReturn: Object.freeze([
    authoredCharacterFrame({
      id: 'air-return-ready',
      at: 0,
      transition: 'linear',
      rootX: 2,
      rootY: -3,
      bodyLean: 0.1,
      headTilt: -0.05,
      rearFootX: -12,
      rearFootY: 63,
      leadFootX: 14,
      leadFootY: 61,
      capeLift: 0.88,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'air-return-load',
      at: 0.22,
      transition: 'linear',
      rootX: 7,
      rootY: -2,
      bodyLean: 0.24,
      headTilt: -0.12,
      rearFootX: -10,
      rearFootY: 62,
      leadFootX: 18,
      leadFootY: 60,
      depth: 0.55,
      capeLift: 0.92,
      armPose: 'contact',
    }),
    authoredCharacterFrame({
      id: 'air-return-contact',
      wristFlex: -1.3,
      at: 8 / 24,
      transition: 'linear',
      rootX: -7,
      rootY: 0,
      bodyLean: -0.24,
      headTilt: 0.12,
      rearFootX: -17,
      rearFootY: 65,
      leadFootX: 8,
      leadFootY: 62,
      depth: -0.68,
      capeLift: 1,
      armPose: 'windup',
    }),
    authoredCharacterFrame({
      id: 'air-return-follow-through',
      wristFlex: 0.25,
      at: 15 / 24,
      transition: 'linear',
      rootX: -9,
      rootY: 1,
      bodyLean: -0.32,
      headTilt: 0.15,
      rearFootX: -19,
      rearFootY: 66,
      leadFootX: 6,
      leadFootY: 63,
      depth: -0.4,
      capeLift: 0.9,
      armPose: 'followThrough',
    }),
    authoredCharacterFrame({
      id: 'air-return-recover',
      at: 1,
      transition: 'linear',
      rootX: 1,
      rootY: -4,
      bodyLean: 0.05,
      headTilt: -0.02,
      rearFootX: -12,
      rearFootY: 64,
      leadFootX: 12,
      leadFootY: 62,
      capeLift: 0.85,
      armPose: 'neutral',
    }),
  ]),
  airSpin: Object.freeze([
    authoredCharacterFrame({
      id: 'air-spin-ready',
      at: 0,
      transition: 'linear',
      rootX: 0,
      rootY: -5,
      bodyLean: 0.04,
      headTilt: -0.02,
      rearFootX: -13,
      rearFootY: 64,
      leadFootX: 13,
      leadFootY: 62,
      capeLift: 0.88,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'air-spin-windup',
      at: 0.2,
      transition: 'linear',
      rootX: -5,
      rootY: -6,
      bodyLean: -0.22,
      headTilt: 0.1,
      rearFootX: -16,
      rearFootY: 65,
      leadFootX: 10,
      leadFootY: 63,
      depth: -0.6,
      capeLift: 0.94,
      armPose: 'windup',
    }),
    authoredCharacterFrame({
      id: 'air-spin-contact',
      at: 14 / 41,
      transition: 'linear',
      rootX: 5,
      rootY: -4,
      bodyLean: 0.16,
      headTilt: -0.08,
      rearFootX: -12,
      rearFootY: 63,
      leadFootX: 20,
      leadFootY: 60,
      depth: 0.78,
      capeLift: 1,
      armPose: 'contact',
    }),
    authoredCharacterFrame({
      id: 'air-spin-follow-through',
      at: 28 / 41,
      transition: 'linear',
      rootX: -3,
      rootY: -3,
      bodyLean: -0.14,
      headTilt: 0.07,
      rearFootX: -16,
      rearFootY: 64,
      leadFootX: 13,
      leadFootY: 61,
      depth: -0.42,
      capeLift: 0.92,
      armPose: 'followThrough',
    }),
    authoredCharacterFrame({
      id: 'air-spin-recover',
      at: 1,
      transition: 'linear',
      rootX: 1,
      rootY: -4,
      bodyLean: 0.05,
      headTilt: -0.02,
      rearFootX: -12,
      rearFootY: 64,
      leadFootX: 12,
      leadFootY: 62,
      capeLift: 0.85,
      armPose: 'neutral',
    }),
  ]),
  airCross: Object.freeze([
    authoredCharacterFrame({
      id: 'air-cross-ready',
      at: 0,
      transition: 'linear',
      rootX: 1,
      rootY: -4,
      bodyLean: 0.08,
      headTilt: -0.04,
      rearFootX: -13,
      rearFootY: 64,
      leadFootX: 13,
      leadFootY: 62,
      capeLift: 0.88,
      armPose: 'neutral',
    }),
    authoredCharacterFrame({
      id: 'air-cross-load',
      at: 0.24,
      transition: 'linear',
      rootX: 6,
      rootY: -3,
      bodyLean: 0.22,
      headTilt: -0.1,
      rearFootX: -11,
      rearFootY: 63,
      leadFootX: 17,
      leadFootY: 60,
      depth: 0.5,
      capeLift: 0.92,
      armPose: 'contact',
    }),
    authoredCharacterFrame({
      id: 'air-cross-contact',
      wristFlex: -1.3,
      at: 11 / 30,
      transition: 'linear',
      rootX: 7,
      rootY: -6,
      bodyLean: -0.26,
      headTilt: 0.13,
      rearFootX: -12,
      rearFootY: 65,
      leadFootX: 18,
      leadFootY: 62,
      depth: -0.7,
      capeLift: 1,
      armPose: 'windup',
    }),
    authoredCharacterFrame({
      id: 'air-cross-follow-through',
      wristFlex: 0.25,
      at: 20 / 30,
      transition: 'linear',
      rootX: 8,
      rootY: -4,
      bodyLean: -0.18,
      headTilt: 0.09,
      rearFootX: -10,
      rearFootY: 64,
      leadFootX: 20,
      leadFootY: 61,
      depth: -0.36,
      capeLift: 0.9,
      armPose: 'followThrough',
    }),
    authoredCharacterFrame({
      id: 'air-cross-recover',
      at: 1,
      transition: 'linear',
      rootX: 1,
      rootY: -4,
      bodyLean: 0.05,
      headTilt: -0.02,
      rearFootX: -12,
      rearFootY: 64,
      leadFootX: 12,
      leadFootY: 62,
      capeLift: 0.85,
      armPose: 'neutral',
    }),
  ]),
});

const AUTHORED_COMBAT_FRAME_ANCHORS = Object.freeze({
  slash: Object.freeze({ contact: 11 / 31, followThrough: 21 / 31 }),
  heavy: Object.freeze({ contact: 16 / 46, followThrough: 31 / 46 }),
  rising: Object.freeze({ contact: 13 / 36, followThrough: 25 / 36 }),
  shieldBash: Object.freeze({ contact: 9 / 26, followThrough: 18 / 26 }),
  thrust: Object.freeze({ contact: 9 / 25, followThrough: 16 / 25 }),
  spin: Object.freeze({ contact: 17 / 49, followThrough: 33 / 49 }),
  airSlash: Object.freeze({ contact: 9 / 25, followThrough: 16 / 25 }),
  airHeavy: Object.freeze({ contact: 11 / 30, followThrough: 20 / 30 }),
  airReturn: Object.freeze({ contact: 8 / 24, followThrough: 15 / 24 }),
  airSpin: Object.freeze({ contact: 14 / 41, followThrough: 28 / 41 }),
  airCross: Object.freeze({ contact: 11 / 30, followThrough: 20 / 30 }),
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
  const localFrame = interpolateSideViewSkeletonFrames(
    previous,
    next,
    next.transition === 'hold' ? 0 : amount,
  );
  return Object.freeze({ ...projectSideViewSkeletonFrame(localFrame), frameId: previous.id });
}

function sampleAuthoredCycle(frames, animationTime, rate) {
  const progress = (((animationTime * rate) % 1) + 1) % 1;
  return sampleAuthoredPoseFrames(frames, progress);
}

function sampleRoll(progress) {
  const sampled = sampleAuthoredPoseFrames(ROLL_POSE_FRAMES, progress);
  return Object.freeze({
    ...sampled,
    rollMarker: rollTimelineMarkerAt(progress),
  });
}

function remapAuthoredCombatProgress(motionId, progress, frame) {
  const anchors = AUTHORED_COMBAT_FRAME_ANCHORS[motionId];
  const durationFrames = frame?.durationFrames ?? frame?.duration;
  const startupFrames = frame?.startupFrames ?? frame?.startupEnd;
  const activeFrames = frame?.activeFrames ?? frame?.activeEnd - startupFrames;
  if (!anchors) return progress;
  const timed =
    Number.isFinite(durationFrames) &&
    durationFrames > 0 &&
    Number.isFinite(startupFrames) &&
    Number.isFinite(activeFrames);
  const activeStart = timed ? startupFrames / durationFrames : anchors.contact;
  const activeEnd = timed ? (startupFrames + activeFrames) / durationFrames : anchors.followThrough;
  const bounded = clamp(progress);
  if (bounded <= activeStart) {
    return activeStart <= Number.EPSILON
      ? anchors.contact
      : (bounded / activeStart) * anchors.contact;
  }
  if (bounded <= activeEnd) {
    const span = Math.max(Number.EPSILON, activeEnd - activeStart);
    const phase = (bounded - activeStart) / span;
    // Commit most of a cut early, then let its weight settle. Spinning multi-hit
    // actions keep their sustained angular travel across the active interval.
    const travel = ['spin', 'airSpin'].includes(motionId) ? phase : 1 - (1 - phase) ** 3;
    return anchors.contact + travel * (anchors.followThrough - anchors.contact);
  }
  const span = Math.max(Number.EPSILON, 1 - activeEnd);
  return (
    anchors.followThrough + smoothStep((bounded - activeEnd) / span) * (1 - anchors.followThrough)
  );
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
  if (!authored) throw new RangeError(`Unknown authored motion: ${motionState.id}`);
  return authored;
}

function blendBonePose(previousPose, currentPose, amount) {
  return Object.freeze({
    ...projectSideViewSkeletonFrame(
      interpolateSideViewSkeletonFrames(
        previousPose.skeletonFrame,
        currentPose.skeletonFrame,
        amount,
      ),
    ),
    frameId: currentPose.frameId,
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
