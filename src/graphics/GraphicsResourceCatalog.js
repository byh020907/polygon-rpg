import { COMBAT_MOTION_TIMING_PROFILES } from '../combat/CombatMotionTimingProfiles.js';
import { combatMotionFrameData } from '../combat/CombatCommandController.js';
import {
  PLAYER_MOTION_PROFILE,
  playerUtilityFrameCount,
  playerBlockReactionTiming,
} from '../animation/PlayerMotionProfile.js';
import { EQUIPMENT_PROFILES } from '../game/equipment/EquipmentProfiles.js';
import { ENCOUNTER_PROFILES } from '../game/encounter/EncounterProfiles.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../game/training/TrainingEnemyAttackProfiles.js';
import { ENCHANTMENT_CATALOG } from '../game/enchantment/EnchantmentCatalog.js';
import { SCRAP_AWAKENING_MAP } from '../game/maps/scrapAwakening.js';
import { SCRAP_FINAL_BATTLE_STAGE } from '../game/campaign/ScrapFinalBattleState.js';
import { createScrapFinalBattlePresentation } from '../game/campaign/ScrapFinalBattlePresentation.js';
import { deepFreeze } from '../game/map/MapDefinition.js';
import { createMapGraphicResources, graphicsItemCategory } from './MapGraphicResources.js';

export const GRAPHICS_CATEGORIES = deepFreeze(
  [
    ['player', '주인공'],
    ['npc', 'NPC'],
    ['enemy', '몹'],
    ['equipment', '무기·장비'],
    ['background', '배경'],
    ['foreground', '전경'],
    ['terrain', '지형'],
    ['building', '건물'],
    ['facility', '설비'],
    ['prop', '소품'],
    ['effect', '이펙트'],
    ['scene', '장면'],
    ['ui', 'UI·아이콘'],
  ].map(([id, label]) => ({ id, label })),
);

const MOTION_LABELS = Object.freeze({
  slash: '기본 횡베기',
  heavy: '강한 사선 베기',
  rising: '올려베기',
  shieldBash: '방패 반격',
  thrust: '찌르기',
  spin: '회전 공격',
  airSlash: '공중 베기',
  airHeavy: '공중 강공',
  airReturn: '공중 되베기',
  airSpin: '공중 회전',
  airCross: '공중 교차 베기',
});

export function graphicsPlayerActions(equipment = EQUIPMENT_PROFILES[0]) {
  const blockTiming = playerBlockReactionTiming(
    TRAINING_ENEMY_ATTACK_PROFILES.light,
    equipment.guard,
  );
  return deepFreeze([
    ...[
      ['idle', '대기'],
      ['run', '달리기 · 정상 33주기'],
      ['jump', '점프 상승'],
      ['fall', '낙하'],
      ['landing', '착지 · 현재 gameplay에서 미사용 자세'],
      ['roll', '전방 구르기'],
      ['guard', '방어 · 정상 7주기'],
      ['hit', '피격'],
    ].map(([id, label]) => ({ id, label, frameCount: playerUtilityFrameCount(id) })),
    {
      id: 'block',
      label: '기본공격 방어 반동',
      frameCount: Math.ceil(blockTiming.durationSeconds * PLAYER_MOTION_PROFILE.frameRate),
      ...blockTiming,
    },
    { id: 'knocked-out', label: '쓰러짐 · 고정 자세', frameCount: 1 },
    ...Object.keys(COMBAT_MOTION_TIMING_PROFILES).map((id) => ({
      id,
      label: MOTION_LABELS[id] ?? id,
      frameCount: combatMotionFrameData(id, equipment.combatTiming).durationFrames,
    })),
  ]);
}

const ENEMY_LABELS = Object.freeze({
  light: '기본',
  heavy: '강공',
  antiAir: '대공',
  sweep: '휩쓸기',
  windup: '공격 준비',
  attack: '공격',
  recovery: '회수',
});

