const ACADEMY_ROOM_ID = 'academy-plaza';

export const FIRST_JOURNEY_STORY_BEAT = Object.freeze({
  ACADEMY_BRIEFING: 'academy-briefing',
  ACADEMY_TRAINING: 'academy-training',
  FIRST_FIELD_CHOICE: 'first-field-choice',
  FIRST_FIELD_CLEARED: 'first-field-cleared',
  FIRST_FIELD_BYPASS: 'first-field-bypass',
  FIRST_DUNGEON_SEAL: 'first-dungeon-seal',
  FIRST_DUNGEON_CHECKPOINT: 'first-dungeon-checkpoint',
  FIRST_BOSS: 'first-boss',
  FIRST_REWARD: 'first-reward',
  FIRST_SHORTCUT: 'first-shortcut',
  GLASSWIND_BRIEFING: 'glasswind-briefing',
  GLASSWIND_FIELD: 'glasswind-field',
  GLASSWIND_FIELD_CLEARED: 'glasswind-field-cleared',
  GLASSWIND_DUNGEON: 'glasswind-dungeon',
  GLASSWIND_CHECKPOINT: 'glasswind-checkpoint',
  GLASSWIND_BOSS: 'glasswind-boss',
  GLASSWIND_REWARD: 'glasswind-reward',
  GLASSWIND_SHORTCUT: 'glasswind-shortcut',
  GLASSWIND_RETURN: 'glasswind-return',
});

