import { combatFramesToSeconds, defineCombatFrame, sampleCombatFrame } from './CombatFrame.js';

const COMMAND_INPUTS = Object.freeze([
  Object.freeze({ input: 'strongAttack', motion: 'heavy' }),
  Object.freeze({ input: 'basicAttack', motion: 'slash' }),
]);

const STRONG_MOTION_IDS = Object.freeze(new Set(['heavy', 'rising', 'airHeavy', 'airSpin']));

export const DEFAULT_COMBAT_STAMINA_PROFILE = Object.freeze({
  maximum: 100,
  recoveryPerSecond: 24,
  recoveryDelaySeconds: 0.45,
  costs: Object.freeze({
    basicAttack: 12,
    strongAttack: 24,
    guard: 6,
    roll: 18,
    block: 34,
  }),
});

const INPUT_NAMES = Object.freeze(COMMAND_INPUTS.map(({ input }) => input));
const COMBO_MOTION_BY_STARTER = Object.freeze({
  slash: Object.freeze({
    basicAttack: 'thrust',
    strongAttack: 'rising',
  }),
  heavy: Object.freeze({
    basicAttack: 'spin',
  }),
});
const AIR_COMMAND_MOTIONS = Object.freeze({
  basicAttack: 'airSlash',
  strongAttack: 'airHeavy',
});
const AIR_COMBO_MOTION_BY_STARTER = Object.freeze({
  airSlash: Object.freeze({
    basicAttack: 'airReturn',
    strongAttack: 'airSpin',
  }),
  airHeavy: Object.freeze({
    basicAttack: 'airCross',
  }),
});
const AIR_MOTION_IDS = Object.freeze(
  new Set(['airSlash', 'airHeavy', 'airReturn', 'airSpin', 'airCross']),
);
const DEFAULT_COMMAND_PROFILE = Object.freeze({
  groundCombos: true,
  airCombos: true,
  loopCancel: true,
  maxAirActions: Number.MAX_SAFE_INTEGER,
});
const COMBO_CONTINUATIONS = Object.freeze(
  new Set([
    ...Object.entries(COMBO_MOTION_BY_STARTER).flatMap(([starter, branches]) =>
      Object.values(branches).map((motion) => `${starter}:${motion}`),
    ),
    ...Object.entries(AIR_COMBO_MOTION_BY_STARTER).flatMap(([starter, branches]) =>
      Object.values(branches).map((motion) => `${starter}:${motion}`),
    ),
  ]),
);
const TRANSITION_SECONDS_BY_MOTION = Object.freeze({
  thrust: 0.06,
  rising: 0.06,
  spin: 0.08,
  airReturn: 0.075,
  airSpin: 0.06,
  airCross: 0.075,
});

function motionPolicy(
  label,
  durationFrames,
  movementScale,
  { canJump = false, chainStartFrame } = {},
) {
  if (durationFrames === 0) {
    return Object.freeze({ label, durationFrames, durationSeconds: 0, movementScale, canJump });
  }
  const startupFrames = Math.max(1, Math.round(durationFrames * 0.35));
  const activeFrames = Math.max(1, Math.round(durationFrames * 0.33));
  const frame = defineCombatFrame({
    durationFrames,
    startupFrames,
    activeFrames,
    chainStartFrame: chainStartFrame ?? Math.round(durationFrames * 0.74),
  });
  return Object.freeze({
    label,
    durationFrames,
    durationSeconds: combatFramesToSeconds(durationFrames),
    movementScale,
    canJump,
    frame,
  });
}

