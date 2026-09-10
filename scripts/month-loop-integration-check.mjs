import assert from 'node:assert/strict';
import { createGameScene } from '../src/app/createGameScene.js';
import { getMaterialLedger } from '../src/game/progression/MaterialLedger.js';
const neutral = {
  left: false,
  right: false,
  jump: false,
  guard: false,
  basicAttack: false,
  strongAttack: false,
};
function setup(region = 'abandoned-mine', room = 'abandoned-mine-roadhead', x = 340) {
  const scene = createGameScene();
  scene.enterTree();
  scene.setVisualQaScrapGarageRevealStage('complete');
  scene.setVisualQaLocation({ regionId: region, roomId: room, x });
  return scene;
}
let sequence = 0;
function interact(scene) {
  scene.update(1 / 120, { ...neutral, jump: true, jumpSequence: ++sequence });
  scene.update(1 / 120, { ...neutral, jumpSequence: sequence });
}
function rest(scene) {
  for (let i = 0; i < 240 && scene.combatCommands.active; i++)
    scene.update(1 / 120, { ...neutral, jumpSequence: sequence });
  scene.position.x = 340;
  assert.equal(scene.requestFieldRest(), true);
  assert.equal(scene.confirmScrapCampaignAction().started, true);
}
const scene = setup();
try {
  let board = 0;
  scene.fieldJournalRequested.connect(() => board++);
  interact(scene);
  assert.equal(board, 1);
  assert.equal(scene.isGrounded, true);
  const initial = scene.getFieldJournalView(),
    ids = initial.quests.general.map((q) => q.instanceId);
  assert.equal(ids.length, 4);
  assert.ok(initial.quests.main);
  const mine = initial.quests.general.find((q) => q.profileId === 'mine-lamp-check'),
    night = initial.quests.general.find((q) => q.profileId === 'mine-night-workline');
  scene.acceptGeneralQuest(mine.instanceId);
  scene.acceptGeneralQuest(night.instanceId);
  scene.position.x = 1230;
  interact(scene);
  assert.equal(scene.progressionSnapshot.gold, 24);
  assert.equal(
    scene.progressionSnapshot.quests.records.find((q) => q.instanceId === mine.instanceId).status,
    'completed',
  );
  scene.position.x = 280;
  interact(scene);
  assert.ok(scene.progressionSnapshot.ownedEquipmentItemIds.includes('field-work-lamp'));
  assert.equal(scene.progressionSnapshot.gold, 54);
  assert.equal(scene.progressionSnapshot.rewardClaims.length, 2);
  scene.equipOwnedItem('field-work-lamp');
  assert.ok(scene.createRenderFrame(1).items.some((i) => i.equipmentSlot === 'tool' && i.emissive));
  const palettes = [scene.createRenderFrame(1).palette.arena];
  for (let i = 0; i < 3; i++) {
    rest(scene);
    palettes.push(scene.createRenderFrame(1).palette.arena);
  }
  assert.equal(new Set(palettes).size, 4);
  assert.equal(scene.createRenderFrame(1).campaignTime.phaseId, 'night');
  assert.equal(scene.roomSceneNode.encounter.enemy.id, night.instanceId + ':enemy');
  scene.position.x = 1000;
  for (let tick = 0; tick < 1800; tick++) {
    scene.update(1 / 120, {
      ...neutral,
      strongAttack: tick % 140 === 0,
      strongAttackSequence: Math.floor(tick / 140) + 1,
      jumpSequence: sequence,
    });
    if (
      scene.progressionSnapshot.quests.records.find((q) => q.instanceId === night.instanceId)
        .status === 'completed'
    )
      break;
  }
  assert.equal(
    scene.progressionSnapshot.quests.records.find((q) => q.instanceId === night.instanceId).status,
    'completed',
  );
  assert.equal(scene.progressionSnapshot.gold, 90);
  assert.equal(scene.roomSceneNode.encounter, null);
  rest(scene);
  assert.equal(
    scene.progressionSnapshot.quests.worldFacts['harbor-lamp-service'],
    'temporary-lighting',
  );
  assert.ok(scene.acquisitionFeedback.snapshot().some((n) => n.kind === 'quest-deadline'));
  assert.equal(scene.getScrapAwakeningReadModel().finalBattleAvailable, false);
  assert.ok(scene.getWorldStatus().questOutcomes.some((o) => o.text.includes('임시')));
  const owned = JSON.stringify({
    gold: scene.progressionSnapshot.gold,
    materials: getMaterialLedger(scene.progressionSnapshot),
    items: scene.progressionSnapshot.ownedEquipmentItemIds,
    synergy: scene.progressionSnapshot.discoveredSpecialSynergyIds,
  });
  const time = scene.progressionSnapshot.scrapCampaign.elapsedSegments;
  scene.playerHealth = 0;
  scene.respawnPlayerAfterKo(neutral);
  assert.equal(scene.progressionSnapshot.scrapCampaign.elapsedSegments, time + 1);
  assert.equal(scene.playerHealth, scene.playerMaxHealth);
  assert.equal(
    JSON.stringify({
      gold: scene.progressionSnapshot.gold,
      materials: getMaterialLedger(scene.progressionSnapshot),
      items: scene.progressionSnapshot.ownedEquipmentItemIds,
      synergy: scene.progressionSnapshot.discoveredSpecialSynergyIds,
    }),
    owned,
  );
} finally {
  scene.dispose();
}
const harbor = setup('harbor-shipyard', 'harbor-shipyard-roadhead', 1230);
try {
  const q = harbor
    .getFieldJournalView()
    .quests.general.find((q) => q.profileId === 'harbor-lamp-service');
  harbor.acceptGeneralQuest(q.instanceId);
  interact(harbor);
  assert.equal(harbor.progressionSnapshot.scrapCampaign.elapsedSegments, 0);
  assert.equal(harbor.pendingScrapCampaignAction.type, 'field-work');
  harbor.cancelScrapCampaignAction();
  assert.equal(harbor.progressionSnapshot.gold, 0);
  interact(harbor);
  assert.equal(harbor.confirmScrapCampaignAction().started, true);
  assert.equal(harbor.progressionSnapshot.scrapCampaign.elapsedSegments, 1);
  assert.equal(harbor.progressionSnapshot.gold, 40);
  assert.equal(harbor.progressionSnapshot.quests.worldFacts['harbor-lamp-service'], 'serviced');
  assert.equal(harbor.confirmScrapCampaignAction().started, false);
  const npc = harbor
    .getStoryInteractionContext()
    .entities.find((e) => e.id === 'shipyard-waiting-crew');
  assert.ok(npc.lines.some((line) => line.includes('손봐')));
  assert.ok(harbor.getWorldStatus().questOutcomes.some((o) => o.text.includes('정비')));
  assert.deepEqual(harbor.progressionSnapshot.scrapCampaign.collectedPartIds, []);
  console.log(
    'PASS actual month loop: board input, free field reward, hidden lamp, four phases, native command night combat, expiry, important success/neglect/NPC/epilogue, KO resource preservation, paid confirm/cancel',
  );
} finally {
  harbor.dispose();
}

