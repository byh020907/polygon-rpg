const COMMAND_INPUTS = Object.freeze([
  Object.freeze({ input: 'rageAttack', motion: 'spin' }),
  Object.freeze({ input: 'heavyAttack', motion: 'heavy' }),
  Object.freeze({ input: 'risingAttack', motion: 'rising' }),
  Object.freeze({ input: 'thrustAttack', motion: 'thrust' }),
  Object.freeze({ input: 'primaryAttack', motion: 'slash' }),
]);

const INPUT_NAMES = Object.freeze(COMMAND_INPUTS.map(({ input }) => input));

function motionPolicy(label, durationSeconds, movementScale, { canJump = false } = {}) {
  return Object.freeze({ label, durationSeconds, movementScale, canJump });
}

const COMBAT_MOTION_POLICIES = Object.freeze({
  idle: motionPolicy('대기', 0, 1, { canJump: true }),
  slash: motionPolicy('기본 베기', 0.52, 0.28),
  thrust: motionPolicy('찌르기', 0.42, 0.18),
  heavy: motionPolicy('강한 내려베기', 0.76, 0.08),
  rising: motionPolicy('올려베기', 0.6, 0.16),
  spin: motionPolicy('회전 공격', 0.92, 0.1),
  guard: motionPolicy('방어', 0, 0.22),
  crouch: motionPolicy('앉기', 0, 0.34),
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

  update(deltaSeconds, inputSnapshot, { acceptCommands = true } = {}) {
    const issuedMotion = acceptCommands ? this.readIssuedMotion(inputSnapshot) : null;
    if (this.active) {
      this.active.elapsedSeconds += deltaSeconds;
      if (issuedMotion && this.active.elapsedSeconds >= this.active.durationSeconds * 0.3) {
        this.queuedMotion = issuedMotion;
      }
      if (this.active.elapsedSeconds >= this.active.durationSeconds) {
        const nextMotion = this.queuedMotion;
        this.active = null;
        this.queuedMotion = null;
        if (nextMotion) this.start(nextMotion);
      }
    } else if (issuedMotion) {
      this.start(issuedMotion);
    }

    this.heldPose =
      acceptCommands && inputSnapshot.guard
        ? 'guard'
        : acceptCommands && inputSnapshot.crouch
          ? 'crouch'
          : 'idle';
    for (const inputName of INPUT_NAMES) {
      this.previousInputs[inputName] = Boolean(inputSnapshot[inputName]);
      const sequence = inputSnapshot[`${inputName}Sequence`];
      if (Number.isSafeInteger(sequence)) this.previousSequences[inputName] = sequence;
    }
    return this.snapshot();
  }

  readIssuedMotion(inputSnapshot) {
    for (const command of COMMAND_INPUTS) {
      const sequence = inputSnapshot[`${command.input}Sequence`];
      const sequenceIssued =
        Number.isSafeInteger(sequence) && sequence > this.previousSequences[command.input];
      const booleanEdgeIssued =
        !Number.isSafeInteger(sequence) &&
        inputSnapshot[command.input] &&
        !this.previousInputs[command.input];
      if (sequenceIssued || booleanEdgeIssued) {
        return command.motion;
      }
    }
    return null;
  }

  start(motionId) {
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
    };
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
      canJump: false,
      sequence: this.active.sequence,
      queuedMotion: this.queuedMotion,
    });
  }
}
