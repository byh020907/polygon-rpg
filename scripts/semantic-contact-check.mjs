import assert from 'node:assert/strict';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import { SCRAP_AWAKENING_MAP } from '../src/game/maps/scrapAwakening.js';
import {
  closestCombatContact,
  createSweptWeaponGeometry,
  sampleTrainingEnemyCombatGeometry,
} from '../src/combat/SharedCombatGeometry.js';
import { createAttackEnvelope } from '../src/combat/AttackEnvelope.js';
import {
  sampleSemanticHurtRegions,
  measureHurtVisualDeviation,
} from '../src/combat/SemanticHurtRegions.js';

const square = (x, y, size = 4) => ({
  part: 'weapon',
  points: [
    { x, y },
    { x: x + size, y },
    { x: x + size, y: y + size },
    { x, y: y + size },
  ],
});
const scene = createTestGameScene({ mapDefinition: SCRAP_AWAKENING_MAP });
scene.enterTree();
scene.setVisualQaScrapAwakeningStage('yard-clearance');
scene.setVisualQaLocation({
  regionId: 'scrap-waste-edge',
  roomId: 'abandoned-weapon-yard',
  x: 560,
});
const encounter = scene.roomSceneNode.encounter;
let sequence = 1000;
try {
  for (const facing of [1, -1]) {
    for (const response of ['body', 'weak', 'guard', 'armor', 'immune']) {
      encounter.reset();
      scene.facing = facing;
      const enemy = encounter.enemy;
      enemy.position.x = scene.position.x + facing * 70;
      enemy.aiState = 'idle';
      enemy.hurtProfile = [
        {
          id: 'authored-head',
          part: 'head',
          shape: 'ellipse',
          bone: 'head',
          radiusX: 14,
          radiusY: 17,
          response,
        },
      ];
      const state = {
        id: 'slash',
        progress: 0.35,
        phase: 'active',
        sequence: ++sequence,
        comboCycle: sequence,
      };
      const profile = scene.getAttackHitProfile('slash');
      state.progress = (profile.start + profile.end) / 2;
      scene.updatePlayerCombatGeometry(state);
      const base = scene.createTrainingEncounterFrame(state, profile);
      const geometry = sampleTrainingEnemyCombatGeometry(enemy, encounter.attackProfiles);
      const head = geometry.semanticHurt[0].center;
      const weapon = square(head.x - 2, head.y - 2);
      const frame = { ...base, playerGeometry: { ...base.playerGeometry, weapon, sweep: null } };
      const health = enemy.health;
      const accepted = encounter.resolvePlayerAttack(frame);
      assert.equal(accepted, response !== 'immune');
      assert.equal(enemy.health < health, ['body', 'weak'].includes(response));
      assert.equal(encounter.lastVisualContact.response, response);
      const after = enemy.health;
      encounter.resolvePlayerAttack(frame);
      assert.equal(enemy.health, after, 'semantic response preserves duplicate guard');
      if (response === 'body') {
        encounter.lastHitMotionSequence = null;
        const miss = {
          ...frame,
          playerGeometry: { ...frame.playerGeometry, weapon: square(head.x, head.y - 150) },
        };
        assert.equal(
          encounter.resolvePlayerAttack(miss),
          false,
          'inside reach but no visible contact misses',
        );
      }
    }
    encounter.reset();
    const enemy = encounter.enemy;
    enemy.position.x = scene.position.x + facing * 220;
    enemy.aiState = 'idle';
    const profile = scene.getAttackHitProfile('slash');
    const state = {
      id: 'slash',
      progress: (profile.start + profile.end) / 2,
      phase: 'active',
      sequence: ++sequence,
      comboCycle: sequence,
    };
    scene.facing = facing;
    scene.updatePlayerCombatGeometry(state);
    const base = scene.createTrainingEncounterFrame(state, profile);
    const head = sampleTrainingEnemyCombatGeometry(enemy, encounter.attackProfiles).semanticHurt[0]
      .center;
    const weapon = square(head.x - 2, head.y - 2);
    const frame = { ...base, playerGeometry: { ...base.playerGeometry, weapon, sweep: null } };
    const health = enemy.health;
    assert.equal(
      closestCombatContact(
        [weapon],
        sampleTrainingEnemyCombatGeometry(enemy, encounter.attackProfiles).semanticHurt,
      ).contact,
      true,
    );
    assert.equal(
      encounter.resolvePlayerAttack(frame),
      false,
      'exaggerated visible weapon outside gameplay reach misses',
    );
    assert.equal(enemy.health, health);
  }

  // Oversized authoring cannot buy reach behind the actor or above/below its gameplay space.
  for (const facing of [1, -1])
    for (const id of [
      'slash',
      'heavy',
      'thrust',
      'rising',
      'spin',
      'airSlash',
      'airHeavy',
      'airReturn',
      'airSpin',
      'airCross',
      'shieldBash',
    ]) {
      for (const [dx, dy] of [
        [-1000, 0],
        [30, -1000],
        [30, 1000],
      ]) {
        encounter.reset();
        scene.facing = facing;
        const enemy = encounter.enemy;
        enemy.position.x = scene.position.x + dx * facing;
        enemy.position.y = enemy.groundY + dy;
        enemy.aiState = 'idle';
        const profile = scene.getAttackHitProfile(id);
        const state = {
          id,
          progress: Math.max((profile.start + profile.end) / 2, profile.hitPulses?.[0] ?? 0),
          phase: 'active',
          sequence: ++sequence,
          comboCycle: sequence,
        };
        scene.updatePlayerCombatGeometry(state);
        const base = scene.createTrainingEncounterFrame(state, profile);
        const hurt = sampleTrainingEnemyCombatGeometry(
          enemy,
          encounter.attackProfiles,
        ).semanticHurt;
        const head = hurt[0].center;
        const oversizedSourceContact = square(head.x - 2, head.y - 2);
        assert.equal(
          closestCombatContact([oversizedSourceContact], hurt).contact,
          true,
          id + ': exaggerated visual sample really overlaps target',
        );
        const frame = {
          ...base,
          playerGeometry: {
            ...base.playerGeometry,
            weapon: oversizedSourceContact,
            shield: oversizedSourceContact,
            sweep: oversizedSourceContact,
          },
        };
        const health = enemy.health;
        assert.equal(
          encounter.resolvePlayerAttack(frame),
          false,
          id + ': rear/vertical out-of-envelope contact must miss',
        );
        assert.equal(enemy.health, health);
      }
    }
  for (const override of [
    { rearReach: Infinity },
    { minY: -Infinity },
    { maxY: Infinity },
    { minY: 1, maxY: 1 },
  ]) {
    assert.throws(
      () => createAttackEnvelope({ origin: { x: 0, y: 0 }, facing: 1, reach: 100, ...override }),
      /finite authored spatial bounds/,
    );
  }

  const regions = sampleSemanticHurtRegions({
    skeleton: { head: { x: 15, y: 0 } },
    descriptors: [{ id: 'head', shape: 'circle', bone: 'head', radius: 3, tolerance: 0.1 }],
  });
  const a = square(0, -2),
    b = square(26, -2);
  const sweep = createSweptWeaponGeometry({ current: b, history: [a.points] });
  assert.equal(closestCombatContact([a, b], regions).contact, false);
  assert.equal(
    closestCombatContact(
      [sweep.swept],
      regions,
      createAttackEnvelope({ origin: { x: 0, y: 0 }, facing: 1, reach: 20 }),
    ).contact,
    true,
    'previous-current sweep prevents tunneling',
  );
  // The sweep touches a target outside range and a separate shape inside range: no shared contact.
  assert.equal(
    closestCombatContact(
      [sweep.swept],
      regions,
      createAttackEnvelope({ origin: { x: 0, y: 0 }, facing: 1, reach: 10 }),
    ).contact,
    false,
  );
  assert.equal(measureHurtVisualDeviation(regions[0], regions[0].points).withinTolerance, true);
  assert.equal(
    measureHurtVisualDeviation(
      regions[0],
      regions[0].points.map((p) => ({ ...p, x: p.x + 5 })),
    ).withinTolerance,
    false,
  );
  const moved = sampleSemanticHurtRegions({
    skeleton: { head: { x: 25, y: 30 } },
    descriptors: [{ id: 'head', shape: 'circle', bone: 'head', radius: 3 }],
  });
  assert.deepEqual(moved[0].center, { x: 25, y: 30 });
  console.log(
    JSON.stringify({
      status: 'PASS',
      checks: [
        'damage-owner-semantic-body-guard-armor-immune',
        'same-contact-envelope-mirrored',
        'inside-range-noncontact-miss',
        'outside-range-visual-contact-miss',
        'previous-current-tunneling',
        'author-override-bone-following-tolerance',
      ],
    }),
  );
} finally {
  scene.exitTree();
}
