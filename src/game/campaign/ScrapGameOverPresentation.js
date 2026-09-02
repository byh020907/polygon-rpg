export const SCRAP_GAME_OVER_STAGE = Object.freeze({
  INACTIVE: 'inactive',
  INPUT_LOCKED: 'input-locked',
  CAPITAL_ARRIVAL: 'capital-arrival',
  CAPITAL_DESTROYED: 'capital-destroyed',
  RECOVERY_CHOICE: 'recovery-choice',
});

const STAGE_SEQUENCE = Object.freeze([
  Object.freeze({ id: SCRAP_GAME_OVER_STAGE.INPUT_LOCKED, durationSeconds: 0.8 }),
  Object.freeze({ id: SCRAP_GAME_OVER_STAGE.CAPITAL_ARRIVAL, durationSeconds: 1.15 }),
  Object.freeze({ id: SCRAP_GAME_OVER_STAGE.CAPITAL_DESTROYED, durationSeconds: 1.25 }),
  Object.freeze({ id: SCRAP_GAME_OVER_STAGE.RECOVERY_CHOICE, durationSeconds: Infinity }),
]);

const PRESENTATION_BY_STAGE = Object.freeze({
  [SCRAP_GAME_OVER_STAGE.INACTIVE]: Object.freeze({
    title: '',
    cue: '',
    recoveryAvailable: false,
  }),
  [SCRAP_GAME_OVER_STAGE.INPUT_LOCKED]: Object.freeze({
    title: 'D-DAY 0',
    cue: '작전 신호가 끊겼습니다. 고철 대왕이 수도 진입로에 도달했습니다.',
    recoveryAvailable: false,
  }),
  [SCRAP_GAME_OVER_STAGE.CAPITAL_ARRIVAL]: Object.freeze({
    title: '수도 성문 도착',
    cue: '작전 지도 위 마지막 구간이 닫히고 고철 대왕의 표식이 수도에 겹칩니다.',
    recoveryAvailable: false,
  }),
  [SCRAP_GAME_OVER_STAGE.CAPITAL_DESTROYED]: Object.freeze({
    title: '마을 방벽 붕괴',
    cue: '수도 외곽의 작업장과 방벽이 무너집니다. 이번 한 달의 작전은 끝났습니다.',
    recoveryAvailable: false,
  }),
  [SCRAP_GAME_OVER_STAGE.RECOVERY_CHOICE]: Object.freeze({
    title: '작전 기록을 다시 펼친다',
    cue: '시간을 되감는 이야기가 아니라, 저장된 작전 기록 하나를 골라 다시 시작합니다.',
    recoveryAvailable: true,
  }),
});

function assertStageId(stageId) {
  if (!Object.values(SCRAP_GAME_OVER_STAGE).includes(stageId)) {
    throw new Error(`지원하지 않는 game-over presentation stage입니다: ${stageId}`);
  }
  return stageId;
}

function freezeState(stageId, elapsedSeconds = 0) {
  return Object.freeze({
    active: stageId !== SCRAP_GAME_OVER_STAGE.INACTIVE,
    stageId: assertStageId(stageId),
    elapsedSeconds,
  });
}

export function createScrapGameOverPresentation(gameOver, stageId = null) {
  if (!gameOver) return freezeState(SCRAP_GAME_OVER_STAGE.INACTIVE);
  return freezeState(stageId ?? SCRAP_GAME_OVER_STAGE.INPUT_LOCKED);
}

export function advanceScrapGameOverPresentation(state, deltaSeconds) {
  if (!state?.active || state.stageId === SCRAP_GAME_OVER_STAGE.RECOVERY_CHOICE) return state;
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new RangeError('game-over presentation delta는 0 이상의 유한수여야 합니다.');
  }

  let stageIndex = STAGE_SEQUENCE.findIndex((stage) => stage.id === state.stageId);
  if (stageIndex < 0) throw new Error(`진행할 수 없는 game-over stage입니다: ${state.stageId}`);
  let elapsedSeconds = state.elapsedSeconds + deltaSeconds;
  while (
    stageIndex < STAGE_SEQUENCE.length - 1 &&
    elapsedSeconds >= STAGE_SEQUENCE[stageIndex].durationSeconds
  ) {
    elapsedSeconds -= STAGE_SEQUENCE[stageIndex].durationSeconds;
    stageIndex += 1;
  }
  return freezeState(STAGE_SEQUENCE[stageIndex].id, elapsedSeconds);
}

export function getScrapGameOverPresentation(state) {
  const presentation = PRESENTATION_BY_STAGE[assertStageId(state?.stageId)];
  return Object.freeze({
    active: Boolean(state?.active),
    stageId: state.stageId,
    title: presentation.title,
    cue: presentation.cue,
    recoveryAvailable: presentation.recoveryAvailable,
  });
}
