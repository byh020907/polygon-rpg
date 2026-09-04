import assert from 'node:assert/strict';

import {
  SCRAP_AWAKENING_STAGE,
  getScrapAwakeningPresentation,
} from '../src/game/campaign/ScrapAwakeningState.js';
import { SCRAP_CAST } from '../src/game/campaign/ScrapCastProfile.js';
import { SCRAP_GARAGE_REVEAL_STAGE } from '../src/game/campaign/ScrapGarageRevealState.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';
import {
  SCRAP_PROLOGUE_CONVERSATION_ID,
  resolveScrapPrologueConversationTranscripts,
} from '../src/game/story/ScrapPrologueStory.js';
import {
  SCRAP_AWAKENING_MAP,
  SCRAP_AWAKENING_REGION_ID,
  SCRAP_AWAKENING_ROOM_ID,
  SCRAPYARD_REST_ENTITY_ID,
  SCRAP_RIVAL_APPROACH_GUIDE_ENTITY_ID,
  SCRAP_PLAYER_SEARCH_NOTICE_ENTITY_ID,
  SCRAP_RIVAL_SEARCH_ENTITY_ID,
  SCRAP_RIVAL_RESCUE_ENTITY_ID,
  SCRAP_PLAYER_DECISION_ENTITY_ID,
  SCRAPYARD_OWNER_ENTITY_ID,
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
  SCRAP_GREENHOUSE_ROAD_PORTAL_ID,
  SCRAP_GREENHOUSE_REGION_ID,
  SCRAP_GREENHOUSE_ROAD_ROOM_ID,
  SCRAP_GREENHOUSE_PIPE_ROOM_ID,
  SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
  SCRAP_SNOW_ROAD_PORTAL_ID,
  SCRAP_SNOW_REGION_ID,
  SCRAP_SNOW_ROAD_ROOM_ID,
  SCRAP_SNOW_TUNNEL_ROOM_ID,
  SCRAP_SNOW_TRAIN_ROOM_ID,
  SCRAP_QUARRY_ROAD_PORTAL_ID,
  SCRAP_QUARRY_REGION_ID,
  SCRAP_QUARRY_ROAD_ROOM_ID,
  SCRAP_QUARRY_CUT_ROOM_ID,
  SCRAP_QUARRY_CUTTER_ROOM_ID,
} from '../src/game/maps/scrapAwakening.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
import { MobileInputAdapter } from '../src/input/MobileInputAdapter.js';
import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';

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

function completeActiveLinkedIssuesForRegion(scene, regionId) {
  const primaryIssue = SCRAP_CAMPAIGN_PROFILE.getPrimaryIssueForRegion(regionId);
  scene.setVisualQaScrapIssueState({
    activePrimaryIssueId: primaryIssue.id,
    completedIssueIds: primaryIssue.linkedIssues.map((issue) => issue.id),
  });
}

function setAtStoryInteraction(scene, interactionId) {
  const interaction = scene.mapRuntime
    .getResolvedSnapshot()
    .entities.find((entity) => entity.id === interactionId);
  assert.ok(interaction, `${interactionId} story interaction이 현재 stage에 필요합니다.`);
  const active = scene.mapRuntime.getActiveLocation();
  scene.setVisualQaLocation({
    regionId: active.regionId,
    roomId: active.roomId,
    x: interaction.position.x,
  });
  return interaction;
}

function setAtRecoveryCamp(scene) {
  const restSpot = scene.mapRuntime
    .getResolvedSnapshot()
    .entities.find((entity) => entity.id === SCRAPYARD_REST_ENTITY_ID);
  assert.ok(restSpot, '차고 개방 뒤 완전 회복 야전 침상이 필요합니다.');
  scene.setVisualQaLocation({
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: restSpot.position.x,
  });
  return restSpot;
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

function mapEntityLines(entityId) {
  for (const region of SCRAP_AWAKENING_MAP.regions ?? []) {
    for (const room of region.rooms ?? []) {
      for (const entity of room.entities ?? []) {
        if (entity.id === entityId) return entity.lines;
      }
    }
  }
  assert.fail(`${entityId} map entity가 필요합니다.`);
}

const prologueTranscriptById = new Map(
  resolveScrapPrologueConversationTranscripts([
    SCRAP_PROLOGUE_CONVERSATION_ID.YARD_SEARCH,
    SCRAP_PROLOGUE_CONVERSATION_ID.RIVAL_RESCUE,
    SCRAP_PROLOGUE_CONVERSATION_ID.PLAYER_DECISION,
    SCRAP_PROLOGUE_CONVERSATION_ID.OWNER_ANALYSIS,
  ]).map((entry) => [entry.id, entry]),
);

function assertMapEntityLinesMatchTranscript(entityId, conversationId) {
  const transcript = prologueTranscriptById.get(conversationId);
  assert.ok(transcript, `${conversationId} authored transcript가 필요합니다.`);
  assert.deepEqual(
    [...mapEntityLines(entityId)],
    [...transcript.lines],
    `${entityId} 현장 대사는 authored transcript와 같아야 합니다.`,
  );
}

assertMapEntityLinesMatchTranscript(
  SCRAP_RIVAL_SEARCH_ENTITY_ID,
  SCRAP_PROLOGUE_CONVERSATION_ID.YARD_SEARCH,
);
assertMapEntityLinesMatchTranscript(
  SCRAP_RIVAL_RESCUE_ENTITY_ID,
  SCRAP_PROLOGUE_CONVERSATION_ID.RIVAL_RESCUE,
);
assertMapEntityLinesMatchTranscript(
  SCRAP_PLAYER_DECISION_ENTITY_ID,
  SCRAP_PROLOGUE_CONVERSATION_ID.PLAYER_DECISION,
);
assertMapEntityLinesMatchTranscript(
  SCRAPYARD_OWNER_ENTITY_ID,
  SCRAP_PROLOGUE_CONVERSATION_ID.OWNER_ANALYSIS,
);

const rescueDialogueText = mapEntityLines(SCRAP_RIVAL_RESCUE_ENTITY_ID).join('\n');
assert.match(rescueDialogueText, /회수팔/);
assert.match(rescueDialogueText, /빼야 멈출/);
assert.doesNotMatch(rescueDialogueText, /winch|전원만 들어오면/);
const playerDecisionText = mapEntityLines(SCRAP_PLAYER_DECISION_ENTITY_ID).join('\n');
assert.match(playerDecisionText, /제어핵을 빼면/);
assert.doesNotMatch(playerDecisionText, /winch에 연결/);
const ownerAnalysisText = mapEntityLines(SCRAPYARD_OWNER_ENTITY_ID).join('\n');
assert.match(ownerAnalysisText, /위치를 보내지 않는 수동 제어핵/);
assert.match(ownerAnalysisText, /중앙 지휘소 좌표/);
const collapseBriefing = getScrapAwakeningPresentation(SCRAP_AWAKENING_STAGE.COLLAPSE).briefing;
assert.match(collapseBriefing, /회수팔/);
assert.match(collapseBriefing, /끌고 가/);
const rescueBriefing = getScrapAwakeningPresentation(SCRAP_AWAKENING_STAGE.RESCUE_REQUEST).briefing;
assert.match(rescueBriefing, /회수팔/);
assert.match(rescueBriefing, /빼야 멈춘/);
assert.doesNotMatch(rescueBriefing, /winch.*전원/);

const scene = createAwakeningScene();
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.COMMISSION);
assert.equal(scene.getWorldStatus().operationMapAvailable, false);
assert.ok(!itemIds(scene).includes('scrap-device-core'));
assert.ok(!itemIds(scene).includes('scrap-king-eye-left'));
assert.ok(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrapyard-owner-commission'),
);

let prologueSequence = 1;
setAtStoryInteraction(scene, 'scrapyard-owner-commission');
prologueSequence = completeDialogue(scene, prologueSequence);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.RIVAL_DEPARTURE);
assert.ok(itemIds(scene).includes('scrap-rival-departure-torso'));

setAtStoryInteraction(scene, 'scrap-rival-departure');
prologueSequence = completeDialogue(scene, prologueSequence);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.YARD_CLEARANCE);
assert.ok(itemIds(scene).includes('scrap-rival-search-hook'));
assert.ok(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-yard-scout-collector'),
  `${SCRAP_CAST.RIVAL.name}과 수거장에 들어간 뒤에는 현장 조사를 막는 소형 수거 유닛이 필요합니다.`,
);
assert.equal(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-rival-yard-search'),
  false,
  '수거 유닛을 정리하기 전에는 붕괴를 일으키는 현장 조사를 시작하면 안 됩니다.',
);

