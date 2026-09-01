import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import {
  DEFAULT_EQUIPMENT_PROFILE_ID,
  EQUIPMENT_PROFILES,
  getEquipmentProfile,
} from '../src/game/equipment/EquipmentProfiles.js';
import {
  FIRST_JOURNEY_WEAPON_FORGE_PROFILE,
  getCombatSkillTrainingMarkRequirement,
  getCombatSkillUpgradeCost,
} from '../src/game/progression/ProgressionProfiles.js';
import {
  PROGRESSION_TRANSACTION_REASON,
  awardWeaponForgeMaterial,
  createProgressionSnapshot,
  forgeWeaponArchetype,
  getAvailableGold,
  mergeProgressionSnapshot,
  purchaseEquipment,
  selectEquipment,
  trainCombatSkill,
} from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import { sampleTrainingEnemyCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { TrainingEncounterNode } from '../src/game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const HEAVY_PROFILE_ID = 'heavy-sword';
const SWIFT_ARCHETYPE_ID = 'swift-chain-sword';
const BREAKER_ARCHETYPE_ID = 'posture-breaker-sword';
const REAR_ARCHETYPE_ID = 'rear-punish-sword';
const ARCHETYPE_PROFILE_IDS = Object.freeze([
  SWIFT_ARCHETYPE_ID,
  BREAKER_ARCHETYPE_ID,
  REAR_ARCHETYPE_ID,
]);
const STEP = 1 / 120;

function openWeaponMerchantDialogue(scene) {
  scene.setVisualQaLocation({
    regionId: 'academy-region',
    roomId: 'academy-weapon-shop',
    x: 610,
  });
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
  return scene.getWorldStatus().dialogue;
}

function returnedFirstJourneyProgression({ trainingMarks = 0, gold = 120 } = {}) {
  const fresh = createProgressionSnapshot(DEFAULT_EQUIPMENT_PROFILE_ID);
  return mergeProgressionSnapshot({
    ...fresh,
    trainingMarks,
    firstJourney: {
      phase: 'returned',
      routeChoice: 'guardian-route',
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: 'academy-village:academy-region:sealed-forest-dungeon:sealed-forest-checkpoint',
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold,
    },
  });
}

function returnedRegionExpansion(snapshot, gold = 180) {
  return mergeProgressionSnapshot({
    ...snapshot,
    regionExpansion: {
      phase: 'returned',
      glasswindHunterDefeated: true,
      checkpointId: 'academy-village:glasswind-region:glasswind-observatory:glasswind-checkpoint',
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold,
    },
  });
}

function assertFrozenTransaction(transaction) {
  assert.ok(Object.isFrozen(transaction), 'progression transaction result는 immutable이어야 한다.');
  assert.ok(Object.isFrozen(transaction.snapshot), 'transaction snapshot은 immutable이어야 한다.');
  assert.ok(
    Object.isFrozen(transaction.snapshot.ownedEquipmentIds),
    '소유 장비 ID 목록은 immutable이어야 한다.',
  );
}

function forgeArchetype(snapshot, profileId) {
  const forge = FIRST_JOURNEY_WEAPON_FORGE_PROFILE;
  return forgeWeaponArchetype(snapshot, {
    choiceGroupId: forge.choiceGroupId,
    profileId,
    optionProfileIds: forge.optionProfileIds,
    materialId: forge.materialId,
    materialCost: forge.materialCost,
  });
}

function awardFirstJourneyForgeMaterial(snapshot) {
  const forge = FIRST_JOURNEY_WEAPON_FORGE_PROFILE;
  return awardWeaponForgeMaterial(snapshot, {
    sourceId: forge.sourceId,
    materialId: forge.materialId,
    quantity: forge.sourceQuantity,
  });
}

function verifyWeaponArchetypeForgeTransactions() {
  const forge = FIRST_JOURNEY_WEAPON_FORGE_PROFILE;
  const fresh = createProgressionSnapshot(DEFAULT_EQUIPMENT_PROFILE_ID);
  const unavailable = forgeArchetype(fresh, SWIFT_ARCHETYPE_ID);
  assert.equal(unavailable.changed, false);
  assert.equal(unavailable.reason, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_MATERIAL);

  const awarded = awardFirstJourneyForgeMaterial(fresh);
  assert.equal(awarded.changed, true);
  assert.equal(awarded.reason, PROGRESSION_TRANSACTION_REASON.AWARDED);
  assert.equal(awarded.snapshot.weaponForge.materialQuantities[forge.materialId], 1);
  assert.deepEqual(awarded.snapshot.weaponForge.claimedSourceIds, [forge.sourceId]);
  const repeatedAward = awardFirstJourneyForgeMaterial(awarded.snapshot);
  assert.equal(repeatedAward.changed, false);
  assert.equal(repeatedAward.reason, PROGRESSION_TRANSACTION_REASON.ALREADY_CLAIMED);
  assert.deepEqual(
    repeatedAward.snapshot,
    awarded.snapshot,
    '첫 클리어 재료는 중복 지급하지 않는다.',
  );

  const forgedResults = new Map();
  for (const profileId of ARCHETYPE_PROFILE_IDS) {
    const transaction = forgeArchetype(awarded.snapshot, profileId);
    forgedResults.set(profileId, transaction);
    assert.equal(transaction.changed, true);
    assert.equal(transaction.reason, PROGRESSION_TRANSACTION_REASON.FORGED);
    assert.equal(transaction.snapshot.equippedEquipmentId, profileId);
    assert.ok(transaction.snapshot.ownedEquipmentIds.includes(profileId));
    assert.deepEqual(transaction.snapshot.enchantment.swordEnchantments[profileId], {
      elementId: null,
      level: 0,
    });
    assert.equal(transaction.snapshot.weaponForge.materialQuantities[forge.materialId], 0);
    assert.equal(
      transaction.snapshot.weaponForge.selectedProfileIdsByGroup[forge.choiceGroupId],
      profileId,
    );
    const alternativeId = ARCHETYPE_PROFILE_IDS.find((candidate) => candidate !== profileId);
    const blockedAlternative = forgeArchetype(transaction.snapshot, alternativeId);
    assert.equal(blockedAlternative.changed, false);
    assert.equal(blockedAlternative.reason, PROGRESSION_TRANSACTION_REASON.ALREADY_CHOSEN);
    assert.deepEqual(blockedAlternative.snapshot, transaction.snapshot);
  }
  const unknown = forgeWeaponArchetype(awarded.snapshot, {
    choiceGroupId: forge.choiceGroupId,
    profileId: 'unknown-archetype',
    optionProfileIds: forge.optionProfileIds,
    materialId: forge.materialId,
    materialCost: forge.materialCost,
  });
  assert.equal(unknown.reason, PROGRESSION_TRANSACTION_REASON.UNAVAILABLE);
  return forgedResults;
}

function verifyChoiceTransactions() {
  const profile = getEquipmentProfile(HEAVY_PROFILE_ID);
  const noReward = createProgressionSnapshot(DEFAULT_EQUIPMENT_PROFILE_ID);
  const insufficientTraining = purchaseEquipment(noReward, {
    profileId: profile.id,
    goldCost: profile.goldCost,
    trainingMarkRequirement: 1,
  });
  assert.equal(insufficientTraining.changed, false);
  assert.equal(insufficientTraining.reason, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_TRAINING);
  assert.deepEqual(
    insufficientTraining.snapshot,
    noReward,
    '훈련 조건 실패 transaction은 state를 바꾸지 않아야 한다.',
  );
  assertFrozenTransaction(insufficientTraining);

  const noGold = returnedFirstJourneyProgression({ gold: 0 });
  const insufficientGold = purchaseEquipment(noGold, {
    profileId: profile.id,
    goldCost: profile.goldCost,
    trainingMarkRequirement: profile.trainingMarkRequirement,
  });
  assert.equal(insufficientGold.changed, false);
  assert.equal(insufficientGold.reason, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_GOLD);
  assert.deepEqual(
    insufficientGold.snapshot,
    noGold,
    '실패 transaction은 state를 바꾸지 않아야 한다.',
  );

  const reward = returnedFirstJourneyProgression();
  const purchase = purchaseEquipment(reward, {
    profileId: profile.id,
    goldCost: profile.goldCost,
    trainingMarkRequirement: profile.trainingMarkRequirement,
  });
  assert.equal(purchase.changed, true);
  assert.equal(purchase.reason, PROGRESSION_TRANSACTION_REASON.PURCHASED);
  assert.equal(getAvailableGold(purchase.snapshot), 0);
  assert.equal(
    purchase.snapshot.trainingMarks,
    reward.trainingMarks,
    '인장은 소모하지 않는 학습 조건이다.',
  );
  assert.ok(purchase.snapshot.ownedEquipmentIds.includes(profile.id));
  assertFrozenTransaction(purchase);

  const equip = selectEquipment(purchase.snapshot, profile.id);
  assert.equal(equip.changed, true);
  assert.equal(equip.snapshot.equippedEquipmentId, profile.id);
  const repeated = purchaseEquipment(equip.snapshot, {
    profileId: profile.id,
    goldCost: profile.goldCost,
    trainingMarkRequirement: profile.trainingMarkRequirement,
  });
  assert.equal(repeated.changed, false);
  assert.equal(repeated.reason, PROGRESSION_TRANSACTION_REASON.ALREADY_OWNED);
  assert.equal(
    getAvailableGold(repeated.snapshot),
    0,
    '중복 구매는 Gold를 재차감하지 않아야 한다.',
  );

  const skillReward = returnedFirstJourneyProgression();
  const train = trainCombatSkill(skillReward, {
    goldCost: getCombatSkillUpgradeCost(1),
    trainingMarkRequirement: getCombatSkillTrainingMarkRequirement(1),
  });
  assert.equal(train.changed, true);
  assert.equal(train.snapshot.combatSkillLevel, 1);
  assert.equal(getAvailableGold(train.snapshot), 0);
  const blockedAlternative = purchaseEquipment(train.snapshot, {
    profileId: profile.id,
    goldCost: profile.goldCost,
    trainingMarkRequirement: profile.trainingMarkRequirement,
  });
  assert.equal(blockedAlternative.reason, PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_GOLD);

  const trainedReward = returnedFirstJourneyProgression({ trainingMarks: 3 });
  const mixedWallet = returnedRegionExpansion(
    mergeProgressionSnapshot({
      ...trainedReward,
      combatSkillLevel: 1,
      firstJourney: { ...trainedReward.firstJourney, gold: 20 },
    }),
  );
  const levelTwo = trainCombatSkill(mixedWallet, {
    goldCost: getCombatSkillUpgradeCost(2),
    trainingMarkRequirement: getCombatSkillTrainingMarkRequirement(2),
  });
  assert.equal(levelTwo.changed, true);
  assert.equal(levelTwo.snapshot.firstJourney.gold, 0);
  assert.equal(levelTwo.snapshot.regionExpansion.gold, 20);
}

function createArchetypeScene(profileId) {
  const forged = returnedFirstJourneyWithArchetype(profileId);
  return createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: forged,
  });
}

