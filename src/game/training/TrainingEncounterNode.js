import { SpinContactConstraint } from '../../combat/SpinContactConstraint.js';
import { COMBAT_EVENT_TYPE } from '../../combat/CombatEvent.js';
import { combatFramesToSeconds } from '../../combat/CombatFrame.js';
import { resolveRecoveryPunish } from '../../combat/RecoveryPunish.js';
import {
  closestCombatContact,
  sampleTrainingEnemyCombatGeometry,
  sampleTrainingEnemyWeaponLength,
} from '../../combat/SharedCombatGeometry.js';
import { Scene } from '../../core/Scene.js';
import { SceneNode } from '../../core/SceneNode.js';
import { Signal } from '../../core/Signal.js';
import { resolveSwordEnchantment } from '../enchantment/EnchantmentPolicy.js';

const GRAVITY = 1180;
const RESET_SECONDS = combatFramesToSeconds(60);
const HIT_REACTION_RECOVERY_SECONDS = combatFramesToSeconds(11);
const MAX_JUGGLE_HITS = 6;
const MAX_JUGGLE_SECONDS = 3.2;
const JUGGLE_GRAVITY_STEP = 0.3;
const PLAYER_HURT_MARGIN = 28;

function freezePosition(position) {
  return Object.freeze({ x: position.x, y: position.y });
}

function assertEncounterProfiles(profiles) {
  if (!profiles || typeof profiles !== 'object') {
    throw new TypeError(
      'TrainingEncounter Scene에는 authored encounter profile 주입이 필요합니다.',
    );
  }
  return profiles;
}

function assertAttackProfiles(profiles) {
  if (!profiles || typeof profiles !== 'object' || !profiles.light) {
    throw new TypeError('TrainingEncounter Scene에는 authored attack profile 주입이 필요합니다.');
  }
  return profiles;
}

function resolveEncounterProfile(profiles, profileId = 'training') {
  const profile = profiles[profileId];
  if (!profile) throw new Error(`알 수 없는 encounter profile입니다: ${profileId}`);
  return profile;
}

function selectEncounterAttack(profile, patternIndex, healthRatio = 1) {
  const phaseIndex = healthRatio <= 0.5 && profile.attackPatterns.length > 1 ? 1 : 0;
  const pattern = profile.attackPatterns[phaseIndex];
  return pattern[Math.max(0, patternIndex) % pattern.length];
}

function createPostureState(profile) {
  const posture = profile.posture;
  if (!posture) return null;
  if (!(
    Number.isFinite(posture.maximum) &&
    posture.maximum > 0 &&
    Number.isFinite(posture.groggySeconds)
  )) {
    throw new RangeError('encounter posture profile은 maximum과 groggySeconds를 가져야 합니다.');
  }
  return { current: posture.maximum, maximum: posture.maximum, groggySeconds: 0 };
}

function postureSnapshot(posture) {
  if (!posture) return undefined;
  return Object.freeze({
    current: posture.current,
    maximum: posture.maximum,
    ratio: posture.current / posture.maximum,
    groggy: posture.groggySeconds > 0,
    groggySeconds: posture.groggySeconds,
  });
}

function createWeakPointState(profile) {
  const weakPoint = profile.weakPoint;
  if (!weakPoint) return null;
  if (
    profile.role !== 'boss' ||
    typeof weakPoint.id !== 'string' ||
    weakPoint.id.trim().length === 0 ||
    typeof weakPoint.label !== 'string' ||
    weakPoint.label.trim().length === 0 ||
    !Array.isArray(weakPoint.triggerAttackKinds) ||
    weakPoint.triggerAttackKinds.length === 0 ||
    weakPoint.triggerAttackKinds.some(
      (attackKind) => typeof attackKind !== 'string' || attackKind.trim().length === 0,
    ) ||
    !Number.isFinite(weakPoint.damageMultiplier) ||
    weakPoint.damageMultiplier <= 1 ||
    !weakPoint.presentation ||
    !Number.isFinite(weakPoint.presentation.offsetX) ||
    !Number.isFinite(weakPoint.presentation.offsetY) ||
    typeof weakPoint.presentation.color !== 'string' ||
    typeof weakPoint.presentation.highlightColor !== 'string'
  ) {
    throw new TypeError('Boss weak point는 trigger 공격, 1 초과 배율과 presentation이 필요합니다.');
  }
  return {
    id: weakPoint.id,
    label: weakPoint.label,
    triggerAttackKinds: Object.freeze([...weakPoint.triggerAttackKinds]),
    damageMultiplier: weakPoint.damageMultiplier,
    presentation: Object.freeze({ ...weakPoint.presentation }),
    exposed: false,
    exposureAttackKind: null,
  };
}

function weakPointSnapshot(weakPoint) {
  if (!weakPoint) return undefined;
  return Object.freeze({
    id: weakPoint.id,
    label: weakPoint.label,
    damageMultiplier: weakPoint.damageMultiplier,
    presentation: weakPoint.presentation,
    exposed: weakPoint.exposed,
    exposureAttackKind: weakPoint.exposureAttackKind,
  });
}

function freezeMaterialReward(reward) {
  if (reward === null || reward === undefined) return null;
  if (
    typeof reward !== 'object' ||
    typeof reward.elementId !== 'string' ||
    reward.elementId.trim().length === 0 ||
    !Number.isSafeInteger(reward.quantity) ||
    reward.quantity <= 0
  ) {
    throw new TypeError('Encounter material reward는 elementId와 양의 정수 quantity가 필요합니다.');
  }
  return Object.freeze({ elementId: reward.elementId, quantity: reward.quantity });
}

export class TrainingEncounterNode extends SceneNode {
  constructor({
    entity,
    groundY,
    movementBounds,
    spinContact,
    encounterProfiles,
    attackProfiles,
    enchantmentContext = null,
  }) {
    super('TrainingEncounter');
    if (!entity || !['combat-test-mob', 'combat-enemy'].includes(entity.kind)) {
      throw new TypeError('Encounter Scene에는 지원하는 combat enemy entity가 필요합니다.');
    }
    if (!Number.isFinite(groundY)) {
      throw new TypeError('TrainingEncounter Scene에는 유효한 groundY가 필요합니다.');
    }
    if (
      !movementBounds ||
      !Number.isFinite(movementBounds.minX) ||
      !Number.isFinite(movementBounds.maxX)
    ) {
      throw new TypeError('TrainingEncounter Scene에는 Room movementBounds가 필요합니다.');
    }
    if (!spinContact?.hitPulses || !spinContact?.contactSpacings) {
      throw new TypeError('TrainingEncounter Scene에는 spin contact frame data가 필요합니다.');
    }

    this.encounterProfiles = assertEncounterProfiles(encounterProfiles);
    this.attackProfiles = assertAttackProfiles(attackProfiles);
    const encounterProfile = resolveEncounterProfile(
      this.encounterProfiles,
      entity.encounterProfileId ?? 'training',
    );
    this.entity = Object.freeze({
      id: entity.id,
      position: freezePosition(entity.position ?? { x: 680, y: groundY }),
      maxHealth: Number.isFinite(entity.maxHealth) ? Math.max(1, entity.maxHealth) : 100,
      encounterProfile,
      materialReward: freezeMaterialReward(encounterProfile.materialReward),
    });
    this.groundY = groundY;
    this.movementBounds = Object.freeze({ ...movementBounds });
    this.spinContactOptions = Object.freeze({
      hitPulses: spinContact.hitPulses,
      contactSpacings: spinContact.contactSpacings,
    });
    this.enchantmentContext = Object.freeze({
      swordId: enchantmentContext?.swordId ?? null,
      level: enchantmentContext?.level ?? 0,
      active: enchantmentContext?.active ?? null,
    });
    this.playerResultResolved = this.ownSignal(new Signal('playerResultResolved'));
    this.combatEventOccurred = this.ownSignal(new Signal('combatEventOccurred'));
    this.cameraFeedbackOccurred = this.ownSignal(new Signal('cameraFeedbackOccurred'));
    this.encounterCompleted = this.ownSignal(new Signal('encounterCompleted'));
    this.reset();
  }

