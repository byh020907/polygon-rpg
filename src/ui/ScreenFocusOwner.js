import { GAME_SCREEN } from '../app/GameApp.js';

export const SCREEN_FOCUS_TARGET = Object.freeze({
  MENU_START: 'menu-start-control',
  MENU_MOBILE_START: 'menu-mobile-start-control',
  MENU_RENDER_LAB: 'menu-render-lab-control',
  GAME_MENU: 'game-menu-control',
  RENDER_LAB_HEADING: 'render-lab-title',
});

const SCREEN_ENTRY_TARGET = Object.freeze({
  [GAME_SCREEN.GAME]: SCREEN_FOCUS_TARGET.GAME_MENU,
  [GAME_SCREEN.RENDER_LAB]: SCREEN_FOCUS_TARGET.RENDER_LAB_HEADING,
});

function assertScreen(screen) {
  if (!Object.values(GAME_SCREEN).includes(screen)) {
    throw new TypeError(`알 수 없는 UI screen입니다: ${screen}`);
  }
  return screen;
}

function assertFocusPort(focusPort) {
  if (!focusPort || typeof focusPort.focus !== 'function') {
    throw new TypeError('ScreenFocusOwner에는 focus(targetId) port가 필요합니다.');
  }
  return focusPort;
}

export function createDocumentFocusPort(browserDocument) {
  if (!browserDocument || typeof browserDocument.getElementById !== 'function') {
    throw new TypeError('Document focus port에는 document가 필요합니다.');
  }

  return Object.freeze({
    focus(targetId) {
      const target = browserDocument.getElementById(targetId);
      if (!target || typeof target.focus !== 'function') return false;
      target.focus({ preventScroll: true });
      return browserDocument.activeElement === target;
    },
  });
}

export class ScreenFocusOwner {
  constructor({ initialScreen = GAME_SCREEN.MENU, focusPort }) {
    this.screen = assertScreen(initialScreen);
    this.focusPort = assertFocusPort(focusPort);
    this.menuReturnTarget = SCREEN_FOCUS_TARGET.MENU_START;
    this.latestSequence = 0;
  }

  transitionTo(nextScreen, { menuReturnTarget = null } = {}) {
    assertScreen(nextScreen);
    if (nextScreen === this.screen) {
      return Object.freeze({
        sequence: this.latestSequence,
        screen: this.screen,
        targetId: null,
        changed: false,
      });
    }
    if (this.screen === GAME_SCREEN.MENU && nextScreen !== GAME_SCREEN.MENU) {
      this.menuReturnTarget = menuReturnTarget ?? SCREEN_FOCUS_TARGET.MENU_START;
    }

    this.screen = nextScreen;
    this.latestSequence += 1;
    return Object.freeze({
      sequence: this.latestSequence,
      screen: nextScreen,
      targetId:
        nextScreen === GAME_SCREEN.MENU ? this.menuReturnTarget : SCREEN_ENTRY_TARGET[nextScreen],
      changed: true,
    });
  }

  apply(request) {
    if (
      !request ||
      request.sequence !== this.latestSequence ||
      request.screen !== this.screen ||
      request.changed !== true ||
      typeof request.targetId !== 'string'
    ) {
      return false;
    }
    return Boolean(this.focusPort.focus(request.targetId));
  }
}
