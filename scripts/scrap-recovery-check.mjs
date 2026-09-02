import assert from 'node:assert/strict';

import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { EQUIPMENT_CATALOG } from '../src/game/equipment/EquipmentProfiles.js';
import { COMBAT_PROGRESSION_PROFILE } from '../src/game/progression/ProgressionProfiles.js';
import {
  createProgressionSnapshot,
  mergeProgressionSnapshot,
} from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import {
  RECOVERY_SLOT_ID,
  createInitialMorningRecoveryRequest,
  createPostProgressionRecoveryRequests,
  createPreActionRecoveryRequest,
  createRecoverySlotReadModel,
} from '../src/game/progression/CampaignRecoveryPolicy.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';
import { toScrapCampaignSnapshot } from '../src/game/campaign/ScrapCampaignState.js';
import {
  SCRAP_GAME_OVER_STAGE,
  advanceScrapGameOverPresentation,
  createScrapGameOverPresentation,
  getScrapGameOverPresentation,
} from '../src/game/campaign/ScrapGameOverPresentation.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
import { GameApp } from '../src/app/GameApp.js';

const STORAGE_KEY = 'polygon-rpg.test.progression';
const RECOVERY_KEY = `${STORAGE_KEY}.recovery.v1`;
const EQUIPMENT_IDS = EQUIPMENT_CATALOG.profiles.map((profile) => profile.id);

