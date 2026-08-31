import assert from 'node:assert/strict';

import {
  REGION_EXPANSION_CHECKPOINT_ID,
  RegionExpansionProgress,
} from '../src/game/encounter/RegionExpansionProgress.js';
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

function assertSpatialDefinition() {
  const room = ACADEMY_VILLAGE_MAP.getRoom('glasswind-region', 'glasswind-observatory');
  assert.ok(room, 'Glasswind Dungeon Room이 존재해야 한다.');
  assert.equal(room.bounds.width, 1200);
  assert.deepEqual(room.movementBounds, { minX: 24, maxX: 1176 });

  const surfaceIds = room.surfaces.map((surface) => surface.id);
  assert.deepEqual(surfaceIds, [
    'glasswind-observatory-surface',
    'glasswind-observatory-ascent-surface',
    'glasswind-observatory-gallery-surface',
    'glasswind-observatory-descent-surface',
    'glasswind-observatory-lower-surface',
    'glasswind-checkpoint-alcove-surface',
    'glasswind-boss-threshold-surface',
  ]);

  const renderIds = new Set(room.renderItems.map((item) => item.id));
  for (const id of [
    'glasswind-observatory-entrance-vault',
    'glasswind-observatory-wind-lens',
    'glasswind-observatory-crosswind-hazard',
    'glasswind-checkpoint-alcove',
    'glasswind-checkpoint-plinth',
    'glasswind-boss-threshold-arch',
    'glasswind-boss-threshold-opening',
  ]) {
    assert.ok(renderIds.has(id), `공간 역할 landmark가 필요합니다: ${id}`);
  }

  const checkpoint = room.triggers.find((trigger) => trigger.id === 'glasswind-checkpoint');
  assert.equal(checkpoint.qualifiedId, REGION_EXPANSION_CHECKPOINT_ID);
  assert.deepEqual(checkpoint.position, { x: 980, y: 408 });

  const bossPortal = ACADEMY_VILLAGE_MAP.getPortal('glasswind-boss-portal');
  assert.equal(bossPortal.from.roomId, 'glasswind-observatory');
  assert.deepEqual(bossPortal.from.anchor, { x: 1110, y: 424 });
  assert.equal(bossPortal.to.roomId, 'glasswind-storm-eye');

  const thresholdOpening = room.renderItems.find(
    (item) => item.id === 'glasswind-boss-threshold-opening',
  );
  const openingXs = thresholdOpening.points.map((point) => point.x);
  const openingYs = thresholdOpening.points.map((point) => point.y);
  assert.ok(Math.max(...openingXs) - Math.min(...openingXs) >= 80);
  assert.ok(Math.max(...openingYs) - Math.min(...openingYs) >= 110);
}

function assertResolvedRoute() {
  const runtime = new MapRuntime(ACADEMY_VILLAGE_MAP, {
    worldContext: {
      glasswindBridgeStable: true,
      glasswindCheckpointActivated: true,
    },
  });
  runtime.setActiveLocation('glasswind-region', 'glasswind-observatory');
  const room = runtime.getActiveRoom();
  const samples = [
    [150, 424],
    [320, 407],
    [525, 390],
    [710, 407],
    [980, 408],
    [1110, 424],
  ];
  for (const [localX, expectedY] of samples) {
    assert.equal(runtime.getGroundYAt(room.bounds.x + localX), expectedY);
  }

  let previousGround = runtime.getGroundYAt(room.bounds.x + room.movementBounds.minX);
  for (let localX = room.movementBounds.minX + 4; localX <= room.movementBounds.maxX; localX += 4) {
    const ground = runtime.getGroundYAt(room.bounds.x + localX);
    assert.ok(Number.isFinite(ground), `필수 이동 경로가 x=${localX}에서 이어져야 한다.`);
    assert.ok(
      Math.abs(ground - previousGround) <= 2,
      `x=${localX}의 높이 변화가 이동 가능해야 한다.`,
    );
    previousGround = ground;
  }

  const checkpoint = runtime.getTriggerLocation(REGION_EXPANSION_CHECKPOINT_ID);
  assert.equal(checkpoint.regionId, 'glasswind-region');
  assert.equal(checkpoint.roomId, 'glasswind-observatory');
  assert.deepEqual(checkpoint.position, { x: room.bounds.x + 980, y: 408 });

  assert.deepEqual(
    runtime
      .getPortals()
      .map((portal) => portal.id)
      .sort(),
    ['glasswind-boss-portal', 'glasswind-dungeon-portal'],
  );
  const portal = runtime.findPortalAt({ x: room.bounds.x + 1110, y: 424 });
  assert.equal(portal?.id, 'glasswind-boss-portal');
  const transition = runtime.beginPortalTransition(portal.id);
  assert.deepEqual(transition.to, {
    regionId: 'glasswind-region',
    roomId: 'glasswind-storm-eye',
  });
  const completed = runtime.advanceTransition(transition.durationSeconds).completion;
  assert.equal(completed.portalId, 'glasswind-boss-portal');
  assert.equal(completed.active.roomId, 'glasswind-storm-eye');
}

function assertProgressionIdAndPlayerTraversal() {
  const progress = new RegionExpansionProgress();
  const first = progress.activateCheckpoint(REGION_EXPANSION_CHECKPOINT_ID);
  assert.equal(first.changed, true);
  assert.equal(first.snapshot.checkpointId, REGION_EXPANSION_CHECKPOINT_ID);
  assert.equal(progress.activateCheckpoint(REGION_EXPANSION_CHECKPOINT_ID).changed, false);

  const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
  scene.setVisualQaLocation({
    regionId: 'glasswind-region',
    roomId: 'glasswind-observatory',
    x: 150,
  });
  let minimumFootY = scene.position.y + 82;
  for (let tick = 0; tick < 720; tick += 1) {
    scene.update(STEP_SECONDS, Object.freeze({ ...EMPTY_INPUT, right: true }));
    minimumFootY = Math.min(minimumFootY, scene.position.y + 82);
    if (scene.isGrounded) {
      const authoredGroundY = scene.mapRuntime.getGroundYAt(scene.position.x);
      assert.ok(
        Math.abs(scene.position.y + 82 - authoredGroundY) < 0.001,
        `Player 발이 authored surface에 고정되어야 한다: tick=${tick}, x=${scene.position.x}, foot=${scene.position.y + 82}, ground=${authoredGroundY}`,
      );
    }
  }
  assert.ok(scene.position.x >= 8680 + 1080, '입구에서 Boss threshold까지 이동해야 한다.');
  assert.ok(minimumFootY <= 390.001, '탐색 gallery의 고저차를 실제로 올라야 한다.');
  assert.equal(scene.regionExpansionProgress.snapshot().checkpointActivated, true);
}

assertSpatialDefinition();
assertResolvedRoute();
assertProgressionIdAndPlayerTraversal();

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      room: 'glasswind-observatory',
      roles: [
        'entrance',
        'elevated-gallery',
        'crosswind-hazard',
        'checkpoint-alcove',
        'boss-threshold',
      ],
      fixedHz: 120,
      stableCheckpointId: REGION_EXPANSION_CHECKPOINT_ID,
    },
    null,
    2,
  ),
);
