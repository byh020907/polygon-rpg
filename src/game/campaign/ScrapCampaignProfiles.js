import {
  SCRAP_CAMPAIGN_CAPITAL_ID,
  SCRAP_CAMPAIGN_INITIAL_DEADLINE_SEGMENTS,
  SCRAP_CAMPAIGN_REGION_IDS,
  SCRAP_CAMPAIGN_START_LOCATION_ID,
} from './ScrapCampaignContract.js';

function freezeRegion(region) {
  return Object.freeze({
    ...region,
    route: Object.freeze({ ...region.route }),
    event: Object.freeze({ ...region.event }),
    eventStages: Object.freeze(region.eventStages.map((stage) => Object.freeze({ ...stage }))),
    mapPatches: Object.freeze({ ...region.mapPatches }),
    part: Object.freeze({ ...region.part }),
    visual: Object.freeze({ ...region.visual }),
  });
}

const REGION_EVENT_STAGE_KINDS = Object.freeze([
  Object.freeze({ id: 'npc-briefing', label: 'NPC 말풍선' }),
  Object.freeze({ id: 'facility-observed', label: '지역 상태 확인' }),
  Object.freeze({ id: 'journey-combat', label: '이동·전투 사건' }),
  Object.freeze({ id: 'boss-defeated', label: 'Boss 해결' }),
  Object.freeze({ id: 'replacement-complete', label: '대체 설비·마지막 작업 완료' }),
  Object.freeze({ id: 'machine-separated', label: '산업기계 분리' }),
  Object.freeze({ id: 'part-claimed', label: '로봇 부품 회수' }),
  Object.freeze({ id: 'campaign-updated', label: 'D-DAY·경로·차고 갱신' }),
]);

function eventStages(regionId) {
  return REGION_EVENT_STAGE_KINDS.map((stage) => ({
    id: `${regionId}:${stage.id}`,
    kind: stage.id,
    label: stage.label,
  }));
}

function mapPatches(regionId) {
  return {
    before: `${regionId}:facility-operating`,
    partReady: `${regionId}:machine-separated`,
    resolved: `${regionId}:facility-replaced-machine-removed`,
    convoy: `${regionId}:facility-destroyed-convoy-route`,
  };
}

const regions = [
  freezeRegion({
    id: 'abandoned-mine',
    label: '폐광 산촌',
    route: { travelSegments: 1, rivalArrivalSegment: 10 },
    event: { costSegments: 10, extensionSegments: 8, label: '붕괴 광산 구조와 굴착기 인수' },
    eventStages: eventStages('abandoned-mine'),
    mapPatches: mapPatches('abandoned-mine'),
    machineLabel: '보행식 대형 굴착기',
    part: { id: 'walker-drive', label: '굴착기 하체·구동부', robotModule: '다리' },
    visual: { color: '#c57d45', material: '암갈색 철판·광산 경고띠' },
  }),
  freezeRegion({
    id: 'harbor-shipyard',
    label: '항구 조선소',
    route: { travelSegments: 1, rivalArrivalSegment: 24 },
    event: { costSegments: 14, extensionSegments: 12, label: '조선소 탈환과 마지막 선박 수리' },
    eventStages: eventStages('harbor-shipyard'),
    mapPatches: mapPatches('harbor-shipyard'),
    machineLabel: '쌍둥이 소형 크레인',
    part: { id: 'crane-hydraulics', label: '크레인 유압 장치', robotModule: '팔' },
    visual: { color: '#4fa7ad', material: '청록 도장강·굵은 케이블' },
  }),
  freezeRegion({
    id: 'greenhouse-plains',
    label: '온실 평원',
    route: { travelSegments: 1, rivalArrivalSegment: 40 },
    event: { costSegments: 18, extensionSegments: 16, label: '지열 설비 복구와 구형 동력로 분리' },
    eventStages: eventStages('greenhouse-plains'),
    mapPatches: mapPatches('greenhouse-plains'),
    machineLabel: '구형 고출력 마력 동력로',
    part: { id: 'arcane-reactor', label: '고출력 동력로', robotModule: '주 동력원' },
    visual: { color: '#8fbd5c', material: '온실 황동·지열 배관' },
  }),
  freezeRegion({
    id: 'snow-trade-road',
    label: '설산 교역로',
    route: { travelSegments: 1, rivalArrivalSegment: 58 },
    event: { costSegments: 16, extensionSegments: 12, label: '옛 터널 개통과 제설 열차 인수' },
    eventStages: eventStages('snow-trade-road'),
    mapPatches: mapPatches('snow-trade-road'),
    machineLabel: '장갑 제설 열차',
    part: { id: 'snowplow-armor', label: '제설 열차 장갑 차체', robotModule: '장갑' },
    visual: { color: '#a9c7d8', material: '백청 장갑판·열선 리벳' },
  }),
  freezeRegion({
    id: 'red-quarry',
    label: '붉은 채석장',
    route: { travelSegments: 1, rivalArrivalSegment: 78 },
    event: { costSegments: 22, extensionSegments: 20, label: '마지막 채굴과 채석장 안전 폐쇄' },
    eventStages: eventStages('red-quarry'),
    mapPatches: mapPatches('red-quarry'),
    machineLabel: '초대형 암반 절단기',
    part: { id: 'quarry-cutter', label: '초대형 암반 절단기', robotModule: '거대 검' },
    visual: { color: '#cf5d48', material: '적철 강판·절단 톱날' },
  }),
];

if (
  regions.length !== SCRAP_CAMPAIGN_REGION_IDS.length ||
  regions.some((region, index) => region.id !== SCRAP_CAMPAIGN_REGION_IDS[index])
) {
  throw new Error('고철 캠페인 region profile 순서가 stable contract와 일치해야 합니다.');
}

const regionById = new Map(regions.map((region) => [region.id, region]));
const routes = regions.map((region) =>
  Object.freeze({
    id: `road:${SCRAP_CAMPAIGN_START_LOCATION_ID}:${region.id}`,
    fromId: SCRAP_CAMPAIGN_START_LOCATION_ID,
    toId: region.id,
    travelSegments: region.route.travelSegments,
  }),
);

export const SCRAP_CAMPAIGN_PROFILE = Object.freeze({
  id: 'scrap-king-d30',
  startLocation: Object.freeze({ id: SCRAP_CAMPAIGN_START_LOCATION_ID, label: '동네 고물상' }),
  capital: Object.freeze({ id: SCRAP_CAMPAIGN_CAPITAL_ID, label: '왕국 수도' }),
  initialDeadlineSegments: SCRAP_CAMPAIGN_INITIAL_DEADLINE_SEGMENTS,
  convoyChaseCostSegments: 2,
  regions: Object.freeze(regions),
  routes: Object.freeze(routes),
  getRegion(regionId) {
    return regionById.get(regionId) ?? null;
  },
});
