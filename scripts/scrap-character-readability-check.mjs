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
assert.equal(profiles.length, 12);
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
  'mine-worker',
  'shipyard-worker',
  'greenhouse-technician',
  'snow-train-crew',
  'quarry-worker',
  'collector-unit',
  'industrial-creature',
  'regional-boss',
  'mine-collapse-boss',
  'shipyard-twin-crane-boss',
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
assert.equal(new Set(humanToolShapes.map((tool) => normalizeShape(tool.points))).size, 7);
assert.ok(
  profiles
    .filter((profile) => profile.family === 'human')
    .every((profile) =>
      board.items.some((boardItem) => boardItem.id.startsWith(`${profile.id}-front-headgear-`)),
    ),
);

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
    appearanceProfile?.family === 'machine',
    `${encounterProfile.id} encounter는 authored machine appearance profile을 가져야 합니다.`,
  );
}
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
      'protagonist-owner-five-job-families-and-three-enemy-families',
      'front-side-representative-pose-at-gameplay-scale',
      'tool-outfit-and-material-landmarks',
      'seven-human-tool-geometries-and-headgear-are-shape-distinct',
      'presentation-only-room-with-no-academy-player-fallback',
      'presentation-room-hides-touch-controls-and-academy-context',
      'polygon-retro-stable-visual-qa-scenario',
      'semantic-board-manifest',
      'composition-injected-player-and-encounter-profile-ids',
      'actual-gameplay-scrap-landmarks-without-fantasy-fallback',
      'shipyard-worker-and-twin-crane-boss-distinct-job-machine-silhouettes',
      'renderer-read-only-presentation-items-and-combat-geometry-preserved',
    ],
  })}\n`,
);
