import { FixedStepRunner } from '../core/FixedStepRunner.js';
import { SceneNode } from '../core/SceneNode.js';
import { GameScene } from '../game/GameScene.js';
import { EQUIPMENT_CATALOG } from '../game/equipment/EquipmentProfiles.js';
import { ENCOUNTER_PROFILES } from '../game/encounter/EncounterProfiles.js';
import { ENCHANTMENT_CATALOG } from '../game/enchantment/EnchantmentCatalog.js';
import { createProgressionSnapshot } from '../game/progression/ProgressionState.js';
import { COMBAT_PROGRESSION_PROFILE } from '../game/progression/ProgressionProfiles.js';
import { ProgressionStorage } from '../game/progression/ProgressionStorage.js';
import {
  RECOVERY_SLOT_ID,
  createInitialMorningRecoveryRequest,
  createPostProgressionRecoveryRequests,
  createPreActionRecoveryRequest,
  createRecoverySlotReadModel,
} from '../game/progression/CampaignRecoveryPolicy.js';
import { ACADEMY_VILLAGE_MAP } from '../game/maps/academyVillage.js';
import { SCRAP_AWAKENING_MAP, SCRAP_AWAKENING_MAP_ID } from '../game/maps/scrapAwakening.js';
import { TRAINING_ENCOUNTER_SCENE } from '../game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../game/training/TrainingEnemyAttackProfiles.js';
import { WORLD_TIME_PROFILE } from '../game/world/WorldTimeProfiles.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../game/campaign/ScrapCampaignProfiles.js';
import { SCRAP_AWAKENING_PROFILE } from '../game/campaign/ScrapAwakeningProfile.js';
import { CHARACTER_PRESENTATION_PROFILE } from '../game/character/CharacterPresentationProfiles.js';
import { SCRAP_ART_DIRECTION_PROFILE } from '../game/ScrapArtDirectionProfiles.js';
import { GameInputController } from '../input/GameInputController.js';
import { Camera2D } from '../rendering/Camera2D.js';
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

