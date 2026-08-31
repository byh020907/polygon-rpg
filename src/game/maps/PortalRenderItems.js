const PORTAL_STYLES = Object.freeze({
  academy: Object.freeze({
    outer: Object.freeze([
      [-27, 0],
      [-27, -43],
      [-23, -53],
      [-12, -61],
      [0, -65],
      [12, -61],
      [23, -53],
      [27, -43],
      [27, 0],
    ]),
    inner: Object.freeze([
      [-15, 0],
      [-15, -38],
      [-12, -46],
      [-6, -51],
      [0, -53],
      [6, -51],
      [12, -46],
      [15, -38],
      [15, 0],
    ]),
    outerFill: '#40515a',
    innerFill: '#101722',
    innerStroke: '#b8cbc7',
  }),
  forest: Object.freeze({
    outer: Object.freeze([
      [-28, 0],
      [-24, -18],
      [-27, -36],
      [-19, -53],
      [-8, -59],
      [0, -64],
      [10, -57],
      [22, -51],
      [26, -32],
      [23, -13],
      [29, 0],
    ]),
    inner: Object.freeze([
      [-15, 0],
      [-14, -18],
      [-16, -34],
      [-10, -44],
      [0, -50],
      [9, -45],
      [14, -34],
      [14, 0],
    ]),
    outerFill: '#4b362a',
    innerFill: '#13211b',
    innerStroke: '#8da795',
  }),
  sealed: Object.freeze({
    outer: Object.freeze([
      [-27, 0],
      [-27, -43],
      [-21, -55],
      [-8, -61],
      [8, -61],
      [21, -55],
      [27, -43],
      [27, 0],
    ]),
    inner: Object.freeze([
      [-15, 0],
      [-15, -37],
      [-11, -47],
      [-5, -51],
      [5, -51],
      [11, -47],
      [15, -37],
      [15, 0],
    ]),
    outerFill: '#333947',
    innerFill: '#0d1119',
    innerStroke: '#8f98a8',
  }),
  glasswind: Object.freeze({
    outer: Object.freeze([
      [-25, 0],
      [-22, -17],
      [-27, -33],
      [-18, -53],
      [-5, -59],
      [0, -64],
      [8, -56],
      [22, -50],
      [27, -31],
      [22, -16],
      [26, 0],
    ]),
    inner: Object.freeze([
      [-12, 0],
      [-13, -18],
      [-10, -33],
      [-4, -44],
      [2, -50],
      [9, -40],
      [13, -27],
      [12, 0],
    ]),
    outerFill: '#31566a',
    innerFill: '#07121d',
    innerStroke: '#a7d8d8',
  }),
  observatory: Object.freeze({
    outer: Object.freeze([
      [-27, 0],
      [-27, -38],
      [-23, -49],
      [-14, -57],
      [0, -61],
      [14, -57],
      [23, -49],
      [27, -38],
      [27, 0],
    ]),
    inner: Object.freeze([
      [-15, 0],
      [-15, -34],
      [-12, -42],
      [-5, -48],
      [0, -49],
      [5, -48],
      [12, -42],
      [15, -34],
      [15, 0],
    ]),
    outerFill: '#334b5d',
    innerFill: '#07121e',
    innerStroke: '#9fb6c2',
  }),
  storm: Object.freeze({
    outer: Object.freeze([
      [-27, 0],
      [-24, -40],
      [-15, -54],
      [0, -63],
      [15, -54],
      [24, -40],
      [27, 0],
    ]),
    inner: Object.freeze([
      [-14, 0],
      [-13, -35],
      [-7, -45],
      [0, -51],
      [7, -45],
      [13, -35],
      [14, 0],
    ]),
    outerFill: '#3e3858',
    innerFill: '#090a18',
    innerStroke: '#b7a6c8',
  }),
});

function translate(points, x, groundY) {
  return points.map(([offsetX, offsetY]) => ({ x: x + offsetX, y: groundY + offsetY }));
}

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

export function createPortalRenderItems(
  id,
  x,
  groundY,
  accent,
  { style = 'academy', enabled = true, renderOrder = 30, order = 40 } = {},
) {
  const definition = PORTAL_STYLES[style];
  if (!definition) throw new Error(`지원하지 않는 Portal presentation style입니다: ${style}`);
  if (!id || !Number.isFinite(x) || !Number.isFinite(groundY)) {
    throw new TypeError('Portal render item에는 id와 유한한 x/groundY가 필요합니다.');
  }

  return [
    renderItem(`${id}-outer`, translate(definition.outer, x, groundY), definition.outerFill, {
      stroke: accent,
      lineWidth: 2.5,
      opacity: 0.98,
      order,
      renderOrder,
      enabled,
    }),
    renderItem(`${id}-inner`, translate(definition.inner, x, groundY), definition.innerFill, {
      stroke: definition.innerStroke,
      lineWidth: 1.25,
      opacity: 0.98,
      order: order + 1,
      renderOrder,
      enabled,
    }),
  ];
}
