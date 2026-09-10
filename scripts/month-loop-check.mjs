import { reconcileQuests, acceptQuest, applyQuestEvent } from '../src/game/quests/QuestState.js';
import { QUEST_CATALOG, getQuestOccurrenceId } from '../src/game/quests/QuestProfiles.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import assert from 'node:assert/strict';
import {
  createProgressionSnapshot,
  mergeProgressionSnapshot,
  assertProgressionSnapshot,
  selectEquipment,
} from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import {
  getMaterialLedger,
  getMaterialQuantity,
  awardMaterial,
  spendMaterial,
} from '../src/game/progression/MaterialLedger.js';
import { applyRewardBundle } from '../src/game/progression/RewardTransactions.js';
import {
  upgradeEquipment,
  getEquipmentUpgradeCap,
} from '../src/game/progression/EquipmentUpgrade.js';
import {
  EQUIPMENT_CATALOG,
  createEquipmentCatalog,
} from '../src/game/equipment/EquipmentCatalog.js';
import { resolveEquipmentLoadout } from '../src/game/equipment/EquipmentLoadout.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';
import { SCRAP_EQUIPMENT_FORGE_PROFILE } from '../src/game/progression/ProgressionProfiles.js';
import { createInitialMorningRecoveryRequest } from '../src/game/progression/CampaignRecoveryPolicy.js';
const fresh = createProgressionSnapshot(
  EQUIPMENT_CATALOG.defaultItemId,
  ENCHANTMENT_CATALOG,
  SCRAP_CAMPAIGN_PROFILE,
);
assert.equal(fresh.version, 12);
assert.equal(fresh.materials['salvaged-steel'], 0);
assert.ok(!fresh.ownedEquipmentItemIds.includes('field-work-lamp'));
const materialId = ENCHANTMENT_CATALOG.profiles[0].materialId,
  forgeId = SCRAP_EQUIPMENT_FORGE_PROFILE.materialId;
const request = {
  claimId: 'quest:fixture:day:1:reward',
  bundle: {
    gold: 200,
    trainingMarks: 2,
    materials: { 'salvaged-steel': 30, [materialId]: 4, [forgeId]: 1 },
    equipmentItemIds: ['field-work-lamp'],
  },
};
const rewarded = applyRewardBundle(fresh, request);
assert.equal(rewarded.changed, true);
assert.equal(rewarded.snapshot.gold, 200);
assert.equal(getMaterialQuantity(rewarded.snapshot, materialId), 4);
assert.equal(rewarded.snapshot.enchantment.materialQuantities[materialId], 4);
assert.equal(rewarded.snapshot.equipmentForge.materialQuantities[forgeId], 1);
assert.deepEqual(rewarded.snapshot.materials, { 'salvaged-steel': 30 });
assert.equal(rewarded.acquisition.kind, 'equipment');
assert.ok(rewarded.acquisition.lines.some((l) => l.slot === '도구'));
assert.ok(Object.isFrozen(rewarded.acquisition));
assert.equal(applyRewardBundle(rewarded.snapshot, request).changed, false);
assert.equal(applyRewardBundle(rewarded.snapshot, request).acquisition, null);
assert.deepEqual(fresh.materials, { 'salvaged-steel': 0 });
assert.equal(selectEquipment(rewarded.snapshot, 'field-work-lamp').changed, true);
assert.ok(
  resolveEquipmentLoadout(
    selectEquipment(rewarded.snapshot, 'field-work-lamp').snapshot.loadout,
  ).fieldCapabilities.includes('illuminate'),
);
assert.throws(() =>
  applyRewardBundle(fresh, { claimId: 'bad', bundle: { gold: 20, materials: { unknown: 2 } } }),
);
assert.equal(fresh.gold, 0);
assert.throws(() =>
  getMaterialLedger({ ...fresh, materials: { 'salvaged-steel': 0, [materialId]: 1 } }),
);
assert.equal(spendMaterial(fresh, 'salvaged-steel', 1).changed, false);
assert.equal(awardMaterial(fresh, 'salvaged-steel', 1).snapshot.materials['salvaged-steel'], 1);
const baseline = resolveEquipmentLoadout(fresh.loadout),
  level1 = upgradeEquipment(rewarded.snapshot, fresh.loadout.weaponItemId);
