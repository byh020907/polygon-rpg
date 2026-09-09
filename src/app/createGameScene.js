import { createProloguePresentation } from '../graphics/scene/ProloguePresentation.js';
import { GameScene } from '../game/GameScene.js';
import { EQUIPMENT_CATALOG } from '../game/equipment/EquipmentCatalog.js';
import { ENCOUNTER_PROFILES } from '../game/encounter/EncounterProfiles.js';
import { ENCHANTMENT_CATALOG } from '../game/enchantment/EnchantmentCatalog.js';
import { COMBAT_PROGRESSION_PROFILE } from '../game/progression/ProgressionProfiles.js';
import { SCRAP_AWAKENING_MAP } from '../game/maps/scrapAwakening.js';
import { TRAINING_ENCOUNTER_SCENE } from '../game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../game/training/TrainingEnemyAttackProfiles.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../game/campaign/ScrapCampaignProfiles.js';
import { SCRAP_AWAKENING_PROFILE } from '../game/campaign/ScrapAwakeningProfile.js';
import { CHARACTER_PRESENTATION_PROFILE } from '../game/character/CharacterPresentationProfiles.js';
import { SCRAP_ART_DIRECTION_PROFILE } from '../game/ScrapArtDirectionProfiles.js';

function createEncounter(options) {
  return TRAINING_ENCOUNTER_SCENE.instantiate({
    ...options,
    encounterProfiles: ENCOUNTER_PROFILES,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
  });
}

// The browser app, resource review, and deterministic fixtures share this authored
// composition. GameScene stays independent of concrete maps and content catalogs.
export function createGameScene(options = {}) {
  return new GameScene({
    mapDefinition: SCRAP_AWAKENING_MAP,
    scenePresentationFactory:
      !options.mapDefinition || options.mapDefinition.id === SCRAP_AWAKENING_MAP.id
        ? createProloguePresentation
        : null,
    equipmentCatalog: EQUIPMENT_CATALOG,
    combatProgressionProfile: COMBAT_PROGRESSION_PROFILE,
    encounterFactory: createEncounter,
    encounterAttackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
    scrapCampaignProfile: SCRAP_CAMPAIGN_PROFILE,
    scrapAwakeningProfile: SCRAP_AWAKENING_PROFILE,
    characterPresentationCatalog: CHARACTER_PRESENTATION_PROFILE,
    playerPresentationProfileId: 'scrapyard-apprentice',
    artDirectionProfile: SCRAP_ART_DIRECTION_PROFILE,
    enchantmentCatalog: ENCHANTMENT_CATALOG,
    ...options,
  });
}
