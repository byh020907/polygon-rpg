import { deepFreeze } from '../game/map/MapDefinition.js';
import {
  childNormalizedFrame,
  normalizedLocalPoint,
  triangulateLocalPolygon,
} from '../animation/NormalizedLocalFrame.js';
import { quaternionFromEuler, multiplyQuaternions } from '../animation/Quaternion.js';
import { sampleEnemyReferenceMotion } from '../animation/EnemyReferenceMotions.js';
import { ENEMY_REFERENCE_PROFILES, ENEMY_REFERENCE_ACTIONS } from './EnemyReferenceProfiles.js';

// Compile source topology once. A concept-art variant overrides bone placement,
// proportions or shape here; it still points to the same archetype motion owner.
export function createEnemyReferenceModel(profile, boneOverrides = {}) {
  const archetype = profile.archetype ?? profile.id;
  if (!Number.isFinite(profile.referenceScale ?? 1) || (profile.referenceScale ?? 1) <= 0)
    throw new RangeError('Invalid reference scale');
  const seen = new Set();
  for (const id of Object.keys(boneOverrides))
    if (!profile.nodes.some((node) => node.id === id))
      throw new RangeError(`Unknown bone override: ${id}`);
  const nodes = profile.nodes.map((source) => {
    const node = { ...source, ...boneOverrides[source.id] };
    if (seen.has(node.id) || (node.parent && !seen.has(node.parent)))
      throw new RangeError(`Invalid parent order: ${node.id}`);
    seen.add(node.id);
    for (const point of [node.offset, ...node.shape])
      if (point.some((v) => !Number.isFinite(v) || Math.abs(v) > 1))
        throw new RangeError(`${node.id}: local coordinates must stay in [-1,1]`);
    if (node.size.length !== 3 || node.size.some((v) => !Number.isFinite(v) || v <= 0))
      throw new RangeError(`${node.id}: invalid size`);
    return {
      ...node,
      quaternion: quaternionFromEuler({ z: node.rotation ?? 0 }),
      triangles: triangulateLocalPolygon(node.shape),
    };
  });
  for (const clip of ENEMY_REFERENCE_ACTIONS)
    for (const role of Object.keys(sampleEnemyReferenceMotion(archetype, clip.id, 0.25)))
      if (!seen.has(role)) throw new RangeError(`Missing animation role: ${role}`);
  return deepFreeze({
    id: profile.id,
    archetype,
    palette: profile.palette,
    referenceScale: profile.referenceScale ?? 1,
    nodes,
  });
}

export function sampleEnemyReferenceModel(
  model,
  { action = 'idle', frameIndex = 0, position = { x: 0, y: 0 }, scale = 1, facing = 1 } = {},
) {
  const clip = ENEMY_REFERENCE_ACTIONS.find((clip) => clip.id === action);
  if (!clip || !Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= clip.frameCount)
    throw new RangeError('Invalid reference clip frame');
  if (!(scale > 0) || !Number.isFinite(scale) || ![-1, 1].includes(facing))
    throw new RangeError('Invalid reference transform');
  const pose = sampleEnemyReferenceMotion(
    model.archetype,
    action,
    frameIndex / (clip.frameCount - 1),
  );
  const root = {
    origin: { ...position, depth: 0 },
    axisX: { x: facing, y: 0, depth: 0 },
    axisY: { x: 0, y: 1, depth: 0 },
    axisZ: { x: 0, y: 0, depth: 1 },
    halfSize: [
      60 * scale * model.referenceScale,
      80 * scale * model.referenceScale,
      24 * scale * model.referenceScale,
    ],
  };
  const bones = {},
    items = [];
  for (const node of model.nodes) {
    const movement = pose[node.id] ?? {};
    const offset = node.offset.map((v, i) => v + (movement.shift?.[i] ?? 0));
    const frame = childNormalizedFrame(node.parent ? bones[node.parent] : root, {
      offset,
      size: node.size,
      quaternion: multiplyQuaternions(
        node.quaternion,
        quaternionFromEuler(movement.rotation ?? {}),
      ),
    });
    bones[node.id] = frame;
    const points = node.shape.map((point) => normalizedLocalPoint(point, frame));
    items.push({
      id: `enemy-reference-${model.id}-${node.id}`,
      type: 'polygon',
      points,
      fill: model.palette[node.tone],
      stroke: model.palette[0],
      lineWidth: 0.65 * scale,
      triangles: node.triangles,
      depths: points.map((point) => point.depth),
      depthGroup: 'enemy-reference',
      depthWrite: true,
      renderOrder: 30.45,
      order: items.length,
      triangleShades: node.triangles.map((triangle) =>
        triangle.reduce((sum, i) => sum + node.shape[i][0], 0) > 0 ? 0.87 : 1.07,
      ),
    });
  }
  return deepFreeze({
    items,
    bones,
    clipId: `${model.archetype}/${action}`,
    frameId: `${model.archetype}/${action}/${frameIndex}`,
  });
}
const models = new Map(
  ENEMY_REFERENCE_PROFILES.map((profile) => [profile.id, createEnemyReferenceModel(profile)]),
);
export function sampleEnemyReference(id, options) {
  const model = models.get(id);
  if (!model) throw new RangeError(`Unknown reference model: ${id}`);
  return sampleEnemyReferenceModel(model, options);
}
