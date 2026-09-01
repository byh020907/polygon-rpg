import assert from 'node:assert/strict';

import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { sampleTrainingEnemyCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { resolveSwordEnchantment } from '../src/game/enchantment/EnchantmentPolicy.js';
import {
  ENCHANTMENT_MATERIAL_COSTS,
  ENCHANTMENT_MAX_LEVEL,
  ENCHANTMENT_TRANSACTION_REASON,
  awardEnchantMaterial,
  createEnchantmentSnapshot,
} from '../src/game/enchantment/EnchantmentState.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import {
  PROGRESSION_SCHEMA_VERSION,
  createProgressionSnapshot,
  getAvailableGold,
  mergeProgressionSnapshot,
  purchaseEquipment,
  selectEquipment,
  upgradeSwordEnchantment,
} from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import { TrainingEncounterNode } from '../src/game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const STEP = 1 / 120;
const DEFAULT_SWORD_ID = 'balanced-sword';
const OTHER_SWORD_ID = 'heavy-sword';
let contactSequence = 0;

function createEncounter({
  profileId = 'training',
  enchantId = null,
  enchantLevel = enchantId ? ENCHANTMENT_MAX_LEVEL : 0,
  swordId = DEFAULT_SWORD_ID,
  affinity = 'neutral',
  maxHealth = 500,
  guardOutsidePunish,
} = {}) {
  const baseProfile = ENCOUNTER_PROFILES[profileId];
  const encounterProfiles = Object.freeze({
    ...ENCOUNTER_PROFILES,
    [profileId]: Object.freeze({
      ...baseProfile,
      ...(guardOutsidePunish === undefined ? {} : { guardOutsidePunish }),
      enchantAffinity: Object.freeze({
        ...baseProfile.enchantAffinity,
        ...(enchantId ? { [enchantId]: affinity } : {}),
      }),
    }),
  });
  const active = enchantId
    ? Object.freeze({ ...ENCHANTMENT_CATALOG.getProfile(enchantId), swordId, level: enchantLevel })
    : null;
  return new TrainingEncounterNode({
    entity: {
      id: `${profileId}-${enchantId ?? 'none'}-${affinity}-${enchantLevel}`,
      kind: 'combat-test-mob',
      encounterProfileId: profileId,
      position: { x: 650, y: 420 },
      maxHealth,
    },
    groundY: 420,
    movementBounds: { minX: 0, maxX: 960 },
    spinContact: { hitPulses: [0.3, 0.5, 0.7], contactSpacings: [23, 17, 5] },
    encounterProfiles,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
    enchantmentContext: { swordId, level: enchantLevel, active },
  });
}

function playerFrame() {
  return Object.freeze({
    position: Object.freeze({ x: 600, y: 338 }),
    facing: 1,
    isGrounded: true,
    health: 100,
    hitstunSeconds: 0,
    blockstunSeconds: 0,
    invulnerableSeconds: 0,
    rollProgress: null,
    rollDirection: null,
    airComboFacing: 0,
  });
}

function contactFrame(encounter, kind = 'basic') {
  contactSequence += 1;
  const shield = kind === 'shield';
  const strong = kind === 'strong';
  const geometry = sampleTrainingEnemyCombatGeometry(
    encounter.enemy,
    TRAINING_ENEMY_ATTACK_PROFILES,
  );
  const contactPart = Object.freeze({
    part: shield ? 'shield' : 'weapon',
    points: geometry.hurt[0].points,
  });
  return Object.freeze({
    combatState: Object.freeze({
      id: shield ? 'shieldBash' : strong ? 'heavy' : 'slash',
      phase: 'active',
      progress: 0.5,
      sequence: contactSequence,
      comboCycle: contactSequence,
      queuedMotion: null,
    }),
    attackProfile: Object.freeze({
      start: 0.3,
      end: 0.7,
      range: 80,
      damage: shield ? 16 : strong ? 22 : 12,
      launchY: -90,
      guardBreak: strong,
      ...(shield ? { contactPart: 'shield' } : {}),
    }),
    playerGeometry: Object.freeze({
      weapon: contactPart,
      sweep: contactPart,
      shield: contactPart,
    }),
    player: playerFrame(),
  });
}

