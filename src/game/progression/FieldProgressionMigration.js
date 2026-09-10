import { assertV11ProgressionSnapshot } from './ProgressionState.js';
import { createQuestState } from '../quests/QuestState.js';
export function migrateFieldProgressionV11(
  snapshot,
  { scrapCampaignProfile, equipmentCatalog } = {},
) {
  assertV11ProgressionSnapshot(snapshot, scrapCampaignProfile, equipmentCatalog);
  return {
    ...snapshot,
    version: 12,
    quests: createQuestState(snapshot.scrapCampaign.elapsedSegments),
    materials: { 'salvaged-steel': 0 },
    rewardClaims: [],
    equipmentUpgrades: {},
  };
}
