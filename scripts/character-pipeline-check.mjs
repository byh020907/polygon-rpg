import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sampleCharacterBonePose } from '../src/animation/CharacterBonePoseLibrary.js';
import { samplePlayerMotionPose } from '../src/animation/PlayerMotionPose.js';
import {
  sampleCharacterAnimation,
  composeRigFrame,
} from '../src/animation/CharacterAnimationPipeline.js';
import {
  HUMANOID_RIG_FAMILY,
  RIG_FAMILIES,
  DEFAULT_CHARACTER_BODY_PROFILE,
  defineCharacterBodyProfile,
  defineRigFamily,
} from '../src/animation/RigFamily.js';
import {
  LINEAR_ROOT_MOTION_CURVE,
  defineRootMotionCurve,
  sampleRootMotion,
  sampleRootMotionDelta,
} from '../src/animation/RootMotionCurve.js';
import { createSvgRigBinding, sampleSvgRigBinding } from '../src/animation/SvgRigBinding.js';
import { sampleSvgAsset } from '../src/graphics/svg/SvgAssetSampler.js';
const motionState = { id: 'idle', progress: 0 };
for (const boneInput of [
  {},
  { animationTime: 0.6, movementIntent: 1 },
  { rollProgress: 0.4 },
  { isGrounded: false, verticalVelocity: -20 },
  { hitstunProgress: 0.5 },
  { landingRecovery: 0.2 },
]) {
  const shared = sampleCharacterBonePose({ ...boneInput, motionState });
  assert.deepEqual(
    samplePlayerMotionPose({ motionState, boneInput }).bonePose,
    shared,
    'default skeleton playback parity',
  );
  assert.deepEqual(
    samplePlayerMotionPose({ motionState, boneInput, bodyProfile: DEFAULT_CHARACTER_BODY_PROFILE })
      .bonePose,
    shared,
    'explicit default profile parity',
  );
}
const baseline = sampleCharacterBonePose({ motionState }).skeletonFrame;
for (const id of [
  'slash',
  'heavy',
  'rising',
  'shieldBash',
  'thrust',
  'spin',
  'airSlash',
  'airHeavy',
  'airReturn',
  'airSpin',
  'airCross',
  'guard',
]) {
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    const state = { id, progress };
    assert.deepEqual(
      samplePlayerMotionPose({ motionState: state }).bonePose,
      sampleCharacterBonePose({ motionState: state }),
    );
  }
}
for (const factor of [0.75, 1.25]) {
  const bodyProfile = defineCharacterBodyProfile({
    id: 'fixture-' + factor,
    joints: {
      nearElbow: { scale: factor },
      nearHand: { scale: factor },
      nearKnee: { scale: factor },
      nearFoot: { scale: factor },
    },
  });
  const result = samplePlayerMotionPose({ motionState, bodyProfile });
  assert.ok(
    Math.abs(
      Math.hypot(
        result.bonePose.skeletonFrame.joints.nearElbow.x,
        result.bonePose.skeletonFrame.joints.nearElbow.y,
        result.bonePose.skeletonFrame.joints.nearElbow.z,
      ) -
        25 * factor,
    ) < 1e-8,
  );
  assert.notDeepEqual(
    result.bonePose.projectedJoints.nearHand,
    sampleCharacterBonePose({ motionState }).projectedJoints.nearHand,
  );
}
const world = composeRigFrame(baseline),
  targets = ['near', 'far'].map((side) => ({
    chain: [side + 'Shoulder', side + 'Elbow', side + 'Hand'],
    target: {
      x: world[side + 'Hand'].x + 2,
      y: world[side + 'Hand'].y - 3,
      z: world[side + 'Hand'].z,
    },
    weight: 1,
  }));
const contact = sampleCharacterAnimation({ skeletonFrame: baseline, contacts: targets });
for (const report of contact.contactReports) {
  assert.equal(report.clamped, false);
  assert.ok(
    Math.hypot(
      report.position.x - report.target.x,
      report.position.y - report.target.y,
      report.position.z - report.target.z,
    ) < 1e-6,
  );
}
const unreachable = sampleCharacterAnimation({
  skeletonFrame: baseline,
  contacts: [{ ...targets[0], target: { x: 10000, y: 10000, z: 10000 } }],
});
assert.equal(unreachable.contactReports[0].clamped, true);
const feet = sampleCharacterAnimation({
  skeletonFrame: baseline,
  contacts: ['near', 'far'].map((side) => ({
    chain: [side + 'Hip', side + 'Knee', side + 'Foot'],
    target: { x: world[side + 'Foot'].x, y: world[side + 'Foot'].y - 2, z: world[side + 'Foot'].z },
    weight: 1,
  })),
});
for (const report of feet.contactReports)
  assert.ok(
    Math.hypot(...['x', 'y', 'z'].map((k) => report.position[k] - report.target[k])) < 1e-6,
  );
