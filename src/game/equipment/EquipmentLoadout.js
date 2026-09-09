import { getEquipmentStaminaProfile } from './EquipmentMovesetProfiles.js';
import { getAttackProfiles } from '../../combat/AttackProfileCatalog.js';
import { EQUIPMENT_CATALOG } from './EquipmentCatalog.js';
import {
  freezeEquipmentData,
  EQUIPMENT_SLOT_KEYS,
  EQUIPMENT_MODIFIER_DEFAULTS,
  multiplyEquipmentModifiers,
} from './EquipmentData.js';
import { evaluateEquipmentSynergies } from './EquipmentSynergy.js';
export { EQUIPMENT_SLOT_KEYS } from './EquipmentData.js';
export const DEFAULT_LOADOUT = freezeEquipmentData({
  weaponItemId: 'field-cutter-balanced',
  shieldItemId: 'field-shield-standard',
  helmetItemId: null,
  bodyArmorItemId: null,
  bootsItemId: null,
  toolItemId: null,
});
export const DEFAULT_OWNED_EQUIPMENT_ITEM_IDS = Object.freeze([
  'field-cutter-balanced',
  'field-shield-standard',
  'field-work-helmet',
  'field-work-body',
  'field-work-boots',
]);
export function normalizeLoadout(loadout = DEFAULT_LOADOUT) {
  if (!loadout || typeof loadout !== 'object' || Array.isArray(loadout))
    throw new TypeError('Equipment loadout required');
  const keys = Object.values(EQUIPMENT_SLOT_KEYS);
  if (Object.keys(loadout).some((key) => !keys.includes(key)))
    throw new TypeError('Unknown equipment loadout slot');
  const result = {};
  for (const key of keys) {
    const id = loadout[key] ?? null;
    if (id !== null && (typeof id !== 'string' || !id))
      throw new TypeError('Equipment slot requires an Item ID or null');
    result[key] = id;
  }
  if (result.weaponItemId === null) throw new TypeError('A weapon Item is required');
  return freezeEquipmentData(result);
}
export function validateLoadout(loadout, catalog = EQUIPMENT_CATALOG, { ownedItemIds } = {}) {
  const normalized = normalizeLoadout(loadout),
    used = new Set();
  const owned = ownedItemIds === undefined ? null : new Set(ownedItemIds);
  if (ownedItemIds !== undefined && !Array.isArray(ownedItemIds))
    throw new TypeError('Owned Item IDs must be an array');
  const families = {};
  for (const [slot, key] of Object.entries(EQUIPMENT_SLOT_KEYS)) {
    const id = normalized[key];
    if (id === null) {
      families[slot] = null;
      continue;
    }
    const item = catalog.getItem(id),
      family = catalog.getFamily(item.familyId);
    if (family.slot !== slot) throw new RangeError('Item does not fit equipment slot ' + slot);
    if (used.has(id)) throw new RangeError('One Item cannot occupy multiple slots');
    used.add(id);
    if (owned && !owned.has(id)) throw new RangeError('Cannot equip an unowned Item ' + id);
    families[slot] = family;
  }
  const main = families.weapon,
    off = families.shield;
  if (off) {
    const compatible =
      main.handUsage === 'twoHand'
        ? (main.twoHandCompatibleOffHandFamilies ?? [])
        : (main.compatibleOffHandFamilies ?? []);
    if (
      !compatible.includes(off.id) ||
      (off.compatibleMainFamilies && !off.compatibleMainFamilies.includes(main.id))
    )
      throw new RangeError('Incompatible equipment Families/hand usage');
  }
  if (!main.movesetBindings?.some((binding) => binding.offHandFamilyId === (off?.id ?? null)))
    throw new RangeError('Unsupported equipment combination moveset');
  return normalized;
}
export function resolveEquipmentLoadout(loadout, catalog = EQUIPMENT_CATALOG) {
  const normalized = validateLoadout(loadout, catalog);
  const itemsBySlot = Object.fromEntries(
    Object.entries(EQUIPMENT_SLOT_KEYS).map(([slot, key]) => [
      slot,
      normalized[key] === null ? null : catalog.getItem(normalized[key]),
    ]),
  );
  const mainItem = itemsBySlot.weapon,
    offHandItem = itemsBySlot.shield,
    utilityItem = itemsBySlot.tool;
  const mainFamily = catalog.getFamily(mainItem.familyId),
    offHandFamily = offHandItem ? catalog.getFamily(offHandItem.familyId) : null;
  const binding = mainFamily.movesetBindings.find(
    (entry) => entry.offHandFamilyId === (offHandFamily?.id ?? null),
  );
  const moveset = catalog.getMoveset(binding.movesetId);
  const modifiers = structuredClone(EQUIPMENT_MODIFIER_DEFAULTS);
  multiplyEquipmentModifiers(modifiers, {
    combatTiming: moveset.combatTiming ?? {},
    geometry: Object.fromEntries(
      Object.entries(moveset.geometryProfile ?? {}).filter(([key]) => key.endsWith('Scale')),
    ),
  });
  for (const item of Object.values(itemsBySlot).filter(Boolean))
    multiplyEquipmentModifiers(modifiers, item.modifiers);
  const synergies = evaluateEquipmentSynergies(normalized, catalog);
  for (const effect of [...synergies.activeSetBonuses, ...synergies.activeSpecialSynergies])
    multiplyEquipmentModifiers(modifiers, effect.modifiers);
  const fieldCapabilities = [
    ...new Set(
      Object.values(itemsBySlot)
        .filter(Boolean)
        .flatMap((item) => catalog.getFamily(item.familyId).fieldCapabilities),
    ),
  ];
  const commandModifiers = {
    ...modifiers.command,
    guardEnabled: moveset.commands.guard,
    justGuardEnabled: moveset.commands.justGuard,
    guardCounterEnabled: moveset.commands.guardCounter,
  };
  return freezeEquipmentData({
    loadout: normalized,
    itemsBySlot,
    mainItem,
    offHandItem,
    utilityItem,
    mainFamily,
    offHandFamily,
    moveset,
    attackProfiles: getAttackProfiles(moveset.attackProfileId),
    staminaProfile: getEquipmentStaminaProfile(moveset.staminaProfileId),
    combatTiming: modifiers.combatTiming,
    attackModifiers: modifiers.attack,
    defenseModifiers: modifiers.defense,
    guardModifiers: modifiers.guard,
    geometryProfile: {
      ...moveset.geometryProfile,
      ...modifiers.geometry,
      shieldEnabled: Boolean(offHandItem),
    },
    animationProfile: moveset.animationProfile,
    commandModifiers,
    fieldModifiers: modifiers.field,
    fieldCapabilities,
    ...synergies,
  });
}
