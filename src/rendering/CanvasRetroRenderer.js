import { paintBackdrop, paintSceneItems } from './ScenePainter.js';
import { RetroPostProcessor } from './RetroPostProcessor.js';

function createCanvas() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Retro Renderer용 Canvas context를 생성할 수 없습니다.');
  }
  return { canvas, context };
}

function resizeCanvas(canvas, width, height) {
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
}

export class CanvasRetroRenderer {
  constructor(canvasHost, camera, postProcessor = new RetroPostProcessor()) {
    this.profile = 'retro-pixel';
    this.canvasHost = canvasHost;
    this.camera = camera;
    this.postProcessor = postProcessor;

    const sceneSurface = createCanvas();
    this.sceneCanvas = sceneSurface.canvas;
    this.sceneContext = sceneSurface.context;

    const foregroundSurface = createCanvas();
    this.foregroundCanvas = foregroundSurface.canvas;
    this.foregroundContext = foregroundSurface.context;
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
    } = {},
  ) {
    const { context: outputContext, viewport } = this.canvasHost;
    const boundedPixelSize = Math.max(2, Math.min(10, Math.round(pixelSize)));
    const logicalWidth = Math.max(1, Math.ceil(viewport.width / boundedPixelSize));
    const logicalHeight = Math.max(1, Math.ceil(viewport.height / boundedPixelSize));

    resizeCanvas(this.sceneCanvas, logicalWidth, logicalHeight);
    resizeCanvas(this.foregroundCanvas, logicalWidth, logicalHeight);

    this.sceneContext.setTransform(1, 0, 0, 1, 0, 0);
    this.sceneContext.clearRect(0, 0, logicalWidth, logicalHeight);
    this.sceneContext.imageSmoothingEnabled = false;

    this.foregroundContext.setTransform(1, 0, 0, 1, 0, 0);
    this.foregroundContext.clearRect(0, 0, logicalWidth, logicalHeight);
    this.foregroundContext.imageSmoothingEnabled = false;

    const project = (worldPosition) => {
      const screenPosition = this.camera.worldToScreen(worldPosition, viewport);
      const logicalX = screenPosition.x / boundedPixelSize;
      const logicalY = screenPosition.y / boundedPixelSize;
      return {
        x: pixelSnap ? Math.round(logicalX) : logicalX,
        y: pixelSnap ? Math.round(logicalY) : logicalY,
      };
    };
    const logicalViewport = {
      width: logicalWidth,
      height: logicalHeight,
    };
    const logicalWorldScale = this.camera.getScale(viewport) / boundedPixelSize;

    paintBackdrop(this.sceneContext, frame, logicalViewport, project, {
      retro: true,
      showWorldGrid,
    });
    paintSceneItems(this.foregroundContext, frame, project, logicalWorldScale, { showMesh });

    this.postProcessor.process(this.foregroundContext, logicalWidth, logicalHeight, {
      alphaThresholdEnabled,
      alphaThreshold,
      posterizationLevels,
      outlineWidth,
      outlineColor: frame.palette.outline,
    });
    this.sceneContext.drawImage(this.foregroundCanvas, 0, 0);

    outputContext.setTransform(1, 0, 0, 1, 0, 0);
    outputContext.clearRect(0, 0, viewport.backingWidth, viewport.backingHeight);
    outputContext.imageSmoothingEnabled = false;
    outputContext.drawImage(
      this.sceneCanvas,
      0,
      0,
      logicalWidth,
      logicalHeight,
      0,
      0,
      viewport.backingWidth,
      viewport.backingHeight,
    );

    if (showPixelGrid) {
      this.drawPixelGrid(outputContext, viewport, boundedPixelSize);
    }

    return Object.freeze({ logicalWidth, logicalHeight, pixelSize: boundedPixelSize });
  }

  drawPixelGrid(context, viewport, pixelSize) {
    const deviceCellSize = pixelSize * viewport.pixelRatio;
    context.save();
    context.strokeStyle = 'rgb(226 232 240 / 10%)';
    context.lineWidth = 1;
    for (let x = 0; x <= viewport.backingWidth; x += deviceCellSize) {
      context.beginPath();
      context.moveTo(Math.round(x) + 0.5, 0);
      context.lineTo(Math.round(x) + 0.5, viewport.backingHeight);
      context.stroke();
    }
    for (let y = 0; y <= viewport.backingHeight; y += deviceCellSize) {
      context.beginPath();
      context.moveTo(0, Math.round(y) + 0.5);
      context.lineTo(viewport.backingWidth, Math.round(y) + 0.5);
      context.stroke();
    }
    context.restore();
  }
}
