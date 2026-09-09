export function hasFieldCapability(resolved, capabilityId) {
  return resolved.fieldCapabilities.includes(capabilityId);
}
export function evaluateEquipmentFieldCapability(resolved, { capabilityId, mode }) {
  if (typeof capabilityId !== 'string' || !capabilityId || !['assist', 'require'].includes(mode))
    throw new TypeError('Field request requires capabilityId and assist/require mode');
  const available = hasFieldCapability(resolved, capabilityId);
  return Object.freeze({
    capabilityId,
    mode,
    available,
    allowed: mode === 'assist' || available,
    assisted: mode === 'assist' && available,
    reason: available
      ? 'capability-available'
      : mode === 'assist'
        ? 'optional-capability-unavailable'
        : 'required-capability-unavailable',
  });
}
export const evaluateFieldCapability = evaluateEquipmentFieldCapability;
