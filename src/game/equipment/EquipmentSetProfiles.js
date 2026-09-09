import { freezeEquipmentData } from './EquipmentData.js';
export const EQUIPMENT_SET_PROFILES = freezeEquipmentData([
  {
    id: 'field-work-set',
    label: '현장 작업 세트',
    description: '작업모·작업 덧옷·작업화의 공개 세트 보너스.',
    bonuses: [
      {
        id: 'field-work-set-two',
        pieces: 2,
        label: '안정된 방호',
        description: 'Guard 접촉 시 Stamina 부담 2% 감소.',
        modifiers: { guard: { staminaDamageScale: 0.98 } },
      },
      {
        id: 'field-work-set-three',
        pieces: 3,
        label: '현장 보호',
        description: '받는 피해 2% 감소.',
        modifiers: { defense: { damageTakenScale: 0.98 } },
      },
    ],
  },
]);
