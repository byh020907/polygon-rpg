import { MATERIAL_LIGHTING_PROFILES } from '../../rendering/CellLighting.js';
import { freezeSceneData } from './SceneAssetRegistry.js';
export function defineRegionalMaterialProfile({
  id,
  colors = {},
  replace = {},
  saturationRetention = 1,
}) {
  if (
    typeof id !== 'string' ||
    !id ||
    !Number.isFinite(saturationRetention) ||
    saturationRetention < 0 ||
    saturationRetention > 1
  )
    throw Error('Invalid regional material profile');
  for (const [material, color] of Object.entries(colors))
    if (!MATERIAL_LIGHTING_PROFILES[material] || !/^#[0-9a-f]{6}$/i.test(color))
      throw Error('Invalid regional material color');
  for (const [from, to] of Object.entries(replace))
    if (!MATERIAL_LIGHTING_PROFILES[from] || !MATERIAL_LIGHTING_PROFILES[to])
      throw Error('Invalid regional material replacement');
  return freezeSceneData({
    id,
    colors: { ...colors },
    replace: { ...replace },
    saturationRetention,
  });
}
