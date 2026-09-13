import { createPlayerSurfaceItems } from '../animation/CharacterSurfaceItems.js';
import { COMBAT_EVENT_TYPE } from '../combat/CombatEvent.js';
import {
  PLAYER_CHARACTER_FOOT_OFFSET,
  PLAYER_COMBAT_GEOMETRY_SCALE,
} from '../combat/SharedCombatGeometry.js';

export const CHARACTER_RENDER_SCALE = PLAYER_COMBAT_GEOMETRY_SCALE;

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

function transformPoints(points, { x, y, rotation = 0, scaleX = 1, scaleY = 1, basis = null }) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return points.map((point) => {
    const scaledX = point.x * scaleX;
    const scaledY = point.y * scaleY;
    return Object.freeze({
      x: x + scaledX * (basis?.xx ?? cosine) + scaledY * (basis?.xy ?? -sine),
      y: y + scaledX * (basis?.yx ?? sine) + scaledY * (basis?.yy ?? cosine),
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
  const fullCircle = Math.abs(Math.abs(endAngle - startAngle) - Math.PI * 2) <= 1e-6;
  const lastIndex = fullCircle ? segments - 1 : segments;
  for (let index = 0; index <= lastIndex; index += 1) {
    const progress = index / segments;
    const angle = startAngle + (endAngle - startAngle) * progress;
    points.push({
      x: origin.x + Math.cos(angle) * outerRadius,
      y: origin.y + Math.sin(angle) * outerRadius,
    });
  }
  for (let index = lastIndex; index >= 0; index -= 1) {
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
  combatGeometry,
) {
  if (!bonePose.worldJoints || !combatGeometry)
    throw new TypeError('Character drawing requires the shared projected rig.');
  const cloth = appearanceProfile.material,
    trim = appearanceProfile.accent;
  const outline = '#252a2b',
    skin = '#c4bbaa',
    leather = '#665440';
  const joints = Object.fromEntries(
    Object.entries(bonePose.projectedJoints).map(([id, value]) => [
      id,
      {
        x: position.x + value.x * renderScale * facing,
        y:
          position.y +
          PLAYER_CHARACTER_FOOT_OFFSET +
          (value.y - PLAYER_CHARACTER_FOOT_OFFSET) * renderScale,
      },
    ]),
  );
  const at = (id, x = 0, y = 0) => {
    const m = bonePose.worldJoints[id].matrix;
    return {
      x: joints[id].x + (m[0][0] * x + m[0][1] * y) * renderScale * facing,
      y: joints[id].y + (m[1][0] * x + m[1][1] * y) * renderScale,
      basis: {
        xx: m[0][0] * renderScale * facing,
        xy: m[0][1] * renderScale * facing,
        yx: m[1][0] * renderScale,
        yy: m[1][1] * renderScale,
      },
    };
  };
  const shape = (id, points, transform, fill, order, width = 1.2) =>
    polygon(id, points, transform, fill, {
      stroke: outline,
      lineWidth: width * renderScale,
      order,
    });
  const limb = (id, from, to, width, fill, order) =>
    limbSegment(id, joints[from], joints[to], width * renderScale, fill, {
      stroke: outline,
      lineWidth: 1.1 * renderScale,
      order,
    });
  const items = [
    polygon(
      'shadow',
      regularPolygon(22 * renderScale, 4 * renderScale, 12),
      { x: position.x, y: position.y + PLAYER_CHARACTER_FOOT_OFFSET },
      '#111516',
      { opacity: 0.36, order: -100 },
    ),
    limb('back-thigh', 'farHip', 'farKnee', 9, '#4b5150', 1),
    limb('back-shin', 'farKnee', 'farFoot', 5, '#b5ae9d', 2),
    shape(
      'back-boot',
      [
        { x: -4, y: -5 },
        { x: 4, y: -5 },
        { x: 8, y: 0 },
        { x: 5, y: 3 },
        { x: -5, y: 3 },
      ],
      at('farFoot'),
      leather,
      3,
    ),
    shape(
      'tool-bag',
      [
        { x: -7, y: -4 },
        { x: 5, y: -4 },
        { x: 6, y: 10 },
        { x: -6, y: 11 },
      ],
      at('farHip', -5, 0),
      leather,
      4,
    ),
    shape(
      'workwear-back-panel',
      [
        { x: -14, y: -2 },
        { x: 12, y: -2 },
        { x: 16, y: 10 },
        { x: 7, y: 13 },
        { x: -2, y: 9 },
        { x: -13, y: 12 },
      ],
      at('pelvis'),
      cloth,
      5,
    ),
    limb('front-thigh', 'nearHip', 'nearKnee', 9, '#555c5b', 6),
    limb('front-shin', 'nearKnee', 'nearFoot', 5, '#d0c7b4', 7),
    shape(
      'front-boot',
      [
        { x: -4, y: -5 },
        { x: 4, y: -5 },
        { x: 8, y: 0 },
        { x: 5, y: 3 },
        { x: -5, y: 3 },
      ],
      at('nearFoot'),
      leather,
      8,
    ),
    limb('shield-upper-arm', 'farShoulder', 'farElbow', 7, cloth, 9),
    limb('shield-forearm', 'farElbow', 'farHand', 5, skin, 10),
    polygon(
      'torso',
      combatGeometry.hurt.find(({ part }) => part === 'torso').points,
      { x: 0, y: 0 },
      cloth,
      { stroke: outline, lineWidth: 1.3 * renderScale, order: 11 },
    ),
    limb('neck', 'chest', 'head', 5, skin, 12),
    shape(
      'work-collar',
      [
        { x: -10, y: -2 },
        { x: -4, y: 5 },
        { x: 0, y: 11 },
        { x: 5, y: 4 },
        { x: 11, y: -2 },
        { x: 5, y: 0 },
        { x: 0, y: 4 },
        { x: -5, y: 0 },
      ],
      at('chest'),
      trim,
      13,
    ),
    limbSegment(
      'cross-body-strap',
      at('farShoulder', 2, 4),
      at('nearHip', -2, -1),
      3.5 * renderScale,
      leather,
      { stroke: outline, lineWidth: 0.7 * renderScale, order: 14 },
    ),
    shape(
      'work-belt',
      [
        { x: -12, y: -2 },
        { x: 12, y: -2 },
        { x: 12, y: 2 },
        { x: -12, y: 2 },
      ],
      at('pelvis'),
      leather,
      15,
    ),
    polygon(
      'head',
      combatGeometry.hurt.find(({ part }) => part === 'head').points,
      { x: 0, y: 0 },
      skin,
      { stroke: outline, lineWidth: 1.1 * renderScale, order: 16 },
    ),
    limb('sword-upper-arm', 'nearShoulder', 'nearElbow', 7, cloth, 17),
    limb('sword-forearm', 'nearElbow', 'nearHand', 5, skin, 18),
    shape(
      'sword-glove',
      [
        { x: -3, y: -4 },
        { x: 3, y: -4 },
        { x: 4, y: 3 },
        { x: -3, y: 4 },
      ],
      at('nearHand'),
      leather,
      19,
    ),
    shape(
      'shield-glove',
      [
        { x: -3, y: -4 },
        { x: 3, y: -4 },
        { x: 4, y: 3 },
        { x: -3, y: 4 },
      ],
      at('farHand'),
      leather,
      19,
    ),
    polygon('shield', combatGeometry.shield.points, { x: 0, y: 0 }, '#7b817b', {
      stroke: outline,
      lineWidth: 1.5 * renderScale,
      order: 20,
    }),
    shape('shield-rivet-plate', regularPolygon(3, 3, 6), at('farHand'), trim, 21, 0.8),
    polygon('sword-trail', [], { x: 0, y: 0 }, '#d5dfd5', { opacity: 0, order: 22 }),
    shape(
      'sword-hilt',
      [
        { x: -9, y: -2 },
        { x: 2, y: -2 },
        { x: 3, y: -9 },
        { x: 6, y: -10 },
        { x: 6, y: 10 },
        { x: 3, y: 9 },
        { x: 2, y: 2 },
        { x: -9, y: 2 },
      ],
      at('nearHand'),
      '#777e77',
      23,
    ),
    polygon('sword-blade', combatGeometry.weapon.points, { x: 0, y: 0 }, '#acb7b0', {
      stroke: outline,
      lineWidth: 1.2 * renderScale,
      order: 24,
    }),
  ];
  void weaponLengthScale;
  void targetPose;
  return items.map((item) => {
    const shared =
      item.id === 'sword-blade'
        ? combatGeometry.weapon
        : item.id === 'shield'
          ? combatGeometry.shield
          : ['torso', 'head'].includes(item.id)
            ? combatGeometry.hurt.find(({ part }) => part === item.id)
            : null;
    return Object.freeze({ ...item, points: shared?.points ?? item.points, renderOrder });
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
    contactProgress < contactProfile.end;
  const characterItems = createPlayerSurfaceItems(
    sampledCharacterItems.map((item) =>
      item.id === 'sword-trail'
        ? Object.freeze({
            ...item,
            opacity: contactSweepVisible && contactGeometry?.sweep ? 0.25 : 0,
            points: Object.freeze(
              (contactGeometry?.sweep?.points ?? []).map((pointValue) =>
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
    { bonePose, position, facing, scale: renderScale, footOffset: PLAYER_CHARACTER_FOOT_OFFSET },
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