scene.setVisualQaLocation({
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
  x: 500,
});
scene.update(STEP_SECONDS, input({ right: true }));
const ambientDialogue = scene.getWorldStatus().dialogue;
assert.equal(
  ambientDialogue.active,
  true,
  '동행 중 짧은 ambient 말풍선이 자동으로 시작되어야 합니다.',
);
assert.equal(ambientDialogue.presentationMode, 'ambient');
assert.equal(ambientDialogue.prompt, '이동 중 대화');
const ambientStartX = scene.position.x;
scene.update(STEP_SECONDS, input({ right: true, jump: true, jumpSequence: prologueSequence }));
prologueSequence += 1;
assert.ok(
  scene.position.x > ambientStartX,
  'ambient 말풍선은 이동과 jump 입력을 잠그면 안 됩니다.',
);
assert.equal(
  scene.getWorldStatus().dialogue.active,
  true,
  '이동 input은 ambient 말풍선을 닫으면 안 됩니다.',
);
for (let tick = 0; tick < 1_200 && scene.getWorldStatus().dialogue.active; tick += 1) {
  scene.update(STEP_SECONDS, EMPTY_INPUT);
}
assert.equal(
  scene.getWorldStatus().dialogue.active,
  false,
  'ambient 말풍선은 입력 없이 짧게 종료되어야 합니다.',
);
const ambientQaRequest = readVisualQaRequest(
  '?visualQa=1&gameStart=scrap-intro-walk&visualQaRenderer=polygon&visualQaPhase=active',
);
assert.equal(ambientQaRequest.scenario.mapId, SCRAP_AWAKENING_MAP.id);

scene.replaceRoomScene(scene.mapRuntime.getResolvedSnapshot(), { forceReplace: true });
assert.equal(
  scene.roomSceneNode.getEncounterGameplaySnapshot().profileId,
  'yard-scout-collector',
  '도입 수거장에는 기존 기본기 grammar를 배우는 산업 수거 유닛이 필요합니다.',
);
scene.resolveJourneyEncounter(
  Object.freeze({
    entityId: 'scrap-yard-scout-collector',
    scrapAwakeningNextStageId: SCRAP_AWAKENING_STAGE.YARD_BRACE,
  }),
);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.YARD_BRACE);
assert.equal(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-yard-scout-collector'),
  false,
  '전투 완료 뒤 수거 유닛은 같은 stage에서 다시 나타나면 안 됩니다.',
);
assert.ok(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-rival-yard-brace'),
  `첫 전투 뒤에는 ${SCRAP_CAST.RIVAL.name}과 안전 지지대를 점검해야 합니다.`,
);
const clearanceReload = createAwakeningScene({
  progressionSnapshot: scene.getProgressionSnapshot(),
});
assert.equal(stage(clearanceReload), SCRAP_AWAKENING_STAGE.YARD_BRACE);
assert.equal(
  clearanceReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-yard-scout-collector'),
  false,
  '도입 전투 완료 저장을 다시 열어도 조우를 반복해서 확정하면 안 됩니다.',
);

setAtStoryInteraction(scene, 'scrap-rival-yard-brace');
prologueSequence = completeDialogue(scene, prologueSequence);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.YARD_PERIMETER);
assert.equal(
  scene.roomSceneNode.getEncounterGameplaySnapshot().profileId,
  'yard-brace-collector',
  '안전 지지대를 점검한 뒤에는 guard/Strong을 연습할 두 번째 수거 유닛이 필요합니다.',
);
scene.resolveJourneyEncounter(
  Object.freeze({
    entityId: 'scrap-yard-brace-collector',
    scrapAwakeningNextStageId: SCRAP_AWAKENING_STAGE.YARD_SURVEY,
  }),
);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.YARD_SURVEY);
assert.equal(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-yard-brace-collector'),
  false,
  '두 번째 수거 유닛도 저장 가능한 완료 stage 뒤에는 다시 나타나면 안 됩니다.',
);
assert.ok(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-rival-yard-survey'),
  `두 번째 전투 뒤에는 ${SCRAP_CAST.RIVAL.name}과 끊긴 winch를 점검해야 합니다.`,
);
assert.equal(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-rival-yard-search'),
  false,
  'winch 점검 전에는 안쪽 현장 조사를 시작하면 안 됩니다.',
);
assert.ok(itemIds(scene).includes('scrap-yard-winch-base'));
assert.ok(itemIds(scene).includes('scrap-yard-winch-base-mark'));
assert.ok(itemIds(scene).includes('scrap-yard-chest-plate-mark'));
assert.ok(
  itemIds(scene).includes('scrap-retrieval-arm-dormant-upper'),
  'winch 점검 단계부터 접힌 자동 회수팔이 보여야 합니다.',
);
assert.ok(itemIds(scene).includes('scrap-retrieval-arm-dormant-forearm'));
assert.ok(itemIds(scene).includes('scrap-retrieval-arm-dormant-claw'));
assert.equal(
  itemIds(scene).includes('scrap-retrieval-arm-grab-claw'),
  false,
  '붕괴 전에는 회수팔 포획 자세를 보여주면 안 됩니다.',
);
const perimeterReload = createAwakeningScene({
  progressionSnapshot: scene.getProgressionSnapshot(),
});
assert.equal(stage(perimeterReload), SCRAP_AWAKENING_STAGE.YARD_SURVEY);
assert.equal(
  perimeterReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-yard-brace-collector'),
  false,
  '두 번째 도입 전투 완료 저장도 조우를 반복해서 확정하면 안 됩니다.',
);
assert.ok(itemIds(perimeterReload).includes('scrap-yard-winch-base'));

setAtStoryInteraction(scene, 'scrap-rival-yard-survey');
prologueSequence = completeDialogue(scene, prologueSequence);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.YARD_APPROACH);
assert.equal(
  scene.roomSceneNode.getEncounterGameplaySnapshot().profileId,
  'yard-approach-collector',
  'winch 점검 뒤에는 흉곽 안쪽 경계를 막는 세 번째 수거 유닛이 필요합니다.',
);
assert.equal(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-rival-yard-search'),
  false,
  '경계 수거 유닛을 정리하기 전에는 안쪽 현장 조사를 시작하면 안 됩니다.',
);
assert.ok(itemIds(scene).includes('scrap-yard-winch-base'));
assert.ok(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === SCRAP_RIVAL_APPROACH_GUIDE_ENTITY_ID),
  `winch 점검 뒤 흉곽 경계로 이동하는 동안 ${SCRAP_CAST.RIVAL.name}의 ambient 안내가 필요합니다.`,
);
scene.setVisualQaLocation({
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
  x: 1000,
});
scene.update(STEP_SECONDS, input({ left: true }));
const approachGuideDialogue = scene.getWorldStatus().dialogue;
assert.equal(
  approachGuideDialogue.active,
  true,
  '경계 이동 중 짧은 ambient 안내가 자동으로 시작되어야 합니다.',
);
assert.equal(approachGuideDialogue.presentationMode, 'ambient');
assert.equal(approachGuideDialogue.speaker, SCRAP_CAST.RIVAL.name);
const approachGuideStartX = scene.position.x;
scene.update(STEP_SECONDS, input({ left: true, jump: true, jumpSequence: prologueSequence }));
prologueSequence += 1;
assert.ok(
  scene.position.x < approachGuideStartX,
  'ambient 안내는 이동과 jump 입력을 잠그면 안 됩니다.',
);
assert.equal(
  stage(scene),
  SCRAP_AWAKENING_STAGE.YARD_APPROACH,
  'ambient 안내는 stage를 바꾸면 안 됩니다.',
);
for (let tick = 0; tick < 1_200 && scene.getWorldStatus().dialogue.active; tick += 1) {
  scene.update(STEP_SECONDS, EMPTY_INPUT);
}
assert.equal(
  scene.getWorldStatus().dialogue.active,
  false,
  'ambient 안내는 입력 없이 짧게 종료되어야 합니다.',
);
scene.resolveJourneyEncounter(
  Object.freeze({
    entityId: 'scrap-yard-approach-collector',
    scrapAwakeningNextStageId: SCRAP_AWAKENING_STAGE.YARD_SEARCH,
  }),
);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.YARD_SEARCH);
assert.equal(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-yard-approach-collector'),
  false,
  '세 번째 수거 유닛도 저장 가능한 완료 stage 뒤에는 다시 나타나면 안 됩니다.',
);
assert.ok(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-rival-yard-search'),
  `경계 전투 뒤에만 ${SCRAP_CAST.RIVAL.name}의 현장 조사를 시작할 수 있어야 합니다.`,
);
assert.ok(itemIds(scene).includes('scrap-yard-winch-base'));
const surveyReload = createAwakeningScene({
  progressionSnapshot: scene.getProgressionSnapshot(),
});
assert.equal(stage(surveyReload), SCRAP_AWAKENING_STAGE.YARD_SEARCH);
assert.ok(
  itemIds(surveyReload).includes('scrap-retrieval-arm-dormant-upper'),
  '현장 조사 저장 뒤에도 접힌 회수팔이 유지되어야 합니다.',
);
assert.ok(itemIds(surveyReload).includes('scrap-retrieval-arm-dormant-claw'));
assert.equal(
  itemIds(surveyReload).includes('scrap-retrieval-arm-grab-claw'),
  false,
  '현장 조사 저장 뒤에 포획 자세가 미리 보이면 안 됩니다.',
);
assert.equal(
  surveyReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-yard-approach-collector'),
  false,
  '경계 전투 완료 저장 뒤에는 조우가 다시 활성화되면 안 됩니다.',
);
assert.equal(
  surveyReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-rival-yard-survey'),
  false,
  'winch 점검 완료 저장 뒤에는 점검 interaction이 다시 활성화되면 안 됩니다.',
);

