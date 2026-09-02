import assert from 'node:assert/strict';

import { sampleCharacterBonePose } from '../src/animation/CharacterBonePoseLibrary.js';
import { retargetMotionKeyframes } from '../src/animation/MotionClipRetargeter.js';
import { MOTION_REFERENCE_CATALOG } from '../src/animation/MotionReferenceCatalog.js';
import { ROLL_TIMELINE_MARKERS, rollTimelineMarkerAt } from '../src/animation/RollTimeline.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const STEP = 1 / 120;
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

function rollPose(progress) {
  return sampleCharacterBonePose({ rollProgress: progress });
}

const rollStrip = [0, 0.16, 0.4, 0.66, 0.86, 1].map(rollPose);
assert.equal(new Set(rollStrip.map((pose) => pose.bodyLean)).size, rollStrip.length);
assert.notEqual(rollStrip[1].rearFootTarget.y, rollStrip[3].rearFootTarget.y);
assert.notEqual(rollStrip[1].headTilt, rollStrip[3].headTilt);
assert.ok(
  Math.max(...rollStrip.map((pose) => Math.abs(pose.bodyLean))) < 1,
  'roll pose must be articulated, not a full-group 360-degree rotation',
);
assert.deepEqual(
  ROLL_TIMELINE_MARKERS.map(({ id }) => id),
  ['roll-plant', 'roll-tuck', 'roll-contact', 'roll-unfold', 'roll-recover'],
);
assert.equal(rollTimelineMarkerAt(0.36).gameplay, 'evade-and-body-through');
assert.equal(rollTimelineMarkerAt(0.62).gameplay, 'body-solid');
assert.ok(Object.isFrozen(MOTION_REFERENCE_CATALOG.humanLocomotion));
assert.ok(
  MOTION_REFERENCE_CATALOG.humanLocomotion.consulted.every(
    ({ url, license, use }) => url.startsWith('https://') && license.length > 0 && use.length > 0,
  ),
  'motion reference provenance must keep source URL, license assessment, and use boundary',
);
assert.ok(
  MOTION_REFERENCE_CATALOG.humanLocomotion.importPolicy.includes('No raw external clip'),
  'runtime must not embed or download an external animation asset',
);
const retargetJointIds = [
  'root',
  'pelvis',
  'chest',
  'head',
  'nearShoulder',
  'farShoulder',
  'nearHip',
  'farHip',
];
const retargetedFixture = retargetMotionKeyframes({
  source: { url: 'https://example.invalid/reference', license: 'CC0' },
  jointMap: Object.fromEntries(retargetJointIds.map((jointId) => [jointId, jointId])),
  frames: [
    {
      id: 'reference-plant',
      at: 0,
      transition: 'hold',
      joints: Object.fromEntries(
        retargetJointIds.map((jointId) => [jointId, { x: 1, y: 2, z: 3, rotation: 0.2 }]),
      ),
    },
  ],
});
assert.equal(retargetedFixture[0].joints.chest.rotation, 0.2);
const authoredMidRoll = rollPose(0.36);
assert.deepEqual(
  Object.keys(authoredMidRoll.projectedJoints).sort(),
  [
    'chest',
    'farElbow',
    'farFoot',
    'farHand',
    'farHip',
    'farKnee',
    'farShoulder',
    'head',
    'nearElbow',
    'nearFoot',
    'nearHand',
    'nearHip',
    'nearKnee',
    'nearShoulder',
    'neck',
    'pelvis',
    'root',
  ].sort(),
  'authored roll frame must resolve the complete local 3D joint hierarchy',
);
assert.ok(
  authoredMidRoll.projectedJoints.nearShoulder.depth >
    authoredMidRoll.projectedJoints.farShoulder.depth,
  'orthographic projection must preserve authored near/far depth order',
);

function withScene(run) {
  const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
  scene.enterTree();
  try {
    scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'training-room', x: 430 });
    const encounter = scene.roomSceneNode.getEncounterGameplaySnapshot();
    assert.ok(encounter, 'training room needs an encounter for body-collision coverage');
    scene.roomSceneNode.encounter.enemy.position = {
      x: scene.position.x + 72,
      y: scene.mapRuntime.getActiveRoom().groundY,
    };
    scene.roomSceneNode.encounter.enemy.aiState = 'idle';
    scene.roomSceneNode.encounter.enemy.aiSeconds = 99;
    return run(scene);
  } finally {
    scene.exitTree();
  }
}

