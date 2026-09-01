import { SCRAP_AWAKENING_STAGE } from '../campaign/ScrapAwakeningState.js';
import {
  SCRAP_GARAGE_REVEAL_STAGE,
  SCRAPYARD_OWNER_ANALYSIS_CONVERSATION_ID,
} from '../campaign/ScrapGarageRevealState.js';
import { defineMap } from '../map/MapDefinition.js';
import { createEnvironmentPortalLandmarkItems } from './PortalRenderItems.js';

export const SCRAP_AWAKENING_MAP_ID = 'scrap-awakening-commission';
export const SCRAP_AWAKENING_REGION_ID = 'scrap-waste-edge';
export const SCRAP_AWAKENING_ROOM_ID = 'abandoned-weapon-yard';
export const SCRAP_AWAKENING_DEVICE_ENTITY_ID = 'scrap-control-device';
export const SCRAP_AWAKENING_FOCUS_X = 980;
export const SCRAP_GARAGE_REVEAL_FOCUS_X = 300;
export const SCRAPYARD_OWNER_ENTITY_ID = 'scrapyard-owner-analysis';
export const SCRAPYARD_WALL_MAP_ENTITY_ID = 'scrapyard-wall-operation-map';
export const SCRAP_MINE_ROAD_PORTAL_ID = 'scrapyard-abandoned-mine-road';
export const SCRAP_MINE_ROAD_REGION_ID = 'abandoned-mine';
export const SCRAP_MINE_ROAD_ROOM_ID = 'abandoned-mine-roadhead';
export const SCRAP_MINE_TUNNEL_ROOM_ID = 'abandoned-mine-rescue-tunnel';
export const SCRAP_MINE_MACHINE_ROOM_ID = 'abandoned-mine-machine-yard';
export const SCRAP_MINE_FOREMAN_CONVERSATION_ID = 'abandoned-mine:foreman-briefing';
export const SCRAP_MINE_FACILITY_CONVERSATION_ID = 'abandoned-mine:facility-observed';
export const SCRAP_MINE_REPLACEMENT_CONVERSATION_ID = 'abandoned-mine:replacement-complete';
export const SCRAP_MINE_SEPARATION_CONVERSATION_ID = 'abandoned-mine:machine-separated';
export const SCRAP_MINE_PART_CONVERSATION_ID = 'abandoned-mine:part-claimed';
export const SCRAP_SHIPYARD_ROAD_PORTAL_ID = 'scrapyard-harbor-shipyard-road';
export const SCRAP_SHIPYARD_REGION_ID = 'harbor-shipyard';
export const SCRAP_SHIPYARD_ROAD_ROOM_ID = 'harbor-shipyard-roadhead';
export const SCRAP_SHIPYARD_DRYDOCK_ROOM_ID = 'harbor-shipyard-occupied-drydock';
export const SCRAP_SHIPYARD_CRANE_ROOM_ID = 'harbor-shipyard-twin-crane-pier';
export const SCRAP_SHIPYARD_WORKER_CONVERSATION_ID = 'harbor-shipyard:worker-briefing';
export const SCRAP_SHIPYARD_FACILITY_CONVERSATION_ID = 'harbor-shipyard:facility-observed';
export const SCRAP_SHIPYARD_REPLACEMENT_CONVERSATION_ID = 'harbor-shipyard:replacement-complete';
export const SCRAP_SHIPYARD_SEPARATION_CONVERSATION_ID = 'harbor-shipyard:machine-separated';
export const SCRAP_SHIPYARD_PART_CONVERSATION_ID = 'harbor-shipyard:part-claimed';
export const SCRAP_GREENHOUSE_ROAD_PORTAL_ID = 'scrapyard-greenhouse-plains-road';
export const SCRAP_GREENHOUSE_REGION_ID = 'greenhouse-plains';
export const SCRAP_GREENHOUSE_ROAD_ROOM_ID = 'greenhouse-plains-roadhead';
export const SCRAP_GREENHOUSE_PIPE_ROOM_ID = 'greenhouse-plains-broken-pipeline';
export const SCRAP_GREENHOUSE_REACTOR_ROOM_ID = 'greenhouse-plains-reactor-house';
export const SCRAP_GREENHOUSE_TECHNICIAN_CONVERSATION_ID = 'greenhouse-plains:technician-briefing';
export const SCRAP_GREENHOUSE_FACILITY_CONVERSATION_ID = 'greenhouse-plains:facility-observed';
export const SCRAP_GREENHOUSE_REPLACEMENT_CONVERSATION_ID =
  'greenhouse-plains:replacement-complete';
export const SCRAP_GREENHOUSE_SEPARATION_CONVERSATION_ID = 'greenhouse-plains:machine-separated';
export const SCRAP_GREENHOUSE_PART_CONVERSATION_ID = 'greenhouse-plains:part-claimed';

const PALETTE = Object.freeze({
  background: '#171a1c',
  arena: '#3b4748',
  grid: '#5b6865',
  gridRetro: '#424d4c',
  ground: '#302d29',
  outline: '#111416',
});

function rectangle(x, y, width, height) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

function polygon(cx, cy, radiusX, radiusY, sides, angleOffset = 0) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = angleOffset + (index / sides) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radiusX, y: cy + Math.sin(angle) * radiusY };
  });
}

function item(id, points, fill, options = {}) {
  return {
    id,
    points,
    fill,
    stroke: options.stroke ?? '#17191a',
    lineWidth: options.lineWidth ?? 2,
    opacity: options.opacity ?? 1,
    order: options.order ?? 0,
    renderOrder: options.renderOrder ?? 30,
    enabled: options.enabled ?? true,
    presentationOnly: options.presentationOnly ?? true,
    ...(options.label ? { label: options.label } : {}),
    ...(options.role ? { role: options.role } : {}),
  };
}

