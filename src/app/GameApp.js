import { FixedStepRunner } from '../core/FixedStepRunner.js';
import { SceneNode } from '../core/SceneNode.js';
import { GAME_SCENE } from '../game/GameScene.js';
import { GameInputController } from '../input/GameInputController.js';
import { Camera2D } from '../rendering/Camera2D.js';
import { CanvasHost } from '../rendering/CanvasHost.js';
import { CanvasPolygonRenderer } from '../rendering/CanvasPolygonRenderer.js';
import { CanvasRetroRenderer } from '../rendering/CanvasRetroRenderer.js';

export const GAME_SCREEN = Object.freeze({
  MENU: 'menu',
  GAME: 'game',
  RENDER_LAB: 'render-lab',
});

const GAME_RENDER_SETTINGS = Object.freeze({
  pixelSize: 4,
  pixelSnap: true,
  alphaThresholdEnabled: true,
  alphaThreshold: 128,
  posterizationLevels: 5,
  outlineWidth: 1,
  showMesh: false,
  showPixelGrid: false,
  showWorldGrid: false,
});

function assertCanvas(canvas, label) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError(`${label}에는 HTMLCanvasElement가 필요합니다.`);
  }
  return canvas;
}

function assertUiBridge(uiBridge) {
  if (
    !uiBridge ||
    typeof uiBridge.snapshot !== 'function' ||
    typeof uiBridge.setRenderStats !== 'function' ||
    typeof uiBridge.setGameStats !== 'function' ||
    typeof uiBridge.setPlayerStatus !== 'function' ||
    typeof uiBridge.setWorldStatus !== 'function'
  ) {
    throw new TypeError(
      'GameApp UI bridge에는 snapshot, stats와 world status writer가 필요합니다.',
    );
  }
  return uiBridge;
}

export class GameApp extends SceneNode {
  constructor({ gameCanvas, polygonCanvas, retroCanvas }) {
    super('GameApp');
    this.scene = this.addChild(GAME_SCENE.instantiate());
    this.camera = new Camera2D();

    this.gameHost = new CanvasHost(assertCanvas(gameCanvas, 'Game Canvas'));
    this.polygonHost = new CanvasHost(assertCanvas(polygonCanvas, 'Polygon Canvas'));
    this.retroHost = new CanvasHost(assertCanvas(retroCanvas, 'Retro Canvas'));

    this.gameRenderer = new CanvasRetroRenderer(this.gameHost, this.camera);
    this.polygonRenderer = new CanvasPolygonRenderer(this.polygonHost, this.camera);
    this.retroRenderer = new CanvasRetroRenderer(this.retroHost, this.camera);

    this.uiBridge = null;
    this.input = new GameInputController({
      isActive: () => this.uiBridge?.snapshot().screen !== GAME_SCREEN.MENU,
    });
    this.animationFrameId = null;
    this.abortController = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.frameSamples = { count: 0, startTime: performance.now(), fps: 0 };
    this.latestRenderStats = { logicalWidth: 1, logicalHeight: 1 };
    this.reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? {
      matches: false,
    };

    this.runner = new FixedStepRunner({
      stepHz: 120,
      maxCatchUpSteps: 5,
      update: (deltaSeconds, inputSnapshot) => this.update(deltaSeconds, inputSnapshot),
      render: (interpolationAlpha) => this.render(interpolationAlpha),
    });
  }

  connectUi(uiBridge) {
    this.uiBridge = assertUiBridge(uiBridge);
  }

  start() {
    if (!this.uiBridge) throw new Error('GameApp.start() 전에 UI bridge를 연결해야 합니다.');
    if (this.animationFrameId !== null) return;
    this.enterTree();
  }

  onEnterTree() {
    this.connectTo(this.scene.worldStatusChanged, (status) => {
      this.uiBridge.setWorldStatus(status);
    });
    this.connectTo(this.scene.playerStatusChanged, (status) => {
      this.uiBridge.setPlayerStatus(status);
    });
    this.connectTo(this.scene.renderFrameCreated, (renderFrame) => {
      this.renderFrame(renderFrame);
    });
    this.input.attach();
    this.abortController = new AbortController();
    this.attachEvents();
    this.resizeObserver.observe(this.gameHost.canvas);
    this.resizeObserver.observe(this.polygonHost.canvas);
    this.resizeObserver.observe(this.retroHost.canvas);
    this.resize();
    this.runner.reset(performance.now());
    this.animationFrameId = requestAnimationFrame((time) => this.loop(time));
  }

  onExitTree() {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    this.input.detach();
    this.abortController?.abort();
    this.abortController = null;
    this.resizeObserver.disconnect();
  }

  attachEvents() {
    const signal = this.abortController.signal;
    document.addEventListener(
      'visibilitychange',
      () => {
        if (!document.hidden) this.runner.reset(performance.now());
      },
      { signal },
    );
  }

