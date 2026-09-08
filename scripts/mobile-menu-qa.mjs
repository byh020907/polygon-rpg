import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';

const baseline = process.argv.includes('--baseline');
const output = resolve('artifacts/mobile-menu', baseline ? 'baseline' : 'current');
mkdirSync(output, { recursive: true });
const evidence = [];
const viewports = [
  ['desktop', 1280, 720],
  ['mobile-landscape', 844, 390],
  ['mobile-small-landscape', 740, 360],
  ['mobile-portrait', 390, 844],
  ['mobile-small-portrait', 360, 640],
];
const snapshot = `(() => {
  const selectors = ['#game-title', '.menu-actions button', '#pwa-check-update-control', '.menu-release', '.menu-version', '.menu-update-status', '.menu-data-notice summary', '#menu-reset-progress-control'];
  const elements = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => {
    const bounds = element.getBoundingClientRect();
    return { selector, text: element.innerText, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
      visible: bounds.width > 0 && bounds.height > 0, disabled: element.disabled,
      fontSize: parseFloat(getComputedStyle(element).fontSize),
      inViewport: bounds.x >= 0 && bounds.y >= 0 && bounds.right <= innerWidth + 1 && bounds.bottom <= innerHeight + 1 };
  }));
  return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, elements };
})()`;

function verifyBounds(name, record) {
  assert.ok(record.scrollWidth <= record.width, `${name}: horizontal overflow`);
  assert.ok(record.scrollHeight <= record.height, `${name}: closed menu exceeds viewport height`);
  assert.ok(
    record.elements.every((element) => !element.visible || element.inViewport),
    `${name}: ${JSON.stringify(record.elements.filter((element) => element.visible && !element.inViewport))}`,
  );
  for (const element of record.elements.filter((element) => element.visible)) {
    if (
      element.selector.includes('button') ||
      element.selector.includes('summary') ||
      element.selector === '#menu-reset-progress-control'
    )
      assert.ok(element.height >= 44, `${name}: small touch target ${element.text}`);
    if (element.selector !== '#game-title')
      assert.ok(element.fontSize >= 12, `${name}: small text ${element.text}`);
  }
}

async function press(browser, key, code, windowsVirtualKeyCode) {
  for (const type of ['keyDown', 'keyUp'])
    await browser.send('Input.dispatchKeyEvent', {
      type,
      key,
      code,
      windowsVirtualKeyCode,
      ...(type === 'keyDown' && key === 'Enter' ? { text: '\r' } : {}),
    });
  await wait(80);
}

