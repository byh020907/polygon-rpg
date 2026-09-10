import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';
import { createGameScene } from '../src/app/createGameScene.js';
import { equipmentTestSnapshot } from './fixtures/equipment-loadouts.mjs';
import {
  commitScrapCampaignAction,
  SCRAP_CAMPAIGN_ACTION_KIND,
} from '../src/game/campaign/ScrapCampaignState.js';
import { assertProgressionSnapshot } from '../src/game/progression/ProgressionState.js';
const out = 'artifacts/month-loop-runtime';
fs.mkdirSync(out, { recursive: true });
const shell = "Alpine.$data(document.querySelector('#app'))";
function seed(location) {
  const scene = createGameScene();
  try {
    const base = equipmentTestSnapshot('field-cutter-heavy');
    scene.restoreProgression({
      ...base,
      gold: 200,
      trainingMarks: 7,
      combatSkillLevel: 2,
      loadout: { ...base.loadout, bootsItemId: 'field-work-boots' },
      discoveredSpecialSynergyIds: ['braced-counter'],
      enchantment: {
        ...base.enchantment,
        equipmentEnchantments: {
          ...base.enchantment.equipmentEnchantments,
          'field-cutter-heavy': { elementId: 'earth', level: 2 },
        },
      },
    });
    scene.setVisualQaScrapAwakeningStage('complete');
    scene.setVisualQaScrapGarageRevealStage('complete');
    const current = scene.getProgressionSnapshot();
    const clock = commitScrapCampaignAction(
      current.scrapCampaign,
      {
        kind: SCRAP_CAMPAIGN_ACTION_KIND.REST,
        actionId: 'native-qa:seed-day',
        label: '현장 준비',
        costSegments: 1,
      },
      scene.scrapCampaignProfile,
    );
    const snapshot = {
      ...current,
      scrapCampaign: { ...clock.snapshot, currentLocationId: location },
    };
    assertProgressionSnapshot(snapshot);
    const legacy = structuredClone(snapshot);
    legacy.version = 11;
    for (const key of ['quests', 'materials', 'rewardClaims', 'equipmentUpgrades'])
      delete legacy[key];
    return legacy;
  } finally {
    scene.dispose();
  }
}
const seeds = { mine: seed('abandoned-mine'), harbor: seed('harbor-shipyard') };
fs.writeFileSync(out + '/seed-v11.json', JSON.stringify(seeds, null, 2));
const sizes = process.argv.includes('--mobile-only')
  ? [['mobile', 844, 390]]
  : process.argv.includes('--desktop-only')
    ? [['desktop', 1280, 720]]
    : [
        ['desktop', 1280, 720],
        ['mobile', 844, 390],
      ];
