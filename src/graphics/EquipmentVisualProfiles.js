// Editable parent-local [-1,1] shapes. Extents carry size, never the character body.
const freeze = (v) => {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
};
export const EQUIPMENT_VISUAL_PARTS = freeze({
  'field-work-helmet': [
    {
      id: 'cap',
      joint: 'head',
      extent: [8, 10],
      offset: [0, 0],
      points: [
        [-0.95, -0.3],
        [-0.75, -0.88],
        [0.7, -0.88],
        [1, -0.3],
        [1, 0.02],
        [-1, 0.02],
      ],
      fill: '#bba575',
      material: 'cloth',
    },
  ],
  'field-work-body': [
    {
      id: 'vest',
      joint: 'chest',
      extent: [10, 18],
      offset: [0, 0.1],
      points: [
        [-0.65, -0.55],
        [0.65, -0.55],
        [0.72, 0.64],
        [0, 0.83],
        [-0.72, 0.64],
      ],
      fill: '#8c9b86',
      material: 'cloth',
    },
  ],
  'field-work-boots': ['farFoot', 'nearFoot'].map((joint) => ({
    id: joint + '-gaiter',
    joint,
    extent: [6, 9],
    offset: [0, -0.1],
    points: [
      [-0.75, -0.78],
      [0.55, -0.78],
      [0.8, 0.2],
      [0.6, 0.43],
      [-0.8, 0.34],
    ],
    fill: '#82745b',
    material: 'cloth',
  })),
  'field-work-lamp': [
    {
      id: 'housing',
      joint: 'farHip',
      extent: [6, 9],
      offset: [-1, 0.25],
      points: [
        [-0.65, -0.8],
        [0.65, -0.8],
        [0.82, 0.65],
        [-0.82, 0.65],
      ],
      fill: '#887655',
      material: 'brass',
    },
    {
      id: 'light',
      joint: 'farHip',
      extent: [6, 9],
      offset: [-1, 0.25],
      points: [
        [-0.38, -0.4],
        [0.38, -0.4],
        [0.42, 0.37],
        [-0.42, 0.37],
      ],
      fill: '#f5dc9a',
      material: 'glass',
      emissive: true,
    },
  ],
});