  reset() {
    this.assertNotDisposed();
    const maxHealth = this.entity.maxHealth;
    const encounterProfile = this.entity.encounterProfile;
    const posture = createPostureState(encounterProfile);
    const weakPoint = createWeakPointState(encounterProfile);
    this.enemy = {
      id: this.entity.id,
      profileId: encounterProfile.id,
      role: encounterProfile.role,
      species: encounterProfile.species ?? 'golem',
      label: encounterProfile.label,
      presentationScale: encounterProfile.presentationScale,
      position: { ...this.entity.position },
      groundY: this.groundY,
      velocityX: 0,
      velocityY: 0,
      rotation: 0,
      angularVelocity: 0,
      health: maxHealth,
      maxHealth,
      hitFlashSeconds: 0,
      resetSeconds: 0,
      juggleHits: 0,
      juggleSeconds: 0,
      juggleFloatSeconds: 0,
      juggleGravityScale: 1,
      juggleLocked: false,
      groundBouncePending: false,
      groundBounceDelaySeconds: 0,
      groundImpactSeconds: 0,
      aiState: 'idle',
      aiSeconds: 0.45,
      patternIndex: -1,
      attackConnected: false,
      hitstunSeconds: 0,
      attackKind: 'light',
      facing: -1,
      attackFacing: -1,
      recoveryStartAngle: -0.65,
      recoveryBodyStartRotation: 0,
      recoveryDurationSeconds: 0.24,
      recoverySource: 'attack',
      recoveryAdvanceDeferred: false,
      recoveryCompletionPending: false,
      retaliationInvulnerableSeconds: 0,
      comboCycleHitPending: false,
      lastReceivedComboCycle: 0,
      retaliationProtectedComboCycle: 0,
      retaliationCycleClaimed: false,
      hitReactionWeaponAngle: -0.65,
      hitReactionWeaponLength: this.attackProfiles.light.weaponLength,
      punishWindowOpen: false,
      punishWindowOrigin: null,
      punishComboCycle: 0,
      lastCommandTransition: null,
      enchantStatus: null,
      enchantTickSeconds: 0,
      ...(posture ? { posture } : {}),
      ...(weakPoint ? { weakPoint } : {}),
    };
    this.completionEmitted = false;
    this.lastHitMotionSequence = '';
    this.lastVisualContact = null;
    this.contactSeconds = 0;
    this.confirmedComboCycle = 0;
    this.slamAttackerBouncePending = false;
    this.spinContactConstraint = new SpinContactConstraint(this.spinContactOptions);
  }

  setEnchantmentContext(context) {
    this.enchantmentContext = Object.freeze({
      swordId: context?.swordId ?? null,
      level: context?.level ?? 0,
      active: context?.active ?? null,
    });
  }

  onExitTree() {
    this.lastVisualContact = null;
    this.contactSeconds = 0;
    this.spinContactConstraint.reset();
  }

  setVisualQaPostureScenario(state, { emitBreak = false } = {}) {
    const enemy = this.enemy;
    if (state === 'absent') {
      if (enemy.posture) throw new Error('일반 적 posture QA에는 posture state가 없어야 합니다.');
      return null;
    }
    if (!enemy.posture) throw new Error('posture QA에는 posture-enabled encounter가 필요합니다.');
    if (!['full', 'reduced', 'groggy'].includes(state)) {
      throw new Error(`지원하지 않는 posture QA state입니다: ${state}`);
    }
    enemy.posture.current =
      state === 'full'
        ? enemy.posture.maximum
        : state === 'reduced'
          ? enemy.posture.maximum * 0.42
          : 0;
    enemy.posture.groggySeconds = state === 'groggy' ? 0.8 : 0;
    enemy.aiState = state === 'groggy' ? 'groggy' : 'idle';
    enemy.aiSeconds = state === 'groggy' ? 0.8 : 0;
    enemy.punishWindowOpen = state === 'groggy';
    enemy.punishWindowOrigin = state === 'groggy' ? 'posture' : null;
    if (state === 'groggy' && emitBreak) {
      this.contactSeconds = 0.18;
      this.emitCombatEvent(COMBAT_EVENT_TYPE.GUARD_BREAK, {
        actor: 'player',
        target: 'enemy',
        attackId: 'shieldBash',
        outcome: 'posture-break',
        position: this.lastVisualContact?.position ?? enemy.position,
        direction: 1,
        strength: 2.3,
      });
    }
    return postureSnapshot(enemy.posture);
  }

  getGameplaySnapshot() {
    if (!this.enemy) return null;
    const enemy = this.enemy;
    return Object.freeze({
      id: enemy.id,
      position: freezePosition(enemy.position),
      groundY: enemy.groundY,
      health: enemy.health,
      maxHealth: enemy.maxHealth,
      profileId: enemy.profileId,
      role: enemy.role,
      species: enemy.species,
      label: enemy.label,
      materialReward: this.entity.materialReward,
      aiState: enemy.aiState,
      attackKind: enemy.attackKind,
      recoverySource: enemy.recoverySource,
      punishWindowOpen: enemy.punishWindowOpen,
      velocityX: enemy.velocityX,
      velocityY: enemy.velocityY,
      juggleHits: enemy.juggleHits,
      juggleLocked: enemy.juggleLocked,
      groundBounceDelaySeconds: enemy.groundBounceDelaySeconds,
      slamAttackerBouncePending: this.slamAttackerBouncePending,
      lastCommandTransition: enemy.lastCommandTransition,
      enchantStatus: enemy.enchantStatus ? Object.freeze({ ...enemy.enchantStatus }) : null,
      ...(enemy.posture ? { posture: postureSnapshot(enemy.posture) } : {}),
      ...(enemy.weakPoint ? { weakPoint: weakPointSnapshot(enemy.weakPoint) } : {}),
    });
  }

  createCompletionResult() {
    return Object.freeze({
      entityId: this.enemy.id,
      profileId: this.enemy.profileId,
      role: this.enemy.role,
      materialReward: this.entity.materialReward,
    });
  }

  completeForVisualQa() {
    if (this.completionEmitted || this.enemy.health <= 0) {
      throw new Error('Visual QA completion은 active enemy life에 한 번만 적용할 수 있습니다.');
    }
    this.enemy.health = 0;
    this.completionEmitted = true;
    if (this.entity.encounterProfile.respawns) this.enemy.resetSeconds = RESET_SECONDS;
    const result = this.createCompletionResult();
    this.encounterCompleted.emit(result);
    return result;
  }

