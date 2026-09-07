import '../../public/release-metadata.js';

const metadata = globalThis.POLYGON_RPG_RELEASE;
if (!metadata?.appVersion || !metadata?.buildId) {
  throw new Error('릴리스 메타데이터를 불러올 수 없습니다.');
}

export const RELEASE_METADATA = Object.freeze({
  appVersion: metadata.appVersion,
  buildId: metadata.buildId,
});
