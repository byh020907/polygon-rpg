import { projectSideViewSkeletonFrame } from './SkeletonPoseProjection.js';

const ENEMY_FOOT_Y = 78;

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

const ENEMY_ARM_POSES = Object.freeze({
  neutral: Object.freeze({
    nearElbow: Object.freeze({ x: 14, y: -16, z: 3, rotation: 0.28 }),
    nearHand: Object.freeze({ x: 14, y: -13, z: 2, rotation: 0.1 }),
    farElbow: Object.freeze({ x: -14, y: -13, z: -3, rotation: -0.28 }),
    farHand: Object.freeze({ x: -19, y: -11, z: -2, rotation: -0.1 }),
  }),
  windup: Object.freeze({
    nearElbow: Object.freeze({ x: -11, y: -27, z: 5, rotation: -0.4 }),
    nearHand: Object.freeze({ x: -17, y: -21, z: 4, rotation: -0.28 }),
    farElbow: Object.freeze({ x: -8, y: -9, z: -3, rotation: 0.15 }),
    farHand: Object.freeze({ x: -13, y: -8, z: -2, rotation: 0.07 }),
  }),
  contact: Object.freeze({
    nearElbow: Object.freeze({ x: 21, y: 4, z: 5, rotation: 0.42 }),
    nearHand: Object.freeze({ x: 25, y: 0, z: 4, rotation: 0.18 }),
    farElbow: Object.freeze({ x: 7, y: -4, z: -3, rotation: -0.15 }),
    farHand: Object.freeze({ x: 10, y: -5, z: -2, rotation: -0.07 }),
  }),
  brace: Object.freeze({
    nearElbow: Object.freeze({ x: 9, y: -19, z: 5, rotation: -0.5 }),
    nearHand: Object.freeze({ x: 12, y: -14, z: 4, rotation: -0.42 }),
    farElbow: Object.freeze({ x: -6, y: -16, z: -3, rotation: 0.42 }),
    farHand: Object.freeze({ x: -9, y: -11, z: -2, rotation: 0.35 }),
  }),
  raised: Object.freeze({
    nearElbow: Object.freeze({ x: 12, y: -34, z: 5, rotation: -0.2 }),
    nearHand: Object.freeze({ x: 14, y: -46, z: 4, rotation: -0.1 }),
    farElbow: Object.freeze({ x: -12, y: -34, z: -3, rotation: 0.2 }),
    farHand: Object.freeze({ x: -14, y: -46, z: -2, rotation: 0.1 }),
  }),
});

