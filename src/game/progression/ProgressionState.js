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
  createEnchantmentSnapshot,
  upgradeSwordEnchantment as upgradeEnchantment,
} from '../enchantment/EnchantmentState.js';

export const PROGRESSION_SCHEMA_VERSION = 6;

export const PROGRESSION_TRANSACTION_REASON = Object.freeze({
  AWARDED: 'awarded',
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
  firstJourney,
  regionExpansion,
  worldTime,
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
    firstJourney: toFirstJourneyProgressSnapshot(firstJourney),
    regionExpansion: toRegionExpansionProgressSnapshot(regionExpansion),
    worldTime: toWorldTimeSnapshot(worldTime),
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

export function createProgressionSnapshot(defaultEquipmentId, enchantmentCatalog = null) {
  assertEquipmentId(defaultEquipmentId, '기본 장비 ID');
  return freezeSnapshot({
    trainingMarks: 0,
    ownedEquipmentIds: [defaultEquipmentId],
    equippedEquipmentId: defaultEquipmentId,
    combatSkillLevel: 0,
    firstJourney: createFirstJourneyProgressSnapshot(),
    regionExpansion: createRegionExpansionProgressSnapshot(),
    worldTime: createWorldTimeSnapshot(),
    enchantment: enchantmentCatalog
      ? createEnchantmentSnapshot([defaultEquipmentId], enchantmentCatalog)
      : {
          materialQuantities: {},
          swordEnchantments: { [defaultEquipmentId]: { elementId: null, level: 0 } },
          claimedMaterialSourceIds: [],
        },
  });
}

export function assertProgressionSnapshot(snapshot) {
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
  toFirstJourneyProgressSnapshot(snapshot.firstJourney);
  toRegionExpansionProgressSnapshot(snapshot.regionExpansion);
  toWorldTimeSnapshot(snapshot.worldTime);
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
    enchantment = snapshot?.enchantment,
  } = {},
) {
  assertProgressionSnapshot(snapshot);
  return freezeSnapshot({
    ...snapshot,
    firstJourney,
    regionExpansion,
    worldTime,
    enchantment,
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
