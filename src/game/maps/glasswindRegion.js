import {
  createEnvironmentPortalLandmarkItems,
  createPortalRenderItems,
} from './PortalRenderItems.js';

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
    renderOrder: options.renderOrder ?? 30,
    enabled: options.enabled ?? true,
  };
}

function shard(id, x, y, scale, color, options = {}) {
  return renderItem(
    id,
    [
      { x, y: y - scale },
      { x: x + scale * 0.38, y: y - scale * 0.1 },
      { x: x + scale * 0.16, y: y + scale },
      { x: x - scale * 0.3, y: y + scale * 0.2 },
    ],
    color,
    { stroke: '#bdf8ef', lineWidth: 1.5, ...options },
  );
}

const fieldGroundY = 428;
const dungeonGroundY = 424;
const bossGroundY = 426;

export const ACADEMY_GLASSWIND_PORTAL_ITEMS = Object.freeze([
  ...createEnvironmentPortalLandmarkItems('academy-glasswind-gate', 710, 432, {
    style: 'crystal-stair',
  }),
  ...createPortalRenderItems('academy-glasswind-gate', 710, 432, '#78e2ec', {
    style: 'academy',
    order: 36,
  }),
]);

const fieldRoom = {
  id: 'glasswind-approach',
  label: '유리바람 협곡 · 벼랑길',
  bounds: { x: 7440, y: 0, width: 1024, height: 540 },
  cameraAnchor: { x: 480, y: 270 },
  groundY: fieldGroundY,
  movementBounds: { minX: 24, maxX: 760 },
  renderOrder: 30,
  surfaces: [
    {
      id: 'glasswind-cliff-surface',
      kind: 'solid',
      material: 'glasswind-rock',
      points: [
        { x: 0, y: fieldGroundY },
        { x: 760, y: fieldGroundY },
      ],
    },
    {
      id: 'glasswind-bridge-surface',
      kind: 'solid',
      material: 'calmed-windglass',
      points: [
        { x: 760, y: fieldGroundY },
        { x: 1024, y: fieldGroundY },
      ],
      enabled: false,
    },
  ],
  renderItems: [
    renderItem('glasswind-field-sky', rectangle(0, 0, 1024, fieldGroundY), '#10273b', {
      order: -100,
    }),
    renderItem(
      'glasswind-field-ridge',
      [
        { x: 0, y: 325 },
        { x: 130, y: 180 },
        { x: 260, y: 310 },
        { x: 420, y: 135 },
        { x: 590, y: 300 },
        { x: 760, y: 160 },
        { x: 1024, y: 315 },
        { x: 1024, y: fieldGroundY },
        { x: 0, y: fieldGroundY },
      ],
      '#24506a',
      { stroke: '#102d42', lineWidth: 3, order: -60 },
    ),
    renderItem('glasswind-field-ground', rectangle(0, fieldGroundY, 760, 112), '#334859', {
      stroke: '#6f8ca0',
      lineWidth: 2,
      order: 0,
    }),
    renderItem(
      'glasswind-bridge-render',
      [
        { x: 760, y: fieldGroundY },
        { x: 1024, y: fieldGroundY },
        { x: 1024, y: fieldGroundY + 22 },
        { x: 760, y: fieldGroundY + 22 },
      ],
      '#7bd6d2',
      { stroke: '#eafffb', lineWidth: 2, opacity: 0.72, order: 2, enabled: false },
    ),
    renderItem(
      'glasswind-crosswind-wall',
      [
        { x: 760, y: 118 },
        { x: 792, y: 164 },
        { x: 770, y: 212 },
        { x: 806, y: 265 },
        { x: 772, y: 320 },
        { x: 800, y: fieldGroundY },
        { x: 742, y: fieldGroundY },
        { x: 720, y: 340 },
        { x: 748, y: 280 },
        { x: 718, y: 220 },
        { x: 746, y: 168 },
      ],
      '#72e5ee',
      { stroke: '#f1ffff', lineWidth: 2, opacity: 0.24, order: 18 },
    ),
    ...createPortalRenderItems('glasswind-return-gate', 80, fieldGroundY, '#78e2ec', {
      style: 'glasswind',
    }),
    ...createPortalRenderItems('glasswind-dungeon-gate', 930, fieldGroundY, '#9fe8bc', {
      style: 'glasswind',
      enabled: false,
    }),
    shard('glasswind-field-shard-a', 290, 354, 30, '#58b7c5', { order: 5 }),
    shard('glasswind-field-shard-b', 520, 370, 22, '#6ec8cf', { order: 6 }),
  ],
  entities: [
    {
      id: 'glasswind-hunter',
      kind: 'combat-enemy',
      encounterProfileId: 'glasswind-field',
      position: { x: 625, y: fieldGroundY },
      maxHealth: 75,
    },
  ],
  triggers: [],
  portals: ['academy-glasswind-portal', 'glasswind-dungeon-portal'],
};

