import { FieldQuestRuntime } from './quests/FieldQuestRuntime.js';
import { createQuestReadModel } from './quests/QuestReadModel.js';
import {
  createQuestEpilogueReadModel,
  applyQuestNpcOutcomes,
} from './quests/QuestWorldProfiles.js';
import { AcquisitionFeedback, acquisitionChanges } from './presentation/AcquisitionFeedback.js';
import { MATERIAL_PROFILES, getMaterialLedger } from './progression/MaterialLedger.js';
import { upgradeEquipment } from './progression/EquipmentUpgrade.js';
import { applyCampaignTimePresentation } from './presentation/CampaignTimePresentation.js';
import { applyEquipmentPresentation } from '../graphics/EquipmentPresentation.js';
import { sampleAnimationProfile } from '../animation/AnimationProfileSampler.js';
import { createEquipmentViewModel } from './EquipmentReadModel.js';
import { resolveEquipmentLoadout } from './equipment/EquipmentLoadout.js';
import { evaluateEquipmentFieldCapability } from './equipment/EquipmentFieldCapabilities.js';
import {
  defineAuthoredPoseTrack,
  sampleAuthoredPoseTrack,
} from '../animation/AuthoredPoseTrack.js';
import {
  createSvgCharacterBinding,
  sampleSvgCharacterPresentation,
} from '../graphics/SvgCharacterPresentation.js';
import { sampleRootMotionDelta, defineRootMotionCurve } from '../animation/RootMotionCurve.js';
import { DEFAULT_ROLL_ROOT_CURVE } from '../animation/DefaultRootCurves.js';
import { defineCharacterBodyProfile } from '../animation/RigFamily.js';
import {
  combatMotionFrameData,
  CombatCommandController,
} from '../combat/CombatCommandController.js';
import { CombatCameraFeedback } from '../combat/CombatCameraFeedback.js';
import { COMBAT_EVENT_TYPE, CombatEventBuffer } from '../combat/CombatEvent.js';
import { combatFramesToSeconds } from '../combat/CombatFrame.js';
import { isAttackContactFrame } from '../combat/CombatMotionTimingProfiles.js';
import {
  PLAYER_CHARACTER_FOOT_OFFSET,
  PLAYER_COMBAT_GEOMETRY_SCALE,
  createSweptWeaponGeometry,
  samplePlayerCombatGeometry as sampleSharedPlayerCombatGeometry,
} from '../combat/SharedCombatGeometry.js';
import { samplePlayerMotionPose } from '../animation/PlayerMotionPose.js';
import {
  PLAYER_MOTION_PROFILE,
  advancePlayerAnimationTime,
  integratePlayerVerticalVelocity,
  playerBlockReactionTiming,
} from '../animation/PlayerMotionProfile.js';
import { ATTACK_SPATIAL_PROFILES, sizeAttackMotionPose } from '../combat/AttackSpatialProfiles.js';
import { rollTimelineMarkerAt } from '../animation/RollTimeline.js';
import { SceneNode } from '../core/SceneNode.js';
import { Signal } from '../core/Signal.js';
import { INPUT_ACTIONS } from '../input/InputAction.js';
import { GameStatusNode } from './GameStatusNode.js';
import { createPlayerCombatPresentation } from './PlayerCombatPresentation.js';
import { createRuntimeCastPresentation } from './character/CastCharacterPresentation.js';
import { createSceneArtDirectionReadModel } from './ScrapArtDirectionProfiles.js';
import { MapRuntime } from './map/MapRuntime.js';
import {
  PROGRESSION_TRANSACTION_REASON,
  assertProgressionSnapshot,
  awardCampaignEncounterReward,
  createProgressionSnapshot,
  getAvailableGold,
  forgeEquipmentArchetype as forgeProgressionEquipmentArchetype,
  mergeProgressionSnapshot,
  purchaseEquipment as purchaseProgressionEquipment,
  recordViewedConversation,
  selectEquipment as selectProgressionEquipment,
  unequipEquipment as unequipProgressionEquipment,
  trainCombatSkill as trainProgressionCombatSkill,
  upgradeEquipmentEnchantment as upgradeProgressionEquipmentEnchantment,
} from './progression/ProgressionState.js';
import {
  ENCHANTMENT_MATERIAL_COSTS,
  canonicalizeEnchantmentSnapshot,
} from './enchantment/EnchantmentState.js';
import { ROOM_SCENE } from './room/RoomNode.js';
import { resolveScrapPrologueConversationTranscripts } from './story/ScrapPrologueStory.js';
import { resolveScrapRegionConversationTranscripts } from './story/ScrapRegionStory.js';
import { StoryInteractionOwner } from './story/StoryInteractionOwner.js';
import {
  createTrainingEnemyItems,
  sampleTrainingEnemyCombatFrame,
} from './training/TrainingEncounterPresentation.js';
import {
  advanceScrapGarageReveal,
  advanceScrapAwakening,
  commitScrapCampaignAction,
  createScrapCampaignSnapshot,
  getScrapCampaignReadModel,
  previewScrapCampaignAction,
  SCRAP_CAMPAIGN_ACTION_KIND,
  startScrapGarageReveal,
  startScrapAwakening,
  toScrapCampaignSnapshot,
} from './campaign/ScrapCampaignState.js';
import { SCRAP_CAMPAIGN_REGION_STATUS } from './campaign/ScrapCampaignContract.js';
import {
  SCRAP_AWAKENING_STAGE,
  assertScrapAwakeningStageId,
  getScrapAwakeningPresentation,
} from './campaign/ScrapAwakeningState.js';
import { SCRAP_CAST } from './campaign/ScrapCastProfile.js';
import {
  SCRAP_GARAGE_REVEAL_STAGE,
  assertScrapGarageRevealStageId,
  getScrapGarageRevealPresentation,
} from './campaign/ScrapGarageRevealState.js';
import {
  SCRAP_GAME_OVER_STAGE,
  advanceScrapGameOverPresentation,
  createScrapGameOverPresentation,
  getScrapGameOverPresentation,
} from './campaign/ScrapGameOverPresentation.js';
import {
  SCRAP_FINAL_BATTLE_STAGE,
  assertScrapFinalBattleStageId,
} from './campaign/ScrapFinalBattleState.js';
import { createScrapFinalBattlePresentation } from './campaign/ScrapFinalBattlePresentation.js';
import {
  createScrapFinalBattleCombatState,
  getScrapFinalBattleCombatProfile,
  resolveScrapFinalBattleCombatContact,
} from './campaign/ScrapFinalBattleCombat.js';

const CHARACTER_SPEED = PLAYER_MOTION_PROFILE.movementSpeed;
const JUMP_SPEED = PLAYER_MOTION_PROFILE.jumpSpeed;
const ROLL_DURATION_SECONDS = combatFramesToSeconds(PLAYER_MOTION_PROFILE.rollFrames);
const ROLL_SPEED = PLAYER_MOTION_PROFILE.rollSpeed;
const LANDING_RECOVERY_SECONDS = combatFramesToSeconds(PLAYER_MOTION_PROFILE.landingFrames);
function resolveConversationTranscripts(viewedConversationIds) {
  return Object.freeze([
    ...resolveScrapPrologueConversationTranscripts(viewedConversationIds),
    ...resolveScrapRegionConversationTranscripts(viewedConversationIds),
  ]);
}

const PLAYER_KNOCKBACK_STOP_SPEED = 4;
const CHARACTER_RENDER_SCALE = PLAYER_COMBAT_GEOMETRY_SCALE;
const CHARACTER_CELL_SIZE = 48;
const CHARACTER_BOUNDARY_HALF_WIDTH = CHARACTER_CELL_SIZE / 2;
const CHARACTER_FOOT_OFFSET = PLAYER_CHARACTER_FOOT_OFFSET;
const PLAYER_BODY_HALF_WIDTH = 20;
const ROLL_SAFE_CLEARANCE = 4;

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothStep(amount) {
  const bounded = Math.max(0, Math.min(1, amount));
  return bounded * bounded * (3 - 2 * bounded);
}

