import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './serve.mjs';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = path.join(root, 'artifacts', 'pwa-update');
fs.mkdirSync(output, { recursive: true });
const workspace = fs.mkdtempSync(path.join(output, 'releases-'));
const baselineOnly = process.argv.includes('--baseline-only');
const migrationOnly = process.argv.includes('--migration-only');
const diagnoseUnregister = process.argv.includes('--diagnose-unregister');
const restartRecovery = process.argv.includes('--restart-recovery');
const saveResetOnly = process.argv.includes('--save-reset-only');
const fixedOnly =
  saveResetOnly ||
  process.argv.includes('--fixed-only') ||
  !(baselineOnly || migrationOnly || diagnoseUnregister || restartRecovery);
const evidence = { startedAt: new Date().toISOString(), baseline: null, checks: [] };
const deployPaths = [
  'index.html',
  'offline.html',
  'manifest.webmanifest',
  'sw.js',
  'src',
  'public',
];
const shell = `Alpine.$data(document.querySelector('#app'))`;
const ready = `globalThis.Alpine && document.querySelector('#app')?._x_dataStack && !document.querySelector('#app').hasAttribute('x-cloak')`;
const pwaState = `JSON.parse(JSON.stringify(${shell}.pwa))`;
const storageState = `Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('polygon-rpg.progression.')).sort(([a],[b])=>a.localeCompare(b)))`;

function metadata(directory) {
  const context = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(directory, 'public/release-metadata.js'), 'utf8'),
    context,
  );
  return JSON.parse(JSON.stringify(context.POLYGON_RPG_RELEASE));
}

function digest(directory) {
  const hash = crypto.createHash('sha256');
  const walk = (relative) => {
    const absolute = path.join(directory, relative);
    if (fs.statSync(absolute).isDirectory()) {
      for (const entry of fs.readdirSync(absolute).sort()) walk(path.join(relative, entry));
    } else hash.update(relative).update(fs.readFileSync(absolute));
  };
  for (const entry of deployPaths) walk(entry);
  return hash.digest('hex');
}

