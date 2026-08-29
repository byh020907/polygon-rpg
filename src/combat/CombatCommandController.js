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

const COMBAT_MOTION_POLICIES = Object.freeze({
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

function combatMotionPolicy(id) {
  const policy = COMBAT_MOTION_POLICIES[id];
  if (!policy) throw new Error(`알 수 없는 combat motion입니다: ${id}`);
  return policy;
}

export function combatMotionFrameData(id) {
  return combatMotionPolicy(id).frame ?? null;
}

export class CombatCommandController {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = null;
    this.queuedMotion = null;
    this.sequence = 0;
    this.comboCycle = 0;
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
        combatMotionPolicy(this.active.id).frame.chainStartFrame,
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
          const continuesCombo = COMBO_CONTINUATIONS.has(`${transitionFrom.id}:${nextMotion}`);
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
          return (
            AIR_COMBO_MOTION_BY_STARTER[this.active?.id]?.[command.input] ??
            AIR_COMMAND_MOTIONS[command.input]
          );
        }
        return COMBO_MOTION_BY_STARTER[this.active?.id]?.[command.input] ?? command.motion;
      }
    }
    return null;
  }

  start(motionId, transitionFrom = null, { continuesCombo = false } = {}) {
    const policy = combatMotionPolicy(motionId);
    const durationSeconds = policy.durationSeconds;
    if (!(durationSeconds > 0)) {
      throw new Error(`실행할 수 없는 combat motion입니다: ${motionId}`);
    }
    this.sequence += 1;
    if (!continuesCombo) this.comboCycle += 1;
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
      const motionPolicy = combatMotionPolicy(this.heldPose);
      return Object.freeze({
        id: this.heldPose,
        label: motionPolicy.label,
        progress: 0,
        phase: this.heldPose,
        movementScale: motionPolicy.movementScale,
        canJump: motionPolicy.canJump,
        sequence: this.sequence,
        comboCycle: this.comboCycle,
        queuedMotion: null,
      });
    }

    const motionPolicy = combatMotionPolicy(this.active.id);
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
      queuedMotion: this.queuedMotion,
      transitionFrom: this.active.transitionFrom,
      transitionProgress: this.active.transitionFrom
        ? Math.min(1, this.active.elapsedSeconds / this.active.transitionSeconds)
        : 1,
    });
  }
}
