export const SCRAP_WEAPON_FORGE_PROFILE = Object.freeze({
  choiceGroupId: 'scrap-weapon-archetype',
  sourceId: 'scrap-yard-guard-collector',
  materialId: 'salvaged-drive-core',
  materialLabel: '회수한 구동핵',
  sourceQuantity: 1,
  materialCost: 1,
  optionProfileIds: Object.freeze([
    'swift-chain-sword',
    'posture-breaker-sword',
    'rear-punish-sword',
  ]),
});

// Rewards belong to concrete victories, never entering a room or replaying a conversation.
// The final yard fight supplies the first equipment/skill choice at the existing 120 Gold cost.
export const SCRAP_ENCOUNTER_REWARDS = Object.freeze(
  Object.fromEntries(
    [
      ['scrap-yard-guard-collector', 'yard-guard-collector', 'lightning', 120, 3, true],
      ['mine-tunnel-collector-unit', 'mine-claim-jacker', 'earth'],
      ['mine-collapse-walker-boss', 'mine-collapse-boss', 'earth'],
      ['shipyard-drydock-collector-unit', 'dock-salvage-raider', 'lightning'],
      ['shipyard-linked-cable-collector', 'shipyard-drydock-collector', 'lightning'],
      ['shipyard-linked-dock-raider', 'dock-salvage-raider', 'lightning'],
      ['shipyard-twin-crane-boss', 'shipyard-twin-crane-boss', 'lightning'],
      ['greenhouse-pipe-parasite', 'greenhouse-pipe-parasite', 'fire'],
      ['greenhouse-linked-pressure-brace-parasite', 'greenhouse-pipe-parasite', 'fire'],
      ['greenhouse-geothermal-boss', 'greenhouse-geothermal-boss', 'fire'],
      ['snow-tunnel-collector', 'snow-route-raider', 'ice'],
      ['snowplow-train-boss', 'snowplow-train-boss', 'ice'],
      ['quarry-cut-collector', 'quarry-cut-collector', 'earth'],
      ['quarry-rock-cutter-boss', 'quarry-rock-cutter-boss', 'earth'],
    ].map(
      ([entityId, profileId, elementId, gold = 40, trainingMarks = 0, forgeMaterial = false]) => [
        entityId,
        Object.freeze({
          entityId,
          profileId,
          gold,
          trainingMarks,
          forgeMaterial,
          materialReward: Object.freeze({ elementId, quantity: 2 }),
        }),
      ],
    ),
  ),
);

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

export const COMBAT_PROGRESSION_PROFILE = Object.freeze({
  maxSkillLevel: COMBAT_SKILL_LEVEL_PROFILES.length - 1,
  merchantProfileIds: Object.freeze(['balanced-sword', 'heavy-sword']),
  weaponForge: SCRAP_WEAPON_FORGE_PROFILE,
  encounterRewards: SCRAP_ENCOUNTER_REWARDS,
  getSkillLevelProfile: getCombatSkillLevelProfile,
  getSkillUpgradeCost: getCombatSkillUpgradeCost,
  getSkillTrainingMarkRequirement: getCombatSkillTrainingMarkRequirement,
});
