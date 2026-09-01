import { FixedStepRunner } from '../core/FixedStepRunner.js';
import { SceneNode } from '../core/SceneNode.js';
import { GameScene } from '../game/GameScene.js';
import { EQUIPMENT_CATALOG } from '../game/equipment/EquipmentProfiles.js';
import { ENCOUNTER_PROFILES } from '../game/encounter/EncounterProfiles.js';
import { createProgressionSnapshot } from '../game/progression/ProgressionState.js';
import { COMBAT_PROGRESSION_PROFILE } from '../game/progression/ProgressionProfiles.js';
import { ProgressionStorage } from '../game/progression/ProgressionStorage.js';
import { ACADEMY_VILLAGE_MAP } from '../game/maps/academyVillage.js';
import { TRAINING_ENCOUNTER_SCENE } from '../game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../game/training/TrainingEnemyAttackProfiles.js';
import { GameInputController } from '../input/GameInputController.js';
import { Camera2D } from '../rendering/Camera2D.js';
import { CanvasHost } from '../rendering/CanvasHost.js';
import { CanvasPolygonRenderer } from '../rendering/CanvasPolygonRenderer.js';
import { CanvasRetroRenderer } from '../rendering/CanvasRetroRenderer.js';
import { readVisualQaRequest } from './VisualQaConfig.js';
import { projectDialogue } from './DialoguePresentation.js';

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
    typeof uiBridge.setWorldStatus !== 'function' ||
    typeof uiBridge.setDialoguePresentation !== 'function' ||
    typeof uiBridge.setSaveStatus !== 'function'
  ) {
    throw new TypeError(
      'GameApp UI bridge에는 snapshot, stats와 world/dialogue status writer가 필요합니다.',
    );
  }
  return uiBridge;
}

const PROGRESSION_STORAGE_KEY = 'polygon-rpg.progression.v1';

function createProgressionStorage() {
  try {
    return Object.freeze({
      ok: true,
      storage: new ProgressionStorage(window.localStorage, PROGRESSION_STORAGE_KEY),
    });
  } catch {
    return Object.freeze({
      ok: false,
      reason: 'storage-unavailable',
      message: '저장소를 사용할 수 없습니다. 새 진행은 이 세션에서만 유지됩니다.',
    });
  }
}

function createTrainingEncounter(options) {
  return TRAINING_ENCOUNTER_SCENE.instantiate({
    ...options,
    encounterProfiles: ENCOUNTER_PROFILES,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
  });
}

