export const SCRAP_AWAKENING_STAGE = Object.freeze({
  COMMISSION: 'commission',
  RIVAL_DEPARTURE: 'rival-departure',
  YARD_SEARCH: 'yard-search',
  COLLAPSE: 'collapse',
  RESCUE_REQUEST: 'rescue-request',
  PLAYER_DECISION: 'player-decision',
  DEVICE_INVESTIGATED: 'device-investigated',
  DEVICE_RECOVERED: 'device-recovered',
  RESCUE_SUCCEEDED: 'rescue-succeeded',
  EYES_LIT: 'eyes-lit',
  ASSEMBLED: 'assembled',
  DEADLINE_REVEALED: 'deadline-revealed',
  COMPLETE: 'complete',
});

export const SCRAP_AWAKENING_STAGE_IDS = Object.freeze(Object.values(SCRAP_AWAKENING_STAGE));

const STAGE_INDEX = new Map(SCRAP_AWAKENING_STAGE_IDS.map((stageId, index) => [stageId, index]));

const STAGE_DURATION_SECONDS = Object.freeze({
  [SCRAP_AWAKENING_STAGE.COLLAPSE]: 1.08,
  [SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED]: 0.72,
  [SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED]: 0.86,
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
  return [
    SCRAP_AWAKENING_STAGE.COLLAPSE,
    SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
    SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED,
    SCRAP_AWAKENING_STAGE.EYES_LIT,
    SCRAP_AWAKENING_STAGE.ASSEMBLED,
    SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
  ].includes(stageId);
}

export function isScrapAwakeningDeadlineRevealed(stageId) {
  return compareScrapAwakeningStage(stageId, SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED) >= 0;
}

export function getScrapAwakeningPresentation(stageId) {
  assertScrapAwakeningStageId(stageId);
  const presentations = {
    [SCRAP_AWAKENING_STAGE.COMMISSION]: {
      title: '고물상 정식 수거 의뢰',
      briefing: '고물상 주인이 두 견습생에게 왕국 외곽 폐병기 수거를 맡깁니다.',
      objective: '고물상 주인에게 다가가 ↑로 의뢰를 받으세요.',
      cue: '의뢰 받기 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.RIVAL_DEPARTURE]: {
      title: '라이벌 견습생 하린',
      briefing:
        '좋은 부품을 두고 늘 경쟁하던 하린이 이번 수거만큼은 먼저 현장을 보자고 재촉합니다.',
      objective: '오른쪽의 하린에게 다가가 ↑로 출발하세요.',
      cue: '하린과 출발 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.YARD_SEARCH]: {
      title: '폐병기 수거장 탐색',
      briefing: '두 견습생은 수거 표식과 안전 지지대를 확인하며 거대한 폐병기 안쪽으로 들어갑니다.',
      objective: '오른쪽 현장 표식을 조사하고 ↑로 안전 상태를 확인하세요.',
      cue: '현장 조사 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.COLLAPSE]: {
      title: '붕괴 사고',
      briefing: '낡은 지지대가 무너지며 하린이 폐병기 잔해 아래에 갇힙니다.',
      objective: '붕괴가 멎을 때까지 기다리세요.',
      cue: 'INPUT LOCK · COLLAPSE',
    },
    [SCRAP_AWAKENING_STAGE.RESCUE_REQUEST]: {
      title: '잔해 아래 구조 요청',
      briefing: '하린은 다친 몸으로 구조 winch의 전원이 끊겼다고 알립니다.',
      objective: '오른쪽 잔해의 하린에게 다가가 ↑로 상태를 확인하세요.',
      cue: '구조 요청 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.PLAYER_DECISION]: {
      title: '구조 장치의 유일한 전원',
      briefing: '구조 winch와 맞는 출력은 폐병기 흉곽의 제어장치뿐입니다.',
      objective: '청록 제어장치에 다가가 ↑로 조사하세요.',
      cue: '제어장치 조사 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED]: {
      title: '사람을 먼저 구한다',
      briefing: '장치를 떼면 폐병기 회로가 깨어날 수 있지만, 하린을 구할 다른 방법은 없습니다.',
      objective: '제어장치 앞에서 ↑를 눌러 구조 winch에 연결하세요.',
      cue: '구조용 장치 회수 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED]: {
      title: '구조 장치 가동',
      briefing: '제어장치가 구조 winch에 전력을 보내 잔해를 들어 올립니다.',
      objective: '구조 winch 가동이 끝날 때까지 기다리세요.',
      cue: 'INPUT LOCK · RESCUE POWER',
    },
    [SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED]: {
      title: '하린 구조 성공',
      briefing: '하린이 잔해에서 빠져나온 순간 제어장치 신호가 폐병기의 남은 회로로 역류합니다.',
      objective: '폐병기 반응이 끝날 때까지 기다리세요.',
      cue: 'RESCUE COMPLETE · SIGNAL RETURN',
    },
    [SCRAP_AWAKENING_STAGE.EYES_LIT]: {
      title: '고철 대왕 각성',
      briefing: '어둡던 단안이 켜지고 주변 고철이 몸체 쪽으로 끌려갑니다.',
      objective: '고철 결합 연출이 끝날 때까지 기다리세요.',
      cue: 'EYE ONLINE · ASSEMBLY START',
    },
    [SCRAP_AWAKENING_STAGE.ASSEMBLED]: {
      title: '불완전한 고철 대왕',
      briefing: '서로 맞지 않는 판금과 케이블이 거대한 상체를 억지로 세웁니다.',
      objective: '진로 탐색 연출이 끝날 때까지 기다리세요.',
      cue: 'SCRAP KING · ROUTE ACQUIRED',
    },
    [SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED]: {
      title: '수도까지 남은 시간',
      briefing: '고철 대왕이 움직이기 시작했습니다. 수도 도착까지 D-30.',
      objective: 'D-30 안내 뒤 조작이 돌아올 때까지 기다리세요.',
      cue: 'D-30 · 수도 도착까지',
    },
    [SCRAP_AWAKENING_STAGE.COMPLETE]: {
      title: '각성 직후',
      briefing: '하린을 구한 두 견습생은 자신들이 깨운 고철 대왕보다 먼저 고물상으로 돌아갑니다.',
      objective: '왼쪽 고물상 주인에게 돌아가 ↑로 사고를 보고하세요.',
      cue: 'CONTROL RESTORED · D-30',
    },
  };
  return Object.freeze({ stageId, ...presentations[stageId] });
}
