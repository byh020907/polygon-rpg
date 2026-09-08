import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dialogueSafeBounds, projectDialogue } from '../src/app/DialoguePresentation.js';
import { createGameScene } from '../src/app/createGameScene.js';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
import { MobileInputAdapter } from '../src/input/MobileInputAdapter.js';
import { QaInputAdapter } from '../src/input/QaInputAdapter.js';

const STEP_SECONDS = 1 / 120;
const EMPTY_INPUT = Object.freeze({
  left: false,
  right: false,
  jump: false,
  guard: false,
  basicAttack: false,
  strongAttack: false,
  jumpSequence: 0,
  basicAttackSequence: 0,
  strongAttackSequence: 0,
});
const input = (overrides = {}) => ({ ...EMPTY_INPUT, ...overrides });
function sceneAt(x) {
  const scene = createGameScene();
  scene.setVisualQaLocation({ regionId: 'scrap-waste-edge', roomId: 'abandoned-weapon-yard', x });
  return scene;
}

const scene = sceneAt(198);
assert.equal(scene.getWorldStatus().dialogue.interactionId, 'scrapyard-owner-commission');
assert.equal(scene.getWorldStatus().dialogue.active, false);
const originalY = scene.position.y;
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
let dialogue = scene.getWorldStatus().dialogue;
assert.equal(dialogue.active, true);
assert.equal(dialogue.lineIndex, 0);
assert.equal(scene.position.y, originalY, 'dialogue start must consume the jump before physics');
assert.equal(scene.verticalVelocity, 0);
assert.ok(Object.isFrozen(dialogue));
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
assert.equal(scene.getWorldStatus().dialogue.lineIndex, 0, 'held sequence must not skip lines');
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 2 }));
dialogue = scene.getWorldStatus().dialogue;
assert.equal(dialogue.lineIndex, 0, 'typewriter reveal is completed before advancing');
assert.equal(dialogue.canAdvance, true);
scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 3 }));
assert.equal(scene.getWorldStatus().dialogue.lineIndex, 1);
let sequence = 4;
for (; sequence < 15 && scene.getWorldStatus().dialogue.active; sequence += 1)
  scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: sequence }));
assert.equal(scene.getWorldStatus().dialogue.active, false);
assert.equal(scene.getWorldStatus().campaign.awakeningStageId, 'rival-departure');
assert.equal(
  scene.getProgressionSnapshot().viewedConversationIds.includes('scrap-prologue:owner-commission'),
  true,
);
assert.equal(
  scene.getProgressionSnapshot().scrapCampaign.elapsedSegments,
  0,
  'story is free campaign time',
);
scene.dispose();

const far = sceneAt(1200);
assert.equal(far.getWorldStatus().dialogue.available, false);
far.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
assert.equal(far.isGrounded, false, 'outside interaction range the same command must jump');
far.dispose();

const stale = sceneAt(198);
stale.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
// A production campaign patch removes the current owner target while its bubble is active.
stale.setVisualQaScrapAwakeningStage('rival-departure');
const staleY = stale.position.y;
stale.update(STEP_SECONDS, input({ jump: true, jumpSequence: 2 }));
assert.equal(stale.getWorldStatus().dialogue.active, false);
assert.equal(stale.position.y, staleY, 'stale target cleanup consumes one input');
stale.update(STEP_SECONDS, input({ jump: true, jumpSequence: 3 }));
assert.equal(stale.isGrounded, false);
stale.dispose();

const keyboard = new KeyboardInputAdapter({ target: null, documentTarget: null });
keyboard.onKeyDown({ code: 'ArrowUp', preventDefault() {} });
const mobile = new MobileInputAdapter();
mobile.press('jump', 7);
const keyboardScene = sceneAt(198),
  mobileScene = sceneAt(198);
keyboardScene.update(STEP_SECONDS, keyboard.snapshot());
mobileScene.update(STEP_SECONDS, mobile.snapshot());
assert.deepEqual(keyboardScene.getWorldStatus().dialogue, mobileScene.getWorldStatus().dialogue);
assert.deepEqual(keyboardScene.position, mobileScene.position);
keyboardScene.dispose();
mobileScene.dispose();

