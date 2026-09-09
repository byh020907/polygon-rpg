import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser } from './qa/BrowserHarness.mjs';
fs.mkdirSync('artifacts/radial-refinement', { recursive: true });
for (const [name, width, height] of [
  ['desktop', 1280, 720],
  ['landscape', 844, 390],
  ['portrait', 390, 844],
]) {
  const b = await openQaBrowser({ width, height, search: '?graphicsReview=1' });
  try {
    await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'");
    await b.click('[data-gr=find]');
    await b.choose('.gr-radial-search', 'enemy-reference:beast');
    assert.equal(await b.evaluate("document.querySelectorAll('.gr-radial-item').length"), 1);
    await b.screenshot(`artifacts/radial-refinement/${name}-search.png`);
    await b.click('.gr-radial-item', name !== 'desktop');
    assert.equal(
      await b.evaluate("document.querySelector('#graphics-review').dataset.resourceId"),
      'enemy-reference:beast',
    );
    for (const type of ['keyDown', 'keyUp'])
      await b.send('Input.dispatchKeyEvent', {
        type,
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
      });
    await b.click('[data-gr=find]');
    await b.choose('.gr-radial-search', 'does-not-exist-999');
    assert.match(
      await b.evaluate("document.querySelector('.gr-radial-detail').textContent"),
      /결과가 없습니다/,
    );
    await b.click('.gr-radial-center');
    await b.click('.gr-radial-item:nth-of-type(5)'); // World
    assert.equal(await b.evaluate("document.querySelector('.gr-radial-previous').disabled"), true);
    await b.click('.gr-radial-next');
    assert.match(
      await b.evaluate("document.querySelector('.gr-radial-pages span').textContent"),
      /2 \/ 2/,
    );
    await b.click('.gr-radial-previous');
    await b.click('.gr-radial-ancestor');
    assert.equal(
      await b.evaluate("document.querySelector('.gr-radial').getAttribute('aria-label')"),
      '찾기',
    );
    await b.screenshot(`artifacts/radial-refinement/${name}-root.png`);
    if (height >= 470)
      assert.equal(
        await b.evaluate(
          "(()=>{const h=document.querySelector('.gr-radial-header').getBoundingClientRect(),f=document.querySelector('.gr-radial-footer').getBoundingClientRect();return [...document.querySelectorAll('.gr-radial-item')].some(n=>{const r=n.getBoundingClientRect();return r.top<h.bottom||r.bottom>f.top})})()",
        ),
        false,
        'header/footer overlaps radial targets',
      );
    const boxes = await b.evaluate(
      "[...document.querySelectorAll('.gr-radial button,.gr-radial input')].map(n=>n.getBoundingClientRect().toJSON())",
    );
    assert.ok(boxes.every((r) => r.x >= 0 && r.y >= 0 && r.right <= width && r.bottom <= height));
    assert.equal(b.events.filter((e) => e.method === 'Runtime.exceptionThrown').length, 0);
    console.log(
      name,
      'PASS scoped search, direct leaf, empty/reset, previous/next, breadcrumb, bounds',
    );
  } finally {
    await b.close();
  }
}
