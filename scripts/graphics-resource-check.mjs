import { equipmentTestSnapshot } from './fixtures/equipment-loadouts.mjs';
import assert from 'node:assert/strict';
import {
  createGraphicsResourceCatalog,
  GRAPHICS_CATEGORIES,
  GRAPHICS_EFFECT_DEFINITIONS,
} from '../src/graphics/GraphicsResourceCatalog.js';
import {
  createGraphicsResourceSampler,
  graphicsPlayerMotionInput,
} from '../src/graphics/GraphicsResourceSampler.js';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
import { PROLOGUE_UNDERGROUND_ROOM_IDS } from '../src/game/maps/PrologueUndergroundMap.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { EQUIPMENT_ITEMS } from '../src/game/equipment/EquipmentCatalog.js';
import { createGameScene } from '../src/app/createGameScene.js';
import { COMBAT_MOTION_TIMING_PROFILES } from '../src/combat/CombatMotionTimingProfiles.js';
import { createMapGraphicResources } from '../src/graphics/MapGraphicResources.js';
import { defineMap } from '../src/game/map/MapDefinition.js';
import {
  PLAYER_MOTION_PROFILE,
  advancePlayerAnimationTime,
  playerJumpPhaseTiming,
} from '../src/animation/PlayerMotionProfile.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';

const catalog = createGraphicsResourceCatalog();
const sampler = createGraphicsResourceSampler(catalog);
let sampledConditions = 0;
let parityFrames = 0;
const producerEffectGroups = new Set();
const exercisedEffectGroups = new Set();