const rested = setup();
try {
  const consumed = { ...neutral, strongAttackSequence: 2, jumpSequence: sequence };
  rested.combatCommands.update(1 / 120, consumed);
  for (let i = 0; i < 240; i++) rested.update(1 / 120, consumed);
  rested.combatCommands.stamina = 1;
  rested.playerHealth = 23;
  assert.equal(rested.requestFieldRest(), true);
  rested.cancelScrapCampaignAction();
  assert.equal(rested.combatCommands.stamina, 1);
  assert.equal(rested.playerHealth, 23);
  assert.equal(rested.requestFieldRest(), true);
  rested.confirmScrapCampaignAction();
  assert.equal(rested.combatCommands.stamina, rested.combatCommands.staminaProfile.maximum);
  assert.equal(rested.playerHealth, rested.playerMaxHealth);
  rested.update(1 / 120, consumed);
  assert.equal(rested.combatCommands.active, null, 'rest must not replay consumed Strong edge');
  let opened = 0;
  rested.fieldJournalRequested.connect(() => opened++);
  rested.update(1 / 120, { ...consumed, jump: true, jumpSequence: ++sequence });
  assert.equal(opened, 1, 'first input after rest opens board');
} finally {
  rested.dispose();
}
console.log(
  'PASS rest cancellation, full recovery, consumed input preservation and first board input',
);
