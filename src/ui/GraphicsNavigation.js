export function graphicsNavigation(catalog, select) {
  const leaf = (resource, label = resource.label) => ({
    label,
    resourceId: resource.id,
    run: (point) => select(resource.id, point),
  });
  const group = (resources, depth = 0) => {
    if (resources.length <= 6 || depth >= 2) return resources.map((r) => leaf(r));
    const field = depth === 0 ? 'regionId' : 'roomId';
    const labelField = depth === 0 ? 'regionLabel' : 'roomLabel';
    const groups = new Map();
    for (const resource of resources) {
      const key = resource[field] ?? 'shared';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(resource);
    }
    if (groups.size === 1) return group(resources, depth + 1);
    return [...groups.values()].map((items) => ({
      label: items[0][labelField] ?? items[0][field] ?? '공용·미배치',
      children: group(items, depth + 1),
    }));
  };
  const category = (label, id) => {
    const resources = catalog.resources.filter((r) => r.category === id);
    return resources.length === 1
      ? leaf(resources[0], label)
      : { label, children: group(resources) };
  };
  return {
    label: '찾기',
    children: [
      category('주인공', 'player'),
      {
        label: '몹',
        children: [category('유형 견본', 'enemy-reference'), category('실전 몹', 'enemy')],
      },
      category('NPC', 'npc'),
      category('장비', 'equipment'),
      {
        label: '월드',
        children: [
          category('장면', 'scene'),
          category('지형', 'terrain'),
          category('배경', 'background'),
          category('건물', 'building'),
          category('설비', 'facility'),
          category('소품', 'prop'),
          category('전경', 'foreground'),
        ],
      },
      { label: '효과·UI', children: [category('이펙트', 'effect'), category('UI·아이콘', 'ui')] },
    ],
  };
}
export function graphicsActionMenu(actions, select) {
  const leaf = (action) => ({ label: action.label.split(' · ')[0], run: () => select(action.id) });
  if (actions.length <= 6) return { label: '동작', children: actions.map(leaf) };
  if (actions.some((action) => action.attackKind)) {
    const kinds = [
      ...new Set(actions.filter((action) => action.attackKind).map((action) => action.attackKind)),
    ];
    return {
      label: '동작',
      children: [
        ...actions.filter((action) => !action.attackKind).map(leaf),
        ...kinds.map((kind) => {
          const members = actions.filter((action) => action.attackKind === kind);
          return {
            label: members[0].label.split(' · ')[0],
            children: members.map((action) => ({
              label: action.label.split(' · ').at(-1),
              run: () => select(action.id),
            })),
          };
        }),
      ],
    };
  }
  const moving = /idle|run|walk|move|advance|jump|fall|land|roll/i;
  const defending = /guard|block|hit|hurt|dead|surrender/i;
  const groups = [
    ['이동·대기', actions.filter((a) => moving.test(a.id))],
    ['공격', actions.filter((a) => !moving.test(a.id) && !defending.test(a.id))],
    ['방어·반응', actions.filter((a) => defending.test(a.id) && !moving.test(a.id))],
  ];
  return {
    label: '동작',
    children: groups
      .filter(([, items]) => items.length)
      .map(([label, items]) => ({ label, children: items.map(leaf) })),
  };
}
