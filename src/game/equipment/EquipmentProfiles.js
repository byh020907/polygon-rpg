function freezeProfile(profile) {
  return Object.freeze({
    ...profile,
    combatTiming: Object.freeze({ ...profile.combatTiming }),
    attack: Object.freeze({ ...profile.attack }),
    defense: Object.freeze({ ...profile.defense }),
    guard: Object.freeze({ ...profile.guard }),
    geometry: Object.freeze({ ...profile.geometry }),
  });
}

export const EQUIPMENT_PROFILES = Object.freeze([
  freezeProfile({
    id: 'balanced-sword',
    label: '속공형 기병검·방패',
    shortLabel: '속공형',
    description: '짧은 frame · 짧은 거리 · 낮은 경직',
    goldCost: 0,
    trainingMarkRequirement: 0,
    combatTiming: { startupScale: 0.82, recoveryScale: 0.84 },
    attack: {
      damageScale: 0.9,
      rangeScale: 0.92,
      hitstunScale: 0.85,
      launchScale: 0.92,
      postureDamageScale: 1,
      backPunishDamageScale: 1,
    },
    defense: { damageTakenScale: 1.08 },
    guard: { impactScale: 1.08, blockstunScale: 1.08 },
    geometry: { weaponLengthScale: 0.94 },
  }),
  freezeProfile({
    id: 'heavy-sword',
    label: '중량형 대검·방패',
    shortLabel: '중량형',
    description: '긴 frame · 긴 거리 · 높은 경직',
    goldCost: 120,
    trainingMarkRequirement: 0,
    combatTiming: { startupScale: 1.22, recoveryScale: 1.28 },
    attack: {
      damageScale: 1.2,
      rangeScale: 1.22,
      hitstunScale: 1.3,
      launchScale: 1.18,
      postureDamageScale: 1,
      backPunishDamageScale: 1,
    },
    defense: { damageTakenScale: 0.92 },
    guard: { impactScale: 0.84, blockstunScale: 0.84 },
    geometry: { weaponLengthScale: 1.18 },
  }),
  freezeProfile({
    id: 'swift-chain-sword',
    label: '연환형 유선검·방패',
    shortLabel: '연환형',
    description: '가장 짧은 frame · 짧은 reach · 낮은 단발 피해',
    goldCost: 0,
    trainingMarkRequirement: 0,
    combatTiming: { startupScale: 0.68, recoveryScale: 0.7 },
    attack: {
      damageScale: 0.78,
      rangeScale: 0.84,
      hitstunScale: 0.72,
      launchScale: 1.06,
      postureDamageScale: 0.8,
      backPunishDamageScale: 1,
    },
    defense: { damageTakenScale: 1.12 },
    guard: { impactScale: 1.12, blockstunScale: 1.12 },
    geometry: { weaponLengthScale: 0.88 },
  }),
  freezeProfile({
    id: 'posture-breaker-sword',
    label: '파쇄형 철심검·방패',
    shortLabel: '파쇄형',
    description: '느린 frame · 강한 guard/posture 파쇄 · 짧은 reach',
    goldCost: 0,
    trainingMarkRequirement: 0,
    combatTiming: { startupScale: 1.18, recoveryScale: 1.24 },
    attack: {
      damageScale: 1.04,
      rangeScale: 0.94,
      hitstunScale: 1.2,
      launchScale: 0.86,
      postureDamageScale: 1.65,
      backPunishDamageScale: 1,
    },
    defense: { damageTakenScale: 0.96 },
    guard: { impactScale: 0.82, blockstunScale: 0.84 },
    geometry: { weaponLengthScale: 0.98 },
  }),
  freezeProfile({
    id: 'rear-punish-sword',
    label: '추격형 장검·방패',
    shortLabel: '추격형',
    description: '가장 긴 reach · 강한 배후 punish · 긴 recovery',
    goldCost: 0,
    trainingMarkRequirement: 0,
    combatTiming: { startupScale: 1.08, recoveryScale: 1.18 },
    attack: {
      damageScale: 0.88,
      rangeScale: 1.42,
      hitstunScale: 0.9,
      launchScale: 0.9,
      postureDamageScale: 0.85,
      backPunishDamageScale: 1.55,
    },
    defense: { damageTakenScale: 1.1 },
    guard: { impactScale: 1.08, blockstunScale: 1.08 },
    geometry: { weaponLengthScale: 1.36 },
  }),
]);

export const DEFAULT_EQUIPMENT_PROFILE_ID = EQUIPMENT_PROFILES[0].id;

export function getEquipmentProfile(profileId) {
  const profile = EQUIPMENT_PROFILES.find((candidate) => candidate.id === profileId);
  if (!profile) throw new Error(`알 수 없는 장비 profile입니다: ${profileId}`);
  return profile;
}

export const EQUIPMENT_CATALOG = Object.freeze({
  defaultProfileId: DEFAULT_EQUIPMENT_PROFILE_ID,
  profiles: EQUIPMENT_PROFILES,
  getProfile: getEquipmentProfile,
});