const renderItems = [
  item(
    'scrap-yard-skyline',
    [
      { x: 0, y: 310 },
      { x: 120, y: 224 },
      { x: 244, y: 296 },
      { x: 390, y: 202 },
      { x: 556, y: 302 },
      { x: 720, y: 216 },
      { x: 888, y: 294 },
      { x: 1050, y: 176 },
      { x: 1210, y: 286 },
      { x: 1440, y: 208 },
      { x: 1440, y: 426 },
      { x: 0, y: 426 },
    ],
    '#283536',
    { stroke: '#172021', order: -80 },
  ),
  item('scrap-yard-ground', rectangle(0, 426, 1440, 114), '#39342e', {
    stroke: '#1f1c1a',
    order: 0,
  }),
  item('scrap-yard-track', rectangle(0, 442, 1440, 24), '#5b554b', {
    stroke: '#25231f',
    order: 1,
  }),
  item('scrap-yard-track-left', rectangle(92, 438, 14, 70), '#8d633e', { order: 2 }),
  item('scrap-yard-track-mid', rectangle(468, 438, 14, 70), '#8d633e', { order: 2 }),
  item('scrap-yard-track-right', rectangle(828, 438, 14, 70), '#8d633e', { order: 2 }),
  item('salvage-crane-tower', rectangle(152, 160, 34, 266), '#6e5c48', {
    stroke: '#2b2722',
    order: 3,
  }),
  item(
    'salvage-crane-arm',
    [
      { x: 168, y: 166 },
      { x: 520, y: 112 },
      { x: 530, y: 132 },
      { x: 182, y: 192 },
    ],
    '#9b6940',
    { stroke: '#332820', order: 4 },
  ),
  item('salvage-crane-cable', rectangle(500, 126, 5, 128), '#28292a', {
    lineWidth: 1,
    order: 3,
  }),
  item('salvage-crane-hook', polygon(502, 265, 14, 18, 7, Math.PI / 2), '#c68443', {
    order: 4,
  }),
  item('scrapyard-workshop-wall', rectangle(18, 184, 550, 242), '#3b3731', {
    stroke: '#171817',
    lineWidth: 4,
    order: 5,
    label: '고물상 내부 작업장',
    role: 'scrapyard-workshop',
  }),
  item('scrapyard-workshop-roof', rectangle(4, 164, 578, 26), '#7a553a', {
    stroke: '#28201b',
    lineWidth: 4,
    order: 6,
  }),
  item('scrapyard-workbench', rectangle(74, 350, 188, 34), '#76553c', {
    stroke: '#2d251f',
    lineWidth: 3,
    order: 12,
    label: '제어장치 분석 작업대',
  }),
  item('scrapyard-owner-torso', rectangle(184, 286, 28, 72), '#635748', {
    stroke: '#25201d',
    lineWidth: 3,
    order: 18,
    enabled: false,
    label: '고물상 주인',
    role: 'scrapyard-owner',
  }),
  item('scrapyard-owner-head', polygon(198, 276, 14, 16, 8), '#c7a77e', {
    stroke: '#332820',
    lineWidth: 2,
    order: 19,
    enabled: false,
    role: 'welding-goggles',
  }),
  item('scrapyard-owner-goggles', rectangle(185, 269, 27, 8), '#dfc37a', {
    stroke: '#392e21',
    lineWidth: 2,
    order: 20,
    enabled: false,
    role: 'welding-goggles',
  }),
  item('scrapyard-owner-ledger', rectangle(157, 310, 22, 30), '#d2bc83', {
    stroke: '#443a2c',
    lineWidth: 2,
    order: 20,
    enabled: false,
    role: 'ledger',
  }),
  item(
    'scrapyard-owner-wrench',
    [
      { x: 218, y: 306 },
      { x: 228, y: 300 },
      { x: 254, y: 342 },
      { x: 244, y: 348 },
    ],
    '#a8aaa5',
    {
      stroke: '#303331',
      lineWidth: 2,
      order: 20,
      enabled: false,
      role: 'large-wrench',
    },
  ),
  item('scrapyard-device-analysis-beam', rectangle(104, 316, 66, 6), '#75d6c4', {
    stroke: '#245e5b',
    opacity: 0.76,
    order: 22,
    enabled: false,
    label: '제어장치 분석 신호',
    role: 'analysis-signal',
  }),
  item('scrapyard-analysis-device-core', polygon(132, 310, 12, 16, 6, Math.PI / 6), '#a7fff0', {
    stroke: '#245e5b',
    lineWidth: 3,
    order: 23,
    enabled: false,
    label: '회수한 제어장치 · 분석 중',
    role: 'control-device-analysis',
  }),
  item('scrapyard-wall-map-frame', rectangle(270, 214, 126, 92), '#d8c18a', {
    stroke: '#563f2d',
    lineWidth: 4,
    order: 16,
    enabled: false,
    label: '왕국 작전 지도',
    role: 'operation-map',
  }),
  item(
    'scrapyard-wall-map-route',
    [
      { x: 286, y: 278 },
      { x: 304, y: 242 },
      { x: 330, y: 264 },
      { x: 350, y: 232 },
      { x: 378, y: 272 },
      { x: 386, y: 288 },
      { x: 360, y: 278 },
      { x: 340, y: 248 },
      { x: 314, y: 282 },
    ],
    '#e47f49',
    {
      stroke: '#7d3f2a',
      lineWidth: 2,
      order: 17,
      enabled: false,
      label: '다섯 지역과 수도 진로',
      role: 'operation-route',
    },
  ),
  item('scrapyard-garage-door-left', rectangle(410, 214, 72, 212), '#596166', {
    stroke: '#24292b',
    lineWidth: 4,
    order: 24,
    label: '차고문 왼쪽',
    role: 'garage-door',
  }),
  item('scrapyard-garage-door-right', rectangle(482, 214, 72, 212), '#4c555a', {
    stroke: '#24292b',
    lineWidth: 4,
    order: 24,
    label: '차고문 오른쪽',
    role: 'garage-door',
  }),
  item('garage-robot-frame-torso', polygon(482, 296, 40, 62, 8, Math.PI / 8), '#626b6d', {
    stroke: '#252a2b',
    lineWidth: 4,
    order: 21,
    enabled: false,
    label: '미완성 거대 로봇 골격',
    role: 'robot-frame-zero-percent',
  }),
  item('garage-robot-frame-leg-left', rectangle(448, 348, 18, 72), '#737b79', {
    stroke: '#292d2c',
    lineWidth: 3,
    order: 21,
    enabled: false,
    role: 'empty-leg-mount',
  }),
  item('garage-robot-frame-leg-right', rectangle(498, 348, 18, 72), '#737b79', {
    stroke: '#292d2c',
    lineWidth: 3,
    order: 21,
    enabled: false,
    role: 'empty-leg-mount',
  }),
  item('garage-robot-brain-core', polygon(482, 284, 14, 18, 6, Math.PI / 6), '#a7fff0', {
    stroke: '#245e5b',
    lineWidth: 3,
    order: 23,
    enabled: false,
    label: '회수한 제어장치 · 거대 로봇 두뇌',
    role: 'robot-brain',
  }),
  item('garage-robot-zero-label', rectangle(430, 194, 104, 12), '#e4bd64', {
    stroke: '#5a4624',
    lineWidth: 2,
    order: 23,
    enabled: false,
    label: 'ROBOT 0% · 0/5 PARTS',
    role: 'completion-zero',
  }),
  item('garage-robot-walker-leg-left', rectangle(440, 340, 30, 80), '#8a6b4d', {
    stroke: '#2e241c',
    lineWidth: 4,
    order: 24,
    enabled: false,
    label: '굴착기 다리 모듈 왼쪽',
    role: 'walker-drive-module',
  }),
  item('garage-robot-walker-leg-right', rectangle(494, 340, 30, 80), '#8a6b4d', {
    stroke: '#2e241c',
    lineWidth: 4,
    order: 24,
    enabled: false,
    label: '굴착기 다리 모듈 오른쪽',
    role: 'walker-drive-module',
  }),
  item('garage-robot-twenty-label', rectangle(424, 190, 116, 16), '#e3a64f', {
    stroke: '#5a4624',
    lineWidth: 2,
    order: 25,
    enabled: false,
    label: 'ROBOT 20% · 1/5 PARTS · 다리',
    role: 'completion-twenty',
  }),
  item(
    'garage-robot-crane-arm-left',
    [
      { x: 428, y: 276 },
      { x: 448, y: 264 },
      { x: 458, y: 338 },
      { x: 438, y: 344 },
    ],
    '#4fa7ad',
    {
      stroke: '#183e42',
      lineWidth: 4,
      order: 25,
      enabled: false,
      label: '쌍둥이 크레인 유압 팔 모듈 왼쪽',
      role: 'crane-hydraulic-arm-module',
    },
  ),
  item(
    'garage-robot-crane-arm-right',
    [
      { x: 516, y: 264 },
      { x: 536, y: 276 },
      { x: 526, y: 344 },
      { x: 506, y: 338 },
    ],
    '#4fa7ad',
    {
      stroke: '#183e42',
      lineWidth: 4,
      order: 25,
      enabled: false,
      label: '쌍둥이 크레인 유압 팔 모듈 오른쪽',
      role: 'crane-hydraulic-arm-module',
    },
  ),
  item('garage-robot-crane-cable', rectangle(476, 292, 12, 72), '#202e31', {
    stroke: '#56c3c7',
    lineWidth: 3,
    order: 26,
    enabled: false,
    label: '크레인 팔 굵은 유압 케이블',
    role: 'crane-hydraulic-cable',
  }),
  item('garage-robot-crane-twenty-label', rectangle(424, 190, 116, 16), '#4fa7ad', {
    stroke: '#183e42',
    lineWidth: 2,
    order: 26,
    enabled: false,
    label: 'ROBOT 20% · 1/5 PARTS · 팔',
    role: 'completion-twenty',
  }),
  item('garage-robot-forty-label', rectangle(420, 186, 124, 20), '#59c3c6', {
    stroke: '#183e42',
    lineWidth: 3,
    order: 27,
    enabled: false,
    label: 'ROBOT 40% · 2/5 PARTS',
    role: 'completion-forty',
  }),
  item('garage-robot-reactor-core', polygon(482, 318, 22, 28, 8, Math.PI / 8), '#9bd66b', {
    stroke: '#425329',
    lineWidth: 4,
    order: 27,
    enabled: false,
    label: '구형 고출력 동력로 · 주 동력원 모듈',
    role: 'arcane-reactor-module',
  }),
  item('garage-robot-reactor-pipe-left', rectangle(451, 306, 12, 48), '#b9a363', {
    stroke: '#4d4527',
    lineWidth: 3,
    order: 26,
    enabled: false,
    role: 'reactor-geothermal-pipe',
  }),
  item('garage-robot-reactor-pipe-right', rectangle(501, 306, 12, 48), '#b9a363', {
    stroke: '#4d4527',
    lineWidth: 3,
    order: 26,
    enabled: false,
    role: 'reactor-geothermal-pipe',
  }),
  item('garage-robot-reactor-twenty-label', rectangle(424, 190, 116, 16), '#9bd66b', {
    stroke: '#425329',
    lineWidth: 2,
    order: 28,
    enabled: false,
    label: 'ROBOT 20% · 1/5 PARTS · 동력원',
    role: 'completion-twenty',
  }),
  item('garage-robot-sixty-label', rectangle(416, 182, 132, 24), '#bde47e', {
    stroke: '#425329',
    lineWidth: 3,
    order: 29,
    enabled: false,
    label: 'ROBOT 60% · 3/5 PARTS · 다리+팔+동력원',
    role: 'completion-sixty',
  }),
  item('wreck-hull-lower', polygon(986, 374, 206, 72, 10, Math.PI / 10), '#504d49', {
    stroke: '#252729',
    lineWidth: 4,
    order: 8,
    label: '폐병기 흉곽',
    role: 'abandoned-war-machine',
  }),
  item(
    'wreck-rib-left',
    [
      { x: 842, y: 386 },
      { x: 874, y: 244 },
      { x: 922, y: 214 },
      { x: 904, y: 392 },
    ],
    '#66615a',
    { stroke: '#292a2b', lineWidth: 5, order: 9 },
  ),
  item(
    'wreck-rib-right',
    [
      { x: 1062, y: 392 },
      { x: 1048, y: 216 },
      { x: 1098, y: 242 },
      { x: 1124, y: 388 },
    ],
    '#625e58',
    { stroke: '#292a2b', lineWidth: 5, order: 9 },
  ),
  item('wreck-head', polygon(985, 224, 84, 62, 8, Math.PI / 8), '#5a5650', {
    stroke: '#242627',
    lineWidth: 5,
    order: 10,
  }),
  item('wreck-face-slit', rectangle(930, 218, 112, 18), '#171b1c', {
    stroke: '#0a0d0e',
    order: 11,
  }),
  item('scrap-device-glow-outer', polygon(774, 354, 32, 32, 12), '#63e4d0', {
    opacity: 0.22,
    stroke: '#63e4d0',
    lineWidth: 1,
    order: 18,
    role: 'interaction-cue',
  }),
  item('scrap-device-core', polygon(774, 354, 13, 17, 6, Math.PI / 6), '#a7fff0', {
    stroke: '#245e5b',
    order: 19,
    label: '반짝이는 제어장치',
    role: 'control-device',
  }),
  item('scrap-king-eye-left', polygon(958, 226, 13, 8, 6), '#80f4df', {
    stroke: '#143d3a',
    lineWidth: 2,
    order: 19,
    enabled: false,
    role: 'awakening-eye',
  }),
  item('scrap-king-eye-right', polygon(1014, 226, 13, 8, 6), '#80f4df', {
    stroke: '#143d3a',
    lineWidth: 2,
    order: 19,
    enabled: false,
    role: 'awakening-eye',
  }),
  item(
    'scrap-king-shoulder-left',
    [
      { x: 816, y: 278 },
      { x: 746, y: 252 },
      { x: 710, y: 316 },
      { x: 796, y: 350 },
    ],
    '#a0643e',
    { stroke: '#34261f', lineWidth: 4, order: 14, enabled: false, role: 'assembled-part' },
  ),
  item(
    'scrap-king-shoulder-right',
    [
      { x: 1150, y: 276 },
      { x: 1228, y: 248 },
      { x: 1260, y: 320 },
      { x: 1174, y: 350 },
    ],
    '#667b79',
    { stroke: '#263130', lineWidth: 4, order: 14, enabled: false, role: 'assembled-part' },
  ),
  item('scrap-king-cable-bundle', rectangle(964, 286, 46, 116), '#b79855', {
    stroke: '#3f3524',
    lineWidth: 4,
    order: 15,
    enabled: false,
    role: 'assembled-part',
  }),
  item('scrap-king-route-beacon', polygon(985, 148, 38, 38, 4, Math.PI / 4), '#ef9a55', {
    stroke: '#5c2d20',
    lineWidth: 3,
    opacity: 0.8,
    order: 20,
    enabled: false,
    role: 'deadline-warning',
  }),
  item('foreground-scrap-left', polygon(604, 432, 92, 28, 7), '#272a29', {
    stroke: '#151716',
    order: 40,
  }),
  item('foreground-scrap-right', polygon(1320, 432, 130, 36, 8), '#252827', {
    stroke: '#141616',
    order: 40,
  }),
  ...createEnvironmentPortalLandmarkItems('scrapyard-mine-road-gate', 1372, 426, {
    style: 'village-road',
    enabled: false,
    order: 22,
  }),
  item('scrapyard-mine-road-sign', rectangle(1304, 320, 104, 42), '#7f5738', {
    stroke: '#2b2019',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '폐광 산촌 연결로 · 1구간',
    role: 'long-distance-road-sign',
  }),
  ...createEnvironmentPortalLandmarkItems('scrapyard-shipyard-road-gate', 68, 426, {
    style: 'village-road',
    enabled: false,
    order: 26,
  }),
  item('scrapyard-shipyard-road-sign', rectangle(18, 320, 118, 42), '#3f6f75', {
    stroke: '#183e42',
    lineWidth: 3,
    order: 28,
    enabled: false,
    label: '항구 조선소 연결로 · 1구간',
    role: 'long-distance-road-sign',
  }),
  ...createEnvironmentPortalLandmarkItems('scrapyard-greenhouse-road-gate', 1200, 426, {
    style: 'village-road',
    enabled: false,
    order: 30,
  }),
  item('scrapyard-greenhouse-road-sign', rectangle(1136, 314, 128, 48), '#648347', {
    stroke: '#2b3d20',
    lineWidth: 3,
    order: 32,
    enabled: false,
    label: '온실 평원 연결로 · 1구간',
    role: 'long-distance-road-sign',
  }),
];

const mineRoadheadRenderItems = [
  item(
    'mine-roadhead-skyline',
    [
      { x: 0, y: 326 },
      { x: 150, y: 214 },
      { x: 300, y: 292 },
      { x: 520, y: 142 },
      { x: 730, y: 300 },
      { x: 940, y: 176 },
      { x: 1180, y: 306 },
      { x: 1440, y: 226 },
      { x: 1440, y: 426 },
      { x: 0, y: 426 },
    ],
    '#55483d',
    { stroke: '#261f1b', order: -80, label: '폐광 산촌 능선' },
  ),
  item('mine-roadhead-ground', rectangle(0, 426, 1440, 114), '#4a4036', {
    stroke: '#201b17',
    order: 0,
  }),
  item('mine-roadhead-road', rectangle(0, 438, 1440, 30), '#76644e', {
    stroke: '#2d261f',
    order: 1,
  }),
  ...createEnvironmentPortalLandmarkItems('mine-roadhead-return-gate', 68, 426, {
    style: 'village-road',
    enabled: false,
    order: 22,
  }),
  item('mine-roadhead-return-sign', rectangle(22, 320, 116, 42), '#7f5738', {
    stroke: '#2b2019',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '동네 고물상 연결로 · 1구간',
    role: 'long-distance-road-sign',
  }),
  item('mine-roadhead-warning-post', rectangle(510, 286, 24, 140), '#c98945', {
    stroke: '#30231b',
    lineWidth: 3,
    order: 12,
    label: '붕괴 광산 구조 작업 경고표지',
    role: 'mine-safety-marker',
  }),
  item('mine-roadhead-derrick', rectangle(990, 232, 38, 194), '#6e5d4a', {
    stroke: '#251f1a',
    lineWidth: 4,
    order: 10,
    label: '보행식 굴착기 작업장 진입부',
    role: 'industrial-machine-landmark',
  }),
  item('mine-foreman-workwear', rectangle(650, 334, 34, 92), '#57493e', {
    stroke: '#241e1a',
    lineWidth: 3,
    order: 18,
    label: '폐광 작업반장 · 분진 작업복',
    role: 'mine-worker',
  }),
  item('mine-foreman-helmet', polygon(667, 320, 20, 15, 8, Math.PI / 8), '#d5a24c', {
    stroke: '#3c2c1d',
    lineWidth: 3,
    order: 20,
    role: 'mining-helmet',
  }),
  item('mine-foreman-lamp', polygon(667, 316, 6, 6, 8), '#f7e7aa', {
    stroke: '#5f4a24',
    lineWidth: 2,
    order: 21,
    role: 'helmet-lamp',
  }),
  item(
    'mine-foreman-pickaxe',
    [
      { x: 688, y: 342 },
      { x: 695, y: 337 },
      { x: 728, y: 404 },
      { x: 720, y: 408 },
    ],
    '#9b8c73',
    { stroke: '#2b2822', lineWidth: 2, order: 20, role: 'pickaxe' },
  ),
  item('mine-shaft-status-console', rectangle(848, 338, 82, 88), '#5e584e', {
    stroke: '#24211d',
    lineWidth: 4,
    order: 16,
    label: '붕괴 광산 구조 현황판',
    role: 'facility-status',
  }),
  item('mine-shaft-status-signal', rectangle(862, 352, 54, 12), '#e7a64c', {
    stroke: '#5d3c1c',
    lineWidth: 2,
    order: 17,
    role: 'facility-warning-signal',
  }),
  ...createEnvironmentPortalLandmarkItems('mine-rescue-tunnel-gate', 1346, 426, {
    style: 'sealed-stone',
    enabled: false,
    order: 22,
  }),
  item('mine-rescue-tunnel-sign', rectangle(1278, 320, 126, 42), '#6d5138', {
    stroke: '#2b2019',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '구조 갱도 · 지역 내 이동 무료',
    role: 'local-mine-route',
  }),
];

