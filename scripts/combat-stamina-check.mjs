import assert from 'node:assert/strict';

import {
  CombatCommandController,
  DEFAULT_COMBAT_STAMINA_PROFILE,
} from '../src/combat/CombatCommandController.js';
import { COMBAT_EVENT_TYPE } from '../src/combat/CombatEvent.js';
import { sampleTrainingEnemyCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { TrainingEncounterNode } from '../src/game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';
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

function tick(controller, snapshot = EMPTY_INPUT, options = {}) {
  return controller.update(STEP_SECONDS, snapshot, options);
}

function runTicks(controller, count, snapshot = EMPTY_INPUT, options = {}) {
  let state = controller.snapshot();
  for (let index = 0; index < count; index += 1) state = tick(controller, snapshot, options);
  return state;
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} !== ${expected}`);
}

function createEncounter() {
  return new TrainingEncounterNode({
    entity: {
      id: 'stamina-check-enemy',
      kind: 'combat-test-mob',
      encounterProfileId: 'training',
      position: { x: 650, y: 420 },
      maxHealth: 100,
    },
    groundY: 420,
    movementBounds: { minX: 0, maxX: 960 },
    spinContact: { hitPulses: [0.3, 0.5, 0.7], contactSpacings: [23, 17, 5] },
    encounterProfiles: ENCOUNTER_PROFILES,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
  });
}

function createGameScene() {
  return createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
}

function contactPlayerFrame(encounter, { combatState, attackProfile }) {
  const enemyGeometry = sampleTrainingEnemyCombatGeometry(
    encounter.enemy,
    TRAINING_ENEMY_ATTACK_PROFILES,
  );
  const contactWeapon = Object.freeze({
    part: 'weapon',
    points: enemyGeometry.hurt[0].points,
  });
  return Object.freeze({
    combatState,
    attackProfile,
    playerGeometry: Object.freeze({
      weapon: contactWeapon,
      sweep: contactWeapon,
      shield: null,
      hurt: Object.freeze([]),
    }),
    player: Object.freeze({
      position: Object.freeze({ x: 600, y: 338 }),
      facing: 1,
      isGrounded: true,
      health: 100,
      hitstunSeconds: 0,
      blockstunSeconds: 0,
      invulnerableSeconds: 0,
      rollProgress: null,
      rollDirection: null,
      airComboFacing: 0,
    }),
  });
}

function verifyActionCostsAndParity() {
  const basic = new CombatCommandController();
  let state = tick(basic, input({ basicAttack: true, basicAttackSequence: 1 }));
  assert.equal(state.id, 'slash');
  assert.equal(
    state.stamina,
    DEFAULT_COMBAT_STAMINA_PROFILE.maximum - DEFAULT_COMBAT_STAMINA_PROFILE.costs.basicAttack,
  );
  assert.equal(state.lastCommandTransition.staminaAfter, state.stamina);
  const heldState = tick(basic, input({ basicAttack: true, basicAttackSequence: 1 }));
  assert.equal(heldState.stamina, state.stamina, 'held Basic은 비용을 재차감하지 않아야 한다.');

  const strong = new CombatCommandController();
  state = tick(strong, input({ strongAttack: true, strongAttackSequence: 1 }));
  assert.equal(state.id, 'heavy');
  assert.equal(
    state.stamina,
    DEFAULT_COMBAT_STAMINA_PROFILE.maximum - DEFAULT_COMBAT_STAMINA_PROFILE.costs.strongAttack,
  );

  const keyboard = new KeyboardInputAdapter({ target: null, documentTarget: null });
  keyboard.onKeyDown({ code: 'KeyA', preventDefault() {} });
  const mobile = new MobileInputAdapter();
  mobile.press('basicAttack', 1);
  const keyboardController = new CombatCommandController();
  const mobileController = new CombatCommandController();
  const keyboardState = tick(keyboardController, keyboard.snapshot());
  const mobileState = tick(mobileController, mobile.snapshot());
  assert.deepEqual(
    { id: keyboardState.id, stamina: keyboardState.stamina },
    { id: mobileState.id, stamina: mobileState.stamina },
    'Keyboard와 touch Basic intent는 같은 command/stamina 결과여야 한다.',
  );
}

function verifyGuardRollExhaustionAndRecovery() {
  const guard = new CombatCommandController();
  let state = tick(guard, input({ guard: true }));
  assert.equal(state.id, 'guard');
  assert.equal(state.stamina, 94);
  state = runTicks(guard, 120, input({ guard: true }));
  assertClose(state.stamina, 84, 'guard hold 1초는 초당 10 stamina를 지속 소모한다.');
  const lightBlock = guard.applyGuardContact({ staminaDamage: 24 });
  assert.deepEqual(
    { ...lightBlock, stamina: Math.round(lightBlock.stamina) },
    { broken: false, drain: 24, recovery: 0, justGuard: false, stamina: 60 },
  );
  const strongerBlock = guard.applyGuardContact({ staminaDamage: 36 });
  assert.deepEqual(
    { ...strongerBlock, stamina: Math.round(strongerBlock.stamina) },
    { broken: false, drain: 36, recovery: 0, justGuard: false, stamina: 24 },
  );
  const brokenBlock = guard.applyGuardContact({ staminaDamage: 30 });
  assert.equal(brokenBlock.broken, true);
  assertClose(brokenBlock.drain, 24, '부족한 일반 block drain은 잔량을 모두 소비한다.');
  assert.equal(brokenBlock.stamina, 0);
  assert.equal(guard.snapshot().lastCommandTransition.kind, 'guard-broken');

  const roll = new CombatCommandController();
  assert.equal(roll.trySpendAction('roll'), true);
  assert.equal(roll.snapshot().stamina, 82);

  const exhausted = new CombatCommandController({
    staminaProfile: {
      maximum: 24,
      recoveryPerSecond: 24,
      recoveryDelaySeconds: 0.45,
      costs: { basicAttack: 12, strongAttack: 24, guard: 6, roll: 18, block: 20 },
    },
  });
  state = tick(exhausted, input({ strongAttack: true, strongAttackSequence: 1 }));
  assert.equal(state.stamina, 0);
  exhausted.interruptForHit();
  state = tick(
    exhausted,
    input({ basicAttack: true, basicAttackSequence: 1, strongAttackSequence: 1 }),
  );
  assert.equal(state.id, 'idle');
  assert.equal(state.lastCommandTransition.kind, 'action-rejected');
  assert.equal(exhausted.trySpendAction('roll'), false);
  assert.equal(exhausted.trySpendAction('guard'), false);

  const delayFrames = Math.round(0.45 / STEP_SECONDS);
  const releasedInput = input({ basicAttackSequence: 1, strongAttackSequence: 1 });
  state = runTicks(exhausted, delayFrames - 2, releasedInput);
  assert.equal(state.stamina, 0, '회복 지연이 끝나기 전에는 stamina가 늘지 않아야 한다.');
  state = runTicks(exhausted, 61, releasedInput);
  assert.ok(state.stamina >= 12, '결정적 회복 뒤 Basic 비용을 다시 확보해야 한다.');
  state = tick(
    exhausted,
    input({ basicAttack: true, basicAttackSequence: 2, strongAttackSequence: 1 }),
  );
  assert.equal(state.id, 'slash');
}

function prepareJustGuard(controller) {
  controller.trySpendAction('strongAttack');
  controller.trySpendAction('strongAttack');
  const guardState = tick(controller, input({ guard: true }));
  assert.equal(guardState.stamina, 46);
  return controller.applyGuardContact({ staminaDamage: 24, justGuardEligible: true });
}

function verifyJustGuardTimingRecoveryAndCounterLock() {
  const justGuard = new CombatCommandController();
  assert.deepEqual(prepareJustGuard(justGuard), {
    broken: false,
    drain: 0,
    recovery: 36,
    justGuard: true,
    stamina: 82,
  });
  let state = justGuard.snapshot();
  assert.equal(state.justGuardCounterReady, true);
  assert.equal(state.lastCommandTransition.kind, 'just-guard');

  state = tick(
    justGuard,
    input({ right: true, jump: true, strongAttack: true, strongAttackSequence: 1 }),
  );
  assert.equal(state.id, 'guard', 'counter window의 Strong은 실행하지 않아야 한다.');
  assert.equal(state.stamina, 82);
  state = tick(
    justGuard,
    input({ basicAttack: true, basicAttackSequence: 1, strongAttackSequence: 1 }),
  );
  assert.equal(state.id, 'shieldBash');
  assert.equal(state.stamina, 82, '전용 방패 반격은 just guard 보상을 다시 소비하지 않는다.');
  assert.equal(state.lastCommandTransition.action, 'guardCounter');
  state = tick(
    justGuard,
    input({ strongAttack: true, basicAttackSequence: 1, strongAttackSequence: 2 }),
  );
  assert.equal(state.queuedMotion, null, '방패 반격은 다른 공격으로 cancel/queue되지 않아야 한다.');
  state = runTicks(
    justGuard,
    44,
    input({ right: true, jump: true, basicAttackSequence: 1, strongAttackSequence: 2 }),
  );
  assert.equal(state.id, 'shieldBash');
  assert.equal(state.movementScale, 0, '방패 반격 중 이동을 섞을 수 없어야 한다.');
  assert.equal(state.canJump, false, '방패 반격 recovery도 jump로 cancel할 수 없어야 한다.');

  const insideBoundary = new CombatCommandController();
  tick(insideBoundary, input({ guard: true }));
  runTicks(insideBoundary, 14, input({ guard: true }));
  assert.equal(
    insideBoundary.applyGuardContact({ staminaDamage: 24 }).justGuard,
    true,
    '7 frame just-guard 경계 안쪽 contact는 성공해야 한다.',
  );
  const outsideBoundary = new CombatCommandController();
  tick(outsideBoundary, input({ guard: true }));
  runTicks(outsideBoundary, 15, input({ guard: true }));
  assert.equal(
    outsideBoundary.applyGuardContact({ staminaDamage: 24 }).justGuard,
    false,
    'just-guard 경계 밖 contact는 일반 block이어야 한다.',
  );

  const expired = new CombatCommandController();
  prepareJustGuard(expired);
  tick(expired, input({ strongAttack: true, strongAttackSequence: 1 }));
  state = runTicks(expired, 50, input({ strongAttackSequence: 1 }));
  assert.equal(state.justGuardCounterReady, false);
  assert.equal(state.id, 'idle', 'lock 중 소비한 Strong sequence를 만료 뒤 재생하면 안 된다.');

  const keyboard = new KeyboardInputAdapter({ target: null, documentTarget: null });
  const mobile = new MobileInputAdapter();
  keyboard.onKeyDown({ code: 'KeyA', preventDefault() {} });
  mobile.press('basicAttack', 7);
  const keyboardController = new CombatCommandController();
  const mobileController = new CombatCommandController();
  prepareJustGuard(keyboardController);
  prepareJustGuard(mobileController);
  const keyboardCounter = tick(keyboardController, keyboard.snapshot());
  const mobileCounter = tick(mobileController, mobile.snapshot());
  assert.deepEqual(
    { id: keyboardCounter.id, stamina: keyboardCounter.stamina },
    { id: mobileCounter.id, stamina: mobileCounter.stamina },
    'Keyboard와 touch Basic은 같은 just-guard counter를 실행해야 한다.',
  );
}

function verifyStrongTransitions() {
  const player = new CombatCommandController();
  let state = tick(player, input({ strongAttack: true, strongAttackSequence: 1 }));
  assert.equal(state.phase, 'windup');
  const interruption = player.interruptForHit();
  assert.deepEqual(interruption, {
    interrupted: true,
    strongStartup: true,
    motionId: 'heavy',
  });
  assert.equal(player.snapshot().lastCommandTransition.kind, 'strong-startup-interrupted');

  const enemyGuard = createEncounter();
  enemyGuard.enemy.aiState = 'guard';
  enemyGuard.enemy.aiSeconds = 0.3;
  const guardBreakEvents = [];
  enemyGuard.combatEventOccurred.connect((event) => guardBreakEvents.push(event));
  enemyGuard.resolvePlayerAttack(
    contactPlayerFrame(enemyGuard, {
      combatState: Object.freeze({
        id: 'heavy',
        phase: 'active',
        progress: 0.5,
        sequence: 1,
        comboCycle: 1,
        queuedMotion: null,
      }),
      attackProfile: Object.freeze({
        start: 0.4,
        end: 0.7,
        range: 80,
        damage: 22,
        launchY: -150,
        guardBreak: true,
      }),
    }),
  );
  assert.ok(
    guardBreakEvents.some(({ type }) => type === COMBAT_EVENT_TYPE.GUARD_BREAK),
    'Player Strong은 적 guard를 깨는 event를 기록해야 한다.',
  );
  assert.equal(enemyGuard.enemy.lastCommandTransition.kind, 'guard-break');

  const enemyStrong = createEncounter();
  enemyStrong.enemy.aiState = 'attack';
  enemyStrong.enemy.attackKind = 'heavy';
  enemyStrong.enemy.attackFacing = -1;
  enemyStrong.enemy.aiSeconds = TRAINING_ENEMY_ATTACK_PROFILES.heavy.attackSeconds * 0.4;
  enemyStrong.enemy.attackConnected = false;
  const enemyResults = [];
  const enemyEvents = [];
  enemyStrong.playerResultResolved.connect((result) => enemyResults.push(result));
  enemyStrong.combatEventOccurred.connect((event) => enemyEvents.push(event));
  const enemyStrongGeometry = sampleTrainingEnemyCombatGeometry(
    enemyStrong.enemy,
    TRAINING_ENEMY_ATTACK_PROFILES,
  );
  const enemyStrongFrame = Object.freeze({
    combatState: Object.freeze({ id: 'guard' }),
    playerGeometry: Object.freeze({
      weapon: null,
      sweep: null,
      shield: enemyStrongGeometry.weapon,
      hurt: Object.freeze([enemyStrongGeometry.weapon]),
    }),
    player: Object.freeze({
      position: Object.freeze({ x: 600, y: 338 }),
      facing: 1,
      isGrounded: true,
      invulnerableSeconds: 0,
      rollProgress: null,
      rollDirection: null,
    }),
  });
  enemyStrong.resolveEnemyAttack(enemyStrongFrame, -50);
  enemyStrong.resolveEnemyAttack(enemyStrongFrame, -50);
  assert.equal(enemyResults.at(-1)?.kind, 'guard-break');
  assert.equal(enemyResults.length, 1, '한 enemy contact는 guard-break 결과를 한 번만 적용한다.');
  assert.ok(enemyEvents.some(({ type }) => type === COMBAT_EVENT_TYPE.GUARD_BREAK));

  const interruptedEnemy = createEncounter();
  interruptedEnemy.enemy.aiState = 'windup';
  interruptedEnemy.enemy.attackKind = 'heavy';
  interruptedEnemy.enemy.attackFacing = -1;
  interruptedEnemy.resolvePlayerAttack(
    contactPlayerFrame(interruptedEnemy, {
      combatState: Object.freeze({
        id: 'slash',
        phase: 'active',
        progress: 0.5,
        sequence: 1,
        comboCycle: 1,
        queuedMotion: null,
      }),
      attackProfile: Object.freeze({
        start: 0.3,
        end: 0.7,
        range: 80,
        damage: 12,
        launchY: -90,
        guardBreak: false,
      }),
    }),
  );
  assert.equal(interruptedEnemy.enemy.lastCommandTransition.kind, 'strong-startup-interrupted');
  assert.equal(interruptedEnemy.enemy.aiState, 'hitstun');
}

function verifyShieldCounterContactAuthority() {
  const encounter = createEncounter();
  const enemyGeometry = sampleTrainingEnemyCombatGeometry(
    encounter.enemy,
    TRAINING_ENEMY_ATTACK_PROFILES,
  );
  const shield = Object.freeze({ part: 'shield', points: enemyGeometry.hurt[0].points });
  const events = [];
  encounter.combatEventOccurred.connect((event) => events.push(event));
  encounter.resolvePlayerAttack(
    Object.freeze({
      combatState: Object.freeze({
        id: 'shieldBash',
        phase: 'active',
        progress: 0.5,
        sequence: 1,
        comboCycle: 1,
        queuedMotion: null,
      }),
      attackProfile: Object.freeze({
        start: 0.3,
        end: 0.7,
        range: 80,
        damage: 16,
        launchY: -90,
        contactPart: 'shield',
      }),
      playerGeometry: Object.freeze({
        weapon: null,
        sweep: shield,
        shield,
        hurt: Object.freeze([]),
      }),
      player: Object.freeze({
        position: Object.freeze({ x: 600, y: 338 }),
        facing: 1,
        isGrounded: true,
        health: 100,
        hitstunSeconds: 0,
        blockstunSeconds: 0,
        invulnerableSeconds: 0,
        rollProgress: null,
        rollDirection: null,
        airComboFacing: 0,
      }),
    }),
  );
  const counterEvent = events.find(({ type }) => type === COMBAT_EVENT_TYPE.COUNTER);
  assert.ok(counterEvent, '방패 반격은 dedicated counter event를 기록해야 한다.');
  assert.equal(encounter.lastVisualContact.weaponPart, 'shield');
  assert.deepEqual(counterEvent.payload.position, encounter.lastVisualContact.position);
}

function verifyGameSceneStaminaBoundary() {
  const rollScene = createGameScene();
  assert.equal(rollScene.tryStartRoll(1), true);
  assert.equal(rollScene.getPlayerStatus().stamina, 82);
  assert.equal(rollScene.tryStartRoll(1), false);
  assert.equal(rollScene.getPlayerStatus().stamina, 82, 'active roll은 비용을 재차감하지 않는다.');

  const exhaustedRollScene = createGameScene();
  for (let index = 0; index < 4; index += 1) {
    exhaustedRollScene.combatCommands.trySpendAction('strongAttack');
  }
  assert.equal(exhaustedRollScene.tryStartRoll(1), false);
  assert.equal(exhaustedRollScene.rollState, null);

  const guardScene = createGameScene();
  guardScene.combatCommands.update(0, input({ guard: true }));
  guardScene.combatCommands.update(0.2, input({ guard: true }));
  guardScene.applyTrainingEncounterPlayerResult({
    kind: 'guard',
    attackId: 'light',
    contactPosition: { x: 620, y: 350 },
    contactDirection: 1,
    guardStaminaDamage: 24,
    justGuardEligible: true,
    blockImpactSeconds: 0.14,
    blockImpactStrength: 0.55,
    blockstunSeconds: 7 / 60,
    hitStopSeconds: 0.04,
  });
  assert.equal(guardScene.getPlayerStatus().stamina, 68);
  assert.equal(guardScene.getPlayerStatus().lastCommandTransition.kind, 'guard-contact');

  const justGuardScene = createGameScene();
  justGuardScene.combatCommands.trySpendAction('strongAttack');
  justGuardScene.combatCommands.trySpendAction('strongAttack');
  justGuardScene.combatCommands.update(0, input({ guard: true }));
  justGuardScene.applyTrainingEncounterPlayerResult({
    kind: 'guard',
    attackId: 'light',
    contactPosition: { x: 620, y: 350 },
    contactDirection: 1,
    guardStaminaDamage: 24,
    justGuardEligible: true,
    blockImpactSeconds: 0.14,
    blockImpactStrength: 0.55,
    blockstunSeconds: 7 / 60,
    hitStopSeconds: 0.04,
  });
  assert.equal(justGuardScene.getPlayerStatus().stamina, 82);
  assert.equal(justGuardScene.getPlayerStatus().justGuardCounterReady, true);
  assert.ok(
    justGuardScene.combatEvents
      .snapshot()
      .some(
        ({ type, staminaDelta }) => type === COMBAT_EVENT_TYPE.JUST_GUARD && staminaDelta === 36,
      ),
    'GameScene은 immutable just-guard stamina recovery event를 기록해야 한다.',
  );

  const breakScene = createGameScene();
  breakScene.combatCommands.update(0, input({ guard: true }));
  breakScene.applyTrainingEncounterPlayerResult({
    kind: 'guard-break',
    blockImpactSeconds: 0.22,
    blockImpactStrength: 1.35,
    blockstunSeconds: 28 / 60,
    hitStopSeconds: 0.055,
  });
  const breakStatus = breakScene.getPlayerStatus();
  assert.equal(breakStatus.stamina, 0);
  assert.equal(breakStatus.lastCommandTransition.kind, 'guard-broken');
}

verifyActionCostsAndParity();
verifyGuardRollExhaustionAndRecovery();
verifyJustGuardTimingRecoveryAndCounterLock();
verifyStrongTransitions();
verifyShieldCounterContactAuthority();
verifyGameSceneStaminaBoundary();

const trace = {
  rate: 120,
  costs: DEFAULT_COMBAT_STAMINA_PROFILE.costs,
  recoveryPerSecond: DEFAULT_COMBAT_STAMINA_PROFILE.recoveryPerSecond,
  outcomes: [
    'basic-cost',
    'strong-cost',
    'guard-hold-and-power-weighted-block-drain',
    'just-guard-window-recovery-and-basic-only-counter',
    'shield-counter-noncancel-and-keyboard-touch-parity',
    'roll-cost',
    'exhausted-rejection-and-recovery',
    'keyboard-touch-parity',
    'game-scene-status-boundary',
    'player-and-enemy-guard-break',
    'player-and-enemy-strong-startup-interrupt',
    'actual-shield-counter-contact-authority',
  ],
};

assertClose(STEP_SECONDS * 120, 1, '120Hz fixed trace');
console.log(JSON.stringify(trace));
