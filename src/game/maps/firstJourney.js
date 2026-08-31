import { createPortalRenderItems } from './PortalRenderItems.js';

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

function forestRoomItems(prefix, { groundY = 430, bypass = false } = {}) {
  const trees = [
    [142, 294, 54],
    [268, 274, 68],
    [470, 300, 48],
    [624, 270, 72],
    [810, 292, 58],
  ];
  return [
    renderItem(`${prefix}-sky`, rectangle(0, 0, 1024, groundY), '#102a2b', { order: -100 }),
    renderItem(
      `${prefix}-ridge`,
      [
        { x: 0, y: 315 },
        { x: 120, y: 185 },
        { x: 250, y: 300 },
        { x: 390, y: 155 },
        { x: 535, y: 295 },
        { x: 700, y: 170 },
        { x: 860, y: 305 },
        { x: 1024, y: 175 },
        { x: 1024, y: groundY },
        { x: 0, y: groundY },
      ],
      bypass ? '#1d4a45' : '#254c43',
      { stroke: '#132c2c', lineWidth: 2, order: -60 },
    ),
    ...trees.flatMap(([x, y, size], index) => [
      renderItem(`${prefix}-trunk-${index}`, rectangle(x - 8, y, 16, groundY - y), '#4a342b', {
        stroke: '#241f1d',
        lineWidth: 2,
        order: -12 + index,
      }),
      renderItem(
        `${prefix}-crown-${index}`,
        regularPolygon(x, y, size, size * 0.74, 9, -Math.PI / 2),
        bypass ? '#276650' : '#315f47',
        { stroke: '#173a31', lineWidth: 2, order: -11 + index },
      ),
    ]),
    renderItem(`${prefix}-ground`, rectangle(0, groundY, 1024, 540 - groundY), '#263c33', {
      stroke: '#547362',
      lineWidth: 2,
      order: 0,
    }),
    renderItem(`${prefix}-path`, rectangle(0, groundY + 22, 1024, 48), '#4b5145', {
      opacity: 0.72,
      order: 1,
    }),
  ];
}

const fieldGroundY = 430;
const dungeonGroundY = 424;
const bossGroundY = 426;

export const ACADEMY_FIELD_PORTAL_ITEMS = Object.freeze(
  createPortalRenderItems('academy-field-gate', 910, 432, '#e7b86a', { style: 'academy' }),
);

