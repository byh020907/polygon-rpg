import fs from 'node:fs';
import crypto from 'node:crypto';
import prettier from 'prettier';
import { DOMParser } from '@xmldom/xmldom';
import { compileSvgMaster } from '../src/graphics/svg/SvgAssetCompiler.js';
const path = 'public/graphics/prologue-control-core.master.svg',
  text = fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const asset = compileSvgMaster(text, {
  parseXml: (source) => new DOMParser().parseFromString(source, 'image/svg+xml'),
});
const sourceHash = crypto.createHash('sha256').update(text).digest('hex');
const output = await prettier.format(
  '// Generated from ' +
    path +
    '. Do not edit.\nexport const PROLOGUE_CORE_ASSET = ' +
    JSON.stringify({ ...asset, provenance: { source: path, sha256: sourceHash } }) +
    ';\n',
  { parser: 'babel', singleQuote: true, printWidth: 100 },
);
const target = 'src/graphics/assets/PrologueCoreAsset.js';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== output) throw Error('Stale prologue SVG asset');
  console.log('PASS prologue master compiled provenance');
} else {
  fs.writeFileSync(target, output);
  console.log('Compiled current prologue core SVG');
}
