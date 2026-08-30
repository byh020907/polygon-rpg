const ENCOUNTER_PROFILES = Object.freeze({
  training: Object.freeze({
    id: 'training',
    role: 'training',
    label: '훈련용 마도 골렘',
    respawns: true,
    approachSpeed: 78,
    idleSeconds: 0.3,
    presentationScale: 0.48,
    attackPatterns: Object.freeze([Object.freeze(['light', 'heavy'])]),
    guardOutsidePunish: false,
  }),
  field: Object.freeze({
    id: 'field',
    role: 'field',
    label: '실습림 감시 골렘',
    respawns: false,
    approachSpeed: 72,
    idleSeconds: 0.36,
    activationRange: 210,
    presentationScale: 0.46,
    attackPatterns: Object.freeze([Object.freeze(['light', 'heavy'])]),
    guardOutsidePunish: false,
  }),
  boss: Object.freeze({
    id: 'boss',
    role: 'boss',
    label: '폐쇄 실습림의 봉인 교관',
    respawns: false,
    approachSpeed: 86,
    idleSeconds: 0.24,
    presentationScale: 0.58,
    attackPatterns: Object.freeze([
      Object.freeze(['light', 'light', 'heavy']),
      Object.freeze(['light', 'heavy', 'heavy']),
    ]),
    guardOutsidePunish: true,
  }),
});

export function getEncounterProfile(profileId = 'training') {
  const profile = ENCOUNTER_PROFILES[profileId];
  if (!profile) throw new Error(`알 수 없는 encounter profile입니다: ${profileId}`);
  return profile;
}

export function selectEncounterAttack(profile, patternIndex, healthRatio = 1) {
  const phaseIndex = healthRatio <= 0.5 && profile.attackPatterns.length > 1 ? 1 : 0;
  const pattern = profile.attackPatterns[phaseIndex];
  return pattern[Math.max(0, patternIndex) % pattern.length];
}

export { ENCOUNTER_PROFILES };
