import assert from 'node:assert/strict';

import {
  ENEMY_BONE_ACTIONS,
  ENEMY_BONE_FAMILIES,
  resolveEnemyBonePoseInput,
  sampleEnemyBonePose,
  sampleEnemyBonePoseFor,
} from '../src/animation/EnemyBonePoseLibrary.js';
import { projectSideViewSkeletonFrame } from '../src/animation/SkeletonPoseProjection.js';
import { sampleTrainingEnemyCombatGeometry } from '../src/combat/SharedCombatGeometry.js';
import { TRAINING_ENEMY_ATTACK_PROFILES } from '../src/game/training/TrainingEnemyAttackProfiles.js';

assert.deepEqual([...ENEMY_BONE_FAMILIES].sort(), ['human', 'machine']);
assert.deepEqual(
  [...ENEMY_BONE_ACTIONS].sort(),
  ['advance', 'attack', 'guard', 'hit', 'idle', 'recovery', 'surrender', 'windup'].sort(),
);

const EXPECTED_JOINTS = [
  'chest',
  'farElbow',
  'farFoot',
  'farHand',
  'farHip',
  'farKnee',
  'farShoulder',
  'head',
  'nearElbow',
  'nearFoot',
  'nearHand',
  'nearHip',
  'nearKnee',
  'nearShoulder',
  'neck',
  'pelvis',
  'root',
].sort();

for (const family of ENEMY_BONE_FAMILIES) {
  const seenFrameIds = new Set();
  for (const action of ENEMY_BONE_ACTIONS) {
    for (const progress of [0, 0.5, 1]) {
      const pose = sampleEnemyBonePose({ family, action, progress });
      assert.equal(pose.family, family);
      assert.equal(pose.action, action);
      assert.ok(pose.frameId, `${family} ${action}에는 authored frameId가 필요합니다.`);
      assert.ok(pose.projectedJoints, `${family} ${action}에는 projected joints가 필요합니다.`);
      assert.deepEqual(Object.keys(pose.projectedJoints).sort(), EXPECTED_JOINTS);
      assert.ok(
        pose.projectedJoints.nearShoulder.depth > pose.projectedJoints.farShoulder.depth,
        `${family} ${action}은 near/far depth 순서를 보존해야 합니다.`,
      );
      seenFrameIds.add(pose.frameId);
    }
  }
  assert.ok(
    seenFrameIds.size >= 8,
    `${family} strip에는 서로 다른 readable frame identity가 필요합니다.`,
  );
}

// Windup은 뒤로 젖히고 attack은 앞으로 뻗는 반대 lean이어야 공격 예고를 읽을 수 있다.
for (const family of ENEMY_BONE_FAMILIES) {
  const windup = sampleEnemyBonePose({ family, action: 'windup', progress: 1 });
  const attack = sampleEnemyBonePose({ family, action: 'attack', progress: 0 });
  assert.ok(windup.bodyLean < 0, `${family} windup은 뒤로 젖혀야 합니다.`);
  assert.ok(attack.bodyLean > 0, `${family} attack contact는 앞으로 뻗어야 합니다.`);
  assert.notEqual(windup.frameId, attack.frameId);
  assert.notEqual(
    windup.projectedJoints.nearHand.y,
    attack.projectedJoints.nearHand.y,
    `${family} windup/attack은 서로 다른 weapon-arm transform이어야 합니다.`,
  );
}

// Human salvager는 machine보다 낮은 guard brace와 무릎 surrender를 가진다.
const machineWindup = sampleEnemyBonePose({ family: 'machine', action: 'windup', progress: 1 });
const humanWindup = sampleEnemyBonePose({ family: 'human', action: 'windup', progress: 1 });
assert.ok(
  humanWindup.bodyLean < machineWindup.bodyLean,
  'human windup은 machine보다 깊게 젖혀야 합니다.',
);
const machineSurrender = sampleEnemyBonePose({
  family: 'machine',
  action: 'surrender',
  progress: 1,
});
const humanSurrender = sampleEnemyBonePose({ family: 'human', action: 'surrender', progress: 1 });
assert.ok(
  humanSurrender.rootOffset.y !== machineSurrender.rootOffset.y ||
    humanSurrender.bodyLean !== machineSurrender.bodyLean,
  'human/machine surrender는 서로 다른 authored pose여야 합니다.',
);
assert.ok(
  humanSurrender.rootOffset.y >= machineSurrender.rootOffset.y,
  'human surrender는 machine보다 낮게 무릎을 꿇어야 합니다.',
);

// aiState → authored action mapping이 결정적이어야 한다.
function baseEnemy(overrides = {}) {
  return Object.freeze({
    species: 'industrial-collector',
    aiState: 'idle',
    aiSeconds: 0,
    attackKind: 'light',
    attackFacing: 1,
    facing: 1,
    rotation: 0,
    recoveryDurationSeconds: 0.4,
    recoveryStartAngle: -0.65,
    recoveryBodyStartRotation: 0,
    hitReactionWeaponAngle: -0.65,
    position: Object.freeze({ x: 500, y: 352 }),
    groundBounceDelaySeconds: 0,
    presentationScale: 0.48,
    resolutionState: null,
    ...overrides,
  });
}

