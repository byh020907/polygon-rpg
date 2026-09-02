import {
  CAMPAIGN_SEGMENTS_PER_DAY,
  CAMPAIGN_TIME_PHASES,
} from '../campaign/ScrapCampaignContract.js';
import {
  getScrapCampaignReadModel,
  toScrapCampaignSnapshot,
} from '../campaign/ScrapCampaignState.js';

export const RECOVERY_SLOT_ID = Object.freeze({
  PRE_ACTION: 'pre-action',
  LATEST_MORNING: 'latest-morning',
  LATEST_CORE_EVENT: 'latest-core-event',
});

export const RECOVERY_SLOT_IDS = Object.freeze(Object.values(RECOVERY_SLOT_ID));

const SLOT_TITLE = Object.freeze({
  [RECOVERY_SLOT_ID.PRE_ACTION]: '행동 확정 직전',
  [RECOVERY_SLOT_ID.LATEST_MORNING]: '최근 날짜의 아침',
  [RECOVERY_SLOT_ID.LATEST_CORE_EVENT]: '이전 핵심 사건 완료',
});

function assertProgressionSnapshot(value) {
  if (!value?.scrapCampaign) throw new TypeError('복구 지점에는 campaign 진행이 필요합니다.');
  return value;
}

function createMetadata(slotId, progressionSnapshot, scrapCampaignProfile, detailLabel) {
  if (!RECOVERY_SLOT_IDS.includes(slotId)) {
    throw new Error(`지원하지 않는 recovery slot입니다: ${slotId}`);
  }
  const campaign = getScrapCampaignReadModel(
    assertProgressionSnapshot(progressionSnapshot).scrapCampaign,
    scrapCampaignProfile,
  );
  return Object.freeze({
    slotId,
    title: SLOT_TITLE[slotId],
    detailLabel,
    elapsedSegments: progressionSnapshot.scrapCampaign.elapsedSegments,
    day: campaign.day,
    phaseLabel: campaign.phaseLabel,
    deadlineLabel: campaign.deadlineLabel,
    collectedPartCount: campaign.collectedPartCount,
    totalPartCount: campaign.totalPartCount,
    completionPercent: campaign.completionPercent,
  });
}

export function createInitialMorningRecoveryRequest(progressionSnapshot, scrapCampaignProfile) {
  const campaign = toScrapCampaignSnapshot(
    assertProgressionSnapshot(progressionSnapshot).scrapCampaign,
    scrapCampaignProfile,
  );
  if (campaign.elapsedSegments % CAMPAIGN_SEGMENTS_PER_DAY !== 0 || campaign.gameOver) return null;
  return Object.freeze({
    slotId: RECOVERY_SLOT_ID.LATEST_MORNING,
    snapshot: progressionSnapshot,
    metadata: createMetadata(
      RECOVERY_SLOT_ID.LATEST_MORNING,
      progressionSnapshot,
      scrapCampaignProfile,
      '하루를 시작한 시점의 안전한 작전 기록',
    ),
  });
}

export function createPreActionRecoveryRequest(
  progressionSnapshot,
  actionPreview,
  scrapCampaignProfile,
) {
  if (!actionPreview || !Number.isSafeInteger(actionPreview.costSegments)) {
    throw new TypeError('행동 직전 복구에는 campaign action preview가 필요합니다.');
  }
  return Object.freeze({
    slotId: RECOVERY_SLOT_ID.PRE_ACTION,
    snapshot: assertProgressionSnapshot(progressionSnapshot),
    metadata: createMetadata(
      RECOVERY_SLOT_ID.PRE_ACTION,
      progressionSnapshot,
      scrapCampaignProfile,
      `${actionPreview.label} · ${actionPreview.costSegments}구간 소비 전`,
    ),
  });
}

export function createPostProgressionRecoveryRequests(
  previousProgressionSnapshot,
  nextProgressionSnapshot,
  scrapCampaignProfile,
) {
  const previousCampaign = toScrapCampaignSnapshot(
    assertProgressionSnapshot(previousProgressionSnapshot).scrapCampaign,
    scrapCampaignProfile,
  );
  const nextCampaign = toScrapCampaignSnapshot(
    assertProgressionSnapshot(nextProgressionSnapshot).scrapCampaign,
    scrapCampaignProfile,
  );
  const requests = [];

  if (
    nextCampaign.elapsedSegments > previousCampaign.elapsedSegments &&
    nextCampaign.elapsedSegments % CAMPAIGN_SEGMENTS_PER_DAY === 0 &&
    !nextCampaign.gameOver
  ) {
    requests.push(
      Object.freeze({
        slotId: RECOVERY_SLOT_ID.LATEST_MORNING,
        snapshot: nextProgressionSnapshot,
        metadata: createMetadata(
          RECOVERY_SLOT_ID.LATEST_MORNING,
          nextProgressionSnapshot,
          scrapCampaignProfile,
          `${CAMPAIGN_TIME_PHASES[0].label}에 자동 확보한 작전 기록`,
        ),
      }),
    );
  }

  const previousPartIds = new Set(previousCampaign.collectedPartIds);
  const newPartIds = nextCampaign.collectedPartIds.filter((partId) => !previousPartIds.has(partId));
  if (newPartIds.length > 0 && !nextCampaign.gameOver) {
    const partLabels = newPartIds.map((partId) => {
      const region = scrapCampaignProfile.regions.find((candidate) => candidate.part.id === partId);
      return region?.part.label ?? partId;
    });
    requests.push(
      Object.freeze({
        slotId: RECOVERY_SLOT_ID.LATEST_CORE_EVENT,
        snapshot: nextProgressionSnapshot,
        metadata: createMetadata(
          RECOVERY_SLOT_ID.LATEST_CORE_EVENT,
          nextProgressionSnapshot,
          scrapCampaignProfile,
          `${partLabels.join(' · ')} 회수 직후`,
        ),
      }),
    );
  }

  return Object.freeze(requests);
}

export function createRecoverySlotReadModel(record) {
  if (!record || !RECOVERY_SLOT_IDS.includes(record.slotId) || !record.metadata) {
    throw new TypeError('올바른 recovery slot record가 필요합니다.');
  }
  const metadata = record.metadata;
  return Object.freeze({
    id: record.slotId,
    title: metadata.title,
    detailLabel: metadata.detailLabel,
    timeLabel: `Day ${metadata.day} · ${metadata.phaseLabel} · ${metadata.deadlineLabel}`,
    assemblyLabel: `${metadata.collectedPartCount}/${metadata.totalPartCount} 부품 · 로봇 ${metadata.completionPercent}%`,
    elapsedSegments: metadata.elapsedSegments,
  });
}
