import { SCRAP_CAST } from './ScrapCastProfile.js';

export const SCRAP_AWAKENING_STAGE = Object.freeze({
  COMMISSION: 'commission',
  RIVAL_DEPARTURE: 'rival-departure',
  YARD_CLEARANCE: 'yard-clearance',
  YARD_BRACE: 'yard-brace',
  YARD_PERIMETER: 'yard-perimeter',
  YARD_SURVEY: 'yard-survey',
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
    throw new TypeError(`지원하지 않는 고대 병기 각성 stage입니다: ${stageId}`);
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
      briefing: `${SCRAP_CAST.SCRAPYARD_OWNER.name}이 두 견습생에게 왕국 외곽 폐병기 수거를 맡깁니다.`,
      objective: `${SCRAP_CAST.SCRAPYARD_OWNER.name}에게 다가가 ↑로 의뢰를 받으세요.`,
      cue: '의뢰 받기 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.RIVAL_DEPARTURE]: {
      title: SCRAP_CAST.RIVAL.name,
      briefing: `좋은 부품을 두고 늘 경쟁하던 ${SCRAP_CAST.RIVAL.name}이 이번 수거만큼은 먼저 현장을 보자고 재촉합니다.`,
      objective: `오른쪽의 ${SCRAP_CAST.RIVAL.name}에게 다가가 ↑로 출발하세요.`,
      cue: `${SCRAP_CAST.RIVAL.name}과 출발 · 상호작용 ↑`,
    },
    [SCRAP_AWAKENING_STAGE.YARD_CLEARANCE]: {
      title: '폐병기 수거장 진입',
      briefing: `${SCRAP_CAST.RIVAL.name}과 함께 수거 표식을 따라가자, 멈춰 있던 소형 수거 유닛이 통로를 막고 움직이기 시작합니다.`,
      objective: '수거 유닛을 기본 공격과 방패로 막고 현장 표식까지 길을 여세요.',
      cue: '수거 유닛 조우 · Basic / Guard',
    },
    [SCRAP_AWAKENING_STAGE.YARD_BRACE]: {
      title: '수거장 안전 지지대',
      briefing: `${SCRAP_CAST.RIVAL.name}이 안쪽 흉곽으로 가는 판금 통로를 고정하려 하지만, 회수 신호가 지지대를 다시 잠급니다.`,
      objective: `${SCRAP_CAST.RIVAL.name}에게 다가가 ↑로 지지대와 수거 표식을 점검하세요.`,
      cue: '안전 지지대 점검 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.YARD_PERIMETER]: {
      title: '흉곽 통로 확보',
      briefing:
        '안쪽 통로를 지키던 회수 유닛이 지지대를 끌어당기기 시작합니다. 방패로 간격을 만들고 길을 확보해야 합니다.',
      objective: '회수 유닛을 막고 흉곽 아래 현장 표식까지 길을 여세요.',
      cue: '통로 수거 유닛 · Guard / Strong',
    },
    [SCRAP_AWAKENING_STAGE.YARD_SURVEY]: {
      title: '끊긴 구조 winch 점검',
      briefing: `${SCRAP_CAST.RIVAL.name}과 함께 끊긴 구조 winch 받침과 흉곽 지지대 표식을 직접 확인한 뒤 안쪽 현장으로 들어갑니다.`,
      objective: '끊긴 winch 받침으로 다가가 ↑로 점검하세요.',
      cue: 'winch 점검 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.YARD_SEARCH]: {
      title: '폐병기 수거장 탐색',
      briefing: '두 견습생은 수거 표식과 안전 지지대를 확인하며 거대한 폐병기 안쪽으로 들어갑니다.',
      objective: '오른쪽 현장 표식을 조사하고 ↑로 안전 상태를 확인하세요.',
      cue: '현장 조사 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.COLLAPSE]: {
      title: '붕괴 사고',
      briefing: `낡은 지지대가 무너지며 ${SCRAP_CAST.RIVAL.name}이 폐병기 잔해 아래에 갇힙니다.`,
      objective: '붕괴가 멎을 때까지 기다리세요.',
      cue: 'INPUT LOCK · COLLAPSE',
    },
    [SCRAP_AWAKENING_STAGE.RESCUE_REQUEST]: {
      title: '잔해 아래 구조 요청',
      briefing: `${SCRAP_CAST.RIVAL.name}은 다친 몸으로 구조 winch의 전원이 끊겼다고 알립니다.`,
      objective: `오른쪽 잔해의 ${SCRAP_CAST.RIVAL.name}에게 다가가 ↑로 상태를 확인하세요.`,
      cue: '구조 요청 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.PLAYER_DECISION]: {
      title: '구조 장치의 유일한 전원',
      briefing: `${SCRAP_CAST.RIVAL.name}을 끌고 간 회수팔의 직접 제어는 폐병기 흉곽의 제어핵에만 연결돼 있습니다.`,
      objective: '청록 제어핵에 다가가 ↑로 조사하세요.',
      cue: '제어핵 조사 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED]: {
      title: '사람을 먼저 구한다',
      briefing: `제어핵을 떼면 비상 운용이 시작될 수 있지만, 회수팔을 멈춰 ${SCRAP_CAST.RIVAL.name}을 구할 다른 방법은 없습니다.`,
      objective: '제어핵 앞에서 ↑를 눌러 회수팔의 정상 제어를 끊으세요.',
      cue: '구조용 제어핵 회수 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED]: {
      title: '회수팔 정상 제어 차단',
      briefing: `제어핵이 빠지자 자동 회수팔이 풀리고 ${SCRAP_CAST.RIVAL.name}을 붙잡은 장력이 사라집니다.`,
      objective: '회수팔 정지가 끝날 때까지 기다리세요.',
      cue: 'INPUT LOCK · ARM RELEASE',
    },
    [SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED]: {
      title: `${SCRAP_CAST.RIVAL.name} 구조 성공`,
      briefing: `${SCRAP_CAST.RIVAL.name}이 빠져나온 순간 제어핵 접속부가 비상 장갑 안으로 봉쇄되고 폐병기가 비상 운용으로 전환됩니다.`,
      objective: '폐병기 반응이 끝날 때까지 기다리세요.',
      cue: 'RESCUE COMPLETE · SIGNAL RETURN',
    },
    [SCRAP_AWAKENING_STAGE.EYES_LIT]: {
      title: '고대 병기 각성',
      briefing: '어둡던 단안이 켜지고 주변 고철이 몸체 쪽으로 끌려갑니다.',
      objective: '고철 결합 연출이 끝날 때까지 기다리세요.',
      cue: 'EYE ONLINE · ASSEMBLY START',
    },
    [SCRAP_AWAKENING_STAGE.ASSEMBLED]: {
      title: '불완전한 고대 병기',
      briefing: '서로 맞지 않는 판금과 케이블이 거대한 상체를 억지로 세웁니다.',
      objective: '진로 탐색 연출이 끝날 때까지 기다리세요.',
      cue: 'ANCIENT WEAPON · EMERGENCY ROUTE',
    },
    [SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED]: {
      title: '수도까지 남은 시간',
      briefing:
        '제어핵 응답 없음. 고대 병기가 저장된 중앙 지휘소 좌표를 향해 움직입니다. 왕도 도착까지 D-30.',
      objective: 'D-30 안내 뒤 조작이 돌아올 때까지 기다리세요.',
      cue: 'D-30 · 수도 도착까지',
    },
    [SCRAP_AWAKENING_STAGE.COMPLETE]: {
      title: '각성 직후',
      briefing: `${SCRAP_CAST.RIVAL.name}을 구한 두 견습생은 자신들이 깨운 고대 병기보다 먼저 고물상으로 돌아갑니다.`,
      objective: `왼쪽 ${SCRAP_CAST.SCRAPYARD_OWNER.name}에게 돌아가 ↑로 사고를 보고하세요.`,
      cue: 'CONTROL RESTORED · D-30',
    },
  };
  return Object.freeze({ stageId, ...presentations[stageId] });
}
