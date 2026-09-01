export const WORLD_TIME_SCHEMA_VERSION = 1;

export const WORLD_ACTION_REASON = Object.freeze({
  COMMITTED: 'committed',
  ALREADY_COMMITTED: 'already-committed',
});

const DAY_MINUTES = 24 * 60;
const DEFAULT_CLOCK_MINUTES = 10 * 60;
const DEFAULT_DEADLINE_MINUTES = 12 * 60;

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label}은(는) 0 이상의 안전한 정수여야 합니다.`);
  }
}

function assertActionId(value, label = 'world action ID') {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label}은(는) 비어 있지 않은 문자열이어야 합니다.`);
  }
}

function freezeSnapshot({ clockMinutes, deadlineMinutes, committedEventIds, crisis }) {
  return Object.freeze({
    version: WORLD_TIME_SCHEMA_VERSION,
    clockMinutes,
    deadlineMinutes,
    committedEventIds: Object.freeze([...committedEventIds]),
    crisis,
  });
}

export function createWorldTimeSnapshot() {
  return freezeSnapshot({
    clockMinutes: DEFAULT_CLOCK_MINUTES,
    deadlineMinutes: DEFAULT_DEADLINE_MINUTES,
    committedEventIds: [],
    crisis: false,
  });
}

export function toWorldTimeSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('world time snapshot은 객체여야 합니다.');
  }
  if (value.version !== WORLD_TIME_SCHEMA_VERSION) {
    throw new Error(`지원하지 않는 world time schema version입니다: ${value.version}`);
  }
  assertNonNegativeInteger(value.clockMinutes, 'World Clock 분');
  assertNonNegativeInteger(value.deadlineMinutes, 'Deadline 분');
  if (!Array.isArray(value.committedEventIds)) {
    throw new TypeError('committed world event ID 목록은 배열이어야 합니다.');
  }
  const eventIds = new Set();
  for (const eventId of value.committedEventIds) {
    assertActionId(eventId, 'committed world event ID');
    if (eventIds.has(eventId)) throw new Error(`world event ID가 중복됩니다: ${eventId}`);
    eventIds.add(eventId);
  }
  if (typeof value.crisis !== 'boolean' || value.crisis !== (value.deadlineMinutes === 0)) {
    throw new TypeError('Crisis 상태는 Deadline 0 여부와 일치해야 합니다.');
  }
  return freezeSnapshot({
    clockMinutes: value.clockMinutes,
    deadlineMinutes: value.deadlineMinutes,
    committedEventIds: eventIds,
    crisis: value.crisis,
  });
}

export function commitWorldAction(
  snapshot,
  {
    actionId,
    clockCostMinutes = 0,
    deadlineCostMinutes = clockCostMinutes,
    deadlineExtensionMinutes = 0,
    repeatable = false,
  } = {},
) {
  const current = toWorldTimeSnapshot(snapshot);
  assertActionId(actionId);
  assertNonNegativeInteger(clockCostMinutes, 'World Clock 비용');
  assertNonNegativeInteger(deadlineCostMinutes, 'Deadline 비용');
  assertNonNegativeInteger(deadlineExtensionMinutes, 'Deadline 연장');
  if (!repeatable && current.committedEventIds.includes(actionId)) {
    return Object.freeze({
      changed: false,
      reason: WORLD_ACTION_REASON.ALREADY_COMMITTED,
      snapshot: current,
    });
  }

  const deadlineMinutes = Math.max(
    0,
    current.deadlineMinutes - deadlineCostMinutes + deadlineExtensionMinutes,
  );
  const next = freezeSnapshot({
    clockMinutes: current.clockMinutes + clockCostMinutes,
    deadlineMinutes,
    committedEventIds: repeatable
      ? current.committedEventIds
      : [...current.committedEventIds, actionId],
    crisis: deadlineMinutes === 0,
  });
  return Object.freeze({
    changed:
      next.clockMinutes !== current.clockMinutes ||
      next.deadlineMinutes !== current.deadlineMinutes ||
      next.committedEventIds.length !== current.committedEventIds.length,
    reason: WORLD_ACTION_REASON.COMMITTED,
    snapshot: next,
  });
}

export function getWorldClockReadModel(snapshot) {
  const current = toWorldTimeSnapshot(snapshot);
  const minuteOfDay = current.clockMinutes % DAY_MINUTES;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return Object.freeze({
    day: Math.floor(current.clockMinutes / DAY_MINUTES) + 1,
    hour,
    minute,
    timePhase: hour >= 6 && hour < 18 ? 'day' : 'night',
    timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    deadlineMinutes: current.deadlineMinutes,
    crisis: current.crisis,
  });
}
