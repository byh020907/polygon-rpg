import { sampleSvgAsset } from '../svg/SvgAssetSampler.js';
import { freezeSceneData } from './SceneAssetRegistry.js';
export function parallaxForDepth(z) {
  if (!Number.isFinite(z)) throw Error('Finite z required');
  return z >= 0 ? 1 / (1 + z) : 1 + Math.min(1, -z);
}
export function selectPresentationLod(
  occupancy,
  previous = null,
  { thresholds = [0.1, 0.28], margin = 0.12, override = null, bias = 0 } = {},
) {
  if (!Number.isFinite(occupancy) || occupancy < 0) throw Error('Invalid projected occupancy');
  if (
    !Array.isArray(thresholds) ||
    thresholds.length !== 2 ||
    thresholds.some((t) => !Number.isFinite(t)) ||
    !(thresholds[0] > 0 && thresholds[1] > thresholds[0]) ||
    !Number.isFinite(margin) ||
    !(margin >= 0 && margin < 0.5) ||
    !Number.isInteger(bias) ||
    Math.abs(bias) > 2
  )
    throw Error('Invalid LOD policy');
  const names = ['far', 'mid', 'near'];
  if (previous !== null && !names.includes(previous)) throw Error('Invalid previous LOD');
  if (override !== null) {
    if (!names.includes(override)) throw Error('Invalid presentation override');
    return override;
  }
  let level = previous === null ? -1 : names.indexOf(previous);
  if (level < 0) level = occupancy < thresholds[0] ? 0 : occupancy < thresholds[1] ? 1 : 2;
  else {
    while (level < 2 && occupancy > thresholds[level] * (1 + margin)) level++;
    while (level > 0 && occupancy < thresholds[level - 1] * (1 - margin)) level--;
  }
  return names[Math.max(0, Math.min(2, level + bias))];
}
// Compatibility adapter: old parallax becomes optical depth. Old renderOrder never becomes z.
export function legacyPresentationDepth(item) {
  const p = item.parallax ?? 1;
  if (!Number.isFinite(p) || p < 0) throw Error('Invalid legacy parallax');
  return p > 0 && p < 1 ? 1 / p - 1 : p >= 1 ? 1 - p : 1000;
}
const legacyBias = (item) =>
  Math.atan(item.renderOrder ?? 0) * 0.0001 + Math.atan(item.order ?? 0) * 0.00000001;