function returnedFirstJourneyWithArchetype(profileId, { equippedProfileId = profileId } = {}) {
  const base = returnedFirstJourneyProgression();
  const awarded = awardFirstJourneyForgeMaterial(base);
  const forged = forgeArchetype(awarded.snapshot, profileId);
  assert.equal(forged.changed, true);
  if (equippedProfileId === profileId) return forged.snapshot;
  const equipped = selectEquipment(forged.snapshot, equippedProfileId);
  assert.equal(equipped.changed, true);
  return equipped.snapshot;
}

function createBossEncounter(id) {
  return new TrainingEncounterNode({
    entity: {
      id,
      kind: 'combat-test-mob',
      encounterProfileId: 'boss',
      position: { x: 650, y: 420 },
      maxHealth: 400,
    },
    groundY: 420,
    movementBounds: { minX: 0, maxX: 960 },
    spinContact: { hitPulses: [0.3, 0.5, 0.7], contactSpacings: [23, 17, 5] },
    encounterProfiles: ENCOUNTER_PROFILES,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
  });
}

function resolveDirectPlayerAttack(
  encounter,
  attackProfile,
  { motionId, sequence = 1, playerX = 600, playerFacing = 1 } = {},
) {
  const directAttackProfile = Object.freeze({ ...attackProfile, hitPulses: undefined });
  const enemyGeometry = sampleTrainingEnemyCombatGeometry(
    encounter.enemy,
    TRAINING_ENEMY_ATTACK_PROFILES,
  );
  const contactPart = Object.freeze({
    part: directAttackProfile.contactPart,
    points: enemyGeometry.hurt[0].points,
  });
  return encounter.resolvePlayerAttack(
    Object.freeze({
      combatState: Object.freeze({
        id: motionId,
        phase: 'active',
        progress: (directAttackProfile.start + directAttackProfile.end) / 2,
        sequence,
        comboCycle: sequence,
      }),
      attackProfile: directAttackProfile,
      playerGeometry: Object.freeze({
        weapon: contactPart,
        sweep: contactPart,
        shield: contactPart,
      }),
      player: Object.freeze({
        position: Object.freeze({ x: playerX, y: 338 }),
        facing: playerFacing,
        health: 100,
        hitstunSeconds: 0,
        blockstunSeconds: 0,
        invulnerableSeconds: 0,
        airComboFacing: 0,
        isGrounded: true,
      }),
    }),
  );
}

