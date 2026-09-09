const PARTS = Object.freeze({
  weapon: /^(sword-(blade|hilt|trail))$/,
  shield: /^shield(?:-rivet-plate)?$/,
  helmet: /^head$/,
  bodyArmor: /^torso$/,
  boots: /^(front|back)-boot$/,
});
export function equipmentSlotForGraphic(item) {
  if (item.partId === 'weapon') return 'weapon';
  if (item.partId === 'shield') return 'shield';
  return Object.keys(PARTS).find((slot) => PARTS[slot].test(item.id)) ?? null;
}
export function applyEquipmentPresentation(items, resolved) {
  return Object.freeze(
    items
      .filter((item) => resolved.offHandItem || equipmentSlotForGraphic(item) !== 'shield')
      .map((item) => {
        const slot = equipmentSlotForGraphic(item),
          equipment = resolved.itemsBySlot[slot];
        return equipment
          ? Object.freeze({
              ...item,
              equipmentItemId: equipment.id,
              equipmentVisualProfileId: equipment.visualProfileId,
            })
          : item;
      }),
  );
}
