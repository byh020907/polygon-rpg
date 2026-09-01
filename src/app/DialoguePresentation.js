function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function dialogueSafeBounds(dialogue, viewport) {
  const width = viewport.cssWidth;
  const height = viewport.cssHeight;
  const inset = 18;
  const landscape = width <= 900;
  const mobileLandscape = landscape && width > height;
  const active = dialogue.active === true;
  const preferredHalfWidth = active ? (landscape ? 150 : 168) : 105;
  const halfWidth = Math.min(preferredHalfWidth, Math.max(0, (width - inset * 2) / 2));
  const bodyHeight = active ? (landscape ? 108 : 124) : 42;
  const bottomInset = mobileLandscape ? 110 : inset;
  const maximumY = height - bottomInset;
  const minimumY = Math.min(maximumY, inset + bodyHeight + 12);
  return Object.freeze({
    minX: inset + halfWidth,
    maxX: Math.max(inset + halfWidth, width - inset - halfWidth),
    minY: minimumY,
    maxY: Math.max(minimumY, maximumY),
  });
}

export function projectDialogue(dialogue, renderFrame, viewport, cameraWorldSize) {
  if (!dialogue?.available || !dialogue.worldAnchor) return dialogue;
  const width = viewport.cssWidth;
  const height = viewport.cssHeight;
  const scale = Math.min(width / cameraWorldSize.width, height / cameraWorldSize.height);
  const anchor = dialogue.worldAnchor;
  const cameraOffset = renderFrame.cameraOffset ?? { x: 0, y: 0 };
  const safeBounds = dialogueSafeBounds(dialogue, viewport);
  const projectedX = (anchor.x - cameraOffset.x) * scale;
  const projectedY = (anchor.y - cameraOffset.y) * scale;
  return Object.freeze({
    ...dialogue,
    screenAnchor: Object.freeze({
      x: clamp(projectedX, safeBounds.minX, safeBounds.maxX),
      y: clamp(projectedY, safeBounds.minY, safeBounds.maxY),
    }),
  });
}
