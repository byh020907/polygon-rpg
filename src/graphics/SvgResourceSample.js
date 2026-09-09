import { sampleSvgAsset } from './svg/SvgAssetSampler.js';
import { IDENTITY, multiply, point } from './svg/SvgMath.js';
import { freezeSceneData } from './scene/SceneAssetRegistry.js';
export function sampleSvgResource(resource, action, options, baseFrame) {
  const asset = resource.svgAsset,
    sample = sampleSvgAsset(asset, { lod: action.lod, pose: action.pose });
  const size = Math.min(200, Math.max(64, asset.viewBox[3]));
  const width = (size * asset.viewBox[2]) / asset.viewBox[3];
  const facing = options.facing ?? 1,
    center = { x: 480, y: 270 };
  const project = (p) => ({
    x: center.x + ((p.x * width) / 2) * facing,
    y: center.y + (p.y * size) / 2,
  });
  const items = sample.items
    .filter((item) => item.role !== 'occluder')
    .map((item, index) => {
      const points = item.points.map(project);
      return {
        ...item,
        id: `${resource.id}:${item.id}`,
        points,
        parallax: 1,
        renderOrder: 30,
        order: index,
        depthGroup: resource.id,
        depths: points.map(() => -item.z),
        surface: { points, depths: points.map(() => -item.z), triangles: item.triangles },
      };
    });
  const matrices = new Map();
  const boneDiagnostics = asset.parts.map((part) => {
    const matrix = multiply(part.parentId ? matrices.get(part.parentId) : IDENTITY, part.bind);
    matrices.set(part.id, matrix);
    return { id: part.id, parent: part.parentId, position: project(point(matrix, part.pivot)) };
  });
  return freezeSceneData({
    frame: {
      ...baseFrame,
      items,
      scenePresentation: null,
      artDirection: options.lighting === 'unlit' ? null : baseFrame.artDirection,
      cameraOffset: { x: 0, y: 0 },
      camera: { position: { x: 480, y: 270 } },
    },
    bounds: { x: 480 - width / 2, y: 270 - size / 2, width, height: size },
    frameId: `${resource.id}/${action.id}/f0000`,
    sourceFrameId: `${asset.id}:${action.lod}:${action.pose}`,
    boneDiagnostics,
    notes: resource.notes,
    conditions: { ...options, actionId: action.id },
    svgDiagnostics: {
      assetId: asset.id,
      parts: asset.parts.length,
      anchors: sample.anchors,
      shapes: sample.items.length,
      lod: action.lod,
      pose: action.pose,
    },
  });
}
