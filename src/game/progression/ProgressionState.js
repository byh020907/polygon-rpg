import {
  createFirstJourneyProgressSnapshot,
  toFirstJourneyProgressSnapshot,
} from '../encounter/FirstJourneyProgress.js';
import {
  createRegionExpansionProgressSnapshot,
  toRegionExpansionProgressSnapshot,
} from '../encounter/RegionExpansionProgress.js';
import { createWorldTimeSnapshot, toWorldTimeSnapshot } from '../world/WorldTimeState.js';
import {
  createScrapCampaignSnapshot,
  toScrapCampaignSnapshot,
} from '../campaign/ScrapCampaignState.js';
import {
  awardRepeatableEnchantMaterial,
  createEnchantmentSnapshot,
  upgradeSwordEnchantment as upgradeEnchantment,
} from '../enchantment/EnchantmentState.js';

export const PROGRESSION_SCHEMA_VERSION = 9;

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

function freezeSnapshot({
  trainingMarks,
  ownedEquipmentIds,
  equippedEquipmentId,
  combatSkillLevel,
  viewedConversationIds,
  weaponForge = {
    materialQuantities: {},
    claimedSourceIds: [],
    selectedProfileIdsByGroup: {},
  },
  firstJourney,
  regionExpansion,
  worldTime,
  scrapCampaign,
  enchantment = {
    materialQuantities: {},
    swordEnchantments: {},
    claimedMaterialSourceIds: [],
  },
}) {
  return Object.freeze({
    version: PROGRESSION_SCHEMA_VERSION,
    trainingMarks,
    ownedEquipmentIds: Object.freeze([...ownedEquipmentIds]),
    equippedEquipmentId,
    combatSkillLevel,
    viewedConversationIds: Object.freeze([...viewedConversationIds]),
    weaponForge: Object.freeze({
      materialQuantities: Object.freeze({ ...weaponForge.materialQuantities }),
      claimedSourceIds: Object.freeze([...weaponForge.claimedSourceIds]),
      selectedProfileIdsByGroup: Object.freeze({ ...weaponForge.selectedProfileIdsByGroup }),
    }),
    firstJourney: toFirstJourneyProgressSnapshot(firstJourney),
    regionExpansion: toRegionExpansionProgressSnapshot(regionExpansion),
    worldTime: toWorldTimeSnapshot(worldTime),
    scrapCampaign,
    enchantment: Object.freeze({
      materialQuantities: Object.freeze({ ...enchantment.materialQuantities }),
      swordEnchantments: Object.freeze(
        Object.fromEntries(
          Object.entries(enchantment.swordEnchantments).map(([swordId, record]) => [
            swordId,
            Object.freeze({ elementId: record.elementId, level: record.level }),
          ]),
        ),
      ),
      claimedMaterialSourceIds: Object.freeze([...enchantment.claimedMaterialSourceIds]),
    }),
  });
}

export function createProgressionSnapshot(
  defaultEquipmentId,
  enchantmentCatalog = null,
  scrapCampaignProfile,
) {
  assertEquipmentId(defaultEquipmentId, '기본 장비 ID');
  return freezeSnapshot({
    trainingMarks: 0,
    ownedEquipmentIds: [defaultEquipmentId],
    equippedEquipmentId: defaultEquipmentId,
    combatSkillLevel: 0,
    viewedConversationIds: [],
    weaponForge: {
      materialQuantities: {},
      claimedSourceIds: [],
      selectedProfileIdsByGroup: {},
    },
    firstJourney: createFirstJourneyProgressSnapshot(),
    regionExpansion: createRegionExpansionProgressSnapshot(),
    worldTime: createWorldTimeSnapshot(),
    scrapCampaign: createScrapCampaignSnapshot(scrapCampaignProfile),
    enchantment: enchantmentCatalog
      ? createEnchantmentSnapshot([defaultEquipmentId], enchantmentCatalog)
      : {
          materialQuantities: {},
          swordEnchantments: { [defaultEquipmentId]: { elementId: null, level: 0 } },
          claimedMaterialSourceIds: [],
        },
  });
}

