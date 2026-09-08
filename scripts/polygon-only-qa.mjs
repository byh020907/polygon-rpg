import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';
const output = 'artifacts/polygon-only';
fs.mkdirSync(output, { recursive: true });
const evidence = [];
for (const [name, width, height, dpr] of [
  ['desktop', 1280, 720, 1],
  ['mobile', 844, 390, 1],
  ['high-dpi', 1280, 720, 2],
]) {
  const b = await openQaBrowser({ width, height, search: '?inputQa=1' });
  try {
    await b.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: dpr,
      mobile: name === 'mobile',
    });
    await b.until("document.querySelector('#app')?._x_dataStack");
    await b.click(
      name === 'mobile' ? '#menu-mobile-start-control' : '#menu-start-control',
      name === 'mobile',
    );
    const game = await b.until(
      'globalThis.__POLYGON_RPG_INPUT_QA__?.raster?.backingWidth && globalThis.__POLYGON_RPG_INPUT_QA__.raster',
    );
    assert.equal(game.logicalWidth, 1440);
    await b.screenshot(`${output}/${name}-game.png`);
    assert.equal(
      await b.evaluate(
        "document.querySelectorAll('#retro-canvas,#pixel-size,#debug-renderer').length",
      ),
      0,
    );
    await b.click('#game-menu-control', name === 'mobile');
    await b.until("Alpine.$data(document.querySelector('#app')).screen==='menu'");
    await b.evaluate("document.querySelector('#menu-debug-control').focus()");
    await b.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
    });
    await wait(1100);
    await b.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
    });
    await b.until("Alpine.$data(document.querySelector('#app')).debugPanelOpen");
    await b.click('#menu-render-lab-control', name === 'mobile');
    await b.until("Alpine.$data(document.querySelector('#app')).screen==='render-lab'");
    await wait(150);
    const lab = await b.evaluate(
      "({canvases:document.querySelectorAll('.lab-screen canvas').length,heading:document.querySelector('#render-lab-title').innerText,width:document.querySelector('#polygon-canvas').width})",
    );
    assert.equal(lab.canvases, 1);
    assert.match(lab.heading, /Polygon/);
    assert.ok(lab.width > 1);
    await b.screenshot(`${output}/${name}-lab.png`);
    await b.navigate('?visualQa=1&gameStart=pose-idle&visualQaRenderer=retro');
    await b.until('globalThis.__POLYGON_RPG_VISUAL_QA__?.ready');
    await b.navigate(
      '?graphicsReview=1&reviewCategory=enemy-reference&resource=enemy-reference:flying&reviewRenderer=retro',
    );
    await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'");
    assert.equal(
      await b.evaluate("new URL(location.href).searchParams.get('reviewRenderer')"),
      'polygon',
    );
    assert.equal(await b.evaluate("document.querySelectorAll('[data-gr=renderer]').length"), 0);
    await b.choose('[data-gr=scale]', '4');
    const zoom = await b.evaluate(
      "(()=>{const c=document.querySelector('[data-gr=canvas]'),r=c.getBoundingClientRect();return{width:c.width,height:c.height,cssWidth:r.width,cssHeight:r.height,smoothing:c.getContext('2d').imageSmoothingEnabled}})()",
    );
    assert.ok(
      zoom.width >= zoom.cssWidth - 1 && zoom.height >= zoom.cssHeight - 1,
      '4× must rerender at its output size',
    );
    assert.ok(zoom.width * zoom.height <= 3_000_000);
    assert.equal(zoom.smoothing, true);
    await b.screenshot(`${output}/${name}-review-4x.png`);
    await b.choose('[data-gr=scale]', 'fit');
    await b.evaluate("document.querySelector('[data-gr=canvas]').scrollIntoView({block:'center'})");
    await b.screenshot(`${output}/${name}-review.png`);
    assert.equal(b.events.filter((e) => e.method === 'Runtime.exceptionThrown').length, 0);
    evidence.push({ name, game, lab, zoom });
    console.log(`${name}: game/lab/review/DPR/4x PASS`);
  } finally {
    await b.close();
  }
}
fs.writeFileSync(`${output}/evidence.json`, JSON.stringify({ verified: true, evidence }, null, 2));
