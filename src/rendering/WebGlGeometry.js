const GEOMETRY_EPSILON = 1e-10;
const MAX_POLYGON_VERTICES = 8192;

function isArrayLike(value) {
  return Array.isArray(value) || ArrayBuffer.isView(value);
}

function assertFiniteNumber(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
}

function assertPoints(points, minimum = 1) {
  if (!Array.isArray(points) || points.length < minimum || points.length > MAX_POLYGON_VERTICES)
    throw new RangeError(
      `Geometry requires ${minimum}-${MAX_POLYGON_VERTICES} screen-space points.`,
    );
  for (const [index, point] of points.entries()) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y))
      throw new TypeError(`Geometry point ${index} must contain finite x and y values.`);
  }
}

function assertDepths(depths, pointCount) {
  if (!isArrayLike(depths) || depths.length !== pointCount)
    throw new RangeError('Geometry depths must match the point count.');
  for (let index = 0; index < depths.length; index += 1)
    assertFiniteNumber(depths[index], `Geometry depth ${index}`);
}

function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function samePoint(a, b) {
  return Math.abs(a.x - b.x) <= GEOMETRY_EPSILON && Math.abs(a.y - b.y) <= GEOMETRY_EPSILON;
}

function sign(value) {
  if (value > GEOMETRY_EPSILON) return 1;
  if (value < -GEOMETRY_EPSILON) return -1;
  return 0;
}

function pointOnSegment(point, a, b) {
  return (
    sign(cross(a, b, point)) === 0 &&
    point.x >= Math.min(a.x, b.x) - GEOMETRY_EPSILON &&
    point.x <= Math.max(a.x, b.x) + GEOMETRY_EPSILON &&
    point.y >= Math.min(a.y, b.y) - GEOMETRY_EPSILON &&
    point.y <= Math.max(a.y, b.y) + GEOMETRY_EPSILON
  );
}

function segmentsIntersect(a, b, c, d) {
  const abC = sign(cross(a, b, c));
  const abD = sign(cross(a, b, d));
  const cdA = sign(cross(c, d, a));
  const cdB = sign(cross(c, d, b));
  if (abC * abD < 0 && cdA * cdB < 0) return true;
  return (
    (abC === 0 && pointOnSegment(c, a, b)) ||
    (abD === 0 && pointOnSegment(d, a, b)) ||
    (cdA === 0 && pointOnSegment(a, c, d)) ||
    (cdB === 0 && pointOnSegment(b, c, d))
  );
}

function pointInsideTriangle(point, a, b, c, winding) {
  return (
    winding * cross(a, b, point) >= -GEOMETRY_EPSILON &&
    winding * cross(b, c, point) >= -GEOMETRY_EPSILON &&
    winding * cross(c, a, point) >= -GEOMETRY_EPSILON
  );
}

function normalizedPolygonEntries(points) {
  const entries = [];
  for (const [sourceIndex, point] of points.entries()) {
    if (!entries.length || !samePoint(entries.at(-1).point, point))
      entries.push({ point, sourceIndex });
  }
  if (entries.length > 1 && samePoint(entries[0].point, entries.at(-1).point)) entries.pop();
  if (entries.length < 3) throw new RangeError('Polygon must contain three distinct points.');

  for (let edgeA = 0; edgeA < entries.length; edgeA += 1) {
    const nextA = (edgeA + 1) % entries.length;
    for (let edgeB = edgeA + 1; edgeB < entries.length; edgeB += 1) {
      const nextB = (edgeB + 1) % entries.length;
      if (edgeA === edgeB || nextA === edgeB || nextB === edgeA) continue;
      if (
        segmentsIntersect(
          entries[edgeA].point,
          entries[nextA].point,
          entries[edgeB].point,
          entries[nextB].point,
        )
      )
        throw new RangeError('Polygon must be simple and may not self-intersect or self-touch.');
    }
  }

  // Collinear boundary vertices do not affect the filled region. Removing them
  // makes ear clipping deterministic while returned indices still address the
  // original point/depth arrays.
  let changed = true;
  while (changed && entries.length > 3) {
    changed = false;
    for (let index = 0; index < entries.length; index += 1) {
      const previous = entries[(index + entries.length - 1) % entries.length].point;
      const current = entries[index].point;
      const next = entries[(index + 1) % entries.length].point;
      if (Math.abs(cross(previous, current, next)) <= GEOMETRY_EPSILON) {
        entries.splice(index, 1);
        changed = true;
        break;
      }
    }
  }
  return entries;
}