function enemyActions(profile) {
  const kinds = [...new Set(profile.attackPatterns.flat())];
  // antiAir is a production response to airborne players, independent of the
  // authored ground pattern. Keep it visible for every encounter.
  if (!kinds.includes('antiAir')) kinds.push('antiAir');
  return deepFreeze([
    { id: 'idle', label: '대기', frameCount: 27 },
    {
      id: 'advance',
      label: '접근',
      frameCount: Math.max(1, Math.round((40 / profile.approachSpeed) * 60)),
    },
    ...kinds.flatMap((attackKind) =>
      ['windup', 'attack', 'recovery'].map((phase) => ({
        id: `${phase}:${attackKind}`,
        label: `${ENEMY_LABELS[attackKind]} · ${ENEMY_LABELS[phase]}`,
        frameCount: TRAINING_ENEMY_ATTACK_PROFILES[attackKind].frame[`${phase}Frames`],
        phase,
        attackKind,
      })),
    ),
    { id: 'hit', label: '피격 · 현재 고정 반응 자세', frameCount: 1 },
    { id: 'guard', label: '방어 · 현재 고정 자세', frameCount: 1 },
    {
      id: 'surrender',
      label:
        profile.completionDisposition === 'surrender' ? '항복 · 고정 자세' : '종료 자세 · 고정',
      frameCount: 1,
    },
  ]);
}

export const GRAPHICS_EFFECT_DEFINITIONS = deepFreeze([
  { id: 'player-hit', label: '주인공 피격', eventType: 'hit', actor: 'enemy', target: 'player' },
  { id: 'enemy-hit', label: '적 피격', eventType: 'hit', actor: 'player', target: 'enemy' },
  { id: 'guard', label: '방패 방어 접촉', eventType: 'guard', actor: 'player', target: 'enemy' },
  {
    id: 'just-guard',
    label: '저스트 가드',
    eventType: 'just-guard',
    actor: 'player',
    target: 'enemy',
  },
  {
    id: 'guard-break',
    label: '주인공 방어 파괴',
    eventType: 'guard-break',
    actor: 'player',
    target: 'enemy',
  },
  {
    id: 'posture-break',
    label: '적 자세 파괴',
    eventType: 'guard-break',
    actor: 'player',
    target: 'enemy',
    outcome: 'posture-break',
  },
  {
    id: 'counter',
    label: '방패 반격 접촉',
    eventType: 'counter',
    actor: 'player',
    target: 'enemy',
  },
  { id: 'evade', label: '회피 잔상', eventType: 'evade', actor: 'player', target: 'enemy' },
  { id: 'launch', label: '올려치기 접촉', eventType: 'launch', actor: 'player', target: 'enemy' },
  { id: 'punish', label: '빈틈 공격', eventType: 'punish', actor: 'player', target: 'enemy' },
  { id: 'retaliation', label: '주인공 반격 보호 오라' },
  { id: 'enemy-ground-impact', label: '적 지면 충돌', enemyEffect: 'groundImpact' },
  { id: 'enemy-retaliation', label: '적 반격 보호 오라', enemyEffect: 'retaliation' },
  { id: 'enemy-groggy', label: '적 자세 붕괴 표시', enemyEffect: 'groggy' },
  { id: 'enemy-weakpoint', label: '적 약점 노출', enemyEffect: 'weakPoint' },
  { id: 'enemy-flee', label: '인간 수거반 이탈 먼지', enemyEffect: 'flee' },
  { id: 'enemy-heavy-warning', label: '적 강공 준비 경고', enemyEffect: 'heavyWarning' },
  { id: 'enemy-anti-air', label: '적 대공 무기 광원·궤적', enemyEffect: 'antiAir' },
  { id: 'enemy-punish-window', label: 'Boss 빈틈 표시', enemyEffect: 'punishWindow' },
  { id: 'enemy-guard-contact', label: '적 방어 접촉 섬광', enemyEffect: 'guardContact' },
  ...ENCHANTMENT_CATALOG.profiles.flatMap((profile) => [
    {
      id: `enchant-contact-${profile.id}`,
      label: `${profile.label} 접촉`,
      eventType: 'hit',
      actor: 'player',
      target: 'enemy',
      enchantId: profile.id,
    },
    {
      id: `enchant-status-${profile.id}`,
      label: `${profile.label} 적 상태 오라`,
      enemyEffect: 'enchant',
      enchantId: profile.id,
    },
    {
      id: `enchant-blade-${profile.id}`,
      label: `${profile.label} 무기 표면`,
      enchantId: profile.id,
      blade: true,
    },
  ]),
]);

