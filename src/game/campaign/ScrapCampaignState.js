import {
  CAMPAIGN_SEGMENTS_PER_DAY,
  CAMPAIGN_TIME_PHASES,
  SCRAP_CAMPAIGN_CAPITAL_ID,
  SCRAP_CAMPAIGN_INITIAL_DEADLINE_SEGMENTS,
  SCRAP_CAMPAIGN_PART_IDS,
  SCRAP_CAMPAIGN_REGION_IDS,
  SCRAP_CAMPAIGN_REGION_STATUS,
  SCRAP_CAMPAIGN_START_LOCATION_ID,
} from './ScrapCampaignContract.js';
import {
  SCRAP_AWAKENING_STAGE,
  assertScrapAwakeningStageId,
  getScrapAwakeningPresentation,
  isScrapAwakeningActive,
  isScrapAwakeningDeadlineRevealed,
  nextScrapAwakeningStage,
} from './ScrapAwakeningState.js';

export const SCRAP_CAMPAIGN_SCHEMA_VERSION = 2;
const LEGACY_SCRAP_CAMPAIGN_SCHEMA_VERSION = 1;

export const SCRAP_CAMPAIGN_ACTION_KIND = Object.freeze({
  FREE: 'free',
  TRAVEL: 'travel',
  REST: 'rest',
  KO_RETURN: 'ko-return',
  REGION_SUCCESS: 'region-success',
  CONVOY_CHASE: 'convoy-chase',
});

export const SCRAP_CAMPAIGN_ACTION_REASON = Object.freeze({
  COMMITTED: 'committed',
  ALREADY_COMMITTED: 'already-committed',
});

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label}은(는) 0 이상의 안전한 정수여야 합니다.`);
  }
}

function assertId(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label}은(는) 비어 있지 않은 문자열이어야 합니다.`);
  }
}

function assertProfile(profile) {
  if (
    !profile ||
    !Array.isArray(profile.regions) ||
    !Array.isArray(profile.routes) ||
    profile.regions.length !== SCRAP_CAMPAIGN_REGION_IDS.length ||
    typeof profile.getRegion !== 'function' ||
    !Number.isSafeInteger(profile.initialDeadlineSegments)
  ) {
    throw new TypeError('고철 캠페인 authored profile이 필요합니다.');
  }
  for (const regionId of SCRAP_CAMPAIGN_REGION_IDS) {
    if (!profile.getRegion(regionId))
      throw new Error(`campaign region profile이 없습니다: ${regionId}`);
  }
  return profile;
}

function optionalProfile(profile) {
  return profile === undefined || profile === null ? null : assertProfile(profile);
}

function freezeSnapshot({
  elapsedSegments,
  deadlineSegments,
  rivalProgressSegments,
  rivalDelaySegments,
  currentLocationId,
  regionStates,
  collectedPartIds,
  committedActionIds,
  awakeningStageId,
  gameOver,
  lastChangeLabel,
}) {
  return Object.freeze({
    version: SCRAP_CAMPAIGN_SCHEMA_VERSION,
    elapsedSegments,
    deadlineSegments,
    rivalProgressSegments,
    rivalDelaySegments,
    currentLocationId,
    regionStates: Object.freeze({ ...regionStates }),
    collectedPartIds: Object.freeze([...collectedPartIds]),
    committedActionIds: Object.freeze([...committedActionIds]),
    awakeningStageId: assertScrapAwakeningStageId(awakeningStageId),
    gameOver,
    lastChangeLabel,
  });
}

export function createScrapCampaignSnapshot(profile) {
  const authored = optionalProfile(profile);
  return freezeSnapshot({
    elapsedSegments: 0,
    deadlineSegments: authored?.initialDeadlineSegments ?? SCRAP_CAMPAIGN_INITIAL_DEADLINE_SEGMENTS,
    rivalProgressSegments: 0,
    rivalDelaySegments: 0,
    currentLocationId: authored?.startLocation.id ?? SCRAP_CAMPAIGN_START_LOCATION_ID,
    regionStates: Object.fromEntries(
      SCRAP_CAMPAIGN_REGION_IDS.map((regionId) => [
        regionId,
        SCRAP_CAMPAIGN_REGION_STATUS.AVAILABLE,
      ]),
    ),
    collectedPartIds: [],
    committedActionIds: [],
    awakeningStageId: SCRAP_AWAKENING_STAGE.COMMISSION,
    gameOver: false,
    lastChangeLabel: '첫 수거 의뢰 · 제어장치 회수 전',
  });
}