/**
 * Ear-clips a finite, simple 2D polygon of either winding.
 *
 * The returned Uint32Array contains source-point indices in triangle order.
 * A repeated closing point and redundant collinear points are accepted, but
 * self-intersections, self-touching boundaries and zero-area polygons are not.
 */
export function triangulatePolygon(points) {
  assertPoints(points, 3);
  const entries = normalizedPolygonEntries(points);
  const twiceArea = entries.reduce(
    (area, entry, index) =>
      area +
      entry.point.x * entries[(index + 1) % entries.length].point.y -
      entry.point.y * entries[(index + 1) % entries.length].point.x,
    0,
  );
  const winding = sign(twiceArea);
  if (winding === 0) throw new RangeError('Polygon must have finite non-zero area.');

  const active = entries.map((_, index) => index);
  const triangles = [];
  let attemptsRemaining = active.length * active.length;
  while (active.length > 3 && attemptsRemaining > 0) {
    let earFound = false;
    for (let cursor = 0; cursor < active.length; cursor += 1) {
      const previous = active[(cursor + active.length - 1) % active.length];
      const current = active[cursor];
      const next = active[(cursor + 1) % active.length];
      const a = entries[previous].point;
      const b = entries[current].point;
      const c = entries[next].point;
      if (winding * cross(a, b, c) <= GEOMETRY_EPSILON) continue;
      const containsVertex = active.some(
        (candidate) =>
          candidate !== previous &&
          candidate !== current &&
          candidate !== next &&
          pointInsideTriangle(entries[candidate].point, a, b, c, winding),
      );
      if (containsVertex) continue;
      triangles.push(
        entries[previous].sourceIndex,
        entries[current].sourceIndex,
        entries[next].sourceIndex,
      );
      active.splice(cursor, 1);
      earFound = true;
      break;
    }
    if (!earFound) break;
    attemptsRemaining -= 1;
  }
  if (active.length !== 3)
    throw new RangeError('Polygon could not be triangulated as a finite simple polygon.');
  triangles.push(...active.map((index) => entries[index].sourceIndex));
  return Uint32Array.from(triangles);
}

/**
 * Validates nested or flat triangle indices. When triangles are omitted the
 * polygon is ear-clipped. The result always uses flat Uint32 GPU indices.
 */
export function flattenTriangleIndices(points, triangles = null) {
  assertPoints(points, 3);
  if (triangles === null || triangles === undefined) return triangulatePolygon(points);
  if (!isArrayLike(triangles)) throw new TypeError('Triangles must be an array or typed array.');

  const nested = Array.isArray(triangles) && triangles.some((triangle) => isArrayLike(triangle));
  const flat = nested
    ? triangles.flatMap((triangle) => Array.from(triangle))
    : Array.from(triangles);
  if (flat.length === 0 || flat.length % 3 !== 0)
    throw new RangeError('Triangle indices must contain complete index triplets.');
  if (nested && triangles.some((triangle) => !isArrayLike(triangle) || triangle.length !== 3))
    throw new RangeError('Each triangle must contain exactly three indices.');
  for (let index = 0; index < flat.length; index += 3) {
    const triangle = flat.slice(index, index + 3);
    if (
      triangle.some(
        (vertexIndex) =>
          !Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= points.length,
      ) ||
      new Set(triangle).size !== 3
    )
      throw new RangeError('Triangle contains a duplicate or out-of-range vertex index.');
  }
  return Uint32Array.from(flat);
}

