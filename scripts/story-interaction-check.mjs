import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_EQUIPMENT_PROFILE_ID } from '../src/game/equipment/EquipmentProfiles.js';
import { dialogueSafeBounds, projectDialogue } from '../src/app/DialoguePresentation.js';
import {
  FIRST_JOURNEY_CHECKPOINT_ID,
  JOURNEY_PHASE,
  JOURNEY_ROUTE,
} from '../src/game/encounter/FirstJourneyProgress.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { createProgressionSnapshot } from '../src/game/progression/ProgressionState.js';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
import { MobileInputAdapter } from '../src/input/MobileInputAdapter.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

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
  const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
  scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'academy-plaza', x });
  return scene;
}

function createJourneyProgression(firstJourney) {
  const base = createProgressionSnapshot(DEFAULT_EQUIPMENT_PROFILE_ID);
  return Object.freeze({
    ...base,
    firstJourney: Object.freeze({ ...base.firstJourney, ...firstJourney }),
  });
}

function createJourneyScene({ roomId, x, firstJourney }) {
  const scene = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: createJourneyProgression(firstJourney),
  });
  scene.setVisualQaLocation({ regionId: 'academy-region', roomId, x });
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
  assert.equal(
    scene.mapRuntime.getTransition(),
    null,
    `${label}: Portal transition이 새면 안 된다.`,
  );
}

function revealCurrentLine(scene, label) {
  for (let step = 0; step < 1_200; step += 1) {
    const dialogue = scene.getWorldStatus().dialogue;
    if (dialogue.revealComplete) return dialogue;
    scene.update(STEP_SECONDS, EMPTY_INPUT);
  }
  assert.fail(`${label}: typewriter가 제한 시간 안에 line을 완성하지 못했습니다.`);
}

function resolvedEntityIds(scene) {
  return scene.mapRuntime.getResolvedSnapshot().entities.map((entity) => entity.id);
}

function assertEntityAvailability(scene, expectedPresentIds, expectedAbsentIds, label) {
  const entityIds = resolvedEntityIds(scene);
  for (const entityId of expectedPresentIds) {
    assert.ok(entityIds.includes(entityId), `${label}: ${entityId} target이 활성 상태여야 한다.`);
  }
  for (const entityId of expectedAbsentIds) {
    assert.ok(!entityIds.includes(entityId), `${label}: ${entityId} target은 잠겨 있어야 한다.`);
  }
}

function assertPortalAvailability(scene, portalId, expected, label) {
  const portalIds = scene.mapRuntime.getResolvedSnapshot().portals.map((portal) => portal.id);
  assert.equal(portalIds.includes(portalId), expected, `${label}: ${portalId} availability 불일치`);
}

function assertStoryStatus(scene, { beatId, journeyLabel }, label) {
  const status = scene.getWorldStatus();
  assert.ok(Object.isFrozen(status), `${label}: world status DTO는 immutable이어야 한다.`);
  assert.ok(Object.isFrozen(status.story), `${label}: story DTO는 immutable이어야 한다.`);
  assert.equal(status.story.beatId, beatId, `${label}: story beat 불일치`);
  assert.equal(
    status.objective,
    status.story.nextObjective,
    `${label}: HUD objective와 story objective가 일치해야 한다.`,
  );
  assert.equal(status.journeyLabel, journeyLabel, `${label}: journey label 불일치`);
}

