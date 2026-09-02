import assert from 'node:assert/strict';
import { DEFAULT_EQUIPMENT_PROFILE_ID } from '../src/game/equipment/EquipmentProfiles.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import {
  assertProgressionSnapshot,
  createProgressionSnapshot,
} from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import {
  SCRAP_CAMPAIGN_ACTION_KIND,
  advanceScrapGarageReveal,
  advanceScrapAwakening,
  commitScrapCampaignAction,
  createScrapCampaignSnapshot,
  getScrapCampaignReadModel,
  previewScrapCampaignAction,
  startScrapAwakening,
  startScrapGarageReveal,
  toScrapCampaignSnapshot,
} from '../src/game/campaign/ScrapCampaignState.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';
import { SCRAP_AWAKENING_STAGE } from '../src/game/campaign/ScrapAwakeningState.js';
import { SCRAP_GARAGE_REVEAL_STAGE } from '../src/game/campaign/ScrapGarageRevealState.js';

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

function travelAction(actionId, targetLocationId) {
  return {
    actionId,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.TRAVEL,
    label: `${targetLocationId} 장거리 연결로 이동`,
    targetLocationId,
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
    costSegments: 0,
    extensionSegments: region.event.extensionSegments,
  };
}

function regionStageAction(regionId, stageKind) {
  const region = SCRAP_CAMPAIGN_PROFILE.getRegion(regionId);
  const stage = region.eventStages.find((candidate) => candidate.kind === stageKind);
  return {
    actionId: `region-stage:${stage.id}`,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.REGION_STAGE,
    label: `${region.label} · ${stage.label}`,
    targetRegionId: regionId,
    targetStageId: stage.id,
    costSegments: 0,
  };
}

function regionEventStartAction(regionId) {
  const region = SCRAP_CAMPAIGN_PROFILE.getRegion(regionId);
  return {
    actionId: `region:${regionId}:event-start`,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.REGION_EVENT_START,
    label: `핵심 사건 시작 · ${region.event.label}`,
    targetRegionId: regionId,
    costSegments: region.event.costSegments,
  };
}

function resolveRegion(snapshot, regionId) {
  let current = toScrapCampaignSnapshot(
    { ...snapshot, currentLocationId: regionId },
    SCRAP_CAMPAIGN_PROFILE,
  );
  for (const stageKind of ['npc-briefing', 'facility-observed']) {
    current = commit(current, regionStageAction(regionId, stageKind));
  }
  current = commit(current, regionEventStartAction(regionId));
  for (const stageKind of [
    'journey-combat',
    'boss-defeated',
    'replacement-complete',
    'machine-separated',
  ]) {
    current = commit(current, regionStageAction(regionId, stageKind));
  }
  return commit(current, regionSuccessAction(regionId));
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
assert.equal(initial.hudLabel, '첫 수거 의뢰 · 고철 대왕 각성 전');
assert.equal(initial.awakeningStageId, SCRAP_AWAKENING_STAGE.COMMISSION);
assert.equal(initial.awakeningActive, false);
assert.equal(initial.deadlineRevealed, false);
assert.equal(initial.garageRevealStageId, SCRAP_GARAGE_REVEAL_STAGE.LOCKED);
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
  assert.ok(
    region.eventStages.every((stage) => stage.nextObjective.length > 0),
    `${region.id}의 모든 stage는 authored 다음 목표를 제공해야 합니다.`,
  );
  assert.deepEqual(Object.keys(region.mapPatches), ['before', 'partReady', 'resolved', 'convoy']);
}
assert.equal(initial.completionPercent, 0);
assert.equal(initial.finalBattleAvailable, false);

