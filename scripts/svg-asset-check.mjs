import { createSvgAssetSession } from '../src/graphics/SvgAssetSession.js';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DOMParser } from '@xmldom/xmldom';
import { compileSvgMaster } from '../src/graphics/svg/SvgAssetCompiler.js';
import { sampleSvgAsset } from '../src/graphics/svg/SvgAssetSampler.js';
import { pathPoints } from '../src/graphics/svg/SvgGeometry.js';
const parseXml = (source) =>
  new DOMParser({
    onError: (level, message) => {
      throw new Error(`${level}: ${message}`);
    },
  }).parseFromString(source, 'image/svg+xml');
const text = await readFile(
  new URL('../public/graphics/system-reference.master.svg', import.meta.url),
  'utf8',
);
const asset = compileSvgMaster(text, { parseXml });
const near = sampleSvgAsset(asset),
  far = sampleSvgAsset(asset, { lod: 'far' });
assert.ok(Object.isFrozen(asset.parts[1].bind));
assert.equal(asset.rigFamily, 'articulated-machine');
assert.equal(asset.parts.find((p) => p.id === 'boom').joint, 'boom-hinge');
assert.equal(near.items.find((p) => p.id === 'chassis-occluder').role, 'occluder');
assert.equal(near.items.find((p) => p.id === 'chassis-common').shadowRole, 'contact');
assert.equal(near.items.find((p) => p.id === 'chassis-side').structuralOcclusion, 0.25);
assert.equal(near.items.find((p) => p.id === 'chassis-side').z, 1);
assert.deepEqual(near.bounds, far.bounds);
assert.ok(near.items.some((i) => i.id === 'boom-near'));
assert.ok(!far.items.some((i) => i.id === 'boom-near'));
assert.ok(far.items.some((i) => i.id === 'boom-far'));
const folded = sampleSvgAsset(asset, { pose: 'folded' });
assert.ok(folded.items.some((i) => i.id === 'boom-folded'));
assert.ok(!folded.items.some((i) => i.id === 'boom-near'));
assert.ok(folded.items.some((i) => i.id === 'chassis-common'));
assert.deepEqual(
  sampleSvgAsset(asset, { pose: 'packed' }).items.map((i) => i.id),
  ['packed-whole'],
);
const shifted = sampleSvgAsset(asset, { partTransforms: { chassis: [1, 0, 0, 1, 0.25, 0] } });
const before = near.anchors.find((a) => a.id === 'tool-tip'),
  after = shifted.anchors.find((a) => a.id === 'tool-tip');
assert.ok(
  Math.abs(after.x - before.x - 0.2) < 1e-9,
  'parent-normalized delta applied once to child anchor',
);
const rotated = sampleSvgAsset(asset, { partTransforms: { boom: [0, 1, -1, 0, 0, 0] } });
assert.notDeepEqual(rotated.anchors, near.anchors);
for (const shape of asset.shapes) {
  assert.ok(shape.points.every((p) => Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1));
  assert.equal(shape.triangles.length, shape.points.length - 2);
}
const curves = pathPoints('M0 0 C0 10 10 10 10 0 S20 -10 20 0 Q25 10 30 0 T40 0 L40 20 H0 V0 Z', 8);
assert.equal(curves.length, 36);
const transformed = compileSvgMaster(
  '<svg id="fixture" viewBox="0 0 100 100"><g id="arm" transform="translate(5 0) rotate(30 50 50) scale(.8)"><rect id="face" x="30" y="30" width="20" height="20" fill="#123456"/></g></svg>',
  { parseXml },
);
assert.notDeepEqual(transformed.parts[1].bind, [1, 0, 0, 1, 0, 0]);
const normalAsset = compileSvgMaster(
  '<svg id="normal-test" viewBox="-10 -10 20 20"><g id="part"><rect id="face" x="-1" y="-1" width="2" height="2" transform="rotate(90)" data-normal="1 0 0" opacity="0.5" fill="#123456"/></g></svg>',
  { parseXml },
);
const normalSample = sampleSvgAsset(normalAsset).items[0];
assert.ok(Math.abs(normalSample.surfaceNormal.x) < 1e-9);
assert.ok(Math.abs(normalSample.surfaceNormal.y - 1) < 1e-9);
assert.equal(normalSample.opacity, 0.5);
assert.throws(() =>
  compileSvgMaster(
    '<svg id="bad" viewBox="0 0 100 100"><g id="part"><path id="shape" d="M0 0 L50 50 L0 50 L50 0 Z"/></g></svg>',
    { parseXml },
  ),
);
for (const invalid of [
  text.replace('<rect id="chassis-common"', '<image id="chassis-common"'),
  text.replace('data-part="boom"', 'data-part="chassis"'),
  text.replace('width="140"', 'width="NaN"'),
  text.replace('fill="#567080"', 'style="fill:red"'),
  text.replace('M 65 115 H 135 V 130 H 65 Z', 'M 65 115 A 20 20 0 0 0 130 130 Z'),
  text.replace('<svg xmlns', '<!DOCTYPE svg><svg xmlns'),
])
  assert.throws(() => compileSvgMaster(invalid, { parseXml }));
assert.throws(() => compileSvgMaster(text, { parseXml, maxShapes: 1 }));
assert.throws(() => compileSvgMaster(text, { parseXml, maxVertices: 3 }));
assert.throws(() => compileSvgMaster(text, { parseXml, curveSteps: 100 }));
assert.throws(() => sampleSvgAsset(asset, { lod: 'invalid' }));
assert.throws(() => sampleSvgAsset(asset, { partTransforms: { missing: [1, 0, 0, 1, 0, 0] } }));
assert.throws(() => sampleSvgAsset(asset, { partTransforms: { boom: [0, 0, 0, 0, 0, 0] } }));
globalThis.DOMParser = DOMParser;
const session = createSvgAssetSession({ maxAssets: 1 });
const imported = session.register(text, 'fixture.svg');
assert.equal(session.register(text, 'replacement.svg').id, imported.id);
assert.throws(
  () =>
    session.register(text.replace('id="system-reference"', 'id="second-reference"'), 'second.svg'),
  /세션/,
);
assert.equal(session.remove(imported.id), true);
assert.equal(session.get(imported.id), null);
session.register(text, 'again.svg');
session.clear();
assert.equal(
  session.wrap({ resources: [], inventory: {}, get: () => null }).inventory.sessionSvgBytes,
  0,
);
assert.throws(() => createSvgAssetSession({ maxBytes: 1 }).register(text, 'large.svg'), /세션/);
delete globalThis.DOMParser;
console.log(
  'PASS SVG master: hierarchy, normalized retarget/anchors, transforms/curves, LOD, part/whole poses, triangulation and explicit input/budget rejection',
);
