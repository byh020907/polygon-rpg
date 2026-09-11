import { PROLOGUE_CORE_ASSET } from '../assets/PrologueCoreAsset.js';
import { PROLOGUE_RETRIEVAL_ARM_ASSET } from '../assets/PrologueRetrievalArmAsset.js';
import { SceneAssetRegistry } from './SceneAssetRegistry.js';
import { SceneCompositionRuntime } from './SceneComposition.js';
// Existing core/arm silhouettes and stage placements are retained through an explicit migration adapter.
// They are runtime integration baselines, not approved new art.
export function createProloguePresentation() {
  const assets = new SceneAssetRegistry();
  assets.register(PROLOGUE_CORE_ASSET);
  assets.register(PROLOGUE_RETRIEVAL_ARM_ASSET);
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
        {
          id: 'world-retrieval-arm',
          assetId: PROLOGUE_RETRIEVAL_ARM_ASSET.id,
          role: 'interactive-machine',
          tags: ['retrieval-arm', 'existing-art-adapter', 'runtime-baseline-unapproved'],
          transform: { x: 1055, y: -295, z: 0 },
          size: { width: 130, height: 150 },
          scale: 1,
          renderBias: 0.02,
          legacyUseBounds: false,
          legacyPoseBindings: [
            {
              id: 'released',
              pose: 'released',
              whenItemIds: ['scrap-rescue-signal'],
              replaceItemIds: [
                'scrap-retrieval-arm-grab-upper',
                'scrap-retrieval-arm-grab-claw',
                'scrap-retrieval-arm-grab-signal',
              ],
            },
            {
              id: 'captured',
              pose: 'captured',
              whenItemIds: ['scrap-retrieval-arm-grab-upper'],
              replaceItemIds: [
                'scrap-retrieval-arm-grab-upper',
                'scrap-retrieval-arm-grab-claw',
                'scrap-retrieval-arm-grab-signal',
              ],
            },
            {
              id: 'dormant',
              pose: 'dormant',
              whenItemIds: ['scrap-retrieval-arm-dormant-upper'],
              replaceItemIds: [
                'scrap-retrieval-arm-dormant-upper',
                'scrap-retrieval-arm-dormant-forearm',
                'scrap-retrieval-arm-dormant-claw',
              ],
            },
          ],
          depthMode: 'surface',
          shadowRole: 'cast',
          shadowOpacity: 0.18,
        },
      ],
      compositions: [
        {
          id: 'prologue-yard-context',
          bounds: { x: 0, y: -600, width: 1000, height: 700 },
          preloadMargin: 180,
          objectIds: ['world-control-core', 'world-retrieval-arm'],
        },
        {
          id: 'prologue-machine-context',
          bounds: { x: 650, y: -600, width: 900, height: 700 },
          preloadMargin: 180,
          objectIds: ['world-control-core', 'world-retrieval-arm'],
        },
      ],
    },
    assets,
  );
}