for (const [name, width, height] of viewports.filter(
  ([name]) => !process.argv.includes('--desktop-only') || name === 'desktop',
)) {
  const browser = await openQaBrowser({ width, height });
  try {
    if (!baseline && name !== 'desktop') {
      await browser.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    }
    await browser.until(`document.querySelector('#app')?._x_dataStack?.[0]?.pwa?.currentVersion`);
    await wait(600);
    const record = await browser.evaluate(snapshot);
    await browser.screenshot(join(output, `${name}.png`));
    evidence.push({ name, state: 'actual-menu', ...record });
    if (!baseline) {
      verifyBounds(name, record);
      if (name === 'mobile-landscape') {
        for (const [state, rotatedWidth, rotatedHeight] of [
          ['rotated-to-portrait', 390, 844],
          ['browser-chrome-height', 844, 340],
        ]) {
          await browser.send('Emulation.setDeviceMetricsOverride', {
            width: rotatedWidth,
            height: rotatedHeight,
            deviceScaleFactor: 1,
            mobile: true,
          });
          await wait(80);
          const resized = await browser.evaluate(snapshot);
          verifyBounds(`${name}/${state}`, resized);
          evidence.push({ name, state, ...resized });
          await browser.screenshot(join(output, `${name}-${state}.png`));
        }
        await browser.send('Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: true,
        });
        await wait(80);
      }
      // UI state injection checks layout only. Real Service Worker A→B is a separate test.
      await browser.evaluate(
        `window.menuQaOriginalPwa = {...document.querySelector('#app')._x_dataStack[0].pwa}`,
      );
      for (const [state, values] of [
        [
          'update-ready-layout',
          {
            installAvailable: true,
            updateReady: true,
            updateChecking: false,
            restartRequired: false,
            applying: false,
            availableVersion: '0.2.1',
            status: '업데이트 가능 · v0.2.0 → v0.2.1 · BUILD a13f92c12345 → b29d61012345',
          },
        ],
        [
          'update-failed-layout',
          {
            installAvailable: true,
            updateReady: false,
            updateChecking: false,
            updateError: 'network',
            status: '현재 버전 유지 · 업데이트 확인 실패. 연결을 확인한 뒤 다시 시도하세요.',
          },
        ],
        [
          'restart-layout',
          {
            updateReady: false,
            restartRequired: true,
            applying: false,
            status: '다른 창에서 새 버전을 적용했습니다. 진행을 저장한 뒤 다시 열어 주세요.',
          },
        ],
        [
          'applying-layout',
          {
            updateReady: true,
            restartRequired: false,
            applying: true,
            status: '진행을 저장하고 새 버전으로 전환하는 중',
          },
        ],
      ]) {
        await browser.evaluate(
          `document.querySelector('#app')._x_dataStack[0].pwa = {...document.querySelector('#app')._x_dataStack[0].pwa, ...${JSON.stringify(values)}}`,
        );
        await wait(60);
        const layout = await browser.evaluate(snapshot);
        evidence.push({ name, state, evidenceKind: 'layout-only-state-injection', ...layout });
        await browser.screenshot(join(output, `${name}-${state}.png`));
        verifyBounds(`${name}/${state}`, layout);
        if (state === 'applying-layout') {
          assert.equal(
            await browser.evaluate(
              `document.querySelector('#menu-reset-progress-control').disabled`,
            ),
            true,
          );
          assert.equal(
            await browser.evaluate(`document.querySelector('#pwa-check-update-control').disabled`),
            true,
          );
          assert.equal(
            await browser.evaluate(`document.querySelector('.menu-button--update').disabled`),
            true,
          );
        }
      }
      await browser.evaluate(
        `document.querySelector('#app')._x_dataStack[0].pwa = window.menuQaOriginalPwa`,
      );
      // Emulate notch/home-indicator insets without claiming real-device safe-area measurement.
      if (name.includes('landscape')) {
        await browser.evaluate(
          `{const style=document.querySelector('.menu-screen').style;style.setProperty('--menu-safe-left','44px');style.setProperty('--menu-safe-right','44px');style.setProperty('--menu-safe-bottom','21px');}`,
        );
        await wait(60);
        const safeArea = await browser.evaluate(snapshot);
        evidence.push({
          name,
          state: 'safe-area-layout',
          evidenceKind: 'inset-token-emulation',
          ...safeArea,
        });
        verifyBounds(`${name}/safe-area`, safeArea);
        await browser.screenshot(join(output, `${name}-safe-area.png`));
      }
      // The native details remains available to real keyboard and touch input.
      await browser.evaluate(`document.querySelector('.menu-data-notice summary').focus()`);
      await press(browser, 'Enter', 'Enter', 13);
      assert.equal(
        await browser.evaluate(`document.querySelector('.menu-data-notice').open`),
        true,
      );
      await browser.evaluate(
        `document.querySelector('#menu-reset-progress-control').scrollIntoView({block:'center'})`,
      );
      const resetAccessible = await browser.evaluate(
        `(()=>{const r=document.querySelector('#menu-reset-progress-control').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()`,
      );
      assert.equal(resetAccessible, true, `${name}: reset cannot be reached`);
      await browser.screenshot(join(output, `${name}-save-management.png`));
      await browser.click('.menu-data-notice summary', name !== 'desktop');
      assert.equal(
        await browser.evaluate(`document.querySelector('.menu-data-notice').open`),
        false,
      );
      await browser.evaluate(
        `window.scrollTo(0,0);document.querySelector('#menu-start-control').focus()`,
      );
      await press(browser, 'Tab', 'Tab', 9);
      assert.equal(
        await browser.evaluate(`document.activeElement.id`),
        'menu-mobile-start-control',
      );
      if (name === 'desktop') {
        await browser.evaluate(`document.querySelector('#menu-start-control').focus()`);
        await press(browser, 'Enter', 'Enter', 13);
      } else await browser.click('#menu-mobile-start-control', true);
      await browser.until(`document.querySelector('#app')._x_dataStack[0].screen === 'game'`);
      assert.equal(
        await browser.evaluate(
          `document.querySelector('#app')._x_dataStack[0].forceMobileControls`,
        ),
        name !== 'desktop',
      );
      evidence.push({
        name,
        state: 'actual-input',
        keyboardFocusOrder: true,
        nativeDetailsKeyboardAndTouch: true,
        resetReachable: true,
        gameStart: name === 'desktop' ? 'keyboard' : 'touch',
      });
      const errors = browser.events.filter((event) => event.method === 'Runtime.exceptionThrown');
      assert.equal(errors.length, 0, JSON.stringify(errors));
    }
  } finally {
    await browser.close();
    writeFileSync(join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
  }
}
console.log(
  `Mobile menu ${baseline ? 'baseline' : 'QA PASS'}: ${evidence.length} actual viewport records in ${output}`,
);
