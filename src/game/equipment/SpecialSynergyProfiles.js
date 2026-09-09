import { freezeEquipmentData } from './EquipmentData.js';
export const SPECIAL_SYNERGY_PROFILES = freezeEquipmentData([
  {
    id: 'braced-counter',
    label: '지지 반격',
    description: 'Just Guard 뒤 Basic 반격의 posture 피해 15% 증가.',
    requirements: [
      { slot: 'weapon', itemId: 'field-cutter-heavy' },
      { slot: 'shield', itemId: 'field-shield-standard' },
      { slot: 'boots', itemId: 'field-work-boots' },
    ],
    modifiers: { command: { guardCounterPostureScale: 1.15 } },
  },
]);