class MemoryStorage {
  constructor({ throwOnKey = null } = {}) {
    this.values = new Map();
    this.throwOnKey = throwOnKey;
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    if (key === this.throwOnKey) throw new Error('injected write failure');
    this.values.set(key, value);
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function createStorage(storage = new MemoryStorage()) {
  return new ProgressionStorage(
    storage,
    STORAGE_KEY,
    ENCHANTMENT_CATALOG,
    COMBAT_PROGRESSION_PROFILE.weaponForge,
    SCRAP_CAMPAIGN_PROFILE,
  );
}

function withCampaign(progression, campaignPatch) {
  return mergeProgressionSnapshot(progression, {
    scrapCampaign: toScrapCampaignSnapshot(
      { ...progression.scrapCampaign, ...campaignPatch },
      SCRAP_CAMPAIGN_PROFILE,
    ),
  });
}

const fresh = createProgressionSnapshot(
  EQUIPMENT_CATALOG.defaultProfileId,
  ENCHANTMENT_CATALOG,
  SCRAP_CAMPAIGN_PROFILE,
);
const morningRequest = createInitialMorningRecoveryRequest(fresh, SCRAP_CAMPAIGN_PROFILE);
assert.equal(morningRequest.slotId, RECOVERY_SLOT_ID.LATEST_MORNING);
assert.equal(morningRequest.metadata.day, 1);
assert.equal(morningRequest.metadata.deadlineLabel, 'D-30');

const dayTwoMorning = withCampaign(fresh, {
  elapsedSegments: 4,
  deadlineSegments: fresh.scrapCampaign.deadlineSegments - 4,
  rivalProgressSegments: 4,
  lastChangeLabel: 'Day 2 · 아침',
});
const nextMorningRequests = createPostProgressionRecoveryRequests(
  fresh,
  dayTwoMorning,
  SCRAP_CAMPAIGN_PROFILE,
);
assert.deepEqual(
  nextMorningRequests.map((request) => request.slotId),
  [RECOVERY_SLOT_ID.LATEST_MORNING],
);
assert.equal(nextMorningRequests[0].metadata.day, 2);

const mine = SCRAP_CAMPAIGN_PROFILE.getRegion('abandoned-mine');
const coreComplete = withCampaign(dayTwoMorning, {
  regionStates: {
    ...dayTwoMorning.scrapCampaign.regionStates,
    [mine.id]: 'resolved',
  },
  regionEventStageIds: {
    ...dayTwoMorning.scrapCampaign.regionEventStageIds,
    [mine.id]: mine.eventStages.at(-1).id,
  },
  collectedPartIds: [mine.part.id],
  lastChangeLabel: `${mine.label} · ${mine.part.label} 회수`,
});
const coreRequests = createPostProgressionRecoveryRequests(
  dayTwoMorning,
  coreComplete,
  SCRAP_CAMPAIGN_PROFILE,
);
assert.deepEqual(
  coreRequests.map((request) => request.slotId),
  [RECOVERY_SLOT_ID.LATEST_CORE_EVENT],
);
assert.match(coreRequests[0].metadata.detailLabel, new RegExp(mine.part.label));

const preActionRequest = createPreActionRecoveryRequest(
  coreComplete,
  Object.freeze({ label: '설산 교역로 이동', costSegments: 1 }),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(preActionRequest.slotId, RECOVERY_SLOT_ID.PRE_ACTION);
assert.match(preActionRequest.metadata.detailLabel, /1구간 소비 전/);

const memory = new MemoryStorage();
const storage = createStorage(memory);
for (const request of [nextMorningRequests[0], coreRequests[0], preActionRequest]) {
  assert.equal(
    storage.saveRecoverySlot(request.slotId, request.snapshot, request.metadata).ok,
    true,
  );
}
const loadedSlots = storage.loadRecoverySlots(
  EQUIPMENT_CATALOG.defaultProfileId,
  EQUIPMENT_IDS,
  ENCHANTMENT_CATALOG,
);
assert.equal(loadedSlots.ok, true);
assert.deepEqual(
  new Set(loadedSlots.records.map((record) => record.slotId)),
  new Set([
    RECOVERY_SLOT_ID.PRE_ACTION,
    RECOVERY_SLOT_ID.LATEST_CORE_EVENT,
    RECOVERY_SLOT_ID.LATEST_MORNING,
  ]),
);
assert.equal(
  loadedSlots.records.find((record) => record.slotId === RECOVERY_SLOT_ID.PRE_ACTION).snapshot
    .scrapCampaign.gameOver,
  false,
);
assert.match(createRecoverySlotReadModel(loadedSlots.records[0]).timeLabel, /^Day \d+ ·/);

const corruptMemory = new MemoryStorage();
corruptMemory.setItem(RECOVERY_KEY, '{broken-json');
const corruptLoad = createStorage(corruptMemory).loadRecoverySlots(
  EQUIPMENT_CATALOG.defaultProfileId,
  EQUIPMENT_IDS,
  ENCHANTMENT_CATALOG,
);
assert.equal(corruptLoad.ok, false);
assert.equal(corruptLoad.reason, 'recovery-invalid-data');

const failingStorage = createStorage(new MemoryStorage({ throwOnKey: RECOVERY_KEY }));
const failedWrite = failingStorage.saveRecoverySlot(
  preActionRequest.slotId,
  preActionRequest.snapshot,
  preActionRequest.metadata,
);
assert.equal(failedWrite.ok, false);
assert.equal(failedWrite.reason, 'recovery-write-failed');

let sceneConfirmCalls = 0;
const blockedConfirm = GameApp.prototype.confirmCampaignActionPreview.call({
  scene: {
    getPendingScrapCampaignAction: () => ({
      preview: Object.freeze({ label: '마지막 연결로', costSegments: 1 }),
    }),
    getProgressionSnapshot: () => coreComplete,
    confirmScrapCampaignAction: () => {
      sceneConfirmCalls += 1;
      return Object.freeze({ started: true });
    },
  },
  saveRecoveryRequest: () =>
    Object.freeze({ ok: false, reason: 'recovery-write-failed', message: 'injected' }),
});
assert.equal(blockedConfirm.started, false);
assert.equal(blockedConfirm.reason, 'pre-action-recovery-save-failed');
assert.equal(
  sceneConfirmCalls,
  0,
  'pre-action 복구 저장 실패 뒤 action commit을 호출하면 안 됩니다.',
);

const recoveryRecord = Object.freeze({
  slotId: RECOVERY_SLOT_ID.PRE_ACTION,
  snapshot: coreComplete,
  metadata: Object.freeze({ title: '행동 확정 직전' }),
});
let failedRestoreSceneCalls = 0;
const failedRestore = GameApp.prototype.restoreRecoverySlot.call({
  isVisualQa: false,
  progressionStorage: {
    loadRecoverySlots: () => Object.freeze({ ok: true, records: [recoveryRecord] }),
    save: () => Object.freeze({ ok: false, reason: 'write-failed', message: 'injected' }),
  },
  equipmentIds: EQUIPMENT_IDS,
  uiBridge: { setSaveStatus() {} },
  scene: {
    restoreProgression() {
      failedRestoreSceneCalls += 1;
    },
  },
});
assert.equal(failedRestore.ok, false);
assert.equal(failedRestoreSceneCalls, 0, 'main save 실패 뒤 scene snapshot을 바꾸면 안 됩니다.');

let successfulRestoreSceneCalls = 0;
let successfulInputClears = 0;
let successfulRunnerResets = 0;
const successfulRestoreHarness = {
  isVisualQa: false,
  progressionStorage: {
    loadRecoverySlots: () => Object.freeze({ ok: true, records: [recoveryRecord] }),
    save: () => Object.freeze({ ok: true, kind: 'saved' }),
  },
  equipmentIds: EQUIPMENT_IDS,
  uiBridge: { setSaveStatus() {} },
  scene: {
    restoreProgression(snapshot) {
      assert.equal(snapshot, coreComplete);
      successfulRestoreSceneCalls += 1;
    },
  },
  input: {
    clear() {
      successfulInputClears += 1;
    },
  },
  runner: {
    reset() {
      successfulRunnerResets += 1;
    },
  },
};
const successfulRestore = GameApp.prototype.restoreRecoverySlot.call(
  successfulRestoreHarness,
  RECOVERY_SLOT_ID.PRE_ACTION,
);
assert.equal(successfulRestore.ok, true);
assert.equal(successfulRestoreSceneCalls, 1);
assert.equal(successfulInputClears, 1);
assert.equal(successfulRunnerResets, 1);
assert.equal(successfulRestoreHarness.lastObservedProgressionSnapshot, coreComplete);

let presentation = createScrapGameOverPresentation(true);
assert.equal(presentation.stageId, SCRAP_GAME_OVER_STAGE.INPUT_LOCKED);
presentation = advanceScrapGameOverPresentation(presentation, 0.81);
assert.equal(presentation.stageId, SCRAP_GAME_OVER_STAGE.CAPITAL_ARRIVAL);
presentation = advanceScrapGameOverPresentation(presentation, 1.16);
assert.equal(presentation.stageId, SCRAP_GAME_OVER_STAGE.CAPITAL_DESTROYED);
presentation = advanceScrapGameOverPresentation(presentation, 1.26);
assert.equal(presentation.stageId, SCRAP_GAME_OVER_STAGE.RECOVERY_CHOICE);
assert.equal(getScrapGameOverPresentation(presentation).recoveryAvailable, true);

const scene = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: fresh,
});
const campaignBeforeKoReturn = scene.getProgressionSnapshot().scrapCampaign;
const legacyWorldTimeBeforeKoReturn = scene.getProgressionSnapshot().worldTime;
scene.respawnPlayerAfterKo();
const campaignAfterKoReturn = scene.getProgressionSnapshot().scrapCampaign;
assert.equal(campaignAfterKoReturn.elapsedSegments, campaignBeforeKoReturn.elapsedSegments + 1);
assert.equal(campaignAfterKoReturn.deadlineSegments, campaignBeforeKoReturn.deadlineSegments - 1);
assert.equal(campaignAfterKoReturn.committedActionIds.length, 1);
assert.match(campaignAfterKoReturn.committedActionIds[0], /^ko-return:/);
assert.deepEqual(
  scene.getProgressionSnapshot().worldTime,
  legacyWorldTimeBeforeKoReturn,
  'KO 복귀는 legacy World Time이 아닌 고철 Campaign owner만 갱신해야 합니다.',
);
const beforePosition = { ...scene.position };
scene.setVisualQaScrapGameOverStage(SCRAP_GAME_OVER_STAGE.INPUT_LOCKED);
scene.update(0.4, Object.freeze({ right: true, jump: true, jumpSequence: 1 }));
assert.deepEqual(
  scene.position,
  beforePosition,
  'D-DAY 0 이후 gameplay command는 Player를 움직이면 안 됩니다.',
);
assert.equal(scene.getWorldStatus().campaign.gameOver, true);
assert.equal(scene.getWorldStatus().operationMapAvailable, false);
scene.update(4, Object.freeze({ right: true, jump: true, jumpSequence: 2 }));
assert.equal(
  scene.getWorldStatus().gameOverPresentation.stageId,
  SCRAP_GAME_OVER_STAGE.RECOVERY_CHOICE,
);
assert.equal(scene.getPendingScrapCampaignAction(), null);

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'scrap-recovery-and-game-over',
    checks: [
      'initial-and-daily-morning-recovery-policy',
      'core-event-completion-recovery-policy',
      'pre-action-recovery-policy',
      'three-slot-round-trip-and-read-model',
      'corrupt-recovery-explicit-failure',
      'recovery-write-failure-explicit-result',
      'pre-action-save-failure-blocks-action-commit',
      'selected-recovery-main-save-before-scene-restore',
      'ko-return-single-segment-campaign-commit-without-legacy-world-time-write',
      'game-over-input-lock-capital-destruction-recovery-sequence',
      'terminal-gameplay-command-rejection',
    ],
  }),
);
