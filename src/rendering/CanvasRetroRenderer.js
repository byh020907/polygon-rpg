import { paintBackdrop, paintSceneItems } from './ScenePainter.js';
import { RetroPostProcessor } from './RetroPostProcessor.js';
import {
  IntegerPixelSurface,
  parsePixelColor,
  replicateIntegerPixels,
} from './IntegerPixelSurface.js';

export function resolveRetroPixelGrid(viewport, pixelSize = 6) {
  if (!Number.isFinite(pixelSize)) throw new TypeError('Retro pixel size must be finite.');
  const boundedPixelSize = Math.max(2, Math.min(10, Math.round(pixelSize)));
  const presentationScale = Math.min(
    viewport.presentationWidth / viewport.width,
    viewport.presentationHeight / viewport.height,
  );
  if (!(presentationScale > 0) || !Number.isFinite(presentationScale))
    throw new TypeError('Retro viewport must have positive finite dimensions.');
  const integerScale = Math.max(2, Math.round(presentationScale * boundedPixelSize));
  const logicalWidth = Math.max(1, Math.ceil(viewport.presentationWidth / integerScale));
  const logicalHeight = Math.max(1, Math.ceil(viewport.presentationHeight / integerScale));
  return Object.freeze({
    logicalWidth,
    logicalHeight,
    integerScale,
    projectionScale: presentationScale / integerScale,
    pixelSize: boundedPixelSize,
    offsetX:
      viewport.presentationX -
      Math.floor((logicalWidth * integerScale - viewport.presentationWidth) / 2),
    offsetY:
      viewport.presentationY -
      Math.floor((logicalHeight * integerScale - viewport.presentationHeight) / 2),
  });
}

function paintIntegerPixelGrid(image, viewport, grid) {
  const left = Math.max(0, viewport.presentationX);
  const top = Math.max(0, viewport.presentationY);
  const right = Math.min(image.width, viewport.presentationX + viewport.presentationWidth);
  const bottom = Math.min(image.height, viewport.presentationY + viewport.presentationHeight);
  const { data } = image;
  const paint = (x, y) => {
    const index = (y * image.width + x) * 4;
    const retainedAlpha = (data[index + 3] / 255) * 0.9;
    const alpha = 0.1 + retainedAlpha;
    data[index] = (226 * 0.1 + data[index] * retainedAlpha) / alpha;
    data[index + 1] = (232 * 0.1 + data[index + 1] * retainedAlpha) / alpha;
    data[index + 2] = (240 * 0.1 + data[index + 2] * retainedAlpha) / alpha;
    data[index + 3] = alpha * 255;
  };
  for (let column = 0; column <= grid.logicalWidth; column += 1) {
    const x = grid.offsetX + column * grid.integerScale;
    if (x < left || x >= right) continue;
    for (let y = top; y < bottom; y += 1) paint(x, y);
  }
  for (let row = 0; row <= grid.logicalHeight; row += 1) {
    const y = grid.offsetY + row * grid.integerScale;
    if (y < top || y >= bottom) continue;
    for (let x = left; x < right; x += 1) {
      if ((x - grid.offsetX) % grid.integerScale !== 0) paint(x, y);
    }
  }
}

export class CanvasRetroRenderer {
  constructor(canvasHost, camera, postProcessor = new RetroPostProcessor()) {
    this.profile = 'retro-pixel';
    this.canvasHost = canvasHost;
    this.camera = camera;
    this.postProcessor = postProcessor;
    this.sceneContext = new IntegerPixelSurface();
    this.foregroundContext = new IntegerPixelSurface();
    this.sceneCanvas = this.sceneContext.canvas;
    this.foregroundCanvas = this.foregroundContext.canvas;
    this.outputImage = null;
  }

