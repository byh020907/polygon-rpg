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
import {
  SCRAP_GARAGE_REVEAL_STAGE,
  assertScrapGarageRevealStageId,
  getScrapGarageRevealPresentation,
  isScrapGarageRevealActive,
  nextScrapGarageRevealStage,
} from './ScrapGarageRevealState.js';
import {
  SCRAP_FINAL_BATTLE_STAGE,
  assertScrapFinalBattleStageId,
  getScrapFinalBattlePresentation,
  isScrapFinalBattleActive,
  nextScrapFinalBattleStage,
} from './ScrapFinalBattleState.js';

export const SCRAP_CAMPAIGN_SCHEMA_VERSION = 7;
const REGION_STATUS_MIGRATION_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION = 6;
const FINAL_BATTLE_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION = 5;
const ISSUE_WINDOW_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION = 4;
const REGION_STAGE_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION = 3;
const GARAGE_REVEAL_SCRAP_CAMPAIGN_SCHEMA_VERSION = 2;
const LEGACY_SCRAP_CAMPAIGN_SCHEMA_VERSION = 1;
const REMOVED_LEGACY_REGION_STATUS = ['con', 'voy'].join('');

export const SCRAP_CAMPAIGN_ACTION_KIND = Object.freeze({
  FREE: 'free',
  TRAVEL: 'travel',
  REST: 'rest',
  KO_RETURN: 'ko-return',
  ISSUE_FOCUS: 'issue-focus',
  REGION_STAGE: 'region-stage',
  REGION_EVENT_START: 'region-event-start',
  REGION_SUCCESS: 'region-success',
  FINAL_BATTLE_STAGE: 'final-battle-stage',
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
    !Array.isArray(profile.primaryIssues) ||
    typeof profile.getPrimaryIssue !== 'function' ||
    typeof profile.getPrimaryIssueForRegion !== 'function' ||
    typeof profile.getLinkedIssue !== 'function' ||
    !Number.isSafeInteger(profile.initialDeadlineSegments)
  ) {
    throw new TypeError('고철 캠페인 authored profile이 필요합니다.');
  }
  for (const regionId of SCRAP_CAMPAIGN_REGION_IDS) {
    if (!profile.getRegion(regionId))
      throw new Error(`campaign region profile이 없습니다: ${regionId}`);
    const primaryIssue = profile.getPrimaryIssueForRegion(regionId);
    if (
      !primaryIssue ||
      primaryIssue.regionId !== regionId ||
      !Array.isArray(primaryIssue.linkedIssues) ||
      primaryIssue.linkedIssues.length > 2
    ) {
      throw new Error(`campaign primary issue profile이 없습니다: ${regionId}`);
    }
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
  regionEventStageIds,
  activePrimaryIssueId,
  completedIssueIds,
  collectedPartIds,
  committedActionIds,
  awakeningStageId,
  garageRevealStageId,
  finalBattleStageId,
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
    regionEventStageIds: Object.freeze({ ...regionEventStageIds }),
    activePrimaryIssueId,
    completedIssueIds: Object.freeze([...completedIssueIds]),
    collectedPartIds: Object.freeze([...collectedPartIds]),
    committedActionIds: Object.freeze([...committedActionIds]),
    awakeningStageId: assertScrapAwakeningStageId(awakeningStageId),
    garageRevealStageId: assertScrapGarageRevealStageId(garageRevealStageId),
    finalBattleStageId: assertScrapFinalBattleStageId(finalBattleStageId),
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
    regionEventStageIds: Object.fromEntries(
      SCRAP_CAMPAIGN_REGION_IDS.map((regionId) => [regionId, null]),
    ),
    activePrimaryIssueId: null,
    completedIssueIds: [],
    collectedPartIds: [],
    committedActionIds: [],
    awakeningStageId: SCRAP_AWAKENING_STAGE.COMMISSION,
    garageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.LOCKED,
    finalBattleStageId: SCRAP_FINAL_BATTLE_STAGE.INACTIVE,
    gameOver: false,
    lastChangeLabel: '첫 수거 의뢰 · 제어핵 회수 전',
  });
}

