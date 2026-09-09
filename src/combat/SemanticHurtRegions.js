const RESPONSES = new Set(['body', 'weak', 'armor', 'guard', 'immune']);
const point = (p) => Object.freeze({ x: p.x, y: p.y });

// Authored primitives attach to semantic joints, never to a copied rendered outline.
export function sampleSemanticHurtRegions({ skeleton, descriptors, scale = 1 }) {
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('Hurt scale must be positive.');
  return Object.freeze(
    descriptors.map((descriptor) => {
      const { id, part = id, shape, response = 'body', bone, endBone } = descriptor;
      if (!(
        descriptor.damageMultiplier === undefined ||
        (Number.isFinite(descriptor.damageMultiplier) && descriptor.damageMultiplier > 0)
      ))
        throw new RangeError('Hurt damage multiplier must be positive.');
      if (!RESPONSES.has(response)) throw new TypeError(`Unknown hurt response: ${response}`);
      const anchor = skeleton[bone],
        end = endBone ? skeleton[endBone] : null;
      if (!anchor || (endBone && !end))
        throw new TypeError(`Missing hurt bone: ${bone}/${endBone}`);
      const rotation =
        descriptor.rotation ?? (anchor.axisX ? Math.atan2(anchor.axisX.y, anchor.axisX.x) : 0);
      const localPoint = (p) => ({
        x: anchor.x + (p.x * Math.cos(rotation) - p.y * Math.sin(rotation)) * scale,
        y: anchor.y + (p.x * Math.sin(rotation) + p.y * Math.cos(rotation)) * scale,
      });
      const center = localPoint(descriptor.offset ?? { x: 0, y: 0 });
      let points;
      if (shape === 'circle' || shape === 'ellipse') {
        const rx = (descriptor.radiusX ?? descriptor.radius) * scale;
        const ry = (descriptor.radiusY ?? descriptor.radius) * scale;
        if (!(rx > 0 && ry > 0)) throw new RangeError('Hurt radii must be positive.');
        const angle = rotation;
        points = Array.from({ length: 24 }, (_, i) => {
          const t = (i / 24) * Math.PI * 2,
            x = Math.cos(t) * rx,
            y = Math.sin(t) * ry;
          return {
            x: center.x + x * Math.cos(angle) - y * Math.sin(angle),
            y: center.y + x * Math.sin(angle) + y * Math.cos(angle),
          };
        });
      } else if (shape === 'capsule') {
        if (!end || !(descriptor.radius > 0))
          throw new TypeError('Capsule requires an end bone and radius.');
        const angle = Math.atan2(end.y - center.y, end.x - center.x),
          radius = descriptor.radius * scale;
        const inset = Math.min(
          (descriptor.inset ?? 0) * scale,
          Math.hypot(end.x - center.x, end.y - center.y) / 2,
        );
        const capStart = {
          x: center.x + Math.cos(angle) * inset,
          y: center.y + Math.sin(angle) * inset,
        };
        const capEnd = { x: end.x - Math.cos(angle) * inset, y: end.y - Math.sin(angle) * inset };
        points = [capEnd, capStart].flatMap((p, side) =>
          Array.from({ length: 13 }, (_, i) => {
            const t = angle - Math.PI / 2 + side * Math.PI + (i / 12) * Math.PI;
            return { x: p.x + Math.cos(t) * radius, y: p.y + Math.sin(t) * radius };
          }),
        );
      } else if (shape === 'polygon') {
        if (!descriptor.vertices || descriptor.vertices.length < 3)
          throw new TypeError('Hurt polygon requires authored vertices.');
        points = descriptor.vertices.map((p) => {
          if (p.bone) {
            const joint = skeleton[p.bone];
            if (!joint) throw new TypeError('Missing hurt polygon bone: ' + p.bone);
            return { x: joint.x, y: joint.y };
          }
          return localPoint({
            x: p.x + (descriptor.offset?.x ?? 0),
            y: p.y + (descriptor.offset?.y ?? 0),
          });
        });
      } else throw new TypeError('Unknown hurt primitive: ' + shape);
      return Object.freeze({
        id,
        part,
        shape,
        response,
        damageMultiplier: descriptor.damageMultiplier ?? 1,
        bone,
        endBone,
        center: point(center),
        end: end ? point(end) : null,
        tolerance: descriptor.tolerance ?? 2,
        points: Object.freeze(points.map(point)),
      });
    }),
  );
}

export function humanoidHurtDescriptors({
  headRadiusX = 8,
  headRadiusY = 10,
  limbScale = 1,
  armRadius = 3.5,
  forearmRadius = 2.5,
  thighRadius = 4.5,
  shinRadius = 2.5,
} = {}) {
  return [
    { id: 'head', shape: 'ellipse', bone: 'head', radiusX: headRadiusX, radiusY: headRadiusY },
    {
      id: 'torso',
      shape: 'polygon',
      bone: 'chest',
      vertices: ['nearShoulder', 'farShoulder', 'farHip', 'nearHip'].map((bone) => ({ bone })),
    },
    ...[
      ['weapon-arm', 'nearShoulder', 'nearElbow', armRadius],
      ['weapon-forearm', 'nearElbow', 'nearHand', forearmRadius],
      ['shield-arm', 'farShoulder', 'farElbow', armRadius],
      ['shield-forearm', 'farElbow', 'farHand', forearmRadius],
      ['back-thigh', 'farHip', 'farKnee', thighRadius],
      ['back-shin', 'farKnee', 'farFoot', shinRadius],
      ['front-thigh', 'nearHip', 'nearKnee', thighRadius],
      ['front-shin', 'nearKnee', 'nearFoot', shinRadius],
    ].map(([id, bone, endBone, radius]) => ({
      id,
      shape: 'capsule',
      bone,
      endBone,
      radius: radius * limbScale,
      inset: radius * limbScale,
    })),
  ];
}

export function measureHurtVisualDeviation(region, visualPoints) {
  // Bidirectional vertex-to-edge distance is an explicit author QA budget.
  const distance = (p, a, b) => {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
    );
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  };
  const directed = (a, b) =>
    Math.max(...a.map((p) => Math.min(...b.map((q, i) => distance(p, q, b[(i + 1) % b.length])))));
  const deviation = Math.max(
    directed(region.points, visualPoints),
    directed(visualPoints, region.points),
  );
  return Object.freeze({
    deviation,
    tolerance: region.tolerance,
    withinTolerance: deviation <= region.tolerance,
  });
}
