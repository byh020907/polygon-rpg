import {
  PROGRESSION_SCHEMA_VERSION,
  assertProgressionSnapshot,
  createProgressionSnapshot,
} from './ProgressionState.js';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeNonNegativeInteger(value, fallback = 0) {
  return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function sanitizeSkillLevel(value) {
  return Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0;
}

function createAllowedEquipmentIds(value, defaultEquipmentId) {
  const ids = new Set([defaultEquipmentId]);
  if (!value || typeof value[Symbol.iterator] !== 'function') return ids;
  for (const equipmentId of value) {
    if (typeof equipmentId === 'string' && equipmentId.trim().length > 0) ids.add(equipmentId);
  }
  return ids;
}

function sanitizeOwnedEquipmentIds(value, defaultEquipmentId, allowedEquipmentIds) {
  const ids = [defaultEquipmentId];
  if (!Array.isArray(value)) return ids;
  const seen = new Set(ids);
  for (const equipmentId of value) {
    if (
      typeof equipmentId !== 'string' ||
      equipmentId.trim().length === 0 ||
      seen.has(equipmentId) ||
      !allowedEquipmentIds.has(equipmentId)
    ) {
      continue;
    }
    ids.push(equipmentId);
    seen.add(equipmentId);
  }
  return ids;
}

function sanitizeStoredSnapshot(value, defaultEquipmentId, allowedEquipmentIds) {
  const fallback = createProgressionSnapshot(defaultEquipmentId);
  if (!isRecord(value) || value.version !== PROGRESSION_SCHEMA_VERSION) return fallback;

  const ownedEquipmentIds = sanitizeOwnedEquipmentIds(
    value.ownedEquipmentIds,
    defaultEquipmentId,
    allowedEquipmentIds,
  );
  const equippedEquipmentId = ownedEquipmentIds.includes(value.equippedEquipmentId)
    ? value.equippedEquipmentId
    : defaultEquipmentId;

  return Object.freeze({
    version: PROGRESSION_SCHEMA_VERSION,
    trainingMarks: sanitizeNonNegativeInteger(value.trainingMarks),
    ownedEquipmentIds: Object.freeze(ownedEquipmentIds),
    equippedEquipmentId,
    combatSkillLevel: sanitizeSkillLevel(value.combatSkillLevel),
  });
}

function createStoredRecord(snapshot) {
  return {
    version: PROGRESSION_SCHEMA_VERSION,
    trainingMarks: snapshot.trainingMarks,
    ownedEquipmentIds: [...snapshot.ownedEquipmentIds],
    equippedEquipmentId: snapshot.equippedEquipmentId,
    combatSkillLevel: snapshot.combatSkillLevel,
  };
}

export class ProgressionStorage {
  constructor(storage, key) {
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
  }

  load(defaultEquipmentId, allowedEquipmentIds = [defaultEquipmentId]) {
    const fallback = createProgressionSnapshot(defaultEquipmentId);
    const allowedIds = createAllowedEquipmentIds(allowedEquipmentIds, defaultEquipmentId);
    try {
      const serialized = this.storage.getItem(this.key);
      if (serialized === null) return fallback;
      return sanitizeStoredSnapshot(JSON.parse(serialized), defaultEquipmentId, allowedIds);
    } catch {
      return fallback;
    }
  }

  save(snapshot) {
    assertProgressionSnapshot(snapshot);
    try {
      this.storage.setItem(this.key, JSON.stringify(createStoredRecord(snapshot)));
      return true;
    } catch {
      return false;
    }
  }
}
