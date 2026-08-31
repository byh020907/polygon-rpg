import { GameScene } from '../src/game/GameScene.js';
import { EQUIPMENT_CATALOG } from '../src/game/equipment/EquipmentProfiles.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { COMBAT_PROGRESSION_PROFILE } from '../src/game/progression/ProgressionProfiles.js';
import { TRAINING_ENCOUNTER_SCENE } from '../src/game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';

function createTrainingEncounter(options) {
  return TRAINING_ENCOUNTER_SCENE.instantiate({
    ...options,
    encounterProfiles: ENCOUNTER_PROFILES,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
  });
}

export function createTestGameScene(options = {}) {
  return new GameScene({
    ...options,
    equipmentCatalog: EQUIPMENT_CATALOG,
    combatProgressionProfile: COMBAT_PROGRESSION_PROFILE,
    encounterFactory: createTrainingEncounter,
    encounterAttackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
  });
}
