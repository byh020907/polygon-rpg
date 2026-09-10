import { ENCHANTMENT_CATALOG } from '../enchantment/EnchantmentCatalog.js';
import { SCRAP_EQUIPMENT_FORGE_PROFILE } from './ProgressionProfiles.js';
export const MATERIAL_PROFILES = Object.freeze(
  [
    { id: 'salvaged-steel', label: '회수 철재', owner: 'materials' },
    ...ENCHANTMENT_CATALOG.profiles.map((p) => ({
      id: p.materialId,
      label: p.materialLabel,
      owner: 'enchantment',
    })),
    {
      id: SCRAP_EQUIPMENT_FORGE_PROFILE.materialId,
      label: SCRAP_EQUIPMENT_FORGE_PROFILE.materialLabel,
      owner: 'equipmentForge',
      rarity: 'rare',
    },
  ].map(Object.freeze),
);
const quantity = (n) => {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new TypeError('Material quantity must be a nonnegative safe integer');
  return n;
};
function ownerMap(snapshot, owner) {
  return owner === 'materials' ? snapshot.materials : snapshot[owner]?.materialQuantities;
}
export function assertMaterialLedger(snapshot) {
  for (const owner of ['materials', 'enchantment', 'equipmentForge']) {
    const map = ownerMap(snapshot, owner);
    if (!map || typeof map !== 'object' || Array.isArray(map))
      throw new TypeError('Material ledger owner missing');
    for (const [id, n] of Object.entries(map)) {
      if (!MATERIAL_PROFILES.some((p) => p.id === id && p.owner === owner))
        throw new Error('Unknown or duplicated material owner: ' + id);
      quantity(n);
    }
  }
  if (!Object.hasOwn(snapshot.materials, 'salvaged-steel'))
    throw new Error('Explicit salvaged-steel quantity required');
  return snapshot;
}
export function getMaterialLedger(snapshot) {
  assertMaterialLedger(snapshot);
  return Object.freeze(
    Object.fromEntries(
      MATERIAL_PROFILES.map((p) => [p.id, ownerMap(snapshot, p.owner)[p.id] ?? 0]),
    ),
  );
}
export function getMaterialQuantity(snapshot, id) {
  if (!MATERIAL_PROFILES.some((p) => p.id === id)) throw new Error('Unknown material ' + id);
  return getMaterialLedger(snapshot)[id];
}
function changeMaterial(snapshot, id, amount, spend) {
  quantity(amount);
  if (!amount) throw new Error('Material change must be positive');
  const current = getMaterialQuantity(snapshot, id);
  if (spend && current < amount)
    return Object.freeze({ changed: false, reason: 'insufficient-material', snapshot });
  const next = quantity(current + (spend ? -amount : amount)),
    profile = MATERIAL_PROFILES.find((p) => p.id === id);
  const values = Object.freeze({ ...ownerMap(snapshot, profile.owner), [id]: next });
  const result =
    profile.owner === 'materials'
      ? { ...snapshot, materials: values }
      : {
          ...snapshot,
          [profile.owner]: Object.freeze({
            ...snapshot[profile.owner],
            materialQuantities: values,
          }),
        };
  return Object.freeze({
    changed: true,
    reason: spend ? 'material-spent' : 'material-awarded',
    snapshot: Object.freeze(result),
    materialId: id,
    quantity: amount,
  });
}
export const awardMaterial = (snapshot, id, amount) => changeMaterial(snapshot, id, amount, false);
export const spendMaterial = (snapshot, id, amount) => changeMaterial(snapshot, id, amount, true);
