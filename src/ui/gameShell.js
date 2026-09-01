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
    areaName: '왕립 마법학교 학원촌',
    storyBeatId: 'academy-briefing',
    storyTitle: '세라 교관의 출정 수업',
    storyBriefing: '전직 전투교관 세라가 주문 없이 마법 생물에 맞서는 첫 임무를 맡겼습니다.',
    dialogue: Object.freeze({
      active: false,
      available: false,
      interactionId: null,
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
    }),
    objective: '장비를 고른 뒤 오른쪽 황금 문에서 ↑로 실습림 첫 원정을 시작하세요.',
    journeyLabel: '학원촌 준비',
    encounterHint: '',
    encounterHealthLabel: '',
    wardLabel: '수호 수액 미획득',
    timeLabel: '낮',
    deadlineLabel: 'Deadline 12:00',
    canSelectEquipment: true,
    canManageProgression: true,
    canForgeEnchant: false,
    activeEnchantId: null,
    activeEnchantLabel: '미활성',
    enchantOptions: Object.freeze([]),
    selectedEquipmentId: '',
    selectedEquipmentLabel: '장비 정보 불러오는 중',
    equipmentOptions: Object.freeze([]),
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
          this.areaName = status.areaName;
          this.storyBeatId = status.story.beatId;
          this.storyTitle = status.story.title;
          this.storyBriefing = status.story.briefing;
          this.dialogue = status.dialogue;
          this.objective = status.objective;
          this.timeLabel = status.timeLabel;
          this.deadlineLabel = status.deadlineLabel;
          this.canSelectEquipment = status.canSelectEquipment;
          this.canManageProgression = status.canManageProgression;
          this.canForgeEnchant = status.canForgeEnchant;
          this.activeEnchantId = status.activeEnchantId;
          this.activeEnchantLabel = status.activeEnchantLabel;
          this.enchantOptions = status.enchantOptions;
          this.selectedEquipmentId = status.equipmentId;
          this.selectedEquipmentLabel = status.equipmentLabel;
          this.equipmentOptions = status.equipmentOptions;
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
      if (result && !result.completed) this.showMenu();
    },

    activateGameMenu() {
      if (!debugMenuHold?.consumePrimaryActivation()) return;
      this.showMenu();
    },

    openDebugPanel() {
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
        debugConfigurationAdapter.returnToPlayerGame();
        this.visualQa = false;
        this.debugPanelOpen = false;
        this.screen = GAME_SCREEN.GAME;
        this.isPlaying = true;
        this.reducedMotion = gameApp.prefersReducedMotion();
        setDebugBackgroundInert(globalThis.document, false);
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
      this.debugPanelOpen = false;
      debugMenuHold?.cancel();
      setDebugBackgroundInert(globalThis.document, false);
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
      this.debugPanelOpen = false;
      debugMenuHold?.cancel();
      setDebugBackgroundInert(globalThis.document, false);
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

    selectEquipment(profileId) {
      gameApp.selectEquipment(profileId);
    },

    chooseEquipment(option) {
      if (option.owned) gameApp.selectEquipment(option.id);
      else gameApp.purchaseEquipment(option.id);
    },

    trainCombatSkill() {
      gameApp.trainCombatSkill();
    },

    selectEnchant(option) {
      gameApp.selectEnchant(option.id);
    },

    destroy() {
      debugHoldAbortController?.abort();
      debugHoldAbortController = null;
      debugMenuHold?.cancel();
      setDebugBackgroundInert(globalThis.document, false);
      mobileViewport.leaveLandscape();
      gameApp.destroy();
    },
  }));
}
