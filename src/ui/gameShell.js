import { GAME_SCREEN } from '../app/GameApp.js';
import { createDebugConfigurationAdapter } from './DebugConfigurationAdapter.js';
import { HoldActivationController } from './HoldActivationController.js';
import {
  createDocumentFocusPort,
  ScreenFocusOwner,
  SCREEN_FOCUS_TARGET,
} from './ScreenFocusOwner.js';

function formatRuntimeStats({
  fps,
  logicalWidth,
  logicalHeight,
  droppedSteps,
  degenerateItemIds,
  rasterCollapseCount,
}) {
  const geometryWarning = degenerateItemIds?.length
    ? ` · INVALID GEOMETRY: ${degenerateItemIds.join(', ')}`
    : '';
  const rasterWarning = rasterCollapseCount ? ` · RASTER COLLAPSE: ${rasterCollapseCount}` : '';
  return `${fps} FPS · ${logicalWidth}×${logicalHeight} logical · ${droppedSteps} dropped${geometryWarning}${rasterWarning}`;
}

function formatGameStats({ fps, logicalWidth, logicalHeight }) {
  return `${fps} FPS · ${logicalWidth}×${logicalHeight} logical`;
}

function createMobileViewportController(browserDocument, browserScreen) {
  let requestVersion = 0;
  let ownedFullscreenElement = null;

  async function exitOwnedFullscreen() {
    const fullscreenElement = ownedFullscreenElement;
    ownedFullscreenElement = null;

    if (
      !fullscreenElement ||
      browserDocument.fullscreenElement !== fullscreenElement ||
      typeof browserDocument.exitFullscreen !== 'function'
    ) {
      return;
    }

    try {
      await browserDocument.exitFullscreen();
    } catch {
      // Fullscreen may already have been released by the browser or the user.
    }
  }

  return Object.freeze({
    async enterLandscape() {
      const currentRequest = ++requestVersion;
      const root = browserDocument?.documentElement;
      if (!root) return;

      if (!browserDocument.fullscreenElement && typeof root.requestFullscreen === 'function') {
        try {
          await root.requestFullscreen();
          if (browserDocument.fullscreenElement === root) {
            ownedFullscreenElement = root;
          }
        } catch {
          // Installed apps and some browsers allow orientation lock without fullscreen.
        }
      }

      if (currentRequest !== requestVersion) {
        await exitOwnedFullscreen();
        return;
      }

      const orientation = browserScreen?.orientation;
      if (typeof orientation?.lock !== 'function') return;

      try {
        await orientation.lock('landscape');
        if (currentRequest !== requestVersion && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      } catch {
        // Portrait CSS keeps the rotate-device notice as the unsupported-browser fallback.
      }
    },

    leaveLandscape() {
      requestVersion += 1;
      const orientation = browserScreen?.orientation;
      if (typeof orientation?.unlock === 'function') {
        try {
          orientation.unlock();
        } catch {
          // The browser may have unlocked automatically while leaving fullscreen.
        }
      }
      void exitOwnedFullscreen();
    },
  });
}

const DEBUG_PANEL_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'select:not([disabled])',
  'input:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function setDebugBackgroundInert(browserDocument, isInert) {
  const backdrop = browserDocument.querySelector('.debug-panel-backdrop');
  const viewport = backdrop?.parentElement;
  if (!viewport) return;
  for (const child of viewport.children) {
    if (child !== backdrop) child.inert = isInert;
  }
}

function focusDebugPanel(browserDocument) {
  browserDocument.getElementById('debug-panel-title')?.focus();
}

function setOperationMapBackgroundInert(browserDocument, isInert) {
  const operationMap = browserDocument.querySelector('.operation-map-backdrop');
  const viewport = operationMap?.parentElement;
  if (!viewport) return;
  for (const child of viewport.children) {
    if (child !== operationMap) child.inert = isInert;
  }
}

function focusOperationMap(browserDocument) {
  browserDocument.getElementById('operation-map-title')?.focus();
}

