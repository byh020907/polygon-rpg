import { createHybridShadowGeometry } from './HybridShadows.js';
import { createCellLightingSample } from './CellLighting.js';

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

export function resolveWebGlCellFill(item, frame, occluders) {
  const artDirection = frame.artDirection;
  if (!artDirection || !/^#[\da-f]{6}$/i.test(item.fill)) return item.fill;
  if (isFunctionalEmissive(item)) return item.fill;
  return createCellLightingSample({
    baseColor: item.fill,
    position: { ...polygonCenter(item.points), z: (item.sceneZ ?? 0) + (item.z ?? 0) },
    normal: item.surfaceNormal ?? { x: 0, y: -1 },
    material: item.materialId ?? inferMaterialId(item),
    ambientIntensity: artDirection.ambientIntensity,
    lights: artDirection.lights,
    occluders: occluders.filter(
      (occluder) =>
        occluder.id !== item.id && (!item.worldObjectId || occluder.ownerId !== item.worldObjectId),
    ),
    quantizationLevels: artDirection.quantizationLevels,
    structuralOcclusion: item.structuralOcclusion ?? 0,
    saturationRetention:
      item.saturationRetention ?? (item.depthGroup ? 1 : artDirection.saturationRetention),
  }).shadedColor;
}

function shadowBatches(frame) {
  const batches = new Map();
  for (const caster of frame.artDirection?.shadowCasters ?? []) {
    const owner = caster.ownerId ?? caster.id?.replace(/-(?:ground-)?shadow$/, '');
    const index = frame.items.findIndex(
      (item) =>
        item.id === owner ||
        item.depthGroup === owner ||
        item.worldObjectId === owner ||
        item.id.startsWith(owner + '-'),
    );
    if (index < 0) continue;
    const shapes = createHybridShadowGeometry({
      casters: [caster],
      lights: frame.artDirection?.lights ?? [],
      groundDepthScale: frame.artDirection?.groundDepthScale ?? 0.16,
    });
    batches.set(index, [...(batches.get(index) ?? []), ...shapes]);
  }
  return batches;
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

function validateSurface(item, surface) {
  if (
    surface.points.length !== surface.depths?.length ||
    !surface.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) ||
    !surface.depths.every(Number.isFinite) ||
    !Number.isFinite(item.opacity ?? 1) ||
    !Number.isFinite(item.lineWidth ?? 1)
  ) {
    throw new TypeError(
      'Depth surfaces require matching finite screen vertices and depth channels.',
    );
  }
}

function prepareItem(item, frame, projectToBacking, pixelWorldScale, occluders, showMesh) {
  const surface = item.surface ?? item;
  if (item.depthGroup && item.depths) validateSurface(item, surface);
  const points = surface.points.map((point) => projectToBacking(point, item.parallax ?? 1));
  if (!points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) {
    throw new TypeError('Projected polygon has a non-finite screen vertex.');
  }
  return Object.freeze({
    id: item.id,
    points: Object.freeze(points),
    depths: Object.freeze(
      item.depthGroup && item.depths
        ? [...surface.depths]
        : Array.from({ length: points.length }, () => 0.5),
    ),
    triangles: surface.triangles ?? null,
    triangleShades: item.triangleShades ?? surface.triangleShades ?? null,
    outlineIndices: item.outlineIndices ?? surface.outlineIndices ?? null,
    fill: resolveWebGlCellFill(item, frame, occluders),
    stroke: showMesh ? '#67e8f9' : item.stroke,
    lineWidth: Math.max(0.5, (item.lineWidth ?? 1) * pixelWorldScale),
    opacity: Math.max(0, Math.min(1, item.opacity ?? 1)),
    depthWrite: item.depthWrite !== false,
    depthGroup: item.depthGroup ?? null,
    stableOrder: item.id,
    sourceArea: polygonArea(item.points),
    projectedArea: polygonArea(points),
  });
}

function pushPainter(operations, items) {
  if (!items.length) return;
  const previous = operations.at(-1);
  if (previous?.kind === 'painter') previous.items.push(...items);
  else operations.push({ kind: 'painter', items: [...items] });
}

export function createWebGlScenePlan(
  frame,
  projectToBacking,
  pixelWorldScale,
  { showMesh = false } = {},
) {
  const operations = [];
  const degenerateItemIds = [];
  const rasterCollapseItemIds = [];
  const occluders =
    frame.lightingOccluders ??
    frame.items
      .filter((item) => item.lightOccluder === true)
      .map((item) => ({ id: item.id, points: item.points }));
  const shadows = shadowBatches(frame);

  const recordDiagnostics = (item) => {
    if (!showMesh) return;
    if (item.sourceArea <= 0.0001) degenerateItemIds.push(item.id);
    else if (item.projectedArea <= 0.0001) rasterCollapseItemIds.push(item.id);
  };

  for (let itemIndex = 0; itemIndex < frame.items.length; itemIndex += 1) {
    if (shadows.has(itemIndex)) {
      pushPainter(
        operations,
        shadows.get(itemIndex).map((shape, index) =>
          prepareItem(
            {
              id: `${shape.id ?? 'shadow'}:${index}`,
              points: shape.points,
              fill: '#080909',
              opacity: shape.opacity,
              parallax: shape.parallax,
            },
            frame,
            projectToBacking,
            pixelWorldScale,
            occluders,
            false,
          ),
        ),
      );
    }
    const item = frame.items[itemIndex];
    if (item.depthGroup && item.depths) {
      const members = [item];
      while (
        frame.items[itemIndex + 1]?.depthGroup === item.depthGroup &&
        frame.items[itemIndex + 1]?.depths
      ) {
        members.push(frame.items[++itemIndex]);
      }
      const prepared = members.map((member) =>
        prepareItem(member, frame, projectToBacking, pixelWorldScale, occluders, showMesh),
      );
      prepared.forEach(recordDiagnostics);
      operations.push({ kind: 'depth', id: item.depthGroup, items: prepared });
      continue;
    }
    if (item.points.length < 3 || (item.opacity ?? 1) <= 0) continue;
    const prepared = prepareItem(
      item,
      frame,
      projectToBacking,
      pixelWorldScale,
      occluders,
      showMesh,
    );
    recordDiagnostics(prepared);
    pushPainter(operations, [prepared]);
  }

  return Object.freeze({
    operations: Object.freeze(
      operations.map((operation) =>
        Object.freeze({ ...operation, items: Object.freeze(operation.items) }),
      ),
    ),
    degenerateItemIds: Object.freeze(degenerateItemIds),
    rasterCollapseItemIds: Object.freeze(rasterCollapseItemIds),
  });
}
