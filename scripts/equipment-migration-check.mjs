import assert from 'node:assert/strict';
import { EQUIPMENT_CATALOG } from '../src/game/equipment/EquipmentCatalog.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';
import { SCRAP_EQUIPMENT_FORGE_PROFILE } from '../src/game/progression/ProgressionProfiles.js';
import {
  createProgressionSnapshot,
  selectEquipment,
  unequipEquipment,
  purchaseEquipment,
  upgradeEquipmentEnchantment,
} from '../src/game/progression/ProgressionState.js';
import { LEGACY_EQUIPMENT_ID_ALIASES } from '../src/game/progression/EquipmentSaveMigration.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import { createInitialMorningRecoveryRequest } from '../src/game/progression/CampaignRecoveryPolicy.js';
const fresh = createProgressionSnapshot(
  EQUIPMENT_CATALOG.defaultItemId,
  ENCHANTMENT_CATALOG,
  SCRAP_CAMPAIGN_PROFILE,
);
const legacy = {
  version: 10,
  gold: 450,
  trainingMarks: 7,
  combatSkillLevel: 2,
  viewedConversationIds: ['fixture-conversation'],
  ownedEquipmentIds: Object.keys(LEGACY_EQUIPMENT_ID_ALIASES),
  equippedEquipmentId: 'balanced-sword',
  weaponForge: {
    materialQuantities: { 'salvaged-drive-core': 2 },
    claimedSourceIds: ['scrap-yard-guard-collector'],
    selectedProfileIdsByGroup: { 'scrap-weapon-archetype': 'swift-chain-sword' },
  },
  scrapCampaign: structuredClone(fresh.scrapCampaign),
  enchantment: {
    materialQuantities: Object.fromEntries(
      ENCHANTMENT_CATALOG.profiles.map((p) => [p.materialId, 9]),
    ),
    swordEnchantments: Object.fromEntries(
      Object.keys(LEGACY_EQUIPMENT_ID_ALIASES).map((id) => [id, { elementId: 'fire', level: 3 }]),
    ),
  },
};
class Memory {
  values = new Map();
  fail = false;
  getItem(k) {
    return this.values.get(k) ?? null;
  }
  setItem(k, v) {
    if (this.fail) throw new Error('write failure');
    this.values.set(k, v);
  }
}
const memory = new Memory(),
  store = new ProgressionStorage(
    memory,
    'save',
    ENCHANTMENT_CATALOG,
    SCRAP_EQUIPMENT_FORGE_PROFILE,
    SCRAP_CAMPAIGN_PROFILE,
  );
const load = () =>
  store.load(
    EQUIPMENT_CATALOG.defaultItemId,
    EQUIPMENT_CATALOG.items.map((i) => i.id),
  );
