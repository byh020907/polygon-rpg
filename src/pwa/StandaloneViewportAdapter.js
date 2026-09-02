function roundedViewportDimension(value) {
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

  const sync = () => {
    if (!documentRoot?.style) return false;
    const viewportHeight = roundedViewportDimension(
      visualViewport?.height ?? browserWindow.innerHeight,
    );
    const viewportWidth = roundedViewportDimension(
      visualViewport?.width ?? browserWindow.innerWidth,
    );
    if (!viewportHeight || !viewportWidth) return false;

    documentRoot.style.setProperty('--app-visible-viewport-height', viewportHeight);
    documentRoot.style.setProperty('--app-visible-viewport-width', viewportWidth);
    return true;
  };

  const addListeners = () => {
    browserWindow.addEventListener?.('resize', sync);
    browserWindow.addEventListener?.('orientationchange', sync);
    visualViewport?.addEventListener?.('resize', sync);
    visualViewport?.addEventListener?.('scroll', sync);
  };

  const removeListeners = () => {
    browserWindow.removeEventListener?.('resize', sync);
    browserWindow.removeEventListener?.('orientationchange', sync);
    visualViewport?.removeEventListener?.('resize', sync);
    visualViewport?.removeEventListener?.('scroll', sync);
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
      removeListeners();
    },
    sync,
  });
}
