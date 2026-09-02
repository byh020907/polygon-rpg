import { TwoBoneIKSolver } from '../animation/TwoBoneIKSolver.js';

export const PLAYER_COMBAT_GEOMETRY_SCALE = 0.265;
export const PLAYER_CHARACTER_FOOT_OFFSET = 82;

const PLAYER_IK_SOLVER = new TwoBoneIKSolver();

function freezePoint(point) {
  return Object.freeze({ x: point.x, y: point.y });
}

function freezePolygon(part, points) {
  return Object.freeze({
    part,
    points: Object.freeze(points.map(freezePoint)),
  });
}

function transformPoints(points, { x, y, rotation = 0 }) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return points.map((point) => ({
    x: x + point.x * cosine - point.y * sine,
    y: y + point.x * sine + point.y * cosine,
  }));
}

function regularPolygon(radiusX, radiusY, sides, angleOffset = 0) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = angleOffset + (index / sides) * Math.PI * 2;
    return { x: Math.cos(angle) * radiusX, y: Math.sin(angle) * radiusY };
  });
}

function limbPolygon(start, end, width) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const normalX = (-deltaY / length) * (width / 2);
  const normalY = (deltaX / length) * (width / 2);
  return [
    { x: start.x + normalX, y: start.y + normalY },
    { x: end.x + normalX, y: end.y + normalY },
    { x: end.x - normalX, y: end.y - normalY },
    { x: start.x - normalX, y: start.y - normalY },
  ];
}

