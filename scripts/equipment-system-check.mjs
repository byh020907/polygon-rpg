import { DEFAULT_COMBAT_STAMINA_PROFILE } from '../src/combat/CombatCommandController.js';
import assert from 'node:assert/strict';
const BASELINE = [
  {
    id: 'field-cutter-balanced',
    modifiers: {
      combatTiming: {
        startupScale: 0.82,
        recoveryScale: 0.84,
      },
      attack: {
        damageScale: 0.9,
        rangeScale: 0.92,
        hitstunScale: 0.85,
        launchScale: 0.92,
        postureDamageScale: 1,
        backPunishDamageScale: 1,
      },
      defense: {
        damageTakenScale: 1.08,
      },
      guard: {
        impactScale: 1.08,
        blockstunScale: 1.08,
      },
      geometry: {
        weaponLengthScale: 0.94,
      },
    },
    goldCost: 0,
    trainingMarkRequirement: 0,
  },
  {
    id: 'field-cutter-heavy',
    modifiers: {
      combatTiming: {
        startupScale: 1.22,
        recoveryScale: 1.28,
      },
      attack: {
        damageScale: 1.2,
        rangeScale: 1.22,
        hitstunScale: 1.3,
        launchScale: 1.18,
        postureDamageScale: 1,
        backPunishDamageScale: 1,
      },
      defense: {
        damageTakenScale: 0.92,
      },
      guard: {
        impactScale: 0.84,
        blockstunScale: 0.84,
      },
      geometry: {
        weaponLengthScale: 1.18,
      },
    },
    goldCost: 120,
    trainingMarkRequirement: 0,
  },
  {
    id: 'field-cutter-swift',
    modifiers: {
      combatTiming: {
        startupScale: 0.68,
        recoveryScale: 0.7,
      },
      attack: {
        damageScale: 0.78,
        rangeScale: 0.84,
        hitstunScale: 0.72,
        launchScale: 1.06,
        postureDamageScale: 0.8,
        backPunishDamageScale: 1,
      },
      defense: {
        damageTakenScale: 1.12,
      },
      guard: {
        impactScale: 1.12,
        blockstunScale: 1.12,
      },
      geometry: {
        weaponLengthScale: 0.88,
      },
    },
    goldCost: 0,
    trainingMarkRequirement: 0,
  },
  {
    id: 'field-cutter-breaker',
    modifiers: {
      combatTiming: {
        startupScale: 1.18,
        recoveryScale: 1.24,
      },
      attack: {
        damageScale: 1.04,
        rangeScale: 0.94,
        hitstunScale: 1.2,
        launchScale: 0.86,
        postureDamageScale: 1.65,
        backPunishDamageScale: 1,
      },
      defense: {
        damageTakenScale: 0.96,
      },
      guard: {
        impactScale: 0.82,
        blockstunScale: 0.84,
      },
      geometry: {
        weaponLengthScale: 0.98,
      },
    },
    goldCost: 0,
    trainingMarkRequirement: 0,
  },
  {
    id: 'field-cutter-reach',
    modifiers: {
      combatTiming: {
        startupScale: 1.08,
        recoveryScale: 1.18,
      },
      attack: {
        damageScale: 0.88,
        rangeScale: 1.42,
        hitstunScale: 0.9,
        launchScale: 0.9,
        postureDamageScale: 0.85,
        backPunishDamageScale: 1.55,
      },
      defense: {
        damageTakenScale: 1.1,
      },
      guard: {
        impactScale: 1.08,
        blockstunScale: 1.08,
      },
      geometry: {
        weaponLengthScale: 1.36,
      },
    },
    goldCost: 0,
    trainingMarkRequirement: 0,
  },
];
import {
  EQUIPMENT_CATALOG,
  createEquipmentCatalog,
  getEnchantableEquipmentItemIds,
} from '../src/game/equipment/EquipmentCatalog.js';
import {
  DEFAULT_LOADOUT,
  DEFAULT_OWNED_EQUIPMENT_ITEM_IDS,
  EQUIPMENT_SLOT_KEYS,
  normalizeLoadout,
  validateLoadout,
  resolveEquipmentLoadout,
} from '../src/game/equipment/EquipmentLoadout.js';
import {
  evaluateEquipmentFieldCapability,
  hasFieldCapability,
} from '../src/game/equipment/EquipmentFieldCapabilities.js';
import {
  createEquipmentSynergyCodex,
  getNewlyDiscoveredSpecialSynergyIds,
} from '../src/game/equipment/EquipmentSynergy.js';