function copyCurrentRelease(label, version) {
  const directory = path.join(workspace, label);
  fs.mkdirSync(directory, { recursive: true });
  for (const relative of [...deployPaths, 'package.json'])
    fs.cpSync(path.join(root, relative), path.join(directory, relative), { recursive: true });
  const packageFile = path.join(directory, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(packageFile, JSON.stringify(packageJson));
  fs.appendFileSync(
    path.join(directory, 'src/main.js'),
    `\nglobalThis.PWA_QA_RELEASE_MARKER = ${JSON.stringify(label)};\ndocument.querySelector('#game-title').dataset.qaRelease = ${JSON.stringify(label)};\n`,
  );
  fs.mkdirSync(path.join(directory, 'scripts'), { recursive: true });
  fs.copyFileSync(
    path.join(root, 'scripts/generate-release-metadata.mjs'),
    path.join(directory, 'scripts/generate-release-metadata.mjs'),
  );
  execFileSync(process.execPath, ['scripts/generate-release-metadata.mjs'], { cwd: directory });
  return { directory, ...metadata(directory) };
}

function switchingServer(initialRoot) {
  let activeRoot = initialRoot;
  let failurePath = null;
  let staleAsset = null;
  let offline = false;
  const requests = [];
  const handlers = new Map();
  return {
    requests,
    switchTo(directory, fail = null) {
      activeRoot = directory;
      failurePath = fail;
      staleAsset = null;
    },
    stale(directory, pathname) {
      staleAsset = { directory, pathname };
    },
    offline(value) {
      offline = value;
    },
    factory() {
      return http.createServer((request, response) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        const requestRecord = {
          pathname,
          url: request.url,
          release: path.basename(activeRoot),
          at: Date.now(),
          failed: offline || pathname === failurePath,
        };
        requests.push(requestRecord);
        response.on('finish', () => {
          requestRecord.status = response.statusCode;
          requestRecord.finishedAt = Date.now();
        });
        if (offline) {
          request.socket.destroy();
          return;
        }
        if (pathname === failurePath) {
          response.writeHead(503, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
          response.end('Intentionally unavailable release asset');
          return;
        }
        if (pathname === staleAsset?.pathname) {
          const content = fs.readFileSync(path.join(staleAsset.directory, pathname));
          response.writeHead(200, {
            'Content-Type': 'text/javascript',
            'Cache-Control': 'no-store',
          });
          response.end(content);
          requestRecord.stale = true;
          return;
        }
        if (!handlers.has(activeRoot))
          handlers.set(
            activeRoot,
            createStaticServer({ rootPath: activeRoot }).listeners('request')[0],
          );
        handlers.get(activeRoot)(request, response);
      });
    },
  };
}

async function workerState(browser) {
  return browser.evaluate(`(async()=>{
    const registration=await navigator.serviceWorker.getRegistration();
    const read=worker=>new Promise(resolve=>{
      if(!worker)return resolve(null);
      const channel=new MessageChannel();
      const timer=setTimeout(()=>resolve({state:worker.state,scriptURL:worker.scriptURL,timeout:true}),2000);
      channel.port1.onmessage=event=>{clearTimeout(timer);resolve({state:worker.state,scriptURL:worker.scriptURL,release:event.data.release});channel.port1.close();};
      worker.postMessage({type:'GET_RELEASE_METADATA'},[channel.port2]);
    });
    return {scope:registration?.scope??null,controller:await read(navigator.serviceWorker.controller),active:await read(registration?.active),waiting:await read(registration?.waiting),installing:registration?.installing?.state??null,installingWorker:await read(registration?.installing),caches:await caches.keys()};
  })()`);
}

async function record(browser, name, details = {}) {
  const result = {
    name,
    ...details,
    state: await browser.evaluate(pwaState),
    worker: await workerState(browser),
    storage: await browser.evaluate(storageState),
    marker: await browser.evaluate('globalThis.PWA_QA_RELEASE_MARKER??null'),
  };
  evidence.checks.push(result);
  await browser.screenshot(path.join(output, `${name}.png`));
  console.log(`${name}: recorded`);
  return result;
}

async function installReady(browser, timeout = 45000) {
  await browser.until(ready);
  try {
    await browser.until(
      `navigator.serviceWorker.controller && navigator.serviceWorker.controller.state === 'activated'`,
      timeout,
    );
  } catch (error) {
    evidence.installFailure = {
      state: await browser.evaluate(pwaState),
      workers: await workerState(browser),
      events: browser.events.slice(-30),
    };
    console.log(`Native install did not finish: ${evidence.installFailure.state.status}`);
    throw error;
  }
  await wait(350);
}

async function baseline() {
  const directory = path.join(workspace, 'published-cddcc10');
  fs.mkdirSync(directory, { recursive: true });
  const files = execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', 'cddcc10', '--', ...deployPaths],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split(/\r?\n/);
  for (const relative of files) {
    fs.mkdirSync(path.dirname(path.join(directory, relative)), { recursive: true });
    fs.writeFileSync(
      path.join(directory, relative),
      execFileSync('git', ['show', `cddcc10:${relative}`], {
        cwd: root,
        maxBuffer: 8 * 1024 * 1024,
      }),
    );
  }
  const next = path.join(workspace, 'published-next');
  fs.cpSync(directory, next, { recursive: true });
  const initial = metadata(directory);
  const nextMetadata = { ...initial, appVersion: '0.2.900', buildId: 'baseline-next' };
  fs.writeFileSync(
    path.join(next, 'public/release-metadata.js'),
    `globalThis.POLYGON_RPG_RELEASE=Object.freeze(${JSON.stringify(nextMetadata)});`,
  );
  const server = switchingServer(directory);
  const persistentProfile = restartRecovery
    ? fs.mkdtempSync(path.join(workspace, 'restart-profile-'))
    : null;
  let browser = await openQaBrowser({
    width: 844,
    height: 390,
    serverFactory: () => server.factory(),
    profileRoot: workspace,
    profileDirectory: persistentProfile,
  });
  try {
    console.log('Published baseline: loading native SW install');
    try {
      await installReady(browser, 15000);
    } catch (error) {
      const observed = await workerState(browser);
      if (observed.active || observed.installing !== 'installing') throw error;
      await record(browser, 'baseline-install-stalled', { observationWindowMs: 15000 });
      evidence.baseline = {
        ref: 'cddcc10',
        reproduced: true,
        firstInstallStalled: true,
        firstInstallFalseRestart:
          'not reached because published native install stalls before activation',
        installObservation: evidence.installFailure,
      };
      delete evidence.installFailure;
      if (restartRecovery) {
        const originalBrowser = browser;
        browser = null;
        await recoverAfterBrowserRestart(originalBrowser, server, persistentProfile);
      } else if (diagnoseUnregister) await diagnoseStalledInstallerRecovery(browser, server);
      else if (!baselineOnly) await migrateStalledInstaller(browser, server);
      return;
    }
    const initialRecord = await record(browser, 'baseline-initial-install');
    assert.equal(initialRecord.state.currentBuildId, initial.buildId);
    assert.equal(
      initialRecord.state.restartRequired,
      true,
      'Published first installation must reproduce the false restart diagnosis',
    );
    server.switchTo(next);
    await browser.evaluate(
      `(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()})()`,
    );
    await browser.until(
      `${shell}.pwa.updateReady && ${shell}.pwa.availableBuildId === 'baseline-next'`,
      45000,
    );
    const waitingRecord = await record(browser, 'baseline-update-hidden');
    const visible = await browser.evaluate(
      `document.querySelector('.menu-button--update').checkVisibility()`,
    );
    assert.equal(waitingRecord.worker.waiting.release.buildId, 'baseline-next');
    assert.equal(
      visible,
      false,
      'Published first-install false restart must hide the real B apply button',
    );
    evidence.baseline = {
      ref: 'cddcc10',
      reproduced: true,
      firstInstallFalseRestart: true,
      genuineWaitingApplyButtonHidden: true,
    };
  } finally {
    evidence.baselineNetwork = server.requests;
    await browser?.close();
  }
}

async function migrateStalledInstaller(browser, server) {
  const sourceDigest = digest(root);
  const next = copyCurrentRelease('migration-b', '0.2.904');
  evidence.migrationSourceDigest = sourceDigest;
  evidence.migrationRelease = next;
  await seedProgress(browser);
  const preserved = await browser.evaluate(storageState);
  // Observe real native register calls without changing their arguments or result.
  await browser.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `globalThis.PWA_QA_REGISTER_CALLS=[];
      const nativeRegister=ServiceWorkerContainer.prototype.register;
      ServiceWorkerContainer.prototype.register=function(...args){
        const entry={args,at:Date.now()};PWA_QA_REGISTER_CALLS.push(entry);
        return nativeRegister.apply(this,args).then(registration=>{
          entry.resolvedAt=Date.now();entry.scope=registration.scope;
          entry.installing=registration.installing?.scriptURL??null;
          entry.active=registration.active?.scriptURL??null;
          return registration;
        },error=>{entry.error=error.message;throw error;});
      };`,
  });
  const networkStart = server.requests.length;
  server.switchTo(next.directory);
  const reloadedAt = Date.now();
  await browser.send('Page.reload');
  await browser.until(`${ready} && globalThis.PWA_QA_RELEASE_MARKER === 'migration-b'`);
  try {
    await installReady(browser, 18000);
    const result = await record(browser, 'published-stall-to-fixed-reload', {
      elapsedMs: Date.now() - reloadedAt,
    });
    assert.equal(result.state.currentBuildId, next.buildId);
    assert.equal(result.worker.active.release.buildId, next.buildId);
    assert.equal(result.state.restartRequired, false);
    assert.deepEqual(result.storage, preserved);
    assert.equal(digest(root), sourceDigest, 'Source changed during migration verification');
    evidence.migrationVerified = true;
  } catch (error) {
    evidence.migrationVerified = false;
    await record(browser, 'published-stall-to-fixed-failed', {
      elapsedMs: Date.now() - reloadedAt,
    });
    throw error;
  } finally {
    evidence.migrationRegisterCalls = await browser.evaluate('PWA_QA_REGISTER_CALLS');
    evidence.migrationNetwork = server.requests.slice(networkStart);
  }
}

