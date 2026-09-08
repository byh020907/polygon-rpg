import assert from 'node:assert/strict';
import { createPwaLifecycleAdapter } from '../src/pwa/PwaLifecycleAdapter.js';

const A = Object.freeze({ appVersion: '0.2.1', buildId: 'aaaaaaaaaaaa' });
const B = Object.freeze({ appVersion: '0.2.2', buildId: 'bbbbbbbbbbbb' });
const wait = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));
function eventTarget(extra = {}) {
  const listeners = new Map();
  return Object.assign(extra, {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type, event = {}) {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    listenerCount() {
      return [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
    },
  });
}
function worker(release, state = 'activated') {
  return eventTarget({
    release,
    state,
    skips: 0,
    postMessage(message, ports = []) {
      if (message.type === 'GET_RELEASE_METADATA')
        ports[0].postMessage({ type: 'RELEASE_METADATA', release });
      if (message.type === 'SKIP_WAITING') this.skips += 1;
    },
  });
}
function environment() {
  const active = worker(A);
  const registration = eventTarget({
    active,
    installing: null,
    waiting: null,
    updates: 0,
    async update() {
      this.updates += 1;
    },
  });
  const serviceWorker = eventTarget({
    controller: active,
    registrations: [],
    async getRegistration() {
      return registration;
    },
    async register(url, options) {
      this.registrations.push({ url, options });
      return registration;
    },
  });
  const env = {
    latest: A,
    fetches: 0,
    reloads: 0,
    intervals: 0,
    failNetwork: false,
    hangNetwork: false,
  };
  const document = eventTarget({ hidden: false });
  const window = eventTarget({
    isSecureContext: true,
    document,
    navigator: { userAgent: 'Android', onLine: true, serviceWorker },
    matchMedia: () => ({ matches: false }),
    location: {
      reload: () => {
        env.reloads += 1;
      },
    },
    setInterval() {
      env.intervals += 1;
      return 1;
    },
    clearInterval() {
      env.intervals -= 1;
    },
    async fetch(url, options) {
      env.fetches += 1;
      assert.match(url, /public\/release\.json\?check=/);
      assert.equal(options.cache, 'no-store');
      if (env.hangNetwork) return new Promise(() => {});
      if (env.failNetwork) throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify(env.latest));
    },
  });
  return Object.assign(env, { active, registration, serviceWorker, window });
}