assert.ok(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === SCRAP_PLAYER_SEARCH_NOTICE_ENTITY_ID),
  `현장 조사에 들어가면 ${SCRAP_CAST.PROTAGONIST.monologueName}의 관찰 독백이 필요합니다.`,
);
scene.setVisualQaLocation({
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
  x: 1078,
});
scene.update(STEP_SECONDS, input({ right: true }));
const searchNoticeDialogue = scene.getWorldStatus().dialogue;
assert.equal(
  searchNoticeDialogue.active,
  true,
  '현장 조사 중 주인공 관찰 독백이 자동으로 시작되어야 합니다.',
);
assert.equal(searchNoticeDialogue.presentationMode, 'ambient');
assert.equal(searchNoticeDialogue.speaker, SCRAP_CAST.PROTAGONIST.monologueName);
assert.equal(searchNoticeDialogue.worldAnchor.x, scene.position.x);
const searchNoticeStartX = scene.position.x;
scene.update(STEP_SECONDS, input({ right: true, jump: true, jumpSequence: prologueSequence }));
prologueSequence += 1;
assert.ok(
  scene.position.x > searchNoticeStartX,
  '관찰 독백은 이동과 jump 입력을 잠그면 안 됩니다.',
);
assert.equal(
  stage(scene),
  SCRAP_AWAKENING_STAGE.YARD_SEARCH,
  '관찰 독백은 stage를 바꾸면 안 됩니다.',
);
for (let tick = 0; tick < 1_200 && scene.getWorldStatus().dialogue.active; tick += 1) {
  scene.update(STEP_SECONDS, EMPTY_INPUT);
}
assert.equal(
  scene.getWorldStatus().dialogue.active,
  false,
  '관찰 독백은 입력 없이 짧게 종료되어야 합니다.',
);

setAtStoryInteraction(scene, 'scrap-rival-yard-search');
prologueSequence = completeDialogue(scene, prologueSequence);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.COLLAPSE);
const collapseLockedX = scene.position.x;
scene.update(STEP_SECONDS, input({ right: true, jump: true, jumpSequence: prologueSequence }));
prologueSequence += 1;
assert.equal(scene.position.x, collapseLockedX, '붕괴 cinematic 동안 이동 입력은 잠겨야 합니다.');
for (let tick = 0; tick < 240 && stage(scene) === SCRAP_AWAKENING_STAGE.COLLAPSE; tick += 1) {
  scene.update(STEP_SECONDS, EMPTY_INPUT);
}
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.RESCUE_REQUEST);
assert.ok(itemIds(scene).includes('scrap-collapse-debris'));
assert.ok(
  itemIds(scene).includes('scrap-retrieval-arm-grab-upper'),
  '붕괴 뒤에는 라이벌을 낚아챈 회수팔 포획 자세가 보여야 합니다.',
);
assert.ok(itemIds(scene).includes('scrap-retrieval-arm-grab-claw'));
assert.ok(itemIds(scene).includes('scrap-retrieval-arm-grab-signal'));
assert.equal(
  itemIds(scene).includes('scrap-retrieval-arm-dormant-upper'),
  false,
  '포획 뒤에는 접힌 대기 자세가 남으면 안 됩니다.',
);

setAtStoryInteraction(scene, 'scrap-rival-rescue-request');
prologueSequence = completeDialogue(scene, prologueSequence);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.PLAYER_DECISION);

const playerDecision = setAtStoryInteraction(scene, 'scrap-player-device-decision');
scene.setVisualQaLocation({
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
  x: playerDecision.position.x - 40,
});
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: prologueSequence }));
prologueSequence += 1;
const monologue = scene.getWorldStatus().dialogue;
assert.equal(monologue.active, true);
assert.equal(monologue.presentationMode, 'monologue');
assert.equal(monologue.worldAnchor.x, scene.position.x);
assert.notEqual(monologue.worldAnchor.x, playerDecision.position.x);
const monologueLockedPosition = Object.freeze({ ...scene.position });
scene.update(STEP_SECONDS, input({ right: true, basicAttack: true, basicAttackSequence: 1 }));
assert.deepEqual(
  scene.position,
  monologueLockedPosition,
  '중요 선택 독백 중에는 Player 머리 위 anchor가 움직이지 않도록 이동을 잠가야 합니다.',
);
assert.equal(scene.combatCommands.snapshot().id, 'idle');
prologueSequence = completeDialogue(scene, prologueSequence);
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED);
assert.ok(itemIds(scene).includes('scrap-device-core'));
assert.deepEqual(scene.getProgressionSnapshot().viewedConversationIds, [
  SCRAP_PROLOGUE_CONVERSATION_ID.OWNER_COMMISSION,
  SCRAP_PROLOGUE_CONVERSATION_ID.RIVAL_DEPARTURE,
  SCRAP_PROLOGUE_CONVERSATION_ID.YARD_BRACE,
  SCRAP_PROLOGUE_CONVERSATION_ID.YARD_SURVEY,
  SCRAP_PROLOGUE_CONVERSATION_ID.YARD_SEARCH,
  SCRAP_PROLOGUE_CONVERSATION_ID.RIVAL_RESCUE,
  SCRAP_PROLOGUE_CONVERSATION_ID.PLAYER_DECISION,
]);

const beforeInteraction = Object.freeze({ ...scene.position });

scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: prologueSequence }));
prologueSequence += 1;
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.deepEqual(
  scene.position,
  beforeInteraction,
  '제어핵 상호작용은 Player jump를 억제해야 합니다.',
);
assert.equal(scene.isGrounded, true);
assert.ok(!itemIds(scene).includes('scrap-device-core'));
assert.ok(
  scene.mapRuntime.getResolvedSnapshot().appliedPatchIds.includes('scrap-device-recovered'),
);

const afterRecovery = scene.getProgressionSnapshot();
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: prologueSequence - 1 }));
assert.deepEqual(
  scene.getProgressionSnapshot(),
  afterRecovery,
  '같은 jump sequence는 제어핵 회수나 stage를 반복 확정하면 안 됩니다.',
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
let rescuedAfterStateObserved = false;
for (let tick = 0; tick < 1_200 && stage(scene) !== SCRAP_AWAKENING_STAGE.COMPLETE; tick += 1) {
  scene.update(STEP_SECONDS, EMPTY_INPUT);
  const currentStage = stage(scene);
  if (observedStages.at(-1) !== currentStage) observedStages.push(currentStage);
  if (currentStage === SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED) {
    rescuedAfterStateObserved =
      itemIds(scene).includes('scrap-rival-rescued-torso') &&
      !itemIds(scene).includes('scrap-rival-trapped-torso');
  }
  const cameraOffset = scene.combatCameraFeedback.snapshot();
  if (Math.abs(cameraOffset.x) > 0.01 || Math.abs(cameraOffset.y) > 0.01) shakeObserved = true;
}
assert.deepEqual(observedStages, [
  SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
  SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED,
  SCRAP_AWAKENING_STAGE.EYES_LIT,
  SCRAP_AWAKENING_STAGE.ASSEMBLED,
  SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
  SCRAP_AWAKENING_STAGE.COMPLETE,
]);
assert.equal(shakeObserved, true, '눈 점등·부품 결합 경계는 camera shake를 남겨야 합니다.');
assert.equal(
  rescuedAfterStateObserved,
  true,
  `구조 성공 직후 ${SCRAP_CAST.RIVAL.name}은 잔해 밖 standing after-state로 실제 장면에 남아야 합니다.`,
);
for (const cinematicStageId of [
  SCRAP_AWAKENING_STAGE.COLLAPSE,
  SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
  SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED,
  SCRAP_AWAKENING_STAGE.EYES_LIT,
  SCRAP_AWAKENING_STAGE.ASSEMBLED,
  SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
]) {
  assert.match(
    getScrapAwakeningPresentation(cinematicStageId).objective,
    /기다리세요/,
    `${cinematicStageId} bottom objective는 사건 설명 대신 Player action만 전달해야 합니다.`,
  );
}
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
  '완료 reload 뒤 제어핵 trigger가 다시 생기면 안 됩니다.',
);
completedReload.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
assert.equal(stage(completedReload), SCRAP_AWAKENING_STAGE.COMPLETE);
assert.equal(completedReload.isGrounded, false, '완료 뒤 ↑는 다시 Player jump여야 합니다.');

