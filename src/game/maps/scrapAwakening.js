import { SCRAP_AWAKENING_STAGE } from '../campaign/ScrapAwakeningState.js';
import { defineMap } from '../map/MapDefinition.js';

export const SCRAP_AWAKENING_MAP_ID = 'scrap-awakening-commission';
export const SCRAP_AWAKENING_REGION_ID = 'scrap-waste-edge';
export const SCRAP_AWAKENING_ROOM_ID = 'abandoned-weapon-yard';
export const SCRAP_AWAKENING_DEVICE_ENTITY_ID = 'scrap-control-device';
export const SCRAP_AWAKENING_FOCUS_X = 980;

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
          ],
          triggers: [],
          portals: [],
        },
      ],
    },
  ],
  portals: [],
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
  ],
});
