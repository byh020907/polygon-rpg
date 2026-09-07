export function resolveEncounterBodyCollider(profile) {
  if (!profile || typeof profile !== 'object') {
    throw new TypeError('body collider에는 authored encounter profile이 필요합니다.');
  }
  const scale = profile.presentationScale;
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new TypeError('body collider에는 양의 presentationScale이 필요합니다.');
  }
  const boss = profile.role === 'boss';
  const human = profile.species === 'human-salvager';
  return Object.freeze({
    halfWidth: Math.max(20, Math.round((boss ? 80 : human ? 54 : 60) * scale)),
    height: Math.max(58, Math.round((boss ? 180 : human ? 150 : 158) * scale)),
    rollThrough: boss ? 'forbidden' : 'normal',
  });
}
