import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser } from './qa/BrowserHarness.mjs';

const outputDirectory = 'artifacts/product-goal-wiki';
fs.mkdirSync(outputDirectory, { recursive: true });
const evidence = [];

const snapshotExpression = `(()=>{
  const visible=(selector)=>{
    const node=document.querySelector(selector);
    return Boolean(node&&getComputedStyle(node).display!=='none'&&node.getBoundingClientRect().width>0);
  };
  const page=document.querySelector('.page').getBoundingClientRect();
  return {
    title:document.querySelector('h1')?.textContent?.trim(),
    globalHeader:visible('.wiki-global-header'),
    leftSidebar:visible('.wiki-left-sidebar'),
    rightSidebar:visible('.wiki-right-sidebar'),
    breadcrumb:visible('.wiki-breadcrumb'),
    actions:visible('.wiki-document-actions'),
    tocOpen:document.querySelector('.wiki-toc details')?.open,
    tocLinks:document.querySelectorAll('.wiki-toc a').length,
    sectionCount:document.querySelectorAll('main > section').length,
    requirementCount:document.querySelectorAll('[id^="PG-"]').length,
    page:{left:page.left,right:page.right,width:page.width},
    viewport:{width:innerWidth,height:innerHeight},
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1
  };
})()`;

for (const viewport of [
  { id: 'wide', width: 1440, height: 900 },
  { id: 'desktop', width: 1280, height: 720 },
  { id: 'mobile', width: 390, height: 844 },
]) {
  const browser = await openQaBrowser({
    width: viewport.width,
    height: viewport.height,
    search: 'PRODUCT_GOAL.html',
  });
  try {
    await browser.until("document.readyState==='complete' && document.querySelector('.wiki-toc')");
    const state = await browser.evaluate(snapshotExpression);
    assert.equal(state.title, 'Polygon RPG');
    assert.equal(state.globalHeader, true);
    assert.equal(state.tocOpen, true);
    assert.equal(state.tocLinks, 17);
    assert.ok(state.sectionCount >= 18);
    assert.ok(state.requirementCount >= 10);
    assert.equal(state.horizontalOverflow, false);
    assert.ok(state.page.left >= -1 && state.page.right <= viewport.width + 1);
    if (viewport.id === 'wide') {
      assert.equal(state.leftSidebar, true);
      assert.equal(state.rightSidebar, true);
    } else if (viewport.id === 'desktop') {
      assert.equal(state.leftSidebar, true);
      assert.equal(state.rightSidebar, false);
    } else {
      assert.equal(state.leftSidebar, false);
      assert.equal(state.rightSidebar, false);
      assert.equal(state.breadcrumb, true);
      assert.equal(state.actions, true);
    }
    await browser.screenshot(`${outputDirectory}/${viewport.id}.png`);
    await browser.click('.wiki-toc summary');
    assert.equal(await browser.evaluate("document.querySelector('.wiki-toc details').open"), false);
    await browser.click('.wiki-toc summary');
    assert.equal(await browser.evaluate("document.querySelector('.wiki-toc details').open"), true);
    const handoffLinkHit = await browser.evaluate(`(()=>{
      const link=document.querySelector('#graphics-handoff a');
      link.scrollIntoView({block:'center',inline:'nearest'});
      const rect=link.getBoundingClientRect();
      const hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
      return {href:hit?.closest('a')?.getAttribute('href')??null,tag:hit?.tagName??null,className:hit?.className??null,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},scrollY};
    })()`);
    assert.equal(
      handoffLinkHit.href,
      './docs/art-handoff/index.html',
      JSON.stringify(handoffLinkHit),
    );
    assert.equal(
      browser.events.filter((event) => event.method === 'Runtime.exceptionThrown').length,
      0,
    );
    evidence.push({ ...viewport, ...state });
  } finally {
    await browser.close();
  }
}

const printBrowser = await openQaBrowser({
  width: 1280,
  height: 900,
  search: 'PRODUCT_GOAL.html',
});
try {
  await printBrowser.until("document.readyState==='complete' && document.querySelector('.page')");
  await printBrowser.send('Emulation.setEmulatedMedia', { media: 'print' });
  const printState = await printBrowser.evaluate(`(()=>({
    header:getComputedStyle(document.querySelector('.wiki-global-header')).display,
    left:getComputedStyle(document.querySelector('.wiki-left-sidebar')).display,
    pageBorder:getComputedStyle(document.querySelector('.page')).borderTopWidth,
    overflow:document.documentElement.scrollWidth>innerWidth+1
  }))()`);
  assert.equal(printState.header, 'none');
  assert.equal(printState.left, 'none');
  assert.equal(printState.pageBorder, '0px');
  assert.equal(printState.overflow, false);
  await printBrowser.screenshot(`${outputDirectory}/print.png`);
  evidence.push({ id: 'print', ...printState });
} finally {
  await printBrowser.close();
}

fs.writeFileSync(
  `${outputDirectory}/wiki-evidence.json`,
  JSON.stringify({ verified: true, evidence }, null, 2),
);
console.log('Product Goal wiki desktop/mobile/print structure and visual surface: PASS');
