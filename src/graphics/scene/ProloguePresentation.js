import { PROLOGUE_CORE_ASSET } from '../assets/PrologueCoreAsset.js';
import { SceneAssetRegistry } from './SceneAssetRegistry.js';
import { SceneCompositionRuntime } from './SceneComposition.js';
// Existing core silhouette/placements are retained as a migration adapter. This is not approved new art.
export function createProloguePresentation() {
  const assets = new SceneAssetRegistry();
  assets.register(PROLOGUE_CORE_ASSET);
  return new SceneCompositionRuntime(
    {
      id: 'prologue-core-system',
      objects: [
        {
          id: 'world-control-core',
          assetId: PROLOGUE_CORE_ASSET.id,
          role: 'interactive',
          tags: ['control-core', 'existing-art-adapter'],
          transform: { x: 774, y: -354, z: 0 },
          size: { width: 22.5166604983954, height: 34 },
          scale: 1,
          renderBias: 0,
          legacyItemIds: ['scrap-device-core', 'scrapyard-analysis-device-core'],
          depthMode: 'flat',
          shadowRole: 'none',
        },
      ],
      compositions: [
        {
          id: 'prologue-yard-context',
          bounds: { x: 0, y: -600, width: 1000, height: 700 },
          preloadMargin: 180,
          objectIds: ['world-control-core'],
        },
        {
          id: 'prologue-machine-context',
          bounds: { x: 650, y: -600, width: 900, height: 700 },
          preloadMargin: 180,
          objectIds: ['world-control-core'],
        },
      ],
    },
    assets,
  );
}
