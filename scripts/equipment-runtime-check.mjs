import { TrainingEncounterNode } from '../src/game/training/TrainingEncounterNode.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';
import {
  closestCombatContact,
  sampleTrainingEnemyCombatGeometry,
} from '../src/combat/SharedCombatGeometry.js';
import { createAttackEnvelope } from '../src/combat/AttackEnvelope.js';
import { COMBAT_EVENT_TYPE } from '../src/combat/CombatEvent.js';
import assert from 'node:assert/strict';
import { createGameScene } from '../src/app/createGameScene.js';
import { equipmentTestSnapshot } from './fixtures/equipment-loadouts.mjs';
import { createGraphicsResourceCatalog } from '../src/graphics/GraphicsResourceCatalog.js';
import { EQUIPMENT_CATALOG } from '../src/game/equipment/EquipmentCatalog.js';
const scene = createGameScene();
try {
  assert.equal(scene.resolvedLoadout.moveset.id, 'cutter-shield-standard');
  assert.equal(scene.getAttackHitProfile('slash').damage, 10.8);
  assert.equal(scene.getEquipmentView().slots.length, 6);
  scene.combatCommands.update(0, { guard: true });
  scene.applyTrainingEncounterPlayerResult({
    kind: 'guard',
    blockImpactSeconds: 0.14,
    blockImpactStrength: 1,
    blockstunSeconds: 0.14,
    justGuardEligible: false,
    guardStaminaDamage: 20,
    hitStopSeconds: 0,
  });
  assert.equal(scene.createRenderFrame(1).fieldAssistance.assisted, true);
  scene.reset();
  assert.equal(scene.unequipOwnedSlot('shield').changed, true);
  assert.equal(scene.resolvedLoadout.moveset.id, 'cutter-standard');
  scene.combatCommands.update(0.1, { guard: true });
  assert.notEqual(scene.combatCommands.snapshot().id, 'guard');
  assert.equal(scene.getAttackHitProfile('shieldBash'), null);
  assert.equal(
    scene.createRenderFrame(1).items.some((i) => i.id === 'shield'),
    false,
  );
  scene.restoreProgression(equipmentTestSnapshot('field-cutter-heavy'));
  const unknown = scene.getEquipmentView().codex.specialSynergies;
  assert.ok(unknown.some((e) => e.label === '???'));
  assert.ok(unknown.every((e) => !e.requirements && !e.description));
  assert.equal(scene.equipOwnedItem('field-work-boots').changed, true);
  assert.equal(scene.resolvedLoadout.activeSpecialSynergies.length, 1);
  assert.ok(
    scene.getEquipmentView().codex.specialSynergies[0].requirementsLabel.includes('작업화'),
  );
  const saved = scene.getProgressionSnapshot();
  assert.equal(scene.resolvedLoadout.commandModifiers.guardCounterPostureScale, 1.15);
  assert.ok(Math.abs(scene.getAttackHitProfile('shieldBash').postureDamageScale - 1.15) < 1e-12);
  scene.equipOwnedItem('field-work-helmet');
  scene.equipOwnedItem('field-work-body');
  assert.equal(scene.resolvedLoadout.activeSetBonuses.length, 2);
  assert.equal(scene.resolvedLoadout.guardModifiers.staminaDamageScale, 0.98);
  assert.equal(scene.resolvedLoadout.defenseModifiers.damageTakenScale, 0.92 * 0.98);
  scene.unequipOwnedSlot('boots');
  assert.equal(scene.resolvedLoadout.activeSpecialSynergies.length, 0);
  assert.deepEqual(
    scene.getProgressionSnapshot().discoveredSpecialSynergyIds,
    saved.discoveredSpecialSynergyIds,
  );
  const catalog = createGraphicsResourceCatalog();
  for (const item of EQUIPMENT_CATALOG.items) {
    const resource = catalog.get('equipment:' + item.id);
    assert.ok(resource.visualProfileId);
    assert.ok(resource.familyId);
    assert.ok(resource.slot);
    assert.ok(resource.geometryProfile);
  }
  console.log(
    'PASS equipment production: baseline combat, independent shield/armor, real field guard evaluator, set and counter hook, permanent codex, all graphics Items',
  );
} finally {
  scene.dispose();
}