function posePlayerPoints(points, { position, facing, targetPose, bonePose, geometryScale }) {
  const footY = position.y + PLAYER_CHARACTER_FOOT_OFFSET;
  const lean = targetPose.bodyLean + bonePose.bodyLean;
  const cosine = Math.cos(lean);
  const sine = Math.sin(lean);
  return points.map((point) => {
    const relativeX = (point.x - position.x) * bonePose.bodyScaleX;
    const relativeY = (point.y - footY) * targetPose.bodyScaleY;
    const posedX = position.x + relativeX * cosine - relativeY * sine;
    const posedY = footY + relativeX * sine + relativeY * cosine;
    const scaledX = position.x + (posedX - position.x) * geometryScale;
    const scaledY = footY + (posedY - footY) * geometryScale;
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
  const bodyX = position.x + targetPose.bodyOffset.x + bonePose.rootOffset.x;
  const bodyY = position.y + targetPose.bodyOffset.y + bonePose.rootOffset.y;
  const projectedJoints = bonePose.projectedJoints ?? null;
  const projectedArm = (shoulder, elbow, hand) =>
    Object.freeze({
      root: { x: position.x + shoulder.x, y: position.y + shoulder.y },
      elbow: { x: position.x + elbow.x, y: position.y + elbow.y },
      hand: { x: position.x + hand.x, y: position.y + hand.y },
    });
  const rightArm =
    projectedJoints && bonePose.frameId
      ? projectedArm(
          projectedJoints.nearShoulder,
          projectedJoints.nearElbow,
          projectedJoints.nearHand,
        )
      : PLAYER_IK_SOLVER.solve({
          root: { x: bodyX + 17, y: bodyY - 25 },
          target: { x: bodyX + targetPose.handTarget.x, y: bodyY + targetPose.handTarget.y },
          upperLength: 38,
          lowerLength: 35,
          bendDirection: 1,
        });
  const leftArm =
    projectedJoints && bonePose.frameId
      ? projectedArm(projectedJoints.farShoulder, projectedJoints.farElbow, projectedJoints.farHand)
      : PLAYER_IK_SOLVER.solve({
          root: { x: bodyX - 17, y: bodyY - 24 },
          target: { x: bodyX + targetPose.shieldTarget.x, y: bodyY + targetPose.shieldTarget.y },
          upperLength: 34,
          lowerLength: 31,
          bendDirection: -1,
        });
  const bladeOrigin = {
    x: rightArm.hand.x + Math.cos(targetPose.swordAngle) * 5,
    y: rightArm.hand.y + Math.sin(targetPose.swordAngle) * 5,
  };
  const weaponPoints = transformPoints(
    [
      { x: 0, y: -3 },
      { x: 100 * weaponLengthScale, y: -3 },
      { x: 126 * weaponLengthScale, y: 0 },
      { x: 100 * weaponLengthScale, y: 4 },
      { x: 0, y: 4 },
    ],
    { ...bladeOrigin, rotation: targetPose.swordAngle },
  );
  const shieldPoints = transformPoints(
    [
      { x: -12, y: -29 },
      { x: 9, y: -32 },
      { x: 17, y: -2 },
      { x: 8, y: 28 },
      { x: -9, y: 23 },
      { x: -17, y: 0 },
    ],
    { x: leftArm.hand.x, y: leftArm.hand.y, rotation: -0.1 },
  );
  const rawHurtPolygons = [
    {
      part: 'torso',
      points: transformPoints(
        [
          { x: -21, y: -36 },
          { x: 17, y: -38 },
          { x: 23, y: 13 },
          { x: 13, y: 34 },
          { x: -15, y: 32 },
          { x: -25, y: 9 },
        ],
        { x: bodyX, y: bodyY },
      ),
    },
    {
      part: 'head',
      points: transformPoints(regularPolygon(17, 21, 8, Math.PI / 8), {
        x: bodyX - 1,
        y: bodyY - 63,
        rotation: bonePose.headTilt,
      }),
    },
    { part: 'weapon-arm', points: limbPolygon(rightArm.root, rightArm.elbow, 10) },
    { part: 'weapon-forearm', points: limbPolygon(rightArm.elbow, rightArm.hand, 8) },
    { part: 'shield-arm', points: limbPolygon(leftArm.root, leftArm.elbow, 10) },
    { part: 'shield-forearm', points: limbPolygon(leftArm.elbow, leftArm.hand, 8) },
  ];
  const pose = (points) =>
    posePlayerPoints(points, { position, facing, targetPose, bonePose, geometryScale });
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
  const attackProfile = attackProfiles[enemy.attackKind];
  const attackProgress =
    enemy.aiState === 'attack' ? 1 - enemy.aiSeconds / attackProfile.attackSeconds : 0;
  const recoveryProgress =
    enemy.aiState === 'recovery' && enemy.recoveryDurationSeconds > 0
      ? 1 - enemy.aiSeconds / enemy.recoveryDurationSeconds
      : 0;
  const weaponLength = sampleTrainingEnemyWeaponLength(enemy, attackProfiles);
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
  const presentationScale = enemy.presentationScale ?? 0.48;
  const poseEnemyPoints = (points) =>
    points.map((point) => {
      const centerY = y - 50;
      const relativeX = point.x - x;
      const relativeY = point.y - centerY;
      const rotatedX = x + relativeX * Math.cos(poseRotation) - relativeY * Math.sin(poseRotation);
      const rotatedY =
        centerY + relativeX * Math.sin(poseRotation) + relativeY * Math.cos(poseRotation);
      const facedX = renderFacing < 0 ? x * 2 - rotatedX : rotatedX;
      const embeddedOffset = enemy.groundBounceDelaySeconds > 0 ? 8 : 0;
      return {
        x: x + (facedX - x) * presentationScale,
        y: y + (rotatedY - y) * presentationScale + embeddedOffset,
      };
    });
  const weaponHand = { x: x + 8, y: y - (enemy.attackKind === 'sweep' ? 20 : 56) };
  const weaponPoints = transformPoints(
    [
      { x: 0, y: -3 },
      { x: weaponLength - 16, y: -3 },
      { x: weaponLength, y: 0 },
      { x: weaponLength - 16, y: 4 },
      { x: 0, y: 4 },
    ],
    { ...weaponHand, rotation: weaponAngle },
  );
  const bodyPoints = transformPoints(
    [
      { x: -17, y: -36 },
      { x: 16, y: -38 },
      { x: 21, y: 8 },
      { x: 11, y: 29 },
      { x: -13, y: 28 },
      { x: -21, y: 6 },
    ],
    { x, y: y - 31 },
  );
  return Object.freeze({
    actor: 'enemy',
    origin: freezePoint(enemy.position),
    weapon: freezePolygon('weapon', poseEnemyPoints(weaponPoints)),
    shield: null,
    hurt: Object.freeze([
      freezePolygon('body', poseEnemyPoints(bodyPoints)),
      freezePolygon(
        'head',
        poseEnemyPoints(transformPoints(regularPolygon(15, 18, 8), { x, y: y - 79 })),
      ),
    ]),
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
