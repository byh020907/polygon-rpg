import assert from 'node:assert/strict';
import { createGameScene } from '../src/app/createGameScene.js';

for (const [prefix, regionId] of [
  ['mine', 'abandoned-mine'],
  ['shipyard', 'harbor-shipyard'],
  ['greenhouse', 'greenhouse-plains'],
  ['snow', 'snow-trade-road'],
  ['quarry', 'red-quarry'],
]) {
  const scene = createGameScene();
  try {
    scene.enterTree();
    scene.setVisualQaScrapGarageRevealStage('complete');
    scene.setVisualQaLocation({ regionId, roomId: `${regionId}-roadhead`, x: 1090 });
    for (const [status, stageKind, visible] of [
      ['available', 'npc-briefing', true],
      ['in-progress', 'facility-observed', true],
      ['resolved', 'campaign-updated', false],
      ['available', 'npc-briefing', true],
    ]) {
      scene.setVisualQaScrapRegionState({ regionId, status, stageKind });
      const frame = scene.createRenderFrame(1);
      const rivals = frame.castCharacters.filter((actor) => actor.actorId === 'rival-scout');
      assert.equal(
        rivals.length,
        Number(visible),
        `${regionId}/${status}: single conditional rival`,
      );
      const interaction = scene.mapRuntime
        .getResolvedSnapshot()
        .entities.find((entity) => entity.id === `${prefix}-rival-scout`);
      assert.equal(Boolean(interaction), visible, 'story interaction and cast visibility agree');
      if (visible) {
        assert.equal(interaction.kind, 'story-interaction');
        assert.ok(interaction.lines.length > 0);
        assert.equal(rivals[0].entityId, `${prefix}-rival-scout-cast`);
        assert.equal(rivals[0].bodyProfileId, 'rival');
        assert.equal(rivals[0].dialogueAnchor.x, 1090);
        const geometry = frame.items.filter((item) =>
          item.id.startsWith(`${prefix}-rival-scout-cast:`),
        );
        assert.ok(geometry.length > 10, 'compiled SVG parts reach actual GameScene render');
        assert.ok(
          geometry.every((item) =>
            item.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
          ),
        );
      }
      assert.ok(
        !frame.items.some((item) =>
          /^(mine|shipyard|greenhouse|snow|quarry)-rival-scout-(torso|head|hook|band)$/.test(
            item.id,
          ),
        ),
      );
    }
  } finally {
    scene.dispose();
  }
}
console.log(
  'REF-01 regional rival: five regions, conditional presence, story parity and finite SVG render PASS',
);
