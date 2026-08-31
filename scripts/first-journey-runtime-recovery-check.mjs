import assert from 'node:assert/strict';

import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const STEP_SECONDS = 1 / 120;
const KEYBOARD_CODE_BY_ACTION = Object.freeze({
  left: 'ArrowLeft',
  right: 'ArrowRight',
  jump: 'ArrowUp',
  guard: 'ArrowDown',
  basicAttack: 'KeyA',
  strongAttack: 'KeyS',
});
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

class RuntimeDriver {
  constructor(
    scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP }),
    { keyboardInput = false } = {},
  ) {
    this.scene = scene;
    this.sequences = { jump: 0, basicAttack: 0, strongAttack: 0 };
    this.keyboardInput = keyboardInput
      ? new KeyboardInputAdapter({ target: null, documentTarget: null })
      : null;
    this.trace = [];
    scene.enterTree();
  }

  snapshot(overrides = {}) {
    return Object.freeze({
      ...EMPTY_INPUT,
      jumpSequence: this.sequences.jump,
      basicAttackSequence: this.sequences.basicAttack,
      strongAttackSequence: this.sequences.strongAttack,
      ...overrides,
    });
  }

  tick(overrides = {}) {
    if (this.keyboardInput) {
      const current = this.keyboardInput.snapshot();
      for (const [action, code] of Object.entries(KEYBOARD_CODE_BY_ACTION)) {
        const requested = overrides[action] === true;
        if (requested && !current[action]) {
          this.keyboardInput.onKeyDown({ code, preventDefault() {} });
        } else if (!requested && current[action]) {
          this.keyboardInput.onKeyUp({ code });
        }
      }
      const inputSnapshot = this.keyboardInput.snapshot();
      this.scene.update(STEP_SECONDS, inputSnapshot);
      return inputSnapshot;
    }
    const inputSnapshot = this.snapshot(overrides);
    this.scene.update(STEP_SECONDS, inputSnapshot);
    return inputSnapshot;
  }

  press(action, overrides = {}) {
    if (this.keyboardInput) {
      const inputSnapshot = this.tick({ ...overrides, [action]: true });
      this.keyboardInput.onKeyUp({ code: KEYBOARD_CODE_BY_ACTION[action] });
      return inputSnapshot;
    }
    this.sequences[action] += 1;
    return this.tick({
      ...overrides,
      [action]: true,
      [`${action}Sequence`]: this.sequences[action],
    });
  }

  idle(ticks = 1) {
    for (let index = 0; index < ticks; index += 1) this.tick();
  }

  moveTo(targetX, label, maximumTicks = 1800) {
    for (let index = 0; index < maximumTicks; index += 1) {
      const gap = targetX - this.scene.position.x;
      if (Math.abs(gap) <= 5) {
        this.idle(2);
        return;
      }
      this.tick(gap > 0 ? { right: true } : { left: true });
    }
    assert.fail(`${label}: ${targetX} 위치에 도달하지 못했습니다.`);
  }

  worldX(localX) {
    return this.scene.mapRuntime.getActiveRoom().bounds.x + localX;
  }

  record(label) {
    const world = this.scene.getWorldStatus();
    const journey = this.scene.journeyProgress.snapshot();
    this.trace.push(
      Object.freeze({
        label,
        roomId: world.roomId,
        phase: journey.phase,
        routeChoice: journey.routeChoice,
        checkpointId: journey.checkpointId,
        bossDefeated: journey.bossDefeated,
        bossRewardClaimed: journey.bossRewardClaimed,
        returnedWithReward: journey.returnedWithReward,
        gold: journey.gold,
      }),
    );
  }

  usePortal(portalId, destinationRoomId, label, { extraInput = {} } = {}) {
    const portal = this.scene.mapRuntime.getPortal(portalId);
    assert.ok(portal, `${label}: ${portalId} Portal이 사용 가능해야 합니다.`);
    const active = this.scene.mapRuntime.getActiveLocation();
    const endpoint =
      portal.from.regionId === active.regionId && portal.from.roomId === active.roomId
        ? portal.from
        : portal.to;
    this.moveTo(this.worldX(endpoint.anchor.x), `${label} Portal`);
    this.press('jump', extraInput);
    assert.ok(
      this.scene.mapRuntime.getTransition(),
      `${label}: Portal transition이 시작되어야 합니다.`,
    );
    for (let index = 0; index < 120 && this.scene.mapRuntime.getTransition(); index += 1) {
      this.tick(extraInput);
    }
    assert.equal(
      this.scene.mapRuntime.getActiveLocation().roomId,
      destinationRoomId,
      `${label}: 목적 Room으로 원자 전환되어야 합니다.`,
    );
    this.record(label);
  }

  completeDialogue(localX, expectedSpeaker, label) {
    this.moveTo(this.worldX(localX), `${label} interaction`);
    let dialogue = this.scene.getWorldStatus().dialogue;
    assert.equal(
      dialogue.available,
      true,
      `${label}: interaction이 범위 안에 있어야 합니다. ${JSON.stringify({
        player: this.scene.position,
        dialogue,
        entities: this.scene.mapRuntime
          .getResolvedSnapshot()
          .entities.filter(({ kind }) => kind === 'story-interaction')
          .map(({ id, position, enabled }) => ({ id, position, enabled })),
      })}`,
    );
    assert.equal(dialogue.speaker, expectedSpeaker, `${label}: speaker가 일치해야 합니다.`);
    const startY = this.scene.position.y;
    const startVelocity = this.scene.verticalVelocity;
    this.press('jump');
    dialogue = this.scene.getWorldStatus().dialogue;
    assert.equal(dialogue.active, true, `${label}: 대화가 시작되어야 합니다.`);
    assert.equal(
      this.scene.position.y,
      startY,
      `${label}: 대화 jump가 Player를 뛰게 하면 안 됩니다.`,
    );
    assert.equal(
      this.scene.verticalVelocity,
      startVelocity,
      `${label}: 대화 jump가 vertical velocity를 바꾸면 안 됩니다.`,
    );
    while (this.scene.getWorldStatus().dialogue.active) this.press('jump');
  }

  fightCurrentEncounter(label, { isCompleted, maximumTicks = 12000 } = {}) {
    const encounterRoomId = this.scene.mapRuntime.getActiveLocation().roomId;
    let previousHealth = Infinity;
    let damageEvents = 0;
    const stateCounts = {};
    for (let index = 0; index < maximumTicks; index += 1) {
      const enemy = this.scene.roomSceneNode?.getEncounterGameplaySnapshot();
      if (!enemy || enemy.health <= 0) {
        assert.equal(
          this.scene.mapRuntime.getActiveLocation().roomId,
          encounterRoomId,
          `${label}: KO로 다른 Room에 복귀한 상태를 승리로 판정하면 안 됩니다.`,
        );
        assert.ok(damageEvents > 0, `${label}: 실제 combat contact로 피해를 줘야 합니다.`);
        assert.equal(isCompleted?.(), true, `${label}: progression 완료 조건이 기록되어야 합니다.`);
        this.record(label);
        return;
      }
      if (enemy.health < previousHealth) damageEvents += 1;
      previousHealth = enemy.health;
      stateCounts[`${enemy.aiState}:${enemy.attackKind}`] =
        (stateCounts[`${enemy.aiState}:${enemy.attackKind}`] ?? 0) + 1;
      const gap = enemy.position.x - this.scene.position.x;
      const combat = this.scene.combatCommands.snapshot();
      if (this.scene.rollState) {
        this.tick();
        continue;
      }
      if (
        enemy.aiState === 'windup' &&
        enemy.attackKind === 'heavy' &&
        Math.abs(gap) <= 70 &&
        combat.id === 'idle' &&
        combat.stamina >= 24
      ) {
        this.press('strongAttack');
        continue;
      }
      if (['windup', 'attack'].includes(enemy.aiState)) {
        this.tick(gap > 0 ? { left: true } : { right: true });
        continue;
      }
      if (enemy.punishWindowOpen && Math.abs(gap) > 42) {
        this.tick(gap > 0 ? { right: true } : { left: true });
        continue;
      }
      const attackOpportunity = enemy.punishWindowOpen;
      if (attackOpportunity && combat.id === 'idle' && combat.stamina >= 24) {
        this.press('strongAttack');
        continue;
      }
      if (!enemy.punishWindowOpen && Math.abs(gap) < 92) {
        this.tick(gap > 0 ? { left: true } : { right: true });
        continue;
      }
      if (!enemy.punishWindowOpen && Math.abs(gap) > 108) {
        this.tick(gap > 0 ? { right: true } : { left: true });
        continue;
      }
      this.tick();
    }
    const enemy = this.scene.roomSceneNode?.getEncounterGameplaySnapshot();
    assert.fail(
      `${label}: 제한 tick 안에 encounter를 끝내지 못했습니다. HP ${enemy?.health} ${JSON.stringify(
        stateCounts,
      )}`,
    );
  }
}