function idleFrame(playerX = 800) {
  return Object.freeze({
    combatState: Object.freeze({
      id: 'idle',
      phase: 'idle',
      progress: 0,
      sequence: 0,
      comboCycle: 0,
      queuedMotion: null,
    }),
    attackProfile: null,
    playerGeometry: null,
    player: Object.freeze({ ...playerFrame(), position: Object.freeze({ x: playerX, y: 338 }) }),
  });
}

function resolveContact(encounter, kind = 'basic') {
  let playerResult = null;
  let combatEvent = null;
  encounter.playerResultResolved.connect((result) => {
    playerResult = result;
  });
  encounter.combatEventOccurred.connect((event) => {
    combatEvent = event;
  });
  encounter.enterTree();
  const healthBefore = encounter.enemy.health;
  const postureBefore = encounter.enemy.posture?.current ?? null;
  assert.equal(encounter.resolvePlayerAttack(contactFrame(encounter, kind)), true);
  encounter.step(STEP, idleFrame());
  return Object.freeze({
    damage: healthBefore - encounter.enemy.health,
    postureDamage: postureBefore === null ? null : postureBefore - encounter.enemy.posture.current,
    playerResult,
    combatEvent,
    status: encounter.enemy.enchantStatus ? { ...encounter.enemy.enchantStatus } : null,
  });
}

function verifyPolicyAndActualMatrix() {
  for (const profile of ENCHANTMENT_CATALOG.profiles) {
    const pureByAffinity = {};
    const actualByAffinity = {};
    for (const affinity of ['weak', 'neutral', 'resistant']) {
      const basic = resolveSwordEnchantment({
        enchantId: profile.id,
        enchantLevel: 5,
        affinity,
        attackKind: 'basic',
        baseDamage: 100,
        weaponBaseAttack: 100,
      });
      const strong = resolveSwordEnchantment({
        enchantId: profile.id,
        enchantLevel: 5,
        affinity,
        attackKind: 'strong',
        baseDamage: 100,
        weaponBaseAttack: 100,
      });
      assert.ok(basic.damage >= 1 && strong.damage >= 1);
      assert.ok(strong.buildup > basic.buildup);
      pureByAffinity[affinity] = basic.additionalDamage;

      const basicEncounter = createEncounter({ enchantId: profile.id, enchantLevel: 5, affinity });
      const basicActual = resolveContact(basicEncounter, 'basic');
      assert.equal(basicActual.playerResult.damagingHit.enchantment.id, profile.id);
      assert.equal(basicActual.playerResult.damagingHit.enchantment.level, 5);
      assert.equal(basicActual.playerResult.damagingHit.enchantment.swordId, DEFAULT_SWORD_ID);
      assert.equal(basicActual.combatEvent.payload.enchantment.color, profile.color);
      assert.equal(basicActual.status.buildup, basic.buildup);
      basicEncounter.exitTree();

      const strongEncounter = createEncounter({ enchantId: profile.id, enchantLevel: 5, affinity });
      const strongActual = resolveContact(strongEncounter, 'strong');
      assert.equal(strongActual.status.buildup, strong.buildup);
      strongEncounter.exitTree();
      actualByAffinity[affinity] = basicActual.damage;
    }
    assert.ok(pureByAffinity.weak > pureByAffinity.neutral);
    assert.ok(pureByAffinity.neutral > pureByAffinity.resistant);
    assert.ok(actualByAffinity.weak > actualByAffinity.neutral);
    assert.ok(actualByAffinity.neutral > actualByAffinity.resistant);

    const levelOne = resolveSwordEnchantment({
      enchantId: profile.id,
      enchantLevel: 1,
      affinity: 'neutral',
      attackKind: 'basic',
      baseDamage: 100,
      weaponBaseAttack: 100,
    });
    const levelFive = resolveSwordEnchantment({
      enchantId: profile.id,
      enchantLevel: 5,
      affinity: 'neutral',
      attackKind: 'basic',
      baseDamage: 100,
      weaponBaseAttack: 100,
    });
    assert.equal(levelOne.additionalDamage, 30);
    assert.equal(levelFive.additionalDamage, 150);
    assert.equal(levelFive.additionalDamage, levelOne.additionalDamage * 5);
    assert.equal(levelFive.damage, 250);
  }

  assert.equal(
    resolveSwordEnchantment({
      enchantId: null,
      enchantLevel: 0,
      affinity: 'neutral',
      attackKind: 'basic',
      baseDamage: 0,
    }),
    null,
  );
}

