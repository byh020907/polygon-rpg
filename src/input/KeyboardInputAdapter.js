import {
  INPUT_ACTIONS,
  KEYBOARD_ACTION_BY_CODE,
  SEQUENCED_INPUT_ACTIONS,
  sequenceKey,
} from './InputAction.js';

function createSequences() {
  return Object.fromEntries(SEQUENCED_INPUT_ACTIONS.map((actionId) => [actionId, 0]));
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('input, select, textarea, [contenteditable="true"]'));
}

export class KeyboardInputAdapter {
  constructor({
    target = globalThis.window,
    documentTarget = globalThis.document,
    isActive = () => true,
  } = {}) {
    this.target = target;
    this.documentTarget = documentTarget;
    this.isActive = isActive;
    this.heldActions = new Set();
    this.sequences = createSequences();
    this.isAttached = false;

    this.onKeyDown = (event) => {
      const actionId = KEYBOARD_ACTION_BY_CODE[event.code];
      if (!actionId || !this.isActive() || isInteractiveTarget(event.target)) return;
      event.preventDefault?.();
      if (!this.heldActions.has(actionId) && SEQUENCED_INPUT_ACTIONS.includes(actionId)) {
        this.sequences[actionId] += 1;
      }
      this.heldActions.add(actionId);
    };
    this.onKeyUp = (event) => {
      const actionId = KEYBOARD_ACTION_BY_CODE[event.code];
      if (actionId) this.heldActions.delete(actionId);
    };
    this.onInterrupted = () => this.clear();
    this.onVisibilityChange = () => {
      if (this.documentTarget?.hidden) this.clear();
    };
  }

  attach() {
    if (this.isAttached || !this.target?.addEventListener) return;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.onInterrupted);
    this.documentTarget?.addEventListener?.('visibilitychange', this.onVisibilityChange);
    this.isAttached = true;
  }

  detach() {
    if (!this.isAttached) return;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onInterrupted);
    this.documentTarget?.removeEventListener?.('visibilitychange', this.onVisibilityChange);
    this.clear();
    this.isAttached = false;
  }

  clear({ resetSequences = false } = {}) {
    this.heldActions.clear();
    if (resetSequences) this.sequences = createSequences();
  }

  snapshot() {
    const snapshot = {};
    for (const actionId of INPUT_ACTIONS) snapshot[actionId] = this.heldActions.has(actionId);
    for (const actionId of SEQUENCED_INPUT_ACTIONS) {
      snapshot[sequenceKey(actionId)] = this.sequences[actionId];
    }
    return Object.freeze(snapshot);
  }
}
