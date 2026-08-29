import { deepFreeze, defineMap } from './MapDefinition.js';
import { MapStateResolver } from './MapStateResolver.js';

function offsetPoint(point, offset) {
  return Object.freeze({ x: point.x + offset.x, y: point.y + offset.y });
}

function withWorldCoordinates(object, offset) {
  if (!object.points) return object;
  return Object.freeze({
    ...object,
    points: Object.freeze(object.points.map((point) => offsetPoint(point, offset))),
  });
}

function endpointAnchor(endpoint) {
  const nested = endpoint.anchor;
  return Object.freeze({
    x: nested?.x ?? endpoint.x ?? 0,
    y: nested?.y ?? endpoint.y,
  });
}

function endpointSpawn(endpoint) {
  const nested = endpoint.spawn ?? endpoint.anchor;
  return Object.freeze({
    x: nested?.x ?? endpoint.x ?? 0,
    y: nested?.y ?? endpoint.y,
  });
}

function distanceBetween(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function worldLane(lane) {
  const offset = lane.worldOffset ?? { x: 0, y: 0 };
  const movementBounds = lane.movementBounds
    ? Object.freeze({
        minX: lane.movementBounds.minX + offset.x,
        maxX: lane.movementBounds.maxX + offset.x,
      })
    : null;
  return Object.freeze({
    ...lane,
    groundY: lane.groundY === undefined ? undefined : lane.groundY + offset.y,
    movementBounds,
    surfaces: Object.freeze(lane.surfaces.map((surface) => withWorldCoordinates(surface, offset))),
    renderItems: Object.freeze(lane.renderItems.map((item) => withWorldCoordinates(item, offset))),
    entities: Object.freeze(
      lane.entities.map((entity) =>
        entity.position
          ? Object.freeze({ ...entity, position: offsetPoint(entity.position, offset) })
          : entity,
      ),
    ),
    triggers: Object.freeze(
      lane.triggers.map((trigger) => {
        const result = { ...trigger };
        if (trigger.position) result.position = offsetPoint(trigger.position, offset);
        if (trigger.points)
          result.points = Object.freeze(trigger.points.map((point) => offsetPoint(point, offset)));
        return Object.freeze(result);
      }),
    ),
  });
}

function findLane(map, chunkId, laneId) {
  return (
    map.chunks.find((chunk) => chunk.id === chunkId)?.lanes.find((lane) => lane.id === laneId) ??
    null
  );
}

function connectionFromActive(connection, active) {
  return connection.from.chunkId === active.chunkId && connection.from.laneId === active.laneId;
}

function connectionToActive(connection, active) {
  return connection.to.chunkId === active.chunkId && connection.to.laneId === active.laneId;
}

export class MapRuntime {
  constructor(definition, { worldContext = {}, spawnId } = {}) {
    this.definition = defineMap(definition);
    this.resolver = new MapStateResolver(this.definition);
    this.worldContext = deepFreeze({ ...worldContext });
    this.revision = 0;
    this.resolvedMap = null;
    this.snapshot = null;
    this.pendingTransition = null;
    this.reset(spawnId);
  }

  reset(spawnId = this.definition.initialSpawnId) {
    const spawn = spawnId ? this.definition.getSpawn(spawnId) : null;
    if (spawnId && !spawn) throw new Error(`존재하지 않는 spawn입니다: ${spawnId}`);
    this.active = Object.freeze({
      chunkId: spawn?.chunkId ?? this.definition.initialChunkId,
      laneId: spawn?.laneId ?? this.definition.initialLaneId,
    });
    const spawnLane = spawn ? this.definition.getLane(spawn.chunkId, spawn.laneId) : null;
    this.activeSpawn = spawn
      ? Object.freeze({
          id: spawn.id,
          position: offsetPoint(spawn.position, spawnLane.worldOffset),
          facing: spawn.facing,
        })
      : null;
    this.pendingTransition = null;
    this.revision += 1;
    this.invalidate();
    return this.getResolvedSnapshot();
  }

  invalidate() {
    this.resolvedMap = null;
    this.snapshot = null;
  }

  setWorldContext(nextContext) {
    if (nextContext === null || typeof nextContext !== 'object' || Array.isArray(nextContext)) {
      throw new TypeError('worldContext는 객체여야 합니다.');
    }
    this.worldContext = deepFreeze({ ...nextContext });
    this.revision += 1;
    this.invalidate();
    return this.getResolvedSnapshot();
  }

  getWorldContext() {
    return this.worldContext;
  }

  getActiveLocation() {
    return this.active;
  }

  setActiveLocation(chunkId, laneId) {
    if (!this.definition.getLane(chunkId, laneId)) {
      throw new Error(`존재하지 않는 chunk/lane입니다: ${chunkId}/${laneId}`);
    }
    this.active = Object.freeze({ chunkId, laneId });
    this.activeSpawn = null;
    this.pendingTransition = null;
    this.revision += 1;
    this.invalidate();
    return this.getResolvedSnapshot();
  }

  getResolvedMap() {
    if (!this.resolvedMap) this.resolvedMap = this.resolver.resolve(this.worldContext);
    return this.resolvedMap;
  }

  getActiveLane() {
    const lane = findLane(this.getResolvedMap(), this.active.chunkId, this.active.laneId);
    if (!lane)
      throw new Error(`활성 lane을 찾을 수 없습니다: ${this.active.chunkId}/${this.active.laneId}`);
    return worldLane(lane);
  }

  getConnections({ direction, includeDisabled = false } = {}) {
    const map = this.getResolvedMap();
    const inlineIds = new Set(this.getActiveLane().connections);
    return Object.freeze(
      map.connections.filter(
        (connection) =>
          (includeDisabled || connection.enabled !== false) &&
          (direction === undefined || connection.direction === direction) &&
          (connectionFromActive(connection, this.active) ||
            (connection.bidirectional === true && connectionToActive(connection, this.active))) &&
          (inlineIds.size === 0 || inlineIds.has(connection.id)),
      ),
    );
  }

  findConnectionAt(position, { interactionId = 'interact', direction, maxDistance } = {}) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new TypeError('connection 탐색 위치에는 유한한 x/y가 필요합니다.');
    }
    const lane = this.getActiveLane();
    const candidates = this.getConnections({ direction })
      .filter(
        (connection) =>
          interactionId === undefined ||
          connection.interactionId === undefined ||
          connection.interactionId === interactionId,
      )
      .map((connection) => {
        const reverse = !connectionFromActive(connection, this.active);
        const endpoint = reverse ? connection.to : connection.from;
        const localAnchor = endpointAnchor(endpoint);
        const anchor = { x: localAnchor.x + lane.worldOffset.x };
        if (localAnchor.y !== undefined) anchor.y = localAnchor.y + lane.worldOffset.y;
        const radius = maxDistance ?? endpoint.radius ?? endpoint.minDistance ?? 48;
        const distance =
          anchor.y === undefined
            ? Math.abs(position.x - anchor.x)
            : distanceBetween(position, anchor);
        return { connection, distance, radius };
      })
      .filter(({ distance, radius }) => distance <= radius)
      .sort(
        (left, right) =>
          left.distance - right.distance || left.connection.id.localeCompare(right.connection.id),
      );
    return candidates[0]?.connection ?? null;
  }

  getConnection(connectionId) {
    return (
      this.getConnections({ includeDisabled: false }).find(
        (connection) => connection.id === connectionId,
      ) ?? null
    );
  }

  beginTransition(connectionId) {
    if (this.pendingTransition) {
      throw new Error(
        `이미 connection transition이 진행 중입니다: ${this.pendingTransition.connectionId}`,
      );
    }
    const connection = this.getConnection(connectionId);
    if (!connection)
      throw new Error(`현재 lane에서 사용할 수 없는 connection입니다: ${connectionId}`);
    const reverse = !connectionFromActive(connection, this.active);
    const destination = reverse ? connection.from : connection.to;
    const destinationLaneDefinition = findLane(
      this.getResolvedMap(),
      destination.chunkId,
      destination.laneId,
    );
    if (!destinationLaneDefinition) {
      throw new Error(
        `connection 목적지 lane을 찾을 수 없습니다: ${destination.chunkId}/${destination.laneId}`,
      );
    }
    const destinationLane = worldLane(destinationLaneDefinition);
    const destinationSpawn = endpointSpawn(destination);
    const destinationPosition = offsetPoint(
      {
        x: destinationSpawn.x,
        y: destinationSpawn.y ?? destinationLaneDefinition.groundY ?? 0,
      },
      destinationLaneDefinition.worldOffset,
    );
    const intent = deepFreeze({
      connectionId: connection.id,
      direction: reverse
        ? connection.direction === 'front'
          ? 'back'
          : connection.direction === 'back'
            ? 'front'
            : connection.direction
        : connection.direction,
      from: { ...this.active },
      to: { chunkId: destination.chunkId, laneId: destination.laneId },
      destinationPosition,
      destinationLane: {
        id: destinationLane.id,
        renderOrder: destinationLane.renderOrder,
        visualScale: destinationLane.visualScale,
      },
      transition: { ...(connection.transition ?? {}) },
      durationSeconds: connection.transition.durationSeconds,
      elapsedSeconds: 0,
      progress: 0,
    });
    this.pendingTransition = intent;
    this.revision += 1;
    this.invalidate();
    return intent;
  }

  getTransition() {
    return this.pendingTransition;
  }

  advanceTransition(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new TypeError('connection transition deltaSeconds는 0 이상의 유한한 숫자여야 합니다.');
    }
    if (!this.pendingTransition) {
      throw new Error('진행 중인 connection transition이 없습니다.');
    }

    const elapsedSeconds = Math.min(
      this.pendingTransition.durationSeconds,
      this.pendingTransition.elapsedSeconds + deltaSeconds,
    );
    const transition = deepFreeze({
      ...this.pendingTransition,
      elapsedSeconds,
      progress: elapsedSeconds / this.pendingTransition.durationSeconds,
    });
    this.pendingTransition = transition;
    this.revision += 1;
    this.snapshot = null;

    if (transition.progress < 1) {
      return deepFreeze({ transition, completion: null });
    }
    const completion = this.completeTransition(transition.connectionId);
    return deepFreeze({ transition, completion });
  }

  completeTransition(connectionId = this.pendingTransition?.connectionId) {
    if (!this.pendingTransition || connectionId !== this.pendingTransition.connectionId) {
      throw new Error(`시작되지 않은 connection transition입니다: ${connectionId}`);
    }
    const result = this.pendingTransition;
    const worldSpawn = result.destinationPosition;
    this.active = Object.freeze({ ...result.to });
    this.activeSpawn = Object.freeze({ position: worldSpawn, facing: 1 });
    this.pendingTransition = null;
    this.revision += 1;
    this.invalidate();
    return deepFreeze({
      connectionId: result.connectionId,
      active: { ...this.active },
      position: { ...worldSpawn },
      facing: this.activeSpawn.facing,
    });
  }

  cancelTransition() {
    if (!this.pendingTransition) return false;
    this.pendingTransition = null;
    this.revision += 1;
    this.invalidate();
    return true;
  }

  getResolvedSnapshot() {
    if (this.snapshot) return this.snapshot;
    const map = this.getResolvedMap();
    const lane = this.getActiveLane();
    const connections = this.getConnections();
    const visibleChunkIds = new Set([this.active.chunkId]);
    for (const connection of connections) {
      visibleChunkIds.add(
        connectionFromActive(connection, this.active)
          ? connection.to.chunkId
          : connection.from.chunkId,
      );
    }
    const activeChunk = map.chunks.find((chunk) => chunk.id === this.active.chunkId);
    const renderItems = (activeChunk?.lanes ?? [])
      .flatMap((chunkLane) => {
        const resolvedLane = worldLane(chunkLane);
        return resolvedLane.renderItems
          .filter((item) => item.enabled !== false)
          .map((item) => ({
            item: Object.freeze({
              ...item,
              laneId: resolvedLane.id,
              renderOrder: item.renderOrder ?? resolvedLane.renderOrder,
            }),
          }));
      })
      .sort(
        (left, right) =>
          left.item.renderOrder - right.item.renderOrder ||
          (left.item.order ?? 0) - (right.item.order ?? 0) ||
          left.item.qualifiedId.localeCompare(right.item.qualifiedId),
      )
      .map(({ item }) => item);
    this.snapshot = deepFreeze({
      mapId: map.id,
      revision: this.revision,
      appliedPatchIds: map.appliedPatchIds,
      active: { ...this.active },
      transition: this.pendingTransition,
      spawn: this.activeSpawn,
      visibleChunkIds: [...visibleChunkIds],
      lane,
      renderItems,
      collisionSurfaces: lane.surfaces.filter((surface) => surface.enabled !== false),
      entities: lane.entities.filter((entity) => entity.enabled !== false),
      connections,
      worldBounds: activeChunk?.bounds ?? null,
      cameraBounds: activeChunk?.cameraBounds ?? activeChunk?.bounds ?? null,
    });
    return this.snapshot;
  }
}
