import assert from 'node:assert/strict';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';
import { EQUIPMENT_PROFILES } from '../src/game/equipment/EquipmentProfiles.js';
import { ATTACK_SPATIAL_PROFILES } from '../src/combat/AttackSpatialProfiles.js';
import { sampleCombatFrame } from '../src/combat/CombatFrame.js';
import { isAttackContactFrame } from '../src/combat/CombatMotionTimingProfiles.js';
import {
  closestCombatContact,
  sampleTrainingEnemyCombatGeometry,
} from '../src/combat/SharedCombatGeometry.js';

const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
scene.enterTree();
scene.setVisualQaLocation({ regionId: 'academy-region', roomId: 'training-room', x: 560 });
const encounter = scene.roomSceneNode.encounter;
let sequence = 100;
const attacks = [
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
];

function prepare(id, facing, progress, dx, dy = 0) {
  encounter.reset();
  scene.facing = facing;
  scene.playerWeaponContactHistory = [];
  const enemy = encounter.enemy;
  enemy.position = { x: scene.position.x + dx * facing, y: enemy.groundY + dy };
  enemy.facing = -facing;
  enemy.attackFacing = -facing;
  enemy.aiState = 'idle';
  const combatState = { id, progress, phase: 'active', sequence: ++sequence, comboCycle: sequence };
  const attackProfile = scene.getAttackHitProfile(id);
  scene.updatePlayerCombatGeometry(combatState);
  const frame = scene.createTrainingEncounterFrame(combatState, attackProfile);
  const weapon =
    attackProfile.contactPart === 'shield'
      ? frame.playerGeometry.shield
      : frame.playerGeometry.weapon;
  const contact = closestCombatContact(
    [weapon],
    sampleTrainingEnemyCombatGeometry(enemy, encounter.attackProfiles).hurt,
  );
  return { frame, contact, enemy };
}

