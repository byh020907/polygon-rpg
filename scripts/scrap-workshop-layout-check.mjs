import assert from 'node:assert/strict';
import { createGameScene } from '../src/app/createGameScene.js';
import { SceneCompositionPresenter } from '../src/graphics/scene/SceneCompositionPresenter.js';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';

const room = SCRAP_AWAKENING_MAP.regions[0].rooms[0];
const bounds = (id) => {
  const points = room.renderItems.find((item) => item.id === id).points;
  return {
    left: Math.min(...points.map((point) => point.x)),
    right: Math.max(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    bottom: Math.max(...points.map((point) => point.y)),
  };
};
const wall = bounds('scrapyard-workshop-wall');
const roof = bounds('scrapyard-workshop-roof');
assert.equal(wall.bottom, room.groundY);
assert.ok(roof.left < wall.left && roof.right > wall.right);
assert.ok(roof.top < wall.top && roof.bottom >= wall.top);
for (const id of ['scrapyard-garage-door-left', 'scrapyard-garage-door-right']) {
  const door = bounds(id);
  assert.equal(door.bottom, room.groundY);
  assert.ok(door.left > wall.left && door.right < wall.right);
}
for (const id of ['scrapyard-wall-map-frame']) {
  const fixture = bounds(id);
  assert.ok(fixture.top > roof.bottom);
  assert.ok(fixture.left > wall.left && fixture.right < wall.right);
}
const garageLegacyIds = [
  'garage-robot-frame-torso',
  'garage-robot-frame-leg-left',
  'garage-robot-frame-leg-right',
  'garage-robot-brain-core',
  'garage-robot-zero-label',
];
for (const id of garageLegacyIds)
  assert.ok(
    room.renderItems.some((item) => item.id === id),
    `${id} remains available only as a migration binding for the production garage SVG`,
  );
// The owner is now sampled by the same body/pose/depth path as gameplay characters,
// while the authored workbench remains a map fixture.
assert.equal(
  room.renderItems.some((item) => item.id.startsWith('scrapyard-owner-')),
  false,
);
const scene = createGameScene();
const frame = scene.createRenderFrame(1);
const ownerTorso = frame.items.find((item) => item.id === 'cast-scrapyard-owner:torso');
assert.ok(ownerTorso);
const ownerBounds = {
  left: Math.min(...ownerTorso.points.map((point) => point.x)),
  right: Math.max(...ownerTorso.points.map((point) => point.x)),
};
assert.ok(ownerBounds.left > wall.left && ownerBounds.right < wall.right);
assert.deepEqual(
  frame.castCharacters.map(({ entityId, bodyProfileId }) => ({ entityId, bodyProfileId })),
  [{ entityId: 'cast-scrapyard-owner', bodyProfileId: 'owner' }],
);
assert.equal(bounds('scrapyard-workbench').left, 74);

scene.setVisualQaScrapGarageRevealStage('complete');
scene.setVisualQaLocation({
  regionId: 'scrap-waste-edge',
  roomId: 'abandoned-weapon-yard',
  x: 300,
});
const productionFrame = scene.createRenderFrame(1);
const presented = new SceneCompositionPresenter().resolve(productionFrame, {
  viewport: { width: 1440, height: 540 },
  project: (point) => point,
});
const garageItems = presented.frame.items.filter(
  (item) => item.worldObjectId === 'world-garage-zero',
);
assert.ok(garageItems.length > 0, 'workshop layout must use the presented production garage SVG');
const garageBounds = {
  left: Math.min(...garageItems.flatMap((item) => item.points.map((point) => point.x))),
  right: Math.max(...garageItems.flatMap((item) => item.points.map((point) => point.x))),
  top: Math.min(...garageItems.flatMap((item) => item.points.map((point) => point.y))),
  bottom: Math.max(...garageItems.flatMap((item) => item.points.map((point) => point.y))),
};
assert.equal(garageBounds.bottom, room.groundY);
assert.ok(garageBounds.top < roof.bottom);
assert.ok(bounds('scrapyard-wall-map-frame').right < garageBounds.left);
for (const id of garageLegacyIds)
  assert.equal(
    presented.frame.items.some((item) => item.id === id),
    false,
    `${id} must not be treated as the final garage artwork in the production frame`,
  );
assert.ok(
  presented.frame.items.some((item) => item.id === 'scrapyard-wall-map-route'),
  'operation map remains alongside the production garage frame',
);
scene.dispose();
console.log('PASS: grounded workshop, presented REF-04 garage SVG, robot and map composition');
