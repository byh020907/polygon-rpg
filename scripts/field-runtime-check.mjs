import assert from 'node:assert/strict';
import { createGameScene } from '../src/app/createGameScene.js';
import { FieldQuestRuntime } from '../src/game/quests/FieldQuestRuntime.js';
import { acceptQuest, createQuestState, reconcileQuests } from '../src/game/quests/QuestState.js';
import { getQuestOccurrenceId } from '../src/game/quests/QuestProfiles.js';
import {
  commitScrapCampaignAction,
  SCRAP_CAMPAIGN_ACTION_KIND,
} from '../src/game/campaign/ScrapCampaignState.js';
const scene = createGameScene();
let testEncounter = null,
  originalRoom = null;
try {
  const runtime = new FieldQuestRuntime(scene);
  assert.equal(runtime.context().garageRevealed, false);
  assert.equal(runtime.getBoardPrompt(), null);
  assert.equal(runtime.prepare().snapshot.quests.records.length, 0);
  scene.setVisualQaScrapAwakeningStage('complete');
  scene.setVisualQaScrapGarageRevealStage('complete');
  scene.setVisualQaLocation({
    regionId: 'abandoned-mine',
    roomId: 'abandoned-mine-roadhead',
    x: 340,
  });
  const context = runtime.context();
  assert.equal(context.garageRevealed, true);
  assert.ok(context.accessibleRoomIds.includes('harbor-shipyard-roadhead'));
  assert.ok(
    !context.accessibleRoomIds.includes('abandoned-mine-rescue-tunnel'),
    'disabled actual portal does not authorize tunnel jobs',
  );
  assert.ok(!context.accessibleRoomIds.includes('harbor-shipyard-occupied-drydock'));
  assert.equal(runtime.getBoardPrompt().label, '의뢰 게시판');
  scene.position.x = 500;
  assert.equal(runtime.getBoardPrompt(), null);
  const original = scene.progressionSnapshot,
    serialized = JSON.stringify(original),
    position = { ...scene.position };
  const prepared = runtime.prepare();
  assert.equal(prepared.changed, true);
  assert.equal(prepared.snapshot.quests.slots.length, 4);
  assert.equal(scene.progressionSnapshot, original);
  assert.equal(JSON.stringify(original), serialized);
  assert.deepEqual(scene.position, position);
  scene.progressionSnapshot = prepared.snapshot;
  assert.equal(runtime.prepare().changed, false);
  const mine = scene.progressionSnapshot.quests.records.find(
    (r) => r.profileId === 'mine-lamp-check',
  );
  const accepted = runtime.accept(mine.instanceId);
  assert.equal(
    scene.progressionSnapshot.quests.records.find((r) => r.instanceId === mine.instanceId).status,
    'offered',
  );
  scene.progressionSnapshot = accepted.snapshot;
  scene.position.x = 1230;
  assert.equal(runtime.nearbyAction().event.instanceId, mine.instanceId);
  assert.equal(runtime.nearbyAction().workSegments, 0);
  const fieldEvent = runtime.nearbyAction().event;
  const gold = scene.progressionSnapshot.gold;
  const completed = runtime.perform(fieldEvent);
  assert.equal(completed.snapshot.gold, gold + 24);
  assert.equal(completed.acquisitions.length, 1);
  assert.equal(scene.progressionSnapshot.gold, gold);
  scene.progressionSnapshot = completed.snapshot;
  assert.equal(runtime.perform(fieldEvent).changed, false);
  assert.equal(runtime.perform(fieldEvent).acquisitions.length, 0);
  scene.position.x = 100;
  assert.throws(() => runtime.perform(fieldEvent), /range/);
  assert.throws(
    () => runtime.perform({ ...fieldEvent, roomId: 'harbor-shipyard-roadhead' }),
    /active room/,
  );
  scene.position.x = 280;
  const clue = runtime.renderItems().filter((item) => item.id.startsWith('mine-cable-cache'));
  assert.equal(clue.length, 3);
  const hidden = runtime.nearbyAction();
  assert.equal(hidden.event.type, 'exploration');
  const hiddenResult = runtime.perform(hidden.event);
  assert.ok(hiddenResult.snapshot.ownedEquipmentItemIds.includes('field-work-lamp'));
  assert.equal(hiddenResult.acquisitions[0].kind, 'equipment');
  scene.progressionSnapshot = hiddenResult.snapshot;
  assert.equal(
    runtime.renderItems().some((item) => item.id.startsWith('mine-cable-cache')),
    false,
  );
  assert.equal(runtime.perform(hidden.event).changed, false);
  const beforeFailure = scene.progressionSnapshot;
  assert.throws(() =>
    runtime.applyResult(beforeFailure, {
      changed: true,
      state: beforeFailure.quests,
      notifications: [],
      rewards: [
        { claimId: 'fixture:first', bundle: { gold: 5 } },
        { claimId: 'fixture:bad', bundle: { materials: { 'unknown-material': 1 } } },
      ],
    }),
  );
  assert.equal(scene.progressionSnapshot, beforeFailure);
  assert.equal(beforeFailure.rewardClaims.includes('fixture:first'), false);

  // An authored paid job is still a caller-owned clock transaction, never an implicit runtime write.
  scene.setVisualQaLocation({
    regionId: 'harbor-shipyard',
    roomId: 'harbor-shipyard-roadhead',
    x: 1230,
  });
  const service = scene.progressionSnapshot.quests.records.find(
    (r) => r.profileId === 'harbor-lamp-service',
  );
  scene.progressionSnapshot = runtime.accept(service.instanceId).snapshot;
  const paid = runtime.nearbyAction();
  assert.equal(paid.workSegments, 1);
  const beforeWork = scene.progressionSnapshot;
  const unpaidSerialized = JSON.stringify(beforeWork);
  assert.throws(() => runtime.perform(paid.event, beforeWork), /committed campaign action/);
  assert.equal(
    JSON.stringify(beforeWork),
    unpaidSerialized,
    'unpaid work cannot change quests or grant rewards',
  );
  assert.equal(scene.progressionSnapshot, beforeWork);
  const clock = commitScrapCampaignAction(
    beforeWork.scrapCampaign,
    {
      actionId: paid.event.occurrenceId + ':work',
      kind: SCRAP_CAMPAIGN_ACTION_KIND.FIELD_WORK,
      label: '작업등 정비',
      costSegments: 1,
    },
    scene.scrapCampaignProfile,
  );
  const unrelated = commitScrapCampaignAction(
    beforeWork.scrapCampaign,
    {
      actionId: 'fixture:other-work',
      kind: SCRAP_CAMPAIGN_ACTION_KIND.FIELD_WORK,
      label: '다른 현장 작업',
      costSegments: 1,
    },
    scene.scrapCampaignProfile,
  );
  assert.throws(
    () => runtime.perform(paid.event, { ...beforeWork, scrapCampaign: unrelated.snapshot }),
    /committed campaign action/,
    'spending time on another source does not authorize this reward',
  );
  const paidResult = runtime.perform(paid.event, { ...beforeWork, scrapCampaign: clock.snapshot });
  assert.equal(scene.progressionSnapshot, beforeWork);
  assert.equal(
    paidResult.snapshot.scrapCampaign.elapsedSegments,
    beforeWork.scrapCampaign.elapsedSegments + 1,
  );
  assert.equal(paidResult.snapshot.quests.worldFacts['harbor-lamp-service'], 'serviced');
  scene.progressionSnapshot = paidResult.snapshot;
  assert.equal(
    runtime.renderItems().find((item) => item.id === 'field-quest-lamp:bulb').fill,
    '#b6d6b0',
  );
  assert.equal(runtime.workLights().length, 0);

  // Prepare a fresh actual night occurrence through the same pure state writer.
  let campaign = scene.progressionSnapshot.scrapCampaign;
  for (let i = campaign.elapsedSegments; i < 3; i++)
    campaign = commitScrapCampaignAction(
      campaign,
      {
        actionId: 'fixture:night:' + i,
        kind: SCRAP_CAMPAIGN_ACTION_KIND.REST,
        label: '휴식',
        costSegments: 1,
      },
      scene.scrapCampaignProfile,
    ).snapshot;
  scene.progressionSnapshot = {
    ...scene.progressionSnapshot,
    scrapCampaign: campaign,
    quests: createQuestState(3),
  };
  scene.setVisualQaLocation({
    regionId: 'abandoned-mine',
    roomId: 'abandoned-mine-roadhead',
    x: 1050,
  });
  let quests = reconcileQuests(scene.progressionSnapshot.quests, runtime.context()).state;
  const night = quests.records.find((r) => r.profileId === 'mine-night-workline');
  quests = acceptQuest(quests, night.instanceId, runtime.context()).state;
  scene.progressionSnapshot = { ...scene.progressionSnapshot, quests };
  const mapSnapshot = scene.mapRuntime.getResolvedSnapshot(),
    mapBefore = JSON.stringify(mapSnapshot);
  const decorated = runtime.decorateSnapshot(mapSnapshot);
  const entity = decorated.entities.find((entity) => entity.questInstanceId === night.instanceId);
  assert.ok(entity);
  assert.equal(entity.maxHealth, 58);
  assert.equal(entity.encounterProfileId, 'mine-claim-jacker');
  assert.equal(JSON.stringify(mapSnapshot), mapBefore);
  assert.equal(
    runtime.decorateSnapshot(decorated),
    decorated,
    'repeated decoration does not duplicate entity',
  );
  assert.equal(runtime.workLights().length, 1);
  assert.equal(
    runtime
      .decorateSnapshot({
        ...mapSnapshot,
        entities: [
          ...mapSnapshot.entities,
          { id: 'other-fight', kind: 'combat-enemy', enabled: true },
        ],
      })
      .entities.some((entity) => entity.questInstanceId),
    false,
    'existing fight is never replaced',
  );
  const offset = runtime.decorateSnapshot({
    ...mapSnapshot,
    room: {
      ...mapSnapshot.room,
      bounds: { ...mapSnapshot.room.bounds, x: 3000, y: 200 },
      groundY: 626,
    },
  });
  assert.deepEqual(offset.entities.find((entity) => entity.questInstanceId).position, {
    x: 4050,
    y: 626,
  });
  assert.equal(
    runtime.completionEvent({
      entityId: entity.id,
      profileId: entity.encounterProfileId,
      resolutionState: 'defeated',
    }),
    null,
    'unowned completion event cannot spoof combat',
  );
  originalRoom = scene.roomSceneNode;
  testEncounter = scene.encounterFactory({
    entity,
    groundY: mapSnapshot.room.groundY,
    movementBounds: mapSnapshot.room.movementBounds,
    spinContact: { hitPulses: [0.3, 0.5, 0.7], contactSpacings: [23, 17, 5] },
  });
  scene.roomSceneNode = { location: mapSnapshot.active, encounter: testEncounter };
  const fakeEvent = {
    type: 'encounter-completed',
    instanceId: night.instanceId,
    occurrenceId: getQuestOccurrenceId(night),
    sourceId: 'mine-night-workline',
    roomId: mapSnapshot.room.id,
  };
  assert.throws(() => runtime.perform(fakeEvent), /has not completed/);
  const result = testEncounter.completeForVisualQa(),
    completion = runtime.completionEvent(result);
  assert.ok(completion);
  const reward = runtime.perform(completion);
  assert.equal(reward.acquisitions.length, 1);
  scene.progressionSnapshot = reward.snapshot;
  assert.equal(runtime.completionEvent(result), null);
  assert.equal(
    runtime.decorateSnapshot(mapSnapshot),
    mapSnapshot,
    'resolved occurrence does not respawn after entry/reload',
  );
  assert.ok(
    runtime
      .renderItems()
      .every((item) =>
        item.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
      ),
  );
  console.log(
    JSON.stringify({
      status: 'PASS',
      checks: [
        'actual-map-bfs-and-garage-availability',
        'pure-prepare-accept-paid-clock-and-atomic-reward-drafts',
        'local-field-source-and-hidden-tool-once',
        'authored-world-lamp-and-night-light',
        'night-occurrence-no-overwrite-offset-idempotence',
        'actual-combat-completion-source-and-no-respawn',
      ],
    }),
  );
} finally {
  if (originalRoom) scene.roomSceneNode = originalRoom;
  testEncounter?.dispose();
  scene.dispose();
}
