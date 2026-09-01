import {
  combatMotionFrameData,
  CombatCommandController,
} from '../combat/CombatCommandController.js';
import { CombatCameraFeedback } from '../combat/CombatCameraFeedback.js';
import { COMBAT_EVENT_TYPE, CombatEventBuffer } from '../combat/CombatEvent.js';
import { combatFramesToSeconds } from '../combat/CombatFrame.js';
import {
  PLAYER_CHARACTER_FOOT_OFFSET,
  PLAYER_COMBAT_GEOMETRY_SCALE,
  createSweptWeaponGeometry,
  samplePlayerCombatGeometry as sampleSharedPlayerCombatGeometry,
} from '../combat/SharedCombatGeometry.js';
import { samplePlayerMotionPose } from '../animation/PlayerMotionPose.js';
import { SceneNode } from '../core/SceneNode.js';
import { Signal } from '../core/Signal.js';
import { GameStatusNode } from './GameStatusNode.js';
import { createPlayerCombatPresentation } from './PlayerCombatPresentation.js';
import { FirstJourneyProgress } from './encounter/FirstJourneyProgress.js';
import { RegionExpansionProgress } from './encounter/RegionExpansionProgress.js';
import { MapRuntime } from './map/MapRuntime.js';
import {
  PROGRESSION_TRANSACTION_REASON,
  assertProgressionSnapshot,
  awardTrainingMarks,
  createProgressionSnapshot,
  getAvailableGold,
  mergeProgressionSnapshot,
  purchaseEquipment as purchaseProgressionEquipment,
  selectEquipment as selectProgressionEquipment,
  trainCombatSkill as trainProgressionCombatSkill,
} from './progression/ProgressionState.js';
import { ROOM_SCENE } from './room/RoomNode.js';
import { resolveFirstJourneyStory } from './story/FirstJourneyStory.js';
import { StoryInteractionOwner } from './story/StoryInteractionOwner.js';
import {
  createTrainingEnemyItems,
  sampleTrainingEnemyCombatFrame,
} from './training/TrainingEncounterPresentation.js';
import {
  commitWorldAction as commitWorldTimeAction,
  getWorldClockReadModel,
  toWorldTimeSnapshot,
} from './world/WorldTimeState.js';

const CHARACTER_SPEED = 230;
const JUMP_SPEED = 470;
const GRAVITY = 1180;
const ROLL_DURATION_SECONDS = combatFramesToSeconds(25);
const ROLL_SPEED = 320;
const LANDING_RECOVERY_SECONDS = combatFramesToSeconds(8);

const PLAYER_KNOCKBACK_STOP_SPEED = 4;
function attackHitProfile(motionId, { startFrame, endFrame, hitPulseFrames, ...profile }) {
  const motionFrame = combatMotionFrameData(motionId);
  if (!motionFrame) throw new Error(`${motionId}에는 CombatFrame data가 필요합니다.`);
  if (startFrame < 0 || endFrame > motionFrame.durationFrames || endFrame < startFrame) {
    throw new RangeError(`${motionId} hit frame window가 motion duration을 벗어났습니다.`);
  }
  return Object.freeze({
    ...profile,
    frame: Object.freeze({ startFrame, endFrame }),
    start: startFrame / motionFrame.durationFrames,
    end: endFrame / motionFrame.durationFrames,
    ...(hitPulseFrames
      ? {
          hitPulseFrames: Object.freeze(hitPulseFrames),
          hitPulses: Object.freeze(
            hitPulseFrames.map((frame) => frame / motionFrame.durationFrames),
          ),
        }
      : {}),
  });
}

const BASE_ATTACK_HIT_PROFILES = Object.freeze({
  slash: attackHitProfile('slash', {
    startFrame: 11,
    endFrame: 22,
    damage: 12,
    range: 28,
    launchY: -90,
  }),
  heavy: attackHitProfile('heavy', {
    startFrame: 19,
    endFrame: 33,
    damage: 22,
    range: 68,
    launchY: -150,
    guardBreak: true,
  }),
  thrust: attackHitProfile('thrust', {
    startFrame: 10,
    endFrame: 18,
    damage: 15,
    range: 82,
    launchY: -80,
  }),
  rising: attackHitProfile('rising', {
    startFrame: 15,
    endFrame: 27,
    damage: 18,
    range: 66,
    launchY: -470,
    juggleRole: 'launcher',
    relaunchSpeed: 310,
    floatSeconds: 0.16,
    guardBreak: true,
  }),
  spin: attackHitProfile('spin', {
    startFrame: 12,
    endFrame: 41,
    damage: 8,
    range: 72,
    launchY: -70,
    relaunchSpeed: 260,
    floatSeconds: 0.08,
    hitPulseFrames: [14, 25, 36],
    contactSpacings: Object.freeze([23, 17, 5]),
  }),
  airSlash: attackHitProfile('airSlash', {
    startFrame: 9,
    endFrame: 18,
    damage: 13,
    range: 70,
    launchY: -110,
    juggleRole: 'sustain',
    relaunchSpeed: 190,
    floatSeconds: 0.1,
  }),
  airHeavy: attackHitProfile('airHeavy', {
    startFrame: 12,
    endFrame: 23,
    damage: 26,
    range: 72,
    launchY: 300,
    juggleRole: 'finisher',
    groundBounce: true,
    guardBreak: true,
  }),
  airReturn: attackHitProfile('airReturn', {
    startFrame: 8,
    endFrame: 17,
    damage: 15,
    range: 70,
    launchY: -90,
    juggleRole: 'sustain',
    relaunchSpeed: 170,
    floatSeconds: 0.09,
  }),
  airSpin: attackHitProfile('airSpin', {
    startFrame: 4,
    endFrame: 8,
    damage: 20,
    range: 76,
    launchY: -150,
    juggleRole: 'sustain',
    relaunchSpeed: 250,
    floatSeconds: 0.17,
    guardBreak: true,
  }),
  airCross: attackHitProfile('airCross', {
    startFrame: 11,
    endFrame: 23,
    damage: 24,
    range: 74,
    launchY: 250,
    juggleRole: 'finisher',
  }),
  shieldBash: attackHitProfile('shieldBash', {
    startFrame: 8,
    endFrame: 17,
    damage: 16,
    range: 34,
    launchY: -90,
    contactPart: 'shield',
  }),
});
const CHARACTER_RENDER_SCALE = PLAYER_COMBAT_GEOMETRY_SCALE;
const CHARACTER_CELL_SIZE = 48;
const CHARACTER_BOUNDARY_HALF_WIDTH = CHARACTER_CELL_SIZE / 2;
const CHARACTER_FOOT_OFFSET = PLAYER_CHARACTER_FOOT_OFFSET;

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothStep(amount) {
  const bounded = Math.max(0, Math.min(1, amount));
  return bounded * bounded * (3 - 2 * bounded);
}

function resolveEquipmentAttackProfile(motionId, motionFrame, equipmentProfile, skillProfile) {
  const baseProfile = BASE_ATTACK_HIT_PROFILES[motionId];
  if (!baseProfile || !motionFrame) return null;
  const baseMotionFrame = combatMotionFrameData(motionId);
  const startupShift = motionFrame.startupFrames - baseMotionFrame.startupFrames;
  const startFrame = baseProfile.frame.startFrame + startupShift;
  const endFrame = baseProfile.frame.endFrame + startupShift;
  const hitPulseCount = Math.max(1, skillProfile.spinHitCount);
  const hitPulseFrames = baseProfile.hitPulseFrames
    ?.slice(0, hitPulseCount)
    .map((frame) => frame + startupShift);
  return Object.freeze({
    ...baseProfile,
    damage: baseProfile.damage * equipmentProfile.attack.damageScale * skillProfile.damageScale,
    range: baseProfile.range * equipmentProfile.attack.rangeScale,
    hitstunScale: equipmentProfile.attack.hitstunScale,
    launchY: baseProfile.launchY * equipmentProfile.attack.launchScale,
    ...(baseProfile.relaunchSpeed
      ? { relaunchSpeed: baseProfile.relaunchSpeed * equipmentProfile.attack.launchScale }
      : {}),
    ...(baseProfile.contactSpacings
      ? { contactSpacings: Object.freeze(baseProfile.contactSpacings.slice(0, hitPulseCount)) }
      : {}),
    frame: Object.freeze({ startFrame, endFrame }),
    start: startFrame / motionFrame.durationFrames,
    end: endFrame / motionFrame.durationFrames,
    ...(hitPulseFrames
      ? {
          hitPulseFrames: Object.freeze(hitPulseFrames),
          hitPulses: Object.freeze(
            hitPulseFrames.map((frame) => frame / motionFrame.durationFrames),
          ),
        }
      : {}),
  });
}

function assertEquipmentCatalog(catalog) {
  if (
    !catalog ||
    typeof catalog.defaultProfileId !== 'string' ||
    !Array.isArray(catalog.profiles) ||
    typeof catalog.getProfile !== 'function'
  ) {
    throw new TypeError('GameScene에는 authored equipment catalog 주입이 필요합니다.');
  }
  return catalog;
}

function assertCombatProgressionProfile(profile) {
  if (
    !profile ||
    !Number.isInteger(profile.trainingClearReward) ||
    !Number.isInteger(profile.maxSkillLevel) ||
    typeof profile.getSkillLevelProfile !== 'function' ||
    typeof profile.getSkillUpgradeCost !== 'function' ||
    typeof profile.getSkillTrainingMarkRequirement !== 'function'
  ) {
    throw new TypeError('GameScene에는 authored combat progression profile 주입이 필요합니다.');
  }
  return profile;
}

function assertEncounterFactory(factory) {
  if (typeof factory !== 'function') {
    throw new TypeError('GameScene에는 composition-owned encounter factory 주입이 필요합니다.');
  }
  return factory;
}

function assertEncounterAttackProfiles(profiles) {
  if (!profiles || typeof profiles !== 'object' || !profiles.light) {
    throw new TypeError('GameScene에는 authored encounter attack profile 주입이 필요합니다.');
  }
  return profiles;
}

function assertWorldTimeProfile(profile) {
  if (
    !profile ||
    typeof profile.getTravelAction !== 'function' ||
    typeof profile.getCoreEventAction !== 'function'
  ) {
    throw new TypeError('GameScene에는 authored world time profile 주입이 필요합니다.');
  }
  return profile;
}

export class GameScene extends SceneNode {
  constructor({
    mapDefinition,
    equipmentCatalog,
    combatProgressionProfile,
    encounterFactory,
    encounterAttackProfiles,
    worldTimeProfile,
    progressionSnapshot = null,
  } = {}) {
    super('GameScene');
    if (!mapDefinition)
      throw new TypeError('GameScene에는 authored mapDefinition 주입이 필요합니다.');
    this.equipmentCatalog = assertEquipmentCatalog(equipmentCatalog);
    this.combatProgressionProfile = assertCombatProgressionProfile(combatProgressionProfile);
    this.encounterFactory = assertEncounterFactory(encounterFactory);
    this.encounterAttackProfiles = assertEncounterAttackProfiles(encounterAttackProfiles);
    this.worldTimeProfile = assertWorldTimeProfile(worldTimeProfile);
    const initialProgression =
      progressionSnapshot ?? createProgressionSnapshot(this.equipmentCatalog.defaultProfileId);
    this.progressionSnapshot = mergeProgressionSnapshot(initialProgression);
    this.equipmentProfile = this.equipmentCatalog.getProfile(
      this.progressionSnapshot.equippedEquipmentId,
    );
    const skillProfile = this.getCombatSkillProfile();
    this.combatCommands = new CombatCommandController({
      timingProfile: this.equipmentProfile.combatTiming,
      commandProfile: skillProfile,
    });
    this.combatCameraFeedback = new CombatCameraFeedback();
    this.combatEvents = new CombatEventBuffer();
    this.journeyProgress = new FirstJourneyProgress(this.progressionSnapshot.firstJourney);
    this.regionExpansionProgress = new RegionExpansionProgress(
      this.progressionSnapshot.regionExpansion,
    );
    this.worldTimeSnapshot = toWorldTimeSnapshot(this.progressionSnapshot.worldTime);
    this.storyInteractionOwner = new StoryInteractionOwner();
    this.mapRuntime = new MapRuntime(mapDefinition, {
      worldContext: {
        timePhase: 'day',
        deadlineMinutes: this.worldTimeSnapshot.deadlineMinutes,
        crisis: this.worldTimeSnapshot.crisis,
        weather: 'clear',
        storyFlags: {
          ...this.journeyProgress.snapshot().storyFlags,
          ...this.regionExpansionProgress.snapshot().storyFlags,
        },
      },
    });
    this.renderFrameCreated = this.ownSignal(new Signal('renderFrameCreated'));
    this.roomChanged = this.ownSignal(new Signal('roomChanged'));
    this.progressionChanged = this.ownSignal(new Signal('progressionChanged'));
    this.roomSceneNode = null;
    this.roomSceneConnections = [];
    this.statusNode = this.addChild(new GameStatusNode(this));
    this.playerStatusChanged = this.statusNode.playerStatusChanged;
    this.worldStatusChanged = this.statusNode.worldStatusChanged;
    this.reset();
  }