export function toScrapCampaignSnapshot(value, profile) {
  const authored = optionalProfile(profile);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('scrap campaign snapshot은 객체여야 합니다.');
  }
  if (
    value.version !== SCRAP_CAMPAIGN_SCHEMA_VERSION &&
    value.version !== LEGACY_SCRAP_CAMPAIGN_SCHEMA_VERSION
  ) {
    throw new Error(`지원하지 않는 scrap campaign schema version입니다: ${value.version}`);
  }
  for (const [field, label] of [
    ['elapsedSegments', '경과 구간'],
    ['deadlineSegments', '남은 D-DAY 구간'],
    ['rivalProgressSegments', '고철 대왕 진행 구간'],
    ['rivalDelaySegments', '고철 대왕 우회 지연 구간'],
  ]) {
    assertNonNegativeInteger(value[field], label);
  }
  assertId(value.currentLocationId, '현재 위치 ID');
  const locationIds = new Set([
    authored?.startLocation.id ?? SCRAP_CAMPAIGN_START_LOCATION_ID,
    authored?.capital.id ?? SCRAP_CAMPAIGN_CAPITAL_ID,
    ...SCRAP_CAMPAIGN_REGION_IDS,
  ]);
  if (!locationIds.has(value.currentLocationId)) {
    throw new Error(`지원하지 않는 campaign 위치입니다: ${value.currentLocationId}`);
  }
  if (
    !value.regionStates ||
    typeof value.regionStates !== 'object' ||
    Array.isArray(value.regionStates)
  ) {
    throw new TypeError('campaign region state가 필요합니다.');
  }
  const stateEntries = Object.entries(value.regionStates);
  if (
    stateEntries.length !== SCRAP_CAMPAIGN_REGION_IDS.length ||
    stateEntries.some(
      ([regionId, status]) =>
        !SCRAP_CAMPAIGN_REGION_IDS.includes(regionId) ||
        !Object.values(SCRAP_CAMPAIGN_REGION_STATUS).includes(status),
    )
  ) {
    throw new TypeError('campaign region state가 stable region contract와 일치하지 않습니다.');
  }
  for (const [field, label] of [
    ['collectedPartIds', '회수 part ID'],
    ['committedActionIds', '확정 campaign action ID'],
  ]) {
    if (!Array.isArray(value[field])) throw new TypeError(`${label} 목록은 배열이어야 합니다.`);
    const unique = new Set();
    for (const id of value[field]) {
      assertId(id, label);
      if (unique.has(id)) throw new Error(`${label}가 중복됩니다: ${id}`);
      unique.add(id);
    }
  }
  const knownPartIds = new Set(
    authored?.regions.map((region) => region.part.id) ?? SCRAP_CAMPAIGN_PART_IDS,
  );
  if (value.collectedPartIds.some((partId) => !knownPartIds.has(partId))) {
    throw new TypeError('지원하지 않는 campaign part가 있습니다.');
  }
  if (typeof value.gameOver !== 'boolean' || value.gameOver !== (value.deadlineSegments === 0)) {
    throw new TypeError('campaign game-over 상태는 D-DAY 0과 일치해야 합니다.');
  }
  if (typeof value.lastChangeLabel !== 'string') {
    throw new TypeError('campaign 최근 변화 label은 문자열이어야 합니다.');
  }
  return freezeSnapshot({
    ...value,
    awakeningStageId:
      value.version === LEGACY_SCRAP_CAMPAIGN_SCHEMA_VERSION
        ? SCRAP_AWAKENING_STAGE.COMMISSION
        : value.awakeningStageId,
  });
}

function awakeningTransaction(current, nextStageId) {
  if (current.awakeningStageId === nextStageId) {
    return Object.freeze({ changed: false, reason: 'already-at-stage', snapshot: current });
  }
  const presentation = getScrapAwakeningPresentation(nextStageId);
  return Object.freeze({
    changed: true,
    reason: 'awakening-stage-advanced',
    snapshot: freezeSnapshot({
      ...current,
      awakeningStageId: nextStageId,
      lastChangeLabel: presentation.cue,
    }),
  });
}