export const FIRST_JOURNEY_ROOMS = Object.freeze([
  {
    id: 'field-crossing',
    label: '노을풀밭 갈림길',
    bounds: { x: 2480, y: 0, width: 1024, height: 540 },
    cameraAnchor: { x: 480, y: 270 },
    groundY: fieldGroundY,
    movementBounds: { minX: 24, maxX: 1000 },
    renderOrder: 30,
    surfaces: [
      {
        id: 'field-crossing-ground-surface',
        kind: 'solid',
        material: 'forest-earth',
        points: [
          { x: 0, y: fieldGroundY },
          { x: 1024, y: fieldGroundY },
        ],
      },
    ],
    renderItems: [
      ...forestRoomItems('field-crossing'),
      ...createPortalRenderItems('field-village-gate', 80, fieldGroundY, '#86d9d1', {
        style: 'forest',
      }),
      ...createPortalRenderItems('field-canopy-gate', 355, fieldGroundY, '#91d08a', {
        style: 'forest',
      }),
      ...createPortalRenderItems('field-dungeon-gate', 930, fieldGroundY, '#d59b68', {
        style: 'sealed',
      }),
      renderItem(
        'field-guardian-bloom',
        regularPolygon(680, fieldGroundY - 4, 58, 13, 12),
        '#8df0bd',
        { stroke: '#e5fff0', lineWidth: 2, opacity: 0.55, order: 20, enabled: false },
      ),
    ],
    entities: [
      {
        id: 'field-guardian',
        kind: 'combat-enemy',
        encounterProfileId: 'field',
        position: { x: 680, y: fieldGroundY },
        maxHealth: 95,
      },
    ],
    triggers: [],
    portals: ['academy-field-portal', 'field-bypass-portal', 'field-dungeon-portal'],
  },
  {
    id: 'field-canopy',
    label: '실습림 수관 우회로',
    bounds: { x: 3720, y: 0, width: 1024, height: 540 },
    cameraAnchor: { x: 480, y: 270 },
    groundY: fieldGroundY,
    movementBounds: { minX: 24, maxX: 1000 },
    renderOrder: 30,
    surfaces: [
      {
        id: 'field-canopy-ground-surface',
        kind: 'solid',
        material: 'root-bridge',
        points: [
          { x: 0, y: fieldGroundY },
          { x: 1024, y: fieldGroundY },
        ],
      },
    ],
    renderItems: [
      ...forestRoomItems('field-canopy', { bypass: true }),
      renderItem(
        'canopy-root-bridge',
        [
          { x: 140, y: fieldGroundY },
          { x: 280, y: fieldGroundY - 42 },
          { x: 535, y: fieldGroundY - 18 },
          { x: 800, y: fieldGroundY - 45 },
          { x: 920, y: fieldGroundY },
        ],
        '#674837',
        { stroke: '#30251f', lineWidth: 8, order: 8 },
      ),
      ...createPortalRenderItems('canopy-return-gate', 80, fieldGroundY, '#91d08a', {
        style: 'forest',
      }),
      ...createPortalRenderItems('canopy-dungeon-gate', 930, fieldGroundY, '#d59b68', {
        style: 'sealed',
      }),
    ],
    entities: [],
    triggers: [],
    portals: ['field-bypass-portal', 'bypass-dungeon-portal'],
  },
  {
    id: 'sealed-forest-dungeon',
    label: '폐쇄 실습림 · 봉인 회랑',
    bounds: { x: 4960, y: 0, width: 1024, height: 540 },
    cameraAnchor: { x: 480, y: 270 },
    groundY: dungeonGroundY,
    movementBounds: { minX: 24, maxX: 1000 },
    renderOrder: 30,
    surfaces: [
      {
        id: 'sealed-dungeon-ground-surface',
        kind: 'solid',
        material: 'sealed-root-stone',
        points: [
          { x: 0, y: dungeonGroundY },
          { x: 1024, y: dungeonGroundY },
        ],
      },
    ],
    renderItems: [
      renderItem('sealed-dungeon-backdrop', rectangle(0, 0, 1024, 540), '#090d16', {
        order: -100,
      }),
      renderItem(
        'sealed-dungeon-vault',
        [
          { x: 0, y: 250 },
          { x: 160, y: 120 },
          { x: 330, y: 230 },
          { x: 512, y: 76 },
          { x: 695, y: 230 },
          { x: 860, y: 120 },
          { x: 1024, y: 250 },
          { x: 1024, y: dungeonGroundY },
          { x: 0, y: dungeonGroundY },
        ],
        '#171d2a',
        { stroke: '#3c465e', lineWidth: 3, order: -60 },
      ),
      renderItem('sealed-dungeon-floor', rectangle(0, dungeonGroundY, 1024, 116), '#272a36', {
        stroke: '#596174',
        lineWidth: 2,
        order: 0,
      }),
      ...createPortalRenderItems('dungeon-field-gate', 80, dungeonGroundY, '#d59b68', {
        style: 'sealed',
      }),
      ...createPortalRenderItems('dungeon-canopy-gate', 175, dungeonGroundY, '#91d08a', {
        style: 'sealed',
      }),
      ...createPortalRenderItems('dungeon-boss-gate', 930, dungeonGroundY, '#e26055', {
        style: 'sealed',
        enabled: false,
      }),
      renderItem(
        'checkpoint-dormant',
        regularPolygon(625, dungeonGroundY - 50, 24, 46, 8, Math.PI / 8),
        '#394c55',
        { stroke: '#697c80', lineWidth: 2, order: 16 },
      ),
      renderItem(
        'checkpoint-active',
        regularPolygon(625, dungeonGroundY - 50, 29, 52, 8, Math.PI / 8),
        '#74e1ca',
        { stroke: '#effff9', lineWidth: 3, opacity: 0.82, order: 17, enabled: false },
      ),
      renderItem(
        'checkpoint-active-aura',
        regularPolygon(625, dungeonGroundY - 42, 54, 64, 14),
        '#66e0c5',
        { opacity: 0.18, order: 15, enabled: false },
      ),
    ],
    entities: [],
    triggers: [
      {
        id: 'sealed-forest-checkpoint',
        kind: 'checkpoint',
        position: { x: 625, y: dungeonGroundY },
        radius: 54,
      },
    ],
    portals: ['field-dungeon-portal', 'bypass-dungeon-portal', 'dungeon-boss-portal'],
  },
  {
    id: 'sealed-forest-boss',
    label: '폐쇄 실습림 · 봉인 핵',
    bounds: { x: 6200, y: 0, width: 1024, height: 540 },
    cameraAnchor: { x: 480, y: 270 },
    groundY: bossGroundY,
    movementBounds: { minX: 24, maxX: 1000 },
    renderOrder: 30,
    surfaces: [
      {
        id: 'boss-arena-ground-surface',
        kind: 'solid',
        material: 'sealed-arena',
        points: [
          { x: 0, y: bossGroundY },
          { x: 1024, y: bossGroundY },
        ],
      },
    ],
    renderItems: [
      renderItem('boss-arena-backdrop', rectangle(0, 0, 1024, 540), '#080912', { order: -100 }),
      renderItem(
        'boss-arena-seal',
        regularPolygon(566, 278, 250, 178, 12, Math.PI / 12),
        '#201b32',
        { stroke: '#5e426f', lineWidth: 5, opacity: 0.84, order: -40 },
      ),
      renderItem('boss-arena-floor', rectangle(0, bossGroundY, 1024, 114), '#2b2533', {
        stroke: '#725777',
        lineWidth: 2,
        order: 0,
      }),
      renderItem(
        'boss-arena-rune',
        regularPolygon(570, bossGroundY + 3, 210, 32, 16, Math.PI / 16),
        '#a85d75',
        { opacity: 0.34, order: 2 },
      ),
      ...createPortalRenderItems('boss-dungeon-gate', 80, bossGroundY, '#e26055', {
        style: 'storm',
      }),
      ...createPortalRenderItems('boss-shortcut-gate', 930, bossGroundY, '#f1c86c', {
        style: 'storm',
        enabled: false,
      }),
      renderItem(
        'boss-reward-crystal',
        regularPolygon(800, bossGroundY - 56, 30, 54, 8, Math.PI / 8),
        '#f1cd72',
        { stroke: '#fff6c5', lineWidth: 3, opacity: 0.9, order: 20, enabled: false },
      ),
      renderItem('boss-reward-aura', regularPolygon(800, bossGroundY - 52, 64, 70, 14), '#f1cd72', {
        opacity: 0.2,
        order: 19,
        enabled: false,
      }),
    ],
    entities: [
      {
        id: 'sealed-forest-warden',
        kind: 'combat-enemy',
        encounterProfileId: 'boss',
        position: { x: 650, y: bossGroundY },
        maxHealth: 90,
      },
    ],
    triggers: [
      {
        id: 'boss-reward-trigger',
        kind: 'boss-reward',
        position: { x: 800, y: bossGroundY },
        radius: 56,
        gold: 120,
        enabled: false,
      },
    ],
    portals: ['dungeon-boss-portal', 'boss-shortcut-portal'],
  },
]);

