import {
  createProjectedBoneSurface,
  createProjectedTorsoSurface,
  withBoneSurface,
  withPlateDepth,
} from './ProjectedBodySurface.js';

const PLAYER_SEGMENTS = Object.freeze({
  'back-thigh': ['farHip', 'farKnee', 11],
  'back-shin': ['farKnee', 'farFoot', 8],
  'front-thigh': ['nearHip', 'nearKnee', 11],
  'front-shin': ['nearKnee', 'nearFoot', 8],
  'sword-upper-arm': ['nearShoulder', 'nearElbow', 10],
  'sword-forearm': ['nearElbow', 'nearHand', 8],
  'shield-upper-arm': ['farShoulder', 'farElbow', 10],
  'shield-forearm': ['farElbow', 'farHand', 8],
});

// Attachment rules remain presentation data. Nearer camera depth is positive.
function attachment(id) {
  if (/head|hair|goggles/.test(id)) return ['head', 9];
  if (/sword/.test(id)) return ['nearHand', 1];
  if (/shield/.test(id)) return ['farHand', 8];
  if (id === 'back-boot') return ['farFoot', 4];
  if (id === 'front-boot') return ['nearFoot', 4];
  if (/bag|cable|back-panel/.test(id)) return ['chest', -7];
  if (/rivet|patch|plate|belt|front-panel/.test(id)) return ['chest', 6];
  return ['chest', 3];
}

function depthGradient(matrix) {
  if (!matrix) return { x: 0, y: 0 };
  const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  if (Math.abs(determinant) < 0.08) return { x: 0, y: 0 };
  return {
    x: (matrix[2][0] * matrix[1][1] - matrix[2][1] * matrix[1][0]) / determinant,
    y: (matrix[2][1] * matrix[0][0] - matrix[2][0] * matrix[0][1]) / determinant,
  };
}

export function createPlayerSurfaceItems(items, { bonePose, position, facing, scale, footOffset }) {
  if (!bonePose.projectedJoints) throw new TypeError('Character surfaces require projected bones.');
  const joints = Object.fromEntries(
    Object.entries(bonePose.projectedJoints).map(([id, joint]) => [
      id,
      {
        x: position.x + joint.x * scale * facing,
        y: position.y + footOffset + (joint.y - footOffset) * scale,
        depth: joint.depth * scale,
      },
    ]),
  );
  return Object.freeze(
    items.map((item) => {
      if (item.id === 'shadow') return item;
      if (item.id === 'torso')
        return Object.freeze({
          ...withBoneSurface(item, createProjectedTorsoSurface(joints, facing), 'player'),
          points: item.points,
        });
      const segment = PLAYER_SEGMENTS[item.id];
      if (segment) {
        const [from, to, width] = segment;
        return withBoneSurface(
          item,
          createProjectedBoneSurface({
            start: joints[from],
            end: joints[to],
            width: width * scale,
            facing,
          }),
          'player',
        );
      }
      const [jointId, thickness] = attachment(item.id);
      const joint = joints[jointId];
      const gradient = depthGradient(bonePose.worldJoints?.[jointId]?.matrix);
      let projectedItem = item;
      if (/bag|cable|back-panel/.test(item.id)) {
        const matrix = bonePose.worldJoints?.[jointId]?.matrix;
        if (matrix) {
          const widthScale = Math.hypot(matrix[0][0], matrix[1][0], matrix[2][0] * 0.035);
          const angle = bonePose.bodyLean;
          const ax = Math.cos(angle) * facing;
          const ay = Math.sin(angle);
          projectedItem = Object.freeze({
            ...item,
            points: Object.freeze(
              item.points.map((point) => {
                const lateral = (point.x - joint.x) * ax + (point.y - joint.y) * ay;
                return Object.freeze({
                  x: point.x + lateral * (widthScale - 1) * ax,
                  y: point.y + lateral * (widthScale - 1) * ay,
                });
              }),
            ),
          });
        }
      }
      return withPlateDepth(projectedItem, {
        depthGroup: 'player',
        depth: joint.depth,
        thickness: thickness * scale,
        center: joint,
        axis: { x: gradient.x * facing, y: gradient.y },
        depthWrite: item.id !== 'sword-trail' && (item.opacity ?? 1) >= 0.99,
      });
    }),
  );
}

const ENEMY_SEGMENTS = Object.freeze({
  'back-thigh': ['farHip', 'farKnee', 8],
  'back-shin': ['farKnee', 'farFoot', 7],
  'front-thigh': ['nearHip', 'nearKnee', 8],
  'front-shin': ['nearKnee', 'nearFoot', 7],
  'upper-weapon-arm': ['nearShoulder', 'nearElbow', 11],
  'lower-weapon-arm': ['nearElbow', 'nearHand', 10],
});

export function createEnemySurfaceItems(items, geometry) {
  const joints = geometry.presentation.skeleton;
  const depthGroup = 'enemy';
  return Object.freeze(
    items.map((item) => {
      if (/shadow|health|posture|warning|contact|effect/.test(item.id)) return item;
      if (item.id === 'combat-enemy-body')
        return Object.freeze({
          ...withBoneSurface(item, createProjectedTorsoSurface(joints), depthGroup),
          points: item.points,
        });
      const segment = ENEMY_SEGMENTS[item.id.replace('combat-enemy-', '')];
      if (segment) {
        const [from, to, width] = segment;
        return withBoneSurface(
          item,
          createProjectedBoneSurface({ start: joints[from], end: joints[to], width }),
          depthGroup,
        );
      }
      const joint = /weapon|arm|tool/.test(item.id)
        ? joints.nearHand
        : /head|eye/.test(item.id)
          ? joints.head
          : joints.chest;
      return withPlateDepth(item, {
        depthGroup,
        depth: joint.depth ?? 0,
        thickness: /head|eye/.test(item.id) ? 5 : /weapon/.test(item.id) ? 1 : 3,
        depthWrite: (item.opacity ?? 1) >= 0.99,
      });
    }),
  );
}
