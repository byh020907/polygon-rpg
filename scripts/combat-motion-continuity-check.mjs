import assert from 'node:assert/strict';

import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { sampleCharacterBonePose } from '../src/animation/CharacterBonePoseLibrary.js';
import { retargetMotionKeyframes } from '../src/animation/MotionClipRetargeter.js';
import { MOTION_REFERENCE_CATALOG } from '../src/animation/MotionReferenceCatalog.js';
import { ROLL_TIMELINE_MARKERS, rollTimelineMarkerAt } from '../src/animation/RollTimeline.js';
import {
  CombatCommandController,
  combatMotionFrameData,
} from '../src/combat/CombatCommandController.js';
import { EQUIPMENT_PROFILES } from '../src/game/equipment/EquipmentProfiles.js';
import {
  ENCOUNTER_PROFILES,
  resolveEncounterBodyCollider,
} from '../src/game/encounter/EncounterProfiles.js';
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

const BASELINE_PLAYBACK_EXPECTATIONS = Object.freeze({
  'baseline-idle-playback': Object.freeze({ motion: null, grounded: true }),
  'baseline-run-playback': Object.freeze({ motion: null, grounded: true }),
  'baseline-jump-playback': Object.freeze({ motion: null, grounded: false }),
  'baseline-landing-playback': Object.freeze({ motion: null, grounded: true }),
  'baseline-roll-playback': Object.freeze({ motion: null, grounded: true }),
  'baseline-basic-playback': Object.freeze({ motion: 'slash', grounded: true }),
  'baseline-strong-playback': Object.freeze({ motion: 'heavy', grounded: true }),
  'baseline-guard-playback': Object.freeze({ motion: 'guard', grounded: true }),
});

for (const [scenarioId, expected] of Object.entries(BASELINE_PLAYBACK_EXPECTATIONS)) {
  const request = readVisualQaRequest(
    `?visualQa=1&gameStart=${scenarioId}&gameFrame=0&visualQaRenderer=polygon&visualQaPhase=active`,
  );
  assert.ok(request, `${scenarioId} must be a valid stable Visual QA request`);
  assert.ok(
    Object.isFrozen(request.scenario.inputTimelineByPhase.active),
    `${scenarioId} playback timeline must stay immutable`,
  );
  assert.equal(request.scenario.expectation.expectedMotion ?? null, expected.motion);
  assert.equal(request.scenario.expectation.expectedPlayerGrounded, expected.grounded);
}

const collectorCollider = resolveEncounterBodyCollider(ENCOUNTER_PROFILES.training);
const humanCollider = resolveEncounterBodyCollider(ENCOUNTER_PROFILES['mine-claim-jacker']);
const bossCollider = resolveEncounterBodyCollider(ENCOUNTER_PROFILES['mine-collapse-boss']);
assert.equal(collectorCollider.rollThrough, 'normal');
assert.equal(humanCollider.rollThrough, 'normal');
assert.equal(bossCollider.rollThrough, 'forbidden');
assert.ok(
  bossCollider.halfWidth > collectorCollider.halfWidth &&
    bossCollider.height > collectorCollider.height,
  'body colliders must scale with the authored enemy silhouette instead of using one normal/boss width',
);

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

const authoredUtilityClips = [
  sampleCharacterBonePose({ animationTime: 0.21 }),
  sampleCharacterBonePose({ animationTime: 0.21, movementIntent: 1 }),
  sampleCharacterBonePose({ isGrounded: false, verticalVelocity: -260 }),
  sampleCharacterBonePose({ isGrounded: false, verticalVelocity: 260 }),
  sampleCharacterBonePose({ landingRecovery: 0.65 }),
  sampleCharacterBonePose({ motionState: Object.freeze({ id: 'guard', progress: 0 }) }),
  sampleCharacterBonePose({ hitstunProgress: 0.65 }),
];
assert.ok(
  authoredUtilityClips.every(
    (pose) => pose.frameId && pose.projectedJoints?.chest && pose.projectedJoints?.nearFoot,
  ),
  'idle/run/jump/fall/landing/guard/hit must all use authored local-3D pose frames',
);
assert.equal(
  new Set(authoredUtilityClips.map((pose) => pose.frameId)).size,
  authoredUtilityClips.length,
  'utility action strips need distinct readable frame identities',
);

