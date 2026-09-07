import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import {
  createProjectedTorsoSurface,
  surfaceOutline,
} from '../src/animation/ProjectedBodySurface.js';
import { samplePlayerMotionPose } from '../src/animation/PlayerMotionPose.js';
import {
  samplePlayerCombatGeometry,
  PLAYER_CHARACTER_FOOT_OFFSET,
} from '../src/combat/SharedCombatGeometry.js';
import {
  CHARACTER_RENDER_SCALE,
  createPlayerCombatPresentation,
} from '../src/game/PlayerCombatPresentation.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

function deepFreezeFixture(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeFixture(child);
  return Object.freeze(value);
}

const SCRAPYARD_APPRENTICE_FIXTURE = deepFreezeFixture({
  id: 'fixture-scrapyard-apprentice',
  family: 'human',
  accent: '#f2a65a',
  material: '#4d6670',
  toolKind: 'tool-bag',
  proportions: { shoulder: 15, hip: 10, head: 8, sideDepth: 8 },
  landmarks: ['고글', '공구 가방', '소매 수리 붕대'],
});

const POSE_PARITY = Object.freeze({
  'pose-idle': Object.freeze({
    count: 37,
    digest: '2923b7f811269461e1619cbb470ccf5d9fd7f4d2a61516e49816861fc3885a90',
  }),
  'pose-move': Object.freeze({
    count: 37,
    digest: '9625e5731317ce2b82d375adb73c610990a748d028abfbf3829e7fd40d3b5f80',
  }),
  'pose-guard': Object.freeze({
    count: 37,
    digest: '9dfdee080f3c7e31c73486c2981cfcf94a52db3684781fec01f89e318f163f62',
  }),
  'pose-roll': Object.freeze({
    count: 37,
    digest: '7324650960bccf41be64ae335f3279f482843ac22156d16748e08dc2408d5bde',
  }),
  'pose-ground-attack': Object.freeze({
    count: 37,
    digest: 'a90ae1aef148f21cd7c06ba963f2a143a3fd651fba007358df84459653d17d81',
  }),
  'pose-air-attack': Object.freeze({
    count: 37,
    digest: '45e9195f204894081be92a6d5d09339bdc0ff9cdb4b9183eb360849ecf8d25af',
  }),
  'pose-hit': Object.freeze({
    count: 37,
    digest: '06045939cc0acdebfc8f79abb03ab451351ee1ece1b8749cf3fbd307506d76a9',
  }),
});

const EFFECT_PARITY = Object.freeze({
  'combat-hit': Object.freeze({
    count: 44,
    digest: 'b7daca22f1bc6a8f3465d1840ff03226487c22bb007c9d319347c78c5477c171',
  }),
  'combat-player-hit': Object.freeze({
    count: 44,
    digest: 'cfd2eaa58a377fba5a0ab71268e5f479367f2fc54050bfc7aa577fa51fe93727',
  }),
  'combat-block': Object.freeze({
    count: 43,
    digest: 'ba5983e7a55bd5abcda3666d67bef4c2971d9b2f0687838b7c3b5a5d9b9fc71e',
  }),
  'combat-evade': Object.freeze({
    count: 40,
    digest: 'fd276503bc114eb67ae3b66433824478621d064b967f2272a0022bd999667a25',
  }),
  'combat-punish': Object.freeze({
    count: 43,
    digest: '89341c98ee79dd40386fe21458cedf56a2f6921e02d9d4df0fa37c4b0ca2be1e',
  }),
  'combat-launch': Object.freeze({
    count: 44,
    digest: '465e40af05bc0dbcbc995f40954890c8e9596dfe911bb997b9678f83c379ed12',
  }),
  'combat-guard-break': Object.freeze({
    count: 43,
    digest: '9c6f6cf02ddd1f80d4caa1c76696c59253ff24d39308cd94bc02293ea124fe07',
  }),
  'combat-just-guard': Object.freeze({
    count: 48,
    digest: '875c3389c3b3f7b28f77c77eea8d748dd14d375679f6feca28cfeee64e56d754',
  }),
  'combat-guard-counter': Object.freeze({
    count: 44,
    digest: 'b08b3cddc29e2fafeea68f9d0d976df31add08cccee7b60f1e7501118bd128ca',
  }),
});

const round = (value) => Math.round(value * 1_000_000) / 1_000_000;

