import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { createStaticServer } from '../serve.mjs';

export const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function openQaBrowser({
  width = 1280,
  height = 720,
  search = '',
  root = process.cwd(),
  serverFactory = () => createStaticServer({ rootPath: root }),
  profileRoot = tmpdir(),
  profileDirectory = null,
  port = 0,
} = {}) {
  // A supplied directory belongs to the caller and must be a dedicated test profile.
  if (
    profileDirectory !== null &&
    (typeof profileDirectory !== 'string' || !isAbsolute(profileDirectory))
  )
    throw new TypeError('A caller-owned browser profile must use an absolute directory path');
  const server = serverFactory();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = profileDirectory ?? mkdtempSync(join(profileRoot, 'polygon-graphics-'));
  const process = spawn(
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      `${origin}/${search}`,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true },
  );
  let socket;
  let sequence = 0;
  const pending = new Map();
  const events = [];
  const cleanup = async ({ graceful = false } = {}) => {
    let gracefulTimedOut = false;
    if (graceful && process.exitCode === null) {
      socket?.send(JSON.stringify({ id: ++sequence, method: 'Browser.close' }));
      for (let attempt = 0; attempt < 50 && process.exitCode === null; attempt += 1)
        await wait(100);
      gracefulTimedOut = process.exitCode === null;
    }
    socket?.close();
    if (process.exitCode === null) process.kill();
    for (let attempt = 0; attempt < 40 && process.exitCode === null; attempt += 1) await wait(100);
    await new Promise((resolve) => server.close(resolve));
    for (let attempt = 0; profileDirectory === null && attempt < 20; attempt += 1) {
      try {
        rmSync(profile, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 19) throw error;
        await wait(150);
      }
    }
    if (gracefulTimedOut) throw new Error('Chrome did not complete a graceful browser shutdown');
  };
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let stderr = '';
      const timeout = setTimeout(() => reject(new Error('Headless Chrome start timeout')), 20000);
      process.stderr.on('data', (data) => {
        stderr += data.toString();
        const endpoint = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
        if (endpoint) {
          clearTimeout(timeout);
          resolve(endpoint);
        }
      });
      process.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    const port = new URL(endpoint).port;
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find((entry) => entry.type === 'page');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        clearTimeout(request.timeout);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
      } else events.push(message);
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++sequence;
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }, 20000);
        pending.set(id, { resolve, reject, timeout });
        socket.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      const response = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (response.exceptionDetails)
        throw new Error(
          response.exceptionDetails.exception?.description ?? response.exceptionDetails.text,
        );
      return response.result?.value;
    };
    const until = async (expression, timeout = 30000) => {
      const deadline = Date.now() + timeout;
      let value;
      while (Date.now() < deadline) {
        value = await evaluate(expression);
        if (value) return value;
        await wait(100);
      }
      const errors = events
        .filter((event) => event.method === 'Runtime.exceptionThrown')
        .map(
          (event) =>
            event.params.exceptionDetails.exception?.description ??
            event.params.exceptionDetails.text,
        );
      throw new Error(
        `Browser condition timeout: ${expression} (${JSON.stringify(value)}) ${errors.slice(-3).join('\n')}`,
      );
    };
    const click = async (selector, touch = false) => {
      await evaluate(
        `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'nearest'})`,
      );
      const point = await evaluate(
        `(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
      );
      if (touch) {
        await send('Emulation.setTouchEmulationEnabled', { enabled: true });
        await send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ ...point, id: 1 }],
        });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else
        for (const type of ['mousePressed', 'mouseReleased'])
          await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
      await wait(120);
    };
    const choose = async (selector, value) => {
      await evaluate(
        `(()=>{const n=document.querySelector(${JSON.stringify(selector)});n.value=${JSON.stringify(String(value))};n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      );
      await wait(160);
    };
    const screenshot = async (file) => {
      const result = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      writeFileSync(file, Buffer.from(result.data, 'base64'));
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    return {
      origin,
      events,
      send,
      evaluate,
      until,
      click,
      choose,
      screenshot,
      close: cleanup,
      navigate: async (url) => {
        await send('Page.navigate', { url: url.startsWith('http') ? url : `${origin}/${url}` });
        await wait(200);
      },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