function verifyActualEffectsAndShieldExclusion() {
  const fireEncounter = createEncounter({ enchantId: 'fire', enchantLevel: 5 });
  fireEncounter.enterTree();
  fireEncounter.resolvePlayerAttack(contactFrame(fireEncounter, 'strong'));
  fireEncounter.resolvePlayerAttack(contactFrame(fireEncounter, 'strong'));
  assert.equal(fireEncounter.enemy.enchantStatus.suppressesRegeneration, true);
  assert.equal(fireEncounter.enemy.enchantStatus.suppressesPlantDefense, true);
  fireEncounter.exitTree();

  const lightningEncounter = createEncounter({ enchantId: 'lightning', enchantLevel: 5 });
  lightningEncounter.enemy.aiState = 'windup';
  lightningEncounter.enemy.attackKind = 'heavy';
  lightningEncounter.enemy.enchantStatus = {
    id: 'lightning',
    buildup: 80,
    remainingSeconds: 0,
  };
  const lightning = resolveContact(lightningEncounter, 'basic');
  assert.equal(lightningEncounter.enemy.lastCommandTransition.kind, 'enchant-interrupt');
  assert.equal(lightning.playerResult.damagingHit.enchantment.id, 'lightning');
  lightningEncounter.exitTree();

  const iceEncounter = createEncounter({ enchantId: 'ice', enchantLevel: 5 });
  iceEncounter.enemy.enchantStatus = { id: 'ice', buildup: 0, remainingSeconds: 2.4 };
  iceEncounter.enemy.aiState = 'recovery';
  iceEncounter.enemy.aiSeconds = 10;
  iceEncounter.updateEnemyCombat(STEP, idleFrame());
  assert.ok(Math.abs(iceEncounter.enemy.aiSeconds - (10 - STEP * 0.7)) < 1e-9);

  const guardedStrong = createEncounter({
    profileId: 'boss',
    enchantId: 'earth',
    enchantLevel: 5,
  });
  guardedStrong.enemy.aiState = 'guard';
  assert.equal(resolveContact(guardedStrong, 'strong').postureDamage, 48 + 34);
  guardedStrong.exitTree();

  const guardedLevelOne = createEncounter({
    profileId: 'boss',
    enchantId: 'earth',
    enchantLevel: 1,
  });
  guardedLevelOne.enemy.aiState = 'guard';
  assert.equal(resolveContact(guardedLevelOne, 'basic').postureDamage, Math.round(18 / 5));
  guardedLevelOne.exitTree();

  const shieldPlain = createEncounter();
  const plainResult = resolveContact(shieldPlain, 'shield');
  shieldPlain.exitTree();
  const shieldFire = createEncounter({ enchantId: 'fire', enchantLevel: 5 });
  const fireResult = resolveContact(shieldFire, 'shield');
  assert.equal(fireResult.damage, plainResult.damage);
  assert.equal(fireResult.playerResult.damagingHit.enchantment, null);
  assert.equal(fireResult.combatEvent.payload.enchantment, null);
  assert.equal(fireResult.status, null);
  shieldFire.exitTree();
}

function progressionWithResources({ materialId, quantity, gold }) {
  const fresh = createProgressionSnapshot(DEFAULT_SWORD_ID, ENCHANTMENT_CATALOG);
  return mergeProgressionSnapshot({
    ...fresh,
    firstJourney: { ...fresh.firstJourney, gold },
    enchantment: {
      ...fresh.enchantment,
      materialQuantities: {
        ...fresh.enchantment.materialQuantities,
        [materialId]: quantity,
      },
    },
  });
}

function assertUnchangedFailure(transaction, before, reason) {
  assert.equal(transaction.changed, false);
  assert.equal(transaction.reason, reason);
  assert.deepEqual(transaction.snapshot, before);
}

