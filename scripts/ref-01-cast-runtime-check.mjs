import assert from 'node:assert/strict';
import {
  sampleCastCharacterPresentation,
  sampleRuntimeCastCharacter,
} from '../src/game/character/CastCharacterPresentation.js';
import {
  PLAYER_COMBAT_GEOMETRY_SCALE as scale,
  PLAYER_CHARACTER_FOOT_OFFSET as footY,
} from '../src/combat/SharedCombatGeometry.js';
import { createSvgCastBinding } from '../src/graphics/SvgCastPresentation.js';
import { sampleSvgRigProjection } from '../src/animation/SvgRigBinding.js';
import { RIVAL_SCOUT_ASSET } from '../src/graphics/assets/RivalScoutAsset.js';
import { SCRAPYARD_OWNER_ASSET } from '../src/graphics/assets/ScrapyardOwnerAsset.js';
import { frameMatrix, multiply, inverse, point } from '../src/graphics/svg/SvgMath.js';

let samples = 0;
for (const [profileId, bodyProfileId, grips] of [
  [
    'rival-scout',
    'rival',
    [
      ['hook-grip', 'nearHand'],
      ['survey-guard-grip', 'farHand'],
    ],
  ],
  [
    'scrapyard-owner',
    'owner',
    [
      ['wrench-grip', 'nearHand'],
      ['ledger-grip', 'farHand'],
    ],
  ],
]) {
  for (const motionId of ['idle', 'run', 'hit', 'knocked-out']) {
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      for (const facing of [-1, 1]) {
        const animationTime = progress * 2;
        const position = { x: 120, y: 180 };
        const boneInput = {
          animationTime,
          movementIntent: motionId === 'run' ? 1 : 0,
          isGrounded: true,
          verticalVelocity: 0,
          ...(motionId === 'hit' ? { hitstunProgress: 1 - progress } : {}),
          ...(motionId === 'knocked-out' ? { knockedOut: true } : {}),
        };
        const sample = sampleCastCharacterPresentation({
          profileId,
          bodyProfileId,
          motionState: { id: 'idle', progress: 0 },
          boneInput,
          position,
          facing,
        });
        const runtime = sampleRuntimeCastCharacter(
          {
            kind: 'cast-character',
            id: 'test-actor',
            presentationProfileId: profileId,
            bodyProfileId,
            position,
            facing,
            motionId,
            motionProgress: progress,
          },
          animationTime,
        );
        assert.equal(sample.svgDiagnostics.assetId, profileId);
        assert.match(sample.referenceStatus, /runtime-review/);
        assert.deepEqual(
          runtime.items.map((i) => i.points),
          sample.items.map((i) => i.points),
          'review and runtime must sample identical polygons',
        );
        assert.equal(new Set(runtime.items.map((i) => i.id)).size, runtime.items.length);
        assert(
          sample.items.every(
            (i) =>
              i.surface.triangles.length &&
              i.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) &&
              i.depths.every(Number.isFinite),
          ),
        );
        assert(!sample.items.some((i) => ['weapon', 'shield'].includes(i.partId)));
        const asset = profileId === 'rival-scout' ? RIVAL_SCOUT_ASSET : SCRAPYARD_OWNER_ASSET;
        const binding = createSvgCastBinding(asset, sample.pose.bonePose);
        const projected = sampleSvgRigProjection(binding.rigBinding, {
          posedJoints: Object.fromEntries(
            asset.parts
              .filter((p) => p.joint)
              .map((p) => [p.id, sample.pose.bonePose.projectedJoints[p.joint]]),
          ),
        });
        for (const [jointId, distalId] of [
          ['nearShoulder', 'nearElbow'],
          ['farShoulder', 'farElbow'],
          ['nearElbow', 'nearHand'],
          ['farElbow', 'farHand'],
          ['nearHip', 'nearKnee'],
          ['farHip', 'farKnee'],
          ['nearKnee', 'nearFoot'],
          ['farKnee', 'farFoot'],
        ]) {
          const part = asset.parts.find((p) => p.joint === jointId);
          const distal = asset.parts.find((p) => p.joint === distalId);
          const sourcePoint = point(frameMatrix(distal.frame), distal.pivot);
          const rootPoint = point(inverse(frameMatrix(asset.viewBox)), sourcePoint);
          const matrix = multiply(
            frameMatrix(asset.viewBox),
            multiply(
              projected.worldMatrices[part.id],
              inverse(binding.rigBinding.restWorld[part.id]),
            ),
          );
          const result = point(matrix, rootPoint);
          const target = sample.pose.bonePose.projectedJoints[distalId];
          assert(
            Math.hypot(result.x - target.x, result.y - target.y) < 1e-6,
            `${profileId} ${motionId} ${jointId} must reach ${distalId}`,
          );
        }
        for (const [anchorId, jointId] of grips) {
          const anchor = sample.anchors.find((a) => a.id === anchorId);
          assert(anchor, anchorId);
          const joint = sample.pose.bonePose.projectedJoints[jointId];
          const expected = {
            x: position.x + joint.x * scale * facing,
            y: position.y + footY + (joint.y - footY) * scale,
          };
          assert(
            Math.hypot(anchor.x - expected.x, anchor.y - expected.y) < 1e-6,
            `${profileId} ${motionId} ${anchorId} must stay attached to ${jointId}`,
          );
        }
        samples++;
      }
    }
  }
}
console.log(
  `REF-01 cast runtime: ${samples} shared review/runtime samples, semantic tools and grip attachment passed.`,
);
