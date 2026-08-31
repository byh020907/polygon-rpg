import assert from 'node:assert/strict';

import { MapRuntime } from '../src/game/map/MapRuntime.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const STEP_SECONDS = 1 / 120;
const EMPTY_INPUT = Object.freeze({
  left: false,
  right: false,
  jump: false,
  guard: false,
  basicAttack: false,
  strongAttack: false,
  jumpSequence: 0,
  basicAttackSequence: 0,
  strongAttackSequence: 0,
});

const ROOM_CASES = Object.freeze([
  Object.freeze({
    roomId: 'academy-plaza',
    width: 1024,
    portalIds: Object.freeze([
      'academy-field-portal',
      'academy-glasswind-portal',
      'academy-training-portal',
    ]),
    landmarkPrefixes: Object.freeze([
      'academy-training-gate',
      'academy-glasswind-gate',
      'academy-field-gate',
    ]),
  }),
  Object.freeze({
    roomId: 'field-crossing',
    width: 1200,
    portalIds: Object.freeze(['academy-field-portal', 'field-bypass-portal']),
    landmarkPrefixes: Object.freeze([
      'field-village-gate',
      'field-canopy-gate',
      'field-dungeon-gate',
    ]),
  }),
  Object.freeze({
    roomId: 'field-canopy',
    width: 1200,
    portalIds: Object.freeze(['bypass-dungeon-portal', 'field-bypass-portal']),
    landmarkPrefixes: Object.freeze(['canopy-return-gate', 'canopy-dungeon-gate']),
  }),
]);

function roomDefinition(roomId) {
  const room = ACADEMY_VILLAGE_MAP.getRoom('academy-region', roomId);
  assert.ok(room, `${roomId} authored Room이 존재해야 한다.`);
  return room;
}

function bounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

function assertSpatialDefinitions() {
  for (const roomCase of ROOM_CASES) {
    const room = roomDefinition(roomCase.roomId);
    const runtime = new MapRuntime(ACADEMY_VILLAGE_MAP, {
      worldContext: { timePhase: 'day', storyFlags: {} },
    });
    runtime.setActiveLocation('academy-region', roomCase.roomId);
    assert.equal(room.bounds.width, roomCase.width);
    for (const prefix of roomCase.landmarkPrefixes) {
      const opening = room.renderItems.find((item) => item.id === `${prefix}-landmark-opening`);
      assert.ok(opening, `${roomCase.roomId}에 환경형 출입구가 필요합니다: ${prefix}`);
      const openingBounds = bounds(opening.points);
      assert.ok(openingBounds.width >= 70, `${prefix} 개구부는 사람 너비로 읽혀야 한다.`);
      assert.ok(openingBounds.height >= 100, `${prefix} 개구부는 사람 높이로 읽혀야 한다.`);
      const centerX =
        opening.points.reduce((sum, point) => sum + point.x, 0) / opening.points.length;
      assert.equal(
        runtime.getGroundYAt(room.bounds.x + centerX),
        room.bounds.y + openingBounds.bottom,
        `${prefix} 개구부는 실제 authored ground에 서야 한다.`,
      );
    }
  }

  const academy = roomDefinition('academy-plaza');
  assert.ok(
    academy.renderItems.some(
      (item) => item.id === 'plaza-foreground-planter-left' && item.renderOrder > 30.5,
    ),
    'Academy Plaza에는 Player 앞을 지나는 실제 foreground layer가 필요하다.',
  );

  const crossing = roomDefinition('field-crossing');
  assert.deepEqual(crossing.surfaces[0].points, [
    { x: 0, y: 430 },
    { x: 180, y: 430 },
    { x: 300, y: 412 },
    { x: 460, y: 412 },
    { x: 540, y: 430 },
    { x: 1200, y: 430 },
  ]);
  const canopy = roomDefinition('field-canopy');
  assert.deepEqual(canopy.surfaces[0].points, [
    { x: 0, y: 430 },
    { x: 160, y: 430 },
    { x: 300, y: 398 },
    { x: 540, y: 412 },
    { x: 820, y: 394 },
    { x: 960, y: 430 },
    { x: 1200, y: 430 },
  ]);
  assert.deepEqual(
    canopy.renderItems.find((item) => item.id === 'canopy-root-bridge').points,
    canopy.surfaces[0].points,
    '수관 우회로 render root와 gameplay surface는 같은 authored geometry를 사용해야 한다.',
  );
}

function localEndpoint(portal, roomId) {
  if (portal.from.roomId === roomId) return portal.from;
  if (portal.bidirectional && portal.to.roomId === roomId) return portal.to;
  return null;
}

function surfaceCoversX(surface, x) {
  return surface.points.some((point, index) => {
    if (index === 0) return false;
    const previous = surface.points[index - 1];
    return (
      previous.x !== point.x &&
      x >= Math.min(previous.x, point.x) &&
      x <= Math.max(previous.x, point.x)
    );
  });
}