for (let tick = 0; tick < 300 && scene.position.x > 255; tick += 1) {
  scene.update(STEP_SECONDS, input({ left: true }));
}
assert.ok(
  scene.position.x <= 255,
  `각성지에서 왼쪽 ${SCRAP_CAST.SCRAPYARD_OWNER.name}에게 직접 돌아갈 수 있어야 합니다.`,
);
const durableGarageStages = [];
scene.progressionChanged.connect((snapshot) => {
  durableGarageStages.push(snapshot.scrapCampaign.garageRevealStageId);
});
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 2 }));
let ownerDialogue = scene.getWorldStatus().dialogue;
assert.equal(ownerDialogue.active, true);
assert.equal(ownerDialogue.speaker, SCRAP_CAST.SCRAPYARD_OWNER.name);
assert.equal(ownerDialogue.conversationId, 'scrapyard-owner-analysis');
assert.ok(
  scene.mapRuntime
    .getResolvedSnapshot()
    .entities.some(
      (entity) =>
        entity.id === 'scrapyard-owner-analysis' &&
        entity.presentationProfileId === 'scrapyard-owner',
    ),
  `${SCRAP_CAST.SCRAPYARD_OWNER.name}은 authored 직업 silhouette profile을 사용해야 합니다.`,
);
for (let jumpSequence = 3; jumpSequence <= 10; jumpSequence += 1) {
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
  durableGarageStages.filter(
    (stageId, index) => index === 0 || stageId !== durableGarageStages[index - 1],
  ),
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
assert.equal(garageCompleteStatus.wardLabel, '제어핵 · 우리 로봇 두뇌 장착');
scene.setVisualQaLocation({
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
  x: 480,
});
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 11 }));
const archiveDialogue = scene.getWorldStatus().dialogue;
assert.equal(archiveDialogue.conversationId, 'scrap-dialogue-archive');
const archiveCommands = archiveDialogue.commands.filter(
  (command) => command.type === 'replay-transcript' && command.canChoose,
);
assert.equal(
  archiveCommands.length,
  8,
  '작전 기록기에서 도입 일곱 대화와 고물상 분석을 현재 장면과 분리해 다시 열어야 합니다.',
);
const beforeReplay = scene.getProgressionSnapshot();
const replayResult = scene.executeDialogueCommand(
  'scrapyard-dialogue-archive',
  archiveCommands[0].id,
);
assert.equal(replayResult.reason, 'replay-started');
assert.equal(scene.getWorldStatus().dialogue.mode, 'transcript');
assert.deepEqual(
  scene.getProgressionSnapshot(),
  beforeReplay,
  '기록 재생은 campaign stage나 progression을 다시 쓰면 안 됩니다.',
);
for (let replaySequence = 12; replaySequence <= 17; replaySequence += 1) {
  scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: replaySequence }));
}
assert.equal(scene.getWorldStatus().dialogue.active, false);
assert.match(garageCompleteStatus.objective, /벽 지도/);
for (const itemId of [
  'scrapyard-wall-map-frame',
  'scrapyard-wall-map-route',
  'scrapyard-recovery-cot-frame',
  'scrapyard-recovery-cot-roll',
  'garage-robot-frame-torso',
  'garage-robot-brain-core',
  'garage-robot-zero-label',
]) {
  assert.ok(itemIds(scene).includes(itemId), `${itemId}가 차고 reveal 뒤 보여야 합니다.`);
}
assert.ok(!itemIds(scene).includes('scrapyard-analysis-device-core'));
assert.ok(!itemIds(scene).includes('scrapyard-garage-door-left'));

let restRequest = null;
scene.campaignActionPreviewRequested.connect((request) => {
  if (request.source === 'full-recovery-camp') restRequest = request;
});
setAtRecoveryCamp(scene);
scene.playerHealth = 17;
const beforeRestProgression = scene.getProgressionSnapshot();
const beforeRestPreview = scene.getProgressionSnapshot().scrapCampaign;
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 18 }));
assert.equal(restRequest?.preview.kind, 'rest');
assert.equal(restRequest?.preview.title, '완전히 회복하고 다음 시간대로 갈까요?');
assert.equal(restRequest?.preview.detailLabel, '고물상 작업장 · 체력 전부 회복');
assert.equal(restRequest?.preview.costSegments, 1);
assert.deepEqual(
  scene.getProgressionSnapshot().scrapCampaign,
  beforeRestPreview,
  '완전 회복 preview는 campaign 시간을 소비하면 안 됩니다.',
);
assert.equal(scene.cancelScrapCampaignAction().cancelled, true);
assert.deepEqual(
  scene.getProgressionSnapshot().scrapCampaign,
  beforeRestPreview,
  '완전 회복 취소는 campaign snapshot을 바꾸면 안 됩니다.',
);
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 19 }));
assert.equal(scene.confirmScrapCampaignAction().started, true);
const afterRest = scene.getWorldStatus();
const afterRestSnapshot = scene.getProgressionSnapshot().scrapCampaign;
assert.equal(
  afterRest.health,
  afterRest.maxHealth,
  '완전 회복은 Player 체력을 모두 복구해야 합니다.',
);
assert.equal(afterRestSnapshot.elapsedSegments, beforeRestPreview.elapsedSegments + 1);
assert.equal(afterRestSnapshot.deadlineSegments, beforeRestPreview.deadlineSegments - 1);
assert.equal(afterRest.campaign.phaseLabel, '낮');
assert.match(afterRest.progressionNotice, /완전 회복/);
assert.match(afterRest.encounterHint, /완전히 회복/);
scene.restoreProgression(beforeRestProgression);

let operationMapRequest = null;
scene.operationMapRequested.connect((request) => {
  operationMapRequest = request;
});
scene.setVisualQaLocation({
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
  x: 334,
});
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 20 }));
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
assert.equal(mineEventRequest?.preview.costSegments, 9);
assert.equal(mineEventRequest?.preview.allowed, false);
assert.equal(mineEventRequest?.preview.successExtensionDays, 2);
assert.equal(mineEventRequest?.preview.before.phaseLabel, '낮');
assert.deepEqual(
  mineFlowScene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
  beforeMineEventPreview.elapsedSegments,
  '지역 사건 preview는 시간을 소비하면 안 됩니다.',
);
assert.equal(mineFlowScene.cancelScrapCampaignAction().cancelled, true);
completeActiveLinkedIssuesForRegion(mineFlowScene, 'abandoned-mine');

mineEventRequest = null;
mineJumpSequence = completeDialogue(mineFlowScene, mineJumpSequence);
assert.equal(mineEventRequest?.preview.costSegments, 9);
assert.equal(mineEventRequest?.preview.allowed, true);
assert.equal(mineFlowScene.confirmScrapCampaignAction().started, true);
mineRegion = mineFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === 'abandoned-mine');
assert.equal(mineRegion.status, 'in-progress');
assert.equal(mineFlowScene.getWorldStatus().campaign.phaseLabel, '저녁');
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
  'mine-claim-jacker',
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
assert.equal(mineCompleteCampaign.phaseLabel, '저녁');
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
assert.match(shipyardFlowScene.getWorldStatus().objective, /13구간/);

setAtCampaignInteraction(shipyardFlowScene, SCRAP_SHIPYARD_ROAD_ROOM_ID, 'facility-observed');
const beforeShipyardEvent = shipyardFlowScene.getProgressionSnapshot().scrapCampaign;
shipyardJumpSequence = completeDialogue(shipyardFlowScene, shipyardJumpSequence);
assert.equal(shipyardCampaignRequest?.source, 'region-core-event');
assert.equal(shipyardCampaignRequest?.preview.costSegments, 13);
assert.equal(shipyardCampaignRequest?.preview.allowed, false);
assert.equal(shipyardCampaignRequest?.preview.successExtensionDays, 3);
assert.equal(
  shipyardFlowScene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
  beforeShipyardEvent.elapsedSegments,
  '항구 핵심 사건 preview는 확정 전 시간을 소비하면 안 됩니다.',
);
assert.equal(shipyardFlowScene.cancelScrapCampaignAction().cancelled, true);
completeActiveLinkedIssuesForRegion(shipyardFlowScene, SCRAP_SHIPYARD_REGION_ID);

shipyardJumpSequence = completeDialogue(shipyardFlowScene, shipyardJumpSequence);
assert.equal(shipyardCampaignRequest?.preview.allowed, true);
assert.equal(shipyardFlowScene.confirmScrapCampaignAction().started, true);
shipyardRegion = shipyardFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_SHIPYARD_REGION_ID);
assert.equal(shipyardRegion.status, 'in-progress');
assert.equal(shipyardFlowScene.getWorldStatus().campaign.phaseLabel, '낮');
assert.equal(shipyardFlowScene.getWorldStatus().campaign.deadlineLabel, 'D-26');

setAtPortalToRoom(shipyardFlowScene, SCRAP_SHIPYARD_ROAD_ROOM_ID, SCRAP_SHIPYARD_DRYDOCK_ROOM_ID);
shipyardFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: shipyardJumpSequence }));
shipyardJumpSequence += 1;
finishPortalTransition(shipyardFlowScene);
assert.equal(
  shipyardFlowScene.roomSceneNode.getEncounterGameplaySnapshot().profileId,
  'dock-salvage-raider',
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

const greenhouseFlowScene = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: completedShipyardProgression,
});
let greenhouseJumpSequence = 2_000;
let greenhouseCampaignRequest = null;
greenhouseFlowScene.campaignActionPreviewRequested.connect((request) => {
  greenhouseCampaignRequest = request;
});
assert.equal(
  greenhouseFlowScene.mapRuntime.getActiveLocation().roomId,
  SCRAP_SHIPYARD_ROAD_ROOM_ID,
);
setAtPortalToRoom(greenhouseFlowScene, SCRAP_SHIPYARD_ROAD_ROOM_ID, SCRAP_AWAKENING_ROOM_ID);
greenhouseFlowScene.update(
  STEP_SECONDS,
  input({ jump: true, jumpSequence: greenhouseJumpSequence }),
);
greenhouseJumpSequence += 1;
assert.equal(greenhouseCampaignRequest?.preview.targetLocationLabel, '동네 고물상');
assert.equal(greenhouseFlowScene.confirmScrapCampaignTravel().started, true);
finishPortalTransition(greenhouseFlowScene);

