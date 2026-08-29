import { paintBackdrop, paintSceneItems } from './ScenePainter.js';

export class CanvasPolygonRenderer {
  constructor(canvasHost, camera) {
    this.profile = 'polygon';
    this.canvasHost = canvasHost;
    this.camera = camera;
  }

  render(frame, { showMesh = false, showWorldGrid = true } = {}) {
    const { context, viewport } = this.canvasHost;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = true;
    context.clearRect(0, 0, viewport.backingWidth, viewport.backingHeight);
    context.fillStyle = frame.palette.background;
    context.fillRect(0, 0, viewport.backingWidth, viewport.backingHeight);
    context.save();
    context.translate(viewport.presentationX, viewport.presentationY);
    context.scale(
      viewport.presentationWidth / viewport.width,
      viewport.presentationHeight / viewport.height,
    );

    const cameraOffset = frame.cameraOffset ?? { x: 0, y: 0 };
    const project = (point) =>
      this.camera.worldToScreen(
        { x: point.x - cameraOffset.x, y: point.y - cameraOffset.y },
        viewport,
      );
    const worldScale = this.camera.getScale(viewport);
    paintBackdrop(context, frame, viewport, project, { showWorldGrid });
    const diagnostics = paintSceneItems(context, frame, project, worldScale, { showMesh });
    context.restore();
    return Object.freeze({
      logicalWidth: viewport.width,
      logicalHeight: viewport.height,
      degenerateItemIds: diagnostics.degenerateItemIds,
      rasterCollapseItemIds: diagnostics.rasterCollapseItemIds,
    });
  }
}
