export function freezeEquipmentData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeEquipmentData);
    Object.freeze(value);
  }
  return value;
}
export const EQUIPMENT_SLOT_KEYS = Object.freeze({
  weapon: 'weaponItemId',
  shield: 'shieldItemId',
  helmet: 'helmetItemId',
  bodyArmor: 'bodyArmorItemId',
  boots: 'bootsItemId',
  tool: 'toolItemId',
});
export const EQUIPMENT_MODIFIER_DEFAULTS = freezeEquipmentData({
  combatTiming: { startupScale: 1, recoveryScale: 1 },
  attack: {
    damageScale: 1,
    rangeScale: 1,
    hitstunScale: 1,
    launchScale: 1,
    postureDamageScale: 1,
    backPunishDamageScale: 1,
  },
  defense: { damageTakenScale: 1 },
  guard: { impactScale: 1, blockstunScale: 1, staminaDamageScale: 1 },
  geometry: { weaponLengthScale: 1 },
  command: { guardCounterPostureScale: 1 },
  field: {},
});
export function multiplyEquipmentModifiers(target, modifiers = {}) {
  for (const [category, values] of Object.entries(modifiers)) {
    if (
      !Object.hasOwn(EQUIPMENT_MODIFIER_DEFAULTS, category) ||
      !values ||
      Array.isArray(values) ||
      typeof values !== 'object'
    )
      throw new TypeError('Invalid equipment modifier category ' + category);
    for (const [key, value] of Object.entries(values)) {
      if (!key.endsWith('Scale') || !Number.isFinite(value) || value <= 0)
        throw new TypeError('Positive equipment scale required: ' + key);
      target[category][key] = (target[category][key] ?? 1) * value;
      if (!Number.isFinite(target[category][key]))
        throw new RangeError('Equipment modifier overflow');
    }
  }
  return target;
}
