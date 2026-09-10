import { SceneAssetRegistry } from './scene/SceneAssetRegistry.js';
import { SceneCompositionRuntime } from './scene/SceneComposition.js';
import { createGameScene } from '../app/createGameScene.js';
import { SCRAP_GARAGE_REVEAL_STAGE } from '../game/campaign/ScrapGarageRevealState.js';
import { mergeProgressionSnapshot } from '../game/progression/ProgressionState.js';
import {
  createQuestState,
  reconcileQuests,
  acceptQuest,
  applyQuestEvent,
} from '../game/quests/QuestState.js';
import {
  QUEST_CATALOG,
  getQuestOccurrenceId,
  freezeQuestData,
} from '../game/quests/QuestProfiles.js';
import { QUEST_WORLD_PROFILES } from '../game/quests/QuestWorldProfiles.js';
const action = (id, label, extra = {}) => ({ id, label, frameCount: 1, ...extra });
export function createFieldQuestResources() {
  const shared = {
    producer: 'field-quest',
    kind: 'static',
    source: 'src/game/quests/FieldQuestRuntime.js',
    notes:
      '실제 현장 runtime의 저장과 분리된 상태 표본입니다. 최종 공급 아트 승인이 아니며 일반 테스트 플레이 시작 상태와 구분합니다.',
  };
  const [mine, harbor] = QUEST_WORLD_PROFILES.boards;
  return freezeQuestData([
    {
      ...shared,
      id: 'field:mine-board',
      label: '폐광 의뢰 게시판',
      category: 'prop',
      regionId: mine.regionId,
      roomId: mine.roomId,
      fieldKind: 'board',
      sourceId: mine.id,
      actions: [action('day', '낮'), action('night', '밤', { night: true })],
    },
    {
      ...shared,
      id: 'field:harbor-board',
      label: '항구 의뢰 게시판',
      category: 'prop',
      regionId: harbor.regionId,
      roomId: harbor.roomId,
      fieldKind: 'board',
      sourceId: harbor.id,
      actions: [action('day', '낮'), action('night', '밤', { night: true })],
    },
    {
      ...shared,
      id: 'field:mine-cable-cache',
      label: '판금 틈의 회수 단서',
      category: 'prop',
      regionId: mine.regionId,
      roomId: mine.roomId,
      fieldKind: 'exploration',
      sourceId: 'mine-cable-cache',
      actions: [action('undiscovered', '발견 전 판금·케이블')],
    },
    {
      ...shared,
      id: 'field:harbor-lamp',
      label: '항구 정비·임시 작업등',
      category: 'facility',
      regionId: harbor.regionId,
      roomId: harbor.roomId,
      fieldKind: 'lamp',
      profileId: 'harbor-lamp-service',
      actions: [
        action('serviced', '정비 완료', { outcome: 'serviced' }),
        action('temporary', '방치 뒤 임시 조명', { outcome: 'temporary-lighting' }),
        action('serviced-night', '정비 작업등 · 밤', { outcome: 'serviced', night: true }),
        action('temporary-night', '임시 조명 · 밤', { outcome: 'temporary-lighting', night: true }),
      ],
    },
    {
      ...shared,
      id: 'field:mine-quest-marker',
      label: '수락한 폐광 현장 표시',
      category: 'effect',
      regionId: mine.regionId,
      roomId: mine.roomId,
      fieldKind: 'marker',
      profileId: 'mine-lamp-check',
      actions: [action('accepted', '작업등 점검 수락')],
    },
    {
      ...shared,
      id: 'field:mine-night-enemy',
      label: '수락 회차의 밤 작업선 수거 유닛',
      category: 'enemy',
      regionId: mine.regionId,
      roomId: mine.roomId,
      fieldKind: 'night-enemy',
      profileId: 'mine-night-workline',
      actions: [action('accepted-night', '밤 의뢰 수락 · 실제 조우', { night: true })],
    },
  ]);
}
function withTime(snapshot, elapsed) {
  const previous = snapshot.scrapCampaign.elapsedSegments;
  return mergeProgressionSnapshot(snapshot, {
    scrapCampaign: {
      ...snapshot.scrapCampaign,
      elapsedSegments: elapsed,
      deadlineSegments: snapshot.scrapCampaign.deadlineSegments - (elapsed - previous),
      rivalProgressSegments: snapshot.scrapCampaign.rivalProgressSegments + (elapsed - previous),
    },
  });
}
// Explicit state-preview authoring; no player storage or simulated UI success.
export function createFieldQuestReviewScene(resource, action, { facing = 1 } = {}) {
  const scene = createGameScene();
  const focusX = { board: 340, exploration: 280, lamp: 1080, marker: 1080, 'night-enemy': 850 }[
    resource.fieldKind
  ];
  try {
    scene.setVisualQaScrapGarageRevealStage(SCRAP_GARAGE_REVEAL_STAGE.COMPLETE);
    scene.setVisualQaLocation({ ...resource, x: focusX });
    let elapsed = resource.fieldKind === 'lamp' ? 0 : action.night ? 3 : 0;
    let snapshot = withTime(scene.getProgressionSnapshot(), elapsed);
    snapshot = mergeProgressionSnapshot(snapshot, { quests: createQuestState(elapsed) });
    const context = (at) => ({
      elapsedSegments: at,
      garageRevealed: true,
      accessibleRoomIds: [resource.roomId],
      fieldCapabilities: scene.fieldQuests.context(snapshot).fieldCapabilities,
    });
    if (resource.profileId) {
      let state = reconcileQuests(snapshot.quests, context(elapsed)).state;
      const offered = state.records.find(
        (r) => r.profileId === resource.profileId && r.status === 'offered',
      );
      if (!offered) throw new Error('Field review quest unavailable: ' + resource.profileId);
      state = acceptQuest(state, offered.instanceId, context(elapsed)).state;
      let result = null;
      if (resource.fieldKind === 'lamp') {
        const record = state.records.find((r) => r.instanceId === offered.instanceId);
        if (action.outcome === 'temporary-lighting') {
          elapsed = record.deadline;
          result = reconcileQuests(state, context(elapsed));
        } else {
          const profile = QUEST_CATALOG.getProfile(resource.profileId);
          elapsed = 1;
          result = applyQuestEvent(
            state,
            {
              type: 'field-action',
              instanceId: record.instanceId,
              occurrenceId: getQuestOccurrenceId(record),
              sourceId: profile.objective.sourceId,
              roomId: resource.roomId,
            },
            context(elapsed),
          );
        }
        snapshot = withTime(snapshot, elapsed);
        if (action.outcome === 'serviced')
          snapshot = mergeProgressionSnapshot(snapshot, {
            scrapCampaign: {
              ...snapshot.scrapCampaign,
              committedActionIds: [
                ...snapshot.scrapCampaign.committedActionIds,
                getQuestOccurrenceId(record) + ':work',
              ],
            },
          });
        snapshot = scene.fieldQuests.applyResult(snapshot, result).snapshot;
        state = snapshot.quests;
      }
      snapshot = mergeProgressionSnapshot(snapshot, { quests: state });
    }
    if (action.night && elapsed % 4 !== 3) {
      elapsed += 3 - (elapsed % 4);
      snapshot = withTime(snapshot, elapsed);
      snapshot = scene.fieldQuests.applyResult(
        snapshot,
        reconcileQuests(snapshot.quests, context(elapsed)),
      ).snapshot;
    }
    scene.restoreProgression(snapshot);
    scene.setVisualQaLocation({ ...resource, x: focusX });
    scene.syncFieldEncounter();
    scene.facing = facing;
    return scene;
  } catch (error) {
    scene.dispose();
    throw error;
  }
}
export function selectFieldQuestItems(frame, resource) {
  if (resource.fieldKind === 'night-enemy')
    return frame.items.filter((i) => i.id.startsWith('combat-enemy-'));
  if (resource.fieldKind === 'lamp')
    return frame.items.filter((i) => i.role === 'field-quest-lamp');
  if (resource.fieldKind === 'marker')
    return frame.items.filter(
      (i) =>
        i.role === 'field-quest-marker' && i.id.startsWith('quest:' + resource.profileId + ':'),
    );
  return frame.items.filter(
    (i) => i.id === resource.sourceId || i.id.startsWith(resource.sourceId + ':'),
  );
}
// Retain immutable source assets, not the disposable gameplay scene. The production
// runtime still performs per-view streaming/culling and the presenter chooses LOD.
export function detachFieldScenePresentation(runtime) {
  if (!runtime) return null;
  const source = runtime.assets;
  const assets = new SceneAssetRegistry({
    maxResident: source.maxResident,
    maxBytes: source.maxBytes,
    maxPending: source.maxPending,
  });
  for (const id of new Set(runtime.definition.objects.map((object) => object.assetId))) {
    void source.reconcile([id]);
    const asset = source.get(id);
    if (!asset)
      throw new Error('Field preview asset must be loaded before synchronous sampling: ' + id);
    assets.register(asset);
    // Keep source bytes while letting production residency budgets govern each view.
    void assets.reconcile([]);
  }
  const detached = new SceneCompositionRuntime(runtime.definition, assets);
  return (viewAt) => detached.snapshotProjected(viewAt);
}

