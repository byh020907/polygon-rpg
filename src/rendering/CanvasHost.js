const DEFAULT_MAX_PIXEL_RATIO = 2;
const DEFAULT_MAX_BACKING_PIXELS = 3_000_000;

export class CanvasHost {
  constructor(
    canvas,
    { maxPixelRatio = DEFAULT_MAX_PIXEL_RATIO, maxBackingPixels = DEFAULT_MAX_BACKING_PIXELS } = {},
  ) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('CanvasHost에는 HTMLCanvasElement가 필요합니다.');
    }

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context를 생성할 수 없습니다.');
    }

    this.canvas = canvas;
    this.context = context;
    this.maxPixelRatio = maxPixelRatio;
    this.maxBackingPixels = maxBackingPixels;
    this.viewport = Object.freeze({ width: 1, height: 1, pixelRatio: 1 });
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    const requestedPixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
    const budgetPixelRatio = Math.sqrt(this.maxBackingPixels / (width * height));
    const pixelRatio = Math.max(1, Math.min(requestedPixelRatio, budgetPixelRatio));
    const backingWidth = Math.max(1, Math.round(width * pixelRatio));
    const backingHeight = Math.max(1, Math.round(height * pixelRatio));

    if (this.canvas.width !== backingWidth || this.canvas.height !== backingHeight) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
    }

    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.viewport = Object.freeze({ width, height, pixelRatio, backingWidth, backingHeight });
    return this.viewport;
  }
}
