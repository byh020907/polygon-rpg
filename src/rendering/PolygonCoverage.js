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
