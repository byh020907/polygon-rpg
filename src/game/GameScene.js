import { sampleCombatTargetPose } from '../animation/CombatPoseLibrary.js';
import { sampleCharacterBonePose } from '../animation/CharacterBonePoseLibrary.js';
import { TwoBoneIKSolver } from '../animation/TwoBoneIKSolver.js';
import { CombatCommandController } from '../combat/CombatCommandController.js';
import { SpinContactConstraint } from '../combat/SpinContactConstraint.js';
import { MapRuntime } from './map/MapRuntime.js';
import { ACADEMY_VILLAGE_MAP } from './maps/academyVillage.js';

const CHARACTER_SPEED = 230;
const JUMP_SPEED = 470;
const GRAVITY = 1180;
const ROLL_DURATION_SECONDS = 0.42;
const ROLL_SPEED = 320;
const COMBAT_ENEMY_RESET_SECONDS = 1;
const MAX_JUGGLE_HITS = 6;
const MAX_JUGGLE_SECONDS = 3.2;
const LANDING_RECOVERY_SECONDS = 0.14;
const JUGGLE_GRAVITY_STEP = 0.3;
const ENEMY_ATTACK_PROFILES = Object.freeze({
  light: Object.freeze({
    windupSeconds: 0.24,
    attackSeconds: 0.16,
    recoverySeconds: 0.24,
    desiredRange: 46,
    attackRange: 52,
    verticalRange: 68,
    contactStart: 0.34,
    contactEnd: 0.76,
    damage: 8,
    guardable: true,
    knockbackVelocity: 110,
    knockbackDecayRate: 0.0067,
    blockstunSeconds: 0.12,
    blockStrength: 0.55,
    weaponLength: 96,
  }),
  heavy: Object.freeze({
    windupSeconds: 0.5,
    attackSeconds: 0.26,
    recoverySeconds: 0.58,
    desiredRange: 54,
    attackRange: 60,
    verticalRange: 68,
    contactStart: 0.48,
    contactEnd: 0.84,
    damage: 20,
    guardable: true,
    knockbackVelocity: 220,
    knockbackDecayRate: 0.015,
    blockstunSeconds: 0.24,
    blockStrength: 1,
    weaponLength: 110,
  }),
  antiAir: Object.freeze({
    windupSeconds: 0.32,
    attackSeconds: 0.2,
    recoverySeconds: 0.46,
    desiredRange: 52,
    attackRange: 58,
    verticalRange: 150,
    contactStart: 0.4,
    contactEnd: 0.78,
    damage: 14,
    guardable: false,
    knockbackVelocity: 155,
    knockbackDecayRate: 0.01,
    weaponLength: 230,
  }),
});
const ENEMY_HIT_REACTION_RECOVERY_SECONDS = 0.18;
const PLAYER_KNOCKBACK_STOP_SPEED = 4;
const ATTACK_HIT_PROFILES = Object.freeze({
  slash: Object.freeze({ start: 0.34, end: 0.7, damage: 12, range: 28, launchY: -90 }),
  heavy: Object.freeze({ start: 0.42, end: 0.72, damage: 22, range: 68, launchY: -150 }),
  thrust: Object.freeze({ start: 0.38, end: 0.72, damage: 15, range: 82, launchY: -80 }),
  rising: Object.freeze({
    start: 0.42,
    end: 0.76,
    damage: 18,
    range: 66,
    launchY: -470,
    juggleRole: 'launcher',
    relaunchSpeed: 310,
    floatSeconds: 0.16,
  }),
  spin: Object.freeze({
    start: 0.24,
    end: 0.84,
    damage: 8,
    range: 72,
    launchY: -70,
    relaunchSpeed: 260,
    floatSeconds: 0.08,
    hitPulses: Object.freeze([0.28, 0.5, 0.74]),
    contactSpacings: Object.freeze([23, 17, 5]),
  }),
  airSlash: Object.freeze({
    start: 0.34,
    end: 0.72,
    damage: 13,
    range: 70,
    launchY: -110,
    juggleRole: 'sustain',
    relaunchSpeed: 190,
    floatSeconds: 0.1,
  }),
  airHeavy: Object.freeze({
    start: 0.4,
    end: 0.78,
    damage: 26,
    range: 72,
    launchY: 300,
    juggleRole: 'finisher',
    groundBounce: true,
  }),
  airReturn: Object.freeze({
    start: 0.34,
    end: 0.7,
    damage: 15,
    range: 70,
    launchY: -90,
    juggleRole: 'sustain',
    relaunchSpeed: 170,
    floatSeconds: 0.09,
  }),
  airSpin: Object.freeze({
    start: 0.09,
    end: 0.2,
    damage: 20,
    range: 76,
    launchY: -150,
    juggleRole: 'sustain',
    relaunchSpeed: 250,
    floatSeconds: 0.17,
  }),
  airCross: Object.freeze({
    start: 0.38,
    end: 0.76,
    damage: 24,
    range: 74,
    launchY: 250,
    juggleRole: 'finisher',
  }),
});
const CHARACTER_RENDER_SCALE = 0.265;
const CHARACTER_CELL_SIZE = 48;
const CHARACTER_BOUNDARY_HALF_WIDTH = CHARACTER_CELL_SIZE / 2;
const CHARACTER_FOOT_OFFSET = 82;
const WORLD_HOURS_PER_SECOND = 0.04;
const ARM_IK_SOLVER = new TwoBoneIKSolver();
const CHARACTER_DEPTH_ITEM_ORDERS = Object.freeze({
  'shield-upper-arm': 10,
  'shield-forearm': 11,
  shield: 12,
  'shield-mark': 13,
  'sword-trail': 16.5,
  'sword-upper-arm': 17,
  'sword-forearm': 18,
  'sword-hilt': 19,
  'sword-blade': 20,
  'sword-shine': 21,
});
const SCALED_HEX_COLOR_CACHE = new Map();
const MAX_SCALED_HEX_COLOR_CACHE_ENTRIES = 512;

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothStep(amount) {
  const bounded = Math.max(0, Math.min(1, amount));
  return bounded * bounded * (3 - 2 * bounded);
}

