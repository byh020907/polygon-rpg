export class Camera2D {
  constructor({ x = 480, y = 270, zoom = 1, worldWidth = 960, worldHeight = 540 } = {}) {
    this.position = { x, y };
    this.zoom = zoom;
    this.worldSize = { width: worldWidth, height: worldHeight };
  }

  getScale(viewport) {
    const fitScale = Math.min(
      viewport.width / this.worldSize.width,
      viewport.height / this.worldSize.height,
    );
    return fitScale * this.zoom;
  }

  worldToScreen(worldPosition, viewport) {
    const scale = this.getScale(viewport);
    return {
      x: (worldPosition.x - this.position.x) * scale + viewport.width / 2,
      y: (worldPosition.y - this.position.y) * scale + viewport.height / 2,
    };
  }
}
