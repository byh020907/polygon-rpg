import assert from 'node:assert/strict';

import { SCRAP_AWAKENING_STAGE } from '../src/game/campaign/ScrapAwakeningState.js';
import { SCRAP_GARAGE_REVEAL_STAGE } from '../src/game/campaign/ScrapGarageRevealState.js';
import {
  SCRAP_AWAKENING_MAP,
  SCRAP_AWAKENING_REGION_ID,
  SCRAP_AWAKENING_ROOM_ID,
  SCRAP_MINE_ROAD_PORTAL_ID,
  SCRAP_MINE_ROAD_REGION_ID,
  SCRAP_MINE_ROAD_ROOM_ID,
  SCRAP_MINE_TUNNEL_ROOM_ID,
  SCRAP_MINE_MACHINE_ROOM_ID,
  SCRAP_SHIPYARD_ROAD_PORTAL_ID,
  SCRAP_SHIPYARD_REGION_ID,
  SCRAP_SHIPYARD_ROAD_ROOM_ID,
  SCRAP_SHIPYARD_DRYDOCK_ROOM_ID,
  SCRAP_SHIPYARD_CRANE_ROOM_ID,
} from '../src/game/maps/scrapAwakening.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
import { MobileInputAdapter } from '../src/input/MobileInputAdapter.js';

const STEP_SECONDS = 1 / 120;
const EMPTY_INPUT = Object.freeze({
  left: false,
  right: false,
  jump: false,
  guard: false,
  basicAttack: false,
  strongAttack: false,
  jumpSequence: 0,
  guardSequence: 0,
  basicAttackSequence: 0,
  strongAttackSequence: 0,
});

function input(overrides = {}) {
  return Object.freeze({ ...EMPTY_INPUT, ...overrides });
}

function createAwakeningScene({ progressionSnapshot = null, x = 740 } = {}) {
  const scene = createTestGameScene({
    mapDefinition: SCRAP_AWAKENING_MAP,
    ...(progressionSnapshot ? { progressionSnapshot } : {}),
  });
  scene.setVisualQaLocation({
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x,
  });
  return scene;
}

function itemIds(scene) {
  return scene.createRenderFrame(0).items.map((item) => item.id);
}

function stage(scene) {
  return scene.getWorldStatus().campaign.awakeningStageId;
}

function garageStage(scene) {
  return scene.getWorldStatus().campaign.garageRevealStageId;
}

function finishPortalTransition(scene) {
  for (let tick = 0; tick < 160 && scene.mapRuntime.getTransition(); tick += 1) {
    scene.update(STEP_SECONDS, EMPTY_INPUT);
  }
  assert.equal(
    scene.mapRuntime.getTransition(),
    null,
    'fixture portal transition이 완료되어야 합니다.',
  );
}

function completeDialogue(scene, sequence) {
  scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: sequence }));
  sequence += 1;
  assert.equal(scene.getWorldStatus().dialogue.active, true, '상호작용 대화가 시작되어야 합니다.');
  for (let safety = 0; safety < 20 && scene.getWorldStatus().dialogue.active; safety += 1) {
    scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: sequence }));
    sequence += 1;
  }
  assert.equal(scene.getWorldStatus().dialogue.active, false, '상호작용 대화가 끝나야 합니다.');
  return sequence;
}

function setAtCampaignInteraction(scene, roomId, stageKind) {
  const interaction = scene.mapRuntime
    .getResolvedSnapshot()
    .entities.find((entity) => entity.campaignStageKind === stageKind);
  assert.ok(interaction, `${roomId}에는 ${stageKind} interaction이 필요합니다.`);
  scene.setVisualQaLocation({
    regionId: interaction.campaignRegionId,
    roomId,
    x: interaction.position.x,
  });
  return interaction;
}

function setAtPortalToRoom(scene, sourceRoomId, destinationRoomId) {
  const active = scene.mapRuntime.getActiveLocation();
  assert.equal(active.roomId, sourceRoomId);
  const portal = scene.mapRuntime
    .getResolvedSnapshot()
    .portals.find(
      (candidate) =>
        candidate.from.roomId === destinationRoomId || candidate.to.roomId === destinationRoomId,
    );
  assert.ok(portal, `${sourceRoomId}에서 ${destinationRoomId}(으)로 가는 portal이 필요합니다.`);
  const endpoint = portal.from.roomId === sourceRoomId ? portal.from : portal.to;
  scene.setVisualQaLocation({
    regionId: active.regionId,
    roomId: sourceRoomId,
    x: endpoint.anchor.x,
  });
  return portal;
}

const scene = createAwakeningScene();
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.COMMISSION);
assert.equal(scene.getWorldStatus().operationMapAvailable, false);
assert.ok(itemIds(scene).includes('scrap-device-core'));
assert.ok(!itemIds(scene).includes('scrap-king-eye-left'));
const beforeInteraction = Object.freeze({ ...scene.position });

scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.deepEqual(
  scene.position,
  beforeInteraction,
  '제어장치 상호작용은 Player jump를 억제해야 합니다.',
);
assert.equal(scene.isGrounded, true);
assert.ok(!itemIds(scene).includes('scrap-device-core'));
assert.ok(
  scene.mapRuntime.getResolvedSnapshot().appliedPatchIds.includes('scrap-device-recovered'),
);

const afterRecovery = scene.getProgressionSnapshot();
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
assert.deepEqual(
  scene.getProgressionSnapshot(),
  afterRecovery,
  '같은 jump sequence는 제어장치 회수나 stage를 반복 확정하면 안 됩니다.',
);

const lockedX = scene.position.x;
for (let tick = 0; tick < 45; tick += 1) {
  scene.update(
    STEP_SECONDS,
    input({
      right: true,
      basicAttack: true,
      basicAttackSequence: 1,
    }),
  );
}
assert.equal(scene.position.x, lockedX, '각성 연출 중 이동 입력은 잠겨야 합니다.');
assert.equal(scene.combatCommands.snapshot().id, 'idle', '각성 연출 중 공격은 시작되면 안 됩니다.');
assert.ok(scene.cameraPosition.x > lockedX, '각성 연출 camera는 폐병기 쪽으로 이동해야 합니다.');

const observedStages = [stage(scene)];
let shakeObserved = false;
for (let tick = 0; tick < 1_200 && stage(scene) !== SCRAP_AWAKENING_STAGE.COMPLETE; tick += 1) {
  scene.update(STEP_SECONDS, EMPTY_INPUT);
  const currentStage = stage(scene);
  if (observedStages.at(-1) !== currentStage) observedStages.push(currentStage);
  const cameraOffset = scene.combatCameraFeedback.snapshot();
  if (Math.abs(cameraOffset.x) > 0.01 || Math.abs(cameraOffset.y) > 0.01) shakeObserved = true;
}
assert.deepEqual(observedStages, [
  SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
  SCRAP_AWAKENING_STAGE.EYES_LIT,
  SCRAP_AWAKENING_STAGE.ASSEMBLED,
  SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
  SCRAP_AWAKENING_STAGE.COMPLETE,
]);
assert.equal(shakeObserved, true, '눈 점등·부품 결합 경계는 camera shake를 남겨야 합니다.');
const completeStatus = scene.getWorldStatus();
assert.equal(completeStatus.campaign.deadlineRevealed, true);
assert.equal(completeStatus.campaign.hudLabel, 'Day 1 · 아침 · D-30');
assert.equal(completeStatus.journeyLabel, '각성 완료 · D-30 · 고물상 복귀');
assert.equal(garageStage(scene), SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY);
assert.match(completeStatus.objective, /왼쪽 고물상/);
assert.match(completeStatus.wardLabel, /분석 대기/);
assert.ok(itemIds(scene).includes('scrap-king-eye-left'));
assert.ok(itemIds(scene).includes('scrap-king-shoulder-left'));
assert.ok(itemIds(scene).includes('scrap-king-route-beacon'));

const completeX = scene.position.x;
scene.update(STEP_SECONDS, input({ right: true }));
assert.ok(scene.position.x > completeX, '각성 완료 뒤 이동 조작이 돌아와야 합니다.');

const resumed = createAwakeningScene({ progressionSnapshot: afterRecovery });
assert.equal(stage(resumed), SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.ok(!itemIds(resumed).includes('scrap-device-core'));
for (let tick = 0; tick < 120; tick += 1) resumed.update(STEP_SECONDS, EMPTY_INPUT);
assert.notEqual(
  stage(resumed),
  SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
  '저장된 stage는 reload 뒤 해당 경계부터 결정적으로 재생되어야 합니다.',
);

const completedReload = createAwakeningScene({
  progressionSnapshot: scene.getProgressionSnapshot(),
});
assert.equal(stage(completedReload), SCRAP_AWAKENING_STAGE.COMPLETE);
assert.ok(
  !completedReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-control-device'),
  '완료 reload 뒤 제어장치 trigger가 다시 생기면 안 됩니다.',
);
completedReload.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
assert.equal(stage(completedReload), SCRAP_AWAKENING_STAGE.COMPLETE);
assert.equal(completedReload.isGrounded, false, '완료 뒤 ↑는 다시 Player jump여야 합니다.');

for (let tick = 0; tick < 300 && scene.position.x > 255; tick += 1) {
  scene.update(STEP_SECONDS, input({ left: true }));
}
assert.ok(scene.position.x <= 255, '각성지에서 왼쪽 고물상 주인에게 직접 돌아갈 수 있어야 합니다.');
const durableGarageStages = [];
scene.progressionChanged.connect((snapshot) => {
  durableGarageStages.push(snapshot.scrapCampaign.garageRevealStageId);
});
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 2 }));
let ownerDialogue = scene.getWorldStatus().dialogue;
assert.equal(ownerDialogue.active, true);
assert.equal(ownerDialogue.speaker, '고물상 주인');
assert.equal(ownerDialogue.conversationId, 'scrapyard-owner-analysis');
assert.ok(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some(
      (entity) =>
        entity.id === 'scrapyard-owner-analysis' &&
        entity.presentationProfileId === 'scrapyard-owner',
    ),
  '고물상 주인은 authored 직업 silhouette profile을 사용해야 합니다.',
);
for (let jumpSequence = 3; jumpSequence <= 8; jumpSequence += 1) {
  scene.update(STEP_SECONDS, input({ jump: true, jumpSequence }));
}
assert.equal(garageStage(scene), SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS);
assert.equal(scene.getWorldStatus().dialogue.active, false);
assert.ok(itemIds(scene).includes('scrapyard-analysis-device-core'));
assert.ok(itemIds(scene).includes('scrapyard-device-analysis-beam'));
const garageRevealStartSnapshot = scene.getProgressionSnapshot();
const garageLockedX = scene.position.x;
for (let tick = 0; tick < 60; tick += 1) {
  scene.update(STEP_SECONDS, input({ right: true, strongAttack: true, strongAttackSequence: 2 }));
}
assert.equal(scene.position.x, garageLockedX, '차고 reveal 중 이동 입력은 잠겨야 합니다.');
assert.equal(
  scene.combatCommands.snapshot().id,
  'idle',
  '차고 reveal 중 공격은 시작되면 안 됩니다.',
);
assert.ok(
  scene.cameraPosition.x < 700,
  '차고 reveal camera는 고물상 작업대 쪽으로 이동해야 합니다.',
);

