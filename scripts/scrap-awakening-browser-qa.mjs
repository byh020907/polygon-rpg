import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';

const STORAGE_KEY = 'polygon-rpg.progression.v1';
const outputDirectory = join('artifacts', 'scrap-awakening-browser-qa');
mkdirSync(outputDirectory, { recursive: true });
for (const staleFailureFile of ['failure.json', 'failure.png']) {
  rmSync(join(outputDirectory, staleFailureFile), { force: true });
}

const shell = "Alpine.$data(document.querySelector('#app'))";
const saved = `JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}))`;
const stageExpression = `${saved}.scrapCampaign.awakeningStageId`;
const garageStageExpression = `${saved}.scrapCampaign.garageRevealStageId`;
const liveStageExpression = `${shell}.campaign.awakeningStageId`;

const expectedAwakeningStages = Object.freeze([
  'rival-departure',
  'yard-clearance',
  'yard-brace',
  'yard-perimeter',
  'yard-survey',
  'yard-approach',
  'yard-plate',
  'yard-ridge',
  'yard-guard',
  'yard-search',
  'collapse',
  'rescue-request',
  'player-decision',
  'device-investigated',
  'device-recovered',
  'rescue-succeeded',
  'eyes-lit',
  'assembled',
  'deadline-revealed',
  'complete',
]);

const expectedConversationIds = Object.freeze([
  'scrap-prologue:owner-commission',
  'scrap-prologue:rival-departure',
  'scrap-prologue:yard-brace',
  'scrap-prologue:yard-survey',
  'scrap-prologue:yard-plate',
  'scrap-prologue:yard-search',
  'scrap-prologue:rival-rescue',
  'scrap-prologue:player-decision',
  'scrapyard-owner-analysis',
]);
const expectedUnitIds = Object.freeze([
  'scrap-yard-scout-collector',
  'scrap-yard-brace-collector',
  'scrap-yard-approach-collector',
  'scrap-yard-ridge-collector',
  'scrap-yard-guard-collector',
]);

const browser = await openQaBrowser({ width: 1280, height: 720, search: '?inputQa=1' });
const screenshots = [];
const observedAwakeningStages = [];
const observedGarageStages = [];
const encounteredUnitIds = [];
const combatEvidence = [];

const readProgression = () => browser.evaluate(saved);
const readUi = () =>
  browser.evaluate(
    `({screen:${shell}.screen,dialogue:${shell}.dialogue,campaign:${shell}.campaign,objective:${shell}.objective,journeyLabel:${shell}.journeyLabel,wardLabel:${shell}.wardLabel,operationMapOpen:${shell}.operationMapOpen,operationMapAvailable:${shell}.operationMapAvailable})`,
  );
const readTelemetry = () => browser.evaluate('globalThis.__POLYGON_RPG_INPUT_QA__ ?? null');
const currentX = () => browser.evaluate('__POLYGON_RPG_INPUT_QA__.player.position.x');
const screenshot = async (label) => {
  const file = join(outputDirectory, `${label}.png`);
  await browser.screenshot(file);
  screenshots.push(file);
};