export function startScrapAwakening(snapshot, profile) {
  const current = toScrapCampaignSnapshot(snapshot, profile);
  if (current.awakeningStageId !== SCRAP_AWAKENING_STAGE.COMMISSION) {
    return Object.freeze({ changed: false, reason: 'already-started', snapshot: current });
  }
  return awakeningTransaction(current, SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
}

export function advanceScrapAwakening(snapshot, profile) {
  const current = toScrapCampaignSnapshot(snapshot, profile);
  if (
    current.awakeningStageId === SCRAP_AWAKENING_STAGE.COMMISSION ||
    current.awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE
  ) {
    return Object.freeze({ changed: false, reason: 'not-advancing', snapshot: current });
  }
  return awakeningTransaction(current, nextScrapAwakeningStage(current.awakeningStageId));
}

function validateAction(action, profile) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw new TypeError('campaign action이 필요합니다.');
  }
  assertId(action.actionId, 'campaign action ID');
  assertId(action.label, 'campaign action label');
  if (!Object.values(SCRAP_CAMPAIGN_ACTION_KIND).includes(action.kind)) {
    throw new TypeError(`지원하지 않는 campaign action입니다: ${action.kind}`);
  }
  assertNonNegativeInteger(action.costSegments, 'campaign action 비용');
  const extensionSegments = action.extensionSegments ?? 0;
  assertNonNegativeInteger(extensionSegments, 'campaign D-DAY 연장');
  if (action.kind === SCRAP_CAMPAIGN_ACTION_KIND.FREE && action.costSegments !== 0) {
    throw new Error('무료 action은 시간 비용이 0이어야 합니다.');
  }
  if (
    [
      SCRAP_CAMPAIGN_ACTION_KIND.TRAVEL,
      SCRAP_CAMPAIGN_ACTION_KIND.REST,
      SCRAP_CAMPAIGN_ACTION_KIND.KO_RETURN,
    ].includes(action.kind) &&
    action.costSegments !== 1
  ) {
    throw new Error('장거리 이동·완전 회복·KO 복귀는 정확히 1구간이어야 합니다.');
  }
  if (action.kind === SCRAP_CAMPAIGN_ACTION_KIND.CONVOY_CHASE && action.costSegments !== 2) {
    throw new Error('수송대 추격은 정확히 2구간이어야 합니다.');
  }
  if (action.targetRegionId !== undefined && !profile.getRegion(action.targetRegionId)) {
    throw new Error(`지원하지 않는 target region입니다: ${action.targetRegionId}`);
  }
  if (action.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_SUCCESS) {
    const region = profile.getRegion(action.targetRegionId);
    if (
      !region ||
      action.costSegments !== region.event.costSegments ||
      extensionSegments !== region.event.extensionSegments ||
      extensionSegments < CAMPAIGN_SEGMENTS_PER_DAY * 2 ||
      extensionSegments > CAMPAIGN_SEGMENTS_PER_DAY * 5 ||
      action.costSegments <= extensionSegments
    ) {
      throw new Error('지역 성공 action은 authored 사건 비용·2~5일 연장과 일치해야 합니다.');
    }
  }
  return Object.freeze({ ...action, extensionSegments });
}

function timeReadModel(elapsedSegments, deadlineSegments) {
  const phaseIndex = elapsedSegments % CAMPAIGN_SEGMENTS_PER_DAY;
  const phase = CAMPAIGN_TIME_PHASES[phaseIndex];
  return Object.freeze({
    day: Math.floor(elapsedSegments / CAMPAIGN_SEGMENTS_PER_DAY) + 1,
    phaseId: phase.id,
    phaseLabel: phase.label,
    deadlineSegments,
    deadlineDays: Math.ceil(deadlineSegments / CAMPAIGN_SEGMENTS_PER_DAY),
    deadlineLabel:
      deadlineSegments === 0
        ? 'D-DAY 0'
        : `D-${Math.ceil(deadlineSegments / CAMPAIGN_SEGMENTS_PER_DAY)}`,
  });
}

export function previewScrapCampaignAction(snapshot, action, profile) {
  const current = toScrapCampaignSnapshot(snapshot, profile);
  const authoredAction = validateAction(action, profile);
  const alreadyCommitted = current.committedActionIds.includes(authoredAction.actionId);
  const willGameOver = !alreadyCommitted && authoredAction.costSegments >= current.deadlineSegments;
  const nextDeadlineSegments = alreadyCommitted
    ? current.deadlineSegments
    : willGameOver
      ? 0
      : current.deadlineSegments - authoredAction.costSegments + authoredAction.extensionSegments;
  return Object.freeze({
    actionId: authoredAction.actionId,
    label: authoredAction.label,
    kind: authoredAction.kind,
    costSegments: authoredAction.costSegments,
    extensionSegments: authoredAction.extensionSegments,
    alreadyCommitted,
    requiresDeadlineWarning: willGameOver,
    willGameOver,
    before: timeReadModel(current.elapsedSegments, current.deadlineSegments),
    after: timeReadModel(
      current.elapsedSegments + (alreadyCommitted ? 0 : authoredAction.costSegments),
      nextDeadlineSegments,
    ),
  });
}

