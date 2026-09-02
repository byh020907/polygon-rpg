import {
  PROGRESSION_SCHEMA_VERSION,
  assertProgressionSnapshot,
  createProgressionSnapshot,
  mergeProgressionSnapshot,
} from './ProgressionState.js';
import { canonicalizeEnchantmentSnapshot } from '../enchantment/EnchantmentState.js';
import { toScrapCampaignSnapshot } from '../campaign/ScrapCampaignState.js';
import { RECOVERY_SLOT_IDS } from './CampaignRecoveryPolicy.js';

const LEGACY_PROGRESSION_SCHEMA_VERSIONS = new Set([1, 2, 3, 4, 5, 6, 7]);
const PREVIOUS_PROGRESSION_SCHEMA_VERSION = 8;
const RECOVERY_STORAGE_SCHEMA_VERSION = 1;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertEquipmentId(equipmentId, label) {
  if (typeof equipmentId !== 'string' || equipmentId.trim().length === 0) {
    throw new TypeError(`${label}은(는) 비어 있지 않은 문자열이어야 합니다.`);
  }
}

function assertEconomicFields(value, defaultEquipmentId, allowedEquipmentIds) {
  if (!Number.isSafeInteger(value.trainingMarks) || value.trainingMarks < 0) {
    throw new TypeError('저장된 훈련 인장이 올바르지 않습니다.');
  }
  if (!Array.isArray(value.ownedEquipmentIds) || value.ownedEquipmentIds.length === 0) {
    throw new TypeError('저장된 소유 장비 목록이 올바르지 않습니다.');
  }
  const ownedIds = new Set();
  for (const equipmentId of value.ownedEquipmentIds) {
    assertEquipmentId(equipmentId, '저장된 장비 ID');
    if (!allowedEquipmentIds.has(equipmentId) || ownedIds.has(equipmentId)) {
      throw new Error('저장된 장비 목록에 지원하지 않거나 중복된 항목이 있습니다.');
    }
    ownedIds.add(equipmentId);
  }
  if (!ownedIds.has(defaultEquipmentId)) {
    throw new Error('저장된 장비 목록에 기본 장비가 없습니다.');
  }
  assertEquipmentId(value.equippedEquipmentId, '저장된 착용 장비 ID');
  if (!ownedIds.has(value.equippedEquipmentId)) {
    throw new Error('저장된 착용 장비를 소유하고 있지 않습니다.');
  }
  if (
    !Number.isInteger(value.combatSkillLevel) ||
    value.combatSkillLevel < 0 ||
    value.combatSkillLevel > 3
  ) {
    throw new TypeError('저장된 combat skill level이 올바르지 않습니다.');
  }
}

function createAllowedEquipmentIds(value, defaultEquipmentId) {
  const ids = new Set([defaultEquipmentId]);
  if (!value || typeof value[Symbol.iterator] !== 'function') return ids;
  for (const equipmentId of value) {
    if (typeof equipmentId === 'string' && equipmentId.trim().length > 0) ids.add(equipmentId);
  }
  return ids;
}

function validateWeaponForgeSnapshot(value, profile, ownedEquipmentIds) {
  if (!profile) return value;
  if (!isRecord(value)) throw new TypeError('저장된 무기 forge 진행이 필요합니다.');
  const materialEntries = Object.entries(value.materialQuantities ?? {});
  if (materialEntries.some(([materialId]) => materialId !== profile.materialId)) {
    throw new TypeError('저장된 무기 forge material ID가 올바르지 않습니다.');
  }
  if (
    !Array.isArray(value.claimedSourceIds) ||
    value.claimedSourceIds.some((sourceId) => sourceId !== profile.sourceId)
  ) {
    throw new TypeError('저장된 무기 forge source ID가 올바르지 않습니다.');
  }
  if (!isRecord(value.selectedProfileIdsByGroup)) {
    throw new TypeError('저장된 무기 forge 선택 기록이 올바르지 않습니다.');
  }
  const choiceEntries = Object.entries(value.selectedProfileIdsByGroup);
  if (
    choiceEntries.some(
      ([groupId, profileId]) =>
        groupId !== profile.choiceGroupId ||
        !profile.optionProfileIds.includes(profileId) ||
        !ownedEquipmentIds.includes(profileId),
    )
  ) {
    throw new TypeError('저장된 무기 forge archetype 선택이 올바르지 않습니다.');
  }
  return value;
}

