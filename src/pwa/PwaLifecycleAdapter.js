import { RELEASE_METADATA } from './ReleaseMetadata.js';

function isStandalone(browserWindow) {
  return Boolean(
    browserWindow.matchMedia?.('(display-mode: standalone)').matches ||
    browserWindow.navigator?.standalone === true,
  );
}

function isIos(browserNavigator) {
  return /iphone|ipad|ipod/i.test(browserNavigator?.userAgent ?? '');
}

function releaseStatus(release) {
  return `PRE-ALPHA · v${release.appVersion} · BUILD ${release.buildId}`;
}

function readWorkerRelease(worker) {
  return new Promise((resolve) => {
    if (!worker?.postMessage || typeof MessageChannel === 'undefined') return resolve(null);
    const channel = new MessageChannel();
    const finish = (release) => {
      channel.port1.close?.();
      channel.port2.close?.();
      resolve(release);
    };
    const timeout = setTimeout(() => finish(null), 1500);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      finish(event.data?.type === 'RELEASE_METADATA' ? event.data.release : null);
    };
    worker.postMessage({ type: 'GET_RELEASE_METADATA' }, [channel.port2]);
  });
}

export function createPwaLifecycleAdapter({ browserWindow = globalThis, releaseMetadata } = {}) {
  const browserNavigator = browserWindow.navigator;
  let deferredInstallPrompt = null;
  let registration = null;
  let updateRequested = false;
  let controllerChangeHandled = false;
  let updateCheckInFlight = false;
  let lastUpdateCheckAt = 0;
  const currentRelease = releaseMetadata ?? RELEASE_METADATA;
  const listeners = new Set();
  let state = Object.freeze({
    installAvailable: false,
    showIosInstallGuide: false,
    updateReady: false,
    restartRequired: false,
    currentVersion: currentRelease?.appVersion ?? 'unknown',
    currentBuildId: currentRelease?.buildId ?? 'unknown',
    availableVersion: null,
    availableBuildId: null,
    updateChecking: false,
    updateError: null,
    status: currentRelease
      ? releaseStatus(currentRelease)
      : '설치형 오프라인 준비를 확인하는 중입니다.',
  });

  const publish = (next) => {
    state = Object.freeze({ ...state, ...next });
    for (const listener of listeners) listener(state);
  };

  const receiveWaitingWorker = async (worker) => {
    if (!worker) return;
    publish({ updateReady: true, status: '업데이트 가능 · 버전 정보를 확인하는 중입니다.' });
    const available = await readWorkerRelease(worker);
    const sameBuild = available?.buildId === state.currentBuildId;
    publish({
      updateReady: !sameBuild,
      availableVersion: sameBuild ? null : (available?.appVersion ?? null),
      availableBuildId: sameBuild ? null : (available?.buildId ?? null),
      updateError: available ? null : '대기 중인 업데이트의 버전을 확인하지 못했습니다.',
      status: sameBuild
        ? '현재 실행 중인 릴리스와 같은 업데이트를 정리했습니다.'
        : available
          ? `업데이트 가능 · v${state.currentVersion} → v${available.appVersion}`
          : '업데이트 가능 · 버전 정보를 확인하는 중입니다.',
    });
  };

  const observeRegistration = (nextRegistration) => {
    registration = nextRegistration;
    void receiveWaitingWorker(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') void receiveWaitingWorker(registration.waiting);
      });
    });
  };

  const checkForUpdate = async ({ force = false } = {}) => {
    const now = Date.now();
    if (!registration || updateCheckInFlight || (!force && now - lastUpdateCheckAt < 30_000))
      return;
    updateCheckInFlight = true;
    lastUpdateCheckAt = now;
    publish({
      updateChecking: true,
      updateError: null,
      status: `현재 v${state.currentVersion} · 새 버전을 확인하는 중`,
    });
    try {
      await registration.update();
      await receiveWaitingWorker(registration.waiting);
      if (!registration.waiting) publish({ status: '오프라인 플레이 준비 완료' });
    } catch {
      publish({ updateError: '업데이트 확인 실패', status: '현재 버전 유지 · 업데이트 확인 실패' });
    } finally {
      updateCheckInFlight = false;
      publish({ updateChecking: false });
    }
  };

  return Object.freeze({
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    async start() {
      if (!browserNavigator?.serviceWorker || !browserWindow.isSecureContext) {
        publish({ status: '이 브라우저에서는 설치형 오프라인 기능을 사용할 수 없습니다.' });
        return;
      }

      if (isIos(browserNavigator) && !isStandalone(browserWindow)) {
        publish({ installAvailable: true });
      }

      browserWindow.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        publish({ installAvailable: !isStandalone(browserWindow), showIosInstallGuide: false });
      });
      browserWindow.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        publish({
          installAvailable: false,
          showIosInstallGuide: false,
          status: '앱 설치가 완료되었습니다.',
        });
      });
      browserNavigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!updateRequested || controllerChangeHandled) return;
        controllerChangeHandled = true;
        browserWindow.location.reload();
      });
      browserNavigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PWA_DIAGNOSTIC') {
          publish({ status: `오프라인 진단 · ${event.data.message}` });
          return;
        }
        if (event.data?.type === 'PWA_RELEASE_ACTIVATED' && !updateRequested) {
          publish({
            restartRequired: true,
            availableVersion: event.data.release?.appVersion ?? state.availableVersion,
            availableBuildId: event.data.release?.buildId ?? state.availableBuildId,
            status: '다른 창에서 새 버전을 적용했습니다 · 이 창은 다시 열어 안전하게 전환하세요.',
          });
        }
      });

      try {
        observeRegistration(
          await browserNavigator.serviceWorker.register('./sw.js', {
            scope: './',
            updateViaCache: 'none',
          }),
        );
        if (!state.updateReady) publish({ status: '오프라인 플레이 준비 완료' });
        void checkForUpdate({ force: true });
        browserWindow.addEventListener('focus', () => void checkForUpdate());
        browserWindow.addEventListener('online', () => void checkForUpdate({ force: true }));
        browserWindow.document?.addEventListener('visibilitychange', () => {
          if (!browserWindow.document.hidden) void checkForUpdate();
        });
        browserWindow.setInterval?.(() => void checkForUpdate(), 15 * 60 * 1000);
      } catch {
        publish({
          status: '오프라인 준비에 실패했습니다. 현재 온라인 플레이는 계속할 수 있습니다.',
        });
      }
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
      if (isIos(browserNavigator)) {
        publish({
          showIosInstallGuide: true,
          status: 'Safari 공유 버튼 → 홈 화면에 추가를 선택하세요.',
        });
      }
    },
    async applyUpdate(saveProgress) {
      if (!registration?.waiting || !state.updateReady || updateRequested) return false;
      const result = await saveProgress();
      if (!result?.ok) {
        publish({
          status: `새 버전을 적용하지 않았습니다 · ${result?.message ?? '진행 저장 실패'}`,
        });
        return false;
      }
      updateRequested = true;
      publish({ status: '진행을 저장했습니다. 새 버전을 적용합니다.' });
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    },
    restartForActivatedRelease() {
      if (!state.restartRequired) return false;
      browserWindow.location.reload();
      return true;
    },
  });
}

export { isStandalone };