{
  const env = environment();
  const app = createPwaLifecycleAdapter({ browserWindow: env.window, releaseMetadata: A });
  await app.start();
  await app.checkForUpdate({ force: true });
  env.serviceWorker.emit('message', { data: { type: 'PWA_RELEASE_ACTIVATED', release: A } });
  assert.equal(
    app.getState().restartRequired,
    false,
    'first install of the running build is not a foreign update',
  );
  assert.equal(app.getState().offlineReady, true);
  env.active.state = 'redundant';
  env.active.emit('statechange');
  assert.equal(
    app.getState().updateError,
    null,
    'retiring a completed worker is not an install failure',
  );
  env.active.state = 'activated';
  assert.equal(env.reloads, 0);
  const initialFetches = env.fetches;
  env.window.emit('pageshow');
  await app.checkForUpdate({ force: true });
  assert.ok(
    env.fetches > initialFetches,
    'pageshow checks even immediately after a preceding check',
  );
  env.window.document.hidden = true;
  env.window.document.emit('visibilitychange');
  const hiddenFetches = env.fetches;
  await wait();
  assert.equal(env.fetches, hiddenFetches);
  env.window.document.hidden = false;
  env.window.document.emit('visibilitychange');
  await app.checkForUpdate({ force: true });
  assert.ok(env.fetches > hiddenFetches);
  app.stop();
  assert.equal(env.intervals, 0);
  assert.equal(env.window.listenerCount(), 0);
  assert.equal(env.serviceWorker.listenerCount(), 0);
}
{
  const env = environment();
  env.registration.installing = worker(B, 'installing');
  const app = createPwaLifecycleAdapter({ browserWindow: env.window, releaseMetadata: A });
  await app.start();
  await app.checkForUpdate({ force: true });
  assert.equal(
    app.getState().updateInstalling,
    true,
    'observe an installer already present before register resolves',
  );
  const waiting = env.registration.installing;
  env.registration.installing = null;
  env.registration.waiting = waiting;
  waiting.state = 'installed';
  waiting.emit('statechange');
  await wait();
  assert.equal(app.getState().updateReady, true);
  assert.equal(app.getState().availableBuildId, B.buildId);
  env.serviceWorker.emit('message', { data: { type: 'PWA_RELEASE_ACTIVATED', release: A } });
  assert.equal(app.getState().restartRequired, false);
  assert.equal(app.getState().updateReady, true);
  assert.equal(await app.applyUpdate(async () => ({ ok: false, message: '저장 불가' })), false);
  assert.match(app.getState().status, /저장 불가/);
  assert.equal(app.getState().applying, false);
  assert.equal(waiting.skips, 0);
  let resolveSave;
  let saves = 0;
  const first = app.applyUpdate(() => {
    saves += 1;
    return new Promise((resolve) => {
      resolveSave = resolve;
    });
  });
  assert.equal(
    await app.applyUpdate(() => {
      saves += 1;
      return { ok: true };
    }),
    false,
  );
  await wait();
  assert.equal(saves, 1);
  resolveSave({ ok: true });
  assert.equal(await first, true);
  assert.equal(waiting.skips, 1);
  assert.equal(env.reloads, 0);
  env.serviceWorker.controller = waiting;
  env.registration.active = waiting;
  env.registration.waiting = null;
  env.serviceWorker.emit('controllerchange');
  env.serviceWorker.emit('controllerchange');
  assert.equal(env.reloads, 1);
  app.stop();
}
{
  const env = environment();
  const app = createPwaLifecycleAdapter({ browserWindow: env.window, releaseMetadata: A });
  await app.start();
  await app.checkForUpdate({ force: true });
  env.serviceWorker.emit('message', { data: { type: 'PWA_RELEASE_ACTIVATED', release: B } });
  assert.equal(app.getState().restartRequired, true);
  assert.equal(env.reloads, 0);
  assert.equal(
    await app.restartForActivatedRelease(async () => ({ ok: false, message: '다른 창 저장 실패' })),
    false,
  );
  assert.equal(env.reloads, 0);
  assert.match(app.getState().status, /다른 창 저장 실패/);
  assert.equal(await app.restartForActivatedRelease(async () => ({ ok: true })), true);
  assert.equal(await app.restartForActivatedRelease(async () => ({ ok: true })), false);
  assert.equal(env.reloads, 1);
  app.stop();
}
{
  const env = environment();
  const app = createPwaLifecycleAdapter({
    browserWindow: env.window,
    releaseMetadata: A,
    timeoutMs: 40,
  });
  await app.start();
  await app.checkForUpdate({ force: true });
  env.hangNetwork = true;
  await app.checkForUpdate({ force: true });
  assert.equal(app.getState().updateChecking, false);
  assert.match(app.getState().updateError, /시간/);
  env.hangNetwork = false;
  env.failNetwork = true;
  await app.checkForUpdate({ force: true });
  assert.doesNotMatch(app.getState().status, /Failed to fetch/);
  env.failNetwork = false;
  await app.checkForUpdate({ force: true });
  assert.equal(app.getState().updateError, null);
  env.latest = B;
  await app.checkForUpdate({ force: true });
  assert.ok(
    env.serviceWorker.registrations.some(
      ({ url, options }) =>
        url.endsWith(`?build=${B.buildId}`) && options.updateViaCache === 'none',
    ),
  );
  app.stop();
}
{
  const env = environment();
  let fail = true;
  env.serviceWorker.getRegistration = async () => null;
  env.serviceWorker.register = async () => {
    if (fail) throw new Error('처음 연결 실패');
    return env.registration;
  };
  const app = createPwaLifecycleAdapter({ browserWindow: env.window, releaseMetadata: A });
  await app.start();
  assert.match(app.getState().updateError, /처음 연결 실패/);
  fail = false;
  assert.equal(
    await app.checkForUpdate({ force: true }),
    true,
    'manual check can recover an initially failed registration',
  );
  assert.equal(app.getState().updateError, null);
  app.stop();
}
{
  const env = environment();
  env.window.navigator.userAgent = 'iPhone';
  const app = createPwaLifecycleAdapter({ browserWindow: env.window, releaseMetadata: A });
  await app.start();
  await app.checkForUpdate({ force: true });
  assert.equal(app.getState().installAvailable, true);
  await app.requestInstall();
  assert.equal(app.getState().showIosInstallGuide, true);
  app.stop();
}
{
  const env = environment();
  env.latest = B;
  env.registration.active = null;
  env.serviceWorker.controller = null;
  env.registration.installing = worker(A, 'installing');
  const app = createPwaLifecycleAdapter({ browserWindow: env.window, releaseMetadata: B });
  await app.start();
  await app.checkForUpdate({ force: true });
  assert.ok(
    env.serviceWorker.registrations.some(({ url }) => url.endsWith(`?build=${B.buildId}`)),
    'a B page replaces a stuck A installer even when the page and server builds already match',
  );
  assert.equal(app.getState().offlineReady, false);
  app.stop();
}
{
  const env = environment();
  env.latest = B;
  env.registration.active = null;
  env.serviceWorker.controller = null;
  env.registration.installing = worker(A, 'installing');
  env.registration.installing.scriptURL = 'https://example.test/sw.js';
  let unregisters = 0;
  env.registration.unregister = async () => {
    unregisters += 1;
  };
  env.serviceWorker.register = () => new Promise(() => {});
  const app = createPwaLifecycleAdapter({
    browserWindow: env.window,
    releaseMetadata: B,
    timeoutMs: 40,
  });
  await app.start();
  await app.checkForUpdate({ force: true });
  assert.equal(app.getState().installationBlocked, true);
  assert.match(app.getState().status, /완전히 종료/);
  assert.equal(unregisters, 0);
  app.stop();
}
console.log(
  'PWA lifecycle: initial install, waiting race, save/duplicate/restart guards, resume, retry and cleanup PASS',
);
