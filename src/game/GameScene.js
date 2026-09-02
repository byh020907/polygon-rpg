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
import { FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE } from './journey/FirstJourneyDungeonSignature.js';
import { MapRuntime } from './map/MapRuntime.js';
import {
  PROGRESSION_TRANSACTION_REASON,
  assertProgressionSnapshot,
  awardEnemyEnchantMaterial,
  awardWeaponForgeMaterial,
  awardTrainingMarks,
  createProgressionSnapshot,
  getAvailableGold,
  forgeWeaponArchetype as forgeProgressionWeaponArchetype,
  mergeProgressionSnapshot,
  purchaseEquipment as purchaseProgressionEquipment,
  recordViewedConversation,
  selectEquipment as selectProgressionEquipment,
  trainCombatSkill as trainProgressionCombatSkill,
  upgradeSwordEnchantment as upgradeProgressionSwordEnchantment,
} from './progression/ProgressionState.js';
import {
  ENCHANTMENT_MATERIAL_COSTS,
  awardEnchantMaterial,
  canonicalizeEnchantmentSnapshot,
} from './enchantment/EnchantmentState.js';
import { ROOM_SCENE } from './room/RoomNode.js';
import {
  resolveFirstJourneyConversationTranscripts,
  resolveFirstJourneyStory,
} from './story/FirstJourneyStory.js';
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
import {
  advanceScrapGarageReveal,
  advanceScrapAwakening,
  commitScrapCampaignAction,
  getScrapCampaignReadModel,
  previewScrapCampaignAction,
  SCRAP_CAMPAIGN_ACTION_KIND,
  startScrapGarageReveal,
  startScrapAwakening,
  toScrapCampaignSnapshot,
} from './campaign/ScrapCampaignState.js';
import {
  SCRAP_AWAKENING_STAGE,
  assertScrapAwakeningStageId,
  getScrapAwakeningPresentation,
} from './campaign/ScrapAwakeningState.js';
import {
  SCRAP_GARAGE_REVEAL_STAGE,
  assertScrapGarageRevealStageId,
  getScrapGarageRevealPresentation,
} from './campaign/ScrapGarageRevealState.js';

const CHARACTER_SPEED = 230;
const JUMP_SPEED = 470;
const GRAVITY = 1180;
const ROLL_DURATION_SECONDS = combatFramesToSeconds(25);
const ROLL_SPEED = 320;
const LANDING_RECOVERY_SECONDS = combatFramesToSeconds(8);
const ACADEMY_ROOM_IDS = Object.freeze([
  'academy-plaza',
  'academy-weapon-shop',
  'academy-enchanter-shop',
]);

function isAcademyRoom(roomId) {
  return ACADEMY_ROOM_IDS.includes(roomId);
}

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
    postureDamageScale: equipmentProfile.attack.postureDamageScale ?? 1,
    backPunishDamageScale: equipmentProfile.attack.backPunishDamageScale ?? 1,
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
  const weaponForge = profile?.weaponForge;
  if (
    !profile ||
    !Number.isInteger(profile.trainingClearReward) ||
    !Number.isInteger(profile.maxSkillLevel) ||
    typeof profile.getSkillLevelProfile !== 'function' ||
    typeof profile.getSkillUpgradeCost !== 'function' ||
    typeof profile.getSkillTrainingMarkRequirement !== 'function' ||
    !Array.isArray(profile.merchantProfileIds) ||
    !weaponForge ||
    typeof weaponForge.choiceGroupId !== 'string' ||
    typeof weaponForge.sourceId !== 'string' ||
    typeof weaponForge.materialId !== 'string' ||
    !Number.isSafeInteger(weaponForge.sourceQuantity) ||
    !Number.isSafeInteger(weaponForge.materialCost) ||
    !Array.isArray(weaponForge.optionProfileIds)
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

function assertScrapCampaignProfile(profile) {
  if (
    !profile ||
    !Array.isArray(profile.regions) ||
    typeof profile.getRegion !== 'function' ||
    !profile.startLocation ||
    !profile.capital
  ) {
    throw new TypeError('GameScene에는 authored scrap campaign profile 주입이 필요합니다.');
  }
  return profile;
}

function assertScrapAwakeningProfile(profile) {
  if (
    !profile ||
    typeof profile.mapId !== 'string' ||
    typeof profile.regionId !== 'string' ||
    typeof profile.roomId !== 'string' ||
    typeof profile.deviceEntityId !== 'string' ||
    typeof profile.ownerEntityId !== 'string' ||
    typeof profile.ownerConversationId !== 'string' ||
    typeof profile.wallMapEntityId !== 'string' ||
    !Number.isFinite(profile.focusX) ||
    !Number.isFinite(profile.garageFocusX) ||
    typeof profile.getStageDurationSeconds !== 'function' ||
    typeof profile.getGarageStageDurationSeconds !== 'function'
  ) {
    throw new TypeError('GameScene에는 authored scrap awakening profile 주입이 필요합니다.');
  }
  return profile;
}

function assertCharacterPresentationCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.profiles) || typeof catalog.getProfile !== 'function') {
    throw new TypeError('GameScene에는 authored character presentation catalog 주입이 필요합니다.');
  }
  return catalog;
}

function resolveCharacterPresentationProfile(catalog, profileId, ownerLabel) {
  if (typeof profileId !== 'string' || profileId.trim().length === 0) {
    throw new TypeError(`${ownerLabel}에는 character presentation profile ID가 필요합니다.`);
  }
  const profile = catalog.getProfile(profileId);
  if (!profile) {
    throw new Error(
      `${ownerLabel}의 character presentation profile을 찾을 수 없습니다: ${profileId}`,
    );
  }
  return profile;
}

function assertEnchantmentCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.profiles) || typeof catalog.getProfile !== 'function')
    throw new TypeError('GameScene에는 authored enchantment catalog 주입이 필요합니다.');
  return catalog;
}

function scrapCampaignWorldFacts(campaign) {
  return Object.freeze({
    scrapAwakeningStageId: campaign.awakeningStageId,
    scrapGarageRevealStageId: campaign.garageRevealStageId,
    scrapRegionStatuses: Object.freeze(
      Object.fromEntries(campaign.regions.map((region) => [region.id, region.status])),
    ),
    scrapRegionStageIds: Object.freeze(
      Object.fromEntries(campaign.regions.map((region) => [region.id, region.eventStageId])),
    ),
    scrapCollectedPartIds: Object.freeze(
      campaign.regions.filter((region) => region.collected).map((region) => region.partId),
    ),
    scrapCollectedPartCount: campaign.collectedPartCount,
    scrapRobotCompletionPercent: campaign.completionPercent,
  });
}

export class GameScene extends SceneNode {
  constructor({
    mapDefinition,
    equipmentCatalog,
    combatProgressionProfile,
    encounterFactory,
    encounterAttackProfiles,
    worldTimeProfile,
    scrapCampaignProfile,
    scrapAwakeningProfile,
    characterPresentationCatalog,
    playerPresentationProfileId,
    enchantmentCatalog,
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
    this.scrapCampaignProfile = assertScrapCampaignProfile(scrapCampaignProfile);
    this.scrapAwakeningProfile = assertScrapAwakeningProfile(scrapAwakeningProfile);
    this.characterPresentationCatalog = assertCharacterPresentationCatalog(
      characterPresentationCatalog,
    );
    this.playerPresentationProfile = resolveCharacterPresentationProfile(
      this.characterPresentationCatalog,
      playerPresentationProfileId,
      'Player',
    );
    this.enchantmentCatalog = assertEnchantmentCatalog(enchantmentCatalog);
    const initialProgression =
      progressionSnapshot ??
      createProgressionSnapshot(
        this.equipmentCatalog.defaultProfileId,
        this.enchantmentCatalog,
        this.scrapCampaignProfile,
      );
    this.progressionSnapshot = mergeProgressionSnapshot(initialProgression, {
      enchantment: canonicalizeEnchantmentSnapshot(
        initialProgression.enchantment,
        this.enchantmentCatalog,
        initialProgression.ownedEquipmentIds,
      ),
    });
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
    const initialScrapCampaign = getScrapCampaignReadModel(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
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
        ...scrapCampaignWorldFacts(initialScrapCampaign),
      },
    });
    this.renderFrameCreated = this.ownSignal(new Signal('renderFrameCreated'));
    this.roomChanged = this.ownSignal(new Signal('roomChanged'));
    this.progressionChanged = this.ownSignal(new Signal('progressionChanged'));
    this.operationMapRequested = this.ownSignal(new Signal('operationMapRequested'));
    this.campaignActionPreviewRequested = this.ownSignal(
      new Signal('campaignActionPreviewRequested'),
    );
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

  getEnchantContext() {
    const swordId = this.progressionSnapshot.equippedEquipmentId;
    const sword = this.progressionSnapshot.enchantment.swordEnchantments[swordId];
    const profile = sword?.elementId ? this.enchantmentCatalog.getProfile(sword.elementId) : null;
    return Object.freeze({
      swordId,
      level: sword?.level ?? 0,
      active: profile
        ? Object.freeze({
            swordId,
            level: sword.level,
            id: profile.id,
            label: profile.label,
            color: profile.color,
            highlightColor: profile.highlightColor,
            shape: profile.shape,
          })
        : null,
    });
  }

