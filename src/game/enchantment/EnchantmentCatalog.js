export const ENCHANTMENT_CATALOG = Object.freeze({
  profiles: Object.freeze([
    Object.freeze({
      id: 'fire',
      label: '화염',
      materialId: 'heat-cell',
      materialLabel: '축열 전지',
      goldCosts: Object.freeze([60, 120, 240, 480, 960]),
      color: '#ff784f',
      highlightColor: '#ffd2b8',
      shape: 'ember',
    }),
    Object.freeze({
      id: 'ice',
      label: '냉기',
      materialId: 'coolant-crystal',
      materialLabel: '냉각 결정',
      goldCosts: Object.freeze([60, 120, 240, 480, 960]),
      color: '#77ddff',
      highlightColor: '#e7fbff',
      shape: 'shard',
    }),
    Object.freeze({
      id: 'earth',
      label: '대지',
      materialId: 'mineral-alloy',
      materialLabel: '광물 합금',
      goldCosts: Object.freeze([60, 120, 240, 480, 960]),
      color: '#b7e37f',
      highlightColor: '#ecffd0',
      shape: 'fragment',
    }),
    Object.freeze({
      id: 'lightning',
      label: '전기',
      materialId: 'conductive-coil',
      materialLabel: '전도 코일',
      goldCosts: Object.freeze([60, 120, 240, 480, 960]),
      color: '#ffe36e',
      highlightColor: '#fff7aa',
      shape: 'bolt',
    }),
  ]),
  getProfile(id) {
    const profile = this.profiles.find((candidate) => candidate.id === id);
    if (!profile) throw new Error(`알 수 없는 enchant ID입니다: ${id}`);
    return profile;
  },
});