  createRenderSnapshot(renderOrder) {
    const enemy = this.enemy;
    if (!enemy)
      return Object.freeze({
        enemy: null,
        presentationState: null,
        geometry: null,
        renderOrder,
        contact: null,
      });
    const presentationState = Object.freeze({
      ...enemy,
      position: freezePosition(enemy.position),
      ...(enemy.posture ? { posture: postureSnapshot(enemy.posture) } : {}),
      ...(enemy.weakPoint ? { weakPoint: weakPointSnapshot(enemy.weakPoint) } : {}),
      enchantStatus: enemy.enchantStatus ? Object.freeze({ ...enemy.enchantStatus }) : null,
    });
    return Object.freeze({
      enemy: Object.freeze({
        id: enemy.id,
        position: freezePosition(enemy.position),
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        airborne: enemy.position.y < enemy.groundY,
        juggleHits: enemy.juggleHits,
        juggleLimit: MAX_JUGGLE_HITS,
        juggleLocked: enemy.juggleLocked,
        retaliationSeconds: enemy.retaliationInvulnerableSeconds,
        role: enemy.role,
        species: enemy.species,
        label: enemy.label,
        punishWindowOpen: enemy.punishWindowOpen,
        attack: Object.freeze({
          kind: enemy.attackKind,
          frame: null,
        }),
        lastCommandTransition: enemy.lastCommandTransition,
        ...(enemy.posture ? { posture: postureSnapshot(enemy.posture) } : {}),
        ...(enemy.weakPoint ? { weakPoint: weakPointSnapshot(enemy.weakPoint) } : {}),
      }),
      presentationState,
      geometry: sampleTrainingEnemyCombatGeometry(presentationState, this.attackProfiles),
      renderOrder,
      contact:
        this.contactSeconds > 0 && this.lastVisualContact
          ? Object.freeze({ ...this.lastVisualContact, remainingSeconds: this.contactSeconds })
          : null,
    });
  }

  step(deltaSeconds, frame) {
    if (!this.isInsideTree) return;
    this.contactSeconds = Math.max(0, this.contactSeconds - deltaSeconds);
    this.updateEnchantStatus(deltaSeconds);
    this.updateEnemyPhysics(deltaSeconds, frame.player);
    this.updateSpinContact(frame.combatState, frame.player, deltaSeconds);
    this.updateEnemyCombat(deltaSeconds, frame);
    this.finishComboCycle(frame.combatState);
    this.updateRetaliationProtection(frame.combatState);
    this.resolvePlayerAttack(frame);
  }

  updateEnchantStatus(deltaSeconds) {
    const enemy = this.enemy;
    if (!enemy.enchantStatus || enemy.enchantStatus.remainingSeconds <= 0) return;
    enemy.enchantStatus.remainingSeconds = Math.max(
      0,
      enemy.enchantStatus.remainingSeconds - deltaSeconds,
    );
    if (enemy.enchantStatus.id === 'fire') {
      enemy.enchantTickSeconds += deltaSeconds;
      while (enemy.enchantTickSeconds >= 0.5 && enemy.health > 0) {
        enemy.enchantTickSeconds -= 0.5;
        enemy.health = Math.max(0, enemy.health - 2);
      }
    }
    if (enemy.enchantStatus.remainingSeconds === 0) {
      enemy.enchantStatus = null;
      enemy.enchantTickSeconds = 0;
    }
    if (enemy.health === 0 && !this.completionEmitted) {
      this.completionEmitted = true;
      if (this.entity.encounterProfile.respawns) enemy.resetSeconds = RESET_SECONDS;
      this.encounterCompleted.emit(this.createCompletionResult());
    }
  }

  startRecovery({
    source,
    durationSeconds,
    weaponStartAngle,
    bodyStartRotation,
    deferAdvance = false,
  }) {
    const enemy = this.enemy;
    enemy.aiState = 'recovery';
    enemy.aiSeconds = durationSeconds;
    enemy.recoverySource = source;
    enemy.recoveryDurationSeconds = durationSeconds;
    enemy.recoveryStartAngle = weaponStartAngle;
    enemy.recoveryBodyStartRotation = bodyStartRotation;
    enemy.recoveryAdvanceDeferred = deferAdvance;
    enemy.recoveryCompletionPending = false;
    this.setWeakPointExposure(
      source === 'attack' && enemy.weakPoint?.triggerAttackKinds.includes(enemy.attackKind),
      enemy.attackKind,
    );
    const posturePunishActive =
      enemy.punishWindowOrigin === 'posture' && enemy.posture?.groggySeconds > 0;
    if (!posturePunishActive) {
      enemy.punishWindowOpen = source === 'attack';
      enemy.punishWindowOrigin = enemy.punishWindowOpen ? 'recovery' : null;
      if (!enemy.punishWindowOpen) enemy.punishComboCycle = 0;
    }
  }

  setWeakPointExposure(exposed, attackKind = null) {
    const weakPoint = this.enemy.weakPoint;
    if (!weakPoint) return null;
    weakPoint.exposed = exposed === true;
    weakPoint.exposureAttackKind = weakPoint.exposed ? attackKind : null;
    return weakPointSnapshot(weakPoint);
  }

  setVisualQaWeakPointExposure(exposed = true) {
    const weakPoint = this.enemy.weakPoint;
    if (!weakPoint) throw new Error('Weak point QA에는 authored Boss weak point가 필요합니다.');
    const attackKind = weakPoint.triggerAttackKinds[0];
    this.enemy.attackKind = attackKind;
    this.enemy.attackFacing = -1;
    if (exposed) {
      this.startRecovery({
        source: 'attack',
        durationSeconds: 0.54,
        weaponStartAngle: attackKind === 'sweep' ? -0.3 : 0.6,
        bodyStartRotation: 0.28,
      });
    } else {
      this.enemy.aiState = 'idle';
      this.enemy.aiSeconds = 0;
      this.enemy.punishWindowOpen = false;
      this.enemy.punishWindowOrigin = null;
      this.setWeakPointExposure(false);
    }
    return weakPointSnapshot(weakPoint);
  }