const dungeonRoom = {
  id: 'glasswind-observatory',
  label: '유리바람 협곡 · 바람잠긴 관측소',
  bounds: { x: 8680, y: 0, width: 1200, height: 540 },
  cameraAnchor: { x: 480, y: 270 },
  groundY: dungeonGroundY,
  movementBounds: { minX: 24, maxX: 1176 },
  renderOrder: 30,
  surfaces: [
    {
      id: 'glasswind-observatory-surface',
      kind: 'solid',
      material: 'observatory-stone',
      points: [
        { x: 0, y: dungeonGroundY },
        { x: 250, y: dungeonGroundY },
      ],
    },
    {
      id: 'glasswind-observatory-ascent-surface',
      kind: 'solid',
      material: 'windglass-ramp',
      points: [
        { x: 250, y: dungeonGroundY },
        { x: 390, y: 390 },
      ],
    },
    {
      id: 'glasswind-observatory-gallery-surface',
      kind: 'solid',
      material: 'observatory-brass',
      points: [
        { x: 390, y: 390 },
        { x: 660, y: 390 },
      ],
    },
    {
      id: 'glasswind-observatory-descent-surface',
      kind: 'solid',
      material: 'windglass-ramp',
      points: [
        { x: 660, y: 390 },
        { x: 760, y: dungeonGroundY },
      ],
    },
    {
      id: 'glasswind-observatory-lower-surface',
      kind: 'solid',
      material: 'observatory-stone',
      points: [
        { x: 760, y: dungeonGroundY },
        { x: 880, y: dungeonGroundY },
      ],
    },
    {
      id: 'glasswind-checkpoint-alcove-surface',
      kind: 'solid',
      material: 'calmed-windglass',
      points: [
        { x: 880, y: dungeonGroundY },
        { x: 920, y: 408 },
        { x: 1040, y: 408 },
        { x: 1080, y: dungeonGroundY },
      ],
    },
    {
      id: 'glasswind-boss-threshold-surface',
      kind: 'solid',
      material: 'stormglass-threshold',
      points: [
        { x: 1080, y: dungeonGroundY },
        { x: 1200, y: dungeonGroundY },
      ],
    },
  ],
  renderItems: [
    renderItem('glasswind-dungeon-backdrop', rectangle(0, 0, 1200, 540), '#07121e', {
      order: -100,
    }),
    renderItem(
      'glasswind-observatory-dome',
      regularPolygon(590, 292, 445, 230, 18, Math.PI / 18),
      '#13283a',
      { stroke: '#42637a', lineWidth: 4, opacity: 0.9, order: -50 },
    ),
    renderItem(
      'glasswind-observatory-entrance-vault',
      [
        { x: 0, y: dungeonGroundY },
        { x: 0, y: 202 },
        { x: 56, y: 154 },
        { x: 196, y: 154 },
        { x: 250, y: 218 },
        { x: 250, y: dungeonGroundY },
      ],
      '#1e3344',
      { stroke: '#587386', lineWidth: 3, opacity: 0.94, order: -32 },
    ),
    renderItem('glasswind-observatory-entrance-floor', rectangle(0, 424, 250, 116), '#263746', {
      stroke: '#658093',
      lineWidth: 2,
      order: 0,
    }),
    renderItem(
      'glasswind-observatory-ascent',
      [
        { x: 250, y: dungeonGroundY },
        { x: 390, y: 390 },
        { x: 390, y: 540 },
        { x: 250, y: 540 },
      ],
      '#304a59',
      { stroke: '#83a7b4', lineWidth: 2, order: 1 },
    ),
    renderItem('glasswind-observatory-gallery-floor', rectangle(390, 390, 270, 150), '#354956', {
      stroke: '#8ba4ad',
      lineWidth: 2,
      order: 1,
    }),
    renderItem(
      'glasswind-observatory-descent',
      [
        { x: 660, y: 390 },
        { x: 760, y: dungeonGroundY },
        { x: 760, y: 540 },
        { x: 660, y: 540 },
      ],
      '#304a59',
      { stroke: '#83a7b4', lineWidth: 2, order: 1 },
    ),
    renderItem('glasswind-observatory-lower-floor', rectangle(760, 424, 120, 116), '#263746', {
      stroke: '#658093',
      lineWidth: 2,
      order: 0,
    }),
    renderItem(
      'glasswind-checkpoint-alcove-floor',
      [
        { x: 880, y: dungeonGroundY },
        { x: 920, y: 408 },
        { x: 1040, y: 408 },
        { x: 1080, y: dungeonGroundY },
        { x: 1080, y: 540 },
        { x: 880, y: 540 },
      ],
      '#31505a',
      { stroke: '#87aaa9', lineWidth: 2, order: 2 },
    ),
    renderItem('glasswind-boss-threshold-floor', rectangle(1080, 424, 120, 116), '#332f47', {
      stroke: '#9274a4',
      lineWidth: 2,
      order: 2,
    }),
    renderItem(
      'glasswind-observatory-wind-lens',
      regularPolygon(525, 258, 116, 102, 16, Math.PI / 16),
      '#1c4a5b',
      { stroke: '#8ce6e2', lineWidth: 5, opacity: 0.82, order: -18 },
    ),
    renderItem(
      'glasswind-observatory-wind-lens-core',
      regularPolygon(525, 258, 48, 62, 12, Math.PI / 12),
      '#74d8d5',
      { stroke: '#eafffc', lineWidth: 2, opacity: 0.28, order: -17 },
    ),
    renderItem(
      'glasswind-observatory-crosswind-hazard',
      [
        { x: 682, y: 390 },
        { x: 700, y: 342 },
        { x: 716, y: 390 },
        { x: 732, y: 350 },
        { x: 748, y: 410 },
        { x: 760, y: dungeonGroundY },
      ],
      '#6dcbd0',
      { stroke: '#d9ffff', lineWidth: 2, opacity: 0.5, order: 7 },
    ),
    renderItem(
      'glasswind-checkpoint-alcove',
      [
        { x: 842, y: dungeonGroundY },
        { x: 858, y: 270 },
        { x: 902, y: 212 },
        { x: 980, y: 188 },
        { x: 1058, y: 212 },
        { x: 1102, y: 270 },
        { x: 1118, y: dungeonGroundY },
      ],
      '#1d343d',
      { stroke: '#557e83', lineWidth: 3, opacity: 0.92, order: -26 },
    ),
    renderItem(
      'glasswind-checkpoint-plinth',
      [
        { x: 936, y: 408 },
        { x: 946, y: 392 },
        { x: 1014, y: 392 },
        { x: 1024, y: 408 },
      ],
      '#527579',
      { stroke: '#a3c4c1', lineWidth: 2, order: 6 },
    ),
    renderItem(
      'glasswind-boss-threshold-arch',
      [
        { x: 1042, y: dungeonGroundY },
        { x: 1042, y: 278 },
        { x: 1072, y: 226 },
        { x: 1110, y: 204 },
        { x: 1148, y: 226 },
        { x: 1178, y: 278 },
        { x: 1178, y: dungeonGroundY },
      ],
      '#2d2b42',
      { stroke: '#9d73ad', lineWidth: 4, opacity: 0.96, order: -20 },
    ),
    renderItem(
      'glasswind-boss-threshold-opening',
      [
        { x: 1070, y: dungeonGroundY },
        { x: 1070, y: 310 },
        { x: 1084, y: 276 },
        { x: 1110, y: 262 },
        { x: 1136, y: 276 },
        { x: 1150, y: 310 },
        { x: 1150, y: dungeonGroundY },
      ],
      '#090b18',
      { stroke: '#d890e8', lineWidth: 2, opacity: 0.98, order: -19 },
    ),
    ...createPortalRenderItems('glasswind-observatory-return', 80, dungeonGroundY, '#9fe8bc', {
      style: 'observatory',
    }),
    ...createPortalRenderItems('glasswind-boss-gate', 1110, dungeonGroundY, '#d890e8', {
      style: 'observatory',
      enabled: false,
    }),
    renderItem(
      'glasswind-anchor-dormant',
      regularPolygon(980, 358, 26, 48, 10, Math.PI / 10),
      '#3d5664',
      { stroke: '#7893a0', lineWidth: 2, order: 16 },
    ),
    renderItem(
      'glasswind-anchor-active',
      regularPolygon(980, 358, 31, 54, 10, Math.PI / 10),
      '#72ebdd',
      { stroke: '#f0fffd', lineWidth: 3, opacity: 0.84, order: 17, enabled: false },
    ),
    renderItem('glasswind-anchor-aura', regularPolygon(980, 364, 62, 72, 16), '#67e5d9', {
      opacity: 0.18,
      order: 15,
      enabled: false,
    }),
    shard('glasswind-dungeon-shard-a', 318, 344, 34, '#657f9c', { order: 4 }),
    shard('glasswind-dungeon-shard-b', 812, 362, 28, '#6e88a2', { order: 5 }),
  ],
  entities: [],
  triggers: [
    {
      id: 'glasswind-checkpoint',
      kind: 'glasswind-checkpoint',
      position: { x: 980, y: 408 },
      radius: 58,
    },
  ],
  portals: ['glasswind-dungeon-portal', 'glasswind-boss-portal'],
};

