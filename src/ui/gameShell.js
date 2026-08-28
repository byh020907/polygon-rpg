import { GAME_SCREEN } from '../app/GameApp.js';

function formatRuntimeStats({ fps, logicalWidth, logicalHeight, droppedSteps }) {
  return `${fps} FPS · ${logicalWidth}×${logicalHeight} logical · ${droppedSteps} dropped`;
}

function formatGameStats({ fps, logicalWidth, logicalHeight }) {
  return `${fps} FPS · ${logicalWidth}×${logicalHeight} logical`;
}

export function registerGameShell(Alpine, gameApp) {
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
    objective: '계단 근처에서 ↑/↓로 앞뒤 레인을 이동하세요.',
    timeLabel: '낮',
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    mental: 65,
    maxMental: 100,
    gold: 0,
    mobileDirections: Object.freeze([
      Object.freeze({ id: 'guard', label: '↑', hint: '방어·뒤길', slot: 'up' }),
      Object.freeze({ id: 'left', label: '←', hint: '이동', slot: 'left' }),
      Object.freeze({ id: 'crouch', label: '↓', hint: '앉기·앞길', slot: 'down' }),
      Object.freeze({ id: 'right', label: '→', hint: '이동', slot: 'right' }),
    ]),
    mobileActions: Object.freeze([
      Object.freeze({ id: 'heavyAttack', label: 'Q', hint: '강공', slot: 'q' }),
      Object.freeze({ id: 'risingAttack', label: 'W', hint: '올려', slot: 'w' }),
      Object.freeze({ id: 'rageAttack', label: 'E', hint: '회전', slot: 'e' }),
      Object.freeze({ id: 'primaryAttack', label: 'A', hint: '베기', slot: 'a' }),
      Object.freeze({ id: 'thrustAttack', label: 'S', hint: '찌르기', slot: 's' }),
      Object.freeze({ id: 'jump', label: 'JUMP', hint: '점프', slot: 'jump' }),
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
        setWorldStatus: (status) => {
          this.areaName = status.areaName;
          this.objective = status.objective;
          this.timeLabel = status.timeLabel;
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
      this.forceMobileControls = false;
      this.launchGame();
    },

    startMobileGame() {
      this.forceMobileControls = true;
      this.launchGame();
    },

    launchGame() {
      this.screen = GAME_SCREEN.GAME;
      this.isPlaying = true;
      this.$nextTick(() => gameApp.enterGame());
    },

    openRenderLab() {
      this.screen = GAME_SCREEN.RENDER_LAB;
      this.isPlaying = true;
      this.$nextTick(() => gameApp.onScreenChanged());
    },

    showMenu() {
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

    destroy() {
      gameApp.destroy();
    },
  }));
}
