export const ENCHANTMENT_TRANSACTION_REASON = Object.freeze({
  MATERIAL_AWARDED: 'material-awarded',
  MATERIAL_ALREADY_CLAIMED: 'material-already-claimed',
  ENCHANT_UNLOCKED: 'enchant-unlocked',
  EQUIPPED: 'equipped',
  ALREADY_EQUIPPED: 'already-equipped',
  NOT_OWNED: 'not-owned',
});

export function createEnchantmentSnapshot() {
  return Object.freeze({
    materialIds: Object.freeze([]),
    unlockedIds: Object.freeze([]),
    activeId: null,
    claimedMaterialSourceIds: Object.freeze([]),
  });
}

export function canonicalizeEnchantmentSnapshot(snapshot, catalog) {
  if (!snapshot || typeof snapshot !== 'object')
    throw new TypeError('enchantment snapshot이 필요합니다.');
  const knownEnchantIds = new Set(catalog.profiles.map((profile) => profile.id));
  const knownMaterialIds = new Set(catalog.profiles.map((profile) => profile.materialId));
  const knownSourceIds = new Set(catalog.profiles.map((profile) => profile.sourceId));
  for (const [field, known] of [
    ['materialIds', knownMaterialIds],
    ['unlockedIds', knownEnchantIds],
    ['claimedMaterialSourceIds', knownSourceIds],
  ]) {
    if (
      !Array.isArray(snapshot[field]) ||
      new Set(snapshot[field]).size !== snapshot[field].length ||
      snapshot[field].some((id) => !known.has(id))
    )
      throw new TypeError(`지원하지 않는 enchantment ${field}입니다.`);
  }
  if (snapshot.activeId !== null && !snapshot.unlockedIds.includes(snapshot.activeId))
    throw new TypeError('active enchant는 해금된 catalog ID여야 합니다.');
  return Object.freeze({
    materialIds: Object.freeze([...snapshot.materialIds]),
    unlockedIds: Object.freeze([...snapshot.unlockedIds]),
    activeId: snapshot.activeId,
    claimedMaterialSourceIds: Object.freeze([...snapshot.claimedMaterialSourceIds]),
  });
}

function transaction(changed, reason, enchantment) {
  return Object.freeze({ changed, reason, enchantment });
}

export function awardEnchantMaterial(enchantment, { materialId, sourceId }, catalog) {
  const current = canonicalizeEnchantmentSnapshot(enchantment, catalog);
  const sourceProfile = catalog.getBySourceId(sourceId);
  if (!sourceProfile || sourceProfile.materialId !== materialId)
    throw new TypeError('catalog material source가 필요합니다.');
  if (current.claimedMaterialSourceIds.includes(sourceId))
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.MATERIAL_ALREADY_CLAIMED, current);
  return transaction(
    true,
    ENCHANTMENT_TRANSACTION_REASON.MATERIAL_AWARDED,
    Object.freeze({
      ...current,
      materialIds: Object.freeze([...current.materialIds, materialId]),
      claimedMaterialSourceIds: Object.freeze([...current.claimedMaterialSourceIds, sourceId]),
    }),
  );
}

export function unlockOrSelectEnchant(enchantment, enchantId, catalog) {
  const current = canonicalizeEnchantmentSnapshot(enchantment, catalog);
  const profile = catalog.getProfile(enchantId);
  if (current.activeId === profile.id)
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.ALREADY_EQUIPPED, current);
  if (current.unlockedIds.includes(profile.id))
    return transaction(
      true,
      ENCHANTMENT_TRANSACTION_REASON.EQUIPPED,
      Object.freeze({ ...current, activeId: profile.id }),
    );
  if (!current.materialIds.includes(profile.materialId))
    return transaction(false, ENCHANTMENT_TRANSACTION_REASON.NOT_OWNED, current);
  return transaction(
    true,
    ENCHANTMENT_TRANSACTION_REASON.ENCHANT_UNLOCKED,
    Object.freeze({
      ...current,
      materialIds: Object.freeze(current.materialIds.filter((id) => id !== profile.materialId)),
      unlockedIds: Object.freeze([...current.unlockedIds, profile.id]),
      activeId: profile.id,
    }),
  );
}
