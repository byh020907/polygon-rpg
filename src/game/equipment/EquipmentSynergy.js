import { freezeEquipmentData, EQUIPMENT_SLOT_KEYS } from './EquipmentData.js';
function equippedItems(loadout, catalog) {
  return Object.fromEntries(
    Object.entries(EQUIPMENT_SLOT_KEYS).map(([slot, key]) => [
      slot,
      loadout[key] === null || loadout[key] === undefined ? null : catalog.getItem(loadout[key]),
    ]),
  );
}
function matches(requirement, item) {
  return (
    Boolean(item) &&
    (!requirement.itemId || item.id === requirement.itemId) &&
    (!requirement.familyId || item.familyId === requirement.familyId)
  );
}
export function evaluateEquipmentSynergies(loadout, catalog) {
  const items = equippedItems(loadout, catalog);
  const counts = new Map();
  for (const item of new Map(
    Object.values(items)
      .filter(Boolean)
      .map((item) => [item.id, item]),
  ).values())
    if (item.setId) counts.set(item.setId, (counts.get(item.setId) ?? 0) + 1);
  const activeSetBonuses = catalog.sets.flatMap((set) =>
    set.bonuses
      .filter((bonus) => (counts.get(set.id) ?? 0) >= bonus.pieces)
      .map((bonus) => ({
        ...bonus,
        setId: set.id,
        setLabel: set.label,
        equippedPieces: counts.get(set.id),
      })),
  );
  const activeSpecialSynergies = catalog.specialSynergies.filter((synergy) =>
    synergy.requirements.every((requirement) => matches(requirement, items[requirement.slot])),
  );
  return freezeEquipmentData({
    activeSetBonuses,
    activeSpecialSynergies,
    activeSpecialSynergyIds: activeSpecialSynergies.map((s) => s.id),
  });
}
export function getNewlyDiscoveredSpecialSynergyIds(loadout, catalog, discoveredIds = []) {
  const known = new Set(discoveredIds);
  return Object.freeze(
    evaluateEquipmentSynergies(loadout, catalog).activeSpecialSynergyIds.filter(
      (id) => !known.has(id),
    ),
  );
}
export function createEquipmentSynergyCodex({
  catalog,
  everOwnedItemIds = [],
  discoveredIds = [],
}) {
  const history = everOwnedItemIds.map((id) => catalog.getItem(id));
  const known = new Set(discoveredIds);
  for (const id of known)
    if (!catalog.specialSynergies.some((s) => s.id === id))
      throw new RangeError('Unknown discovered special synergy ' + id);
  const specialSynergies = catalog.specialSynergies.flatMap((synergy) => {
    if (known.has(synergy.id)) return [{ ...synergy, discovered: true, status: 'discovered' }];
    if (
      synergy.requirements.some((requirement) => history.some((item) => matches(requirement, item)))
    )
      return [{ id: synergy.id, label: '???', discovered: false, status: 'unknown' }];
    return [];
  });
  return freezeEquipmentData({ sets: catalog.sets, specialSynergies });
}
