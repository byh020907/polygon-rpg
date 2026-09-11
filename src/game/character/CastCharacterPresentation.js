import { samplePlayerMotionPose } from '../../animation/PlayerMotionPose.js';
import { CHARACTER_BODY_PROFILES } from '../../animation/RigFamily.js';
import {
  PLAYER_CHARACTER_FOOT_OFFSET,
  PLAYER_COMBAT_GEOMETRY_SCALE,
  samplePlayerCombatGeometry,
} from '../../combat/SharedCombatGeometry.js';
import { createPlayerCombatPresentation } from '../PlayerCombatPresentation.js';
import { CHARACTER_PRESENTATION_PROFILE } from './CharacterPresentationProfiles.js';
import { withPlateDepth } from '../../animation/ProjectedBodySurface.js';

const REMOVED_PLAYER_PARTS = new Set([
  'tool-bag',
  'cross-body-strap',
  'shield',
  'shield-rivet-plate',
  'sword-trail',
  'sword-hilt',
  'sword-blade',
]);

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function pointAt(bonePose, position, facing, jointId, offset = { x: 0, y: 0 }) {
  const joint = bonePose.projectedJoints[jointId];
  const matrix = bonePose.worldJoints[jointId].matrix;
  return {
    x:
      position.x +
      (joint.x + matrix[0][0] * offset.x + matrix[0][1] * offset.y) *
        PLAYER_COMBAT_GEOMETRY_SCALE *
        facing,
    y:
      position.y +
      PLAYER_CHARACTER_FOOT_OFFSET +
      (joint.y - PLAYER_CHARACTER_FOOT_OFFSET + matrix[1][0] * offset.x + matrix[1][1] * offset.y) *
        PLAYER_COMBAT_GEOMETRY_SCALE,
    depth: joint.depth * PLAYER_COMBAT_GEOMETRY_SCALE,
  };
}

function rectanglePoints(center, width, height, angle = 0) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ].map((point) =>
    Object.freeze({
      x: center.x + point.x * cosine - point.y * sine,
      y: center.y + point.x * sine + point.y * cosine,
    }),
  );
}

function plate(id, points, fill, center, renderOrder, depthGroup, options = {}) {
  return withPlateDepth(
    Object.freeze({
      id,
      points: Object.freeze(points),
      fill,
      stroke: options.stroke ?? '#252a2b',
      lineWidth: options.lineWidth ?? 1.4,
      opacity: options.opacity ?? 1,
      renderOrder,
      order: options.order ?? 30,
    }),
    {
      depthGroup,
      depth: center.depth,
      thickness: options.thickness ?? 1,
      center,
    },
  );
}

function roleProps(profile, bonePose, position, facing, renderOrder, depthGroup) {
  const head = pointAt(bonePose, position, facing, 'head', { x: 0, y: -1 });
  const nearHand = pointAt(bonePose, position, facing, 'nearHand');
  const farHand = pointAt(bonePose, position, facing, 'farHand');
  const chest = pointAt(bonePose, position, facing, 'chest', { x: 0, y: 5 });
  if (profile.id === 'rival-scout') {
    const hookTop = pointAt(bonePose, position, facing, 'nearShoulder', { x: 8, y: -9 });
    const hookCenter = {
      x: (nearHand.x + hookTop.x) / 2,
      y: (nearHand.y + hookTop.y) / 2,
      depth: nearHand.depth,
    };
    const hookAngle = Math.atan2(hookTop.y - nearHand.y, hookTop.x - nearHand.x);
    return [
      plate(
        `${profile.id}:survey-goggles`,
        rectanglePoints(head, 22, 6),
        profile.accent,
        head,
        renderOrder,
        depthGroup,
        { order: 34, thickness: 1.2 },
      ),
      plate(
        `${profile.id}:salvage-hook`,
        rectanglePoints(
          hookCenter,
          Math.hypot(hookTop.x - nearHand.x, hookTop.y - nearHand.y),
          6,
          hookAngle,
        ),
        '#b9a66c',
        hookCenter,
        renderOrder,
        depthGroup,
        { order: 35, thickness: 1.1 },
      ),
      plate(
        `${profile.id}:salvage-band`,
        rectanglePoints(chest, 30, 6, bonePose.bodyLean * facing),
        profile.accent,
        chest,
        renderOrder,
        depthGroup,
        { order: 36, thickness: 1.2 },
      ),
    ];
  }
  if (profile.id === 'scrapyard-owner') {
    const wrenchCenter = { ...nearHand, x: nearHand.x + 13 * facing, y: nearHand.y + 12 };
    const ledgerCenter = { ...farHand, x: farHand.x - 5 * facing, y: farHand.y + 5 };
    return [
      plate(
        `${profile.id}:welding-goggles`,
        rectanglePoints(head, 24, 7),
        profile.accent,
        head,
        renderOrder,
        depthGroup,
        { order: 34, thickness: 1.2 },
      ),
      plate(
        `${profile.id}:ledger`,
        rectanglePoints(ledgerCenter, 20, 28, -0.12 * facing),
        '#d2bc83',
        ledgerCenter,
        renderOrder,
        depthGroup,
        { order: 35, thickness: 1.5 },
      ),
      plate(
        `${profile.id}:wrench`,
        rectanglePoints(wrenchCenter, 8, 46, -0.58 * facing),
        '#a8aaa5',
        wrenchCenter,
        renderOrder,
        depthGroup,
        { order: 36, thickness: 1.1 },
      ),
    ];
  }
  return [];
}

function renameForCharacter(item, prefix) {
  const depthGroup = `cast:${prefix}`;
  return freeze({
    ...item,
    id: `${prefix}:${item.id}`,
    depthGroup,
    ...(item.surface ? { surface: { ...item.surface, depthGroup } } : {}),
  });
}