export function assertProgressionSnapshot(snapshot, scrapCampaignProfile) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('progression snapshot은 객체여야 합니다.');
  }
  if (snapshot.version !== PROGRESSION_SCHEMA_VERSION) {
    throw new Error(`지원하지 않는 progression schema version입니다: ${snapshot.version}`);
  }
  assertNonNegativeInteger(snapshot.trainingMarks, '훈련 인장');
  if (!Array.isArray(snapshot.ownedEquipmentIds) || snapshot.ownedEquipmentIds.length === 0) {
    throw new TypeError('소유 장비 ID 목록에는 적어도 하나의 장비가 필요합니다.');
  }
  const ownedIds = new Set();
  for (const equipmentId of snapshot.ownedEquipmentIds) {
    assertEquipmentId(equipmentId, '소유 장비 ID');
    if (ownedIds.has(equipmentId)) {
      throw new Error(`소유 장비 ID가 중복됩니다: ${equipmentId}`);
    }
    ownedIds.add(equipmentId);
  }
  assertEquipmentId(snapshot.equippedEquipmentId, '착용 장비 ID');
  if (!ownedIds.has(snapshot.equippedEquipmentId)) {
    throw new Error(`착용 장비는 먼저 소유해야 합니다: ${snapshot.equippedEquipmentId}`);
  }
  if (
    !Number.isInteger(snapshot.combatSkillLevel) ||
    snapshot.combatSkillLevel < 0 ||
    snapshot.combatSkillLevel > 3
  ) {
    throw new RangeError('combat skill level은 0..3 사이의 정수여야 합니다.');
  }
  if (
    !Array.isArray(snapshot.viewedConversationIds) ||
    snapshot.viewedConversationIds.some(
      (conversationId) => typeof conversationId !== 'string' || conversationId.trim().length === 0,
    ) ||
    new Set(snapshot.viewedConversationIds).size !== snapshot.viewedConversationIds.length
  ) {
    throw new TypeError('확인한 핵심 대화 ID 목록이 올바르지 않습니다.');
  }
  const weaponForge = snapshot.weaponForge;
  if (!weaponForge || typeof weaponForge !== 'object' || Array.isArray(weaponForge)) {
    throw new TypeError('무기 forge 진행이 필요합니다.');
  }
  if (
    !weaponForge.materialQuantities ||
    typeof weaponForge.materialQuantities !== 'object' ||
    Array.isArray(weaponForge.materialQuantities)
  ) {
    throw new TypeError('무기 forge material 수량이 올바르지 않습니다.');
  }
  for (const [materialId, quantity] of Object.entries(weaponForge.materialQuantities)) {
    assertEquipmentId(materialId, '무기 forge material ID');
    assertNonNegativeInteger(quantity, `${materialId} 수량`);
  }
  if (
    !Array.isArray(weaponForge.claimedSourceIds) ||
    weaponForge.claimedSourceIds.some((id) => typeof id !== 'string' || id.length === 0) ||
    new Set(weaponForge.claimedSourceIds).size !== weaponForge.claimedSourceIds.length
  ) {
    throw new TypeError('무기 forge claimed source가 올바르지 않습니다.');
  }
  if (
    !weaponForge.selectedProfileIdsByGroup ||
    typeof weaponForge.selectedProfileIdsByGroup !== 'object' ||
    Array.isArray(weaponForge.selectedProfileIdsByGroup)
  ) {
    throw new TypeError('무기 forge 상호배타 선택 기록이 올바르지 않습니다.');
  }
  for (const [groupId, profileId] of Object.entries(weaponForge.selectedProfileIdsByGroup)) {
    assertEquipmentId(groupId, '무기 forge 선택 group ID');
    assertEquipmentId(profileId, '무기 forge 선택 profile ID');
    if (!ownedIds.has(profileId)) {
      throw new Error(`forge 선택 무기는 먼저 소유해야 합니다: ${profileId}`);
    }
  }
  toFirstJourneyProgressSnapshot(snapshot.firstJourney);
  toRegionExpansionProgressSnapshot(snapshot.regionExpansion);
  toWorldTimeSnapshot(snapshot.worldTime);
  toScrapCampaignSnapshot(snapshot.scrapCampaign, scrapCampaignProfile);
  const enchantment = snapshot.enchantment;
  if (!enchantment || typeof enchantment !== 'object')
    throw new TypeError('enchantment 진행이 필요합니다.');
  if (
    !enchantment.materialQuantities ||
    typeof enchantment.materialQuantities !== 'object' ||
    Array.isArray(enchantment.materialQuantities)
  ) {
    throw new TypeError('enchantment material 수량이 올바르지 않습니다.');
  }
  for (const [materialId, quantity] of Object.entries(enchantment.materialQuantities)) {
    assertEquipmentId(materialId, 'enchantment material ID');
    assertNonNegativeInteger(quantity, `${materialId} 수량`);
  }
  if (
    !enchantment.swordEnchantments ||
    typeof enchantment.swordEnchantments !== 'object' ||
    Array.isArray(enchantment.swordEnchantments) ||
    Object.keys(enchantment.swordEnchantments).length !== ownedIds.size
  ) {
    throw new TypeError('검별 enchantment 기록이 올바르지 않습니다.');
  }
  for (const [swordId, record] of Object.entries(enchantment.swordEnchantments)) {
    if (!ownedIds.has(swordId) || !record || typeof record !== 'object' || Array.isArray(record)) {
      throw new TypeError('소유 검과 enchantment 기록이 일치해야 합니다.');
    }
    if (!Number.isInteger(record.level) || record.level < 0 || record.level > 5) {
      throw new TypeError('검 enchantment level은 0..5여야 합니다.');
    }
    if (
      (record.level === 0 && record.elementId !== null) ||
      (record.level > 0 && (typeof record.elementId !== 'string' || record.elementId.length === 0))
    ) {
      throw new TypeError('검 enchantment element/level 조합이 올바르지 않습니다.');
    }
  }
  if (
    !Array.isArray(enchantment.claimedMaterialSourceIds) ||
    enchantment.claimedMaterialSourceIds.some((id) => typeof id !== 'string' || id.length === 0) ||
    new Set(enchantment.claimedMaterialSourceIds).size !==
      enchantment.claimedMaterialSourceIds.length
  ) {
    throw new TypeError('enchantment claimed source가 올바르지 않습니다.');
  }
  return snapshot;
}

