import { combatFramesToSeconds } from '../../combat/CombatFrame.js';

function enemyAttackProfile({
  windupFrames,
  attackFrames,
  recoveryFrames,
  contactStartFrame,
  contactEndFrame,
  blockstunFrames = 0,
  ...profile
}) {
  if (
    contactStartFrame < 0 ||
    contactEndFrame > attackFrames ||
    contactEndFrame < contactStartFrame
  ) {
    throw new RangeError('Enemy contact frame window가 attackFrames 범위를 벗어났습니다.');
  }
  return Object.freeze({
    ...profile,
    frame: Object.freeze({
      rate: 60,
      windupFrames,
      attackFrames,
      recoveryFrames,
      contactStartFrame,
      contactEndFrame,
      blockstunFrames,
    }),
    windupSeconds: combatFramesToSeconds(windupFrames),
    attackSeconds: combatFramesToSeconds(attackFrames),
    recoverySeconds: combatFramesToSeconds(recoveryFrames),
    contactStart: contactStartFrame / attackFrames,
    contactEnd: contactEndFrame / attackFrames,
    blockstunSeconds: combatFramesToSeconds(blockstunFrames),
  });
}

export const TRAINING_ENEMY_ATTACK_PROFILES = Object.freeze({
  light: enemyAttackProfile({
    windupFrames: 14,
    attackFrames: 10,
    recoveryFrames: 14,
    contactStartFrame: 3,
    contactEndFrame: 8,
    blockstunFrames: 7,
    desiredRange: 46,
    attackRange: 52,
    verticalRange: 68,
    damage: 8,
    guardable: true,
    knockbackVelocity: 110,
    knockbackDecayRate: 0.0067,
    blockStrength: 0.55,
    weaponLength: 96,
  }),
  heavy: enemyAttackProfile({
    windupFrames: 30,
    attackFrames: 16,
    recoveryFrames: 35,
    contactStartFrame: 8,
    contactEndFrame: 14,
    desiredRange: 54,
    attackRange: 60,
    verticalRange: 68,
    damage: 20,
    guardable: false,
    guardBreak: true,
    knockbackVelocity: 220,
    knockbackDecayRate: 0.015,
    blockStrength: 1,
    weaponLength: 110,
  }),
  antiAir: enemyAttackProfile({
    windupFrames: 19,
    attackFrames: 12,
    recoveryFrames: 28,
    contactStartFrame: 5,
    contactEndFrame: 10,
    desiredRange: 52,
    attackRange: 58,
    verticalRange: 150,
    damage: 14,
    guardable: false,
    knockbackVelocity: 155,
    knockbackDecayRate: 0.01,
    weaponLength: 230,
  }),
  sweep: enemyAttackProfile({
    windupFrames: 24,
    attackFrames: 18,
    recoveryFrames: 26,
    contactStartFrame: 5,
    contactEndFrame: 14,
    desiredRange: 118,
    attackRange: 168,
    verticalRange: 28,
    damage: 16,
    guardable: false,
    rollPiercing: true,
    knockbackVelocity: 175,
    knockbackDecayRate: 0.011,
    blockStrength: 0.9,
    weaponLength: 195,
  }),
});
