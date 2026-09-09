import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';
fs.mkdirSync('artifacts/update-loading', { recursive: true });
const shell = "Alpine.$data(document.querySelector('#app'))";
for (const [name, width, height] of [
  ['desktop', 1280, 720],
  ['landscape', 844, 390],
  ['portrait', 390, 844],
]) {
  const b = await openQaBrowser({ width, height });
  try {
    await b.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `const realFetch=window.fetch;window.fetch=async (...args)=>{if(String(args[0]).includes('release.json'))await new Promise(r=>setTimeout(r,1800));return realFetch(...args);};`,
    });
    await b.navigate('?loadingQa=1');
    await b.until(`globalThis.Alpine && ${shell}.pwaBusy`);
    assert.equal(
      await b.evaluate(
        "document.querySelector('.menu-update-feedback progress').checkVisibility()",
      ),
      true,
    );
    await b.screenshot(`artifacts/update-loading/${name}-checking.png`);
    await b.until(`!${shell}.pwaBusy`, 30000);
    for (const phase of ['saving', 'activating', 'reloading']) {
      // Visual fixtures drive the actual component; lifecycle stage transitions are tested separately.
      await b.evaluate(
        `${shell}.pwa={...${shell}.pwa,applying:true,applyPhase:${JSON.stringify(phase)},status:'진행 상태 확인',updateError:null}`,
      );
      await wait(80);
      const visual = await b.evaluate(
        "(()=>{const n=document.querySelector('.pwa-transition-card'),r=n.getBoundingClientRect();return{visible:n.checkVisibility(),r:r.toJSON(),inert:document.querySelector('.menu-screen').inert,step:document.querySelector('.pwa-transition-steps [aria-current=step]').textContent,determinate:n.querySelector('progress').hasAttribute('value')}})()",
      );
      assert.ok(visual.visible && visual.inert);
      assert.equal(visual.determinate, false);
      assert.ok(
        visual.r.x >= 0 && visual.r.y >= 0 && visual.r.right <= width && visual.r.bottom <= height,
      );
      await b.screenshot(`artifacts/update-loading/${name}-${phase}.png`);
    }
    await b.evaluate(
      `${shell}.pwa={...${shell}.pwa,applying:false,updateChecking:false,updateInstalling:false,updateError:'연결 실패',status:'현재 버전 유지 · 다시 확인하세요.'}`,
    );
    await wait(80);
    assert.equal(
      await b.evaluate("document.querySelector('.pwa-transition').checkVisibility()"),
      false,
    );
    assert.equal(await b.evaluate("document.querySelector('.menu-screen').inert"), false);
    await b.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    assert.equal(
      await b.evaluate("getComputedStyle(document.querySelector('.pwa-spinner')).animationName"),
      'none',
    );
    assert.equal(b.events.filter((e) => e.method === 'Runtime.exceptionThrown').length, 0);
    console.log(
      name,
      'PASS real delayed check / phase visuals / bounds / inert / error exit / reduced motion',
    );
  } finally {
    await b.close();
  }
}
