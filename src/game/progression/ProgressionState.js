import { assertStoredCampaignSnapshot } from './ProgressionCampaignValidation.js';
import {
  EQUIPMENT_CATALOG,
  getEnchantableEquipmentItemIds,
} from '../equipment/EquipmentCatalog.js';
import {
  DEFAULT_LOADOUT,
  DEFAULT_OWNED_EQUIPMENT_ITEM_IDS,
  validateLoadout,
  EQUIPMENT_SLOT_KEYS,
} from '../equipment/EquipmentLoadout.js';
import { getNewlyDiscoveredSpecialSynergyIds } from '../equipment/EquipmentSynergy.js';
import {
  createScrapCampaignSnapshot,
  commitScrapCampaignAction,
  SCRAP_CAMPAIGN_ACTION_KIND,
  toScrapCampaignSnapshot,
} from '../campaign/ScrapCampaignState.js';
import {
  awardEnchantmentMaterial,
  createEnchantmentSnapshot,
  upgradeEquipmentEnchantment as upgradeEnchantment,
} from '../enchantment/EnchantmentState.js';

export const PROGRESSION_SCHEMA_VERSION = 11;

export const PROGRESSION_TRANSACTION_REASON = Object.freeze({
  AWARDED: 'awarded',
  FORGED: 'forged',
  PURCHASED: 'purchased',
  EQUIPPED: 'equipped',
  TRAINED: 'trained',
  ALREADY_OWNED: 'already-owned',
  ALREADY_EQUIPPED: 'already-equipped',
  NOT_OWNED: 'not-owned',
  INSUFFICIENT_GOLD: 'insufficient-gold',
  INSUFFICIENT_TRAINING: 'insufficient-training',
  UNAVAILABLE: 'unavailable',
  MAX_LEVEL: 'max-level',
  VIEWED: 'viewed',
  ALREADY_VIEWED: 'already-viewed',
  ALREADY_CLAIMED: 'already-claimed',
  ALREADY_CHOSEN: 'already-chosen',
  INSUFFICIENT_MATERIAL: 'insufficient-material',
});

function assertEquipmentId(equipmentId, label = '장비 ID') {
  if (typeof equipmentId !== 'string' || equipmentId.trim().length === 0) {
    throw new TypeError(`${label}은(는) 비어 있지 않은 문자열이어야 합니다.`);
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label}은(는) 0 이상의 안전한 정수여야 합니다.`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label}은(는) 1 이상의 안전한 정수여야 합니다.`);
  }
}