  enterGame() {
    this.input.clear({ resetSequences: true });
    this.scene.reset();
    this.onScreenChanged();
  }

  resetScene() {
    this.input.clear({ resetSequences: true });
    this.scene.reset();
    this.runner.reset(performance.now());
  }

  onScreenChanged() {
    this.input.clear();
    this.frameSamples = { count: 0, startTime: performance.now(), fps: 0 };
    this.runner.reset(performance.now());
    this.runner.resetDiagnostics();
    this.resize();
  }

  toggleWorldTime() {
    this.scene.toggleTimePhase();
  }

  selectEquipment(profileId) {
    return this.scene.selectEquipment(profileId);
  }

  resize() {
    this.gameHost.resize();
    this.polygonHost.resize();
    this.retroHost.resize();
  }

  createInputSnapshot() {
    return this.input.snapshot();
  }

  createSimulationSettings(uiState) {
    return Object.freeze({
      animationSpeed: uiState.screen === GAME_SCREEN.RENDER_LAB ? uiState.animationSpeed : 1,
      cameraFeedbackEnabled: !this.reducedMotionQuery.matches,
    });
  }

  pressMobileAction(actionId, pointerId) {
    if (this.uiBridge.snapshot().screen === GAME_SCREEN.MENU) return false;
    return this.input.pressMobile(actionId, pointerId);
  }

  releaseMobilePointer(pointerId) {
    return this.input.releaseMobile(pointerId);
  }

  update(deltaSeconds, inputSnapshot) {
    const uiState = this.uiBridge.snapshot();
    const active =
      uiState.screen === GAME_SCREEN.GAME ||
      (uiState.screen === GAME_SCREEN.RENDER_LAB && uiState.isPlaying);
    if (!active) return;
    this.fixedProcess(deltaSeconds, {
      inputSnapshot,
      simulationSettings: this.createSimulationSettings(uiState),
    });
  }

  render(interpolationAlpha) {
    const uiState = this.uiBridge.snapshot();
    if (uiState.screen === GAME_SCREEN.MENU) return;
    this.scene.createRenderFrame(interpolationAlpha);
  }

  renderFrame(renderFrame) {
    const uiState = this.uiBridge.snapshot();
    if (uiState.screen === GAME_SCREEN.GAME) {
      this.latestRenderStats = this.gameRenderer.render(renderFrame, GAME_RENDER_SETTINGS);
      return;
    }

    const polygonStats = this.polygonRenderer.render(renderFrame, {
      showMesh: uiState.showMesh,
      showWorldGrid: true,
    });
    const retroStats = this.retroRenderer.render(renderFrame, {
      pixelSize: uiState.pixelSize,
      pixelSnap: uiState.pixelSnap,
      alphaThresholdEnabled: uiState.alphaThresholdEnabled,
      alphaThreshold: uiState.alphaThreshold,
      posterizationLevels: uiState.posterizationLevels,
      outlineWidth: uiState.outlineWidth,
      showMesh: uiState.showMesh,
      showPixelGrid: uiState.showPixelGrid,
      showWorldGrid: true,
    });
    this.latestRenderStats = Object.freeze({
      ...retroStats,
      degenerateItemIds: Object.freeze([
        ...new Set([
          ...(polygonStats.degenerateItemIds ?? []),
          ...(retroStats.degenerateItemIds ?? []),
        ]),
      ]),
      rasterCollapseItemIds: retroStats.rasterCollapseItemIds ?? Object.freeze([]),
    });
  }

  updateStats(currentTime) {
    const uiState = this.uiBridge.snapshot();
    if (uiState.screen === GAME_SCREEN.MENU) return;

    this.frameSamples.count += 1;
    const elapsedMilliseconds = currentTime - this.frameSamples.startTime;
    if (elapsedMilliseconds < 500) return;

    this.frameSamples.fps = (this.frameSamples.count * 1000) / elapsedMilliseconds;
    this.frameSamples.count = 0;
    this.frameSamples.startTime = currentTime;
    const commonStats = Object.freeze({
      fps: Math.round(this.frameSamples.fps),
      logicalWidth: this.latestRenderStats.logicalWidth,
      logicalHeight: this.latestRenderStats.logicalHeight,
      droppedSteps: this.runner.droppedSteps,
      degenerateItemIds: this.latestRenderStats.degenerateItemIds ?? [],
      rasterCollapseCount: this.latestRenderStats.rasterCollapseItemIds?.length ?? 0,
    });

    if (uiState.screen === GAME_SCREEN.GAME) {
      this.uiBridge.setGameStats(commonStats);
    } else {
      this.uiBridge.setRenderStats(commonStats);
    }
  }

  loop(currentTime) {
    this.runner.frame(currentTime, this.createInputSnapshot());
    this.updateStats(currentTime);
    this.animationFrameId = requestAnimationFrame((time) => this.loop(time));
  }

  destroy() {
    if (this.animationFrameId === null) return;
    this.exitTree();
  }
}
