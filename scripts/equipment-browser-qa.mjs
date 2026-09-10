import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';
import { createProgressionSnapshot } from '../src/game/progression/ProgressionState.js';
import { EQUIPMENT_CATALOG } from '../src/game/equipment/EquipmentCatalog.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';
import { LEGACY_EQUIPMENT_ID_ALIASES } from '../src/game/progression/EquipmentSaveMigration.js';
const fresh = createProgressionSnapshot(
  EQUIPMENT_CATALOG.defaultItemId,
  ENCHANTMENT_CATALOG,
  SCRAP_CAMPAIGN_PROFILE,
);
const legacy = {
  version: 10,
  gold: 321,
  trainingMarks: 7,
  combatSkillLevel: 2,
  viewedConversationIds: [],
  ownedEquipmentIds: Object.keys(LEGACY_EQUIPMENT_ID_ALIASES),
  equippedEquipmentId: 'balanced-sword',
  weaponForge: { materialQuantities: {}, claimedSourceIds: [], selectedProfileIdsByGroup: {} },
  scrapCampaign: fresh.scrapCampaign,
  enchantment: {
    materialQuantities: fresh.enchantment.materialQuantities,
    swordEnchantments: Object.fromEntries(
      Object.keys(LEGACY_EQUIPMENT_ID_ALIASES).map((id) => [id, { elementId: null, level: 0 }]),
    ),
  },
};
const out = 'artifacts/equipment-runtime';
fs.mkdirSync(out, { recursive: true });
const shell = "Alpine.$data(document.querySelector('#app'))";
for (const [name, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
]) {
  const b = await openQaBrowser({ width, height });
  const ready = async () => {
    await b.until("!!globalThis.Alpine && !document.querySelector('#app').hasAttribute('x-cloak')");
    await wait(200);
  };
  const navigate = async (url) => {
    const before = await b.evaluate('performance.timeOrigin');
    await b.navigate(url);
    await b.until('performance.timeOrigin!==' + before);
    await ready();
  };
  const nativeClick = async (selector) => {
    await b.evaluate(
      'document.querySelector(' + JSON.stringify(selector) + ').scrollIntoView({block:"center"})',
    );
    await b.click(selector, name === 'mobile');
  };
  try {
    if (name === 'mobile') await b.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await ready();
    await b.evaluate(
      'localStorage.setItem("polygon-rpg.progression.v1",' +
        JSON.stringify(JSON.stringify(legacy)) +
        ')',
    );
    await navigate(b.origin + '/');
    await ready();
    await nativeClick('#menu-equipment-control');
    await b.until("document.querySelector('.equipment-dialog').open");
    assert.equal(await b.evaluate(shell + '.equipmentView.slots.length'), 6);
    const unknown = await b.evaluate(shell + '.equipmentView.codex.specialSynergies');
    assert.equal(unknown[0].label, '???');
    assert.equal(unknown[0].description, undefined);
    for (const id of [
      'field-work-helmet',
      'field-work-body',
      'field-work-boots',
      'field-cutter-heavy',
    ])
      await nativeClick('[data-equipment-item="' + id + '"] button');
    await b.until(shell + '.equipmentView.codex.specialSynergies[0].discovered===true');
    assert.equal(
      await b.evaluate(shell + '.equipmentView.codex.sets[0].bonuses.filter(b=>b.active).length'),
      2,
    );
    await b.evaluate("document.querySelector('.equipment-dialog').scrollTop=0");
    await b.screenshot(out + '/' + name + '-loadout.png');
    await nativeClick('[data-journal-tab=codex]');
    await b.until("Alpine.$data(document.querySelector('#app'))" + '.journalTab==="codex"');
    await b.screenshot(out + '/' + name + '-synergy.png');
    await nativeClick('[data-journal-tab=equipment]');
    await nativeClick('[aria-label="신발 해제"]');
    assert.equal(
      await b.evaluate(shell + '.equipmentView.codex.specialSynergies[0].discovered'),
      true,
    );
    const stored = await b.evaluate(
      'JSON.parse(localStorage.getItem("polygon-rpg.progression.v1"))',
    );
    assert.equal(stored.version, 12);
    assert.equal(stored.gold, 321);
    assert.equal(stored.trainingMarks, 7);
    assert.equal(stored.loadout.bootsItemId, null);
    assert.equal(stored.loadout.weaponItemId, 'field-cutter-heavy');
    assert.equal(stored.discoveredSpecialSynergyIds.length, 1);
    await navigate(b.origin + '/');
    await ready();
    await nativeClick('#menu-equipment-control');
    await b.until("document.querySelector('.equipment-dialog').open");
    assert.equal(
      await b.evaluate(shell + '.equipmentView.codex.specialSynergies[0].discovered'),
      true,
    );
    await navigate(
      b.origin + '/?graphicsReview=1&resource=equipment%3Afield-cutter-balanced&inputQa=1',
    );
    await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'");
    const saved = await b.evaluate('JSON.stringify({...localStorage})');
    await nativeClick('[data-gr=test]');
    await b.until('!!globalThis.__POLYGON_RPG_INPUT_QA__?.player');
    await b.screenshot(out + '/' + name + '-idle.png');
    for (const [key, code, keyCode, motion] of [
      ['a', 'KeyA', 65, 'slash'],
      ['s', 'KeyS', 83, 'heavy'],
      ['ArrowDown', 'ArrowDown', 40, 'guard'],
    ]) {
      await b.until("__POLYGON_RPG_INPUT_QA__.combatMotion.id==='idle'");
      await b.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key,
        code,
        windowsVirtualKeyCode: keyCode,
      });
      await b.until('__POLYGON_RPG_INPUT_QA__.combatMotion.id===' + JSON.stringify(motion));
      await b.screenshot(out + '/' + name + '-' + motion + '.png');
      await b.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key,
        code,
        windowsVirtualKeyCode: keyCode,
      });
      await wait(800);
    }
    await nativeClick('#test-review-return');
    await b.until("!document.querySelector('#graphics-review').hidden");
    assert.equal(await b.evaluate('JSON.stringify({...localStorage})'), saved);
    if (name === 'mobile')
      await b.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: false,
      });
    await b.navigate(b.origin + '/PRODUCT_GOAL.html');
    await b.until("document.readyState==='complete' && !!document.querySelector('.wiki-toc')");
    assert.equal(await b.evaluate("document.querySelectorAll('.wiki-toc a').length"), 17);
    assert.ok(await b.evaluate('document.documentElement.scrollWidth <= innerWidth'));
    await b.screenshot(out + '/' + name + '-wiki.png');
    console.log(
      name +
        ' PASS native v10 migration,6slots,set/special discovery+reload,gameplay idle/basic/strong/guard,test-save isolation',
    );
  } catch (error) {
    await b.screenshot(out + '/' + name + '-failure.png');
    throw error;
  } finally {
    await b.close();
  }
}
