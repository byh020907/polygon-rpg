import { SCRAP_AWAKENING_MAP } from '../game/maps/scrapAwakening.js';
import { deepFreeze } from '../game/map/MapDefinition.js';
import { matchesMapCondition } from '../game/map/MapStateResolver.js';

const NPC_BODY_ROLES = new Set([
  'scrapyard-owner',
  'rival-apprentice',
  'rival-trapped',
  'rival-rescued',
  'mine-worker',
  'shipyard-worker',
  'greenhouse-technician',
  'snow-train-crew',
  'quarry-worker',
]);

export function graphicsItemCategory(item) {
  if (item.graphics?.category) return item.graphics.category;
  const identity = `${item.id} ${item.role ?? ''}`;
  if (/foreground/.test(identity)) return 'foreground';
  if (/sky|far-terrain|atmospher|midground|skyline|horizon|distant/.test(identity))
    return 'background';
  if (/terrain|ground|rail|haul-track|snow-drift|rock-face|ore-material|plate-path/.test(identity))
    return 'terrain';
  if (
    /workshop|garage-door|old-tunnel|house|gate-landmark-structure|gate-landmark-opening/.test(
      identity,
    )
  )
    return 'building';
  if (
    /machine|robot|crane|reactor|ventilator|retrieval-arm|winch|facility|cutter|hydraulic|geothermal-pipe|snowplow|replacement/.test(
      identity,
    )
  )
    return 'facility';
  return 'prop';
}

function setFact(facts, path, value) {
  const keys = path.split('.');
  let target = facts;
  for (const key of keys.slice(0, -1)) target = target[key] ??= {};
  const key = keys.at(-1);
  target[key] =
    Array.isArray(value) && Array.isArray(target[key])
      ? [...new Set([...target[key], ...value])]
      : value;
}

// This only selects a deterministic condition example. MapStateResolver remains the
// sole patch interpreter; the review never implements patch writes itself.
export function graphicsPatchFacts(condition) {
  const facts = {};
  const visit = (entry) => {
    if (!entry || typeof entry !== 'object') return;
    if (Array.isArray(entry)) return entry.forEach(visit);
    if (entry.all) entry.all.forEach(visit);
    if (entry.any?.length) visit(entry.any[0]);
    if (entry.fact) {
      const value =
        entry.eq ??
        entry.equals ??
        entry.value ??
        entry.in?.[0] ??
        (entry.includes !== undefined ? [entry.includes] : (entry.gte ?? entry.gt + 1));
      setFact(facts, entry.fact, value);
    }
    if (entry.flag) setFact(facts, `flags.${entry.flag}`, entry.value ?? entry.eq ?? true);
  };
  visit(condition);
  if (!matchesMapCondition(condition, facts)) {
    throw new Error(`그래픽 patch 조건의 재현 표본이 없습니다: ${JSON.stringify(condition)}`);
  }
  return deepFreeze(facts);
}

function targetsItem(target, item, regionId, roomId) {
  if (typeof target === 'string') return target === item.id || target === item.qualifiedId;
  return (
    (!target.id || target.id === item.id || target.id === item.qualifiedId) &&
    (!target.qualifiedId || target.qualifiedId === item.qualifiedId) &&
    (!target.regionId || target.regionId === regionId) &&
    (!target.roomId || target.roomId === roomId) &&
    (!target.kind || target.kind === 'renderItem') &&
    (!target.type || target.type === 'renderItem')
  );
}

const BASE_ACTION = deepFreeze({ id: 'base', label: '기본 상태', frameCount: 1 });