const STORY_BEATS = Object.freeze({
  [FIRST_JOURNEY_STORY_BEAT.ACADEMY_BRIEFING]: Object.freeze({
    title: '세라 교관의 출정 수업',
    briefing:
      '전직 전투교관 세라가 주문 없이 마법 생물에 맞서는 첫 임무를 맡겼습니다. 선택한 장비의 거리와 빈틈을 확인하고 학원촌에서 출정하세요.',
    nextObjective: '장비를 고른 뒤 오른쪽 황금 문에서 ↑로 실습림 첫 원정을 시작하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.ACADEMY_TRAINING]: Object.freeze({
    title: '세라의 기본기 점검',
    briefing:
      '세라 교관의 훈련 골렘은 Guard, Roll과 같은 command route를 반복해 장비의 차이를 익히는 모의 상대입니다.',
    nextObjective:
      '훈련 골렘을 처치해 인장을 획득하고, 귀환 후 같은 A/S command route를 성장시키세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.FIRST_FIELD_CHOICE]: Object.freeze({
    title: '실습림의 두 갈래 길',
    briefing:
      '폐쇄 실습림 입구를 감시하는 골렘이 수호 수액을 지키고 있습니다. 맞서 보상을 얻거나 숲 위쪽 길로 우회할 수 있습니다.',
    nextObjective: '감시 골렘을 쓰러뜨리거나 중간 초록 Portal에서 ↑로 우회하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.FIRST_FIELD_CLEARED]: Object.freeze({
    title: '수호 수액의 가호',
    briefing:
      '감시 골렘이 쓰러지고 수호 수액이 몸을 감쌌습니다. 세라가 표시한 봉인 회랑으로 향할 길이 열렸습니다.',
    nextObjective: '수호 수액으로 최대 HP +20. 오른쪽 Portal에서 ↑로 Dungeon에 들어가세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.FIRST_FIELD_BYPASS]: Object.freeze({
    title: '수관 위의 우회로',
    briefing:
      '수호 수액을 포기하고 전투를 피해 숲의 상층으로 올랐습니다. 짧은 길이지만 Dungeon에서는 가호 없이 싸워야 합니다.',
    nextObjective: '전투를 우회했습니다. 오른쪽 Portal에서 ↑로 폐쇄 실습림에 진입하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.FIRST_DUNGEON_SEAL]: Object.freeze({
    title: '폐쇄 실습림의 봉인',
    briefing:
      '오래된 훈련 회랑의 봉인석이 Boss 구역을 막고 있습니다. 봉인석은 회복 지점과 다음 문을 함께 고정합니다.',
    nextObjective: '회랑의 청록 봉인석에 접근해 Checkpoint를 활성화하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.FIRST_DUNGEON_CHECKPOINT]: Object.freeze({
    title: '봉인석이 밝힌 길',
    briefing:
      '청록 봉인석이 다시 켜지며 회복 지점과 Boss 문이 연결됐습니다. 첫 원정의 위협이 문 너머에서 기다립니다.',
    nextObjective: 'Checkpoint 확보. 오른쪽 붉은 Portal에서 ↑로 Boss에게 도전하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.FIRST_BOSS]: Object.freeze({
    title: '봉인 수호자의 시험',
    briefing:
      '봉인 수호자는 기본공격과 막을 수 없는 강공격을 번갈아 사용합니다. 세라의 수업대로 Guard와 Roll 뒤 회복 틈을 노리세요.',
    nextObjective: '기본공격 Guard → 강공격 Roll → 청록 회복 틈 Punish로 공략하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.FIRST_REWARD]: Object.freeze({
    title: '수호자가 남긴 결정',
    briefing:
      '봉인 수호자가 쓰러지고 귀환 shortcut을 여는 황금 결정이 남았습니다. 전리품을 회수해야 원정 결과가 확정됩니다.',
    nextObjective: 'Boss가 남긴 황금 결정에 접근해 보상을 회수하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.FIRST_SHORTCUT]: Object.freeze({
    title: '학원촌으로 열린 지름길',
    briefing:
      '황금 결정이 학원촌으로 이어지는 shortcut을 고정했습니다. 세라에게 첫 원정의 결과를 보여 줄 때입니다.',
    nextObjective: '보상 획득 완료. 오른쪽 황금 shortcut Portal에서 ↑로 귀환하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.GLASSWIND_BRIEFING]: Object.freeze({
    title: '세라의 유리바람 의뢰',
    briefing:
      '첫 원정을 마친 뒤 세라 교관이 유리바람 협곡의 끊어진 관측 신호를 조사해 달라고 부탁했습니다. 횡풍을 읽을 장비를 정비하세요.',
    nextObjective: '첫 원정 장비를 정비하고 중앙 청록 Portal에서 새 유리바람 협곡으로 출발하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.GLASSWIND_FIELD]: Object.freeze({
    title: '흔들리는 바람다리',
    briefing:
      '풍식 사냥꾼이 협곡의 바람다리를 불안정하게 만들고 있습니다. 낮게 훑는 Sweep를 뛰어넘어 회복 틈에 반격하세요.',
    nextObjective: '풍식 사냥꾼의 지면 Sweep를 점프로 넘고 회복 틈에 반격해 바람다리를 고정하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.GLASSWIND_FIELD_CLEARED]: Object.freeze({
    title: '고정된 바람다리',
    briefing:
      '풍식 사냥꾼이 사라지며 다리의 표면과 횡풍 장벽이 안정됐습니다. 끊겼던 관측소 진입로가 다시 이어집니다.',
    nextObjective: '풍식 사냥꾼을 쓰러뜨려 바람다리가 고정됐습니다. 오른쪽 Portal로 진입하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.GLASSWIND_DUNGEON]: Object.freeze({
    title: '침묵한 유리 관측소',
    briefing:
      '관측소 중앙의 바람닻이 멈춰 폭풍눈으로 향하는 문도 흔들리고 있습니다. 닻을 되살려 이동 경로를 고정하세요.',
    nextObjective: '관측소 중앙의 청록 바람닻에 접근해 Checkpoint와 Boss Portal을 활성화하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.GLASSWIND_CHECKPOINT]: Object.freeze({
    title: '바람닻이 붙든 폭풍',
    briefing:
      '바람닻이 관측소와 폭풍눈 사이의 경계를 고정했습니다. 이제 협곡을 뒤흔드는 유리핵에 도전할 수 있습니다.',
    nextObjective: '바람닻 확보. 오른쪽 보라 Portal에서 폭풍눈 Boss에게 도전하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.GLASSWIND_BOSS]: Object.freeze({
    title: '폭풍눈의 유리핵',
    briefing:
      '유리핵은 Guard할 기본기, 뛰어넘을 Sweep와 굴러 통과할 강공격을 섞습니다. 공격 종류마다 다른 기본기로 빈틈을 만드세요.',
    nextObjective: 'Guard 기본기 · Jump Sweep · Roll 강공격을 구분하고 각 회복 틈을 공략하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.GLASSWIND_REWARD]: Object.freeze({
    title: '폭풍이 남긴 프리즘',
    briefing:
      '폭풍 유리핵이 부서지고 황금 프리즘이 남았습니다. 프리즘을 회수하면 협곡과 학원촌 사이의 귀환로가 열립니다.',
    nextObjective: '폭풍 유리핵이 남긴 황금 프리즘에 접근해 보상과 shortcut을 여세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.GLASSWIND_SHORTCUT]: Object.freeze({
    title: '협곡을 잇는 프리즘 길',
    briefing:
      '프리즘이 유리바람 협곡의 shortcut을 고정했습니다. 학원촌으로 돌아가 세라 교관에게 관측 결과를 전하세요.',
    nextObjective: '프리즘 회수 완료. 오른쪽 황금 shortcut Portal에서 ↑로 학원촌에 귀환하세요.',
  }),
  [FIRST_JOURNEY_STORY_BEAT.GLASSWIND_RETURN]: Object.freeze({
    title: '세라에게 전한 관측 기록',
    briefing:
      '세라 교관은 두 번의 원정에서 증명한 기본기를 새로운 출정의 기준으로 삼았습니다. 장비를 바꾸면 같은 길도 다른 공략이 됩니다.',
    nextObjective:
      '유리바람 협곡 원정 완료. 장비를 바꾸고 중앙 청록 Portal에서 전체 loop를 반복할 수 있습니다.',
  }),
});

