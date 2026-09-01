import { TwoBoneIKSolver } from '../animation/TwoBoneIKSolver.js';
import { COMBAT_EVENT_TYPE } from '../combat/CombatEvent.js';
import {
  PLAYER_CHARACTER_FOOT_OFFSET,
  PLAYER_COMBAT_GEOMETRY_SCALE,
} from '../combat/SharedCombatGeometry.js';

export const CHARACTER_RENDER_SCALE = PLAYER_COMBAT_GEOMETRY_SCALE;

const ARM_IK_SOLVER = new TwoBoneIKSolver();
const CHARACTER_DEPTH_ITEM_ORDERS = Object.freeze({
  'shield-sleeve-repair-bandage': 9.5,
  'shield-upper-arm': 10,
  'shield-forearm': 11,
  'shield-glove': 11.5,
  shield: 12,
  'shield-rivet-plate': 13,
  'sword-trail': 16.5,
  'sword-sleeve-repair-bandage': 16.75,
  'sword-upper-arm': 17,
  'sword-forearm': 18,
  'sword-glove': 18.5,
  'sword-hilt': 19,
  'sword-blade': 20,
  'sword-shine': 21,
});
const SCALED_HEX_COLOR_CACHE = new Map();
const MAX_SCALED_HEX_COLOR_CACHE_ENTRIES = 512;
const REQUIRED_PROPORTIONS = Object.freeze(['shoulder', 'hip', 'head', 'sideDepth']);

