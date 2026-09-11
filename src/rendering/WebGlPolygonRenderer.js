import { SceneCompositionPresenter } from '../graphics/scene/SceneCompositionPresenter.js';
import {
  createCirclePolygon,
  createStrokeGeometry,
  flattenTriangleIndices,
} from './WebGlGeometry.js';
import { createWebGlScenePlan } from './WebGlScenePainter.js';

const COMPONENTS_PER_VERTEX = 7;
const BYTES_PER_VERTEX = COMPONENTS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;

const VERTEX_SHADER = `#version 300 es
layout(location=0) in vec2 a_position;
layout(location=1) in float a_depth;
layout(location=2) in vec4 a_color;
uniform vec2 u_resolution;
out vec4 v_color;
void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, a_depth * 2.0 - 1.0, 1.0);
  v_color = a_color;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() { outColor = v_color; }`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL shader를 만들 수 없습니다.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'unknown shader error';
    gl.deleteShader(shader);
    throw new Error(`WebGL shader compile 실패: ${message}`);
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error('WebGL program을 만들 수 없습니다.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'unknown link error';
    gl.deleteProgram(program);
    throw new Error(`WebGL program link 실패: ${message}`);
  }
  return program;
}

function parseHexColor(value) {
  const hex = String(value ?? '#000000').replace('#', '');
  const expanded = /^[\da-f]{3}$/i.test(hex)
    ? [...hex].map((character) => character + character).join('')
    : hex;
  if (!/^[\da-f]{6}$/i.test(expanded)) {
    throw new TypeError(`WebGL polygon color는 hexadecimal이어야 합니다: ${value}`);
  }
  return [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16) / 255);
}

function shadeColor(color, shade) {
  return [
    Math.max(0, Math.min(1, color[0] * shade)),
    Math.max(0, Math.min(1, color[1] * shade)),
    Math.max(0, Math.min(1, color[2] * shade)),
  ];
}

class VertexBatch {
  constructor(vertexCapacity = 4096) {
    this.data = new Float32Array(vertexCapacity * COMPONENTS_PER_VERTEX);
    this.vertexCount = 0;
    this.reallocations = 0;
  }

  reset() {
    this.vertexCount = 0;
  }

  ensure(vertices) {
    const required = (this.vertexCount + vertices) * COMPONENTS_PER_VERTEX;
    if (required <= this.data.length) return;
    let capacity = this.data.length;
    while (capacity < required) capacity *= 2;
    const grown = new Float32Array(capacity);
    grown.set(this.data.subarray(0, this.vertexCount * COMPONENTS_PER_VERTEX));
    this.data = grown;
    this.reallocations += 1;
  }

  vertex(x, y, depth, color, alpha) {
    this.ensure(1);
    const offset = this.vertexCount * COMPONENTS_PER_VERTEX;
    this.data[offset] = x;
    this.data[offset + 1] = y;
    this.data[offset + 2] = depth;
    this.data[offset + 3] = color[0];
    this.data[offset + 4] = color[1];
    this.data[offset + 5] = color[2];
    this.data[offset + 6] = alpha;
    this.vertexCount += 1;
  }

  view() {
    return this.data.subarray(0, this.vertexCount * COMPONENTS_PER_VERTEX);
  }
}

function averageDepth(item) {
  return item.depths.reduce((sum, depth) => sum + depth, 0) / item.depths.length;
}

function triangleIndicesMatch(cachedIndices, triangles) {
  if (triangles === null) return true;
  let cursor = 0;
  for (const triangle of triangles) {
    if (Array.isArray(triangle) || ArrayBuffer.isView(triangle)) {
      for (const index of triangle) {
        if (cachedIndices[cursor++] !== index) return false;
      }
    } else if (cachedIndices[cursor++] !== triangle) return false;
  }
  return cursor === cachedIndices.length;
}

function depthMapper(items) {
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const item of items) {
    for (const depth of item.depths) {
      minimum = Math.min(minimum, depth);
      maximum = Math.max(maximum, depth);
    }
  }
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum - minimum < 1e-9) {
    return () => 0.5;
  }
  const inverse = 0.8 / (maximum - minimum);
  return (depth) => 0.1 + (depth - minimum) * inverse;
}

function rectanglePoints(left, top, right, bottom) {
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}

export class WebGlPolygonRenderer {
  constructor(canvasHost, camera) {
    this.profile = 'polygon';
    this.backend = 'webgl2-gpu';
    this.canvasHost = canvasHost;
    this.camera = camera;
    this.scenePresenter = new SceneCompositionPresenter();
    this.gl = canvasHost.context;
    this.resources = null;
    this.batch = new VertexBatch();
    this.colorCache = new Map();
    this.topologyCache = new Map();
    this.strokeGeometryCache = new Map();
    this.lastFrame = null;
    this.lastOptions = null;
    this.destroyed = false;
    this.contextGeneration = 0;
    this.unsubscribeContext = canvasHost.subscribeContext((state) => {
      if (state === 'lost') {
        this.resources = null;
        return;
      }
      this.initializeResources();
      if (this.lastFrame) this.render(this.lastFrame, this.lastOptions);
    });
    this.initializeResources();
  }