function finalResources() {
  const stages = Object.values(SCRAP_FINAL_BATTLE_STAGE).filter((id) => id !== 'inactive');
  const byId = new Map();
  for (const stageId of stages) {
    for (const item of createScrapFinalBattlePresentation(stageId)) {
      const record = byId.get(item.id) ?? { item, stages: [] };
      record.stages.push(stageId);
      byId.set(item.id, record);
    }
  }
  const source = 'src/game/campaign/ScrapFinalBattlePresentation.js';
  const provenance = {
    regionId: SCRAP_AWAKENING_MAP.initialRegionId,
    roomId: SCRAP_AWAKENING_MAP.initialRoomId,
  };
  return [
    {
      ...provenance,
      id: 'scene:final-battle',
      label: '대항 병기와 고대 병기 · 최종 전장',
      category: 'scene',
      kind: 'scene',
      producer: 'final',
      source,
      actions: stages.map((id) => ({ id, label: id, frameCount: 1 })),
      notes: '현재 production stage별 정적 조립. 시간축 robot 애니메이션은 아직 없습니다.',
    },
    ...[...byId.values()].map(({ item, stages: presentStages }) => ({
      ...provenance,
      id: `final:${item.id}`,
      label: item.label ?? item.id,
      category: graphicsItemCategory(item),
      kind: 'static',
      producer: 'final',
      source,
      itemIds: [item.id],
      actions: presentStages.map((id) => ({ id, label: `상태 · ${id}`, frameCount: 1 })),
    })),
  ];
}

