import { assertProgressionSnapshot, mergeProgressionSnapshot } from './ProgressionState.js';
import { EQUIPMENT_CATALOG } from '../equipment/EquipmentCatalog.js';
import { ENCHANTMENT_CATALOG } from '../enchantment/EnchantmentCatalog.js';
import { canonicalizeEnchantmentSnapshot } from '../enchantment/EnchantmentState.js';
import { awardMaterial, getMaterialQuantity, MATERIAL_PROFILES } from './MaterialLedger.js';
const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
function positiveInteger(n, allowZero = false) {
  if (!Number.isSafeInteger(n) || n < (allowZero ? 0 : 1))
    throw new Error('Reward quantity must be a positive safe integer');
  return n;
}
export function applyRewardBundle(
  snapshot,
  { claimId, bundle },
  { equipmentCatalog = EQUIPMENT_CATALOG, enchantmentCatalog = ENCHANTMENT_CATALOG } = {},
) {
  assertProgressionSnapshot(snapshot, undefined, equipmentCatalog);
  if (typeof claimId !== 'string' || !claimId.trim() || claimId.length > 240)
    throw new Error('Stable reward claim ID required');
  if (
    !bundle ||
    typeof bundle !== 'object' ||
    Array.isArray(bundle) ||
    Object.keys(bundle).some(
      (k) => !['gold', 'materials', 'trainingMarks', 'equipmentItemIds'].includes(k),
    )
  )
    throw new Error('Invalid reward bundle');
  const gold = positiveInteger(bundle.gold ?? 0, true),
    training = positiveInteger(bundle.trainingMarks ?? 0, true),
    materials = bundle.materials ?? {},
    equipmentIds = bundle.equipmentItemIds ?? [];
  if (
    !materials ||
    typeof materials !== 'object' ||
    Array.isArray(materials) ||
    !Array.isArray(equipmentIds) ||
    new Set(equipmentIds).size !== equipmentIds.length
  )
    throw new Error('Invalid reward materials/equipment');
  for (const [id, n] of Object.entries(materials)) {
    getMaterialQuantity(snapshot, id);
    positiveInteger(n);
  }
  equipmentIds.forEach((id) => equipmentCatalog.getItem(id));
  if (snapshot.rewardClaims.includes(claimId))
    return freeze({ changed: false, reason: 'already-claimed', snapshot, acquisition: null });
  let next = {
    ...snapshot,
    gold: positiveInteger(snapshot.gold + gold, true),
    trainingMarks: positiveInteger(snapshot.trainingMarks + training, true),
    rewardClaims: [...snapshot.rewardClaims, claimId],
  };
  const lines = [];
  if (gold) lines.push({ label: 'Gold', quantity: gold, before: snapshot.gold, after: next.gold });
  if (training)
    lines.push({
      label: '수련 인장',
      quantity: training,
      before: snapshot.trainingMarks,
      after: next.trainingMarks,
    });
  for (const [id, n] of Object.entries(materials)) {
    next = awardMaterial(next, id, n).snapshot;
    lines.push({
      label: MATERIAL_PROFILES.find((p) => p.id === id).label,
      quantity: n,
      before: getMaterialQuantity(snapshot, id),
      after: getMaterialQuantity(next, id),
    });
  }
  const added = equipmentIds.filter((id) => !snapshot.ownedEquipmentItemIds.includes(id));
  next = {
    ...next,
    ownedEquipmentItemIds: [...snapshot.ownedEquipmentItemIds, ...added],
    everOwnedEquipmentItemIds: [
      ...new Set([...snapshot.everOwnedEquipmentItemIds, ...equipmentIds]),
    ],
  };
  next.enchantment = canonicalizeEnchantmentSnapshot(
    next.enchantment,
    enchantmentCatalog,
    next.ownedEquipmentItemIds,
    equipmentCatalog,
  );
  const labels = {
    weapon: '주무기',
    shield: '방패',
    helmet: '투구',
    bodyArmor: '몸통',
    boots: '신발',
    tool: '도구',
  };
  for (const id of added) {
    const item = equipmentCatalog.getItem(id);
    lines.push({
      label: item.label,
      quantity: 1,
      before: 0,
      after: 1,
      slot: labels[equipmentCatalog.getFamily(item.familyId).slot],
      description: item.description,
    });
  }
  const acquisition = lines.length
    ? {
        id: claimId,
        kind: added.length ? 'equipment' : claimId.startsWith('quest:') ? 'quest' : 'bundle',
        title: added.length
          ? '새 장비 획득'
          : claimId.startsWith('quest:')
            ? '의뢰 완료 보상'
            : '회수품 획득',
        importance: added.length ? 'important' : 'normal',
        lines,
      }
    : null;
  return freeze({
    changed: true,
    reason: 'reward-claimed',
    snapshot: mergeProgressionSnapshot(snapshot, next, equipmentCatalog),
    acquisition,
  });
}