export function toScrapCampaignSnapshot(value, profile) {
  const authored = optionalProfile(profile);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('scrap campaign snapshot은 객체여야 합니다.');
  }
  if (
    value.version !== SCRAP_CAMPAIGN_SCHEMA_VERSION &&
    value.version !== REGION_STATUS_MIGRATION_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION &&
    value.version !== FINAL_BATTLE_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION &&
    value.version !== ISSUE_WINDOW_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION &&
    value.version !== REGION_STAGE_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION &&
    value.version !== GARAGE_REVEAL_SCRAP_CAMPAIGN_SCHEMA_VERSION &&
    value.version !== LEGACY_SCRAP_CAMPAIGN_SCHEMA_VERSION
  ) {
    throw new Error(`지원하지 않는 scrap campaign schema version입니다: ${value.version}`);
  }
  for (const [field, label] of [
    ['elapsedSegments', '경과 구간'],
    ['deadlineSegments', '남은 D-DAY 구간'],
    ['rivalProgressSegments', '고대 병기 진행 구간'],
    ['rivalDelaySegments', '고대 병기 우회 지연 구간'],
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
  const regionStates = Object.fromEntries(
    Object.entries(value.regionStates).map(([regionId, status]) => [
      regionId,
      value.version === REGION_STATUS_MIGRATION_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION &&
      status === REMOVED_LEGACY_REGION_STATUS
        ? SCRAP_CAMPAIGN_REGION_STATUS.AVAILABLE
        : value.version === REGION_STATUS_MIGRATION_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION &&
            status === 'recovered'
          ? SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED
          : status,
    ]),
  );
  const stateEntries = Object.entries(regionStates);
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
  const regionEventStageIds = [
    SCRAP_CAMPAIGN_SCHEMA_VERSION,
    REGION_STATUS_MIGRATION_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
    FINAL_BATTLE_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
    ISSUE_WINDOW_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
  ].includes(value.version)
    ? value.regionEventStageIds
    : Object.fromEntries(
        SCRAP_CAMPAIGN_REGION_IDS.map((regionId) => [
          regionId,
          regionStates[regionId] === SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED
            ? (authored?.getRegion(regionId)?.eventStages.at(-1)?.id ?? null)
            : null,
        ]),
      );
  if (
    !regionEventStageIds ||
    typeof regionEventStageIds !== 'object' ||
    Array.isArray(regionEventStageIds)
  ) {
    throw new TypeError('campaign region event stage가 필요합니다.');
  }
  const regionStageEntries = Object.entries(regionEventStageIds);
  if (
    regionStageEntries.length !== SCRAP_CAMPAIGN_REGION_IDS.length ||
    regionStageEntries.some(([regionId, stageId]) => {
      if (!SCRAP_CAMPAIGN_REGION_IDS.includes(regionId)) return true;
      if (stageId === null) return false;
      const region = authored?.getRegion(regionId);
      return region
        ? !region.eventStages.some((stage) => stage.id === stageId)
        : typeof stageId !== 'string' || !stageId.startsWith(`${regionId}:`);
    })
  ) {
    throw new TypeError(
      'campaign region event stage가 authored stage contract와 일치하지 않습니다.',
    );
  }
  const activePrimaryIssueId = [
    SCRAP_CAMPAIGN_SCHEMA_VERSION,
    REGION_STATUS_MIGRATION_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
    FINAL_BATTLE_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
  ].includes(value.version)
    ? value.activePrimaryIssueId
    : null;
  if (
    activePrimaryIssueId !== null &&
    (typeof activePrimaryIssueId !== 'string' ||
      activePrimaryIssueId.trim().length === 0 ||
      (authored && !authored.getPrimaryIssue(activePrimaryIssueId)))
  ) {
    throw new TypeError(
      'active campaign primary issue가 authored issue contract와 일치하지 않습니다.',
    );
  }
  const completedIssueIds = [
    SCRAP_CAMPAIGN_SCHEMA_VERSION,
    REGION_STATUS_MIGRATION_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
    FINAL_BATTLE_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
  ].includes(value.version)
    ? value.completedIssueIds
    : [];
  if (!Array.isArray(completedIssueIds)) {
    throw new TypeError('완료 campaign issue ID 목록은 배열이어야 합니다.');
  }
  const completedIssueIdSet = new Set();
  for (const issueId of completedIssueIds) {
    assertId(issueId, '완료 campaign issue ID');
    if (completedIssueIdSet.has(issueId)) {
      throw new Error(`완료 campaign issue ID가 중복됩니다: ${issueId}`);
    }
    if (authored && !authored.getPrimaryIssue(issueId) && !authored.getLinkedIssue(issueId)) {
      throw new TypeError(`지원하지 않는 완료 campaign issue입니다: ${issueId}`);
    }
    completedIssueIdSet.add(issueId);
  }
  if (activePrimaryIssueId && completedIssueIdSet.has(activePrimaryIssueId)) {
    throw new TypeError('완료된 primary issue를 active 상태로 유지할 수 없습니다.');
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
  const awakeningStageId =
    value.version === LEGACY_SCRAP_CAMPAIGN_SCHEMA_VERSION
      ? SCRAP_AWAKENING_STAGE.COMMISSION
      : value.awakeningStageId;
  const garageRevealStageId = [
    SCRAP_CAMPAIGN_SCHEMA_VERSION,
    REGION_STATUS_MIGRATION_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
    FINAL_BATTLE_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
    ISSUE_WINDOW_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
    REGION_STAGE_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
  ].includes(value.version)
    ? assertScrapGarageRevealStageId(value.garageRevealStageId)
    : awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE
      ? SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY
      : SCRAP_GARAGE_REVEAL_STAGE.LOCKED;
  if (
    awakeningStageId !== SCRAP_AWAKENING_STAGE.COMPLETE &&
    garageRevealStageId !== SCRAP_GARAGE_REVEAL_STAGE.LOCKED
  ) {
    throw new TypeError('고물상 차고 reveal은 고대 병기 각성 완료 뒤에만 진행할 수 있습니다.');
  }
  if (
    awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE &&
    garageRevealStageId === SCRAP_GARAGE_REVEAL_STAGE.LOCKED
  ) {
    throw new TypeError(
      '각성 완료 snapshot에는 고물상 보고 가능한 차고 reveal stage가 필요합니다.',
    );
  }
  const finalBattleStageId = [
    SCRAP_CAMPAIGN_SCHEMA_VERSION,
    REGION_STATUS_MIGRATION_PREVIOUS_SCRAP_CAMPAIGN_SCHEMA_VERSION,
  ].includes(value.version)
    ? assertScrapFinalBattleStageId(value.finalBattleStageId)
    : SCRAP_FINAL_BATTLE_STAGE.INACTIVE;
  if (
    finalBattleStageId !== SCRAP_FINAL_BATTLE_STAGE.INACTIVE &&
    value.collectedPartIds.length !== knownPartIds.size
  ) {
    throw new TypeError('다섯 part를 모두 회수한 snapshot만 final battle을 시작할 수 있습니다.');
  }
  return freezeSnapshot({
    ...value,
    regionStates,
    regionEventStageIds,
    activePrimaryIssueId,
    completedIssueIds,
    awakeningStageId,
    garageRevealStageId,
    finalBattleStageId,
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
      garageRevealStageId:
        nextStageId === SCRAP_AWAKENING_STAGE.COMPLETE
          ? SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY
          : current.garageRevealStageId,
      lastChangeLabel: presentation.cue,
    }),
  });
}

