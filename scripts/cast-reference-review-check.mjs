import assert from 'node:assert/strict';

import { createGraphicsResourceCatalog } from '../src/graphics/GraphicsResourceCatalog.js';
import { createGraphicsResourceSampler } from '../src/graphics/GraphicsResourceSampler.js';
import { CHARACTER_BODY_PROFILES } from '../src/animation/RigFamily.js';
import { SIDE_VIEW_SKELETON_PARENTS } from '../src/animation/SkeletonPoseProjection.js';
import {
  buildGraphicsReviewUrl,
  readGraphicsReviewRequest,
} from '../src/ui/GraphicsReviewConfig.js';

const catalog = createGraphicsResourceCatalog();
const sampler = createGraphicsResourceSampler(catalog);
const CAST_IDS = [
  'player:protagonist',
  'npc:cast:rival-scout',
  'npc:cast:scrapyard-owner',
  'scene:ref-01-cast-lineup',
];
const CAST_ACTIONS = ['idle', 'run'];
const REF_01_STATUS = 'ref-01-candidate-1-selected-runtime-review';
const EXPECTED_PROPS = Object.freeze({
  'rival-scout': ['rival-survey-goggles', 'salvage-hook', 'rival-salvage-band'],
  'scrapyard-owner': ['owner-welding-goggles', 'ledger', 'wrench'],
});

function finitePolygon(item) {
  const points = [...(item.points ?? []), ...(item.surface?.points ?? [])];
  assert.ok(points.length >= 3, `${item.id} must be a polygon`);
  for (const point of points) {
    assert.ok(Number.isFinite(point.x), `${item.id} polygon x must be finite`);
    assert.ok(Number.isFinite(point.y), `${item.id} polygon y must be finite`);
  }
}

function visible(item) {
  return item.enabled !== false && (item.opacity ?? 1) > 0;
}

function diagnostic(sample, profileId, jointId) {
  const entry = sample.boneDiagnostics.find((bone) => bone.id === `${profileId}:${jointId}`);
  assert.ok(entry, `${profileId}:${jointId} pose diagnostic is present`);
  assert.ok(Number.isFinite(entry.position.x), `${entry.id} diagnostic x must be finite`);
  assert.ok(Number.isFinite(entry.position.y), `${entry.id} diagnostic y must be finite`);
  return entry;
}

