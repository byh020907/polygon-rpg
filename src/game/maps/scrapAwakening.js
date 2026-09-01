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
          portals: [SCRAP_MINE_ROAD_PORTAL_ID],
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
          entities: [],
          triggers: [],
          portals: [SCRAP_MINE_ROAD_PORTAL_ID],
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
  ],
});
