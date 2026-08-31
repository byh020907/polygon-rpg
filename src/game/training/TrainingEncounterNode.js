import { SpinContactConstraint } from '../../combat/SpinContactConstraint.js';
import { COMBAT_EVENT_TYPE } from '../../combat/CombatEvent.js';
import { combatFramesToSeconds } from '../../combat/CombatFrame.js';
import { Scene } from '../../core/Scene.js';
import { SceneNode } from '../../core/SceneNode.js';
import { Signal } from '../../core/Signal.js';
import { getEncounterProfile, selectEncounterAttack } from '../encounter/EncounterProfiles.js';
import {
  createTrainingEnemyItems,
  sampleTrainingEnemyCombatFrame,
  sampleTrainingEnemyWeaponLength,
  TRAINING_ENEMY_ATTACK_PROFILES,
} from './TrainingEncounterPresentation.js';

const GRAVITY = 1180;
const RESET_SECONDS = combatFramesToSeconds(60);
const HIT_REACTION_RECOVERY_SECONDS = combatFramesToSeconds(11);
const MAX_JUGGLE_HITS = 6;
const MAX_JUGGLE_SECONDS = 3.2;
const JUGGLE_GRAVITY_STEP = 0.3;
const PLAYER_HURT_MARGIN = 28;
const ENEMY_NON_HURT_ITEM_IDS = new Set([
  'combat-enemy-shadow',
  'combat-enemy-impact-ring',
  'combat-enemy-impact-crack',
  'combat-enemy-retaliation-aura',
  'combat-enemy-core-glow',
  'combat-enemy-weapon',
  'combat-enemy-weapon-glow',
  'combat-enemy-anti-air-trail',
  'combat-enemy-health-back',
  'combat-enemy-health-fill',
  'combat-enemy-heavy-warning',
  'combat-enemy-punish-window',
  'combat-enemy-sweep-warning',
  'combat-enemy-sweep-trail',
  'combat-enemy-glasswind-wing-back',
  'combat-enemy-glasswind-wing-front',
  'combat-enemy-training-waist-cloth',
  'combat-enemy-training-shoulder-plate',
  'combat-enemy-training-mask',
  'combat-enemy-training-gauntlet',
  'combat-enemy-training-back-boot',
  'combat-enemy-training-front-boot',
]);
const PLAYER_NON_HURT_ITEM_IDS = new Set([
  'shadow',
  'cape',
  'scarf-tail',
  'sword-trail',
  'sword-hilt',
  'sword-blade',
  'sword-shine',
  'hair-back',
  'hair-fringe',
  'uniform-coat-tail',
  'uniform-front-panel',
  'shield-pauldron',
  'sword-pauldron',
  'shield-glove',
  'sword-glove',
  'back-boot',
  'front-boot',
]);

function pointToSegmentDistance(pointValue, start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const amount =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((pointValue.x - start.x) * deltaX + (pointValue.y - start.y) * deltaY) / lengthSquared,
          ),
        );
  return Math.hypot(
    pointValue.x - (start.x + deltaX * amount),
    pointValue.y - (start.y + deltaY * amount),
  );
}

