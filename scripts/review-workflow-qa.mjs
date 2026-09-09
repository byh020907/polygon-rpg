import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';
fs.mkdirSync('artifacts/review-ux', { recursive: true });
const evidence = [];
for (const [name, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
  ['portrait', 390, 844],
]) {
  const b = await openQaBrowser({
    width,
    height,
    search:
      '?graphicsReview=1&resource=enemy-reference:beast&reviewCategory=enemy-reference&inputQa=1',
  });
  const key = async (key, code = key) => {
    for (const type of ['keyDown', 'keyUp'])
      await b.send('Input.dispatchKeyEvent', {
        type,
        key,
        code,
        windowsVirtualKeyCode: key === 'Escape' ? 27 : 13,
      });
    await wait(100);
  };
  const radial = async (label) => {
    const index = await b.evaluate(
      `[...document.querySelectorAll('.gr-radial-item')].findIndex(n=>n.textContent.startsWith(${JSON.stringify(label)}))`,
    );
    assert.ok(index >= 0, label);
    await b.click(`.gr-radial-item:nth-of-type(${index + 1})`, name !== 'desktop');
  };
  try {
    await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'");
    const saved = await b.evaluate('JSON.stringify({...localStorage})');
    await b.click('[data-gr=find]');
    await radial('몹');
    await radial('유형 견본');
    const bounds = await b.evaluate(
      "[...document.querySelectorAll('.gr-radial button')].map(n=>n.getBoundingClientRect().toJSON())",
    );
    assert.ok(
      bounds.every((r) => r.left >= 0 && r.top >= 0 && r.right <= width && r.bottom <= height),
    );
    await b.screenshot(`artifacts/review-ux/${name}-types.png`);
    await radial('짐승형');
    assert.equal(await b.evaluate("document.querySelector('[data-gr=test]').disabled"), true);
    await b.screenshot(`artifacts/review-ux/${name}-context.png`);
    await key('Escape');
    await b.click('[data-gr=diagnostics-toggle]');
    await b.click('[data-gr=bones]');
    await b.click('[data-gr=mesh]');
    await b.choose('[data-gr=speed]', '0.5');
    assert.equal(await b.evaluate("new URL(location.href).searchParams.get('reviewBones')"), '1');
    await b.click('[data-gr=find]');
    await radial('주인공');
    if (await b.evaluate("!!document.querySelector('.gr-radial')")) await key('Escape');
    console.log(name, await b.evaluate("document.querySelector('[data-gr=name]').textContent"));
    await b.choose('[data-gr=frame]', '7');
    const review = await b.evaluate('location.href');
    await b.click('[data-gr=test]');
    await b.until(
      "Alpine.$data(document.querySelector('#app')).testPlayActive && document.querySelector('#graphics-review').hidden",
    );
    await wait(350);
    await b.screenshot(`artifacts/review-ux/${name}-test.png`);
    const layout = await b.evaluate(
      "({bar:document.querySelector('.test-play-bar').getBoundingClientRect().toJSON(),view:document.querySelector('.game-viewport').getBoundingClientRect().toJSON()})",
    );
    assert.ok(layout.bar.bottom <= layout.view.top + 1, 'toolbar overlaps game');
    const x = await b.evaluate('globalThis.__POLYGON_RPG_INPUT_QA__.player.position.x');
    await b.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'ArrowRight',
      code: 'ArrowRight',
      windowsVirtualKeyCode: 39,
    });
    await wait(250);
    await b.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'ArrowRight',
      code: 'ArrowRight',
      windowsVirtualKeyCode: 39,
    });
    assert.ok(
      (await b.evaluate('globalThis.__POLYGON_RPG_INPUT_QA__.player.position.x')) > x,
      'real movement',
    );
    const testUrl = await b.evaluate('location.href');
    await b.click('#test-restart-control');
    await b.click('#test-review-return');
    await b.until(
      "!document.querySelector('#graphics-review').hidden && document.querySelector('#graphics-review').dataset.ready==='true'",
    );
    assert.equal(await b.evaluate('location.href'), review);
    assert.equal(await b.evaluate('JSON.stringify({...localStorage})'), saved, 'save changed');
    await b.navigate(testUrl);
    await b.until("Alpine.$data(document.querySelector('#app')).testPlayActive");
    await b.click('#test-review-return');
    await b.until("!document.querySelector('#graphics-review').hidden");
    assert.equal(await b.evaluate('location.href'), review);
    assert.equal(b.events.filter((e) => e.method === 'Runtime.exceptionThrown').length, 0);
    evidence.push({ name, bounds, layout, saveUnchanged: true });
    console.log(name, 'PASS');
  } finally {
    await b.close();
  }
}
fs.writeFileSync('artifacts/review-ux/evidence.json', JSON.stringify(evidence, null, 2));
