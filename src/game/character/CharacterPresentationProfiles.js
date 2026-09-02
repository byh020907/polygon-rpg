import { SCRAP_CAST } from '../campaign/ScrapCastProfile.js';

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}

const RAW_PROFILES = [
  {
    id: 'scrapyard-apprentice',
    label: SCRAP_CAST.PROTAGONIST.name,
    roleLabel: SCRAP_CAST.PROTAGONIST.name,
    family: 'human',
    accent: '#f2a65a',
    material: '#4d6670',
    toolKind: 'tool-bag',
    minimumViewportHeight: 72,
    proportions: { shoulder: 15, hip: 10, head: 8, sideDepth: 8 },
    landmarks: ['고글', '공구 가방', '소매 수리 붕대'],
    representativePose: '가방을 뒤로 두고 검을 뽑는 준비 자세',
  },
  {
    id: 'scrapyard-owner',
    label: SCRAP_CAST.SCRAPYARD_OWNER.name,
    roleLabel: '핵심 NPC',
    family: 'human',
    accent: '#dfc37a',
    material: '#635748',
    toolKind: 'ledger-wrench',
    minimumViewportHeight: 72,
    proportions: { shoulder: 18, hip: 12, head: 8, sideDepth: 9 },
    landmarks: ['용접 고글', '장부', '큰 스패너'],
    representativePose: '장부를 들고 스패너로 차고를 가리키는 자세',
  },
  {
    id: 'rival-scout',
    label: SCRAP_CAST.RIVAL.name,
    roleLabel: '반복 정찰 인물',
    family: 'human',
    accent: '#75d6c4',
    material: '#56666a',
    toolKind: 'salvage-hook',
    minimumViewportHeight: 72,
    proportions: { shoulder: 14, hip: 10, head: 8, sideDepth: 8 },
    landmarks: ['짧은 측량 고글', '갈고리 공구', '청록 수거 표식띠'],
    representativePose: '갈고리를 어깨 뒤로 걸고 다음 경로를 먼저 가리키는 자세',
  },
  {
    id: 'mine-worker',
    label: '폐광 광부',
    roleLabel: '직업 NPC',
    family: 'human',
    accent: '#d5a24c',
    material: '#57493e',
    toolKind: 'pickaxe',
    minimumViewportHeight: 72,
    proportions: { shoulder: 18, hip: 11, head: 8, sideDepth: 9 },
    landmarks: ['광부등', '분진 작업복', '곡괭이'],
    representativePose: '낮은 천장을 확인하며 곡괭이를 지지하는 자세',
  },
  {
    id: 'shipyard-worker',
    label: '조선소 용접공',
    roleLabel: '직업 NPC',
    family: 'human',
    accent: '#56b7c9',
    material: '#3f5661',
    toolKind: 'rivet-gun',
    minimumViewportHeight: 72,
    proportions: { shoulder: 17, hip: 11, head: 8, sideDepth: 9 },
    landmarks: ['용접면', '방열 앞치마', '리벳 건'],
    representativePose: '불꽃을 피해 몸을 틀고 리벳 건을 고정하는 자세',
  },
  {
    id: 'greenhouse-technician',
    label: '온실 기술자',
    roleLabel: '직업 NPC',
    family: 'human',
    accent: '#7fcf7a',
    material: '#426052',
    toolKind: 'sensor-wand',
    minimumViewportHeight: 72,
    proportions: { shoulder: 14, hip: 12, head: 8, sideDepth: 8 },
    landmarks: ['보안경', '필터 조끼', '지열 센서'],
    representativePose: '센서를 땅에 대고 압력계를 읽는 자세',
  },
  {
    id: 'snow-train-crew',
    label: '제설 열차 승무원',
    roleLabel: '직업 NPC',
    family: 'human',
    accent: '#b9d7ec',
    material: '#506070',
    toolKind: 'signal-lamp',
    minimumViewportHeight: 72,
    proportions: { shoulder: 19, hip: 13, head: 8, sideDepth: 10 },
    landmarks: ['방한모', '두꺼운 외투', '신호등'],
    representativePose: '눈바람을 등지고 신호등을 높이 드는 자세',
  },
  {
    id: 'quarry-worker',
    label: '붉은 채석장 채석공',
    roleLabel: '직업 NPC',
    family: 'human',
    accent: '#c85d43',
    material: '#744636',
    toolKind: 'quarry-drill',
    minimumViewportHeight: 72,
    proportions: { shoulder: 20, hip: 13, head: 8, sideDepth: 10 },
    landmarks: ['분진 마스크와 귀마개', '적갈색 방진 작업복', '양손 착암 드릴'],
    representativePose: '발을 넓게 고정하고 착암 드릴의 반동을 아래로 누르는 자세',
  },
  {
    id: 'mine-claim-jacker',
    label: '광산 선점 수거반',
    roleLabel: '인간형 적',
    family: 'human',
    accent: '#e0a14a',
    material: '#4e4038',
    toolKind: 'salvage-cutter',
    minimumViewportHeight: 70,
    proportions: { shoulder: 19, hip: 12, head: 8, sideDepth: 9 },
    landmarks: ['훔친 광부등', '갈색 방진 후드', '절단 토치와 회수 갈고리'],
    representativePose: '광부등을 가리고 절단 토치를 낮게 겨누는 자세',
  },
  {
    id: 'dock-salvage-raider',
    label: '부두 선점 수거반',
    roleLabel: '인간형 적',
    family: 'human',
    accent: '#5bb9c8',
    material: '#304b57',
    toolKind: 'salvage-cutter',
    minimumViewportHeight: 71,
    proportions: { shoulder: 18, hip: 12, head: 8, sideDepth: 9 },
    landmarks: ['낡은 용접면', '청회색 부두 우의', '갈고리 달린 절단 토치'],
    representativePose: '용접면을 내리고 갈고리 토치로 진입선을 막는 자세',
  },
  {
    id: 'snow-route-raider',
    label: '설산 길목 수거반',
    roleLabel: '인간형 적',
    family: 'human',
    accent: '#b8d8eb',
    material: '#475869',
    toolKind: 'salvage-cutter',
    minimumViewportHeight: 73,
    proportions: { shoulder: 20, hip: 13, head: 8, sideDepth: 10 },
    landmarks: ['서리 방독면', '누빔 방한 망토', '열선 절단봉'],
    representativePose: '방한 망토를 붙잡고 열선 절단봉을 넓게 휘두를 준비 자세',
  },
  {
    id: 'collector-unit',
    label: '수거 유닛',
    roleLabel: '고대 병기 동원 신호',
    family: 'machine',
    accent: '#e25f47',
    material: '#4b4f53',
    toolKind: 'magnet-claw',
    minimumViewportHeight: 68,
    proportions: { shoulder: 21, hip: 15, head: 6, sideDepth: 12 },
    landmarks: ['단안 신호등', '자석 집게', '케이블 꼬리'],
    representativePose: '집게를 벌리고 회수 대상을 끌어당기는 준비 자세',
  },
  {
    id: 'industrial-creature',
    label: '설비 기생 기계',
    roleLabel: '산업기계 적',
    family: 'machine',
    accent: '#8ed5bc',
    material: '#40565a',
    toolKind: 'drill-maw',
    minimumViewportHeight: 64,
    proportions: { shoulder: 24, hip: 18, head: 7, sideDepth: 15 },
    landmarks: ['굴착 주둥이', '네 개의 고정 다리', '압력 케이블'],
    representativePose: '앞다리를 고정하고 드릴을 밀어 넣는 예고 자세',
  },
  {
    id: 'regional-boss',
    label: '지역 산업기계 Boss',
    roleLabel: '지역 Boss',
    family: 'machine',
    accent: '#c987e8',
    material: '#51485d',
    toolKind: 'conveyor-ram',
    minimumViewportHeight: 82,
    proportions: { shoulder: 29, hip: 20, head: 8, sideDepth: 17 },
    landmarks: ['회전 경고등', '가동식 압착판', '노출 동력축'],
    representativePose: '압착판을 뒤로 당겨 큰 공격 범위를 예고하는 자세',
  },
  {
    id: 'mine-collapse-boss',
    label: '붕괴 광산 보행 굴착기',
    roleLabel: '폐광 산촌 Boss',
    family: 'machine',
    accent: '#e3a64f',
    material: '#675446',
    toolKind: 'conveyor-ram',
    minimumViewportHeight: 86,
    proportions: { shoulder: 32, hip: 24, head: 7, sideDepth: 19 },
    landmarks: ['황색 회전 경고등', '좌우 유압 다리', '노출된 편심 구동축'],
    representativePose: '한쪽 굴착 다리를 들어 지면 강타 범위를 예고하는 자세',
  },
  {
    id: 'shipyard-twin-crane-boss',
    label: '점거된 쌍둥이 소형 크레인',
    roleLabel: '항구 조선소 Boss',
    family: 'machine',
    accent: '#59c3c6',
    material: '#3f7f83',
    toolKind: 'hydraulic-crane',
    minimumViewportHeight: 88,
    proportions: { shoulder: 34, hip: 25, head: 7, sideDepth: 20 },
    landmarks: ['좌우 유압 붐', '청록 도장강 기둥', '굵은 교차 유압 케이블'],
    representativePose: '한쪽 붐을 뒤로 당기고 다른 붐의 압착 범위를 케이블 장력으로 예고하는 자세',
  },
  {
    id: 'greenhouse-geothermal-boss',
    label: '과열 지열 조절기',
    roleLabel: '온실 평원 Boss',
    family: 'machine',
    accent: '#9bd66b',
    material: '#6f783f',
    toolKind: 'geothermal-manifold',
    minimumViewportHeight: 90,
    proportions: { shoulder: 35, hip: 26, head: 7, sideDepth: 21 },
    landmarks: ['황동 압력 밸브', '좌우 지열 배관', '과열 증기 배출관'],
    representativePose: '한쪽 배관을 들어 증기 분출선을 예고하고 압력 밸브를 노출하는 자세',
  },
  {
    id: 'snowplow-train-boss',
    label: '폭주 장갑 제설 열차',
    roleLabel: '설산 교역로 Boss',
    family: 'machine',
    accent: '#b9d7ec',
    material: '#506b7b',
    toolKind: 'snowplow-train',
    minimumViewportHeight: 92,
    proportions: { shoulder: 38, hip: 29, head: 7, sideDepth: 23 },
    landmarks: ['쐐기형 제설판', '궤도형 구동륜', '청백 열선 리벳'],
    representativePose: '차체를 낮추고 제설판의 넓은 돌진 범위와 노출 제동축을 예고하는 자세',
  },
  {
    id: 'quarry-rock-cutter-boss',
    label: '폭주 초대형 암반 절단기',
    roleLabel: '붉은 채석장 Boss',
    family: 'machine',
    accent: '#d25b43',
    material: '#704637',
    toolKind: 'rock-cutting-machine',
    minimumViewportHeight: 94,
    proportions: { shoulder: 40, hip: 31, head: 7, sideDepth: 25 },
    landmarks: ['적갈색 중량 본체', '초대형 수직 절단날', '노출된 황동 가동 베어링'],
    representativePose:
      '본체 지지대를 낮추고 절단날을 뒤로 들어 광폭 내려찍기와 베어링 노출을 예고하는 자세',
  },
];

