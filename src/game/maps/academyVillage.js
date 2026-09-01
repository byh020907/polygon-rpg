import { defineMap } from '../map/MapDefinition.js';
import {
  createEnvironmentPortalLandmarkItems,
  createPortalRenderItems,
} from './PortalRenderItems.js';
import {
  ACADEMY_FIELD_PORTAL_ITEMS,
  ACADEMY_SEALED_SHORTCUT_PORTAL_ITEMS,
  FIRST_JOURNEY_PATCHES,
  FIRST_JOURNEY_PORTALS,
  FIRST_JOURNEY_ROOMS,
} from './firstJourney.js';
import {
  ACADEMY_GLASSWIND_PORTAL_ITEMS,
  GLASSWIND_PATCHES,
  GLASSWIND_PORTALS,
  GLASSWIND_REGION,
} from './glasswindRegion.js';

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
    ...(options.renderOrder !== undefined ? { renderOrder: options.renderOrder } : {}),
    enabled: options.enabled ?? true,
    ...(options.label ? { label: options.label } : {}),
    ...(options.role ? { role: options.role } : {}),
    ...(options.presentationOnly ? { presentationOnly: true } : {}),
  };
}

const backLayerItems = [
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

const middleLayerItems = [
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

const frontLayerItems = [
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
  renderItem('shop-story-sign', rectangle(813, 349, 31, 18), '#d7b567', {
    stroke: '#493d2e',
    lineWidth: 1.5,
    order: 6,
    label: '리오의 인챈트 공방',
    role: 'academy-facility-landmark',
    presentationOnly: true,
  }),
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
  renderItem('enchanter-lio-shadow', regularPolygon(830, 428, 18, 5, 10), '#111719', {
    opacity: 0.5,
    order: 10,
    role: 'academy-enchanter-landmark',
    presentationOnly: true,
  }),
  renderItem(
    'enchanter-lio-coat',
    [
      { x: 818, y: 377 },
      { x: 838, y: 377 },
      { x: 846, y: 426 },
      { x: 812, y: 426 },
    ],
    '#633f52',
    {
      stroke: '#2e2430',
      lineWidth: 2,
      order: 12,
      label: '인챈터 리오',
      role: 'academy-enchanter-landmark',
      presentationOnly: true,
    },
  ),
  renderItem(
    'enchanter-lio-apron',
    [
      { x: 822, y: 386 },
      { x: 837, y: 386 },
      { x: 840, y: 421 },
      { x: 818, y: 421 },
    ],
    '#b17d53',
    { stroke: '#523926', lineWidth: 1.5, order: 13, presentationOnly: true },
  ),
  renderItem('enchanter-lio-head', regularPolygon(829, 365, 10, 12, 12, -Math.PI / 2), '#a96f57', {
    stroke: '#30252a',
    lineWidth: 2,
    order: 14,
    presentationOnly: true,
  }),
  renderItem(
    'enchanter-lio-hair',
    [
      { x: 819, y: 365 },
      { x: 820, y: 354 },
      { x: 830, y: 349 },
      { x: 840, y: 356 },
      { x: 837, y: 365 },
      { x: 829, y: 359 },
    ],
    '#302334',
    { stroke: '#17111a', lineWidth: 1.5, order: 15, presentationOnly: true },
  ),
  renderItem(
    'enchanter-lio-tongs',
    [
      { x: 839, y: 391 },
      { x: 843, y: 390 },
      { x: 853, y: 420 },
      { x: 849, y: 421 },
    ],
    '#bec9c4',
    { stroke: '#36423f', lineWidth: 1.5, order: 16, presentationOnly: true },
  ),
  renderItem('mentor-sera-shadow', regularPolygon(490, 428, 19, 5, 10), '#111719', {
    opacity: 0.5,
    order: 10,
    role: 'academy-mentor-landmark',
    presentationOnly: true,
  }),
  renderItem(
    'mentor-sera-sheathed-sword',
    [
      { x: 475, y: 378 },
      { x: 480, y: 376 },
      { x: 507, y: 421 },
      { x: 501, y: 424 },
    ],
    '#bcc8c2',
    { stroke: '#26353a', lineWidth: 2, order: 11, presentationOnly: true },
  ),
  renderItem(
    'mentor-sera-coat',
    [
      { x: 479, y: 374 },
      { x: 497, y: 374 },
      { x: 508, y: 426 },
      { x: 471, y: 426 },
    ],
    '#385c65',
    {
      stroke: '#17282e',
      lineWidth: 2,
      order: 12,
      label: '전투교관 세라',
      role: 'academy-mentor-landmark',
      presentationOnly: true,
    },
  ),
  renderItem(
    'mentor-sera-sash',
    [
      { x: 476, y: 391 },
      { x: 499, y: 383 },
      { x: 502, y: 390 },
      { x: 478, y: 399 },
    ],
    '#d5aa5f',
    { stroke: '#5b4226', lineWidth: 1, order: 13, presentationOnly: true },
  ),
  renderItem('mentor-sera-head', regularPolygon(488, 361, 10, 12, 12, -Math.PI / 2), '#b67e62', {
    stroke: '#30252a',
    lineWidth: 2,
    order: 14,
    presentationOnly: true,
  }),
  renderItem(
    'mentor-sera-hair',
    [
      { x: 478, y: 361 },
      { x: 479, y: 350 },
      { x: 489, y: 346 },
      { x: 499, y: 354 },
      { x: 495, y: 361 },
      { x: 488, y: 356 },
    ],
    '#202a31',
    { stroke: '#10161a', lineWidth: 1.5, order: 15, presentationOnly: true },
  ),
  renderItem(
    'mentor-sera-shoulder-guard',
    [
      { x: 476, y: 372 },
      { x: 482, y: 367 },
      { x: 487, y: 374 },
      { x: 480, y: 380 },
    ],
    '#9aa9a7',
    { stroke: '#263638', lineWidth: 1.5, order: 16, presentationOnly: true },
  ),
  renderItem('mentor-sera-crest', regularPolygon(489, 387, 4, 6, 4, Math.PI / 4), '#73ded2', {
    stroke: '#163b3d',
    lineWidth: 1,
    order: 17,
    presentationOnly: true,
  }),
  ...createEnvironmentPortalLandmarkItems('academy-training-gate', 104, 432, {
    style: 'academy-door',
    order: 8,
  }),
  ...createPortalRenderItems('academy-training-gate', 104, 432, '#86d9d1', {
    style: 'academy',
    order: 12,
  }),
  ...ACADEMY_FIELD_PORTAL_ITEMS,
  ...ACADEMY_SEALED_SHORTCUT_PORTAL_ITEMS,
];

const combatDungeonItems = [
  renderItem('dungeon-backdrop', rectangle(0, 0, 960, 540), '#090d17', {
    order: -100,
  }),
  renderItem(
    'dungeon-vault',
    [
      { x: 0, y: 235 },
      { x: 150, y: 118 },
      { x: 310, y: 216 },
      { x: 480, y: 92 },
      { x: 650, y: 216 },
      { x: 810, y: 118 },
      { x: 960, y: 235 },
      { x: 960, y: 420 },
      { x: 0, y: 420 },
    ],
    '#171d2b',
    { stroke: '#30394d', lineWidth: 3, order: -80 },
  ),
  renderItem('dungeon-floor', rectangle(0, 420, 960, 120), '#242735', {
    stroke: '#4a5061',
    lineWidth: 2,
    order: 0,
  }),
  renderItem('dungeon-platform-line', rectangle(50, 405, 860, 15), '#3d4557', {
    stroke: '#79869b',
    lineWidth: 1.5,
    order: 2,
  }),
  ...createPortalRenderItems('dungeon-exit', 104, 420, '#86d9d1', {
    style: 'sealed',
    order: 7,
  }),
  renderItem('training-rune-left', regularPolygon(360, 395, 24, 9, 6), '#5fb8ad', {
    opacity: 0.5,
    order: 3,
  }),
  renderItem('training-rune-right', regularPolygon(760, 395, 24, 9, 6), '#5fb8ad', {
    opacity: 0.5,
    order: 3,
  }),
];

function withRenderLayer(items, renderOrder) {
  return items.map((item) => ({ ...item, renderOrder }));
}

export const ACADEMY_VILLAGE_MAP = defineMap({
  id: 'academy-village',
  name: '왕립 마법학교 학원권',
  version: 2,
  worldSize: { width: 11920, height: 540 },
  gridSize: 48,
  palette: DAY_PALETTE,
  groundY: null,
  initialSpawnId: 'plaza-arrival',
  spawns: [
    {
      id: 'plaza-arrival',
      regionId: 'academy-region',
      roomId: 'academy-plaza',
      position: { x: 270, y: 350 },
      facing: 1,
    },
  ],
  regions: [
    {
      id: 'academy-region',
      label: '왕립 마법학교 학원권',
      rooms: [
        {
          id: 'academy-plaza',
          label: '학원촌 중앙광장',
          bounds: { x: 0, y: 0, width: 1024, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 432,
          movementBounds: { minX: 24, maxX: 1000 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'plaza-ground-surface',
              kind: 'solid',
              material: 'academy-stone',
              points: [
                { x: 0, y: 432 },
                { x: 1024, y: 432 },
              ],
            },
          ],
          renderItems: [
            ...withRenderLayer(backLayerItems, 10),
            ...withRenderLayer(middleLayerItems, 20),
            ...withRenderLayer(frontLayerItems, 30),
            ...withRenderLayer(ACADEMY_GLASSWIND_PORTAL_ITEMS, 30),
            renderItem('plaza-ground-extension', rectangle(960, 432, 64, 108), '#51473d', {
              stroke: '#332f2c',
              lineWidth: 2,
              order: 0,
              renderOrder: 30,
            }),
            renderItem(
              'plaza-foreground-planter-left',
              [
                { x: 0, y: 466 },
                { x: 76, y: 448 },
                { x: 132, y: 482 },
                { x: 148, y: 540 },
                { x: 0, y: 540 },
              ],
              '#203a32',
              { stroke: '#172a26', lineWidth: 2, order: 1, renderOrder: 30.72 },
            ),
            renderItem(
              'plaza-foreground-planter-right',
              [
                { x: 884, y: 482 },
                { x: 944, y: 448 },
                { x: 1024, y: 466 },
                { x: 1024, y: 540 },
                { x: 868, y: 540 },
              ],
              '#203a32',
              { stroke: '#172a26', lineWidth: 2, order: 1, renderOrder: 30.72 },
            ),
          ],
          entities: [
            {
              id: 'mentor-sera-interaction',
              kind: 'story-interaction',
              position: { x: 488, y: 350 },
              interactionRange: 112,
              speaker: '세라 교관',
              lines: [
                '마법이 없어도 발과 방패, 검을 내는 순간은 네가 고를 수 있어.',
                '황금 문 너머 실습림에서 Guard와 Roll의 차이를 증명해 봐.',
              ],
            },
            {
              id: 'enchanter-lio-interaction',
              kind: 'story-interaction',
              position: { x: 829, y: 352 },
              interactionRange: 64,
              speaker: '리오 인챈터',
              lines: [
                '검을 보여 줘. 가져온 재료와 Gold가 맞으면 속성의 결을 한 단계 새겨 주지.',
                '한 검에는 한 속성만 남는다. 아래에서 지금 검에 새길 속성을 골라.',
              ],
              commands: [
                { id: 'enchant-fire', type: 'upgrade-sword-enchantment', enchantId: 'fire' },
                {
                  id: 'enchant-lightning',
                  type: 'upgrade-sword-enchantment',
                  enchantId: 'lightning',
                },
                { id: 'enchant-ice', type: 'upgrade-sword-enchantment', enchantId: 'ice' },
                { id: 'enchant-earth', type: 'upgrade-sword-enchantment', enchantId: 'earth' },
              ],
            },
          ],
          triggers: [],
          portals: [
            'academy-training-portal',
            'academy-glasswind-portal',
            'academy-field-portal',
            'boss-shortcut-portal',
          ],
        },
        {
          id: 'training-room',
          label: '독립 훈련장',
          bounds: { x: 1240, y: 0, width: 1024, height: 540 },
          cameraAnchor: { x: 480, y: 270 },
          groundY: 420,
          movementBounds: { minX: 24, maxX: 1000 },
          renderOrder: 30,
          surfaces: [
            {
              id: 'training-ground-surface',
              kind: 'solid',
              material: 'sealed-stone',
              points: [
                { x: 0, y: 420 },
                { x: 1024, y: 420 },
              ],
            },
          ],
          renderItems: [
            ...withRenderLayer(combatDungeonItems, 30),
            renderItem('training-backdrop-extension', rectangle(960, 0, 64, 540), '#090d17', {
              order: -100,
              renderOrder: 30,
            }),
            renderItem('training-floor-extension', rectangle(960, 420, 64, 120), '#242735', {
              stroke: '#4a5061',
              lineWidth: 2,
              order: 0,
              renderOrder: 30,
            }),
          ],
          entities: [
            {
              id: 'combat-test-mob',
              kind: 'combat-test-mob',
              position: { x: 680, y: 420 },
              maxHealth: 160,
            },
          ],
          triggers: [],
          portals: ['academy-training-portal'],
        },
        ...FIRST_JOURNEY_ROOMS,
      ],
    },
    GLASSWIND_REGION,
  ],
  portals: [
    {
      id: 'academy-training-portal',
      bidirectional: true,
      from: {
        regionId: 'academy-region',
        roomId: 'academy-plaza',
        anchor: { x: 104, y: 432 },
        spawn: { x: 154, y: 350 },
        radius: 52,
      },
      to: {
        regionId: 'academy-region',
        roomId: 'training-room',
        anchor: { x: 104, y: 420 },
        spawn: { x: 150, y: 338 },
        radius: 52,
      },
      transition: { durationSeconds: 0.32 },
    },
    ...FIRST_JOURNEY_PORTALS,
    ...GLASSWIND_PORTALS,
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
    ...FIRST_JOURNEY_PATCHES,
    {
      id: 'first-journey-returned-with-reward',
      priority: 60,
      when: { flag: 'returnedWithReward' },
      operations: [
        {
          op: 'set',
          target: 'mentor-sera-interaction',
          property: 'lines',
          value: [
            '돌아왔군. 봉인 핵의 증표가 네 첫 원정을 끝까지 증명하고 있어.',
            'Guard와 Roll만으로 길을 고르고 checkpoint를 세운 판단까지, 모두 네 전투의 일부다.',
          ],
        },
      ],
    },
    ...GLASSWIND_PATCHES,
  ],
});

export { DAY_PALETTE, NIGHT_PALETTE };