function verifyNamedDialogue(scene, { interactionId, speaker, label }) {
  const progressionBefore = scene.getProgressionSnapshot();
  const available = scene.getWorldStatus().dialogue;
  assert.ok(Object.isFrozen(available), `${label}: available dialogue DTO는 immutable이어야 한다.`);
  assert.equal(available.available, true, `${label}: interaction이 Player 범위에 있어야 한다.`);
  assert.equal(available.active, false);
  assert.equal(available.interactionId, interactionId, `${label}: target ID 불일치`);
  assert.equal(available.speaker, speaker, `${label}: speaker 불일치`);
  assert.ok(available.speaker.trim().length > 0, `${label}: speaker 이름은 비어 있으면 안 된다.`);

  let sequence = 1;
  const started = jump(scene, sequence);
  assertJumpSuppressed(scene, started.before, `${label} 시작`);
  assert.equal(started.after.active, true);
  assert.equal(started.after.interactionId, interactionId);
  assert.equal(started.after.speaker, speaker);
  assert.ok(
    Object.isFrozen(started.after),
    `${label}: active dialogue DTO는 immutable이어야 한다.`,
  );
  assert.ok(started.after.line.trim().length > 0, `${label}: 첫 대사는 비어 있으면 안 된다.`);
  assert.equal(
    started.after.visibleLine,
    '',
    `${label}: 시작 직후에는 typewriter가 빈 line에서 시작해야 한다.`,
  );
  assert.ok(started.after.lineCount > 0, `${label}: 대사는 한 줄 이상이어야 한다.`);
  const lines = [];

  scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: sequence }));
  assert.equal(
    scene.getWorldStatus().dialogue.line,
    started.after.line,
    `${label}: 같은 jump sequence가 대사를 두 번 소비하면 안 된다.`,
  );
  assertJumpSuppressed(scene, started.before, `${label} 같은 sequence`);

  let dialogue = started.after;
  while (true) {
    dialogue = revealCurrentLine(scene, `${label} ${dialogue.lineIndex + 1}번째 줄`);
    assert.equal(
      dialogue.visibleLine,
      dialogue.line,
      `${label}: 완성 line은 authored line과 일치해야 한다.`,
    );
    lines.push(dialogue.line);
    if (!dialogue.canAdvance) break;
    sequence += 1;
    const advanced = jump(scene, sequence);
    assertJumpSuppressed(scene, advanced.before, `${label} ${sequence}번째 줄`);
    dialogue = advanced.after;
    assert.equal(dialogue.active, true);
    assert.equal(dialogue.interactionId, interactionId);
    assert.equal(dialogue.speaker, speaker);
    assert.ok(dialogue.line.trim().length > 0, `${label}: 모든 대사는 비어 있으면 안 된다.`);
    assert.ok(Object.isFrozen(dialogue), `${label}: 진행된 dialogue DTO는 immutable이어야 한다.`);
  }
  assert.equal(lines.length, dialogue.lineCount, `${label}: 모든 named line을 진행해야 한다.`);

  sequence += 1;
  const closed = jump(scene, sequence);
  assertJumpSuppressed(scene, closed.before, `${label} 종료`);
  assert.equal(closed.after.active, false);
  assert.equal(closed.after.available, true);
  assert.equal(closed.after.interactionId, interactionId);
  assert.deepEqual(
    scene.getProgressionSnapshot(),
    progressionBefore,
    `${label}: 대화만으로 progression이 바뀌면 안 된다.`,
  );
  return Object.freeze(lines);
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
      canAdvance: false,
    },
  );
  assert.ok(Object.isFrozen(mentorResult.after), 'dialogue DTO는 immutable이어야 한다.');

  const facility = createAcademyScene(790);
  const facilityResult = jump(facility, 1);
  assertJumpSuppressed(facility, facilityResult.before, '시설 안내판 상호작용 시작');
  assert.equal(facilityResult.after.speaker, '장비 공방 안내판');
  assert.equal(facilityResult.after.interactionId, 'academy-workshop-sign-interaction');
  assert.deepEqual(facilityResult.after.worldAnchor, { x: 829, y: 358 });

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

  revealCurrentLine(scene, '대화 첫 줄');
  const advanced = jump(scene, 2);
  assertJumpSuppressed(scene, advanced.before, '대화 다음 줄');
  assert.equal(advanced.after.lineIndex, 1);
  assert.equal(advanced.after.canAdvance, false);
  assert.equal(advanced.after.canClose, false);

  const completedLastLine = revealCurrentLine(scene, '대화 마지막 줄');
  assert.equal(completedLastLine.canClose, true);
  const closed = jump(scene, 3);
  assertJumpSuppressed(scene, closed.before, '대화 종료');
  assert.equal(closed.after.active, false);
  assert.equal(closed.after.available, true);
  assert.equal(closed.after.lineIndex, -1);
}

function verifyTypewriterRevealAndCompletionJump() {
  const scene = createAcademyScene(420);
  const started = jump(scene, 1);
  assert.equal(started.after.visibleLine, '');
  assert.deepEqual(started.after.worldAnchor, { x: 488, y: 350 });
  assert.ok(
    Object.isFrozen(started.after.worldAnchor),
    'nested world anchor는 immutable이어야 한다.',
  );

  for (let step = 0; step < 72; step += 1) scene.update(STEP_SECONDS, EMPTY_INPUT);
  const partial = scene.getWorldStatus().dialogue;
  assert.ok(partial.visibleLine.length > 0, '0.6초 뒤 typewriter partial text가 있어야 한다.');
  assert.ok(
    partial.visibleLine.length < partial.line.length,
    '0.6초 뒤 line은 아직 완성되면 안 된다.',
  );

  const completed = jump(scene, 2);
  assert.equal(completed.after.lineIndex, 0, 'reveal 중 jump는 다음 line으로 넘기면 안 된다.');
  assert.equal(
    completed.after.visibleLine,
    completed.after.line,
    'reveal 중 jump는 current line만 완성해야 한다.',
  );
  assert.equal(completed.after.canAdvance, true);
  const advanced = jump(scene, 3);
  assert.equal(advanced.after.lineIndex, 1, '완성 후 새 sequence만 다음 line으로 진행해야 한다.');
}

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

