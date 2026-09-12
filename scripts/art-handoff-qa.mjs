import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser } from './qa/BrowserHarness.mjs';
fs.mkdirSync('artifacts/art-handoff', { recursive: true });
const evidence = [];
for (const [name, width, height] of [
  ['desktop', 1280, 900],
  ['mobile', 390, 844],
]) {
  const b = await openQaBrowser({ width, height, search: '' });
  try {
    await b.until('navigator.serviceWorker?.controller', 30000);
    for (const page of [
      'index.html',
      'characters.html',
      'art-direction.html',
      'asset-contract.html',
      'environment-authoring.html',
      'character-animation.html',
      'reference-approval.html',
      'scenarios/abandoned-mine.html',
      'scenarios/finale.html',
      'resources/npc-1.html',
      'request.html',
      'decisions.html',
    ]) {
      await b.navigate('docs/art-handoff/' + page);
      await b.until('document.querySelector("main h1")');
      assert.equal(
        await b.evaluate('document.documentElement.scrollWidth<=innerWidth'),
        true,
        page + ' body overflow',
      );
      assert.equal(await b.evaluate("document.querySelectorAll('main h1').length"), 1);
      assert.equal(
        await b.evaluate("getComputedStyle(document.querySelector('.masthead')).backgroundColor"),
        'rgb(27, 48, 51)',
        'controlled document styles',
      );
      if (page === 'art-direction.html')
        await b.until('[...document.images].every(i=>i.complete&&i.naturalWidth>0)');
      await b.screenshot(
        'artifacts/art-handoff/' + name + '-' + page.replaceAll('/', '-') + '.png',
      );
      evidence.push({ name, page, bodyOverflow: false });
    }
    await b.navigate('PRODUCT_GOAL.html');
    await b.until("document.querySelector('#graphics-handoff')");
    await b.click('#graphics-handoff a');
    await b.until("document.querySelector('h1')?.textContent==='그래픽 제작 요청 안내'");
    await b.send('Emulation.setEmulatedMedia', { media: 'print' });
    await b.screenshot('artifacts/art-handoff/' + name + '-print.png');
    assert.equal(
      await b.evaluate("getComputedStyle(document.querySelector('.masthead')).display"),
      'none',
    );
    await b.send('Emulation.setEmulatedMedia', { media: '' });
    await b.navigate('docs/art-handoff/resources/npc-1.html');
    await b.until("document.querySelector('a[href*=graphicsReview]')");
    await b.click('a[href*=graphicsReview]');
    await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'");
    assert.equal(
      await b.evaluate("document.querySelector('#graphics-review').dataset.resourceId"),
      'npc:cast:rival-scout',
    );
    assert.equal(b.events.filter((e) => e.method === 'Runtime.exceptionThrown').length, 0);
    console.log(name, 'PASS documents, Product Goal link, review anchor, responsive and print');
  } finally {
    await b.close();
  }
}
fs.writeFileSync('artifacts/art-handoff/evidence.json', JSON.stringify(evidence, null, 2));