async function recoverAfterBrowserRestart(originalBrowser, server, profileDirectory) {
  let originalClosed = false;
  let reopened;
  const origin = originalBrowser.origin;
  const port = Number(new URL(origin).port);
  try {
    try {
      await migrateStalledInstaller(originalBrowser, server);
      throw new Error('Expected the separately documented no-restart legacy installer limitation');
    } catch (error) {
      if (evidence.migrationVerified !== false) throw error;
      const stranded = await workerState(originalBrowser);
      assert.equal(stranded.active, null);
      assert.equal(stranded.waiting, null);
      assert.equal(stranded.controller, null);
      assert.equal(stranded.installingWorker.release.buildId, 'c269517ee499');
      assert.ok(evidence.migrationRegisterCalls.length > 0);
      evidence.noRestartMigrationVerified = false;
      evidence.noRestartFailure = evidence.installFailure;
      delete evidence.installFailure;
    }
    const preserved = await originalBrowser.evaluate(storageState);
    const previousCaches = (await workerState(originalBrowser)).caches;
    const startedAt = Date.now();
    await originalBrowser.close({ graceful: true });
    originalClosed = true;
    assert.ok(
      fs.existsSync(profileDirectory),
      'Caller-owned Chrome profile must survive browser shutdown',
    );
    reopened = await openQaBrowser({
      width: 844,
      height: 390,
      profileDirectory,
      port,
      serverFactory: () => server.factory(),
    });
    assert.equal(reopened.origin, origin);
    await installReady(reopened, 18000);
    const result = await record(reopened, 'browser-restart-recovers-legacy-installer', {
      elapsedMs: Date.now() - startedAt,
      originalOrigin: origin,
      reopenedOrigin: reopened.origin,
      profileDirectory,
      previousCaches,
      shutdown:
        'Browser.close followed by owned Chrome process exit; no forced process termination',
    });
    assert.equal(result.state.currentBuildId, evidence.migrationRelease.buildId);
    assert.equal(result.worker.active.release.buildId, evidence.migrationRelease.buildId);
    assert.equal(result.state.restartRequired, false);
    assert.deepEqual(result.storage, preserved);
    assert.ok(
      result.worker.caches.includes('polygon-rpg-release-c269517ee499'),
      'Browser shutdown must not delete pre-existing CacheStorage',
    );
    server.offline(true);
    await reopened.send('Network.enable');
    await reopened.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await reopened.navigate('?restart-recovery-offline=1');
    await installReady(reopened);
    const offline = await record(reopened, 'browser-restart-recovery-offline');
    assert.equal(offline.marker, 'migration-b');
    assert.equal(offline.state.currentBuildId, evidence.migrationRelease.buildId);
    assert.deepEqual(offline.storage, preserved);
    assert.equal(
      digest(root),
      evidence.migrationSourceDigest,
      'Source changed during restart recovery verification',
    );
    evidence.restartRecoveryVerified = true;
    evidence.restartRecoveryRequires =
      'Completely terminate the app/browser process, then reopen it. A page reload or leaving the scope is insufficient for the stranded legacy install job.';
    evidence.restartRecoveryStoredBytes = Object.fromEntries(
      Object.entries(preserved).map(([key, value]) => [key, Buffer.byteLength(value)]),
    );
  } finally {
    if (reopened) await reopened.close();
    if (!originalClosed) await originalBrowser.close();
  }
}

