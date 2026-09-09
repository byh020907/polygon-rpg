import { SceneAssetRegistry } from './SceneAssetRegistry.js';
import { SceneCompositionRuntime } from './SceneComposition.js';
export function createSvgTestPresentation(
  asset,
  { position, groundY, lod = null, pose = 'base' } = {},
) {
  const registry = new SceneAssetRegistry();
  registry.register(asset);
  const height = Math.min(240, Math.max(60, asset.viewBox[3]));
  const width = (height * asset.viewBox[2]) / asset.viewBox[3];
  return new SceneCompositionRuntime(
    {
      id: 'svg-test-' + asset.id,
      objects: [
        {
          id: 'svg-test-object',
          assetId: asset.id,
          role: 'prop',
          transform: { x: position.x + 150, y: -groundY + height / 2, z: 0 },
          size: { width, height },
          state: { pose },
          presentationOverride: lod,
          shadowRole: 'contact',
        },
      ],
      compositions: [
        {
          id: 'svg-test-context',
          bounds: { x: position.x - 1000, y: -groundY - 1000, width: 2400, height: 2000 },
          preloadMargin: 200,
          objectIds: ['svg-test-object'],
          lights: [
            {
              id: 'svg-test-sun',
              kind: 'directional',
              direction: { x: 0.3, y: -0.8, z: 0.6 },
              intensity: 0.8,
            },
          ],
        },
      ],
    },
    registry,
  );
}
