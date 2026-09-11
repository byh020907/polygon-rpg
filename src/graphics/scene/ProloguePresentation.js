import { PROLOGUE_CORE_ASSET } from '../assets/PrologueCoreAsset.js';
import { PROLOGUE_RETRIEVAL_ARM_ASSET } from '../assets/PrologueRetrievalArmAsset.js';
import { PROLOGUE_ANCIENT_MACHINE_ASSET } from '../assets/PrologueAncientMachineAsset.js';
import { PROLOGUE_GARAGE_ZERO_ASSET } from '../assets/PrologueGarageZeroAsset.js';
import { SceneAssetRegistry } from './SceneAssetRegistry.js';
import { SceneCompositionRuntime } from './SceneComposition.js';
// Existing core/arm silhouettes and stage placements are retained through an explicit migration adapter.
// They are runtime integration baselines, not approved new art.
export function createProloguePresentation() {
  const assets = new SceneAssetRegistry();
  assets.register(PROLOGUE_CORE_ASSET);
  assets.register(PROLOGUE_RETRIEVAL_ARM_ASSET);
  assets.register(PROLOGUE_ANCIENT_MACHINE_ASSET);
  assets.register(PROLOGUE_GARAGE_ZERO_ASSET);
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
        {
          id: 'world-ancient-machine',
          assetId: PROLOGUE_ANCIENT_MACHINE_ASSET.id,
          role: 'landmark-machine',
          tags: [
            'ancient-machine',
            'ref-03',
            'existing-art-adapter',
            'runtime-baseline-unapproved',
          ],
          transform: { x: 985, y: -280, z: 0 },
          size: { width: 570, height: 300 },
          scale: 1,
          renderBias: 0.0001537625,
          legacyUseBounds: false,
          legacyPoseBindings: [
            {
              id: 'incomplete-march',
              pose: 'incomplete-march',
              whenItemIds: ['scrap-king-route-beacon'],
              replaceItemIds: [
                'wreck-hull-lower',
                'wreck-rib-left',
                'wreck-rib-right',
                'wreck-head',
                'wreck-face-slit',
                'scrap-king-eye-left',
                'scrap-king-eye-right',
                'scrap-king-shoulder-left',
                'scrap-king-shoulder-right',
                'scrap-king-cable-bundle',
                'scrap-king-route-beacon',
              ],
            },
            {
              id: 'parts-assembled',
              pose: 'parts-assembled',
              whenItemIds: ['scrap-king-shoulder-left'],
              replaceItemIds: [
                'wreck-hull-lower',
                'wreck-rib-left',
                'wreck-rib-right',
                'wreck-head',
                'wreck-face-slit',
                'scrap-king-eye-left',
                'scrap-king-eye-right',
                'scrap-king-shoulder-left',
                'scrap-king-shoulder-right',
                'scrap-king-cable-bundle',
              ],
            },
            {
              id: 'eyes-lit',
              pose: 'eyes-lit',
              whenItemIds: ['scrap-king-eye-left'],
              replaceItemIds: [
                'wreck-hull-lower',
                'wreck-rib-left',
                'wreck-rib-right',
                'wreck-head',
                'wreck-face-slit',
                'scrap-king-eye-left',
                'scrap-king-eye-right',
              ],
            },
            {
              id: 'socket-sealed',
              pose: 'socket-sealed',
              whenItemIds: ['scrap-rescue-signal'],
              replaceItemIds: [
                'wreck-hull-lower',
                'wreck-rib-left',
                'wreck-rib-right',
                'wreck-head',
                'wreck-face-slit',
              ],
            },
            {
              id: 'dormant',
              pose: 'dormant',
              whenItemIds: ['wreck-hull-lower'],
              replaceItemIds: [
                'wreck-hull-lower',
                'wreck-rib-left',
                'wreck-rib-right',
                'wreck-head',
                'wreck-face-slit',
              ],
            },
          ],
          depthMode: 'surface',
          shadowRole: 'cast',
          shadowOpacity: 0.22,
        },
        {
          id: 'world-garage-zero',
          assetId: PROLOGUE_GARAGE_ZERO_ASSET.id,
          role: 'garage-machine-frame',
          tags: ['garage-zero', 'ref-04', 'existing-art-adapter', 'runtime-baseline-unapproved'],
          transform: { x: 445.6, y: -325.2, z: 0 },
          size: { width: 142.4, height: 201.6 },
          scale: 1,
          renderBias: 0.00015377,
          legacyUseBounds: false,
          legacyPoseBindings: [
            {
              id: 'garage-zero',
              pose: 'garage-zero',
              whenItemIds: ['garage-robot-frame-torso'],
              replaceItemIds: [
                'garage-robot-frame-torso',
                'garage-robot-frame-leg-left',
                'garage-robot-frame-leg-right',
                'garage-robot-brain-core',
                'garage-robot-zero-label',
              ],
            },
          ],
          depthMode: 'surface',
          shadowRole: 'cast',
          shadowOpacity: 0.2,
        },
      ],
      compositions: [
        {
          id: 'prologue-yard-context',
          bounds: { x: 0, y: -600, width: 1000, height: 700 },
          preloadMargin: 180,
          objectIds: [
            'world-control-core',
            'world-retrieval-arm',
            'world-ancient-machine',
            'world-garage-zero',
          ],
        },
        {
          id: 'prologue-machine-context',
          bounds: { x: 650, y: -600, width: 900, height: 700 },
          preloadMargin: 180,
          objectIds: [
            'world-control-core',
            'world-retrieval-arm',
            'world-ancient-machine',
            'world-garage-zero',
          ],
        },
      ],
    },
    assets,
  );
}