function normalizeItem(item) {
  return {
    id: item.id,
    renderOrder: round(item.renderOrder),
    order: round(item.order),
    fill: item.fill ?? null,
    stroke: item.stroke ?? null,
    lineWidth: round(item.lineWidth),
    opacity: round(item.opacity),
    points: item.points?.map((point) => ({ x: round(point.x), y: round(point.y) })) ?? null,
  };
}

function presentationItems(frame) {
  return frame.items.filter(
    (item) =>
      item.renderOrder === 30.5 ||
      /^(player-(block|retaliation|hit|evade|just-guard|shield-counter)|combat-enemy-hit|enemy-punish)/.test(
        item.id,
      ),
  );
}

function digestItems(items) {
  return createHash('sha256')
    .update(JSON.stringify(items.map(normalizeItem)))
    .digest('hex');
}

function assertPublicParity(scenarioId, expected, setScenario) {
  const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
  scene.enterTree();
  try {
    scene.setVisualQaLocation({
      regionId: 'academy-region',
      roomId: 'training-room',
      x: 560,
    });
    setScenario(scene, scenarioId);
    const items = presentationItems(scene.createRenderFrame(0));
    assert.equal(items.length, expected.count, `${scenarioId} item count parity`);
    assert.equal(digestItems(items), expected.digest, `${scenarioId} fixed presentation parity`);
  } finally {
    scene.exitTree();
  }
}

for (const [scenarioId, expected] of Object.entries(POSE_PARITY)) {
  assertPublicParity(scenarioId, expected, (scene, id) => scene.setVisualQaPoseScenario(id));
}

for (const [scenarioId, expected] of Object.entries(EFFECT_PARITY)) {
  assertPublicParity(scenarioId, expected, (scene, id) =>
    scene.setVisualQaCombatScenario(id, 'active'),
  );
}

const playerHitScene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
playerHitScene.enterTree();
try {
  playerHitScene.setVisualQaLocation({
    regionId: 'academy-region',
    roomId: 'training-room',
    x: 560,
  });
  playerHitScene.setVisualQaCombatScenario('combat-player-hit', 'active');
  const playerHitFrame = playerHitScene.createRenderFrame(0);
  const playerHitRing = playerHitFrame.items.find((item) => item.id === 'player-hit-ring');
  const playerHead = playerHitFrame.items.find((item) => item.id === 'head');
  const playerTorso = playerHitFrame.items.find((item) => item.id === 'torso');
  assert.ok(playerHitRing?.points?.length, 'player hit must render a contact-point ring');
  assert.ok(playerHead?.points?.length, 'player hit QA needs the rendered player head');
  assert.ok(playerTorso?.points?.length, 'player hit QA needs the rendered player torso');
  const ringCenter = playerHitRing.points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  );
  ringCenter.x /= playerHitRing.points.length;
  ringCenter.y /= playerHitRing.points.length;
  const headCenterY =
    playerHead.points.reduce((sum, point) => sum + point.y, 0) / playerHead.points.length;
  const torsoCenter = playerTorso.points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  );
  torsoCenter.x /= playerTorso.points.length;
  torsoCenter.y /= playerTorso.points.length;
  assert.ok(
    ringCenter.y > headCenterY + 24,
    'player hit feedback must stay at the body contact, never become a floating head marker',
  );
  assert.ok(
    Math.hypot(ringCenter.x - torsoCenter.x, ringCenter.y - torsoCenter.y) < 40,
    'player hit feedback must remain attached to the player torso contact zone',
  );
  assert.equal(
    playerHitFrame.items.some((item) => /player-(hit|invulnerable)-marker/.test(item.id)),
    false,
    'player hit feedback must not add a symbolic head/invulnerability marker',
  );
} finally {
  playerHitScene.exitTree();
}

const fixedMotionState = Object.freeze({
  id: 'slash',
  label: '베기',
  progress: 0.5,
  phase: 'active',
  sequence: 1,
  comboCycle: 1,
});
const fixedPosition = Object.freeze({ x: 300, y: 352 });
const fixedBoneInput = Object.freeze({
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
});
const fixedPose = samplePlayerMotionPose(
  Object.freeze({ motionState: fixedMotionState, boneInput: fixedBoneInput }),
);
const fixedCombatGeometry = samplePlayerCombatGeometry({
  position: fixedPosition,
  facing: 1,
  targetPose: fixedPose.targetPose,
  bonePose: fixedPose.bonePose,
  geometryScale: CHARACTER_RENDER_SCALE,
  weaponLengthScale: 1,
});
const fixedPresentationInput = Object.freeze({
  appearanceProfile: SCRAPYARD_APPRENTICE_FIXTURE,
  position: fixedPosition,
  facing: 1,
  targetPose: fixedPose.targetPose,
  bonePose: fixedPose.bonePose,
  combatGeometry: fixedCombatGeometry,
  renderScale: CHARACTER_RENDER_SCALE,
  renderOrder: 30.5,
  weaponLengthScale: 1,
  combatEvents: Object.freeze([]),
  enemyRenderOrder: 30.49,
});
const fixedOutput = createPlayerCombatPresentation(fixedPresentationInput);

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert.ok(Object.isFrozen(value), 'presentation output graph must be frozen');
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

