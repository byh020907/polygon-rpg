import { RELEASE_METADATA } from './ReleaseMetadata.js';

export const PWA_UPDATE_TIMING = Object.freeze({
  timeoutMs: 15000,
  workerMetadataMs: 2500,
  pollMs: 60000,
  debounceMs: 1000,
});

function isStandalone(browserWindow) {
  return Boolean(
    browserWindow.matchMedia?.('(display-mode: standalone)').matches ||
    browserWindow.navigator?.standalone === true,
  );
}
function isIos(browserNavigator) {
  return /iphone|ipad|ipod/i.test(browserNavigator?.userAgent ?? '');
}
function validRelease(value) {
  return (
    value &&
    typeof value.appVersion === 'string' &&
    typeof value.buildId === 'string' &&
    value.appVersion.length > 0 &&
    value.buildId.length > 0
  );
}
function readWorkerRelease(worker) {
  return new Promise((resolve) => {
    if (!worker?.postMessage || typeof MessageChannel === 'undefined') return resolve(null);
    const channel = new MessageChannel();
    let finished = false;
    const finish = (release) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
      resolve(validRelease(release) ? release : null);
    };
    const timeout = setTimeout(() => finish(null), PWA_UPDATE_TIMING.workerMetadataMs);
    channel.port1.onmessage = ({ data }) =>
      finish(data?.type === 'RELEASE_METADATA' ? data.release : null);
    try {
      worker.postMessage({ type: 'GET_RELEASE_METADATA' }, [channel.port2]);
    } catch {
      finish(null);
    }
  });
}
function deadline(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

export function createPwaLifecycleAdapter({
  browserWindow = globalThis,
  releaseMetadata,
  timeoutMs = PWA_UPDATE_TIMING.timeoutMs,
} = {}) {
  const browserNavigator = browserWindow.navigator;
  const serviceWorker = browserNavigator?.serviceWorker;
  const currentRelease = releaseMetadata ?? RELEASE_METADATA;
  const listeners = new Set();
  const removers = [];
  const observedWorkers = new WeakSet();
  const observedRegistrations = new WeakSet();
  let deferredInstallPrompt = null;
  let registration = null;
  let registrationInFlight = null;
  let startPromise = null;
  let checking = null;
  let lastCheckAt = -Infinity;
  let interval = null;
  let stopped = false;
  let updateRequested = false;
  let reloadHandled = false;
  let originalController = null;
  let applyEpoch = 0;
  let applyTimer = null;
  let fetchController = null;
  let screen = 'menu';
  let state = Object.freeze({
    installAvailable: false,
    showIosInstallGuide: false,
    offlineReady: false,
    updateReady: false,
    updateAvailable: false,
    updateInstalling: false,
    restartRequired: false,
    applying: false,
    applyPhase: null,
    installationBlocked: false,
    currentVersion: currentRelease.appVersion,
    currentBuildId: currentRelease.buildId,
    availableVersion: null,
    availableBuildId: null,
    updateChecking: false,
    updateError: null,
    status: `PRE-ALPHA · v${currentRelease.appVersion} · BUILD ${currentRelease.buildId}`,
  });
  function statusLabel(next) {
    if (next.applying)
      return next.applyPhase === 'saving'
        ? '현재 진행을 저장하는 중입니다.'
        : next.applyPhase === 'reloading'
          ? '새 버전 화면을 불러오는 중입니다.'
          : '저장 완료 · 새 버전을 적용하는 중입니다.';
    if (next.installationBlocked)
      return '이전 설치 작업이 멈췄습니다. 앱과 브라우저를 완전히 종료한 뒤 다시 열어 주세요. 저장은 유지됩니다.';
    if (next.updateError) return `현재 버전 유지 · ${next.updateError}`;
    if (next.restartRequired)
      return '다른 창에서 새 버전을 적용했습니다 · 진행 저장 후 다시 열어 주세요.';
    if (next.updateReady)
      return `업데이트 준비 완료 · v${next.currentVersion} → v${next.availableVersion ?? '?'}`;
    if (next.updateInstalling)
      return next.updateAvailable
        ? '새 버전 파일을 내려받고 확인하는 중입니다.'
        : '오프라인 파일을 준비하는 중입니다.';
    if (next.updateChecking) return '새 버전을 확인하는 중입니다.';
    return next.offlineReady ? '오프라인 플레이 준비 완료' : '오프라인 준비를 확인하는 중입니다.';
  }
  function publish(next) {
    if (stopped) return;
    const combined = { ...state, ...next };
    state = Object.freeze({ ...combined, status: next.status ?? statusLabel(combined) });
    for (const listener of listeners) listener(state);
  }
  function listen(target, type, listener) {
    target?.addEventListener?.(type, listener);
    removers.push(() => target?.removeEventListener?.(type, listener));
  }
  function pinClient() {
    try {
      serviceWorker?.controller?.postMessage({
        type: 'PWA_CLIENT_RELEASE',
        release: currentRelease,
      });
    } catch {
      /* A replacing controller is pinned by controllerchange/pageshow. */
    }
  }
  function reloadOnce() {
    if (stopped || reloadHandled) return;
    reloadHandled = true;
    clearTimeout(applyTimer);
    publish({ applyPhase: 'reloading' });
    browserWindow.location.reload();
  }
  async function receiveWaitingWorker(worker) {
    if (!worker) return;
    const available = await readWorkerRelease(worker);
    if (stopped || worker !== registration?.waiting) return;
    const sameBuild = available?.buildId === currentRelease.buildId;
    publish({
      updateReady: !sameBuild,
      updateAvailable: !sameBuild,
      updateInstalling: Boolean(registration?.installing),
      availableVersion: sameBuild ? null : (available?.appVersion ?? state.availableVersion),
      availableBuildId: sameBuild ? null : (available?.buildId ?? state.availableBuildId),
      updateError: available ? null : '업데이트는 준비됐지만 버전 응답을 확인하지 못했습니다.',
    });
  }
  async function receiveActiveWorker(worker) {
    if (!worker) return;
    const active = await readWorkerRelease(worker);
    if (stopped || worker !== registration?.active) return;
    publish({ offlineReady: worker.state === 'activated' || Boolean(serviceWorker?.controller) });
    if (active && active.buildId !== currentRelease.buildId && !updateRequested)
      publish({
        restartRequired: true,
        updateReady: false,
        availableVersion: active.appVersion,
        availableBuildId: active.buildId,
      });
  }
  function observeWorker(worker) {
    if (!worker || observedWorkers.has(worker)) return;
    observedWorkers.add(worker);
    let completed = ['installed', 'activated'].includes(worker.state);
    const changed = () => {
      if (stopped) return;
      if (worker.state === 'installing')
        publish({ updateInstalling: true, updateError: null, installationBlocked: false });
      if (worker.state === 'installed') {
        completed = true;
        publish({ updateInstalling: false });
        void receiveWaitingWorker(registration?.waiting);
      }
      if (worker.state === 'activated') {
        completed = true;
        publish({ offlineReady: true });
        pinClient();
        void receiveActiveWorker(registration?.active);
      }
      if (worker.state === 'redundant' && !completed && !registration?.waiting)
        publish({
          updateInstalling: false,
          updateReady: false,
          updateError: '새 버전 준비 실패 · 업데이트 확인으로 다시 시도하세요.',
        });
    };
    listen(worker, 'statechange', changed);
    changed();
  }
  function observeRegistration(next) {
    registration = next;
    if (!observedRegistrations.has(next)) {
      observedRegistrations.add(next);
      listen(next, 'updatefound', () => observeWorker(next.installing));
    }
    // updatefound may already have fired before register() resolves.
    observeWorker(next.installing);
    observeWorker(next.waiting);
    observeWorker(next.active);
    void receiveWaitingWorker(next.waiting);
    void receiveActiveWorker(next.active);
  }
  async function fetchLatestRelease() {
    if (typeof browserWindow.fetch !== 'function') return null;
    fetchController = new AbortController();
    try {
      const response = await deadline(
        browserWindow.fetch(`./public/release.json?check=${Date.now()}`, {
          cache: 'no-store',
          signal: fetchController.signal,
        }),
        timeoutMs,
        '업데이트 확인 시간이 초과됐습니다. 다시 확인해 주세요.',
      );
      if (!response.ok) throw new Error(`버전 확인 실패 (${response.status})`);
      const latest = await deadline(response.json(), timeoutMs, '버전 응답 시간이 초과됐습니다.');
      if (!validRelease(latest)) throw new Error('서버 버전 정보가 올바르지 않습니다.');
      return latest;
    } finally {
      fetchController?.abort();
      fetchController = null;
    }
  }
  function ensureRegistration() {
    if (registration) return Promise.resolve(registration);
    if (registrationInFlight) return registrationInFlight;
    registrationInFlight = (async () => {
      const existing = await deadline(
        Promise.resolve(serviceWorker.getRegistration?.('./')),
        timeoutMs,
        '등록 확인 시간이 초과됐습니다.',
      );
      if (stopped) return null;
      const initialRelease = existing ? null : ((await fetchLatestRelease()) ?? currentRelease);
      const next =
        existing ??
        (await deadline(
          serviceWorker.register(`./sw.js?build=${encodeURIComponent(initialRelease.buildId)}`, {
            scope: './',
            updateViaCache: 'none',
          }),
          timeoutMs,
          '오프라인 준비 시간이 초과됐습니다. 다시 확인해 주세요.',
        ));
      if (!stopped) observeRegistration(next);
      return next;
    })().finally(() => {
      registrationInFlight = null;
    });
    return registrationInFlight;
  }
  function checkForUpdate({ force = false } = {}) {
    if (stopped || !serviceWorker || !browserWindow.isSecureContext) return Promise.resolve(false);
    if (checking) return checking;
    if (state.installationBlocked && !force) return Promise.resolve(false);
    if (!force && Date.now() - lastCheckAt < PWA_UPDATE_TIMING.debounceMs)
      return Promise.resolve(false);
    lastCheckAt = Date.now();
    publish({ updateChecking: true, updateError: null });
    checking = (async () => {
      try {
        await ensureRegistration();
        if (stopped) return false;
        pinClient();
        if (!registration.waiting && state.updateReady) publish({ updateReady: false });
        await receiveWaitingWorker(registration.waiting);
        if (browserNavigator.onLine === false)
          throw new Error('오프라인입니다. 연결되면 다시 확인합니다.');
        const latest = await fetchLatestRelease();
        if (stopped) return false;
        if (latest) {
          if (latest.buildId !== currentRelease.buildId)
            publish({
              updateAvailable: true,
              availableVersion: latest.appVersion,
              availableBuildId: latest.buildId,
            });
          const workers = await Promise.all(
            [registration.waiting, registration.installing, registration.active].map(
              readWorkerRelease,
            ),
          );
          // A fresh page can already run B while a previous installation of A
          // is stalled. Compare actual workers, not only the page's build.
          if (!workers.some((worker) => worker?.buildId === latest.buildId)) {
            const installer = registration.installing;
            const blockedLegacy =
              installer &&
              typeof installer.scriptURL === 'string' &&
              !new URL(installer.scriptURL).searchParams.has('build') &&
              !registration.active &&
              !registration.waiting &&
              !serviceWorker.controller;
            try {
              observeRegistration(
                await deadline(
                  serviceWorker.register(`./sw.js?build=${encodeURIComponent(latest.buildId)}`, {
                    scope: './',
                    updateViaCache: 'none',
                  }),
                  timeoutMs,
                  '업데이트 등록 시간이 초과됐습니다. 다시 확인해 주세요.',
                ),
              );
            } catch (error) {
              if (
                blockedLegacy &&
                registration.installing === installer &&
                !registration.active &&
                !registration.waiting &&
                !serviceWorker.controller &&
                /시간이 초과/.test(error.message)
              )
                publish({ installationBlocked: true, updateInstalling: false });
              throw error;
            }
          } else if (!registration.installing && !registration.waiting)
            await deadline(
              registration.update(),
              timeoutMs,
              '업데이트 확인 시간이 초과됐습니다. 다시 확인해 주세요.',
            );
        } else if (!registration.installing) {
          await deadline(
            registration.update(),
            timeoutMs,
            '업데이트 확인 시간이 초과됐습니다. 다시 확인해 주세요.',
          );
        }
        if (stopped) return false;
        observeWorker(registration.installing);
        await receiveWaitingWorker(registration.waiting);
        await receiveActiveWorker(registration.active);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : '업데이트 확인 실패';
        publish({
          updateError: /Failed to fetch|NetworkError|Load failed/i.test(message)
            ? '네트워크에 연결할 수 없습니다. 현재 버전으로 플레이할 수 있습니다.'
            : message,
        });
        return false;
      } finally {
        checking = null;
        publish({ updateChecking: false });
      }
    })();
    return checking;
  }
  async function saveBeforeTransition(saveProgress) {
    if (state.applying || reloadHandled || stopped) return false;
    const epoch = ++applyEpoch;
    publish({ applying: true, applyPhase: 'saving', updateError: null });
    try {
      const result = await deadline(
        Promise.resolve().then(() => saveProgress()),
        timeoutMs,
        '저장 시간이 초과됐습니다.',
      );
      if (stopped || epoch !== applyEpoch) return false;
      if (!result?.ok) throw new Error(result?.message ?? '진행 저장 실패');
      return true;
    } catch (error) {
      if (epoch === applyEpoch)
        publish({
          applying: false,
          updateError: `저장하지 못해 새 버전을 적용하지 않았습니다 · ${error.message}`,
        });
      return false;
    }
  }
  async function applyUpdate(saveProgress) {
    if (
      !registration?.waiting ||
      !state.updateReady ||
      state.applying ||
      updateRequested ||
      state.restartRequired
    )
      return false;
    const waiting = registration.waiting;
    originalController = serviceWorker.controller;
    if (!(await saveBeforeTransition(saveProgress))) return false;
    if (waiting !== registration.waiting) {
      if (serviceWorker.controller && serviceWorker.controller !== originalController) {
        updateRequested = true;
        reloadOnce();
        return true;
      }
      publish({
        applying: false,
        updateReady: false,
        updateError: '대기 중인 버전이 바뀌었습니다. 업데이트를 다시 확인해 주세요.',
      });
      return false;
    }
    updateRequested = true;
    try {
      publish({ applyPhase: 'activating' });
      waiting.postMessage({ type: 'SKIP_WAITING' });
      applyTimer = setTimeout(() => {
        if (stopped || reloadHandled) return;
        updateRequested = false;
        publish({
          applying: false,
          updateError: '버전 전환 시간이 초과됐습니다. 업데이트를 다시 확인해 주세요.',
        });
      }, timeoutMs);
      return true;
    } catch (error) {
      updateRequested = false;
      publish({ applying: false, updateError: `새 버전 적용 실패 · ${error.message}` });
      return false;
    }
  }
  return Object.freeze({
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    checkForUpdate,
    setScreen(next) {
      const enteredMenu = screen !== 'menu' && next === 'menu';
      screen = next;
      if (enteredMenu) void checkForUpdate({ force: true });
    },
    start() {
      if (startPromise) return startPromise;
      startPromise = (async () => {
        if (!serviceWorker || !browserWindow.isSecureContext) {
          publish({ status: '이 브라우저에서는 설치형 오프라인 기능을 사용할 수 없습니다.' });
          return;
        }
        if (isIos(browserNavigator) && !isStandalone(browserWindow))
          publish({ installAvailable: true });
        listen(browserWindow, 'beforeinstallprompt', (event) => {
          event.preventDefault();
          deferredInstallPrompt = event;
          publish({ installAvailable: !isStandalone(browserWindow), showIosInstallGuide: false });
        });
        listen(browserWindow, 'appinstalled', () => {
          deferredInstallPrompt = null;
          publish({
            installAvailable: false,
            showIosInstallGuide: false,
            status: '앱 설치가 완료되었습니다.',
          });
        });
        listen(serviceWorker, 'controllerchange', () => {
          pinClient();
          if (updateRequested && serviceWorker.controller !== originalController) reloadOnce();
          else void receiveActiveWorker(registration?.active);
        });
        listen(serviceWorker, 'message', (event) => {
          if (event.data?.type === 'PWA_DIAGNOSTIC') {
            publish({
              updateInstalling: false,
              updateError: event.data.message,
              status: `오프라인 진단 · ${event.data.message}`,
            });
            return;
          }
          if (event.data?.type !== 'PWA_RELEASE_ACTIVATED' || !validRelease(event.data.release))
            return;
          const activated = event.data.release;
          if (activated.buildId === currentRelease.buildId) {
            publish({ offlineReady: true });
            pinClient();
            return;
          }
          if (!updateRequested)
            publish({
              restartRequired: true,
              updateReady: false,
              availableVersion: activated.appVersion,
              availableBuildId: activated.buildId,
            });
        });
        const resume = () => {
          pinClient();
          void checkForUpdate({ force: true });
        };
        listen(browserWindow, 'focus', resume);
        listen(browserWindow, 'online', resume);
        listen(browserWindow, 'pageshow', resume);
        listen(browserWindow.document, 'visibilitychange', () => {
          if (!browserWindow.document.hidden) resume();
        });
        listen(browserWindow, 'pagehide', () => {
          fetchController?.abort();
        });
        publish({ updateChecking: true, updateError: null });
        try {
          await ensureRegistration();
          if (stopped) return;
          pinClient();
          await checkForUpdate({ force: true });
        } catch (error) {
          publish({ updateChecking: false, updateError: `오프라인 준비 실패 · ${error.message}` });
        }
        if (!stopped)
          interval = browserWindow.setInterval?.(() => {
            if (!browserWindow.document?.hidden) void checkForUpdate();
          }, PWA_UPDATE_TIMING.pollMs);
      })();
      return startPromise;
    },
    stop() {
      stopped = true;
      ++applyEpoch;
      fetchController?.abort();
      clearTimeout(applyTimer);
      browserWindow.clearInterval?.(interval);
      for (const remove of removers) remove();
      listeners.clear();
    },
    async requestInstall() {
      if (isStandalone(browserWindow)) return publish({ installAvailable: false });
      if (deferredInstallPrompt) {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice?.outcome !== 'accepted')
          publish({ status: '설치는 원할 때 메인 메뉴에서 다시 시작할 수 있습니다.' });
        return;
      }
      if (isIos(browserNavigator))
        publish({
          showIosInstallGuide: true,
          status: 'Safari 공유 버튼 → 홈 화면에 추가를 선택하세요.',
        });
    },
    applyUpdate,
    async restartForActivatedRelease(saveProgress) {
      if (!state.restartRequired || !(await saveBeforeTransition(saveProgress))) return false;
      updateRequested = true;
      reloadOnce();
      return true;
    },
  });
}
export { isStandalone };
