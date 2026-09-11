import { sampleFieldQuestResource } from './FieldQuestResources.js';
import { applyEquipmentPresentation, equipmentSlotForGraphic } from './EquipmentPresentation.js';
import { canonicalizeEnchantmentSnapshot } from '../game/enchantment/EnchantmentState.js';
import { EQUIPMENT_SLOT_KEYS } from '../game/equipment/EquipmentLoadout.js';
import { sampleSvgResource } from './SvgResourceSample.js';
import { createGameScene } from '../app/createGameScene.js';
import { CombatEventBuffer } from '../combat/CombatEvent.js';
import { sampleCombatFrame } from '../combat/CombatFrame.js';
import {
  PLAYER_MOTION_PROFILE,
  advancePlayerAnimationTime,
  integratePlayerVerticalVelocity,
  playerJumpPhaseTiming,
} from '../animation/PlayerMotionProfile.js';
import { sampleEnemyBonePoseFor } from '../animation/EnemyBonePoseLibrary.js';
import { sampleEnemyReference } from './EnemyReferenceModel.js';
import { ENEMY_REFERENCE_PROFILES } from './EnemyReferenceProfiles.js';
import { SIDE_VIEW_SKELETON_PARENTS } from '../animation/SkeletonPoseProjection.js';
import {
  PLAYER_COMBAT_GEOMETRY_SCALE,
  PLAYER_CHARACTER_FOOT_OFFSET,
  samplePlayerCombatGeometry,
  projectPlayerSkeleton,
  sampleTrainingEnemyCombatGeometry,
  createSweptWeaponGeometry,
} from '../combat/SharedCombatGeometry.js';
import { createPlayerCombatPresentation } from '../game/PlayerCombatPresentation.js';
import { createTrainingEnemyItems } from '../game/training/TrainingEncounterPresentation.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../game/training/TrainingEnemyAttackProfiles.js';
import { ENCOUNTER_PROFILES } from '../game/encounter/EncounterProfiles.js';
import { ENCHANTMENT_CATALOG } from '../game/enchantment/EnchantmentCatalog.js';
import { EQUIPMENT_CATALOG } from '../game/equipment/EquipmentCatalog.js';
import { createProgressionSnapshot } from '../game/progression/ProgressionState.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../game/campaign/ScrapCampaignProfiles.js';
import { createScrapFinalBattlePresentation } from '../game/campaign/ScrapFinalBattlePresentation.js';
import { createSceneArtDirectionReadModel } from '../game/ScrapArtDirectionProfiles.js';
import { deepFreeze } from '../game/map/MapDefinition.js';
import { GRAPHICS_EFFECT_DEFINITIONS } from './GraphicsResourceCatalog.js';
import { sampleCastCharacterPresentation } from '../game/character/CastCharacterPresentation.js';

const BENCHMARK_ROOM = Object.freeze({
  regionId: 'abandoned-mine',
  roomId: 'abandoned-mine-rescue-tunnel',
});
const EMPTY = Object.freeze([]);

export function graphicsBounds(items) {
  const visible = items.filter((item) => (item.opacity ?? 1) > 0 && item.enabled !== false);
  const points = visible.flatMap((item) => [
    ...(item.points ?? []),
    ...(item.surface?.points ?? []),
  ]);
  if (!points.length) return Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
  const margin = Math.max(2, ...visible.map((item) => item.lineWidth ?? 1));
  const minX = Math.min(...points.map((point) => point.x)) - margin;
  const minY = Math.min(...points.map((point) => point.y)) - margin;
  return Object.freeze({
    x: minX,
    y: minY,
    width: Math.max(1, Math.max(...points.map((point) => point.x)) + margin - minX),
    height: Math.max(1, Math.max(...points.map((point) => point.y)) + margin - minY),
  });
}

