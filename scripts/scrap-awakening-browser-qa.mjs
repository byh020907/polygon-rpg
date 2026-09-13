import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCRAP_AWAKENING_STAGE } from '../src/game/campaign/ScrapAwakeningState.js';
import { SCRAP_GARAGE_REVEAL_STAGE } from '../src/game/campaign/ScrapGarageRevealState.js';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
import {
  PROLOGUE_UNDERGROUND_PORTAL_IDS,
  PROLOGUE_UNDERGROUND_ROOM_IDS,
} from '../src/game/maps/PrologueUndergroundMap.js';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';

const STORAGE_KEY = 'polygon-rpg.progression.v1';
const REGION_ID = 'scrap-waste-edge';
const PURPOSE_DRIVEN_COLLECTOR_ID = 'scrap-yard-scout-collector';
const outputDirectory = join('artifacts', 'scrap-awakening-browser-qa');
mkdirSync(outputDirectory, { recursive: true });
rmSync(join(outputDirectory, 'failure.json'), { force: true });
rmSync(join(outputDirectory, 'failure.png'), { force: true });

const shell = "Alpine.$data(document.querySelector('#app'))";
const saved = `JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}))`;
const stageExpression = `${saved}.scrapCampaign.awakeningStageId`;
const garageStageExpression = `${saved}.scrapCampaign.garageRevealStageId`;
const liveStageExpression = `${shell}.campaign.awakeningStageId`;
const liveRoomExpression = 'globalThis.__POLYGON_RPG_INPUT_QA__?.map?.roomId ?? null';

// Compatibility stage ids remain in the domain state. Native play intentionally crosses only
// these durable user-facing boundaries: the old talk/fight padding is advanced atomically by
// the route action that replaces it.
const expectedAwakeningStages = Object.freeze([
  SCRAP_AWAKENING_STAGE.RIVAL_DEPARTURE,
  SCRAP_AWAKENING_STAGE.YARD_CLEARANCE,
  SCRAP_AWAKENING_STAGE.YARD_SURVEY,
  SCRAP_AWAKENING_STAGE.YARD_APPROACH,
  SCRAP_AWAKENING_STAGE.YARD_PLATE,
  SCRAP_AWAKENING_STAGE.YARD_SEARCH,
  SCRAP_AWAKENING_STAGE.COLLAPSE,
  SCRAP_AWAKENING_STAGE.RESCUE_REQUEST,
  SCRAP_AWAKENING_STAGE.PLAYER_DECISION,
  SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED,
  SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED,
  SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED,
  SCRAP_AWAKENING_STAGE.EYES_LIT,
  SCRAP_AWAKENING_STAGE.ASSEMBLED,
  SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
  SCRAP_AWAKENING_STAGE.COMPLETE,
]);

const expectedGarageStages = Object.freeze([
  SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS,
  SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED,
  SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED,
  SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
]);

const expectedConversationIds = Object.freeze([
  'scrap-prologue:owner-commission',
  'scrap-prologue:rival-departure',
  'scrap-prologue:yard-survey',
  'scrap-prologue:yard-plate',
  'scrap-prologue:yard-search',
  'scrap-prologue:rival-rescue',
  'scrap-prologue:player-decision',
  'scrapyard-owner-analysis',
]);

const expectedRoomOrder = Object.freeze([
  PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
  PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
  PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP,
  PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
  PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN,
  PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
]);

const expectedPortalOrder = Object.freeze([
  PROLOGUE_UNDERGROUND_PORTAL_IDS.COURTYARD_TO_UPPER,
  PROLOGUE_UNDERGROUND_PORTAL_IDS.UPPER_TO_RAMP,
  PROLOGUE_UNDERGROUND_PORTAL_IDS.MAINTENANCE_TO_COURTYARD,
]);

const viewportProfiles = Object.freeze([
  Object.freeze({ id: 'desktop', width: 1280, height: 720, input: 'keyboard' }),
  Object.freeze({ id: 'mobile', width: 844, height: 390, input: 'touch' }),
]);

function mapRoom(roomId) {
  const room = SCRAP_AWAKENING_MAP.getRoom(REGION_ID, roomId);
  if (!room) throw new Error(`도입 브라우저 QA room을 찾을 수 없습니다: ${roomId}`);
  return room;
}

