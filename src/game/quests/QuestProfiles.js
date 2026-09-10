import { evaluateEquipmentFieldCapability } from '../equipment/EquipmentFieldCapabilities.js';
export const QUEST_PHASE_IDS = Object.freeze(['morning', 'day', 'evening', 'night']);
export const QUEST_SLOT_LIMIT = 4;
export const QUEST_RECORD_LIMIT = 512;
export const QUEST_MAX_SEGMENTS = 1000000;
export function freezeQuestData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeQuestData);
    Object.freeze(value);
  }
  return value;
}
export function assertQuestId(id) {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9:-]{0,199}$/.test(id))
    throw new TypeError('Invalid quest ID');
  return id;
}
export function assertQuestTime(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > QUEST_MAX_SEGMENTS)
    throw new RangeError('Invalid quest campaign time');
  return value;
}
const reward = (gold, steel, trainingMarks = 0) => ({
  gold,
  materials: { 'salvaged-steel': steel },
  trainingMarks,
  equipmentItemIds: [],
});
const profiles = [
  {
    id: 'mine-lamp-check',
    regionId: 'abandoned-mine',
    issuerId: 'mine-waiting-miner',
    title: '진입부 작업등 점검',
    summary: '작업등의 접속을 확인한다.',
    deadlineSegments: 4,
    objective: {
      kind: 'field-action',
      sourceId: 'mine-lamp-check',
      roomId: 'abandoned-mine-roadhead',
      targetIds: ['mine-gate-lantern-dim', 'mine-gate-lantern-lit'],
      workSegments: 0,
    },
    rewards: reward(24, 2),
  },
  {
    id: 'mine-rail-brace',
    regionId: 'abandoned-mine',
    issuerId: 'mine-waiting-miner',
    title: '터널 작업 지지대 확인',
    summary: '통행을 방해하지 않도록 작업 지지대를 점검한다.',
    deadlineSegments: 6,
    objective: {
      kind: 'field-action',
      sourceId: 'mine-rail-brace',
      roomId: 'abandoned-mine-rescue-tunnel',
      targetIds: ['mine-tunnel-floor-rail'],
      capabilityId: 'brace',
      capabilityMode: 'assist',
      workSegments: 1,
    },
    rewards: reward(30, 2),
  },
  {
    id: 'harbor-lamp-service',
    regionId: 'harbor-shipyard',
    issuerId: 'shipyard-waiting-crew',
    title: '항구 작업등 접속 정비',
    summary: '임시 조명에 의지하기 전에 접속을 정비한다.',
    deadlineSegments: 4,
    repeatable: false,
    worldOutcome: {
      factId: 'harbor-lamp-service',
      completed: 'serviced',
      neglected: 'temporary-lighting',
    },
    objective: {
      kind: 'field-action',
      sourceId: 'harbor-lamp-service',
      roomId: 'harbor-shipyard-roadhead',
      targetIds: ['shipyard-gate-lamp-dim', 'shipyard-gate-lamp-lit'],
      workSegments: 1,
    },
    rewards: reward(40, 3, 1),
  },
  {
    id: 'harbor-workline-clear',
    regionId: 'harbor-shipyard',
    issuerId: 'shipyard-waiting-crew',
    title: '건선거 작업선 정리',
    summary: '걸린 작업선을 잘라내거나 수동으로 풀어 정리한다.',
    deadlineSegments: 6,
    objective: {
      kind: 'field-action',
      sourceId: 'harbor-workline-clear',
      roomId: 'harbor-shipyard-occupied-drydock',
      targetIds: [
        'shipyard-drydock-keel-rail-left',
        'shipyard-drydock-keel-rail-right',
        'shipyard-drydock-collector-chain',
      ],
      capabilityId: 'cable-cut',
      capabilityMode: 'assist',
      workSegments: 1,
    },
    rewards: reward(30, 2),
  },
  {
    id: 'mine-night-workline',
    regionId: 'abandoned-mine',
    issuerId: 'mine-waiting-miner',
    title: '밤 작업등 아래 작업선 확보',
    summary: '밤 작업등에 모인 수거 유닛을 제압한다.',
    deadlineSegments: 4,
    objective: {
      kind: 'encounter',
      sourceId: 'mine-night-workline',
      roomId: 'abandoned-mine-roadhead',
      targetIds: ['mine-gate-lantern-lit'],
      phaseId: 'night',
      workSegments: 0,
    },
    rewards: reward(36, 3),
  },
  {
    id: 'harbor-night-inspection',
    regionId: 'harbor-shipyard',
    issuerId: 'shipyard-waiting-crew',
    title: '야간 하역 신호 확인',
    summary: '밤 작업등에서 하역 신호 상태를 확인한다.',
    deadlineSegments: 4,
    objective: {
      kind: 'field-action',
      sourceId: 'harbor-night-inspection',
      roomId: 'harbor-shipyard-roadhead',
      targetIds: ['shipyard-gate-lamp-lit'],
      phaseId: 'night',
      workSegments: 0,
    },
    rewards: reward(24, 2),
  },
].map((profile) => ({
  ...profile,
  type: 'general',
  repeatable: true,
  ...profile,
  availability: { garageRevealed: true, accessibleRoomId: profile.objective.roomId },
}));
export function createQuestCatalog(entries) {
  if (!Array.isArray(entries) || entries.length > 128) throw new TypeError('Invalid quest catalog');
  const copy = structuredClone(entries),
    ids = new Set();
  for (const profile of copy) {
    assertQuestId(profile.id);
    if (ids.has(profile.id)) throw new TypeError('Duplicate quest profile');
    ids.add(profile.id);
    if (
      profile.type !== 'general' ||
      typeof profile.repeatable !== 'boolean' ||
      !Number.isSafeInteger(profile.deadlineSegments) ||
      profile.deadlineSegments < 1 ||
      profile.deadlineSegments > 16 ||
      typeof profile.title !== 'string' ||
      !profile.title ||
      typeof profile.summary !== 'string'
    )
      throw new TypeError('Invalid quest profile');
    assertQuestId(profile.regionId);
    assertQuestId(profile.issuerId);
    const objective = profile.objective;
    if (
      !objective ||
      !['field-action', 'encounter'].includes(objective.kind) ||
      ![0, 1].includes(objective.workSegments) ||
      (objective.phaseId !== undefined && !QUEST_PHASE_IDS.includes(objective.phaseId))
    )
      throw new TypeError('Invalid quest objective');
    assertQuestId(objective.sourceId);
    assertQuestId(objective.roomId);
    if (objective.capabilityId) {
      assertQuestId(objective.capabilityId);
      if (objective.capabilityMode !== 'assist')
        throw new TypeError('Routine field capabilities must be soft assistance');
    }
    if (!profile.availability || typeof profile.availability.garageRevealed !== 'boolean')
      throw new TypeError('Invalid quest availability');
    assertQuestId(profile.availability.accessibleRoomId);
    assertQuestReward(profile.rewards);
    if (profile.worldOutcome) {
      const outcome = profile.worldOutcome;
      assertQuestId(outcome.factId);
      assertQuestId(outcome.completed);
      assertQuestId(outcome.neglected);
      if (profile.repeatable || outcome.completed === outcome.neglected)
        throw new TypeError('Important quest outcomes must be distinct and one-shot');
    }
  }
  freezeQuestData(copy);
  return Object.freeze({
    profiles: copy,
    getProfile(id) {
      const profile = copy.find((p) => p.id === id);
      if (!profile) throw new RangeError('Unknown quest profile ' + id);
      return profile;
    },
  });
}
export function assertQuestReward(bundle) {
  if (
    !bundle ||
    !Number.isSafeInteger(bundle.gold) ||
    bundle.gold < 0 ||
    !Number.isSafeInteger(bundle.trainingMarks) ||
    bundle.trainingMarks < 0 ||
    !bundle.materials ||
    Array.isArray(bundle.materials) ||
    !Array.isArray(bundle.equipmentItemIds)
  )
    throw new TypeError('Invalid quest reward');
  for (const [id, amount] of Object.entries(bundle.materials)) {
    assertQuestId(id);
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new TypeError('Invalid quest material reward');
  }
  bundle.equipmentItemIds.forEach(assertQuestId);
  if (new Set(bundle.equipmentItemIds).size !== bundle.equipmentItemIds.length)
    throw new TypeError('Duplicate quest equipment reward');
}
export const QUEST_CATALOG = createQuestCatalog(profiles);
export function resolveQuestFieldMethod(objective, context) {
  if (!objective.capabilityId) return { allowed: true, label: null };
  const result = evaluateEquipmentFieldCapability(context, {
    capabilityId: objective.capabilityId,
    mode: objective.capabilityMode,
  });
  return { ...result, label: result.available ? '장비로 보조' : '수동으로 처리' };
}
export function questInstanceId(profileId, day) {
  return `quest:${profileId}:day:${day}`;
}
export function getQuestOccurrenceId(recordOrId) {
  return `${typeof recordOrId === 'string' ? recordOrId : recordOrId.instanceId}:objective`;
}
export function normalizeQuestContext(context) {
  if (!context || typeof context !== 'object')
    throw new TypeError('Quest campaign context required');
  const elapsedSegments = assertQuestTime(context.elapsedSegments),
    day = Math.floor(elapsedSegments / 4) + 1,
    phaseId = QUEST_PHASE_IDS[elapsedSegments % 4];
  if (
    (context.day !== undefined && context.day !== day) ||
    (context.phaseId !== undefined && context.phaseId !== phaseId)
  )
    throw new TypeError('Quest context must match campaign time');
  const accessibleRoomIds = context.accessibleRoomIds ?? [],
    fieldCapabilities = context.fieldCapabilities ?? [];
  for (const list of [accessibleRoomIds, fieldCapabilities]) {
    if (!Array.isArray(list)) throw new TypeError('Quest context ID arrays required');
    list.forEach(assertQuestId);
  }
  return {
    ...context,
    elapsedSegments,
    day,
    phaseId,
    accessibleRoomIds,
    fieldCapabilities,
    garageRevealed:
      context.garageRevealed === true || context.campaignReadModel?.garageRevealComplete === true,
  };
}
export function isQuestAvailable(profile, context) {
  return (
    context.campaignReadModel?.gameOver !== true &&
    (!profile.availability.garageRevealed || context.garageRevealed) &&
    context.accessibleRoomIds.includes(profile.availability.accessibleRoomId) &&
    (!context.accessibleRegionIds || context.accessibleRegionIds.includes(profile.regionId))
  );
}
