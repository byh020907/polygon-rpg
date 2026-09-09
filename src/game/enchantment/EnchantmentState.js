import {
  EQUIPMENT_CATALOG,
  getEnchantableEquipmentItemIds,
} from '../equipment/EquipmentCatalog.js';
export const ENCHANTMENT_MAX_LEVEL = 5;
export const ENCHANTMENT_MATERIAL_COSTS = Object.freeze([null, 2, 4, 8, 16, 32]);

export const ENCHANTMENT_TRANSACTION_REASON = Object.freeze({
  MATERIAL_AWARDED: 'material-awarded',
  UPGRADED: 'upgraded',
  NOT_OWNED: 'not-owned',
  NOT_ENCHANTABLE: 'not-enchantable',
  INVALID_ELEMENT: 'invalid-element',
  INSUFFICIENT_MATERIAL: 'insufficient-material',
  INSUFFICIENT_GOLD: 'insufficient-gold',
  MAX_LEVEL: 'max-level',
});

function assertItemId(itemId) {
  if (typeof itemId !== 'string' || itemId.trim().length === 0) {
    throw new TypeError('검 ID는 비어 있지 않은 문자열이어야 합니다.');
  }
}

function createMaterialQuantities(catalog, quantities = {}) {
  const knownMaterialIds = new Set(catalog.profiles.map((profile) => profile.materialId));
  for (const materialId of Object.keys(quantities)) {
    if (!knownMaterialIds.has(materialId)) {
      throw new TypeError(`지원하지 않는 enchantment material입니다: ${materialId}`);
    }
  }
  return Object.freeze(
    Object.fromEntries(
      catalog.profiles.map((profile) => {
        const quantity = quantities[profile.materialId] ?? 0;
        if (!Number.isSafeInteger(quantity) || quantity < 0) {
          throw new TypeError(`${profile.materialId} 수량은 0 이상의 안전한 정수여야 합니다.`);
        }
        return [profile.materialId, quantity];
      }),
    ),
  );
}

function createEquipmentEnchantments(itemIds, records = {}, catalog) {
  const ids = [...itemIds];
  if (new Set(ids).size !== ids.length) throw new TypeError('검 ID는 중복될 수 없습니다.');
  const knownEnchantIds = new Set(catalog.profiles.map((profile) => profile.id));
  for (const itemId of Object.keys(records)) {
    if (!ids.includes(itemId))
      throw new TypeError(`소유하지 않은 검의 enchant 기록입니다: ${itemId}`);
  }
  return Object.freeze(
    Object.fromEntries(
      ids.map((itemId) => {
        assertItemId(itemId);
        const record = records[itemId] ?? { elementId: null, level: 0 };
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          throw new TypeError(`${itemId} enchant 기록이 올바르지 않습니다.`);
        }
        if (
          !Number.isInteger(record.level) ||
          record.level < 0 ||
          record.level > ENCHANTMENT_MAX_LEVEL
        ) {
          throw new TypeError(`${itemId} enchant level은 0..5여야 합니다.`);
        }
        if (
          (record.level === 0 && record.elementId !== null) ||
          (record.level > 0 && !knownEnchantIds.has(record.elementId))
        ) {
          throw new TypeError(`${itemId} enchant element/level 조합이 올바르지 않습니다.`);
        }
        return [itemId, Object.freeze({ elementId: record.elementId, level: record.level })];
      }),
    ),
  );
}

export function createEnchantmentSnapshot(
  itemIds = [],
  catalog,
  equipmentCatalog = EQUIPMENT_CATALOG,
) {
  itemIds = getEnchantableEquipmentItemIds(itemIds, equipmentCatalog);
  if (!catalog || !Array.isArray(catalog.profiles)) {
    throw new TypeError('enchantment catalog이 필요합니다.');
  }
  return Object.freeze({
    materialQuantities: createMaterialQuantities(catalog),
    equipmentEnchantments: createEquipmentEnchantments(itemIds, {}, catalog),
  });
}