function entityWorldX(roomId, entityId) {
  const room = mapRoom(roomId);
  const entity = room.entities.find((candidate) => candidate.id === entityId);
  if (!entity?.position || !Number.isFinite(entity.position.x)) {
    throw new Error(`도입 브라우저 QA entity 위치를 찾을 수 없습니다: ${roomId}/${entityId}`);
  }
  return room.bounds.x + entity.position.x;
}

function portalWorldX(portalId, roomId) {
  const room = mapRoom(roomId);
  const portal = SCRAP_AWAKENING_MAP.portals.find((candidate) => candidate.id === portalId);
  if (!portal) throw new Error(`도입 브라우저 QA portal을 찾을 수 없습니다: ${portalId}`);
  const endpoint = [portal.from, portal.to].find(
    (candidate) => candidate.regionId === REGION_ID && candidate.roomId === roomId,
  );
  if (!endpoint?.anchor || !Number.isFinite(endpoint.anchor.x)) {
    throw new Error(`도입 브라우저 QA portal endpoint를 찾을 수 없습니다: ${portalId}/${roomId}`);
  }
  return room.bounds.x + endpoint.anchor.x;
}

const KEY_PROPERTIES = Object.freeze({
  left: Object.freeze({ key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 }),
  jump: Object.freeze({ key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 }),
  right: Object.freeze({ key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 }),
  guard: Object.freeze({ key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 }),
  basicAttack: Object.freeze({ key: 'a', code: 'KeyA', keyCode: 65 }),
  strongAttack: Object.freeze({ key: 's', code: 'KeyS', keyCode: 83 }),
  escape: Object.freeze({ key: 'Escape', code: 'Escape', keyCode: 27 }),
});

function browserErrors(browser) {
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

function createInputDriver(browser, inputKind) {
  const activeTouches = new Map();

  const availableTouchIdentifier = () => {
    for (let id = 1; id <= 15; id += 1) {
      if (!activeTouches.has(id)) return id;
    }
    throw new Error('mobile QA exhausted the simultaneous touch identifier pool');
  };

  const touchPoints = () =>
    [...activeTouches.entries()].map(([id, point]) => ({
      ...point,
      id,
      radiusX: 2,
      radiusY: 2,
      force: 1,
    }));

  async function keyboard(actionId, down) {
    const properties = KEY_PROPERTIES[actionId];
    if (!properties) throw new Error(`Unsupported keyboard QA action: ${actionId}`);
    await browser.send('Input.dispatchKeyEvent', {
      type: down ? 'keyDown' : 'keyUp',
      key: properties.key,
      code: properties.code,
      windowsVirtualKeyCode: properties.keyCode,
      nativeVirtualKeyCode: properties.keyCode,
    });
  }

  async function mobileControlPoint(actionId) {
    return browser.evaluate(`(()=>{
      const control=document.querySelector('[data-mobile-action="${actionId}"]');
      if(!control) throw new Error('mobile control not found: ${actionId}');
      const rect=control.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0) throw new Error('mobile control is not visible: ${actionId}');
      return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};
    })()`);
  }

  async function down(actionId) {
    if (inputKind === 'keyboard') {
      await keyboard(actionId, true);
      return Object.freeze({ kind: 'keyboard', actionId });
    }
    const point = await mobileControlPoint(actionId);
    const id = availableTouchIdentifier();
    activeTouches.set(id, point);
    await browser.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: touchPoints(),
    });
    return Object.freeze({ kind: 'touch', id, point, actionId });
  }

  async function up(handle) {
    if (handle.kind === 'keyboard') {
      await keyboard(handle.actionId, false);
      return;
    }
    activeTouches.delete(handle.id);
    await browser.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: touchPoints(),
    });
  }

  async function tap(actionId, milliseconds = 75, settleMilliseconds = 140) {
    const handle = await down(actionId);
    try {
      await wait(milliseconds);
    } finally {
      await up(handle);
    }
    await wait(settleMilliseconds);
  }

  return Object.freeze({ down, up, tap });
}