const keyProperties = Object.freeze({
  ArrowLeft: { key: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { key: 'ArrowUp', keyCode: 38 },
  ArrowRight: { key: 'ArrowRight', keyCode: 39 },
  ArrowDown: { key: 'ArrowDown', keyCode: 40 },
  KeyA: { key: 'a', keyCode: 65 },
  KeyS: { key: 's', keyCode: 83 },
  Escape: { key: 'Escape', keyCode: 27 },
});

async function key(code, down) {
  const properties = keyProperties[code];
  if (!properties) throw new Error(`Unsupported QA key: ${code}`);
  await browser.send('Input.dispatchKeyEvent', {
    type: down ? 'keyDown' : 'keyUp',
    key: properties.key,
    code,
    windowsVirtualKeyCode: properties.keyCode,
    nativeVirtualKeyCode: properties.keyCode,
  });
}

async function tap(code, milliseconds = 75, settleMilliseconds = 140) {
  await key(code, true);
  await wait(milliseconds);
  await key(code, false);
  await wait(settleMilliseconds);
}

async function waitForStage(stageId, timeout = 20_000) {
  await browser.until(`${stageExpression} === ${JSON.stringify(stageId)}`, timeout);
  if (observedAwakeningStages.at(-1) !== stageId) observedAwakeningStages.push(stageId);
  const progression = await readProgression();
  assert.equal(
    progression.scrapCampaign.awakeningStageId,
    stageId,
    `${stageId} must be an autosaved durable boundary`,
  );
  return progression;
}

async function waitForGarageStage(stageId, timeout = 20_000) {
  await browser.until(`${garageStageExpression} === ${JSON.stringify(stageId)}`, timeout);
  if (observedGarageStages.at(-1) !== stageId) observedGarageStages.push(stageId);
  const progression = await readProgression();
  assert.equal(
    progression.scrapCampaign.garageRevealStageId,
    stageId,
    `${stageId} must be an autosaved durable garage boundary`,
  );
  return progression;
}

async function moveTo(targetX, tolerance = 12) {
  const initialX = await currentX();
  if (Math.abs(initialX - targetX) <= tolerance) return;
  const movingRight = initialX < targetX;
  const direction = movingRight ? 'ArrowRight' : 'ArrowLeft';
  await key(direction, true);
  try {
    await browser.until(
      `__POLYGON_RPG_INPUT_QA__.player.position.x ${movingRight ? '>=' : '<='} ${
        movingRight ? targetX - tolerance : targetX + tolerance
      }`,
      20_000,
    );
  } finally {
    await key(direction, false);
  }
  await wait(120);
}

async function clearAmbientDialogue() {
  await browser.until(
    `!${shell}.dialogue.active || ${shell}.dialogue.presentationMode !== 'ambient'`,
    40_000,
  );
}

async function completeInteractionAt(targetX, expectedStageId) {
  await moveTo(targetX);
  await wait(300);
  for (let attempt = 0; attempt < 32; attempt += 1) {
    if ((await browser.evaluate(liveStageExpression)) === expectedStageId) break;
    const dialogue = await browser.evaluate(`${shell}.dialogue`);
    if (dialogue.active && dialogue.presentationMode === 'ambient') {
      await clearAmbientDialogue();
      continue;
    }
    if (dialogue.active || dialogue.available) await tap('ArrowUp');
    else {
      await moveTo(targetX, 20);
      await wait(180);
    }
  }
  return waitForStage(expectedStageId);
}

async function engageCurrentUnit(expectedStageId, evidenceLabel) {
  await browser.until('!!globalThis.__POLYGON_RPG_INPUT_QA__?.combatEnemy', 12_000);
  let guardUsed = false;
  let basicUsed = false;
  let strongUsed = false;
  let passiveTicks = 0;
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    if ((await browser.evaluate(stageExpression)) === expectedStageId) break;
    const telemetry = await readTelemetry();
    const enemy = telemetry?.combatEnemy;
    if (!enemy) {
      await wait(160);
      continue;
    }
    if (!encounteredUnitIds.includes(enemy.id)) encounteredUnitIds.push(enemy.id);
    combatEvidence.push({
      label: evidenceLabel,
      attempt,
      player: telemetry.player,
      enemy,
      motion: telemetry.combatMotion,
      contact: telemetry.combatContact,
    });
    assert.ok(telemetry.player.health > 0, `${evidenceLabel} must be cleared without a KO`);
    if (!guardUsed) {
      await tap('ArrowDown', 100, 80);
      guardUsed = true;
      continue;
    }
    const distance = enemy.position.x - telemetry.player.position.x;
    const attackPhase = enemy.attack?.frame?.phase ?? null;
    const attackKind = enemy.attack?.kind ?? null;
    passiveTicks = attackPhase ? 0 : passiveTicks + 1;
    if (telemetry.combatMotion?.id !== 'idle') {
      await wait(45);
      continue;
    }
    if (attackPhase === 'windup' || attackPhase === 'attack') {
      if (attackKind === 'heavy') {
        const evadeDirection = distance > 0 ? 'ArrowRight' : 'ArrowLeft';
        await key(evadeDirection, true);
        try {
          await tap('ArrowDown', 70, 170);
        } finally {
          await key(evadeDirection, false);
        }
      } else {
        await tap('ArrowDown', 520, 60);
      }
      guardUsed = true;
      continue;
    }
    if (Math.abs(distance) > 68) {
      const direction = distance > 0 ? 'ArrowRight' : 'ArrowLeft';
      await key(direction, true);
      try {
        await wait(150);
      } finally {
        await key(direction, false);
      }
      await wait(35);
      continue;
    }
    const deterministicFinish =
      Math.abs(distance) <= 110 && (enemy.health <= 20 || passiveTicks >= 30);
    if (attackPhase !== 'recovery' && !deterministicFinish) {
      await wait(50);
      continue;
    }
    if (telemetry.player.stamina < 28) {
      await wait(120);
      continue;
    }
    passiveTicks = 0;
    if (!strongUsed) {
      await tap('KeyS', 55, 115);
      strongUsed = true;
    } else {
      await tap('KeyA', 55, 115);
      basicUsed = true;
    }
  }
  assert.equal(guardUsed, true, `${evidenceLabel} must use guard input`);
  assert.equal(basicUsed, true, `${evidenceLabel} must use Basic input`);
  assert.equal(strongUsed, true, `${evidenceLabel} must use Strong input`);
  assert.equal(
    await browser.evaluate(liveStageExpression),
    expectedStageId,
    `${evidenceLabel} must be defeated by native combat input`,
  );
  return waitForStage(expectedStageId);
}

