import { SCRAP_CAST } from './ScrapCastProfile.js';

export const SCRAP_GARAGE_REVEAL_STAGE = Object.freeze({
  LOCKED: 'locked',
  REPORT_READY: 'report-ready',
  OWNER_ANALYSIS: 'owner-analysis',
  MAP_REVEALED: 'map-revealed',
  GARAGE_OPENED: 'garage-opened',
  COMPLETE: 'complete',
});

export const SCRAP_GARAGE_REVEAL_STAGE_IDS = Object.freeze(
  Object.values(SCRAP_GARAGE_REVEAL_STAGE),
);

const STAGE_INDEX = new Map(
  SCRAP_GARAGE_REVEAL_STAGE_IDS.map((stageId, index) => [stageId, index]),
);

const STAGE_DURATION_SECONDS = Object.freeze({
  [SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS]: 1.5,
  [SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED]: 1.35,
  [SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED]: 1.55,
});

export const SCRAPYARD_OWNER_ANALYSIS_CONVERSATION_ID = 'scrapyard-owner-analysis';

export function assertScrapGarageRevealStageId(stageId) {
  if (!STAGE_INDEX.has(stageId)) {
    throw new TypeError(`지원하지 않는 고물상 차고 reveal stage입니다: ${stageId}`);
  }
  return stageId;
}

export function compareScrapGarageRevealStage(stageId, expectedStageId) {
  return (
    STAGE_INDEX.get(assertScrapGarageRevealStageId(stageId)) -
    STAGE_INDEX.get(assertScrapGarageRevealStageId(expectedStageId))
  );
}

export function nextScrapGarageRevealStage(stageId) {
  const currentIndex = STAGE_INDEX.get(assertScrapGarageRevealStageId(stageId));
  return SCRAP_GARAGE_REVEAL_STAGE_IDS[
    Math.min(currentIndex + 1, SCRAP_GARAGE_REVEAL_STAGE_IDS.length - 1)
  ];
}

export function scrapGarageRevealStageDurationSeconds(stageId) {
  assertScrapGarageRevealStageId(stageId);
  return STAGE_DURATION_SECONDS[stageId] ?? 0;
}

export function isScrapGarageRevealActive(stageId) {
  assertScrapGarageRevealStageId(stageId);
  return [
    SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS,
    SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED,
    SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED,
  ].includes(stageId);
}

export function getScrapGarageRevealPresentation(stageId) {
  assertScrapGarageRevealStageId(stageId);
  const presentations = {
    [SCRAP_GARAGE_REVEAL_STAGE.LOCKED]: {
      title: '첫 수거 의뢰',
      briefing: '폐병기 제어핵을 회수해 고대 병기의 비상 운용을 확인해야 합니다.',
      objective: '폐병기 안의 반짝이는 제어핵을 직접 회수하세요.',
      cue: 'GARAGE · LOCKED',
    },
    [SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY]: {
      title: '고물상으로 복귀',
      briefing: `회수한 제어핵을 ${SCRAP_CAST.SCRAPYARD_OWNER.name}에게 가져가 분석을 부탁합니다.`,
      objective: '왼쪽 고물상 작업대의 주인에게 돌아가 ↑로 보고하세요.',
      cue: `${SCRAP_CAST.SCRAPYARD_OWNER.name} · 상호작용 ↑`,
    },
    [SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS]: {
      title: '퇴직했는데 또 야근',
      briefing: `${SCRAP_CAST.SCRAPYARD_OWNER.name}이 제어핵과 동원 신호의 흔적을 분석합니다.`,
      objective: '제어핵 분석 중 · 조작이 잠시 멈춥니다.',
      cue: 'DEVICE ANALYSIS · FIVE SIGNALS',
    },
    [SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED]: {
      title: '왕국 작전 지도',
      briefing: '벽 지도에 다섯 산업 지역과 고대 병기의 왕도 진로가 켜집니다.',
      objective: '다섯 대지역 경로 확인 · 차고 개방 준비 중',
      cue: 'OPERATION MAP · ONLINE',
    },
    [SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED]: {
      title: '차고문 개방',
      briefing: '회수한 제어핵이 미완성 대항 병기 골격의 두뇌 자리에 장착됩니다.',
      objective: '대항 병기 골격 · 완성도 0% 공개',
      cue: 'GARAGE OPEN · ROBOT 0%',
    },
    [SCRAP_GARAGE_REVEAL_STAGE.COMPLETE]: {
      title: '한 달 작전 시작',
      briefing: '벽 지도와 미완성 로봇이 준비됐습니다. 다섯 기계를 원하는 순서로 구합니다.',
      objective: '벽 지도를 ↑로 조사하거나 MAP을 짧게 눌러 전체 작전을 확인하세요.',
      cue: '5 REGIONS · 0/5 PARTS · ROBOT 0%',
    },
  };
  return Object.freeze({ stageId, ...presentations[stageId] });
}
