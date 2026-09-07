import assert from 'node:assert/strict';
import {
  createProjectedBoneSurface,
  withBoneSurface,
} from '../src/animation/ProjectedBodySurface.js';
import { createPlayerSurfaceItems } from '../src/animation/CharacterSurfaceItems.js';
import { sampleCharacterBonePose } from '../src/animation/CharacterBonePoseLibrary.js';
import { projectSideViewSkeletonFrame } from '../src/animation/SkeletonPoseProjection.js';
import { axisAngleQuaternion } from '../src/animation/Quaternion.js';
import { rasterizeDepthPolygons } from '../src/rendering/DepthPolygonRasterizer.js';
import { createTestGameScene } from './GameSceneTestFixture.mjs';
import { ACADEMY_VILLAGE_MAP } from '../src/game/maps/academyVillage.js';

const input = { start: { x: 20, y: 10, depth: 2 }, end: { x: 20, y: 70, depth: 8 }, width: 20 };
const round = createProjectedBoneSurface(input);
const ellipse = createProjectedBoneSurface({ ...input, section: 'ellipse' });
const plate = createProjectedBoneSurface({ ...input, section: 'plate' });
assert.equal(round.points.length, 20, 'four longitudinal rows and five transverse samples');
assert.equal(round.depths.length, round.points.length);
assert.equal(round.triangles.length, 24);
assert.ok(
  round.points.every((p) => Object.keys(p).sort().join() === 'x,y'),
  'screen vertices cannot carry 3D channels',
);
assert.ok(
  round.triangles.every(
    (triangle) => triangle.length === 3 && triangle.every((i) => i >= 0 && i < 20),
  ),
);
assert.ok(
  Math.abs(round.points[4].x - round.points[0].x) < Math.abs(round.points[9].x - round.points[5].x),
  'longitudinal width must vary',
);
assert.ok(
  round.depths[2] > ellipse.depths[2] && ellipse.depths[2] > plate.depths[2],
  'round, oval and plate sections have different surface thickness',
);
assert.equal(round.depths[0], 2);
assert.equal(round.depths[15], 8);
assert.ok(round.depths[2] > round.depths[0], 'transverse center bulges toward camera');

const neutral = sampleCharacterBonePose({});
const frame = neutral.skeletonFrame;
const turned = projectSideViewSkeletonFrame({
  ...frame,
  joints: {
    ...frame.joints,
    chest: {
      ...frame.joints.chest,
      quaternion: axisAngleQuaternion({ x: 0, y: 1, z: 0 }, Math.PI / 2),
    },
  },
});
assert.notDeepEqual(
  turned.projectedJoints.nearHand,
  neutral.projectedJoints.nearHand,
  'local chest XYZ rotation must alter inherited projected arm',
);
assert.notEqual(turned.projectedJoints.nearHand.depth, neutral.projectedJoints.nearHand.depth);
const arm = (pose) =>
  createProjectedBoneSurface({
    start: pose.projectedJoints.nearShoulder,
    end: pose.projectedJoints.nearElbow,
    width: 10,
  });
assert.notDeepEqual(arm(turned).points, arm(neutral).points);
assert.notDeepEqual(arm(turned).depths, arm(neutral).depths);
const chest = neutral.projectedJoints.chest;
const cloak = {
  id: 'coat-back-panel',
  fill: '#708090',
  points: [
    { x: chest.x - 15, y: chest.y },
    { x: chest.x + 15, y: chest.y },
    { x: chest.x + 20, y: chest.y + 40 },
    { x: chest.x - 20, y: chest.y + 40 },
  ],
};
const adapt = (bonePose) =>
  createPlayerSurfaceItems([cloak], {
    bonePose,
    position: { x: 0, y: 0 },
    facing: 1,
    scale: 1,
    footOffset: 0,
  })[0];
const spanX = (points) => Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
assert.ok(
  spanX(adapt(turned).points) < spanX(adapt(neutral).points) * 0.1,
  'thin cloak must foreshorten at a 90 degree chest turn',
);
assert.deepEqual(
  adapt(turned),
  adapt(projectSideViewSkeletonFrame(turned.skeletonFrame)),
  'same sampler reproduces attachment geometry',
);
const item = withBoneSurface({ id: 'limb', fill: '#708090' }, round, 'actor');
const render = () => rasterizeDepthPolygons([item], { width: 64, height: 80 });
assert.deepEqual(render().data, render().data);
assert.ok(render().data.some(Boolean));

const scene = createTestGameScene({ mapDefinition: ACADEMY_VILLAGE_MAP });
const liveFrame = scene.createRenderFrame(0);
const groups = new Map();
liveFrame.items.forEach((entry, index) => {
  if (!entry.depthGroup) return;
  const indices = groups.get(entry.depthGroup) ?? [];
  indices.push(index);
  groups.set(entry.depthGroup, indices);
});
assert.ok(groups.has('player'), 'actual game frame contains projected player surfaces');
for (const [id, indices] of groups) {
  assert.equal(
    indices.at(-1) - indices[0] + 1,
    indices.length,
    `${id} depth group must be contiguous in production sorted frame`,
  );
  const items = indices.map((index) => liveFrame.items[index]);
  const points = items.flatMap((entry) => entry.surface?.points ?? entry.points);
  const left = Math.min(...points.map((p) => p.x)) - 2;
  const top = Math.min(...points.map((p) => p.y)) - 2;
  const width = Math.ceil(Math.max(...points.map((p) => p.x)) - left + 2);
  const height = Math.ceil(Math.max(...points.map((p) => p.y)) - top + 2);
  const pixels = rasterizeDepthPolygons(items, { width, height, offsetX: left, offsetY: top });
  assert.ok(pixels.data.some(Boolean), `${id} production geometry rasterizes visible pixels`);
}
console.log(
  'Projected body sections, XYZ inheritance, cloak foreshortening, deterministic raster and production depth groups PASS',
);