  updateEnemyPhysics(deltaSeconds, player) {
    const enemy = this.enemy;
    enemy.hitFlashSeconds = Math.max(0, enemy.hitFlashSeconds - deltaSeconds);
    if (enemy.posture?.groggySeconds > 0) {
      enemy.posture.groggySeconds = Math.max(0, enemy.posture.groggySeconds - deltaSeconds);
      if (enemy.posture.groggySeconds === 0) {
        enemy.posture.current = enemy.posture.maximum;
        if (enemy.punishWindowOrigin === 'posture') {
          enemy.punishWindowOpen = false;
          enemy.punishWindowOrigin = null;
          enemy.punishComboCycle = 0;
        }
        if (enemy.aiState === 'groggy') {
          enemy.aiState = 'idle';
          enemy.aiSeconds = this.entity.encounterProfile.idleSeconds;
        }
      }
    }
    if (enemy.position.y >= enemy.groundY) {
      enemy.retaliationInvulnerableSeconds = Math.max(
        0,
        enemy.retaliationInvulnerableSeconds - deltaSeconds,
      );
    }
    const previousHitstun = enemy.hitstunSeconds;
    enemy.hitstunSeconds = Math.max(0, enemy.hitstunSeconds - deltaSeconds);
    if (previousHitstun > 0 && enemy.hitstunSeconds === 0) {
      this.startRecovery({
        source: 'hitReaction',
        durationSeconds: HIT_REACTION_RECOVERY_SECONDS,
        weaponStartAngle: enemy.hitReactionWeaponAngle,
        bodyStartRotation: enemy.rotation,
        deferAdvance: true,
      });
    }
    enemy.groundImpactSeconds = Math.max(0, enemy.groundImpactSeconds - deltaSeconds);
    if (enemy.health <= 0) {
      if (this.entity.encounterProfile.respawns) {
        enemy.resetSeconds = Math.max(0, enemy.resetSeconds - deltaSeconds);
        if (enemy.resetSeconds <= 0) this.reset();
      }
      return;
    }
    if (enemy.groundBounceDelaySeconds > 0) {
      enemy.groundBounceDelaySeconds = Math.max(0, enemy.groundBounceDelaySeconds - deltaSeconds);
      enemy.position.y = enemy.groundY;
      enemy.velocityY = 0;
      if (enemy.groundBounceDelaySeconds === 0) {
        enemy.velocityY = -360;
        enemy.juggleLocked = false;
        enemy.juggleFloatSeconds = 0.07;
        if (this.slamAttackerBouncePending) {
          this.slamAttackerBouncePending = false;
          this.playerResultResolved.emit(
            Object.freeze({
              kind: 'ground-bounce',
              playerMotion: Object.freeze({
                positionY: enemy.groundY - 82,
                verticalVelocity: -360,
                isGrounded: false,
                airComboFloatSeconds: 0.07,
                airComboGravityScale: enemy.juggleGravityScale,
              }),
            }),
          );
        }
      }
      return;
    }
    const enemyAirborne = enemy.position.y < enemy.groundY;
    if (enemyAirborne) {
      enemy.juggleSeconds += deltaSeconds;
      if (enemy.juggleSeconds >= MAX_JUGGLE_SECONDS) {
        enemy.juggleLocked = true;
        enemy.juggleFloatSeconds = 0;
        enemy.velocityY = Math.max(enemy.velocityY, 220);
      }
    }
    enemy.juggleFloatSeconds = Math.max(0, enemy.juggleFloatSeconds - deltaSeconds);
    const gravityMultiplier =
      enemy.juggleFloatSeconds > 0 ? 0.08 : enemy.juggleLocked ? 2.8 : enemy.juggleGravityScale;
    enemy.velocityY += GRAVITY * gravityMultiplier * deltaSeconds;
    enemy.position.x += enemy.velocityX * deltaSeconds;
    enemy.position.y += enemy.velocityY * deltaSeconds;
    enemy.velocityX *= Math.pow(0.08, deltaSeconds);
    enemy.rotation += enemy.angularVelocity * deltaSeconds;
    enemy.angularVelocity *= Math.pow(0.06, deltaSeconds);
    if (enemy.position.y >= enemy.groundY) {
      enemy.position.y = enemy.groundY;
      enemy.velocityY = 0;
      if (enemy.groundBouncePending && enemy.juggleHits < MAX_JUGGLE_HITS) {
        enemy.groundBouncePending = false;
        enemy.groundBounceDelaySeconds = 0.07;
        enemy.groundImpactSeconds = 0.22;
        enemy.rotation = player.facing * 0.42;
        return;
      }
      enemy.juggleHits = 0;
      enemy.juggleSeconds = 0;
      enemy.juggleFloatSeconds = 0;
      enemy.juggleGravityScale = 1;
      enemy.juggleLocked = false;
      enemy.rotation = 0;
      enemy.angularVelocity = 0;
    }
    enemy.position.x = Math.max(
      this.movementBounds.minX,
      Math.min(this.movementBounds.maxX, enemy.position.x),
    );
    enemy.rotation = Math.max(-0.32, Math.min(0.32, enemy.velocityX / 420));
  }

  updateSpinContact(combatState, player, deltaSeconds) {
    const enemy = this.enemy;
    if (enemy.health <= 0) {
      this.spinContactConstraint.reset();
      return;
    }
    if (combatState.id === 'spin' && this.confirmedComboCycle !== combatState.comboCycle) {
      this.spinContactConstraint.reset();
      return;
    }
    const result = this.spinContactConstraint.update({
      motionState: combatState,
      actorX: player.position.x,
      targetX: enemy.position.x,
      facing: player.facing,
      deltaSeconds,
    });
    enemy.position.x = result.targetX;
    if (result.active) enemy.velocityX = 0;
    else if (result.releaseVelocityX !== 0) enemy.velocityX = result.releaseVelocityX;
  }

  updateEnemyCombat(deltaSeconds, frame) {
    const enemy = this.enemy;
    const player = frame.player;
    const iceSlow = enemy.enchantStatus?.id === 'ice' ? 0.7 : 1;
    if (
      enemy.health <= 0 ||
      enemy.position.y < enemy.groundY ||
      enemy.juggleLocked ||
      enemy.hitstunSeconds > 0 ||
      enemy.posture?.groggySeconds > 0
    )
      return;
    const distance = player.position.x - enemy.position.x;
    const absoluteDistance = Math.abs(distance);
    if (
      Number.isFinite(this.entity.encounterProfile.activationRange) &&
      absoluteDistance > this.entity.encounterProfile.activationRange &&
      ['idle', 'approach'].includes(enemy.aiState)
    ) {
      enemy.aiState = 'idle';
      enemy.aiSeconds = Math.min(enemy.aiSeconds, 0.1);
      return;
    }
    if (enemy.aiState === 'recovery' && enemy.recoveryAdvanceDeferred) {
      enemy.recoveryAdvanceDeferred = false;
      return;
    }
    enemy.aiSeconds = Math.max(
      0,
      enemy.aiSeconds - deltaSeconds * (enemy.aiState === 'recovery' ? iceSlow : 1),
    );
    if (distance !== 0) enemy.facing = Math.sign(distance);
    if (enemy.aiState === 'approach') {
      enemy.punishWindowOpen = false;
      enemy.punishWindowOrigin = null;
      enemy.punishComboCycle = 0;
      enemy.attackKind = !player.isGrounded
        ? 'antiAir'
        : selectEncounterAttack(
            this.entity.encounterProfile,
            enemy.patternIndex,
            enemy.health / enemy.maxHealth,
          );
      const profile = this.attackProfiles[enemy.attackKind];
      if (absoluteDistance <= profile.desiredRange) {
        enemy.aiState = 'windup';
        enemy.attackFacing = enemy.facing;
        enemy.aiSeconds = profile.windupSeconds;
        enemy.attackConnected = false;
      } else {
        enemy.position.x +=
          Math.sign(distance) * this.entity.encounterProfile.approachSpeed * iceSlow * deltaSeconds;
      }
      return;
    }
    if (enemy.aiState === 'windup' && enemy.aiSeconds === 0) {
      enemy.aiState = 'attack';
      enemy.aiSeconds = this.attackProfiles[enemy.attackKind].attackSeconds;
      return;
    }
    if (enemy.aiState === 'attack') {
      const deferRecovery = this.resolveEnemyAttack(frame, distance);
      if (deferRecovery) return;
      if (enemy.aiSeconds === 0) {
        const profile = this.attackProfiles[enemy.attackKind];
        this.startRecovery({
          source: 'attack',
          durationSeconds: profile.recoverySeconds,
          weaponStartAngle: enemy.attackKind === 'antiAir' ? -2.9 : 0.6,
          bodyStartRotation: enemy.rotation + 0.28,
        });
      }
      return;
    }
    if (enemy.aiState === 'guard' || enemy.aiState === 'evade' || enemy.aiState === 'recovery') {
      if (enemy.aiState === 'evade') enemy.position.x -= Math.sign(distance) * 110 * deltaSeconds;
      if (enemy.aiSeconds > 0) return;
      if (enemy.aiState === 'recovery') this.setWeakPointExposure(false);
      if (enemy.aiState === 'recovery' && !enemy.recoveryCompletionPending) {
        enemy.recoveryCompletionPending = true;
        return;
      }
      enemy.aiState = 'idle';
      enemy.punishWindowOpen = false;
      enemy.punishWindowOrigin = null;
      enemy.punishComboCycle = 0;
      enemy.aiSeconds = this.entity.encounterProfile.idleSeconds;
      return;
    }
    if (enemy.aiSeconds > 0) return;
    enemy.patternIndex += 1;
    if (enemy.retaliationInvulnerableSeconds > 0) {
      enemy.aiState = 'approach';
    } else if (!['idle', 'guard'].includes(frame.combatState.id) && absoluteDistance < 130) {
      enemy.aiState = enemy.patternIndex % 3 === 0 ? 'evade' : 'guard';
      enemy.aiSeconds = enemy.aiState === 'guard' ? 0.45 : 0.28;
    } else {
      enemy.aiState = 'approach';
    }
  }

