import { combatFramesToSeconds } from '../../combat/CombatFrame.js';
import {
  sampleTrainingEnemyCombatGeometry,
  sampleTrainingEnemyWeaponLength,
} from '../../combat/SharedCombatGeometry.js';

export const TRAINING_ENEMY_PRESENTATION_SCALE = 0.48;

function assertAttackProfiles(profiles) {
  if (!profiles || typeof profiles !== 'object' || !profiles.light) {
    throw new TypeError(
      'Training encounter presentation에는 authored attack profile 주입이 필요합니다.',
    );
  }
  return profiles;
}

const SCRAP_ENEMY_TOOL_KINDS = Object.freeze([
  'magnet-claw',
  'drill-maw',
  'conveyor-ram',
  'hydraulic-crane',
  'geothermal-manifold',
  'snowplow-train',
  'rock-cutting-machine',
  'salvage-cutter',
]);

function assertCharacterPresentationProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    throw new TypeError(
      'Training encounter enemy에는 immutable Character Presentation Profile 주입이 필요합니다.',
    );
  }
  if (!Object.isFrozen(profile)) {
    throw new TypeError(
      `${profile.id ?? 'unknown'} Character Presentation Profile은 immutable이어야 합니다.`,
    );
  }
  for (const field of ['id', 'family', 'accent', 'material', 'toolKind']) {
    if (typeof profile[field] !== 'string' || profile[field].length === 0) {
      throw new TypeError(`Character Presentation Profile의 ${field} 값이 필요합니다.`);
    }
  }
  if (!['machine', 'human'].includes(profile.family)) {
    throw new TypeError(
      `Training encounter enemy는 machine 또는 human profile이어야 합니다: ${profile.family}`,
    );
  }
  if (!SCRAP_ENEMY_TOOL_KINDS.includes(profile.toolKind)) {
    throw new TypeError(`지원하지 않는 scrap enemy toolKind입니다: ${profile.toolKind}`);
  }
  if (!profile.proportions || typeof profile.proportions !== 'object') {
    throw new TypeError(`${profile.id}에는 proportions가 필요합니다.`);
  }
  for (const field of ['shoulder', 'hip', 'head', 'sideDepth']) {
    if (!Number.isFinite(profile.proportions[field]) || profile.proportions[field] <= 0) {
      throw new TypeError(`${profile.id} proportions.${field}는 양의 수여야 합니다.`);
    }
  }
  if (
    !Array.isArray(profile.landmarks) ||
    profile.landmarks.length < 3 ||
    profile.landmarks.some((landmark) => typeof landmark !== 'string' || landmark.length === 0)
  ) {
    throw new TypeError(`${profile.id}에는 최소 세 개의 silhouette landmark가 필요합니다.`);
  }
  if (!Object.isFrozen(profile.proportions) || !Object.isFrozen(profile.landmarks)) {
    throw new TypeError(
      `${profile.id} Character Presentation Profile은 deep immutable이어야 합니다.`,
    );
  }
  return profile;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothStep(amount) {
  const clamped = Math.max(0, Math.min(1, amount));
  return clamped * clamped * (3 - 2 * clamped);
}

function transformPoints(points, { x, y, rotation = 0, scaleX = 1, scaleY = 1 }) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return points.map((point) => ({
    x: x + point.x * scaleX * cosine - point.y * scaleY * sine,
    y: y + point.x * scaleX * sine + point.y * scaleY * cosine,
  }));
}

function polygon(id, points, transform, fill, options = {}) {
  return {
    id,
    type: 'polygon',
    points: transformPoints(points, transform),
    fill,
    ...options,
  };
}

function limbSegment(id, start, end, width, fill, options = {}) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const normalX = (-deltaY / length) * (width / 2);
  const normalY = (deltaX / length) * (width / 2);
  return polygon(
    id,
    [
      { x: start.x + normalX, y: start.y + normalY },
      { x: end.x + normalX, y: end.y + normalY },
      { x: end.x - normalX, y: end.y - normalY },
      { x: start.x - normalX, y: start.y - normalY },
    ],
    { x: 0, y: 0 },
    fill,
    options,
  );
}

function arcRibbonPoints(origin, startAngle, endAngle, innerRadius, outerRadius, segments = 7) {
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const amount = index / segments;
    const angle = lerp(startAngle, endAngle, amount);
    points.push({
      x: origin.x + Math.cos(angle) * outerRadius,
      y: origin.y + Math.sin(angle) * outerRadius,
    });
  }
  for (let index = segments; index >= 0; index -= 1) {
    const amount = index / segments;
    const angle = lerp(startAngle, endAngle, amount);
    points.push({
      x: origin.x + Math.cos(angle) * innerRadius,
      y: origin.y + Math.sin(angle) * innerRadius,
    });
  }
  return points;
}

function regularPolygon(radiusX, radiusY, sides, angleOffset = 0) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = angleOffset + (index / sides) * Math.PI * 2;
    return { x: Math.cos(angle) * radiusX, y: Math.sin(angle) * radiusY };
  });
}

function toothedWheel(radius, teeth, innerRatio = 0.82) {
  return Array.from({ length: teeth * 2 }, (_, index) => {
    const outer = index % 2 === 0;
    const angle = -Math.PI / 2 + (index / (teeth * 2)) * Math.PI * 2;
    const sampledRadius = radius * (outer ? 1 : innerRatio);
    return { x: Math.cos(angle) * sampledRadius, y: Math.sin(angle) * sampledRadius };
  });
}

function rectangle(x, y, width, height) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

