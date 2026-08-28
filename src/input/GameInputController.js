import { INPUT_ACTIONS, SEQUENCED_INPUT_ACTIONS, sequenceKey } from './InputAction.js';
import { KeyboardInputAdapter } from './KeyboardInputAdapter.js';
import { MobileInputAdapter } from './MobileInputAdapter.js';

export class GameInputController {
  constructor({ isActive = () => true } = {}) {
    this.keyboard = new KeyboardInputAdapter({ isActive });
    this.mobile = new MobileInputAdapter();
  }

  attach() {
    this.keyboard.attach();
    this.mobile.attach(document);
  }

  detach() {
    this.keyboard.detach();
    this.mobile.detach();
  }

  pressMobile(actionId, pointerId) {
    return this.mobile.press(actionId, pointerId);
  }

  releaseMobile(pointerId) {
    return this.mobile.release(pointerId);
  }

  clear({ resetSequences = false } = {}) {
    this.keyboard.clear({ resetSequences });
    this.mobile.clear({ resetSequences });
  }

  snapshot() {
    const keyboard = this.keyboard.snapshot();
    const mobile = this.mobile.snapshot();
    const snapshot = {};
    for (const actionId of INPUT_ACTIONS) {
      snapshot[actionId] = keyboard[actionId] || mobile[actionId];
    }
    for (const actionId of SEQUENCED_INPUT_ACTIONS) {
      const key = sequenceKey(actionId);
      snapshot[key] = keyboard[key] + mobile[key];
    }
    return Object.freeze(snapshot);
  }
}
