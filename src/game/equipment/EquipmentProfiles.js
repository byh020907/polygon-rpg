function freezeProfile(profile) {
  return Object.freeze({
    ...profile,
    combatTiming: Object.freeze({ ...profile.combatTiming }),
    attack: Object.freeze({ ...profile.attack }),
    presentation: Object.freeze({ ...profile.presentation }),
  });
}

export const EQUIPMENT_PROFILES = Object.freeze([
  freezeProfile({
    id: 'balanced-sword',
    label: '균형형 검·방패',
    shortLabel: '균형형',
    description: '빠른 준비와 표준 사거리',
    combatTiming: { startupScale: 1, recoveryScale: 1 },
    attack: { rangeScale: 1, hitstunScale: 1 },
    presentation: { weaponLengthScale: 1 },
  }),
  freezeProfile({
    id: 'heavy-sword',
    label: '중량형 대검·방패',
    shortLabel: '중량형',
    description: '느린 준비·회수, 긴 사거리·큰 경직',
    combatTiming: { startupScale: 1.22, recoveryScale: 1.28 },
    attack: { rangeScale: 1.22, hitstunScale: 1.3 },
    presentation: { weaponLengthScale: 1.18 },
  }),
]);

export const DEFAULT_EQUIPMENT_PROFILE_ID = EQUIPMENT_PROFILES[0].id;

export function getEquipmentProfile(profileId) {
  const profile = EQUIPMENT_PROFILES.find((candidate) => candidate.id === profileId);
  if (!profile) throw new Error(`알 수 없는 장비 profile입니다: ${profileId}`);
  return profile;
}
