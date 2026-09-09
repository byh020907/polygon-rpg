export const TEST_PLAY_QUERY_KEYS = Object.freeze([
  'testPlay',
  'testResource',
  'testLabel',
  'testLocation',
  'testEquipment',
  'testEntity',
  'testSvgResource',
  'testSvgPose',
  'testSvgLod',
  'testReturn',
]);
export const GRAPHICS_REVIEW_QUERY_KEYS = Object.freeze([
  ...TEST_PLAY_QUERY_KEYS,
  'graphicsReview',
  'resource',
  'action',
  'frame',
  'reviewView',
  'reviewRenderer',
  'reviewScale',
  'reviewFacing',
  'reviewLighting',
  'reviewCategory',
  'reviewSearch',
  'reviewViewport',
  'reviewSpeed',
  'reviewMesh',
  'reviewBones',
  'uiReview',
]);

export const DEFAULT_GRAPHICS_REVIEW = Object.freeze({
  resourceId: '',
  actionId: '',
  frameIndex: 0,
  view: 'isolated',
  renderer: 'polygon',
  scale: 'fit',
  facing: 1,
  lighting: 'scene',
  category: 'all',
  search: '',
  viewport: 'desktop',
  speed: 1,
  mesh: false,
  bones: false,
});

const enumValue = (value, values, label) => {
  if (!values.includes(value)) throw new RangeError(`${label}: ${value}`);
  return value;
};

export function normalizeGraphicsReview(input = {}) {
  const value = { ...DEFAULT_GRAPHICS_REVIEW, ...input };
  const frameIndex = Number(value.frameIndex);
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex > 120000)
    throw new RangeError('프레임은 0~120000 정수여야 합니다.');
  for (const field of ['resourceId', 'actionId', 'category', 'search']) {
    if (typeof value[field] !== 'string' || value[field].length > 300)
      throw new RangeError(`잘못된 검토 조건: ${field}`);
  }
  if (typeof value.mesh !== 'boolean' || typeof value.bones !== 'boolean')
    throw new RangeError('진단 설정은 boolean이어야 합니다.');
  return Object.freeze({
    resourceId: value.resourceId,
    actionId: value.actionId,
    frameIndex,
    view: enumValue(value.view, ['isolated', 'scene'], '보기'),
    renderer: enumValue(value.renderer, ['polygon'], '렌더러'),
    scale: enumValue(String(value.scale), ['fit', '1', '2', '4'], '배율'),
    facing: enumValue(Number(value.facing), [-1, 1], '방향'),
    lighting: enumValue(value.lighting, ['scene', 'unlit', 'day', 'night'], '조명'),
    speed: enumValue(Number(value.speed), [0.25, 0.5, 1, 2], '재생 속도'),
    mesh: Boolean(value.mesh),
    bones: Boolean(value.bones),
    category: value.category,
    search: value.search,
    viewport: enumValue(value.viewport, ['desktop', 'mobile'], 'UI viewport'),
  });
}

export function readGraphicsReviewRequest(search = globalThis.location?.search ?? '') {
  const query = new URLSearchParams(search);
  if (query.get('graphicsReview') !== '1') return null;
  return normalizeGraphicsReview({
    resourceId: query.get('resource') ?? '',
    actionId: query.get('action') ?? '',
    frameIndex: query.get('frame') ?? 0,
    view: query.get('reviewView') ?? 'isolated',
    renderer:
      query.get('reviewRenderer') === 'retro'
        ? 'polygon'
        : (query.get('reviewRenderer') ?? 'polygon'),
    scale: query.get('reviewScale') ?? 'fit',
    facing: query.get('reviewFacing') ?? 1,
    lighting: query.get('reviewLighting') ?? 'scene',
    category: query.get('reviewCategory') ?? 'all',
    search: query.get('reviewSearch') ?? '',
    viewport: query.get('reviewViewport') ?? 'desktop',
    speed: query.get('reviewSpeed') ?? 1,
    mesh: query.get('reviewMesh') === '1',
    bones: query.get('reviewBones') === '1',
  });
}

export function clearGraphicsReviewUrl(href) {
  const url = new URL(href);
  for (const key of GRAPHICS_REVIEW_QUERY_KEYS) url.searchParams.delete(key);
  return url.href;
}

export function buildGraphicsReviewUrl(href, input) {
  const selection = normalizeGraphicsReview(input);
  const url = new URL(clearGraphicsReviewUrl(href));
  for (const key of [
    'visualQa',
    'gameStart',
    'gameFrame',
    'visualQaRenderer',
    'visualQaPhase',
    'debugPanel',
    'inputQa',
    'inputQaStart',
    'inputQaX',
    'inputQaRenderer',
    'inputQaOverlay',
  ])
    url.searchParams.delete(key);
  for (const [key, value] of Object.entries({
    graphicsReview: 1,
    resource: selection.resourceId,
    action: selection.actionId,
    frame: selection.frameIndex,
    reviewView: selection.view,
    reviewRenderer: selection.renderer,
    reviewScale: selection.scale,
    reviewFacing: selection.facing,
    reviewLighting: selection.lighting,
    reviewSpeed: selection.speed,
    reviewMesh: selection.mesh ? '1' : '0',
    reviewBones: selection.bones ? '1' : '0',
    reviewCategory: selection.category,
    reviewSearch: selection.search,
    reviewViewport: selection.viewport,
  }))
    if (value !== '') url.searchParams.set(key, String(value));
  return url.href;
}

export function graphicsReviewFeedback(resource, selection, sample, href) {
  return [
    '[Polygon RPG 그래픽 검토]',
    `리소스: ${resource.label} (${resource.id})`,
    `동작: ${selection.actionId} · 프레임: ${selection.frameIndex}`,
    `프레임 ID: ${sample?.frameId ?? `${resource.id}/${selection.actionId}/${selection.frameIndex}`}`,
    ...(sample?.sourceFrameId ? [`원본 pose: ${sample.sourceFrameId}`] : []),
    `종류: ${resource.category} · 출처: ${resource.source ?? ''}`,
    `보기: ${selection.view} · renderer: ${selection.renderer} · 확대: ${selection.scale}`,
    `방향: ${selection.facing === 1 ? '오른쪽' : '왼쪽'} · 조명: ${selection.lighting}`,
    `진단: 속도 ${selection.speed}× · 본 ${selection.bones ? '표시' : '숨김'} · 메시 ${selection.mesh ? '표시' : '숨김'}`,
    `UI viewport: ${selection.viewport === 'mobile' ? '844×390' : '1280×720'}`,
    `재현: ${buildGraphicsReviewUrl(href, selection)}`,
    '피드백: ',
  ].join('\n');
}
