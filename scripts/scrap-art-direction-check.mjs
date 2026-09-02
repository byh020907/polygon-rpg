import assert from 'node:assert/strict';
import {
  SCRAP_ART_DIRECTION_PROFILE,
  createSceneArtDirectionReadModel,
} from '../src/game/ScrapArtDirectionProfiles.js';
import {
  SCRAP_AWAKENING_MAP,
  SCRAP_MINE_ROAD_REGION_ID,
  SCRAP_MINE_TUNNEL_ROOM_ID,
} from '../src/game/maps/scrapAwakening.js';
import { readVisualQaRequest, visualQaScenarioIds } from '../src/app/VisualQaConfig.js';
import { CombatCameraFeedback } from '../src/combat/CombatCameraFeedback.js';

const room = SCRAP_AWAKENING_MAP.getRoom(SCRAP_MINE_ROAD_REGION_ID, SCRAP_MINE_TUNNEL_ROOM_ID);
assert.ok(room, '대표 폐광 구조 갱도 room이 필요합니다.');

const itemById = new Map(room.renderItems.map((item) => [item.id, item]));
for (const id of [
  'mine-tunnel-sky-slit',
  'mine-tunnel-far-ridge',
  'mine-tunnel-extractor-tower',
  'mine-tunnel-dust-veil',
  'mine-tunnel-ventilator-housing',
  'mine-tunnel-ground-cutaway',
  'mine-tunnel-floor-rail',
  'mine-trapped-worker-coat',
  'mine-trapped-worker-helmet',
  'mine-trapped-worker-tool',
  'mine-tunnel-foreground-rock-right',
]) {
  assert.ok(itemById.has(id), `대표 장면 render item이 필요합니다: ${id}`);
}

const depthLayers = new Set(room.renderItems.map((item) => item.parallax).filter(Number.isFinite));
assert.ok(depthLayers.size >= 5, '대표 장면은 최소 다섯 parallax depth를 가져야 합니다.');
assert.ok(Math.min(...depthLayers) < 0.1, '하늘/먼 배경 layer가 필요합니다.');
assert.ok(Math.max(...depthLayers) > 1, 'camera보다 빠른 전경 layer가 필요합니다.');

const materials = new Set(
  room.renderItems
    .map((item) => item.materialId)
    .filter((material) => typeof material === 'string'),
);
assert.deepEqual([...['cloth', 'metal', 'soil', 'stone']].sort(), [...materials].sort());
assert.ok(
  room.renderItems.filter((item) => item.lightOccluder).length >= 5,
  '계산형 조명이 읽을 명시적 차폐 geometry가 필요합니다.',
);
assert.ok(
  room.renderItems.filter((item) => item.emissive).length >= 4,
  '구조 신호와 경고등의 functional emissive source가 필요합니다.',
);

const hitEvent = Object.freeze({
  id: 77,
  type: 'hit',
  position: Object.freeze({ x: 702, y: 354 }),
  strength: 1.5,
  durationSeconds: 0.2,
  remainingSeconds: 0.15,
  enchantment: null,
});
const artDirection = createSceneArtDirectionReadModel(SCRAP_ART_DIRECTION_PROFILE, {
  roomId: SCRAP_MINE_TUNNEL_ROOM_ID,
  combatEvents: [hitEvent],
  player: {
    position: { x: 640, y: 413 },
    groundY: 426,
    scale: 0.265,
  },
  enemy: {
    position: { x: 725, y: 426 },
    groundY: 426,
    width: 58,
    height: 86,
  },
});
assert.ok(Object.isFrozen(artDirection));
assert.equal(artDirection.saturationRetention, 0.12);
assert.equal(artDirection.quantizationLevels, 4);
assert.equal(artDirection.cameraZoom, 2.65);
assert.equal(artDirection.mobileCameraScale, 1.08);
assert.equal(artDirection.shadowCasters.length, 3);
assert.equal(artDirection.lights.filter((light) => light.kind === 'directional').length, 1);
assert.equal(artDirection.lights.filter((light) => light.kind === 'point').length, 3);
const attackLight = artDirection.lights.find((light) => light.id === 'combat-contact-light-77');
assert.ok(attackLight?.transient);
assert.ok(Math.abs(attackLight.progress - 0.25) < 1e-9);
assert.equal(attackLight.position, hitEvent.position);

assert.ok(visualQaScenarioIds().includes('scrap-art-benchmark'));
const qaRequest = readVisualQaRequest(
  '?visualQa=1&gameStart=scrap-art-benchmark&visualQaRenderer=polygon&visualQaPhase=active&gameFrame=0',
);
assert.equal(qaRequest.scenario.roomId, SCRAP_MINE_TUNNEL_ROOM_ID);
assert.equal(qaRequest.scenario.combatScenarioId, 'combat-hit');
assert.equal(qaRequest.scenario.x, 640);
assert.equal(qaRequest.scenario.expectation.expectedEvent, 'hit');
assert.ok(qaRequest.scenario.expectation.expectedItems.includes('mine-trapped-worker-coat'));
assert.ok(qaRequest.scenario.expectation.expectedItems.includes('combat-enemy-collector-eye'));

assert.equal(
  createSceneArtDirectionReadModel(SCRAP_ART_DIRECTION_PROFILE, {
    roomId: 'non-benchmark-room',
  }),
  null,
  '대표 장면 밖의 기존 renderer state를 암묵적으로 바꾸면 안 됩니다.',
);

const cameraFeedback = new CombatCameraFeedback({
  maxHorizontalOffset: 6,
  maxDurationSeconds: 0.14,
});
cameraFeedback.trigger({ direction: -1, strength: 4.5, durationSeconds: 0.1 });
const contactKick = cameraFeedback.snapshot();
assert.ok(contactKick.x < 0, 'Camera contact kick은 타격 방향을 먼저 따라야 합니다.');
assert.ok(contactKick.y < 0, 'Camera contact kick은 짧은 수직 반동을 포함해야 합니다.');
cameraFeedback.update(0.05);
assert.ok(
  Math.abs(cameraFeedback.snapshot().x) < Math.abs(contactKick.x),
  'Camera contact kick은 빠르게 감쇠해야 합니다.',
);
cameraFeedback.setEnabled(false);
assert.deepEqual(cameraFeedback.snapshot(), { x: 0, y: 0 });

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'scrap-art-direction-benchmark',
    depthLayerCount: depthLayers.size,
    materials: [...materials].sort(),
    lightIds: artDirection.lights.map((light) => light.id),
    checks: [
      'low-saturation-four-level-cell-direction',
      'five-plus-parallax-depth-layers',
      'industrial-ventilator-landmark',
      'terrain-material-cross-section',
      'protagonist-normal-enemy-worker-combat-scenario',
      'directional-point-and-transient-contact-light',
      'direction-first-camera-kick-and-fast-decay',
      'explicit-occluders-and-three-ground-shadows',
      'stable-polygon-retro-url-scenario',
    ],
  }),
);
