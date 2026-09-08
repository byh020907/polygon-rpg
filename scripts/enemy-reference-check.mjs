import assert from 'node:assert/strict';
import {
  ENEMY_REFERENCE_PROFILES,
  ENEMY_REFERENCE_ACTIONS,
} from '../src/graphics/EnemyReferenceProfiles.js';
import {
  createEnemyReferenceModel,
  sampleEnemyReferenceModel,
} from '../src/graphics/EnemyReferenceModel.js';
import {
  normalizedLocalPoint,
  childNormalizedFrame,
} from '../src/animation/NormalizedLocalFrame.js';
import { quaternionFromEuler } from '../src/animation/Quaternion.js';

assert.deepEqual(
  ENEMY_REFERENCE_PROFILES.map((p) => p.id),
  ['humanoid', 'beast', 'flying', 'machine'],
);
const source = JSON.stringify(ENEMY_REFERENCE_PROFILES),
  evidence = [];
const origin = { x: 170, y: 260 };
let count = 0;
for (const profile of ENEMY_REFERENCE_PROFILES) {
  const model = createEnemyReferenceModel(profile);
  const torso = profile.nodes.find((n) => n.id === 'torso');
  const variant = createEnemyReferenceModel(
    { ...profile, id: `${profile.id}-concept-variant`, archetype: profile.id },
    {
      torso: { size: torso.size.map((v, i) => v * (i === 0 ? 0.85 : 1.15)) },
    },
  );
  const first = sampleEnemyReferenceModel(model),
    last = sampleEnemyReferenceModel(model, { frameIndex: 30 });
  assert.notDeepEqual(first.items, last.items, `${profile.id}: idle must animate`);
  for (const clip of ENEMY_REFERENCE_ACTIONS) {
    const signature = new Set();
    for (let frameIndex = 0; frameIndex < clip.frameCount; frameIndex++) {
      const options = { action: clip.id, frameIndex, position: origin };
      const sample = sampleEnemyReferenceModel(model, options);
      for (const [id, bone] of Object.entries(sample.bones))
        assert.deepEqual(
          bone.halfSize,
          first.bones[id].halfSize,
          `${profile.id}/${id}: rotation cannot stretch a bone`,
        );
      const scaled = sampleEnemyReferenceModel(model, { ...options, scale: 2 });
      const mirrored = sampleEnemyReferenceModel(model, { ...options, facing: -1 });
      signature.add(JSON.stringify(sample.items.map((i) => i.points)));
      for (let i = 0; i < sample.items.length; i++) {
        const item = sample.items[i];
        assert.ok(Object.isFrozen(item));
        assert.equal(item.points.length, item.depths.length);
        item.points.forEach((point, j) => {
          assert.ok([point.x, point.y, point.depth].every(Number.isFinite));
          assert.ok(
            Math.abs(scaled.items[i].points[j].x - origin.x - (point.x - origin.x) * 2) < 1e-7,
          );
          assert.ok(
            Math.abs(scaled.items[i].points[j].y - origin.y - (point.y - origin.y) * 2) < 1e-7,
          );
          assert.ok(Math.abs(mirrored.items[i].points[j].x + point.x - 2 * origin.x) < 1e-7);
          assert.ok(Math.abs(mirrored.items[i].points[j].y - point.y) < 1e-7);
        });
      }
      const retargeted = sampleEnemyReferenceModel(variant, options);
      assert.equal(
        retargeted.clipId,
        sample.clipId,
        'a changed body must reuse the same type clip',
      );
      assert.notDeepEqual(
        retargeted.items.map((i) => i.points),
        sample.items.map((i) => i.points),
      );
      count++;
    }
    assert.ok(
      signature.size > clip.frameCount / 2,
      `${profile.id}/${clip.id} must have distinct sampled motion`,
    );
  }
  evidence.push({
    type: profile.id,
    parts: model.nodes.length,
    clips: ENEMY_REFERENCE_ACTIONS.map((c) => c.id),
    sameClipRetarget: true,
  });
}
assert.equal(JSON.stringify(ENEMY_REFERENCE_PROFILES), source);
const root = {
  origin: { x: 10, y: 20, depth: 0 },
  axisX: { x: 1, y: 0, depth: 0 },
  axisY: { x: 0, y: 1, depth: 0 },
  axisZ: { x: 0, y: 0, depth: 1 },
  halfSize: [10, 20, 5],
};
const child = childNormalizedFrame(root, {
  offset: [1, 0, 0],
  size: [0.5, 0.5, 0.5],
  quaternion: quaternionFromEuler({ z: Math.PI / 2 }),
});
assert.deepEqual(child.origin, { x: 20, y: 20, depth: 0 });
const point = normalizedLocalPoint([1, 0, 0], child);
assert.ok(
  Math.abs(point.x - 20) < 1e-8 && Math.abs(point.y - 25) < 1e-8,
  'rotation follows parent local axes and extents',
);
assert.throws(() => normalizedLocalPoint([1.001, 0], root), /\[-1, 1\]/);
assert.throws(
  () => createEnemyReferenceModel(ENEMY_REFERENCE_PROFILES[0], { missing: {} }),
  /Unknown bone/,
);
assert.throws(
  () => createEnemyReferenceModel(ENEMY_REFERENCE_PROFILES[0], { torso: { offset: [2, 0, 0] } }),
  /local coordinates/,
);
console.log(JSON.stringify({ verified: true, sampledFrames: count, checks: evidence }, null, 2));
