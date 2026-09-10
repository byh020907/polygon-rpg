import { assertProgressionSnapshot, mergeProgressionSnapshot } from './ProgressionState.js';
import { EQUIPMENT_CATALOG } from '../equipment/EquipmentCatalog.js';
import { getMaterialQuantity, spendMaterial } from './MaterialLedger.js';
export function getEquipmentUpgradeCap(snapshot) {
  const count = snapshot.scrapCampaign.collectedPartIds.length;
  return count >= 4 ? 3 : count >= 2 ? 2 : 1;
}
export function upgradeEquipment(snapshot, itemId, catalog = EQUIPMENT_CATALOG) {
  assertProgressionSnapshot(snapshot, undefined, catalog);
  const item = catalog.getItem(itemId),
    slot = catalog.getFamily(item.familyId).slot;
  const fail = (reason) => Object.freeze({ changed: false, reason, snapshot });
  if (!snapshot.ownedEquipmentItemIds.includes(itemId)) return fail('not-owned');
  if (slot === 'tool') return fail('not-upgradeable');
  const level = (snapshot.equipmentUpgrades[itemId] ?? 0) + 1;
  if (level > getEquipmentUpgradeCap(snapshot)) return fail('upgrade-cap');
  const goldCost = 40 * level,
    materialCost = 3 * level;
  if (snapshot.gold < goldCost) return fail('insufficient-gold');
  if (getMaterialQuantity(snapshot, 'salvaged-steel') < materialCost)
    return fail('insufficient-material');
  let next = spendMaterial(snapshot, 'salvaged-steel', materialCost).snapshot;
  next = {
    ...next,
    gold: next.gold - goldCost,
    equipmentUpgrades: { ...snapshot.equipmentUpgrades, [itemId]: level },
  };
  return Object.freeze({
    changed: true,
    reason: 'equipment-upgraded',
    level,
    goldCost,
    materialCost,
    snapshot: mergeProgressionSnapshot(snapshot, next, catalog),
  });
}
