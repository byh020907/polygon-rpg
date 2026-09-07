import {
  assertInputAction,
  INPUT_ACTIONS,
  SEQUENCED_INPUT_ACTIONS,
  sequenceKey,
} from './InputAction.js';

function createSequences() {
  return Object.fromEntries(SEQUENCED_INPUT_ACTIONS.map((actionId) => [actionId, 0]));
}

// This adapter is only enabled by the local `inputQa=1` verification surface. It keeps
// simultaneous, latched actions inside the same action/sequence grammar as keyboard and touch.
export class QaInputAdapter {
  constructor({
    enabled = false,
    target = globalThis.window,
    documentTarget = globalThis.document,
  } = {}) {
    this.enabled = enabled;
    this.target = target;
    this.documentTarget = documentTarget;
    this.heldActions = new Set();
    this.sequences = createSequences();
    this.isAttached = false;
    this.onInterrupted = () => this.clear();
    this.onVisibilityChange = () => {
      if (this.documentTarget?.hidden) this.clear();
    };
  }

  attach() {
    if (!this.enabled || this.isAttached) return;
    this.target?.addEventListener?.('blur', this.onInterrupted);
    this.documentTarget?.addEventListener?.('visibilitychange', this.onVisibilityChange);
    this.isAttached = true;
  }

  detach() {
    if (!this.isAttached) return;
    this.target?.removeEventListener?.('blur', this.onInterrupted);
    this.documentTarget?.removeEventListener?.('visibilitychange', this.onVisibilityChange);
    this.clear();
    this.isAttached = false;
  }

  setHeld(actionId, held) {
    if (!this.enabled) return false;
    assertInputAction(actionId);
    if (held) {
      if (!this.heldActions.has(actionId) && SEQUENCED_INPUT_ACTIONS.includes(actionId)) {
        this.sequences[actionId] += 1;
      }
      this.heldActions.add(actionId);
    } else {
      this.heldActions.delete(actionId);
    }
    return true;
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