const mineTunnelRenderItems = [
  item('mine-tunnel-backdrop', rectangle(0, 0, 1440, 540), '#1d1b19', {
    stroke: '#0e0d0c',
    order: -100,
    label: '붕괴 광산 내부 갱도',
  }),
  item('mine-tunnel-ground', rectangle(0, 426, 1440, 114), '#3e342b', {
    stroke: '#181411',
    order: 0,
  }),
  item('mine-tunnel-ceiling', rectangle(0, 82, 1440, 38), '#4c4035', {
    stroke: '#1e1915',
    order: -10,
  }),
  item('mine-tunnel-brace-left', rectangle(340, 118, 34, 308), '#785d42', {
    stroke: '#2a2119',
    lineWidth: 4,
    order: 5,
  }),
  item('mine-tunnel-brace-right', rectangle(1030, 118, 34, 308), '#785d42', {
    stroke: '#2a2119',
    lineWidth: 4,
    order: 5,
  }),
  item('mine-tunnel-warning-cable', rectangle(370, 170, 660, 8), '#d09a43', {
    stroke: '#49331a',
    lineWidth: 2,
    order: 6,
  }),
  item('mine-trapped-worker-signal', rectangle(748, 356, 92, 18), '#75d6c4', {
    stroke: '#245e5b',
    lineWidth: 2,
    order: 12,
    label: '갇힌 작업자 생존 신호',
    role: 'rescue-signal',
  }),
  ...createEnvironmentPortalLandmarkItems('mine-tunnel-roadhead-gate', 74, 426, {
    style: 'sealed-stone',
    order: 22,
  }),
  ...createEnvironmentPortalLandmarkItems('mine-tunnel-machine-gate', 1366, 426, {
    style: 'sealed-stone',
    enabled: false,
    order: 22,
  }),
  item('mine-tunnel-machine-sign', rectangle(1272, 320, 132, 42), '#6d5138', {
    stroke: '#2b2019',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '굴착기 작업장 · Boss',
    role: 'boss-route-sign',
  }),
];

const mineMachineRenderItems = [
  item('mine-machine-skyline', rectangle(0, 0, 1440, 540), '#252320', {
    stroke: '#11100e',
    order: -100,
    label: '보행식 굴착기 작업장',
  }),
  item('mine-machine-ground', rectangle(0, 426, 1440, 114), '#40372f', {
    stroke: '#1a1613',
    order: 0,
  }),
  item('mine-machine-rail', rectangle(120, 398, 1190, 24), '#6c6254', {
    stroke: '#28241f',
    order: 2,
  }),
  item('mine-replacement-brace', rectangle(360, 226, 44, 200), '#8b6b49', {
    stroke: '#30251b',
    lineWidth: 4,
    order: 12,
    enabled: false,
    label: '새 갱도 지지대 · 구조 작업 완료',
    role: 'replacement-facility',
  }),
  item('mine-replacement-signal', rectangle(340, 202, 84, 18), '#75d6c4', {
    stroke: '#245e5b',
    lineWidth: 2,
    order: 14,
    enabled: false,
    role: 'replacement-complete-signal',
  }),
  item('mine-walker-chassis', rectangle(760, 258, 220, 116), '#675446', {
    stroke: '#251f1a',
    lineWidth: 5,
    order: 15,
    label: '보행식 대형 굴착기 본체',
    role: 'industrial-machine',
  }),
  item('mine-walker-leg-left', rectangle(746, 360, 58, 66), '#8a6b4d', {
    stroke: '#2e241c',
    lineWidth: 4,
    order: 16,
    role: 'walker-drive-leg',
  }),
  item('mine-walker-leg-right', rectangle(936, 360, 58, 66), '#8a6b4d', {
    stroke: '#2e241c',
    lineWidth: 4,
    order: 16,
    role: 'walker-drive-leg',
  }),
  item('mine-walker-warning-lamp', polygon(870, 246, 18, 14, 8), '#e3a64f', {
    stroke: '#4d3419',
    lineWidth: 3,
    order: 18,
    role: 'boss-warning-lamp',
  }),
  item('mine-walker-separated-chassis', rectangle(760, 294, 220, 80), '#4d4943', {
    stroke: '#22201d',
    lineWidth: 4,
    order: 15,
    enabled: false,
    label: '분리 완료된 굴착기 상부',
    role: 'machine-separated',
  }),
  item('mine-walker-part-cradle', rectangle(1030, 348, 176, 78), '#57493e', {
    stroke: '#211c18',
    lineWidth: 4,
    order: 14,
    enabled: false,
    label: '굴착기 하체·구동부 회수대',
    role: 'part-ready',
  }),
  item('mine-walker-part-signal', rectangle(1050, 362, 136, 18), '#e4bd64', {
    stroke: '#5a4624',
    lineWidth: 2,
    order: 16,
    enabled: false,
    label: 'WALKER DRIVE · 회수 가능',
    role: 'part-ready-signal',
  }),
  ...createEnvironmentPortalLandmarkItems('mine-machine-tunnel-gate', 74, 426, {
    style: 'sealed-stone',
    order: 22,
  }),
];

const shipyardRoadheadRenderItems = [
  item('shipyard-roadhead-sky', rectangle(0, 0, 1440, 426), '#20363e', {
    stroke: '#102126',
    order: -100,
    label: '항구 조선소 해안선',
  }),
  item('shipyard-roadhead-water', rectangle(0, 352, 1440, 74), '#285b65', {
    stroke: '#15383e',
    order: -10,
    label: '조선소 내항',
  }),
  item('shipyard-roadhead-ground', rectangle(0, 426, 1440, 114), '#46565a', {
    stroke: '#182427',
    order: 0,
  }),
  item('shipyard-roadhead-road', rectangle(0, 438, 1440, 30), '#64777a', {
    stroke: '#273437',
    order: 1,
  }),
  ...createEnvironmentPortalLandmarkItems('shipyard-roadhead-return-gate', 68, 426, {
    style: 'village-road',
    enabled: false,
    order: 22,
  }),
  item('shipyard-roadhead-return-sign', rectangle(18, 320, 116, 42), '#3f6f75', {
    stroke: '#183e42',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '동네 고물상 연결로 · 1구간',
    role: 'long-distance-road-sign',
  }),
  item('shipyard-worker-apron', rectangle(603, 330, 34, 96), '#3f5661', {
    stroke: '#17282e',
    lineWidth: 3,
    order: 18,
    label: '조선소 용접공 · 방열 앞치마',
    role: 'shipyard-worker',
  }),
  item('shipyard-worker-mask', polygon(620, 316, 20, 17, 6, Math.PI / 6), '#56b7c9', {
    stroke: '#183e42',
    lineWidth: 3,
    order: 20,
    role: 'welding-mask',
  }),
  item('shipyard-worker-rivet-gun', rectangle(638, 354, 44, 13), '#81989b', {
    stroke: '#1e2d30',
    lineWidth: 2,
    order: 20,
    role: 'rivet-gun',
  }),
  item('shipyard-occupation-board', rectangle(822, 326, 80, 100), '#42636a', {
    stroke: '#17282e',
    lineWidth: 4,
    order: 16,
    label: '건선거 점거·선박 수리 현황판',
    role: 'facility-status',
  }),
  item('shipyard-occupation-warning', rectangle(836, 342, 52, 14), '#e77754', {
    stroke: '#57291f',
    lineWidth: 2,
    order: 17,
    role: 'facility-warning-signal',
  }),
  item('shipyard-distant-hull', polygon(1040, 330, 190, 52, 8), '#6d8589', {
    stroke: '#23363a',
    lineWidth: 4,
    order: 8,
    label: '수리 대기 중인 마지막 선박',
    role: 'ship-repair-landmark',
  }),
  ...createEnvironmentPortalLandmarkItems('shipyard-drydock-gate', 1372, 426, {
    style: 'sealed-stone',
    enabled: false,
    order: 22,
  }),
  item('shipyard-drydock-sign', rectangle(1278, 316, 126, 46), '#3f6f75', {
    stroke: '#183e42',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '점거된 건선거 · 지역 내 이동 무료',
    role: 'local-shipyard-route',
  }),
];

const shipyardDrydockRenderItems = [
  item('shipyard-drydock-backdrop', rectangle(0, 0, 1440, 540), '#18282d', {
    stroke: '#0b1417',
    order: -100,
    label: '수거 유닛이 점거한 건선거',
  }),
  item('shipyard-drydock-wall', rectangle(0, 92, 1440, 42), '#405a60', {
    stroke: '#17282d',
    lineWidth: 4,
    order: -10,
  }),
  item('shipyard-drydock-ground', rectangle(0, 426, 1440, 114), '#3e4a4d', {
    stroke: '#172124',
    order: 0,
  }),
  item('shipyard-drydock-keel-rail-left', rectangle(316, 382, 18, 44), '#6a8387', {
    stroke: '#203337',
    order: 5,
  }),
  item('shipyard-drydock-keel-rail-right', rectangle(1080, 382, 18, 44), '#6a8387', {
    stroke: '#203337',
    order: 5,
  }),
  item('shipyard-drydock-collector-chain', rectangle(760, 150, 12, 112), '#243033', {
    stroke: '#56b7c9',
    lineWidth: 2,
    order: 7,
    label: '수거 유닛 점거 케이블',
    role: 'occupation-cable',
  }),
  item('shipyard-drydock-ship-hull', polygon(690, 338, 260, 62, 10, Math.PI / 10), '#536b70', {
    stroke: '#1d3034',
    lineWidth: 5,
    order: 9,
    label: '마지막 수리 선박 외판',
    role: 'last-ship-hull',
  }),
  ...createEnvironmentPortalLandmarkItems('shipyard-drydock-roadhead-gate', 68, 426, {
    style: 'sealed-stone',
    order: 22,
  }),
  ...createEnvironmentPortalLandmarkItems('shipyard-drydock-crane-gate', 1372, 426, {
    style: 'sealed-stone',
    enabled: false,
    order: 22,
  }),
  item('shipyard-crane-pier-sign', rectangle(1278, 316, 126, 46), '#3f6f75', {
    stroke: '#183e42',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '쌍둥이 크레인 부두 · Boss',
    role: 'boss-route-sign',
  }),
];

