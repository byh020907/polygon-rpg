export const EASING = Object.freeze({
  linear: (value) => value,
  smoothStep: (value) => value * value * (3 - 2 * value),
  easeIn: (value) => value * value,
  easeOut: (value) => 1 - (1 - value) * (1 - value),
  easeInOut: (value) => (value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2),
  overshoot: (value) => {
    const strength = 1.70158;
    const shifted = value - 1;
    return 1 + (strength + 1) * shifted * shifted * shifted + strength * shifted * shifted;
  },
});

export function applyEasing(name, value) {
  const easing = EASING[name];
  if (!easing) throw new Error(`알 수 없는 easing입니다: ${name}`);
  return easing(Math.max(0, Math.min(1, value)));
}
