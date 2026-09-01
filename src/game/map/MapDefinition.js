const OBJECT_COLLECTIONS = Object.freeze(['surfaces', 'renderItems', 'entities', 'triggers']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertRecord(value, label) {
  if (!isRecord(value)) throw new TypeError(`${label}은(는) 객체여야 합니다.`);
}

function assertId(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label}은(는) 비어 있지 않은 문자열이어야 합니다.`);
  }
}

function assertFinite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label}은(는) 유한한 숫자여야 합니다.`);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
}

export function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}

function validatePoint(point, label) {
  assertRecord(point, label);
  assertFinite(point.x, `${label}.x`);
  assertFinite(point.y, `${label}.y`);
}

function qualify(mapId, regionId, roomId, localId) {
  return [mapId, regionId, roomId, localId].filter(Boolean).join(':');
}

function normalizeRoom(mapId, regionId, room, roomIndex) {
  assertRecord(room, `regions[${regionId}].rooms[${roomIndex}]`);
  assertId(room.id, `regions[${regionId}].rooms[${roomIndex}].id`);
  const normalized = cloneValue(room);
  normalized.qualifiedId = normalized.qualifiedId ?? qualify(mapId, regionId, room.id);
  assertRecord(normalized.bounds, `${normalized.qualifiedId}.bounds`);
  for (const key of ['x', 'y', 'width', 'height']) {
    assertFinite(normalized.bounds[key], `${normalized.qualifiedId}.bounds.${key}`);
  }
  if (!(normalized.bounds.width > 0 && normalized.bounds.height > 0)) {
    throw new RangeError(`${normalized.qualifiedId}.bounds의 크기는 0보다 커야 합니다.`);
  }
  assertFinite(normalized.groundY, `${normalized.qualifiedId}.groundY`);
  normalized.renderOrder = normalized.renderOrder ?? 30;
  assertFinite(normalized.renderOrder, `${normalized.qualifiedId}.renderOrder`);
  if (normalized.movementBounds !== undefined) {
    assertRecord(normalized.movementBounds, `${normalized.qualifiedId}.movementBounds`);
    assertFinite(normalized.movementBounds.minX, `${normalized.qualifiedId}.movementBounds.minX`);
    assertFinite(normalized.movementBounds.maxX, `${normalized.qualifiedId}.movementBounds.maxX`);
    if (normalized.movementBounds.maxX < normalized.movementBounds.minX) {
      throw new RangeError(`${normalized.qualifiedId}.movementBounds의 maxX가 minX보다 작습니다.`);
    }
  }
  if (normalized.cameraAnchor !== undefined) {
    validatePoint(normalized.cameraAnchor, `${normalized.qualifiedId}.cameraAnchor`);
  }

  for (const collectionName of OBJECT_COLLECTIONS) {
    const collection = normalized[collectionName] ?? [];
    if (!Array.isArray(collection)) {
      throw new TypeError(`${normalized.qualifiedId}.${collectionName}은(는) 배열이어야 합니다.`);
    }
    const localIds = new Set();
    normalized[collectionName] = collection.map((entry, index) => {
      assertRecord(entry, `${normalized.qualifiedId}.${collectionName}[${index}]`);
      assertId(entry.id, `${normalized.qualifiedId}.${collectionName}[${index}].id`);
      if (localIds.has(entry.id)) {
        throw new Error(
          `${normalized.qualifiedId}.${collectionName}에 중복 ID가 있습니다: ${entry.id}`,
        );
      }
      localIds.add(entry.id);
      const result = cloneValue(entry);
      result.qualifiedId = result.qualifiedId ?? qualify(mapId, regionId, room.id, result.id);
      result.enabled = result.enabled ?? true;
      if (collectionName === 'surfaces') {
        if (!Array.isArray(result.points) || result.points.length < 2) {
          throw new Error(`${result.qualifiedId}.points에는 최소 두 점이 필요합니다.`);
        }
        result.points.forEach((point, pointIndex) =>
          validatePoint(point, `${result.qualifiedId}.points[${pointIndex}]`),
        );
      }
      if (collectionName === 'renderItems' && result.points !== undefined) {
        if (!Array.isArray(result.points) || result.points.length < 3) {
          throw new Error(`${result.qualifiedId}.points에는 최소 세 점이 필요합니다.`);
        }
        result.points.forEach((point, pointIndex) =>
          validatePoint(point, `${result.qualifiedId}.points[${pointIndex}]`),
        );
      }
      return result;
    });
  }

  normalized.portals = normalized.portals ?? [];
  if (!Array.isArray(normalized.portals)) {
    throw new TypeError(`${normalized.qualifiedId}.portals은(는) 배열이어야 합니다.`);
  }
  normalized.portals.forEach((portalId, index) =>
    assertId(portalId, `${normalized.qualifiedId}.portals[${index}]`),
  );
  return normalized;
}

