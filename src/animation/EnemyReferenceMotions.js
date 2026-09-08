// Shared by every design bound to the same anatomical roles. This file contains
// no artwork, pixel lengths, colors, or per-character animation copies.
export function sampleEnemyReferenceMotion(type, action, phase) {
  const cycle = phase * Math.PI * 2,
    s = Math.sin(cycle),
    c = Math.cos(cycle);
  const pose = {};
  const rotate = (id, z = 0, y = 0) => {
    pose[id] = { rotation: { z, y } };
  };
  const shift = (id, y, x = 0) => {
    pose[id] = { ...pose[id], shift: [x, y, 0] };
  };
  const smooth = (t) => {
    const p = Math.max(0, Math.min(1, t));
    return p * p * (3 - 2 * p);
  };
  const strike =
    phase < 0.35
      ? -smooth(phase / 0.35)
      : phase < 0.5
        ? -1 + 2 * smooth((phase - 0.35) / 0.15)
        : 1 - smooth((phase - 0.5) / 0.5);
  if (type === 'humanoid') {
    rotate('torso', action === 'attack' ? strike * 0.1 : s * 0.015);
    for (const [side, sign] of [
      ['rear', -1],
      ['front', 1],
    ]) {
      rotate(`${side}Thigh`, action === 'move' ? s * sign * 0.24 : sign * 0.025);
      rotate(`${side}Shin`, action === 'move' ? Math.max(0, -s * sign) * 0.35 : 0.035);
      rotate(`${side}Arm`, action === 'move' ? -s * sign * 0.18 : sign * 0.02);
    }
    if (action === 'attack') {
      rotate('frontArm', -strike * 0.8);
      rotate('frontForearm', -strike * 0.35);
    }
    shift('pelvis', action === 'move' ? -Math.abs(s) * 0.02 : s * 0.006);
  } else if (type === 'beast') {
    for (const side of ['rear', 'front'])
      for (const end of ['hind', 'lead']) {
        const sign = (side === 'rear' ? -1 : 1) * (end === 'hind' ? -1 : 1);
        rotate(`${side}${end}Leg`, action === 'move' ? s * sign * 0.25 : 0);
        rotate(`${side}${end}Paw`, action === 'move' ? Math.max(0, -s * sign) * 0.45 : 0.04);
      }
    rotate('neck', action === 'attack' ? strike * 0.4 : s * 0.025);
    shift(
      'torso',
      action === 'move' ? -Math.abs(s) * 0.018 : s * 0.006,
      action === 'attack' ? Math.max(0, strike) * 0.06 : 0,
    );
  } else if (type === 'flying') {
    for (const [side, sign] of [
      ['rear', -1],
      ['front', 1],
    ]) {
      rotate(`${side}Wing`, sign * (0.2 + s * 0.24), sign * c * 0.45);
      rotate(`${side}WingTip`, sign * (-0.15 + s * 0.16), sign * c * 0.15);
    }
    rotate('torso', action === 'attack' ? strike * 0.16 : s * 0.025);
    rotate('tail', s * 0.12);
    shift('torso', s * 0.024 + (action === 'attack' ? Math.max(0, strike) * 0.12 : 0));
  } else if (type === 'machine') {
    rotate('wheelRear', action === 'move' ? cycle : 0);
    rotate('wheelFront', action === 'move' ? cycle : 0);
    rotate('sawArm', -0.03 + (action === 'attack' ? strike * 0.35 : s * 0.015));
    rotate('blade', cycle * (action === 'attack' ? 2 : 0.5));
    shift('torso', action === 'move' ? Math.abs(s) * 0.008 : 0);
  } else throw new RangeError(`Unknown reference archetype: ${type}`);
  return pose;
}