function verifyFirstJourneyStoryChain() {
  const field = createJourneyScene({
    roomId: 'field-crossing',
    x: 540,
    firstJourney: { phase: JOURNEY_PHASE.FIELD },
  });
  assertStoryStatus(
    field,
    { beatId: 'first-field-choice', journeyLabel: 'Field 탐험' },
    'Field 출발 단서',
  );
  verifyNamedDialogue(field, {
    interactionId: 'field-departure-clue-interaction',
    speaker: '세라 교관의 정찰 표식',
    label: 'Field 출발 단서',
  });

  const fieldCleared = createJourneyScene({
    roomId: 'field-crossing',
    x: 540,
    firstJourney: {
      phase: JOURNEY_PHASE.FIELD,
      routeChoice: JOURNEY_ROUTE.GUARDIAN,
      fieldGuardianDefeated: true,
    },
  });
  assertStoryStatus(
    fieldCleared,
    { beatId: 'first-field-cleared', journeyLabel: 'Field 탐험' },
    'Field 결과 단서',
  );
  const fieldClearedLines = verifyNamedDialogue(fieldCleared, {
    interactionId: 'field-departure-clue-interaction',
    speaker: '세라 교관의 정찰 표식',
    label: 'Field 결과 단서',
  });
  assert.match(fieldClearedLines.join(' '), /물러나|흔적/);

  const dungeonGate = createJourneyScene({
    roomId: 'sealed-forest-dungeon',
    x: 342,
    firstJourney: {
      phase: JOURNEY_PHASE.DUNGEON,
      routeChoice: JOURNEY_ROUTE.GUARDIAN,
      fieldGuardianDefeated: true,
    },
  });
  assertEntityAvailability(
    dungeonGate,
    ['dungeon-gate-record-interaction'],
    ['dungeon-checkpoint-record-interaction'],
    'Dungeon guardian 관문',
  );
  assertStoryStatus(
    dungeonGate,
    { beatId: 'first-dungeon-guardian', journeyLabel: 'Dungeon 진입' },
    'Dungeon guardian 관문',
  );
  verifyNamedDialogue(dungeonGate, {
    interactionId: 'dungeon-gate-record-interaction',
    speaker: '봉인 회랑 경계 기록',
    label: 'Dungeon guardian 관문',
  });
  assertPortalAvailability(dungeonGate, 'dungeon-boss-portal', false, 'Dungeon guardian 관문');

  const dungeonSeal = createJourneyScene({
    roomId: 'sealed-forest-dungeon',
    x: 760,
    firstJourney: {
      phase: JOURNEY_PHASE.DUNGEON,
      routeChoice: JOURNEY_ROUTE.GUARDIAN,
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
    },
  });
  assertEntityAvailability(
    dungeonSeal,
    ['dungeon-checkpoint-record-interaction'],
    ['dungeon-gate-record-interaction'],
    'Dungeon checkpoint 해금',
  );
  assertStoryStatus(
    dungeonSeal,
    { beatId: 'first-dungeon-seal', journeyLabel: 'Dungeon 진입' },
    'Dungeon checkpoint 해금',
  );
  verifyNamedDialogue(dungeonSeal, {
    interactionId: 'dungeon-checkpoint-record-interaction',
    speaker: '봉인 회랑 기록석',
    label: 'Dungeon checkpoint 해금',
  });
  assertPortalAvailability(dungeonSeal, 'dungeon-boss-portal', false, 'Dungeon checkpoint 해금');

  const checkpoint = createJourneyScene({
    roomId: 'sealed-forest-dungeon',
    x: 760,
    firstJourney: {
      phase: JOURNEY_PHASE.CHECKPOINT,
      routeChoice: JOURNEY_ROUTE.GUARDIAN,
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: FIRST_JOURNEY_CHECKPOINT_ID,
    },
  });
  assertStoryStatus(
    checkpoint,
    { beatId: 'first-dungeon-checkpoint', journeyLabel: 'Checkpoint 확보' },
    'Dungeon checkpoint 활성',
  );
  const checkpointLines = verifyNamedDialogue(checkpoint, {
    interactionId: 'dungeon-checkpoint-record-interaction',
    speaker: '봉인 회랑 기록석',
    label: 'Dungeon checkpoint 활성',
  });
  assert.match(checkpointLines.join(' '), /checkpoint|문이 열렸다/i);
  assertPortalAvailability(checkpoint, 'dungeon-boss-portal', true, 'Dungeon checkpoint 활성');

  const bossResult = createJourneyScene({
    roomId: 'sealed-forest-boss',
    x: 480,
    firstJourney: {
      phase: JOURNEY_PHASE.REWARD,
      routeChoice: JOURNEY_ROUTE.GUARDIAN,
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: FIRST_JOURNEY_CHECKPOINT_ID,
      bossDefeated: true,
    },
  });
  assertStoryStatus(bossResult, { beatId: 'first-reward', journeyLabel: '보상 회수' }, 'Boss 결과');
  assertEntityAvailability(
    bossResult,
    ['boss-result-echo-interaction'],
    ['sealed-forest-warden'],
    'Boss 결과',
  );
  verifyNamedDialogue(bossResult, {
    interactionId: 'boss-result-echo-interaction',
    speaker: '봉인 핵의 잔향',
    label: 'Boss 결과',
  });
  assertPortalAvailability(bossResult, 'boss-shortcut-portal', false, 'Boss 결과');

  const reward = createJourneyScene({
    roomId: 'sealed-forest-boss',
    x: 480,
    firstJourney: {
      phase: JOURNEY_PHASE.REWARD,
      routeChoice: JOURNEY_ROUTE.GUARDIAN,
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: FIRST_JOURNEY_CHECKPOINT_ID,
      bossDefeated: true,
      bossRewardClaimed: true,
      gold: 120,
    },
  });
  assertStoryStatus(
    reward,
    { beatId: 'first-shortcut', journeyLabel: '보상 회수' },
    'Boss 보상과 shortcut',
  );
  const rewardLines = verifyNamedDialogue(reward, {
    interactionId: 'boss-result-echo-interaction',
    speaker: '봉인 핵의 잔향',
    label: 'Boss 보상과 shortcut',
  });
  assert.match(rewardLines.join(' '), /보상 결정|귀환문/);
  assertPortalAvailability(reward, 'boss-shortcut-portal', true, 'Boss 보상과 shortcut');

  const returned = createJourneyScene({
    roomId: 'academy-plaza',
    x: 420,
    firstJourney: {
      phase: JOURNEY_PHASE.RETURNED,
      routeChoice: JOURNEY_ROUTE.GUARDIAN,
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: FIRST_JOURNEY_CHECKPOINT_ID,
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold: 120,
    },
  });
  assertStoryStatus(
    returned,
    { beatId: 'glasswind-briefing', journeyLabel: '첫 원정 완료' },
    '학원촌 귀환 반응',
  );
  const returnLines = verifyNamedDialogue(returned, {
    interactionId: 'mentor-sera-interaction',
    speaker: '세라 교관',
    label: '학원촌 귀환 반응',
  });
  assert.match(returnLines.join(' '), /돌아왔군|첫 원정/);
}