function assertResolvedRoom(context, roomCase) {
  const runtime = new MapRuntime(ACADEMY_VILLAGE_MAP, { worldContext: context });
  runtime.setActiveLocation('academy-region', roomCase.roomId);
  const room = runtime.getActiveRoom();
  assert.deepEqual(
    runtime
      .getPortals()
      .map((portal) => portal.id)
      .sort(),
    [...roomCase.portalIds].sort(),
    `${roomCase.roomId}의 필수 Portal availability가 안정적이어야 한다.`,
  );

  let previousGround = runtime.getGroundYAt(room.movementBounds.minX);
  for (let x = room.movementBounds.minX + 4; x <= room.movementBounds.maxX; x += 4) {
    assert.ok(
      room.surfaces.some(
        (surface) =>
          surface.kind === 'solid' && surface.enabled !== false && surfaceCoversX(surface, x),
      ),
      `${roomCase.roomId} authored solid surface가 x=${x}를 직접 덮어야 한다.`,
    );
    const ground = runtime.getGroundYAt(x);
    assert.ok(Number.isFinite(ground), `${roomCase.roomId} 필수 경로가 x=${x}에서 이어져야 한다.`);
    assert.ok(
      Math.abs(ground - previousGround) <= 2,
      `${roomCase.roomId} x=${x}의 surface 높이 변화가 이동 가능해야 한다.`,
    );
    previousGround = ground;
  }

  for (const portal of runtime.getPortals()) {
    const endpoint = localEndpoint(portal, roomCase.roomId);
    assert.ok(endpoint, `${portal.id}의 현재 Room endpoint가 필요하다.`);
    const worldAnchor = {
      x: room.bounds.x + endpoint.anchor.x,
      y: room.bounds.y + endpoint.anchor.y,
    };
    assert.equal(
      runtime.getGroundYAt(worldAnchor.x),
      worldAnchor.y,
      `${portal.id} anchor는 같은 gameplay surface에 고정되어야 한다.`,
    );
    assert.equal(runtime.findPortalAt(worldAnchor)?.id, portal.id);
  }
  return runtime;
}

function canReachRoom(context, fromRoomId, toRoomId) {
  const runtime = new MapRuntime(ACADEMY_VILLAGE_MAP, { worldContext: context });
  const start = `academy-region:${fromRoomId}`;
  const destination = `academy-region:${toRoomId}`;
  const adjacency = new Map();
  const addEdge = (from, to) => {
    const targets = adjacency.get(from) ?? new Set();
    targets.add(to);
    adjacency.set(from, targets);
  };
  for (const portal of runtime
    .getResolvedMap()
    .portals.filter((candidate) => candidate.enabled !== false)) {
    const from = `${portal.from.regionId}:${portal.from.roomId}`;
    const to = `${portal.to.regionId}:${portal.to.roomId}`;
    addEdge(from, to);
    if (portal.bidirectional) addEdge(to, from);
  }
  const queue = [start];
  const visited = new Set(queue);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === destination) return true;
    for (const next of adjacency.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return false;
}

