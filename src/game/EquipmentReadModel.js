import { EQUIPMENT_SLOT_KEYS } from './equipment/EquipmentLoadout.js';
import { createEquipmentSynergyCodex } from './equipment/EquipmentSynergy.js';
export const EQUIPMENT_SLOT_LABELS = Object.freeze({
  weapon: '주무기',
  shield: '방패',
  helmet: '투구',
  bodyArmor: '몸통',
  boots: '신발',
  tool: '도구',
});
const FIELD_LABELS = Object.freeze({
  'cable-cut': '케이블 절단',
  'light-plate-cut': '얇은 판금 절단',
  'light-machine-disable': '소형 기계 제압',
  'debris-guard': '낙하 잔해 방호',
  'pressure-block': '압력 차단',
  brace: '현장 지지',
});
const capabilityLabels = (ids) => ids.map((id) => FIELD_LABELS[id] ?? id).join(' · ');
export function createEquipmentViewModel(resolved, snapshot, catalog) {
  const slots = Object.entries(EQUIPMENT_SLOT_KEYS).map(([id, key]) => ({
    id,
    label: EQUIPMENT_SLOT_LABELS[id],
    itemId: snapshot.loadout[key],
    itemLabel: snapshot.loadout[key] ? catalog.getItem(snapshot.loadout[key]).label : '미장착',
    canUnequip: id !== 'weapon' && snapshot.loadout[key] !== null,
  }));
  const codex = createEquipmentSynergyCodex({
    catalog,
    everOwnedItemIds: snapshot.everOwnedEquipmentItemIds,
    discoveredIds: snapshot.discoveredSpecialSynergyIds,
  });
  const specialSynergies = codex.specialSynergies.map((entry) =>
    entry.discovered
      ? {
          ...entry,
          requirementsLabel: entry.requirements
            .map(
              (r) =>
                EQUIPMENT_SLOT_LABELS[r.slot] +
                ': ' +
                (r.itemId ? catalog.getItem(r.itemId).label : catalog.getFamily(r.familyId).label),
            )
            .join(' + '),
        }
      : entry,
  );
  return Object.freeze({
    slots,
    moveset: resolved.moveset.label,
    items: snapshot.ownedEquipmentItemIds.map((id) => {
      const item = catalog.getItem(id),
        family = catalog.getFamily(item.familyId);
      return {
        id,
        label: item.label,
        family: family.label ?? family.id,
        slot: family.slot,
        slotLabel: EQUIPMENT_SLOT_LABELS[family.slot],
        handUsage:
          family.handUsage === 'twoHand'
            ? '양손'
            : family.handUsage === 'oneHand'
              ? '한손'
              : '착용/휴대',
        description: item.description,
        visualProfileId: item.visualProfileId,
        equipped: snapshot.loadout[EQUIPMENT_SLOT_KEYS[family.slot]] === id,
        fieldCapabilities: capabilityLabels(family.fieldCapabilities) || '별도 기능 없음',
        reach: item.modifiers?.attack?.rangeScale ?? 1,
        posture: item.modifiers?.attack?.postureDamageScale ?? 1,
      };
    }),
    capabilities: capabilityLabels(resolved.fieldCapabilities),
    commandGuide: resolved.offHandItem
      ? 'Basic 횡베기 · Strong 강공 · 방패 Guard/Just Guard/Basic 반격'
      : 'Basic 횡베기 · Strong 강공 · 방패 미장착으로 Guard 불가',
    stamina: '기본 입력별 스태미나 소모 유지 · 방패 Guard는 충격에 따라 소모',
    codex: {
      ...codex,
      sets: codex.sets.map((set) => ({
        ...set,
        bonuses: set.bonuses.map((b) => ({
          ...b,
          active: resolved.activeSetBonuses.some((a) => a.id === b.id),
        })),
      })),
      specialSynergies,
    },
  });
}