export const FIRST_JOURNEY_PORTALS = Object.freeze([
  {
    id: 'academy-field-portal',
    bidirectional: true,
    from: {
      regionId: 'academy-region',
      roomId: 'academy-plaza',
      anchor: { x: 910, y: 432 },
      spawn: { x: 850, y: 350 },
      radius: 52,
    },
    to: {
      regionId: 'academy-region',
      roomId: 'field-crossing',
      anchor: { x: 80, y: fieldGroundY },
      spawn: { x: 145, y: fieldGroundY - 82 },
      radius: 52,
    },
    transition: { durationSeconds: 0.32 },
  },
  {
    id: 'field-bypass-portal',
    bidirectional: true,
    from: {
      regionId: 'academy-region',
      roomId: 'field-crossing',
      anchor: { x: 355, y: fieldGroundY },
      spawn: { x: 415, y: fieldGroundY - 82 },
      radius: 52,
    },
    to: {
      regionId: 'academy-region',
      roomId: 'field-canopy',
      anchor: { x: 80, y: fieldGroundY },
      spawn: { x: 145, y: fieldGroundY - 82 },
      radius: 52,
    },
    transition: { durationSeconds: 0.32 },
  },
  {
    id: 'field-dungeon-portal',
    bidirectional: true,
    from: {
      regionId: 'academy-region',
      roomId: 'field-crossing',
      anchor: { x: 930, y: fieldGroundY },
      spawn: { x: 865, y: fieldGroundY - 82 },
      radius: 52,
    },
    to: {
      regionId: 'academy-region',
      roomId: 'sealed-forest-dungeon',
      anchor: { x: 80, y: dungeonGroundY },
      spawn: { x: 240, y: dungeonGroundY - 82 },
      radius: 52,
    },
    transition: { durationSeconds: 0.32 },
  },
  {
    id: 'bypass-dungeon-portal',
    bidirectional: true,
    from: {
      regionId: 'academy-region',
      roomId: 'field-canopy',
      anchor: { x: 930, y: fieldGroundY },
      spawn: { x: 865, y: fieldGroundY - 82 },
      radius: 52,
    },
    to: {
      regionId: 'academy-region',
      roomId: 'sealed-forest-dungeon',
      anchor: { x: 175, y: dungeonGroundY },
      spawn: { x: 250, y: dungeonGroundY - 82 },
      radius: 52,
    },
    transition: { durationSeconds: 0.32 },
  },
  {
    id: 'dungeon-boss-portal',
    bidirectional: true,
    enabled: false,
    from: {
      regionId: 'academy-region',
      roomId: 'sealed-forest-dungeon',
      anchor: { x: 930, y: dungeonGroundY },
      spawn: { x: 865, y: dungeonGroundY - 82 },
      radius: 52,
    },
    to: {
      regionId: 'academy-region',
      roomId: 'sealed-forest-boss',
      anchor: { x: 80, y: bossGroundY },
      spawn: { x: 180, y: bossGroundY - 82 },
      radius: 52,
    },
    transition: { durationSeconds: 0.32 },
  },
  {
    id: 'boss-shortcut-portal',
    bidirectional: false,
    enabled: false,
    from: {
      regionId: 'academy-region',
      roomId: 'sealed-forest-boss',
      anchor: { x: 930, y: bossGroundY },
      spawn: { x: 870, y: bossGroundY - 82 },
      radius: 52,
    },
    to: {
      regionId: 'academy-region',
      roomId: 'academy-plaza',
      anchor: { x: 910, y: 432 },
      spawn: { x: 850, y: 350 },
      radius: 52,
    },
    transition: { durationSeconds: 0.32 },
  },
]);