const shipyardCraneRenderItems = [
  item('shipyard-crane-sky', rectangle(0, 0, 1440, 540), '#1d333a', {
    stroke: '#0b171a',
    order: -100,
    label: '쌍둥이 크레인 부두',
  }),
  item('shipyard-crane-water', rectangle(0, 350, 1440, 76), '#235661', {
    stroke: '#12333a',
    order: -10,
  }),
  item('shipyard-crane-ground', rectangle(0, 426, 1440, 114), '#435357', {
    stroke: '#172326',
    order: 0,
  }),
  item('shipyard-twin-crane-left-tower', rectangle(710, 190, 44, 236), '#3f7f83', {
    stroke: '#183e42',
    lineWidth: 5,
    order: 12,
    label: '쌍둥이 크레인 왼쪽 기둥',
    role: 'twin-crane-painted-steel',
  }),
  item('shipyard-twin-crane-right-tower', rectangle(954, 190, 44, 236), '#438b8f', {
    stroke: '#183e42',
    lineWidth: 5,
    order: 12,
    label: '쌍둥이 크레인 오른쪽 기둥',
    role: 'twin-crane-painted-steel',
  }),
  item(
    'shipyard-twin-crane-left-arm',
    [
      { x: 728, y: 206 },
      { x: 830, y: 138 },
      { x: 846, y: 154 },
      { x: 750, y: 230 },
    ],
    '#4fa7ad',
    { stroke: '#183e42', lineWidth: 5, order: 14, role: 'moving-crane-arm' },
  ),
  item(
    'shipyard-twin-crane-right-arm',
    [
      { x: 974, y: 206 },
      { x: 872, y: 138 },
      { x: 856, y: 154 },
      { x: 952, y: 230 },
    ],
    '#4fa7ad',
    { stroke: '#183e42', lineWidth: 5, order: 14, role: 'moving-crane-arm' },
  ),
  item('shipyard-twin-crane-left-cylinder', rectangle(772, 202, 18, 112), '#86d1d0', {
    stroke: '#234d50',
    lineWidth: 3,
    order: 15,
    label: '왼쪽 유압 실린더',
    role: 'hydraulic-moving-part',
  }),
  item('shipyard-twin-crane-right-cylinder', rectangle(918, 202, 18, 112), '#86d1d0', {
    stroke: '#234d50',
    lineWidth: 3,
    order: 15,
    label: '오른쪽 유압 실린더',
    role: 'hydraulic-moving-part',
  }),
  item('shipyard-twin-crane-thick-cable', rectangle(842, 148, 18, 194), '#1b292c', {
    stroke: '#56c3c7',
    lineWidth: 3,
    order: 16,
    label: '쌍둥이 크레인 굵은 유압 케이블',
    role: 'thick-hydraulic-cable',
  }),
  item('shipyard-last-ship-patch', rectangle(300, 292, 220, 92), '#6b8589', {
    stroke: '#23363a',
    lineWidth: 5,
    order: 12,
    enabled: false,
    label: '마지막 선박 교체 외판 · 수리 완료',
    role: 'replacement-facility',
  }),
  item('shipyard-last-ship-weld', rectangle(330, 310, 160, 12), '#75d6c4', {
    stroke: '#245e5b',
    lineWidth: 2,
    order: 13,
    enabled: false,
    role: 'replacement-complete-signal',
  }),
  item('shipyard-separated-crane-towers', rectangle(710, 282, 288, 144), '#36595d', {
    stroke: '#172d30',
    lineWidth: 5,
    order: 12,
    enabled: false,
    label: '유압 장치 분리 완료된 쌍둥이 크레인',
    role: 'machine-separated',
  }),
  item('shipyard-hydraulics-cradle', rectangle(1040, 346, 176, 80), '#345156', {
    stroke: '#17282c',
    lineWidth: 4,
    order: 14,
    enabled: false,
    label: '크레인 유압 장치 회수대',
    role: 'part-ready',
  }),
  item('shipyard-hydraulics-signal', rectangle(1054, 360, 148, 20), '#59c3c6', {
    stroke: '#183e42',
    lineWidth: 2,
    order: 16,
    enabled: false,
    label: 'CRANE HYDRAULICS · 회수 가능',
    role: 'part-ready-signal',
  }),
  ...createEnvironmentPortalLandmarkItems('shipyard-crane-drydock-gate', 68, 426, {
    style: 'sealed-stone',
    order: 22,
  }),
];

const greenhouseRoadheadRenderItems = [
  item('greenhouse-roadhead-sky', rectangle(0, 0, 1440, 426), '#253d35', {
    stroke: '#10221c',
    order: -100,
    label: '유리 온실이 이어진 평원',
  }),
  item('greenhouse-roadhead-ground', rectangle(0, 426, 1440, 114), '#4a5135', {
    stroke: '#202519',
    order: 0,
  }),
  item('greenhouse-roadhead-road', rectangle(0, 438, 1440, 30), '#6e7550', {
    stroke: '#2d3222',
    order: 1,
  }),
  item(
    'greenhouse-glasshouse-shell',
    [
      { x: 880, y: 426 },
      { x: 920, y: 272 },
      { x: 1080, y: 214 },
      { x: 1240, y: 272 },
      { x: 1280, y: 426 },
    ],
    '#6e9e7d',
    {
      stroke: '#b5d7a4',
      lineWidth: 5,
      opacity: 0.72,
      order: 8,
      label: '작물 난방이 멈춘 대형 온실',
      role: 'greenhouse-facility',
    },
  ),
  ...createEnvironmentPortalLandmarkItems('greenhouse-roadhead-return-gate', 68, 426, {
    style: 'village-road',
    enabled: false,
    order: 22,
  }),
  item('greenhouse-roadhead-return-sign', rectangle(18, 320, 118, 42), '#648347', {
    stroke: '#2b3d20',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '동네 고물상 연결로 · 1구간',
    role: 'long-distance-road-sign',
  }),
  item('greenhouse-technician-vest', rectangle(596, 330, 32, 96), '#426052', {
    stroke: '#1a2b24',
    lineWidth: 3,
    order: 18,
    label: '온실 기술자 · 필터 조끼',
    role: 'greenhouse-technician',
  }),
  item('greenhouse-technician-visor', rectangle(598, 312, 28, 10), '#7fcf7a', {
    stroke: '#294829',
    lineWidth: 2,
    order: 20,
    role: 'pressure-visor',
  }),
  item(
    'greenhouse-technician-sensor',
    [
      { x: 626, y: 348 },
      { x: 633, y: 346 },
      { x: 656, y: 410 },
      { x: 649, y: 412 },
    ],
    '#b9f1ce',
    { stroke: '#294829', lineWidth: 2, order: 20, role: 'geothermal-sensor' },
  ),
  item('greenhouse-pressure-board', rectangle(790, 326, 86, 100), '#657047', {
    stroke: '#29301e',
    lineWidth: 4,
    order: 16,
    label: '지열 배관 압력·파손 현황판',
    role: 'facility-status',
  }),
  item('greenhouse-pressure-warning', rectangle(805, 342, 56, 14), '#d98356', {
    stroke: '#552d20',
    lineWidth: 2,
    order: 17,
    role: 'facility-warning-signal',
  }),
  ...createEnvironmentPortalLandmarkItems('greenhouse-pipeline-gate', 1372, 426, {
    style: 'sealed-stone',
    enabled: false,
    order: 22,
  }),
  item('greenhouse-pipeline-sign', rectangle(1268, 314, 136, 48), '#648347', {
    stroke: '#2b3d20',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '파열 지열 배관 · 지역 내 이동 무료',
    role: 'local-greenhouse-route',
  }),
];

const greenhousePipelineRenderItems = [
  item('greenhouse-pipeline-backdrop', rectangle(0, 0, 1440, 540), '#1c3028', {
    stroke: '#0d1713',
    order: -100,
    label: '파열된 온실 지열 배관 구역',
  }),
  item('greenhouse-pipeline-ground', rectangle(0, 426, 1440, 114), '#414a32', {
    stroke: '#1a1f14',
    order: 0,
  }),
  item('greenhouse-pipeline-header', rectangle(180, 142, 1080, 28), '#9d8955', {
    stroke: '#453b24',
    lineWidth: 4,
    order: 6,
    label: '온실 지열 주 배관',
    role: 'geothermal-pipe',
  }),
  item('greenhouse-pipeline-rupture-left', rectangle(600, 164, 20, 138), '#4a3b2b', {
    stroke: '#d98356',
    lineWidth: 3,
    order: 8,
    label: '파열 배관',
    role: 'ruptured-pipe',
  }),
  item('greenhouse-pipeline-steam-signal', polygon(610, 304, 58, 34, 10), '#d8f0cf', {
    stroke: '#9bd66b',
    lineWidth: 2,
    opacity: 0.48,
    order: 10,
    role: 'steam-leak',
  }),
  ...createEnvironmentPortalLandmarkItems('greenhouse-pipeline-roadhead-gate', 68, 426, {
    style: 'sealed-stone',
    order: 22,
  }),
  ...createEnvironmentPortalLandmarkItems('greenhouse-pipeline-reactor-gate', 1372, 426, {
    style: 'sealed-stone',
    enabled: false,
    order: 22,
  }),
  item('greenhouse-reactor-house-sign', rectangle(1268, 314, 136, 48), '#648347', {
    stroke: '#2b3d20',
    lineWidth: 3,
    order: 24,
    enabled: false,
    label: '구형 동력로실 · Boss',
    role: 'boss-route-sign',
  }),
];

const greenhouseReactorRenderItems = [
  item('greenhouse-reactor-backdrop', rectangle(0, 0, 1440, 540), '#223228', {
    stroke: '#0e1711',
    order: -100,
    label: '구형 고출력 동력로실',
  }),
  item('greenhouse-reactor-ground', rectangle(0, 426, 1440, 114), '#454c32', {
    stroke: '#1b2015',
    order: 0,
  }),
  item('greenhouse-safe-pipeline', rectangle(248, 238, 222, 30), '#b9a363', {
    stroke: '#4d4527',
    lineWidth: 4,
    order: 12,
    enabled: false,
    label: '복구된 저압 지열 배관 · 작물 난방 가동',
    role: 'replacement-facility',
  }),
  item('greenhouse-safe-pressure-signal', rectangle(284, 214, 150, 16), '#75d6c4', {
    stroke: '#245e5b',
    lineWidth: 2,
    order: 14,
    enabled: false,
    role: 'replacement-complete-signal',
  }),
  item('greenhouse-old-reactor-shell', polygon(850, 316, 112, 108, 10, Math.PI / 10), '#6f783f', {
    stroke: '#30361f',
    lineWidth: 5,
    order: 14,
    label: '구형 고출력 마력 동력로',
    role: 'industrial-machine',
  }),
  item('greenhouse-old-reactor-core', polygon(850, 312, 42, 54, 8, Math.PI / 8), '#9bd66b', {
    stroke: '#efffcf',
    lineWidth: 4,
    order: 16,
    role: 'reactor-core',
  }),
  item('greenhouse-old-reactor-pipe-left', rectangle(720, 266, 28, 160), '#b9a363', {
    stroke: '#4d4527',
    lineWidth: 4,
    order: 13,
    role: 'geothermal-pipe',
  }),
  item('greenhouse-old-reactor-pipe-right', rectangle(952, 266, 28, 160), '#b9a363', {
    stroke: '#4d4527',
    lineWidth: 4,
    order: 13,
    role: 'geothermal-pipe',
  }),
  item('greenhouse-separated-reactor-shell', rectangle(746, 300, 208, 126), '#566041', {
    stroke: '#29301e',
    lineWidth: 5,
    order: 14,
    enabled: false,
    label: '주 동력원이 분리된 구형 동력로',
    role: 'machine-separated',
  }),
  item('greenhouse-reactor-cradle', rectangle(1036, 344, 184, 82), '#4a5738', {
    stroke: '#222a19',
    lineWidth: 4,
    order: 14,
    enabled: false,
    label: '고출력 동력로 회수대',
    role: 'part-ready',
  }),
  item('greenhouse-reactor-signal', rectangle(1052, 358, 152, 20), '#9bd66b', {
    stroke: '#425329',
    lineWidth: 2,
    order: 16,
    enabled: false,
    label: 'ARCANE REACTOR · 회수 가능',
    role: 'part-ready-signal',
  }),
  ...createEnvironmentPortalLandmarkItems('greenhouse-reactor-pipeline-gate', 68, 426, {
    style: 'sealed-stone',
    order: 22,
  }),
];

const activatedStages = [
  SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
  SCRAP_AWAKENING_STAGE.EYES_LIT,
  SCRAP_AWAKENING_STAGE.ASSEMBLED,
  SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
  SCRAP_AWAKENING_STAGE.COMPLETE,
];
const eyeStages = activatedStages.slice(1);
const assemblyStages = activatedStages.slice(2);
const deadlineStages = activatedStages.slice(3);
const ownerVisibleStages = [SCRAP_AWAKENING_STAGE.COMPLETE];
const deviceAnalysisStages = [
  SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS,
  SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED,
];
const operationMapVisibleStages = [
  SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED,
  SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED,
  SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
];
const garageOpenStages = [
  SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED,
  SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
];

