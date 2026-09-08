import assert from 'node:assert/strict';
import { createGameScene } from '../src/app/createGameScene.js';

const STEP = 1 / 120;
const EMPTY_INPUT = {
  left: false,
  right: false,
  jump: false,
  guard: false,
  basicAttack: false,
  strongAttack: false,
  jumpSequence: 0,
  basicAttackSequence: 0,
  strongAttackSequence: 0,
};
const ROAD_ID = 'scrapyard-abandoned-mine-road';
const SOURCE_ROOM = 'abandoned-weapon-yard';
const DESTINATION_ROOM = 'abandoned-mine-roadhead';

function prepareScene() {
  const scene = createGameScene();
  scene.enterTree();
  scene.setVisualQaScrapGarageRevealStage('complete');
  const portal = scene.mapRuntime.getPortal(ROAD_ID);
  scene.position = {
    x: portal.from.anchor.x,
    y: scene.mapRuntime.getGroundYAt(portal.from.anchor.x) - 82,
  };
  scene.previousPosition = { ...scene.position };
  return scene;
}

function travel(scene, sequence) {
  const held = {
    ...EMPTY_INPUT,
    jump: true,
    jumpSequence: sequence,
    strongAttack: true,
    strongAttackSequence: sequence,
  };
  scene.update(STEP, held);
  assert.equal(scene.getPendingScrapCampaignAction()?.portalId, ROAD_ID);
  assert.equal(scene.confirmScrapCampaignTravel().started, true);
  assert.ok(scene.mapRuntime.getTransition());
  for (let tick = 0; tick < 120 && scene.mapRuntime.getTransition(); tick += 1)
    scene.update(STEP, held);
  return held;
}

for (const fault of ['activation', 'source-exit', 'source-dispose']) {
  const scene = prepareScene();
  try {
    const source = scene.roomSceneNode;
    const before = scene.getProgressionSnapshot();
    const position = { ...scene.position };
    let failOnce = true;
    if (fault === 'activation') {
      const original = scene.addChild.bind(scene);
      scene.addChild = (child) => {
        if (failOnce && child.name === `Room:${DESTINATION_ROOM}`) {
          failOnce = false;
          throw new Error('injected destination activation failure');
        }
        return original(child);
      };
    } else {
      const method = fault === 'source-exit' ? 'onExitTree' : 'dispose';
      const original = source[method].bind(source);
      source[method] = () => {
        const result = original();
        if (failOnce) {
          failOnce = false;
          throw new Error(`injected ${fault} failure`);
        }
        return result;
      };
    }
    const held = travel(scene, 1);
    assert.equal(failOnce, false, `${fault} must reach the production failure boundary`);
    assert.equal(scene.mapRuntime.getActiveLocation().roomId, SOURCE_ROOM);
    assert.deepEqual(scene.position, position);
    assert.deepEqual(
      scene.getProgressionSnapshot(),
      before,
      'failed travel cannot charge campaign time or mutate rewards',
    );
    assert.equal(scene.roomSceneNode.parent, scene);
    assert.equal(scene.roomSceneNode.isInsideTree, true);
    assert.equal(scene.roomSceneNode.isDisposed, false);
    assert.ok(scene.children.includes(scene.roomSceneNode));
    if (fault === 'activation') assert.equal(scene.roomSceneNode, source);
    else {
      assert.notEqual(scene.roomSceneNode, source);
      assert.equal(source.isDisposed, true);
    }
    assert.match(scene.getWorldStatus().encounterHint, /전환 실패.*복구/);
    const stamina = scene.combatCommands.snapshot().stamina;
    scene.update(STEP, held);
    assert.equal(scene.combatCommands.snapshot().id, 'idle');
    assert.equal(
      scene.combatCommands.snapshot().stamina,
      stamina,
      'stale failed-transition input must not replay',
    );
    scene.update(STEP, { ...EMPTY_INPUT, jumpSequence: 1, strongAttackSequence: 1 });
    travel(scene, 2);
    assert.equal(scene.mapRuntime.getActiveLocation().roomId, DESTINATION_ROOM);
    assert.equal(
      scene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
      before.scrapCampaign.elapsedSegments + 1,
    );
  } finally {
    scene.dispose();
  }
}

const clockScene = createGameScene();
const beforeClock = clockScene.getProgressionSnapshot();
clockScene.setVisualQaTimePhase('night');
assert.equal(clockScene.getWorldStatus().timePhase, 'night');
assert.deepEqual(
  clockScene.getProgressionSnapshot(),
  beforeClock,
  'review light selection must not mutate the campaign clock',
);
clockScene.reset();
assert.equal(clockScene.getWorldStatus().timePhase, 'day');
assert.equal('worldTimeSnapshot' in clockScene, false);
assert.equal('journeyProgress' in clockScene, false);
assert.equal('regionExpansionProgress' in clockScene, false);
clockScene.dispose();

console.log(
  JSON.stringify({
    status: 'PASS',
    checks: [
      'activation-rollback',
      'source-exit-rollback',
      'source-dispose-rollback',
      'stale-input-fence',
      'retry-single-campaign-charge',
      'review-light-does-not-write-clock',
      'single-campaign-owner',
    ],
  }),
);