function validateAppearanceProfile(profile) {
  if (!profile || typeof profile !== 'object' || !Object.isFrozen(profile)) {
    throw new TypeError('Player appearanceProfile must be an immutable object.');
  }
  for (const field of ['id', 'family', 'accent', 'material', 'toolKind']) {
    if (typeof profile[field] !== 'string' || profile[field].trim().length === 0) {
      throw new TypeError(`Player appearanceProfile.${field} must be a non-empty string.`);
    }
  }
  for (const field of ['accent', 'material']) {
    if (!/^#[0-9a-f]{6}$/i.test(profile[field])) {
      throw new TypeError(`Player appearanceProfile.${field} must be a six-digit hex color.`);
    }
  }
  if (
    !profile.proportions ||
    typeof profile.proportions !== 'object' ||
    !Object.isFrozen(profile.proportions)
  ) {
    throw new TypeError('Player appearanceProfile.proportions must be immutable.');
  }
  for (const field of REQUIRED_PROPORTIONS) {
    if (!Number.isFinite(profile.proportions[field]) || profile.proportions[field] <= 0) {
      throw new TypeError(`Player appearanceProfile.proportions.${field} must be positive.`);
    }
  }
  if (
    !Array.isArray(profile.landmarks) ||
    !Object.isFrozen(profile.landmarks) ||
    profile.landmarks.length < 3 ||
    profile.landmarks.some((landmark) => typeof landmark !== 'string' || !landmark.trim())
  ) {
    throw new TypeError(
      'Player appearanceProfile.landmarks must be an immutable array with at least three labels.',
    );
  }
  return profile;
}

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
    renderOrder: options.renderOrder,
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
  appearanceProfile,
  position,
  facing,
  targetPose,
  bonePose,
  renderScale,
  renderOrder,
  weaponLengthScale = 1,
  combatGeometry = null,
) {
  const accentColor = appearanceProfile.accent;
  const materialColor = appearanceProfile.material;
  const materialShadow = scaleHexColor(materialColor, 0.58);
  const materialEdge = scaleHexColor(materialColor, 0.42);
  const accentShadow = scaleHexColor(accentColor, 0.58);
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
    x: swordOrigin.x + Math.cos(swordRotation) * 5,
    y: swordOrigin.y + Math.sin(swordRotation) * 5,
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
      'tool-bag',
      [
        { x: -15, y: -2 },
        { x: 5, y: -4 },
        { x: 10, y: 8 },
        { x: 8, y: 40 },
        { x: -11, y: 45 },
        { x: -16, y: 31 },
      ],
      {
        x: bodyX - 9,
        y: bodyY + 13,
        rotation: -bonePose.capeLift * 0.025,
      },
      materialShadow,
      { stroke: materialEdge, lineWidth: 2 },
    ),
    polygon(
      'tool-bag-cable',
      [
        { x: -2, y: -3 },
        { x: -19 - bonePose.capeLift * 8, y: 2 },
        { x: -24 - bonePose.capeLift * 7, y: 17 },
        { x: -20, y: 20 },
        { x: -14, y: 7 },
        { x: 2, y: 3 },
      ],
      { x: bodyX - 10, y: bodyY + 10 },
      accentShadow,
      { stroke: materialEdge, lineWidth: 1.5 },
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
      materialColor,
      { stroke: materialEdge, lineWidth: 2 },
    ),
    polygon(
      'patched-chest-plate',
      [
        { x: -14, y: -28 },
        { x: 13, y: -30 },
        { x: 17, y: 1 },
        { x: 7, y: 22 },
        { x: -12, y: 17 },
      ],
      { x: bodyX, y: bodyY },
      scaleHexColor(materialColor, 0.82),
      { stroke: materialEdge, lineWidth: 1.5 },
    ),
    polygon(
      'work-belt',
      [
        { x: -20, y: -4 },
        { x: 20, y: -5 },
        { x: 20, y: 5 },
        { x: -20, y: 7 },
      ],
      { x: bodyX, y: bodyY + 27 },
      materialShadow,
      { stroke: materialEdge, lineWidth: 1.5 },
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
      materialColor,
      { stroke: materialEdge, lineWidth: 3 },
    ),
    polygon(
      'shield-rivet-plate',
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
      accentColor,
      { stroke: accentShadow, lineWidth: 1.5 },
    ),
    polygon(
      'head',
      regularPolygon(17, 21, 8, Math.PI / 8),
      { x: bodyX - 1, y: bodyY - 63, rotation: bonePose.headTilt },
      '#cf8f78',
      { stroke: '#3d2832', lineWidth: 2 },
    ),
    polygon(
      'goggles-band',
      [
        { x: -18, y: -7 },
        { x: -13, y: -13 },
        { x: 13, y: -13 },
        { x: 18, y: -7 },
        { x: 15, y: -2 },
        { x: -15, y: -2 },
      ],
      { x: bodyX - 1, y: bodyY - 63, rotation: bonePose.headTilt },
      materialShadow,
      { stroke: materialEdge, lineWidth: 2 },
    ),
    polygon(
      'goggles-lenses',
      [
        { x: -13, y: -12 },
        { x: -2, y: -12 },
        { x: -1, y: -3 },
        { x: -12, y: -3 },
        { x: -13, y: -12 },
        { x: 2, y: -12 },
        { x: 13, y: -12 },
        { x: 12, y: -3 },
        { x: 1, y: -3 },
      ],
      { x: bodyX - 1, y: bodyY - 63, rotation: bonePose.headTilt },
      accentColor,
      { stroke: accentShadow, lineWidth: 1.25, opacity: 0.94 },
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
      'worker-hair-back',
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
      materialEdge,
      { stroke: scaleHexColor(materialColor, 0.25), lineWidth: 2, order: 13.75 },
    ),
    polygon(
      'worker-hair-fringe',
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
      materialShadow,
      { stroke: scaleHexColor(materialColor, 0.25), lineWidth: 1.5, order: 16.25 },
    ),
    polygon(
      'workwear-back-panel',
      [
        { x: -18, y: 3 },
        { x: 15, y: 4 },
        { x: 19, y: 18 },
        { x: 12, y: 41 },
        { x: 1, y: 38 },
        { x: -10, y: 43 },
        { x: -18, y: 35 },
        { x: -21, y: 15 },
      ],
      {
        x: bodyX - 1,
        y: bodyY + 8,
        rotation: -bonePose.capeLift * 0.035,
      },
      materialColor,
      { stroke: materialEdge, lineWidth: 2, order: 2.75 },
    ),
    polygon(
      'workwear-front-panel',
      [
        { x: -13, y: -25 },
        { x: 11, y: -27 },
        { x: 16, y: 4 },
        { x: 9, y: 30 },
        { x: -10, y: 28 },
        { x: -16, y: 4 },
      ],
      { x: bodyX + 1, y: bodyY },
      accentColor,
      { stroke: accentShadow, lineWidth: 1.5, order: 9.25 },
    ),
    polygon(
      'workwear-repair-patch',
      [
        { x: -10, y: -7 },
        { x: 5, y: -9 },
        { x: 9, y: 6 },
        { x: -7, y: 9 },
      ],
      { x: bodyX + 7, y: bodyY + 12, rotation: -0.08 },
      accentShadow,
      { stroke: materialEdge, lineWidth: 1.5, order: 9.4 },
    ),
    limbSegment(
      'shield-sleeve-repair-bandage',
      {
        x: lerp(leftArm.root.x, leftArm.elbow.x, 0.18),
        y: lerp(leftArm.root.y, leftArm.elbow.y, 0.18),
      },
      {
        x: lerp(leftArm.root.x, leftArm.elbow.x, 0.48),
        y: lerp(leftArm.root.y, leftArm.elbow.y, 0.48),
      },
      12,
      '#d7c8a5',
      { stroke: '#71644e', lineWidth: 1.5 },
    ),
    limbSegment(
      'sword-sleeve-repair-bandage',
      {
        x: lerp(rightArm.root.x, rightArm.elbow.x, 0.18),
        y: lerp(rightArm.root.y, rightArm.elbow.y, 0.18),
      },
      {
        x: lerp(rightArm.root.x, rightArm.elbow.x, 0.48),
        y: lerp(rightArm.root.y, rightArm.elbow.y, 0.48),
      },
      12,
      '#d7c8a5',
      { stroke: '#71644e', lineWidth: 1.5 },
    ),
    ...[-7, 0, 7].map((offset, index) =>
      polygon(
        `workwear-rivet-${index}`,
        regularPolygon(2.2, 2.2, 6, Math.PI / 6),
        { x: bodyX + offset, y: bodyY - 15 },
        accentColor,
        { stroke: accentShadow, lineWidth: 0.75, order: 9.6 + index * 0.01 },
      ),
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
          : item.id === 'torso' || item.id === 'head'
            ? combatGeometry?.hurt?.find(({ part }) => part === item.id)?.points
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
              const footY = position.y + PLAYER_CHARACTER_FOOT_OFFSET;
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

function createJustGuardImpactItems(event, shield, position, renderOrder) {
  if (!event?.position || !shield?.points) return [];
  const progress = Math.max(0, Math.min(1, 1 - event.remainingSeconds / event.durationSeconds));
  const opacity = 1 - progress;
  const center = event.position;
  const waveRadius = lerp(12, 58, smoothStep(progress));
  const recoveryY = position.y - 112 - progress * 18;
  const items = [
    polygon('player-just-guard-shield-flash', shield.points, { x: 0, y: 0 }, '#effffb', {
      stroke: '#63f4df',
      lineWidth: 4,
      opacity: Math.max(0.62, opacity),
    }),
    polygon(
      'player-just-guard-wave',
      arcRibbonPoints(center, 0, Math.PI * 2, Math.max(1, waveRadius - 6), waveRadius, 16),
      { x: 0, y: 0 },
      '#7ff7e4',
      { opacity: opacity * 0.88 },
    ),
    polygon(
      'player-just-guard-stamina-recovery',
      [
        { x: -6, y: -18 },
        { x: 6, y: -18 },
        { x: 6, y: -6 },
        { x: 18, y: -6 },
        { x: 18, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 18 },
        { x: -6, y: 18 },
        { x: -6, y: 6 },
        { x: -18, y: 6 },
        { x: -18, y: -6 },
        { x: -6, y: -6 },
      ],
      { x: position.x, y: recoveryY },
      '#69f0a8',
      { stroke: '#effffb', lineWidth: 2.5, opacity: opacity * 0.95 },
    ),
  ];
  items.push(
    ...Array.from({ length: 8 }, (_, index) => {
      const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
      return limbSegment(
        `player-just-guard-spark-${index}`,
        {
          x: center.x + Math.cos(angle) * lerp(4, 15, progress),
          y: center.y + Math.sin(angle) * lerp(4, 15, progress),
        },
        {
          x: center.x + Math.cos(angle) * lerp(24, 64, progress),
          y: center.y + Math.sin(angle) * lerp(24, 64, progress),
        },
        6,
        index % 2 === 0 ? '#fff3a6' : '#8ffff0',
        { opacity: opacity * 0.96 },
      );
    }),
  );
  return items.map((item, index) => Object.freeze({ ...item, renderOrder, order: 130 + index }));
}

function createShieldCounterImpactItems(event, renderOrder) {
  if (!event?.position) return [];
  const progress = Math.max(0, Math.min(1, 1 - event.remainingSeconds / event.durationSeconds));
  const opacity = 1 - progress;
  const center = event.position;
  const radius = lerp(9, 34, smoothStep(progress));
  const items = [
    polygon(
      'player-shield-counter-ring',
      arcRibbonPoints(center, 0, Math.PI * 2, Math.max(1, radius - 6), radius, 12),
      { x: 0, y: 0 },
      '#ffd46b',
      { opacity: opacity * 0.9 },
    ),
  ];
  items.push(
    ...Array.from({ length: 6 }, (_, index) => {
      const angle = -0.95 + index * 0.38;
      const direction = event.direction < 0 ? Math.PI - angle : angle;
      return limbSegment(
        `player-shield-counter-spark-${index}`,
        center,
        {
          x: center.x + Math.cos(direction) * lerp(22, 54, progress),
          y: center.y + Math.sin(direction) * lerp(22, 54, progress),
        },
        5,
        index % 2 === 0 ? '#fff0b3' : '#f79b55',
        { opacity },
      );
    }),
  );
  return items.map((item, index) => Object.freeze({ ...item, renderOrder, order: 140 + index }));
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
  const genericOpacityScale = event.enchantment ? 0 : 1;
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
        {
          stroke: '#e05252',
          lineWidth: 2.5,
          opacity: opacity * 0.64 * genericOpacityScale,
        },
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
          { opacity: opacity * genericOpacityScale },
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

function createEnchantContactItems(events, renderOrder) {
  const event = [...events]
    .reverse()
    .find((candidate) => candidate.enchantment && candidate.position);
  if (!event) return [];
  const progress = 1 - event.remainingSeconds / event.durationSeconds;
  const color = event.enchantment.color ?? '#ffffff';
  const highlightColor = event.enchantment.highlightColor ?? color;
  const radius = 10 + 22 * progress;
  const opacity = Math.max(0, 0.85 * (1 - progress * progress));
  const center = event.position;
  const shape = event.enchantment.shape;
  const primitiveItems = (() => {
    if (shape === 'bolt') {
      return Array.from({ length: 3 }, (_, index) => {
        const angle = (index / 3) * Math.PI * 2 + 0.2;
        const inner = 10 + progress * 7;
        const middle = 20 + progress * 16;
        const outer = 32 + progress * 40;
        const bend = angle + (index % 2 === 0 ? 0.38 : -0.38);
        const midpoint = {
          x: center.x + Math.cos(angle) * middle,
          y: center.y + Math.sin(angle) * middle,
        };
        return [
          limbSegment(
            `enchant-lightning-bolt-${index}-a`,
            {
              x: center.x + Math.cos(angle) * inner,
              y: center.y + Math.sin(angle) * inner,
            },
            midpoint,
            4,
            highlightColor,
            { opacity, renderOrder, order: 161 + index * 2 },
          ),
          limbSegment(
            `enchant-lightning-bolt-${index}-b`,
            midpoint,
            {
              x: center.x + Math.cos(bend) * outer,
              y: center.y + Math.sin(bend) * outer,
            },
            4,
            highlightColor,
            { opacity, renderOrder, order: 162 + index * 2 },
          ),
        ];
      }).flat();
    }
    if (shape === 'shard' || shape === 'fragment') {
      return Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2;
        const distance = 18 + progress * 30;
        return polygon(
          shape === 'shard' ? `enchant-ice-shard-${index}` : `enchant-earth-fragment-${index}`,
          regularPolygon(shape === 'shard' ? 5 : 7, shape === 'shard' ? 12 : 7, 4, Math.PI / 4),
          {
            x: center.x + Math.cos(angle) * distance,
            y: center.y + Math.sin(angle) * distance,
          },
          highlightColor,
          {
            opacity,
            stroke: color,
            lineWidth: 1.5,
            renderOrder,
            order: 161 + index,
          },
        );
      });
    }
    return Array.from({ length: 5 }, (_, index) => {
      const offsetX = (index - 2) * 4;
      const rise = 30 + progress * (35 + index * 3);
      return limbSegment(
        `enchant-fire-ember-${index}`,
        { x: center.x + offsetX * 0.4, y: center.y + 3 },
        { x: center.x + offsetX, y: center.y - rise },
        4,
        highlightColor,
        { opacity, renderOrder, order: 161 + index },
      );
    });
  })();
  return [
    polygon(
      'enchant-contact-ring',
      regularPolygon(radius, radius, 10, Math.PI / 10),
      center,
      color,
      { opacity, stroke: highlightColor, lineWidth: 4, renderOrder, order: 160 },
    ),
    ...primitiveItems,
  ];
}