const BASE_COMBAT_MOTION_POLICIES = Object.freeze({
  idle: motionPolicy('대기', 0, 1, { canJump: true }),
  slash: motionPolicy('기본 베기', 31, 0.28),
  thrust: motionPolicy('찌르기', 25, 0.18),
  heavy: motionPolicy('강한 내려베기', 46, 0.08),
  rising: motionPolicy('올려베기', 36, 0.16),
  spin: motionPolicy('회전 공격', 49, 0.45, { chainStartFrame: 38 }),
  airSlash: motionPolicy('공중 베기', 25, 1, { chainStartFrame: 16 }),
  airHeavy: motionPolicy('공중 내려베기', 30, 0.82, { chainStartFrame: 17 }),
  airReturn: motionPolicy('공중 되베기', 24, 1, { chainStartFrame: 15 }),
  airSpin: motionPolicy('공중 회전', 41, 1, { chainStartFrame: 29 }),
  airCross: motionPolicy('공중 교차 베기', 30, 1, { chainStartFrame: 22 }),
  guard: motionPolicy('방어', 0, 0.22),
});

function baseCombatMotionPolicy(id) {
  const policy = BASE_COMBAT_MOTION_POLICIES[id];
  if (!policy) throw new Error(`알 수 없는 combat motion입니다: ${id}`);
  return policy;
}

function normalizeTimingProfile(timingProfile = {}) {
  const startupScale = timingProfile.startupScale ?? 1;
  const recoveryScale = timingProfile.recoveryScale ?? 1;
  if (!(Number.isFinite(startupScale) && startupScale > 0)) {
    throw new RangeError('combat timing startupScale은 0보다 커야 합니다.');
  }
  if (!(Number.isFinite(recoveryScale) && recoveryScale > 0)) {
    throw new RangeError('combat timing recoveryScale은 0보다 커야 합니다.');
  }
  return Object.freeze({ startupScale, recoveryScale });
}

function normalizeCommandProfile(commandProfile = {}) {
  const maxAirActions = commandProfile.maxAirActions ?? DEFAULT_COMMAND_PROFILE.maxAirActions;
  if (!Number.isSafeInteger(maxAirActions) || maxAirActions < 1) {
    throw new RangeError('command profile maxAirActions는 1 이상의 정수여야 합니다.');
  }
  return Object.freeze({
    groundCombos: commandProfile.groundCombos ?? DEFAULT_COMMAND_PROFILE.groundCombos,
    airCombos: commandProfile.airCombos ?? DEFAULT_COMMAND_PROFILE.airCombos,
    loopCancel: commandProfile.loopCancel ?? DEFAULT_COMMAND_PROFILE.loopCancel,
    maxAirActions,
  });
}

function normalizeStaminaProfile(staminaProfile = {}) {
  const costs = Object.freeze({
    ...DEFAULT_COMBAT_STAMINA_PROFILE.costs,
    ...(staminaProfile.costs ?? {}),
  });
  const normalized = {
    maximum: staminaProfile.maximum ?? DEFAULT_COMBAT_STAMINA_PROFILE.maximum,
    recoveryPerSecond:
      staminaProfile.recoveryPerSecond ?? DEFAULT_COMBAT_STAMINA_PROFILE.recoveryPerSecond,
    recoveryDelaySeconds:
      staminaProfile.recoveryDelaySeconds ?? DEFAULT_COMBAT_STAMINA_PROFILE.recoveryDelaySeconds,
    costs,
  };
  for (const [key, value] of Object.entries(normalized)) {
    if (key === 'costs') continue;
    if (!Number.isFinite(value) || value < 0 || (key === 'maximum' && value <= 0)) {
      throw new RangeError(`combat stamina ${key} 값이 올바르지 않습니다.`);
    }
  }
  for (const [action, cost] of Object.entries(costs)) {
    if (!Number.isFinite(cost) || cost < 0 || cost > normalized.maximum) {
      throw new RangeError(`combat stamina ${action} 비용이 올바르지 않습니다.`);
    }
  }
  return Object.freeze(normalized);
}

export function isStrongCombatMotion(motionId) {
  return STRONG_MOTION_IDS.has(motionId);
}

