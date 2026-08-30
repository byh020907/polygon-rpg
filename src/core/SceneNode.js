import { Signal } from './Signal.js';

const NODE_PHASE = Object.freeze({
  DETACHED: 'detached',
  ENTERING: 'entering',
  ENTERED: 'entered',
  READYING: 'readying',
  ACTIVE: 'active',
  EXITING: 'exiting',
  DISPOSED: 'disposed',
});

export class SceneNode {
  constructor(name) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('SceneNode에는 비어 있지 않은 name이 필요합니다.');
    }

    this.name = name;
    this.parent = null;
    this.childNodes = [];
    this.phase = NODE_PHASE.DETACHED;
    this.readyRequested = true;
    this.incomingConnections = new Set();
    this.outgoingSignals = new Set();
  }

  get children() {
    return Object.freeze([...this.childNodes]);
  }

  get isInsideTree() {
    return ![NODE_PHASE.DETACHED, NODE_PHASE.DISPOSED].includes(this.phase);
  }

  get isDisposed() {
    return this.phase === NODE_PHASE.DISPOSED;
  }

  addChild(child) {
    this.assertCanMutateChildren();
    if (!(child instanceof SceneNode)) {
      throw new TypeError('SceneNode child에는 SceneNode가 필요합니다.');
    }
    if (child.isDisposed) throw new Error(`폐기된 SceneNode를 추가할 수 없습니다: ${child.name}`);
    if (child.phase !== NODE_PHASE.DETACHED) {
      throw new Error(`detached 상태가 아닌 SceneNode를 추가할 수 없습니다: ${child.name}`);
    }
    if (child.parent !== null) {
      throw new Error(`이미 parent가 있는 SceneNode를 추가할 수 없습니다: ${child.name}`);
    }

    for (let ancestor = this; ancestor !== null; ancestor = ancestor.parent) {
      if (ancestor === child) throw new Error('SceneNode tree에는 순환 관계를 만들 수 없습니다.');
    }

    child.parent = this;
    this.childNodes.push(child);

    if (![NODE_PHASE.ACTIVE, NODE_PHASE.READYING].includes(this.phase)) return child;

    try {
      child.enterSubtree();
      child.readySubtree();
      return child;
    } catch (error) {
      try {
        if (child.isInsideTree) child.exitSubtree();
      } catch {
        // Preserve the lifecycle error that prevented entry.
      } finally {
        this.detachChild(child);
      }
      throw error;
    }
  }

  removeChild(child) {
    this.assertCanMutateChildren();
    if (!(child instanceof SceneNode) || child.parent !== this) {
      throw new Error('제거할 SceneNode는 이 node의 직접 child여야 합니다.');
    }
    if ([NODE_PHASE.ENTERING, NODE_PHASE.READYING, NODE_PHASE.EXITING].includes(child.phase)) {
      throw new Error(`SceneNode lifecycle 전환 중에는 child를 제거할 수 없습니다: ${child.name}`);
    }

    let exitError = null;
    if (child.isInsideTree) {
      try {
        child.exitSubtree();
      } catch (error) {
        exitError = error;
      }
    }
    this.detachChild(child);

    if (exitError) throw exitError;
    return child;
  }

  ownSignal(signal = new Signal()) {
    this.assertNotDisposed();
    if (!(signal instanceof Signal)) {
      throw new TypeError('SceneNode가 소유할 signal에는 Signal이 필요합니다.');
    }

    this.outgoingSignals.add(signal);
    return signal;
  }

  connectTo(signal, listener) {
    this.assertNotDisposed();
    if (!(signal instanceof Signal)) {
      throw new TypeError('SceneNode가 연결할 signal에는 Signal이 필요합니다.');
    }
    if (typeof listener !== 'function') {
      throw new TypeError('SceneNode signal listener에는 함수가 필요합니다.');
    }

    this.pruneDisconnectedConnections();
    let connection = null;
    connection = signal.connect(
      (...args) => listener.call(this, ...args),
      () => this.incomingConnections.delete(connection),
    );
    this.incomingConnections.add(connection);
    return connection;
  }

  requestReady() {
    this.assertNotDisposed();
    this.readyRequested = true;
  }

  enterTree() {
    this.assertRootLifecycleCall('enterTree');
    if (this.phase !== NODE_PHASE.DETACHED) {
      throw new Error(`SceneNode.enterTree()는 detached root에만 호출할 수 있습니다: ${this.name}`);
    }

    try {
      this.enterSubtree();
      this.readySubtree();
    } catch (error) {
      if (this.isInsideTree) {
        try {
          this.exitSubtree();
        } catch {
          // Preserve the lifecycle error that prevented entry.
        }
      }
      throw error;
    }
    return this;
  }

  fixedProcess(deltaSeconds, context = undefined) {
    this.assertRootLifecycleCall('fixedProcess');
    if (this.phase !== NODE_PHASE.ACTIVE) {
      throw new Error(
        `SceneNode.fixedProcess()는 active root에만 호출할 수 있습니다: ${this.name}`,
      );
    }
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new TypeError(
        'SceneNode fixed process deltaSeconds는 0 이상의 유한한 숫자여야 합니다.',
      );
    }

    this.processSubtree(deltaSeconds, context);
  }

  exitTree() {
    this.assertRootLifecycleCall('exitTree');
    if (this.phase === NODE_PHASE.DETACHED) return false;
    if (this.phase !== NODE_PHASE.ACTIVE) {
      throw new Error(`SceneNode.exitTree()는 active root에만 호출할 수 있습니다: ${this.name}`);
    }

    this.exitSubtree();
    return true;
  }

  dispose() {
    if (this.isDisposed) return false;
    if ([NODE_PHASE.ENTERING, NODE_PHASE.READYING, NODE_PHASE.EXITING].includes(this.phase)) {
      throw new Error(`SceneNode lifecycle 전환 중에는 dispose할 수 없습니다: ${this.name}`);
    }

    let firstError = null;
    if (this.parent !== null) {
      try {
        this.parent.removeChild(this);
      } catch (error) {
        firstError = error;
        if (this.parent !== null) this.parent.detachChild(this);
      }
    } else if (this.isInsideTree) {
      try {
        this.exitSubtree();
      } catch (error) {
        firstError = error;
      }
    }

    for (const child of [...this.childNodes]) {
      try {
        child.dispose();
      } catch (error) {
        firstError ??= error;
      }
    }

    try {
      this.cleanupConnectionsAndSignals();
    } catch (error) {
      firstError ??= error;
    }
    this.childNodes.length = 0;
    this.parent = null;
    this.phase = NODE_PHASE.DISPOSED;

    if (firstError) throw firstError;
    return true;
  }

  onEnterTree() {}

  onReady() {}

  onPhysicsProcess() {}

  onExitTree() {}

  assertNotDisposed() {
    if (this.isDisposed) throw new Error(`폐기된 SceneNode는 사용할 수 없습니다: ${this.name}`);
  }

  assertCanMutateChildren() {
    this.assertNotDisposed();
    if ([NODE_PHASE.EXITING].includes(this.phase)) {
      throw new Error(`SceneNode exit 중에는 child tree를 변경할 수 없습니다: ${this.name}`);
    }
  }

  assertRootLifecycleCall(methodName) {
    this.assertNotDisposed();
    if (this.parent !== null) {
      throw new Error(`SceneNode.${methodName}()는 root node에만 호출할 수 있습니다: ${this.name}`);
    }
  }

  detachChild(child) {
    const childIndex = this.childNodes.indexOf(child);
    if (childIndex >= 0) this.childNodes.splice(childIndex, 1);
    child.parent = null;
  }

  enterSubtree() {
    if (this.phase !== NODE_PHASE.DETACHED) {
      throw new Error(`detached 상태가 아닌 SceneNode는 tree에 들어갈 수 없습니다: ${this.name}`);
    }

    this.phase = NODE_PHASE.ENTERING;
    this.onEnterTree();

    while (true) {
      const detachedChild = this.childNodes.find((child) => child.phase === NODE_PHASE.DETACHED);
      if (!detachedChild) break;
      detachedChild.enterSubtree();
    }
    this.phase = NODE_PHASE.ENTERED;
  }

  readySubtree() {
    while (true) {
      const detachedChild = this.childNodes.find((child) => child.phase === NODE_PHASE.DETACHED);
      if (detachedChild) {
        detachedChild.enterSubtree();
        detachedChild.readySubtree();
        continue;
      }

      const enteredChild = this.childNodes.find((child) => child.phase === NODE_PHASE.ENTERED);
      if (!enteredChild) break;
      enteredChild.readySubtree();
    }

    if (this.phase !== NODE_PHASE.ENTERED) return;
    if (this.readyRequested) {
      this.phase = NODE_PHASE.READYING;
      this.onReady();
      this.readyRequested = false;
    }
    this.phase = NODE_PHASE.ACTIVE;
  }

  processSubtree(deltaSeconds, context) {
    const childrenAtStart = [...this.childNodes];
    this.onPhysicsProcess(deltaSeconds, context);
    if (this.phase !== NODE_PHASE.ACTIVE) return;

    for (const child of childrenAtStart) {
      if (child.parent === this && child.phase === NODE_PHASE.ACTIVE) {
        child.processSubtree(deltaSeconds, context);
      }
    }
  }

  exitSubtree() {
    if (!this.isInsideTree) return;
    this.phase = NODE_PHASE.EXITING;
    let firstError = null;

    for (const child of [...this.childNodes]) {
      if (!child.isInsideTree) continue;
      try {
        child.exitSubtree();
      } catch (error) {
        firstError ??= error;
      }
    }

    try {
      this.onExitTree();
    } catch (error) {
      firstError ??= error;
    }
    try {
      this.cleanupConnectionsAndSignals();
    } catch (error) {
      firstError ??= error;
    }
    this.phase = NODE_PHASE.DETACHED;

    if (firstError) throw firstError;
  }

  cleanupConnectionsAndSignals() {
    let firstError = null;
    for (const connection of [...this.incomingConnections]) {
      try {
        connection.disconnect();
      } catch (error) {
        firstError ??= error;
      }
    }
    this.incomingConnections.clear();

    for (const signal of this.outgoingSignals) {
      try {
        signal.clear();
      } catch (error) {
        firstError ??= error;
      }
    }

    if (firstError) throw firstError;
  }

  pruneDisconnectedConnections() {
    for (const connection of this.incomingConnections) {
      if (!connection.connected) this.incomingConnections.delete(connection);
    }
  }
}
