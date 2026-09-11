import { compileSvgMaster } from './svg/SvgAssetCompiler.js';
import { PROLOGUE_CORE_ASSET } from './assets/PrologueCoreAsset.js';
import { PROLOGUE_RETRIEVAL_ARM_ASSET } from './assets/PrologueRetrievalArmAsset.js';
const resourceFor = (asset, id, source, { category = 'prop', notes = null } = {}) =>
  Object.freeze({
    id,
    label: `SVG · ${asset.id}`,
    category,
    kind: 'animated',
    producer: 'svg',
    source,
    svgAsset: asset,
    actions: Object.freeze(
      asset.lods.flatMap((lod) =>
        asset.poses.map((pose) =>
          Object.freeze({
            id: `${lod}:${pose}`,
            label: `${lod} · ${pose}`,
            lod,
            pose,
            frameCount: 1,
          }),
        ),
      ),
    ),
    notes:
      notes ??
      'SVG 시스템 자산 · LOD/pose/관절 metadata 검토. 승인 아트와 별도입니다. 업로드는 이 세션에만 유지되며 새로 열면 원본을 다시 선택하세요.',
  });
export function createSvgAssetSession({ maxAssets = 8, maxBytes = 4 * 1024 * 1024 } = {}) {
  if (
    !Number.isInteger(maxAssets) ||
    maxAssets < 1 ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1
  )
    throw new RangeError('Positive SVG session budgets required');
  const assets = new Map(),
    sizes = new Map();
  let bytes = 0;
  return {
    register(text, name) {
      const asset = compileSvgMaster(text);
      const id = 'uploaded-svg:' + asset.id;
      const resource = resourceFor(asset, id, name);
      const size = new TextEncoder().encode(JSON.stringify(asset)).byteLength;
      if (
        (!assets.has(id) && assets.size >= maxAssets) ||
        bytes - (sizes.get(id) ?? 0) + size > maxBytes
      )
        throw new RangeError('SVG 세션 용량이 찼습니다. 업로드 자산을 제거한 뒤 다시 선택하세요.');
      bytes += size - (sizes.get(id) ?? 0);
      sizes.set(id, size);
      assets.set(id, resource);
      return resource;
    },
    remove(id) {
      bytes -= sizes.get(id) ?? 0;
      sizes.delete(id);
      return assets.delete(id);
    },
    clear() {
      assets.clear();
      sizes.clear();
      bytes = 0;
    },
    get: (id) => assets.get(id) ?? null,
    wrap(base) {
      return {
        get resources() {
          return [...base.resources, ...assets.values()];
        },
        get inventory() {
          return { ...base.inventory, sessionSvgCount: assets.size, sessionSvgBytes: bytes };
        },
        get: (id) => assets.get(id) ?? base.get(id),
        removeSvg: (id) => this.remove(id),
        clearSvg: () => this.clear(),
        registerSvg: (text, name) => this.register(text, name),
      };
    },
  };
}
export const BUILTIN_SVG_RESOURCES = Object.freeze([
  resourceFor(
    PROLOGUE_CORE_ASSET,
    'svg:prologue-control-core',
    'public/graphics/prologue-control-core.master.svg',
    {
      notes:
        'SVG 시스템 자산 · LOD/pose/관절 metadata 검토. 승인 아트와 별도입니다. 기존 제어핵을 연결한 시스템 검증용 master입니다.',
    },
  ),
  resourceFor(
    PROLOGUE_RETRIEVAL_ARM_ASSET,
    'svg:prologue-retrieval-arm',
    'public/graphics/prologue-retrieval-arm.master.svg',
    {
      category: 'facility',
      notes:
        'SVG 시스템 자산 · dormant/captured/released pose와 접촉 anchor 검토. 승인 아트와 별도인 기존 회수팔 연결 기준선입니다.',
    },
  ),
]);