const observedGarageStages = [garageStage(scene)];
let garageShakeObserved = false;
for (
  let tick = 0;
  tick < 1_200 && garageStage(scene) !== SCRAP_GARAGE_REVEAL_STAGE.COMPLETE;
  tick += 1
) {
  scene.update(STEP_SECONDS, EMPTY_INPUT);
  const currentStage = garageStage(scene);
  if (observedGarageStages.at(-1) !== currentStage) observedGarageStages.push(currentStage);
  const cameraOffset = scene.combatCameraFeedback.snapshot();
  if (Math.abs(cameraOffset.x) > 0.01 || Math.abs(cameraOffset.y) > 0.01) {
    garageShakeObserved = true;
  }
}
assert.deepEqual(observedGarageStages, [
  SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS,
  SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED,
  SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED,
  SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
]);
assert.deepEqual(
  durableGarageStages,
  [
    SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS,
    SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED,
    SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED,
    SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
  ],
  '차고 reveal 각 stage 경계는 autosave용 durable progression event를 내야 합니다.',
);
assert.equal(garageShakeObserved, true, '지도 점등·차고 개방 경계는 camera shake를 남겨야 합니다.');
const garageCompleteStatus = scene.getWorldStatus();
assert.equal(garageCompleteStatus.operationMapAvailable, true);
assert.equal(garageCompleteStatus.campaign.completionPercent, 0);
assert.equal(garageCompleteStatus.journeyLabel, '작전 준비 완료 · 로봇 0%');
assert.equal(garageCompleteStatus.wardLabel, '제어장치 · 우리 로봇 두뇌 장착');
assert.match(garageCompleteStatus.objective, /벽 지도/);
for (const itemId of [
  'scrapyard-wall-map-frame',
  'scrapyard-wall-map-route',
  'garage-robot-frame-torso',
  'garage-robot-brain-core',
  'garage-robot-zero-label',
]) {
  assert.ok(itemIds(scene).includes(itemId), `${itemId}가 차고 reveal 뒤 보여야 합니다.`);
}
assert.ok(!itemIds(scene).includes('scrapyard-analysis-device-core'));
assert.ok(!itemIds(scene).includes('scrapyard-garage-door-left'));

let operationMapRequest = null;
scene.operationMapRequested.connect((request) => {
  operationMapRequest = request;
});
for (let tick = 0; tick < 40 && scene.position.x < 300; tick += 1) {
  scene.update(STEP_SECONDS, input({ right: true }));
}
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 9 }));
assert.equal(operationMapRequest?.source, 'scrapyard-wall-map');
assert.equal(operationMapRequest?.campaign.completionPercent, 0);
assert.equal(scene.isGrounded, true, '벽 지도 상호작용은 Player jump를 억제해야 합니다.');

const garageResumed = createAwakeningScene({
  progressionSnapshot: garageRevealStartSnapshot,
  x: 240,
});
assert.equal(garageStage(garageResumed), SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS);
assert.ok(itemIds(garageResumed).includes('scrapyard-analysis-device-core'));
for (let tick = 0; tick < 220; tick += 1) garageResumed.update(STEP_SECONDS, EMPTY_INPUT);
assert.notEqual(
  garageStage(garageResumed),
  SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS,
  '저장된 차고 reveal stage는 reload 뒤 해당 경계부터 결정적으로 재생되어야 합니다.',
);

