import { SceneNode } from './SceneNode.js';

export class Scene {
  constructor(rootFactory) {
    if (typeof rootFactory !== 'function') {
      throw new TypeError('Scene에는 root SceneNode factory가 필요합니다.');
    }

    this.rootFactory = rootFactory;
    this.instances = new WeakSet();
  }

  instantiate(...args) {
    const root = this.rootFactory(...args);
    if (!(root instanceof SceneNode)) {
      throw new TypeError('Scene factory는 SceneNode root를 반환해야 합니다.');
    }
    if (root.parent !== null || root.isInsideTree || root.isDisposed) {
      throw new Error('Scene factory는 detached 상태의 폐기되지 않은 root를 반환해야 합니다.');
    }
    if (this.instances.has(root)) {
      throw new Error('Scene factory는 instantiate()마다 새로운 root를 반환해야 합니다.');
    }

    this.instances.add(root);
    return root;
  }
}