/**
 * Produces a de-indexed triangle vertex stream for gl.drawArrays(TRIANGLES).
 * positions is interleaved x/y; depths has one value per emitted vertex; and
 * sourceIndices preserves the validated topology for caching/diagnostics.
 */
export function flattenSurfaceTriangles(points, depths, triangles = null) {
  assertPoints(points, 3);
  assertDepths(depths, points.length);
  const sourceIndices = flattenTriangleIndices(points, triangles);
  const positions = new Float32Array(sourceIndices.length * 2);
  const flatDepths = new Float32Array(sourceIndices.length);
  for (let index = 0; index < sourceIndices.length; index += 1) {
    const sourceIndex = sourceIndices[index];
    positions[index * 2] = points[sourceIndex].x;
    positions[index * 2 + 1] = points[sourceIndex].y;
    flatDepths[index] = depths[sourceIndex];
  }
  return { positions, depths: flatDepths, sourceIndices, vertexCount: sourceIndices.length };
}

function validateOutlineIndices(points, outlineIndices, minimum) {
  const indices = outlineIndices ?? points.map((_, index) => index);
  if (!isArrayLike(indices) || indices.length < minimum)
    throw new RangeError(`Stroke path requires at least ${minimum} point indices.`);
  const result = Array.from(indices);
  for (const index of result)
    if (!Number.isInteger(index) || index < 0 || index >= points.length)
      throw new RangeError('Stroke path contains an out-of-range point index.');
  return result;
}

function normalizedDirection(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length <= GEOMETRY_EPSILON)
    throw new RangeError('Stroke path may not contain zero-length edges.');
  return { x: dx / length, y: dy / length };
}

/**
 * Builds a centered triangle stroke without relying on native WebGL lines.
 *
 * points are expected in backing-pixel coordinates. width is expressed in
 * screen/CSS pixels and is multiplied by pixelRatio (pass 1 when width is
 * already a backing-pixel value). Closed paths use bounded miter joins so
 * adjacent edge quads cannot expose cracks at ordinary polygon corners.
 */