assert.deepEqual(Object.keys(EQUIPMENT_SLOT_KEYS), [
  'weapon',
  'shield',
  'helmet',
  'bodyArmor',
  'boots',
  'tool',
]);
assert.equal(EQUIPMENT_CATALOG.items.length, 10);
for (const item of EQUIPMENT_CATALOG.items) {
  assert.equal(typeof item.visualProfileId, 'string');
  assert.ok(['raw-steel', 'painted-steel', 'cloth'].includes(item.materialProfileId));
}
assert.equal(
  resolveEquipmentLoadout(DEFAULT_LOADOUT).staminaProfile,
  DEFAULT_COMBAT_STAMINA_PROFILE,
);
assert.equal(EQUIPMENT_CATALOG.families.length, 6);
assert.ok(Object.isFrozen(EQUIPMENT_CATALOG) && Object.isFrozen(EQUIPMENT_CATALOG.items));
assert.throws(() => {
  EQUIPMENT_CATALOG.items[0].modifiers.attack.damageScale = 9;
}, TypeError);
assert.deepEqual(normalizeLoadout(), DEFAULT_LOADOUT);
assert.deepEqual(getEnchantableEquipmentItemIds(DEFAULT_OWNED_EQUIPMENT_ITEM_IDS), [
  'field-cutter-balanced',
]);
for (const expected of BASELINE) {
  const resolved = resolveEquipmentLoadout({ ...DEFAULT_LOADOUT, weaponItemId: expected.id });
  const categoryMap = {
    combatTiming: resolved.combatTiming,
    attack: resolved.attackModifiers,
    defense: resolved.defenseModifiers,
    guard: resolved.guardModifiers,
    geometry: resolved.geometryProfile,
  };
  for (const [category, values] of Object.entries(expected.modifiers))
    for (const [key, value] of Object.entries(values))
      assert.equal(
        categoryMap[category][key],
        value,
        expected.id + '/' + category + '/' + key + ' preserves exact baseline',
      );
  assert.equal(resolved.mainItem.goldCost, expected.goldCost);
  assert.equal(resolved.mainItem.trainingMarkRequirement, expected.trainingMarkRequirement);
  assert.equal(resolved.activeSetBonuses.length, 0);
  assert.equal(resolved.activeSpecialSynergies.length, 0);
  assert.equal(resolved.commandModifiers.guardCounterPostureScale, 1);
  assert.equal(resolved.guardModifiers.staminaDamageScale, 1);
}
for (const loadout of [
  { ...DEFAULT_LOADOUT, weaponItemId: null },
  { ...DEFAULT_LOADOUT, weaponItemId: 'missing' },
  { ...DEFAULT_LOADOUT, shieldItemId: 'field-work-helmet' },
  { ...DEFAULT_LOADOUT, otherItemId: null },
  { helmetItemId: 'field-work-helmet' },
  [],
])
  assert.throws(() => validateLoadout(loadout));
