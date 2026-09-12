import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser } from './qa/BrowserHarness.mjs';
fs.mkdirSync('artifacts/ref-01-runtime', { recursive: true });
for (const [label, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
]) {
  const b = await openQaBrowser({
    width,
    height,
    search: '?graphicsReview=1&resource=player%3Aprotagonist&action=idle&reviewScale=2',
  });
  try {
    await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'", 60000);
    for (const [resource, action, frame] of [
      ['player:protagonist', 'idle', 0],
      ['player:protagonist', 'slash', 12],
      ['player:protagonist', 'roll', 12],
      ['scene:ref-01-cast-lineup', 'idle', 0],
    ]) {
      await b.navigate(
        '?' +
          new URLSearchParams({
            graphicsReview: '1',
            resource,
            action,
            frame: String(frame),
            reviewScale: label === 'mobile' ? 'fit' : '2',
            reviewLighting: 'day',
          }),
      );
      await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'", 60000);
      assert.equal(
        await b.evaluate("document.querySelector('#graphics-review').dataset.error??null"),
        null,
      );
      if (label === 'mobile')
        await b.evaluate(
          "document.querySelector('[data-gr=stage]').scrollIntoView({block:'center'});",
        );
      await b.screenshot(
        `artifacts/ref-01-runtime/${label}-${resource.startsWith('scene:') ? 'lineup' : action}.png`,
      );
    }
    console.log(label + ' REF01 actual review renderer PASS');
  } finally {
    await b.close();
  }
}
