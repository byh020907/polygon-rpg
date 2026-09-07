// Integer 60Hz authored contact intervals, [startup, activeEnd). Command phase,
// damage eligibility and pose remapping all consume this one timeline.
export const COMBAT_MOTION_TIMING_PROFILES = Object.freeze(
  Object.fromEntries(
    Object.entries({
      slash: [11, 21],
      heavy: [16, 31],
      thrust: [9, 16],
      rising: [13, 25],
      spin: [17, 33],
      airSlash: [9, 16],
      airHeavy: [11, 20],
      airReturn: [8, 15],
      airSpin: [14, 28],
      airCross: [11, 20],
      shieldBash: [9, 18],
    }).map(([id, [startupFrames, activeEndFrame]]) => [
      id,
      Object.freeze({
        startupFrames,
        activeFrames: activeEndFrame - startupFrames,
        ...(id === 'spin' ? { hitPulseFrames: Object.freeze([18, 25, 32]) } : {}),
      }),
    ]),
  ),
);

export function isAttackContactFrame(combatState, attackProfile) {
  if (!attackProfile) return false;
  if (Number.isInteger(combatState.frame?.index)) {
    return (
      combatState.frame.index >= attackProfile.frame.startFrame &&
      combatState.frame.index < attackProfile.frame.endFrame
    );
  }
  // Normal gameplay uses the integer frame above. Authoring/QA samples can specify
  // normalized progress; align their floating-point boundary with CombatFrame sampling.
  const progress = combatState.progress + 1e-10;
  return progress >= attackProfile.start && progress < attackProfile.end;
}