greenhouseCampaignRequest = null;
setAtPortalToRoom(greenhouseFlowScene, SCRAP_AWAKENING_ROOM_ID, SCRAP_GREENHOUSE_ROAD_ROOM_ID);
greenhouseFlowScene.update(
  STEP_SECONDS,
  input({ jump: true, jumpSequence: greenhouseJumpSequence }),
);
greenhouseJumpSequence += 1;
assert.equal(greenhouseCampaignRequest?.portalId, SCRAP_GREENHOUSE_ROAD_PORTAL_ID);
assert.equal(greenhouseCampaignRequest?.preview.targetLocationLabel, '온실 평원');
assert.equal(greenhouseCampaignRequest?.preview.costSegments, 1);
assert.equal(greenhouseFlowScene.confirmScrapCampaignTravel().started, true);
finishPortalTransition(greenhouseFlowScene);
assert.deepEqual(greenhouseFlowScene.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_GREENHOUSE_REGION_ID,
  roomId: SCRAP_GREENHOUSE_ROAD_ROOM_ID,
});
assert.equal(greenhouseFlowScene.getWorldStatus().campaign.currentLocationId, 'greenhouse-plains');
assert.match(greenhouseFlowScene.getWorldStatus().objective, /온실 기술자/);
assert.doesNotMatch(
  `${greenhouseFlowScene.getWorldStatus().story.title} ${greenhouseFlowScene.getWorldStatus().objective}`,
  /학원|교관|마법 생물/,
);

setAtCampaignInteraction(greenhouseFlowScene, SCRAP_GREENHOUSE_ROAD_ROOM_ID, 'npc-briefing');
greenhouseJumpSequence = completeDialogue(greenhouseFlowScene, greenhouseJumpSequence);
let greenhouseRegion = greenhouseFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_GREENHOUSE_REGION_ID);
assert.equal(greenhouseRegion.eventStageKind, 'npc-briefing');
assert.match(greenhouseFlowScene.getWorldStatus().objective, /17구간/);

setAtCampaignInteraction(greenhouseFlowScene, SCRAP_GREENHOUSE_ROAD_ROOM_ID, 'facility-observed');
const beforeGreenhouseEvent = greenhouseFlowScene.getProgressionSnapshot().scrapCampaign;
greenhouseJumpSequence = completeDialogue(greenhouseFlowScene, greenhouseJumpSequence);
assert.equal(greenhouseCampaignRequest?.source, 'region-core-event');
assert.equal(greenhouseCampaignRequest?.preview.costSegments, 17);
assert.equal(greenhouseCampaignRequest?.preview.allowed, false);
assert.equal(greenhouseCampaignRequest?.preview.successExtensionDays, 4);
assert.equal(
  greenhouseFlowScene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
  beforeGreenhouseEvent.elapsedSegments,
  '온실 핵심 사건 preview는 확정 전 시간을 소비하면 안 됩니다.',
);
assert.equal(greenhouseFlowScene.cancelScrapCampaignAction().cancelled, true);
completeActiveLinkedIssuesForRegion(greenhouseFlowScene, SCRAP_GREENHOUSE_REGION_ID);

greenhouseJumpSequence = completeDialogue(greenhouseFlowScene, greenhouseJumpSequence);
assert.equal(greenhouseCampaignRequest?.preview.allowed, true);
assert.equal(greenhouseFlowScene.confirmScrapCampaignAction().started, true);
greenhouseRegion = greenhouseFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_GREENHOUSE_REGION_ID);
assert.equal(greenhouseRegion.status, 'in-progress');
assert.equal(greenhouseFlowScene.getWorldStatus().campaign.phaseLabel, '아침');
assert.equal(greenhouseFlowScene.getWorldStatus().campaign.deadlineLabel, 'D-24');

setAtPortalToRoom(
  greenhouseFlowScene,
  SCRAP_GREENHOUSE_ROAD_ROOM_ID,
  SCRAP_GREENHOUSE_PIPE_ROOM_ID,
);
greenhouseFlowScene.update(
  STEP_SECONDS,
  input({ jump: true, jumpSequence: greenhouseJumpSequence }),
);
greenhouseJumpSequence += 1;
finishPortalTransition(greenhouseFlowScene);
assert.equal(
  greenhouseFlowScene.roomSceneNode.getEncounterGameplaySnapshot().profileId,
  'greenhouse-pipe-parasite',
);
greenhouseFlowScene.enterTree();
greenhouseFlowScene.roomSceneNode.encounter.completeForVisualQa();
greenhouseRegion = greenhouseFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_GREENHOUSE_REGION_ID);
assert.equal(greenhouseRegion.eventStageKind, 'journey-combat');
const greenhouseMidReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: greenhouseFlowScene.getProgressionSnapshot(),
});
greenhouseMidReload.setVisualQaLocation({
  regionId: SCRAP_GREENHOUSE_REGION_ID,
  roomId: SCRAP_GREENHOUSE_PIPE_ROOM_ID,
  x: 808,
});
assert.equal(
  greenhouseMidReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'greenhouse-pipe-parasite'),
  false,
  '지열 배관 전투 완료 reload는 기생 기계를 되살리면 안 됩니다.',
);
assert.ok(
  greenhouseMidReload.mapRuntime
    .getResolvedSnapshot()
    .portals.some((portal) => portal.to.roomId === SCRAP_GREENHOUSE_REACTOR_ROOM_ID),
);

setAtPortalToRoom(
  greenhouseFlowScene,
  SCRAP_GREENHOUSE_PIPE_ROOM_ID,
  SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
);
greenhouseFlowScene.update(
  STEP_SECONDS,
  input({ jump: true, jumpSequence: greenhouseJumpSequence }),
);
greenhouseJumpSequence += 1;
finishPortalTransition(greenhouseFlowScene);
const greenhouseBoss = greenhouseFlowScene.roomSceneNode.getEncounterGameplaySnapshot();
assert.equal(greenhouseBoss.profileId, 'greenhouse-geothermal-boss');
assert.equal(greenhouseBoss.presentationProfileId, 'greenhouse-geothermal-boss');
assert.match(greenhouseBoss.weakPoint.label, /압력|밸브|배관/);
greenhouseFlowScene.roomSceneNode.encounter.completeForVisualQa();

setAtCampaignInteraction(
  greenhouseFlowScene,
  SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
  'replacement-complete',
);
greenhouseJumpSequence = completeDialogue(greenhouseFlowScene, greenhouseJumpSequence);
assert.ok(itemIds(greenhouseFlowScene).includes('greenhouse-safe-pipeline'));
setAtCampaignInteraction(
  greenhouseFlowScene,
  SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
  'machine-separated',
);
greenhouseJumpSequence = completeDialogue(greenhouseFlowScene, greenhouseJumpSequence);
assert.ok(itemIds(greenhouseFlowScene).includes('greenhouse-reactor-signal'));
setAtCampaignInteraction(greenhouseFlowScene, SCRAP_GREENHOUSE_REACTOR_ROOM_ID, 'part-claimed');
greenhouseJumpSequence = completeDialogue(greenhouseFlowScene, greenhouseJumpSequence);

const greenhouseCompleteCampaign = greenhouseFlowScene.getWorldStatus().campaign;
greenhouseRegion = greenhouseCompleteCampaign.regions.find(
  (region) => region.id === SCRAP_GREENHOUSE_REGION_ID,
);
assert.equal(greenhouseRegion.status, 'resolved');
assert.equal(greenhouseRegion.eventStageKind, 'campaign-updated');
assert.equal(greenhouseRegion.collected, true);
assert.equal(greenhouseCompleteCampaign.collectedPartCount, 3);
assert.equal(greenhouseCompleteCampaign.completionPercent, 60);
assert.equal(greenhouseCompleteCampaign.deadlineLabel, 'D-28');
assert.equal(greenhouseCompleteCampaign.rivalDelaySegments, 16);

