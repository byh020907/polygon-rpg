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

const POSE_PARITY = Object.freeze({
  'pose-idle': Object.freeze({
    count: 33,
    digest: 'ad9ce126dd64156238c9aa116391bf3c567dc496aecc81573f5117a8df1a7ea0',
  }),
  'pose-move': Object.freeze({
    count: 33,
    digest: '8757620a73ac13a52b690f2df3208a6afee98290000b8a22357496176552f4ea',
  }),
  'pose-guard': Object.freeze({
    count: 33,
    digest: '022d222d7a5bae37775ae918de9f08243a4bc7ba29339d487c8ccd1906b1bc06',
  }),
  'pose-roll': Object.freeze({
    count: 33,
    digest: 'ef7dc928718b0c96a11c1628a5f0728fd4fce7abc91d040c6205c90417dccda5',
  }),
  'pose-ground-attack': Object.freeze({
    count: 33,
    digest: '38c2efbb480deab4cf4e90606fa8c2d2af3738b93798c3d52694dd7c36944004',
  }),
  'pose-air-attack': Object.freeze({
    count: 33,
    digest: '5fd5ce665ea81d443e7a12ab5bb2d5bfd1a20b42bfa777ecf5b329f4274698ca',
  }),
  'pose-hit': Object.freeze({
    count: 33,
    digest: '6420077414e7f98e49763dc5be45e0da4417638b01ea164499cd32e1a3096ebc',
  }),
});

const EFFECT_PARITY = Object.freeze({
  'combat-hit': Object.freeze({
    count: 40,
    digest: '52e1581b9ea3447ae6edf26eba60775e5360c54bc4ed572f5371e4795ca46d39',
  }),
  'combat-block': Object.freeze({
    count: 39,
    digest: '96dbab1cbd194a2d43595662b19e36ff53e9f0bc9ed87161925e920754cc84ed',
  }),
  'combat-evade': Object.freeze({
    count: 36,
    digest: '38738765278faa464cbfc56ff6b23c8ac85fdc605e667022c23a13d3afa769ec',
  }),
  'combat-punish': Object.freeze({
    count: 39,
    digest: '9a781f919bc7cd87d87c488a84ba75cda9081833397e781b7af23e63716273a6',
  }),
  'combat-launch': Object.freeze({
    count: 40,
    digest: '2657cd36e1789aa95bb2a458566ee1a329163341f0bc891b9fae375f91a46d72',
  }),
  'combat-guard-break': Object.freeze({
    count: 39,
    digest: 'a26321ee35034ecad95f1a3b1f0212e8ba0b443e56172a44546e295bbeb4804c',
  }),
  'combat-just-guard': Object.freeze({
    count: 44,
    digest: '297f783916df14edbb4d2ccd4b998306bd074b9d7fbc6ec6faf6d55e14aaf243',
  }),
  'combat-guard-counter': Object.freeze({
    count: 40,
    digest: '757d99dd6e0be9346b45ca00909f89db2bfba265ce6ab04c0107ed8b247e3669',
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
const fixedOutput = createPlayerCombatPresentation(
  Object.freeze({
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
  }),
);

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
const hiltItem = fixedOutput.characterItems.find((item) => item.id === 'sword-hilt');
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
assert.deepEqual(
  torsoItem.points,
  fixedOutput.combatGeometry.hurt.find(({ part }) => part === 'torso').points,
  'rendered torso and gameplay hurt polygon must share the same posed foot pivot',
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

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'player-combat-presentation',
    poseScenarios: Object.keys(POSE_PARITY),
    effectScenarios: Object.keys(EFFECT_PARITY),
    invariants: [
      'fixed-public-item-parity',
      'deep-frozen-output',
      'shared-sword-shield-geometry-identity',
      'shared-body-foot-pivot-and-connected-sword',
      'plain-owner-boundary',
    ],
  }),
);
