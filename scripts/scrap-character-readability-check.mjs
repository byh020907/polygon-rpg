import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHARACTER_PRESENTATION_PROFILE } from '../src/game/character/CharacterPresentationProfiles.js';
import { createCharacterDesignBoard } from '../src/game/character/CharacterDesignBoard.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const profiles = CHARACTER_PRESENTATION_PROFILE.profiles;
assert.equal(profiles.length, 19);
assert.equal(new Set(profiles.map((profile) => profile.id)).size, profiles.length);
assert.deepEqual(CHARACTER_PRESENTATION_PROFILE.comparisonViews, [
  'front',
  'side',
  'representative-pose',
]);
assert.ok(Object.isFrozen(CHARACTER_PRESENTATION_PROFILE));
assert.ok(profiles.every((profile) => Object.isFrozen(profile.landmarks)));
assert.ok(profiles.every((profile) => profile.landmarks.length >= 3));
assert.ok(profiles.every((profile) => profile.minimumViewportHeight >= 64));

const requiredRoleIds = [
  'scrapyard-apprentice',
  'scrapyard-owner',
  'rival-scout',
  'mine-worker',
  'shipyard-worker',
  'greenhouse-technician',
  'snow-train-crew',
  'quarry-worker',
  'mine-claim-jacker',
  'dock-salvage-raider',
  'snow-route-raider',
  'collector-unit',
  'industrial-creature',
  'regional-boss',
  'mine-collapse-boss',
  'shipyard-twin-crane-boss',
  'greenhouse-geothermal-boss',
  'snowplow-train-boss',
  'quarry-rock-cutter-boss',
];
assert.deepEqual(
  profiles.map((profile) => profile.id),
  requiredRoleIds,
);

const board = createCharacterDesignBoard(CHARACTER_PRESENTATION_PROFILE);
assert.ok(Object.isFrozen(board));
assert.ok(Object.isFrozen(board.items));
assert.equal(board.manifest.entries.length, profiles.length);
assert.equal(new Set(board.items.map((item) => item.id)).size, board.items.length);
for (const profile of profiles) {
  for (const view of CHARACTER_PRESENTATION_PROFILE.comparisonViews) {
    assert.ok(
      board.items.some((item) => item.id === `${profile.id}-${view}-torso`),
      `${profile.id} ${view} torso가 필요합니다.`,
    );
    assert.ok(
      board.items.some((item) => item.id.startsWith(`${profile.id}-${view}-tool-`)),
      `${profile.id} ${view} tool landmark가 필요합니다.`,
    );
  }
}

const normalizeShape = (points) => {
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  return JSON.stringify(
    points.map((point) => [
      Number((point.x - minX).toFixed(2)),
      Number((point.y - minY).toFixed(2)),
    ]),
  );
};
const humanToolShapes = profiles
  .filter((profile) => profile.family === 'human')
  .map((profile) =>
    board.items.find(
      (boardItem) => boardItem.id === `${profile.id}-representative-pose-tool-${profile.toolKind}`,
    ),
  );
assert.ok(humanToolShapes.every(Boolean));
assert.equal(
  new Set(humanToolShapes.map((tool) => normalizeShape(tool.points))).size,
  profiles.filter((profile) => profile.family === 'human').length,
);
assert.ok(
  profiles
    .filter((profile) => profile.family === 'human')
    .every((profile) =>
      board.items.some((boardItem) => boardItem.id.startsWith(`${profile.id}-front-headgear-`)),
    ),
);

