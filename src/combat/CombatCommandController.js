import { combatFramesToSeconds, defineCombatFrame, sampleCombatFrame } from './CombatFrame.js';

const COMMAND_INPUTS = Object.freeze([
  Object.freeze({ input: 'strongAttack', motion: 'heavy' }),
  Object.freeze({ input: 'basicAttack', motion: 'slash' }),
]);

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
  constructor({ timingProfile, commandProfile } = {}) {
    this.timingProfile = normalizeTimingProfile(timingProfile);
    this.commandProfile = normalizeCommandProfile(commandProfile);
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
    this.continueNextStarterInCombo = false;
    this.previousInputs = Object.fromEntries(INPUT_NAMES.map((name) => [name, false]));
    this.previousSequences = Object.fromEntries(INPUT_NAMES.map((name) => [name, 0]));
  }

  update(
    deltaSeconds,
    inputSnapshot,
    { acceptCommands = true, isAirborne = false, allowGuard = true } = {},
  ) {
    if (!isAirborne) this.airActions = 0;
    const issuedMotion = acceptCommands
      ? this.readIssuedMotion(inputSnapshot, { isAirborne })
      : null;
    if (this.active) {
      this.active.elapsedSeconds += deltaSeconds;
      if (issuedMotion && isAirborne && !AIR_MOTION_IDS.has(this.active.id)) {
        this.active = null;
        this.queuedMotion = null;
        this.start(issuedMotion);
      } else if (issuedMotion) {
        this.queuedMotion = issuedMotion;
      }
      const chainStartSeconds = combatFramesToSeconds(
        combatMotionPolicy(this.active.id, this.timingProfile).frame.chainStartFrame,
      );
      if (
        (this.queuedMotion && this.active.elapsedSeconds >= chainStartSeconds) ||
        this.active.elapsedSeconds >= this.active.durationSeconds
      ) {
        const transitionFrom = this.snapshot();
        const nextMotion = this.queuedMotion;
        this.active = null;
        this.queuedMotion = null;
        if (nextMotion) {
          const continuesCombo = this.continuesComboRoute(transitionFrom.id, nextMotion);
          this.start(nextMotion, transitionFrom, { continuesCombo });
        }
      }
    } else if (issuedMotion) {
      this.start(issuedMotion, null, {
        continuesCombo: this.continueNextStarterInCombo,
      });
      this.continueNextStarterInCombo = false;
    }

    this.heldPose = acceptCommands && allowGuard && inputSnapshot.guard ? 'guard' : 'idle';
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
        if (isAirborne) {
          if (this.airActions >= this.commandProfile.maxAirActions) return null;
          const branch = AIR_COMBO_MOTION_BY_STARTER[this.active?.id]?.[command.input];
          if (branch && this.commandProfile.airCombos) return branch;
          if (
            !this.active ||
            !AIR_MOTION_IDS.has(this.active.id) ||
            this.commandProfile.loopCancel
          ) {
            return AIR_COMMAND_MOTIONS[command.input];
          }
          return null;
        }
        const branch = COMBO_MOTION_BY_STARTER[this.active?.id]?.[command.input];
        if (branch && this.commandProfile.groundCombos) return branch;
        if (!this.active || this.commandProfile.loopCancel) return command.motion;
        return null;
      }
    }
    return null;
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

  clearComboContinuation() {
    this.continueNextStarterInCombo = false;
  }

  snapshot() {
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
      canJump: true,
      sequence: this.active.sequence,
      comboCycle: this.active.comboCycle,
      airActions: this.airActions,
      queuedMotion: this.queuedMotion,
      transitionFrom: this.active.transitionFrom,
      transitionProgress: this.active.transitionFrom
        ? Math.min(1, this.active.elapsedSeconds / this.active.transitionSeconds)
        : 1,
    });
  }
}
