import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DOMParser } from '@xmldom/xmldom';
import { compileSvgMaster } from '../src/graphics/svg/SvgAssetCompiler.js';
import {
  createSvgCharacterBinding,
  sampleSvgCharacterPresentation,
} from '../src/graphics/SvgCharacterPresentation.js';
import { samplePlayerMotionPose } from '../src/animation/PlayerMotionPose.js';
import { defineCharacterBodyProfile } from '../src/animation/RigFamily.js';
import { projectSideViewSkeletonFrame } from '../src/animation/SkeletonPoseProjection.js';
import {
  axisAngleQuaternion,
  multiplyQuaternions,
  conjugateQuaternion,
} from '../src/animation/Quaternion.js';
const text = await readFile(
  new URL('./fixtures/svg-character-system.master.svg', import.meta.url),
  'utf8',
);
const parseXml = (source) =>
  new DOMParser({
    onError: (level, message) => {
      throw new Error(`${level}: ${message}`);
    },
  }).parseFromString(source, 'image/svg+xml');
const compile = (source) => compileSvgMaster(source, { parseXml });
const asset = compile(text),
  motionState = { id: 'idle', progress: 0 },
  restPose = samplePlayerMotionPose({ motionState }).bonePose,
  rootFrame = [-100, -100, 300, 220];
const bind = (asset) => createSvgCharacterBinding(asset, { restPose, rootFrame });
const binding = bind(asset),
  options = {
    bonePose: restPose,
    position: { x: 300, y: 400 },
    facing: 1,
    geometryScale: 0.77,
    renderOrder: 30,
  };
const base = sampleSvgCharacterPresentation(binding, options);
assert.equal(base.items.length, 3);
assert.strictEqual(base.weapon.points, base.items.find((i) => i.partId === 'weapon').points);
assert.strictEqual(base.shield.points, base.items.find((i) => i.partId === 'shield').points);
assert.ok(Object.isFrozen(base.weapon.points));
for (const factor of [0.75, 1.25]) {
  const bodyProfile = defineCharacterBodyProfile({
    id: 'fixture-' + factor,
    joints: {
      nearElbow: { scale: factor },
      nearHand: { scale: factor },
      farElbow: { scale: factor },
      farHand: { scale: factor },
    },
  });
  const bonePose = samplePlayerMotionPose({ motionState, bodyProfile }).bonePose,
    sample = sampleSvgCharacterPresentation(binding, { ...options, bonePose });
  for (const [anchorId, jointId] of [
    ['weapon-grip', 'nearHand'],
    ['shield-grip', 'farHand'],
  ]) {
    const anchor = sample.anchors.find((a) => a.id === anchorId),
      joint = bonePose.projectedJoints[jointId];
    assert.ok(Math.abs(anchor.x - (options.position.x + joint.x * 0.77)) < 1e-7);
    assert.ok(Math.abs(anchor.y - (options.position.y + 82 + (joint.y - 82) * 0.77)) < 1e-7);
  }
  assert.notDeepEqual(sample.weapon.points, base.weapon.points);
}
const mirrored = sampleSvgCharacterPresentation(binding, { ...options, facing: -1 });
for (let i = 0; i < base.weapon.points.length; i++) {
  assert.ok(Math.abs(base.weapon.points[i].x + mirrored.weapon.points[i].x - 600) < 1e-8);
  assert.equal(base.weapon.points[i].y, mirrored.weapon.points[i].y);
}
const key = sampleSvgCharacterPresentation(binding, {
  ...options,
  authoredOverride: { poseId: 'key', wholeBody: false },
});
assert.notDeepEqual(key.weapon.points, base.weapon.points);
assert.deepEqual(key.shield.points, base.shield.points);
const packed = sampleSvgCharacterPresentation(binding, {
  ...options,
  authoredOverride: { poseId: 'packed', wholeBody: true },
});
assert.equal(packed.diagnostics.wholeBody, true);
assert.equal(packed.anchors.length, 2);
assert.equal(packed.items.length, 3);
assert.ok(packed.items.every((i) => i.id.includes('packed')));
assert.strictEqual(packed.weapon.points, packed.items.find((i) => i.partId === 'weapon').points);
const attackPose = samplePlayerMotionPose({ motionState: { id: 'slash', progress: 0.6 } }).bonePose,
  attack = sampleSvgCharacterPresentation(binding, { ...options, bonePose: attackPose });
assert.notDeepEqual(attack.weapon.points, base.weapon.points);
const a = attack.weapon.points[0],
  b = attack.weapon.points[1],
  axis = attackPose.projectedJoints.nearHand.axisX;