function freezeSnapshot(snapshot) {
  const freeze = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  return freeze({
    ...structuredClone(snapshot),
    version: PROGRESSION_SCHEMA_VERSION,
    scrapCampaign: toScrapCampaignSnapshot(snapshot.scrapCampaign),
  });
}
export function createProgressionSnapshot(
  defaultItemId,
  enchantmentCatalog = null,
  scrapCampaignProfile,
  equipmentCatalog = EQUIPMENT_CATALOG,
) {
  equipmentCatalog.getItem(defaultItemId);
  const ownedEquipmentItemIds = [...new Set([defaultItemId, ...DEFAULT_OWNED_EQUIPMENT_ITEM_IDS])];
  const enchantable = getEnchantableEquipmentItemIds(ownedEquipmentItemIds, equipmentCatalog);
  const snapshot = {
    version: 11,
    gold: 0,
    trainingMarks: 0,
    ownedEquipmentItemIds,
    loadout: { ...DEFAULT_LOADOUT, weaponItemId: defaultItemId },
    everOwnedEquipmentItemIds: [...ownedEquipmentItemIds],
    discoveredSpecialSynergyIds: [],
    combatSkillLevel: 0,
    viewedConversationIds: [],
    equipmentForge: { materialQuantities: {}, claimedSourceIds: [], selectedItemIdsByGroup: {} },
    scrapCampaign: createScrapCampaignSnapshot(scrapCampaignProfile),
    enchantment: enchantmentCatalog
      ? createEnchantmentSnapshot(enchantable, enchantmentCatalog)
      : {
          materialQuantities: {},
          equipmentEnchantments: Object.fromEntries(
            enchantable.map((id) => [id, { elementId: null, level: 0 }]),
          ),
        },
  };
  assertProgressionSnapshot(snapshot, scrapCampaignProfile, equipmentCatalog);
  return freezeSnapshot(snapshot);
}
function record(value, label, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(label + ' must be a record');
  if (keys && Object.keys(value).some((k) => !keys.includes(k)))
    throw new TypeError(label + ' contains unknown fields');
  return value;
}
function uniqueIds(value, label) {
  if (
    !Array.isArray(value) ||
    value.some((id) => typeof id !== 'string' || !id.trim()) ||
    new Set(value).size !== value.length
  )
    throw new TypeError(label + ' must contain unique IDs');
  return value;
}
export function assertProgressionSnapshot(
  snapshot,
  scrapCampaignProfile,
  equipmentCatalog = EQUIPMENT_CATALOG,
) {
  record(snapshot, 'progression', [
    'version',
    'gold',
    'trainingMarks',
    'ownedEquipmentItemIds',
    'loadout',
    'everOwnedEquipmentItemIds',
    'discoveredSpecialSynergyIds',
    'combatSkillLevel',
    'viewedConversationIds',
    'equipmentForge',
    'enchantment',
    'scrapCampaign',
  ]);
  if (snapshot.version !== 11) throw new TypeError('Unsupported progression schema');
  assertNonNegativeInteger(snapshot.gold, 'Gold');
  assertNonNegativeInteger(snapshot.trainingMarks, 'Training marks');
  const owned = uniqueIds(snapshot.ownedEquipmentItemIds, 'Owned items');
  if (!owned.length) throw new Error('Owned items cannot be empty');
  owned.forEach((id) => equipmentCatalog.getItem(id));
  const ever = uniqueIds(snapshot.everOwnedEquipmentItemIds, 'Ever-owned items');
  ever.forEach((id) => equipmentCatalog.getItem(id));
  if (owned.some((id) => !ever.includes(id)))
    throw new Error('Owned items must remain in ever-owned history');
  const discovered = uniqueIds(snapshot.discoveredSpecialSynergyIds, 'Discovered synergies');
  if (discovered.some((id) => !equipmentCatalog.specialSynergies.some((s) => s.id === id)))
    throw new Error('Unknown discovered synergy');
  record(snapshot.loadout, 'Loadout', Object.values(EQUIPMENT_SLOT_KEYS));
  if (Object.values(EQUIPMENT_SLOT_KEYS).some((k) => !Object.hasOwn(snapshot.loadout, k)))
    throw new Error('All six loadout slots are required');
  validateLoadout(snapshot.loadout, equipmentCatalog, { ownedItemIds: owned });
  if (
    !Number.isInteger(snapshot.combatSkillLevel) ||
    snapshot.combatSkillLevel < 0 ||
    snapshot.combatSkillLevel > 3
  )
    throw new Error('Combat skill must be 0..3');
  uniqueIds(snapshot.viewedConversationIds, 'Viewed conversations');
  const forge = record(snapshot.equipmentForge, 'Equipment forge', [
    'materialQuantities',
    'claimedSourceIds',
    'selectedItemIdsByGroup',
  ]);
  record(forge.materialQuantities, 'Forge quantities');
  Object.entries(forge.materialQuantities).forEach(([id, n]) => {
    assertEquipmentId(id, 'Material');
    assertNonNegativeInteger(n, 'Material quantity');
  });
  uniqueIds(forge.claimedSourceIds, 'Forge claims');
  record(forge.selectedItemIdsByGroup, 'Forge choices');
  for (const [group, itemId] of Object.entries(forge.selectedItemIdsByGroup)) {
    assertEquipmentId(group, 'Forge group');
    if (!owned.includes(itemId)) throw new Error('Forge choice must be owned');
  }
  assertStoredCampaignSnapshot(snapshot.scrapCampaign, scrapCampaignProfile);
  const enchantment = record(snapshot.enchantment, 'Enchantment', [
    'materialQuantities',
    'equipmentEnchantments',
  ]);
  record(enchantment.materialQuantities, 'Enchant quantities');
  Object.entries(enchantment.materialQuantities).forEach(([id, n]) => {
    assertEquipmentId(id, 'Material');
    assertNonNegativeInteger(n, 'Material quantity');
  });
  record(enchantment.equipmentEnchantments, 'Equipment enchants');
  const enchantable = getEnchantableEquipmentItemIds(owned, equipmentCatalog);
  if (
    Object.keys(enchantment.equipmentEnchantments).length !== enchantable.length ||
    enchantable.some((id) => !Object.hasOwn(enchantment.equipmentEnchantments, id))
  )
    throw new Error('Only owned enchantable items must have enchant records');
  for (const entry of Object.values(enchantment.equipmentEnchantments)) {
    record(entry, 'Item enchant', ['elementId', 'level']);
    if (
      !Number.isInteger(entry.level) ||
      entry.level < 0 ||
      entry.level > 5 ||
      (entry.level === 0
        ? entry.elementId !== null
        : typeof entry.elementId !== 'string' || !entry.elementId)
    )
      throw new Error('Invalid enchant element/level');
  }
  return snapshot;
}
export function mergeProgressionSnapshot(
  snapshot,
  changes = {},
  equipmentCatalog = EQUIPMENT_CATALOG,
) {
  assertProgressionSnapshot(snapshot, undefined, equipmentCatalog);
  const next = { ...snapshot, ...changes };
  assertProgressionSnapshot(next, undefined, equipmentCatalog);
  return freezeSnapshot(next);
}
function recordDiscoveries(snapshot, catalog) {
  return {
    ...snapshot,
    discoveredSpecialSynergyIds: [
      ...new Set([
        ...snapshot.discoveredSpecialSynergyIds,
        ...getNewlyDiscoveredSpecialSynergyIds(
          snapshot.loadout,
          catalog,
          snapshot.discoveredSpecialSynergyIds,
        ),
      ]),
    ],
  };
}