export function createMapGraphicResources(map = SCRAP_AWAKENING_MAP) {
  const resources = [];
  const patches = map.patches.map((patch) => ({
    id: patch.id,
    condition: patch.when,
    facts: graphicsPatchFacts(patch.when),
    resourceIds: [],
  }));
  const patchById = new Map(patches.map((patch) => [patch.id, patch]));
  const actionsFor = (items, regionId, roomId) => [
    BASE_ACTION,
    ...map.patches
      .filter((patch) =>
        patch.operations.some((operation) =>
          items.some((item) => targetsItem(operation.target, item, regionId, roomId)),
        ),
      )
      .map((patch) => ({
        id: `patch:${patch.id}`,
        label: `상태 · ${patch.id}`,
        frameCount: 1,
        patchId: patch.id,
        facts: patchById.get(patch.id).facts,
      })),
  ];
  let rawItemCount = 0;
  let disabledItemCount = 0;
  for (const region of map.regions) {
    for (const room of region.rooms) {
      const provenance = {
        source: 'src/game/maps/scrapAwakening.js',
        regionId: region.id,
        roomId: room.id,
        roomLabel: room.label ?? room.id,
        regionLabel: region.label ?? region.id,
      };
      const groups = room.renderItems
        .filter((item) => NPC_BODY_ROLES.has(item.role) || item.graphics?.groupId)
        .map((body) => {
          const prefix =
            body.graphics?.groupId ?? body.id.replace(/-(torso|workwear|coat|apron|vest)$/, '');
          return {
            id: prefix,
            category: body.graphics?.category ?? 'npc',
            label: body.graphics?.label ?? (body.label ?? prefix).split(' · ')[0],
            items: room.renderItems.filter(
              (item) =>
                item.graphics?.groupId === prefix ||
                item.id === prefix ||
                item.id.startsWith(`${prefix}-`),
            ),
          };
        });
      const distinctGroups = [...new Map(groups.map((group) => [group.id, group])).values()];
      const npcItemIds = new Set(
        distinctGroups
          .filter((group) => group.category === 'npc')
          .flatMap((group) => group.items.map((item) => item.id)),
      );
      for (const group of distinctGroups)
        resources.push({
          ...provenance,
          id: `${group.category === 'npc' ? 'npc' : 'assembly'}:${room.id}:${group.id}`,
          label: group.label,
          category: group.category,
          kind: 'static',
          producer: 'map',
          itemIds: group.items.map((item) => item.id),
          actions: actionsFor(group.items, region.id, room.id),
          notes: `실제 맵의 조립된 ${group.category === 'npc' ? 'NPC' : '리소스'}. 현재 별도 시간축 애니메이션은 없으며 상태별 폴리곤을 그대로 표시합니다.`,
        });
      for (const item of room.renderItems) {
        rawItemCount += 1;
        if (item.enabled === false) disabledItemCount += 1;
        const resource = {
          ...provenance,
          id: `map:${item.qualifiedId}`,
          label: item.label ?? item.id,
          category: npcItemIds.has(item.id) ? 'npc' : graphicsItemCategory(item),
          kind: 'static',
          producer: 'map',
          itemIds: [item.id],
          rawItemId: item.qualifiedId,
          enabledByDefault: item.enabled !== false,
          actions: actionsFor([item], region.id, room.id),
          notes: `${item.enabled === false ? '원본 비활성 리소스' : '원본 기본 활성 리소스'} · ${item.role ?? '역할 태그 없음'} · ${item.materialId ?? '기본 재질'}`,
        };
        resources.push(resource);
        for (const action of resource.actions) {
          if (action.patchId) patchById.get(action.patchId).resourceIds.push(resource.id);
        }
      }
      // Scene state rows also include nonvisual patches, so every authored patch is
      // accounted for even when it only changes an interaction or a portal.
      const roomObjectIds = new Set(
        [
          ...room.renderItems,
          ...room.entities,
          ...room.surfaces,
          ...room.triggers,
          ...map.portals.filter((portal) =>
            [portal.from, portal.to].some(
              (endpoint) => endpoint.regionId === region.id && endpoint.roomId === room.id,
            ),
          ),
        ].flatMap((item) => [item.id, item.qualifiedId]),
      );
      const scenePatches = map.patches.filter((patch) =>
        patch.operations.some((operation) =>
          typeof operation.target === 'string'
            ? roomObjectIds.has(operation.target)
            : operation.target.roomId === room.id || roomObjectIds.has(operation.target.id),
        ),
      );
      resources.push({
        ...provenance,
        id: `scene:${region.id}:${room.id}`,
        label: room.label ?? room.id,
        category: 'scene',
        kind: 'scene',
        producer: 'map',
        itemIds: [],
        actions: [
          BASE_ACTION,
          ...scenePatches.map((patch) => ({
            id: `patch:${patch.id}`,
            label: `조건 · ${patch.id}`,
            frameCount: 1,
            patchId: patch.id,
            facts: patchById.get(patch.id).facts,
          })),
        ],
        notes:
          '실제 MapRuntime 배치·depth·광원·차폐. 조건 행은 해당 patch의 결정적 world fact 표본입니다.',
      });
    }
  }
  return deepFreeze({
    resources,
    inventory: {
      mapId: map.id,
      roomCount: map.regions.reduce((count, region) => count + region.rooms.length, 0),
      rawItemCount,
      disabledItemCount,
      patchCount: patches.length,
      patches,
      npcGroupCount: resources.filter((resource) => resource.id.startsWith('npc:')).length,
      nonvisualPatchIds: patches
        .filter((patch) => patch.resourceIds.length === 0)
        .map((patch) => patch.id),
    },
  });
}
