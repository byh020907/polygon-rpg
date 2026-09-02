const DEFAULT_SATURATION_RETENTION = 0.12;
const DEFAULT_POINT_FALLOFF = 2;
const GEOMETRY_EPSILON = 1e-9;

export const MATERIAL_LIGHTING_PROFILES = Object.freeze({
  metal: Object.freeze({
    diffuse: 0.58,
    normalPower: 1,
    specular: 0.64,
    highlightPower: 10,
    roughness: 0.03,
    variationSeed: 11,
  }),
  cloth: Object.freeze({
    diffuse: 0.78,
    normalPower: 0.72,
    specular: 0.06,
    highlightPower: 3,
    roughness: 0.02,
    variationSeed: 23,
  }),
  soil: Object.freeze({
    diffuse: 0.66,
    normalPower: 1.05,
    specular: 0.02,
    highlightPower: 2,
    roughness: 0.22,
    variationSeed: 37,
  }),
  stone: Object.freeze({
    diffuse: 0.62,
    normalPower: 0.95,
    specular: 0.16,
    highlightPower: 5,
    roughness: 0.28,
    variationSeed: 53,
  }),
});

function assertFiniteNumber(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be a finite number.`);
  return value;
}

function assertUnitInterval(value, label) {
  assertFiniteNumber(value, label);
  if (value < 0 || value > 1) throw new RangeError(`${label} must be between 0 and 1.`);
  return value;
}

function assertPoint(value, label) {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(`${label} must be a point object.`);
  }
  assertFiniteNumber(value.x, `${label}.x`);
  assertFiniteNumber(value.y, `${label}.y`);
  return value;
}

function normalizeVector(value, label) {
  assertPoint(value, label);
  const length = Math.hypot(value.x, value.y);
  if (length <= GEOMETRY_EPSILON) throw new RangeError(`${label} must not be a zero vector.`);
  return Object.freeze({ x: value.x / length, y: value.y / length });
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, value));
}

function parseHexColor(hexColor) {
  if (typeof hexColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(hexColor)) {
    throw new TypeError('hexColor must be a six-digit hexadecimal color such as #7f8790.');
  }
  return Object.freeze({
    red: Number.parseInt(hexColor.slice(1, 3), 16) / 255,
    green: Number.parseInt(hexColor.slice(3, 5), 16) / 255,
    blue: Number.parseInt(hexColor.slice(5, 7), 16) / 255,
  });
}

function rgbToHsl({ red, green, blue }) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;
  const delta = maximum - minimum;
  if (delta === 0) return { hue: 0, saturation: 0, lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (maximum === red) hue = ((green - blue) / delta) % 6;
  else if (maximum === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { hue: ((hue * 60 + 360) % 360) / 360, saturation, lightness };
}

function hueToRgb(first, second, rawHue) {
  const hue = (rawHue + 1) % 1;
  if (hue < 1 / 6) return first + (second - first) * 6 * hue;
  if (hue < 1 / 2) return second;
  if (hue < 2 / 3) return first + (second - first) * (2 / 3 - hue) * 6;
  return first;
}

function hslToRgb({ hue, saturation, lightness }) {
  if (saturation === 0) return { red: lightness, green: lightness, blue: lightness };
  const second =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const first = 2 * lightness - second;
  return {
    red: hueToRgb(first, second, hue + 1 / 3),
    green: hueToRgb(first, second, hue),
    blue: hueToRgb(first, second, hue - 1 / 3),
  };
}

function toHexChannel(value) {
  return Math.round(clampUnit(value) * 255)
    .toString(16)
    .padStart(2, '0');
}

function formatHexColor({ red, green, blue }) {
  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
}

export function toMutedHexColor(hexColor, saturationRetention = DEFAULT_SATURATION_RETENTION) {
  assertUnitInterval(saturationRetention, 'saturationRetention');
  const hsl = rgbToHsl(parseHexColor(hexColor));
  return formatHexColor(hslToRgb({ ...hsl, saturation: hsl.saturation * saturationRetention }));
}

export function quantizeLuminance(luminance, levels = 4) {
  assertUnitInterval(luminance, 'luminance');
  if (levels !== 3 && levels !== 4) {
    throw new RangeError('levels must be either 3 or 4 for cell lighting.');
  }
  return Math.round(luminance * (levels - 1)) / (levels - 1);
}

function assertOccluders(occluders) {
  if (!Array.isArray(occluders)) throw new TypeError('occluders must be an array.');
  for (const [occluderIndex, occluder] of occluders.entries()) {
    if (occluder === null || typeof occluder !== 'object' || !Array.isArray(occluder.points)) {
      throw new TypeError(`occluders[${occluderIndex}] must contain a points array.`);
    }
    if (occluder.points.length < 3) {
      throw new RangeError(`occluders[${occluderIndex}].points must contain at least 3 points.`);
    }
    for (const [pointIndex, point] of occluder.points.entries()) {
      assertPoint(point, `occluders[${occluderIndex}].points[${pointIndex}]`);
    }
  }
}

function cross(left, right) {
  return left.x * right.y - left.y * right.x;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function segmentIntersectsPolygon(start, end, polygon) {
  if (pointInPolygon(start, polygon) || pointInPolygon(end, polygon)) return true;
  const segmentDelta = { x: end.x - start.x, y: end.y - start.y };
  for (let index = 0; index < polygon.length; index += 1) {
    const edgeStart = polygon[index];
    const edgeEnd = polygon[(index + 1) % polygon.length];
    const edgeDelta = { x: edgeEnd.x - edgeStart.x, y: edgeEnd.y - edgeStart.y };
    const offset = { x: edgeStart.x - start.x, y: edgeStart.y - start.y };
    const denominator = cross(segmentDelta, edgeDelta);
    if (Math.abs(denominator) <= GEOMETRY_EPSILON) {
      if (Math.abs(cross(offset, segmentDelta)) > GEOMETRY_EPSILON) continue;
      const segmentLengthSquared =
        segmentDelta.x * segmentDelta.x + segmentDelta.y * segmentDelta.y;
      const firstAmount =
        (offset.x * segmentDelta.x + offset.y * segmentDelta.y) / segmentLengthSquared;
      const secondOffset = { x: edgeEnd.x - start.x, y: edgeEnd.y - start.y };
      const secondAmount =
        (secondOffset.x * segmentDelta.x + secondOffset.y * segmentDelta.y) / segmentLengthSquared;
      if (
        Math.max(Math.min(firstAmount, secondAmount), 0) <=
        Math.min(Math.max(firstAmount, secondAmount), 1)
      ) {
        return true;
      }
      continue;
    }
    const segmentAmount = cross(offset, edgeDelta) / denominator;
    const edgeAmount = cross(offset, segmentDelta) / denominator;
    if (segmentAmount >= 0 && segmentAmount <= 1 && edgeAmount >= 0 && edgeAmount <= 1) {
      return true;
    }
  }
  return false;
}

export function isPointLightOccluded(surfacePosition, lightPosition, occluders = []) {
  assertPoint(surfacePosition, 'surfacePosition');
  assertPoint(lightPosition, 'lightPosition');
  assertOccluders(occluders);
  if (
    Math.hypot(lightPosition.x - surfacePosition.x, lightPosition.y - surfacePosition.y) <=
    GEOMETRY_EPSILON
  ) {
    return false;
  }
  return occluders.some((occluder) =>
    segmentIntersectsPolygon(surfacePosition, lightPosition, occluder.points),
  );
}

function deterministicSurfaceVariation(position, seed) {
  const raw = Math.sin((position.x + seed) * 12.9898 + (position.y - seed) * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

export function sampleMaterialLightResponse(material, normalDot, position = { x: 0, y: 0 }) {
  const profile = MATERIAL_LIGHTING_PROFILES[material];
  if (!profile) throw new RangeError(`Unsupported lighting material: ${material}.`);
  assertUnitInterval(normalDot, 'normalDot');
  assertPoint(position, 'position');
  const variation =
    1 +
    (deterministicSurfaceVariation(position, profile.variationSeed) * 2 - 1) * profile.roughness;
  const diffuse = profile.diffuse * normalDot ** profile.normalPower;
  const highlight = profile.specular * normalDot ** profile.highlightPower;
  return Math.max(0, (diffuse + highlight) * variation);
}

export function sampleTransientLightIntensity({
  intensity,
  progress,
  lifetimeSeconds,
  elapsedSeconds,
  decayPower = 2,
}) {
  assertFiniteNumber(intensity, 'intensity');
  if (intensity < 0) throw new RangeError('intensity must not be negative.');
  assertFiniteNumber(decayPower, 'decayPower');
  if (decayPower <= 0) throw new RangeError('decayPower must be greater than 0.');

  let sampledProgress;
  if (progress !== undefined) {
    if (lifetimeSeconds !== undefined || elapsedSeconds !== undefined) {
      throw new TypeError('Use either progress or lifetimeSeconds/elapsedSeconds, not both.');
    }
    sampledProgress = assertUnitInterval(progress, 'progress');
  } else {
    assertFiniteNumber(lifetimeSeconds, 'lifetimeSeconds');
    assertFiniteNumber(elapsedSeconds, 'elapsedSeconds');
    if (lifetimeSeconds <= 0) {
      throw new RangeError('lifetimeSeconds must be greater than 0.');
    }
    if (elapsedSeconds < 0) throw new RangeError('elapsedSeconds must not be negative.');
    sampledProgress = clampUnit(elapsedSeconds / lifetimeSeconds);
  }

  const active = sampledProgress < 1 && intensity > 0;
  return Object.freeze({
    active,
    progress: sampledProgress,
    intensity: active ? intensity * (1 - sampledProgress) ** decayPower : 0,
  });
}

function validateLight(light) {
  if (light === null || typeof light !== 'object') throw new TypeError('light must be an object.');
  if (light.kind !== 'directional' && light.kind !== 'point') {
    throw new RangeError(`Unsupported light kind: ${light.kind}.`);
  }
  assertFiniteNumber(light.intensity, 'light.intensity');
  if (light.intensity < 0) throw new RangeError('light.intensity must not be negative.');
  if (light.kind === 'directional') normalizeVector(light.direction, 'light.direction');
  if (light.kind === 'point') {
    assertPoint(light.position, 'light.position');
    assertFiniteNumber(light.range, 'light.range');
    if (light.range <= 0) throw new RangeError('light.range must be greater than 0.');
    if (light.falloff !== undefined) {
      assertFiniteNumber(light.falloff, 'light.falloff');
      if (light.falloff <= 0) throw new RangeError('light.falloff must be greater than 0.');
    }
  }
}

function resolveLightIntensity(light) {
  if (!light.transient) return light.intensity;
  const timing =
    light.progress === undefined
      ? {
          lifetimeSeconds: light.lifetimeSeconds,
          elapsedSeconds: light.elapsedSeconds,
        }
      : { progress: light.progress };
  return sampleTransientLightIntensity({
    intensity: light.intensity,
    ...timing,
    decayPower: light.decayPower ?? 2,
  }).intensity;
}

export function computeLightContribution({
  surfacePosition,
  surfaceNormal,
  light,
  occluders = [],
}) {
  assertPoint(surfacePosition, 'surfacePosition');
  const normal = normalizeVector(surfaceNormal, 'surfaceNormal');
  validateLight(light);
  assertOccluders(occluders);
  const intensity = resolveLightIntensity(light);

  if (light.kind === 'directional') {
    const travelDirection = normalizeVector(light.direction, 'light.direction');
    const normalDot = Math.max(0, normal.x * -travelDirection.x + normal.y * -travelDirection.y);
    return Object.freeze({
      lightId: light.id ?? null,
      kind: light.kind,
      normalDot,
      distance: Infinity,
      attenuation: 1,
      occluded: false,
      intensity,
      value: intensity * normalDot,
    });
  }

  const delta = {
    x: light.position.x - surfacePosition.x,
    y: light.position.y - surfacePosition.y,
  };
  const distance = Math.hypot(delta.x, delta.y);
  const normalDot =
    distance <= GEOMETRY_EPSILON
      ? 1
      : Math.max(0, (normal.x * delta.x + normal.y * delta.y) / distance);
  const falloff = light.falloff ?? DEFAULT_POINT_FALLOFF;
  const attenuation = distance >= light.range ? 0 : (1 - distance / light.range) ** falloff;
  const occluded =
    attenuation > 0 && isPointLightOccluded(surfacePosition, light.position, occluders);
  return Object.freeze({
    lightId: light.id ?? null,
    kind: light.kind,
    normalDot,
    distance,
    attenuation,
    occluded,
    intensity,
    value: occluded ? 0 : intensity * normalDot * attenuation,
  });
}

function shadeMutedColor(hexColor, luminance) {
  const color = parseHexColor(hexColor);
  const multiplier = 0.28 + luminance * 0.72;
  return formatHexColor({
    red: color.red * multiplier,
    green: color.green * multiplier,
    blue: color.blue * multiplier,
  });
}

export function createCellLightingSample({
  baseColor,
  position,
  normal,
  material,
  ambientIntensity = 0.2,
  lights = [],
  occluders = [],
  quantizationLevels = 4,
  saturationRetention = DEFAULT_SATURATION_RETENTION,
}) {
  parseHexColor(baseColor);
  assertPoint(position, 'position');
  normalizeVector(normal, 'normal');
  if (!MATERIAL_LIGHTING_PROFILES[material]) {
    throw new RangeError(`Unsupported lighting material: ${material}.`);
  }
  assertUnitInterval(ambientIntensity, 'ambientIntensity');
  if (!Array.isArray(lights)) throw new TypeError('lights must be an array.');
  assertOccluders(occluders);
  quantizeLuminance(0, quantizationLevels);
  assertUnitInterval(saturationRetention, 'saturationRetention');

  const contributions = lights.map((light) => {
    const contribution = computeLightContribution({
      surfacePosition: position,
      surfaceNormal: normal,
      light,
      occluders,
    });
    const materialResponse = sampleMaterialLightResponse(
      material,
      contribution.normalDot,
      position,
    );
    const materialValue = contribution.occluded
      ? 0
      : contribution.intensity * contribution.attenuation * materialResponse;
    return Object.freeze({
      ...contribution,
      materialResponse,
      materialValue,
    });
  });
  const rawLuminance = clampUnit(
    ambientIntensity +
      contributions.reduce((total, contribution) => total + contribution.materialValue, 0),
  );
  const quantizedLuminance = quantizeLuminance(rawLuminance, quantizationLevels);
  const mutedColor = toMutedHexColor(baseColor, saturationRetention);
  return Object.freeze({
    material,
    mutedColor,
    shadedColor: shadeMutedColor(mutedColor, quantizedLuminance),
    rawLuminance,
    quantizedLuminance,
    level: Math.round(quantizedLuminance * (quantizationLevels - 1)),
    contributions: Object.freeze(contributions),
  });
}