async function runViewport(profile) {
  const viewportDirectory = join(outputDirectory, profile.id);
  mkdirSync(viewportDirectory, { recursive: true });
  rmSync(join(viewportDirectory, 'failure.json'), { force: true });
  rmSync(join(viewportDirectory, 'failure.png'), { force: true });

  const browser = await openQaBrowser({
    width: profile.width,
    height: profile.height,
    search: '?inputQa=1',
  });
  if (profile.input === 'touch') {
    await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  }
  const input = createInputDriver(browser, profile.input);
  const screenshots = [];
  const observedAwakeningStages = [];
  const observedGarageStages = [];
  const observedRooms = [];
  const usedPortalIds = [];
  const encounteredUnitIds = [];
  const combatEvidence = [];
  const routeEvidence = [];

  const readProgression = () => browser.evaluate(saved);
  const readUi = () =>
    browser.evaluate(
      `({screen:${shell}.screen,dialogue:${shell}.dialogue,campaign:${shell}.campaign,objective:${shell}.objective,journeyLabel:${shell}.journeyLabel,wardLabel:${shell}.wardLabel,operationMapOpen:${shell}.operationMapOpen,operationMapAvailable:${shell}.operationMapAvailable})`,
    );
  const readTelemetry = () => browser.evaluate('globalThis.__POLYGON_RPG_INPUT_QA__ ?? null');
  const currentX = () => browser.evaluate('__POLYGON_RPG_INPUT_QA__.player.position.x');
  const screenshot = async (label) => {
    const file = join(viewportDirectory, `${label}.png`);
    await browser.screenshot(file);
    screenshots.push(file);
  };

  function observeRoom(roomId) {
    if (observedRooms.at(-1) !== roomId) observedRooms.push(roomId);
  }

  async function waitForRoom(roomId, timeout = 20_000) {
    await browser.until(
      `(${liveRoomExpression}) === ${JSON.stringify(
        roomId,
      )} && !globalThis.__POLYGON_RPG_INPUT_QA__?.player?.portalTransition`,
      timeout,
    );
    observeRoom(roomId);
    const telemetry = await readTelemetry();
    assert.equal(telemetry.map.roomId, roomId, `runtime must render ${roomId}`);
    return telemetry;
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
    const actionId = initialX < targetX ? 'right' : 'left';
    const movingRight = actionId === 'right';
    const handle = await input.down(actionId);
    try {
      await browser.until(
        `__POLYGON_RPG_INPUT_QA__.player.position.x ${movingRight ? '>=' : '<='} ${
          movingRight ? targetX - tolerance : targetX + tolerance
        }`,
        30_000,
      );
    } finally {
      await input.up(handle);
    }
    await wait(120);
  }

  async function clearAmbientDialogue() {
    await browser.until(
      `!${shell}.dialogue.active || ${shell}.dialogue.presentationMode !== 'ambient'`,
      40_000,
    );
  }

  async function moveAcrossOpenedBridge(targetX) {
    const upperRoom = mapRoom(PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK);
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const telemetry = await readTelemetry();
      if (telemetry.player.position.x >= targetX - 18) break;
      assert.ok(
        telemetry.player.position.y < upperRoom.bounds.y + upperRoom.bounds.height + 180,
        'the deployed bridge and recovery ramp must keep the player in the upper-deck traversal space',
      );
      await input.tap('jump', 85, 40);
      const right = await input.down('right');
      try {
        await wait(320);
      } finally {
        await input.up(right);
      }
      await wait(40);
    }
    await browser.until(`__POLYGON_RPG_INPUT_QA__.player.position.x >= ${targetX - 18}`, 10_000);
    await wait(160);
    routeEvidence.push({
      action: 'cross-opened-bridge',
      roomId: PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
      destinationX: await currentX(),
      stageId: await browser.evaluate(stageExpression),
    });
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
      if (dialogue.active || dialogue.available) await input.tap('jump');
      else {
        await moveTo(targetX, 20);
        await wait(180);
      }
    }
    return waitForStage(expectedStageId);
  }

  async function usePortal(portalId, fromRoomId, toRoomId, expectedStageId = null) {
    assert.equal(await browser.evaluate(liveRoomExpression), fromRoomId);
    const sourceStartX = await currentX();
    const targetX = portalWorldX(portalId, fromRoomId);
    if (portalId === PROLOGUE_UNDERGROUND_PORTAL_IDS.MAINTENANCE_TO_COURTYARD) {
      assert.ok(
        sourceStartX - targetX > 1_100,
        'the changed return must traverse the lower maintenance passage from end to end',
      );
    }
    await moveTo(targetX, 16);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await input.tap('jump', 90, 180);
      await wait(220);
      if (
        await browser.evaluate(
          `(${liveRoomExpression}) === ${JSON.stringify(
            toRoomId,
          )} && !globalThis.__POLYGON_RPG_INPUT_QA__?.player?.portalTransition`,
        )
      )
        break;
    }
    await waitForRoom(toRoomId);
    usedPortalIds.push(portalId);
    routeEvidence.push({
      portalId,
      fromRoomId,
      toRoomId,
      sourceStartX,
      portalTriggerX: targetX,
      traversalDistance: Math.abs(targetX - sourceStartX),
      destinationX: await currentX(),
      stageId: await browser.evaluate(stageExpression),
    });
    if (expectedStageId) await waitForStage(expectedStageId);
  }

  async function engagePurposeDrivenCollector() {
    await browser.until('!!globalThis.__POLYGON_RPG_INPUT_QA__?.combatEnemy', 12_000);
    let guardUsed = false;
    let basicUsed = false;
    let strongUsed = false;
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const runtimeErrors = browserErrors(browser);
      if (runtimeErrors.length > 0) {
        throw new Error(
          `browser runtime failed during bridge combat: ${runtimeErrors.at(-1).message}`,
        );
      }
      if ((await browser.evaluate(stageExpression)) === SCRAP_AWAKENING_STAGE.YARD_SURVEY) break;
      const telemetry = await readTelemetry();
      const enemy = telemetry?.combatEnemy;
      if (!enemy) {
        await wait(160);
        continue;
      }
      assert.equal(
        telemetry.map.roomId,
        PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
        'the only required collector must be fought on the underground upper deck',
      );
      if (!encounteredUnitIds.includes(enemy.id)) encounteredUnitIds.push(enemy.id);
      combatEvidence.push({
        attempt,
        player: telemetry.player,
        enemy,
        motion: telemetry.combatMotion,
        contact: telemetry.combatContact,
      });
      assert.ok(telemetry.player.health > 0, 'the bridge collector must be cleared without a KO');
      if (!guardUsed) {
        await input.tap('guard', 100, 80);
        guardUsed = true;
        continue;
      }
      if (!basicUsed) {
        await input.tap('basicAttack', 55, 115);
        basicUsed = true;
        continue;
      }
      if (!strongUsed) {
        await input.tap('strongAttack', 55, 115);
        strongUsed = true;
        continue;
      }
      const distance = enemy.position.x - telemetry.player.position.x;
      const attackPhase = enemy.attack?.frame?.phase ?? null;
      const attackKind = enemy.attack?.kind ?? null;
      if (telemetry.combatMotion?.id !== 'idle') {
        await wait(45);
        continue;
      }
      if (telemetry.player.health <= 35 && (attackPhase === 'windup' || attackPhase === 'attack')) {
        if (attackKind === 'heavy') {
          const evadeHandle = await input.down('left');
          try {
            await input.tap('guard', 70, 170);
          } finally {
            await input.up(evadeHandle);
          }
        } else {
          await input.tap('guard', 520, 60);
        }
        guardUsed = true;
        continue;
      }
      if (distance < 36) {
        const handle = await input.down('left');
        try {
          await wait(130);
        } finally {
          await input.up(handle);
        }
        await wait(35);
        continue;
      }
      if (Math.abs(distance) > 68) {
        const handle = await input.down('right');
        try {
          await wait(150);
        } finally {
          await input.up(handle);
        }
        await wait(35);
        continue;
      }
      if (telemetry.player.stamina < 14) {
        await wait(120);
        continue;
      }
      await input.tap('basicAttack', 55, 115);
    }
    assert.equal(guardUsed, true, 'the bridge fight must use guard input');
    assert.equal(basicUsed, true, 'the bridge fight must use Basic input');
    assert.equal(strongUsed, true, 'the bridge fight must use Strong input');
    assert.equal(
      await browser.evaluate(liveStageExpression),
      SCRAP_AWAKENING_STAGE.YARD_SURVEY,
      'the bridge collector must be defeated by native combat input',
    );
    assert.deepEqual(
      encounteredUnitIds,
      [PURPOSE_DRIVEN_COLLECTOR_ID],
      'the underground investigation must require exactly one purpose-driven collector fight',
    );
    return waitForStage(SCRAP_AWAKENING_STAGE.YARD_SURVEY);
  }

  async function continueGameFromMenu() {
    const selector =
      profile.input === 'touch' ? '#menu-mobile-start-control' : '#menu-start-control';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await browser.click(selector, profile.input === 'touch');
      try {
        await browser.until(
          `!!globalThis.__POLYGON_RPG_INPUT_QA__?.player && ${shell}.screen === 'game'`,
          5_000,
        );
        if (profile.input === 'touch' && (await browser.evaluate(`${shell}.qaInputPanelOpen`))) {
          await browser.click('.qa-input-relay-toggle', true);
          await browser.until(`${shell}.qaInputPanelOpen === false`);
        }
        return;
      } catch {
        if ((await browser.evaluate(`${shell}.screen`)) !== 'menu') {
          throw new Error('game failed to render');
        }
      }
    }
    throw new Error('menu start control did not enter the game after three native activations');
  }

  async function reloadAndContinue(expectedStageId, expectedRoomId) {
    const beforeReload = await readProgression();
    const beforeReloadTimeOrigin = await browser.evaluate('performance.timeOrigin');
    await browser.send('Page.reload', { ignoreCache: true });
    await browser.until(`performance.timeOrigin !== ${beforeReloadTimeOrigin}`);
    await browser.until(
      "!!globalThis.Alpine && !document.querySelector('#app').hasAttribute('x-cloak')",
    );
    assert.equal((await readUi()).screen, 'menu');
    await continueGameFromMenu();
    await waitForRoom(expectedRoomId);
    const afterReload = await readProgression();
    assert.deepEqual(
      afterReload,
      beforeReload,
      'reload/continue must restore identical saved state',
    );
    assert.equal(afterReload.scrapCampaign.awakeningStageId, expectedStageId);
    return afterReload;
  }

  try {
    await browser.until(
      "!!globalThis.Alpine && !document.querySelector('#app').hasAttribute('x-cloak')",
    );
    assert.equal(
      await browser.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`),
      null,
      `${profile.id} QA profile must begin with no progression localStorage`,
    );
    await continueGameFromMenu();
    await wait(250);
    assert.equal((await readUi()).campaign.awakeningStageId, SCRAP_AWAKENING_STAGE.COMMISSION);
    await waitForRoom(PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD);

    await completeInteractionAt(
      entityWorldX(PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD, 'scrapyard-owner-commission'),
      SCRAP_AWAKENING_STAGE.RIVAL_DEPARTURE,
    );
    await completeInteractionAt(
      entityWorldX(PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD, 'scrap-rival-departure'),
      SCRAP_AWAKENING_STAGE.YARD_CLEARANCE,
    );
    await screenshot('01-courtyard-departure');

    await usePortal(
      PROLOGUE_UNDERGROUND_PORTAL_IDS.COURTYARD_TO_UPPER,
      PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
      PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
    );
    await screenshot('02-underground-upper-bridge-locked');
    await engagePurposeDrivenCollector();
    await screenshot('03-underground-upper-bridge-open');
    const surveyX = entityWorldX(
      PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
      'scrap-rival-yard-survey',
    );
    await moveAcrossOpenedBridge(surveyX);
    await completeInteractionAt(surveyX, SCRAP_AWAKENING_STAGE.YARD_APPROACH);

    await usePortal(
      PROLOGUE_UNDERGROUND_PORTAL_IDS.UPPER_TO_RAMP,
      PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
      PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP,
      SCRAP_AWAKENING_STAGE.YARD_PLATE,
    );
    await screenshot('04-chest-ramp-entry');

    // A durable mid-route reload proves that an old stage id resumes in its authored room
    // rather than falling back to the former single abandoned-weapon-yard screen.
    await reloadAndContinue(
      SCRAP_AWAKENING_STAGE.YARD_PLATE,
      PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP,
    );
    await completeInteractionAt(
      entityWorldX(PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP, 'scrap-rival-yard-plate'),
      SCRAP_AWAKENING_STAGE.YARD_SEARCH,
    );
    await screenshot('05-chest-ramp-investigation');
    await completeInteractionAt(
      entityWorldX(PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP, 'scrap-rival-yard-search'),
      SCRAP_AWAKENING_STAGE.COLLAPSE,
    );
    await waitForRoom(PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER);

    await waitForStage(SCRAP_AWAKENING_STAGE.RESCUE_REQUEST);
    await moveTo(
      entityWorldX(
        PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
        'scrap-rival-rescue-request',
      ),
    );
    await screenshot('06-lower-control-rescue-request');
    await completeInteractionAt(
      entityWorldX(
        PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
        'scrap-rival-rescue-request',
      ),
      SCRAP_AWAKENING_STAGE.PLAYER_DECISION,
    );
    const coreX = entityWorldX(
      PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
      'scrap-control-device',
    );
    await moveTo(coreX);
    await screenshot('07-control-core-decision');
    await completeInteractionAt(coreX, SCRAP_AWAKENING_STAGE.DEVICE_INVESTIGATED);
    await input.tap('jump');
    await waitForStage(SCRAP_AWAKENING_STAGE.DEVICE_RECOVERED);
    await screenshot('08-control-core-recovered');

    await waitForStage(SCRAP_AWAKENING_STAGE.RESCUE_SUCCEEDED);
    await waitForStage(SCRAP_AWAKENING_STAGE.EYES_LIT);
    await screenshot('09-ancient-machine-awakening');
    await waitForStage(SCRAP_AWAKENING_STAGE.ASSEMBLED);
    await waitForStage(SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED);
    await screenshot('10-d30');
    const completedAwakening = await waitForStage(SCRAP_AWAKENING_STAGE.COMPLETE);
    assert.equal(completedAwakening.scrapCampaign.elapsedSegments, 0);
    const maintenanceTelemetry = await waitForRoom(
      PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN,
    );
    assert.equal(maintenanceTelemetry.player.facing, -1);
    assert.ok(
      maintenanceTelemetry.player.position.x >=
        mapRoom(PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN).bounds.x + 1_200,
      'COMPLETE must begin at the far end of the lower maintenance return route',
    );
    let ui = await readUi();
    assert.equal(ui.campaign.hudLabel, 'Day 1 · 아침 · D-30');
    assert.match(ui.objective, /하층 정비 통로.*고물상/);
    await screenshot('11-lower-maintenance-return');

    await usePortal(
      PROLOGUE_UNDERGROUND_PORTAL_IDS.MAINTENANCE_TO_COURTYARD,
      PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN,
      PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
    );
    await clearAmbientDialogue();
    const ownerX = entityWorldX(
      PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
      'scrapyard-owner-analysis',
    );
    await moveTo(ownerX);
    await input.tap('jump');
    await browser.until(`${shell}.dialogue.conversationId === 'scrapyard-owner-analysis'`);
    await screenshot('12-owner-analysis');
    for (let attempt = 0; attempt < 16; attempt += 1) {
      if (
        (await browser.evaluate(garageStageExpression)) !== SCRAP_GARAGE_REVEAL_STAGE.REPORT_READY
      )
        break;
      await input.tap('jump');
    }
    await waitForGarageStage(SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS);
    await waitForGarageStage(SCRAP_GARAGE_REVEAL_STAGE.MAP_REVEALED);
    await screenshot('13-operation-map-revealed');
    await waitForGarageStage(SCRAP_GARAGE_REVEAL_STAGE.GARAGE_OPENED);
    await screenshot('14-garage-zero-percent');
    const garageComplete = await waitForGarageStage(SCRAP_GARAGE_REVEAL_STAGE.COMPLETE);
    assert.equal(garageComplete.scrapCampaign.elapsedSegments, 0);
    assert.deepEqual(
      garageComplete.viewedConversationIds,
      expectedConversationIds,
      'saved authored transcript identity must match the condensed underground route',
    );
    ui = await readUi();
    assert.equal(ui.operationMapAvailable, true);
    assert.equal(ui.campaign.hudLabel, 'Day 1 · 아침 · D-30');
    assert.equal(ui.campaign.completionPercent, 0);
    assert.equal(ui.campaign.collectedPartCount, 0);
    assert.equal(ui.campaign.totalPartCount, 5);
    assert.equal(ui.journeyLabel, '작전 준비 완료 · 로봇 0%');

    await moveTo(
      entityWorldX(PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD, 'scrapyard-wall-operation-map'),
    );
    await input.tap('jump');
    await browser.until(`${shell}.operationMapOpen === true`);
    assert.equal(
      await browser.evaluate(
        `document.querySelector('.operation-map-progress').getAttribute('aria-valuenow')`,
      ),
      '0',
    );
    await screenshot('15-operation-map-zero-percent');
    if (profile.input === 'touch') {
      await browser.click('#operation-map-close-control', true);
    } else {
      await input.tap('escape');
    }
    await browser.until(`${shell}.operationMapOpen === false`);

    assert.deepEqual(observedAwakeningStages, expectedAwakeningStages);
    assert.deepEqual(observedGarageStages, expectedGarageStages);
    assert.deepEqual(observedRooms, expectedRoomOrder);
    assert.deepEqual(usedPortalIds, expectedPortalOrder);
    assert.deepEqual(encounteredUnitIds, [PURPOSE_DRIVEN_COLLECTOR_ID]);

    const beforeFinalReload = await readProgression();
    await reloadAndContinue(
      SCRAP_AWAKENING_STAGE.COMPLETE,
      PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
    );
    await wait(2_200);
    const afterReload = await readProgression();
    assert.deepEqual(afterReload, beforeFinalReload, 'completed reload must preserve exact state');
    assert.equal(afterReload.scrapCampaign.garageRevealStageId, SCRAP_GARAGE_REVEAL_STAGE.COMPLETE);
    assert.equal(afterReload.scrapCampaign.elapsedSegments, 0);
    assert.deepEqual(afterReload.viewedConversationIds, expectedConversationIds);
    ui = await readUi();
    assert.equal(ui.campaign.awakeningStageId, SCRAP_AWAKENING_STAGE.COMPLETE);
    assert.equal(ui.campaign.garageRevealStageId, SCRAP_GARAGE_REVEAL_STAGE.COMPLETE);
    assert.equal(ui.campaign.garageRevealActive, false);
    assert.equal(ui.campaign.completionPercent, 0);
    assert.equal(ui.operationMapAvailable, true);
    await input.tap('jump');
    await wait(350);
    assert.deepEqual(
      await readProgression(),
      beforeFinalReload,
      'completed reload must not retrigger the core, awakening, owner report, or garage reveal',
    );
    await screenshot('16-reload-continue-complete');

    assert.deepEqual(browserErrors(browser), [], 'browser console must have no errors');
    const report = {
      status: 'PASS',
      viewport: { width: profile.width, height: profile.height },
      blankProfile: true,
      input:
        profile.input === 'touch'
          ? 'native CDP touchStart/touchEnd on rendered mobile controls'
          : 'native CDP keyDown/keyUp',
      awakeningStages: observedAwakeningStages,
      garageStages: observedGarageStages,
      roomOrder: observedRooms,
      portalOrder: usedPortalIds,
      encounteredUnitIds,
      routeEvidence,
      transcriptIds: afterReload.viewedConversationIds,
      finalCampaign: afterReload.scrapCampaign,
      screenshots,
      consoleErrorCount: 0,
    };
    writeFileSync(join(viewportDirectory, 'report.json'), JSON.stringify(report, null, 2));
    writeFileSync(
      join(viewportDirectory, 'combat-evidence.json'),
      JSON.stringify(combatEvidence, null, 2),
    );
    return report;
  } catch (error) {
    await screenshot('failure').catch(() => {});
    writeFileSync(
      join(viewportDirectory, 'failure.json'),
      JSON.stringify(
        {
          error: error.stack,
          progression: await readProgression().catch(() => null),
          ui: await readUi().catch(() => null),
          telemetry: await readTelemetry().catch(() => null),
          awakeningStages: observedAwakeningStages,
          garageStages: observedGarageStages,
          roomOrder: observedRooms,
          portalOrder: usedPortalIds,
          encounteredUnitIds,
          routeEvidence,
          errors: browserErrors(browser),
        },
        null,
        2,
      ),
    );
    writeFileSync(
      join(viewportDirectory, 'combat-evidence.json'),
      JSON.stringify(combatEvidence, null, 2),
    );
    throw error;
  } finally {
    await browser.close();
  }
}

const reports = [];
for (const profile of viewportProfiles) reports.push(await runViewport(profile));
const aggregateReport = {
  status: 'PASS',
  route:
    'courtyard -> upper ruins -> chest ramp -> lower control -> maintenance return -> courtyard',
  requiredCollectorFightCount: 1,
  reports,
};
writeFileSync(join(outputDirectory, 'report.json'), JSON.stringify(aggregateReport, null, 2));
console.log(JSON.stringify(aggregateReport, null, 2));
console.log('PASS fresh-profile underground ruins awakening browser QA (desktop + mobile)');
