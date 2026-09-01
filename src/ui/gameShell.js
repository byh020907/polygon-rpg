import { GAME_SCREEN } from '../app/GameApp.js';
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

export function registerGameShell(Alpine, gameApp, { visualQaRequest = null } = {}) {
  const mobileViewport = createMobileViewportController(globalThis.document, globalThis.screen);
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
    canSelectEquipment: true,
    canManageProgression: true,
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
      gameApp.connectUi({
        snapshot: () =>
          Object.freeze({
            screen: this.screen,
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
          this.canSelectEquipment = status.canSelectEquipment;
          this.canManageProgression = status.canManageProgression;
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
          return;
        }
        gameApp.start();
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

    get combatStatusAnnouncement() {
      const transitionLabels = Object.freeze({
        'guard-contact': '방어 성공',
        'guard-broken': 'Player 방어 파괴',
        'guard-break': '상대 방어 파괴',
        'strong-startup-interrupted': '강한 공격 준비 취소',
        'action-rejected': '스태미나 부족으로 행동 불가',
      });
      const transition = transitionLabels[this.lastCommandTransition?.kind];
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

    openRenderLab() {
      mobileViewport.leaveLandscape();
      const focusRequest = screenFocusOwner.transitionTo(GAME_SCREEN.RENDER_LAB, {
        menuReturnTarget: SCREEN_FOCUS_TARGET.MENU_RENDER_LAB,
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

    destroy() {
      mobileViewport.leaveLandscape();
      gameApp.destroy();
    },
  }));
}
