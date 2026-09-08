import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';
const output = 'artifacts/enemy-references';
fs.mkdirSync(output, { recursive: true });
const evidence = [];
for (const [name, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
].filter(([name]) => !process.argv.includes('--mobile-only') || name === 'mobile')) {
  const b = await openQaBrowser({
    width,
    height,
    search:
      '?graphicsReview=1&reviewCategory=enemy-reference&resource=enemy-reference:humanoid&reviewRenderer=polygon&reviewLighting=unlit',
  });
  try {
    await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'");
    assert.equal(
      await b.evaluate("document.querySelectorAll('[data-gr=resources] button').length"),
      4,
    );
    const saved = await b.evaluate('JSON.stringify({...localStorage})');
    for (const type of ['humanoid', 'beast', 'flying', 'machine']) {
      await b.click(`[data-resource-id="enemy-reference:${type}"]`, name === 'mobile');
      for (const action of ['idle', 'move', 'attack']) {
        await b.choose('[data-gr=action]', action);
        await b.choose('[data-gr=frame]', action === 'idle' ? 0 : 24);
        await b.evaluate("document.querySelector('.gr-main').scrollTop=0");
        if (name === 'mobile')
          await b.evaluate(
            "document.querySelector('[data-gr=canvas]').scrollIntoView({block:'center'})",
          );
        await b.screenshot(`${output}/${name}-${type}-${action}.png`);
        const state = await b.evaluate(
          "({resource:document.querySelector('#graphics-review').dataset.resourceId,frame:document.querySelector('#graphics-review').dataset.frameIndex,error:document.querySelector('#graphics-review').dataset.error??null})",
        );
        assert.equal(state.error, null);
        evidence.push({ viewport: name, type, action, ...state });
      }
      await b.click('[data-gr=play]', name === 'mobile');
      const first = await b.evaluate(
        "document.querySelector('#graphics-review').dataset.frameIndex",
      );
      await wait(220);
      assert.notEqual(
        await b.evaluate("document.querySelector('#graphics-review').dataset.frameIndex"),
        first,
      );
      await b.click('[data-gr=play]', name === 'mobile');

      await b.choose('[data-gr=facing]', -1);
      await b.evaluate("document.querySelector('.gr-main').scrollTop=0");
      if (name === 'mobile')
        await b.evaluate(
          "document.querySelector('[data-gr=canvas]').scrollIntoView({block:'center'})",
        );
      await b.screenshot(`${output}/${name}-${type}-polygon-left.png`);

      await b.choose('[data-gr=facing]', 1);
    }
    assert.equal(await b.evaluate('JSON.stringify({...localStorage})'), saved);
    assert.equal(b.events.filter((e) => e.method === 'Runtime.exceptionThrown').length, 0);
  } finally {
    await b.close();
  }
}
fs.writeFileSync(
  `${output}/${process.argv.includes('--mobile-only') ? 'mobile-evidence' : 'evidence'}.json`,
  JSON.stringify({ verified: true, evidence }, null, 2),
);
console.log(`Enemy reference native UI: PASS ${evidence.length} action/viewport records`);