  getCombatSkillProfile() {
    return this.combatProgressionProfile.getSkillLevelProfile(
      this.progressionSnapshot.combatSkillLevel,
    );
  }

  getProgressionSnapshot() {
    return this.progressionSnapshot;
  }

  restoreProgression(snapshot) {
    assertProgressionSnapshot(snapshot);
    const nextSnapshot = mergeProgressionSnapshot(snapshot);
    const nextEquipment = this.equipmentCatalog.getProfile(nextSnapshot.equippedEquipmentId);
    const nextJourney = new FirstJourneyProgress(nextSnapshot.firstJourney);
    const nextRegionExpansion = new RegionExpansionProgress(nextSnapshot.regionExpansion);

    this.progressionSnapshot = nextSnapshot;
    this.equipmentProfile = nextEquipment;
    this.journeyProgress = nextJourney;
    this.regionExpansionProgress = nextRegionExpansion;
    this.worldTimeSnapshot = toWorldTimeSnapshot(nextSnapshot.worldTime);
    this.reset();
    return this.progressionSnapshot;
  }

  onPhysicsProcess(deltaSeconds, context = {}) {
    if (context.active === false) return;
    this.update(deltaSeconds, context.inputSnapshot ?? {}, context.simulationSettings ?? {});
  }

  onEnterTree() {
    if (this.roomSceneNode) this.connectRoomSceneSignals(this.roomSceneNode);
  }

  reset() {
    const journey = this.journeyProgress.restore(this.progressionSnapshot.firstJourney);
    const regionExpansion = this.regionExpansionProgress.restore(
      this.progressionSnapshot.regionExpansion,
    );
    this.worldTimeSnapshot = toWorldTimeSnapshot(this.progressionSnapshot.worldTime);
    this.timePhase = getWorldClockReadModel(this.worldTimeSnapshot).timePhase;
    this.mapRuntime.setWorldContext({
      timePhase: this.timePhase,
      deadlineMinutes: this.worldTimeSnapshot.deadlineMinutes,
      crisis: this.worldTimeSnapshot.crisis,
      weather: 'clear',
      storyFlags: { ...journey.storyFlags, ...regionExpansion.storyFlags },
    });
    const mapSnapshot = this.mapRuntime.reset();
    const spawn = mapSnapshot.spawn?.position ?? { x: 270, y: 350 };
    this.position = { ...spawn };
    this.previousPosition = { ...this.position };
    this.animationTime = 0;
    this.previousAnimationTime = 0;
    this.verticalVelocity = 0;
    this.airComboFloatSeconds = 0;
    this.airComboGravityScale = 1;
    this.airComboFacing = 0;
    this.combatFacingCycle = 0;
    this.combatFacing = 1;
    this.landingRecoverySeconds = 0;
    this.isGrounded = true;
    this.jumpWasPressed = false;
    this.guardWasPressed = false;
    this.movementIntent = 0;
    this.rollState = null;
    this.hitStopSeconds = 0;
    this.playerMaxHealth = journey.fieldWardActive ? 120 : 100;
    this.playerHealth = this.playerMaxHealth;
    this.playerHitstunSeconds = 0;
    this.playerInvulnerableSeconds = 0;
    this.playerKoSeconds = 0;
    this.playerBlockImpactSeconds = 0;
    this.playerBlockImpactStrength = 0;
    this.playerBlockstunSeconds = 0;
    this.playerBlockstunDurationSeconds = 0;
    this.playerRetaliationPending = false;
    this.playerRetaliationSeconds = 0;
    this.pendingPlayerKnockbackX = 0;
    this.pendingPlayerKnockbackDecayRate = 0.02;
    this.playerKnockbackVelocityX = 0;
    this.playerKnockbackDecayRate = 0.02;
    this.airHeavyConnectedSequence = 0;
    this.playerWeaponContactHistory = [];
    this.playerCombatGeometry = null;
    this.progressionNotice = `훈련 인장은 학습 조건, 원정 Gold는 장비·command 성장 비용입니다.`;
    this.recoveryNotice = '';
    this.storyInteractionOwner.reset();
    this.lastJumpSequence = 0;
    this.facing = mapSnapshot.spawn?.facing ?? 1;
    this.portalTransitionPresentation = null;
    this.cameraPosition = { ...mapSnapshot.cameraPosition };
    this.previousCameraPosition = { ...this.cameraPosition };
    this.equipmentProfile = this.equipmentCatalog.getProfile(
      this.progressionSnapshot.equippedEquipmentId,
    );
    this.combatCommands.reset();
    this.combatCommands.setTimingProfile(this.equipmentProfile.combatTiming);
    this.combatCommands.setCommandProfile(this.getCombatSkillProfile());
    this.combatCameraFeedback.reset();
    this.combatEvents.reset();
    this.replaceRoomScene(mapSnapshot, { resetExisting: true });
    this.statusNode.publish({ force: true });
  }

  setVisualQaLocation({ regionId, roomId, x }) {
    const mapSnapshot = this.mapRuntime.setActiveLocation(regionId, roomId);
    this.replaceRoomScene(mapSnapshot, { resetExisting: true });
    const room = this.mapRuntime.getActiveRoom();
    const minX = room.movementBounds?.minX ?? room.bounds.x;
    const maxX = room.movementBounds?.maxX ?? room.bounds.x + room.bounds.width;
    const requestedX = room.bounds.x + (x ?? 140);
    const playerX = Math.max(
      minX + CHARACTER_BOUNDARY_HALF_WIDTH,
      Math.min(maxX - CHARACTER_BOUNDARY_HALF_WIDTH, requestedX),
    );
    this.position = {
      x: playerX,
      y: this.mapRuntime.getGroundYAt(playerX) - CHARACTER_FOOT_OFFSET,
    };
    this.previousPosition = { ...this.position };
    this.cameraPosition = { ...mapSnapshot.cameraPosition };
    this.previousCameraPosition = { ...this.cameraPosition };
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.statusNode.publish({ force: true });
    return mapSnapshot;
  }

