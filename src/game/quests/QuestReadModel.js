import {
  QUEST_CATALOG,
  QUEST_SLOT_LIMIT,
  freezeQuestData,
  getQuestOccurrenceId,
  normalizeQuestContext,
} from './QuestProfiles.js';
import { assertQuestState } from './QuestState.js';
import { createQuestEpilogueReadModel, QUEST_WORLD_PROFILES } from './QuestWorldProfiles.js';
export function createQuestReadModel(
  state,
  campaignReadModel = {},
  context = { elapsedSegments: state.lastElapsedSegments },
  catalog = QUEST_CATALOG,
) {
  assertQuestState(state, catalog);
  const time = normalizeQuestContext(context);
  const rows = state.records.map((record) => {
    const profile = catalog.getProfile(record.profileId),
      deadline = record.deadline ?? record.issuedDay * 4;
    return {
      ...record,
      type: 'general',
      title: profile.title,
      summary: profile.summary,
      regionId: profile.regionId,
      issuerId: profile.issuerId,
      objective: profile.objective,
      occurrenceId: getQuestOccurrenceId(record),
      rewards: profile.rewards,
      remainingSegments: Math.max(0, deadline - time.elapsedSegments),
      deadlineRisk:
        ['offered', 'accepted'].includes(record.status) && deadline - time.elapsedSegments <= 1,
      important: Boolean(profile.worldOutcome),
    };
  });
  const campaign = structuredClone(campaignReadModel);
  const main =
    campaign.issueWindow?.primary ??
    (!campaign.garageRevealComplete && campaign.awakening
      ? {
          id: 'campaign-awakening',
          type: 'main',
          title: campaign.awakening?.title,
          summary: campaign.awakening?.objective,
        }
      : campaign.garageRevealActive
        ? {
            id: 'campaign-garage',
            type: 'main',
            title: campaign.garageReveal?.title,
            summary: campaign.garageReveal?.objective,
          }
        : {
            id: 'campaign-regions',
            title: campaign.finalBattleAvailable ? '대항 병기 최종전' : '지역 주요 의뢰 확인',
            summary: campaign.finalBattleAvailable
              ? '다섯 부품을 갖춘 대항 병기로 출격한다.'
              : '작전 지도에서 현장을 고르고 주민의 핵심 의뢰를 확인한다.',
          });
  return freezeQuestData({
    day: time.day,
    phaseId: time.phaseId,
    main,
    linked: campaign.issueWindow?.linked ?? [],
    general: rows.filter((record) => ['offered', 'accepted'].includes(record.status)),
    history: rows
      .filter((record) => !['offered', 'accepted'].includes(record.status))
      .slice(-24)
      .reverse(),
    slotCount: state.slots.length,
    slotLimit: QUEST_SLOT_LIMIT,
    epilogue: createQuestEpilogueReadModel(state),
    explorations: state.explorationIds.map((id) => {
      const entry = QUEST_WORLD_PROFILES.explorations.find((candidate) => candidate.id === id);
      return { id, label: entry.label, regionId: entry.regionId, obtained: true };
    }),
  });
}
