import { sampleCombatTargetPose } from '../animation/CombatPoseLibrary.js';
import { sampleCharacterBonePose } from '../animation/CharacterBonePoseLibrary.js';
import { TwoBoneIKSolver } from '../animation/TwoBoneIKSolver.js';
import {
  combatMotionFrameData,
  CombatCommandController,
} from '../combat/CombatCommandController.js';
import { CombatCameraFeedback } from '../combat/CombatCameraFeedback.js';
import { COMBAT_EVENT_TYPE, CombatEventBuffer } from '../combat/CombatEvent.js';
import { combatFramesToSeconds } from '../combat/CombatFrame.js';
import { SceneNode } from '../core/SceneNode.js';
import { Signal } from '../core/Signal.js';
import { GameStatusNode } from './GameStatusNode.js';
import {
  DEFAULT_EQUIPMENT_PROFILE_ID,
  EQUIPMENT_PROFILES,
  getEquipmentProfile,
} from './equipment/EquipmentProfiles.js';
import { FirstJourneyProgress } from './encounter/FirstJourneyProgress.js';
import { RegionExpansionProgress } from './encounter/RegionExpansionProgress.js';
import { MapRuntime } from './map/MapRuntime.js';
import {
  TRAINING_CLEAR_REWARD,
  getCombatSkillLevelProfile,
  getCombatSkillTrainingMarkRequirement,
  getCombatSkillUpgradeCost,
} from './progression/ProgressionProfiles.js';
import {
  PROGRESSION_TRANSACTION_REASON,
  assertProgressionSnapshot,
  awardTrainingMarks,
  createProgressionSnapshot,
  getAvailableGold,
  mergeProgressionSnapshot,
  purchaseEquipment as purchaseProgressionEquipment,
  selectEquipment as selectProgressionEquipment,
  trainCombatSkill as trainProgressionCombatSkill,
} from './progression/ProgressionState.js';
import { ROOM_SCENE } from './room/RoomNode.js';
import { resolveFirstJourneyStory } from './story/FirstJourneyStory.js';
import { StoryInteractionOwner } from './story/StoryInteractionOwner.js';

const CHARACTER_SPEED = 230;
const JUMP_SPEED = 470;
const GRAVITY = 1180;
const ROLL_DURATION_SECONDS = combatFramesToSeconds(25);
const ROLL_SPEED = 320;
const LANDING_RECOVERY_SECONDS = combatFramesToSeconds(8);

const PLAYER_KNOCKBACK_STOP_SPEED = 4;
function attackHitProfile(motionId, { startFrame, endFrame, hitPulseFrames, ...profile }) {
  const motionFrame = combatMotionFrameData(motionId);
  if (!motionFrame) throw new Error(`${motionId}에는 CombatFrame data가 필요합니다.`);
  if (startFrame < 0 || endFrame > motionFrame.durationFrames || endFrame < startFrame) {
    throw new RangeError(`${motionId} hit frame window가 motion duration을 벗어났습니다.`);
  }
  return Object.freeze({
    ...profile,
    frame: Object.freeze({ startFrame, endFrame }),
    start: startFrame / motionFrame.durationFrames,
    end: endFrame / motionFrame.durationFrames,
    ...(hitPulseFrames
      ? {
          hitPulseFrames: Object.freeze(hitPulseFrames),
          hitPulses: Object.freeze(
            hitPulseFrames.map((frame) => frame / motionFrame.durationFrames),
          ),
        }
      : {}),
  });
}