function authoredEnemyFrame({
  id,
  at,
  transition,
  rootX = 0,
  rootY = 0,
  bodyLean = 0,
  headTilt = 0,
  rearFootX = -8,
  rearFootY = ENEMY_FOOT_Y,
  leadFootX = 8,
  leadFootY = ENEMY_FOOT_Y,
  depth = 0,
  signal = 0,
  armPose = 'neutral',
}) {
  const arm = ENEMY_ARM_POSES[armPose];
  if (!arm) throw new RangeError(`알 수 없는 enemy arm pose입니다: ${armPose}`);
  const chestLength = 32;
  const headLength = 16;
  const chestX = Math.sin(bodyLean) * chestLength;
  const chestY = -Math.cos(bodyLean) * chestLength;
  const headX = Math.sin(headTilt) * headLength;
  const headY = -Math.cos(headTilt) * headLength;
  const pelvisY = 46;
  const hipY = 4;
  const kneeY = 11;
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
    capeLift: signal,
    joints: Object.freeze(
      Object.fromEntries(
        Object.entries({
          root: { x: rootX, y: rootY, z: 0 },
          pelvis: { x: 0, y: pelvisY, z: 0 },
          chest: { x: chestX, y: chestY, z: depth },
          neck: { x: 1, y: -17, z: depth },
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

// Enemy authored strips share the player skeleton contract: local 3D joints projected
// through the fixed side-view camera. Machine units lean with the tool arm; human
// salvagers keep a lower guard brace and a distinct surrender silhouette.
function machineStrip(action) {
  switch (action) {
    case 'windup':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-windup-ready',
          at: 0,
          transition: 'hold',
          bodyLean: -0.04,
        }),
        authoredEnemyFrame({
          id: 'enemy-windup-load',
          at: 1,
          transition: 'linear',
          rootX: -6,
          rootY: 3,
          bodyLean: -0.26,
          headTilt: 0.12,
          rearFootX: -19,
          leadFootX: 10,
          depth: -0.6,
          signal: 0.7,
          armPose: 'windup',
        }),
      ]);
    case 'attack':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-attack-contact',
          at: 0,
          transition: 'hold',
          rootX: 9,
          rootY: 3,
          bodyLean: 0.24,
          headTilt: -0.12,
          rearFootX: -11,
          leadFootX: 22,
          depth: 0.75,
          signal: 1,
          armPose: 'contact',
        }),
        authoredEnemyFrame({
          id: 'enemy-attack-follow',
          at: 1,
          transition: 'linear',
          rootX: 11,
          rootY: 4,
          bodyLean: 0.32,
          headTilt: -0.15,
          rearFootX: -7,
          leadFootX: 24,
          depth: 0.4,
          signal: 0.8,
          armPose: 'contact',
        }),
      ]);
    case 'recovery':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-recovery-settle',
          at: 0,
          transition: 'hold',
          rootX: 4,
          rootY: 3,
          bodyLean: 0.1,
          rearFootX: -12,
          leadFootX: 14,
          signal: 0.4,
        }),
        authoredEnemyFrame({ id: 'enemy-recovery-ready', at: 1, transition: 'linear' }),
      ]);
    case 'hit':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-hit-contact',
          at: 0,
          transition: 'hold',
          rootX: -8,
          rootY: 4,
          bodyLean: -0.22,
          headTilt: 0.18,
          rearFootX: -16,
          leadFootX: 10,
          signal: 0.5,
          armPose: 'contact',
        }),
        authoredEnemyFrame({
          id: 'enemy-hit-recover',
          at: 1,
          transition: 'linear',
          rootX: -1,
          bodyLean: -0.03,
        }),
      ]);
    case 'guard':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-guard-brace',
          at: 0,
          transition: 'hold',
          rootX: -3,
          rootY: 3,
          bodyLean: -0.13,
          headTilt: 0.05,
          rearFootX: -17,
          leadFootX: 14,
          signal: 0.25,
          armPose: 'brace',
        }),
        authoredEnemyFrame({
          id: 'enemy-guard-hold',
          at: 1,
          transition: 'linear',
          rootX: -2,
          rootY: 2,
          bodyLean: -0.09,
          rearFootX: -16,
          leadFootX: 13,
          signal: 0.2,
          armPose: 'brace',
        }),
      ]);
    case 'advance':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-advance-near',
          at: 0,
          transition: 'linear',
          rootY: -1,
          bodyLean: 0.09,
          rearFootX: -22,
          leadFootX: 18,
          signal: 0.5,
        }),
        authoredEnemyFrame({
          id: 'enemy-advance-far',
          at: 0.5,
          transition: 'linear',
          rootY: -1,
          bodyLean: 0.09,
          rearFootX: -18,
          leadFootX: 22,
          signal: 0.5,
        }),
        authoredEnemyFrame({
          id: 'enemy-advance-near',
          at: 1,
          transition: 'linear',
          rootY: -1,
          bodyLean: 0.09,
          rearFootX: -22,
          leadFootX: 18,
          signal: 0.5,
        }),
      ]);
    case 'surrender':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-surrender-kneel',
          at: 0,
          transition: 'hold',
          rootX: -2,
          rootY: 10,
          bodyLean: -0.12,
          headTilt: 0.1,
          rearFootX: -14,
          leadFootX: 14,
          signal: 0.3,
          armPose: 'raised',
        }),
        authoredEnemyFrame({
          id: 'enemy-surrender-hold',
          at: 1,
          transition: 'linear',
          rootX: -2,
          rootY: 12,
          bodyLean: -0.14,
          headTilt: 0.12,
          rearFootX: -14,
          leadFootX: 14,
          signal: 0.3,
          armPose: 'raised',
        }),
      ]);
    case 'idle':
    default:
      return Object.freeze([
        authoredEnemyFrame({ id: 'enemy-idle-rest', at: 0, transition: 'linear', signal: 0.2 }),
        authoredEnemyFrame({
          id: 'enemy-idle-breath',
          at: 0.5,
          transition: 'linear',
          rootY: -1,
          bodyLean: 0.03,
          headTilt: -0.02,
          signal: 0.28,
        }),
        authoredEnemyFrame({ id: 'enemy-idle-return', at: 1, transition: 'linear', signal: 0.2 }),
      ]);
  }
}