function verifyArchetypeCombatTradeoffs() {
  const baseline = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: returnedFirstJourneyProgression(),
  });
  const swift = createArchetypeScene(SWIFT_ARCHETYPE_ID);
  const breaker = createArchetypeScene(BREAKER_ARCHETYPE_ID);
  const rear = createArchetypeScene(REAR_ARCHETYPE_ID);

  const baselineSlashFrames = baseline.combatCommands.getMotionFrameData('slash').durationFrames;
  const swiftSlashFrames = swift.combatCommands.getMotionFrameData('slash').durationFrames;
  assert.ok(
    swiftSlashFrames < baselineSlashFrames,
    '연환형은 실제 command frame이 더 짧아야 한다.',
  );
  assert.ok(
    swift.getAttackHitProfile('slash').damage < baseline.getAttackHitProfile('slash').damage,
    '연환형은 빠른 연계의 대가로 단발 피해가 낮아야 한다.',
  );

  const breakerStrong = breaker.getAttackHitProfile('heavy');
  const postureBoss = createBossEncounter('posture-breaker-boss');
  postureBoss.enemy.aiState = 'guard';
  const postureBefore = postureBoss.enemy.posture.current;
  assert.equal(resolveDirectPlayerAttack(postureBoss, breakerStrong, { motionId: 'heavy' }), true);
  const expectedPostureDamage = Math.round(
    ENCOUNTER_PROFILES.boss.posture.strongDamage * breakerStrong.postureDamageScale,
  );
  assert.equal(postureBoss.enemy.posture.current, postureBefore - expectedPostureDamage);

  const rearSlash = rear.getAttackHitProfile('slash');
  assert.ok(
    rearSlash.range > baseline.getAttackHitProfile('slash').range,
    '추격형은 실제 contact range가 더 길어야 한다.',
  );
  const rearBoss = createBossEncounter('rear-punish-boss');
  rearBoss.enemy.aiState = 'recovery';
  rearBoss.enemy.punishWindowOpen = true;
  rearBoss.enemy.punishWindowOrigin = 'recovery';
  rearBoss.enemy.punishComboCycle = 0;
  rearBoss.enemy.attackFacing = 1;
  const rearHealthBefore = rearBoss.enemy.health;
  assert.equal(
    resolveDirectPlayerAttack(rearBoss, rearSlash, { motionId: 'slash', playerX: 630 }),
    true,
  );
  assert.equal(
    rearHealthBefore - rearBoss.enemy.health,
    Math.round(rearSlash.damage * rearSlash.backPunishDamageScale),
    '추격형은 Boss recovery의 실제 배후 punish 피해를 증폭해야 한다.',
  );
}

