// Authored movement and presentation timing shared by gameplay, pose samplers,
// and resource timelines. These are the existing game's values, not QA speeds.
export const PLAYER_MOTION_PROFILE = Object.freeze({
  simulationRate: 120,
  frameRate: 60,
  movementSpeed: 230,
  jumpSpeed: 470,
  gravity: 1180,
  rollFrames: 25,
  rollSpeed: 320,
  landingFrames: 8,
  hitReactionSeconds: 0.22,
  justGuardEventSeconds: 0.2,
  poseCyclesPerSecond: Object.freeze({ idle: 2.4, run: 7.5, guard: 2.1 }),
});

export function playerBlockReactionTiming({ blockStrength, blockstunSeconds }, guardProfile) {
  return Object.freeze({
    blockStrength: blockStrength * guardProfile.impactScale,
    durationSeconds: blockstunSeconds * guardProfile.blockstunScale,
  });
}

export function playerAnimationTimeScale({
  movementIntent = 0,
  rolling = false,
  transitioning = false,
} = {}) {
  return transitioning ? 0.35 : rolling ? 1.8 : 1 + Math.abs(movementIntent) * 0.65;
}

export function advancePlayerAnimationTime(time, deltaSeconds, state = {}, animationSpeed = 1) {
  return time + deltaSeconds * animationSpeed * playerAnimationTimeScale(state);
}

export function integratePlayerVerticalVelocity(velocity, deltaSeconds, gravityMultiplier = 1) {
  return velocity + PLAYER_MOTION_PROFILE.gravity * gravityMultiplier * deltaSeconds;
}

export function playerJumpPhaseTiming() {
  const { simulationRate, frameRate, jumpSpeed, gravity } = PLAYER_MOTION_PROFILE;
  const apexTick = Math.ceil((jumpSpeed / gravity) * simulationRate);
  // Semi-implicit Euler is the production integrator. The landing tick therefore
  // differs from the continuous parabola by one fixed update.
  const landingTick = Math.ceil(((2 * jumpSpeed) / gravity) * simulationRate - 1);
  return Object.freeze({
    apexTick,
    landingTick,
    jumpFrames: Math.ceil((apexTick / simulationRate) * frameRate),
    fallFrames: Math.ceil(((landingTick - apexTick) / simulationRate) * frameRate),
  });
}

export function playerUtilityFrameCount(actionId) {
  const profile = PLAYER_MOTION_PROFILE;
  if (actionId === 'roll') return profile.rollFrames;
  if (actionId === 'landing') return profile.landingFrames;
  if (actionId === 'hit') return Math.ceil(profile.hitReactionSeconds * profile.frameRate);
  if (actionId === 'jump') return playerJumpPhaseTiming().jumpFrames;
  if (actionId === 'fall') return playerJumpPhaseTiming().fallFrames;
  const cycleRate = profile.poseCyclesPerSecond[actionId];
  if (!cycleRate) throw new Error(`Unknown utility motion timing: ${actionId}`);
  const cyclesPerFrame =
    (cycleRate * playerAnimationTimeScale({ movementIntent: actionId === 'run' ? 1 : 0 })) /
    profile.frameRate;
  // A run cycle lasts 160/33 frames and a guard cycle 200/7 frames. Rounding each
  // individual cycle would change the cadence at every loop. This is the shortest
  // exact 60 Hz repeated sequence (33 run cycles / 7 guard cycles).
  for (let frames = 1; frames <= 600; frames += 1) {
    if (Math.abs(frames * cyclesPerFrame - Math.round(frames * cyclesPerFrame)) < 1e-9)
      return frames;
  }
  throw new Error(`Utility motion has no bounded exact 60 Hz loop: ${actionId}`);
}