function migrateLegacyEnchantment(value, ownedEquipmentIds, equippedEquipmentId, catalog) {
  if (!isRecord(value)) throw new TypeError('legacy enchantment 진행이 필요합니다.');
  if (isRecord(value.materialQuantities) || isRecord(value.swordEnchantments)) {
    return canonicalizeEnchantmentSnapshot(value, catalog, ownedEquipmentIds);
  }
  const knownEnchantIds = new Set(catalog.profiles.map((profile) => profile.id));
  const knownMaterialIds = new Set(catalog.profiles.map((profile) => profile.materialId));
  const knownSourceIds = new Set(catalog.profiles.map((profile) => profile.sourceId));
  for (const [field, knownIds] of [
    ['materialIds', knownMaterialIds],
    ['unlockedIds', knownEnchantIds],
    ['claimedMaterialSourceIds', knownSourceIds],
  ]) {
    if (
      !Array.isArray(value[field]) ||
      new Set(value[field]).size !== value[field].length ||
      value[field].some((id) => !knownIds.has(id))
    ) {
      throw new TypeError(`legacy enchantment ${field}가 올바르지 않습니다.`);
    }
  }
  if (value.activeId !== null && !value.unlockedIds.includes(value.activeId)) {
    throw new TypeError('legacy active enchant가 해금 목록과 일치하지 않습니다.');
  }
  return canonicalizeEnchantmentSnapshot(
    {
      materialQuantities: Object.fromEntries(
        catalog.profiles.map((profile) => {
          const preservesLegacyReward =
            value.materialIds.includes(profile.materialId) ||
            (value.unlockedIds.includes(profile.id) && value.activeId !== profile.id);
          return [profile.materialId, preservesLegacyReward ? profile.sourceAwardQuantity : 0];
        }),
      ),
      swordEnchantments: Object.fromEntries(
        ownedEquipmentIds.map((swordId) => [
          swordId,
          swordId === equippedEquipmentId && value.activeId
            ? { elementId: value.activeId, level: 1 }
            : { elementId: null, level: 0 },
        ]),
      ),
      claimedMaterialSourceIds: value.claimedMaterialSourceIds,
    },
    catalog,
    ownedEquipmentIds,
  );
}

function migrateLegacySnapshot(
  value,
  defaultEquipmentId,
  allowedEquipmentIds,
  enchantmentCatalog,
  scrapCampaignProfile,
) {
  assertEconomicFields(value, defaultEquipmentId, allowedEquipmentIds);
  const fresh = createProgressionSnapshot(
    defaultEquipmentId,
    enchantmentCatalog,
    scrapCampaignProfile,
  );
  const emptyEnchantment = canonicalizeEnchantmentSnapshot(
    {
      ...fresh.enchantment,
      swordEnchantments: Object.fromEntries(
        value.ownedEquipmentIds.map((swordId) => [swordId, { elementId: null, level: 0 }]),
      ),
    },
    enchantmentCatalog,
    value.ownedEquipmentIds,
  );
  const legacyEnchantment =
    value.version >= 4 && value.enchantment
      ? migrateLegacyEnchantment(
          value.enchantment,
          value.ownedEquipmentIds,
          value.equippedEquipmentId,
          enchantmentCatalog,
        )
      : emptyEnchantment;
  return mergeProgressionSnapshot({
    ...fresh,
    trainingMarks: value.trainingMarks,
    ownedEquipmentIds: value.ownedEquipmentIds,
    equippedEquipmentId: value.equippedEquipmentId,
    combatSkillLevel: value.combatSkillLevel,
    ...(value.version >= 2
      ? {
          firstJourney: value.firstJourney,
          regionExpansion: value.regionExpansion,
        }
      : {}),
    ...(value.version === 3 && value.worldTime ? { worldTime: value.worldTime } : {}),
    ...(value.version >= 4 ? { worldTime: value.worldTime } : {}),
    ...(value.version >= 7 ? { viewedConversationIds: value.viewedConversationIds } : {}),
    enchantment: legacyEnchantment,
  });
}

function validateCurrentSnapshot(
  value,
  defaultEquipmentId,
  allowedEquipmentIds,
  enchantmentCatalog,
  weaponForgeProfile,
  scrapCampaignProfile,
) {
  if (
    !isRecord(value.firstJourney) ||
    !Object.hasOwn(value.firstJourney, 'dungeonSignatureStageIds')
  ) {
    throw new TypeError('현재 저장 진행에는 Dungeon signature stage ID가 필요합니다.');
  }
  assertProgressionSnapshot(value, scrapCampaignProfile);
  assertEconomicFields(value, defaultEquipmentId, allowedEquipmentIds);
  validateWeaponForgeSnapshot(value.weaponForge, weaponForgeProfile, value.ownedEquipmentIds);
  return mergeProgressionSnapshot(value, {
    scrapCampaign: toScrapCampaignSnapshot(value.scrapCampaign, scrapCampaignProfile),
    enchantment: canonicalizeEnchantmentSnapshot(
      value.enchantment,
      enchantmentCatalog,
      value.ownedEquipmentIds,
    ),
  });
}

