import assert from 'node:assert/strict';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { DEFAULT_EQUIPMENT_PROFILE_ID } from '../src/game/equipment/EquipmentProfiles.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { createProgressionSnapshot } from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import {
  commitWorldAction,
  createWorldTimeSnapshot,
  getWorldClockReadModel,
} from '../src/game/world/WorldTimeState.js';
import { WORLD_TIME_PROFILE } from '../src/game/world/WorldTimeProfiles.js';

const EMPTY_INPUT = Object.freeze({
  left: false,
  right: false,
  jump: false,
  guard: false,
  basicAttack: false,
  strongAttack: false,
  jumpSequence: 0,
  basicAttackSequence: 0,
  strongAttackSequence: 0,
});

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

function completePortal(scene, portalId) {
  const portal = scene.mapRuntime.getPortal(portalId);
  assert.ok(portal, `${portalId} portal이 현재 Room에 있어야 합니다.`);
  scene.beginPortalTransition(portal);
  for (let step = 0; step < 80 && scene.mapRuntime.getTransition(); step += 1) {
    scene.updatePortalTransition(1 / 120);
  }
  assert.equal(scene.mapRuntime.getTransition(), null, `${portalId} transition은 완료돼야 합니다.`);
}

const fresh = createWorldTimeSnapshot();
const initialReadModel = getWorldClockReadModel(fresh);
assert.deepEqual(
  { time: initialReadModel.timeLabel, deadline: initialReadModel.deadlineMinutes },
  { time: '10:00', deadline: 720 },
);

const firstEvent = commitWorldAction(fresh, {
  actionId: 'guardian:alpha',
  clockCostMinutes: 30,
  deadlineCostMinutes: 30,
  deadlineExtensionMinutes: 60,
});
assert.equal(firstEvent.changed, true);
assert.equal(firstEvent.snapshot.clockMinutes, 630);
assert.equal(firstEvent.snapshot.deadlineMinutes, 750);
const repeatedEvent = commitWorldAction(firstEvent.snapshot, {
  actionId: 'guardian:alpha',
  clockCostMinutes: 30,
  deadlineCostMinutes: 30,
  deadlineExtensionMinutes: 60,
});
assert.equal(
  repeatedEvent.changed,
  false,
  'stable core event는 재진입해도 중복 적용하지 않습니다.',
);
const crisis = commitWorldAction(fresh, {
  actionId: 'travel:too-late',
  clockCostMinutes: 720,
  deadlineCostMinutes: 720,
  repeatable: true,
});
assert.equal(crisis.snapshot.crisis, true);
assert.equal(crisis.snapshot.deadlineMinutes, 0);

const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
const beforeIdle = scene.getProgressionSnapshot().worldTime;
for (let tick = 0; tick < 120 * 180; tick += 1) scene.update(1 / 120, EMPTY_INPUT);
assert.deepEqual(
  scene.getProgressionSnapshot().worldTime,
  beforeIdle,
  'idle fixed-step와 background simulation은 시간을 진행하지 않아야 합니다.',
);

completePortal(scene, 'academy-training-portal');
assert.deepEqual(
  scene.getProgressionSnapshot().worldTime,
  beforeIdle,
  '기술적 근거리 Room 전환은 Travel Segment 비용이 없어야 합니다.',
);
completePortal(scene, 'academy-training-portal');
completePortal(scene, 'academy-field-portal');
const afterTravel = scene.getProgressionSnapshot().worldTime;
assert.equal(afterTravel.clockMinutes - beforeIdle.clockMinutes, 90);
assert.equal(afterTravel.deadlineMinutes, beforeIdle.deadlineMinutes - 90);
assert.equal(scene.getWorldStatus().timeLabel, 'Day 1 · 아침');
assert.equal(scene.getWorldStatus().deadlineLabel, 'D-30');
assert.equal(
  scene.getWorldStatus().campaign.rivalProgressSegments,
  undefined,
  'UI는 mutable campaign internals 대신 operation-map read model만 노출해야 합니다.',
);
assert.ok(
  WORLD_TIME_PROFILE.getTravelAction('sealed-shortcut-return').clockCostMinutes <
    WORLD_TIME_PROFILE.getTravelAction('academy-sealed-road').clockCostMinutes,
  '열린 shortcut은 같은 지역 outbound 여행보다 시간이 적게 들어야 합니다.',
);
assert.ok(
  WORLD_TIME_PROFILE.getTravelAction('glasswind-shortcut-return').clockCostMinutes <
    WORLD_TIME_PROFILE.getTravelAction('academy-glasswind-canyon').clockCostMinutes,
  '유리바람 shortcut도 authored outbound 여행보다 비용이 작아야 합니다.',
);

