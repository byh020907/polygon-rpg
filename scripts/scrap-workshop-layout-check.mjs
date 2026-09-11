import assert from 'node:assert/strict';
import { createGameScene } from '../src/app/createGameScene.js';
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
for (const id of ['scrapyard-wall-map-frame', 'garage-robot-frame-torso']) {
  const fixture = bounds(id);
  assert.ok(fixture.top > roof.bottom);
  assert.ok(fixture.left > wall.left && fixture.right < wall.right);
}
assert.ok(bounds('scrapyard-wall-map-frame').right < bounds('garage-robot-frame-torso').left);
assert.ok(bounds('garage-robot-frame-leg-left').bottom > room.groundY - 6);
assert.ok(bounds('garage-robot-frame-leg-right').bottom > room.groundY - 6);
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
scene.dispose();
console.log('PASS: grounded workshop, garage, robot and map composition');
