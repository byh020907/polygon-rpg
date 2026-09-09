import { IDENTITY, multiply, inverse, frameMatrix, freeze } from '../graphics/svg/SvgMath.js';
function jointMatrix(joint, { allowProjectionCollapse = false } = {}) {
  if (!joint || !Number.isFinite(joint.x) || !Number.isFinite(joint.y))
    throw new Error('SVG rig binding requires projected joint positions');
  const x = joint.axisX ?? { x: 1, y: 0 },
    y = joint.axisY ?? { x: 0, y: 1 };
  const matrix = [x.x, x.y, y.x, y.y, joint.x, joint.y];
  if (matrix.some((value) => !Number.isFinite(value)))
    throw new Error('Invalid projected SVG joint basis');
  const determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2];
  if (Math.abs(determinant) < 1e-10 && allowProjectionCollapse) {
    // A valid 3D orthonormal frame may project to a line. A malformed 2D
    // source/override matrix does not get this exception.
    const valid3d =
      Number.isFinite(x.depth) &&
      Number.isFinite(y.depth) &&
      Math.abs(Math.hypot(x.x, x.y, x.depth) - 1) < 1e-6 &&
      Math.abs(Math.hypot(y.x, y.y, y.depth) - 1) < 1e-6 &&
      Math.abs(x.x * y.x + x.y * y.y + x.depth * y.depth) < 1e-6;
    if (!valid3d) throw new Error('Singular source joint is not a valid 3D projection');
  } else inverse(matrix);
  return matrix;
}
// Absolute per-part projection avoids inverting a collapsed current parent.
// Such a parent cannot represent independently projecting 3D children in 2D FK.
export function sampleSvgRigProjection(binding, { posedJoints, partTransforms = {} }) {
  const worldMatrices = {},
    collapsedPartIds = [];
  for (const part of binding.asset.parts) {
    const linked = binding.bindings[part.id],
      parent = part.parentId ? worldMatrices[part.parentId] : IDENTITY;
    let world = linked
      ? multiply(
          multiply(
            multiply(
              binding.toRoot,
              jointMatrix(posedJoints[linked.jointId], { allowProjectionCollapse: true }),
            ),
            inverse(linked.restJoint),
          ),
          binding.restWorld[part.id],
        )
      : multiply(parent, part.bind);
    if (Object.hasOwn(partTransforms, part.id)) {
      const override = partTransforms[part.id];
      if (
        !Array.isArray(override) ||
        override.length !== 6 ||
        override.some((v) => !Number.isFinite(v))
      )
        throw new Error('Invalid authored SVG part delta');
      inverse(override);
      world = multiply(multiply(parent, part.bind), override);
    }
    if (world.some((v) => !Number.isFinite(v))) throw new Error('Nonfinite SVG projected part');
    worldMatrices[part.id] = world;
    if (Math.abs(world[0] * world[3] - world[1] * world[2]) < 1e-10) collapsedPartIds.push(part.id);
  }
  for (const id of Object.keys(partTransforms))
    if (!binding.asset.parts.some((p) => p.id === id)) throw new Error('Unknown authored SVG part');
  return freeze({ worldMatrices, collapsedPartIds });
}
export function createSvgRigBinding(asset, { restJoints, rootFrame, jointMap = {} }) {
  if (
    !Array.isArray(rootFrame) ||
    rootFrame.length !== 4 ||
    rootFrame.some((n) => !Number.isFinite(n)) ||
    rootFrame[2] <= 0 ||
    rootFrame[3] <= 0
  )
    throw new Error('SVG binding requires skeleton rootFrame [x,y,width,height]');
  const toRoot = inverse(frameMatrix(rootFrame)),
    restWorld = {},
    bindings = {};
  for (const part of asset.parts) {
    restWorld[part.id] = multiply(part.parentId ? restWorld[part.parentId] : IDENTITY, part.bind);
    const jointId = jointMap[part.id] ?? part.joint;
    if (jointId) {
      bindings[part.id] = {
        jointId,
        restJoint: multiply(toRoot, jointMatrix(restJoints[jointId])),
      };
    }
  }
  return freeze({ asset, rootFrame: [...rootFrame], toRoot, restWorld, bindings });
}
export function sampleSvgRigBinding(binding, { posedJoints, partTransforms = {} }) {
  const desiredWorld = {},
    deltas = {};
  for (const part of binding.asset.parts) {
    const linked = binding.bindings[part.id],
      parent = part.parentId ? desiredWorld[part.parentId] : IDENTITY;
    let world = linked
      ? multiply(
          multiply(
            multiply(binding.toRoot, jointMatrix(posedJoints[linked.jointId])),
            inverse(linked.restJoint),
          ),
          binding.restWorld[part.id],
        )
      : multiply(parent, part.bind);
    const delta = multiply(multiply(inverse(part.bind), inverse(parent)), world);
    const override = partTransforms[part.id];
    if (override) {
      if (
        !Array.isArray(override) ||
        override.length !== 6 ||
        override.some((n) => !Number.isFinite(n))
      )
        throw new Error('Invalid authored SVG part delta');
      inverse(override);
      deltas[part.id] = override;
      world = multiply(multiply(parent, part.bind), override);
    } else deltas[part.id] = delta;
    desiredWorld[part.id] = world;
  }
  for (const key of Object.keys(partTransforms))
    if (!binding.asset.parts.some((part) => part.id === key))
      throw new Error('Unknown authored SVG part');
  return freeze(deltas);
}