setAtPortalToRoom(
  greenhouseFlowScene,
  SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
  SCRAP_GREENHOUSE_PIPE_ROOM_ID,
);
greenhouseFlowScene.update(
  STEP_SECONDS,
  input({ jump: true, jumpSequence: greenhouseJumpSequence }),
);
greenhouseJumpSequence += 1;
finishPortalTransition(greenhouseFlowScene);
setAtPortalToRoom(
  greenhouseFlowScene,
  SCRAP_GREENHOUSE_PIPE_ROOM_ID,
  SCRAP_GREENHOUSE_ROAD_ROOM_ID,
);
greenhouseFlowScene.update(
  STEP_SECONDS,
  input({ jump: true, jumpSequence: greenhouseJumpSequence }),
);
greenhouseJumpSequence += 1;
finishPortalTransition(greenhouseFlowScene);
setAtPortalToRoom(greenhouseFlowScene, SCRAP_GREENHOUSE_ROAD_ROOM_ID, SCRAP_AWAKENING_ROOM_ID);
greenhouseFlowScene.update(
  STEP_SECONDS,
  input({ jump: true, jumpSequence: greenhouseJumpSequence }),
);
assert.equal(greenhouseFlowScene.confirmScrapCampaignTravel().started, true);
finishPortalTransition(greenhouseFlowScene);
const completedGreenhouseProgression = greenhouseFlowScene.getProgressionSnapshot();
greenhouseFlowScene.exitTree();

const completedGreenhouseReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: completedGreenhouseProgression,
});
assert.equal(
  completedGreenhouseReload.getWorldStatus().campaign.currentLocationId,
  'neighborhood-scrapyard',
);
for (const expectedItemId of [
  'garage-robot-walker-leg-left',
  'garage-robot-crane-arm-left',
  'garage-robot-reactor-core',
  'garage-robot-reactor-pipe-left',
  'garage-robot-sixty-label',
]) {
  assert.ok(itemIds(completedGreenhouseReload).includes(expectedItemId), expectedItemId);
}
assert.ok(!itemIds(completedGreenhouseReload).includes('garage-robot-forty-label'));
assert.equal(completedGreenhouseReload.getWorldStatus().wardLabel, '3/5 부품 · 로봇 60%');
assert.match(completedGreenhouseReload.getWorldStatus().encounterHint, /3\/5 PARTS · ROBOT 60%/);
const beforeRepeatedGreenhouseClaim = completedGreenhouseReload.getProgressionSnapshot();
completedGreenhouseReload.setVisualQaLocation({
  regionId: SCRAP_GREENHOUSE_REGION_ID,
  roomId: SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
  x: 1128,
});
assert.equal(
  completedGreenhouseReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'greenhouse-reactor-part-claim'),
  false,
  '완료 reload 뒤 동력로 회수 trigger는 다시 활성화되면 안 됩니다.',
);
completedGreenhouseReload.update(STEP_SECONDS, input({ jump: true, jumpSequence: 3_000 }));
assert.deepEqual(
  completedGreenhouseReload.getProgressionSnapshot(),
  beforeRepeatedGreenhouseClaim,
  '완료 reload의 반복 온실 interaction은 부품·시간·보상을 바꾸면 안 됩니다.',
);

const snowFlowScene = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: completedGreenhouseProgression,
});
let snowJumpSequence = 4_000;
let snowCampaignRequest = null;
snowFlowScene.campaignActionPreviewRequested.connect((request) => {
  snowCampaignRequest = request;
});
setAtPortalToRoom(snowFlowScene, SCRAP_AWAKENING_ROOM_ID, SCRAP_SNOW_ROAD_ROOM_ID);
snowFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: snowJumpSequence }));
snowJumpSequence += 1;
assert.equal(snowCampaignRequest?.portalId, SCRAP_SNOW_ROAD_PORTAL_ID);
assert.equal(snowCampaignRequest?.preview.targetLocationLabel, '설산 교역로');
assert.equal(snowCampaignRequest?.preview.costSegments, 1);
assert.equal(snowFlowScene.confirmScrapCampaignTravel().started, true);
finishPortalTransition(snowFlowScene);
assert.deepEqual(snowFlowScene.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_SNOW_REGION_ID,
  roomId: SCRAP_SNOW_ROAD_ROOM_ID,
});
assert.equal(snowFlowScene.getWorldStatus().campaign.currentLocationId, SCRAP_SNOW_REGION_ID);
assert.match(snowFlowScene.getWorldStatus().objective, /제설 열차 승무원/);
assert.doesNotMatch(
  `${snowFlowScene.getWorldStatus().story.title} ${snowFlowScene.getWorldStatus().objective}`,
  /학원|교관|마법 생물/,
);

setAtCampaignInteraction(snowFlowScene, SCRAP_SNOW_ROAD_ROOM_ID, 'npc-briefing');
snowJumpSequence = completeDialogue(snowFlowScene, snowJumpSequence);
let snowRegion = snowFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_SNOW_REGION_ID);
assert.equal(snowRegion.eventStageKind, 'npc-briefing');
assert.match(snowFlowScene.getWorldStatus().objective, /13구간/);

setAtCampaignInteraction(snowFlowScene, SCRAP_SNOW_ROAD_ROOM_ID, 'facility-observed');
const beforeSnowEvent = snowFlowScene.getProgressionSnapshot().scrapCampaign;
snowJumpSequence = completeDialogue(snowFlowScene, snowJumpSequence);
assert.equal(snowCampaignRequest?.source, 'region-core-event');
assert.equal(snowCampaignRequest?.preview.costSegments, 13);
assert.equal(snowCampaignRequest?.preview.allowed, false);
assert.equal(snowCampaignRequest?.preview.successExtensionDays, 3);
assert.equal(
  snowFlowScene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
  beforeSnowEvent.elapsedSegments,
  '설산 핵심 사건 preview는 확정 전 시간을 소비하면 안 됩니다.',
);
assert.equal(snowFlowScene.cancelScrapCampaignAction().cancelled, true);
completeActiveLinkedIssuesForRegion(snowFlowScene, SCRAP_SNOW_REGION_ID);

snowJumpSequence = completeDialogue(snowFlowScene, snowJumpSequence);
assert.equal(snowCampaignRequest?.preview.allowed, true);
assert.equal(snowFlowScene.confirmScrapCampaignAction().started, true);
snowRegion = snowFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_SNOW_REGION_ID);
assert.equal(snowRegion.status, 'in-progress');
assert.equal(snowFlowScene.getWorldStatus().campaign.phaseLabel, '밤');
assert.equal(snowFlowScene.getWorldStatus().campaign.deadlineLabel, 'D-25');

setAtPortalToRoom(snowFlowScene, SCRAP_SNOW_ROAD_ROOM_ID, SCRAP_SNOW_TUNNEL_ROOM_ID);
snowFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: snowJumpSequence }));
snowJumpSequence += 1;
finishPortalTransition(snowFlowScene);
assert.equal(
  snowFlowScene.roomSceneNode.getEncounterGameplaySnapshot().profileId,
  'snow-route-raider',
);
snowFlowScene.enterTree();
snowFlowScene.roomSceneNode.encounter.completeForVisualQa();
snowRegion = snowFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_SNOW_REGION_ID);
assert.equal(snowRegion.eventStageKind, 'journey-combat');
const snowMidReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: snowFlowScene.getProgressionSnapshot(),
});
snowMidReload.setVisualQaLocation({
  regionId: SCRAP_SNOW_REGION_ID,
  roomId: SCRAP_SNOW_TUNNEL_ROOM_ID,
  x: 808,
});
assert.equal(
  snowMidReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'snow-tunnel-collector'),
  false,
  '옛 터널 전투 완료 reload는 길목 수거반을 되살리면 안 됩니다.',
);
assert.ok(
  snowMidReload.mapRuntime
    .getResolvedSnapshot()
    .portals.some((portal) => portal.to.roomId === SCRAP_SNOW_TRAIN_ROOM_ID),
);

setAtPortalToRoom(snowFlowScene, SCRAP_SNOW_TUNNEL_ROOM_ID, SCRAP_SNOW_TRAIN_ROOM_ID);
snowFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: snowJumpSequence }));
snowJumpSequence += 1;
finishPortalTransition(snowFlowScene);
const snowBoss = snowFlowScene.roomSceneNode.getEncounterGameplaySnapshot();
assert.equal(snowBoss.profileId, 'snowplow-train-boss');
assert.equal(snowBoss.presentationProfileId, 'snowplow-train-boss');
assert.match(snowBoss.weakPoint.label, /열선|제동축/);
snowFlowScene.roomSceneNode.encounter.completeForVisualQa();

setAtCampaignInteraction(snowFlowScene, SCRAP_SNOW_TRAIN_ROOM_ID, 'replacement-complete');
snowJumpSequence = completeDialogue(snowFlowScene, snowJumpSequence);
assert.ok(itemIds(snowFlowScene).includes('snow-open-tunnel-signal'));
setAtCampaignInteraction(snowFlowScene, SCRAP_SNOW_TRAIN_ROOM_ID, 'machine-separated');
snowJumpSequence = completeDialogue(snowFlowScene, snowJumpSequence);
assert.ok(itemIds(snowFlowScene).includes('snow-armor-signal'));
setAtCampaignInteraction(snowFlowScene, SCRAP_SNOW_TRAIN_ROOM_ID, 'part-claimed');
snowJumpSequence = completeDialogue(snowFlowScene, snowJumpSequence);