async function diagnoseStalledInstallerRecovery(browser, server) {
  evidence.diagnosticOnly = true;
  const next = copyCurrentRelease('diagnostic-recovery-b', '0.2.905');
  evidence.diagnosticRelease = next;
  await seedProgress(browser);
  const preserved = await browser.evaluate(storageState);
  const initial = await workerState(browser);
  assert.equal(initial.controller, null);
  assert.equal(initial.active, null);
  assert.equal(initial.waiting, null);
  assert.equal(initial.installingWorker.release.buildId, 'c269517ee499');
  server.switchTo(next.directory);
  const startedAt = Date.now();
  const bounded = async (expression, timeout = 8000) => {
    try {
      await browser.until(expression, timeout);
      return true;
    } catch {
      return false;
    }
  };
  // Explicitly approved diagnostic, only in this test's private profile without a usable worker.
  // CacheStorage and localStorage are never deleted, and this is not a production recovery action.
  await browser.evaluate(`(async()=>{
    const registration=await navigator.serviceWorker.getRegistration();
    if(!registration?.installing || registration.active || registration.waiting || navigator.serviceWorker.controller)
      throw new Error('Diagnostic unregister is forbidden while a usable worker exists');
    globalThis.PWA_QA_RECOVERY_DIAGNOSTIC={unregister:{state:'pending',at:Date.now()}};
    registration.unregister().then(value=>{
      Object.assign(PWA_QA_RECOVERY_DIAGNOSTIC.unregister,{state:'resolved',value,finishedAt:Date.now()});
    },error=>{Object.assign(PWA_QA_RECOVERY_DIAGNOSTIC.unregister,{state:'rejected',error:error.message});});
  })()`);
  await bounded(`PWA_QA_RECOVERY_DIAGNOSTIC.unregister.state !== 'pending'`);
  evidence.unregisterObservation = {
    elapsedMs: Date.now() - startedAt,
    operation: await browser.evaluate('PWA_QA_RECOVERY_DIAGNOSTIC'),
    worker: await workerState(browser),
  };
  await browser.evaluate(`(()=>{
    PWA_QA_RECOVERY_DIAGNOSTIC.register={state:'pending',at:Date.now(),buildId:${JSON.stringify(next.buildId)}};
    navigator.serviceWorker.register('./sw.js?build='+${JSON.stringify(next.buildId)},{scope:'./',updateViaCache:'none'}).then(registration=>{
      Object.assign(PWA_QA_RECOVERY_DIAGNOSTIC.register,{state:'resolved',finishedAt:Date.now(),installing:registration.installing?.scriptURL??null,active:registration.active?.scriptURL??null});
    },error=>{Object.assign(PWA_QA_RECOVERY_DIAGNOSTIC.register,{state:'rejected',error:error.message});});
  })()`);
  const recoveredByUnregister = await bounded(
    `navigator.serviceWorker.controller?.state === 'activated'`,
  );
  evidence.unregisterRecovery = {
    recovered: recoveredByUnregister,
    elapsedMs: Date.now() - startedAt,
    operation: await browser.evaluate('PWA_QA_RECOVERY_DIAGNOSTIC'),
    worker: await workerState(browser),
  };
  assert.deepEqual(await browser.evaluate(storageState), preserved);
  if (recoveredByUnregister) {
    await browser.send('Page.reload');
    await browser.until(`${ready} && PWA_QA_RELEASE_MARKER === 'diagnostic-recovery-b'`);
    await record(browser, 'diagnostic-unregister-recovered');
    assert.deepEqual(await browser.evaluate(storageState), preserved);
    return;
  }
  await record(browser, 'diagnostic-unregister-still-stalled');
  const scopeTargets = (await browser.send('Target.getTargets')).targetInfos.filter(
    (target) => target.type === 'page' && target.url.startsWith(browser.origin),
  );
  assert.equal(
    scopeTargets.length,
    1,
    'This private diagnostic profile must have only the owned scope page',
  );
  const emptiedAt = Date.now();
  await browser.send('Page.navigate', { url: 'about:blank' });
  await wait(1500);
  const remainingScopePages = (await browser.send('Target.getTargets')).targetInfos.filter(
    (target) => target.type === 'page' && target.url.startsWith(browser.origin),
  );
  assert.equal(remainingScopePages.length, 0);
  await browser.navigate('');
  await browser.until(`${ready} && PWA_QA_RELEASE_MARKER === 'diagnostic-recovery-b'`);
  const recoveredWithNoClients = await bounded(
    `navigator.serviceWorker.controller?.state === 'activated'`,
    10000,
  );
  evidence.emptyClientsRecovery = {
    recovered: recoveredWithNoClients,
    elapsedMs: Date.now() - emptiedAt,
    noScopePageIntervalMs: 1500,
    worker: await workerState(browser),
  };
  await record(
    browser,
    recoveredWithNoClients
      ? 'diagnostic-empty-clients-recovered'
      : 'diagnostic-empty-clients-still-stalled',
  );
  assert.deepEqual(await browser.evaluate(storageState), preserved);
  evidence.diagnosticStoredBytes = Object.fromEntries(
    Object.entries(preserved).map(([key, value]) => [key, Buffer.byteLength(value)]),
  );
  evidence.diagnosticNetwork = server.requests;
}

