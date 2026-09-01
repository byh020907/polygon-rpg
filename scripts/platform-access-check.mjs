import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GAME_SCREEN, resolveReducedMotionPreference } from '../src/app/GameApp.js';
import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
import { MobileInputAdapter } from '../src/input/MobileInputAdapter.js';
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
  assert.match(html, /id="debug-panel-title"/);
  assert.match(html, /class="debug-panel"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(html, /@keydown\.tab="trapDebugPanelFocus\(\$event\)"/);
  assert.match(html, /id="debug-start"[\s\S]*x-model="debugStart"/);
  assert.match(html, /id="debug-renderer"[\s\S]*x-model="debugRenderer"/);
  assert.match(html, /x-bind:selected="scenarioId === debugStart"/);
  assert.match(html, /x-bind:selected="rendererId === debugRenderer"/);
  assert.match(html, /x-bind:selected="phaseId === debugPhase"/);
  assert.match(css, /--debug-hold-progress/);
  assert.match(css, /\.debug-panel-backdrop/);
  const gameFooterMarkup = html.slice(
    html.indexOf('<footer class="game-footer">'),
    html.indexOf('<section\n        class="lab-screen"'),
  );
  assert.doesNotMatch(gameFooterMarkup, /x-text="gameStats"|FPS|logical/);
  assert.match(shell, /debugPanelOpen: this\.debugPanelOpen/);
  assert.match(shell, /this\.debugPanelOpen = true;[\s\S]*gameApp\.onScreenChanged\(\)/);
  assert.match(shell, /setDebugBackgroundInert\(globalThis\.document, true\)/);
  assert.match(shell, /addEventListener\('blur', \(\) => debugMenuHold\?\.interrupt\(\)/);
  assert.match(shell, /visibilitychange[\s\S]*document\.hidden\) debugMenuHold\?\.interrupt\(\)/);
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
    start: 'academy-dialogue',
    frame: 144,
    renderer: 'retro',
    phase: 'end',
    reducedMotion: false,
  });
  const serializedUrl = new URL(serialized.href);
  assert.equal(serializedUrl.searchParams.get('campaign'), 'fresh');
  assert.equal(serializedUrl.searchParams.get('visualQa'), '1');
  assert.equal(serializedUrl.searchParams.get('gameStart'), 'academy-dialogue');
  assert.equal(serializedUrl.searchParams.get('gameFrame'), '144');
  assert.equal(serializedUrl.searchParams.get('visualQaRenderer'), 'retro');
  assert.equal(serializedUrl.searchParams.get('visualQaPhase'), 'end');
  assert.equal(serializedUrl.searchParams.has('reducedMotion'), false);
  assert.equal(serializedUrl.hash, '#capture');
  assert.deepEqual(serialized.configuration, {
    start: 'academy-dialogue',
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

  const navigations = [];
  const fakeLocation = {
    href: source,
    search: new URL(source).search,
    assign(href) {
      navigations.push(href);
    },
  };
  const adapter = createDebugConfigurationAdapter(fakeLocation, request);
  adapter.apply(serialized.configuration);
  adapter.returnToPlayerGame();
  assert.equal(navigations.length, 2);
  assert.equal(new URL(navigations[0]).searchParams.get('gameStart'), 'academy-dialogue');
  assert.equal(new URL(navigations[0]).searchParams.get('debugPanel'), '1');
  assert.equal(new URL(navigations[1]).searchParams.has('visualQa'), false);
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
verifyDebugMenuHoldBoundary();
verifyVisualQaReducedMotionOverride();
verifyInteractiveControlKeyboardBoundary();
verifyReducedMotionVisualQaRequest();
verifyMobileVisibilityCleanup();

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
      ],
    },
    null,
    2,
  ),
);