try {
  const sourceBefore = JSON.stringify(SCRAP_AWAKENING_MAP);
  const rawItems = SCRAP_AWAKENING_MAP.regions.flatMap((region) =>
    region.rooms.flatMap((room) => room.renderItems),
  );
  const prologueRegion = SCRAP_AWAKENING_MAP.regions.find(
    (region) => region.id === 'scrap-waste-edge',
  );
  assert.deepEqual(
    prologueRegion.rooms.map((room) => room.id),
    Object.values(PROLOGUE_UNDERGROUND_ROOM_IDS),
    'the prologue graphics inventory must preserve all five selected underground spaces',
  );
  for (const room of prologueRegion.rooms) {
    const sceneResource = catalog.get(`scene:${prologueRegion.id}:${room.id}`);
    assert.equal(sceneResource?.category, 'scene', `${room.id} must be reviewable as a scene`);
    assert.equal(sceneResource?.roomId, room.id);
    assert.ok(room.renderItems.length > 0, `${room.id} must own authored graphics`);
    for (const item of room.renderItems) {
      const resource = catalog.get(`map:${item.qualifiedId}`);
      assert.equal(resource?.regionId, prologueRegion.id, item.qualifiedId);
      assert.equal(resource?.roomId, room.id, item.qualifiedId);
    }
  }
  for (const [roomId, itemId, category] of [
    [PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD, 'scrap-yard-skyline', 'background'],
    [PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK, 'underground-upper-vault', 'terrain'],
    [PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP, 'underground-chest-ramp-visible', 'terrain'],
    [
      PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
      'underground-control-core-dais',
      'terrain',
    ],
    [
      PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN,
      'underground-maintenance-service-rail',
      'terrain',
    ],
  ]) {
    const item = prologueRegion.rooms
      .find((room) => room.id === roomId)
      .renderItems.find((candidate) => candidate.id === itemId);
    const resource = catalog.get(`map:${item.qualifiedId}`);
    assert.equal(resource.category, category, `${roomId}/${itemId} keeps its semantic category`);
  }
  assert.equal(catalog.inventory.rawItemCount, rawItems.length);
  assert.equal(
    catalog.inventory.disabledItemCount,
    rawItems.filter((item) => item.enabled === false).length,
  );
  for (const item of rawItems) assert.ok(catalog.get(`map:${item.qualifiedId}`), item.qualifiedId);
  const extendedMap = SCRAP_AWAKENING_MAP.toObject();
  extendedMap.regions
    .find((region) => region.id === 'scrap-waste-edge')
    .rooms.find((room) => room.id === PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD)
    .renderItems.push(
      {
        id: 'new-unknown-resource',
        points: [
          { x: 1, y: 1 },
          { x: 3, y: 1 },
          { x: 2, y: 3 },
        ],
        fill: '#ffffff',
        enabled: false,
      },
      {
        id: 'new-authored-group-body',
        points: [
          { x: 5, y: 1 },
          { x: 7, y: 1 },
          { x: 6, y: 3 },
        ],
        fill: '#ffffff',
        graphics: { category: 'npc', groupId: 'new-authored-group', label: '새 현장 인물' },
      },
    );
  const extended = createMapGraphicResources(defineMap(extendedMap));
  assert.ok(
    extended.resources.some(
      (resource) => resource.id.endsWith(':new-unknown-resource') && resource.category === 'prop',
    ),
  );
  assert.ok(
    extended.resources.some(
      (resource) => resource.id.startsWith('npc:') && resource.label === '새 현장 인물',
    ),
  );
  assert.equal(
    new Set(catalog.resources.map((resource) => resource.id)).size,
    catalog.resources.length,
  );
  assert.deepEqual(
    catalog.inventory.patches.map((patch) => patch.id),
    SCRAP_AWAKENING_MAP.patches.map((patch) => patch.id),
  );
  for (const patch of catalog.inventory.patches)
    for (const id of patch.resourceIds) {
      assert.ok(
        catalog.get(id).actions.some((action) => action.patchId === patch.id),
        `${id}: ${patch.id}`,
      );
    }
  for (const profile of Object.values(ENCOUNTER_PROFILES))
    assert.ok(catalog.get(`enemy:${profile.id}`));
  assert.equal(catalog.inventory.enemyProfileCount, Object.keys(ENCOUNTER_PROFILES).length);
  const placedEnemyProfileIds = new Set(
    SCRAP_AWAKENING_MAP.regions.flatMap((region) =>
      region.rooms.flatMap((room) =>
        room.entities
          .filter((entity) => entity.encounterProfileId)
          .map((entity) => entity.encounterProfileId),
      ),
    ),
  );
  assert.equal(catalog.inventory.placedEnemyProfileCount, placedEnemyProfileIds.size);
  assert.deepEqual(
    [...catalog.inventory.unplacedEnemyProfileIds].sort(),
    Object.keys(ENCOUNTER_PROFILES)
      .filter((profileId) => !placedEnemyProfileIds.has(profileId))
      .sort(),
  );
  const prologueCombatEntities = prologueRegion.rooms.flatMap((room) =>
    room.entities
      .filter((entity) => entity.kind === 'combat-enemy')
      .map((entity) => ({
        id: entity.id,
        profileId: entity.encounterProfileId,
        roomId: room.id,
      })),
  );
  assert.deepEqual(prologueCombatEntities, [
    {
      id: 'scrap-yard-scout-collector',
      profileId: 'yard-scout-collector',
      roomId: PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
    },
  ]);
  assert.deepEqual(
    catalog
      .get('enemy:yard-scout-collector')
      .placements.filter((placement) => placement.regionId === prologueRegion.id),
    [
      {
        regionId: prologueRegion.id,
        roomId: PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
        entityId: 'scrap-yard-scout-collector',
      },
    ],
  );
  for (const equipment of EQUIPMENT_ITEMS) assert.ok(catalog.get(`equipment:${equipment.id}`));
  for (const effect of GRAPHICS_EFFECT_DEFINITIONS) assert.ok(catalog.get(`effect:${effect.id}`));
  for (const category of GRAPHICS_CATEGORIES)
    assert.ok(
      catalog.resources.some((resource) => resource.category === category.id),
      category.id,
    );
  for (const resource of process.argv.includes('--timing-only') ? [] : catalog.resources) {
    assert.equal(
      new Set(resource.actions.map((action) => action.id)).size,
      resource.actions.length,
      resource.id,
    );
    for (const action of resource.actions) {
      for (const frameIndex of [
        ...new Set([0, Math.floor(action.frameCount / 2), action.frameCount - 1]),
      ]) {
        const sample = sampler.sample(resource.id, { actionId: action.id, frameIndex });
        for (const [group, ids] of Object.entries(sample.producerEffectGroups ?? {})) {
          producerEffectGroups.add(group);
          if (ids.length > 0) exercisedEffectGroups.add(group);
        }
        assert.ok(Object.isFrozen(sample.frame), resource.id);
        assert.ok(Object.isFrozen(sample.frame.items), resource.id);
        assert.ok(sample.bounds.width > 0 && sample.bounds.height > 0, resource.id);
        assert.ok(sample.frameId.endsWith(`/f${String(frameIndex).padStart(4, '0')}`));
        for (const item of sample.frame.items)
          for (const point of [...(item.points ?? []), ...(item.surface?.points ?? [])]) {
            assert.ok(
              Number.isFinite(point.x) && Number.isFinite(point.y),
              `${resource.id}/${action.id}/${item.id}`,
            );
          }
        sampledConditions += 1;
      }
    }
  }
  if (!process.argv.includes('--timing-only')) {
    assert.ok(producerEffectGroups.size > 0);
    assert.deepEqual(
      [...exercisedEffectGroups].sort(),
      [...producerEffectGroups].sort(),
      'every live production effect group must have a visible registered sample',
    );
  }

  // Compare the actual GameScene RenderFrame with the review at the same pose,
  // equipment, time, and facing. This catches a review-only weapon scaling path.
  for (const equipment of EQUIPMENT_ITEMS) {
    const game = createGameScene({
      progressionSnapshot: equipmentTestSnapshot(equipment.id),
    });
    const resource = catalog.get(`equipment:${equipment.id}`);
    try {
      const block = resource.actions.find((action) => action.id === 'block');
      const light = TRAINING_ENEMY_ATTACK_PROFILES.light;
      for (const frameIndex of [0, Math.floor(block.frameCount / 2), block.frameCount - 1]) {
        game.reset();
        game.setVisualQaLocation({
          regionId: 'abandoned-mine',
          roomId: 'abandoned-mine-rescue-tunnel',
          x: 480,
        });
        game.applyTrainingEncounterPlayerResult({
          kind: 'guard',
          blockImpactSeconds: 0.14,
          blockImpactStrength: light.blockStrength,
          blockstunSeconds: light.blockstunSeconds,
          justGuardEligible: false,
          guardStaminaDamage: light.guardStaminaDamage,
          hitStopSeconds: 0.04,
        });
        assert.equal(block.durationSeconds, game.playerBlockstunDurationSeconds);
        assert.equal(block.blockStrength, game.playerBlockImpactStrength);
        game.playerBlockstunSeconds -= frameIndex / PLAYER_MOTION_PROFILE.frameRate;
        const reference = game.createRenderFrame(1);
        const reviewed = sampler.sample(resource.id, { actionId: 'block', frameIndex });
        const ids = new Set(reviewed.frame.items.map((item) => item.id));
        assert.deepEqual(
          reviewed.frame.items,
          reference.items.filter((item) => ids.has(item.id)),
          `${resource.id}/block/${frameIndex} uses actual scaled guard result`,
        );
        parityFrames += 1;
      }
      for (const actionId of [
        'idle',
        'run',
        'roll',
        ...Object.keys(COMBAT_MOTION_TIMING_PROFILES),
      ]) {
        const action = resource.actions.find((candidate) => candidate.id === actionId);
        for (const facing of [-1, 1])
          for (const frameIndex of [
            ...new Set([0, Math.floor(action.frameCount / 2), action.frameCount - 1]),
          ]) {
            game.reset();
            game.setVisualQaLocation({
              regionId: 'abandoned-mine',
              roomId: 'abandoned-mine-rescue-tunnel',
              x: 480,
            });
            game.facing = facing;
            game.animationTime = game.previousAnimationTime = advancePlayerAnimationTime(
              0,
              frameIndex / 60,
              { movementIntent: actionId === 'run' ? 1 : 0, rolling: actionId === 'roll' },
            );
            if (actionId === 'run') game.movementIntent = 1;
            else if (actionId === 'roll')
              game.rollState = {
                direction: facing,
                elapsedSeconds: frameIndex / 60,
                durationSeconds: PLAYER_MOTION_PROFILE.rollFrames / PLAYER_MOTION_PROFILE.frameRate,
              };
            else if (actionId !== 'idle') {
              game.combatCommands.start(actionId);
              if (actionId.startsWith('air')) game.isGrounded = false;
              for (let tick = Math.max(0, frameIndex * 2 - 2); tick <= frameIndex * 2; tick += 1) {
                game.combatCommands.active.elapsedSeconds = tick / 120;
                game.updatePlayerCombatGeometry(game.combatCommands.snapshot());
              }
            }
            const rendered = game.createRenderFrame(1);
            const reviewed = sampler.sample(resource.id, { actionId, frameIndex, facing }).frame;
            const ids = new Set(reviewed.items.map((item) => item.id));
            assert.deepEqual(
              reviewed.items.filter((item) => ids.has(item.id)),
              rendered.items.filter((item) => ids.has(item.id)),
              `${resource.id}/${actionId}/${frameIndex}/${facing}`,
            );
            assert.deepEqual(
              reviewed.combatGeometry.visibleWeapon,
              rendered.combatGeometry.visibleWeapon,
            );
            parityFrames += 1;
          }
      }
    } finally {
      game.dispose();
    }
  }

  // Observe real fixed-step updates driven by ordinary input. A timing test that
  // assigns animationTime directly cannot detect a wrong review playback rate.
  const live = createGameScene();
  let observedTimingFrames = 0;
  const quietInput = {
    left: false,
    right: false,
    jump: false,
    guard: false,
    basic: false,
    strong: false,
  };
  try {
    for (const actionId of ['idle', 'run', 'guard', 'roll', 'jump']) {
      live.reset();
      live.setVisualQaLocation({
        regionId: 'scrap-waste-edge',
        roomId: PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
        x: 300,
      });
      const frameLimit = actionId === 'jump' ? 47 : actionId === 'roll' ? 24 : 12;
      for (let frameIndex = 1; frameIndex <= frameLimit; frameIndex += 1) {
        for (let substep = 0; substep < 2; substep += 1) {
          live.update(1 / PLAYER_MOTION_PROFILE.simulationRate, {
            ...quietInput,
            right: actionId === 'run' || actionId === 'roll',
            guard: actionId === 'guard' || actionId === 'roll',
            jump: actionId === 'jump' && frameIndex === 1 && substep === 0,
          });
        }
        const timing = playerJumpPhaseTiming();
        const sampledActionId =
          actionId === 'jump' && live.verticalVelocity >= 0 ? 'fall' : actionId;
        const sampleIndex =
          sampledActionId === 'fall' ? frameIndex - timing.apexTick / 2 : frameIndex;
        const action = catalog
          .get('player:protagonist')
          .actions.find((candidate) => candidate.id === sampledActionId);
        const input = graphicsPlayerMotionInput(sampledActionId, sampleIndex, action.frameCount);
        assert.ok(
          Math.abs(live.animationTime - input.boneInput.animationTime) < 1e-10,
          `${actionId}/${frameIndex} animation clock`,
        );
        if (actionId === 'jump')
          assert.ok(
            Math.abs(live.verticalVelocity - input.boneInput.verticalVelocity) < 1e-8,
            `${sampledActionId}/${sampleIndex} actual jump velocity`,
          );
        const actual = live.sampleSizedPlayerMotionPose({
          motionState: live.combatCommands.snapshot(),
          boneInput: {
            animationTime: live.animationTime,
            movementIntent: live.movementIntent,
            isGrounded: live.isGrounded,
            verticalVelocity: live.verticalVelocity,
            rollProgress: live.rollState
              ? live.rollState.elapsedSeconds / live.rollState.durationSeconds
              : null,
          },
        });
        const expected = live.sampleSizedPlayerMotionPose(input);
        for (const [id, joint] of Object.entries(actual.bonePose.projectedJoints)) {
          assert.ok(
            Math.abs(joint.x - expected.bonePose.projectedJoints[id].x) < 1e-7 &&
              Math.abs(joint.y - expected.bonePose.projectedJoints[id].y) < 1e-7,
            `${actionId}/${frameIndex}/${id} actual fixed-step pose`,
          );
        }
        observedTimingFrames += 1;
      }
    }
  } finally {
    live.dispose();
  }

  const player = catalog.get('player:protagonist');
  const a = sampler.sample(player.id, { actionId: 'roll', frameIndex: 12, facing: -1 });
  const b = sampler.sample(player.id, { actionId: 'roll', frameIndex: 12, facing: -1 });
  assert.deepEqual(a, b, 'same ID and conditions reproduce identical immutable output');
  assert.equal(
    JSON.stringify(SCRAP_AWAKENING_MAP),
    sourceBefore,
    'review must not mutate authored source',
  );
  assert.throws(() => sampler.sample('unknown'), /resource/);
  assert.throws(() => sampler.sample(player.id, { actionId: 'unknown' }), /action/);
  assert.throws(() => sampler.sample(player.id, { frameIndex: -1 }), /frame/);
  assert.throws(() => sampler.sample(player.id, { facing: 0 }), /facing/);
  assert.equal(sampler.sample(player.id, { lighting: 'unlit' }).frame.artDirection, null);
  console.log(
    `PASS graphics resources: ${catalog.resources.length} resources, ${rawItems.length} map leaves, ${catalog.inventory.patchCount} patches, ${sampledConditions} samples, ${parityFrames} production RenderFrame comparisons, ${observedTimingFrames} real fixed-step timing observations.`,
  );
  console.log(
    'Browser desktop/mobile appearance, playback, copy and URL recovery require actual viewport evidence; this fixture does not claim visual approval.',
  );
} finally {
  sampler.destroy();
}

assert.throws(() => sampler.sample('player:protagonist'), /종료/);
