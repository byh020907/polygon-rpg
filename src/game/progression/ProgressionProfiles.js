export const TRAINING_CLEAR_REWARD = 3;

function freezeLevelProfile(profile) {
  return Object.freeze({ ...profile });
}

export const COMBAT_SKILL_LEVEL_PROFILES = Object.freeze([
  freezeLevelProfile({
    level: 0,
    label: '기본 수련',
    description: '기본 공격과 한 번의 공중 행동을 사용합니다.',
    damageScale: 1,
    maxAirActions: 1,
    spinHitCount: 0,
    groundCombos: false,
    airCombos: false,
    loopCancel: false,
  }),
  freezeLevelProfile({
    level: 1,
    label: '연계 입문',
    description: '지상 연계와 회전 타격을 익힙니다.',
    damageScale: 1.08,
    maxAirActions: 1,
    spinHitCount: 1,
    groundCombos: true,
    airCombos: false,
    loopCancel: false,
  }),
  freezeLevelProfile({
    level: 2,
    label: '공중 연계',
    description: '공중 연계와 두 번의 공중 행동을 열어 전투 route를 늘립니다.',
    damageScale: 1.16,
    maxAirActions: 2,
    spinHitCount: 2,
    groundCombos: true,
    airCombos: true,
    loopCancel: false,
  }),
  freezeLevelProfile({
    level: 3,
    label: '순환 숙련',
    description: '세 번의 공중 행동과 loop cancel로 연계를 다시 시작합니다.',
    damageScale: 1.24,
    maxAirActions: 3,
    spinHitCount: 3,
    groundCombos: true,
    airCombos: true,
    loopCancel: true,
  }),
]);

export const COMBAT_SKILL_UPGRADE_GOLD_COSTS = Object.freeze([null, 120, 180, 240]);
export const COMBAT_SKILL_TRAINING_MARK_REQUIREMENTS = Object.freeze([null, 0, 2, 3]);

export function getCombatSkillLevelProfile(level) {
  if (!Number.isInteger(level) || level < 0 || level >= COMBAT_SKILL_LEVEL_PROFILES.length) {
    throw new RangeError('combat skill level은 0..3 사이의 정수여야 합니다.');
  }
  return COMBAT_SKILL_LEVEL_PROFILES[level];
}

export function getCombatSkillUpgradeCost(level) {
  if (!Number.isInteger(level) || level < 1 || level >= COMBAT_SKILL_UPGRADE_GOLD_COSTS.length) {
    throw new RangeError('승급 대상 combat skill level은 1..3 사이의 정수여야 합니다.');
  }
  return COMBAT_SKILL_UPGRADE_GOLD_COSTS[level];
}

export function getCombatSkillTrainingMarkRequirement(level) {
  if (
    !Number.isInteger(level) ||
    level < 1 ||
    level >= COMBAT_SKILL_TRAINING_MARK_REQUIREMENTS.length
  ) {
    throw new RangeError('승급 대상 combat skill level은 1..3 사이의 정수여야 합니다.');
  }
  return COMBAT_SKILL_TRAINING_MARK_REQUIREMENTS[level];
}
