import assert from 'node:assert/strict';
import { CHARACTER_PRESENTATION_PROFILE } from '../src/game/character/CharacterPresentationProfiles.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
import { PROLOGUE_UNDERGROUND_ROOM_IDS } from '../src/game/maps/PrologueUndergroundMap.js';
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

const gameplayScene = createTestGameScene({ mapDefinition: SCRAP_AWAKENING_MAP });
const playerFrame = gameplayScene.createRenderFrame(1);
assert.equal(playerFrame.player.presentationProfileId, 'scrapyard-apprentice');
const playerSilhouetteItems = playerFrame.items.filter(
  (item) =>
    item.renderOrder === 30.5 &&
    !item.id.startsWith('sword-') &&
    item.id !== 'shadow' &&
    Array.isArray(item.points),
);
const playerSilhouetteY = playerSilhouetteItems.flatMap((item) =>
  item.points.map((point) => point.y),
);
const playerSilhouetteHeight = Math.max(...playerSilhouetteY) - Math.min(...playerSilhouetteY);
assert.ok(
  playerSilhouetteHeight >= 540 * 0.18 && playerSilhouetteHeight <= 540 * 0.22,
  `Player body/equipment silhouette must occupy 18–22% of the gameplay viewport, received ${playerSilhouetteHeight / 540}`,
);
const headY = playerFrame.items.find(({ id }) => id === 'head').points.map(({ y }) => y);
const headHeight = Math.max(...headY) - Math.min(...headY);
const headCount = playerSilhouetteHeight / headHeight;
assert.ok(
  headCount >= 6 && headCount <= 8,
  'slim protagonist must read as roughly seven heads tall, received ' + headCount,
);
for (const itemId of [
  'tool-bag',
  'work-collar',
  'cross-body-strap',
  'scrapyard-apprentice:apprentice-workshorts-shape',
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
  humanScene.setVisualQaScrapRegionState({
    regionId,
    stageKind: 'facility-observed',
    status: 'in-progress',
  });
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
gameplayScene.setVisualQaScrapAwakeningStage('yard-clearance');
gameplayScene.setVisualQaLocation({
  regionId: 'scrap-waste-edge',
  roomId: PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
  x: 400,
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
    mapDefinition: scenario.mapDefinition ?? SCRAP_AWAKENING_MAP,
  });
  scenarioScene.setVisualQaScrapRegionState({
    regionId: scenario.regionId,
    stageKind: 'journey-combat',
    status: 'in-progress',
  });
  scenarioScene.setVisualQaLocation({
    regionId: scenario.regionId,
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

process.stdout.write(
  `${JSON.stringify({
    status: 'PASS',
    probe: 'scrap-character-production-readability',
    profiles: requiredRoleIds,
    views: CHARACTER_PRESENTATION_PROFILE.comparisonViews,
    checks: [
      'immutable-character-presentation-profile',
      'protagonist-owner-rival-five-job-families-and-human-machine-boss-enemy-spectrum',
      'tool-outfit-and-material-landmarks',
      'composition-injected-player-and-encounter-profile-ids',
      'actual-gameplay-scrap-landmarks-without-fantasy-fallback',
      'shipyard-worker-and-twin-crane-boss-distinct-job-machine-silhouettes',
      'greenhouse-technician-and-geothermal-boss-distinct-job-machine-silhouettes',
      'snow-train-crew-and-snowplow-boss-distinct-job-machine-silhouettes',
      'quarry-rock-cutter-body-blade-moving-part-and-heavy-weak-point-contract',
      'renderer-read-only-presentation-items-and-combat-geometry-preserved',
    ],
  })}\n`,
);
