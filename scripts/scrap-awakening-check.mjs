import assert from 'node:assert/strict';

import { SCRAP_AWAKENING_STAGE } from '../src/game/campaign/ScrapAwakeningState.js';
import {
  SCRAP_AWAKENING_MAP,
  SCRAP_AWAKENING_REGION_ID,
  SCRAP_AWAKENING_ROOM_ID,
} from '../src/game/maps/scrapAwakening.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
import { MobileInputAdapter } from '../src/input/MobileInputAdapter.js';

const STEP_SECONDS = 1 / 120;
const EMPTY_INPUT = Object.freeze({
  left: false,
  right: false,
  jump: false,
  guard: false,
  basicAttack: false,
  strongAttack: false,
  jumpSequence: 0,
  guardSequence: 0,
  basicAttackSequence: 0,
  strongAttackSequence: 0,
});

function input(overrides = {}) {
  return Object.freeze({ ...EMPTY_INPUT, ...overrides });
}

function createAwakeningScene({ progressionSnapshot = null, x = 740 } = {}) {
  const scene = createTestGameScene({
    mapDefinition: SCRAP_AWAKENING_MAP,
    ...(progressionSnapshot ? { progressionSnapshot } : {}),
  });
  scene.setVisualQaLocation({
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x,
  });
  return scene;
}

function itemIds(scene) {
  return scene.createRenderFrame(0).items.map((item) => item.id);
}

function stage(scene) {
  return scene.getWorldStatus().campaign.awakeningStageId;
}

const scene = createAwakeningScene();
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.COMMISSION);
assert.equal(scene.getWorldStatus().operationMapAvailable, false);
assert.ok(itemIds(scene).includes('scrap-device-core'));
assert.ok(!itemIds(scene).includes('scrap-king-eye-left'));
const beforeInteraction = Object.freeze({ ...scene.position });

scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
assert.equal(stage(scene), SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.deepEqual(
  scene.position,
  beforeInteraction,
  '제어장치 상호작용은 Player jump를 억제해야 합니다.',
);
assert.equal(scene.isGrounded, true);
assert.ok(!itemIds(scene).includes('scrap-device-core'));
assert.ok(
  scene.mapRuntime.getResolvedSnapshot().appliedPatchIds.includes('scrap-device-recovered'),
);

const afterRecovery = scene.getProgressionSnapshot();
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
assert.deepEqual(
  scene.getProgressionSnapshot(),
  afterRecovery,
  '같은 jump sequence는 제어장치 회수나 stage를 반복 확정하면 안 됩니다.',
);

const lockedX = scene.position.x;
for (let tick = 0; tick < 45; tick += 1) {
  scene.update(
    STEP_SECONDS,
    input({
      right: true,
      basicAttack: true,
      basicAttackSequence: 1,
    }),
  );
}
assert.equal(scene.position.x, lockedX, '각성 연출 중 이동 입력은 잠겨야 합니다.');
assert.equal(scene.combatCommands.snapshot().id, 'idle', '각성 연출 중 공격은 시작되면 안 됩니다.');
assert.ok(scene.cameraPosition.x > lockedX, '각성 연출 camera는 폐병기 쪽으로 이동해야 합니다.');

const observedStages = [stage(scene)];
let shakeObserved = false;
for (let tick = 0; tick < 1_200 && stage(scene) !== SCRAP_AWAKENING_STAGE.COMPLETE; tick += 1) {
  scene.update(STEP_SECONDS, EMPTY_INPUT);
  const currentStage = stage(scene);
  if (observedStages.at(-1) !== currentStage) observedStages.push(currentStage);
  const cameraOffset = scene.combatCameraFeedback.snapshot();
  if (Math.abs(cameraOffset.x) > 0.01 || Math.abs(cameraOffset.y) > 0.01) shakeObserved = true;
}
assert.deepEqual(observedStages, [
  SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
  SCRAP_AWAKENING_STAGE.EYES_LIT,
  SCRAP_AWAKENING_STAGE.ASSEMBLED,
  SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
  SCRAP_AWAKENING_STAGE.COMPLETE,
]);
assert.equal(shakeObserved, true, '눈 점등·부품 결합 경계는 camera shake를 남겨야 합니다.');
const completeStatus = scene.getWorldStatus();
assert.equal(completeStatus.campaign.deadlineRevealed, true);
assert.equal(completeStatus.campaign.hudLabel, 'Day 1 · 아침 · D-30');
assert.equal(completeStatus.journeyLabel, '각성 완료 · D-30');
assert.match(completeStatus.objective, /조작 복귀/);
assert.ok(itemIds(scene).includes('scrap-king-eye-left'));
assert.ok(itemIds(scene).includes('scrap-king-shoulder-left'));
assert.ok(itemIds(scene).includes('scrap-king-route-beacon'));

const completeX = scene.position.x;
scene.update(STEP_SECONDS, input({ right: true }));
assert.ok(scene.position.x > completeX, '각성 완료 뒤 이동 조작이 돌아와야 합니다.');

const resumed = createAwakeningScene({ progressionSnapshot: afterRecovery });
assert.equal(stage(resumed), SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.ok(!itemIds(resumed).includes('scrap-device-core'));
for (let tick = 0; tick < 120; tick += 1) resumed.update(STEP_SECONDS, EMPTY_INPUT);
assert.notEqual(
  stage(resumed),
  SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
  '저장된 stage는 reload 뒤 해당 경계부터 결정적으로 재생되어야 합니다.',
);

const completedReload = createAwakeningScene({
  progressionSnapshot: scene.getProgressionSnapshot(),
});
assert.equal(stage(completedReload), SCRAP_AWAKENING_STAGE.COMPLETE);
assert.ok(
  !completedReload.mapRuntime
    .getResolvedSnapshot()
    .entities.some((entity) => entity.id === 'scrap-control-device'),
  '완료 reload 뒤 제어장치 trigger가 다시 생기면 안 됩니다.',
);
completedReload.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
assert.equal(stage(completedReload), SCRAP_AWAKENING_STAGE.COMPLETE);
assert.equal(completedReload.isGrounded, false, '완료 뒤 ↑는 다시 Player jump여야 합니다.');

const keyboardScene = createAwakeningScene();
const keyboard = new KeyboardInputAdapter({ isActive: () => true });
keyboard.onKeyDown({ code: 'ArrowUp', target: { closest: () => null }, preventDefault() {} });
keyboardScene.update(STEP_SECONDS, keyboard.snapshot());
const mobileScene = createAwakeningScene();
const mobile = new MobileInputAdapter();
mobile.press('jump', 17);
mobileScene.update(STEP_SECONDS, mobile.snapshot());
assert.equal(stage(keyboardScene), SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.equal(stage(mobileScene), SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
assert.deepEqual(
  {
    keyboardStage: stage(keyboardScene),
    keyboardGrounded: keyboardScene.isGrounded,
    mobileStage: stage(mobileScene),
    mobileGrounded: mobileScene.isGrounded,
  },
  {
    keyboardStage: SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
    keyboardGrounded: true,
    mobileStage: SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
    mobileGrounded: true,
  },
  'keyboard와 touch jump는 같은 회수 결과와 jump suppression을 만들어야 합니다.',
);

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'scrap-awakening-runtime',
    checks: [
      'device-proximity-jump-consumption',
      'stage-patch-and-repeat-trigger-idempotence',
      'input-lock-and-camera-cue',
      'eye-assembly-shake-d30-sequence',
      'control-restored-after-complete',
      'stage-boundary-reload-resume',
      'completed-reload-no-retrigger',
      'keyboard-touch-interaction-parity',
    ],
  }),
);