function humanStrip(action) {
  switch (action) {
    case 'windup':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-windup-ready',
          at: 0,
          transition: 'hold',
          bodyLean: -0.06,
        }),
        authoredEnemyFrame({
          id: 'enemy-windup-load',
          at: 1,
          transition: 'linear',
          rootX: -7,
          rootY: 4,
          bodyLean: -0.3,
          headTilt: 0.14,
          rearFootX: -21,
          leadFootX: 9,
          depth: -0.65,
          signal: 0.5,
          armPose: 'windup',
        }),
      ]);
    case 'attack':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-attack-contact',
          at: 0,
          transition: 'hold',
          rootX: 11,
          rootY: 2,
          bodyLean: 0.27,
          headTilt: -0.13,
          rearFootX: -10,
          leadFootX: 24,
          depth: 0.7,
          signal: 0.85,
          armPose: 'contact',
        }),
        authoredEnemyFrame({
          id: 'enemy-attack-follow',
          at: 1,
          transition: 'linear',
          rootX: 12,
          rootY: 3,
          bodyLean: 0.34,
          headTilt: -0.16,
          rearFootX: -7,
          leadFootX: 25,
          depth: 0.38,
          signal: 0.7,
          armPose: 'contact',
        }),
      ]);
    case 'recovery':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-recovery-settle',
          at: 0,
          transition: 'hold',
          rootX: 3,
          rootY: 4,
          bodyLean: 0.08,
          rearFootX: -13,
          leadFootX: 13,
          signal: 0.3,
        }),
        authoredEnemyFrame({ id: 'enemy-recovery-ready', at: 1, transition: 'linear' }),
      ]);
    case 'hit':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-hit-contact',
          at: 0,
          transition: 'hold',
          rootX: -9,
          rootY: 5,
          bodyLean: -0.25,
          headTilt: 0.2,
          rearFootX: -17,
          leadFootX: 9,
          signal: 0.4,
          armPose: 'brace',
        }),
        authoredEnemyFrame({
          id: 'enemy-hit-recover',
          at: 1,
          transition: 'linear',
          rootX: -1,
          bodyLean: -0.03,
        }),
      ]);
    case 'guard':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-guard-brace',
          at: 0,
          transition: 'hold',
          rootX: -4,
          rootY: 4,
          bodyLean: -0.16,
          headTilt: 0.06,
          rearFootX: -19,
          leadFootX: 13,
          signal: 0.2,
          armPose: 'brace',
        }),
        authoredEnemyFrame({
          id: 'enemy-guard-hold',
          at: 1,
          transition: 'linear',
          rootX: -3,
          rootY: 3,
          bodyLean: -0.11,
          rearFootX: -17,
          leadFootX: 12,
          signal: 0.18,
          armPose: 'brace',
        }),
      ]);
    case 'advance':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-advance-near',
          at: 0,
          transition: 'linear',
          rootY: -2,
          bodyLean: 0.11,
          rearFootX: -24,
          leadFootX: 19,
          signal: 0.35,
        }),
        authoredEnemyFrame({
          id: 'enemy-advance-far',
          at: 0.5,
          transition: 'linear',
          rootY: -2,
          bodyLean: 0.11,
          rearFootX: -19,
          leadFootX: 24,
          signal: 0.35,
        }),
        authoredEnemyFrame({
          id: 'enemy-advance-near',
          at: 1,
          transition: 'linear',
          rootY: -2,
          bodyLean: 0.11,
          rearFootX: -24,
          leadFootX: 19,
          signal: 0.35,
        }),
      ]);
    case 'surrender':
      return Object.freeze([
        authoredEnemyFrame({
          id: 'enemy-surrender-kneel',
          at: 0,
          transition: 'hold',
          rootX: -3,
          rootY: 12,
          bodyLean: -0.16,
          headTilt: 0.14,
          rearFootX: -15,
          leadFootX: 15,
          signal: 0.25,
          armPose: 'raised',
        }),
        authoredEnemyFrame({
          id: 'enemy-surrender-hold',
          at: 1,
          transition: 'linear',
          rootX: -3,
          rootY: 14,
          bodyLean: -0.18,
          headTilt: 0.16,
          rearFootX: -15,
          leadFootX: 15,
          signal: 0.25,
          armPose: 'raised',
        }),
      ]);
    case 'idle':
    default:
      return Object.freeze([
        authoredEnemyFrame({ id: 'enemy-idle-rest', at: 0, transition: 'linear', signal: 0.16 }),
        authoredEnemyFrame({
          id: 'enemy-idle-breath',
          at: 0.5,
          transition: 'linear',
          rootY: -1,
          bodyLean: 0.025,
          headTilt: -0.02,
          signal: 0.22,
        }),
        authoredEnemyFrame({ id: 'enemy-idle-return', at: 1, transition: 'linear', signal: 0.16 }),
      ]);
  }
}

export const ENEMY_BONE_ACTIONS = Object.freeze([
  'idle',
  'advance',
  'windup',
  'attack',
  'recovery',
  'hit',
  'guard',
  'surrender',
]);

export const ENEMY_BONE_FAMILIES = Object.freeze(['machine', 'human']);

