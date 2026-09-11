import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createStaticServer } from './serve.mjs';
import { writeEvidenceTimeline } from './qa/evidenceTimeline.mjs';
import { outlineParityExpression } from './qa/outlineParity.mjs';

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
  if (values.has('renderer') && values.get('renderer') !== 'polygon')
    throw new Error('Only --renderer polygon is supported.');
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
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      this.pending.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolvePromise(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(new Error(`${method}: ${error.message}`));
        },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const repo = process.cwd();
  const width = positiveInteger(args.get('width') ?? 1280, 'width');
  const height = positiveInteger(args.get('height') ?? 720, 'height');
  const output = resolve(args.get('output') ?? 'artifacts/motion-play');
  mkdirSync(output, { recursive: true });
  const profile = mkdtempSync(join(tmpdir(), 'polygon-motion-'));
  const server = createStaticServer({ rootPath: repo });
  const port = await listen(server);
  const debugPort = 10000 + Math.floor(Math.random() * 1000);
  const browser = spawn(
    args.get('browser') ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      `http://127.0.0.1:${port}/?inputQa=1&inputQaRenderer=${args.get('renderer') ?? 'polygon'}&inputQaStart=${args.get('start') ?? ''}&inputQaX=${args.get('start-x') ?? ''}`,
    ],
    { stdio: 'ignore', windowsHide: true },
  );
  let client;
  try {
    client = new CdpClient(
      (await waitForPage(debugPort, `http://127.0.0.1:${port}`)).webSocketDebuggerUrl,
    );
    await client.open();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Debugger.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: Number(args.get('dpr') ?? 1),
      mobile: false,
    });
    const evaluate = async (expression) =>
      (
        await client
          .send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true,
          })
          .catch(async (error) => {
            if (error.message.includes('timeout')) {
              try {
                await client.send('Debugger.pause');
                await wait(150);
                writeFileSync(
                  join(output, 'debugger-timeout.json'),
                  JSON.stringify(
                    {
                      expression: expression.slice(0, 200),
                      paused: client.events
                        .filter((event) => event.method === 'Debugger.paused')
                        .at(-1),
                    },
                    null,
                    2,
                  ),
                );
                await client.send('Debugger.resume');
              } catch {
                // Preserve the original timeout if the crashed target cannot pause.
              }
            }
            throw new Error(`${error.message} while evaluating ${expression.slice(0, 160)}`);
          })
      ).result?.value;
    if (args.get('document') === '1') {
      await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/PRODUCT_GOAL.html` });
      await wait(500);
      const evidence = [];
      for (const view of [
        { name: 'desktop', width: 1280, height: 720, media: 'screen' },
        { name: 'mobile', width: 844, height: 390, media: 'screen' },
        { name: 'print', width: 1280, height: 900, media: 'print' },
      ]) {
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: view.width,
          height: view.height,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await client.send('Emulation.setEmulatedMedia', { media: view.media });
        await wait(200);
        const documentState = await evaluate(
          `({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headings:[...document.querySelectorAll('h1,h2,h3')].map(n=>n.textContent),textLength:document.body.innerText.length})`,
        );
        const screenshot = await client.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        writeFileSync(
          join(output, `product-goal-${view.name}.png`),
          Buffer.from(screenshot.data, 'base64'),
        );
        evidence.push({
          ...view,
          ...documentState,
          horizontalOverflow: documentState.scrollWidth > documentState.width,
        });
      }
      writeFileSync(join(output, 'document-evidence.json'), JSON.stringify(evidence, null, 2));
      process.stdout.write(`${JSON.stringify({ output, evidence })}\n`);
      return;
    }
    await wait(1500);
    const click = async (selector) => {
      await evaluate(
        `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`,
      );
      const p = await evaluate(
        `(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
      );
      await client.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        ...p,
        button: 'left',
        clickCount: 1,
      });
      await client.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        ...p,
        button: 'left',
        clickCount: 1,
      });
    };
    const mobile = args.get('input') === 'touch';
    if (mobile) await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await click(mobile ? '#menu-mobile-start-control' : '#menu-start-control');
    await wait(Number(args.get('start-wait') ?? 1200));
    await click('.qa-input-relay-toggle');
    // Return keyboard focus to the production canvas after opening the optional
    // QA controls. Otherwise an arrow key can be targeted at the relay button
    // instead of exercising the game's keyboard adapter.
    if (!mobile) await click('#game-canvas');
    const mobilePoints = mobile
      ? await evaluate(
          `Object.fromEntries([...document.querySelectorAll('[data-mobile-action]')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mobileAction,{x:r.x+r.width/2,y:r.y+r.height/2}]}))`,
        )
      : null;
    const touches = new Map();
    const key = async (code, down) => {
      if (!mobile)
        return client.send('Input.dispatchKeyEvent', {
          type: down ? 'keyDown' : 'keyUp',
          code,
          key: code,
          windowsVirtualKeyCode: {
            ArrowRight: 39,
            ArrowLeft: 37,
            ArrowDown: 40,
            ArrowUp: 38,
            KeyA: 65,
            KeyS: 83,
          }[code],
        });
      const action = {
        ArrowRight: 'right',
        ArrowLeft: 'left',
        ArrowDown: 'guard',
        ArrowUp: 'jump',
        KeyA: 'basicAttack',
        KeyS: 'strongAttack',
      }[code];
      const releasedPoint = touches.get(code);
      if (down) {
        const point = mobilePoints[action];
        touches.set(code, {
          ...point,
          id: ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'KeyA', 'KeyS'].indexOf(code) + 1,
        });
      } else touches.delete(code);
      return client.send('Input.dispatchTouchEvent', {
        type: down ? 'touchStart' : 'touchEnd',
        // For a partial release Chrome consumes the removed point, not the
        // fingers that stay held. The telemetry assertion below verifies this.
        touchPoints: down
          ? [...touches.values()]
          : touches.size && releasedPoint
            ? [releasedPoint]
            : [],
      });
    };
    const captures = [];
    const finishCapture = async (name) => {
      const count = await evaluate(
        'globalThis.__motionCapture=false;globalThis.__motionFrames.length',
      );
      const frames = [];
      for (let i = 0; i < count; i++) {
        frames.push(
          JSON.parse(
            await evaluate(
              `JSON.stringify((({png,milliseconds,telemetry})=>({png,milliseconds,telemetry}))(globalThis.__motionFrames[${i}]))`,
            ),
          ),
        );
      }
      if (args.get('actor') === '1') {
        for (let i = 0; i < frames.length; i++) {
          const file = `${name}-${String(i).padStart(2, '0')}.png`;
          writeFileSync(join(output, file), Buffer.from(frames[i].png.split(',')[1], 'base64'));
          try {
            frames[i].actorPng = await evaluate(
              `globalThis.__motionFrames[${i}].actorPng=globalThis.__motionFrames[${i}].actorRender()`,
            );
          } catch (error) {
            writeFileSync(
              join(output, `${name}-actor-failure.json`),
              JSON.stringify(
                {
                  index: i,
                  telemetry: frames[i].telemetry,
                  error: error.message,
                },
                null,
                2,
              ),
            );
            throw error;
          }
        }
      }
      return frames;
    };
    const saveActor = (frame, name) => {
      if (!frame.actorPng) return;
      const file = name.replace(/-(\d+)\.png$/, '-actor-$1.png');
      writeFileSync(join(output, file), Buffer.from(frame.actorPng.split(',')[1], 'base64'));
      captures.push({ file, milliseconds: frame.milliseconds, telemetry: frame.telemetry });
    };
    const capture = async (name, start) => {
      const state = await evaluate(
        `({text:document.querySelector('#app').innerText,telemetry:globalThis.__POLYGON_RPG_INPUT_QA__??null})`,
      );
      const shot = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const file = `${name}.png`;
      writeFileSync(join(output, file), Buffer.from(shot.data, 'base64'));
      captures.push({ file, milliseconds: Date.now() - start, state });
    };
    const makeStrip = async (name) => {
      if (name.endsWith('-actor')) {
        const strip = await evaluate(`(async()=>{
          const fs=globalThis.__motionFrames;
          const images=await Promise.all(fs.map(async f=>{const im=new Image();im.src=f.actorPng;await im.decode();return im}));
          const measure=document.createElement('canvas');measure.width=images[0].width;measure.height=images[0].height;
          const mc=measure.getContext('2d',{willReadFrequently:true});let x0=measure.width,y0=measure.height,x1=0,y1=0;
          for(const im of images){mc.clearRect(0,0,measure.width,measure.height);mc.drawImage(im,0,0);const pixels=mc.getImageData(0,0,measure.width,measure.height).data;for(let y=0;y<measure.height;y++)for(let x=0;x<measure.width;x++)if(pixels[(y*measure.width+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}}
          const crop={x:Math.max(0,x0-8),y:Math.max(0,y0-8),width:x1-x0+17,height:y1-y0+17};
          const c=document.createElement('canvas');c.width=1200;c.height=972;const ctx=c.getContext('2d');ctx.fillStyle='#171b22';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=true;
          const scale=Math.min(300/crop.width,300/crop.height),w=crop.width*scale,h=crop.height*scale;
          for(let i=0;i<12;i++){const index=Math.round(i*(fs.length-1)/11),f=fs[index],dx=(i%4)*300,dy=Math.floor(i/4)*324;ctx.drawImage(images[index],crop.x,crop.y,crop.width,crop.height,dx+(300-w)/2,dy+(300-h)/2,w,h);ctx.fillStyle='white';ctx.font='14px sans-serif';ctx.fillText(Math.round(Math.max(0,f.milliseconds))+' ms · '+f.telemetry.combatMotion.id,dx+8,dy+318)}return c.toDataURL('image/png')
        })()`);
        writeFileSync(
          join(output, `${name}-strip.png`),
          Buffer.from(strip.split(',')[1], 'base64'),
        );
        return;
      }
      const strip = await evaluate(
        `(async()=>{const fs=globalThis.__motionFrames.map(f=>({...f,png:${name.endsWith('-actor') ? 'f.actorPng' : 'f.png'}}));const selected=Array.from({length:12},(_,i)=>fs[Math.round(i*(fs.length-1)/11)]);const c=document.createElement('canvas');c.width=1200;c.height=660;const ctx=c.getContext('2d');ctx.fillStyle='#171b22';ctx.fillRect(0,0,c.width,c.height);for(let i=0;i<selected.length;i++){const f=selected[i];const im=new Image();im.src=f.png;await im.decode();const t=f.telemetry;const p=t?.projection;const scale=p?Math.min(im.width/p.worldWidth,im.height/p.worldHeight)*p.zoom:im.width/960;const z=(t?.artDirection?.cameraZoom??1)*(im.width<=900?(t?.artDirection?.mobileCameraScale??1):1);const focus=im.height*(t?.artDirection?.cameraFocusY??.5);const x=t?(t.player.position.x-480-(t.cameraOffset?.x??0))*scale*z+im.width/2:im.width*.4;const y=t?focus+((t.player.position.y-270-(t.cameraOffset?.y??0))*scale+im.height/2-focus)*z:im.height*.8;const dx=(i%4)*300,dy=Math.floor(i/4)*220;ctx.imageSmoothingEnabled=true;ctx.drawImage(im,x-110,y-105,220,200,dx,dy,300,200);ctx.fillStyle='white';ctx.font='14px sans-serif';ctx.fillText(Math.round(f.milliseconds)+' ms · '+(t?.player.roll?'roll '+t.player.roll.progress.toFixed(2):t.combatMotion.id+'/'+t.combatMotion.phase),dx+8,dy+215)}return c.toDataURL('image/png')})()`,
      );
      writeFileSync(join(output, `${name}-strip.png`), Buffer.from(strip.split(',')[1], 'base64'));
    };
    await capture('start', Date.now());
    if (args.get('idle-only') === '1') {
      await evaluate(
        `globalThis.__motionFrames=[];globalThis.__motionCapture=true;globalThis.__motionStart=performance.now();requestAnimationFrame(function capture(t){if(!globalThis.__motionCapture)return;globalThis.__motionFrames.push({milliseconds:t-globalThis.__motionStart,png:document.querySelector('#game-canvas').toDataURL('image/png'),actorRender:globalThis.__POLYGON_RPG_INPUT_QA_ACTOR_PNG__,telemetry:JSON.parse(JSON.stringify(globalThis.__POLYGON_RPG_INPUT_QA__))});requestAnimationFrame(capture)})`,
      );
      await wait(1500);
      args.set('actor', '1');
      const frames = await finishCapture('idle');
      if (
        frames.some(
          (frame) =>
            frame.telemetry.player.roll ||
            frame.telemetry.input.left ||
            frame.telemetry.input.right ||
            frame.telemetry.combatMotion.id !== 'idle',
        )
      )
        throw new Error('Idle capture must not move or attack');
      for (let i = 0; i < frames.length; i++) {
        const file = 'idle-' + String(i).padStart(2, '0') + '.png';
        writeFileSync(join(output, file), Buffer.from(frames[i].png.split(',')[1], 'base64'));
        saveActor(frames[i], file);
        captures.push({
          file,
          milliseconds: frames[i].milliseconds,
          telemetry: frames[i].telemetry,
        });
      }
      await makeStrip('idle');
      await makeStrip('idle-actor');
      const parity = await evaluate(outlineParityExpression);
      writeFileSync(
        join(output, 'idle-outline-mismatches.png'),
        Buffer.from(parity.overlayPng.split(',')[1], 'base64'),
      );
      delete parity.overlayPng;
      writeFileSync(join(output, 'idle-outline-parity.json'), JSON.stringify(parity, null, 2));
      await capture('idle-end', Date.now());
    }
    for (const direction of args.get('start') || args.get('idle-only') === '1'
      ? []
      : ['right', 'left']) {
      const code = direction === 'right' ? 'ArrowRight' : 'ArrowLeft';
      await key(code, true);
      await wait(100);
      await evaluate(
        `globalThis.__motionFrames=[];globalThis.__motionCapture=true;globalThis.__motionStart=performance.now();requestAnimationFrame(function capture(t){if(!globalThis.__motionCapture)return;globalThis.__motionFrames.push({milliseconds:t-globalThis.__motionStart,png:document.querySelector('#game-canvas').toDataURL('image/png'),actorRender:${args.get('actor') === '1' ? 'globalThis.__POLYGON_RPG_INPUT_QA_ACTOR_PNG__' : 'null'},telemetry:JSON.parse(JSON.stringify(globalThis.__POLYGON_RPG_INPUT_QA__))});requestAnimationFrame(capture)})`,
      );
      await key('ArrowDown', true);
      await wait(80);
      await key('ArrowDown', false);
      await wait(720);
      const frames = await finishCapture(direction);
      if (!frames.some((frame) => frame.telemetry?.player.roll)) {
        throw new Error(`${direction}: actual input did not produce a roll`);
      }
      const afterRoll = frames.slice(
        frames.findLastIndex((frame) => frame.telemetry?.player.roll) + 1,
      );
      const travel =
        ((afterRoll.at(-1)?.telemetry.player.position.x ?? 0) -
          (afterRoll[0]?.telemetry.player.position.x ?? 0)) *
        (direction === 'right' ? 1 : -1);
      if (
        travel < 20 ||
        !afterRoll.every(
          (frame) => frame.telemetry.input[direction] && !frame.telemetry.input.guard,
        )
      ) {
        throw new Error(
          `${direction}: direction must remain held after guard release and resume running`,
        );
      }
      await makeStrip(direction);
      if (args.get('actor') === '1') await makeStrip(direction + '-actor');
      for (let frame = 0; frame < frames.length; frame++) {
        const file = `${direction}-${String(frame).padStart(2, '0')}.png`;
        writeFileSync(join(output, file), Buffer.from(frames[frame].png.split(',')[1], 'base64'));
        saveActor(frames[frame], file);
        captures.push({
          file,
          milliseconds: frames[frame].milliseconds,
          telemetry: frames[frame].telemetry,
        });
      }
      await key(code, false);
      await wait(1200);
    }
    if (args.get('motions') === '1') {
      for (const motion of ['idle', 'run', 'guard', 'slash', 'heavy', 'air']) {
        await evaluate(
          `globalThis.__motionFrames=[];globalThis.__motionCapture=true;globalThis.__motionStart=performance.now();requestAnimationFrame(function capture(t){if(!globalThis.__motionCapture)return;globalThis.__motionFrames.push({milliseconds:t-globalThis.__motionStart,png:document.querySelector('#game-canvas').toDataURL('image/png'),actorRender:${args.get('actor') === '1' ? 'globalThis.__POLYGON_RPG_INPUT_QA_ACTOR_PNG__' : 'null'},telemetry:JSON.parse(JSON.stringify(globalThis.__POLYGON_RPG_INPUT_QA__))});requestAnimationFrame(capture)})`,
        );
        if (motion === 'idle') await wait(450);
        else if (motion === 'air') {
          await key('ArrowUp', true);
          await wait(70);
          await key('ArrowUp', false);
          await wait(220);
          await key('KeyA', true);
          await wait(70);
          await key('KeyA', false);
          await wait(650);
        } else {
          const code = { run: 'ArrowRight', guard: 'ArrowDown', slash: 'KeyA', heavy: 'KeyS' }[
            motion
          ];
          await key(code, true);
          await wait(['run', 'guard'].includes(motion) ? 450 : 70);
          await key(code, false);
          await wait(650);
        }
        const frames = await finishCapture(motion);
        await makeStrip(motion);
        if (args.get('actor') === '1') await makeStrip(`${motion}-actor`);
        for (let i = 0; i < frames.length; i++) {
          const file = `${motion}-${String(i).padStart(2, '0')}.png`;
          writeFileSync(join(output, file), Buffer.from(frames[i].png.split(',')[1], 'base64'));
          saveActor(frames[i], file);
          captures.push({
            file,
            milliseconds: frames[i].milliseconds,
            telemetry: frames[i].telemetry,
          });
        }
        await wait(500);
      }
    }
    if (args.get('journey') === '1' || args.get('start')) {
      const moveTo = async (x) => {
        const current = await evaluate('globalThis.__POLYGON_RPG_INPUT_QA__.player.position.x');
        if (Math.abs(current - x) < 12) return;
        const code = current < x ? 'ArrowRight' : 'ArrowLeft';
        await key(code, true);
        for (let step = 0; step < 100; step++) {
          const now = await evaluate('globalThis.__POLYGON_RPG_INPUT_QA__.player.position.x');
          if (Math.abs(now - x) < 12 || (current < x ? now > x : now < x)) break;
          await wait(30);
        }
        await key(code, false);
      };
      const talk = async () => {
        for (let i = 0; i < 8; i++) {
          await key('ArrowUp', true);
          await wait(80);
          await key('ArrowUp', false);
          await wait(260);
        }
      };
      if (args.get('journey') === '1') {
        await moveTo(250);
        await talk();
        await capture('owner-after', Date.now());
        await moveTo(405);
        await talk();
        await capture('rival-after', Date.now());
      }
      if (args.get('facing') === 'left' && !args.get('start')) {
        if (!args.get('start')) await moveTo(480);
        await key('ArrowRight', true);
        await key('ArrowDown', true);
        await wait(80);
        await key('ArrowDown', false);
        await wait(350);
        await key('ArrowRight', false);
      }
      const initialX = await evaluate('globalThis.__POLYGON_RPG_INPUT_QA__.player.position.x');
      await moveTo(
        Number(
          args.get('attack-x') ??
            (args.get('start') ? initialX + Number(args.get('offset') ?? 0) : 530),
        ),
      );
      if (args.get('facing') === 'left') {
        await key('ArrowLeft', true);
        await wait(60);
        await key('ArrowLeft', false);
        // The input adapter commits direction on the following fixed simulation
        // step. Give the real keyboard event that step before A/S starts, so a
        // left-facing capture cannot accidentally sample the previous right pose.
        await wait(40);
      }
      await capture('collector-before', Date.now());
      await evaluate(
        `globalThis.__motionFrames=[];globalThis.__motionCapture=true;globalThis.__motionStart=performance.now();requestAnimationFrame(function capture(t){if(!globalThis.__motionCapture)return;globalThis.__motionFrames.push({milliseconds:t-globalThis.__motionStart,png:document.querySelector('#game-canvas').toDataURL('image/png'),actorRender:${args.get('actor') === '1' ? 'globalThis.__POLYGON_RPG_INPUT_QA_ACTOR_PNG__' : 'null'},telemetry:JSON.parse(JSON.stringify(globalThis.__POLYGON_RPG_INPUT_QA__))});requestAnimationFrame(capture)})`,
      );
      const holdLeftThroughAirAttack = args.get('facing') === 'left' && args.get('air') === '1';
      if (holdLeftThroughAirAttack) await key('ArrowLeft', true);
      if (args.get('air') === '1') {
        await key('ArrowUp', true);
        await wait(70);
        await key('ArrowUp', false);
        if (args.get('air-falling') === '1') {
          let previousY = Infinity;
          let found = false;
          for (let i = 0; i < 80; i++) {
            const player = await evaluate('globalThis.__POLYGON_RPG_INPUT_QA__.player');
            if (!player.isGrounded && player.position.y > previousY && player.position.y >= 265) {
              found = true;
              break;
            }
            previousY = player.position.y;
            await wait(10);
          }
          if (!found)
            throw new Error('Normal jump did not reach the observed falling attack position');
        } else await wait(Number(args.get('air-delay') ?? 350));
      }
      const attackKey = args.get('attack') === 'strong' ? 'KeyS' : 'KeyA';
      await key(attackKey, true);
      await wait(70);
      await key(attackKey, false);
      if (holdLeftThroughAirAttack) await key('ArrowLeft', false);
      for (let tap = 1; tap < Number(args.get('taps') ?? 1); tap++) {
        await wait(430);
        await key(attackKey, true);
        await wait(70);
        await key(attackKey, false);
      }
      if (args.get('air-combo') === '1') {
        await wait(180);
        await key('ArrowUp', true);
        await wait(70);
        await key('ArrowUp', false);
        await wait(40);
        await key('KeyA', true);
        await wait(70);
        await key('KeyA', false);
      }
      await wait(850);
      const frames = await finishCapture('attack');
      await makeStrip('attack');
      if (args.get('actor') === '1') await makeStrip('attack-actor');
      for (let i = 0; i < frames.length; i++) {
        const file = `attack-${String(i).padStart(2, '0')}.png`;
        writeFileSync(join(output, file), Buffer.from(frames[i].png.split(',')[1], 'base64'));
        saveActor(frames[i], file);
        captures.push({
          file,
          milliseconds: frames[i].milliseconds,
          telemetry: frames[i].telemetry,
        });
      }
      await capture('collector-after', Date.now());
    }
    writeFileSync(
      join(output, 'evidence.json'),
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          renderer: args.get('renderer') ?? 'polygon',
          input: mobile ? 'touch' : 'keyboard',
          scenario: args.get('start') ?? 'fresh-game',
          width,
          height,
          captures,
          events: client.events.filter((e) => e.method === 'Runtime.exceptionThrown'),
        },
        null,
        2,
      ),
    );
    writeFileSync(
      join(output, 'index.html'),
      `<!doctype html><meta charset="utf-8"><title>Normal input real time motion</title><style>body{background:#161b20;color:white;font:14px sans-serif}section{display:flex;overflow:auto}figure{margin:4px}img{width:640px}small{display:block}</style><h1>${width} × ${height} normal speed keyboard roll → run</h1><p>Each timestamp is actual wall clock elapsed time; renderer was never paused or directly posed.</p>${[
        'right',
        'left',
      ]
        .map(
          (d) =>
            `<h2>${d}</h2><section>${captures
              .filter((c) => c.file.startsWith(d))
              .map(
                (c) => `<figure><img src="${c.file}"><small>${c.milliseconds} ms</small></figure>`,
              )
              .join('')}</section>`,
        )
        .join('')}`,
    );
    writeEvidenceTimeline(output, captures, {
      title: `${width} × ${height} actual ${mobile ? 'touch' : 'keyboard'} input`,
    });
    if (!['1', 'true'].includes(args.get('skip-timeline-preview'))) {
      await client.send('Page.navigate', {
        url: pathToFileURL(join(output, 'timeline.html')).href,
      });
      await wait(1200);
      const timelineStatus = await evaluate("document.querySelector('#status')?.textContent");
      if (!timelineStatus) throw new Error('Captured-frame timeline did not initialize');
      const preview = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      writeFileSync(join(output, 'timeline-preview.png'), Buffer.from(preview.data, 'base64'));
    }
    process.stdout.write(`${JSON.stringify({ output, captures: captures.length })}\n`);
  } finally {
    if (client) {
      try {
        await client.send('Browser.close');
      } catch {
        // A crashed page may have already closed its debugging connection.
      }
      client.close();
    }
    if (!(await waitForProcessExit(browser))) browser.kill();
    await closeServer(server);
    await removeDirectoryWithRetry(profile);
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