  render(
    frame,
    {
      pixelSize = 6,
      pixelSnap = true,
      alphaThresholdEnabled = true,
      alphaThreshold = 128,
      posterizationLevels = 4,
      outlineWidth = 1,
      showMesh = false,
      showPixelGrid = false,
      showWorldGrid = true,
      transparent = false,
    } = {},
  ) {
    const { context: outputContext, viewport } = this.canvasHost;
    const grid = resolveRetroPixelGrid(viewport, pixelSize);
    const { logicalWidth, logicalHeight, integerScale, projectionScale } = grid;
    for (const surface of [this.sceneContext, this.foregroundContext]) {
      surface.resize(logicalWidth, logicalHeight);
      surface.clear();
    }
    const mobileScale = viewport.cssWidth <= 900 ? (frame.artDirection?.mobileCameraScale ?? 1) : 1;
    const presentationZoom = (frame.artDirection?.cameraZoom ?? 1) * mobileScale;
    const focusX = viewport.width / 2;
    const focusY = viewport.height * (frame.artDirection?.cameraFocusY ?? 0.5);
    const project = (point, parallax = 1) => {
      const cameraOffset = frame.cameraOffset ?? { x: 0, y: 0 };
      const base = this.camera.worldToScreen(
        { x: point.x - cameraOffset.x * parallax, y: point.y - cameraOffset.y * parallax },
        viewport,
      );
      const x =
        logicalWidth / 2 +
        (focusX + (base.x - focusX) * presentationZoom - viewport.width / 2) * projectionScale;
      const y =
        logicalHeight / 2 +
        (focusY + (base.y - focusY) * presentationZoom - viewport.height / 2) * projectionScale;
      return { x: pixelSnap ? Math.round(x) : x, y: pixelSnap ? Math.round(y) : y };
    };
    const logicalViewport = { width: logicalWidth, height: logicalHeight };
    if (!transparent)
      paintBackdrop(this.sceneContext, frame, logicalViewport, project, {
        retro: true,
        hardEdges: true,
        showWorldGrid,
      });
    const diagnostics = paintSceneItems(
      this.foregroundContext,
      frame,
      project,
      this.camera.getScale(viewport) * presentationZoom * projectionScale,
      { showMesh, hardEdges: true, silhouetteWidth: outlineWidth },
    );
    this.postProcessor.process(this.foregroundContext, logicalWidth, logicalHeight, {
      alphaThresholdEnabled,
      alphaThreshold,
      posterizationLevels,
      outlineWidth: 0,
      outlineColor: frame.palette.outline,
      preservedTranslucentPixels: diagnostics.translucentPixels,
    });
    this.sceneContext.compositePixels(
      this.foregroundContext.data,
      logicalWidth,
      logicalHeight,
      0,
      0,
    );
    if (
      !this.outputImage ||
      this.outputImage.width !== viewport.backingWidth ||
      this.outputImage.height !== viewport.backingHeight
    ) {
      this.outputImage = outputContext.createImageData(
        viewport.backingWidth,
        viewport.backingHeight,
      );
    }
    const background = parsePixelColor(transparent ? 'transparent' : frame.palette.background);
    const packed = new Uint32Array(new Uint8ClampedArray(background).buffer)[0];
    new Uint32Array(
      this.outputImage.data.buffer,
      this.outputImage.data.byteOffset,
      this.outputImage.data.length / 4,
    ).fill(packed);
    replicateIntegerPixels(this.sceneContext.data, logicalWidth, logicalHeight, integerScale, {
      width: viewport.backingWidth,
      height: viewport.backingHeight,
      offsetX: grid.offsetX,
      offsetY: grid.offsetY,
      clipX: viewport.presentationX,
      clipY: viewport.presentationY,
      clipWidth: viewport.presentationWidth,
      clipHeight: viewport.presentationHeight,
      data: this.outputImage.data,
    });
    if (showPixelGrid) paintIntegerPixelGrid(this.outputImage, viewport, grid);
    outputContext.putImageData(this.outputImage, 0, 0);
    return Object.freeze({
      logicalWidth,
      logicalHeight,
      integerScale,
      projectionScale,
      pixelSize: grid.pixelSize,
      degenerateItemIds: diagnostics.degenerateItemIds,
      rasterCollapseItemIds: diagnostics.rasterCollapseItemIds,
    });
  }
}
