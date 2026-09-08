import { FixedStepRunner } from '../core/FixedStepRunner.js';
import { SceneNode } from '../core/SceneNode.js';
import { createGameScene } from './createGameScene.js';
import { EQUIPMENT_CATALOG } from '../game/equipment/EquipmentProfiles.js';
import { ENCHANTMENT_CATALOG } from '../game/enchantment/EnchantmentCatalog.js';
import { createProgressionSnapshot } from '../game/progression/ProgressionState.js';
import { COMBAT_PROGRESSION_PROFILE } from '../game/progression/ProgressionProfiles.js';
import { ProgressionStorage } from '../game/progression/ProgressionStorage.js';
import {
  createInitialMorningRecoveryRequest,
  createPostProgressionRecoveryRequests,
  createPreActionRecoveryRequest,
  createRecoverySlotReadModel,
} from '../game/progression/CampaignRecoveryPolicy.js';
import { SCRAP_AWAKENING_MAP } from '../game/maps/scrapAwakening.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../game/campaign/ScrapCampaignProfiles.js';
import { GameInputController } from '../input/GameInputController.js';
import { Camera2D } from '../rendering/Camera2D.js';
import { readVisualQaRequest } from './VisualQaConfig.js';
import { CanvasHost } from '../rendering/CanvasHost.js';
import { CanvasPolygonRenderer } from '../rendering/CanvasPolygonRenderer.js';
import { CanvasRetroRenderer } from '../rendering/CanvasRetroRenderer.js';
import { projectDialogue } from './DialoguePresentation.js';

export const GAME_SCREEN = Object.freeze({
  MENU: 'menu',
  GAME: 'game',
  RENDER_LAB: 'render-lab',
});

const GAME_RENDER_SETTINGS = Object.freeze({
  pixelSize: 3,
  pixelSnap: true,
  alphaThresholdEnabled: true,
  alphaThreshold: 128,
  posterizationLevels: 5,
  outlineWidth: 1,
  showMesh: false,
  showPixelGrid: false,
  showWorldGrid: false,
});

export function resolveReducedMotionPreference({ visualQaRequest, systemMatches }) {
  if (visualQaRequest) return Boolean(visualQaRequest.reducedMotion);
  return Boolean(systemMatches);
}

export function readQaInputScenario(search = globalThis.location?.search ?? '') {
  const parameters = new URLSearchParams(search);
  if (parameters.get('inputQa') !== '1') return null;
  const start = parameters.get('inputQaStart');
  if (!start) return null;
  return readVisualQaRequest(`?visualQa=1&gameStart=${encodeURIComponent(start)}`).scenario;
}

export function resolveInitialMapDefinition() {
  return SCRAP_AWAKENING_MAP;
}

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
    typeof uiBridge.setQaInputStatus !== 'function' ||
    typeof uiBridge.setPlayerStatus !== 'function' ||
    typeof uiBridge.setWorldStatus !== 'function' ||
    typeof uiBridge.setDialoguePresentation !== 'function' ||
    typeof uiBridge.setSaveStatus !== 'function' ||
    typeof uiBridge.setRecoverySlots !== 'function' ||
    typeof uiBridge.requestOperationMap !== 'function' ||
    typeof uiBridge.requestCampaignActionPreview !== 'function'
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
      storage: new ProgressionStorage(
        window.localStorage,
        PROGRESSION_STORAGE_KEY,
        ENCHANTMENT_CATALOG,
        COMBAT_PROGRESSION_PROFILE.weaponForge,
        SCRAP_CAMPAIGN_PROFILE,
      ),
    });
  } catch {
    return Object.freeze({
      ok: false,
      reason: 'storage-unavailable',
      message: '저장소를 사용할 수 없습니다. 새 진행은 이 세션에서만 유지됩니다.',
    });
  }
}