const quarryWorker = CHARACTER_PRESENTATION_PROFILE.getProfile('quarry-worker');
assert.equal(quarryWorker.toolKind, 'quarry-drill');
assert.match(quarryWorker.material, /^#[0-9a-f]{6}$/i);
assert.deepEqual(quarryWorker.landmarks, [
  '분진 마스크와 귀마개',
  '적갈색 방진 작업복',
  '양손 착암 드릴',
]);
for (const view of CHARACTER_PRESENTATION_PROFILE.comparisonViews) {
  for (const landmarkSuffix of ['headgear-dust-mask', 'dust-jacket-yoke']) {
    assert.ok(
      board.items.some((boardItem) => boardItem.id === `quarry-worker-${view}-${landmarkSuffix}`),
      `채석공 ${view} silhouette에는 ${landmarkSuffix}가 필요합니다.`,
    );
  }
  assert.ok(
    board.items.some((boardItem) => boardItem.id === `quarry-worker-${view}-tool-quarry-drill-bit`),
    `채석공 ${view} silhouette에는 착암 드릴 bit가 필요합니다.`,
  );
}

const quarryBossProfile = CHARACTER_PRESENTATION_PROFILE.getProfile('quarry-rock-cutter-boss');
assert.equal(quarryBossProfile.toolKind, 'rock-cutting-machine');
assert.deepEqual(quarryBossProfile.landmarks, [
  '적갈색 중량 본체',
  '초대형 수직 절단날',
  '노출된 황동 가동 베어링',
]);
for (const view of CHARACTER_PRESENTATION_PROFILE.comparisonViews) {
  for (const landmarkSuffix of ['cutting-blade', 'blade-hub', 'outrigger']) {
    assert.ok(
      board.items.some(
        (boardItem) =>
          boardItem.id ===
          `quarry-rock-cutter-boss-${view}-tool-rock-cutting-machine-${landmarkSuffix}`,
      ),
      `암반 절단기 ${view} silhouette에는 ${landmarkSuffix}가 필요합니다.`,
    );
  }
}

const boardRoom = ACADEMY_VILLAGE_MAP.getRoom('academy-region', 'scrap-character-design-board');
assert.equal(boardRoom.presentationOnly, true);
assert.equal(boardRoom.characterBoardManifest.entries.length, profiles.length);
assert.ok(boardRoom.renderItems.every((item) => item.presentationOnly));

const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
scene.setVisualQaLocation({
  regionId: 'academy-region',
  roomId: 'scrap-character-design-board',
  x: 480,
});
const worldStatus = scene.getWorldStatus();
const renderFrame = scene.createRenderFrame(1);
assert.equal(worldStatus.characterBoard.active, true);
assert.equal(worldStatus.characterBoard.entries.length, profiles.length);
assert.equal(worldStatus.areaName, '고철 캐릭터 실루엣 비교 보드');
assert.match(worldStatus.objective, /정면·측면·대표 pose/);
assert.equal(renderFrame.map.activeRoomId, 'scrap-character-design-board');
assert.ok(renderFrame.items.some((item) => item.id === 'character-board-cell-regional-boss'));
assert.equal(
  renderFrame.items.some((item) => item.id === 'shield'),
  false,
);
assert.equal(
  renderFrame.items.some((item) => item.id === 'sword-blade'),
  false,
);

const gameplayScene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
const playerFrame = gameplayScene.createRenderFrame(1);
assert.equal(playerFrame.player.presentationProfileId, 'scrapyard-apprentice');
for (const itemId of [
  'tool-bag',
  'goggles-lenses',
  'workwear-repair-patch',
  'shield-sleeve-repair-bandage',
]) {
  assert.ok(
    playerFrame.items.some((item) => item.id === itemId),
    `실제 Player frame에는 ${itemId} landmark가 필요합니다.`,
  );
}
for (const obsoleteItemId of ['cape', 'scarf-tail', 'uniform-coat-tail', 'helmet']) {
  assert.equal(
    playerFrame.items.some((item) => item.id === obsoleteItemId),
    false,
    `실제 Player frame에 ${obsoleteItemId} fantasy fallback이 남으면 안 됩니다.`,
  );
}

for (const encounterProfile of Object.values(ENCOUNTER_PROFILES)) {
  const appearanceProfile = CHARACTER_PRESENTATION_PROFILE.getProfile(
    encounterProfile.presentationProfileId,
  );
  assert.ok(
    ['machine', 'human'].includes(appearanceProfile?.family),
    `${encounterProfile.id} encounter는 authored machine 또는 human appearance profile을 가져야 합니다.`,
  );
}
for (const [encounterId, profileId, regionId, roomId] of [
  ['mine-claim-jacker', 'mine-claim-jacker', 'abandoned-mine', 'abandoned-mine-rescue-tunnel'],
  [
    'dock-salvage-raider',
    'dock-salvage-raider',
    'harbor-shipyard',
    'harbor-shipyard-occupied-drydock',
  ],
  ['snow-route-raider', 'snow-route-raider', 'snow-trade-road', 'snow-trade-road-old-tunnel'],
]) {
  const humanEncounter = ENCOUNTER_PROFILES[encounterId];
  assert.equal(humanEncounter.presentationProfileId, profileId);
  assert.equal(humanEncounter.species, 'human-salvager');
  const humanScene = createTestGameScene({ mapDefinition: SCRAP_AWAKENING_MAP });
  humanScene.setVisualQaLocation({ regionId, roomId, x: 500 });
  const humanFrame = humanScene.createRenderFrame(1);
  assert.equal(humanFrame.combatEnemy.presentationProfileId, profileId);
  for (const landmarkId of [
    'combat-enemy-human-work-hood',
    'combat-enemy-human-salvage-vest',
    'combat-enemy-human-salvage-cutter',
  ]) {
    assert.ok(
      humanFrame.items.some((item) => item.id === landmarkId),
      `${encounterId}에는 ${landmarkId}가 필요합니다.`,
    );
  }
  const completion = humanScene.roomSceneNode.encounter.completeForVisualQa();
  assert.ok(['surrender', 'flee'].includes(completion.completionDisposition));
  assert.equal(
    completion.resolutionState,
    completion.completionDisposition === 'surrender' ? 'surrendered' : 'fleeing',
  );
  const resolvedFrame = humanScene.createRenderFrame(2);
  assert.equal(
    resolvedFrame.combatEnemy.resolutionState,
    completion.completionDisposition === 'surrender' ? 'surrendered' : 'fleeing',
  );
  assert.ok(
    resolvedFrame.items.some((item) => item.id === 'combat-enemy-resolution-fill'),
    `${encounterId} human resolution에는 비살상 status marker가 필요합니다.`,
  );
  const resolutionItem =
    completion.completionDisposition === 'surrender'
      ? 'combat-enemy-human-surrender-marker'
      : 'combat-enemy-human-flee-dust';
  assert.ok(
    resolvedFrame.items.some((item) => item.id === resolutionItem),
    `${encounterId} human resolution은 ${completion.completionDisposition} pose로 읽혀야 합니다.`,
  );
}
const quarryCollectorEncounter = ENCOUNTER_PROFILES['quarry-cut-collector'];
assert.equal(quarryCollectorEncounter.presentationProfileId, 'collector-unit');
assert.equal(quarryCollectorEncounter.role, 'field');
assert.equal(quarryCollectorEncounter.respawns, false);
const quarryBossEncounter = ENCOUNTER_PROFILES['quarry-rock-cutter-boss'];
assert.equal(quarryBossEncounter.presentationProfileId, 'quarry-rock-cutter-boss');
assert.equal(quarryBossEncounter.role, 'boss');
assert.ok(
  quarryBossEncounter.posture.maximum > ENCOUNTER_PROFILES['snowplow-train-boss'].posture.maximum,
);
assert.deepEqual(quarryBossEncounter.weakPoint.triggerAttackKinds, ['heavy']);
assert.equal(quarryBossEncounter.weakPoint.id, 'quarry-cutter-main-bearing');
gameplayScene.setVisualQaLocation({
  regionId: 'academy-region',
  roomId: 'training-room',
  x: 500,
});
const trainingFrame = gameplayScene.createRenderFrame(1);
assert.equal(trainingFrame.combatEnemy.presentationProfileId, 'collector-unit');
for (const itemId of [
  'combat-enemy-collector-eye',
  'combat-enemy-scrap-front-plate',
  'combat-enemy-scrap-cable',
  'combat-enemy-scrap-repair-mark',
]) {
  assert.ok(
    trainingFrame.items.some((item) => item.id === itemId),
    `실제 encounter frame에는 ${itemId} landmark가 필요합니다.`,
  );
}
assert.equal(
  trainingFrame.items.some((item) =>
    ['combat-enemy-training-mask', 'combat-enemy-glasswind-wing-back'].includes(item.id),
  ),
  false,
);
assert.ok(
  trainingFrame.items
    .filter((item) => item.id.startsWith('combat-enemy-scrap-'))
    .every((item) => item.presentationOnly === true),
);

for (const scenario of [
  {
    roomId: 'field-crossing',
    profileId: 'industrial-creature',
    landmarkId: 'combat-enemy-drill-maw',
  },
  {
    roomId: 'sealed-forest-boss',
    profileId: 'regional-boss',
    landmarkId: 'combat-enemy-conveyor-ram-plate',
  },
  {
    mapDefinition: SCRAP_AWAKENING_MAP,
    regionId: 'abandoned-mine',
    roomId: 'abandoned-mine-machine-yard',
    profileId: 'mine-collapse-boss',
    landmarkId: 'combat-enemy-conveyor-ram-plate',
  },
  {
    mapDefinition: SCRAP_AWAKENING_MAP,
    regionId: 'harbor-shipyard',
    roomId: 'harbor-shipyard-twin-crane-pier',
    profileId: 'shipyard-twin-crane-boss',
    landmarkId: 'combat-enemy-hydraulic-crane-boom',
  },
  {
    mapDefinition: SCRAP_AWAKENING_MAP,
    regionId: 'greenhouse-plains',
    roomId: 'greenhouse-plains-reactor-house',
    profileId: 'greenhouse-geothermal-boss',
    landmarkId: 'combat-enemy-geothermal-main-pipe',
  },
  {
    mapDefinition: SCRAP_AWAKENING_MAP,
    regionId: 'snow-trade-road',
    roomId: 'snow-trade-road-snowplow-siding',
    profileId: 'snowplow-train-boss',
    landmarkId: 'combat-enemy-snowplow-wedge',
  },
  {
    mapDefinition: SCRAP_AWAKENING_MAP,
    regionId: 'red-quarry',
    roomId: 'red-quarry-cutter-yard',
    profileId: 'quarry-rock-cutter-boss',
    landmarkId: 'combat-enemy-quarry-body-housing',
    landmarkIds: [
      'combat-enemy-quarry-pivot-arm',
      'combat-enemy-quarry-cutting-blade',
      'combat-enemy-quarry-drive-bearing',
    ],
  },
]) {
  const scenarioScene = createTestGameScene({
    mapDefinition: scenario.mapDefinition ?? ACADEMY_VILLAGE_MAP,
  });
  scenarioScene.setVisualQaLocation({
    regionId: scenario.regionId ?? 'academy-region',
    roomId: scenario.roomId,
    x: 500,
  });
  const scenarioFrame = scenarioScene.createRenderFrame(1);
  assert.equal(scenarioFrame.combatEnemy.presentationProfileId, scenario.profileId);
  assert.ok(
    scenarioFrame.items.some((item) => item.id === scenario.landmarkId),
    `${scenario.profileId} 실제 encounter에는 ${scenario.landmarkId}가 필요합니다.`,
  );
  for (const landmarkId of scenario.landmarkIds ?? []) {
    const landmark = scenarioFrame.items.find((item) => item.id === landmarkId);
    assert.ok(landmark, `${scenario.profileId} 실제 encounter에는 ${landmarkId}가 필요합니다.`);
    assert.equal(landmark.presentationOnly, true);
  }
}

for (const renderer of ['polygon', 'retro']) {
  const request = readVisualQaRequest(
    `?visualQa=1&gameStart=scrap-character-board&visualQaRenderer=${renderer}&visualQaPhase=active&gameFrame=0`,
  );
  assert.equal(request.start, 'scrap-character-board');
  assert.equal(request.renderer, renderer);
  assert.ok(request.scenario.expectation.expectedItems.length >= profiles.length);
}

const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(indexSource, /class="mobile-controls"\s+x-show="!characterBoard\.active"/);

process.stdout.write(
  `${JSON.stringify({
    status: 'PASS',
    probe: 'scrap-character-readability-board',
    profiles: requiredRoleIds,
    views: CHARACTER_PRESENTATION_PROFILE.comparisonViews,
    checks: [
      'immutable-character-presentation-profile',
      'protagonist-owner-rival-five-job-families-and-human-machine-boss-enemy-spectrum',
      'front-side-representative-pose-at-gameplay-scale',
      'tool-outfit-and-material-landmarks',
      'eight-human-tool-geometries-and-headgear-are-shape-distinct',
      'presentation-only-room-with-no-academy-player-fallback',
      'presentation-room-hides-touch-controls-and-academy-context',
      'polygon-retro-stable-visual-qa-scenario',
      'semantic-board-manifest',
      'composition-injected-player-and-encounter-profile-ids',
      'actual-gameplay-scrap-landmarks-without-fantasy-fallback',
      'shipyard-worker-and-twin-crane-boss-distinct-job-machine-silhouettes',
      'greenhouse-technician-and-geothermal-boss-distinct-job-machine-silhouettes',
      'snow-train-crew-and-snowplow-boss-distinct-job-machine-silhouettes',
      'quarry-worker-drill-dust-gear-and-rust-workwear-silhouette',
      'quarry-rock-cutter-body-blade-moving-part-and-heavy-weak-point-contract',
      'renderer-read-only-presentation-items-and-combat-geometry-preserved',
    ],
  })}\n`,
);