assertDeepFrozen(fixedOutput);
const bladeItem = fixedOutput.characterItems.find((item) => item.id === 'sword-blade');
const shieldItem = fixedOutput.characterItems.find((item) => item.id === 'shield');
const torsoItem = fixedOutput.characterItems.find((item) => item.id === 'torso');
const headItem = fixedOutput.characterItems.find((item) => item.id === 'head');
const hiltItem = fixedOutput.characterItems.find((item) => item.id === 'sword-hilt');
const characterItemIds = new Set(fixedOutput.characterItems.map(({ id }) => id));
for (const forbiddenId of [
  'cape',
  'scarf-tail',
  'uniform-coat-tail',
  'uniform-front-panel',
  'helmet',
  'helmet-highlight',
  'shield-pauldron',
  'sword-pauldron',
]) {
  assert.ok(!characterItemIds.has(forbiddenId), `fantasy landmark must be absent: ${forbiddenId}`);
}
for (const scrapLandmarkId of [
  'tool-bag',
  'tool-bag-cable',
  'goggles-band',
  'goggles-lenses',
  'patched-chest-plate',
  'workwear-front-panel',
  'workwear-repair-patch',
  'workwear-rivet-0',
  'shield-sleeve-repair-bandage',
  'sword-sleeve-repair-bandage',
]) {
  assert.ok(
    characterItemIds.has(scrapLandmarkId),
    `scrap landmark must be present: ${scrapLandmarkId}`,
  );
}
assert.equal(torsoItem.fill, SCRAPYARD_APPRENTICE_FIXTURE.material, 'profile material color');
assert.equal(
  fixedOutput.characterItems.find(({ id }) => id === 'workwear-front-panel').fill,
  SCRAPYARD_APPRENTICE_FIXTURE.accent,
  'profile accent color',
);
assert.throws(
  () =>
    createPlayerCombatPresentation({
      ...fixedPresentationInput,
      appearanceProfile: { ...SCRAPYARD_APPRENTICE_FIXTURE },
    }),
  /immutable object/,
  'mutable appearance profile must be rejected',
);
assert.strictEqual(
  bladeItem.points,
  fixedOutput.combatGeometry.weapon.points,
  'rendered sword must reuse shared gameplay geometry exactly',
);
assert.strictEqual(
  shieldItem.points,
  fixedOutput.combatGeometry.shield.points,
  'rendered shield must reuse shared gameplay geometry exactly',
);
assert.strictEqual(
  torsoItem.points,
  fixedOutput.combatGeometry.hurt.find(({ part }) => part === 'torso').points,
  'rendered torso must reuse shared gameplay hurt geometry exactly',
);
assert.strictEqual(
  headItem.points,
  fixedOutput.combatGeometry.hurt.find(({ part }) => part === 'head').points,
  'rendered head must reuse shared gameplay hurt geometry exactly',
);
const torsoSurface = createProjectedTorsoSurface(fixedPose.bonePose.projectedJoints);
const expectedTorsoOutline = surfaceOutline(torsoSurface).map(({ x, y }) => ({
  x: fixedPosition.x + x * CHARACTER_RENDER_SCALE,
  y:
    fixedPosition.y +
    PLAYER_CHARACTER_FOOT_OFFSET +
    (y - PLAYER_CHARACTER_FOOT_OFFSET) * CHARACTER_RENDER_SCALE,
}));
assert.equal(torsoItem.points.length, expectedTorsoOutline.length);
assert.ok(
  torsoItem.points.every(
    (point, index) =>
      Math.hypot(point.x - expectedTorsoOutline[index].x, point.y - expectedTorsoOutline[index].y) <
      1e-7,
  ),
  'authored torso must use the projected shoulder/hip section surface and shared foot pivot',
);
assert.ok(
  torsoItem.points.length > 4,
  'torso silhouette must include authored section widths instead of a four-corner stick',
);
function pointSegmentDistance(point, start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const amount =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared,
          ),
        );
  return Math.hypot(point.x - (start.x + deltaX * amount), point.y - (start.y + deltaY * amount));
}
const bladeRoot = bladeItem.points[0];
const hiltBladeGap = Math.min(
  ...hiltItem.points.map((point, index) =>
    pointSegmentDistance(bladeRoot, point, hiltItem.points[(index + 1) % hiltItem.points.length]),
  ),
);
assert.ok(
  hiltBladeGap < 1e-7,
  `rendered sword hilt edge and shared blade root must stay connected: ${hiltBladeGap}`,
);