  resolveEnemyAttack(frame, distance) {
    const enemy = this.enemy;
    const player = frame.player;
    const profile = this.attackProfiles[enemy.attackKind];
    const attackProgress = 1 - enemy.aiSeconds / profile.attackSeconds;
    const verticalDistance = Math.abs(enemy.position.y - (player.position.y + 82));
    const visualBroadRange = Math.max(
      profile.attackRange + 4,
      profile.weaponLength * enemy.presentationScale + PLAYER_HURT_MARGIN,
    );
    const forwardDistance = distance * enemy.attackFacing;
    if (
      enemy.attackConnected ||
      attackProgress < profile.contactStart ||
      attackProgress > profile.contactEnd ||
      forwardDistance < 0 ||
      forwardDistance > visualBroadRange ||
      verticalDistance > profile.verticalRange + 4 ||
      (enemy.attackKind === 'antiAir' && verticalDistance < 25)
    )
      return false;
    const enemyInFront = -distance * player.facing > 0;
    const guardHeld = player.isGrounded && enemyInFront && frame.combatState.id === 'guard';
    const guarding = profile.guardable && guardHeld;
    const guardBreak = profile.guardBreak === true && guardHeld;
    const enemyGeometry = sampleTrainingEnemyCombatGeometry(enemy, this.attackProfiles);
    let visualContact = Object.freeze({ contact: false, gap: Infinity });
    if (guarding || guardBreak) {
      visualContact = closestCombatContact(
        [enemyGeometry.weapon],
        frame.playerGeometry?.shield ? [frame.playerGeometry.shield] : [],
      );
    }
    if (!visualContact.contact) {
      visualContact = closestCombatContact(
        [enemyGeometry.weapon],
        frame.playerGeometry?.hurt ?? [],
      );
    }
    if (!visualContact.contact) return true;
    enemy.attackConnected = true;
    this.lastVisualContact = Object.freeze({
      attacker: 'enemy',
      attackKind: enemy.attackKind,
      ...visualContact,
      simulationGap: visualContact.gap,
    });
    this.contactSeconds = 0.18;
    const rollProgress = player.rollProgress;
    const rollInvulnerable =
      profile.rollPiercing !== true &&
      rollProgress !== null &&
      rollProgress >= 0.12 &&
      rollProgress <= 0.62;
    if (rollInvulnerable) {
      this.emitCombatEvent(COMBAT_EVENT_TYPE.EVADE, {
        actor: 'player',
        target: 'enemy',
        attackId: enemy.attackKind,
        position: player.position,
        direction: player.rollDirection ?? player.facing,
        strength: enemy.attackKind === 'heavy' ? 1.4 : 1,
        durationSeconds: 0.16,
      });
      this.cameraFeedbackOccurred.emit(
        Object.freeze({
          direction: player.rollDirection ?? player.facing,
          strength: 0.65,
          durationSeconds: 0.065,
        }),
      );
      return false;
    }
    if (player.invulnerableSeconds > 0) return false;
    if (guardBreak) {
      enemy.lastCommandTransition = Object.freeze({
        kind: 'guard-break',
        attackKind: enemy.attackKind,
        phase: 'active',
        target: 'player',
      });
      this.emitCombatEvent(COMBAT_EVENT_TYPE.GUARD_BREAK, {
        actor: 'player',
        target: 'enemy',
        attackId: enemy.attackKind,
        position: visualContact.position,
        direction: Math.sign(distance) || 1,
        strength: 2,
      });
      this.playerResultResolved.emit(
        Object.freeze({
          kind: 'guard-break',
          blockImpactSeconds: 0.22,
          blockImpactStrength: 1.35,
          blockstunSeconds: combatFramesToSeconds(28),
          hitStopSeconds: 0.055,
        }),
      );
      this.cameraFeedbackOccurred.emit(
        Object.freeze({
          direction: Math.sign(distance) || 1,
          strength: 2.4,
          durationSeconds: 0.12,
        }),
      );
      return false;
    }
    if (guarding) {
      this.emitCombatEvent(COMBAT_EVENT_TYPE.GUARD, {
        actor: 'player',
        target: 'enemy',
        attackId: enemy.attackKind,
        position: visualContact.position,
        direction: Math.sign(distance) || 1,
        strength: 1 + profile.blockStrength,
      });
      enemy.velocityX = -Math.sign(distance) * 90;
      this.playerResultResolved.emit(
        Object.freeze({
          kind: 'guard',
          attackId: enemy.attackKind,
          contactPosition: visualContact.position,
          contactDirection: Math.sign(distance) || 1,
          guardStaminaDamage: profile.guardStaminaDamage,
          justGuardEligible: profile.guardable === true,
          blockImpactSeconds: 0.14,
          blockImpactStrength: profile.blockStrength,
          blockstunSeconds: profile.blockstunSeconds,
          hitStopSeconds: 0.04,
        }),
      );
      this.cameraFeedbackOccurred.emit(
        Object.freeze({
          direction: Math.sign(distance) || 1,
          strength: 1 + profile.blockStrength * 1.5,
          durationSeconds: 0.08,
        }),
      );
      return false;
    }
    this.emitCombatEvent(COMBAT_EVENT_TYPE.HIT, {
      actor: 'enemy',
      target: 'player',
      attackId: enemy.attackKind,
      position: visualContact.position,
      direction: Math.sign(distance) || 1,
      strength: 1 + profile.damage * 0.08,
    });
    this.playerResultResolved.emit(
      Object.freeze({
        kind: 'hit',
        damage: profile.damage,
        knockbackVelocityX: Math.sign(distance) * profile.knockbackVelocity,
        knockbackDecayRate: profile.knockbackDecayRate,
        hitstunSeconds: 0.22,
        invulnerableSeconds: 0.38,
        hitStopSeconds: enemy.attackKind === 'heavy' ? 0.05 : 0.035,
      }),
    );
    this.cameraFeedbackOccurred.emit(
      Object.freeze({
        direction: Math.sign(distance) || 1,
        strength: 1.6 + profile.damage * 0.12,
        durationSeconds: enemy.attackKind === 'heavy' ? 0.12 : 0.09,
      }),
    );
    return false;
  }

