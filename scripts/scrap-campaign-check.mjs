import assert from 'node:assert/strict';
import { DEFAULT_EQUIPMENT_PROFILE_ID } from '../src/game/equipment/EquipmentProfiles.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { createProgressionSnapshot } from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import {
  SCRAP_CAMPAIGN_ACTION_KIND,
  commitScrapCampaignAction,
  createScrapCampaignSnapshot,
  getScrapCampaignReadModel,
  previewScrapCampaignAction,
} from '../src/game/campaign/ScrapCampaignState.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';

class MemoryStorage {
  constructor(initial = null) {
    this.value = initial;
  }

  getItem() {
    return this.value;
  }

  setItem(_key, value) {
    this.value = value;
  }
}

function commit(snapshot, action) {
  return commitScrapCampaignAction(snapshot, action, SCRAP_CAMPAIGN_PROFILE).snapshot;
}

function travelAction(actionId, targetRegionId) {
  return {
    actionId,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.TRAVEL,
    label: `${targetRegionId} 장거리 연결로 이동`,
    targetRegionId,
    costSegments: 1,
  };
}

function regionSuccessAction(regionId) {
  const region = SCRAP_CAMPAIGN_PROFILE.getRegion(regionId);
  return {
    actionId: `region:${regionId}:resolved`,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.REGION_SUCCESS,
    label: region.event.label,
    targetRegionId: regionId,
    costSegments: region.event.costSegments,
    extensionSegments: region.event.extensionSegments,
  };
}

function convoyAction(regionId) {
  return {
    actionId: `region:${regionId}:convoy-recovered`,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.CONVOY_CHASE,
    label: `${regionId} 수송대 추격`,
    targetRegionId: regionId,
    costSegments: SCRAP_CAMPAIGN_PROFILE.convoyChaseCostSegments,
  };
}

const fresh = createScrapCampaignSnapshot(SCRAP_CAMPAIGN_PROFILE);
const initial = getScrapCampaignReadModel(fresh, SCRAP_CAMPAIGN_PROFILE);
assert.equal(initial.hudLabel, 'Day 1 · 아침 · D-30');
assert.equal(initial.currentLocationLabel, '동네 고물상');
assert.equal(initial.regions.length, 5);
assert.equal(initial.routeEdges.length, 5);
assert.equal(initial.rivalArrivalLabel, 'Day 31 · 아침');
assert.deepEqual(
  initial.routeEdges.map((edge) => edge.travelSegments),
  [1, 1, 1, 1, 1],
);
for (const region of SCRAP_CAMPAIGN_PROFILE.regions) {
  assert.equal(region.eventStages.length, 8);
  assert.equal(new Set(region.eventStages.map((stage) => stage.id)).size, 8);
  assert.deepEqual(Object.keys(region.mapPatches), ['before', 'partReady', 'resolved', 'convoy']);
}
assert.equal(initial.completionPercent, 0);
assert.equal(initial.finalBattleAvailable, false);

const freeAction = {
  actionId: 'free:dialogue:mechanic-owner',
  kind: SCRAP_CAMPAIGN_ACTION_KIND.FREE,
  label: '고물상 주인과 대화',
  costSegments: 0,
};
const afterFree = commit(fresh, freeAction);
assert.equal(afterFree.elapsedSegments, 0);
assert.equal(afterFree.deadlineSegments, fresh.deadlineSegments);
assert.equal(afterFree.rivalProgressSegments, 0);

const travel = travelAction('travel:scrapyard:abandoned-mine', 'abandoned-mine');
const travelPreview = previewScrapCampaignAction(fresh, travel, SCRAP_CAMPAIGN_PROFILE);
assert.equal(travelPreview.costSegments, 1);
assert.equal(travelPreview.before.phaseId, 'morning');
assert.equal(travelPreview.after.phaseId, 'day');
const afterTravel = commit(fresh, travel);
assert.equal(afterTravel.currentLocationId, 'abandoned-mine');
assert.equal(afterTravel.elapsedSegments, 1);
assert.equal(afterTravel.rivalProgressSegments, 1);
const repeatedTravel = commitScrapCampaignAction(afterTravel, travel, SCRAP_CAMPAIGN_PROFILE);
assert.equal(repeatedTravel.changed, false);
assert.deepEqual(repeatedTravel.snapshot, afterTravel);

let fourPhaseCycle = fresh;
for (let index = 0; index < 4; index += 1) {
  fourPhaseCycle = commit(
    fourPhaseCycle,
    travelAction(`travel:phase-probe:${index}`, 'abandoned-mine'),
  );
}
const nextMorning = getScrapCampaignReadModel(fourPhaseCycle, SCRAP_CAMPAIGN_PROFILE);
assert.equal(nextMorning.day, 2);
assert.equal(nextMorning.phaseId, 'morning');

const mineProfile = SCRAP_CAMPAIGN_PROFILE.getRegion('abandoned-mine');
const mineSuccess = commit(fresh, regionSuccessAction('abandoned-mine'));
assert.equal(mineSuccess.regionStates['abandoned-mine'], 'resolved');
assert.equal(mineSuccess.collectedPartIds.includes(mineProfile.part.id), true);
assert.equal(mineSuccess.deadlineSegments, 120 - 10 + 8);
assert.equal(mineSuccess.rivalDelaySegments, 8);

