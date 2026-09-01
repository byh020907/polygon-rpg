import { deepFreeze, defineMap } from './MapDefinition.js';
import { MapStateResolver } from './MapStateResolver.js';

function offsetPoint(point, offset) {
  return Object.freeze({ x: point.x + offset.x, y: point.y + offset.y });
}

function roomOffset(room) {
  return Object.freeze({ x: room.bounds.x, y: room.bounds.y });
}

function withWorldCoordinates(object, offset) {
  const result = { ...object };
  if (object.points) {
    result.points = Object.freeze(object.points.map((point) => offsetPoint(point, offset)));
  }
  if (object.position) result.position = offsetPoint(object.position, offset);
  return Object.freeze(result);
}

function worldRoom(room) {
  const offset = roomOffset(room);
  return Object.freeze({
    ...room,
    groundY: room.groundY + offset.y,
    movementBounds: room.movementBounds
      ? Object.freeze({
          minX: room.movementBounds.minX + offset.x,
          maxX: room.movementBounds.maxX + offset.x,
        })
      : null,
    cameraAnchor: offsetPoint(
      room.cameraAnchor ?? { x: room.bounds.width / 2, y: room.bounds.height / 2 },
      offset,
    ),
    surfaces: Object.freeze(room.surfaces.map((surface) => withWorldCoordinates(surface, offset))),
    renderItems: Object.freeze(
      room.renderItems.map((item) =>
        Object.freeze({
          ...withWorldCoordinates(item, offset),
          renderOrder: item.renderOrder ?? room.renderOrder,
        }),
      ),
    ),
    entities: Object.freeze(room.entities.map((entity) => withWorldCoordinates(entity, offset))),
    triggers: Object.freeze(room.triggers.map((trigger) => withWorldCoordinates(trigger, offset))),
  });
}

function findRoom(map, regionId, roomId) {
  return (
    map.regions
      .find((region) => region.id === regionId)
      ?.rooms.find((room) => room.id === roomId) ?? null
  );
}

function endpointMatches(endpoint, active) {
  return endpoint.regionId === active.regionId && endpoint.roomId === active.roomId;
}

function endpointAnchor(endpoint, room) {
  return offsetPoint(endpoint.anchor ?? { x: 0, y: room.groundY }, roomOffset(room));
}

function endpointSpawn(endpoint, room) {
  return offsetPoint(
    endpoint.spawn ?? endpoint.anchor ?? { x: 0, y: room.groundY },
    roomOffset(room),
  );
}

function cameraPositionAt(room, position) {
  const bounds = room.cameraBounds ?? room.bounds;
  const minimumX = bounds.x + 480;
  const maximumX = bounds.x + bounds.width - 480;
  return Object.freeze({
    x:
      minimumX <= maximumX
        ? Math.max(minimumX, Math.min(maximumX, position.x))
        : room.cameraAnchor.x,
    y: room.cameraAnchor.y,
  });
}

function distanceBetween(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function surfaceYAtX(surface, x) {
  const matches = [];
  for (let index = 1; index < surface.points.length; index += 1) {
    const from = surface.points[index - 1];
    const to = surface.points[index];
    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);
    if (x < minX || x > maxX || from.x === to.x) continue;
    const amount = (x - from.x) / (to.x - from.x);
    matches.push(from.y + (to.y - from.y) * amount);
  }
  return matches.length > 0 ? Math.min(...matches) : null;
}

function surfaceResolution(surface, y) {
  return Object.freeze({
    surfaceId: surface.qualifiedId,
    kind: surface.kind,
    y,
  });
}

function compareSurfaceResolution(left, right) {
  return left.y - right.y || left.surfaceId.localeCompare(right.surfaceId);
}

