import { GameApp } from './GameApp.js';

function createBufferedUiBridge(uiBridge) {
  const pendingWrites = new Map();
  const writerNames = Object.freeze([
    'setRenderStats',
    'setGameStats',
    'setPlayerStatus',
    'setWorldStatus',
    'setDialoguePresentation',
    'setSaveStatus',
    'requestOperationMap',
    'requestCampaignActionPreview',
  ]);
  const bridge = { snapshot: () => uiBridge.snapshot() };
  for (const name of writerNames) {
    bridge[name] = (...args) => pendingWrites.set(name, args);
  }
  return Object.freeze({
    bridge: Object.freeze(bridge),
    flush() {
      for (const name of writerNames) {
        const args = pendingWrites.get(name);
        if (args) uiBridge[name](...args);
      }
    },
  });
}

function captureCanvasSurface(canvas) {
  const ownerDocument = canvas?.ownerDocument;
  if (
    !canvas ||
    typeof canvas.getContext !== 'function' ||
    !ownerDocument ||
    typeof ownerDocument.createElement !== 'function'
  ) {
    return null;
  }
  const backup = ownerDocument.createElement('canvas');
  backup.width = canvas.width;
  backup.height = canvas.height;
  const backupContext = backup.getContext('2d');
  if (!backupContext) return null;
  backupContext.drawImage(canvas, 0, 0);
  return Object.freeze({
    restore() {
      canvas.width = backup.width;
      canvas.height = backup.height;
      canvas.getContext('2d')?.drawImage(backup, 0, 0);
    },
  });
}

function captureCanvasSurfaces(canvases) {
  const surfaces = Object.values(canvases)
    .map((canvas) => captureCanvasSurface(canvas))
    .filter(Boolean);
  return Object.freeze({
    restore() {
      for (const surface of surfaces) surface.restore();
    },
  });
}

export class GameApplication {
  constructor({
    gameCanvas,
    polygonCanvas,
    retroCanvas,
    visualQaRequest = null,
    createGameApp = (options) => new GameApp(options),
  }) {
    if (typeof createGameApp !== 'function') {
      throw new TypeError('GameApplication에는 GameApp factory가 필요합니다.');
    }
    this.canvases = Object.freeze({ gameCanvas, polygonCanvas, retroCanvas });
    this.createGameApp = createGameApp;
    this.uiBridge = null;
    this.currentApp = this.create(visualQaRequest);
  }

  create(visualQaRequest) {
    return this.createGameApp(
      Object.freeze({
        ...this.canvases,
        visualQaRequest,
      }),
    );
  }

  connectUi(uiBridge) {
    this.uiBridge = uiBridge;
    this.currentApp.connectUi(uiBridge);
  }

  replace(createAndStart) {
    if (!this.uiBridge) {
      throw new Error('GameApplication replacement 전에 UI bridge를 연결해야 합니다.');
    }
    const previousApp = this.currentApp;
    const bufferedUi = createBufferedUiBridge(this.uiBridge);
    const canvasSurfaces = captureCanvasSurfaces(this.canvases);
    let candidateApp;
    try {
      candidateApp = createAndStart(bufferedUi.bridge);
    } catch (error) {
      canvasSurfaces.restore();
      throw error;
    }
    this.currentApp = candidateApp;
    candidateApp.connectUi(this.uiBridge);
    previousApp.destroy();
    bufferedUi.flush();
    return candidateApp;
  }

  applyDebugConfiguration(visualQaRequest) {
    let result;
    this.replace((bufferedUiBridge) => {
      const candidateApp = this.create(visualQaRequest);
      candidateApp.connectUi(bufferedUiBridge);
      try {
        result = candidateApp.runVisualQa(visualQaRequest);
        return candidateApp;
      } catch (error) {
        candidateApp.destroy();
        throw error;
      }
    });
    return result;
  }

  returnToPlayerGame() {
    this.replace((bufferedUiBridge) => {
      const candidateApp = this.create(null);
      candidateApp.connectUi(bufferedUiBridge);
      try {
        candidateApp.start();
        return candidateApp;
      } catch (error) {
        candidateApp.destroy();
        throw error;
      }
    });
  }

  start(options) {
    return this.currentApp.start(options);
  }

  runVisualQa(request) {
    return this.currentApp.runVisualQa(request);
  }

  prefersReducedMotion() {
    return this.currentApp.prefersReducedMotion();
  }

  enterGame() {
    return this.currentApp.enterGame();
  }

  resetSavedProgress() {
    return this.currentApp.resetSavedProgress();
  }

  onScreenChanged() {
    return this.currentApp.onScreenChanged();
  }

  resetScene() {
    return this.currentApp.resetScene();
  }

  toggleWorldTime() {
    return this.currentApp.toggleWorldTime();
  }

  trainCombatSkill() {
    return this.currentApp.trainCombatSkill();
  }

  executeDialogueCommand(interactionId, commandId) {
    return this.currentApp.executeDialogueCommand(interactionId, commandId);
  }

  confirmCampaignActionPreview() {
    return this.currentApp.confirmCampaignActionPreview();
  }

  cancelCampaignActionPreview() {
    return this.currentApp.cancelCampaignActionPreview();
  }

  pressMobileAction(actionId, pointerId) {
    return this.currentApp.pressMobileAction(actionId, pointerId);
  }

  releaseMobilePointer(pointerId) {
    return this.currentApp.releaseMobilePointer(pointerId);
  }

  destroy() {
    this.currentApp.destroy();
  }
}
