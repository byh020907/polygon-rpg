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

function qualify(mapId, chunkId, laneId, localId) {
  return [mapId, chunkId, laneId, localId].filter(Boolean).join(':');
}

function normalizeLane(mapId, chunkId, lane, laneIndex) {
  assertRecord(lane, `chunks[${chunkId}].lanes[${laneIndex}]`);
  assertId(lane.id, `chunks[${chunkId}].lanes[${laneIndex}].id`);
  const normalized = cloneValue(lane);
  normalized.qualifiedId = normalized.qualifiedId ?? qualify(mapId, chunkId, lane.id);
  normalized.worldOffset = normalized.worldOffset ?? { x: 0, y: 0 };
  validatePoint(normalized.worldOffset, `${normalized.qualifiedId}.worldOffset`);
  normalized.renderOrder = normalized.renderOrder ?? 0;
  assertFinite(normalized.renderOrder, `${normalized.qualifiedId}.renderOrder`);
  normalized.visualScale = normalized.visualScale ?? 1;
  assertFinite(normalized.visualScale, `${normalized.qualifiedId}.visualScale`);
  if (!(normalized.visualScale > 0)) {
    throw new RangeError(`${normalized.qualifiedId}.visualScale은(는) 0보다 커야 합니다.`);
  }
  if (normalized.groundY !== undefined) {
    assertFinite(normalized.groundY, `${normalized.qualifiedId}.groundY`);
  }
  if (normalized.movementBounds !== undefined) {
    assertRecord(normalized.movementBounds, `${normalized.qualifiedId}.movementBounds`);
    assertFinite(normalized.movementBounds.minX, `${normalized.qualifiedId}.movementBounds.minX`);
    assertFinite(normalized.movementBounds.maxX, `${normalized.qualifiedId}.movementBounds.maxX`);
    if (normalized.movementBounds.maxX < normalized.movementBounds.minX) {
      throw new RangeError(
        `${normalized.qualifiedId}.movementBounds의 maxX는 minX 이상이어야 합니다.`,
      );
    }
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
      result.qualifiedId = result.qualifiedId ?? qualify(mapId, chunkId, lane.id, result.id);
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

  normalized.connections = normalized.connections ?? [];
  if (!Array.isArray(normalized.connections)) {
    throw new TypeError(`${normalized.qualifiedId}.connections은(는) 배열이어야 합니다.`);
  }
  return normalized;
}

function normalizeEndpoint(endpoint, label) {
  assertRecord(endpoint, label);
  assertId(endpoint.chunkId, `${label}.chunkId`);
  assertId(endpoint.laneId, `${label}.laneId`);
  const normalized = cloneValue(endpoint);
  if (normalized.x !== undefined) assertFinite(normalized.x, `${label}.x`);
  if (normalized.y !== undefined) assertFinite(normalized.y, `${label}.y`);
  if (normalized.anchor !== undefined) validatePoint(normalized.anchor, `${label}.anchor`);
  if (normalized.spawn !== undefined) validatePoint(normalized.spawn, `${label}.spawn`);
  if (normalized.minDistance !== undefined) {
    assertFinite(normalized.minDistance, `${label}.minDistance`);
  }
  if (normalized.radius !== undefined) assertFinite(normalized.radius, `${label}.radius`);
  return normalized;
}

function normalizeConnection(connection, source, mapId) {
  assertRecord(connection, `connection(${source.chunkId}/${source.laneId})`);
  assertId(connection.id, 'connection.id');
  const normalized = cloneValue(connection);
  normalized.qualifiedId = normalized.qualifiedId ?? `${mapId}:connection:${normalized.id}`;
  normalized.enabled = normalized.enabled ?? true;
  normalized.from = normalizeEndpoint(
    { chunkId: source.chunkId, laneId: source.laneId, ...normalized.from },
    `${normalized.qualifiedId}.from`,
  );
  normalized.to = normalizeEndpoint(normalized.to, `${normalized.qualifiedId}.to`);
  if (
    normalized.direction !== undefined &&
    normalized.direction !== 'front' &&
    normalized.direction !== 'back'
  ) {
    throw new Error(`${normalized.qualifiedId}.direction은 front 또는 back이어야 합니다.`);
  }
  normalized.transition = normalized.transition ?? { durationSeconds: 0.28 };
  assertRecord(normalized.transition, `${normalized.qualifiedId}.transition`);
  normalized.transition.durationSeconds = normalized.transition.durationSeconds ?? 0.28;
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
    if (!['set-enabled', 'set-active-connection', 'set', 'override'].includes(op)) {
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
      if (writes.has(key)) {
        throw new Error(`동일 우선순위의 패치가 같은 대상을 변경합니다: ${key}`);
      }
      writes.add(key);
    }
  }
}