export function sampleFieldQuestResource(resource, action, options = {}) {
  const scene = createFieldQuestReviewScene(resource, action, options);
  try {
    if (['day', 'night'].includes(options.lighting)) scene.setVisualQaTimePhase(options.lighting);
    const original = scene.createRenderFrame(1),
      selected = selectFieldQuestItems(original, resource);
    if (!selected.length)
      throw new Error(
        'Field review state produced no actual items: ' + resource.id + '/' + action.id,
      );
    const points = selected.flatMap((i) => i.points ?? []),
      minX = Math.min(...points.map((p) => p.x)),
      minY = Math.min(...points.map((p) => p.y)),
      maxX = Math.max(...points.map((p) => p.x)),
      maxY = Math.max(...points.map((p) => p.y));
    const view = options.view ?? 'isolated';
    const frame = {
      ...original,
      scenePresentationForView: detachFieldScenePresentation(scene.scenePresentation),
      items: view === 'scene' ? original.items : selected,
    };
    if (options.lighting === 'unlit') frame.artDirection = null;
    return freezeQuestData({
      frame,
      bounds:
        view === 'scene'
          ? { x: original.cameraOffset.x, y: original.cameraOffset.y, width: 960, height: 540 }
          : { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      frameId: resource.id + '/' + action.id + '/f0000',
      sourceFrameId: 'field-runtime:' + action.id,
      boneDiagnostics: [],
      notes: resource.notes,
      conditions: {
        actionId: action.id,
        frameIndex: 0,
        facing: options.facing ?? 1,
        lighting: options.lighting ?? 'scene',
        view,
      },
      fieldDiagnostics: {
        statePreview: true,
        roomId: resource.roomId,
        worldFacts: scene.getProgressionSnapshot().quests.worldFacts,
        selectedItemIds: selected.map((i) => i.id),
        encounterId: scene.roomSceneNode?.encounter?.enemy?.id ?? null,
      },
    });
  } finally {
    scene.dispose();
  }
}
