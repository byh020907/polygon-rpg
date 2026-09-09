import assert from 'node:assert/strict';
import { CombatCommandController } from '../src/combat/CombatCommandController.js';
const defaults = {
  basic: true,
  strong: true,
  airBasic: true,
  guard: true,
  justGuard: true,
  guardCounter: true,
};
const moveset = (overrides = {}) => ({ commands: { ...defaults, ...overrides } });
const update = (controller, input = {}, options = {}, dt = 1 / 120) =>
  controller.update(dt, input, options);

for (const action of ['basicAttack', 'strongAttack']) {
  const capability = action === 'basicAttack' ? 'basic' : 'strong';
  for (const input of [{ [action]: true }, { [action + 'Sequence']: 1 }]) {
    const controller = new CombatCommandController({ moveset: moveset({ [capability]: false }) });
    assert.equal(update(controller, input).id, 'idle');
    assert.equal(controller.stamina, 100);
    assert.equal(controller.sequence, 0);
  }
}
const noAirBasic = new CombatCommandController({ moveset: moveset({ airBasic: false }) });
assert.equal(update(noAirBasic, { basicAttackSequence: 1 }, { isAirborne: true }).id, 'idle');
assert.equal(update(noAirBasic, { basicAttackSequence: 2 }, { isAirborne: false }).id, 'slash');
const airOnly = new CombatCommandController({ moveset: moveset({ basic: false }) });
assert.equal(update(airOnly, { basicAttackSequence: 1 }, { isAirborne: true }).id, 'airSlash');
const noStrong = new CombatCommandController({ moveset: moveset({ strong: false }) });
assert.equal(update(noStrong, { strongAttackSequence: 1 }, { isAirborne: true }).id, 'idle');
assert.equal(
  update(noStrong, { strongAttackSequence: 2, basicAttackSequence: 1 }, { isAirborne: true }).id,
  'airSlash',
  'disabled high-priority input does not hide an allowed command',
);
assert.equal(
  new CombatCommandController({ moveset: moveset({ strong: false }) }).startIssuedCommand({
    motionId: 'rising',
    action: 'strongAttack',
  }),
  false,
);
const direct = new CombatCommandController({ moveset: moveset({ airBasic: false }) });
assert.equal(direct.start('airCross'), false);
assert.equal(direct.active, null);

const noGuard = new CombatCommandController({ moveset: moveset({ guard: false }) });
noGuard.stamina = 40;
assert.equal(update(noGuard, { guard: true }, {}, 1).id, 'idle');
assert.equal(noGuard.stamina, 64, 'an unavailable Guard does not block recovery');
const beforeContact = noGuard.stamina;
const unavailable = noGuard.applyGuardContact();
assert.equal(unavailable.accepted, false);
assert.equal(noGuard.stamina, beforeContact);
assert.equal(unavailable.justGuard, false);
const noGuardCancel = new CombatCommandController({ moveset: moveset({ guard: false }) });
update(noGuardCancel, { basicAttackSequence: 1 });
const beforeCancel = noGuardCancel.stamina;
assert.equal(update(noGuardCancel, { guard: true, guardSequence: 1 }).id, 'slash');
assert.equal(noGuardCancel.stamina, beforeCancel);
const noJustGuard = new CombatCommandController({ moveset: moveset({ justGuard: false }) });
update(noJustGuard, { guard: true });
const blocked = noJustGuard.applyGuardContact({ staminaDamage: 10 });
assert.equal(blocked.justGuard, false);
assert.equal(blocked.drain, 10);
assert.equal(noJustGuard.justGuardCounterWindowSeconds, 0);
const noCounter = new CombatCommandController({ moveset: moveset({ guardCounter: false }) });
update(noCounter, { guard: true });
assert.equal(noCounter.applyGuardContact().justGuard, true);
assert.equal(noCounter.justGuardCounterWindowSeconds, 0);
assert.equal(noCounter.readIssuedMotion({ basicAttackSequence: 1 }, { counterOnly: true }), null);
assert.equal(
  noCounter.startIssuedCommand({ motionId: 'shieldBash', action: 'guardCounter', costless: true }),
  false,
);
const stale = new CombatCommandController();
update(stale, { guard: true });
stale.applyGuardContact();
assert.ok(stale.justGuardCounterWindowSeconds > 0);
stale.setMoveset(moveset({ guard: false }));
assert.equal(stale.snapshot().id, 'idle');
assert.equal(stale.justGuardCounterWindowSeconds, 0);
stale.setMoveset(null);
update(stale, { guard: false });
assert.equal(update(stale, { guard: true }).id, 'guard');
const active = new CombatCommandController();
update(active, { basicAttackSequence: 1 });
assert.throws(() => active.setMoveset(moveset()), /moveset/);
assert.equal(active.snapshot().id, 'slash');
assert.throws(
  () => new CombatCommandController({ moveset: { commands: { guard: false } } }),
  /boolean/,
);
const mutable = moveset();
const isolated = new CombatCommandController({ moveset: mutable });
mutable.commands.basic = false;
assert.equal(update(isolated, { basicAttackSequence: 1 }).id, 'slash');

// Explicit permissive grammar is byte-for-byte behavior equivalent to old default.
const a = new CombatCommandController({
  timingProfile: { startupScale: 0.82, recoveryScale: 0.84 },
});
const b = new CombatCommandController({
  timingProfile: { startupScale: 0.82, recoveryScale: 0.84 },
  moveset: moveset(),
});
for (let tick = 0; tick < 160; tick++) {
  if (tick === 15) {
    for (const controller of [a, b]) {
      const state = controller.snapshot();
      controller.confirmDamagingHit({
        sequence: state.sequence,
        motionId: state.id,
        target: 'fixture',
        outcome: 'hit',
        damage: 8,
      });
    }
  }
  const input = {
    basicAttack: tick < 3 || tick === 20,
    basicAttackSequence: tick < 20 ? 1 : 2,
    strongAttack: tick === 100,
    strongAttackSequence: tick < 100 ? 0 : 1,
    guard: tick >= 70 && tick < 80,
    guardSequence: tick < 70 ? 0 : 1,
  };
  assert.deepEqual(
    update(a, input),
    update(b, input),
    'default timing, stamina, hit-confirm combo and guard parity at tick ' + tick,
  );
}
console.log(
  JSON.stringify({
    status: 'PASS',
    checks: [
      'generic-ground-air-basic-strong-gates',
      'guard-cancel-hold-and-recovery-gates',
      'independent-just-guard-and-counter-capabilities',
      'no-direct-start-or-stale-window-bypass',
      'immutable-moveset-and-active-change-rejection',
      'exact-default-timing-stamina-hit-confirm-parity',
    ],
  }),
);
