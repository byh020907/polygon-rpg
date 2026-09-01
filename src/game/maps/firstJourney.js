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

function terrainBand(points, depth) {
  const bottomY = Math.max(...points.map((point) => point.y)) + depth;
  return [...points, { x: points.at(-1).x, y: bottomY }, { x: points[0].x, y: bottomY }];
}

function pathBand(points, depth = 34) {
  return [
    ...points.map((point) => ({ x: point.x, y: point.y + 4 })),
    ...points.toReversed().map((point) => ({ x: point.x, y: point.y + depth })),
  ];
}

function forestRoomItems(
  prefix,
  { groundY = 430, bypass = false, width = 1024, terrain = null } = {},
) {
  const groundLine = terrain ?? [
    { x: 0, y: groundY },
    { x: width, y: groundY },
  ];
  const trees = [
    [142, 294, 54],
    [268, 274, 68],
    [470, 300, 48],
    [624, 270, 72],
    [810, 292, 58],
    ...(width > 1024 ? [[1060, 278, 66]] : []),
  ];
  return [
    renderItem(`${prefix}-sky`, rectangle(0, 0, width, groundY), '#102a2b', { order: -100 }),
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
        { x: width, y: 175 },
        { x: width, y: groundY },
        { x: 0, y: groundY },
      ],
      bypass ? '#1d4a45' : '#254c43',
      { stroke: '#132c2c', lineWidth: 2, order: -60 },
    ),
    renderItem(
      `${prefix}-day-canopy-light`,
      [
        { x: width * 0.3, y: 92 },
        { x: width * 0.42, y: 92 },
        { x: width * 0.56, y: groundY },
        { x: width * 0.43, y: groundY },
      ],
      '#d8d69a',
      { opacity: 0.12, order: -40 },
    ),
    renderItem(`${prefix}-night-veil`, rectangle(0, 0, width, groundY), '#071224', {
      opacity: 0.5,
      order: -35,
      enabled: false,
    }),
    renderItem(
      `${prefix}-night-waylight`,
      regularPolygon(width * 0.58, groundY - 74, 38, 46, 14, Math.PI / 14),
      '#7cd9cf',
      { opacity: 0.24, order: -5, enabled: false },
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
    renderItem(`${prefix}-ground`, terrainBand(groundLine, 116), '#263c33', {
      stroke: '#547362',
      lineWidth: 2,
      order: 0,
    }),
    renderItem(`${prefix}-path`, pathBand(groundLine), '#4b5145', {
      opacity: 0.72,
      order: 1,
    }),
    renderItem(
      `${prefix}-foreground-root-left`,
      [
        { x: 0, y: groundY + 18 },
        { x: 96, y: groundY + 6 },
        { x: 156, y: groundY + 46 },
        { x: 0, y: 540 },
      ],
      '#17291f',
      { opacity: 0.8, order: 2, renderOrder: 30.72 },
    ),
    renderItem(
      `${prefix}-foreground-root-right`,
      [
        { x: width - 152, y: groundY + 45 },
        { x: width - 82, y: groundY + 5 },
        { x: width, y: groundY + 18 },
        { x: width, y: 540 },
      ],
      '#17291f',
      { opacity: 0.8, order: 2, renderOrder: 30.72 },
    ),
  ];
}

const fieldGroundY = 430;
const dungeonGroundY = 424;
const bossGroundY = 426;
const FIELD_ROOM_WIDTH = 1200;
const fieldCrossingTerrain = Object.freeze([
  Object.freeze({ x: 0, y: fieldGroundY }),
  Object.freeze({ x: 180, y: fieldGroundY }),
  Object.freeze({ x: 300, y: 412 }),
  Object.freeze({ x: 460, y: 412 }),
  Object.freeze({ x: 540, y: fieldGroundY }),
  Object.freeze({ x: FIELD_ROOM_WIDTH, y: fieldGroundY }),
]);
const fieldCanopyTerrain = Object.freeze([
  Object.freeze({ x: 0, y: fieldGroundY }),
  Object.freeze({ x: 160, y: fieldGroundY }),
  Object.freeze({ x: 300, y: 398 }),
  Object.freeze({ x: 540, y: 412 }),
  Object.freeze({ x: 820, y: 394 }),
  Object.freeze({ x: 960, y: fieldGroundY }),
  Object.freeze({ x: FIELD_ROOM_WIDTH, y: fieldGroundY }),
]);