try {
  // Selection of the source candidate is distinct from final runtime visual approval.
  for (const id of CAST_IDS) {
    const resource = catalog.get(id);
    assert.ok(resource, `${id} exists`);
    assert.equal(resource.referenceGroupId, 'REF-01', `${id} is linked to REF-01`);
    assert.equal(
      resource.approvalStatus,
      REF_01_STATUS,
      `${id} identifies the selected candidate and pending runtime review`,
    );
    assert.match(id, /^[A-Za-z0-9:-]+$/, `${id} is URL-usable`);
    assert.ok(resource.actions.length > 0, `${id} has review actions`);
    for (const action of resource.actions)
      assert.match(action.id, /^[A-Za-z0-9:-]+$/, `${id}/${action.id} is URL-usable`);
  }

  // Rival and owner are immutable, named profiles with actual geometry deltas.
  const playerBody = CHARACTER_BODY_PROFILES.player;
  const rivalBody = CHARACTER_BODY_PROFILES.rival;
  const ownerBody = CHARACTER_BODY_PROFILES.owner;
  for (const [id, body] of Object.entries({ rival: rivalBody, owner: ownerBody })) {
    assert.ok(Object.isFrozen(body), `${id} body profile is frozen`);
    assert.ok(Object.isFrozen(body.joints), `${id} joint profile is frozen`);
    assert.notDeepEqual(body, playerBody, `${id} is not the default player profile`);
    assert.ok(Object.keys(body.joints).length > 0, `${id} has explicit body overrides`);
  }
  assert.notDeepEqual(rivalBody, ownerBody, 'rival and owner body profiles are distinct');
  assert.notEqual(rivalBody.joints.nearShoulder.scale, ownerBody.joints.nearShoulder.scale);

  const castSamples = new Map();
  for (const resourceId of ['npc:cast:rival-scout', 'npc:cast:scrapyard-owner']) {
    const resource = catalog.get(resourceId);
    const profileId = resource.presentationProfileId;
    const depthGroup = `cast:${profileId}`;
    const expectedPropIds = EXPECTED_PROPS[profileId];
    for (const actionId of CAST_ACTIONS) {
      const sample = sampler.sample(resourceId, { actionId, frameIndex: 0, facing: 1 });
      castSamples.set(`${profileId}:${actionId}`, sample);
      assert.equal(sample.frame.castReview.referenceGroupId, 'REF-01');
      assert.equal(sample.frame.castReview.approvalStatus, REF_01_STATUS);
      assert.equal(sample.frame.castReview.profileId, profileId);
      assert.equal(sample.frame.castReview.bodyProfileId, resource.bodyProfileId);
      assert.equal(sample.boneDiagnostics.length, Object.keys(SIDE_VIEW_SKELETON_PARENTS).length);

      // The sampler exposes the same shared pose skeleton (including parent links),
      // rather than an independent review-only set of bones.
      for (const [jointId, parentId] of Object.entries(SIDE_VIEW_SKELETON_PARENTS)) {
        const bone = diagnostic(sample, profileId, jointId);
        assert.equal(
          bone.parent,
          parentId ? `${profileId}:${parentId}` : null,
          `${profileId}/${actionId}/${jointId} shared parent link`,
        );
      }

      const ids = sample.frame.items.map((item) => item.id);
      assert.equal(new Set(ids).size, ids.length, `${resourceId}/${actionId} item IDs are unique`);
      const groups = new Set();
      for (const item of sample.frame.items) {
        finitePolygon(item);
        if (item.depthGroup) groups.add(item.depthGroup);
      }
      assert.deepEqual(
        [...groups],
        [depthGroup],
        `${resourceId}/${actionId} has one cast depth group`,
      );
      for (const propId of expectedPropIds) {
        const prop = sample.frame.items.find((item) => item.partId === propId);
        assert.ok(prop, `${resourceId}/${actionId} keeps attached prop ${propId}`);
        assert.ok(visible(prop), `${propId} is visible`);
        assert.equal(prop.depthGroup, depthGroup, `${propId} shares cast depth group`);
        assert.equal(typeof prop.renderOrder, 'number');
        assert.equal(typeof prop.order, 'number');
      }
      assert.match(sample.frameId, new RegExp(`^${resourceId}/${actionId}/f0000$`));
    }
  }

  const rivalShoulder = diagnostic(
    castSamples.get('rival-scout:idle'),
    'rival-scout',
    'nearShoulder',
  );
  const ownerShoulder = diagnostic(
    castSamples.get('scrapyard-owner:idle'),
    'scrapyard-owner',
    'nearShoulder',
  );
  assert.ok(
    Math.hypot(
      rivalShoulder.position.x - ownerShoulder.position.x,
      rivalShoulder.position.y - ownerShoulder.position.y,
    ) > 0.1,
    'rival and owner idle diagnostics are measurably different',
  );

  const rivalIds = new Set(castSamples.get('rival-scout:idle').frame.items.map((item) => item.id));
  const ownerIds = new Set(
    castSamples.get('scrapyard-owner:idle').frame.items.map((item) => item.id),
  );
  assert.equal(
    [...rivalIds].some((id) => ownerIds.has(id)),
    false,
    'cast IDs do not collide',
  );
  assert.notDeepEqual(
    [...new Set(castSamples.get('rival-scout:idle').frame.items.map((item) => item.depthGroup))],
    [
      ...new Set(
        castSamples.get('scrapyard-owner:idle').frame.items.map((item) => item.depthGroup),
      ),
    ],
    'rival and owner depth groups are distinct',
  );

  // The gameplay-scale lineup keeps the hero weapon and both cast identities visible.
  const lineup = sampler.sample('scene:ref-01-cast-lineup', { actionId: 'idle', frameIndex: 0 });
  assert.equal(lineup.frame.castReview.referenceGroupId, 'REF-01');
  assert.equal(lineup.frame.castReview.approvalStatus, REF_01_STATUS);
  assert.deepEqual(lineup.frame.castReview.profiles, [
    { profileId: 'scrapyard-apprentice', bodyProfileId: 'player' },
    { profileId: 'rival-scout', bodyProfileId: 'rival' },
    { profileId: 'scrapyard-owner', bodyProfileId: 'owner' },
  ]);
  assert.ok(lineup.bounds.width > 250, 'lineup spans gameplay-scale actor spacing');
  assert.ok(lineup.bounds.height > 90, 'lineup has gameplay-scale actor height');
  for (const id of [
    'weapon',
    'shield',
    ...EXPECTED_PROPS['rival-scout'],
    ...EXPECTED_PROPS['scrapyard-owner'],
  ]) {
    const item = lineup.frame.items.find((candidate) => candidate.partId === id);
    assert.ok(item, `lineup contains ${id}`);
    assert.ok(visible(item), `lineup keeps ${id} visible`);
    finitePolygon(item);
  }
  assert.ok(lineup.frame.items.some((item) => item.depthGroup === 'player'));
  assert.ok(lineup.frame.items.some((item) => item.depthGroup === 'cast:rival-scout'));
  assert.ok(lineup.frame.items.some((item) => item.depthGroup === 'cast:scrapyard-owner'));

  // Stable IDs/actions can be copied into a review URL and repeated sampling is byte-stable.
  const selection = {
    resourceId: 'scene:ref-01-cast-lineup',
    actionId: 'run',
    frameIndex: 0,
    view: 'scene',
    renderer: 'polygon',
    scale: 'fit',
    facing: 1,
    lighting: 'scene',
    category: 'scene',
    search: 'REF-01',
    viewport: 'desktop',
    speed: 1,
    mesh: false,
    bones: true,
  };
  const href = buildGraphicsReviewUrl('https://example.test/game/#review', selection);
  assert.deepEqual(readGraphicsReviewRequest(new URL(href).search), selection);
  for (const [resourceId, actionId] of [
    ['npc:cast:rival-scout', 'idle'],
    ['npc:cast:rival-scout', 'run'],
    ['npc:cast:scrapyard-owner', 'idle'],
    ['npc:cast:scrapyard-owner', 'run'],
    ['scene:ref-01-cast-lineup', 'idle'],
    ['scene:ref-01-cast-lineup', 'run'],
  ]) {
    const conditions = { resourceId, actionId, frameIndex: 0, facing: -1 };
    assert.deepEqual(
      sampler.sample(resourceId, conditions),
      sampler.sample(resourceId, conditions),
      `${resourceId}/${actionId} repeat sampling is deterministic`,
    );
  }
  console.log(
    'PASS cast reference review: REF-01 selected master runtime, frozen distinct body profiles, shared pose diagnostics, semantic SVG props, gameplay-scale lineup, and deterministic URL/sample IDs.',
  );
  console.log('Final runtime visual approval remains unverified by this fixture.');
} finally {
  sampler.destroy();
}
