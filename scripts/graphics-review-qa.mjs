import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';
import { GRAPHICS_CATEGORIES } from '../src/graphics/GraphicsResourceCatalog.js';
import { GAME_UI_RESOURCES } from '../src/ui/GameUiCatalog.js';

const output = resolve('artifacts/graphics-review');
mkdirSync(output, { recursive: true });
const evidence = [];
const PLAYER_ATTACK_ACTION_IDS = Object.freeze([
  'slash',
  'heavy',
  'thrust',
  'rising',
  'spin',
  'airSlash',
  'airHeavy',
  'airReturn',
  'airSpin',
  'airCross',
  'shieldBash',
]);
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
      if (name === 'desktop') {
        await choose('[data-gr=speed]', 1);
        for (const facing of [1, -1]) {
          await choose('[data-gr=facing]', facing);
          for (const actionId of PLAYER_ATTACK_ACTION_IDS) {
            await choose('[data-gr=action]', actionId);
            await choose('[data-gr=frame]', 0);
            const frameCount =
              Number(await evaluate(`document.querySelector('[data-gr=frame]').max`)) + 1;
            await evaluate(`(()=>{
              globalThis.__attackReviewFrames=[];
              globalThis.__attackReviewCapture=true;
              globalThis.__attackReviewStart=performance.now();
              requestAnimationFrame(function capture(now){
                if(!globalThis.__attackReviewCapture)return;
                const root=document.querySelector('#graphics-review');
                globalThis.__attackReviewFrames.push({
                  milliseconds:now-globalThis.__attackReviewStart,
                  frame:Number(root.dataset.frameIndex)
                });
                requestAnimationFrame(capture);
              });
            })()`);
            await click('[data-gr=play]');
            await wait(Math.ceil((frameCount / 60) * 1000) + 180);
            const playback = await evaluate(`(()=>{
              globalThis.__attackReviewCapture=false;
              const rawFrames=globalThis.__attackReviewFrames;
              const startIndex=Math.max(0,rawFrames.findIndex(({frame})=>frame<=1));
              const endOffset=rawFrames.slice(startIndex).findIndex(({frame})=>frame>=${frameCount - 3});
              const frames=endOffset<0?rawFrames.slice(startIndex):rawFrames.slice(startIndex,startIndex+endOffset+1);
              const observed=[...new Set(frames.map(({frame})=>frame))];
              return {
                captured:frames.length,
                observed,
                elapsed:frames.at(-1).milliseconds-frames[0].milliseconds,
                playing:document.querySelector('#graphics-review').dataset.playing,
                wrappedFramesDiscarded:rawFrames.length-frames.length
              };
            })()`);
            if (playback.playing === 'true') await click('[data-gr=play]');
            const minimumObserved = Math.min(frameCount - 2, 3);
            assert.ok(
              playback.observed.length >= minimumObserved,
              `${actionId}/${facing}: normal playback skipped too much of the action`,
            );
            assert.ok(
              Math.min(...playback.observed) <= 1,
              `${actionId}/${facing}: single-cycle evidence must begin at the ready pose`,
            );
            assert.ok(
              Math.max(...playback.observed) >= frameCount - 3,
              `${actionId}/${facing}: normal playback did not reach the recovery`,
            );
            const expectedElapsed = ((frameCount - 2) / 60) * 1000;
            assert.ok(
              playback.elapsed >= expectedElapsed * 0.7 &&
                playback.elapsed <= expectedElapsed * 1.8 + 220,
              `${actionId}/${facing}: playback did not run at the selected 1x timing`,
            );
            const strip = await evaluate(`(async()=>{
              const root=document.querySelector('#graphics-review');
              const frameInput=document.querySelector('[data-gr=frame]');
              const canvasSource=root.querySelector('[data-gr=canvas]');
              const selected=[];
              for(const frame of Array.from({length:12},(_,i)=>Math.round(i*(${frameCount}-1)/11))){
                frameInput.value=String(frame);
                frameInput.dispatchEvent(new Event('input',{bubbles:true}));
                frameInput.dispatchEvent(new Event('change',{bubbles:true}));
                await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
                selected.push({
                  milliseconds:frame/60*1000,
                  frame:Number(root.dataset.frameIndex),
                  png:canvasSource.toDataURL('image/png')
                });
              }
              const images=await Promise.all(selected.map(async frame=>{
                const image=new Image();image.src=frame.png;await image.decode();return image;
              }));
              const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=756;
              const context=canvas.getContext('2d');context.fillStyle='#171b22';context.fillRect(0,0,canvas.width,canvas.height);
              context.imageSmoothingEnabled=true;
              for(let i=0;i<selected.length;i++){
                const x=(i%4)*300,y=Math.floor(i/4)*252,image=images[i],frame=selected[i];
                context.drawImage(image,0,0,image.width,image.height,x,y,300,220);
                context.fillStyle='#171b22';context.fillRect(x,y+220,300,32);
                context.fillStyle='white';context.font='14px sans-serif';
                context.fillText(Math.round(frame.milliseconds)+' ms · frame '+frame.frame,x+8,y+242);
              }
              return canvas.toDataURL('image/png');
            })()`);
            const side = facing === 1 ? 'right' : 'left';
            writeFileSync(
              join(output, `desktop-attack-${actionId}-${side}-strip.png`),
              Buffer.from(strip.split(',')[1], 'base64'),
            );
            evidence.push({
              name,
              attackPlayback: actionId,
              facing,
              frameCount,
              ...playback,
            });
          }
        }
      }
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