const garageCompletedReload = createAwakeningScene({
  progressionSnapshot: scene.getProgressionSnapshot(),
  x: 300,
});
assert.equal(garageStage(garageCompletedReload), SCRAP_GARAGE_REVEAL_STAGE.COMPLETE);
assert.equal(garageCompletedReload.getWorldStatus().operationMapAvailable, true);
assert.ok(itemIds(garageCompletedReload).includes('garage-robot-brain-core'));
assert.ok(
  garageCompletedReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrapyard-wall-operation-map'),
  '완료 reload 뒤 벽 지도 interaction이 유지되어야 합니다.',
);

const failedTravelScene = createAwakeningScene({
  progressionSnapshot: scene.getProgressionSnapshot(),
  x: 1340,
});
const failedTravelBefore = failedTravelScene.getProgressionSnapshot().scrapCampaign;
failedTravelScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 10 }));
assert.equal(failedTravelScene.confirmScrapCampaignTravel().started, true);
const replaceFailedTravelRoom = failedTravelScene.replaceRoomScene.bind(failedTravelScene);
let failDestinationRoomOnce = true;
failedTravelScene.replaceRoomScene = (snapshot, options) => {
  if (failDestinationRoomOnce && snapshot.active.regionId === SCRAP_MINE_ROAD_REGION_ID) {
    failDestinationRoomOnce = false;
    throw new Error('fixture campaign destination room failure');
  }
  return replaceFailedTravelRoom(snapshot, options);
};
for (let tick = 0; tick < 120 && failedTravelScene.mapRuntime.getTransition(); tick += 1) {
  failedTravelScene.update(STEP_SECONDS, EMPTY_INPUT);
}
assert.deepEqual(failedTravelScene.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
});
assert.deepEqual(
  failedTravelScene.getProgressionSnapshot().scrapCampaign,
  failedTravelBefore,
  'destination Room 교체 실패는 campaign action을 commit하면 안 됩니다.',
);
assert.match(failedTravelScene.getWorldStatus().encounterHint, /Room 전환 실패/);

const travelScene = createAwakeningScene({
  progressionSnapshot: scene.getProgressionSnapshot(),
  x: 1340,
});
let campaignTravelRequest = null;
travelScene.campaignActionPreviewRequested.connect((request) => {
  campaignTravelRequest = request;
});
const beforeTravelPreview = travelScene.getProgressionSnapshot().scrapCampaign;
travelScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 10 }));
assert.equal(campaignTravelRequest?.source, 'long-distance-road-end');
assert.equal(campaignTravelRequest?.portalId, SCRAP_MINE_ROAD_PORTAL_ID);
assert.equal(campaignTravelRequest?.preview.targetLocationLabel, '폐광 산촌');
assert.equal(campaignTravelRequest?.preview.costSegments, 1);
assert.equal(campaignTravelRequest?.preview.before.phaseLabel, '아침');
assert.equal(campaignTravelRequest?.preview.after.phaseLabel, '낮');
assert.equal(campaignTravelRequest?.preview.rival.movementSegments, 1);
assert.deepEqual(
  travelScene.getProgressionSnapshot().scrapCampaign,
  beforeTravelPreview,
  'preview는 campaign 시간을 소비하면 안 됩니다.',
);
assert.equal(travelScene.cancelScrapCampaignTravel().cancelled, true);
assert.deepEqual(
  travelScene.getProgressionSnapshot().scrapCampaign,
  beforeTravelPreview,
  '취소는 campaign snapshot을 바꾸면 안 됩니다.',
);

campaignTravelRequest = null;
travelScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 11 }));
assert.equal(campaignTravelRequest?.preview.targetLocationLabel, '폐광 산촌');
assert.equal(travelScene.confirmScrapCampaignTravel().started, true);
for (let tick = 0; tick < 120 && travelScene.mapRuntime.getTransition(); tick += 1) {
  travelScene.update(STEP_SECONDS, EMPTY_INPUT);
}
assert.deepEqual(travelScene.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_ROAD_ROOM_ID,
});
const afterMineTravel = travelScene.getWorldStatus().campaign;
const mineRoadheadStatus = travelScene.getWorldStatus();
assert.equal(afterMineTravel.currentLocationId, 'abandoned-mine');
assert.equal(afterMineTravel.currentLocationLabel, '폐광 산촌');
assert.equal(afterMineTravel.phaseLabel, '낮');
assert.equal(afterMineTravel.deadlineLabel, 'D-30');
assert.equal(afterMineTravel.lastChangeLabel, '장거리 이동 · 폐광 산촌');
assert.equal(mineRoadheadStatus.story.beatId, 'scrap-region:abandoned-mine:roadhead');
assert.equal(mineRoadheadStatus.journeyLabel, '폐광 산촌 · 사건 대기');
assert.match(mineRoadheadStatus.encounterHint, /붕괴 광산 구조와 굴착기 인수/);
assert.doesNotMatch(
  `${mineRoadheadStatus.story.title} ${mineRoadheadStatus.objective} ${mineRoadheadStatus.wardLabel}`,
  /학원|교관|마법 생물/,
  '고철 캠페인 목적지에서 Academy story fallback이 노출되면 안 됩니다.',
);
assert.ok(itemIds(travelScene).includes('mine-roadhead-warning-post'));

