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
    digest: '49c619bb528e40c2807db732e57288b250bbce0f88e04fd79f707d5feee454b3',
  }),
  'pose-move': Object.freeze({
    count: 33,
    digest: '05b44d7b668be3a70a30eb3ee6530ed9caedbd527a92666b926606ebd2df916b',
  }),
  'pose-guard': Object.freeze({
    count: 33,
    digest: '009fff69735a43c71684dadd35107be332c2c01b106f1e56d35ec9ba8cf2427c',
  }),
  'pose-roll': Object.freeze({
    count: 33,
    digest: 'e466c0ec1eb4097621ec68c55a6d84c6931b0fadcf513acd5a465af7a1f1944b',
  }),
  'pose-ground-attack': Object.freeze({
    count: 33,
    digest: 'b02869f80b53531b714098974c0fb65a8c7fbf2d6293703f97874cf404ac847d',
  }),
  'pose-air-attack': Object.freeze({
    count: 33,
    digest: '7f11ef31d5bb042b93dd17795338fd0661f1874b4d2c94489cb695e3ebf4d9da',
  }),
  'pose-hit': Object.freeze({
    count: 33,
    digest: '7082bd6fe6c2cfdb6abfa9965aa5679d7a6e0a3ce03b4b3d41eb9fa729628242',
  }),
});

const EFFECT_PARITY = Object.freeze({
  'combat-hit': Object.freeze({
    count: 40,
    digest: 'c6ae161ddb7b3b7bd22aaf84f4ec068cc00f0cea724734778fec4665a80bab8c',
  }),
  'combat-block': Object.freeze({
    count: 39,
    digest: 'dec097728ea43f2ff2e4c5116578e273751f4bfc0429cf8c4601d667f32b4738',
  }),
  'combat-evade': Object.freeze({
    count: 36,
    digest: '725241350b843fc30acde9a58af7a8753a96274e722b56c1ecfffb8badb5c8e7',
  }),
  'combat-punish': Object.freeze({
    count: 39,
    digest: 'bd7c491e0c3ebe4d07a567556ea6e421970d5d282e0ee5f4a5a9a9ee964ed0f9',
  }),
  'combat-launch': Object.freeze({
    count: 40,
    digest: '87246561c07cc2db89a91eac750349e2798575de2fdc31c3d271a99108a266f3',
  }),
  'combat-guard-break': Object.freeze({
    count: 39,
    digest: '6d2127bfd24bdfe7b1ff52322d79c997b7167144788c1c20185e154cbeace127',
  }),
  'combat-just-guard': Object.freeze({
    count: 44,
    digest: '9e47525e4c34af894213cdad0a0cca40d4049e1866a090a274d3a1a3cd41139d',
  }),
  'combat-guard-counter': Object.freeze({
    count: 40,
    digest: '345a27007d0dd2d8a6737c5bfc727a1626c5e89bb538cd787ae94042585bd0c1',
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
