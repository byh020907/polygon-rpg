import { defineRootMotionCurve } from './RootMotionCurve.js';
// Preserve the existing roll's ease-in/ease-out movement while integrating the full gameplay distance exactly.
export const DEFAULT_ROLL_ROOT_CURVE = defineRootMotionCurve({
  id: 'roll-ease',
  keys: Array.from({ length: 33 }, (_, i) => {
    const at = i / 32;
    return { at, x: (1 - Math.cos(Math.PI * at)) / 2, y: 0 };
  }),
});