function createTransaction(changed, reason, snapshot) {
  return Object.freeze({ changed, reason, snapshot: freezeSnapshot(snapshot) });
}

export function getAvailableGold(snapshot) {
  assertProgressionSnapshot(snapshot);
  return snapshot.gold;
}

export function awardGold(snapshot, amount) {
  assertProgressionSnapshot(snapshot);
  assertNonNegativeInteger(amount, 'Gold 획득량');
  const gold = snapshot.gold + amount;
  assertNonNegativeInteger(gold, '보유 Gold');
  return createTransaction(amount > 0, PROGRESSION_TRANSACTION_REASON.AWARDED, {
    ...snapshot,
    gold,
  });
}

function spendGold(snapshot, goldCost) {
  assertNonNegativeInteger(goldCost, 'Gold 비용');
  assertNonNegativeInteger(snapshot.gold - goldCost, '차감 후 Gold');
  return freezeSnapshot({
    ...snapshot,
    gold: snapshot.gold - goldCost,
  });
}

export function awardTrainingMarks(snapshot, amount) {
  assertProgressionSnapshot(snapshot);
  assertPositiveInteger(amount, '훈련 인장 획득량');
  const trainingMarks = snapshot.trainingMarks + amount;
  if (!Number.isSafeInteger(trainingMarks)) {
    throw new RangeError('훈련 인장 보유량이 안전한 정수 범위를 넘습니다.');
  }
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.AWARDED,
    freezeSnapshot({ ...snapshot, trainingMarks }),
  );
}

export function recordViewedConversation(snapshot, conversationId) {
  assertProgressionSnapshot(snapshot);
  assertEquipmentId(conversationId, '핵심 대화 ID');
  if (snapshot.viewedConversationIds.includes(conversationId)) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_VIEWED, snapshot);
  }
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.VIEWED,
    freezeSnapshot({
      ...snapshot,
      viewedConversationIds: [...snapshot.viewedConversationIds, conversationId],
    }),
  );
}

export function awardEnemyEnchantMaterial(snapshot, reward, catalog) {
  assertProgressionSnapshot(snapshot);
  const material = awardEnchantmentMaterial(
    snapshot.enchantment,
    reward,
    catalog,
    getEnchantableEquipmentItemIds(snapshot.ownedEquipmentItemIds),
  );
  return Object.freeze({
    changed: true,
    reason: material.reason,
    elementId: material.elementId,
    materialId: material.materialId,
    materialLabel: material.materialLabel,
    quantity: material.quantity,
    totalQuantity: material.totalQuantity,
    snapshot: freezeSnapshot({ ...snapshot, enchantment: material.enchantment }),
  });
}

export function awardEquipmentForgeMaterial(snapshot, { sourceId, materialId, quantity = 1 } = {}) {
  assertProgressionSnapshot(snapshot);
  assertEquipmentId(sourceId, '무기 forge material source ID');
  assertEquipmentId(materialId, '무기 forge material ID');
  assertPositiveInteger(quantity, '무기 forge material 획득량');
  if (snapshot.equipmentForge.claimedSourceIds.includes(sourceId)) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_CLAIMED, snapshot);
  }
  const currentQuantity = snapshot.equipmentForge.materialQuantities[materialId] ?? 0;
  const nextQuantity = currentQuantity + quantity;
  if (!Number.isSafeInteger(nextQuantity)) {
    throw new RangeError('무기 forge material 수량이 안전한 정수 범위를 넘습니다.');
  }
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.AWARDED,
    freezeSnapshot({
      ...snapshot,
      equipmentForge: {
        ...snapshot.equipmentForge,
        materialQuantities: {
          ...snapshot.equipmentForge.materialQuantities,
          [materialId]: nextQuantity,
        },
        claimedSourceIds: [...snapshot.equipmentForge.claimedSourceIds, sourceId],
      },
    }),
  );
}