  setVisualQaCombatScenario(scenarioId, phase = 'active') {
    const encounter = this.roomSceneNode?.encounter;
    if (!encounter?.enemy)
      throw new Error('Combat Visual QA에는 active training encounter가 필요합니다.');
    const enemy = encounter.enemy;
    const groundY = this.mapRuntime.getActiveRoom().groundY;
    const playerX = this.position.x;
    this.position = { x: playerX, y: groundY - CHARACTER_FOOT_OFFSET };
    this.previousPosition = { ...this.position };
    this.facing = 1;
    this.isGrounded = true;
    this.verticalVelocity = 0;
    this.rollState = null;
    this.landingRecoverySeconds = 0;
    this.playerBlockImpactSeconds = 0;
    this.playerBlockImpactStrength = 0;
    this.playerHitstunSeconds = 0;
    this.playerRetaliationSeconds = 0;
    this.combatEvents.reset();
    this.combatCommands.reset();
    enemy.position = { x: playerX + 85, y: groundY };
    enemy.velocityX = 0;
    enemy.velocityY = 0;
    enemy.rotation = 0;
    enemy.aiState = 'idle';
    enemy.aiSeconds = 0;
    enemy.attackKind = 'light';
    enemy.hitstunSeconds = 0;
    enemy.punishWindowOpen = false;
    enemy.retaliationInvulnerableSeconds = 0;
    encounter.lastVisualContact = Object.freeze({
      attacker: 'player',
      sequence: 1,
      pulseIndex: 0,
      contact: true,
      gap: 0,
      simulationGap: 0,
      weaponItemId: 'sword-blade',
      hurtItemId: 'combat-enemy-training-mask',
      position: Object.freeze({ x: playerX + 62, y: groundY - 72 }),
    });
    encounter.contactSeconds =
      phase === 'active' &&
      ['combat-hit', 'combat-block', 'combat-evade', 'combat-punish', 'combat-launch'].includes(
        scenarioId,
      )
        ? 0.18
        : 0;

    if (
      ![
        'combat-hit',
        'combat-block',
        'combat-evade',
        'combat-punish',
        'combat-launch',
        'combat-landing',
        'combat-retaliation',
        'combat-strong-windup',
        'combat-guard-break',
        'combat-just-guard',
        'combat-guard-counter',
        'posture-full',
        'posture-reduced',
        'posture-groggy',
        'posture-normal-enemy',
      ].includes(scenarioId)
    ) {
      throw new Error(`지원하지 않는 Combat Visual QA scenario입니다: ${scenarioId}`);
    }
    if (!['start', 'active', 'end'].includes(phase)) {
      throw new Error(`지원하지 않는 Combat Visual QA phase입니다: ${phase}`);
    }
    if (phase === 'end') return;

    const active = phase === 'active';

    const emit = (type, payload = {}) =>
      this.combatEvents.emit(type, {
        actor: 'player',
        target: 'enemy',
        position: encounter.lastVisualContact.position,
        direction: 1,
        strength: 1.2,
        ...payload,
      });
    const startMotion = (motionId, elapsedSeconds) => {
      this.combatCommands.start(motionId);
      this.combatCommands.active.elapsedSeconds = elapsedSeconds;
    };

    switch (scenarioId) {
      case 'posture-full':
        encounter.setVisualQaPostureScenario('full');
        break;
      case 'posture-reduced':
        startMotion('heavy', active ? 0.38 : 0.05);
        encounter.setVisualQaPostureScenario('reduced');
        break;
      case 'posture-groggy':
        startMotion('shieldBash', active ? 0.19 : 0.04);
        encounter.setVisualQaPostureScenario('groggy', { emitBreak: active });
        break;
      case 'posture-normal-enemy':
        encounter.setVisualQaPostureScenario('absent');
        break;
      case 'combat-hit':
        startMotion('slash', active ? 0.25 : 0.04);
        if (active) {
          enemy.aiState = 'hitstun';
          enemy.hitstunSeconds = 0.18;
          enemy.hitFlashSeconds = 0.12;
          emit(COMBAT_EVENT_TYPE.HIT);
        }
        break;
      case 'combat-block':
        this.combatCommands.update(0, { guard: true });
        this.playerBlockImpactSeconds = active ? 0.14 : 0;
        this.playerBlockImpactStrength = active ? 1 : 0;
        encounter.lastVisualContact = Object.freeze({
          ...encounter.lastVisualContact,
          attacker: 'enemy',
          weaponItemId: 'combat-enemy-weapon',
          hurtItemId: 'shield',
          position: Object.freeze({ x: playerX + 25, y: groundY - 70 }),
        });
        if (active) emit(COMBAT_EVENT_TYPE.GUARD);
        break;
      case 'combat-evade':
        this.rollState = {
          direction: 1,
          elapsedSeconds: ROLL_DURATION_SECONDS * (active ? 0.5 : 0.08),
          durationSeconds: ROLL_DURATION_SECONDS,
        };
        encounter.lastVisualContact = Object.freeze({
          ...encounter.lastVisualContact,
          attacker: 'enemy',
          weaponItemId: 'combat-enemy-weapon',
          hurtItemId: 'uniform-front-panel',
          position: Object.freeze({ x: playerX + 20, y: groundY - 68 }),
        });
        if (active) emit(COMBAT_EVENT_TYPE.EVADE, { position: this.position });
        break;
      case 'combat-punish':
        startMotion('heavy', active ? 0.38 : 0.05);
        enemy.aiState = 'recovery';
        enemy.aiSeconds = 0.18;
        enemy.recoveryDurationSeconds = 0.3;
        enemy.recoverySource = 'attack';
        enemy.punishWindowOpen = true;
        if (active) emit(COMBAT_EVENT_TYPE.PUNISH, { outcome: 'back-punish' });
        break;
      case 'combat-launch':
        startMotion('rising', active ? 0.3 : 0.05);
        if (active) {
          enemy.position = { x: playerX + 85, y: groundY - 88 };
          enemy.velocityY = -240;
          enemy.juggleHits = 1;
          enemy.aiState = 'hitstun';
          enemy.hitstunSeconds = 0.2;
          emit(COMBAT_EVENT_TYPE.LAUNCH);
        }
        break;
      case 'combat-landing':
        this.landingRecoverySeconds = active ? LANDING_RECOVERY_SECONDS : 0;
        if (!active) {
          this.isGrounded = false;
          this.position = { x: this.position.x, y: this.position.y - 18 };
          this.previousPosition = { ...this.position };
          this.verticalVelocity = 90;
        } else {
          emit(COMBAT_EVENT_TYPE.LANDING, {
            target: 'player',
            position: { x: this.position.x, y: groundY },
            strength: 0.6,
            durationSeconds: LANDING_RECOVERY_SECONDS,
          });
        }
        break;
      case 'combat-retaliation':
        startMotion('slash', active ? 0.25 : 0.04);
        enemy.retaliationInvulnerableSeconds = active ? 0.55 : 0;
        enemy.aiState = 'recovery';
        enemy.aiSeconds = 0.08;
        enemy.recoveryDurationSeconds = 0.08;
        enemy.recoverySource = 'retaliation';
        break;
      case 'combat-strong-windup':
        enemy.aiState = 'windup';
        enemy.attackKind = 'heavy';
        enemy.attackFacing = -1;
        enemy.aiSeconds = active ? combatFramesToSeconds(8) : combatFramesToSeconds(28);
        break;
      case 'combat-guard-break':
        if (active) {
          encounter.lastVisualContact = Object.freeze({
            ...encounter.lastVisualContact,
            attacker: 'enemy',
            weaponItemId: 'combat-enemy-weapon',
            hurtItemId: 'shield',
            position: Object.freeze({ x: playerX + 25, y: groundY - 70 }),
          });
          encounter.contactSeconds = 0.18;
          this.combatCommands.update(0, { guard: true });
          this.combatCommands.applyGuardContact({ guardBreak: true });
          this.playerBlockImpactSeconds = 0.22;
          this.playerBlockImpactStrength = 1.35;
          this.playerBlockstunSeconds = combatFramesToSeconds(28);
          this.playerBlockstunDurationSeconds = this.playerBlockstunSeconds;
          emit(COMBAT_EVENT_TYPE.GUARD_BREAK, {
            actor: 'player',
            target: 'enemy',
            position: encounter.lastVisualContact.position,
            strength: 2,
          });
        }
        break;
      case 'combat-just-guard':
        this.combatCommands.trySpendAction('strongAttack');
        this.combatCommands.trySpendAction('strongAttack');
        this.combatCommands.update(0, { guard: true });
        encounter.lastVisualContact = Object.freeze({
          ...encounter.lastVisualContact,
          attacker: 'enemy',
          weaponItemId: 'combat-enemy-weapon',
          hurtItemId: 'shield',
          position: Object.freeze({ x: playerX + 25, y: groundY - 70 }),
        });
        encounter.contactSeconds = active ? 0.18 : 0;
        if (active) {
          this.applyTrainingEncounterPlayerResult({
            kind: 'guard',
            attackId: 'light',
            contactPosition: encounter.lastVisualContact.position,
            contactDirection: 1,
            guardStaminaDamage: 24,
            justGuardEligible: true,
            blockImpactSeconds: 0.14,
            blockImpactStrength: 0.55,
            blockstunSeconds: combatFramesToSeconds(7),
            hitStopSeconds: 0.04,
          });
        }
        break;
      case 'combat-guard-counter':
        startMotion('shieldBash', active ? 0.19 : 0.04);
        encounter.lastVisualContact = Object.freeze({
          ...encounter.lastVisualContact,
          attacker: 'player',
          weaponItemId: 'shield',
          hurtItemId: 'combat-enemy-body',
          position: Object.freeze({ x: playerX + 57, y: groundY - 63 }),
        });
        encounter.contactSeconds = active ? 0.18 : 0;
        if (active) {
          enemy.aiState = 'hitstun';
          enemy.hitstunSeconds = 0.2;
          enemy.hitFlashSeconds = 0.13;
          emit(COMBAT_EVENT_TYPE.COUNTER, {
            attackId: 'shieldBash',
            outcome: 'just-guard-counter',
            strength: 2,
          });
        }
        break;
      default:
        throw new Error(`지원하지 않는 Combat Visual QA scenario입니다: ${scenarioId}`);
    }
    this.statusNode.publish({ force: true });
  }

  setVisualQaPoseScenario(scenarioId) {
    const groundY = this.mapRuntime.getActiveRoom().groundY;
    this.position = { x: this.position.x, y: groundY - CHARACTER_FOOT_OFFSET };
    this.previousPosition = { ...this.position };
    this.facing = 1;
    this.isGrounded = true;
    this.verticalVelocity = 0;
    this.movementIntent = 0;
    this.rollState = null;
    this.landingRecoverySeconds = 0;
    this.playerHitstunSeconds = 0;
    this.combatCommands.reset();

    switch (scenarioId) {
      case 'pose-idle':
        break;
      case 'pose-move':
        this.movementIntent = 1;
        break;
      case 'pose-guard':
        this.combatCommands.update(0, { guard: true });
        break;
      case 'pose-roll':
        this.rollState = {
          direction: 1,
          elapsedSeconds: ROLL_DURATION_SECONDS * 0.5,
          durationSeconds: ROLL_DURATION_SECONDS,
        };
        break;
      case 'pose-ground-attack':
        this.combatCommands.start('slash');
        this.combatCommands.active.elapsedSeconds = 0.2;
        break;
      case 'pose-air-attack':
        this.isGrounded = false;
        this.position = { x: this.position.x, y: this.position.y - 75 };
        this.previousPosition = { ...this.position };
        this.verticalVelocity = -65;
        this.combatCommands.start('airSlash');
        this.combatCommands.active.elapsedSeconds = 0.16;
        break;
      case 'pose-hit':
        this.playerHitstunSeconds = 0.18;
        break;
      default:
        throw new Error(`지원하지 않는 pose Visual QA scenario입니다: ${scenarioId}`);
    }
  }

  toggleTimePhase() {
    const current = getWorldClockReadModel(this.worldTimeSnapshot);
    this.worldTimeSnapshot = toWorldTimeSnapshot({
      ...this.worldTimeSnapshot,
      clockMinutes:
        this.worldTimeSnapshot.clockMinutes -
        current.hour * 60 -
        current.minute +
        (this.timePhase === 'night' ? 10 * 60 : 21 * 60),
    });
    this.updateTimePhase();
    const status = this.getWorldStatus();
    this.statusNode.publish({ force: true });
    return status;
  }

  setVisualQaTimePhase(timePhase) {
    if (timePhase !== 'day' && timePhase !== 'night') {
      throw new Error(`지원하지 않는 Visual QA time phase입니다: ${timePhase}`);
    }
    const current = getWorldClockReadModel(this.worldTimeSnapshot);
    this.worldTimeSnapshot = toWorldTimeSnapshot({
      ...this.worldTimeSnapshot,
      clockMinutes:
        this.worldTimeSnapshot.clockMinutes -
        current.hour * 60 -
        current.minute +
        (timePhase === 'night' ? 21 * 60 : 10 * 60),
    });
    this.updateTimePhase();
    this.statusNode.publish({ force: true });
    return this.getWorldStatus();
  }

  updateTimePhase() {
    const nextPhase = getWorldClockReadModel(this.worldTimeSnapshot).timePhase;
    if (nextPhase === this.timePhase) return;
    this.timePhase = nextPhase;
    this.mapRuntime.setWorldContext({
      ...this.mapRuntime.getWorldContext(),
      timePhase: nextPhase,
    });
  }

  syncJourneyWorldContext() {
    this.mapRuntime.setWorldContext({
      ...this.mapRuntime.getWorldContext(),
      storyFlags: {
        ...this.journeyProgress.snapshot().storyFlags,
        ...this.regionExpansionProgress.snapshot().storyFlags,
      },
    });
  }

