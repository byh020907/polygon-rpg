import {
  INPUT_ACTIONS,
  SEQUENCED_INPUT_ACTIONS,
  assertInputAction,
  sequenceKey,
} from './InputAction.js';

function createSequences() {
  return Object.fromEntries(SEQUENCED_INPUT_ACTIONS.map((actionId) => [actionId, 0]));
}

export class MobileInputAdapter {
  constructor() {
    this.pointerActions = new Map();
    this.sequences = createSequences();
    this.abortController = null;
  }

  attach(eventTarget) {
    if (this.abortController) return;
    if (!eventTarget?.addEventListener) {
      throw new TypeError('모바일 입력을 연결할 EventTarget이 필요합니다.');
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    if ('PointerEvent' in globalThis) {
      eventTarget.addEventListener('pointerdown', (event) => this.onPointerDown(event), {
        signal,
      });
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        eventTarget.addEventListener(eventName, (event) => this.onPointerReleased(event), {
          signal,
        });
      }
    } else {
      eventTarget.addEventListener('touchstart', (event) => this.onTouchStart(event), {
        passive: false,
        signal,
      });
      for (const eventName of ['touchend', 'touchcancel']) {
        eventTarget.addEventListener(eventName, (event) => this.onTouchEnd(event), {
          passive: false,
          signal,
        });
      }
    }

    eventTarget.defaultView?.addEventListener('blur', () => this.clear(), { signal });
    eventTarget.addEventListener(
      'visibilitychange',
      () => {
        if (eventTarget.hidden) this.clear();
      },
      { signal },
    );
  }

  detach() {
    this.abortController?.abort();
    this.abortController = null;
    this.clear();
  }

  findControl(eventTarget) {
    return eventTarget?.closest?.('[data-mobile-action]') ?? null;
  }

  onPointerDown(event) {
    const control = this.findControl(event.target);
    if (!control || control.disabled) return;

    event.preventDefault();
    const accepted = this.press(control.dataset.mobileAction, event.pointerId);
    if (!accepted) return;

    try {
      control.setPointerCapture?.(event.pointerId);
    } catch {
      // Document-level release listeners still prevent a stuck input if capture is unavailable.
    }
  }

  onPointerReleased(event) {
    if (event.type !== 'lostpointercapture') {
      const control = this.findControl(event.target);
      try {
        control?.releasePointerCapture?.(event.pointerId);
      } catch {
        // The browser may have already released capture during pointer cancellation.
      }
    }
    return this.release(event.pointerId);
  }

  onTouchStart(event) {
    let handled = false;
    for (const touch of event.changedTouches) {
      const control = this.findControl(touch.target);
      if (!control || control.disabled) continue;
      this.press(control.dataset.mobileAction, touch.identifier);
      handled = true;
    }
    if (handled) event.preventDefault();
  }

  onTouchEnd(event) {
    let handled = false;
    for (const touch of event.changedTouches) {
      handled = this.release(touch.identifier) || handled;
    }
    if (handled) event.preventDefault();
  }

  press(actionId, pointerId) {
    assertInputAction(actionId);
    if (!Number.isFinite(pointerId)) throw new TypeError('모바일 입력에는 pointerId가 필요합니다.');
    const previousAction = this.pointerActions.get(pointerId);
    if (previousAction === actionId) return false;
    this.pointerActions.set(pointerId, actionId);
    if (SEQUENCED_INPUT_ACTIONS.includes(actionId)) this.sequences[actionId] += 1;
    return true;
  }

  release(pointerId) {
    return this.pointerActions.delete(pointerId);
  }

  clear({ resetSequences = false } = {}) {
    this.pointerActions.clear();
    if (resetSequences) this.sequences = createSequences();
  }

  isHeld(actionId) {
    for (const activeAction of this.pointerActions.values()) {
      if (activeAction === actionId) return true;
    }
    return false;
  }

  snapshot() {
    const snapshot = {};
    for (const actionId of INPUT_ACTIONS) snapshot[actionId] = this.isHeld(actionId);
    for (const actionId of SEQUENCED_INPUT_ACTIONS) {
      snapshot[sequenceKey(actionId)] = this.sequences[actionId];
    }
    return Object.freeze(snapshot);
  }
}
