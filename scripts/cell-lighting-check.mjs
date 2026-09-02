import assert from 'node:assert/strict';
import {
  MATERIAL_LIGHTING_PROFILES,
  computeLightContribution,
  createCellLightingSample,
  isPointLightOccluded,
  quantizeLuminance,
  sampleMaterialLightResponse,
  sampleTransientLightIntensity,
  toMutedHexColor,
} from '../src/rendering/CellLighting.js';

const closeTo = (actual, expected, epsilon = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}.`,
  );
};

const freezeRecord = (value) => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) freezeRecord(entry);
  return Object.freeze(value);
};

const readHslSaturation = (hexColor) => {
  const channels = [1, 3, 5].map(
    (start) => Number.parseInt(hexColor.slice(start, start + 2), 16) / 255,
  );
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const lightness = (maximum + minimum) / 2;
  return maximum === minimum ? 0 : (maximum - minimum) / (1 - Math.abs(2 * lightness - 1));
};

const vividRed = '#ff0000';
const mutedRed = toMutedHexColor(vividRed, 0.12);
assert.equal(mutedRed, '#8f7070');
closeTo(readHslSaturation(mutedRed), 0.12, 0.005);
assert.equal(toMutedHexColor('#8899aa', 0.1), '#97999b');
assert.equal(toMutedHexColor('#8899aa', 0.15), '#96999c');

const directionalFacing = computeLightContribution({
  surfacePosition: { x: 0, y: 0 },
  surfaceNormal: { x: 0, y: -2 },
  light: {
    id: 'sun-facing',
    kind: 'directional',
    direction: { x: 0, y: 4 },
    intensity: 0.8,
  },
});
closeTo(directionalFacing.normalDot, 1);
closeTo(directionalFacing.value, 0.8);

const directionalEdge = computeLightContribution({
  surfacePosition: { x: 0, y: 0 },
  surfaceNormal: { x: 0, y: -1 },
  light: {
    id: 'sun-edge',
    kind: 'directional',
    direction: { x: 1, y: 0 },
    intensity: 0.8,
  },
});
closeTo(directionalEdge.normalDot, 0);
closeTo(directionalEdge.value, 0);

const pointLight = freezeRecord({
  id: 'work-lamp',
  kind: 'point',
  position: { x: 5, y: 0 },
  intensity: 2,
  range: 10,
  falloff: 2,
});
const pointFacing = computeLightContribution({
  surfacePosition: { x: 0, y: 0 },
  surfaceNormal: { x: 1, y: 0 },
  light: pointLight,
});
closeTo(pointFacing.normalDot, 1);
closeTo(pointFacing.distance, 5);
closeTo(pointFacing.attenuation, 0.25);
closeTo(pointFacing.value, 0.5);
const pointAway = computeLightContribution({
  surfacePosition: { x: 0, y: 0 },
  surfaceNormal: { x: -1, y: 0 },
  light: pointLight,
});
closeTo(pointAway.normalDot, 0);
closeTo(pointAway.value, 0);
const pointOutOfRange = computeLightContribution({
  surfacePosition: { x: -6, y: 0 },
  surfaceNormal: { x: 1, y: 0 },
  light: pointLight,
});
closeTo(pointOutOfRange.attenuation, 0);
closeTo(pointOutOfRange.value, 0);

const blockingOccluder = freezeRecord({
  id: 'steel-wall',
  points: [
    { x: 2, y: -1 },
    { x: 3, y: -1 },
    { x: 3, y: 1 },
    { x: 2, y: 1 },
  ],
});
const clearOccluder = freezeRecord({
  id: 'overhead-plate',
  points: [
    { x: 2, y: -4 },
    { x: 3, y: -4 },
    { x: 3, y: -2 },
    { x: 2, y: -2 },
  ],
});
assert.equal(isPointLightOccluded({ x: 0, y: 0 }, pointLight.position, [blockingOccluder]), true);
assert.equal(isPointLightOccluded({ x: 0, y: 0 }, pointLight.position, [clearOccluder]), false);
const shadowedPoint = computeLightContribution({
  surfacePosition: { x: 0, y: 0 },
  surfaceNormal: { x: 1, y: 0 },
  light: pointLight,
  occluders: [blockingOccluder],
});
assert.equal(shadowedPoint.occluded, true);
closeTo(shadowedPoint.value, 0);

assert.ok(Object.isFrozen(MATERIAL_LIGHTING_PROFILES));
const materialPosition = freezeRecord({ x: 23, y: 47 });
const materialResponses = ['metal', 'cloth', 'soil', 'stone'].map((material) =>
  sampleMaterialLightResponse(material, 0.82, materialPosition),
);
assert.equal(new Set(materialResponses.map((value) => value.toFixed(8))).size, 4);
assert.ok(materialResponses.every((value) => value > 0));
assert.ok(
  sampleMaterialLightResponse('metal', 1, materialPosition) >
    sampleMaterialLightResponse('cloth', 1, materialPosition),
  'Metal must produce the sharpest face-on highlight.',
);
assert.notEqual(
  sampleMaterialLightResponse('soil', 0.7, { x: 23, y: 47 }),
  sampleMaterialLightResponse('soil', 0.7, { x: 24, y: 47 }),
  'Soil response must retain deterministic face variation.',
);
assert.notEqual(
  sampleMaterialLightResponse('stone', 0.7, { x: 23, y: 47 }),
  sampleMaterialLightResponse('stone', 0.7, { x: 23, y: 48 }),
  'Stone response must retain deterministic face variation.',
);

assert.deepEqual(
  [0, 0.18, 0.36, 0.51, 0.7, 1].map((value) => quantizeLuminance(value, 4)),
  [0, 1 / 3, 1 / 3, 2 / 3, 2 / 3, 1],
);
assert.deepEqual(
  [0, 0.2, 0.51, 0.8, 1].map((value) => quantizeLuminance(value, 3)),
  [0, 0, 0.5, 1, 1],
);

const transientPeak = sampleTransientLightIntensity({ intensity: 1.6, progress: 0 });
const transientHalf = sampleTransientLightIntensity({ intensity: 1.6, progress: 0.5 });
const transientExpired = sampleTransientLightIntensity({ intensity: 1.6, progress: 1 });
closeTo(transientPeak.intensity, 1.6);
closeTo(transientHalf.intensity, 0.4);
closeTo(transientExpired.intensity, 0);
assert.equal(transientPeak.active, true);
assert.equal(transientExpired.active, false);
const transientByLifetime = sampleTransientLightIntensity({
  intensity: 1.6,
  lifetimeSeconds: 0.2,
  elapsedSeconds: 0.1,
});
closeTo(transientByLifetime.progress, 0.5);
closeTo(transientByLifetime.intensity, transientHalf.intensity);

const immutableInput = freezeRecord({
  baseColor: '#be7846',
  position: { x: 23, y: 47 },
  normal: { x: 1, y: 0 },
  material: 'metal',
  ambientIntensity: 0.16,
  lights: [
    pointLight,
    {
      id: 'attack-contact',
      kind: 'point',
      position: { x: 4, y: 1 },
      intensity: 1.2,
      range: 12,
      falloff: 1.5,
      transient: true,
      progress: 0.25,
    },
  ],
  occluders: [clearOccluder],
  quantizationLevels: 4,
  saturationRetention: 0.12,
});
const beforeSample = JSON.stringify(immutableInput);
const sample = createCellLightingSample(immutableInput);
assert.equal(JSON.stringify(immutableInput), beforeSample);
assert.ok(Object.isFrozen(sample));
assert.ok(Object.isFrozen(sample.contributions));
assert.ok(sample.contributions.every(Object.isFrozen));
assert.match(sample.mutedColor, /^#[0-9a-f]{6}$/);
assert.match(sample.shadedColor, /^#[0-9a-f]{6}$/);
assert.ok([0, 1 / 3, 2 / 3, 1].includes(sample.quantizedLuminance));
assert.equal(sample.level, Math.round(sample.quantizedLuminance * 3));

assert.throws(() => toMutedHexColor('red'), /six-digit hexadecimal/);
assert.throws(() => toMutedHexColor('#ff0000', 1.1), /between 0 and 1/);
assert.throws(() => quantizeLuminance(0.5, 5), /either 3 or 4/);
assert.throws(
  () =>
    computeLightContribution({
      surfacePosition: { x: 0, y: 0 },
      surfaceNormal: { x: 0, y: 0 },
      light: pointLight,
    }),
  /zero vector/,
);
assert.throws(
  () =>
    computeLightContribution({
      surfacePosition: { x: 0, y: 0 },
      surfaceNormal: { x: 1, y: 0 },
      light: { kind: 'point', position: { x: 1, y: 0 }, intensity: 1, range: 0 },
    }),
  /greater than 0/,
);
assert.throws(() => sampleMaterialLightResponse('glass', 0.5), /Unsupported lighting material/);
assert.throws(
  () => isPointLightOccluded({ x: 0, y: 0 }, { x: 1, y: 0 }, [{ points: [] }]),
  /at least 3 points/,
);
assert.throws(
  () => sampleTransientLightIntensity({ intensity: 1, progress: 1.5 }),
  /between 0 and 1/,
);
assert.throws(
  () =>
    sampleTransientLightIntensity({
      intensity: 1,
      progress: 0.5,
      lifetimeSeconds: 1,
      elapsedSeconds: 0.5,
    }),
  /either progress or lifetimeSeconds/,
);

console.log('cell lighting fixture: PASS');