  initializeResources() {
    if (this.destroyed || this.canvasHost.contextLost) return;
    const gl = this.gl;
    const program = createProgram(gl);
    const buffer = gl.createBuffer();
    const vertexArray = gl.createVertexArray();
    if (!buffer || !vertexArray) throw new Error('WebGL polygon buffer를 만들 수 없습니다.');
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.batch.data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, BYTES_PER_VERTEX, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, BYTES_PER_VERTEX, 8);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, BYTES_PER_VERTEX, 12);
    gl.bindVertexArray(null);
    this.resources = {
      program,
      buffer,
      vertexArray,
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      bufferCapacity: this.batch.data.byteLength,
    };
    this.contextGeneration += 1;
  }

  color(value) {
    let color = this.colorCache.get(value);
    if (!color) {
      color = Object.freeze(parseHexColor(value));
      this.colorCache.set(value, color);
    }
    return color;
  }

  topology(item) {
    const cached = this.topologyCache.get(item.id);
    if (
      cached &&
      cached.pointCount === item.points.length &&
      cached.implicit === (item.triangles === null) &&
      triangleIndicesMatch(cached.indices, item.triangles)
    ) {
      this.frameStats.topologyCacheHits += 1;
      return cached.indices;
    }
    let indices;
    try {
      indices = flattenTriangleIndices(item.points, item.triangles);
    } catch (error) {
      throw new RangeError(`WebGL polygon topology ${item.id}: ${error.message}`, {
        cause: error,
      });
    }
    this.topologyCache.set(item.id, {
      pointCount: item.points.length,
      implicit: item.triangles === null,
      indices,
    });
    this.frameStats.topologyCacheMisses += 1;
    return indices;
  }

  appendFill(item, mapDepth) {
    if (item.opacity <= 0) return;
    const indices = this.topology(item);
    const base = this.color(item.fill);
    for (let offset = 0; offset < indices.length; offset += 3) {
      const shade = item.triangleShades?.[offset / 3] ?? 1;
      const color = shade === 1 ? base : shadeColor(base, shade);
      for (let cursor = 0; cursor < 3; cursor += 1) {
        const index = indices[offset + cursor];
        const point = item.points[index];
        this.batch.vertex(point.x, point.y, mapDepth(item.depths[index]), color, item.opacity);
      }
    }
  }

  appendStroke(
    item,
    mapDepth,
    { color = item.stroke, width = item.lineWidth, bias = 0, closed = true } = {},
  ) {
    if (!color || item.opacity <= 0 || width <= 0) return;
    const outlineLength = item.outlineIndices?.length ?? item.points.length;
    const cacheKey = `${item.id}:${outlineLength}:${closed ? 'closed' : 'open'}`;
    const cached = this.strokeGeometryCache.get(cacheKey) ?? null;
    const geometry = createStrokeGeometry(item.points, item.depths, {
      width,
      outlineIndices: item.outlineIndices,
      closed,
      target: cached,
    });
    this.strokeGeometryCache.set(cacheKey, geometry);
    if (cached) this.frameStats.strokeCacheHits += 1;
    else this.frameStats.strokeCacheMisses += 1;
    const rgb = this.color(color);
    for (const index of geometry.triangles) {
      this.batch.vertex(
        geometry.positions[index * 2],
        geometry.positions[index * 2 + 1],
        Math.min(0.999, mapDepth(geometry.depths[index]) + bias),
        rgb,
        item.opacity,
      );
    }
  }

  appendMarkers(item, mapDepth) {
    for (let index = 0; index < item.points.length; index += 1) {
      const marker = createCirclePolygon(item.points[index], Math.max(1, item.lineWidth * 1.6), {
        depth: mapDepth(item.depths[index]),
        segments: 8,
      });
      const markerItem = {
        id: `${item.id}:marker:${index}`,
        points: marker.points,
        depths: marker.depths,
        triangles: marker.triangles,
        fill: '#f8fafc',
        opacity: 0.82 * item.opacity,
      };
      this.appendFill(markerItem, (depth) => depth);
    }
  }

  uploadAndDraw({ depthTest = false, depthWrite = false, blend = true } = {}) {
    if (!this.batch.vertexCount) return;
    const gl = this.gl;
    const resources = this.resources;
    const view = this.batch.view();
    gl.bindBuffer(gl.ARRAY_BUFFER, resources.buffer);
    if (view.byteLength > resources.bufferCapacity) {
      gl.bufferData(gl.ARRAY_BUFFER, this.batch.data.byteLength, gl.DYNAMIC_DRAW);
      resources.bufferCapacity = this.batch.data.byteLength;
      this.frameStats.bufferReallocations += 1;
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
    if (depthTest) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    gl.depthMask(depthWrite);
    gl.depthFunc(gl.GEQUAL);
    if (blend) {
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    } else gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, this.batch.vertexCount);
    this.frameStats.drawCalls += 1;
    this.frameStats.vertices += this.batch.vertexCount;
    this.frameStats.uploadBytes += view.byteLength;
  }

  drawBackdrop(frame, viewport, projectToBacking, showWorldGrid) {
    this.batch.reset();
    const top = projectToBacking({ x: 0, y: 0 });
    const bottom = projectToBacking({ x: frame.worldSize.width, y: frame.worldSize.height });
    const appendRectangle = (points, fill) =>
      this.appendFill(
        {
          id: `backdrop:${fill}:${this.batch.vertexCount}`,
          points,
          depths: [0.5, 0.5, 0.5, 0.5],
          triangles: [0, 1, 2, 0, 2, 3],
          fill,
          opacity: 1,
        },
        (depth) => depth,
      );
    appendRectangle(
      rectanglePoints(
        Math.min(top.x, bottom.x),
        Math.min(top.y, bottom.y),
        Math.max(top.x, bottom.x),
        Math.max(top.y, bottom.y),
      ),
      frame.palette.arena,
    );
    if (showWorldGrid) {
      const appendLine = (a, b) => {
        const item = {
          points: [projectToBacking(a), projectToBacking(b)],
          depths: [0.5, 0.5],
          opacity: 1,
          lineWidth: 0.75 * Math.max(viewport.pixelRatio, 1),
          stroke: frame.palette.grid,
        };
        this.appendStroke(item, (depth) => depth, { width: item.lineWidth, closed: false });
      };
      for (let x = 0; x <= frame.worldSize.width; x += frame.gridSize) {
        appendLine({ x, y: 0 }, { x, y: frame.worldSize.height });
      }
      for (let y = 0; y <= frame.worldSize.height; y += frame.gridSize) {
        appendLine({ x: 0, y }, { x: frame.worldSize.width, y });
      }
    }
    if (Number.isFinite(frame.groundY)) {
      const ground = projectToBacking({ x: 0, y: frame.groundY });
      appendRectangle(
        rectanglePoints(
          Math.min(top.x, bottom.x),
          ground.y,
          Math.max(top.x, bottom.x),
          Math.max(ground.y, bottom.y),
        ),
        frame.palette.ground,
      );
    }
    this.uploadAndDraw({ blend: false });
  }

  drawPainterOperation(operation, showMesh) {
    this.batch.reset();
    const mapDepth = () => 0.5;
    for (const item of operation.items) {
      this.appendFill(item, mapDepth);
      this.appendStroke(item, mapDepth);
      if (showMesh && item.sourceArea > 0.0001 && item.projectedArea > 0.0001) {
        this.appendMarkers(item, mapDepth);
      }
    }
    this.uploadAndDraw({ blend: true });
  }

  drawDepthOperation(operation, silhouetteColor, silhouetteWidth) {
    const gl = this.gl;
    gl.clearDepth(0);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const mapDepth = depthMapper(operation.items);
    const opaque = operation.items
      .filter((item) => item.opacity === 1 && item.depthWrite)
      .sort((left, right) => left.stableOrder.localeCompare(right.stableOrder));
    const transparent = operation.items
      .filter((item) => item.opacity > 0 && (item.opacity < 1 || !item.depthWrite))
      .sort(
        (left, right) =>
          averageDepth(left) - averageDepth(right) ||
          left.stableOrder.localeCompare(right.stableOrder),
      );

    this.batch.reset();
    for (const item of opaque) this.appendFill(item, mapDepth);
    this.uploadAndDraw({ depthTest: true, depthWrite: true, blend: false });

    this.batch.reset();
    for (const item of transparent) {
      this.appendFill(item, mapDepth);
      this.appendStroke(item, mapDepth, { bias: 0.0002 });
    }
    this.uploadAndDraw({ depthTest: true, depthWrite: false, blend: true });

    this.batch.reset();
    for (const item of opaque) {
      if (!item.stroke) continue;
      this.appendStroke(item, mapDepth, {
        color: silhouetteColor,
        width: Math.max(item.lineWidth, silhouetteWidth * 2),
        bias: 0.0003,
      });
    }
    this.uploadAndDraw({ depthTest: true, depthWrite: false, blend: false });
    gl.depthMask(false);
  }

  render(frame, { showMesh = false, showWorldGrid = true, transparent = false } = {}) {
    this.lastFrame = frame;
    this.lastOptions = { showMesh, showWorldGrid, transparent };
    const viewport = this.canvasHost.viewport;
    if (this.destroyed || this.canvasHost.contextLost || !this.resources) {
      return Object.freeze({
        renderer: this.backend,
        contextLost: true,
        logicalWidth: viewport.width,
        logicalHeight: viewport.height,
        backingWidth: viewport.backingWidth,
        backingHeight: viewport.backingHeight,
        degenerateItemIds: Object.freeze([]),
        rasterCollapseItemIds: Object.freeze([]),
      });
    }
    const started = performance.now();
    this.frameStats = {
      drawCalls: 0,
      vertices: 0,
      uploadBytes: 0,
      bufferReallocations: 0,
      topologyCacheHits: 0,
      topologyCacheMisses: 0,
      strokeCacheHits: 0,
      strokeCacheMisses: 0,
    };
    const gl = this.gl;
    gl.viewport(0, 0, viewport.backingWidth, viewport.backingHeight);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, true);
    const clear = transparent ? [0, 0, 0] : this.color(frame.palette.background);
    gl.clearColor(clear[0], clear[1], clear[2], transparent ? 0 : 1);
    gl.clearDepth(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.resources.program);
    gl.bindVertexArray(this.resources.vertexArray);
    gl.uniform2f(this.resources.resolution, viewport.backingWidth, viewport.backingHeight);

    const cameraOffset = frame.cameraOffset ?? { x: 0, y: 0 };
    const mobileScale = viewport.cssWidth <= 900 ? (frame.artDirection?.mobileCameraScale ?? 1) : 1;
    const presentationZoom = (frame.artDirection?.cameraZoom ?? 1) * mobileScale;
    const focusX = viewport.width / 2;
    const focusY = viewport.height * (frame.artDirection?.cameraFocusY ?? 0.5);
    const project = (point, parallax = 1) => {
      const screen = this.camera.worldToScreen(
        {
          x: point.x - cameraOffset.x * parallax,
          y: point.y - cameraOffset.y * parallax,
        },
        viewport,
      );
      return {
        x: focusX + (screen.x - focusX) * presentationZoom,
        y: focusY + (screen.y - focusY) * presentationZoom,
      };
    };
    const scaleX = viewport.presentationWidth / viewport.width;
    const scaleY = viewport.presentationHeight / viewport.height;
    const projectToBacking = (point, parallax = 1) => {
      const screen = project(point, parallax);
      return {
        x: viewport.presentationX + screen.x * scaleX,
        y: viewport.presentationY + screen.y * scaleY,
      };
    };
    const presented = this.scenePresenter.resolve(frame, { project, viewport });
    frame = presented.frame;
    this.lastSceneDiagnostics = presented.diagnostics;
    const worldScale = this.camera.getScale(viewport) * presentationZoom;
    const pixelWorldScale = worldScale * Math.max(scaleX, scaleY);
    if (!transparent) this.drawBackdrop(frame, viewport, projectToBacking, showWorldGrid);
    const plan = createWebGlScenePlan(frame, projectToBacking, pixelWorldScale, { showMesh });
    for (const operation of plan.operations) {
      if (operation.kind === 'depth') {
        this.drawDepthOperation(
          operation,
          frame.palette.outline,
          Math.max(1, Math.max(scaleX, scaleY)),
        );
      } else this.drawPainterOperation(operation, showMesh);
    }

    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    const cpuSubmitMilliseconds = performance.now() - started;
    return Object.freeze({
      renderer: this.backend,
      contextLost: false,
      contextGeneration: this.contextGeneration,
      scenePresentation: presented.diagnostics,
      logicalWidth: viewport.width,
      logicalHeight: viewport.height,
      backingWidth: viewport.backingWidth,
      backingHeight: viewport.backingHeight,
      degenerateItemIds: plan.degenerateItemIds,
      rasterCollapseItemIds: plan.rasterCollapseItemIds,
      cpuSubmitMilliseconds,
      ...this.frameStats,
      batchReallocations: this.batch.reallocations,
    });
  }

  readPixelsForQa() {
    if (this.canvasHost.contextLost)
      throw new Error('WebGL context가 손실되어 QA pixel을 읽을 수 없습니다.');
    const { backingWidth: width, backingHeight: height } = this.canvasHost.viewport;
    const data = new Uint8Array(width * height * 4);
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
    return Object.freeze({ width, height, data });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribeContext?.();
    if (this.resources && !this.canvasHost.contextLost) {
      const gl = this.gl;
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.useProgram(null);
      gl.deleteVertexArray(this.resources.vertexArray);
      gl.deleteBuffer(this.resources.buffer);
      gl.deleteProgram(this.resources.program);
    }
    this.resources = null;
    this.topologyCache.clear();
    this.strokeGeometryCache.clear();
    this.colorCache.clear();
  }
}
