export const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);
export const multiply = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];
export const point = (m, p) => ({
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5],
});
export function inverse(m) {
  const d = m[0] * m[3] - m[1] * m[2];
  if (!Number.isFinite(d) || Math.abs(d) < 1e-10)
    throw new Error('Singular or nonfinite SVG transform');
  return [
    m[3] / d,
    -m[1] / d,
    -m[2] / d,
    m[0] / d,
    (m[2] * m[5] - m[3] * m[4]) / d,
    (m[1] * m[4] - m[0] * m[5]) / d,
  ];
}
export function numbers(value) {
  const source = String(value ?? '');
  const tokens = source.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? [];
  if (source.replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g, '').replace(/[\s,]/g, ''))
    throw new Error('Invalid SVG number list');
  const result = tokens.map(Number);
  if (result.some((n) => !Number.isFinite(n))) throw new Error('Nonfinite SVG number');
  return result;
}
export function transform(value = '') {
  let result = [...IDENTITY];
  let end = 0;
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  for (const match of value.matchAll(re)) {
    if (value.slice(end, match.index).trim()) throw new Error('Invalid transform');
    end = match.index + match[0].length;
    const v = numbers(match[2]);
    let m;
    switch (match[1]) {
      case 'matrix':
        if (v.length === 6) m = v;
        break;
      case 'translate':
        if (v.length === 1 || v.length === 2) m = [1, 0, 0, 1, v[0], v[1] ?? 0];
        break;
      case 'scale':
        if (v.length === 1 || v.length === 2) m = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
        break;
      case 'rotate':
        if (v.length === 1 || v.length === 3) {
          const a = (v[0] * Math.PI) / 180,
            c = Math.cos(a),
            s = Math.sin(a);
          m = [c, s, -s, c, 0, 0];
          if (v.length === 3)
            m = multiply(multiply([1, 0, 0, 1, v[1], v[2]], m), [1, 0, 0, 1, -v[1], -v[2]]);
        }
        break;
      case 'skewX':
        if (v.length === 1) m = [1, 0, Math.tan((v[0] * Math.PI) / 180), 1, 0, 0];
        break;
      case 'skewY':
        if (v.length === 1) m = [1, Math.tan((v[0] * Math.PI) / 180), 0, 1, 0, 0];
        break;
      default:
        throw new Error('Unsupported transform ' + match[1]);
    }
    if (!m || m.some((n) => !Number.isFinite(n))) throw new Error('Invalid transform arguments');
    inverse(m);
    result = multiply(result, m);
  }
  if (value.slice(end).trim()) throw new Error('Invalid transform');
  return result;
}
export function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export const frameMatrix = ([x, y, w, h]) => [w / 2, 0, 0, h / 2, x + w / 2, y + h / 2];
