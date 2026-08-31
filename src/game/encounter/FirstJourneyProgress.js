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

function copyCheckpoint(checkpoint) {
  if (checkpoint === null) return null;
  if (!checkpoint || typeof checkpoint !== 'object' || Array.isArray(checkpoint)) {
    throw new TypeError('첫 원정 checkpoint는 객체 또는 null이어야 합니다.');
  }
  for (const key of ['regionId', 'roomId']) {
    if (typeof checkpoint[key] !== 'string' || checkpoint[key].trim().length === 0) {
      throw new TypeError(`첫 원정 checkpoint ${key}는 비어 있지 않은 문자열이어야 합니다.`);
    }
  }
  if (
    !checkpoint.position ||
    typeof checkpoint.position !== 'object' ||
    Array.isArray(checkpoint.position) ||
    !Number.isFinite(checkpoint.position.x) ||
    !Number.isFinite(checkpoint.position.y)
  ) {
    throw new TypeError('첫 원정 checkpoint position에는 유한한 x/y가 필요합니다.');
  }
  return Object.freeze({
    regionId: checkpoint.regionId,
    roomId: checkpoint.roomId,
    position: Object.freeze({ x: checkpoint.position.x, y: checkpoint.position.y }),
  });
}

export function createFirstJourneyProgressSnapshot() {
  return Object.freeze({
    phase: JOURNEY_PHASE.PREPARE,
    routeChoice: null,
    fieldGuardianDefeated: false,
    dungeonGuardianDefeated: false,
    checkpoint: null,
    bossDefeated: false,
    bossRewardClaimed: false,
    returnedWithReward: false,
    gold: 0,
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
  const checkpoint = copyCheckpoint(snapshot.checkpoint);
  assertBoolean(snapshot.fieldGuardianDefeated, 'Field guardian 격파 상태');
  assertBoolean(snapshot.dungeonGuardianDefeated, 'Dungeon guardian 격파 상태');
  assertBoolean(snapshot.bossDefeated, '첫 원정 Boss 격파 상태');
  assertBoolean(snapshot.bossRewardClaimed, '첫 원정 Boss 보상 상태');
  assertBoolean(snapshot.returnedWithReward, '첫 원정 귀환 상태');
  assertNonNegativeInteger(snapshot.gold, '첫 원정 gold');
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
  if (snapshot.phase === JOURNEY_PHASE.CHECKPOINT && checkpoint === null) {
    throw new Error('첫 원정 checkpoint phase에는 checkpoint 위치가 필요합니다.');
  }

  return Object.freeze({
    phase: snapshot.phase,
    routeChoice: snapshot.routeChoice,
    fieldGuardianDefeated: snapshot.fieldGuardianDefeated,
    dungeonGuardianDefeated: snapshot.dungeonGuardianDefeated,
    checkpoint,
    bossDefeated: snapshot.bossDefeated,
    bossRewardClaimed: snapshot.bossRewardClaimed,
    returnedWithReward: snapshot.returnedWithReward,
    gold: snapshot.gold,
  });
}

function freezeSnapshot(state) {
  const canonical = toFirstJourneyProgressSnapshot(state);
  const checkpointActivated = canonical.checkpoint !== null;
  const fieldWardActive = canonical.fieldGuardianDefeated;
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
    return Object.freeze({ changed, snapshot: this.snapshot() });
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
      return Object.freeze({
        changed: true,
        kind: 'boss-defeated',
        snapshot: this.snapshot(),
      });
    }
    return Object.freeze({ changed: false, kind: 'already-resolved', snapshot: this.snapshot() });
  }

  activateCheckpoint(checkpoint) {
    if (this.state.checkpoint !== null) {
      return Object.freeze({ changed: false, snapshot: this.snapshot() });
    }
    this.state.checkpoint = copyCheckpoint(checkpoint);
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