export function createStrokeGeometry(
  points,
  depths,
  {
    width = 1,
    pixelRatio = 1,
    outlineIndices = null,
    closed = true,
    miterLimit = 4,
    target = null,
  } = {},
) {
  assertPoints(points, 2);
  assertDepths(depths, points.length);
  for (const [value, label] of [
    [width, 'Stroke width'],
    [pixelRatio, 'Stroke pixel ratio'],
    [miterLimit, 'Stroke miter limit'],
  ])
    assertFiniteNumber(value, label);
  if (width <= 0 || pixelRatio <= 0 || miterLimit < 1)
    throw new RangeError(
      'Stroke width and pixel ratio must be positive; miter limit must be >= 1.',
    );

  const path = validateOutlineIndices(points, outlineIndices, closed ? 3 : 2);
  if (closed && path.length > 3 && path[0] === path.at(-1)) path.pop();
  const segmentCount = closed ? path.length : path.length - 1;
  const directions = Array.from({ length: segmentCount }, (_, index) => {
    const next = (index + 1) % path.length;
    return normalizedDirection(points[path[index]], points[path[next]]);
  });
  const halfWidth = (width * pixelRatio) / 2;
  const positionLength = path.length * 4;
  const depthLength = path.length * 2;
  const positions =
    target?.positions?.length === positionLength
      ? target.positions
      : new Float32Array(positionLength);
  const strokeDepths =
    target?.depths?.length === depthLength ? target.depths : new Float32Array(depthLength);

  for (let index = 0; index < path.length; index += 1) {
    const currentDirection =
      directions[Math.min(index, directions.length - 1)] ?? directions[directions.length - 1];
    const previousDirection =
      directions[index > 0 ? index - 1 : closed ? directions.length - 1 : 0];
    const currentNormal = { x: -currentDirection.y, y: currentDirection.x };
    const previousNormal = { x: -previousDirection.y, y: previousDirection.x };
    let offsetX;
    let offsetY;
    if (!closed && (index === 0 || index === path.length - 1)) {
      const normal = index === 0 ? currentNormal : previousNormal;
      offsetX = normal.x * halfWidth;
      offsetY = normal.y * halfWidth;
    } else {
      const sumX = previousNormal.x + currentNormal.x;
      const sumY = previousNormal.y + currentNormal.y;
      const sumLength = Math.hypot(sumX, sumY);
      if (sumLength <= GEOMETRY_EPSILON) {
        offsetX = currentNormal.x * halfWidth;
        offsetY = currentNormal.y * halfWidth;
      } else {
        const miterX = sumX / sumLength;
        const miterY = sumY / sumLength;
        const denominator = miterX * currentNormal.x + miterY * currentNormal.y;
        let extent =
          Math.abs(denominator) <= GEOMETRY_EPSILON ? halfWidth : halfWidth / denominator;
        const maximumExtent = halfWidth * miterLimit;
        extent = Math.max(-maximumExtent, Math.min(maximumExtent, extent));
        offsetX = miterX * extent;
        offsetY = miterY * extent;
      }
    }
    const point = points[path[index]];
    const vertex = index * 2;
    positions[vertex * 2] = point.x + offsetX;
    positions[vertex * 2 + 1] = point.y + offsetY;
    positions[(vertex + 1) * 2] = point.x - offsetX;
    positions[(vertex + 1) * 2 + 1] = point.y - offsetY;
    strokeDepths[vertex] = depths[path[index]];
    strokeDepths[vertex + 1] = depths[path[index]];
  }

  const triangleLength = segmentCount * 6;
  const triangles =
    target?.triangles?.length === triangleLength
      ? target.triangles
      : new Uint32Array(triangleLength);
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const current = segment * 2;
    const next = ((segment + 1) % path.length) * 2;
    triangles.set([current, current + 1, next, current + 1, next + 1, next], segment * 6);
  }
  return {
    positions,
    depths: strokeDepths,
    triangles,
    vertexCount: strokeDepths.length,
    indexCount: triangles.length,
    widthInBackingPixels: width * pixelRatio,
  };
}

/** Creates a convex polygon surface suitable for circular vertex markers. */
export function createCirclePolygon(
  center,
  radius,
  { segments = 12, depth = 0, startAngle = -Math.PI / 2 } = {},
) {
  if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y))
    throw new TypeError('Circle center must contain finite x and y values.');
  for (const [value, label] of [
    [radius, 'Circle radius'],
    [depth, 'Circle depth'],
    [startAngle, 'Circle start angle'],
  ])
    assertFiniteNumber(value, label);
  if (radius <= 0) throw new RangeError('Circle radius must be positive.');
  if (!Number.isInteger(segments) || segments < 3 || segments > 128)
    throw new RangeError('Circle segments must be an integer from 3 through 128.');
  const points = Array.from({ length: segments }, (_, index) => {
    const angle = startAngle + (index / segments) * Math.PI * 2;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  });
  const depths = new Float32Array(segments).fill(depth);
  const triangles = new Uint32Array((segments - 2) * 3);
  for (let index = 0; index < segments - 2; index += 1)
    triangles.set([0, index + 1, index + 2], index * 3);
  return {
    points,
    depths,
    triangles,
    outlineIndices: Uint32Array.from(points, (_, index) => index),
  };
}

function nextCapacity(current, required) {
  let capacity = Math.max(4, current);
  while (capacity < required) capacity *= 2;
  return capacity;
}

/**
 * Creates reusable growable typed buffers for pass/group batching. finalize()
 * returns views without copying by default; call reset() after the upload.
 */