export function resolveReducedMotionPreference({ visualQaRequest, systemMatches }) {
  if (visualQaRequest) return Boolean(visualQaRequest.reducedMotion);
  return Boolean(systemMatches);
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

const VISUAL_QA_RECOVERY_SLOTS = Object.freeze([
  Object.freeze({
    id: 'pre-action',
    title: '행동 확정 직전',
    detailLabel: '수도 도착을 확정하기 직전의 작전 기록',
    timeLabel: 'Day 30 · 밤 · D-1',
    assemblyLabel: '4/5 부품 · 로봇 80%',
    elapsedSegments: 119,
  }),
  Object.freeze({
    id: 'latest-core-event',
    title: '이전 핵심 사건 완료',
    detailLabel: '장갑 제설 열차 차체 회수 직후',
    timeLabel: 'Day 25 · 낮 · D-6',
    assemblyLabel: '4/5 부품 · 로봇 80%',
    elapsedSegments: 97,
  }),
  Object.freeze({
    id: 'latest-morning',
    title: '최근 날짜의 아침',
    detailLabel: '하루를 시작한 시점의 안전한 작전 기록',
    timeLabel: 'Day 30 · 아침 · D-1',
    assemblyLabel: '4/5 부품 · 로봇 80%',
    elapsedSegments: 116,
  }),
]);

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

function createTrainingEncounter(options) {
  return TRAINING_ENCOUNTER_SCENE.instantiate({
    ...options,
    encounterProfiles: ENCOUNTER_PROFILES,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
  });
}

export class GameApp extends SceneNode {
  constructor({ gameCanvas, polygonCanvas, retroCanvas, visualQaRequest = null }) {
    super('GameApp');
    const equipmentIds = EQUIPMENT_CATALOG.profiles.map((profile) => profile.id);
    this.equipmentIds = Object.freeze([...equipmentIds]);
    const freshProgression = createProgressionSnapshot(
      EQUIPMENT_CATALOG.defaultProfileId,
      ENCHANTMENT_CATALOG,
      SCRAP_CAMPAIGN_PROFILE,
    );
    this.visualQaRequest = visualQaRequest;
    this.isVisualQa = Boolean(this.visualQaRequest);
    this.visualQaRecoverySnapshots = new Map();
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
    const mapDefinition =
      !this.isVisualQa || this.visualQaRequest?.scenario?.mapId === SCRAP_AWAKENING_MAP_ID
        ? SCRAP_AWAKENING_MAP
        : ACADEMY_VILLAGE_MAP;
    this.scene = this.addChild(
      new GameScene({
        mapDefinition,
        equipmentCatalog: EQUIPMENT_CATALOG,
        combatProgressionProfile: COMBAT_PROGRESSION_PROFILE,
        encounterFactory: createTrainingEncounter,
        encounterAttackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
        worldTimeProfile: WORLD_TIME_PROFILE,
        scrapCampaignProfile: SCRAP_CAMPAIGN_PROFILE,
        scrapAwakeningProfile: SCRAP_AWAKENING_PROFILE,
        characterPresentationCatalog: CHARACTER_PRESENTATION_PROFILE,
        playerPresentationProfileId: 'scrapyard-apprentice',
        artDirectionProfile: SCRAP_ART_DIRECTION_PROFILE,
        enchantmentCatalog: ENCHANTMENT_CATALOG,
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
      isActive: () => {
        const uiState = this.uiBridge?.snapshot();
        return (
          uiState?.screen === GAME_SCREEN.GAME &&
          uiState?.debugPanelOpen !== true &&
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
      const restorable = this.visualQaRecoverySnapshots.size > 0;
      const result = Object.freeze({
        ok: true,
        restorable,
        message: restorable
          ? '시각 검증용 복구 지점 · 선택 동작 확인 가능'
          : '시각 검증용 복구 지점',
        slots: VISUAL_QA_RECOVERY_SLOTS,
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
      const snapshot = this.visualQaRecoverySnapshots.get(slotId);
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

  runVisualQa({ start, frame, renderer, phase, scenario }) {
    if (!scenario || typeof scenario !== 'object') {
      throw new TypeError('Visual QA scenario가 필요합니다.');
    }
    this.start({ manual: true });
    this.scene.reset();
    if (
      scenario.progressionSnapshot ||
      scenario.firstJourneySnapshot ||
      scenario.enchantmentSnapshot
    ) {
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
          enchantment: scenario.enchantmentSnapshot
            ? Object.freeze({ ...progression.enchantment, ...scenario.enchantmentSnapshot })
            : progression.enchantment,
        }),
      );
    }
    if (scenario.timePhase) this.scene.setVisualQaTimePhase(scenario.timePhase);
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
    if (scenario.scrapLastSegment) this.scene.setVisualQaScrapLastSegment();
    if (scenario.scrapFinalBattleStageId) {
      this.scene.setVisualQaScrapFinalBattleStage(scenario.scrapFinalBattleStageId);
    }
    if (scenario.scrapGameOverStageId) {
      const recoverySnapshot = this.scene.getProgressionSnapshot();
      this.visualQaRecoverySnapshots = new Map([
        [RECOVERY_SLOT_ID.PRE_ACTION, recoverySnapshot],
        [RECOVERY_SLOT_ID.LATEST_CORE_EVENT, recoverySnapshot],
        [RECOVERY_SLOT_ID.LATEST_MORNING, recoverySnapshot],
      ]);
      this.scene.setVisualQaScrapGameOverStage(scenario.scrapGameOverStageId);
      this.refreshRecoverySlots();
    }
    this.scene.setVisualQaLocation(scenario);
    if (scenario.materialEchoDefeats) {
      this.scene.setVisualQaMaterialEchoDefeats(scenario.materialEchoDefeats);
    }
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

  update(deltaSeconds, inputSnapshot) {
    const uiState = this.uiBridge.snapshot();
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
