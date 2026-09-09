import { DEFAULT_COMBAT_STAMINA_PROFILE } from '../../combat/CombatCommandController.js';
import { freezeEquipmentData } from './EquipmentData.js';
const base = {
  combatTiming: { startupScale: 1, recoveryScale: 1 },
  staminaProfileId: 'standard-combat',
  attackProfileId: 'field-cutter-standard',
  guardProfileId: 'field-shield-standard',
  animationProfile: 'field-cutter-standard',
  geometryProfile: {
    weaponLengthScale: 1,
    weaponContactPart: 'weapon',
    guardContactPart: 'shield',
  },
};
export const EQUIPMENT_MOVESET_PROFILES = freezeEquipmentData([
  {
    ...base,
    id: 'cutter-shield-standard',
    requirements: { mainFamilyId: 'field-cutter', offHandFamilyId: 'field-shield' },
    label: '절단검과 방호판',
    commands: {
      basic: true,
      strong: true,
      airBasic: true,
      guard: true,
      justGuard: true,
      guardCounter: true,
    },
  },
  {
    ...base,
    id: 'cutter-standard',
    requirements: { mainFamilyId: 'field-cutter', offHandFamilyId: null },
    label: '절단검',
    guardProfileId: null,
    commands: {
      basic: true,
      strong: true,
      airBasic: true,
      guard: false,
      justGuard: false,
      guardCounter: false,
    },
  },
]);

const staminaProfiles = Object.freeze({ 'standard-combat': DEFAULT_COMBAT_STAMINA_PROFILE });
export function getEquipmentStaminaProfile(id) {
  const profile = staminaProfiles[id];
  if (!Object.hasOwn(staminaProfiles, id))
    throw new RangeError('Unknown equipment stamina profile ' + id);
  return profile;
}