function verifyDebugFreeFirstJourney() {
  const driver = new RuntimeDriver(undefined, { keyboardInput: true });
  const { scene } = driver;
  driver.record('prepare');
  driver.completeDialogue(488, '세라 교관', '학원촌 준비 대화');
  driver.usePortal('academy-field-portal', 'field-crossing', 'Field 출정');
  driver.completeDialogue(540, '세라 교관의 정찰 표식', 'Field route 선택 대화');
  driver.usePortal('field-bypass-portal', 'field-canopy', '수관 우회 선택');
  driver.usePortal('bypass-dungeon-portal', 'sealed-forest-dungeon', 'Dungeon 진입');
  driver.fightCurrentEncounter('Dungeon guardian 격파', {
    isCompleted: () => scene.journeyProgress.snapshot().dungeonGuardianDefeated,
  });
  driver.moveTo(driver.worldX(850), 'Dungeon checkpoint trigger');
  assert.equal(scene.journeyProgress.snapshot().checkpointActivated, true);
  driver.record('Checkpoint 활성');
  driver.completeDialogue(760, '봉인 회랑 기록석', 'Checkpoint 기록 대화');
  driver.usePortal('dungeon-boss-portal', 'sealed-forest-boss', 'Boss 진입');
  driver.fightCurrentEncounter('Boss 격파', {
    isCompleted: () => scene.journeyProgress.snapshot().bossDefeated,
  });
  driver.completeDialogue(480, '봉인 핵의 잔향', 'Boss 결과 대화');
  driver.moveTo(driver.worldX(800), 'Boss reward trigger');
  const rewarded = scene.journeyProgress.snapshot();
  assert.equal(rewarded.bossRewardClaimed, true);
  assert.equal(rewarded.gold, 120);
  driver.record('Boss 보상 회수');
  driver.usePortal('boss-shortcut-portal', 'academy-plaza', 'Shortcut 귀환');
  driver.completeDialogue(488, '세라 교관', '귀환 반응 대화');
  const completed = scene.journeyProgress.snapshot();
  assert.equal(completed.returnedWithReward, true);
  assert.equal(completed.gold, 120);
  assert.deepEqual(
    driver.trace.map(({ phase }) => phase),
    [
      'prepare',
      'field',
      'field',
      'dungeon',
      'dungeon',
      'checkpoint',
      'boss',
      'reward',
      'reward',
      'returned',
    ],
  );
  return Object.freeze({ progression: scene.getProgressionSnapshot(), trace: driver.trace });
}