// Inspect the rendered cutout too: a geometry-only probe cannot catch a bag or boot
// left behind by a rotating joint. Transparent trail buffers are not visible surfaces.
for (let sample = 0; sample <= 100; sample += 1) {
  const progress = sample / 100;
  const motion = samplePlayerMotionPose({
    motionState: { id: 'idle', progress: 0 },
    boneInput: { rollProgress: progress },
  });
  for (const facing of [-1, 1]) {
    const input = { ...fixedPresentationInput, facing, ...motion };
    const combatGeometry = samplePlayerCombatGeometry({
      ...input,
      geometryScale: CHARACTER_RENDER_SCALE,
    });
    const output = createPlayerCombatPresentation({ ...input, combatGeometry });
    for (const [itemId, shared] of [
      ['sword-blade', combatGeometry.weapon],
      ['shield', combatGeometry.shield],
    ]) {
      assert.strictEqual(
        output.characterItems.find(({ id }) => id === itemId).points,
        shared.points,
        itemId + ' must reuse rotated shared geometry throughout roll',
      );
    }
    for (const item of output.characterItems.filter(({ opacity }) => opacity > 0)) {
      assert.ok(
        item.points.every(({ y }) => y <= fixedPosition.y + PLAYER_CHARACTER_FOOT_OFFSET + 4),
        item.id + ' penetrates floor at roll ' + progress + ', facing ' + facing,
      );
    }
  }
}

const [gameSceneSource, presentationSource] = await Promise.all([
  readFile(new URL('../src/game/GameScene.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/PlayerCombatPresentation.js', import.meta.url), 'utf8'),
]);
assert.doesNotMatch(
  gameSceneSource,
  /CombatPoseLibrary|CharacterBonePoseLibrary|TwoBoneIKSolver|samplePlayerPresentationPose/,
  'GameScene must not import or own pose/IK projection',
);
assert.doesNotMatch(
  gameSceneSource,
  /equipmentProfile\.presentation/,
  'gameplay contact must read neutral equipment geometry rather than presentation policy',
);
assert.doesNotMatch(
  gameSceneSource,
  /function create(CharacterItems|BlockImpactItems|RetaliationAuraItems|HitFeedbackItems|EvadeFeedbackItems|PunishFeedbackItems)|CHARACTER_DEPTH_ITEM_ORDERS|scaleHexColor|depthGroup/,
  'GameScene must not own character/effect/depth/style projection',
);
assert.doesNotMatch(
  presentationSource,
  /\b(window|document|navigator|HTMLElement|SceneNode|GameScene|CombatCommandController|MapRuntime|CombatEventBuffer)\b/,
  'plain presentation owner must not know browser, scene graph, or mutable gameplay owners',
);
assert.doesNotMatch(
  presentationSource,
  /CharacterPresentationProfiles|CHARACTER_PRESENTATION_PROFILE|scrapyard-apprentice/,
  'plain presentation owner must receive appearance profiles rather than importing concrete catalog data',
);

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'player-combat-presentation',
    poseScenarios: Object.keys(POSE_PARITY),
    effectScenarios: Object.keys(EFFECT_PARITY),
    invariants: [
      'fixed-public-item-parity',
      'deep-frozen-output',
      'shared-sword-shield-torso-head-geometry-identity',
      'authored-skeleton-torso-anchor-projection',
      'shared-body-foot-pivot-and-connected-sword',
      'dense-roll-rendered-equipment-parity-and-visible-floor-clearance',
      'player-hit-contact-not-head-marker',
      'immutable-injected-profile-validation',
      'scrap-workwear-landmark-ids-and-profile-colors',
      'fantasy-landmark-removal',
      'plain-owner-boundary',
    ],
  }),
);
