import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { sampleCombatTargetPose } from '../src/animation/CombatPoseLibrary.js';
import { sampleCharacterBonePose } from '../src/animation/CharacterBonePoseLibrary.js';
import {
  closestCombatContact,
  createSweptWeaponGeometry,
  samplePlayerCombatGeometry,
  sampleTrainingEnemyCombatGeometry,
  sampleTrainingEnemyWeaponLength,
} from '../src/combat/SharedCombatGeometry.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';
import { createTrainingEnemyItems } from '../src/game/training/TrainingEncounterPresentation.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

function playerGeometry({ facing = 1, weaponLengthScale = 1 } = {}) {
  const motionState = Object.freeze({
    id: 'slash',
    progress: 0.5,
    phase: 'active',
    sequence: 1,
    comboCycle: 1,
  });
  const targetPose = sampleCombatTargetPose(motionState);
  const bonePose = sampleCharacterBonePose({
    animationTime: 0.25,
    movementIntent: 0,
    isGrounded: true,
    verticalVelocity: 0,
    landingRecovery: 0,
    hitstunProgress: 0,
    blockstunProgress: 0,
    blockStrength: 0,
    knockedOut: false,
    rollProgress: null,
    motionState,
  });
  return samplePlayerCombatGeometry({
    position: Object.freeze({ x: 300, y: 352 }),
    facing,
    targetPose,
    bonePose,
    geometryScale: 0.72,
    weaponLengthScale,
  });
}

function enemyState(attackKind) {
  const profile = TRAINING_ENEMY_ATTACK_PROFILES[attackKind];
  return Object.freeze({
    position: Object.freeze({ x: 650, y: 420 }),
    groundY: 420,
    presentationScale: 0.48,
    attackKind,
    aiState: 'attack',
    aiSeconds: profile.attackSeconds * 0.5,
    attackFacing: -1,
    facing: -1,
    rotation: 0,
    recoveryStartAngle: -0.65,
    recoveryBodyStartRotation: 0,
    recoveryDurationSeconds: profile.recoverySeconds,
    recoverySource: 'attack',
    hitReactionWeaponAngle: -0.65,
    hitReactionWeaponLength: TRAINING_ENEMY_ATTACK_PROFILES.light.weaponLength,
    groundBounceDelaySeconds: 0,
  });
}

const forward = playerGeometry({ facing: 1, weaponLengthScale: 1 });
const reverse = playerGeometry({ facing: -1, weaponLengthScale: 1 });
const longWeapon = playerGeometry({ facing: 1, weaponLengthScale: 1.18 });
assert.ok(Object.isFrozen(forward) && Object.isFrozen(forward.weapon.points));
assert.equal(forward.hurt.length, 6);
assert.ok(forward.shield.points.length >= 6);
const forwardReach = Math.max(...forward.weapon.points.map(({ x }) => x)) - forward.origin.x;
const reverseReach = reverse.origin.x - Math.min(...reverse.weapon.points.map(({ x }) => x));
const longReach = Math.max(...longWeapon.weapon.points.map(({ x }) => x)) - longWeapon.origin.x;
assert.ok(
  Math.abs(forwardReach - reverseReach) < 1e-7,
  'facing은 weapon reach를 대칭으로 보존한다.',
);
assert.ok(longReach > forwardReach + 10, '장비 weapon length scale은 실제 contact reach를 늘린다.');

for (const attackKind of ['light', 'heavy', 'antiAir', 'sweep']) {
  const enemy = enemyState(attackKind);
  const geometry = sampleTrainingEnemyCombatGeometry(enemy, TRAINING_ENEMY_ATTACK_PROFILES);
  assert.equal(
    sampleTrainingEnemyWeaponLength(enemy, TRAINING_ENEMY_ATTACK_PROFILES),
    TRAINING_ENEMY_ATTACK_PROFILES[attackKind].weaponLength,
  );
  assert.ok(geometry.weapon.points.length >= 5);
  assert.equal(geometry.hurt.length, 2);
  const renderedWeapon = createTrainingEnemyItems(
    enemy,
    0,
    TRAINING_ENEMY_ATTACK_PROFILES,
    geometry,
  ).find(({ id }) => id === 'combat-enemy-weapon');
  assert.deepEqual(
    renderedWeapon.points,
    geometry.weapon.points,
    `${attackKind} renderer와 gameplay는 같은 weapon polygon을 읽어야 한다.`,
  );
}
assert.deepEqual(createTrainingEnemyItems(null, 0, TRAINING_ENEMY_ATTACK_PROFILES), []);

