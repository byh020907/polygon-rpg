import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { sampleTrainingEnemyCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { resolveSwordEnchantment } from '../src/game/enchantment/EnchantmentPolicy.js';
import {
  ENCHANTMENT_MATERIAL_COSTS,
  ENCHANTMENT_MAX_LEVEL,
  ENCHANTMENT_TRANSACTION_REASON,
  awardEnchantMaterial,
  awardRepeatableEnchantMaterial,
  createEnchantmentSnapshot,
} from '../src/game/enchantment/EnchantmentState.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import {
  FIRST_JOURNEY_CHECKPOINT_ID,
  JOURNEY_PHASE,
  JOURNEY_ROUTE,
} from '../src/game/encounter/FirstJourneyProgress.js';
import { FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE } from '../src/game/journey/FirstJourneyDungeonSignature.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import {
  PROGRESSION_SCHEMA_VERSION,
  awardEnemyEnchantMaterial,
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
  const equippedBalanced = selectEquipment(scene.getProgressionSnapshot(), DEFAULT_SWORD_ID);
  assert.equal(equippedBalanced.changed, true);
  scene.restoreProgression(equippedBalanced.snapshot);
  assert.equal(scene.getEnchantContext().active.id, 'fire');
  assert.equal(scene.getEnchantContext().active.level, 1);
  assert.deepEqual(scene.getProgressionSnapshot().enchantment.swordEnchantments[OTHER_SWORD_ID], {
    elementId: 'ice',
    level: 5,
  });
  scene.dispose();
}

function completedFirstJourneyProgression() {
  const fresh = createProgressionSnapshot(DEFAULT_SWORD_ID, ENCHANTMENT_CATALOG);
  return mergeProgressionSnapshot({
    ...fresh,
    firstJourney: {
      ...fresh.firstJourney,
      phase: JOURNEY_PHASE.RETURNED,
      routeChoice: JOURNEY_ROUTE.GUARDIAN,
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: FIRST_JOURNEY_CHECKPOINT_ID,
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold: 120,
      dungeonSignatureStageIds: Object.freeze([
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.BOSS_TEST,
      ]),
    },
  });
}

