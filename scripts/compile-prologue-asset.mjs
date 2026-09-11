import fs from 'node:fs';
import crypto from 'node:crypto';
import prettier from 'prettier';
import { DOMParser } from '@xmldom/xmldom';
import { compileSvgMaster } from '../src/graphics/svg/SvgAssetCompiler.js';
const specifications = [
  {
    source: 'public/graphics/prologue-control-core.master.svg',
    target: 'src/graphics/assets/PrologueCoreAsset.js',
    exportName: 'PROLOGUE_CORE_ASSET',
  },
  {
    source: 'public/graphics/prologue-retrieval-arm.master.svg',
    target: 'src/graphics/assets/PrologueRetrievalArmAsset.js',
    exportName: 'PROLOGUE_RETRIEVAL_ARM_ASSET',
  },
  {
    source: 'public/graphics/prologue-ancient-machine.master.svg',
    target: 'src/graphics/assets/PrologueAncientMachineAsset.js',
    exportName: 'PROLOGUE_ANCIENT_MACHINE_ASSET',
  },
];
const check = process.argv.includes('--check');
for (const specification of specifications) {
  const text = fs.readFileSync(specification.source, 'utf8').replaceAll('\r\n', '\n');
  const asset = compileSvgMaster(text, {
    parseXml: (source) => new DOMParser().parseFromString(source, 'image/svg+xml'),
  });
  const sourceHash = crypto.createHash('sha256').update(text).digest('hex');
  const output = await prettier.format(
    `// Generated from ${specification.source}. Do not edit.\nexport const ${specification.exportName} = ${JSON.stringify({ ...asset, provenance: { source: specification.source, sha256: sourceHash } })};\n`,
    { parser: 'babel', singleQuote: true, printWidth: 100 },
  );
  if (check) {
    if (fs.readFileSync(specification.target, 'utf8') !== output)
      throw Error(`Stale prologue SVG asset: ${specification.source}`);
  } else fs.writeFileSync(specification.target, output);
}
console.log(`${check ? 'PASS' : 'Compiled'} prologue SVG masters with provenance`);
