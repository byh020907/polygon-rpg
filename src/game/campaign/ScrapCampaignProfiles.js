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
    objectives: Object.freeze({ ...region.objectives }),
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

function eventStages(regionId, nextObjectives = {}) {
  return REGION_EVENT_STAGE_KINDS.map((stage) => ({
    id: `${regionId}:${stage.id}`,
    kind: stage.id,
    label: stage.label,
    nextObjective: nextObjectives[stage.id] ?? `${stage.label} 다음 현장 단계를 확인하세요.`,
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
    eventStages: eventStages('abandoned-mine', {
      'npc-briefing': '오른쪽 구조 현황판에서 붕괴 범위, 10구간 비용과 성공 연장을 확인하세요.',
      'facility-observed': '오른쪽 구조 갱도로 들어가 수거 유닛을 제거하고 작업자 길을 확보하세요.',
      'journey-combat': '확보한 갱도 오른쪽에서 굴착기 작업장으로 이동해 Boss를 제압하세요.',
      'boss-defeated': '작업장 왼쪽에서 광부와 새 갱도 버팀목을 체결하세요.',
      'replacement-complete': '보행식 굴착기 본체를 조사해 하체·구동부를 분리하세요.',
      'machine-separated': '오른쪽 회수대에서 굴착기 하체·구동부를 수령하세요.',
      'part-claimed': '고물상 차고와 작전 지도에서 새 다리와 다음 지역을 확인하세요.',
      'campaign-updated': '고물상 차고와 작전 지도에서 새 다리와 다음 지역을 확인하세요.',
    }),
    objectives: {
      arrival: '광부 작업반장에게 붕괴 광산의 구조 상황을 들으세요.',
      eventStart: '핵심 사건을 확정해 10구간 구조 작업을 시작하세요.',
      resolved:
        '굴착기 다리 수송이 끝났습니다. 실제 연결로로 고물상에 돌아가 차고 20%를 확인하세요.',
    },
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
    eventStages: eventStages('harbor-shipyard', {
      'npc-briefing': '오른쪽 도크 현황판에서 점거 범위, 14구간 비용과 성공 연장을 확인하세요.',
      'facility-observed': '점거된 건선거로 들어가 수거 유닛을 제거하고 선박 수리선을 확보하세요.',
      'journey-combat': '확보한 건선거 끝에서 쌍둥이 크레인 부두로 이동해 Boss를 제압하세요.',
      'boss-defeated': '조선공과 마지막 선박의 외판 수리를 끝내세요.',
      'replacement-complete': '쌍둥이 크레인의 압력을 빼고 유압 장치를 분리하세요.',
      'machine-separated': '부두 회수대에서 크레인 유압 장치를 수령하세요.',
      'part-claimed': '고물상 차고와 작전 지도에서 새 팔과 다음 지역을 확인하세요.',
      'campaign-updated': '고물상 차고와 작전 지도에서 새 팔과 다음 지역을 확인하세요.',
    }),
    objectives: {
      arrival: '조선소 용접공에게 점거된 도크와 마지막 선박 수리 상황을 들으세요.',
      eventStart: '핵심 사건을 확정해 14구간 조선소 탈환과 수리를 시작하세요.',
      resolved:
        '크레인 팔 수송이 끝났습니다. 실제 연결로로 고물상에 돌아가 누적 조립 상태를 확인하세요.',
    },
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
    objectives: {},
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
    objectives: {},
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
    objectives: {},
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