function resolveRealCounter(itemId, { boots = false, profileId = 'mine-collapse-boss' } = {}) {
  const counterScene = createGameScene();
  const encounter = new TrainingEncounterNode({
    entity: {
      id: 'equipment-counter-owner',
      kind: 'combat-test-mob',
      encounterProfileId: profileId,
      position: { x: 630, y: 420 },
      maxHealth: 240,
    },
    groundY: 420,
    movementBounds: { minX: 0, maxX: 960 },
    spinContact: { hitPulses: [0.3, 0.5, 0.7], contactSpacings: [23, 17, 5] },
    encounterProfiles: ENCOUNTER_PROFILES,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
  });
  try {
    counterScene.restoreProgression(equipmentTestSnapshot(itemId));
    if (boots) assert.equal(counterScene.equipOwnedItem('field-work-boots').changed, true);
    counterScene.position = { x: 600, y: 338 };
    counterScene.facing = 1;
    counterScene.isGrounded = true;
    const profile = counterScene.getAttackHitProfile('shieldBash');
    const enemy = encounter.enemy;
    enemy.aiState = 'guard';
    let frame = null;
    for (let step = 0; step < 20 && !frame; step++) {
      const state = {
        id: 'shieldBash',
        phase: 'active',
        progress: profile.start + ((profile.end - profile.start) * (step + 0.5)) / 20,
        sequence: 900,
        comboCycle: 900,
      };
      counterScene.updatePlayerCombatGeometry(state);
      const candidate = counterScene.createTrainingEncounterFrame(state, profile);
      for (let dx = 10; dx <= 70; dx += 2) {
        enemy.position.x = counterScene.position.x + dx;
        const hurt = sampleTrainingEnemyCombatGeometry(
          enemy,
          TRAINING_ENEMY_ATTACK_PROFILES,
        ).semanticHurt;
        if (
          closestCombatContact(
            [candidate.playerGeometry.shield],
            hurt,
            createAttackEnvelope({
              origin: counterScene.position,
              facing: 1,
              reach: profile.range,
            }),
          ).contact
        ) {
          frame = candidate;
          break;
        }
      }
    }
    assert.ok(frame, itemId + ': actual active shield must contact guarded target');
    const health = enemy.health,
      before = enemy.posture?.current;
    const events = [];
    encounter.combatEventOccurred.connect((event) => events.push(event));
    assert.equal(encounter.resolvePlayerAttack(frame), true);
    assert.equal(enemy.health, health, 'guarded counter must not add HP damage');
    const after = enemy.posture?.current;
    assert.equal(
      events.filter((event) => event.type === COMBAT_EVENT_TYPE.GUARD).length,
      1,
      'one guarded contact response',
    );
    const eventCount = events.length;
    assert.equal(
      encounter.resolvePlayerAttack(frame),
      false,
      'same attack sequence cannot apply posture twice',
    );
    assert.equal(enemy.posture?.current, after);
    assert.equal(enemy.health, health);
    assert.equal(events.length, eventCount);
    if (!enemy.posture)
      assert.equal(before, undefined, 'normal enemies never acquire posture from synergy');
    return {
      delta: before === undefined ? null : before - after,
      before,
      after,
      scale: profile.guardCounterPostureScale,
    };
  } finally {
    encounter.dispose();
    counterScene.dispose();
  }
}
const counterBase = ENCOUNTER_PROFILES['mine-collapse-boss'].posture.shieldCounterDamage;
for (const item of EQUIPMENT_CATALOG.items.filter((item) => item.familyId === 'field-cutter')) {
  const result = resolveRealCounter(item.id);
  assert.equal(
    result.delta,
    counterBase,
    item.id + ': existing Item posture modifier must not change baseline counter',
  );
  assert.equal(result.scale, 1);
}
const supported = resolveRealCounter('field-cutter-heavy', { boots: true });
assert.equal(
  supported.delta,
  Math.round(counterBase * 1.15),
  'special hook reaches actual boss posture writer exactly once',
);
assert.equal(supported.scale, 1.15);
assert.equal(
  resolveRealCounter('field-cutter-heavy', { boots: true, profileId: 'yard-brace-collector' })
    .delta,
  null,
);
console.log(
  'PASS actual equipment counter owner: five baseline deltas, special posture 15%, normal guard, duplicate contact',
);
