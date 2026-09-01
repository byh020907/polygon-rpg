import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildDebugQaUrl } from '../src/ui/DebugConfigurationAdapter.js';
import { createStaticServer } from './serve.mjs';

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`잘못된 인자: ${key ?? '(없음)'}`);
    }
    values.set(key.slice(2), value);
  }
  return values;
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${label}은 양의 정수여야 합니다.`);
  return number;
}

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function listen(server) {
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolvePromise();
    });
  });
  return server.address().port;
}

async function closeServer(server) {
  if (!server.listening) return;
  await new Promise((resolvePromise) => server.close(resolvePromise));
}

async function waitForProcessExit(child, timeoutMilliseconds = 5_000) {
  if (!child || child.exitCode !== null) return true;
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return true;
    await wait(100);
  }
  return child.exitCode !== null;
}

async function removeDirectoryWithRetry(directory, timeoutMilliseconds = 5_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      rmSync(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await wait(100);
    }
  }
  if (existsSync(directory)) throw lastError ?? new Error(`임시 directory 정리 실패: ${directory}`);
}

async function waitForPage(debugPort, pageOrigin, timeoutMilliseconds = 20_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find(
          (target) => target.type === 'page' && target.url.startsWith(pageOrigin),
        );
        if (page?.webSocketDebuggerUrl) return page;
      }
    } catch {
      // Chrome can take a few seconds to expose the debugging endpoint.
    }
    await wait(100);
  }
  throw new Error('Visible browser의 CDP page를 찾지 못했습니다.');
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.events = [];
  }

  async open() {
    await new Promise((resolvePromise, reject) => {
      this.socket.addEventListener('open', resolvePromise, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }
      this.events.push(message);
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForQa(client, timeoutMilliseconds = 30_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    const evaluation = await client.send('Runtime.evaluate', {
      expression: 'globalThis.__POLYGON_RPG_VISUAL_QA__ ?? null',
      returnByValue: true,
    });
    const value = evaluation.result?.value;
    if (value?.ready === true) return value;
    if (value?.ready === false) throw new Error(value.error ?? 'Visual QA page failed.');
    await wait(50);
  }
  throw new Error('게임이 지정 frame의 Visual QA 준비 신호를 보내지 않았습니다.');
}

async function run() {
  const values = parseArgs(process.argv.slice(2));
  const repo = resolve(values.get('repo') ?? process.cwd());
  const browserValue = values.get('browser') ?? process.env.BROWSER_PATH;
  if (!browserValue) {
    throw new Error('Visual QA에는 --browser <path> 또는 BROWSER_PATH가 필요합니다.');
  }
  const browserPath = resolve(browserValue);
  if (!existsSync(browserPath)) {
    throw new Error(`Visual QA browser를 찾을 수 없습니다: ${browserPath}`);
  }
  const start = values.get('start') ?? 'academy';
  const frame = Number(values.get('frame') ?? 0);
  const renderer = values.get('renderer') ?? 'retro';
  const phase = values.get('phase') ?? 'active';
  const outputDirectory = resolve(values.get('output') ?? join(repo, 'artifacts', 'visual-qa'));
  const width = positiveInteger(values.get('width') ?? 1440, 'width');
  const height = positiveInteger(values.get('height') ?? 810, 'height');
  const debugPort = 9300 + Math.floor(Math.random() * 500);
  const server = createStaticServer({ rootPath: repo });
  const profileDirectory = mkdtempSync(join(tmpdir(), 'polygon-rpg-visual-qa-'));
  let browser = null;
  let client = null;
  let result = null;
  let failure = null;

  mkdirSync(outputDirectory, { recursive: true });
  const screenshotPath = join(outputDirectory, `${start}-${phase}-${renderer}-frame-${frame}.png`);
  const metadataPath = join(outputDirectory, `${start}-${phase}-${renderer}-frame-${frame}.json`);

  try {
    const port = await listen(server);
    const pageOrigin = `http://127.0.0.1:${port}`;
    const pageUrl = buildDebugQaUrl(`${pageOrigin}/`, {
      start,
      frame,
      renderer,
      phase,
      reducedMotion: false,
    }).href;
    browser = spawn(
      browserPath,
      [
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${profileDirectory}`,
        `--window-size=${width},${height + 90}`,
        '--new-window',
        '--no-first-run',
        '--no-default-browser-check',
        pageUrl,
      ],
      { cwd: repo, stdio: 'ignore', windowsHide: false },
    );

    const page = await waitForPage(debugPort, pageOrigin);
    client = new CdpClient(page.webSocketDebuggerUrl);
    await client.open();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send('Page.reload', { ignoreCache: true });

    const qa = await waitForQa(client);
    await client.send('Runtime.evaluate', {
      expression: 'globalThis.__POLYGON_RPG_VISUAL_QA_RENDER__?.()',
      awaitPromise: true,
    });
    const canvasBounds = (
      await client.send('Runtime.evaluate', {
        expression: `(() => {
          const bounds = document.querySelector('#game-canvas')?.getBoundingClientRect();
          return bounds
            ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
            : null;
        })()`,
        returnByValue: true,
      })
    ).result?.value;
    if (!(canvasBounds?.width > 0 && canvasBounds?.height > 0)) {
      throw new Error('Visual QA game canvas bounds를 확인하지 못했습니다.');
    }
    const screenshot = await client.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
      clip: { ...canvasBounds, scale: 1 },
    });
    writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

    const consoleErrors = client.events
      .filter(
        (event) =>
          event.method === 'Runtime.exceptionThrown' ||
          (event.method === 'Runtime.consoleAPICalled' && event.params?.type === 'error') ||
          (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error'),
      )
      .map((event) => event.params);
    const metadata = {
      capturedAt: new Date().toISOString(),
      pageUrl,
      screenshotPath,
      qa,
      viewport: { width, height, canvas: canvasBounds },
      consoleErrors,
    };
    writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    if (consoleErrors.length > 0) {
      throw new Error(`Visual QA console error가 ${consoleErrors.length}개 있습니다.`);
    }

    result = { ok: true, screenshotPath, metadataPath, qa };
  } catch (error) {
    failure = error;
  } finally {
    if (client) {
      try {
        await client.send('Browser.close');
      } catch {
        // The browser may have already closed after a page failure.
      }
      client.close();
    }
    if (browser && !(await waitForProcessExit(browser))) {
      browser.kill();
      await waitForProcessExit(browser);
    }
    try {
      await closeServer(server);
      await removeDirectoryWithRetry(profileDirectory);
    } catch (cleanupError) {
      failure ??= cleanupError;
    }
  }

  if (failure) throw failure;
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
