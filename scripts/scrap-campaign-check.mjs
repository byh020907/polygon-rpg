import assert from 'node:assert/strict';
import { SCRAP_CAST } from '../src/game/campaign/ScrapCastProfile.js';
import { DEFAULT_EQUIPMENT_PROFILE_ID } from '../src/game/equipment/EquipmentProfiles.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import {
  assertProgressionSnapshot,
  createProgressionSnapshot,
} from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import {
  SCRAP_CAMPAIGN_ACTION_KIND,
  SCRAP_CAMPAIGN_SCHEMA_VERSION,
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
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
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

function issueFocusAction(regionId) {
  const region = SCRAP_CAMPAIGN_PROFILE.getRegion(regionId);
  return {
    actionId: `issue-focus:${region.id}`,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.ISSUE_FOCUS,
    label: `주목표 고정 · ${region.label}`,
    targetRegionId: region.id,
    costSegments: 0,
  };
}

function linkedEncounterAction(regionId, encounterId, occurrenceId) {
  const region = SCRAP_CAMPAIGN_PROFILE.getRegion(regionId);
  return {
    actionId: `linked-encounter:${regionId}:${encounterId}:${occurrenceId}`,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.LINKED_ENCOUNTER,
    label: `${region.label} · 연결 전투 제압 ${encounterId}`,
    targetRegionId: regionId,
    encounterId,
    costSegments: 0,
  };
}

function requiredEncounterIdsForRegion(regionId) {
  const required = [];
  for (const primaryIssue of SCRAP_CAMPAIGN_PROFILE.primaryIssues) {
    for (const linkedIssue of primaryIssue.linkedIssues) {
      if (linkedIssue.targetRegionId !== regionId) continue;
      for (const encounterId of linkedIssue.requiredEncounterIds ?? []) {
        if (!required.includes(encounterId)) required.push(encounterId);
      }
    }
  }
  return required;
}

function clearLinkedEncounters(snapshot, regionId, occurrencePrefix) {
  let current = toScrapCampaignSnapshot(
    { ...snapshot, currentLocationId: regionId },
    SCRAP_CAMPAIGN_PROFILE,
  );
  for (const encounterId of requiredEncounterIdsForRegion(regionId)) {
    if (current.clearedEncounterIds.includes(encounterId)) continue;
    current = commit(current, linkedEncounterAction(regionId, encounterId, occurrencePrefix));
  }
  return current;
}

function progressRegionToStage(snapshot, regionId, targetStageKind) {
  const region = SCRAP_CAMPAIGN_PROFILE.getRegion(regionId);
  const targetStageIndex = region.eventStages.findIndex((stage) => stage.kind === targetStageKind);
  let current = toScrapCampaignSnapshot(
    { ...snapshot, currentLocationId: regionId },
    SCRAP_CAMPAIGN_PROFILE,
  );
  let currentStageIndex = region.eventStages.findIndex(
    (stage) => stage.id === current.regionEventStageIds[regionId],
  );
  while (currentStageIndex < targetStageIndex) {
    const nextStage = region.eventStages[currentStageIndex + 1];
    if (nextStage.kind === 'journey-combat' && current.regionStates[regionId] === 'available') {
      current = commit(current, regionEventStartAction(regionId));
    }
    current = commit(current, regionStageAction(regionId, nextStage.kind));
    currentStageIndex += 1;
  }
  return current;
}

function satisfyActiveLinkedIssues(snapshot, primaryRegionId) {
  const primaryIssue = SCRAP_CAMPAIGN_PROFILE.getPrimaryIssueForRegion(primaryRegionId);
  let current = snapshot;
  for (const linkedIssue of primaryIssue.linkedIssues) {
    current = progressRegionToStage(
      current,
      linkedIssue.targetRegionId,
      linkedIssue.completionStageKind,
    );
    current = clearLinkedEncounters(
      current,
      linkedIssue.targetRegionId,
      `satisfy:${primaryRegionId}`,
    );
  }
  return toScrapCampaignSnapshot(
    { ...current, currentLocationId: primaryRegionId },
    SCRAP_CAMPAIGN_PROFILE,
  );
}

function resolveRegion(snapshot, regionId) {
  let current = progressRegionToStage(snapshot, regionId, 'facility-observed');
  const primaryIssue = SCRAP_CAMPAIGN_PROFILE.getPrimaryIssueForRegion(regionId);
  if (!current.activePrimaryIssueId) {
    current = commit(current, issueFocusAction(regionId));
  }
  if (current.activePrimaryIssueId === primaryIssue.id) {
    current = satisfyActiveLinkedIssues(current, regionId);
  }
  current = progressRegionToStage(current, regionId, 'machine-separated');
  return commit(current, regionSuccessAction(regionId));
}

const fresh = createScrapCampaignSnapshot(SCRAP_CAMPAIGN_PROFILE);
const initial = getScrapCampaignReadModel(fresh, SCRAP_CAMPAIGN_PROFILE);
assert.equal(initial.hudLabel, '첫 수거 의뢰 · 고대 병기 각성 전');
assert.equal(initial.awakeningStageId, SCRAP_AWAKENING_STAGE.COMMISSION);
assert.equal(initial.awakeningActive, false);
assert.equal(initial.deadlineRevealed, false);
assert.equal(initial.garageRevealStageId, SCRAP_GARAGE_REVEAL_STAGE.LOCKED);
assert.equal(initial.currentLocationLabel, '동네 고물상');
assert.equal(initial.regions.length, 5);
assert.equal(initial.routeEdges.length, 5);
assert.equal(initial.rivalArrivalLabel, 'Day 31 · 아침');
assert.equal(initial.issueWindow.primary, null);
assert.equal(initial.issueWindow.linkedCount, 0);
assert.equal(initial.issueWindow.maximumLinkedCount, 2);
assert.deepEqual(
  initial.routeEdges.map((edge) => edge.travelSegments),
  [1, 1, 1, 1, 1],
);
for (const region of SCRAP_CAMPAIGN_PROFILE.regions) {
  assert.equal(region.eventStages.length, 8);
  assert.equal(
    region.routeDetour.segments,
    region.event.extensionSegments,
    `${region.id}의 D-DAY 변화는 마지막 작업이 만든 authored 우회 거리와 같아야 합니다.`,
  );
  assert.ok(region.routeDetour.closureLabel.length > 0);
  assert.ok(region.routeDetour.detourLabel.length > 0);
  assert.equal(new Set(region.eventStages.map((stage) => stage.id)).size, 8);
  assert.ok(
    region.eventStages.every((stage) => stage.nextObjective.length > 0),
    `${region.id}의 모든 stage는 authored 다음 목표를 제공해야 합니다.`,
  );
  assert.deepEqual(Object.keys(region.mapPatches), ['before', 'partReady', 'resolved']);
  const primaryIssue = SCRAP_CAMPAIGN_PROFILE.getPrimaryIssueForRegion(region.id);
  assert.equal(primaryIssue.regionId, region.id);
  assert.equal(primaryIssue.linkedIssues.length, 2);
  assert.equal(new Set(primaryIssue.linkedIssues.map((issue) => issue.id)).size, 2);
  for (const linkedIssue of primaryIssue.linkedIssues) {
    const targetRegion = SCRAP_CAMPAIGN_PROFILE.getRegion(linkedIssue.targetRegionId);
    assert.notEqual(linkedIssue.targetRegionId, region.id);
    assert.ok(
      targetRegion.eventStages.some((stage) => stage.kind === linkedIssue.completionStageKind),
      `${linkedIssue.id}는 실제 target region 현장 stage를 완료 조건으로 가져야 합니다.`,
    );
  }
}
assert.equal(SCRAP_CAMPAIGN_PROFILE.pacing.targetPlayMinutes, 600);
assert.equal(SCRAP_CAMPAIGN_PROFILE.pacing.targetRegionMinutes, 120);
assert.equal(initial.completionPercent, 0);
assert.equal(initial.finalBattleAvailable, false);

let awakening = Object.freeze({ changed: false, snapshot: fresh });
for (const expectedStageId of [
  SCRAP_AWAKENING_STAGE.RIVAL_DEPARTURE,
  SCRAP_AWAKENING_STAGE.YARD_CLEARANCE,
  SCRAP_AWAKENING_STAGE.YARD_BRACE,
  SCRAP_AWAKENING_STAGE.YARD_PERIMETER,
  SCRAP_AWAKENING_STAGE.YARD_SURVEY,
  SCRAP_AWAKENING_STAGE.YARD_APPROACH,
  SCRAP_AWAKENING_STAGE.YARD_PLATE,
  SCRAP_AWAKENING_STAGE.YARD_RIDGE,
  SCRAP_AWAKENING_STAGE.YARD_GUARD,
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
  '제어핵 회수는 반복 trigger로 재시작되면 안 됩니다.',
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
assert.equal(migratedCampaign.version, SCRAP_CAMPAIGN_SCHEMA_VERSION);
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
  label: `${SCRAP_CAST.SCRAPYARD_OWNER.name}과 대화`,
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

let focusedCampaign = fresh;
let focusedTravelCount = 0;
function focusedTravel(targetLocationId) {
  focusedTravelCount += 1;
  focusedCampaign = commit(
    focusedCampaign,
    travelAction(`focused-travel:${focusedTravelCount}`, targetLocationId),
  );
}
function focusedObserve(regionId) {
  focusedTravel(regionId);
  focusedCampaign = progressRegionToStage(focusedCampaign, regionId, 'facility-observed');
}
function focusedResolve(regionId) {
  focusedTravel(regionId);
  if (!focusedCampaign.activePrimaryIssueId) {
    focusedCampaign = commit(focusedCampaign, issueFocusAction(regionId));
  }
  assert.equal(
    focusedCampaign.activePrimaryIssueId,
    SCRAP_CAMPAIGN_PROFILE.getPrimaryIssueForRegion(regionId).id,
  );
  assert.equal(
    getScrapCampaignReadModel(focusedCampaign, SCRAP_CAMPAIGN_PROFILE).issueWindow
      .completedLinkedCount,
    2,
  );
  focusedCampaign = progressRegionToStage(focusedCampaign, regionId, 'machine-separated');
  focusedCampaign = commit(focusedCampaign, regionSuccessAction(regionId));
}
function focusedReturn() {
  focusedTravel('neighborhood-scrapyard');
}

focusedObserve('abandoned-mine');
focusedCampaign = clearLinkedEncounters(focusedCampaign, 'abandoned-mine', 'focused');
focusedReturn();
focusedObserve('harbor-shipyard');
focusedCampaign = clearLinkedEncounters(focusedCampaign, 'harbor-shipyard', 'focused');
focusedReturn();
focusedObserve('greenhouse-plains');
focusedCampaign = clearLinkedEncounters(focusedCampaign, 'greenhouse-plains', 'focused');
focusedReturn();
focusedResolve('abandoned-mine');
focusedReturn();
focusedObserve('snow-trade-road');
focusedCampaign = clearLinkedEncounters(focusedCampaign, 'snow-trade-road', 'focused');
focusedReturn();
focusedResolve('harbor-shipyard');
focusedReturn();
focusedResolve('greenhouse-plains');
focusedReturn();
focusedObserve('red-quarry');
focusedReturn();
focusedResolve('snow-trade-road');
focusedReturn();
focusedResolve('red-quarry');

const focusedReadModel = getScrapCampaignReadModel(focusedCampaign, SCRAP_CAMPAIGN_PROFILE);
const focusedInitialBudgetPercent =
  (focusedCampaign.elapsedSegments / SCRAP_CAMPAIGN_PROFILE.initialDeadlineSegments) * 100;
assert.equal(focusedTravelCount, SCRAP_CAMPAIGN_PROFILE.pacing.focusedTravelSegments);
assert.equal(
  focusedCampaign.committedActionIds.filter((actionId) => actionId.startsWith('focused-travel:'))
    .length,
  focusedTravelCount,
);
assert.equal(
  focusedCampaign.committedActionIds.filter((actionId) => actionId.endsWith(':event-start')).length,
  5,
);
assert.equal(focusedReadModel.collectedPartCount, 5);
assert.equal(focusedReadModel.issueWindow.primary, null);
assert.ok(
  focusedInitialBudgetPercent >= SCRAP_CAMPAIGN_PROFILE.pacing.focusedInitialBudgetMinimumPercent &&
    focusedInitialBudgetPercent <= SCRAP_CAMPAIGN_PROFILE.pacing.focusedInitialBudgetMaximumPercent,
  `실제 집중 action trace는 초기 D-DAY의 75~80%를 사용해야 합니다: ${focusedInitialBudgetPercent}%`,
);

const mineProfile = SCRAP_CAMPAIGN_PROFILE.getRegion('abandoned-mine');
let mineStarted = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'abandoned-mine' },
  SCRAP_CAMPAIGN_PROFILE,
);
mineStarted = commit(mineStarted, regionStageAction('abandoned-mine', 'npc-briefing'));
mineStarted = commit(mineStarted, regionStageAction('abandoned-mine', 'facility-observed'));
mineStarted = commit(mineStarted, issueFocusAction('abandoned-mine'));
const mineIssueWindow = getScrapCampaignReadModel(mineStarted, SCRAP_CAMPAIGN_PROFILE).issueWindow;
assert.equal(mineIssueWindow.primary.id, 'mine-rescue-operation');
assert.equal(mineIssueWindow.primary.regionId, 'abandoned-mine');
assert.equal(mineIssueWindow.linkedCount, 2);
assert.equal(mineIssueWindow.completedLinkedCount, 0);
assert.deepEqual(
  mineIssueWindow.linked.map((issue) => issue.targetRegionId),
  ['harbor-shipyard', 'greenhouse-plains'],
);
const blockedMineEventPreview = previewScrapCampaignAction(
  mineStarted,
  regionEventStartAction('abandoned-mine'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(blockedMineEventPreview.allowed, false);
assert.deepEqual(blockedMineEventPreview.blockingIssueIds, [
  'mine-harbor-lift-cable',
  'mine-greenhouse-pressure-brace',
]);
assert.throws(() => commit(mineStarted, regionEventStartAction('abandoned-mine')), /연결 이슈 2개/);

let crossRegionIssues = progressRegionToStage(mineStarted, 'harbor-shipyard', 'facility-observed');
let crossRegionReadModel = getScrapCampaignReadModel(crossRegionIssues, SCRAP_CAMPAIGN_PROFILE);
assert.equal(crossRegionReadModel.issueWindow.primary.id, 'mine-rescue-operation');
assert.equal(crossRegionReadModel.issueWindow.completedLinkedCount, 0);
assert.equal(crossRegionReadModel.issueWindow.linked[0].completed, false);
assert.equal(crossRegionReadModel.issueWindow.linked[0].statusLabel, '현장 전투 필요');
assert.equal(crossRegionReadModel.issueWindow.linked[0].encounterLabel, '건선거 점거 세력 제압');
assert.deepEqual(crossRegionReadModel.issueWindow.linked[0].requiredEncounterIds, [
  'shipyard-drydock-collector',
  'dock-salvage-raider',
]);
assert.deepEqual(crossRegionReadModel.issueWindow.linked[0].remainingEncounterIds, [
  'shipyard-drydock-collector',
  'dock-salvage-raider',
]);
assert.equal(
  crossRegionReadModel.issueWindow.linked[0].completionEvidence,
  '항구 도크 crane cable 현장 확인',
);
for (const requiredEncounterId of ['shipyard-drydock-collector', 'dock-salvage-raider']) {
  const requiredProfile = ENCOUNTER_PROFILES[requiredEncounterId];
  assert.ok(requiredProfile, `연결 전투 profile이 필요합니다: ${requiredEncounterId}`);
}
assert.equal(ENCOUNTER_PROFILES['shipyard-drydock-collector'].role, 'field');
assert.equal(ENCOUNTER_PROFILES['dock-salvage-raider'].species, 'human-salvager');
const blockedCableEventPreview = previewScrapCampaignAction(
  crossRegionIssues,
  regionEventStartAction('abandoned-mine'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(blockedCableEventPreview.allowed, false);
assert.deepEqual(blockedCableEventPreview.blockingIssueIds, [
  'mine-harbor-lift-cable',
  'mine-greenhouse-pressure-brace',
]);
assert.throws(
  () => commit(crossRegionIssues, regionEventStartAction('abandoned-mine')),
  /연결 이슈 2개/,
);
assert.throws(
  () =>
    commit(
      toScrapCampaignSnapshot(
        { ...crossRegionIssues, currentLocationId: 'abandoned-mine' },
        SCRAP_CAMPAIGN_PROFILE,
      ),
      linkedEncounterAction('harbor-shipyard', 'shipyard-drydock-collector', 'wrong-place'),
    ),
  /현재 위치의 연결 전투/,
  '다른 region에 머물러서는 연결 전투를 기록할 수 없습니다.',
);
assert.throws(
  () =>
    commit(
      crossRegionIssues,
      linkedEncounterAction('harbor-shipyard', 'mine-collapse-boss', 'unknown'),
    ),
  /연결 이슈가 요구한 연결 전투/,
  '연결 이슈가 요구하지 않은 전투는 기록할 수 없습니다.',
);
const cableEncounterPreview = previewScrapCampaignAction(
  crossRegionIssues,
  linkedEncounterAction('harbor-shipyard', 'shipyard-drydock-collector', 'preview'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(cableEncounterPreview.title, '연결 이슈 현장 전투를 기록할까요?');
assert.equal(cableEncounterPreview.costSegments, 0);
assert.equal(cableEncounterPreview.willGameOver, false);
crossRegionIssues = commit(
  crossRegionIssues,
  linkedEncounterAction('harbor-shipyard', 'shipyard-drydock-collector', 'cable'),
);
crossRegionReadModel = getScrapCampaignReadModel(crossRegionIssues, SCRAP_CAMPAIGN_PROFILE);
assert.equal(crossRegionReadModel.issueWindow.completedLinkedCount, 0);
assert.deepEqual(crossRegionReadModel.issueWindow.linked[0].remainingEncounterIds, [
  'dock-salvage-raider',
]);
assert.throws(
  () =>
    commit(
      crossRegionIssues,
      linkedEncounterAction('harbor-shipyard', 'shipyard-drydock-collector', 'cable-retry'),
    ),
  /이미 기록한 연결 전투/,
  '같은 연결 전투를 중복 기록할 수 없습니다.',
);
crossRegionIssues = commit(
  crossRegionIssues,
  linkedEncounterAction('harbor-shipyard', 'dock-salvage-raider', 'cable'),
);
crossRegionReadModel = getScrapCampaignReadModel(crossRegionIssues, SCRAP_CAMPAIGN_PROFILE);
assert.equal(crossRegionReadModel.issueWindow.completedLinkedCount, 1);
assert.equal(crossRegionReadModel.issueWindow.linked[0].completed, true);
assert.equal(crossRegionReadModel.issueWindow.linked[0].statusLabel, '현장 해결');
assert.deepEqual(crossRegionReadModel.issueWindow.linked[0].remainingEncounterIds, []);
assert.deepEqual(crossRegionIssues.clearedEncounterIds, [
  'shipyard-drydock-collector',
  'dock-salvage-raider',
]);
const repeatedCableEncounter = commitScrapCampaignAction(
  crossRegionIssues,
  linkedEncounterAction('harbor-shipyard', 'shipyard-drydock-collector', 'cable'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(repeatedCableEncounter.changed, false);
assert.deepEqual(repeatedCableEncounter.snapshot, crossRegionIssues);

let reversedCableOrder = progressRegionToStage(mineStarted, 'harbor-shipyard', 'npc-briefing');
reversedCableOrder = toScrapCampaignSnapshot(
  { ...reversedCableOrder, currentLocationId: 'harbor-shipyard' },
  SCRAP_CAMPAIGN_PROFILE,
);
reversedCableOrder = commit(
  reversedCableOrder,
  linkedEncounterAction('harbor-shipyard', 'dock-salvage-raider', 'reversed'),
);
reversedCableOrder = commit(
  reversedCableOrder,
  linkedEncounterAction('harbor-shipyard', 'shipyard-drydock-collector', 'reversed'),
);
reversedCableOrder = progressRegionToStage(
  reversedCableOrder,
  'harbor-shipyard',
  'facility-observed',
);
const reversedCableReadModel = getScrapCampaignReadModel(
  reversedCableOrder,
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(reversedCableReadModel.issueWindow.completedLinkedCount, 1);
assert.equal(reversedCableReadModel.issueWindow.linked[0].completed, true);

crossRegionIssues = progressRegionToStage(
  crossRegionIssues,
  'greenhouse-plains',
  'facility-observed',
);
crossRegionReadModel = getScrapCampaignReadModel(crossRegionIssues, SCRAP_CAMPAIGN_PROFILE);
assert.equal(crossRegionReadModel.issueWindow.linkedCount, 2);
assert.equal(crossRegionReadModel.issueWindow.completedLinkedCount, 1);
assert.equal(crossRegionReadModel.issueWindow.linked[1].completed, false);
assert.equal(crossRegionReadModel.issueWindow.linked[1].statusLabel, '현장 전투 필요');
assert.equal(crossRegionReadModel.issueWindow.linked[1].encounterLabel, '파열 배관 기생 기계 제압');
assert.deepEqual(crossRegionReadModel.issueWindow.linked[1].requiredEncounterIds, [
  'greenhouse-pipe-parasite',
]);
assert.deepEqual(crossRegionReadModel.issueWindow.linked[1].remainingEncounterIds, [
  'greenhouse-pipe-parasite',
]);
assert.equal(
  crossRegionReadModel.issueWindow.linked[1].completionEvidence,
  '온실 지열 배관 현장 확인',
);
assert.ok(
  ENCOUNTER_PROFILES['greenhouse-pipe-parasite'],
  '연결 전투 profile이 필요합니다: greenhouse-pipe-parasite',
);
assert.equal(ENCOUNTER_PROFILES['greenhouse-pipe-parasite'].role, 'field');
const blockedBraceEventPreview = previewScrapCampaignAction(
  crossRegionIssues,
  regionEventStartAction('abandoned-mine'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(blockedBraceEventPreview.allowed, false);
assert.deepEqual(blockedBraceEventPreview.blockingIssueIds, ['mine-greenhouse-pressure-brace']);
const braceEncounterPreview = previewScrapCampaignAction(
  crossRegionIssues,
  linkedEncounterAction('greenhouse-plains', 'greenhouse-pipe-parasite', 'preview'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(braceEncounterPreview.title, '연결 이슈 현장 전투를 기록할까요?');
assert.equal(braceEncounterPreview.costSegments, 0);
assert.equal(braceEncounterPreview.willGameOver, false);
crossRegionIssues = commit(
  crossRegionIssues,
  linkedEncounterAction('greenhouse-plains', 'greenhouse-pipe-parasite', 'brace'),
);
crossRegionReadModel = getScrapCampaignReadModel(crossRegionIssues, SCRAP_CAMPAIGN_PROFILE);
assert.equal(crossRegionReadModel.issueWindow.completedLinkedCount, 2);
assert.deepEqual(
  crossRegionReadModel.issueWindow.linked.map((issue) => issue.completed),
  [true, true],
);
assert.equal(crossRegionReadModel.issueWindow.linked[1].statusLabel, '현장 해결');
assert.deepEqual(crossRegionReadModel.issueWindow.linked[1].remainingEncounterIds, []);
assert.deepEqual(crossRegionIssues.clearedEncounterIds, [
  'shipyard-drydock-collector',
  'dock-salvage-raider',
  'greenhouse-pipe-parasite',
]);
assert.throws(
  () =>
    commit(
      crossRegionIssues,
      linkedEncounterAction('greenhouse-plains', 'greenhouse-pipe-parasite', 'brace-retry'),
    ),
  /이미 기록한 연결 전투/,
  '같은 연결 전투를 중복 기록할 수 없습니다.',
);
const repeatedBraceEncounter = commitScrapCampaignAction(
  crossRegionIssues,
  linkedEncounterAction('greenhouse-plains', 'greenhouse-pipe-parasite', 'brace'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(repeatedBraceEncounter.changed, false);
assert.deepEqual(repeatedBraceEncounter.snapshot, crossRegionIssues);

let harborIssue = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'harbor-shipyard' },
  SCRAP_CAMPAIGN_PROFILE,
);
harborIssue = commit(harborIssue, regionStageAction('harbor-shipyard', 'npc-briefing'));
harborIssue = commit(harborIssue, regionStageAction('harbor-shipyard', 'facility-observed'));
harborIssue = commit(harborIssue, issueFocusAction('harbor-shipyard'));
const harborIssueWindow = getScrapCampaignReadModel(
  harborIssue,
  SCRAP_CAMPAIGN_PROFILE,
).issueWindow;
assert.equal(harborIssueWindow.primary.id, 'shipyard-recovery-operation');
assert.equal(harborIssueWindow.primary.regionId, 'harbor-shipyard');
assert.equal(harborIssueWindow.linkedCount, 2);
assert.equal(harborIssueWindow.completedLinkedCount, 0);
assert.deepEqual(
  harborIssueWindow.linked.map((issue) => issue.targetRegionId),
  ['greenhouse-plains', 'snow-trade-road'],
);
const blockedHarborEventPreview = previewScrapCampaignAction(
  harborIssue,
  regionEventStartAction('harbor-shipyard'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(blockedHarborEventPreview.allowed, false);
assert.deepEqual(blockedHarborEventPreview.blockingIssueIds, [
  'shipyard-greenhouse-coolant',
  'shipyard-snow-haul-winch',
]);
assert.throws(
  () => commit(harborIssue, regionEventStartAction('harbor-shipyard')),
  /연결 이슈 2개/,
);

harborIssue = progressRegionToStage(harborIssue, 'snow-trade-road', 'facility-observed');
let harborSnowReadModel = getScrapCampaignReadModel(harborIssue, SCRAP_CAMPAIGN_PROFILE);
assert.equal(harborSnowReadModel.issueWindow.primary.id, 'shipyard-recovery-operation');
assert.equal(harborSnowReadModel.issueWindow.linked[1].completed, false);
assert.equal(harborSnowReadModel.issueWindow.linked[1].statusLabel, '현장 전투 필요');
assert.equal(harborSnowReadModel.issueWindow.linked[1].encounterLabel, '설산 길목 수거반 제압');
assert.deepEqual(harborSnowReadModel.issueWindow.linked[1].requiredEncounterIds, [
  'snow-route-raider',
]);
assert.deepEqual(harborSnowReadModel.issueWindow.linked[1].remainingEncounterIds, [
  'snow-route-raider',
]);
assert.equal(
  harborSnowReadModel.issueWindow.linked[1].completionEvidence,
  '설산 열차 설비 현장 확인',
);
assert.ok(
  ENCOUNTER_PROFILES['snow-route-raider'],
  '연결 전투 profile이 필요합니다: snow-route-raider',
);
assert.equal(ENCOUNTER_PROFILES['snow-route-raider'].role, 'field');
assert.equal(ENCOUNTER_PROFILES['snow-route-raider'].species, 'human-salvager');
const blockedWinchEventPreview = previewScrapCampaignAction(
  harborIssue,
  regionEventStartAction('harbor-shipyard'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(blockedWinchEventPreview.allowed, false);
assert.deepEqual(blockedWinchEventPreview.blockingIssueIds, [
  'shipyard-greenhouse-coolant',
  'shipyard-snow-haul-winch',
]);
const winchEncounterPreview = previewScrapCampaignAction(
  harborIssue,
  linkedEncounterAction('snow-trade-road', 'snow-route-raider', 'preview'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(winchEncounterPreview.title, '연결 이슈 현장 전투를 기록할까요?');
assert.equal(winchEncounterPreview.costSegments, 0);
assert.equal(winchEncounterPreview.willGameOver, false);
harborIssue = commit(
  harborIssue,
  linkedEncounterAction('snow-trade-road', 'snow-route-raider', 'winch'),
);
harborSnowReadModel = getScrapCampaignReadModel(harborIssue, SCRAP_CAMPAIGN_PROFILE);
assert.equal(harborSnowReadModel.issueWindow.completedLinkedCount, 1);
assert.equal(harborSnowReadModel.issueWindow.linked[1].completed, true);
assert.equal(harborSnowReadModel.issueWindow.linked[1].statusLabel, '현장 해결');
assert.deepEqual(harborSnowReadModel.issueWindow.linked[1].remainingEncounterIds, []);
assert.deepEqual(harborIssue.clearedEncounterIds, ['snow-route-raider']);
assert.throws(
  () =>
    commit(
      harborIssue,
      linkedEncounterAction('snow-trade-road', 'snow-route-raider', 'winch-retry'),
    ),
  /이미 기록한 연결 전투/,
  '같은 연결 전투를 중복 기록할 수 없습니다.',
);
const repeatedWinchEncounter = commitScrapCampaignAction(
  harborIssue,
  linkedEncounterAction('snow-trade-road', 'snow-route-raider', 'winch'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(repeatedWinchEncounter.changed, false);
assert.deepEqual(repeatedWinchEncounter.snapshot, harborIssue);
harborIssue = progressRegionToStage(harborIssue, 'greenhouse-plains', 'facility-observed');
harborSnowReadModel = getScrapCampaignReadModel(harborIssue, SCRAP_CAMPAIGN_PROFILE);
assert.equal(harborSnowReadModel.issueWindow.primary.id, 'shipyard-recovery-operation');
assert.equal(harborSnowReadModel.issueWindow.linked[0].completed, false);
assert.equal(harborSnowReadModel.issueWindow.linked[0].statusLabel, '현장 전투 필요');
assert.equal(harborSnowReadModel.issueWindow.linked[0].encounterLabel, '냉각수 기생 기계 제압');
assert.deepEqual(harborSnowReadModel.issueWindow.linked[0].requiredEncounterIds, [
  'greenhouse-coolant-parasite',
]);
assert.deepEqual(harborSnowReadModel.issueWindow.linked[0].remainingEncounterIds, [
  'greenhouse-coolant-parasite',
]);
assert.equal(
  harborSnowReadModel.issueWindow.linked[0].completionEvidence,
  '온실 지열 냉각수 현장 확인',
);
assert.ok(
  ENCOUNTER_PROFILES['greenhouse-coolant-parasite'],
  '연결 전투 profile이 필요합니다: greenhouse-coolant-parasite',
);
assert.equal(ENCOUNTER_PROFILES['greenhouse-coolant-parasite'].role, 'field');
const blockedCoolantEventPreview = previewScrapCampaignAction(
  harborIssue,
  regionEventStartAction('harbor-shipyard'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(blockedCoolantEventPreview.allowed, false);
assert.deepEqual(blockedCoolantEventPreview.blockingIssueIds, ['shipyard-greenhouse-coolant']);
const coolantEncounterPreview = previewScrapCampaignAction(
  harborIssue,
  linkedEncounterAction('greenhouse-plains', 'greenhouse-coolant-parasite', 'preview'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(coolantEncounterPreview.title, '연결 이슈 현장 전투를 기록할까요?');
assert.equal(coolantEncounterPreview.costSegments, 0);
assert.equal(coolantEncounterPreview.willGameOver, false);
harborIssue = commit(
  harborIssue,
  linkedEncounterAction('greenhouse-plains', 'greenhouse-coolant-parasite', 'coolant'),
);
harborSnowReadModel = getScrapCampaignReadModel(harborIssue, SCRAP_CAMPAIGN_PROFILE);
assert.equal(harborSnowReadModel.issueWindow.completedLinkedCount, 2);
assert.equal(harborSnowReadModel.issueWindow.linked[0].completed, true);
assert.equal(harborSnowReadModel.issueWindow.linked[0].statusLabel, '현장 해결');
assert.deepEqual(harborSnowReadModel.issueWindow.linked[0].remainingEncounterIds, []);
assert.deepEqual(harborIssue.clearedEncounterIds, [
  'snow-route-raider',
  'greenhouse-coolant-parasite',
]);
assert.throws(
  () =>
    commit(
      harborIssue,
      linkedEncounterAction('greenhouse-plains', 'greenhouse-coolant-parasite', 'coolant-retry'),
    ),
  /이미 기록한 연결 전투/,
  '같은 연결 전투를 중복 기록할 수 없습니다.',
);
const repeatedCoolantEncounter = commitScrapCampaignAction(
  harborIssue,
  linkedEncounterAction('greenhouse-plains', 'greenhouse-coolant-parasite', 'coolant'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(repeatedCoolantEncounter.changed, false);
assert.deepEqual(repeatedCoolantEncounter.snapshot, harborIssue);
const harborBothLinksResolvedPreview = previewScrapCampaignAction(
  toScrapCampaignSnapshot({ ...harborIssue, currentLocationId: 'harbor-shipyard' }),
  regionEventStartAction('harbor-shipyard'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(harborBothLinksResolvedPreview.allowed, true);
assert.equal(harborBothLinksResolvedPreview.costSegments, 13);
assert.equal(harborBothLinksResolvedPreview.successExtensionDays, 3);
const activeIssueStorage = new MemoryStorage();
const activeIssuePersistence = new ProgressionStorage(
  activeIssueStorage,
  'scrap-campaign-active-issue-v9',
  ENCHANTMENT_CATALOG,
  null,
  SCRAP_CAMPAIGN_PROFILE,
);
const activeIssueProgression = {
  ...createProgressionSnapshot(
    DEFAULT_EQUIPMENT_PROFILE_ID,
    ENCHANTMENT_CATALOG,
    SCRAP_CAMPAIGN_PROFILE,
  ),
  scrapCampaign: crossRegionIssues,
};
assert.equal(activeIssuePersistence.save(activeIssueProgression).ok, true);
const loadedActiveIssue = activeIssuePersistence.load(
  DEFAULT_EQUIPMENT_PROFILE_ID,
  [DEFAULT_EQUIPMENT_PROFILE_ID],
  ENCHANTMENT_CATALOG,
);
assert.equal(loadedActiveIssue.ok, true);
assert.deepEqual(loadedActiveIssue.snapshot.scrapCampaign, crossRegionIssues);
mineStarted = toScrapCampaignSnapshot(
  { ...crossRegionIssues, currentLocationId: 'abandoned-mine' },
  SCRAP_CAMPAIGN_PROFILE,
);
const mineEventPreview = previewScrapCampaignAction(
  mineStarted,
  regionEventStartAction('abandoned-mine'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(mineEventPreview.allowed, true);
assert.equal(mineEventPreview.costSegments, 9);
assert.equal(mineEventPreview.extensionSegments, 0);
assert.equal(mineEventPreview.successExtensionDays, 2);
mineStarted = commit(mineStarted, regionEventStartAction('abandoned-mine'));
assert.equal(mineStarted.regionStates['abandoned-mine'], 'in-progress');
assert.equal(mineStarted.deadlineSegments, 111);
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
assert.equal(mineSuccess.activePrimaryIssueId, null);
assert.equal(mineSuccess.completedIssueIds.includes('mine-rescue-operation'), true);
assert.equal(mineSuccess.collectedPartIds.includes(mineProfile.part.id), true);
assert.equal(mineSuccess.deadlineSegments, 120 - 9 + 8);
assert.equal(mineSuccess.rivalDelaySegments, 8);
const mineReadModel = getScrapCampaignReadModel(mineSuccess, SCRAP_CAMPAIGN_PROFILE);
assert.deepEqual(mineReadModel.activeRouteDetours, [
  {
    regionId: 'abandoned-mine',
    regionLabel: '폐광 산촌',
    closureLabel: '굴착기가 옛 군사 지하도를 붕괴',
    detourLabel: '서부 갱도 우회',
    segments: 8,
  },
]);
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
assert.equal(harborEventPreview.allowed, false);
assert.equal(harborEventPreview.costSegments, 13);
assert.equal(harborEventPreview.successExtensionDays, 3);
const harborSuccess = resolveRegion(fresh, 'harbor-shipyard');
assert.equal(harborSuccess.regionStates['harbor-shipyard'], 'resolved');
assert.equal(harborSuccess.collectedPartIds.includes(harborProfile.part.id), true);
assert.equal(harborSuccess.deadlineSegments, 120 - 13 + 12);
assert.equal(harborSuccess.rivalDelaySegments, 12);
assert.equal(
  harborSuccess.regionEventStageIds['harbor-shipyard'],
  'harbor-shipyard:campaign-updated',
);
let nonActiveRegionProbe = commit(harborSuccess, issueFocusAction('greenhouse-plains'));
nonActiveRegionProbe = progressRegionToStage(
  nonActiveRegionProbe,
  'snow-trade-road',
  'facility-observed',
);
const nonActiveRegionPreview = previewScrapCampaignAction(
  nonActiveRegionProbe,
  regionEventStartAction('snow-trade-road'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(nonActiveRegionPreview.allowed, false);
assert.match(nonActiveRegionPreview.blockedReason, /현재 주목표/);
assert.throws(
  () => commit(nonActiveRegionProbe, regionEventStartAction('snow-trade-road')),
  /현재 주목표/,
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
assert.equal(greenhouseEventPreview.costSegments, 17);
assert.equal(greenhouseEventPreview.successExtensionDays, 4);
let greenhouseIssue = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'greenhouse-plains' },
  SCRAP_CAMPAIGN_PROFILE,
);
greenhouseIssue = commit(greenhouseIssue, regionStageAction('greenhouse-plains', 'npc-briefing'));
greenhouseIssue = commit(
  greenhouseIssue,
  regionStageAction('greenhouse-plains', 'facility-observed'),
);
greenhouseIssue = commit(greenhouseIssue, issueFocusAction('greenhouse-plains'));
const greenhouseIssueWindow = getScrapCampaignReadModel(
  greenhouseIssue,
  SCRAP_CAMPAIGN_PROFILE,
).issueWindow;
assert.equal(greenhouseIssueWindow.primary.id, 'greenhouse-restoration-operation');
assert.equal(greenhouseIssueWindow.primary.regionId, 'greenhouse-plains');
assert.equal(greenhouseIssueWindow.linkedCount, 2);
assert.equal(greenhouseIssueWindow.completedLinkedCount, 0);
assert.deepEqual(
  greenhouseIssueWindow.linked.map((issue) => issue.targetRegionId),
  ['snow-trade-road', 'abandoned-mine'],
);
greenhouseIssue = progressRegionToStage(greenhouseIssue, 'snow-trade-road', 'facility-observed');
let greenhouseSnowReadModel = getScrapCampaignReadModel(greenhouseIssue, SCRAP_CAMPAIGN_PROFILE);
assert.equal(greenhouseSnowReadModel.issueWindow.primary.id, 'greenhouse-restoration-operation');
assert.equal(greenhouseSnowReadModel.issueWindow.linked[0].completed, false);
assert.equal(greenhouseSnowReadModel.issueWindow.linked[0].statusLabel, '현장 전투 필요');
assert.equal(
  greenhouseSnowReadModel.issueWindow.linked[0].encounterLabel,
  '내한 케이블 절취 세력 제압',
);
assert.deepEqual(greenhouseSnowReadModel.issueWindow.linked[0].requiredEncounterIds, [
  'snow-thermal-raider',
]);
assert.deepEqual(greenhouseSnowReadModel.issueWindow.linked[0].remainingEncounterIds, [
  'snow-thermal-raider',
]);
assert.equal(
  greenhouseSnowReadModel.issueWindow.linked[0].completionEvidence,
  '설산 터널 내한 cable 현장 확인',
);
assert.ok(
  ENCOUNTER_PROFILES['snow-thermal-raider'],
  '연결 전투 profile이 필요합니다: snow-thermal-raider',
);
assert.equal(ENCOUNTER_PROFILES['snow-thermal-raider'].role, 'field');
assert.equal(ENCOUNTER_PROFILES['snow-thermal-raider'].species, 'human-salvager');
const blockedThermalEventPreview = previewScrapCampaignAction(
  greenhouseIssue,
  regionEventStartAction('greenhouse-plains'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(blockedThermalEventPreview.allowed, false);
assert.deepEqual(blockedThermalEventPreview.blockingIssueIds, [
  'greenhouse-snow-thermal-cable',
  'greenhouse-mine-seal-plate',
]);
const thermalEncounterPreview = previewScrapCampaignAction(
  greenhouseIssue,
  linkedEncounterAction('snow-trade-road', 'snow-thermal-raider', 'preview'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(thermalEncounterPreview.title, '연결 이슈 현장 전투를 기록할까요?');
assert.equal(thermalEncounterPreview.costSegments, 0);
assert.equal(thermalEncounterPreview.willGameOver, false);
greenhouseIssue = commit(
  greenhouseIssue,
  linkedEncounterAction('snow-trade-road', 'snow-thermal-raider', 'thermal'),
);
greenhouseSnowReadModel = getScrapCampaignReadModel(greenhouseIssue, SCRAP_CAMPAIGN_PROFILE);
assert.equal(greenhouseSnowReadModel.issueWindow.completedLinkedCount, 1);
assert.equal(greenhouseSnowReadModel.issueWindow.linked[0].completed, true);
assert.equal(greenhouseSnowReadModel.issueWindow.linked[0].statusLabel, '현장 해결');
assert.deepEqual(greenhouseSnowReadModel.issueWindow.linked[0].remainingEncounterIds, []);
assert.deepEqual(greenhouseIssue.clearedEncounterIds, ['snow-thermal-raider']);
assert.throws(
  () =>
    commit(
      greenhouseIssue,
      linkedEncounterAction('snow-trade-road', 'snow-thermal-raider', 'thermal-retry'),
    ),
  /이미 기록한 연결 전투/,
  '같은 연결 전투를 중복 기록할 수 없습니다.',
);
const repeatedThermalEncounter = commitScrapCampaignAction(
  greenhouseIssue,
  linkedEncounterAction('snow-trade-road', 'snow-thermal-raider', 'thermal'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(repeatedThermalEncounter.changed, false);
assert.deepEqual(repeatedThermalEncounter.snapshot, greenhouseIssue);
let reversedThermalOrder = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'greenhouse-plains' },
  SCRAP_CAMPAIGN_PROFILE,
);
reversedThermalOrder = commit(
  reversedThermalOrder,
  regionStageAction('greenhouse-plains', 'npc-briefing'),
);
reversedThermalOrder = commit(
  reversedThermalOrder,
  regionStageAction('greenhouse-plains', 'facility-observed'),
);
reversedThermalOrder = commit(reversedThermalOrder, issueFocusAction('greenhouse-plains'));
reversedThermalOrder = progressRegionToStage(
  reversedThermalOrder,
  'snow-trade-road',
  'npc-briefing',
);
reversedThermalOrder = toScrapCampaignSnapshot(
  { ...reversedThermalOrder, currentLocationId: 'snow-trade-road' },
  SCRAP_CAMPAIGN_PROFILE,
);
reversedThermalOrder = commit(
  reversedThermalOrder,
  linkedEncounterAction('snow-trade-road', 'snow-thermal-raider', 'reversed'),
);
reversedThermalOrder = progressRegionToStage(
  reversedThermalOrder,
  'snow-trade-road',
  'facility-observed',
);
const reversedThermalReadModel = getScrapCampaignReadModel(
  reversedThermalOrder,
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(reversedThermalReadModel.issueWindow.completedLinkedCount, 1);
assert.equal(reversedThermalReadModel.issueWindow.linked[0].completed, true);
greenhouseIssue = progressRegionToStage(greenhouseIssue, 'abandoned-mine', 'facility-observed');
greenhouseSnowReadModel = getScrapCampaignReadModel(greenhouseIssue, SCRAP_CAMPAIGN_PROFILE);
assert.equal(greenhouseSnowReadModel.issueWindow.completedLinkedCount, 1);
assert.equal(greenhouseSnowReadModel.issueWindow.linked[1].completed, false);
assert.equal(greenhouseSnowReadModel.issueWindow.linked[1].statusLabel, '현장 전투 필요');
assert.equal(
  greenhouseSnowReadModel.issueWindow.linked[1].encounterLabel,
  '밀폐 철판 절취 세력 제압',
);
assert.deepEqual(greenhouseSnowReadModel.issueWindow.linked[1].requiredEncounterIds, [
  'mine-seal-plate-raider',
]);
assert.deepEqual(greenhouseSnowReadModel.issueWindow.linked[1].remainingEncounterIds, [
  'mine-seal-plate-raider',
]);
assert.equal(
  greenhouseSnowReadModel.issueWindow.linked[1].completionEvidence,
  '폐광 구조 설비 현장 확인',
);
assert.ok(
  ENCOUNTER_PROFILES['mine-seal-plate-raider'],
  '연결 전투 profile이 필요합니다: mine-seal-plate-raider',
);
assert.equal(ENCOUNTER_PROFILES['mine-seal-plate-raider'].role, 'field');
assert.equal(ENCOUNTER_PROFILES['mine-seal-plate-raider'].species, 'human-salvager');
const blockedSealEventPreview = previewScrapCampaignAction(
  toScrapCampaignSnapshot({ ...greenhouseIssue, currentLocationId: 'greenhouse-plains' }),
  regionEventStartAction('greenhouse-plains'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(blockedSealEventPreview.allowed, false);
assert.deepEqual(blockedSealEventPreview.blockingIssueIds, ['greenhouse-mine-seal-plate']);
const sealEncounterPreview = previewScrapCampaignAction(
  greenhouseIssue,
  linkedEncounterAction('abandoned-mine', 'mine-seal-plate-raider', 'preview'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(sealEncounterPreview.title, '연결 이슈 현장 전투를 기록할까요?');
assert.equal(sealEncounterPreview.costSegments, 0);
assert.equal(sealEncounterPreview.willGameOver, false);
greenhouseIssue = commit(
  greenhouseIssue,
  linkedEncounterAction('abandoned-mine', 'mine-seal-plate-raider', 'seal'),
);
greenhouseSnowReadModel = getScrapCampaignReadModel(greenhouseIssue, SCRAP_CAMPAIGN_PROFILE);
assert.equal(greenhouseSnowReadModel.issueWindow.completedLinkedCount, 2);
assert.deepEqual(
  greenhouseSnowReadModel.issueWindow.linked.map((issue) => issue.completed),
  [true, true],
);
assert.equal(greenhouseSnowReadModel.issueWindow.linked[1].statusLabel, '현장 해결');
assert.deepEqual(greenhouseSnowReadModel.issueWindow.linked[1].remainingEncounterIds, []);
assert.deepEqual(greenhouseIssue.clearedEncounterIds, [
  'snow-thermal-raider',
  'mine-seal-plate-raider',
]);
assert.throws(
  () =>
    commit(
      greenhouseIssue,
      linkedEncounterAction('abandoned-mine', 'mine-seal-plate-raider', 'seal-retry'),
    ),
  /이미 기록한 연결 전투/,
  '같은 연결 전투를 중복 기록할 수 없습니다.',
);
const repeatedSealEncounter = commitScrapCampaignAction(
  greenhouseIssue,
  linkedEncounterAction('abandoned-mine', 'mine-seal-plate-raider', 'seal'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(repeatedSealEncounter.changed, false);
assert.deepEqual(repeatedSealEncounter.snapshot, greenhouseIssue);
let reversedSealOrder = toScrapCampaignSnapshot(
  { ...fresh, currentLocationId: 'greenhouse-plains' },
  SCRAP_CAMPAIGN_PROFILE,
);
reversedSealOrder = commit(
  reversedSealOrder,
  regionStageAction('greenhouse-plains', 'npc-briefing'),
);
reversedSealOrder = commit(
  reversedSealOrder,
  regionStageAction('greenhouse-plains', 'facility-observed'),
);
reversedSealOrder = commit(reversedSealOrder, issueFocusAction('greenhouse-plains'));
reversedSealOrder = progressRegionToStage(reversedSealOrder, 'abandoned-mine', 'npc-briefing');
reversedSealOrder = toScrapCampaignSnapshot(
  { ...reversedSealOrder, currentLocationId: 'abandoned-mine' },
  SCRAP_CAMPAIGN_PROFILE,
);
reversedSealOrder = commit(
  reversedSealOrder,
  linkedEncounterAction('abandoned-mine', 'mine-seal-plate-raider', 'reversed'),
);
reversedSealOrder = progressRegionToStage(reversedSealOrder, 'abandoned-mine', 'facility-observed');
const reversedSealReadModel = getScrapCampaignReadModel(reversedSealOrder, SCRAP_CAMPAIGN_PROFILE);
assert.equal(reversedSealReadModel.issueWindow.linked[1].completed, true);
const greenhouseBothLinksResolvedPreview = previewScrapCampaignAction(
  toScrapCampaignSnapshot({ ...greenhouseIssue, currentLocationId: 'greenhouse-plains' }),
  regionEventStartAction('greenhouse-plains'),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(greenhouseBothLinksResolvedPreview.allowed, true);
assert.equal(greenhouseBothLinksResolvedPreview.costSegments, 17);
assert.equal(greenhouseBothLinksResolvedPreview.successExtensionDays, 4);
const greenhouseSuccess = resolveRegion(fresh, 'greenhouse-plains');
assert.equal(greenhouseSuccess.regionStates['greenhouse-plains'], 'resolved');
assert.equal(greenhouseSuccess.collectedPartIds.includes(greenhouseProfile.part.id), true);
assert.equal(greenhouseSuccess.deadlineSegments, 120 - 17 + 16);
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
assert.equal(snowEventPreview.costSegments, 13);
assert.equal(snowEventPreview.successExtensionDays, 3);
const snowSuccess = resolveRegion(fresh, 'snow-trade-road');
assert.equal(snowSuccess.regionStates['snow-trade-road'], 'resolved');
assert.equal(snowSuccess.collectedPartIds.includes(snowProfile.part.id), true);
assert.equal(snowSuccess.deadlineSegments, 120 - 13 + 12);
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
assert.equal(quarryEventPreview.costSegments, 21);
assert.equal(quarryEventPreview.successExtensionDays, 5);
const quarrySuccess = resolveRegion(fresh, 'red-quarry');
assert.equal(quarrySuccess.regionStates['red-quarry'], 'resolved');
assert.equal(quarrySuccess.collectedPartIds.includes(quarryProfile.part.id), true);
assert.equal(quarrySuccess.deadlineSegments, 120 - 21 + 20);
assert.equal(quarrySuccess.rivalDelaySegments, 20);
assert.equal(quarrySuccess.regionEventStageIds['red-quarry'], 'red-quarry:campaign-updated');
for (const orderedSnapshot of [
  resolveRegion(resolveRegion(fresh, 'abandoned-mine'), 'harbor-shipyard'),
  resolveRegion(resolveRegion(fresh, 'harbor-shipyard'), 'abandoned-mine'),
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
assert.equal(migratedVersionThreeMine.version, SCRAP_CAMPAIGN_SCHEMA_VERSION);
assert.equal(
  migratedVersionThreeMine.regionEventStageIds['abandoned-mine'],
  'abandoned-mine:campaign-updated',
  'v3에서 이미 해결된 region은 v5의 최종 campaign-updated stage로 이관되어야 합니다.',
);
const versionFourMine = { ...mineSuccess, version: 4 };
delete versionFourMine.activePrimaryIssueId;
delete versionFourMine.completedIssueIds;
const migratedVersionFourMine = toScrapCampaignSnapshot(versionFourMine, SCRAP_CAMPAIGN_PROFILE);
assert.equal(migratedVersionFourMine.version, SCRAP_CAMPAIGN_SCHEMA_VERSION);
assert.equal(migratedVersionFourMine.activePrimaryIssueId, null);
assert.deepEqual(migratedVersionFourMine.completedIssueIds, []);
const versionSixLegacyRegionStatus = {
  ...fresh,
  version: 6,
  regionStates: { ...fresh.regionStates, 'abandoned-mine': ['con', 'voy'].join('') },
};
const migratedVersionSixLegacyRegionStatus = toScrapCampaignSnapshot(
  versionSixLegacyRegionStatus,
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(migratedVersionSixLegacyRegionStatus.version, SCRAP_CAMPAIGN_SCHEMA_VERSION);
assert.equal(migratedVersionSixLegacyRegionStatus.regionStates['abandoned-mine'], 'available');
const versionSixLegacyCompletedRegion = {
  ...mineSuccess,
  version: 6,
  regionStates: { ...mineSuccess.regionStates, 'abandoned-mine': 'recovered' },
};
const migratedVersionSixLegacyCompletedRegion = toScrapCampaignSnapshot(
  versionSixLegacyCompletedRegion,
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(migratedVersionSixLegacyCompletedRegion.regionStates['abandoned-mine'], 'resolved');
assert.equal(
  migratedVersionSixLegacyCompletedRegion.collectedPartIds.includes(mineProfile.part.id),
  true,
);
const versionSevenFresh = { ...fresh, version: 7 };
delete versionSevenFresh.clearedEncounterIds;
const migratedVersionSevenFresh = toScrapCampaignSnapshot(
  versionSevenFresh,
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(migratedVersionSevenFresh.version, SCRAP_CAMPAIGN_SCHEMA_VERSION);
assert.deepEqual(migratedVersionSevenFresh.clearedEncounterIds, []);
assert.deepEqual(migratedVersionSevenFresh.completedIssueIds, []);
const versionSevenLegacyCable = {
  ...fresh,
  version: 7,
  activePrimaryIssueId: 'mine-rescue-operation',
  completedIssueIds: ['mine-harbor-lift-cable'],
};
const migratedVersionSevenLegacyCable = toScrapCampaignSnapshot(
  versionSevenLegacyCable,
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(migratedVersionSevenLegacyCable.version, SCRAP_CAMPAIGN_SCHEMA_VERSION);
assert.deepEqual(migratedVersionSevenLegacyCable.clearedEncounterIds, []);
assert.equal(
  migratedVersionSevenLegacyCable.completedIssueIds.includes('mine-harbor-lift-cable'),
  true,
  'v7에서 확정된 연결 이슈 완료 이력은 마이그레이션 뒤에도 보존해야 합니다.',
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
assert.equal(
  rivalFirst.regionStates['abandoned-mine'],
  'available',
  '고대 병기의 이동은 지역 부품 흐름이나 지역 상태를 자동으로 바꾸면 안 됩니다.',
);

let completeCampaign = fresh;
for (const regionId of ['red-quarry', 'snow-trade-road', 'greenhouse-plains']) {
  completeCampaign = resolveRegion(completeCampaign, regionId);
}
for (const regionId of ['abandoned-mine', 'harbor-shipyard']) {
  completeCampaign = resolveRegion(completeCampaign, regionId);
}
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
      'authored-primary-one-linked-two-cross-region-issue-window',
      'linked-issue-completion-from-target-region-interaction-stage-and-order-independent-reconciliation',
      'mine-harbor-greenhouse-and-shipyard-coolant-snow-and-greenhouse-thermal-and-greenhouse-seal-linked-encounter-requirement-and-order-independent-clearance',
      'active-issue-window-schema-v5-storage-round-trip',
      'ten-hour-two-hour-region-and-seventy-five-percent-focused-pacing-contract',
      'harbor-thirteen-segment-three-day-detour-and-crane-part',
      'mine-harbor-order-independent-two-part-forty-percent',
      'greenhouse-seventeen-segment-four-day-detour-reactor-and-first-three-sixty-percent',
      'snow-thirteen-segment-three-day-detour-armor-and-first-four-eighty-percent',
      'quarry-twenty-one-segment-five-day-detour-cutter-and-five-part-hundred-percent',
      'v3-region-stage-and-v4-issue-window-migration-to-v5',
      'v6-legacy-region-status-migration-to-v7',
      'v7-linked-encounter-migration-to-v8',
      'rival-progress-does-not-rewrite-region-progress',
      'five-part-order-independent-final-battle-unlock',
      'last-segment-warning-and-terminal-game-over',
      'schema-v9-round-trip-and-v8-migration',
      'awakening-stage-storage-round-trip',
      'garage-reveal-stage-storage-round-trip',
    ],
  }),
);
