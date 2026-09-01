import {
  FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE,
  canonicalizeFirstJourneyDungeonSignatureStageIds,
} from '../journey/FirstJourneyDungeonSignature.js';

export const JOURNEY_PHASE = Object.freeze({
  PREPARE: 'prepare',
  FIELD: 'field',
  DUNGEON: 'dungeon',
  CHECKPOINT: 'checkpoint',
  BOSS: 'boss',
  REWARD: 'reward',
  RETURNED: 'returned',
});

export const JOURNEY_ROUTE = Object.freeze({
  GUARDIAN: 'guardian-route',
  BYPASS: 'bypass',
});

export const FIRST_JOURNEY_CHECKPOINT_ID =
  'academy-village:academy-region:sealed-forest-dungeon:sealed-forest-checkpoint';

const JOURNEY_PHASES = new Set(Object.values(JOURNEY_PHASE));
const JOURNEY_ROUTES = new Set(Object.values(JOURNEY_ROUTE));

function assertBoolean(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`${label}은(는) boolean이어야 합니다.`);
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label}은(는) 0 이상의 안전한 정수여야 합니다.`);
  }
}

function validateCheckpointId(checkpointId) {
  if (checkpointId === null) return null;
  if (checkpointId !== FIRST_JOURNEY_CHECKPOINT_ID) {
    throw new Error(`지원하지 않는 첫 원정 checkpoint ID입니다: ${checkpointId}`);
  }
  return checkpointId;
}

export function createFirstJourneyProgressSnapshot() {
  return Object.freeze({
    phase: JOURNEY_PHASE.PREPARE,
    routeChoice: null,
    fieldGuardianDefeated: false,
    dungeonGuardianDefeated: false,
    checkpointId: null,
    bossDefeated: false,
    bossRewardClaimed: false,
    returnedWithReward: false,
    gold: 0,
    dungeonSignatureStageIds: Object.freeze([]),
  });
}

export function toFirstJourneyProgressSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('첫 원정 snapshot은 객체여야 합니다.');
  }
  if (!JOURNEY_PHASES.has(snapshot.phase)) {
    throw new RangeError(`지원하지 않는 첫 원정 phase입니다: ${snapshot.phase}`);
  }
  if (snapshot.routeChoice !== null && !JOURNEY_ROUTES.has(snapshot.routeChoice)) {
    throw new RangeError(`지원하지 않는 첫 원정 route입니다: ${snapshot.routeChoice}`);
  }
  const checkpointId = validateCheckpointId(snapshot.checkpointId);
  assertBoolean(snapshot.fieldGuardianDefeated, 'Field guardian 격파 상태');
  assertBoolean(snapshot.dungeonGuardianDefeated, 'Dungeon guardian 격파 상태');
  assertBoolean(snapshot.bossDefeated, '첫 원정 Boss 격파 상태');
  assertBoolean(snapshot.bossRewardClaimed, '첫 원정 Boss 보상 상태');
  assertBoolean(snapshot.returnedWithReward, '첫 원정 귀환 상태');
  assertNonNegativeInteger(snapshot.gold, '첫 원정 gold');
  const inferredSignatureStageIds = [
    ...(snapshot.dungeonSignatureStageIds ?? []),
    ...([
      JOURNEY_PHASE.DUNGEON,
      JOURNEY_PHASE.CHECKPOINT,
      JOURNEY_PHASE.BOSS,
      JOURNEY_PHASE.REWARD,
      JOURNEY_PHASE.RETURNED,
    ].includes(snapshot.phase) ||
    snapshot.dungeonGuardianDefeated ||
    snapshot.bossDefeated
      ? [FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION]
      : []),
    ...(snapshot.dungeonGuardianDefeated || snapshot.bossDefeated
      ? [FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT]
      : []),
    ...(snapshot.bossDefeated ? [FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.BOSS_TEST] : []),
  ];
  const dungeonSignatureStageIds = canonicalizeFirstJourneyDungeonSignatureStageIds([
    ...new Set(inferredSignatureStageIds),
  ]);
  const dungeonSignatureStages = new Set(dungeonSignatureStageIds);
  if (
    dungeonSignatureStages.has(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT) !==
    snapshot.dungeonGuardianDefeated
  ) {
    throw new Error('guardian 전투 stage와 Dungeon guardian 격파 상태가 일치해야 합니다.');
  }
  if (
    dungeonSignatureStages.has(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.HIDDEN_BRANCH) &&
    !snapshot.dungeonGuardianDefeated
  ) {
    throw new Error('숨은 분기 stage에는 Dungeon guardian 격파가 필요합니다.');
  }
  if (
    dungeonSignatureStages.has(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.BOSS_TEST) !==
    snapshot.bossDefeated
  ) {
    throw new Error('Boss 시험 stage와 첫 원정 Boss 격파 상태가 일치해야 합니다.');
  }
  if (snapshot.bossRewardClaimed && !snapshot.bossDefeated) {
    throw new Error('첫 원정 Boss 보상은 Boss 격파 뒤에만 기록할 수 있습니다.');
  }
  if (snapshot.returnedWithReward && !snapshot.bossRewardClaimed) {
    throw new Error('첫 원정 보상 귀환은 Boss 보상 획득 뒤에만 기록할 수 있습니다.');
  }
  if ((snapshot.phase === JOURNEY_PHASE.RETURNED) !== snapshot.returnedWithReward) {
    throw new Error('첫 원정 returned phase와 귀환 상태가 일치해야 합니다.');
  }
  if (snapshot.phase === JOURNEY_PHASE.REWARD && !snapshot.bossDefeated) {
    throw new Error('첫 원정 reward phase에는 Boss 격파가 필요합니다.');
  }
  if (snapshot.phase === JOURNEY_PHASE.BOSS && checkpointId === null) {
    throw new Error('첫 원정 Boss phase에는 Dungeon checkpoint가 필요합니다.');
  }
  if (snapshot.bossDefeated && checkpointId === null) {
    throw new Error('첫 원정 Boss 격파에는 Dungeon checkpoint가 필요합니다.');
  }
  if (snapshot.phase === JOURNEY_PHASE.CHECKPOINT && checkpointId === null) {
    throw new Error('첫 원정 checkpoint phase에는 checkpoint 위치가 필요합니다.');
  }
  if (checkpointId !== null && !snapshot.dungeonGuardianDefeated) {
    throw new Error('첫 원정 checkpoint에는 Dungeon guardian 격파가 필요합니다.');
  }

  return Object.freeze({
    phase: snapshot.phase,
    routeChoice: snapshot.routeChoice,
    fieldGuardianDefeated: snapshot.fieldGuardianDefeated,
    dungeonGuardianDefeated: snapshot.dungeonGuardianDefeated,
    checkpointId,
    bossDefeated: snapshot.bossDefeated,
    bossRewardClaimed: snapshot.bossRewardClaimed,
    returnedWithReward: snapshot.returnedWithReward,
    gold: snapshot.gold,
    dungeonSignatureStageIds,
  });
}

function freezeSnapshot(state) {
  const canonical = toFirstJourneyProgressSnapshot(state);
  const checkpointActivated = canonical.checkpointId !== null;
  const fieldWardActive = canonical.fieldGuardianDefeated;
  const dungeonSignatureStages = new Set(canonical.dungeonSignatureStageIds);
  return Object.freeze({
    ...canonical,
    fieldWardActive,
    checkpointActivated,
    storyFlags: Object.freeze({
      fieldGuardianDefeated: canonical.fieldGuardianDefeated,
      dungeonGuardianDefeated: canonical.dungeonGuardianDefeated,
      checkpointActivated,
      bossDefeated: canonical.bossDefeated,
      bossRewardClaimed: canonical.bossRewardClaimed,
      returnedWithReward: canonical.returnedWithReward,
      dungeonSignatureIntroduced: dungeonSignatureStages.has(
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION,
      ),
      dungeonSignatureGuardianCombat: dungeonSignatureStages.has(
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT,
      ),
      dungeonSignatureHiddenBranch: dungeonSignatureStages.has(
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.HIDDEN_BRANCH,
      ),
      dungeonSignatureBossTest: dungeonSignatureStages.has(
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.BOSS_TEST,
      ),
    }),
  });
}

function rewardAmount(gold) {
  const amount = Number.isFinite(gold) ? Math.max(0, Math.round(gold)) : 0;
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError('첫 원정 Boss 보상은 안전한 정수 범위여야 합니다.');
  }
  return amount;
}

export class FirstJourneyProgress {
  constructor(snapshot = createFirstJourneyProgressSnapshot()) {
    this.restore(snapshot);
  }

  restore(snapshot) {
    const canonical = toFirstJourneyProgressSnapshot(snapshot);
    this.state = { ...canonical };
    return this.snapshot();
  }

  reset() {
    return this.restore(createFirstJourneyProgressSnapshot());
  }

  snapshot() {
    return freezeSnapshot(this.state);
  }

  persistenceSnapshot() {
    return toFirstJourneyProgressSnapshot(this.state);
  }

  recordPortal(portalId) {
    const previous = this.persistenceSnapshot();
    if (['field-dungeon-portal', 'bypass-dungeon-portal'].includes(portalId)) {
      this.recordDungeonSignatureStage(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION);
    }
    if (!this.state.returnedWithReward) {
      if (portalId === 'academy-field-portal') this.state.phase = JOURNEY_PHASE.FIELD;
      if (portalId === 'field-bypass-portal') {
        this.state.phase = JOURNEY_PHASE.FIELD;
        this.state.routeChoice = JOURNEY_ROUTE.BYPASS;
      }
      if (portalId === 'field-dungeon-portal') {
        this.state.phase = JOURNEY_PHASE.DUNGEON;
        this.state.routeChoice ??= JOURNEY_ROUTE.GUARDIAN;
      }
      if (portalId === 'bypass-dungeon-portal') {
        this.state.phase = JOURNEY_PHASE.DUNGEON;
        this.state.routeChoice = JOURNEY_ROUTE.BYPASS;
      }
      if (portalId === 'dungeon-boss-portal' && !this.state.bossDefeated) {
        this.state.phase = JOURNEY_PHASE.BOSS;
      }
      if (portalId === 'boss-shortcut-portal' && this.state.bossRewardClaimed) {
        this.state.phase = JOURNEY_PHASE.RETURNED;
        this.state.returnedWithReward = true;
      }
    }
    const current = this.persistenceSnapshot();
    const changed =
      current.phase !== previous.phase ||
      current.routeChoice !== previous.routeChoice ||
      current.returnedWithReward !== previous.returnedWithReward;
    const signatureChanged =
      current.dungeonSignatureStageIds.length !== previous.dungeonSignatureStageIds.length;
    return Object.freeze({ changed: changed || signatureChanged, snapshot: this.snapshot() });
  }

  recordDungeonSignatureStage(stageId) {
    const previous = this.persistenceSnapshot();
    if (previous.dungeonSignatureStageIds.includes(stageId)) {
      return Object.freeze({ changed: false, snapshot: this.snapshot() });
    }
    this.state.dungeonSignatureStageIds = canonicalizeFirstJourneyDungeonSignatureStageIds([
      ...previous.dungeonSignatureStageIds,
      stageId,
    ]);
    return Object.freeze({ changed: true, snapshot: this.snapshot() });
  }

  resolveEncounter(profileId, entityId = null) {
    if (entityId === 'sealed-dungeon-guardian') {
      if (this.state.dungeonGuardianDefeated) {
        return Object.freeze({
          changed: false,
          kind: 'already-resolved',
          snapshot: this.snapshot(),
        });
      }
      this.state.dungeonGuardianDefeated = true;
      this.recordDungeonSignatureStage(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION);
      this.recordDungeonSignatureStage(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT);
      return Object.freeze({
        changed: true,
        kind: 'dungeon-guardian-defeated',
        snapshot: this.snapshot(),
      });
    }
    if (profileId === 'field' && !this.state.fieldGuardianDefeated) {
      this.state.fieldGuardianDefeated = true;
      return Object.freeze({
        changed: true,
        kind: 'field-guardian-defeated',
        maxHealthBonus: 20,
        snapshot: this.snapshot(),
      });
    }
    if (profileId === 'boss' && !this.state.bossDefeated) {
      this.state.bossDefeated = true;
      this.state.phase = JOURNEY_PHASE.REWARD;
      this.recordDungeonSignatureStage(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION);
      this.recordDungeonSignatureStage(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT);
      this.recordDungeonSignatureStage(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.BOSS_TEST);
      return Object.freeze({
        changed: true,
        kind: 'boss-defeated',
        snapshot: this.snapshot(),
      });
    }
    return Object.freeze({ changed: false, kind: 'already-resolved', snapshot: this.snapshot() });
  }

  activateCheckpoint(checkpointId) {
    if (this.state.checkpointId !== null) {
      return Object.freeze({ changed: false, snapshot: this.snapshot() });
    }
    this.state.checkpointId = validateCheckpointId(checkpointId);
    this.state.phase = JOURNEY_PHASE.CHECKPOINT;
    return Object.freeze({ changed: true, snapshot: this.snapshot() });
  }

  claimBossReward(gold = 120) {
    if (!this.state.bossDefeated || this.state.bossRewardClaimed) {
      return Object.freeze({ changed: false, snapshot: this.snapshot() });
    }
    const amount = rewardAmount(gold);
    const nextGold = this.state.gold + amount;
    if (!Number.isSafeInteger(nextGold)) {
      throw new RangeError('첫 원정 gold가 안전한 정수 범위를 넘습니다.');
    }
    this.state.bossRewardClaimed = true;
    this.state.gold = nextGold;
    return Object.freeze({
      changed: true,
      kind: 'boss-reward-claimed',
      snapshot: this.snapshot(),
    });
  }
}