function progressRival(regionStates, rivalProgressSegments, profile) {
  const nextStates = { ...regionStates };
  for (const region of profile.regions) {
    if (
      nextStates[region.id] === SCRAP_CAMPAIGN_REGION_STATUS.AVAILABLE &&
      rivalProgressSegments >= region.route.rivalArrivalSegment
    ) {
      nextStates[region.id] = SCRAP_CAMPAIGN_REGION_STATUS.CONVOY;
    }
  }
  return nextStates;
}

export function commitScrapCampaignAction(snapshot, action, profile) {
  const current = toScrapCampaignSnapshot(snapshot, profile);
  const authoredAction = validateAction(action, profile);
  if (current.committedActionIds.includes(authoredAction.actionId)) {
    return Object.freeze({
      changed: false,
      reason: SCRAP_CAMPAIGN_ACTION_REASON.ALREADY_COMMITTED,
      preview: previewScrapCampaignAction(current, authoredAction, profile),
      snapshot: current,
    });
  }
  if (current.gameOver) throw new Error('D-DAY 0 이후에는 campaign action을 확정할 수 없습니다.');

  const preview = previewScrapCampaignAction(current, authoredAction, profile);
  const elapsedSegments = current.elapsedSegments + authoredAction.costSegments;
  const existingDelayUsed = Math.min(current.rivalDelaySegments, authoredAction.costSegments);
  const rivalProgressSegments =
    current.rivalProgressSegments + authoredAction.costSegments - existingDelayUsed;
  let rivalDelaySegments = current.rivalDelaySegments - existingDelayUsed;
  let regionStates = { ...current.regionStates };
  let collectedPartIds = [...current.collectedPartIds];
  let currentLocationId = current.currentLocationId;

  if (!preview.willGameOver) {
    const region = authoredAction.targetRegionId
      ? profile.getRegion(authoredAction.targetRegionId)
      : null;
    if (authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.TRAVEL) {
      if (!region) throw new Error('장거리 이동에는 target region이 필요합니다.');
      currentLocationId = region.id;
    }
    if (authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_SUCCESS) {
      if (regionStates[region.id] !== SCRAP_CAMPAIGN_REGION_STATUS.AVAILABLE) {
        throw new Error('고철 대왕보다 먼저 도착한 available region만 해결할 수 있습니다.');
      }
      regionStates[region.id] = SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED;
      if (!collectedPartIds.includes(region.part.id)) collectedPartIds.push(region.part.id);
      rivalDelaySegments += authoredAction.extensionSegments;
    }
    if (authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.CONVOY_CHASE) {
      if (!region || regionStates[region.id] !== SCRAP_CAMPAIGN_REGION_STATUS.CONVOY) {
        throw new Error('수송대로 넘어간 region part만 추격할 수 있습니다.');
      }
      regionStates[region.id] = SCRAP_CAMPAIGN_REGION_STATUS.RECOVERED;
      if (!collectedPartIds.includes(region.part.id)) collectedPartIds.push(region.part.id);
    }
    regionStates = progressRival(regionStates, rivalProgressSegments, profile);
  }

  const next = freezeSnapshot({
    elapsedSegments,
    deadlineSegments: preview.after.deadlineSegments,
    rivalProgressSegments,
    rivalDelaySegments,
    currentLocationId,
    regionStates,
    collectedPartIds,
    committedActionIds: [...current.committedActionIds, authoredAction.actionId],
    awakeningStageId: current.awakeningStageId,
    gameOver: preview.willGameOver,
    lastChangeLabel: preview.willGameOver
      ? `${authoredAction.label} · 고철 대왕 수도 도착`
      : authoredAction.label,
  });
  return Object.freeze({
    changed: true,
    reason: SCRAP_CAMPAIGN_ACTION_REASON.COMMITTED,
    preview,
    snapshot: next,
  });
}