function verifyRuntimeTradeoffsAndStatus() {
  const scene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: returnedFirstJourneyWithArchetype(SWIFT_ARCHETYPE_ID, {
      equippedProfileId: DEFAULT_EQUIPMENT_PROFILE_ID,
    }),
  });
  scene.enterTree();
  const balancedAttack = scene.getAttackHitProfile('slash');
  const balancedFrames = scene.combatCommands.getMotionFrameData('slash').durationFrames;
  const balancedGuardScene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: returnedFirstJourneyWithArchetype(SWIFT_ARCHETYPE_ID, {
      equippedProfileId: DEFAULT_EQUIPMENT_PROFILE_ID,
    }),
  });
  balancedGuardScene.applyTrainingEncounterPlayerResult({
    kind: 'guard',
    blockImpactSeconds: 0.2,
    blockImpactStrength: 1,
    blockstunSeconds: 0.3,
    hitStopSeconds: 0.04,
  });
  assert.equal(
    scene.executeDialogueCommand('weapon-merchant-karen-interaction', 'manage-heavy-sword').reason,
    PROGRESSION_TRANSACTION_REASON.UNAVAILABLE,
    '활성 무기상 대화 밖에서는 구매 command를 실행할 수 없어야 한다.',
  );
  const merchantDialogue = openWeaponMerchantDialogue(scene);
  assert.equal(merchantDialogue.active, true);
  assert.equal(merchantDialogue.speaker, '카린 무기상');
  const optionBefore = merchantDialogue.commands.find(
    (command) => command.profileId === HEAVY_PROFILE_ID,
  );
  assert.equal(optionBefore.canChoose, true);
  assert.equal(optionBefore.actionLabel, '120 Gold');
  assert.equal(scene.getWorldStatus().combatSkill.canTrain, true);
  assert.equal(
    scene.executeDialogueCommand('enchanter-lio-interaction', 'manage-heavy-sword').reason,
    PROGRESSION_TRANSACTION_REASON.UNAVAILABLE,
    '다른 NPC interaction ID로는 무기 구매를 위조할 수 없어야 한다.',
  );
  assert.equal(
    scene.executeDialogueCommand('weapon-merchant-karen-interaction', 'manage-unknown-sword')
      .reason,
    PROGRESSION_TRANSACTION_REASON.UNAVAILABLE,
    'authored 무기상 command 목록 밖의 ID는 실행할 수 없어야 한다.',
  );

  const purchaseResult = scene.executeDialogueCommand(
    'weapon-merchant-karen-interaction',
    'manage-heavy-sword',
  );
  assert.equal(purchaseResult.changed, true);
  assert.equal(purchaseResult.reason, PROGRESSION_TRANSACTION_REASON.PURCHASED);
  assert.ok(Object.isFrozen(purchaseResult));
  const status = scene.getWorldStatus();
  const heavyOption = status.dialogue.commands.find(
    (command) => command.profileId === HEAVY_PROFILE_ID,
  );
  assert.equal(heavyOption.active, true);
  assert.equal(heavyOption.actionLabel, '장착 중');
  assert.deepEqual(status.activeEnchantId, null, '새 검은 인챈트 없는 기본 상태여야 한다.');
  assert.equal(scene.getPlayerStatus().gold, 0);
  assert.equal(status.combatSkill.canTrain, false, '첫 보상으로 두 선택을 모두 살 수 없어야 한다.');

  const heavyAttack = scene.getAttackHitProfile('slash');
  const heavyFrames = scene.combatCommands.getMotionFrameData('slash').durationFrames;
  assert.ok(heavyAttack.range > balancedAttack.range, '중량형은 실제 타격 거리가 길어야 한다.');
  assert.ok(heavyAttack.hitstunScale > balancedAttack.hitstunScale);
  assert.ok(heavyFrames > balancedFrames, '중량형은 실제 command frame이 느려야 한다.');
  scene.applyTrainingEncounterPlayerResult({
    kind: 'guard',
    blockImpactSeconds: 0.2,
    blockImpactStrength: 1,
    blockstunSeconds: 0.3,
    hitStopSeconds: 0.04,
  });
  assert.ok(
    scene.playerBlockImpactStrength < balancedGuardScene.playerBlockImpactStrength,
    '중량형 방패는 동일 guard contact의 밀림 feedback을 줄여야 한다.',
  );
  assert.ok(
    scene.playerBlockstunSeconds < balancedGuardScene.playerBlockstunSeconds,
    '중량형 방패는 동일 guard contact의 blockstun을 줄여야 한다.',
  );
  scene.exitTree();

  const forgeScene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: returnedFirstJourneyProgression(),
  });
  forgeScene.enterTree();
  const forgeDialogue = openWeaponMerchantDialogue(forgeScene);
  assert.deepEqual(
    forgeDialogue.commands.map((command) => command.profileId),
    ARCHETYPE_PROFILE_IDS,
    '첫 클리어 재료가 있으면 구매 검 대신 세 archetype 선택만 보여야 한다.',
  );
  assert.ok(forgeDialogue.commands.every((command) => command.canChoose));
  assert.equal(
    forgeDialogue.commands[0].materialQuantity,
    FIRST_JOURNEY_WEAPON_FORGE_PROFILE.sourceQuantity,
  );
  const forgeResult = forgeScene.executeDialogueCommand(
    'weapon-merchant-karen-interaction',
    'forge-posture-breaker-sword',
  );
  assert.equal(forgeResult.changed, true);
  assert.equal(forgeResult.reason, PROGRESSION_TRANSACTION_REASON.FORGED);
  assert.equal(forgeScene.getWorldStatus().equipmentId, BREAKER_ARCHETYPE_ID);
  const forgedDialogue = forgeScene.getWorldStatus().dialogue;
  assert.deepEqual(
    forgedDialogue.commands.map((command) => command.profileId),
    [DEFAULT_EQUIPMENT_PROFILE_ID, HEAVY_PROFILE_ID, BREAKER_ARCHETYPE_ID],
    '선택 뒤에는 일반 구매 검과 선택한 archetype만 관리해야 한다.',
  );
  assert.equal(
    forgeScene.executeDialogueCommand(
      'weapon-merchant-karen-interaction',
      'forge-rear-punish-sword',
    ).reason,
    PROGRESSION_TRANSACTION_REASON.ALREADY_CHOSEN,
  );
  assert.equal(
    forgeScene.executeDialogueCommand('weapon-merchant-karen-interaction', 'manage-balanced-sword')
      .changed,
    true,
  );
  const selectedForgeOption = forgeScene
    .getWorldStatus()
    .dialogue.commands.find((command) => command.profileId === BREAKER_ARCHETYPE_ID);
  assert.equal(selectedForgeOption.canChoose, true);
  assert.equal(selectedForgeOption.actionLabel, '제작 선택 · 장착');
  assert.equal(
    forgeScene.executeDialogueCommand(
      'weapon-merchant-karen-interaction',
      'forge-posture-breaker-sword',
    ).changed,
    true,
  );
  assert.equal(forgeScene.getWorldStatus().equipmentId, BREAKER_ARCHETYPE_ID);
  forgeScene.exitTree();

  const skillScene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: returnedFirstJourneyProgression(),
  });
  const trainingResult = skillScene.trainCombatSkill();
  assert.equal(trainingResult.changed, true);
  assert.equal(trainingResult.reason, PROGRESSION_TRANSACTION_REASON.TRAINED);
  assert.ok(Object.isFrozen(trainingResult));
  assert.equal(skillScene.getProgressionSnapshot().combatSkillLevel, 1);
  assert.equal(skillScene.combatCommands.commandProfile.groundCombos, true);
  assert.equal(skillScene.combatCommands.commandProfile.loopCancel, false);
  assert.equal(skillScene.getPlayerStatus().gold, 0);
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

