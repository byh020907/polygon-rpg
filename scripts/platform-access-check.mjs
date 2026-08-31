import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GAME_SCREEN } from '../src/app/GameApp.js';
import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { KeyboardInputAdapter } from '../src/input/KeyboardInputAdapter.js';
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
}

function verifyReducedMotionVisualQaRequest() {
  const request = readVisualQaRequest(
    '?visualQa=1&gameStart=combat-hit&visualQaRenderer=polygon&visualQaPhase=active&reducedMotion=1',
  );
  assert.equal(request.reducedMotion, true);
  assert.equal(request.start, 'combat-hit');
  assert.equal(request.renderer, 'polygon');
}

verifyScreenFocusTransitions();
verifyFocusPortAndNoFocusSteal();
verifySemanticStatusAndFocusTargets();
verifyInteractiveControlKeyboardBoundary();
verifyReducedMotionVisualQaRequest();

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
        'render-lab-control-keyboard-boundary',
        'native-button-space-enter-activation',
        'canvas-independent-area-objective-player-combat-status',
        'reduced-motion-presentation-policy',
        'reduced-motion-in-app-visual-qa-request',
      ],
    },
    null,
    2,
  ),
);
