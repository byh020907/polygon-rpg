export const JOURNEY_PHASE = Object.freeze({
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
      fieldGuardianDefeated: state.fieldGuardianDefeated,
      checkpointActivated: state.checkpointActivated,
      bossDefeated: state.bossDefeated,
      bossRewardClaimed: state.bossRewardClaimed,
    }),
  });
}

export class FirstJourneyProgress {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      phase: JOURNEY_PHASE.PREPARE,
      routeChoice: null,
      fieldGuardianDefeated: false,
      fieldWardActive: false,
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
    if (portalId === 'academy-field-portal') this.state.phase = JOURNEY_PHASE.FIELD;
    if (portalId === 'field-bypass-portal') {
      this.state.phase = JOURNEY_PHASE.FIELD;
      this.state.routeChoice = 'bypass';
    }
    if (portalId === 'field-dungeon-portal') {
      this.state.phase = JOURNEY_PHASE.DUNGEON;
      this.state.routeChoice ??= 'guardian-route';
    }
    if (portalId === 'bypass-dungeon-portal') {
      this.state.phase = JOURNEY_PHASE.DUNGEON;
      this.state.routeChoice = 'bypass';
    }
    if (portalId === 'dungeon-boss-portal') this.state.phase = JOURNEY_PHASE.BOSS;
    if (portalId === 'boss-shortcut-portal' && this.state.bossRewardClaimed) {
      this.state.phase = JOURNEY_PHASE.RETURNED;
      this.state.returnedWithReward = true;
    }
    return this.snapshot();
  }

  resolveEncounter(profileId) {
    if (profileId === 'field' && !this.state.fieldGuardianDefeated) {
      this.state.fieldGuardianDefeated = true;
      this.state.fieldWardActive = true;
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
    if (this.state.checkpointActivated) {
      return Object.freeze({ changed: false, snapshot: this.snapshot() });
    }
    this.state.checkpointActivated = true;
    this.state.checkpoint = { ...checkpoint };
    this.state.phase = JOURNEY_PHASE.CHECKPOINT;
    return Object.freeze({ changed: true, snapshot: this.snapshot() });
  }

  claimBossReward(gold = 120) {
    if (!this.state.bossDefeated || this.state.bossRewardClaimed) {
      return Object.freeze({ changed: false, snapshot: this.snapshot() });
    }
    this.state.bossRewardClaimed = true;
    this.state.gold += Math.max(0, Math.round(gold));
    return Object.freeze({
      changed: true,
      kind: 'boss-reward-claimed',
      snapshot: this.snapshot(),
    });
  }
}
