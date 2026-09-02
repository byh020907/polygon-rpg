import { closestCombatContact } from '../../combat/SharedCombatGeometry.js';
import { SCRAP_FINAL_BATTLE_STAGE } from './ScrapFinalBattleState.js';

function point(x, y) {
  return Object.freeze({ x, y });
}

function diamond(x, y, radiusX, radiusY) {
  return Object.freeze([
    point(x, y - radiusY),
    point(x + radiusX, y),
    point(x, y + radiusY),
    point(x - radiusX, y),
  ]);
}

const STAGE_PROFILE = Object.freeze({
  [SCRAP_FINAL_BATTLE_STAGE.ARMOR]: Object.freeze({
    targetId: 'scrap-final-armor-target',
    targetLabel: '장갑 결합부',
    points: diamond(824, 386, 24, 26),
    requiredHitCount: 2,
    allowedMotionIds: Object.freeze(['slash', 'thrust', 'shieldBash']),
    requiresOpening: true,
  }),
  [SCRAP_FINAL_BATTLE_STAGE.WEAPON]: Object.freeze({
    targetId: 'scrap-final-weapon-target',
    targetLabel: '절단검 가동부',
    points: diamond(824, 386, 26, 28),
    requiredHitCount: 1,
    allowedMotionIds: Object.freeze(['heavy']),
    requiresOpening: false,
  }),
  [SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE]: Object.freeze({
    targetId: 'scrap-final-exposed-control-core',
    targetLabel: '노출된 제어부',
    points: diamond(824, 386, 30, 34),
    requiredHitCount: 1,
    allowedMotionIds: Object.freeze(['slash', 'thrust', 'heavy', 'shieldBash']),
    requiresOpening: false,
  }),
});

export function getScrapFinalBattleCombatProfile(stageId) {
  return STAGE_PROFILE[stageId] ?? null;
}

export function createScrapFinalBattleCombatState(stageId) {
  const profile = getScrapFinalBattleCombatProfile(stageId);
  return Object.freeze({
    stageId,
    hitCount: 0,
    requiredHitCount: profile?.requiredHitCount ?? 0,
    lastContactSequence: null,
  });
}

/**
 * Resolves only a shared-geometry contact. Campaign stage ownership stays with
 * ScrapCampaignState; this transient encounter never writes campaign data.
 */
export function resolveScrapFinalBattleCombatContact({
  state,
  combatState,
  attackProfile,
  weaponSweep,
  openingActive = false,
}) {
  const profile = getScrapFinalBattleCombatProfile(state?.stageId);
  if (!profile || !weaponSweep || !combatState) {
    return Object.freeze({
      state,
      contact: null,
      changed: false,
      completed: false,
      reason: 'inactive',
    });
  }
  if (!profile.allowedMotionIds.includes(combatState.id)) {
    return Object.freeze({
      state,
      contact: null,
      changed: false,
      completed: false,
      reason: 'wrong-command',
    });
  }
  if (
    !attackProfile ||
    !Number.isFinite(combatState.progress) ||
    combatState.progress < attackProfile.start ||
    combatState.progress > attackProfile.end
  ) {
    return Object.freeze({
      state,
      contact: null,
      changed: false,
      completed: false,
      reason: 'inactive-window',
    });
  }
  if (profile.requiresOpening && !openingActive) {
    return Object.freeze({
      state,
      contact: null,
      changed: false,
      completed: false,
      reason: 'opening-required',
    });
  }
  if (state.lastContactSequence === combatState.sequence) {
    return Object.freeze({
      state,
      contact: null,
      changed: false,
      completed: false,
      reason: 'already-hit',
    });
  }
  const target = Object.freeze({ part: profile.targetId, points: profile.points });
  const contact = closestCombatContact([weaponSweep], [target]);
  if (!contact.contact) {
    return Object.freeze({
      state,
      contact,
      changed: false,
      completed: false,
      reason: 'out-of-range',
    });
  }
  const hitCount = Math.min(profile.requiredHitCount, state.hitCount + 1);
  const next = Object.freeze({
    stageId: state.stageId,
    hitCount,
    requiredHitCount: profile.requiredHitCount,
    lastContactSequence: combatState.sequence,
  });
  return Object.freeze({
    state: next,
    contact,
    changed: true,
    completed: hitCount === profile.requiredHitCount,
    reason: hitCount === profile.requiredHitCount ? 'stage-complete' : 'hit-confirmed',
  });
}
