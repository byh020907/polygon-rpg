export const REGION_EXPANSION_PHASE = Object.freeze({
  PREPARE: 'prepare',
  FIELD: 'field',
  DUNGEON: 'dungeon',
  CHECKPOINT: 'checkpoint',
  BOSS: 'boss',
  REWARD: 'reward',
  RETURNED: 'returned',
});

const REGION_EXPANSION_PHASES = new Set(Object.values(REGION_EXPANSION_PHASE));

export const REGION_EXPANSION_CHECKPOINT_ID =
  'academy-village:glasswind-region:glasswind-observatory:glasswind-checkpoint';

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
  if (checkpointId !== REGION_EXPANSION_CHECKPOINT_ID) {
    throw new Error(`지원하지 않는 Glasswind checkpoint ID입니다: ${checkpointId}`);
  }
  return checkpointId;
}

export function createRegionExpansionProgressSnapshot() {
  return Object.freeze({
    phase: REGION_EXPANSION_PHASE.PREPARE,
    glasswindHunterDefeated: false,
    checkpointId: null,
    bossDefeated: false,
    bossRewardClaimed: false,
    returnedWithReward: false,
    gold: 0,
  });
}

export function toRegionExpansionProgressSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('Glasswind 진행 snapshot은 객체여야 합니다.');
  }
  if (!REGION_EXPANSION_PHASES.has(snapshot.phase)) {
    throw new RangeError(`지원하지 않는 Glasswind phase입니다: ${snapshot.phase}`);
  }
  const checkpointId = validateCheckpointId(snapshot.checkpointId);
  assertBoolean(snapshot.glasswindHunterDefeated, 'Glasswind hunter 격파 상태');
  assertBoolean(snapshot.bossDefeated, 'Glasswind Boss 격파 상태');
  assertBoolean(snapshot.bossRewardClaimed, 'Glasswind Boss 보상 상태');
  assertBoolean(snapshot.returnedWithReward, 'Glasswind 귀환 상태');
  assertNonNegativeInteger(snapshot.gold, 'Glasswind gold');
  if (snapshot.bossRewardClaimed && !snapshot.bossDefeated) {
    throw new Error('Glasswind Boss 보상은 Boss 격파 뒤에만 기록할 수 있습니다.');
  }
  if (snapshot.returnedWithReward && !snapshot.bossRewardClaimed) {
    throw new Error('Glasswind 보상 귀환은 Boss 보상 획득 뒤에만 기록할 수 있습니다.');
  }
  if ((snapshot.phase === REGION_EXPANSION_PHASE.RETURNED) !== snapshot.returnedWithReward) {
    throw new Error('Glasswind returned phase와 귀환 상태가 일치해야 합니다.');
  }
  if (snapshot.phase === REGION_EXPANSION_PHASE.REWARD && !snapshot.bossDefeated) {
    throw new Error('Glasswind reward phase에는 Boss 격파가 필요합니다.');
  }
  if (snapshot.phase === REGION_EXPANSION_PHASE.CHECKPOINT && checkpointId === null) {
    throw new Error('Glasswind checkpoint phase에는 checkpoint 위치가 필요합니다.');
  }

  return Object.freeze({
    phase: snapshot.phase,
    glasswindHunterDefeated: snapshot.glasswindHunterDefeated,
    checkpointId,
    bossDefeated: snapshot.bossDefeated,
    bossRewardClaimed: snapshot.bossRewardClaimed,
    returnedWithReward: snapshot.returnedWithReward,
    gold: snapshot.gold,
  });
}

function freezeSnapshot(state) {
  const canonical = toRegionExpansionProgressSnapshot(state);
  const checkpointActivated = canonical.checkpointId !== null;
  const glasswindBridgeStable = canonical.glasswindHunterDefeated;
  return Object.freeze({
    ...canonical,
    glasswindBridgeStable,
    checkpointActivated,
    storyFlags: Object.freeze({
      glasswindHunterDefeated: canonical.glasswindHunterDefeated,
      glasswindBridgeStable,
      glasswindCheckpointActivated: checkpointActivated,
      glasswindBossDefeated: canonical.bossDefeated,
      glasswindRewardClaimed: canonical.bossRewardClaimed,
    }),
  });
}

function rewardAmount(gold) {
  const amount = Number.isFinite(gold) ? Math.max(0, Math.round(gold)) : 0;
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError('Glasswind Boss 보상은 안전한 정수 범위여야 합니다.');
  }
  return amount;
}

export class RegionExpansionProgress {
  constructor(snapshot = createRegionExpansionProgressSnapshot()) {
    this.restore(snapshot);
  }

  restore(snapshot) {
    const canonical = toRegionExpansionProgressSnapshot(snapshot);
    this.state = { ...canonical };
    return this.snapshot();
  }

  reset() {
    return this.restore(createRegionExpansionProgressSnapshot());
  }

  snapshot() {
    return freezeSnapshot(this.state);
  }

  persistenceSnapshot() {
    return toRegionExpansionProgressSnapshot(this.state);
  }

  recordPortal(portalId) {
    const previous = this.persistenceSnapshot();
    if (!this.state.returnedWithReward) {
      if (portalId === 'academy-glasswind-portal') {
        this.state.phase = REGION_EXPANSION_PHASE.FIELD;
      }
      if (portalId === 'glasswind-dungeon-portal') {
        this.state.phase = REGION_EXPANSION_PHASE.DUNGEON;
      }
      if (portalId === 'glasswind-boss-portal' && !this.state.bossDefeated) {
        this.state.phase = REGION_EXPANSION_PHASE.BOSS;
      }
      if (portalId === 'glasswind-shortcut-portal' && this.state.bossRewardClaimed) {
        this.state.phase = REGION_EXPANSION_PHASE.RETURNED;
        this.state.returnedWithReward = true;
      }
    }
    const current = this.persistenceSnapshot();
    const changed =
      current.phase !== previous.phase ||
      current.returnedWithReward !== previous.returnedWithReward;
    return Object.freeze({ changed, snapshot: this.snapshot() });
  }

  resolveEncounter(profileId) {
    if (profileId === 'glasswind-field' && !this.state.glasswindHunterDefeated) {
      this.state.glasswindHunterDefeated = true;
      return Object.freeze({
        changed: true,
        kind: 'glasswind-hunter-defeated',
        snapshot: this.snapshot(),
      });
    }
    if (profileId === 'glasswind-boss' && !this.state.bossDefeated) {
      this.state.bossDefeated = true;
      this.state.phase = REGION_EXPANSION_PHASE.REWARD;
      return Object.freeze({
        changed: true,
        kind: 'glasswind-boss-defeated',
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
    this.state.phase = REGION_EXPANSION_PHASE.CHECKPOINT;
    return Object.freeze({ changed: true, snapshot: this.snapshot() });
  }

  claimBossReward(gold = 180) {
    if (!this.state.bossDefeated || this.state.bossRewardClaimed) {
      return Object.freeze({ changed: false, snapshot: this.snapshot() });
    }
    const amount = rewardAmount(gold);
    const nextGold = this.state.gold + amount;
    if (!Number.isSafeInteger(nextGold)) {
      throw new RangeError('Glasswind gold가 안전한 정수 범위를 넘습니다.');
    }
    this.state.bossRewardClaimed = true;
    this.state.gold = nextGold;
    return Object.freeze({
      changed: true,
      kind: 'glasswind-reward-claimed',
      snapshot: this.snapshot(),
    });
  }
}