assert.ok(
  Math.abs((b.x - a.x) * axis.y - (b.y - a.y) * axis.x) < 1e-5,
  'actual wrist orientation drives visible weapon',
);
assert.throws(() => createSvgCharacterBinding(asset, { restPose }), /rootFrame/);
assert.throws(() => bind({ ...asset, rigFamily: 'Flying' }), /Humanoid/);
assert.throws(
  () => createSvgCharacterBinding(asset, { restPose, rootFrame, jointMap: { weapon: 'missing' } }),
  /Unknown canonical/,
);
assert.throws(
  () =>
    sampleSvgCharacterPresentation(binding, {
      ...options,
      authoredOverride: { poseId: 'key', wholeBody: true },
    }),
  /whole-body/,
);
assert.throws(
  () =>
    sampleSvgCharacterPresentation(binding, {
      ...options,
      authoredOverride: { partTransforms: { missing: [1, 0, 0, 1, 0, 0] } },
    }),
  /Unknown authored/,
);
assert.throws(
  () => bind({ ...asset, shapes: asset.shapes.filter((s) => s.partId !== 'weapon') }),
  /exactly one/,
);
const duplicate = compile(
  text.replace(
    '<rect id="weapon-base"',
    '<rect id="weapon-extra" x="27" y="18" width="30" height="4" fill="#BFC9CF"/><rect id="weapon-base"',
  ),
);
assert.throws(() => bind(duplicate), /exactly one/);
const concave = compile(
  text.replace(
    '<rect id="weapon-base" x="27" y="18" width="30" height="4" fill="#BFC9CF"/>',
    '<polygon id="weapon-base" points="27,18 57,18 40,20 57,22 27,22" fill="#BFC9CF"/>',
  ),
);
assert.throws(() => bind(concave), /convex/);
let edgeSamples = 0;
for (const id of [
  'idle',
  'guard',
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
]) {
  for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const pose = samplePlayerMotionPose({ motionState: { id, progress } }).bonePose;
    for (const edge of [-Math.PI / 2, Math.PI / 2]) {
      const quaternion = multiplyQuaternions(
        conjugateQuaternion(pose.worldJoints.nearElbow.quaternion),
        axisAngleQuaternion({ x: 0, y: 1, z: 0 }, edge),
      );
      const frame = {
        ...pose.skeletonFrame,
        joints: {
          ...pose.skeletonFrame.joints,
          nearHand: { ...pose.skeletonFrame.joints.nearHand, quaternion },
        },
      };
      const edgePose = { ...pose, ...projectSideViewSkeletonFrame(frame) };
      const sample = sampleSvgCharacterPresentation(binding, { ...options, bonePose: edgePose });
      assert.ok(sample.diagnostics.collapsedPartIds.includes('weapon'));
      assert.ok(
        sample.items.every(
          (item) =>
            item.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) &&
            item.depths.every(Number.isFinite),
        ),
      );
      assert.strictEqual(
        sample.weapon.points,
        sample.items.find((i) => i.partId === 'weapon').points,
      );
      assert.ok(
        Math.max(...sample.weapon.points.map((p) => p.x)) -
          Math.min(...sample.weapon.points.map((p) => p.x)) <
          1e-7,
        'edge-on tool has no manufactured thickness',
      );
      assert.deepEqual(
        sample,
        sampleSvgCharacterPresentation(binding, { ...options, bonePose: edgePose }),
      );
      edgeSamples++;
    }
    const edgeFrame = {
      ...pose.skeletonFrame,
      joints: {
        ...pose.skeletonFrame.joints,
        root: {
          ...pose.skeletonFrame.joints.root,
          quaternion: axisAngleQuaternion({ x: 0, y: 1, z: 0 }, Math.PI / 2),
        },
      },
    };
    const edgePose = { ...pose, ...projectSideViewSkeletonFrame(edgeFrame) };
    const sample = sampleSvgCharacterPresentation(binding, { ...options, bonePose: edgePose });
    assert.ok(
      sample.items.every((item) =>
        item.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      ),
    );
  }
}
assert.equal(edgeSamples, 182);
for (const boneInput of [
  { movementIntent: 1, animationTime: 0.3 },
  { isGrounded: false, verticalVelocity: -50 },
  { isGrounded: false, verticalVelocity: 50 },
  { landingRecovery: 0.5 },
  { hitstunProgress: 0.5 },
  { knockedOut: true },
  ...[0, 0.25, 0.5, 0.75, 1].map((rollProgress) => ({ rollProgress })),
]) {
  const pose = samplePlayerMotionPose({
    motionState: { id: 'idle', progress: 0 },
    boneInput,
  }).bonePose;
  const frame = {
    ...pose.skeletonFrame,
    joints: {
      ...pose.skeletonFrame.joints,
      root: {
        ...pose.skeletonFrame.joints.root,
        quaternion: axisAngleQuaternion({ x: 0, y: 1, z: 0 }, Math.PI / 2),
      },
    },
  };
  const sample = sampleSvgCharacterPresentation(binding, {
    ...options,
    bonePose: { ...pose, ...projectSideViewSkeletonFrame(frame) },
  });
  assert.ok(
    sample.items.every((item) =>
      item.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    ),
  );
  assert.strictEqual(sample.weapon.points, sample.items.find((i) => i.partId === 'weapon').points);
}
assert.throws(
  () =>
    sampleSvgCharacterPresentation(binding, {
      ...options,
      authoredOverride: { partTransforms: { weapon: [0, 0, 0, 0, 0, 0] } },
    }),
  /Singular/,
);
const invalidPose = {
  ...restPose,
  projectedJoints: {
    ...restPose.projectedJoints,
    nearHand: {
      ...restPose.projectedJoints.nearHand,
      axisX: { x: 0, y: 0 },
      axisY: { x: 0, y: 0 },
    },
  },
};
assert.throws(
  () => sampleSvgCharacterPresentation(binding, { ...options, bonePose: invalidPose }),
  /valid 3D projection/,
);
console.log(
  'PASS SVG character: canonical joint hierarchy/orientation, two body profiles, shared visible/contact contours, mirror/anchors, partial/whole pose rendering and missing/unsupported tool rejection',
);
