import assert from 'node:assert/strict';
import {
  QUEST_CATALOG,
  getQuestOccurrenceId,
  resolveQuestFieldMethod,
} from '../src/game/quests/QuestProfiles.js';
import {
  createQuestState,
  assertQuestState,
  reconcileQuests,
  acceptQuest,
  applyQuestEvent,
} from '../src/game/quests/QuestState.js';
import { createQuestReadModel } from '../src/game/quests/QuestReadModel.js';
import {
  QUEST_WORLD_PROFILES,
  applyQuestNpcOutcomes,
  getQuestWorldOutcomes,
  getQuestNightEncounters,
  createQuestEpilogueReadModel,
} from '../src/game/quests/QuestWorldProfiles.js';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
const rooms = [
  'abandoned-mine-roadhead',
  'abandoned-mine-rescue-tunnel',
  'harbor-shipyard-roadhead',
  'harbor-shipyard-occupied-drydock',
];
const context = (elapsedSegments = 0, overrides = {}) => ({
  elapsedSegments,
  garageRevealed: true,
  accessibleRoomIds: rooms,
  fieldCapabilities: ['cable-cut', 'brace'],
  ...overrides,
});
const find = (state, id) =>
  state.records.find(
    (record) => record.profileId === id && ['offered', 'accepted'].includes(record.status),
  );
const eventFor = (record) => {
  const profile = QUEST_CATALOG.getProfile(record.profileId);
  return {
    type: profile.objective.kind === 'encounter' ? 'encounter-completed' : 'field-action',
    instanceId: record.instanceId,
    occurrenceId: getQuestOccurrenceId(record),
    sourceId: profile.objective.sourceId,
    roomId: profile.objective.roomId,
  };
};
assert.equal(QUEST_CATALOG.profiles.length, 6);
const initial = createQuestState();
const first = reconcileQuests(initial, context());
assert.equal(first.state.slots.length, 4);
assert.equal(initial.records.length, 0);
assert.deepEqual(first, reconcileQuests(createQuestState(), context()), 'issuance deterministic');
assert.equal(reconcileQuests(first.state, context()).changed, false);
assert.deepEqual(reconcileQuests(first.state, context()).notifications, []);
assert.deepEqual(JSON.parse(JSON.stringify(first.state)), first.state);
assertQuestState(JSON.parse(JSON.stringify(first.state)));
assert.equal(
  reconcileQuests(createQuestState(), context(0, { garageRevealed: false })).state.slots.length,
  0,
);
assert.equal(
  reconcileQuests(
    createQuestState(),
    context(0, { accessibleRoomIds: ['abandoned-mine-roadhead'] }),
  ).state.slots.length,
  2,
);
assert.equal(
  reconcileQuests(createQuestState(), context(0, { accessibleRoomIds: [] })).state.slots.length,
  0,
);

let lamp = acceptQuest(
  first.state,
  find(first.state, 'harbor-lamp-service').instanceId,
  context(),
).state;
const accepted = find(lamp, 'harbor-lamp-service');
assert.equal(accepted.deadline, 4);
assert.equal(accepted.acceptedAt, 0);
assert.equal(
  applyQuestEvent(lamp, { ...eventFor(accepted), occurrenceId: 'old-occurrence' }, context(1))
    .rewards.length,
  0,
);
assert.equal(
  applyQuestEvent(lamp, { ...eventFor(accepted), sourceId: 'other-source' }, context(1)).rewards
    .length,
  0,
);
const success = applyQuestEvent(lamp, eventFor(accepted), context(1));
assert.equal(success.rewards.length, 1);
assert.equal(success.rewards[0].claimId, accepted.instanceId + ':reward');
assert.equal(success.state.worldFacts['harbor-lamp-service'], 'serviced');
assert.equal(success.state.slots.length, 4, 'finished slot refilled');
assert.ok(success.notifications.some((n) => n.kind === 'quest-completed'));
assert.equal(applyQuestEvent(success.state, eventFor(accepted), context(1)).rewards.length, 0);
assert.equal(reconcileQuests(success.state, context(1)).changed, false);
assert.equal(
  reconcileQuests(success.state, context(8)).state.records.filter(
    (r) => r.profileId === 'harbor-lamp-service',
  ).length,
  1,
  'important service cannot be issued again',
);
const deadline = applyQuestEvent(lamp, eventFor(accepted), context(4));
assert.equal(deadline.rewards.length, 0);
assert.equal(
  deadline.state.records.find((r) => r.instanceId === accepted.instanceId).status,
  'failed',
);
assert.equal(deadline.state.worldFacts['harbor-lamp-service'], 'temporary-lighting');
assert.ok(deadline.notifications.some((n) => n.kind === 'quest-failed'));
const expired = reconcileQuests(first.state, context(4));
assert.equal(
  expired.state.records.filter((r) => r.issuedDay === 1 && r.status === 'expired').length,
  4,
);
assert.ok(expired.notifications.some((n) => n.kind === 'quest-expired'));
assert.equal(expired.state.worldFacts['harbor-lamp-service'], 'temporary-lighting');
assert.equal(
  Object.keys(expired.state.worldFacts).length,
  1,
  'routine expiry cannot write world patches',
);