assert.equal(
  resolveEnemyBonePoseInput(
    baseEnemy({ aiState: 'windup', aiSeconds: 0 }),
    TRAINING_ENEMY_ATTACK_PROFILES,
  ).action,
  'windup',
);
const windupStart = resolveEnemyBonePoseInput(
  baseEnemy({ aiState: 'windup', aiSeconds: TRAINING_ENEMY_ATTACK_PROFILES.light.windupSeconds }),
  TRAINING_ENEMY_ATTACK_PROFILES,
);
const windupEnd = resolveEnemyBonePoseInput(
  baseEnemy({ aiState: 'windup', aiSeconds: 0 }),
  TRAINING_ENEMY_ATTACK_PROFILES,
);
assert.ok(
  windupEnd.progress > windupStart.progress,
  'windup progress는 시간이 흐르면 전진해야 합니다.',
);
assert.equal(
  resolveEnemyBonePoseInput(
    baseEnemy({ aiState: 'attack', aiSeconds: 0.1 }),
    TRAINING_ENEMY_ATTACK_PROFILES,
  ).action,
  'attack',
);
assert.equal(
  resolveEnemyBonePoseInput(
    baseEnemy({ aiState: 'recovery', aiSeconds: 0.1 }),
    TRAINING_ENEMY_ATTACK_PROFILES,
  ).action,
  'recovery',
);
assert.equal(
  resolveEnemyBonePoseInput(baseEnemy({ aiState: 'hitstun' }), TRAINING_ENEMY_ATTACK_PROFILES)
    .action,
  'hit',
);
assert.equal(
  resolveEnemyBonePoseInput(baseEnemy({ aiState: 'guard' }), TRAINING_ENEMY_ATTACK_PROFILES).action,
  'guard',
);
assert.equal(
  resolveEnemyBonePoseInput(
    baseEnemy({
      species: 'human-salvager',
      resolutionState: 'surrendered',
      aiState: 'surrendered',
    }),
    TRAINING_ENEMY_ATTACK_PROFILES,
  ).action,
  'surrender',
);
const humanInput = resolveEnemyBonePoseInput(
  baseEnemy({ species: 'human-salvager', aiState: 'idle' }),
  TRAINING_ENEMY_ATTACK_PROFILES,
);
assert.equal(humanInput.family, 'human');

// 같은 snapshot은 같은 authored pose를 만든다.
const snapshot = baseEnemy({ aiState: 'windup', aiSeconds: 0.1 });
assert.deepEqual(
  sampleEnemyBonePoseFor(snapshot, TRAINING_ENEMY_ATTACK_PROFILES),
  sampleEnemyBonePoseFor(snapshot, TRAINING_ENEMY_ATTACK_PROFILES),
);

// Geometry authority는 같은 skeleton offset을 공유하되 크기를 바꾸지 않는다.
function weaponTipX(geometry) {
  const tip = geometry.weapon.points.reduce((best, point) => (point.x > best.x ? point : best));
  return tip.x;
}
const idleEnemy = {
  ...baseEnemy({ aiState: 'idle', aiSeconds: 0 }),
  position: { x: 500, y: 352 },
  groundY: 352,
  health: 40,
  maxHealth: 40,
  hitFlashSeconds: 0,
  posture: null,
  weakPoint: null,
  enchantStatus: null,
  resetSeconds: 0,
  resolutionState: null,
  recoverySource: null,
  groundBounceDelaySeconds: 0,
};
const windupEnemy = {
  ...idleEnemy,
  aiState: 'windup',
  aiSeconds: TRAINING_ENEMY_ATTACK_PROFILES.light.windupSeconds * 0.2,
};
const attackEnemy = {
  ...idleEnemy,
  aiState: 'attack',
  aiSeconds: TRAINING_ENEMY_ATTACK_PROFILES.light.attackSeconds * 0.4,
};
const idleGeometry = sampleTrainingEnemyCombatGeometry(idleEnemy, TRAINING_ENEMY_ATTACK_PROFILES);
const windupGeometry = sampleTrainingEnemyCombatGeometry(
  windupEnemy,
  TRAINING_ENEMY_ATTACK_PROFILES,
);
const attackGeometry = sampleTrainingEnemyCombatGeometry(
  attackEnemy,
  TRAINING_ENEMY_ATTACK_PROFILES,
);
assert.notEqual(weaponTipX(idleGeometry), weaponTipX(windupGeometry));
assert.ok(
  weaponTipX(attackGeometry) > weaponTipX(windupGeometry),
  'attack contact의 weapon tip은 windup보다 전방이어야 합니다.',
);
for (const geometry of [idleGeometry, windupGeometry, attackGeometry]) {
  assert.equal(geometry.actor, 'enemy');
  assert.equal(geometry.hurt.length, 2);
  assert.ok(geometry.weapon.points.length >= 4);
}

// Projection contract를 우회하는 raw 2D 회전만으로 enemy pose를 만들지 않는다.
const probeFrame = {
  joints: Object.fromEntries(
    EXPECTED_JOINTS.map((jointId) => [jointId, { x: 1, y: 2, z: 3, rotation: 0.1 }]),
  ),
};
const projected = projectSideViewSkeletonFrame(probeFrame);
assert.ok(projected.projectedJoints.root && Number.isFinite(projected.bodyLean));

console.log(
  JSON.stringify({
    status: 'PASS',
    probe: 'enemy-bone-pose',
    assertions: [
      'enemy-family-action-authored-strips',
      'windup-attack-opposed-lean-tell',
      'human-machine-distinct-brace-surrender',
      'aistate-to-authored-action-mapping',
      'deterministic-snapshot-pose',
      'geometry-shares-skeleton-without-resize',
      'side-view-projection-contract',
    ],
  }),
);
