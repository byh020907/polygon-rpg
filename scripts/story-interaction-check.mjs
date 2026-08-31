import assert from 'node:assert/strict';

import { GameScene } from '../src/game/GameScene.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
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
  basicAttackSequence: 0,
  strongAttackSequence: 0,
});

function input(overrides = {}) {
  return Object.freeze({ ...EMPTY_INPUT, ...overrides });
}

function createAcademyScene(x) {
  const scene = new GameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
  scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'academy-plaza', x });
  return scene;
}

function jump(scene, sequence) {
  const before = Object.freeze({
    y: scene.position.y,
    verticalVelocity: scene.verticalVelocity,
    isGrounded: scene.isGrounded,
  });
  scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: sequence }));
  return Object.freeze({ before, after: scene.getWorldStatus().dialogue });
}

function assertJumpSuppressed(scene, before, label) {
  assert.equal(scene.position.y, before.y, `${label}: Player y는 변하지 않아야 한다.`);
  assert.equal(
    scene.verticalVelocity,
    before.verticalVelocity,
    `${label}: Player vertical velocity는 변하지 않아야 한다.`,
  );
  assert.equal(scene.isGrounded, before.isGrounded, `${label}: grounded 상태를 유지해야 한다.`);
}

function verifyInteractionRangeAndTargets() {
  const outside = createAcademyScene(270);
  const outsideBeforeY = outside.position.y;
  outside.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
  assert.equal(outside.getWorldStatus().dialogue.active, false);
  assert.equal(outside.isGrounded, false, '상호작용 범위 밖 jump는 Player jump를 시작해야 한다.');
  assert.ok(outside.position.y < outsideBeforeY);

  const mentor = createAcademyScene(420);
  const mentorResult = jump(mentor, 1);
  assertJumpSuppressed(mentor, mentorResult.before, '세라 대화 시작');
  assert.deepEqual(
    {
      active: mentorResult.after.active,
      interactionId: mentorResult.after.interactionId,
      speaker: mentorResult.after.speaker,
      lineIndex: mentorResult.after.lineIndex,
      lineCount: mentorResult.after.lineCount,
      canAdvance: mentorResult.after.canAdvance,
    },
    {
      active: true,
      interactionId: 'mentor-sera-interaction',
      speaker: '세라 교관',
      lineIndex: 0,
      lineCount: 2,
      canAdvance: true,
    },
  );
  assert.ok(Object.isFrozen(mentorResult.after), 'dialogue DTO는 immutable이어야 한다.');

  const facility = createAcademyScene(790);
  const facilityResult = jump(facility, 1);
  assertJumpSuppressed(facility, facilityResult.before, '시설 안내판 상호작용 시작');
  assert.equal(facilityResult.after.speaker, '장비 공방 안내판');
  assert.equal(facilityResult.after.interactionId, 'academy-workshop-sign-interaction');

  const fieldGate = createAcademyScene(910);
  fieldGate.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
  assert.equal(fieldGate.getWorldStatus().dialogue.active, false);
  assert.equal(
    fieldGate.mapRuntime.getTransition()?.portalId,
    'academy-field-portal',
    '시설 상호작용 범위가 첫 원정 Portal을 가리면 안 된다.',
  );
}

function verifyDialogueProgressionAndSequenceConsumption() {
  const scene = createAcademyScene(420);
  const started = jump(scene, 1);
  assertJumpSuppressed(scene, started.before, '대화 첫 줄');
  const firstLine = started.after.line;

  scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 1 }));
  assert.equal(
    scene.getWorldStatus().dialogue.line,
    firstLine,
    '같은 jump sequence를 fixed catch-up step에서 다시 소비하면 안 된다.',
  );

  const advanced = jump(scene, 2);
  assertJumpSuppressed(scene, advanced.before, '대화 다음 줄');
  assert.equal(advanced.after.lineIndex, 1);
  assert.equal(advanced.after.canAdvance, false);
  assert.equal(advanced.after.canClose, true);

  const closed = jump(scene, 3);
  assertJumpSuppressed(scene, closed.before, '대화 종료');
  assert.equal(closed.after.active, false);
  assert.equal(closed.after.available, true);
  assert.equal(closed.after.lineIndex, -1);
}

function verifyKeyboardTouchParity() {
  const keyboard = new KeyboardInputAdapter({ target: null, documentTarget: null });
  keyboard.onKeyDown({ code: 'ArrowUp', preventDefault() {} });
  const mobile = new MobileInputAdapter();
  mobile.press('jump', 7);

  const keyboardScene = createAcademyScene(420);
  const mobileScene = createAcademyScene(420);
  keyboardScene.update(STEP_SECONDS, keyboard.snapshot());
  mobileScene.update(STEP_SECONDS, mobile.snapshot());

  const selectResult = (scene) => {
    const dialogue = scene.getWorldStatus().dialogue;
    return {
      dialogue: {
        active: dialogue.active,
        interactionId: dialogue.interactionId,
        speaker: dialogue.speaker,
        line: dialogue.line,
        lineIndex: dialogue.lineIndex,
        canAdvance: dialogue.canAdvance,
      },
      player: {
        y: scene.position.y,
        verticalVelocity: scene.verticalVelocity,
        isGrounded: scene.isGrounded,
      },
    };
  };
  assert.deepEqual(
    selectResult(keyboardScene),
    selectResult(mobileScene),
    'Keyboard와 touch jump는 같은 대화와 Player physics 결과를 만들어야 한다.',
  );
}

verifyInteractionRangeAndTargets();
verifyDialogueProgressionAndSequenceConsumption();
verifyKeyboardTouchParity();

console.log(
  JSON.stringify(
    {
      rate: 120,
      outcomes: [
        'interaction-range',
        'person-and-facility-targets',
        'field-portal-remains-reachable',
        'named-line-progression-and-close',
        'same-sequence-single-consumption',
        'jump-suppression',
        'keyboard-touch-parity',
        'immutable-dialogue-dto',
      ],
    },
    null,
    2,
  ),
);
