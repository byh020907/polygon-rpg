import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';
import { GRAPHICS_CATEGORIES } from '../src/graphics/GraphicsResourceCatalog.js';
import { GAME_UI_RESOURCES } from '../src/ui/GameUiCatalog.js';

const output = resolve('artifacts/graphics-review');
mkdirSync(output, { recursive: true });
const evidence = [];
const ready = `document.querySelector('#graphics-review')?.dataset.ready === 'true'`;
const snapshot = `(()=>{const r=document.querySelector('#graphics-review');const c=r.querySelector('[data-gr=canvas]');return {resource:r.dataset.resourceId,frame:r.dataset.frameIndex,error:r.dataset.error??null,uiVisible:r.dataset.uiVisible,playing:r.dataset.playing,url:location.href,canvas:{width:c.width,height:c.height},bodyOverflow:document.documentElement.scrollWidth>innerWidth}})()`;

for (const [name, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
].filter(([name]) => !process.argv.includes('--mobile-only') || name === 'mobile')) {
  const browser = await openQaBrowser({ width, height, search: '?graphicsReview=1' });
  const { click, choose, evaluate, until, screenshot } = browser;
  try {
    await until(ready);
    if (!process.argv.includes('--ui-only')) {
      await screenshot(join(output, `${name}-initial.png`));
      for (const category of GRAPHICS_CATEGORIES) {
        await choose('[data-gr=category]', category.id);
        await click('[data-gr=resources] button', name === 'mobile');
        await browser.send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: 'Escape',
          code: 'Escape',
          windowsVirtualKeyCode: 27,
        });
        await until(ready);
        const record = await evaluate(snapshot);
        assert.equal(record.error, null, `${name}/${category.id}`);
        await evaluate(`document.querySelector('.gr-main').scrollTop=0`);
        await screenshot(join(output, `${name}-${category.id}.png`));
        evidence.push({ name, category: category.id, ...record });
      }
      await choose('[data-gr=category]', 'player');
      await click('[data-resource-id="player:protagonist"]', name === 'mobile');
      await browser.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
      });
      for (const action of ['roll', 'slash', 'heavy', 'run']) {
        await choose('[data-gr=action]', action);
        const max = await evaluate(`Number(document.querySelector('[data-gr=frame]').max)`);
        for (const frame of [
          ...new Set([
            0,
            Math.round(max * 0.25),
            Math.round(max * 0.5),
            Math.round(max * 0.75),
            max,
          ]),
        ]) {
          await choose('[data-gr=frame]', frame);
          await evaluate(`document.querySelector('.gr-main').scrollTop=0`);
          await screenshot(join(output, `${name}-${action}-${frame}.png`));
        }
      }
      await choose('[data-gr=action]', 'roll');
      await choose('[data-gr=frame]', 12);
      await click('[data-gr=next]', name === 'mobile');
      assert.equal((await evaluate(snapshot)).frame, '13');
      await click('[data-gr=previous]', name === 'mobile');
      assert.equal((await evaluate(snapshot)).frame, '12');
      await click('[data-gr=play]', name === 'mobile');
      await wait(150);
      const playing1 = await evaluate(snapshot);
      await wait(180);
      const playing2 = await evaluate(snapshot);
      assert.equal(playing1.playing, 'true');
      assert.notEqual(playing1.frame, playing2.frame);
      await click('[data-gr=play]', name === 'mobile');
      const stopped = await evaluate(snapshot);
      await wait(120);
      assert.equal((await evaluate(snapshot)).frame, stopped.frame);
      await choose('[data-gr=frame]', 12);
      await choose('[data-gr=facing]', -1);
      await choose('[data-gr=lighting]', 'unlit');
      await choose('[data-gr=scale]', '2');

      await browser.send('Browser.grantPermissions', {
        permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        origin: browser.origin,
      });
      await click('[data-gr=copy]', name === 'mobile');
      const copied = await evaluate('navigator.clipboard.readText()');
      assert.ok(copied.includes('player:protagonist') && copied.includes('프레임: 12'));
      const url = copied
        .split('\n')
        .find((line) => line.startsWith('재현: '))
        .slice(4);
      await browser.navigate(url);
      await until(ready);
      const restored = await evaluate(snapshot);
      assert.equal(restored.frame, '12');
      assert.equal(restored.resource, 'player:protagonist');
      assert.equal(await evaluate(`document.querySelector('[data-gr=facing]').value`), '-1');
      await screenshot(join(output, `${name}-restored.png`));
      evidence.push({ name, playback: [playing1, playing2, stopped], clipboard: copied, restored });
    }
    for (const resource of GAME_UI_RESOURCES) {
      await browser.navigate(
        `?graphicsReview=1&resource=${encodeURIComponent(resource.id)}&reviewCategory=ui&reviewViewport=${name}`,
      );
      await until(ready);
      await until(`document.querySelector('#graphics-review').dataset.uiVisible !== undefined`);
      const state = await evaluate(snapshot);
      assert.equal(state.uiVisible, 'true', `${resource.id} production UI must be visible`);
      assert.equal(state.bodyOverflow, false);
      evidence.push({ name, ui: resource.id, ...state });
      if (
        [
          'ui/operation-map',
          'ui/dialogue',
          'ui/action-preview',
          'ui/game-over',
          'ui/workshop',
          'ui/recovery',
        ].includes(resource.id)
      )
        await screenshot(join(output, `${name}-${resource.id.replace('/', '-')}.png`));
    }
    await click('[data-gr=close]', name === 'mobile');
    await until(
      `document.querySelector('#graphics-review').hidden && !document.querySelector('#app').inert`,
    );
    assert.equal(
      await evaluate(`new URLSearchParams(location.search).has('graphicsReview')`),
      false,
    );
    await browser.navigate('');
    await until(`document.querySelector('#menu-start-control')?.getClientRects().length > 0`);
    assert.equal(await evaluate(`document.querySelector('#graphics-review').hidden`), true);
    await click('#menu-start-control', name === 'mobile');
    await wait(250);
    await screenshot(join(output, `${name}-normal-game.png`));
    const errors = browser.events.filter(
      (event) =>
        event.method === 'Runtime.exceptionThrown' ||
        (event.method === 'Log.entryAdded' && event.params.entry.level === 'error'),
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    writeFileSync(join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
  }
}
process.stdout.write(JSON.stringify({ passed: true, output, checks: evidence.length }) + '\n');