  finishComboCycle(combatState) {
    const enemy = this.enemy;
    const cycleChanged = combatState.comboCycle !== enemy.lastReceivedComboCycle;
    if (
      !enemy.comboCycleHitPending ||
      enemy.health <= 0 ||
      (!cycleChanged && combatState.id !== 'idle')
    )
      return;
    enemy.comboCycleHitPending = false;
    enemy.retaliationInvulnerableSeconds = 0.55;
    enemy.retaliationProtectedComboCycle = cycleChanged ? combatState.comboCycle : 0;
    enemy.retaliationCycleClaimed = cycleChanged;
    enemy.hitstunSeconds = 0;
    enemy.punishWindowOpen = false;
    enemy.punishWindowOrigin = null;
    enemy.punishComboCycle = 0;
    this.startRecovery({
      source: 'retaliation',
      durationSeconds: 0.08,
      weaponStartAngle: enemy.hitReactionWeaponAngle,
      bodyStartRotation: enemy.rotation,
    });
  }

  updateRetaliationProtection(combatState) {
    const enemy = this.enemy;
    if (
      enemy.retaliationProtectedComboCycle !== 0 &&
      combatState.id !== 'idle' &&
      combatState.comboCycle !== enemy.retaliationProtectedComboCycle
    )
      enemy.retaliationProtectedComboCycle = 0;
    if (
      enemy.retaliationInvulnerableSeconds > 0 &&
      enemy.retaliationProtectedComboCycle === 0 &&
      !enemy.retaliationCycleClaimed &&
      combatState.id !== 'idle'
    ) {
      enemy.retaliationProtectedComboCycle = combatState.comboCycle;
      enemy.retaliationCycleClaimed = true;
    }
    if (enemy.retaliationInvulnerableSeconds === 0 && enemy.retaliationProtectedComboCycle === 0) {
      enemy.retaliationCycleClaimed = false;
    }
  }