const snowCompleteCampaign = snowFlowScene.getWorldStatus().campaign;
snowRegion = snowCompleteCampaign.regions.find((region) => region.id === SCRAP_SNOW_REGION_ID);
assert.equal(snowRegion.status, 'resolved');
assert.equal(snowRegion.eventStageKind, 'campaign-updated');
assert.equal(snowRegion.collected, true);
assert.equal(snowCompleteCampaign.collectedPartCount, 4);
assert.equal(snowCompleteCampaign.completionPercent, 80);
assert.equal(snowCompleteCampaign.deadlineLabel, 'D-28');
assert.equal(snowCompleteCampaign.rivalDelaySegments, 13);

setAtPortalToRoom(snowFlowScene, SCRAP_SNOW_TRAIN_ROOM_ID, SCRAP_SNOW_TUNNEL_ROOM_ID);
snowFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: snowJumpSequence }));
snowJumpSequence += 1;
finishPortalTransition(snowFlowScene);
setAtPortalToRoom(snowFlowScene, SCRAP_SNOW_TUNNEL_ROOM_ID, SCRAP_SNOW_ROAD_ROOM_ID);
snowFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: snowJumpSequence }));
snowJumpSequence += 1;
finishPortalTransition(snowFlowScene);
setAtPortalToRoom(snowFlowScene, SCRAP_SNOW_ROAD_ROOM_ID, SCRAP_AWAKENING_ROOM_ID);
snowFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: snowJumpSequence }));
assert.equal(snowFlowScene.confirmScrapCampaignTravel().started, true);
finishPortalTransition(snowFlowScene);
const completedSnowProgression = snowFlowScene.getProgressionSnapshot();
snowFlowScene.exitTree();

const completedSnowReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: completedSnowProgression,
});
assert.equal(
  completedSnowReload.getWorldStatus().campaign.currentLocationId,
  'neighborhood-scrapyard',
);
for (const expectedItemId of [
  'garage-robot-walker-leg-left',
  'garage-robot-crane-arm-left',
  'garage-robot-reactor-core',
  'garage-robot-snow-armor-torso',
  'garage-robot-snow-armor-rivet-left',
  'garage-robot-eighty-label',
]) {
  assert.ok(itemIds(completedSnowReload).includes(expectedItemId), expectedItemId);
}
for (const absentItemId of [
  'garage-robot-zero-label',
  'garage-robot-forty-label',
  'garage-robot-sixty-label',
  'garage-robot-snow-twenty-label',
]) {
  assert.ok(!itemIds(completedSnowReload).includes(absentItemId), absentItemId);
}
assert.equal(completedSnowReload.getWorldStatus().wardLabel, '4/5 부품 · 로봇 80%');
assert.match(completedSnowReload.getWorldStatus().encounterHint, /4\/5 PARTS · ROBOT 80%/);
const beforeRepeatedSnowClaim = completedSnowReload.getProgressionSnapshot();
completedSnowReload.setVisualQaLocation({
  regionId: SCRAP_SNOW_REGION_ID,
  roomId: SCRAP_SNOW_TRAIN_ROOM_ID,
  x: 1128,
});
assert.equal(
  completedSnowReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'snow-armor-part-claim'),
  false,
  '완료 reload 뒤 제설 열차 장갑 회수 trigger는 다시 활성화되면 안 됩니다.',
);
completedSnowReload.update(STEP_SECONDS, input({ jump: true, jumpSequence: 5_000 }));
assert.deepEqual(
  completedSnowReload.getProgressionSnapshot(),
  beforeRepeatedSnowClaim,
  '완료 reload의 반복 설산 interaction은 부품·시간·보상을 바꾸면 안 됩니다.',
);

const quarryFlowScene = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: completedSnowProgression,
});
let quarryJumpSequence = 6_000;
let quarryCampaignRequest = null;
quarryFlowScene.campaignActionPreviewRequested.connect((request) => {
  quarryCampaignRequest = request;
});
setAtPortalToRoom(quarryFlowScene, SCRAP_AWAKENING_ROOM_ID, SCRAP_QUARRY_ROAD_ROOM_ID);
quarryFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: quarryJumpSequence }));
quarryJumpSequence += 1;
assert.equal(quarryCampaignRequest?.portalId, SCRAP_QUARRY_ROAD_PORTAL_ID);
assert.equal(quarryCampaignRequest?.preview.targetLocationLabel, '붉은 채석장');
assert.equal(quarryCampaignRequest?.preview.costSegments, 1);
assert.equal(quarryFlowScene.confirmScrapCampaignTravel().started, true);
finishPortalTransition(quarryFlowScene);
assert.deepEqual(quarryFlowScene.mapRuntime.getActiveLocation(), {
  regionId: SCRAP_QUARRY_REGION_ID,
  roomId: SCRAP_QUARRY_ROAD_ROOM_ID,
});
assert.equal(quarryFlowScene.getWorldStatus().campaign.currentLocationId, SCRAP_QUARRY_REGION_ID);
assert.match(quarryFlowScene.getWorldStatus().objective, /채석공 작업반장/);
assert.doesNotMatch(
  `${quarryFlowScene.getWorldStatus().story.title} ${quarryFlowScene.getWorldStatus().objective}`,
  /Academy|교관|마법 생물/,
);

setAtCampaignInteraction(quarryFlowScene, SCRAP_QUARRY_ROAD_ROOM_ID, 'npc-briefing');
quarryJumpSequence = completeDialogue(quarryFlowScene, quarryJumpSequence);
let quarryRegion = quarryFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_QUARRY_REGION_ID);
assert.equal(quarryRegion.eventStageKind, 'npc-briefing');
assert.match(quarryFlowScene.getWorldStatus().objective, /21구간/);

setAtCampaignInteraction(quarryFlowScene, SCRAP_QUARRY_ROAD_ROOM_ID, 'facility-observed');
const beforeQuarryEvent = quarryFlowScene.getProgressionSnapshot().scrapCampaign;
quarryJumpSequence = completeDialogue(quarryFlowScene, quarryJumpSequence);
assert.equal(quarryCampaignRequest?.source, 'region-core-event');
assert.equal(quarryCampaignRequest?.preview.costSegments, 21);
assert.equal(
  quarryCampaignRequest?.preview.allowed,
  true,
  '이미 해결한 폐광·온실 현장 stage는 채석장 linked issue로 재인식되어야 합니다.',
);
assert.equal(quarryCampaignRequest?.preview.successExtensionDays, 5);
assert.equal(
  quarryFlowScene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
  beforeQuarryEvent.elapsedSegments,
  '채석장 핵심 사건 preview는 확정 전 시간을 소비하면 안 됩니다.',
);
assert.equal(quarryFlowScene.cancelScrapCampaignAction().cancelled, true);
completeActiveLinkedIssuesForRegion(quarryFlowScene, SCRAP_QUARRY_REGION_ID);
quarryJumpSequence += 1;
quarryJumpSequence = completeDialogue(quarryFlowScene, quarryJumpSequence);
assert.equal(quarryCampaignRequest?.preview.allowed, true);
assert.equal(quarryFlowScene.confirmScrapCampaignAction().started, true);
quarryRegion = quarryFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_QUARRY_REGION_ID);
assert.equal(quarryRegion.status, 'in-progress');

setAtPortalToRoom(quarryFlowScene, SCRAP_QUARRY_ROAD_ROOM_ID, SCRAP_QUARRY_CUT_ROOM_ID);
quarryFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: quarryJumpSequence }));
quarryJumpSequence += 1;
finishPortalTransition(quarryFlowScene);
assert.equal(
  quarryFlowScene.roomSceneNode.getEncounterGameplaySnapshot().profileId,
  'quarry-cut-collector',
);
quarryFlowScene.enterTree();
quarryFlowScene.roomSceneNode.encounter.completeForVisualQa();
quarryRegion = quarryFlowScene
  .getWorldStatus()
  .campaign.regions.find((region) => region.id === SCRAP_QUARRY_REGION_ID);
assert.equal(quarryRegion.eventStageKind, 'journey-combat');
const quarryMidReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: quarryFlowScene.getProgressionSnapshot(),
});
quarryMidReload.setVisualQaLocation({
  regionId: SCRAP_QUARRY_REGION_ID,
  roomId: SCRAP_QUARRY_CUT_ROOM_ID,
  x: 808,
});
assert.equal(
  quarryMidReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'quarry-cut-collector'),
  false,
);
assert.ok(
  quarryMidReload.mapRuntime
    .getResolvedSnapshot()
    .portals.some((portal) => portal.to.roomId === SCRAP_QUARRY_CUTTER_ROOM_ID),
);

setAtPortalToRoom(quarryFlowScene, SCRAP_QUARRY_CUT_ROOM_ID, SCRAP_QUARRY_CUTTER_ROOM_ID);
quarryFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: quarryJumpSequence }));
quarryJumpSequence += 1;
finishPortalTransition(quarryFlowScene);
const quarryBoss = quarryFlowScene.roomSceneNode.getEncounterGameplaySnapshot();
assert.equal(quarryBoss.profileId, 'quarry-rock-cutter-boss');
assert.equal(quarryBoss.presentationProfileId, 'quarry-rock-cutter-boss');
assert.match(quarryBoss.weakPoint.label, /베어링|회전축/);
quarryFlowScene.roomSceneNode.encounter.completeForVisualQa();

