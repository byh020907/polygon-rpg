export const FIRST_JOURNEY_DUNGEON_SIGNATURE_RULE = Object.freeze({
  id: 'sealed-resonance',
  label: '봉인 공명',
  stages: Object.freeze([
    Object.freeze({
      id: 'sealed-resonance:introduction',
      label: '입구 · 붉은 봉인과 청록 기록석',
    }),
    Object.freeze({
      id: 'sealed-resonance:guardian-combat',
      label: '전투 · 봉인 보유자 격파',
    }),
    Object.freeze({
      id: 'sealed-resonance:hidden-branch',
      label: '숨은 분기 · 잔향 기록석 활성',
    }),
    Object.freeze({
      id: 'sealed-resonance:boss-test',
      label: 'Boss · 봉인 핵 시험',
    }),
  ]),
});

export const FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE = Object.freeze({
  INTRODUCTION: FIRST_JOURNEY_DUNGEON_SIGNATURE_RULE.stages[0].id,
  GUARDIAN_COMBAT: FIRST_JOURNEY_DUNGEON_SIGNATURE_RULE.stages[1].id,
  HIDDEN_BRANCH: FIRST_JOURNEY_DUNGEON_SIGNATURE_RULE.stages[2].id,
  BOSS_TEST: FIRST_JOURNEY_DUNGEON_SIGNATURE_RULE.stages[3].id,
});

const STAGE_ORDER = new Map(
  FIRST_JOURNEY_DUNGEON_SIGNATURE_RULE.stages.map(({ id }, index) => [id, index]),
);

export function canonicalizeFirstJourneyDungeonSignatureStageIds(stageIds = []) {
  if (!Array.isArray(stageIds)) {
    throw new TypeError('첫 원정 Dungeon signature stage ID는 배열이어야 합니다.');
  }
  const unique = new Set();
  for (const stageId of stageIds) {
    if (!STAGE_ORDER.has(stageId)) {
      throw new Error(`지원하지 않는 첫 원정 Dungeon signature stage ID입니다: ${stageId}`);
    }
    if (unique.has(stageId)) {
      throw new Error(`첫 원정 Dungeon signature stage ID가 중복됩니다: ${stageId}`);
    }
    unique.add(stageId);
  }
  if (unique.size > 0 && !unique.has(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION)) {
    throw new Error('첫 원정 Dungeon signature 적용에는 입구 소개 stage가 필요합니다.');
  }
  if (
    (unique.has(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.HIDDEN_BRANCH) ||
      unique.has(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.BOSS_TEST)) &&
    !unique.has(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT)
  ) {
    throw new Error('숨은 분기와 Boss 시험에는 guardian 전투 stage가 필요합니다.');
  }
  return Object.freeze(
    [...unique].sort((left, right) => STAGE_ORDER.get(left) - STAGE_ORDER.get(right)),
  );
}