export function mergeProgressionSnapshot(
  snapshot,
  {
    firstJourney = snapshot?.firstJourney,
    regionExpansion = snapshot?.regionExpansion,
    worldTime = snapshot?.worldTime,
    scrapCampaign = snapshot?.scrapCampaign,
    enchantment = snapshot?.enchantment,
    viewedConversationIds = snapshot?.viewedConversationIds,
    weaponForge = snapshot?.weaponForge,
  } = {},
) {
  assertProgressionSnapshot(snapshot);
  return freezeSnapshot({
    ...snapshot,
    firstJourney,
    regionExpansion,
    worldTime,
    scrapCampaign,
    enchantment,
    viewedConversationIds,
    weaponForge,
  });
}

function createTransaction(changed, reason, snapshot) {
  return Object.freeze({ changed, reason, snapshot: freezeSnapshot(snapshot) });
}

export function getAvailableGold(snapshot) {
  assertProgressionSnapshot(snapshot);
  const gold = snapshot.firstJourney.gold + snapshot.regionExpansion.gold;
  if (!Number.isSafeInteger(gold)) {
    throw new RangeError('보유 Gold가 안전한 정수 범위를 넘습니다.');
  }
  return gold;
}

function spendGold(snapshot, goldCost) {
  assertNonNegativeInteger(goldCost, 'Gold 비용');
  const firstJourneySpend = Math.min(snapshot.firstJourney.gold, goldCost);
  const regionExpansionSpend = goldCost - firstJourneySpend;
  return freezeSnapshot({
    ...snapshot,
    firstJourney: {
      ...snapshot.firstJourney,
      gold: snapshot.firstJourney.gold - firstJourneySpend,
    },
    regionExpansion: {
      ...snapshot.regionExpansion,
      gold: snapshot.regionExpansion.gold - regionExpansionSpend,
    },
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
  const material = awardRepeatableEnchantMaterial(
    snapshot.enchantment,
    reward,
    catalog,
    snapshot.ownedEquipmentIds,
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

export function awardWeaponForgeMaterial(snapshot, { sourceId, materialId, quantity = 1 } = {}) {
  assertProgressionSnapshot(snapshot);
  assertEquipmentId(sourceId, '무기 forge material source ID');
  assertEquipmentId(materialId, '무기 forge material ID');
  assertPositiveInteger(quantity, '무기 forge material 획득량');
  if (snapshot.weaponForge.claimedSourceIds.includes(sourceId)) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_CLAIMED, snapshot);
  }
  const currentQuantity = snapshot.weaponForge.materialQuantities[materialId] ?? 0;
  const nextQuantity = currentQuantity + quantity;
  if (!Number.isSafeInteger(nextQuantity)) {
    throw new RangeError('무기 forge material 수량이 안전한 정수 범위를 넘습니다.');
  }
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.AWARDED,
    freezeSnapshot({
      ...snapshot,
      weaponForge: {
        ...snapshot.weaponForge,
        materialQuantities: {
          ...snapshot.weaponForge.materialQuantities,
          [materialId]: nextQuantity,
        },
        claimedSourceIds: [...snapshot.weaponForge.claimedSourceIds, sourceId],
      },
    }),
  );
}

export function forgeWeaponArchetype(
  snapshot,
  { choiceGroupId, profileId, optionProfileIds, materialId, materialCost = 1 } = {},
) {
  assertProgressionSnapshot(snapshot);
  assertEquipmentId(choiceGroupId, '무기 archetype choice group ID');
  assertEquipmentId(profileId, '무기 archetype profile ID');
  assertEquipmentId(materialId, '무기 archetype material ID');
  assertPositiveInteger(materialCost, '무기 archetype material 비용');
  if (
    !Array.isArray(optionProfileIds) ||
    optionProfileIds.some((candidate) => typeof candidate !== 'string' || candidate.length === 0)
  ) {
    throw new TypeError('무기 archetype option profile ID 목록이 필요합니다.');
  }
  if (!optionProfileIds.includes(profileId)) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.UNAVAILABLE, snapshot);
  }
  if (snapshot.weaponForge.selectedProfileIdsByGroup[choiceGroupId]) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_CHOSEN, snapshot);
  }
  if (snapshot.ownedEquipmentIds.includes(profileId)) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_OWNED, snapshot);
  }
  const materialQuantity = snapshot.weaponForge.materialQuantities[materialId] ?? 0;
  if (materialQuantity < materialCost) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_MATERIAL, snapshot);
  }
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.FORGED,
    freezeSnapshot({
      ...snapshot,
      ownedEquipmentIds: [...snapshot.ownedEquipmentIds, profileId],
      equippedEquipmentId: profileId,
      weaponForge: {
        ...snapshot.weaponForge,
        materialQuantities: {
          ...snapshot.weaponForge.materialQuantities,
          [materialId]: materialQuantity - materialCost,
        },
        selectedProfileIdsByGroup: {
          ...snapshot.weaponForge.selectedProfileIdsByGroup,
          [choiceGroupId]: profileId,
        },
      },
      enchantment: {
        ...snapshot.enchantment,
        swordEnchantments: {
          ...snapshot.enchantment.swordEnchantments,
          [profileId]: { elementId: null, level: 0 },
        },
      },
    }),
  );
}

