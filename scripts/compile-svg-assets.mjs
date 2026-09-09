import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { format, resolveConfig } from 'prettier';
import { compileSvgMaster } from '../src/graphics/svg/SvgAssetCompiler.js';
import { exportSvgAsset } from '../src/graphics/svg/SvgAssetSampler.js';
const args = process.argv.slice(2);
const check = args.includes('--check');
const input = resolve(
  args.find((a) => !a.startsWith('--')) ?? 'public/graphics/system-reference.master.svg',
);
if (args.some((a) => a.startsWith('--') && a !== '--check'))
  throw new Error('Usage: node scripts/compile-svg-assets.mjs [asset.master.svg] [--check]');
const text = (await readFile(input, 'utf8')).replace(/\r\n/g, '\n');
const parseXml = (source) =>
  new DOMParser({
    onError: (level, message) => {
      throw new Error(`${level}: ${message}`);
    },
  }).parseFromString(source, 'image/svg+xml');
const compiled = compileSvgMaster(text, { parseXml });
const provenance = {
  master: basename(input),
  sha256: createHash('sha256').update(text).digest('hex'),
};
const stem = basename(input).replace(/\.master\.svg$/, '');
if (stem === basename(input)) throw new Error('Source must end with .master.svg');
const outputs = new Map([
  [
    join(dirname(input), `${stem}.compiled.json`),
    await format(JSON.stringify({ ...compiled, provenance }), {
      ...(await resolveConfig(input)),
      parser: 'json',
    }),
  ],
]);
for (const lod of compiled.lods)
  outputs.set(
    join(dirname(input), `${stem}.${lod}.svg`),
    `<!-- master-sha256: ${provenance.sha256}; lod: ${lod} -->\n` +
      exportSvgAsset(compiled, { lod }),
  );
for (const [path, content] of outputs) {
  if (check) {
    if ((await readFile(path, 'utf8')) !== content) throw new Error(`Stale SVG export: ${path}`);
  } else await writeFile(path, content);
}
console.log(
  `SVG ${check ? 'verified' : 'compiled'}: ${compiled.id}; ${compiled.parts.length} parts, ${compiled.shapes.length} shapes, ${compiled.vertexCount} vertices; ${provenance.sha256}`,
);