function verifyPersistenceAndFailure() {
  const scene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: returnedFirstJourneyProgression(),
  });
  scene.enterTree();
  openWeaponMerchantDialogue(scene);
  assert.equal(
    scene.executeDialogueCommand('weapon-merchant-karen-interaction', 'forge-rear-punish-sword')
      .changed,
    true,
  );
  const storageAdapter = new MemoryStorage();
  const storage = new ProgressionStorage(
    storageAdapter,
    'growth-check',
    ENCHANTMENT_CATALOG,
    FIRST_JOURNEY_WEAPON_FORGE_PROFILE,
  );
  const saved = storage.save(scene.getProgressionSnapshot());
  assert.equal(saved.ok, true);
  const loaded = storage.load(
    DEFAULT_EQUIPMENT_PROFILE_ID,
    EQUIPMENT_PROFILES.map((profile) => profile.id),
    ENCHANTMENT_CATALOG,
  );
  assert.equal(loaded.ok, true);
  assert.equal(loaded.snapshot.equippedEquipmentId, REAR_ARCHETYPE_ID);
  assert.equal(
    loaded.snapshot.weaponForge.selectedProfileIdsByGroup[
      FIRST_JOURNEY_WEAPON_FORGE_PROFILE.choiceGroupId
    ],
    REAR_ARCHETYPE_ID,
  );
  assert.equal(
    loaded.snapshot.weaponForge.materialQuantities[FIRST_JOURNEY_WEAPON_FORGE_PROFILE.materialId],
    0,
  );
  assert.equal(getAvailableGold(loaded.snapshot), 120, 'forge 선택은 Gold를 소비하지 않는다.');

  const restoredScene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: loaded.snapshot,
  });
  assert.equal(restoredScene.getWorldStatus().equipmentId, REAR_ARCHETYPE_ID);
  assert.equal(restoredScene.getPlayerStatus().gold, 120);

  const legacySeedAdapter = new MemoryStorage();
  assert.equal(
    new ProgressionStorage(
      legacySeedAdapter,
      'growth-v7-seed',
      ENCHANTMENT_CATALOG,
      FIRST_JOURNEY_WEAPON_FORGE_PROFILE,
    ).save(returnedFirstJourneyProgression()).ok,
    true,
  );
  const legacyV7Record = JSON.parse(legacySeedAdapter.value);
  legacyV7Record.version = 7;
  legacyV7Record.viewedConversationIds = ['first-journey-briefing'];
  delete legacyV7Record.weaponForge;
  const migratedV7 = new ProgressionStorage(
    new MemoryStorage(JSON.stringify(legacyV7Record)),
    'growth-v7-migration',
    ENCHANTMENT_CATALOG,
    FIRST_JOURNEY_WEAPON_FORGE_PROFILE,
  ).load(
    DEFAULT_EQUIPMENT_PROFILE_ID,
    EQUIPMENT_PROFILES.map((profile) => profile.id),
    ENCHANTMENT_CATALOG,
  );
  assert.equal(migratedV7.ok, true);
  assert.equal(migratedV7.kind, 'migrated');
  assert.deepEqual(migratedV7.snapshot.viewedConversationIds, ['first-journey-briefing']);
  assert.deepEqual(migratedV7.snapshot.weaponForge, {
    materialQuantities: {},
    claimedSourceIds: [],
    selectedProfileIdsByGroup: {},
  });

  const failingStorage = new ProgressionStorage(
    new MemoryStorage(null, { throwOnWrite: true }),
    'growth-check-failure',
    ENCHANTMENT_CATALOG,
    FIRST_JOURNEY_WEAPON_FORGE_PROFILE,
  );
  const failedSave = failingStorage.save(loaded.snapshot);
  assert.deepEqual(
    { ok: failedSave.ok, reason: failedSave.reason },
    { ok: false, reason: 'write-failed' },
  );
  assert.ok(Object.isFrozen(failedSave), '저장 실패 결과는 immutable이어야 한다.');
  scene.exitTree();

  for (const mutateForge of [
    (record) => {
      record.weaponForge.materialQuantities['unknown-forge-material'] = 1;
    },
    (record) => {
      record.weaponForge.claimedSourceIds.push('unknown-forge-source');
    },
    (record) => {
      record.weaponForge.selectedProfileIdsByGroup['unknown-choice-group'] = REAR_ARCHETYPE_ID;
    },
  ]) {
    const invalidRecord = JSON.parse(storageAdapter.value);
    mutateForge(invalidRecord);
    const invalidForge = new ProgressionStorage(
      new MemoryStorage(JSON.stringify(invalidRecord)),
      'growth-invalid-forge',
      ENCHANTMENT_CATALOG,
      FIRST_JOURNEY_WEAPON_FORGE_PROFILE,
    ).load(
      DEFAULT_EQUIPMENT_PROFILE_ID,
      EQUIPMENT_PROFILES.map((profile) => profile.id),
      ENCHANTMENT_CATALOG,
    );
    assert.equal(invalidForge.ok, false);
    assert.equal(invalidForge.reason, 'invalid-data');
  }

  const corrupt = new ProgressionStorage(
    new MemoryStorage('{broken'),
    'growth-corrupt',
    ENCHANTMENT_CATALOG,
    FIRST_JOURNEY_WEAPON_FORGE_PROFILE,
  ).load(
    DEFAULT_EQUIPMENT_PROFILE_ID,
    EQUIPMENT_PROFILES.map((profile) => profile.id),
    ENCHANTMENT_CATALOG,
  );
  assert.equal(corrupt.ok, false);
  assert.equal(corrupt.reason, 'parse-failed');
}