const reports = [];
for (const [name, width, height] of sizes) {
  const b = await openQaBrowser({ width, height });
  const read = () => b.evaluate('JSON.parse(localStorage.getItem("polygon-rpg.progression.v1"))');
  const ready = async () => {
    await b.until("!!globalThis.Alpine&&!document.querySelector('#app').hasAttribute('x-cloak')");
    await wait(200);
  };
  const nav = async (url) => {
    const time = await b.evaluate('performance.timeOrigin');
    await b.navigate(url);
    await b.until('performance.timeOrigin!==' + time);
    await ready();
  };
  const click = (selector) => b.click(selector, name === 'mobile');
  const key = async (code, down) => {
    const codes = { ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, KeyS: 83, Escape: 27 };
    await b.send('Input.dispatchKeyEvent', {
      type: down ? 'keyDown' : 'keyUp',
      key: code === 'KeyS' ? 's' : code,
      code,
      windowsVirtualKeyCode: codes[code],
    });
  };
  const tap = async (code, ms = 75) => {
    await key(code, true);
    await wait(ms);
    await key(code, false);
    await wait(120);
  };
  const x = () => b.evaluate('__POLYGON_RPG_INPUT_QA__.player.position.x');
  const move = async (target) => {
    const initial = await x();
    if (Math.abs(initial - target) < 10) return;
    const direction = initial < target ? 'ArrowRight' : 'ArrowLeft';
    await key(direction, true);
    try {
      await b.until(
        '__POLYGON_RPG_INPUT_QA__.player.position.x' +
          (initial < target ? '>=' : '<=') +
          (initial < target ? target - 9 : target + 9),
        18000,
      );
    } finally {
      await key(direction, false);
    }
    await wait(100);
  };
  const snap = (label) => b.screenshot(out + '/' + name + '-' + label + '.png');
  const journal = async () => {
    await move(340);
    await tap('ArrowUp');
    await b.until("document.querySelector('.equipment-dialog').open");
    assert.equal(await b.evaluate(shell + '.journalTab'), 'quests');
    assert.equal(
      await b.evaluate(
        'document.querySelector(".equipment-dialog").scrollWidth>document.querySelector(".equipment-dialog").clientWidth+1',
      ),
      false,
      'journal has no horizontal overflow',
    );
  };
  const close = async () => {
    await click('.equipment-dialog > header button');
    await b.until(
      "!document.querySelector('.equipment-dialog').open && !" + shell + '.journalOpen',
    );
  };
  const accept = async (id) => {
    const records = await b.evaluate(shell + '.fieldJournal.quests.general');
    const record = records.find((r) => r.profileId === id && r.status === 'offered');
    assert.ok(record, id + ' must be offered');
    await click('[data-quest-instance="' + record.instanceId + '"] button');
    await b.until(
      'JSON.parse(localStorage.getItem("polygon-rpg.progression.v1")).quests.records.some(r=>r.instanceId===' +
        JSON.stringify(record.instanceId) +
        '&&r.status==="accepted")',
    );
    assert.equal((await read()).version, 12, 'first real quest commit saves migrated v12');
    return record.instanceId;
  };
  const rest = async () => {
    await journal();
    await click('[data-field-rest]');
    await b.until(shell + '.campaignActionPreviewOpen===true');
    const before = (await read()).scrapCampaign.elapsedSegments;
    await click('#campaign-action-confirm-control');
    await b.until(
      'JSON.parse(localStorage.getItem("polygon-rpg.progression.v1")).scrapCampaign.elapsedSegments===' +
        String(before + 1),
    );
    await wait(200);
  };
  const load = async (branch) => {
    await b.evaluate(
      'localStorage.clear();localStorage.setItem("polygon-rpg.progression.v1",' +
        JSON.stringify(JSON.stringify(seeds[branch])) +
        ')',
    );
    await nav(b.origin + '/?inputQa=1');
    await click('#menu-start-control');
    await b.until('!!globalThis.__POLYGON_RPG_INPUT_QA__?.player && ' + shell + ".screen==='game'");
    await wait(250);
    const current = await read();
    assert.ok([11, 12].includes(current.version));
    assert.equal(current.gold, 200);
    for (const field of [
      'loadout',
      'equipmentForge',
      'enchantment',
      'ownedEquipmentItemIds',
      'discoveredSpecialSynergyIds',
    ])
      assert.deepEqual(current[field], seeds[branch][field], branch + ' migrated ' + field);
    return current;
  };
  try {
    await ready();
    if (name === 'mobile') await b.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    let state,
      preserved = null;
    if (!process.argv.includes('--harbor-only')) {
      console.log(name + ': loading mine v11 seed');
      await load('mine');
      await snap('mine-day');
      await journal();
      await snap('journal-quests');
      const paused = await x();
      await key('ArrowRight', true);
      await wait(400);
      await key('ArrowRight', false);
      assert.equal(await x(), paused, 'open journal pauses simulation');
      const mineId = await accept('mine-lamp-check'),
        nightId = await accept('mine-night-workline'),
        harborId = await accept('harbor-lamp-service');
      await click('[data-journal-tab="materials"]');
      await snap('journal-materials');
      await click('[data-journal-tab="codex"]');
      await snap('journal-codex');
      await close();
      await move(280);
      await tap('ArrowUp');
      await b.until(
        'JSON.parse(localStorage.getItem("polygon-rpg.progression.v1")).quests.explorationIds.includes("mine-cable-cache")',
      );
      state = await read();
      assert.equal(state.gold, 230);
      assert.equal(state.materials['salvaged-steel'], 3);
      assert.ok(state.ownedEquipmentItemIds.includes('field-work-lamp'));
      assert.equal(
        state.rewardClaims.filter((id) => id === 'exploration:mine-cable-cache').length,
        1,
      );
      await snap('hidden-acquisition');
      await move(1230);
      await tap('ArrowUp');
      await b.until(
        'JSON.parse(localStorage.getItem("polygon-rpg.progression.v1")).quests.records.some(r=>r.instanceId===' +
          JSON.stringify(mineId) +
          '&&r.status==="completed")',
      );
      state = await read();
      assert.equal(state.gold, 254);
      assert.equal(state.scrapCampaign.elapsedSegments, 1);
      await snap('lamp-free-reward');
      console.log(name + ': free source and hidden tool passed; resting to night');
      await rest();
      await rest();
      assert.equal((await read()).scrapCampaign.elapsedSegments, 3);
      await snap('mine-night');
      const combat = [];
      let defeated = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        const diagnostic = await b.evaluate('__POLYGON_RPG_INPUT_QA__');
        combat.push({
          attempt,
          player: diagnostic.player,
          enemy: diagnostic.combatEnemy,
          motion: diagnostic.combatMotion,
          contact: diagnostic.combatContact,
        });
        const current = await read();
        if (
          current.quests.records.some((r) => r.instanceId === nightId && r.status === 'completed')
        ) {
          defeated = true;
          break;
        }
        assert.ok(
          diagnostic.player.health > 0,
          'native field fight must remain playable without QA health changes',
        );
        assert.ok(diagnostic.combatEnemy, 'night quest enemy must exist');
        const enemyX = diagnostic.combatEnemy.position.x,
          playerX = diagnostic.player.position.x;
        const toward = playerX <= enemyX ? 'ArrowRight' : 'ArrowLeft';
        await key(toward, true);
        try {
          if (Math.abs(enemyX - playerX) > 80)
            await b.until(
              '!__POLYGON_RPG_INPUT_QA__.combatEnemy||Math.abs(__POLYGON_RPG_INPUT_QA__.combatEnemy.position.x-__POLYGON_RPG_INPUT_QA__.player.position.x)<=80',
              8000,
            );
          else await wait(45);
        } finally {
          await key(toward, false);
        }
        await tap('KeyS', 80);
        await wait(1000);
      }
      fs.writeFileSync(out + '/' + name + '-combat.json', JSON.stringify(combat, null, 2));
      assert.ok(defeated, 'actual Strong inputs must complete the night encounter');
      await snap('night-victory');
      state = await read();
      assert.equal(state.rewardClaims.filter((id) => id === nightId + ':reward').length, 1);
      assert.equal(state.gold, 290);
      console.log(name + ': night fight passed; checking important deadline and reload');
      await rest();
      await rest();
      state = await read();
      assert.equal(state.scrapCampaign.elapsedSegments, 5);
      assert.equal(state.quests.records.find((r) => r.instanceId === harborId).status, 'failed');
      assert.equal(state.quests.worldFacts['harbor-lamp-service'], 'temporary-lighting');
      await journal();
      await snap('expired-journal');
      await close();
      preserved = await read();
      await nav(b.origin + '/?inputQa=1');
      await click('#menu-start-control');
      await b.until('!!globalThis.__POLYGON_RPG_INPUT_QA__?.player');
      await wait(300);
      assert.deepEqual((await read()).rewardClaims, preserved.rewardClaims);
      assert.equal((await read()).gold, preserved.gold);
      await snap('reload-preserved');
    }
    console.log(name + ': loading fresh harbor branch');
    await load('harbor');
    await journal();
    const serviceId = await accept('harbor-lamp-service');
    await close();
    await move(1230);
    await tap('ArrowUp');
    await b.until(shell + '.campaignActionPreviewOpen===true');
    assert.ok(
      (
        await b.evaluate('document.querySelector("#campaign-action-confirm-control").textContent')
      ).includes('작업 확정'),
    );
    await snap('service-preview');
    const before = await read();
    await click('.campaign-action-backdrop footer button:first-child');
    await b.until(shell + '.campaignActionPreviewOpen===false');
    assert.equal((await read()).gold, before.gold);
    assert.equal(
      (await read()).scrapCampaign.elapsedSegments,
      before.scrapCampaign.elapsedSegments,
    );
    await tap('ArrowUp');
    await b.until(shell + '.campaignActionPreviewOpen===true');
    await click('#campaign-action-confirm-control');
    await b.until(
      'JSON.parse(localStorage.getItem("polygon-rpg.progression.v1")).quests.records.some(r=>r.instanceId===' +
        JSON.stringify(serviceId) +
        '&&r.status==="completed")',
    );
    state = await read();
    assert.equal(state.gold, 240);
    assert.equal(state.scrapCampaign.elapsedSegments, 2);
    assert.equal(state.quests.worldFacts['harbor-lamp-service'], 'serviced');
    assert.equal(state.rewardClaims.filter((id) => id === serviceId + ':reward').length, 1);
    assert.ok(
      await b.evaluate(
        shell +
          '.acquisitionFeed.some(n=>n.title==="의뢰 완료 보상"&&n.lines.some(l=>l.label==="Gold"&&l.quantity===40))',
      ),
      'completion acquisition feedback is visible',
    );
    await snap('harbor-serviced-acquisition');
    await move(486);
    await b.until(
      '!' + shell + '.dialogue.active||' + shell + '.dialogue.presentationMode!=="ambient"',
      20000,
    );
    await tap('ArrowUp');
    await b.until(shell + '.dialogue.interactionId==="shipyard-waiting-crew"');
    await tap('ArrowUp');
    await tap('ArrowUp');
    await b.until(shell + '.dialogue.lineIndex===1');
    await wait(350);
    await snap('harbor-npc-response');
    const ui = await b.evaluate(
      '({dialogue:' + shell + '.dialogue,acquisitionFeed:' + shell + '.acquisitionFeed})',
    );
    assert.equal(ui.dialogue.active, true);
    assert.match(
      ui.dialogue.line,
      /작업등|접속|손봐/,
      'second NPC response reflects service outcome while the main first line is retained',
    );
    console.log(name + ': service and NPC response passed; verifying temporary-lighting branch');
    const serviceState = state;
    await load('harbor');
    await journal();
    const neglectedId = await accept('harbor-lamp-service');
    await close();
    for (let i = 0; i < 4; i++) await rest();
    const neglected = await read();
    assert.equal(neglected.scrapCampaign.elapsedSegments, 5);
    assert.equal(neglected.gold, 200);
    assert.equal(
      neglected.quests.records.find((r) => r.instanceId === neglectedId).status,
      'failed',
    );
    assert.equal(neglected.quests.worldFacts['harbor-lamp-service'], 'temporary-lighting');
    await move(1230);
    await snap('harbor-temporary-lighting');
    await move(486);
    await b.until(
      '!' + shell + '.dialogue.active||' + shell + '.dialogue.presentationMode!=="ambient"',
      20000,
    );
    await tap('ArrowUp');
    await b.until(shell + '.dialogue.interactionId==="shipyard-waiting-crew"');
    await tap('ArrowUp');
    await tap('ArrowUp');
    await b.until(shell + '.dialogue.lineIndex===1');
    await wait(250);
    const neglectedDialogue = await b.evaluate(shell + '.dialogue');
    assert.match(neglectedDialogue.line, /임시 조명/);
    await snap('harbor-neglected-npc');
    const overflow = await b.evaluate('document.documentElement.scrollWidth>innerWidth+1');
    assert.equal(overflow, false);
    const errors = b.events.filter(
      (e) =>
        e.method === 'Runtime.exceptionThrown' ||
        (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'),
    );
    assert.deepEqual(errors, []);
    reports.push({
      name,
      status: 'PASS',
      branches: process.argv.includes('--harbor-only')
        ? ['harbor-service', 'harbor-neglect']
        : ['mine', 'harbor-service', 'harbor-neglect'],
      nativeInteractionTapMilliseconds: 75,
      mineClaims: preserved?.rewardClaims ?? null,
      harborClaims: serviceState.rewardClaims,
      harborFailure: {
        facts: neglected.quests.worldFacts,
        gold: neglected.gold,
        dialogue: neglectedDialogue,
      },
      ui,
    });
    fs.writeFileSync(out + '/report.json', JSON.stringify(reports, null, 2));
    console.log(name + ': PASS');
  } catch (error) {
    await snap('failure');
    fs.writeFileSync(
      out + '/' + name + '-failure.json',
      JSON.stringify(
        {
          error: error.stack,
          storage: await read(),
          diagnostic: await b.evaluate('globalThis.__POLYGON_RPG_INPUT_QA__??null'),
          ui: await b.evaluate(
            '({screen:' +
              shell +
              '.screen,journalOpen:' +
              shell +
              '.journalOpen,acquisitionFeed:' +
              shell +
              '.acquisitionFeed,dialogue:' +
              shell +
              '.dialogue})',
          ),
          errors: b.events.filter((e) => e.method === 'Runtime.exceptionThrown'),
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    await b.close();
  }
}
console.log('PASS native monthly field loop across requested viewports');