function verifyTransitionFailureRollback() {
  const driver = new RuntimeDriver();
  const { scene } = driver;
  const sourceRoomScene = scene.roomSceneNode;
  const sourcePosition = { ...scene.position };
  driver.moveTo(driver.worldX(910), 'failure-injection Portal');
  sourcePosition.x = scene.position.x;
  sourcePosition.y = scene.position.y;
  const originalAddChild = scene.addChild.bind(scene);
  let injectOnce = true;
  scene.addChild = (child) => {
    if (injectOnce && child.name === 'Room:field-crossing') {
      injectOnce = false;
      throw new Error('injected Room Scene activation failure');
    }
    return originalAddChild(child);
  };
  driver.sequences.jump += 1;
  driver.sequences.strongAttack += 1;
  const heldFailureInput = {
    jump: true,
    jumpSequence: driver.sequences.jump,
    strongAttack: true,
    strongAttackSequence: driver.sequences.strongAttack,
  };
  driver.tick(heldFailureInput);
  for (let index = 0; index < 120 && scene.mapRuntime.getTransition(); index += 1) {
    driver.tick(heldFailureInput);
  }
  assert.equal(scene.mapRuntime.getActiveLocation().roomId, 'academy-plaza');
  assert.equal(
    scene.roomSceneNode,
    sourceRoomScene,
    '실패 전에 활성인 Room Scene을 유지해야 합니다.',
  );
  assert.equal(sourceRoomScene.isDisposed, false);
  assert.equal(sourceRoomScene.parent, scene);
  assert.equal(sourceRoomScene.isInsideTree, true);
  assert.ok(scene.children.includes(sourceRoomScene));
  assert.deepEqual(scene.position, sourcePosition);
  assert.equal(scene.journeyProgress.snapshot().phase, 'prepare');
  assert.match(scene.getWorldStatus().encounterHint, /Room 전환 실패.*복구/);
  const staminaBefore = scene.combatCommands.snapshot().stamina;
  driver.tick(heldFailureInput);
  assert.equal(
    scene.combatCommands.snapshot().id,
    'idle',
    '실패 중 입력을 뒤늦게 재생하면 안 됩니다.',
  );
  assert.equal(scene.combatCommands.snapshot().stamina, staminaBefore);
  driver.usePortal('academy-field-portal', 'field-crossing', '실패 뒤 Portal 재시도');
  assert.equal(scene.journeyProgress.snapshot().phase, 'field');
}

