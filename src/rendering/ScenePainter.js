import { createCellLightingSample } from './CellLighting.js';

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

function polygonCenter(points) {
  const total = points.reduce(
    (result, point) => ({ x: result.x + point.x, y: result.y + point.y }),
    { x: 0, y: 0 },
  );
  return { x: total.x / points.length, y: total.y / points.length };
}

function inferMaterialId(item) {
  const id = item.id.toLowerCase();
  if (/coat|cloth|trouser|uniform|workwear|cape|strap|pack/.test(id)) return 'cloth';
  if (/ground|soil|dust|earth|road/.test(id)) return 'soil';
  if (/metal|rail|plate|blade|shield|sword|helmet|tool|cable|bearing|chassis/.test(id)) {
    return 'metal';
  }
  return 'stone';
}

function isFunctionalEmissive(item) {
  return (
    item.emissive === true ||
    /aura|bolt|contact|effect|flash|glow|hit-ring|signal|spark|streak|trail|warning/.test(item.id)
  );
}

function resolveCellFill(item, frame, occluders) {
  const artDirection = frame.artDirection;
  if (!artDirection || !/^#[\da-f]{6}$/i.test(item.fill)) return item.fill;
  if (isFunctionalEmissive(item)) return item.fill;

  const sample = createCellLightingSample({
    baseColor: item.fill,
    position: polygonCenter(item.points),
    normal: item.surfaceNormal ?? { x: 0, y: -1 },
    material: item.materialId ?? inferMaterialId(item),
    ambientIntensity: artDirection.ambientIntensity,
    lights: artDirection.lights,
    occluders: occluders.filter((occluder) => occluder.id !== item.id),
    quantizationLevels: artDirection.quantizationLevels,
    saturationRetention: artDirection.saturationRetention,
  });
  return sample.shadedColor;
}

function ellipsePoints(center, radiusX, radiusY, pointCount = 12) {
  return Array.from({ length: pointCount }, (_, index) => {
    const angle = (index / pointCount) * Math.PI * 2;
    return {
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY,
    };
  });
}

function paintSceneShadows(context, frame, project) {
  const shadowCasters = frame.artDirection?.shadowCasters ?? [];
  if (shadowCasters.length === 0) return;
  const directionalLight = frame.artDirection.lights.find((light) => light.kind === 'directional');
  const shadowDirection = directionalLight?.direction ?? { x: -0.4, y: 0.9 };

  context.save();
  for (const caster of shadowCasters) {
    const contactPoints = ellipsePoints(
      { x: caster.position.x, y: caster.position.y + 2 },
      caster.width * 0.56,
      Math.max(3, caster.width * 0.11),
    );
    context.globalAlpha = caster.opacity;
    context.fillStyle = '#080909';
    if (drawPolygonPath(context, contactPoints, (point) => project(point, 1))) context.fill();

    const castLength = Math.min(96, caster.height * 0.72);
    const castX = shadowDirection.x * castLength;
    const projectedPoints = [
      { x: caster.position.x - caster.width * 0.42, y: caster.position.y },
      { x: caster.position.x + caster.width * 0.42, y: caster.position.y },
      {
        x: caster.position.x + castX + caster.width * 0.16,
        y: caster.position.y + Math.max(7, castLength * 0.12),
      },
      {
        x: caster.position.x + castX - caster.width * 0.16,
        y: caster.position.y + Math.max(7, castLength * 0.12),
      },
    ];
    context.globalAlpha = caster.opacity * 0.52;
    if (drawPolygonPath(context, projectedPoints, (point) => project(point, 1))) context.fill();
  }
  context.restore();
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
  const occluders = frame.items
    .filter((item) => item.lightOccluder === true)
    .map((item) => ({ id: item.id, points: item.points }));
  let shadowsPainted = false;

  for (const item of frame.items) {
    if (!shadowsPainted && (item.renderOrder ?? 0) >= 30.4) {
      paintSceneShadows(context, frame, project);
      shadowsPainted = true;
    }
    const rawOpacity = item.opacity ?? 1;
    const itemOpacity = Number.isFinite(rawOpacity) ? Math.max(0, Math.min(1, rawOpacity)) : 1;
    if (itemOpacity <= 0) continue;
    const itemProject = (point) => project(point, item.parallax ?? 1);
    if (!drawPolygonPath(context, item.points, itemProject)) continue;
    context.globalAlpha = itemOpacity;
    context.fillStyle = resolveCellFill(item, frame, occluders);
    context.fill();

    if (item.stroke) {
      context.strokeStyle = item.stroke;
      context.lineWidth = Math.max(0.5, (item.lineWidth ?? 1) * worldScale);
      context.stroke();
    }

    const sourceArea = showMesh ? polygonArea(item.points) : 0;
    const projectedArea = showMesh ? polygonArea(item.points.map(itemProject)) : 0;
    if (showMesh && sourceArea <= 0.0001) degenerateItemIds.push(item.id);
    else if (showMesh && projectedArea <= 0.0001) rasterCollapseItemIds.push(item.id);
    if (showMesh && sourceArea > 0.0001 && projectedArea > 0.0001) {
      context.globalAlpha = 0.82 * itemOpacity;
      context.strokeStyle = '#67e8f9';
      context.lineWidth = Math.max(0.6, worldScale * 0.7);
      context.stroke();
      for (const point of item.points) {
        const screenPoint = itemProject(point);
        context.fillStyle = '#f8fafc';
        context.beginPath();
        context.arc(screenPoint.x, screenPoint.y, Math.max(1, worldScale * 1.6), 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  if (!shadowsPainted) paintSceneShadows(context, frame, project);

  context.globalAlpha = 1;
  return Object.freeze({
    degenerateItemIds: Object.freeze(degenerateItemIds),
    rasterCollapseItemIds: Object.freeze(rasterCollapseItemIds),
  });
}