function mergeFacts(base, next) {
  const result = { ...base };
  for (const [key, value] of Object.entries(next ?? {})) {
    result[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? mergeFacts(base[key] ?? {}, value)
        : value;
  }
  return result;
}

export function graphicsPlayerMotionInput(actionId, index, count, action = {}) {
  const progress = index / Math.max(1, count);
  const seconds = index / PLAYER_MOTION_PROFILE.frameRate;
  const airborneElapsed =
    (actionId === 'fall'
      ? playerJumpPhaseTiming().apexTick / PLAYER_MOTION_PROFILE.simulationRate
      : 0) + seconds;
  const input = {
    motionState: { id: 'idle', progress: 0 },
    boneInput: {
      animationTime: advancePlayerAnimationTime(0, airborneElapsed, {
        movementIntent: actionId === 'run' ? 1 : 0,
        rolling: actionId === 'roll',
      }),
      movementIntent: 0,
      isGrounded: true,
      verticalVelocity: 0,
    },
  };
  switch (actionId) {
    case 'static':
    case 'idle':
      break;
    case 'run':
      input.boneInput.movementIntent = 1;
      break;
    case 'jump':
      input.boneInput.isGrounded = false;
      input.boneInput.verticalVelocity = integratePlayerVerticalVelocity(
        -PLAYER_MOTION_PROFILE.jumpSpeed,
        seconds,
      );
      break;
    case 'fall':
      input.boneInput.isGrounded = false;
      input.boneInput.verticalVelocity = integratePlayerVerticalVelocity(
        -PLAYER_MOTION_PROFILE.jumpSpeed,
        airborneElapsed,
      );
      break;
    case 'landing':
      input.boneInput.landingRecovery = 1 - progress;
      break;
    case 'roll':
      input.boneInput.rollProgress = progress;
      break;
    case 'hit':
      input.boneInput.hitstunProgress = Math.max(
        0,
        (PLAYER_MOTION_PROFILE.hitReactionSeconds - seconds) /
          PLAYER_MOTION_PROFILE.hitReactionSeconds,
      );
      break;
    case 'block':
      input.motionState.id = 'guard';
      input.boneInput.blockstunProgress = Math.max(
        0,
        (action.durationSeconds - seconds) / action.durationSeconds,
      );
      input.boneInput.blockStrength = action.blockStrength;
      break;
    case 'knocked-out':
      input.boneInput.knockedOut = true;
      break;
    default:
      input.motionState = { id: actionId, progress };
      break;
  }
  if (actionId.startsWith('air')) input.boneInput.isGrounded = false;
  return deepFreeze(input);
}

function frameWithItems(
  base,
  items,
  { lighting, animationTime = 0, combatEvents = EMPTY, artDirection, ...extra } = {},
) {
  return deepFreeze({
    ...base,
    ...extra,
    animationTime,
    combatEvents,
    artDirection:
      lighting === 'unlit' ? null : artDirection === undefined ? base.artDirection : artDirection,
    items: [...items]
      .filter((item) => item.enabled !== false)
      .sort(
        (left, right) =>
          (left.renderOrder ?? 0) - (right.renderOrder ?? 0) ||
          (left.order ?? 0) - (right.order ?? 0) ||
          left.id.localeCompare(right.id),
      ),
  });
}

export function createGraphicsResourceSampler(catalog) {
  const scenes = new Map();
  const mapSamples = new Map();
  const enemyBases = new Map();
  let disposed = false;

  function sceneFor(equipmentId = EQUIPMENT_CATALOG.defaultItemId) {
    if (disposed) throw new Error('GraphicsResourceSampler가 이미 종료됐습니다.');
    if (!scenes.has(equipmentId)) {
      const scene = createGameScene({
        progressionSnapshot: (() => {
          const base = createProgressionSnapshot(
            EQUIPMENT_CATALOG.defaultItemId,
            ENCHANTMENT_CATALOG,
            SCRAP_CAMPAIGN_PROFILE,
          );
          const item = EQUIPMENT_CATALOG.getItem(equipmentId),
            family = EQUIPMENT_CATALOG.getFamily(item.familyId);
          const ownedEquipmentItemIds = [...new Set([...base.ownedEquipmentItemIds, equipmentId])];
          return {
            ...base,
            ownedEquipmentItemIds,
            everOwnedEquipmentItemIds: ownedEquipmentItemIds,
            loadout: { ...base.loadout, [EQUIPMENT_SLOT_KEYS[family.slot]]: equipmentId },
            enchantment: canonicalizeEnchantmentSnapshot(
              base.enchantment,
              ENCHANTMENT_CATALOG,
              ownedEquipmentItemIds,
            ),
          };
        })(),
      });
      scenes.set(equipmentId, scene);
    }
    return scenes.get(equipmentId);
  }

  function mapSample(resource, action, lighting = 'scene') {
    const { regionId, roomId } = resource.roomId ? resource : BENCHMARK_ROOM;
    const key = `${regionId}/${roomId}/${lighting}/${resource.producer === 'final' ? `final:${action.id}` : (action?.patchId ?? 'base')}`;
    if (mapSamples.has(key)) return mapSamples.get(key);
    const scene = resource.producer === 'final' ? createGameScene() : sceneFor();
    try {
      scene.reset();
      if (action?.facts)
        scene.mapRuntime.setWorldContext(
          mergeFacts(scene.mapRuntime.getWorldContext(), action.facts),
        );
      scene.setVisualQaLocation({ regionId, roomId, x: 480 });
      if (resource.producer === 'final') {
        for (const region of scene.scrapCampaignProfile.regions)
          scene.setVisualQaScrapRegionState({
            regionId: region.id,
            stageKind: 'campaign-updated',
            status: 'resolved',
            collected: true,
            currentLocationId: scene.scrapCampaignProfile.startLocation.id,
          });
        scene.setVisualQaScrapFinalBattleStage(action.id);
      }
      if (lighting === 'day' || lighting === 'night') scene.setVisualQaTimePhase(lighting);
      const sample = Object.freeze({
        frame: scene.createRenderFrame(1),
        room: scene.mapRuntime.getActiveRoom(),
        mapItems: scene.mapRuntime.getResolvedSnapshot().renderItems,
        facts: scene.mapRuntime.getWorldContext(),
      });
      mapSamples.set(key, sample);
      return sample;
    } finally {
      if (resource.producer === 'final') scene.dispose();
    }
  }

  function playerSample(resource, action, index, facing, position, events = EMPTY, effect = null) {
    const scene = sceneFor(resource.equipmentId);
    const input = graphicsPlayerMotionInput(action.id, index, action.frameCount, action);
    const pose = scene.sampleSizedPlayerMotionPose(input);
    const sampleGeometry = (sampledPose) =>
      samplePlayerCombatGeometry({
        position,
        facing,
        targetPose: sampledPose.targetPose,
        bonePose: sampledPose.bonePose,
        geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
        weaponLengthScale: scene.getPresentationWeaponLengthScale(input.motionState.id),
      });
    const geometry = sampleGeometry(pose);
    const contactProfile = scene.getAttackHitProfile(input.motionState.id);
    let sweep = null;
    if (
      contactProfile &&
      input.motionState.progress >= contactProfile.start &&
      input.motionState.progress < contactProfile.end
    ) {
      let history = [];
      // Match GameScene's three 120 Hz samples, rather than drawing a decorative
      // trail spanning the whole action or enlarging its authoritative range.
      for (let step = Math.max(0, index * 2 - 2); step <= index * 2; step += 1) {
        const timing = sampleCombatFrame(
          scene.combatCommands.getMotionFrameData(input.motionState.id),
          step / PLAYER_MOTION_PROFILE.simulationRate,
        );
        const progress = timing.progress;
        if (progress < contactProfile.start) continue;
        const previousPose = scene.sampleSizedPlayerMotionPose({
          ...input,
          motionState: { ...input.motionState, progress, frame: timing },
        });
        const previous = sampleGeometry(previousPose);
        const sampled = createSweptWeaponGeometry({
          current: contactProfile.contactPart === 'shield' ? previous.shield : previous.weapon,
          history,
        });
        history = sampled.history;
        sweep = sampled.swept;
      }
    }
    const time = index / 60;
    const presentation = createPlayerCombatPresentation({
      position,
      facing,
      targetPose: pose.targetPose,
      bonePose: pose.bonePose,
      combatGeometry: geometry,
      renderScale: PLAYER_COMBAT_GEOMETRY_SCALE,
      renderOrder: 30.5,
      enemyRenderOrder: 30.45,
      weaponLengthScale: scene.getPresentationWeaponLengthScale(input.motionState.id),
      contactGeometry: { ...geometry, sweep },
      contactProfile,
      contactProgress: input.motionState.progress,
      appearanceProfile: scene.playerPresentationProfile,
      combatEvents: events,
      blockImpactSeconds:
        effect && ['guard', 'guard-break'].includes(effect.id)
          ? Math.max(0, (effect.id === 'guard-break' ? 0.22 : 0.14) - time)
          : 0,
      blockImpactStrength:
        (effect?.id === 'guard-break' ? 1.35 : TRAINING_ENEMY_ATTACK_PROFILES.light.blockStrength) *
        scene.resolvedLoadout.guardModifiers.impactScale,
      retaliationSeconds: effect?.id === 'retaliation' ? Math.max(0, 0.3 - time) : 0,
      activeEnchant: effect?.blade ? ENCHANTMENT_CATALOG.getProfile(effect.enchantId) : null,
    });
    return {
      presentation: {
        ...presentation,
        characterItems: applyEquipmentPresentation(
          presentation.characterItems,
          scene.resolvedLoadout,
          {
            bonePose: pose.bonePose,
            position,
            facing,
            scale: PLAYER_COMBAT_GEOMETRY_SCALE,
            renderOrder: 30.5,
          },
        ),
      },
      pose,
      geometry,
      input,
      contactProfile,
      sweep,
    };
  }

  function baseEnemy(profileId) {
    if (!enemyBases.has(profileId)) {
      const scene = sceneFor();
      const encounter = scene.encounterFactory({
        entity: {
          id: `review:${profileId}`,
          kind: 'combat-enemy',
          encounterProfileId: profileId,
          position: { x: 480, y: 426 },
        },
        groundY: 426,
        movementBounds: { minX: -1000, maxX: 3000 },
        spinContact: scene.getAttackHitProfile('spin'),
      });
      enemyBases.set(profileId, encounter.createRenderSnapshot(30.45).presentationState);
      encounter.dispose();
    }
    return enemyBases.get(profileId);
  }

  function enemySample(resource, action, index, facing, position, effect = null) {
    const profileId =
      resource.profileId ??
      (effect?.enemyEffect === 'flee' || action.id === 'surrender'
        ? 'dock-salvage-raider'
        : 'mine-collapse-boss');
    const profile = ENCOUNTER_PROFILES[profileId];
    const base = baseEnemy(profileId);
    const attackKind = action.attackKind ?? 'light';
    const attack = TRAINING_ENEMY_ATTACK_PROFILES[attackKind];
    const elapsed = index / 60;
    const state = {
      ...base,
      position: { ...position },
      groundY: position.y,
      facing,
      attackFacing: facing,
      attackKind,
      recoveryDurationSeconds: attack.recoverySeconds,
    };
    if (action.phase) {
      state.aiState = action.phase;
      state.aiSeconds = Math.max(0, attack[`${action.phase}Seconds`] - elapsed);
    } else if (action.id === 'advance') {
      state.aiState = 'approach';
      state.position.x += profile.approachSpeed * elapsed * facing;
    } else if (action.id === 'hit') {
      state.aiState = 'hitstun';
      state.aiSeconds = 0.18;
      state.hitstunSeconds = 0.18;
      state.hitFlashSeconds = 0.12;
    } else if (action.id === 'guard') state.aiState = 'guard';
    else if (action.id === 'surrender') {
      state.aiState = 'surrendered';
      state.resolutionState = profile.completionDisposition === 'flee' ? 'fleeing' : 'surrendered';
      if (profile.completionDisposition === 'defeated' || !profile.completionDisposition) {
        state.aiState = 'hitstun';
        state.resolutionState = 'active';
        state.health = 0;
        state.resetSeconds = 1;
      }
    } else state.aiSeconds = Math.max(0, 0.45 - elapsed);
    const remaining = Math.max(0, 0.3 - elapsed);
    if (effect?.enemyEffect === 'groundImpact')
      state.groundImpactSeconds = Math.max(0, 0.22 - elapsed);
    if (effect?.enemyEffect === 'retaliation') state.retaliationInvulnerableSeconds = remaining;
    if (effect?.enemyEffect === 'groggy')
      state.posture = { ...state.posture, ratio: 0, groggy: true, groggySeconds: remaining };
    if (effect?.enemyEffect === 'weakPoint')
      state.weakPoint = { ...state.weakPoint, exposed: true };
    if (effect?.enemyEffect === 'flee') {
      state.resolutionState = 'fleeing';
      state.resolutionDirection = facing;
    }
    if (effect?.enemyEffect === 'enchant')
      state.enchantStatus = {
        ...ENCHANTMENT_CATALOG.getProfile(effect.enchantId),
        remainingSeconds: remaining,
      };
    if (effect?.enemyEffect === 'punishWindow') state.punishWindowOpen = true;
    if (effect?.enemyEffect === 'guardContact') {
      state.aiState = 'guard';
      state.hitFlashSeconds = Math.max(0, 0.08 - elapsed);
    }
    if (effect?.enemyEffect === 'heavyWarning') {
      state.attackKind = 'heavy';
      state.aiState = 'windup';
      state.aiSeconds = TRAINING_ENEMY_ATTACK_PROFILES.heavy.windupSeconds - elapsed;
    }
    if (effect?.enemyEffect === 'antiAir') {
      state.attackKind = 'antiAir';
      state.aiState = 'attack';
      state.aiSeconds = TRAINING_ENEMY_ATTACK_PROFILES.antiAir.attackSeconds - elapsed;
    }
    if (resource.producer === 'enemy-status') {
      if (action.id === 'low-health') state.health = state.maxHealth * 0.2;
      if (action.id === 'posture') state.posture = { ...state.posture, ratio: 0.45 };
      if (action.id === 'groggy')
        state.posture = { ...state.posture, ratio: 0, groggy: true, groggySeconds: 0.5 };
    }
    const frozenState = deepFreeze(state);
    const geometry = sampleTrainingEnemyCombatGeometry(frozenState, TRAINING_ENEMY_ATTACK_PROFILES);
    const items = createTrainingEnemyItems(
      frozenState,
      30.45,
      TRAINING_ENEMY_ATTACK_PROFILES,
      geometry,
      sceneFor().characterPresentationCatalog.getProfile(profile.presentationProfileId),
    );
    return {
      state: frozenState,
      geometry,
      items,
      sourceFrameId: sampleEnemyBonePoseFor(frozenState, TRAINING_ENEMY_ATTACK_PROFILES).frameId,
    };
  }

  function castSample(resource, action, index, facing, position) {
    const input = graphicsPlayerMotionInput(action.id, index, action.frameCount, action);
    const cast = sampleCastCharacterPresentation({
      profileId: resource.presentationProfileId,
      bodyProfileId: resource.bodyProfileId,
      motionState: input.motionState,
      boneInput: input.boneInput,
      position,
      facing,
    });
    return {
      ...cast,
      input,
      sourceFrameId: cast.pose.bonePose.frameId,
      boneDiagnostics: Object.entries(
        projectPlayerSkeleton({
          position,
          facing,
          geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
          bonePose: cast.pose.bonePose,
        }),
      ).map(([id, jointPosition]) => ({
        id: `${resource.presentationProfileId}:${id}`,
        parent: SIDE_VIEW_SKELETON_PARENTS[id]
          ? `${resource.presentationProfileId}:${SIDE_VIEW_SKELETON_PARENTS[id]}`
          : null,
        position: jointPosition,
      })),
    };
  }

  function sample(resourceId, options = {}) {
    if (disposed) throw new Error('GraphicsResourceSampler가 이미 종료됐습니다.');
    const resource = catalog.get(resourceId);
    if (!resource) throw new Error(`알 수 없는 그래픽 resource: ${resourceId}`);
    const action = resource.actions.find(
      (candidate) => candidate.id === (options.actionId ?? resource.actions[0].id),
    );
    if (!action) throw new Error(`알 수 없는 그래픽 action: ${options.actionId}`);
    const index = options.frameIndex ?? 0;
    if (!Number.isSafeInteger(index) || index < 0 || index >= action.frameCount)
      throw new RangeError(`유효하지 않은 그래픽 frame: ${index}`);
    const facing = options.facing ?? 1;
    if (![-1, 1].includes(facing)) throw new RangeError('그래픽 facing은 -1 또는 1입니다.');
    const view = resource.kind === 'scene' ? 'scene' : (options.view ?? 'isolated');
    const lighting = options.lighting ?? 'scene';
    if (resource.producer === 'field-quest')
      return sampleFieldQuestResource(resource, action, { ...options, facing, lighting });
    const base = mapSample(resource, action, lighting);
    if (resource.producer === 'svg')
      return sampleSvgResource(resource, action, { ...options, facing, lighting }, base.frame);
    let boneDiagnostics = [];
    const actorPosition = {
      x: base.frame.player.position.x,
      y: base.room.groundY - PLAYER_CHARACTER_FOOT_OFFSET,
    };
    const sourceEntity = resource.entityId
      ? base.room.entities.find((entity) => entity.id === resource.entityId)
      : null;
    const enemyPosition = sourceEntity?.position ?? {
      x: actorPosition.x + 90,
      y: base.room.groundY,
    };
    let items,
      sourceFrameId = action.patchId ?? null,
      extra = {},
      notes = resource.notes ?? '';
    let producerEffectGroups = null;
    if (sourceEntity?.enabled === false)
      notes +=
        ' · 원본 배치 entity는 현재 장면 조건에서 비활성입니다. 해당 위치·profile의 검토 표본을 표시합니다.';
    if (resource.producer === 'cast') {
      const cast = castSample(resource, action, index, facing, actorPosition);
      items = cast.items;
      sourceFrameId = cast.sourceFrameId;
      boneDiagnostics = cast.boneDiagnostics;
      extra = {
        animationTime: cast.input.boneInput.animationTime,
        castReview: {
          referenceGroupId: resource.referenceGroupId,
          approvalStatus: resource.approvalStatus,
          profileId: cast.profileId,
          bodyProfileId: cast.bodyProfileId,
        },
      };
    } else if (resource.producer === 'cast-lineup') {
      const lineup = [
        {
          profileId: 'scrapyard-apprentice',
          bodyProfileId: 'player',
          position: { x: actorPosition.x - 112, y: actorPosition.y },
        },
        {
          profileId: 'rival-scout',
          bodyProfileId: 'rival',
          position: { x: actorPosition.x, y: actorPosition.y },
        },
        {
          profileId: 'scrapyard-owner',
          bodyProfileId: 'owner',
          position: { x: actorPosition.x + 112, y: actorPosition.y },
        },
      ];
      const hero = playerSample(resource, action, index, facing, lineup[0].position);
      const castMembers = lineup.slice(1).map((member) =>
        castSample(
          {
            ...resource,
            presentationProfileId: member.profileId,
            bodyProfileId: member.bodyProfileId,
          },
          action,
          index,
          facing,
          member.position,
        ),
      );
      items = [
        ...hero.presentation.characterItems,
        ...castMembers.flatMap((member) => member.items),
      ];
      sourceFrameId = [
        hero.pose.bonePose.frameId,
        ...castMembers.map((member) => member.sourceFrameId),
      ].join('|');
      boneDiagnostics = castMembers.flatMap((member) => member.boneDiagnostics);
      extra = {
        animationTime: hero.input.boneInput.animationTime,
        castReview: {
          referenceGroupId: resource.referenceGroupId,
          approvalStatus: resource.approvalStatus,
          profiles: lineup.map(({ profileId, bodyProfileId }) => ({ profileId, bodyProfileId })),
        },
      };
    } else if (resource.producer === 'map') {
      const selected = base.room.renderItems.filter((item) => resource.itemIds.includes(item.id));
      if (view === 'scene') {
        items = base.frame.items;
        const hidden = selected.filter((item) => item.enabled === false).length;
        if (hidden)
          notes += ` · 선택 ${hidden}개는 현재 장면 조건에서 비활성입니다. 개별 보기에서 원본을 확인하세요.`;
      } else items = selected.map((item) => Object.freeze({ ...item, enabled: true, parallax: 1 }));
    } else if (resource.producer === 'final') {
      items =
        view === 'scene'
          ? base.frame.items
          : createScrapFinalBattlePresentation(action.id).filter((item) =>
              resource.itemIds.includes(item.id),
            );
      sourceFrameId = action.id;
    } else if (resource.producer === 'enemy-reference') {
      const reference = sampleEnemyReference(resource.referenceId, {
        action: action.id,
        frameIndex: index,
        position: enemyPosition,
        facing,
      });
      items = reference.items;
      sourceFrameId = reference.frameId;
      const nodes = ENEMY_REFERENCE_PROFILES.find(
        (profile) => profile.id === resource.referenceId,
      ).nodes;
      boneDiagnostics = nodes.map((node) => ({
        id: node.id,
        parent: node.parent,
        position: reference.bones[node.id].origin,
      }));
    } else if (resource.producer === 'enemy' || resource.producer === 'enemy-status') {
      const enemy = enemySample(resource, action, index, facing, enemyPosition);
      items =
        resource.producer === 'enemy-status'
          ? enemy.items.filter((item) => /combat-enemy-(health|posture|resolution)/.test(item.id))
          : enemy.items;
      sourceFrameId = enemy.sourceFrameId;
      boneDiagnostics = Object.entries(enemy.geometry.presentation.skeleton).map(
        ([id, position]) => ({ id, parent: SIDE_VIEW_SKELETON_PARENTS[id], position }),
      );
      extra = {
        combatEnemy: enemy.state,
        combatGeometry: { ...base.frame.combatGeometry, enemyHurt: enemy.geometry.hurt },
      };
    } else if (resource.producer === 'effect') {
      const effect = GRAPHICS_EFFECT_DEFINITIONS.find(
        (candidate) => candidate.id === resource.effectId,
      );
      if (effect.enemyEffect) {
        const enemy = enemySample(resource, action, index, facing, enemyPosition, effect);
        const patterns = {
          groundImpact: /combat-enemy-impact-/,
          retaliation: /combat-enemy-retaliation-/,
          groggy: /combat-enemy-posture-/,
          weakPoint: /combat-enemy-weak-point-/,
          flee: /combat-enemy-human-flee-dust/,
          enchant: /combat-enemy-enchant-aura-/,
          heavyWarning: /combat-enemy-heavy-warning/,
          antiAir: /combat-enemy-(weapon-glow|anti-air-trail)/,
          punishWindow: /combat-enemy-punish-window/,
          guardContact: /combat-enemy-(?!health|posture)/,
        };
        items =
          view === 'scene'
            ? enemy.items
            : enemy.items.filter((item) => patterns[effect.enemyEffect].test(item.id));
        sourceFrameId = enemy.sourceFrameId;
      } else {
        const buffer = new CombatEventBuffer();
        if (effect.eventType)
          buffer.emit(effect.eventType, {
            actor: effect.actor,
            target: effect.target,
            outcome: effect.outcome,
            position: { x: actorPosition.x + 26 * facing, y: actorPosition.y + 35 },
            facing,
            direction: facing,
            strength: effect.id === 'guard-break' ? 2 : 1.6,
            durationSeconds: effect.enchantId
              ? 0.22
              : effect.id === 'evade'
                ? 0.16
                : effect.id === 'just-guard'
                  ? PLAYER_MOTION_PROFILE.justGuardEventSeconds
                  : 0.18,
            enchantment: effect.enchantId ? ENCHANTMENT_CATALOG.getProfile(effect.enchantId) : null,
          });
        buffer.update(index / 60);
        const events = buffer.snapshot();
        const player = playerSample(
          resource,
          { id: 'idle', frameCount: action.frameCount },
          index,
          facing,
          actorPosition,
          events,
          effect,
        );
        producerEffectGroups = Object.fromEntries(
          Object.entries(player.presentation.effects).map(([key, values]) => [
            key,
            values.map((item) => item.id),
          ]),
        );
        items = effect.blade
          ? player.presentation.characterItems.filter((item) => /^sword-(blade|hilt)/.test(item.id))
          : player.presentation.combatEffectItems;
        if (view === 'scene')
          items = [...player.presentation.characterItems, ...player.presentation.combatEffectItems];
        sourceFrameId = effect.id;
        extra = {
          combatEvents: events,
          artDirection: createSceneArtDirectionReadModel(sceneFor().artDirectionProfile, {
            roomId: base.room.id,
            combatEvents: events,
            player: {
              position: actorPosition,
              groundY: base.room.groundY,
              scale: PLAYER_COMBAT_GEOMETRY_SCALE,
            },
          }),
        };
      }
    } else if (resource.producer === 'player' || resource.producer === 'equipment') {
      const player = playerSample(resource, action, index, facing, actorPosition);
      producerEffectGroups = Object.fromEntries(
        Object.entries(player.presentation.effects).map(([key, values]) => [
          key,
          values.map((item) => item.id),
        ]),
      );
      items =
        resource.producer === 'equipment' && action.id === 'static'
          ? player.presentation.characterItems.filter(
              (item) => equipmentSlotForGraphic(item) === resource.slot,
            )
          : [...player.presentation.characterItems, ...player.presentation.combatEffectItems];
      sourceFrameId = player.pose.bonePose.frameId;
      boneDiagnostics = Object.entries(
        projectPlayerSkeleton({
          position: actorPosition,
          facing,
          geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
          bonePose: player.pose.bonePose,
        }),
      ).map(([id, position]) => ({ id, parent: SIDE_VIEW_SKELETON_PARENTS[id], position }));
      extra = {
        animationTime: player.input.boneInput.animationTime,
        equipment: sceneFor(resource.equipmentId).resolvedLoadout,
        combatMotion: {
          ...base.frame.combatMotion,
          ...player.input.motionState,
          frame: sceneFor(resource.equipmentId).combatCommands.getMotionFrameData(
            player.input.motionState.id,
          ),
        },
        combatGeometry: {
          ...base.frame.combatGeometry,
          visibleWeapon: player.geometry.weapon,
          visibleShield: player.geometry.shield,
          authoritativeWeapon: player.geometry.weapon,
          authoritativeShield: player.geometry.shield,
          activeSweep: player.sweep,
        },
      };
    } else
      throw new Error(
        `GraphicsResourceSampler가 지원하지 않는 producer: ${resource.producer ?? resource.kind}`,
      );
    const selectedBounds = graphicsBounds(items);
    if (view === 'scene' && !['map', 'final'].includes(resource.producer))
      items = [...base.mapItems, ...items];
    let frame = frameWithItems(base.frame, items, {
      lighting,
      animationTime: index / 60,
      ...extra,
    });
    if (view === 'scene' && resource.producer === 'map' && resource.itemIds.length) {
      const targets = base.room.renderItems.filter((item) => resource.itemIds.includes(item.id));
      const target = graphicsBounds(targets.map((item) => ({ ...item, enabled: true })));
      const centerX = Math.max(
        base.room.bounds.x + 480,
        Math.min(base.room.bounds.x + base.room.bounds.width - 480, target.x + target.width / 2),
      );
      frame = deepFreeze({
        ...frame,
        cameraOffset: { x: centerX - 480, y: base.frame.cameraOffset.y },
        camera: { position: { x: centerX, y: base.frame.camera.position.y } },
      });
    }
    return deepFreeze({
      frame,
      bounds:
        view === 'scene'
          ? { x: frame.cameraOffset.x, y: frame.cameraOffset.y, width: 960, height: 540 }
          : selectedBounds,
      frameId: `${resource.id}/${action.id}/f${String(index).padStart(4, '0')}`,
      sourceFrameId,
      boneDiagnostics,
      producerEffectGroups,
      notes,
      conditions: {
        actionId: action.id,
        frameIndex: index,
        facing,
        lighting,
        view,
        facts: action.facts ?? null,
      },
    });
  }

  return Object.freeze({
    sample,
    destroy() {
      if (disposed) return;
      disposed = true;
      for (const scene of scenes.values()) scene.dispose();
      scenes.clear();
      mapSamples.clear();
      enemyBases.clear();
    },
  });
}
