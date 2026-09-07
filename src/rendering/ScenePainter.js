import { createCellLightingSample } from './CellLighting.js';
import { rasterizeDepthPolygons } from './DepthPolygonRasterizer.js';
import { paintHardEdgePolygon } from './HardEdgePolygonPainter.js';

const depthCanvases = new WeakMap();

function paintDepthGroup(
  context,
  items,
  frame,
  project,
  worldScale,
  occluders,
  showMesh,
  translucentPixels,
) {
  const projected = items.map((item) => {
    const projectPoint = (point) => project(point, item.parallax ?? 1);
    return {
      ...item,
      points: item.points.map(projectPoint),
      ...(item.surface
        ? { surface: { ...item.surface, points: item.surface.points.map(projectPoint) } }
        : {}),
      fill: resolveCellFill(item, frame, occluders),
      stroke: showMesh ? '#67e8f9' : item.stroke,
      lineWidth: Math.max(0.5, (item.lineWidth ?? 1) * worldScale),
    };
  });
  const points = projected.flatMap((item) => item.surface?.points ?? item.points);
  if (!points.length) return;
  if (!points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)))
    throw new TypeError('Projected actor has a non-finite screen vertex.');
  const transform = context.getTransform();
  const viewportWidth = (context.canvas.width - transform.e) / Math.max(1e-6, transform.a);
  const viewportHeight = (context.canvas.height - transform.f) / Math.max(1e-6, transform.d);
  const pad = Math.max(2, ...projected.map((item) => item.lineWidth));
  const left = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x)) - pad));
  const top = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y)) - pad));
  const right = Math.min(viewportWidth, Math.ceil(Math.max(...points.map((p) => p.x)) + pad));
  const bottom = Math.min(viewportHeight, Math.ceil(Math.max(...points.map((p) => p.y)) + pad));
  const width = Math.ceil(right - left);
  const height = Math.ceil(bottom - top);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width * height > 4194304)
    throw new RangeError('Projected actor raster exceeds bounded viewport.');
  if (width <= 0 || height <= 0) return;
  let canvas = depthCanvases.get(context);
  if (!canvas) {
    canvas =
      typeof OffscreenCanvas === 'function'
        ? new OffscreenCanvas(width, height)
        : context.canvas.ownerDocument.createElement('canvas');
    depthCanvases.set(context, canvas);
  }
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const target = canvas.getContext('2d');
  const pixels = target.createImageData(width, height);
  rasterizeDepthPolygons(projected, {
    width,
    height,
    offsetX: left,
    offsetY: top,
    data: pixels.data,
  });
  target.putImageData(pixels, 0, 0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels.data[(y * width + x) * 4 + 3];
      if (alpha > 0 && alpha < 255)
        translucentPixels.add((top + y) * context.canvas.width + left + x);
    }
  }
  context.globalAlpha = 1;
  context.drawImage(canvas, left, top);
}

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
    // Actor palettes are already authored muted; repeated desaturation erases
    // the skin / cloth / steel distinction before the low-resolution pass.
    saturationRetention: item.depthGroup ? 1 : artDirection.saturationRetention,
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

function paintSceneShadows(context, frame, project, hardEdges = false) {
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
    if (hardEdges)
      paintHardEdgePolygon(
        context,
        contactPoints.map((point) => project(point, 1)),
        { fill: '#080909' },
      );
    else if (drawPolygonPath(context, contactPoints, (point) => project(point, 1))) context.fill();

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
    if (hardEdges)
      paintHardEdgePolygon(
        context,
        projectedPoints.map((point) => project(point, 1)),
        { fill: '#080909' },
      );
    else if (drawPolygonPath(context, projectedPoints, (point) => project(point, 1)))
      context.fill();
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

export function paintSceneItems(
  context,
  frame,
  project,
  worldScale,
  { showMesh = false, hardEdges = false } = {},
) {
  context.lineJoin = 'round';
  context.lineCap = 'round';
  const degenerateItemIds = [];
  const rasterCollapseItemIds = [];
  const translucentPixels = new Set();
  const occluders =
    frame.lightingOccluders ??
    frame.items
      .filter((item) => item.lightOccluder === true)
      .map((item) => ({ id: item.id, points: item.points }));
  let shadowsPainted = false;

  for (let itemIndex = 0; itemIndex < frame.items.length; itemIndex += 1) {
    const item = frame.items[itemIndex];
    if (!shadowsPainted && (item.renderOrder ?? 0) >= 30.4) {
      paintSceneShadows(context, frame, project, hardEdges);
      shadowsPainted = true;
    }
    if (item.depthGroup && item.depths) {
      const group = [item];
      while (
        frame.items[itemIndex + 1]?.depthGroup === item.depthGroup &&
        frame.items[itemIndex + 1]?.depths
      ) {
        group.push(frame.items[++itemIndex]);
      }
      if (showMesh) {
        for (const member of group) {
          const sourceArea = polygonArea(member.points);
          const screenArea = polygonArea(
            member.points.map((point) => project(point, member.parallax ?? 1)),
          );
          if (sourceArea <= 0.0001) degenerateItemIds.push(member.id);
          else if (screenArea <= 0.0001) rasterCollapseItemIds.push(member.id);
        }
      }
      paintDepthGroup(
        context,
        group,
        frame,
        project,
        worldScale,
        occluders,
        showMesh,
        translucentPixels,
      );
      continue;
    }
    const rawOpacity = item.opacity ?? 1;
    const itemOpacity = Number.isFinite(rawOpacity) ? Math.max(0, Math.min(1, rawOpacity)) : 1;
    if (itemOpacity <= 0) continue;
    const itemProject = (point) => project(point, item.parallax ?? 1);
    if (item.points.length < 3) continue;
    context.globalAlpha = itemOpacity;
    context.fillStyle = resolveCellFill(item, frame, occluders);
    if (hardEdges) {
      paintHardEdgePolygon(context, item.points.map(itemProject), {
        fill: context.fillStyle,
        stroke: item.stroke,
        lineWidth: Math.max(0.5, (item.lineWidth ?? 1) * worldScale),
      });
    } else if (drawPolygonPath(context, item.points, itemProject)) context.fill();

    if (item.stroke && !hardEdges) {
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
      if (hardEdges)
        paintHardEdgePolygon(context, item.points.map(itemProject), {
          stroke: '#67e8f9',
          lineWidth: context.lineWidth,
        });
      else context.stroke();
      for (const point of item.points) {
        const screenPoint = itemProject(point);
        context.fillStyle = '#f8fafc';
        if (hardEdges) context.fillRect(Math.round(screenPoint.x), Math.round(screenPoint.y), 1, 1);
        else {
          context.beginPath();
          context.arc(screenPoint.x, screenPoint.y, Math.max(1, worldScale * 1.6), 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }

  if (!shadowsPainted) paintSceneShadows(context, frame, project, hardEdges);

  context.globalAlpha = 1;
  return Object.freeze({
    translucentPixels,
    degenerateItemIds: Object.freeze(degenerateItemIds),
    rasterCollapseItemIds: Object.freeze(rasterCollapseItemIds),
  });
}
