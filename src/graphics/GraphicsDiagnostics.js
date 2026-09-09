export function graphicsBoneItems(bones = []) {
  const byId = new Map(bones.map((bone) => [bone.id, bone.position]));
  const items = [];
  const add = (id, points) =>
    items.push({
      id: `review-bone-${id}`,
      type: 'polygon',
      points,
      fill: '#72efd1',
      stroke: '#102b29',
      emissive: true,
      lineWidth: 0.35,
      renderOrder: 1000,
      order: items.length,
    });
  for (const bone of bones) {
    const p = bone.position,
      parent = byId.get(bone.parent);
    if (!p) continue;
    if (parent) {
      const dx = p.x - parent.x,
        dy = p.y - parent.y,
        length = Math.hypot(dx, dy) || 1,
        nx = (-dy / length) * 0.6,
        ny = (dx / length) * 0.6;
      add(`${bone.id}-link`, [
        { x: parent.x + nx, y: parent.y + ny },
        { x: p.x + nx, y: p.y + ny },
        { x: p.x - nx, y: p.y - ny },
        { x: parent.x - nx, y: parent.y - ny },
      ]);
    }
    add(bone.id, [
      { x: p.x - 1.5, y: p.y - 1.5 },
      { x: p.x + 1.5, y: p.y - 1.5 },
      { x: p.x + 1.5, y: p.y + 1.5 },
      { x: p.x - 1.5, y: p.y + 1.5 },
    ]);
  }
  return items;
}
