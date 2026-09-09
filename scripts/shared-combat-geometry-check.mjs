import { measureHurtVisualDeviation } from '../src/combat/SemanticHurtRegions.js';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createProjectedBoneSurface,
  surfaceOutline,
} from '../src/animation/ProjectedBodySurface.js';
import { samplePlayerMotionPose } from '../src/animation/PlayerMotionPose.js';
import {
  closestCombatContact,
  createSweptWeaponGeometry,
  samplePlayerCombatGeometry,
  sampleTrainingEnemyCombatGeometry,
  sampleTrainingEnemyWeaponLength,
} from '../src/combat/SharedCombatGeometry.js';
import {
  createPlayerCombatPresentation,
  CHARACTER_RENDER_SCALE,
} from '../src/game/PlayerCombatPresentation.js';
import { PLAYER_CHARACTER_FOOT_OFFSET } from '../src/combat/SharedCombatGeometry.js';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
import { CHARACTER_PRESENTATION_PROFILE } from '../src/game/character/CharacterPresentationProfiles.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';
import { createTrainingEnemyItems } from '../src/game/training/TrainingEncounterPresentation.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

function assertBoneSurface(item, start, end, width) {
  assert.deepEqual(
    item.points,
    surfaceOutline(createProjectedBoneSurface({ start, end, width })),
    item.id + ' must use the shared projected bone surface outline',
  );
  // Independent geometric evidence: each end closes around its joint, while the
  // interior section is wider than the tapered ends (not a four-corner stick).
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const near = midpoint(item.points[0], item.points[4]);
  const far = midpoint(item.points[7], item.points[11]);
  assert.ok(Math.hypot(near.x - start.x, near.y - start.y) < 1e-7);
  assert.ok(Math.hypot(far.x - end.x, far.y - end.y) < 1e-7);
  const span = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const interiorWidth = span(item.points[5], item.points[13]);
  assert.ok(Math.abs(interiorWidth - width) < 1e-7);
  assert.ok(interiorWidth > span(item.points[0], item.points[4]));
  assert.ok(interiorWidth > span(item.points[7], item.points[11]));
}