export const ACADEMY_FIELD_PORTAL_ITEMS = Object.freeze([
  ...createEnvironmentPortalLandmarkItems('academy-field-gate', 910, 432, {
    style: 'academy-door',
  }),
  ...createPortalRenderItems('academy-field-gate', 910, 432, '#e7b86a', {
    style: 'academy',
    order: 36,
  }),
]);

export const FIRST_JOURNEY_ROOMS = Object.freeze([
  {
    id: 'field-crossing',
    label: '노을풀밭 갈림길',
    bounds: { x: 2480, y: 0, width: FIELD_ROOM_WIDTH, height: 540 },
    cameraAnchor: { x: 480, y: 270 },
    groundY: fieldGroundY,
    movementBounds: { minX: 24, maxX: 1176 },
    renderOrder: 30,
    surfaces: [
      {
        id: 'field-crossing-ground-surface',
        kind: 'solid',
        material: 'forest-earth',
        points: fieldCrossingTerrain,
      },
    ],
    renderItems: [
      ...forestRoomItems('field-crossing', {
        width: FIELD_ROOM_WIDTH,
        terrain: fieldCrossingTerrain,
      }),
      ...createEnvironmentPortalLandmarkItems('field-village-gate', 80, fieldGroundY, {
        style: 'village-road',
      }),
      ...createPortalRenderItems('field-village-gate', 80, fieldGroundY, '#86d9d1', {
        style: 'forest',
        order: 36,
      }),
      ...createEnvironmentPortalLandmarkItems('field-canopy-gate', 420, 412, {
        style: 'root-arch',
      }),
      ...createPortalRenderItems('field-canopy-gate', 420, 412, '#91d08a', {
        style: 'forest',
        order: 36,
      }),
      ...createEnvironmentPortalLandmarkItems('field-dungeon-gate', 1110, fieldGroundY, {
        style: 'sealed-stone',
      }),
      ...createPortalRenderItems('field-dungeon-gate', 1110, fieldGroundY, '#d59b68', {
        style: 'sealed',
        order: 36,
        enabled: false,
      }),
      renderItem(
        'field-dungeon-locked-seal',
        [
          { x: 1082, y: fieldGroundY },
          { x: 1088, y: 346 },
          { x: 1110, y: 314 },
          { x: 1132, y: 346 },
          { x: 1138, y: fieldGroundY },
        ],
        '#7b3f58',
        { stroke: '#e493a8', lineWidth: 3, opacity: 0.82, order: 39 },
      ),
      renderItem(
        'field-guardian-combat-glade',
        regularPolygon(760, fieldGroundY + 2, 118, 22, 14, Math.PI / 14),
        '#385b45',
        { stroke: '#77a579', lineWidth: 2, opacity: 0.7, order: 7 },
      ),
      renderItem(
        'field-route-marker',
        [
          { x: 565, y: fieldGroundY },
          { x: 575, y: 330 },
          { x: 584, y: fieldGroundY },
        ],
        '#74533a',
        { stroke: '#2b251f', lineWidth: 2, order: 8 },
      ),
      renderItem(
        'field-guardian-bloom',
        regularPolygon(760, fieldGroundY - 4, 58, 13, 12),
        '#8df0bd',
        { stroke: '#e5fff0', lineWidth: 2, opacity: 0.55, order: 20, enabled: false },
      ),
    ],
    entities: [
      {
        id: 'field-guardian',
        kind: 'combat-enemy',
        encounterProfileId: 'field',
        position: { x: 760, y: fieldGroundY },
        maxHealth: 95,
      },
      {
        id: 'field-departure-clue-interaction',
        kind: 'story-interaction',
        position: { x: 540, y: fieldGroundY - 82 },
        interactionRange: 62,
        speaker: '세라 교관의 정찰 표식',
        lines: [
          '노을풀밭의 수호 개체를 지나 봉인 회랑으로 향하라.',
          '맞서는 길과 수관 우회로 중 어느 쪽을 고르든, 네 선택이 첫 원정의 기록이 된다.',
        ],
      },
    ],
    triggers: [],
    portals: ['academy-field-portal', 'field-bypass-portal', 'field-dungeon-portal'],
  },
  {
    id: 'field-canopy',
    label: '실습림 수관 우회로',
    bounds: { x: 3720, y: 0, width: FIELD_ROOM_WIDTH, height: 540 },
    cameraAnchor: { x: 480, y: 270 },
    groundY: fieldGroundY,
    movementBounds: { minX: 24, maxX: 1176 },
    renderOrder: 30,
    surfaces: [
      {
        id: 'field-canopy-ground-surface',
        kind: 'solid',
        material: 'root-bridge',
        points: fieldCanopyTerrain,
      },
    ],
    renderItems: [
      ...forestRoomItems('field-canopy', {
        bypass: true,
        width: FIELD_ROOM_WIDTH,
        terrain: fieldCanopyTerrain,
      }),
      renderItem('canopy-root-bridge', fieldCanopyTerrain, '#674837', {
        stroke: '#30251f',
        lineWidth: 8,
        order: 8,
      }),
      ...createEnvironmentPortalLandmarkItems('canopy-return-gate', 80, fieldGroundY, {
        style: 'root-arch',
      }),
      ...createPortalRenderItems('canopy-return-gate', 80, fieldGroundY, '#91d08a', {
        style: 'forest',
        order: 36,
      }),
      ...createEnvironmentPortalLandmarkItems('canopy-dungeon-gate', 1110, fieldGroundY, {
        style: 'sealed-stone',
      }),
      ...createPortalRenderItems('canopy-dungeon-gate', 1110, fieldGroundY, '#d59b68', {
        style: 'sealed',
        order: 36,
      }),
    ],
    entities: [],
    triggers: [],
    portals: ['field-bypass-portal', 'bypass-dungeon-portal'],
  },
  {
    id: 'sealed-forest-dungeon',
    label: '폐쇄 실습림 · 봉인 회랑',
    bounds: { x: 4960, y: 0, width: 1200, height: 540 },
    cameraAnchor: { x: 480, y: 270 },
    groundY: dungeonGroundY,
    movementBounds: { minX: 24, maxX: 1176 },
    renderOrder: 30,
    surfaces: [
      {
        id: 'sealed-dungeon-ground-surface',
        kind: 'solid',
        material: 'sealed-root-stone',
        points: [
          { x: 0, y: dungeonGroundY },
          { x: 1200, y: dungeonGroundY },
        ],
      },
    ],
    renderItems: [
      renderItem('sealed-dungeon-backdrop', rectangle(0, 0, 1200, 540), '#090d16', {
        order: -100,
      }),
      renderItem(
        'sealed-dungeon-vault',
        [
          { x: 0, y: 250 },
          { x: 145, y: 120 },
          { x: 285, y: 224 },
          { x: 430, y: 102 },
          { x: 600, y: 224 },
          { x: 760, y: 94 },
          { x: 920, y: 226 },
          { x: 1060, y: 120 },
          { x: 1200, y: 250 },
          { x: 1200, y: dungeonGroundY },
          { x: 0, y: dungeonGroundY },
        ],
        '#171d2a',
        { stroke: '#3c465e', lineWidth: 3, order: -60 },
      ),
      renderItem('sealed-dungeon-floor', rectangle(0, dungeonGroundY, 1200, 116), '#272a36', {
        stroke: '#596174',
        lineWidth: 2,
        order: 0,
      }),
      renderItem(
        'sealed-dungeon-entrance-vestibule',
        [
          { x: 0, y: 304 },
          { x: 0, y: 174 },
          { x: 58, y: 132 },
          { x: 205, y: 132 },
          { x: 294, y: 206 },
          { x: 294, y: 304 },
        ],
        '#20293a',
        { stroke: '#526079', lineWidth: 3, opacity: 0.92, order: -34 },
      ),
      renderItem(
        'sealed-dungeon-entrance-step',
        rectangle(24, dungeonGroundY - 8, 270, 10),
        '#667087',
        { stroke: '#242a36', lineWidth: 2, order: 4 },
      ),
      renderItem(
        'sealed-dungeon-guardian-dais',
        [
          { x: 382, y: dungeonGroundY },
          { x: 412, y: dungeonGroundY - 14 },
          { x: 588, y: dungeonGroundY - 14 },
          { x: 618, y: dungeonGroundY },
        ],
        '#403d4c',
        { stroke: '#80758f', lineWidth: 2, order: 5 },
      ),
      renderItem(
        'sealed-dungeon-guardian-sigil',
        regularPolygon(500, dungeonGroundY - 10, 104, 22, 12, Math.PI / 12),
        '#9a5c6d',
        { stroke: '#f0a1ad', lineWidth: 2, opacity: 0.42, order: 6 },
      ),
      renderItem(
        'sealed-dungeon-guardian-seal',
        [
          { x: 650, y: dungeonGroundY },
          { x: 632, y: 286 },
          { x: 650, y: 164 },
          { x: 668, y: 286 },
        ],
        '#b64f6e',
        { stroke: '#ffb1bd', lineWidth: 3, opacity: 0.6, order: 12 },
      ),
      renderItem(
        'sealed-dungeon-guardian-seal-core',
        regularPolygon(650, 284, 34, 92, 8, Math.PI / 8),
        '#6d2948',
        { stroke: '#f28da7', lineWidth: 2, opacity: 0.54, order: 13 },
      ),
      renderItem(
        'sealed-dungeon-guardian-open',
        [
          { x: 628, y: dungeonGroundY },
          { x: 622, y: 302 },
          { x: 638, y: 214 },
          { x: 650, y: 194 },
          { x: 662, y: 214 },
          { x: 678, y: 302 },
          { x: 672, y: dungeonGroundY },
        ],
        '#0c111a',
        { stroke: '#507061', lineWidth: 3, opacity: 0.86, order: -10, enabled: false },
      ),
      renderItem(
        'sealed-dungeon-guardian-rubble',
        [
          { x: 614, y: dungeonGroundY },
          { x: 626, y: dungeonGroundY - 18 },
          { x: 642, y: dungeonGroundY - 9 },
          { x: 658, y: dungeonGroundY - 25 },
          { x: 676, y: dungeonGroundY - 12 },
          { x: 688, y: dungeonGroundY },
        ],
        '#674454',
        { stroke: '#9c6f7c', lineWidth: 2, order: 8, enabled: false },
      ),
      renderItem(
        'sealed-dungeon-checkpoint-alcove',
        [
          { x: 738, y: dungeonGroundY },
          { x: 744, y: 276 },
          { x: 780, y: 206 },
          { x: 850, y: 178 },
          { x: 920, y: 206 },
          { x: 956, y: 276 },
          { x: 962, y: dungeonGroundY },
        ],
        '#202f36',
        { stroke: '#58717a', lineWidth: 3, opacity: 0.9, order: -28 },
      ),
      renderItem(
        'sealed-dungeon-checkpoint-plinth',
        [
          { x: 800, y: dungeonGroundY },
          { x: 812, y: dungeonGroundY - 18 },
          { x: 888, y: dungeonGroundY - 18 },
          { x: 900, y: dungeonGroundY },
        ],
        '#486064',
        { stroke: '#86a09f', lineWidth: 2, order: 5 },
      ),
      renderItem(
        'sealed-dungeon-boss-threshold',
        rectangle(982, dungeonGroundY - 15, 218, 18),
        '#5b3a4d',
        { stroke: '#b46779', lineWidth: 2, order: 5 },
      ),
      renderItem(
        'sealed-dungeon-boss-threshold-arch',
        [
          { x: 1018, y: dungeonGroundY },
          { x: 1018, y: 268 },
          { x: 1052, y: 204 },
          { x: 1110, y: 178 },
          { x: 1168, y: 204 },
          { x: 1198, y: 268 },
          { x: 1198, y: dungeonGroundY },
        ],
        '#2e2434',
        { stroke: '#865467', lineWidth: 4, opacity: 0.88, order: -24 },
      ),
      ...createPortalRenderItems('dungeon-field-gate', 80, dungeonGroundY, '#d59b68', {
        style: 'sealed',
      }),
      ...createPortalRenderItems('dungeon-canopy-gate', 175, dungeonGroundY, '#91d08a', {
        style: 'sealed',
      }),
      ...createPortalRenderItems('dungeon-boss-gate', 1110, dungeonGroundY, '#e26055', {
        style: 'sealed',
        enabled: false,
      }),
      renderItem(
        'checkpoint-dormant',
        regularPolygon(850, dungeonGroundY - 58, 24, 46, 8, Math.PI / 8),
        '#394c55',
        { stroke: '#697c80', lineWidth: 2, order: 16 },
      ),
      renderItem(
        'checkpoint-active',
        regularPolygon(850, dungeonGroundY - 58, 29, 52, 8, Math.PI / 8),
        '#74e1ca',
        { stroke: '#effff9', lineWidth: 3, opacity: 0.82, order: 17, enabled: false },
      ),
      renderItem(
        'checkpoint-active-aura',
        regularPolygon(850, dungeonGroundY - 50, 54, 64, 14),
        '#66e0c5',
        { opacity: 0.18, order: 15, enabled: false },
      ),
    ],
    entities: [
      {
        id: 'sealed-dungeon-guardian',
        kind: 'combat-enemy',
        encounterProfileId: 'field',
        position: { x: 500, y: dungeonGroundY },
        maxHealth: 95,
      },
      {
        id: 'dungeon-gate-record-interaction',
        kind: 'story-interaction',
        position: { x: 342, y: dungeonGroundY - 82 },
        interactionRange: 64,
        speaker: '봉인 회랑 경계 기록',
        lines: [
          '전방의 회랑 수호자가 checkpoint로 향하는 봉인을 붙들고 있다.',
          '수호자를 쓰러뜨린 뒤 청록빛 기록석을 깨워야 봉인 핵으로 가는 문이 열린다.',
        ],
      },
      {
        id: 'dungeon-checkpoint-record-interaction',
        kind: 'story-interaction',
        position: { x: 760, y: dungeonGroundY - 82 },
        interactionRange: 66,
        speaker: '봉인 회랑 기록석',
        lines: [
          '회랑 수호자가 무너져 기록석의 봉인이 풀렸다.',
          'checkpoint를 활성화해 이 원정의 귀환 지점을 새기면 봉인 핵의 문이 열린다.',
        ],
        enabled: false,
      },
    ],
    triggers: [
      {
        id: 'sealed-forest-checkpoint',
        kind: 'checkpoint',
        position: { x: 850, y: dungeonGroundY },
        radius: 58,
        enabled: false,
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
      {
        id: 'boss-result-echo-interaction',
        kind: 'story-interaction',
        position: { x: 480, y: bossGroundY - 82 },
        interactionRange: 68,
        speaker: '봉인 핵의 잔향',
        lines: [
          '봉인 수문장이 쓰러지자 실습림을 짓누르던 마력의 흐름이 멎었다.',
          '황금빛 보상 결정을 회수하면 학원촌으로 이어지는 귀환문이 깨어난다.',
        ],
        enabled: false,
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
    travelSegmentId: 'academy-sealed-road',
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
    travelSegmentId: 'sealed-canopy-detour',
    bidirectional: true,
    from: {
      regionId: 'academy-region',
      roomId: 'field-crossing',
      anchor: { x: 420, y: 412 },
      spawn: { x: 500, y: 339 },
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
    travelSegmentId: 'cleared-sealed-road',
    bidirectional: true,
    enabled: false,
    from: {
      regionId: 'academy-region',
      roomId: 'field-crossing',
      anchor: { x: 1110, y: fieldGroundY },
      spawn: { x: 1045, y: fieldGroundY - 82 },
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
    travelSegmentId: 'canopy-dungeon-trail',
    bidirectional: true,
    from: {
      regionId: 'academy-region',
      roomId: 'field-canopy',
      anchor: { x: 1110, y: fieldGroundY },
      spawn: { x: 1045, y: fieldGroundY - 82 },
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
      anchor: { x: 1110, y: dungeonGroundY },
      spawn: { x: 1045, y: dungeonGroundY - 82 },
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
    travelSegmentId: 'sealed-shortcut-return',
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
    id: 'first-field-night-presentation',
    priority: 11,
    when: { eq: ['timePhase', 'night'] },
    operations: [
      { op: 'set-enabled', target: 'field-crossing-day-canopy-light', value: false },
      { op: 'set-enabled', target: 'field-crossing-night-veil', value: true },
      { op: 'set-enabled', target: 'field-crossing-night-waylight', value: true },
      { op: 'set-enabled', target: 'field-canopy-day-canopy-light', value: false },
      { op: 'set-enabled', target: 'field-canopy-night-veil', value: true },
      { op: 'set-enabled', target: 'field-canopy-night-waylight', value: true },
    ],
  },
  {
    id: 'field-guardian-cleared',
    priority: 20,
    when: { flag: 'fieldGuardianDefeated' },
    operations: [
      { op: 'set-enabled', target: 'field-guardian', value: false },
      { op: 'set-enabled', target: 'field-guardian-bloom', value: true },
      { op: 'set-enabled', target: 'field-dungeon-portal', value: true },
      { op: 'set-enabled', target: 'field-dungeon-locked-seal', value: false },
      { op: 'set-enabled', target: 'field-dungeon-gate-outer', value: true },
      { op: 'set-enabled', target: 'field-dungeon-gate-inner', value: true },
      {
        op: 'set',
        target: 'field-departure-clue-interaction',
        property: 'lines',
        value: [
          '노을풀밭의 수호 개체가 물러나고 봉인 회랑으로 향하는 길이 선명해졌다.',
          '정면 돌파의 흔적은 남았다. 이제 회랑의 기록석을 찾아 첫 원정을 이어 가라.',
        ],
      },
    ],
  },
  {
    id: 'sealed-dungeon-guardian-cleared',
    priority: 25,
    when: { flag: 'dungeonGuardianDefeated' },
    operations: [
      { op: 'set-enabled', target: 'sealed-dungeon-guardian', value: false },
      { op: 'set-enabled', target: 'sealed-dungeon-guardian-seal', value: false },
      { op: 'set-enabled', target: 'sealed-dungeon-guardian-seal-core', value: false },
      { op: 'set-enabled', target: 'sealed-dungeon-guardian-open', value: true },
      { op: 'set-enabled', target: 'sealed-dungeon-guardian-rubble', value: true },
      { op: 'set-enabled', target: 'dungeon-gate-record-interaction', value: false },
      { op: 'set-enabled', target: 'dungeon-checkpoint-record-interaction', value: true },
      { op: 'set-enabled', target: 'sealed-forest-checkpoint', value: true },
      { op: 'set-enabled', target: 'dungeon-boss-portal', value: false },
      { op: 'set-enabled', target: 'dungeon-boss-gate-outer', value: false },
      { op: 'set-enabled', target: 'dungeon-boss-gate-inner', value: false },
    ],
  },
  {
    id: 'sealed-checkpoint-active',
    priority: 30,
    when: {
      all: [{ flag: 'dungeonGuardianDefeated' }, { flag: 'checkpointActivated' }],
    },
    operations: [
      { op: 'set-enabled', target: 'checkpoint-dormant', value: false },
      { op: 'set-enabled', target: 'checkpoint-active', value: true },
      { op: 'set-enabled', target: 'checkpoint-active-aura', value: true },
      {
        op: 'set',
        target: 'dungeon-checkpoint-record-interaction',
        property: 'lines',
        value: [
          '첫 원정의 checkpoint가 청록빛으로 고정되었다.',
          '봉인 핵으로 향하는 문이 열렸다. 안쪽의 수문장을 쓰러뜨리고 원정의 결과를 가져가라.',
        ],
      },
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
      { op: 'set-enabled', target: 'boss-result-echo-interaction', value: true },
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
      {
        op: 'set',
        target: 'boss-result-echo-interaction',
        property: 'lines',
        value: [
          '보상 결정에 봉인 핵의 기록이 온전히 옮겨졌다.',
          '첫 원정의 증표를 지니고 황금빛 귀환문을 지나 세라 교관에게 돌아가라.',
        ],
      },
      { op: 'set-enabled', target: 'boss-shortcut-portal', value: true },
      { op: 'set-enabled', target: 'boss-shortcut-gate-outer', value: true },
      { op: 'set-enabled', target: 'boss-shortcut-gate-inner', value: true },
    ],
  },
]);