function validateProfile(profile) {
  if (!profile.id || !profile.label || !profile.roleLabel) {
    throw new TypeError('Character Presentation Profile에는 stable ID와 label이 필요합니다.');
  }
  if (!['human', 'machine'].includes(profile.family)) {
    throw new TypeError(`지원하지 않는 character family입니다: ${profile.family}`);
  }
  if (!Number.isFinite(profile.minimumViewportHeight) || profile.minimumViewportHeight < 48) {
    throw new RangeError(`${profile.id}의 minimum viewport height가 너무 작습니다.`);
  }
  if (!Array.isArray(profile.landmarks) || profile.landmarks.length < 3) {
    throw new TypeError(`${profile.id}에는 최소 세 개의 silhouette landmark가 필요합니다.`);
  }
  if (!profile.representativePose) {
    throw new TypeError(`${profile.id}에는 representative pose가 필요합니다.`);
  }
  return profile;
}

const profiles = RAW_PROFILES.map((profile) => deepFreeze(validateProfile(profile)));
const byId = new Map(profiles.map((profile) => [profile.id, profile]));

export const CHARACTER_PRESENTATION_PROFILE = deepFreeze({
  profiles,
  comparisonViews: ['front', 'side', 'representative-pose'],
  actualGameplayScaleLabel: '64~82 logical px · 960×540 gameplay viewport',
  getProfile(profileId) {
    return byId.get(profileId) ?? null;
  },
});