function sortedRenderItems(rooms) {
  return Object.freeze(
    rooms
      .flatMap((room) => room.renderItems)
      .filter((item) => item.enabled !== false)
      .sort(
        (left, right) =>
          (left.renderOrder ?? 0) - (right.renderOrder ?? 0) ||
          (left.order ?? 0) - (right.order ?? 0) ||
          left.qualifiedId.localeCompare(right.qualifiedId),
      ),
  );
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
      regionId: spawn?.regionId ?? this.definition.initialRegionId,
      roomId: spawn?.roomId ?? this.definition.initialRoomId,
    });
    const spawnRoom = spawn ? this.definition.getRoom(spawn.regionId, spawn.roomId) : null;
    this.activeSpawn = spawn
      ? Object.freeze({
          id: spawn.id,
          position: offsetPoint(spawn.position, roomOffset(spawnRoom)),
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

  setActiveLocation(regionId, roomId, { position = null, facing = 1 } = {}) {
    if (!this.definition.getRoom(regionId, roomId)) {
      throw new Error(`존재하지 않는 region/room입니다: ${regionId}/${roomId}`);
    }
    if (
      position !== null &&
      (!Number.isFinite(position?.x) || !Number.isFinite(position?.y) || !Number.isFinite(facing))
    ) {
      throw new TypeError('active location spawn에는 유한한 position과 facing이 필요합니다.');
    }
    this.active = Object.freeze({ regionId, roomId });
    this.activeSpawn = position
      ? deepFreeze({ position: { x: position.x, y: position.y }, facing })
      : null;
    this.pendingTransition = null;
    this.revision += 1;
    this.invalidate();
    return this.getResolvedSnapshot();
  }

  getResolvedMap() {
    if (!this.resolvedMap) this.resolvedMap = this.resolver.resolve(this.worldContext);
    return this.resolvedMap;
  }

  getActiveRoom() {
    const room = findRoom(this.getResolvedMap(), this.active.regionId, this.active.roomId);
    if (!room) {
      throw new Error(
        `활성 room을 찾을 수 없습니다: ${this.active.regionId}/${this.active.roomId}`,
      );
    }
    return worldRoom(room);
  }

  getGroundYAt(x) {
    if (!Number.isFinite(x)) throw new TypeError('ground 탐색 x는 유한한 숫자여야 합니다.');
    const room = this.getActiveRoom();
    const candidates = room.surfaces
      .filter((surface) => surface.enabled !== false && surface.kind === 'solid')
      .map((surface) => surfaceYAtX(surface, x))
      .filter(Number.isFinite);
    return candidates.length > 0 ? Math.min(...candidates) : room.groundY;
  }

  resolveSupportAt(x, { footY, maxStepHeight = 6 } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(footY)) {
      throw new TypeError('support 탐색에는 유한한 x/footY가 필요합니다.');
    }
    if (!Number.isFinite(maxStepHeight) || maxStepHeight < 0) {
      throw new TypeError('support maxStepHeight는 0 이상의 유한한 숫자여야 합니다.');
    }
    const candidates = this.getActiveRoom()
      .surfaces.filter(
        (surface) =>
          surface.enabled !== false && (surface.kind === 'solid' || surface.kind === 'one-way'),
      )
      .map((surface) => {
        const y = surfaceYAtX(surface, x);
        return Number.isFinite(y) ? surfaceResolution(surface, y) : null;
      })
      .filter(
        (resolution) => resolution !== null && Math.abs(resolution.y - footY) <= maxStepHeight,
      )
      .sort(
        (left, right) =>
          Math.abs(left.y - footY) - Math.abs(right.y - footY) ||
          compareSurfaceResolution(left, right),
      );
    return candidates[0] ?? null;
  }

  resolveLandingAt(x, { previousFootY, nextFootY, descending } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(previousFootY) || !Number.isFinite(nextFootY)) {
      throw new TypeError('landing 탐색에는 유한한 x/previousFootY/nextFootY가 필요합니다.');
    }
    if (descending !== true) return null;
    const epsilon = 0.001;
    const candidates = this.getActiveRoom()
      .surfaces.filter(
        (surface) =>
          surface.enabled !== false && (surface.kind === 'solid' || surface.kind === 'one-way'),
      )
      .map((surface) => {
        const y = surfaceYAtX(surface, x);
        return Number.isFinite(y) ? surfaceResolution(surface, y) : null;
      })
      .filter(
        (resolution) =>
          resolution !== null &&
          previousFootY <= resolution.y + epsilon &&
          nextFootY >= resolution.y - epsilon,
      )
      .sort(compareSurfaceResolution);
    return candidates[0] ?? null;
  }

  getTriggerLocation(qualifiedId) {
    if (typeof qualifiedId !== 'string' || qualifiedId.trim().length === 0) return null;
    const map = this.getResolvedMap();
    for (const region of map.regions) {
      for (const room of region.rooms) {
        const trigger = room.triggers.find(
          (candidate) => candidate.qualifiedId === qualifiedId && candidate.enabled !== false,
        );
        if (!trigger?.position) continue;
        const worldTrigger = withWorldCoordinates(trigger, roomOffset(room));
        return Object.freeze({
          regionId: region.id,
          roomId: room.id,
          position: worldTrigger.position,
        });
      }
    }
    return null;
  }

  getPortals({ includeDisabled = false } = {}) {
    const map = this.getResolvedMap();
    const portalIds = new Set(this.getActiveRoom().portals);
    return Object.freeze(
      map.portals.filter(
        (portal) =>
          (includeDisabled || portal.enabled !== false) &&
          (endpointMatches(portal.from, this.active) ||
            (portal.bidirectional === true && endpointMatches(portal.to, this.active))) &&
          portalIds.has(portal.id),
      ),
    );
  }

  findPortalAt(position, { maxDistance } = {}) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new TypeError('portal 탐색 위치에는 유한한 x/y가 필요합니다.');
    }
    const room = findRoom(this.getResolvedMap(), this.active.regionId, this.active.roomId);
    return (
      this.getPortals()
        .map((portal) => {
          const endpoint = endpointMatches(portal.from, this.active) ? portal.from : portal.to;
          const anchor = endpointAnchor(endpoint, room);
          const radius = maxDistance ?? endpoint.radius ?? 48;
          return { portal, distance: distanceBetween(position, anchor), radius };
        })
        .filter(({ distance, radius }) => distance <= radius)
        .sort(
          (left, right) =>
            left.distance - right.distance || left.portal.id.localeCompare(right.portal.id),
        )[0]?.portal ?? null
    );
  }

  getPortal(portalId) {
    return this.getPortals().find((portal) => portal.id === portalId) ?? null;
  }

  beginPortalTransition(portalId) {
    if (this.pendingTransition) {
      throw new Error(`이미 portal transition이 진행 중입니다: ${this.pendingTransition.portalId}`);
    }
    const portal = this.getPortal(portalId);
    if (!portal) throw new Error(`현재 room에서 사용할 수 없는 portal입니다: ${portalId}`);
    const reverse = !endpointMatches(portal.from, this.active);
    const destination = reverse ? portal.from : portal.to;
    const sourceRoomDefinition = findRoom(
      this.getResolvedMap(),
      this.active.regionId,
      this.active.roomId,
    );
    const destinationRoomDefinition = findRoom(
      this.getResolvedMap(),
      destination.regionId,
      destination.roomId,
    );
    if (!destinationRoomDefinition) {
      throw new Error(
        `portal 목적지 room을 찾을 수 없습니다: ${destination.regionId}/${destination.roomId}`,
      );
    }
    const sourceRoom = worldRoom(sourceRoomDefinition);
    const destinationRoom = worldRoom(destinationRoomDefinition);
    const destinationPosition = endpointSpawn(destination, destinationRoomDefinition);
    const intent = deepFreeze({
      portalId: portal.id,
      travelSegmentId: portal.travelSegmentId ?? null,
      campaignTravel: portal.campaignTravel ?? null,
      from: { ...this.active },
      to: { regionId: destination.regionId, roomId: destination.roomId },
      destinationPosition,
      sourceCameraPosition: sourceRoom.cameraAnchor,
      destinationCameraPosition: cameraPositionAt(destinationRoom, destinationPosition),
      durationSeconds: portal.transition.durationSeconds,
      elapsedSeconds: 0,
      progress: 0,
    });
    this.pendingTransition = intent;
    this.revision += 1;
    this.snapshot = null;
    return intent;
  }

  getTransition() {
    return this.pendingTransition;
  }

  advanceTransition(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new TypeError('portal transition deltaSeconds는 0 이상의 유한한 숫자여야 합니다.');
    }
    if (!this.pendingTransition) throw new Error('진행 중인 portal transition이 없습니다.');
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
    if (transition.progress < 1) return deepFreeze({ transition, completion: null });
    return deepFreeze({ transition, completion: this.completeTransition(transition.portalId) });
  }

  completeTransition(portalId = this.pendingTransition?.portalId) {
    if (!this.pendingTransition || portalId !== this.pendingTransition.portalId) {
      throw new Error(`시작되지 않은 portal transition입니다: ${portalId}`);
    }
    const result = this.pendingTransition;
    this.active = Object.freeze({ ...result.to });
    this.activeSpawn = Object.freeze({ position: result.destinationPosition, facing: 1 });
    this.pendingTransition = null;
    this.revision += 1;
    this.invalidate();
    const snapshot = this.getResolvedSnapshot();
    return deepFreeze({
      portalId: result.portalId,
      travelSegmentId: result.travelSegmentId,
      campaignTravel: result.campaignTravel,
      active: { ...this.active },
      position: { ...result.destinationPosition },
      facing: this.activeSpawn.facing,
      room: snapshot.room,
      collisionSurfaces: snapshot.collisionSurfaces,
      entities: snapshot.entities,
    });
  }

  cancelTransition() {
    if (!this.pendingTransition) return false;
    this.pendingTransition = null;
    this.revision += 1;
    this.snapshot = null;
    return true;
  }

  getResolvedSnapshot() {
    if (this.snapshot) return this.snapshot;
    const map = this.getResolvedMap();
    const roomDefinition = findRoom(map, this.active.regionId, this.active.roomId);
    const room = worldRoom(roomDefinition);
    const portals = this.getPortals();
    const presentationRooms = [room];
    if (this.pendingTransition) {
      const destinationDefinition = findRoom(
        map,
        this.pendingTransition.to.regionId,
        this.pendingTransition.to.roomId,
      );
      if (destinationDefinition) presentationRooms.push(worldRoom(destinationDefinition));
    }
    this.snapshot = deepFreeze({
      mapId: map.id,
      revision: this.revision,
      appliedPatchIds: map.appliedPatchIds,
      active: { ...this.active },
      transition: this.pendingTransition,
      spawn: this.activeSpawn,
      visibleRoomIds: presentationRooms.map((candidate) => candidate.id),
      room,
      renderItems: sortedRenderItems(presentationRooms),
      collisionSurfaces: room.surfaces.filter((surface) => surface.enabled !== false),
      entities: room.entities.filter((entity) => entity.enabled !== false),
      triggers: room.triggers.filter((trigger) => trigger.enabled !== false),
      portals,
      worldBounds: room.bounds,
      cameraBounds: room.cameraBounds ?? room.bounds,
      cameraPosition: room.cameraAnchor,
    });
    return this.snapshot;
  }
}