assert.throws(
  () =>
    validateLoadout({ ...DEFAULT_LOADOUT, weaponItemId: 'field-cutter-heavy' }, EQUIPMENT_CATALOG, {
      ownedItemIds: DEFAULT_OWNED_EQUIPMENT_ITEM_IDS,
    }),
  /unowned/,
);
const withoutShield = resolveEquipmentLoadout({ ...DEFAULT_LOADOUT, shieldItemId: null });
assert.equal(withoutShield.moveset.id, 'cutter-standard');
assert.equal(withoutShield.commandModifiers.guardEnabled, false);
assert.equal(withoutShield.commandModifiers.justGuardEnabled, false);
assert.equal(withoutShield.commandModifiers.guardCounterEnabled, false);
assert.equal(withoutShield.attackModifiers.damageScale, 0.9);
assert.equal(withoutShield.offHandItem, null);
assert.equal(hasFieldCapability(withoutShield, 'cable-cut'), true);
assert.equal(hasFieldCapability(withoutShield, 'brace'), false);
assert.deepEqual(
  evaluateEquipmentFieldCapability(withoutShield, { capabilityId: 'brace', mode: 'assist' }),
  {
    capabilityId: 'brace',
    mode: 'assist',
    available: false,
    allowed: true,
    assisted: false,
    reason: 'optional-capability-unavailable',
  },
);
assert.equal(
  evaluateEquipmentFieldCapability(withoutShield, { capabilityId: 'brace', mode: 'require' })
    .allowed,
  false,
);
assert.equal(
  evaluateEquipmentFieldCapability(resolveEquipmentLoadout(DEFAULT_LOADOUT), {
    capabilityId: 'brace',
    mode: 'assist',
  }).assisted,
  true,
);
assert.throws(() =>
  evaluateEquipmentFieldCapability(withoutShield, { capabilityId: 'brace', mode: 'force' }),
);

// Future weapon/tool fixtures prove slot/hand/moveset validation without shipping content.
const fixtureData = () => ({
  families: structuredClone(EQUIPMENT_CATALOG.families),
  movesets: structuredClone(EQUIPMENT_CATALOG.movesets),
  items: structuredClone(EQUIPMENT_CATALOG.items),
  sets: structuredClone(EQUIPMENT_CATALOG.sets),
  specialSynergies: structuredClone(EQUIPMENT_CATALOG.specialSynergies),
  defaultItemId: EQUIPMENT_CATALOG.defaultItemId,
});
const future = fixtureData();
future.families.push({
  id: 'fixture-two-hand',
  label: 'fixture',
  slot: 'weapon',
  handUsage: 'twoHand',
  enchantable: false,
  fieldCapabilities: ['heavy-joint-break'],
  movesetBindings: [
    { offHandFamilyId: null, movesetId: 'fixture-two-hand-single' },
    { offHandFamilyId: 'field-shield', movesetId: 'fixture-two-hand-shield' },
  ],
});
future.families
  .find((f) => f.id === 'field-shield')
  .compatibleMainFamilies.push('fixture-two-hand');
future.movesets.push(
  {
    ...structuredClone(EQUIPMENT_CATALOG.getMoveset('cutter-standard')),
    id: 'fixture-two-hand-single',
    requirements: { mainFamilyId: 'fixture-two-hand', offHandFamilyId: null },
  },
  {
    ...structuredClone(EQUIPMENT_CATALOG.getMoveset('cutter-shield-standard')),
    id: 'fixture-two-hand-shield',
    requirements: { mainFamilyId: 'fixture-two-hand', offHandFamilyId: 'field-shield' },
  },
);
future.items.push({
  id: 'fixture-heavy-tool',
  familyId: 'fixture-two-hand',
  label: 'fixture',
  goldCost: 0,
  trainingMarkRequirement: 0,
  modifiers: {},
});
let catalog = createEquipmentCatalog(future);
assert.equal(
  resolveEquipmentLoadout(
    { ...DEFAULT_LOADOUT, weaponItemId: 'fixture-heavy-tool', shieldItemId: null },
    catalog,
  ).mainFamily.handUsage,
  'twoHand',
);
assert.throws(
  () =>
    resolveEquipmentLoadout({ ...DEFAULT_LOADOUT, weaponItemId: 'fixture-heavy-tool' }, catalog),
  /Incompatible/,
);
future.families.at(-1).twoHandCompatibleOffHandFamilies = ['field-shield'];
catalog = createEquipmentCatalog(future);
assert.equal(
  resolveEquipmentLoadout({ ...DEFAULT_LOADOUT, weaponItemId: 'fixture-heavy-tool' }, catalog)
    .moveset.id,
  'fixture-two-hand-shield',
);
future.families.find((f) => f.id === 'tool').fieldCapabilities = ['retrieve'];
future.items.push({
  id: 'fixture-retrieval-tool',
  familyId: 'tool',
  label: 'fixture',
  goldCost: 0,
  trainingMarkRequirement: 0,
  modifiers: {},
});
catalog = createEquipmentCatalog(future);
const utility = resolveEquipmentLoadout(
  { ...DEFAULT_LOADOUT, toolItemId: 'fixture-retrieval-tool' },
  catalog,
);
assert.equal(utility.utilityItem.id, 'fixture-retrieval-tool');
assert.ok(utility.fieldCapabilities.includes('retrieve'));
const invalid = fixtureData();
invalid.items[0].modifiers.attack.damageScale = -1;
assert.throws(() => createEquipmentCatalog(invalid), /Positive/);

