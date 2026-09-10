import {
  QUEST_CATALOG,
  QUEST_RECORD_LIMIT,
  QUEST_SLOT_LIMIT,
  assertQuestId,
  assertQuestTime,
  freezeQuestData,
  getQuestOccurrenceId,
  isQuestAvailable,
  normalizeQuestContext,
  questInstanceId,
  resolveQuestFieldMethod,
} from './QuestProfiles.js';
import { QUEST_WORLD_PROFILES } from './QuestWorldProfiles.js';
const live = (status) => status === 'offered' || status === 'accepted';
const keysEqual = (object, keys) =>
  object &&
  typeof object === 'object' &&
  !Array.isArray(object) &&
  Object.keys(object).length === keys.length &&
  keys.every((key) => Object.hasOwn(object, key));
export function createQuestState(elapsedSegments = 0) {
  return freezeQuestData({
    version: 1,
    lastElapsedSegments: assertQuestTime(elapsedSegments),
    slots: [],
    records: [],
    issuedByDay: {},
    worldFacts: {},
    explorationIds: [],
  });
}
export function assertQuestState(state, catalog = QUEST_CATALOG) {
  if (
    !keysEqual(state, [
      'version',
      'lastElapsedSegments',
      'slots',
      'records',
      'issuedByDay',
      'worldFacts',
      'explorationIds',
    ]) ||
    state.version !== 1
  )
    throw new TypeError('Invalid quest state schema');
  assertQuestTime(state.lastElapsedSegments);
  if (
    !Array.isArray(state.slots) ||
    state.slots.length > QUEST_SLOT_LIMIT ||
    !Array.isArray(state.records) ||
    state.records.length > QUEST_RECORD_LIMIT ||
    !Array.isArray(state.explorationIds)
  )
    throw new TypeError('Invalid quest state arrays/budget');
  if (
    !state.issuedByDay ||
    typeof state.issuedByDay !== 'object' ||
    Array.isArray(state.issuedByDay) ||
    !state.worldFacts ||
    typeof state.worldFacts !== 'object' ||
    Array.isArray(state.worldFacts)
  )
    throw new TypeError('Invalid quest state ledgers');
  const ids = new Set(),
    expectedIssued = {},
    facts = {},
    oneShot = new Set();
  for (const record of state.records) {
    if (
      !keysEqual(record, [
        'profileId',
        'instanceId',
        'issuedDay',
        'status',
        'acceptedAt',
        'deadline',
        'completedAt',
        'outcome',
      ])
    )
      throw new TypeError('Invalid quest record schema');
    const profile = catalog.getProfile(record.profileId);
    if (
      !Number.isSafeInteger(record.issuedDay) ||
      record.issuedDay < 1 ||
      (record.issuedDay - 1) * 4 > state.lastElapsedSegments ||
      record.instanceId !== questInstanceId(record.profileId, record.issuedDay) ||
      ids.has(record.instanceId) ||
      !['offered', 'accepted', 'completed', 'failed', 'expired'].includes(record.status)
    )
      throw new TypeError('Invalid quest record identity/status');
    ids.add(record.instanceId);
    (expectedIssued[record.issuedDay] ??= []).push(record.profileId);
    if (!profile.repeatable) {
      if (oneShot.has(profile.id)) throw new TypeError('One-shot quest issued twice');
      oneShot.add(profile.id);
    }
    if (['offered', 'expired'].includes(record.status)) {
      if (record.acceptedAt !== null || record.deadline !== null)
        throw new TypeError('Unaccepted quest has acceptance time');
    } else {
      assertQuestTime(record.acceptedAt);
      assertQuestTime(record.deadline);
      if (
        record.acceptedAt < (record.issuedDay - 1) * 4 ||
        record.acceptedAt >= record.issuedDay * 4 ||
        record.acceptedAt > state.lastElapsedSegments ||
        record.deadline !== record.acceptedAt + profile.deadlineSegments
      )
        throw new TypeError('Invalid fixed quest deadline');
    }
    if (live(record.status)) {
      if (
        record.completedAt !== null ||
        record.outcome !== null ||
        (record.status === 'offered' && record.issuedDay * 4 <= state.lastElapsedSegments) ||
        (record.status === 'accepted' && record.deadline <= state.lastElapsedSegments)
      )
        throw new TypeError('Invalid live quest time/outcome');
    } else {
      assertQuestTime(record.completedAt);
      if (record.completedAt > state.lastElapsedSegments)
        throw new TypeError('Future quest outcome');
      if (
        record.status === 'completed' &&
        (record.completedAt < record.acceptedAt ||
          record.completedAt >= record.deadline ||
          record.outcome !== 'completed')
      )
        throw new TypeError('Invalid completed quest');
      if (
        record.status === 'failed' &&
        (record.completedAt !== record.deadline || record.outcome !== 'deadline-reached')
      )
        throw new TypeError('Invalid failed quest');
      if (
        record.status === 'expired' &&
        (record.completedAt !== record.issuedDay * 4 || record.outcome !== 'offer-expired')
      )
        throw new TypeError('Invalid expired quest');
      if (profile.worldOutcome)
        facts[profile.worldOutcome.factId] =
          record.status === 'completed'
            ? profile.worldOutcome.completed
            : profile.worldOutcome.neglected;
    }
  }
  const expectedSlots = state.records
    .filter((record) => live(record.status))
    .map((record) => record.instanceId);
  if (JSON.stringify(state.slots) !== JSON.stringify(expectedSlots))
    throw new TypeError('Quest slots must match live records');
  if (Object.keys(state.issuedByDay).length !== Object.keys(expectedIssued).length)
    throw new TypeError('Quest issuance ledger mismatch');
  for (const [day, issued] of Object.entries(state.issuedByDay))
    if (
      !Array.isArray(issued) ||
      !expectedIssued[day] ||
      new Set(issued).size !== issued.length ||
      JSON.stringify([...issued].sort()) !== JSON.stringify([...expectedIssued[day]].sort())
    )
      throw new TypeError('Invalid daily quest issuance');
  if (
    JSON.stringify(Object.entries(state.worldFacts).sort()) !==
    JSON.stringify(Object.entries(facts).sort())
  )
    throw new TypeError('Quest world facts must match important outcomes');
  if (
    new Set(state.explorationIds).size !== state.explorationIds.length ||
    state.explorationIds.some(
      (id) => !QUEST_WORLD_PROFILES.explorations.some((entry) => entry.id === id),
    )
  )
    throw new TypeError('Invalid exploration obtained facts');
  return state;
}
function result(original, state, rewards = [], notifications = []) {
  return freezeQuestData({
    changed: JSON.stringify(original) !== JSON.stringify(state),
    state,
    rewards,
    notifications,
  });
}
function notification(record, kind, title, message) {
  return {
    id: record.instanceId + ':' + kind,
    kind,
    instanceId: record.instanceId,
    profileId: record.profileId,
    title,
    message,
  };
}
function finishRecord(state, record, profile, status, at, outcome, notifications) {
  Object.assign(record, { status, completedAt: at, outcome });
  if (profile.worldOutcome)
    state.worldFacts[profile.worldOutcome.factId] =
      status === 'completed' ? profile.worldOutcome.completed : profile.worldOutcome.neglected;
  notifications.push(
    notification(
      record,
      'quest-' + status,
      profile.title,
      status === 'completed'
        ? '의뢰를 완료했습니다.'
        : status === 'failed'
          ? '수락한 의뢰의 기한이 지났습니다.'
          : '미수락 의뢰의 기간이 종료되었습니다.',
    ),
  );
}
function reconcileMutable(state, context, catalog, notifications) {
  if (context.elapsedSegments < state.lastElapsedSegments)
    throw new RangeError('Quest time cannot move backwards');
  for (const record of state.records) {
    const profile = catalog.getProfile(record.profileId);
    if (record.status === 'accepted' && record.deadline <= context.elapsedSegments)
      finishRecord(
        state,
        record,
        profile,
        'failed',
        record.deadline,
        'deadline-reached',
        notifications,
      );
    else if (record.status === 'offered' && record.issuedDay < context.day)
      finishRecord(
        state,
        record,
        profile,
        'expired',
        record.issuedDay * 4,
        'offer-expired',
        notifications,
      );
  }
  state.lastElapsedSegments = context.elapsedSegments;
  state.slots = state.records
    .filter((record) => live(record.status))
    .map((record) => record.instanceId);
  const sorted = [...catalog.profiles].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const offset = sorted.length ? (context.day - 1) % sorted.length : 0;
  const ordered = [...sorted.slice(offset), ...sorted.slice(0, offset)];
  for (const profile of ordered) {
    if (state.slots.length >= QUEST_SLOT_LIMIT || state.records.length >= QUEST_RECORD_LIMIT) break;
    if (
      !isQuestAvailable(profile, context) ||
      (state.issuedByDay[context.day] ?? []).includes(profile.id) ||
      state.records.some(
        (record) => record.profileId === profile.id && (live(record.status) || !profile.repeatable),
      )
    )
      continue;
    const record = {
      profileId: profile.id,
      instanceId: questInstanceId(profile.id, context.day),
      issuedDay: context.day,
      status: 'offered',
      acceptedAt: null,
      deadline: null,
      completedAt: null,
      outcome: null,
    };
    state.records.push(record);
    state.slots.push(record.instanceId);
    (state.issuedByDay[context.day] ??= []).push(profile.id);
    notifications.push(
      notification(
        record,
        'quest-offered',
        profile.title,
        '게시판에 새로운 일반 의뢰가 도착했습니다.',
      ),
    );
  }
}
export function reconcileQuests(state, context, catalog = QUEST_CATALOG) {
  assertQuestState(state, catalog);
  const next = structuredClone(state),
    normalized = normalizeQuestContext(context),
    notifications = [];
  reconcileMutable(next, normalized, catalog, notifications);
  assertQuestState(next, catalog);
  return result(state, next, [], notifications);
}
export function acceptQuest(state, instanceId, context, catalog = QUEST_CATALOG) {
  assertQuestId(instanceId);
  const reconciled = reconcileQuests(state, context, catalog),
    next = structuredClone(reconciled.state),
    normalized = normalizeQuestContext(context),
    notifications = [...reconciled.notifications];
  const record = next.records.find((record) => record.instanceId === instanceId);
  if (!record) throw new RangeError('Unknown quest instance');
  const profile = catalog.getProfile(record.profileId);
  if (record.status === 'offered' && isQuestAvailable(profile, normalized)) {
    Object.assign(record, {
      status: 'accepted',
      acceptedAt: normalized.elapsedSegments,
      deadline: normalized.elapsedSegments + profile.deadlineSegments,
    });
    notifications.push(
      notification(
        record,
        'quest-accepted',
        profile.title,
        '의뢰를 수락했습니다. 현장에서 작업을 마치세요.',
      ),
    );
  }
  assertQuestState(next, catalog);
  return result(state, next, [], notifications);
}
export function applyQuestEvent(state, event, context, catalog = QUEST_CATALOG) {
  if (!event || !['field-action', 'encounter-completed', 'exploration'].includes(event.type))
    throw new TypeError('Unknown quest event');
  const reconciled = reconcileQuests(state, context, catalog),
    next = structuredClone(reconciled.state),
    normalized = normalizeQuestContext(context),
    notifications = [...reconciled.notifications],
    rewards = [];
  if (event.type === 'exploration') {
    const exploration = QUEST_WORLD_PROFILES.explorations.find(
      (entry) => entry.id === event.explorationId,
    );
    if (!exploration) throw new RangeError('Unknown exploration source');
    if (
      !next.explorationIds.includes(exploration.id) &&
      normalized.garageRevealed &&
      event.sourceId === exploration.sourceId &&
      event.roomId === exploration.roomId &&
      normalized.accessibleRoomIds.includes(exploration.roomId) &&
      normalized.fieldCapabilities.includes(exploration.capabilityId)
    ) {
      next.explorationIds.push(exploration.id);
      rewards.push({ claimId: 'exploration:' + exploration.id, bundle: exploration.rewards });
      notifications.push({
        id: 'exploration:' + exploration.id,
        kind: 'exploration-obtained',
        title: exploration.label,
        message: '숨은 회수품을 확보했습니다.',
      });
    }
  } else {
    assertQuestId(event.instanceId);
    const record = next.records.find((record) => record.instanceId === event.instanceId);
    if (!record) throw new RangeError('Unknown quest event instance');
    const profile = catalog.getProfile(record.profileId),
      objective = profile.objective;
    if (
      record.status === 'accepted' &&
      event.occurrenceId === getQuestOccurrenceId(record) &&
      event.sourceId === objective.sourceId &&
      event.roomId === objective.roomId &&
      normalized.accessibleRoomIds.includes(objective.roomId) &&
      resolveQuestFieldMethod(objective, normalized).allowed &&
      (objective.kind === 'encounter'
        ? event.type === 'encounter-completed'
        : event.type === 'field-action') &&
      (!objective.phaseId || objective.phaseId === normalized.phaseId)
    ) {
      finishRecord(
        next,
        record,
        profile,
        'completed',
        normalized.elapsedSegments,
        'completed',
        notifications,
      );
      rewards.push({ claimId: record.instanceId + ':reward', bundle: profile.rewards });
      reconcileMutable(next, normalized, catalog, notifications);
    }
  }
  assertQuestState(next, catalog);
  return result(state, next, rewards, notifications);
}