function matchesRoom(roomId) {
  return ({ activeRoomId }) => activeRoomId === roomId;
}

const STORY_RULES = Object.freeze([
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.ACADEMY_TRAINING,
    matches: matchesRoom('training-room'),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.FIRST_FIELD_CLEARED,
    matches: ({ activeRoomId, journey }) =>
      activeRoomId === 'field-crossing' && Boolean(journey?.fieldGuardianDefeated),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.FIRST_FIELD_CHOICE,
    matches: matchesRoom('field-crossing'),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.FIRST_FIELD_BYPASS,
    matches: matchesRoom('field-canopy'),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.FIRST_DUNGEON_CHECKPOINT,
    matches: ({ activeRoomId, journey }) =>
      activeRoomId === 'sealed-forest-dungeon' && Boolean(journey?.checkpointActivated),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.FIRST_DUNGEON_SEAL,
    matches: matchesRoom('sealed-forest-dungeon'),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.FIRST_SHORTCUT,
    matches: ({ activeRoomId, journey }) =>
      activeRoomId === 'sealed-forest-boss' && Boolean(journey?.bossRewardClaimed),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.FIRST_REWARD,
    matches: ({ activeRoomId, journey }) =>
      activeRoomId === 'sealed-forest-boss' && Boolean(journey?.bossDefeated),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.FIRST_BOSS,
    matches: matchesRoom('sealed-forest-boss'),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.GLASSWIND_FIELD_CLEARED,
    matches: ({ activeRoomId, regionExpansion }) =>
      activeRoomId === 'glasswind-approach' && Boolean(regionExpansion?.glasswindBridgeStable),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.GLASSWIND_FIELD,
    matches: matchesRoom('glasswind-approach'),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.GLASSWIND_CHECKPOINT,
    matches: ({ activeRoomId, regionExpansion }) =>
      activeRoomId === 'glasswind-observatory' && Boolean(regionExpansion?.checkpointActivated),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.GLASSWIND_DUNGEON,
    matches: matchesRoom('glasswind-observatory'),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.GLASSWIND_SHORTCUT,
    matches: ({ activeRoomId, regionExpansion }) =>
      activeRoomId === 'glasswind-storm-eye' && Boolean(regionExpansion?.bossRewardClaimed),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.GLASSWIND_REWARD,
    matches: ({ activeRoomId, regionExpansion }) =>
      activeRoomId === 'glasswind-storm-eye' && Boolean(regionExpansion?.bossDefeated),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.GLASSWIND_BOSS,
    matches: matchesRoom('glasswind-storm-eye'),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.GLASSWIND_RETURN,
    matches: ({ activeRoomId, regionExpansion }) =>
      activeRoomId === ACADEMY_ROOM_ID && Boolean(regionExpansion?.returnedWithReward),
  }),
  Object.freeze({
    beatId: FIRST_JOURNEY_STORY_BEAT.GLASSWIND_BRIEFING,
    matches: ({ activeRoomId, journey }) =>
      activeRoomId === ACADEMY_ROOM_ID && Boolean(journey?.returnedWithReward),
  }),
]);

function withEquipmentBriefing(beatId, beat, equipment) {
  const equipmentLabel = equipment?.label?.trim();
  const briefing =
    beatId === FIRST_JOURNEY_STORY_BEAT.ACADEMY_BRIEFING && equipmentLabel
      ? `${beat.briefing} 현재 선택은 ${equipmentLabel}입니다.`
      : beat.briefing;
  const nextObjective = beat.nextObjective;
  return Object.freeze({ beatId, title: beat.title, briefing, nextObjective });
}

export function resolveFirstJourneyStory({
  equipment = null,
  journey = null,
  regionExpansion = null,
  activeRoomId = ACADEMY_ROOM_ID,
} = {}) {
  const context = { equipment, journey, regionExpansion, activeRoomId };
  const beatId =
    STORY_RULES.find((rule) => rule.matches(context))?.beatId ??
    FIRST_JOURNEY_STORY_BEAT.ACADEMY_BRIEFING;
  return withEquipmentBriefing(beatId, STORY_BEATS[beatId], equipment);
}
