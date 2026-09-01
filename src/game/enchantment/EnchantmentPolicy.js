const DAMAGE = Object.freeze({ weak: 1.35, neutral: 1, resistant: 0.72 });
const BUILDUP = Object.freeze({ weak: 1.35, neutral: 1, resistant: 0.65 });

export function resolveSwordEnchantment({
  enchantId,
  affinity,
  attackKind,
  baseDamage,
  status = null,
  enemyAiState = 'idle',
  hasPosture = false,
} = {}) {
  if (!enchantId) return null;
  const strong = attackKind === 'strong' || attackKind === 'guard-break';
  const scale = DAMAGE[affinity] ?? DAMAGE.neutral;
  const buildupScale = BUILDUP[affinity] ?? BUILDUP.neutral;
  const buildup = Math.round((strong ? 52 : 28) * buildupScale);
  const sameElement = status?.id === enchantId;
  const active = sameElement && status.remainingSeconds > 0;
  const priorBuildup = sameElement ? (status?.buildup ?? 0) : 0;
  const reachesThreshold = !active && priorBuildup + buildup >= 100;
  const durationSeconds = active
    ? Math.min(4, status.remainingSeconds + (strong ? 0.8 : 0.45))
    : reachesThreshold
      ? 2.4
      : 0;
  return Object.freeze({
    damage: Math.max(1, Math.round(baseDamage * scale)),
    buildup,
    affinity: affinity ?? 'neutral',
    status:
      durationSeconds > 0
        ? Object.freeze({
            id: enchantId,
            remainingSeconds: durationSeconds,
            buildup: active || reachesThreshold ? 0 : priorBuildup + buildup,
            suppressesRegeneration: enchantId === 'fire' && durationSeconds > 0,
            suppressesPlantDefense: enchantId === 'fire' && durationSeconds > 0,
          })
        : Object.freeze({
            id: enchantId,
            remainingSeconds: 0,
            buildup: priorBuildup + buildup,
          }),
    interrupt: enchantId === 'lightning' && reachesThreshold && enemyAiState === 'windup',
    postureDamage: enchantId === 'earth' && hasPosture ? (strong ? 34 : 18) : 0,
  });
}