export class GameApp extends SceneNode {
  constructor({ gameCanvas, polygonCanvas, retroCanvas }) {
    super('GameApp');
    const equipmentIds = EQUIPMENT_CATALOG.profiles.map((profile) => profile.id);
    const freshProgression = createProgressionSnapshot(EQUIPMENT_CATALOG.defaultProfileId);
    this.visualQaRequest = readVisualQaRequest();
    this.isVisualQa = Boolean(this.visualQaRequest);
    this.progressionStorage = null;
    if (this.isVisualQa) {
      this.progressionLoadResult = Object.freeze({
        ok: true,
        kind: 'visual-qa-fresh',
        snapshot: freshProgression,
      });
    } else {
      const storageResult = createProgressionStorage();
      if (storageResult.ok) {
        this.progressionStorage = storageResult.storage;
        this.progressionLoadResult = this.progressionStorage.load(
          EQUIPMENT_CATALOG.defaultProfileId,
          equipmentIds,
        );
      } else {
        this.progressionLoadResult = storageResult;
      }
    }
    this.autosaveEnabled = Boolean(
      !this.isVisualQa && this.progressionStorage && this.progressionLoadResult.ok,
    );
    const progressionSnapshot = this.progressionLoadResult.ok
      ? this.progressionLoadResult.snapshot
      : freshProgression;
    this.scene = this.addChild(
      new GameScene({
        mapDefinition: ACADEMY_VILLAGE_MAP,
        equipmentCatalog: EQUIPMENT_CATALOG,
        combatProgressionProfile: COMBAT_PROGRESSION_PROFILE,
        encounterFactory: createTrainingEncounter,
        encounterAttackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
        progressionSnapshot,
      }),
    );
    this.camera = new Camera2D();

    this.gameHost = new CanvasHost(assertCanvas(gameCanvas, 'Game Canvas'));
    this.polygonHost = new CanvasHost(assertCanvas(polygonCanvas, 'Polygon Canvas'));
    this.retroHost = new CanvasHost(assertCanvas(retroCanvas, 'Retro Canvas'));

    this.gameRenderer = new CanvasRetroRenderer(this.gameHost, this.camera);
    this.visualQaPolygonRenderer = new CanvasPolygonRenderer(this.gameHost, this.camera);
    this.polygonRenderer = new CanvasPolygonRenderer(this.polygonHost, this.camera);
    this.retroRenderer = new CanvasRetroRenderer(this.retroHost, this.camera);

    this.uiBridge = null;
    this.manualMode = false;
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

  start({ manual = false } = {}) {
    if (!this.uiBridge) throw new Error('GameApp.start() 전에 UI bridge를 연결해야 합니다.');
    if (this.isInsideTree) return;
    this.manualMode = Boolean(manual);
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
    this.connectTo(this.scene.progressionChanged, (snapshot) => {
      this.saveProgression(snapshot);
    });
    this.uiBridge.setSaveStatus(this.initialSaveStatus());
    if (this.progressionLoadResult.ok && this.progressionLoadResult.kind === 'migrated') {
      const migrationSave = this.saveProgression(this.scene.getProgressionSnapshot());
      if (migrationSave.ok) {
        this.uiBridge.setSaveStatus('이전 저장 진행 변환·저장 완료');
      }
    }
    this.resizeObserver.observe(this.gameHost.canvas);
    this.resizeObserver.observe(this.polygonHost.canvas);
    this.resizeObserver.observe(this.retroHost.canvas);
    this.resize();
    if (this.manualMode) return;

    this.input.attach();
    this.abortController = new AbortController();
    this.attachEvents();
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

  initialSaveStatus() {
    if (this.isVisualQa) return '시각 검증용 새 진행 · 저장하지 않음';
    if (!this.progressionLoadResult.ok) return this.progressionLoadResult.message;
    if (this.progressionLoadResult.kind === 'loaded') {
      return '저장 진행 불러옴 · 자동 저장 준비';
    }
    if (this.progressionLoadResult.kind === 'migrated') {
      return '이전 저장 진행 변환됨 · 자동 저장 준비';
    }
    return '새 진행 · 자동 저장 준비';
  }

  saveProgression(snapshot) {
    if (this.isVisualQa) {
      return Object.freeze({
        ok: false,
        reason: 'visual-qa-disabled',
        message: '시각 검증에서는 진행을 저장하지 않습니다.',
      });
    }
    if (!this.autosaveEnabled || !this.progressionStorage) {
      const result = Object.freeze({
        ok: false,
        reason: 'autosave-disabled',
        message: this.progressionLoadResult.ok
          ? '자동 저장을 사용할 수 없습니다. 현재 진행은 이 세션에서만 유지됩니다.'
          : this.progressionLoadResult.message,
      });
      this.uiBridge?.setSaveStatus(result.message);
      return result;
    }
    const result = this.progressionStorage.save(snapshot);
    this.uiBridge?.setSaveStatus(result.ok ? '진행 자동 저장됨' : `저장 실패 · ${result.message}`);
    return result;
  }

  resetSavedProgress() {
    const freshProgression = createProgressionSnapshot(EQUIPMENT_CATALOG.defaultProfileId);
    if (this.isVisualQa || !this.progressionStorage) {
      const result = Object.freeze({
        ok: false,
        reason: this.isVisualQa ? 'visual-qa-disabled' : 'storage-unavailable',
        message: this.isVisualQa
          ? '시각 검증에서는 저장 진행을 변경하지 않습니다.'
          : '저장 진행 초기화 실패 · 저장소를 사용할 수 없어 현재 진행을 유지합니다.',
      });
      this.uiBridge?.setSaveStatus(result.message);
      return result;
    }

    const saveResult = this.progressionStorage.save(freshProgression);
    if (!saveResult.ok) {
      const result = Object.freeze({
        ok: false,
        reason: saveResult.reason,
        message: `저장 진행 초기화 실패 · 현재 진행 유지 · ${saveResult.message}`,
      });
      this.uiBridge?.setSaveStatus(result.message);
      return result;
    }

    this.autosaveEnabled = true;
    this.progressionLoadResult = Object.freeze({
      ok: true,
      kind: 'reset',
      snapshot: freshProgression,
    });
    this.input.clear({ resetSequences: true });
    this.scene.restoreProgression(freshProgression);
    this.runner.reset(performance.now());
    this.uiBridge?.setSaveStatus('저장 진행 초기화 완료 · 새 진행 자동 저장 준비');
    return Object.freeze({ ok: true, kind: 'reset', snapshot: freshProgression });
  }

  runVisualQa({ start, frame, renderer, phase, scenario }) {
    if (!scenario || typeof scenario !== 'object') {
      throw new TypeError('Visual QA scenario가 필요합니다.');
    }
    this.start({ manual: true });
    this.scene.reset();
    if (scenario.progressionSnapshot || scenario.firstJourneySnapshot) {
      const progression = this.scene.getProgressionSnapshot();
      this.scene.restoreProgression(
        Object.freeze({
          ...progression,
          ...scenario.progressionSnapshot,
          firstJourney: scenario.firstJourneySnapshot
            ? Object.freeze({
                ...progression.firstJourney,
                ...scenario.firstJourneySnapshot,
              })
            : progression.firstJourney,
        }),
      );
    }
    if (scenario.timePhase) this.scene.setVisualQaTimePhase(scenario.timePhase);
    this.scene.setVisualQaLocation(scenario);
    this.resize();

    const inputSnapshot = this.createInputSnapshot();
    const simulationSettings = this.createSimulationSettings(
      Object.freeze({ screen: GAME_SCREEN.GAME, animationSpeed: 1 }),
    );
    for (let index = 0; index < frame; index += 1) {
      this.fixedProcess(1 / 120, {
        inputSnapshot,
        simulationSettings,
        active: true,
      });
    }
    if (scenario.dialogueScenarioId) {
      this.fixedProcess(1 / 120, {
        inputSnapshot: Object.freeze({
          ...inputSnapshot,
          jump: true,
          jumpSequence: (inputSnapshot.jumpSequence ?? 0) + 1,
        }),
        simulationSettings,
        active: true,
      });
      const dialogueFrames = { start: 0, active: 72, end: 1_200 }[phase] ?? 0;
      for (let index = 0; index < dialogueFrames; index += 1) {
        this.fixedProcess(1 / 120, { inputSnapshot, simulationSettings, active: true });
      }
    }
    if (scenario.combatScenarioId)
      this.scene.setVisualQaCombatScenario(scenario.combatScenarioId, phase);
    if (scenario.poseScenarioId) this.scene.setVisualQaPoseScenario(scenario.poseScenarioId);
    const renderFrame = this.scene.createRenderFrame(0);
    const itemIds = renderFrame.items.map((item) => item.id);
    const expectedEvent = scenario.expectation?.expectedEvent;
    const expectedMotion = scenario.expectation?.expectedMotion;
    const expectedItem = scenario.expectation?.expectedItem;
    const expectedContact = scenario.expectation?.expectedContact;
    const expectedRetaliation = scenario.expectation?.expectedRetaliation;
    const expectedAnchor = scenario.expectation?.expectedAnchor;
    const expectedStamina = scenario.expectation?.expectedStamina;
    const dialogue = this.scene.getWorldStatus().dialogue;
    const expectedDialogueTarget = scenario.expectation?.expectedDialogueTarget;
    const expectedDialogueSpeaker = scenario.expectation?.expectedDialogueSpeaker;
    const expectedItems = scenario.expectation?.expectedItems ?? [];
    const expectedAbsentItems = scenario.expectation?.expectedAbsentItems ?? [];
    const expectedTimePhase = scenario.expectation?.expectedTimePhase;
    const expectedPatchIds = scenario.expectation?.expectedPatchIds ?? [];
    const expectedPortalIds = scenario.expectation?.expectedPortalIds;
    const portalIds = renderFrame.map.portalIds;
    const expectedCombatEvent = renderFrame.combatEvents.find(
      (event) => event.type === expectedEvent,
    );
    const expectedRenderItem = renderFrame.items.find((item) => item.id === expectedItem);
    const anchorMatches = (() => {
      if (!expectedAnchor) return true;
      if (expectedAnchor === 'event-contact') {
        if (
          !expectedCombatEvent ||
          !renderFrame.combatContact ||
          !expectedRenderItem?.points?.length
        )
          return false;
        const eventMatchesContact =
          expectedCombatEvent.position.x === renderFrame.combatContact.position.x &&
          expectedCombatEvent.position.y === renderFrame.combatContact.position.y;
        const effectCenter = expectedRenderItem.points.reduce(
          (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
          { x: 0, y: 0 },
        );
        effectCenter.x /= expectedRenderItem.points.length;
        effectCenter.y /= expectedRenderItem.points.length;
        return (
          eventMatchesContact &&
          Math.hypot(
            effectCenter.x - expectedCombatEvent.position.x,
            effectCenter.y - expectedCombatEvent.position.y,
          ) <= 16
        );
      }
      if (expectedAnchor === 'landing-ground') {
        if (!expectedCombatEvent || !expectedRenderItem?.points?.length) return false;
        const xs = expectedRenderItem.points.map((point) => point.x);
        const groundY = Math.max(...expectedRenderItem.points.map((point) => point.y));
        return (
          expectedCombatEvent.position.x >= Math.min(...xs) - 4 &&
          expectedCombatEvent.position.x <= Math.max(...xs) + 4 &&
          Math.abs(expectedCombatEvent.position.y - groundY) <= 4
        );
      }
      return false;
    })();
    const assertionEvidence = {
      expectedEvent,
      expectedMotion,
      expectedItem,
      expectedAnchor,
      eventPresent:
        expectedEvent === null
          ? renderFrame.combatEvents.length === 0
          : !expectedEvent ||
            renderFrame.combatEvents.some((event) => event.type === expectedEvent),
      motionPresent: !expectedMotion || renderFrame.combatMotion.id === expectedMotion,
      itemPresent: !expectedItem || itemIds.includes(expectedItem),
      contactPresent:
        expectedContact === false
          ? renderFrame.combatContact === null
          : expectedContact === true
            ? renderFrame.combatContact !== null
            : true,
      retaliationPresent:
        expectedRetaliation === true
          ? (renderFrame.combatEnemy?.retaliationSeconds ?? 0) > 0
          : true,
      anchorMatches,
      staminaMatches:
        expectedStamina === undefined || renderFrame.player.stamina === expectedStamina,
      dialogueMatches:
        !expectedDialogueTarget ||
        (dialogue.active === true &&
          dialogue.interactionId === expectedDialogueTarget &&
          dialogue.speaker === expectedDialogueSpeaker &&
          (phase === 'start'
            ? dialogue.visibleLine.length <= 1
            : phase === 'active'
              ? dialogue.visibleLine.length > 0 && dialogue.revealComplete === false
              : dialogue.revealComplete === true) &&
          renderFrame.player.isGrounded === true),
      spatialItemsPresent: expectedItems.every((itemId) => itemIds.includes(itemId)),
      spatialItemsAbsent: expectedAbsentItems.every((itemId) => !itemIds.includes(itemId)),
      timePhaseMatches: !expectedTimePhase || renderFrame.map.timePhase === expectedTimePhase,
      patchIdsMatch: expectedPatchIds.every((patchId) =>
        renderFrame.map.appliedPatchIds.includes(patchId),
      ),
      portalIdsMatch:
        !expectedPortalIds ||
        JSON.stringify(portalIds) === JSON.stringify([...expectedPortalIds].sort()),
    };
    const assertion = Object.freeze({
      ...assertionEvidence,
      passed:
        assertionEvidence.eventPresent &&
        assertionEvidence.motionPresent &&
        assertionEvidence.itemPresent &&
        assertionEvidence.contactPresent &&
        assertionEvidence.retaliationPresent &&
        assertionEvidence.anchorMatches &&
        assertionEvidence.staminaMatches &&
        assertionEvidence.dialogueMatches &&
        assertionEvidence.spatialItemsPresent &&
        assertionEvidence.spatialItemsAbsent &&
        assertionEvidence.timePhaseMatches &&
        assertionEvidence.patchIdsMatch &&
        assertionEvidence.portalIdsMatch,
    });
    if (!assertion.passed) {
      throw new Error(`Visual QA scenario assertion failed: ${start}`);
    }
    const result = Object.freeze({
      ready: true,
      start,
      frame,
      renderer,
      phase,
      reducedMotion: this.prefersReducedMotion(),
      cameraFeedbackEnabled: simulationSettings.cameraFeedbackEnabled,
      mapId: renderFrame.map.id,
      regionId: renderFrame.map.activeRegionId,
      roomId: renderFrame.map.activeRoomId,
      timePhase: renderFrame.map.timePhase,
      appliedPatchIds: renderFrame.map.appliedPatchIds,
      portalIds: Object.freeze(portalIds),
      itemCount: renderFrame.items.length,
      assertion,
      combatMotion: renderFrame.combatMotion,
      combatEvents: renderFrame.combatEvents,
      combatContact: renderFrame.combatContact,
      dialogue,
      player: renderFrame.player,
      combatEnemy: renderFrame.combatEnemy,
      keyItems: Object.freeze(
        renderFrame.items
          .filter((item) =>
            [
              'hair-fringe',
              'uniform-front-panel',
              'shield',
              'sword-blade',
              'front-boot',
              'combat-enemy-training-mask',
              expectedItem,
              ...expectedItems,
            ].includes(item.id),
          )
          .map((item) => Object.freeze({ id: item.id, points: item.points })),
      ),
      viewport: Object.freeze({
        width: this.gameHost.canvas.clientWidth,
        height: this.gameHost.canvas.clientHeight,
        backingWidth: this.gameHost.viewport.backingWidth,
        backingHeight: this.gameHost.viewport.backingHeight,
      }),
    });
    globalThis.__POLYGON_RPG_VISUAL_QA__ = result;
    globalThis.__POLYGON_RPG_VISUAL_QA_RENDER__ = () => this.renderFrame(renderFrame);
    return result;
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

  purchaseEquipment(profileId) {
    return this.scene.purchaseEquipment(profileId);
  }

  trainCombatSkill() {
    return this.scene.trainCombatSkill();
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
      cameraFeedbackEnabled: !this.prefersReducedMotion(),
    });
  }

  prefersReducedMotion() {
    return Boolean(this.visualQaRequest?.reducedMotion || this.reducedMotionQuery.matches);
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
    this.uiBridge.setDialoguePresentation(
      projectDialogue(
        this.scene.getWorldStatus().dialogue,
        renderFrame,
        this.gameHost.viewport,
        this.camera.worldSize,
      ),
    );
    if (this.isVisualQa) {
      const renderer =
        this.visualQaRequest.renderer === 'polygon'
          ? this.visualQaPolygonRenderer
          : this.gameRenderer;
      this.latestRenderStats = renderer.render(renderFrame, GAME_RENDER_SETTINGS);
      return;
    }
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
    if (this.isInsideTree) this.exitTree();
  }
}
