const PORTAL_STYLES = Object.freeze({
  academy: Object.freeze({
    outer: Object.freeze([
      [-23, 0],
      [-23, -36],
      [-20, -44],
      [-10, -51],
      [0, -54],
      [10, -51],
      [20, -44],
      [23, -36],
      [23, 0],
    ]),
    inner: Object.freeze([
      [-13, 0],
      [-13, -32],
      [-10, -39],
      [-5, -43],
      [0, -45],
      [5, -43],
      [10, -39],
      [13, -32],
      [13, 0],
    ]),
    outerFill: '#40515a',
    innerFill: '#101722',
    outerStroke: '#24343b',
  }),
  forest: Object.freeze({
    outer: Object.freeze([
      [-24, 0],
      [-20, -15],
      [-23, -30],
      [-16, -44],
      [-7, -49],
      [0, -54],
      [8, -48],
      [19, -43],
      [22, -27],
      [20, -11],
      [25, 0],
    ]),
    inner: Object.freeze([
      [-13, 0],
      [-12, -15],
      [-13, -29],
      [-8, -38],
      [0, -43],
      [8, -39],
      [12, -29],
      [12, 0],
    ]),
    outerFill: '#4b362a',
    innerFill: '#13211b',
    outerStroke: '#241f1d',
  }),
  sealed: Object.freeze({
    outer: Object.freeze([
      [-23, 0],
      [-23, -36],
      [-18, -47],
      [-7, -52],
      [7, -52],
      [18, -47],
      [23, -36],
      [23, 0],
    ]),
    inner: Object.freeze([
      [-13, 0],
      [-13, -31],
      [-9, -40],
      [-4, -44],
      [4, -44],
      [9, -40],
      [13, -31],
      [13, 0],
    ]),
    outerFill: '#333947',
    innerFill: '#0d1119',
    outerStroke: '#1a202b',
  }),
  glasswind: Object.freeze({
    outer: Object.freeze([
      [-22, 0],
      [-19, -14],
      [-23, -28],
      [-15, -45],
      [-4, -50],
      [0, -54],
      [7, -47],
      [19, -42],
      [23, -26],
      [19, -13],
      [22, 0],
    ]),
    inner: Object.freeze([
      [-11, 0],
      [-11, -15],
      [-9, -28],
      [-3, -38],
      [2, -44],
      [8, -35],
      [11, -23],
      [10, 0],
    ]),
    outerFill: '#31566a',
    innerFill: '#07121d',
    outerStroke: '#153647',
  }),
  observatory: Object.freeze({
    outer: Object.freeze([
      [-23, 0],
      [-23, -32],
      [-20, -42],
      [-12, -49],
      [0, -52],
      [12, -49],
      [20, -42],
      [23, -32],
      [23, 0],
    ]),
    inner: Object.freeze([
      [-13, 0],
      [-13, -29],
      [-10, -36],
      [-4, -42],
      [0, -43],
      [4, -42],
      [10, -36],
      [13, -29],
      [13, 0],
    ]),
    outerFill: '#334b5d',
    innerFill: '#07121e',
    outerStroke: '#172a38',
  }),
  storm: Object.freeze({
    outer: Object.freeze([
      [-23, 0],
      [-20, -34],
      [-13, -46],
      [0, -53],
      [13, -46],
      [20, -34],
      [23, 0],
    ]),
    inner: Object.freeze([
      [-12, 0],
      [-11, -30],
      [-6, -39],
      [0, -44],
      [6, -39],
      [11, -30],
      [12, 0],
    ]),
    outerFill: '#3e3858',
    innerFill: '#090a18',
    outerStroke: '#211b35',
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
      stroke: definition.outerStroke,
      lineWidth: 2,
      opacity: 0.98,
      order,
      renderOrder,
      enabled,
    }),
    renderItem(`${id}-inner`, translate(definition.inner, x, groundY), definition.innerFill, {
      stroke: accent,
      lineWidth: 1.5,
      opacity: 0.98,
      order: order + 1,
      renderOrder,
      enabled,
    }),
  ];
}