let rivalFirst = fresh;
for (let index = 0; index < mineProfile.route.rivalArrivalSegment; index += 1) {
  rivalFirst = commit(rivalFirst, {
    actionId: `rest:rival-probe:${index}`,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.REST,
    label: `완전 회복 ${index + 1}`,
    costSegments: 1,
  });
}
assert.equal(rivalFirst.regionStates['abandoned-mine'], 'convoy');
const recoveredMine = commit(rivalFirst, convoyAction('abandoned-mine'));
assert.equal(recoveredMine.regionStates['abandoned-mine'], 'recovered');
assert.equal(recoveredMine.collectedPartIds.includes(mineProfile.part.id), true);
assert.equal(
  recoveredMine.deadlineSegments,
  rivalFirst.deadlineSegments - SCRAP_CAMPAIGN_PROFILE.convoyChaseCostSegments,
  '수송대 추격은 D-DAY 연장 없이 2구간을 소비합니다.',
);

let completeCampaign = fresh;
for (const regionId of ['red-quarry', 'snow-trade-road', 'greenhouse-plains']) {
  completeCampaign = commit(completeCampaign, regionSuccessAction(regionId));
}
assert.equal(completeCampaign.regionStates['abandoned-mine'], 'convoy');
assert.equal(completeCampaign.regionStates['harbor-shipyard'], 'convoy');
completeCampaign = commit(completeCampaign, convoyAction('abandoned-mine'));
completeCampaign = commit(completeCampaign, convoyAction('harbor-shipyard'));
const completeReadModel = getScrapCampaignReadModel(completeCampaign, SCRAP_CAMPAIGN_PROFILE);
assert.equal(completeReadModel.collectedPartCount, 5);
assert.equal(completeReadModel.completionPercent, 100);
assert.equal(completeReadModel.finalBattleAvailable, true);

const lastSegment = {
  ...fresh,
  deadlineSegments: 1,
  lastChangeLabel: '마지막 1구간',
};
const gameOverPreview = previewScrapCampaignAction(
  lastSegment,
  travelAction('travel:capital-too-late', 'red-quarry'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(gameOverPreview.requiresDeadlineWarning, true);
assert.equal(gameOverPreview.willGameOver, true);
const gameOver = commit(lastSegment, travelAction('travel:capital-too-late', 'red-quarry'));
assert.equal(gameOver.gameOver, true);
assert.equal(gameOver.deadlineSegments, 0);
assert.throws(
  () => commit(gameOver, freeAction),
  /D-DAY 0 이후/,
  'terminal game-over 뒤에는 무료 action도 확정할 수 없습니다.',
);

const storageAdapter = new MemoryStorage();
const persistence = new ProgressionStorage(
  storageAdapter,
  'scrap-campaign-v9',
  ENCHANTMENT_CATALOG,
  null,
  SCRAP_CAMPAIGN_PROFILE,
);
const progression = {
  ...createProgressionSnapshot(
    DEFAULT_EQUIPMENT_PROFILE_ID,
    ENCHANTMENT_CATALOG,
    SCRAP_CAMPAIGN_PROFILE,
  ),
  scrapCampaign: completeCampaign,
};
assert.equal(persistence.save(progression).ok, true);
const loaded = persistence.load(
  DEFAULT_EQUIPMENT_PROFILE_ID,
  [DEFAULT_EQUIPMENT_PROFILE_ID],
  ENCHANTMENT_CATALOG,
);
assert.equal(loaded.ok, true);
assert.deepEqual(loaded.snapshot.scrapCampaign, completeCampaign);

const previousRecord = JSON.parse(storageAdapter.value);
delete previousRecord.scrapCampaign;
previousRecord.version = 8;
storageAdapter.value = JSON.stringify(previousRecord);
const migrated = persistence.load(
  DEFAULT_EQUIPMENT_PROFILE_ID,
  [DEFAULT_EQUIPMENT_PROFILE_ID],
  ENCHANTMENT_CATALOG,
);
assert.equal(migrated.ok, true);
assert.equal(migrated.kind, 'migrated');
assert.deepEqual(
  migrated.snapshot.scrapCampaign,
  createScrapCampaignSnapshot(SCRAP_CAMPAIGN_PROFILE),
);

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'scrap-campaign-domain',
    checks: [
      'day1-morning-d30-and-five-region-operation-map',
      'explicit-route-edges-rival-arrival-and-region-stage-patches',
      'free-actions-zero-cost-and-one-segment-travel',
      'four-segment-day-rollover',
      'stable-action-idempotence',
      'player-first-event-cost-and-2-to-5-day-detour',
      'rival-first-convoy-two-segment-no-extension-recovery',
      'five-part-order-independent-final-battle-unlock',
      'last-segment-warning-and-terminal-game-over',
      'schema-v9-round-trip-and-v8-migration',
    ],
  }),
);
