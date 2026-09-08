import { deepFreeze } from '../game/map/MapDefinition.js';

// Concept-art editing surface: parent-local coordinates in [-1,1], separate
// relative sizes, named bone roles, and normalized cutout outlines. No frames.
const plate = [
  [-0.75, -1],
  [0.7, -1],
  [1, -0.55],
  [0.85, 0.75],
  [0.45, 1],
  [-0.7, 0.9],
  [-1, 0.3],
];
const segment = [
  [-0.8, 0],
  [0.8, 0],
  [1, 0.3],
  [0.65, 1],
  [-0.65, 1],
  [-1, 0.3],
];
const body = [
  [-0.9, -0.55],
  [-0.45, -1],
  [0.55, -0.9],
  [0.95, -0.5],
  [0.45, 0.4],
  [-0.45, 0.4],
];
const box = [
  [-1, -0.7],
  [-0.7, -1],
  [0.7, -1],
  [1, -0.7],
  [1, 0.7],
  [0.7, 1],
  [-0.7, 1],
  [-1, 0.7],
];
const node = (id, parent, offset, size, shape = segment, tone = 1, rotation = 0) => ({
  id,
  parent,
  offset,
  size,
  shape,
  tone,
  rotation,
});

const human = [
  node('pelvis', null, [0, -0.56, 0], [0.3, 0.12, 0.5], box, 0),
  node('torso', 'pelvis', [0, -0.9, 0], [1.1, 3, 0.9], body),
  node(
    'strap',
    'torso',
    [0, 0, 0.8],
    [0.85, 0.9, 0.15],
    [
      [-0.8, -0.9],
      [-0.5, -1],
      [0.65, 0.35],
      [0.4, 0.48],
    ],
    0,
  ),
  node('pouch', 'pelvis', [-0.8, 0.1, 0.6], [0.32, 0.7, 0.35], box, 1),
  node('head', 'torso', [0.08, -1, 0], [0.4, 0.35, 0.65], plate, 2),
  node(
    'cap',
    'head',
    [0, -0.7, 0.4],
    [1.15, 0.4, 0.9],
    [
      [-1, 1],
      [-0.7, -1],
      [0.65, -1],
      [1, 1],
    ],
    0,
  ),
  ...['rear', 'front'].flatMap((side) => {
    const sign = side === 'rear' ? -1 : 1,
      tone = side === 'rear' ? 0 : 1;
    return [
      node(
        `${side}Thigh`,
        'pelvis',
        [sign * 0.5, 0.5, sign * 0.55],
        [0.28, 2.2, 0.65],
        segment,
        tone,
      ),
      node(`${side}Shin`, `${side}Thigh`, [0, 1, 0], [0.8, 1, 0.85], segment, tone),
      node(`${side}Foot`, `${side}Shin`, [0.25, 1, 0], [1.4, 0.2, 1], box, 0),
      node(
        `${side}Arm`,
        'torso',
        [sign * 0.85, -0.5, sign * 0.55],
        [0.27, 0.62, 0.5],
        segment,
        tone,
        sign * -0.1,
      ),
      node(`${side}Forearm`, `${side}Arm`, [0, 1, 0], [0.85, 1, 0.8], segment, tone, sign * -0.15),
    ];
  }),
  node(
    'tool',
    'frontForearm',
    [0, 1, 0],
    [0.4, 1.3, 0.5],
    [
      [-0.2, -1],
      [0.2, -1],
      [0.2, 0],
      [0.8, 0.1],
      [1, 0.6],
      [0.7, 1],
      [0.7, 0.6],
      [0.45, 0.4],
      [-0.45, 0.4],
      [-0.7, 0.6],
      [-0.7, 1],
      [-1, 0.6],
      [-0.8, 0.1],
      [-0.2, 0],
    ],
    3,
    -0.35,
  ),
];

const beast = [
  node(
    'torso',
    null,
    [0, -0.5, 0],
    [0.62, 0.25, 0.6],
    [
      [-1, -0.35],
      [-0.65, -0.9],
      [0.55, -1],
      [1, -0.4],
      [0.65, 0.5],
      [-0.55, 0.65],
    ],
  ),
  ...['rear', 'front'].flatMap((side) =>
    ['hind', 'lead'].flatMap((end) => {
      const name = `${side}${end}`,
        sign = side === 'rear' ? -1 : 1;
      return [
        node(
          `${name}Leg`,
          'torso',
          [(end === 'hind' ? -0.7 : 0.65) + (side === 'rear' ? -0.12 : 0.08), 0.5, sign * 0.7],
          [0.17, 0.8, 0.4],
          segment,
          side === 'rear' ? 0 : 1,
          end === 'hind' ? -0.15 : 0.08,
        ),
        node(
          `${name}Paw`,
          `${name}Leg`,
          [0, 1, 0],
          [0.75, 0.9, 0.8],
          segment,
          side === 'rear' ? 0 : 2,
          end === 'hind' ? 0.2 : -0.1,
        ),
      ];
    }),
  ),
  node('neck', 'torso', [0.78, -0.3, 0], [0.4, 0.75, 0.8], plate, 1, -0.25),
  node(
    'head',
    'neck',
    [0.55, -0.4, 0],
    [0.9, 0.72, 0.8],
    [
      [-1, -0.2],
      [-0.4, -1],
      [0.6, -0.6],
      [1, 0.15],
      [0.2, 0.9],
      [-0.8, 0.6],
    ],
    2,
  ),
  node(
    'drill',
    'head',
    [0.75, 0.28, 0.2],
    [1.25, 0.65, 0.8],
    [
      [-1, -1],
      [1, 0],
      [-1, 1],
    ],
    2,
  ),
  node(
    'handle',
    'torso',
    [0, -0.8, -0.3],
    [0.45, 0.45, 0.4],
    [
      [-1, 1],
      [-1, -0.35],
      [-0.65, -1],
      [0.6, -1],
      [1, -0.3],
      [1, 1],
      [0.65, 1],
      [0.65, -0.2],
      [0.4, -0.5],
      [-0.4, -0.5],
      [-0.65, -0.2],
      [-0.65, 1],
    ],
    0,
  ),
  node('eye', 'head', [0.38, -0.18, 0.95], [0.16, 0.13, 0.1], box, 3),
];