assert.equal(level1.level, 1);
assert.equal(level1.goldCost, 40);
assert.equal(level1.materialCost, 3);
assert.equal(level1.snapshot.gold, 160);
assert.equal(getMaterialQuantity(level1.snapshot, 'salvaged-steel'), 27);
assert.equal(upgradeEquipment(level1.snapshot, fresh.loadout.weaponItemId).reason, 'upgrade-cap');
const resolved = resolveEquipmentLoadout(
  fresh.loadout,
  EQUIPMENT_CATALOG,
  level1.snapshot.equipmentUpgrades,
);
assert.equal(resolved.attackModifiers.damageScale, baseline.attackModifiers.damageScale * 1.08);
assert.deepEqual(resolved.combatTiming, baseline.combatTiming);
assert.deepEqual(resolved.geometryProfile, baseline.geometryProfile);
assert.deepEqual(level1.snapshot.loadout, fresh.loadout);
const partIds = SCRAP_CAMPAIGN_PROFILE.regions.map((r) => r.part.id);
let progressed = mergeProgressionSnapshot(level1.snapshot, {
  gold: 1000,
  scrapCampaign: { ...level1.snapshot.scrapCampaign, collectedPartIds: partIds.slice(0, 2) },
});
assert.equal(getEquipmentUpgradeCap(progressed), 2);
progressed = upgradeEquipment(progressed, fresh.loadout.weaponItemId).snapshot;
progressed = mergeProgressionSnapshot(progressed, {
  scrapCampaign: { ...progressed.scrapCampaign, collectedPartIds: partIds.slice(0, 4) },
});
assert.equal(upgradeEquipment(progressed, fresh.loadout.weaponItemId).level, 3);
assert.equal(upgradeEquipment(rewarded.snapshot, 'field-work-lamp').reason, 'not-upgradeable');
const v11 = structuredClone(fresh);
for (const k of ['quests', 'materials', 'rewardClaims', 'equipmentUpgrades']) delete v11[k];
v11.version = 11;
v11.gold = 123;
v11.scrapCampaign.elapsedSegments = 4;
v11.scrapCampaign.rivalProgressSegments = 4;
class Memory {
  values = new Map();
  fail = false;
  getItem(k) {
    return this.values.get(k) ?? null;
  }
  setItem(k, v) {
    if (this.fail) throw new Error('write');
    this.values.set(k, v);
  }
}
const memory = new Memory(),
  storage = new ProgressionStorage(
    memory,
    'field',
    ENCHANTMENT_CATALOG,
    SCRAP_EQUIPMENT_FORGE_PROFILE,
    SCRAP_CAMPAIGN_PROFILE,
  ),
  load = () =>
    storage.load(
      EQUIPMENT_CATALOG.defaultItemId,
      EQUIPMENT_CATALOG.items.map((i) => i.id),
    );
memory.setItem('field', JSON.stringify(v11));
const original = memory.getItem('field'),
  migrated = load();
assert.equal(migrated.ok, true);
assert.equal(migrated.snapshot.version, 12);
for (const [key, value] of Object.entries(v11))
  if (key !== 'version') assert.deepEqual(migrated.snapshot[key], value);
assert.equal(migrated.snapshot.quests.lastElapsedSegments, 4);
assert.equal(memory.getItem('field'), original);
assert.equal(storage.save(rewarded.snapshot).ok, true);
assert.deepEqual(load().snapshot, rewarded.snapshot);
memory.fail = true;
assert.equal(storage.save(level1.snapshot).ok, false);
memory.fail = false;
const recovery = createInitialMorningRecoveryRequest(fresh, SCRAP_CAMPAIGN_PROFILE);
memory.setItem(
  'field.recovery.v1',
  JSON.stringify({
    version: 1,
    slots: { [recovery.slotId]: { metadata: recovery.metadata, snapshot: v11 } },
  }),
);
const records = storage.loadRecoverySlots(
  EQUIPMENT_CATALOG.defaultItemId,
  EQUIPMENT_CATALOG.items.map((i) => i.id),
);
assert.equal(records.ok, true);
assert.equal(records.records[0].snapshot.version, 12);
for (const mutation of [
  (s) => (s.materials.bad = 1),
  (s) => (s.equipmentUpgrades['field-work-lamp'] = 1),
  (s) => (s.rewardClaims = ['same', 'same']),
  (s) => (s.quests.unknown = true),
]) {
  const bad = structuredClone(fresh);
  mutation(bad);
  assert.throws(() => assertProgressionSnapshot(bad));
}
const catalogData = () => ({
  families: structuredClone(EQUIPMENT_CATALOG.families),
  movesets: structuredClone(EQUIPMENT_CATALOG.movesets),
  items: structuredClone(EQUIPMENT_CATALOG.items),
  sets: structuredClone(EQUIPMENT_CATALOG.sets),
  specialSynergies: structuredClone(EQUIPMENT_CATALOG.specialSynergies),
  defaultItemId: EQUIPMENT_CATALOG.defaultItemId,
});
const data = catalogData();
for (const item of data.items) item.setId = 'fixture-all-slots';
data.sets = [
  {
    id: 'fixture-all-slots',
    pieceItemIds: data.items.map((i) => i.id),
    bonuses: [{ id: 'fixture-six', pieces: 6, modifiers: { attack: { damageScale: 1.01 } } }],
  },
];
const six = createEquipmentCatalog(data),
  loadout = {
    weaponItemId: 'field-cutter-balanced',
    shieldItemId: 'field-shield-standard',
    helmetItemId: 'field-work-helmet',
    bodyArmorItemId: 'field-work-body',
    bootsItemId: 'field-work-boots',
    toolItemId: 'field-work-lamp',
  };