export function purchaseEquipment(
  snapshot,
  { profileId, goldCost, trainingMarkRequirement = 0 } = {},
) {
  assertProgressionSnapshot(snapshot);
  assertEquipmentId(profileId, '구매 장비 profile ID');
  if (snapshot.ownedEquipmentIds.includes(profileId)) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_OWNED, snapshot);
  }
  assertNonNegativeInteger(goldCost, '장비 Gold 비용');
  assertNonNegativeInteger(trainingMarkRequirement, '장비 훈련 인장 요구량');
  if (snapshot.trainingMarks < trainingMarkRequirement) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_TRAINING, snapshot);
  }
  if (getAvailableGold(snapshot) < goldCost) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_GOLD, snapshot);
  }
  const paidSnapshot = spendGold(snapshot, goldCost);
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.PURCHASED,
    freezeSnapshot({
      ...paidSnapshot,
      ownedEquipmentIds: [...paidSnapshot.ownedEquipmentIds, profileId],
      enchantment: {
        ...paidSnapshot.enchantment,
        swordEnchantments: {
          ...paidSnapshot.enchantment.swordEnchantments,
          [profileId]: { elementId: null, level: 0 },
        },
      },
    }),
  );
}

export function selectEquipment(snapshot, profileId) {
  assertProgressionSnapshot(snapshot);
  assertEquipmentId(profileId, '선택 장비 profile ID');
  if (!snapshot.ownedEquipmentIds.includes(profileId)) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.NOT_OWNED, snapshot);
  }
  if (snapshot.equippedEquipmentId === profileId) {
    return createTransaction(false, PROGRESSION_TRANSACTION_REASON.ALREADY_EQUIPPED, snapshot);
  }
  return createTransaction(
    true,
    PROGRESSION_TRANSACTION_REASON.EQUIPPED,
    freezeSnapshot({ ...snapshot, equippedEquipmentId: profileId }),
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

export function upgradeSwordEnchantment(snapshot, { swordId, elementId } = {}, catalog) {
  assertProgressionSnapshot(snapshot);
  const enchantmentTransaction = upgradeEnchantment(
    snapshot.enchantment,
    { swordId, elementId, availableGold: getAvailableGold(snapshot) },
    catalog,
    snapshot.ownedEquipmentIds,
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
