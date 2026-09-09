import { numbers } from './SvgMath.js';
export function pathPoints(source, steps = 12) {
  const tokens = source.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? [];
  if (
    source
      .replace(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g, '')
      .replace(/[\s,]/g, '')
  )
    throw new Error('Invalid SVG path');
  let i = 0,
    cmd = null,
    current = { x: 0, y: 0 },
    control = null,
    previous = '',
    closed = false;
  const points = [];
  const read = () => {
    if (i >= tokens.length || /^[a-z]$/i.test(tokens[i])) throw new Error('Missing path argument');
    const v = Number(tokens[i++]);
    if (!Number.isFinite(v)) throw new Error('Invalid path number');
    return v;
  };
  while (i < tokens.length) {
    if (points.length > 512) throw new Error('SVG per-shape vertex budget exceeded');
    if (/^[a-z]$/i.test(tokens[i])) cmd = tokens[i++];
    if (!cmd) throw new Error('Missing path command');
    const upper = cmd.toUpperCase(),
      rel = cmd !== upper;
    if (!points.length && upper !== 'M') throw new Error('SVG path must begin with M');
    const p = () => ({ x: read() + (rel ? current.x : 0), y: read() + (rel ? current.y : 0) });
    let next;
    if (closed) throw new Error('Multiple subpaths are unsupported');
    if (upper === 'M') {
      if (points.length) throw new Error('Multiple subpaths are unsupported');
      next = p();
      cmd = rel ? 'l' : 'L';
    } else if (upper === 'L') next = p();
    else if (upper === 'H') next = { x: read() + (rel ? current.x : 0), y: current.y };
    else if (upper === 'V') next = { x: current.x, y: read() + (rel ? current.y : 0) };
    else if (['C', 'S', 'Q', 'T'].includes(upper)) {
      const cubic = upper === 'C' || upper === 'S';
      let a;
      if (upper === 'S' || upper === 'T') {
        const compatible = cubic ? ['C', 'S'] : ['Q', 'T'];
        a =
          control && compatible.includes(previous)
            ? { x: 2 * current.x - control.x, y: 2 * current.y - control.y }
            : { ...current };
      } else a = p();
      const b = cubic ? p() : null;
      next = p();
      for (let j = 1; j <= steps; j++) {
        const t = j / steps,
          u = 1 - t;
        points.push(
          cubic
            ? {
                x:
                  u * u * u * current.x +
                  3 * u * u * t * a.x +
                  3 * u * t * t * b.x +
                  t * t * t * next.x,
                y:
                  u * u * u * current.y +
                  3 * u * u * t * a.y +
                  3 * u * t * t * b.y +
                  t * t * t * next.y,
              }
            : {
                x: u * u * current.x + 2 * u * t * a.x + t * t * next.x,
                y: u * u * current.y + 2 * u * t * a.y + t * t * next.y,
              },
        );
      }
      control = cubic ? b : a;
      current = next;
      previous = upper;
      continue;
    } else if (upper === 'Z') {
      closed = true;
      cmd = null;
      previous = upper;
      continue;
    } else
      throw new Error(
        'Unsupported SVG path command ' + upper + '; use closed M/L/H/V/C/S/Q/T/Z paths',
      );
    points.push(next);
    current = next;
    control = null;
    previous = upper;
    if (points.length > 8192) throw new Error('SVG path vertex budget exceeded');
  }
  if (!closed) throw new Error('SVG filled paths must close with Z');
  return points;
}
export function shapePoints(node, steps) {
  const tag = node.localName ?? node.nodeName;
  const get = (name, fallback = 0) => {
    const text = node.getAttribute(name);
    if (text === null || text === '') return fallback;
    const v = numbers(text);
    if (v.length !== 1) throw new Error('Invalid ' + name);
    return v[0];
  };
  if (tag === 'polygon') {
    const values = numbers(node.getAttribute('points'));
    if (values.length < 6 || values.length % 2) throw new Error('Invalid polygon');
    return values.reduce((out, v, i) => {
      if (i % 2 === 0) out.push({ x: v, y: values[i + 1] });
      return out;
    }, []);
  }
  if (tag === 'path') return pathPoints(node.getAttribute('d') ?? '', steps);
  if (tag === 'rect') {
    if (get('rx') || get('ry')) throw new Error('Rounded rect unsupported; use path');
    const x = get('x'),
      y = get('y'),
      w = get('width'),
      h = get('height');
    if (w <= 0 || h <= 0) throw new Error('Invalid rect');
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }
  const cx = get('cx'),
    cy = get('cy'),
    rx = get(tag === 'circle' ? 'r' : 'rx'),
    ry = tag === 'circle' ? rx : get('ry');
  if (rx <= 0 || ry <= 0) throw new Error('Invalid ellipse');
  return Array.from({ length: steps * 4 }, (_, i) => ({
    x: cx + rx * Math.cos((i * Math.PI) / (steps * 2)),
    y: cy + ry * Math.sin((i * Math.PI) / (steps * 2)),
  }));
}
export function triangulate(input) {
  const points = input.filter(
    (p, i) => !i || Math.hypot(p.x - input[i - 1].x, p.y - input[i - 1].y) > 1e-10,
  );
  if (
    points.length > 2 &&
    Math.hypot(points[0].x - points.at(-1).x, points[0].y - points.at(-1).y) < 1e-10
  )
    points.pop();
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  // Reject self-intersections before ear clipping: no silent fill-rule approximation.
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = points[j],
        d = points[(j + 1) % points.length];
      if (cross(a, b, c) * cross(a, b, d) < -1e-16 && cross(c, d, a) * cross(c, d, b) < -1e-16)
        throw new Error('Self-intersecting SVG polygon unsupported');
    }
  }
  const area = points.reduce(
    (sum, p, i) =>
      sum + p.x * points[(i + 1) % points.length].y - p.y * points[(i + 1) % points.length].x,
    0,
  );
  if (Math.abs(area) < 1e-10) throw new Error('Degenerate SVG polygon');
  const sign = Math.sign(area),
    indices = points.map((_, i) => i),
    triangles = [];
  let budget = points.length ** 2;
  while (indices.length > 3 && budget-- > 0) {
    let found = false;
    for (let i = 0; i < indices.length; i++) {
      const a = indices[(i + indices.length - 1) % indices.length],
        b = indices[i],
        c = indices[(i + 1) % indices.length];
      if (sign * cross(points[a], points[b], points[c]) <= 1e-10) continue;
      const inside = indices.some(
        (k) =>
          k !== a &&
          k !== b &&
          k !== c &&
          sign * cross(points[a], points[b], points[k]) >= -1e-10 &&
          sign * cross(points[b], points[c], points[k]) >= -1e-10 &&
          sign * cross(points[c], points[a], points[k]) >= -1e-10,
      );
      if (inside) continue;
      triangles.push([a, b, c]);
      indices.splice(i, 1);
      found = true;
      break;
    }
    if (!found) throw new Error('Non-simple or degenerate SVG polygon');
  }
  if (indices.length !== 3) throw new Error('Triangulation budget exceeded');
  triangles.push(indices);
  return { points, triangles };
}