for (const [id, mapped] of Object.entries(LEGACY_EQUIPMENT_ID_ALIASES)) {
  const value = { ...legacy, equippedEquipmentId: id };
  const bytes = JSON.stringify(value);
  memory.setItem('save', bytes);
  const result = load();
  assert.equal(result.ok, true);
  const s = result.snapshot;
  assert.equal(s.version, 11);
  assert.equal(s.loadout.weaponItemId, mapped);
  assert.equal(s.loadout.shieldItemId, 'field-shield-standard');
  assert.equal(s.loadout.helmetItemId, null);
  assert.equal(s.gold, 450);
  assert.equal(s.trainingMarks, 7);
  assert.equal(s.combatSkillLevel, 2);
  assert.deepEqual(s.scrapCampaign, value.scrapCampaign);
  assert.deepEqual(s.viewedConversationIds, value.viewedConversationIds);
  assert.deepEqual(s.enchantment.materialQuantities, value.enchantment.materialQuantities);
  assert.equal(s.enchantment.equipmentEnchantments[mapped].level, 3);
  for (const [oldId, newId] of Object.entries(LEGACY_EQUIPMENT_ID_ALIASES))
    assert.deepEqual(
      s.enchantment.equipmentEnchantments[newId],
      value.enchantment.swordEnchantments[oldId],
    );
  assert.deepEqual(s.equipmentForge.materialQuantities, value.weaponForge.materialQuantities);
  assert.deepEqual(s.equipmentForge.claimedSourceIds, value.weaponForge.claimedSourceIds);
  assert.equal(
    s.equipmentForge.selectedItemIdsByGroup['scrap-weapon-archetype'],
    'field-cutter-swift',
  );
  assert.ok(s.ownedEquipmentItemIds.includes('field-work-boots'));
  assert.equal(memory.getItem('save'), bytes, 'decoding never mutates old bytes');
  memory.fail = true;
  assert.equal(store.save(s).ok, false);
  assert.equal(memory.getItem('save'), bytes);
  memory.fail = false;
  assert.equal(store.save(s).ok, true);
  assert.deepEqual(load().snapshot, s, 'v11 reading is idempotent');
}
for (const change of [
  (v) => (v.gold = -1),
  (v) => v.ownedEquipmentIds.push('unknown'),
  (v) => (v.equippedEquipmentId = 'unknown'),
  (v) => (v.enchantment.swordEnchantments['balanced-sword'].level = 6),
  (v) => delete v.enchantment.materialQuantities[ENCHANTMENT_CATALOG.profiles[0].materialId],
  (v) => (v.weaponForge.selectedProfileIdsByGroup.bad = 'heavy-sword'),
  (v) => (v.surprise = true),
]) {
  const bad = structuredClone(legacy);
  change(bad);
  const bytes = JSON.stringify(bad);
  memory.setItem('save', bytes);
  assert.equal(load().ok, false);
  assert.equal(memory.getItem('save'), bytes);
}
for (const change of [
  (v) => delete v.loadout.helmetItemId,
  (v) => (v.loadout.weaponItemId = 'field-shield-standard'),
  (v) => (v.everOwnedEquipmentItemIds = []),
  (v) => (v.discoveredSpecialSynergyIds = ['unknown']),
  (v) =>
    (v.enchantment.equipmentEnchantments['field-shield-standard'] = { elementId: null, level: 0 }),
  (v) => (v.unknown = true),
]) {
  const bad = structuredClone(fresh);
  change(bad);
  memory.setItem('save', JSON.stringify(bad));
  assert.equal(load().ok, false);
}
const recovery = createInitialMorningRecoveryRequest(fresh, SCRAP_CAMPAIGN_PROFILE);
for (const source of [legacy, fresh]) {
  for (const mutate of [
    (campaign) => {
      campaign.unrecognizedState = { hidden: true };
    },
    (campaign) => {
      campaign.regionStates.unrecognizedRegion = 'available';
    },
    (campaign) => {
      campaign.regionEventStageIds.unrecognizedRegion = null;
    },
  ]) {
    const malformed = structuredClone(source);
    mutate(malformed.scrapCampaign);
    const bytes = JSON.stringify(malformed);
    memory.setItem('save', bytes);
    assert.equal(load().ok, false, 'unknown campaign fields must not be silently discarded');
    assert.equal(memory.getItem('save'), bytes);
    if (source.version === 11) {
      assert.equal(store.save(malformed).ok, false);
      assert.equal(memory.getItem('save'), bytes);
    }
    const envelope = {
      version: 1,
      slots: { [recovery.slotId]: { metadata: recovery.metadata, snapshot: malformed } },
    };
    const recoveryBytes = JSON.stringify(envelope);
    memory.setItem('save.recovery.v1', recoveryBytes);
    assert.equal(
      store.loadRecoverySlots(
        EQUIPMENT_CATALOG.defaultItemId,
        EQUIPMENT_CATALOG.items.map((i) => i.id),
      ).ok,
      false,
    );
    assert.equal(memory.getItem('save.recovery.v1'), recoveryBytes);
  }
}
memory.values.delete('save.recovery.v1');
assert.ok(recovery);
assert.equal(store.saveRecoverySlot(recovery.slotId, fresh, recovery.metadata).ok, true);
const envelope = JSON.parse(memory.getItem('save.recovery.v1'));
envelope.slots[recovery.slotId].snapshot = legacy;
const recoveryBytes = JSON.stringify(envelope);
memory.setItem('save.recovery.v1', recoveryBytes);
const slots = store.loadRecoverySlots(
  EQUIPMENT_CATALOG.defaultItemId,
  EQUIPMENT_CATALOG.items.map((i) => i.id),
);
assert.equal(slots.ok, true);
assert.equal(slots.records[0].snapshot.version, 11);
assert.equal(memory.getItem('save.recovery.v1'), recoveryBytes);
assert.deepEqual(slots.records[0].metadata, envelope.slots[recovery.slotId].metadata);
memory.fail = true;
assert.equal(store.saveRecoverySlot(recovery.slotId, fresh, recovery.metadata).ok, false);
assert.equal(memory.getItem('save.recovery.v1'), recoveryBytes);
memory.fail = false;
const invalidEnvelope = structuredClone(envelope);
invalidEnvelope.slots[recovery.slotId].snapshot.gold = -1;
const invalidRecoveryBytes = JSON.stringify(invalidEnvelope);
memory.setItem('save.recovery.v1', invalidRecoveryBytes);
assert.equal(store.saveRecoverySlot(recovery.slotId, fresh, recovery.metadata).ok, false);
assert.equal(
  memory.getItem('save.recovery.v1'),
  invalidRecoveryBytes,
  'malformed old recovery is never overwritten',
);
memory.setItem('save.recovery.v1', recoveryBytes);
let equipped = selectEquipment(fresh, 'field-work-boots');
assert.equal(equipped.changed, true);
assert.equal(equipped.snapshot.loadout.bootsItemId, 'field-work-boots');
assert.equal(unequipEquipment(equipped.snapshot, 'boots').snapshot.loadout.bootsItemId, null);
assert.equal(unequipEquipment(fresh, 'weapon').changed, false);
const purchased = purchaseEquipment(
  { ...fresh, gold: 120 },
  { itemId: 'field-cutter-heavy', goldCost: 120 },
);
assert.equal(purchased.changed, true);
assert.ok(purchased.snapshot.everOwnedEquipmentItemIds.includes('field-cutter-heavy'));
let combination = selectEquipment(purchased.snapshot, 'field-cutter-heavy').snapshot;
combination = selectEquipment(combination, 'field-work-boots').snapshot;
assert.ok(combination.discoveredSpecialSynergyIds.length > 0);
const known = combination.discoveredSpecialSynergyIds;
assert.deepEqual(
  unequipEquipment(combination, 'boots').snapshot.discoveredSpecialSynergyIds,
  known,
);
assert.equal(store.save(combination).ok, true);
assert.deepEqual(load().snapshot.discoveredSpecialSynergyIds, known);
assert.equal(
  upgradeEquipmentEnchantment(
    fresh,
    { itemId: 'field-shield-standard', elementId: 'fire' },
    ENCHANTMENT_CATALOG,
  ).changed,
  false,
);
console.log(
  'PASS equipment v10/v11 migration: five aliases, six slots, economics/campaign/forge/enchants preserved, recovery, failure/no overwrite, malformed rejection and persistent discovery',
);