  emitDurableProgressionChanged() {
    this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
      firstJourney: this.journeyProgress.persistenceSnapshot(),
      regionExpansion: this.regionExpansionProgress.persistenceSnapshot(),
      worldTime: this.worldTimeSnapshot,
    });
    this.progressionChanged.emit(this.progressionSnapshot);
    return this.progressionSnapshot;
  }

  applyWorldAction(actionId, action, { repeatable = action?.repeatable === true } = {}) {
    if (!action) return Object.freeze({ changed: false, snapshot: this.worldTimeSnapshot });
    const transaction = commitWorldTimeAction(this.worldTimeSnapshot, {
      actionId,
      ...action,
      repeatable,
    });
    if (!transaction.changed) return transaction;
    this.worldTimeSnapshot = transaction.snapshot;
    this.updateTimePhase();
    this.mapRuntime.setWorldContext({
      ...this.mapRuntime.getWorldContext(),
      deadlineMinutes: this.worldTimeSnapshot.deadlineMinutes,
      crisis: this.worldTimeSnapshot.crisis,
    });
    this.progressionNotice = `${action.label} · World Clock ${action.clockCostMinutes}분 · Deadline ${this.worldTimeSnapshot.deadlineMinutes}분`;
    return transaction;
  }

  canStartPortalTransition() {
    if (this.mapRuntime.getTransition()) return false;
    const combatState = this.combatCommands.snapshot();
    return this.isGrounded && !this.rollState && combatState.id === 'idle';
  }

  beginPortalTransition(portal) {
    const transition = this.mapRuntime.beginPortalTransition(portal.id);
    this.portalTransitionPresentation = {
      sourceLocation: { ...this.mapRuntime.getActiveLocation() },
      startPosition: { ...this.position },
      destinationPosition: { ...transition.destinationPosition },
      sourceCameraPosition: { ...this.cameraPosition },
      destinationCameraPosition: { ...transition.destinationCameraPosition },
    };
    this.verticalVelocity = 0;
    this.airComboFloatSeconds = 0;
    this.airComboGravityScale = 1;
    this.isGrounded = true;
    this.recoveryNotice = '';
    return true;
  }

  tryPortalTransition() {
    if (!this.canStartPortalTransition()) return false;
    const portal = this.mapRuntime.findPortalAt({
      x: this.position.x,
      y: this.position.y + CHARACTER_FOOT_OFFSET,
    });
    return portal ? this.beginPortalTransition(portal) : false;
  }

  getStoryInteractionContext() {
    const mapSnapshot = this.mapRuntime.getResolvedSnapshot();
    return Object.freeze({
      entities: mapSnapshot.entities,
      playerPosition: Object.freeze({ ...this.position }),
    });
  }

  updatePortalTransition(deltaSeconds) {
    const presentation = this.portalTransitionPresentation;
    if (!presentation) return false;

    let transitionResult;
    try {
      transitionResult = this.mapRuntime.advanceTransition(deltaSeconds);
    } catch (error) {
      this.recoverPortalTransition(presentation, error);
      return true;
    }
    const { transition, completion } = transitionResult;
    const amount = smoothStep(transition.progress);
    this.position.x = lerp(
      presentation.startPosition.x,
      presentation.destinationPosition.x,
      amount,
    );
    this.position.y = lerp(
      presentation.startPosition.y,
      presentation.destinationPosition.y,
      amount,
    );
    this.cameraPosition = {
      x: lerp(
        presentation.sourceCameraPosition.x,
        presentation.destinationCameraPosition.x,
        amount,
      ),
      y: lerp(
        presentation.sourceCameraPosition.y,
        presentation.destinationCameraPosition.y,
        amount,
      ),
    };

    if (!completion) return true;
    try {
      this.replaceRoomScene(this.mapRuntime.getResolvedSnapshot());
    } catch (error) {
      this.recoverPortalTransition(presentation, error);
      return true;
    }
    this.position = { ...completion.position };
    this.cameraPosition = { ...presentation.destinationCameraPosition };
    this.portalTransitionPresentation = null;
    this.storyInteractionOwner.reset();
    const journeyTransition = this.journeyProgress.recordPortal(completion.portalId);
    const regionExpansionTransition = this.regionExpansionProgress.recordPortal(
      completion.portalId,
    );
    const travelAction = this.worldTimeProfile.getTravelAction(completion.travelSegmentId);
    const travelTransaction = this.applyWorldAction(
      `travel:${completion.travelSegmentId ?? completion.portalId}`,
      travelAction,
      { repeatable: true },
    );
    if (
      journeyTransition.changed ||
      regionExpansionTransition.changed ||
      travelTransaction.changed
    ) {
      this.syncJourneyWorldContext();
      this.emitDurableProgressionChanged();
      this.statusNode.publish({ force: true });
    }
    this.roomChanged.emit(
      Object.freeze({
        portalId: completion.portalId,
        active: Object.freeze({ ...completion.active }),
      }),
    );
    return true;
  }

  recoverPortalTransition(presentation, cause) {
    try {
      this.mapRuntime.cancelTransition();
      const sourceSnapshot = this.mapRuntime.setActiveLocation(
        presentation.sourceLocation.regionId,
        presentation.sourceLocation.roomId,
      );
      this.replaceRoomScene(sourceSnapshot);
      this.position = { ...presentation.startPosition };
      this.previousPosition = { ...this.position };
      this.cameraPosition = { ...presentation.sourceCameraPosition };
      this.previousCameraPosition = { ...this.cameraPosition };
      this.portalTransitionPresentation = null;
      this.storyInteractionOwner.reset();
      this.recoveryNotice = 'Room 전환 실패 · 출발 지점으로 복구됨 · ↑로 다시 시도하세요.';
      this.statusNode.publish({ force: true });
    } catch (recoveryError) {
      throw new AggregateError(
        [cause, recoveryError],
        'Room 전환 실패 뒤 출발 지점 복구에도 실패했습니다.',
        { cause: recoveryError },
      );
    }
  }

  updateCameraFollow(deltaSeconds) {
    const snapshot = this.mapRuntime.getResolvedSnapshot();
    const bounds = snapshot.cameraBounds;
    const minimumX = bounds.x + 480;
    const maximumX = bounds.x + bounds.width - 480;
    const targetX = Math.max(minimumX, Math.min(maximumX, this.position.x));
    const targetY = bounds.y + 270;
    const followAmount = 1 - Math.exp(-10 * deltaSeconds);
    this.cameraPosition.x = lerp(this.cameraPosition.x, targetX, followAmount);
    this.cameraPosition.y = lerp(this.cameraPosition.y, targetY, followAmount);
  }

  canManageProgression() {
    const location = this.mapRuntime.getActiveLocation();
    return (
      location.roomId === 'academy-plaza' &&
      !this.mapRuntime.getTransition() &&
      this.combatCommands.snapshot().id === 'idle'
    );
  }

  commitProgression(transaction, { equipmentChanged = false, skillChanged = false } = {}) {
    if (!transaction.changed) return transaction;
    const nextSnapshot = transaction.snapshot;
    const nextEquipment = this.equipmentCatalog.getProfile(nextSnapshot.equippedEquipmentId);
    const nextSkill = this.combatProgressionProfile.getSkillLevelProfile(
      nextSnapshot.combatSkillLevel,
    );
    if (equipmentChanged) this.combatCommands.setTimingProfile(nextEquipment.combatTiming);
    if (skillChanged) this.combatCommands.setCommandProfile(nextSkill);
    this.progressionSnapshot = nextSnapshot;
    this.equipmentProfile = nextEquipment;
    this.journeyProgress.restore(nextSnapshot.firstJourney);
    this.regionExpansionProgress.restore(nextSnapshot.regionExpansion);
    this.progressionChanged.emit(this.progressionSnapshot);
    this.statusNode.publish({ force: true });
    return transaction;
  }

  unavailableProgressionTransaction() {
    return Object.freeze({
      changed: false,
      reason: PROGRESSION_TRANSACTION_REASON.UNAVAILABLE,
      snapshot: this.progressionSnapshot,
    });
  }

  selectEquipment(profileId) {
    if (!this.canManageProgression()) return this.unavailableProgressionTransaction();
    const profile = this.equipmentCatalog.getProfile(profileId);
    const transaction = selectProgressionEquipment(this.progressionSnapshot, profile.id);
    if (!transaction.changed) return transaction;
    this.progressionNotice = `${profile.shortLabel} 장착 · frame/거리/경직 profile 변경`;
    return this.commitProgression(transaction, { equipmentChanged: true });
  }

  purchaseEquipment(profileId) {
    if (!this.canManageProgression()) return this.unavailableProgressionTransaction();
    const profile = this.equipmentCatalog.getProfile(profileId);
    const purchase = purchaseProgressionEquipment(this.progressionSnapshot, {
      profileId: profile.id,
      goldCost: profile.goldCost,
      trainingMarkRequirement: profile.trainingMarkRequirement,
    });
    if (!purchase.changed) {
      this.progressionNotice =
        purchase.reason === PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_TRAINING
          ? `${profile.shortLabel} 해금에 훈련 인장 ${profile.trainingMarkRequirement}개가 필요합니다.`
          : purchase.reason === PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_GOLD
            ? `${profile.shortLabel} 구매에 원정 Gold ${profile.goldCost}가 필요합니다.`
            : '이미 소유한 장비입니다.';
      this.statusNode.publish({ force: true });
      return purchase;
    }
    const equip = selectProgressionEquipment(purchase.snapshot, profile.id);
    const transaction = Object.freeze({
      changed: true,
      reason: PROGRESSION_TRANSACTION_REASON.PURCHASED,
      snapshot: equip.snapshot,
    });
    this.progressionNotice = `${profile.shortLabel} 구매·장착 완료`;
    return this.commitProgression(transaction, { equipmentChanged: true });
  }

  trainCombatSkill() {
    if (!this.canManageProgression()) return this.unavailableProgressionTransaction();
    const currentLevel = this.progressionSnapshot.combatSkillLevel;
    if (currentLevel >= this.combatProgressionProfile.maxSkillLevel) {
      const transaction = trainProgressionCombatSkill(this.progressionSnapshot);
      this.progressionNotice = 'Command 수련은 이미 최고 단계입니다.';
      this.statusNode.publish({ force: true });
      return transaction;
    }
    const targetLevel = currentLevel + 1;
    const goldCost = this.combatProgressionProfile.getSkillUpgradeCost(targetLevel);
    const trainingMarkRequirement =
      this.combatProgressionProfile.getSkillTrainingMarkRequirement(targetLevel);
    const transaction = trainProgressionCombatSkill(this.progressionSnapshot, {
      goldCost,
      trainingMarkRequirement,
    });
    if (!transaction.changed) {
      this.progressionNotice =
        transaction.reason === PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_TRAINING
          ? `Lv.${targetLevel} 수련에 훈련 인장 ${trainingMarkRequirement}개가 필요합니다.`
          : `Lv.${targetLevel} 수련에 원정 Gold ${goldCost}가 필요합니다.`;
      this.statusNode.publish({ force: true });
      return transaction;
    }
    const skill = this.combatProgressionProfile.getSkillLevelProfile(targetLevel);
    this.progressionNotice = `Command Lv.${targetLevel} · ${skill.label} 해금`;
    return this.commitProgression(transaction, { skillChanged: true });
  }

  tryStartRoll(direction) {
    if (
      this.rollState ||
      !this.isGrounded ||
      direction === 0 ||
      this.combatCommands.snapshot().id !== 'idle'
    ) {
      return false;
    }

    if (!this.combatCommands.trySpendAction('roll')) return false;

    this.rollState = {
      direction: Math.sign(direction),
      elapsedSeconds: 0,
      durationSeconds: ROLL_DURATION_SECONDS,
    };
    this.facing = this.rollState.direction;
    return true;
  }

  updateRoll(deltaSeconds) {
    if (!this.rollState) return false;
    const activeRoll = this.rollState;
    const progress = Math.min(1, activeRoll.elapsedSeconds / activeRoll.durationSeconds);
    const speedScale = Math.sin(progress * Math.PI) * (Math.PI / 2);
    activeRoll.elapsedSeconds += deltaSeconds;
    this.position.x += activeRoll.direction * ROLL_SPEED * speedScale * deltaSeconds;
    if (activeRoll.elapsedSeconds >= activeRoll.durationSeconds) this.rollState = null;
    return true;
  }

  getAttackHitProfile(motionId) {
    return resolveEquipmentAttackProfile(
      motionId,
      this.combatCommands.getMotionFrameData(motionId),
      this.equipmentProfile,
      this.getCombatSkillProfile(),
    );
  }

  replaceRoomScene(
    snapshot = this.mapRuntime.getResolvedSnapshot(),
    { resetExisting = false, forceReplace = false } = {},
  ) {
    const activeRoomScene = this.roomSceneNode;
    if (
      !forceReplace &&
      activeRoomScene &&
      !activeRoomScene.isDisposed &&
      activeRoomScene.parent === this &&
      (!this.isInsideTree || activeRoomScene.isInsideTree) &&
      activeRoomScene.location.regionId === snapshot.active.regionId &&
      activeRoomScene.location.roomId === snapshot.active.roomId
    ) {
      if (resetExisting) activeRoomScene.resetEncounter();
      return activeRoomScene;
    }

    const spinProfile = this.getAttackHitProfile('spin');
    const roomScene = ROOM_SCENE.instantiate({
      snapshot,
      encounterFactory: this.encounterFactory,
      spinContact: {
        hitPulses: spinProfile.hitPulses,
        contactSpacings: spinProfile.contactSpacings,
      },
    });
    this.addChild(roomScene);
    try {
      if (activeRoomScene) {
        if (activeRoomScene.parent === this) this.removeChild(activeRoomScene);
        activeRoomScene.dispose();
      }
    } catch (error) {
      if (roomScene.parent === this) this.removeChild(roomScene);
      roomScene.dispose();
      throw error;
    }
    this.roomSceneNode = roomScene;
    this.connectRoomSceneSignals(roomScene);
    return roomScene;
  }

  connectRoomSceneSignals(roomScene) {
    this.roomSceneConnections = this.roomSceneConnections.filter(
      (connection) => connection.connected,
    );
    if (this.roomSceneConnections.length > 0) return;
    this.roomSceneConnections = [
      this.connectTo(roomScene.playerResultResolved, (result) =>
        this.applyTrainingEncounterPlayerResult(result),
      ),
      this.connectTo(roomScene.combatEventOccurred, ({ type, payload }) =>
        this.combatEvents.emit(type, payload),
      ),
      this.connectTo(roomScene.cameraFeedbackOccurred, (feedback) =>
        this.combatCameraFeedback.trigger(feedback),
      ),
      this.connectTo(roomScene.encounterCompleted, (result) =>
        this.resolveJourneyEncounter(result),
      ),
    ];
  }

  resolveJourneyEncounter(result) {
    if (result.profileId === 'training') {
      const reward = this.combatProgressionProfile.trainingClearReward;
      const transaction = awardTrainingMarks(this.progressionSnapshot, reward);
      this.progressionNotice = `훈련 골렘 격파 · 인장 +${reward}`;
      this.commitProgression(transaction);
      const timeTransaction = this.applyWorldAction(
        'event:training-cleared',
        this.worldTimeProfile.getCoreEventAction('training-cleared'),
        { repeatable: true },
      );
      if (timeTransaction.changed) {
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }
      return Object.freeze({
        changed: true,
        kind: 'training-cleared',
        reward,
        snapshot: transaction.snapshot,
      });
    }
    const regionExpansionEncounter = result.profileId.startsWith('glasswind-');
    const resolution = regionExpansionEncounter
      ? this.regionExpansionProgress.resolveEncounter(result.profileId)
      : this.journeyProgress.resolveEncounter(result.profileId, result.entityId);
    if (!resolution.changed) return resolution;
    if (resolution.kind === 'field-guardian-defeated') {
      this.playerMaxHealth += resolution.maxHealthBonus;
      this.playerHealth = Math.min(
        this.playerMaxHealth,
        this.playerHealth + resolution.maxHealthBonus,
      );
    }
    this.applyWorldAction(
      `event:${resolution.kind}`,
      this.worldTimeProfile.getCoreEventAction(resolution.kind),
    );
    this.syncJourneyWorldContext();
    this.emitDurableProgressionChanged();
    this.statusNode.publish({ force: true });
    return resolution;
  }

  updateJourneyTriggers() {
    const snapshot = this.mapRuntime.getResolvedSnapshot();
    for (const trigger of snapshot.triggers ?? []) {
      const radius = Number.isFinite(trigger.radius) ? trigger.radius : 48;
      const distance = Math.hypot(
        this.position.x - trigger.position.x,
        this.position.y + CHARACTER_FOOT_OFFSET - trigger.position.y,
      );
      if (distance > radius) continue;

      if (trigger.kind === 'checkpoint') {
        const result = this.journeyProgress.activateCheckpoint(trigger.qualifiedId);
        if (!result.changed) continue;
        this.playerHealth = this.playerMaxHealth;
        this.syncJourneyWorldContext();
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }

      if (trigger.kind === 'boss-reward') {
        const result = this.journeyProgress.claimBossReward(trigger.gold);
        if (!result.changed) continue;
        this.syncJourneyWorldContext();
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }

      if (trigger.kind === 'glasswind-checkpoint') {
        const result = this.regionExpansionProgress.activateCheckpoint(trigger.qualifiedId);
        if (!result.changed) continue;
        this.playerHealth = this.playerMaxHealth;
        this.syncJourneyWorldContext();
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }

      if (trigger.kind === 'glasswind-boss-reward') {
        const result = this.regionExpansionProgress.claimBossReward(trigger.gold);
        if (!result.changed) continue;
        this.syncJourneyWorldContext();
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }
    }
  }

  respawnPlayerAfterKo(inputSnapshot = {}) {
    this.applyWorldAction(
      'event:player-ko',
      this.worldTimeProfile.getCoreEventAction('player-ko'),
      {
        repeatable: true,
      },
    );
    const journey = this.journeyProgress.snapshot();
    const regionExpansion = this.regionExpansionProgress.snapshot();
    const activeRegionId = this.mapRuntime.getActiveLocation().regionId;
    const checkpointId =
      activeRegionId === 'glasswind-region'
        ? regionExpansion.checkpointActivated
          ? regionExpansion.checkpointId
          : null
        : journey.checkpointActivated
          ? journey.checkpointId
          : null;
    const checkpoint = this.mapRuntime.getTriggerLocation(checkpointId);
    if (checkpoint) {
      const mapSnapshot = this.mapRuntime.setActiveLocation(checkpoint.regionId, checkpoint.roomId);
      this.replaceRoomScene(mapSnapshot, { forceReplace: true });
      this.position = {
        x: checkpoint.position.x,
        y: checkpoint.position.y - CHARACTER_FOOT_OFFSET,
      };
      this.cameraPosition = { ...mapSnapshot.cameraPosition };
    } else {
      const activeRoom = this.mapRuntime.getActiveRoom();
      const respawnX = (activeRoom.movementBounds?.minX ?? activeRoom.bounds.x) + 140;
      this.position = {
        x: respawnX,
        y: this.mapRuntime.getGroundYAt(respawnX) - CHARACTER_FOOT_OFFSET,
      };
      this.roomSceneNode?.resetEncounter();
    }
    this.previousPosition = { ...this.position };
    this.previousCameraPosition = { ...this.cameraPosition };
    this.playerHealth = this.playerMaxHealth;
    this.verticalVelocity = 0;
    this.pendingPlayerKnockbackX = 0;
    this.playerKnockbackVelocityX = 0;
    this.playerBlockstunSeconds = 0;
    this.playerBlockImpactSeconds = 0;
    this.playerRetaliationPending = false;
    this.playerRetaliationSeconds = 0;
    this.playerInvulnerableSeconds = 0;
    this.playerHitstunSeconds = 0;
    this.playerKoSeconds = 0;
    this.rollState = null;
    this.landingRecoverySeconds = 0;
    this.hitStopSeconds = 0;
    this.airComboFloatSeconds = 0;
    this.airComboGravityScale = 1;
    this.airComboFacing = 0;
    this.storyInteractionOwner.reset();
    this.combatCommands.reset({ inputSnapshot });
    this.combatCameraFeedback.reset();
    this.combatEvents.reset();
    this.jumpWasPressed = Boolean(inputSnapshot.jump);
    this.guardWasPressed = Boolean(inputSnapshot.guard);
    if (Number.isSafeInteger(inputSnapshot.jumpSequence)) {
      this.lastJumpSequence = inputSnapshot.jumpSequence;
    }
    this.isGrounded = true;
    this.emitDurableProgressionChanged();
    this.statusNode.publish({ force: true });
  }

  applyTrainingEncounterPlayerResult(result) {
    if (result.kind === 'guard' || result.kind === 'guard-break') {
      const staminaResult = this.combatCommands.applyGuardContact({
        guardBreak: result.kind === 'guard-break',
        staminaDamage: result.guardStaminaDamage,
        justGuardEligible: result.justGuardEligible,
      });
      this.playerBlockImpactSeconds = staminaResult.justGuard ? 0.18 : result.blockImpactSeconds;
      this.playerBlockImpactStrength = staminaResult.justGuard
        ? 1.8
        : result.blockImpactStrength * this.equipmentProfile.guard.impactScale;
      const authoredBlockstunSeconds =
        result.blockstunSeconds * this.equipmentProfile.guard.blockstunScale;
      const blockstunSeconds = staminaResult.justGuard
        ? 0
        : staminaResult.broken
          ? Math.max(authoredBlockstunSeconds, combatFramesToSeconds(28))
          : authoredBlockstunSeconds;
      this.playerBlockstunSeconds = Math.max(this.playerBlockstunSeconds, blockstunSeconds);
      this.playerBlockstunDurationSeconds = blockstunSeconds;
      this.hitStopSeconds = Math.max(
        this.hitStopSeconds,
        staminaResult.justGuard ? 0.075 : result.hitStopSeconds,
      );
      if (staminaResult.justGuard) {
        this.combatEvents.emit(COMBAT_EVENT_TYPE.JUST_GUARD, {
          actor: 'player',
          target: 'enemy',
          attackId: result.attackId ?? null,
          position: result.contactPosition ?? null,
          direction: result.contactDirection ?? this.facing,
          strength: 2,
          staminaDelta: staminaResult.recovery,
          durationSeconds: 0.2,
        });
      }
      if (staminaResult.broken) this.rollState = null;
      return;
    }

    if (result.kind === 'hit') {
      const damage = Math.max(
        1,
        Math.round(result.damage * this.equipmentProfile.defense.damageTakenScale),
      );
      this.playerHealth = Math.max(0, this.playerHealth - damage);
      this.pendingPlayerKnockbackX = result.knockbackVelocityX;
      this.pendingPlayerKnockbackDecayRate = result.knockbackDecayRate;
      this.playerHitstunSeconds = result.hitstunSeconds;
      this.playerRetaliationPending = this.playerHealth > 0;
      this.playerInvulnerableSeconds = result.invulnerableSeconds;
      this.hitStopSeconds = Math.max(this.hitStopSeconds, result.hitStopSeconds);
      this.combatCommands.interruptForHit();
      this.rollState = null;
      if (this.playerHealth === 0) this.playerKoSeconds = 1;
    } else {
      this.hitStopSeconds = Math.max(this.hitStopSeconds, result.hitStopSeconds ?? 0);
    }

    if (result.damagingHit) this.combatCommands.confirmDamagingHit(result.damagingHit);

    const motion = result.playerMotion;
    if (!motion) return;
    if (Number.isFinite(motion.positionXDelta)) this.position.x += motion.positionXDelta;
    if (Number.isFinite(motion.positionY)) this.position.y = motion.positionY;
    if (Number.isFinite(motion.verticalVelocity)) this.verticalVelocity = motion.verticalVelocity;
    if (typeof motion.isGrounded === 'boolean') this.isGrounded = motion.isGrounded;
    if (Number.isFinite(motion.airComboFloatSeconds)) {
      this.airComboFloatSeconds = motion.airComboFloatSeconds;
    }
    if (Number.isFinite(motion.airComboGravityScale)) {
      this.airComboGravityScale = motion.airComboGravityScale;
    }
    if (Number.isFinite(motion.airComboFacing)) this.airComboFacing = motion.airComboFacing;
    if (Number.isSafeInteger(motion.airHeavyConnectedSequence)) {
      this.airHeavyConnectedSequence = motion.airHeavyConnectedSequence;
    }
  }

  samplePlayerCombatGeometry(
    combatState,
    { position = this.position, animationTime = this.animationTime } = {},
  ) {
    const poseCombatState =
      this.playerBlockstunSeconds > 0
        ? Object.freeze({
            ...combatState,
            id: 'guard',
            label: '방어 반동',
            progress: 0,
            phase: 'guard',
          })
        : combatState;
    const pose = samplePlayerMotionPose(
      Object.freeze({
        motionState: poseCombatState,
        boneInput: Object.freeze({
          animationTime,
          movementIntent: this.movementIntent,
          isGrounded: this.isGrounded,
          verticalVelocity: this.verticalVelocity,
          landingRecovery: this.landingRecoverySeconds / LANDING_RECOVERY_SECONDS,
          hitstunProgress: this.playerHitstunSeconds / 0.22,
          blockstunProgress:
            this.playerBlockstunDurationSeconds > 0
              ? this.playerBlockstunSeconds / this.playerBlockstunDurationSeconds
              : 0,
          blockStrength: this.playerBlockImpactStrength,
          knockedOut: this.playerHealth === 0,
          rollProgress: this.rollState
            ? this.rollState.elapsedSeconds / this.rollState.durationSeconds
            : null,
        }),
      }),
    );
    return sampleSharedPlayerCombatGeometry({
      position: Object.freeze({ x: position.x, y: position.y }),
      facing: this.facing,
      targetPose: pose.targetPose,
      bonePose: pose.bonePose,
      geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
      weaponLengthScale: this.equipmentProfile.geometry.weaponLengthScale,
    });
  }

  updatePlayerCombatGeometry(combatState) {
    const geometry = this.samplePlayerCombatGeometry(combatState);
    if (!this.getAttackHitProfile(combatState.id)) {
      this.playerWeaponContactHistory = [];
      this.playerCombatGeometry = Object.freeze({
        ...geometry,
        sequence: combatState.sequence,
        comboCycle: combatState.comboCycle,
        sweep: null,
      });
      return this.playerCombatGeometry;
    }
    if (this.playerCombatGeometry?.comboCycle !== combatState.comboCycle) {
      this.playerWeaponContactHistory = [];
    }
    const swept = createSweptWeaponGeometry({
      current: combatState.id === 'shieldBash' ? geometry.shield : geometry.weapon,
      history: this.playerWeaponContactHistory,
    });
    this.playerWeaponContactHistory = [...swept.history];
    this.playerCombatGeometry = Object.freeze({
      ...geometry,
      sequence: combatState.sequence,
      comboCycle: combatState.comboCycle,
      sweep: swept.swept,
    });
    return this.playerCombatGeometry;
  }

  createTrainingEncounterFrame(combatState, attackProfile) {
    const playerGeometry = this.playerCombatGeometry;
    const rollProgress = this.rollState
      ? this.rollState.elapsedSeconds / this.rollState.durationSeconds
      : null;
    return Object.freeze({
      combatState,
      attackProfile,
      playerGeometry,
      player: Object.freeze({
        position: Object.freeze({ ...this.position }),
        facing: this.facing,
        isGrounded: this.isGrounded,
        health: this.playerHealth,
        hitstunSeconds: this.playerHitstunSeconds,
        blockstunSeconds: this.playerBlockstunSeconds,
        invulnerableSeconds: this.playerInvulnerableSeconds,
        rollProgress,
        rollDirection: this.rollState?.direction ?? null,
        airComboFacing: this.airComboFacing,
      }),
    });
  }

  update(deltaSeconds, inputSnapshot, simulationSettings = {}) {
    const animationSpeed = Number.isFinite(simulationSettings.animationSpeed)
      ? Math.max(0, simulationSettings.animationSpeed)
      : 1;
    this.combatCameraFeedback.setEnabled(simulationSettings.cameraFeedbackEnabled !== false);
    this.previousPosition = { ...this.position };
    this.previousAnimationTime = this.animationTime;
    this.previousCameraPosition = { ...this.cameraPosition };
    this.combatCameraFeedback.update(deltaSeconds);
    this.combatEvents.update(deltaSeconds);
    this.storyInteractionOwner.advance(deltaSeconds, this.getStoryInteractionContext());
    if (this.hitStopSeconds > 0) {
      this.hitStopSeconds = Math.max(0, this.hitStopSeconds - deltaSeconds);
      if (this.hitStopSeconds === 0 && this.pendingPlayerKnockbackX !== 0) {
        this.playerKnockbackVelocityX = this.pendingPlayerKnockbackX;
        this.playerKnockbackDecayRate = this.pendingPlayerKnockbackDecayRate;
        this.pendingPlayerKnockbackX = 0;
      }
      return;
    }
    const previousPlayerHitstunSeconds = this.playerHitstunSeconds;
    this.playerHitstunSeconds = Math.max(0, this.playerHitstunSeconds - deltaSeconds);
    this.playerInvulnerableSeconds = Math.max(0, this.playerInvulnerableSeconds - deltaSeconds);
    this.playerRetaliationSeconds = Math.max(0, this.playerRetaliationSeconds - deltaSeconds);
    if (
      previousPlayerHitstunSeconds > 0 &&
      this.playerHitstunSeconds === 0 &&
      this.playerRetaliationPending &&
      this.playerHealth > 0
    ) {
      this.playerRetaliationPending = false;
      this.playerRetaliationSeconds = 0.55;
      this.playerInvulnerableSeconds = Math.max(this.playerInvulnerableSeconds, 0.55);
    }
    this.playerKoSeconds = Math.max(0, this.playerKoSeconds - deltaSeconds);
    this.playerBlockImpactSeconds = Math.max(0, this.playerBlockImpactSeconds - deltaSeconds);
    this.playerBlockstunSeconds = Math.max(0, this.playerBlockstunSeconds - deltaSeconds);
    if (this.playerHealth === 0 && this.playerKoSeconds === 0) {
      this.respawnPlayerAfterKo(inputSnapshot);
    }
    const landingControlsLocked = this.landingRecoverySeconds > 0;
    const nextLandingRecoverySeconds = this.landingRecoverySeconds - deltaSeconds;
    this.landingRecoverySeconds =
      nextLandingRecoverySeconds <= Number.EPSILON ? 0 : nextLandingRecoverySeconds;
    const wasGrounded = this.isGrounded;

    const controlsLocked =
      landingControlsLocked ||
      this.playerHitstunSeconds > 0 ||
      this.playerBlockstunSeconds > 0 ||
      this.playerHealth === 0;
    const preUpdateCombatState = this.combatCommands.snapshot();
    const counterInputLocked =
      preUpdateCombatState.justGuardCounterReady || preUpdateCombatState.id === 'shieldBash';
    const navigationLocked = controlsLocked || counterInputLocked;
    const rawJumpPressed = Boolean(inputSnapshot.jump);
    const rawGuardPressed = Boolean(inputSnapshot.guard);
    const horizontal = navigationLocked
      ? 0
      : Number(inputSnapshot.right) - Number(inputSnapshot.left);
    const jumpPressed = navigationLocked ? false : rawJumpPressed;
    const guardPressed = navigationLocked ? false : rawGuardPressed;
    const guardEdge = guardPressed && !this.guardWasPressed;
    const jumpSequence = inputSnapshot.jumpSequence;
    const jumpIssued = navigationLocked
      ? false
      : Number.isSafeInteger(jumpSequence)
        ? jumpSequence > this.lastJumpSequence
        : jumpPressed && !this.jumpWasPressed;
    const dialogueResult = jumpIssued
      ? this.storyInteractionOwner.handleJump(this.getStoryInteractionContext())
      : null;
    const dialogueConsumed = dialogueResult?.consumed === true;
    const portalStarted = jumpIssued && !dialogueConsumed && this.tryPortalTransition();
    if (this.mapRuntime.getTransition() === null && guardEdge) this.tryStartRoll(horizontal);
    const isTransitioning = this.mapRuntime.getTransition() !== null;
    const isRolling = this.rollState !== null;
    const currentCombatState = this.combatCommands.snapshot();
    if (
      !isTransitioning &&
      !isRolling &&
      !portalStarted &&
      !dialogueConsumed &&
      jumpIssued &&
      this.isGrounded &&
      currentCombatState.canJump
    ) {
      this.combatCommands.cancelForJump({ preserveComboCycle: true });
      this.verticalVelocity = -JUMP_SPEED;
      this.airComboFloatSeconds = 0;
      this.airComboGravityScale = 1;
      this.isGrounded = false;
    }
    const combatState = this.combatCommands.update(deltaSeconds * animationSpeed, inputSnapshot, {
      acceptCommands: !isTransitioning && !isRolling && !controlsLocked,
      isAirborne: !this.isGrounded,
      allowGuard: this.isGrounded,
      staminaDeltaSeconds: deltaSeconds,
    });
    const activeAttackProfile = this.getAttackHitProfile(combatState.id);
    if (activeAttackProfile) {
      if (this.combatFacingCycle !== combatState.comboCycle) {
        this.combatFacingCycle = combatState.comboCycle;
        this.combatFacing = horizontal !== 0 ? Math.sign(horizontal) : this.facing;
      }
      this.facing = this.combatFacing;
      if (combatState.id.startsWith('air') && this.airComboFacing === 0) {
        this.airComboFacing = this.combatFacing;
      }
    }
    if (
      combatState.id === 'airHeavy' &&
      combatState.sequence !== this.airHeavyConnectedSequence &&
      combatState.progress >= 0.3 &&
      !this.isGrounded
    ) {
      this.verticalVelocity = Math.max(this.verticalVelocity, 300);
    }

    this.movementIntent = isTransitioning ? 0 : horizontal;
    this.jumpWasPressed = rawJumpPressed;
    this.guardWasPressed = rawGuardPressed;
    if (Number.isSafeInteger(jumpSequence)) this.lastJumpSequence = jumpSequence;
    if (isTransitioning) {
      this.updatePortalTransition(deltaSeconds);
      this.animationTime += deltaSeconds * animationSpeed * 0.35;
      return;
    }
    if (!isTransitioning && !isRolling) {
      const movementStartX = this.position.x;
      if (!activeAttackProfile && horizontal !== 0) {
        this.facing = Math.sign(horizontal);
      }
      this.position.x += horizontal * CHARACTER_SPEED * combatState.movementScale * deltaSeconds;
      this.position.x += this.playerKnockbackVelocityX * deltaSeconds;
      this.playerKnockbackVelocityX *= Math.pow(this.playerKnockbackDecayRate, deltaSeconds);
      if (Math.abs(this.playerKnockbackVelocityX) < PLAYER_KNOCKBACK_STOP_SPEED) {
        this.playerKnockbackVelocityX = 0;
      }
      const encounterBeforeStep = this.roomSceneNode?.getEncounterGameplaySnapshot() ?? null;
      if (this.isGrounded && encounterBeforeStep && !['idle', 'guard'].includes(combatState.id)) {
        const previousForwardGap = (encounterBeforeStep.position.x - movementStartX) * this.facing;
        const forwardGap = (encounterBeforeStep.position.x - this.position.x) * this.facing;
        if (previousForwardGap >= 0 && forwardGap < 12) {
          this.position.x = encounterBeforeStep.position.x - this.facing * 12;
        }
      }
      if (
        combatState.id.startsWith('air') &&
        encounterBeforeStep &&
        encounterBeforeStep.position.y < encounterBeforeStep.groundY &&
        !encounterBeforeStep.juggleLocked
      ) {
        const comboFacing = this.airComboFacing || this.facing;
        const targetGap = (encounterBeforeStep.position.x - this.position.x) * comboFacing;
        const maximumComboGap = combatState.id === 'airReturn' ? 22 : 44;
        const comboPullSpeed = combatState.id === 'airReturn' ? 420 : 300;
        if (targetGap >= 0 && targetGap < 18) {
          this.position.x = encounterBeforeStep.position.x - comboFacing * 18;
        } else if (targetGap > maximumComboGap) {
          this.position.x +=
            comboFacing * Math.min(comboPullSpeed * deltaSeconds, targetGap - maximumComboGap);
        }
      }
    }
    this.updatePlayerCombatGeometry(combatState);
    this.roomSceneNode?.stepEncounter(
      deltaSeconds,
      this.createTrainingEncounterFrame(combatState, activeAttackProfile),
    );
    this.updateJourneyTriggers();

    if (isRolling) {
      this.updateRoll(deltaSeconds);
      const activeRoom = this.mapRuntime.getActiveRoom();
      const movementBounds = activeRoom.movementBounds ?? {
        minX: CHARACTER_BOUNDARY_HALF_WIDTH,
        maxX: this.mapRuntime.definition.worldSize.width - CHARACTER_BOUNDARY_HALF_WIDTH,
      };
      this.position.x = Math.max(
        movementBounds.minX,
        Math.min(movementBounds.maxX, this.position.x),
      );
      if (this.isGrounded) {
        this.position.y = this.mapRuntime.getGroundYAt(this.position.x) - CHARACTER_FOOT_OFFSET;
      }
      this.updateCameraFollow(deltaSeconds);
      this.animationTime += deltaSeconds * animationSpeed * 1.8;
      return;
    }

    const encounterAfterStep = this.roomSceneNode?.getEncounterGameplaySnapshot() ?? null;
    if (
      encounterAfterStep &&
      (encounterAfterStep.slamAttackerBouncePending ||
        encounterAfterStep.groundBounceDelaySeconds > 0)
    ) {
      const comboFacing = this.airComboFacing || this.facing;
      this.position.x = encounterAfterStep.position.x - comboFacing * 30;
      this.facing = comboFacing;
    }
    const activeRoom = this.mapRuntime.getActiveRoom();
    const playerGroundY = this.mapRuntime.getGroundYAt(this.position.x) - CHARACTER_FOOT_OFFSET;
    this.airComboFloatSeconds = Math.max(0, this.airComboFloatSeconds - deltaSeconds);
    const playerGravityMultiplier =
      this.airComboFloatSeconds > 0 ? 0.08 : this.airComboGravityScale;
    if (wasGrounded && this.isGrounded) {
      this.position.y = playerGroundY;
      this.verticalVelocity = 0;
    }
    this.verticalVelocity += GRAVITY * playerGravityMultiplier * deltaSeconds;
    this.position.y += this.verticalVelocity * deltaSeconds;
    if (this.position.y >= playerGroundY) {
      this.position.y = playerGroundY;
      this.verticalVelocity = 0;
      this.airComboFloatSeconds = 0;
      this.airComboGravityScale = 1;
      if (
        !encounterAfterStep?.slamAttackerBouncePending &&
        !(encounterAfterStep?.groundBounceDelaySeconds > 0)
      ) {
        this.airComboFacing = 0;
      }
      this.isGrounded = true;
      this.combatCommands.cancelAirMotionForLanding();
      this.combatCommands.clearComboContinuation();
      if (!wasGrounded) {
        this.landingRecoverySeconds = LANDING_RECOVERY_SECONDS;
        this.combatEvents.emit(COMBAT_EVENT_TYPE.LANDING, {
          actor: 'player',
          target: 'player',
          position: this.position,
          direction: this.facing,
          strength: 0.6,
          durationSeconds: LANDING_RECOVERY_SECONDS,
        });
      }
    }

    const movementBounds = activeRoom.movementBounds ?? {
      minX: CHARACTER_BOUNDARY_HALF_WIDTH,
      maxX: this.mapRuntime.definition.worldSize.width - CHARACTER_BOUNDARY_HALF_WIDTH,
    };
    this.position.x = Math.max(movementBounds.minX, Math.min(movementBounds.maxX, this.position.x));
    this.updateCameraFollow(deltaSeconds);
    this.animationTime += deltaSeconds * animationSpeed * (1 + Math.abs(horizontal) * 0.65);
  }

  getWorldStatus() {
    const map = this.mapRuntime.getResolvedMap();
    const room = this.mapRuntime.getActiveRoom();
    const location = this.mapRuntime.getActiveLocation();
    const roomId = location.roomId;
    const journey = this.journeyProgress.snapshot();
    const regionExpansion = this.regionExpansionProgress.snapshot();
    const progression = this.progressionSnapshot;
    const skill = this.getCombatSkillProfile();
    const encounter = this.roomSceneNode?.getEncounterGameplaySnapshot() ?? null;
    const worldTime = getWorldClockReadModel(this.worldTimeSnapshot);
    const phaseLabels = {
      prepare: '학원촌 준비',
      field: 'Field 탐험',
      dungeon: 'Dungeon 진입',
      checkpoint: 'Checkpoint 확보',
      boss: 'Boss 공략',
      reward: '보상 회수',
      returned: '첫 원정 완료',
    };
    const regionExpansionPhaseLabels = {
      prepare: '새 Region 준비',
      field: '유리바람 Field',
      dungeon: '관측소 Dungeon',
      checkpoint: '바람닻 확보',
      boss: '폭풍눈 Boss',
      reward: '프리즘 회수',
      returned: '유리바람 원정 완료',
    };
    const progressionComplete =
      progression.combatSkillLevel === this.combatProgressionProfile.maxSkillLevel &&
      progression.ownedEquipmentIds.length === this.equipmentCatalog.profiles.length;
    const story = resolveFirstJourneyStory({
      equipment: {
        id: this.equipmentProfile.id,
        label: this.equipmentProfile.label,
        progressionComplete,
      },
      journey,
      regionExpansion,
      activeRoomId: roomId,
    });
    const dialogue = this.storyInteractionOwner.snapshot(this.getStoryInteractionContext());
    let objective = story.nextObjective;
    let encounterHint = '';

    if (roomId === 'training-room') {
      objective = `훈련 골렘을 처치해 인장 +${this.combatProgressionProfile.trainingClearReward}. 귀환 후 같은 A/S command route를 성장시키세요.`;
      encounterHint = `${this.progressionNotice} · 현재 인장 ${progression.trainingMarks}`;
    }
    if (roomId === 'field-crossing') {
      if (!journey.fieldGuardianDefeated) {
        encounterHint = '일반 조우 보상: 수호 수액 · 최대 HP +20';
      }
    }
    if (roomId === 'sealed-forest-dungeon') {
      if (!journey.dungeonGuardianDefeated) {
        encounterHint = '회랑 수호자를 쓰러뜨리면 봉인이 풀리고 Checkpoint 길이 열립니다.';
      } else if (!journey.checkpointActivated) {
        encounterHint = '수호자 관문 개방 · 청록 봉인석에서 HP를 회복하고 Checkpoint를 확보하세요.';
      } else {
        encounterHint = '사망 시 이 Checkpoint에서 회복 · 오른쪽 Boss Portal 진입 가능';
      }
    }
    if (roomId === 'sealed-forest-boss') {
      if (journey.bossRewardClaimed) {
        objective = '보상 획득 완료. 오른쪽 황금 shortcut Portal에서 ↑로 귀환하세요.';
        encounterHint = '+120 Gold · 학원촌 shortcut 해금';
      } else if (journey.bossDefeated) {
        objective = 'Boss가 남긴 황금 결정에 접근해 보상을 회수하세요.';
        encounterHint = '보상 결정이 shortcut Portal을 활성화합니다.';
      } else if (encounter?.punishWindowOpen) {
        objective = '청록 틈이 열렸습니다. 지금 공격해 Punish를 이어가세요.';
        encounterHint = 'PUNISH WINDOW · 공격 가능';
      } else if (encounter?.attackKind === 'heavy' && encounter?.aiState === 'windup') {
        objective = '붉은 강공격은 막을 수 없습니다. 이동+↓ 구르기로 통과하세요.';
        encounterHint = 'HEAVY · ROLL REQUIRED';
      } else if (encounter?.attackKind === 'light' && encounter?.aiState === 'windup') {
        objective = '기본공격은 ↓로 Guard한 뒤 청록 회복 틈을 노리세요.';
        encounterHint = 'BASIC · GUARDABLE';
      } else {
        objective = '기본공격 Guard → 강공격 Roll → 청록 회복 틈 Punish로 공략하세요.';
        encounterHint = 'GUARD · ROLL · PUNISH';
      }
    }
    if (roomId === 'glasswind-approach') {
      if (regionExpansion.glasswindBridgeStable) {
        objective = '풍식 사냥꾼을 쓰러뜨려 바람다리가 고정됐습니다. 오른쪽 Portal로 진입하세요.';
        encounterHint = 'SURFACE + COLLISION + PORTAL 안정화';
      } else if (encounter?.attackKind === 'sweep' && encounter?.aiState === 'windup') {
        objective = '지면을 훑는 청록 Sweep가 옵니다. ↑로 뛰어넘고 공중 공격으로 반격하세요.';
        encounterHint = 'LOW SWEEP · JUMP REQUIRED';
      } else if (encounter?.attackKind === 'antiAir' && encounter?.aiState === 'windup') {
        objective = '공중에 오래 머물면 긴 대공창이 따라옵니다. 착지해 다시 Sweep 타이밍을 보세요.';
        encounterHint = 'ANTI-AIR · LAND AND RESET';
      } else {
        objective =
          '풍식 사냥꾼의 지면 Sweep를 점프로 넘고 회복 틈에 반격해 바람다리를 고정하세요.';
        encounterHint = 'JUMP OVER SWEEP · AIR PUNISH';
      }
    }
    if (roomId === 'glasswind-observatory') {
      encounterHint = regionExpansion.checkpointActivated
        ? '사망 시 관측소 Checkpoint에서 회복합니다.'
        : '바람닻이 Boss Portal과 부활 위치를 함께 고정합니다.';
    }
    if (roomId === 'glasswind-storm-eye') {
      if (regionExpansion.bossRewardClaimed) {
        objective = '프리즘 회수 완료. 오른쪽 황금 shortcut Portal에서 ↑로 학원촌에 귀환하세요.';
        encounterHint = '+180 Gold · 학원촌 영구 shortcut 해금';
      } else if (regionExpansion.bossDefeated) {
        objective = '폭풍 유리핵이 남긴 황금 프리즘에 접근해 보상과 shortcut을 여세요.';
        encounterHint = '보상 프리즘이 귀환 Portal을 영구 활성화합니다.';
      } else if (encounter?.punishWindowOpen) {
        objective = '청록 균열이 열렸습니다. 회복이 끝나기 전에 command 연계를 적중시키세요.';
        encounterHint = 'PUNISH WINDOW · ATTACK NOW';
      } else if (encounter?.attackKind === 'sweep' && encounter?.aiState === 'windup') {
        objective = '바닥을 덮는 Sweep는 Guard할 수 없습니다. ↑ 점프 후 공중 route로 Punish하세요.';
        encounterHint = 'LOW SWEEP · JUMP → AIR PUNISH';
      } else if (encounter?.attackKind === 'heavy' && encounter?.aiState === 'windup') {
        objective = '보라 강공격은 이동+↓ 구르기로 통과하고 반대편 회복 틈을 노리세요.';
        encounterHint = 'HEAVY · ROLL THROUGH';
      } else if (encounter?.attackKind === 'light' && encounter?.aiState === 'windup') {
        objective = '기본공격은 ↓ Guard. 막은 뒤 다음 Sweep를 위해 점프 거리를 확보하세요.';
        encounterHint = 'BASIC · GUARDABLE';
      } else {
        objective = 'Guard 기본기 · Jump Sweep · Roll 강공격을 구분하고 각 회복 틈을 공략하세요.';
        encounterHint = 'GUARD · JUMP · ROLL · PUNISH';
      }
    }
    if (roomId === 'academy-plaza' && journey.returnedWithReward) {
      encounterHint = regionExpansion.returnedWithReward
        ? encounterHint
        : progressionComplete
          ? 'M4 COMPLETE · 새 Sweep Jump 전투 준비'
          : '';
    }
    if (roomId === 'academy-plaza' && regionExpansion.returnedWithReward) {
      encounterHint = 'M5 REGION COMPLETE · Sweep Jump 해법과 shortcut 유지';
    }
    if (this.recoveryNotice) encounterHint = this.recoveryNotice;

    const nextSkillLevel = Math.min(
      this.combatProgressionProfile.maxSkillLevel,
      progression.combatSkillLevel + 1,
    );
    const nextSkillCost =
      progression.combatSkillLevel >= this.combatProgressionProfile.maxSkillLevel
        ? null
        : this.combatProgressionProfile.getSkillUpgradeCost(nextSkillLevel);
    const nextSkillTrainingMarkRequirement =
      progression.combatSkillLevel >= this.combatProgressionProfile.maxSkillLevel
        ? null
        : this.combatProgressionProfile.getSkillTrainingMarkRequirement(nextSkillLevel);
    const availableGold = getAvailableGold(progression);
    const commandGuide = skill.loopCancel
      ? '지상 AA/AS/SA · 공중 AA/AS/SA · finisher→starter loop cancel'
      : skill.airCombos
        ? `지상·공중 AA/AS/SA · 공중 ${skill.maxAirActions}회`
        : skill.groundCombos
          ? '지상 AA/AS/SA 해금 · 공중 starter 1회'
          : 'A/S starter · 공중 starter 1회';

    return Object.freeze({
      areaName: `${map.name} · ${room.label}`,
      story,
      dialogue,
      objective,
      encounterHint,
      encounterHealthLabel:
        encounter && encounter.health > 0
          ? `${encounter.label} · HP ${encounter.health}/${encounter.maxHealth}${
              encounter.posture
                ? ` · ${encounter.posture.groggy ? 'GROGGY' : 'Posture'} ${Math.ceil(encounter.posture.current)}/${encounter.posture.maximum}`
                : ''
            }`
          : '',
      journeyLabel:
        location.regionId === 'glasswind-region' ||
        (roomId === 'academy-plaza' && regionExpansion.phase !== 'prepare')
          ? (regionExpansionPhaseLabels[regionExpansion.phase] ?? regionExpansion.phase)
          : (phaseLabels[journey.phase] ?? journey.phase),
      wardLabel:
        location.regionId === 'glasswind-region' ||
        (roomId === 'academy-plaza' && regionExpansion.phase !== 'prepare')
          ? regionExpansion.glasswindBridgeStable
            ? '유리바람 다리 · 안정'
            : '횡풍 장벽 · 활성'
          : journey.fieldWardActive
            ? '수호 수액 · HP +20'
            : journey.routeChoice === 'bypass'
              ? '우회 · 수액 없음'
              : '수호 수액 미획득',
      timePhase: worldTime.timePhase,
      timeLabel: `${worldTime.timePhase === 'night' ? '밤' : '낮'} · D${worldTime.day} ${worldTime.timeLabel}`,
      deadlineLabel: worldTime.crisis
        ? 'CRISIS · 핵심 방어 사건'
        : `Deadline ${Math.floor(worldTime.deadlineMinutes / 60)}:${String(worldTime.deadlineMinutes % 60).padStart(2, '0')}`,
      roomId,
      canSelectEquipment: this.canManageProgression(),
      canManageProgression: this.canManageProgression(),
      equipmentId: this.equipmentProfile.id,
      equipmentLabel: this.equipmentProfile.label,
      equipmentOptions: Object.freeze(
        this.equipmentCatalog.profiles.map((profile) => {
          const owned = progression.ownedEquipmentIds.includes(profile.id);
          const selected = progression.equippedEquipmentId === profile.id;
          const affordable =
            progression.trainingMarks >= profile.trainingMarkRequirement &&
            availableGold >= profile.goldCost;
          return Object.freeze({
            id: profile.id,
            shortLabel: profile.shortLabel,
            description: profile.description,
            goldCost: profile.goldCost,
            trainingMarkRequirement: profile.trainingMarkRequirement,
            owned,
            selected,
            canChoose: !selected && (owned || affordable),
            actionLabel: selected
              ? '장착 중'
              : owned
                ? '장착'
                : profile.trainingMarkRequirement > 0
                  ? `${profile.goldCost} Gold · 인장 ${profile.trainingMarkRequirement}`
                  : `${profile.goldCost} Gold`,
          });
        }),
      ),
      combatSkill: Object.freeze({
        level: progression.combatSkillLevel,
        maxLevel: 3,
        label: skill.label,
        description: skill.description,
        damagePercent: Math.round((skill.damageScale - 1) * 100),
        hitCount: skill.spinHitCount,
        maxAirActions: skill.maxAirActions,
        commandGuide,
        nextLevel: progression.combatSkillLevel >= 3 ? null : nextSkillLevel,
        nextGoldCost: nextSkillCost,
        nextTrainingMarkRequirement: nextSkillTrainingMarkRequirement,
        canTrain:
          progression.combatSkillLevel < 3 &&
          availableGold >= nextSkillCost &&
          progression.trainingMarks >= nextSkillTrainingMarkRequirement,
        actionLabel:
          progression.combatSkillLevel >= 3
            ? 'MAX'
            : nextSkillTrainingMarkRequirement > 0
              ? `Lv.${nextSkillLevel} · ${nextSkillCost} Gold · 인장 ${nextSkillTrainingMarkRequirement}`
              : `Lv.${nextSkillLevel} · ${nextSkillCost} Gold`,
      }),
      progressionNotice: this.progressionNotice,
    });
  }

  getPlayerStatus() {
    const combatStatus = this.combatCommands.snapshot();
    return Object.freeze({
      health: this.playerHealth,
      maxHealth: this.playerMaxHealth,
      stamina: combatStatus.stamina,
      maxStamina: combatStatus.maxStamina,
      staminaExhausted: combatStatus.exhausted,
      justGuardCounterReady: combatStatus.justGuardCounterReady,
      justGuardCounterWindowSeconds: combatStatus.justGuardCounterWindowSeconds,
      lastStaminaAction: combatStatus.lastStaminaAction,
      lastCommandTransition: combatStatus.lastCommandTransition,
      gold: getAvailableGold(this.progressionSnapshot),
      trainingMarks: this.progressionSnapshot.trainingMarks,
    });
  }

  createRenderFrame(interpolationAlpha) {
    const renderPosition = Object.freeze({
      x: lerp(this.previousPosition.x, this.position.x, interpolationAlpha),
      y: lerp(this.previousPosition.y, this.position.y, interpolationAlpha),
    });
    const renderAnimationTime = lerp(
      this.previousAnimationTime,
      this.animationTime,
      interpolationAlpha,
    );
    const combatState = this.combatCommands.snapshot();
    const poseCombatState =
      this.playerBlockstunSeconds > 0
        ? Object.freeze({
            ...combatState,
            id: 'guard',
            label: '방어 반동',
            progress: 0,
            phase: 'guard',
          })
        : combatState;
    const map = this.mapRuntime.getResolvedMap();
    const mapSnapshot = this.mapRuntime.getResolvedSnapshot();
    const activeRoom = mapSnapshot.room;
    const characterRenderScale = CHARACTER_RENDER_SCALE;
    const characterRenderOrder = activeRoom.renderOrder + 0.5;
    const combatEvents = this.combatEvents.snapshot();
    const contactGeometry =
      this.playerCombatGeometry?.sequence === combatState.sequence
        ? this.playerCombatGeometry
        : null;
    const pose = samplePlayerMotionPose(
      Object.freeze({
        motionState: poseCombatState,
        boneInput: Object.freeze({
          animationTime: renderAnimationTime,
          movementIntent: this.movementIntent,
          isGrounded: this.isGrounded,
          verticalVelocity: this.verticalVelocity,
          landingRecovery: this.landingRecoverySeconds / LANDING_RECOVERY_SECONDS,
          hitstunProgress: this.playerHitstunSeconds / 0.22,
          blockstunProgress:
            this.playerBlockstunDurationSeconds > 0
              ? this.playerBlockstunSeconds / this.playerBlockstunDurationSeconds
              : 0,
          blockStrength: this.playerBlockImpactStrength,
          knockedOut: this.playerHealth === 0,
          rollProgress: this.rollState
            ? this.rollState.elapsedSeconds / this.rollState.durationSeconds
            : null,
        }),
      }),
    );
    const renderCombatGeometry = sampleSharedPlayerCombatGeometry({
      position: renderPosition,
      facing: this.facing,
      targetPose: pose.targetPose,
      bonePose: pose.bonePose,
      geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
      weaponLengthScale: this.equipmentProfile.geometry.weaponLengthScale,
    });
    const playerPresentation = createPlayerCombatPresentation(
      Object.freeze({
        position: renderPosition,
        facing: this.facing,
        targetPose: pose.targetPose,
        bonePose: pose.bonePose,
        combatGeometry: renderCombatGeometry,
        renderScale: characterRenderScale,
        renderOrder: characterRenderOrder,
        weaponLengthScale: this.equipmentProfile.geometry.weaponLengthScale,
        contactGeometry,
        contactProfile: this.getAttackHitProfile(combatState.id),
        contactProgress: combatState.progress,
        combatEvents,
        blockImpactSeconds: this.playerBlockImpactSeconds,
        blockImpactStrength: this.playerBlockImpactStrength,
        retaliationSeconds: this.playerRetaliationSeconds,
        enemyRenderOrder: activeRoom.renderOrder + 0.49,
      }),
    );
    const { characterItems, combatEffectItems } = playerPresentation;
    const encounterRender = this.roomSceneNode?.createEncounterRenderSnapshot(
      activeRoom.renderOrder + 0.45,
    ) ?? { enemy: null, presentationState: null, geometry: null, contact: null };
    const encounterItems = encounterRender.presentationState
      ? createTrainingEnemyItems(
          encounterRender.presentationState,
          activeRoom.renderOrder + 0.45,
          this.encounterAttackProfiles,
          encounterRender.geometry,
        )
      : [];
    const combatEnemy = encounterRender.enemy
      ? Object.freeze({
          ...encounterRender.enemy,
          attack: Object.freeze({
            ...encounterRender.enemy.attack,
            frame: sampleTrainingEnemyCombatFrame(
              encounterRender.presentationState,
              this.encounterAttackProfiles,
            ),
          }),
        })
      : null;
    const items = Object.freeze(
      [...mapSnapshot.renderItems, ...encounterItems, ...characterItems, ...combatEffectItems]
        .filter((item) => item.enabled !== false)
        .sort(
          (left, right) =>
            (left.renderOrder ?? 0) - (right.renderOrder ?? 0) ||
            (left.order ?? 0) - (right.order ?? 0) ||
            left.id.localeCompare(right.id),
        ),
    );
    const bounds = mapSnapshot.worldBounds ?? {
      x: 0,
      y: 0,
      width: map.worldSize.width,
      height: map.worldSize.height,
    };

    const renderCameraPosition = {
      x: lerp(this.previousCameraPosition.x, this.cameraPosition.x, interpolationAlpha),
      y: lerp(this.previousCameraPosition.y, this.cameraPosition.y, interpolationAlpha),
    };
    const combatCameraOffset = this.combatCameraFeedback.snapshot();
    const renderFrame = Object.freeze({
      worldSize: map.worldSize,
      groundY: map.groundY,
      gridSize: map.gridSize,
      palette: map.palette,
      animationTime: renderAnimationTime,
      cameraOffset: Object.freeze({
        x: renderCameraPosition.x - 480 + combatCameraOffset.x,
        y: renderCameraPosition.y - 270 + combatCameraOffset.y,
      }),
      camera: Object.freeze({ position: Object.freeze(renderCameraPosition) }),
      characterRenderScale,
      worldBounds: Object.freeze({
        minX: bounds.x,
        maxX: bounds.x + bounds.width,
        minY: bounds.y,
        maxY: bounds.y + bounds.height,
      }),
      playerMovementBounds: activeRoom.movementBounds,
      map: Object.freeze({
        id: map.id,
        name: map.name,
        activeRegionId: mapSnapshot.active.regionId,
        activeRoomId: mapSnapshot.active.roomId,
        timePhase: this.timePhase,
        appliedPatchIds: mapSnapshot.appliedPatchIds,
        portalIds: Object.freeze(mapSnapshot.portals.map((portal) => portal.id).sort()),
      }),
      equipment: this.equipmentProfile,
      combatMotion: Object.freeze({
        id: combatState.id,
        label: combatState.label,
        progress: combatState.progress,
        phase: combatState.phase,
        sequence: combatState.sequence,
        comboCycle: combatState.comboCycle,
        queuedMotion: combatState.queuedMotion,
        frame: combatState.frame ?? null,
      }),
      combatEvents,
      combatContact: encounterRender.contact,
      player: Object.freeze({
        position: renderPosition,
        isGrounded: this.isGrounded,
        health: this.playerHealth,
        maxHealth: this.playerMaxHealth,
        stamina: combatState.stamina,
        maxStamina: combatState.maxStamina,
        staminaExhausted: combatState.exhausted,
        justGuardCounterReady: combatState.justGuardCounterReady,
        justGuardCounterWindowSeconds: combatState.justGuardCounterWindowSeconds,
        lastStaminaAction: combatState.lastStaminaAction,
        lastCommandTransition: combatState.lastCommandTransition,
        hitstunSeconds: this.playerHitstunSeconds,
        retaliationSeconds: this.playerRetaliationSeconds,
        roomId: mapSnapshot.active.roomId,
        portalTransition: mapSnapshot.transition
          ? Object.freeze({
              portalId: mapSnapshot.transition.portalId,
              fromRoomId: mapSnapshot.transition.from.roomId,
              toRoomId: mapSnapshot.transition.to.roomId,
              progress: mapSnapshot.transition.progress,
            })
          : null,
        roll: this.rollState
          ? Object.freeze({
              direction: this.rollState.direction,
              progress: Math.max(
                0,
                Math.min(1, this.rollState.elapsedSeconds / this.rollState.durationSeconds),
              ),
            })
          : null,
      }),
      combatEnemy,
      items,
    });
    this.renderFrameCreated.emit(renderFrame);
    return renderFrame;
  }
}