function migrateVersionEightSnapshot(
  value,
  defaultEquipmentId,
  allowedEquipmentIds,
  enchantmentCatalog,
  weaponForgeProfile,
  scrapCampaignProfile,
) {
  const fresh = createProgressionSnapshot(
    defaultEquipmentId,
    enchantmentCatalog,
    scrapCampaignProfile,
  );
  return validateCurrentSnapshot(
    {
      ...value,
      version: PROGRESSION_SCHEMA_VERSION,
      scrapCampaign: fresh.scrapCampaign,
    },
    defaultEquipmentId,
    allowedEquipmentIds,
    enchantmentCatalog,
    weaponForgeProfile,
    scrapCampaignProfile,
  );
}

function createStoredRecord(snapshot) {
  return {
    version: PROGRESSION_SCHEMA_VERSION,
    trainingMarks: snapshot.trainingMarks,
    ownedEquipmentIds: [...snapshot.ownedEquipmentIds],
    equippedEquipmentId: snapshot.equippedEquipmentId,
    combatSkillLevel: snapshot.combatSkillLevel,
    viewedConversationIds: snapshot.viewedConversationIds,
    weaponForge: snapshot.weaponForge,
    firstJourney: snapshot.firstJourney,
    regionExpansion: snapshot.regionExpansion,
    worldTime: snapshot.worldTime,
    scrapCampaign: snapshot.scrapCampaign,
    enchantment: snapshot.enchantment,
  };
}

function decodeStoredSnapshot(
  parsed,
  defaultEquipmentId,
  allowedEquipmentIds,
  enchantmentCatalog,
  weaponForgeProfile,
  scrapCampaignProfile,
) {
  if (!isRecord(parsed) || !Number.isSafeInteger(parsed.version)) {
    throw new TypeError('저장 진행 형식이 올바르지 않습니다.');
  }
  if (
    !LEGACY_PROGRESSION_SCHEMA_VERSIONS.has(parsed.version) &&
    parsed.version !== PREVIOUS_PROGRESSION_SCHEMA_VERSION &&
    parsed.version !== PROGRESSION_SCHEMA_VERSION
  ) {
    throw new Error('지원하지 않는 저장 진행 version입니다.');
  }
  if (!enchantmentCatalog || !Array.isArray(enchantmentCatalog.profiles)) {
    throw new TypeError('저장 enchantment catalog이 필요합니다.');
  }

  const isLegacy =
    LEGACY_PROGRESSION_SCHEMA_VERSIONS.has(parsed.version) ||
    parsed.version === PREVIOUS_PROGRESSION_SCHEMA_VERSION;
  const snapshot = LEGACY_PROGRESSION_SCHEMA_VERSIONS.has(parsed.version)
    ? migrateLegacySnapshot(
        parsed,
        defaultEquipmentId,
        allowedEquipmentIds,
        enchantmentCatalog,
        scrapCampaignProfile,
      )
    : parsed.version === PREVIOUS_PROGRESSION_SCHEMA_VERSION
      ? migrateVersionEightSnapshot(
          parsed,
          defaultEquipmentId,
          allowedEquipmentIds,
          enchantmentCatalog,
          weaponForgeProfile,
          scrapCampaignProfile,
        )
      : validateCurrentSnapshot(
          parsed,
          defaultEquipmentId,
          allowedEquipmentIds,
          enchantmentCatalog,
          weaponForgeProfile,
          scrapCampaignProfile,
        );
  return Object.freeze({ isLegacy, snapshot });
}

function validateSnapshotForStorage(
  snapshot,
  enchantmentCatalog,
  weaponForgeProfile,
  scrapCampaignProfile,
) {
  assertProgressionSnapshot(snapshot, scrapCampaignProfile);
  if (!enchantmentCatalog) throw new TypeError('저장 enchantment catalog이 필요합니다.');
  validateWeaponForgeSnapshot(snapshot.weaponForge, weaponForgeProfile, snapshot.ownedEquipmentIds);
  return mergeProgressionSnapshot(snapshot, {
    scrapCampaign: toScrapCampaignSnapshot(snapshot.scrapCampaign, scrapCampaignProfile),
    enchantment: canonicalizeEnchantmentSnapshot(
      snapshot.enchantment,
      enchantmentCatalog,
      snapshot.ownedEquipmentIds,
    ),
  });
}

