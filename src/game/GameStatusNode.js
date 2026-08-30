import { SceneNode } from '../core/SceneNode.js';
import { Signal } from '../core/Signal.js';

function statusKey(status) {
  return JSON.stringify(status);
}

export class GameStatusNode extends SceneNode {
  constructor(gameScene) {
    super('GameStatus');
    if (
      !gameScene ||
      typeof gameScene.getPlayerStatus !== 'function' ||
      typeof gameScene.getWorldStatus !== 'function'
    ) {
      throw new TypeError('GameStatusNode에는 player/world status source가 필요합니다.');
    }

    this.gameScene = gameScene;
    this.playerStatusChanged = this.ownSignal(new Signal('playerStatusChanged'));
    this.worldStatusChanged = this.ownSignal(new Signal('worldStatusChanged'));
    this.latestPlayerStatusKey = '';
    this.latestWorldStatusKey = '';
  }

  onEnterTree() {
    this.publish({ force: true });
  }

  onPhysicsProcess() {
    this.publish();
  }

  publish({ force = false } = {}) {
    const playerStatus = this.gameScene.getPlayerStatus();
    const nextPlayerStatusKey = statusKey(playerStatus);
    if (force || nextPlayerStatusKey !== this.latestPlayerStatusKey) {
      this.latestPlayerStatusKey = nextPlayerStatusKey;
      this.playerStatusChanged.emit(playerStatus);
    }

    const worldStatus = this.gameScene.getWorldStatus();
    const nextWorldStatusKey = statusKey(worldStatus);
    if (force || nextWorldStatusKey !== this.latestWorldStatusKey) {
      this.latestWorldStatusKey = nextWorldStatusKey;
      this.worldStatusChanged.emit(worldStatus);
    }
  }
}