function stripFor(family, action) {
  const normalizedFamily = family === 'human' ? 'human' : 'machine';
  const normalizedAction = ENEMY_BONE_ACTIONS.includes(action) ? action : 'idle';
  return (normalizedFamily === 'human' ? humanStrip : machineStrip)(normalizedAction);
}

function sampleStrip(frames, progress) {
  const bounded = clamp(progress);
  const nextIndex = frames.findIndex((frame) => frame.at > bounded);
  if (nextIndex <= 0) {
    const frame = frames.at(-1);
    return Object.freeze({ ...frame.value, frameId: frame.id ?? null });
  }
  const previous = frames[nextIndex - 1];
  const next = frames[nextIndex];
  if (next.transition === 'snap') return Object.freeze({ ...previous.value, frameId: previous.id });
  const amount = (bounded - previous.at) / (next.at - previous.at);
  if (amount <= Number.EPSILON) return Object.freeze({ ...previous.value, frameId: previous.id });
  if (amount >= 1 - Number.EPSILON)
    return Object.freeze({ ...next.value, frameId: next.id ?? null });
  return Object.freeze({
    ...blendProjected(previous.value, next.value, next.transition === 'hold' ? 0 : amount),
    frameId: previous.id,
  });
}

function blendProjected(previousPose, currentPose, amount) {
  const blendPoint = (key) => ({
    x: previousPose[key].x + (currentPose[key].x - previousPose[key].x) * amount,
    y: previousPose[key].y + (currentPose[key].y - previousPose[key].y) * amount,
  });
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

export function sampleEnemyBonePose({ family = 'machine', action = 'idle', progress = 0 } = {}) {
  const frames = stripFor(family, action);
  const sampled = sampleStrip(frames, progress);
  return Object.freeze({
    ...sampled,
    family: family === 'human' ? 'human' : 'machine',
    action: ENEMY_BONE_ACTIONS.includes(action) ? action : 'idle',
    progress: clamp(progress),
  });
}

export function resolveEnemyBonePoseInput(enemy, attackProfiles = null) {
  const family = enemy?.species === 'human-salvager' ? 'human' : 'machine';
  const aiState = enemy?.aiState ?? 'idle';
  const resolutionState = enemy?.resolutionState ?? null;
  if (resolutionState === 'surrendered' || aiState === 'surrendered') {
    return Object.freeze({ family, action: 'surrender', progress: 1 });
  }
  if (resolutionState === 'fleeing' || aiState === 'fleeing') {
    return Object.freeze({ family, action: 'advance', progress: 0.5 });
  }
  if (aiState === 'windup' && attackProfiles?.[enemy.attackKind]) {
    const profile = attackProfiles[enemy.attackKind];
    const duration = profile.windupSeconds ?? 0.4;
    const progress = duration > 0 ? 1 - (enemy.aiSeconds ?? 0) / duration : 0.5;
    return Object.freeze({ family, action: 'windup', progress: clamp(progress) });
  }
  if (aiState === 'attack' && attackProfiles?.[enemy.attackKind]) {
    const profile = attackProfiles[enemy.attackKind];
    const duration = profile.attackSeconds ?? 0.3;
    const progress = duration > 0 ? 1 - (enemy.aiSeconds ?? 0) / duration : 0.5;
    return Object.freeze({ family, action: 'attack', progress: clamp(progress) });
  }
  if (aiState === 'recovery') {
    const duration = enemy.recoveryDurationSeconds ?? 0.4;
    const progress = duration > 0 ? 1 - (enemy.aiSeconds ?? 0) / duration : 0.5;
    return Object.freeze({ family, action: 'recovery', progress: clamp(progress) });
  }
  if (aiState === 'hitstun' || aiState === 'groggy') {
    const progress = Number.isFinite(enemy.aiSeconds) && enemy.aiSeconds > 0 ? 0.15 : 0;
    return Object.freeze({ family, action: 'hit', progress: clamp(progress) });
  }
  if (aiState === 'guard') {
    return Object.freeze({ family, action: 'guard', progress: 0.5 });
  }
  if (aiState === 'approach' || aiState === 'evade') {
    const cycle = ((Number.isFinite(enemy.position?.x) ? enemy.position.x : 0) % 40) / 40;
    return Object.freeze({ family, action: 'advance', progress: clamp((cycle + 1) % 1) });
  }
  const idleDuration = 0.45;
  const idleProgress = Number.isFinite(enemy?.aiSeconds)
    ? clamp(1 - enemy.aiSeconds / idleDuration)
    : 0;
  return Object.freeze({ family, action: 'idle', progress: idleProgress });
}

export function sampleEnemyBonePoseFor(enemy, attackProfiles = null) {
  return sampleEnemyBonePose(resolveEnemyBonePoseInput(enemy, attackProfiles));
}