async function seedProgress(browser) {
  return browser.evaluate(`(async()=>{
    const [{createProgressionSnapshot,mergeProgressionSnapshot,awardTrainingMarks},{ProgressionStorage},{EQUIPMENT_CATALOG},{ENCHANTMENT_CATALOG},{COMBAT_PROGRESSION_PROFILE},{SCRAP_CAMPAIGN_PROFILE},{createInitialMorningRecoveryRequest}]=await Promise.all([
      import('./src/game/progression/ProgressionState.js'),import('./src/game/progression/ProgressionStorage.js'),import('./src/game/equipment/EquipmentProfiles.js'),import('./src/game/enchantment/EnchantmentCatalog.js'),import('./src/game/progression/ProgressionProfiles.js'),import('./src/game/campaign/ScrapCampaignProfiles.js'),import('./src/game/progression/CampaignRecoveryPolicy.js')]);
    const storage=new ProgressionStorage(localStorage,'polygon-rpg.progression.v1',ENCHANTMENT_CATALOG,COMBAT_PROGRESSION_PROFILE.weaponForge,SCRAP_CAMPAIGN_PROFILE);
    const fresh=createProgressionSnapshot(EQUIPMENT_CATALOG.defaultProfileId,ENCHANTMENT_CATALOG,SCRAP_CAMPAIGN_PROFILE);
    const snapshot=awardTrainingMarks(mergeProgressionSnapshot(fresh,{gold:137,viewedConversationIds:['pwa-qa-progress']}),3).snapshot;
    const saved=storage.save(snapshot);
    if(!saved.ok)throw new Error(JSON.stringify(saved));
    const request=createInitialMorningRecoveryRequest(snapshot,SCRAP_CAMPAIGN_PROFILE);
    const recovery=storage.saveRecoverySlot(request.slotId,request.snapshot,request.metadata);
    if(!recovery.ok)throw new Error(JSON.stringify(recovery));
    return {snapshot,saved,recovery};
  })()`);
}

async function secondTab(browser) {
  const { targetId } = await browser.send('Target.createTarget', { url: browser.origin });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: false });
  let sequence = 0;
  const send = async (method, params = {}) => {
    const id = ++sequence;
    await browser.send('Target.sendMessageToTarget', {
      sessionId,
      message: JSON.stringify({ id, method, params }),
    });
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const entry = browser.events.find(
        (event) =>
          event.method === 'Target.receivedMessageFromTarget' &&
          event.params.sessionId === sessionId &&
          JSON.parse(event.params.message).id === id,
      );
      if (entry) {
        const result = JSON.parse(entry.params.message);
        if (result.error) throw new Error(JSON.stringify(result.error));
        return result.result;
      }
      await wait(20);
    }
    throw new Error(`Second tab CDP timeout: ${method}`);
  };
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
  const until = async (expression) => {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      if (await evaluate(expression)) return;
      await wait(100);
    }
    throw new Error(`Second tab condition timeout: ${expression}`);
  };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 844,
    height: 390,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await until(ready);
  return {
    targetId,
    evaluate,
    until,
    click: async (selector) => {
      const point = await evaluate(`(()=>{
        const node=document.querySelector(${JSON.stringify(selector)});
        node.scrollIntoView({block:'center',inline:'nearest'});
        const rect=node.getBoundingClientRect();
        return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};
      })()`);
      for (const type of ['mousePressed', 'mouseReleased'])
        await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
    },
    screenshot: async (file) => {
      const result = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
    },
    close: () => browser.send('Target.closeTarget', { targetId }),
  };
}