const mineFlowScene = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: travelScene.getProgressionSnapshot(),
});
let mineJumpSequence = 30;
let mineEventRequest = null;
mineFlowScene.campaignActionPreviewRequested.connect((request) => {
  if (request.source === 'region-core-event') mineEventRequest = request;
});
mineFlowScene.setVisualQaLocation({
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_ROAD_ROOM_ID,
  x: 667,
});
mineJumpSequence = completeDialogue(mineFlowScene, mineJumpSequence);
let mineRegion = mineFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === 'abandoned-mine');
assert.equal(mineRegion.eventStageKind, 'npc-briefing');
assert.ok(
  mineFlowScene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'mine-facility-inspection'),
);

mineFlowScene.setVisualQaLocation({
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_ROAD_ROOM_ID,
  x: 889,
});
const beforeMineEventPreview = mineFlowScene.getProgressionSnapshot().scrapCampaign;
mineJumpSequence = completeDialogue(mineFlowScene, mineJumpSequence);
assert.equal(mineEventRequest?.source, 'region-core-event');
assert.equal(mineEventRequest?.preview.costSegments, 10);
assert.equal(mineEventRequest?.preview.successExtensionDays, 2);
assert.equal(mineEventRequest?.preview.before.phaseLabel, '낮');
assert.deepEqual(
  mineFlowScene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
  beforeMineEventPreview.elapsedSegments,
  '지역 사건 preview는 시간을 소비하면 안 됩니다.',
);
assert.equal(mineFlowScene.cancelScrapCampaignAction().cancelled, true);

mineEventRequest = null;
mineJumpSequence = completeDialogue(mineFlowScene, mineJumpSequence);
assert.equal(mineEventRequest?.preview.costSegments, 10);
assert.equal(mineFlowScene.confirmScrapCampaignAction().started, true);
mineRegion = mineFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === 'abandoned-mine');
assert.equal(mineRegion.status, 'in-progress');
assert.equal(mineFlowScene.getWorldStatus().campaign.phaseLabel, '밤');
assert.equal(mineFlowScene.getWorldStatus().campaign.deadlineLabel, 'D-28');
assert.ok(
  mineFlowScene.mapRuntime
    .getResolvedSnapshot()
    .portals.some((portal) => portal.id === 'mine-roadhead-tunnel-portal'),
);

mineFlowScene.setVisualQaLocation({
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_ROAD_ROOM_ID,
  x: 1346,
});
mineFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: mineJumpSequence }));
mineJumpSequence += 1;
finishPortalTransition(mineFlowScene);
assert.deepEqual(mineFlowScene.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_TUNNEL_ROOM_ID,
});
assert.equal(
  mineFlowScene.roomSceneNode.getEncounterGameplaySnapshot().profileId,
  'mine-tunnel-collector',
);
mineFlowScene.enterTree();
mineFlowScene.roomSceneNode.encounter.completeForVisualQa();
mineRegion = mineFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === 'abandoned-mine');
assert.equal(mineRegion.eventStageKind, 'journey-combat');

mineFlowScene.setVisualQaLocation({
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_TUNNEL_ROOM_ID,
  x: 1366,
});
mineFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: mineJumpSequence }));
mineJumpSequence += 1;
finishPortalTransition(mineFlowScene);
assert.deepEqual(mineFlowScene.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_MACHINE_ROOM_ID,
});
const mineBoss = mineFlowScene.roomSceneNode.getEncounterGameplaySnapshot();
assert.equal(mineBoss.profileId, 'mine-collapse-boss');
assert.equal(mineBoss.presentationProfileId, 'mine-collapse-boss');
assert.equal(mineBoss.weakPoint.label, '노출된 편심 구동축');
mineFlowScene.roomSceneNode.encounter.completeForVisualQa();

mineFlowScene.setVisualQaLocation({
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_MACHINE_ROOM_ID,
  x: 382,
});
mineJumpSequence = completeDialogue(mineFlowScene, mineJumpSequence);
assert.ok(itemIds(mineFlowScene).includes('mine-replacement-brace'));
mineFlowScene.setVisualQaLocation({
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_MACHINE_ROOM_ID,
  x: 870,
});
mineJumpSequence = completeDialogue(mineFlowScene, mineJumpSequence);
assert.ok(itemIds(mineFlowScene).includes('mine-walker-part-signal'));
mineFlowScene.setVisualQaLocation({
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_MACHINE_ROOM_ID,
  x: 1110,
});
completeDialogue(mineFlowScene, mineJumpSequence);
const mineCompleteCampaign = mineFlowScene.getWorldStatus().campaign;
mineRegion = mineCompleteCampaign.regions.find((region) => region.id === 'abandoned-mine');
assert.equal(mineRegion.status, 'resolved');
assert.equal(mineRegion.eventStageKind, 'campaign-updated');
assert.equal(mineRegion.collected, true);
assert.equal(mineCompleteCampaign.collectedPartCount, 1);
assert.equal(mineCompleteCampaign.completionPercent, 20);
assert.equal(mineCompleteCampaign.phaseLabel, '밤');
assert.equal(mineCompleteCampaign.deadlineLabel, 'D-30');
assert.equal(mineCompleteCampaign.rivalDelaySegments, 8);
assert.match(mineFlowScene.getWorldStatus().objective, /고물상.*20%/);
const completedMineProgression = mineFlowScene.getProgressionSnapshot();
mineFlowScene.exitTree();

const completedMineReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: completedMineProgression,
});
const reloadedMineRegion = completedMineReload
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === 'abandoned-mine');
assert.equal(reloadedMineRegion.status, 'resolved');
assert.equal(reloadedMineRegion.collected, true);
assert.equal(completedMineReload.getWorldStatus().campaign.collectedPartCount, 1);
completedMineReload.setVisualQaLocation({
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
  x: 480,
});
assert.ok(itemIds(completedMineReload).includes('garage-robot-walker-leg-left'));
assert.ok(itemIds(completedMineReload).includes('garage-robot-twenty-label'));
assert.ok(!itemIds(completedMineReload).includes('garage-robot-zero-label'));
assert.equal(completedMineReload.getWorldStatus().journeyLabel, '차고 조립 갱신 · 로봇 20%');
assert.match(completedMineReload.getWorldStatus().encounterHint, /1\/5 PARTS · ROBOT 20%/);
assert.equal(completedMineReload.getWorldStatus().wardLabel, '1/5 부품 · 로봇 20%');

const shipyardFlowScene = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: completedMineProgression,
});
let shipyardJumpSequence = 100;
let shipyardCampaignRequest = null;
shipyardFlowScene.campaignActionPreviewRequested.connect((request) => {
  shipyardCampaignRequest = request;
});
setAtPortalToRoom(shipyardFlowScene, SCRAP_MINE_ROAD_ROOM_ID, SCRAP_AWAKENING_ROOM_ID);
shipyardFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: shipyardJumpSequence }));
shipyardJumpSequence += 1;
assert.equal(shipyardCampaignRequest?.preview.targetLocationLabel, '동네 고물상');
assert.equal(shipyardFlowScene.confirmScrapCampaignTravel().started, true);
finishPortalTransition(shipyardFlowScene);
assert.equal(
  shipyardFlowScene.getWorldStatus().campaign.currentLocationId,
  'neighborhood-scrapyard',
);

shipyardCampaignRequest = null;
setAtPortalToRoom(shipyardFlowScene, SCRAP_AWAKENING_ROOM_ID, SCRAP_SHIPYARD_ROAD_ROOM_ID);
shipyardFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: shipyardJumpSequence }));
shipyardJumpSequence += 1;
assert.equal(shipyardCampaignRequest?.portalId, SCRAP_SHIPYARD_ROAD_PORTAL_ID);
assert.equal(shipyardCampaignRequest?.preview.targetLocationLabel, '항구 조선소');
assert.equal(shipyardCampaignRequest?.preview.costSegments, 1);
assert.equal(shipyardFlowScene.confirmScrapCampaignTravel().started, true);
finishPortalTransition(shipyardFlowScene);
assert.deepEqual(shipyardFlowScene.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_SHIPYARD_REGION_ID,
  roomId: SCRAP_SHIPYARD_ROAD_ROOM_ID,
});
assert.equal(shipyardFlowScene.getWorldStatus().campaign.currentLocationId, 'harbor-shipyard');
assert.match(shipyardFlowScene.getWorldStatus().objective, /조선소 용접공/);
assert.doesNotMatch(
  `${shipyardFlowScene.getWorldStatus().story.title} ${shipyardFlowScene.getWorldStatus().objective}`,
  /학원|교관|마법 생물/,
);

setAtCampaignInteraction(shipyardFlowScene, SCRAP_SHIPYARD_ROAD_ROOM_ID, 'npc-briefing');
shipyardJumpSequence = completeDialogue(shipyardFlowScene, shipyardJumpSequence);
let shipyardRegion = shipyardFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_SHIPYARD_REGION_ID);
assert.equal(shipyardRegion.eventStageKind, 'npc-briefing');
assert.match(shipyardFlowScene.getWorldStatus().objective, /14구간/);

setAtCampaignInteraction(shipyardFlowScene, SCRAP_SHIPYARD_ROAD_ROOM_ID, 'facility-observed');
const beforeShipyardEvent = shipyardFlowScene.getProgressionSnapshot().scrapCampaign;
shipyardJumpSequence = completeDialogue(shipyardFlowScene, shipyardJumpSequence);
assert.equal(shipyardCampaignRequest?.source, 'region-core-event');
assert.equal(shipyardCampaignRequest?.preview.costSegments, 14);
assert.equal(shipyardCampaignRequest?.preview.successExtensionDays, 3);
assert.equal(
  shipyardFlowScene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
  beforeShipyardEvent.elapsedSegments,
  '항구 핵심 사건 preview는 확정 전 시간을 소비하면 안 됩니다.',
);
assert.equal(shipyardFlowScene.cancelScrapCampaignAction().cancelled, true);