export function getScrapCampaignReadModel(snapshot, profile) {
  const current = toScrapCampaignSnapshot(snapshot, profile);
  const time = timeReadModel(current.elapsedSegments, current.deadlineSegments);
  const regions = profile.regions.map((region) => {
    const status = current.regionStates[region.id];
    return Object.freeze({
      id: region.id,
      label: region.label,
      status,
      statusLabel:
        status === SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED
          ? '지역 해결 · 부품 회수'
          : status === SCRAP_CAMPAIGN_REGION_STATUS.RECOVERED
            ? '수송대 추격 · 부품 회수'
            : status === SCRAP_CAMPAIGN_REGION_STATUS.CONVOY
              ? '시설 파괴 · 수송대 추격 가능'
              : '사건 대기',
      travelSegments: region.route.travelSegments,
      eventSegments: region.event.costSegments,
      extensionDays: region.event.extensionSegments / CAMPAIGN_SEGMENTS_PER_DAY,
      machineLabel: region.machineLabel,
      partId: region.part.id,
      partLabel: region.part.label,
      robotModule: region.part.robotModule,
      collected: current.collectedPartIds.includes(region.part.id),
      color: region.visual.color,
      material: region.visual.material,
      eventStageIds: Object.freeze(region.eventStages.map((stage) => stage.id)),
      mapPatchId:
        status === SCRAP_CAMPAIGN_REGION_STATUS.CONVOY
          ? region.mapPatches.convoy
          : status === SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED ||
              status === SCRAP_CAMPAIGN_REGION_STATUS.RECOVERED
            ? region.mapPatches.resolved
            : region.mapPatches.before,
    });
  });
  const reachedRegions = profile.regions.filter(
    (region) => current.rivalProgressSegments >= region.route.rivalArrivalSegment,
  );
  const rivalRegion = reachedRegions.at(-1) ?? null;
  const nextRivalRegion = profile.regions.find(
    (region) => current.rivalProgressSegments < region.route.rivalArrivalSegment,
  );
  const completionPercent = Math.round(
    (current.collectedPartIds.length / profile.regions.length) * 100,
  );
  const currentLocation =
    profile.getRegion(current.currentLocationId) ??
    (current.currentLocationId === profile.capital.id ? profile.capital : profile.startLocation);
  const locationLabels = new Map([
    [profile.startLocation.id, profile.startLocation.label],
    [profile.capital.id, profile.capital.label],
    ...profile.regions.map((region) => [region.id, region.label]),
  ]);
  const routeEdges = profile.routes.map((route) =>
    Object.freeze({
      id: route.id,
      fromId: route.fromId,
      fromLabel: locationLabels.get(route.fromId),
      toId: route.toId,
      toLabel: locationLabels.get(route.toId),
      travelSegments: route.travelSegments,
    }),
  );
  const rivalArrival = timeReadModel(current.elapsedSegments + current.deadlineSegments, 0);
  return Object.freeze({
    ...time,
    hudLabel: isScrapAwakeningDeadlineRevealed(current.awakeningStageId)
      ? `Day ${time.day} · ${time.phaseLabel} · ${time.deadlineLabel}`
      : '첫 수거 의뢰 · 고철 대왕 각성 전',
    awakeningStageId: current.awakeningStageId,
    awakeningActive: isScrapAwakeningActive(current.awakeningStageId),
    deadlineRevealed: isScrapAwakeningDeadlineRevealed(current.awakeningStageId),
    awakening: getScrapAwakeningPresentation(current.awakeningStageId),
    currentLocationId: current.currentLocationId,
    currentLocationLabel: currentLocation.label,
    rivalLocationLabel: rivalRegion?.label ?? '각성지',
    rivalDirectionLabel: current.gameOver
      ? profile.capital.label
      : (nextRivalRegion?.label ?? profile.capital.label),
    rivalArrivalLabel: `Day ${rivalArrival.day} · ${rivalArrival.phaseLabel}`,
    rivalDelaySegments: current.rivalDelaySegments,
    lastChangeLabel: current.lastChangeLabel,
    collectedPartCount: current.collectedPartIds.length,
    totalPartCount: profile.regions.length,
    completionPercent,
    finalBattleAvailable: current.collectedPartIds.length === profile.regions.length,
    gameOver: current.gameOver,
    routeEdges: Object.freeze(routeEdges),
    regions: Object.freeze(regions),
  });
}