function normalizeDefinition(rawDefinition) {
  assertRecord(rawDefinition, 'map definition');
  assertId(rawDefinition.id, 'map definition.id');
  const normalized = cloneValue(rawDefinition);
  normalized.version = normalized.version ?? 1;
  if (!Array.isArray(normalized.chunks) || normalized.chunks.length === 0) {
    throw new Error('map definition.chunks에는 최소 한 개의 chunk가 필요합니다.');
  }

  const chunkIds = new Set();
  const laneKeys = new Set();
  const inlineConnections = [];
  normalized.chunks = normalized.chunks.map((chunk, chunkIndex) => {
    assertRecord(chunk, `chunks[${chunkIndex}]`);
    assertId(chunk.id, `chunks[${chunkIndex}].id`);
    if (chunkIds.has(chunk.id)) throw new Error(`중복 chunk ID입니다: ${chunk.id}`);
    chunkIds.add(chunk.id);
    const result = cloneValue(chunk);
    result.qualifiedId = result.qualifiedId ?? qualify(normalized.id, result.id);
    if (result.bounds !== undefined) {
      assertRecord(result.bounds, `${result.qualifiedId}.bounds`);
      for (const key of ['x', 'y', 'width', 'height']) {
        assertFinite(result.bounds[key], `${result.qualifiedId}.bounds.${key}`);
      }
      if (!(result.bounds.width > 0 && result.bounds.height > 0)) {
        throw new RangeError(`${result.qualifiedId}.bounds의 크기는 0보다 커야 합니다.`);
      }
    }
    if (!Array.isArray(result.lanes) || result.lanes.length === 0) {
      throw new Error(`${result.qualifiedId}.lanes에는 최소 한 개의 lane이 필요합니다.`);
    }
    const localLaneIds = new Set();
    result.lanes = result.lanes.map((lane, laneIndex) => {
      const normalizedLane = normalizeLane(normalized.id, result.id, lane, laneIndex);
      if (localLaneIds.has(normalizedLane.id)) {
        throw new Error(`${result.qualifiedId}에 중복 lane ID가 있습니다: ${normalizedLane.id}`);
      }
      localLaneIds.add(normalizedLane.id);
      laneKeys.add(`${result.id}/${normalizedLane.id}`);
      for (const connection of normalizedLane.connections) {
        if (typeof connection !== 'string') {
          inlineConnections.push(
            normalizeConnection(
              connection,
              { chunkId: result.id, laneId: normalizedLane.id },
              normalized.id,
            ),
          );
        }
      }
      normalizedLane.connections = normalizedLane.connections.map((connection) =>
        typeof connection === 'string' ? connection : connection.id,
      );
      return normalizedLane;
    });
    return result;
  });

  const connections = normalized.connections ?? [];
  if (!Array.isArray(connections))
    throw new TypeError('map definition.connections은(는) 배열이어야 합니다.');
  normalized.connections = [
    ...connections.map((connection) => normalizeConnection(connection, {}, normalized.id)),
    ...inlineConnections,
  ];
  const connectionIds = new Set();
  for (const connection of normalized.connections) {
    if (connectionIds.has(connection.id))
      throw new Error(`중복 connection ID입니다: ${connection.id}`);
    connectionIds.add(connection.id);
    for (const [name, endpoint] of Object.entries({ from: connection.from, to: connection.to })) {
      if (!laneKeys.has(`${endpoint.chunkId}/${endpoint.laneId}`)) {
        throw new Error(`${connection.qualifiedId}.${name}이 존재하지 않는 lane을 가리킵니다.`);
      }
    }
  }
  for (const chunk of normalized.chunks) {
    for (const lane of chunk.lanes) {
      for (const connectionId of lane.connections) {
        if (!connectionIds.has(connectionId)) {
          throw new Error(
            `${lane.qualifiedId}이 존재하지 않는 connection을 참조합니다: ${connectionId}`,
          );
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
    if (!laneKeys.has(`${spawn.chunkId}/${spawn.laneId}`)) {
      throw new Error(`spawn(${spawn.id})이 존재하지 않는 lane을 가리킵니다.`);
    }
    validatePoint(spawn.position, `spawn(${spawn.id}).position`);
    return { facing: 1, ...cloneValue(spawn), qualifiedId: `${normalized.id}:spawn:${spawn.id}` };
  });

  if (normalized.initialSpawnId !== undefined && !spawnIds.has(normalized.initialSpawnId)) {
    throw new Error(
      `initialSpawnId가 존재하지 않는 spawn을 가리킵니다: ${normalized.initialSpawnId}`,
    );
  }
  const initialSpawn = normalized.spawns.find((spawn) => spawn.id === normalized.initialSpawnId);
  normalized.initialChunkId =
    initialSpawn?.chunkId ??
    normalized.initialChunkId ??
    normalized.initial?.chunkId ??
    normalized.chunks[0].id;
  const initialChunk = normalized.chunks.find((chunk) => chunk.id === normalized.initialChunkId);
  if (!initialChunk)
    throw new Error(`initialChunkId가 존재하지 않습니다: ${normalized.initialChunkId}`);
  normalized.initialLaneId =
    initialSpawn?.laneId ??
    normalized.initialLaneId ??
    normalized.initial?.laneId ??
    initialChunk.lanes[0].id;
  if (!laneKeys.has(`${normalized.initialChunkId}/${normalized.initialLaneId}`)) {
    throw new Error('초기 chunk/lane 조합이 존재하지 않습니다.');
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
    const normalized = normalizeDefinition(rawDefinition);
    Object.assign(this, normalized);
    deepFreeze(this);
  }

  getChunk(chunkId) {
    return this.chunks.find((chunk) => chunk.id === chunkId) ?? null;
  }

  getLane(chunkId, laneId) {
    return this.getChunk(chunkId)?.lanes.find((lane) => lane.id === laneId) ?? null;
  }

  getConnection(connectionId) {
    return this.connections.find((connection) => connection.id === connectionId) ?? null;
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
