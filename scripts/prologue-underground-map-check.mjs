import assert from 'node:assert/strict';
import {
  SCRAP_AWAKENING_MAP,
  SCRAP_AWAKENING_REGION_ID,
  SCRAP_MINE_ROAD_PORTAL_ID,
  SCRAP_MINE_ROAD_REGION_ID,
  SCRAP_SHIPYARD_ROAD_PORTAL_ID,
  SCRAP_SHIPYARD_REGION_ID,
  SCRAP_GREENHOUSE_ROAD_PORTAL_ID,
  SCRAP_GREENHOUSE_REGION_ID,
  SCRAP_SNOW_ROAD_PORTAL_ID,
  SCRAP_SNOW_REGION_ID,
  SCRAP_QUARRY_ROAD_PORTAL_ID,
  SCRAP_QUARRY_REGION_ID,
} from '../src/game/maps/scrapAwakening.js';
import {
  PROLOGUE_RAMP_RIVAL_CAST_ENTITY_ID,
  PROLOGUE_UNDERGROUND_PORTAL_IDS,
  PROLOGUE_UNDERGROUND_RESUME_BY_STAGE,
  PROLOGUE_UNDERGROUND_ROOM_IDS,
} from '../src/game/maps/PrologueUndergroundMap.js';
import {
  SCRAP_AWAKENING_STAGE,
  SCRAP_AWAKENING_STAGE_IDS,
} from '../src/game/campaign/ScrapAwakeningState.js';
import { MapStateResolver } from '../src/game/map/MapStateResolver.js';
import { resolveScrapPrologueConversationTranscripts } from '../src/game/story/ScrapPrologueStory.js';

const prologueRegion = SCRAP_AWAKENING_MAP.getRegion(SCRAP_AWAKENING_REGION_ID);
assert.ok(prologueRegion, '도입 region이 존재해야 한다.');

const expectedBounds = new Map([
  [PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD, { x: 0, y: 0, width: 1440, height: 540 }],
  [PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK, { x: 1440, y: 540, width: 1440, height: 540 }],
  [PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP, { x: 2880, y: 540, width: 960, height: 540 }],
  [
    PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
    { x: 2880, y: 1080, width: 960, height: 540 },
  ],
  [
    PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN,
    { x: 1440, y: 1080, width: 1440, height: 540 },
  ],
]);

assert.equal(prologueRegion.rooms.length, 5, '도입 region은 서로 다른 다섯 room으로 구성한다.');
for (const [roomId, bounds] of expectedBounds) {
  const room = SCRAP_AWAKENING_MAP.getRoom(SCRAP_AWAKENING_REGION_ID, roomId);
  assert.ok(room, `${roomId} room이 있어야 한다.`);
  assert.deepEqual(room.bounds, bounds, `${roomId}의 world offset과 크기를 보존해야 한다.`);
  assert.ok(room.surfaces.length > 0, `${roomId}에 실제 collision surface가 있어야 한다.`);
  assert.ok(room.portals.length > 0, `${roomId}에 명시적인 이동 경로가 있어야 한다.`);
}
assert.equal(
  new Set(prologueRegion.rooms.map((room) => JSON.stringify(room.bounds))).size,
  5,
  '다섯 room의 world bounds가 겹쳐 정의되면 안 된다.',
);
assert.deepEqual(SCRAP_AWAKENING_MAP.worldSize, { width: 3840, height: 1620 });

const allPrologueObjects = prologueRegion.rooms.flatMap((room) => [
  ...room.surfaces,
  ...room.renderItems,
  ...room.entities,
  ...room.triggers,
]);
const prologueObjectIds = allPrologueObjects.map((object) => object.id);
assert.equal(
  new Set(prologueObjectIds).size,
  prologueObjectIds.length,
  '도입 room 사이에 surface/render/entity ID가 중복되면 안 된다.',
);

const combatEntities = prologueRegion.rooms.flatMap((room) =>
  room.entities.filter((entity) => entity.kind === 'combat-enemy'),
);
assert.deepEqual(
  combatEntities.map((entity) => entity.id),
  ['scrap-yard-scout-collector'],
  '붕괴 전 의무 전투는 상층 수거 유닛 한 번뿐이어야 한다.',
);
assert.equal(combatEntities[0].scrapAwakeningNextStageId, SCRAP_AWAKENING_STAGE.YARD_SURVEY);
for (const line of prologueRegion.rooms
  .flatMap((room) => room.entities)
  .flatMap((entity) => entity.lines ?? [])) {
  assert.doesNotMatch(
    line,
    /두 번째 유닛|경계 유닛/,
    '삭제한 반복 전투를 실제 도입 대사에서 다시 지시하면 안 된다.',
  );
}

