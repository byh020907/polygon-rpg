export function normalizeQuaternion(value) {
  if (!value || !['x', 'y', 'z', 'w'].every((key) => Number.isFinite(value[key]))) {
    throw new TypeError('Quaternion requires finite x/y/z/w.');
  }
  const length = Math.hypot(value.x, value.y, value.z, value.w);
  if (length < 1e-12) throw new RangeError('Quaternion cannot have zero length.');
  return Object.freeze({
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
    w: value.w / length,
  });
}

export function multiplyQuaternions(a, b) {
  return normalizeQuaternion({
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  });
}

export function conjugateQuaternion(q) {
  return Object.freeze({ x: -q.x, y: -q.y, z: -q.z, w: q.w });
}

export function axisAngleQuaternion(axis, angle) {
  const length = Math.hypot(axis.x, axis.y, axis.z);
  if (!Number.isFinite(angle) || !Number.isFinite(length) || length < 1e-12)
    throw new TypeError('Axis-angle requires a direction and finite angle.');
  const sine = Math.sin(angle / 2) / length;
  return normalizeQuaternion({
    x: axis.x * sine,
    y: axis.y * sine,
    z: axis.z * sine,
    w: Math.cos(angle / 2),
  });
}

// Authoring/import boundary only. Runtime frames store the resulting quaternion.
export function quaternionFromEuler({ x = 0, y = 0, z = 0 }) {
  return multiplyQuaternions(
    axisAngleQuaternion({ x: 0, y: 0, z: 1 }, z),
    multiplyQuaternions(
      axisAngleQuaternion({ x: 0, y: 1, z: 0 }, y),
      axisAngleQuaternion({ x: 1, y: 0, z: 0 }, x),
    ),
  );
}

export function slerpQuaternion(from, to, amount) {
  const a = normalizeQuaternion(from);
  let b = normalizeQuaternion(to);
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  if (dot < 0) {
    b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
    dot = -dot;
  }
  const t = Math.max(0, Math.min(1, amount));
  let first = 1 - t;
  let second = t;
  if (dot < 0.9995) {
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    first = Math.sin((1 - t) * angle) / Math.sin(angle);
    second = Math.sin(t * angle) / Math.sin(angle);
  }
  return normalizeQuaternion(
    Object.fromEntries(['x', 'y', 'z', 'w'].map((key) => [key, a[key] * first + b[key] * second])),
  );
}

export function quaternionMatrix(value) {
  const { x, y, z, w } = normalizeQuaternion(value);
  return Object.freeze([
    Object.freeze([1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)]),
    Object.freeze([2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)]),
    Object.freeze([2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]),
  ]);
}

export function rotateByQuaternion(q, point) {
  const m = quaternionMatrix(q);
  return Object.freeze({
    x: m[0][0] * point.x + m[0][1] * point.y + m[0][2] * point.z,
    y: m[1][0] * point.x + m[1][1] * point.y + m[1][2] * point.z,
    z: m[2][0] * point.x + m[2][1] * point.y + m[2][2] * point.z,
  });
}