  restoreProgression(snapshot) {
    assertProgressionSnapshot(snapshot, this.scrapCampaignProfile);
    const nextSnapshot = mergeProgressionSnapshot(snapshot, {
      enchantment: canonicalizeEnchantmentSnapshot(
        snapshot.enchantment,
        this.enchantmentCatalog,
        snapshot.ownedEquipmentIds,
      ),
    });
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
    this.reconcileEnchantMaterials();
    this.reconcileWeaponForgeMaterial();
    this.timePhase = getWorldClockReadModel(this.worldTimeSnapshot).timePhase;
    const scrapCampaign = getScrapCampaignReadModel(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    this.mapRuntime.setWorldContext({
      timePhase: this.timePhase,
      deadlineMinutes: this.worldTimeSnapshot.deadlineMinutes,
      crisis: this.worldTimeSnapshot.crisis,
      weather: 'clear',
      storyFlags: { ...journey.storyFlags, ...regionExpansion.storyFlags },
      ...scrapCampaignWorldFacts(scrapCampaign),
    });
    let mapSnapshot = this.mapRuntime.reset();
    if (scrapCampaign.currentLocationId !== this.scrapCampaignProfile.startLocation.id) {
      const endpoint = this.resolveScrapCampaignMapEndpoint(scrapCampaign.currentLocationId);
      if (endpoint) {
        mapSnapshot = this.mapRuntime.setActiveLocation(endpoint.regionId, endpoint.roomId, {
          position: endpoint.spawn ?? endpoint.anchor,
          facing: endpoint.facing ?? 1,
        });
      }
    }
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
    this.scrapAwakeningElapsedSeconds = 0;
    this.scrapGarageRevealElapsedSeconds = 0;
    this.storyInteractionOwner.reset();
    this.lastJumpSequence = 0;
    this.facing = mapSnapshot.spawn?.facing ?? 1;
    this.portalTransitionPresentation = null;
    this.pendingScrapCampaignAction = null;
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
    const cameraBounds = mapSnapshot.cameraBounds;
    const minimumCameraX = cameraBounds.x + 480;
    const maximumCameraX = cameraBounds.x + cameraBounds.width - 480;
    this.cameraPosition = {
      x:
        minimumCameraX <= maximumCameraX
          ? Math.max(minimumCameraX, Math.min(maximumCameraX, playerX))
          : mapSnapshot.cameraPosition.x,
      y: mapSnapshot.cameraPosition.y,
    };
    this.previousCameraPosition = { ...this.cameraPosition };
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.statusNode.publish({ force: true });
    return mapSnapshot;
  }

  resolveScrapCampaignMapEndpoint(locationId) {
    for (const portal of this.mapRuntime.getResolvedMap().portals) {
      if (portal.campaignTravel?.fromLocationId === locationId) return portal.from;
      if (portal.campaignTravel?.toLocationId === locationId) return portal.to;
    }
    return null;
  }

  setVisualQaScrapAwakeningStage(stageId) {
    assertScrapAwakeningStageId(stageId);
    const current = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    const scrapCampaign = toScrapCampaignSnapshot(
      {
        ...current,
        awakeningStageId: stageId,
        garageRevealStageId:
          stageId === SCRAP_AWAKENING_STAGE.COMPLETE
            ? SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY
            : SCRAP_GARAGE_REVEAL_STAGE.LOCKED,
        lastChangeLabel: getScrapAwakeningPresentation(stageId).cue,
      },
      this.scrapCampaignProfile,
    );
    this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
      scrapCampaign,
    });
    this.scrapAwakeningElapsedSeconds = 0;
    this.syncScrapAwakeningWorldContext();
    this.statusNode.publish({ force: true });
    return scrapCampaign;
  }

  setVisualQaScrapGarageRevealStage(stageId) {
    assertScrapGarageRevealStageId(stageId);
    const current = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    const scrapCampaign = toScrapCampaignSnapshot(
      {
        ...current,
        awakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
        garageRevealStageId: stageId,
        lastChangeLabel: getScrapGarageRevealPresentation(stageId).cue,
      },
      this.scrapCampaignProfile,
    );
    this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
      scrapCampaign,
    });
    this.scrapGarageRevealElapsedSeconds = 0;
    this.syncScrapAwakeningWorldContext();
    this.statusNode.publish({ force: true });
    return scrapCampaign;
  }

  setVisualQaScrapRegionState({
    regionId,
    stageKind,
    status,
    collected = false,
    currentLocationId = regionId,
  }) {
    const region = this.scrapCampaignProfile.getRegion(regionId);
    const stage = region?.eventStages.find((candidate) => candidate.kind === stageKind);
    if (!region || !stage) {
      throw new Error(`지원하지 않는 Scrap region QA stage입니다: ${regionId}:${stageKind}`);
    }
    const current = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    const scrapCampaign = toScrapCampaignSnapshot(
      {
        ...current,
        currentLocationId,
        awakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
        garageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
        regionStates: { ...current.regionStates, [region.id]: status },
        regionEventStageIds: {
          ...current.regionEventStageIds,
          [region.id]: stage.id,
        },
        collectedPartIds: collected
          ? [...new Set([...current.collectedPartIds, region.part.id])]
          : current.collectedPartIds.filter((partId) => partId !== region.part.id),
        lastChangeLabel: `${region.label} · ${stage.label}`,
      },
      this.scrapCampaignProfile,
    );
    this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
      scrapCampaign,
    });
    this.syncScrapAwakeningWorldContext();
    this.statusNode.publish({ force: true });
    return scrapCampaign;
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
    encounter.setWeakPointExposure(false);
    encounter.lastVisualContact = Object.freeze({
      attacker: 'player',
      sequence: 1,
      pulseIndex: 0,
      contact: true,
      gap: 0,
      simulationGap: 0,
      weaponItemId: 'sword-blade',
      hurtItemId: 'combat-enemy-collector-eye',
      position: Object.freeze({ x: playerX + 62, y: groundY - 72 }),
    });
    encounter.contactSeconds =
      phase === 'active' &&
      (['combat-hit', 'combat-block', 'combat-evade', 'combat-punish', 'combat-launch'].includes(
        scenarioId,
      ) ||
        [
          'enchant-fire-contact',
          'enchant-lightning-contact',
          'enchant-ice-status',
          'enchant-earth-posture',
          'enchant-shield-excluded',
        ].includes(scenarioId))
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
        'boss-weak-point-exposed',
        'combat-guard-break',
        'combat-just-guard',
        'combat-guard-counter',
        'posture-full',
        'posture-reduced',
        'posture-groggy',
        'posture-normal-enemy',
        'enchant-fire-contact',
        'enchant-lightning-contact',
        'enchant-ice-status',
        'enchant-earth-posture',
        'enchant-shield-excluded',
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
      case 'enchant-fire-contact':
      case 'enchant-lightning-contact':
      case 'enchant-ice-status':
      case 'enchant-earth-posture': {
        const id = scenarioId.split('-')[1];
        startMotion(id === 'earth' ? 'heavy' : 'slash', active ? 0.25 : 0.04);
        if (id === 'earth' && enemy.posture)
          enemy.posture.current = Math.max(1, enemy.posture.current - 18);
        if (scenarioId === 'enchant-ice-status') {
          const profile = this.enchantmentCatalog.getProfile(id);
          enemy.enchantStatus = {
            id,
            label: profile.label,
            color: profile.color,
            shape: profile.shape,
            remainingSeconds: active ? 2.4 : 0.2,
            buildup: 0,
          };
        }
        if (active) {
          const activeEnchant = this.getEnchantContext().active;
          emit(COMBAT_EVENT_TYPE.HIT, {
            attackId: id === 'earth' ? 'heavy' : 'slash',
            durationSeconds: 0.22,
            enchantment: {
              id,
              swordId: activeEnchant?.id === id ? activeEnchant.swordId : null,
              level: activeEnchant?.id === id ? activeEnchant.level : 0,
              affinity: 'neutral',
              ...this.enchantmentCatalog.getProfile(id),
            },
          });
          this.combatEvents.update(0.09);
        }
        break;
      }
      case 'enchant-shield-excluded':
        startMotion('shieldBash', active ? 0.19 : 0.04);
        if (active) emit(COMBAT_EVENT_TYPE.COUNTER, { attackId: 'shieldBash' });
        break;
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
      case 'boss-weak-point-exposed':
        encounter.setVisualQaWeakPointExposure(active);
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

  setVisualQaMaterialEchoDefeats(defeats) {
    if (!Number.isInteger(defeats) || defeats < 1 || defeats > 62) {
      throw new RangeError('Material echo Visual QA 격파 횟수는 1~62 정수여야 합니다.');
    }
    const encounter = this.roomSceneNode?.encounter;
    if (!encounter?.getGameplaySnapshot()?.materialReward) {
      throw new Error('Material echo Visual QA에는 material reward encounter가 필요합니다.');
    }
    for (let count = 0; count < defeats; count += 1) {
      encounter.completeForVisualQa();
      if (count + 1 < defeats) encounter.reset();
    }
    this.statusNode.publish({ force: true });
    return this.progressionSnapshot;
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

  getScrapAwakeningReadModel() {
    return getScrapCampaignReadModel(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
  }

  isScrapAwakeningLocation() {
    const location = this.mapRuntime.getActiveLocation();
    return (
      this.mapRuntime.definition.id === this.scrapAwakeningProfile.mapId &&
      location.regionId === this.scrapAwakeningProfile.regionId &&
      location.roomId === this.scrapAwakeningProfile.roomId
    );
  }

  syncScrapAwakeningWorldContext() {
    const campaign = this.getScrapAwakeningReadModel();
    this.mapRuntime.setWorldContext({
      ...this.mapRuntime.getWorldContext(),
      ...scrapCampaignWorldFacts(campaign),
    });
  }

  commitScrapAwakening(transaction) {
    if (!transaction.changed) return transaction;
    const progressionTransaction = Object.freeze({
      ...transaction,
      snapshot: mergeProgressionSnapshot(this.progressionSnapshot, {
        scrapCampaign: transaction.snapshot,
      }),
    });
    this.scrapAwakeningElapsedSeconds = 0;
    this.commitProgression(progressionTransaction);
    this.syncScrapAwakeningWorldContext();
    this.statusNode.publish({ force: true });
    return Object.freeze({ ...transaction, progressionSnapshot: this.progressionSnapshot });
  }

  tryStartScrapAwakening() {
    const awakening = this.getScrapAwakeningReadModel();
    if (
      !this.isScrapAwakeningLocation() ||
      awakening.awakeningStageId !== SCRAP_AWAKENING_STAGE.COMMISSION
    ) {
      return false;
    }
    const device = this.mapRuntime
      .getResolvedSnapshot()
      .entities.find((entity) => entity.id === this.scrapAwakeningProfile.deviceEntityId);
    if (!device?.position) return false;
    const interactionRange = device.interactionRange ?? 64;
    if (
      Math.hypot(this.position.x - device.position.x, this.position.y - device.position.y) >
      interactionRange
    ) {
      return false;
    }
    const transaction = startScrapAwakening(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    this.progressionNotice = '제어장치 직접 회수 · 고철 대왕 신호 감지';
    this.combatCommands.reset();
    this.rollState = null;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.commitScrapAwakening(transaction);
    this.combatCameraFeedback.trigger({ direction: 1, strength: 2.4, durationSeconds: 0.12 });
    return transaction.changed;
  }

  advanceScrapAwakeningRuntime(deltaSeconds) {
    const awakening = this.getScrapAwakeningReadModel();
    if (!this.isScrapAwakeningLocation() || !awakening.awakeningActive) return false;
    this.scrapAwakeningElapsedSeconds += deltaSeconds;
    const durationSeconds = this.scrapAwakeningProfile.getStageDurationSeconds(
      awakening.awakeningStageId,
    );
    if (this.scrapAwakeningElapsedSeconds < durationSeconds) return true;
    const transaction = advanceScrapAwakening(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    if (!transaction.changed) return false;
    const nextStageId = transaction.snapshot.awakeningStageId;
    this.progressionNotice = getScrapCampaignReadModel(
      transaction.snapshot,
      this.scrapCampaignProfile,
    ).awakening.cue;
    this.commitScrapAwakening(transaction);
    if (
      nextStageId === SCRAP_AWAKENING_STAGE.EYES_LIT ||
      nextStageId === SCRAP_AWAKENING_STAGE.ASSEMBLED
    ) {
      this.combatCameraFeedback.trigger({
        direction: nextStageId === SCRAP_AWAKENING_STAGE.EYES_LIT ? -1 : 1,
        strength: nextStageId === SCRAP_AWAKENING_STAGE.EYES_LIT ? 3.8 : 5,
        durationSeconds: 0.14,
      });
    }
    return nextStageId !== SCRAP_AWAKENING_STAGE.COMPLETE;
  }

  commitScrapGarageReveal(transaction) {
    if (!transaction.changed) return transaction;
    const progressionTransaction = Object.freeze({
      ...transaction,
      snapshot: mergeProgressionSnapshot(this.progressionSnapshot, {
        scrapCampaign: transaction.snapshot,
      }),
    });
    this.scrapGarageRevealElapsedSeconds = 0;
    this.commitProgression(progressionTransaction);
    this.syncScrapAwakeningWorldContext();
    this.statusNode.publish({ force: true });
    return Object.freeze({ ...transaction, progressionSnapshot: this.progressionSnapshot });
  }

  tryStartScrapGarageReveal() {
    const campaign = this.getScrapAwakeningReadModel();
    if (
      !this.isScrapAwakeningLocation() ||
      campaign.garageRevealStageId !== SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY
    ) {
      return false;
    }
    const transaction = startScrapGarageReveal(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    if (!transaction.changed) return false;
    this.progressionNotice = '고물상 주인 · 제어장치 분석 시작';
    this.combatCommands.reset();
    this.rollState = null;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.commitScrapGarageReveal(transaction);
    this.combatCameraFeedback.trigger({ direction: -1, strength: 2.2, durationSeconds: 0.12 });
    return true;
  }

  advanceScrapGarageRevealRuntime(deltaSeconds) {
    const campaign = this.getScrapAwakeningReadModel();
    if (!this.isScrapAwakeningLocation() || !campaign.garageRevealActive) return false;
    this.scrapGarageRevealElapsedSeconds += deltaSeconds;
    const durationSeconds = this.scrapAwakeningProfile.getGarageStageDurationSeconds(
      campaign.garageRevealStageId,
    );
    if (this.scrapGarageRevealElapsedSeconds < durationSeconds) return true;
    const transaction = advanceScrapGarageReveal(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    if (!transaction.changed) return false;
    const nextReadModel = getScrapCampaignReadModel(
      transaction.snapshot,
      this.scrapCampaignProfile,
    );
    this.progressionNotice = nextReadModel.garageReveal.cue;
    this.commitScrapGarageReveal(transaction);
    if (
      nextReadModel.garageRevealStageId === SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED ||
      nextReadModel.garageRevealStageId === SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED
    ) {
      this.combatCameraFeedback.trigger({
        direction:
          nextReadModel.garageRevealStageId === SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED ? -1 : 1,
        strength:
          nextReadModel.garageRevealStageId === SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED ? 2.8 : 4.2,
        durationSeconds: 0.14,
      });
    }
    return nextReadModel.garageRevealStageId !== SCRAP_GARAGE_REVEAL_STAGE.COMPLETE;
  }

  tryRequestOperationMapFromWorld() {
    const campaign = this.getScrapAwakeningReadModel();
    if (!this.isScrapAwakeningLocation() || !campaign.garageRevealComplete) return false;
    const wallMap = this.mapRuntime
      .getResolvedSnapshot()
      .entities.find((entity) => entity.id === this.scrapAwakeningProfile.wallMapEntityId);
    if (!wallMap?.position) return false;
    const interactionRange = wallMap.interactionRange ?? 64;
    if (
      Math.hypot(this.position.x - wallMap.position.x, this.position.y - wallMap.position.y) >
      interactionRange
    ) {
      return false;
    }
    this.operationMapRequested.emit(
      Object.freeze({ source: 'scrapyard-wall-map', campaign: this.getScrapAwakeningReadModel() }),
    );
    return true;
  }

  createScrapCampaignTravelAction(portal) {
    const travel = portal?.campaignTravel;
    if (!travel) throw new TypeError('campaign 장거리 이동 portal이 필요합니다.');
    const active = this.mapRuntime.getActiveLocation();
    const movingForward =
      active.regionId === portal.from.regionId && active.roomId === portal.from.roomId;
    const movingBackward =
      active.regionId === portal.to.regionId && active.roomId === portal.to.roomId;
    if (!movingForward && !movingBackward) {
      throw new Error(`현재 위치에서 사용할 수 없는 campaign 연결로입니다: ${portal.id}`);
    }
    const targetLocationId = movingForward ? travel.toLocationId : travel.fromLocationId;
    const campaignSnapshot = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    const targetLabel =
      targetLocationId === this.scrapCampaignProfile.startLocation.id
        ? this.scrapCampaignProfile.startLocation.label
        : this.scrapCampaignProfile.getRegion(targetLocationId)?.label;
    const route = this.scrapCampaignProfile.routes.find(
      (candidate) => candidate.id === travel.routeId,
    );
    if (!targetLabel || !route) throw new Error('campaign 연결로 authored profile이 불완전합니다.');
    return Object.freeze({
      actionId: `travel:${portal.id}:${campaignSnapshot.elapsedSegments}:${campaignSnapshot.committedActionIds.length}`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.TRAVEL,
      label: `장거리 이동 · ${targetLabel}`,
      routeId: route.id,
      targetLocationId,
      costSegments: route.travelSegments,
    });
  }

  createScrapCampaignRegionStageAction(regionId, stageKind) {
    const region = this.scrapCampaignProfile.getRegion(regionId);
    const stage = region?.eventStages.find((candidate) => candidate.kind === stageKind);
    if (!region || !stage)
      throw new Error(`지원하지 않는 지역 사건 stage입니다: ${regionId}:${stageKind}`);
    return Object.freeze({
      actionId: `region-stage:${stage.id}`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.REGION_STAGE,
      label: `${region.label} · ${stage.label}`,
      targetRegionId: region.id,
      targetStageId: stage.id,
      costSegments: 0,
    });
  }

  createScrapCampaignRegionEventStartAction(regionId) {
    const region = this.scrapCampaignProfile.getRegion(regionId);
    if (!region) throw new Error(`지원하지 않는 지역 사건입니다: ${regionId}`);
    return Object.freeze({
      actionId: `region:${region.id}:event-start`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.REGION_EVENT_START,
      label: `핵심 사건 시작 · ${region.event.label}`,
      targetRegionId: region.id,
      costSegments: region.event.costSegments,
    });
  }

  createScrapCampaignRegionSuccessAction(regionId) {
    const region = this.scrapCampaignProfile.getRegion(regionId);
    if (!region) throw new Error(`지원하지 않는 지역 성공 action입니다: ${regionId}`);
    return Object.freeze({
      actionId: `region:${region.id}:resolved`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.REGION_SUCCESS,
      label: `지역 해결 · ${region.part.label} 회수`,
      targetRegionId: region.id,
      costSegments: 0,
      extensionSegments: region.event.extensionSegments,
    });
  }

  commitScrapCampaignDomainAction(action) {
    const transaction = commitScrapCampaignAction(
      this.progressionSnapshot.scrapCampaign,
      action,
      this.scrapCampaignProfile,
    );
    if (!transaction.changed) return transaction;
    this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
      scrapCampaign: transaction.snapshot,
    });
    this.progressionNotice = `${transaction.preview.label} · ${transaction.preview.after.phaseLabel} · ${transaction.preview.after.deadlineLabel}`;
    this.syncScrapAwakeningWorldContext();
    this.emitDurableProgressionChanged();
    this.statusNode.publish({ force: true });
    return Object.freeze({ ...transaction, progressionSnapshot: this.progressionSnapshot });
  }

  requestScrapCampaignTravel(portal) {
    if (this.pendingScrapCampaignAction || !this.canStartPortalTransition()) return false;
    const action = this.createScrapCampaignTravelAction(portal);
    const preview = previewScrapCampaignAction(
      this.progressionSnapshot.scrapCampaign,
      action,
      this.scrapCampaignProfile,
    );
    this.pendingScrapCampaignAction = Object.freeze({
      type: 'travel',
      portalId: portal.id,
      action,
      preview,
    });
    this.combatCommands.reset();
    this.rollState = null;
    this.campaignActionPreviewRequested.emit(
      Object.freeze({
        source: 'long-distance-road-end',
        portalId: portal.id,
        preview,
      }),
    );
    return true;
  }

  requestScrapCampaignRegionEventStart(regionId) {
    if (this.pendingScrapCampaignAction || this.mapRuntime.getTransition()) return false;
    const action = this.createScrapCampaignRegionEventStartAction(regionId);
    const preview = previewScrapCampaignAction(
      this.progressionSnapshot.scrapCampaign,
      action,
      this.scrapCampaignProfile,
    );
    this.pendingScrapCampaignAction = Object.freeze({
      type: 'region-event-start',
      action,
      preview,
    });
    this.combatCommands.reset();
    this.rollState = null;
    this.campaignActionPreviewRequested.emit(
      Object.freeze({ source: 'region-core-event', regionId, preview }),
    );
    return true;
  }

  confirmScrapCampaignAction() {
    const pending = this.pendingScrapCampaignAction;
    if (!pending) return Object.freeze({ started: false, reason: 'no-pending-preview' });
    previewScrapCampaignAction(
      this.progressionSnapshot.scrapCampaign,
      pending.action,
      this.scrapCampaignProfile,
    );
    if (pending.type === 'travel') {
      const portal = this.mapRuntime.getPortal(pending.portalId);
      if (!portal) {
        this.pendingScrapCampaignAction = null;
        return Object.freeze({ started: false, reason: 'portal-unavailable' });
      }
      this.beginPortalTransition(portal, { campaignAction: pending.action });
      this.pendingScrapCampaignAction = null;
      return Object.freeze({ started: true, reason: 'confirmed', preview: pending.preview });
    }
    const transaction = this.commitScrapCampaignDomainAction(pending.action);
    this.pendingScrapCampaignAction = null;
    return Object.freeze({
      started: transaction.changed,
      reason: transaction.changed ? 'confirmed' : transaction.reason,
      preview: pending.preview,
      transaction,
    });
  }

  cancelScrapCampaignAction() {
    if (!this.pendingScrapCampaignAction) {
      return Object.freeze({ cancelled: false, reason: 'no-pending-preview' });
    }
    const preview = this.pendingScrapCampaignAction.preview;
    this.pendingScrapCampaignAction = null;
    return Object.freeze({ cancelled: true, reason: 'cancelled', preview });
  }

  confirmScrapCampaignTravel() {
    return this.confirmScrapCampaignAction();
  }

  cancelScrapCampaignTravel() {
    return this.cancelScrapCampaignAction();
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
    if (this.mapRuntime.getTransition() || this.pendingScrapCampaignAction) return false;
    const combatState = this.combatCommands.snapshot();
    return this.isGrounded && !this.rollState && combatState.id === 'idle';
  }

  beginPortalTransition(portal, { campaignAction = null } = {}) {
    const transition = this.mapRuntime.beginPortalTransition(portal.id);
    this.portalTransitionPresentation = {
      sourceLocation: { ...this.mapRuntime.getActiveLocation() },
      startPosition: { ...this.position },
      destinationPosition: { ...transition.destinationPosition },
      sourceCameraPosition: { ...this.cameraPosition },
      destinationCameraPosition: { ...transition.destinationCameraPosition },
      campaignAction,
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
    if (!portal) return false;
    return portal.campaignTravel
      ? this.requestScrapCampaignTravel(portal)
      : this.beginPortalTransition(portal);
  }

  getStoryInteractionContext() {
    const mapSnapshot = this.mapRuntime.getResolvedSnapshot();
    return Object.freeze({
      entities: mapSnapshot.entities,
      playerPosition: Object.freeze({ ...this.position }),
      transcripts: resolveFirstJourneyConversationTranscripts(
        this.progressionSnapshot.viewedConversationIds,
      ),
    });
  }

  resolveScrapCampaignStoryInteraction(conversationId) {
    const interaction = this.mapRuntime
      .getResolvedSnapshot()
      .entities.find((entity) => entity.conversationId === conversationId);
    if (!interaction?.campaignRegionId || !interaction.campaignStageKind) return null;
    const action = interaction.completeCampaignRegion
      ? this.createScrapCampaignRegionSuccessAction(interaction.campaignRegionId)
      : this.createScrapCampaignRegionStageAction(
          interaction.campaignRegionId,
          interaction.campaignStageKind,
        );
    const transaction = this.commitScrapCampaignDomainAction(action);
    if (interaction.requestCampaignEventStart) {
      this.requestScrapCampaignRegionEventStart(interaction.campaignRegionId);
    }
    return transaction;
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
    let journeyTransition;
    let regionExpansionTransition;
    let travelTransaction;
    let campaignTransaction = Object.freeze({ changed: false });
    try {
      this.replaceRoomScene(this.mapRuntime.getResolvedSnapshot());
      this.position = { ...completion.position };
      this.cameraPosition = { ...presentation.destinationCameraPosition };
      this.storyInteractionOwner.reset();
      journeyTransition = this.journeyProgress.recordPortal(completion.portalId);
      regionExpansionTransition = this.regionExpansionProgress.recordPortal(completion.portalId);
      const travelAction = this.worldTimeProfile.getTravelAction(completion.travelSegmentId);
      travelTransaction = this.applyWorldAction(
        `travel:${completion.travelSegmentId ?? completion.portalId}`,
        travelAction,
        { repeatable: true },
      );
      if (presentation.campaignAction) {
        campaignTransaction = commitScrapCampaignAction(
          this.progressionSnapshot.scrapCampaign,
          presentation.campaignAction,
          this.scrapCampaignProfile,
        );
        if (campaignTransaction.changed) {
          this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
            scrapCampaign: campaignTransaction.snapshot,
          });
          this.progressionNotice = `${campaignTransaction.preview.label} · ${campaignTransaction.preview.after.phaseLabel} · ${campaignTransaction.preview.after.deadlineLabel}`;
        }
      }
    } catch (error) {
      this.recoverPortalTransition(presentation, error);
      return true;
    }
    this.portalTransitionPresentation = null;
    if (
      journeyTransition.changed ||
      regionExpansionTransition.changed ||
      travelTransaction.changed ||
      campaignTransaction.changed
    ) {
      this.syncJourneyWorldContext();
      if (campaignTransaction.changed) this.syncScrapAwakeningWorldContext();
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
    const awakening = this.getScrapAwakeningReadModel();
    const desiredX =
      this.isScrapAwakeningLocation() && awakening.awakeningActive
        ? this.scrapAwakeningProfile.focusX
        : this.isScrapAwakeningLocation() && awakening.garageRevealActive
          ? this.scrapAwakeningProfile.garageFocusX
          : this.position.x;
    const targetX = Math.max(minimumX, Math.min(maximumX, desiredX));
    const targetY = bounds.y + 270;
    const followAmount = 1 - Math.exp(-10 * deltaSeconds);
    this.cameraPosition.x = lerp(this.cameraPosition.x, targetX, followAmount);
    this.cameraPosition.y = lerp(this.cameraPosition.y, targetY, followAmount);
  }

  canManageProgression() {
    const location = this.mapRuntime.getActiveLocation();
    return (
      isAcademyRoom(location.roomId) &&
      !this.mapRuntime.getTransition() &&
      this.combatCommands.snapshot().id === 'idle'
    );
  }

  reconcileEnchantMaterials() {
    const journey = this.journeyProgress.snapshot();
    const region = this.regionExpansionProgress.snapshot();
    let snapshot = this.progressionSnapshot;
    for (const profile of this.enchantmentCatalog.profiles) {
      const sourceReady =
        (profile.sourceId === 'field-guardian-defeated' && journey.fieldGuardianDefeated) ||
        (profile.sourceId === 'dungeon-guardian-defeated' && journey.dungeonGuardianDefeated) ||
        (profile.sourceId === 'boss-reward-claimed' && journey.bossRewardClaimed) ||
        (profile.sourceId === 'glasswind-reward-claimed' && region.bossRewardClaimed);
      if (sourceReady) {
        const material = awardEnchantMaterial(
          snapshot.enchantment,
          profile,
          this.enchantmentCatalog,
          snapshot.ownedEquipmentIds,
        );
        if (material.changed)
          snapshot = mergeProgressionSnapshot(snapshot, { enchantment: material.enchantment });
      }
    }
    if (snapshot !== this.progressionSnapshot) this.progressionSnapshot = snapshot;
    return snapshot;
  }

  reconcileWeaponForgeMaterial() {
    const forgeProfile = this.combatProgressionProfile.weaponForge;
    const journey = this.journeyProgress.snapshot();
    const sourceReady =
      forgeProfile.sourceId === 'first-journey-boss-reward' && journey.bossRewardClaimed;
    if (!sourceReady) return this.progressionSnapshot;
    const transaction = awardWeaponForgeMaterial(this.progressionSnapshot, {
      sourceId: forgeProfile.sourceId,
      materialId: forgeProfile.materialId,
      quantity: forgeProfile.sourceQuantity,
    });
    if (transaction.changed) this.progressionSnapshot = transaction.snapshot;
    return this.progressionSnapshot;
  }

  resolveDialogueStatus() {
    const dialogue = this.storyInteractionOwner.snapshot(this.getStoryInteractionContext());
    if (!dialogue.active || dialogue.commands.length === 0) return dialogue;
    const progression = this.progressionSnapshot;
    const record = progression.enchantment.swordEnchantments[progression.equippedEquipmentId];
    const availableGold = getAvailableGold(progression);
    const forgeProfile = this.combatProgressionProfile.weaponForge;
    const selectedArchetypeId =
      progression.weaponForge.selectedProfileIdsByGroup[forgeProfile.choiceGroupId] ?? null;
    const forgeMaterialQuantity =
      progression.weaponForge.materialQuantities[forgeProfile.materialId] ?? 0;
    const hasForgeCommands = dialogue.commands.some(
      (command) => command.type === 'forge-weapon-archetype',
    );
    const forgeDecisionReady =
      hasForgeCommands &&
      selectedArchetypeId === null &&
      forgeMaterialQuantity >= forgeProfile.materialCost;
    const visibleCommands = !hasForgeCommands
      ? dialogue.commands
      : forgeDecisionReady
        ? dialogue.commands.filter((command) => command.type === 'forge-weapon-archetype')
        : dialogue.commands.filter(
            (command) =>
              command.type !== 'forge-weapon-archetype' ||
              command.profileId === selectedArchetypeId,
          );
    const commands = visibleCommands.map((command) => {
      if (command.type === 'upgrade-sword-enchantment') {
        const profile = this.enchantmentCatalog.getProfile(command.enchantId);
        const active = record.elementId === profile.id;
        const lockedToOtherElement = record.elementId !== null && !active;
        const targetLevel = record.level + 1;
        const materialCost = ENCHANTMENT_MATERIAL_COSTS[targetLevel] ?? null;
        const goldCost = profile.goldCosts[targetLevel - 1] ?? null;
        const materialQuantity = progression.enchantment.materialQuantities[profile.materialId];
        const hasMaterial = materialCost !== null && materialQuantity >= materialCost;
        const maxLevel = record.level >= 5;
        return Object.freeze({
          id: command.id,
          type: command.type,
          enchantId: profile.id,
          label: profile.label,
          materialLabel: profile.materialLabel,
          swordId: progression.equippedEquipmentId,
          level: active ? record.level : 0,
          targetLevel,
          materialQuantity,
          materialCost,
          goldCost,
          active,
          hasMaterial,
          canChoose: !lockedToOtherElement && !maxLevel && hasMaterial && availableGold >= goldCost,
          actionLabel: lockedToOtherElement
            ? '다른 속성 적용됨'
            : maxLevel
              ? 'Lv.5 최고'
              : `Lv.${targetLevel} · ${materialCost}개 + ${goldCost} Gold`,
        });
      }
      if (command.type === 'manage-sword') {
        const profile = this.equipmentCatalog.getProfile(command.profileId);
        const owned = progression.ownedEquipmentIds.includes(profile.id);
        const active = progression.equippedEquipmentId === profile.id;
        const affordable =
          progression.trainingMarks >= profile.trainingMarkRequirement &&
          availableGold >= profile.goldCost;
        return Object.freeze({
          id: command.id,
          type: command.type,
          profileId: profile.id,
          label: profile.label,
          description: profile.description,
          goldCost: profile.goldCost,
          trainingMarkRequirement: profile.trainingMarkRequirement,
          owned,
          active,
          canChoose: !active && (owned || affordable),
          actionLabel: active
            ? '장착 중'
            : owned
              ? '장착'
              : profile.trainingMarkRequirement > 0
                ? `${profile.goldCost} Gold · 인장 ${profile.trainingMarkRequirement}`
                : `${profile.goldCost} Gold`,
        });
      }
      if (command.type === 'forge-weapon-archetype') {
        const profile = this.equipmentCatalog.getProfile(command.profileId);
        const selected = selectedArchetypeId === profile.id;
        const choiceComplete = selectedArchetypeId !== null;
        const active = progression.equippedEquipmentId === profile.id;
        return Object.freeze({
          id: command.id,
          type: command.type,
          profileId: profile.id,
          label: profile.label,
          description: profile.description,
          materialId: forgeProfile.materialId,
          materialLabel: forgeProfile.materialLabel,
          materialQuantity: forgeMaterialQuantity,
          materialCost: forgeProfile.materialCost,
          active,
          selected,
          canChoose:
            (selected && !active) ||
            (!choiceComplete && forgeMaterialQuantity >= forgeProfile.materialCost),
          actionLabel: selected
            ? active
              ? '제작 선택 · 장착 중'
              : '제작 선택 · 장착'
            : choiceComplete
              ? '다른 archetype 선택 완료'
              : forgeMaterialQuantity >= forgeProfile.materialCost
                ? `${forgeProfile.materialLabel} ${forgeProfile.materialCost}개`
                : `${forgeProfile.materialLabel} 필요`,
        });
      }
      if (command.type === 'replay-transcript') {
        return Object.freeze({
          ...command,
          canChoose: this.canManageProgression(),
          active: false,
        });
      }
      return Object.freeze({ ...command, canChoose: false, active: false });
    });
    return Object.freeze({ ...dialogue, commands: Object.freeze(commands) });
  }

  executeDialogueCommand(interactionId, commandId) {
    const command = this.storyInteractionOwner.authorizeCommand(
      this.getStoryInteractionContext(),
      interactionId,
      commandId,
    );
    if (!command || !this.canManageProgression()) {
      return this.unavailableProgressionTransaction();
    }
    if (command.type === 'replay-transcript') {
      const transcript = this.storyInteractionOwner.startTranscript(
        this.getStoryInteractionContext(),
        interactionId,
        command.transcriptId,
      );
      if (!transcript) return this.unavailableProgressionTransaction();
      this.progressionNotice = `지난 핵심 대화 재생 · ${transcript.title}`;
      this.statusNode.publish({ force: true });
      return Object.freeze({ changed: false, reason: 'replay-started', transcript });
    }
    if (command.type === 'manage-sword') {
      return this.manageMerchantSword(command.profileId);
    }
    if (command.type === 'forge-weapon-archetype') {
      return this.forgeMerchantWeaponArchetype(command.profileId);
    }
    if (command.type !== 'upgrade-sword-enchantment') {
      return this.unavailableProgressionTransaction();
    }
    const transaction = upgradeProgressionSwordEnchantment(
      this.progressionSnapshot,
      {
        swordId: this.progressionSnapshot.equippedEquipmentId,
        elementId: command.enchantId,
      },
      this.enchantmentCatalog,
    );
    const profile = this.enchantmentCatalog.profiles.find(
      (candidate) => candidate.id === command.enchantId,
    );
    this.progressionNotice = transaction.changed
      ? `${profile.label} ${this.equipmentProfile.shortLabel} 인챈트 Lv.${transaction.targetLevel}`
      : transaction.reason === 'insufficient-material'
        ? `${profile?.materialLabel ?? '인챈트 재료'}이 부족합니다.`
        : transaction.reason === 'insufficient-gold'
          ? `인챈트 Gold가 부족합니다.`
          : transaction.reason === 'max-level'
            ? `${profile?.label ?? '검'} 인챈트가 이미 최고 단계입니다.`
            : '이 검에는 해당 속성을 적용할 수 없습니다.';
    if (!transaction.changed) {
      this.statusNode.publish({ force: true });
      return transaction;
    }
    return this.commitProgression(transaction);
  }

  manageMerchantSword(profileId) {
    let profile;
    try {
      profile = this.equipmentCatalog.getProfile(profileId);
    } catch {
      return this.unavailableProgressionTransaction();
    }
    const owned = this.progressionSnapshot.ownedEquipmentIds.includes(profile.id);
    if (owned) {
      const transaction = selectProgressionEquipment(this.progressionSnapshot, profile.id);
      this.progressionNotice = transaction.changed
        ? `${profile.shortLabel} 장착 · frame/거리/경직 profile 변경`
        : '이미 장착 중인 검입니다.';
      if (!transaction.changed) {
        this.statusNode.publish({ force: true });
        return transaction;
      }
      return this.commitProgression(transaction, { equipmentChanged: true });
    }

    const purchase = purchaseProgressionEquipment(this.progressionSnapshot, {
      profileId: profile.id,
      goldCost: profile.goldCost,
      trainingMarkRequirement: profile.trainingMarkRequirement,
    });
    if (!purchase.changed) {
      this.progressionNotice =
        purchase.reason === PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_TRAINING
          ? `${profile.shortLabel} 구매에 훈련 인장 ${profile.trainingMarkRequirement}개가 필요합니다.`
          : purchase.reason === PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_GOLD
            ? `${profile.shortLabel} 구매에 원정 Gold ${profile.goldCost}가 필요합니다.`
            : '이미 소유한 검입니다.';
      this.statusNode.publish({ force: true });
      return purchase;
    }
    const equip = selectProgressionEquipment(purchase.snapshot, profile.id);
    const transaction = Object.freeze({
      changed: true,
      reason: PROGRESSION_TRANSACTION_REASON.PURCHASED,
      snapshot: equip.snapshot,
    });
    this.progressionNotice = `${profile.shortLabel} 구매·장착 완료 · 인챈트 없음`;
    return this.commitProgression(transaction, { equipmentChanged: true });
  }

  forgeMerchantWeaponArchetype(profileId) {
    const forgeProfile = this.combatProgressionProfile.weaponForge;
    if (!forgeProfile.optionProfileIds.includes(profileId)) {
      return this.unavailableProgressionTransaction();
    }
    let profile;
    try {
      profile = this.equipmentCatalog.getProfile(profileId);
    } catch {
      return this.unavailableProgressionTransaction();
    }
    const selectedProfileId =
      this.progressionSnapshot.weaponForge.selectedProfileIdsByGroup[forgeProfile.choiceGroupId] ??
      null;
    if (
      selectedProfileId === profile.id &&
      this.progressionSnapshot.ownedEquipmentIds.includes(profile.id)
    ) {
      const equip = selectProgressionEquipment(this.progressionSnapshot, profile.id);
      this.progressionNotice = equip.changed
        ? `${profile.shortLabel} 장착 · archetype combat profile 복원`
        : '이미 장착 중인 archetype입니다.';
      if (!equip.changed) {
        this.statusNode.publish({ force: true });
        return equip;
      }
      return this.commitProgression(equip, { equipmentChanged: true });
    }
    const transaction = forgeProgressionWeaponArchetype(this.progressionSnapshot, {
      choiceGroupId: forgeProfile.choiceGroupId,
      profileId: profile.id,
      optionProfileIds: forgeProfile.optionProfileIds,
      materialId: forgeProfile.materialId,
      materialCost: forgeProfile.materialCost,
    });
    this.progressionNotice = transaction.changed
      ? `${profile.shortLabel} 제작·장착 완료 · ${forgeProfile.materialLabel} 소비 · 인챈트 없음`
      : transaction.reason === PROGRESSION_TRANSACTION_REASON.ALREADY_CHOSEN
        ? '첫 archetype 제작 선택은 이미 완료되었습니다.'
        : transaction.reason === PROGRESSION_TRANSACTION_REASON.INSUFFICIENT_MATERIAL
          ? `${forgeProfile.materialLabel}이 필요합니다.`
          : '이 archetype은 제작할 수 없습니다.';
    if (!transaction.changed) {
      this.statusNode.publish({ force: true });
      return transaction;
    }
    return this.commitProgression(transaction, { equipmentChanged: true });
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
    this.roomSceneNode?.setEnchantmentContext(this.getEnchantContext());
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
      activeRoomScene.setEnchantmentContext(this.getEnchantContext());
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
      enchantmentContext: this.getEnchantContext(),
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
    if (result.campaignProgress) {
      const action = this.createScrapCampaignRegionStageAction(
        result.campaignProgress.regionId,
        result.campaignProgress.stageKind,
      );
      const transaction = this.commitScrapCampaignDomainAction(action);
      return Object.freeze({
        ...transaction,
        kind: 'scrap-campaign-region-stage',
        regionId: result.campaignProgress.regionId,
        stageKind: result.campaignProgress.stageKind,
      });
    }
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
    if (result.materialReward) {
      const transaction = awardEnemyEnchantMaterial(
        this.progressionSnapshot,
        result.materialReward,
        this.enchantmentCatalog,
      );
      this.progressionSnapshot = transaction.snapshot;
      this.roomSceneNode?.setEnchantmentContext(this.getEnchantContext());
      this.applyWorldAction(
        'event:material-echo-defeated',
        this.worldTimeProfile.getCoreEventAction('material-echo-defeated'),
        { repeatable: true },
      );
      this.progressionNotice = `${transaction.materialLabel} 확정 +${transaction.quantity} · 보유 ${transaction.totalQuantity}`;
      this.emitDurableProgressionChanged();
      this.statusNode.publish({ force: true });
      return Object.freeze({
        ...transaction,
        kind: 'material-echo-defeated',
        profileId: result.profileId,
        entityId: result.entityId,
        snapshot: this.progressionSnapshot,
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
    this.reconcileEnchantMaterials();
    this.reconcileWeaponForgeMaterial();
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
        this.reconcileEnchantMaterials();
        this.reconcileWeaponForgeMaterial();
        this.emitDurableProgressionChanged();
        this.statusNode.publish({ force: true });
      }

      if (trigger.kind === 'dungeon-signature-stage') {
        const result = this.journeyProgress.recordDungeonSignatureStage(trigger.stageId);
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
        this.reconcileEnchantMaterials();
        this.reconcileWeaponForgeMaterial();
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
    this.advanceScrapAwakeningRuntime(deltaSeconds);
    this.advanceScrapGarageRevealRuntime(deltaSeconds);
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
      this.playerHealth === 0 ||
      this.getScrapAwakeningReadModel().awakeningActive ||
      this.getScrapAwakeningReadModel().garageRevealActive;
    const preUpdateCombatState = this.combatCommands.snapshot();
    const counterInputLocked =
      preUpdateCombatState.justGuardCounterReady || preUpdateCombatState.id === 'shieldBash';
    const navigationLocked = controlsLocked || counterInputLocked;
    const rawJumpPressed = Boolean(inputSnapshot.jump);
    const rawGuardPressed = Boolean(inputSnapshot.guard);
    let horizontal = navigationLocked
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
    const awakeningConsumed = jumpIssued ? this.tryStartScrapAwakening() : false;
    if (awakeningConsumed) horizontal = 0;
    const dialogueResult =
      jumpIssued && !awakeningConsumed
        ? this.storyInteractionOwner.handleJump(this.getStoryInteractionContext())
        : null;
    if (dialogueResult?.conversationId) {
      if (dialogueResult.conversationId === this.scrapAwakeningProfile.ownerConversationId) {
        this.tryStartScrapGarageReveal();
      }
      this.resolveScrapCampaignStoryInteraction(dialogueResult.conversationId);
      const transcript = resolveFirstJourneyConversationTranscripts([
        dialogueResult.conversationId,
      ])[0];
      if (transcript) {
        const viewed = recordViewedConversation(
          this.progressionSnapshot,
          dialogueResult.conversationId,
        );
        if (viewed.changed) {
          this.progressionNotice = `핵심 대화 기록됨 · ${transcript.title}`;
          this.commitProgression(viewed);
        }
      }
    }
    const dialogueConsumed = dialogueResult?.consumed === true;
    const wallMapConsumed =
      jumpIssued && !awakeningConsumed && !dialogueConsumed
        ? this.tryRequestOperationMapFromWorld()
        : false;
    const portalStarted =
      jumpIssued &&
      !awakeningConsumed &&
      !dialogueConsumed &&
      !wallMapConsumed &&
      this.tryPortalTransition();
    if (this.mapRuntime.getTransition() === null && guardEdge) this.tryStartRoll(horizontal);
    const isTransitioning = this.mapRuntime.getTransition() !== null;
    const isRolling = this.rollState !== null;
    const currentCombatState = this.combatCommands.snapshot();
    if (
      !isTransitioning &&
      !isRolling &&
      !portalStarted &&
      !awakeningConsumed &&
      !dialogueConsumed &&
      !wallMapConsumed &&
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
      acceptCommands:
        !isTransitioning && !isRolling && !controlsLocked && !awakeningConsumed && !wallMapConsumed,
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
    this.airComboFloatSeconds = Math.max(0, this.airComboFloatSeconds - deltaSeconds);
    const playerGravityMultiplier =
      this.airComboFloatSeconds > 0 ? 0.08 : this.airComboGravityScale;
    if (this.isGrounded) {
      const support = this.mapRuntime.resolveSupportAt(this.position.x, {
        footY: this.position.y + CHARACTER_FOOT_OFFSET,
      });
      if (support) {
        this.position.y = support.y - CHARACTER_FOOT_OFFSET;
      } else {
        this.isGrounded = false;
      }
    }
    if (this.isGrounded) {
      this.verticalVelocity = 0;
    }
    const previousFootY = this.position.y + CHARACTER_FOOT_OFFSET;
    this.verticalVelocity += GRAVITY * playerGravityMultiplier * deltaSeconds;
    this.position.y += this.verticalVelocity * deltaSeconds;
    const nextFootY = this.position.y + CHARACTER_FOOT_OFFSET;
    const landing = this.mapRuntime.resolveLandingAt(this.position.x, {
      previousFootY,
      nextFootY,
      descending: this.verticalVelocity >= 0,
    });
    if (landing) {
      this.position.y = landing.y - CHARACTER_FOOT_OFFSET;
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
    } else {
      this.isGrounded = false;
    }

    const movementBounds = activeRoom.movementBounds ?? {
      minX: CHARACTER_BOUNDARY_HALF_WIDTH,
      maxX: this.mapRuntime.definition.worldSize.width - CHARACTER_BOUNDARY_HALF_WIDTH,
    };
    this.position.x = Math.max(movementBounds.minX, Math.min(movementBounds.maxX, this.position.x));
    this.updateCameraFollow(deltaSeconds);
    this.animationTime +=
      deltaSeconds * animationSpeed * (isRolling ? 1.8 : 1 + Math.abs(horizontal) * 0.65);
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
    const scrapCampaign = getScrapCampaignReadModel(
      progression.scrapCampaign,
      this.scrapCampaignProfile,
    );
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
      this.combatProgressionProfile.merchantProfileIds.every((profileId) =>
        progression.ownedEquipmentIds.includes(profileId),
      ) &&
      Boolean(
        progression.weaponForge.selectedProfileIdsByGroup[
          this.combatProgressionProfile.weaponForge.choiceGroupId
        ],
      );
    const characterBoardActive = Boolean(room.characterBoardManifest);
    const scrapAwakeningLocation =
      map.id === this.scrapAwakeningProfile.mapId && roomId === this.scrapAwakeningProfile.roomId;
    const scrapCampaignRegion = this.scrapCampaignProfile.getRegion(
      scrapCampaign.currentLocationId,
    );
    const scrapCampaignRegionReadModel = scrapCampaign.regions.find(
      (region) => region.id === scrapCampaignRegion?.id,
    );
    const scrapCampaignRegionLocation = Boolean(
      scrapCampaignRegion && location.regionId === scrapCampaignRegion.id,
    );
    const scrapIntroPresentation =
      scrapCampaign.garageRevealComplete && scrapCampaign.collectedPartCount > 0
        ? Object.freeze({
            title: `차고 조립 갱신 · 로봇 ${scrapCampaign.completionPercent}%`,
            briefing: `${scrapCampaign.collectedPartCount}/${scrapCampaign.totalPartCount} 부품이 원래 산업기계 형태를 유지한 채 조립식 로봇에 장착됐습니다.`,
            objective: '벽 지도에서 다음 지역과 고철 대왕의 현재 진로를 확인하세요.',
            cue: `5 REGIONS · ${scrapCampaign.collectedPartCount}/${scrapCampaign.totalPartCount} PARTS · ROBOT ${scrapCampaign.completionPercent}%`,
          })
        : scrapCampaign.awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE
          ? scrapCampaign.garageReveal
          : scrapCampaign.awakening;
    const scrapRegionObjective = (() => {
      if (!scrapCampaignRegionReadModel) return '';
      if (scrapCampaignRegionReadModel.status === 'resolved') {
        return (
          scrapCampaignRegion.objectives.resolved ??
          `${scrapCampaignRegion.part.label} 수송이 끝났습니다. 실제 연결로로 고물상에 돌아가 차고와 작전 지도를 확인하세요.`
        );
      }
      if (
        scrapCampaignRegionReadModel.status === 'available' &&
        scrapCampaignRegionReadModel.eventStageKind === 'facility-observed'
      ) {
        return (
          scrapCampaignRegion.objectives.eventStart ??
          `핵심 사건을 확정해 ${scrapCampaignRegionReadModel.eventSegments}구간 작업을 시작하세요.`
        );
      }
      if (!scrapCampaignRegionReadModel.eventStageKind) {
        return (
          scrapCampaignRegion.objectives.arrival ??
          `${scrapCampaignRegion.label} 현장 책임자에게 시설 상황을 들으세요.`
        );
      }
      const activeStage = scrapCampaignRegion.eventStages.find(
        (stage) => stage.kind === scrapCampaignRegionReadModel.eventStageKind,
      );
      return (
        activeStage?.nextObjective ?? `${scrapCampaignRegion.label}의 다음 현장 단계를 확인하세요.`
      );
    })();
    const story = scrapAwakeningLocation
      ? Object.freeze({
          beatId:
            scrapCampaign.awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE
              ? `scrap-garage-reveal:${scrapCampaign.garageRevealStageId}`
              : `scrap-awakening:${scrapCampaign.awakeningStageId}`,
          title: scrapIntroPresentation.title,
          briefing: scrapIntroPresentation.briefing,
          nextObjective: scrapIntroPresentation.objective,
        })
      : scrapCampaignRegionLocation
        ? Object.freeze({
            beatId: `scrap-region:${scrapCampaignRegion.id}:${scrapCampaignRegionReadModel.eventStageKind ?? 'roadhead'}`,
            title:
              scrapCampaignRegionReadModel.status === 'resolved'
                ? `${scrapCampaignRegion.label} 해결 · ${scrapCampaignRegion.part.label}`
                : `${scrapCampaignRegion.label} · ${scrapCampaignRegionReadModel.eventStageLabel}`,
            briefing: `${scrapCampaignRegion.visual.material} 지대의 ${scrapCampaignRegion.machineLabel}. ${scrapCampaignRegionReadModel.statusLabel}`,
            nextObjective: scrapRegionObjective,
          })
        : characterBoardActive
          ? Object.freeze({
              beatId: 'scrap-character-readability',
              title: '고철 생활권 캐릭터 설계 비교',
              briefing:
                '정면·측면·대표 pose에서 직업 도구, 작업복과 공격 가동부를 실제 gameplay 크기로 비교합니다.',
            })
          : resolveFirstJourneyStory({
              equipment: {
                id: this.equipmentProfile.id,
                label: this.equipmentProfile.label,
                progressionComplete,
              },
              journey,
              regionExpansion,
              activeRoomId: roomId,
            });
    const dialogue = this.resolveDialogueStatus();
    const encounterMaterial = encounter?.materialReward
      ? this.enchantmentCatalog.getProfile(encounter.materialReward.elementId)
      : null;
    let objective = story.nextObjective;
    let encounterHint = '';

    if (roomId === 'training-room') {
      objective = encounterMaterial
        ? `${encounter.label}을 처치해 ${encounterMaterial.materialLabel}을 확정 획득하세요. 1초 뒤 다시 나타납니다.`
        : `훈련 골렘을 처치해 인장 +${this.combatProgressionProfile.trainingClearReward}. 귀환 후 같은 A/S command route를 성장시키세요.`;
      encounterHint = `${this.progressionNotice} · 현재 인장 ${progression.trainingMarks}`;
    }
    if (roomId === 'field-crossing') {
      if (!journey.fieldGuardianDefeated) {
        encounterHint = '일반 조우 보상: 수호 수액 · 최대 HP +20';
      }
    }
    if (roomId === 'field-canopy' && encounterMaterial) {
      encounterHint = `선택 우회 조우 · ${encounterMaterial.materialLabel} 확정 +${encounter.materialReward.quantity}`;
    }
    if (roomId === 'sealed-forest-dungeon') {
      if (!journey.dungeonGuardianDefeated) {
        objective = '붉은 봉인을 붙든 회랑 수호자를 쓰러뜨려 청록 기록석의 공명을 깨우세요.';
        encounterHint = '봉인 공명 1/4 · 입구 소개 → guardian 전투';
      } else if (
        !journey.dungeonSignatureStageIds.includes(
          FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.HIDDEN_BRANCH,
        )
      ) {
        encounterHint = '봉인 공명 2/4 · x680 숨은 분기는 선택 사항 · Boss 길은 유지';
      } else if (!journey.checkpointActivated) {
        encounterHint = '봉인 공명 3/4 · 숨은 잔향 활성 · Checkpoint를 확보하세요.';
      } else if (journey.returnedWithReward) {
        objective =
          '정리된 봉인 회랑의 열린 필수 경로로 이동하거나 숨은 잔향실의 선택적 적을 상대하세요.';
        encounterHint = encounterMaterial
          ? `CLEARED REVISIT · 핵심 guardian 없음 · ${encounterMaterial.materialLabel} 확정 +${encounter.materialReward.quantity}`
          : 'CLEARED REVISIT · 핵심 guardian 없음 · 숨은 분기와 Boss 문 유지';
      } else {
        encounterHint = '봉인 공명 3/4 · 오른쪽 Boss Portal에서 마지막 시험';
      }
    }
    if (roomId === 'sealed-resonance-vault') {
      encounterHint = encounterMaterial
        ? `선택 숨은 조우 · ${encounterMaterial.materialLabel} 확정 +${encounter.materialReward.quantity}`
        : journey.dungeonSignatureStageIds.includes(
              FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.HIDDEN_BRANCH,
            )
          ? '봉인 공명 3/4 · 숨은 분기 적용 완료'
          : '봉인 공명 2/4 · 붉은 기록석에 접근';
    }
    if (roomId === 'sealed-forest-boss') {
      if (journey.bossRewardClaimed) {
        objective = '보상 획득 완료. 오른쪽 황금 shortcut Portal에서 ↑로 귀환하세요.';
        encounterHint = '+120 Gold · 학원촌 shortcut 해금';
      } else if (journey.bossDefeated) {
        objective = 'Boss가 남긴 황금 결정에 접근해 보상을 회수하세요.';
        encounterHint = '보상 결정이 shortcut Portal을 활성화합니다.';
      } else if (encounter?.weakPoint?.exposed) {
        objective = `${encounter.weakPoint.label}이 노출되었습니다. 정면에서도 지금 공격하세요.`;
        encounterHint = `WEAK POINT · ${encounter.weakPoint.damageMultiplier.toFixed(1)}× DAMAGE`;
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
        encounterHint = journey.dungeonSignatureStageIds.includes(
          FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.HIDDEN_BRANCH,
        )
          ? '봉인 공명 4/4 · 청록 잔향과 GUARD · ROLL · PUNISH'
          : '봉인 공명 Boss 시험 · GUARD · ROLL · PUNISH';
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
        objective = encounterMaterial
          ? '프리즘 회수 완료. 잔향 사냥꾼과 싸우거나 오른쪽 shortcut으로 귀환하세요.'
          : '프리즘 회수 완료. 오른쪽 황금 shortcut Portal에서 ↑로 학원촌에 귀환하세요.';
        encounterHint = encounterMaterial
          ? `선택 Boss arena 조우 · ${encounterMaterial.materialLabel} 확정 +${encounter.materialReward.quantity}`
          : '+180 Gold · 학원촌 영구 shortcut 해금';
      } else if (regionExpansion.bossDefeated) {
        objective = '폭풍 유리핵이 남긴 황금 프리즘에 접근해 보상과 shortcut을 여세요.';
        encounterHint = '보상 프리즘이 귀환 Portal을 영구 활성화합니다.';
      } else if (encounter?.weakPoint?.exposed) {
        objective = `${encounter.weakPoint.label}이 노출되었습니다. 정면에서도 회복 전에 공격하세요.`;
        encounterHint = `WEAK POINT · ${encounter.weakPoint.damageMultiplier.toFixed(1)}× DAMAGE`;
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
    if (isAcademyRoom(roomId) && journey.returnedWithReward) {
      encounterHint = regionExpansion.returnedWithReward
        ? encounterHint
        : progressionComplete
          ? 'M4 COMPLETE · 새 Sweep Jump 전투 준비'
          : '';
    }
    if (isAcademyRoom(roomId) && regionExpansion.returnedWithReward) {
      encounterHint = 'M5 REGION COMPLETE · Sweep Jump 해법과 shortcut 유지';
    }
    if (characterBoardActive) {
      objective = '각 열의 정면·측면·대표 pose에서 복장과 공구 silhouette를 비교하세요.';
      encounterHint = 'DESIGN COMPARISON · FRONT / SIDE / ACTION';
    }
    if (scrapAwakeningLocation) {
      objective = scrapIntroPresentation.objective;
      encounterHint = scrapIntroPresentation.cue;
    }
    if (scrapCampaignRegionLocation) {
      objective = story.nextObjective;
      if (encounter?.role === 'boss' && encounter.health > 0) {
        if (encounter.weakPoint?.exposed) {
          objective = `${encounter.weakPoint.label}이 노출되었습니다. 같은 검·방패 연계로 회복 전에 공격하세요.`;
        } else if (encounter.punishWindowOpen) {
          objective = `${encounter.label}의 자세가 무너졌습니다. 회복 전에 검 연계를 적중시키세요.`;
        } else if (encounter.attackKind === 'heavy' && encounter.aiState === 'windup') {
          objective = `${encounter.label}의 큰 가동부 공격은 막을 수 없습니다. 방향 구르기로 통과하세요.`;
        } else if (encounter.attackKind === 'light' && encounter.aiState === 'windup') {
          objective = `${encounter.label}의 짧은 기계 공격은 방패로 막고 방패 반격을 준비하세요.`;
        }
      }
      encounterHint = `${scrapCampaignRegionReadModel.statusLabel} · ${scrapCampaignRegion.event.label} · ${scrapCampaignRegionReadModel.eventSegments}구간 / 성공 D-DAY +${scrapCampaignRegionReadModel.extensionDays}일`;
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
      areaName:
        characterBoardActive || scrapCampaignRegionLocation
          ? room.label
          : `${map.name} · ${room.label}`,
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
            }${
              encounter.enchantStatus
                ? ` · ${this.enchantmentCatalog.getProfile(encounter.enchantStatus.id).label} 상태 ${encounter.enchantStatus.remainingSeconds.toFixed(1)}s`
                : ''
            }`
          : '',
      journeyLabel: characterBoardActive
        ? '고철 캐릭터 설계 비교'
        : scrapAwakeningLocation
          ? scrapCampaign.awakeningActive
            ? '고철 대왕 각성 연출'
            : scrapCampaign.garageRevealActive
              ? '고물상 분석 · 차고 개방'
              : scrapCampaign.garageRevealComplete
                ? scrapCampaign.collectedPartCount > 0
                  ? `차고 조립 갱신 · 로봇 ${scrapCampaign.completionPercent}%`
                  : '작전 준비 완료 · 로봇 0%'
                : scrapCampaign.deadlineRevealed
                  ? '각성 완료 · D-30 · 고물상 복귀'
                  : '첫 고철 수거 의뢰'
          : scrapCampaignRegionLocation
            ? `${scrapCampaignRegion.label} · ${scrapCampaignRegionReadModel.statusLabel}`
            : location.regionId === 'glasswind-region' ||
                (isAcademyRoom(roomId) && regionExpansion.phase !== 'prepare')
              ? (regionExpansionPhaseLabels[regionExpansion.phase] ?? regionExpansion.phase)
              : (phaseLabels[journey.phase] ?? journey.phase),
      wardLabel: scrapAwakeningLocation
        ? scrapCampaign.garageRevealComplete
          ? scrapCampaign.collectedPartCount > 0
            ? `${scrapCampaign.collectedPartCount}/${scrapCampaign.totalPartCount} 부품 · 로봇 ${scrapCampaign.completionPercent}%`
            : '제어장치 · 우리 로봇 두뇌 장착'
          : scrapCampaign.awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE
            ? '회수한 제어장치 · 고물상 분석 대기'
            : scrapCampaign.deadlineRevealed
              ? '회수한 제어장치 · 보유 중'
              : '제어장치 · 폐병기 흉곽 안'
        : scrapCampaignRegionLocation
          ? scrapCampaignRegionReadModel.collected
            ? `${scrapCampaignRegionReadModel.partLabel} · 차고 로봇 ${scrapCampaign.completionPercent}%`
            : `${scrapCampaignRegion.machineLabel} · ${scrapCampaignRegionReadModel.eventStageLabel}`
          : location.regionId === 'glasswind-region' ||
              (isAcademyRoom(roomId) && regionExpansion.phase !== 'prepare')
            ? regionExpansion.glasswindBridgeStable
              ? '유리바람 다리 · 안정'
              : '횡풍 장벽 · 활성'
            : journey.fieldWardActive
              ? '수호 수액 · HP +20'
              : journey.routeChoice === 'bypass'
                ? '우회 · 수액 없음'
                : '수호 수액 미획득',
      timePhase: worldTime.timePhase,
      timeLabel: `Day ${scrapCampaign.day} · ${scrapCampaign.phaseLabel}`,
      deadlineLabel: scrapCampaign.deadlineLabel,
      campaign: scrapCampaign,
      operationMapAvailable: !scrapAwakeningLocation || scrapCampaign.garageRevealComplete,
      characterBoard: room.characterBoardManifest
        ? Object.freeze({ active: true, ...room.characterBoardManifest })
        : Object.freeze({
            active: false,
            title: '',
            scaleLabel: '',
            views: Object.freeze([]),
            entries: Object.freeze([]),
          }),
      roomId,
      canManageProgression:
        !characterBoardActive && !scrapAwakeningLocation && this.canManageProgression(),
      activeEnchantId:
        progression.enchantment.swordEnchantments[progression.equippedEquipmentId].elementId,
      activeEnchantLevel:
        progression.enchantment.swordEnchantments[progression.equippedEquipmentId].level,
      activeEnchantLabel: (() => {
        const record = progression.enchantment.swordEnchantments[progression.equippedEquipmentId];
        return record.elementId
          ? `${this.enchantmentCatalog.getProfile(record.elementId).label} Lv.${record.level}`
          : '미활성';
      })(),
      equipmentId: this.equipmentProfile.id,
      equipmentLabel: this.equipmentProfile.label,
      weaponForge: Object.freeze({
        materialLabel: this.combatProgressionProfile.weaponForge.materialLabel,
        materialQuantity:
          progression.weaponForge.materialQuantities[
            this.combatProgressionProfile.weaponForge.materialId
          ] ?? 0,
        selectedProfileId:
          progression.weaponForge.selectedProfileIdsByGroup[
            this.combatProgressionProfile.weaponForge.choiceGroupId
          ] ?? null,
      }),
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
      activeEnchantLabel: (() => {
        const record =
          this.progressionSnapshot.enchantment.swordEnchantments[
            this.progressionSnapshot.equippedEquipmentId
          ];
        return record.elementId
          ? `${this.enchantmentCatalog.getProfile(record.elementId).label} Lv.${record.level}`
          : '인챈트 없음';
      })(),
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
        activeEnchant: this.getEnchantContext().active,
        appearanceProfile: this.playerPresentationProfile,
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
          resolveCharacterPresentationProfile(
            this.characterPresentationCatalog,
            encounterRender.presentationState.presentationProfileId,
            encounterRender.presentationState.label,
          ),
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
    const playerItems = activeRoom.presentationOnly ? [] : characterItems;
    const items = Object.freeze(
      [...mapSnapshot.renderItems, ...encounterItems, ...playerItems, ...combatEffectItems]
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
        presentationProfileId: this.playerPresentationProfile.id,
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
