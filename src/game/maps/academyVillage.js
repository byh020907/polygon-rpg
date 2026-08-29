import { defineMap } from '../map/MapDefinition.js';

const DAY_PALETTE = Object.freeze({
  background: '#18333b',
  arena: '#6eaaa3',
  grid: '#6f9994',
  gridRetro: '#557b76',
  ground: '#332f2c',
  outline: '#1d2026',
});

const NIGHT_PALETTE = Object.freeze({
  background: '#060a14',
  arena: '#101d31',
  grid: '#293952',
  gridRetro: '#1c2a40',
  ground: '#211f27',
  outline: '#090a10',
});

function rectangle(x, y, width, height) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

function regularPolygon(cx, cy, radiusX, radiusY, sides, angleOffset = 0) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = angleOffset + (index / sides) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radiusX, y: cy + Math.sin(angle) * radiusY };
  });
}

function renderItem(id, points, fill, options = {}) {
  return {
    id,
    points,
    fill,
    stroke: options.stroke ?? null,
    lineWidth: options.lineWidth ?? 1,
    opacity: options.opacity ?? 1,
    order: options.order ?? 0,
    enabled: options.enabled ?? true,
  };
}

const backLaneItems = [
  renderItem(
    'distant-ridge',
    [
      { x: 0, y: 300 },
      { x: 120, y: 204 },
      { x: 246, y: 289 },
      { x: 392, y: 170 },
      { x: 530, y: 286 },
      { x: 690, y: 192 },
      { x: 835, y: 276 },
      { x: 960, y: 185 },
      { x: 960, y: 348 },
      { x: 0, y: 348 },
    ],
    '#456f6d',
    { opacity: 0.55, order: -90 },
  ),
  renderItem('academy-main', rectangle(420, 154, 130, 168), '#314f58', {
    stroke: '#1d333b',
    lineWidth: 2,
    order: -82,
  }),
  renderItem(
    'academy-spire',
    [
      { x: 440, y: 154 },
      { x: 486, y: 66 },
      { x: 530, y: 154 },
    ],
    '#314f58',
    { stroke: '#1d333b', lineWidth: 2, order: -81 },
  ),
  renderItem('academy-wing-left', rectangle(330, 214, 110, 108), '#3e6064', {
    stroke: '#213a40',
    lineWidth: 2,
    order: -80,
  }),
  renderItem('academy-wing-right', rectangle(550, 204, 126, 118), '#3e6064', {
    stroke: '#213a40',
    lineWidth: 2,
    order: -80,
  }),
  renderItem('sun', regularPolygon(130, 102, 34, 34, 16, Math.PI / 16), '#f5d990', {
    opacity: 0.86,
    order: -100,
  }),
  renderItem('moon', regularPolygon(130, 102, 31, 31, 16, Math.PI / 16), '#dce7e4', {
    opacity: 0.8,
    order: -100,
    enabled: false,
  }),
  renderItem(
    'back-ground',
    [
      { x: 0, y: 336 },
      { x: 960, y: 336 },
      { x: 960, y: 372 },
      { x: 0, y: 372 },
    ],
    '#365646',
    { stroke: '#203a34', lineWidth: 2, order: 0 },
  ),
  renderItem('memorial-base', rectangle(164, 293, 70, 43), '#6a7274', {
    stroke: '#343b41',
    lineWidth: 2,
    order: 3,
  }),
  renderItem(
    'memorial-stone',
    [
      { x: 177, y: 293 },
      { x: 184, y: 245 },
      { x: 199, y: 228 },
      { x: 215, y: 245 },
      { x: 223, y: 293 },
    ],
    '#858e8c',
    { stroke: '#3e4648', lineWidth: 2, order: 4 },
  ),
  renderItem('hill-tree-trunk', rectangle(815, 246, 18, 90), '#5d4435', {
    stroke: '#2d2928',
    lineWidth: 2,
    order: 4,
  }),
  renderItem('hill-tree-crown', regularPolygon(824, 230, 62, 50, 9, -Math.PI / 2), '#2d6652', {
    stroke: '#1c3c37',
    lineWidth: 2,
    order: 5,
  }),
];