  resolvePlayerAttack(frame) {
    const enemy = this.enemy;
    const combatState = frame.combatState;
    const profile = frame.attackProfile;
    const player = frame.player;
    if (
      enemy.health <= 0 ||
      player.health <= 0 ||
      player.hitstunSeconds > 0 ||
      player.blockstunSeconds > 0 ||
      enemy.retaliationInvulnerableSeconds > 0 ||
      enemy.retaliationProtectedComboCycle === combatState.comboCycle ||
      !profile ||
      (enemy.juggleLocked && enemy.position.y < enemy.groundY) ||
      combatState.progress < profile.start ||
      combatState.progress > profile.end
    )
      return false;
    const deltaX = enemy.position.x - player.position.x;
    const forwardDistance = deltaX * player.facing;
    if (
      forwardDistance < -18 ||
      forwardDistance > profile.range + 4 ||
      Math.abs(enemy.position.y - (player.position.y + 82)) > 116
    )
      return false;
    const enemyGeometry = sampleTrainingEnemyCombatGeometry(enemy, this.attackProfiles);
    const playerWeapons = frame.playerGeometry
      ? [
          profile.contactPart === 'shield'
            ? frame.playerGeometry.shield
            : frame.playerGeometry.weapon,
          frame.playerGeometry.sweep,
        ].filter(Boolean)
      : [];
    const visualContact = closestCombatContact(playerWeapons, enemyGeometry.hurt);
    if (!visualContact.contact) return false;
    const pulseIndex = profile.hitPulses
      ? profile.hitPulses.reduce(
          (latest, pulse, index) => (combatState.progress >= pulse ? index : latest),
          -1,
        )
      : 0;
    if (pulseIndex < 0) return false;
    const hitKey = `${combatState.sequence}:${pulseIndex}`;
    if (hitKey === this.lastHitMotionSequence) return false;
    this.lastHitMotionSequence = hitKey;
    this.lastVisualContact = Object.freeze({
      attacker: 'player',
      sequence: combatState.sequence,
      pulseIndex,
      ...visualContact,
      simulationGap: visualContact.gap,
    });
    this.contactSeconds = 0.18;
    if (enemy.aiState === 'evade') return false;
    const recoveryPunish = resolveRecoveryPunish({
      enemyRole: enemy.role,
      recoveryWindowOpen: enemy.punishWindowOpen,
      claimedComboCycle: enemy.punishComboCycle,
      comboCycle: combatState.comboCycle,
      playerPositionX: player.position.x,
      enemyPositionX: enemy.position.x,
      attackFacing: enemy.attackFacing,
    });
    const posturePunishAccepted =
      enemy.punishWindowOrigin === 'posture' && enemy.posture?.groggySeconds > 0;
    const weakPointPunishAccepted = enemy.weakPoint?.exposed === true;
    const punishAccepted =
      posturePunishAccepted || weakPointPunishAccepted || recoveryPunish.accepted;
    const interruptsStrongStartup = enemy.aiState === 'windup' && enemy.attackKind === 'heavy';
    const postureDamage =
      combatState.id === 'shieldBash'
        ? (this.entity.encounterProfile.posture?.shieldCounterDamage ?? 0)
        : profile.guardBreak
          ? Math.round(
              (this.entity.encounterProfile.posture?.strongDamage ?? 0) *
                (profile.postureDamageScale ?? 1),
            )
          : 0;
    const earthContactPostureDamage =
      this.enchantmentContext.active?.id === 'earth' &&
      combatState.id !== 'shieldBash' &&
      enemy.posture
        ? Math.round((profile.guardBreak ? 34 : 18) * (this.enchantmentContext.active.level / 5))
        : 0;
    let earthPostureApplied = false;
    const breaksEnemyGuard =
      profile.guardBreak === true &&
      !interruptsStrongStartup &&
      ((this.entity.encounterProfile.guardOutsidePunish && !punishAccepted) ||
        (enemy.aiState === 'guard' && enemy.position.y >= enemy.groundY));
    if (breaksEnemyGuard) {
      enemy.lastCommandTransition = Object.freeze({
        kind: 'guard-break',
        attackKind: combatState.id,
        phase: combatState.phase,
        target: 'enemy',
      });
      this.emitCombatEvent(COMBAT_EVENT_TYPE.GUARD_BREAK, {
        actor: 'enemy',
        target: 'player',
        attackId: combatState.id,
        position: visualContact.position,
        direction: player.facing,
        strength: 1.8,
      });
      this.applyPostureDamage({
        combatState,
        visualContact,
        damage: postureDamage + earthContactPostureDamage,
        direction: player.facing,
      });
      earthPostureApplied = earthContactPostureDamage > 0;
    }
    if (
      this.entity.encounterProfile.guardOutsidePunish &&
      !punishAccepted &&
      !breaksEnemyGuard &&
      !interruptsStrongStartup
    ) {
      this.emitCombatEvent(COMBAT_EVENT_TYPE.GUARD, {
        actor: 'enemy',
        target: 'player',
        attackId: combatState.id,
        position: visualContact.position,
        direction: player.facing,
        strength: 1.25,
      });
      enemy.hitFlashSeconds = 0.07;
      this.applyPostureDamage({
        combatState,
        visualContact,
        damage: postureDamage + earthContactPostureDamage,
        direction: player.facing,
      });
      this.cameraFeedbackOccurred.emit(
        Object.freeze({ direction: player.facing, strength: 1, durationSeconds: 0.055 }),
      );
      return true;
    }
    if (enemy.aiState === 'guard' && enemy.position.y >= enemy.groundY && !profile.guardBreak) {
      this.emitCombatEvent(COMBAT_EVENT_TYPE.GUARD, {
        actor: 'enemy',
        target: 'player',
        attackId: combatState.id,
        position: visualContact.position,
        direction: player.facing,
        strength: 0.8,
      });
      enemy.hitFlashSeconds = 0.08;
      this.applyPostureDamage({
        combatState,
        visualContact,
        damage: postureDamage + earthContactPostureDamage,
        direction: player.facing,
      });
      this.startRecovery({
        source: 'guard',
        durationSeconds: 0.24,
        weaponStartAngle: -0.65,
        bodyStartRotation: enemy.rotation,
      });
      return true;
    }
    const enemyAirborne = enemy.position.y < enemy.groundY;
    const backPunish = recoveryPunish.opens;
    const punishHit = posturePunishAccepted || weakPointPunishAccepted || backPunish;
    if (recoveryPunish.opens && enemy.role === 'boss') {
      enemy.punishComboCycle = combatState.comboCycle;
    }
    const finalPulse = !profile.hitPulses || pulseIndex === profile.hitPulses.length - 1;
    const juggleRole =
      profile.juggleRole ?? (enemyAirborne ? 'sustain' : finalPulse ? 'launcher' : null);
    const damageScale = enemyAirborne ? Math.max(0.4, 1 - enemy.juggleHits * 0.1) : 1;
    const baseDamage = Math.max(
      1,
      Math.round(
        profile.damage * damageScale * (backPunish ? (profile.backPunishDamageScale ?? 1) : 1),
      ),
    );
    const enchantment =
      combatState.id === 'shieldBash' || profile.contactPart === 'shield'
        ? null
        : resolveSwordEnchantment({
            enchantId: this.enchantmentContext.active?.id,
            enchantLevel: this.enchantmentContext.active?.level ?? 0,
            affinity:
              this.entity.encounterProfile.enchantAffinity?.[this.enchantmentContext.active?.id] ??
              'neutral',
            attackKind: profile.guardBreak ? 'strong' : 'basic',
            baseDamage,
            weaponBaseAttack: profile.damage,
            status: enemy.enchantStatus,
            enemyAiState: enemy.aiState,
            hasPosture: Boolean(enemy.posture),
          });
    const damageBeforeWeakPoint = enchantment?.damage ?? baseDamage;
    const damage = weakPointPunishAccepted
      ? Math.max(1, Math.round(damageBeforeWeakPoint * enemy.weakPoint.damageMultiplier))
      : damageBeforeWeakPoint;
    if (enchantment?.status) {
      enemy.enchantStatus = {
        ...enchantment.status,
        label: this.enchantmentContext.active.label,
        color: this.enchantmentContext.active.color,
        highlightColor: this.enchantmentContext.active.highlightColor,
        shape: this.enchantmentContext.active.shape,
      };
      if (enchantment.interrupt) {
        enemy.aiState = 'recovery';
        enemy.aiSeconds = 0.18;
        enemy.lastCommandTransition = Object.freeze({
          kind: 'enchant-interrupt',
          attackKind: enemy.attackKind,
          phase: 'windup',
          reason: 'lightning',
        });
      }
      if (enchantment.postureDamage > 0 && !earthPostureApplied)
        this.applyPostureDamage({
          combatState,
          visualContact,
          damage: enchantment.postureDamage,
          direction: player.facing,
        });
    }
    this.emitCombatEvent(
      combatState.id === 'shieldBash'
        ? COMBAT_EVENT_TYPE.COUNTER
        : punishHit
          ? COMBAT_EVENT_TYPE.PUNISH
          : juggleRole === 'launcher'
            ? COMBAT_EVENT_TYPE.LAUNCH
            : COMBAT_EVENT_TYPE.HIT,
      {
        actor: 'player',
        target: 'enemy',
        attackId: combatState.id,
        position: visualContact.position,
        direction: player.facing,
        outcome:
          combatState.id === 'shieldBash'
            ? 'just-guard-counter'
            : posturePunishAccepted
              ? 'posture-groggy-punish'
              : weakPointPunishAccepted
                ? 'weak-point-punish'
                : backPunish
                  ? 'back-punish'
                  : undefined,
        strength: 1 + Math.min(2.5, damage * 0.08) + (punishHit ? 0.5 : 0),
        durationSeconds: enchantment ? 0.22 : undefined,
        enchantment: enchantment
          ? {
              id: this.enchantmentContext.active.id,
              swordId: this.enchantmentContext.swordId,
              level: this.enchantmentContext.active.level,
              affinity: enchantment.affinity,
              additionalDamage: enchantment.additionalDamage,
              label: this.enchantmentContext.active.label,
              color: this.enchantmentContext.active.color,
              highlightColor: this.enchantmentContext.active.highlightColor,
              shape: this.enchantmentContext.active.shape,
            }
          : null,
      },
    );
    enemy.health = Math.max(0, enemy.health - damage);
    if (weakPointPunishAccepted) this.setWeakPointExposure(false);
    if (enemy.health === 0 && !this.completionEmitted) {
      this.completionEmitted = true;
      this.encounterCompleted.emit(this.createCompletionResult());
    }
    this.confirmedComboCycle = combatState.comboCycle;
    enemy.comboCycleHitPending = enemy.health > 0;
    enemy.lastReceivedComboCycle = combatState.comboCycle;
    enemy.hitstunSeconds = Math.max(
      enemy.hitstunSeconds,
      (0.16 + damage * 0.008) * (profile.hitstunScale ?? 1),
    );
    enemy.hitReactionWeaponLength = sampleTrainingEnemyWeaponLength(enemy, this.attackProfiles);
    enemy.hitReactionWeaponAngle =
      profile.damage >= 22 ? 0.35 : profile.launchY < -300 ? -1.1 : 0.2;
    if (interruptsStrongStartup && !enchantment?.interrupt) {
      enemy.lastCommandTransition = Object.freeze({
        kind: 'strong-startup-interrupted',
        attackKind: enemy.attackKind,
        phase: 'windup',
        reason: 'hit',
      });
    }
    enemy.rotation = player.facing * 0.18;
    enemy.aiState = 'hitstun';
    enemy.aiSeconds = 0;
    enemy.attackConnected = false;
    const chainConfirmed = Boolean(combatState.queuedMotion);
    const spinPulseHolding = Boolean(profile.hitPulses) && !finalPulse;
    const hitVelocityX = player.facing * (chainConfirmed ? 18 : profile.damage * 8 + 45);
    enemy.velocityX = spinPulseHolding ? 0 : hitVelocityX;
    if (combatState.id === 'spin' && finalPulse) {
      this.spinContactConstraint.queueRelease({ velocityX: hitVelocityX });
      enemy.velocityX = 0;
    }
    enemy.angularVelocity =
      player.facing *
      (combatState.sequence % 2 === 0 ? -2.8 : 2.8) *
      (juggleRole === 'finisher' ? 1.4 : 1);
    enemy.hitFlashSeconds = 0.12;
    const playerMotion = {};
    if (chainConfirmed && !combatState.id.startsWith('air')) {
      const forwardGap = (enemy.position.x - player.position.x) * player.facing;
      if (forwardGap > 42)
        playerMotion.positionXDelta = player.facing * Math.min(22, forwardGap - 42);
    }
    if (juggleRole === 'finisher') {
      enemy.juggleHits = Math.max(1, enemy.juggleHits + 1);
      enemy.juggleLocked = true;
      enemy.juggleFloatSeconds = 0;
      enemy.juggleGravityScale = 2.8;
      enemy.velocityY = Math.max(profile.launchY, 220);
      enemy.groundBouncePending = profile.groundBounce === true;
      if (profile.groundBounce === true && combatState.id.startsWith('air')) {
        enemy.position.x = player.position.x + player.facing * 30;
        if (enemy.position.y < enemy.groundY) enemy.position.y += 15;
        Object.assign(playerMotion, {
          airComboFacing: player.facing,
          airHeavyConnectedSequence: combatState.sequence,
          verticalVelocity: enemy.velocityY,
          airComboFloatSeconds: 0,
          airComboGravityScale: 1,
        });
        this.slamAttackerBouncePending = true;
      } else if (combatState.id.startsWith('air')) {
        Object.assign(playerMotion, { airComboFloatSeconds: 0, airComboGravityScale: 1 });
      }
    } else if (juggleRole) {
      const nextJuggleHits = enemyAirborne ? enemy.juggleHits + 1 : 1;
      enemy.juggleHits = nextJuggleHits;
      enemy.juggleSeconds = enemyAirborne ? enemy.juggleSeconds : 0;
      enemy.juggleGravityScale = 1 + nextJuggleHits * JUGGLE_GRAVITY_STEP;
      if (nextJuggleHits >= MAX_JUGGLE_HITS) {
        enemy.juggleLocked = true;
        enemy.juggleFloatSeconds = 0;
        enemy.juggleGravityScale = 2.8;
        enemy.velocityY = Math.max(enemy.velocityY, 220);
        if (combatState.id.startsWith('air')) {
          Object.assign(playerMotion, { airComboFloatSeconds: 0, airComboGravityScale: 1 });
        }
      } else {
        const relaunchSpeed = Math.max(
          90,
          (profile.relaunchSpeed ?? Math.abs(profile.launchY)) - (nextJuggleHits - 1) * 24,
        );
        enemy.velocityY = -relaunchSpeed;
        enemy.juggleFloatSeconds = Math.max(
          0.06,
          (profile.floatSeconds ?? 0.11) - (nextJuggleHits - 1) * 0.012,
        );
        if (combatState.id.startsWith('air')) {
          const comboFacing = player.airComboFacing || player.facing;
          const forwardGap = (enemy.position.x - player.position.x) * comboFacing;
          Object.assign(playerMotion, {
            airComboFacing: player.airComboFacing || player.facing,
            verticalVelocity: enemy.velocityY,
            airComboFloatSeconds: enemy.juggleFloatSeconds,
            airComboGravityScale: enemy.juggleGravityScale,
            ...(forwardGap > 44
              ? { positionXDelta: comboFacing * Math.min(32, forwardGap - 44) }
              : {}),
          });
        }
      }
    } else {
      enemy.velocityY = profile.hitPulses && finalPulse ? -260 : profile.launchY;
    }
    if (enemy.health <= 0 && this.entity.encounterProfile.respawns) {
      enemy.resetSeconds = RESET_SECONDS;
    }
    this.playerResultResolved.emit(
      Object.freeze({
        kind: 'player-attack',
        damagingHit: Object.freeze({
          sequence: combatState.sequence,
          motionId: combatState.id,
          target: enemy.id,
          outcome: punishHit ? 'punish' : 'hit',
          damage,
          weakPoint: weakPointPunishAccepted
            ? Object.freeze({
                id: enemy.weakPoint.id,
                label: enemy.weakPoint.label,
                damageMultiplier: enemy.weakPoint.damageMultiplier,
              })
            : null,
          enchantment: enchantment
            ? Object.freeze({
                id: this.enchantmentContext.active.id,
                swordId: this.enchantmentContext.swordId,
                level: this.enchantmentContext.active.level,
                affinity: enchantment.affinity,
                additionalDamage: enchantment.additionalDamage,
                status: enemy.enchantStatus ? Object.freeze({ ...enemy.enchantStatus }) : null,
                suppressesRegeneration: enemy.enchantStatus?.suppressesRegeneration === true,
                suppressesPlantDefense: enemy.enchantStatus?.suppressesPlantDefense === true,
              })
            : null,
        }),
        hitStopSeconds: profile.damage >= 20 || juggleRole === 'finisher' ? 0.05 : 0.035,
        playerMotion: Object.freeze(playerMotion),
      }),
    );
    this.cameraFeedbackOccurred.emit(
      Object.freeze({
        direction: player.facing,
        strength:
          1.2 +
          Math.min(3.3, damage * 0.12) +
          (juggleRole === 'finisher' ? 0.5 : 0) +
          (punishHit ? 0.5 : 0),
        durationSeconds: profile.damage >= 20 || juggleRole === 'finisher' ? 0.12 : 0.085,
      }),
    );
    return true;
  }