export const FIRST_JOURNEY_PATCHES = Object.freeze([
  {
    id: 'field-guardian-cleared',
    priority: 20,
    when: { flag: 'fieldGuardianDefeated' },
    operations: [
      { op: 'set-enabled', target: 'field-guardian', value: false },
      { op: 'set-enabled', target: 'field-guardian-bloom', value: true },
    ],
  },
  {
    id: 'sealed-checkpoint-active',
    priority: 30,
    when: { flag: 'checkpointActivated' },
    operations: [
      { op: 'set-enabled', target: 'checkpoint-dormant', value: false },
      { op: 'set-enabled', target: 'checkpoint-active', value: true },
      { op: 'set-enabled', target: 'checkpoint-active-aura', value: true },
      { op: 'set-enabled', target: 'dungeon-boss-portal', value: true },
      { op: 'set-enabled', target: 'dungeon-boss-gate-outer', value: true },
      { op: 'set-enabled', target: 'dungeon-boss-gate-inner', value: true },
    ],
  },
  {
    id: 'sealed-boss-defeated',
    priority: 40,
    when: { flag: 'bossDefeated' },
    operations: [
      { op: 'set-enabled', target: 'sealed-forest-warden', value: false },
      { op: 'set-enabled', target: 'boss-reward-trigger', value: true },
      { op: 'set-enabled', target: 'boss-reward-crystal', value: true },
      { op: 'set-enabled', target: 'boss-reward-aura', value: true },
    ],
  },
  {
    id: 'boss-reward-claimed',
    priority: 50,
    when: { flag: 'bossRewardClaimed' },
    operations: [
      { op: 'set-enabled', target: 'boss-reward-trigger', value: false },
      { op: 'set-enabled', target: 'boss-reward-crystal', value: false },
      { op: 'set-enabled', target: 'boss-reward-aura', value: false },
      { op: 'set-enabled', target: 'boss-shortcut-portal', value: true },
      { op: 'set-enabled', target: 'boss-shortcut-gate-outer', value: true },
      { op: 'set-enabled', target: 'boss-shortcut-gate-inner', value: true },
    ],
  },
]);
