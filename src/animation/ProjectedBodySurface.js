// Surface rules consume projected bones only. No 3D mesh, skin or texture exists.
export const BODY_SECTION_PROFILES = Object.freeze({
  round: Object.freeze({ width: Object.freeze([0.82, 1, 0.92, 0.72]), thickness: 0.5 }),
  ellipse: Object.freeze({ width: Object.freeze([0.78, 1, 0.94, 0.72]), thickness: 0.2 }),
  plate: Object.freeze({ width: Object.freeze([1, 1, 1, 1]), thickness: 0.035 }),
});

const freeze = (values) => Object.freeze(values);

export function createProjectedBoneSurface({
  start,
  end,
  width,
  section = 'round',
  widthScale = 1,
  facing = 1,
}) {
  const profile = BODY_SECTION_PROFILES[section];
  if (!profile) throw new RangeError(`Unknown bone section: ${section}`);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const nx = (length > 1e-7 ? -dy / length : 1) * facing;
  const ny = (length > 1e-7 ? dx / length : 0) * facing;
  const rows = profile.width.length;
  const columns = 5;
  const points = [];
  const depths = [];
  const triangles = [];
  const triangleShades = [];
  for (let row = 0; row < rows; row += 1) {
    const t = row / (rows - 1);
    for (let column = 0; column < columns; column += 1) {
      const u = (column / (columns - 1)) * 2 - 1;
      const radius = width * 0.5 * profile.width[row];
      points.push(
        freeze({
          x: start.x + dx * t + nx * u * radius * widthScale,
          y: start.y + dy * t + ny * u * radius * widthScale,
        }),
      );
      depths.push(
        (start.depth ?? 0) +
          ((end.depth ?? 0) - (start.depth ?? 0)) * t +
          Math.sqrt(Math.max(0, 1 - u * u)) * width * profile.thickness,
      );
      if (row < rows - 1 && column < columns - 1) {
        const index = row * columns + column;
        triangles.push(
          freeze([index, index + 1, index + columns]),
          freeze([index + 1, index + columns + 1, index + columns]),
        );
        const shade = column === 0 ? 0.65 : column === 3 ? 0.82 : 1;
        triangleShades.push(shade, shade);
      }
    }
  }
  const outlineIndices = [0, 1, 2, 3, 4, 9, 14, 19, 18, 17, 16, 15, 10, 5];
  return freeze({
    points: freeze(points),
    depths: freeze(depths),
    triangles: freeze(triangles),
    triangleShades: freeze(triangleShades),
    outlineIndices: freeze(outlineIndices),
  });
}

export function surfaceOutline(surface) {
  return freeze(surface.outlineIndices.map((index) => surface.points[index]));
}

export function createProjectedTorsoSurface(joints, facing = 1) {
  const midpoint = (a, b) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    depth: ((a.depth ?? 0) + (b.depth ?? 0)) / 2,
  });
  return createProjectedBoneSurface({
    start: midpoint(joints.farShoulder, joints.nearShoulder),
    end: midpoint(joints.farHip, joints.nearHip),
    width: Math.max(
      2,
      Math.hypot(
        joints.farShoulder.x - joints.nearShoulder.x,
        joints.farShoulder.y - joints.nearShoulder.y,
      ),
    ),
    section: 'ellipse',
    facing,
  });
}

export function withBoneSurface(item, surface, depthGroup) {
  return freeze({
    ...item,
    points: surfaceOutline(surface),
    depths: freeze(surface.outlineIndices.map((index) => surface.depths[index])),
    surface,
    depthGroup,
    depthWrite: true,
  });
}

export function withPlateDepth(
  item,
  {
    depth = 0,
    thickness = 0.5,
    depthGroup,
    axis = { x: 0, y: 0 },
    center = null,
    depthWrite = true,
  } = {},
) {
  const origin = center ?? item.points[0] ?? { x: 0, y: 0 };
  return freeze({
    ...item,
    depthGroup,
    depthWrite,
    depths: freeze(
      item.points.map(
        (point) =>
          depth + thickness + (point.x - origin.x) * axis.x + (point.y - origin.y) * axis.y,
      ),
    ),
  });
}