const flyer = [
  node(
    'torso',
    null,
    [0, -0.7, 0],
    [0.32, 0.13, 0.45],
    [
      [-0.8, -0.6],
      [0, -1],
      [0.8, -0.6],
      [0.65, 0.5],
      [0, 1],
      [-0.65, 0.5],
    ],
    1,
  ),
  ...['rear', 'front'].flatMap((side) => {
    const sign = side === 'rear' ? -1 : 1;
    return [
      node(
        `${side}Wing`,
        'torso',
        [sign * 0.65, -0.12, sign * 0.35],
        [1.6, 1.2, 0.3],
        [
          [0, 0],
          [sign * 0.45, -1],
          [sign, 0],
          [sign * 0.5, 0.7],
        ],
        side === 'rear' ? 0 : 2,
      ),
      node(
        `${side}WingTip`,
        `${side}Wing`,
        [sign * 0.9, 0, 0],
        [0.9, 1.55, 0.8],
        [
          [0, 0],
          [sign * 0.85, -0.5],
          [sign, 0],
          [sign * 0.25, 0.5],
        ],
        side === 'rear' ? 1 : 2,
      ),
    ];
  }),
  node('head', 'torso', [0, -0.1, 0.35], [0.4, 0.55, 0.9], plate, 1),
  node('eye', 'head', [0.2, -0.05, 0.8], [0.55, 0.15, 0.1], box, 3),
  node(
    'tail',
    'torso',
    [0, 0.75, 0],
    [0.07, 2.2, 0.5],
    [
      [-1, 0],
      [1, 0],
      [1, 1],
      [-1, 1],
    ],
    0,
  ),
  node(
    'claw',
    'tail',
    [0, 1, 0],
    [5, 0.4, 0.7],
    [
      [-1, -0.5],
      [-0.6, -1],
      [0.6, -1],
      [1, -0.5],
      [0.8, 1],
      [0.45, 0.1],
      [0, -0.3],
      [-0.45, 0.1],
      [-0.8, 1],
    ],
    2,
  ),
];

const machine = [
  node('torso', null, [0, -0.28, 0], [0.68, 0.18, 0.8], box, 1),
  node('track', 'torso', [-0.15, 0.65, 0.7], [0.95, 0.55, 0.4], box, 0),
  ...['Rear', 'Front'].map((name, i) =>
    node(
      'wheel' + name,
      'track',
      [i ? 0.55 : -0.55, 0, 0.6],
      [0.26, 0.7, 0.3],
      Array.from({ length: 8 }, (_, n) => [
        Math.cos((n * Math.PI) / 4),
        Math.sin((n * Math.PI) / 4),
      ]),
      2,
    ),
  ),
  node(
    'cab',
    'torso',
    [-0.2, -0.7, 0],
    [0.5, 1.6, 0.8],
    [
      [-1, 1],
      [-1, 0],
      [-0.5, -1],
      [0.6, -1],
      [1, -0.5],
      [1, 1],
    ],
    0,
  ),
  node('lamp', 'cab', [0.2, -0.4, 0.9], [0.18, 0.2, 0.1], box, 3),
  node('hood', 'torso', [-0.65, -0.2, 0.8], [0.4, 1.05, 0.4], plate, 1),
  node(
    'sawArm',
    'torso',
    [0.55, -0.4, 0.2],
    [0.14, 3, 0.4],
    [
      [-1, 0],
      [1, 0],
      [1, -1],
      [-1, -1],
    ],
    2,
  ),
  node(
    'blade',
    'sawArm',
    [0, -0.8, -0.4],
    [3.5, 0.65, 0.7],
    Array.from({ length: 32 }, (_, i) => {
      const r = i % 2 ? 0.88 : 1;
      return [Math.cos((i * Math.PI) / 16) * r, Math.sin((i * Math.PI) / 16) * r];
    }),
    0,
  ),
];

export const ENEMY_REFERENCE_PROFILES = deepFreeze([
  {
    id: 'humanoid',
    label: '인간형 · 수거반 견본',
    nodes: human,
    palette: ['#292c2b', '#675343', '#b6a48a', '#b65a3f'],
  },
  {
    id: 'beast',
    label: '짐승형 · 드릴 하운드',
    nodes: beast,
    palette: ['#292c2b', '#66534a', '#92958e', '#d8a33f'],
  },
  {
    id: 'flying',
    label: '비행형 · 정찰 말벌',
    nodes: flyer,
    palette: ['#2b2f30', '#595e5d', '#9a9e99', '#c2563d'],
  },
  {
    id: 'machine',
    referenceScale: 1.8,
    label: '기계형 · 산업 중장비',
    nodes: machine,
    palette: ['#2d3030', '#715045', '#989b92', '#d4a059'],
  },
]);
export const ENEMY_REFERENCE_ACTIONS = deepFreeze([
  { id: 'idle', label: '대기 · 유형 공용', frameCount: 60 },
  { id: 'move', label: '이동 · 유형 공용', frameCount: 48 },
  { id: 'attack', label: '공격 · 유형 공용', frameCount: 48 },
]);