function createScrapEnemyAppearanceItems({
  profile,
  x,
  y,
  weaponHand,
  weaponAngle,
  weaponLength,
  orderNear,
}) {
  const { accent, material, proportions, toolKind } = profile;
  const outline = '#20272b';
  const plateEdge = '#8b9795';
  const cableFill = '#252c2f';
  const bodyOrder = orderNear('combat-enemy-body', 0);
  const headOrder = orderNear('combat-enemy-head', 0);
  const weaponOrder = orderNear('combat-enemy-weapon', 0);
  const shoulderWidth = Math.max(18, proportions.shoulder);
  const hipWidth = Math.max(14, proportions.hip);
  const headRadius = Math.max(5, proportions.head);
  const presentation = { presentationOnly: true };
  if (profile.family === 'human') {
    const headFill = '#b98669';
    const hoodFill = '#252d32';
    const cutterEnd = {
      x: weaponHand.x + Math.cos(weaponAngle) * Math.max(weaponLength - 16, 44),
      y: weaponHand.y + Math.sin(weaponAngle) * Math.max(weaponLength - 16, 44),
    };
    return [
      polygon(
        'combat-enemy-human-work-hood',
        [
          { x: -headRadius - 4, y: -10 },
          { x: headRadius + 5, y: -10 },
          { x: headRadius + 3, y: 13 },
          { x: -headRadius - 3, y: 13 },
        ],
        { x, y: y - 80 },
        hoodFill,
        { ...presentation, stroke: accent, lineWidth: 2, order: headOrder + 0.18 },
      ),
      polygon(
        'combat-enemy-human-face-guard',
        regularPolygon(headRadius * 0.68, Math.max(4, headRadius * 0.48), 8, Math.PI / 8),
        { x: x + 2, y: y - 78 },
        headFill,
        { ...presentation, stroke: '#e3d3bb', lineWidth: 1.5, order: headOrder + 0.3 },
      ),
      polygon(
        'combat-enemy-human-salvage-vest',
        [
          { x: -shoulderWidth + 3, y: -22 },
          { x: shoulderWidth - 3, y: -22 },
          { x: hipWidth + 3, y: 17 },
          { x: -hipWidth - 3, y: 17 },
        ],
        { x, y: y - 35 },
        material,
        { ...presentation, stroke: accent, lineWidth: 2, order: bodyOrder + 0.26 },
      ),
      polygon(
        'combat-enemy-human-recovery-sling',
        [
          { x: -shoulderWidth + 2, y: -23 },
          { x: -shoulderWidth + 6, y: -24 },
          { x: hipWidth - 1, y: 16 },
          { x: hipWidth - 5, y: 17 },
        ],
        { x, y: y - 35 },
        '#d7c393',
        { ...presentation, stroke: outline, lineWidth: 1.5, order: bodyOrder + 0.3 },
      ),
      limbSegment(
        'combat-enemy-human-cutter-hose',
        { x: x - shoulderWidth + 3, y: y - 51 },
        { x: x - shoulderWidth - 17, y: y - 13 },
        4,
        '#20282e',
        { ...presentation, stroke: accent, lineWidth: 1.5, order: bodyOrder - 0.3 },
      ),
      polygon(
        'combat-enemy-human-salvage-cutter',
        [
          { x: 0, y: -5 },
          { x: weaponLength - 13, y: -5 },
          { x: weaponLength, y: 0 },
          { x: weaponLength - 13, y: 6 },
          { x: 0, y: 6 },
        ],
        { ...weaponHand, rotation: weaponAngle },
        accent,
        { ...presentation, stroke: '#f4e3b3', lineWidth: 2.5, order: weaponOrder + 0.26 },
      ),
      polygon(
        'combat-enemy-human-cutter-spark',
        regularPolygon(5, 5, 6, Math.PI / 6),
        cutterEnd,
        '#f6d56a',
        { ...presentation, stroke: '#fff4cc', lineWidth: 1, order: weaponOrder + 0.3 },
      ),
    ];
  }
  const commonItems = [
    polygon(
      'combat-enemy-scrap-back-plate',
      [
        { x: -shoulderWidth - 4, y: -26 },
        { x: -9, y: -34 },
        { x: -8, y: 11 },
        { x: -hipWidth - 5, y: 19 },
      ],
      { x, y: y - 31 },
      material,
      {
        ...presentation,
        stroke: outline,
        lineWidth: 3,
        order: bodyOrder - 0.35,
      },
    ),
    polygon(
      'combat-enemy-scrap-front-plate',
      [
        { x: -13, y: -22 },
        { x: 15, y: -24 },
        { x: 17, y: 5 },
        { x: 9, y: 17 },
        { x: -11, y: 15 },
        { x: -16, y: 1 },
      ],
      { x, y: y - 31 },
      material,
      {
        ...presentation,
        stroke: plateEdge,
        lineWidth: 2.5,
        order: bodyOrder + 0.12,
      },
    ),
    polygon(
      'combat-enemy-scrap-rivet-left',
      regularPolygon(3.5, 3.5, 8, Math.PI / 8),
      { x: x - 10, y: y - 67 },
      accent,
      {
        ...presentation,
        stroke: outline,
        lineWidth: 1.5,
        order: bodyOrder + 0.2,
      },
    ),
    polygon(
      'combat-enemy-scrap-rivet-right',
      regularPolygon(3.5, 3.5, 8, Math.PI / 8),
      { x: x + 10, y: y - 67 },
      accent,
      {
        ...presentation,
        stroke: outline,
        lineWidth: 1.5,
        order: bodyOrder + 0.2,
      },
    ),
    limbSegment(
      'combat-enemy-scrap-cable',
      { x: x - shoulderWidth - 2, y: y - 53 },
      { x: x - hipWidth - 13, y: y - 17 },
      5,
      cableFill,
      {
        ...presentation,
        stroke: accent,
        lineWidth: 1.5,
        order: bodyOrder - 0.28,
      },
    ),
    polygon(
      'combat-enemy-scrap-repair-mark',
      [
        { x: -13, y: -2 },
        { x: -4, y: -6 },
        { x: 2, y: -1 },
        { x: 11, y: -7 },
        { x: 14, y: -3 },
        { x: 2, y: 5 },
        { x: -5, y: 0 },
        { x: -11, y: 3 },
      ],
      { x: x + 1, y: y - 42 },
      accent,
      {
        ...presentation,
        stroke: outline,
        lineWidth: 1.5,
        order: bodyOrder + 0.24,
      },
    ),
  ];

  if (toolKind === 'magnet-claw') {
    const jawBase = Math.max(weaponLength - 24, 44);
    return [
      ...commonItems,
      polygon(
        'combat-enemy-collector-eye',
        regularPolygon(headRadius * 0.72, Math.max(4, headRadius * 0.48), 8, Math.PI / 8),
        { x: x + 2, y: y - 79 },
        accent,
        {
          ...presentation,
          stroke: '#fff1c7',
          lineWidth: 2,
          order: headOrder + 0.3,
        },
      ),
      polygon(
        'combat-enemy-magnet-claw-upper-jaw',
        [
          { x: jawBase - 9, y: -8 },
          { x: jawBase + 12, y: -18 },
          { x: jawBase + 6, y: -5 },
          { x: jawBase - 3, y: 1 },
        ],
        { ...weaponHand, rotation: weaponAngle },
        accent,
        {
          ...presentation,
          stroke: outline,
          lineWidth: 2.5,
          order: weaponOrder + 0.2,
        },
      ),
      polygon(
        'combat-enemy-magnet-claw-lower-jaw',
        [
          { x: jawBase - 3, y: 2 },
          { x: jawBase + 7, y: 8 },
          { x: jawBase + 14, y: 20 },
          { x: jawBase - 9, y: 9 },
        ],
        { ...weaponHand, rotation: weaponAngle },
        accent,
        {
          ...presentation,
          stroke: outline,
          lineWidth: 2.5,
          order: weaponOrder + 0.2,
        },
      ),
      limbSegment(
        'combat-enemy-collector-cable-tail',
        { x: x - shoulderWidth, y: y - 58 },
        { x: x - shoulderWidth - 24, y: y - 9 },
        6,
        cableFill,
        {
          ...presentation,
          stroke: accent,
          lineWidth: 2,
          order: bodyOrder - 0.3,
        },
      ),
    ];
  }

  if (toolKind === 'drill-maw') {
    return [
      ...commonItems,
      polygon(
        'combat-enemy-drill-maw',
        [
          { x: -4, y: -12 },
          { x: 14, y: -9 },
          { x: 42, y: 0 },
          { x: 14, y: 10 },
          { x: -5, y: 13 },
        ],
        { x: x + headRadius, y: y - 77 },
        accent,
        {
          ...presentation,
          stroke: outline,
          lineWidth: 2.5,
          order: headOrder + 0.28,
        },
      ),
      polygon(
        'combat-enemy-drill-maw-ridge',
        [
          { x: 2, y: -9 },
          { x: 13, y: -5 },
          { x: 5, y: 0 },
          { x: 16, y: 5 },
          { x: 2, y: 9 },
          { x: -3, y: 0 },
        ],
        { x: x + headRadius + 8, y: y - 77 },
        plateEdge,
        {
          ...presentation,
          stroke: outline,
          lineWidth: 1.5,
          order: headOrder + 0.32,
        },
      ),
      limbSegment(
        'combat-enemy-drill-rear-support-leg',
        { x: x - shoulderWidth, y: y - 46 },
        { x: x - hipWidth - 20, y },
        8,
        material,
        {
          ...presentation,
          stroke: outline,
          lineWidth: 2,
          order: bodyOrder - 0.18,
        },
      ),
      limbSegment(
        'combat-enemy-drill-front-support-leg',
        { x: x + shoulderWidth, y: y - 45 },
        { x: x + hipWidth + 22, y },
        8,
        material,
        {
          ...presentation,
          stroke: outline,
          lineWidth: 2,
          order: bodyOrder + 0.08,
        },
      ),
      limbSegment(
        'combat-enemy-drill-pressure-cable',
        { x: x - shoulderWidth + 4, y: y - 69 },
        { x: x + headRadius + 18, y: y - 83 },
        6,
        cableFill,
        {
          ...presentation,
          stroke: accent,
          lineWidth: 2,
          order: headOrder + 0.16,
        },
      ),
    ];
  }

  if (toolKind === 'hydraulic-crane') {
    const boomLength = Math.max(weaponLength - 10, 58);
    const rearBoomStart = { x: x - shoulderWidth + 4, y: y - 62 };
    const rearBoomEnd = { x: x - shoulderWidth - 42, y: y - 94 };
    return [
      ...commonItems,
      polygon(
        'combat-enemy-hydraulic-crane-boom',
        [
          { x: -8, y: -9 },
          { x: boomLength - 8, y: -8 },
          { x: boomLength + 8, y: -2 },
          { x: boomLength + 8, y: 8 },
          { x: -8, y: 10 },
        ],
        { ...weaponHand, rotation: weaponAngle },
        material,
        {
          ...presentation,
          stroke: accent,
          lineWidth: 3.5,
          order: weaponOrder + 0.24,
        },
      ),
      limbSegment(
        'combat-enemy-hydraulic-crane-rear-boom',
        rearBoomStart,
        rearBoomEnd,
        15,
        material,
        {
          ...presentation,
          stroke: accent,
          lineWidth: 3,
          order: bodyOrder - 0.12,
        },
      ),
      limbSegment(
        'combat-enemy-hydraulic-crane-cylinder',
        { x: weaponHand.x - 4, y: weaponHand.y + 8 },
        {
          x: weaponHand.x + Math.cos(weaponAngle) * (boomLength * 0.72),
          y: weaponHand.y + Math.sin(weaponAngle) * (boomLength * 0.72) + 8,
        },
        6,
        plateEdge,
        {
          ...presentation,
          stroke: '#dfffff',
          lineWidth: 1.5,
          order: weaponOrder + 0.28,
        },
      ),
      limbSegment(
        'combat-enemy-hydraulic-crane-cross-cable',
        rearBoomEnd,
        {
          x: weaponHand.x + Math.cos(weaponAngle) * Math.min(boomLength, 70),
          y: weaponHand.y + Math.sin(weaponAngle) * Math.min(boomLength, 70),
        },
        6,
        cableFill,
        {
          ...presentation,
          stroke: accent,
          lineWidth: 2,
          order: bodyOrder + 0.08,
        },
      ),
      polygon(
        'combat-enemy-hydraulic-crane-warning-light',
        regularPolygon(headRadius + 2, Math.max(6, headRadius * 0.78), 8, Math.PI / 8),
        { x: x - 3, y: y - 106 },
        accent,
        {
          ...presentation,
          stroke: '#dfffff',
          lineWidth: 2.5,
          order: headOrder + 0.3,
        },
      ),
    ];
  }

  if (toolKind === 'geothermal-manifold') {
    const pipeLength = Math.max(weaponLength - 12, 60);
    const rearPipeStart = { x: x - shoulderWidth + 5, y: y - 57 };
    const rearPipeEnd = { x: x - shoulderWidth - 38, y: y - 82 };
    return [
      ...commonItems,
      polygon(
        'combat-enemy-geothermal-main-pipe',
        [
          { x: -9, y: -10 },
          { x: pipeLength - 12, y: -9 },
          { x: pipeLength + 7, y: -2 },
          { x: pipeLength + 7, y: 8 },
          { x: -9, y: 10 },
        ],
        { ...weaponHand, rotation: weaponAngle },
        material,
        {
          ...presentation,
          stroke: accent,
          lineWidth: 4,
          order: weaponOrder + 0.24,
        },
      ),
      limbSegment('combat-enemy-geothermal-rear-pipe', rearPipeStart, rearPipeEnd, 16, material, {
        ...presentation,
        stroke: accent,
        lineWidth: 3,
        order: bodyOrder - 0.1,
      }),
      polygon(
        'combat-enemy-geothermal-pressure-valve',
        regularPolygon(18, 18, 8, Math.PI / 8),
        { x: x + shoulderWidth - 3, y: y - 53 },
        accent,
        {
          ...presentation,
          stroke: '#efffcf',
          lineWidth: 3,
          order: bodyOrder + 0.32,
        },
      ),
      limbSegment(
        'combat-enemy-geothermal-steam-stack',
        { x: x - 8, y: y - 78 },
        { x: x - 18, y: y - 114 },
        11,
        plateEdge,
        {
          ...presentation,
          stroke: accent,
          lineWidth: 2.5,
          order: headOrder + 0.18,
        },
      ),
      polygon(
        'combat-enemy-geothermal-steam-warning',
        regularPolygon(headRadius + 6, Math.max(7, headRadius), 10, Math.PI / 10),
        { x: x - 18, y: y - 120 },
        '#d8f0cf',
        {
          ...presentation,
          stroke: accent,
          lineWidth: 2,
          opacity: 0.72,
          order: headOrder + 0.28,
        },
      ),
    ];
  }

  if (toolKind === 'snowplow-train') {
    const plowLength = Math.max(weaponLength - 8, 64);
    return [
      ...commonItems,
      polygon(
        'combat-enemy-snowplow-wedge',
        [
          { x: -10, y: -12 },
          { x: plowLength - 18, y: -16 },
          { x: plowLength + 12, y: -30 },
          { x: plowLength + 18, y: 28 },
          { x: plowLength - 18, y: 14 },
          { x: -10, y: 12 },
        ],
        { ...weaponHand, rotation: weaponAngle },
        material,
        {
          ...presentation,
          stroke: accent,
          lineWidth: 4,
          order: weaponOrder + 0.24,
        },
      ),
      polygon(
        'combat-enemy-snowplow-track',
        [
          { x: -shoulderWidth - 12, y: -12 },
          { x: shoulderWidth + 14, y: -12 },
          { x: shoulderWidth + 20, y: 8 },
          { x: -shoulderWidth - 18, y: 8 },
        ],
        { x, y: y - 9 },
        '#33454f',
        {
          ...presentation,
          stroke: accent,
          lineWidth: 3,
          order: bodyOrder + 0.2,
        },
      ),
      polygon(
        'combat-enemy-snowplow-heater-rivet',
        regularPolygon(16, 16, 10, Math.PI / 10),
        { x: x - shoulderWidth + 2, y: y - 51 },
        accent,
        {
          ...presentation,
          stroke: '#f4fbff',
          lineWidth: 3,
          order: bodyOrder + 0.34,
        },
      ),
      polygon(
        'combat-enemy-snowplow-signal-lamp',
        regularPolygon(headRadius + 5, Math.max(7, headRadius), 8, Math.PI / 8),
        { x: x + 8, y: y - 111 },
        '#d8efff',
        {
          ...presentation,
          stroke: accent,
          lineWidth: 2.5,
          order: headOrder + 0.3,
        },
      ),
    ];
  }

  if (toolKind === 'rock-cutting-machine') {
    const bladeArmLength = Math.max(weaponLength - 16, 68);
    const bladeRadius = Math.max(25, Math.min(34, bladeArmLength * 0.38));
    const bladeCenter = {
      x: weaponHand.x + Math.cos(weaponAngle) * bladeArmLength,
      y: weaponHand.y + Math.sin(weaponAngle) * bladeArmLength,
    };
    const pivot = { x: x + shoulderWidth - 4, y: y - 54 };
    return [
      ...commonItems,
      polygon(
        'combat-enemy-quarry-body-housing',
        [
          { x: -shoulderWidth - 10, y: -25 },
          { x: shoulderWidth - 4, y: -31 },
          { x: shoulderWidth + 15, y: -16 },
          { x: shoulderWidth + 12, y: 18 },
          { x: hipWidth + 5, y: 28 },
          { x: -hipWidth - 12, y: 24 },
        ],
        { x, y: y - 35 },
        material,
        {
          ...presentation,
          stroke: accent,
          lineWidth: 4,
          order: bodyOrder + 0.26,
        },
      ),
      limbSegment('combat-enemy-quarry-pivot-arm', pivot, bladeCenter, 17, material, {
        ...presentation,
        stroke: accent,
        lineWidth: 3.5,
        order: weaponOrder + 0.19,
      }),
      polygon(
        'combat-enemy-quarry-cutting-blade',
        toothedWheel(bladeRadius, 14),
        bladeCenter,
        '#b8aea0',
        {
          ...presentation,
          stroke: accent,
          lineWidth: 4,
          order: weaponOrder + 0.28,
        },
      ),
      polygon(
        'combat-enemy-quarry-cutting-blade-gullet',
        regularPolygon(bladeRadius * 0.62, bladeRadius * 0.62, 14, Math.PI / 14),
        bladeCenter,
        '#4b3630',
        {
          ...presentation,
          stroke: '#d8c4a6',
          lineWidth: 2,
          order: weaponOrder + 0.3,
        },
      ),
      polygon(
        'combat-enemy-quarry-drive-bearing',
        regularPolygon(17, 17, 12, Math.PI / 12),
        pivot,
        '#d9b36c',
        {
          ...presentation,
          stroke: '#fff0bd',
          lineWidth: 3,
          order: bodyOrder + 0.36,
        },
      ),
      limbSegment(
        'combat-enemy-quarry-outrigger',
        { x: x - shoulderWidth + 2, y: y - 38 },
        { x: x - hipWidth - 27, y: y - 1 },
        13,
        '#4b3630',
        {
          ...presentation,
          stroke: accent,
          lineWidth: 2.5,
          order: bodyOrder - 0.14,
        },
      ),
    ];
  }

  return [
    ...commonItems,
    polygon(
      'combat-enemy-conveyor-ram-plate',
      [
        { x: -7, y: -24 },
        { x: 27, y: -20 },
        { x: 35, y: -10 },
        { x: 35, y: 12 },
        { x: 26, y: 22 },
        { x: -8, y: 25 },
      ],
      { x: x + shoulderWidth - 3, y: y - 48 },
      material,
      {
        ...presentation,
        stroke: accent,
        lineWidth: 3.5,
        order: bodyOrder + 0.3,
      },
    ),
    polygon(
      'combat-enemy-conveyor-warning-light',
      regularPolygon(headRadius + 2, Math.max(6, headRadius * 0.78), 8, Math.PI / 8),
      { x: x - 3, y: y - 104 },
      accent,
      {
        ...presentation,
        stroke: '#fff2b6',
        lineWidth: 2.5,
        order: headOrder + 0.3,
      },
    ),
    polygon(
      'combat-enemy-conveyor-power-shaft',
      regularPolygon(18, 18, 12, Math.PI / 12),
      { x: x - shoulderWidth, y: y - 47 },
      plateEdge,
      {
        ...presentation,
        stroke: outline,
        lineWidth: 3,
        order: bodyOrder + 0.22,
      },
    ),
    polygon(
      'combat-enemy-conveyor-power-shaft-hub',
      regularPolygon(7, 7, 8, Math.PI / 8),
      { x: x - shoulderWidth, y: y - 47 },
      accent,
      {
        ...presentation,
        stroke: outline,
        lineWidth: 2,
        order: bodyOrder + 0.26,
      },
    ),
  ];
}

