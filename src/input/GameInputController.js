import { INPUT_ACTIONS, SEQUENCED_INPUT_ACTIONS, sequenceKey } from './InputAction.js';
import { KeyboardInputAdapter } from './KeyboardInputAdapter.js';
import { MobileInputAdapter } from './MobileInputAdapter.js';
import { QaInputAdapter } from './QaInputAdapter.js';

export class GameInputController {
  constructor({ isActive = () => true, qaInputEnabled = false } = {}) {
    this.keyboard = new KeyboardInputAdapter({ isActive });
    this.mobile = new MobileInputAdapter();
    this.qa = new QaInputAdapter({ enabled: qaInputEnabled });
  }

  attach() {
    this.keyboard.attach();
    this.mobile.attach(document);
    this.qa.attach();
  }

  detach() {
    this.keyboard.detach();
    this.mobile.detach();
    this.qa.detach();
  }

  pressMobile(actionId, pointerId) {
    return this.mobile.press(actionId, pointerId);
  }

  releaseMobile(pointerId) {
    return this.mobile.release(pointerId);
  }

  setQaHeld(actionId, held) {
    return this.qa.setHeld(actionId, held);
  }

  pulseQa(actionId) {
    return this.qa.pulse(actionId);
  }

  clear({ resetSequences = false } = {}) {
    this.keyboard.clear({ resetSequences });
    this.mobile.clear({ resetSequences });
    this.qa.clear({ resetSequences });
  }

  snapshot() {
    const keyboard = this.keyboard.snapshot();
    const mobile = this.mobile.snapshot();
    const qa = this.qa.snapshot();
    const snapshot = {};
    for (const actionId of INPUT_ACTIONS) {
      snapshot[actionId] = keyboard[actionId] || mobile[actionId] || qa[actionId];
    }
    for (const actionId of SEQUENCED_INPUT_ACTIONS) {
      const key = sequenceKey(actionId);
      snapshot[key] = keyboard[key] + mobile[key] + qa[key];
    }
    return Object.freeze(snapshot);
  }
}
