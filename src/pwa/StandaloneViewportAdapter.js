function roundedViewportDimension(...values) {
  const value = values.find((candidate) => Number.isFinite(candidate) && candidate > 0);
  return Number.isFinite(value) && value > 0 ? `${Math.round(value)}px` : null;
}

/**
 * Keeps an installed app's layout tied to the visible viewport instead of a
 * browser's occasionally stale dynamic-viewport unit. This is presentation
 * state only: it never changes game coordinates or simulation scale.
 */
export function createStandaloneViewportAdapter({ browserWindow = globalThis, root } = {}) {
  const documentRoot = root ?? browserWindow.document?.documentElement;
  const visualViewport = browserWindow.visualViewport;
  let active = false;
  let scheduledSyncFrame = null;

  const sync = () => {
    if (!documentRoot?.style) return false;
    const viewportHeight = roundedViewportDimension(
      visualViewport?.height,
      browserWindow.innerHeight,
    );
    const viewportWidth = roundedViewportDimension(visualViewport?.width, browserWindow.innerWidth);
    if (!viewportHeight || !viewportWidth) return false;

    documentRoot.style.setProperty('--app-visible-viewport-height', viewportHeight);
    documentRoot.style.setProperty('--app-visible-viewport-width', viewportWidth);
    return true;
  };

  const scheduleSync = () => {
    if (scheduledSyncFrame !== null || typeof browserWindow.requestAnimationFrame !== 'function') {
      return;
    }
    scheduledSyncFrame = browserWindow.requestAnimationFrame(() => {
      scheduledSyncFrame = null;
      sync();
    });
  };

  const syncAfterViewportChange = () => {
    sync();
    scheduleSync();
  };

  const addListeners = () => {
    browserWindow.addEventListener?.('resize', syncAfterViewportChange);
    browserWindow.addEventListener?.('orientationchange', syncAfterViewportChange);
    browserWindow.addEventListener?.('pageshow', syncAfterViewportChange);
    visualViewport?.addEventListener?.('resize', syncAfterViewportChange);
    visualViewport?.addEventListener?.('scroll', syncAfterViewportChange);
  };

  const removeListeners = () => {
    browserWindow.removeEventListener?.('resize', syncAfterViewportChange);
    browserWindow.removeEventListener?.('orientationchange', syncAfterViewportChange);
    browserWindow.removeEventListener?.('pageshow', syncAfterViewportChange);
    visualViewport?.removeEventListener?.('resize', syncAfterViewportChange);
    visualViewport?.removeEventListener?.('scroll', syncAfterViewportChange);
  };

  return Object.freeze({
    start() {
      if (active) return sync();
      active = true;
      addListeners();
      return sync();
    },
    stop() {
      if (!active) return;
      active = false;
      if (scheduledSyncFrame !== null) {
        browserWindow.cancelAnimationFrame?.(scheduledSyncFrame);
        scheduledSyncFrame = null;
      }
      removeListeners();
    },
    sync,
  });
}
