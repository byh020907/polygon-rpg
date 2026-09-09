import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { sampleTrainingEnemyCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { resolveEquipmentEnchantment } from '../src/game/enchantment/EnchantmentPolicy.js';
import {
  ENCHANTMENT_MATERIAL_COSTS,
  ENCHANTMENT_MAX_LEVEL,
  ENCHANTMENT_TRANSACTION_REASON,
  awardEnchantmentMaterial,
  createEnchantmentSnapshot,
} from '../src/game/enchantment/EnchantmentState.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';
import { SCRAP_AWAKENING_STAGE } from '../src/game/campaign/ScrapAwakeningState.js';
import { SCRAP_GARAGE_REVEAL_STAGE } from '../src/game/campaign/ScrapGarageRevealState.js';
import { COMBAT_PROGRESSION_PROFILE } from '../src/game/progression/ProgressionProfiles.js';
import {
  PROGRESSION_SCHEMA_VERSION,
  awardEnemyEnchantMaterial,
  awardCampaignEncounterReward,
  createProgressionSnapshot,
  getAvailableGold,
  mergeProgressionSnapshot,
  purchaseEquipment,
  selectEquipment,
  upgradeEquipmentEnchantment,
} from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import { TrainingEncounterNode } from '../src/game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const STEP = 1 / 120;
const DEFAULT_SWORD_ID = 'field-cutter-balanced';
const OTHER_SWORD_ID = 'field-cutter-heavy';
let contactSequence = 0;

function createEncounter({
  profileId = 'yard-scout-collector',
  enchantId = null,
  enchantLevel = enchantId ? ENCHANTMENT_MAX_LEVEL : 0,
  itemId = DEFAULT_SWORD_ID,
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
    ? Object.freeze({ ...ENCHANTMENT_CATALOG.getProfile(enchantId), itemId, level: enchantLevel })
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
    enchantmentContext: { itemId, level: enchantLevel, active },
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
      const basic = resolveEquipmentEnchantment({
        enchantId: profile.id,
        enchantLevel: 5,
        affinity,
        attackKind: 'basic',
        baseDamage: 100,
        weaponBaseAttack: 100,
      });
      const strong = resolveEquipmentEnchantment({
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
      assert.equal(basicActual.playerResult.damagingHit.enchantment.itemId, DEFAULT_SWORD_ID);
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

    const levelOne = resolveEquipmentEnchantment({
      enchantId: profile.id,
      enchantLevel: 1,
      affinity: 'neutral',
      attackKind: 'basic',
      baseDamage: 100,
      weaponBaseAttack: 100,
    });
    const levelFive = resolveEquipmentEnchantment({
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
    resolveEquipmentEnchantment({
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
    profileId: 'mine-collapse-boss',
    enchantId: 'earth',
    enchantLevel: 5,
  });
  guardedStrong.enemy.aiState = 'guard';
  assert.equal(
    resolveContact(guardedStrong, 'strong').postureDamage,
    ENCOUNTER_PROFILES['mine-collapse-boss'].posture.strongDamage + 34,
  );
  guardedStrong.exitTree();

  const guardedLevelOne = createEncounter({
    profileId: 'mine-collapse-boss',
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
    gold,
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
    const transaction = upgradeEquipmentEnchantment(
      progression,
      { itemId: DEFAULT_SWORD_ID, elementId: 'fire' },
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
  assert.deepEqual(progression.enchantment.equipmentEnchantments[DEFAULT_SWORD_ID], {
    elementId: 'fire',
    level: 5,
  });
  assertUnchangedFailure(
    upgradeEquipmentEnchantment(
      progression,
      { itemId: DEFAULT_SWORD_ID, elementId: 'fire' },
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
    upgradeEquipmentEnchantment(
      materialFailure,
      { itemId: DEFAULT_SWORD_ID, elementId: 'fire' },
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
    upgradeEquipmentEnchantment(
      goldFailure,
      { itemId: DEFAULT_SWORD_ID, elementId: 'fire' },
      ENCHANTMENT_CATALOG,
    ),
    goldFailure,
    ENCHANTMENT_TRANSACTION_REASON.INSUFFICIENT_GOLD,
  );
  assertUnchangedFailure(
    upgradeEquipmentEnchantment(
      goldFailure,
      { itemId: 'not-owned', elementId: 'fire' },
      ENCHANTMENT_CATALOG,
    ),
    goldFailure,
    ENCHANTMENT_TRANSACTION_REASON.NOT_OWNED,
  );
  assertUnchangedFailure(
    upgradeEquipmentEnchantment(
      goldFailure,
      { itemId: DEFAULT_SWORD_ID, elementId: 'void' },
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
    itemId: OTHER_SWORD_ID,
    goldCost: 120,
  });
  assert.equal(purchased.changed, true);
  assert.deepEqual(purchased.snapshot.enchantment.equipmentEnchantments[OTHER_SWORD_ID], {
    elementId: null,
    level: 0,
  });

  const isolated = mergeProgressionSnapshot({
    ...purchased.snapshot,
    enchantment: {
      ...purchased.snapshot.enchantment,
      equipmentEnchantments: {
        [DEFAULT_SWORD_ID]: { elementId: 'fire', level: 1 },
        [OTHER_SWORD_ID]: { elementId: 'ice', level: 5 },
      },
    },
  });
  const equippedHeavy = selectEquipment(isolated, OTHER_SWORD_ID).snapshot;
  const scene = createTestGameScene({
    mapDefinition: SCRAP_AWAKENING_MAP,
    progressionSnapshot: equippedHeavy,
  });
  assert.equal(scene.getEnchantContext().itemId, OTHER_SWORD_ID);
  assert.equal(scene.getEnchantContext().level, 5);
  assert.equal(scene.getEnchantContext().active.id, 'ice');
  assert.equal(scene.getEnchantContext().active.itemId, OTHER_SWORD_ID);
  const equippedBalanced = selectEquipment(scene.getProgressionSnapshot(), DEFAULT_SWORD_ID);
  assert.equal(equippedBalanced.changed, true);
  scene.restoreProgression(equippedBalanced.snapshot);
  assert.equal(scene.getEnchantContext().active.id, 'fire');
  assert.equal(scene.getEnchantContext().active.level, 1);
  assert.deepEqual(
    scene.getProgressionSnapshot().enchantment.equipmentEnchantments[OTHER_SWORD_ID],
    {
      elementId: 'ice',
      level: 5,
    },
  );
  scene.dispose();
}

function verifyCampaignEnemyMaterialRewards() {
  const authoredEntities = new Map(
    SCRAP_AWAKENING_MAP.regions
      .flatMap((region) => region.rooms.flatMap((room) => room.entities))
      .map((entity) => [entity.id, entity]),
  );
  const fresh = createProgressionSnapshot(
    DEFAULT_SWORD_ID,
    ENCHANTMENT_CATALOG,
    SCRAP_CAMPAIGN_PROFILE,
  );
  const elements = new Set();
  for (const reward of Object.values(COMBAT_PROGRESSION_PROFILE.encounterRewards)) {
    assert.equal(authoredEntities.get(reward.entityId)?.encounterProfileId, reward.profileId);
    elements.add(reward.materialReward.elementId);
    const awarded = awardCampaignEncounterReward(
      fresh,
      reward,
      COMBAT_PROGRESSION_PROFILE,
      ENCHANTMENT_CATALOG,
      SCRAP_CAMPAIGN_PROFILE,
    );
    assert.equal(awarded.changed, true);
    assert.equal(awarded.snapshot.gold, reward.gold);
    const materialId = ENCHANTMENT_CATALOG.getProfile(reward.materialReward.elementId).materialId;
    assert.equal(
      awarded.snapshot.enchantment.materialQuantities[materialId],
      reward.materialReward.quantity,
    );
    assert.equal(
      awarded.snapshot.scrapCampaign.elapsedSegments,
      fresh.scrapCampaign.elapsedSegments,
    );
    assert.deepEqual(
      awardCampaignEncounterReward(
        awarded.snapshot,
        reward,
        COMBAT_PROGRESSION_PROFILE,
        ENCHANTMENT_CATALOG,
        SCRAP_CAMPAIGN_PROFILE,
      ).snapshot,
      awarded.snapshot,
    );
  }
  assert.deepEqual([...elements].sort(), ['earth', 'fire', 'ice', 'lightning']);
  assert.equal(
    awardCampaignEncounterReward(
      fresh,
      { entityId: 'unknown', profileId: 'unknown' },
      COMBAT_PROGRESSION_PROFILE,
      ENCHANTMENT_CATALOG,
      SCRAP_CAMPAIGN_PROFILE,
    ).changed,
    false,
  );
  let repeatable = createEnchantmentSnapshot([DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG);
  for (let quantity = 1; quantity <= 62; quantity += 1) {
    const awarded = awardEnchantmentMaterial(
      repeatable,
      { elementId: 'fire' },
      ENCHANTMENT_CATALOG,
    );
    assert.equal(awarded.totalQuantity, quantity);
    repeatable = awarded.enchantment;
  }
  assert.equal(
    awardEnemyEnchantMaterial(fresh, { elementId: 'ice', quantity: 1 }, ENCHANTMENT_CATALOG)
      .totalQuantity,
    1,
  );

  const scene = createTestGameScene({
    progressionSnapshot: mergeProgressionSnapshot(fresh, {
      scrapCampaign: { ...fresh.scrapCampaign, awakeningStageId: SCRAP_AWAKENING_STAGE.YARD_GUARD },
    }),
  });
  scene.enterTree();
  try {
    const encounter = scene.roomSceneNode.encounter;
    assert.equal(encounter.getGameplaySnapshot().profileId, 'yard-guard-collector');
    const snapshots = [];
    scene.progressionChanged.connect((snapshot) => snapshots.push(snapshot));
    encounter.enemy.position.x = 650;
    encounter.enemy.health = 1;
    assert.equal(encounter.resolvePlayerAttack(contactFrame(encounter, 'basic')), true);
    assert.equal(
      scene.getProgressionSnapshot().scrapCampaign.awakeningStageId,
      SCRAP_AWAKENING_STAGE.YARD_SEARCH,
    );
    assert.equal(scene.getProgressionSnapshot().gold, 120);
    assert.equal(
      scene.getProgressionSnapshot().enchantment.materialQuantities['conductive-coil'],
      2,
    );
    assert.equal(scene.getProgressionSnapshot().scrapCampaign.elapsedSegments, 0);
    assert.equal(
      snapshots.length,
      1,
      'victory 진행·재료·통화를 하나의 durable snapshot으로 공개한다.',
    );
    const afterVictory = scene.getProgressionSnapshot();
    assert.equal(
      scene.resolveCampaignEncounter({
        entityId: 'scrap-yard-guard-collector',
        profileId: 'yard-guard-collector',
        scrapAwakeningNextStageId: SCRAP_AWAKENING_STAGE.YARD_SEARCH,
      }).changed,
      false,
    );
    assert.deepEqual(scene.getProgressionSnapshot(), afterVictory);
    const storage = new ProgressionStorage(
      new MemoryStorage(),
      'campaign-victory',
      ENCHANTMENT_CATALOG,
      COMBAT_PROGRESSION_PROFILE.equipmentForge,
      SCRAP_CAMPAIGN_PROFILE,
    );
    assert.equal(storage.save(afterVictory).ok, true);
    assert.deepEqual(storage.load(DEFAULT_SWORD_ID).snapshot, afterVictory);
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

function verifyPersistenceAndRecovery() {
  const fire = ENCHANTMENT_CATALOG.getProfile('fire');
  const durable = progressionWithResources({
    materialId: fire.materialId,
    quantity: 2,
    gold: 60,
  });
  const upgraded = upgradeEquipmentEnchantment(
    durable,
    { itemId: DEFAULT_SWORD_ID, elementId: 'fire' },
    ENCHANTMENT_CATALOG,
  ).snapshot;
  const adapter = new MemoryStorage();
  const storage = new ProgressionStorage(adapter, 'enchantment-current', ENCHANTMENT_CATALOG);
  assert.equal(PROGRESSION_SCHEMA_VERSION, 11);
  assert.equal(storage.save(upgraded).ok, true);
  const roundTrip = storage.load(DEFAULT_SWORD_ID, [DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG);
  assert.equal(roundTrip.ok, true);
  assert.equal(roundTrip.kind, 'loaded');
  assert.deepEqual(roundTrip.snapshot, upgraded);

  const missingQuantity = JSON.parse(adapter.value);
  delete missingQuantity.enchantment.materialQuantities[fire.materialId];
  adapter.value = JSON.stringify(missingQuantity);
  assert.equal(
    storage.load(DEFAULT_SWORD_ID).reason,
    'invalid-data',
    '누락된 소재 수량을 0으로 복구했다고 위장하지 않는다.',
  );

  adapter.value = JSON.stringify({ ...upgraded, version: 9 });
  assert.equal(
    storage.load(DEFAULT_SWORD_ID, [DEFAULT_SWORD_ID], ENCHANTMENT_CATALOG).reason,
    'incompatible-schema',
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

function workshopReady(snapshot) {
  return mergeProgressionSnapshot(snapshot, {
    scrapCampaign: {
      ...snapshot.scrapCampaign,
      awakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
      garageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    },
  });
}

function verifyWorkshopRuntimeContext() {
  const fire = ENCHANTMENT_CATALOG.getProfile('fire');
  const scene = createTestGameScene({ mapDefinition: SCRAP_AWAKENING_MAP });
  scene.enterTree();
  try {
    scene.restoreProgression(
      workshopReady(
        progressionWithResources({
          materialId: fire.materialId,
          quantity: 2,
          gold: fire.goldCosts[0],
        }),
      ),
    );
    scene.setVisualQaLocation({
      regionId: 'scrap-waste-edge',
      roomId: 'abandoned-weapon-yard',
      x: 198,
    });
    const inactive = scene.executeDialogueCommand('scrapyard-owner-workshop', 'enchant-fire');
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
    assert.equal(dialogue.interactionId, 'scrapyard-owner-workshop');
    assert.equal(
      dialogue.commands.find((command) => command.id === 'enchant-fire').canChoose,
      true,
    );
    assert.equal(
      scene.executeDialogueCommand('other-workshop-interaction', 'enchant-fire').reason,
      'unavailable',
    );
    assert.equal(
      scene.executeDialogueCommand('scrapyard-owner-workshop', 'enchant-unknown').reason,
      'unavailable',
    );
    const forged = scene.executeDialogueCommand('scrapyard-owner-workshop', 'enchant-fire');
    assert.equal(forged.changed, true);
    assert.equal(scene.getEnchantContext().active.level, 1);
    assert.equal(scene.getEnchantContext().itemId, DEFAULT_SWORD_ID);
    assert.equal(
      scene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
      0,
      '작업장에서의 즉시 인챈트는 시간을 소비하지 않는다.',
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
verifyCampaignEnemyMaterialRewards();
verifyPersistenceAndRecovery();
verifyWorkshopRuntimeContext();

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      probe: 'per-item-enchantment-domain',
      checks: [
        'level-costs-2-4-8-16-32-and-authored-gold-atomicity',
        'explicit-unchanged-failure-reasons',
        'per-item-isolation-and-equipped-context',
        'level-1-to-5-linear-damage-and-level-5-1.5x-additional',
        'affinity-non-zero-basic-strong-status-and-four-elements',
        'shield-contact-exclusion',
        'current-authored-victory-resources-and-one-ledger-award',
        'production-victory-single-snapshot-and-v11-round-trip',
        'incompatible-reset-notice-corrupt-and-write-failure',
        'active-npc-conversation-command-only-and-static-hud-removal',
      ],
    },
    null,
    2,
  ),
);
