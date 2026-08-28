function drawPolygonPath(context, points, project) {
  if (points.length < 3) return false;
  const firstPoint = project(points[0]);
  context.beginPath();
  context.moveTo(firstPoint.x, firstPoint.y);
  for (let index = 1; index < points.length; index += 1) {
    const screenPoint = project(points[index]);
    context.lineTo(screenPoint.x, screenPoint.y);
  }
  context.closePath();
  return true;
}

export function paintBackdrop(
  context,
  frame,
  viewport,
  project,
  { retro = false, showWorldGrid = true } = {},
) {
  context.fillStyle = frame.palette.background;
  context.fillRect(0, 0, viewport.width, viewport.height);

  const worldTopLeft = project({ x: 0, y: 0 });
  const worldBottomRight = project({ x: frame.worldSize.width, y: frame.worldSize.height });
  context.fillStyle = frame.palette.arena;
  context.fillRect(
    worldTopLeft.x,
    worldTopLeft.y,
    worldBottomRight.x - worldTopLeft.x,
    worldBottomRight.y - worldTopLeft.y,
  );

  if (showWorldGrid) {
    context.strokeStyle = retro ? frame.palette.gridRetro : frame.palette.grid;
    context.lineWidth = retro ? 1 : 0.75;
    for (let worldX = 0; worldX <= frame.worldSize.width; worldX += frame.gridSize) {
      const start = project({ x: worldX, y: 0 });
      const end = project({ x: worldX, y: frame.worldSize.height });
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    for (let worldY = 0; worldY <= frame.worldSize.height; worldY += frame.gridSize) {
      const start = project({ x: 0, y: worldY });
      const end = project({ x: frame.worldSize.width, y: worldY });
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
  }

  if (Number.isFinite(frame.groundY)) {
    const groundTop = project({ x: 0, y: frame.groundY });
    context.fillStyle = frame.palette.ground;
    context.fillRect(
      worldTopLeft.x,
      groundTop.y,
      worldBottomRight.x - worldTopLeft.x,
      worldBottomRight.y - groundTop.y,
    );
  }
}

export function paintSceneItems(context, frame, project, worldScale, { showMesh = false } = {}) {
  context.lineJoin = 'round';
  context.lineCap = 'round';

  for (const item of frame.items) {
    if (!drawPolygonPath(context, item.points, project)) continue;
    context.globalAlpha = item.opacity ?? 1;
    context.fillStyle = item.fill;
    context.fill();

    if (item.stroke) {
      context.strokeStyle = item.stroke;
      context.lineWidth = Math.max(0.5, (item.lineWidth ?? 1) * worldScale);
      context.stroke();
    }

    if (showMesh) {
      context.globalAlpha = 0.82;
      context.strokeStyle = '#67e8f9';
      context.lineWidth = Math.max(0.6, worldScale * 0.7);
      context.stroke();
      for (const point of item.points) {
        const screenPoint = project(point);
        context.fillStyle = '#f8fafc';
        context.beginPath();
        context.arc(screenPoint.x, screenPoint.y, Math.max(1, worldScale * 1.6), 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  context.globalAlpha = 1;
}
