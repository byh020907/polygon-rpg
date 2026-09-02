export const ROLL_TIMELINE_MARKERS = Object.freeze([
  Object.freeze({ id: 'roll-plant', start: 0, end: 0.12, gameplay: 'body-solid' }),
  Object.freeze({ id: 'roll-tuck', start: 0.12, end: 0.36, gameplay: 'evade-and-body-through' }),
  Object.freeze({ id: 'roll-contact', start: 0.36, end: 0.62, gameplay: 'evade-and-body-through' }),
  Object.freeze({ id: 'roll-unfold', start: 0.62, end: 0.84, gameplay: 'body-solid' }),
  Object.freeze({ id: 'roll-recover', start: 0.84, end: 1, gameplay: 'body-solid' }),
]);

export function rollTimelineMarkerAt(progress) {
  const boundedProgress = Math.max(0, Math.min(1, progress));
  return (
    ROLL_TIMELINE_MARKERS.find(
      (marker) => boundedProgress >= marker.start && boundedProgress < marker.end,
    ) ?? ROLL_TIMELINE_MARKERS.at(-1)
  );
}