function browserErrors() {
  return browser.events
    .filter(
      (event) =>
        event.method === 'Runtime.exceptionThrown' ||
        (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') ||
        (event.method === 'Log.entryAdded' && event.params.entry.level === 'error'),
    )
    .map((event) => {
      if (event.method === 'Runtime.exceptionThrown') {
        const details = event.params.exceptionDetails;
        return {
          method: event.method,
          message: details.exception?.description ?? details.text,
          params: event.params,
        };
      }
      if (event.method === 'Runtime.consoleAPICalled') {
        const message = event.params.args
          .map((argument) => {
            if (Object.hasOwn(argument, 'value')) return String(argument.value);
            return argument.unserializableValue ?? argument.description ?? argument.type;
          })
          .join(' ');
        return { method: event.method, message, params: event.params };
      }
      return {
        method: event.method,
        message: event.params.entry.text,
        params: event.params,
      };
    });
}

async function continueGameFromMenu() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await browser.click('#menu-start-control');
    try {
      await browser.until(
        `!!globalThis.__POLYGON_RPG_INPUT_QA__?.player && ${shell}.screen === 'game'`,
        5_000,
      );
      return;
    } catch {
      if ((await browser.evaluate(`${shell}.screen`)) !== 'menu')
        throw new Error('game failed to render');
    }
  }
  throw new Error('menu start control did not enter the game after three native clicks');
}