function setCampaignActionBackgroundInert(browserDocument, isInert) {
  const backdrop = browserDocument.querySelector('.campaign-action-backdrop');
  const viewport = backdrop?.parentElement;
  if (!viewport) return;
  for (const child of viewport.children) {
    if (child !== backdrop) child.inert = isInert;
  }
}

function focusCampaignActionPreview(browserDocument) {
  browserDocument.getElementById('campaign-action-title')?.focus();
}

function setGameOverBackgroundInert(browserDocument, isInert) {
  const backdrop = browserDocument.querySelector('.scrap-game-over-backdrop');
  const viewport = backdrop?.parentElement;
  if (!viewport) return;
  for (const child of viewport.children) {
    if (child !== backdrop) child.inert = isInert;
  }
}

function focusGameOverPresentation(browserDocument, recoveryAvailable) {
  const recoveryTarget = recoveryAvailable
    ? browserDocument.querySelector('.scrap-recovery-slot:not([disabled])')
    : null;
  const target = recoveryTarget ?? browserDocument.getElementById('scrap-game-over-title');
  target?.focus();
}

export function registerGameShell(Alpine, gameApp, { visualQaRequest = null } = {}) {
  const mobileViewport = createMobileViewportController(globalThis.document, globalThis.screen);
  const debugConfigurationAdapter = createDebugConfigurationAdapter(
    globalThis.location,
    visualQaRequest,
    {
      browserHistory: globalThis.history,
      requestReconfiguration: (request) => {
        if (request) gameApp.applyDebugConfiguration(request);
        else gameApp.returnToPlayerGame();
      },
    },
  );
  const initialDebugConfiguration = debugConfigurationAdapter.initialConfiguration;
  let debugMenuHold = null;
  let debugHoldAbortController = null;
  let operationMapOpenerId = 'game-menu-control';
  const initialScreen = visualQaRequest ? GAME_SCREEN.GAME : GAME_SCREEN.MENU;
  const screenFocusOwner = new ScreenFocusOwner({
    initialScreen,
    focusPort: createDocumentFocusPort(globalThis.document),
  });
  const applyFocusAfterPaint = (focusRequest) => {
    globalThis.requestAnimationFrame(() => screenFocusOwner.apply(focusRequest));
  };

  Alpine.data('gameShell', () => ({
    screen: initialScreen,
    visualQa: Boolean(visualQaRequest),
    operationMapOpen: false,
    operationMapAvailable: false,
    campaignActionPreviewOpen: false,
    gameOverOpen: false,
    gameOverPresentation: Object.freeze({
      active: false,
      stageId: 'inactive',
      title: '',
      cue: '',
      recoveryAvailable: false,
    }),
    recoverySlots: Object.freeze([]),
    recoveryRestorable: false,
    recoveryStatus: '복구 지점을 확인하는 중입니다.',
    campaignActionPreview: Object.freeze({
      label: '',
      kind: 'travel',
      title: '장거리 이동을 확정할까요?',
      detailLabel: '',
      targetLocationLabel: '',
      costSegments: 0,
      successExtensionDays: 0,
      allowed: true,
      blockedReason: null,
      blockingIssueLabels: Object.freeze([]),
      requiresDeadlineWarning: false,
      before: Object.freeze({ day: 1, phaseLabel: '아침', deadlineLabel: 'D-30' }),
      after: Object.freeze({ day: 1, phaseLabel: '아침', deadlineLabel: 'D-30' }),
      rival: Object.freeze({
        movementSegments: 0,
        delayConsumedSegments: 0,
        before: Object.freeze({ locationLabel: '각성지', directionLabel: '폐광 산촌' }),
        after: Object.freeze({ locationLabel: '각성지', directionLabel: '폐광 산촌' }),
      }),
    }),
    debugPanelOpen: debugConfigurationAdapter.panelRequested,
    debugMenuHoldProgress: 0,
    debugScenarioIds: debugConfigurationAdapter.scenarioIds,
    debugRendererIds: debugConfigurationAdapter.rendererIds,
    debugPhaseIds: debugConfigurationAdapter.phaseIds,
    debugStart: initialDebugConfiguration.start,
    debugFrame: initialDebugConfiguration.frame,
    debugRenderer: initialDebugConfiguration.renderer,
    debugPhase: initialDebugConfiguration.phase,
    debugReducedMotion: initialDebugConfiguration.reducedMotion,
    debugConfigurationStatus: visualQaRequest
      ? 'URL의 E2E 설정을 불러왔습니다.'
      : '현재 화면은 저장 진행과 분리된 E2E URL로 다시 열립니다.',
    reducedMotion: gameApp.prefersReducedMotion(),
    forceMobileControls: false,
    isPlaying: true,
    pixelSize: 6,
    posterizationLevels: 4,
    outlineWidth: 1,
    alphaThresholdEnabled: true,
    alphaThreshold: 128,
    pixelSnap: true,
    showMesh: false,
    showPixelGrid: false,
    animationSpeed: 1,
    renderStats: 'Renderer idle',
    gameStats: 'World ready',
    areaName: '동네 고물상',
    storyBeatId: 'scrap-awakening:commission',
    storyTitle: '고물상 정식 수거 의뢰',
    storyBriefing: '고물상 주인이 두 견습생에게 왕국 외곽 폐병기 수거를 맡깁니다.',
    dialogue: Object.freeze({
      active: false,
      available: false,
      mode: 'current',
      presentationMode: 'dialogue',
      interactionId: null,
      conversationId: null,
      title: '',
      speaker: '',
      line: '',
      lineIndex: -1,
      lineCount: 0,
      canAdvance: false,
      canClose: false,
      prompt: '',
      worldAnchor: null,
      visibleLine: '',
      revealComplete: false,
      screenAnchor: null,
      commands: Object.freeze([]),
    }),
    objective: '고물상 주인에게 다가가 ↑로 의뢰를 받으세요.',
    journeyLabel: '고철 대왕 각성 전',
    encounterHint: '',
    encounterHealthLabel: '',
    wardLabel: '로봇 완성도 0%',
    timeLabel: 'Day 1 · 아침',
    deadlineLabel: 'D-30',
    campaign: Object.freeze({
      hudLabel: 'Day 1 · 아침 · D-30',
      awakeningStageId: 'commission',
      garageRevealStageId: 'locked',
      garageRevealActive: false,
      garageRevealComplete: false,
      currentLocationLabel: '동네 고물상',
      rivalLocationLabel: '각성지',
      rivalDirectionLabel: '폐광 산촌',
      rivalArrivalLabel: 'Day 31 · 아침',
      rivalDelaySegments: 0,
      lastChangeLabel: '고철 대왕 각성 · 수도 도착까지 D-30',
      collectedPartCount: 0,
      totalPartCount: 5,
      completionPercent: 0,
      finalBattleAvailable: false,
      gameOver: false,
      issueWindow: Object.freeze({
        primary: null,
        linked: Object.freeze([]),
        linkedCount: 0,
        completedLinkedCount: 0,
        maximumLinkedCount: 2,
        summaryLabel: '현장에서 주목표를 선택하세요',
      }),
      routeEdges: Object.freeze([]),
      regions: Object.freeze([]),
    }),
    characterBoard: Object.freeze({
      active: false,
      title: '',
      scaleLabel: '',
      views: Object.freeze([]),
      entries: Object.freeze([]),
    }),
    canManageProgression: true,
    activeEnchantId: null,
    activeEnchantLabel: '미활성',
    selectedEquipmentId: '',
    selectedEquipmentLabel: '장비 정보 불러오는 중',
    trainingMarks: 0,
    combatSkillLevel: 0,
    combatSkillMaxLevel: 3,
    combatSkillLabel: '기본 수련',
    combatSkillDescription: '기본 공격과 한 번의 공중 행동을 사용합니다.',
    combatSkillNextLevel: 1,
    combatSkillNextGoldCost: 120,
    combatSkillNextTrainingMarkRequirement: 1,
    combatSkillCanTrain: false,
    combatSkillActionLabel: 'Lv.1 · 120 Gold',
    combatCommandGuide: 'A/S starter · 공중 starter 1회',
    progressionNotice: '훈련 골렘 처치 시 인장 +3',
    saveStatus: '성장 저장 준비 중',
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    staminaExhausted: false,
    lastCommandTransition: null,
    gold: 0,
    mobileDirections: Object.freeze([
      Object.freeze({ id: 'jump', label: '↑', hint: '점프·대화·Portal', slot: 'up' }),
      Object.freeze({ id: 'left', label: '←', hint: '이동', slot: 'left' }),
      Object.freeze({ id: 'guard', label: '↓', hint: '방어·회피', slot: 'down' }),
      Object.freeze({ id: 'right', label: '→', hint: '이동', slot: 'right' }),
    ]),
    mobileActions: Object.freeze([
      Object.freeze({ id: 'basicAttack', label: 'X', hint: '기본', slot: 'attack' }),
      Object.freeze({ id: 'strongAttack', label: 'Y', hint: '강한', slot: 'strong' }),
    ]),

    init() {
      debugMenuHold = new HoldActivationController({
        onProgress: (progress) => {
          this.debugMenuHoldProgress = progress;
        },
        onComplete: () => {
          this.openDebugPanel();
        },
      });
      debugHoldAbortController = new AbortController();
      globalThis.addEventListener('blur', () => debugMenuHold?.interrupt(), {
        signal: debugHoldAbortController.signal,
      });
      globalThis.document.addEventListener(
        'visibilitychange',
        () => {
          if (globalThis.document.hidden) debugMenuHold?.interrupt();
        },
        { signal: debugHoldAbortController.signal },
      );
      gameApp.connectUi({
        snapshot: () =>
          Object.freeze({
            screen: this.screen,
            operationMapOpen: this.operationMapOpen,
            campaignActionPreviewOpen: this.campaignActionPreviewOpen,
            gameOverOpen: this.gameOverOpen,
            debugPanelOpen: this.debugPanelOpen,
            reducedMotion: this.reducedMotion,
            isPlaying: this.isPlaying,
            pixelSize: Number(this.pixelSize),
            posterizationLevels: Number(this.posterizationLevels),
            outlineWidth: Number(this.outlineWidth),
            alphaThresholdEnabled: Boolean(this.alphaThresholdEnabled),
            alphaThreshold: Number(this.alphaThreshold),
            pixelSnap: Boolean(this.pixelSnap),
            showMesh: Boolean(this.showMesh),
            showPixelGrid: Boolean(this.showPixelGrid),
            animationSpeed: Number(this.animationSpeed),
          }),
        setRenderStats: (stats) => {
          this.renderStats = formatRuntimeStats(stats);
        },
        setGameStats: (stats) => {
          this.gameStats = formatGameStats(stats);
        },
        setPlayerStatus: (status) => {
          this.health = status.health;
          this.maxHealth = status.maxHealth;
          this.stamina = status.stamina;
          this.maxStamina = status.maxStamina;
          this.staminaExhausted = status.staminaExhausted;
          this.lastCommandTransition = status.lastCommandTransition;
          this.gold = status.gold;
          this.trainingMarks = status.trainingMarks;
        },
        setWorldStatus: (status) => {
          const previousGameOverStageId = this.gameOverPresentation.stageId;
          const wasGameOverOpen = this.gameOverOpen;
          this.areaName = status.areaName;
          this.storyBeatId = status.story.beatId;
          this.storyTitle = status.story.title;
          this.storyBriefing = status.story.briefing;
          this.dialogue = status.dialogue;
          this.objective = status.objective;
          this.timeLabel = status.timeLabel;
          this.deadlineLabel = status.deadlineLabel;
          this.campaign = status.campaign;
          this.gameOverPresentation = status.gameOverPresentation;
          this.gameOverOpen = status.gameOverPresentation.active;
          if (this.gameOverOpen !== wasGameOverOpen) {
            setGameOverBackgroundInert(globalThis.document, this.gameOverOpen);
          }
          if (
            this.gameOverOpen &&
            status.gameOverPresentation.stageId !== previousGameOverStageId
          ) {
            this.$nextTick(() =>
              globalThis.requestAnimationFrame(() =>
                focusGameOverPresentation(
                  globalThis.document,
                  status.gameOverPresentation.recoveryAvailable,
                ),
              ),
            );
          }
          this.operationMapAvailable = status.operationMapAvailable;
          this.characterBoard = status.characterBoard;
          this.canManageProgression = status.canManageProgression;
          this.activeEnchantId = status.activeEnchantId;
          this.activeEnchantLabel = status.activeEnchantLabel;
          this.selectedEquipmentId = status.equipmentId;
          this.selectedEquipmentLabel = status.equipmentLabel;
          this.combatSkillLevel = status.combatSkill.level;
          this.combatSkillMaxLevel = status.combatSkill.maxLevel;
          this.combatSkillLabel = status.combatSkill.label;
          this.combatSkillDescription = status.combatSkill.description;
          this.combatSkillNextLevel = status.combatSkill.nextLevel;
          this.combatSkillNextGoldCost = status.combatSkill.nextGoldCost;
          this.combatSkillNextTrainingMarkRequirement =
            status.combatSkill.nextTrainingMarkRequirement;
          this.combatSkillCanTrain = status.combatSkill.canTrain;
          this.combatSkillActionLabel = status.combatSkill.actionLabel;
          this.combatCommandGuide = status.combatSkill.commandGuide;
          this.progressionNotice = status.progressionNotice;
          this.journeyLabel = status.journeyLabel;
          this.encounterHint = status.encounterHint;
          this.encounterHealthLabel = status.encounterHealthLabel;
          this.wardLabel = status.wardLabel;
        },
        setDialoguePresentation: (dialogue) => {
          this.dialogue = dialogue;
        },
        setSaveStatus: (status) => {
          this.saveStatus = status;
        },
        setRecoverySlots: (result) => {
          this.recoverySlots = result.slots;
          this.recoveryRestorable = result.restorable;
          this.recoveryStatus = result.message;
          if (this.gameOverOpen && this.gameOverPresentation.recoveryAvailable) {
            this.$nextTick(() =>
              globalThis.requestAnimationFrame(() =>
                focusGameOverPresentation(globalThis.document, true),
              ),
            );
          }
        },
        requestOperationMap: () => {
          this.openOperationMap('game-canvas');
        },
        requestCampaignActionPreview: (request) => {
          this.openCampaignActionPreview(request.preview);
        },
      });
      this.$nextTick(() => {
        if (visualQaRequest) {
          this.isPlaying = false;
          try {
            gameApp.runVisualQa(visualQaRequest);
          } catch (error) {
            globalThis.__POLYGON_RPG_VISUAL_QA__ = Object.freeze({
              ready: false,
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }
        } else {
          gameApp.start();
        }
        if (this.gameOverOpen) {
          setGameOverBackgroundInert(globalThis.document, true);
          globalThis.requestAnimationFrame(() =>
            focusGameOverPresentation(
              globalThis.document,
              this.gameOverPresentation.recoveryAvailable,
            ),
          );
        }
        if (this.debugPanelOpen) {
          setDebugBackgroundInert(globalThis.document, true);
          globalThis.requestAnimationFrame(() => focusDebugPanel(globalThis.document));
        }
      });
    },

    get playButtonLabel() {
      return this.isPlaying ? 'Pause' : 'Play';
    },

    get healthPercent() {
      return `${Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100))}%`;
    },

    get staminaPercent() {
      return `${Math.max(0, Math.min(100, (this.stamina / this.maxStamina) * 100))}%`;
    },

    get staminaLabel() {
      return `${Math.floor(this.stamina)}/${this.maxStamina}`;
    },

    get debugMenuHoldPercent() {
      return `${Math.round(this.debugMenuHoldProgress * 100)}%`;
    },

    get combatStatusAnnouncement() {
      const transitionLabels = Object.freeze({
        'guard-contact': '방어 성공',
        'just-guard': '저스트 가드 · Basic 방패 반격 가능',
        'guard-broken': 'Player 방어 파괴',
        'guard-break': '상대 방어 파괴',
        'strong-startup-interrupted': '강한 공격 준비 취소',
        'action-rejected': '스태미나 부족으로 행동 불가',
      });
      const transition =
        this.lastCommandTransition?.kind === 'motion-started' &&
        this.lastCommandTransition?.action === 'guardCounter'
          ? '저스트 가드 방패 반격'
          : transitionLabels[this.lastCommandTransition?.kind];
      const encounter = this.encounterHint
        ? `${this.encounterHint} ${this.encounterHealthLabel}`.trim()
        : '현재 조우 없음';
      const staminaState = this.staminaExhausted ? ' · 스태미나 소진' : '';
      return `전투: ${transition ? `${transition} · ` : ''}${encounter}${staminaState}`;
    },

    startGame() {
      mobileViewport.leaveLandscape();
      this.forceMobileControls = false;
      this.launchGame(SCREEN_FOCUS_TARGET.MENU_START);
    },

    startMobileGame() {
      void mobileViewport.enterLandscape();
      this.forceMobileControls = true;
      this.launchGame(SCREEN_FOCUS_TARGET.MENU_MOBILE_START);
    },

    launchGame(menuReturnTarget) {
      const focusRequest = screenFocusOwner.transitionTo(GAME_SCREEN.GAME, {
        menuReturnTarget,
      });
      this.screen = focusRequest.screen;
      this.isPlaying = true;
      this.$nextTick(() => {
        gameApp.enterGame();
        applyFocusAfterPaint(focusRequest);
      });
    },

    resetSavedProgress() {
      return gameApp.resetSavedProgress();
    },

    startDebugMenuHold(event) {
      if (event?.repeat) return;
      debugMenuHold?.begin();
    },

    releaseDebugMenuHold() {
      debugMenuHold?.release();
    },

    cancelDebugMenuHold() {
      debugMenuHold?.cancel();
    },

    interruptDebugMenuHold() {
      debugMenuHold?.interrupt();
    },

    releaseDebugMenuKeyboardHold() {
      const result = debugMenuHold?.release();
      if (result?.interrupted) {
        debugMenuHold.consumePrimaryActivation();
        return;
      }
      if (result && !result.completed) this.openOperationMap();
    },

    activateGameMenu() {
      if (!debugMenuHold?.consumePrimaryActivation()) return;
      if (!this.operationMapAvailable) return;
      this.openOperationMap();
    },

    openOperationMap(openerId = 'game-menu-control') {
      if (this.debugPanelOpen || this.operationMapOpen || this.campaignActionPreviewOpen) return;
      operationMapOpenerId = openerId;
      this.operationMapOpen = true;
      setOperationMapBackgroundInert(globalThis.document, true);
      gameApp.onScreenChanged();
      this.$nextTick(() =>
        globalThis.requestAnimationFrame(() => focusOperationMap(globalThis.document)),
      );
    },

    closeOperationMap() {
      if (!this.operationMapOpen) return;
      this.operationMapOpen = false;
      setOperationMapBackgroundInert(globalThis.document, false);
      gameApp.onScreenChanged();
      this.$nextTick(() => globalThis.document.getElementById(operationMapOpenerId)?.focus());
    },

    trapOperationMapFocus(event) {
      const panel = globalThis.document.querySelector('.operation-map-panel');
      if (!panel) return;
      const focusable = [...panel.querySelectorAll(DEBUG_PANEL_FOCUSABLE_SELECTOR)].filter(
        (element) => element.getClientRects().length > 0,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        focusOperationMap(globalThis.document);
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (event.target === first || !focusable.includes(event.target))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first.focus();
      }
    },

    openCampaignActionPreview(preview) {
      if (this.debugPanelOpen || this.operationMapOpen || this.campaignActionPreviewOpen) return;
      this.campaignActionPreview = preview;
      this.campaignActionPreviewOpen = true;
      setCampaignActionBackgroundInert(globalThis.document, true);
      gameApp.onScreenChanged();
      this.$nextTick(() =>
        globalThis.requestAnimationFrame(() => focusCampaignActionPreview(globalThis.document)),
      );
    },

    confirmCampaignActionPreview() {
      if (!this.campaignActionPreviewOpen) return;
      const result = gameApp.confirmCampaignActionPreview();
      if (!result.started) return;
      this.campaignActionPreviewOpen = false;
      setCampaignActionBackgroundInert(globalThis.document, false);
      gameApp.onScreenChanged();
      this.$nextTick(() => globalThis.document.getElementById('game-canvas')?.focus());
    },

    cancelCampaignActionPreview() {
      if (!this.campaignActionPreviewOpen) return;
      gameApp.cancelCampaignActionPreview();
      this.campaignActionPreviewOpen = false;
      setCampaignActionBackgroundInert(globalThis.document, false);
      gameApp.onScreenChanged();
      this.$nextTick(() => globalThis.document.getElementById('game-canvas')?.focus());
    },

    trapCampaignActionFocus(event) {
      const panel = globalThis.document.querySelector('.campaign-action-panel');
      if (!panel) return;
      const focusable = [...panel.querySelectorAll(DEBUG_PANEL_FOCUSABLE_SELECTOR)].filter(
        (element) => element.getClientRects().length > 0,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        focusCampaignActionPreview(globalThis.document);
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (event.target === first || !focusable.includes(event.target))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first.focus();
      }
    },

    trapGameOverFocus(event) {
      const panel = globalThis.document.querySelector('.scrap-game-over-panel');
      const focusable = [...(panel?.querySelectorAll(DEBUG_PANEL_FOCUSABLE_SELECTOR) ?? [])];
      if (focusable.length === 0) {
        event.preventDefault();
        globalThis.document.getElementById('scrap-game-over-title')?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && globalThis.document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && globalThis.document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },

    restoreRecoverySlot(slotId) {
      if (!this.gameOverPresentation.recoveryAvailable || !this.recoveryRestorable) return;
      const result = gameApp.restoreRecoverySlot(slotId);
      if (!result.ok) {
        this.recoveryStatus = result.message;
        return;
      }
      this.$nextTick(() =>
        globalThis.requestAnimationFrame(() =>
          globalThis.document.getElementById('game-canvas')?.focus(),
        ),
      );
    },

    openDebugPanel() {
      if (this.campaignActionPreviewOpen) return;
      if (this.operationMapOpen) {
        this.operationMapOpen = false;
        this.campaignActionPreviewOpen = false;
        setOperationMapBackgroundInert(globalThis.document, false);
      }
      this.debugPanelOpen = true;
      setDebugBackgroundInert(globalThis.document, true);
      gameApp.onScreenChanged();
      this.$nextTick(() => focusDebugPanel(globalThis.document));
    },

    trapDebugPanelFocus(event) {
      const panel = globalThis.document.querySelector('.debug-panel');
      if (!panel) return;
      const focusable = [...panel.querySelectorAll(DEBUG_PANEL_FOCUSABLE_SELECTOR)].filter(
        (element) => element.getClientRects().length > 0,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        focusDebugPanel(globalThis.document);
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && !focusable.includes(event.target)) {
        event.preventDefault();
        last.focus();
      } else if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first.focus();
      }
    },

    closeDebugPanel() {
      this.debugPanelOpen = false;
      debugMenuHold?.cancel();
      setDebugBackgroundInert(globalThis.document, false);
      gameApp.onScreenChanged();
      this.$nextTick(() => globalThis.document.getElementById('game-menu-control')?.focus());
    },

    applyDebugConfiguration() {
      try {
        const result = debugConfigurationAdapter.apply({
          start: this.debugStart,
          frame: Number(this.debugFrame),
          renderer: this.debugRenderer,
          phase: this.debugPhase,
          reducedMotion: Boolean(this.debugReducedMotion),
        });
        this.visualQa = true;
        this.screen = GAME_SCREEN.GAME;
        this.isPlaying = false;
        this.reducedMotion = gameApp.prefersReducedMotion();
        this.debugConfigurationStatus = `현재 화면에 적용됨 · ${result.configuration.start}`;
      } catch (error) {
        this.debugConfigurationStatus = `설정 오류 · ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },

    returnToPlayerGame() {
      try {
        if (this.campaignActionPreviewOpen) gameApp.cancelCampaignActionPreview();
        debugConfigurationAdapter.returnToPlayerGame();
        this.visualQa = false;
        this.operationMapOpen = false;
        this.campaignActionPreviewOpen = false;
        this.debugPanelOpen = false;
        this.screen = GAME_SCREEN.GAME;
        this.isPlaying = true;
        this.reducedMotion = gameApp.prefersReducedMotion();
        setDebugBackgroundInert(globalThis.document, false);
        setCampaignActionBackgroundInert(globalThis.document, false);
        setGameOverBackgroundInert(globalThis.document, false);
        this.debugConfigurationStatus = '일반 게임으로 돌아왔습니다.';
        this.$nextTick(() =>
          applyFocusAfterPaint(
            screenFocusOwner.transitionTo(GAME_SCREEN.GAME, {
              menuReturnTarget: SCREEN_FOCUS_TARGET.MENU_START,
            }),
          ),
        );
      } catch (error) {
        this.debugConfigurationStatus = `전환 오류 · ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },

    openRenderLab() {
      mobileViewport.leaveLandscape();
      if (this.campaignActionPreviewOpen) gameApp.cancelCampaignActionPreview();
      this.debugPanelOpen = false;
      this.operationMapOpen = false;
      this.campaignActionPreviewOpen = false;
      debugMenuHold?.cancel();
      setDebugBackgroundInert(globalThis.document, false);
      setOperationMapBackgroundInert(globalThis.document, false);
      setCampaignActionBackgroundInert(globalThis.document, false);
      setGameOverBackgroundInert(globalThis.document, false);
      const focusRequest = screenFocusOwner.transitionTo(GAME_SCREEN.RENDER_LAB, {
        menuReturnTarget: SCREEN_FOCUS_TARGET.MENU_START,
      });
      this.screen = focusRequest.screen;
      this.isPlaying = true;
      this.$nextTick(() => {
        gameApp.onScreenChanged();
        applyFocusAfterPaint(focusRequest);
      });
    },

    showMenu() {
      mobileViewport.leaveLandscape();
      if (this.campaignActionPreviewOpen) gameApp.cancelCampaignActionPreview();
      this.debugPanelOpen = false;
      this.operationMapOpen = false;
      this.campaignActionPreviewOpen = false;
      debugMenuHold?.cancel();
      setDebugBackgroundInert(globalThis.document, false);
      setOperationMapBackgroundInert(globalThis.document, false);
      setCampaignActionBackgroundInert(globalThis.document, false);
      setGameOverBackgroundInert(globalThis.document, false);
      const focusRequest = screenFocusOwner.transitionTo(GAME_SCREEN.MENU);
      this.screen = focusRequest.screen;
      this.isPlaying = false;
      this.forceMobileControls = false;
      gameApp.onScreenChanged();
      this.$nextTick(() => applyFocusAfterPaint(focusRequest));
    },

    togglePlayback() {
      this.isPlaying = !this.isPlaying;
    },

    resetScene() {
      gameApp.resetScene();
    },

    toggleWorldTime() {
      gameApp.toggleWorldTime();
    },

    trainCombatSkill() {
      gameApp.trainCombatSkill();
    },

    executeDialogueCommand(command) {
      gameApp.executeDialogueCommand(this.dialogue.interactionId, command.id);
    },

    destroy() {
      debugHoldAbortController?.abort();
      debugHoldAbortController = null;
      debugMenuHold?.cancel();
      setDebugBackgroundInert(globalThis.document, false);
      setOperationMapBackgroundInert(globalThis.document, false);
      mobileViewport.leaveLandscape();
      gameApp.destroy();
    },
  }));
}