const tunnelContext = context(3, { accessibleRoomIds: ['abandoned-mine-rescue-tunnel'] });
let carry = reconcileQuests(createQuestState(3), tunnelContext).state;
carry = acceptQuest(carry, carry.slots[0], tunnelContext).state;
const carryId = carry.slots[0];
assert.equal(carry.records[0].deadline, 9);
carry = reconcileQuests(carry, context(4)).state;
assert.equal(carry.slots.length, 4);
assert.ok(carry.slots.includes(carryId), 'accepted carry-over occupies a slot');
assert.equal(
  carry.records.find((r) => r.instanceId === carryId).deadline,
  9,
  'morning never extends acceptance deadline',
);
assert.equal(
  applyQuestEvent(carry, eventFor(carry.records.find((r) => r.instanceId === carryId)), context(9))
    .rewards.length,
  0,
);

// Complete every eligible occurrence; each daily profile is issued at most once.
let rotation = first.state,
  completed = 0;
for (let step = 0; step < 6; step++) {
  const record = rotation.records.find((r) => r.status === 'offered');
  if (!record) break;
  rotation = acceptQuest(rotation, record.instanceId, context(3)).state;
  const completedResult = applyQuestEvent(
    rotation,
    eventFor(rotation.records.find((r) => r.instanceId === record.instanceId)),
    context(3),
  );
  assert.equal(completedResult.rewards.length, 1);
  rotation = completedResult.state;
  completed++;
}
assert.equal(completed, 6);
assert.equal(rotation.records.length, 6);
assert.equal(rotation.slots.length, 0);
assert.equal(
  reconcileQuests(rotation, context(3)).state.slots.length,
  0,
  'no infinite same-day refill',
);

const nightBase = reconcileQuests(
  createQuestState(),
  context(0, { accessibleRoomIds: ['abandoned-mine-roadhead'] }),
).state;
let night = acceptQuest(
  nightBase,
  find(nightBase, 'mine-night-workline').instanceId,
  context(0, { accessibleRoomIds: ['abandoned-mine-roadhead'] }),
).state;
const nightRecord = find(night, 'mine-night-workline');
assert.equal(
  applyQuestEvent(night, eventFor(nightRecord), context(0)).rewards.length,
  0,
  'daylight cannot complete a night occurrence',
);
assert.equal(getQuestNightEncounters(night, { phaseId: 'day' }).length, 0);
assert.equal(getQuestNightEncounters(night, { phaseId: 'night' }).length, 1);
assert.equal(
  applyQuestEvent(
    night,
    { ...eventFor(nightRecord), occurrenceId: 'yesterday' },
    context(3, { clearedEncounterIds: ['mine-night-workline'] }),
  ).rewards.length,
  0,
  'old cleared enemies do not satisfy current occurrence',
);
assert.equal(applyQuestEvent(night, eventFor(nightRecord), context(3)).rewards.length, 1);

const secret = {
  type: 'exploration',
  explorationId: 'mine-cable-cache',
  sourceId: 'mine-cable-cache',
  roomId: 'abandoned-mine-roadhead',
};
assert.equal(
  applyQuestEvent(initial, secret, context(0, { fieldCapabilities: [] })).rewards.length,
  0,
);
assert.equal(
  createQuestReadModel(initial).explorations.length,
  0,
  'undiscovered secrets are absent, without a total checklist',
);
const obtained = applyQuestEvent(initial, secret, context());
assert.equal(obtained.rewards[0].claimId, 'exploration:mine-cable-cache');
assert.deepEqual(obtained.rewards[0].bundle.equipmentItemIds, ['field-work-lamp']);
assert.equal(applyQuestEvent(obtained.state, secret, context()).rewards.length, 0);
assert.equal(createQuestReadModel(obtained.state).explorations.length, 1);
const campaign = {
  issueWindow: {
    primary: { id: 'main-existing', title: '기존 주요 의뢰' },
    linked: [{ id: 'linked-existing', title: '기존 연결 의뢰' }],
  },
  finalBattleAvailable: true,
};
const before = JSON.stringify(campaign);
const view = createQuestReadModel(expired.state, campaign, context(4));
assert.deepEqual(view.main, campaign.issueWindow.primary);
assert.deepEqual(view.linked, campaign.issueWindow.linked);
assert.equal(JSON.stringify(campaign), before);
assert.equal(Object.isFrozen(campaign), false);
assert.equal(campaign.finalBattleAvailable, true);
assert.equal(getQuestWorldOutcomes(success.state)[0].presentation.state, 'serviced');
assert.equal(createQuestEpilogueReadModel(deadline.state).outcomes[0].value, 'temporary-lighting');
assert.equal(
  createQuestReadModel(initial, {
    awakeningActive: true,
    awakening: { title: '첫 수거', objective: '기존 현장으로 이동' },
  }).main.title,
  '첫 수거',
);

