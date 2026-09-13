import { SCRAP_CAST } from './ScrapCastProfile.js';

export const SCRAP_AWAKENING_STAGE = Object.freeze({
  COMMISSION: 'commission',
  RIVAL_DEPARTURE: 'rival-departure',
  YARD_CLEARANCE: 'yard-clearance',
  YARD_BRACE: 'yard-brace',
  YARD_PERIMETER: 'yard-perimeter',
  YARD_SURVEY: 'yard-survey',
  YARD_APPROACH: 'yard-approach',
  YARD_PLATE: 'yard-plate',
  YARD_RIDGE: 'yard-ridge',
  YARD_GUARD: 'yard-guard',
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
      title: '지하 유적 진입',
      briefing: `${SCRAP_CAST.RIVAL.name}과 고물상 아래의 오래된 수거 갱으로 내려가자, 상층 선별 데크와 더 깊은 정비로가 함께 드러납니다.`,
      objective: '오른쪽 지하 입구로 내려가 상층 선별 데크의 막힌 통로를 확인하세요.',
      cue: '지하 유적 진입 · 이동 / 점프',
    },
    [SCRAP_AWAKENING_STAGE.YARD_BRACE]: {
      title: '상층 선별 데크',
      briefing:
        '끊긴 발판 아래로 오래된 하층 정비로가 보입니다. 돌아올 때 쓸 수 있을지 구조를 기억해야 합니다.',
      objective: '상층 데크의 높이 차와 끊긴 발판을 건너세요.',
      cue: '상층 데크 · 이동 / 점프',
    },
    [SCRAP_AWAKENING_STAGE.YARD_PERIMETER]: {
      title: '지지 케이블 통로',
      briefing: '수거 유닛 하나가 상층 다리의 지지 케이블을 계속 당겨 통로를 접고 있습니다.',
      objective: '케이블 수거 유닛을 제압해 실제 다리를 내리고 다음 길을 여세요.',
      cue: '통로 개방 전투 · Basic / Guard',
    },
    [SCRAP_AWAKENING_STAGE.YARD_SURVEY]: {
      title: '하층 정비로 확인',
      briefing: `${SCRAP_CAST.RIVAL.name}과 열린 다리를 건너며 아래쪽 정비 통로와 흉곽 경사로의 연결을 확인합니다.`,
      objective: '상층 끝의 흉곽 입구로 이동해 아래 정비로를 확인하세요.',
      cue: '공간 조사 · 하층 귀환로 확인',
    },
    [SCRAP_AWAKENING_STAGE.YARD_APPROACH]: {
      title: '고대 흉곽 경사로',
      briefing:
        '상층 선별 설비보다 훨씬 오래된 석조 아치와 거대한 흉곽 판금이 지하 심부로 이어집니다.',
      objective: '흉곽 경사로를 따라 내려가 떨어진 지지판을 조사하세요.',
      cue: '흉곽 경사로 · 하강',
    },
    [SCRAP_AWAKENING_STAGE.YARD_PLATE]: {
      title: '고대 지지판 조사',
      briefing: `${SCRAP_CAST.RIVAL.name}과 흉곽을 떠받친 지지판의 오래된 인장과 안쪽 회수 케이블을 확인합니다.`,
      objective: '경사로 중앙의 지지판에 다가가 ↑로 조사하세요.',
      cue: '고대 지지판 조사 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.YARD_RIDGE]: {
      title: '흉곽 내부 연결부',
      briefing:
        '지지판 너머에는 유적 중심으로 이어지는 케이블과 움직임이 멎지 않은 회수팔이 보입니다.',
      objective: '경사로의 안전 발판을 따라 흉곽 심부로 이동하세요.',
      cue: '흉곽 내부 · 이동',
    },
    [SCRAP_AWAKENING_STAGE.YARD_GUARD]: {
      title: '심부 조사 데크',
      briefing: `${SCRAP_CAST.RIVAL.name}이 갈고리로 위쪽 연결 줄을 확인하는 동안 주인공은 아래 발판의 상태를 살핍니다.`,
      objective: '조사 데크 끝에서 회수팔과 흉곽 연결 상태를 확인하세요.',
      cue: '심부 조사 · 공간 관찰',
    },
    [SCRAP_AWAKENING_STAGE.YARD_SEARCH]: {
      title: '지하 유적 중심 조사',
      briefing:
        '두 견습생은 거대한 폐병기의 흉곽 안쪽에서 제어핵과 회수팔이 직접 이어진 구조를 발견합니다.',
      objective: '오른쪽 조사 데크 끝에서 ↑로 회수팔의 움직임을 확인하세요.',
      cue: '지하 유적 조사 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.COLLAPSE]: {
      title: '지하 유적 붕괴',
      briefing: `자동 회수팔이 ${SCRAP_CAST.RIVAL.name}의 갈고리를 잡아당기자 조사 데크가 무너지고 두 견습생이 하부 제어실로 떨어집니다.`,
      objective: '붕괴가 멎을 때까지 기다리세요.',
      cue: 'INPUT LOCK · COLLAPSE',
    },
    [SCRAP_AWAKENING_STAGE.RESCUE_REQUEST]: {
      title: '잔해 아래 구조 요청',
      briefing: `${SCRAP_CAST.RIVAL.name}은 회수팔에 붙잡혀 끌려가고 있으며, 팔과 직접 연결된 흉곽 장치를 빼야 멈춘다고 알립니다.`,
      objective: `오른쪽 잔해의 ${SCRAP_CAST.RIVAL.name}에게 다가가 ↑로 상태를 확인하세요.`,
      cue: '구조 요청 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.PLAYER_DECISION]: {
      title: '구조 장치의 유일한 전원',
      briefing: `${SCRAP_CAST.RIVAL.name}을 끌고 간 회수팔은 폐병기 흉곽의 청록 제어핵으로 움직입니다.`,
      objective: '청록 제어핵에 다가가 ↑로 조사하세요.',
      cue: '제어핵 조사 · 상호작용 ↑',
    },
    [SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED]: {
      title: '사람을 먼저 구한다',
      briefing: `제어핵을 떼면 잠들어 있던 폐병기가 깨어날 수 있지만, 회수팔을 멈춰 ${SCRAP_CAST.RIVAL.name}을 구할 다른 방법은 없습니다.`,
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
        '제어핵 응답 없음. 고대 병기가 "중앙 지휘소", 옛 본부의 위치를 따라 왕도로 갑니다. 도착까지 D-30.',
      objective: 'D-30 안내 뒤 조작이 돌아올 때까지 기다리세요.',
      cue: 'D-30 · 수도 도착까지',
    },
    [SCRAP_AWAKENING_STAGE.COMPLETE]: {
      title: '각성 직후',
      briefing: `${SCRAP_CAST.RIVAL.name}을 구한 두 견습생은 자신들이 깨운 고대 병기보다 먼저 고물상으로 돌아갑니다.`,
      objective: `왼쪽 하층 정비 통로를 따라 고물상으로 돌아가 ${SCRAP_CAST.SCRAPYARD_OWNER.name}에게 보고하세요.`,
      cue: '하층 귀환로 개방 · D-30',
    },
  };
  return Object.freeze({ stageId, ...presentations[stageId] });
}