function verifyDialoguePresentationSafeBounds() {
  const frame = Object.freeze({ cameraOffset: Object.freeze({ x: 0, y: 0 }) });
  const cameraWorldSize = Object.freeze({ width: 960, height: 540 });
  const activeDialogue = Object.freeze({
    active: true,
    available: true,
    worldAnchor: Object.freeze({ x: -200, y: -200 }),
  });
  const availableDialogue = Object.freeze({
    active: false,
    available: true,
    worldAnchor: Object.freeze({ x: 1_500, y: -200 }),
  });
  const viewport = Object.freeze({ cssWidth: 320, cssHeight: 180 });
  const activeBounds = dialogueSafeBounds(activeDialogue, viewport);
  const active = projectDialogue(activeDialogue, frame, viewport, cameraWorldSize);
  assert.equal(active.screenAnchor.x, activeBounds.minX);
  assert.equal(active.screenAnchor.y, activeBounds.minY);
  assert.ok(active.screenAnchor.x >= 18 && active.screenAnchor.x <= 302);
  assert.ok(active.screenAnchor.y >= 18 && active.screenAnchor.y <= 162);

  const available = projectDialogue(availableDialogue, frame, viewport, cameraWorldSize);
  assert.equal(
    available.screenAnchor,
    undefined,
    '대화를 시작하지 않은 available interaction은 bubble geometry를 만들면 안 된다.',
  );

  const mobileLandscapeViewport = Object.freeze({ cssWidth: 844, cssHeight: 390 });
  const bottomExtreme = projectDialogue(
    Object.freeze({
      ...activeDialogue,
      worldAnchor: Object.freeze({ x: 480, y: 2_000 }),
    }),
    frame,
    mobileLandscapeViewport,
    cameraWorldSize,
  );
  assert.equal(dialogueSafeBounds(activeDialogue, mobileLandscapeViewport).maxY, 280);
  assert.ok(
    bottomExtreme.screenAnchor.y <= 280,
    'mobile controls 위 safe inset을 침범하면 안 된다.',
  );

  const centered = projectDialogue(
    Object.freeze({
      ...activeDialogue,
      worldAnchor: Object.freeze({ x: 480, y: 270 }),
    }),
    frame,
    Object.freeze({ cssWidth: 1_440, cssHeight: 810 }),
    cameraWorldSize,
  );
  assert.deepEqual(centered.screenAnchor, { x: 720, y: 405 });
}

function verifyDialogueBubbleActiveLifetime() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(html, /<template x-if="dialogue\.active">\s+<section\s+class="dialogue-bubble"/);
  assert.doesNotMatch(
    html,
    /class="dialogue-bubble"\s+x-show=/,
    'available-only interaction이 bubble을 표시하면 안 된다.',
  );
  assert.doesNotMatch(
    styles,
    /dialogue-bubble\[data-dialogue-active='false'\]/,
    'inactive bubble presentation style을 남기면 안 된다.',
  );
}

function verifyQaDialoguePulse() {
  const qa = new QaInputAdapter({ enabled: true, target: null, documentTarget: null });
  assert.equal(qa.pulse('jump'), true);
  assert.equal(qa.snapshot().jump, false, 'QA 단발 입력은 held 상태를 남기면 안 된다.');
  assert.equal(qa.snapshot().jumpSequence, 1);
  assert.equal(qa.pulse('jump'), true);
  assert.equal(qa.snapshot().jumpSequence, 2, '연속 대화는 매 클릭마다 새 sequence여야 한다.');
  assert.equal(
    qa.pulse('left'),
    false,
    '연속 sequence가 없는 이동은 QA 단발 입력으로 만들지 않는다.',
  );
}

verifyDialoguePresentationSafeBounds();
verifyDialogueBubbleActiveLifetime();
verifyQaDialoguePulse();
console.log(
  JSON.stringify({
    status: 'PASS',
    checks: [
      'current-owner-interaction',
      'range-and-jump-authority',
      'typewriter-reveal-before-advance',
      'held-sequence-single-consumption',
      'immutable-dialogue',
      'campaign-stage-and-transcript',
      'free-story-clock',
      'stale-target-fence',
      'keyboard-touch-parity',
      'desktop-mobile-safe-bounds',
      'active-bubble-lifetime',
      'qa-pulse',
    ],
  }),
);