function scaleMotionPolicy(policy, timingProfile) {
  if (!policy.frame) return policy;
  const startupFrames = Math.max(
    1,
    Math.round(policy.frame.startupFrames * timingProfile.startupScale),
  );
  const activeFrames = policy.frame.activeFrames;
  const recoveryFrames = Math.max(
    0,
    Math.round(policy.frame.recoveryFrames * timingProfile.recoveryScale),
  );
  const durationFrames = startupFrames + activeFrames + recoveryFrames;
  const baseActiveEnd = policy.frame.startupFrames + policy.frame.activeFrames;
  const chainRecoveryOffset = Math.max(0, policy.frame.chainStartFrame - baseActiveEnd);
  const chainStartFrame = Math.min(
    durationFrames,
    startupFrames + activeFrames + Math.round(chainRecoveryOffset * timingProfile.recoveryScale),
  );
  const frame = defineCombatFrame({
    durationFrames,
    startupFrames,
    activeFrames,
    chainStartFrame,
  });
  return Object.freeze({
    ...policy,
    durationFrames,
    durationSeconds: combatFramesToSeconds(durationFrames),
    frame,
  });
}

function combatMotionPolicy(id, timingProfile) {
  return scaleMotionPolicy(baseCombatMotionPolicy(id), timingProfile);
}

export function combatMotionFrameData(id, timingProfile = {}) {
  return combatMotionPolicy(id, normalizeTimingProfile(timingProfile)).frame ?? null;
}

export class CombatCommandController {
  constructor({ timingProfile, commandProfile, staminaProfile } = {}) {
    this.timingProfile = normalizeTimingProfile(timingProfile);
    this.commandProfile = normalizeCommandProfile(commandProfile);
    this.staminaProfile = normalizeStaminaProfile(staminaProfile);
    this.reset();
  }

  setTimingProfile(timingProfile) {
    if (this.active) throw new Error('전투 motion 중에는 장비 timing을 바꿀 수 없습니다.');
    this.timingProfile = normalizeTimingProfile(timingProfile);
    return this.timingProfile;
  }

  setCommandProfile(commandProfile) {
    if (this.active) throw new Error('전투 motion 중에는 command profile을 바꿀 수 없습니다.');
    this.commandProfile = normalizeCommandProfile(commandProfile);
    return this.commandProfile;
  }

  setStaminaProfile(staminaProfile) {
    if (this.active) throw new Error('전투 motion 중에는 stamina profile을 바꿀 수 없습니다.');
    this.staminaProfile = normalizeStaminaProfile(staminaProfile);
    this.stamina = Math.min(this.stamina, this.staminaProfile.maximum);
    return this.staminaProfile;
  }

  getMotionFrameData(id) {
    return combatMotionPolicy(id, this.timingProfile).frame ?? null;
  }

  reset() {
    this.active = null;
    this.queuedMotion = null;
    this.sequence = 0;
    this.comboCycle = 0;
    this.airActions = 0;
    this.heldPose = 'idle';
    this.stamina = this.staminaProfile.maximum;
    this.staminaRecoveryDelaySeconds = 0;
    this.lastStaminaAction = null;
    this.lastCommandTransition = null;
    this.continueNextStarterInCombo = false;
    this.previousGuardInput = false;
    this.previousInputs = Object.fromEntries(INPUT_NAMES.map((name) => [name, false]));
    this.previousSequences = Object.fromEntries(INPUT_NAMES.map((name) => [name, 0]));
  }