export const SCRAP_AWAKENING_MAP = defineMap({
  id: SCRAP_AWAKENING_MAP_ID,
  name: '왕국 외곽 고철 수거장',
  version: 1,
  worldSize: { width: 1440, height: 540 },
  gridSize: 48,
  palette: PALETTE,
  groundY: null,
  initialSpawnId: 'first-commission-arrival',
  spawns: [
    {
      id: 'first-commission-arrival',
      regionId: SCRAP_AWAKENING_REGION_ID,
      roomId: SCRAP_AWAKENING_ROOM_ID,
      position: { x: 250, y: 344 },
      facing: 1,
    },
  ],
  regions: [
    {
      id: SCRAP_AWAKENING_REGION_ID,
      label: '왕국 외곽 고철 수거장',
      rooms: [
        {
          id: SCRAP_AWAKENING_ROOM_ID,
          label: '첫 수거 의뢰 · 폐병기 구역',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'scrap-yard-ground-surface',
              kind: 'solid',
              material: 'riveted-scrap-earth',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems,
          entities: [
            {
              id: SCRAP_AWAKENING_DEVICE_ENTITY_ID,
              kind: 'scrap-awakening-device',
              position: { x: 774, y: 354 },
              interactionRange: 72,
              label: '반짝이는 제어장치',
            },
            {
              id: SCRAPYARD_OWNER_ENTITY_ID,
              kind: 'story-interaction',
              position: { x: 198, y: 354 },
              interactionRange: 82,
              speaker: '고물상 주인',
              conversationId: SCRAPYARD_OWNER_ANALYSIS_CONVERSATION_ID,
              conversationTitle: '제어장치 분석과 차고 개방',
              lines: [
                '퇴직했는데 또 야근이라니. 그 반짝이는 장치부터 작업대에 올려 봐.',
                '이건 고철 대왕의 부품이 아니라 왕국 전역 기계 신호를 읽는 제어 두뇌야.',
                '벽 지도를 켜고 차고문도 열자. 빈 골격부터 채우면 아직 늦지 않았어.',
              ],
              presentationProfileId: 'scrapyard-owner',
              enabled: false,
            },
            {
              id: SCRAPYARD_WALL_MAP_ENTITY_ID,
              kind: 'operation-map-interaction',
              position: { x: 334, y: 354 },
              interactionRange: 76,
              label: '왕국 작전 지도',
              enabled: false,
            },
          ],
          triggers: [],
          portals: [
            SCRAP_MINE_ROAD_PORTAL_ID,
            SCRAP_SHIPYARD_ROAD_PORTAL_ID,
            SCRAP_GREENHOUSE_ROAD_PORTAL_ID,
          ],
        },
      ],
    },
    {
      id: SCRAP_MINE_ROAD_REGION_ID,
      label: '폐광 산촌',
      rooms: [
        {
          id: SCRAP_MINE_ROAD_ROOM_ID,
          label: '폐광 산촌 · 연결로 진입부',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'mine-roadhead-ground-surface',
              kind: 'solid',
              material: 'packed-mine-road',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems: mineRoadheadRenderItems,
          entities: [
            {
              id: 'mine-foreman-briefing',
              kind: 'story-interaction',
              position: { x: 667, y: 354 },
              interactionRange: 84,
              speaker: '폐광 작업반장',
              conversationId: SCRAP_MINE_FOREMAN_CONVERSATION_ID,
              conversationTitle: '붕괴 광산 구조 요청',
              lines: [
                '갱도 안 작업자 셋은 살아 있어. 문제는 수거 유닛이 구조 레일을 뜯고 있다는 거야.',
                '보행식 굴착기로 마지막 버팀목을 세우면 모두 빼낼 수 있어. 그 뒤 기계 하체는 네가 가져가.',
                '먼저 오른쪽 현황판에서 붕괴 범위와 작업 시간을 확인해 줘.',
              ],
              presentationProfileId: 'mine-worker',
              campaignRegionId: 'abandoned-mine',
              campaignStageKind: 'npc-briefing',
            },
            {
              id: 'mine-facility-inspection',
              kind: 'story-interaction',
              position: { x: 889, y: 354 },
              interactionRange: 78,
              speaker: '붕괴 광산 구조 현황판',
              conversationId: SCRAP_MINE_FACILITY_CONVERSATION_ID,
              conversationTitle: '시설 상태와 작업 시간 확인',
              lines: [
                '구조 레일 단선. 내부 이동, 수거 유닛 제거, 굴착기 제압과 새 버팀목 설치까지 10구간 예상.',
                '성공하면 고철 대왕은 막힌 산길을 우회해 수도 도착이 2일 늦어진다.',
              ],
              campaignRegionId: 'abandoned-mine',
              campaignStageKind: 'facility-observed',
              requestCampaignEventStart: true,
              enabled: false,
            },
          ],
          triggers: [],
          portals: [SCRAP_MINE_ROAD_PORTAL_ID, 'mine-roadhead-tunnel-portal'],
        },
        {
          id: SCRAP_MINE_TUNNEL_ROOM_ID,
          label: '폐광 산촌 · 구조 갱도',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'mine-tunnel-ground-surface',
              kind: 'solid',
              material: 'collapsed-mine-earth',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems: mineTunnelRenderItems,
          entities: [
            {
              id: 'mine-tunnel-collector-unit',
              kind: 'combat-enemy',
              encounterProfileId: 'mine-tunnel-collector',
              position: { x: 820, y: 426 },
              maxHealth: 78,
              campaignRegionId: 'abandoned-mine',
              campaignStageKind: 'journey-combat',
            },
          ],
          triggers: [],
          portals: ['mine-roadhead-tunnel-portal', 'mine-tunnel-machine-portal'],
        },
        {
          id: SCRAP_MINE_MACHINE_ROOM_ID,
          label: '폐광 산촌 · 보행식 굴착기 작업장',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'mine-machine-ground-surface',
              kind: 'solid',
              material: 'mine-machine-yard',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems: mineMachineRenderItems,
          entities: [
            {
              id: 'mine-collapse-walker-boss',
              kind: 'combat-enemy',
              encounterProfileId: 'mine-collapse-boss',
              position: { x: 850, y: 426 },
              maxHealth: 118,
              campaignRegionId: 'abandoned-mine',
              campaignStageKind: 'boss-defeated',
            },
            {
              id: 'mine-replacement-work',
              kind: 'story-interaction',
              position: { x: 382, y: 354 },
              interactionRange: 78,
              speaker: '폐광 작업반장',
              conversationId: SCRAP_MINE_REPLACEMENT_CONVERSATION_ID,
              conversationTitle: '마지막 버팀목 설치',
              lines: [
                '수거 유닛도 굴착기도 멈췄어. 이 새 버팀목만 체결하면 갇힌 작업자들이 나온다.',
                '좋아, 구조 완료. 이제 폐광 예정인 굴착기의 하체 구동부를 안전하게 떼자.',
              ],
              presentationProfileId: 'mine-worker',
              campaignRegionId: 'abandoned-mine',
              campaignStageKind: 'replacement-complete',
              enabled: false,
            },
            {
              id: 'mine-machine-separation',
              kind: 'story-interaction',
              position: { x: 870, y: 354 },
              interactionRange: 90,
              speaker: '보행식 대형 굴착기',
              conversationId: SCRAP_MINE_SEPARATION_CONVERSATION_ID,
              conversationTitle: '하체·구동부 분리',
              lines: [
                '상부 굴착 장치의 압력을 제거했다. 좌우 유압 다리 잠금핀을 해제한다.',
                '굴착기 하체·구동부가 회수대에 고정됐다. 차고 로봇의 다리로 사용할 수 있다.',
              ],
              campaignRegionId: 'abandoned-mine',
              campaignStageKind: 'machine-separated',
              enabled: false,
            },
            {
              id: 'mine-walker-part-claim',
              kind: 'story-interaction',
              position: { x: 1110, y: 354 },
              interactionRange: 88,
              speaker: '굴착기 하체 회수대',
              conversationId: SCRAP_MINE_PART_CONVERSATION_ID,
              conversationTitle: '굴착기 다리 부품 회수',
              lines: [
                '굴착기 하체·구동부를 확보했다. 차고 조립식 로봇 완성도 20%.',
                '고철 대왕은 막힌 산길을 우회한다. D-DAY +2일, 다음 지역은 자유롭게 선택할 수 있다.',
              ],
              campaignRegionId: 'abandoned-mine',
              campaignStageKind: 'part-claimed',
              completeCampaignRegion: true,
              enabled: false,
            },
          ],
          triggers: [],
          portals: ['mine-tunnel-machine-portal'],
        },
      ],
    },
    {
      id: SCRAP_SHIPYARD_REGION_ID,
      label: '항구 조선소',
      rooms: [
        {
          id: SCRAP_SHIPYARD_ROAD_ROOM_ID,
          label: '항구 조선소 · 연결로 진입부',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'shipyard-roadhead-ground-surface',
              kind: 'solid',
              material: 'harbor-painted-steel-road',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems: shipyardRoadheadRenderItems,
          entities: [
            {
              id: 'shipyard-worker-briefing',
              kind: 'story-interaction',
              position: { x: 620, y: 354 },
              interactionRange: 84,
              speaker: '조선소 용접공',
              conversationId: SCRAP_SHIPYARD_WORKER_CONVERSATION_ID,
              conversationTitle: '점거된 조선소 탈환 요청',
              lines: [
                '수거 유닛이 건선거를 점거해 마지막 선박의 외판 수리가 멈췄어.',
                '도크를 되찾아 수리를 끝내면 퇴역할 쌍둥이 크레인의 유압 장치를 넘겨줄게.',
                '왼쪽 현황판에서 점거 범위와 작업 시간을 먼저 확인해 줘.',
              ],
              presentationProfileId: 'shipyard-worker',
              campaignRegionId: SCRAP_SHIPYARD_REGION_ID,
              campaignStageKind: 'npc-briefing',
            },
            {
              id: 'shipyard-facility-inspection',
              kind: 'story-interaction',
              position: { x: 862, y: 354 },
              interactionRange: 78,
              speaker: '조선소 도크 현황판',
              conversationId: SCRAP_SHIPYARD_FACILITY_CONVERSATION_ID,
              conversationTitle: '점거 범위와 선박 수리 시간 확인',
              lines: [
                '건선거 점거 해제, 수거 유닛 제거, 크레인 제압과 마지막 선박 외판 수리까지 14구간 예상.',
                '성공하면 고철 대왕은 막힌 해안 운송로를 우회해 수도 도착이 3일 늦어진다.',
              ],
              campaignRegionId: SCRAP_SHIPYARD_REGION_ID,
              campaignStageKind: 'facility-observed',
              requestCampaignEventStart: true,
              enabled: false,
            },
          ],
          triggers: [],
          portals: [SCRAP_SHIPYARD_ROAD_PORTAL_ID, 'shipyard-roadhead-drydock-portal'],
        },
        {
          id: SCRAP_SHIPYARD_DRYDOCK_ROOM_ID,
          label: '항구 조선소 · 점거된 건선거',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'shipyard-drydock-ground-surface',
              kind: 'solid',
              material: 'occupied-drydock-steel',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems: shipyardDrydockRenderItems,
          entities: [
            {
              id: 'shipyard-drydock-collector-unit',
              kind: 'combat-enemy',
              encounterProfileId: 'shipyard-drydock-collector',
              position: { x: 800, y: 426 },
              maxHealth: 84,
              campaignRegionId: SCRAP_SHIPYARD_REGION_ID,
              campaignStageKind: 'journey-combat',
            },
          ],
          triggers: [],
          portals: ['shipyard-roadhead-drydock-portal', 'shipyard-drydock-crane-portal'],
        },
        {
          id: SCRAP_SHIPYARD_CRANE_ROOM_ID,
          label: '항구 조선소 · 쌍둥이 크레인 부두',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'shipyard-crane-ground-surface',
              kind: 'solid',
              material: 'twin-crane-pier-steel',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems: shipyardCraneRenderItems,
          entities: [
            {
              id: 'shipyard-twin-crane-boss',
              kind: 'combat-enemy',
              encounterProfileId: 'shipyard-twin-crane-boss',
              position: { x: 850, y: 426 },
              maxHealth: 126,
              campaignRegionId: SCRAP_SHIPYARD_REGION_ID,
              campaignStageKind: 'boss-defeated',
            },
            {
              id: 'shipyard-last-ship-repair',
              kind: 'story-interaction',
              position: { x: 360, y: 354 },
              interactionRange: 82,
              speaker: '조선소 용접공',
              conversationId: SCRAP_SHIPYARD_REPLACEMENT_CONVERSATION_ID,
              conversationTitle: '마지막 선박 외판 수리',
              lines: [
                '건선거와 크레인을 되찾았어. 이 교체 외판만 용접하면 마지막 선박이 출항할 수 있어.',
                '수리 완료. 이제 퇴역할 쌍둥이 크레인의 압력을 빼고 유압 장치를 분리하자.',
              ],
              presentationProfileId: 'shipyard-worker',
              campaignRegionId: SCRAP_SHIPYARD_REGION_ID,
              campaignStageKind: 'replacement-complete',
              enabled: false,
            },
            {
              id: 'shipyard-crane-separation',
              kind: 'story-interaction',
              position: { x: 860, y: 354 },
              interactionRange: 92,
              speaker: '쌍둥이 소형 크레인',
              conversationId: SCRAP_SHIPYARD_SEPARATION_CONVERSATION_ID,
              conversationTitle: '쌍둥이 크레인 유압 장치 분리',
              lines: [
                '좌우 붐의 잔압을 제거했다. 굵은 케이블과 유압 실린더 잠금핀을 차례로 해제한다.',
                '청록 도장강 팔과 유압 장치가 회수대에 고정됐다. 차고 로봇의 팔로 사용할 수 있다.',
              ],
              campaignRegionId: SCRAP_SHIPYARD_REGION_ID,
              campaignStageKind: 'machine-separated',
              enabled: false,
            },
            {
              id: 'shipyard-hydraulics-part-claim',
              kind: 'story-interaction',
              position: { x: 1120, y: 354 },
              interactionRange: 88,
              speaker: '크레인 유압 장치 회수대',
              conversationId: SCRAP_SHIPYARD_PART_CONVERSATION_ID,
              conversationTitle: '크레인 팔 부품 회수',
              lines: [
                '쌍둥이 크레인 유압 장치를 확보했다. 차고 조립식 로봇의 팔이 누적 조립된다.',
                '고철 대왕은 해안 운송로를 우회한다. D-DAY +3일, 다음 지역은 자유롭게 선택할 수 있다.',
              ],
              campaignRegionId: SCRAP_SHIPYARD_REGION_ID,
              campaignStageKind: 'part-claimed',
              completeCampaignRegion: true,
              enabled: false,
            },
          ],
          triggers: [],
          portals: ['shipyard-drydock-crane-portal'],
        },
      ],
    },
    {
      id: SCRAP_GREENHOUSE_REGION_ID,
      label: '온실 평원',
      rooms: [
        {
          id: SCRAP_GREENHOUSE_ROAD_ROOM_ID,
          label: '온실 평원 · 연결로 진입부',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'greenhouse-roadhead-ground-surface',
              kind: 'solid',
              material: 'greenhouse-packed-road',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems: greenhouseRoadheadRenderItems,
          entities: [
            {
              id: 'greenhouse-technician-briefing',
              kind: 'story-interaction',
              position: { x: 612, y: 354 },
              interactionRange: 84,
              speaker: '온실 기술자',
              conversationId: SCRAP_GREENHOUSE_TECHNICIAN_CONVERSATION_ID,
              conversationTitle: '파열된 지열 설비 복구 요청',
              lines: [
                '주 배관이 터져 온실 작물 난방이 멈췄어. 기생 기계가 압력선을 뜯어 먹고 있고.',
                '안전한 저압 배관을 연결하면 불안정한 구형 고출력 동력로를 완전히 떼어낼 수 있어.',
                '오른쪽 압력판에서 파손 범위와 복구 시간을 먼저 확인해 줘.',
              ],
              presentationProfileId: 'greenhouse-technician',
              campaignRegionId: SCRAP_GREENHOUSE_REGION_ID,
              campaignStageKind: 'npc-briefing',
            },
            {
              id: 'greenhouse-facility-inspection',
              kind: 'story-interaction',
              position: { x: 832, y: 354 },
              interactionRange: 78,
              speaker: '온실 지열 압력 현황판',
              conversationId: SCRAP_GREENHOUSE_FACILITY_CONVERSATION_ID,
              conversationTitle: '배관 파손과 복구 시간 확인',
              lines: [
                '기생 기계 제거, 압력선 확보, 조절기 제압과 안전한 저압 지열 배관 복구까지 18구간 예상.',
                '성공하면 고철 대왕은 과열 평원을 우회해 수도 도착이 4일 늦어진다.',
              ],
              campaignRegionId: SCRAP_GREENHOUSE_REGION_ID,
              campaignStageKind: 'facility-observed',
              requestCampaignEventStart: true,
              enabled: false,
            },
          ],
          triggers: [],
          portals: [SCRAP_GREENHOUSE_ROAD_PORTAL_ID, 'greenhouse-roadhead-pipeline-portal'],
        },
        {
          id: SCRAP_GREENHOUSE_PIPE_ROOM_ID,
          label: '온실 평원 · 파열 지열 배관',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'greenhouse-pipeline-ground-surface',
              kind: 'solid',
              material: 'ruptured-geothermal-pipeline',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems: greenhousePipelineRenderItems,
          entities: [
            {
              id: 'greenhouse-pipe-parasite',
              kind: 'combat-enemy',
              encounterProfileId: 'greenhouse-pipe-parasite',
              position: { x: 808, y: 426 },
              maxHealth: 88,
              campaignRegionId: SCRAP_GREENHOUSE_REGION_ID,
              campaignStageKind: 'journey-combat',
            },
          ],
          triggers: [],
          portals: ['greenhouse-roadhead-pipeline-portal', 'greenhouse-pipeline-reactor-portal'],
        },
        {
          id: SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
          label: '온실 평원 · 구형 고출력 동력로실',
          bounds: { x: 0, y: 0, width: 1440, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 426,
          movementBounds: { minX: 24, maxX: 1416 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'greenhouse-reactor-ground-surface',
              kind: 'solid',
              material: 'old-reactor-house-floor',
              points: [
                { x: 0, y: 426 },
                { x: 1440, y: 426 },
              ],
            },
          ],
          renderItems: greenhouseReactorRenderItems,
          entities: [
            {
              id: 'greenhouse-geothermal-boss',
              kind: 'combat-enemy',
              encounterProfileId: 'greenhouse-geothermal-boss',
              position: { x: 850, y: 426 },
              maxHealth: 132,
              campaignRegionId: SCRAP_GREENHOUSE_REGION_ID,
              campaignStageKind: 'boss-defeated',
            },
            {
              id: 'greenhouse-safe-system-restoration',
              kind: 'story-interaction',
              position: { x: 360, y: 354 },
              interactionRange: 84,
              speaker: '온실 기술자',
              conversationId: SCRAP_GREENHOUSE_REPLACEMENT_CONVERSATION_ID,
              conversationTitle: '안전한 저압 지열 설비 복구',
              lines: [
                '기생 기계와 과열 조절기가 멈췄어. 이 저압 배관을 연결하면 온실 난방을 안전하게 돌릴 수 있어.',
                '압력 안정. 작물 난방이 복구됐고 구형 고출력 동력로는 생활 설비에서 완전히 분리됐어.',
              ],
              presentationProfileId: 'greenhouse-technician',
              campaignRegionId: SCRAP_GREENHOUSE_REGION_ID,
              campaignStageKind: 'replacement-complete',
              enabled: false,
            },
            {
              id: 'greenhouse-reactor-separation',
              kind: 'story-interaction',
              position: { x: 850, y: 354 },
              interactionRange: 94,
              speaker: '구형 고출력 마력 동력로',
              conversationId: SCRAP_GREENHOUSE_SEPARATION_CONVERSATION_ID,
              conversationTitle: '고출력 동력로 분리',
              lines: [
                '냉각 우회선이 가동됐다. 황동 압력 밸브와 좌우 지열 배관의 잠금핀을 해제한다.',
                '고출력 동력로가 회수대에 고정됐다. 차고 로봇의 주 동력원으로 사용할 수 있다.',
              ],
              campaignRegionId: SCRAP_GREENHOUSE_REGION_ID,
              campaignStageKind: 'machine-separated',
              enabled: false,
            },
            {
              id: 'greenhouse-reactor-part-claim',
              kind: 'story-interaction',
              position: { x: 1128, y: 354 },
              interactionRange: 90,
              speaker: '고출력 동력로 회수대',
              conversationId: SCRAP_GREENHOUSE_PART_CONVERSATION_ID,
              conversationTitle: '주 동력원 부품 회수',
              lines: [
                '구형 고출력 동력로를 확보했다. 차고 조립식 로봇의 주 동력원이 누적 조립된다.',
                '고철 대왕은 과열 평원을 우회한다. D-DAY +4일, 다음 지역은 자유롭게 선택할 수 있다.',
              ],
              campaignRegionId: SCRAP_GREENHOUSE_REGION_ID,
              campaignStageKind: 'part-claimed',
              completeCampaignRegion: true,
              enabled: false,
            },
          ],
          triggers: [],
          portals: ['greenhouse-pipeline-reactor-portal'],
        },
      ],
    },
  ],
  portals: [
    {
      id: SCRAP_MINE_ROAD_PORTAL_ID,
      enabled: false,
      bidirectional: true,
      from: {
        regionId: SCRAP_AWAKENING_REGION_ID,
        roomId: SCRAP_AWAKENING_ROOM_ID,
        anchor: { x: 1372, y: 426 },
        spawn: { x: 1320, y: 350 },
        radius: 76,
      },
      to: {
        regionId: SCRAP_MINE_ROAD_REGION_ID,
        roomId: SCRAP_MINE_ROAD_ROOM_ID,
        anchor: { x: 68, y: 426 },
        spawn: { x: 118, y: 350 },
        radius: 76,
      },
      campaignTravel: {
        routeId: 'road:neighborhood-scrapyard:abandoned-mine',
        fromLocationId: 'neighborhood-scrapyard',
        toLocationId: 'abandoned-mine',
      },
      transition: { durationSeconds: 0.48 },
    },
    {
      id: 'mine-roadhead-tunnel-portal',
      enabled: false,
      bidirectional: true,
      from: {
        regionId: SCRAP_MINE_ROAD_REGION_ID,
        roomId: SCRAP_MINE_ROAD_ROOM_ID,
        anchor: { x: 1346, y: 426 },
        spawn: { x: 1288, y: 350 },
        radius: 74,
      },
      to: {
        regionId: SCRAP_MINE_ROAD_REGION_ID,
        roomId: SCRAP_MINE_TUNNEL_ROOM_ID,
        anchor: { x: 74, y: 426 },
        spawn: { x: 132, y: 350 },
        radius: 74,
      },
      transition: { durationSeconds: 0.36 },
    },
    {
      id: 'mine-tunnel-machine-portal',
      enabled: false,
      bidirectional: true,
      from: {
        regionId: SCRAP_MINE_ROAD_REGION_ID,
        roomId: SCRAP_MINE_TUNNEL_ROOM_ID,
        anchor: { x: 1366, y: 426 },
        spawn: { x: 1308, y: 350 },
        radius: 74,
      },
      to: {
        regionId: SCRAP_MINE_ROAD_REGION_ID,
        roomId: SCRAP_MINE_MACHINE_ROOM_ID,
        anchor: { x: 74, y: 426 },
        spawn: { x: 132, y: 350 },
        radius: 74,
      },
      transition: { durationSeconds: 0.36 },
    },
    {
      id: SCRAP_SHIPYARD_ROAD_PORTAL_ID,
      enabled: false,
      bidirectional: true,
      from: {
        regionId: SCRAP_AWAKENING_REGION_ID,
        roomId: SCRAP_AWAKENING_ROOM_ID,
        anchor: { x: 68, y: 426 },
        spawn: { x: 122, y: 350 },
        radius: 76,
      },
      to: {
        regionId: SCRAP_SHIPYARD_REGION_ID,
        roomId: SCRAP_SHIPYARD_ROAD_ROOM_ID,
        anchor: { x: 68, y: 426 },
        spawn: { x: 122, y: 350 },
        radius: 76,
      },
      campaignTravel: {
        routeId: 'road:neighborhood-scrapyard:harbor-shipyard',
        fromLocationId: 'neighborhood-scrapyard',
        toLocationId: SCRAP_SHIPYARD_REGION_ID,
      },
      transition: { durationSeconds: 0.48 },
    },
    {
      id: 'shipyard-roadhead-drydock-portal',
      enabled: false,
      bidirectional: true,
      from: {
        regionId: SCRAP_SHIPYARD_REGION_ID,
        roomId: SCRAP_SHIPYARD_ROAD_ROOM_ID,
        anchor: { x: 1372, y: 426 },
        spawn: { x: 1314, y: 350 },
        radius: 74,
      },
      to: {
        regionId: SCRAP_SHIPYARD_REGION_ID,
        roomId: SCRAP_SHIPYARD_DRYDOCK_ROOM_ID,
        anchor: { x: 68, y: 426 },
        spawn: { x: 126, y: 350 },
        radius: 74,
      },
      transition: { durationSeconds: 0.36 },
    },
    {
      id: 'shipyard-drydock-crane-portal',
      enabled: false,
      bidirectional: true,
      from: {
        regionId: SCRAP_SHIPYARD_REGION_ID,
        roomId: SCRAP_SHIPYARD_DRYDOCK_ROOM_ID,
        anchor: { x: 1372, y: 426 },
        spawn: { x: 1314, y: 350 },
        radius: 74,
      },
      to: {
        regionId: SCRAP_SHIPYARD_REGION_ID,
        roomId: SCRAP_SHIPYARD_CRANE_ROOM_ID,
        anchor: { x: 68, y: 426 },
        spawn: { x: 126, y: 350 },
        radius: 74,
      },
      transition: { durationSeconds: 0.36 },
    },
    {
      id: SCRAP_GREENHOUSE_ROAD_PORTAL_ID,
      enabled: false,
      bidirectional: true,
      from: {
        regionId: SCRAP_AWAKENING_REGION_ID,
        roomId: SCRAP_AWAKENING_ROOM_ID,
        anchor: { x: 1200, y: 426 },
        spawn: { x: 1148, y: 350 },
        radius: 76,
      },
      to: {
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        roomId: SCRAP_GREENHOUSE_ROAD_ROOM_ID,
        anchor: { x: 68, y: 426 },
        spawn: { x: 122, y: 350 },
        radius: 76,
      },
      campaignTravel: {
        routeId: 'road:neighborhood-scrapyard:greenhouse-plains',
        fromLocationId: 'neighborhood-scrapyard',
        toLocationId: SCRAP_GREENHOUSE_REGION_ID,
      },
      transition: { durationSeconds: 0.48 },
    },
    {
      id: 'greenhouse-roadhead-pipeline-portal',
      enabled: false,
      bidirectional: true,
      from: {
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        roomId: SCRAP_GREENHOUSE_ROAD_ROOM_ID,
        anchor: { x: 1372, y: 426 },
        spawn: { x: 1314, y: 350 },
        radius: 74,
      },
      to: {
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        roomId: SCRAP_GREENHOUSE_PIPE_ROOM_ID,
        anchor: { x: 68, y: 426 },
        spawn: { x: 126, y: 350 },
        radius: 74,
      },
      transition: { durationSeconds: 0.36 },
    },
    {
      id: 'greenhouse-pipeline-reactor-portal',
      enabled: false,
      bidirectional: true,
      from: {
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        roomId: SCRAP_GREENHOUSE_PIPE_ROOM_ID,
        anchor: { x: 1372, y: 426 },
        spawn: { x: 1314, y: 350 },
        radius: 74,
      },
      to: {
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        roomId: SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
        anchor: { x: 68, y: 426 },
        spawn: { x: 126, y: 350 },
        radius: 74,
      },
      transition: { durationSeconds: 0.36 },
    },
  ],
  patches: [
    {
      id: 'scrap-device-recovered',
      priority: 10,
      when: { fact: 'scrapAwakeningStageId', in: activatedStages },
      operations: [
        { op: 'set-enabled', target: 'scrap-device-glow-outer', value: false },
        { op: 'set-enabled', target: 'scrap-device-core', value: false },
        { op: 'set-enabled', target: SCRAP_AWAKENING_DEVICE_ENTITY_ID, value: false },
      ],
    },
    {
      id: 'scrap-king-eyes-lit',
      priority: 20,
      when: { fact: 'scrapAwakeningStageId', in: eyeStages },
      operations: [
        { op: 'set-enabled', target: 'scrap-king-eye-left', value: true },
        { op: 'set-enabled', target: 'scrap-king-eye-right', value: true },
      ],
    },
    {
      id: 'scrap-king-parts-assembled',
      priority: 30,
      when: { fact: 'scrapAwakeningStageId', in: assemblyStages },
      operations: [
        { op: 'set-enabled', target: 'scrap-king-shoulder-left', value: true },
        { op: 'set-enabled', target: 'scrap-king-shoulder-right', value: true },
        { op: 'set-enabled', target: 'scrap-king-cable-bundle', value: true },
      ],
    },
    {
      id: 'scrap-king-deadline-revealed',
      priority: 40,
      when: { fact: 'scrapAwakeningStageId', in: deadlineStages },
      operations: [{ op: 'set-enabled', target: 'scrap-king-route-beacon', value: true }],
    },
    {
      id: 'scrapyard-owner-returned',
      priority: 50,
      when: { fact: 'scrapAwakeningStageId', in: ownerVisibleStages },
      operations: [
        { op: 'set-enabled', target: 'scrapyard-owner-torso', value: true },
        { op: 'set-enabled', target: 'scrapyard-owner-head', value: true },
        { op: 'set-enabled', target: 'scrapyard-owner-goggles', value: true },
        { op: 'set-enabled', target: 'scrapyard-owner-ledger', value: true },
        { op: 'set-enabled', target: 'scrapyard-owner-wrench', value: true },
        { op: 'set-enabled', target: SCRAPYARD_OWNER_ENTITY_ID, value: true },
      ],
    },
    {
      id: 'scrapyard-device-analysis',
      priority: 60,
      when: { fact: 'scrapGarageRevealStageId', in: deviceAnalysisStages },
      operations: [
        { op: 'set-enabled', target: 'scrapyard-device-analysis-beam', value: true },
        { op: 'set-enabled', target: 'scrapyard-analysis-device-core', value: true },
      ],
    },
    {
      id: 'scrapyard-operation-map-revealed',
      priority: 70,
      when: { fact: 'scrapGarageRevealStageId', in: operationMapVisibleStages },
      operations: [
        { op: 'set-enabled', target: 'scrapyard-wall-map-frame', value: true },
        { op: 'set-enabled', target: 'scrapyard-wall-map-route', value: true },
      ],
    },
    {
      id: 'scrapyard-garage-opened',
      priority: 80,
      when: { fact: 'scrapGarageRevealStageId', in: garageOpenStages },
      operations: [
        { op: 'set-enabled', target: 'scrapyard-garage-door-left', value: false },
        { op: 'set-enabled', target: 'scrapyard-garage-door-right', value: false },
        { op: 'set-enabled', target: 'garage-robot-frame-torso', value: true },
        { op: 'set-enabled', target: 'garage-robot-frame-leg-left', value: true },
        { op: 'set-enabled', target: 'garage-robot-frame-leg-right', value: true },
        { op: 'set-enabled', target: 'garage-robot-brain-core', value: true },
        { op: 'set-enabled', target: 'garage-robot-zero-label', value: true },
      ],
    },
    {
      id: 'scrapyard-wall-map-interactive',
      priority: 90,
      when: { fact: 'scrapGarageRevealStageId', eq: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE },
      operations: [{ op: 'set-enabled', target: SCRAPYARD_WALL_MAP_ENTITY_ID, value: true }],
    },
    {
      id: 'scrapyard-mine-road-open',
      priority: 100,
      when: { fact: 'scrapGarageRevealStageId', eq: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE },
      operations: [
        { op: 'set-enabled', target: SCRAP_MINE_ROAD_PORTAL_ID, value: true },
        {
          op: 'set-enabled',
          target: 'scrapyard-mine-road-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'scrapyard-mine-road-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'scrapyard-mine-road-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'scrapyard-mine-road-sign', value: true },
        {
          op: 'set-enabled',
          target: 'mine-roadhead-return-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'mine-roadhead-return-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'mine-roadhead-return-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'mine-roadhead-return-sign', value: true },
      ],
    },
    {
      id: 'scrapyard-shipyard-road-open',
      priority: 105,
      when: { fact: 'scrapGarageRevealStageId', eq: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE },
      operations: [
        { op: 'set-enabled', target: SCRAP_SHIPYARD_ROAD_PORTAL_ID, value: true },
        {
          op: 'set-enabled',
          target: 'scrapyard-shipyard-road-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'scrapyard-shipyard-road-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'scrapyard-shipyard-road-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'scrapyard-shipyard-road-sign', value: true },
        {
          op: 'set-enabled',
          target: 'shipyard-roadhead-return-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'shipyard-roadhead-return-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'shipyard-roadhead-return-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'shipyard-roadhead-return-sign', value: true },
      ],
    },
    {
      id: 'scrapyard-greenhouse-road-open',
      priority: 107,
      when: { fact: 'scrapGarageRevealStageId', eq: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE },
      operations: [
        { op: 'set-enabled', target: SCRAP_GREENHOUSE_ROAD_PORTAL_ID, value: true },
        {
          op: 'set-enabled',
          target: 'scrapyard-greenhouse-road-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'scrapyard-greenhouse-road-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'scrapyard-greenhouse-road-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'scrapyard-greenhouse-road-sign', value: true },
        {
          op: 'set-enabled',
          target: 'greenhouse-roadhead-return-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'greenhouse-roadhead-return-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'greenhouse-roadhead-return-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'greenhouse-roadhead-return-sign', value: true },
      ],
    },
    {
      id: 'scrapyard-walker-drive-installed',
      priority: 110,
      when: { fact: 'scrapCollectedPartIds', includes: 'walker-drive' },
      operations: [
        { op: 'set-enabled', target: 'garage-robot-frame-leg-left', value: false },
        { op: 'set-enabled', target: 'garage-robot-frame-leg-right', value: false },
        { op: 'set-enabled', target: 'garage-robot-zero-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-walker-leg-left', value: true },
        { op: 'set-enabled', target: 'garage-robot-walker-leg-right', value: true },
        { op: 'set-enabled', target: 'garage-robot-twenty-label', value: true },
      ],
    },
    {
      id: 'scrapyard-crane-hydraulics-installed',
      priority: 112,
      when: { fact: 'scrapCollectedPartIds', includes: 'crane-hydraulics' },
      operations: [
        { op: 'set-enabled', target: 'garage-robot-zero-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-crane-arm-left', value: true },
        { op: 'set-enabled', target: 'garage-robot-crane-arm-right', value: true },
        { op: 'set-enabled', target: 'garage-robot-crane-cable', value: true },
        { op: 'set-enabled', target: 'garage-robot-crane-twenty-label', value: true },
      ],
    },
    {
      id: 'scrapyard-arcane-reactor-installed',
      priority: 113,
      when: { fact: 'scrapCollectedPartIds', includes: 'arcane-reactor' },
      operations: [
        { op: 'set-enabled', target: 'garage-robot-zero-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-reactor-core', value: true },
        { op: 'set-enabled', target: 'garage-robot-reactor-pipe-left', value: true },
        { op: 'set-enabled', target: 'garage-robot-reactor-pipe-right', value: true },
        { op: 'set-enabled', target: 'garage-robot-reactor-twenty-label', value: true },
      ],
    },
    {
      id: 'scrapyard-walker-crane-forty-percent',
      priority: 114,
      when: {
        all: [
          { fact: 'scrapCollectedPartIds', includes: 'walker-drive' },
          { fact: 'scrapCollectedPartIds', includes: 'crane-hydraulics' },
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'garage-robot-twenty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-crane-twenty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-forty-label', value: true },
      ],
    },
    {
      id: 'scrapyard-walker-reactor-forty-percent',
      priority: 115,
      when: {
        all: [
          { fact: 'scrapCollectedPartIds', includes: 'walker-drive' },
          { fact: 'scrapCollectedPartIds', includes: 'arcane-reactor' },
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'garage-robot-twenty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-reactor-twenty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-forty-label', value: true },
      ],
    },
    {
      id: 'scrapyard-crane-reactor-forty-percent',
      priority: 116,
      when: {
        all: [
          { fact: 'scrapCollectedPartIds', includes: 'crane-hydraulics' },
          { fact: 'scrapCollectedPartIds', includes: 'arcane-reactor' },
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'garage-robot-crane-twenty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-reactor-twenty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-forty-label', value: true },
      ],
    },
    {
      id: 'scrapyard-first-three-sixty-percent',
      priority: 117,
      when: {
        all: [
          { fact: 'scrapCollectedPartIds', includes: 'walker-drive' },
          { fact: 'scrapCollectedPartIds', includes: 'crane-hydraulics' },
          { fact: 'scrapCollectedPartIds', includes: 'arcane-reactor' },
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'garage-robot-twenty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-crane-twenty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-reactor-twenty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-forty-label', value: false },
        { op: 'set-enabled', target: 'garage-robot-sixty-label', value: true },
      ],
    },
    {
      id: 'mine-briefing-complete',
      priority: 120,
      when: {
        all: [
          {
            fact: 'scrapRegionStageIds.abandoned-mine',
            in: ['abandoned-mine:npc-briefing', 'abandoned-mine:facility-observed'],
          },
          { fact: 'scrapRegionStatuses.abandoned-mine', eq: 'available' },
        ],
      },
      operations: [{ op: 'set-enabled', target: 'mine-facility-inspection', value: true }],
    },
    {
      id: 'mine-core-event-started',
      priority: 130,
      when: { fact: 'scrapRegionStatuses.abandoned-mine', in: ['in-progress', 'resolved'] },
      operations: [
        { op: 'set-enabled', target: 'mine-facility-inspection', value: false },
        { op: 'set-enabled', target: SCRAP_MINE_ROAD_PORTAL_ID, value: false },
        { op: 'set-enabled', target: 'mine-roadhead-tunnel-portal', value: true },
        {
          op: 'set-enabled',
          target: 'mine-rescue-tunnel-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'mine-rescue-tunnel-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'mine-rescue-tunnel-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'mine-rescue-tunnel-sign', value: true },
      ],
    },
    {
      id: 'mine-journey-combat-complete',
      priority: 140,
      when: {
        fact: 'scrapRegionStageIds.abandoned-mine',
        in: [
          'abandoned-mine:journey-combat',
          'abandoned-mine:boss-defeated',
          'abandoned-mine:replacement-complete',
          'abandoned-mine:machine-separated',
          'abandoned-mine:campaign-updated',
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'mine-tunnel-collector-unit', value: false },
        { op: 'set-enabled', target: 'mine-tunnel-machine-portal', value: true },
        {
          op: 'set-enabled',
          target: 'mine-tunnel-machine-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'mine-tunnel-machine-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'mine-tunnel-machine-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'mine-tunnel-machine-sign', value: true },
      ],
    },
    {
      id: 'mine-boss-defeated',
      priority: 150,
      when: {
        fact: 'scrapRegionStageIds.abandoned-mine',
        in: [
          'abandoned-mine:boss-defeated',
          'abandoned-mine:replacement-complete',
          'abandoned-mine:machine-separated',
          'abandoned-mine:campaign-updated',
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'mine-collapse-walker-boss', value: false },
        { op: 'set-enabled', target: 'mine-replacement-work', value: true },
      ],
    },
    {
      id: 'mine-replacement-complete',
      priority: 160,
      when: {
        fact: 'scrapRegionStageIds.abandoned-mine',
        in: [
          'abandoned-mine:replacement-complete',
          'abandoned-mine:machine-separated',
          'abandoned-mine:campaign-updated',
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'mine-replacement-work', value: false },
        { op: 'set-enabled', target: 'mine-replacement-brace', value: true },
        { op: 'set-enabled', target: 'mine-replacement-signal', value: true },
        { op: 'set-enabled', target: 'mine-machine-separation', value: true },
      ],
    },
    {
      id: 'mine-machine-separated',
      priority: 170,
      when: {
        fact: 'scrapRegionStageIds.abandoned-mine',
        in: ['abandoned-mine:machine-separated', 'abandoned-mine:campaign-updated'],
      },
      operations: [
        { op: 'set-enabled', target: 'mine-machine-separation', value: false },
        { op: 'set-enabled', target: 'mine-walker-chassis', value: false },
        { op: 'set-enabled', target: 'mine-walker-leg-left', value: false },
        { op: 'set-enabled', target: 'mine-walker-leg-right', value: false },
        { op: 'set-enabled', target: 'mine-walker-warning-lamp', value: false },
        { op: 'set-enabled', target: 'mine-walker-separated-chassis', value: true },
        { op: 'set-enabled', target: 'mine-walker-part-cradle', value: true },
        { op: 'set-enabled', target: 'mine-walker-part-signal', value: true },
        { op: 'set-enabled', target: 'mine-walker-part-claim', value: true },
      ],
    },
    {
      id: 'mine-campaign-updated',
      priority: 180,
      when: { fact: 'scrapRegionStageIds.abandoned-mine', eq: 'abandoned-mine:campaign-updated' },
      operations: [
        { op: 'set-enabled', target: 'mine-walker-part-claim', value: false },
        { op: 'set-enabled', target: SCRAP_MINE_ROAD_PORTAL_ID, value: true },
        {
          op: 'set',
          target: 'mine-walker-part-signal',
          property: 'label',
          value: 'WALKER DRIVE · 차고 수송 완료',
        },
      ],
    },
    {
      id: 'shipyard-briefing-complete',
      priority: 190,
      when: {
        all: [
          {
            fact: 'scrapRegionStageIds.harbor-shipyard',
            in: ['harbor-shipyard:npc-briefing', 'harbor-shipyard:facility-observed'],
          },
          { fact: 'scrapRegionStatuses.harbor-shipyard', eq: 'available' },
        ],
      },
      operations: [{ op: 'set-enabled', target: 'shipyard-facility-inspection', value: true }],
    },
    {
      id: 'shipyard-core-event-started',
      priority: 200,
      when: { fact: 'scrapRegionStatuses.harbor-shipyard', in: ['in-progress', 'resolved'] },
      operations: [
        { op: 'set-enabled', target: 'shipyard-facility-inspection', value: false },
        { op: 'set-enabled', target: SCRAP_SHIPYARD_ROAD_PORTAL_ID, value: false },
        { op: 'set-enabled', target: 'shipyard-roadhead-drydock-portal', value: true },
        {
          op: 'set-enabled',
          target: 'shipyard-drydock-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'shipyard-drydock-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'shipyard-drydock-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'shipyard-drydock-sign', value: true },
      ],
    },
    {
      id: 'shipyard-journey-combat-complete',
      priority: 210,
      when: {
        fact: 'scrapRegionStageIds.harbor-shipyard',
        in: [
          'harbor-shipyard:journey-combat',
          'harbor-shipyard:boss-defeated',
          'harbor-shipyard:replacement-complete',
          'harbor-shipyard:machine-separated',
          'harbor-shipyard:campaign-updated',
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'shipyard-drydock-collector-unit', value: false },
        { op: 'set-enabled', target: 'shipyard-drydock-crane-portal', value: true },
        {
          op: 'set-enabled',
          target: 'shipyard-drydock-crane-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'shipyard-drydock-crane-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'shipyard-drydock-crane-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'shipyard-crane-pier-sign', value: true },
      ],
    },
    {
      id: 'shipyard-boss-defeated',
      priority: 220,
      when: {
        fact: 'scrapRegionStageIds.harbor-shipyard',
        in: [
          'harbor-shipyard:boss-defeated',
          'harbor-shipyard:replacement-complete',
          'harbor-shipyard:machine-separated',
          'harbor-shipyard:campaign-updated',
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'shipyard-twin-crane-boss', value: false },
        { op: 'set-enabled', target: 'shipyard-last-ship-repair', value: true },
      ],
    },
    {
      id: 'shipyard-replacement-complete',
      priority: 230,
      when: {
        fact: 'scrapRegionStageIds.harbor-shipyard',
        in: [
          'harbor-shipyard:replacement-complete',
          'harbor-shipyard:machine-separated',
          'harbor-shipyard:campaign-updated',
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'shipyard-last-ship-repair', value: false },
        { op: 'set-enabled', target: 'shipyard-last-ship-patch', value: true },
        { op: 'set-enabled', target: 'shipyard-last-ship-weld', value: true },
        { op: 'set-enabled', target: 'shipyard-crane-separation', value: true },
      ],
    },
    {
      id: 'shipyard-machine-separated',
      priority: 240,
      when: {
        fact: 'scrapRegionStageIds.harbor-shipyard',
        in: ['harbor-shipyard:machine-separated', 'harbor-shipyard:campaign-updated'],
      },
      operations: [
        { op: 'set-enabled', target: 'shipyard-crane-separation', value: false },
        { op: 'set-enabled', target: 'shipyard-twin-crane-left-tower', value: false },
        { op: 'set-enabled', target: 'shipyard-twin-crane-right-tower', value: false },
        { op: 'set-enabled', target: 'shipyard-twin-crane-left-arm', value: false },
        { op: 'set-enabled', target: 'shipyard-twin-crane-right-arm', value: false },
        { op: 'set-enabled', target: 'shipyard-twin-crane-left-cylinder', value: false },
        { op: 'set-enabled', target: 'shipyard-twin-crane-right-cylinder', value: false },
        { op: 'set-enabled', target: 'shipyard-twin-crane-thick-cable', value: false },
        { op: 'set-enabled', target: 'shipyard-separated-crane-towers', value: true },
        { op: 'set-enabled', target: 'shipyard-hydraulics-cradle', value: true },
        { op: 'set-enabled', target: 'shipyard-hydraulics-signal', value: true },
        { op: 'set-enabled', target: 'shipyard-hydraulics-part-claim', value: true },
      ],
    },
    {
      id: 'shipyard-campaign-updated',
      priority: 250,
      when: {
        fact: 'scrapRegionStageIds.harbor-shipyard',
        eq: 'harbor-shipyard:campaign-updated',
      },
      operations: [
        { op: 'set-enabled', target: 'shipyard-hydraulics-part-claim', value: false },
        { op: 'set-enabled', target: SCRAP_SHIPYARD_ROAD_PORTAL_ID, value: true },
        {
          op: 'set',
          target: 'shipyard-hydraulics-signal',
          property: 'label',
          value: 'CRANE HYDRAULICS · 차고 수송 완료',
        },
      ],
    },
    {
      id: 'greenhouse-briefing-complete',
      priority: 260,
      when: {
        all: [
          {
            fact: 'scrapRegionStageIds.greenhouse-plains',
            in: ['greenhouse-plains:npc-briefing', 'greenhouse-plains:facility-observed'],
          },
          { fact: 'scrapRegionStatuses.greenhouse-plains', eq: 'available' },
        ],
      },
      operations: [{ op: 'set-enabled', target: 'greenhouse-facility-inspection', value: true }],
    },
    {
      id: 'greenhouse-core-event-started',
      priority: 270,
      when: { fact: 'scrapRegionStatuses.greenhouse-plains', in: ['in-progress', 'resolved'] },
      operations: [
        { op: 'set-enabled', target: 'greenhouse-facility-inspection', value: false },
        { op: 'set-enabled', target: SCRAP_GREENHOUSE_ROAD_PORTAL_ID, value: false },
        { op: 'set-enabled', target: 'greenhouse-roadhead-pipeline-portal', value: true },
        {
          op: 'set-enabled',
          target: 'greenhouse-pipeline-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'greenhouse-pipeline-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'greenhouse-pipeline-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'greenhouse-pipeline-sign', value: true },
      ],
    },
    {
      id: 'greenhouse-journey-combat-complete',
      priority: 280,
      when: {
        fact: 'scrapRegionStageIds.greenhouse-plains',
        in: [
          'greenhouse-plains:journey-combat',
          'greenhouse-plains:boss-defeated',
          'greenhouse-plains:replacement-complete',
          'greenhouse-plains:machine-separated',
          'greenhouse-plains:campaign-updated',
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'greenhouse-pipe-parasite', value: false },
        { op: 'set-enabled', target: 'greenhouse-pipeline-reactor-portal', value: true },
        {
          op: 'set-enabled',
          target: 'greenhouse-pipeline-reactor-gate-landmark-structure',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'greenhouse-pipeline-reactor-gate-landmark-opening',
          value: true,
        },
        {
          op: 'set-enabled',
          target: 'greenhouse-pipeline-reactor-gate-landmark-threshold',
          value: true,
        },
        { op: 'set-enabled', target: 'greenhouse-reactor-house-sign', value: true },
      ],
    },
    {
      id: 'greenhouse-boss-defeated',
      priority: 290,
      when: {
        fact: 'scrapRegionStageIds.greenhouse-plains',
        in: [
          'greenhouse-plains:boss-defeated',
          'greenhouse-plains:replacement-complete',
          'greenhouse-plains:machine-separated',
          'greenhouse-plains:campaign-updated',
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'greenhouse-geothermal-boss', value: false },
        { op: 'set-enabled', target: 'greenhouse-safe-system-restoration', value: true },
      ],
    },
    {
      id: 'greenhouse-replacement-complete',
      priority: 300,
      when: {
        fact: 'scrapRegionStageIds.greenhouse-plains',
        in: [
          'greenhouse-plains:replacement-complete',
          'greenhouse-plains:machine-separated',
          'greenhouse-plains:campaign-updated',
        ],
      },
      operations: [
        { op: 'set-enabled', target: 'greenhouse-safe-system-restoration', value: false },
        { op: 'set-enabled', target: 'greenhouse-safe-pipeline', value: true },
        { op: 'set-enabled', target: 'greenhouse-safe-pressure-signal', value: true },
        { op: 'set-enabled', target: 'greenhouse-reactor-separation', value: true },
      ],
    },
    {
      id: 'greenhouse-machine-separated',
      priority: 310,
      when: {
        fact: 'scrapRegionStageIds.greenhouse-plains',
        in: ['greenhouse-plains:machine-separated', 'greenhouse-plains:campaign-updated'],
      },
      operations: [
        { op: 'set-enabled', target: 'greenhouse-reactor-separation', value: false },
        { op: 'set-enabled', target: 'greenhouse-old-reactor-shell', value: false },
        { op: 'set-enabled', target: 'greenhouse-old-reactor-core', value: false },
        { op: 'set-enabled', target: 'greenhouse-old-reactor-pipe-left', value: false },
        { op: 'set-enabled', target: 'greenhouse-old-reactor-pipe-right', value: false },
        { op: 'set-enabled', target: 'greenhouse-separated-reactor-shell', value: true },
        { op: 'set-enabled', target: 'greenhouse-reactor-cradle', value: true },
        { op: 'set-enabled', target: 'greenhouse-reactor-signal', value: true },
        { op: 'set-enabled', target: 'greenhouse-reactor-part-claim', value: true },
      ],
    },
    {
      id: 'greenhouse-campaign-updated',
      priority: 320,
      when: {
        fact: 'scrapRegionStageIds.greenhouse-plains',
        eq: 'greenhouse-plains:campaign-updated',
      },
      operations: [
        { op: 'set-enabled', target: 'greenhouse-reactor-part-claim', value: false },
        { op: 'set-enabled', target: SCRAP_GREENHOUSE_ROAD_PORTAL_ID, value: true },
        {
          op: 'set',
          target: 'greenhouse-reactor-signal',
          property: 'label',
          value: 'ARCANE REACTOR · 차고 수송 완료',
        },
      ],
    },
  ],
});
