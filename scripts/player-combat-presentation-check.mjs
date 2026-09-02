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
    digest: 'e809b93113bd428394a17ca5f4330f313565715a83d3bd1de382397dd85c680f',
  }),
  'pose-move': Object.freeze({
    count: 37,
    digest: 'a304808db2a15633b8ad1d08b779e3e7cb08d98b3a3c70f96362ff5790036d7c',
  }),
  'pose-guard': Object.freeze({
    count: 37,
    digest: '013b5277c4ec49b62ccf6cfdf3932cd2117cd177176be4fb9f071e9c43ddb02b',
  }),
  'pose-roll': Object.freeze({
    count: 37,
    digest: '1a52f60e97465e7c0ac2a60f448f6274cfedc69cc3cd0bb729a9e750d438efda',
  }),
  'pose-ground-attack': Object.freeze({
    count: 37,
    digest: '37538f055c7803916df0beb84f72ea5c785ab20dc98125ce397608395e7e84b8',
  }),
  'pose-air-attack': Object.freeze({
    count: 37,
    digest: '4ae9e742e6baabab2bcd4b90312d76faa993e3b529912da89811a3a67e81a093',
  }),
  'pose-hit': Object.freeze({
    count: 37,
    digest: 'd5ba01de87f6e709de305a06e9fb84eea5cbb75acff0b10c32a877014b4c4113',
  }),
});

const EFFECT_PARITY = Object.freeze({
  'combat-hit': Object.freeze({
    count: 44,
    digest: 'f9e7ee6ddadc97be7b5288c74ddb6b658d8a2f621deac338a3dd5a91d8e4e612',
  }),
  'combat-block': Object.freeze({
    count: 43,
    digest: 'cf5474a74c06c8837a25b31fed4d54bbf8bae86e184f28fd666e4f933649fbcd',
  }),
  'combat-evade': Object.freeze({
    count: 40,
    digest: '683bf1b845ebc76916e21f5b4d27217e4d615457daf7fa17bd01174df8fab837',
  }),
  'combat-punish': Object.freeze({
    count: 43,
    digest: 'd183cf42bc969726b93d86f9c67321352d435d3776d55f40551ae0e58ba4bf2c',
  }),
  'combat-launch': Object.freeze({
    count: 44,
    digest: 'b5526ca55356b5bc324adc68cb6cd8ae0fa770a3d6418eda4bada391ca488818',
  }),
  'combat-guard-break': Object.freeze({
    count: 43,
    digest: 'bc4ed9e7298e91fb8b6729876f725373b612ca6516caccc30dd5cd24a2a25568',
  }),
  'combat-just-guard': Object.freeze({
    count: 48,
    digest: '0916760a4f605751fbbe1ec7f0496fd56fbc925744ef85f5a3ef0e4c637e8ab8',
  }),
  'combat-guard-counter': Object.freeze({
    count: 44,
    digest: 'f0c251d53bea3fffb4eb6d69a3d6ca205fadaf14e5d53c42ac4d7bb6b812571b',
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
      'shared-body-foot-pivot-and-connected-sword',
      'immutable-injected-profile-validation',
      'scrap-workwear-landmark-ids-and-profile-colors',
      'fantasy-landmark-removal',
      'plain-owner-boundary',
    ],
  }),
);