assert.equal(resolveEquipmentLoadout(loadout, six).activeSetBonuses[0].equippedPieces, 6);
data.sets[0].pieceItemIds.push('missing');
assert.throws(() => createEquipmentCatalog(data));
const questContext = {
  elapsedSegments: 0,
  garageRevealed: true,
  accessibleRoomIds: ['abandoned-mine-roadhead', 'harbor-shipyard-roadhead'],
  fieldCapabilities: ['cable-cut'],
};
const issued = reconcileQuests(fresh.quests, questContext).state;
const selected = issued.records.find((r) => r.profileId === 'mine-lamp-check');
assert.ok(selected);
const accepted = acceptQuest(issued, selected.instanceId, questContext).state;
const active = accepted.records.find((r) => r.instanceId === selected.instanceId),
  profile = QUEST_CATALOG.getProfile(active.profileId);
const completed = applyQuestEvent(
  accepted,
  {
    type: 'field-action',
    instanceId: active.instanceId,
    occurrenceId: getQuestOccurrenceId(active),
    sourceId: profile.objective.sourceId,
    roomId: profile.objective.roomId,
  },
  questContext,
);
assert.equal(completed.rewards.length, 1);
const acceptedSnapshot = mergeProgressionSnapshot(fresh, { quests: accepted });
const completedDraft = mergeProgressionSnapshot(acceptedSnapshot, { quests: completed.state });
const committed = applyRewardBundle(completedDraft, completed.rewards[0]);
assert.equal(committed.snapshot.gold, 24);
assert.equal(getMaterialQuantity(committed.snapshot, 'salvaged-steel'), 2);
assert.equal(committed.acquisition.kind, 'quest');
assert.equal(
  acceptedSnapshot.quests.records.find((r) => r.instanceId === active.instanceId).status,
  'accepted',
);
assert.equal(applyRewardBundle(committed.snapshot, completed.rewards[0]).changed, false);
assert.equal(storage.save(committed.snapshot).ok, true);
assert.deepEqual(load().snapshot, committed.snapshot);
assert.throws(() =>
  applyRewardBundle(completedDraft, {
    ...completed.rewards[0],
    bundle: { materials: { unknown: 1 } },
  }),
);
assert.equal(acceptedSnapshot.rewardClaims.length, 0);
const koScene = createTestGameScene({ progressionSnapshot: level1.snapshot });
const beforeKo = koScene.getProgressionSnapshot();
koScene.respawnPlayerAfterKo();
const afterKo = koScene.getProgressionSnapshot();
for (const key of [
  'gold',
  'trainingMarks',
  'materials',
  'equipmentForge',
  'enchantment',
  'ownedEquipmentItemIds',
  'loadout',
  'everOwnedEquipmentItemIds',
  'discoveredSpecialSynergyIds',
  'equipmentUpgrades',
  'rewardClaims',
])
  assert.deepEqual(afterKo[key], beforeKo[key], 'KO preserves ' + key);
assert.equal(afterKo.scrapCampaign.elapsedSegments, beforeKo.scrapCampaign.elapsedSegments + 1);
assert.equal(koScene.playerHealth, koScene.playerMaxHealth);
console.log(
  'PASS monthly progression: v11/v10 additive path, logical material ownership, atomic rewards/claims/acquisition, reusable lamp, upgrade caps/costs/sidegrade parity and explicit six-slot set pieces',
);