function verifyTransactionsAndSwordIsolation() {
  assert.deepEqual(ENCHANTMENT_MATERIAL_COSTS, [null, 2, 4, 8, 16, 32]);
  const fire = ENCHANTMENT_CATALOG.getProfile('fire');
  let sourceSnapshot = createEnchantmentSnapshot([DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG);
  const awarded = awardEnchantMaterial(sourceSnapshot, fire, ENCHANTMENT_CATALOG);
  assert.equal(awarded.quantity, 2);
  assert.equal(awarded.enchantment.materialQuantities[fire.materialId], 2);
  sourceSnapshot = awarded.enchantment;
  const repeatedAward = awardEnchantMaterial(sourceSnapshot, fire, ENCHANTMENT_CATALOG);
  assert.equal(repeatedAward.changed, false);
  assert.equal(repeatedAward.reason, ENCHANTMENT_TRANSACTION_REASON.MATERIAL_ALREADY_CLAIMED);
  assert.deepEqual(repeatedAward.enchantment, sourceSnapshot);

  const totalMaterial = ENCHANTMENT_MATERIAL_COSTS.slice(1).reduce((sum, value) => sum + value, 0);
  const totalGold = fire.goldCosts.reduce((sum, value) => sum + value, 0);
  let progression = progressionWithResources({
    materialId: fire.materialId,
    quantity: totalMaterial,
    gold: totalGold,
  });
  for (let targetLevel = 1; targetLevel <= 5; targetLevel += 1) {
    const beforeGold = getAvailableGold(progression);
    const beforeMaterial = progression.enchantment.materialQuantities[fire.materialId];
    const transaction = upgradeSwordEnchantment(
      progression,
      { swordId: DEFAULT_SWORD_ID, elementId: 'fire' },
      ENCHANTMENT_CATALOG,
    );
    assert.equal(transaction.changed, true);
    assert.equal(transaction.targetLevel, targetLevel);
    assert.equal(transaction.materialCost, ENCHANTMENT_MATERIAL_COSTS[targetLevel]);
    assert.equal(transaction.goldCost, fire.goldCosts[targetLevel - 1]);
    assert.equal(getAvailableGold(transaction.snapshot), beforeGold - transaction.goldCost);
    assert.equal(
      transaction.snapshot.enchantment.materialQuantities[fire.materialId],
      beforeMaterial - transaction.materialCost,
    );
    progression = transaction.snapshot;
  }
  assert.deepEqual(progression.enchantment.swordEnchantments[DEFAULT_SWORD_ID], {
    elementId: 'fire',
    level: 5,
  });
  assertUnchangedFailure(
    upgradeSwordEnchantment(
      progression,
      { swordId: DEFAULT_SWORD_ID, elementId: 'fire' },
      ENCHANTMENT_CATALOG,
    ),
    progression,
    ENCHANTMENT_TRANSACTION_REASON.MAX_LEVEL,
  );

  const materialFailure = progressionWithResources({
    materialId: fire.materialId,
    quantity: 1,
    gold: fire.goldCosts[0],
  });
  assertUnchangedFailure(
    upgradeSwordEnchantment(
      materialFailure,
      { swordId: DEFAULT_SWORD_ID, elementId: 'fire' },
      ENCHANTMENT_CATALOG,
    ),
    materialFailure,
    ENCHANTMENT_TRANSACTION_REASON.INSUFFICIENT_MATERIAL,
  );
  const goldFailure = progressionWithResources({
    materialId: fire.materialId,
    quantity: 2,
    gold: 0,
  });
  assertUnchangedFailure(
    upgradeSwordEnchantment(
      goldFailure,
      { swordId: DEFAULT_SWORD_ID, elementId: 'fire' },
      ENCHANTMENT_CATALOG,
    ),
    goldFailure,
    ENCHANTMENT_TRANSACTION_REASON.INSUFFICIENT_GOLD,
  );
  assertUnchangedFailure(
    upgradeSwordEnchantment(
      goldFailure,
      { swordId: 'not-owned', elementId: 'fire' },
      ENCHANTMENT_CATALOG,
    ),
    goldFailure,
    ENCHANTMENT_TRANSACTION_REASON.NOT_OWNED,
  );
  assertUnchangedFailure(
    upgradeSwordEnchantment(
      goldFailure,
      { swordId: DEFAULT_SWORD_ID, elementId: 'void' },
      ENCHANTMENT_CATALOG,
    ),
    goldFailure,
    ENCHANTMENT_TRANSACTION_REASON.INVALID_ELEMENT,
  );

  const purchaseBase = progressionWithResources({
    materialId: fire.materialId,
    quantity: 2,
    gold: 120,
  });
  const purchased = purchaseEquipment(purchaseBase, {
    profileId: OTHER_SWORD_ID,
    goldCost: 120,
  });
  assert.equal(purchased.changed, true);
  assert.deepEqual(purchased.snapshot.enchantment.swordEnchantments[OTHER_SWORD_ID], {
    elementId: null,
    level: 0,
  });

  const isolated = mergeProgressionSnapshot({
    ...purchased.snapshot,
    enchantment: {
      ...purchased.snapshot.enchantment,
      swordEnchantments: {
        [DEFAULT_SWORD_ID]: { elementId: 'fire', level: 1 },
        [OTHER_SWORD_ID]: { elementId: 'ice', level: 5 },
      },
    },
  });
  const equippedHeavy = selectEquipment(isolated, OTHER_SWORD_ID).snapshot;
  const scene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: equippedHeavy,
  });
  assert.equal(scene.getEnchantContext().swordId, OTHER_SWORD_ID);
  assert.equal(scene.getEnchantContext().level, 5);
  assert.equal(scene.getEnchantContext().active.id, 'ice');
  assert.equal(scene.getEnchantContext().active.swordId, OTHER_SWORD_ID);
  const equippedBalanced = scene.selectEquipment(DEFAULT_SWORD_ID);
  assert.equal(equippedBalanced.changed, true);
  assert.equal(scene.getEnchantContext().active.id, 'fire');
  assert.equal(scene.getEnchantContext().active.level, 1);
  assert.deepEqual(scene.getProgressionSnapshot().enchantment.swordEnchantments[OTHER_SWORD_ID], {
    elementId: 'ice',
    level: 5,
  });
  scene.dispose();
}

