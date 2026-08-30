export const REGION_EXPANSION_PHASE = Object.freeze({
  PREPARE: 'prepare',
  FIELD: 'field',
  DUNGEON: 'dungeon',
  CHECKPOINT: 'checkpoint',
  BOSS: 'boss',
  REWARD: 'reward',
  RETURNED: 'returned',
});

function freezeSnapshot(state) {
  return Object.freeze({
    ...state,
    checkpoint: state.checkpoint ? Object.freeze({ ...state.checkpoint }) : null,
    storyFlags: Object.freeze({
      glasswindHunterDefeated: state.glasswindHunterDefeated,
      glasswindBridgeStable: state.glasswindBridgeStable,
      glasswindCheckpointActivated: state.checkpointActivated,
      glasswindBossDefeated: state.bossDefeated,
      glasswindRewardClaimed: state.bossRewardClaimed,
    }),
  });
}

export class RegionExpansionProgress {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      phase: REGION_EXPANSION_PHASE.PREPARE,
      glasswindHunterDefeated: false,
      glasswindBridgeStable: false,
      checkpointActivated: false,
      checkpoint: null,
      bossDefeated: false,
      bossRewardClaimed: false,
      returnedWithReward: false,
      gold: 0,
    };
    return this.snapshot();
  }

  snapshot() {
    return freezeSnapshot(this.state);
  }

  recordPortal(portalId) {
    if (portalId === 'academy-glasswind-portal') {
      this.state.phase = REGION_EXPANSION_PHASE.FIELD;
    }
    if (portalId === 'glasswind-dungeon-portal') {
      this.state.phase = REGION_EXPANSION_PHASE.DUNGEON;
    }
    if (portalId === 'glasswind-boss-portal') {
      this.state.phase = REGION_EXPANSION_PHASE.BOSS;
    }
    if (portalId === 'glasswind-shortcut-portal' && this.state.bossRewardClaimed) {
      this.state.phase = REGION_EXPANSION_PHASE.RETURNED;
      this.state.returnedWithReward = true;
    }
    return this.snapshot();
  }

  resolveEncounter(profileId) {
    if (profileId === 'glasswind-field' && !this.state.glasswindHunterDefeated) {
      this.state.glasswindHunterDefeated = true;
      this.state.glasswindBridgeStable = true;
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

  activateCheckpoint(checkpoint) {
    if (this.state.checkpointActivated) {
      return Object.freeze({ changed: false, snapshot: this.snapshot() });
    }
    this.state.checkpointActivated = true;
    this.state.checkpoint = { ...checkpoint };
    this.state.phase = REGION_EXPANSION_PHASE.CHECKPOINT;
    return Object.freeze({ changed: true, snapshot: this.snapshot() });
  }

  claimBossReward(gold = 180) {
    if (!this.state.bossDefeated || this.state.bossRewardClaimed) {
      return Object.freeze({ changed: false, snapshot: this.snapshot() });
    }
    this.state.bossRewardClaimed = true;
    this.state.gold += Math.max(0, Math.round(gold));
    return Object.freeze({
      changed: true,
      kind: 'glasswind-reward-claimed',
      snapshot: this.snapshot(),
    });
  }
}