export class GameApp extends SceneNode {
  constructor({
    gameCanvas,
    polygonCanvas,
    retroCanvas,
    visualQaRequest = null,
    qaInputEnabled = false,
  }) {
    super('GameApp');
    this.qaInputEnabled = qaInputEnabled;
    this.qaInputScenario = qaInputEnabled ? readQaInputScenario() : null;
    this.qaInputPolygon =
      qaInputEnabled &&
      new URLSearchParams(globalThis.location?.search ?? '').get('inputQaRenderer') === 'polygon';
    const equipmentIds = EQUIPMENT_CATALOG.profiles.map((profile) => profile.id);
    this.equipmentIds = Object.freeze([...equipmentIds]);
    const freshProgression = createProgressionSnapshot(
      EQUIPMENT_CATALOG.defaultProfileId,
      ENCHANTMENT_CATALOG,
      SCRAP_CAMPAIGN_PROFILE,
    );
    this.visualQaRequest = visualQaRequest;
    this.isVisualQa = Boolean(this.visualQaRequest);
    this.visualQaRecoveryRecords = new Map();
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
          ENCHANTMENT_CATALOG,
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
    this.lastObservedProgressionSnapshot = progressionSnapshot;
    const mapDefinition = resolveInitialMapDefinition({
      visualQaRequest: this.visualQaRequest,
      qaInputScenario: this.qaInputScenario,
    });
    this.scene = this.addChild(createGameScene({ mapDefinition, progressionSnapshot }));
    if (qaInputEnabled) {
      this.scene.setVisualQaCombatOverlay(
        new URLSearchParams(globalThis.location?.search ?? '').get('inputQaOverlay') === '1',
      );
    }
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
      qaInputEnabled,
      isActive: () => {
        const uiState = this.uiBridge?.snapshot();
        return (
          uiState?.screen === GAME_SCREEN.GAME &&
          uiState?.debugPanelOpen !== true &&
          uiState?.graphicsReviewOpen !== true &&
          uiState?.operationMapOpen !== true &&
          uiState?.campaignActionPreviewOpen !== true &&
          uiState?.gameOverOpen !== true
        );
      },
    });
    this.animationFrameId = null;
    this.abortController = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.frameSamples = { count: 0, startTime: performance.now(), fps: 0 };
    this.latestRenderStats = { logicalWidth: 1, logicalHeight: 1 };
    this.latestVisualQaRenderFrame = null;
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
      if (status.campaign.gameOver) this.refreshRecoverySlots();
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
    this.connectTo(this.scene.operationMapRequested, () => {
      this.uiBridge.requestOperationMap();
    });
    this.connectTo(this.scene.campaignActionPreviewRequested, (request) => {
      this.uiBridge.requestCampaignActionPreview(request);
    });
    this.uiBridge.setSaveStatus(this.initialSaveStatus());
    const initialMorningRequest = createInitialMorningRecoveryRequest(
      this.scene.getProgressionSnapshot(),
      SCRAP_CAMPAIGN_PROFILE,
    );
    if (initialMorningRequest) this.saveRecoveryRequest(initialMorningRequest, { quiet: true });
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
    if (
      this.qaInputEnabled &&
      globalThis.__POLYGON_RPG_INPUT_QA_ACTOR_PNG__ === this.qaPixelExporter
    ) {
      delete globalThis.__POLYGON_RPG_INPUT_QA_ACTOR_PNG__;
      delete globalThis.__POLYGON_RPG_INPUT_QA__;
    }
    if (this.qaActorSurface) {
      this.qaActorSurface.canvas.width = 0;
      this.qaActorSurface.canvas.height = 0;
      this.qaActorSurface = null;
    }
    this.qaPixelExporter = null;
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
    // Alpine's screen transition can notify the app before this menu action
    // resets the scene.  Let the interactive QA scenario establish its fresh
    // campaign scene again after that reset instead of leaving the URL route
    // on the generic scrapyard opening.
    this.qaInputScenarioInitialized = false;
    this.onScreenChanged();
  }

  initialSaveStatus() {
    if (this.isVisualQa) return '시각 검증용 새 진행 · 저장하지 않음';
    if (!this.progressionLoadResult.ok) return this.progressionLoadResult.message;
    if (this.progressionLoadResult.kind === 'loaded') {
      return '저장 진행 불러옴 · 자동 저장 준비';
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
    const previousSnapshot = this.lastObservedProgressionSnapshot;
    this.lastObservedProgressionSnapshot = snapshot;
    const recoveryRequests = createPostProgressionRecoveryRequests(
      previousSnapshot,
      snapshot,
      SCRAP_CAMPAIGN_PROFILE,
    );
    const recoveryFailure = recoveryRequests
      .map((request) => this.saveRecoveryRequest(request, { quiet: true }))
      .find((result) => !result.ok);
    const result = this.progressionStorage.save(snapshot);
    this.uiBridge?.setSaveStatus(
      !result.ok
        ? `저장 실패 · ${result.message}`
        : recoveryFailure
          ? `진행 저장됨 · 복구 지점 실패 · ${recoveryFailure.message}`
          : recoveryRequests.length > 0
            ? '진행·복구 지점 자동 저장됨'
            : '진행 자동 저장됨',
    );
    return result;
  }

  saveCurrentProgress() {
    return this.saveProgression(this.scene.getProgressionSnapshot());
  }

  saveRecoveryRequest(request, { quiet = false } = {}) {
    if (this.isVisualQa) {
      return Object.freeze({ ok: true, kind: 'visual-qa-recovery-skipped' });
    }
    if (!this.autosaveEnabled || !this.progressionStorage) {
      const result = Object.freeze({
        ok: false,
        reason: 'recovery-unavailable',
        message: this.progressionLoadResult.ok
          ? '복구 저장소를 사용할 수 없습니다.'
          : this.progressionLoadResult.message,
      });
      if (!quiet) this.uiBridge?.setSaveStatus(`복구 지점 실패 · ${result.message}`);
      return result;
    }
    const result = this.progressionStorage.saveRecoverySlot(
      request.slotId,
      request.snapshot,
      request.metadata,
    );
    if (!quiet) {
      this.uiBridge?.setSaveStatus(
        result.ok ? `${request.metadata.title} 저장됨` : `복구 지점 실패 · ${result.message}`,
      );
    }
    return result;
  }

  refreshRecoverySlots() {
    if (this.isVisualQa) {
      const restorable = this.visualQaRecoveryRecords.size > 0;
      const result = Object.freeze({
        ok: true,
        restorable,
        message: restorable
          ? '시각 검증용 복구 지점 · 선택 동작 확인 가능'
          : '시각 검증용 복구 지점',
        slots: Object.freeze(
          [...this.visualQaRecoveryRecords.values()].map(createRecoverySlotReadModel),
        ),
      });
      this.uiBridge?.setRecoverySlots(result);
      return result;
    }
    if (!this.progressionStorage) {
      const result = Object.freeze({
        ok: false,
        restorable: false,
        message: '복구 저장소를 사용할 수 없습니다.',
        slots: Object.freeze([]),
      });
      this.uiBridge?.setRecoverySlots(result);
      return result;
    }
    const loaded = this.progressionStorage.loadRecoverySlots(
      EQUIPMENT_CATALOG.defaultProfileId,
      this.equipmentIds,
      ENCHANTMENT_CATALOG,
    );
    const result = loaded.ok
      ? Object.freeze({
          ok: true,
          restorable: true,
          message:
            loaded.records.length > 0
              ? '다시 시작할 작전 기록을 고르세요.'
              : '사용 가능한 복구 지점이 없습니다.',
          slots: Object.freeze(loaded.records.map(createRecoverySlotReadModel)),
        })
      : Object.freeze({
          ok: false,
          restorable: false,
          message: loaded.message,
          slots: Object.freeze([]),
        });
    this.uiBridge?.setRecoverySlots(result);
    return result;
  }

  restoreRecoverySlot(slotId) {
    if (this.isVisualQa) {
      const snapshot = this.visualQaRecoveryRecords.get(slotId)?.snapshot;
      if (!snapshot) {
        const result = Object.freeze({
          ok: false,
          reason: 'visual-qa-recovery-missing',
          message: '시각 검증용 복구 지점이 없습니다.',
        });
        this.uiBridge?.setSaveStatus(result.message);
        return result;
      }
      this.input.clear({ resetSequences: true });
      this.scene.restoreProgression(snapshot);
      this.runner.reset(performance.now());
      this.uiBridge?.setSaveStatus('시각 검증용 행동 직전 기록에서 작전 재개');
      return Object.freeze({ ok: true, kind: 'visual-qa-recovered', slotId, snapshot });
    }
    if (!this.progressionStorage) {
      const result = Object.freeze({
        ok: false,
        reason: 'storage-unavailable',
        message: '복구 저장소를 사용할 수 없습니다.',
      });
      this.uiBridge?.setSaveStatus(result.message);
      return result;
    }
    const loaded = this.progressionStorage.loadRecoverySlots(
      EQUIPMENT_CATALOG.defaultProfileId,
      this.equipmentIds,
      ENCHANTMENT_CATALOG,
    );
    if (!loaded.ok) {
      this.uiBridge?.setSaveStatus(`복구 실패 · ${loaded.message}`);
      return loaded;
    }
    const record = loaded.records.find((candidate) => candidate.slotId === slotId);
    if (!record) {
      const result = Object.freeze({
        ok: false,
        reason: 'recovery-slot-missing',
        message: '선택한 복구 지점이 더 이상 없습니다.',
      });
      this.uiBridge?.setSaveStatus(`복구 실패 · ${result.message}`);
      return result;
    }

    const saveResult = this.progressionStorage.save(record.snapshot);
    if (!saveResult.ok) {
      this.uiBridge?.setSaveStatus(`복구 실패 · ${saveResult.message} · 현재 상태 유지`);
      return saveResult;
    }
    this.lastObservedProgressionSnapshot = record.snapshot;
    this.progressionLoadResult = Object.freeze({
      ok: true,
      kind: 'recovered',
      snapshot: record.snapshot,
    });
    this.autosaveEnabled = true;
    this.input.clear({ resetSequences: true });
    this.scene.restoreProgression(record.snapshot);
    this.runner.reset(performance.now());
    this.uiBridge?.setSaveStatus(`${record.metadata.title}에서 작전 재개`);
    return Object.freeze({ ok: true, kind: 'recovered', slotId, snapshot: record.snapshot });
  }

  resetSavedProgress() {
    const freshProgression = createProgressionSnapshot(
      EQUIPMENT_CATALOG.defaultProfileId,
      ENCHANTMENT_CATALOG,
      SCRAP_CAMPAIGN_PROFILE,
    );
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
    this.lastObservedProgressionSnapshot = freshProgression;
    this.scene.restoreProgression(freshProgression);
    const clearRecoveryResult = this.progressionStorage.clearRecoverySlots();
    const initialMorningRequest = createInitialMorningRecoveryRequest(
      freshProgression,
      SCRAP_CAMPAIGN_PROFILE,
    );
    if (initialMorningRequest) this.saveRecoveryRequest(initialMorningRequest, { quiet: true });
    this.runner.reset(performance.now());
    this.uiBridge?.setSaveStatus(
      clearRecoveryResult.ok
        ? '저장 진행·복구 지점 초기화 완료 · 새 진행 자동 저장 준비'
        : `저장 진행 초기화 완료 · 이전 복구 지점 정리 실패 · ${clearRecoveryResult.message}`,
    );
    return Object.freeze({ ok: true, kind: 'reset', snapshot: freshProgression });
  }

  prepareUiReview(presentation) {
    if (!this.isVisualQa)
      throw new Error('UI 리소스 검토에는 저장 없는 Visual QA context가 필요합니다.');
    if (presentation !== 'action') return;
    const request = readVisualQaRequest('?visualQa=1&gameStart=scrap-garage-0');
    this.runVisualQa(request);
    const portal = this.scene.mapRuntime
      .getResolvedMap()
      .portals.find((entry) => entry.campaignTravel);
    if (!portal) throw new Error('현재 고물상에 캠페인 연결로가 없습니다.');
    this.scene.requestScrapCampaignTravel(portal);
  }

  applyVisualQaCampaignPresentation(scenario) {
    if (scenario.scrapAwakeningStageId) {
      this.scene.setVisualQaScrapAwakeningStage(scenario.scrapAwakeningStageId);
    }
    if (scenario.scrapGarageRevealStageId) {
      this.scene.setVisualQaScrapGarageRevealStage(scenario.scrapGarageRevealStageId);
    }
    for (const scrapRegionState of scenario.scrapRegionStates ??
      (scenario.scrapRegionState ? [scenario.scrapRegionState] : [])) {
      this.scene.setVisualQaScrapRegionState(scrapRegionState);
    }
    if (scenario.scrapIssueState) {
      this.scene.setVisualQaScrapIssueState(scenario.scrapIssueState);
    }
    if (scenario.scrapFinalBattleStageId) {
      this.scene.setVisualQaScrapFinalBattleStage(scenario.scrapFinalBattleStageId);
    }
  }

  runVisualQa({ start, frame, renderer, phase, scenario }) {
    if (!scenario || typeof scenario !== 'object') {
      throw new TypeError('Visual QA scenario가 필요합니다.');
    }
    this.start({ manual: true });
    this.scene.reset();
    if (scenario.progressionSnapshot || scenario.enchantmentSnapshot) {
      const progression = this.scene.getProgressionSnapshot();
      this.scene.restoreProgression(
        Object.freeze({
          ...progression,
          ...scenario.progressionSnapshot,
          enchantment: scenario.enchantmentSnapshot
            ? Object.freeze({ ...progression.enchantment, ...scenario.enchantmentSnapshot })
            : progression.enchantment,
        }),
      );
    }
    if (scenario.timePhase) this.scene.setVisualQaTimePhase(scenario.timePhase);
    this.applyVisualQaCampaignPresentation(scenario);
    if (scenario.scrapLastSegment) this.scene.setVisualQaScrapLastSegment();
    if (scenario.scrapGameOverStageId) {
      const recoverySnapshot = this.scene.getProgressionSnapshot();
      const fresh = createProgressionSnapshot(
        EQUIPMENT_CATALOG.defaultProfileId,
        ENCHANTMENT_CATALOG,
        SCRAP_CAMPAIGN_PROFILE,
      );
      const requests = [
        createInitialMorningRecoveryRequest(fresh, SCRAP_CAMPAIGN_PROFILE),
        ...createPostProgressionRecoveryRequests(fresh, recoverySnapshot, SCRAP_CAMPAIGN_PROFILE),
        createPreActionRecoveryRequest(
          recoverySnapshot,
          this.scene.createScrapCampaignRestAction(),
          SCRAP_CAMPAIGN_PROFILE,
        ),
      ].filter(Boolean);
      this.visualQaRecoveryRecords = new Map(requests.map((request) => [request.slotId, request]));
      this.scene.setVisualQaScrapGameOverStage(scenario.scrapGameOverStageId);
      this.refreshRecoverySlots();
    }
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
    // gameFrame is neutral presentation pre-roll. Restore the authored checkpoint
    // before user input begins; a later reset would discard dialogue and timeline results.
    if (frame > 0) this.applyVisualQaCampaignPresentation(scenario);
    for (const segment of scenario.inputTimelineByPhase?.[phase] ?? []) {
      if (!Number.isInteger(segment.frames) || segment.frames < 1) {
        throw new RangeError('Visual QA input timeline frame은 양의 정수여야 합니다.');
      }
      const scriptedInput = Object.freeze({ ...inputSnapshot, ...segment.input });
      for (let index = 0; index < segment.frames; index += 1) {
        this.fixedProcess(1 / 120, {
          inputSnapshot: scriptedInput,
          simulationSettings,
          active: true,
        });
      }
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
    const expectation = Object.freeze({
      ...scenario.expectation,
      ...scenario.phaseExpectations?.[phase],
    });
    const expectedEvent = expectation.expectedEvent;
    const expectedMotion = expectation.expectedMotion;
    const expectedItem = expectation.expectedItem;
    const expectedContact = expectation.expectedContact;
    const expectedRetaliation = expectation.expectedRetaliation;
    const expectedAnchor = expectation.expectedAnchor;
    const expectedEffectProgressMinimum = expectation.expectedEffectProgressMinimum;
    const expectedStamina = expectation.expectedStamina;
    const expectedPlayerGrounded = expectation.expectedPlayerGrounded;
    const expectedPlayerYRange = expectation.expectedPlayerYRange;
    const dialogue = this.scene.getWorldStatus().dialogue;
    const expectedDialogueTarget = expectation.expectedDialogueTarget;
    const expectedDialogueSpeaker = expectation.expectedDialogueSpeaker;
    const expectedItems = expectation.expectedItems ?? [];
    const expectedAbsentItems = expectation.expectedAbsentItems ?? [];
    const expectedTimePhase = expectation.expectedTimePhase;
    const expectedPatchIds = expectation.expectedPatchIds ?? [];
    const expectedPortalIds = expectation.expectedPortalIds;
    const expectedMaterialId = expectation.expectedMaterialId;
    const expectedMaterialQuantity = expectation.expectedMaterialQuantity;
    const expectedProgressionNotice = expectation.expectedProgressionNotice;
    const expectedAwakeningStageId = expectation.expectedAwakeningStageId;
    const expectedAwakeningActive = expectation.expectedAwakeningActive;
    const expectedGarageRevealStageId = expectation.expectedGarageRevealStageId;
    const expectedGarageRevealActive = expectation.expectedGarageRevealActive;
    const expectedPrimaryIssueId = expectation.expectedPrimaryIssueId;
    const expectedLinkedIssueCount = expectation.expectedLinkedIssueCount;
    const expectedCompletedLinkedIssueCount = expectation.expectedCompletedLinkedIssueCount;
    const expectedLastChangeLabel = expectation.expectedLastChangeLabel;
    const expectedGameOverStageId = expectation.expectedGameOverStageId;
    const portalIds = renderFrame.map.portalIds;
    const progression = this.scene.getProgressionSnapshot();
    const worldStatus = this.scene.getWorldStatus();
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
      effectProgressMatches:
        expectedEffectProgressMinimum === undefined ||
        (expectedCombatEvent !== undefined &&
          1 - expectedCombatEvent.remainingSeconds / expectedCombatEvent.durationSeconds >=
            expectedEffectProgressMinimum),
      staminaMatches:
        expectedStamina === undefined || renderFrame.player.stamina === expectedStamina,
      playerGroundedMatches:
        expectedPlayerGrounded === undefined ||
        renderFrame.player.isGrounded === expectedPlayerGrounded,
      playerYMatches:
        expectedPlayerYRange === undefined ||
        (Array.isArray(expectedPlayerYRange) &&
          expectedPlayerYRange.length === 2 &&
          renderFrame.player.position.y >= expectedPlayerYRange[0] &&
          renderFrame.player.position.y <= expectedPlayerYRange[1]),
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
      materialQuantityMatches:
        !expectedMaterialId ||
        progression.enchantment.materialQuantities[expectedMaterialId] === expectedMaterialQuantity,
      progressionNoticeMatches:
        !expectedProgressionNotice || worldStatus.progressionNotice === expectedProgressionNotice,
      awakeningStageMatches:
        !expectedAwakeningStageId ||
        worldStatus.campaign.awakeningStageId === expectedAwakeningStageId,
      awakeningActiveMatches:
        expectedAwakeningActive === undefined ||
        worldStatus.campaign.awakeningActive === expectedAwakeningActive,
      garageRevealStageMatches:
        !expectedGarageRevealStageId ||
        worldStatus.campaign.garageRevealStageId === expectedGarageRevealStageId,
      garageRevealActiveMatches:
        expectedGarageRevealActive === undefined ||
        worldStatus.campaign.garageRevealActive === expectedGarageRevealActive,
      primaryIssueMatches:
        !expectedPrimaryIssueId ||
        worldStatus.campaign.issueWindow.primary?.id === expectedPrimaryIssueId,
      linkedIssueCountMatches:
        expectedLinkedIssueCount === undefined ||
        worldStatus.campaign.issueWindow.linkedCount === expectedLinkedIssueCount,
      completedLinkedIssueCountMatches:
        expectedCompletedLinkedIssueCount === undefined ||
        worldStatus.campaign.issueWindow.completedLinkedCount === expectedCompletedLinkedIssueCount,
      lastChangeLabelMatches:
        !expectedLastChangeLabel ||
        worldStatus.campaign.lastChangeLabel === expectedLastChangeLabel,
      gameOverStageMatches:
        !expectedGameOverStageId ||
        worldStatus.gameOverPresentation.stageId === expectedGameOverStageId,
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
        assertionEvidence.effectProgressMatches &&
        assertionEvidence.staminaMatches &&
        assertionEvidence.playerGroundedMatches &&
        assertionEvidence.playerYMatches &&
        assertionEvidence.dialogueMatches &&
        assertionEvidence.spatialItemsPresent &&
        assertionEvidence.spatialItemsAbsent &&
        assertionEvidence.timePhaseMatches &&
        assertionEvidence.patchIdsMatch &&
        assertionEvidence.portalIdsMatch &&
        assertionEvidence.materialQuantityMatches &&
        assertionEvidence.progressionNoticeMatches &&
        assertionEvidence.awakeningStageMatches &&
        assertionEvidence.awakeningActiveMatches &&
        assertionEvidence.garageRevealStageMatches &&
        assertionEvidence.garageRevealActiveMatches &&
        assertionEvidence.primaryIssueMatches &&
        assertionEvidence.linkedIssueCountMatches &&
        assertionEvidence.completedLinkedIssueCountMatches &&
        assertionEvidence.lastChangeLabelMatches &&
        assertionEvidence.gameOverStageMatches,
    });
    if (!assertion.passed) {
      const failedChecks = Object.entries(assertionEvidence)
        .filter(([, passed]) => passed === false)
        .map(([check]) => check)
        .join(', ');
      throw new Error(`Visual QA scenario assertion failed: ${start} (${failedChecks})`);
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
      progressionNotice: worldStatus.progressionNotice,
      awakeningStageId: worldStatus.campaign.awakeningStageId,
      garageRevealStageId: worldStatus.campaign.garageRevealStageId,
      issueWindow: worldStatus.campaign.issueWindow,
      lastChangeLabel: worldStatus.campaign.lastChangeLabel,
      gameOverStageId: worldStatus.gameOverPresentation.stageId,
      materialQuantities: progression.enchantment.materialQuantities,
      player: renderFrame.player,
      combatEnemy: renderFrame.combatEnemy,
      keyItems: Object.freeze(
        renderFrame.items
          .filter((item) =>
            [
              'goggles-lenses',
              'tool-bag',
              'workwear-repair-patch',
              'shield',
              'sword-blade',
              'front-boot',
              'combat-enemy-collector-eye',
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
    if (
      this.qaInputEnabled &&
      !this.qaInputScenarioInitialized &&
      this.uiBridge.snapshot().screen === GAME_SCREEN.GAME
    ) {
      this.qaInputScenarioInitialized = true;
      const scenario = this.qaInputScenario;
      if (scenario) {
        // Only establish an existing scene. Do not run its scripted combat,
        // input timeline, forced contact, or expectation-resolution helpers.
        if (scenario.scrapAwakeningStageId)
          this.scene.setVisualQaScrapAwakeningStage(scenario.scrapAwakeningStageId);
        if (scenario.scrapGarageRevealStageId)
          this.scene.setVisualQaScrapGarageRevealStage(scenario.scrapGarageRevealStageId);
        const regionStates =
          scenario.scrapRegionStates ??
          (scenario.scrapRegionState ? [scenario.scrapRegionState] : []);
        if (scenario.inputQaFreshRegion) {
          for (const state of regionStates)
            this.scene.setInputQaScrapRegionStart({ regionId: state.regionId });
        } else {
          for (const state of regionStates) this.scene.setVisualQaScrapRegionState(state);
        }
        const qaX = new URLSearchParams(globalThis.location?.search ?? '').get('inputQaX');
        const x = qaX === null || qaX === '' ? scenario.x : Number(qaX);
        if (!Number.isFinite(x)) throw new TypeError('inputQaX must be a finite scene coordinate');
        this.scene.setVisualQaLocation({ ...scenario, x });
      }
    }
    this.input.clear();
    this.frameSamples = { count: 0, startTime: performance.now(), fps: 0 };
    this.runner.reset(performance.now());
    this.runner.resetDiagnostics();
    this.resize();
  }

  toggleWorldTime() {
    this.scene.toggleTimePhase();
  }

  trainCombatSkill() {
    return this.scene.trainCombatSkill();
  }

  executeDialogueCommand(interactionId, commandId) {
    const result = this.scene.executeDialogueCommand(interactionId, commandId);
    if (this.isVisualQa) this.scene.createRenderFrame(0);
    return result;
  }

  confirmCampaignActionPreview() {
    const pending = this.scene.getPendingScrapCampaignAction();
    if (pending) {
      const recoveryRequest = createPreActionRecoveryRequest(
        this.scene.getProgressionSnapshot(),
        pending.preview,
        SCRAP_CAMPAIGN_PROFILE,
      );
      const recoveryResult = this.saveRecoveryRequest(recoveryRequest);
      if (!recoveryResult.ok) {
        return Object.freeze({
          started: false,
          reason: 'pre-action-recovery-save-failed',
          recoveryResult,
        });
      }
    }
    return this.scene.confirmScrapCampaignAction();
  }

  cancelCampaignActionPreview() {
    return this.scene.cancelScrapCampaignAction();
  }

  resize() {
    this.gameHost.resize();
    this.polygonHost.resize();
    this.retroHost.resize();
    if (this.isVisualQa && this.manualMode && this.latestVisualQaRenderFrame) {
      this.renderFrame(this.latestVisualQaRenderFrame);
    }
  }

  createInputSnapshot() {
    return this.input.snapshot();
  }

  pulseQaInputAction(actionId) {
    return this.input.pulseQa(actionId);
  }

  createSimulationSettings(uiState) {
    return Object.freeze({
      animationSpeed: uiState.screen === GAME_SCREEN.RENDER_LAB ? uiState.animationSpeed : 1,
      cameraFeedbackEnabled: !this.prefersReducedMotion(),
    });
  }

  prefersReducedMotion() {
    return resolveReducedMotionPreference({
      visualQaRequest: this.visualQaRequest,
      systemMatches: this.reducedMotionQuery.matches,
    });
  }

  pressMobileAction(actionId, pointerId) {
    if (this.uiBridge.snapshot().screen === GAME_SCREEN.MENU) return false;
    return this.input.pressMobile(actionId, pointerId);
  }

  releaseMobilePointer(pointerId) {
    return this.input.releaseMobile(pointerId);
  }

  setQaInputAction(actionId, held) {
    if (this.uiBridge.snapshot().screen === GAME_SCREEN.MENU) return false;
    return this.input.setQaHeld(actionId, held);
  }

  update(deltaSeconds, inputSnapshot) {
    const uiState = this.uiBridge.snapshot();
    if (uiState.graphicsReviewOpen) return;
    const active =
      (uiState.screen === GAME_SCREEN.GAME &&
        uiState.debugPanelOpen !== true &&
        uiState.operationMapOpen !== true &&
        uiState.campaignActionPreviewOpen !== true) ||
      (uiState.screen === GAME_SCREEN.RENDER_LAB && uiState.isPlaying);
    if (!active) return;
    this.fixedProcess(deltaSeconds, {
      inputSnapshot,
      simulationSettings: this.createSimulationSettings(uiState),
    });
  }

  render(interpolationAlpha) {
    const uiState = this.uiBridge.snapshot();
    if (uiState.graphicsReviewOpen) return;
    if (uiState.screen === GAME_SCREEN.MENU) return;
    this.scene.createRenderFrame(interpolationAlpha);
  }

  renderFrame(renderFrame) {
    if (this.qaInputEnabled) {
      this.uiBridge.setQaInputStatus(
        Object.freeze({
          heldActions: this.input.snapshot(),
          playerPosition: Object.freeze({
            x: Math.round(renderFrame.player.position.x),
            y: Math.round(renderFrame.player.position.y),
          }),
          roomId: renderFrame.map.activeRoomId,
        }),
      );
      const qaCamera = new Camera2D({
        x: this.camera.position.x,
        y: this.camera.position.y,
        zoom: this.camera.zoom,
        worldWidth: this.camera.worldSize.width,
        worldHeight: this.camera.worldSize.height,
      });
      const qaViewport = this.gameHost.viewport;
      // The QA consumer receives pixels only; the immutable production frame
      // remains private and cannot be used to move actors or resolve combat.
      this.qaPixelExporter = () => {
        if (!this.qaActorSurface) {
          const canvas = document.createElement('canvas');
          const host = new CanvasHost(canvas);
          const renderer = this.qaInputPolygon
            ? new CanvasPolygonRenderer(host, this.camera)
            : new CanvasRetroRenderer(host, this.camera);
          this.qaActorSurface = { canvas, host, renderer };
        }
        const { canvas, host, renderer } = this.qaActorSurface;
        if (canvas.width !== qaViewport.backingWidth) canvas.width = qaViewport.backingWidth;
        if (canvas.height !== qaViewport.backingHeight) canvas.height = qaViewport.backingHeight;
        host.viewport = qaViewport;
        renderer.camera = qaCamera;
        renderer.render(
          Object.freeze({
            ...renderFrame,
            lightingOccluders: Object.freeze(
              renderFrame.items
                .filter((item) => item.lightOccluder === true)
                .map((item) => Object.freeze({ id: item.id, points: item.points })),
            ),
            items: Object.freeze(renderFrame.items.filter((item) => item.depthGroup === 'player')),
            artDirection: renderFrame.artDirection
              ? Object.freeze({ ...renderFrame.artDirection, shadowCasters: Object.freeze([]) })
              : null,
          }),
          { ...GAME_RENDER_SETTINGS, transparent: true },
        );
        return canvas.toDataURL('image/png');
      };
      globalThis.__POLYGON_RPG_INPUT_QA_ACTOR_PNG__ = this.qaPixelExporter;
      globalThis.__POLYGON_RPG_INPUT_QA__ = Object.freeze({
        input: this.input.snapshot(),
        player: renderFrame.player,
        camera: renderFrame.camera,
        cameraOffset: renderFrame.cameraOffset,
        artDirection: Object.freeze({
          cameraZoom: renderFrame.artDirection?.cameraZoom,
          mobileCameraScale: renderFrame.artDirection?.mobileCameraScale,
          cameraFocusY: renderFrame.artDirection?.cameraFocusY,
        }),
        projection: Object.freeze({
          worldWidth: this.camera.worldSize.width,
          worldHeight: this.camera.worldSize.height,
          zoom: this.camera.zoom,
        }),
        combatMotion: renderFrame.combatMotion,
        combatEnemy: renderFrame.combatEnemy,
        combatEvents: renderFrame.combatEvents,
        combatContact: renderFrame.combatContact,
        combatGeometry: renderFrame.combatGeometry,
        map: Object.freeze({ id: renderFrame.map.id, roomId: renderFrame.map.activeRoomId }),
      });
    }
    if (this.isVisualQa && this.manualMode) this.latestVisualQaRenderFrame = renderFrame;
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
      if (this.qaInputEnabled) {
        globalThis.__POLYGON_RPG_INPUT_QA__ = Object.freeze({
          ...globalThis.__POLYGON_RPG_INPUT_QA__,
          raster: this.latestRenderStats,
        });
      }
      return;
    }
    if (uiState.screen === GAME_SCREEN.GAME) {
      const renderer = this.qaInputPolygon ? this.visualQaPolygonRenderer : this.gameRenderer;
      this.latestRenderStats = renderer.render(renderFrame, GAME_RENDER_SETTINGS);
      if (this.qaInputEnabled) {
        globalThis.__POLYGON_RPG_INPUT_QA__ = Object.freeze({
          ...globalThis.__POLYGON_RPG_INPUT_QA__,
          raster: this.latestRenderStats,
        });
      }
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