export function createGraphicsResourceCatalog({ additionalResources = [] } = {}) {
  const map = createMapGraphicResources();
  const placements = new Map();
  for (const region of SCRAP_AWAKENING_MAP.regions)
    for (const room of region.rooms) {
      for (const entity of room.entities)
        if (entity.encounterProfileId) {
          const list = placements.get(entity.encounterProfileId) ?? [];
          list.push({ regionId: region.id, roomId: room.id, entityId: entity.id });
          placements.set(entity.encounterProfileId, list);
        }
    }
  const resources = [
    {
      id: 'player:protagonist',
      label: '주인공 · 고물상 견습생',
      category: 'player',
      kind: 'animated',
      producer: 'player',
      source: 'src/game/PlayerCombatPresentation.js',
      actions: graphicsPlayerActions(),
    },
    ...EQUIPMENT_PROFILES.map((equipment) => ({
      id: `equipment:${equipment.id}`,
      label: equipment.label,
      category: 'equipment',
      kind: 'animated',
      producer: 'equipment',
      source: 'src/game/equipment/EquipmentProfiles.js',
      equipmentId: equipment.id,
      actions: [
        { id: 'static', label: '검·방패 실제 크기', frameCount: 1 },
        ...graphicsPlayerActions(equipment),
      ],
      notes:
        '게임과 같은 장비 timing·attack reach 사이징. 동작 보기에는 장비를 든 주인공이 함께 표시됩니다.',
    })),
    ...Object.values(ENCOUNTER_PROFILES).map((profile) => ({
      id: `enemy:${profile.id}`,
      label: profile.label,
      category: 'enemy',
      kind: 'animated',
      producer: 'enemy',
      source: 'src/game/encounter/EncounterProfiles.js',
      profileId: profile.id,
      actions: enemyActions(profile),
      placements: placements.get(profile.id) ?? [],
      ...(placements.get(profile.id)?.[0] ?? {}),
      notes: `${placements.has(profile.id) ? '현재 맵 배치' : '현재 authored profile · 맵 미배치'} · 피격·방어·종료는 production이 샘플하는 고정 자세이며 새 애니메이션을 꾸미지 않습니다.`,
    })),
    ...map.resources,
    ...GRAPHICS_EFFECT_DEFINITIONS.map((effect) => ({
      id: `effect:${effect.id}`,
      label: effect.label,
      category: 'effect',
      kind: effectFrameCount(effect) === 1 ? 'static' : 'animated',
      producer: 'effect',
      effectId: effect.id,
      source: effect.enemyEffect
        ? 'src/game/training/TrainingEncounterPresentation.js'
        : 'src/game/PlayerCombatPresentation.js',
      actions: [
        {
          id: 'show',
          label: effectFrameCount(effect) === 1 ? '현재 상태 표면' : '효과 수명',
          frameCount: effectFrameCount(effect),
        },
      ],
    })),
    {
      id: 'ui:enemy-status-bars',
      label: '적 체력·자세·항복 표시',
      category: 'ui',
      kind: 'static',
      producer: 'enemy-status',
      source: 'src/game/training/TrainingEncounterPresentation.js',
      actions: ['full', 'low-health', 'posture', 'groggy', 'surrender'].map((id) => ({
        id,
        label: id,
        frameCount: 1,
      })),
      notes: '실제 Canvas enemy health/posture/resolution producer입니다.',
    },
    ...finalResources(),
    ...additionalResources,
  ];
  const byId = new Map();
  const normalized = resources.map((resource) => ({
    ...resource,
    actions: resource.actions?.length
      ? resource.actions
      : [{ id: 'static', label: '정적', frameCount: 1 }],
  }));
  for (const resource of normalized) {
    if (byId.has(resource.id)) throw new Error(`중복 graphics resource ID: ${resource.id}`);
    if (!GRAPHICS_CATEGORIES.some((category) => category.id === resource.category))
      throw new Error(`알 수 없는 그래픽 종류: ${resource.category}`);
    byId.set(resource.id, deepFreeze(resource));
  }
  return deepFreeze({
    resources: normalized,
    get: (id) => byId.get(id) ?? null,
    inventory: {
      ...map.inventory,
      total: resources.length,
      enemyProfileCount: Object.keys(ENCOUNTER_PROFILES).length,
      placedEnemyProfileCount: placements.size,
      unplacedEnemyProfileIds: Object.keys(ENCOUNTER_PROFILES).filter((id) => !placements.has(id)),
      equipmentCount: EQUIPMENT_PROFILES.length,
      effectCount: GRAPHICS_EFFECT_DEFINITIONS.length,
      categoryCounts: Object.fromEntries(
        GRAPHICS_CATEGORIES.map(({ id }) => [
          id,
          resources.filter((resource) => resource.category === id).length,
        ]),
      ),
      exclusions: [
        '폐기된 학원·first journey·glasswind 맵 및 구기획 encounter는 현재 campaign에 포함하지 않습니다.',
        `collision surface·trigger·portal·story entity는 직접 그리는 리소스가 아닙니다. 대응하는 render item과 ${map.inventory.patchCount}개 원본 patch inventory로 추적합니다.`,
        'NPC와 최종 로봇은 현재 production 정적/state variant만 표시합니다. 미구현 시간축 동작은 생성하지 않습니다.',
        'CombatEvent landing은 독립 그림을 만들지 않습니다. 주인공 착지 자세와 적 지면 충돌 producer를 검토합니다.',
        '검 궤적은 별도 복제 효과가 아니라 주인공·장비의 공격 행에서 실제 접촉 sweep와 함께 검토합니다.',
        '사용자 첨부 원본·레퍼런스 이미지는 실제 게임 리소스가 아니므로 목록에 등록하지 않습니다. 원본 파일은 수정하거나 삭제하지 않습니다.',
        'STATE.md에 보존한 미통합 OpenCode candidate는 비교 대상이며 현재 production inventory에 섞지 않습니다. candidate와 원본 작업은 보존합니다.',
      ],
    },
  });
}

function effectFrameCount(effect) {
  if (effect.id === 'just-guard')
    return Math.ceil(PLAYER_MOTION_PROFILE.justGuardEventSeconds * PLAYER_MOTION_PROFILE.frameRate);
  if (
    effect.blade ||
    ['retaliation', 'flee', 'enchant', 'punishWindow'].includes(effect.enemyEffect)
  )
    return 1;
  if (effect.enemyEffect === 'heavyWarning')
    return TRAINING_ENEMY_ATTACK_PROFILES.heavy.frame.windupFrames;
  if (effect.enemyEffect === 'antiAir')
    return TRAINING_ENEMY_ATTACK_PROFILES.antiAir.frame.attackFrames;
  if (effect.enemyEffect === 'guardContact') return 5;
  if (effect.id === 'guard') return 9;
  if (effect.id === 'guard-break' || effect.enchantId || effect.enemyEffect === 'groundImpact')
    return 14;
  if (effect.id === 'evade') return 10;
  if (effect.id === 'retaliation' || effect.enemyEffect) return 18;
  return 11;
}
