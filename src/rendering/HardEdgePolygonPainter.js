// Integer pixel coverage, shared by flat fills and intentional translucent shapes.
export function polygonSpans(points, width, height, visit) {
  if (points.length < 3) return;
  const first = Math.max(0, Math.ceil(Math.min(...points.map((p) => p.y)) - 0.5));
  const last = Math.min(height - 1, Math.ceil(Math.max(...points.map((p) => p.y)) - 0.5) - 1);
  for (let y = first; y <= last; y += 1) {
    const crossings = [];
    const sampleY = y + 0.5;
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if ((a.y <= sampleY && b.y > sampleY) || (b.y <= sampleY && a.y > sampleY)) {
        crossings.push(a.x + ((sampleY - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const left = Math.max(0, Math.ceil(crossings[i] - 0.5));
      const right = Math.min(width, Math.ceil(crossings[i + 1] - 0.5));
      if (right > left) visit(left, y, right - left);
    }
  }
}

function clipLine(a, b, width, height, pad) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let start = 0;
  let end = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x + pad, width - 1 + pad - a.x, a.y + pad, height - 1 + pad - a.y];
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) start = Math.max(start, t);
      else end = Math.min(end, t);
      if (start > end) return null;
    }
  }
  return [
    Math.round(a.x + start * dx),
    Math.round(a.y + start * dy),
    Math.round(a.x + end * dx),
    Math.round(a.y + end * dy),
  ];
}

export function polygonStrokePixels(points, width, height, lineWidth, visit) {
  const size = Math.max(1, Math.min(16, Math.round(lineWidth)));
  const offset = Math.floor(size / 2);
  const visited = new Set();
  for (let i = 0; i < points.length; i += 1) {
    const line = clipLine(points[i], points[(i + 1) % points.length], width, height, size);
    if (!line) continue;
    let [x, y] = line;
    const [, , endX, endY] = line;
    const dx = Math.abs(endX - x);
    const dy = -Math.abs(endY - y);
    const sx = x < endX ? 1 : -1;
    const sy = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      for (let oy = 0; oy < size; oy += 1)
        for (let ox = 0; ox < size; ox += 1) {
          const px = x + ox - offset;
          const py = y + oy - offset;
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const key = py * width + px;
          if (!visited.has(key)) {
            visited.add(key);
            visit(px, py);
          }
        }
      if (x === endX && y === endY) break;
      const doubled = error * 2;
      if (doubled >= dy) {
        error += dy;
        x += sx;
      }
      if (doubled <= dx) {
        error += dx;
        y += sy;
      }
    }
  }
}

export function paintHardEdgePolygon(context, points, { fill, stroke, lineWidth = 1 }) {
  if (!points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)))
    throw new TypeError('Hard-edge polygon requires finite screen coordinates.');
  const { width, height } = context.canvas;
  if (fill) {
    context.fillStyle = fill;
    polygonSpans(points, width, height, (x, y, length) => context.fillRect(x, y, length, 1));
  }
  if (stroke) {
    context.fillStyle = stroke;
    polygonStrokePixels(points, width, height, lineWidth, (x, y) => context.fillRect(x, y, 1, 1));
  }
}