export function canonicalizeEnchantmentSnapshot(
  snapshot,
  catalog,
  itemIds = [],
  equipmentCatalog = EQUIPMENT_CATALOG,
) {
  itemIds = getEnchantableEquipmentItemIds(itemIds, equipmentCatalog);
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('enchantment snapshot이 필요합니다.');
  }
  return Object.freeze({
    materialQuantities: createMaterialQuantities(catalog, snapshot.materialQuantities),
    equipmentEnchantments: createEquipmentEnchantments(
      itemIds,
      snapshot.equipmentEnchantments,
      catalog,
    ),
  });
}

function transaction(changed, reason, enchantment, details = {}) {
  return Object.freeze({ changed, reason, enchantment, ...details });
}

export function awardEnchantmentMaterial(
  enchantment,
  { elementId, quantity = 1 } = {},
  catalog,
  itemIds = Object.keys(enchantment?.equipmentEnchantments ?? {}),
  equipmentCatalog = EQUIPMENT_CATALOG,
) {
  const current = canonicalizeEnchantmentSnapshot(enchantment, catalog, itemIds, equipmentCatalog);
  const profile = catalog.getProfile(elementId);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new TypeError('material award 수량은 양의 안전한 정수여야 합니다.');
  }
  const nextQuantity = current.materialQuantities[profile.materialId] + quantity;
  if (!Number.isSafeInteger(nextQuantity)) {
    throw new RangeError('material 수량이 안전한 범위를 넘습니다.');
  }
  return transaction(
    true,
    ENCHANTMENT_TRANSACTION_REASON.MATERIAL_AWARDED,
    Object.freeze({
      ...current,
      materialQuantities: Object.freeze({
        ...current.materialQuantities,
        [profile.materialId]: nextQuantity,
      }),
    }),
    {
      elementId: profile.id,
      materialId: profile.materialId,
      materialLabel: profile.materialLabel,
      quantity,
      totalQuantity: nextQuantity,
    },
  );
}

export function upgradeEquipmentEnchantment(
  enchantment,
  { itemId, elementId, availableGold } = {},
  catalog,
  itemIds = Object.keys(enchantment?.equipmentEnchantments ?? {}),
  equipmentCatalog = EQUIPMENT_CATALOG,
) {
  const current = canonicalizeEnchantmentSnapshot(enchantment, catalog, itemIds, equipmentCatalog);
  if (itemIds.includes(itemId) && !Object.hasOwn(current.equipmentEnchantments, itemId))
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.NOT_ENCHANTABLE, current);
  if (!itemIds.includes(itemId)) {
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.NOT_OWNED, current);
  }
  let profile;
  try {
    profile = catalog.getProfile(elementId);
  } catch {
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.INVALID_ELEMENT, current);
  }
  const currentRecord = current.equipmentEnchantments[itemId];
  if (currentRecord.level > 0 && currentRecord.elementId !== elementId) {
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.INVALID_ELEMENT, current);
  }
  if (currentRecord.level >= ENCHANTMENT_MAX_LEVEL) {
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.MAX_LEVEL, current);
  }
  const targetLevel = currentRecord.level + 1;
  const materialCost = ENCHANTMENT_MATERIAL_COSTS[targetLevel];
  const goldCost = profile.goldCosts?.[targetLevel - 1];
  if (!Number.isSafeInteger(goldCost) || goldCost < 0) {
    throw new TypeError(`${profile.id}의 Lv.${targetLevel} Gold 비용이 올바르지 않습니다.`);
  }
  if (current.materialQuantities[profile.materialId] < materialCost) {
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.INSUFFICIENT_MATERIAL, current, {
      targetLevel,
      materialCost,
      goldCost,
    });
  }
  if (!Number.isSafeInteger(availableGold) || availableGold < goldCost) {
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.INSUFFICIENT_GOLD, current, {
      targetLevel,
      materialCost,
      goldCost,
    });
  }
  return transaction(
    true,
    ENCHANTMENT_TRANSACTION_REASON.UPGRADED,
    Object.freeze({
      ...current,
      materialQuantities: Object.freeze({
        ...current.materialQuantities,
        [profile.materialId]: current.materialQuantities[profile.materialId] - materialCost,
      }),
      equipmentEnchantments: Object.freeze({
        ...current.equipmentEnchantments,
        [itemId]: Object.freeze({ elementId, level: targetLevel }),
      }),
    }),
    { targetLevel, materialCost, goldCost },
  );
}