const square = (part, x) =>
  Object.freeze({
    part,
    points: Object.freeze([
      Object.freeze({ x, y: 0 }),
      Object.freeze({ x: x + 10, y: 0 }),
      Object.freeze({ x: x + 10, y: 10 }),
      Object.freeze({ x, y: 10 }),
    ]),
  });
let sweep = createSweptWeaponGeometry({ current: square('weapon', 0) });
sweep = createSweptWeaponGeometry({ current: square('weapon', 10), history: sweep.history });
sweep = createSweptWeaponGeometry({ current: square('weapon', 20), history: sweep.history });
sweep = createSweptWeaponGeometry({ current: square('weapon', 30), history: sweep.history });
assert.equal(sweep.history.length, 3, 'sweep history는 최근 세 sample로 제한된다.');
assert.equal(Math.min(...sweep.swept.points.map(({ x }) => x)), 10);
assert.equal(Math.max(...sweep.swept.points.map(({ x }) => x)), 40);

const separated = closestCombatContact([square('weapon', 0)], [square('torso', 14)]);
assert.equal(separated.contact, false);
assert.equal(separated.gap, 4);
assert.equal(separated.position, null);
assert.equal(separated.weaponPart, null);
assert.equal(separated.hurtPart, null);

const crossingWeapon = Object.freeze({
  part: 'weapon',
  points: Object.freeze([
    Object.freeze({ x: -10, y: -1 }),
    Object.freeze({ x: 10, y: -1 }),
    Object.freeze({ x: 10, y: 1 }),
    Object.freeze({ x: -10, y: 1 }),
  ]),
});
const crossingHurt = Object.freeze({
  part: 'torso',
  points: Object.freeze([
    Object.freeze({ x: -1, y: -10 }),
    Object.freeze({ x: 1, y: -10 }),
    Object.freeze({ x: 1, y: 10 }),
    Object.freeze({ x: -1, y: 10 }),
  ]),
});
const edgeCrossing = closestCombatContact([crossingWeapon], [crossingHurt]);
assert.equal(edgeCrossing.contact, true);
assert.equal(edgeCrossing.gap, 0);
assert.ok(Math.abs(edgeCrossing.position.x) <= 1 && Math.abs(edgeCrossing.position.y) <= 1);
assert.ok(Object.isFrozen(edgeCrossing.position));

const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
const renderFrame = scene.createRenderFrame(0);
const renderedBlade = renderFrame.items.find(({ id }) => id === 'sword-blade');
const sceneGeometry = scene.samplePlayerCombatGeometry(scene.combatCommands.snapshot());
assert.deepEqual(renderedBlade.points, sceneGeometry.weapon.points);

scene.enterTree();
scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'training-room', x: 560 });
const liveEnemy = scene.roomSceneNode.encounter.enemy;
liveEnemy.position = { x: scene.position.x + 25, y: 420 };
liveEnemy.aiState = 'idle';
liveEnemy.aiSeconds = 1;
let liveHit = null;
for (let tick = 0; tick < 60; tick += 1) {
  scene.fixedProcess(1 / 120, {
    active: true,
    inputSnapshot: Object.freeze({
      left: false,
      right: false,
      jump: false,
      guard: false,
      basicAttack: tick === 0,
      strongAttack: false,
      jumpSequence: 0,
      basicAttackSequence: 1,
      strongAttackSequence: 0,
    }),
    simulationSettings: Object.freeze({ cameraFeedbackEnabled: true }),
  });
  liveHit ??= scene.combatEvents
    .snapshot()
    .find(({ type, target }) => ['hit', 'launch', 'punish'].includes(type) && target === 'enemy');
}
scene.createRenderFrame(0);
assert.ok(liveHit, '실제 120Hz GameScene command가 shared geometry로 적중해야 한다.');
assert.ok(Number.isFinite(liveHit.position.x) && Number.isFinite(liveHit.position.y));
scene.exitTree();

const encounterSource = await readFile(
  new URL('../src/game/training/TrainingEncounterNode.js', import.meta.url),
  'utf8',
);
assert.doesNotMatch(encounterSource, /TrainingEncounterPresentation/);
assert.doesNotMatch(encounterSource, /combat-enemy-weapon|sword-blade|shield-mark/);

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'shared-combat-geometry',
    checks: [
      'player-facing-equipment-and-immutability',
      'enemy-four-attack-semantic-geometry',
      'renderer-gameplay-weapon-polygon-parity',
      'null-enemy-presentation-boundary',
      'bounded-three-sample-sweep',
      'exact-contact-position-and-semantic-parts',
      'edge-only-polygon-intersection',
      'live-120hz-game-scene-contact-event',
      'encounter-presentation-import-and-item-id-boundary',
    ],
  }),
);