const bossRoom = {
  id: 'glasswind-storm-eye',
  label: '유리바람 협곡 · 폭풍눈 중앙정',
  bounds: { x: 9920, y: 0, width: 1024, height: 540 },
  cameraAnchor: { x: 480, y: 270 },
  groundY: bossGroundY,
  movementBounds: { minX: 24, maxX: 1000 },
  renderOrder: 30,
  surfaces: [
    {
      id: 'glasswind-storm-eye-surface',
      kind: 'solid',
      material: 'stormglass-arena',
      points: [
        { x: 0, y: bossGroundY },
        { x: 1024, y: bossGroundY },
      ],
    },
  ],
  renderItems: [
    renderItem('glasswind-boss-backdrop', rectangle(0, 0, 1024, 540), '#050816', {
      order: -100,
    }),
    renderItem(
      'glasswind-storm-ring',
      regularPolygon(570, 270, 285, 205, 18, Math.PI / 18),
      '#20204b',
      { stroke: '#8f72bd', lineWidth: 5, opacity: 0.82, order: -45 },
    ),
    renderItem('glasswind-boss-floor', rectangle(0, bossGroundY, 1024, 114), '#25283f', {
      stroke: '#776a9c',
      lineWidth: 2,
      order: 0,
    }),
    renderItem(
      'glasswind-boss-rune',
      regularPolygon(580, bossGroundY + 2, 225, 34, 18, Math.PI / 18),
      '#b872b8',
      { opacity: 0.32, order: 2 },
    ),
    ...createPortalRenderItems('glasswind-boss-return', 80, bossGroundY, '#d890e8', {
      style: 'storm',
    }),
    ...createPortalRenderItems('glasswind-shortcut-gate', 930, bossGroundY, '#f3cf78', {
      style: 'storm',
      enabled: false,
    }),
    renderItem(
      'glasswind-reward-prism',
      regularPolygon(810, bossGroundY - 58, 34, 58, 10, Math.PI / 10),
      '#f2d47e',
      { stroke: '#fffbd2', lineWidth: 3, opacity: 0.92, order: 22, enabled: false },
    ),
    renderItem(
      'glasswind-reward-aura',
      regularPolygon(810, bossGroundY - 54, 70, 76, 16),
      '#f1d173',
      { opacity: 0.2, order: 21, enabled: false },
    ),
  ],
  entities: [
    {
      id: 'glasswind-prism-regent',
      kind: 'combat-enemy',
      encounterProfileId: 'glasswind-boss',
      position: { x: 655, y: bossGroundY },
      maxHealth: 100,
    },
  ],
  triggers: [
    {
      id: 'glasswind-boss-reward',
      kind: 'glasswind-boss-reward',
      position: { x: 810, y: bossGroundY },
      radius: 60,
      gold: 180,
      enabled: false,
    },
  ],
  portals: ['glasswind-boss-portal', 'glasswind-shortcut-portal'],
};

