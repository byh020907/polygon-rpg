function renderItem(id, points, fill, options) {
  return {
    id,
    points,
    fill,
    stroke: options.stroke,
    lineWidth: options.lineWidth,
    opacity: options.opacity,
    order: options.order,
    renderOrder: options.renderOrder,
    enabled: options.enabled,
  };
}

function rectangle(x, y, width, height) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

const LANDMARK_STYLES = Object.freeze({
  'village-road': Object.freeze({
    structureFill: '#65503c',
    structureStroke: '#2b2622',
    openingFill: '#172821',
    accentFill: '#8fc9a0',
  }),
  'sealed-stone': Object.freeze({
    structureFill: '#3b414d',
    structureStroke: '#191f29',
    openingFill: '#090e16',
    accentFill: '#a76b66',
  }),
});

export function createEnvironmentPortalLandmarkItems(
  id,
  x,
  groundY,
  { style, enabled = true, renderOrder = 30, order = 32 } = {},
) {
  const colors = LANDMARK_STYLES[style];
  if (!colors) throw new Error(`지원하지 않는 환경 Portal landmark입니다: ${style}`);
  if (!id || !Number.isFinite(x) || !Number.isFinite(groundY)) {
    throw new TypeError('환경 Portal landmark에는 id와 유한한 x/groundY가 필요합니다.');
  }

  const openingWidth = style === 'village-road' ? 92 : 72;
  const openingHeight = style === 'village-road' ? 100 : 112;
  const left = x - openingWidth / 2;
  const top = groundY - openingHeight;
  const structure = (() => {
    switch (style) {
      case 'village-road':
        return [
          { x: x - 72, y: groundY },
          { x: x - 66, y: groundY - 92 },
          { x: x - 56, y: groundY - 118 },
          { x: x - 42, y: groundY - 122 },
          { x: x - 46, y: groundY - 108 },
          { x: x + 48, y: groundY - 104 },
          { x: x + 42, y: groundY - 122 },
          { x: x + 58, y: groundY - 116 },
          { x: x + 70, y: groundY - 88 },
          { x: x + 72, y: groundY },
        ];
      case 'sealed-stone':
        return [
          { x: x - 68, y: groundY },
          { x: x - 68, y: groundY - 118 },
          { x: x - 52, y: groundY - 118 },
          { x: x - 52, y: groundY - 138 },
          { x: x + 52, y: groundY - 138 },
          { x: x + 52, y: groundY - 118 },
          { x: x + 68, y: groundY - 118 },
          { x: x + 68, y: groundY },
        ];
      default:
        return [];
    }
  })();

  return [
    renderItem(`${id}-landmark-structure`, structure, colors.structureFill, {
      stroke: colors.structureStroke,
      lineWidth: 4,
      opacity: 0.98,
      order,
      renderOrder,
      enabled,
    }),
    renderItem(
      `${id}-landmark-opening`,
      rectangle(left, top, openingWidth, openingHeight),
      colors.openingFill,
      {
        stroke: colors.accentFill,
        lineWidth: 2,
        opacity: 0.98,
        order: order + 1,
        renderOrder,
        enabled,
      },
    ),
    renderItem(
      `${id}-landmark-threshold`,
      rectangle(x - 48, groundY - 6, 96, 8),
      colors.accentFill,
      {
        stroke: colors.structureStroke,
        lineWidth: 1.5,
        opacity: 0.82,
        order: order + 2,
        renderOrder,
        enabled,
      },
    ),
  ];
}
