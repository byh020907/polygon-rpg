function isStandalone(browserWindow) {
  return Boolean(
    browserWindow.matchMedia?.('(display-mode: standalone)').matches ||
    browserWindow.navigator?.standalone === true,
  );
}

function isIos(browserNavigator) {
  return /iphone|ipad|ipod/i.test(browserNavigator?.userAgent ?? '');
}

export function createPwaLifecycleAdapter({ browserWindow = globalThis } = {}) {
  const browserNavigator = browserWindow.navigator;
  let deferredInstallPrompt = null;
  let registration = null;
  let updateRequested = false;
  let controllerChangeHandled = false;
  const listeners = new Set();
  let state = Object.freeze({
    installAvailable: false,
    showIosInstallGuide: false,
    updateReady: false,
    status: '설치형 오프라인 준비를 확인하는 중입니다.',
  });

  const publish = (next) => {
    state = Object.freeze({ ...state, ...next });
    for (const listener of listeners) listener(state);
  };

  const receiveWaitingWorker = (worker) => {
    if (!worker) return;
    publish({ updateReady: true, status: '새 버전 준비됨 · 메뉴에서 적용할 수 있습니다.' });
  };

  const observeRegistration = (nextRegistration) => {
    registration = nextRegistration;
    receiveWaitingWorker(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') receiveWaitingWorker(registration.waiting);
      });
    });
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
        if (event.data?.type !== 'PWA_DIAGNOSTIC') return;
        publish({ status: `오프라인 진단 · ${event.data.message}` });
      });

      try {
        observeRegistration(
          await browserNavigator.serviceWorker.register('./sw.js', { scope: './' }),
        );
        if (!state.updateReady) publish({ status: '오프라인 플레이 준비 완료' });
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
  });
}

export { isStandalone };
