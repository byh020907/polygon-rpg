import { polygonStrokePixels } from './PolygonCoverage.js';

// Camera depth stays separate from screen vertices. Larger depth faces the camera.
function color(value) {
  const hex = String(value ?? '#000000').replace('#', '');
  if (/^[\da-f]{3}$/i.test(hex)) return [...hex].map((c) => parseInt(c + c, 16));
  if (/^[\da-f]{6}$/i.test(hex)) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  throw new TypeError(`Depth surface requires a hexadecimal color: ${value}`);
}

function blend(data, index, rgb, alpha) {
  const start = index * 4;
  const oldAlpha = data[start + 3] / 255;
  const resultAlpha = alpha + oldAlpha * (1 - alpha);
  for (let channel = 0; channel < 3; channel += 1) {
    data[start + channel] =
      (rgb[channel] * alpha + data[start + channel] * oldAlpha * (1 - alpha)) / resultAlpha;
  }
  data[start + 3] = resultAlpha * 255;
}

export function rasterizeDepthPolygons(
  items,
  {
    width,
    height,
    offsetX = 0,
    offsetY = 0,
    scale = 1,
    data = null,
    depthBuffer = null,
    silhouetteWidth = 1,
    silhouetteColor = null,
  },
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 4194304 ||
    ![offsetX, offsetY, scale].every(Number.isFinite) ||
    scale <= 0
  ) {
    throw new RangeError(
      'Depth raster requires a finite bounded viewport (at most 4194304 pixels).',
    );
  }
  data ??= new Uint8ClampedArray(width * height * 4);
  depthBuffer ??= new Float64Array(width * height);
  if (data.length !== width * height * 4 || depthBuffer.length !== width * height)
    throw new RangeError('Depth raster buffers must match viewport.');
  for (const item of items) {
    const surface = item.surface ?? item;
    if (
      surface.points.length !== surface.depths?.length ||
      !surface.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) ||
      !surface.depths.every(Number.isFinite) ||
      !Number.isFinite(item.opacity ?? 1) ||
      !Number.isFinite(item.lineWidth ?? 1)
    ) {
      throw new TypeError(
        'Depth surfaces require matching finite screen vertices and depth channels.',
      );
    }
    if (
      surface.triangles?.some(
        (triangle) =>
          triangle.length !== 3 ||
          triangle.some(
            (index) => !Number.isInteger(index) || index < 0 || index >= surface.points.length,
          ),
      )
    )
      throw new RangeError('Depth triangle index outside surface.');
  }
  data.fill(0);
  depthBuffer.fill(-Infinity);
  const owners = new Int32Array(width * height).fill(-1);
  const outlineDepth = new Float64Array(width * height).fill(-Infinity);
  const outlineOwners = new Int32Array(width * height).fill(-1);
  const surfaces = items
    .filter((item) => (item.surface?.points ?? item.points).length >= 3)
    .map((item, order) => ({
      ...item,
      ...(item.surface ?? {}),
      order,
      points: (item.surface?.points ?? item.points).map((p) => ({
        x: (p.x - offsetX) * scale,
        y: (p.y - offsetY) * scale,
      })),
      alpha: Math.max(0, Math.min(1, item.opacity ?? 1)),
    }));
  // Stable keys resolve only numerically coplanar samples, never replace depth ordering.
  const stableKey = (item) =>
    `${item.id ?? ''}:${item.fill}:${JSON.stringify(item.points)}:${item.depths.join(',')}`;
  for (const item of surfaces) item.stableKey = stableKey(item);
  const ranked = [...surfaces].sort((a, b) => a.stableKey.localeCompare(b.stableKey));
  ranked.forEach((item, rank) => {
    item.rank = rank;
  });
  const opaque = surfaces.filter((item) => item.alpha === 1 && item.depthWrite !== false);
  const transparent = surfaces.filter(
    (item) => item.alpha > 0 && (item.alpha < 1 || item.depthWrite === false),
  );
  transparent.sort(
    (a, b) =>
      a.depths.reduce((sum, z) => sum + z, 0) / a.depths.length -
        b.depths.reduce((sum, z) => sum + z, 0) / b.depths.length || a.rank - b.rank,
  );
  function paint(item, write, outline = false) {
    let rgb = color(outline ? item.stroke : item.fill);
    const coverage = new Map();
    function sample(x, y, z) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const index = y * width + x;
      // Record geometric coverage before depth rejection: a fully hidden broad
      // surface is different from a thin/edge-on surface with no pixel centers.
      if (!outline) item.hasRasterInterior = true;
      if (outline && item.alpha === 1 && item.depthWrite !== false) {
        if (owners[index] !== item.rank) {
          if (owners[index] !== -1 && z <= depthBuffer[index] + 1e-7) return;
          // An exposed contour must border this final visible surface, not a hidden edge.
          let visibleNeighbor = false;
          const reach = Math.ceil(Math.max(0.5, ((item.lineWidth ?? 1) * scale) / 2));
          for (let oy = -reach; oy <= reach && !visibleNeighbor; oy += 1) {
            for (let ox = -reach; ox <= reach; ox += 1) {
              const px = x + ox;
              const py = y + oy;
              if (
                px >= 0 &&
                py >= 0 &&
                px < width &&
                py < height &&
                owners[py * width + px] === item.rank
              ) {
                visibleNeighbor = true;
                break;
              }
            }
          }
          if (!visibleNeighbor && item.hasRasterInterior) return;
        }
        if (
          z < outlineDepth[index] - 1e-7 ||
          (Math.abs(z - outlineDepth[index]) <= 1e-7 && item.rank < outlineOwners[index])
        )
          return;
      } else if (
        z < depthBuffer[index] - 1e-7 ||
        (write && Math.abs(z - depthBuffer[index]) <= 1e-7 && item.rank < owners[index])
      )
        return;
      if (z > (coverage.get(index)?.z ?? -Infinity)) coverage.set(index, { z, rgb });
    }
    if (outline) {
      const strokeWidth = Math.max(1, (item.lineWidth ?? 1) * scale);
      const boundary = item.outlineIndices ?? item.points.map((_, index) => index);
      for (let edge = 0; edge < boundary.length; edge += 1) {
        const i = boundary[edge];
        const j = boundary[(edge + 1) % boundary.length];
        const a = item.points[i];
        const b = item.points[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length2 = dx * dx + dy * dy;
        polygonStrokePixels([a, b], width, height, strokeWidth, (x, y) => {
          const t = length2
            ? Math.max(0, Math.min(1, ((x + 0.5 - a.x) * dx + (y + 0.5 - a.y) * dy) / length2))
            : 0;
          sample(x, y, item.depths[i] + (item.depths[j] - item.depths[i]) * t);
        });
      }
    } else {
      const triangles =
        item.triangles ??
        Array.from({ length: Math.max(0, item.points.length - 2) }, (_, i) => [0, i + 1, i + 2]);
      const base = rgb;
      for (const [triangleIndex, [ia, ib, ic]] of triangles.entries()) {
        rgb = base.map((channel) =>
          Math.max(0, Math.min(255, channel * (item.triangleShades?.[triangleIndex] ?? 1))),
        );
        const a = item.points[ia];
        const b = item.points[ib];
        const c = item.points[ic];
        const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-10) continue;
        for (
          let y = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
          y <= Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
          y += 1
        ) {
          for (
            let x = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
            x <= Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
            x += 1
          ) {
            const u = ((b.y - c.y) * (x + 0.5 - c.x) + (c.x - b.x) * (y + 0.5 - c.y)) / denominator;
            const v = ((c.y - a.y) * (x + 0.5 - c.x) + (a.x - c.x) * (y + 0.5 - c.y)) / denominator;
            const w = 1 - u - v;
            if (u >= -1e-9 && v >= -1e-9 && w >= -1e-9)
              sample(x, y, u * item.depths[ia] + v * item.depths[ib] + w * item.depths[ic]);
          }
        }
      }
    }
    for (const [index, sample] of coverage) {
      blend(data, index, sample.rgb, item.alpha);
      if (write) {
        depthBuffer[index] = sample.z;
        owners[index] = item.rank;
      }
      if (outline && item.alpha === 1 && item.depthWrite !== false) {
        outlineDepth[index] = sample.z;
        outlineOwners[index] = item.rank;
      }
    }
  }
  for (const item of opaque) paint(item, true);
  // Outlines are checked against the complete opaque surface buffer, including later limbs.
  for (const item of opaque) if (item.stroke) paint(item, false, true);
  // The actor owns its silhouette before compositing with an opaque world. It
  // cannot depend on empty alpha surviving in the merged scene framebuffer.
  const ringWidth = Math.max(0, Math.min(2, Math.round(silhouetteWidth)));
  for (let y = 0; y < height && ringWidth > 0; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = y * width + x;
      const owner = owners[source];
      if (owner < 0 || !ranked[owner].stroke) continue;
      for (let oy = -ringWidth; oy <= ringWidth; oy += 1) {
        for (let ox = -ringWidth; ox <= ringWidth; ox += 1) {
          const px = x + ox;
          const py = y + oy;
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const destination = py * width + px;
          if (owners[destination] >= 0) continue;
          const z = depthBuffer[source];
          if (
            z > outlineDepth[destination] + 1e-7 ||
            (Math.abs(z - outlineDepth[destination]) <= 1e-7 && owner >= outlineOwners[destination])
          ) {
            outlineDepth[destination] = z;
            outlineOwners[destination] = owner;
          }
        }
      }
    }
  }
  for (const item of transparent) {
    paint(item, false);
    if (item.stroke) paint(item, false, true);
  }
  // Preserve the exact opaque contour even under a translucent trail. This
  // does not write body depth and therefore cannot turn a trail into geometry.
  for (let index = 0; index < owners.length; index += 1) {
    if (owners[index] < 0 && outlineOwners[index] >= 0) {
      blend(data, index, color(silhouetteColor ?? ranked[outlineOwners[index]].stroke), 1);
    }
  }
  return { width, height, data, depthBuffer, owners };
}