for (const [motionId, contactFrameId] of Object.entries({
  slash: 'slash-contact',
  heavy: 'heavy-contact',
  rising: 'rising-contact',
  shieldBash: 'counter-contact',
})) {
  for (const timingProfile of [{}, ...EQUIPMENT_PROFILES.map(({ combatTiming }) => combatTiming)]) {
    const frame = combatMotionFrameData(motionId, timingProfile);
    const activeProgress = frame.startupFrames / frame.durationFrames;
    const lastActiveProgress =
      (frame.startupFrames + frame.activeFrames - 1) / frame.durationFrames;
    const strip = [
      activeProgress - 1 / frame.durationFrames,
      activeProgress,
      lastActiveProgress,
    ].map((progress) =>
      sampleCharacterBonePose({
        motionState: Object.freeze({ id: motionId, progress, frame }),
      }),
    );
    assert.notEqual(
      strip[0].frameId,
      contactFrameId,
      `${motionId} must retain a windup pose before the combat active window`,
    );
    assert.equal(
      strip[1].frameId,
      contactFrameId,
      `${motionId} contact pose must start on the first active combat frame`,
    );
    assert.equal(
      strip[2].frameId,
      contactFrameId,
      `${motionId} contact pose must remain through the final active combat frame`,
    );
    assert.ok(
      strip.every((pose) => pose.projectedJoints?.nearHand && pose.projectedJoints?.farFoot),
      `${motionId} must project every authored combat frame through the local 3D skeleton`,
    );
    assert.ok(
      strip[0].projectedJoints.nearHand.y !== strip[1].projectedJoints.nearHand.y,
      `${motionId} must author a distinct local 3D weapon-arm transform at contact`,
    );
  }
}

for (const { id: equipmentId, combatTiming } of EQUIPMENT_PROFILES) {
  for (const [motionId, contactFrameId] of Object.entries({
    slash: 'slash-contact',
    heavy: 'heavy-contact',
    rising: 'rising-contact',
    shieldBash: 'counter-contact',
  })) {
    const controller = new CombatCommandController({ timingProfile: combatTiming });
    controller.start(motionId);
    const frame = controller.getMotionFrameData(motionId);
    controller.update(frame.startupFrames / 60, EMPTY_INPUT, { acceptCommands: false });
    const snapshot = controller.snapshot();
    assert.equal(snapshot.phase, 'strike', `${equipmentId} ${motionId} must reach an active frame`);
    const pose = sampleCharacterBonePose({
      motionState: Object.freeze({
        id: snapshot.id,
        progress: snapshot.progress,
        frame: snapshot.frame,
      }),
    });
    assert.equal(
      pose.frameId,
      contactFrameId,
      `${equipmentId} ${motionId} runtime snapshot must select the active contact pose`,
    );
  }
}

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
  const enemy = scene.roomSceneNode.encounter.enemy;
  const bounds = scene.getPlayerMovementBounds();
  enemy.position = { x: bounds.maxX - 34, y: scene.mapRuntime.getActiveRoom().groundY };
  scene.position = { x: enemy.position.x - 70, y: scene.position.y };
  scene.previousPosition = { ...scene.position };
  scene.update(STEP, { ...EMPTY_INPUT, right: true, guard: true });
  for (let tick = 0; tick < 55; tick += 1) scene.update(STEP, { ...EMPTY_INPUT, right: true });
  const collider = scene.roomSceneNode.getEncounterGameplaySnapshot().bodyCollider;
  assert.ok(
    scene.position.x <= enemy.position.x - (20 + collider.halfWidth),
    'a cramped roll must stay on the approach side instead of ending inside an enemy or room boundary',
  );
});

withScene((scene) => {
  const enemy = scene.roomSceneNode.encounter.enemy;
  enemy.role = 'boss';
  enemy.position = { x: scene.position.x + 72, y: scene.mapRuntime.getActiveRoom().groundY };
  scene.update(STEP, { ...EMPTY_INPUT, right: true, guard: true });
  for (let tick = 0; tick < 55; tick += 1) scene.update(STEP, { ...EMPTY_INPUT, right: true });
  const collider = scene.roomSceneNode.getEncounterGameplaySnapshot().bodyCollider;
  assert.ok(
    scene.position.x <= enemy.position.x - (20 + collider.halfWidth),
    'roll must stop at a boss body rather than ending inside its larger collision volume',
  );
});

withScene((scene) => {
  const bounds = scene.getPlayerMovementBounds();
  scene.position = {
    x: bounds.maxX - 4,
    y: scene.mapRuntime.getGroundYAt(bounds.maxX - 4) - 82,
  };
  scene.previousPosition = { ...scene.position };
  scene.update(STEP, { ...EMPTY_INPUT, right: true, guard: true });
  for (let tick = 0; tick < 55; tick += 1) scene.update(STEP, { ...EMPTY_INPUT, right: true });
  assert.equal(
    scene.position.x,
    bounds.maxX,
    'roll destination must keep the Player silhouette inside authored room clearance',
  );
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
      'authored-basic-strong-launcher-and-counter-pose-strips',
      'authored-idle-run-jump-fall-landing-guard-hit-pose-strips',
      'normal-enemy-body-collision',
      'normal-enemy-roll-through',
      'authored-scale-body-colliders-and-cramped-roll-rejection',
      'boss-body-roll-destination',
      'room-edge-roll-clearance',
      'jump-landing-held-movement-continuity',
      'jump-body-arc-clearance',
      'portal-held-input-continuity',
    ],
  }),
);
