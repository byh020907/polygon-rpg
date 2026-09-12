import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser } from './qa/BrowserHarness.mjs';

const output = 'artifacts/ref-01-svg';
fs.mkdirSync(output, { recursive: true });

const resources = [
  ['hero', 'public/graphics/scrapyard-apprentice', 'scrapyard-apprentice'],
  ['rival', 'public/graphics/rival-scout', 'rival-scout'],
  ['owner', 'public/graphics/scrapyard-owner', 'scrapyard-owner'],
];

for (const [viewport, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
]) {
  const browser = await openQaBrowser({ width, height, search: resources[0][1] + '.far.svg' });
  try {
    let page = 0;
    for (const [name, base, expectedId] of resources) {
      const polygonCounts = [];
      for (const lod of ['far', 'mid', 'near']) {
        if (page > 0) await browser.navigate(`${base}.${lod}.svg`);
        page++;
        await browser.until(`document.documentElement?.localName==='svg'`);
        const state = await browser.evaluate(
          `(()=>{const svg=document.documentElement;svg.style.background='#ebe7db';svg.style.width='100vw';svg.style.height='100vh';return {id:svg.id,viewBox:svg.getAttribute('viewBox'),polygons:svg.querySelectorAll('polygon').length}})()`,
        );
        assert.equal(state.id, expectedId);
        assert.equal(state.viewBox, '-1 -1 2 2');
        assert.ok(state.polygons >= 13);
        polygonCounts.push(state.polygons);
        await browser.screenshot(`${output}/${viewport}-${name}-${lod}.png`);
      }
      assert.equal(new Set(polygonCounts).size, 3, `${name} visible LOD detail counts differ`);
    }
    console.log(`${viewport} PASS REF-01 three actors × far/mid/near exported SVG renders`);
  } finally {
    await browser.close();
  }
}
