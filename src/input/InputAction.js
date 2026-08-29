export const INPUT_ACTION = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
  JUMP: 'jump',
  BASIC_ATTACK: 'basicAttack',
  STRONG_ATTACK: 'strongAttack',
  GUARD: 'guard',
});

export const INPUT_ACTIONS = Object.freeze(Object.values(INPUT_ACTION));

export const SEQUENCED_INPUT_ACTIONS = Object.freeze([
  INPUT_ACTION.JUMP,
  INPUT_ACTION.BASIC_ATTACK,
  INPUT_ACTION.STRONG_ATTACK,
]);

export const KEYBOARD_ACTION_BY_CODE = Object.freeze({
  ArrowLeft: INPUT_ACTION.LEFT,
  ArrowRight: INPUT_ACTION.RIGHT,
  ArrowUp: INPUT_ACTION.JUMP,
  ArrowDown: INPUT_ACTION.GUARD,
  KeyA: INPUT_ACTION.BASIC_ATTACK,
  KeyS: INPUT_ACTION.STRONG_ATTACK,
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