const middleLaneItems = [
  renderItem(
    'middle-ground',
    [
      { x: 0, y: 390 },
      { x: 960, y: 390 },
      { x: 960, y: 432 },
      { x: 0, y: 432 },
    ],
    '#665443',
    { stroke: '#3b352f', lineWidth: 2, order: 0 },
  ),
  renderItem('player-house-body', rectangle(135, 295, 170, 95), '#8c7357', {
    stroke: '#403634',
    lineWidth: 2,
    order: 3,
  }),
  renderItem(
    'player-house-roof',
    [
      { x: 116, y: 300 },
      { x: 220, y: 244 },
      { x: 324, y: 300 },
    ],
    '#5f4b45',
    { stroke: '#332c2e', lineWidth: 3, order: 4 },
  ),
  renderItem('player-house-door', rectangle(202, 336, 34, 54), '#45372f', {
    stroke: '#282326',
    lineWidth: 2,
    order: 5,
  }),
  renderItem('player-window-night', rectangle(159, 320, 29, 24), '#f0c56f', {
    stroke: '#563f2c',
    lineWidth: 1.5,
    opacity: 0.92,
    order: 6,
    enabled: false,
  }),
  renderItem('mentor-house-body', rectangle(350, 286, 190, 104), '#6f7167', {
    stroke: '#353a38',
    lineWidth: 2,
    order: 3,
  }),
  renderItem(
    'mentor-house-roof',
    [
      { x: 330, y: 291 },
      { x: 441, y: 236 },
      { x: 558, y: 291 },
    ],
    '#484a46',
    { stroke: '#292b2c', lineWidth: 3, order: 4 },
  ),
  renderItem('mentor-house-door', rectangle(430, 331, 39, 59), '#353332', {
    stroke: '#201f22',
    lineWidth: 2,
    order: 5,
  }),
  renderItem('mentor-window-night', rectangle(381, 311, 31, 25), '#efb95e', {
    stroke: '#55402d',
    lineWidth: 1.5,
    opacity: 0.94,
    order: 6,
    enabled: false,
  }),
  renderItem('training-post-left', rectangle(650, 319, 14, 71), '#6f4b34', {
    stroke: '#332929',
    lineWidth: 2,
    order: 4,
  }),
  renderItem('training-post-right', rectangle(710, 319, 14, 71), '#6f4b34', {
    stroke: '#332929',
    lineWidth: 2,
    order: 4,
  }),
  renderItem('training-beam', rectangle(638, 319, 98, 14), '#78523a', {
    stroke: '#332929',
    lineWidth: 2,
    order: 5,
  }),
  renderItem(
    'stairs-to-hill',
    [
      { x: 750, y: 390 },
      { x: 790, y: 336 },
      { x: 828, y: 336 },
      { x: 786, y: 390 },
    ],
    '#747164',
    { stroke: '#3c3a37', lineWidth: 2, order: 7 },
  ),
];

const frontLaneItems = [
  renderItem(
    'front-ground',
    [
      { x: 0, y: 432 },
      { x: 960, y: 432 },
      { x: 960, y: 540 },
      { x: 0, y: 540 },
    ],
    '#51473d',
    { stroke: '#332f2c', lineWidth: 2, order: 0 },
  ),
  renderItem(
    'plaza-path',
    [
      { x: 0, y: 448 },
      { x: 960, y: 448 },
      { x: 960, y: 510 },
      { x: 0, y: 510 },
    ],
    '#68655d',
    { opacity: 0.7, order: 1 },
  ),
  renderItem('fountain-base', regularPolygon(568, 438, 61, 15, 12), '#59656a', {
    stroke: '#2c373d',
    lineWidth: 2,
    order: 5,
  }),
  renderItem('fountain-column', rectangle(557, 384, 22, 51), '#7a8585', {
    stroke: '#374143',
    lineWidth: 2,
    order: 6,
  }),
  renderItem('fountain-bowl', regularPolygon(568, 387, 38, 10, 10), '#8b9693', {
    stroke: '#3b4647',
    lineWidth: 2,
    order: 7,
  }),
  renderItem(
    'stairs-to-homes',
    [
      { x: 410, y: 432 },
      { x: 449, y: 390 },
      { x: 489, y: 390 },
      { x: 450, y: 432 },
    ],
    '#858078',
    { stroke: '#403e3a', lineWidth: 2, order: 8 },
  ),
  renderItem('shop-body', rectangle(760, 341, 142, 91), '#7c6050', {
    stroke: '#3d3332',
    lineWidth: 2,
    order: 4,
  }),
  renderItem(
    'shop-awning',
    [
      { x: 748, y: 346 },
      { x: 773, y: 318 },
      { x: 892, y: 318 },
      { x: 913, y: 346 },
    ],
    '#8d4c50',
    { stroke: '#482f35', lineWidth: 2, order: 5 },
  ),
  renderItem('shop-window-night', rectangle(793, 365, 61, 31), '#f2ca72', {
    stroke: '#5d452f',
    lineWidth: 1.5,
    opacity: 0.9,
    order: 6,
    enabled: false,
  }),
  renderItem('lamp-post', rectangle(661, 351, 8, 81), '#3c4144', {
    stroke: '#202326',
    lineWidth: 1.5,
    order: 7,
  }),
  renderItem('lamp-glow', regularPolygon(665, 351, 30, 25, 12), '#f4c96f', {
    opacity: 0.28,
    order: 8,
    enabled: false,
  }),
];

