import { EQUIPMENT_CATALOG } from '../../src/game/equipment/EquipmentCatalog.js';
import {
  DEFAULT_LOADOUT,
  EQUIPMENT_SLOT_KEYS,
  resolveEquipmentLoadout,
} from '../../src/game/equipment/EquipmentLoadout.js';
import { createProgressionSnapshot } from '../../src/game/progression/ProgressionState.js';
import { canonicalizeEnchantmentSnapshot } from '../../src/game/enchantment/EnchantmentState.js';
import { ENCHANTMENT_CATALOG } from '../../src/game/enchantment/EnchantmentCatalog.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../../src/game/campaign/ScrapCampaignProfiles.js';
export function itemLoadout(id) {
  const item = EQUIPMENT_CATALOG.getItem(id);
  return {
    ...DEFAULT_LOADOUT,
    [EQUIPMENT_SLOT_KEYS[EQUIPMENT_CATALOG.getFamily(item.familyId).slot]]: id,
  };
}
export const CUTTER_LOADOUTS = EQUIPMENT_CATALOG.items
  .filter((i) => i.familyId === 'field-cutter')
  .map((i) => ({ ...resolveEquipmentLoadout(itemLoadout(i.id)), id: i.id }));
export function equipmentTestSnapshot(id) {
  const base = createProgressionSnapshot(
      EQUIPMENT_CATALOG.defaultItemId,
      ENCHANTMENT_CATALOG,
      SCRAP_CAMPAIGN_PROFILE,
    ),
    ids = [...new Set([...base.ownedEquipmentItemIds, id])];
  return {
    ...base,
    ownedEquipmentItemIds: ids,
    everOwnedEquipmentItemIds: ids,
    loadout: itemLoadout(id),
    enchantment: canonicalizeEnchantmentSnapshot(base.enchantment, ENCHANTMENT_CATALOG, ids),
  };
}
