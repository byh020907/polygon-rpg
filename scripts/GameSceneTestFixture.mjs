import { GameScene } from '../src/game/GameScene.js';
import { EQUIPMENT_CATALOG } from '../src/game/equipment/EquipmentProfiles.js';
import { COMBAT_PROGRESSION_PROFILE } from '../src/game/progression/ProgressionProfiles.js';

export function createTestGameScene(options = {}) {
  return new GameScene({
    ...options,
    equipmentCatalog: EQUIPMENT_CATALOG,
    combatProgressionProfile: COMBAT_PROGRESSION_PROFILE,
  });
}
