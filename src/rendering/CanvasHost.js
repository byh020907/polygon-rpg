const DEFAULT_MAX_PIXEL_RATIO = 2;
const DEFAULT_MAX_BACKING_PIXELS = 3_000_000;
const DEFAULT_RENDER_WIDTH = 1440;
const DEFAULT_RENDER_HEIGHT = 810;

function positiveDimension(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label}은 양의 유한수여야 합니다.`);
  }
  return value;
}

export class CanvasHost {
  constructor(
    canvas,
    {
      maxPixelRatio = DEFAULT_MAX_PIXEL_RATIO,
      maxBackingPixels = DEFAULT_MAX_BACKING_PIXELS,
      renderWidth = DEFAULT_RENDER_WIDTH,
      renderHeight = DEFAULT_RENDER_HEIGHT,
    } = {},
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
    this.renderWidth = positiveDimension(renderWidth, 'Render width');
    this.renderHeight = positiveDimension(renderHeight, 'Render height');
    this.viewport = Object.freeze({
      width: this.renderWidth,
      height: this.renderHeight,
      cssWidth: 1,
      cssHeight: 1,
      pixelRatio: 1,
      backingWidth: 1,
      backingHeight: 1,
      presentationX: 0,
      presentationY: 0,
      presentationWidth: 1,
      presentationHeight: 1,
    });
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

    const presentationScale = Math.min(
      backingWidth / this.renderWidth,
      backingHeight / this.renderHeight,
    );
    const presentationWidth = Math.max(1, Math.round(this.renderWidth * presentationScale));
    const presentationHeight = Math.max(1, Math.round(this.renderHeight * presentationScale));
    const presentationX = Math.floor((backingWidth - presentationWidth) / 2);
    const presentationY = Math.floor((backingHeight - presentationHeight) / 2);

    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.viewport = Object.freeze({
      width: this.renderWidth,
      height: this.renderHeight,
      cssWidth: width,
      cssHeight: height,
      pixelRatio,
      backingWidth,
      backingHeight,
      presentationX,
      presentationY,
      presentationWidth,
      presentationHeight,
    });
    return this.viewport;
  }
}