function verifyStaleDialogueConsumesOneJump() {
  const scene = createJourneyScene({
    roomId: 'sealed-forest-dungeon',
    x: 342,
    firstJourney: {
      phase: JOURNEY_PHASE.DUNGEON,
      routeChoice: JOURNEY_ROUTE.GUARDIAN,
      fieldGuardianDefeated: true,
    },
  });
  const started = jump(scene, 1);
  assert.equal(started.after.interactionId, 'dungeon-gate-record-interaction');

  const result = scene.journeyProgress.resolveEncounter('field', 'sealed-dungeon-guardian');
  assert.equal(result.changed, true);
  scene.syncJourneyWorldContext();
  scene.emitDurableProgressionChanged();
  assertEntityAvailability(
    scene,
    ['dungeon-checkpoint-record-interaction'],
    ['dungeon-gate-record-interaction'],
    'stale dialogue target 교체',
  );

  const missingTarget = jump(scene, 2);
  assertJumpSuppressed(scene, missingTarget.before, 'stale dialogue 종료');
  assert.equal(missingTarget.after.active, false);
  assert.equal(missingTarget.after.available, false);

  const beforeNextJumpY = scene.position.y;
  scene.update(STEP_SECONDS, input({ jump: true, jumpSequence: 3 }));
  assert.equal(scene.isGrounded, false, 'stale target 종료 다음 새 sequence는 정상 jump여야 한다.');
  assert.ok(scene.position.y < beforeNextJumpY);
}

verifyInteractionRangeAndTargets();
verifyDialogueProgressionAndSequenceConsumption();
verifyTypewriterRevealAndCompletionJump();
verifyDialoguePresentationSafeBounds();
verifyDialogueBubbleActiveLifetime();
verifyKeyboardTouchParity();
verifyFirstJourneyStoryChain();
verifyStaleDialogueConsumesOneJump();

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
        'world-anchor-and-typewriter-reveal',
        'dialogue-bubble-safe-projection',
        'dialogue-bubble-active-only-lifetime',
        'first-journey-stage-dialogue-matrix',
        'locked-and-obsolete-targets',
        'story-objective-journey-label-alignment',
        'stale-target-single-jump-consumption',
        'journey-portal-availability-regression',
      ],
    },
    null,
    2,
  ),
);
