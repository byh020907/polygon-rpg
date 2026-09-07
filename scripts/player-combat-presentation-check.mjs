import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { samplePlayerMotionPose } from '../src/animation/PlayerMotionPose.js';
import { samplePlayerCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
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
    digest: '980abdb327497f5f2b6bbe4c53faf718a5517570c25b540b9cb591234d7f4aed',
  }),
  'pose-move': Object.freeze({
    count: 37,
    digest: 'a1ed173b9c57ffca91b432663c22e553d544b96f194830d7ebb1d3acfc7cfa20',
  }),
  'pose-guard': Object.freeze({
    count: 37,
    digest: 'a8ec6b82dafd019d4866cef990277c2ff7610389cef365c77646bf2ddbdcbd18',
  }),
  'pose-roll': Object.freeze({
    count: 37,
    digest: 'c35b3a100be31be2cd93c813e53ab68e673555e580e33937cd2c7585a156e909',
  }),
  'pose-ground-attack': Object.freeze({
    count: 37,
    digest: '0bb23b1f6ad2e99652fa1887f876130802bf380ed24950efa43c26d6ab968bbb',
  }),
  'pose-air-attack': Object.freeze({
    count: 37,
    digest: '7296f98aea43cdb41f4834ffbd3ec250b1d5fcfe822b5066c8ef6e8af19ab4e1',
  }),
  'pose-hit': Object.freeze({
    count: 37,
    digest: '2f4096ee29f7c11856bf8318631442fe2b184b03acdc5116399d90fcbf697cf1',
  }),
});

const EFFECT_PARITY = Object.freeze({
  'combat-hit': Object.freeze({
    count: 44,
    digest: '994aceb01c2e66adc0faf83a667ac24601945d66838b03b2c54d45bfe43d18c0',
  }),
  'combat-player-hit': Object.freeze({
    count: 44,
    digest: '99cc48424d96777d48bb1c5ee6485420e420aec91bdbf307d9400c297116e03b',
  }),
  'combat-block': Object.freeze({
    count: 43,
    digest: 'ea8f0a0d3581b15bf9f6f9fa9d08bfe0142886dc27bf249f26e80119da630bcc',
  }),
  'combat-evade': Object.freeze({
    count: 40,
    digest: '8ea33fa08b5406c6a9e458d7cc41012769719f9bd39fc62b7f0aa0b794bf882c',
  }),
  'combat-punish': Object.freeze({
    count: 43,
    digest: 'e927ac4ad1321cf6e5d6b469f525ae70e6e5e11825495b7dc27405694f45ad8b',
  }),
  'combat-launch': Object.freeze({
    count: 44,
    digest: '2685a959d76d62fb9b6d545049956fa5c2b3bd04630f0a5ada13133312fba190',
  }),
  'combat-guard-break': Object.freeze({
    count: 43,
    digest: 'c771bb481c813c72b4089d4ff2561348eeb7ba126894d1dec3d936f41c3a8514',
  }),
  'combat-just-guard': Object.freeze({
    count: 48,
    digest: '6d2c87b963ed2e150b92d39cb4853fa01fb2b5e1e1a50bcb5b956f17b1b0be00',
  }),
  'combat-guard-counter': Object.freeze({
    count: 44,
    digest: '7f72cf75ae2425663851e10e7aa35a9ad007c36bf2642af5a40591f9abf3b2de',
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
assert.equal(
  torsoItem.points.length,
  4,
  'an authored 3D pose must build the torso from projected shoulder and hip anchors, not a static hex',
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
      'player-hit-contact-not-head-marker',
      'immutable-injected-profile-validation',
      'scrap-workwear-landmark-ids-and-profile-colors',
      'fantasy-landmark-removal',
      'plain-owner-boundary',
    ],
  }),
);
