import assert from 'node:assert/strict';

import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { MapRuntime } from '../src/game/map/MapRuntime.js';
import { FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE } from '../src/game/journey/FirstJourneyDungeonSignature.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const STEP_SECONDS = 1 / 120;
const FOOT_OFFSET = 82;
const PLATFORM_Y = 342;
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

function assertAuthoredPlatform() {
  const room = ACADEMY_VILLAGE_MAP.getRoom('academy-region', 'sealed-resonance-vault');
  const surface = room.surfaces.find(
    (candidate) => candidate.id === 'sealed-resonance-vault-one-way-platform-surface',
  );
  const renderItem = room.renderItems.find(
    (candidate) => candidate.id === 'sealed-resonance-vault-one-way-platform',
  );
  assert.equal(surface.kind, 'one-way');
  assert.deepEqual(surface.points, [
    { x: 180, y: PLATFORM_Y },
    { x: 360, y: PLATFORM_Y },
  ]);
  assert.deepEqual(
    renderItem.points.slice(0, 2),
    surface.points,
    'one-way platform의 보이는 상단선과 collision 선은 같은 authored geometry여야 한다.',
  );
}

function assertNeutralCollisionContract() {
  const runtime = new MapRuntime(ACADEMY_VILLAGE_MAP);
  runtime.setActiveLocation('academy-region', 'sealed-resonance-vault');
  const room = runtime.getActiveRoom();
  const worldX = room.bounds.x + 270;
  const worldPlatformY = room.bounds.y + PLATFORM_Y;

  assert.equal(
    runtime.resolveLandingAt(worldX, {
      previousFootY: worldPlatformY + 8,
      nextFootY: worldPlatformY - 4,
      descending: false,
    }),
    null,
    'one-way platform은 아래에서 상승할 때 collision 후보가 아니어야 한다.',
  );
  assert.deepEqual(
    runtime.resolveLandingAt(worldX, {
      previousFootY: worldPlatformY - 4,
      nextFootY: worldPlatformY + 3,
      descending: true,
    }),
    {
      surfaceId:
        'academy-village:academy-region:sealed-resonance-vault:sealed-resonance-vault-one-way-platform-surface',
      kind: 'one-way',
      y: worldPlatformY,
    },
  );
  assert.equal(
    runtime.resolveSupportAt(worldX, { footY: worldPlatformY })?.kind,
    'one-way',
    '착지한 one-way platform은 다음 fixed-step의 지지면이어야 한다.',
  );
  assert.equal(runtime.getGroundYAt(worldX), room.bounds.y + room.groundY);
}

function assertPlayerTraversal() {
  const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
  const progression = scene.getProgressionSnapshot();
  scene.restoreProgression(
    Object.freeze({
      ...progression,
      firstJourney: Object.freeze({
        ...progression.firstJourney,
        phase: 'dungeon',
        routeChoice: 'bypass',
        dungeonGuardianDefeated: true,
        dungeonSignatureStageIds: Object.freeze([
          FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION,
          FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT,
        ]),
      }),
    }),
  );
  scene.setVisualQaLocation({
    regionId: 'academy-region',
    roomId: 'sealed-resonance-vault',
    x: 270,
  });
  const room = scene.mapRuntime.getActiveRoom();
  const worldPlatformY = room.bounds.y + PLATFORM_Y;
  assert.equal(scene.position.y + FOOT_OFFSET, room.bounds.y + room.groundY);

  scene.update(STEP_SECONDS, Object.freeze({ ...EMPTY_INPUT, jump: true, jumpSequence: 1 }));
  let passedThroughFromBelow = false;
  let landedOnPlatform = false;
  for (let tick = 0; tick < 240; tick += 1) {
    scene.update(STEP_SECONDS, Object.freeze({ ...EMPTY_INPUT, jumpSequence: 1 }));
    const footY = scene.position.y + FOOT_OFFSET;
    if (scene.verticalVelocity < 0 && footY < worldPlatformY) {
      passedThroughFromBelow = true;
      assert.equal(scene.isGrounded, false, 'platform 아래에서 상승 중에는 착지하면 안 된다.');
    }
    if (passedThroughFromBelow && scene.isGrounded && Math.abs(footY - worldPlatformY) < 0.001) {
      landedOnPlatform = true;
      break;
    }
  }
  assert.equal(passedThroughFromBelow, true, 'Player가 one-way platform을 아래에서 통과해야 한다.');
  assert.equal(landedOnPlatform, true, 'Player가 하강할 때 one-way platform 위에 착지해야 한다.');

  let leftPlatformWhileAirborne = false;
  for (let tick = 0; tick < 180; tick += 1) {
    scene.update(STEP_SECONDS, Object.freeze({ ...EMPTY_INPUT, right: true, jumpSequence: 1 }));
    const localX = scene.position.x - room.bounds.x;
    if (localX > 360 && !scene.isGrounded) leftPlatformWhileAirborne = true;
  }
  assert.equal(
    leftPlatformWhileAirborne,
    true,
    'platform 가장자리를 벗어나면 아래 지면으로 순간이동하지 않고 낙하해야 한다.',
  );
  assert.equal(scene.isGrounded, true);
  assert.ok(
    Math.abs(scene.position.y + FOOT_OFFSET - (room.bounds.y + room.groundY)) < 0.001,
    'platform 이탈 뒤 authored solid ground에 착지해야 한다.',
  );
}

assertAuthoredPlatform();
assertNeutralCollisionContract();
assertPlayerTraversal();

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      room: 'sealed-resonance-vault',
      surfaceKind: 'one-way',
      fixedHz: 120,
      verified: ['below-to-above-pass', 'descending-land', 'edge-fall', 'render-contact-match'],
    },
    null,
    2,
  ),
);