const resolver = new MapStateResolver(SCRAP_AWAKENING_MAP);
const resolve = (stageId) =>
  resolver.resolve({
    scrapAwakeningStageId: stageId,
    scrapGarageRevealStageId: 'report-ready',
    scrapRegionStageIds: {},
  });
const resolvedPrologueRooms = (stageId) =>
  resolve(stageId).regions.find((region) => region.id === SCRAP_AWAKENING_REGION_ID).rooms;
const enabledEncounters = (stageId) =>
  resolvedPrologueRooms(stageId)
    .flatMap((room) => room.entities)
    .filter((entity) => entity.kind === 'combat-enemy' && entity.enabled !== false);

for (const stageId of SCRAP_AWAKENING_STAGE_IDS) {
  assert.doesNotThrow(
    () => resolve(stageId),
    `기존 저장 stage ${stageId}를 계속 resolve해야 한다.`,
  );
  const encounters = enabledEncounters(stageId);
  if (stageId === SCRAP_AWAKENING_STAGE.YARD_CLEARANCE) {
    assert.deepEqual(
      encounters.map((entity) => entity.id),
      ['scrap-yard-scout-collector'],
    );
  } else {
    assert.equal(encounters.length, 0, `${stageId}에서 반복 의무 전투가 켜지면 안 된다.`);
  }
}

function resolvedRoom(stageId, roomId) {
  return resolvedPrologueRooms(stageId).find((room) => room.id === roomId);
}

const upperBeforeFight = resolvedRoom(
  SCRAP_AWAKENING_STAGE.YARD_CLEARANCE,
  PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
);
const upperAfterFight = resolvedRoom(
  SCRAP_AWAKENING_STAGE.YARD_SURVEY,
  PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
);
const beforeBridge = upperBeforeFight.surfaces.find(
  (surface) => surface.id === 'underground-upper-bridge-surface',
);
const afterBridge = upperAfterFight.surfaces.find(
  (surface) => surface.id === 'underground-upper-bridge-surface',
);
assert.equal(beforeBridge.kind, 'one-way');
assert.equal(beforeBridge.enabled, false, '전투 전에는 교량 collision이 잠겨야 한다.');
assert.equal(afterBridge.enabled, true, '수거 유닛 처치가 실제 교량 collision을 열어야 한다.');
assert.equal(
  upperBeforeFight.renderItems.find((item) => item.id === 'underground-upper-route-locked').enabled,
  true,
  '전투 전 잠긴 경로를 화면에서 읽을 수 있어야 한다.',
);
assert.equal(
  upperAfterFight.renderItems.find((item) => item.id === 'underground-upper-route-ready').enabled,
  true,
  '전투 뒤 열린 경로를 청록 신호로 읽을 수 있어야 한다.',
);
assert.equal(
  upperBeforeFight.surfaces.find(
    (surface) => surface.id === 'underground-upper-safety-shelf-surface',
  )?.enabled,
  true,
  '교량 아래에는 구르기·넉백 추락을 실제로 받아 주는 복귀 발판이 있어야 한다.',
);
assert.equal(
  upperBeforeFight.surfaces.find(
    (surface) => surface.id === 'underground-upper-recovery-ramp-surface',
  )?.enabled,
  true,
  '복귀 발판은 오른쪽 상층 지면과 portal까지 다시 올라가는 실제 경사로에 이어져야 한다.',
);
for (const itemId of [
  'underground-upper-lower-return-glimpse',
  'underground-upper-lower-return-rail',
  'underground-upper-lower-return-signal',
]) {
  assert.equal(
    upperBeforeFight.renderItems.find((item) => item.id === itemId)?.enabled,
    true,
    '상층 진입 때 아래쪽 정비 귀환로를 미리 볼 수 있어야 한다.',
  );
}
assert.equal(
  resolvedRoom(
    SCRAP_AWAKENING_STAGE.YARD_PLATE,
    PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP,
  ).surfaces.find((surface) => surface.id === 'underground-chest-ramp-surface').enabled,
  true,
  '전투 뒤 흉갑 경사로 collision이 실제로 활성화되어야 한다.',
);

const controlRoom = SCRAP_AWAKENING_MAP.getRoom(
  SCRAP_AWAKENING_REGION_ID,
  PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
);
const controlEntityIds = new Set(controlRoom.entities.map((entity) => entity.id));
for (const entityId of [
  'cast-rival-trapped',
  'cast-rival-rescued',
  'scrap-rival-rescue-request',
  'scrap-player-device-decision',
  'scrap-control-device',
]) {
  assert.ok(controlEntityIds.has(entityId), `${entityId}는 같은 하층 제어실에 있어야 한다.`);
}