class MemoryStorage {
  constructor(value = null, { throwOnWrite = false } = {}) {
    this.value = value;
    this.throwOnWrite = throwOnWrite;
  }

  getItem() {
    return this.value;
  }

  setItem(_key, value) {
    if (this.throwOnWrite) throw new Error('injected write failure');
    this.value = value;
  }
}

function verifyPersistenceMigrationAndRecovery() {
  const fire = ENCHANTMENT_CATALOG.getProfile('fire');
  const durable = progressionWithResources({
    materialId: fire.materialId,
    quantity: 2,
    gold: 60,
  });
  const upgraded = upgradeSwordEnchantment(
    durable,
    { swordId: DEFAULT_SWORD_ID, elementId: 'fire' },
    ENCHANTMENT_CATALOG,
  ).snapshot;
  const adapter = new MemoryStorage();
  const storage = new ProgressionStorage(adapter, 'enchantment-v6', ENCHANTMENT_CATALOG);
  assert.equal(PROGRESSION_SCHEMA_VERSION, 6);
  assert.equal(storage.save(upgraded).ok, true);
  const roundTrip = storage.load(DEFAULT_SWORD_ID, [DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG);
  assert.equal(roundTrip.ok, true);
  assert.equal(roundTrip.kind, 'loaded');
  assert.deepEqual(roundTrip.snapshot, upgraded);

  const legacyV5 = {
    ...upgraded,
    version: 5,
    enchantment: {
      materialIds: ['frostroot-crystal'],
      unlockedIds: ['fire'],
      activeId: 'fire',
      claimedMaterialSourceIds: ['field-guardian-defeated'],
    },
  };
  adapter.value = JSON.stringify(legacyV5);
  const migrated = storage.load(DEFAULT_SWORD_ID, [DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG);
  assert.equal(migrated.ok, true);
  assert.equal(migrated.kind, 'migrated');
  assert.equal(migrated.snapshot.version, 6);
  assert.deepEqual(migrated.snapshot.enchantment.swordEnchantments[DEFAULT_SWORD_ID], {
    elementId: 'fire',
    level: 1,
  });
  assert.equal(migrated.snapshot.enchantment.materialQuantities['frostroot-crystal'], 2);

  adapter.value = JSON.stringify({
    ...legacyV5,
    enchantment: { ...legacyV5.enchantment, unlockedIds: ['unknown-enchant'] },
  });
  assert.equal(
    storage.load(DEFAULT_SWORD_ID, [DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG).reason,
    'invalid-data',
  );

  adapter.value = JSON.stringify({
    ...upgraded,
    enchantment: {
      ...upgraded.enchantment,
      materialQuantities: { ...upgraded.enchantment.materialQuantities, unknown: 1 },
    },
  });
  assert.equal(
    storage.load(DEFAULT_SWORD_ID, [DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG).reason,
    'invalid-data',
  );
  adapter.value = '{broken';
  assert.equal(
    storage.load(DEFAULT_SWORD_ID, [DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG).reason,
    'parse-failed',
  );
  const failedWrite = new ProgressionStorage(
    new MemoryStorage(null, { throwOnWrite: true }),
    'enchantment-write-failure',
    ENCHANTMENT_CATALOG,
  ).save(upgraded);
  assert.deepEqual(
    { ok: failedWrite.ok, reason: failedWrite.reason },
    { ok: false, reason: 'write-failed' },
  );
}

function verifyVisualQaLevelsAndRuntimeContext() {
  const levelOne = readVisualQaRequest(
    '?visualQa=1&gameStart=enchant-fire-contact&visualQaRenderer=polygon&visualQaPhase=active',
  );
  const levelFive = readVisualQaRequest(
    '?visualQa=1&gameStart=enchant-lightning-contact&visualQaRenderer=retro&visualQaPhase=active',
  );
  assert.equal(levelOne.scenario.expectation.expectedEnchantLevel, 1);
  assert.equal(levelOne.scenario.enchantmentSnapshot.swordEnchantments[DEFAULT_SWORD_ID].level, 1);
  assert.equal(levelFive.scenario.expectation.expectedEnchantLevel, 5);
  assert.equal(levelFive.scenario.enchantmentSnapshot.swordEnchantments[DEFAULT_SWORD_ID].level, 5);

  const fire = ENCHANTMENT_CATALOG.getProfile('fire');
  const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
  scene.enterTree();
  try {
    scene.restoreProgression(
      progressionWithResources({
        materialId: fire.materialId,
        quantity: 2,
        gold: fire.goldCosts[0],
      }),
    );
    scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'academy-plaza', x: 829 });
    assert.equal(scene.canForgeEnchant(), true);
    const forged = scene.selectEnchant('fire');
    assert.equal(forged.changed, true);
    assert.equal(scene.getEnchantContext().active.level, 1);
    assert.equal(scene.getEnchantContext().swordId, DEFAULT_SWORD_ID);
    scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'training-room', x: 500 });
    scene.setVisualQaCombatScenario('enchant-fire-contact');
    assert.ok(scene.createRenderFrame(0).items.some((item) => item.id === 'enchant-fire-ember-0'));
    scene.setVisualQaCombatScenario('enchant-shield-excluded');
    assert.equal(
      scene.createRenderFrame(0).items.some((item) => item.id === 'enchant-contact-ring'),
      false,
    );
  } finally {
    scene.exitTree();
  }
}

verifyPolicyAndActualMatrix();
verifyActualEffectsAndShieldExclusion();
verifyTransactionsAndSwordIsolation();
verifyPersistenceMigrationAndRecovery();
verifyVisualQaLevelsAndRuntimeContext();

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      probe: 'per-sword-enchantment-domain',
      checks: [
        'level-costs-2-4-8-16-32-and-authored-gold-atomicity',
        'explicit-unchanged-failure-reasons',
        'per-sword-isolation-and-equipped-context',
        'level-1-to-5-linear-damage-and-level-5-1.5x-additional',
        'affinity-non-zero-basic-strong-status-and-four-elements',
        'shield-contact-exclusion',
        'idempotent-source-material-quantity-award',
        'v5-migration-v6-round-trip-corrupt-and-write-failure',
        'polygon-retro-level-1-level-5-visual-qa-fixtures',
      ],
    },
    null,
    2,
  ),
);
