import { combatFramesToSeconds } from '../../combat/CombatFrame.js';
import {
  sampleTrainingEnemyCombatGeometry,
  sampleTrainingEnemyWeaponLength,
} from '../../combat/SharedCombatGeometry.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from './TrainingEnemyAttackProfiles.js';

export const TRAINING_ENEMY_PRESENTATION_SCALE = 0.48;

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

function rectangle(x, y, width, height) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

export function sampleTrainingEnemyCombatFrame(enemy) {
  if (!enemy || !['windup', 'attack', 'recovery'].includes(enemy.aiState)) return null;
  const profile = TRAINING_ENEMY_ATTACK_PROFILES[enemy.attackKind];
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

export function createTrainingEnemyItems(enemy, renderOrder, combatGeometry = null) {
  if (!enemy) return [];
  const resolvedCombatGeometry =
    combatGeometry ?? sampleTrainingEnemyCombatGeometry(enemy, TRAINING_ENEMY_ATTACK_PROFILES);
  const { x, y } = enemy.position;
  const flash = enemy.hitFlashSeconds > 0;
  const glasswind = enemy.species === 'glasswind';
  const roleColor = glasswind
    ? enemy.role === 'boss'
      ? '#66528f'
      : '#397f89'
    : enemy.role === 'boss'
      ? '#71436f'
      : enemy.role === 'field'
        ? '#7f6341'
        : '#a74651';
  const bodyFill = flash
    ? '#f4e3ce'
    : enemy.aiState === 'windup'
      ? '#e28b45'
      : enemy.aiState === 'guard'
        ? '#4f7f9d'
        : roleColor;
  const healthRatio = Math.max(0, enemy.health / enemy.maxHealth);
  const opacity = enemy.health > 0 ? 1 : Math.max(0.18, enemy.resetSeconds);
  const presentationScale = enemy.presentationScale ?? TRAINING_ENEMY_PRESENTATION_SCALE;
  const attackProfile = TRAINING_ENEMY_ATTACK_PROFILES[enemy.attackKind];
  const attackProgress =
    enemy.aiState === 'attack' ? 1 - enemy.aiSeconds / attackProfile.attackSeconds : 0;
  const recoveryProgress =
    enemy.aiState === 'recovery' && enemy.recoveryDurationSeconds > 0
      ? 1 - enemy.aiSeconds / enemy.recoveryDurationSeconds
      : 0;
  const weaponLength = sampleTrainingEnemyWeaponLength(enemy, TRAINING_ENEMY_ATTACK_PROFILES);
  const weaponAngle =
    enemy.aiState === 'hitstun'
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
  const poseRotation =
    enemy.aiState === 'recovery'
      ? lerp(enemy.recoveryBodyStartRotation, 0, smoothStep(recoveryProgress))
      : enemy.rotation +
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
      ? Math.max(
          0,
          Math.min(
            0.42,
            ((weaponLength - TRAINING_ENEMY_ATTACK_PROFILES.light.weaponLength) / 134) * 0.42,
          ),
        )
      : 0;
  const items = [
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
    limbSegment('combat-enemy-back-leg', { x: x - 7, y: y - 29 }, { x: x - 9, y }, 8, '#552c3a', {
      stroke: '#251824',
      lineWidth: 1.5,
    }),
    ...(glasswind
      ? [
          polygon(
            'combat-enemy-glasswind-wing-back',
            [
              { x: -10, y: 0 },
              { x: -70, y: -46 },
              { x: -82, y: 4 },
              { x: -34, y: 28 },
            ],
            { x: x - 2, y: y - 58, rotation: poseRotation * 0.45 },
            enemy.role === 'boss' ? '#755eb0' : '#4ba5ad',
            { stroke: '#b8f6ef', lineWidth: 2, opacity: 0.72 },
          ),
          polygon(
            'combat-enemy-glasswind-wing-front',
            [
              { x: 8, y: -2 },
              { x: 72, y: -40 },
              { x: 80, y: 10 },
              { x: 32, y: 30 },
            ],
            { x: x + 2, y: y - 58, rotation: -poseRotation * 0.35 },
            enemy.role === 'boss' ? '#9a76c2' : '#63c5c2',
            { stroke: '#d8fffa', lineWidth: 2, opacity: 0.76 },
          ),
        ]
      : []),
    limbSegment('combat-enemy-front-leg', { x: x + 7, y: y - 29 }, { x: x + 10, y }, 8, '#783342', {
      stroke: '#251824',
      lineWidth: 1.5,
    }),
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
      { stroke: '#321c29', lineWidth: 2 },
    ),
    polygon('combat-enemy-head', regularPolygon(15, 18, 8), { x, y: y - 79 }, '#c77865', {
      stroke: '#321c29',
      lineWidth: 2,
    }),
    polygon(
      'combat-enemy-core-glow',
      regularPolygon(20, 20, 10, Math.PI / 10),
      { x, y: y - 42 },
      '#46bfb5',
      { opacity: flash ? 0.5 : 0.22 },
    ),
    polygon(
      'combat-enemy-core',
      regularPolygon(15, 15, 6, Math.PI / 6),
      { x, y: y - 42 },
      flash ? '#ffffff' : '#56e0cf',
      { stroke: '#5d342e', lineWidth: 1.5 },
    ),
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
      glasswind ? '#b9fff6' : '#dce5e6',
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
    limbSegment('combat-enemy-upper-weapon-arm', weaponShoulder, weaponElbow, 11, '#9c514d', {
      stroke: '#321c29',
      lineWidth: 2,
    }),
    limbSegment('combat-enemy-lower-weapon-arm', weaponElbow, weaponHand, 10, '#bd6c5f', {
      stroke: '#321c29',
      lineWidth: 2,
    }),
    polygon('combat-enemy-health-back', rectangle(-34, -3, 68, 6), { x, y: y - 112 }, '#201822', {
      stroke: '#09070b',
      lineWidth: 1,
    }),
    polygon(
      'combat-enemy-health-fill',
      rectangle(-32, -1, 64 * healthRatio, 2),
      { x, y: y - 112 },
      healthRatio > 0.3 ? '#df6571' : '#f0c96b',
    ),
  ];

  if (enemy.profileId === 'training') {
    const orderNear = (itemId, offset) => items.findIndex((item) => item.id === itemId) + offset;
    items.push(
      polygon(
        'combat-enemy-training-waist-cloth',
        [
          { x: -18, y: 12 },
          { x: 18, y: 11 },
          { x: 17, y: 27 },
          { x: 7, y: 42 },
          { x: -2, y: 35 },
          { x: -11, y: 43 },
          { x: -18, y: 27 },
        ],
        { x, y: y - 31 },
        '#c89045',
        {
          stroke: '#513147',
          lineWidth: 2,
          order: orderNear('combat-enemy-body', 0.25),
        },
      ),
      polygon(
        'combat-enemy-training-shoulder-plate',
        [
          { x: -12, y: -7 },
          { x: 0, y: -13 },
          { x: 13, y: -7 },
          { x: 15, y: 3 },
          { x: 5, y: 10 },
          { x: -10, y: 7 },
        ],
        weaponShoulder,
        '#4d294b',
        {
          stroke: '#e6cf9f',
          lineWidth: 2,
          order: orderNear('combat-enemy-upper-weapon-arm', 0.25),
        },
      ),
      polygon(
        'combat-enemy-training-mask',
        [
          { x: -15, y: -5 },
          { x: 12, y: -8 },
          { x: 18, y: 0 },
          { x: 9, y: 11 },
          { x: -10, y: 9 },
          { x: -17, y: 2 },
        ],
        { x, y: y - 79 },
        '#f0ddb4',
        {
          stroke: '#4d294b',
          lineWidth: 2,
          order: orderNear('combat-enemy-head', 0.25),
        },
      ),
      polygon(
        'combat-enemy-training-gauntlet',
        [
          { x: -8, y: -7 },
          { x: 8, y: -7 },
          { x: 12, y: 0 },
          { x: 6, y: 8 },
          { x: -8, y: 7 },
          { x: -11, y: 0 },
        ],
        { ...weaponHand, rotation: weaponAngle },
        '#603257',
        {
          stroke: '#2a172b',
          lineWidth: 2,
          order: orderNear('combat-enemy-lower-weapon-arm', 0.25),
        },
      ),
      polygon(
        'combat-enemy-training-back-boot',
        [
          { x: -9, y: -8 },
          { x: 7, y: -8 },
          { x: 15, y: -3 },
          { x: 16, y: 5 },
          { x: 3, y: 9 },
          { x: -10, y: 6 },
        ],
        { x: x - 9, y },
        '#492542',
        {
          stroke: '#211321',
          lineWidth: 1.5,
          order: orderNear('combat-enemy-back-leg', 0.25),
        },
      ),
      polygon(
        'combat-enemy-training-front-boot',
        [
          { x: -9, y: -8 },
          { x: 8, y: -8 },
          { x: 17, y: -3 },
          { x: 18, y: 5 },
          { x: 4, y: 9 },
          { x: -10, y: 6 },
        ],
        { x: x + 10, y },
        '#633052',
        {
          stroke: '#281427',
          lineWidth: 1.5,
          order: orderNear('combat-enemy-front-leg', 0.25),
        },
      ),
    );
  }

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
                item.id !== 'combat-enemy-shadow' && !item.id.startsWith('combat-enemy-health');
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
                !item.id.startsWith('combat-enemy-health')
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