function resolveEquipmentAttackProfile(motionId, motionFrame, resolvedLoadout, skillProfile) {
  if (motionId === 'shieldBash' && !resolvedLoadout.commandModifiers.guardCounterEnabled)
    return null;
  const baseProfile = resolvedLoadout.attackProfiles[motionId];
  if (!baseProfile || !motionFrame) return null;
  const baseMotionFrame = combatMotionFrameData(motionId);
  const startupShift = motionFrame.startupFrames - baseMotionFrame.startupFrames;
  const startFrame = motionFrame.startupFrames;
  const endFrame = motionFrame.startupFrames + motionFrame.activeFrames;
  const hitPulseCount = Math.max(1, skillProfile.spinHitCount);
  const hitPulseFrames = baseProfile.hitPulseFrames
    ?.slice(0, hitPulseCount)
    .map((frame) => frame + startupShift);
  return Object.freeze({
    ...baseProfile,
    damage:
      baseProfile.damage * resolvedLoadout.attackModifiers.damageScale * skillProfile.damageScale,
    range: ATTACK_SPATIAL_PROFILES[motionId].reach * resolvedLoadout.attackModifiers.rangeScale,
    hitstunScale: resolvedLoadout.attackModifiers.hitstunScale,
    guardCounterPostureScale: resolvedLoadout.commandModifiers.guardCounterPostureScale ?? 1,
    postureDamageScale:
      (resolvedLoadout.attackModifiers.postureDamageScale ?? 1) *
      (motionId === 'shieldBash'
        ? (resolvedLoadout.commandModifiers.guardCounterPostureScale ?? 1)
        : 1),
    backPunishDamageScale: resolvedLoadout.attackModifiers.backPunishDamageScale ?? 1,
    launchY: baseProfile.launchY * resolvedLoadout.attackModifiers.launchScale,
    ...(baseProfile.relaunchSpeed
      ? { relaunchSpeed: baseProfile.relaunchSpeed * resolvedLoadout.attackModifiers.launchScale }
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
    typeof catalog.defaultItemId !== 'string' ||
    !Array.isArray(catalog.items) ||
    typeof catalog.getItem !== 'function'
  ) {
    throw new TypeError('GameScene에는 authored equipment catalog 주입이 필요합니다.');
  }
  return catalog;
}

function assertCombatProgressionProfile(profile) {
  const equipmentForge = profile?.equipmentForge;
  if (
    !profile ||
    !Number.isInteger(profile.maxSkillLevel) ||
    typeof profile.getSkillLevelProfile !== 'function' ||
    typeof profile.getSkillUpgradeCost !== 'function' ||
    typeof profile.getSkillTrainingMarkRequirement !== 'function' ||
    !Array.isArray(profile.merchantItemIds) ||
    !equipmentForge ||
    typeof equipmentForge.choiceGroupId !== 'string' ||
    typeof equipmentForge.sourceId !== 'string' ||
    typeof equipmentForge.materialId !== 'string' ||
    !Number.isSafeInteger(equipmentForge.sourceQuantity) ||
    !Number.isSafeInteger(equipmentForge.materialCost) ||
    !Array.isArray(equipmentForge.optionItemIds)
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
    typeof profile.restEntityId !== 'string' ||
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
  const linkedIssues = campaign.issueWindow?.linked ?? [];
  const pendingLinked = linkedIssues.filter((issue) => !issue.completed);
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
    // Linked work is a field-combat detour, not a second core-event start.  Keep
    // the authored issue window as read-only world facts so map patches can open
    // exactly the required side route without taking ownership of campaign state.
    scrapPendingLinkedIssueRegionIds: Object.freeze(
      pendingLinked.map((issue) => issue.targetRegionId),
    ),
    // A linked field route must remain usable after its last encounter is cleared:
    // the player still needs its bidirectional exit to return to the active primary
    // issue.  This stays a read-only projection of the active issue window; map
    // patches do not own campaign completion or invent a separate route state.
    scrapLinkedIssueRegionIds: Object.freeze(linkedIssues.map((issue) => issue.targetRegionId)),
    scrapPendingLinkedEncounterIds: Object.freeze(
      pendingLinked.flatMap((issue) => (issue.completed ? [] : issue.remainingEncounterIds)),
    ),
  });
}

export class GameScene extends SceneNode {
  constructor({
    scenePresentationFactory = null,
    mapDefinition,
    equipmentCatalog,
    combatProgressionProfile,
    encounterFactory,
    encounterAttackProfiles,
    scrapCampaignProfile,
    scrapAwakeningProfile,
    characterPresentationCatalog,
    playerPresentationProfileId,
    artDirectionProfile = null,
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
    this.artDirectionProfile = artDirectionProfile;
    this.scenePresentation = scenePresentationFactory?.() ?? null;
    this.characterAnimationSettings = Object.freeze({});
    this.svgCharacterBinding = null;
    this.rootMotionCurves = Object.freeze({ roll: DEFAULT_ROLL_ROOT_CURVE });
    this.rootMotionDistances = Object.freeze({ roll: ROLL_SPEED * ROLL_DURATION_SECONDS });
    this.enchantmentCatalog = assertEnchantmentCatalog(enchantmentCatalog);
    const initialProgression =
      progressionSnapshot ??
      createProgressionSnapshot(
        this.equipmentCatalog.defaultItemId,
        this.enchantmentCatalog,
        this.scrapCampaignProfile,
      );
    this.progressionSnapshot = mergeProgressionSnapshot(initialProgression, {
      enchantment: canonicalizeEnchantmentSnapshot(
        initialProgression.enchantment,
        this.enchantmentCatalog,
        initialProgression.ownedEquipmentItemIds,
      ),
    });
    this.resolvedLoadout = resolveEquipmentLoadout(
      this.progressionSnapshot.loadout,
      this.equipmentCatalog,
    );
    const skillProfile = this.getCombatSkillProfile();
    this.combatCommands = new CombatCommandController({
      timingProfile: this.resolvedLoadout.combatTiming,
      moveset: this.resolvedLoadout.moveset,
      staminaProfile: this.resolvedLoadout.staminaProfile,
      commandProfile: skillProfile,
    });
    this.combatCameraFeedback = new CombatCameraFeedback();
    this.combatEvents = new CombatEventBuffer();
    this.storyInteractionOwner = new StoryInteractionOwner();
    this.scrapFinalBattleCombat = createScrapFinalBattleCombatState(
      this.progressionSnapshot.scrapCampaign.finalBattleStageId,
    );
    this.scrapFinalBattleOpeningSeconds = 0;
    const initialScrapCampaign = getScrapCampaignReadModel(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    this.mapRuntime = new MapRuntime(mapDefinition, {
      worldContext: {
        timePhase: initialScrapCampaign.phaseId === 'night' ? 'night' : 'day',
        weather: 'clear',
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
    this.fieldJournalRequested = this.ownSignal(new Signal('fieldJournalRequested'));
    this.acquisitionFeedback = new AcquisitionFeedback();
    this.fieldQuests = new FieldQuestRuntime(this);
    this.lastFeedbackSnapshot = this.progressionSnapshot;
    this.reset();
    const prepared = this.fieldQuests.prepare();
    this.progressionSnapshot = prepared.snapshot;
    this.lastFeedbackSnapshot = this.progressionSnapshot;
  }

  dispose() {
    try {
      return super.dispose();
    } finally {
      if (this.isDisposed) this.scenePresentation?.dispose();
    }
  }

  setCharacterAnimationSettings(settings = {}) {
    const bodyProfile = settings.bodyProfile
      ? defineCharacterBodyProfile(settings.bodyProfile)
      : undefined;
    const tracks = Object.freeze(
      Object.fromEntries(
        Object.entries(settings.tracks ?? {}).map(([id, track]) => [
          id,
          defineAuthoredPoseTrack(track),
        ]),
      ),
    );
    if (settings.svgAsset)
      for (const track of Object.values(tracks))
        for (const key of track.keys)
          if (key.poseId && !settings.svgAsset.poses.includes(key.poseId))
            throw Error('Unknown SVG pose in authored track');
    const candidate = Object.freeze({ ...settings, bodyProfile, tracks });
    samplePlayerMotionPose({
      motionState: { id: 'idle', progress: 0 },
      boneInput: { animationTime: 0, isGrounded: true },
      ...candidate,
    });
    const rest = samplePlayerMotionPose({
      motionState: { id: 'idle', progress: 0 },
      boneInput: { animationTime: 0, isGrounded: true },
      bodyProfile,
    });
    const binding = settings.svgAsset
      ? createSvgCharacterBinding(settings.svgAsset, {
          restPose: rest.bonePose,
          rootFrame: settings.svgRootFrame,
          jointMap: settings.svgJointMap,
        })
      : null;
    if (binding)
      sampleSvgCharacterPresentation(binding, {
        bonePose: rest.bonePose,
        position: this.position ?? { x: 0, y: 0 },
        geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
      });
    this.svgCharacterBinding = binding;
    this.characterAnimationSettings = candidate;
    this.playerWeaponContactHistory = [];
    return candidate;
  }

  applySvgPlayerGeometry(geometry, pose, position, renderOrder = 30.5, facing = this.facing) {
    if (!this.svgCharacterBinding) return geometry;
    const presentation = sampleSvgCharacterPresentation(this.svgCharacterBinding, {
      bonePose: pose.bonePose,
      position,
      facing,
      geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
      renderOrder,
      weaponLengthScale: geometry.weaponLengthScale ?? 1,
    });
    return Object.freeze({
      ...geometry,
      weapon: presentation.weapon,
      shield: presentation.shield,
      svgPresentation: presentation,
    });
  }

  setRootMotionCurve(actionId, curve, { distance = this.rootMotionDistances[actionId] ?? 0 } = {}) {
    if (!Number.isFinite(distance) || distance < 0 || distance > 2000)
      throw Error('Invalid gameplay root distance');
    if (actionId !== 'roll' && !ATTACK_SPATIAL_PROFILES[actionId])
      throw Error('Unknown root motion action');
    this.rootMotionCurves = Object.freeze({
      ...this.rootMotionCurves,
      [actionId]: defineRootMotionCurve(curve),
    });
    this.rootMotionDistances = Object.freeze({ ...this.rootMotionDistances, [actionId]: distance });
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
    const itemId = this.progressionSnapshot.loadout.weaponItemId;
    const record = this.progressionSnapshot.enchantment.equipmentEnchantments[itemId];
    const profile = record?.elementId ? this.enchantmentCatalog.getProfile(record.elementId) : null;
    return Object.freeze({
      itemId,
      level: record?.level ?? 0,
      active: profile
        ? Object.freeze({
            itemId,
            level: record.level,
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
        snapshot.ownedEquipmentItemIds,
      ),
    });
    const nextEquipment = resolveEquipmentLoadout(
      nextSnapshot.loadout,
      this.equipmentCatalog,
      nextSnapshot.equipmentUpgrades,
    );
    this.progressionSnapshot = nextSnapshot;
    this.resolvedLoadout = nextEquipment;
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
    this.acquisitionFeedback?.reset();
    this.lastFeedbackSnapshot = this.progressionSnapshot;
    this.scenePresentation?.reset();
    const scrapCampaign = getScrapCampaignReadModel(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    this.visualQaTimePhase = null;
    this.timePhase = scrapCampaign.phaseId === 'night' ? 'night' : 'day';
    this.scrapGameOverPresentationState = createScrapGameOverPresentation(scrapCampaign.gameOver);
    this.mapRuntime.setWorldContext({
      timePhase: this.timePhase,
      weather: 'clear',
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
    this.playerMaxHealth = 100;
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
    this.progressionNotice = '고철 장비와 회수 재료로 전투 선택을 넓히세요.';
    this.recoveryNotice = '';
    this.postKoHeldInputFence = new Set();
    this.scrapAwakeningElapsedSeconds = 0;
    this.scrapGarageRevealElapsedSeconds = 0;
    this.storyInteractionOwner.reset();
    this.lastJumpSequence = 0;
    this.facing = mapSnapshot.spawn?.facing ?? 1;
    this.portalTransitionPresentation = null;
    this.pendingScrapCampaignAction = null;
    this.cameraPosition = { ...mapSnapshot.cameraPosition };
    this.previousCameraPosition = { ...this.cameraPosition };
    this.resolvedLoadout = resolveEquipmentLoadout(
      this.progressionSnapshot.loadout,
      this.equipmentCatalog,
    );
    this.combatCommands.reset();
    this.combatCommands.setTimingProfile(this.resolvedLoadout.combatTiming);
    this.combatCommands.setMoveset(this.resolvedLoadout.moveset);
    this.combatCommands.setCommandProfile(this.getCombatSkillProfile());
    this.prepareAttackSpatialProfiles();
    this.combatCameraFeedback.reset();
    this.combatEvents.reset();
    this.replaceRoomScene(mapSnapshot, { resetExisting: true });
    this.statusNode.publish({ force: true });
  }

  setVisualQaCombatOverlay(enabled) {
    this.visualQaCombatOverlay = enabled === true;
  }

  setRenderPerformanceEnabled(enabled) {
    this.renderPerformanceEnabled = enabled === true;
    this.lastRenderBuildTimings = null;
  }

  setVisualQaLocation({ regionId, roomId, x, facing }) {
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
    if (facing !== undefined) this.facing = facing;
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

  setInputQaScrapRegionStart({ regionId, currentLocationId = regionId }) {
    const region = this.scrapCampaignProfile.getRegion(regionId);
    if (!region) throw new Error(`지원하지 않는 Scrap region 입력 QA 시작점입니다: ${regionId}`);
    const fresh = createScrapCampaignSnapshot(this.scrapCampaignProfile);
    const scrapCampaign = toScrapCampaignSnapshot(
      {
        ...fresh,
        currentLocationId,
        awakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
        garageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
        regionStates: {
          ...fresh.regionStates,
          [region.id]: SCRAP_CAMPAIGN_REGION_STATUS.AVAILABLE,
        },
        regionEventStageIds: { ...fresh.regionEventStageIds, [region.id]: null },
        lastChangeLabel: `${region.label} · 현장 대화 시작`,
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

  setVisualQaScrapIssueState({ activePrimaryIssueId, completedIssueIds = [] }) {
    const primaryIssue = this.scrapCampaignProfile.getPrimaryIssue(activePrimaryIssueId);
    if (
      !primaryIssue ||
      !Array.isArray(completedIssueIds) ||
      completedIssueIds.some(
        (issueId) => !primaryIssue.linkedIssues.some((linkedIssue) => linkedIssue.id === issueId),
      )
    ) {
      throw new Error(`지원하지 않는 Scrap campaign issue QA state입니다: ${activePrimaryIssueId}`);
    }
    const current = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    const scrapCampaign = toScrapCampaignSnapshot(
      {
        ...current,
        activePrimaryIssueId,
        completedIssueIds: [...completedIssueIds],
        lastChangeLabel: `${primaryIssue.label} · 연결 의뢰 ${completedIssueIds.length}/${primaryIssue.linkedIssues.length}`,
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

  setVisualQaScrapFinalBattleStage(stageId) {
    assertScrapFinalBattleStageId(stageId);
    const current = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    const scrapCampaign = toScrapCampaignSnapshot(
      {
        ...current,
        finalBattleStageId: stageId,
        lastChangeLabel: getScrapCampaignReadModel(
          { ...current, finalBattleStageId: stageId },
          this.scrapCampaignProfile,
        ).finalBattle.cue,
      },
      this.scrapCampaignProfile,
    );
    this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
      scrapCampaign,
    });
    this.resetScrapFinalBattleCombat(stageId);
    this.syncScrapAwakeningWorldContext();
    this.statusNode.publish({ force: true });
    return scrapCampaign;
  }

  resetScrapFinalBattleCombat(stageId = this.progressionSnapshot.scrapCampaign.finalBattleStageId) {
    this.scrapFinalBattleCombat = createScrapFinalBattleCombatState(stageId);
    this.scrapFinalBattleOpeningSeconds = 0;
    return this.scrapFinalBattleCombat;
  }

  createScrapFinalBattleStageAction(stageId) {
    const current = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    return Object.freeze({
      actionId: `final-battle:${stageId}:${current.committedActionIds.length}`,
      label: `최종전 · ${stageId}`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.FINAL_BATTLE_STAGE,
      finalBattleStageId: stageId,
      costSegments: 0,
    });
  }

  resolveScrapFinalBattleCombatHit(combatState, attackProfile) {
    const stageId = this.progressionSnapshot.scrapCampaign.finalBattleStageId;
    const profile = getScrapFinalBattleCombatProfile(stageId);
    if (!profile) return false;
    if (this.scrapFinalBattleCombat.stageId !== stageId) this.resetScrapFinalBattleCombat(stageId);
    const result = resolveScrapFinalBattleCombatContact({
      state: this.scrapFinalBattleCombat,
      combatState,
      attackProfile,
      weaponSweep: this.playerCombatGeometry?.sweep,
      openingActive: this.scrapFinalBattleOpeningSeconds > 0,
    });
    if (!result.changed) return false;
    this.scrapFinalBattleCombat = result.state;
    this.combatEvents.emit(COMBAT_EVENT_TYPE.HIT, {
      actor: 'player',
      target: 'enemy',
      attackId: combatState.id,
      position: result.contact.position,
      direction: this.facing,
      strength: result.completed ? 2.4 : 1.5,
      durationSeconds: 0.16,
    });
    this.combatCameraFeedback.trigger({
      direction: this.facing,
      strength: result.completed ? 1.8 : 0.9,
      durationSeconds: 0.12,
    });
    if (!result.completed) {
      this.progressionNotice = `${profile.targetLabel} 타격 ${result.state.hitCount}/${profile.requiredHitCount}`;
      return true;
    }
    const transaction = this.commitScrapCampaignDomainAction(
      this.createScrapFinalBattleStageAction(
        stageId === SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE
          ? SCRAP_FINAL_BATTLE_STAGE.CORE_REINSTALLED
          : stageId === SCRAP_FINAL_BATTLE_STAGE.ARMOR
            ? SCRAP_FINAL_BATTLE_STAGE.WEAPON
            : SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE,
      ),
    );
    if (transaction.changed)
      this.resetScrapFinalBattleCombat(transaction.snapshot.finalBattleStageId);
    return transaction.changed;
  }

  setVisualQaScrapGameOverStage(stageId = SCRAP_GAME_OVER_STAGE.RECOVERY_CHOICE) {
    const current = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    const scrapCampaign = toScrapCampaignSnapshot(
      {
        ...current,
        elapsedSegments: current.elapsedSegments + current.deadlineSegments,
        deadlineSegments: 0,
        rivalProgressSegments: current.rivalProgressSegments + current.deadlineSegments,
        gameOver: true,
        lastChangeLabel: 'D-DAY 0 · 고대 병기 수도 도착',
      },
      this.scrapCampaignProfile,
    );
    this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
      scrapCampaign,
    });
    this.scrapGameOverPresentationState = createScrapGameOverPresentation(true, stageId);
    this.syncScrapAwakeningWorldContext();
    this.statusNode.publish({ force: true });
    return getScrapGameOverPresentation(this.scrapGameOverPresentationState);
  }

  setVisualQaScrapLastSegment() {
    const current = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    const elapsedSegments = this.scrapCampaignProfile.initialDeadlineSegments - 1;
    const scrapCampaign = toScrapCampaignSnapshot(
      {
        ...current,
        elapsedSegments,
        deadlineSegments: 1,
        rivalProgressSegments: elapsedSegments,
        rivalDelaySegments: 0,
        gameOver: false,
        lastChangeLabel: '마지막 1구간 · 수도 도착 직전',
      },
      this.scrapCampaignProfile,
    );
    this.progressionSnapshot = mergeProgressionSnapshot(this.progressionSnapshot, {
      scrapCampaign,
    });
    this.scrapGameOverPresentationState = createScrapGameOverPresentation(false);
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
        'combat-player-hit',
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
              itemId: activeEnchant?.id === id ? activeEnchant.itemId : null,
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
          this.hitStopSeconds = 0.045;
          this.combatCameraFeedback.trigger({
            direction: 1,
            strength: 3.8,
            durationSeconds: 0.1,
          });
          emit(COMBAT_EVENT_TYPE.HIT);
        }
        break;
      case 'combat-player-hit':
        encounter.lastVisualContact = Object.freeze({
          ...encounter.lastVisualContact,
          attacker: 'enemy',
          weaponItemId: 'combat-enemy-weapon',
          hurtItemId: 'workwear-front-panel',
          position: Object.freeze({ x: playerX + 18, y: groundY - 45 }),
        });
        encounter.contactSeconds = active ? 0.18 : 0;
        if (active) {
          this.playerHitstunSeconds = 0.18;
          this.hitStopSeconds = 0.035;
          emit(COMBAT_EVENT_TYPE.HIT, {
            actor: 'enemy',
            target: 'player',
            position: encounter.lastVisualContact.position,
            direction: 1,
            strength: 1.6,
            durationSeconds: 0.18,
          });
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
    return this.setVisualQaTimePhase(this.timePhase === 'night' ? 'day' : 'night');
  }

  setVisualQaTimePhase(timePhase) {
    if (!['morning', 'day', 'evening', 'night'].includes(timePhase)) {
      throw new Error(`지원하지 않는 Visual QA time phase입니다: ${timePhase}`);
    }
    this.visualQaTimePhase = timePhase;
    this.updateTimePhase();
    this.statusNode.publish({ force: true });
    return this.getWorldStatus();
  }

  updateTimePhase() {
    const campaign = this.getScrapAwakeningReadModel();
    const nextPhase = this.visualQaTimePhase ?? (campaign.phaseId === 'night' ? 'night' : 'day');
    if (nextPhase === this.timePhase) return;
    this.timePhase = nextPhase;
    this.mapRuntime.setWorldContext({ ...this.mapRuntime.getWorldContext(), timePhase: nextPhase });
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
    this.updateTimePhase();
    const campaign = this.getScrapAwakeningReadModel();
    const before = this.mapRuntime.getResolvedSnapshot();
    const combatEntityIds = (snapshot) =>
      snapshot.entities
        .filter((entity) => ['combat-test-mob', 'combat-enemy'].includes(entity.kind))
        .map((entity) => entity.id);
    const beforeCombatEntityIds = combatEntityIds(before);
    this.mapRuntime.setWorldContext({
      ...this.mapRuntime.getWorldContext(),
      ...scrapCampaignWorldFacts(campaign),
    });
    const after = this.mapRuntime.getResolvedSnapshot();
    if (
      this.roomSceneNode &&
      before.active.regionId === after.active.regionId &&
      before.active.roomId === after.active.roomId &&
      JSON.stringify(beforeCombatEntityIds) !== JSON.stringify(combatEntityIds(after))
    ) {
      this.replaceRoomScene(after, { forceReplace: true });
    }
  }

  commitScrapAwakening(transaction, encounterResult = null) {
    if (!transaction.changed) return transaction;
    const next = mergeProgressionSnapshot(this.progressionSnapshot, {
      scrapCampaign: transaction.snapshot,
    });
    const reward = this.resolveEncounterReward(next, encounterResult);
    const progressionTransaction = Object.freeze({ ...transaction, snapshot: reward.snapshot });
    if (reward.changed) this.progressionNotice = reward.rewardLabel;
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
      awakening.awakeningStageId !== SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED
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
    this.progressionNotice = '구조용 제어핵 회수 · winch 전력 연결';
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
    this.progressionNotice = `${SCRAP_CAST.SCRAPYARD_OWNER.name} · 제어핵 분석 시작`;
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

  tryRequestScrapCampaignRestFromWorld() {
    const campaign = this.getScrapAwakeningReadModel();
    if (!this.isScrapAwakeningLocation() || !campaign.garageRevealComplete) return false;
    const restSpot = this.mapRuntime
      .getResolvedSnapshot()
      .entities.find((entity) => entity.id === this.scrapAwakeningProfile.restEntityId);
    if (!restSpot?.position) return false;
    const interactionRange = restSpot.interactionRange ?? 64;
    if (
      Math.hypot(this.position.x - restSpot.position.x, this.position.y - restSpot.position.y) >
      interactionRange
    ) {
      return false;
    }
    return this.requestScrapCampaignRest();
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

  createScrapCampaignIssueFocusAction(regionId) {
    const region = this.scrapCampaignProfile.getRegion(regionId);
    if (!region) throw new Error(`지원하지 않는 주요 의뢰 region입니다: ${regionId}`);
    return Object.freeze({
      actionId: `issue-focus:${region.id}`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.ISSUE_FOCUS,
      label: `주요 의뢰 고정 · ${region.label}`,
      targetRegionId: region.id,
      costSegments: 0,
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

  createScrapCampaignLinkedEncounterAction(regionId, encounterId, entityId) {
    const region = this.scrapCampaignProfile.getRegion(regionId);
    const linkedIssue = this.getScrapAwakeningReadModel().issueWindow.linked.find(
      (issue) =>
        !issue.completed &&
        issue.targetRegionId === regionId &&
        issue.remainingEncounterIds.includes(encounterId),
    );
    if (!region || typeof encounterId !== 'string' || encounterId.length === 0) {
      throw new Error(`지원하지 않는 연결 전투입니다: ${regionId}:${encounterId}`);
    }
    if (!linkedIssue) {
      throw new Error(`현재 주요 의뢰가 요구하지 않는 연결 전투입니다: ${regionId}:${encounterId}`);
    }
    return Object.freeze({
      actionId: `linked-encounter:${region.id}:${encounterId}:${entityId}`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.LINKED_ENCOUNTER,
      label: `${region.label} · 연결 전투 제압 ${encounterId}`,
      targetRegionId: region.id,
      encounterId,
      costSegments: 0,
    });
  }

  createScrapCampaignKoReturnAction() {
    const campaignSnapshot = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    return Object.freeze({
      actionId: `ko-return:${campaignSnapshot.elapsedSegments}:${campaignSnapshot.committedActionIds.length}`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.KO_RETURN,
      label: 'KO 거점 복귀',
      costSegments: 1,
    });
  }

  createScrapCampaignRestAction() {
    const campaignSnapshot = toScrapCampaignSnapshot(
      this.progressionSnapshot.scrapCampaign,
      this.scrapCampaignProfile,
    );
    return Object.freeze({
      actionId: `rest:full:${campaignSnapshot.elapsedSegments}:${campaignSnapshot.committedActionIds.length}`,
      kind: SCRAP_CAMPAIGN_ACTION_KIND.REST,
      label: '고물상 야전 침상 · 완전 회복',
      costSegments: 1,
    });
  }

  commitScrapCampaignDomainAction(action, encounterResult = null) {
    const transaction = commitScrapCampaignAction(
      this.progressionSnapshot.scrapCampaign,
      action,
      this.scrapCampaignProfile,
    );
    if (!transaction.changed) return transaction;
    const next = mergeProgressionSnapshot(this.progressionSnapshot, {
      scrapCampaign: transaction.snapshot,
    });
    const reward = this.resolveEncounterReward(next, encounterResult);
    this.progressionSnapshot = reward.snapshot;
    if (transaction.snapshot.gameOver) this.beginScrapGameOverPresentation();
    this.progressionNotice = `${transaction.preview.label} · ${transaction.preview.after.phaseLabel} · ${transaction.preview.after.deadlineLabel}`;
    if (reward.changed) this.progressionNotice = reward.rewardLabel;
    this.syncScrapAwakeningWorldContext();
    this.emitDurableProgressionChanged();
    this.statusNode.publish({ force: true });
    return Object.freeze({ ...transaction, progressionSnapshot: this.progressionSnapshot });
  }

  requestScrapCampaignTravel(portal) {
    if (this.progressionSnapshot.scrapCampaign.gameOver) return false;
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
    this.combatCommands.reset({ preserveStamina: true, preserveInputHistory: true });
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
    if (this.progressionSnapshot.scrapCampaign.gameOver) return false;
    if (this.pendingScrapCampaignAction || this.mapRuntime.getTransition()) return false;
    if (!this.progressionSnapshot.scrapCampaign.activePrimaryIssueId) {
      this.commitScrapCampaignDomainAction(this.createScrapCampaignIssueFocusAction(regionId));
    }
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
    this.combatCommands.reset({ preserveStamina: true, preserveInputHistory: true });
    this.rollState = null;
    this.campaignActionPreviewRequested.emit(
      Object.freeze({ source: 'region-core-event', regionId, preview }),
    );
    return true;
  }

  requestScrapCampaignRest() {
    if (this.progressionSnapshot.scrapCampaign.gameOver) return false;
    if (this.pendingScrapCampaignAction || this.mapRuntime.getTransition()) return false;
    const action = this.createScrapCampaignRestAction();
    const preview = previewScrapCampaignAction(
      this.progressionSnapshot.scrapCampaign,
      action,
      this.scrapCampaignProfile,
    );
    this.pendingScrapCampaignAction = Object.freeze({ type: 'full-rest', action, preview });
    this.combatCommands.reset({ preserveStamina: true, preserveInputHistory: true });
    this.rollState = null;
    this.campaignActionPreviewRequested.emit(
      Object.freeze({ source: 'full-recovery-camp', preview }),
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
    if (pending.type === 'field-work') {
      const current = this.fieldQuests.nearbyAction();
      if (!current || JSON.stringify(current.event) !== JSON.stringify(pending.fieldEvent)) {
        this.pendingScrapCampaignAction = null;
        return Object.freeze({ started: false, reason: 'field-target-changed' });
      }
      const campaign = commitScrapCampaignAction(
        this.progressionSnapshot.scrapCampaign,
        pending.action,
        this.scrapCampaignProfile,
      );
      const draft = mergeProgressionSnapshot(this.progressionSnapshot, {
        scrapCampaign: campaign.snapshot,
      });
      const transaction = this.fieldQuests.perform(pending.fieldEvent, draft);
      this.pendingScrapCampaignAction = null;
      this.commitProgression({ ...transaction, changed: true });
      this.syncScrapAwakeningWorldContext();
      if (campaign.snapshot.gameOver) this.beginScrapGameOverPresentation();
      return Object.freeze({
        started: true,
        reason: 'confirmed',
        preview: pending.preview,
        transaction,
      });
    }
    const transaction = this.commitScrapCampaignDomainAction(pending.action);
    this.pendingScrapCampaignAction = null;
    if (
      pending.type === 'full-rest' &&
      transaction.changed &&
      !this.progressionSnapshot.scrapCampaign.gameOver
    ) {
      this.playerHealth = this.playerMaxHealth;
      this.combatCommands.reset({ preserveInputHistory: true });
      this.recoveryNotice = '휴식 지점에서 체력과 스태미나를 완전히 회복했습니다.';
      this.statusNode.publish({ force: true });
    }
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

  getPendingScrapCampaignAction() {
    return this.pendingScrapCampaignAction;
  }

  beginScrapGameOverPresentation() {
    this.scrapGameOverPresentationState = createScrapGameOverPresentation(true);
    this.pendingScrapCampaignAction = null;
    this.portalTransitionPresentation = null;
    this.movementIntent = 0;
    this.rollState = null;
    this.verticalVelocity = 0;
    this.storyInteractionOwner.reset();
    this.combatCommands.reset();
    return getScrapGameOverPresentation(this.scrapGameOverPresentationState);
  }

  emitDurableProgressionChanged() {
    if (this.fieldQuests) {
      const prepared = this.fieldQuests.prepare();
      this.progressionSnapshot = prepared.snapshot;
      this.acquisitionFeedback.push(prepared.notifications, this.position);
      if (this.lastFeedbackSnapshot)
        this.acquisitionFeedback.push(
          acquisitionChanges(
            this.lastFeedbackSnapshot,
            this.progressionSnapshot,
            this.equipmentCatalog,
            this.scrapCampaignProfile,
            'change-' + ++this.acquisitionFeedback.sequence,
          ),
          this.position,
        );
      this.lastFeedbackSnapshot = this.progressionSnapshot;
      this.syncFieldEncounter();
    }
    this.progressionChanged.emit(this.progressionSnapshot);
    return this.progressionSnapshot;
  }

  canStartPortalTransition() {
    if (this.progressionSnapshot.scrapCampaign.gameOver) return false;
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
      entities: applyQuestNpcOutcomes(mapSnapshot.entities, this.progressionSnapshot.quests),
      playerPosition: Object.freeze({ ...this.position }),
      transcripts: resolveConversationTranscripts(this.progressionSnapshot.viewedConversationIds),
    });
  }

  resolveScrapCampaignStoryInteraction(conversationId) {
    const interaction = this.mapRuntime
      .getResolvedSnapshot()
      .entities.find((entity) => entity.conversationId === conversationId);
    if (interaction?.scrapAwakeningNextStageId) {
      const transaction = advanceScrapAwakening(
        this.progressionSnapshot.scrapCampaign,
        this.scrapCampaignProfile,
      );
      if (
        !transaction.changed ||
        transaction.snapshot.awakeningStageId !== interaction.scrapAwakeningNextStageId
      ) {
        return transaction;
      }
      this.progressionNotice = getScrapAwakeningPresentation(
        transaction.snapshot.awakeningStageId,
      ).cue;
      const committed = this.commitScrapAwakening(transaction);
      if (transaction.snapshot.awakeningStageId === SCRAP_AWAKENING_STAGE.COLLAPSE) {
        this.combatCameraFeedback.trigger({ direction: 1, strength: 4.6, durationSeconds: 0.14 });
      }
      return committed;
    }
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
    let campaignTransaction = Object.freeze({ changed: false });
    try {
      this.replaceRoomScene(this.mapRuntime.getResolvedSnapshot());
      this.position = { ...completion.position };
      this.cameraPosition = { ...presentation.destinationCameraPosition };
      this.storyInteractionOwner.reset();
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
          if (campaignTransaction.snapshot.gameOver) this.beginScrapGameOverPresentation();
          this.progressionNotice = `${campaignTransaction.preview.label} · ${campaignTransaction.preview.after.phaseLabel} · ${campaignTransaction.preview.after.deadlineLabel}`;
        }
      }
    } catch (error) {
      this.recoverPortalTransition(presentation, error);
      return true;
    }
    this.portalTransitionPresentation = null;
    if (campaignTransaction.changed) {
      this.syncScrapAwakeningWorldContext();
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
      location.roomId === this.scrapAwakeningProfile.roomId &&
      this.getScrapAwakeningReadModel().garageRevealComplete &&
      !this.getScrapAwakeningReadModel().gameOver &&
      !this.mapRuntime.getTransition() &&
      this.combatCommands.snapshot().id === 'idle'
    );
  }

  resolveDialogueStatus() {
    const dialogue = this.storyInteractionOwner.snapshot(this.getStoryInteractionContext());
    if (!dialogue.active || dialogue.commands.length === 0) return dialogue;
    const progression = this.progressionSnapshot;
    const record = progression.enchantment.equipmentEnchantments[progression.loadout.weaponItemId];
    const availableGold = getAvailableGold(progression);
    const forgeProfile = this.combatProgressionProfile.equipmentForge;
    const selectedArchetypeId =
      progression.equipmentForge.selectedItemIdsByGroup[forgeProfile.choiceGroupId] ?? null;
    const forgeMaterialQuantity =
      progression.equipmentForge.materialQuantities[forgeProfile.materialId] ?? 0;
    const visibleCommands = dialogue.commands.filter(
      (command) =>
        command.type !== 'forge-equipment-archetype' ||
        selectedArchetypeId === null ||
        command.itemId === selectedArchetypeId,
    );
    const commands = visibleCommands.map((command) => {
      if (command.type === 'upgrade-equipment-enchantment') {
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
          itemId: progression.loadout.weaponItemId,
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
      if (command.type === 'manage-equipment') {
        const profile = this.equipmentCatalog.getItem(command.itemId);
        const owned = progression.ownedEquipmentItemIds.includes(profile.id);
        const active = progression.loadout.weaponItemId === profile.id;
        const affordable =
          progression.trainingMarks >= profile.trainingMarkRequirement &&
          availableGold >= profile.goldCost;
        return Object.freeze({
          id: command.id,
          type: command.type,
          itemId: profile.id,
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
      if (command.type === 'forge-equipment-archetype') {
        const profile = this.equipmentCatalog.getItem(command.itemId);
        const selected = selectedArchetypeId === profile.id;
        const choiceComplete = selectedArchetypeId !== null;
        const active = progression.loadout.weaponItemId === profile.id;
        return Object.freeze({
          id: command.id,
          type: command.type,
          itemId: profile.id,
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
      if (command.type === 'train-combat-skill') {
        const skill = this.getCombatSkillReadModel();
        return Object.freeze({
          ...command,
          label: '전투 수련',
          description: skill.description,
          active: false,
          canChoose: skill.canTrain,
          actionLabel: skill.actionLabel,
        });
      }
      if (command.type === 'replay-transcript') {
        return Object.freeze({
          ...command,
          canChoose: true,
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
    if (!command) {
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
    if (!this.canManageProgression()) {
      return this.unavailableProgressionTransaction();
    }
    if (command.type === 'train-combat-skill') return this.trainCombatSkill();
    if (command.type === 'manage-equipment') {
      return this.manageMerchantEquipment(command.itemId);
    }
    if (command.type === 'forge-equipment-archetype') {
      return this.forgeMerchantEquipmentArchetype(command.itemId);
    }
    if (command.type !== 'upgrade-equipment-enchantment') {
      return this.unavailableProgressionTransaction();
    }
    const transaction = upgradeProgressionEquipmentEnchantment(
      this.progressionSnapshot,
      {
        itemId: this.progressionSnapshot.loadout.weaponItemId,
        elementId: command.enchantId,
      },
      this.enchantmentCatalog,
    );
    const profile = this.enchantmentCatalog.profiles.find(
      (candidate) => candidate.id === command.enchantId,
    );
    this.progressionNotice = transaction.changed
      ? `${profile.label} ${this.resolvedLoadout.mainItem.shortLabel} 인챈트 Lv.${transaction.targetLevel}`
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

  manageMerchantEquipment(profileId) {
    let profile;
    try {
      profile = this.equipmentCatalog.getItem(profileId);
    } catch {
      return this.unavailableProgressionTransaction();
    }
    const owned = this.progressionSnapshot.ownedEquipmentItemIds.includes(profile.id);
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
      itemId: profile.id,
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

  forgeMerchantEquipmentArchetype(profileId) {
    const forgeProfile = this.combatProgressionProfile.equipmentForge;
    if (!forgeProfile.optionItemIds.includes(profileId)) {
      return this.unavailableProgressionTransaction();
    }
    let profile;
    try {
      profile = this.equipmentCatalog.getItem(profileId);
    } catch {
      return this.unavailableProgressionTransaction();
    }
    const selectedProfileId =
      this.progressionSnapshot.equipmentForge.selectedItemIdsByGroup[forgeProfile.choiceGroupId] ??
      null;
    if (
      selectedProfileId === profile.id &&
      this.progressionSnapshot.ownedEquipmentItemIds.includes(profile.id)
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
    const transaction = forgeProgressionEquipmentArchetype(this.progressionSnapshot, {
      choiceGroupId: forgeProfile.choiceGroupId,
      itemId: profile.id,
      optionItemIds: forgeProfile.optionItemIds,
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
    const nextEquipment = resolveEquipmentLoadout(
      nextSnapshot.loadout,
      this.equipmentCatalog,
      nextSnapshot.equipmentUpgrades,
    );
    const nextSkill = this.combatProgressionProfile.getSkillLevelProfile(
      nextSnapshot.combatSkillLevel,
    );
    if (equipmentChanged) {
      this.combatCommands.setTimingProfile(nextEquipment.combatTiming);
      this.combatCommands.setMoveset(nextEquipment.moveset);
    }
    if (skillChanged) this.combatCommands.setCommandProfile(nextSkill);
    this.progressionSnapshot = nextSnapshot;
    this.roomSceneNode?.setEnchantmentContext(this.getEnchantContext());
    this.resolvedLoadout = nextEquipment;
    if (equipmentChanged || skillChanged) this.prepareAttackSpatialProfiles();
    this.acquisitionFeedback.push(transaction.notifications ?? [], this.position);
    this.emitDurableProgressionChanged();
    this.statusNode.publish({ force: true });
    return Object.freeze({ ...transaction, snapshot: this.progressionSnapshot });
  }

  unavailableProgressionTransaction() {
    return Object.freeze({
      changed: false,
      reason: PROGRESSION_TRANSACTION_REASON.UNAVAILABLE,
      snapshot: this.progressionSnapshot,
    });
  }

  syncFieldEncounter() {
    if (!this.fieldQuests || !this.roomSceneNode) return;
    const snapshot = this.fieldQuests.decorateSnapshot(this.mapRuntime.getResolvedSnapshot());
    const desired =
      snapshot.entities.find((e) => ['combat-test-mob', 'combat-enemy'].includes(e.kind))?.id ??
      null;
    const current = this.roomSceneNode.encounter?.entity?.id ?? null;
    if (desired !== current) this.replaceRoomScene(snapshot, { forceReplace: true });
  }
  getFieldJournalView() {
    const prepared = this.fieldQuests.prepare();
    if (prepared.changed) this.commitProgression(prepared);
    const context = this.fieldQuests.context();
    const ledger = getMaterialLedger(this.progressionSnapshot);
    const quests = createQuestReadModel(
      this.progressionSnapshot.quests,
      context.campaignReadModel,
      context,
    );
    const issuers = new Map(
      this.mapRuntime
        .getResolvedMap()
        .regions.flatMap((r) =>
          r.rooms.flatMap((room) => room.entities.map((e) => [e.id, e.speaker ?? e.label ?? e.id])),
        ),
    );
    const present = (q) => ({
      ...q,
      issuerLabel: issuers.get(q.issuerId) ?? q.issuerId,
      regionLabel: this.scrapCampaignProfile.getRegion(q.regionId)?.label ?? q.regionId,
      statusLabel: {
        offered: '미수락',
        accepted: '진행 중',
        completed: '완료',
        failed: '기한 초과',
        expired: '기간 종료',
      }[q.status],
      rewardLabel: [
        q.rewards.gold + ' Gold',
        ...Object.entries(q.rewards.materials).map(
          ([id, n]) => (MATERIAL_PROFILES.find((p) => p.id === id)?.label ?? id) + ' ×' + n,
        ),
        ...(q.rewards.trainingMarks ? [q.rewards.trainingMarks + ' 수련 인장'] : []),
      ].join(' · '),
    });
    return Object.freeze({
      clockLabel: context.campaignReadModel.hudLabel,
      quests: {
        ...quests,
        general: quests.general.map(present),
        history: quests.history.map(present),
      },
      materials: MATERIAL_PROFILES.map((p) => ({
        id: p.id,
        label: p.label,
        quantity: ledger[p.id],
      })),
      canUpgrade: this.canManageProgression(),
      canRest: Boolean(this.fieldQuests.getBoardPrompt()),
    });
  }
  requestFieldRest() {
    if (
      !this.fieldQuests.getBoardPrompt() ||
      this.combatCommands.active ||
      this.pendingScrapCampaignAction ||
      this.progressionSnapshot.scrapCampaign.gameOver
    )
      return false;
    const enemy = this.roomSceneNode?.encounter?.enemy;
    if (enemy?.health > 0 && Math.abs(enemy.position.x - this.position.x) < 300) return false;
    const action = Object.freeze({
      ...this.createScrapCampaignRestAction(),
      label: '진입부 휴식 지점',
    });
    const preview = Object.freeze({
      ...previewScrapCampaignAction(
        this.progressionSnapshot.scrapCampaign,
        action,
        this.scrapCampaignProfile,
      ),
      detailLabel: '현장 휴식 지점 · 체력 전부 회복',
    });
    this.pendingScrapCampaignAction = Object.freeze({ type: 'full-rest', action, preview });
    this.campaignActionPreviewRequested.emit(
      Object.freeze({ source: 'field-rest-point', preview }),
    );
    return true;
  }
  acceptGeneralQuest(id) {
    if (this.progressionSnapshot.scrapCampaign.gameOver)
      return this.unavailableProgressionTransaction();
    return this.commitProgression(this.fieldQuests.accept(id));
  }
  upgradeOwnedEquipment(id) {
    if (!this.canManageProgression()) return this.unavailableProgressionTransaction();
    const result = upgradeEquipment(this.progressionSnapshot, id, this.equipmentCatalog);
    if (!result.changed)
      this.progressionNotice = '강화 불가 · 재료/Gold 또는 현재 진행 상한을 확인하세요.';
    return this.commitProgression(result, { equipmentChanged: result.changed });
  }
  chooseFieldInteraction() {
    const action = this.fieldQuests?.nearbyAction(),
      board = this.fieldQuests?.getBoardPrompt();
    if (
      board &&
      (!action ||
        Math.abs(board.position.x - this.position.x) <=
          Math.abs(action.position.x - this.position.x))
    )
      return { ...board, board: true };
    return action;
  }
  tryFieldInteraction() {
    if (this.pendingScrapCampaignAction || this.rollState || this.combatCommands.active)
      return false;
    const action = this.chooseFieldInteraction();
    if (!action) return false;
    if (action.board) {
      this.fieldJournalRequested.emit({ tab: 'quests' });
      return true;
    }
    const enemy = this.roomSceneNode?.encounter?.enemy;
    if (enemy?.health > 0 && Math.abs(enemy.position.x - this.position.x) < 300) {
      this.acquisitionFeedback.push(
        [
          {
            id: 'field-combat-' + ++this.acquisitionFeedback.sequence,
            kind: 'field-warning',
            title: '먼저 작업선을 확보하세요.',
            importance: 'normal',
            lines: [],
          },
        ],
        this.position,
      );
      return true;
    }
    if (action.workSegments) {
      const campaignAction = Object.freeze({
        actionId: action.event.occurrenceId + ':work',
        kind: SCRAP_CAMPAIGN_ACTION_KIND.FIELD_WORK,
        label: action.label,
        costSegments: 1,
      });
      const preview = previewScrapCampaignAction(
        this.progressionSnapshot.scrapCampaign,
        campaignAction,
        this.scrapCampaignProfile,
      );
      this.pendingScrapCampaignAction = Object.freeze({
        type: 'field-work',
        action: campaignAction,
        preview,
        fieldEvent: action.event,
      });
      this.campaignActionPreviewRequested.emit(Object.freeze({ source: 'field-work', preview }));
    } else this.commitProgression(this.fieldQuests.perform(action.event));
    return true;
  }

  isEquipmentChangeSafe() {
    const enemy = this.roomSceneNode?.encounter?.enemy;
    return (
      !this.progressionSnapshot.scrapCampaign.gameOver &&
      this.playerHealth > 0 &&
      !this.combatCommands.active &&
      !this.rollState &&
      !(enemy?.health > 0 && Math.abs(enemy.position.x - this.position.x) < 320)
    );
  }
  getEquipmentView() {
    return {
      ...createEquipmentViewModel(
        this.resolvedLoadout,
        this.progressionSnapshot,
        this.equipmentCatalog,
      ),
      canChange: this.isEquipmentChangeSafe(),
      workshopAvailable: this.canManageProgression(),
    };
  }
  equipOwnedItem(itemId) {
    if (!this.isEquipmentChangeSafe()) return this.unavailableProgressionTransaction();
    const transaction = selectProgressionEquipment(
      this.progressionSnapshot,
      itemId,
      this.equipmentCatalog,
    );
    this.progressionNotice = transaction.changed
      ? '장비를 변경했습니다'
      : '장착할 수 없거나 이미 장착한 장비입니다.';
    return this.commitProgression(transaction, { equipmentChanged: true });
  }
  unequipOwnedSlot(slot) {
    if (this.combatCommands.active || this.rollState)
      return this.unavailableProgressionTransaction();
    const transaction = unequipProgressionEquipment(
      this.progressionSnapshot,
      slot,
      this.equipmentCatalog,
    );
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
      bodyThroughAllowed: this.canRollThroughEncounterBody(Math.sign(direction)),
    };
    this.facing = this.rollState.direction;
    if (
      getScrapFinalBattleCombatProfile(this.progressionSnapshot.scrapCampaign.finalBattleStageId)
    ) {
      this.scrapFinalBattleOpeningSeconds = 0.9;
    }
    return true;
  }

  canRollThroughEncounterBody(direction) {
    const enemy = this.roomSceneNode?.getEncounterGameplaySnapshot();
    const collider = enemy?.bodyCollider;
    if (
      !enemy ||
      enemy.health <= 0 ||
      enemy.resolutionState === 'departed' ||
      collider?.rollThrough !== 'normal'
    ) {
      return collider?.rollThrough !== 'forbidden';
    }
    const playerFootY = this.position.y + CHARACTER_FOOT_OFFSET;
    const enemyTopY = enemy.position.y - collider.height;
    if (playerFootY <= enemyTopY || this.position.y >= enemy.position.y) return true;

    const distanceAhead = (enemy.position.x - this.position.x) * direction;
    const separation = PLAYER_BODY_HALF_WIDTH + collider.halfWidth;
    if (distanceAhead <= 0 || distanceAhead >= this.rootMotionDistances.roll + separation) {
      return true;
    }
    const movementBounds = this.getPlayerMovementBounds();
    const safeDestination = enemy.position.x + direction * (separation + ROLL_SAFE_CLEARANCE);
    return safeDestination >= movementBounds.minX && safeDestination <= movementBounds.maxX;
  }

  updateRoll(deltaSeconds) {
    if (!this.rollState) return false;
    const activeRoll = this.rollState;
    const from = activeRoll.elapsedSeconds / activeRoll.durationSeconds;
    activeRoll.elapsedSeconds = Math.min(
      activeRoll.durationSeconds,
      activeRoll.elapsedSeconds + deltaSeconds,
    );
    const delta = sampleRootMotionDelta(
      this.rootMotionCurves.roll,
      from,
      activeRoll.elapsedSeconds / activeRoll.durationSeconds,
      {
        distance: this.rootMotionDistances.roll,
        facing: activeRoll.direction,
        verticalDistance: 0,
      },
    );
    this.position.x += delta.x;
    if (activeRoll.elapsedSeconds >= activeRoll.durationSeconds) this.rollState = null;
    return true;
  }

  resolvePlayerEnemyBodyCollision(enemy, previousPositionX = this.position.x) {
    if (!enemy || enemy.health <= 0 || enemy.resolutionState === 'departed') return false;
    const motionId = this.combatCommands.snapshot().id;
    if (!this.rollState && !['idle', 'guard'].includes(motionId)) return false;
    const playerFootY = this.position.y + CHARACTER_FOOT_OFFSET;
    const collider = enemy.bodyCollider;
    if (!collider || !Number.isFinite(collider.halfWidth) || !Number.isFinite(collider.height)) {
      throw new TypeError('active encounter는 authored body collider를 제공해야 합니다.');
    }
    const enemyTopY = enemy.position.y - collider.height;
    if (playerFootY <= enemyTopY || this.position.y >= enemy.position.y) return false;

    const separation = PLAYER_BODY_HALF_WIDTH + collider.halfWidth;
    const distance = this.position.x - enemy.position.x;
    if (Math.abs(distance) >= separation) return false;

    const rollProgress = this.rollState
      ? this.rollState.elapsedSeconds / this.rollState.durationSeconds
      : null;
    const rollMarker = rollProgress === null ? null : rollTimelineMarkerAt(rollProgress);
    const canRollThrough =
      this.rollState?.bodyThroughAllowed === true &&
      collider.rollThrough === 'normal' &&
      rollMarker?.gameplay === 'evade-and-body-through';
    if (canRollThrough) return false;

    const previousDistance = previousPositionX - enemy.position.x;
    const direction = Math.sign(distance || previousDistance || -this.facing) || 1;
    const movementBounds = this.getPlayerMovementBounds();
    this.position.x = Math.max(
      movementBounds.minX,
      Math.min(movementBounds.maxX, enemy.position.x + direction * separation),
    );
    return true;
  }

  getPlayerMovementBounds() {
    const activeRoom = this.mapRuntime.getActiveRoom();
    const authoredBounds = activeRoom.movementBounds ?? {
      minX: 0,
      maxX: this.mapRuntime.definition.worldSize.width,
    };
    const minimumX = authoredBounds.minX + CHARACTER_BOUNDARY_HALF_WIDTH;
    const maximumX = authoredBounds.maxX - CHARACTER_BOUNDARY_HALF_WIDTH;
    if (minimumX > maximumX) {
      const centerX = (authoredBounds.minX + authoredBounds.maxX) / 2;
      return Object.freeze({ minX: centerX, maxX: centerX });
    }
    return Object.freeze({ minX: minimumX, maxX: maximumX });
  }

  getAttackHitProfile(motionId) {
    return resolveEquipmentAttackProfile(
      motionId,
      this.combatCommands.getMotionFrameData(motionId),
      this.resolvedLoadout,
      this.getCombatSkillProfile(),
    );
  }

  replaceRoomScene(
    snapshot = this.mapRuntime.getResolvedSnapshot(),
    { resetExisting = false, forceReplace = false } = {},
  ) {
    snapshot = this.fieldQuests?.decorateSnapshot(snapshot) ?? snapshot;
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
    this.playerWeaponContactHistory = [];
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
        this.resolveCampaignEncounter(result),
      ),
    ];
  }

  resolveEncounterReward(snapshot, result) {
    if (!result) return Object.freeze({ changed: false, snapshot });
    return awardCampaignEncounterReward(
      snapshot,
      result,
      this.combatProgressionProfile,
      this.enchantmentCatalog,
      this.scrapCampaignProfile,
    );
  }

  resolveCampaignEncounter(result) {
    const fieldEvent = this.fieldQuests?.completionEvent(result);
    if (fieldEvent) return this.commitProgression(this.fieldQuests.perform(fieldEvent));
    if (result.scrapAwakeningNextStageId) {
      assertScrapAwakeningStageId(result.scrapAwakeningNextStageId);
      const transaction = advanceScrapAwakening(
        this.progressionSnapshot.scrapCampaign,
        this.scrapCampaignProfile,
      );
      if (
        !transaction.changed ||
        transaction.snapshot.awakeningStageId !== result.scrapAwakeningNextStageId
      ) {
        return Object.freeze({
          ...transaction,
          changed: false,
          snapshot: this.progressionSnapshot.scrapCampaign,
          kind: 'scrap-awakening-combat-stage-rejected',
          entityId: result.entityId,
        });
      }
      this.progressionNotice = getScrapAwakeningPresentation(
        transaction.snapshot.awakeningStageId,
      ).cue;
      this.commitScrapAwakening(transaction, result);
      return Object.freeze({
        ...transaction,
        kind: 'scrap-awakening-combat-stage',
        entityId: result.entityId,
        stageId: transaction.snapshot.awakeningStageId,
      });
    }
    if (result.linkedEncounterId) {
      const regionId = this.getScrapAwakeningReadModel().currentLocationId;
      const action = this.createScrapCampaignLinkedEncounterAction(
        regionId,
        result.linkedEncounterId,
        result.entityId,
      );
      const transaction = this.commitScrapCampaignDomainAction(action, result);
      return Object.freeze({
        ...transaction,
        kind: 'scrap-campaign-linked-encounter',
        regionId,
        encounterId: result.linkedEncounterId,
      });
    }
    if (result.campaignProgress) {
      const action = this.createScrapCampaignRegionStageAction(
        result.campaignProgress.regionId,
        result.campaignProgress.stageKind,
      );
      const transaction = this.commitScrapCampaignDomainAction(action, result);
      return Object.freeze({
        ...transaction,
        kind: 'scrap-campaign-region-stage',
        regionId: result.campaignProgress.regionId,
        stageKind: result.campaignProgress.stageKind,
      });
    }
    const reward = this.resolveEncounterReward(this.progressionSnapshot, result);
    if (reward.changed) {
      this.progressionNotice = reward.rewardLabel;
      this.commitProgression(reward);
    }
    return reward;
  }

  respawnPlayerAfterKo(inputSnapshot = {}) {
    const campaignTransaction = this.commitScrapCampaignDomainAction(
      this.createScrapCampaignKoReturnAction(),
    );
    if (!campaignTransaction.changed || campaignTransaction.snapshot.gameOver) return;
    const activeRoom = this.mapRuntime.getActiveRoom();
    const respawnX = (activeRoom.movementBounds?.minX ?? activeRoom.bounds.x) + 140;
    this.position = {
      x: respawnX,
      y: this.mapRuntime.getGroundYAt(respawnX) - CHARACTER_FOOT_OFFSET,
    };
    this.roomSceneNode?.resetEncounter();
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
    // A KO restores the encounter at a safe spawn, not the physical key state
    // from the losing frame.  Keeping a held direction/attack here immediately
    // walks the restored player back into the same enemy before they can react.
    // Sequence baselines still come from this snapshot, so a fresh press after a
    // release remains a normal command rather than a lost input.
    this.postKoHeldInputFence = new Set(
      INPUT_ACTIONS.filter((actionId) => inputSnapshot[actionId] === true),
    );
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
      this.lastFieldAssistance = evaluateEquipmentFieldCapability(this.resolvedLoadout, {
        capabilityId: 'pressure-block',
        mode: 'assist',
      });
    }
    if (result.kind === 'guard' || result.kind === 'guard-break') {
      const staminaResult = this.combatCommands.applyGuardContact({
        guardBreak: result.kind === 'guard-break',
        staminaDamage:
          (result.guardStaminaDamage ?? this.combatCommands.staminaProfile.costs.block) *
          (this.resolvedLoadout.guardModifiers.staminaDamageScale ?? 1),
        justGuardEligible: result.justGuardEligible,
      });
      const reactionTiming = playerBlockReactionTiming(
        { blockStrength: result.blockImpactStrength, blockstunSeconds: result.blockstunSeconds },
        this.resolvedLoadout.guardModifiers,
      );
      this.playerBlockImpactSeconds = staminaResult.justGuard ? 0.18 : result.blockImpactSeconds;
      this.playerBlockImpactStrength = staminaResult.justGuard ? 1.8 : reactionTiming.blockStrength;
      const authoredBlockstunSeconds = reactionTiming.durationSeconds;
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
          durationSeconds: PLAYER_MOTION_PROFILE.justGuardEventSeconds,
        });
      }
      if (staminaResult.broken) this.rollState = null;
      return;
    }

    if (result.kind === 'hit') {
      const damage = Math.max(
        1,
        Math.round(result.damage * this.resolvedLoadout.defenseModifiers.damageTakenScale),
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

  prepareAttackSpatialProfiles() {
    for (const id of Object.keys(ATTACK_SPATIAL_PROFILES)) {
      this.sampleSizedPlayerMotionPose({ motionState: { id, progress: 0 }, boneInput: {} });
    }
  }

  sampleSizedPlayerMotionPose(input) {
    const timingFrame = this.combatCommands.getMotionFrameData(input.motionState.id);
    const track = this.characterAnimationSettings.tracks?.[input.motionState.id];
    const override = track
      ? sampleAuthoredPoseTrack(track, input.motionState.progress ?? 0)
      : this.characterAnimationSettings.authoredOverride;
    const pose = sampleAnimationProfile(this.resolvedLoadout.animationProfile, {
      ...this.characterAnimationSettings,
      authoredOverride: override,
      ...input,
      motionState: {
        ...input.motionState,
        frame: input.motionState.frame ?? timingFrame,
      },
    });
    const profile = this.getAttackHitProfile(input.motionState.id);
    return profile
      ? sizeAttackMotionPose(pose, {
          id: input.motionState.id,
          reach: profile.range,
          start: profile.start,
          end: profile.end,
          geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
          timingFrame,
          bodyProfile: this.characterAnimationSettings.bodyProfile,
        })
      : pose;
  }

  getPresentationWeaponLengthScale(motionId) {
    const profile = this.getAttackHitProfile(motionId);
    return profile && profile.contactPart !== 'shield'
      ? 1
      : this.resolvedLoadout.geometryProfile.weaponLengthScale;
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
    const pose = this.sampleSizedPlayerMotionPose(
      Object.freeze({
        motionState: poseCombatState,
        boneInput: Object.freeze({
          animationTime,
          movementIntent: this.movementIntent,
          isGrounded: this.isGrounded,
          verticalVelocity: this.verticalVelocity,
          landingRecovery: this.landingRecoverySeconds / LANDING_RECOVERY_SECONDS,
          hitstunProgress: this.playerHitstunSeconds / PLAYER_MOTION_PROFILE.hitReactionSeconds,
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
    const geometry = sampleSharedPlayerCombatGeometry({
      position: Object.freeze({ x: position.x, y: position.y }),
      facing: this.facing,
      targetPose: pose.targetPose,
      bonePose: pose.bonePose,
      geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
      weaponLengthScale: this.getPresentationWeaponLengthScale(poseCombatState.id),
      hurtProfile: this.characterAnimationSettings.hurtProfile,
    });
    return this.applySvgPlayerGeometry(geometry, pose, position);
  }

  updatePlayerCombatGeometry(combatState) {
    const geometry = this.samplePlayerCombatGeometry(combatState);
    const profile = this.getAttackHitProfile(combatState.id);
    if (!isAttackContactFrame(combatState, profile)) {
      this.playerWeaponContactHistory = [];
      this.playerCombatGeometry = Object.freeze({
        ...geometry,
        sequence: combatState.sequence,
        comboCycle: combatState.comboCycle,
        facing: this.facing,
        sweep: null,
      });
      return this.playerCombatGeometry;
    }
    if (
      this.playerCombatGeometry?.comboCycle !== combatState.comboCycle ||
      this.playerCombatGeometry?.sequence !== combatState.sequence ||
      this.playerCombatGeometry?.facing !== this.facing
    ) {
      this.playerWeaponContactHistory = [];
    }
    const swept = createSweptWeaponGeometry({
      current: profile.contactPart === 'shield' ? geometry.shield : geometry.weapon,
      history: this.playerWeaponContactHistory,
    });
    this.playerWeaponContactHistory = [...swept.history];
    this.playerCombatGeometry = Object.freeze({
      ...geometry,
      sequence: combatState.sequence,
      comboCycle: combatState.comboCycle,
      facing: this.facing,
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

  consumePostKoHeldInputFence(inputSnapshot = {}) {
    if (this.postKoHeldInputFence.size === 0) return inputSnapshot;
    const sanitized = { ...inputSnapshot };
    for (const actionId of this.postKoHeldInputFence) {
      if (inputSnapshot[actionId]) {
        sanitized[actionId] = false;
      } else {
        this.postKoHeldInputFence.delete(actionId);
      }
    }
    return Object.freeze(sanitized);
  }

  update(deltaSeconds, inputSnapshot, simulationSettings = {}) {
    const animationSpeed = Number.isFinite(simulationSettings.animationSpeed)
      ? Math.max(0, simulationSettings.animationSpeed)
      : 1;
    this.combatCameraFeedback.setEnabled(simulationSettings.cameraFeedbackEnabled !== false);
    const gameplayInputSnapshot = this.consumePostKoHeldInputFence(inputSnapshot);
    this.previousPosition = { ...this.position };
    this.previousAnimationTime = this.animationTime;
    this.previousCameraPosition = { ...this.cameraPosition };
    if (this.progressionSnapshot.scrapCampaign.gameOver) {
      const previousStageId = this.scrapGameOverPresentationState.stageId;
      this.scrapGameOverPresentationState = advanceScrapGameOverPresentation(
        this.scrapGameOverPresentationState,
        deltaSeconds,
      );
      if (this.scrapGameOverPresentationState.stageId !== previousStageId) {
        this.statusNode.publish({ force: true });
      }
      return;
    }
    this.combatCameraFeedback.update(deltaSeconds);
    this.combatEvents.update(deltaSeconds);
    this.acquisitionFeedback.update(deltaSeconds);
    this.scrapFinalBattleOpeningSeconds = Math.max(
      0,
      this.scrapFinalBattleOpeningSeconds - deltaSeconds,
    );
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
      return;
    }
    const nextLandingRecoverySeconds = this.landingRecoverySeconds - deltaSeconds;
    this.landingRecoverySeconds =
      nextLandingRecoverySeconds <= Number.EPSILON ? 0 : nextLandingRecoverySeconds;
    const wasGrounded = this.isGrounded;

    const controlsLocked =
      this.playerHitstunSeconds > 0 ||
      this.playerBlockstunSeconds > 0 ||
      this.playerHealth === 0 ||
      this.getScrapAwakeningReadModel().awakeningActive ||
      this.getScrapAwakeningReadModel().garageRevealActive;
    const preUpdateCombatState = this.combatCommands.snapshot();
    const counterInputLocked =
      preUpdateCombatState.justGuardCounterReady || preUpdateCombatState.id === 'shieldBash';
    const storyBlocksGameplay = this.storyInteractionOwner.blocksGameplayInput(
      this.getStoryInteractionContext(),
    );
    const interactionInputLocked = controlsLocked || counterInputLocked;
    const navigationLocked = interactionInputLocked || storyBlocksGameplay;
    const rawJumpPressed = Boolean(gameplayInputSnapshot.jump);
    const rawGuardPressed = Boolean(gameplayInputSnapshot.guard);
    let horizontal = navigationLocked
      ? 0
      : Number(gameplayInputSnapshot.right) - Number(gameplayInputSnapshot.left);
    const jumpPressed = interactionInputLocked ? false : rawJumpPressed;
    const guardPressed = navigationLocked ? false : rawGuardPressed;
    const guardEdge = guardPressed && !this.guardWasPressed;
    const jumpSequence = gameplayInputSnapshot.jumpSequence;
    const jumpIssued = interactionInputLocked
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
      const transcript = resolveConversationTranscripts([dialogueResult.conversationId])[0];
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
    const fieldConsumed =
      jumpIssued && !awakeningConsumed && !dialogueConsumed ? this.tryFieldInteraction() : false;
    const wallMapConsumed =
      jumpIssued && !awakeningConsumed && !dialogueConsumed && !fieldConsumed
        ? this.tryRequestOperationMapFromWorld()
        : false;
    const restConsumed =
      jumpIssued && !awakeningConsumed && !dialogueConsumed && !wallMapConsumed
        ? this.tryRequestScrapCampaignRestFromWorld()
        : false;
    const portalStarted =
      jumpIssued &&
      !awakeningConsumed &&
      !dialogueConsumed &&
      !wallMapConsumed &&
      !restConsumed &&
      !fieldConsumed &&
      this.tryPortalTransition();
    if (
      !portalStarted &&
      !this.pendingScrapCampaignAction &&
      this.mapRuntime.getTransition() === null &&
      guardEdge
    )
      this.tryStartRoll(horizontal);
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
      !restConsumed &&
      !fieldConsumed &&
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
    const combatState = this.combatCommands.update(
      deltaSeconds * animationSpeed,
      gameplayInputSnapshot,
      {
        acceptCommands:
          !isTransitioning &&
          !portalStarted &&
          !this.pendingScrapCampaignAction &&
          !isRolling &&
          !controlsLocked &&
          !storyBlocksGameplay &&
          !awakeningConsumed &&
          !wallMapConsumed &&
          !restConsumed &&
          !fieldConsumed,
        isAirborne: !this.isGrounded,
        allowGuard: this.isGrounded && this.resolvedLoadout.moveset.commands.guard !== false,
        staminaDeltaSeconds: deltaSeconds,
      },
    );
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
      this.animationTime = advancePlayerAnimationTime(
        this.animationTime,
        deltaSeconds,
        { transitioning: true },
        animationSpeed,
      );
      return;
    }
    if (this.pendingScrapCampaignAction) return;
    if (!isTransitioning && !isRolling) {
      const movementStartX = this.position.x;
      if (!activeAttackProfile && horizontal !== 0) {
        this.facing = Math.sign(horizontal);
      }
      this.position.x += horizontal * CHARACTER_SPEED * combatState.movementScale * deltaSeconds;
      if (!controlsLocked && !storyBlocksGameplay) {
        const rootDelta = (state, from, to) =>
          this.rootMotionCurves[state.id]
            ? sampleRootMotionDelta(this.rootMotionCurves[state.id], from, to, {
                distance: this.rootMotionDistances[state.id] ?? 0,
                facing: this.facing,
                verticalDistance: 0,
              }).x
            : 0;
        if (
          currentCombatState.sequence === combatState.sequence &&
          currentCombatState.id === combatState.id
        ) {
          if (combatState.frame)
            this.position.x += rootDelta(
              combatState,
              currentCombatState.progress,
              combatState.progress,
            );
        } else {
          if (
            currentCombatState.frame &&
            currentCombatState.phase === 'recovery' &&
            ((1 - currentCombatState.progress) * currentCombatState.frame.duration) / 60 <=
              deltaSeconds * animationSpeed + 1e-7
          )
            this.position.x += rootDelta(currentCombatState, currentCombatState.progress, 1);
          if (combatState.frame) this.position.x += rootDelta(combatState, 0, combatState.progress);
        }
      }
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
      this.resolvePlayerEnemyBodyCollision(encounterBeforeStep, movementStartX);
    }
    this.updatePlayerCombatGeometry(combatState);
    this.resolveScrapFinalBattleCombatHit(combatState, activeAttackProfile);
    this.roomSceneNode?.stepEncounter(
      deltaSeconds,
      this.createTrainingEncounterFrame(combatState, activeAttackProfile),
    );

    if (isRolling) {
      const rollStartX = this.position.x;
      this.updateRoll(deltaSeconds);
      const movementBounds = this.getPlayerMovementBounds();
      this.position.x = Math.max(
        movementBounds.minX,
        Math.min(movementBounds.maxX, this.position.x),
      );
      this.resolvePlayerEnemyBodyCollision(
        this.roomSceneNode?.getEncounterGameplaySnapshot() ?? null,
        rollStartX,
      );
    }

    const encounterAfterStep = this.roomSceneNode?.getEncounterGameplaySnapshot() ?? null;
    this.resolvePlayerEnemyBodyCollision(encounterAfterStep, this.previousPosition.x);
    if (
      encounterAfterStep &&
      (encounterAfterStep.slamAttackerBouncePending ||
        encounterAfterStep.groundBounceDelaySeconds > 0)
    ) {
      const comboFacing = this.airComboFacing || this.facing;
      this.position.x = encounterAfterStep.position.x - comboFacing * 30;
      this.facing = comboFacing;
    }
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
    this.verticalVelocity = integratePlayerVerticalVelocity(
      this.verticalVelocity,
      deltaSeconds,
      playerGravityMultiplier,
    );
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
        this.landingRecoverySeconds = 0;
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

    const movementBounds = this.getPlayerMovementBounds();
    this.position.x = Math.max(movementBounds.minX, Math.min(movementBounds.maxX, this.position.x));
    this.updateCameraFollow(deltaSeconds);
    this.animationTime = advancePlayerAnimationTime(
      this.animationTime,
      deltaSeconds,
      { rolling: isRolling, movementIntent: horizontal },
      animationSpeed,
    );
  }

  getCombatSkillReadModel() {
    const progression = this.progressionSnapshot;
    const skill = this.getCombatSkillProfile();
    const maxLevel = this.combatProgressionProfile.maxSkillLevel;
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
      level: progression.combatSkillLevel,
      maxLevel,
      label: skill.label,
      description: skill.description,
      damagePercent: Math.round((skill.damageScale - 1) * 100),
      hitCount: skill.spinHitCount,
      maxAirActions: skill.maxAirActions,
      commandGuide,
      nextLevel: progression.combatSkillLevel >= maxLevel ? null : nextSkillLevel,
      nextGoldCost: nextSkillCost,
      nextTrainingMarkRequirement: nextSkillTrainingMarkRequirement,
      canTrain:
        progression.combatSkillLevel < maxLevel &&
        availableGold >= nextSkillCost &&
        progression.trainingMarks >= nextSkillTrainingMarkRequirement,
      actionLabel:
        progression.combatSkillLevel >= maxLevel
          ? 'MAX'
          : nextSkillTrainingMarkRequirement > 0
            ? `Lv.${nextSkillLevel} · ${nextSkillCost} Gold · 인장 ${nextSkillTrainingMarkRequirement}`
            : `Lv.${nextSkillLevel} · ${nextSkillCost} Gold`,
    });
  }

  getWorldStatus() {
    const map = this.mapRuntime.getResolvedMap();
    const room = this.mapRuntime.getActiveRoom();
    const location = this.mapRuntime.getActiveLocation();
    const roomId = location.roomId;
    const progression = this.progressionSnapshot;
    const encounter = this.roomSceneNode?.getEncounterGameplaySnapshot() ?? null;
    const scrapCampaign = getScrapCampaignReadModel(
      progression.scrapCampaign,
      this.scrapCampaignProfile,
    );
    const gameOverPresentation = getScrapGameOverPresentation(this.scrapGameOverPresentationState);
    const scrapAwakeningLocation =
      map.id === this.scrapAwakeningProfile.mapId && roomId === this.scrapAwakeningProfile.roomId;
    const scrapCampaignRegion = this.scrapCampaignProfile.getRegion(location.regionId);
    const scrapCampaignRegionReadModel = scrapCampaign.regions.find(
      (region) => region.id === scrapCampaignRegion?.id,
    );
    const scrapCampaignRegionLocation = Boolean(scrapCampaignRegion);
    const scrapIntroPresentation =
      scrapCampaign.garageRevealComplete && scrapCampaign.collectedPartCount > 0
        ? Object.freeze({
            title: `차고 조립 갱신 · 로봇 ${scrapCampaign.completionPercent}%`,
            briefing: `${scrapCampaign.collectedPartCount}/${scrapCampaign.totalPartCount} 부품이 원래 산업기계 형태를 유지한 채 조립식 로봇에 장착됐습니다.`,
            objective: '벽 지도에서 다음 지역과 고대 병기의 현재 진로를 확인하세요.',
            cue: `5 REGIONS · ${scrapCampaign.collectedPartCount}/${scrapCampaign.totalPartCount} PARTS · ROBOT ${scrapCampaign.completionPercent}%`,
          })
        : scrapCampaign.awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE
          ? scrapCampaign.garageReveal
          : scrapCampaign.awakening;
    const scrapFinalBattleActive =
      scrapCampaign.finalBattle.stageId !== SCRAP_FINAL_BATTLE_STAGE.INACTIVE;
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
        const incompleteLinkedIssue = scrapCampaign.issueWindow.linked.find(
          (linkedIssue) =>
            linkedIssue.targetRegionId === scrapCampaignRegion.id && !linkedIssue.completed,
        );
        if (incompleteLinkedIssue) {
          return incompleteLinkedIssue.encounterLabel
            ? `${incompleteLinkedIssue.encounterLabel}을 완료해 “${incompleteLinkedIssue.label}” 연결 의뢰를 해결하세요.`
            : incompleteLinkedIssue.objective;
        }
        const pendingPrimaryLinkedIssue = scrapCampaign.issueWindow.linked.find(
          (linkedIssue) => !linkedIssue.completed,
        );
        if (pendingPrimaryLinkedIssue) {
          return (
            scrapCampaign.issueWindow.primary?.objective ?? pendingPrimaryLinkedIssue.objective
          );
        }
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
    const story = scrapFinalBattleActive
      ? Object.freeze({
          beatId: `scrap-final:${scrapCampaign.finalBattle.stageId}`,
          title: scrapCampaign.finalBattle.title,
          briefing: scrapCampaign.finalBattle.cue,
          nextObjective: scrapCampaign.finalBattle.objective,
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
        : scrapAwakeningLocation
          ? Object.freeze({
              beatId:
                scrapCampaign.awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE
                  ? `scrap-garage-reveal:${scrapCampaign.garageRevealStageId}`
                  : `scrap-awakening:${scrapCampaign.awakeningStageId}`,
              title: scrapIntroPresentation.title,
              briefing: scrapIntroPresentation.briefing,
              nextObjective: scrapIntroPresentation.objective,
            })
          : Object.freeze({
              beatId: 'scrap-campaign-travel',
              title: room.label,
              briefing: '',
              nextObjective: '연결로를 따라 다음 현장으로 이동하세요.',
            });
    const dialogue = this.resolveDialogueStatus();
    let objective = story.nextObjective;
    let encounterHint = '';

    if (scrapAwakeningLocation) {
      objective = scrapIntroPresentation.objective;
      encounterHint = scrapIntroPresentation.cue;
    }
    if (scrapFinalBattleActive) {
      objective = scrapCampaign.finalBattle.objective;
      encounterHint = scrapCampaign.finalBattle.cue;
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

    return Object.freeze({
      areaName: scrapCampaignRegionLocation ? room.label : `${map.name} · ${room.label}`,
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
      journeyLabel: scrapFinalBattleActive
        ? scrapCampaign.finalBattle.title
        : scrapAwakeningLocation
          ? scrapCampaign.awakeningActive
            ? '고대 병기 각성 연출'
            : scrapCampaign.garageRevealActive
              ? '고물상 분석 · 차고 개방'
              : scrapCampaign.garageRevealComplete
                ? scrapCampaign.collectedPartCount > 0
                  ? `차고 조립 갱신 · 로봇 ${scrapCampaign.completionPercent}%`
                  : '작전 준비 완료 · 로봇 0%'
                : scrapCampaign.deadlineRevealed
                  ? '각성 완료 · D-30 · 고물상 복귀'
                  : scrapIntroPresentation.title
          : scrapCampaignRegionLocation
            ? `${scrapCampaignRegion.label} · ${scrapCampaignRegionReadModel.statusLabel}`
            : room.label,
      wardLabel: scrapFinalBattleActive
        ? `제어핵 · ${scrapCampaign.finalBattle.stageId}`
        : scrapAwakeningLocation
          ? scrapCampaign.garageRevealComplete
            ? scrapCampaign.collectedPartCount > 0
              ? `${scrapCampaign.collectedPartCount}/${scrapCampaign.totalPartCount} 부품 · 로봇 ${scrapCampaign.completionPercent}%`
              : '제어핵 · 우리 로봇 두뇌 장착'
            : scrapCampaign.awakeningStageId === SCRAP_AWAKENING_STAGE.COMPLETE
              ? '회수한 제어핵 · 고물상 분석 대기'
              : scrapCampaign.deadlineRevealed
                ? '회수한 제어핵 · 보유 중'
                : '제어핵 · 폐병기 흉곽 안'
          : scrapCampaignRegionLocation
            ? scrapCampaignRegionReadModel.collected
              ? `${scrapCampaignRegionReadModel.partLabel} · 차고 로봇 ${scrapCampaign.completionPercent}%`
              : `${scrapCampaignRegion.machineLabel} · ${scrapCampaignRegionReadModel.eventStageLabel}`
            : '현장 이동',
      timePhase: this.timePhase,
      timeLabel: `Day ${scrapCampaign.day} · ${scrapCampaign.phaseLabel}`,
      deadlineLabel: scrapCampaign.deadlineLabel,
      campaign: scrapCampaign,
      gameOverPresentation,
      operationMapAvailable:
        !scrapCampaign.gameOver && (!scrapAwakeningLocation || scrapCampaign.garageRevealComplete),
      roomId,
      canManageProgression: this.canManageProgression(),
      activeEnchantId:
        progression.enchantment.equipmentEnchantments[progression.loadout.weaponItemId].elementId,
      activeEnchantLevel:
        progression.enchantment.equipmentEnchantments[progression.loadout.weaponItemId].level,
      activeEnchantLabel: (() => {
        const record =
          progression.enchantment.equipmentEnchantments[progression.loadout.weaponItemId];
        return record.elementId
          ? `${this.enchantmentCatalog.getProfile(record.elementId).label} Lv.${record.level}`
          : '미활성';
      })(),
      equipmentId: this.resolvedLoadout.mainItem.id,
      equipmentLabel: this.resolvedLoadout.mainItem.label,
      equipmentForge: Object.freeze({
        materialLabel: this.combatProgressionProfile.equipmentForge.materialLabel,
        materialQuantity:
          progression.equipmentForge.materialQuantities[
            this.combatProgressionProfile.equipmentForge.materialId
          ] ?? 0,
        selectedProfileId:
          progression.equipmentForge.selectedItemIdsByGroup[
            this.combatProgressionProfile.equipmentForge.choiceGroupId
          ] ?? null,
      }),
      combatSkill: this.getCombatSkillReadModel(),
      progressionNotice: this.progressionNotice,
      acquisitionFeed: this.acquisitionFeedback?.snapshot() ?? [],
      fieldPrompt: this.chooseFieldInteraction()?.label ?? null,
      questOutcomes: createQuestEpilogueReadModel(progression.quests).outcomes,
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
          this.progressionSnapshot.enchantment.equipmentEnchantments[
            this.progressionSnapshot.loadout.weaponItemId
          ];
        return record.elementId
          ? `${this.enchantmentCatalog.getProfile(record.elementId).label} Lv.${record.level}`
          : '인챈트 없음';
      })(),
    });
  }

  createRenderFrame(interpolationAlpha) {
    const measurePerformance = this.renderPerformanceEnabled === true;
    const frameBuildStarted = measurePerformance ? performance.now() : 0;
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
    const contactProfile = this.getAttackHitProfile(combatState.id);
    const poseStarted = measurePerformance ? performance.now() : 0;
    const pose = this.sampleSizedPlayerMotionPose(
      Object.freeze({
        motionState: poseCombatState,
        boneInput: Object.freeze({
          animationTime: renderAnimationTime,
          movementIntent: this.movementIntent,
          isGrounded: this.isGrounded,
          verticalVelocity: this.verticalVelocity,
          landingRecovery: this.landingRecoverySeconds / LANDING_RECOVERY_SECONDS,
          hitstunProgress: this.playerHitstunSeconds / PLAYER_MOTION_PROFILE.hitReactionSeconds,
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
    const poseMilliseconds = measurePerformance ? performance.now() - poseStarted : 0;
    const geometryStarted = measurePerformance ? performance.now() : 0;
    let renderCombatGeometry = sampleSharedPlayerCombatGeometry({
      position: renderPosition,
      facing: this.facing,
      targetPose: pose.targetPose,
      bonePose: pose.bonePose,
      geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
      weaponLengthScale: this.getPresentationWeaponLengthScale(poseCombatState.id),
      hurtProfile: this.characterAnimationSettings.hurtProfile,
    });
    renderCombatGeometry = this.applySvgPlayerGeometry(
      renderCombatGeometry,
      pose,
      renderPosition,
      characterRenderOrder,
    );
    // A damaging frame must render the exact geometry that the encounter samples.
    // Interpolation is useful for ordinary motion, but a second pose sample here can
    // visually move a blade away from the sweep that just resolved a hit.  The fixed
    // simulation sample already includes the current root, pose and SVG attachments.
    if (contactGeometry && isAttackContactFrame(combatState, contactProfile)) {
      renderCombatGeometry = contactGeometry;
    }
    const playerPresentation = createPlayerCombatPresentation(
      Object.freeze({
        position: renderPosition,
        facing: this.facing,
        targetPose: pose.targetPose,
        bonePose: pose.bonePose,
        combatGeometry: renderCombatGeometry,
        renderScale: characterRenderScale,
        renderOrder: characterRenderOrder,
        weaponLengthScale: this.getPresentationWeaponLengthScale(poseCombatState.id),
        contactGeometry,
        contactProfile,
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
    const characterItems = applyEquipmentPresentation(
      renderCombatGeometry.svgPresentation?.items ?? playerPresentation.characterItems,
      this.resolvedLoadout,
      {
        bonePose: pose.bonePose,
        position: renderPosition,
        facing: this.facing,
        scale: characterRenderScale,
        renderOrder: characterRenderOrder,
      },
    );
    const { combatEffectItems } = playerPresentation;
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
    const artDirection = createSceneArtDirectionReadModel(this.artDirectionProfile, {
      roomId: activeRoom.id,
      combatEvents,
      player: {
        position: renderPosition,
        groundY: activeRoom.groundY,
        scale: characterRenderScale,
      },
      enemy: encounterRender.enemy
        ? {
            position: encounterRender.enemy.position,
            groundY: activeRoom.groundY,
            width: encounterRender.enemy.posture ? 92 : 58,
            height: encounterRender.enemy.posture ? 112 : 86,
          }
        : null,
    });
    const scrapFinalBattleItems = createScrapFinalBattlePresentation(
      this.progressionSnapshot.scrapCampaign.finalBattleStageId,
    );
    const runtimeCast = createRuntimeCastPresentation(
      mapSnapshot.entities,
      renderAnimationTime,
      activeRoom.renderOrder + 0.4,
    );
    const items = Object.freeze(
      [
        ...mapSnapshot.renderItems,
        ...(this.fieldQuests?.renderItems() ?? []),
        ...(this.acquisitionFeedback?.renderItems(renderPosition) ?? []),
        ...scrapFinalBattleItems,
        ...encounterItems,
        ...runtimeCast.items,
        ...characterItems,
        ...combatEffectItems,
        ...(this.visualQaCombatOverlay
          ? [
              [renderCombatGeometry.weapon, '#ffffff'],
              [contactGeometry?.weapon, '#00ffff'],
              [contactGeometry?.shield, '#6688ff'],
              [contactGeometry?.sweep, '#ffcc00'],
              [
                encounterRender.contact?.position
                  ? {
                      part: 'contact-point',
                      points: Object.freeze(
                        [
                          [-3, -3],
                          [3, -3],
                          [3, 3],
                          [-3, 3],
                        ].map(([x, y]) =>
                          Object.freeze({
                            x: encounterRender.contact.position.x + x,
                            y: encounterRender.contact.position.y + y,
                          }),
                        ),
                      ),
                    }
                  : null,
                '#66ff44',
              ],
              ...(encounterRender.geometry?.semanticHurt ?? []).map((shape) => [
                shape,
                {
                  body: '#ff4488',
                  weak: '#ffcc00',
                  armor: '#aaaaaa',
                  guard: '#66ccff',
                  immune: '#bb88ff',
                }[shape.response] ?? '#ff4488',
              ]),
            ]
              .filter(([shape]) => shape)
              .map(([shape, color], index) =>
                Object.freeze({
                  id: `qa-contact-${index}-${shape.part}`,
                  points: shape.points,
                  fill: color,
                  stroke: color,
                  lineWidth: 1,
                  opacity: 0.3,
                  renderOrder: activeRoom.renderOrder + 10,
                  order: index,
                }),
              )
          : []),
      ]
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
    const rawRenderFrame = Object.freeze({
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
      equipment: this.resolvedLoadout,
      fieldAssistance: this.lastFieldAssistance ?? null,
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
      combatGeometry: Object.freeze({
        svgPresentation: renderCombatGeometry.svgPresentation?.diagnostics ?? null,
        visibleWeapon: renderCombatGeometry.weapon,
        visibleShield: renderCombatGeometry.shield,
        authoritativeWeapon: contactGeometry?.weapon ?? null,
        authoritativeShield: contactGeometry?.shield ?? null,
        activeSweep: contactGeometry?.sweep ?? null,
        enemyHurt: encounterRender.geometry?.hurt ?? Object.freeze([]),
        semanticHurt: encounterRender.geometry?.semanticHurt ?? Object.freeze([]),
        attackInstance: combatState.sequence,
        phase: combatState.phase,
        targetId: encounterRender.enemy?.id ?? null,
        consumedHitKey: this.roomSceneNode?.encounter?.lastHitMotionSequence ?? null,
      }),
      player: Object.freeze({
        presentationProfileId: this.playerPresentationProfile.id,
        position: renderPosition,
        facing: this.facing,
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
      castCharacters: runtimeCast.samples,
      artDirection,
      scenePresentationForView: this.scenePresentation
        ? (viewAt) => this.scenePresentation.snapshotProjected(viewAt)
        : null,
      items,
    });
    const renderFrame = applyCampaignTimePresentation(rawRenderFrame, {
      phaseId: this.visualQaTimePhase ?? this.getScrapAwakeningReadModel().phaseId,
      player: renderPosition,
      fieldCapabilities: this.resolvedLoadout.fieldCapabilities,
      workLights: this.fieldQuests?.workLights?.() ?? [],
    });
    if (measurePerformance) {
      this.lastRenderBuildTimings = Object.freeze({
        poseMilliseconds,
        geometryMilliseconds: performance.now() - geometryStarted,
        frameBuildMilliseconds: performance.now() - frameBuildStarted,
      });
    }
    this.renderFrameCreated.emit(renderFrame);
    return renderFrame;
  }
}