function verifyUiBoundaryAndInputParity() {
  const shellSource = readFileSync(new URL('../src/ui/gameShell.js', import.meta.url), 'utf8');
  assert.doesNotMatch(
    shellSource,
    /game\/equipment|game\/progression/,
    'UI adapter는 concrete equipment/progression profile을 import하면 안 된다.',
  );
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /aria-label="장비와 command 성장"/);
  assert.doesNotMatch(html, /class="equipment-grid"/);
  assert.doesNotMatch(html, /chooseEquipment\(option\)/);
  assert.match(html, /executeDialogueCommand\(command\)/);
  assert.match(html, /x-bind:aria-label="`\$\{dialogue\.speaker\} 대화 선택`"/);
  assert.match(html, /@click="trainCombatSkill"/);
  assert.match(html, /@touchend\.prevent="trainCombatSkill"/);
  for (const sourcePath of ['../src/app/GameApp.js', '../src/app/GameApplication.js']) {
    const source = readFileSync(new URL(sourcePath, import.meta.url), 'utf8');
    assert.doesNotMatch(
      source,
      /\n\s*(?:selectEquipment|purchaseEquipment)\(/,
      'Browser application boundary에 direct equipment entrypoint가 남으면 안 된다.',
    );
  }
}

function verifyAuthoredContentInjectionBoundary() {
  const gameSceneSource = readFileSync(
    new URL('../src/game/GameScene.js', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(
    gameSceneSource,
    /from ['"].*\/(?:equipment\/EquipmentProfiles|progression\/ProgressionProfiles)\.js['"];/,
    'GameScene은 concrete equipment/progression authored content를 import하면 안 된다.',
  );
  assert.match(gameSceneSource, /assertEquipmentCatalog\(equipmentCatalog\)/);
  assert.match(gameSceneSource, /assertCombatProgressionProfile\(combatProgressionProfile\)/);
  assert.match(gameSceneSource, /assertEncounterFactory\(encounterFactory\)/);
  assert.match(gameSceneSource, /assertEncounterAttackProfiles\(encounterAttackProfiles\)/);

  const encounterSource = readFileSync(
    new URL('../src/game/training/TrainingEncounterNode.js', import.meta.url),
    'utf8',
  );
  const presentationSource = readFileSync(
    new URL('../src/game/training/TrainingEncounterPresentation.js', import.meta.url),
    'utf8',
  );
  const roomSource = readFileSync(new URL('../src/game/room/RoomNode.js', import.meta.url), 'utf8');
  const forbiddenEncounterProfileImport =
    /from ['"].*(?:EncounterProfiles|TrainingEnemyAttackProfiles)\.js['"];?/;
  assert.match(
    "import { profile } from './TrainingEnemyAttackProfiles.js';",
    forbiddenEncounterProfileImport,
    'direct sibling attack profile import fixture를 regression이 잡아야 한다.',
  );
  assert.match(
    "import { profile } from '../encounter/EncounterProfiles.js';",
    forbiddenEncounterProfileImport,
    'parent-path encounter profile import fixture를 regression이 잡아야 한다.',
  );
  assert.doesNotMatch(
    encounterSource,
    forbiddenEncounterProfileImport,
    'Encounter domain은 concrete authored profile을 import하면 안 된다.',
  );
  assert.doesNotMatch(
    presentationSource,
    /from ['"].*\/TrainingEnemyAttackProfiles\.js['"];?/,
    'Encounter presentation은 concrete authored attack profile을 import하면 안 된다.',
  );
  assert.doesNotMatch(
    roomSource,
    /from ['"].*\/training\/TrainingEncounterNode\.js['"];?/,
    'Room domain은 concrete encounter Scene을 import하면 안 된다.',
  );
  assert.match(roomSource, /encounterFactory\(\{/);

  const gameAppSource = readFileSync(new URL('../src/app/GameApp.js', import.meta.url), 'utf8');
  assert.match(gameAppSource, /equipmentCatalog: EQUIPMENT_CATALOG/);
  assert.match(gameAppSource, /combatProgressionProfile: COMBAT_PROGRESSION_PROFILE/);
  assert.match(gameAppSource, /encounterProfiles: ENCOUNTER_PROFILES/);
  assert.match(gameAppSource, /attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES/);
  assert.match(gameAppSource, /encounterFactory: createTrainingEncounter/);
  assert.match(gameAppSource, /encounterAttackProfiles: TRAINING_ENEMY_ATTACK_PROFILES/);
}

verifyChoiceTransactions();
verifyWeaponArchetypeForgeTransactions();
verifyArchetypeCombatTradeoffs();
verifyRuntimeTradeoffsAndStatus();
verifyPersistenceAndFailure();
verifyUiBoundaryAndInputParity();
verifyAuthoredContentInjectionBoundary();

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      probe: 'first-journey-reward-growth-choice',
      checks: [
        'reward-choice-and-failure-reasons',
        'first-clear-material-idempotence-and-exclusive-archetype-forge',
        'swift-posture-break-and-rear-punish-combat-tradeoffs',
        'equipment-range-speed-hitstun-guard-tradeoff',
        'command-route-unlock',
        'idempotence-and-wallet-order',
        'schema-v9-archetype-round-trip-v7-migration-and-write-failure',
        'active-weapon-merchant-dialogue-only-and-static-equipment-ui-removal',
        'authored-content-composition-injection-boundary',
      ],
    },
    null,
    2,
  ),
);