function pointInPolygon(pointValue, polygonPoints) {
  let inside = false;
  for (
    let index = 0, previous = polygonPoints.length - 1;
    index < polygonPoints.length;
    previous = index, index += 1
  ) {
    const currentPoint = polygonPoints[index];
    const previousPoint = polygonPoints[previous];
    const crosses =
      currentPoint.y > pointValue.y !== previousPoint.y > pointValue.y &&
      pointValue.x <
        ((previousPoint.x - currentPoint.x) * (pointValue.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const cross = (origin, left, right) =>
    (left.x - origin.x) * (right.y - origin.y) - (left.y - origin.y) * (right.x - origin.x);
  const firstSideA = cross(firstStart, firstEnd, secondStart);
  const firstSideB = cross(firstStart, firstEnd, secondEnd);
  const secondSideA = cross(secondStart, secondEnd, firstStart);
  const secondSideB = cross(secondStart, secondEnd, firstEnd);
  const crossesProperly = firstSideA * firstSideB < 0 && secondSideA * secondSideB < 0;
  if (crossesProperly) return true;
  const onSegment = (start, end, pointValue) =>
    pointValue.x >= Math.min(start.x, end.x) - 0.0001 &&
    pointValue.x <= Math.max(start.x, end.x) + 0.0001 &&
    pointValue.y >= Math.min(start.y, end.y) - 0.0001 &&
    pointValue.y <= Math.max(start.y, end.y) + 0.0001;
  return (
    (Math.abs(firstSideA) <= 0.0001 && onSegment(firstStart, firstEnd, secondStart)) ||
    (Math.abs(firstSideB) <= 0.0001 && onSegment(firstStart, firstEnd, secondEnd)) ||
    (Math.abs(secondSideA) <= 0.0001 && onSegment(secondStart, secondEnd, firstStart)) ||
    (Math.abs(secondSideB) <= 0.0001 && onSegment(secondStart, secondEnd, firstEnd))
  );
}

function polygonDistance(leftPoints, rightPoints) {
  if (
    leftPoints.some((pointValue) => pointInPolygon(pointValue, rightPoints)) ||
    rightPoints.some((pointValue) => pointInPolygon(pointValue, leftPoints))
  )
    return 0;
  for (let leftIndex = 0; leftIndex < leftPoints.length; leftIndex += 1) {
    const leftStart = leftPoints[leftIndex];
    const leftEnd = leftPoints[(leftIndex + 1) % leftPoints.length];
    for (let rightIndex = 0; rightIndex < rightPoints.length; rightIndex += 1) {
      if (
        segmentsIntersect(
          leftStart,
          leftEnd,
          rightPoints[rightIndex],
          rightPoints[(rightIndex + 1) % rightPoints.length],
        )
      )
        return 0;
    }
  }
  let minimum = Infinity;
  for (let leftIndex = 0; leftIndex < leftPoints.length; leftIndex += 1) {
    const leftStart = leftPoints[leftIndex];
    const leftEnd = leftPoints[(leftIndex + 1) % leftPoints.length];
    for (const rightPoint of rightPoints) {
      minimum = Math.min(minimum, pointToSegmentDistance(rightPoint, leftStart, leftEnd));
    }
  }
  for (let rightIndex = 0; rightIndex < rightPoints.length; rightIndex += 1) {
    const rightStart = rightPoints[rightIndex];
    const rightEnd = rightPoints[(rightIndex + 1) % rightPoints.length];
    for (const leftPoint of leftPoints) {
      minimum = Math.min(minimum, pointToSegmentDistance(leftPoint, rightStart, rightEnd));
    }
  }
  return minimum;
}

function closestContact(weaponItems, hurtItems, maximumGap = 4) {
  let closest = Object.freeze({ contact: false, gap: Infinity });
  for (const weaponItem of weaponItems) {
    for (const hurtItem of hurtItems) {
      const gap = polygonDistance(weaponItem.points, hurtItem.points);
      if (gap < closest.gap) {
        closest = Object.freeze({
          contact: gap <= maximumGap,
          gap,
          weaponItemId: weaponItem.id,
          hurtItemId: hurtItem.id,
        });
      }
    }
  }
  return closest;
}

function freezePosition(position) {
  return Object.freeze({ x: position.x, y: position.y });
}

export class TrainingEncounterNode extends SceneNode {
  constructor({ entity, groundY, movementBounds, spinContact }) {
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

    const encounterProfile = getEncounterProfile(entity.encounterProfileId ?? 'training');
    this.entity = Object.freeze({
      id: entity.id,
      position: freezePosition(entity.position ?? { x: 680, y: groundY }),
      maxHealth: Number.isFinite(entity.maxHealth) ? Math.max(1, entity.maxHealth) : 100,
      encounterProfile,
    });
    this.groundY = groundY;
    this.movementBounds = Object.freeze({ ...movementBounds });
    this.spinContactOptions = Object.freeze({
      hitPulses: spinContact.hitPulses,
      contactSpacings: spinContact.contactSpacings,
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
      hitReactionWeaponLength: TRAINING_ENEMY_ATTACK_PROFILES.light.weaponLength,
      punishWindowOpen: false,
      punishComboCycle: 0,
    };
    this.completionEmitted = false;
    this.lastHitMotionSequence = '';
    this.lastVisualContact = null;
    this.contactSeconds = 0;
    this.confirmedComboCycle = 0;
    this.slamAttackerBouncePending = false;
    this.spinContactConstraint = new SpinContactConstraint(this.spinContactOptions);
  }

  onExitTree() {
    this.lastVisualContact = null;
    this.contactSeconds = 0;
    this.spinContactConstraint.reset();
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
    });
  }

  createRenderSnapshot(renderOrder) {
    const enemy = this.enemy;
    if (!enemy) return Object.freeze({ enemy: null, items: Object.freeze([]), contact: null });
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
          frame: sampleTrainingEnemyCombatFrame(enemy),
        }),
      }),
      items: Object.freeze(createTrainingEnemyItems(enemy, renderOrder)),
      contact:
        this.contactSeconds > 0 && this.lastVisualContact
          ? Object.freeze({ ...this.lastVisualContact, remainingSeconds: this.contactSeconds })
          : null,
    });
  }

  step(deltaSeconds, frame) {
    if (!this.isInsideTree) return;
    this.contactSeconds = Math.max(0, this.contactSeconds - deltaSeconds);
    this.updateEnemyPhysics(deltaSeconds, frame.player);
    this.updateSpinContact(frame.combatState, frame.player, deltaSeconds);
    this.updateEnemyCombat(deltaSeconds, frame);
    this.finishComboCycle(frame.combatState);
    this.updateRetaliationProtection(frame.combatState);
    this.resolvePlayerAttack(frame);
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
    enemy.punishWindowOpen = source === 'attack';
    if (!enemy.punishWindowOpen) enemy.punishComboCycle = 0;
  }

  updateEnemyPhysics(deltaSeconds, player) {
    const enemy = this.enemy;
    enemy.hitFlashSeconds = Math.max(0, enemy.hitFlashSeconds - deltaSeconds);
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
    if (
      enemy.health <= 0 ||
      enemy.position.y < enemy.groundY ||
      enemy.juggleLocked ||
      enemy.hitstunSeconds > 0
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
    enemy.aiSeconds = Math.max(0, enemy.aiSeconds - deltaSeconds);
    if (distance !== 0) enemy.facing = Math.sign(distance);
    if (enemy.aiState === 'approach') {
      enemy.punishWindowOpen = false;
      enemy.punishComboCycle = 0;
      enemy.attackKind = !player.isGrounded
        ? 'antiAir'
        : selectEncounterAttack(
            this.entity.encounterProfile,
            enemy.patternIndex,
            enemy.health / enemy.maxHealth,
          );
      const profile = TRAINING_ENEMY_ATTACK_PROFILES[enemy.attackKind];
      if (absoluteDistance <= profile.desiredRange) {
        enemy.aiState = 'windup';
        enemy.attackFacing = enemy.facing;
        enemy.aiSeconds = profile.windupSeconds;
        enemy.attackConnected = false;
      } else {
        enemy.position.x +=
          Math.sign(distance) * this.entity.encounterProfile.approachSpeed * deltaSeconds;
      }
      return;
    }
    if (enemy.aiState === 'windup' && enemy.aiSeconds === 0) {
      enemy.aiState = 'attack';
      enemy.aiSeconds = TRAINING_ENEMY_ATTACK_PROFILES[enemy.attackKind].attackSeconds;
      return;
    }
    if (enemy.aiState === 'attack') {
      const deferRecovery = this.resolveEnemyAttack(frame, distance);
      if (deferRecovery) return;
      if (enemy.aiSeconds === 0) {
        const profile = TRAINING_ENEMY_ATTACK_PROFILES[enemy.attackKind];
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
      if (enemy.aiState === 'recovery' && !enemy.recoveryCompletionPending) {
        enemy.recoveryCompletionPending = true;
        return;
      }
      enemy.aiState = 'idle';
      enemy.punishWindowOpen = false;
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
    const profile = TRAINING_ENEMY_ATTACK_PROFILES[enemy.attackKind];
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
    const guarding =
      profile.guardable && player.isGrounded && enemyInFront && frame.combatState.id === 'guard';
    const weaponItems = createTrainingEnemyItems(enemy, 0).filter(
      (item) => item.id === 'combat-enemy-weapon',
    );
    let visualContact = Object.freeze({ contact: false, gap: Infinity });
    if (guarding) {
      visualContact = closestContact(
        weaponItems,
        frame.playerItems.filter((item) => ['shield', 'shield-mark'].includes(item.id)),
        5,
      );
    }
    if (!visualContact.contact) {
      visualContact = closestContact(
        weaponItems,
        frame.playerItems.filter((item) => !PLAYER_NON_HURT_ITEM_IDS.has(item.id)),
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
    const hurtItems = createTrainingEnemyItems(enemy, 0).filter(
      (item) => !ENEMY_NON_HURT_ITEM_IDS.has(item.id),
    );
    const visualContact = closestContact(frame.playerWeaponItems, hurtItems);
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
    const bossPunishAccepted =
      enemy.role !== 'boss' ||
      enemy.punishWindowOpen ||
      enemy.punishComboCycle === combatState.comboCycle;
    if (this.entity.encounterProfile.guardOutsidePunish && !bossPunishAccepted) {
      this.emitCombatEvent(COMBAT_EVENT_TYPE.GUARD, {
        actor: 'enemy',
        target: 'player',
        attackId: combatState.id,
        position: visualContact.position,
        direction: player.facing,
        strength: 1.25,
      });
      enemy.hitFlashSeconds = 0.07;
      this.cameraFeedbackOccurred.emit(
        Object.freeze({ direction: player.facing, strength: 1, durationSeconds: 0.055 }),
      );
      return true;
    }
    if (enemy.aiState === 'guard' && enemy.position.y >= enemy.groundY) {
      this.emitCombatEvent(COMBAT_EVENT_TYPE.GUARD, {
        actor: 'enemy',
        target: 'player',
        attackId: combatState.id,
        position: visualContact.position,
        direction: player.facing,
        strength: 0.8,
      });
      enemy.hitFlashSeconds = 0.08;
      this.startRecovery({
        source: 'guard',
        durationSeconds: 0.24,
        weaponStartAngle: -0.65,
        bodyStartRotation: enemy.rotation,
      });
      return true;
    }
    const enemyAirborne = enemy.position.y < enemy.groundY;
    const backPunish =
      enemy.punishWindowOpen &&
      (enemy.role === 'boss' || (player.position.x - enemy.position.x) * enemy.attackFacing < 0);
    if (backPunish && enemy.role === 'boss') enemy.punishComboCycle = combatState.comboCycle;
    const finalPulse = !profile.hitPulses || pulseIndex === profile.hitPulses.length - 1;
    const juggleRole =
      profile.juggleRole ?? (enemyAirborne ? 'sustain' : finalPulse ? 'launcher' : null);
    const damageScale = enemyAirborne ? Math.max(0.4, 1 - enemy.juggleHits * 0.1) : 1;
    const damage = Math.max(1, Math.round(profile.damage * damageScale));
    this.emitCombatEvent(
      backPunish
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
        outcome: backPunish ? 'back-punish' : undefined,
        strength: 1 + Math.min(2.5, damage * 0.08) + (backPunish ? 0.5 : 0),
      },
    );
    enemy.health = Math.max(0, enemy.health - damage);
    if (enemy.health === 0 && !this.completionEmitted) {
      this.completionEmitted = true;
      this.encounterCompleted.emit(
        Object.freeze({
          entityId: enemy.id,
          profileId: enemy.profileId,
          role: enemy.role,
        }),
      );
    }
    this.confirmedComboCycle = combatState.comboCycle;
    enemy.comboCycleHitPending = enemy.health > 0;
    enemy.lastReceivedComboCycle = combatState.comboCycle;
    enemy.hitstunSeconds = Math.max(
      enemy.hitstunSeconds,
      (0.16 + damage * 0.008) * (profile.hitstunScale ?? 1),
    );
    enemy.hitReactionWeaponLength = sampleTrainingEnemyWeaponLength(enemy);
    enemy.hitReactionWeaponAngle =
      profile.damage >= 22 ? 0.35 : profile.launchY < -300 ? -1.1 : 0.2;
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
          (backPunish ? 0.5 : 0),
        durationSeconds: profile.damage >= 20 || juggleRole === 'finisher' ? 0.12 : 0.085,
      }),
    );
    return true;
  }

  emitCombatEvent(type, payload) {
    this.combatEventOccurred.emit(Object.freeze({ type, payload: Object.freeze(payload) }));
  }
}

export const TRAINING_ENCOUNTER_SCENE = new Scene((options) => new TrainingEncounterNode(options));