function validateRecoveryMetadata(value, slotId) {
  if (!isRecord(value) || value.slotId !== slotId) {
    throw new TypeError('복구 지점 metadata가 slot과 일치하지 않습니다.');
  }
  for (const field of ['title', 'detailLabel', 'phaseLabel', 'deadlineLabel']) {
    if (typeof value[field] !== 'string' || value[field].trim().length === 0) {
      throw new TypeError(`복구 지점 ${field}가 올바르지 않습니다.`);
    }
  }
  for (const field of [
    'elapsedSegments',
    'day',
    'collectedPartCount',
    'totalPartCount',
    'completionPercent',
  ]) {
    if (!Number.isSafeInteger(value[field]) || value[field] < 0) {
      throw new TypeError(`복구 지점 ${field}가 올바르지 않습니다.`);
    }
  }
  return Object.freeze({ ...value });
}

function failure(reason, message) {
  return Object.freeze({ ok: false, reason, message });
}

export class ProgressionStorage {
  constructor(
    storage,
    key,
    enchantmentCatalog = null,
    weaponForgeProfile = null,
    scrapCampaignProfile = null,
  ) {
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function'
    ) {
      throw new TypeError(
        'ProgressionStorage에는 getItem/setItem을 제공하는 storage가 필요합니다.',
      );
    }
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new TypeError('ProgressionStorage key는 비어 있지 않은 문자열이어야 합니다.');
    }
    this.storage = storage;
    this.key = key;
    this.recoveryKey = `${key}.recovery.v1`;
    this.enchantmentCatalog = enchantmentCatalog;
    this.weaponForgeProfile = weaponForgeProfile;
    this.scrapCampaignProfile = scrapCampaignProfile;
  }

  load(
    defaultEquipmentId,
    allowedEquipmentIds = [defaultEquipmentId],
    enchantmentCatalog = this.enchantmentCatalog,
  ) {
    const allowedIds = createAllowedEquipmentIds(allowedEquipmentIds, defaultEquipmentId);
    let serialized;
    try {
      serialized = this.storage.getItem(this.key);
    } catch {
      return failure(
        'read-failed',
        '저장 진행을 읽지 못했습니다. 새 진행은 이 세션에서만 유지됩니다.',
      );
    }

    if (serialized === null) {
      return Object.freeze({
        ok: true,
        kind: 'fresh',
        snapshot: createProgressionSnapshot(
          defaultEquipmentId,
          enchantmentCatalog,
          this.scrapCampaignProfile,
        ),
      });
    }
    if (typeof serialized !== 'string') {
      return failure(
        'invalid-data',
        '저장 진행 형식이 올바르지 않습니다. 초기화 전까지 저장하지 않습니다.',
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      return failure(
        'parse-failed',
        '저장 진행이 손상되었습니다. 초기화 전까지 저장하지 않습니다.',
      );
    }
    try {
      const { isLegacy, snapshot } = decodeStoredSnapshot(
        parsed,
        defaultEquipmentId,
        allowedIds,
        enchantmentCatalog,
        this.weaponForgeProfile,
        this.scrapCampaignProfile,
      );
      return Object.freeze({
        ok: true,
        kind: isLegacy ? 'migrated' : 'loaded',
        snapshot,
      });
    } catch {
      return failure(
        'invalid-data',
        '저장 진행 값이 올바르지 않습니다. 초기화 전까지 저장하지 않습니다.',
      );
    }
  }

  save(snapshot) {
    let validated;
    try {
      validated = validateSnapshotForStorage(
        snapshot,
        this.enchantmentCatalog,
        this.weaponForgeProfile,
        this.scrapCampaignProfile,
      );
    } catch {
      return failure('invalid-data', '현재 진행 값이 올바르지 않아 저장하지 못했습니다.');
    }

    let serialized;
    try {
      serialized = JSON.stringify(createStoredRecord(validated));
    } catch {
      return failure('serialize-failed', '현재 진행을 저장 형식으로 만들지 못했습니다.');
    }

    try {
      this.storage.setItem(this.key, serialized);
      return Object.freeze({ ok: true, kind: 'saved', snapshot: validated });
    } catch {
      return failure(
        'write-failed',
        '저장소에 진행을 쓰지 못했습니다. 현재 세션 진행은 유지됩니다.',
      );
    }
  }

  loadRecoverySlots(
    defaultEquipmentId,
    allowedEquipmentIds = [defaultEquipmentId],
    enchantmentCatalog = this.enchantmentCatalog,
  ) {
    const allowedIds = createAllowedEquipmentIds(allowedEquipmentIds, defaultEquipmentId);
    let serialized;
    try {
      serialized = this.storage.getItem(this.recoveryKey);
    } catch {
      return failure('recovery-read-failed', '복구 지점을 읽지 못했습니다.');
    }
    if (serialized === null) return Object.freeze({ ok: true, kind: 'empty', records: [] });

    try {
      const envelope = JSON.parse(serialized);
      if (
        !isRecord(envelope) ||
        envelope.version !== RECOVERY_STORAGE_SCHEMA_VERSION ||
        !isRecord(envelope.slots)
      ) {
        throw new TypeError('복구 저장 형식이 올바르지 않습니다.');
      }
      const records = [];
      for (const [slotId, record] of Object.entries(envelope.slots)) {
        if (!RECOVERY_SLOT_IDS.includes(slotId) || !isRecord(record)) {
          throw new TypeError('지원하지 않는 복구 지점이 있습니다.');
        }
        const metadata = validateRecoveryMetadata(record.metadata, slotId);
        const { snapshot } = decodeStoredSnapshot(
          record.snapshot,
          defaultEquipmentId,
          allowedIds,
          enchantmentCatalog,
          this.weaponForgeProfile,
          this.scrapCampaignProfile,
        );
        records.push(Object.freeze({ slotId, metadata, snapshot }));
      }
      records.sort(
        (left, right) =>
          right.metadata.elapsedSegments - left.metadata.elapsedSegments ||
          RECOVERY_SLOT_IDS.indexOf(left.slotId) - RECOVERY_SLOT_IDS.indexOf(right.slotId),
      );
      return Object.freeze({ ok: true, kind: 'loaded', records: Object.freeze(records) });
    } catch {
      return failure(
        'recovery-invalid-data',
        '복구 지점이 손상되었습니다. 현재 진행은 바꾸지 않았습니다.',
      );
    }
  }

  saveRecoverySlot(slotId, snapshot, metadata) {
    if (!RECOVERY_SLOT_IDS.includes(slotId)) {
      return failure('invalid-slot', '지원하지 않는 복구 지점입니다.');
    }
    let validatedSnapshot;
    let validatedMetadata;
    try {
      validatedSnapshot = validateSnapshotForStorage(
        snapshot,
        this.enchantmentCatalog,
        this.weaponForgeProfile,
        this.scrapCampaignProfile,
      );
      validatedMetadata = validateRecoveryMetadata(metadata, slotId);
    } catch {
      return failure('invalid-data', '복구 지점의 진행 값이 올바르지 않습니다.');
    }

    let envelope = { version: RECOVERY_STORAGE_SCHEMA_VERSION, slots: {} };
    try {
      const serialized = this.storage.getItem(this.recoveryKey);
      if (serialized !== null) {
        const parsed = JSON.parse(serialized);
        if (
          !isRecord(parsed) ||
          parsed.version !== RECOVERY_STORAGE_SCHEMA_VERSION ||
          !isRecord(parsed.slots)
        ) {
          throw new TypeError('기존 복구 저장 형식이 올바르지 않습니다.');
        }
        envelope = parsed;
      }
    } catch {
      return failure('recovery-invalid-data', '기존 복구 지점이 손상되어 덮어쓰지 않았습니다.');
    }

    const nextEnvelope = {
      version: RECOVERY_STORAGE_SCHEMA_VERSION,
      slots: {
        ...envelope.slots,
        [slotId]: {
          metadata: validatedMetadata,
          snapshot: createStoredRecord(validatedSnapshot),
        },
      },
    };
    try {
      this.storage.setItem(this.recoveryKey, JSON.stringify(nextEnvelope));
      return Object.freeze({
        ok: true,
        kind: 'recovery-saved',
        record: Object.freeze({ slotId, metadata: validatedMetadata, snapshot: validatedSnapshot }),
      });
    } catch {
      return failure(
        'recovery-write-failed',
        '복구 지점을 저장하지 못했습니다. 현재 진행은 유지됩니다.',
      );
    }
  }

  clearRecoverySlots() {
    try {
      if (typeof this.storage.removeItem === 'function') this.storage.removeItem(this.recoveryKey);
      else
        this.storage.setItem(
          this.recoveryKey,
          JSON.stringify({ version: RECOVERY_STORAGE_SCHEMA_VERSION, slots: {} }),
        );
      return Object.freeze({ ok: true, kind: 'recovery-cleared' });
    } catch {
      return failure('recovery-clear-failed', '이전 복구 지점을 지우지 못했습니다.');
    }
  }
}
