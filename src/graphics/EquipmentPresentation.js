import { EQUIPMENT_VISUAL_PARTS } from './EquipmentVisualProfiles.js';
import { PLAYER_CHARACTER_FOOT_OFFSET } from '../combat/SharedCombatGeometry.js';
const PARTS = Object.freeze({
  weapon: /^(sword-(blade|hilt|trail))$/,
  shield: /^shield(?:-rivet-plate)?$/,
  helmet: /^head$/,
  bodyArmor: /^torso$/,
  boots: /^(front|back)-boot$/,
  tool: /^tool-bag$/,
});
export function equipmentSlotForGraphic(item) {
  if (item.equipmentSlot) return item.equipmentSlot;
  if (item.partId === 'weapon') return 'weapon';
  if (item.partId === 'shield') return 'shield';
  return Object.keys(PARTS).find((slot) => PARTS[slot].test(item.id)) ?? null;
}
export function applyEquipmentPresentation(items, resolved, context = null) {
  const base = items
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
    });
  return Object.freeze([...base, ...sampleEquipmentParts(resolved, context)]);
}

export function sampleEquipmentParts(resolved, context) {
  if (!context?.bonePose) return [];
  const { bonePose, position, facing = 1, scale = 0.77, renderOrder = 30.5 } = context;
  const result = [];
  for (const [slot, item] of Object.entries(resolved.itemsBySlot)) {
    if (!item) continue;
    const parts = EQUIPMENT_VISUAL_PARTS[item.visualProfileId] ?? [];
    for (const part of parts) {
      const joint = bonePose.projectedJoints[part.joint],
        world = bonePose.worldJoints[part.joint];
      if (!joint || !world) throw new Error('Equipment joint missing ' + part.joint);
      const m = world.matrix;
      const mapped = part.points.map(([u, v]) => {
        const x = (u + part.offset[0]) * part.extent[0],
          y = (v + part.offset[1]) * part.extent[1];
        return {
          x: position.x + (joint.x + m[0][0] * x + m[0][1] * y) * scale * facing,
          y:
            position.y +
            PLAYER_CHARACTER_FOOT_OFFSET +
            (joint.y - PLAYER_CHARACTER_FOOT_OFFSET + m[1][0] * x + m[1][1] * y) * scale,
          depth: (joint.depth ?? 0) * scale + (m[2][0] * x + m[2][1] * y) * scale + 0.65,
        };
      });
      const points = Object.freeze(mapped.map((p) => Object.freeze({ x: p.x, y: p.y }))),
        depths = Object.freeze(mapped.map((p) => p.depth));
      const triangles = Object.freeze(
        Array.from({ length: points.length - 2 }, (_, i) => Object.freeze([0, i + 1, i + 2])),
      );
      result.push(
        Object.freeze({
          id: 'equipment-' + slot + '-' + part.id,
          equipmentSlot: slot,
          equipmentItemId: item.id,
          equipmentVisualProfileId: item.visualProfileId,
          points,
          depths,
          surface: Object.freeze({ points, depths, triangles }),
          depthGroup: 'player',
          depthWrite: true,
          renderOrder,
          order: 25 + result.length,
          fill: part.fill,
          materialId: part.material,
          emissive: part.emissive ?? false,
          stroke: '#343b37',
          lineWidth: 0.8,
          opacity: 1,
          surfaceNormal: { x: m[0][2] * facing, y: m[1][2], z: m[2][2] },
        }),
      );
    }
  }
  return result;
}