async function fixedFlow() {
  const sourceDigest = digest(root);
  const a = copyCurrentRelease('release-a', '0.2.901');
  const b = copyCurrentRelease('release-b', '0.2.902');
  const c = copyCurrentRelease('release-c', '0.2.903');
  evidence.sourceDigest = sourceDigest;
  evidence.releases = { a, b, c };
  const server = switchingServer(a.directory);
  const browser = await openQaBrowser({
    width: 844,
    height: 390,
    serverFactory: () => server.factory(),
    profileRoot: workspace,
  });
  let other;
  try {
    await installReady(browser);
    let current = await record(browser, 'fixed-initial-install');
    assert.equal(current.state.restartRequired, false);
    assert.equal(current.state.updateReady, false);
    assert.equal(current.state.currentBuildId, a.buildId);
    await seedProgress(browser);
    await browser.navigate('');
    await installReady(browser);
    const preserved = await browser.evaluate(storageState);
    const progression = JSON.parse(preserved['polygon-rpg.progression.v1']);
    assert.equal(progression.gold, 137);
    assert.equal(progression.trainingMarks, 3);
    assert.deepEqual(progression.viewedConversationIds, ['pwa-qa-progress']);
    assert.ok(preserved['polygon-rpg.progression.v1.recovery.v1']);
    server.offline(true);
    await browser.send('Network.enable');
    await browser.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await browser.navigate('');
    await installReady(browser);
    current = await record(browser, 'release-a-offline');
    assert.equal(current.marker, 'release-a');
    assert.deepEqual(current.storage, preserved);
    server.offline(false);
    await browser.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await browser.until(`!${shell}.pwa.updateChecking`);
    server.switchTo(b.directory, '/src/game/progression/ProgressionState.js');
    const brokenStart = server.requests.length;
    await browser.click('#pwa-check-update-control', true);
    await browser.until(`${shell}.pwa.updateError`);
    current = await record(browser, 'failed-install-keeps-a');
    assert.ok(server.requests.slice(brokenStart).some((request) => request.failed));
    assert.equal(current.worker.active.release.buildId, a.buildId);
    assert.equal(current.worker.waiting, null);
    assert.equal(current.state.updateReady, false);
    assert.equal(current.marker, 'release-a');
    assert.deepEqual(current.storage, preserved);
    other = await secondTab(browser);
    await other.until(`!${shell}.pwa.updateChecking`);
    await browser.until(`!${shell}.pwa.updateChecking`);
    await other.click('#menu-start-control');
    await other.until(`${shell}.screen === 'game' && ${shell}.isPlaying`);
    await other.screenshot(path.join(output, 'second-tab-game-a-before.png'));
    // A real tab activation changes document visibility; no fake SW events are injected.
    await browser.send('Target.activateTarget', { targetId: other.targetId });
    const backgroundVisibility = await browser.evaluate('document.visibilityState');
    assert.equal(backgroundVisibility, 'hidden');
    // Let the normal short debounce elapse before returning, with both startup checks finished.
    await wait(1100);
    server.switchTo(b.directory);
    const foregroundStartedAt = Date.now();
    await browser.send('Page.bringToFront');
    assert.equal(await browser.evaluate('document.visibilityState'), 'visible');
    await browser.until(
      `${shell}.pwa.updateReady && ${shell}.pwa.availableBuildId === ${JSON.stringify(b.buildId)}`,
      45000,
    );
    current = await record(browser, 'foreground-detects-b', {
      backgroundVisibility,
      foregroundVisibility: 'visible',
      discoveryMs: Date.now() - foregroundStartedAt,
    });
    assert.equal(current.state.currentBuildId, a.buildId);
    assert.equal(current.state.restartRequired, false);
    assert.equal(current.marker, 'release-a');
    assert.equal(current.worker.active.release.buildId, a.buildId);
    assert.equal(current.worker.waiting.release.buildId, b.buildId);
    assert.deepEqual(current.storage, preserved);
    assert.equal(
      await browser.evaluate(`document.querySelector('.menu-button--update').checkVisibility()`),
      true,
    );
    await browser.evaluate(`globalThis.PWA_QA_ORIGINAL_SET_ITEM=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key.startsWith('polygon-rpg.progression.'))throw new DOMException('Quota denied for update-save verification','QuotaExceededError');
        return PWA_QA_ORIGINAL_SET_ITEM.call(this,key,value);
      }`);
    try {
      await browser.click('.menu-button--update', true);
      await wait(250);
      current = await record(browser, 'save-failure-blocks-activation');
      assert.equal(current.worker.active.release.buildId, a.buildId);
      assert.equal(current.worker.waiting.release.buildId, b.buildId);
      assert.equal(current.marker, 'release-a');
      assert.match(current.state.status, /저장/);
      assert.deepEqual(current.storage, preserved);
    } finally {
      await browser.evaluate(
        'Storage.prototype.setItem=PWA_QA_ORIGINAL_SET_ITEM;delete globalThis.PWA_QA_ORIGINAL_SET_ITEM',
      );
    }
    const reloadEvents = browser.events.length;
    await browser.click('.menu-button--update', true);
    await browser.until(`${ready} && ${shell}.pwa.currentBuildId === ${JSON.stringify(b.buildId)}`);
    await installReady(browser);
    current = await record(browser, 'user-applied-b');
    assert.equal(current.marker, 'release-b');
    assert.equal(current.worker.active.release.buildId, b.buildId);
    assert.deepEqual(current.storage, preserved);
    const topNavigations = browser.events
      .slice(reloadEvents)
      .filter((event) => event.method === 'Page.frameNavigated' && !event.params.frame.parentId);
    assert.equal(topNavigations.length, 1, 'Applying a waiting release must reload once');
    await other.until(`${shell}.pwa.restartRequired`);
    await browser.send('Target.activateTarget', { targetId: other.targetId });
    await wait(200);
    const otherState = await other.evaluate(pwaState);
    assert.equal(otherState.currentBuildId, a.buildId);
    assert.equal(otherState.availableBuildId, b.buildId);
    const oldGamePresentation = await other.evaluate(`({
      screen:${shell}.screen,
      isPlaying:${shell}.isPlaying,
      gameVisible:document.querySelector('#game-canvas').checkVisibility(),
      menuVisible:document.querySelector('.menu-screen').checkVisibility(),
    })`);
    assert.equal(
      oldGamePresentation.screen,
      'game',
      'Another tab applying B must not force an A player into the menu',
    );
    assert.equal(oldGamePresentation.isPlaying, true);
    assert.equal(oldGamePresentation.gameVisible, true);
    assert.equal(oldGamePresentation.menuVisible, false);
    await other.screenshot(path.join(output, 'second-tab-game-a-after-b.png'));
    const oldTabAsset = await other.evaluate(
      `fetch('./src/main.js').then(response=>response.text())`,
    );
    assert.ok(
      oldTabAsset.includes('"release-a"'),
      'Old JS client must keep its A asset cache until explicit restart',
    );
    assert.ok(!oldTabAsset.includes('"release-b"'));
    evidence.checks.push({
      name: 'second-tab-stays-on-a',
      state: otherState,
      assetMarker: 'release-a',
      presentation: oldGamePresentation,
      storage: await other.evaluate(storageState),
    });
    await other.evaluate(`${shell}.showMenu()`);
    await other.until(
      `${shell}.screen === 'menu' && document.querySelector('.menu-button--restart').checkVisibility()`,
    );
    await other.screenshot(path.join(output, 'second-tab-user-menu-restart.png'));
    await other.click('.menu-button--restart');
    await other.until(`${ready} && ${shell}.pwa.currentBuildId === ${JSON.stringify(b.buildId)}`);
    assert.equal(await other.evaluate('PWA_QA_RELEASE_MARKER'), 'release-b');
    assert.deepEqual(await other.evaluate(storageState), preserved);
    await other.close();
    other = null;
    server.switchTo(c.directory);
    server.stale(b.directory, '/src/main.js');
    await browser.click('#pwa-check-update-control', true);
    await browser.until(`${shell}.pwa.updateError`);
    current = await record(browser, 'stale-cdn-asset-keeps-b');
    assert.equal(current.worker.active.release.buildId, b.buildId);
    assert.equal(current.worker.waiting, null);
    assert.equal(current.marker, 'release-b');
    assert.deepEqual(current.storage, preserved);
    server.switchTo(c.directory);
    await browser.click('#pwa-check-update-control', true);
    await browser.until(
      `${shell}.pwa.updateReady && ${shell}.pwa.availableBuildId === ${JSON.stringify(c.buildId)}`,
      45000,
    );
    current = await record(browser, 'manual-detects-c');
    assert.equal(current.marker, 'release-b');
    assert.equal(current.state.restartRequired, false);
    await browser.click('.menu-button--update', true);
    await browser.until(`${ready} && ${shell}.pwa.currentBuildId === ${JSON.stringify(c.buildId)}`);
    server.offline(true);
    await browser.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await browser.navigate('?offline-reopen=1');
    await installReady(browser);
    current = await record(browser, 'release-c-offline-reopen');
    assert.equal(current.marker, 'release-c');
    assert.equal(current.state.currentBuildId, c.buildId);
    assert.deepEqual(current.storage, preserved);
    const mainSource = await browser.evaluate(
      `fetch('./src/main.js').then(response=>response.text())`,
    );
    assert.ok(mainSource.includes('"release-c"'));
    assert.ok(!mainSource.includes('"release-a"') && !mainSource.includes('"release-b"'));
    evidence.networkRequests = server.requests;
    assert.equal(
      digest(root),
      sourceDigest,
      'Production deploy assets changed during browser verification; rerun after source freeze',
    );
    evidence.verified = true;
    evidence.limitations = [
      'Headless Chromium retains one native SW/cache/localStorage profile throughout A→B→C; installed Android/iOS standalone lifecycle remains Human device verification.',
    ];
  } finally {
    if (other) await other.close();
    await browser.close();
  }
}

