import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GameApplication } from '../src/app/GameApplication.js';
import { GAME_SCREEN, resolveReducedMotionPreference } from '../src/app/GameApp.js';
import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
import { MobileInputAdapter } from '../src/input/MobileInputAdapter.js';
import { createStandaloneViewportAdapter } from '../src/pwa/StandaloneViewportAdapter.js';
import {
  buildDebugQaUrl,
  buildPlayerGameUrl,
  createDebugConfiguration,
  createDebugConfigurationAdapter,
} from '../src/ui/DebugConfigurationAdapter.js';
import { HoldActivationController } from '../src/ui/HoldActivationController.js';
import {
  createDocumentFocusPort,
  ScreenFocusOwner,
  SCREEN_FOCUS_TARGET,
} from '../src/ui/ScreenFocusOwner.js';

function verifyScreenFocusTransitions() {
  const focusedTargets = [];
  const owner = new ScreenFocusOwner({
    focusPort: Object.freeze({
      focus(targetId) {
        focusedTargets.push(targetId);
        return true;
      },
    }),
  });

  const gameEntry = owner.transitionTo(GAME_SCREEN.GAME, {
    menuReturnTarget: SCREEN_FOCUS_TARGET.MENU_START,
  });
  assert.equal(gameEntry.targetId, SCREEN_FOCUS_TARGET.GAME_MENU);
  assert.equal(owner.apply(gameEntry), true);

  const menuReturn = owner.transitionTo(GAME_SCREEN.MENU);
  assert.equal(menuReturn.targetId, SCREEN_FOCUS_TARGET.MENU_START);
  assert.equal(owner.apply(gameEntry), false, 'stale focus request는 적용되면 안 된다.');
  assert.equal(owner.apply(menuReturn), true);

  const labEntry = owner.transitionTo(GAME_SCREEN.RENDER_LAB, {
    menuReturnTarget: SCREEN_FOCUS_TARGET.MENU_RENDER_LAB,
  });
  assert.equal(labEntry.targetId, SCREEN_FOCUS_TARGET.RENDER_LAB_HEADING);
  assert.equal(owner.apply(labEntry), true);

  const labReturn = owner.transitionTo(GAME_SCREEN.MENU);
  assert.equal(labReturn.targetId, SCREEN_FOCUS_TARGET.MENU_RENDER_LAB);
  assert.equal(owner.apply(labReturn), true);
  assert.deepEqual(focusedTargets, [
    SCREEN_FOCUS_TARGET.GAME_MENU,
    SCREEN_FOCUS_TARGET.MENU_START,
    SCREEN_FOCUS_TARGET.RENDER_LAB_HEADING,
    SCREEN_FOCUS_TARGET.MENU_RENDER_LAB,
  ]);
}

function verifyFocusPortAndNoFocusSteal() {
  let activeElement = null;
  const knownTarget = {
    focus() {
      activeElement = knownTarget;
    },
  };
  const browserDocument = {
    get activeElement() {
      return activeElement;
    },
    getElementById(targetId) {
      return targetId === 'known-target' ? knownTarget : null;
    },
  };
  const focusPort = createDocumentFocusPort(browserDocument);
  assert.equal(focusPort.focus('missing-target'), false);
  assert.equal(focusPort.focus('known-target'), true);

  const owner = new ScreenFocusOwner({ focusPort });
  const repeatedMenu = owner.transitionTo(GAME_SCREEN.MENU);
  assert.equal(repeatedMenu.changed, false);
  assert.equal(owner.apply(repeatedMenu), false, '같은 screen 갱신은 focus를 빼앗으면 안 된다.');
}

