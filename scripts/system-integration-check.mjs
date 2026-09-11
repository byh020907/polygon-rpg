import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import { createGameScene } from '../src/app/createGameScene.js';
import { compileSvgMaster } from '../src/graphics/svg/SvgAssetCompiler.js';
import { SceneCompositionPresenter } from '../src/graphics/scene/SceneCompositionPresenter.js';
import { defineCharacterBodyProfile } from '../src/animation/RigFamily.js';
import { LINEAR_ROOT_MOTION_CURVE } from '../src/animation/RootMotionCurve.js';
import { createSvgTestPresentation } from '../src/graphics/scene/SvgTestPresentation.js';
import { BUILTIN_SVG_RESOURCES } from '../src/graphics/SvgAssetSession.js';
const asset = compileSvgMaster(
  fs.readFileSync('scripts/fixtures/svg-character-system.master.svg', 'utf8'),
  { parseXml: (s) => new DOMParser().parseFromString(s, 'image/svg+xml') },
);
const scene = createGameScene();
scene.enterTree();
try {
  for (const [resourceId, referenceGroupId] of [
    ['svg:prologue-control-core', 'REF-02'],
    ['svg:prologue-retrieval-arm', 'REF-02'],
    ['svg:prologue-ancient-machine', 'REF-03'],
    ['svg:prologue-garage-zero', 'REF-04'],
  ]) {
    const resource = BUILTIN_SVG_RESOURCES.find((candidate) => candidate.id === resourceId);
    assert.equal(resource.referenceGroupId, referenceGroupId);
    assert.equal(resource.approvalStatus, 'runtime-baseline-unapproved');
    if (resourceId === 'svg:prologue-garage-zero')
      assert.equal(resource.source, 'public/graphics/prologue-garage-zero.master.svg');
  }
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
  scene.setVisualQaScrapAwakeningStage('device-investigated');
  const interactionOutput = presenter.resolve(scene.createRenderFrame(1), {
    viewport: { width: 960, height: 540 },
    project: (point) => point,
  });
  const coreInteraction = interactionOutput.diagnostics.anchors.find(
    (anchor) => anchor.worldObjectId === 'world-control-core' && anchor.id === 'interaction',
  );
  const coreEntity = scene.mapRuntime
    .getResolvedSnapshot()
    .entities.find((entity) => entity.id === 'scrap-control-device');
  assert.deepEqual(
    { x: coreInteraction.x, y: coreInteraction.y },
    coreEntity.position,
    'SVG core interaction anchor follows the authored gameplay interaction',
  );

  const presentArm = (stageId) => {
    scene.setVisualQaScrapAwakeningStage(stageId);
    scene.setVisualQaLocation({
      regionId: 'scrap-waste-edge',
      roomId: 'abandoned-weapon-yard',
      x: 1030,
    });
    return presenter.resolve(scene.createRenderFrame(1), {
      viewport: { width: 960, height: 540 },
      project: (point) => ({ x: point.x - 500, y: point.y }),
    });
  };
  const armCases = [
    {
      stageId: 'yard-survey',
      pose: 'dormant',
      bindingId: 'dormant',
      removedIds: [
        'scrap-retrieval-arm-dormant-upper',
        'scrap-retrieval-arm-dormant-forearm',
        'scrap-retrieval-arm-dormant-claw',
      ],
    },
    {
      stageId: 'collapse',
      pose: 'captured',
      bindingId: 'captured',
      removedIds: [
        'scrap-retrieval-arm-grab-upper',
        'scrap-retrieval-arm-grab-claw',
        'scrap-retrieval-arm-grab-signal',
      ],
    },
    {
      stageId: 'device-recovered',
      pose: 'released',
      bindingId: 'released',
      removedIds: [
        'scrap-retrieval-arm-grab-upper',
        'scrap-retrieval-arm-grab-claw',
        'scrap-retrieval-arm-grab-signal',
      ],
    },
  ];
  const armOutputs = new Map();
  for (const armCase of armCases) {
    const armOutput = presentArm(armCase.stageId);
    armOutputs.set(armCase.pose, armOutput);
    const arm = armOutput.diagnostics.objects.find((object) => object.id === 'world-retrieval-arm');
    assert.equal(arm.pose, armCase.pose);
    assert.equal(arm.legacyPoseBindingId, armCase.bindingId);
    for (const id of armCase.removedIds)
      assert.equal(
        armOutput.frame.items.some((item) => item.id === id),
        false,
        `${id} must be replaced by the shared SVG arm`,
      );
    assert.ok(
      armOutput.frame.items.some((item) => item.worldObjectId === 'world-retrieval-arm'),
      `${armCase.pose} arm must reach the production render frame`,
    );
    for (const anchorId of ['control-input', 'claw-contact'])
      assert.ok(
        armOutput.diagnostics.anchors.some(
          (anchor) => anchor.worldObjectId === 'world-retrieval-arm' && anchor.id === anchorId,
        ),
        `${armCase.pose} exposes ${anchorId}`,
      );
  }
  const capturedGrip = armOutputs
    .get('captured')
    .diagnostics.anchors.find(
      (anchor) => anchor.worldObjectId === 'world-retrieval-arm' && anchor.id === 'rival-grip',
    );
  const capturedRival = armOutputs
    .get('captured')
    .frame.castCharacters.find((actor) => actor.actorId === 'rival-scout');
  assert.ok(
    Math.hypot(
      capturedGrip.x - capturedRival.dialogueAnchor.x,
      capturedGrip.y - capturedRival.dialogueAnchor.y,
    ) < 30,
    'captured claw anchor stays visibly attached to the rival',
  );
  const releasedGrip = armOutputs
    .get('released')
    .diagnostics.anchors.find(
      (anchor) => anchor.worldObjectId === 'world-retrieval-arm' && anchor.id === 'rival-grip',
    );
  assert.ok(
    releasedGrip.x - capturedGrip.x > 40,
    'recovering the core visibly moves the released claw away from the rival',
  );
  const presentMachine = (stageId) => {
    scene.setVisualQaScrapAwakeningStage(stageId);
    scene.setVisualQaLocation({
      regionId: 'scrap-waste-edge',
      roomId: 'abandoned-weapon-yard',
      x: 960,
    });
    return presenter.resolve(scene.createRenderFrame(1), {
      viewport: { width: 960, height: 540 },
      project: (point) => ({ x: point.x - 500, y: point.y }),
    });
  };
  const machineCases = [
    { stageId: 'yard-survey', pose: 'dormant', anchorIds: ['socket-contact', 'mono-eye'] },
    { stageId: 'device-recovered', pose: 'socket-sealed', anchorIds: ['socket-contact'] },
    { stageId: 'eyes-lit', pose: 'eyes-lit', anchorIds: ['mono-eye'] },
    { stageId: 'assembled', pose: 'parts-assembled', anchorIds: ['mono-eye'] },
    {
      stageId: 'deadline-revealed',
      pose: 'incomplete-march',
      anchorIds: ['mono-eye', 'route-heading'],
    },
  ];
  const replacedMachineItems = [
    'wreck-hull-lower',
    'wreck-rib-left',
    'wreck-rib-right',
    'wreck-head',
    'wreck-face-slit',
    'scrap-king-eye-left',
    'scrap-king-eye-right',
    'scrap-king-shoulder-left',
    'scrap-king-shoulder-right',
    'scrap-king-cable-bundle',
    'scrap-king-route-beacon',
  ];
  for (const machineCase of machineCases) {
    const machineOutput = presentMachine(machineCase.stageId);
    const machine = machineOutput.diagnostics.objects.find(
      (object) => object.id === 'world-ancient-machine',
    );
    assert.equal(machine.pose, machineCase.pose);
    assert.equal(machine.legacyPoseBindingId, machineCase.pose);
    assert.ok(
      machineOutput.frame.items.some((item) => item.worldObjectId === 'world-ancient-machine'),
      `${machineCase.pose} ancient machine must reach the production render frame`,
    );
    for (const id of replacedMachineItems)
      assert.equal(
        machineOutput.frame.items.some((item) => item.id === id),
        false,
        `${id} must be replaced by the shared REF-03 SVG machine when enabled`,
      );
    for (const anchorId of machineCase.anchorIds)
      assert.ok(
        machineOutput.diagnostics.anchors.some(
          (anchor) => anchor.worldObjectId === 'world-ancient-machine' && anchor.id === anchorId,
        ),
        `${machineCase.pose} exposes ${anchorId}`,
      );
    const visibleEyeParts = machineOutput.frame.items.filter(
      (item) => item.worldObjectId === 'world-ancient-machine' && item.id.includes('mono-eye'),
    );
    if (['eyes-lit', 'parts-assembled', 'incomplete-march'].includes(machineCase.pose))
      assert.equal(
        visibleEyeParts.length,
        1,
        `${machineCase.pose} exposes one continuous mono-eye`,
      );
    else assert.equal(visibleEyeParts.length, 0);
    const firstMachineIndex = machineOutput.frame.items.findIndex(
      (item) => item.worldObjectId === 'world-ancient-machine',
    );
    const skylineIndex = machineOutput.frame.items.findIndex(
      (item) => item.id === 'scrap-yard-skyline',
    );
    const firstActorIndex = machineOutput.frame.items.findIndex(
      (item) => item.depthGroup?.startsWith('cast-runtime:') || item.depthGroup === 'player',
    );
    assert.ok(
      skylineIndex < firstMachineIndex && firstMachineIndex < firstActorIndex,
      `${machineCase.pose} stays ahead of the background and behind the cast`,
    );
  }
  const presentGarage = (stageId) => {
    scene.setVisualQaScrapGarageRevealStage(stageId);
    scene.setVisualQaLocation({
      regionId: 'scrap-waste-edge',
      roomId: 'abandoned-weapon-yard',
      x: 300,
    });
    const rawFrame = scene.createRenderFrame(1);
    return {
      rawFrame,
      output: presenter.resolve(rawFrame, {
        viewport: { width: 960, height: 540 },
        project: (point) => ({ x: point.x - 500, y: point.y }),
      }),
    };
  };
  const garageLegacyItems = [
    'garage-robot-frame-torso',
    'garage-robot-frame-leg-left',
    'garage-robot-frame-leg-right',
    'garage-robot-brain-core',
    'garage-robot-zero-label',
  ];
  const garageAnchorIds = [
    'core-socket',
    'walker-drive-mount-left',
    'walker-drive-mount-right',
    'crane-arm-mount-left',
    'crane-arm-mount-right',
    'reactor-mount',
    'snow-armor-mount',
    'quarry-cutter-mount',
    'ground-contact',
  ];
  for (const stageId of ['garage-opened', 'complete']) {
    const { rawFrame, output: garageOutput } = presentGarage(stageId);
    for (const id of garageLegacyItems)
      assert.ok(
        rawFrame.items.some((item) => item.id === id),
        `${stageId} must enable ${id} before presentation migration replaces it`,
      );
    const garage = garageOutput.diagnostics.objects.find(
      (object) => object.id === 'world-garage-zero',
    );
    assert.ok(garage, `${stageId} selects the production garage object`);
    assert.equal(garage.pose, 'garage-zero');
    assert.equal(garage.legacyPoseBindingId, 'garage-zero');
    assert.ok(
      garageOutput.frame.items.some((item) => item.worldObjectId === 'world-garage-zero'),
      `${stageId} garage frame must reach the production render frame`,
    );
    for (const id of garageLegacyItems)
      assert.equal(
        garageOutput.frame.items.some((item) => item.id === id),
        false,
        `${id} must be replaced by the shared REF-04 SVG garage frame when enabled`,
      );
    for (const anchorId of garageAnchorIds)
      assert.ok(
        garageOutput.diagnostics.anchors.some(
          (anchor) => anchor.worldObjectId === 'world-garage-zero' && anchor.id === anchorId,
        ),
        `${stageId} exposes ${anchorId}`,
      );
    for (const id of ['scrapyard-wall-map-frame', 'scrapyard-wall-map-route'])
      assert.ok(
        garageOutput.frame.items.some((item) => item.id === id),
        `${stageId} keeps the operation map in the same production frame`,
      );
    assert.ok(
      garageOutput.frame.items.some((item) => item.depthGroup === 'player'),
      `${stageId} keeps the player visible in the same production frame`,
    );
    for (const actorId of ['scrapyard-owner', 'rival-scout'])
      assert.ok(
        garageOutput.frame.castCharacters.some((actor) => actor.actorId === actorId),
        `${stageId} keeps the ${actorId} cast actor visible`,
      );
    assert.ok(
      garageOutput.frame.items.some((item) => item.id === 'cast-scrapyard-owner:torso'),
      `${stageId} keeps the owner presentation in the same production frame`,
    );
  }
  const installedGarageScene = createGameScene();
  installedGarageScene.enterTree();
  for (const regionId of [
    'abandoned-mine',
    'harbor-shipyard',
    'greenhouse-plains',
    'snow-trade-road',
    'red-quarry',
  ])
    installedGarageScene.setVisualQaScrapRegionState({
      regionId,
      stageKind: 'campaign-updated',
      status: 'resolved',
      collected: true,
      currentLocationId: 'neighborhood-scrapyard',
    });
  installedGarageScene.setVisualQaLocation({
    regionId: 'scrap-waste-edge',
    roomId: 'abandoned-weapon-yard',
    x: 300,
  });
  const installedRawFrame = installedGarageScene.createRenderFrame(1);
  const installedOutput = presenter.resolve(installedRawFrame, {
    viewport: { width: 960, height: 540 },
    project: (point) => ({ x: point.x - 500, y: point.y }),
  });
  for (const id of [
    'garage-robot-walker-leg-left',
    'garage-robot-walker-leg-right',
    'garage-robot-crane-arm-left',
    'garage-robot-crane-arm-right',
    'garage-robot-crane-cable',
    'garage-robot-reactor-core',
    'garage-robot-reactor-pipe-left',
    'garage-robot-reactor-pipe-right',
    'garage-robot-snow-armor-torso',
    'garage-robot-snow-armor-rivet-left',
    'garage-robot-snow-armor-rivet-right',
    'garage-robot-quarry-cutter-blade',
    'garage-robot-quarry-cutter-teeth',
    'garage-robot-hundred-label',
  ])
    assert.ok(
      installedRawFrame.items.some((item) => item.id === id) &&
        installedOutput.frame.items.some((item) => item.id === id),
      `${id} remains visible as an installed module overlay beside the REF-04 frame`,
    );
  installedGarageScene.dispose();
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
    'PASS actual GameScene: core interaction anchor, stage-bound retrieval arm, REF-03 ancient machine and REF-04 garage poses/contact, deduplicated identity, body retarget/SVG visible-contact contour, whole pose, root distance and save preservation',
  );
} finally {
  scene.dispose();
}