withScene((scene) => {
  const enemy = scene.roomSceneNode.encounter.enemy;
  for (let tick = 0; tick < 120; tick += 1) scene.update(STEP, { ...EMPTY_INPUT, right: true });
  assert.ok(
    Math.abs(scene.position.x - enemy.position.x) >= 48,
    'normal movement must stop at the enemy body instead of passing through it',
  );
});

withScene((scene) => {
  const enemy = scene.roomSceneNode.encounter.enemy;
  const startX = scene.position.x;
  scene.update(STEP, { ...EMPTY_INPUT, right: true, guard: true });
  for (let tick = 0; tick < 55; tick += 1) scene.update(STEP, { ...EMPTY_INPUT, right: true });
  assert.equal(scene.rollState, null, 'roll must complete');
  assert.ok(scene.position.x > enemy.position.x + 48, 'active roll must cross a normal enemy');
  assert.ok(scene.position.x > startX + 90, 'roll must retain authored forward travel');
});

withScene((scene) => {
  const startX = scene.position.x;
  let jumpSequence = 1;
  scene.update(STEP, { ...EMPTY_INPUT, right: true, jump: true, jumpSequence });
  for (let tick = 0; tick < 180 && !scene.isGrounded; tick += 1) {
    scene.update(STEP, { ...EMPTY_INPUT, right: true, jumpSequence });
  }
  assert.equal(scene.isGrounded, true, 'jump trace must land');
  assert.equal(scene.landingRecoverySeconds, 0, 'ordinary landing must not create recovery');
  const landedX = scene.position.x;
  scene.update(STEP, { ...EMPTY_INPUT, right: true, jumpSequence });
  assert.ok(landedX > startX + 50, 'jump must preserve horizontal travel');
  assert.ok(scene.position.x > landedX, 'the first post-landing step must retain held movement');
});

withScene((scene) => {
  const enemy = scene.roomSceneNode.encounter.enemy;
  let jumpSequence = 1;
  scene.update(STEP, { ...EMPTY_INPUT, right: true, jump: true, jumpSequence });
  for (let tick = 0; tick < 180 && !scene.isGrounded; tick += 1) {
    scene.update(STEP, { ...EMPTY_INPUT, right: true, jumpSequence });
  }
  assert.ok(
    scene.position.x > enemy.position.x + 48,
    'a jump may clear a normal enemy only after the physical body arc rises over it',
  );
});

// A fresh plaza scene makes the held-input transition contract observable without UI adapters.
const plazaScene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
plazaScene.enterTree();
try {
  const portal = plazaScene.mapRuntime.getPortal('academy-field-portal');
  const sourceRoom = plazaScene.mapRuntime.getActiveRoom();
  plazaScene.position = {
    x: sourceRoom.bounds.x + portal.from.anchor.x,
    y: sourceRoom.groundY - 80,
  };
  plazaScene.previousPosition = { ...plazaScene.position };
  plazaScene.update(STEP, { ...EMPTY_INPUT, right: true, jump: true, jumpSequence: 1 });
  for (let tick = 0; tick < 120 && plazaScene.mapRuntime.getTransition(); tick += 1) {
    plazaScene.update(STEP, { ...EMPTY_INPUT, right: true, jumpSequence: 1 });
  }
  assert.equal(plazaScene.mapRuntime.getActiveLocation().roomId, 'field-crossing');
  const destinationX = plazaScene.position.x;
  plazaScene.update(STEP, { ...EMPTY_INPUT, right: true, jumpSequence: 1 });
  assert.ok(
    plazaScene.position.x > destinationX,
    'destination first gameplay fixed step must retain the held movement input',
  );
  assert.equal(plazaScene.combatCommands.snapshot().id, 'idle');
} finally {
  plazaScene.exitTree();
}

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'combat-motion-continuity',
    assertions: [
      'authored-roll-pose-strip',
      '3d-skeleton-side-projection',
      'motion-reference-provenance-and-local-retarget-boundary',
      'stable-roll-frame-to-gameplay-marker-mapping',
      'normal-enemy-body-collision',
      'normal-enemy-roll-through',
      'jump-landing-held-movement-continuity',
      'jump-body-arc-clearance',
      'portal-held-input-continuity',
    ],
  }),
);
