export const COMBAT_EVENT_TYPE = Object.freeze({
  GUARD: 'guard',
  EVADE: 'evade',
  HIT: 'hit',
  LAUNCH: 'launch',
  PUNISH: 'punish',
  LANDING: 'landing',
});

const COMBAT_EVENT_TYPES = new Set(Object.values(COMBAT_EVENT_TYPE));

function frozenPosition(position) {
  if (!position) return null;
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new RangeError('CombatEvent position은 유한한 x/y 좌표여야 합니다.');
  }
  return Object.freeze({ x: position.x, y: position.y });
}

export class CombatEventBuffer {
  constructor({ capacity = 16 } = {}) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError('CombatEventBuffer capacity는 1 이상의 정수여야 합니다.');
    }
    this.capacity = capacity;
    this.reset();
  }

  reset() {
    this.sequence = 0;
    this.active = [];
  }

  emit(
    type,
    {
      actor,
      target,
      attackId = null,
      outcome = type,
      position = null,
      direction = 0,
      strength = 1,
      durationSeconds = 0.18,
    } = {},
  ) {
    if (!COMBAT_EVENT_TYPES.has(type))
      throw new Error(`알 수 없는 CombatEvent type입니다: ${type}`);
    if (actor !== 'player' && actor !== 'enemy') {
      throw new Error('CombatEvent actor는 player 또는 enemy여야 합니다.');
    }
    if (target !== 'player' && target !== 'enemy') {
      throw new Error('CombatEvent target은 player 또는 enemy여야 합니다.');
    }
    if (![0, -1, 1].includes(direction)) {
      throw new RangeError('CombatEvent direction은 -1, 0 또는 1이어야 합니다.');
    }
    if (!Number.isFinite(strength) || strength < 0) {
      throw new RangeError('CombatEvent strength는 0 이상의 유한한 숫자여야 합니다.');
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new RangeError('CombatEvent durationSeconds는 양수여야 합니다.');
    }
    this.sequence += 1;
    const event = Object.freeze({
      id: this.sequence,
      type,
      actor,
      target,
      attackId,
      outcome,
      position: frozenPosition(position),
      direction,
      strength,
      durationSeconds,
      remainingSeconds: durationSeconds,
    });
    const retained = this.capacity === 1 ? [] : this.active.slice(-(this.capacity - 1));
    this.active = [...retained, event];
    return event;
  }

  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('CombatEvent deltaSeconds는 0 이상의 유한한 숫자여야 합니다.');
    }
    this.active = this.active
      .map((event) =>
        Object.freeze({
          ...event,
          remainingSeconds: Math.max(0, event.remainingSeconds - deltaSeconds),
        }),
      )
      .filter((event) => event.remainingSeconds > 0);
  }

  snapshot() {
    return Object.freeze([...this.active]);
  }
}
