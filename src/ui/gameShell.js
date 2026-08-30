import { GAME_SCREEN } from '../app/GameApp.js';
import { EQUIPMENT_PROFILES } from '../game/equipment/EquipmentProfiles.js';

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

export function registerGameShell(Alpine, gameApp) {
  const mobileViewport = createMobileViewportController(globalThis.document, globalThis.screen);

  Alpine.data('gameShell', () => ({
    screen: GAME_SCREEN.MENU,
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
    objective: '장비를 고르고 오른쪽 황금 Portal에서 ↑로 첫 Field 원정을 시작하세요.',
    journeyLabel: '학원촌 준비',
    encounterHint: '',
    encounterHealthLabel: '',
    wardLabel: '수호 수액 미획득',
    timeLabel: '낮',
    canSelectEquipment: true,
    selectedEquipmentId: EQUIPMENT_PROFILES[0].id,
    selectedEquipmentLabel: EQUIPMENT_PROFILES[0].label,
    equipmentOptions: Object.freeze(
      EQUIPMENT_PROFILES.map(({ id, shortLabel, description }) =>
        Object.freeze({ id, shortLabel, description }),
      ),
    ),
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    mental: 65,
    maxMental: 100,
    gold: 0,
    mobileDirections: Object.freeze([
      Object.freeze({ id: 'jump', label: '↑', hint: '점프·Portal', slot: 'up' }),
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
          this.gold = status.gold;
        },
        setWorldStatus: (status) => {
          this.areaName = status.areaName;
          this.objective = status.objective;
          this.timeLabel = status.timeLabel;
          this.canSelectEquipment = status.canSelectEquipment;
          this.selectedEquipmentId = status.equipmentId;
          this.selectedEquipmentLabel = status.equipmentLabel;
          this.journeyLabel = status.journeyLabel;
          this.encounterHint = status.encounterHint;
          this.encounterHealthLabel = status.encounterHealthLabel;
          this.wardLabel = status.wardLabel;
        },
      });
      this.$nextTick(() => gameApp.start());
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

    get mentalPercent() {
      return `${Math.max(0, Math.min(100, (this.mental / this.maxMental) * 100))}%`;
    },

    startGame() {
      mobileViewport.leaveLandscape();
      this.forceMobileControls = false;
      this.launchGame();
    },

    startMobileGame() {
      void mobileViewport.enterLandscape();
      this.forceMobileControls = true;
      this.launchGame();
    },

    launchGame() {
      this.screen = GAME_SCREEN.GAME;
      this.isPlaying = true;
      this.$nextTick(() => gameApp.enterGame());
    },

    openRenderLab() {
      mobileViewport.leaveLandscape();
      this.screen = GAME_SCREEN.RENDER_LAB;
      this.isPlaying = true;
      this.$nextTick(() => gameApp.onScreenChanged());
    },

    showMenu() {
      mobileViewport.leaveLandscape();
      this.screen = GAME_SCREEN.MENU;
      this.isPlaying = false;
      this.forceMobileControls = false;
      gameApp.onScreenChanged();
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

    destroy() {
      mobileViewport.leaveLandscape();
      gameApp.destroy();
    },
  }));
}