function scaleHexColor(color, scale) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const scaleLevel = Math.max(0, Math.min(255, Math.round(scale * 255)));
  if (scaleLevel === 255) return color;
  const cacheKey = `${color}:${scaleLevel}`;
  const cached = SCALED_HEX_COLOR_CACHE.get(cacheKey);
  if (cached) return cached;
  const normalizedScale = scaleLevel / 255;
  const channels = [1, 3, 5].map((offset) =>
    Math.max(
      0,
      Math.min(
        255,
        Math.round(Number.parseInt(color.slice(offset, offset + 2), 16) * normalizedScale),
      ),
    ),
  );
  const result = `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  if (SCALED_HEX_COLOR_CACHE.size >= MAX_SCALED_HEX_COLOR_CACHE_ENTRIES) {
    SCALED_HEX_COLOR_CACHE.delete(SCALED_HEX_COLOR_CACHE.keys().next().value);
  }
  SCALED_HEX_COLOR_CACHE.set(cacheKey, result);
  return result;
}

function sampleCombatEnemyWeaponLength(enemy) {
  const attackProfile = ENEMY_ATTACK_PROFILES[enemy.attackKind];
  if (enemy.attackKind !== 'antiAir') return attackProfile.weaponLength;
  if (enemy.aiState === 'hitstun') return enemy.hitReactionWeaponLength;
  if (enemy.aiState === 'windup') {
    const windupProgress = 1 - enemy.aiSeconds / attackProfile.windupSeconds;
    return lerp(
      ENEMY_ATTACK_PROFILES.light.weaponLength,
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
      ENEMY_ATTACK_PROFILES.light.weaponLength,
      smoothStep(recoveryProgress),
    );
  }
  return ENEMY_ATTACK_PROFILES.light.weaponLength;
}

function lanePresentation(lane) {
  return {
    visualScale: lane.visualScale,
    renderOrder: lane.renderOrder + 0.5,
  };
}

function transformPoints(points, { x, y, rotation = 0, scaleX = 1, scaleY = 1 }) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return points.map((point) => {
    const scaledX = point.x * scaleX;
    const scaledY = point.y * scaleY;
    return Object.freeze({
      x: x + scaledX * cosine - scaledY * sine,
      y: y + scaledX * sine + scaledY * cosine,
    });
  });
}

function polygon(id, points, transform, fill, options = {}) {
  return Object.freeze({
    id,
    points: Object.freeze(transformPoints(points, transform)),
    fill,
    stroke: options.stroke ?? null,
    lineWidth: options.lineWidth ?? 1,
    opacity: options.opacity ?? 1,
    order: options.order,
  });
}

function limbSegment(id, start, end, width, fill, options = {}) {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const halfWidth = width / 2;
  return polygon(
    id,
    [
      { x: 0, y: -halfWidth },
      { x: length, y: -halfWidth },
      { x: length, y: halfWidth },
      { x: 0, y: halfWidth },
    ],
    { x: start.x, y: start.y, rotation: Math.atan2(end.y - start.y, end.x - start.x) },
    fill,
    options,
  );
}

function arcRibbonPoints(origin, startAngle, endAngle, innerRadius, outerRadius, segments = 7) {
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const angle = startAngle + (endAngle - startAngle) * progress;
    points.push({
      x: origin.x + Math.cos(angle) * outerRadius,
      y: origin.y + Math.sin(angle) * outerRadius,
    });
  }
  for (let index = segments; index >= 0; index -= 1) {
    const progress = index / segments;
    const angle = startAngle + (endAngle - startAngle) * progress;
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

function createCharacterItems(position, facing, targetPose, bonePose, renderScale, renderOrder) {
  const bodyX = position.x + targetPose.bodyOffset.x + bonePose.rootOffset.x;
  const bodyY = position.y + targetPose.bodyOffset.y + bonePose.rootOffset.y;
  const swordRotation = targetPose.swordAngle;
  const rightShoulder = { x: bodyX + 17, y: bodyY - 25 };
  const rightArm = ARM_IK_SOLVER.solve({
    root: rightShoulder,
    target: { x: bodyX + targetPose.handTarget.x, y: bodyY + targetPose.handTarget.y },
    upperLength: 38,
    lowerLength: 35,
    bendDirection: 1,
  });
  const leftShoulder = { x: bodyX - 17, y: bodyY - 24 };
  const leftArm = ARM_IK_SOLVER.solve({
    root: leftShoulder,
    target: { x: bodyX + targetPose.shieldTarget.x, y: bodyY + targetPose.shieldTarget.y },
    upperLength: 34,
    lowerLength: 31,
    bendDirection: -1,
  });
  const rearHip = { x: bodyX - 8, y: bodyY + 27 };
  const rearLeg = ARM_IK_SOLVER.solve({
    root: rearHip,
    target: {
      x: position.x + bonePose.rearFootTarget.x,
      y: position.y + bonePose.rearFootTarget.y,
    },
    upperLength: 28,
    lowerLength: 27,
    bendDirection: -1,
  });
  const leadHip = { x: bodyX + 8, y: bodyY + 27 };
  const leadLeg = ARM_IK_SOLVER.solve({
    root: leadHip,
    target: {
      x: position.x + bonePose.leadFootTarget.x,
      y: position.y + bonePose.leadFootTarget.y,
    },
    upperLength: 28,
    lowerLength: 27,
    bendDirection: 1,
  });
  const swordOrigin = rightArm.hand;
  const bladeOrigin = {
    x: swordOrigin.x + Math.cos(swordRotation) * 8,
    y: swordOrigin.y + Math.sin(swordRotation) * 8,
  };
  const trailItems = [
    polygon(
      'sword-trail',
      arcRibbonPoints(swordOrigin, swordRotation - targetPose.trailArc, swordRotation, 42, 111),
      { x: 0, y: 0 },
      '#bff8ef',
      { opacity: targetPose.trailOpacity * 0.5 },
    ),
  ];

  const items = [
    polygon('shadow', regularPolygon(35, 8, 12), { x: bodyX, y: position.y + 68 }, '#05080d', {
      opacity: 0.62,
    }),
    polygon(
      'cape',
      [
        { x: -16, y: -37 },
        { x: 12, y: -34 },
        { x: 18, y: 15 },
        { x: 8, y: 56 },
        { x: -3, y: 47 },
        { x: -14, y: 60 },
        { x: -20, y: 12 },
      ],
      {
        x: bodyX - 5,
        y: bodyY,
        rotation: -bonePose.capeLift * 0.045,
      },
      '#6d3043',
      { stroke: '#311b2b', lineWidth: 2 },
    ),
    polygon(
      'scarf-tail',
      [
        { x: 3, y: -4 },
        { x: -22 - bonePose.capeLift * 16, y: -1 - bonePose.capeLift * 5 },
        { x: -12, y: 7 },
        { x: 4, y: 5 },
      ],
      { x: bodyX - 8, y: bodyY - 35 },
      '#9d5261',
      { stroke: '#3f2432', lineWidth: 1.5 },
    ),
    limbSegment('back-thigh', rearLeg.root, rearLeg.elbow, 11, '#27364d', {
      stroke: '#121a29',
      lineWidth: 2,
    }),
    limbSegment('back-shin', rearLeg.elbow, rearLeg.hand, 8, '#31425c', {
      stroke: '#121a29',
      lineWidth: 2,
    }),
    limbSegment('front-thigh', leadLeg.root, leadLeg.elbow, 11, '#405779', {
      stroke: '#121a29',
      lineWidth: 2,
    }),
    limbSegment('front-shin', leadLeg.elbow, leadLeg.hand, 8, '#4c6688', {
      stroke: '#121a29',
      lineWidth: 2,
    }),
    polygon(
      'torso',
      [
        { x: -21, y: -36 },
        { x: 17, y: -38 },
        { x: 23, y: 13 },
        { x: 13, y: 34 },
        { x: -15, y: 32 },
        { x: -25, y: 9 },
      ],
      { x: bodyX, y: bodyY },
      '#47698f',
      { stroke: '#182538', lineWidth: 2 },
    ),
    polygon(
      'chest-plate',
      [
        { x: -14, y: -28 },
        { x: 13, y: -30 },
        { x: 17, y: 1 },
        { x: 7, y: 22 },
        { x: -12, y: 17 },
      ],
      { x: bodyX, y: bodyY },
      '#7198b8',
      { stroke: '#29445f', lineWidth: 1.5 },
    ),
    polygon(
      'belt',
      [
        { x: -20, y: -4 },
        { x: 20, y: -5 },
        { x: 20, y: 5 },
        { x: -20, y: 7 },
      ],
      { x: bodyX, y: bodyY + 27 },
      '#2a2130',
      { stroke: '#171525', lineWidth: 1.5 },
    ),
    limbSegment('shield-upper-arm', leftArm.root, leftArm.elbow, 10, '#b77b67', {
      stroke: '#442a30',
      lineWidth: 2,
    }),
    limbSegment('shield-forearm', leftArm.elbow, leftArm.hand, 8, '#cf8f78', {
      stroke: '#442a30',
      lineWidth: 2,
    }),
    polygon(
      'shield',
      [
        { x: -12, y: -29 },
        { x: 9, y: -32 },
        { x: 17, y: -2 },
        { x: 8, y: 28 },
        { x: -9, y: 23 },
        { x: -17, y: 0 },
      ],
      { x: leftArm.hand.x, y: leftArm.hand.y, rotation: -0.1 },
      '#9d5261',
      { stroke: '#342033', lineWidth: 3 },
    ),
    polygon(
      'shield-mark',
      [
        { x: 0, y: -17 },
        { x: 5, y: -5 },
        { x: 11, y: 0 },
        { x: 5, y: 6 },
        { x: 0, y: 18 },
        { x: -5, y: 6 },
        { x: -11, y: 0 },
        { x: -5, y: -5 },
      ],
      { x: leftArm.hand.x, y: leftArm.hand.y, rotation: -0.1 },
      '#d69a75',
      { stroke: '#5b3343', lineWidth: 1.5 },
    ),
    polygon(
      'head',
      regularPolygon(17, 21, 8, Math.PI / 8),
      { x: bodyX - 1, y: bodyY - 63, rotation: bonePose.headTilt },
      '#cf8f78',
      { stroke: '#3d2832', lineWidth: 2 },
    ),
    polygon(
      'helmet',
      [
        { x: -18, y: 5 },
        { x: -16, y: -16 },
        { x: -2, y: -24 },
        { x: 15, y: -18 },
        { x: 19, y: -3 },
        { x: 11, y: 4 },
        { x: -3, y: -1 },
      ],
      { x: bodyX - 1, y: bodyY - 66, rotation: bonePose.headTilt },
      '#374c68',
      { stroke: '#182538', lineWidth: 2 },
    ),
    polygon(
      'helmet-highlight',
      [
        { x: -1, y: -20 },
        { x: 9, y: -16 },
        { x: 14, y: -7 },
        { x: 5, y: -9 },
      ],
      { x: bodyX - 1, y: bodyY - 66, rotation: bonePose.headTilt },
      '#7ea2bd',
      { opacity: 0.9 },
    ),
    ...trailItems,
    limbSegment('sword-upper-arm', rightArm.root, rightArm.elbow, 10, '#ba7665', {
      stroke: '#422832',
      lineWidth: 2,
    }),
    limbSegment('sword-forearm', rightArm.elbow, rightArm.hand, 8, '#cf8f78', {
      stroke: '#422832',
      lineWidth: 2,
    }),
    polygon(
      'sword-hilt',
      [
        { x: -5, y: -12 },
        { x: 5, y: -12 },
        { x: 5, y: 13 },
        { x: -5, y: 13 },
      ],
      { x: swordOrigin.x, y: swordOrigin.y, rotation: swordRotation },
      '#d7a95d',
      { stroke: '#4b3526', lineWidth: 2 },
    ),
    polygon(
      'sword-blade',
      [
        { x: 0, y: -3 },
        { x: 100, y: -3 },
        { x: 126, y: 0 },
        { x: 100, y: 4 },
        { x: 0, y: 4 },
      ],
      { x: bladeOrigin.x, y: bladeOrigin.y, rotation: swordRotation },
      '#dce8e8',
      { stroke: '#456171', lineWidth: 2 },
    ),
    polygon(
      'sword-shine',
      [
        { x: 12, y: -2 },
        { x: 99, y: -2 },
        { x: 117, y: -0.5 },
        { x: 22, y: 0 },
      ],
      { x: bladeOrigin.x, y: bladeOrigin.y, rotation: swordRotation },
      '#ffffff',
      { opacity: 0.8 },
    ),
  ];

  return items.map((item, index) => {
    const depthGroup = item.id.startsWith('sword')
      ? 'sword'
      : item.id.startsWith('shield')
        ? 'shield'
        : null;
    const swordFrontAmount = (bonePose.depthPhase + 1) / 2;
    const frontAmount =
      depthGroup === 'sword'
        ? swordFrontAmount
        : depthGroup === 'shield'
          ? 1 - swordFrontAmount
          : 0.5;
    const depthOrderOffset = depthGroup ? (frontAmount - 0.5) * 30 : 0;
    const depthMagnitude = Math.abs(bonePose.depthPhase);
    const depthOpacity = depthGroup ? 1 - (1 - frontAmount) * 0.28 * depthMagnitude : 1;
    const depthBias = depthGroup === 'sword' ? bonePose.depthPhase : -bonePose.depthPhase;
    const depthColorScale = 1 - Math.max(0, -depthBias) * 0.16;
    const baseOrder = CHARACTER_DEPTH_ITEM_ORDERS[item.id] ?? item.order ?? index;
    return Object.freeze({
      ...item,
      renderOrder,
      order: baseOrder + depthOrderOffset,
      opacity: item.opacity * depthOpacity,
      fill: depthGroup ? scaleHexColor(item.fill, depthColorScale) : item.fill,
      lineWidth: item.lineWidth * renderScale,
      points: Object.freeze(
        item.points.map((point) => {
          const footY = position.y + CHARACTER_FOOT_OFFSET;
          const relativeX =
            (point.x - position.x) * (item.id === 'shadow' ? 1 : bonePose.bodyScaleX);
          const relativeY = (point.y - footY) * (item.id === 'shadow' ? 1 : targetPose.bodyScaleY);
          const lean = item.id === 'shadow' ? 0 : targetPose.bodyLean + bonePose.bodyLean;
          const posedX = position.x + relativeX * Math.cos(lean) - relativeY * Math.sin(lean);
          const posedY = footY + relativeX * Math.sin(lean) + relativeY * Math.cos(lean);
          const scaledX = position.x + (posedX - position.x) * renderScale;
          const scaledY = footY + (posedY - footY) * renderScale;
          return Object.freeze({
            x: facing >= 0 ? scaledX : position.x * 2 - scaledX,
            y: scaledY,
          });
        }),
      ),
    });
  });
}

function createBlockImpactItems(
  characterItems,
  facing,
  impactSeconds,
  impactStrength,
  renderOrder,
) {
  if (impactSeconds <= 0) return [];
  const shield = characterItems.find((item) => item.id === 'shield');
  if (!shield) return [];
  const progress = 1 - impactSeconds / 0.14;
  const opacity = Math.max(0, 1 - progress);
  const shieldBounds = shield.points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const center = {
    x: facing >= 0 ? shieldBounds.maxX : shieldBounds.minX,
    y: (shieldBounds.minY + shieldBounds.maxY) / 2,
  };
  const radius = lerp(7 + impactStrength * 3, 18 + impactStrength * 10, smoothStep(progress));
  const sparkAngles = impactStrength > 0.9 ? [-0.9, -0.45, 0, 0.45, 0.9] : [-0.7, 0, 0.7];
  const items = [
    polygon(
      'player-block-ring',
      regularPolygon(radius, radius, 10, Math.PI / 10),
      center,
      '#d9fff7',
      { opacity: opacity * 0.42 },
    ),
    ...sparkAngles.map((angle, index) => {
      const sparkAngle = facing < 0 ? Math.PI - angle : angle;
      return limbSegment(
        `player-block-spark-${index}`,
        center,
        {
          x:
            center.x +
            Math.cos(sparkAngle) *
              lerp(10 + impactStrength * 4, 27 + impactStrength * 12, progress),
          y:
            center.y +
            Math.sin(sparkAngle) *
              lerp(10 + impactStrength * 4, 27 + impactStrength * 12, progress),
        },
        3,
        '#f5d879',
        { opacity },
      );
    }),
  ];
  return items.map((item, index) => Object.freeze({ ...item, renderOrder, order: 100 + index }));
}

function createCombatEnemyItems(enemy, renderOrder) {
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
  const presentationScale = 0.48;
  const attackProfile = ENEMY_ATTACK_PROFILES[enemy.attackKind];
  const attackDuration = attackProfile.attackSeconds;
  const attackProgress = enemy.aiState === 'attack' ? 1 - enemy.aiSeconds / attackDuration : 0;
  const recoveryDuration = enemy.recoveryDurationSeconds;
  const recoveryProgress =
    enemy.aiState === 'recovery' && recoveryDuration > 0
      ? 1 - enemy.aiSeconds / recoveryDuration
      : 0;
  const weaponLength = sampleCombatEnemyWeaponLength(enemy);
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
          Math.min(0.42, ((weaponLength - ENEMY_ATTACK_PROFILES.light.weaponLength) / 134) * 0.42),
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

function timePhaseForHour(hour) {
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

function invertedDirection(direction) {
  return direction === 'back' ? 'front' : 'back';
}

export class GameScene {
  constructor({ mapDefinition = ACADEMY_VILLAGE_MAP } = {}) {
    this.combatCommands = new CombatCommandController();
    this.spinContactConstraint = new SpinContactConstraint({
      hitPulses: ATTACK_HIT_PROFILES.spin.hitPulses,
      contactSpacings: ATTACK_HIT_PROFILES.spin.contactSpacings,
    });
    this.mapRuntime = new MapRuntime(mapDefinition, {
      worldContext: { timePhase: 'day', weather: 'clear', storyFlags: {} },
    });
    this.reset();
  }

  reset() {
    this.worldTimeHours = 10;
    this.timePhase = timePhaseForHour(this.worldTimeHours);
    this.mapRuntime.setWorldContext({
      timePhase: this.timePhase,
      weather: 'clear',
      storyFlags: {},
    });
    const mapSnapshot = this.mapRuntime.reset();
    const spawn = mapSnapshot.spawn?.position ?? { x: 270, y: 350 };
    this.position = { ...spawn };
    this.previousPosition = { ...this.position };
    this.animationTime = 0;
    this.previousAnimationTime = 0;
    this.verticalVelocity = 0;
    this.airComboFloatSeconds = 0;
    this.airComboGravityScale = 1;
    this.airComboFacing = 0;
    this.landingRecoverySeconds = 0;
    this.isGrounded = true;
    this.jumpWasPressed = false;
    this.guardWasPressed = false;
    this.movementIntent = 0;
    this.rollState = null;
    this.hitStopSeconds = 0;
    this.playerHealth = 100;
    this.playerMaxHealth = 100;
    this.playerHitstunSeconds = 0;
    this.playerInvulnerableSeconds = 0;
    this.playerKoSeconds = 0;
    this.playerBlockImpactSeconds = 0;
    this.playerBlockImpactStrength = 0;
    this.playerBlockstunSeconds = 0;
    this.playerBlockstunDurationSeconds = 0;
    this.pendingPlayerKnockbackX = 0;
    this.pendingPlayerKnockbackDecayRate = 0.02;
    this.playerKnockbackVelocityX = 0;
    this.playerKnockbackDecayRate = 0.02;
    this.airHeavyConnectedSequence = 0;
    this.slamAttackerBouncePending = false;
    this.combatEnemy = null;
    this.lastHitMotionSequence = '';
    this.lastJumpSequence = 0;
    this.facing = mapSnapshot.spawn?.facing ?? 1;
    this.laneTransitionPresentation = null;
    this.characterLanePresentation = lanePresentation(mapSnapshot.lane);
    this.previousCharacterLanePresentation = { ...this.characterLanePresentation };
    this.combatCommands.reset();
    this.spinContactConstraint.reset();
    this.syncCombatEnemy();
  }

  toggleTimePhase() {
    this.worldTimeHours = this.timePhase === 'night' ? 10 : 21;
    this.updateTimePhase();
    return this.getWorldStatus();
  }

  updateTimePhase() {
    const nextPhase = timePhaseForHour(this.worldTimeHours);
    if (nextPhase === this.timePhase) return;
    this.timePhase = nextPhase;
    this.mapRuntime.setWorldContext({
      ...this.mapRuntime.getWorldContext(),
      timePhase: nextPhase,
    });
  }

  advanceWorldTime(deltaSeconds) {
    this.worldTimeHours = (this.worldTimeHours + deltaSeconds * WORLD_HOURS_PER_SECOND + 24) % 24;
    this.updateTimePhase();
  }

  canStartConnectionTransition() {
    if (this.mapRuntime.getTransition()) return false;
    const combatState = this.combatCommands.snapshot();
    return this.isGrounded && !this.rollState && combatState.id === 'idle';
  }

  beginConnectionTransition(connection) {
    const transition = this.mapRuntime.beginTransition(connection.id);
    this.laneTransitionPresentation = {
      startPosition: { ...this.position },
      destinationPosition: { ...transition.destinationPosition },
      from: { ...this.characterLanePresentation },
      to: {
        visualScale: transition.destinationLane.visualScale,
        renderOrder: transition.destinationLane.renderOrder + 0.5,
      },
    };
    this.verticalVelocity = 0;
    this.airComboFloatSeconds = 0;
    this.airComboGravityScale = 1;
    this.isGrounded = true;
    return true;
  }

  tryPortalTransition() {
    if (!this.canStartConnectionTransition()) return false;
    const lane = this.mapRuntime.getActiveLane();
    const connection = this.mapRuntime.findConnectionAt(
      { x: this.position.x, y: lane.groundY },
      { interactionId: 'dungeon-portal' },
    );
    return connection ? this.beginConnectionTransition(connection) : false;
  }

  tryLaneTransition(direction) {
    if (!this.canStartConnectionTransition()) return false;

    const lane = this.mapRuntime.getActiveLane();
    const connection = this.mapRuntime.findConnectionAt(
      { x: this.position.x, y: lane.groundY },
      { interactionId: 'lane-transition' },
    );
    if (!connection) return false;

    const location = this.mapRuntime.getActiveLocation();
    const fromActive =
      connection.from.chunkId === location.chunkId && connection.from.laneId === location.laneId;
    const effectiveDirection = fromActive
      ? connection.direction
      : invertedDirection(connection.direction);
    if (effectiveDirection !== direction) return false;
    return this.beginConnectionTransition(connection);
  }

  updateLaneTransition(deltaSeconds) {
    const presentation = this.laneTransitionPresentation;
    if (!presentation) return false;

    const { transition, completion } = this.mapRuntime.advanceTransition(deltaSeconds);
    const amount = smoothStep(transition.progress);
    this.position.x = lerp(
      presentation.startPosition.x,
      presentation.destinationPosition.x,
      amount,
    );
    this.position.y = lerp(
      presentation.startPosition.y,
      presentation.destinationPosition.y,
      amount,
    );
    this.characterLanePresentation = {
      visualScale: lerp(presentation.from.visualScale, presentation.to.visualScale, amount),
      renderOrder: lerp(presentation.from.renderOrder, presentation.to.renderOrder, amount),
    };

    if (!completion) return true;
    this.position = { ...completion.position };
    this.characterLanePresentation = { ...presentation.to };
    this.laneTransitionPresentation = null;
    this.syncCombatEnemy();
    return true;
  }

  tryStartRoll(direction) {
    if (
      this.rollState ||
      !this.isGrounded ||
      direction === 0 ||
      this.combatCommands.snapshot().id !== 'idle'
    ) {
      return false;
    }

    this.rollState = {
      direction: Math.sign(direction),
      elapsedSeconds: 0,
      durationSeconds: ROLL_DURATION_SECONDS,
    };
    this.facing = this.rollState.direction;
    return true;
  }

  updateRoll(deltaSeconds) {
    if (!this.rollState) return false;
    const activeRoll = this.rollState;
    const progress = Math.min(1, activeRoll.elapsedSeconds / activeRoll.durationSeconds);
    const speedScale = Math.sin(progress * Math.PI) * (Math.PI / 2);
    activeRoll.elapsedSeconds += deltaSeconds;
    this.position.x += activeRoll.direction * ROLL_SPEED * speedScale * deltaSeconds;
    if (activeRoll.elapsedSeconds >= activeRoll.durationSeconds) this.rollState = null;
    return true;
  }

  syncCombatEnemy() {
    this.slamAttackerBouncePending = false;
    this.spinContactConstraint.reset();
    const snapshot = this.mapRuntime.getResolvedSnapshot();
    const entity = snapshot.entities.find((candidate) => candidate.kind === 'combat-test-mob');
    if (!entity) {
      this.combatEnemy = null;
      this.lastHitMotionSequence = '';
      return;
    }

    const maxHealth = Number.isFinite(entity.maxHealth) ? Math.max(1, entity.maxHealth) : 100;
    this.combatEnemy = {
      id: entity.id,
      position: {
        x: entity.position?.x ?? 680,
        y: entity.position?.y ?? snapshot.lane.groundY,
      },
      groundY: snapshot.lane.groundY,
      velocityX: 0,
      velocityY: 0,
      rotation: 0,
      angularVelocity: 0,
      health: maxHealth,
      maxHealth,
      hitFlashSeconds: 0,
      resetSeconds: 0,
      juggleHits: 0,
      juggleSeconds: 0,
      juggleFloatSeconds: 0,
      juggleGravityScale: 1,
      juggleLocked: false,
      groundBouncePending: false,
      groundBounceDelaySeconds: 0,
      groundImpactSeconds: 0,
      aiState: 'idle',
      aiSeconds: 0.45,
      patternIndex: 0,
      attackConnected: false,
      hitstunSeconds: 0,
      attackKind: 'light',
      facing: -1,
      attackFacing: -1,
      recoveryStartAngle: -0.65,
      recoveryBodyStartRotation: 0,
      recoveryDurationSeconds: 0.24,
      recoverySource: 'attack',
      recoveryAdvanceDeferred: false,
      recoveryCompletionPending: false,
      hitReactionWeaponAngle: -0.65,
      hitReactionWeaponLength: ENEMY_ATTACK_PROFILES.light.weaponLength,
    };
    this.lastHitMotionSequence = '';
  }

  startCombatEnemyRecovery({
    source,
    durationSeconds,
    weaponStartAngle,
    bodyStartRotation,
    deferAdvance = false,
  }) {
    const enemy = this.combatEnemy;
    if (!enemy) return;
    enemy.aiState = 'recovery';
    enemy.aiSeconds = durationSeconds;
    enemy.recoverySource = source;
    enemy.recoveryDurationSeconds = durationSeconds;
    enemy.recoveryStartAngle = weaponStartAngle;
    enemy.recoveryBodyStartRotation = bodyStartRotation;
    enemy.recoveryAdvanceDeferred = deferAdvance;
    enemy.recoveryCompletionPending = false;
  }

  updateCombatEnemy(deltaSeconds) {
    const enemy = this.combatEnemy;
    if (!enemy) return;

    enemy.hitFlashSeconds = Math.max(0, enemy.hitFlashSeconds - deltaSeconds);
    const previousHitstun = enemy.hitstunSeconds;
    enemy.hitstunSeconds = Math.max(0, enemy.hitstunSeconds - deltaSeconds);
    if (previousHitstun > 0 && enemy.hitstunSeconds === 0) {
      this.startCombatEnemyRecovery({
        source: 'hitReaction',
        durationSeconds: ENEMY_HIT_REACTION_RECOVERY_SECONDS,
        weaponStartAngle: enemy.hitReactionWeaponAngle,
        bodyStartRotation: enemy.rotation,
        deferAdvance: true,
      });
    }
    enemy.groundImpactSeconds = Math.max(0, enemy.groundImpactSeconds - deltaSeconds);
    if (enemy.health <= 0) {
      enemy.resetSeconds = Math.max(0, enemy.resetSeconds - deltaSeconds);
      if (enemy.resetSeconds <= 0) this.syncCombatEnemy();
      return;
    }

    if (enemy.groundBounceDelaySeconds > 0) {
      enemy.groundBounceDelaySeconds = Math.max(0, enemy.groundBounceDelaySeconds - deltaSeconds);
      enemy.position.y = enemy.groundY;
      enemy.velocityY = 0;
      if (enemy.groundBounceDelaySeconds === 0) {
        enemy.velocityY = -360;
        enemy.juggleLocked = false;
        enemy.juggleFloatSeconds = 0.07;
        if (this.slamAttackerBouncePending) {
          this.slamAttackerBouncePending = false;
          this.position.y = enemy.groundY - CHARACTER_FOOT_OFFSET;
          this.verticalVelocity = -360;
          this.isGrounded = false;
          this.airComboFloatSeconds = 0.07;
          this.airComboGravityScale = enemy.juggleGravityScale;
        }
      }
      return;
    }
    const enemyAirborne = enemy.position.y < enemy.groundY;
    if (enemyAirborne) {
      enemy.juggleSeconds += deltaSeconds;
      if (enemy.juggleSeconds >= MAX_JUGGLE_SECONDS) {
        enemy.juggleLocked = true;
        enemy.juggleFloatSeconds = 0;
        enemy.velocityY = Math.max(enemy.velocityY, 220);
      }
    }
    enemy.juggleFloatSeconds = Math.max(0, enemy.juggleFloatSeconds - deltaSeconds);
    const gravityMultiplier =
      enemy.juggleFloatSeconds > 0 ? 0.08 : enemy.juggleLocked ? 2.8 : enemy.juggleGravityScale;
    enemy.velocityY += GRAVITY * gravityMultiplier * deltaSeconds;
    enemy.position.x += enemy.velocityX * deltaSeconds;
    enemy.position.y += enemy.velocityY * deltaSeconds;
    enemy.velocityX *= Math.pow(0.08, deltaSeconds);
    enemy.rotation += enemy.angularVelocity * deltaSeconds;
    enemy.angularVelocity *= Math.pow(0.06, deltaSeconds);
    if (enemy.position.y >= enemy.groundY) {
      enemy.position.y = enemy.groundY;
      enemy.velocityY = 0;
      if (enemy.groundBouncePending && enemy.juggleHits < MAX_JUGGLE_HITS) {
        enemy.groundBouncePending = false;
        enemy.groundBounceDelaySeconds = 0.07;
        enemy.groundImpactSeconds = 0.22;
        enemy.rotation = this.facing * 0.42;
        return;
      }
      enemy.juggleHits = 0;
      enemy.juggleSeconds = 0;
      enemy.juggleFloatSeconds = 0;
      enemy.juggleGravityScale = 1;
      enemy.juggleLocked = false;
      enemy.rotation = 0;
      enemy.angularVelocity = 0;
    }
    enemy.position.x = Math.max(48, Math.min(912, enemy.position.x));
    enemy.rotation = Math.max(-0.32, Math.min(0.32, enemy.velocityX / 420));
  }

  updateCombatEnemyCombat(deltaSeconds) {
    const enemy = this.combatEnemy;
    if (
      !enemy ||
      enemy.health <= 0 ||
      enemy.position.y < enemy.groundY ||
      enemy.juggleLocked ||
      enemy.hitstunSeconds > 0
    )
      return;
    const distance = this.position.x - enemy.position.x;
    const absoluteDistance = Math.abs(distance);
    if (enemy.aiState === 'recovery' && enemy.recoveryAdvanceDeferred) {
      enemy.recoveryAdvanceDeferred = false;
      return;
    }
    enemy.aiSeconds = Math.max(0, enemy.aiSeconds - deltaSeconds);
    if (distance !== 0) enemy.facing = Math.sign(distance);

    if (enemy.aiState === 'approach') {
      enemy.attackKind = !this.isGrounded
        ? 'antiAir'
        : enemy.patternIndex % 2 === 0
          ? 'light'
          : 'heavy';
      const attackProfile = ENEMY_ATTACK_PROFILES[enemy.attackKind];
      const desiredRange = attackProfile.desiredRange;
      if (absoluteDistance <= desiredRange) {
        enemy.aiState = 'windup';
        enemy.attackFacing = enemy.facing;
        enemy.aiSeconds = attackProfile.windupSeconds;
        enemy.attackConnected = false;
      } else {
        enemy.position.x += Math.sign(distance) * 78 * deltaSeconds;
      }
      return;
    }
    if (enemy.aiState === 'windup' && enemy.aiSeconds === 0) {
      enemy.aiState = 'attack';
      enemy.aiSeconds = ENEMY_ATTACK_PROFILES[enemy.attackKind].attackSeconds;
      return;
    }
    if (enemy.aiState === 'attack') {
      const attackProfile = ENEMY_ATTACK_PROFILES[enemy.attackKind];
      const attackDuration = attackProfile.attackSeconds;
      const attackProgress = 1 - enemy.aiSeconds / attackDuration;
      const verticalDistance = Math.abs(
        enemy.position.y - (this.position.y + CHARACTER_FOOT_OFFSET),
      );
      const attackRange = attackProfile.attackRange;
      const verticalRange = attackProfile.verticalRange;
      const contactStart = attackProfile.contactStart;
      const contactEnd = attackProfile.contactEnd;
      const forwardDistance = distance * enemy.attackFacing;
      if (
        !enemy.attackConnected &&
        attackProgress >= contactStart &&
        attackProgress <= contactEnd &&
        forwardDistance >= 0 &&
        forwardDistance <= attackRange &&
        verticalDistance <= verticalRange &&
        (enemy.attackKind !== 'antiAir' || verticalDistance >= 25)
      ) {
        enemy.attackConnected = true;
        const rollProgress = this.rollState
          ? this.rollState.elapsedSeconds / this.rollState.durationSeconds
          : null;
        const rollInvulnerable =
          rollProgress !== null && rollProgress >= 0.12 && rollProgress <= 0.62;
        if (!rollInvulnerable && this.playerInvulnerableSeconds <= 0) {
          const enemyInFront = -distance * this.facing > 0;
          if (
            attackProfile.guardable &&
            this.isGrounded &&
            enemyInFront &&
            this.combatCommands.snapshot().id === 'guard'
          ) {
            enemy.velocityX = -Math.sign(distance) * 90;
            this.playerBlockImpactSeconds = 0.14;
            this.playerBlockImpactStrength = attackProfile.blockStrength;
            this.playerBlockstunSeconds = Math.max(
              this.playerBlockstunSeconds,
              attackProfile.blockstunSeconds,
            );
            this.playerBlockstunDurationSeconds = attackProfile.blockstunSeconds;
            this.hitStopSeconds = Math.max(this.hitStopSeconds, 0.04);
          } else {
            this.playerHealth = Math.max(0, this.playerHealth - attackProfile.damage);
            this.pendingPlayerKnockbackX = Math.sign(distance) * attackProfile.knockbackVelocity;
            this.pendingPlayerKnockbackDecayRate = attackProfile.knockbackDecayRate;
            this.playerHitstunSeconds = 0.22;
            this.playerInvulnerableSeconds = 0.38;
            this.hitStopSeconds = Math.max(
              this.hitStopSeconds,
              enemy.attackKind === 'heavy' ? 0.05 : 0.035,
            );
            this.combatCommands.cancelForJump();
            this.rollState = null;
            if (this.playerHealth === 0) this.playerKoSeconds = 1;
          }
        }
      }
      if (enemy.aiSeconds === 0) {
        this.startCombatEnemyRecovery({
          source: 'attack',
          durationSeconds: attackProfile.recoverySeconds,
          weaponStartAngle: enemy.attackKind === 'antiAir' ? -2.9 : 0.6,
          bodyStartRotation: enemy.rotation + 0.28,
        });
      }
      return;
    }
    if (enemy.aiState === 'guard' || enemy.aiState === 'evade' || enemy.aiState === 'recovery') {
      if (enemy.aiState === 'evade') enemy.position.x -= Math.sign(distance) * 110 * deltaSeconds;
      if (enemy.aiSeconds > 0) return;
      if (enemy.aiState === 'recovery' && !enemy.recoveryCompletionPending) {
        enemy.recoveryCompletionPending = true;
        return;
      }
      enemy.aiState = 'idle';
      enemy.aiSeconds = 0.3;
      return;
    }
    if (enemy.aiSeconds > 0) return;
    enemy.patternIndex += 1;
    const playerMotion = this.combatCommands.snapshot().id;
    if (!['idle', 'guard'].includes(playerMotion) && absoluteDistance < 130) {
      enemy.aiState = enemy.patternIndex % 3 === 0 ? 'evade' : 'guard';
      enemy.aiSeconds = enemy.aiState === 'guard' ? 0.45 : 0.28;
    } else {
      enemy.aiState = 'approach';
    }
  }

  updateSpinContactConstraint(combatState, deltaSeconds) {
    const enemy = this.combatEnemy;
    if (!enemy || enemy.health <= 0) {
      this.spinContactConstraint.reset();
      return;
    }
    const result = this.spinContactConstraint.update({
      motionState: combatState,
      actorX: this.position.x,
      targetX: enemy.position.x,
      facing: this.facing,
      deltaSeconds,
    });
    enemy.position.x = result.targetX;
    if (result.active) enemy.velocityX = 0;
    else if (result.releaseVelocityX !== 0) enemy.velocityX = result.releaseVelocityX;
  }

  resolveCombatEnemyHit(combatState) {
    const enemy = this.combatEnemy;
    const profile = ATTACK_HIT_PROFILES[combatState.id];
    if (
      !enemy ||
      enemy.health <= 0 ||
      this.playerHealth <= 0 ||
      this.playerHitstunSeconds > 0 ||
      this.playerBlockstunSeconds > 0 ||
      !profile ||
      (enemy.juggleLocked && enemy.position.y < enemy.groundY) ||
      combatState.progress < profile.start ||
      combatState.progress > profile.end
    ) {
      return false;
    }

    const deltaX = enemy.position.x - this.position.x;
    const playerFootY = this.position.y + CHARACTER_FOOT_OFFSET;
    const forwardDistance = deltaX * this.facing;
    if (
      forwardDistance < -18 ||
      forwardDistance > profile.range ||
      Math.abs(enemy.position.y - playerFootY) > 112
    ) {
      return false;
    }

    const pulseIndex = profile.hitPulses
      ? profile.hitPulses.reduce(
          (latest, pulse, index) => (combatState.progress >= pulse ? index : latest),
          -1,
        )
      : 0;
    if (pulseIndex < 0) return false;
    const hitKey = `${combatState.sequence}:${pulseIndex}`;
    if (hitKey === this.lastHitMotionSequence) return false;
    this.lastHitMotionSequence = hitKey;
    if (enemy.aiState === 'evade') return false;
    if (enemy.aiState === 'guard' && enemy.position.y >= enemy.groundY) {
      enemy.hitFlashSeconds = 0.08;
      this.startCombatEnemyRecovery({
        source: 'guard',
        durationSeconds: 0.24,
        weaponStartAngle: -0.65,
        bodyStartRotation: enemy.rotation,
      });
      return true;
    }
    const enemyAirborne = enemy.position.y < enemy.groundY;
    const finalPulse = !profile.hitPulses || pulseIndex === profile.hitPulses.length - 1;
    const juggleRole =
      profile.juggleRole ?? (enemyAirborne ? 'sustain' : finalPulse ? 'launcher' : null);
    const damageScale = enemyAirborne ? Math.max(0.4, 1 - enemy.juggleHits * 0.1) : 1;
    const damage = Math.max(1, Math.round(profile.damage * damageScale));
    enemy.health = Math.max(0, enemy.health - damage);
    enemy.hitstunSeconds = Math.max(enemy.hitstunSeconds, 0.16 + damage * 0.008);
    enemy.hitReactionWeaponLength = sampleCombatEnemyWeaponLength(enemy);
    enemy.hitReactionWeaponAngle =
      profile.damage >= 22 ? 0.35 : profile.launchY < -300 ? -1.1 : 0.2;
    enemy.rotation = this.facing * 0.18;
    enemy.aiState = 'hitstun';
    enemy.aiSeconds = 0;
    enemy.attackConnected = false;
    const chainConfirmed = Boolean(combatState.queuedMotion);
    const spinPulseHolding = Boolean(profile.hitPulses) && !finalPulse;
    const hitVelocityX = this.facing * (chainConfirmed ? 18 : profile.damage * 8 + 45);
    enemy.velocityX = spinPulseHolding ? 0 : hitVelocityX;
    if (combatState.id === 'spin' && finalPulse) {
      this.spinContactConstraint.queueRelease({ velocityX: hitVelocityX });
      enemy.velocityX = 0;
    }
    if (chainConfirmed && !combatState.id.startsWith('air')) {
      const forwardGap = (enemy.position.x - this.position.x) * this.facing;
      if (forwardGap > 42) this.position.x += this.facing * Math.min(22, forwardGap - 42);
    }
    enemy.angularVelocity =
      this.facing *
      (combatState.sequence % 2 === 0 ? -2.8 : 2.8) *
      (juggleRole === 'finisher' ? 1.4 : 1);
    enemy.hitFlashSeconds = 0.12;
    this.hitStopSeconds = Math.max(
      this.hitStopSeconds,
      profile.damage >= 20 || juggleRole === 'finisher' ? 0.05 : 0.035,
    );
    if (juggleRole === 'finisher') {
      enemy.juggleHits = Math.max(1, enemy.juggleHits + 1);
      enemy.juggleLocked = true;
      enemy.juggleFloatSeconds = 0;
      enemy.juggleGravityScale = 2.8;
      enemy.velocityY = Math.max(profile.launchY, 220);
      enemy.groundBouncePending = profile.groundBounce === true;
      if (profile.groundBounce === true && combatState.id.startsWith('air')) {
        enemy.position.x = this.position.x + this.facing * 30;
        if (enemy.position.y < enemy.groundY) enemy.position.y += 15;
        this.airComboFacing = this.facing;
        this.airHeavyConnectedSequence = combatState.sequence;
        this.verticalVelocity = enemy.velocityY;
        this.airComboFloatSeconds = 0;
        this.airComboGravityScale = 1;
        this.slamAttackerBouncePending = true;
      } else if (combatState.id.startsWith('air')) {
        this.airComboFloatSeconds = 0;
        this.airComboGravityScale = 1;
      }
    } else if (juggleRole) {
      const nextJuggleHits = enemyAirborne ? enemy.juggleHits + 1 : 1;
      enemy.juggleHits = nextJuggleHits;
      enemy.juggleSeconds = enemyAirborne ? enemy.juggleSeconds : 0;
      enemy.juggleGravityScale = 1 + nextJuggleHits * JUGGLE_GRAVITY_STEP;
      if (nextJuggleHits >= MAX_JUGGLE_HITS) {
        enemy.juggleLocked = true;
        enemy.juggleFloatSeconds = 0;
        enemy.juggleGravityScale = 2.8;
        enemy.velocityY = Math.max(enemy.velocityY, 220);
        if (combatState.id.startsWith('air')) {
          this.airComboFloatSeconds = 0;
          this.airComboGravityScale = 1;
        }
      } else {
        const relaunchSpeed = Math.max(
          90,
          (profile.relaunchSpeed ?? Math.abs(profile.launchY)) - (nextJuggleHits - 1) * 24,
        );
        enemy.velocityY = -relaunchSpeed;
        enemy.juggleFloatSeconds = Math.max(
          0.06,
          (profile.floatSeconds ?? 0.11) - (nextJuggleHits - 1) * 0.012,
        );
        if (combatState.id.startsWith('air')) {
          if (this.airComboFacing === 0) this.airComboFacing = this.facing;
          this.verticalVelocity = enemy.velocityY;
          this.airComboFloatSeconds = enemy.juggleFloatSeconds;
          this.airComboGravityScale = enemy.juggleGravityScale;
          const comboFacing = this.airComboFacing || this.facing;
          const forwardGap = (enemy.position.x - this.position.x) * comboFacing;
          if (forwardGap > 44) {
            this.position.x += comboFacing * Math.min(32, forwardGap - 44);
          }
        }
      }
    } else {
      enemy.velocityY = profile.hitPulses && finalPulse ? -260 : profile.launchY;
    }
    if (enemy.health <= 0) enemy.resetSeconds = COMBAT_ENEMY_RESET_SECONDS;
    return true;
  }

  update(deltaSeconds, inputSnapshot, simulationSettings = {}) {
    const animationSpeed = Number.isFinite(simulationSettings.animationSpeed)
      ? Math.max(0, simulationSettings.animationSpeed)
      : 1;
    this.previousPosition = { ...this.position };
    this.previousAnimationTime = this.animationTime;
    this.previousCharacterLanePresentation = { ...this.characterLanePresentation };
    if (this.hitStopSeconds > 0) {
      this.hitStopSeconds = Math.max(0, this.hitStopSeconds - deltaSeconds);
      if (this.hitStopSeconds === 0 && this.pendingPlayerKnockbackX !== 0) {
        this.playerKnockbackVelocityX = this.pendingPlayerKnockbackX;
        this.playerKnockbackDecayRate = this.pendingPlayerKnockbackDecayRate;
        this.pendingPlayerKnockbackX = 0;
      }
      return;
    }
    this.advanceWorldTime(deltaSeconds);
    this.playerHitstunSeconds = Math.max(0, this.playerHitstunSeconds - deltaSeconds);
    this.playerInvulnerableSeconds = Math.max(0, this.playerInvulnerableSeconds - deltaSeconds);
    this.playerKoSeconds = Math.max(0, this.playerKoSeconds - deltaSeconds);
    this.playerBlockImpactSeconds = Math.max(0, this.playerBlockImpactSeconds - deltaSeconds);
    this.playerBlockstunSeconds = Math.max(0, this.playerBlockstunSeconds - deltaSeconds);
    if (this.playerHealth === 0 && this.playerKoSeconds === 0) {
      this.playerHealth = this.playerMaxHealth;
      this.position = {
        x: 164,
        y: this.mapRuntime.getActiveLane().groundY - CHARACTER_FOOT_OFFSET,
      };
      this.previousPosition = { ...this.position };
      this.verticalVelocity = 0;
      this.pendingPlayerKnockbackX = 0;
      this.playerKnockbackVelocityX = 0;
      this.playerBlockstunSeconds = 0;
      this.playerBlockImpactSeconds = 0;
      this.isGrounded = true;
      this.syncCombatEnemy();
    }
    this.landingRecoverySeconds = Math.max(0, this.landingRecoverySeconds - deltaSeconds);
    const wasGrounded = this.isGrounded;

    const controlsLocked =
      this.playerHitstunSeconds > 0 || this.playerBlockstunSeconds > 0 || this.playerHealth === 0;
    const horizontal = controlsLocked
      ? 0
      : Number(inputSnapshot.right) - Number(inputSnapshot.left);
    const jumpPressed = controlsLocked ? false : Boolean(inputSnapshot.jump);
    const guardPressed = controlsLocked ? false : Boolean(inputSnapshot.guard);
    const jumpEdge = jumpPressed && !this.jumpWasPressed;
    const guardEdge = guardPressed && !this.guardWasPressed;
    if (jumpEdge && !this.tryPortalTransition()) this.tryLaneTransition('back');
    if (guardEdge && !this.tryLaneTransition('front')) this.tryStartRoll(horizontal);
    const isTransitioning = this.mapRuntime.getTransition() !== null;
    const isRolling = this.rollState !== null;
    const jumpSequence = inputSnapshot.jumpSequence;
    const jumpIssued = controlsLocked
      ? false
      : Number.isSafeInteger(jumpSequence)
        ? jumpSequence > this.lastJumpSequence
        : jumpPressed && !this.jumpWasPressed;
    const currentCombatState = this.combatCommands.snapshot();
    if (
      !isTransitioning &&
      !isRolling &&
      jumpIssued &&
      this.isGrounded &&
      currentCombatState.canJump
    ) {
      this.combatCommands.cancelForJump();
      this.verticalVelocity = -JUMP_SPEED;
      this.airComboFloatSeconds = 0;
      this.airComboGravityScale = 1;
      this.isGrounded = false;
    }
    const combatState = this.combatCommands.update(deltaSeconds * animationSpeed, inputSnapshot, {
      acceptCommands: !isTransitioning && !isRolling && !controlsLocked,
      isAirborne: !this.isGrounded,
      allowGuard: this.isGrounded,
    });
    if (
      combatState.id === 'airHeavy' &&
      combatState.sequence !== this.airHeavyConnectedSequence &&
      combatState.progress >= 0.3 &&
      !this.isGrounded
    ) {
      this.verticalVelocity = Math.max(this.verticalVelocity, 300);
    }

    this.movementIntent = isTransitioning ? 0 : horizontal;
    this.jumpWasPressed = jumpPressed;
    this.guardWasPressed = guardPressed;
    if (Number.isSafeInteger(jumpSequence)) this.lastJumpSequence = jumpSequence;
    this.updateCombatEnemy(deltaSeconds);
    this.updateSpinContactConstraint(combatState, deltaSeconds);
    this.updateCombatEnemyCombat(deltaSeconds);
    this.resolveCombatEnemyHit(combatState);

    if (isTransitioning) {
      this.updateLaneTransition(deltaSeconds);
      this.animationTime += deltaSeconds * animationSpeed * 0.35;
      return;
    }

    if (isRolling) {
      this.updateRoll(deltaSeconds);
      const activeLane = this.mapRuntime.getActiveLane();
      const movementBounds = activeLane.movementBounds ?? {
        minX: CHARACTER_BOUNDARY_HALF_WIDTH,
        maxX: ACADEMY_VILLAGE_MAP.worldSize.width - CHARACTER_BOUNDARY_HALF_WIDTH,
      };
      this.position.x = Math.max(
        movementBounds.minX,
        Math.min(movementBounds.maxX, this.position.x),
      );
      this.animationTime += deltaSeconds * animationSpeed * 1.8;
      return;
    }

    if (!(combatState.id.startsWith('air') && this.airComboFacing !== 0) && horizontal !== 0) {
      this.facing = Math.sign(horizontal);
    }
    this.position.x += horizontal * CHARACTER_SPEED * combatState.movementScale * deltaSeconds;
    this.position.x += this.playerKnockbackVelocityX * deltaSeconds;
    this.playerKnockbackVelocityX *= Math.pow(this.playerKnockbackDecayRate, deltaSeconds);
    if (Math.abs(this.playerKnockbackVelocityX) < PLAYER_KNOCKBACK_STOP_SPEED) {
      this.playerKnockbackVelocityX = 0;
    }
    if (
      this.combatEnemy &&
      (this.slamAttackerBouncePending || this.combatEnemy.groundBounceDelaySeconds > 0)
    ) {
      const comboFacing = this.airComboFacing || this.facing;
      this.position.x = this.combatEnemy.position.x - comboFacing * 30;
      this.facing = comboFacing;
    }
    if (
      combatState.id.startsWith('air') &&
      this.combatEnemy &&
      this.combatEnemy.position.y < this.combatEnemy.groundY &&
      !this.combatEnemy.juggleLocked
    ) {
      const comboFacing = this.airComboFacing || this.facing;
      const targetGap = (this.combatEnemy.position.x - this.position.x) * comboFacing;
      if (targetGap < 18) this.position.x = this.combatEnemy.position.x - comboFacing * 18;
    }

    const activeLane = this.mapRuntime.getActiveLane();
    const playerGroundY = activeLane.groundY - CHARACTER_FOOT_OFFSET;
    this.airComboFloatSeconds = Math.max(0, this.airComboFloatSeconds - deltaSeconds);
    const playerGravityMultiplier =
      this.airComboFloatSeconds > 0 ? 0.08 : this.airComboGravityScale;
    this.verticalVelocity += GRAVITY * playerGravityMultiplier * deltaSeconds;
    this.position.y += this.verticalVelocity * deltaSeconds;
    if (this.position.y >= playerGroundY) {
      this.position.y = playerGroundY;
      this.verticalVelocity = 0;
      this.airComboFloatSeconds = 0;
      this.airComboGravityScale = 1;
      if (!this.slamAttackerBouncePending && !(this.combatEnemy?.groundBounceDelaySeconds > 0)) {
        this.airComboFacing = 0;
      }
      this.isGrounded = true;
      if (!wasGrounded) this.landingRecoverySeconds = LANDING_RECOVERY_SECONDS;
    }

    const movementBounds = activeLane.movementBounds ?? {
      minX: CHARACTER_BOUNDARY_HALF_WIDTH,
      maxX: ACADEMY_VILLAGE_MAP.worldSize.width - CHARACTER_BOUNDARY_HALF_WIDTH,
    };
    this.position.x = Math.max(movementBounds.minX, Math.min(movementBounds.maxX, this.position.x));
    this.animationTime += deltaSeconds * animationSpeed * (1 + Math.abs(horizontal) * 0.65);
  }

  getWorldStatus() {
    const map = this.mapRuntime.getResolvedMap();
    const lane = this.mapRuntime.getActiveLane();
    const inTrainingDungeon = this.mapRuntime.getActiveLocation().chunkId === 'combat-test-dungeon';
    return Object.freeze({
      areaName: `${map.name} · ${lane.label}`,
      objective: inTrainingDungeon
        ? 'AS로 띄운 뒤 ↑+방향+공격으로 추격해 공중 AA/AS/SA를 이어보세요.'
        : '광장 왼쪽 포탈에서 ↑를 눌러 전투 실험 던전에 입장하세요.',
      timePhase: this.timePhase,
      timeLabel: this.timePhase === 'night' ? '밤' : '낮',
    });
  }

  createRenderFrame(interpolationAlpha) {
    const renderPosition = Object.freeze({
      x: lerp(this.previousPosition.x, this.position.x, interpolationAlpha),
      y: lerp(this.previousPosition.y, this.position.y, interpolationAlpha),
    });
    const renderAnimationTime = lerp(
      this.previousAnimationTime,
      this.animationTime,
      interpolationAlpha,
    );
    const combatState = this.combatCommands.snapshot();
    const poseCombatState =
      this.playerBlockstunSeconds > 0
        ? Object.freeze({
            ...combatState,
            id: 'guard',
            label: '방어 반동',
            progress: 0,
            phase: 'guard',
          })
        : combatState;
    const targetPose = sampleCombatTargetPose(poseCombatState);
    const bonePose = sampleCharacterBonePose({
      animationTime: renderAnimationTime,
      movementIntent: this.movementIntent,
      isGrounded: this.isGrounded,
      verticalVelocity: this.verticalVelocity,
      landingRecovery: this.landingRecoverySeconds / LANDING_RECOVERY_SECONDS,
      hitstunProgress: this.playerHitstunSeconds / 0.22,
      blockstunProgress:
        this.playerBlockstunDurationSeconds > 0
          ? this.playerBlockstunSeconds / this.playerBlockstunDurationSeconds
          : 0,
      blockStrength: this.playerBlockImpactStrength,
      knockedOut: this.playerHealth === 0,
      rollProgress: this.rollState
        ? this.rollState.elapsedSeconds / this.rollState.durationSeconds
        : null,
      motionState: poseCombatState,
    });
    const map = this.mapRuntime.getResolvedMap();
    const mapSnapshot = this.mapRuntime.getResolvedSnapshot();
    const activeLane = mapSnapshot.lane;
    const laneVisualScale = lerp(
      this.previousCharacterLanePresentation.visualScale,
      this.characterLanePresentation.visualScale,
      interpolationAlpha,
    );
    const characterRenderScale = CHARACTER_RENDER_SCALE * laneVisualScale;
    const characterRenderOrder = lerp(
      this.previousCharacterLanePresentation.renderOrder,
      this.characterLanePresentation.renderOrder,
      interpolationAlpha,
    );
    const characterItems = createCharacterItems(
      renderPosition,
      this.facing,
      targetPose,
      bonePose,
      characterRenderScale,
      characterRenderOrder,
    );
    const blockImpactItems = createBlockImpactItems(
      characterItems,
      this.facing,
      this.playerBlockImpactSeconds,
      this.playerBlockImpactStrength,
      characterRenderOrder + 0.01,
    );
    const combatEnemyItems = createCombatEnemyItems(
      this.combatEnemy,
      activeLane.renderOrder + 0.45,
    );
    const items = Object.freeze(
      [...mapSnapshot.renderItems, ...combatEnemyItems, ...characterItems, ...blockImpactItems]
        .filter((item) => item.enabled !== false)
        .sort(
          (left, right) =>
            (left.renderOrder ?? 0) - (right.renderOrder ?? 0) ||
            (left.order ?? 0) - (right.order ?? 0) ||
            left.id.localeCompare(right.id),
        ),
    );
    const bounds = mapSnapshot.worldBounds ?? {
      x: 0,
      y: 0,
      width: map.worldSize.width,
      height: map.worldSize.height,
    };

    return Object.freeze({
      worldSize: map.worldSize,
      groundY: map.groundY,
      gridSize: map.gridSize,
      palette: map.palette,
      animationTime: renderAnimationTime,
      characterRenderScale,
      worldBounds: Object.freeze({
        minX: bounds.x,
        maxX: bounds.x + bounds.width,
        minY: bounds.y,
        maxY: bounds.y + bounds.height,
      }),
      playerMovementBounds: activeLane.movementBounds,
      map: Object.freeze({
        id: map.id,
        name: map.name,
        activeChunkId: mapSnapshot.active.chunkId,
        activeLaneId: mapSnapshot.active.laneId,
        timePhase: this.timePhase,
        appliedPatchIds: mapSnapshot.appliedPatchIds,
      }),
      combatMotion: Object.freeze({
        id: combatState.id,
        label: combatState.label,
        progress: combatState.progress,
        phase: combatState.phase,
        sequence: combatState.sequence,
        queuedMotion: combatState.queuedMotion,
      }),
      player: Object.freeze({
        position: renderPosition,
        isGrounded: this.isGrounded,
        health: this.playerHealth,
        maxHealth: this.playerMaxHealth,
        hitstunSeconds: this.playerHitstunSeconds,
        laneId: mapSnapshot.active.laneId,
        laneTransition: mapSnapshot.transition
          ? Object.freeze({
              connectionId: mapSnapshot.transition.connectionId,
              fromLaneId: mapSnapshot.transition.from.laneId,
              toLaneId: mapSnapshot.transition.to.laneId,
              progress: mapSnapshot.transition.progress,
            })
          : null,
        roll: this.rollState
          ? Object.freeze({
              direction: this.rollState.direction,
              progress: Math.max(
                0,
                Math.min(1, this.rollState.elapsedSeconds / this.rollState.durationSeconds),
              ),
            })
          : null,
      }),
      combatEnemy: this.combatEnemy
        ? Object.freeze({
            id: this.combatEnemy.id,
            position: Object.freeze({ ...this.combatEnemy.position }),
            health: this.combatEnemy.health,
            maxHealth: this.combatEnemy.maxHealth,
            airborne: this.combatEnemy.position.y < this.combatEnemy.groundY,
            juggleHits: this.combatEnemy.juggleHits,
            juggleLimit: MAX_JUGGLE_HITS,
            juggleLocked: this.combatEnemy.juggleLocked,
          })
        : null,
      items,
    });
  }
}
