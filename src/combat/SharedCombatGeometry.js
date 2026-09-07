import { sampleEnemyBonePoseFor } from '../animation/EnemyBonePoseLibrary.js';
import {
  createProjectedBoneSurface,
  createProjectedTorsoSurface,
  surfaceOutline,
} from '../animation/ProjectedBodySurface.js';

// The authored human rig renders as a ~108 logical px body silhouette in the 960x540
// gameplay world (about 20% of the 540 logical height, about 144 CSS px on a 720p
// viewport). This scale is shared by its visible cutout and authoritative swept/body geometry.
export const PLAYER_COMBAT_GEOMETRY_SCALE = 0.77;
export const PLAYER_CHARACTER_FOOT_OFFSET = 82;

function freezePoint(point) {
  return Object.freeze({ x: point.x, y: point.y });
}

function freezePolygon(part, points) {
  return Object.freeze({
    part,
    points: Object.freeze(points.map(freezePoint)),
  });
}

function transformPoints(points, { x, y, rotation = 0, basis = null }) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return points.map((point) => ({
    x: x + point.x * (basis?.xx ?? cosine) + point.y * (basis?.xy ?? -sine),
    y: y + point.x * (basis?.yx ?? sine) + point.y * (basis?.yy ?? cosine),
  }));
}

function regularPolygon(radiusX, radiusY, sides, angleOffset = 0) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = angleOffset + (index / sides) * Math.PI * 2;
    return { x: Math.cos(angle) * radiusX, y: Math.sin(angle) * radiusY };
  });
}

function limbPolygon(start, end, width) {
  return surfaceOutline(createProjectedBoneSurface({ start, end, width }));
}

function skeletonTorsoPolygon(position, joints) {
  // The cutout body is defined by the same projected shoulder/hip anchors as the authored
  // skeleton.  z deliberately stays out of this polygon: it is presentation depth only.
  return surfaceOutline(createProjectedTorsoSurface(joints)).map((joint) => ({
    x: position.x + joint.x,
    y: position.y + joint.y,
  }));
}

function skeletonHeadPolygon(position, joints) {
  // The small head follows the projected quaternion basis without a second body rotation.
  const headDirection = Math.atan2(joints.head.axisX.y, joints.head.axisX.x);
  const headRotation = headDirection;
  return transformPoints(regularPolygon(8, 10, 10, Math.PI / 10), {
    x: position.x + joints.head.x,
    y: position.y + joints.head.y,
    rotation: headRotation,
  });
}

function enemySkeletonPoint(point, { origin, facing, rotation, scale, embeddedOffset }) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const rotatedX = point.x * scale * cosine - point.y * scale * sine;
  const rotatedY = point.x * scale * sine + point.y * scale * cosine;
  return Object.freeze({
    x: origin.x + (facing < 0 ? -rotatedX : rotatedX),
    y: origin.y + rotatedY + embeddedOffset,
    depth: (point.depth ?? 0) * scale,
  });
}

function enemySkeletonPolygon(part, joints) {
  return freezePolygon(part, joints);
}

function posePlayerPoints(points, { position, facing, geometryScale }) {
  const footY = position.y + PLAYER_CHARACTER_FOOT_OFFSET;
  return points.map((point) => {
    const scaledX = position.x + (point.x - position.x) * geometryScale;
    const scaledY = footY + (point.y - footY) * geometryScale;
    return {
      x: facing >= 0 ? scaledX : position.x * 2 - scaledX,
      y: scaledY,
    };
  });
}

