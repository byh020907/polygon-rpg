import assert from 'node:assert/strict';

import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';
import {
  SCRAP_CAMPAIGN_ACTION_KIND,
  commitScrapCampaignAction,
  createScrapCampaignSnapshot,
  getScrapCampaignReadModel,
  previewScrapCampaignAction,
  toScrapCampaignSnapshot,
} from '../src/game/campaign/ScrapCampaignState.js';
import { SCRAP_FINAL_BATTLE_STAGE } from '../src/game/campaign/ScrapFinalBattleState.js';
import { createScrapFinalBattlePresentation } from '../src/game/campaign/ScrapFinalBattlePresentation.js';
import {
  createScrapFinalBattleCombatState,
  resolveScrapFinalBattleCombatContact,
} from '../src/game/campaign/ScrapFinalBattleCombat.js';

function finalAction(stageId) {
  return Object.freeze({
    actionId: `final-battle:${stageId}`,
    label: `최종전 · ${stageId}`,
    kind: SCRAP_CAMPAIGN_ACTION_KIND.FINAL_BATTLE_STAGE,
    finalBattleStageId: stageId,
    costSegments: 0,
  });
}

const initial = createScrapCampaignSnapshot(SCRAP_CAMPAIGN_PROFILE);
const lockedPreview = previewScrapCampaignAction(
  initial,
  finalAction(SCRAP_FINAL_BATTLE_STAGE.ARMOR),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(lockedPreview.allowed, false);
assert.match(lockedPreview.blockedReason, /다섯 산업기계 part/);

const allPartsSnapshot = toScrapCampaignSnapshot(
  {
    ...initial,
    collectedPartIds: SCRAP_CAMPAIGN_PROFILE.regions.map((region) => region.part.id),
    lastChangeLabel: '다섯 산업기계 조립 완료',
  },
  SCRAP_CAMPAIGN_PROFILE,
);
let current = allPartsSnapshot;
for (const stageId of [
  SCRAP_FINAL_BATTLE_STAGE.ARMOR,
  SCRAP_FINAL_BATTLE_STAGE.WEAPON,
  SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE,
  SCRAP_FINAL_BATTLE_STAGE.CORE_REINSTALLED,
  SCRAP_FINAL_BATTLE_STAGE.EPILOGUE,
]) {
  const transaction = commitScrapCampaignAction(
    current,
    finalAction(stageId),
    SCRAP_CAMPAIGN_PROFILE,
  );
  assert.equal(transaction.changed, true);
  assert.equal(transaction.snapshot.finalBattleStageId, stageId);
  assert.equal(transaction.snapshot.elapsedSegments, current.elapsedSegments);
  current = transaction.snapshot;
}

const readModel = getScrapCampaignReadModel(current, SCRAP_CAMPAIGN_PROFILE);
assert.equal(readModel.finalBattle.complete, true);
assert.equal(readModel.finalBattle.active, false);
assert.equal(readModel.finalBattleAvailable, false);
assert.match(readModel.finalBattle.cue, /공식 수거팀/);

const duplicate = commitScrapCampaignAction(
  current,
  finalAction(SCRAP_FINAL_BATTLE_STAGE.EPILOGUE),
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(duplicate.changed, false);
assert.equal(duplicate.reason, 'already-committed');

assert.throws(
  () =>
    commitScrapCampaignAction(
      allPartsSnapshot,
      finalAction(SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE),
      SCRAP_CAMPAIGN_PROFILE,
    ),
  /final battle은 armor stage부터 순서대로/,
);

const previousSchema = { ...allPartsSnapshot, version: 5 };
delete previousSchema.finalBattleStageId;
assert.equal(
  toScrapCampaignSnapshot(previousSchema, SCRAP_CAMPAIGN_PROFILE).finalBattleStageId,
  SCRAP_FINAL_BATTLE_STAGE.INACTIVE,
);

assert.throws(
  () =>
    toScrapCampaignSnapshot(
      { ...initial, finalBattleStageId: SCRAP_FINAL_BATTLE_STAGE.ARMOR },
      SCRAP_CAMPAIGN_PROFILE,
    ),
  /다섯 part/,
);

const armorPresentation = createScrapFinalBattlePresentation(SCRAP_FINAL_BATTLE_STAGE.ARMOR);
assert.deepEqual(
  armorPresentation
    .filter((item) => item.role === 'scrap-final-battle')
    .map((item) => item.id)
    .sort(),
  armorPresentation
    .filter((item) => item.role !== 'final-arena-horizon' && item.role !== 'final-arena-ground')
    .map((item) => item.id)
    .sort(),
);
assert.ok(armorPresentation.some((item) => item.id === 'scrap-final-counter-reactor'));
assert.ok(armorPresentation.some((item) => item.id === 'scrap-final-ancient-armor-left'));
assert.ok(armorPresentation.some((item) => item.id === 'scrap-final-armor-target'));

const weaponPresentation = createScrapFinalBattlePresentation(SCRAP_FINAL_BATTLE_STAGE.WEAPON);
assert.ok(weaponPresentation.some((item) => item.id === 'scrap-final-ancient-cutter-blade'));
assert.ok(weaponPresentation.some((item) => item.id === 'scrap-final-weapon-target'));

const controlPresentation = createScrapFinalBattlePresentation(
  SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE,
);
assert.ok(controlPresentation.some((item) => item.id === 'scrap-final-exposed-control-core'));
assert.ok(
  createScrapFinalBattlePresentation(SCRAP_FINAL_BATTLE_STAGE.EPILOGUE).some(
    (item) => item.id === 'scrap-final-epilogue-crane',
  ),
);
assert.deepEqual(createScrapFinalBattlePresentation(SCRAP_FINAL_BATTLE_STAGE.INACTIVE), []);

const weaponSweep = Object.freeze({
  part: 'weapon',
  points: Object.freeze([
    Object.freeze({ x: 796, y: 378 }),
    Object.freeze({ x: 850, y: 378 }),
    Object.freeze({ x: 850, y: 394 }),
    Object.freeze({ x: 796, y: 394 }),
  ]),
});
const finalAttackWindow = Object.freeze({ start: 0.2, end: 0.8 });
const armorContact = resolveScrapFinalBattleCombatContact({
  state: createScrapFinalBattleCombatState(SCRAP_FINAL_BATTLE_STAGE.ARMOR),
  combatState: Object.freeze({ id: 'slash', sequence: 7, progress: 0.5 }),
  attackProfile: finalAttackWindow,
  weaponSweep,
  openingActive: false,
});
assert.equal(armorContact.changed, false);
assert.equal(armorContact.reason, 'opening-required');
const firstArmorHit = resolveScrapFinalBattleCombatContact({
  state: armorContact.state,
  combatState: Object.freeze({ id: 'slash', sequence: 7, progress: 0.5 }),
  attackProfile: finalAttackWindow,
  weaponSweep,
  openingActive: true,
});
assert.equal(firstArmorHit.changed, true);
assert.equal(firstArmorHit.completed, false);
assert.equal(firstArmorHit.state.hitCount, 1);
assert.equal(
  resolveScrapFinalBattleCombatContact({
    state: firstArmorHit.state,
    combatState: Object.freeze({ id: 'slash', sequence: 7, progress: 0.5 }),
    attackProfile: finalAttackWindow,
    weaponSweep,
    openingActive: true,
  }).reason,
  'already-hit',
);
const secondArmorHit = resolveScrapFinalBattleCombatContact({
  state: firstArmorHit.state,
  combatState: Object.freeze({ id: 'thrust', sequence: 8, progress: 0.5 }),
  attackProfile: finalAttackWindow,
  weaponSweep,
  openingActive: true,
});
assert.equal(secondArmorHit.completed, true);
assert.equal(
  resolveScrapFinalBattleCombatContact({
    state: createScrapFinalBattleCombatState(SCRAP_FINAL_BATTLE_STAGE.WEAPON),
    combatState: Object.freeze({ id: 'slash', sequence: 9, progress: 0.5 }),
    attackProfile: finalAttackWindow,
    weaponSweep,
  }).reason,
  'wrong-command',
);
assert.equal(
  resolveScrapFinalBattleCombatContact({
    state: createScrapFinalBattleCombatState(SCRAP_FINAL_BATTLE_STAGE.WEAPON),
    combatState: Object.freeze({ id: 'heavy', sequence: 10, progress: 0.5 }),
    attackProfile: finalAttackWindow,
    weaponSweep,
  }).completed,
  true,
);

console.log('scrap final battle checks passed');
