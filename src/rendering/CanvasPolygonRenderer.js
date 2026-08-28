import { paintBackdrop, paintSceneItems } from './ScenePainter.js';

export class CanvasPolygonRenderer {
  constructor(canvasHost, camera) {
    this.profile = 'polygon';
    this.canvasHost = canvasHost;
    this.camera = camera;
  }

  render(frame, { showMesh = false, showWorldGrid = true } = {}) {
    const { context, viewport } = this.canvasHost;
    context.setTransform(viewport.pixelRatio, 0, 0, viewport.pixelRatio, 0, 0);
    context.imageSmoothingEnabled = true;
    context.clearRect(0, 0, viewport.width, viewport.height);

    const project = (point) => this.camera.worldToScreen(point, viewport);
    const worldScale = this.camera.getScale(viewport);
    paintBackdrop(context, frame, viewport, project, { showWorldGrid });
    paintSceneItems(context, frame, project, worldScale, { showMesh });
  }
}