export function awardCampaignEncounterReward(
  snapshot,
  result,
  progressionProfile,
  enchantmentCatalog,
  campaignProfile,
) {
  assertProgressionSnapshot(snapshot, campaignProfile);
  const reward = progressionProfile.encounterRewards[result?.entityId];
  if (!reward || reward.profileId !== result.profileId || snapshot.scrapCampaign.gameOver) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.UNAVAILABLE, snapshot);
  }
  const campaign = commitScrapCampaignAction(
    snapshot.scrapCampaign,
    {
      actionId: `encounter-reward:${reward.entityId}`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.FREE,
      label: '전투 현장 회수품 정산',
      costSegments: 0,
    },
    campaignProfile,
  );
  if (!campaign.changed)
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_CLAIMED, snapshot);
  let next = mergeProgressionSnapshot(snapshot, { scrapCampaign: campaign.snapshot });
  next = awardGold(next, reward.gold).snapshot;
  if (reward.trainingMarks > 0) next = awardTrainingMarks(next, reward.trainingMarks).snapshot;
  if (reward.forgeMaterial) {
    const forge = progressionProfile.equipmentForge;
    next = awardEquipmentForgeMaterial(next, {
      sourceId: forge.sourceId,
      materialId: forge.materialId,
      quantity: forge.sourceQuantity,
    }).snapshot;
  }
  const material = awardEnemyEnchantMaterial(next, reward.materialReward, enchantmentCatalog);
  return Object.freeze({
    ...createTransaction(true, PROGRESSION_TRANSACTION_REASON.AWARDED, material.snapshot),
    rewardLabel: `${reward.gold} Gold · ${material.materialLabel} +${material.quantity}${reward.forgeMaterial ? ' · ' + progressionProfile.equipmentForge.materialLabel : ''}`,
  });
}

function acquiredItem(snapshot, itemId, catalog) {
  catalog.getItem(itemId);
  const enchantable = getEnchantableEquipmentItemIds([itemId], catalog).length > 0;
  return {
    ...snapshot,
    ownedEquipmentItemIds: [...new Set([...snapshot.ownedEquipmentItemIds, itemId])],
    everOwnedEquipmentItemIds: [...new Set([...snapshot.everOwnedEquipmentItemIds, itemId])],
    enchantment: {
      ...snapshot.enchantment,
      equipmentEnchantments: {
        ...snapshot.enchantment.equipmentEnchantments,
        ...(enchantable
          ? {
              [itemId]: snapshot.enchantment.equipmentEnchantments[itemId] ?? {
                elementId: null,
                level: 0,
              },
            }
          : {}),
      },
    },
  };
}
export function forgeEquipmentArchetype(
  snapshot,
  { choiceGroupId, itemId, optionItemIds, materialId, materialCost = 1 } = {},
  catalog = EQUIPMENT_CATALOG,
) {
  assertProgressionSnapshot(snapshot, undefined, catalog);
  assertEquipmentId(choiceGroupId, 'Forge group');
  assertEquipmentId(materialId, 'Forge material');
  assertPositiveInteger(materialCost, 'Forge cost');
  if (!Array.isArray(optionItemIds) || !optionItemIds.includes(itemId))
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.UNAVAILABLE, snapshot);
  catalog.getItem(itemId);
  if (snapshot.equipmentForge.selectedItemIdsByGroup[choiceGroupId])
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_CHOSEN, snapshot);
  if (snapshot.ownedEquipmentItemIds.includes(itemId))
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_OWNED, snapshot);
  const quantity = snapshot.equipmentForge.materialQuantities[materialId] ?? 0;
  if (quantity < materialCost)
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_MATERIAL, snapshot);
  const next = acquiredItem(snapshot, itemId, catalog);
  next.equipmentForge = {
    ...snapshot.equipmentForge,
    materialQuantities: {
      ...snapshot.equipmentForge.materialQuantities,
      [materialId]: quantity - materialCost,
    },
    selectedItemIdsByGroup: {
      ...snapshot.equipmentForge.selectedItemIdsByGroup,
      [choiceGroupId]: itemId,
    },
  };
  const equipped = selectEquipment(next, itemId, catalog);
  if (!equipped.changed) return createTransaction(false, equipped.reason, snapshot);
  return createTransaction(true, PROGRESSION_TRANSACTION_REASON.FORGED, equipped.snapshot);
}
export function purchaseEquipment(
  snapshot,
  { itemId, goldCost, trainingMarkRequirement = 0 } = {},
  catalog = EQUIPMENT_CATALOG,
) {
  assertProgressionSnapshot(snapshot, undefined, catalog);
  catalog.getItem(itemId);
  if (snapshot.ownedEquipmentItemIds.includes(itemId))
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_OWNED, snapshot);
  assertNonNegativeInteger(goldCost, 'Equipment Gold');
  assertNonNegativeInteger(trainingMarkRequirement, 'Equipment training marks');
  if (snapshot.trainingMarks < trainingMarkRequirement)
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_TRAINING, snapshot);
  if (snapshot.gold < goldCost)
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_GOLD, snapshot);
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.PURCHASED,
    acquiredItem({ ...snapshot, gold: snapshot.gold - goldCost }, itemId, catalog),
  );
}