function assertPatchAndRouteMatrix() {
  for (const context of [
    { timePhase: 'day', storyFlags: {} },
    { timePhase: 'night', storyFlags: {} },
  ]) {
    for (const roomCase of ROOM_CASES) assertResolvedRoom(context, roomCase);
    assert.ok(
      canReachRoom(context, 'academy-plaza', 'sealed-forest-dungeon'),
      'direct gate가 잠겨도 canopy 우회로로 Dungeon에 도달해야 한다.',
    );
  }

  const night = new MapRuntime(ACADEMY_VILLAGE_MAP, {
    worldContext: { timePhase: 'night', storyFlags: {} },
  });
  night.setActiveLocation('academy-region', 'field-crossing');
  const nightIds = new Set(night.getResolvedSnapshot().renderItems.map((item) => item.id));
  assert.ok(nightIds.has('field-crossing-night-veil'));
  assert.ok(nightIds.has('field-crossing-night-waylight'));
  assert.ok(!nightIds.has('field-crossing-day-canopy-light'));
  assert.ok(night.getResolvedMap().appliedPatchIds.includes('first-field-night-presentation'));

  const locked = new MapRuntime(ACADEMY_VILLAGE_MAP, {
    worldContext: { timePhase: 'day', storyFlags: {} },
  });
  locked.setActiveLocation('academy-region', 'field-crossing');
  assert.equal(locked.getPortal('field-dungeon-portal'), null);
  assert.ok(locked.getPortal('field-bypass-portal'));
  const lockedIds = new Set(locked.getResolvedSnapshot().renderItems.map((item) => item.id));
  assert.ok(lockedIds.has('field-dungeon-locked-seal'));
  assert.ok(!lockedIds.has('field-dungeon-gate-inner'));

  const clearedContext = {
    timePhase: 'night',
    storyFlags: { fieldGuardianDefeated: true },
  };
  const clearedCase = Object.freeze({
    ...ROOM_CASES.find((entry) => entry.roomId === 'field-crossing'),
    portalIds: Object.freeze([
      'academy-field-portal',
      'field-bypass-portal',
      'field-dungeon-portal',
    ]),
  });
  const cleared = assertResolvedRoom(clearedContext, clearedCase);
  assert.ok(
    canReachRoom(clearedContext, 'academy-plaza', 'sealed-forest-dungeon'),
    'guardian 격파 뒤 direct route로 Dungeon에 도달해야 한다.',
  );
  const clearedIds = new Set(cleared.getResolvedSnapshot().renderItems.map((item) => item.id));
  assert.ok(!clearedIds.has('field-dungeon-locked-seal'));
  assert.ok(clearedIds.has('field-dungeon-gate-inner'));
  assert.ok(clearedIds.has('field-guardian-bloom'));
  assert.ok(
    !cleared.getResolvedSnapshot().entities.some((entity) => entity.id === 'field-guardian'),
  );

  const crossing = roomDefinition('field-crossing');
  const bloom = crossing.renderItems.find((item) => item.id === 'field-guardian-bloom');
  const bloomCenterX = bloom.points.reduce((sum, point) => sum + point.x, 0) / bloom.points.length;
  const guardian = crossing.entities.find((entity) => entity.id === 'field-guardian');
  assert.equal(
    bloomCenterX,
    guardian.position.x,
    '승리 흔적은 실제 guardian 전투 위치에 남아야 한다.',
  );

  const forward = new MapRuntime(ACADEMY_VILLAGE_MAP, {
    worldContext: { timePhase: 'day', storyFlags: {} },
  });
  forward.setActiveLocation('academy-region', 'academy-plaza');
  const forwardTravel = forward.beginPortalTransition('academy-field-portal');
  assert.ok(forwardTravel.destinationCameraPosition.x > forwardTravel.sourceCameraPosition.x);
  assert.ok(
    forwardTravel.destinationPosition.x > 2480 + 80,
    'Field 도착 spawn은 입구 안쪽이어야 한다.',
  );

  const reverse = new MapRuntime(ACADEMY_VILLAGE_MAP, {
    worldContext: { timePhase: 'day', storyFlags: {} },
  });
  reverse.setActiveLocation('academy-region', 'field-crossing');
  const reverseTravel = reverse.beginPortalTransition('academy-field-portal');
  assert.ok(reverseTravel.destinationCameraPosition.x < reverseTravel.sourceCameraPosition.x);
  assert.ok(
    reverseTravel.destinationPosition.x < 910,
    'Academy 귀환 spawn은 입구 안쪽이어야 한다.',
  );
}

function assertPlayerTraversalAndCameraTravel() {
  const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
  const progression = scene.getProgressionSnapshot();
  scene.restoreProgression(
    Object.freeze({
      ...progression,
      firstJourney: Object.freeze({
        ...progression.firstJourney,
        phase: 'field',
        routeChoice: 'guardian-route',
        fieldGuardianDefeated: true,
      }),
    }),
  );
  scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'field-crossing', x: 145 });
  const initialCameraX = scene.cameraPosition.x;
  let minimumFootY = scene.position.y + 82;
  for (let tick = 0; tick < 960; tick += 1) {
    scene.update(STEP_SECONDS, Object.freeze({ ...EMPTY_INPUT, right: true }));
    minimumFootY = Math.min(minimumFootY, scene.position.y + 82);
    if (scene.isGrounded) {
      assert.ok(
        Math.abs(scene.position.y + 82 - scene.mapRuntime.getGroundYAt(scene.position.x)) < 0.001,
        `Player 발이 Field surface에 고정되어야 한다: tick=${tick}`,
      );
    }
  }
  assert.ok(scene.position.x >= 2480 + 1080, 'Field 입구에서 Dungeon threshold까지 이동해야 한다.');
  assert.ok(minimumFootY <= 412.001, 'Field route의 실제 고저차를 통과해야 한다.');
  assert.ok(
    scene.cameraPosition.x - initialCameraX >= 200,
    'camera가 목적지 방향으로 travel해야 한다.',
  );
}

assertSpatialDefinitions();
assertPatchAndRouteMatrix();
assertPlayerTraversalAndCameraTravel();

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      rooms: ROOM_CASES.map((entry) => entry.roomId),
      roles: ['academy-life-zones', 'field-route-choice', 'combat-glade', 'canopy-bypass'],
      states: ['day', 'night', 'guardian-locked', 'guardian-cleared'],
      fixedHz: 120,
    },
    null,
    2,
  ),
);
