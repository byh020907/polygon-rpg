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
  closestCombatContact,
  PLAYER_CHARACTER_FOOT_OFFSET,
} from '../src/combat/SharedCombatGeometry.js';
import {
  CHARACTER_RENDER_SCALE,
  createPlayerCombatPresentation,
} from '../src/game/PlayerCombatPresentation.js';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
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
    count: 26,
    digest: '131d4454a536116eb1497c530aa347872a718de1d418e20e17320d63cfd3ffe5',
  }),
  'pose-move': Object.freeze({
    count: 26,
    digest: '8508c15143879e3589849477a8dc58dd696de5cbf607846cd8d4662098178081',
  }),
  'pose-guard': Object.freeze({
    count: 26,
    digest: 'bdb03fa99e8b7fb5ec89d744d369e3e6b162a4cd40bddda8de707db452a9ead1',
  }),
  'pose-roll': Object.freeze({
    count: 26,
    digest: '524fbebb2b8c7a864df4a13bd07a1622626f9453ea447669fff1cbc188aa03d9',
  }),
  'pose-ground-attack': Object.freeze({
    count: 26,
    digest: '0e15c78eea7920e939adcd2be88dd4f368b2d0afbb9b061c337542068e9b9eb6',
  }),
  'pose-air-attack': Object.freeze({
    count: 26,
    digest: '5cb51d99070db0c89b8176dcb6a34a11a9558d4c04ed7ece178dc14098d4ce1e',
  }),
  'pose-hit': Object.freeze({
    count: 26,
    digest: '01a0eb0c248d684e6ee1b3615c599b9a39a7730403e06dacf4e9eee734a02948',
  }),
});

const EFFECT_PARITY = Object.freeze({
  'combat-hit': Object.freeze({
    count: 33,
    digest: '0d5c702f394c9333f287e277033b419f0303ff5f08014c9a9f7f5d6fedd9140c',
  }),
  'combat-player-hit': Object.freeze({
    count: 33,
    digest: '9bfbdc168b3d7cf990627e9411eee73cc32a1778cddc501d2175829e61b7dc11',
  }),
  'combat-block': Object.freeze({
    count: 32,
    digest: 'eb56c05c925812d69eb173072317ad6b33f60d4eaa87621bb6a1b9074608f2f4',
  }),
  'combat-evade': Object.freeze({
    count: 29,
    digest: '3014ff993543adf8dc68156708d62b193192ddb1d8d68067a239bffa5930b1a9',
  }),
  'combat-punish': Object.freeze({
    count: 32,
    digest: '3d7a66c740a6c80972c27b71a7a718ee5ebe7fce7032c9e6e32ab699924a97d7',
  }),
  'combat-launch': Object.freeze({
    count: 33,
    digest: 'a1dab4101109812536697163f06276e5124c7f2700678fd2a613f389c4f90e41',
  }),
  'combat-guard-break': Object.freeze({
    count: 32,
    digest: '26fef069b154b5e64e97c795eda823786801ad490607f5bdd9747c29bee80dd3',
  }),
  'combat-just-guard': Object.freeze({
    count: 37,
    digest: '48db669f735009d2ca4f27dcebfd5b49e132ee4c520de98937635f9afe3bc7fe',
  }),
  'combat-guard-counter': Object.freeze({
    count: 33,
    digest: 'be15009264a70042f03127b1eeb8f73cf8fb9c952cd2f3782490f9070ccf31b4',
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
  const scene = createTestGameScene({ mapDefinition: SCRAP_AWAKENING_MAP });
  scene.enterTree();
  try {
    scene.setVisualQaScrapAwakeningStage('yard-clearance');
    scene.setVisualQaLocation({
      regionId: 'scrap-waste-edge',
      roomId: 'abandoned-weapon-yard',
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

const playerHitScene = createTestGameScene({ mapDefinition: SCRAP_AWAKENING_MAP });
playerHitScene.enterTree();
try {
  playerHitScene.setVisualQaScrapAwakeningStage('yard-clearance');
  playerHitScene.setVisualQaLocation({
    regionId: 'scrap-waste-edge',
    roomId: 'abandoned-weapon-yard',
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
  'workwear-back-panel',
  'work-collar',
  'cross-body-strap',
  'work-belt',
  'sword-glove',
  'shield-glove',
]) {
  assert.ok(
    characterItemIds.has(scrapLandmarkId),
    `scrap landmark must be present: ${scrapLandmarkId}`,
  );
}
assert.equal(torsoItem.fill, SCRAPYARD_APPRENTICE_FIXTURE.material, 'profile material color');
assert.equal(
  fixedOutput.characterItems.find(({ id }) => id === 'work-collar').fill,
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
const hiltContact = closestCombatContact(
  [{ part: 'hilt', points: hiltItem.points }],
  [{ part: 'blade', points: bladeItem.points }],
);
assert.equal(
  hiltContact.contact,
  true,
  'redesigned sword guard must touch or overlap the shared blade root without a gap',
);
assert.equal(hiltContact.gap, 0);

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
      'slim-workwear-landmark-ids-and-profile-colors',
      'fantasy-landmark-removal',
      'plain-owner-boundary',
    ],
  }),
);