function verifyRepeatableEnemyMaterialRewards() {
  const expectedRewards = new Map([
    ['earth-material-echo', 'earth'],
    ['fire-material-echo', 'fire'],
    ['ice-material-echo', 'ice'],
    ['glasswind-material-echo', 'lightning'],
  ]);
  for (const [profileId, elementId] of expectedRewards) {
    const profile = ENCOUNTER_PROFILES[profileId];
    assert.equal(profile.respawns, true);
    assert.deepEqual(profile.materialReward, { elementId, quantity: 1 });
  }

  const authoredEntityIds = new Set(
    ACADEMY_VILLAGE_MAP.regions.flatMap((region) =>
      region.rooms.flatMap((room) => room.entities.map((entity) => entity.id)),
    ),
  );
  for (const entityId of [
    'earth-material-training-echo',
    'fire-material-field-echo',
    'ice-material-dungeon-echo',
    'lightning-material-glasswind-echo',
  ]) {
    assert.equal(
      authoredEntityIds.has(entityId),
      true,
      `${entityId} authored source가 필요합니다.`,
    );
    assert.equal(
      ACADEMY_VILLAGE_MAP.patches.some((patch) =>
        patch.operations.some(
          (operation) =>
            operation.op === 'set-enabled' && operation.target === entityId && operation.value,
        ),
      ),
      true,
      `${entityId}는 대응 첫 클리어 뒤 열려야 합니다.`,
    );
  }

  const fire = ENCHANTMENT_CATALOG.getProfile('fire');
  let repeatable = createEnchantmentSnapshot([DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG);
  for (let count = 1; count <= 62; count += 1) {
    const awarded = awardRepeatableEnchantMaterial(
      repeatable,
      { elementId: 'fire', quantity: 1 },
      ENCHANTMENT_CATALOG,
    );
    assert.equal(awarded.totalQuantity, count);
    repeatable = awarded.enchantment;
  }
  assert.equal(repeatable.materialQuantities[fire.materialId], 62);
  assert.deepEqual(repeatable.claimedMaterialSourceIds, []);

  const progressionAward = awardEnemyEnchantMaterial(
    createProgressionSnapshot(DEFAULT_SWORD_ID, ENCHANTMENT_CATALOG),
    { elementId: 'ice', quantity: 1 },
    ENCHANTMENT_CATALOG,
  );
  assert.equal(progressionAward.totalQuantity, 1);
  assert.equal(progressionAward.snapshot.enchantment.materialQuantities['frostroot-crystal'], 1);

  const scene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: completedFirstJourneyProgression(),
  });
  const progressionEvents = [];
  scene.progressionChanged.connect((snapshot) => progressionEvents.push(snapshot));
  scene.enterTree();
  try {
    scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'training-room', x: 500 });
    const encounter = scene.roomSceneNode.encounter;
    assert.equal(encounter.getGameplaySnapshot().profileId, 'earth-material-echo');
    assert.deepEqual(encounter.getGameplaySnapshot().materialReward, {
      elementId: 'earth',
      quantity: 1,
    });
    const initialClock = scene.getProgressionSnapshot().worldTime.clockMinutes;
    const initialMaterial =
      scene.getProgressionSnapshot().enchantment.materialQuantities['sealstone-heart'];
    encounter.enemy.position.x = 650;
    encounter.enemy.health = 1;
    assert.equal(encounter.resolvePlayerAttack(contactFrame(encounter, 'basic')), true);
    assert.equal(
      scene.getProgressionSnapshot().enchantment.materialQuantities['sealstone-heart'],
      initialMaterial + 1,
    );
    assert.equal(encounter.resolvePlayerAttack(contactFrame(encounter, 'basic')), false);
    assert.equal(
      scene.getProgressionSnapshot().enchantment.materialQuantities['sealstone-heart'],
      initialMaterial + 1,
      '같은 enemy life는 completion을 중복 지급하면 안 됩니다.',
    );
    for (let tick = 0; tick < 125; tick += 1) encounter.step(STEP, idleFrame(650));
    assert.equal(encounter.getGameplaySnapshot().health, 80);
    encounter.enemy.position.x = 650;
    encounter.enemy.health = 1;
    assert.equal(encounter.resolvePlayerAttack(contactFrame(encounter, 'basic')), true);
    assert.equal(
      scene.getProgressionSnapshot().enchantment.materialQuantities['sealstone-heart'],
      initialMaterial + 2,
    );
    assert.equal(scene.getProgressionSnapshot().worldTime.clockMinutes, initialClock + 40);
    assert.equal(
      progressionEvents.length,
      2,
      '한 life completion마다 durable snapshot 한 번만 내보낸다.',
    );
    assert.match(
      scene.getWorldStatus().progressionNotice,
      new RegExp(`봉인석 심장 확정 \\+1 · 보유 ${initialMaterial + 2}`),
    );

    const adapter = new MemoryStorage();
    const storage = new ProgressionStorage(adapter, 'repeatable-material-v8', ENCHANTMENT_CATALOG);
    assert.equal(storage.save(scene.getProgressionSnapshot()).ok, true);
    const loaded = storage.load(DEFAULT_SWORD_ID, [DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG);
    assert.equal(loaded.ok, true);
    assert.equal(
      loaded.snapshot.enchantment.materialQuantities['sealstone-heart'],
      initialMaterial + 2,
    );
  } finally {
    scene.exitTree();
  }
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
  const storage = new ProgressionStorage(adapter, 'enchantment-v8', ENCHANTMENT_CATALOG);
  assert.equal(PROGRESSION_SCHEMA_VERSION, 9);
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
  assert.equal(migrated.snapshot.version, PROGRESSION_SCHEMA_VERSION);
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
  const repeatableMaterial = readVisualQaRequest(
    '?visualQa=1&gameStart=enchant-material-repeat&visualQaRenderer=polygon&visualQaPhase=active',
  );
  assert.equal(repeatableMaterial.scenario.materialEchoDefeats, 2);
  assert.equal(repeatableMaterial.scenario.expectation.expectedMaterialId, 'sealstone-heart');
  assert.equal(repeatableMaterial.scenario.expectation.expectedMaterialQuantity, 4);

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
    scene.setVisualQaLocation({
      regionId: 'academy-region',
      roomId: 'academy-enchanter-shop',
      x: 610,
    });
    const inactive = scene.executeDialogueCommand('enchanter-lio-interaction', 'enchant-fire');
    assert.equal(inactive.changed, false);
    assert.equal(inactive.reason, 'unavailable');
    scene.update(
      STEP,
      Object.freeze({
        left: false,
        right: false,
        jump: true,
        guard: false,
        basicAttack: false,
        strongAttack: false,
        jumpSequence: 1,
        basicAttackSequence: 0,
        strongAttackSequence: 0,
      }),
    );
    const dialogue = scene.getWorldStatus().dialogue;
    assert.equal(dialogue.active, true);
    assert.equal(dialogue.interactionId, 'enchanter-lio-interaction');
    assert.equal(
      dialogue.commands.find((command) => command.id === 'enchant-fire').canChoose,
      true,
    );
    assert.equal(
      scene.executeDialogueCommand('mentor-sera-interaction', 'enchant-fire').reason,
      'unavailable',
    );
    assert.equal(
      scene.executeDialogueCommand('enchanter-lio-interaction', 'enchant-unknown').reason,
      'unavailable',
    );
    const forged = scene.executeDialogueCommand('enchanter-lio-interaction', 'enchant-fire');
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

  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /class="enchant-forge"/, '상시 growth HUD에 forge가 남으면 안 된다.');
  assert.match(html, /class="dialogue-command-surface"/);
  assert.match(html, /x-show="dialogue\.commands\.length > 0"/);
  assert.match(html, /x-show="canManageProgression && !dialogue\.active"/);
}

verifyPolicyAndActualMatrix();
verifyActualEffectsAndShieldExclusion();
verifyTransactionsAndSwordIsolation();
verifyRepeatableEnemyMaterialRewards();
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
        'four-authored-repeatable-enemies-and-one-award-per-life',
        'repeatable-material-quantity-v9-round-trip',
        'v5-migration-v9-round-trip-corrupt-and-write-failure',
        'polygon-retro-level-1-level-5-visual-qa-fixtures',
        'active-npc-conversation-command-only-and-static-hud-removal',
      ],
    },
    null,
    2,
  ),
);
