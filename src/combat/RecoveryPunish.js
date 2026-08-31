export const BOSS_BACK_PUNISH_DEAD_ZONE = 6;

export function resolveRecoveryPunish({
  enemyRole,
  recoveryWindowOpen,
  claimedComboCycle,
  comboCycle,
  playerPositionX,
  enemyPositionX,
  attackFacing,
}) {
  const signedAttackSide = (playerPositionX - enemyPositionX) * attackFacing;
  const backThreshold = enemyRole === 'boss' ? BOSS_BACK_PUNISH_DEAD_ZONE : 0;
  const continues =
    enemyRole === 'boss' && claimedComboCycle !== 0 && claimedComboCycle === comboCycle;
  const opens =
    recoveryWindowOpen &&
    claimedComboCycle === 0 &&
    signedAttackSide < -backThreshold &&
    !continues;

  return Object.freeze({
    accepted: enemyRole !== 'boss' || opens || continues,
    opens,
    continues,
  });
}