export function startScrapAwakening(snapshot, profile) {
  const current = toScrapCampaignSnapshot(snapshot, profile);
  if (current.awakeningStageId !== SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED) {
    return Object.freeze({ changed: false, reason: 'device-not-investigated', snapshot: current });
  }
  return awakeningTransaction(current, SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
}

export function advanceScrapAwakening(snapshot, profile) {
  const current = toScrapCampaignSnapshot(snapshot, profile);
  if (current.awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE) {
    return Object.freeze({ changed: false, reason: 'not-advancing', snapshot: current });
  }
  return awakeningTransaction(current, nextScrapAwakeningStage(current.awakeningStageId));
}

function garageRevealTransaction(current, nextStageId) {
  if (current.garageRevealStageId === nextStageId) {
    return Object.freeze({ changed: false, reason: 'already-at-stage', snapshot: current });
  }
  const presentation = getScrapGarageRevealPresentation(nextStageId);
  return Object.freeze({
    changed: true,
    reason: 'garage-reveal-stage-advanced',
    snapshot: freezeSnapshot({
      ...current,
      garageRevealStageId: nextStageId,
      lastChangeLabel: presentation.cue,
    }),
  });
}

export function startScrapGarageReveal(snapshot, profile) {
  const current = toScrapCampaignSnapshot(snapshot, profile);
  if (
    current.awakeningStageId !== SCRAP_AWAKENING_STAGE.COMPLETE ||
    current.garageRevealStageId !== SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY
  ) {
    return Object.freeze({ changed: false, reason: 'not-ready', snapshot: current });
  }
  return garageRevealTransaction(current, SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS);
}

export function advanceScrapGarageReveal(snapshot, profile) {
  const current = toScrapCampaignSnapshot(snapshot, profile);
  if (!isScrapGarageRevealActive(current.garageRevealStageId)) {
    return Object.freeze({ changed: false, reason: 'not-advancing', snapshot: current });
  }
  return garageRevealTransaction(current, nextScrapGarageRevealStage(current.garageRevealStageId));
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
  if (
    action.kind === SCRAP_CAMPAIGN_ACTION_KIND.ISSUE_FOCUS &&
    (action.costSegments !== 0 || extensionSegments !== 0 || !action.targetRegionId)
  ) {
    throw new Error('주목표 고정 action은 target region과 0구간 비용을 사용해야 합니다.');
  }
  if (action.targetRegionId !== undefined && !profile.getRegion(action.targetRegionId)) {
    throw new Error(`지원하지 않는 target region입니다: ${action.targetRegionId}`);
  }
  const targetLocationId = action.targetLocationId ?? action.targetRegionId;
  if (
    action.targetLocationId !== undefined &&
    action.targetRegionId !== undefined &&
    action.targetLocationId !== action.targetRegionId
  ) {
    throw new Error('campaign action의 target location과 region이 서로 다릅니다.');
  }
  if (
    targetLocationId !== undefined &&
    targetLocationId !== profile.startLocation.id &&
    targetLocationId !== profile.capital.id &&
    !profile.getRegion(targetLocationId)
  ) {
    throw new Error(`지원하지 않는 target location입니다: ${targetLocationId}`);
  }
  if (action.kind === SCRAP_CAMPAIGN_ACTION_KIND.TRAVEL && targetLocationId === undefined) {
    throw new Error('장거리 이동에는 target location이 필요합니다.');
  }
  if (action.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_STAGE) {
    const region = profile.getRegion(action.targetRegionId);
    if (
      !region ||
      action.costSegments !== 0 ||
      extensionSegments !== 0 ||
      !region.eventStages.some((stage) => stage.id === action.targetStageId)
    ) {
      throw new Error('지역 stage action은 authored stage와 0구간 비용을 사용해야 합니다.');
    }
  }
  if (action.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_EVENT_START) {
    const region = profile.getRegion(action.targetRegionId);
    if (!region || action.costSegments !== region.event.costSegments || extensionSegments !== 0) {
      throw new Error('지역 사건 시작 action은 authored 사건 비용과 0 연장을 사용해야 합니다.');
    }
  }
  if (action.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_SUCCESS) {
    const region = profile.getRegion(action.targetRegionId);
    if (
      !region ||
      action.costSegments !== 0 ||
      extensionSegments !== region.event.extensionSegments ||
      extensionSegments < CAMPAIGN_SEGMENTS_PER_DAY * 2 ||
      extensionSegments > CAMPAIGN_SEGMENTS_PER_DAY * 5
    ) {
      throw new Error('지역 성공 action은 0구간 비용·authored 2~5일 연장과 일치해야 합니다.');
    }
  }
  if (action.kind === SCRAP_CAMPAIGN_ACTION_KIND.FINAL_BATTLE_STAGE) {
    if (
      action.costSegments !== 0 ||
      extensionSegments !== 0 ||
      action.targetRegionId !== undefined ||
      action.targetLocationId !== undefined
    ) {
      throw new Error('final battle stage action은 위치 없이 0구간 비용을 사용해야 합니다.');
    }
    assertScrapFinalBattleStageId(action.finalBattleStageId);
    if (action.finalBattleStageId === SCRAP_FINAL_BATTLE_STAGE.INACTIVE) {
      throw new Error('final battle은 inactive stage로 되돌릴 수 없습니다.');
    }
  }
  return Object.freeze({ ...action, targetLocationId, extensionSegments });
}

function resolveTravelRoute(currentLocationId, targetLocationId, profile) {
  const route = profile.routes.find(
    (candidate) =>
      (candidate.fromId === currentLocationId && candidate.toId === targetLocationId) ||
      (candidate.toId === currentLocationId && candidate.fromId === targetLocationId),
  );
  if (!route) {
    throw new Error(
      `현재 위치에서 이어지는 장거리 연결로가 없습니다: ${currentLocationId} → ${targetLocationId}`,
    );
  }
  return route;
}

function locationLabel(locationId, profile) {
  if (locationId === profile.startLocation.id) return profile.startLocation.label;
  if (locationId === profile.capital.id) return profile.capital.label;
  return profile.getRegion(locationId)?.label ?? locationId;
}

function rivalRouteReadModel(progressSegments, profile) {
  const reachedRegions = profile.regions.filter(
    (region) => progressSegments >= region.route.rivalArrivalSegment,
  );
  const rivalRegion = reachedRegions.at(-1) ?? null;
  const nextRivalRegion = profile.regions.find(
    (region) => progressSegments < region.route.rivalArrivalSegment,
  );
  return Object.freeze({
    progressSegments,
    locationLabel: rivalRegion?.label ?? '각성지',
    directionLabel: nextRivalRegion?.label ?? profile.capital.label,
  });
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
  const targetRegion = authoredAction.targetRegionId
    ? profile.getRegion(authoredAction.targetRegionId)
    : null;
  const alreadyCommitted = current.committedActionIds.includes(authoredAction.actionId);
  const activePrimaryIssue = current.activePrimaryIssueId
    ? profile.getPrimaryIssue(current.activePrimaryIssueId)
    : null;
  const regionEventStart = authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_EVENT_START;
  const fullRest = authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.REST;
  const finalBattleStage = authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.FINAL_BATTLE_STAGE;
  const hasEveryPart = current.collectedPartIds.length === profile.regions.length;
  const expectedFinalBattleStage = nextScrapFinalBattleStage(current.finalBattleStageId);
  const finalBattleStageInOrder =
    !finalBattleStage || authoredAction.finalBattleStageId === expectedFinalBattleStage;
  const differentPrimaryActive =
    regionEventStart &&
    activePrimaryIssue !== null &&
    activePrimaryIssue.regionId !== authoredAction.targetRegionId;
  const primaryFocusMissing = regionEventStart && activePrimaryIssue === null;
  const blockingLinkedIssues =
    regionEventStart && activePrimaryIssue?.regionId === authoredAction.targetRegionId
      ? activePrimaryIssue.linkedIssues.filter(
          (linkedIssue) => !current.completedIssueIds.includes(linkedIssue.id),
        )
      : [];
  const travelRoute =
    authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.TRAVEL
      ? alreadyCommitted
        ? (profile.routes.find((candidate) => candidate.id === authoredAction.routeId) ?? null)
        : resolveTravelRoute(current.currentLocationId, authoredAction.targetLocationId, profile)
      : null;
  if (travelRoute && travelRoute.travelSegments !== authoredAction.costSegments) {
    throw new Error('장거리 이동 비용은 authored 연결로 구간과 일치해야 합니다.');
  }
  if (travelRoute && authoredAction.routeId && authoredAction.routeId !== travelRoute.id) {
    throw new Error('장거리 이동 action의 route ID가 현재 연결로와 일치하지 않습니다.');
  }
  const willGameOver = !alreadyCommitted && authoredAction.costSegments >= current.deadlineSegments;
  const appliedCostSegments = alreadyCommitted ? 0 : authoredAction.costSegments;
  const rivalDelayConsumedSegments = Math.min(current.rivalDelaySegments, appliedCostSegments);
  const rivalMovementSegments = appliedCostSegments - rivalDelayConsumedSegments;
  const rivalBefore = rivalRouteReadModel(current.rivalProgressSegments, profile);
  const rivalAfter = rivalRouteReadModel(
    current.rivalProgressSegments + rivalMovementSegments,
    profile,
  );
  const nextDeadlineSegments = alreadyCommitted
    ? current.deadlineSegments
    : willGameOver
      ? 0
      : current.deadlineSegments - authoredAction.costSegments + authoredAction.extensionSegments;
  return Object.freeze({
    actionId: authoredAction.actionId,
    label: authoredAction.label,
    kind: authoredAction.kind,
    title: finalBattleStage
      ? getScrapFinalBattlePresentation(authoredAction.finalBattleStageId).title
      : regionEventStart
        ? '지역 핵심 사건을 시작할까요?'
        : fullRest
          ? '완전히 회복하고 다음 시간대로 갈까요?'
          : '장거리 이동을 확정할까요?',
    detailLabel: finalBattleStage
      ? getScrapFinalBattlePresentation(authoredAction.finalBattleStageId).cue
      : regionEventStart
        ? (targetRegion?.event.label ?? authoredAction.label)
        : fullRest
          ? '고물상 작업장 · 체력 전부 회복'
          : locationLabel(authoredAction.targetLocationId, profile),
    costSegments: authoredAction.costSegments,
    extensionSegments: authoredAction.extensionSegments,
    successExtensionSegments:
      authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_EVENT_START
        ? targetRegion.event.extensionSegments
        : authoredAction.extensionSegments,
    successExtensionDays:
      authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_EVENT_START
        ? targetRegion.event.extensionSegments / CAMPAIGN_SEGMENTS_PER_DAY
        : authoredAction.extensionSegments / CAMPAIGN_SEGMENTS_PER_DAY,
    routeId: travelRoute?.id ?? null,
    targetLocationId: authoredAction.targetLocationId ?? null,
    targetLocationLabel:
      authoredAction.targetLocationId === undefined
        ? null
        : locationLabel(authoredAction.targetLocationId, profile),
    allowed:
      !differentPrimaryActive &&
      !primaryFocusMissing &&
      blockingLinkedIssues.length === 0 &&
      (!finalBattleStage || (hasEveryPart && finalBattleStageInOrder)),
    blockedReason:
      finalBattleStage && !hasEveryPart
        ? '다섯 산업기계 part를 모두 회수해야 대항 병기를 출격할 수 있습니다.'
        : finalBattleStage && !finalBattleStageInOrder
          ? `final battle은 ${expectedFinalBattleStage} stage부터 순서대로 진행해야 합니다.`
          : differentPrimaryActive
            ? `현재 주목표 “${activePrimaryIssue.label}”를 먼저 마쳐야 합니다.`
            : primaryFocusMissing
              ? '이 지역을 주목표로 먼저 고정해야 합니다.'
              : blockingLinkedIssues.length > 0
                ? `연결 이슈 ${blockingLinkedIssues.length}개를 현장에서 먼저 해결해야 합니다.`
                : null,
    blockingIssueIds: Object.freeze(blockingLinkedIssues.map((issue) => issue.id)),
    blockingIssueLabels: Object.freeze(blockingLinkedIssues.map((issue) => issue.label)),
    alreadyCommitted,
    requiresDeadlineWarning: willGameOver,
    willGameOver,
    before: timeReadModel(current.elapsedSegments, current.deadlineSegments),
    after: timeReadModel(
      current.elapsedSegments + (alreadyCommitted ? 0 : authoredAction.costSegments),
      nextDeadlineSegments,
    ),
    rival: Object.freeze({
      before: rivalBefore,
      after: rivalAfter,
      movementSegments: rivalMovementSegments,
      delayConsumedSegments: rivalDelayConsumedSegments,
    }),
  });
}

function assertNextRegionStage(currentStageId, targetStageId, region) {
  const currentIndex = currentStageId
    ? region.eventStages.findIndex((stage) => stage.id === currentStageId)
    : -1;
  const targetIndex = region.eventStages.findIndex((stage) => stage.id === targetStageId);
  if (targetIndex !== currentIndex + 1) {
    throw new Error(
      `지역 사건 stage는 authored 순서로만 진행할 수 있습니다: ${currentStageId ?? 'start'} → ${targetStageId}`,
    );
  }
  return region.eventStages[targetIndex];
}

function completeLinkedIssuesForStage(
  completedIssueIds,
  activePrimaryIssueId,
  region,
  targetStage,
  profile,
) {
  const primaryIssue = activePrimaryIssueId ? profile.getPrimaryIssue(activePrimaryIssueId) : null;
  if (!primaryIssue) return completedIssueIds;
  const targetStageIndex = region.eventStages.findIndex((stage) => stage.id === targetStage.id);
  const nextCompleted = [...completedIssueIds];
  for (const linkedIssue of primaryIssue.linkedIssues) {
    if (linkedIssue.targetRegionId !== region.id || nextCompleted.includes(linkedIssue.id))
      continue;
    const completionStageIndex = region.eventStages.findIndex(
      (stage) => stage.kind === linkedIssue.completionStageKind,
    );
    if (completionStageIndex >= 0 && targetStageIndex >= completionStageIndex) {
      nextCompleted.push(linkedIssue.id);
    }
  }
  return nextCompleted;
}

function reconcileLinkedIssuesForPrimary(
  completedIssueIds,
  activePrimaryIssueId,
  regionEventStageIds,
  profile,
) {
  const primaryIssue = activePrimaryIssueId ? profile.getPrimaryIssue(activePrimaryIssueId) : null;
  if (!primaryIssue) return completedIssueIds;
  let nextCompleted = [...completedIssueIds];
  for (const linkedIssue of primaryIssue.linkedIssues) {
    const targetRegion = profile.getRegion(linkedIssue.targetRegionId);
    const currentStage = targetRegion.eventStages.find(
      (stage) => stage.id === regionEventStageIds[targetRegion.id],
    );
    if (!currentStage) continue;
    nextCompleted = completeLinkedIssuesForStage(
      nextCompleted,
      activePrimaryIssueId,
      targetRegion,
      currentStage,
      profile,
    );
  }
  return nextCompleted;
}

function finishActivePrimaryIssue(
  completedIssueIds,
  activePrimaryIssueId,
  completedRegionId,
  profile,
) {
  const primaryIssue = activePrimaryIssueId ? profile.getPrimaryIssue(activePrimaryIssueId) : null;
  if (!primaryIssue || primaryIssue.regionId !== completedRegionId) {
    return Object.freeze({ activePrimaryIssueId, completedIssueIds });
  }
  const nextCompletedIssueIds = completedIssueIds.includes(primaryIssue.id)
    ? completedIssueIds
    : [...completedIssueIds, primaryIssue.id];
  return Object.freeze({
    activePrimaryIssueId: null,
    completedIssueIds: nextCompletedIssueIds,
  });
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
  if (!preview.allowed) {
    throw new Error(preview.blockedReason);
  }
  const elapsedSegments = current.elapsedSegments + authoredAction.costSegments;
  const existingDelayUsed = Math.min(current.rivalDelaySegments, authoredAction.costSegments);
  const rivalProgressSegments =
    current.rivalProgressSegments + authoredAction.costSegments - existingDelayUsed;
  let rivalDelaySegments = current.rivalDelaySegments - existingDelayUsed;
  let regionStates = { ...current.regionStates };
  let regionEventStageIds = { ...current.regionEventStageIds };
  let activePrimaryIssueId = current.activePrimaryIssueId;
  let completedIssueIds = [...current.completedIssueIds];
  let collectedPartIds = [...current.collectedPartIds];
  let currentLocationId = current.currentLocationId;
  let finalBattleStageId = current.finalBattleStageId;

  if (!preview.willGameOver) {
    const region = authoredAction.targetRegionId
      ? profile.getRegion(authoredAction.targetRegionId)
      : null;
    if (authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.ISSUE_FOCUS) {
      const primaryIssue = profile.getPrimaryIssueForRegion(region.id);
      if (
        activePrimaryIssueId ||
        !regionEventStageIds[region.id] ||
        [SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED].includes(regionStates[region.id]) ||
        completedIssueIds.includes(primaryIssue.id)
      ) {
        throw new Error('현장 확인을 마친 미해결 region만 새 주목표로 고정할 수 있습니다.');
      }
      activePrimaryIssueId = primaryIssue.id;
      completedIssueIds = reconcileLinkedIssuesForPrimary(
        completedIssueIds,
        activePrimaryIssueId,
        regionEventStageIds,
        profile,
      );
    }
    if (authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.TRAVEL) {
      currentLocationId = authoredAction.targetLocationId;
    }
    if (authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_STAGE) {
      if (current.currentLocationId !== region.id) {
        throw new Error('현재 위치의 region stage만 진행할 수 있습니다.');
      }
      const targetStage = assertNextRegionStage(
        regionEventStageIds[region.id],
        authoredAction.targetStageId,
        region,
      );
      if (['part-claimed', 'campaign-updated'].includes(targetStage.kind)) {
        throw new Error('부품 회수와 campaign 갱신 stage는 지역 성공 transaction이 소유합니다.');
      }
      const earlyStage = ['npc-briefing', 'facility-observed'].includes(targetStage.kind);
      const expectedStatus = earlyStage
        ? SCRAP_CAMPAIGN_REGION_STATUS.AVAILABLE
        : SCRAP_CAMPAIGN_REGION_STATUS.IN_PROGRESS;
      if (regionStates[region.id] !== expectedStatus) {
        throw new Error(`${targetStage.label} stage와 지역 사건 상태가 일치하지 않습니다.`);
      }
      regionEventStageIds[region.id] = targetStage.id;
      completedIssueIds = completeLinkedIssuesForStage(
        completedIssueIds,
        activePrimaryIssueId,
        region,
        targetStage,
        profile,
      );
    }
    if (authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_EVENT_START) {
      const facilityStage = region.eventStages.find((stage) => stage.kind === 'facility-observed');
      if (
        current.currentLocationId !== region.id ||
        regionStates[region.id] !== SCRAP_CAMPAIGN_REGION_STATUS.AVAILABLE ||
        regionEventStageIds[region.id] !== facilityStage.id
      ) {
        throw new Error('현장에서 시설 상태를 확인한 available region 사건만 시작할 수 있습니다.');
      }
      regionStates[region.id] = SCRAP_CAMPAIGN_REGION_STATUS.IN_PROGRESS;
    }
    if (authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.REGION_SUCCESS) {
      const machineSeparatedStage = region.eventStages.find(
        (stage) => stage.kind === 'machine-separated',
      );
      if (
        current.currentLocationId !== region.id ||
        regionStates[region.id] !== SCRAP_CAMPAIGN_REGION_STATUS.IN_PROGRESS ||
        regionEventStageIds[region.id] !== machineSeparatedStage.id
      ) {
        throw new Error('기계를 분리한 진행 중 region만 성공 처리할 수 있습니다.');
      }
      regionStates[region.id] = SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED;
      if (!collectedPartIds.includes(region.part.id)) collectedPartIds.push(region.part.id);
      rivalDelaySegments += authoredAction.extensionSegments;
      regionEventStageIds[region.id] = region.eventStages.at(-1).id;
      ({ activePrimaryIssueId, completedIssueIds } = finishActivePrimaryIssue(
        completedIssueIds,
        activePrimaryIssueId,
        region.id,
        profile,
      ));
    }
    if (authoredAction.kind === SCRAP_CAMPAIGN_ACTION_KIND.FINAL_BATTLE_STAGE) {
      finalBattleStageId = authoredAction.finalBattleStageId;
    }
  }

  const next = freezeSnapshot({
    elapsedSegments,
    deadlineSegments: preview.after.deadlineSegments,
    rivalProgressSegments,
    rivalDelaySegments,
    currentLocationId,
    regionStates,
    regionEventStageIds,
    activePrimaryIssueId,
    completedIssueIds,
    collectedPartIds,
    committedActionIds: [...current.committedActionIds, authoredAction.actionId],
    awakeningStageId: current.awakeningStageId,
    garageRevealStageId: current.garageRevealStageId,
    finalBattleStageId,
    gameOver: preview.willGameOver,
    lastChangeLabel: preview.willGameOver
      ? `${authoredAction.label} · 고대 병기 왕도 도착`
      : finalBattleStageId !== current.finalBattleStageId
        ? getScrapFinalBattlePresentation(finalBattleStageId).cue
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
    const eventStageId = current.regionEventStageIds[region.id];
    const eventStage = region.eventStages.find((stage) => stage.id === eventStageId) ?? null;
    return Object.freeze({
      id: region.id,
      label: region.label,
      status,
      statusLabel:
        status === SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED
          ? '지역 해결 · 부품 회수'
          : status === SCRAP_CAMPAIGN_REGION_STATUS.IN_PROGRESS
            ? `현장 작업 진행 · ${eventStage?.label ?? '핵심 사건'}`
            : eventStage
              ? `현장 확인 · ${eventStage.label}`
              : '사건 대기',
      travelSegments: region.route.travelSegments,
      eventSegments: region.event.costSegments,
      extensionDays: region.event.extensionSegments / CAMPAIGN_SEGMENTS_PER_DAY,
      routeDetourDays: region.routeDetour.segments / CAMPAIGN_SEGMENTS_PER_DAY,
      routeClosureLabel: region.routeDetour.closureLabel,
      routeDetourLabel: region.routeDetour.detourLabel,
      machineLabel: region.machineLabel,
      partId: region.part.id,
      partLabel: region.part.label,
      robotModule: region.part.robotModule,
      collected: current.collectedPartIds.includes(region.part.id),
      color: region.visual.color,
      material: region.visual.material,
      eventStageIds: Object.freeze(region.eventStages.map((stage) => stage.id)),
      eventStageId,
      eventStageKind: eventStage?.kind ?? null,
      eventStageLabel: eventStage?.label ?? '현장 도착 전',
      mapPatchId:
        status === SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED
          ? region.mapPatches.resolved
          : eventStage?.kind === 'machine-separated'
            ? region.mapPatches.partReady
            : region.mapPatches.before,
    });
  });
  const activePrimaryIssue = current.activePrimaryIssueId
    ? profile.getPrimaryIssue(current.activePrimaryIssueId)
    : null;
  const primaryIssueReadModel = activePrimaryIssue
    ? Object.freeze({
        id: activePrimaryIssue.id,
        label: activePrimaryIssue.label,
        objective: activePrimaryIssue.objective,
        regionId: activePrimaryIssue.regionId,
        regionLabel: profile.getRegion(activePrimaryIssue.regionId).label,
      })
    : null;
  const linkedIssueReadModels = activePrimaryIssue
    ? activePrimaryIssue.linkedIssues.map((linkedIssue) => {
        const targetRegion = profile.getRegion(linkedIssue.targetRegionId);
        const completionStage = targetRegion.eventStages.find(
          (stage) => stage.kind === linkedIssue.completionStageKind,
        );
        const completed = current.completedIssueIds.includes(linkedIssue.id);
        return Object.freeze({
          id: linkedIssue.id,
          label: linkedIssue.label,
          objective: linkedIssue.objective,
          targetRegionId: targetRegion.id,
          targetRegionLabel: targetRegion.label,
          completionStageKind: linkedIssue.completionStageKind,
          completionStageLabel: completionStage.label,
          completionEvidence: linkedIssue.completionEvidence,
          completed,
          statusLabel: completed ? '현장 해결' : '연결 이슈',
        });
      })
    : [];
  const completedLinkedIssueCount = linkedIssueReadModels.filter((issue) => issue.completed).length;
  const rivalRoute = rivalRouteReadModel(current.rivalProgressSegments, profile);
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
  const activeRouteDetours = regions
    .filter((region) => region.status === SCRAP_CAMPAIGN_REGION_STATUS.RESOLVED)
    .map((region) =>
      Object.freeze({
        regionId: region.id,
        regionLabel: region.label,
        closureLabel: region.routeClosureLabel,
        detourLabel: region.routeDetourLabel,
        segments: profile.getRegion(region.id).routeDetour.segments,
      }),
    );
  const rivalArrival = timeReadModel(current.elapsedSegments + current.deadlineSegments, 0);
  const finalBattle = getScrapFinalBattlePresentation(current.finalBattleStageId);
  return Object.freeze({
    ...time,
    hudLabel: isScrapAwakeningDeadlineRevealed(current.awakeningStageId)
      ? `Day ${time.day} · ${time.phaseLabel} · ${time.deadlineLabel}`
      : '첫 수거 의뢰 · 고대 병기 각성 전',
    awakeningStageId: current.awakeningStageId,
    awakeningActive: isScrapAwakeningActive(current.awakeningStageId),
    deadlineRevealed: isScrapAwakeningDeadlineRevealed(current.awakeningStageId),
    awakening: getScrapAwakeningPresentation(current.awakeningStageId),
    garageRevealStageId: current.garageRevealStageId,
    garageRevealActive: isScrapGarageRevealActive(current.garageRevealStageId),
    garageRevealComplete: current.garageRevealStageId === SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    garageReveal: getScrapGarageRevealPresentation(current.garageRevealStageId),
    currentLocationId: current.currentLocationId,
    currentLocationLabel: currentLocation.label,
    rivalLocationLabel: rivalRoute.locationLabel,
    rivalDirectionLabel: current.gameOver ? profile.capital.label : rivalRoute.directionLabel,
    rivalArrivalLabel: `Day ${rivalArrival.day} · ${rivalArrival.phaseLabel}`,
    rivalDelaySegments: current.rivalDelaySegments,
    activeRouteDetours: Object.freeze(activeRouteDetours),
    lastChangeLabel: current.lastChangeLabel,
    collectedPartCount: current.collectedPartIds.length,
    totalPartCount: profile.regions.length,
    completionPercent,
    finalBattleAvailable:
      current.collectedPartIds.length === profile.regions.length &&
      current.finalBattleStageId === SCRAP_FINAL_BATTLE_STAGE.INACTIVE,
    finalBattle: Object.freeze({
      stageId: current.finalBattleStageId,
      active: isScrapFinalBattleActive(current.finalBattleStageId),
      complete: current.finalBattleStageId === SCRAP_FINAL_BATTLE_STAGE.EPILOGUE,
      ...finalBattle,
    }),
    gameOver: current.gameOver,
    issueWindow: Object.freeze({
      primary: primaryIssueReadModel,
      linked: Object.freeze(linkedIssueReadModels),
      linkedCount: linkedIssueReadModels.length,
      completedLinkedCount: completedLinkedIssueCount,
      maximumLinkedCount: 2,
      summaryLabel: primaryIssueReadModel
        ? `주목표 1 · 연결 ${completedLinkedIssueCount}/${linkedIssueReadModels.length}`
        : '현장에서 주목표를 선택하세요',
    }),
    routeEdges: Object.freeze(routeEdges),
    regions: Object.freeze(regions),
  });
}
