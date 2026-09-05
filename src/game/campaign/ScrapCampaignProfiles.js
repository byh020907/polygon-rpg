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
    routeDetour: Object.freeze({ ...region.routeDetour }),
    event: Object.freeze({ ...region.event }),
    eventStages: Object.freeze(region.eventStages.map((stage) => Object.freeze({ ...stage }))),
    objectives: Object.freeze({ ...region.objectives }),
    mapPatches: Object.freeze({ ...region.mapPatches }),
    part: Object.freeze({ ...region.part }),
    visual: Object.freeze({ ...region.visual }),
  });
}

function freezeLinkedIssue(linkedIssue) {
  return Object.freeze({
    ...linkedIssue,
    requiredEncounterIds: Object.freeze([...(linkedIssue.requiredEncounterIds ?? [])]),
  });
}

function freezePrimaryIssue(issue) {
  return Object.freeze({
    ...issue,
    linkedIssues: Object.freeze(
      issue.linkedIssues.map((linkedIssue) => freezeLinkedIssue(linkedIssue)),
    ),
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
  };
}

const regions = [
  freezeRegion({
    id: 'abandoned-mine',
    label: '폐광 산촌',
    route: { travelSegments: 1, rivalArrivalSegment: 10 },
    routeDetour: {
      segments: 8,
      closureLabel: '굴착기가 옛 군사 지하도를 붕괴',
      detourLabel: '서부 갱도 우회',
    },
    event: { costSegments: 9, extensionSegments: 8, label: '붕괴 광산 구조와 굴착기 인수' },
    eventStages: eventStages('abandoned-mine', {
      'npc-briefing': '오른쪽 구조 현황판에서 붕괴 범위, 9구간 비용과 성공 연장을 확인하세요.',
      'facility-observed': '오른쪽 구조 갱도로 들어가 선점 수거반을 물리고 작업자 길을 확보하세요.',
      'journey-combat': '확보한 갱도 오른쪽에서 굴착기 작업장으로 이동해 Boss를 제압하세요.',
      'boss-defeated': '작업장 왼쪽에서 광부와 굴착기로 옛 군사 지하도를 무너뜨리세요.',
      'replacement-complete': '보행식 굴착기 본체를 조사해 하체·구동부를 분리하세요.',
      'machine-separated': '오른쪽 회수대에서 굴착기 하체·구동부를 수령하세요.',
      'part-claimed': '고물상 차고와 작전 지도에서 새 다리와 다음 지역을 확인하세요.',
      'campaign-updated': '고물상 차고와 작전 지도에서 새 다리와 다음 지역을 확인하세요.',
    }),
    objectives: {
      arrival: '광부 작업반장에게 붕괴 광산의 구조 상황을 들으세요.',
      eventStart: '핵심 사건을 확정해 9구간 구조 작업을 시작하세요.',
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
    routeDetour: {
      segments: 12,
      closureLabel: '크레인이 퇴역 화물선으로 고대 교량을 절단',
      detourLabel: '해안 외곽 우회',
    },
    event: { costSegments: 13, extensionSegments: 12, label: '조선소 탈환과 마지막 선박 수리' },
    eventStages: eventStages('harbor-shipyard', {
      'npc-briefing': '오른쪽 도크 현황판에서 점거 범위, 13구간 비용과 성공 연장을 확인하세요.',
      'facility-observed': '점거된 건선거로 들어가 선점 수거반을 물리고 선박 수리선을 확보하세요.',
      'journey-combat': '확보한 건선거 끝에서 쌍둥이 크레인 부두로 이동해 Boss를 제압하세요.',
      'boss-defeated': '조선공과 퇴역 화물선을 들어 고대 교량을 절단하세요.',
      'replacement-complete': '쌍둥이 크레인의 압력을 빼고 유압 장치를 분리하세요.',
      'machine-separated': '부두 회수대에서 크레인 유압 장치를 수령하세요.',
      'part-claimed': '고물상 차고와 작전 지도에서 새 팔과 다음 지역을 확인하세요.',
      'campaign-updated': '고물상 차고와 작전 지도에서 새 팔과 다음 지역을 확인하세요.',
    }),
    objectives: {
      arrival: '조선소 용접공에게 점거된 도크와 마지막 선박 수리 상황을 들으세요.',
      eventStart: '핵심 사건을 확정해 13구간 조선소 탈환과 수리를 시작하세요.',
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
    routeDetour: {
      segments: 16,
      closureLabel: '동력로가 관개 펌프를 가동해 평원을 습지로 변경',
      detourLabel: '습지 외곽 우회',
    },
    event: { costSegments: 17, extensionSegments: 16, label: '지열 설비 복구와 구형 동력로 분리' },
    eventStages: eventStages('greenhouse-plains', {
      'npc-briefing': '오른쪽 지열 압력판에서 파손 범위, 17구간 비용과 성공 연장을 확인하세요.',
      'facility-observed':
        '파열된 온실 배관 구역으로 들어가 기생 기계를 제거하고 복구선을 확보하세요.',
      'journey-combat': '복구선을 따라 구형 동력로실로 이동해 과열 조절기 Boss를 제압하세요.',
      'boss-defeated':
        '온실 기술자와 동력로로 관개 펌프를 최대 출력 가동해 평원을 습지로 바꾸세요.',
      'replacement-complete': '구형 고출력 동력로를 냉각하고 주 동력원을 분리하세요.',
      'machine-separated': '동력로실 회수대에서 고출력 동력로를 수령하세요.',
      'part-claimed': '고물상 차고와 작전 지도에서 새 주 동력원과 다음 지역을 확인하세요.',
      'campaign-updated': '고물상 차고와 작전 지도에서 새 주 동력원과 다음 지역을 확인하세요.',
    }),
    objectives: {
      arrival: '온실 기술자에게 지열 배관 파열과 작물 난방 상황을 들으세요.',
      eventStart: '핵심 사건을 확정해 17구간 지열 설비 복구를 시작하세요.',
      resolved:
        '고출력 동력로 수송이 끝났습니다. 실제 연결로로 고물상에 돌아가 누적 조립 상태를 확인하세요.',
    },
    mapPatches: mapPatches('greenhouse-plains'),
    machineLabel: '구형 고출력 마력 동력로',
    part: { id: 'arcane-reactor', label: '고출력 동력로', robotModule: '주 동력원' },
    visual: { color: '#8fbd5c', material: '온실 황동·지열 배관' },
  }),
  freezeRegion({
    id: 'snow-trade-road',
    label: '설산 교역로',
    route: { travelSegments: 1, rivalArrivalSegment: 58 },
    routeDetour: {
      segments: 12,
      closureLabel: '제설 열차가 눈사태 방벽을 무너뜨려 산길을 폐쇄',
      detourLabel: '설산 능선 우회',
    },
    event: { costSegments: 13, extensionSegments: 12, label: '옛 터널 개통과 제설 열차 인수' },
    eventStages: eventStages('snow-trade-road', {
      'npc-briefing': '오른쪽 운행 현황판에서 적설 구간, 13구간 비용과 성공 연장을 확인하세요.',
      'facility-observed':
        '눈에 막힌 옛 터널로 들어가 열선 케이블을 훔치는 길목 수거반을 물리세요.',
      'journey-combat':
        '개통 신호를 따라 제설 열차 대피선으로 이동해 폭주 기관차 Boss를 제압하세요.',
      'boss-defeated': '열차 승무원과 제설 열차로 눈사태 방벽을 무너뜨려 산길을 폐쇄하세요.',
      'replacement-complete': '장갑 제설 열차의 제동을 잠그고 방한 차체를 분리하세요.',
      'machine-separated': '대피선 회수대에서 제설 열차 장갑 차체를 수령하세요.',
      'part-claimed': '고물상 차고와 작전 지도에서 새 장갑과 다음 지역을 확인하세요.',
      'campaign-updated': '고물상 차고와 작전 지도에서 새 장갑과 다음 지역을 확인하세요.',
    }),
    objectives: {
      arrival: '제설 열차 승무원에게 막힌 옛 터널과 고립된 교역로 상황을 들으세요.',
      eventStart: '핵심 사건을 확정해 13구간 옛 터널 개통 작업을 시작하세요.',
      resolved:
        '제설 열차 장갑 수송이 끝났습니다. 실제 연결로로 고물상에 돌아가 누적 조립 상태를 확인하세요.',
    },
    mapPatches: mapPatches('snow-trade-road'),
    machineLabel: '장갑 제설 열차',
    part: { id: 'snowplow-armor', label: '제설 열차 장갑 차체', robotModule: '장갑' },
    visual: { color: '#a9c7d8', material: '백청 장갑판·열선 리벳' },
  }),
  freezeRegion({
    id: 'red-quarry',
    label: '붉은 채석장',
    route: { travelSegments: 1, rivalArrivalSegment: 78 },
    routeDetour: {
      segments: 20,
      closureLabel: '절단기가 왕도 방향 석조 고가도로 지지대를 절단',
      detourLabel: '채석 절벽 우회',
    },
    event: { costSegments: 21, extensionSegments: 20, label: '마지막 채굴과 채석장 안전 폐쇄' },
    eventStages: eventStages('red-quarry', {
      'npc-briefing': '오른쪽 안전 작업판에서 남은 절개면, 21구간 비용과 성공 연장을 확인하세요.',
      'facility-observed':
        '마지막 절개 갱도로 들어가 발파선을 훔치는 수거 유닛을 제거하고 채굴선을 확보하세요.',
      'journey-combat':
        '확보한 절개면 끝에서 암반 절단기 작업장으로 이동해 폭주 절단기 Boss를 제압하세요.',
      'boss-defeated': '채석공과 절단기로 왕도 방향 석조 고가도로 지지대를 절단하세요.',
      'replacement-complete': '초대형 암반 절단기의 회전축을 잠그고 절단검 모듈을 분리하세요.',
      'machine-separated': '작업장 회수대에서 초대형 암반 절단검을 수령하세요.',
      'part-claimed': '고물상 차고와 작전 지도에서 거대 검과 완성도 100%를 확인하세요.',
      'campaign-updated': '고물상 차고와 작전 지도에서 거대 검과 완성도 100%를 확인하세요.',
    }),
    objectives: {
      arrival: '채석공 작업반장에게 마지막 채굴과 안전 폐쇄 상황을 들으세요.',
      eventStart: '핵심 사건을 확정해 21구간 마지막 채굴과 안전 폐쇄 작업을 시작하세요.',
      resolved:
        '암반 절단검 수송이 끝났습니다. 실제 연결로로 고물상에 돌아가 로봇 100%를 확인하세요.',
    },
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

const primaryIssues = [
  freezePrimaryIssue({
    id: 'mine-rescue-operation',
    regionId: 'abandoned-mine',
    label: '붕괴 광산 작업자 구조',
    objective: '항구와 온실에서 구조 설비를 확보한 뒤 폐광 산촌으로 돌아오세요.',
    linkedIssues: [
      {
        id: 'mine-harbor-lift-cable',
        targetRegionId: 'harbor-shipyard',
        label: '승강기용 crane cable 확보',
        objective: '점거된 도크에서 구조용 굵은 cable의 위치와 인양 상태를 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '항구 도크 crane cable 현장 확인',
        encounterLabel: '건선거 점거 세력 제압',
        requiredEncounterIds: ['shipyard-drydock-collector', 'dock-salvage-raider'],
      },
      {
        id: 'mine-greenhouse-pressure-brace',
        targetRegionId: 'greenhouse-plains',
        label: '승강기 압력 버팀쇠 설계 확인',
        objective: '온실 기술자와 파열 배관을 조사해 압력 버팀쇠 규격을 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '온실 지열 배관 현장 확인',
        encounterLabel: '파열 배관 기생 기계 제압',
        requiredEncounterIds: ['greenhouse-pipe-parasite'],
      },
    ],
  }),
  freezePrimaryIssue({
    id: 'shipyard-recovery-operation',
    regionId: 'harbor-shipyard',
    label: '조선소 탈환과 마지막 선박 수리',
    objective: '온실과 설산에서 수리 자재를 확보한 뒤 항구 조선소로 돌아오세요.',
    linkedIssues: [
      {
        id: 'shipyard-greenhouse-coolant',
        targetRegionId: 'greenhouse-plains',
        label: '용접선 냉각수 확보',
        objective: '파열 배관 구역에서 용접선을 식힐 지열 냉각수 상태를 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '온실 지열 냉각수 현장 확인',
        encounterLabel: '냉각수 기생 기계 제압',
        requiredEncounterIds: ['greenhouse-coolant-parasite'],
      },
      {
        id: 'shipyard-snow-haul-winch',
        targetRegionId: 'snow-trade-road',
        label: '선박 인양 winch 규격 확인',
        objective: '제설 열차 승무원에게 산악 인양 winch 규격을 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '설산 열차 설비 현장 확인',
        encounterLabel: '설산 길목 수거반 제압',
        requiredEncounterIds: ['snow-route-raider'],
      },
    ],
  }),
  freezePrimaryIssue({
    id: 'greenhouse-restoration-operation',
    regionId: 'greenhouse-plains',
    label: '온실 지열 설비 복구',
    objective: '설산과 폐광에서 내열 부품을 확보한 뒤 온실 평원으로 돌아오세요.',
    linkedIssues: [
      {
        id: 'greenhouse-snow-thermal-cable',
        targetRegionId: 'snow-trade-road',
        label: '내한 열선 cable 확보',
        objective: '눈 막힌 옛 터널에서 지열 배관용 내한 cable 상태를 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '설산 터널 내한 cable 현장 확인',
        encounterLabel: '내한 케이블 절취 세력 제압',
        requiredEncounterIds: ['snow-thermal-raider'],
      },
      {
        id: 'greenhouse-mine-seal-plate',
        targetRegionId: 'abandoned-mine',
        label: '배관 밀폐 철판 규격 확인',
        objective: '폐광 구조 현황판에서 굴착기용 밀폐 철판 규격을 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '폐광 구조 설비 현장 확인',
      },
    ],
  }),
  freezePrimaryIssue({
    id: 'snow-route-operation',
    regionId: 'snow-trade-road',
    label: '옛 터널 개통과 교역로 복구',
    objective: '채석장과 항구에서 열원·배관을 확보한 뒤 설산 교역로로 돌아오세요.',
    linkedIssues: [
      {
        id: 'snow-quarry-heat-stone',
        targetRegionId: 'red-quarry',
        label: '터널 축열석 확보',
        objective: '채석장 절개 갱도에서 터널 열선용 축열석 상태를 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '채석장 축열석 현장 확인',
      },
      {
        id: 'snow-shipyard-insulated-hose',
        targetRegionId: 'harbor-shipyard',
        label: '제동용 단열 hose 규격 확인',
        objective: '항구 도크에서 크레인 유압 hose의 단열 규격을 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '항구 도크 설비 현장 확인',
      },
    ],
  }),
  freezePrimaryIssue({
    id: 'quarry-closure-operation',
    regionId: 'red-quarry',
    label: '마지막 채굴과 안전 폐쇄',
    objective: '폐광과 온실에서 지지·냉각 기술을 확보한 뒤 붉은 채석장으로 돌아오세요.',
    linkedIssues: [
      {
        id: 'quarry-mine-roof-brace',
        targetRegionId: 'abandoned-mine',
        label: '절개면 지지대 확보',
        objective: '폐광 구조 갱도에서 채석장 폐쇄용 지지대 규격을 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '폐광 지지대 현장 확인',
      },
      {
        id: 'quarry-greenhouse-cooling-mist',
        targetRegionId: 'greenhouse-plains',
        label: '절단기 냉각 분무 규격 확인',
        objective: '온실 배관 현장에서 절단기 냉각 분무 규격을 확인하세요.',
        completionStageKind: 'facility-observed',
        completionEvidence: '온실 지열 배관 현장 확인',
      },
    ],
  }),
];

const primaryIssueById = new Map(primaryIssues.map((issue) => [issue.id, issue]));
const primaryIssueByRegionId = new Map(primaryIssues.map((issue) => [issue.regionId, issue]));
const linkedIssueById = new Map(
  primaryIssues.flatMap((primaryIssue) =>
    primaryIssue.linkedIssues.map((linkedIssue) => [linkedIssue.id, linkedIssue]),
  ),
);

export const SCRAP_CAMPAIGN_PROFILE = Object.freeze({
  id: 'ancient-weapon-d30',
  startLocation: Object.freeze({ id: SCRAP_CAMPAIGN_START_LOCATION_ID, label: '동네 고물상' }),
  capital: Object.freeze({ id: SCRAP_CAMPAIGN_CAPITAL_ID, label: '왕국 수도' }),
  initialDeadlineSegments: SCRAP_CAMPAIGN_INITIAL_DEADLINE_SEGMENTS,
  regions: Object.freeze(regions),
  routes: Object.freeze(routes),
  primaryIssues: Object.freeze(primaryIssues),
  pacing: Object.freeze({
    targetPlayMinutes: 600,
    targetRegionMinutes: 120,
    focusedTravelSegments: 19,
    focusedInitialBudgetMinimumPercent: 75,
    focusedInitialBudgetMaximumPercent: 80,
  }),
  getRegion(regionId) {
    return regionById.get(regionId) ?? null;
  },
  getPrimaryIssue(issueId) {
    return primaryIssueById.get(issueId) ?? null;
  },
  getPrimaryIssueForRegion(regionId) {
    return primaryIssueByRegionId.get(regionId) ?? null;
  },
  getLinkedIssue(issueId) {
    return linkedIssueById.get(issueId) ?? null;
  },
});