function normalizeEndpoint(endpoint, label) {
  assertRecord(endpoint, label);
  assertId(endpoint.regionId, `${label}.regionId`);
  assertId(endpoint.roomId, `${label}.roomId`);
  const normalized = cloneValue(endpoint);
  if (normalized.anchor !== undefined) validatePoint(normalized.anchor, `${label}.anchor`);
  if (normalized.spawn !== undefined) validatePoint(normalized.spawn, `${label}.spawn`);
  if (normalized.radius !== undefined) assertFinite(normalized.radius, `${label}.radius`);
  return normalized;
}

function normalizePortal(portal, mapId, index) {
  assertRecord(portal, `portals[${index}]`);
  assertId(portal.id, `portals[${index}].id`);
  const normalized = cloneValue(portal);
  normalized.qualifiedId = normalized.qualifiedId ?? `${mapId}:portal:${normalized.id}`;
  normalized.enabled = normalized.enabled ?? true;
  normalized.from = normalizeEndpoint(normalized.from, `${normalized.qualifiedId}.from`);
  normalized.to = normalizeEndpoint(normalized.to, `${normalized.qualifiedId}.to`);
  normalized.transition = normalized.transition ?? { durationSeconds: 0.32 };
  assertRecord(normalized.transition, `${normalized.qualifiedId}.transition`);
  normalized.transition.durationSeconds = normalized.transition.durationSeconds ?? 0.32;
  if (normalized.travelSegmentId !== undefined) {
    assertId(normalized.travelSegmentId, `${normalized.qualifiedId}.travelSegmentId`);
  }
  assertFinite(
    normalized.transition.durationSeconds,
    `${normalized.qualifiedId}.transition.durationSeconds`,
  );
  if (!(normalized.transition.durationSeconds > 0)) {
    throw new RangeError(
      `${normalized.qualifiedId}.transition.durationSeconds는 0보다 커야 합니다.`,
    );
  }
  return normalized;
}

function normalizePatch(patch, index) {
  assertRecord(patch, `patches[${index}]`);
  assertId(patch.id, `patches[${index}].id`);
  const normalized = cloneValue(patch);
  normalized.priority = normalized.priority ?? 0;
  assertFinite(normalized.priority, `${normalized.id}.priority`);
  const operations = normalized.operations ?? normalized.changes ?? normalized.targets ?? [];
  if (!Array.isArray(operations)) {
    throw new TypeError(`${normalized.id}.operations은(는) 배열이어야 합니다.`);
  }
  normalized.operations = operations.map((operation, operationIndex) => {
    assertRecord(operation, `${normalized.id}.operations[${operationIndex}]`);
    const result = cloneValue(operation);
    result.target = result.target ?? result.targetId;
    if (typeof result.target !== 'string' && !isRecord(result.target)) {
      throw new TypeError(`${normalized.id}.operations[${operationIndex}].target이 필요합니다.`);
    }
    const op = result.op ?? (result.override ? 'override' : 'set-enabled');
    if (!['set-enabled', 'set-active-portal', 'set', 'override'].includes(op)) {
      throw new Error(
        `${normalized.id}.operations[${operationIndex}]의 op를 지원하지 않습니다: ${op}`,
      );
    }
    result.op = op;
    if (op === 'set') {
      assertId(result.property, `${normalized.id}.operations[${operationIndex}].property`);
      if (
        ['id', 'qualifiedId', '__proto__', 'prototype', 'constructor'].includes(result.property)
      ) {
        throw new Error(`${result.property} 속성은 패치할 수 없습니다.`);
      }
    }
    return result;
  });
  delete normalized.changes;
  delete normalized.targets;
  return normalized;
}

function targetKey(operation) {
  const target =
    typeof operation.target === 'string'
      ? operation.target
      : JSON.stringify(operation.target, Object.keys(operation.target).sort());
  const property =
    operation.op === 'set'
      ? operation.property
      : operation.op === 'override'
        ? Object.keys(operation.override ?? {})
            .sort()
            .join(',')
        : 'enabled';
  return `${target}|${property}`;
}

function validatePatchConflicts(patches) {
  const writes = new Set();
  for (const patch of patches) {
    for (const operation of patch.operations) {
      const key = `${patch.priority}|${targetKey(operation)}`;
      if (writes.has(key)) throw new Error(`동일 우선순위의 패치가 같은 대상을 변경합니다: ${key}`);
      writes.add(key);
    }
  }
}