  update(
    deltaSeconds,
    inputSnapshot,
    {
      acceptCommands = true,
      isAirborne = false,
      allowGuard = true,
      staminaDeltaSeconds = deltaSeconds,
    } = {},
  ) {
    if (!isAirborne) this.airActions = 0;
    this.advanceStamina(staminaDeltaSeconds, {
      canRecover: !this.active && this.heldPose !== 'guard' && !inputSnapshot.guard,
    });
    const issuedCommand = acceptCommands
      ? this.readIssuedMotion(inputSnapshot, { isAirborne })
      : null;
    if (this.active) {
      this.active.elapsedSeconds += deltaSeconds;
      if (issuedCommand && isAirborne && !AIR_MOTION_IDS.has(this.active.id)) {
        this.active = null;
        this.queuedMotion = null;
        this.startIssuedCommand(issuedCommand);
      } else if (issuedCommand) {
        this.queuedMotion = issuedCommand;
      }
      const chainStartSeconds = combatFramesToSeconds(
        combatMotionPolicy(this.active.id, this.timingProfile).frame.chainStartFrame,
      );
      if (
        (this.queuedMotion && this.active.elapsedSeconds >= chainStartSeconds) ||
        this.active.elapsedSeconds >= this.active.durationSeconds
      ) {
        const transitionFrom = this.snapshot();
        const nextCommand = this.queuedMotion;
        this.active = null;
        this.queuedMotion = null;
        if (nextCommand) {
          const continuesCombo = this.continuesComboRoute(transitionFrom.id, nextCommand.motionId);
          this.startIssuedCommand(nextCommand, transitionFrom, { continuesCombo });
        }
      }
    } else if (issuedCommand) {
      this.startIssuedCommand(issuedCommand, null, {
        continuesCombo: this.continueNextStarterInCombo,
      });
      this.continueNextStarterInCombo = false;
    }

    const wantsGuard = acceptCommands && allowGuard && !this.active && Boolean(inputSnapshot.guard);
    if (wantsGuard && this.heldPose === 'guard') {
      this.heldPose = 'guard';
    } else if (
      wantsGuard &&
      !this.previousGuardInput &&
      this.trySpendStamina('guard', { transitionKind: 'guard-started' })
    ) {
      this.heldPose = 'guard';
    } else {
      this.heldPose = 'idle';
    }
    this.previousGuardInput = Boolean(inputSnapshot.guard);
    for (const inputName of INPUT_NAMES) {
      this.previousInputs[inputName] = Boolean(inputSnapshot[inputName]);
      const sequence = inputSnapshot[`${inputName}Sequence`];
      if (Number.isSafeInteger(sequence)) this.previousSequences[inputName] = sequence;
    }
    return this.snapshot();
  }

  readIssuedMotion(inputSnapshot, { isAirborne = false } = {}) {
    for (const command of COMMAND_INPUTS) {
      const sequence = inputSnapshot[`${command.input}Sequence`];
      const sequenceIssued =
        Number.isSafeInteger(sequence) && sequence > this.previousSequences[command.input];
      const booleanEdgeIssued =
        !Number.isSafeInteger(sequence) &&
        inputSnapshot[command.input] &&
        !this.previousInputs[command.input];
      if (sequenceIssued || booleanEdgeIssued) {
        if (!this.canAfford(command.input)) {
          this.recordRejectedAction(command.input);
          return null;
        }
        if (isAirborne) {
          if (this.airActions >= this.commandProfile.maxAirActions) return null;
          const branch = AIR_COMBO_MOTION_BY_STARTER[this.active?.id]?.[command.input];
          if (branch && this.commandProfile.airCombos) {
            return Object.freeze({ motionId: branch, action: command.input });
          }
          if (
            !this.active ||
            !AIR_MOTION_IDS.has(this.active.id) ||
            this.commandProfile.loopCancel
          ) {
            return Object.freeze({
              motionId: AIR_COMMAND_MOTIONS[command.input],
              action: command.input,
            });
          }
          return null;
        }
        const branch = COMBO_MOTION_BY_STARTER[this.active?.id]?.[command.input];
        if (branch && this.commandProfile.groundCombos) {
          return Object.freeze({ motionId: branch, action: command.input });
        }
        if (!this.active || this.commandProfile.loopCancel) {
          return Object.freeze({ motionId: command.motion, action: command.input });
        }
        return null;
      }
    }
    return null;
  }

  canAfford(action) {
    const cost = this.staminaProfile.costs[action];
    if (!Number.isFinite(cost)) throw new Error(`알 수 없는 stamina action입니다: ${action}`);
    return this.stamina + Number.EPSILON >= cost;
  }

