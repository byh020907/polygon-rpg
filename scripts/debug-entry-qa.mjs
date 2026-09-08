import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';

// Public controls and native input only. Scenario changes go through the visible
// debug form; player saves are observed, never seeded or edited by this test.
const output = path.resolve('artifacts/debug-entry');
fs.mkdirSync(output, { recursive: true });
const evidence = { startedAt: new Date().toISOString(), checks: [] };
const requestedViewport = process.argv
  .find((argument) => argument.startsWith('--viewport='))
  ?.slice('--viewport='.length);
if (requestedViewport && !['desktop', 'mobile'].includes(requestedViewport))
  throw new Error('Use --viewport=desktop or --viewport=mobile');
const TITLE = '#game-title button';
const GAME_MENU = '#game-menu-control';
const CLOSE_DEBUG = 'button[aria-label="디버그 패널 닫기"]';
const shell = "Alpine.$data(document.querySelector('#app'))";
const ready = "globalThis.Alpine && document.querySelector('#app')?._x_dataStack";
const state = `(()=>{const s=${shell},p=document.querySelector('.debug-panel'),c=document.querySelector('#game-canvas');return {screen:s.screen,debug:s.debugPanelOpen,map:s.operationMapOpen,mapAvailable:s.operationMapAvailable,visualQa:s.visualQa,url:location.href,focus:document.activeElement?.id??'',panelVisible:p.checkVisibility(),panelCount:document.querySelectorAll('.debug-panel').length,panelInsideGame:Boolean(p.closest('.game-screen')),panelInert:Boolean(p.closest('[inert]')),canvas:{width:c.width,height:c.height,rect:c.getBoundingClientRect().toJSON()},background:[...document.querySelectorAll('#app > section')].map(n=>({class:n.className,inert:n.inert})),overflow:document.documentElement.scrollWidth>innerWidth}})()`;
const storage = `JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('polygon-rpg.progression.')).sort(([a],[b])=>a.localeCompare(b))))`;

async function key(browser, name, down, modifiers = 0) {
  const codes = { Enter: 13, Escape: 27, Tab: 9, ' ': 32 };
  await browser.send('Input.dispatchKeyEvent', {
    type: down ? 'keyDown' : 'keyUp',
    key: name,
    code: name === ' ' ? 'Space' : name,
    windowsVirtualKeyCode: codes[name],
    nativeVirtualKeyCode: codes[name],
    modifiers,
  });
}

async function pressKey(browser, name, modifiers = 0) {
  await key(browser, name, true, modifiers);
  await key(browser, name, false, modifiers);
  await wait(100);
}

