import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import {
  DEFAULT_EQUIPMENT_PROFILE_ID,
  getEquipmentProfile,
} from '../src/game/equipment/EquipmentProfiles.js';
import {
  getCombatSkillTrainingMarkRequirement,
  getCombatSkillUpgradeCost,
} from '../src/game/progression/ProgressionProfiles.js';
import {
  PROGRESSION_TRANSACTION_REASON,
  createProgressionSnapshot,
  getAvailableGold,
  mergeProgressionSnapshot,
  purchaseEquipment,
  selectEquipment,
  trainCombatSkill,
} from '../src/game/progression/ProgressionState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const HEAVY_PROFILE_ID = 'heavy-sword';

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

function verifyRuntimeTradeoffsAndStatus() {
  const scene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: returnedFirstJourneyProgression(),
  });
  const balancedAttack = scene.getAttackHitProfile('slash');
  const balancedFrames = scene.combatCommands.getMotionFrameData('slash').durationFrames;
  const balancedGuardScene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: returnedFirstJourneyProgression(),
  });
  balancedGuardScene.applyTrainingEncounterPlayerResult({
    kind: 'guard',
    blockImpactSeconds: 0.2,
    blockImpactStrength: 1,
    blockstunSeconds: 0.3,
    hitStopSeconds: 0.04,
  });
  const optionBefore = scene
    .getWorldStatus()
    .equipmentOptions.find((option) => option.id === HEAVY_PROFILE_ID);
  assert.equal(optionBefore.canChoose, true);
  assert.equal(optionBefore.actionLabel, '120 Gold');
  assert.equal(scene.getWorldStatus().combatSkill.canTrain, true);

  const purchaseResult = scene.purchaseEquipment(HEAVY_PROFILE_ID);
  assert.equal(purchaseResult.changed, true);
  assert.equal(purchaseResult.reason, PROGRESSION_TRANSACTION_REASON.PURCHASED);
  assert.ok(Object.isFrozen(purchaseResult));
  const status = scene.getWorldStatus();
  const heavyOption = status.equipmentOptions.find((option) => option.id === HEAVY_PROFILE_ID);
  assert.equal(heavyOption.selected, true);
  assert.equal(heavyOption.actionLabel, '장착 중');
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
  assert.equal(scene.purchaseEquipment(HEAVY_PROFILE_ID).changed, true);
  const storageAdapter = new MemoryStorage();
  const storage = new ProgressionStorage(storageAdapter, 'growth-check');
  const saved = storage.save(scene.getProgressionSnapshot());
  assert.equal(saved.ok, true);
  const loaded = storage.load(DEFAULT_EQUIPMENT_PROFILE_ID, [
    DEFAULT_EQUIPMENT_PROFILE_ID,
    HEAVY_PROFILE_ID,
  ]);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.snapshot.equippedEquipmentId, HEAVY_PROFILE_ID);
  assert.equal(getAvailableGold(loaded.snapshot), 0);

  const restoredScene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: loaded.snapshot,
  });
  assert.equal(restoredScene.getWorldStatus().equipmentId, HEAVY_PROFILE_ID);
  assert.equal(restoredScene.getPlayerStatus().gold, 0);

  const failingStorage = new ProgressionStorage(
    new MemoryStorage(null, { throwOnWrite: true }),
    'growth-check-failure',
  );
  const failedSave = failingStorage.save(loaded.snapshot);
  assert.deepEqual(
    { ok: failedSave.ok, reason: failedSave.reason },
    { ok: false, reason: 'write-failed' },
  );
  assert.ok(Object.isFrozen(failedSave), '저장 실패 결과는 immutable이어야 한다.');

  const corrupt = new ProgressionStorage(new MemoryStorage('{broken'), 'growth-corrupt').load(
    DEFAULT_EQUIPMENT_PROFILE_ID,
    [DEFAULT_EQUIPMENT_PROFILE_ID, HEAVY_PROFILE_ID],
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
  assert.match(html, /@click="chooseEquipment\(option\)"/);
  assert.match(html, /@touchend\.prevent="chooseEquipment\(option\)"/);
  assert.match(html, /@click="trainCombatSkill"/);
  assert.match(html, /@touchend\.prevent="trainCombatSkill"/);
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
        'equipment-range-speed-hitstun-guard-tradeoff',
        'command-route-unlock',
        'idempotence-and-wallet-order',
        'persistence-round-trip-and-write-failure',
        'ui-boundary-and-click-touch-parity',
        'authored-content-composition-injection-boundary',
      ],
    },
    null,
    2,
  ),
);