const overridden = sampleCharacterAnimation({
  skeletonFrame: baseline,
  characterModifier: {
    joints: { root: { offset: { x: 0.5, y: 0, z: 0 }, parentExtent: { x: 10, y: 10, z: 10 } } },
  },
  authoredOverride: { joints: { root: { x: 20 } } },
});
assert.equal(overridden.skeletonFrame.joints.root.x, 20, 'authored override follows modifier');
const offsetProfile = defineCharacterBodyProfile({
  id: 'normalized-offset',
  extents: { chest: { x: 40, y: 40, z: 10 } },
  joints: { nearShoulder: { offset: { x: 0.25, y: 0, z: 0 } } },
});
const offsetResult = sampleCharacterAnimation({
  skeletonFrame: baseline,
  bodyProfile: offsetProfile,
});
assert.equal(offsetResult.skeletonFrame.joints.nearShoulder.x, baseline.joints.nearShoulder.x + 10);
assert.throws(() =>
  defineCharacterBodyProfile({
    id: 'raw-offset',
    joints: { root: { offset: { x: 5, y: 0, z: 0 }, parentExtent: { x: 10, y: 10, z: 10 } } },
  }),
);
assert.throws(() =>
  defineCharacterBodyProfile({
    id: 'missing-extent',
    joints: { root: { offset: { x: 0.5, y: 0, z: 0 } } },
  }),
);
const parentTarget = sampleCharacterAnimation({
  skeletonFrame: baseline,
  contacts: [
    {
      chain: ['nearShoulder', 'nearElbow', 'nearHand'],
      targetSpace: 'parent',
      targetParentId: 'nearShoulder',
      target: { x: 20, y: 20, z: 0 },
    },
  ],
});
assert.equal(parentTarget.contactReports[0].clamped, false);
assert.ok(
  Math.hypot(
    ...['x', 'y', 'z'].map(
      (k) => parentTarget.contactReports[0].position[k] - parentTarget.contactReports[0].target[k],
    ),
  ) < 1e-6,
);
for (let i = 0; i < 5; i++) {
  const result = samplePlayerMotionPose({
    motionState,
    authoredOverride: {
      poseId: 'key-' + i,
      wholeBody: true,
      joints: { ...baseline.joints, root: { ...baseline.joints.root, x: i } },
      partTransforms: { boom: [1, 0, 0, 1, i / 10, 0] },
    },
  });
  assert.equal(result.bonePose.skeletonFrame.joints.root.x, i);
  assert.equal(result.bonePose.authoredOverride.poseId, 'key-' + i);
  assert.equal(result.bonePose.authoredOverride.wholeBody, true);
}
for (const rig of Object.values(RIG_FAMILIES)) {
  const skeletonFrame = {
    joints: Object.fromEntries(
      rig.jointIds.map((id) => [
        id,
        { x: 0, y: rig.parents[id] ? 1 : 0, z: 0, quaternion: { x: 0, y: 0, z: 0, w: 1 } },
      ]),
    ),
  };
  const bodyProfile = defineCharacterBodyProfile({ id: rig.id, rigFamilyId: rig.id });
  const sampled = sampleCharacterAnimation({ skeletonFrame, rigFamily: rig, bodyProfile });
  assert.equal(Object.keys(sampled.worldJoints).length, rig.jointIds.length);
}
assert.throws(() => defineRigFamily({ id: 'cycle', parents: { a: 'b', b: 'a' } }));
assert.throws(() =>
  sampleCharacterAnimation({
    skeletonFrame: baseline,
    bodyProfile: defineCharacterBodyProfile({ id: 'wrong', rigFamilyId: 'Flying' }),
  }),
);
const curve = defineRootMotionCurve({
  id: 'warp',
  keys: [
    { at: 0, x: 0, y: 0 },
    { at: 0.3, x: 0.1, y: 0.2 },
    { at: 0.7, x: 0.9, y: 0.1 },
    { at: 1, x: 1, y: 0 },
  ],
});
for (const facing of [-1, 1])
  for (const fps of [30, 60, 120, 144]) {
    let x = 0,
      y = 0;
    for (let i = 0; i < fps; i++) {
      const delta = sampleRootMotionDelta(curve, i / fps, (i + 1) / fps, { distance: 240, facing });
      x += delta.x;
      y += delta.y;
    }
    assert.ok(Math.abs(x - 240 * facing) < 1e-8);
    assert.ok(Math.abs(y) < 1e-8);
  }
assert.deepEqual(sampleRootMotion(LINEAR_ROOT_MOTION_CURVE, 1, { distance: 50 }), { x: 50, y: 0 });
assert.deepEqual(sampleRootMotion(curve, 0.5, { distance: 0 }), { x: 0, y: 0 });
assert.deepEqual(sampleRootMotionDelta(curve, 1, 0, { distance: 240, reset: true }), {
  x: 0,
  y: 0,
});
assert.throws(() =>
  defineRootMotionCurve({
    id: 'bad',
    keys: [
      { at: 0, x: 0, y: 0 },
      { at: 0, x: 1, y: 0 },
    ],
  }),
);
const asset = JSON.parse(
  await readFile(
    new URL('../public/graphics/system-reference.compiled.json', import.meta.url),
    'utf8',
  ),
);
const rest = { 'boom-hinge': { x: 0, y: 0, axisX: { x: 1, y: 0 }, axisY: { x: 0, y: 1 } } };
const binding = createSvgRigBinding(asset, { restJoints: rest, rootFrame: [-100, -100, 200, 200] });
const partTransforms = sampleSvgRigBinding(binding, {
  posedJoints: { 'boom-hinge': { ...rest['boom-hinge'], x: 10 } },
});
const a = sampleSvgAsset(asset).anchors.find((a) => a.id === 'tool-tip'),
  b = sampleSvgAsset(asset, { partTransforms }).anchors.find((a) => a.id === 'tool-tip');
assert.ok(
  Math.abs(b.x - a.x - 0.1) < 1e-8,
  'canonical pose delta reaches SVG descendant anchor once',
);
assert.equal(HUMANOID_RIG_FAMILY.jointIds.length, 17);
console.log(
  'PASS character pipeline: default playback parity, body retarget, two-hand and parent-space contact IK, clamp reports, five authored overrides, generic families, SVG anchors and frame-rate-independent warped root motion',
);
