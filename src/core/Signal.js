export class Signal {
  constructor() {
    this.listeners = new Set();
  }

  get size() {
    return this.listeners.size;
  }

  connect(listener, onDisconnect = null) {
    if (typeof listener !== 'function') {
      throw new TypeError('Signal listener에는 함수가 필요합니다.');
    }
    if (onDisconnect !== null && typeof onDisconnect !== 'function') {
      throw new TypeError('Signal disconnect callback에는 함수가 필요합니다.');
    }

    let owner = this;
    let disconnectedCallback = onDisconnect;
    const entry = { listener, connection: null };
    const connection = Object.freeze({
      get connected() {
        return owner !== null;
      },
      disconnect() {
        if (owner === null) return false;

        const currentOwner = owner;
        const callback = disconnectedCallback;
        owner = null;
        disconnectedCallback = null;
        entry.listener = null;
        currentOwner.listeners.delete(entry);
        callback?.();
        return true;
      },
    });

    entry.connection = connection;
    this.listeners.add(entry);
    return connection;
  }

  emit(...args) {
    const listeners = [...this.listeners]
      .map((entry) => entry.listener)
      .filter((listener) => listener !== null);

    for (const listener of listeners) listener(...args);
  }

  clear() {
    const connections = [...this.listeners].map((entry) => entry.connection);
    let firstError = null;

    for (const connection of connections) {
      try {
        connection.disconnect();
      } catch (error) {
        firstError ??= error;
      }
    }

    if (firstError) throw firstError;
  }
}