let awakening = Object.freeze({ changed: false, snapshot: fresh });
for (const expectedStageId of [
  SCRAP_AWAKENING_STAGE.RIVAL_DEPARTURE,
  SCRAP_AWAKENING_STAGE.YARD_SEARCH,
  SCRAP_AWAKENING_STAGE.COLLAPSE,
  SCRAP_AWAKENING_STAGE.RESCUE_REQUEST,
  SCRAP_AWAKENING_STAGE.PLAYER_DECISION,
  SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED,
]) {
  awakening = advanceScrapAwakening(awakening.snapshot, SCRAP_CAMPAIGN_PROFILE);
  assert.equal(awakening.changed, true);
  assert.equal(awakening.snapshot.awakeningStageId, expectedStageId);
}
awakening = startScrapAwakening(awakening.snapshot, SCRAP_CAMPAIGN_PROFILE);
assert.equal(awakening.changed, true);
assert.equal(awakening.snapshot.awakeningStageId, SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.equal(
  startScrapAwakening(awakening.snapshot, SCRAP_CAMPAIGN_PROFILE).changed,
  false,
  '제어장치 회수는 반복 trigger로 재시작되면 안 됩니다.',
);
for (const expectedStageId of [
  SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED,
  SCRAP_AWAKENING_STAGE.EYES_LIT,
  SCRAP_AWAKENING_STAGE.ASSEMBLED,
  SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
  SCRAP_AWAKENING_STAGE.COMPLETE,
]) {
  awakening = advanceScrapAwakening(awakening.snapshot, SCRAP_CAMPAIGN_PROFILE);
  assert.equal(awakening.changed, true);
  assert.equal(awakening.snapshot.awakeningStageId, expectedStageId);
}
const awakenedReadModel = getScrapCampaignReadModel(awakening.snapshot, SCRAP_CAMPAIGN_PROFILE);
assert.equal(awakenedReadModel.hudLabel, 'Day 1 · 아침 · D-30');
assert.equal(awakenedReadModel.awakeningActive, false);
assert.equal(awakenedReadModel.deadlineRevealed, true);
assert.equal(awakenedReadModel.garageRevealStageId, SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY);
assert.equal(advanceScrapAwakening(awakening.snapshot, SCRAP_CAMPAIGN_PROFILE).changed, false);

let garageReveal = startScrapGarageReveal(awakening.snapshot, SCRAP_CAMPAIGN_PROFILE);
assert.equal(garageReveal.changed, true);
assert.equal(garageReveal.snapshot.garageRevealStageId, SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS);
for (const expectedStageId of [
  SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED,
  SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED,
  SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
]) {
  garageReveal = advanceScrapGarageReveal(garageReveal.snapshot, SCRAP_CAMPAIGN_PROFILE);
  assert.equal(garageReveal.changed, true);
  assert.equal(garageReveal.snapshot.garageRevealStageId, expectedStageId);
}
const garageReadModel = getScrapCampaignReadModel(garageReveal.snapshot, SCRAP_CAMPAIGN_PROFILE);
assert.equal(garageReadModel.garageRevealComplete, true);
assert.equal(garageReadModel.completionPercent, 0);
for (const field of [
  'elapsedSegments',
  'deadlineSegments',
  'rivalProgressSegments',
  'committedActionIds',
]) {
  assert.deepEqual(
    garageReveal.snapshot[field],
    awakening.snapshot[field],
    `고물상 대화·지도·차고 reveal은 ${field}을 바꾸면 안 됩니다.`,
  );
}
assert.equal(
  advanceScrapGarageReveal(garageReveal.snapshot, SCRAP_CAMPAIGN_PROFILE).changed,
  false,
);

const legacyCampaign = { ...fresh, version: 1 };
delete legacyCampaign.awakeningStageId;
delete legacyCampaign.garageRevealStageId;
const migratedCampaign = toScrapCampaignSnapshot(legacyCampaign, SCRAP_CAMPAIGN_PROFILE);
assert.equal(migratedCampaign.version, 4);
assert.equal(migratedCampaign.awakeningStageId, SCRAP_AWAKENING_STAGE.COMMISSION);
assert.equal(migratedCampaign.garageRevealStageId, SCRAP_GARAGE_REVEAL_STAGE.LOCKED);

const previousCampaign = { ...awakening.snapshot, version: 2 };
delete previousCampaign.garageRevealStageId;
const migratedPreviousCampaign = toScrapCampaignSnapshot(previousCampaign, SCRAP_CAMPAIGN_PROFILE);
assert.equal(migratedPreviousCampaign.garageRevealStageId, SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY);
assert.throws(
  () =>
    toScrapCampaignSnapshot(
      {
        ...fresh,
        awakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
        garageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.LOCKED,
      },
      SCRAP_CAMPAIGN_PROFILE,
    ),
  /각성 완료 snapshot/,
  '각성 완료와 잠긴 차고를 함께 가진 손상 snapshot은 거부해야 합니다.',
);

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
assert.equal(travelPreview.routeId, 'road:neighborhood-scrapyard:abandoned-mine');
assert.equal(travelPreview.targetLocationLabel, '폐광 산촌');
assert.equal(travelPreview.rival.movementSegments, 1);
assert.equal(travelPreview.rival.before.locationLabel, '각성지');
assert.equal(travelPreview.rival.after.directionLabel, '폐광 산촌');
const afterTravel = commit(fresh, travel);
assert.equal(afterTravel.currentLocationId, 'abandoned-mine');
assert.equal(afterTravel.elapsedSegments, 1);
assert.equal(afterTravel.rivalProgressSegments, 1);
const repeatedTravel = commitScrapCampaignAction(afterTravel, travel, SCRAP_CAMPAIGN_PROFILE);
assert.equal(repeatedTravel.changed, false);
assert.deepEqual(repeatedTravel.snapshot, afterTravel);
const returnedToScrapyard = commit(
  afterTravel,
  travelAction('travel:abandoned-mine:scrapyard', 'neighborhood-scrapyard'),
);
assert.equal(returnedToScrapyard.currentLocationId, 'neighborhood-scrapyard');
assert.equal(returnedToScrapyard.elapsedSegments, 2);

let fourPhaseCycle = fresh;
for (let index = 0; index < 4; index += 1) {
  fourPhaseCycle = commit(
    fourPhaseCycle,
    travelAction(
      `travel:phase-probe:${index}`,
      index % 2 === 0 ? 'abandoned-mine' : 'neighborhood-scrapyard',
    ),
  );
}
const nextMorning = getScrapCampaignReadModel(fourPhaseCycle, SCRAP_CAMPAIGN_PROFILE);
assert.equal(nextMorning.day, 2);
assert.equal(nextMorning.phaseId, 'morning');

const mineProfile = SCRAP_CAMPAIGN_PROFILE.getRegion('abandoned-mine');
let mineStarted = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'abandoned-mine' },
  SCRAP_CAMPAIGN_PROFILE,
);
mineStarted = commit(mineStarted, regionStageAction('abandoned-mine', 'npc-briefing'));
mineStarted = commit(mineStarted, regionStageAction('abandoned-mine', 'facility-observed'));
const mineEventPreview = previewScrapCampaignAction(
  mineStarted,
  regionEventStartAction('abandoned-mine'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(mineEventPreview.costSegments, 10);
assert.equal(mineEventPreview.extensionSegments, 0);
assert.equal(mineEventPreview.successExtensionDays, 2);
mineStarted = commit(mineStarted, regionEventStartAction('abandoned-mine'));
assert.equal(mineStarted.regionStates['abandoned-mine'], 'in-progress');
assert.equal(mineStarted.deadlineSegments, 110);
let mineSuccess = mineStarted;
for (const stageKind of [
  'journey-combat',
  'boss-defeated',
  'replacement-complete',
  'machine-separated',
]) {
  mineSuccess = commit(mineSuccess, regionStageAction('abandoned-mine', stageKind));
}
mineSuccess = commit(mineSuccess, regionSuccessAction('abandoned-mine'));
assert.equal(mineSuccess.regionStates['abandoned-mine'], 'resolved');
assert.equal(mineSuccess.collectedPartIds.includes(mineProfile.part.id), true);
assert.equal(mineSuccess.deadlineSegments, 120 - 10 + 8);
assert.equal(mineSuccess.rivalDelaySegments, 8);
assert.equal(mineSuccess.regionEventStageIds['abandoned-mine'], 'abandoned-mine:campaign-updated');

const harborProfile = SCRAP_CAMPAIGN_PROFILE.getRegion('harbor-shipyard');
let harborStarted = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'harbor-shipyard' },
  SCRAP_CAMPAIGN_PROFILE,
);
harborStarted = commit(harborStarted, regionStageAction('harbor-shipyard', 'npc-briefing'));
harborStarted = commit(harborStarted, regionStageAction('harbor-shipyard', 'facility-observed'));
const harborEventPreview = previewScrapCampaignAction(
  harborStarted,
  regionEventStartAction('harbor-shipyard'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(harborEventPreview.costSegments, 14);
assert.equal(harborEventPreview.successExtensionDays, 3);
const harborSuccess = resolveRegion(fresh, 'harbor-shipyard');
assert.equal(harborSuccess.regionStates['harbor-shipyard'], 'resolved');
assert.equal(harborSuccess.collectedPartIds.includes(harborProfile.part.id), true);
assert.equal(harborSuccess.deadlineSegments, 120 - 14 + 12);
assert.equal(harborSuccess.rivalDelaySegments, 12);
assert.equal(
  harborSuccess.regionEventStageIds['harbor-shipyard'],
  'harbor-shipyard:campaign-updated',
);
const greenhouseProfile = SCRAP_CAMPAIGN_PROFILE.getRegion('greenhouse-plains');
let greenhouseStarted = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'greenhouse-plains' },
  SCRAP_CAMPAIGN_PROFILE,
);
greenhouseStarted = commit(
  greenhouseStarted,
  regionStageAction('greenhouse-plains', 'npc-briefing'),
);
greenhouseStarted = commit(
  greenhouseStarted,
  regionStageAction('greenhouse-plains', 'facility-observed'),
);
const greenhouseEventPreview = previewScrapCampaignAction(
  greenhouseStarted,
  regionEventStartAction('greenhouse-plains'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(greenhouseEventPreview.costSegments, 18);
assert.equal(greenhouseEventPreview.successExtensionDays, 4);
const greenhouseSuccess = resolveRegion(fresh, 'greenhouse-plains');
assert.equal(greenhouseSuccess.regionStates['greenhouse-plains'], 'resolved');
assert.equal(greenhouseSuccess.collectedPartIds.includes(greenhouseProfile.part.id), true);
assert.equal(greenhouseSuccess.deadlineSegments, 120 - 18 + 16);
assert.equal(greenhouseSuccess.rivalDelaySegments, 16);
assert.equal(
  greenhouseSuccess.regionEventStageIds['greenhouse-plains'],
  'greenhouse-plains:campaign-updated',
);
const snowProfile = SCRAP_CAMPAIGN_PROFILE.getRegion('snow-trade-road');
let snowStarted = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'snow-trade-road' },
  SCRAP_CAMPAIGN_PROFILE,
);
snowStarted = commit(snowStarted, regionStageAction('snow-trade-road', 'npc-briefing'));
snowStarted = commit(snowStarted, regionStageAction('snow-trade-road', 'facility-observed'));
const snowEventPreview = previewScrapCampaignAction(
  snowStarted,
  regionEventStartAction('snow-trade-road'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(snowEventPreview.costSegments, 16);
assert.equal(snowEventPreview.successExtensionDays, 3);
const snowSuccess = resolveRegion(fresh, 'snow-trade-road');
assert.equal(snowSuccess.regionStates['snow-trade-road'], 'resolved');
assert.equal(snowSuccess.collectedPartIds.includes(snowProfile.part.id), true);
assert.equal(snowSuccess.deadlineSegments, 120 - 16 + 12);
assert.equal(snowSuccess.rivalDelaySegments, 12);
assert.equal(
  snowSuccess.regionEventStageIds['snow-trade-road'],
  'snow-trade-road:campaign-updated',
);
const quarryProfile = SCRAP_CAMPAIGN_PROFILE.getRegion('red-quarry');
let quarryStarted = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'red-quarry' },
  SCRAP_CAMPAIGN_PROFILE,
);
quarryStarted = commit(quarryStarted, regionStageAction('red-quarry', 'npc-briefing'));
quarryStarted = commit(quarryStarted, regionStageAction('red-quarry', 'facility-observed'));
const quarryEventPreview = previewScrapCampaignAction(
  quarryStarted,
  regionEventStartAction('red-quarry'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(quarryEventPreview.costSegments, 22);
assert.equal(quarryEventPreview.successExtensionDays, 5);
const quarrySuccess = resolveRegion(fresh, 'red-quarry');
assert.equal(quarrySuccess.regionStates['red-quarry'], 'resolved');
assert.equal(quarrySuccess.collectedPartIds.includes(quarryProfile.part.id), true);
assert.equal(quarrySuccess.deadlineSegments, 120 - 22 + 20);
assert.equal(quarrySuccess.rivalDelaySegments, 20);
assert.equal(quarrySuccess.regionEventStageIds['red-quarry'], 'red-quarry:campaign-updated');
for (const orderedSnapshot of [
  resolveRegion(resolveRegion(fresh, 'abandoned-mine'), 'harbor-shipyard'),
  commit(resolveRegion(fresh, 'harbor-shipyard'), convoyAction('abandoned-mine')),
]) {
  const orderedReadModel = getScrapCampaignReadModel(orderedSnapshot, SCRAP_CAMPAIGN_PROFILE);
  assert.equal(orderedReadModel.collectedPartCount, 2);
  assert.equal(orderedReadModel.completionPercent, 40);
  assert.deepEqual(
    orderedReadModel.regions.filter((region) => region.collected).map((region) => region.id),
    ['abandoned-mine', 'harbor-shipyard'],
  );
}
const firstThreeResolved = resolveRegion(
  resolveRegion(resolveRegion(fresh, 'abandoned-mine'), 'harbor-shipyard'),
  'greenhouse-plains',
);
const firstThreeReadModel = getScrapCampaignReadModel(firstThreeResolved, SCRAP_CAMPAIGN_PROFILE);
assert.equal(firstThreeReadModel.collectedPartCount, 3);
assert.equal(firstThreeReadModel.completionPercent, 60);
assert.deepEqual(
  firstThreeReadModel.regions.filter((region) => region.collected).map((region) => region.id),
  ['abandoned-mine', 'harbor-shipyard', 'greenhouse-plains'],
);
const firstFourResolved = resolveRegion(firstThreeResolved, 'snow-trade-road');
const firstFourReadModel = getScrapCampaignReadModel(firstFourResolved, SCRAP_CAMPAIGN_PROFILE);
assert.equal(firstFourReadModel.collectedPartCount, 4);
assert.equal(firstFourReadModel.completionPercent, 80);
assert.equal(firstFourReadModel.finalBattleAvailable, false);
assert.deepEqual(
  firstFourReadModel.regions.filter((region) => region.collected).map((region) => region.id),
  ['abandoned-mine', 'harbor-shipyard', 'greenhouse-plains', 'snow-trade-road'],
);
const firstFiveResolved = resolveRegion(firstFourResolved, 'red-quarry');
const firstFiveReadModel = getScrapCampaignReadModel(firstFiveResolved, SCRAP_CAMPAIGN_PROFILE);
assert.equal(firstFiveReadModel.collectedPartCount, 5);
assert.equal(firstFiveReadModel.completionPercent, 100);
assert.equal(firstFiveReadModel.finalBattleAvailable, true);
assert.deepEqual(
  firstFiveReadModel.regions.filter((region) => region.collected).map((region) => region.id),
  ['abandoned-mine', 'harbor-shipyard', 'greenhouse-plains', 'snow-trade-road', 'red-quarry'],
);
const versionThreeMine = { ...mineSuccess, version: 3 };
delete versionThreeMine.regionEventStageIds;
const migratedVersionThreeMine = toScrapCampaignSnapshot(versionThreeMine, SCRAP_CAMPAIGN_PROFILE);
assert.equal(migratedVersionThreeMine.version, 4);
assert.equal(
  migratedVersionThreeMine.regionEventStageIds['abandoned-mine'],
  'abandoned-mine:campaign-updated',
  'v3에서 이미 해결된 region은 최종 campaign-updated stage로 이관되어야 합니다.',
);

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
  completeCampaign = resolveRegion(completeCampaign, regionId);
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
completeCampaign = toScrapCampaignSnapshot(
  {
    ...completeCampaign,
    awakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
    garageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
  },
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
assertProgressionSnapshot(progression, SCRAP_CAMPAIGN_PROFILE);
const saveResult = persistence.save(progression);
assert.equal(saveResult.ok, true, JSON.stringify(saveResult));
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
      'playable-awakening-stage-order-and-d30-reveal',
      'awakening-repeat-trigger-idempotence-and-v1-migration',
      'owner-analysis-map-garage-stage-order-and-v2-migration',
      'explicit-route-edges-rival-arrival-and-region-stage-patches',
      'free-actions-zero-cost-and-one-segment-travel',
      'bidirectional-authored-route-and-rival-preview',
      'four-segment-day-rollover',
      'stable-action-idempotence',
      'ordered-region-stages-event-start-cost-and-success-detour',
      'harbor-fourteen-segment-three-day-detour-and-crane-part',
      'mine-harbor-order-or-convoy-two-part-forty-percent',
      'greenhouse-eighteen-segment-four-day-detour-reactor-and-first-three-sixty-percent',
      'snow-sixteen-segment-three-day-detour-armor-and-first-four-eighty-percent',
      'quarry-twenty-two-segment-five-day-detour-cutter-and-five-part-hundred-percent',
      'v3-region-stage-migration-to-v4',
      'rival-first-convoy-two-segment-no-extension-recovery',
      'five-part-order-independent-final-battle-unlock',
      'last-segment-warning-and-terminal-game-over',
      'schema-v9-round-trip-and-v8-migration',
      'awakening-stage-storage-round-trip',
      'garage-reveal-stage-storage-round-trip',
    ],
  }),
);
