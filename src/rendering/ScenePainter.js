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

function polygonArea(points) {
  if (points.length < 3) return 0;
  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    doubledArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(doubledArea) / 2;
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
  const degenerateItemIds = [];
  const rasterCollapseItemIds = [];

  for (const item of frame.items) {
    const rawOpacity = item.opacity ?? 1;
    const itemOpacity = Number.isFinite(rawOpacity) ? Math.max(0, Math.min(1, rawOpacity)) : 1;
    if (itemOpacity <= 0) continue;
    if (!drawPolygonPath(context, item.points, project)) continue;
    context.globalAlpha = itemOpacity;
    context.fillStyle = item.fill;
    context.fill();

    if (item.stroke) {
      context.strokeStyle = item.stroke;
      context.lineWidth = Math.max(0.5, (item.lineWidth ?? 1) * worldScale);
      context.stroke();
    }

    const sourceArea = showMesh ? polygonArea(item.points) : 0;
    const projectedArea = showMesh ? polygonArea(item.points.map(project)) : 0;
    if (showMesh && sourceArea <= 0.0001) degenerateItemIds.push(item.id);
    else if (showMesh && projectedArea <= 0.0001) rasterCollapseItemIds.push(item.id);
    if (showMesh && sourceArea > 0.0001 && projectedArea > 0.0001) {
      context.globalAlpha = 0.82 * itemOpacity;
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
  return Object.freeze({
    degenerateItemIds: Object.freeze(degenerateItemIds),
    rasterCollapseItemIds: Object.freeze(rasterCollapseItemIds),
  });
}