const rampRoom = SCRAP_AWAKENING_MAP.getRoom(
  SCRAP_AWAKENING_REGION_ID,
  PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP,
);
assert.ok(rampRoom.entities.some((entity) => entity.id === PROLOGUE_RAMP_RIVAL_CAST_ENTITY_ID));
const plate = rampRoom.entities.find((entity) => entity.id === 'scrap-rival-yard-plate');
const search = rampRoom.entities.find((entity) => entity.id === 'scrap-rival-yard-search');
assert.equal(plate.conversationId, 'scrap-prologue:yard-plate');
assert.equal(search.conversationId, 'scrap-prologue:yard-search');
assert.deepEqual(
  plate.lines,
  [...resolveScrapPrologueConversationTranscripts([plate.conversationId])[0].lines],
  '지지판의 실제 상호작용과 보존 transcript는 한 authored 대사를 사용해야 한다.',
);
assert.deepEqual(
  search.lines,
  [...resolveScrapPrologueConversationTranscripts([search.conversationId])[0].lines],
  '붕괴 직전 실제 상호작용과 보존 transcript는 한 authored 대사를 사용해야 한다.',
);
assert.equal(plate.scrapAwakeningNextStageId, SCRAP_AWAKENING_STAGE.YARD_SEARCH);
assert.equal(search.scrapAwakeningNextStageId, SCRAP_AWAKENING_STAGE.COLLAPSE);

const upperRampPortal = SCRAP_AWAKENING_MAP.getPortal(
  PROLOGUE_UNDERGROUND_PORTAL_IDS.UPPER_TO_RAMP,
);
assert.equal(upperRampPortal.scrapAwakeningNextStageId, SCRAP_AWAKENING_STAGE.YARD_PLATE);
assert.equal(
  resolve(SCRAP_AWAKENING_STAGE.YARD_APPROACH).portals.find(
    (portal) => portal.id === PROLOGUE_UNDERGROUND_PORTAL_IDS.UPPER_TO_RAMP,
  ).enabled,
  true,
);
assert.equal(
  resolve(SCRAP_AWAKENING_STAGE.COMPLETE).portals.find(
    (portal) => portal.id === PROLOGUE_UNDERGROUND_PORTAL_IDS.MAINTENANCE_TO_COURTYARD,
  ).enabled,
  true,
  '완료 뒤 하층 정비로에서 작업 마당으로 귀환할 수 있어야 한다.',
);

for (const stageId of SCRAP_AWAKENING_STAGE_IDS) {
  const resume = PROLOGUE_UNDERGROUND_RESUME_BY_STAGE[stageId];
  assert.ok(resume, `${stageId}의 안전한 local resume 위치가 있어야 한다.`);
  const room = SCRAP_AWAKENING_MAP.getRoom(SCRAP_AWAKENING_REGION_ID, resume.roomId);
  assert.ok(room, `${stageId} resume room이 실제 map에 있어야 한다.`);
  assert.ok(
    resume.position.x >= room.movementBounds.minX && resume.position.x <= room.movementBounds.maxX,
    `${stageId} resume x가 movement bounds 안에 있어야 한다.`,
  );
}

const campaignRegions = [
  SCRAP_MINE_ROAD_REGION_ID,
  SCRAP_SHIPYARD_REGION_ID,
  SCRAP_GREENHOUSE_REGION_ID,
  SCRAP_SNOW_REGION_ID,
  SCRAP_QUARRY_REGION_ID,
];
for (const regionId of campaignRegions) {
  assert.ok(
    SCRAP_AWAKENING_MAP.getRegion(regionId),
    `${regionId} campaign region을 보존해야 한다.`,
  );
}
const campaignPortalIds = [
  SCRAP_MINE_ROAD_PORTAL_ID,
  SCRAP_SHIPYARD_ROAD_PORTAL_ID,
  SCRAP_GREENHOUSE_ROAD_PORTAL_ID,
  SCRAP_SNOW_ROAD_PORTAL_ID,
  SCRAP_QUARRY_ROAD_PORTAL_ID,
];
for (const portalId of campaignPortalIds) {
  const portal = SCRAP_AWAKENING_MAP.getPortal(portalId);
  assert.ok(portal, `${portalId} campaign portal을 보존해야 한다.`);
  const courtyardEndpoint = [portal.from, portal.to].find(
    (endpoint) => endpoint.roomId === PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
  );
  assert.ok(courtyardEndpoint, `${portalId}는 기존 작업 마당에 계속 연결되어야 한다.`);
  assert.ok(courtyardEndpoint.anchor.x >= 0 && courtyardEndpoint.anchor.x <= 1440);
}

console.log(
  'PASS prologue underground map: 5 distinct rooms, one purpose fight, deployed bridge/ramp, lower awakening chamber, changed maintenance return, and preserved campaign routes.',
);