function runtimeMotionInput(entity, animationTime) {
  const motionId = entity.motionId ?? 'idle';
  const progress = Number.isFinite(entity.motionProgress) ? entity.motionProgress : 0;
  const motionState = { id: 'idle', progress: 0 };
  const boneInput = {
    animationTime,
    movementIntent: 0,
    isGrounded: true,
    verticalVelocity: 0,
  };
  if (motionId === 'run') boneInput.movementIntent = 1;
  else if (motionId === 'hit') boneInput.hitstunProgress = 1 - progress;
  else if (motionId === 'knocked-out') boneInput.knockedOut = true;
  else if (motionId !== 'idle') Object.assign(motionState, { id: motionId, progress });
  return freeze({ motionState, boneInput });
}

function runtimeItem(item, entityId) {
  const suffix = item.id.split(':').at(-1);
  const depthGroup = `cast-runtime:${entityId}`;
  const participatesInDepth = item.surface || Array.isArray(item.depths);
  return freeze({
    ...item,
    id: `${entityId}:${suffix}`,
    depthGroup: participatesInDepth ? depthGroup : undefined,
    ...(item.surface ? { surface: { ...item.surface, depthGroup } } : {}),
  });
}

function assertRuntimeCastEntity(entity) {
  if (
    entity?.kind !== 'cast-character' ||
    typeof entity.id !== 'string' ||
    typeof entity.presentationProfileId !== 'string' ||
    typeof entity.bodyProfileId !== 'string' ||
    !Number.isFinite(entity.position?.x) ||
    !Number.isFinite(entity.position?.y) ||
    ![-1, 1].includes(entity.facing ?? 1)
  ) {
    throw new TypeError('cast-character에는 stable ID, profile/body와 유효한 배치가 필요합니다.');
  }
  return entity;
}

export function sampleCastCharacterPresentation({
  profileId,
  bodyProfileId,
  motionState,
  boneInput,
  position,
  facing = 1,
  renderOrder = 30.45,
}) {
  const appearanceProfile = CHARACTER_PRESENTATION_PROFILE.getProfile(profileId);
  const bodyProfile = CHARACTER_BODY_PROFILES[bodyProfileId];
  if (!appearanceProfile || appearanceProfile.family !== 'human') {
    throw new Error(`검토할 humanoid cast profile이 없습니다: ${profileId}`);
  }
  if (!bodyProfile) throw new Error(`검토할 body profile이 없습니다: ${bodyProfileId}`);
  const pose = samplePlayerMotionPose({ motionState, boneInput, bodyProfile });
  const geometry = samplePlayerCombatGeometry({
    position,
    facing,
    targetPose: pose.targetPose,
    bonePose: pose.bonePose,
    geometryScale: PLAYER_COMBAT_GEOMETRY_SCALE,
    weaponLengthScale: 1,
  });
  const presentation = createPlayerCombatPresentation({
    appearanceProfile,
    position,
    facing,
    targetPose: pose.targetPose,
    bonePose: pose.bonePose,
    combatGeometry: geometry,
    renderScale: PLAYER_COMBAT_GEOMETRY_SCALE,
    renderOrder,
    enemyRenderOrder: renderOrder - 0.05,
  });
  const prefix = `cast-${profileId}`;
  const baseItems = presentation.characterItems
    .filter((item) => !REMOVED_PLAYER_PARTS.has(item.id))
    .map((item) => renameForCharacter(item, prefix));
  const props = roleProps(
    appearanceProfile,
    pose.bonePose,
    position,
    facing,
    renderOrder,
    `cast:${prefix}`,
  );
  return freeze({
    profileId,
    bodyProfileId,
    referenceStatus: 'runtime-baseline-unapproved',
    pose,
    geometry,
    items: [...baseItems, ...props],
  });
}

export function sampleRuntimeCastCharacter(entity, animationTime, fallbackRenderOrder = 30.45) {
  assertRuntimeCastEntity(entity);
  const input = runtimeMotionInput(entity, animationTime);
  const sample = sampleCastCharacterPresentation({
    profileId: entity.presentationProfileId,
    bodyProfileId: entity.bodyProfileId,
    motionState: input.motionState,
    boneInput: input.boneInput,
    position: entity.position,
    facing: entity.facing ?? 1,
    renderOrder: entity.renderOrder ?? fallbackRenderOrder,
  });
  const dialogueAnchorOffset = entity.dialogueAnchorOffset ?? { x: 0, y: -72 };
  return freeze({
    entityId: entity.id,
    actorId: entity.actorId ?? entity.presentationProfileId,
    profileId: sample.profileId,
    bodyProfileId: sample.bodyProfileId,
    referenceStatus: sample.referenceStatus,
    motionId: entity.motionId ?? 'idle',
    frameId: sample.pose.bonePose.frameId,
    dialogueAnchor: {
      x: entity.position.x + dialogueAnchorOffset.x,
      y: entity.position.y + dialogueAnchorOffset.y,
    },
    items: sample.items.map((item) => runtimeItem(item, entity.id)),
  });
}

export function createRuntimeCastPresentation(
  entities,
  animationTime,
  fallbackRenderOrder = 30.45,
) {
  const samples = entities
    .filter((entity) => entity.kind === 'cast-character')
    .map((entity) => sampleRuntimeCastCharacter(entity, animationTime, fallbackRenderOrder));
  const actorIds = new Set();
  for (const sample of samples) {
    if (actorIds.has(sample.actorId)) {
      throw new Error(`같은 cast actor가 한 장면에 중복 배치되었습니다: ${sample.actorId}`);
    }
    actorIds.add(sample.actorId);
  }
  return freeze({
    samples,
    items: samples.flatMap((sample) => sample.items),
  });
}
