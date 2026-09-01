const DAMAGE = Object.freeze({ weak: 1.35, neutral: 1, resistant: 0.72 });
const BUILDUP = Object.freeze({ weak: 1.35, neutral: 1, resistant: 0.65 });

export function resolveSwordEnchantment({
  enchantId,
  enchantLevel = 0,
  affinity,
  attackKind,
  baseDamage,
  weaponBaseAttack = baseDamage,
  status = null,
  enemyAiState = 'idle',
  hasPosture = false,
} = {}) {
  if (!enchantId || enchantLevel === 0) return null;
  if (!Number.isInteger(enchantLevel) || enchantLevel < 1 || enchantLevel > 5) {
    throw new RangeError('enchant level은 1..5 사이의 정수여야 합니다.');
  }
  if (!Number.isFinite(baseDamage) || baseDamage < 0) {
    throw new RangeError('base damage는 0 이상의 유한한 수여야 합니다.');
  }
  if (!Number.isFinite(weaponBaseAttack) || weaponBaseAttack < 0) {
    throw new RangeError('weapon base attack은 0 이상의 유한한 수여야 합니다.');
  }
  const strong = attackKind === 'strong' || attackKind === 'guard-break';
  const scale = DAMAGE[affinity] ?? DAMAGE.neutral;
  const buildupScale = BUILDUP[affinity] ?? BUILDUP.neutral;
  const levelScale = enchantLevel / 5;
  const elementalDamage = weaponBaseAttack * 1.5 * levelScale;
  const additionalDamage = Math.max(0, Math.round(elementalDamage * scale));
  const buildup = Math.max(1, Math.round((strong ? 52 : 28) * buildupScale * levelScale));
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
    damage: Math.max(1, Math.round(baseDamage) + additionalDamage),
    additionalDamage,
    level: enchantLevel,
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
    postureDamage:
      enchantId === 'earth' && hasPosture ? Math.round((strong ? 34 : 18) * levelScale) : 0,
  });
}