async function saveResetFlow() {
  const a = copyCurrentRelease('reset-a', '0.2.901');
  const b = copyCurrentRelease('reset-b', '0.2.902');
  const server = switchingServer(a.directory);
  const browser = await openQaBrowser({
    width: 1280,
    height: 720,
    serverFactory: () => server.factory(),
    profileRoot: workspace,
  });
  async function confirmReset(accept, touch = false) {
    const start = browser.events.length;
    const click = browser.click('#menu-reset-progress-control', touch);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (
        browser.events.slice(start).some((event) => event.method === 'Page.javascriptDialogOpening')
      )
        break;
      await wait(20);
    }
    const dialog = browser.events
      .slice(start)
      .find((event) => event.method === 'Page.javascriptDialogOpening');
    assert.equal(dialog?.params.type, 'confirm');
    assert.match(dialog.params.message, /저장 진행과 복구 지점/);
    await browser.send('Page.handleJavaScriptDialog', { accept });
    await click;
    await wait(150);
  }
  async function incompatibleSave() {
    await seedProgress(browser);
    await browser.evaluate(`{
      const key='polygon-rpg.progression.v1';
      const data=JSON.parse(localStorage.getItem(key));data.version=9;
      localStorage.setItem(key,JSON.stringify(data));
      localStorage.setItem('unrelated-app-sentinel','keep');
    }`);
    await browser.navigate('');
    await installReady(browser);
    await browser.until(`${shell}.saveStatus.includes('호환되지 않는')`);
    assert.equal(await browser.evaluate("document.querySelector('.menu-data-notice').open"), false);
    assert.equal(
      await browser.evaluate(
        `(()=>{const n=document.querySelector('#menu-reset-progress-control'),r=n.getBoundingClientRect();return n.checkVisibility() && r.top>=0 && r.bottom<=innerHeight && r.height>=44 && !n.closest('details')})()`,
      ),
      true,
    );
    return browser.evaluate(storageState);
  }
  try {
    await installReady(browser);
    const preserved = await incompatibleSave();
    server.switchTo(b.directory);
    await browser.until(`!${shell}.pwa.updateChecking`);
    await browser.click('#pwa-check-update-control');
    await browser.until(`${shell}.pwa.updateReady`);
    await browser.evaluate("caches.open('reset-qa-unrelated').then(() => true)");
    const blockedWorker = await workerState(browser);
    await browser.click('.menu-button--update');
    await browser.until(`${shell}.pwa.updateError?.includes('호환되지 않는')`);
    await record(browser, 'save-reset-blocked-desktop');
    assert.deepEqual(await browser.evaluate(storageState), preserved);
    assert.equal((await workerState(browser)).controller.release.buildId, a.buildId);
    await confirmReset(false);
    assert.deepEqual(await browser.evaluate(storageState), preserved);
    await record(browser, 'save-reset-cancel-preserves');
    await browser.evaluate(`globalThis.RESET_QA_SET_ITEM=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key==='polygon-rpg.progression.v1')throw new DOMException('QA write failure','QuotaExceededError');
        return RESET_QA_SET_ITEM.call(this,key,value);
      }`);
    try {
      await confirmReset(true);
      assert.match(await browser.evaluate(`${shell}.saveStatus`), /초기화 실패/);
      assert.deepEqual(await browser.evaluate(storageState), preserved);
      assert.equal((await workerState(browser)).controller.release.buildId, a.buildId);
      await record(browser, 'save-reset-write-failure-preserves');
    } finally {
      await browser.evaluate(
        'Storage.prototype.setItem=RESET_QA_SET_ITEM;delete globalThis.RESET_QA_SET_ITEM',
      );
    }
    await confirmReset(true);
    await browser.until(`!${shell}.pwa.updateChecking && !${shell}.pwa.updateError`);
    assert.match(await browser.evaluate(`${shell}.saveStatus`), /초기화 완료/);
    const resetStorage = await browser.evaluate(storageState);
    const fresh = JSON.parse(resetStorage['polygon-rpg.progression.v1']);
    assert.equal(fresh.version, 10);
    assert.equal(fresh.gold, 0);
    assert.deepEqual(fresh.viewedConversationIds, []);
    assert.notEqual(
      resetStorage['polygon-rpg.progression.v1.recovery.v1'],
      preserved['polygon-rpg.progression.v1.recovery.v1'],
    );
    assert.equal(await browser.evaluate("localStorage.getItem('unrelated-app-sentinel')"), 'keep');
    assert.deepEqual((await workerState(browser)).caches.sort(), blockedWorker.caches.sort());
    await record(browser, 'save-reset-success-desktop');
    const frameEvents = browser.events.filter(
      (event) => event.method === 'Page.frameNavigated' && !event.params.frame.parentId,
    ).length;
    await browser.click('.menu-button--update');
    await browser.until(`globalThis.PWA_QA_RELEASE_MARKER === 'reset-b'`);
    await installReady(browser);
    assert.equal(
      browser.events.filter(
        (event) => event.method === 'Page.frameNavigated' && !event.params.frame.parentId,
      ).length - frameEvents,
      1,
    );
    assert.equal((await workerState(browser)).controller.release.buildId, b.buildId);
    assert.deepEqual(await browser.evaluate(storageState), resetStorage);
    await record(browser, 'save-reset-update-complete');
    await browser.send('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const mobilePreserved = await incompatibleSave();
    await record(browser, 'save-reset-visible-mobile');
    await confirmReset(false, true);
    assert.deepEqual(await browser.evaluate(storageState), mobilePreserved);
    await confirmReset(true, true);
    assert.equal(
      JSON.parse((await browser.evaluate(storageState))['polygon-rpg.progression.v1']).version,
      10,
    );
    await record(browser, 'save-reset-success-mobile');
    const errors = browser.events.filter((event) => event.method === 'Runtime.exceptionThrown');
    assert.deepEqual(errors, []);
    evidence.verified = true;
  } finally {
    await browser.close();
  }
}

