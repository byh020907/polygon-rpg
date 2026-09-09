import { EQUIPMENT_CATALOG } from '../src/game/equipment/EquipmentCatalog.js';
import { EQUIPMENT_SLOT_KEYS } from '../src/game/equipment/EquipmentLoadout.js';
import assert from 'node:assert/strict';
import { GameApp } from '../src/app/GameApp.js';
import { GameApplication } from '../src/app/GameApplication.js';
import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';

const frames = new Map();
let nextFrame = 0;
let storageTouches = 0;
const storage = new Map([
  ['polygon-rpg.progression.v1', 'existing-player-save'],
  ['polygon-rpg.progression.v1.recovery', 'existing-recovery'],
]);
const originalStorage = [...storage];
globalThis.window = new EventTarget();
Object.defineProperty(globalThis.window, 'localStorage', {
  get() {
    storageTouches++;
    throw new Error('test context must never open player storage');
  },
});
globalThis.window.matchMedia = () => ({ matches: false });
globalThis.window.devicePixelRatio = 1;
globalThis.document = new EventTarget();
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = (callback) => {
  const id = ++nextFrame;
  frames.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
globalThis.HTMLCanvasElement = class {
  constructor() {
    this.width = 320;
    this.height = 180;
    this.clientWidth = 320;
    this.clientHeight = 180;
    this.pixel = 'original';
    this.ownerDocument = { createElement: () => new globalThis.HTMLCanvasElement() };
  }
  getBoundingClientRect() {
    return { width: 320, height: 180 };
  }
  getContext() {
    return {
      setTransform() {},
      drawImage: (source) => {
        this.pixel = source.pixel;
      },
    };
  }
};
const canvas = new globalThis.HTMLCanvasElement();
const writes = [];
const ui = { snapshot: () => ({ screen: 'game', testPlaySpeed: 0.5 }) };
for (const method of [
  'setRenderStats',
  'setGameStats',
  'setQaInputStatus',
  'setPlayerStatus',
  'setWorldStatus',
  'setDialoguePresentation',
  'setSaveStatus',
  'setRecoverySlots',
  'requestOperationMap',
  'requestCampaignActionPreview',
])
  ui[method] = (...args) => writes.push([method, ...args]);
const request = readVisualQaRequest('?visualQa=1&gameStart=scrap-intro-walk&gameFrame=0');
const instances = [];
const application = new GameApplication({
  gameCanvas: canvas,
  visualQaRequest: request,
  createGameApp(options) {
    const app = new GameApp(options);
    app.gameRenderer.render = () => {
      canvas.pixel = `frame-${instances.indexOf(app)}`;
      return { logicalWidth: 320, logicalHeight: 180 };
    };
    instances.push(app);
    return app;
  },
});
application.connectUi(ui);
application.startTestPlay(request);
assert.equal(application.testPlayActive, true);
assert.equal(application.currentApp.isVisualQa, true);
assert.equal(application.currentApp.manualMode, false);
assert.equal(frames.size, 1);
assert.equal(application.currentApp.progressionStorage, null);
assert.equal(application.currentApp.createSimulationSettings(ui.snapshot()).animationSpeed, 0.5);
assert.equal(
  GameApp.prototype.createSimulationSettings.call(
    { isTestPlay: false, prefersReducedMotion: () => false },
    ui.snapshot(),
  ).animationSpeed,
  1,
);
const app = application.currentApp;
assert.equal(app.saveCurrentProgress().ok, false);
assert.equal(app.resetSavedProgress().ok, false);
application.resetScene();
assert.equal(frames.size, 1, 'restart must not add a second RAF');
assert.throws(
  () => application.startTestPlay(request, { expectedEntityId: 'missing-entity' }),
  /활성화되지/,
);
assert.equal(application.currentApp, app);
assert.equal(app.input.keyboard.isAttached, true);
const beforeX = app.scene.position.x;
const key = new Event('keydown', { cancelable: true });
Object.defineProperty(key, 'code', { value: 'ArrowRight' });
globalThis.window.dispatchEvent(key);
for (let frame = 0; frame < 30; frame++) app.update(1 / 120, app.createInputSnapshot());
assert.ok(app.scene.position.x > beforeX, 'native input adapter must advance the real simulation');
application.resetScene();
assert.equal(app.scene.position.x, beforeX, 'restart restores the initial test placement');
assert.equal(app.createInputSnapshot().right, false);
const stablePixel = canvas.pixel;
const stableWrites = writes.length;
assert.throws(() =>
  application.startTestPlay(request, {
    location: { regionId: 'missing', roomId: 'missing', x: 10 },
  }),
);
assert.equal(application.currentApp, app);
assert.equal(frames.size, 1);
assert.equal(canvas.pixel, stablePixel);
assert.equal(writes.length, stableWrites);
assert.throws(() => application.startTestPlay(request, { equipmentId: 'missing' }));
assert.equal(application.currentApp, app);
application.startTestPlay(request);
assert.equal(frames.size, 1);
assert.equal(app.input.keyboard.isAttached, false);
const equipmentId = application.currentApp.equipmentIds.at(-1);
const location = { ...application.currentApp.scene.mapRuntime.getActiveLocation(), x: 300 };
application.startTestPlay(request, { equipmentId, location });
assert.equal(
  application.currentApp.scene.getProgressionSnapshot().loadout[
    EQUIPMENT_SLOT_KEYS[
      EQUIPMENT_CATALOG.getFamily(EQUIPMENT_CATALOG.getItem(equipmentId).familyId).slot
    ]
  ],
  equipmentId,
);
assert.deepEqual(application.currentApp.scene.mapRuntime.getActiveLocation(), {
  regionId: location.regionId,
  roomId: location.roomId,
});
assert.equal(frames.size, 1);
assert.equal(storageTouches, 0);
assert.deepEqual([...storage], originalStorage);
application.destroy();
assert.equal(frames.size, 0);
assert.equal(application.currentApp.input.keyboard.isAttached, false);
console.log(
  'PASS test play: actual QA scene initialization, no storage access, restart/input/RAF lifecycle, candidate UI/canvas rollback and speed isolation',
);
