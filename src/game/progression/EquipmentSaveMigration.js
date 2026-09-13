import { assertStoredCampaignSnapshot } from './ProgressionCampaignValidation.js';
import { toScrapCampaignSnapshot } from '../campaign/ScrapCampaignState.js';
import { canonicalizeEnchantmentSnapshot } from '../enchantment/EnchantmentState.js';
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

function assertLegacyProgressionSnapshot(snapshot, scrapCampaignProfile) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('progression snapshot은 객체여야 합니다.');
  }
  if (snapshot.version !== 10) {
    throw new Error(`지원하지 않는 progression schema version입니다: ${snapshot.version}`);
  }
  const supportedFields = new Set([
    'version',
    'gold',
    'trainingMarks',
    'ownedEquipmentIds',
    'equippedEquipmentId',
    'combatSkillLevel',
    'viewedConversationIds',
    'weaponForge',
    'enchantment',
    'scrapCampaign',
  ]);
  if (Object.keys(snapshot).some((field) => !supportedFields.has(field))) {
    throw new TypeError('현재 progression schema에 없는 저장 필드가 있습니다.');
  }
  assertNonNegativeInteger(snapshot.gold, '보유 Gold');
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
  assertStoredCampaignSnapshot(snapshot.scrapCampaign, scrapCampaignProfile);
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
    Object.keys(enchantment).some(
      (field) => !['materialQuantities', 'swordEnchantments'].includes(field),
    )
  ) {
    throw new TypeError('현재 enchantment schema에 없는 저장 필드가 있습니다.');
  }
  return snapshot;
}

export const LEGACY_EQUIPMENT_ID_ALIASES = Object.freeze({
  'balanced-sword': 'field-cutter-balanced',
  'heavy-sword': 'field-cutter-heavy',
  'swift-chain-sword': 'field-cutter-swift',
  'posture-breaker-sword': 'field-cutter-breaker',
  'rear-punish-sword': 'field-cutter-reach',
});
const LEGACY_FORGE_SOURCE_ID = 'scrap-yard-guard-collector';

export function migrateEquipmentSaveV10(
  value,
  { enchantmentCatalog, equipmentForgeProfile, scrapCampaignProfile } = {},
) {
  assertLegacyProgressionSnapshot(value, scrapCampaignProfile);
  const alias = (id) => {
    if (!Object.hasOwn(LEGACY_EQUIPMENT_ID_ALIASES, id))
      throw new Error('Unknown legacy equipment ID');
    return LEGACY_EQUIPMENT_ID_ALIASES[id];
  };
  if (!value.ownedEquipmentIds.includes('balanced-sword'))
    throw new Error('Legacy save is missing default equipment');
  const owned = value.ownedEquipmentIds.map(alias);
  if (
    Object.keys(value.weaponForge).some(
      (k) => !['materialQuantities', 'claimedSourceIds', 'selectedProfileIdsByGroup'].includes(k),
    )
  )
    throw new Error('Unknown legacy forge field');
  const forge = value.weaponForge;
  const forgeSourceId = (id) =>
    id === LEGACY_FORGE_SOURCE_ID && equipmentForgeProfile ? equipmentForgeProfile.sourceId : id;
  if (equipmentForgeProfile) {
    if (
      Object.keys(forge.materialQuantities).some((id) => id !== equipmentForgeProfile.materialId) ||
      forge.claimedSourceIds.some((id) => forgeSourceId(id) !== equipmentForgeProfile.sourceId) ||
      Object.entries(forge.selectedProfileIdsByGroup).some(
        ([group, id]) =>
          group !== equipmentForgeProfile.choiceGroupId ||
          !equipmentForgeProfile.optionItemIds.includes(alias(id)),
      )
    )
      throw new Error('Invalid legacy forge data');
  }
  if (
    enchantmentCatalog.profiles.some(
      (p) => !Object.hasOwn(value.enchantment.materialQuantities, p.materialId),
    )
  )
    throw new Error('Missing legacy enchantment material');
  for (const record of Object.values(value.enchantment.swordEnchantments))
    if (Object.keys(record).some((k) => !['elementId', 'level'].includes(k)))
      throw new Error('Unknown legacy enchantment field');
  const enchantment = canonicalizeEnchantmentSnapshot(
    {
      materialQuantities: value.enchantment.materialQuantities,
      equipmentEnchantments: Object.fromEntries(
        Object.entries(value.enchantment.swordEnchantments).map(([id, record]) => [
          alias(id),
          record,
        ]),
      ),
    },
    enchantmentCatalog,
    owned,
  );
  const ownedEquipmentItemIds = [
    ...new Set([
      ...owned,
      'field-shield-standard',
      'field-work-helmet',
      'field-work-body',
      'field-work-boots',
    ]),
  ];
  return {
    version: 11,
    gold: value.gold,
    trainingMarks: value.trainingMarks,
    combatSkillLevel: value.combatSkillLevel,
    viewedConversationIds: [...value.viewedConversationIds],
    scrapCampaign: toScrapCampaignSnapshot(value.scrapCampaign, scrapCampaignProfile),
    ownedEquipmentItemIds,
    loadout: {
      weaponItemId: alias(value.equippedEquipmentId),
      shieldItemId: 'field-shield-standard',
      helmetItemId: null,
      bodyArmorItemId: null,
      bootsItemId: null,
      toolItemId: null,
    },
    everOwnedEquipmentItemIds: [...ownedEquipmentItemIds],
    discoveredSpecialSynergyIds: [],
    equipmentForge: {
      materialQuantities: { ...forge.materialQuantities },
      claimedSourceIds: [...new Set(forge.claimedSourceIds.map(forgeSourceId))],
      selectedItemIdsByGroup: Object.fromEntries(
        Object.entries(forge.selectedProfileIdsByGroup).map(([key, id]) => [key, alias(id)]),
      ),
    },
    enchantment: {
      materialQuantities: enchantment.materialQuantities,
      equipmentEnchantments: enchantment.equipmentEnchantments,
    },
  };
}