function normalizeDefinition(rawDefinition) {
  assertRecord(rawDefinition, 'map definition');
  assertId(rawDefinition.id, 'map definition.id');
  const normalized = cloneValue(rawDefinition);
  normalized.version = normalized.version ?? 2;
  if (!Array.isArray(normalized.regions) || normalized.regions.length === 0) {
    throw new Error('map definition.regions에는 최소 한 개의 region이 필요합니다.');
  }

  const roomKeys = new Set();
  const regionIds = new Set();
  normalized.regions = normalized.regions.map((region, regionIndex) => {
    assertRecord(region, `regions[${regionIndex}]`);
    assertId(region.id, `regions[${regionIndex}].id`);
    if (regionIds.has(region.id)) throw new Error(`중복 region ID입니다: ${region.id}`);
    regionIds.add(region.id);
    const result = cloneValue(region);
    result.qualifiedId = result.qualifiedId ?? qualify(normalized.id, result.id);
    if (!Array.isArray(result.rooms) || result.rooms.length === 0) {
      throw new Error(`${result.qualifiedId}.rooms에는 최소 한 개의 room이 필요합니다.`);
    }
    const roomIds = new Set();
    result.rooms = result.rooms.map((room, roomIndex) => {
      const normalizedRoom = normalizeRoom(normalized.id, result.id, room, roomIndex);
      if (roomIds.has(normalizedRoom.id))
        throw new Error(`중복 room ID입니다: ${normalizedRoom.id}`);
      roomIds.add(normalizedRoom.id);
      roomKeys.add(`${result.id}/${normalizedRoom.id}`);
      return normalizedRoom;
    });
    return result;
  });

  normalized.portals = (normalized.portals ?? []).map((portal, index) =>
    normalizePortal(portal, normalized.id, index),
  );
  const portalIds = new Set();
  for (const portal of normalized.portals) {
    if (portalIds.has(portal.id)) throw new Error(`중복 portal ID입니다: ${portal.id}`);
    portalIds.add(portal.id);
    for (const endpoint of [portal.from, portal.to]) {
      if (!roomKeys.has(`${endpoint.regionId}/${endpoint.roomId}`)) {
        throw new Error(`${portal.qualifiedId}이 존재하지 않는 room을 가리킵니다.`);
      }
    }
  }
  for (const region of normalized.regions) {
    for (const room of region.rooms) {
      for (const portalId of room.portals) {
        if (!portalIds.has(portalId)) {
          throw new Error(`${room.qualifiedId}이 존재하지 않는 portal을 참조합니다: ${portalId}`);
        }
      }
    }
  }

  normalized.spawns = normalized.spawns ?? [];
  if (!Array.isArray(normalized.spawns))
    throw new TypeError('map definition.spawns은(는) 배열이어야 합니다.');
  const spawnIds = new Set();
  normalized.spawns = normalized.spawns.map((spawn, index) => {
    assertRecord(spawn, `spawns[${index}]`);
    assertId(spawn.id, `spawns[${index}].id`);
    if (spawnIds.has(spawn.id)) throw new Error(`중복 spawn ID입니다: ${spawn.id}`);
    spawnIds.add(spawn.id);
    if (!roomKeys.has(`${spawn.regionId}/${spawn.roomId}`)) {
      throw new Error(`spawn(${spawn.id})이 존재하지 않는 room을 가리킵니다.`);
    }
    validatePoint(spawn.position, `spawn(${spawn.id}).position`);
    return { facing: 1, ...cloneValue(spawn), qualifiedId: `${normalized.id}:spawn:${spawn.id}` };
  });

  if (normalized.initialSpawnId !== undefined && !spawnIds.has(normalized.initialSpawnId)) {
    throw new Error(`initialSpawnId가 존재하지 않습니다: ${normalized.initialSpawnId}`);
  }
  const initialSpawn = normalized.spawns.find((spawn) => spawn.id === normalized.initialSpawnId);
  normalized.initialRegionId =
    initialSpawn?.regionId ?? normalized.initialRegionId ?? normalized.regions[0].id;
  const initialRegion = normalized.regions.find(
    (region) => region.id === normalized.initialRegionId,
  );
  if (!initialRegion)
    throw new Error(`initialRegionId가 존재하지 않습니다: ${normalized.initialRegionId}`);
  normalized.initialRoomId =
    initialSpawn?.roomId ?? normalized.initialRoomId ?? initialRegion.rooms[0].id;
  if (!roomKeys.has(`${normalized.initialRegionId}/${normalized.initialRoomId}`)) {
    throw new Error('초기 region/room 조합이 존재하지 않습니다.');
  }

  normalized.patches = (normalized.patches ?? []).map(normalizePatch);
  const patchIds = new Set();
  for (const patch of normalized.patches) {
    if (patchIds.has(patch.id)) throw new Error(`중복 patch ID입니다: ${patch.id}`);
    patchIds.add(patch.id);
  }
  validatePatchConflicts(normalized.patches);
  return normalized;
}

export class MapDefinition {
  constructor(rawDefinition) {
    Object.assign(this, normalizeDefinition(rawDefinition));
    deepFreeze(this);
  }

  getRegion(regionId) {
    return this.regions.find((region) => region.id === regionId) ?? null;
  }

  getRoom(regionId, roomId) {
    return this.getRegion(regionId)?.rooms.find((room) => room.id === roomId) ?? null;
  }

  getPortal(portalId) {
    return this.portals.find((portal) => portal.id === portalId) ?? null;
  }

  getSpawn(spawnId) {
    return this.spawns.find((spawn) => spawn.id === spawnId) ?? null;
  }

  toObject() {
    return cloneValue(this);
  }
}

export function defineMap(rawDefinition) {
  return rawDefinition instanceof MapDefinition ? rawDefinition : new MapDefinition(rawDefinition);
}
