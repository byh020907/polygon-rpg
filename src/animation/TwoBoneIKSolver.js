const EPSILON = 0.0001;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function finitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new TypeError(`${label}에는 유한한 x, y가 필요합니다.`);
  }
  return point;
}

export class TwoBoneIKSolver {
  solve({ root, target, upperLength, lowerLength, bendDirection = 1 }) {
    finitePoint(root, 'IK root');
    finitePoint(target, 'IK target');
    if (!(upperLength > 0) || !(lowerLength > 0)) {
      throw new TypeError('IK bone length는 0보다 커야 합니다.');
    }

    const deltaX = target.x - root.x;
    const deltaY = target.y - root.y;
    const targetDistance = Math.hypot(deltaX, deltaY);
    const minimumReach = Math.abs(upperLength - lowerLength) + EPSILON;
    const maximumReach = upperLength + lowerLength - EPSILON;
    const solvedDistance = clamp(targetDistance || EPSILON, minimumReach, maximumReach);
    const targetAngle = Math.atan2(deltaY, deltaX);
    const cosineShoulder = clamp(
      (solvedDistance * solvedDistance + upperLength * upperLength - lowerLength * lowerLength) /
        (2 * solvedDistance * upperLength),
      -1,
      1,
    );
    const shoulderOffset = Math.acos(cosineShoulder) * Math.sign(bendDirection || 1);
    const upperRotation = targetAngle + shoulderOffset;
    const elbow = Object.freeze({
      x: root.x + Math.cos(upperRotation) * upperLength,
      y: root.y + Math.sin(upperRotation) * upperLength,
    });
    const directionX = targetDistance > EPSILON ? deltaX / targetDistance : 1;
    const directionY = targetDistance > EPSILON ? deltaY / targetDistance : 0;
    const hand = Object.freeze({
      x: root.x + directionX * solvedDistance,
      y: root.y + directionY * solvedDistance,
    });
    const lowerRotation = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);

    return Object.freeze({
      root: Object.freeze({ x: root.x, y: root.y }),
      elbow,
      hand,
      upperRotation,
      lowerRotation,
      targetDistance,
      solvedDistance,
      reached: Math.abs(targetDistance - solvedDistance) <= 0.01,
    });
  }
}
