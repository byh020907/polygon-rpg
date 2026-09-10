import {
  freezeEquipmentData,
  EQUIPMENT_SLOT_KEYS,
  EQUIPMENT_MODIFIER_DEFAULTS,
  multiplyEquipmentModifiers,
} from './EquipmentData.js';
import { EQUIPMENT_FAMILY_PROFILES } from './EquipmentFamilyProfiles.js';
import {
  EQUIPMENT_MOVESET_PROFILES,
  getEquipmentStaminaProfile,
} from './EquipmentMovesetProfiles.js';
import { EQUIPMENT_ITEM_PROFILES } from './EquipmentItemProfiles.js';
import { EQUIPMENT_SET_PROFILES } from './EquipmentSetProfiles.js';
import { SPECIAL_SYNERGY_PROFILES } from './SpecialSynergyProfiles.js';
const idValid = (id) => typeof id === 'string' && /^[a-z][a-z0-9-]*$/.test(id);
export function createEquipmentCatalog({
  families,
  movesets,
  items,
  sets = [],
  specialSynergies = [],
  defaultItemId,
}) {
  const lists = structuredClone({ families, movesets, items, sets, specialSynergies });
  const indexes = {};
  for (const [kind, list] of Object.entries(lists)) {
    if (!Array.isArray(list) || list.length > 1024)
      throw new TypeError('Invalid equipment catalog ' + kind);
    const index = new Map();
    for (const entry of list) {
      if (!idValid(entry.id) || index.has(entry.id))
        throw new TypeError('Invalid/duplicate equipment ID ' + entry.id);
      index.set(entry.id, entry);
    }
    indexes[kind] = index;
  }
  for (const family of lists.families) {
    if (
      !Object.hasOwn(EQUIPMENT_SLOT_KEYS, family.slot) ||
      !['oneHand', 'twoHand', 'none'].includes(family.handUsage) ||
      typeof family.enchantable !== 'boolean' ||
      !Array.isArray(family.fieldCapabilities) ||
      family.fieldCapabilities.some((id) => !idValid(id))
    )
      throw new TypeError('Invalid equipment Family ' + family.id);
    for (const key of [
      'compatibleOffHandFamilies',
      'compatibleMainFamilies',
      'twoHandCompatibleOffHandFamilies',
    ])
      for (const id of family[key] ?? [])
        if (!indexes.families.has(id)) throw new TypeError('Unknown compatible Family ' + id);
    for (const binding of family.movesetBindings ?? []) {
      const moveset = indexes.movesets.get(binding.movesetId);
      if (
        !moveset ||
        (binding.offHandFamilyId !== null && !indexes.families.has(binding.offHandFamilyId))
      )
        throw new TypeError('Unknown Family moveset binding');
      if (
        moveset.requirements?.mainFamilyId !== family.id ||
        moveset.requirements?.offHandFamilyId !== binding.offHandFamilyId
      )
        throw new TypeError('Family binding and Moveset requirements must agree');
    }
  }
  for (const moveset of lists.movesets) {
    getEquipmentStaminaProfile(moveset.staminaProfileId);
    if (
      !indexes.families.has(moveset.requirements?.mainFamilyId) ||
      (moveset.requirements.offHandFamilyId !== null &&
        !indexes.families.has(moveset.requirements.offHandFamilyId))
    )
      throw new TypeError('Valid moveset Family requirements required');
    if (
      !moveset.commands ||
      ['basic', 'strong', 'airBasic', 'guard', 'justGuard', 'guardCounter'].some(
        (key) => typeof moveset.commands[key] !== 'boolean',
      )
    )
      throw new TypeError('Invalid moveset command grammar');
    multiplyEquipmentModifiers(structuredClone(EQUIPMENT_MODIFIER_DEFAULTS), {
      combatTiming: moveset.combatTiming ?? {},
      geometry: Object.fromEntries(
        Object.entries(moveset.geometryProfile ?? {}).filter(([key]) => key.endsWith('Scale')),
      ),
    });
  }
  for (const item of lists.items) {
    if (
      !indexes.families.has(item.familyId) ||
      typeof item.label !== 'string' ||
      !item.label ||
      !Number.isFinite(item.goldCost) ||
      item.goldCost < 0 ||
      !Number.isInteger(item.trainingMarkRequirement) ||
      item.trainingMarkRequirement < 0
    )
      throw new TypeError('Invalid equipment Item ' + item.id);
    if (item.setId && !indexes.sets.has(item.setId))
      throw new TypeError('Unknown equipment Set ' + item.setId);
    multiplyEquipmentModifiers(structuredClone(EQUIPMENT_MODIFIER_DEFAULTS), item.modifiers);
  }
  for (const set of lists.sets) {
    if (
      !Array.isArray(set.pieceItemIds) ||
      !set.pieceItemIds.length ||
      new Set(set.pieceItemIds).size !== set.pieceItemIds.length ||
      set.pieceItemIds.some(
        (id) => !indexes.items.has(id) || indexes.items.get(id).setId !== set.id,
      ) ||
      lists.items.some((item) => item.setId === set.id && !set.pieceItemIds.includes(item.id))
    )
      throw new TypeError('Set requires explicit matching pieceItemIds');
    if (!Array.isArray(set.bonuses)) throw new TypeError('Set bonuses required');
    const thresholds = new Set();
    for (const bonus of set.bonuses) {
      if (
        !idValid(bonus.id) ||
        !Number.isInteger(bonus.pieces) ||
        bonus.pieces < 1 ||
        bonus.pieces > set.pieceItemIds.length ||
        thresholds.has(bonus.pieces)
      )
        throw new TypeError('Invalid set threshold');
      thresholds.add(bonus.pieces);
      multiplyEquipmentModifiers(structuredClone(EQUIPMENT_MODIFIER_DEFAULTS), bonus.modifiers);
    }
  }
  for (const synergy of lists.specialSynergies) {
    if (!Array.isArray(synergy.requirements) || !synergy.requirements.length)
      throw new TypeError('Special synergy requirements required');
    for (const requirement of synergy.requirements) {
      if (
        !Object.hasOwn(EQUIPMENT_SLOT_KEYS, requirement.slot) ||
        (!requirement.itemId && !requirement.familyId)
      )
        throw new TypeError('Invalid synergy requirement');
      if (requirement.itemId && !indexes.items.has(requirement.itemId))
        throw new TypeError('Unknown synergy Item');
      if (requirement.familyId && !indexes.families.has(requirement.familyId))
        throw new TypeError('Unknown synergy Family');
      const itemFamily = requirement.itemId
        ? indexes.families.get(indexes.items.get(requirement.itemId).familyId)
        : null;
      const requiredFamily = requirement.familyId
        ? indexes.families.get(requirement.familyId)
        : null;
      if (
        (itemFamily && itemFamily.slot !== requirement.slot) ||
        (requiredFamily && requiredFamily.slot !== requirement.slot) ||
        (itemFamily && requiredFamily && itemFamily.id !== requiredFamily.id)
      )
        throw new TypeError('Synergy requirement must match its slot and Family');
    }
    multiplyEquipmentModifiers(structuredClone(EQUIPMENT_MODIFIER_DEFAULTS), synergy.modifiers);
  }
  if (
    !indexes.items.has(defaultItemId) ||
    indexes.families.get(indexes.items.get(defaultItemId).familyId).slot !== 'weapon'
  )
    throw new TypeError('Default weapon Item required');
  const get = (kind, id) => {
    const result = indexes[kind].get(id);
    if (!result) throw new RangeError('Unknown equipment ' + kind + ' ID: ' + id);
    return result;
  };
  freezeEquipmentData(lists);
  return Object.freeze({
    ...lists,
    defaultItemId,
    getItem: (id) => get('items', id),
    getFamily: (id) => get('families', id),
    getMoveset: (id) => get('movesets', id),
  });
}
export const EQUIPMENT_CATALOG = createEquipmentCatalog({
  families: EQUIPMENT_FAMILY_PROFILES,
  movesets: EQUIPMENT_MOVESET_PROFILES,
  items: EQUIPMENT_ITEM_PROFILES,
  sets: EQUIPMENT_SET_PROFILES,
  specialSynergies: SPECIAL_SYNERGY_PROFILES,
  defaultItemId: 'field-cutter-balanced',
});
export const EQUIPMENT_ITEMS = EQUIPMENT_CATALOG.items;
export const DEFAULT_EQUIPMENT_ITEM_ID = EQUIPMENT_CATALOG.defaultItemId;
export const getEquipmentItem = (id) => EQUIPMENT_CATALOG.getItem(id);
export function getEnchantableEquipmentItemIds(ids, catalog = EQUIPMENT_CATALOG) {
  if (!Array.isArray(ids)) throw new TypeError('Owned equipment Item IDs required');
  return Object.freeze(
    [...new Set(ids)].filter((id) => catalog.getFamily(catalog.getItem(id).familyId).enchantable),
  );
}