function verifySemanticStatusAndFocusTargets() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../src/ui/gameShell.js', import.meta.url), 'utf8');

  for (const targetId of Object.values(SCREEN_FOCUS_TARGET)) {
    assert.match(html, new RegExp(`id=["']${targetId}["']`), `${targetId} target이 필요하다.`);
  }
  assert.match(html, /id="game-canvas"[\s\S]*aria-describedby="game-status-surface"/);
  assert.match(html, /id="game-status-surface"/);
  assert.match(html, /class="visually-hidden game-semantic-status"/);
  assert.match(html, /role="region"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /지역: \$\{areaName\}/);
  assert.match(html, /목표: \$\{objective\}/);
  assert.match(html, /Player: 체력 \$\{health\}/);
  assert.match(html, /x-text="combatStatusAnnouncement"/);
  assert.match(html, /x-bind:aria-valuemax="maxHealth"/);
  assert.match(html, /x-bind:data-reduced-motion="reducedMotion"/);
  assert.match(html, /x-bind:data-camera-feedback-enabled="String\(!reducedMotion\)"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.game-semantic-status|\.visually-hidden/);
  assert.match(css, /@media \(min-width: 901px\)[\s\S]*height: 100dvh;[\s\S]*overflow: hidden;/);
  assert.match(css, /calc\(\(100dvh - 78px\) \* 16 \/ 9\)/);
  assert.match(
    css,
    /--game-safe-top: max\(4px, env\(safe-area-inset-top\)\);[\s\S]*height: var\(--app-visible-viewport-height, 100dvh\);[\s\S]*var\(--app-visible-viewport-width, 100vw\)[\s\S]*height: auto;[\s\S]*aspect-ratio: 16 \/ 9;/,
    '설치형 landscape도 visible viewport의 양 축과 safe-area를 보존하며 16:9 canvas를 유지해야 한다.',
  );
  assert.match(
    css,
    /@media \(max-width: 760px\) and \(orientation: landscape\) \{\s*\.game-screen \{\s*padding: var\(--game-safe-top\) var\(--game-safe-right\) var\(--game-safe-bottom\)\s*var\(--game-safe-left\);/,
    '좁은 landscape breakpoint도 game frame보다 큰 padding으로 visible viewport를 잘라서는 안 된다.',
  );
  assert.doesNotMatch(html, /MENTAL|정신력|vital-track--mental/);
  assert.doesNotMatch(shell, /\bmental(?:Percent)?\b|maxMental/);
  assert.doesNotMatch(css, /vital-track--mental/);

  const menuMarkup = html.slice(
    html.indexOf('<section class="menu-screen"'),
    html.indexOf('<section\n        class="game-screen"'),
  );
  assert.doesNotMatch(menuMarkup, /렌더 연구실|DEVELOPER E2E|visualQa/);
  assert.match(html, /id="game-menu-control"[\s\S]*@pointerdown="[^"]*startDebugMenuHold/);
  assert.match(html, /@pointerup="releaseDebugMenuHold"/);
  assert.match(html, /@lostpointercapture="interruptDebugMenuHold"/);
  assert.match(html, /@click="activateGameMenu"/);
  assert.match(html, /class="operation-map-panel"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(html, /id="operation-map-title"/);
  assert.match(html, /@keydown\.tab="trapOperationMapFocus\(\$event\)"/);
  assert.match(html, /x-for="region in campaign\.regions"/);
  assert.match(html, /x-for="edge in campaign\.routeEdges"/);
  assert.match(html, /왕도 도착 예정/);
  assert.match(html, /x-text="campaign\.hudLabel"/);
  assert.match(html, /class="scrap-awakening-deadline"[\s\S]*role="status"/);
  assert.match(html, /x-show="campaign\.awakeningStageId === 'deadline-revealed'"/);
  assert.match(html, /id="game-canvas"[\s\S]*tabindex="0"/);
  assert.match(html, /class="scrap-garage-reveal"[\s\S]*role="status"/);
  assert.match(html, /대항 병기 완성도 0%/);
  assert.match(html, /x-show="operationMapAvailable"/);
  assert.match(html, /id="debug-panel-title"/);
  assert.match(html, /class="debug-panel"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(html, /@keydown\.tab="trapDebugPanelFocus\(\$event\)"/);
  assert.match(html, /id="debug-start"[\s\S]*x-model="debugStart"/);
  assert.match(html, /id="debug-renderer"[\s\S]*x-model="debugRenderer"/);
  assert.match(html, /x-bind:selected="scenario\.id === debugStart"/);
  assert.match(html, /x-bind:selected="rendererId === debugRenderer"/);
  assert.match(html, /x-bind:selected="phaseId === debugPhase"/);
  assert.match(css, /--debug-hold-progress/);
  assert.match(css, /\.debug-panel-backdrop/);
  assert.match(css, /\.operation-map-backdrop/);
  const gameFooterMarkup = html.slice(
    html.indexOf('<footer class="game-footer">'),
    html.indexOf('<section\n        class="lab-screen"'),
  );
  assert.doesNotMatch(gameFooterMarkup, /x-text="gameStats"|FPS|logical/);
  assert.match(shell, /debugPanelOpen: this\.debugPanelOpen/);
  assert.match(shell, /operationMapOpen: this\.operationMapOpen/);
  assert.match(shell, /operationMapAvailable: false/);
  assert.match(shell, /if \(!this\.operationMapAvailable\) return/);
  assert.match(shell, /this\.openOperationMap\(\)/);
  assert.match(shell, /this\.debugPanelOpen = true;[\s\S]*gameApp\.onScreenChanged\(\)/);
  assert.match(shell, /setDebugBackgroundInert\(globalThis\.document, true\)/);
  assert.match(shell, /addEventListener\('blur', \(\) => debugMenuHold\?\.interrupt\(\)/);
  assert.match(shell, /visibilitychange[\s\S]*document\.hidden\) debugMenuHold\?\.interrupt\(\)/);
  assert.match(html, /현재 화면에 적용/);
  assert.match(shell, /gameApp\.applyDebugConfiguration\(request\)/);
  assert.doesNotMatch(shell, /location\.assign/);

  const gameApp = readFileSync(new URL('../src/app/GameApp.js', import.meta.url), 'utf8');
  assert.match(
    gameApp,
    /uiState\.debugPanelOpen !== true &&\s*uiState\.operationMapOpen !== true/,
    '작전 지도 modal 동안 fixed simulation도 멈춰야 한다.',
  );
}

function verifyStandaloneViewportSynchronization() {
  const windowListeners = new Map();
  const visualViewportListeners = new Map();
  const properties = new Map();
  const scheduledFrames = new Map();
  let nextFrameId = 0;
  const browserWindow = {
    innerWidth: 844,
    innerHeight: 390,
    addEventListener(name, listener) {
      windowListeners.set(name, listener);
    },
    removeEventListener(name) {
      windowListeners.delete(name);
    },
    requestAnimationFrame(callback) {
      const frameId = ++nextFrameId;
      scheduledFrames.set(frameId, callback);
      return frameId;
    },
    cancelAnimationFrame(frameId) {
      scheduledFrames.delete(frameId);
    },
    visualViewport: {
      width: 806.6,
      height: 361.3,
      addEventListener(name, listener) {
        visualViewportListeners.set(name, listener);
      },
      removeEventListener(name) {
        visualViewportListeners.delete(name);
      },
    },
  };
  const root = { style: { setProperty: (name, value) => properties.set(name, value) } };
  const adapter = createStandaloneViewportAdapter({ browserWindow, root });
  assert.equal(adapter.start(), true);
  assert.equal(properties.get('--app-visible-viewport-width'), '807px');
  assert.equal(properties.get('--app-visible-viewport-height'), '361px');
  browserWindow.visualViewport.height = 343.6;
  visualViewportListeners.get('resize')();
  assert.equal(properties.get('--app-visible-viewport-height'), '344px');
  browserWindow.visualViewport.width = 0;
  browserWindow.visualViewport.height = 0;
  browserWindow.innerWidth = 640;
  browserWindow.innerHeight = 390;
  windowListeners.get('orientationchange')();
  assert.equal(
    properties.get('--app-visible-viewport-width'),
    '640px',
    'standalone 전환 중 visualViewport가 일시적으로 0이어도 layout viewport로 복구해야 한다.',
  );
  assert.equal(properties.get('--app-visible-viewport-height'), '390px');
  browserWindow.visualViewport.width = 630.4;
  browserWindow.visualViewport.height = 354.4;
  const pendingCallbacks = [...scheduledFrames.values()];
  scheduledFrames.clear();
  for (const callback of pendingCallbacks) callback();
  assert.equal(
    properties.get('--app-visible-viewport-width'),
    '630px',
    '다음 paint에서 안정화한 standalone visual viewport를 다시 반영해야 한다.',
  );
  assert.equal(properties.get('--app-visible-viewport-height'), '354px');
  windowListeners.get('pageshow')();
  assert.equal(scheduledFrames.size, 1, 'pageshow 뒤에도 중복 resync frame을 예약하면 안 된다.');
  adapter.stop();
  assert.equal(windowListeners.size, 0, '화면 종료 뒤 window listener를 남기면 안 된다.');
  assert.equal(
    visualViewportListeners.size,
    0,
    '화면 종료 뒤 visual viewport listener를 남기면 안 된다.',
  );
  assert.equal(scheduledFrames.size, 0, '화면 종료 뒤 예약된 viewport resync를 남기면 안 된다.');
}

function verifyDebugConfigurationRoundTrip() {
  const source =
    'https://example.test/game?campaign=fresh&visualQa=1&gameStart=combat-hit&gameFrame=72&visualQaRenderer=polygon&visualQaPhase=start&reducedMotion=1#capture';
  const request = readVisualQaRequest(new URL(source).search);
  assert.deepEqual(createDebugConfiguration(request), {
    start: 'combat-hit',
    frame: 72,
    renderer: 'polygon',
    phase: 'start',
    reducedMotion: true,
  });

  const serialized = buildDebugQaUrl(source, {
    start: 'scrap-garage-0',
    frame: 144,
    renderer: 'retro',
    phase: 'end',
    reducedMotion: false,
  });
  const serializedUrl = new URL(serialized.href);
  assert.equal(serializedUrl.searchParams.get('campaign'), 'fresh');
  assert.equal(serializedUrl.searchParams.get('visualQa'), '1');
  assert.equal(serializedUrl.searchParams.get('gameStart'), 'scrap-garage-0');
  assert.equal(serializedUrl.searchParams.get('gameFrame'), '144');
  assert.equal(serializedUrl.searchParams.get('visualQaRenderer'), 'retro');
  assert.equal(serializedUrl.searchParams.get('visualQaPhase'), 'end');
  assert.equal(serializedUrl.searchParams.has('reducedMotion'), false);
  assert.equal(serializedUrl.hash, '#capture');
  assert.deepEqual(serialized.configuration, {
    start: 'scrap-garage-0',
    frame: 144,
    renderer: 'retro',
    phase: 'end',
    reducedMotion: false,
  });

  const playerUrl = new URL(buildPlayerGameUrl(serialized.href));
  assert.equal(playerUrl.searchParams.get('campaign'), 'fresh');
  for (const key of [
    'visualQa',
    'gameStart',
    'gameFrame',
    'visualQaRenderer',
    'visualQaPhase',
    'reducedMotion',
    'debugPanel',
  ]) {
    assert.equal(playerUrl.searchParams.has(key), false);
  }

  assert.throws(
    () => buildDebugQaUrl(source, { ...serialized.configuration, start: 'missing-scenario' }),
    /지원하지 않는 GAME_START/,
  );
  assert.throws(
    () => buildDebugQaUrl(source, { ...serialized.configuration, renderer: 'canvas3d' }),
    /지원하지 않는 Visual QA renderer/,
  );
  assert.throws(
    () => buildDebugQaUrl(source, { ...serialized.configuration, phase: 'unknown' }),
    /지원하지 않는 Visual QA phase/,
  );
  assert.throws(
    () => buildDebugQaUrl(source, { ...serialized.configuration, frame: 120_001 }),
    /0~120000 정수/,
  );

  const fakeLocation = {
    href: source,
    search: new URL(source).search,
  };
  const replacements = [];
  const fakeHistory = {
    state: Object.freeze({ source: 'fixture' }),
    replaceState(state, _title, href) {
      replacements.push({ state, href });
      fakeLocation.href = href;
      fakeLocation.search = new URL(href).search;
    },
  };
  const reconfigurationRequests = [];
  const adapter = createDebugConfigurationAdapter(fakeLocation, request, {
    browserHistory: fakeHistory,
    requestReconfiguration(reconfigurationRequest) {
      reconfigurationRequests.push(reconfigurationRequest);
    },
  });
  const applied = adapter.apply(serialized.configuration);
  adapter.returnToPlayerGame();
  assert.equal(replacements.length, 2);
  assert.equal(new URL(replacements[0].href).searchParams.get('gameStart'), 'scrap-garage-0');
  assert.equal(new URL(replacements[0].href).searchParams.get('debugPanel'), '1');
  assert.equal(new URL(replacements[1].href).searchParams.has('visualQa'), false);
  assert.equal(applied.request.start, 'scrap-garage-0');
  assert.equal(reconfigurationRequests[0].start, 'scrap-garage-0');
  assert.deepEqual(
    adapter.scenarioEntries.map((entry) => entry.id),
    [
      'scrap-intro-walk',
      'scrap-intro-before',
      'scrap-intro-awakening',
      'scrap-intro-d30',
      'scrap-intro-after',
      'scrap-garage-analysis',
      'scrap-garage-0',
      'scrap-issue-window',
      'scrap-mine-boss',
      'scrap-mine-resolved',
      'scrap-shipyard-boss',
      'scrap-shipyard-resolved',
      'scrap-greenhouse-boss',
      'scrap-greenhouse-resolved',
      'scrap-snow-boss',
      'scrap-snow-resolved',
      'scrap-quarry-boss',
      'scrap-quarry-resolved',
      'scrap-garage-20',
      'scrap-garage-40',
      'scrap-garage-60',
      'scrap-garage-80',
      'scrap-garage-100',
      'scrap-game-over',
      'scrap-final-armor',
      'scrap-final-epilogue',
      'scrap-art-benchmark',
      'scrap-character-board',
    ],
    '디버그 패널은 현재 고철 캠페인과 작전 지도 fixture만 선택지로 노출해야 한다.',
  );
  assert.equal(reconfigurationRequests[1], null);

  const rollbackLocation = { href: source, search: new URL(source).search };
  const rollbackReplacements = [];
  const rollbackHistory = {
    state: Object.freeze({ source: 'rollback-fixture' }),
    replaceState(state, _title, href) {
      rollbackReplacements.push({ state, href });
      rollbackLocation.href = href;
      rollbackLocation.search = new URL(href).search;
    },
  };
  const failingAdapter = createDebugConfigurationAdapter(rollbackLocation, request, {
    browserHistory: rollbackHistory,
    requestReconfiguration() {
      throw new Error('fixture replacement failure');
    },
  });
  assert.throws(
    () => failingAdapter.apply(serialized.configuration),
    /fixture replacement failure/,
  );
  assert.equal(rollbackReplacements.length, 2);
  assert.equal(rollbackLocation.href, source, 'candidate 실패 시 이전 URL을 복원해야 한다.');

  let historyFailureRequestCount = 0;
  const historyFailingAdapter = createDebugConfigurationAdapter(fakeLocation, request, {
    browserHistory: {
      replaceState() {
        throw new Error('fixture history failure');
      },
    },
    requestReconfiguration() {
      historyFailureRequestCount += 1;
    },
  });
  assert.throws(
    () => historyFailingAdapter.apply(serialized.configuration),
    /fixture history failure/,
  );
  assert.equal(historyFailureRequestCount, 0, 'URL 변경 실패 뒤 Game resource를 바꾸면 안 된다.');
}

function verifySamePageGameApplicationReplacement() {
  const apps = [];
  const uiWrites = [];
  let failNextVisualQa = false;
  const canvasDocument = {
    createElement(tagName) {
      assert.equal(tagName, 'canvas');
      return createCanvas('');
    },
  };
  function createCanvas(pixel) {
    const canvas = {
      width: 320,
      height: 180,
      ownerDocument: canvasDocument,
      pixel,
      getContext(contextId) {
        assert.equal(contextId, '2d');
        return {
          drawImage(source) {
            canvas.pixel = source.pixel;
          },
        };
      },
    };
    return canvas;
  }
  const gameCanvas = createCanvas('current-game-frame');
  const polygonCanvas = createCanvas('current-polygon-frame');
  const retroCanvas = createCanvas('current-retro-frame');
  const createGameApp = (options) => {
    const app = {
      options,
      destroyed: false,
      connectUi(uiBridge) {
        this.uiBridge = uiBridge;
      },
      start() {
        this.started = true;
        this.uiBridge.setSaveStatus('player-game-started');
      },
      runVisualQa(request) {
        this.uiBridge.setSaveStatus(`visual-qa:${request.start}`);
        options.gameCanvas.pixel = failNextVisualQa ? 'failed-candidate-frame' : 'next-game-frame';
        if (failNextVisualQa) throw new Error('fixture visual QA failure');
        return Object.freeze({ ready: true, start: request.start });
      },
      destroy() {
        this.destroyed = true;
      },
    };
    apps.push(app);
    return app;
  };
  const application = new GameApplication({
    gameCanvas,
    polygonCanvas,
    retroCanvas,
    createGameApp,
  });
  const uiBridge = {
    snapshot: () => Object.freeze({ screen: GAME_SCREEN.GAME, debugPanelOpen: true }),
    setRenderStats: (value) => uiWrites.push(['render', value]),
    setGameStats: (value) => uiWrites.push(['game', value]),
    setPlayerStatus: (value) => uiWrites.push(['player', value]),
    setWorldStatus: (value) => uiWrites.push(['world', value]),
    setDialoguePresentation: (value) => uiWrites.push(['dialogue', value]),
    setSaveStatus: (value) => uiWrites.push(['save', value]),
    requestOperationMap: () => uiWrites.push(['operation-map-request']),
    requestCampaignActionPreview: (value) => uiWrites.push(['campaign-action-preview', value]),
  };
  application.connectUi(uiBridge);

  const academyRequest = readVisualQaRequest(
    '?visualQa=1&gameStart=academy-dialogue&gameFrame=72&visualQaRenderer=polygon',
  );
  const result = application.applyDebugConfiguration(academyRequest);
  assert.equal(result.ready, true);
  assert.equal(apps[0].destroyed, true);
  assert.equal(application.currentApp, apps[1]);
  assert.deepEqual(uiWrites, [['save', 'visual-qa:academy-dialogue']]);

  failNextVisualQa = true;
  const previousApp = application.currentApp;
  const failedWriteCount = uiWrites.length;
  assert.throws(
    () => application.applyDebugConfiguration(academyRequest),
    /fixture visual QA failure/,
  );
  assert.equal(application.currentApp, previousApp, '실패 시 기존 Game resource를 유지해야 한다.');
  assert.equal(apps[2].destroyed, true);
  assert.equal(uiWrites.length, failedWriteCount, '실패한 후보의 UI write를 노출하면 안 된다.');
  assert.equal(gameCanvas.pixel, 'next-game-frame', '실패한 후보의 canvas도 복원해야 한다.');

  failNextVisualQa = false;
  application.returnToPlayerGame();
  assert.equal(previousApp.destroyed, true);
  assert.equal(application.currentApp, apps[3]);
  assert.deepEqual(uiWrites.at(-1), ['save', 'player-game-started']);
}

function verifyDebugMenuHoldBoundary() {
  let now = 0;
  let nextFrameId = 1;
  const frames = new Map();
  const progress = [];
  let completed = 0;
  const controller = new HoldActivationController({
    now: () => now,
    requestFrame(callback) {
      const frameId = nextFrameId;
      nextFrameId += 1;
      frames.set(frameId, callback);
      return frameId;
    },
    cancelFrame(frameId) {
      frames.delete(frameId);
    },
    onProgress(value) {
      progress.push(value);
    },
    onComplete() {
      completed += 1;
    },
  });
  const advance = (milliseconds) => {
    now = milliseconds;
    const callback = frames.values().next().value;
    frames.clear();
    callback(now);
  };

  assert.equal(controller.begin(), true);
  advance(400);
  assert.equal(progress.at(-1), 0.4);
  const shortRelease = controller.release();
  assert.equal(shortRelease.completed, false);
  assert.equal(controller.consumePrimaryActivation(), true);
  assert.equal(completed, 0);

  now = 2_000;
  assert.equal(controller.begin(), true);
  advance(2_999);
  assert.equal(completed, 0, '999ms hold는 debug panel을 열면 안 된다.');
  advance(3_000);
  assert.equal(progress.at(-1), 1);
  assert.equal(completed, 1, '1초 hold는 정확히 한 번 완료되어야 한다.');
  const completedRelease = controller.release();
  assert.equal(completedRelease.completed, true);
  assert.equal(
    controller.consumePrimaryActivation(),
    false,
    '완료 뒤 click은 menu로 보내면 안 된다.',
  );
  assert.equal(
    controller.consumePrimaryActivation(),
    true,
    'click suppression은 한 번만 적용한다.',
  );

  now = 4_000;
  assert.equal(controller.begin(), true);
  advance(4_999);
  now = 5_000;
  const releaseAtThreshold = controller.release();
  assert.equal(
    releaseAtThreshold.completed,
    true,
    '마지막 rAF가 999ms여도 release가 1000ms이면 hold가 완료되어야 한다.',
  );
  assert.equal(completed, 2);
  assert.equal(controller.consumePrimaryActivation(), false);

  now = 6_000;
  assert.equal(controller.begin(), true);
  advance(6_400);
  assert.equal(controller.interrupt(), true);
  now = 8_000;
  const interruptedRelease = controller.release();
  assert.equal(interruptedRelease.completed, false, '중단된 hold는 복귀 뒤 완료되면 안 된다.');
  assert.equal(interruptedRelease.interrupted, true);
  assert.equal(
    controller.consumePrimaryActivation(),
    false,
    '중단된 pointer hold 뒤 activation은 menu로 보내면 안 된다.',
  );
  assert.equal(controller.consumePrimaryActivation(), true);
  assert.equal(controller.interrupt(), false, 'inactive hold interrupt는 no-op이어야 한다.');
}

function verifyVisualQaReducedMotionOverride() {
  assert.equal(
    resolveReducedMotionPreference({
      visualQaRequest: { reducedMotion: false },
      systemMatches: true,
    }),
    false,
    'explicit QA false는 OS reduced-motion을 override해야 한다.',
  );
  assert.equal(
    resolveReducedMotionPreference({
      visualQaRequest: { reducedMotion: true },
      systemMatches: false,
    }),
    true,
  );
  assert.equal(
    resolveReducedMotionPreference({ visualQaRequest: null, systemMatches: true }),
    true,
    '일반 player flow는 OS preference를 따라야 한다.',
  );
}

function verifyInteractiveControlKeyboardBoundary() {
  const adapter = new KeyboardInputAdapter({ isActive: () => true });
  let prevented = false;
  adapter.onKeyDown({
    code: 'ArrowRight',
    target: { closest: () => ({ tagName: 'INPUT' }) },
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(prevented, false, 'range control의 Arrow는 gameplay가 소비하면 안 된다.');
  assert.equal(adapter.snapshot().right, false);

  adapter.onKeyDown({
    code: 'ArrowRight',
    target: { closest: () => null },
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(prevented, true, 'game surface의 Arrow는 gameplay intent여야 한다.');
  assert.equal(adapter.snapshot().right, true);

  for (const code of ['Space', 'Enter']) {
    let activationPrevented = false;
    adapter.onKeyDown({
      code,
      target: { closest: () => ({ tagName: 'BUTTON' }) },
      preventDefault: () => {
        activationPrevented = true;
      },
    });
    assert.equal(
      activationPrevented,
      false,
      `${code} native button activation은 gameplay가 소비하면 안 된다.`,
    );
  }

  const suspendedAdapter = new KeyboardInputAdapter({ isActive: () => false });
  let debugButtonPrevented = false;
  suspendedAdapter.onKeyDown({
    code: 'KeyA',
    target: { closest: () => null },
    preventDefault: () => {
      debugButtonPrevented = true;
    },
  });
  assert.equal(debugButtonPrevented, false);
  assert.equal(
    suspendedAdapter.snapshot().basicAttack,
    false,
    'debug panel이 input을 suspend하면 gameplay command가 생성되면 안 된다.',
  );
}

function verifyReducedMotionVisualQaRequest() {
  const request = readVisualQaRequest(
    '?visualQa=1&gameStart=combat-hit&visualQaRenderer=polygon&visualQaPhase=active&reducedMotion=1',
  );
  assert.equal(request.reducedMotion, true);
  assert.equal(request.start, 'combat-hit');
  assert.equal(request.renderer, 'polygon');
}

function verifyMobileVisibilityCleanup() {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const documentTarget = {
    hidden: false,
    defaultView: {
      addEventListener(eventName, listener) {
        windowListeners.set(eventName, listener);
      },
    },
    addEventListener(eventName, listener) {
      documentListeners.set(eventName, listener);
    },
  };
  const adapter = new MobileInputAdapter();
  adapter.attach(documentTarget);

  adapter.press('left', 11);
  documentTarget.hidden = true;
  documentListeners.get('visibilitychange')();
  assert.equal(
    adapter.snapshot().left,
    false,
    'background 전환은 held mobile input을 풀어야 한다.',
  );

  adapter.press('right', 12);
  windowListeners.get('blur')();
  assert.equal(adapter.snapshot().right, false, 'window blur도 held mobile input을 풀어야 한다.');
  adapter.detach();
}

verifyScreenFocusTransitions();
verifyFocusPortAndNoFocusSteal();
verifySemanticStatusAndFocusTargets();
verifyDebugConfigurationRoundTrip();
verifySamePageGameApplicationReplacement();
verifyDebugMenuHoldBoundary();
verifyVisualQaReducedMotionOverride();
verifyInteractiveControlKeyboardBoundary();
verifyReducedMotionVisualQaRequest();
verifyMobileVisibilityCleanup();
verifyStandaloneViewportSynchronization();

console.log(
  JSON.stringify(
    {
      outcomes: [
        'menu-game-menu-focus-return',
        'menu-render-lab-menu-focus-return',
        'stale-focus-request-rejection',
        'missing-focus-target-safe-result',
        'same-screen-no-focus-steal',
        'accessible-screen-entry-controls',
        'default-menu-debug-free',
        'one-second-menu-hold-and-short-activation-split',
        'completed-hold-click-suppression',
        'release-at-threshold-rAF-race',
        'blur-visibility-pointer-loss-hold-interruption',
        'debug-url-panel-round-trip',
        'debug-same-page-atomic-game-resource-replacement',
        'debug-history-replace-without-navigation',
        'debug-failed-candidate-keeps-current-game',
        'debug-failed-candidate-restores-canvas-and-url',
        'debug-history-failure-keeps-current-game',
        'debug-configuration-rejection-boundaries',
        'debug-panel-gameplay-input-suspension',
        'game-footer-debug-stats-removed',
        'render-lab-control-keyboard-boundary',
        'native-button-space-enter-activation',
        'canvas-independent-area-objective-player-combat-status',
        'reduced-motion-presentation-policy',
        'reduced-motion-in-app-visual-qa-request',
        'visual-qa-explicit-reduced-motion-override',
        'mobile-visibility-and-window-blur-cleanup',
        'standalone-visible-viewport-safe-area-synchronization',
      ],
    },
    null,
    2,
  ),
);