export function sampleTrainingEnemyCombatFrame(enemy, attackProfiles) {
  if (!enemy || !['windup', 'attack', 'recovery'].includes(enemy.aiState)) return null;
  const profiles = assertAttackProfiles(attackProfiles);
  const profile = profiles[enemy.attackKind];
  const durationFrames =
    enemy.aiState === 'windup'
      ? profile.frame.windupFrames
      : enemy.aiState === 'attack'
        ? profile.frame.attackFrames
        : Math.max(1, Math.round(enemy.recoveryDurationSeconds * 60));
  const durationSeconds = combatFramesToSeconds(durationFrames);
  const progress = Math.max(0, Math.min(1, 1 - enemy.aiSeconds / durationSeconds));
  return Object.freeze({
    rate: 60,
    phase: enemy.aiState,
    index: Math.min(durationFrames - 1, Math.max(0, Math.floor(progress * durationFrames + 1e-7))),
    duration: durationFrames,
    authored: profile.frame,
  });
}

export function createTrainingEnemyItems(
  enemy,
  renderOrder,
  attackProfiles,
  combatGeometry = null,
  characterPresentationProfile = null,
) {
  if (!enemy) return [];
  const profiles = assertAttackProfiles(attackProfiles);
  const presentationProfile = assertCharacterPresentationProfile(characterPresentationProfile);
  const resolvedCombatGeometry =
    combatGeometry ?? sampleTrainingEnemyCombatGeometry(enemy, profiles);
  const { x, y } = enemy.position;
  const flash = enemy.hitFlashSeconds > 0;
  const groggy = enemy.posture?.groggy === true;
  const groggyPulse = groggy ? 0.72 + 0.28 * Math.sin(enemy.posture.groggySeconds * 30) : 1;
  const glasswind = enemy.species === 'glasswind';
  const surrendering = enemy.resolutionState === 'surrendered';
  const fleeing = enemy.resolutionState === 'fleeing';
  const bodyFill = groggy
    ? '#bff8ed'
    : flash
      ? '#f4e3ce'
      : enemy.aiState === 'windup'
        ? presentationProfile.accent
        : enemy.aiState === 'guard'
          ? '#4f7f9d'
          : presentationProfile.material;
  const healthRatio = Math.max(0, enemy.health / enemy.maxHealth);
  const opacity =
    enemy.resolutionState === 'departed'
      ? 0
      : surrendering || fleeing
        ? 1
        : enemy.health > 0
          ? 1
          : Math.max(0.18, enemy.resetSeconds);
  const enchant = enemy.enchantStatus;
  const enchantAura = enchant
    ? polygon(
        `combat-enemy-enchant-aura-${enchant.id}`,
        regularPolygon(42, 58, enchant.shape === 'fragment' ? 4 : 8, Math.PI / 8),
        { x, y: y - 62 },
        enchant.color ?? '#ffffff',
        {
          opacity: 0.42,
          stroke: enchant.highlightColor ?? enchant.color ?? '#ffffff',
          lineWidth: 2,
          order: -0.6,
        },
      )
    : null;
  const presentationScale = enemy.presentationScale ?? TRAINING_ENEMY_PRESENTATION_SCALE;
  const attackProfile = profiles[enemy.attackKind];
  const attackProgress =
    enemy.aiState === 'attack' ? 1 - enemy.aiSeconds / attackProfile.attackSeconds : 0;
  const recoveryProgress =
    enemy.aiState === 'recovery' && enemy.recoveryDurationSeconds > 0
      ? 1 - enemy.aiSeconds / enemy.recoveryDurationSeconds
      : 0;
  const weaponLength = sampleTrainingEnemyWeaponLength(enemy, profiles);
  const weaponAngle = surrendering
    ? 0.85
    : fleeing
      ? 0.42
      : enemy.aiState === 'hitstun'
        ? enemy.hitReactionWeaponAngle
        : enemy.aiState === 'windup'
          ? enemy.attackKind === 'sweep'
            ? -1.4
            : enemy.attackKind === 'heavy'
              ? -1.8
              : enemy.attackKind === 'antiAir'
                ? 0.1
                : -1.2
          : enemy.aiState === 'attack'
            ? enemy.attackKind === 'sweep'
              ? -0.3 + attackProgress * 0.55
              : enemy.attackKind === 'antiAir'
                ? 0.1 - attackProgress * 3
                : enemy.attackKind === 'heavy'
                  ? -1.8 + attackProgress * 2.4
                  : -1.2 + attackProgress * 1.8
            : enemy.aiState === 'recovery'
              ? lerp(enemy.recoveryStartAngle, -0.65, smoothStep(recoveryProgress))
              : -0.65;
  const renderFacing = ['windup', 'attack', 'recovery'].includes(enemy.aiState)
    ? enemy.attackFacing
    : enemy.facing;
  const poseRotation = surrendering
    ? 0.18
    : fleeing
      ? enemy.resolutionDirection * 0.22
      : enemy.aiState === 'recovery'
        ? lerp(enemy.recoveryBodyStartRotation, 0, smoothStep(recoveryProgress))
        : enemy.rotation +
          (groggy ? -0.18 : 0) +
          (enemy.aiState === 'windup'
            ? -0.14
            : enemy.aiState === 'attack'
              ? -0.14 + attackProgress * 0.42
              : 0);
  const weaponHand = { x: x + 8, y: y - (enemy.attackKind === 'sweep' ? 20 : 56) };
  const weaponShoulder = { x: x - 8, y: y - (enemy.attackKind === 'sweep' ? 45 : 59) };
  const weaponElbow = {
    x: lerp(weaponShoulder.x, weaponHand.x, 0.5) + Math.sin(weaponAngle) * 8,
    y: lerp(weaponShoulder.y, weaponHand.y, 0.5) - Math.cos(weaponAngle) * 8,
  };
  const antiAirGlowOpacity =
    enemy.attackKind === 'antiAir'
      ? Math.max(0, Math.min(0.42, ((weaponLength - profiles.light.weaponLength) / 134) * 0.42))
      : 0;
  const items = [
    ...(enchantAura ? [enchantAura] : []),
    ...(surrendering && presentationProfile.family === 'human'
      ? [
          limbSegment(
            'combat-enemy-human-surrender-rear-arm',
            { x: x - 10, y: y - 64 },
            { x: x - 25, y: y - 108 },
            8,
            presentationProfile.material,
            { stroke: '#20272b', lineWidth: 2 },
          ),
          limbSegment(
            'combat-enemy-human-surrender-front-arm',
            { x: x + 10, y: y - 64 },
            { x: x + 27, y: y - 108 },
            8,
            presentationProfile.accent,
            { stroke: '#20272b', lineWidth: 2 },
          ),
          polygon(
            'combat-enemy-human-surrender-marker',
            regularPolygon(10, 13, 3),
            { x, y: y - 126 },
            '#e4bd64',
            { stroke: '#fff1bd', lineWidth: 1.5 },
          ),
        ]
      : []),
    ...(fleeing && presentationProfile.family === 'human'
      ? [
          polygon(
            'combat-enemy-human-flee-dust',
            regularPolygon(24, 8, 8),
            { x: x - enemy.resolutionDirection * 24, y: enemy.groundY },
            '#b9a98b',
            { opacity: 0.42 },
          ),
        ]
      : []),
    polygon(
      'combat-enemy-shadow',
      regularPolygon(25, 7, 10),
      { x, y: enemy.groundY + 2 },
      '#05070b',
      { opacity: 0.52 },
    ),
    ...(enemy.groundImpactSeconds > 0
      ? [
          polygon(
            'combat-enemy-impact-ring',
            regularPolygon(70, 14, 16),
            { x, y: enemy.groundY + 2 },
            '#bdeee2',
            { opacity: enemy.groundImpactSeconds / 0.22 },
          ),
          polygon(
            'combat-enemy-impact-crack',
            [
              { x: -78, y: 0 },
              { x: -25, y: -7 },
              { x: 0, y: 2 },
              { x: 30, y: -6 },
              { x: 82, y: 0 },
              { x: 28, y: 6 },
              { x: 0, y: 3 },
              { x: -24, y: 5 },
            ],
            { x, y: enemy.groundY + 1 },
            '#76cbbf',
            { opacity: enemy.groundImpactSeconds / 0.22 },
          ),
        ]
      : []),
    ...(enemy.retaliationInvulnerableSeconds > 0
      ? [
          polygon(
            'combat-enemy-retaliation-aura',
            regularPolygon(33, 42, 12, Math.PI / 12),
            { x, y: y - 44 },
            '#76eadc',
            { stroke: '#effffb', lineWidth: 2, opacity: 0.14 },
          ),
        ]
      : []),
    ...(enemy.aiState === 'windup' && enemy.attackKind === 'heavy'
      ? [
          polygon(
            'combat-enemy-heavy-warning',
            regularPolygon(72, 82, 14, Math.PI / 14),
            { x, y: y - 44 },
            '#e65e53',
            {
              stroke: '#ffd6a0',
              lineWidth: 3,
              opacity: 0.18 + Math.max(0, 1 - enemy.aiSeconds / attackProfile.windupSeconds) * 0.34,
            },
          ),
        ]
      : []),
    ...(enemy.role === 'boss' && enemy.punishWindowOpen
      ? [
          polygon(
            'combat-enemy-punish-window',
            regularPolygon(60, 70, 14, Math.PI / 14),
            { x, y: y - 44 },
            '#6ce3cd',
            { stroke: '#eafff9', lineWidth: 2, opacity: 0.24 },
          ),
        ]
      : []),
    ...(glasswind && enemy.aiState === 'windup' && enemy.attackKind === 'sweep'
      ? [
          polygon(
            'combat-enemy-sweep-warning',
            arcRibbonPoints({ x, y: enemy.groundY - 4 }, -0.15, 0.15, 72, 188, 10),
            { x: 0, y: 0 },
            '#72edf0',
            {
              stroke: '#efffff',
              lineWidth: 2,
              opacity: 0.16 + Math.max(0, 1 - enemy.aiSeconds / attackProfile.windupSeconds) * 0.4,
            },
          ),
        ]
      : []),
    ...(glasswind && enemy.aiState === 'attack' && enemy.attackKind === 'sweep'
      ? [
          polygon(
            'combat-enemy-sweep-trail',
            arcRibbonPoints(
              { x: weaponHand.x, y: enemy.groundY - 8 },
              weaponAngle - 0.24,
              weaponAngle + 0.08,
              54,
              weaponLength,
              10,
            ),
            { x: 0, y: 0 },
            '#8ff5ef',
            { opacity: 0.38 },
          ),
        ]
      : []),
    limbSegment(
      'combat-enemy-back-leg',
      { x: x - 7, y: y - 29 },
      { x: x - 9, y },
      8,
      presentationProfile.material,
      {
        stroke: '#20272b',
        lineWidth: 1.5,
      },
    ),
    limbSegment(
      'combat-enemy-front-leg',
      { x: x + 7, y: y - 29 },
      { x: x + 10, y },
      8,
      presentationProfile.material,
      {
        stroke: '#20272b',
        lineWidth: 1.5,
      },
    ),
    polygon(
      'combat-enemy-body',
      [
        { x: -17, y: -36 },
        { x: 16, y: -38 },
        { x: 21, y: 8 },
        { x: 11, y: 29 },
        { x: -13, y: 28 },
        { x: -21, y: 6 },
      ],
      { x, y: y - 31 },
      bodyFill,
      { stroke: '#20272b', lineWidth: 2 },
    ),
    polygon(
      'combat-enemy-head',
      regularPolygon(15, 18, 8),
      { x, y: y - 79 },
      presentationProfile.material,
      {
        stroke: '#20272b',
        lineWidth: 2,
      },
    ),
    ...(presentationProfile.family === 'machine'
      ? [
          polygon(
            'combat-enemy-core-glow',
            regularPolygon(20, 20, 10, Math.PI / 10),
            { x, y: y - 42 },
            presentationProfile.accent,
            { opacity: flash ? 0.5 : 0.22 },
          ),
          polygon(
            'combat-enemy-core',
            regularPolygon(15, 15, 6, Math.PI / 6),
            { x, y: y - 42 },
            flash ? '#ffffff' : presentationProfile.accent,
            { stroke: '#20272b', lineWidth: 1.5 },
          ),
        ]
      : [
          polygon(
            'combat-enemy-human-buckle',
            regularPolygon(8, 8, 6, Math.PI / 6),
            { x, y: y - 42 },
            flash ? '#ffffff' : presentationProfile.accent,
            { stroke: '#20272b', lineWidth: 1.5 },
          ),
        ]),
    ...(enemy.weakPoint?.exposed
      ? [
          polygon(
            'combat-enemy-weak-point-aura',
            regularPolygon(29, 29, 12, Math.PI / 12),
            {
              x: x + enemy.weakPoint.presentation.offsetX * renderFacing,
              y: y + enemy.weakPoint.presentation.offsetY,
            },
            enemy.weakPoint.presentation.color,
            {
              stroke: enemy.weakPoint.presentation.highlightColor,
              lineWidth: 3,
              opacity: 0.3 + 0.1 * Math.cos(enemy.aiSeconds * 30),
            },
          ),
          polygon(
            'combat-enemy-weak-point-core',
            regularPolygon(11, 11, 8, Math.PI / 8),
            {
              x: x + enemy.weakPoint.presentation.offsetX * renderFacing,
              y: y + enemy.weakPoint.presentation.offsetY,
            },
            enemy.weakPoint.presentation.highlightColor,
            {
              stroke: enemy.weakPoint.presentation.color,
              lineWidth: 2,
            },
          ),
        ]
      : []),
    polygon(
      'combat-enemy-weapon',
      [
        { x: 0, y: -3 },
        { x: weaponLength - 16, y: -3 },
        { x: weaponLength, y: 0 },
        { x: weaponLength - 16, y: 4 },
        { x: 0, y: 4 },
      ],
      { ...weaponHand, rotation: weaponAngle },
      presentationProfile.accent,
      { stroke: '#37434b', lineWidth: 2 },
    ),
    ...(antiAirGlowOpacity > 0
      ? [
          polygon(
            'combat-enemy-weapon-glow',
            [
              { x: 0, y: -7 },
              { x: weaponLength - 12, y: -7 },
              { x: weaponLength + 5, y: 0 },
              { x: weaponLength - 12, y: 8 },
              { x: 0, y: 8 },
            ],
            { ...weaponHand, rotation: weaponAngle },
            '#7ee8ef',
            { opacity: antiAirGlowOpacity },
          ),
          ...(enemy.aiState === 'attack'
            ? [
                polygon(
                  'combat-enemy-anti-air-trail',
                  arcRibbonPoints(weaponHand, weaponAngle - 0.48, weaponAngle, 68, weaponLength, 8),
                  { x: 0, y: 0 },
                  '#91f1ed',
                  { opacity: antiAirGlowOpacity * 0.72 },
                ),
              ]
            : []),
        ]
      : []),
    limbSegment(
      'combat-enemy-upper-weapon-arm',
      weaponShoulder,
      weaponElbow,
      11,
      presentationProfile.material,
      {
        stroke: '#20272b',
        lineWidth: 2,
      },
    ),
    limbSegment(
      'combat-enemy-lower-weapon-arm',
      weaponElbow,
      weaponHand,
      10,
      presentationProfile.accent,
      {
        stroke: '#20272b',
        lineWidth: 2,
      },
    ),
    polygon('combat-enemy-health-back', rectangle(-34, -3, 68, 6), { x, y: y - 112 }, '#201822', {
      stroke: '#09070b',
      lineWidth: 1,
    }),
    ...(surrendering || fleeing
      ? [
          polygon(
            'combat-enemy-resolution-fill',
            rectangle(-32, -1, 64, 2),
            { x, y: y - 112 },
            surrendering ? '#75d6c4' : '#e4bd64',
          ),
        ]
      : [
          polygon(
            'combat-enemy-health-fill',
            rectangle(-32, -1, 64 * healthRatio, 2),
            { x, y: y - 112 },
            healthRatio > 0.3 ? '#df6571' : '#f0c96b',
          ),
        ]),
    ...(enemy.posture && enemy.health > 0
      ? [
          polygon(
            'combat-enemy-posture-back',
            rectangle(-34, -5, 68, 10),
            { x, y: y - 103 },
            '#102d35',
            { stroke: '#0a151b', lineWidth: 1 },
          ),
          polygon(
            'combat-enemy-posture-fill',
            rectangle(-32, -3, 64 * enemy.posture.ratio, 6),
            { x, y: y - 103 },
            groggy ? '#f2c96d' : '#55d9d0',
            { opacity: groggyPulse },
          ),
          ...(groggy
            ? [
                polygon(
                  'combat-enemy-posture-break',
                  regularPolygon(42, 50, 8, Math.PI / 8),
                  { x, y: y - 54 },
                  '#f1c966',
                  { stroke: '#dbfff7', lineWidth: 2, opacity: 0.16 + groggyPulse * 0.24 },
                ),
              ]
            : []),
        ]
      : []),
  ];

  const orderNear = (itemId, offset) => items.findIndex((item) => item.id === itemId) + offset;
  items.push(
    ...createScrapEnemyAppearanceItems({
      profile: presentationProfile,
      x,
      y,
      weaponHand,
      weaponAngle,
      weaponLength,
      orderNear,
    }),
  );

  return items.map((item, index) => {
    const geometryPoints =
      item.id === 'combat-enemy-weapon'
        ? resolvedCombatGeometry.weapon.points
        : item.id === 'combat-enemy-body'
          ? resolvedCombatGeometry.hurt.find((polygonValue) => polygonValue.part === 'body')?.points
          : item.id === 'combat-enemy-head'
            ? resolvedCombatGeometry.hurt.find((polygonValue) => polygonValue.part === 'head')
                ?.points
            : null;
    return Object.freeze({
      ...item,
      opacity: (item.opacity ?? 1) * opacity,
      lineWidth: (item.lineWidth ?? 1) * presentationScale,
      points: geometryPoints
        ? Object.freeze(geometryPoints)
        : Object.freeze(
            item.points.map((point) => {
              const rotatesWithBody =
                item.id !== 'combat-enemy-shadow' &&
                !item.id.startsWith('combat-enemy-health') &&
                !item.id.startsWith('combat-enemy-posture');
              const centerY = y - 50;
              const relativeX = point.x - x;
              const relativeY = point.y - centerY;
              const rotatedX = rotatesWithBody
                ? x + relativeX * Math.cos(poseRotation) - relativeY * Math.sin(poseRotation)
                : point.x;
              const rotatedY = rotatesWithBody
                ? centerY + relativeX * Math.sin(poseRotation) + relativeY * Math.cos(poseRotation)
                : point.y;
              const facedX = renderFacing < 0 ? x * 2 - rotatedX : rotatedX;
              const embeddedOffset =
                enemy.groundBounceDelaySeconds > 0 &&
                item.id !== 'combat-enemy-shadow' &&
                !item.id.startsWith('combat-enemy-health') &&
                !item.id.startsWith('combat-enemy-posture')
                  ? 8
                  : 0;
              return Object.freeze({
                x: x + (facedX - x) * presentationScale,
                y: y + (rotatedY - y) * presentationScale + embeddedOffset,
              });
            }),
          ),
      renderOrder,
      order: item.order ?? index,
    });
  });
}
