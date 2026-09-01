import assert from 'node:assert/strict';

import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { CombatCommandController } from '../src/combat/CombatCommandController.js';
import { sampleTrainingEnemyCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { TrainingEncounterNode } from '../src/game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
import { MobileInputAdapter } from '../src/input/MobileInputAdapter.js';

const STEP = 1 / 120;
const EMPTY = Object.freeze({
  left: false,
  right: false,
  jump: false,
  jumpSequence: 0,
  basicAttack: false,
  basicAttackSequence: 0,
  strongAttack: false,
  strongAttackSequence: 0,
  guard: false,
  guardSequence: 0,
});
const input = (values = {}) => Object.freeze({ ...EMPTY, ...values });

function tick(controller, snapshot) {
  return controller.update(STEP, snapshot);
}

function finishMotion(controller, snapshot) {
  for (let index = 0; index < 180; index += 1) tick(controller, snapshot);
}

function createEncounter(profileId) {
  return new TrainingEncounterNode({
    entity: {
      id: `${profileId}-posture-check`,
      kind: 'combat-test-mob',
      encounterProfileId: profileId,
      position: { x: 650, y: 420 },
      maxHealth: 240,
    },
    groundY: 420,
    movementBounds: { minX: 0, maxX: 960 },
    spinContact: { hitPulses: [0.3, 0.5, 0.7], contactSpacings: [23, 17, 5] },
    encounterProfiles: ENCOUNTER_PROFILES,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
  });
}

function assertHitConfirmAndGuardCancel() {
  const whiff = new CombatCommandController();
  tick(whiff, input({ basicAttack: true, basicAttackSequence: 1 }));
  tick(whiff, input({ basicAttackSequence: 2 }));
  finishMotion(whiff, input({ basicAttackSequence: 2 }));
  assert.equal(
    whiff.snapshot().id,
    'idle',
    'whiff queued input은 motion 종료에서 폐기되어야 한다.',
  );

  const confirmed = new CombatCommandController();
  const first = tick(confirmed, input({ basicAttack: true, basicAttackSequence: 1 }));
  assert.equal(
    confirmed.confirmDamagingHit({
      sequence: first.sequence,
      motionId: first.id,
      target: 'enemy',
      outcome: 'block',
      damage: 12,
    }),
    false,
    'enemy block은 damaging hit-confirm이 아니어야 한다.',
  );
  assert.equal(
    confirmed.confirmDamagingHit({
      sequence: first.sequence,
      motionId: first.id,
      target: 'enemy',
      outcome: 'hit',
      damage: 12,
    }),
    true,
  );
  tick(confirmed, input({ basicAttackSequence: 2 }));
  for (let index = 0; index < 80 && confirmed.snapshot().id === 'slash'; index += 1) {
    tick(confirmed, input({ basicAttackSequence: 2 }));
  }
  assert.equal(
    confirmed.snapshot().id,
    'thrust',
    'damaging hit-confirm 뒤 authored branch가 열려야 한다.',
  );

  const sameMotion = new CombatCommandController();
  const sameFirst = tick(sameMotion, input({ strongAttack: true, strongAttackSequence: 1 }));
  sameMotion.confirmDamagingHit({
    sequence: sameFirst.sequence,
    motionId: sameFirst.id,
    target: 'enemy',
    outcome: 'hit',
    damage: 12,
  });
  tick(sameMotion, input({ strongAttackSequence: 2 }));
  for (let index = 0; index < 120 && sameMotion.snapshot().id === 'heavy'; index += 1) {
    tick(sameMotion, input({ strongAttackSequence: 2 }));
  }
  assert.equal(sameMotion.snapshot().id, 'idle', 'heavy → heavy loop cancel은 거부되어야 한다.');
  assert.equal(
    sameMotion.snapshot().comboCycle,
    1,
    '거부된 same-motion은 새 cycle을 만들면 안 된다.',
  );

  const keyboard = new KeyboardInputAdapter({ target: null, documentTarget: null });
  const mobile = new MobileInputAdapter();
  const keyboardController = new CombatCommandController();
  const mobileController = new CombatCommandController();
  tick(keyboardController, input({ basicAttack: true, basicAttackSequence: 1 }));
  tick(mobileController, input({ basicAttack: true, basicAttackSequence: 1 }));
  keyboard.onKeyDown({ code: 'ArrowDown', preventDefault() {} });
  mobile.press('guard', 3);
  const keyboardState = tick(keyboardController, keyboard.snapshot());
  const mobileState = tick(mobileController, mobile.snapshot());
  assert.deepEqual(
    {
      id: keyboardState.id,
      stamina: keyboardState.stamina,
      kind: keyboardState.lastCommandTransition.kind,
    },
    {
      id: mobileState.id,
      stamina: mobileState.stamina,
      kind: mobileState.lastCommandTransition.kind,
    },
    'keyboard/touch guard sequence는 같은 active ground guard cancel을 만들어야 한다.',
  );
  assert.equal(keyboardState.id, 'guard');
  assert.equal(keyboardState.lastCommandTransition.kind, 'guard-cancelled');
  assert.equal(keyboardState.lastStaminaAction.action, 'guardCancel');
  assert.equal(keyboardState.lastStaminaAction.cost, 18);
  assert.ok(
    Math.abs(keyboardState.stamina - (70 - 10 / 120)) < 1e-9,
    'guard cancel은 18을 한 번 지불한 뒤 현재 tick의 guard 유지 drain만 적용해야 한다.',
  );
  const keyboardHeld = tick(keyboardController, keyboard.snapshot());
  assert.equal(keyboardHeld.id, 'guard');
  assert.ok(
    Math.abs(keyboardHeld.stamina - (70 - 20 / 120)) < 1e-9,
    'held guard follow-up은 guard cancel 비용을 다시 지불하면 안 된다.',
  );

  const simultaneous = new CombatCommandController();
  tick(simultaneous, input({ basicAttack: true, basicAttackSequence: 1 }));
  const simultaneousBefore = simultaneous.stamina;
  const simultaneousState = simultaneous.update(
    STEP,
    input({
      strongAttack: true,
      strongAttackSequence: 1,
      guard: true,
      guardSequence: 1,
    }),
    { staminaDeltaSeconds: 0 },
  );
  assert.equal(
    simultaneousState.id,
    'guard',
    '새 attack과 guard가 같은 tick에 오면 guard cancel이 우선해야 한다.',
  );
  assert.equal(
    simultaneousState.stamina,
    simultaneousBefore - 18,
    '동시 입력 guard cancel은 attack 비용 없이 18만 한 번 지불해야 한다.',
  );
  assert.equal(simultaneousState.lastCommandTransition.kind, 'guard-cancelled');

  const exhausted = new CombatCommandController();
  exhausted.stamina = 17;
  tick(exhausted, input({ basicAttack: true, basicAttackSequence: 1 }));
  exhausted.stamina = 17;
  const rejected = tick(exhausted, input({ guard: true, guardSequence: 1 }));
  assert.equal(rejected.id, 'slash', 'guardCancel stamina 부족은 active attack을 유지해야 한다.');
  assert.equal(rejected.lastCommandTransition.kind, 'action-rejected');
}

function assertPostureContract() {
  for (const profileId of ['training', 'field', 'glasswind-field']) {
    const normal = createEncounter(profileId);
    assert.equal(
      'posture' in normal.getGameplaySnapshot(),
      false,
      `${profileId} 일반 적 snapshot에는 posture가 없어야 한다.`,
    );
  }
  for (const profileId of ['boss', 'glasswind-boss']) {
    const postureBoss = createEncounter(profileId);
    assert.ok(
      postureBoss.getGameplaySnapshot().posture,
      `${profileId} Boss는 posture를 가져야 한다.`,
    );
  }

  const boss = createEncounter('boss');
  const enemy = boss.enemy;
  const postureMaximum = enemy.posture.maximum;
  const hpBefore = enemy.health;
  const enemyGeometry = sampleTrainingEnemyCombatGeometry(enemy, TRAINING_ENEMY_ATTACK_PROFILES);
  const contactPart = Object.freeze({ part: 'weapon', points: enemyGeometry.hurt[0].points });
  const player = Object.freeze({
    position: Object.freeze({ x: 600, y: 338 }),
    facing: 1,
    health: 100,
    hitstunSeconds: 0,
    blockstunSeconds: 0,
    invulnerableSeconds: 0,
    airComboFacing: 0,
  });
  const resolve = (id, sequence, damage, guardBreak, contactPartId = 'weapon') =>
    boss.resolvePlayerAttack(
      Object.freeze({
        combatState: Object.freeze({
          id,
          phase: 'active',
          progress: 0.5,
          sequence,
          comboCycle: sequence,
        }),
        attackProfile: Object.freeze({
          start: 0.3,
          end: 0.7,
          range: 80,
          damage,
          launchY: -90,
          guardBreak,
          contactPart: contactPartId,
        }),
        playerGeometry: Object.freeze({
          weapon: contactPart,
          sweep: contactPart,
          shield: contactPart,
        }),
        player,
      }),
    );
  enemy.aiState = 'guard';
  resolve('heavy', 1, 22, true);
  assert.equal(
    enemy.health,
    hpBefore - 22,
    'Strong guard-break는 posture와 실제 HP damage를 함께 적용해야 한다.',
  );
  assert.equal(
    enemy.posture.current,
    postureMaximum - ENCOUNTER_PROFILES.boss.posture.strongDamage,
  );
  enemy.aiState = 'guard';
  resolve('shieldBash', 2, 16, false, 'shield');
  assert.equal(
    enemy.health,
    hpBefore - 22,
    'guarded shield counter posture contact는 HP damage를 추가하면 안 된다.',
  );
  assert.equal(enemy.posture.current, 0);
  assert.ok(enemy.posture.groggySeconds > 0, 'posture 0은 bounded groggy를 열어야 한다.');
  assert.equal(
    enemy.punishWindowOpen,
    true,
    'groggy는 실제 damaging contact를 여는 punish window여야 한다.',
  );
  assert.equal(enemy.punishWindowOrigin, 'posture');
  boss.updateEnemyPhysics(ENCOUNTER_PROFILES.boss.posture.groggySeconds, { facing: 1 });
  assert.equal(
    enemy.posture.current,
    postureMaximum,
    'groggy 종료 뒤 posture는 최대치로 한 번 회복해야 한다.',
  );
  assert.equal(enemy.posture.groggySeconds, 0);
  assert.equal(
    enemy.punishWindowOpen,
    false,
    'groggy 종료는 posture-origin punish window를 닫아야 한다.',
  );
  assert.equal(enemy.punishWindowOrigin, null);
}

function assertPostureVisualQaExpectationMatrix() {
  for (const renderer of ['polygon', 'retro']) {
    for (const phase of ['start', 'end']) {
      for (const scenario of ['posture-full', 'posture-reduced', 'posture-groggy']) {
        const request = readVisualQaRequest(
          `?visualQa=1&gameStart=${scenario}&visualQaRenderer=${renderer}&visualQaPhase=${phase}`,
        );
        assert.notEqual(
          request.scenario.expectation.expectedItem,
          'combat-enemy-training-mask',
          `${renderer} ${scenario} ${phase}는 Boss posture item을 기대해야 한다.`,
        );
        assert.deepEqual(
          request.scenario.expectation.expectedItems,
          [],
          `${renderer} ${scenario} ${phase}는 active-only 추가 effect를 기대하면 안 된다.`,
        );
      }
    }
  }
  const normalEnd = readVisualQaRequest(
    '?visualQa=1&gameStart=posture-normal-enemy&visualQaRenderer=retro&visualQaPhase=end',
  );
  assert.equal(normalEnd.scenario.expectation.expectedItem, 'combat-enemy-training-mask');
}

assertHitConfirmAndGuardCancel();
assertPostureContract();
assertPostureVisualQaExpectationMatrix();

console.log(
  JSON.stringify({
    rate: 120,
    outcomes: [
      'whiff-and-block-no-hit-confirm',
      'damaging-hit-authored-branch-only',
      'same-motion-loop-rejected',
      'keyboard-touch-guard-sequence-exact-cost-held-and-simultaneous-priority',
      'guard-cancel-stamina-rejection',
      'normal-enemy-no-posture-and-boss-only-profile-matrix',
      'boss-strong-shield-counter-posture-groggy-recovery',
      'posture-visual-qa-start-end-expectation-matrix',
    ],
  }),
);