for (const mutate of [
  (s) => (s.version = 9),
  (s) => s.records.push({ ...s.records[0] }),
  (s) => s.slots.pop(),
  (s) => (s.records[0].status = 'rewarded'),
  (s) => (s.records[0].acceptedAt = NaN),
  (s) => s.issuedByDay['1'].push(s.issuedByDay['1'][0]),
  (s) => (s.worldFacts.arbitrary = 'invented'),
  (s) => (s.explorationIds = ['unknown']),
  (s) => delete s.records[0].outcome,
]) {
  const bad = structuredClone(first.state);
  mutate(bad);
  assert.throws(() => assertQuestState(bad));
}
const badDeadline = structuredClone(lamp);
badDeadline.records.find((r) => r.status === 'accepted').deadline++;
assert.throws(() => assertQuestState(badDeadline));
assert.throws(() => reconcileQuests(success.state, context(0)), /backwards/);
assert.throws(() => reconcileQuests(initial, context(0, { phaseId: 'night' })), /campaign time/);
assert.throws(
  () => applyQuestEvent(initial, { type: 'menu-complete' }, context()),
  /Unknown quest event/,
);
const oversized = structuredClone(first.state);
oversized.records = Array(513).fill(oversized.records[0]);
assert.throws(() => assertQuestState(oversized), /budget/);
assert.ok(
  Object.isFrozen(first.state) &&
    Object.isFrozen(first.state.records) &&
    first.state.records.every(Object.isFrozen),
);

// Production reference validation uses actual authored map and encounter catalogs.
const mapRooms = SCRAP_AWAKENING_MAP.regions.flatMap((region) => region.rooms);
const entities = mapRooms.flatMap((room) => room.entities);
for (const profile of QUEST_CATALOG.profiles) {
  const room = mapRooms.find((room) => room.id === profile.objective.roomId);
  assert.ok(room, profile.id + ' room');
  assert.ok(
    entities.some((entity) => entity.id === profile.issuerId),
    profile.id + ' issuer',
  );
  for (const id of profile.objective.targetIds)
    assert.ok(
      room.renderItems.some((item) => item.id === id),
      profile.id + ' target ' + id,
    );
}
for (const profile of QUEST_WORLD_PROFILES.nightEncounters)
  assert.ok(ENCOUNTER_PROFILES[profile.encounterProfileId]);
console.log(
  JSON.stringify({
    status: 'PASS',
    checks: [
      'deterministic-four-slots-refill-once-per-day',
      'acceptance-carry-and-deadlines-before-events',
      'occurrence-source-night-only-completion',
      'atomic-reward-payload-and-hidden-tool-once',
      'routine-no-patch-important-outcome-epilogue',
      'main-linked-readonly-and-strict-save-validation',
      'actual-map-issuer-target-encounter-references',
    ],
  }),
);

for (const outcome of QUEST_WORLD_PROFILES.outcomes) {
  const entities = outcome.issuerEntityIds.map((id) => ({
    id,
    conversationId: id + ':conversation',
    lines: ['기존 첫줄', '기존 중간줄', '기존 마지막줄'],
  }));
  const changed = applyQuestNpcOutcomes(entities, {
    worldFacts: { [outcome.factId]: outcome.value },
  });
  for (let i = 0; i < entities.length; i++) {
    assert.deepEqual(changed[i].lines, [
      entities[i].lines[0],
      outcome.response,
      ...entities[i].lines.slice(1),
    ]);
    assert.ok(changed[i].conversationId.endsWith(':field:' + outcome.value));
  }
}
console.log(
  'PASS important NPC outcomes preserve original dialogue in before/working/after states',
);

const work = QUEST_CATALOG.getProfile('harbor-workline-clear').objective;
assert.equal(resolveQuestFieldMethod(work, context()).assisted, true);
assert.equal(resolveQuestFieldMethod(work, context(0, { fieldCapabilities: [] })).allowed, true);
assert.equal(resolveQuestFieldMethod(work, context(0, { fieldCapabilities: [] })).assisted, false);
assert.equal(
  resolveQuestFieldMethod(
    { ...work, capabilityMode: 'require' },
    context(0, { fieldCapabilities: [] }),
  ).allowed,
  false,
);
console.log(
  'PASS field capability assists actual work with manual fallback and explicit require contract',
);
