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
  const breath = Math.sin(animationTime * 2.4);
  return pose({
    rootY: breath * 0.9,
    bodyLean: breath * 0.008,
    headTilt: -breath * 0.014,
    rearFootX: -7,
    leadFootX: 7,
    capeLift: 0.08 + Math.max(0, breath) * 0.04,
  });
}

function sampleMovement(animationTime) {
  const cycle = animationTime * 7.5;
  const stride = Math.sin(cycle);
  const lift = Math.cos(cycle);
  return pose({
    rootY: -Math.abs(lift) * 1.5,
    bodyLean: 0.075,
    headTilt: -0.045,
    rearFootX: -8 + stride * 17,
    rearFootY: CHARACTER_FOOT_Y - Math.max(0, lift) * 8,
    leadFootX: 8 - stride * 17,
    leadFootY: CHARACTER_FOOT_Y - Math.max(0, -lift) * 8,
    capeLift: 0.68,
  });
}

function sampleAirborne(verticalVelocity) {
  const direction = clamp(verticalVelocity / REFERENCE_JUMP_SPEED, -1, 1);
  if (direction < 0) {
    const rising = -direction;
    return pose({
      rootX: 1,
      rootY: -2,
      bodyLean: 0.08 + rising * 0.04,
      headTilt: -0.07,
      rearFootX: -13,
      rearFootY: 68 - rising * 6,
      leadFootX: 12,
      leadFootY: 61 + rising * 4,
      capeLift: 0.9,
    });
  }

  return pose({
    rootX: 1,
    rootY: -1,
    bodyLean: 0.01 - direction * 0.06,
    headTilt: 0.035,
    rearFootX: -12,
    rearFootY: 70 + direction * 6,
    leadFootX: 14,
    leadFootY: 66 + direction * 7,
    capeLift: 0.72,
  });
}

function sampleGuard(animationTime) {
  const breath = Math.sin(animationTime * 2.1);
  return pose({
    rootX: -2,
    rootY: 3 + breath * 0.45,
    bodyLean: -0.075 + breath * 0.006,
    headTilt: 0.045 - breath * 0.01,
    rearFootX: -15,
    leadFootX: 15,
    capeLift: 0.16,
  });
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
  const impact = clamp(recovery);
  return pose({
    rootY: impact * 5,
    bodyLean: impact * 0.035,
    headTilt: -impact * 0.04,
    rearFootX: -13,
    leadFootX: 13,
    capeLift: impact * 0.24,
  });
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
    : pose({
        rootX: -8 * intensity,
        rootY: 3 * intensity,
        bodyLean: -0.18 * intensity,
        headTilt: 0.2 * intensity,
        rearFootX: -14,
        leadFootX: 12,
        capeLift: 0.35,
      });
}

function sampleRoll(progress) {
  const boundedProgress = clamp(progress);
  const easedProgress = boundedProgress * boundedProgress * (3 - 2 * boundedProgress);
  const arc = Math.sin(boundedProgress * Math.PI);
  return pose({
    rootX: arc * 4,
    rootY: 12 - arc * 9,
    bodyLean: easedProgress * Math.PI * 2,
    headTilt: -easedProgress * Math.PI * 2,
    rearFootX: -6,
    rearFootY: 62 + arc * 3,
    leadFootX: 7,
    leadFootY: 60 + arc * 5,
    capeLift: 0.92,
  });
}

function sampleCombat(motionState) {
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
