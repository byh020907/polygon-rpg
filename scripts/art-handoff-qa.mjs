import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser } from './qa/BrowserHarness.mjs';
fs.mkdirSync('artifacts/art-handoff', { recursive: true });
const evidence = [];
for (const [name, width, height] of [
  ['desktop', 1280, 900],
  ['mobile', 390, 844],
].filter(([name]) => !process.argv.includes('--mobile-only') || name === 'mobile')) {
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
      await b.click('.wiki-toc a');
      assert.equal(
        await b.evaluate(
          `(()=>{const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));return target.getBoundingClientRect().top>=document.querySelector('.wiki-global-header').getBoundingClientRect().bottom-1;})()`,
        ),
        true,
        page + ' heading remains visible below sticky header',
      );
      await b.evaluate('scrollTo(0,0)');
      assert.equal(
        await b.evaluate("getComputedStyle(document.querySelector('.masthead')).backgroundColor"),
        'rgb(0, 164, 149)',
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
    await b.click('.wiki-toc summary');
    await b.send('Emulation.setEmulatedMedia', { media: 'print' });
    assert.ok(
      await b.evaluate("document.querySelector('.wiki-toc ol').getBoundingClientRect().height>0"),
      'print retains a collapsed document TOC',
    );
    await b.screenshot('artifacts/art-handoff/' + name + '-print.png');
    assert.equal(
      await b.evaluate("getComputedStyle(document.querySelector('.masthead')).display"),
      'none',
    );
    await b.send('Emulation.setEmulatedMedia', { media: '' });
    await b.navigate('docs/art-handoff/resources/npc-1.html');
    await b.until("document.querySelector('a[href*=graphicsReview]')");
    await b.click('a[href*=graphicsReview]');
    try {
      await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'");
    } catch (error) {
      await b.screenshot('artifacts/art-handoff/' + name + '-navigation-failure.png');
      console.error(
        await b.evaluate(
          `JSON.stringify({url:location.href,title:document.title,review:document.querySelector('#graphics-review')?.dataset,hidden:document.querySelector('#graphics-review')?.hidden})`,
        ),
      );
      throw error;
    }
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