export function createTypedGeometryBuilder({ vertexCapacity = 256, indexCapacity = 384 } = {}) {
  if (
    !Number.isInteger(vertexCapacity) ||
    vertexCapacity < 1 ||
    !Number.isInteger(indexCapacity) ||
    indexCapacity < 3
  )
    throw new RangeError('Geometry builder capacities must be positive integers.');
  let positions = new Float32Array(vertexCapacity * 2);
  let depths = new Float32Array(vertexCapacity);
  let indices = new Uint32Array(indexCapacity);
  let vertexCount = 0;
  let indexCount = 0;

  const ensureVertices = (required) => {
    if (required <= depths.length) return;
    const capacity = nextCapacity(depths.length, required);
    const grownPositions = new Float32Array(capacity * 2);
    const grownDepths = new Float32Array(capacity);
    grownPositions.set(positions.subarray(0, vertexCount * 2));
    grownDepths.set(depths.subarray(0, vertexCount));
    positions = grownPositions;
    depths = grownDepths;
  };
  const ensureIndices = (required) => {
    if (required <= indices.length) return;
    const grown = new Uint32Array(nextCapacity(indices.length, required));
    grown.set(indices.subarray(0, indexCount));
    indices = grown;
  };

  return {
    reset() {
      vertexCount = 0;
      indexCount = 0;
      return this;
    },
    addVertex(x, y, depth) {
      assertFiniteNumber(x, 'Vertex x');
      assertFiniteNumber(y, 'Vertex y');
      assertFiniteNumber(depth, 'Vertex depth');
      ensureVertices(vertexCount + 1);
      positions[vertexCount * 2] = x;
      positions[vertexCount * 2 + 1] = y;
      depths[vertexCount] = depth;
      vertexCount += 1;
      return vertexCount - 1;
    },
    addTriangle(a, b, c) {
      if (
        ![a, b, c].every((index) => Number.isInteger(index) && index >= 0 && index < vertexCount) ||
        new Set([a, b, c]).size !== 3
      )
        throw new RangeError('Builder triangle indices must reference three distinct vertices.');
      ensureIndices(indexCount + 3);
      indices.set([a, b, c], indexCount);
      indexCount += 3;
      return this;
    },
    append(geometry) {
      if (
        !geometry ||
        !isArrayLike(geometry.positions) ||
        geometry.positions.length % 2 !== 0 ||
        !isArrayLike(geometry.depths) ||
        geometry.depths.length * 2 !== geometry.positions.length ||
        !isArrayLike(geometry.triangles)
      )
        throw new TypeError('Appended geometry requires positions, depths and triangles.');
      const base = vertexCount;
      const appendedVertices = geometry.depths.length;
      ensureVertices(vertexCount + appendedVertices);
      ensureIndices(indexCount + geometry.triangles.length);
      for (let index = 0; index < geometry.positions.length; index += 1)
        assertFiniteNumber(geometry.positions[index], `Appended position ${index}`);
      for (let index = 0; index < geometry.depths.length; index += 1)
        assertFiniteNumber(geometry.depths[index], `Appended depth ${index}`);
      positions.set(geometry.positions, vertexCount * 2);
      depths.set(geometry.depths, vertexCount);
      for (let index = 0; index < geometry.triangles.length; index += 1) {
        const sourceIndex = geometry.triangles[index];
        if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= appendedVertices)
          throw new RangeError('Appended geometry contains an out-of-range triangle index.');
        indices[indexCount + index] = base + sourceIndex;
      }
      vertexCount += appendedVertices;
      indexCount += geometry.triangles.length;
      return this;
    },
    finalize({ copy = false } = {}) {
      const result = {
        positions: positions.subarray(0, vertexCount * 2),
        depths: depths.subarray(0, vertexCount),
        triangles: indices.subarray(0, indexCount),
        vertexCount,
        indexCount,
      };
      if (!copy) return result;
      return {
        positions: result.positions.slice(),
        depths: result.depths.slice(),
        triangles: result.triangles.slice(),
        vertexCount,
        indexCount,
      };
    },
  };
}