const boundsOf = (points) => {
  if (
    !Array.isArray(points) ||
    points.length < 3 ||
    points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    throw Error('Legacy binding needs finite polygon bounds');
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};
export class SceneCompositionPresenter {
  constructor() {
    this.sceneKey = null;
    this.lods = new Map();
  }
  resolve(frame, { project, viewport }) {
    const viewAt = (parallax) => {
      const origin = project({ x: 0, y: 0 }, parallax);
      const unit = project({ x: 1, y: 1 }, parallax);
      const sx = unit.x - origin.x,
        sy = unit.y - origin.y;
      if (!(sx > 0 && sy > 0)) throw Error('Positive scene projection required');
      return {
        x: -origin.x / sx,
        y: -(viewport.height - origin.y) / sy,
        width: viewport.width / sx,
        height: viewport.height / sy,
      };
    };
    const scene = frame.scenePresentationForView
      ? frame.scenePresentationForView(viewAt)
      : frame.scenePresentation;
    if (!scene) return { frame, diagnostics: null };
    if (
      typeof project !== 'function' ||
      !Number.isFinite(viewport?.width) ||
      !Number.isFinite(viewport?.height) ||
      viewport.width <= 0 ||
      viewport.height <= 0
    )
      throw Error('Finite projected viewport required');
    const key =
      scene.sceneId +
      ':' +
      scene.generation +
      ':' +
      (scene.assetGeneration ?? scene.residency?.generation ?? 0);
    if (key !== this.sceneKey || scene.viewToken !== this.viewToken) {
      this.viewToken = scene.viewToken;
      this.sceneKey = key;
      this.lods.clear();
    }
    let drawnVertices = 0;
    const selected = [],
      drawn = [],
      anchors = [],
      replacement = new Set(),
      shadowCasters = [],
      occluders = [];
    for (const object of scene.objects) {
      if (!object.state.enabled) continue;
      const asset = scene.assets[object.assetId];
      if (!asset) continue;
      const bindings = object.legacyItemIds ?? [];
      const poseBinding = object.legacyPoseBindings?.find((binding) =>
        binding.whenItemIds.some((id) =>
          frame.items.some((i) => i.id === id && i.enabled !== false),
        ),
      );
      const replacementIds = poseBinding?.replaceItemIds ?? bindings;
      const boundItems = frame.items.filter(
        (item) => replacementIds.includes(item.id) && item.enabled !== false,
      );
      const bound = boundItems[0] ?? null;
      if ((bindings.length || object.legacyPoseBindings?.length) && !bound) continue;
      let transform = object.transform,
        size = object.size,
        scale = object.scale;
      let bias = object.renderBias;
      if (bound && object.legacyUseBounds !== false) {
        const b = boundsOf(boundItems.flatMap((item) => item.points));
        size = { width: b.maxX - b.minX, height: b.maxY - b.minY };
        transform = { ...transform, x: (b.minX + b.maxX) / 2, y: -(b.minY + b.maxY) / 2 };
        scale = 1;
        bias = legacyBias(bound);
      }
      const parallax = parallaxForDepth(transform.z) * object.parallaxScale;
      const cosine = Math.cos(object.rotation ?? 0),
        sine = Math.sin(object.rotation ?? 0);
      const toCanvas = (p) => {
        const x = (p.x * size.width * scale) / 2,
          y = (p.y * size.height * scale) / 2;
        return { x: transform.x + x * cosine + y * sine, y: -transform.y - x * sine + y * cosine };
      };
      // Stable master bounds, never the current LOD/pose's silhouette, drive occupancy.
      const b = asset.bounds;
      const projected = [
        { x: b.minX, y: b.minY },
        { x: b.maxX, y: b.minY },
        { x: b.maxX, y: b.maxY },
        { x: b.minX, y: b.maxY },
      ].map((p) => project(toCanvas(p), parallax));
      if (projected.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
        throw Error('Invalid projected scene bounds');
      const xs = projected.map((p) => p.x),
        ys = projected.map((p) => p.y);
      if (
        Math.max(...xs) < 0 ||
        Math.min(...xs) > viewport.width ||
        Math.max(...ys) < 0 ||
        Math.min(...ys) > viewport.height
      )
        continue;
      const occupancy = Math.max(
        (Math.max(...xs) - Math.min(...xs)) / viewport.width,
        (Math.max(...ys) - Math.min(...ys)) / viewport.height,
      );
      const raw = selectPresentationLod(occupancy, this.lods.get(object.id) ?? null);
      this.lods.set(object.id, raw);
      const lod =
        object.presentationOverride ??
        ['far', 'mid', 'near'][
          Math.max(
            0,
            Math.min(2, ['far', 'mid', 'near'].indexOf(raw) + (object.presentationBias ?? 0)),
          )
        ];
      const sample = sampleSvgAsset(asset, {
        lod,
        pose: poseBinding?.pose ?? object.state.pose ?? 'base',
        partTransforms: object.state.partTransforms ?? {},
      });
      drawnVertices += sample.items.reduce((sum, item) => sum + item.points.length, 0);
      if (drawnVertices > 65536) throw new RangeError('Scene visible vertex budget exceeded');
      const objectItems = sample.items.filter((i) => i.role !== 'occluder');
      objectItems.forEach((item, index) => {
        const points = item.points.map(toCanvas),
          depths = points.map(() => -item.z);
        const depth =
          object.depthMode === 'flat'
            ? {}
            : {
                depthGroup: object.id,
                depths,
                surface: { points, depths, triangles: item.triangles },
              };
        drawn.push({
          ...item,
          ...depth,
          id: bound && !poseBinding && index === 0 ? bound.id : object.id + ':' + item.id,
          worldObjectId: object.id,
          sceneZ: transform.z,
          renderBias: bias,
          points,
          fill: object.material?.colors?.[item.materialId] ?? item.fill,
          materialId: object.material?.replace?.[item.materialId] ?? item.materialId,
          saturationRetention: object.material?.saturationRetention ?? 1,
          surfaceNormal: {
            x: item.surfaceNormal.x * cosine + item.surfaceNormal.y * sine,
            y: -item.surfaceNormal.x * sine + item.surfaceNormal.y * cosine,
            z: item.surfaceNormal.z,
          },
          parallax,
          renderOrder: bound?.renderOrder ?? 30,
          order: index,
          emissive: bound?.emissive ?? object.emissive ?? false,
          ...(bound && object.depthMode === 'flat'
            ? {
                stroke: bound.stroke,
                lineWidth: bound.lineWidth,
                opacity: bound.opacity ?? item.opacity,
              }
            : {}),
        });
      });
      for (const a of sample.anchors) {
        const canvas = toCanvas(a);
        anchors.push({
          ...a,
          worldObjectId: object.id,
          ...canvas,
          world: {
            x: canvas.x,
            y: -canvas.y,
            z: transform.z + a.z,
          },
        });
      }
      const shadow =
        object.shadowRole ??
        sample.items.find((i) => i.shadowRole !== 'none')?.shadowRole ??
        'none';
      const shapes = sample.items
        .filter((i) => i.role === 'occluder')
        .map((i) => i.points.map(toCanvas));
      shapes.forEach((points, index) =>
        occluders.push({
          id: object.id + ':occluder:' + index,
          ownerId: object.id,
          points,
          parallax,
        }),
      );
      if (shadow !== 'none')
        shadowCasters.push({
          id: object.id,
          ownerId: object.id,
          shadowRole: shadow,
          position: toCanvas({ x: 0, y: 1 }),
          width: size.width * scale,
          height: size.height * scale,
          opacity: object.shadowOpacity ?? 0.2,
          occluder: shapes[0] ?? objectItems.flatMap((i) => i.points.map(toCanvas)),
          parallax,
        });
      replacementIds.forEach((id) => replacement.add(id));
      selected.push({
        id: object.id,
        assetId: asset.id,
        lod,
        rawLod: raw,
        occupancy,
        transform,
        shadowRole: shadow,
        pose: sample.pose,
        legacyPoseBindingId: poseBinding?.id ?? null,
      });
    }
    const presentIds = new Set(scene.objects.map((o) => o.id));
    for (const id of this.lods.keys()) if (!presentIds.has(id)) this.lods.delete(id);
    const legacy = frame.items
      .filter((i) => !replacement.has(i.id))
      .map((i) => ({
        ...i,
        sceneZ: i.sceneZ ?? legacyPresentationDepth(i),
        renderBias: i.renderBias ?? legacyBias(i),
      }));
    const items = [...legacy, ...drawn];
    // Keep a composited depth group contiguous; item order only resolves inside its group.
    const groups = new Map();
    for (const item of items) {
      const group = item.depthGroup ?? item.worldObjectId ?? item.id;
      const key = item.sceneZ + ':' + group;
      groups.set(key, Math.min(groups.get(key) ?? Infinity, item.renderBias));
    }
    const groupOf = (i) => i.depthGroup ?? i.worldObjectId ?? i.id;
    items.sort(
      (a, b) =>
        b.sceneZ - a.sceneZ ||
        groups.get(a.sceneZ + ':' + groupOf(a)) - groups.get(b.sceneZ + ':' + groupOf(b)) ||
        groupOf(a).localeCompare(groupOf(b)) ||
        (a.order ?? 0) - (b.order ?? 0),
    );
    const sceneLights = (scene.lights ?? []).map((l) => ({
      ...l,
      ...(l.kind === 'point'
        ? { position: { x: l.position.x, y: -l.position.y, z: l.position.z } }
        : { direction: { x: l.direction.x, y: -l.direction.y, z: l.direction.z } }),
    }));
    const artDirection =
      frame.artDirection || shadowCasters.length || sceneLights.length
        ? {
            ambientIntensity: 0.2,
            quantizationLevels: 4,
            saturationRetention: 1,
            ...frame.artDirection,
            lights: [...(frame.artDirection?.lights ?? []), ...sceneLights],
            shadowCasters: [...(frame.artDirection?.shadowCasters ?? []), ...shadowCasters],
          }
        : null;
    const diagnostics = freezeSceneData(
      structuredClone({
        sceneId: scene.sceneId,
        compositions: scene.compositionIds,
        resident: scene.residentCompositionIds,
        objects: selected,
        anchors,
        residency: scene.residency,
      }),
    );
    return {
      frame: {
        ...frame,
        items,
        artDirection,
        lightingOccluders: [
          ...(frame.lightingOccluders ??
            legacy
              .filter((i) => i.lightOccluder === true)
              .map((i) => ({ id: i.id, points: i.points }))),
          ...occluders,
        ],
      },
      diagnostics,
    };
  }
}