const meaningfulActionScene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
const beforeTraining = meaningfulActionScene.getProgressionSnapshot().worldTime;
meaningfulActionScene.resolveJourneyEncounter({ profileId: 'training' });
assert.equal(
  meaningfulActionScene.getProgressionSnapshot().worldTime.clockMinutes,
  beforeTraining.clockMinutes + 45,
  '완료한 훈련은 의미 있는 행동 비용을 한 번 확정해야 합니다.',
);
const beforeKoWorldTime = meaningfulActionScene.getProgressionSnapshot().worldTime;
const beforeKoCampaign = meaningfulActionScene.getProgressionSnapshot().scrapCampaign;
meaningfulActionScene.respawnPlayerAfterKo(EMPTY_INPUT);
const afterKoProgression = meaningfulActionScene.getProgressionSnapshot();
assert.deepEqual(
  afterKoProgression.worldTime,
  beforeKoWorldTime,
  'KO 복구는 legacy World Time을 쓰지 않아야 합니다.',
);
assert.equal(
  afterKoProgression.scrapCampaign.elapsedSegments,
  beforeKoCampaign.elapsedSegments + 1,
  'KO 복구는 Scrap Campaign의 1구간만 확정해야 합니다.',
);
assert.equal(
  afterKoProgression.scrapCampaign.deadlineSegments,
  beforeKoCampaign.deadlineSegments - 1,
  'KO 복구는 같은 Campaign transaction에서 D-DAY를 한 구간 줄여야 합니다.',
);
assert.match(
  afterKoProgression.scrapCampaign.lastChangeLabel,
  /KO 거점 복귀/,
  'KO 복구의 시간 원인은 Campaign read model에 남아야 합니다.',
);
assert.equal(
  meaningfulActionScene.getProgressionSnapshot().worldTime.clockMinutes,
  beforeKoWorldTime.clockMinutes,
  'KO 복구는 legacy World Time을 변경하지 않아야 합니다.',
);

const rebuildContext = meaningfulActionScene.mapRuntime.getWorldContext();
const firstRebuild = meaningfulActionScene.mapRuntime.getResolvedSnapshot();
meaningfulActionScene.mapRuntime.setActiveLocation('academy-region', 'training-room');
meaningfulActionScene.mapRuntime.setActiveLocation('academy-region', 'academy-plaza');
const secondRebuild = meaningfulActionScene.mapRuntime.getResolvedSnapshot();
assert.deepEqual(meaningfulActionScene.mapRuntime.getWorldContext(), rebuildContext);
assert.deepEqual(
  {
    roomId: secondRebuild.active.roomId,
    patchIds: secondRebuild.appliedPatchIds,
    portalIds: secondRebuild.portals.map((portal) => portal.id),
  },
  {
    roomId: firstRebuild.active.roomId,
    patchIds: firstRebuild.appliedPatchIds,
    portalIds: firstRebuild.portals.map((portal) => portal.id),
  },
  '같은 global time/stable flags로 Chunk를 다시 load하면 같은 resolved 상태여야 합니다.',
);

const failedScene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
const failedBefore = failedScene.getProgressionSnapshot().worldTime;
failedScene.beginPortalTransition(failedScene.mapRuntime.getPortal('academy-field-portal'));
failedScene.mapRuntime.cancelTransition();
failedScene.portalTransitionPresentation = null;
assert.deepEqual(
  failedScene.getProgressionSnapshot().worldTime,
  failedBefore,
  '완료되지 않거나 취소된 transition은 여행 비용을 확정하지 않아야 합니다.',
);

const storage = new MemoryStorage();
const persistence = new ProgressionStorage(storage, 'world-time-test', ENCHANTMENT_CATALOG);
const durable = {
  ...createProgressionSnapshot(DEFAULT_EQUIPMENT_PROFILE_ID),
  worldTime: afterTravel,
};
assert.equal(persistence.save(durable).ok, true);
const loaded = persistence.load(
  DEFAULT_EQUIPMENT_PROFILE_ID,
  [DEFAULT_EQUIPMENT_PROFILE_ID],
  ENCHANTMENT_CATALOG,
);
assert.equal(loaded.ok, true);
assert.deepEqual(loaded.snapshot.worldTime, afterTravel);

const legacyV2 = createProgressionSnapshot(DEFAULT_EQUIPMENT_PROFILE_ID);
storage.value = JSON.stringify({
  version: 2,
  trainingMarks: legacyV2.trainingMarks,
  ownedEquipmentIds: legacyV2.ownedEquipmentIds,
  equippedEquipmentId: legacyV2.equippedEquipmentId,
  combatSkillLevel: legacyV2.combatSkillLevel,
  firstJourney: legacyV2.firstJourney,
  regionExpansion: legacyV2.regionExpansion,
});
const migrated = persistence.load(
  DEFAULT_EQUIPMENT_PROFILE_ID,
  [DEFAULT_EQUIPMENT_PROFILE_ID],
  ENCHANTMENT_CATALOG,
);
assert.equal(migrated.ok, true);
assert.equal(migrated.kind, 'migrated');
assert.deepEqual(migrated.snapshot.worldTime, createWorldTimeSnapshot());

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'event-driven-world-time',
    checks: [
      'idle-and-technical-room-zero-cost',
      'authored-travel-segment-single-success-commit',
      'failed-transition-zero-cost',
      'core-event-extension-and-idempotence',
      'training-ko-and-shortcut-authored-costs',
      'same-context-deterministic-chunk-rebuild',
      'deadline-crisis-boundary',
      'v2-migration-and-v3-round-trip',
      'campaign-hud-independent-from-legacy-world-time-read-model',
    ],
  }),
);
