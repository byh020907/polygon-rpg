function freezeAction(action) {
  return Object.freeze({ ...action });
}

const TRAVEL_ACTIONS = Object.freeze({
  'academy-sealed-road': freezeAction({
    label: '학원촌 길 → 봉인숲 도로',
    clockCostMinutes: 90,
    deadlineCostMinutes: 90,
  }),
  'sealed-canopy-detour': freezeAction({
    label: '봉인숲 도로 → 수관 우회로',
    clockCostMinutes: 45,
    deadlineCostMinutes: 45,
  }),
  'cleared-sealed-road': freezeAction({
    label: '정리한 도로 → 봉인 회랑',
    clockCostMinutes: 30,
    deadlineCostMinutes: 30,
  }),
  'canopy-dungeon-trail': freezeAction({
    label: '수관 우회로 → 봉인 회랑',
    clockCostMinutes: 60,
    deadlineCostMinutes: 60,
  }),
  'sealed-shortcut-return': freezeAction({
    label: '봉인숲 shortcut 귀환',
    clockCostMinutes: 20,
    deadlineCostMinutes: 20,
  }),
  'academy-glasswind-canyon': freezeAction({
    label: '학원촌 길 → 유리바람 협곡',
    clockCostMinutes: 120,
    deadlineCostMinutes: 120,
  }),
  'glasswind-observatory-climb': freezeAction({
    label: '유리바람 협곡 → 관측소 등반로',
    clockCostMinutes: 60,
    deadlineCostMinutes: 60,
  }),
  'glasswind-shortcut-return': freezeAction({
    label: '유리바람 shortcut 귀환',
    clockCostMinutes: 25,
    deadlineCostMinutes: 25,
  }),
});

const CORE_EVENT_ACTIONS = Object.freeze({
  'training-cleared': freezeAction({
    label: '학원촌 전투 훈련',
    clockCostMinutes: 45,
    deadlineCostMinutes: 45,
    repeatable: true,
  }),
  'player-ko': freezeAction({
    label: 'KO 후 Checkpoint 회복',
    clockCostMinutes: 60,
    deadlineCostMinutes: 60,
    repeatable: true,
  }),
  'field-guardian-defeated': freezeAction({
    label: '봉인숲 guardian 해결',
    clockCostMinutes: 30,
    deadlineCostMinutes: 30,
    deadlineExtensionMinutes: 60,
  }),
  'dungeon-guardian-defeated': freezeAction({
    label: '봉인 회랑 핵심 관문 해결',
    clockCostMinutes: 45,
    deadlineCostMinutes: 45,
    deadlineExtensionMinutes: 90,
  }),
  'boss-defeated': freezeAction({
    label: '봉인숲 Boss 해결',
    clockCostMinutes: 60,
    deadlineCostMinutes: 60,
    deadlineExtensionMinutes: 180,
  }),
  'glasswind-hunter-defeated': freezeAction({
    label: '유리바람 guardian 해결',
    clockCostMinutes: 35,
    deadlineCostMinutes: 35,
    deadlineExtensionMinutes: 75,
  }),
  'glasswind-boss-defeated': freezeAction({
    label: '유리바람 Boss 해결',
    clockCostMinutes: 70,
    deadlineCostMinutes: 70,
    deadlineExtensionMinutes: 210,
  }),
});

export const WORLD_TIME_PROFILE = Object.freeze({
  getTravelAction(travelSegmentId) {
    return TRAVEL_ACTIONS[travelSegmentId] ?? null;
  },
  getCoreEventAction(eventKind) {
    return CORE_EVENT_ACTIONS[eventKind] ?? null;
  },
});
