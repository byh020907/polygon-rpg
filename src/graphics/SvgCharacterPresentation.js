import { createSvgRigBinding, sampleSvgRigProjection } from '../animation/SvgRigBinding.js';
import { PLAYER_RIG } from '../animation/PlayerRig.js';
import { ref01Appearance } from './Ref01Appearance.js';
import { sampleSvgAsset } from './svg/SvgAssetSampler.js';
import { frameMatrix, point, freeze, multiply, inverse } from './svg/SvgMath.js';
const HERO_ITEM_IDS = Object.freeze({
  'apprentice-face-shape': 'head',
  'apprentice-shirt-shape': 'torso',
  'apprentice-near-boot-shape': 'front-boot',
  'apprentice-far-boot-shape': 'back-boot',
  'apprentice-cross-strap-shape': 'cross-body-strap',
  'apprentice-satchel-shape': 'tool-bag',
  'apprentice-neck-cloth-shape': 'work-collar',
});
function convex(points) {
  let sign = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      c = points[(i + 2) % points.length];
    const v = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(v) < 1e-9) continue;
    const next = Math.sign(v);
    if (sign && sign !== next) return false;
    sign = next;
  }
  return sign !== 0;
}
function toolContour(items, partId, label, { allowProjectionCollapse = false } = {}) {
  const matches = items.filter(
    (i) => i.partId === partId && i.role !== 'occluder' && i.opacity > 0,
  );
  if (matches.length !== 1)
    throw new Error(
      `SVG character ${label} requires exactly one visible semantic contour (${partId}); received ${matches.length}`,
    );
  const points = matches[0].points;
  const signedArea = points.reduce(
    (sum, p, i) =>
      sum + p.x * points[(i + 1) % points.length].y - p.y * points[(i + 1) % points.length].x,
    0,
  );
  if (!convex(points) && !(allowProjectionCollapse && Math.abs(signedArea) < 1e-6))
    throw new Error(
      `SVG character ${label} contour must be convex for contact sweep; no hull substitution is allowed`,
    );
  return matches[0];
}
function projection(pose) {
  if (!pose?.projectedJoints || !pose.worldJoints)
    throw new Error('SVG character requires canonical projected/world joints');
  for (const world of Object.values(pose.worldJoints)) {
    if (
      !['x', 'y', 'z'].every((k) => Number.isFinite(world[k])) ||
      !Array.isArray(world.matrix) ||
      world.matrix.length !== 3 ||
      world.matrix.some(
        (row) =>
          !Array.isArray(row) || row.length !== 3 || row.some((value) => !Number.isFinite(value)),
      )
    )
      throw new Error('Invalid SVG character world joint matrix');
  }
  return pose.projectedJoints;
}
export function createSvgCharacterBinding(
  asset,
  { restPose, rootFrame, jointMap = {}, weaponPartId = 'weapon', shieldPartId = 'shield' } = {},
) {
  if (asset?.rigFamily !== 'Humanoid')
    throw new Error('SVG character requires a Humanoid rig-family asset');
  const restJoints = projection(restPose);
  for (const id of Object.keys(jointMap))
    if (!asset.parts.some((p) => p.id === id)) throw new Error('Unknown SVG joint-map part ' + id);
  for (const part of asset.parts) {
    const joint = jointMap[part.id] ?? part.joint;
    if (joint && !restJoints[joint]) throw new Error('Unknown canonical SVG joint ' + joint);
  }
  const rigBinding = createSvgRigBinding(asset, { restJoints, rootFrame, jointMap });
  const partJointIds = {};
  for (const part of asset.parts)
    partJointIds[part.id] =
      jointMap[part.id] ?? part.joint ?? (part.parentId ? partJointIds[part.parentId] : null);
  for (const partId of [weaponPartId, shieldPartId])
    if (!partJointIds[partId])
      throw new Error('SVG tool part requires an explicit canonical joint binding: ' + partId);
  for (const lod of asset.lods)
    for (const pose of asset.poses) {
      const sample = sampleSvgAsset(asset, { lod, pose });
      toolContour(sample.items, weaponPartId, 'weapon');
      toolContour(sample.items, shieldPartId, 'shield');
    }
  return freeze({
    asset,
    rigBinding,
    rootFrame: [...rootFrame],
    partJointIds,
    weaponPartId,
    shieldPartId,
    restWeaponJoint: restJoints[partJointIds[weaponPartId]],
  });
}
export function sampleSvgCharacterPresentation(
  binding,
  {
    bonePose,
    position,
    facing = 1,
    geometryScale = 1,
    renderOrder = 30,
    lod = 'near',
    weaponLengthScale = 1,
    authoredOverride = bonePose?.authoredOverride,
  } = {},
) {
  if (
    !position ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y) ||
    ![-1, 1].includes(facing) ||
    !Number.isFinite(geometryScale) ||
    geometryScale <= 0 ||
    !Number.isFinite(renderOrder) ||
    !Number.isFinite(weaponLengthScale) ||
    weaponLengthScale <= 0
  )
    throw new Error(
      'SVG character requires finite world placement, positive scale and facing -1/1',
    );
  const posedJoints = projection(bonePose),
    pose = authoredOverride?.poseId ?? 'base';
  const selectedWhole = binding.asset.shapes.some(
    (s) => s.pose === pose && s.replacement === 'whole' && (s.lod === 'common' || s.lod === lod),
  );
  if (authoredOverride?.wholeBody !== undefined && authoredOverride.wholeBody !== selectedWhole)
    throw new Error('Authored whole-body override must match the selected master pose groups');
  const projected = sampleSvgRigProjection(binding.rigBinding, {
    posedJoints,
    partTransforms: authoredOverride?.partTransforms ?? {},
  });
  const sample = sampleSvgAsset(binding.asset, { lod, pose });
  const toCanonical = frameMatrix(binding.rootFrame);
  const sourceFrame = frameMatrix(binding.asset.viewBox);
  const toSource = inverse(sourceFrame);
  const restWeapon = binding.restWeaponJoint;
  const restBasis = [
    restWeapon.axisX.x,
    restWeapon.axisX.y,
    restWeapon.axisY.x,
    restWeapon.axisY.y,
    restWeapon.x,
    restWeapon.y,
  ];
  const sizeWeaponPoint = (p, partId) => {
    if (partId !== binding.weaponPartId || weaponLengthScale === 1) return p;
    const local = point(inverse(restBasis), point(sourceFrame, p));
    if (local.x > 5) local.x = 5 + (local.x - 5) * weaponLengthScale;
    return point(toSource, point(restBasis, local));
  };
  const projections = Object.fromEntries(
    binding.asset.parts.map((part) => [
      part.id,
      multiply(
        toCanonical,
        multiply(projected.worldMatrices[part.id], inverse(binding.rigBinding.restWorld[part.id])),
      ),
    ]),
  );
  const worldPoint = (canonical) => ({
    x: position.x + canonical.x * geometryScale * facing,
    y: position.y + PLAYER_RIG.footY + (canonical.y - PLAYER_RIG.footY) * geometryScale,
  });
  const items = sample.items
    .filter((i) => i.role !== 'occluder' && i.opacity > 0)
    .map((shape, index) => {
      const canonical = shape.points.map((p) =>
        point(projections[shape.partId], sizeWeaponPoint(p, shape.partId)),
      );
      const points = canonical.map(worldPoint),
        jointId = binding.partJointIds[shape.partId],
        joint = jointId ? bonePose.worldJoints[jointId] : null;
      const m = joint?.matrix,
        det = m ? m[0][0] * m[1][1] - m[0][1] * m[1][0] : 0;
      const gx = Math.abs(det) > 1e-8 ? (m[2][0] * m[1][1] - m[2][1] * m[1][0]) / det : 0,
        gy = Math.abs(det) > 1e-8 ? (m[2][1] * m[0][0] - m[2][0] * m[0][1]) / det : 0;
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
        id:
          binding.asset.id === 'scrapyard-apprentice' && shape.partId === binding.weaponPartId
            ? 'sword-blade'
            : binding.asset.id === 'scrapyard-apprentice' && shape.partId === binding.shieldPartId
              ? 'shield'
              : binding.asset.id === 'scrapyard-apprentice' && HERO_ITEM_IDS[shape.id]
                ? HERO_ITEM_IDS[shape.id]
                : `${binding.asset.id}:${shape.id}`,
        points,
        depths,
        surface: { points, depths, triangles: shape.triangles },
        surfaceNormal: { ...shape.surfaceNormal, x: shape.surfaceNormal.x * facing },
        renderOrder,
        order: index,
        parallax: 1,
        depthGroup: 'player',
        partGroup: shape.partId,
      };
    });
  const weaponItem = toolContour(items, binding.weaponPartId, 'weapon', {
      allowProjectionCollapse: projected.collapsedPartIds.includes(binding.weaponPartId),
    }),
    shieldItem = toolContour(items, binding.shieldPartId, 'shield', {
      allowProjectionCollapse: projected.collapsedPartIds.includes(binding.shieldPartId),
    });
  const anchors = sample.anchors.map((anchor) => ({
    ...anchor,
    ...worldPoint(point(projections[anchor.partId], sizeWeaponPoint(anchor, anchor.partId))),
    depth:
      ((bonePose.worldJoints[binding.partJointIds[anchor.partId]]?.z ?? 0) - anchor.z) *
      geometryScale,
  }));
  return freeze({
    items,
    weapon: { part: 'weapon', points: weaponItem.points },
    shield: { part: 'shield', points: shieldItem.points },
    anchors,
    diagnostics: {
      assetId: binding.asset.id,
      rigFamily: binding.asset.rigFamily,
      lod,
      pose,
      wholeBody: selectedWhole,
      weaponShapeId: weaponItem.id,
      shieldShapeId: shieldItem.id,
      sharedToolContours: true,
      collapsedPartIds: projected.collapsedPartIds,
    },
  });
}