  advanceStamina(deltaSeconds, { canRecover = true } = {}) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('combat stamina deltaSeconds는 0 이상의 유한한 숫자여야 합니다.');
    }
    this.staminaRecoveryDelaySeconds = Math.max(0, this.staminaRecoveryDelaySeconds - deltaSeconds);
    if (!canRecover || this.staminaRecoveryDelaySeconds > 0) return this.stamina;
    this.stamina = Math.min(
      this.staminaProfile.maximum,
      this.stamina + this.staminaProfile.recoveryPerSecond * deltaSeconds,
    );
    return this.stamina;
  }

  recordRejectedAction(action) {
    this.lastStaminaAction = Object.freeze({
      action,
      accepted: false,
      reason: 'exhausted',
      cost: this.staminaProfile.costs[action],
      before: this.stamina,
      after: this.stamina,
    });
    this.lastCommandTransition = Object.freeze({
      kind: 'action-rejected',
      action,
      reason: 'exhausted',
    });
    return false;
  }

  trySpendStamina(action, { transitionKind = 'action-started' } = {}) {
    const cost = this.staminaProfile.costs[action];
    if (!Number.isFinite(cost)) throw new Error(`알 수 없는 stamina action입니다: ${action}`);
    if (!this.canAfford(action)) return this.recordRejectedAction(action);
    const before = this.stamina;
    this.stamina = Math.max(0, this.stamina - cost);
    this.staminaRecoveryDelaySeconds = this.staminaProfile.recoveryDelaySeconds;
    this.lastStaminaAction = Object.freeze({
      action,
      accepted: true,
      reason: null,
      cost,
      before,
      after: this.stamina,
    });
    this.lastCommandTransition = Object.freeze({
      kind: transitionKind,
      action,
      staminaBefore: before,
      staminaAfter: this.stamina,
    });
    return true;
  }

  trySpendAction(action) {
    return this.trySpendStamina(action);
  }

  applyGuardContact({ guardBreak = false } = {}) {
    const before = this.stamina;
    const requestedDrain = guardBreak ? before : this.staminaProfile.costs.block;
    const drain = Math.min(before, requestedDrain);
    this.stamina = Math.max(0, before - drain);
    this.staminaRecoveryDelaySeconds = this.staminaProfile.recoveryDelaySeconds;
    const broken = guardBreak || this.stamina === 0;
    if (broken) this.heldPose = 'idle';
    this.lastStaminaAction = Object.freeze({
      action: 'block',
      accepted: true,
      reason: broken ? 'guard-broken' : null,
      cost: drain,
      before,
      after: this.stamina,
    });
    this.lastCommandTransition = Object.freeze({
      kind: broken ? 'guard-broken' : 'guard-contact',
      action: 'guard',
      staminaBefore: before,
      staminaAfter: this.stamina,
    });
    return Object.freeze({ broken, drain, stamina: this.stamina });
  }

  startIssuedCommand(command, transitionFrom = null, options = {}) {
    if (!this.trySpendStamina(command.action)) return false;
    this.start(command.motionId, transitionFrom, options);
    return true;
  }

  start(motionId, transitionFrom = null, { continuesCombo = false } = {}) {
    const policy = combatMotionPolicy(motionId, this.timingProfile);
    const durationSeconds = policy.durationSeconds;
    if (!(durationSeconds > 0)) {
      throw new Error(`실행할 수 없는 combat motion입니다: ${motionId}`);
    }
    this.sequence += 1;
    if (!continuesCombo) this.comboCycle += 1;
    if (AIR_MOTION_IDS.has(motionId)) this.airActions += 1;
    this.active = {
      id: motionId,
      elapsedSeconds: 0,
      durationSeconds,
      sequence: this.sequence,
      comboCycle: this.comboCycle,
      transitionFrom: transitionFrom
        ? Object.freeze({ id: transitionFrom.id, progress: transitionFrom.progress })
        : null,
      transitionSeconds: transitionFrom ? (TRANSITION_SECONDS_BY_MOTION[motionId] ?? 0.05) : 0,
    };
    this.lastCommandTransition = Object.freeze({
      kind: 'motion-started',
      action: isStrongCombatMotion(motionId) ? 'strongAttack' : 'basicAttack',
      motionId,
      sequence: this.sequence,
      phase: 'startup',
      staminaBefore: this.lastStaminaAction?.before ?? this.stamina,
      staminaAfter: this.stamina,
    });
  }

  continuesComboRoute(fromMotionId, toMotionId) {
    if (COMBO_CONTINUATIONS.has(`${fromMotionId}:${toMotionId}`)) return true;
    const loopsGround = !AIR_MOTION_IDS.has(fromMotionId) && !AIR_MOTION_IDS.has(toMotionId);
    const loopsAir = AIR_MOTION_IDS.has(fromMotionId) && AIR_MOTION_IDS.has(toMotionId);
    return this.commandProfile.loopCancel && (loopsGround || loopsAir);
  }

  cancelForJump({ preserveComboCycle = false } = {}) {
    if (!this.active) {
      if (!preserveComboCycle) this.continueNextStarterInCombo = false;
      return false;
    }
    this.continueNextStarterInCombo = preserveComboCycle;
    this.active = null;
    this.queuedMotion = null;
    return true;
  }

  interruptForHit() {
    if (!this.active) return Object.freeze({ interrupted: false, strongStartup: false });
    const interrupted = this.snapshot();
    const strongStartup = isStrongCombatMotion(interrupted.id) && interrupted.phase === 'windup';
    this.active = null;
    this.queuedMotion = null;
    this.continueNextStarterInCombo = false;
    this.lastCommandTransition = Object.freeze({
      kind: strongStartup ? 'strong-startup-interrupted' : 'motion-interrupted',
      action: isStrongCombatMotion(interrupted.id) ? 'strongAttack' : 'basicAttack',
      motionId: interrupted.id,
      sequence: interrupted.sequence,
      phase: interrupted.phase,
      reason: 'hit',
    });
    return Object.freeze({ interrupted: true, strongStartup, motionId: interrupted.id });
  }

  cancelAirMotionForLanding() {
    const activeWasAirborne = AIR_MOTION_IDS.has(this.active?.id);
    const queuedWasAirborne = AIR_MOTION_IDS.has(this.queuedMotion?.motionId);
    if (activeWasAirborne) this.active = null;
    if (queuedWasAirborne) this.queuedMotion = null;
    this.continueNextStarterInCombo = false;
    this.airActions = 0;
    return activeWasAirborne || queuedWasAirborne;
  }

  clearComboContinuation() {
    this.continueNextStarterInCombo = false;
  }

  snapshot() {
    const staminaStatus = {
      stamina: this.stamina,
      maxStamina: this.staminaProfile.maximum,
      exhausted: this.stamina < Math.min(...Object.values(this.staminaProfile.costs)),
      staminaRecoveryDelaySeconds: this.staminaRecoveryDelaySeconds,
      lastStaminaAction: this.lastStaminaAction,
      lastCommandTransition: this.lastCommandTransition,
    };
    if (!this.active) {
      const motionPolicy = combatMotionPolicy(this.heldPose, this.timingProfile);
      return Object.freeze({
        id: this.heldPose,
        label: motionPolicy.label,
        progress: 0,
        phase: this.heldPose,
        movementScale: motionPolicy.movementScale,
        canJump: motionPolicy.canJump,
        sequence: this.sequence,
        comboCycle: this.comboCycle,
        airActions: this.airActions,
        queuedMotion: null,
        ...staminaStatus,
      });
    }

    const motionPolicy = combatMotionPolicy(this.active.id, this.timingProfile);
    const frame = sampleCombatFrame(motionPolicy.frame, this.active.elapsedSeconds);
    return Object.freeze({
      id: this.active.id,
      label: motionPolicy.label,
      progress: frame.progress,
      phase: frame.phase,
      frame,
      movementScale: motionPolicy.movementScale,
      canJump: !AIR_MOTION_IDS.has(this.active.id) && frame.index >= frame.chainStart,
      sequence: this.active.sequence,
      comboCycle: this.active.comboCycle,
      airActions: this.airActions,
      queuedMotion: this.queuedMotion?.motionId ?? null,
      transitionFrom: this.active.transitionFrom,
      transitionProgress: this.active.transitionFrom
        ? Math.min(1, this.active.elapsedSeconds / this.active.transitionSeconds)
        : 1,
      ...staminaStatus,
    });
  }
}
