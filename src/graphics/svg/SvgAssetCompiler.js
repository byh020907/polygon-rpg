import {
  freeze,
  frameMatrix,
  inverse,
  multiply,
  numbers,
  point,
  transform,
  IDENTITY,
} from './SvgMath.js';
import { shapePoints, triangulate } from './SvgGeometry.js';
const tags = new Set(['svg', 'g', 'polygon', 'path', 'rect', 'circle', 'ellipse', 'title', 'desc']);
const known = new Set([
  'xmlns',
  'id',
  'viewBox',
  'width',
  'height',
  'transform',
  'fill',
  'fill-rule',
  'points',
  'd',
  'x',
  'y',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'data-part',
  'data-frame',
  'data-pivot',
  'data-anchor',
  'data-z',
  'data-normal',
  'data-material',
  'data-occlusion',
  'data-lod',
  'data-pose',
  'data-replace',
  'version',
  'opacity',
  'data-shadow',
  'data-role',
  'data-rig-family',
  'data-joint',
]);
const attr = (node, key, fallback = null) =>
  node.hasAttribute(key) ? node.getAttribute(key) : fallback;
const finite = (text) => {
  const v = numbers(text);
  if (v.length !== 1) throw new Error('Expected finite scalar');
  return v[0];
};
const validId = (id) => {
  if (
    !id ||
    !/^[a-zA-Z][\w:/.-]*$/.test(id) ||
    /^(g|path|rect|circle|ellipse|polygon)\d+$/.test(id)
  )
    throw new Error('Every SVG part/shape/anchor needs a stable semantic id');
  return id;
};
export function compileSvgMaster(
  text,
  { parseXml, maxShapes = 256, maxVertices = 8192, curveSteps = 12, maxSourceBytes = 524288 } = {},
) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > maxSourceBytes)
    throw new Error('SVG source byte budget exceeded');
  if (
    !Number.isInteger(curveSteps) ||
    curveSteps < 2 ||
    curveSteps > 32 ||
    !Number.isInteger(maxShapes) ||
    maxShapes < 1 ||
    maxShapes > 1024 ||
    !Number.isInteger(maxVertices) ||
    maxVertices < 3 ||
    maxVertices > 32768
  )
    throw new Error('Invalid SVG compile budgets');
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text))
    throw new Error('External SVG entities/styles are unsupported');
  const document = parseXml
    ? parseXml(text)
    : new globalThis.DOMParser().parseFromString(text, 'image/svg+xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('Malformed SVG XML');
  const root = document.documentElement;
  if (root?.localName !== 'svg') throw new Error('Expected SVG root');
  const frame = numbers(attr(root, 'viewBox'));
  if (frame.length !== 4 || frame[2] <= 0 || frame[3] <= 0)
    throw new Error('SVG needs finite positive viewBox');
  const id = validId(attr(root, 'id'));
  const rootMatrix = frameMatrix(frame);
  const parts = [
      {
        id: 'root',
        parentId: null,
        frame,
        extent: { x: frame[2] / 2, y: frame[3] / 2 },
        bind: [...IDENTITY],
        pivot: { x: 0, y: 0 },
      },
    ],
    shapes = [],
    anchors = [],
    poses = new Set(['base']),
    ids = new Set(['root']);
  let vertices = 0;
  const metadata = (node, parent) => {
    const lod = attr(node, 'data-lod', parent.lod),
      pose = attr(node, 'data-pose', parent.pose),
      replacement = attr(node, 'data-replace', parent.replacement);
    if (!['common', 'far', 'mid', 'near'].includes(lod) || !['part', 'whole'].includes(replacement))
      throw new Error('Invalid SVG LOD/pose replacement');
    validId(pose);
    poses.add(pose);
    const normal = numbers(attr(node, 'data-normal', parent.normal.join(' ')));
    if (normal.length !== 3 || Math.hypot(...normal) < 1e-8)
      throw new Error('Invalid SVG surface normal');
    const occlusion = finite(attr(node, 'data-occlusion', String(parent.occlusion)));
    if (occlusion < 0 || occlusion > 1) throw new Error('Occlusion must be between zero and one');
    const fill = attr(node, 'fill', parent.fill);
    if (!/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(fill))
      throw new Error(
        'SVG fill requires a solid #RGB/#RRGGBB color; outline strokes and gradients first',
      );
    const ownOpacity = finite(attr(node, 'opacity', '1'));
    const shadowRole = attr(node, 'data-shadow', parent.shadowRole);
    const role = attr(node, 'data-role', parent.role);
    if (
      ownOpacity < 0 ||
      ownOpacity > 1 ||
      !['contact', 'cast', 'none'].includes(shadowRole) ||
      !['visual', 'occluder'].includes(role)
    )
      throw new Error('Invalid SVG opacity/shadow/role');
    if (['g', 'svg'].includes(node.localName) && ownOpacity !== 1)
      throw new Error('Group opacity compositing unsupported; apply opacity to individual shapes');
    return {
      lod,
      pose,
      replacement,
      normal,
      occlusion,
      fill,
      opacity: parent.opacity * ownOpacity,
      shadowRole,
      role,
      material: attr(node, 'data-material', parent.material),
      z: parent.z + finite(attr(node, 'data-z', '0')),
    };
  };
  function visit(node, parentPart, parentFrame, parentMeta, depth = 0) {
    if (depth > 32) throw new Error('SVG hierarchy depth budget exceeded');
    const tag = node.localName;
    if (tag === 'svg' && (node !== root || node.hasAttribute('transform')))
      throw new Error('Nested SVG/root transform unsupported; transform a named group instead');
    if (!tags.has(tag))
      throw new Error(
        'Unsupported SVG ' +
          tag +
          '; use named vector groups and outlined closed shapes (no raster/use/filter/stroke)',
      );
    for (const a of Array.from(node.attributes ?? []))
      if (!known.has(a.name))
        throw new Error(
          'Unsupported SVG attribute ' + a.name + '; outline strokes and remove styles/filters',
        );
    if (tag === 'title' || tag === 'desc') return;
    const meta = metadata(node, parentMeta);
    let part = parentPart,
      localFrame = parentFrame,
      shapeTransform = transform(attr(node, 'transform', ''));
    if (tag === 'g') {
      const partId = validId(attr(node, 'data-part', attr(node, 'id')));
      if (parts.length >= 256) throw new Error('SVG part count budget exceeded');
      if (ids.has(partId)) throw new Error('Duplicate SVG semantic id ' + partId);
      ids.add(partId);
      localFrame = numbers(attr(node, 'data-frame', frame.join(' ')));
      if (localFrame.length !== 4 || localFrame[2] <= 0 || localFrame[3] <= 0)
        throw new Error('Invalid part frame');
      const pivot = numbers(
        attr(
          node,
          'data-pivot',
          `${localFrame[0] + localFrame[2] / 2} ${localFrame[1] + localFrame[3] / 2}`,
        ),
      );
      if (pivot.length !== 2) throw new Error('Invalid SVG pivot');
      part = {
        id: partId,
        parentId: parentPart.id,
        frame: localFrame,
        extent: { x: localFrame[2] / 2, y: localFrame[3] / 2 },
        sizeRatio: { x: localFrame[2] / parentFrame[2], y: localFrame[3] / parentFrame[3] },
        bind: multiply(
          multiply(inverse(frameMatrix(parentFrame)), shapeTransform),
          frameMatrix(localFrame),
        ),
        pivot: point(inverse(frameMatrix(localFrame)), { x: pivot[0], y: pivot[1] }),
        joint: attr(node, 'data-joint'),
      };
      parts.push(part);
      if (Math.abs(part.pivot.x) > 1.000001 || Math.abs(part.pivot.y) > 1.000001)
        throw new Error('Pivot exceeds normalized part frame');
      shapeTransform = [...IDENTITY];
    }
    if (tag !== 'svg' && tag !== 'g') {
      const shapeId = validId(attr(node, 'id'));
      if (ids.has(shapeId)) throw new Error('Duplicate SVG semantic id ' + shapeId);
      ids.add(shapeId);
      const normalize = multiply(inverse(frameMatrix(localFrame)), shapeTransform);
      if (node.hasAttribute('data-anchor')) {
        if (tag !== 'circle') throw new Error('Anchors use circle markers');
        const anchorId = validId(attr(node, 'data-anchor'));
        if (anchors.length >= 256) throw new Error('SVG anchor count budget exceeded');
        if (anchors.some((a) => a.id === anchorId && a.lod === meta.lod && a.pose === meta.pose))
          throw new Error('Duplicate anchor in LOD/pose');
        const position = point(normalize, {
          x: finite(attr(node, 'cx', '0')),
          y: finite(attr(node, 'cy', '0')),
        });
        if (Math.abs(position.x) > 1.000001 || Math.abs(position.y) > 1.000001)
          throw new Error('Anchor exceeds normalized part frame');
        anchors.push({
          id: anchorId,
          partId: part.id,
          ...position,
          z: meta.z,
          lod: meta.lod,
          pose: meta.pose,
        });
        return;
      }
      if (attr(node, 'fill-rule', 'nonzero') !== 'nonzero')
        throw new Error('Only simple nonzero filled contours supported');
      const sourcePoints = shapePoints(node, curveSteps).map((p) => point(normalize, p));
      if (sourcePoints.length > 512 || vertices + sourcePoints.length > maxVertices)
        throw new Error('SVG per-shape/total vertex budget exceeded');
      const geometry = triangulate(sourcePoints);
      if (geometry.points.some((p) => Math.abs(p.x) > 1.000001 || Math.abs(p.y) > 1.000001))
        throw new Error('Shape exceeds normalized part frame; enlarge data-frame/viewBox');
      vertices += geometry.points.length;
      if (shapes.length >= maxShapes || vertices > maxVertices)
        throw new Error('SVG shape/vertex budget exceeded');
      const normalTransform = inverse(shapeTransform);
      const transformedNormal = [
        normalTransform[0] * meta.normal[0] + normalTransform[1] * meta.normal[1],
        normalTransform[2] * meta.normal[0] + normalTransform[3] * meta.normal[1],
        meta.normal[2],
      ];
      const norm = Math.hypot(...transformedNormal);
      shapes.push({
        id: shapeId,
        partId: part.id,
        ...geometry,
        fill: meta.fill,
        opacity: meta.opacity,
        shadowRole: meta.shadowRole,
        role: meta.role,
        materialId: meta.material,
        surfaceNormal: {
          x: transformedNormal[0] / norm,
          y: transformedNormal[1] / norm,
          z: transformedNormal[2] / norm,
        },
        structuralOcclusion: meta.occlusion,
        z: meta.z,
        lod: meta.lod,
        pose: meta.pose,
        replacement: meta.replacement,
      });
      return;
    }
    for (const child of Array.from(node.childNodes ?? [])) {
      if (child.nodeType === 1) visit(child, part, localFrame, meta, depth + 1);
      else if (child.nodeType === 3 && child.nodeValue.trim())
        throw new Error('Visible SVG text unsupported; outline text first');
    }
  }
  visit(root, parts[0], frame, {
    lod: 'common',
    pose: 'base',
    replacement: 'part',
    normal: [0, 0, -1],
    occlusion: 0,
    fill: '#888888',
    material: 'painted-steel',
    opacity: 1,
    shadowRole: 'none',
    role: 'visual',
    z: 0,
  });
  if (shapes.length === 0 || parts.length < 2)
    throw new Error('SVG requires meaningful part groups and vector geometry');
  const bindMatrices = new Map();
  for (const part of parts)
    bindMatrices.set(
      part.id,
      multiply(part.parentId ? bindMatrices.get(part.parentId) : IDENTITY, part.bind),
    );
  for (const shape of shapes) {
    if (
      shape.points.some((vertex) => {
        const p = point(bindMatrices.get(shape.partId), vertex);
        return (
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          Math.abs(p.x) > 1.000001 ||
          Math.abs(p.y) > 1.000001
        );
      })
    )
      throw new Error('Master shape exceeds root viewBox; enlarge the authored viewBox');
  }
  return freeze({
    schemaVersion: 1,
    id,
    rigFamily: attr(root, 'data-rig-family'),
    viewBox: frame,
    bounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
    rootExtent: { x: rootMatrix[0], y: rootMatrix[3] },
    parts,
    shapes,
    anchors,
    lods: ['far', 'mid', 'near'],
    poses: [...poses],
    vertexCount: vertices,
  });
}
