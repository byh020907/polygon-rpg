import {
  PROGRESSION_SCHEMA_VERSION,
  assertProgressionSnapshot,
  createProgressionSnapshot,
  mergeProgressionSnapshot,
} from './ProgressionState.js';
import { canonicalizeEnchantmentSnapshot } from '../enchantment/EnchantmentState.js';

const LEGACY_PROGRESSION_SCHEMA_VERSIONS = new Set([1, 2, 3, 4]);

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

function migrateLegacySnapshot(value, defaultEquipmentId, allowedEquipmentIds, enchantmentCatalog) {
  assertEconomicFields(value, defaultEquipmentId, allowedEquipmentIds);
  const fresh = createProgressionSnapshot(defaultEquipmentId);
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
    ...(value.version >= 4
      ? {
          worldTime: value.worldTime,
          enchantment: canonicalizeEnchantmentSnapshot(value.enchantment, enchantmentCatalog),
        }
      : {}),
  });
}

function validateCurrentSnapshot(
  value,
  defaultEquipmentId,
  allowedEquipmentIds,
  enchantmentCatalog,
) {
  if (
    !isRecord(value.firstJourney) ||
    !Object.hasOwn(value.firstJourney, 'dungeonSignatureStageIds')
  ) {
    throw new TypeError('현재 저장 진행에는 Dungeon signature stage ID가 필요합니다.');
  }
  assertProgressionSnapshot(value);
  assertEconomicFields(value, defaultEquipmentId, allowedEquipmentIds);
  return mergeProgressionSnapshot(value, {
    enchantment: canonicalizeEnchantmentSnapshot(value.enchantment, enchantmentCatalog),
  });
}

function createStoredRecord(snapshot) {
  return {
    version: PROGRESSION_SCHEMA_VERSION,
    trainingMarks: snapshot.trainingMarks,
    ownedEquipmentIds: [...snapshot.ownedEquipmentIds],
    equippedEquipmentId: snapshot.equippedEquipmentId,
    combatSkillLevel: snapshot.combatSkillLevel,
    firstJourney: snapshot.firstJourney,
    regionExpansion: snapshot.regionExpansion,
    worldTime: snapshot.worldTime,
    enchantment: snapshot.enchantment,
  };
}

function failure(reason, message) {
  return Object.freeze({ ok: false, reason, message });
}

export class ProgressionStorage {
  constructor(storage, key, enchantmentCatalog = null) {
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
    this.enchantmentCatalog = enchantmentCatalog;
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
        snapshot: createProgressionSnapshot(defaultEquipmentId),
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
    if (!isRecord(parsed) || !Number.isSafeInteger(parsed.version)) {
      return failure(
        'invalid-data',
        '저장 진행 형식이 올바르지 않습니다. 초기화 전까지 저장하지 않습니다.',
      );
    }
    if (
      !LEGACY_PROGRESSION_SCHEMA_VERSIONS.has(parsed.version) &&
      parsed.version !== PROGRESSION_SCHEMA_VERSION
    ) {
      return failure(
        'unsupported-version',
        '지원하지 않는 저장 진행입니다. 초기화 전까지 기존 기록을 보존합니다.',
      );
    }

    try {
      if (!enchantmentCatalog || !Array.isArray(enchantmentCatalog.profiles)) {
        throw new TypeError('저장 enchantment catalog이 필요합니다.');
      }
      const snapshot = LEGACY_PROGRESSION_SCHEMA_VERSIONS.has(parsed.version)
        ? migrateLegacySnapshot(parsed, defaultEquipmentId, allowedIds, enchantmentCatalog)
        : validateCurrentSnapshot(parsed, defaultEquipmentId, allowedIds, enchantmentCatalog);
      return Object.freeze({
        ok: true,
        kind: LEGACY_PROGRESSION_SCHEMA_VERSIONS.has(parsed.version) ? 'migrated' : 'loaded',
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
      assertProgressionSnapshot(snapshot);
      if (!this.enchantmentCatalog) throw new TypeError('저장 enchantment catalog이 필요합니다.');
      validated = mergeProgressionSnapshot(snapshot, {
        enchantment: canonicalizeEnchantmentSnapshot(snapshot.enchantment, this.enchantmentCatalog),
      });
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
}