setAtCampaignInteraction(quarryFlowScene, SCRAP_QUARRY_CUTTER_ROOM_ID, 'replacement-complete');
quarryJumpSequence = completeDialogue(quarryFlowScene, quarryJumpSequence);
assert.ok(itemIds(quarryFlowScene).includes('quarry-safe-closure'));
setAtCampaignInteraction(quarryFlowScene, SCRAP_QUARRY_CUTTER_ROOM_ID, 'machine-separated');
quarryJumpSequence = completeDialogue(quarryFlowScene, quarryJumpSequence);
assert.ok(itemIds(quarryFlowScene).includes('quarry-cutter-signal'));
setAtCampaignInteraction(quarryFlowScene, SCRAP_QUARRY_CUTTER_ROOM_ID, 'part-claimed');
quarryJumpSequence = completeDialogue(quarryFlowScene, quarryJumpSequence);

const quarryCompleteCampaign = quarryFlowScene.getWorldStatus().campaign;
quarryRegion = quarryCompleteCampaign.regions.find(
  (region) => region.id === SCRAP_QUARRY_REGION_ID,
);
assert.equal(quarryRegion.status, 'resolved');
assert.equal(quarryRegion.eventStageKind, 'campaign-updated');
assert.equal(quarryRegion.collected, true);
assert.equal(quarryCompleteCampaign.collectedPartCount, 5);
assert.equal(quarryCompleteCampaign.completionPercent, 100);
assert.equal(quarryCompleteCampaign.finalBattleAvailable, true);
assert.equal(quarryCompleteCampaign.rivalDelaySegments, 20);

setAtPortalToRoom(quarryFlowScene, SCRAP_QUARRY_CUTTER_ROOM_ID, SCRAP_QUARRY_CUT_ROOM_ID);
quarryFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: quarryJumpSequence }));
quarryJumpSequence += 1;
finishPortalTransition(quarryFlowScene);
setAtPortalToRoom(quarryFlowScene, SCRAP_QUARRY_CUT_ROOM_ID, SCRAP_QUARRY_ROAD_ROOM_ID);
quarryFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: quarryJumpSequence }));
quarryJumpSequence += 1;
finishPortalTransition(quarryFlowScene);
setAtPortalToRoom(quarryFlowScene, SCRAP_QUARRY_ROAD_ROOM_ID, SCRAP_AWAKENING_ROOM_ID);
quarryFlowScene.update(STEP_SECONDS, input({ jump: true, jumpSequence: quarryJumpSequence }));
assert.equal(quarryFlowScene.confirmScrapCampaignTravel().started, true);
finishPortalTransition(quarryFlowScene);
const completedQuarryProgression = quarryFlowScene.getProgressionSnapshot();
quarryFlowScene.exitTree();

const completedQuarryReload = createTestGameScene({
  mapDefinition: SCRAP_AWAKENING_MAP,
  progressionSnapshot: completedQuarryProgression,
});
assert.equal(
  completedQuarryReload.getWorldStatus().campaign.currentLocationId,
  'neighborhood-scrapyard',
);
for (const expectedItemId of [
  'garage-robot-walker-leg-left',
  'garage-robot-crane-arm-left',
  'garage-robot-reactor-core',
  'garage-robot-snow-armor-torso',
  'garage-robot-quarry-cutter-blade',
  'garage-robot-quarry-cutter-teeth',
  'garage-robot-hundred-label',
]) {
  assert.ok(itemIds(completedQuarryReload).includes(expectedItemId), expectedItemId);
}
for (const absentItemId of [
  'garage-robot-zero-label',
  'garage-robot-forty-label',
  'garage-robot-sixty-label',
  'garage-robot-eighty-label',
  'garage-robot-quarry-twenty-label',
]) {
  assert.ok(!itemIds(completedQuarryReload).includes(absentItemId), absentItemId);
}
assert.equal(completedQuarryReload.getWorldStatus().wardLabel, '5/5 부품 · 로봇 100%');
assert.match(completedQuarryReload.getWorldStatus().encounterHint, /5\/5 PARTS · ROBOT 100%/);
const beforeRepeatedQuarryClaim = completedQuarryReload.getProgressionSnapshot();
completedQuarryReload.setVisualQaLocation({
  regionId: SCRAP_QUARRY_REGION_ID,
  roomId: SCRAP_QUARRY_CUTTER_ROOM_ID,
  x: 1128,
});
assert.equal(
  completedQuarryReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'quarry-cutter-part-claim'),
  false,
  '완료 reload 뒤 암반 절단검 회수 trigger는 다시 활성화되면 안 됩니다.',
);
completedQuarryReload.update(STEP_SECONDS, input({ jump: true, jumpSequence: 7_000 }));
assert.deepEqual(
  completedQuarryReload.getProgressionSnapshot(),
  beforeRepeatedQuarryClaim,
  '완료 reload의 반복 채석장 interaction은 부품·시간·보상을 바꾸면 안 됩니다.',
);

const completionLabelIds = [
  'garage-robot-zero-label',
  'garage-robot-twenty-label',
  'garage-robot-crane-twenty-label',
  'garage-robot-reactor-twenty-label',
  'garage-robot-snow-twenty-label',
  'garage-robot-quarry-twenty-label',
  'garage-robot-forty-label',
  'garage-robot-sixty-label',
  'garage-robot-eighty-label',
  'garage-robot-hundred-label',
];
for (const freeOrderCase of [
  {
    regionIds: [SCRAP_QUARRY_REGION_ID, SCRAP_MINE_ROAD_REGION_ID],
    expectedLabelId: 'garage-robot-forty-label',
  },
  {
    regionIds: [SCRAP_QUARRY_REGION_ID, SCRAP_MINE_ROAD_REGION_ID, SCRAP_SHIPYARD_REGION_ID],
    expectedLabelId: 'garage-robot-sixty-label',
  },
  {
    regionIds: [
      SCRAP_QUARRY_REGION_ID,
      SCRAP_MINE_ROAD_REGION_ID,
      SCRAP_SHIPYARD_REGION_ID,
      SCRAP_GREENHOUSE_REGION_ID,
    ],
    expectedLabelId: 'garage-robot-eighty-label',
  },
]) {
  const freeOrderScene = createTestGameScene({ mapDefinition: SCRAP_AWAKENING_MAP });
  freeOrderScene.setVisualQaScrapGarageRevealStage(SCRAP_GARAGE_REVEAL_STAGE.COMPLETE);
  for (const regionId of freeOrderCase.regionIds) {
    freeOrderScene.setVisualQaScrapRegionState({
      regionId,
      stageKind: 'campaign-updated',
      status: 'resolved',
      collected: true,
      currentLocationId: 'neighborhood-scrapyard',
    });
  }
  const visibleLabels = completionLabelIds.filter((itemId) =>
    itemIds(freeOrderScene).includes(itemId),
  );
  assert.deepEqual(
    visibleLabels,
    [freeOrderCase.expectedLabelId],
    `채석장을 ${freeOrderCase.regionIds.length}번째 이내에 회수해도 누적 완성도 label은 하나여야 합니다.`,
  );
  assert.ok(itemIds(freeOrderScene).includes('garage-robot-quarry-cutter-blade'));
}

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
keyboardScene.setVisualQaScrapAwakeningStage(SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED);
const keyboard = new KeyboardInputAdapter({ isActive: () => true });
keyboard.onKeyDown({ code: 'ArrowUp', target: { closest: () => null }, preventDefault() {} });
keyboardScene.update(STEP_SECONDS, keyboard.snapshot());
const mobileScene = createAwakeningScene();
mobileScene.setVisualQaScrapAwakeningStage(SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED);
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

const completionChecks = [
  'owner-rival-search-collapse-rescue-decision-stage-order',
  'prologue-transcripts-recorded-and-replayable',
  'rescue-success-before-awakening-signal',
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
  'shipyard-event-preview-thirteen-segments-three-day-extension-and-cancel',
  'shipyard-midstage-and-part-reload-idempotence-and-garage-forty-percent',
  'greenhouse-eight-stage-technician-pipeline-reactor-machine-part-flow',
  'greenhouse-event-preview-seventeen-segments-four-day-extension-and-cancel',
  'greenhouse-midstage-and-part-reload-idempotence-and-garage-sixty-percent',
  'snow-eight-stage-crew-tunnel-snowplow-machine-part-flow',
  'snow-event-preview-thirteen-segments-three-day-extension-and-cancel',
  'snow-midstage-and-part-reload-idempotence-and-garage-eighty-percent',
  'quarry-eight-stage-worker-cut-rock-cutter-machine-part-flow',
  'quarry-event-preview-twenty-one-segments-five-day-extension-and-cancel',
  'quarry-midstage-and-part-reload-idempotence-and-garage-hundred-percent',
  'quarry-free-order-two-three-four-part-single-completion-label',
  'keyboard-touch-interaction-parity',
];

process.stdout.write(
  `${JSON.stringify({
    status: 'PASS',
    probe: 'scrap-awakening-runtime',
    checkCount: completionChecks.length,
    checks: completionChecks,
  })}\n`,
);
