function integer(value, label, minimum = -Infinity) {
  if (!Number.isSafeInteger(value) || value < minimum)
    throw new TypeError(`${label} must be an integer${minimum === 0 ? ' >= 0' : ''}.`);
  return value;
}

const COLOR_CACHE = new Map();
const PACKED_COLOR_CACHE = new WeakMap();
function packedPixels(data) {
  return data.buffer && data.byteOffset % 4 === 0
    ? new Uint32Array(data.buffer, data.byteOffset, data.length / 4)
    : new Uint32Array(new Uint8ClampedArray(data).buffer);
}
function packedColor(color) {
  if (!PACKED_COLOR_CACHE.has(color))
    PACKED_COLOR_CACHE.set(color, packedPixels(new Uint8ClampedArray(color))[0]);
  return PACKED_COLOR_CACHE.get(color);
}
export function parsePixelColor(value) {
  if (COLOR_CACHE.has(value)) return COLOR_CACHE.get(value);
  if (typeof value !== 'string')
    throw new TypeError('Pixel color must be a CSS hex or rgb string.');
  let color;
  const input = value.trim().toLowerCase();
  const named = { transparent: [0, 0, 0, 0], black: [0, 0, 0, 255], white: [255, 255, 255, 255] };
  if (named[input]) color = named[input];
  else if (/^#[\da-f]{3,4}$/.test(input))
    color = [...input.slice(1)].map((digit) => parseInt(digit + digit, 16));
  else if (/^#(?:[\da-f]{6}|[\da-f]{8})$/.test(input))
    color = input
      .slice(1)
      .match(/../g)
      .map((pair) => parseInt(pair, 16));
  else {
    const match = /^rgba?\(([^)]+)\)$/.exec(input);
    if (!match) throw new TypeError(`Unsupported pixel color: ${value}`);
    const components = match[1].trim().split(/[\s,/]+/);
    if (
      components.length < 3 ||
      components.length > 4 ||
      components.some((part) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(part))
    )
      throw new TypeError(`Invalid pixel color: ${value}`);
    color = components.map((part, index) => {
      const percent = part.endsWith('%');
      const number = parseFloat(part);
      const channel =
        index < 3
          ? percent
            ? (number * 255) / 100
            : number
          : (number * 255) / (percent ? 100 : 1);
      return Math.round(Math.max(0, Math.min(255, channel)));
    });
  }
  if (color.length === 3) color.push(255);
  const result = Object.freeze(color);
  if (COLOR_CACHE.size >= 512) COLOR_CACHE.delete(COLOR_CACHE.keys().next().value);
  COLOR_CACHE.set(value, result);
  return result;
}

function blend(data, index, red, green, blue, alpha) {
  if (alpha <= 0) return;
  if (alpha >= 255) {
    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
    data[index + 3] = 255;
    return;
  }
  const sourceAlpha = alpha / 255;
  const destinationAlpha = data[index + 3] / 255;
  const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
  const retained = destinationAlpha * (1 - sourceAlpha);
  data[index] = (red * sourceAlpha + data[index] * retained) / outputAlpha;
  data[index + 1] = (green * sourceAlpha + data[index + 1] * retained) / outputAlpha;
  data[index + 2] = (blue * sourceAlpha + data[index + 2] * retained) / outputAlpha;
  data[index + 3] = outputAlpha * 255;
}

export class IntegerPixelSurface {
  constructor(width = 1, height = 1) {
    this.isIntegerPixelSurface = true;
    this.canvas = { width: 0, height: 0 };
    this.data = new Uint8ClampedArray(0);
    this._fillStyle = '#000000';
    this.color = parsePixelColor(this._fillStyle);
    this.packedFill = packedColor(this.color);
    this._globalAlpha = 1;
    this.states = [];
    this.resize(width, height);
  }

  get fillStyle() {
    return this._fillStyle;
  }
  set fillStyle(value) {
    this.color = parsePixelColor(value);
    this.packedFill = packedColor(this.color);
    this._fillStyle = value;
  }
  get globalAlpha() {
    return this._globalAlpha;
  }
  set globalAlpha(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new TypeError('globalAlpha must be between 0 and 1.');
    this._globalAlpha = value;
  }

  resize(width, height) {
    integer(width, 'width', 0);
    integer(height, 'height', 0);
    if (width * height > 16_777_216)
      throw new RangeError('Integer surface exceeds the pixel budget.');
    if (width === this.canvas.width && height === this.canvas.height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    this.pixels = packedPixels(this.data);
  }

  clear() {
    this.data.fill(0);
    this.globalAlpha = 1;
    this.states.length = 0;
  }
  save() {
    this.states.push({ fillStyle: this.fillStyle, globalAlpha: this.globalAlpha });
  }
  restore() {
    const state = this.states.pop();
    if (state) {
      this.fillStyle = state.fillStyle;
      this.globalAlpha = state.globalAlpha;
    }
  }
  getTransform() {
    return Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  }

  fillRect(x, y, width, height) {
    integer(x, 'x');
    integer(y, 'y');
    integer(width, 'width');
    integer(height, 'height');
    const left = Math.max(0, Math.min(x, x + width));
    const top = Math.max(0, Math.min(y, y + height));
    const right = Math.min(this.canvas.width, Math.max(x, x + width));
    const bottom = Math.min(this.canvas.height, Math.max(y, y + height));
    const [red, green, blue, alpha] = this.color;
    if (right <= left || bottom <= top || alpha === 0 || this.globalAlpha === 0) return;
    if (alpha === 255 && this.globalAlpha === 1) {
      for (let row = top; row < bottom; row += 1)
        this.pixels.fill(
          this.packedFill,
          row * this.canvas.width + left,
          row * this.canvas.width + right,
        );
      return;
    }
    for (let row = top; row < bottom; row += 1) {
      let index = (row * this.canvas.width + left) * 4;
      for (let column = left; column < right; column += 1, index += 4)
        blend(this.data, index, red, green, blue, alpha * this.globalAlpha);
    }
  }

  clearRect(x, y, width, height) {
    integer(x, 'x');
    integer(y, 'y');
    integer(width, 'width');
    integer(height, 'height');
    const left = Math.max(0, Math.min(x, x + width)),
      top = Math.max(0, Math.min(y, y + height));
    const right = Math.min(this.canvas.width, Math.max(x, x + width)),
      bottom = Math.min(this.canvas.height, Math.max(y, y + height));
    if (right <= left) return;
    for (let row = top; row < bottom; row += 1)
      this.data.fill(
        0,
        (row * this.canvas.width + left) * 4,
        (row * this.canvas.width + right) * 4,
      );
  }

  compositePixels(raw, width, height, dx = 0, dy = 0) {
    integer(width, 'source width', 0);
    integer(height, 'source height', 0);
    integer(dx, 'dx');
    integer(dy, 'dy');
    if (raw.length !== width * height * 4)
      throw new TypeError('RGBA buffer size does not match source dimensions.');
    const source = raw.buffer === this.data.buffer ? raw.slice() : raw;
    const sourcePixels = packedPixels(source);
    const opacity = this.globalAlpha;
    for (let y = Math.max(0, -dy); y < Math.min(height, this.canvas.height - dy); y += 1) {
      for (let x = Math.max(0, -dx); x < Math.min(width, this.canvas.width - dx); x += 1) {
        const index = (y * width + x) * 4;
        if (source[index + 3] === 0) continue;
        const destinationPixel = (y + dy) * this.canvas.width + x + dx;
        if (source[index + 3] === 255 && opacity === 1) {
          this.pixels[destinationPixel] = sourcePixels[y * width + x];
          continue;
        }
        blend(
          this.data,
          destinationPixel * 4,
          source[index],
          source[index + 1],
          source[index + 2],
          source[index + 3] * opacity,
        );
      }
    }
  }

  getImageData(x, y, width, height) {
    integer(x, 'x');
    integer(y, 'y');
    integer(width, 'width', 0);
    integer(height, 'height', 0);
    if (x === 0 && y === 0 && width === this.canvas.width && height === this.canvas.height)
      return { width, height, data: this.data.slice() };
    const result = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row += 1)
      for (let column = 0; column < width; column += 1) {
        if (
          x + column < 0 ||
          x + column >= this.canvas.width ||
          y + row < 0 ||
          y + row >= this.canvas.height
        )
          continue;
        const start = ((y + row) * this.canvas.width + x + column) * 4;
        result.set(this.data.subarray(start, start + 4), (row * width + column) * 4);
      }
    return { width, height, data: result };
  }

  putImageData(image, dx, dy) {
    integer(dx, 'dx');
    integer(dy, 'dy');
    integer(image.width, 'image width', 0);
    integer(image.height, 'image height', 0);
    if (image.data.length !== image.width * image.height * 4)
      throw new TypeError('Invalid image data.');
    for (
      let row = Math.max(0, -dy);
      row < Math.min(image.height, this.canvas.height - dy);
      row += 1
    ) {
      const left = Math.max(0, -dx),
        right = Math.min(image.width, this.canvas.width - dx);
      if (right <= left) continue;
      this.data.set(
        image.data.subarray((row * image.width + left) * 4, (row * image.width + right) * 4),
        ((row + dy) * this.canvas.width + left + dx) * 4,
      );
    }
  }
}

// Each source pixel becomes one identical N×N block. Only the outer crop can be partial.
export function replicateIntegerPixels(
  source,
  sourceWidth,
  sourceHeight,
  scale,
  {
    width = sourceWidth * scale,
    height = sourceHeight * scale,
    offsetX = 0,
    offsetY = 0,
    clipX = 0,
    clipY = 0,
    clipWidth = width,
    clipHeight = height,
    data = new Uint8ClampedArray(width * height * 4),
  } = {},
) {
  for (const [name, value] of Object.entries({
    sourceWidth,
    sourceHeight,
    scale,
    width,
    height,
    offsetX,
    offsetY,
    clipX,
    clipY,
    clipWidth,
    clipHeight,
  }))
    integer(value, name);
  if (
    scale < 1 ||
    sourceWidth < 0 ||
    sourceHeight < 0 ||
    width < 0 ||
    height < 0 ||
    data.length !== width * height * 4 ||
    source.length !== sourceWidth * sourceHeight * 4
  )
    throw new RangeError('Invalid integer replication dimensions.');
  const left = Math.max(0, offsetX, clipX),
    right = Math.min(width, offsetX + sourceWidth * scale, clipX + clipWidth);
  const sourceWords = packedPixels(source.buffer === data.buffer ? source.slice() : source);
  const outputWords = packedPixels(data);
  const firstSourceX = Math.max(0, Math.floor((left - offsetX) / scale));
  const endSourceX = Math.min(sourceWidth, Math.ceil((right - offsetX) / scale));
  for (let sy = 0; sy < sourceHeight; sy += 1) {
    const top = Math.max(0, offsetY + sy * scale, clipY),
      bottom = Math.min(height, offsetY + (sy + 1) * scale, clipY + clipHeight);
    if (bottom <= top || right <= left) continue;
    for (let sx = firstSourceX; sx < endSourceX; sx += 1) {
      const start = Math.max(left, offsetX + sx * scale);
      const end = Math.min(right, offsetX + (sx + 1) * scale);
      outputWords.fill(sourceWords[sy * sourceWidth + sx], top * width + start, top * width + end);
    }
    const row = outputWords.subarray(top * width + left, top * width + right);
    for (let y = top + 1; y < bottom; y += 1) outputWords.set(row, y * width + left);
  }
  if (outputWords.buffer !== data.buffer) data.set(new Uint8ClampedArray(outputWords.buffer));
  return { width, height, data };
}