export function samplePlayerCombatGeometry({
  position,
  facing,
  targetPose,
  bonePose,
  geometryScale,
  weaponLengthScale = 1,
}) {
  if (
    !bonePose?.projectedJoints ||
    !bonePose.worldJoints ||
    !bonePose.skeletonFrame ||
    !targetPose?.weaponBasis ||
    !targetPose.shieldBasis
  ) {
    throw new TypeError(
      'Player combat geometry requires the canonical projected quaternion rig and wrist attachments.',
    );
  }
  const poseWeaponLengthScale =
    Number.isFinite(targetPose.weaponLengthScale) && targetPose.weaponLengthScale > 0
      ? targetPose.weaponLengthScale
      : 1;
  const resolvedWeaponLengthScale = weaponLengthScale * poseWeaponLengthScale;
  const projectedJoints = bonePose.projectedJoints;
  const projectedArm = (shoulder, elbow, hand) =>
    Object.freeze({
      root: { x: position.x + shoulder.x, y: position.y + shoulder.y },
      elbow: { x: position.x + elbow.x, y: position.y + elbow.y },
      hand: { x: position.x + hand.x, y: position.y + hand.y },
    });
  const rightArm = projectedArm(
    projectedJoints.nearShoulder,
    projectedJoints.nearElbow,
    projectedJoints.nearHand,
  );
  const leftArm = projectedArm(
    projectedJoints.farShoulder,
    projectedJoints.farElbow,
    projectedJoints.farHand,
  );
  const bladeOrigin = {
    x: rightArm.hand.x + targetPose.weaponBasis.xx * 5,
    y: rightArm.hand.y + targetPose.weaponBasis.yx * 5,
  };
  const weaponPoints = transformPoints(
    [
      { x: 0, y: -3 },
      { x: 100 * resolvedWeaponLengthScale, y: -9 },
      { x: 126 * resolvedWeaponLengthScale, y: 0 },
      { x: 100 * resolvedWeaponLengthScale, y: 9 },
      { x: 0, y: 4 },
    ],
    { ...bladeOrigin, basis: targetPose.weaponBasis },
  );
  const shieldPoints = transformPoints(
    [
      { x: -10, y: -17 },
      { x: 8, y: -19 },
      { x: 13, y: -2 },
      { x: 7, y: 18 },
      { x: -8, y: 15 },
      { x: -12, y: 0 },
    ],
    { x: leftArm.hand.x, y: leftArm.hand.y, basis: targetPose.shieldBasis },
  );
  const rawHurtPolygons = [
    {
      part: 'torso',
      points: skeletonTorsoPolygon(position, projectedJoints),
    },
    {
      part: 'head',
      points: skeletonHeadPolygon(position, projectedJoints),
    },
    { part: 'weapon-arm', points: limbPolygon(rightArm.root, rightArm.elbow, 7) },
    { part: 'weapon-forearm', points: limbPolygon(rightArm.elbow, rightArm.hand, 5) },
    { part: 'shield-arm', points: limbPolygon(leftArm.root, leftArm.elbow, 7) },
    { part: 'shield-forearm', points: limbPolygon(leftArm.elbow, leftArm.hand, 5) },
    ...[
      ['back-thigh', 'farHip', 'farKnee', 9],
      ['back-shin', 'farKnee', 'farFoot', 5],
      ['front-thigh', 'nearHip', 'nearKnee', 9],
      ['front-shin', 'nearKnee', 'nearFoot', 5],
    ].map(([part, from, to, width]) => ({
      part,
      points: limbPolygon(
        { x: position.x + projectedJoints[from].x, y: position.y + projectedJoints[from].y },
        { x: position.x + projectedJoints[to].x, y: position.y + projectedJoints[to].y },
        width,
      ),
    })),
  ];
  const pose = (points) => posePlayerPoints(points, { position, facing, geometryScale });
  return Object.freeze({
    actor: 'player',
    origin: freezePoint(position),
    weapon: freezePolygon('weapon', pose(weaponPoints)),
    shield: freezePolygon('shield', pose(shieldPoints)),
    hurt: Object.freeze(
      rawHurtPolygons.map(({ part, points }) => freezePolygon(part, pose(points))),
    ),
  });
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothStep(amount) {
  const clamped = Math.max(0, Math.min(1, amount));
  return clamped * clamped * (3 - 2 * clamped);
}

export function sampleTrainingEnemyWeaponLength(enemy, attackProfiles) {
  const attackProfile = attackProfiles[enemy.attackKind];
  if (enemy.attackKind !== 'antiAir') return attackProfile.weaponLength;
  if (enemy.aiState === 'hitstun') return enemy.hitReactionWeaponLength;
  if (enemy.aiState === 'windup') {
    const windupProgress = 1 - enemy.aiSeconds / attackProfile.windupSeconds;
    return lerp(
      attackProfiles.light.weaponLength,
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
    return lerp(startLength, attackProfiles.light.weaponLength, smoothStep(recoveryProgress));
  }
  return attackProfiles.light.weaponLength;
}

export function sampleTrainingEnemyCombatGeometry(enemy, attackProfiles) {
  const { x, y } = enemy.position;
  // A sampled local-3D skeleton is the single source for the visible cutout and collision
  // anchors. Do not reduce it to scalar offsets here: interpolated limbs must retain their
  // parent-composed world position for both renderer and combat authority.
  const enemyBonePose = sampleEnemyBonePoseFor(enemy, attackProfiles);
  const recoveryProgress =
    enemy.aiState === 'recovery' && enemy.recoveryDurationSeconds > 0
      ? 1 - enemy.aiSeconds / enemy.recoveryDurationSeconds
      : 0;
  const weaponLength = sampleTrainingEnemyWeaponLength(enemy, attackProfiles);
  const renderFacing = ['windup', 'attack', 'recovery'].includes(enemy.aiState)
    ? enemy.attackFacing
    : enemy.facing;
  const poseRotation =
    enemy.aiState === 'recovery'
      ? lerp(enemy.recoveryBodyStartRotation, 0, smoothStep(recoveryProgress))
      : enemy.rotation;
  const presentationScale = enemy.presentationScale ?? 0.48;
  const embeddedOffset = enemy.groundBounceDelaySeconds > 0 ? 8 : 0;
  const skeletonOrigin = { x, y: y - 78 * presentationScale };
  const skeletonTransform = {
    origin: skeletonOrigin,
    facing: renderFacing,
    rotation: poseRotation,
    scale: presentationScale,
    embeddedOffset,
  };
  const skeleton = Object.freeze(
    Object.fromEntries(
      Object.entries(enemyBonePose.projectedJoints).map(([jointId, joint]) => [
        jointId,
        enemySkeletonPoint(joint, skeletonTransform),
      ]),
    ),
  );
  const weaponHand = skeleton.nearHand;
  const wrist = enemyBonePose.worldJoints.nearHand.matrix;
  const cosine = Math.cos(poseRotation),
    sine = Math.sin(poseRotation);
  const weaponBasis = Object.freeze({
    xx: renderFacing * (cosine * wrist[0][0] - sine * wrist[1][0]),
    xy: renderFacing * (cosine * wrist[0][1] - sine * wrist[1][1]),
    yx: sine * wrist[0][0] + cosine * wrist[1][0],
    yy: sine * wrist[0][1] + cosine * wrist[1][1],
  });
  const weaponAngle = Math.atan2(weaponBasis.yx, weaponBasis.xx);
  const weaponPoints = transformPoints(
    [
      { x: 0, y: -3 },
      { x: weaponLength - 16, y: -3 },
      { x: weaponLength, y: 0 },
      { x: weaponLength - 16, y: 4 },
      { x: 0, y: 4 },
    ],
    { ...weaponHand, basis: weaponBasis },
  );
  const bodyPoints = surfaceOutline(createProjectedTorsoSurface(skeleton));
  const headPoints = transformPoints(regularPolygon(15, 18, 8), {
    x: skeleton.head.x,
    y: skeleton.head.y,
    rotation: poseRotation,
  });
  const body = enemySkeletonPolygon('body', bodyPoints);
  const head = freezePolygon('head', headPoints);
  const limbs = [
    ['back-thigh', 'farHip', 'farKnee', 8],
    ['back-shin', 'farKnee', 'farFoot', 7],
    ['front-thigh', 'nearHip', 'nearKnee', 8],
    ['front-shin', 'nearKnee', 'nearFoot', 7],
    ['upper-weapon-arm', 'nearShoulder', 'nearElbow', 11],
    ['lower-weapon-arm', 'nearElbow', 'nearHand', 10],
  ].map(([part, from, to, width]) =>
    freezePolygon(part, limbPolygon(skeleton[from], skeleton[to], width)),
  );
  return Object.freeze({
    actor: 'enemy',
    origin: freezePoint(enemy.position),
    weapon: freezePolygon('weapon', weaponPoints),
    shield: null,
    hurt: Object.freeze([body, head, ...limbs]),
    presentation: Object.freeze({
      skeleton,
      body,
      head,
      weaponAngle,
      weaponBasis,
      weaponLength,
      renderFacing,
      poseRotation,
      presentationScale,
    }),
  });
}

function convexHull(points) {
  const unique = [...new Map(points.map((point) => [`${point.x}:${point.y}`, point])).values()];
  if (unique.length <= 3) return unique;
  unique.sort((left, right) => left.x - right.x || left.y - right.y);
  const cross = (origin, left, right) =>
    (left.x - origin.x) * (right.y - origin.y) - (left.y - origin.y) * (right.x - origin.x);
  const lower = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const point = unique[index];
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function createSweptWeaponGeometry({ current, history = [], historyLimit = 3 }) {
  const nextHistory = [...history, current.points].slice(-historyLimit);
  return Object.freeze({
    current,
    swept: freezePolygon('sweep', convexHull(nextHistory.flat())),
    history: Object.freeze(nextHistory.map((points) => Object.freeze(points.map(freezePoint)))),
  });
}

function closestPointOnSegment(point, start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const amount =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared,
          ),
        );
  return {
    x: start.x + deltaX * amount,
    y: start.y + deltaY * amount,
  };
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function segmentIntersection(firstStart, firstEnd, secondStart, secondEnd) {
  const firstDelta = {
    x: firstEnd.x - firstStart.x,
    y: firstEnd.y - firstStart.y,
  };
  const secondDelta = {
    x: secondEnd.x - secondStart.x,
    y: secondEnd.y - secondStart.y,
  };
  const offset = {
    x: secondStart.x - firstStart.x,
    y: secondStart.y - firstStart.y,
  };
  const cross = (left, right) => left.x * right.y - left.y * right.x;
  const denominator = cross(firstDelta, secondDelta);
  if (Math.abs(denominator) > 1e-9) {
    const firstAmount = cross(offset, secondDelta) / denominator;
    const secondAmount = cross(offset, firstDelta) / denominator;
    if (
      firstAmount >= -1e-9 &&
      firstAmount <= 1 + 1e-9 &&
      secondAmount >= -1e-9 &&
      secondAmount <= 1 + 1e-9
    ) {
      return {
        x: firstStart.x + firstDelta.x * firstAmount,
        y: firstStart.y + firstDelta.y * firstAmount,
      };
    }
    return null;
  }
  if (Math.abs(cross(offset, firstDelta)) > 1e-9) return null;
  const candidates = [firstStart, firstEnd, secondStart, secondEnd];
  return (
    candidates.find(
      (point) =>
        point.x >=
          Math.max(Math.min(firstStart.x, firstEnd.x), Math.min(secondStart.x, secondEnd.x)) -
            1e-9 &&
        point.x <=
          Math.min(Math.max(firstStart.x, firstEnd.x), Math.max(secondStart.x, secondEnd.x)) +
            1e-9 &&
        point.y >=
          Math.max(Math.min(firstStart.y, firstEnd.y), Math.min(secondStart.y, secondEnd.y)) -
            1e-9 &&
        point.y <=
          Math.min(Math.max(firstStart.y, firstEnd.y), Math.max(secondStart.y, secondEnd.y)) + 1e-9,
    ) ?? null
  );
}

function closestPolygonPair(left, right) {
  let closest = { gap: Infinity, left: null, right: null };
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const intersection = segmentIntersection(
        left[leftIndex],
        left[(leftIndex + 1) % left.length],
        right[rightIndex],
        right[(rightIndex + 1) % right.length],
      );
      if (intersection) return { gap: 0, left: intersection, right: intersection };
    }
  }
  for (const leftPoint of left) {
    if (pointInPolygon(leftPoint, right)) return { gap: 0, left: leftPoint, right: leftPoint };
  }
  for (const rightPoint of right) {
    if (pointInPolygon(rightPoint, left)) return { gap: 0, left: rightPoint, right: rightPoint };
  }
  const inspect = (points, polygon, swap) => {
    for (const point of points) {
      for (let index = 0; index < polygon.length; index += 1) {
        const candidate = closestPointOnSegment(
          point,
          polygon[index],
          polygon[(index + 1) % polygon.length],
        );
        const gap = Math.hypot(point.x - candidate.x, point.y - candidate.y);
        if (gap < closest.gap) {
          closest = swap
            ? { gap, left: candidate, right: point }
            : { gap, left: point, right: candidate };
        }
      }
    }
  };
  inspect(left, right, false);
  inspect(right, left, true);
  return closest;
}

export function closestCombatContact(weapons, hurts) {
  let closest = null;
  for (const weapon of weapons) {
    for (const hurt of hurts) {
      const candidate = closestPolygonPair(weapon.points, hurt.points);
      if (!closest || candidate.gap < closest.gap) {
        closest = {
          ...candidate,
          weaponPart: weapon.part,
          hurtPart: hurt.part,
        };
      }
    }
  }
  if (!closest) {
    return Object.freeze({
      contact: false,
      gap: Infinity,
      weaponPart: null,
      hurtPart: null,
      position: null,
    });
  }
  const contact = closest.gap === 0;
  return Object.freeze({
    contact,
    gap: closest.gap,
    weaponPart: contact ? closest.weaponPart : null,
    hurtPart: contact ? closest.hurtPart : null,
    position: contact
      ? freezePoint({
          x: (closest.left.x + closest.right.x) / 2,
          y: (closest.left.y + closest.right.y) / 2,
        })
      : null,
  });
}