const boundaries = [];
const hitCases = new Map();
try {
  for (const id of attacks) {
    const profile = scene.getAttackHitProfile(id);
    let hitCase = null;
    // Discover a real articulated contact; no fabricated polygons or enlarged hitboxes.
    for (let step = 0; step <= 12 && !hitCase; step += 1) {
      const progress = profile.start + ((profile.end - profile.start) * step) / 12;
      if (profile.hitPulses && progress < profile.hitPulses[0]) continue;
      for (const dy of [0, -35, -70, -110]) {
        for (let dx = 15; dx <= 190; dx += 5) {
          if (prepare(id, 1, progress, dx, dy).contact.contact) hitCase = { progress, dx, dy };
        }
        if (hitCase) break;
      }
    }
    assert.ok(hitCase, `${id}: actual authored weapon must reach a body at active time`);
    hitCases.set(id, hitCase);
    for (const facing of [1, -1]) {
      const { frame, enemy, contact } = prepare(
        id,
        facing,
        hitCase.progress,
        hitCase.dx,
        hitCase.dy,
      );
      assert.equal(contact.contact, true, `${id}: mirrored definite hit`);
      const health = enemy.health;
      const eventsBefore = scene.combatEvents.sequence;
      assert.equal(
        encounter.resolvePlayerAttack(frame),
        true,
        `${id}: contact must reach damage owner`,
      );
      assert.ok(enemy.health < health, `${id}: health decreases`);
      assert.ok(
        scene.combatEvents
          .snapshot()
          .some((event) => event.id > eventsBefore && event.target === 'enemy'),
        `${id}: damage event matches target`,
      );
      const after = enemy.health;
      encounter.resolvePlayerAttack(frame);
      assert.equal(enemy.health, after, `${id}: one damage per pulse`);

      const miss = prepare(id, facing, hitCase.progress, 600, hitCase.dy);
      const missHealth = miss.enemy.health;
      assert.equal(miss.contact.contact, false);
      assert.equal(encounter.resolvePlayerAttack(miss.frame), false);
      assert.equal(miss.enemy.health, missHealth);

      // Search the actual contact boundary, then assert one side hits and the other misses.
      let low = hitCase.dx;
      let high = 600;
      for (let iteration = 0; iteration < 24; iteration += 1) {
        const middle = (low + high) / 2;
        if (prepare(id, facing, hitCase.progress, middle, hitCase.dy).contact.contact) low = middle;
        else high = middle;
      }
      const edge = prepare(id, facing, hitCase.progress, low - 0.01, hitCase.dy);
      assert.equal(encounter.resolvePlayerAttack(edge.frame), true, `${id}: actual edge contact`);
      const outside = prepare(id, facing, hitCase.progress, high + 0.01, hitCase.dy);
      assert.equal(
        encounter.resolvePlayerAttack(outside.frame),
        false,
        `${id}: beyond actual edge`,
      );
      boundaries.push({ id, facing, reach: low });

      const inactive = prepare(id, facing, hitCase.progress, hitCase.dx, hitCase.dy);
      for (const progress of [profile.start - 0.001, profile.end + 0.001]) {
        assert.equal(
          encounter.resolvePlayerAttack({
            ...inactive.frame,
            combatState: { ...inactive.frame.combatState, progress },
          }),
          false,
        );
      }
    }
    assert.ok(
      Math.abs(boundaries.at(-1).reach - boundaries.at(-2).reach) < 0.001,
      `${id}: boundary mirror`,
    );
  }

  const profile = scene.getAttackHitProfile('slash');
  const active = {
    id: 'slash',
    progress: (profile.start + profile.end) / 2,
    phase: 'active',
    sequence: 5000,
    comboCycle: 8000,
  };
  scene.facing = 1;
  scene.updatePlayerCombatGeometry(active);
  scene.updatePlayerCombatGeometry(active);
  assert.equal(scene.playerWeaponContactHistory.length, 2);
  scene.updatePlayerCombatGeometry({ ...active, sequence: 5001 });
  assert.equal(scene.playerWeaponContactHistory.length, 1, 'sequence changes alone reset sweep');
  scene.facing = -1;
  scene.updatePlayerCombatGeometry({ ...active, sequence: 5001 });
  assert.equal(scene.playerWeaponContactHistory.length, 1, 'facing changes alone reset sweep');
  for (const progress of [profile.start - 0.001, profile.end + 0.001]) {
    scene.updatePlayerCombatGeometry({ ...active, progress });
    assert.equal(
      scene.playerWeaponContactHistory.length,
      0,
      'inactive motion cannot damage through old sweep',
    );
    assert.equal(scene.playerCombatGeometry.sweep, null);
  }

  // Protected contact stays visible, without turning evasion into damage or spending a hit.
  const slashBoundary = boundaries.find(({ id, facing }) => id === 'slash' && facing === 1);
  let protectedCase;
  for (let step = 0; step <= 12; step += 1) {
    const progress = profile.start + ((profile.end - profile.start) * step) / 12;
    const test = prepare('slash', 1, progress, slashBoundary.reach - 1);
    if (test.contact.contact) {
      protectedCase = test;
      break;
    }
  }
  assert.ok(protectedCase);
  const health = protectedCase.enemy.health;
  protectedCase.enemy.retaliationInvulnerableSeconds = 0.1;
  encounter.resolvePlayerAttack(protectedCase.frame);
  assert.equal(protectedCase.enemy.health, health);
  assert.equal(encounter.lastVisualContact.outcome, 'retaliation-protected');
  assert.ok(
    scene.combatEvents
      .snapshot()
      .some(({ type, outcome }) => type === 'evade' && outcome === 'retaliation-protected'),
  );
  protectedCase.enemy.retaliationInvulnerableSeconds = 0;
  assert.equal(
    encounter.resolvePlayerAttack(protectedCase.frame),
    true,
    'expired protection does not poison instance hit key',
  );

  for (const [id, expectedEvent] of [
    ['slash', 'guard'],
    ['heavy', 'guard-break'],
  ]) {
    const sample = hitCases.get(id);
    const test = prepare(id, 1, sample.progress, sample.dx, sample.dy);
    test.enemy.aiState = 'guard';
    test.enemy.position.y = test.enemy.groundY;
    // Guard changes the pose; place the body along the sampled weapon without changing geometry.
    let contact = false;
    for (let dx = 0; dx <= 180; dx += 2) {
      test.enemy.position.x = scene.position.x + dx;
      if (
        closestCombatContact(
          [test.frame.playerGeometry.weapon],
          sampleTrainingEnemyCombatGeometry(test.enemy, encounter.attackProfiles).hurt,
        ).contact
      ) {
        contact = true;
        break;
      }
    }
    assert.ok(contact, `${id}: guarded body is reachable`);
    const before = test.enemy.health;
    const eventId = scene.combatEvents.sequence;
    assert.equal(encounter.resolvePlayerAttack(test.frame), true);
    assert.ok(
      scene.combatEvents
        .snapshot()
        .some((event) => event.id > eventId && event.type === expectedEvent),
    );
    if (id === 'slash') assert.equal(test.enemy.health, before);
  }

  const spin = scene.getAttackHitProfile('spin');
  const spinSample = hitCases.get('spin');
  const spinCase = prepare('spin', 1, spin.hitPulses[0], spinSample.dx, spinSample.dy);
  const spinSequence = spinCase.frame.combatState.sequence;
  let pulseHits = 0;
  for (const progress of spin.hitPulses) {
    const enemy = spinCase.enemy;
    enemy.aiState = 'idle';
    enemy.rotation = 0;
    enemy.hitstunSeconds = 0;
    const state = { ...spinCase.frame.combatState, progress, sequence: spinSequence };
    scene.playerWeaponContactHistory = [];
    scene.updatePlayerCombatGeometry(state);
    const frame = scene.createTrainingEncounterFrame(state, spin);
    let found = false;
    for (const dy of [0, -35, -70, -110]) {
      for (let dx = -150; dx <= 190; dx += 2) {
        enemy.position = { x: scene.position.x + dx, y: enemy.groundY + dy };
        if (
          closestCombatContact(
            [frame.playerGeometry.weapon],
            sampleTrainingEnemyCombatGeometry(enemy, encounter.attackProfiles).hurt,
          ).contact
        ) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    assert.ok(found, 'spin pulse has actual reachable body');
    const before = enemy.health;
    assert.equal(encounter.resolvePlayerAttack(frame), true);
    assert.ok(enemy.health < before);
    const after = enemy.health;
    encounter.resolvePlayerAttack(frame);
    assert.equal(enemy.health, after, 'spin cannot repeat same pulse');
    pulseHits += 1;
  }
  assert.equal(pulseHits, spin.hitPulses.length);
  const originalEquipment = scene.equipmentProfile;
  for (const equipment of EQUIPMENT_PROFILES) {
    scene.equipmentProfile = equipment;
    scene.combatCommands.setTimingProfile(equipment.combatTiming);
    for (const id of attacks) {
      const profile = scene.getAttackHitProfile(id);
      const timing = scene.combatCommands.getMotionFrameData(id);
      assert.equal(profile.frame.startFrame, timing.startupFrames);
      assert.equal(profile.frame.endFrame, timing.startupFrames + timing.activeFrames);
      let elapsed = 0;
      for (let tick = 0; tick < timing.durationFrames * 2; tick += 1) {
        const frame = sampleCombatFrame(timing, elapsed);
        elapsed += 1 / 120;
        const damageActive = isAttackContactFrame({ frame, progress: frame.progress }, profile);
        assert.equal(
          damageActive,
          frame.phase === 'strike',
          `${equipment.id}/${id}/${tick}: damage eligibility equals command phase`,
        );
        scene.updatePlayerCombatGeometry({
          id,
          progress: frame.progress,
          frame,
          sequence: 70000,
          comboCycle: 70000,
        });
        assert.equal(
          scene.playerCombatGeometry.sweep !== null,
          damageActive,
          `${id}: sweep exists only in authored active phase`,
        );
      }
      assert.equal(profile.range, ATTACK_SPATIAL_PROFILES[id].reach * equipment.attack.rangeScale);
      let maximumReach = -Infinity;
      let firstLengthScale = null;
      for (
        let tick = timing.startupFrames * 2;
        tick < (timing.startupFrames + timing.activeFrames) * 2;
        tick += 1
      ) {
        const state = {
          id,
          progress: tick / (timing.durationFrames * 2),
          phase: 'active',
        };
        scene.facing = 1;
        const geometry = scene.samplePlayerCombatGeometry(state);
        const shape = id === 'shieldBash' ? geometry.shield : geometry.weapon;
        maximumReach = Math.max(maximumReach, ...shape.points.map(({ x }) => x - scene.position.x));
        const pose = scene.sampleSizedPlayerMotionPose({ motionState: state, boneInput: {} });
        const scale =
          id === 'shieldBash'
            ? Math.hypot(
                pose.bonePose.skeletonFrame.joints.farHand.x,
                pose.bonePose.skeletonFrame.joints.farHand.y,
                pose.bonePose.skeletonFrame.joints.farHand.z,
              )
            : pose.targetPose.weaponLengthScale;
        if (id !== 'shieldBash') {
          if (firstLengthScale === null) firstLengthScale = scale;
          assert.equal(
            scale,
            firstLengthScale,
            `${equipment.id}/${id}: blade does not stretch each frame`,
          );
        }
      }
      assert.ok(
        Math.abs(maximumReach - profile.range) < 0.001,
        `${equipment.id}/${id}: authored maximum ${maximumReach} follows designed reach ${profile.range}`,
      );
    }
  }
  scene.equipmentProfile = originalEquipment;
  scene.combatCommands.setTimingProfile(originalEquipment.combatTiming);
  console.log(
    JSON.stringify({
      status: 'PASS',
      attacks,
      boundaries,
      lifecycle: 'sequence/facing/active-window/protected-contact',
    }),
  );
} finally {
  scene.exitTree();
}
