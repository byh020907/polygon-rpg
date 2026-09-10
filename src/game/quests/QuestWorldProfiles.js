import { freezeQuestData } from './QuestProfiles.js';
export const QUEST_WORLD_PROFILES = freezeQuestData({
  boards: [
    {
      id: 'mine-field-board',
      regionId: 'abandoned-mine',
      roomId: 'abandoned-mine-roadhead',
      issuerId: 'mine-waiting-miner',
    },
    {
      id: 'harbor-field-board',
      regionId: 'harbor-shipyard',
      roomId: 'harbor-shipyard-roadhead',
      issuerId: 'shipyard-waiting-crew',
      issuerEntityIds: [
        'shipyard-waiting-crew',
        'shipyard-waiting-crew-after',
        'shipyard-waiting-crew-working',
      ],
    },
  ],
  nightEncounters: [
    {
      id: 'mine-night-workline',
      profileId: 'mine-night-workline',
      roomId: 'abandoned-mine-roadhead',
      phaseId: 'night',
      encounterProfileId: 'mine-claim-jacker',
      sourceId: 'mine-night-workline',
    },
  ],
  outcomes: [
    {
      factId: 'harbor-lamp-service',
      value: 'serviced',
      regionId: 'harbor-shipyard',
      roomId: 'harbor-shipyard-roadhead',
      issuerId: 'shipyard-waiting-crew',
      issuerEntityIds: [
        'shipyard-waiting-crew',
        'shipyard-waiting-crew-after',
        'shipyard-waiting-crew-working',
      ],
      presentation: { targetRole: 'field-quest-lamp', state: 'serviced', lightEnabled: true },
      response: '작업등 접속을 손봐 둔 덕분에 밤에도 신호를 확인하기 편해졌습니다.',
      epilogue: '항구에는 정비한 작업등이 남아 밤 작업을 돕는다.',
    },
    {
      factId: 'harbor-lamp-service',
      value: 'temporary-lighting',
      regionId: 'harbor-shipyard',
      roomId: 'harbor-shipyard-roadhead',
      issuerId: 'shipyard-waiting-crew',
      issuerEntityIds: [
        'shipyard-waiting-crew',
        'shipyard-waiting-crew-after',
        'shipyard-waiting-crew-working',
      ],
      presentation: {
        targetRole: 'field-quest-lamp',
        state: 'temporary-lighting',
        lightEnabled: true,
      },
      response: '정비 대신 임시 조명을 놓고 작업을 이어가고 있습니다.',
      epilogue: '항구 사람들은 임시 조명으로 밤 작업을 이어갔다.',
    },
  ],
  explorations: [
    {
      id: 'mine-cable-cache',
      sourceId: 'mine-cable-cache',
      regionId: 'abandoned-mine',
      roomId: 'abandoned-mine-roadhead',
      capabilityId: 'cable-cut',
      label: '판금 뒤 회수품',
      clue: '판금 틈 뒤로 케이블 끝이 이어져 있다.',
      rewards: {
        gold: 30,
        materials: { 'salvaged-steel': 3 },
        trainingMarks: 0,
        equipmentItemIds: ['field-work-lamp'],
      },
    },
  ],
});
export function getQuestWorldOutcomes(state) {
  return freezeQuestData(
    QUEST_WORLD_PROFILES.outcomes.filter(
      (outcome) => state.worldFacts[outcome.factId] === outcome.value,
    ),
  );
}
export function createQuestEpilogueReadModel(state) {
  return freezeQuestData({
    outcomes: getQuestWorldOutcomes(state).map(
      ({ factId, value, regionId, issuerId, epilogue }) => ({
        factId,
        value,
        regionId,
        issuerId,
        text: epilogue,
      }),
    ),
  });
}
export function getQuestNightEncounters(state, context) {
  if (context.phaseId !== 'night') return Object.freeze([]);
  return freezeQuestData(
    QUEST_WORLD_PROFILES.nightEncounters.flatMap((profile) =>
      state.records
        .filter((record) => record.profileId === profile.profileId && record.status === 'accepted')
        .map((record) => ({
          ...profile,
          instanceId: record.instanceId,
          occurrenceId: record.instanceId + ':objective',
        })),
    ),
  );
}

const npcCache = new WeakMap();
export function applyQuestNpcOutcomes(entities, state) {
  const previous = npcCache.get(entities);
  if (previous?.facts === state.worldFacts) return previous.value;
  const outcomes = getQuestWorldOutcomes(state);
  const value = freezeQuestData(
    entities.map((entity) => {
      const outcome = outcomes.find((o) => (o.issuerEntityIds ?? [o.issuerId]).includes(entity.id));
      if (!outcome || !Array.isArray(entity.lines)) return entity;
      return {
        ...entity,
        conversationId: entity.conversationId + ':field:' + outcome.value,
        lines: [entity.lines[0], outcome.response, ...entity.lines.slice(1)],
      };
    }),
  );
  npcCache.set(entities, { facts: state.worldFacts, value });
  return value;
}
