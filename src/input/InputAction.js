export const INPUT_ACTION = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
  JUMP: 'jump',
  PRIMARY_ATTACK: 'primaryAttack',
  THRUST_ATTACK: 'thrustAttack',
  HEAVY_ATTACK: 'heavyAttack',
  RISING_ATTACK: 'risingAttack',
  RAGE_ATTACK: 'rageAttack',
  GUARD: 'guard',
  CROUCH: 'crouch',
});

export const INPUT_ACTIONS = Object.freeze(Object.values(INPUT_ACTION));

export const SEQUENCED_INPUT_ACTIONS = Object.freeze([
  INPUT_ACTION.JUMP,
  INPUT_ACTION.PRIMARY_ATTACK,
  INPUT_ACTION.THRUST_ATTACK,
  INPUT_ACTION.HEAVY_ATTACK,
  INPUT_ACTION.RISING_ATTACK,
  INPUT_ACTION.RAGE_ATTACK,
]);

export const KEYBOARD_ACTION_BY_CODE = Object.freeze({
  ArrowLeft: INPUT_ACTION.LEFT,
  ArrowRight: INPUT_ACTION.RIGHT,
  Space: INPUT_ACTION.JUMP,
  KeyA: INPUT_ACTION.PRIMARY_ATTACK,
  KeyS: INPUT_ACTION.THRUST_ATTACK,
  KeyQ: INPUT_ACTION.HEAVY_ATTACK,
  KeyW: INPUT_ACTION.RISING_ATTACK,
  KeyE: INPUT_ACTION.RAGE_ATTACK,
  ArrowUp: INPUT_ACTION.GUARD,
  ArrowDown: INPUT_ACTION.CROUCH,
});

export function sequenceKey(actionId) {
  return `${actionId}Sequence`;
}

export function assertInputAction(actionId) {
  if (!INPUT_ACTIONS.includes(actionId)) {
    throw new Error(`지원하지 않는 input action입니다: ${actionId}`);
  }
  return actionId;
}
