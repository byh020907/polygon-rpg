import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { sampleTrainingEnemyCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import { resolveSwordEnchantment } from '../src/game/enchantment/EnchantmentPolicy.js';
import { createProgressionSnapshot } from '../src/game/progression/ProgressionState.js';
import {
  awardEnchantMaterial,
  unlockOrSelectEnchant,
} from '../src/game/enchantment/EnchantmentState.js';
import { ProgressionStorage } from '../src/game/progression/ProgressionStorage.js';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { TrainingEncounterNode } from '../src/game/training/TrainingEncounterNode.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';

const STEP = 1 / 120;
let contactSequence = 0;

function createEncounter({
  profileId = 'training',
  enchantId = null,
  affinity = 'neutral',
  maxHealth = 500,
  guardOutsidePunish,
} = {}) {
  const baseProfile = ENCOUNTER_PROFILES[profileId];
  const encounterProfiles = Object.freeze({
    ...ENCOUNTER_PROFILES,
    [profileId]: Object.freeze({
      ...baseProfile,
      ...(guardOutsidePunish === undefined ? {} : { guardOutsidePunish }),
      enchantAffinity: Object.freeze({
        ...baseProfile.enchantAffinity,
        ...(enchantId ? { [enchantId]: affinity } : {}),
      }),
    }),
  });
  return new TrainingEncounterNode({
    entity: {
      id: `${profileId}-${enchantId ?? 'none'}-${affinity}`,
      kind: 'combat-test-mob',
      encounterProfileId: profileId,
      position: { x: 650, y: 420 },
      maxHealth,
    },
    groundY: 420,
    movementBounds: { minX: 0, maxX: 960 },
    spinContact: { hitPulses: [0.3, 0.5, 0.7], contactSpacings: [23, 17, 5] },
    encounterProfiles,
    attackProfiles: TRAINING_ENEMY_ATTACK_PROFILES,
    enchantmentContext: {
      active: enchantId ? ENCHANTMENT_CATALOG.getProfile(enchantId) : null,
    },
  });
}

function playerFrame() {
  return Object.freeze({
    position: Object.freeze({ x: 600, y: 338 }),
    facing: 1,
    isGrounded: true,
    health: 100,
    hitstunSeconds: 0,
    blockstunSeconds: 0,
    invulnerableSeconds: 0,
    rollProgress: null,
    rollDirection: null,
    airComboFacing: 0,
  });
}

function contactFrame(encounter, kind = 'basic') {
  contactSequence += 1;
  const shield = kind === 'shield';
  const strong = kind === 'strong';
  const geometry = sampleTrainingEnemyCombatGeometry(
    encounter.enemy,
    TRAINING_ENEMY_ATTACK_PROFILES,
  );
  const contactPart = Object.freeze({
    part: shield ? 'shield' : 'weapon',
    points: geometry.hurt[0].points,
  });
  return Object.freeze({
    combatState: Object.freeze({
      id: shield ? 'shieldBash' : strong ? 'heavy' : 'slash',
      phase: 'active',
      progress: 0.5,
      sequence: contactSequence,
      comboCycle: contactSequence,
      queuedMotion: null,
    }),
    attackProfile: Object.freeze({
      start: 0.3,
      end: 0.7,
      range: 80,
      damage: shield ? 16 : strong ? 22 : 12,
      launchY: -90,
      guardBreak: strong,
      ...(shield ? { contactPart: 'shield' } : {}),
    }),
    playerGeometry: Object.freeze({
      weapon: contactPart,
      sweep: contactPart,
      shield: contactPart,
    }),
    player: playerFrame(),
  });
}

function idleFrame(playerX = 800) {
  return Object.freeze({
    combatState: Object.freeze({
      id: 'idle',
      phase: 'idle',
      progress: 0,
      sequence: 0,
      comboCycle: 0,
      queuedMotion: null,
    }),
    attackProfile: null,
    playerGeometry: null,
    player: Object.freeze({ ...playerFrame(), position: Object.freeze({ x: playerX, y: 338 }) }),
  });
}

function resolveContact(encounter, kind = 'basic') {
  let playerResult = null;
  let combatEvent = null;
  encounter.playerResultResolved.connect((result) => {
    playerResult = result;
  });
  encounter.combatEventOccurred.connect((event) => {
    combatEvent = event;
  });
  encounter.enterTree();
  const healthBefore = encounter.enemy.health;
  const postureBefore = encounter.enemy.posture?.current ?? null;
  assert.equal(encounter.resolvePlayerAttack(contactFrame(encounter, kind)), true);
  encounter.step(STEP, idleFrame());
  return Object.freeze({
    damage: healthBefore - encounter.enemy.health,
    postureDamage: postureBefore === null ? null : postureBefore - encounter.enemy.posture.current,
    playerResult,
    combatEvent,
    status: encounter.enemy.enchantStatus ? { ...encounter.enemy.enchantStatus } : null,
  });
}

function verifyPolicyAndActualMatrix() {
  for (const profile of ENCHANTMENT_CATALOG.profiles) {
    const pureByAffinity = {};
    const actualByAffinity = {};
    for (const affinity of ['weak', 'neutral', 'resistant']) {
      const basic = resolveSwordEnchantment({
        enchantId: profile.id,
        affinity,
        attackKind: 'basic',
        baseDamage: 100,
      });
      const strong = resolveSwordEnchantment({
        enchantId: profile.id,
        affinity,
        attackKind: 'strong',
        baseDamage: 100,
      });
      assert.ok(basic.damage >= 1 && strong.damage >= 1);
      assert.ok(strong.buildup > basic.buildup);
      pureByAffinity[affinity] = basic.damage;

      const basicEncounter = createEncounter({ enchantId: profile.id, affinity });
      const basicActual = resolveContact(basicEncounter, 'basic');
      assert.equal(basicActual.playerResult.damagingHit.enchantment.id, profile.id);
      assert.equal(basicActual.combatEvent.payload.enchantment.color, profile.color);
      assert.equal(basicActual.status.buildup, basic.buildup);
      basicEncounter.exitTree();

      const strongEncounter = createEncounter({ enchantId: profile.id, affinity });
      const strongActual = resolveContact(strongEncounter, 'strong');
      assert.equal(strongActual.status.buildup, strong.buildup);
      strongEncounter.exitTree();
      actualByAffinity[affinity] = basicActual.damage;
    }
    assert.ok(pureByAffinity.weak > pureByAffinity.neutral);
    assert.ok(pureByAffinity.neutral > pureByAffinity.resistant);
    assert.ok(actualByAffinity.weak > actualByAffinity.neutral);
    assert.ok(actualByAffinity.neutral > actualByAffinity.resistant);
  }

  const switched = resolveSwordEnchantment({
    enchantId: 'lightning',
    affinity: 'neutral',
    attackKind: 'basic',
    baseDamage: 10,
    status: { id: 'fire', buildup: 90, remainingSeconds: 0 },
  });
  assert.equal(switched.status.buildup, 28);
  assert.equal(switched.status.remainingSeconds, 0);
  const extendedBasic = resolveSwordEnchantment({
    enchantId: 'fire',
    affinity: 'neutral',
    attackKind: 'basic',
    baseDamage: 10,
    status: { id: 'fire', buildup: 0, remainingSeconds: 2 },
  });
  const extendedStrong = resolveSwordEnchantment({
    enchantId: 'fire',
    affinity: 'neutral',
    attackKind: 'strong',
    baseDamage: 10,
    status: { id: 'fire', buildup: 0, remainingSeconds: 2 },
  });
  assert.equal(extendedBasic.status.remainingSeconds, 2.45);
  assert.equal(extendedStrong.status.remainingSeconds, 2.8);
  assert.equal(
    resolveSwordEnchantment({
      enchantId: 'fire',
      affinity: 'neutral',
      attackKind: 'strong',
      baseDamage: 10,
      status: { id: 'fire', buildup: 0, remainingSeconds: 3.8 },
    }).status.remainingSeconds,
    4,
  );
  assert.equal(
    resolveSwordEnchantment({
      enchantId: 'fire',
      affinity: 'neutral',
      attackKind: 'basic',
      baseDamage: 10,
      status: { id: 'fire', buildup: 0, remainingSeconds: 0 },
    }).status.remainingSeconds,
    0,
  );
}

function verifyActualEffectsAndShieldExclusion() {
  const fireEncounter = createEncounter({ enchantId: 'fire' });
  fireEncounter.enterTree();
  fireEncounter.resolvePlayerAttack(contactFrame(fireEncounter, 'strong'));
  fireEncounter.resolvePlayerAttack(contactFrame(fireEncounter, 'strong'));
  assert.equal(fireEncounter.enemy.enchantStatus.suppressesRegeneration, true);
  assert.equal(fireEncounter.enemy.enchantStatus.suppressesPlantDefense, true);
  fireEncounter.enemy.health = 2;
  let completed = 0;
  fireEncounter.encounterCompleted.connect(() => {
    completed += 1;
  });
  for (let index = 0; index < 61; index += 1) fireEncounter.step(STEP, idleFrame());
  assert.equal(fireEncounter.enemy.health, 0);
  assert.equal(completed, 1);
  fireEncounter.exitTree();

  const lightningEncounter = createEncounter({ enchantId: 'lightning' });
  lightningEncounter.enemy.aiState = 'windup';
  lightningEncounter.enemy.attackKind = 'heavy';
  lightningEncounter.enemy.enchantStatus = {
    id: 'lightning',
    buildup: 80,
    remainingSeconds: 0,
  };
  const lightning = resolveContact(lightningEncounter, 'basic');
  assert.equal(lightningEncounter.enemy.lastCommandTransition.kind, 'enchant-interrupt');
  assert.equal(lightningEncounter.enemy.lastCommandTransition.reason, 'lightning');
  assert.equal(lightning.playerResult.damagingHit.enchantment.id, 'lightning');
  lightningEncounter.exitTree();

  const iceEncounter = createEncounter({ enchantId: 'ice' });
  iceEncounter.enemy.enchantStatus = { id: 'ice', buildup: 0, remainingSeconds: 2.4 };
  iceEncounter.enemy.aiState = 'windup';
  iceEncounter.enemy.aiSeconds = 10;
  iceEncounter.updateEnemyCombat(STEP, idleFrame());
  assert.ok(Math.abs(iceEncounter.enemy.aiSeconds - (10 - STEP)) < 1e-9);
  iceEncounter.enemy.aiState = 'recovery';
  iceEncounter.enemy.aiSeconds = 10;
  iceEncounter.updateEnemyCombat(STEP, idleFrame());
  assert.ok(Math.abs(iceEncounter.enemy.aiSeconds - (10 - STEP * 0.7)) < 1e-9);
  iceEncounter.enemy.aiState = 'approach';
  iceEncounter.enemy.aiSeconds = 10;
  const approachBefore = iceEncounter.enemy.position.x;
  iceEncounter.updateEnemyCombat(STEP, idleFrame());
  assert.ok(
    Math.abs(
      iceEncounter.enemy.position.x -
        approachBefore -
        ENCOUNTER_PROFILES.training.approachSpeed * STEP * 0.7,
    ) < 1e-9,
  );

  const guardedStrong = createEncounter({ profileId: 'boss', enchantId: 'earth' });
  guardedStrong.enemy.aiState = 'guard';
  assert.equal(resolveContact(guardedStrong, 'strong').postureDamage, 48 + 34);
  guardedStrong.exitTree();
  const guardedBasic = createEncounter({ profileId: 'boss', enchantId: 'earth' });
  guardedBasic.enemy.aiState = 'guard';
  assert.equal(resolveContact(guardedBasic, 'basic').postureDamage, 18);
  guardedBasic.exitTree();
  const unguardedStrong = createEncounter({
    profileId: 'boss',
    enchantId: 'earth',
    guardOutsidePunish: false,
  });
  assert.equal(resolveContact(unguardedStrong, 'strong').postureDamage, 34);
  unguardedStrong.exitTree();
  const normalEarth = createEncounter({ enchantId: 'earth' });
  resolveContact(normalEarth, 'strong');
  assert.equal('posture' in normalEarth.getGameplaySnapshot(), false);
  normalEarth.exitTree();

  const shieldPlain = createEncounter();
  const plainResult = resolveContact(shieldPlain, 'shield');
  shieldPlain.exitTree();
  const shieldFire = createEncounter({ enchantId: 'fire' });
  const fireResult = resolveContact(shieldFire, 'shield');
  assert.equal(fireResult.damage, plainResult.damage);
  assert.equal(fireResult.postureDamage, plainResult.postureDamage);
  assert.equal(fireResult.playerResult.damagingHit.enchantment, null);
  assert.equal(fireResult.combatEvent.payload.enchantment, null);
  assert.equal(fireResult.status, null);
  shieldFire.exitTree();
  const plainSword = createEncounter();
  const plainSwordResult = resolveContact(plainSword, 'basic');
  assert.equal(plainSwordResult.playerResult.damagingHit.enchantment, null);
  assert.equal(plainSwordResult.status, null);
  plainSword.exitTree();
}

function verifyVisualQaMatrix() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /@keydown\.enter\.prevent\.stop="selectEnchant\(option\)"/);
  assert.match(html, /@keydown\.space\.prevent\.stop="selectEnchant\(option\)"/);
  assert.match(html, /@touchend\.prevent="selectEnchant\(option\)"/);
  assert.match(html, /<template x-if="dialogue\.active">\s+<section\s+class="dialogue-bubble"/);
  const scenarios = [
    'enchant-fire-contact',
    'enchant-lightning-contact',
    'enchant-ice-status',
    'enchant-earth-posture',
    'enchant-shield-excluded',
  ];
  for (const renderer of ['polygon', 'retro']) {
    for (const phase of ['start', 'active', 'end']) {
      for (const scenario of scenarios) {
        const request = readVisualQaRequest(
          `?visualQa=1&gameStart=${scenario}&visualQaRenderer=${renderer}&visualQaPhase=${phase}`,
        );
        assert.equal(request.renderer, renderer);
        assert.equal(request.phase, phase);
        if (scenario !== 'enchant-shield-excluded') {
          assert.equal(
            request.scenario.expectation.expectedEffectProgressMinimum,
            phase === 'active' ? 0.35 : undefined,
          );
        }
        if (scenario === 'enchant-shield-excluded')
          assert.ok(
            request.scenario.expectation.expectedAbsentItems.includes('enchant-contact-ring'),
          );
      }
    }
  }
}