try {
  if (!fixedOnly) await baseline();
  if (saveResetOnly) await saveResetFlow();
  else if (!baselineOnly && !migrationOnly && !diagnoseUnregister && !restartRecovery)
    await fixedFlow();
  evidence.finishedAt = new Date().toISOString();
  console.log(
    saveResetOnly
      ? 'Native incompatible save → visible reset/cancel/failure → update, desktop and touch: PASS'
      : restartRecovery
        ? `Browser process restart recovery verified=${evidence.restartRecoveryVerified}; no-restart migration verified=${evidence.noRestartMigrationVerified}`
        : diagnoseUnregister
          ? `DIAGNOSTIC ONLY: unregister recovery=${evidence.unregisterRecovery?.recovered}; empty-client recovery=${evidence.emptyClientsRecovery?.recovered ?? 'not attempted'}`
          : migrationOnly
            ? 'Published stalled installer → current release in the same profile after page reload: PASS'
            : baselineOnly
              ? 'Published PWA update defect reproduced with native Service Worker: PASS'
              : 'Native persistent PWA installation, failure, foreground/manual update, two tabs, storage and offline: PASS',
  );
} catch (error) {
  evidence.failure = error.stack;
  throw error;
} finally {
  fs.writeFileSync(
    path.join(
      output,
      saveResetOnly
        ? 'save-reset-evidence.json'
        : restartRecovery
          ? 'restart-recovery-evidence.json'
          : diagnoseUnregister
            ? 'recovery-diagnostic-evidence.json'
            : migrationOnly
              ? 'migration-evidence.json'
              : baselineOnly
                ? 'baseline-evidence.json'
                : 'browser-evidence.json',
    ),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  // Only this run's unique child of artifacts/pwa-update is temporary; original work is untouched.
  const resolved = path.resolve(workspace);
  assert.ok(resolved.startsWith(`${path.resolve(output)}${path.sep}`));
  fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 20, retryDelay: 150 });
}
