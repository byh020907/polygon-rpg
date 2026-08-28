import {
  COMBAT_POSE_DEFINITIONS,
  combatMotionDuration,
  combatMotionMovementScale,
} from '../animation/CombatPoseLibrary.js';

const COMMAND_INPUTS = Object.freeze([
  Object.freeze({ input: 'rageAttack', motion: 'spin' }),
  Object.freeze({ input: 'heavyAttack', motion: 'heavy' }),
  Object.freeze({ input: 'risingAttack', motion: 'rising' }),
  Object.freeze({ input: 'thrustAttack', motion: 'thrust' }),
  Object.freeze({ input: 'primaryAttack', motion: 'slash' }),
]);

const INPUT_NAMES = Object.freeze(COMMAND_INPUTS.map(({ input }) => input));

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

  update(deltaSeconds, inputSnapshot) {
    const issuedMotion = this.readIssuedMotion(inputSnapshot);
    if (this.active) {
      this.active.elapsed += deltaSeconds;
      if (issuedMotion && this.active.elapsed >= this.active.duration * 0.3) {
        this.queuedMotion = issuedMotion;
      }
      if (this.active.elapsed >= this.active.duration) {
        const nextMotion = this.queuedMotion;
        this.active = null;
        this.queuedMotion = null;
        if (nextMotion) this.start(nextMotion);
      }
    } else if (issuedMotion) {
      this.start(issuedMotion);
    }

    this.heldPose = inputSnapshot.guard ? 'guard' : inputSnapshot.crouch ? 'crouch' : 'idle';
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
    const duration = combatMotionDuration(motionId);
    if (!(duration > 0)) throw new Error(`실행할 수 없는 combat motion입니다: ${motionId}`);
    this.sequence += 1;
    this.active = { id: motionId, elapsed: 0, duration, sequence: this.sequence };
  }

  snapshot() {
    if (!this.active) {
      const definition = COMBAT_POSE_DEFINITIONS[this.heldPose];
      return Object.freeze({
        id: this.heldPose,
        label: definition.label,
        progress: 0,
        phase: this.heldPose,
        movementScale: definition.movementScale,
        canJump: this.heldPose === 'idle',
        sequence: this.sequence,
        queuedMotion: null,
      });
    }

    const progress = Math.max(0, Math.min(1, this.active.elapsed / this.active.duration));
    return Object.freeze({
      id: this.active.id,
      label: COMBAT_POSE_DEFINITIONS[this.active.id].label,
      progress,
      phase: phaseForProgress(progress),
      movementScale: combatMotionMovementScale(this.active.id),
      canJump: false,
      sequence: this.active.sequence,
      queuedMotion: this.queuedMotion,
    });
  }
}