export const GLASSWIND_REGION = Object.freeze({
  id: 'glasswind-region',
  label: '유리바람 협곡',
  rooms: Object.freeze([fieldRoom, dungeonRoom, bossRoom]),
});

export const GLASSWIND_PORTALS = Object.freeze([
  {
    id: 'academy-glasswind-portal',
    travelSegmentId: 'academy-glasswind-canyon',
    bidirectional: true,
    from: {
      regionId: 'academy-region',
      roomId: 'academy-plaza',
      anchor: { x: 710, y: 432 },
      spawn: { x: 650, y: 350 },
      radius: 50,
    },
    to: {
      regionId: 'glasswind-region',
      roomId: 'glasswind-approach',
      anchor: { x: 80, y: fieldGroundY },
      spawn: { x: 145, y: fieldGroundY - 82 },
      radius: 52,
    },
    transition: { durationSeconds: 0.32 },
  },
  {
    id: 'glasswind-dungeon-portal',
    travelSegmentId: 'glasswind-observatory-climb',
    bidirectional: true,
    enabled: false,
    from: {
      regionId: 'glasswind-region',
      roomId: 'glasswind-approach',
      anchor: { x: 930, y: fieldGroundY },
      spawn: { x: 865, y: fieldGroundY - 82 },
      radius: 52,
    },
    to: {
      regionId: 'glasswind-region',
      roomId: 'glasswind-observatory',
      anchor: { x: 80, y: dungeonGroundY },
      spawn: { x: 165, y: dungeonGroundY - 82 },
      radius: 52,
    },
    transition: { durationSeconds: 0.32 },
  },
  {
    id: 'glasswind-boss-portal',
    bidirectional: true,
    enabled: false,
    from: {
      regionId: 'glasswind-region',
      roomId: 'glasswind-observatory',
      anchor: { x: 1110, y: dungeonGroundY },
      spawn: { x: 1045, y: 410 - 82 },
      radius: 52,
    },
    to: {
      regionId: 'glasswind-region',
      roomId: 'glasswind-storm-eye',
      anchor: { x: 80, y: bossGroundY },
      spawn: { x: 180, y: bossGroundY - 82 },
      radius: 52,
    },
    transition: { durationSeconds: 0.32 },
  },
  {
    id: 'glasswind-shortcut-portal',
    travelSegmentId: 'glasswind-shortcut-return',
    bidirectional: false,
    enabled: false,
    from: {
      regionId: 'glasswind-region',
      roomId: 'glasswind-storm-eye',
      anchor: { x: 930, y: bossGroundY },
      spawn: { x: 870, y: bossGroundY - 82 },
      radius: 52,
    },
    to: {
      regionId: 'academy-region',
      roomId: 'academy-plaza',
      anchor: { x: 710, y: 432 },
      spawn: { x: 650, y: 350 },
      radius: 50,
    },
    transition: { durationSeconds: 0.32 },
  },
]);

