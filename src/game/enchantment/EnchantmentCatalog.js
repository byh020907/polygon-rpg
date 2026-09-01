export const ENCHANTMENT_CATALOG = Object.freeze({
  profiles: Object.freeze([
    Object.freeze({
      id: 'fire',
      label: '화염',
      materialId: 'cinderbloom-seed',
      materialLabel: '잿불꽃 씨앗',
      sourceId: 'field-guardian-defeated',
      color: '#ff784f',
      highlightColor: '#ffd2b8',
      shape: 'ember',
    }),
    Object.freeze({
      id: 'ice',
      label: '냉기',
      materialId: 'frostroot-crystal',
      materialLabel: '서리뿌리 결정',
      sourceId: 'dungeon-guardian-defeated',
      color: '#77ddff',
      highlightColor: '#e7fbff',
      shape: 'shard',
    }),
    Object.freeze({
      id: 'earth',
      label: '대지',
      materialId: 'sealstone-heart',
      materialLabel: '봉인석 심장',
      sourceId: 'boss-reward-claimed',
      color: '#b7e37f',
      highlightColor: '#ecffd0',
      shape: 'fragment',
    }),
    Object.freeze({
      id: 'lightning',
      label: '전기',
      materialId: 'stormglass-prism',
      materialLabel: '폭풍유리 프리즘',
      sourceId: 'glasswind-reward-claimed',
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
  getBySourceId(sourceId) {
    return this.profiles.find((candidate) => candidate.sourceId === sourceId) ?? null;
  },
});
