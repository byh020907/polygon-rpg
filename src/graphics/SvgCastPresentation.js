import { createSvgRigBinding, sampleSvgRigProjection } from '../animation/SvgRigBinding.js';
import { PLAYER_RIG } from '../animation/PlayerRig.js';
import { ref01Appearance } from './Ref01Appearance.js';
import { sampleSvgAsset } from './svg/SvgAssetSampler.js';
import { frameMatrix, point, freeze, multiply, inverse } from './svg/SvgMath.js';

const DISTAL_JOINT = {
  nearShoulder: 'nearElbow',
  farShoulder: 'farElbow',
  nearElbow: 'nearHand',
  farElbow: 'farHand',
  nearHip: 'nearKnee',
  farHip: 'farKnee',
  nearKnee: 'nearFoot',
  farKnee: 'farFoot',
};

// Source pivots describe the drawing, not the canonical skeleton's rest pose.
// Each part gets its own source frame so accessories sharing a joint remain valid.
export function createSvgCastBinding(asset, bonePose) {
  if (asset.rigFamily !== 'Humanoid') throw new Error('Cast SVG requires Humanoid rig');
  const pivots = Object.fromEntries(
    asset.parts.map((part) => [part.id, point(frameMatrix(part.frame), part.pivot)]),
  );
  const sourceJoints = {};
  for (const part of asset.parts) {
    if (part.joint && !sourceJoints[part.joint]) sourceJoints[part.joint] = pivots[part.id];
  }
  const restJoints = {},
    jointMap = {};
  for (const part of asset.parts) {
    if (!part.joint) continue;
    const joint = bonePose.worldJoints[part.joint];
    if (!joint) throw new Error('Unknown cast joint ' + part.joint);
    const rest = { ...pivots[part.id] };
    const distalId = DISTAL_JOINT[part.joint];
    if (distalId) {
      const distal = sourceJoints[distalId],
        target = bonePose.worldJoints[distalId];
      if (!distal || !target) throw new Error('Missing cast limb endpoint ' + distalId);
      const dx = distal.x - rest.x,
        dy = distal.y - rest.y;
      const sourceLength = Math.hypot(dx, dy);
      const targetLength = Math.hypot(target.x - joint.x, target.y - joint.y, target.z - joint.z);
      if (sourceLength < 1e-6 || targetLength < 1e-6) throw new Error('Degenerate cast limb');
      rest.axisX = { x: dy / sourceLength, y: -dx / sourceLength };
      rest.axisY = { x: dx / targetLength, y: dy / targetLength };
    }
    restJoints[part.id] = rest;
    jointMap[part.id] = part.id;
  }
  return freeze({
    asset,
    jointMap,
    rigBinding: createSvgRigBinding(asset, { restJoints, rootFrame: asset.viewBox, jointMap }),
  });
}

export function sampleSvgCastPresentation(
  binding,
  { bonePose, position, facing = 1, geometryScale = 1, renderOrder = 30.45, lod = 'near' },
) {
  if (
    !Number.isFinite(position?.x) ||
    !Number.isFinite(position?.y) ||
    ![-1, 1].includes(facing) ||
    !(geometryScale > 0) ||
    !Number.isFinite(geometryScale)
  ) {
    throw new Error('Invalid cast SVG placement');
  }
  const posedJoints = Object.fromEntries(
    binding.asset.parts
      .filter((p) => p.joint)
      .map((part) => [part.id, bonePose.projectedJoints[part.joint]]),
  );
  const projected = sampleSvgRigProjection(binding.rigBinding, { posedJoints });
  const projections = Object.fromEntries(
    binding.asset.parts.map((part) => [
      part.id,
      multiply(
        frameMatrix(binding.asset.viewBox),
        multiply(projected.worldMatrices[part.id], inverse(binding.rigBinding.restWorld[part.id])),
      ),
    ]),
  );
  const worldPoint = (p) => ({
    x: position.x + p.x * geometryScale * facing,
    y: position.y + PLAYER_RIG.footY + (p.y - PLAYER_RIG.footY) * geometryScale,
  });
  const sample = sampleSvgAsset(binding.asset, { lod, pose: 'base' });
  const depthGroup = `cast:${binding.asset.id}`;
  const parts = new Map(binding.asset.parts.map((part) => [part.id, part]));
  const items = sample.items
    .filter((shape) => shape.role !== 'occluder' && shape.opacity > 0)
    .map((shape, index) => {
      const canonical = shape.points.map((p) => point(projections[shape.partId], p));
      const points = canonical.map(worldPoint);
      const joint = bonePose.worldJoints[parts.get(shape.partId).joint];
      const m = joint?.matrix,
        det = m ? m[0][0] * m[1][1] - m[0][1] * m[1][0] : 0;
      const gx = Math.abs(det) > 1e-8 ? (m[2][0] * m[1][1] - m[2][1] * m[1][0]) / det : 0;
      const gy = Math.abs(det) > 1e-8 ? (m[2][1] * m[0][0] - m[2][0] * m[0][1]) / det : 0;
      const depths = canonical.map(
        (p) =>
          ((joint?.z ?? 0) +
            gx * (p.x - (joint?.x ?? 0)) +
            gy * (p.y - (joint?.y ?? 0)) -
            shape.z) *
          geometryScale,
      );
      return {
        ...shape,
        ...ref01Appearance(binding.asset.id, shape, geometryScale),
        id: `${binding.asset.id}:${shape.id}`,
        points,
        depths,
        surface: { points, depths, triangles: shape.triangles, depthGroup },
        surfaceNormal: { ...shape.surfaceNormal, x: shape.surfaceNormal.x * facing },
        renderOrder,
        order: index,
        parallax: 1,
        depthGroup,
        partGroup: shape.partId,
      };
    });
  const anchors = sample.anchors.map((anchor) => ({
    ...anchor,
    ...worldPoint(point(projections[anchor.partId], anchor)),
  }));
  return freeze({
    items,
    anchors,
    diagnostics: {
      assetId: binding.asset.id,
      lod,
      pose: 'base',
      referenceStatus: 'ref-01-candidate-1-selected-runtime-review',
      collapsedPartIds: projected.collapsedPartIds,
    },
  });
}