export const GLASSWIND_PATCHES = Object.freeze([
  {
    id: 'glasswind-bridge-stabilized',
    priority: 60,
    when: { flag: 'glasswindBridgeStable' },
    operations: [
      {
        op: 'set',
        target: { kind: 'room', regionId: 'glasswind-region', roomId: 'glasswind-approach' },
        property: 'movementBounds',
        value: { minX: 24, maxX: 1000 },
      },
      { op: 'set-enabled', target: 'glasswind-hunter', value: false },
      { op: 'set-enabled', target: 'glasswind-bridge-surface', value: true },
      { op: 'set-enabled', target: 'glasswind-bridge-render', value: true },
      { op: 'set-enabled', target: 'glasswind-crosswind-wall', value: false },
      { op: 'set-enabled', target: 'glasswind-dungeon-portal', value: true },
      { op: 'set-enabled', target: 'glasswind-dungeon-gate-outer', value: true },
      { op: 'set-enabled', target: 'glasswind-dungeon-gate-inner', value: true },
    ],
  },
  {
    id: 'glasswind-checkpoint-active',
    priority: 70,
    when: { flag: 'glasswindCheckpointActivated' },
    operations: [
      { op: 'set-enabled', target: 'glasswind-anchor-dormant', value: false },
      { op: 'set-enabled', target: 'glasswind-anchor-active', value: true },
      { op: 'set-enabled', target: 'glasswind-anchor-aura', value: true },
      { op: 'set-enabled', target: 'glasswind-boss-portal', value: true },
      { op: 'set-enabled', target: 'glasswind-boss-gate-outer', value: true },
      { op: 'set-enabled', target: 'glasswind-boss-gate-inner', value: true },
    ],
  },
  {
    id: 'glasswind-boss-defeated',
    priority: 80,
    when: { flag: 'glasswindBossDefeated' },
    operations: [
      { op: 'set-enabled', target: 'glasswind-prism-regent', value: false },
      { op: 'set-enabled', target: 'glasswind-boss-reward', value: true },
      { op: 'set-enabled', target: 'glasswind-reward-prism', value: true },
      { op: 'set-enabled', target: 'glasswind-reward-aura', value: true },
    ],
  },
  {
    id: 'glasswind-reward-claimed',
    priority: 90,
    when: { flag: 'glasswindRewardClaimed' },
    operations: [
      { op: 'set-enabled', target: 'glasswind-boss-reward', value: false },
      { op: 'set-enabled', target: 'glasswind-reward-prism', value: false },
      { op: 'set-enabled', target: 'glasswind-reward-aura', value: false },
      { op: 'set-enabled', target: 'glasswind-shortcut-portal', value: true },
      { op: 'set-enabled', target: 'glasswind-shortcut-gate-outer', value: true },
      { op: 'set-enabled', target: 'glasswind-shortcut-gate-inner', value: true },
    ],
  },
]);
