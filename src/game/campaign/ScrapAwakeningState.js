export const SCRAP_AWAKENING_STAGE = Object.freeze({
  COMMISSION: 'commission',
  DEVICE_RECOVERED: 'device-recovered',
  EYES_LIT: 'eyes-lit',
  ASSEMBLED: 'assembled',
  DEADLINE_REVEALED: 'deadline-revealed',
  COMPLETE: 'complete',
});

export const SCRAP_AWAKENING_STAGE_IDS = Object.freeze(Object.values(SCRAP_AWAKENING_STAGE));

const STAGE_INDEX = new Map(SCRAP_AWAKENING_STAGE_IDS.map((stageId, index) => [stageId, index]));

const STAGE_DURATION_SECONDS = Object.freeze({
  [SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED]: 0.72,
  [SCRAP_AWAKENING_STAGE.EYES_LIT]: 0.86,
  [SCRAP_AWAKENING_STAGE.ASSEMBLED]: 1.08,
  [SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED]: 1.64,
});

export function assertScrapAwakeningStageId(stageId) {
  if (!STAGE_INDEX.has(stageId)) {
    throw new TypeError(`지원하지 않는 고철 대왕 각성 stage입니다: ${stageId}`);
  }
  return stageId;
}

export function compareScrapAwakeningStage(stageId, expectedStageId) {
  return (
    STAGE_INDEX.get(assertScrapAwakeningStageId(stageId)) -
    STAGE_INDEX.get(assertScrapAwakeningStageId(expectedStageId))
  );
}

export function nextScrapAwakeningStage(stageId) {
  const currentIndex = STAGE_INDEX.get(assertScrapAwakeningStageId(stageId));
  return SCRAP_AWAKENING_STAGE_IDS[
    Math.min(currentIndex + 1, SCRAP_AWAKENING_STAGE_IDS.length - 1)
  ];
}

export function scrapAwakeningStageDurationSeconds(stageId) {
  assertScrapAwakeningStageId(stageId);
  return STAGE_DURATION_SECONDS[stageId] ?? 0;
}

export function isScrapAwakeningActive(stageId) {
  assertScrapAwakeningStageId(stageId);
  return ![SCRAP_AWAKENING_STAGE.COMMISSION, SCRAP_AWAKENING_STAGE.COMPLETE].includes(stageId);
}

export function isScrapAwakeningDeadlineRevealed(stageId) {
  return compareScrapAwakeningStage(stageId, SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED) >= 0;
}

export function getScrapAwakeningPresentation(stageId) {
  assertScrapAwakeningStageId(stageId);
  const presentations = {
    [SCRAP_AWAKENING_STAGE.COMMISSION]: {
      title: '첫 고철 수거 의뢰',
      briefing: '폐병기 흉곽에서 반짝이는 제어장치에 접근해 ↑로 직접 회수하세요.',
      objective: '오른쪽 폐병기 안의 청록 제어장치에 접근해 ↑로 회수하세요.',
      cue: '제어장치 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED]: {
      title: '제어장치 회수',
      briefing: '손에 든 제어장치가 폐병기의 남은 회로를 깨웁니다.',
      objective: '제어장치 신호가 폐병기 안쪽으로 번집니다.',
      cue: 'INPUT LOCK · SIGNAL FOUND',
    },
    [SCRAP_AWAKENING_STAGE.EYES_LIT]: {
      title: '고철 대왕 각성',
      briefing: '어둡던 단안이 켜지고 주변 고철이 몸체 쪽으로 끌려갑니다.',
      objective: '눈 점등 · 고철 결합 진행 중',
      cue: 'EYE ONLINE · ASSEMBLY START',
    },
    [SCRAP_AWAKENING_STAGE.ASSEMBLED]: {
      title: '불완전한 고철 대왕',
      briefing: '서로 맞지 않는 판금과 케이블이 거대한 상체를 억지로 세웁니다.',
      objective: '불완전 조립체가 수도 방향을 탐색합니다.',
      cue: 'SCRAP KING · ROUTE ACQUIRED',
    },
    [SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED]: {
      title: '수도까지 남은 시간',
      briefing: '고철 대왕이 움직이기 시작했습니다. 수도 도착까지 D-30.',
      objective: '수도 도착까지 D-30 · 움직임이 멎으면 조작이 돌아옵니다.',
      cue: 'D-30 · 수도 도착까지',
    },
    [SCRAP_AWAKENING_STAGE.COMPLETE]: {
      title: '각성 직후',
      briefing: '회수한 제어장치가 고철 대왕을 깨웠습니다. 장치를 들고 고물상 주인에게 돌아갑니다.',
      objective: '조작 복귀 · 고물상 주인에게 제어장치와 고철 대왕을 보고하세요.',
      cue: 'CONTROL RESTORED · D-30',
    },
  };
  return Object.freeze({ stageId, ...presentations[stageId] });
}
