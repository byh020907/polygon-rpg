import { combatFramesToSeconds } from '../../combat/CombatFrame.js';

export const TRAINING_ENEMY_PRESENTATION_SCALE = 0.48;

function enemyAttackProfile({
  windupFrames,
  attackFrames,
  recoveryFrames,
  contactStartFrame,
  contactEndFrame,
  blockstunFrames = 0,
  ...profile
}) {
  if (
    contactStartFrame < 0 ||
    contactEndFrame > attackFrames ||
    contactEndFrame < contactStartFrame
  ) {
    throw new RangeError('Enemy contact frame window가 attackFrames 범위를 벗어났습니다.');
  }
  return Object.freeze({
    ...profile,
    frame: Object.freeze({
      rate: 60,
      windupFrames,
      attackFrames,
      recoveryFrames,
      contactStartFrame,
      contactEndFrame,
      blockstunFrames,
    }),
    windupSeconds: combatFramesToSeconds(windupFrames),
    attackSeconds: combatFramesToSeconds(attackFrames),
    recoverySeconds: combatFramesToSeconds(recoveryFrames),
    contactStart: contactStartFrame / attackFrames,
    contactEnd: contactEndFrame / attackFrames,
    blockstunSeconds: combatFramesToSeconds(blockstunFrames),
  });
}

export const TRAINING_ENEMY_ATTACK_PROFILES = Object.freeze({
  light: enemyAttackProfile({
    windupFrames: 14,
    attackFrames: 10,
    recoveryFrames: 14,
    contactStartFrame: 3,
    contactEndFrame: 8,
    blockstunFrames: 7,
    desiredRange: 46,
    attackRange: 52,
    verticalRange: 68,
    damage: 8,
    guardable: true,
    knockbackVelocity: 110,
    knockbackDecayRate: 0.0067,
    blockStrength: 0.55,
    weaponLength: 96,
  }),
  heavy: enemyAttackProfile({
    windupFrames: 30,
    attackFrames: 16,
    recoveryFrames: 35,
    contactStartFrame: 8,
    contactEndFrame: 14,
    desiredRange: 54,
    attackRange: 60,
    verticalRange: 68,
    damage: 20,
    guardable: false,
    knockbackVelocity: 220,
    knockbackDecayRate: 0.015,
    blockStrength: 1,
    weaponLength: 110,
  }),
  antiAir: enemyAttackProfile({
    windupFrames: 19,
    attackFrames: 12,
    recoveryFrames: 28,
    contactStartFrame: 5,
    contactEndFrame: 10,
    desiredRange: 52,
    attackRange: 58,
    verticalRange: 150,
    damage: 14,
    guardable: false,
    knockbackVelocity: 155,
    knockbackDecayRate: 0.01,
    weaponLength: 230,
  }),
});

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

export function sampleTrainingEnemyWeaponLength(enemy) {
  const attackProfile = TRAINING_ENEMY_ATTACK_PROFILES[enemy.attackKind];
  if (enemy.attackKind !== 'antiAir') return attackProfile.weaponLength;
  if (enemy.aiState === 'hitstun') return enemy.hitReactionWeaponLength;
  if (enemy.aiState === 'windup') {
    const windupProgress = 1 - enemy.aiSeconds / attackProfile.windupSeconds;
    return lerp(
      TRAINING_ENEMY_ATTACK_PROFILES.light.weaponLength,
      attackProfile.weaponLength,
      smoothStep(windupProgress),
    );
  }
  if (enemy.aiState === 'attack') return attackProfile.weaponLength;
  if (enemy.aiState === 'recovery') {
    const recoveryProgress =
      enemy.recoveryDurationSeconds > 0 ? 1 - enemy.aiSeconds / enemy.recoveryDurationSeconds : 1;
    const startLength =
      enemy.recoverySource === 'hitReaction'
        ? enemy.hitReactionWeaponLength
        : attackProfile.weaponLength;
    return lerp(
      startLength,
      TRAINING_ENEMY_ATTACK_PROFILES.light.weaponLength,
      smoothStep(recoveryProgress),
    );
  }
  return TRAINING_ENEMY_ATTACK_PROFILES.light.weaponLength;
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

export function createTrainingEnemyItems(enemy, renderOrder) {
  if (!enemy) return [];
  const { x, y } = enemy.position;
  const flash = enemy.hitFlashSeconds > 0;
  const bodyFill = flash
    ? '#f4e3ce'
    : enemy.aiState === 'windup'
      ? '#e28b45'
      : enemy.aiState === 'guard'
        ? '#4f7f9d'
        : '#a74651';
  const healthRatio = Math.max(0, enemy.health / enemy.maxHealth);
  const opacity = enemy.health > 0 ? 1 : Math.max(0.18, enemy.resetSeconds);
  const presentationScale = TRAINING_ENEMY_PRESENTATION_SCALE;
  const attackProfile = TRAINING_ENEMY_ATTACK_PROFILES[enemy.attackKind];
  const attackProgress =
    enemy.aiState === 'attack' ? 1 - enemy.aiSeconds / attackProfile.attackSeconds : 0;
  const recoveryProgress =
    enemy.aiState === 'recovery' && enemy.recoveryDurationSeconds > 0
      ? 1 - enemy.aiSeconds / enemy.recoveryDurationSeconds
      : 0;
  const weaponLength = sampleTrainingEnemyWeaponLength(enemy);
  const weaponAngle =
    enemy.aiState === 'hitstun'
      ? enemy.hitReactionWeaponAngle
      : enemy.aiState === 'windup'
        ? enemy.attackKind === 'heavy'
          ? -1.8
          : enemy.attackKind === 'antiAir'
            ? 0.1
            : -1.2
        : enemy.aiState === 'attack'
          ? enemy.attackKind === 'antiAir'
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
  const weaponHand = { x: x + 8, y: y - 56 };
  const weaponShoulder = { x: x - 8, y: y - 59 };
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
    limbSegment('combat-enemy-back-leg', { x: x - 7, y: y - 29 }, { x: x - 9, y }, 8, '#552c3a', {
      stroke: '#251824',
      lineWidth: 1.5,
    }),
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
      '#dce5e6',
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

  return items.map((item, index) =>
    Object.freeze({
      ...item,
      opacity: (item.opacity ?? 1) * opacity,
      lineWidth: (item.lineWidth ?? 1) * presentationScale,
      points: Object.freeze(
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
    }),
  );
}
