import { compileSvgMaster } from './svg/SvgAssetCompiler.js';
import { PROLOGUE_CORE_ASSET } from './assets/PrologueCoreAsset.js';
import { PROLOGUE_RETRIEVAL_ARM_ASSET } from './assets/PrologueRetrievalArmAsset.js';
import { PROLOGUE_ANCIENT_MACHINE_ASSET } from './assets/PrologueAncientMachineAsset.js';
import { PROLOGUE_GARAGE_ZERO_ASSET } from './assets/PrologueGarageZeroAsset.js';
import { SCRAPYARD_APPRENTICE_ASSET } from './assets/ScrapyardApprenticeAsset.js';
import { RIVAL_SCOUT_ASSET } from './assets/RivalScoutAsset.js';
import { SCRAPYARD_OWNER_ASSET } from './assets/ScrapyardOwnerAsset.js';
const resourceFor = (
  asset,
  id,
  source,
  { category = 'prop', notes = null, referenceGroupId = null, approvalStatus = null } = {},
) =>
  Object.freeze({
    id,
    label: `SVG · ${asset.id}`,
    category,
    kind: 'animated',
    producer: 'svg',
    source,
    svgAsset: asset,
    ...(referenceGroupId ? { referenceGroupId } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
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
    SCRAPYARD_APPRENTICE_ASSET,
    'svg:scrapyard-apprentice',
    'public/graphics/scrapyard-apprentice.master.svg',
    {
      category: 'player',
      referenceGroupId: 'REF-01',
      approvalStatus: 'ref-01-candidate-1-selected-runtime-review',
      notes:
        'REF-01 Human 선택 1안의 수정 가능한 주인공 master SVG입니다. 원본/export 검증과 runtime 적용 상태는 별도입니다.',
    },
  ),
  resourceFor(RIVAL_SCOUT_ASSET, 'svg:rival-scout', 'public/graphics/rival-scout.master.svg', {
    category: 'npc',
    referenceGroupId: 'REF-01',
    approvalStatus: 'ref-01-candidate-1-selected-runtime-review',
    notes:
      'REF-01 Human 선택 1안의 가벼운 정찰 체형·스카프·갈고리 master SVG입니다. 프롤로그 runtime cast에 연결되었습니다.',
  }),
  resourceFor(
    SCRAPYARD_OWNER_ASSET,
    'svg:scrapyard-owner',
    'public/graphics/scrapyard-owner.master.svg',
    {
      category: 'npc',
      referenceGroupId: 'REF-01',
      approvalStatus: 'ref-01-candidate-1-selected-runtime-review',
      notes:
        'REF-01 Human 선택 1안의 넓은 작업 체형·앞치마·장부·스패너 master SVG입니다. 프롤로그 runtime cast에 연결되었습니다.',
    },
  ),
  resourceFor(
    PROLOGUE_CORE_ASSET,
    'svg:prologue-control-core',
    'public/graphics/prologue-control-core.master.svg',
    {
      referenceGroupId: 'REF-02',
      approvalStatus: 'runtime-baseline-unapproved',
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
      referenceGroupId: 'REF-02',
      approvalStatus: 'runtime-baseline-unapproved',
      notes:
        'SVG 시스템 자산 · dormant/captured/released pose와 접촉 anchor 검토. 승인 아트와 별도인 기존 회수팔 연결 기준선입니다.',
    },
  ),
  resourceFor(
    PROLOGUE_ANCIENT_MACHINE_ASSET,
    'svg:prologue-ancient-machine',
    'public/graphics/prologue-ancient-machine.master.svg',
    {
      category: 'facility',
      referenceGroupId: 'REF-03',
      approvalStatus: 'runtime-baseline-unapproved',
      notes:
        'REF-03 SVG 기술 기준선 · dormant/socket-sealed/eyes-lit/parts-assembled/incomplete-march pose와 소켓·단안·진로 anchor 검토. 최종 reference/Composition 승인은 별도입니다.',
    },
  ),
  resourceFor(
    PROLOGUE_GARAGE_ZERO_ASSET,
    'svg:prologue-garage-zero',
    'public/graphics/prologue-garage-zero.master.svg',
    {
      category: 'facility',
      referenceGroupId: 'REF-04',
      approvalStatus: 'runtime-baseline-unapproved',
      notes:
        'REF-04 SVG 기술 기준선 · 제어핵 socket과 다리·팔·동력원·장갑·거대 검의 독립 module mount를 검토합니다. 최종 Garage 0% reference/Composition 승인은 별도입니다.',
    },
  ),
]);