async function pointer(browser, selector, touch) {
  await browser.evaluate(
    `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'nearest'})`,
  );
  const point = await browser.evaluate(
    `(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
  );
  if (touch) {
    await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await browser.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...point, id: 1 }],
    });
  } else {
    await browser.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...point,
      button: 'left',
      clickCount: 1,
    });
  }
  return {
    release: () =>
      touch
        ? browser.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        : browser.send('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            ...point,
            button: 'left',
            clickCount: 1,
          }),
    cancel: () =>
      browser.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }),
  };
}

async function hold(browser, selector, touch, expectedScreen) {
  const input = await pointer(browser, selector, touch);
  await wait(550);
  assert.equal((await browser.evaluate(state)).debug, false, 'a short press cannot open debug');
  await wait(600);
  await browser.until(`${shell}.debugPanelOpen`);
  const beforeRelease = await browser.evaluate(state);
  await input.release();
  await wait(120);
  const result = await browser.evaluate(state);
  evidence.checks.push({
    viewport: touch ? 'mobile' : 'desktop',
    check: 'hold-release-focus',
    selector,
    beforeRelease: beforeRelease.focus,
    afterRelease: result.focus,
  });
  assert.equal(result.screen, expectedScreen);
  assert.equal(result.debug, true, 'release/click following a completed hold must be consumed');
  assert.equal(result.map, false, 'a long hold cannot also open the operation map');
  return result;
}

async function record(browser, name, check, screenshot = false) {
  const result = { viewport: name, check, ...(await browser.evaluate(state)) };
  evidence.checks.push(result);
  if (screenshot) await browser.screenshot(path.join(output, `${name}-${check}.png`));
  return result;
}

async function closeDebug(browser, openerId, touch, escape = false) {
  if (escape) await pressKey(browser, 'Escape');
  else await browser.click(CLOSE_DEBUG, touch);
  await browser.until(`!${shell}.debugPanelOpen`);
  await browser.until(`document.activeElement?.id===${JSON.stringify(openerId)}`);
  assert.equal(
    await browser.evaluate(`Boolean(document.querySelector('#app > section[inert]'))`),
    false,
    'closing the common dialog must release every screen',
  );
}

async function checkModal(browser, expectedScreen, touch) {
  const snapshot = await browser.evaluate(state);
  assert.equal(snapshot.screen, expectedScreen);
  assert.equal(snapshot.panelCount, 1);
  assert.equal(snapshot.panelInsideGame, false, 'one shared modal must be outside game-screen');
  assert.equal(snapshot.panelVisible, true);
  assert.equal(snapshot.panelInert, false);
  assert.equal(snapshot.focus, 'debug-panel-title');
  assert.ok(snapshot.background.length >= 2);
  assert.ok(snapshot.background.every((entry) => entry.inert));
  if (touch) {
    // A new tap immediately after the held gesture must reach a real control;
    // the one-shot trailing-click guard cannot steal its focus or consume it.
    await browser.click('#debug-frame', true);
    assert.equal(await browser.evaluate('document.activeElement?.id'), 'debug-frame');
  }
  await browser.evaluate(
    `(()=>{const p=document.querySelector('.debug-panel');const items=[...p.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled])')].filter(n=>n.checkVisibility());items.at(-1).focus();})()`,
  );
  await pressKey(browser, 'Tab');
  assert.equal(
    await browser.evaluate(
      `document.activeElement===document.querySelector(${JSON.stringify(CLOSE_DEBUG)})`,
    ),
    true,
    'Tab from the last control wraps to the first dialog control',
  );
  await pressKey(browser, 'Tab', 8);
  assert.equal(
    await browser.evaluate(`Boolean(document.activeElement.closest('.debug-panel'))`),
    true,
  );
}

try {
  for (const [name, width, height, touch] of [
    ['desktop', 1280, 720, false],
    ['mobile', 844, 390, true],
  ].filter(([name]) => !requestedViewport || name === requestedViewport)) {
    const browser = await openQaBrowser({ width, height });
    let interruptionTab = null;
    try {
      await browser.until(ready);
      await browser.until(`document.querySelector(${JSON.stringify(TITLE)})?.checkVisibility()`);
      const titleId = await browser.evaluate(`document.querySelector(${JSON.stringify(TITLE)}).id`);
      assert.ok(titleId, 'the title button needs a stable focus-return ID');
      const initialSave = await browser.evaluate(storage);
      const initial = await record(browser, name, 'initial-menu', true);
      assert.equal(initial.screen, 'menu');
      assert.equal(initial.debug, false);
      assert.equal(initial.panelVisible, false);
      assert.equal(initial.overflow, false);
      assert.equal(
        await browser.evaluate(
          `document.querySelector('#graphics-review-open-control').checkVisibility()`,
        ),
        false,
      );
      assert.equal(
        await browser.evaluate(`document.querySelector(${JSON.stringify(TITLE)}).tagName`),
        'BUTTON',
      );

      await browser.click(TITLE, touch);
      assert.equal((await browser.evaluate(state)).screen, 'menu');
      assert.equal((await browser.evaluate(state)).debug, false);
      await browser.evaluate(`document.querySelector(${JSON.stringify(TITLE)}).focus()`);
      await pressKey(browser, 'Enter');
      assert.equal((await browser.evaluate(state)).debug, false);
      assert.equal((await browser.evaluate(state)).screen, 'menu');
      await record(browser, name, 'title-short-activation');

      const canceled = await pointer(browser, TITLE, touch);
      await wait(250);
      if (touch) await canceled.cancel();
      else {
        interruptionTab = (await browser.send('Target.createTarget', { url: 'about:blank' }))
          .targetId;
        await browser.send('Target.activateTarget', { targetId: interruptionTab });
        await browser.until(`document.visibilityState==='hidden'`);
      }
      await wait(1000);
      if (interruptionTab) {
        await browser.send('Target.closeTarget', { targetId: interruptionTab });
        interruptionTab = null;
        await browser.send('Page.bringToFront');
        await canceled.release();
      }
      assert.equal((await browser.evaluate(state)).debug, false);
      assert.equal((await browser.evaluate(state)).screen, 'menu');
      await record(browser, name, touch ? 'touch-cancel' : 'native-blur-cancel');

      await hold(browser, TITLE, touch, 'menu');
      await checkModal(browser, 'menu', touch);
      await record(browser, name, 'title-hold-panel', true);
      await closeDebug(browser, titleId, touch, true);
      await browser.evaluate(`document.querySelector(${JSON.stringify(TITLE)}).focus()`);
      await key(browser, 'Enter', true);
      await wait(1150);
      await browser.until(`${shell}.debugPanelOpen`);
      await key(browser, 'Enter', false);
      assert.equal((await browser.evaluate(state)).screen, 'menu');
      await closeDebug(browser, titleId, touch);
      await record(browser, name, 'keyboard-hold-and-focus-return');
      assert.equal(await browser.evaluate(storage), initialSave);

      const start = touch ? '#menu-mobile-start-control' : '#menu-start-control';
      await browser.click(start, touch);
      await browser.until(`${shell}.screen==='game'`);
      await browser.until(`document.querySelector(${JSON.stringify(GAME_MENU)}).checkVisibility()`);
      assert.equal(
        (await browser.evaluate(state)).mapAvailable,
        false,
        'fresh campaign has no map',
      );
      assert.equal(
        await browser.evaluate(
          `document.querySelector(${JSON.stringify(GAME_MENU)}).textContent.trim()`,
        ),
        'MENU',
      );
      await record(browser, name, 'fresh-game-menu', true);
      await browser.click(GAME_MENU, touch);
      await browser.until(`${shell}.screen==='menu'`);
      assert.equal((await browser.evaluate(state)).map, false);
      await browser.click(start, touch);
      await browser.until(`${shell}.screen==='game'`);
      await hold(browser, GAME_MENU, touch, 'game');
      await checkModal(browser, 'game', touch);
      await record(browser, name, 'fresh-game-hold-panel', true);
      await closeDebug(browser, 'game-menu-control', touch, true);
      await browser.evaluate(`document.querySelector(${JSON.stringify(GAME_MENU)}).focus()`);
      await pressKey(browser, 'Enter');
      await browser.until(`${shell}.screen==='menu'`);
      assert.equal((await browser.evaluate(state)).map, false);

      await hold(browser, TITLE, touch, 'menu');
      await browser.choose('#debug-start', 'scrap-garage-0');
      await browser.choose('#debug-renderer', 'polygon');
      await browser.choose('#debug-frame', 0);
      await browser.click('.debug-primary-action', touch);
      await browser.until(`${shell}.screen==='game' && ${shell}.visualQa`);
      const applied = await record(browser, name, 'main-panel-applied', true);
      assert.equal(new URL(applied.url).searchParams.get('gameStart'), 'scrap-garage-0');
      assert.ok(applied.canvas.width > 100 && applied.canvas.height > 100);
      assert.ok(applied.canvas.rect.width > 100 && applied.canvas.rect.height > 100);
      assert.equal(applied.mapAvailable, true);
      if (applied.debug) await closeDebug(browser, 'game-menu-control', touch);
      await record(browser, name, 'applied-game-visible', true);
      assert.equal(
        await browser.evaluate(
          `document.querySelector(${JSON.stringify(GAME_MENU)}).textContent.trim()`,
        ),
        'MAP',
      );
      await browser.click(GAME_MENU, touch);
      await browser.until(`${shell}.operationMapOpen`);
      assert.equal((await browser.evaluate(state)).debug, false);
      await record(browser, name, 'unlocked-map-short', true);
      await pressKey(browser, 'Escape');
      await browser.until(`!${shell}.operationMapOpen`);
      await hold(browser, GAME_MENU, touch, 'game');
      assert.equal((await browser.evaluate(state)).map, false);
      await record(browser, name, 'unlocked-map-long', true);
      await browser.click('.debug-panel-actions button:nth-child(3)', touch);
      await browser.until(
        `${shell}.screen==='game' && !${shell}.visualQa && !${shell}.debugPanelOpen`,
      );
      assert.equal(
        await browser.evaluate(storage),
        initialSave,
        'review selection cannot write player saves',
      );
      await record(browser, name, 'normal-game-return', true);
      const errors = browser.events.filter((event) => event.method === 'Runtime.exceptionThrown');
      assert.deepEqual(errors, []);
      evidence.checks.push({
        viewport: name,
        check: 'save-preserved-and-no-runtime-errors',
        errors,
      });
    } catch (error) {
      await record(browser, name, 'failure', true);
      throw error;
    } finally {
      if (interruptionTab) await browser.send('Target.closeTarget', { targetId: interruptionTab });
      await browser.close();
      fs.writeFileSync(path.join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
    }
  }
  evidence.verified = true;
  evidence.finishedAt = new Date().toISOString();
  console.log(
    `Debug entry native mouse/touch/keyboard and same-page apply: PASS (${evidence.checks.length} records)`,
  );
} catch (error) {
  evidence.failure = error.stack;
  throw error;
} finally {
  fs.writeFileSync(path.join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
}
