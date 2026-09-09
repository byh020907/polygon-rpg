// Gameplay reach is a forward X extent, matching AttackSpatialProfiles calibration.
// The authored reach also bounds rear and vertical space by default. Overrides must
// remain finite; visible geometry can never expand these gameplay limits.
// Clip the weapon itself: separate overlap tests could approve two different contacts.
export function createAttackEnvelope({
  origin,
  facing,
  reach,
  rearReach = reach,
  minY = origin?.y - reach,
  maxY = origin?.y + reach,
}) {
  if (
    !Number.isFinite(origin?.x) ||
    !Number.isFinite(origin?.y) ||
    !Number.isFinite(facing) ||
    facing === 0
  )
    throw new TypeError('Attack envelope requires a finite origin and facing.');
  if (
    !Number.isFinite(reach) ||
    reach <= 0 ||
    !Number.isFinite(rearReach) ||
    rearReach < 0 ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY) ||
    minY >= maxY
  )
    throw new RangeError('Attack envelope requires finite authored spatial bounds.');
  return Object.freeze({
    origin: Object.freeze({ ...origin }),
    facing: facing < 0 ? -1 : 1,
    reach,
    rearReach,
    minY,
    maxY,
  });
}

export function clipWeaponToEnvelope(weapon, envelope) {
  let points = weapon.points;
  const { origin, facing, reach, rearReach, minY, maxY } = envelope;
  for (const distance of [
    (p) => reach - (p.x - origin.x) * facing,
    (p) => rearReach + (p.x - origin.x) * facing,
    (p) => p.y - minY,
    (p) => maxY - p.y,
  ]) {
    const input = points;
    points = [];
    for (let i = 0; i < input.length; i += 1) {
      const a = input[i],
        b = input[(i + 1) % input.length];
      const da = distance(a),
        db = distance(b);
      if (da >= 0) points.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
  }
  return Object.freeze({
    ...weapon,
    points: Object.freeze(points.map((p) => Object.freeze({ ...p }))),
  });
}
