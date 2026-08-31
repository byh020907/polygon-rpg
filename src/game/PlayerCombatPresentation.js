import { sampleCombatTargetPose } from '../animation/CombatPoseLibrary.js';
import { sampleCharacterBonePose } from '../animation/CharacterBonePoseLibrary.js';
import { TwoBoneIKSolver } from '../animation/TwoBoneIKSolver.js';
import { COMBAT_EVENT_TYPE } from '../combat/CombatEvent.js';
import { PLAYER_COMBAT_GEOMETRY_SCALE } from '../combat/SharedCombatGeometry.js';

export const CHARACTER_RENDER_SCALE = PLAYER_COMBAT_GEOMETRY_SCALE;

const CHARACTER_FOOT_OFFSET = 82;

const ARM_IK_SOLVER = new TwoBoneIKSolver();
const CHARACTER_DEPTH_ITEM_ORDERS = Object.freeze({
  'shield-pauldron': 9.5,
  'shield-upper-arm': 10,
  'shield-forearm': 11,
  'shield-glove': 11.5,
  shield: 12,
  'shield-mark': 13,
  'sword-trail': 16.5,
  'sword-pauldron': 16.75,
  'sword-upper-arm': 17,
  'sword-forearm': 18,
  'sword-glove': 18.5,
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

function createCharacterItems(
  position,
  facing,
  targetPose,
  bonePose,
  renderScale,
  renderOrder,
  weaponLengthScale = 1,
  combatGeometry = null,
) {
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
      arcRibbonPoints(
        swordOrigin,
        swordRotation - targetPose.trailArc,
        swordRotation,
        42,
        111 * weaponLengthScale,
      ),
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
        { x: 100 * weaponLengthScale, y: -3 },
        { x: 126 * weaponLengthScale, y: 0 },
        { x: 100 * weaponLengthScale, y: 4 },
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
        { x: 99 * weaponLengthScale, y: -2 },
        { x: 117 * weaponLengthScale, y: -0.5 },
        { x: 22, y: 0 },
      ],
      { x: bladeOrigin.x, y: bladeOrigin.y, rotation: swordRotation },
      '#ffffff',
      { opacity: 0.8 },
    ),
  ];

  items.push(
    polygon(
      'hair-back',
      [
        { x: -17, y: -8 },
        { x: -14, y: -20 },
        { x: -3, y: -27 },
        { x: 12, y: -21 },
        { x: 18, y: -7 },
        { x: 12, y: 8 },
        { x: 2, y: 4 },
        { x: -5, y: 15 },
        { x: -15, y: 8 },
      ],
      { x: bodyX - 1, y: bodyY - 63, rotation: bonePose.headTilt },
      '#241b2c',
      { stroke: '#120e19', lineWidth: 2, order: 13.75 },
    ),
    polygon(
      'hair-fringe',
      [
        { x: -11, y: -13 },
        { x: -2, y: -22 },
        { x: 13, y: -16 },
        { x: 18, y: -6 },
        { x: 8, y: -3 },
        { x: 12, y: 6 },
        { x: 2, y: 1 },
        { x: -4, y: 10 },
        { x: -9, y: -1 },
      ],
      { x: bodyX - 1, y: bodyY - 63, rotation: bonePose.headTilt },
      '#2f2238',
      { stroke: '#120e19', lineWidth: 1.5, order: 16.25 },
    ),
    polygon(
      'uniform-coat-tail',
      [
        { x: -18, y: 4 },
        { x: 15, y: 5 },
        { x: 20, y: 20 },
        { x: 12, y: 55 },
        { x: 2, y: 47 },
        { x: -7, y: 60 },
        { x: -18, y: 48 },
        { x: -22, y: 17 },
      ],
      {
        x: bodyX - 1,
        y: bodyY + 8,
        rotation: -bonePose.capeLift * 0.035,
      },
      '#315f91',
      { stroke: '#132b48', lineWidth: 2, order: 2.75 },
    ),
    polygon(
      'uniform-front-panel',
      [
        { x: -13, y: -25 },
        { x: 11, y: -27 },
        { x: 16, y: 4 },
        { x: 9, y: 30 },
        { x: -10, y: 28 },
        { x: -16, y: 4 },
      ],
      { x: bodyX + 1, y: bodyY },
      '#4f80b3',
      { stroke: '#173653', lineWidth: 1.5, order: 9.25 },
    ),
    polygon(
      'shield-pauldron',
      [
        { x: -12, y: -6 },
        { x: -2, y: -13 },
        { x: 11, y: -9 },
        { x: 14, y: 2 },
        { x: 5, y: 9 },
        { x: -10, y: 6 },
      ],
      leftShoulder,
      '#91a7b2',
      { stroke: '#2d3b49', lineWidth: 2 },
    ),
    polygon(
      'sword-pauldron',
      [
        { x: -11, y: -7 },
        { x: 1, y: -13 },
        { x: 13, y: -7 },
        { x: 14, y: 4 },
        { x: 3, y: 9 },
        { x: -10, y: 5 },
      ],
      rightShoulder,
      '#b2c0c5',
      { stroke: '#34434d', lineWidth: 2 },
    ),
    polygon(
      'shield-glove',
      [
        { x: -8, y: -6 },
        { x: 7, y: -6 },
        { x: 11, y: 0 },
        { x: 5, y: 8 },
        { x: -7, y: 7 },
        { x: -10, y: 0 },
      ],
      {
        x: leftArm.hand.x,
        y: leftArm.hand.y,
        rotation: Math.atan2(leftArm.hand.y - leftArm.elbow.y, leftArm.hand.x - leftArm.elbow.x),
      },
      '#684331',
      { stroke: '#281b19', lineWidth: 1.5 },
    ),
    polygon(
      'sword-glove',
      [
        { x: -8, y: -6 },
        { x: 7, y: -6 },
        { x: 11, y: 0 },
        { x: 5, y: 8 },
        { x: -7, y: 7 },
        { x: -10, y: 0 },
      ],
      {
        x: rightArm.hand.x,
        y: rightArm.hand.y,
        rotation: Math.atan2(
          rightArm.hand.y - rightArm.elbow.y,
          rightArm.hand.x - rightArm.elbow.x,
        ),
      },
      '#82533b',
      { stroke: '#2e201c', lineWidth: 1.5 },
    ),
    polygon(
      'back-boot',
      [
        { x: -7, y: -8 },
        { x: 6, y: -8 },
        { x: 15, y: -3 },
        { x: 17, y: 4 },
        { x: 4, y: 8 },
        { x: -9, y: 6 },
        { x: -11, y: 0 },
      ],
      rearLeg.hand,
      '#5a392d',
      { stroke: '#241918', lineWidth: 1.5, order: 4.5 },
    ),
    polygon(
      'front-boot',
      [
        { x: -7, y: -8 },
        { x: 7, y: -8 },
        { x: 17, y: -3 },
        { x: 19, y: 4 },
        { x: 5, y: 9 },
        { x: -9, y: 6 },
        { x: -11, y: 0 },
      ],
      leadLeg.hand,
      '#80513a',
      { stroke: '#2c1e1a', lineWidth: 1.5, order: 6.5 },
    ),
  );

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
    const geometryPoints =
      item.id === 'sword-blade'
        ? combatGeometry?.weapon?.points
        : item.id === 'shield'
          ? combatGeometry?.shield?.points
          : null;
    return Object.freeze({
      ...item,
      renderOrder,
      order: baseOrder + depthOrderOffset,
      opacity: item.opacity * depthOpacity,
      fill: depthGroup ? scaleHexColor(item.fill, depthColorScale) : item.fill,
      lineWidth: item.lineWidth * renderScale,
      points: geometryPoints
        ? Object.freeze(geometryPoints)
        : Object.freeze(
            item.points.map((point) => {
              const footY = position.y + CHARACTER_FOOT_OFFSET;
              const relativeX =
                (point.x - position.x) * (item.id === 'shadow' ? 1 : bonePose.bodyScaleX);
              const relativeY =
                (point.y - footY) * (item.id === 'shadow' ? 1 : targetPose.bodyScaleY);
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

function createBlockImpactItems(event, facing, impactSeconds, impactStrength, renderOrder) {
  if (impactSeconds <= 0 || !event?.position) return [];
  const progress = 1 - impactSeconds / 0.14;
  const opacity = Math.max(0, 1 - progress);
  const center = event.position;
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

function createRetaliationAuraItems(position, seconds, idPrefix, renderOrder) {
  if (seconds <= 0) return [];
  const pulse = 0.5 + Math.sin(seconds * 34) * 0.5;
  return [
    Object.freeze({
      ...polygon(
        `${idPrefix}-retaliation-aura`,
        regularPolygon(25 + pulse * 3, 30 + pulse * 3, 12, Math.PI / 12),
        position,
        '#7ff7e4',
        { stroke: '#effffb', lineWidth: 1.5, opacity: 0.08 + pulse * 0.08 },
      ),
      renderOrder,
      order: 98,
    }),
  ];
}

function createHitFeedbackItems(event, target, idPrefix, renderOrder) {
  if (!event?.position || event.target !== target) return [];
  const progress = Math.max(0, Math.min(1, 1 - event.remainingSeconds / event.durationSeconds));
  const opacity = 1 - progress;
  const center = event.position;
  const strength = Math.max(0.8, event.strength);
  const radius = lerp(7 + strength * 2, 20 + strength * 5, smoothStep(progress));
  const direction = event.direction || 1;
  const sparkAngles = [-1.05, -0.62, -0.2, 0.2, 0.62, 1.05];
  const items = [
    Object.freeze({
      ...polygon(
        `${idPrefix}-hit-ring`,
        regularPolygon(radius, radius, 10, Math.PI / 10),
        center,
        '#fff0d2',
        { stroke: '#e05252', lineWidth: 2.5, opacity: opacity * 0.64 },
      ),
      renderOrder,
      order: 120,
    }),
  ];
  items.push(
    ...sparkAngles.map((angle, index) => {
      const sparkAngle = direction < 0 ? Math.PI - angle : angle;
      const inner = lerp(3, 9, progress);
      const outer = lerp(12 + strength * 2, 28 + strength * 5, progress);
      return Object.freeze({
        ...limbSegment(
          `${idPrefix}-hit-spark-${index}`,
          {
            x: center.x + Math.cos(sparkAngle) * inner,
            y: center.y + Math.sin(sparkAngle) * inner,
          },
          {
            x: center.x + Math.cos(sparkAngle) * outer,
            y: center.y + Math.sin(sparkAngle) * outer,
          },
          3.5,
          index % 2 === 0 ? '#fff0d2' : '#f06a5f',
          { opacity },
        ),
        renderOrder,
        order: 121 + index,
      });
    }),
  );
  return items;
}

function createEvadeFeedbackItems(position, event, renderOrder) {
  if (!event) return [];
  const progress = Math.max(0, Math.min(1, 1 - event.remainingSeconds / event.durationSeconds));
  const opacity = 1 - progress;
  const radius = lerp(18, 42, smoothStep(progress));
  const direction = event.direction || 1;
  const center = { x: position.x, y: position.y + 35 };
  const arcs = [
    arcRibbonPoints(center, -1.12, -0.28, radius - 3, radius, 5),
    arcRibbonPoints(center, 2.02, 2.86, radius - 3, radius, 5),
  ];
  const items = arcs.map((points, index) =>
    Object.freeze({
      ...polygon(`player-evade-ring-${index}`, points, { x: 0, y: 0 }, '#8ef8ee', {
        opacity: opacity * 0.72,
      }),
      renderOrder,
      order: 110 + index,
    }),
  );
  items.push(
    Object.freeze({
      ...limbSegment(
        'player-evade-streak',
        { x: center.x - direction * lerp(12, 28, progress), y: center.y },
        { x: center.x - direction * lerp(38, 62, progress), y: center.y },
        4,
        '#effffb',
        { opacity: opacity * 0.9 },
      ),
      renderOrder,
      order: 112,
    }),
  );
  return items;
}

function createPunishFeedbackItems(event, renderOrder) {
  if (!event?.position) return [];
  const progress = Math.max(0, Math.min(1, 1 - event.remainingSeconds / event.durationSeconds));
  const opacity = 1 - progress;
  const center = event.position;
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2;
    const inner = lerp(8, 24, progress);
    const outer = lerp(20, 48, progress);
    return Object.freeze({
      ...limbSegment(
        `enemy-punish-spark-${index}`,
        {
          x: center.x + Math.cos(angle) * inner,
          y: center.y + Math.sin(angle) * inner,
        },
        {
          x: center.x + Math.cos(angle) * outer,
          y: center.y + Math.sin(angle) * outer,
        },
        3.5,
        index % 2 === 0 ? '#fff3a6' : '#f6a84a',
        { opacity },
      ),
      renderOrder,
      order: 120 + index,
    });
  });
}

function latestCombatEvent(events, type, predicate = () => true) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].type === type && predicate(events[index])) return events[index];
  }
  return null;
}