shipyardJumpSequence = completeDialogue(shipyardFlowScene, shipyardJumpSequence);
assert.equal(shipyardFlowScene.confirmScrapCampaignAction().started, true);
shipyardRegion = shipyardFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_SHIPYARD_REGION_ID);
assert.equal(shipyardRegion.status, 'in-progress');
assert.equal(shipyardFlowScene.getWorldStatus().campaign.phaseLabel, '밤');
assert.equal(shipyardFlowScene.getWorldStatus().campaign.deadlineLabel, 'D-26');

setAtPortalToRoom(shipyardFlowScene, SCRAP_SHIPYARD_ROAD_ROOM_ID, SCRAP_SHIPYARD_DRYDOCK_ROOM_ID);
shipyardFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: shipyardJumpSequence }));
shipyardJumpSequence += 1;
finishPortalTransition(shipyardFlowScene);
assert.equal(
  shipyardFlowScene.roomSceneNode.getEncounterGameplaySnapshot().profileId,
  'shipyard-drydock-collector',
);
shipyardFlowScene.enterTree();
shipyardFlowScene.roomSceneNode.encounter.completeForVisualQa();
shipyardRegion = shipyardFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_SHIPYARD_REGION_ID);
assert.equal(shipyardRegion.eventStageKind, 'journey-combat');
const shipyardMidReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: shipyardFlowScene.getProgressionSnapshot(),
});
shipyardMidReload.setVisualQaLocation({
  regionId: SCRAP_SHIPYARD_REGION_ID,
  roomId: SCRAP_SHIPYARD_DRYDOCK_ROOM_ID,
  x: 800,
});
assert.equal(
  shipyardMidReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'shipyard-drydock-collector-unit'),
  false,
  '건선거 전투 완료 reload는 수거 유닛을 되살리면 안 됩니다.',
);
assert.ok(
  shipyardMidReload.mapRuntime
    .getResolvedSnapshot()
    .portals.some((portal) => portal.to.roomId === SCRAP_SHIPYARD_CRANE_ROOM_ID),
);

setAtPortalToRoom(shipyardFlowScene, SCRAP_SHIPYARD_DRYDOCK_ROOM_ID, SCRAP_SHIPYARD_CRANE_ROOM_ID);
shipyardFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: shipyardJumpSequence }));
shipyardJumpSequence += 1;
finishPortalTransition(shipyardFlowScene);
const shipyardBoss = shipyardFlowScene.roomSceneNode.getEncounterGameplaySnapshot();
assert.equal(shipyardBoss.profileId, 'shipyard-twin-crane-boss');
assert.equal(shipyardBoss.presentationProfileId, 'shipyard-twin-crane-boss');
assert.match(shipyardBoss.weakPoint.label, /유압|회전축|케이블/);
shipyardFlowScene.roomSceneNode.encounter.completeForVisualQa();

setAtCampaignInteraction(shipyardFlowScene, SCRAP_SHIPYARD_CRANE_ROOM_ID, 'replacement-complete');
shipyardJumpSequence = completeDialogue(shipyardFlowScene, shipyardJumpSequence);
assert.ok(itemIds(shipyardFlowScene).includes('shipyard-last-ship-patch'));
setAtCampaignInteraction(shipyardFlowScene, SCRAP_SHIPYARD_CRANE_ROOM_ID, 'machine-separated');
shipyardJumpSequence = completeDialogue(shipyardFlowScene, shipyardJumpSequence);
assert.ok(itemIds(shipyardFlowScene).includes('shipyard-hydraulics-signal'));
setAtCampaignInteraction(shipyardFlowScene, SCRAP_SHIPYARD_CRANE_ROOM_ID, 'part-claimed');
completeDialogue(shipyardFlowScene, shipyardJumpSequence);

const shipyardCompleteCampaign = shipyardFlowScene.getWorldStatus().campaign;
shipyardRegion = shipyardCompleteCampaign.regions.find(
  (region) => region.id === SCRAP_SHIPYARD_REGION_ID,
);
assert.equal(shipyardRegion.status, 'resolved');
assert.equal(shipyardRegion.eventStageKind, 'campaign-updated');
assert.equal(shipyardRegion.collected, true);
assert.equal(shipyardCompleteCampaign.collectedPartCount, 2);
assert.equal(shipyardCompleteCampaign.completionPercent, 40);
assert.equal(shipyardCompleteCampaign.deadlineLabel, 'D-29');
assert.equal(shipyardCompleteCampaign.rivalDelaySegments, 12);
const completedShipyardProgression = shipyardFlowScene.getProgressionSnapshot();
shipyardFlowScene.exitTree();

const completedShipyardReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: completedShipyardProgression,
});
completedShipyardReload.setVisualQaLocation({
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
  x: 480,
});
for (const expectedItemId of [
  'garage-robot-walker-leg-left',
  'garage-robot-crane-arm-left',
  'garage-robot-crane-arm-right',
  'garage-robot-forty-label',
]) {
  assert.ok(itemIds(completedShipyardReload).includes(expectedItemId), expectedItemId);
}
assert.ok(!itemIds(completedShipyardReload).includes('garage-robot-twenty-label'));
assert.equal(completedShipyardReload.getWorldStatus().wardLabel, '2/5 부품 · 로봇 40%');
const beforeRepeatedShipyardClaim = completedShipyardReload.getProgressionSnapshot();
completedShipyardReload.setVisualQaLocation({
  regionId: SCRAP_SHIPYARD_REGION_ID,
  roomId: SCRAP_SHIPYARD_CRANE_ROOM_ID,
  x: 1120,
});
assert.equal(
  completedShipyardReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'shipyard-hydraulics-part-claim'),
  false,
  '완료 reload 뒤 부품 회수 trigger는 다시 활성화되면 안 됩니다.',
);
completedShipyardReload.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1_000 }));
assert.deepEqual(
  completedShipyardReload.getProgressionSnapshot(),
  beforeRepeatedShipyardClaim,
  '완료 reload의 반복 interaction은 부품·시간·보상을 바꾸면 안 됩니다.',
);

const mineReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: travelScene.getProgressionSnapshot(),
});
assert.deepEqual(mineReload.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_MINE_ROAD_REGION_ID,
  roomId: SCRAP_MINE_ROAD_ROOM_ID,
});
assert.equal(mineReload.getWorldStatus().campaign.currentLocationId, 'abandoned-mine');
assert.equal(mineReload.getWorldStatus().story.beatId, 'scrap-region:abandoned-mine:roadhead');
assert.ok(itemIds(mineReload).includes('mine-roadhead-return-sign'));

campaignTravelRequest = null;
travelScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 12 }));
assert.equal(campaignTravelRequest?.preview.targetLocationLabel, '동네 고물상');
assert.equal(campaignTravelRequest?.preview.before.phaseLabel, '낮');
assert.equal(campaignTravelRequest?.preview.after.phaseLabel, '저녁');
assert.equal(travelScene.confirmScrapCampaignTravel().started, true);
for (let tick = 0; tick < 120 && travelScene.mapRuntime.getTransition(); tick += 1) {
  travelScene.update(STEP_SECONDS, EMPTY_INPUT);
}
assert.deepEqual(travelScene.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
});
assert.equal(travelScene.getWorldStatus().campaign.currentLocationId, 'neighborhood-scrapyard');
assert.equal(travelScene.getWorldStatus().campaign.phaseLabel, '저녁');

const keyboardScene = createAwakeningScene();
const keyboard = new KeyboardInputAdapter({ isActive: () => true });
keyboard.onKeyDown({ code: 'ArrowUp', target: { closest: () => null }, preventDefault() {} });
keyboardScene.update(STEP_SECONDS, keyboard.snapshot());
const mobileScene = createAwakeningScene();
const mobile = new MobileInputAdapter();
mobile.press('jump', 17);
mobileScene.update(STEP_SECONDS, mobile.snapshot());
assert.equal(stage(keyboardScene), SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.equal(stage(mobileScene), SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.deepEqual(
  {
    keyboardStage: stage(keyboardScene),
    keyboardGrounded: keyboardScene.isGrounded,
    mobileStage: stage(mobileScene),
    mobileGrounded: mobileScene.isGrounded,
  },
  {
    keyboardStage: SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
    keyboardGrounded: true,
    mobileStage: SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
    mobileGrounded: true,
  },
  'keyboard와 touch jump는 같은 회수 결과와 jump suppression을 만들어야 합니다.',
);

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'scrap-awakening-runtime',
    checks: [
      'device-proximity-jump-consumption',
      'stage-patch-and-repeat-trigger-idempotence',
      'input-lock-and-camera-cue',
      'eye-assembly-shake-d30-sequence',
      'control-restored-after-complete',
      'stage-boundary-reload-resume',
      'completed-reload-no-retrigger',
      'owner-dialogue-analysis-map-garage-zero-percent-sequence',
      'garage-reveal-input-lock-camera-and-reload-resume',
      'wall-map-operation-command-and-completed-reload',
      'failed-campaign-room-transition-zero-time-rollback',
      'road-end-preview-cancel-confirm-and-bidirectional-campaign-commit',
      'mine-eight-stage-npc-facility-combat-boss-machine-part-flow',
      'mine-event-preview-cost-success-extension-and-cancel-zero-cost',
      'mine-part-reload-idempotence-and-garage-twenty-percent',
      'shipyard-eight-stage-worker-drydock-crane-machine-part-flow',
      'shipyard-event-preview-fourteen-segments-three-day-extension-and-cancel',
      'shipyard-midstage-and-part-reload-idempotence-and-garage-forty-percent',
      'keyboard-touch-interaction-parity',
    ],
  }),
);
