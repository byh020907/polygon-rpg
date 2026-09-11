const DEFAULT_MAX_PIXEL_RATIO = 2;
const DEFAULT_MAX_BACKING_PIXELS = 3_000_000;
const DEFAULT_RENDER_WIDTH = 1440;
const DEFAULT_RENDER_HEIGHT = 810;

export const WEB_GL_CONTEXT_ATTRIBUTES = Object.freeze({
  alpha: true,
  antialias: true,
  depth: true,
  stencil: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
});

function positiveDimension(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label}은 양의 유한수여야 합니다.`);
  }
  return value;
}

export class WebGl2UnsupportedError extends Error {
  constructor() {
    super('이 기기는 Polygon RPG에 필요한 WebGL2 그래픽을 지원하지 않습니다.');
    this.name = 'WebGl2UnsupportedError';
  }
}

export class WebGlCanvasHost {
  constructor(
    canvas,
    {
      maxPixelRatio = DEFAULT_MAX_PIXEL_RATIO,
      maxBackingPixels = DEFAULT_MAX_BACKING_PIXELS,
      renderWidth = DEFAULT_RENDER_WIDTH,
      renderHeight = DEFAULT_RENDER_HEIGHT,
      contextAttributes = {},
    } = {},
  ) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('WebGlCanvasHost에는 HTMLCanvasElement가 필요합니다.');
    }
    const context = canvas.getContext('webgl2', {
      ...WEB_GL_CONTEXT_ATTRIBUTES,
      ...contextAttributes,
    });
    if (!context) throw new WebGl2UnsupportedError();

    this.canvas = canvas;
    this.context = context;
    this.maxPixelRatio = maxPixelRatio;
    this.maxBackingPixels = maxBackingPixels;
    this.renderWidth = positiveDimension(renderWidth, 'Render width');
    this.renderHeight = positiveDimension(renderHeight, 'Render height');
    this.contextLost = false;
    this.destroyed = false;
    this.contextListeners = new Set();
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
    this.onContextLost = (event) => {
      event.preventDefault();
      this.contextLost = true;
      for (const listener of this.contextListeners) listener('lost');
    };
    this.onContextRestored = () => {
      this.contextLost = false;
      for (const listener of this.contextListeners) listener('restored');
    };
    this.listensForContextEvents = typeof canvas.addEventListener === 'function';
    if (this.listensForContextEvents) {
      canvas.addEventListener('webglcontextlost', this.onContextLost, false);
      canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
    }
  }

  subscribeContext(listener) {
    if (typeof listener !== 'function') throw new TypeError('Context listener가 필요합니다.');
    this.contextListeners.add(listener);
    return () => this.contextListeners.delete(listener);
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
    this.viewport = Object.freeze({
      width: this.renderWidth,
      height: this.renderHeight,
      cssWidth: width,
      cssHeight: height,
      pixelRatio,
      backingWidth,
      backingHeight,
      presentationX: Math.floor((backingWidth - presentationWidth) / 2),
      presentationY: Math.floor((backingHeight - presentationHeight) / 2),
      presentationWidth,
      presentationHeight,
    });
    return this.viewport;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.listensForContextEvents && typeof this.canvas.removeEventListener === 'function') {
      this.canvas.removeEventListener('webglcontextlost', this.onContextLost, false);
      this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored, false);
    }
    this.contextListeners.clear();
  }
}
