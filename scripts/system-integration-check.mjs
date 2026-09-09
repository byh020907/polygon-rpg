import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import { createGameScene } from '../src/app/createGameScene.js';
import { compileSvgMaster } from '../src/graphics/svg/SvgAssetCompiler.js';
import { SceneCompositionPresenter } from '../src/graphics/scene/SceneCompositionPresenter.js';
import { defineCharacterBodyProfile } from '../src/animation/RigFamily.js';
import { LINEAR_ROOT_MOTION_CURVE } from '../src/animation/RootMotionCurve.js';
import { createSvgTestPresentation } from '../src/graphics/scene/SvgTestPresentation.js';
const asset = compileSvgMaster(
  fs.readFileSync('scripts/fixtures/svg-character-system.master.svg', 'utf8'),
  { parseXml: (s) => new DOMParser().parseFromString(s, 'image/svg+xml') },
);
const scene = createGameScene();
scene.enterTree();
try {
  scene.setVisualQaScrapAwakeningStage('player-decision');
  scene.setVisualQaLocation({
    regionId: 'scrap-waste-edge',
    roomId: 'abandoned-weapon-yard',
    x: 760,
  });
  const presenter = new SceneCompositionPresenter(),
    frame = scene.createRenderFrame(1);
  const output = presenter.resolve(frame, {
    viewport: { width: 960, height: 540 },
    project: (p) => p,
  });
  assert.equal(output.diagnostics.objects.filter((o) => o.id === 'world-control-core').length, 1);
  const before = frame.items.find((i) => i.id === 'scrap-device-core'),
    after = output.frame.items.find((i) => i.id === before.id);
  before.points.forEach((p, i) => {
    assert.ok(Math.abs(p.x - after.points[i].x) < 1e-8);
    assert.ok(Math.abs(p.y - after.points[i].y) < 1e-8);
  });
  assert.equal(after.stroke, before.stroke);
  const progressBefore = JSON.stringify(scene.getProgressionSnapshot());
  for (const factor of [0.85, 1.15]) {
    scene.setCharacterAnimationSettings({
      bodyProfile: defineCharacterBodyProfile({
        id: 'body-' + factor,
        joints: { nearElbow: { scale: factor }, nearHand: { scale: factor } },
      }),
      svgAsset: asset,
      svgRootFrame: [-100, -100, 300, 220],
    });
    for (const id of ['idle', 'slash', 'heavy', 'shieldBash']) {
      const state = { id, progress: 0.5, phase: 'active', sequence: 1, comboCycle: 1 };
      const geometry = scene.samplePlayerCombatGeometry(state);
      assert.ok(geometry.semanticHurt.length > 0);
      assert.strictEqual(
        geometry.weapon.points,
        geometry.svgPresentation.items.find((i) => i.partId === 'weapon').points,
      );
    }
    const drawn = scene.createRenderFrame(1);
    assert.ok(drawn.items.some((i) => i.id.startsWith(asset.id)));
    assert.strictEqual(
      drawn.combatGeometry.visibleWeapon.points,
      drawn.items.find((i) => i.partId === 'weapon').points,
    );
  }
  scene.setCharacterAnimationSettings({
    svgAsset: asset,
    svgRootFrame: [-100, -100, 300, 220],
    authoredOverride: { poseId: 'packed', wholeBody: true },
  });
  assert.equal(scene.createRenderFrame(1).combatGeometry.svgPresentation.pose, 'packed');
  assert.equal(
    JSON.stringify(scene.getProgressionSnapshot()),
    progressBefore,
    'presentation must not mutate save',
  );
  scene.setCharacterAnimationSettings({
    svgAsset: asset,
    svgRootFrame: [-100, -100, 300, 220],
    tracks: {
      heavy: {
        id: 'five-keyposes',
        keys: [
          { at: 0, poseId: 'base' },
          { at: 0.15, poseId: 'key' },
          { at: 0.3, poseId: 'key' },
          { at: 0.55, poseId: 'packed', wholeBody: true },
          { at: 0.85, poseId: 'base' },
        ],
      },
    },
  });
  assert.equal(
    scene.samplePlayerCombatGeometry({
      id: 'heavy',
      progress: 0.6,
      phase: 'recovery',
      sequence: 77,
    }).svgPresentation.diagnostics.pose,
    'packed',
  );
  scene.setCharacterAnimationSettings({});
  scene.setVisualQaScrapAwakeningStage('yard-clearance');
  scene.setVisualQaLocation({
    regionId: 'scrap-waste-edge',
    roomId: 'abandoned-weapon-yard',
    x: 200,
  });
  for (const hz of [60, 120, 144]) {
    scene.position.x = 200;
    scene.setRootMotionCurve('roll', LINEAR_ROOT_MOTION_CURVE, { distance: 100 });
    assert.equal(scene.tryStartRoll(1), true);
    for (let i = 0; i < 500 && scene.rollState; i++) scene.updateRoll(1 / hz);
    assert.ok(Math.abs(scene.position.x - 300) < 1e-7);
  }
  scene.combatCommands.reset();
  scene.position.x = 200;
  scene.previousPosition = { ...scene.position };
  scene.setRootMotionCurve('heavy', LINEAR_ROOT_MOTION_CURVE, { distance: 60 });
  scene.update(1 / 120, { left: false, right: false, strongAttack: true });
  for (let i = 0; i < 200; i++) scene.update(1 / 120, { left: false, right: false });
  assert.ok(
    Math.abs(scene.position.x - 260) < 1e-5,
    'actual attack advance uses gameplay distance',
  );
  const old = scene.scenePresentation;
  scene.scenePresentation = createSvgTestPresentation(asset, {
    position: scene.position,
    groundY: 426,
    lod: 'mid',
    pose: 'base',
  });
  old.dispose();
  const current = presenter.resolve(scene.createRenderFrame(1), {
    viewport: { width: 960, height: 540 },
    project: (p) => p,
  });
  assert.equal(current.diagnostics.objects[0].lod, 'mid');
  assert.ok(current.frame.artDirection.lights.length);
  console.log(
    'PASS actual GameScene: same core master geometry, deduplicated identity, body retarget/SVG visible-contact contour, whole pose, root distance and save preservation',
  );
} finally {
  scene.dispose();
}
