import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import { compileSvgMaster } from '../src/graphics/svg/SvgAssetCompiler.js';
import { sampleSvgAsset } from '../src/graphics/svg/SvgAssetSampler.js';
import { BUILTIN_SVG_RESOURCES } from '../src/graphics/SvgAssetSession.js';

const parseXml = (source) => new DOMParser().parseFromString(source, 'image/svg+xml');
const specifications = [
  {
    id: 'scrapyard-apprentice',
    source: 'public/graphics/scrapyard-apprentice.master.svg',
    resourceId: 'svg:scrapyard-apprentice',
    parts: [
      'apprentice-head',
      'apprentice-shirt',
      'apprentice-cross-strap',
      'apprentice-satchel',
      'weapon',
      'shield',
    ],
    anchors: ['weapon-grip', 'shield-grip', 'ground-contact'],
  },
  {
    id: 'rival-scout',
    source: 'public/graphics/rival-scout.master.svg',
    resourceId: 'svg:rival-scout',
    parts: ['rival-head', 'rival-vest', 'rival-scarf', 'salvage-hook', 'rival-tool-pouch'],
    anchors: ['hook-grip', 'hook-tip', 'ground-contact'],
  },
  {
    id: 'scrapyard-owner',
    source: 'public/graphics/scrapyard-owner.master.svg',
    resourceId: 'svg:scrapyard-owner',
    parts: ['owner-head', 'owner-shirt', 'owner-apron', 'wrench', 'ledger'],
    anchors: ['wrench-grip', 'ledger-grip', 'ground-contact'],
  },
];

const silhouettes = [];
for (const specification of specifications) {
  const source = fs.readFileSync(specification.source, 'utf8');
  assert.doesNotMatch(source, /<image\b|data:image|<linearGradient\b|<filter\b|\bstroke=/i);
  const asset = compileSvgMaster(source, { parseXml });
  assert.equal(asset.id, specification.id);
  assert.equal(asset.rigFamily, 'Humanoid');
  assert.ok(
    asset.parts.length >= 13,
    `${asset.id} needs independently editable body/equipment parts`,
  );
  const partIds = new Set(asset.parts.map((part) => part.id));
  for (const partId of specification.parts) assert.ok(partIds.has(partId), `${asset.id}/${partId}`);
  const anchorIds = new Set(asset.anchors.map((anchor) => anchor.id));
  for (const anchorId of specification.anchors)
    assert.ok(anchorIds.has(anchorId), `${asset.id}/${anchorId}`);
  const sample = sampleSvgAsset(asset, { lod: 'near', pose: 'base' });
  assert.ok(sample.items.length >= 13);
  assert.ok(sample.items.every((item) => item.materialId && item.surfaceNormal));
  const lodSignatures = asset.lods.map((lod) =>
    JSON.stringify(
      sampleSvgAsset(asset, { lod, pose: 'base' }).items.map((item) => ({
        id: item.id,
        points: item.points,
        fill: item.fill,
      })),
    ),
  );
  assert.equal(new Set(lodSignatures).size, 3, `${asset.id} far/mid/near must be authored outputs`);
  silhouettes.push(
    JSON.stringify(
      sample.items.map((item) => ({ partId: item.partId, fill: item.fill, points: item.points })),
    ),
  );
  const resource = BUILTIN_SVG_RESOURCES.find(
    (candidate) => candidate.id === specification.resourceId,
  );
  assert.equal(resource?.referenceGroupId, 'REF-01');
  assert.equal(resource?.approvalStatus, 'selected-direction-master-runtime-pending');
  assert.equal(resource?.svgAsset.provenance.source, specification.source);
}

assert.equal(new Set(silhouettes).size, 3, 'REF-01 actors must not share one recolored silhouette');
console.log(
  'PASS REF-01: three distinct editable Humanoid masters, semantic anchors and provenance.',
);
