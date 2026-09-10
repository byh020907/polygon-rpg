import { getScrapCampaignReadModel } from '../campaign/ScrapCampaignState.js';
import { resolveEquipmentLoadout } from '../equipment/EquipmentLoadout.js';
import { mergeProgressionSnapshot } from '../progression/ProgressionState.js';
import { applyRewardBundle } from '../progression/RewardTransactions.js';
import { PLAYER_CHARACTER_FOOT_OFFSET } from '../../combat/SharedCombatGeometry.js';
import {
  QUEST_CATALOG,
  freezeQuestData,
  getQuestOccurrenceId,
  normalizeQuestContext,
  resolveQuestFieldMethod,
} from './QuestProfiles.js';
import { acceptQuest, applyQuestEvent, reconcileQuests } from './QuestState.js';
import { QUEST_WORLD_PROFILES, getQuestWorldOutcomes } from './QuestWorldProfiles.js';
const FIELD_X = Object.freeze({
  'mine-lamp-check': 1230,
  'mine-rail-brace': 580,
  'harbor-lamp-service': 1230,
  'harbor-workline-clear': 810,
  'mine-night-workline': 1050,
  'harbor-night-inspection': 1100,
});
const COMBAT_KINDS = new Set(['combat-test-mob', 'combat-enemy']);
const box = (x, y, width, height) => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
];
const polygon = (id, points, fill, extra = {}) => ({
  id,
  qualifiedId: id,
  kind: 'polygon',
  points,
  fill,
  stroke: '#303a3d',
  lineWidth: 1,
  renderOrder: 29.8,
  order: 0,
  parallax: 1,
  sceneZ: 0,
  renderBias: 0.0002,
  materialId: 'painted-steel',
  surfaceNormal: { x: 0, y: -0.6, z: -0.8 },
  structuralOcclusion: 0,
  enabled: true,
  ...extra,
});
function endpointKey(endpoint) {
  return endpoint.regionId + '/' + endpoint.roomId;
}
function reachableRooms(map, active) {
  const known = new Set(
    map.regions.flatMap((region) => region.rooms.map((room) => region.id + '/' + room.id)),
  );
  const first = endpointKey(active);
  if (!known.has(first)) throw new Error('Quest runtime active room is absent from map');
  const visited = new Set([first]),
    queue = [first];
  for (let i = 0; i < queue.length; i++)
    for (const portal of map.portals) {
      if (portal.enabled === false) continue;
      const from = endpointKey(portal.from),
        to = endpointKey(portal.to);
      const next =
        from === queue[i] ? to : portal.bidirectional === true && to === queue[i] ? from : null;
      if (next && known.has(next) && !visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  return [...visited].map((key) => {
    const slash = key.indexOf('/');
    return { regionId: key.slice(0, slash), roomId: key.slice(slash + 1) };
  });
}
function draft(snapshot, changed, notifications = [], acquisitions = []) {
  return Object.freeze({
    changed,
    snapshot,
    notifications: freezeQuestData([...notifications]),
    acquisitions: freezeQuestData([...acquisitions]),
  });
}
export class FieldQuestRuntime {
  constructor(scene, catalog = QUEST_CATALOG) {
    this.scene = scene;
    this.catalog = catalog;
  }
  context(snapshot = this.scene.progressionSnapshot) {
    const map = this.scene.mapRuntime.getResolvedMap(),
      active = this.scene.mapRuntime.getActiveLocation();
    const cached = this.contextCache;
    if (
      cached &&
      cached.snapshot === snapshot &&
      cached.map === map &&
      cached.active === active &&
      cached.equipment === this.scene.equipmentCatalog
    )
      return cached.value;
    const campaignReadModel = getScrapCampaignReadModel(
      snapshot.scrapCampaign,
      this.scene.scrapCampaignProfile,
    );
    const reachable = reachableRooms(
      this.scene.mapRuntime.getResolvedMap(),
      this.scene.mapRuntime.getActiveLocation(),
    );
    const value = freezeQuestData(
      normalizeQuestContext({
        elapsedSegments: snapshot.scrapCampaign.elapsedSegments,
        day: campaignReadModel.day,
        phaseId: campaignReadModel.phaseId,
        garageRevealed: campaignReadModel.garageRevealComplete,
        accessibleRoomIds: reachable.map((entry) => entry.roomId),
        accessibleRegionIds: [...new Set(reachable.map((entry) => entry.regionId))],
        fieldCapabilities: resolveEquipmentLoadout(snapshot.loadout, this.scene.equipmentCatalog)
          .fieldCapabilities,
        campaignReadModel,
        currentRoomId: this.scene.mapRuntime.getActiveLocation().roomId,
      }),
    );
    this.contextCache = { snapshot, map, active, equipment: this.scene.equipmentCatalog, value };
    return value;
  }
  prepare(snapshot = this.scene.progressionSnapshot) {
    return this.applyResult(
      snapshot,
      reconcileQuests(snapshot.quests, this.context(snapshot), this.catalog),
    );
  }
  applyResult(snapshot, result) {
    if (!result.changed && !result.rewards.length)
      return draft(snapshot, false, result.notifications);
    // Build and validate a private draft. A failing later reward cannot leak earlier writes.
    let next = mergeProgressionSnapshot(
      structuredClone(snapshot),
      { quests: result.state },
      this.scene.equipmentCatalog,
    );
    const acquisitions = [];
    for (const reward of result.rewards) {
      const applied = applyRewardBundle(next, reward, {
        equipmentCatalog: this.scene.equipmentCatalog,
        enchantmentCatalog: this.scene.enchantmentCatalog,
      });
      next = applied.snapshot;
      if (applied.acquisition) acquisitions.push(applied.acquisition);
    }
    return draft(
      next,
      JSON.stringify(next) !== JSON.stringify(snapshot),
      result.notifications,
      acquisitions,
    );
  }
  accept(instanceId) {
    const snapshot = this.scene.progressionSnapshot;
    return this.applyResult(
      snapshot,
      acceptQuest(snapshot.quests, instanceId, this.context(snapshot), this.catalog),
    );
  }
  position(localX, room = this.scene.mapRuntime.getActiveRoom()) {
    return { x: room.bounds.x + localX, y: room.groundY };
  }
  near(position) {
    return (
      Math.hypot(
        this.scene.position.x - position.x,
        this.scene.position.y + PLAYER_CHARACTER_FOOT_OFFSET - position.y,
      ) <= 60
    );
  }
  nearbyAction() {
    const snapshot = this.scene.progressionSnapshot,
      context = this.context(snapshot),
      room = this.scene.mapRuntime.getActiveRoom();
    if (!context.garageRevealed) return null;
    const candidates = [];
    for (const record of snapshot.quests.records) {
      if (record.status !== 'accepted' || record.deadline <= context.elapsedSegments) continue;
      const profile = this.catalog.getProfile(record.profileId),
        objective = profile.objective;
      if (
        objective.kind !== 'field-action' ||
        objective.roomId !== room.id ||
        (objective.phaseId && objective.phaseId !== context.phaseId)
      )
        continue;
      const position = this.position(FIELD_X[profile.id], room);
      if (!this.near(position)) continue;
      const method = resolveQuestFieldMethod(objective, context);
      if (!method.allowed) continue;
      candidates.push({
        label: profile.title + (method.label ? ' · ' + method.label : ''),
        event: {
          type: 'field-action',
          instanceId: record.instanceId,
          occurrenceId: getQuestOccurrenceId(record),
          sourceId: objective.sourceId,
          roomId: room.id,
        },
        workSegments: objective.workSegments,
        position,
      });
    }
    for (const exploration of QUEST_WORLD_PROFILES.explorations) {
      if (
        exploration.roomId !== room.id ||
        snapshot.quests.explorationIds.includes(exploration.id) ||
        !context.fieldCapabilities.includes(exploration.capabilityId)
      )
        continue;
      const position = this.position(280, room);
      if (this.near(position))
        candidates.push({
          label: '판금 틈의 케이블 정리',
          event: {
            type: 'exploration',
            explorationId: exploration.id,
            sourceId: exploration.sourceId,
            roomId: room.id,
          },
          workSegments: 0,
          position,
        });
    }
    candidates.sort(
      (a, b) =>
        Math.abs(a.position.x - this.scene.position.x) -
        Math.abs(b.position.x - this.scene.position.x),
    );
    return candidates.length ? freezeQuestData(candidates[0]) : null;
  }
  perform(event, snapshot = this.scene.progressionSnapshot) {
    // A queued work event may survive time confirmation, but never a room/position change.
    const room = this.scene.mapRuntime.getActiveRoom();
    if (event.roomId !== room.id)
      throw new Error('Field quest event no longer belongs to the active room');
    if (event.type === 'field-action') {
      const record = snapshot.quests.records.find(
        (candidate) => candidate.instanceId === event.instanceId,
      );
      const objective = this.catalog.getProfile(record?.profileId).objective;
      if (
        objective.workSegments === 1 &&
        !snapshot.scrapCampaign.committedActionIds.includes(event.occurrenceId + ':work')
      )
        throw new Error('Paid field quest work requires its committed campaign action');
    }
    if (event.type !== 'encounter-completed') {
      const localX =
        event.type === 'exploration'
          ? 280
          : FIELD_X[
              this.catalog.getProfile(
                snapshot.quests.records.find((record) => record.instanceId === event.instanceId)
                  ?.profileId,
              ).id
            ];
      if (!this.near(this.position(localX, room)))
        throw new Error('Field quest source is out of interaction range');
    } else {
      const active = this.scene.roomSceneNode?.encounter;
      const actual = active?.createCompletionResult?.();
      const completed = actual ? this.completionEvent(actual) : null;
      if (
        !completed ||
        completed.instanceId !== event.instanceId ||
        completed.occurrenceId !== event.occurrenceId
      )
        throw new Error('Quest encounter occurrence has not completed');
    }
    return this.applyResult(
      snapshot,
      applyQuestEvent(snapshot.quests, event, this.context(snapshot), this.catalog),
    );
  }
  decorateSnapshot(snapshot) {
    const progression = this.scene.progressionSnapshot,
      context = this.context(progression),
      room = snapshot.room;
    if (!context.garageRevealed) return snapshot;
    const active = this.scene.roomSceneNode?.encounter;
    const night = QUEST_WORLD_PROFILES.nightEncounters.find(
      (profile) => profile.roomId === room.id,
    );
    if (!night) return snapshot;
    const record = progression.quests.records.find(
      (record) =>
        record.profileId === night.profileId &&
        record.status === 'accepted' &&
        record.deadline > context.elapsedSegments,
    );
    if (!record) return snapshot;
    const id = record.instanceId + ':enemy';
    if (context.phaseId !== night.phaseId && active?.enemy?.id !== id) return snapshot;
    if (
      this.scene.roomSceneNode?.location?.roomId === room.id &&
      active?.enemy?.health > 0 &&
      active.enemy.id !== id
    )
      return snapshot;
    if (
      snapshot.entities.some((entity) => entity.enabled !== false && COMBAT_KINDS.has(entity.kind))
    )
      return snapshot;
    const entity = {
      id,
      kind: 'combat-enemy',
      enabled: true,
      position: this.position(1050, room),
      maxHealth: 58,
      encounterProfileId: night.encounterProfileId,
      questInstanceId: record.instanceId,
      questOccurrenceId: getQuestOccurrenceId(record),
      questSourceId: night.sourceId,
    };
    return freezeQuestData({
      ...snapshot,
      entities: [...snapshot.entities, entity],
      room: { ...room, entities: [...room.entities, entity] },
    });
  }
  completionEvent(result) {
    const context = this.context(),
      state = this.scene.progressionSnapshot.quests,
      room = this.scene.mapRuntime.getActiveRoom();
    const active = this.scene.roomSceneNode?.encounter;
    if (
      active?.enemy?.id !== result?.entityId ||
      active.enemy.health > 0 ||
      active.completionEmitted !== true
    )
      return null;
    const profile = QUEST_WORLD_PROFILES.nightEncounters.find(
      (profile) => profile.roomId === room.id && profile.encounterProfileId === result?.profileId,
    );
    if (!profile || !['defeated', 'surrendered', 'fleeing'].includes(result?.resolutionState))
      return null;
    const record = state.records.find(
      (record) =>
        record.profileId === profile.profileId &&
        record.status === 'accepted' &&
        record.deadline > context.elapsedSegments &&
        record.instanceId + ':enemy' === result.entityId,
    );
    if (!record) return null;
    return freezeQuestData({
      type: 'encounter-completed',
      instanceId: record.instanceId,
      occurrenceId: getQuestOccurrenceId(record),
      sourceId: profile.sourceId,
      roomId: room.id,
    });
  }
  getBoardPrompt() {
    if (!this.context().garageRevealed) return null;
    const room = this.scene.mapRuntime.getActiveRoom(),
      board = QUEST_WORLD_PROFILES.boards.find((board) => board.roomId === room.id);
    if (!board) return null;
    const position = this.position(340, room);
    return this.near(position)
      ? freezeQuestData({ label: '의뢰 게시판', boardId: board.id, position })
      : null;
  }
  renderItems() {
    const progression = this.scene.progressionSnapshot,
      context = this.context(progression),
      room = this.scene.mapRuntime.getActiveRoom(),
      items = [];
    if (!context.garageRevealed) return Object.freeze([]);
    for (const board of QUEST_WORLD_PROFILES.boards.filter((board) => board.roomId === room.id)) {
      const p = this.position(340, room);
      items.push(
        polygon(board.id, box(p.x - 19, p.y - 72, 38, 40), '#6b7268'),
        polygon(board.id + ':post', box(p.x - 3, p.y - 32, 6, 32), '#555f61'),
        polygon(board.id + ':rest-seat', box(p.x + 25, p.y - 18, 34, 5), '#89775d'),
        polygon(board.id + ':rest-leg', box(p.x + 30, p.y - 13, 5, 13), '#5c6865'),
      );
      for (let n = 0; n < 3; n++)
        items.push(
          polygon(board.id + ':line:' + n, box(p.x - 12, p.y - 62 + n * 9, 24, 3), '#d2ccae', {
            stroke: null,
          }),
        );
    }
    for (const record of progression.quests.records) {
      if (record.status !== 'accepted' || record.deadline <= context.elapsedSegments) continue;
      const profile = this.catalog.getProfile(record.profileId);
      if (profile.objective.roomId !== room.id) continue;
      const p = this.position(FIELD_X[profile.id], room),
        visible = !profile.objective.phaseId || profile.objective.phaseId === context.phaseId;
      items.push(
        polygon(
          record.instanceId + ':marker',
          [
            { x: p.x, y: p.y - 54 },
            { x: p.x + 7, y: p.y - 45 },
            { x: p.x, y: p.y - 36 },
            { x: p.x - 7, y: p.y - 45 },
          ],
          visible ? '#d4c18d' : '#65717a',
          { role: 'field-quest-marker', emissive: visible },
        ),
      );
    }
    for (const outcome of getQuestWorldOutcomes(progression.quests).filter(
      (outcome) => outcome.roomId === room.id,
    )) {
      const p = this.position(1230, room),
        temporary = outcome.value === 'temporary-lighting';
      items.push(
        polygon(
          'field-quest-lamp:stand',
          box(p.x - 3, p.y - (temporary ? 35 : 60), 6, temporary ? 35 : 60),
          '#59676b',
          { role: 'field-quest-lamp' },
        ),
      );
      items.push(
        polygon(
          'field-quest-lamp:bulb',
          box(p.x - 10, p.y - (temporary ? 44 : 69), 20, 12),
          temporary ? '#c89958' : '#b6d6b0',
          { role: 'field-quest-lamp', emissive: context.phaseId === 'night' },
        ),
      );
    }
    for (const exploration of QUEST_WORLD_PROFILES.explorations)
      if (
        exploration.roomId === room.id &&
        !progression.quests.explorationIds.includes(exploration.id)
      ) {
        const p = this.position(280, room);
        items.push(
          polygon(
            exploration.id + ':plate-left',
            [
              { x: p.x - 22, y: p.y - 30 },
              { x: p.x - 3, y: p.y - 33 },
              { x: p.x - 7, y: p.y - 4 },
              { x: p.x - 24, y: p.y - 2 },
            ],
            '#687174',
          ),
          polygon(
            exploration.id + ':plate-right',
            [
              { x: p.x + 4, y: p.y - 28 },
              { x: p.x + 22, y: p.y - 26 },
              { x: p.x + 22, y: p.y - 2 },
              { x: p.x + 1, y: p.y - 5 },
            ],
            '#566367',
          ),
          polygon(
            exploration.id + ':cable',
            [
              { x: p.x - 2, y: p.y - 19 },
              { x: p.x + 15, y: p.y - 38 },
              { x: p.x + 18, y: p.y - 36 },
              { x: p.x + 1, y: p.y - 15 },
            ],
            '#b49f6d',
            { role: 'exploration-clue' },
          ),
        );
      }
    return freezeQuestData(items);
  }
  workLights() {
    const context = this.context();
    if (!context.garageRevealed || context.phaseId !== 'night') return Object.freeze([]);
    const room = this.scene.mapRuntime.getActiveRoom();
    if (!['abandoned-mine-roadhead', 'harbor-shipyard-roadhead'].includes(room.id))
      return Object.freeze([]);
    const p = this.position(1230, room),
      temporary =
        this.scene.progressionSnapshot.quests.worldFacts['harbor-lamp-service'] ===
          'temporary-lighting' && room.id === 'harbor-shipyard-roadhead';
    return freezeQuestData([
      {
        id: 'field-work-light:' + room.id,
        kind: 'point',
        position: { x: p.x, y: p.y - (temporary ? 38 : 63), z: -40 },
        range: temporary ? 145 : 210,
        intensity: temporary ? 0.6 : 0.85,
        falloff: 2,
      },
    ]);
  }
}