export const ACADEMY_VILLAGE_MAP = defineMap({
  id: 'academy-village',
  name: '왕립 마법학교 학원촌',
  version: 1,
  worldSize: { width: 960, height: 540 },
  gridSize: 48,
  palette: DAY_PALETTE,
  groundY: null,
  initialSpawnId: 'plaza-arrival',
  spawns: [
    {
      id: 'plaza-arrival',
      chunkId: 'village-center',
      laneId: 'front-plaza',
      position: { x: 270, y: 350 },
      facing: 1,
    },
  ],
  chunks: [
    {
      id: 'village-center',
      bounds: { x: 0, y: 0, width: 960, height: 540 },
      lanes: [
        {
          id: 'back-hill',
          label: '교직원 언덕',
          renderOrder: 10,
          visualScale: 0.82,
          groundY: 336,
          movementBounds: { minX: 24, maxX: 936 },
          surfaces: [
            {
              id: 'back-ground-surface',
              kind: 'solid',
              material: 'academy-grass',
              points: [
                { x: 0, y: 336 },
                { x: 960, y: 336 },
              ],
            },
          ],
          renderItems: backLaneItems,
          entities: [],
          triggers: [],
          connections: ['yard-to-hill'],
        },
        {
          id: 'middle-homes',
          label: '교관 주택가',
          renderOrder: 20,
          visualScale: 0.92,
          groundY: 390,
          movementBounds: { minX: 24, maxX: 936 },
          surfaces: [
            {
              id: 'middle-ground-surface',
              kind: 'solid',
              material: 'packed-soil',
              points: [
                { x: 0, y: 390 },
                { x: 960, y: 390 },
              ],
            },
          ],
          renderItems: middleLaneItems,
          entities: [],
          triggers: [],
          connections: ['plaza-to-homes', 'yard-to-hill'],
        },
        {
          id: 'front-plaza',
          label: '학원촌 중앙광장',
          renderOrder: 30,
          visualScale: 1,
          groundY: 432,
          movementBounds: { minX: 24, maxX: 936 },
          surfaces: [
            {
              id: 'front-ground-surface',
              kind: 'solid',
              material: 'academy-stone',
              points: [
                { x: 0, y: 432 },
                { x: 960, y: 432 },
              ],
            },
          ],
          renderItems: frontLaneItems,
          entities: [],
          triggers: [],
          connections: ['plaza-to-homes'],
        },
      ],
    },
  ],
  connections: [
    {
      id: 'plaza-to-homes',
      direction: 'back',
      bidirectional: true,
      interactionId: 'lane-transition',
      from: {
        chunkId: 'village-center',
        laneId: 'front-plaza',
        anchor: { x: 450, y: 432 },
        spawn: { x: 450, y: 350 },
        radius: 46,
      },
      to: {
        chunkId: 'village-center',
        laneId: 'middle-homes',
        anchor: { x: 469, y: 390 },
        spawn: { x: 469, y: 308 },
        radius: 46,
      },
      transition: { durationSeconds: 0.28 },
    },
    {
      id: 'yard-to-hill',
      direction: 'back',
      bidirectional: true,
      interactionId: 'lane-transition',
      from: {
        chunkId: 'village-center',
        laneId: 'middle-homes',
        anchor: { x: 786, y: 390 },
        spawn: { x: 786, y: 308 },
        radius: 48,
      },
      to: {
        chunkId: 'village-center',
        laneId: 'back-hill',
        anchor: { x: 807, y: 336 },
        spawn: { x: 807, y: 254 },
        radius: 48,
      },
      transition: { durationSeconds: 0.28 },
    },
  ],
  patches: [
    {
      id: 'night-presentation',
      priority: 10,
      when: { eq: ['timePhase', 'night'] },
      operations: [
        { op: 'set', target: 'academy-village', property: 'palette', value: NIGHT_PALETTE },
        { op: 'set-enabled', target: 'sun', value: false },
        { op: 'set-enabled', target: 'moon', value: true },
        { op: 'set-enabled', target: 'player-window-night', value: true },
        { op: 'set-enabled', target: 'mentor-window-night', value: true },
        { op: 'set-enabled', target: 'shop-window-night', value: true },
        { op: 'set-enabled', target: 'lamp-glow', value: true },
      ],
    },
  ],
});

export { DAY_PALETTE, NIGHT_PALETTE };