const BASE_ATTACK_HIT_PROFILES = Object.freeze({
  slash: attackHitProfile('slash', {
    startFrame: 11,
    endFrame: 22,
    damage: 12,
    range: 28,
    launchY: -90,
  }),
  heavy: attackHitProfile('heavy', {
    startFrame: 19,
    endFrame: 33,
    damage: 22,
    range: 68,
    launchY: -150,
    guardBreak: true,
  }),
  thrust: attackHitProfile('thrust', {
    startFrame: 10,
    endFrame: 18,
    damage: 15,
    range: 82,
    launchY: -80,
  }),
  rising: attackHitProfile('rising', {
    startFrame: 15,
    endFrame: 27,
    damage: 18,
    range: 66,
    launchY: -470,
    juggleRole: 'launcher',
    relaunchSpeed: 310,
    floatSeconds: 0.16,
    guardBreak: true,
  }),
  spin: attackHitProfile('spin', {
    startFrame: 12,
    endFrame: 41,
    damage: 8,
    range: 72,
    launchY: -70,
    relaunchSpeed: 260,
    floatSeconds: 0.08,
    hitPulseFrames: [14, 25, 36],
    contactSpacings: Object.freeze([23, 17, 5]),
  }),
  airSlash: attackHitProfile('airSlash', {
    startFrame: 9,
    endFrame: 18,
    damage: 13,
    range: 70,
    launchY: -110,
    juggleRole: 'sustain',
    relaunchSpeed: 190,
    floatSeconds: 0.1,
  }),
  airHeavy: attackHitProfile('airHeavy', {
    startFrame: 12,
    endFrame: 23,
    damage: 26,
    range: 72,
    launchY: 300,
    juggleRole: 'finisher',
    groundBounce: true,
    guardBreak: true,
  }),
  airReturn: attackHitProfile('airReturn', {
    startFrame: 8,
    endFrame: 17,
    damage: 15,
    range: 70,
    launchY: -90,
    juggleRole: 'sustain',
    relaunchSpeed: 170,
    floatSeconds: 0.09,
  }),
  airSpin: attackHitProfile('airSpin', {
    startFrame: 4,
    endFrame: 8,
    damage: 20,
    range: 76,
    launchY: -150,
    juggleRole: 'sustain',
    relaunchSpeed: 250,
    floatSeconds: 0.17,
    guardBreak: true,
  }),
  airCross: attackHitProfile('airCross', {
    startFrame: 11,
    endFrame: 23,
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

function convexHull(points) {
  const unique = [
    ...new Map(
      points.map((pointValue) => [`${pointValue.x}:${pointValue.y}`, pointValue]),
    ).values(),
  ];
  if (unique.length <= 3) return unique;
  unique.sort((left, right) => left.x - right.x || left.y - right.y);
  const cross = (origin, left, right) =>
    (left.x - origin.x) * (right.y - origin.y) - (left.y - origin.y) * (right.x - origin.x);
  const lower = [];
  for (const pointValue of unique) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), pointValue) <= 0) lower.pop();
    lower.push(pointValue);
  }
  const upper = [];
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const pointValue = unique[index];
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), pointValue) <= 0) upper.pop();
    upper.push(pointValue);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function resolveEquipmentAttackProfile(motionId, motionFrame, equipmentProfile, skillProfile) {
  const baseProfile = BASE_ATTACK_HIT_PROFILES[motionId];
  if (!baseProfile || !motionFrame) return null;
  const baseMotionFrame = combatMotionFrameData(motionId);
  const startupShift = motionFrame.startupFrames - baseMotionFrame.startupFrames;
  const startFrame = baseProfile.frame.startFrame + startupShift;
  const endFrame = baseProfile.frame.endFrame + startupShift;
  const hitPulseCount = Math.max(1, skillProfile.spinHitCount);
  const hitPulseFrames = baseProfile.hitPulseFrames
    ?.slice(0, hitPulseCount)
    .map((frame) => frame + startupShift);
  return Object.freeze({
    ...baseProfile,
    damage: baseProfile.damage * equipmentProfile.attack.damageScale * skillProfile.damageScale,
    range: baseProfile.range * equipmentProfile.attack.rangeScale,
    hitstunScale: equipmentProfile.attack.hitstunScale,
    launchY: baseProfile.launchY * equipmentProfile.attack.launchScale,
    ...(baseProfile.relaunchSpeed
      ? { relaunchSpeed: baseProfile.relaunchSpeed * equipmentProfile.attack.launchScale }
      : {}),
    ...(baseProfile.contactSpacings
      ? { contactSpacings: Object.freeze(baseProfile.contactSpacings.slice(0, hitPulseCount)) }
      : {}),
    frame: Object.freeze({ startFrame, endFrame }),
    start: startFrame / motionFrame.durationFrames,
    end: endFrame / motionFrame.durationFrames,
    ...(hitPulseFrames
      ? {
          hitPulseFrames: Object.freeze(hitPulseFrames),
          hitPulses: Object.freeze(
            hitPulseFrames.map((frame) => frame / motionFrame.durationFrames),
          ),
        }
      : {}),
  });
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

function timePhaseForHour(hour) {
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

export class GameScene extends SceneNode {
  constructor({ mapDefinition, progressionSnapshot = null } = {}) {
    super('GameScene');
    if (!mapDefinition)
      throw new TypeError('GameScene에는 authored mapDefinition 주입이 필요합니다.');
    const initialProgression =
      progressionSnapshot ?? createProgressionSnapshot(DEFAULT_EQUIPMENT_PROFILE_ID);
    this.progressionSnapshot = mergeProgressionSnapshot(initialProgression);
    this.equipmentProfile = getEquipmentProfile(this.progressionSnapshot.equippedEquipmentId);
    const skillProfile = this.getCombatSkillProfile();
    this.combatCommands = new CombatCommandController({
      timingProfile: this.equipmentProfile.combatTiming,
      commandProfile: skillProfile,
    });
    this.combatCameraFeedback = new CombatCameraFeedback();
    this.combatEvents = new CombatEventBuffer();
    this.journeyProgress = new FirstJourneyProgress(this.progressionSnapshot.firstJourney);
    this.regionExpansionProgress = new RegionExpansionProgress(
      this.progressionSnapshot.regionExpansion,
    );
    this.storyInteractionOwner = new StoryInteractionOwner();
    this.mapRuntime = new MapRuntime(mapDefinition, {
      worldContext: {
        timePhase: 'day',
        weather: 'clear',
        storyFlags: {
          ...this.journeyProgress.snapshot().storyFlags,
          ...this.regionExpansionProgress.snapshot().storyFlags,
        },
      },
    });
    this.renderFrameCreated = this.ownSignal(new Signal('renderFrameCreated'));
    this.roomChanged = this.ownSignal(new Signal('roomChanged'));
    this.progressionChanged = this.ownSignal(new Signal('progressionChanged'));
    this.roomSceneNode = null;
    this.roomSceneConnections = [];
    this.statusNode = this.addChild(new GameStatusNode(this));
    this.playerStatusChanged = this.statusNode.playerStatusChanged;
    this.worldStatusChanged = this.statusNode.worldStatusChanged;
    this.reset();
  }

  getCombatSkillProfile() {
    return getCombatSkillLevelProfile(this.progressionSnapshot.combatSkillLevel);
  }

  getProgressionSnapshot() {
    return this.progressionSnapshot;
  }

  restoreProgression(snapshot) {
    assertProgressionSnapshot(snapshot);
    const nextSnapshot = mergeProgressionSnapshot(snapshot);
    const nextEquipment = getEquipmentProfile(nextSnapshot.equippedEquipmentId);
    const nextJourney = new FirstJourneyProgress(nextSnapshot.firstJourney);
    const nextRegionExpansion = new RegionExpansionProgress(nextSnapshot.regionExpansion);

    this.progressionSnapshot = nextSnapshot;
    this.equipmentProfile = nextEquipment;
    this.journeyProgress = nextJourney;
    this.regionExpansionProgress = nextRegionExpansion;
    this.reset();
    return this.progressionSnapshot;
  }

  onPhysicsProcess(deltaSeconds, context = {}) {
    if (context.active === false) return;
    this.update(deltaSeconds, context.inputSnapshot ?? {}, context.simulationSettings ?? {});
  }

  onEnterTree() {
    if (this.roomSceneNode) this.connectRoomSceneSignals(this.roomSceneNode);
  }

  reset() {
    const journey = this.journeyProgress.restore(this.progressionSnapshot.firstJourney);
    const regionExpansion = this.regionExpansionProgress.restore(
      this.progressionSnapshot.regionExpansion,
    );
    this.worldTimeHours = 10;
    this.timePhase = timePhaseForHour(this.worldTimeHours);
    this.mapRuntime.setWorldContext({
      timePhase: this.timePhase,
      weather: 'clear',
      storyFlags: { ...journey.storyFlags, ...regionExpansion.storyFlags },
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
    this.combatFacingCycle = 0;
    this.combatFacing = 1;
    this.landingRecoverySeconds = 0;
    this.isGrounded = true;
    this.jumpWasPressed = false;
    this.guardWasPressed = false;
    this.movementIntent = 0;
    this.rollState = null;
    this.hitStopSeconds = 0;
    this.playerMaxHealth = journey.fieldWardActive ? 120 : 100;
    this.playerHealth = this.playerMaxHealth;
    this.playerHitstunSeconds = 0;
    this.playerInvulnerableSeconds = 0;
    this.playerKoSeconds = 0;
    this.playerBlockImpactSeconds = 0;
    this.playerBlockImpactStrength = 0;
    this.playerBlockstunSeconds = 0;
    this.playerBlockstunDurationSeconds = 0;
    this.playerRetaliationPending = false;
    this.playerRetaliationSeconds = 0;
    this.pendingPlayerKnockbackX = 0;
    this.pendingPlayerKnockbackDecayRate = 0.02;
    this.playerKnockbackVelocityX = 0;
    this.playerKnockbackDecayRate = 0.02;
    this.airHeavyConnectedSequence = 0;
    this.playerWeaponContactHistory = [];
    this.playerWeaponContactGeometry = null;
    this.progressionNotice = `훈련 인장은 학습 조건, 원정 Gold는 장비·command 성장 비용입니다.`;
    this.storyInteractionOwner.reset();
    this.lastJumpSequence = 0;
    this.facing = mapSnapshot.spawn?.facing ?? 1;
    this.portalTransitionPresentation = null;
    this.cameraPosition = { ...mapSnapshot.cameraPosition };
    this.previousCameraPosition = { ...this.cameraPosition };
    this.equipmentProfile = getEquipmentProfile(this.progressionSnapshot.equippedEquipmentId);
    this.combatCommands.reset();
    this.combatCommands.setTimingProfile(this.equipmentProfile.combatTiming);
    this.combatCommands.setCommandProfile(this.getCombatSkillProfile());
    this.combatCameraFeedback.reset();
    this.combatEvents.reset();
    this.replaceRoomScene(mapSnapshot, { resetExisting: true });
    this.statusNode.publish({ force: true });
  }

  setVisualQaLocation({ regionId, roomId, x }) {
    const mapSnapshot = this.mapRuntime.setActiveLocation(regionId, roomId);
    this.replaceRoomScene(mapSnapshot, { resetExisting: true });
    const room = this.mapRuntime.getActiveRoom();
    const minX = room.movementBounds?.minX ?? room.bounds.x;
    const maxX = room.movementBounds?.maxX ?? room.bounds.x + room.bounds.width;
    const requestedX = room.bounds.x + (x ?? 140);
    const playerX = Math.max(
      minX + CHARACTER_BOUNDARY_HALF_WIDTH,
      Math.min(maxX - CHARACTER_BOUNDARY_HALF_WIDTH, requestedX),
    );
    this.position = {
      x: playerX,
      y: this.mapRuntime.getGroundYAt(playerX) - CHARACTER_FOOT_OFFSET,
    };
    this.previousPosition = { ...this.position };
    this.cameraPosition = { ...mapSnapshot.cameraPosition };
    this.previousCameraPosition = { ...this.cameraPosition };
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.statusNode.publish({ force: true });
    return mapSnapshot;
  }

  setVisualQaCombatScenario(scenarioId, phase = 'active') {
    const encounter = this.roomSceneNode?.encounter;
    if (!encounter?.enemy)
      throw new Error('Combat Visual QA에는 active training encounter가 필요합니다.');
    const enemy = encounter.enemy;
    const groundY = this.mapRuntime.getActiveRoom().groundY;
    const playerX = this.position.x;
    this.position = { x: playerX, y: groundY - CHARACTER_FOOT_OFFSET };
    this.previousPosition = { ...this.position };
    this.facing = 1;
    this.isGrounded = true;
    this.verticalVelocity = 0;
    this.rollState = null;
    this.landingRecoverySeconds = 0;
    this.playerBlockImpactSeconds = 0;
    this.playerBlockImpactStrength = 0;
    this.playerHitstunSeconds = 0;
    this.playerRetaliationSeconds = 0;
    this.combatEvents.reset();
    this.combatCommands.reset();
    enemy.position = { x: playerX + 85, y: groundY };
    enemy.velocityX = 0;
    enemy.velocityY = 0;
    enemy.rotation = 0;
    enemy.aiState = 'idle';
    enemy.aiSeconds = 0;
    enemy.attackKind = 'light';
    enemy.hitstunSeconds = 0;
    enemy.punishWindowOpen = false;
    enemy.retaliationInvulnerableSeconds = 0;
    encounter.lastVisualContact = Object.freeze({
      attacker: 'player',
      sequence: 1,
      pulseIndex: 0,
      contact: true,
      gap: 0,
      simulationGap: 0,
      weaponItemId: 'sword-blade',
      hurtItemId: 'combat-enemy-training-mask',
      position: Object.freeze({ x: playerX + 62, y: groundY - 72 }),
    });
    encounter.contactSeconds =
      phase === 'active' &&
      ['combat-hit', 'combat-block', 'combat-evade', 'combat-punish', 'combat-launch'].includes(
        scenarioId,
      )
        ? 0.18
        : 0;

    if (
      ![
        'combat-hit',
        'combat-block',
        'combat-evade',
        'combat-punish',
        'combat-launch',
        'combat-landing',
        'combat-retaliation',
        'combat-strong-windup',
        'combat-guard-break',
      ].includes(scenarioId)
    ) {
      throw new Error(`지원하지 않는 Combat Visual QA scenario입니다: ${scenarioId}`);
    }
    if (!['start', 'active', 'end'].includes(phase)) {
      throw new Error(`지원하지 않는 Combat Visual QA phase입니다: ${phase}`);
    }
    if (phase === 'end') return;

    const active = phase === 'active';

    const emit = (type, payload = {}) =>
      this.combatEvents.emit(type, {
        actor: 'player',
        target: 'enemy',
        position: encounter.lastVisualContact.position,
        direction: 1,
        strength: 1.2,
        ...payload,
      });
    const startMotion = (motionId, elapsedSeconds) => {
      this.combatCommands.start(motionId);
      this.combatCommands.active.elapsedSeconds = elapsedSeconds;
    };

    switch (scenarioId) {
      case 'combat-hit':
        startMotion('slash', active ? 0.25 : 0.04);
        if (active) {
          enemy.aiState = 'hitstun';
          enemy.hitstunSeconds = 0.18;
          enemy.hitFlashSeconds = 0.12;
          emit(COMBAT_EVENT_TYPE.HIT);
        }
        break;
      case 'combat-block':
        this.combatCommands.update(0, { guard: true });
        this.playerBlockImpactSeconds = active ? 0.14 : 0;
        this.playerBlockImpactStrength = active ? 1 : 0;
        encounter.lastVisualContact = Object.freeze({
          ...encounter.lastVisualContact,
          attacker: 'enemy',
          weaponItemId: 'combat-enemy-weapon',
          hurtItemId: 'shield',
          position: Object.freeze({ x: playerX + 25, y: groundY - 70 }),
        });
        if (active) emit(COMBAT_EVENT_TYPE.GUARD);
        break;
      case 'combat-evade':
        this.rollState = {
          direction: 1,
          elapsedSeconds: ROLL_DURATION_SECONDS * (active ? 0.5 : 0.08),
          durationSeconds: ROLL_DURATION_SECONDS,
        };
        encounter.lastVisualContact = Object.freeze({
          ...encounter.lastVisualContact,
          attacker: 'enemy',
          weaponItemId: 'combat-enemy-weapon',
          hurtItemId: 'uniform-front-panel',
          position: Object.freeze({ x: playerX + 20, y: groundY - 68 }),
        });
        if (active) emit(COMBAT_EVENT_TYPE.EVADE, { position: this.position });
        break;
      case 'combat-punish':
        startMotion('heavy', active ? 0.38 : 0.05);
        enemy.aiState = 'recovery';
        enemy.aiSeconds = 0.18;
        enemy.recoveryDurationSeconds = 0.3;
        enemy.recoverySource = 'attack';
        enemy.punishWindowOpen = true;
        if (active) emit(COMBAT_EVENT_TYPE.PUNISH, { outcome: 'back-punish' });
        break;
      case 'combat-launch':
        startMotion('rising', active ? 0.3 : 0.05);
        if (active) {
          enemy.position = { x: playerX + 85, y: groundY - 88 };
          enemy.velocityY = -240;
          enemy.juggleHits = 1;
          enemy.aiState = 'hitstun';
          enemy.hitstunSeconds = 0.2;
          emit(COMBAT_EVENT_TYPE.LAUNCH);
        }
        break;
      case 'combat-landing':
        this.landingRecoverySeconds = active ? LANDING_RECOVERY_SECONDS : 0;
        if (!active) {
          this.isGrounded = false;
          this.position = { x: this.position.x, y: this.position.y - 18 };
          this.previousPosition = { ...this.position };
          this.verticalVelocity = 90;
        } else {
          emit(COMBAT_EVENT_TYPE.LANDING, {
            target: 'player',
            position: { x: this.position.x, y: groundY },
            strength: 0.6,
            durationSeconds: LANDING_RECOVERY_SECONDS,
          });
        }
        break;
      case 'combat-retaliation':
        startMotion('slash', active ? 0.25 : 0.04);
        enemy.retaliationInvulnerableSeconds = active ? 0.55 : 0;
        enemy.aiState = 'recovery';
        enemy.aiSeconds = 0.08;
        enemy.recoveryDurationSeconds = 0.08;
        enemy.recoverySource = 'retaliation';
        break;
      case 'combat-strong-windup':
        enemy.aiState = 'windup';
        enemy.attackKind = 'heavy';
        enemy.attackFacing = -1;
        enemy.aiSeconds = active ? combatFramesToSeconds(8) : combatFramesToSeconds(28);
        break;
      case 'combat-guard-break':
        if (active) {
          encounter.lastVisualContact = Object.freeze({
            ...encounter.lastVisualContact,
            attacker: 'enemy',
            weaponItemId: 'combat-enemy-weapon',
            hurtItemId: 'shield',
            position: Object.freeze({ x: playerX + 25, y: groundY - 70 }),
          });
          encounter.contactSeconds = 0.18;
          this.combatCommands.update(0, { guard: true });
          this.combatCommands.applyGuardContact({ guardBreak: true });
          this.playerBlockImpactSeconds = 0.22;
          this.playerBlockImpactStrength = 1.35;
          this.playerBlockstunSeconds = combatFramesToSeconds(28);
          this.playerBlockstunDurationSeconds = this.playerBlockstunSeconds;
          emit(COMBAT_EVENT_TYPE.GUARD_BREAK, {
            actor: 'player',
            target: 'enemy',
            position: encounter.lastVisualContact.position,
            strength: 2,
          });
        }
        break;
      default:
        throw new Error(`지원하지 않는 Combat Visual QA scenario입니다: ${scenarioId}`);
    }
    this.statusNode.publish({ force: true });
  }

  setVisualQaPoseScenario(scenarioId) {
    const groundY = this.mapRuntime.getActiveRoom().groundY;
    this.position = { x: this.position.x, y: groundY - CHARACTER_FOOT_OFFSET };
    this.previousPosition = { ...this.position };
    this.facing = 1;
    this.isGrounded = true;
    this.verticalVelocity = 0;
    this.movementIntent = 0;
    this.rollState = null;
    this.landingRecoverySeconds = 0;
    this.playerHitstunSeconds = 0;
    this.combatCommands.reset();

    switch (scenarioId) {
      case 'pose-idle':
        break;
      case 'pose-move':
        this.movementIntent = 1;
        break;
      case 'pose-guard':
        this.combatCommands.update(0, { guard: true });
        break;
      case 'pose-roll':
        this.rollState = {
          direction: 1,
          elapsedSeconds: ROLL_DURATION_SECONDS * 0.5,
          durationSeconds: ROLL_DURATION_SECONDS,
        };
        break;
      case 'pose-ground-attack':
        this.combatCommands.start('slash');
        this.combatCommands.active.elapsedSeconds = 0.2;
        break;
      case 'pose-air-attack':
        this.isGrounded = false;
        this.position = { x: this.position.x, y: this.position.y - 75 };
        this.previousPosition = { ...this.position };
        this.verticalVelocity = -65;
        this.combatCommands.start('airSlash');
        this.combatCommands.active.elapsedSeconds = 0.16;
        break;
      case 'pose-hit':
        this.playerHitstunSeconds = 0.18;
        break;
      default:
        throw new Error(`지원하지 않는 pose Visual QA scenario입니다: ${scenarioId}`);
    }
  }

  toggleTimePhase() {
    this.worldTimeHours = this.timePhase === 'night' ? 10 : 21;
    this.updateTimePhase();
    const status = this.getWorldStatus();
    this.statusNode.publish({ force: true });
    return status;
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

  syncJourneyWorldContext() {
    this.mapRuntime.setWorldContext({
      ...this.mapRuntime.getWorldContext(),
      storyFlags: {
        ...this.journeyProgress.snapshot().storyFlags,
        ...this.regionExpansionProgress.snapshot().storyFlags,
      },
    });
  }

  emitDurableProgressionChanged() {
    this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
      firstJourney: this.journeyProgress.persistenceSnapshot(),
      regionExpansion: this.regionExpansionProgress.persistenceSnapshot(),
    });
    this.progressionChanged.emit(this.progressionSnapshot);
    return this.progressionSnapshot;
  }

  advanceWorldTime(deltaSeconds) {
    this.worldTimeHours = (this.worldTimeHours + deltaSeconds * WORLD_HOURS_PER_SECOND + 24) % 24;
    this.updateTimePhase();
  }

  canStartPortalTransition() {
    if (this.mapRuntime.getTransition()) return false;
    const combatState = this.combatCommands.snapshot();
    return this.isGrounded && !this.rollState && combatState.id === 'idle';
  }

  beginPortalTransition(portal) {
    const transition = this.mapRuntime.beginPortalTransition(portal.id);
    this.portalTransitionPresentation = {
      startPosition: { ...this.position },
      destinationPosition: { ...transition.destinationPosition },
      sourceCameraPosition: { ...this.cameraPosition },
      destinationCameraPosition: { ...transition.destinationCameraPosition },
    };
    this.verticalVelocity = 0;
    this.airComboFloatSeconds = 0;
    this.airComboGravityScale = 1;
    this.isGrounded = true;
    return true;
  }

  tryPortalTransition() {
    if (!this.canStartPortalTransition()) return false;
    const portal = this.mapRuntime.findPortalAt({
      x: this.position.x,
      y: this.position.y + CHARACTER_FOOT_OFFSET,
    });
    return portal ? this.beginPortalTransition(portal) : false;
  }

  getStoryInteractionContext() {
    const mapSnapshot = this.mapRuntime.getResolvedSnapshot();
    return Object.freeze({
      entities: mapSnapshot.entities,
      playerPosition: Object.freeze({ ...this.position }),
    });
  }

  updatePortalTransition(deltaSeconds) {
    const presentation = this.portalTransitionPresentation;
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
    this.cameraPosition = {
      x: lerp(
        presentation.sourceCameraPosition.x,
        presentation.destinationCameraPosition.x,
        amount,
      ),
      y: lerp(
        presentation.sourceCameraPosition.y,
        presentation.destinationCameraPosition.y,
        amount,
      ),
    };

    if (!completion) return true;
    this.position = { ...completion.position };
    this.cameraPosition = { ...presentation.destinationCameraPosition };
    this.portalTransitionPresentation = null;
    this.storyInteractionOwner.reset();
    this.replaceRoomScene(this.mapRuntime.getResolvedSnapshot());
    const journeyTransition = this.journeyProgress.recordPortal(completion.portalId);
    const regionExpansionTransition = this.regionExpansionProgress.recordPortal(
      completion.portalId,
    );
    if (journeyTransition.changed || regionExpansionTransition.changed) {
      this.syncJourneyWorldContext();
      this.emitDurableProgressionChanged();
      this.statusNode.publish({ force: true });
    }
    this.roomChanged.emit(
      Object.freeze({
        portalId: completion.portalId,
        active: Object.freeze({ ...completion.active }),
      }),
    );
    return true;
  }

  updateCameraFollow(deltaSeconds) {
    const snapshot = this.mapRuntime.getResolvedSnapshot();
    const bounds = snapshot.cameraBounds;
    const minimumX = bounds.x + 480;
    const maximumX = bounds.x + bounds.width - 480;
    const targetX = Math.max(minimumX, Math.min(maximumX, this.position.x));
    const targetY = bounds.y + 270;
    const followAmount = 1 - Math.exp(-10 * deltaSeconds);
    this.cameraPosition.x = lerp(this.cameraPosition.x, targetX, followAmount);
    this.cameraPosition.y = lerp(this.cameraPosition.y, targetY, followAmount);
  }

  canManageProgression() {
    const location = this.mapRuntime.getActiveLocation();
    return (
      location.roomId === 'academy-plaza' &&
      !this.mapRuntime.getTransition() &&
      this.combatCommands.snapshot().id === 'idle'
    );
  }

  commitProgression(transaction, { equipmentChanged = false, skillChanged = false } = {}) {
    if (!transaction.changed) return transaction;
    const nextSnapshot = transaction.snapshot;
    const nextEquipment = getEquipmentProfile(nextSnapshot.equippedEquipmentId);
    const nextSkill = getCombatSkillLevelProfile(nextSnapshot.combatSkillLevel);
    if (equipmentChanged) this.combatCommands.setTimingProfile(nextEquipment.combatTiming);
    if (skillChanged) this.combatCommands.setCommandProfile(nextSkill);
    this.progressionSnapshot = nextSnapshot;
    this.equipmentProfile = nextEquipment;
    this.journeyProgress.restore(nextSnapshot.firstJourney);
    this.regionExpansionProgress.restore(nextSnapshot.regionExpansion);
    this.progressionChanged.emit(this.progressionSnapshot);
    this.statusNode.publish({ force: true });
    return transaction;
  }

  unavailableProgressionTransaction() {
    return Object.freeze({
      changed: false,
      reason: PROGRESSION_TRANSACTION_REASON.UNAVAILABLE,
      snapshot: this.progressionSnapshot,
    });
  }

  selectEquipment(profileId) {
    if (!this.canManageProgression()) return this.unavailableProgressionTransaction();
    const profile = getEquipmentProfile(profileId);
    const transaction = selectProgressionEquipment(this.progressionSnapshot, profile.id);
    if (!transaction.changed) return transaction;
    this.progressionNotice = `${profile.shortLabel} 장착 · frame/거리/경직 profile 변경`;
    return this.commitProgression(transaction, { equipmentChanged: true });
  }

  purchaseEquipment(profileId) {
    if (!this.canManageProgression()) return this.unavailableProgressionTransaction();
    const profile = getEquipmentProfile(profileId);
    const purchase = purchaseProgressionEquipment(this.progressionSnapshot, {
      profileId: profile.id,
      goldCost: profile.goldCost,
      trainingMarkRequirement: profile.trainingMarkRequirement,
    });
    if (!purchase.changed) {
      this.progressionNotice =
        purchase.reason === PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_TRAINING
          ? `${profile.shortLabel} 해금에 훈련 인장 ${profile.trainingMarkRequirement}개가 필요합니다.`
          : purchase.reason === PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_GOLD
            ? `${profile.shortLabel} 구매에 원정 Gold ${profile.goldCost}가 필요합니다.`
            : '이미 소유한 장비입니다.';
      this.statusNode.publish({ force: true });
      return purchase;
    }
    const equip = selectProgressionEquipment(purchase.snapshot, profile.id);
    const transaction = Object.freeze({
      changed: true,
      reason: PROGRESSION_TRANSACTION_REASON.PURCHASED,
      snapshot: equip.snapshot,
    });
    this.progressionNotice = `${profile.shortLabel} 구매·장착 완료`;
    return this.commitProgression(transaction, { equipmentChanged: true });
  }

  trainCombatSkill() {
    if (!this.canManageProgression()) return this.unavailableProgressionTransaction();
    const currentLevel = this.progressionSnapshot.combatSkillLevel;
    if (currentLevel >= 3) {
      const transaction = trainProgressionCombatSkill(this.progressionSnapshot);
      this.progressionNotice = 'Command 수련은 이미 최고 단계입니다.';
      this.statusNode.publish({ force: true });
      return transaction;
    }
    const targetLevel = currentLevel + 1;
    const goldCost = getCombatSkillUpgradeCost(targetLevel);
    const trainingMarkRequirement = getCombatSkillTrainingMarkRequirement(targetLevel);
    const transaction = trainProgressionCombatSkill(this.progressionSnapshot, {
      goldCost,
      trainingMarkRequirement,
    });
    if (!transaction.changed) {
      this.progressionNotice =
        transaction.reason === PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_TRAINING
          ? `Lv.${targetLevel} 수련에 훈련 인장 ${trainingMarkRequirement}개가 필요합니다.`
          : `Lv.${targetLevel} 수련에 원정 Gold ${goldCost}가 필요합니다.`;
      this.statusNode.publish({ force: true });
      return transaction;
    }
    const skill = getCombatSkillLevelProfile(targetLevel);
    this.progressionNotice = `Command Lv.${targetLevel} · ${skill.label} 해금`;
    return this.commitProgression(transaction, { skillChanged: true });
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

    if (!this.combatCommands.trySpendAction('roll')) return false;

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

  getAttackHitProfile(motionId) {
    return resolveEquipmentAttackProfile(
      motionId,
      this.combatCommands.getMotionFrameData(motionId),
      this.equipmentProfile,
      this.getCombatSkillProfile(),
    );
  }

  replaceRoomScene(
    snapshot = this.mapRuntime.getResolvedSnapshot(),
    { resetExisting = false } = {},
  ) {
    const activeRoomScene = this.roomSceneNode;
    if (
      activeRoomScene?.location.regionId === snapshot.active.regionId &&
      activeRoomScene?.location.roomId === snapshot.active.roomId
    ) {
      if (resetExisting) activeRoomScene.resetEncounter();
      return activeRoomScene;
    }

    if (activeRoomScene) {
      if (activeRoomScene.parent === this) this.removeChild(activeRoomScene);
      activeRoomScene.dispose();
    }

    const spinProfile = this.getAttackHitProfile('spin');
    const roomScene = ROOM_SCENE.instantiate({
      snapshot,
      spinContact: {
        hitPulses: spinProfile.hitPulses,
        contactSpacings: spinProfile.contactSpacings,
      },
    });
    this.roomSceneNode = roomScene;
    this.connectRoomSceneSignals(roomScene);
    this.addChild(roomScene);
    return roomScene;
  }

  connectRoomSceneSignals(roomScene) {
    this.roomSceneConnections = this.roomSceneConnections.filter(
      (connection) => connection.connected,
    );
    if (this.roomSceneConnections.length > 0) return;
    this.roomSceneConnections = [
      this.connectTo(roomScene.playerResultResolved, (result) =>
        this.applyTrainingEncounterPlayerResult(result),
      ),
      this.connectTo(roomScene.combatEventOccurred, ({ type, payload }) =>
        this.combatEvents.emit(type, payload),
      ),
      this.connectTo(roomScene.cameraFeedbackOccurred, (feedback) =>
        this.combatCameraFeedback.trigger(feedback),
      ),
      this.connectTo(roomScene.encounterCompleted, (result) =>
        this.resolveJourneyEncounter(result),
      ),
    ];
  }

  resolveJourneyEncounter(result) {
    if (result.profileId === 'training') {
      const transaction = awardTrainingMarks(this.progressionSnapshot, TRAINING_CLEAR_REWARD);
      this.progressionNotice = `훈련 골렘 격파 · 인장 +${TRAINING_CLEAR_REWARD}`;
      this.commitProgression(transaction);
      return Object.freeze({
        changed: true,
        kind: 'training-cleared',
        reward: TRAINING_CLEAR_REWARD,
        snapshot: transaction.snapshot,
      });
    }
    const regionExpansionEncounter = result.profileId.startsWith('glasswind-');
    const resolution = regionExpansionEncounter
      ? this.regionExpansionProgress.resolveEncounter(result.profileId)
      : this.journeyProgress.resolveEncounter(result.profileId, result.entityId);
    if (!resolution.changed) return resolution;
    if (resolution.kind === 'field-guardian-defeated') {
      this.playerMaxHealth += resolution.maxHealthBonus;
      this.playerHealth = Math.min(
        this.playerMaxHealth,
        this.playerHealth + resolution.maxHealthBonus,
      );
    }
    this.syncJourneyWorldContext();
    this.emitDurableProgressionChanged();
    this.statusNode.publish({ force: true });
    return resolution;
  }

  updateJourneyTriggers() {
    const snapshot = this.mapRuntime.getResolvedSnapshot();
    for (const trigger of snapshot.triggers ?? []) {
      const radius = Number.isFinite(trigger.radius) ? trigger.radius : 48;
      const distance = Math.hypot(
        this.position.x - trigger.position.x,
        this.position.y + CHARACTER_FOOT_OFFSET - trigger.position.y,
      );
      if (distance > radius) continue;

      if (trigger.kind === 'checkpoint') {
        const result = this.journeyProgress.activateCheckpoint(trigger.qualifiedId);
        if (!result.changed) continue;
        this.playerHealth = this.playerMaxHealth;
        this.syncJourneyWorldContext();
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }

      if (trigger.kind === 'boss-reward') {
        const result = this.journeyProgress.claimBossReward(trigger.gold);
        if (!result.changed) continue;
        this.syncJourneyWorldContext();
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }

      if (trigger.kind === 'glasswind-checkpoint') {
        const result = this.regionExpansionProgress.activateCheckpoint(trigger.qualifiedId);
        if (!result.changed) continue;
        this.playerHealth = this.playerMaxHealth;
        this.syncJourneyWorldContext();
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }

      if (trigger.kind === 'glasswind-boss-reward') {
        const result = this.regionExpansionProgress.claimBossReward(trigger.gold);
        if (!result.changed) continue;
        this.syncJourneyWorldContext();
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }
    }
  }

  respawnPlayerAfterKo() {
    const journey = this.journeyProgress.snapshot();
    const regionExpansion = this.regionExpansionProgress.snapshot();
    const activeRegionId = this.mapRuntime.getActiveLocation().regionId;
    const checkpointId =
      activeRegionId === 'glasswind-region'
        ? regionExpansion.checkpointActivated
          ? regionExpansion.checkpointId
          : null
        : journey.checkpointActivated
          ? journey.checkpointId
          : null;
    const checkpoint = this.mapRuntime.getTriggerLocation(checkpointId);
    if (checkpoint) {
      const mapSnapshot = this.mapRuntime.setActiveLocation(checkpoint.regionId, checkpoint.roomId);
      this.replaceRoomScene(mapSnapshot);
      this.position = {
        x: checkpoint.position.x,
        y: checkpoint.position.y - CHARACTER_FOOT_OFFSET,
      };
      this.cameraPosition = { ...mapSnapshot.cameraPosition };
    } else {
      const activeRoom = this.mapRuntime.getActiveRoom();
      const respawnX = (activeRoom.movementBounds?.minX ?? activeRoom.bounds.x) + 140;
      this.position = {
        x: respawnX,
        y: this.mapRuntime.getGroundYAt(respawnX) - CHARACTER_FOOT_OFFSET,
      };
      this.roomSceneNode?.resetEncounter();
    }
    this.previousPosition = { ...this.position };
    this.previousCameraPosition = { ...this.cameraPosition };
    this.playerHealth = this.playerMaxHealth;
    this.verticalVelocity = 0;
    this.pendingPlayerKnockbackX = 0;
    this.playerKnockbackVelocityX = 0;
    this.playerBlockstunSeconds = 0;
    this.playerBlockImpactSeconds = 0;
    this.playerRetaliationPending = false;
    this.playerRetaliationSeconds = 0;
    this.isGrounded = true;
  }

  applyTrainingEncounterPlayerResult(result) {
    if (result.kind === 'guard' || result.kind === 'guard-break') {
      const staminaResult = this.combatCommands.applyGuardContact({
        guardBreak: result.kind === 'guard-break',
      });
      this.playerBlockImpactSeconds = result.blockImpactSeconds;
      this.playerBlockImpactStrength =
        result.blockImpactStrength * this.equipmentProfile.guard.impactScale;
      const authoredBlockstunSeconds =
        result.blockstunSeconds * this.equipmentProfile.guard.blockstunScale;
      const blockstunSeconds = staminaResult.broken
        ? Math.max(authoredBlockstunSeconds, combatFramesToSeconds(28))
        : authoredBlockstunSeconds;
      this.playerBlockstunSeconds = Math.max(this.playerBlockstunSeconds, blockstunSeconds);
      this.playerBlockstunDurationSeconds = blockstunSeconds;
      this.hitStopSeconds = Math.max(this.hitStopSeconds, result.hitStopSeconds);
      if (staminaResult.broken) this.rollState = null;
      return;
    }

    if (result.kind === 'hit') {
      const damage = Math.max(
        1,
        Math.round(result.damage * this.equipmentProfile.defense.damageTakenScale),
      );
      this.playerHealth = Math.max(0, this.playerHealth - damage);
      this.pendingPlayerKnockbackX = result.knockbackVelocityX;
      this.pendingPlayerKnockbackDecayRate = result.knockbackDecayRate;
      this.playerHitstunSeconds = result.hitstunSeconds;
      this.playerRetaliationPending = this.playerHealth > 0;
      this.playerInvulnerableSeconds = result.invulnerableSeconds;
      this.hitStopSeconds = Math.max(this.hitStopSeconds, result.hitStopSeconds);
      this.combatCommands.interruptForHit();
      this.rollState = null;
      if (this.playerHealth === 0) this.playerKoSeconds = 1;
    } else {
      this.hitStopSeconds = Math.max(this.hitStopSeconds, result.hitStopSeconds ?? 0);
    }

    const motion = result.playerMotion;
    if (!motion) return;
    if (Number.isFinite(motion.positionXDelta)) this.position.x += motion.positionXDelta;
    if (Number.isFinite(motion.positionY)) this.position.y = motion.positionY;
    if (Number.isFinite(motion.verticalVelocity)) this.verticalVelocity = motion.verticalVelocity;
    if (typeof motion.isGrounded === 'boolean') this.isGrounded = motion.isGrounded;
    if (Number.isFinite(motion.airComboFloatSeconds)) {
      this.airComboFloatSeconds = motion.airComboFloatSeconds;
    }
    if (Number.isFinite(motion.airComboGravityScale)) {
      this.airComboGravityScale = motion.airComboGravityScale;
    }
    if (Number.isFinite(motion.airComboFacing)) this.airComboFacing = motion.airComboFacing;
    if (Number.isSafeInteger(motion.airHeavyConnectedSequence)) {
      this.airHeavyConnectedSequence = motion.airHeavyConnectedSequence;
    }
  }

  updatePlayerWeaponContactGeometry(combatState) {
    if (!this.getAttackHitProfile(combatState.id)) {
      this.playerWeaponContactHistory = [];
      this.playerWeaponContactGeometry = null;
      return null;
    }
    const blade = this.createPlayerCombatPresentationItems(combatState).find(
      (item) => item.id === 'sword-blade',
    );
    if (!blade) return null;
    if (this.playerWeaponContactGeometry?.comboCycle !== combatState.comboCycle) {
      this.playerWeaponContactHistory = [];
    }
    this.playerWeaponContactHistory.push(blade.points);
    if (this.playerWeaponContactHistory.length > 3) this.playerWeaponContactHistory.shift();
    const sweepPoints = convexHull(this.playerWeaponContactHistory.flat());
    this.playerWeaponContactGeometry = Object.freeze({
      sequence: combatState.sequence,
      comboCycle: combatState.comboCycle,
      position: Object.freeze({ ...this.position }),
      bladePoints: Object.freeze([...blade.points]),
      sweepPoints: Object.freeze(sweepPoints),
    });
    return this.playerWeaponContactGeometry;
  }

  createPlayerCombatPresentationItems(combatState) {
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
      animationTime: this.animationTime,
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
    return createCharacterItems(
      this.position,
      this.facing,
      targetPose,
      bonePose,
      CHARACTER_RENDER_SCALE,
      0,
      this.equipmentProfile.presentation.weaponLengthScale,
    );
  }

  createTrainingEncounterFrame(combatState, attackProfile) {
    const playerItems = this.createPlayerCombatPresentationItems(combatState);
    const contactGeometry = this.playerWeaponContactGeometry;
    const playerWeaponItems = contactGeometry
      ? Object.freeze([
          Object.freeze({ id: 'sword-blade', points: contactGeometry.bladePoints }),
          Object.freeze({ id: 'sword-trail', points: contactGeometry.sweepPoints }),
        ])
      : Object.freeze([]);
    const rollProgress = this.rollState
      ? this.rollState.elapsedSeconds / this.rollState.durationSeconds
      : null;
    return Object.freeze({
      combatState,
      attackProfile,
      playerItems: Object.freeze(playerItems),
      playerWeaponItems,
      player: Object.freeze({
        position: Object.freeze({ ...this.position }),
        facing: this.facing,
        isGrounded: this.isGrounded,
        health: this.playerHealth,
        hitstunSeconds: this.playerHitstunSeconds,
        blockstunSeconds: this.playerBlockstunSeconds,
        invulnerableSeconds: this.playerInvulnerableSeconds,
        rollProgress,
        rollDirection: this.rollState?.direction ?? null,
        airComboFacing: this.airComboFacing,
      }),
    });
  }

  update(deltaSeconds, inputSnapshot, simulationSettings = {}) {
    const animationSpeed = Number.isFinite(simulationSettings.animationSpeed)
      ? Math.max(0, simulationSettings.animationSpeed)
      : 1;
    this.combatCameraFeedback.setEnabled(simulationSettings.cameraFeedbackEnabled !== false);
    this.previousPosition = { ...this.position };
    this.previousAnimationTime = this.animationTime;
    this.previousCameraPosition = { ...this.cameraPosition };
    this.combatCameraFeedback.update(deltaSeconds);
    this.combatEvents.update(deltaSeconds);
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
    const previousPlayerHitstunSeconds = this.playerHitstunSeconds;
    this.playerHitstunSeconds = Math.max(0, this.playerHitstunSeconds - deltaSeconds);
    this.playerInvulnerableSeconds = Math.max(0, this.playerInvulnerableSeconds - deltaSeconds);
    this.playerRetaliationSeconds = Math.max(0, this.playerRetaliationSeconds - deltaSeconds);
    if (
      previousPlayerHitstunSeconds > 0 &&
      this.playerHitstunSeconds === 0 &&
      this.playerRetaliationPending &&
      this.playerHealth > 0
    ) {
      this.playerRetaliationPending = false;
      this.playerRetaliationSeconds = 0.55;
      this.playerInvulnerableSeconds = Math.max(this.playerInvulnerableSeconds, 0.55);
    }
    this.playerKoSeconds = Math.max(0, this.playerKoSeconds - deltaSeconds);
    this.playerBlockImpactSeconds = Math.max(0, this.playerBlockImpactSeconds - deltaSeconds);
    this.playerBlockstunSeconds = Math.max(0, this.playerBlockstunSeconds - deltaSeconds);
    if (this.playerHealth === 0 && this.playerKoSeconds === 0) {
      this.respawnPlayerAfterKo();
    }
    const landingControlsLocked = this.landingRecoverySeconds > 0;
    const nextLandingRecoverySeconds = this.landingRecoverySeconds - deltaSeconds;
    this.landingRecoverySeconds =
      nextLandingRecoverySeconds <= Number.EPSILON ? 0 : nextLandingRecoverySeconds;
    const wasGrounded = this.isGrounded;

    const controlsLocked =
      landingControlsLocked ||
      this.playerHitstunSeconds > 0 ||
      this.playerBlockstunSeconds > 0 ||
      this.playerHealth === 0;
    const rawJumpPressed = Boolean(inputSnapshot.jump);
    const rawGuardPressed = Boolean(inputSnapshot.guard);
    const horizontal = controlsLocked
      ? 0
      : Number(inputSnapshot.right) - Number(inputSnapshot.left);
    const jumpPressed = controlsLocked ? false : rawJumpPressed;
    const guardPressed = controlsLocked ? false : rawGuardPressed;
    const guardEdge = guardPressed && !this.guardWasPressed;
    const jumpSequence = inputSnapshot.jumpSequence;
    const jumpIssued = controlsLocked
      ? false
      : Number.isSafeInteger(jumpSequence)
        ? jumpSequence > this.lastJumpSequence
        : jumpPressed && !this.jumpWasPressed;
    const dialogueResult = jumpIssued
      ? this.storyInteractionOwner.handleJump(this.getStoryInteractionContext())
      : null;
    const dialogueConsumed = dialogueResult?.consumed === true;
    const portalStarted = jumpIssued && !dialogueConsumed && this.tryPortalTransition();
    if (this.mapRuntime.getTransition() === null && guardEdge) this.tryStartRoll(horizontal);
    const isTransitioning = this.mapRuntime.getTransition() !== null;
    const isRolling = this.rollState !== null;
    const currentCombatState = this.combatCommands.snapshot();
    if (
      !isTransitioning &&
      !isRolling &&
      !portalStarted &&
      !dialogueConsumed &&
      jumpIssued &&
      this.isGrounded &&
      currentCombatState.canJump
    ) {
      this.combatCommands.cancelForJump({ preserveComboCycle: true });
      this.verticalVelocity = -JUMP_SPEED;
      this.airComboFloatSeconds = 0;
      this.airComboGravityScale = 1;
      this.isGrounded = false;
    }
    const combatState = this.combatCommands.update(deltaSeconds * animationSpeed, inputSnapshot, {
      acceptCommands: !isTransitioning && !isRolling && !controlsLocked,
      isAirborne: !this.isGrounded,
      allowGuard: this.isGrounded,
      staminaDeltaSeconds: deltaSeconds,
    });
    const activeAttackProfile = this.getAttackHitProfile(combatState.id);
    if (activeAttackProfile) {
      if (this.combatFacingCycle !== combatState.comboCycle) {
        this.combatFacingCycle = combatState.comboCycle;
        this.combatFacing = horizontal !== 0 ? Math.sign(horizontal) : this.facing;
      }
      this.facing = this.combatFacing;
      if (combatState.id.startsWith('air') && this.airComboFacing === 0) {
        this.airComboFacing = this.combatFacing;
      }
    }
    if (
      combatState.id === 'airHeavy' &&
      combatState.sequence !== this.airHeavyConnectedSequence &&
      combatState.progress >= 0.3 &&
      !this.isGrounded
    ) {
      this.verticalVelocity = Math.max(this.verticalVelocity, 300);
    }

    this.movementIntent = isTransitioning ? 0 : horizontal;
    this.jumpWasPressed = rawJumpPressed;
    this.guardWasPressed = rawGuardPressed;
    if (Number.isSafeInteger(jumpSequence)) this.lastJumpSequence = jumpSequence;
    if (isTransitioning) {
      this.updatePortalTransition(deltaSeconds);
      this.animationTime += deltaSeconds * animationSpeed * 0.35;
      return;
    }
    if (!isTransitioning && !isRolling) {
      const movementStartX = this.position.x;
      if (!activeAttackProfile && horizontal !== 0) {
        this.facing = Math.sign(horizontal);
      }
      this.position.x += horizontal * CHARACTER_SPEED * combatState.movementScale * deltaSeconds;
      this.position.x += this.playerKnockbackVelocityX * deltaSeconds;
      this.playerKnockbackVelocityX *= Math.pow(this.playerKnockbackDecayRate, deltaSeconds);
      if (Math.abs(this.playerKnockbackVelocityX) < PLAYER_KNOCKBACK_STOP_SPEED) {
        this.playerKnockbackVelocityX = 0;
      }
      const encounterBeforeStep = this.roomSceneNode?.getEncounterGameplaySnapshot() ?? null;
      if (this.isGrounded && encounterBeforeStep && !['idle', 'guard'].includes(combatState.id)) {
        const previousForwardGap = (encounterBeforeStep.position.x - movementStartX) * this.facing;
        const forwardGap = (encounterBeforeStep.position.x - this.position.x) * this.facing;
        if (previousForwardGap >= 0 && forwardGap < 12) {
          this.position.x = encounterBeforeStep.position.x - this.facing * 12;
        }
      }
      if (
        combatState.id.startsWith('air') &&
        encounterBeforeStep &&
        encounterBeforeStep.position.y < encounterBeforeStep.groundY &&
        !encounterBeforeStep.juggleLocked
      ) {
        const comboFacing = this.airComboFacing || this.facing;
        const targetGap = (encounterBeforeStep.position.x - this.position.x) * comboFacing;
        const maximumComboGap = combatState.id === 'airReturn' ? 22 : 44;
        const comboPullSpeed = combatState.id === 'airReturn' ? 420 : 300;
        if (targetGap >= 0 && targetGap < 18) {
          this.position.x = encounterBeforeStep.position.x - comboFacing * 18;
        } else if (targetGap > maximumComboGap) {
          this.position.x +=
            comboFacing * Math.min(comboPullSpeed * deltaSeconds, targetGap - maximumComboGap);
        }
      }
    }
    this.updatePlayerWeaponContactGeometry(combatState);
    this.roomSceneNode?.stepEncounter(
      deltaSeconds,
      this.createTrainingEncounterFrame(combatState, activeAttackProfile),
    );
    this.updateJourneyTriggers();

    if (isRolling) {
      this.updateRoll(deltaSeconds);
      const activeRoom = this.mapRuntime.getActiveRoom();
      const movementBounds = activeRoom.movementBounds ?? {
        minX: CHARACTER_BOUNDARY_HALF_WIDTH,
        maxX: this.mapRuntime.definition.worldSize.width - CHARACTER_BOUNDARY_HALF_WIDTH,
      };
      this.position.x = Math.max(
        movementBounds.minX,
        Math.min(movementBounds.maxX, this.position.x),
      );
      if (this.isGrounded) {
        this.position.y = this.mapRuntime.getGroundYAt(this.position.x) - CHARACTER_FOOT_OFFSET;
      }
      this.updateCameraFollow(deltaSeconds);
      this.animationTime += deltaSeconds * animationSpeed * 1.8;
      return;
    }

    const encounterAfterStep = this.roomSceneNode?.getEncounterGameplaySnapshot() ?? null;
    if (
      encounterAfterStep &&
      (encounterAfterStep.slamAttackerBouncePending ||
        encounterAfterStep.groundBounceDelaySeconds > 0)
    ) {
      const comboFacing = this.airComboFacing || this.facing;
      this.position.x = encounterAfterStep.position.x - comboFacing * 30;
      this.facing = comboFacing;
    }
    const activeRoom = this.mapRuntime.getActiveRoom();
    const playerGroundY = this.mapRuntime.getGroundYAt(this.position.x) - CHARACTER_FOOT_OFFSET;
    this.airComboFloatSeconds = Math.max(0, this.airComboFloatSeconds - deltaSeconds);
    const playerGravityMultiplier =
      this.airComboFloatSeconds > 0 ? 0.08 : this.airComboGravityScale;
    if (wasGrounded && this.isGrounded) {
      this.position.y = playerGroundY;
      this.verticalVelocity = 0;
    }
    this.verticalVelocity += GRAVITY * playerGravityMultiplier * deltaSeconds;
    this.position.y += this.verticalVelocity * deltaSeconds;
    if (this.position.y >= playerGroundY) {
      this.position.y = playerGroundY;
      this.verticalVelocity = 0;
      this.airComboFloatSeconds = 0;
      this.airComboGravityScale = 1;
      if (
        !encounterAfterStep?.slamAttackerBouncePending &&
        !(encounterAfterStep?.groundBounceDelaySeconds > 0)
      ) {
        this.airComboFacing = 0;
      }
      this.isGrounded = true;
      this.combatCommands.cancelAirMotionForLanding();
      this.combatCommands.clearComboContinuation();
      if (!wasGrounded) {
        this.landingRecoverySeconds = LANDING_RECOVERY_SECONDS;
        this.combatEvents.emit(COMBAT_EVENT_TYPE.LANDING, {
          actor: 'player',
          target: 'player',
          position: this.position,
          direction: this.facing,
          strength: 0.6,
          durationSeconds: LANDING_RECOVERY_SECONDS,
        });
      }
    }

    const movementBounds = activeRoom.movementBounds ?? {
      minX: CHARACTER_BOUNDARY_HALF_WIDTH,
      maxX: this.mapRuntime.definition.worldSize.width - CHARACTER_BOUNDARY_HALF_WIDTH,
    };
    this.position.x = Math.max(movementBounds.minX, Math.min(movementBounds.maxX, this.position.x));
    this.updateCameraFollow(deltaSeconds);
    this.animationTime += deltaSeconds * animationSpeed * (1 + Math.abs(horizontal) * 0.65);
  }

  getWorldStatus() {
    const map = this.mapRuntime.getResolvedMap();
    const room = this.mapRuntime.getActiveRoom();
    const location = this.mapRuntime.getActiveLocation();
    const roomId = location.roomId;
    const journey = this.journeyProgress.snapshot();
    const regionExpansion = this.regionExpansionProgress.snapshot();
    const progression = this.progressionSnapshot;
    const skill = this.getCombatSkillProfile();
    const encounter = this.roomSceneNode?.getEncounterGameplaySnapshot() ?? null;
    const phaseLabels = {
      prepare: '학원촌 준비',
      field: 'Field 탐험',
      dungeon: 'Dungeon 진입',
      checkpoint: 'Checkpoint 확보',
      boss: 'Boss 공략',
      reward: '보상 회수',
      returned: '첫 원정 완료',
    };
    const regionExpansionPhaseLabels = {
      prepare: '새 Region 준비',
      field: '유리바람 Field',
      dungeon: '관측소 Dungeon',
      checkpoint: '바람닻 확보',
      boss: '폭풍눈 Boss',
      reward: '프리즘 회수',
      returned: '유리바람 원정 완료',
    };
    const progressionComplete =
      progression.combatSkillLevel === 3 &&
      progression.ownedEquipmentIds.length === EQUIPMENT_PROFILES.length;
    const story = resolveFirstJourneyStory({
      equipment: {
        id: this.equipmentProfile.id,
        label: this.equipmentProfile.label,
        progressionComplete,
      },
      journey,
      regionExpansion,
      activeRoomId: roomId,
    });
    const dialogue = this.storyInteractionOwner.snapshot(this.getStoryInteractionContext());
    let objective = story.nextObjective;
    let encounterHint = '';

    if (roomId === 'training-room') {
      objective = `훈련 골렘을 처치해 인장 +${TRAINING_CLEAR_REWARD}. 귀환 후 같은 A/S command route를 성장시키세요.`;
      encounterHint = `${this.progressionNotice} · 현재 인장 ${progression.trainingMarks}`;
    }
    if (roomId === 'field-crossing') {
      if (!journey.fieldGuardianDefeated) {
        encounterHint = '일반 조우 보상: 수호 수액 · 최대 HP +20';
      }
    }
    if (roomId === 'sealed-forest-dungeon') {
      if (!journey.dungeonGuardianDefeated) {
        encounterHint = '회랑 수호자를 쓰러뜨리면 봉인이 풀리고 Checkpoint 길이 열립니다.';
      } else if (!journey.checkpointActivated) {
        encounterHint = '수호자 관문 개방 · 청록 봉인석에서 HP를 회복하고 Checkpoint를 확보하세요.';
      } else {
        encounterHint = '사망 시 이 Checkpoint에서 회복 · 오른쪽 Boss Portal 진입 가능';
      }
    }
    if (roomId === 'sealed-forest-boss') {
      if (journey.bossRewardClaimed) {
        objective = '보상 획득 완료. 오른쪽 황금 shortcut Portal에서 ↑로 귀환하세요.';
        encounterHint = '+120 Gold · 학원촌 shortcut 해금';
      } else if (journey.bossDefeated) {
        objective = 'Boss가 남긴 황금 결정에 접근해 보상을 회수하세요.';
        encounterHint = '보상 결정이 shortcut Portal을 활성화합니다.';
      } else if (encounter?.punishWindowOpen) {
        objective = '청록 틈이 열렸습니다. 지금 공격해 Punish를 이어가세요.';
        encounterHint = 'PUNISH WINDOW · 공격 가능';
      } else if (encounter?.attackKind === 'heavy' && encounter?.aiState === 'windup') {
        objective = '붉은 강공격은 막을 수 없습니다. 이동+↓ 구르기로 통과하세요.';
        encounterHint = 'HEAVY · ROLL REQUIRED';
      } else if (encounter?.attackKind === 'light' && encounter?.aiState === 'windup') {
        objective = '기본공격은 ↓로 Guard한 뒤 청록 회복 틈을 노리세요.';
        encounterHint = 'BASIC · GUARDABLE';
      } else {
        objective = '기본공격 Guard → 강공격 Roll → 청록 회복 틈 Punish로 공략하세요.';
        encounterHint = 'GUARD · ROLL · PUNISH';
      }
    }
    if (roomId === 'glasswind-approach') {
      if (regionExpansion.glasswindBridgeStable) {
        objective = '풍식 사냥꾼을 쓰러뜨려 바람다리가 고정됐습니다. 오른쪽 Portal로 진입하세요.';
        encounterHint = 'SURFACE + COLLISION + PORTAL 안정화';
      } else if (encounter?.attackKind === 'sweep' && encounter?.aiState === 'windup') {
        objective = '지면을 훑는 청록 Sweep가 옵니다. ↑로 뛰어넘고 공중 공격으로 반격하세요.';
        encounterHint = 'LOW SWEEP · JUMP REQUIRED';
      } else if (encounter?.attackKind === 'antiAir' && encounter?.aiState === 'windup') {
        objective = '공중에 오래 머물면 긴 대공창이 따라옵니다. 착지해 다시 Sweep 타이밍을 보세요.';
        encounterHint = 'ANTI-AIR · LAND AND RESET';
      } else {
        objective =
          '풍식 사냥꾼의 지면 Sweep를 점프로 넘고 회복 틈에 반격해 바람다리를 고정하세요.';
        encounterHint = 'JUMP OVER SWEEP · AIR PUNISH';
      }
    }
    if (roomId === 'glasswind-observatory') {
      encounterHint = regionExpansion.checkpointActivated
        ? '사망 시 관측소 Checkpoint에서 회복합니다.'
        : '바람닻이 Boss Portal과 부활 위치를 함께 고정합니다.';
    }
    if (roomId === 'glasswind-storm-eye') {
      if (regionExpansion.bossRewardClaimed) {
        objective = '프리즘 회수 완료. 오른쪽 황금 shortcut Portal에서 ↑로 학원촌에 귀환하세요.';
        encounterHint = '+180 Gold · 학원촌 영구 shortcut 해금';
      } else if (regionExpansion.bossDefeated) {
        objective = '폭풍 유리핵이 남긴 황금 프리즘에 접근해 보상과 shortcut을 여세요.';
        encounterHint = '보상 프리즘이 귀환 Portal을 영구 활성화합니다.';
      } else if (encounter?.punishWindowOpen) {
        objective = '청록 균열이 열렸습니다. 회복이 끝나기 전에 command 연계를 적중시키세요.';
        encounterHint = 'PUNISH WINDOW · ATTACK NOW';
      } else if (encounter?.attackKind === 'sweep' && encounter?.aiState === 'windup') {
        objective = '바닥을 덮는 Sweep는 Guard할 수 없습니다. ↑ 점프 후 공중 route로 Punish하세요.';
        encounterHint = 'LOW SWEEP · JUMP → AIR PUNISH';
      } else if (encounter?.attackKind === 'heavy' && encounter?.aiState === 'windup') {
        objective = '보라 강공격은 이동+↓ 구르기로 통과하고 반대편 회복 틈을 노리세요.';
        encounterHint = 'HEAVY · ROLL THROUGH';
      } else if (encounter?.attackKind === 'light' && encounter?.aiState === 'windup') {
        objective = '기본공격은 ↓ Guard. 막은 뒤 다음 Sweep를 위해 점프 거리를 확보하세요.';
        encounterHint = 'BASIC · GUARDABLE';
      } else {
        objective = 'Guard 기본기 · Jump Sweep · Roll 강공격을 구분하고 각 회복 틈을 공략하세요.';
        encounterHint = 'GUARD · JUMP · ROLL · PUNISH';
      }
    }
    if (roomId === 'academy-plaza' && journey.returnedWithReward) {
      encounterHint = regionExpansion.returnedWithReward
        ? encounterHint
        : progressionComplete
          ? 'M4 COMPLETE · 새 Sweep Jump 전투 준비'
          : '';
    }
    if (roomId === 'academy-plaza' && regionExpansion.returnedWithReward) {
      encounterHint = 'M5 REGION COMPLETE · Sweep Jump 해법과 shortcut 유지';
    }

    const nextSkillLevel = Math.min(3, progression.combatSkillLevel + 1);
    const nextSkillCost =
      progression.combatSkillLevel >= 3 ? null : getCombatSkillUpgradeCost(nextSkillLevel);
    const nextSkillTrainingMarkRequirement =
      progression.combatSkillLevel >= 3
        ? null
        : getCombatSkillTrainingMarkRequirement(nextSkillLevel);
    const availableGold = getAvailableGold(progression);
    const commandGuide = skill.loopCancel
      ? '지상 AA/AS/SA · 공중 AA/AS/SA · finisher→starter loop cancel'
      : skill.airCombos
        ? `지상·공중 AA/AS/SA · 공중 ${skill.maxAirActions}회`
        : skill.groundCombos
          ? '지상 AA/AS/SA 해금 · 공중 starter 1회'
          : 'A/S starter · 공중 starter 1회';

    return Object.freeze({
      areaName: `${map.name} · ${room.label}`,
      story,
      dialogue,
      objective,
      encounterHint,
      encounterHealthLabel:
        encounter && encounter.health > 0
          ? `${encounter.label} · HP ${encounter.health}/${encounter.maxHealth}`
          : '',
      journeyLabel:
        location.regionId === 'glasswind-region' ||
        (roomId === 'academy-plaza' && regionExpansion.phase !== 'prepare')
          ? (regionExpansionPhaseLabels[regionExpansion.phase] ?? regionExpansion.phase)
          : (phaseLabels[journey.phase] ?? journey.phase),
      wardLabel:
        location.regionId === 'glasswind-region' ||
        (roomId === 'academy-plaza' && regionExpansion.phase !== 'prepare')
          ? regionExpansion.glasswindBridgeStable
            ? '유리바람 다리 · 안정'
            : '횡풍 장벽 · 활성'
          : journey.fieldWardActive
            ? '수호 수액 · HP +20'
            : journey.routeChoice === 'bypass'
              ? '우회 · 수액 없음'
              : '수호 수액 미획득',
      timePhase: this.timePhase,
      timeLabel: this.timePhase === 'night' ? '밤' : '낮',
      roomId,
      canSelectEquipment: this.canManageProgression(),
      canManageProgression: this.canManageProgression(),
      equipmentId: this.equipmentProfile.id,
      equipmentLabel: this.equipmentProfile.label,
      equipmentOptions: Object.freeze(
        EQUIPMENT_PROFILES.map((profile) => {
          const owned = progression.ownedEquipmentIds.includes(profile.id);
          const selected = progression.equippedEquipmentId === profile.id;
          const affordable =
            progression.trainingMarks >= profile.trainingMarkRequirement &&
            availableGold >= profile.goldCost;
          return Object.freeze({
            id: profile.id,
            shortLabel: profile.shortLabel,
            description: profile.description,
            goldCost: profile.goldCost,
            trainingMarkRequirement: profile.trainingMarkRequirement,
            owned,
            selected,
            canChoose: !selected && (owned || affordable),
            actionLabel: selected
              ? '장착 중'
              : owned
                ? '장착'
                : profile.trainingMarkRequirement > 0
                  ? `${profile.goldCost} Gold · 인장 ${profile.trainingMarkRequirement}`
                  : `${profile.goldCost} Gold`,
          });
        }),
      ),
      combatSkill: Object.freeze({
        level: progression.combatSkillLevel,
        maxLevel: 3,
        label: skill.label,
        description: skill.description,
        damagePercent: Math.round((skill.damageScale - 1) * 100),
        hitCount: skill.spinHitCount,
        maxAirActions: skill.maxAirActions,
        commandGuide,
        nextLevel: progression.combatSkillLevel >= 3 ? null : nextSkillLevel,
        nextGoldCost: nextSkillCost,
        nextTrainingMarkRequirement: nextSkillTrainingMarkRequirement,
        canTrain:
          progression.combatSkillLevel < 3 &&
          availableGold >= nextSkillCost &&
          progression.trainingMarks >= nextSkillTrainingMarkRequirement,
        actionLabel:
          progression.combatSkillLevel >= 3
            ? 'MAX'
            : nextSkillTrainingMarkRequirement > 0
              ? `Lv.${nextSkillLevel} · ${nextSkillCost} Gold · 인장 ${nextSkillTrainingMarkRequirement}`
              : `Lv.${nextSkillLevel} · ${nextSkillCost} Gold`,
      }),
      progressionNotice: this.progressionNotice,
    });
  }

  getPlayerStatus() {
    const combatStatus = this.combatCommands.snapshot();
    return Object.freeze({
      health: this.playerHealth,
      maxHealth: this.playerMaxHealth,
      stamina: combatStatus.stamina,
      maxStamina: combatStatus.maxStamina,
      staminaExhausted: combatStatus.exhausted,
      lastStaminaAction: combatStatus.lastStaminaAction,
      lastCommandTransition: combatStatus.lastCommandTransition,
      gold: getAvailableGold(this.progressionSnapshot),
      trainingMarks: this.progressionSnapshot.trainingMarks,
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
    const activeRoom = mapSnapshot.room;
    const characterRenderScale = CHARACTER_RENDER_SCALE;
    const characterRenderOrder = activeRoom.renderOrder + 0.5;
    const sampledCharacterItems = createCharacterItems(
      renderPosition,
      this.facing,
      targetPose,
      bonePose,
      characterRenderScale,
      characterRenderOrder,
      this.equipmentProfile.presentation.weaponLengthScale,
    );
    const contactGeometry =
      this.playerWeaponContactGeometry?.sequence === combatState.sequence
        ? this.playerWeaponContactGeometry
        : null;
    const contactOffset = contactGeometry
      ? {
          x: renderPosition.x - contactGeometry.position.x,
          y: renderPosition.y - contactGeometry.position.y,
        }
      : { x: 0, y: 0 };
    const contactProfile = this.getAttackHitProfile(combatState.id);
    const contactSweepVisible =
      contactGeometry &&
      contactProfile &&
      combatState.progress >= contactProfile.start &&
      combatState.progress <= contactProfile.end;
    const characterItems = sampledCharacterItems.map((item) =>
      item.id === 'sword-trail' && contactGeometry
        ? Object.freeze({
            ...item,
            opacity: Math.max(item.opacity, contactSweepVisible ? 0.25 : 0),
            points: Object.freeze(
              contactGeometry.sweepPoints.map((pointValue) =>
                Object.freeze({
                  x: pointValue.x + contactOffset.x,
                  y: pointValue.y + contactOffset.y,
                }),
              ),
            ),
          })
        : item,
    );
    const combatEvents = this.combatEvents.snapshot();
    const playerGuardEvent =
      latestCombatEvent(
        combatEvents,
        COMBAT_EVENT_TYPE.GUARD_BREAK,
        (event) => event.actor === 'player',
      ) ??
      latestCombatEvent(combatEvents, COMBAT_EVENT_TYPE.GUARD, (event) => event.actor === 'player');
    const blockImpactItems = createBlockImpactItems(
      playerGuardEvent,
      this.facing,
      this.playerBlockImpactSeconds,
      this.playerBlockImpactStrength,
      characterRenderOrder + 0.01,
    );
    const playerRetaliationItems = createRetaliationAuraItems(
      { x: renderPosition.x, y: renderPosition.y + 20 },
      this.playerRetaliationSeconds,
      'player',
      characterRenderOrder - 0.005,
    );
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
    const playerHitFeedbackItems = createHitFeedbackItems(
      playerHitEvent,
      'player',
      'player',
      characterRenderOrder + 0.03,
    );
    const enemyHitFeedbackItems = createHitFeedbackItems(
      enemyHitEvent,
      'enemy',
      'combat-enemy',
      activeRoom.renderOrder + 0.48,
    );
    const evadeFeedbackItems = createEvadeFeedbackItems(
      renderPosition,
      evadeEvent,
      characterRenderOrder + 0.02,
    );
    const encounterRender = this.roomSceneNode?.createEncounterRenderSnapshot(
      activeRoom.renderOrder + 0.45,
    ) ?? { enemy: null, items: [], contact: null };
    const punishFeedbackItems = createPunishFeedbackItems(
      punishEvent,
      activeRoom.renderOrder + 0.49,
    );
    const items = Object.freeze(
      [
        ...mapSnapshot.renderItems,
        ...encounterRender.items,
        ...characterItems,
        ...playerRetaliationItems,
        ...blockImpactItems,
        ...playerHitFeedbackItems,
        ...enemyHitFeedbackItems,
        ...evadeFeedbackItems,
        ...punishFeedbackItems,
      ]
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

    const renderCameraPosition = {
      x: lerp(this.previousCameraPosition.x, this.cameraPosition.x, interpolationAlpha),
      y: lerp(this.previousCameraPosition.y, this.cameraPosition.y, interpolationAlpha),
    };
    const combatCameraOffset = this.combatCameraFeedback.snapshot();
    const renderFrame = Object.freeze({
      worldSize: map.worldSize,
      groundY: map.groundY,
      gridSize: map.gridSize,
      palette: map.palette,
      animationTime: renderAnimationTime,
      cameraOffset: Object.freeze({
        x: renderCameraPosition.x - 480 + combatCameraOffset.x,
        y: renderCameraPosition.y - 270 + combatCameraOffset.y,
      }),
      camera: Object.freeze({ position: Object.freeze(renderCameraPosition) }),
      characterRenderScale,
      worldBounds: Object.freeze({
        minX: bounds.x,
        maxX: bounds.x + bounds.width,
        minY: bounds.y,
        maxY: bounds.y + bounds.height,
      }),
      playerMovementBounds: activeRoom.movementBounds,
      map: Object.freeze({
        id: map.id,
        name: map.name,
        activeRegionId: mapSnapshot.active.regionId,
        activeRoomId: mapSnapshot.active.roomId,
        timePhase: this.timePhase,
        appliedPatchIds: mapSnapshot.appliedPatchIds,
      }),
      equipment: this.equipmentProfile,
      combatMotion: Object.freeze({
        id: combatState.id,
        label: combatState.label,
        progress: combatState.progress,
        phase: combatState.phase,
        sequence: combatState.sequence,
        comboCycle: combatState.comboCycle,
        queuedMotion: combatState.queuedMotion,
        frame: combatState.frame ?? null,
      }),
      combatEvents,
      combatContact: encounterRender.contact,
      player: Object.freeze({
        position: renderPosition,
        isGrounded: this.isGrounded,
        health: this.playerHealth,
        maxHealth: this.playerMaxHealth,
        stamina: combatState.stamina,
        maxStamina: combatState.maxStamina,
        staminaExhausted: combatState.exhausted,
        lastStaminaAction: combatState.lastStaminaAction,
        lastCommandTransition: combatState.lastCommandTransition,
        hitstunSeconds: this.playerHitstunSeconds,
        retaliationSeconds: this.playerRetaliationSeconds,
        roomId: mapSnapshot.active.roomId,
        portalTransition: mapSnapshot.transition
          ? Object.freeze({
              portalId: mapSnapshot.transition.portalId,
              fromRoomId: mapSnapshot.transition.from.roomId,
              toRoomId: mapSnapshot.transition.to.roomId,
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
      combatEnemy: encounterRender.enemy,
      items,
    });
    this.renderFrameCreated.emit(renderFrame);
    return renderFrame;
  }
}
