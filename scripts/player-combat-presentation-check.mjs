import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { samplePlayerCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
import {
  CHARACTER_RENDER_SCALE,
  createPlayerCombatPresentation,
  samplePlayerPresentationPose,
} from '../src/game/PlayerCombatPresentation.js';
import { GameScene } from '../src/game/GameScene.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';

const POSE_PARITY = Object.freeze({
  'pose-idle': Object.freeze({
    count: 33,
    digest: '6898bedbc28b40df57c10f30ee89c14fd9719670a02af9f420a5d84918233158',
  }),
  'pose-move': Object.freeze({
    count: 33,
    digest: '6df71cedeb7702680c4f135368a25250f58ea1b6ed8256b0769e495d040fb3b6',
  }),
  'pose-guard': Object.freeze({
    count: 33,
    digest: '97f2a16cb66c16190b70edabacc340713e5b37eb6d61e2e5e5de7a0b03adc319',
  }),
  'pose-roll': Object.freeze({
    count: 33,
    digest: 'e69d5af5df838dfa03687ec87b29813e0ecffa4f209f484dc39bc3362b39398d',
  }),
  'pose-ground-attack': Object.freeze({
    count: 33,
    digest: 'd8a68cec5cb96230e36daa36117ff6d7f39ce1cf0883fa5834f68f8f8cd2cd05',
  }),
  'pose-air-attack': Object.freeze({
    count: 33,
    digest: '4aea524ff809585f86fd23cdacabb537c546ef2acf7083d9b390f5f68c99ae9b',
  }),
  'pose-hit': Object.freeze({
    count: 33,
    digest: 'cf339adc9bdf585dbe57f2d8cd531ad603e4aadc31c43b67a0b2e5f997250578',
  }),
});

const EFFECT_PARITY = Object.freeze({
  'combat-hit': Object.freeze({
    count: 40,
    digest: '5c5caa293a8d8b2ae58a4b19f886361adebb6b0161586fd22dad2eb3523b3c2e',
  }),
  'combat-block': Object.freeze({
    count: 39,
    digest: '1a73c0a8d3c675f43b0025f7d8869cdad666bd25b4934a702b8a2e223f9af4a2',
  }),
  'combat-evade': Object.freeze({
    count: 36,
    digest: '1b0485fd5d5c985a261ef902bb51c19dcd953bbd257e00a769fc2b1b9580d94d',
  }),
  'combat-punish': Object.freeze({
    count: 39,
    digest: '166f4e4eca5ce4ec5a878c0839864cc6557aa893c35c30a8f173f75352a7b442',
  }),
  'combat-launch': Object.freeze({
    count: 40,
    digest: '1b91547c0773cdc014f0dcad880baa8e2919ef9a10c0d1ac987d6c5aecab5f9f',
  }),
  'combat-guard-break': Object.freeze({
    count: 39,
    digest: '7663d447fd79b8d5b0bcddaaa14298311d562e11b1da8887688301d1da568968',
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
      /^(player-(block|retaliation|hit|evade)|combat-enemy-hit|enemy-punish)/.test(item.id),
  );
}

function digestItems(items) {
  return createHash('sha256')
    .update(JSON.stringify(items.map(normalizeItem)))
    .digest('hex');
}

function assertPublicParity(scenarioId, expected, setScenario) {
  const scene = new GameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
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
const fixedPose = samplePlayerPresentationPose(
  Object.freeze({ motionState: fixedMotionState, boneInput: fixedBoneInput }),
);
const fixedCombatGeometry = samplePlayerCombatGeometry({
  position: fixedPosition,
  facing: 1,
  targetPose: fixedPose.targetPose,
  bonePose: fixedPose.bonePose,
  renderScale: CHARACTER_RENDER_SCALE,
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

const [gameSceneSource, presentationSource] = await Promise.all([
  readFile(new URL('../src/game/GameScene.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/PlayerCombatPresentation.js', import.meta.url), 'utf8'),
]);
assert.doesNotMatch(
  gameSceneSource,
  /CombatPoseLibrary|CharacterBonePoseLibrary|TwoBoneIKSolver/,
  'GameScene must not import or own pose/IK projection',
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
      'plain-owner-boundary',
    ],
  }),
);