function verifyTransitionSourceExitFailureRollback() {
  const driver = new RuntimeDriver();
  const { scene } = driver;
  const detachedSource = scene.roomSceneNode;
  driver.moveTo(driver.worldX(910), 'source-exit failure Portal');
  const sourcePosition = { ...scene.position };
  const originalExit = detachedSource.onExitTree.bind(detachedSource);
  let injectOnce = true;
  detachedSource.onExitTree = () => {
    originalExit();
    if (injectOnce) {
      injectOnce = false;
      throw new Error('injected source Room Scene exit failure');
    }
  };
  driver.press('jump');
  assert.ok(scene.mapRuntime.getTransition());
  for (let index = 0; index < 120 && scene.mapRuntime.getTransition(); index += 1) driver.tick();
  assert.equal(scene.mapRuntime.getActiveLocation().roomId, 'academy-plaza');
  assert.deepEqual(scene.position, sourcePosition);
  assert.notEqual(
    scene.roomSceneNode,
    detachedSource,
    'detached source 대신 fresh source Room Scene을 복구해야 합니다.',
  );
  assert.equal(scene.roomSceneNode.parent, scene);
  assert.equal(scene.roomSceneNode.isInsideTree, true);
  assert.ok(scene.children.includes(scene.roomSceneNode));
  assert.equal(detachedSource.isDisposed, true);
  assert.equal(scene.journeyProgress.snapshot().phase, 'prepare');
  assert.match(scene.getWorldStatus().encounterHint, /Room 전환 실패.*복구/);
  driver.usePortal('academy-field-portal', 'field-crossing', 'source-exit 실패 뒤 재시도');
}

function verifyTransitionSourceDisposeFailureRollback() {
  const driver = new RuntimeDriver();
  const { scene } = driver;
  const disposedSource = scene.roomSceneNode;
  driver.moveTo(driver.worldX(910), 'source-dispose failure Portal');
  const sourceLocation = { ...scene.mapRuntime.getActiveLocation() };
  const sourcePosition = { ...scene.position };
  const sourceCameraPosition = { ...scene.cameraPosition };
  const originalDispose = disposedSource.dispose.bind(disposedSource);
  let injectOnce = true;
  disposedSource.dispose = () => {
    const disposed = originalDispose();
    if (injectOnce) {
      injectOnce = false;
      throw new Error('injected source Room Scene dispose failure');
    }
    return disposed;
  };

  driver.sequences.jump += 1;
  driver.sequences.strongAttack += 1;
  const heldFailureInput = driver.snapshot({
    jump: true,
    jumpSequence: driver.sequences.jump,
    strongAttack: true,
    strongAttackSequence: driver.sequences.strongAttack,
  });
  driver.tick(heldFailureInput);
  for (let index = 0; index < 120 && scene.mapRuntime.getTransition(); index += 1) {
    driver.tick(heldFailureInput);
  }

  assert.deepEqual(scene.mapRuntime.getActiveLocation(), sourceLocation);
  assert.deepEqual(scene.position, sourcePosition);
  assert.deepEqual(scene.cameraPosition, sourceCameraPosition);
  assert.notEqual(
    scene.roomSceneNode,
    disposedSource,
    'dispose 실패 뒤에는 이미 해제된 source 대신 fresh Room Scene을 복구해야 합니다.',
  );
  assert.equal(disposedSource.isDisposed, true);
  assert.equal(scene.roomSceneNode.parent, scene);
  assert.equal(scene.roomSceneNode.isInsideTree, true);
  assert.ok(scene.children.includes(scene.roomSceneNode));
  assert.equal(scene.journeyProgress.snapshot().phase, 'prepare');
  assert.match(scene.getWorldStatus().encounterHint, /Room 전환 실패.*복구/);

  const staminaBefore = scene.combatCommands.snapshot().stamina;
  driver.tick(heldFailureInput);
  assert.equal(scene.combatCommands.snapshot().id, 'idle');
  assert.equal(
    scene.combatCommands.snapshot().stamina,
    staminaBefore,
    'dispose 실패 중 입력을 복구 뒤 재생하면 안 됩니다.',
  );
  driver.usePortal('academy-field-portal', 'field-crossing', 'source-dispose 실패 뒤 재시도');
}

