import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { openQaBrowser } from './qa/BrowserHarness.mjs';

const output = resolve('artifacts/visual-qa-orchestration');
mkdirSync(output, { recursive: true });
const evidence = [];
const cases = [
  { id: 'scrap-dialogue-review', ui: 'dialogue', dialogue: 'scrapyard-owner-analysis' },
  { id: 'scrap-workshop', ui: 'workshop', dialogue: 'scrapyard-owner-workshop', commands: 10 },
  { id: 'scrap-garage-opened', ui: 'garage', garage: 'garage-opened' },
  { id: 'scrap-recovery-review', ui: 'recovery', gameOver: 'recovery-choice' },
  { id: 'scrap-dialogue-review', ui: 'dialogue', dialogue: 'scrapyard-owner-analysis', frame: 72 },
  { id: 'baseline-strong-playback', motion: 'heavy' },
  { id: 'baseline-basic-playback', motion: 'slash' },
  { id: 'baseline-run-playback' },
  { id: 'baseline-roll-playback' },
  { id: 'combat-hit' },
  { id: 'combat-strong-windup' },
  { id: 'scrap-intro-awakening', frame: 72 },
  { id: 'scrap-garage-analysis', frame: 72 },
];

for (const [viewport, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
]) {
  const browser = await openQaBrowser({ width, height });
  try {
    for (const entry of cases) {
      const query = new URLSearchParams({
        visualQa: '1',
        gameStart: entry.id,
        gameFrame: String(entry.frame ?? 0),
        visualQaPhase: 'active',
      });
      if (entry.ui) query.set('uiReview', `ui/${entry.ui}`);
      const beforeEvents = browser.events.length;
      await browser.navigate(`?${query}`);
      const result = await browser.until('globalThis.__POLYGON_RPG_VISUAL_QA__');
      assert.equal(result.ready, true, `${viewport}/${entry.id}: ${result.error ?? ''}`);
      assert.equal(
        result.assertion.passed,
        true,
        `${viewport}/${entry.id} production QA assertions`,
      );
      if (entry.dialogue) {
        assert.equal(result.dialogue.active, true);
        assert.equal(result.dialogue.interactionId, entry.dialogue);
        assert.ok(result.dialogue.visibleLine.length > 0);
      }
      if (entry.commands) assert.equal(result.dialogue.commands.length, entry.commands);
      if (entry.motion) assert.equal(result.combatMotion.id, entry.motion);
      if (entry.garage) assert.equal(result.garageRevealStageId, entry.garage);
      if (entry.gameOver) assert.equal(result.gameOverStageId, entry.gameOver);
      let ui = null;
      if (entry.ui) {
        ui = await browser.until('globalThis.__POLYGON_RPG_UI_REVIEW__');
        assert.equal(ui.visible, true, `${viewport}/${entry.id} actual component visibility`);
        await browser.screenshot(join(output, `${viewport}-${entry.id}-${entry.frame ?? 0}.png`));
      }
      const errors = browser.events
        .slice(beforeEvents)
        .filter((event) => event.method === 'Runtime.exceptionThrown');
      assert.equal(errors.length, 0, `${viewport}/${entry.id}: ${JSON.stringify(errors)}`);
      evidence.push({
        viewport,
        id: entry.id,
        frame: entry.frame ?? 0,
        ui,
        assertion: result.assertion,
        dialogue: result.dialogue.active
          ? {
              id: result.dialogue.interactionId,
              line: result.dialogue.visibleLine,
              commands: result.dialogue.commands.length,
            }
          : null,
        motion: result.combatMotion.id,
        garage: result.garageRevealStageId,
        gameOver: result.gameOverStageId,
      });
      process.stdout.write(`${viewport}/${entry.id}/${entry.frame ?? 0} PASS\n`);
    }
  } finally {
    await browser.close();
  }
}

writeFileSync(join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ status: 'PASS', cases: evidence.length, output }));