function verifyProgressionEnchantmentContract() {
  let enchantment = createProgressionSnapshot('balanced-sword').enchantment;
  for (const profile of ENCHANTMENT_CATALOG.profiles) {
    const awarded = awardEnchantMaterial(enchantment, profile, ENCHANTMENT_CATALOG);
    assert.equal(awarded.changed, true);
    enchantment = awarded.enchantment;
    assert.equal(awardEnchantMaterial(enchantment, profile, ENCHANTMENT_CATALOG).changed, false);
  }
  assert.equal(enchantment.materialIds.length, 4);
  for (const profile of ENCHANTMENT_CATALOG.profiles) {
    const forged = unlockOrSelectEnchant(enchantment, profile.id, ENCHANTMENT_CATALOG);
    assert.equal(forged.changed, true);
    enchantment = forged.enchantment;
    assert.equal(enchantment.activeId, profile.id);
    assert.equal(enchantment.unlockedIds.includes(profile.id), true);
  }
  assert.equal(enchantment.materialIds.length, 0);
  assert.equal(enchantment.unlockedIds.length, 4);
  assert.equal(new Set([enchantment.activeId]).size, 1);

  const base = createProgressionSnapshot('balanced-sword');
  const legacyCompleted = {
    ...base,
    firstJourney: {
      phase: 'returned',
      routeChoice: 'guardian-route',
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: 'academy-village:academy-region:sealed-forest-dungeon:sealed-forest-checkpoint',
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold: 120,
    },
    regionExpansion: {
      phase: 'returned',
      glasswindHunterDefeated: true,
      checkpointId: 'academy-village:glasswind-region:glasswind-observatory:glasswind-checkpoint',
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold: 180,
    },
  };
  const reconciled = createTestGameScene({
    mapDefinition: ACADEMY_VILLAGE_MAP,
    progressionSnapshot: legacyCompleted,
  });
  const reconciledEnchant = reconciled.getProgressionSnapshot().enchantment;
  assert.deepEqual(
    [...reconciledEnchant.materialIds].sort(),
    ENCHANTMENT_CATALOG.profiles.map((profile) => profile.materialId).sort(),
  );
  assert.deepEqual(
    [...reconciledEnchant.claimedMaterialSourceIds].sort(),
    ENCHANTMENT_CATALOG.profiles.map((profile) => profile.sourceId).sort(),
  );
  reconciled.dispose();
}