export function selectEquipment(snapshot, itemId, catalog = EQUIPMENT_CATALOG, { slot } = {}) {
  assertProgressionSnapshot(snapshot, undefined, catalog);
  const item = catalog.getItem(itemId);
  const family = catalog.getFamily(item.familyId);
  const key = EQUIPMENT_SLOT_KEYS[slot ?? family.slot] ?? slot;
  if (key !== EQUIPMENT_SLOT_KEYS[family.slot])
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.UNAVAILABLE, snapshot);
  if (!snapshot.ownedEquipmentItemIds.includes(itemId))
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.NOT_OWNED, snapshot);
  if (snapshot.loadout[key] === itemId)
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_EQUIPPED, snapshot);
  const loadout = { ...snapshot.loadout, [key]: itemId };
  try {
    validateLoadout(loadout, catalog, { ownedItemIds: snapshot.ownedEquipmentItemIds });
  } catch {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.UNAVAILABLE, snapshot);
  }
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.EQUIPPED,
    recordDiscoveries({ ...snapshot, loadout }, catalog),
  );
}
export function unequipEquipment(snapshot, slot, catalog = EQUIPMENT_CATALOG) {
  assertProgressionSnapshot(snapshot, undefined, catalog);
  const key = EQUIPMENT_SLOT_KEYS[slot] ?? slot;
  if (!Object.values(EQUIPMENT_SLOT_KEYS).includes(key) || key === 'weaponItemId')
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.UNAVAILABLE, snapshot);
  if (snapshot.loadout[key] === null)
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_EQUIPPED, snapshot);
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.EQUIPPED,
    recordDiscoveries({ ...snapshot, loadout: { ...snapshot.loadout, [key]: null } }, catalog),
  );
}

export function trainCombatSkill(snapshot, { goldCost, trainingMarkRequirement = 0 } = {}) {
  assertProgressionSnapshot(snapshot);
  if (snapshot.combatSkillLevel >= 3) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.MAX_LEVEL, snapshot);
  }
  assertNonNegativeInteger(goldCost, 'combat skill Gold 비용');
  assertNonNegativeInteger(trainingMarkRequirement, 'combat skill 훈련 인장 요구량');
  if (snapshot.trainingMarks < trainingMarkRequirement) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_TRAINING, snapshot);
  }
  if (getAvailableGold(snapshot) < goldCost) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_GOLD, snapshot);
  }
  const paidSnapshot = spendGold(snapshot, goldCost);
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.TRAINED,
    freezeSnapshot({
      ...paidSnapshot,
      combatSkillLevel: snapshot.combatSkillLevel + 1,
    }),
  );
}

export function upgradeEquipmentEnchantment(
  snapshot,
  { itemId, elementId } = {},
  catalog,
  equipmentCatalog = EQUIPMENT_CATALOG,
) {
  assertProgressionSnapshot(snapshot, undefined, equipmentCatalog);
  const enchantmentTransaction = upgradeEnchantment(
    snapshot.enchantment,
    { itemId, elementId, availableGold: snapshot.gold },
    catalog,
    snapshot.ownedEquipmentItemIds,
    equipmentCatalog,
  );
  if (!enchantmentTransaction.changed) {
    return Object.freeze({
      ...enchantmentTransaction,
      snapshot: freezeSnapshot(snapshot),
    });
  }
  const paidSnapshot = spendGold(snapshot, enchantmentTransaction.goldCost);
  return Object.freeze({
    changed: true,
    reason: enchantmentTransaction.reason,
    targetLevel: enchantmentTransaction.targetLevel,
    materialCost: enchantmentTransaction.materialCost,
    goldCost: enchantmentTransaction.goldCost,
    snapshot: freezeSnapshot({
      ...paidSnapshot,
      enchantment: enchantmentTransaction.enchantment,
    }),
  });
}
