import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GAME_UI_RESOURCES, buildUiReviewUrl } from '../src/ui/GameUiCatalog.js';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';

mkdirSync('artifacts/graphics-review', { recursive: true });
const evidence = [];
const browser = await openQaBrowser();
try {
  for (const resource of GAME_UI_RESOURCES) {
    await browser.navigate(buildUiReviewUrl(browser.origin, resource));
    await browser.until(`document.documentElement.dataset.uiReviewReady === 'true'`);
    const result = await browser.evaluate(
      `({id:document.documentElement.dataset.uiReview,visible:document.documentElement.dataset.uiReviewVisible,text:document.body.innerText.slice(0,300)})`,
    );
    evidence.push(result);
    console.log(JSON.stringify(result));
    await wait(50);
    await browser.screenshot(
      `artifacts/graphics-review/component-${resource.id.replace('/', '-')}.png`,
    );
  }
  const errors = browser.events.filter((event) => event.method === 'Runtime.exceptionThrown');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.ok(evidence.every((result) => result.visible === 'true'));
} finally {
  writeFileSync('artifacts/graphics-review/ui-evidence.json', JSON.stringify(evidence, null, 2));
  await browser.close();
}