function playerGeometry({ facing = 1, weaponLengthScale = 1 } = {}) {
  const motionState = Object.freeze({
    id: 'slash',
    progress: 0.5,
    phase: 'active',
    sequence: 1,
    comboCycle: 1,
  });
  const { targetPose, bonePose } = samplePlayerMotionPose({
    motionState,
    boneInput: { animationTime: 0.25, movementIntent: 0, isGrounded: true },
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

assert.throws(
  () =>
    samplePlayerCombatGeometry({
      position: { x: 300, y: 352 },
      facing: 1,
      geometryScale: CHARACTER_RENDER_SCALE,
      targetPose: { handTarget: { x: 20, y: 0 }, swordAngle: 0 },
      bonePose: { bodyLean: 0, rootOffset: { x: 0, y: 0 } },
    }),
  /canonical projected quaternion rig/,
  'old scalar 2D pose cannot silently create fallback hit geometry',
);
const canonicalIdle = samplePlayerMotionPose({
  motionState: { id: 'idle', progress: 0 },
  boneInput: {},
});
assert.throws(
  () =>
    samplePlayerCombatGeometry({
      position: { x: 300, y: 352 },
      facing: 1,
      geometryScale: CHARACTER_RENDER_SCALE,
      bonePose: canonicalIdle.bonePose,
      targetPose: { ...canonicalIdle.targetPose, weaponBasis: null },
    }),
  /wrist attachments/,
  'canonical bones cannot fall back to a separate scalar weapon angle',
);

const forward = playerGeometry({ facing: 1, weaponLengthScale: 1 });
const reverse = playerGeometry({ facing: -1, weaponLengthScale: 1 });
const longWeapon = playerGeometry({ facing: 1, weaponLengthScale: 1.18 });
assert.ok(Object.isFrozen(forward) && Object.isFrozen(forward.weapon.points));
assert.deepEqual(
  forward.hurt.map(({ part }) => part),
  [
    'torso',
    'head',
    'weapon-arm',
    'weapon-forearm',
    'shield-arm',
    'shield-forearm',
    'back-thigh',
    'back-shin',
    'front-thigh',
    'front-shin',
  ],
);
assert.ok(forward.shield.points.length >= 6);
const forwardReach = Math.max(...forward.weapon.points.map(({ x }) => x)) - forward.origin.x;
const reverseReach = reverse.origin.x - Math.min(...reverse.weapon.points.map(({ x }) => x));
const longReach = Math.max(...longWeapon.weapon.points.map(({ x }) => x)) - longWeapon.origin.x;
assert.ok(
  Math.abs(forwardReach - reverseReach) < 1e-7,
  'facing은 weapon reach를 대칭으로 보존한다.',
);
assert.ok(longReach > forwardReach + 10, '장비 weapon length scale은 실제 contact reach를 늘린다.');

for (const facing of [-1, 1]) {
  for (const rollProgress of [null, 0.25, 0.5, 0.75, 1]) {
    const position = { x: 300, y: 352 };
    const pose = samplePlayerMotionPose({
      motionState: { id: 'idle', progress: 0 },
      boneInput: { rollProgress },
    });
    const geometry = samplePlayerCombatGeometry({
      position,
      facing,
      ...pose,
      geometryScale: CHARACTER_RENDER_SCALE,
    });
    const output = createPlayerCombatPresentation({
      position,
      facing,
      ...pose,
      combatGeometry: geometry,
      appearanceProfile: CHARACTER_PRESENTATION_PROFILE.getProfile('scrapyard-apprentice'),
      renderScale: CHARACTER_RENDER_SCALE,
      renderOrder: 30.5,
      weaponLengthScale: 1,
      combatEvents: [],
      enemyRenderOrder: 30.49,
    });
    for (const [part, from, to, width] of [
      ['back-thigh', 'farHip', 'farKnee', 9],
      ['back-shin', 'farKnee', 'farFoot', 5],
      ['front-thigh', 'nearHip', 'nearKnee', 9],
      ['front-shin', 'nearKnee', 'nearFoot', 5],
    ]) {
      const hurt = geometry.hurt.find((entry) => entry.part === part);
      const rendered = output.characterItems.find(({ id }) => id === part);
      const semantic = geometry.semanticHurt.find((entry) => entry.part === part);
      assert.equal(semantic.shape, 'capsule');
      assert.notEqual(semantic.points, hurt.points, 'semantic primitive is independently authored');
      assert.equal(
        measureHurtVisualDeviation(semantic, rendered.points).withinTolerance,
        true,
        part + ': actual posed limb respects semantic tolerance',
      );
      assert.equal(rendered.points.length, hurt.points.length);
      assert.ok(
        rendered.points.every(
          (point, index) =>
            Math.hypot(point.x - hurt.points[index].x, point.y - hurt.points[index].y) < 1e-7,
        ),
        part + ': rendered leg must equal shared draw outline',
      );
      const transform = (joint) => ({
        x: position.x + joint.x * facing * CHARACTER_RENDER_SCALE,
        y:
          position.y +
          PLAYER_CHARACTER_FOOT_OFFSET +
          (joint.y - PLAYER_CHARACTER_FOOT_OFFSET) * CHARACTER_RENDER_SCALE,
      });
      const start = transform(pose.bonePose.projectedJoints[from]);
      const end = transform(pose.bonePose.projectedJoints[to]);
      const center = (i, j) => ({
        x: (hurt.points[i].x + hurt.points[j].x) / 2,
        y: (hurt.points[i].y + hurt.points[j].y) / 2,
      });
      assert.ok(Math.hypot(center(0, 4).x - start.x, center(0, 4).y - start.y) < 1e-7);
      assert.ok(Math.hypot(center(7, 11).x - end.x, center(7, 11).y - end.y) < 1e-7);
      assert.ok(
        Math.abs(
          Math.hypot(hurt.points[5].x - hurt.points[13].x, hurt.points[5].y - hurt.points[13].y) -
            width * CHARACTER_RENDER_SCALE,
        ) < 1e-7,
        part + ': hurt width follows actual slim leg, not a broad rectangle',
      );
    }
  }
}

for (const attackKind of ['light', 'heavy', 'antiAir', 'sweep']) {
  const enemy = enemyState(attackKind);
  const geometry = sampleTrainingEnemyCombatGeometry(enemy, TRAINING_ENEMY_ATTACK_PROFILES);
  assert.equal(
    sampleTrainingEnemyWeaponLength(enemy, TRAINING_ENEMY_ATTACK_PROFILES),
    TRAINING_ENEMY_ATTACK_PROFILES[attackKind].weaponLength,
  );
  assert.ok(geometry.weapon.points.length >= 5);
  assert.deepEqual(
    geometry.hurt.map(({ part }) => part),
    [
      'body',
      'head',
      'back-thigh',
      'back-shin',
      'front-thigh',
      'front-shin',
      'upper-weapon-arm',
      'lower-weapon-arm',
    ],
    'enemy hurt geometry must cover the complete rendered body and all six limb segments',
  );
  const renderedWeapon = createTrainingEnemyItems(
    enemy,
    0,
    TRAINING_ENEMY_ATTACK_PROFILES,
    geometry,
    CHARACTER_PRESENTATION_PROFILE.getProfile('collector-unit'),
  ).find(({ id }) => id === 'combat-enemy-weapon');
  assert.deepEqual(
    renderedWeapon.points,
    geometry.weapon.points,
    `${attackKind} renderer와 gameplay는 같은 weapon polygon을 읽어야 한다.`,
  );
  const renderedBody = createTrainingEnemyItems(
    enemy,
    0,
    TRAINING_ENEMY_ATTACK_PROFILES,
    geometry,
    CHARACTER_PRESENTATION_PROFILE.getProfile('collector-unit'),
  ).find(({ id }) => id === 'combat-enemy-body');
  const renderedHead = createTrainingEnemyItems(
    enemy,
    0,
    TRAINING_ENEMY_ATTACK_PROFILES,
    geometry,
    CHARACTER_PRESENTATION_PROFILE.getProfile('collector-unit'),
  ).find(({ id }) => id === 'combat-enemy-head');
  assert.deepEqual(renderedBody.points, geometry.presentation.body.points);
  assert.deepEqual(renderedHead.points, geometry.presentation.head.points);
  const renderedArm = createTrainingEnemyItems(
    enemy,
    0,
    TRAINING_ENEMY_ATTACK_PROFILES,
    geometry,
    CHARACTER_PRESENTATION_PROFILE.getProfile('collector-unit'),
  ).find(({ id }) => id === 'combat-enemy-lower-weapon-arm');
  assertBoneSurface(
    renderedArm,
    geometry.presentation.skeleton.nearElbow,
    geometry.presentation.skeleton.nearHand,
    10,
  );
}

// Every authored enemy action, including the human family, must retain the exact sampled
// skeleton anchors after the presentation boundary. This catches a renderer fallback to a
// scalar body/hand offset between action frames.
for (const { species, profileId } of [
  { species: 'industrial-collector', profileId: 'collector-unit' },
  { species: 'human-salvager', profileId: 'dock-salvage-raider' },
]) {
  for (const [aiState, aiSeconds, resolutionState] of [
    ['idle', 0, null],
    ['windup', TRAINING_ENEMY_ATTACK_PROFILES.light.windupSeconds * 0.4, null],
    ['attack', TRAINING_ENEMY_ATTACK_PROFILES.light.attackSeconds * 0.5, null],
    ['recovery', TRAINING_ENEMY_ATTACK_PROFILES.light.recoverySeconds * 0.4, null],
    ['hitstun', 0, null],
    ['guard', 0.2, null],
    ['surrendered', 0, 'surrendered'],
  ]) {
    const enemy = {
      ...enemyState('light'),
      species,
      aiState,
      aiSeconds,
      resolutionState,
    };
    const geometry = sampleTrainingEnemyCombatGeometry(enemy, TRAINING_ENEMY_ATTACK_PROFILES);
    const items = createTrainingEnemyItems(
      enemy,
      0,
      TRAINING_ENEMY_ATTACK_PROFILES,
      geometry,
      CHARACTER_PRESENTATION_PROFILE.getProfile(profileId),
    );
    assert.deepEqual(
      items.find(({ id }) => id === 'combat-enemy-body').points,
      geometry.presentation.body.points,
      `${species} ${aiState} body는 sampled skeleton draw geometry를 그대로 그려야 한다.`,
    );
    assert.deepEqual(
      items.find(({ id }) => id === 'combat-enemy-head').points,
      geometry.presentation.head.points,
      `${species} ${aiState} head는 sampled skeleton hurt geometry를 그대로 그려야 한다.`,
    );
    for (const [itemId, startJoint, endJoint, width] of [
      ['combat-enemy-back-thigh', 'farHip', 'farKnee', 8],
      ['combat-enemy-back-shin', 'farKnee', 'farFoot', 7],
      ['combat-enemy-front-thigh', 'nearHip', 'nearKnee', 8],
      ['combat-enemy-front-shin', 'nearKnee', 'nearFoot', 7],
      ['combat-enemy-upper-weapon-arm', 'nearShoulder', 'nearElbow', 11],
      ['combat-enemy-lower-weapon-arm', 'nearElbow', 'nearHand', 10],
    ]) {
      const limb = items.find(({ id }) => id === itemId);
      assert.deepEqual(
        limb.points,
        geometry.hurt.find(({ part }) => 'combat-enemy-' + part === itemId).points,
        species +
          ' ' +
          aiState +
          ' rendered limb must equal its shared draw polygon (semantic authority is separate)',
      );
      assertBoneSurface(
        limb,
        geometry.presentation.skeleton[startJoint],
        geometry.presentation.skeleton[endJoint],
        width,
      );
    }
  }
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
assert.equal(sweep.history.length, 2, 'damage sweep uses only previous and current sample.');
assert.equal(Math.min(...sweep.swept.points.map(({ x }) => x)), 20);
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

const scene = createTestGameScene({ mapDefinition: SCRAP_AWAKENING_MAP });
const renderFrame = scene.createRenderFrame(0);
const renderedBlade = renderFrame.items.find(({ id }) => id === 'sword-blade');
const sceneGeometry = scene.samplePlayerCombatGeometry(scene.combatCommands.snapshot());
assert.deepEqual(renderedBlade.points, sceneGeometry.weapon.points);

scene.enterTree();
scene.setVisualQaScrapAwakeningStage('yard-clearance');
scene.setVisualQaLocation({
  regionId: 'scrap-waste-edge',
  roomId: 'abandoned-weapon-yard',
  x: 560,
});
const liveEnemy = scene.roomSceneNode.encounter.enemy;
// Begin outside the movement bodies: an overlapping fixture is separated on the
// first tick and tests depenetration, not a normal attack contact.
const enemyBody = scene.roomSceneNode.getEncounterGameplaySnapshot().bodyCollider;
liveEnemy.position = { x: scene.position.x + 20 + enemyBody.halfWidth + 1, y: 420 };
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
      'strict-canonical-rig-and-wrist-no-2d-fallback',
      'slim-player-leg-render-hurt-outline-and-width-parity',
      'enemy-four-attack-semantic-geometry',
      'complete-enemy-six-limb-rendered-hurt-outline-parity',
      'renderer-gameplay-weapon-polygon-parity',
      'null-enemy-presentation-boundary',
      'previous-current-sample-sweep',
      'exact-contact-position-and-semantic-parts',
      'edge-only-polygon-intersection',
      'live-120hz-game-scene-contact-event',
      'encounter-presentation-import-and-item-id-boundary',
    ],
  }),
);