function verifyKoResetAndDurableInvariants(completedProgression) {
  const driver = new RuntimeDriver(
    createTestGameScene({
      mapDefinition: ACADEMY_VILLAGE_MAP,
      progressionSnapshot: completedProgression,
    }),
  );
  const { scene } = driver;
  driver.usePortal('academy-field-portal', 'field-crossing', 'KO trace Field 진입');
  driver.usePortal('field-bypass-portal', 'field-canopy', 'KO trace 우회');
  driver.usePortal('bypass-dungeon-portal', 'sealed-forest-dungeon', 'KO trace Dungeon');
  driver.usePortal('dungeon-boss-portal', 'sealed-forest-boss', 'KO trace Boss');
  const durableBefore = scene.journeyProgress.persistenceSnapshot();
  driver.sequences.basicAttack += 1;
  const heldAttack = driver.snapshot({
    basicAttack: true,
    basicAttackSequence: driver.sequences.basicAttack,
  });
  scene.applyTrainingEncounterPlayerResult({
    kind: 'hit',
    damage: 1000,
    knockbackVelocityX: -240,
    knockbackDecayRate: 0.02,
    hitstunSeconds: 0.2,
    invulnerableSeconds: 0,
    hitStopSeconds: 0,
  });
  for (let index = 0; index < 240; index += 1) scene.update(STEP_SECONDS, heldAttack);
  assert.equal(scene.mapRuntime.getActiveLocation().roomId, 'sealed-forest-dungeon');
  assert.equal(scene.playerHealth, scene.playerMaxHealth);
  assert.equal(
    scene.combatCommands.snapshot().id,
    'idle',
    'KO 전에 누른 공격을 복귀 뒤 재생하면 안 됩니다.',
  );
  assert.deepEqual(scene.journeyProgress.persistenceSnapshot(), durableBefore);
  assert.equal(scene.journeyProgress.snapshot().gold, 120);
  assert.equal(scene.journeyProgress.snapshot().bossRewardClaimed, true);
  assert.equal(scene.journeyProgress.snapshot().returnedWithReward, true);
  driver.usePortal('dungeon-boss-portal', 'sealed-forest-boss', 'KO 뒤 Boss Room 재진입');
  const portalIds = scene.mapRuntime.getResolvedSnapshot().portals.map(({ id }) => id);
  const triggerIds = scene.mapRuntime.getResolvedSnapshot().triggers.map(({ id }) => id);
  assert.ok(portalIds.includes('boss-shortcut-portal'), 'KO 뒤 열린 shortcut을 유지해야 합니다.');
  assert.ok(!triggerIds.includes('boss-reward-trigger'), 'KO 뒤 보상을 다시 지급하면 안 됩니다.');
  assert.equal(
    scene.roomSceneNode.getEncounterGameplaySnapshot(),
    null,
    '격파한 Boss가 부활하면 안 됩니다.',
  );
}

const journey = verifyDebugFreeFirstJourney();
verifyTransitionFailureRollback();
verifyTransitionSourceExitFailureRollback();
verifyTransitionSourceDisposeFailureRollback();
verifyKoResetAndDurableInvariants(journey.progression);

console.log(
  JSON.stringify(
    {
      probe: 'first-journey-runtime-recovery',
      assertions: [
        'debug-free-public-input-story-portal-combat-flow',
        'atomic-room-transition-failure-rollback-and-stale-input-consumption',
        'source-room-exit-failure-restores-attached-active-scene',
        'source-room-dispose-failure-restores-fresh-attached-scene',
        'ko-checkpoint-reset-with-reward-and-shortcut-idempotence',
      ],
      trace: journey.trace,
    },
    null,
    2,
  ),
);