export function samplePlayerPresentationPose({ motionState, boneInput }) {
  const targetPose = sampleCombatTargetPose(motionState);
  const bonePose = sampleCharacterBonePose({ ...boneInput, motionState });
  return Object.freeze({ targetPose, bonePose });
}

export function createPlayerCombatPresentation({
  position,
  facing,
  targetPose,
  bonePose,
  combatGeometry,
  renderScale = CHARACTER_RENDER_SCALE,
  renderOrder,
  weaponLengthScale = 1,
  contactGeometry = null,
  contactProfile = null,
  contactProgress = 0,
  combatEvents = Object.freeze([]),
  blockImpactSeconds = 0,
  blockImpactStrength = 0,
  retaliationSeconds = 0,
  enemyRenderOrder,
}) {
  const sampledCharacterItems = createCharacterItems(
    position,
    facing,
    targetPose,
    bonePose,
    renderScale,
    renderOrder,
    weaponLengthScale,
    combatGeometry,
  );
  const contactOffset = contactGeometry
    ? {
        x: position.x - contactGeometry.origin.x,
        y: position.y - contactGeometry.origin.y,
      }
    : { x: 0, y: 0 };
  const contactSweepVisible =
    contactGeometry &&
    contactProfile &&
    contactProgress >= contactProfile.start &&
    contactProgress <= contactProfile.end;
  const characterItems = Object.freeze(
    sampledCharacterItems.map((item) =>
      item.id === 'sword-trail' && contactGeometry?.sweep
        ? Object.freeze({
            ...item,
            opacity: Math.max(item.opacity, contactSweepVisible ? 0.25 : 0),
            points: Object.freeze(
              contactGeometry.sweep.points.map((pointValue) =>
                Object.freeze({
                  x: pointValue.x + contactOffset.x,
                  y: pointValue.y + contactOffset.y,
                }),
              ),
            ),
          })
        : item,
    ),
  );
  const playerGuardEvent =
    latestCombatEvent(
      combatEvents,
      COMBAT_EVENT_TYPE.GUARD_BREAK,
      (event) => event.actor === 'player',
    ) ??
    latestCombatEvent(combatEvents, COMBAT_EVENT_TYPE.GUARD, (event) => event.actor === 'player');
  const playerHitEvent = latestCombatEvent(
    combatEvents,
    COMBAT_EVENT_TYPE.HIT,
    (event) => event.target === 'player',
  );
  const evadeEvent = latestCombatEvent(combatEvents, COMBAT_EVENT_TYPE.EVADE);
  const punishEvent = latestCombatEvent(combatEvents, COMBAT_EVENT_TYPE.PUNISH);
  const enemyHitEvent =
    latestCombatEvent(
      combatEvents,
      COMBAT_EVENT_TYPE.LAUNCH,
      (event) => event.target === 'enemy',
    ) ??
    latestCombatEvent(combatEvents, COMBAT_EVENT_TYPE.HIT, (event) => event.target === 'enemy');
  const retaliationItems = Object.freeze(
    createRetaliationAuraItems(
      { x: position.x, y: position.y + 20 },
      retaliationSeconds,
      'player',
      renderOrder - 0.005,
    ),
  );
  const blockImpactItems = Object.freeze(
    createBlockImpactItems(
      playerGuardEvent,
      facing,
      blockImpactSeconds,
      blockImpactStrength,
      renderOrder + 0.01,
    ),
  );
  const playerHitFeedbackItems = Object.freeze(
    createHitFeedbackItems(playerHitEvent, 'player', 'player', renderOrder + 0.03),
  );
  const enemyHitFeedbackItems = Object.freeze(
    createHitFeedbackItems(enemyHitEvent, 'enemy', 'combat-enemy', enemyRenderOrder - 0.01),
  );
  const evadeFeedbackItems = Object.freeze(
    createEvadeFeedbackItems(position, evadeEvent, renderOrder + 0.02),
  );
  const punishFeedbackItems = Object.freeze(
    createPunishFeedbackItems(punishEvent, enemyRenderOrder),
  );
  const combatEffectItems = Object.freeze([
    ...retaliationItems,
    ...blockImpactItems,
    ...playerHitFeedbackItems,
    ...enemyHitFeedbackItems,
    ...evadeFeedbackItems,
    ...punishFeedbackItems,
  ]);
  return Object.freeze({
    targetPose,
    bonePose,
    combatGeometry,
    characterItems,
    combatEffectItems,
    effects: Object.freeze({
      retaliationItems,
      blockImpactItems,
      playerHitFeedbackItems,
      enemyHitFeedbackItems,
      evadeFeedbackItems,
      punishFeedbackItems,
    }),
  });
}