try {
  await browser.until(
    "!!globalThis.Alpine && !document.querySelector('#app').hasAttribute('x-cloak')",
  );
  assert.equal(
    await browser.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`),
    null,
    'the QA profile must begin with no progression localStorage',
  );
  await continueGameFromMenu();
  await wait(250);
  assert.equal((await readUi()).campaign.awakeningStageId, 'commission');

  await completeInteractionAt(198, 'rival-departure');
  await completeInteractionAt(431, 'yard-clearance');
  await screenshot('01-first-encounter');
  await engageCurrentUnit('yard-brace', 'collector-1');
  await completeInteractionAt(790, 'yard-perimeter');
  await engageCurrentUnit('yard-survey', 'collector-2');
  await completeInteractionAt(1012, 'yard-approach');
  await engageCurrentUnit('yard-plate', 'collector-3');
  await completeInteractionAt(1160, 'yard-ridge');
  await engageCurrentUnit('yard-guard', 'collector-4');
  await engageCurrentUnit('yard-search', 'collector-5');
  assert.deepEqual(
    encounteredUnitIds,
    expectedUnitIds,
    'five stable collection-unit object identities must be defeated in authored order',
  );

  await completeInteractionAt(1332, 'collapse');
  await waitForStage('rescue-request');
  await moveTo(1028);
  await screenshot('02-rescue-request');
  await completeInteractionAt(1028, 'player-decision');
  await moveTo(774);
  await screenshot('03-control-core-decision');
  await completeInteractionAt(774, 'device-investigated');
  await tap('ArrowUp');
  await waitForStage('device-recovered');
  await screenshot('04-control-core-recovered');

  await waitForStage('rescue-succeeded');
  await waitForStage('eyes-lit');
  await screenshot('05-ancient-machine-awakening');
  await waitForStage('assembled');
  await waitForStage('deadline-revealed');
  await screenshot('06-d30');
  const completedAwakening = await waitForStage('complete');
  assert.equal(completedAwakening.scrapCampaign.elapsedSegments, 0);
  let ui = await readUi();
  assert.equal(ui.campaign.hudLabel, 'Day 1 · 아침 · D-30');
  assert.match(ui.objective, /왼쪽 고물상/);

  await moveTo(198);
  await clearAmbientDialogue();
  await tap('ArrowUp');
  await browser.until(`${shell}.dialogue.conversationId === 'scrapyard-owner-analysis'`);
  await screenshot('07-owner-analysis');
  for (let attempt = 0; attempt < 16; attempt += 1) {
    if ((await browser.evaluate(garageStageExpression)) !== 'report-ready') break;
    await tap('ArrowUp');
  }
  await waitForGarageStage('owner-analysis');
  await waitForGarageStage('map-revealed');
  await screenshot('08-operation-map-revealed');
  await waitForGarageStage('garage-opened');
  await screenshot('09-garage-zero-percent');
  const garageComplete = await waitForGarageStage('complete');
  assert.equal(garageComplete.scrapCampaign.elapsedSegments, 0);
  assert.deepEqual(
    garageComplete.viewedConversationIds,
    expectedConversationIds,
    'saved authored transcript identity must be stable and complete',
  );
  ui = await readUi();
  assert.equal(ui.operationMapAvailable, true);
  assert.equal(ui.campaign.hudLabel, 'Day 1 · 아침 · D-30');
  assert.equal(ui.campaign.completionPercent, 0);
  assert.equal(ui.campaign.collectedPartCount, 0);
  assert.equal(ui.campaign.totalPartCount, 5);
  assert.equal(ui.journeyLabel, '작전 준비 완료 · 로봇 0%');

  await moveTo(334);
  await tap('ArrowUp');
  await browser.until(`${shell}.operationMapOpen === true`);
  assert.equal(
    await browser.evaluate(
      `document.querySelector('.operation-map-progress').getAttribute('aria-valuenow')`,
    ),
    '0',
  );
  await screenshot('10-operation-map-zero-percent');
  await tap('Escape');
  await browser.until(`${shell}.operationMapOpen === false`);

  assert.deepEqual(observedAwakeningStages, expectedAwakeningStages);
  assert.deepEqual(observedGarageStages, [
    'owner-analysis',
    'map-revealed',
    'garage-opened',
    'complete',
  ]);
  const beforeReload = await readProgression();
  const beforeReloadTimeOrigin = await browser.evaluate('performance.timeOrigin');
  await browser.send('Page.reload', { ignoreCache: true });
  await browser.until(`performance.timeOrigin !== ${beforeReloadTimeOrigin}`);
  await browser.until(
    "!!globalThis.Alpine && !document.querySelector('#app').hasAttribute('x-cloak')",
  );
  assert.equal((await readUi()).screen, 'menu');
  await continueGameFromMenu();
  await wait(2_200);
  const afterReload = await readProgression();
  assert.deepEqual(
    afterReload,
    beforeReload,
    'reload/continue must restore the identical saved state',
  );
  assert.equal(afterReload.scrapCampaign.awakeningStageId, 'complete');
  assert.equal(afterReload.scrapCampaign.garageRevealStageId, 'complete');
  assert.equal(afterReload.scrapCampaign.elapsedSegments, 0);
  assert.deepEqual(afterReload.viewedConversationIds, expectedConversationIds);
  ui = await readUi();
  assert.equal(ui.campaign.awakeningStageId, 'complete');
  assert.equal(ui.campaign.garageRevealStageId, 'complete');
  assert.equal(ui.campaign.garageRevealActive, false);
  assert.equal(ui.campaign.completionPercent, 0);
  assert.equal(ui.operationMapAvailable, true);
  await tap('ArrowUp');
  await wait(350);
  assert.deepEqual(
    await readProgression(),
    beforeReload,
    'completed reload must not retrigger the core, awakening, owner report, or garage reveal',
  );
  await screenshot('11-reload-continue-complete');

  assert.deepEqual(browserErrors(), [], 'browser console must have no errors');
  const report = {
    status: 'PASS',
    viewport: { width: 1280, height: 720 },
    blankProfile: true,
    input: 'CDP keyDown/keyUp only for gameplay',
    awakeningStages: observedAwakeningStages,
    garageStages: observedGarageStages,
    encounteredUnitIds,
    transcriptIds: afterReload.viewedConversationIds,
    finalCampaign: afterReload.scrapCampaign,
    screenshots,
    consoleErrorCount: 0,
  };
  writeFileSync(join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(
    join(outputDirectory, 'combat-evidence.json'),
    JSON.stringify(combatEvidence, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  console.log('PASS fresh-profile production scrap awakening browser QA');
} catch (error) {
  await screenshot('failure');
  writeFileSync(
    join(outputDirectory, 'failure.json'),
    JSON.stringify(
      {
        error: error.stack,
        progression: await readProgression().catch(() => null),
        ui: await readUi().catch(() => null),
        telemetry: await readTelemetry().catch(() => null),
        awakeningStages: observedAwakeningStages,
        garageStages: observedGarageStages,
        encounteredUnitIds,
        errors: browserErrors(),
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(outputDirectory, 'combat-evidence.json'),
    JSON.stringify(combatEvidence, null, 2),
  );
  throw error;
} finally {
  await browser.close();
}