  applyPostureDamage({ combatState, visualContact, damage, direction }) {
    const enemy = this.enemy;
    if (!enemy.posture || !(damage > 0) || enemy.posture.groggySeconds > 0) return false;
    enemy.posture.current = Math.max(0, enemy.posture.current - damage);
    if (enemy.posture.current > 0) return true;
    enemy.posture.groggySeconds = this.entity.encounterProfile.posture.groggySeconds;
    enemy.punishWindowOpen = true;
    enemy.punishWindowOrigin = 'posture';
    enemy.punishComboCycle = 0;
    enemy.aiState = 'groggy';
    enemy.aiSeconds = enemy.posture.groggySeconds;
    enemy.velocityX = 0;
    enemy.lastCommandTransition = Object.freeze({
      kind: 'posture-broken',
      attackKind: combatState.id,
      phase: combatState.phase,
      target: 'enemy',
    });
    this.emitCombatEvent(COMBAT_EVENT_TYPE.GUARD_BREAK, {
      actor: 'player',
      target: 'enemy',
      attackId: combatState.id,
      outcome: 'posture-break',
      position: visualContact.position,
      direction,
      strength: 2.3,
    });
    return true;
  }

  emitCombatEvent(type, payload) {
    this.combatEventOccurred.emit(Object.freeze({ type, payload: Object.freeze(payload) }));
  }
}

export const TRAINING_ENCOUNTER_SCENE = new Scene((options) => new TrainingEncounterNode(options));