const two = {
  ...DEFAULT_LOADOUT,
  helmetItemId: 'field-work-helmet',
  bodyArmorItemId: 'field-work-body',
};
const three = { ...two, bootsItemId: 'field-work-boots' };
assert.equal(
  resolveEquipmentLoadout({ ...DEFAULT_LOADOUT, helmetItemId: 'field-work-helmet' })
    .activeSetBonuses.length,
  0,
);
const twoResolved = resolveEquipmentLoadout(two);
assert.equal(twoResolved.activeSetBonuses.length, 1);
assert.equal(twoResolved.guardModifiers.staminaDamageScale, 0.98);
assert.equal(twoResolved.defenseModifiers.damageTakenScale, 1.08);
const threeResolved = resolveEquipmentLoadout(three);
assert.equal(threeResolved.activeSetBonuses.length, 2);
assert.equal(threeResolved.defenseModifiers.damageTakenScale, 1.08 * 0.98);
assert.equal(threeResolved.guardModifiers.staminaDamageScale, 0.98);
assert.equal(threeResolved.itemsBySlot.bodyArmor.id, 'field-work-body');
const special = {
  ...DEFAULT_LOADOUT,
  weaponItemId: 'field-cutter-heavy',
  bootsItemId: 'field-work-boots',
};
const specialResolved = resolveEquipmentLoadout(special);
assert.deepEqual(specialResolved.activeSpecialSynergyIds, ['braced-counter']);
assert.equal(specialResolved.commandModifiers.guardCounterPostureScale, 1.15);
assert.equal(specialResolved.attackModifiers.damageScale, 1.2);
assert.deepEqual(getNewlyDiscoveredSpecialSynergyIds(special, EQUIPMENT_CATALOG), [
  'braced-counter',
]);
assert.deepEqual(
  getNewlyDiscoveredSpecialSynergyIds(special, EQUIPMENT_CATALOG, ['braced-counter']),
  [],
);
assert.equal(
  createEquipmentSynergyCodex({
    catalog: EQUIPMENT_CATALOG,
    everOwnedItemIds: ['field-cutter-balanced'],
  }).specialSynergies.length,
  0,
);
const unknown = createEquipmentSynergyCodex({
  catalog: EQUIPMENT_CATALOG,
  everOwnedItemIds: ['field-shield-standard'],
}).specialSynergies[0];
assert.deepEqual(Object.keys(unknown).sort(), ['discovered', 'id', 'label', 'status']);
assert.equal(unknown.label, '???');
const discovered = createEquipmentSynergyCodex({
  catalog: EQUIPMENT_CATALOG,
  everOwnedItemIds: [],
  discoveredIds: ['braced-counter'],
}).specialSynergies[0];
assert.equal(discovered.label, '지지 반격');
assert.equal(discovered.requirements.length, 3);
assert.equal(discovered.modifiers.command.guardCounterPostureScale, 1.15);
assert.equal(
  resolveEquipmentLoadout(DEFAULT_LOADOUT).activeSpecialSynergies.length,
  0,
  'unequipping removes effect independently of permanent codex discovery',
);
assert.ok(
  Object.isFrozen(specialResolved.itemsBySlot) && Object.isFrozen(specialResolved.commandModifiers),
);
console.log(
  JSON.stringify({
    status: 'PASS',
    checks: [
      'immutable-six-slot-catalog-and-owned-validation',
      'five-variant-exact-numeric-parity',
      'family-two-hand-exception-and-future-tool-fixtures',
      'shieldless-command-grammar-and-field-assist-require',
      'public-distinct-piece-set-multiplication',
      'special-command-hook-and-hidden-unknown-permanent-discovery',
    ],
  }),
);
