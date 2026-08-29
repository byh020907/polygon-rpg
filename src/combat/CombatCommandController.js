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
  durationSeconds,
  movementScale,
  { canJump = false, chainStartRatio = 0.74 } = {},
) {
  return Object.freeze({ label, durationSeconds, movementScale, canJump, chainStartRatio });
}

const COMBAT_MOTION_POLICIES = Object.freeze({
  idle: motionPolicy('대기', 0, 1, { canJump: true }),
  slash: motionPolicy('기본 베기', 0.52, 0.28),
  thrust: motionPolicy('찌르기', 0.42, 0.18),
  heavy: motionPolicy('강한 내려베기', 0.76, 0.08),
  rising: motionPolicy('올려베기', 0.6, 0.16),
  spin: motionPolicy('회전 공격', 0.82, 0.45, { chainStartRatio: 0.78 }),
  airSlash: motionPolicy('공중 베기', 0.42, 1, { chainStartRatio: 0.62 }),
  airHeavy: motionPolicy('공중 내려베기', 0.5, 0.82, { chainStartRatio: 0.58 }),
  airReturn: motionPolicy('공중 되베기', 0.4, 1, { chainStartRatio: 0.62 }),
  airSpin: motionPolicy('공중 회전', 0.68, 1, { chainStartRatio: 0.7 }),
  airCross: motionPolicy('공중 교차 베기', 0.5, 1, { chainStartRatio: 0.72 }),
  guard: motionPolicy('방어', 0, 0.22),
});

function combatMotionPolicy(id) {
  const policy = COMBAT_MOTION_POLICIES[id];
  if (!policy) throw new Error(`알 수 없는 combat motion입니다: ${id}`);
  return policy;
}

function phaseForProgress(progress) {
  if (progress < 0.35) return 'windup';
  if (progress < 0.68) return 'strike';
  return 'recovery';
}

export class CombatCommandController {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = null;
    this.queuedMotion = null;
    this.sequence = 0;
    this.heldPose = 'idle';
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
      const chainStartSeconds =
        this.active.durationSeconds * combatMotionPolicy(this.active.id).chainStartRatio;
      if (
        (this.queuedMotion && this.active.elapsedSeconds >= chainStartSeconds) ||
        this.active.elapsedSeconds >= this.active.durationSeconds
      ) {
        const transitionFrom = this.snapshot();
        const nextMotion = this.queuedMotion;
        this.active = null;
        this.queuedMotion = null;
        if (nextMotion) this.start(nextMotion, transitionFrom);
      }
    } else if (issuedMotion) {
      this.start(issuedMotion);
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

  start(motionId, transitionFrom = null) {
    const durationSeconds = combatMotionPolicy(motionId).durationSeconds;
    if (!(durationSeconds > 0)) {
      throw new Error(`실행할 수 없는 combat motion입니다: ${motionId}`);
    }
    this.sequence += 1;
    this.active = {
      id: motionId,
      elapsedSeconds: 0,
      durationSeconds,
      sequence: this.sequence,
      transitionFrom: transitionFrom
        ? Object.freeze({ id: transitionFrom.id, progress: transitionFrom.progress })
        : null,
      transitionSeconds: transitionFrom ? (TRANSITION_SECONDS_BY_MOTION[motionId] ?? 0.05) : 0,
    };
  }

  cancelForJump() {
    if (!this.active) return false;
    this.active = null;
    this.queuedMotion = null;
    return true;
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
        queuedMotion: null,
      });
    }

    const progress = Math.max(
      0,
      Math.min(1, this.active.elapsedSeconds / this.active.durationSeconds),
    );
    const motionPolicy = combatMotionPolicy(this.active.id);
    return Object.freeze({
      id: this.active.id,
      label: motionPolicy.label,
      progress,
      phase: phaseForProgress(progress),
      movementScale: motionPolicy.movementScale,
      canJump: true,
      sequence: this.active.sequence,
      queuedMotion: this.queuedMotion,
      transitionFrom: this.active.transitionFrom,
      transitionProgress: this.active.transitionFrom
        ? Math.min(1, this.active.elapsedSeconds / this.active.transitionSeconds)
        : 1,
    });
  }
}
