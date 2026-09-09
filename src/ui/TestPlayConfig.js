import { readVisualQaRequest } from '../app/VisualQaConfig.js';
import {
  buildGraphicsReviewUrl,
  readGraphicsReviewRequest,
  DEFAULT_GRAPHICS_REVIEW,
} from './GraphicsReviewConfig.js';
export { TEST_PLAY_QUERY_KEYS } from './GraphicsReviewConfig.js';
export function buildTestPlayUrl(href, target, selection = DEFAULT_GRAPHICS_REVIEW) {
  const returnHref = buildGraphicsReviewUrl(href, selection);
  const url = new URL(href);
  url.search = '';
  url.searchParams.set('visualQa', '1');
  url.searchParams.set('gameStart', target.request.start);
  url.searchParams.set('gameFrame', String(target.request.frame ?? 0));
  url.searchParams.set('visualQaPhase', target.request.phase ?? 'active');
  url.searchParams.set('testPlay', '1');
  url.searchParams.set('testResource', target.resourceId ?? '');
  url.searchParams.set('testLabel', target.label ?? '테스트 장면');
  if (target.options?.equipmentId)
    url.searchParams.set('testEquipment', target.options.equipmentId);
  if (target.options?.expectedEntityId)
    url.searchParams.set('testEntity', target.options.expectedEntityId);
  if (target.options?.location)
    url.searchParams.set('testLocation', JSON.stringify(target.options.location));
  url.searchParams.set('testReturn', returnHref);
  return url.href;
}
export function readTestPlayRequest(href = globalThis.location?.href) {
  const url = new URL(href);
  if (url.searchParams.get('testPlay') !== '1') return null;
  const request = readVisualQaRequest(url.search);
  if (!request) throw new Error('테스트 장면이 필요합니다.');
  const returnUrl = new URL(url.searchParams.get('testReturn') ?? url.href, url);
  if (returnUrl.origin !== url.origin || returnUrl.pathname !== url.pathname)
    throw new Error('잘못된 검토 복귀 경로입니다.');
  const label = url.searchParams.get('testLabel') ?? '테스트 장면';
  if (label.length > 300) throw new Error('테스트 이름이 너무 깁니다.');
  const equipmentId = url.searchParams.get('testEquipment');
  const locationText = url.searchParams.get('testLocation');
  const location = locationText ? JSON.parse(locationText) : null;
  if (
    location &&
    (!Number.isFinite(location.x) ||
      typeof location.regionId !== 'string' ||
      typeof location.roomId !== 'string' ||
      location.regionId.length > 120 ||
      location.roomId.length > 120)
  )
    throw new Error('잘못된 테스트 위치입니다.');
  return Object.freeze({
    request,
    options: {
      ...(equipmentId ? { equipmentId } : {}),
      ...(url.searchParams.get('testEntity')
        ? { expectedEntityId: url.searchParams.get('testEntity') }
        : {}),
      ...(location
        ? { location: { regionId: location.regionId, roomId: location.roomId, x: location.x } }
        : {}),
    },
    label,
    returnSelection: readGraphicsReviewRequest(returnUrl.search) ?? DEFAULT_GRAPHICS_REVIEW,
  });
}