export function createPlayerCombatPresentation({
  appearanceProfile,
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
  activeEnchant = null,
}) {
  const validatedAppearanceProfile = validateAppearanceProfile(appearanceProfile);
  const sampledCharacterItems = createCharacterItems(
    validatedAppearanceProfile,
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
        : item.id === 'sword-blade' && activeEnchant
          ? Object.freeze({
              ...item,
              stroke: activeEnchant.color,
              lineWidth: 3,
              opacity: Math.max(item.opacity ?? 1, 0.92),
            })
          : item,
    ),
  );
  const justGuardEvent = latestCombatEvent(
    combatEvents,
    COMBAT_EVENT_TYPE.JUST_GUARD,
    (event) => event.actor === 'player',
  );
  const playerGuardEvent = justGuardEvent
    ? null
    : (latestCombatEvent(
        combatEvents,
        COMBAT_EVENT_TYPE.GUARD_BREAK,
        (event) => event.actor === 'player',
      ) ??
      latestCombatEvent(
        combatEvents,
        COMBAT_EVENT_TYPE.GUARD,
        (event) => event.actor === 'player',
      ));
  const playerHitEvent = latestCombatEvent(
    combatEvents,
    COMBAT_EVENT_TYPE.HIT,
    (event) => event.target === 'player',
  );
  const evadeEvent = latestCombatEvent(combatEvents, COMBAT_EVENT_TYPE.EVADE);
  const punishEvent = latestCombatEvent(combatEvents, COMBAT_EVENT_TYPE.PUNISH);
  const counterEvent = latestCombatEvent(
    combatEvents,
    COMBAT_EVENT_TYPE.COUNTER,
    (event) => event.actor === 'player',
  );
  const enemyHitEvent =
    latestCombatEvent(
      combatEvents,
      COMBAT_EVENT_TYPE.GUARD_BREAK,
      (event) => event.target === 'enemy' && event.outcome === 'posture-break',
    ) ??
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
  const justGuardImpactItems = Object.freeze(
    createJustGuardImpactItems(
      justGuardEvent,
      combatGeometry?.shield,
      position,
      renderOrder + 0.04,
    ),
  );
  const shieldCounterImpactItems = Object.freeze(
    createShieldCounterImpactItems(counterEvent, enemyRenderOrder - 0.005),
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
  const enchantContactItems = Object.freeze(
    createEnchantContactItems(combatEvents, enemyRenderOrder + 0.02),
  );
  const combatEffectItems = Object.freeze([
    ...retaliationItems,
    ...blockImpactItems,
    ...justGuardImpactItems,
    ...shieldCounterImpactItems,
    ...playerHitFeedbackItems,
    ...enemyHitFeedbackItems,
    ...evadeFeedbackItems,
    ...punishFeedbackItems,
    ...enchantContactItems,
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
      justGuardImpactItems,
      shieldCounterImpactItems,
      playerHitFeedbackItems,
      enemyHitFeedbackItems,
      evadeFeedbackItems,
      punishFeedbackItems,
      enchantContactItems,
    }),
  });
}
