import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser } from './qa/BrowserHarness.mjs';
fs.mkdirSync('artifacts/ref-01-regional', { recursive: true });
for (const [label, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
]) {
  const browser = await openQaBrowser({
    width,
    height,
    search: '?visualQa=1&gameStart=scrap-mine-roadhead',
  });
  try {
    for (const region of ['mine', 'shipyard', 'greenhouse', 'snow', 'quarry']) {
      await browser.navigate(`?visualQa=1&gameStart=scrap-${region}-roadhead`);
      await browser.until('Boolean(globalThis.__POLYGON_RPG_VISUAL_QA__)');
      const result = await browser.evaluate('globalThis.__POLYGON_RPG_VISUAL_QA__');
      assert.ok(result);
      assert.equal(result.start, `scrap-${region}-roadhead`);
      assert.equal(result.assertion.passed, true);
      assert.equal(
        browser.events.filter((event) => event.method === 'Runtime.exceptionThrown').length,
        0,
      );
      await browser.screenshot(`artifacts/ref-01-regional/${label}-${region}.png`);
    }
    console.log(label + ' regional REF01 roadhead render PASS');
  } finally {
    await browser.close();
  }
}