verifyPolicyAndActualMatrix();
verifyActualEffectsAndShieldExclusion();
verifyVisualQaMatrix();
verifyProgressionEnchantmentContract();

const fire = ENCHANTMENT_CATALOG.getProfile('fire');
assert.equal(ENCOUNTER_PROFILES.field.enchantAffinity.fire, 'weak');
assert.equal(ENCOUNTER_PROFILES.boss.enchantAffinity.fire, 'resistant');
for (const affinity of ['weak', 'neutral', 'resistant'])
  assert.ok(
    resolveSwordEnchantment({ enchantId: 'fire', affinity, attackKind: 'basic', baseDamage: 1 })
      .damage >= 1,
  );
assert.equal(
  resolveSwordEnchantment({
    enchantId: 'earth',
    affinity: 'neutral',
    attackKind: 'strong',
    baseDamage: 20,
    hasPosture: true,
  }).postureDamage,
  34,
);
assert.equal(
  resolveSwordEnchantment({
    enchantId: 'lightning',
    affinity: 'neutral',
    attackKind: 'basic',
    baseDamage: 10,
    enemyAiState: 'windup',
    status: { id: 'lightning', buildup: 80, remainingSeconds: 0 },
  }).interrupt,
  true,
);
let snapshot = createProgressionSnapshot('balanced-sword');
snapshot = {
  ...snapshot,
  enchantment: awardEnchantMaterial(
    snapshot.enchantment,
    {
      materialId: fire.materialId,
      sourceId: fire.sourceId,
    },
    ENCHANTMENT_CATALOG,
  ).enchantment,
};
assert.equal(
  awardEnchantMaterial(
    snapshot.enchantment,
    { materialId: fire.materialId, sourceId: fire.sourceId },
    ENCHANTMENT_CATALOG,
  ).changed,
  false,
);
assert.throws(() =>
  awardEnchantMaterial(
    snapshot.enchantment,
    { materialId: fire.materialId, sourceId: 'dungeon-guardian-defeated' },
    ENCHANTMENT_CATALOG,
  ),
);
snapshot = {
  ...snapshot,
  enchantment: unlockOrSelectEnchant(snapshot.enchantment, fire.id, ENCHANTMENT_CATALOG)
    .enchantment,
};
assert.equal(snapshot.enchantment.activeId, 'fire');
assert.equal(snapshot.enchantment.materialIds.includes(fire.materialId), false);
const records = new Map();
const storage = new ProgressionStorage(
  { getItem: (key) => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) },
  'test',
  ENCHANTMENT_CATALOG,
);
assert.equal(storage.save(snapshot).ok, true);
assert.equal(
  storage.load('balanced-sword', ['balanced-sword'], ENCHANTMENT_CATALOG).snapshot.enchantment
    .activeId,
  'fire',
);
const legacy = { ...snapshot, version: 3 };
delete legacy.enchantment;
records.set('test', JSON.stringify(legacy));
const migrated = storage.load('balanced-sword', ['balanced-sword'], ENCHANTMENT_CATALOG);
assert.equal(migrated.ok, true);
assert.deepEqual(migrated.snapshot.worldTime, snapshot.worldTime);
records.set(
  'test',
  JSON.stringify({
    ...snapshot,
    enchantment: {
      ...snapshot.enchantment,
      unlockedIds: ['unknown-enchant'],
      activeId: 'unknown-enchant',
    },
  }),
);
assert.equal(
  storage.load('balanced-sword', ['balanced-sword'], ENCHANTMENT_CATALOG).reason,
  'invalid-data',
);
assert.equal(
  storage.save({
    ...snapshot,
    enchantment: {
      ...snapshot.enchantment,
      unlockedIds: ['unknown-enchant'],
      activeId: 'unknown-enchant',
    },
  }).reason,
  'invalid-data',
);
const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
scene.enterTree();
try {
  const initial = createProgressionSnapshot('balanced-sword');
  const forgeSnapshot = {
    ...initial,
    enchantment: awardEnchantMaterial(
      initial.enchantment,
      {
        materialId: fire.materialId,
        sourceId: fire.sourceId,
      },
      ENCHANTMENT_CATALOG,
    ).enchantment,
  };
  scene.restoreProgression(forgeSnapshot);
  scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'academy-plaza', x: 829 });
  assert.equal(scene.canForgeEnchant(), true);
  assert.equal(scene.selectEnchant('fire').changed, true);
  scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'training-room', x: 500 });
  scene.setVisualQaCombatScenario('enchant-fire-contact');
  assert.ok(
    scene
      .createRenderFrame(0)
      .items.some(
        (item) => item.id === 'enchant-fire-ember-0' && Number.isFinite(item.renderOrder),
      ),
  );
  scene.setVisualQaCombatScenario('enchant-lightning-contact');
  assert.ok(
    scene.createRenderFrame(0).items.some((item) => item.id === 'enchant-lightning-bolt-0-a'),
  );
  scene.setVisualQaCombatScenario('enchant-ice-status');
  assert.ok(scene.createRenderFrame(0).items.some((item) => item.id === 'enchant-ice-shard-0'));
  scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'sealed-forest-boss', x: 500 });
  scene.setVisualQaCombatScenario('enchant-earth-posture');
  assert.ok(
    scene.createRenderFrame(0).items.some((item) => item.id === 'enchant-earth-fragment-0'),
  );
  scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'training-room', x: 500 });
  scene.setVisualQaCombatScenario('enchant-shield-excluded');
  assert.equal(
    scene.createRenderFrame(0).items.some((item) => item.id === 'enchant-contact-ring'),
    false,
  );
} finally {
  scene.exitTree();
}
console.log('enchantment-check: PASS');
