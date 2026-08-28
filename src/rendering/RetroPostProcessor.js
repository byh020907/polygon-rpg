function parseHexColor(hexColor) {
  const normalized = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new TypeError(`지원하지 않는 색상 형식입니다: ${hexColor}`);
  }
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export class RetroPostProcessor {
  constructor() {
    this.sourcePixels = new Uint8ClampedArray(0);
  }

  process(
    context,
    width,
    height,
    {
      alphaThresholdEnabled = true,
      alphaThreshold = 128,
      posterizationLevels = 4,
      outlineWidth = 1,
      outlineColor = '#171525',
    } = {},
  ) {
    const imageData = context.getImageData(0, 0, width, height);
    if (alphaThresholdEnabled) {
      this.applyAlphaThreshold(imageData, alphaThreshold);
    }
    this.applyPosterization(imageData, posterizationLevels);
    if (outlineWidth > 0) {
      this.applyOutline(imageData, width, height, outlineWidth, outlineColor);
    }
    context.putImageData(imageData, 0, 0);
    return imageData;
  }

  applyAlphaThreshold(imageData, threshold) {
    const pixels = imageData.data;
    const boundedThreshold = Math.max(0, Math.min(255, threshold));
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] >= boundedThreshold) {
        pixels[index + 3] = 255;
        continue;
      }
      pixels[index] = 0;
      pixels[index + 1] = 0;
      pixels[index + 2] = 0;
      pixels[index + 3] = 0;
    }
  }

  applyPosterization(imageData, levels) {
    const pixels = imageData.data;
    const boundedLevels = Math.max(2, Math.min(8, Math.round(levels)));
    const interval = 255 / (boundedLevels - 1);
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] === 0) continue;
      pixels[index] = Math.round(pixels[index] / interval) * interval;
      pixels[index + 1] = Math.round(pixels[index + 1] / interval) * interval;
      pixels[index + 2] = Math.round(pixels[index + 2] / interval) * interval;
    }
  }

  applyOutline(imageData, width, height, outlineWidth, outlineColor) {
    const outputPixels = imageData.data;
    if (this.sourcePixels.length !== outputPixels.length) {
      this.sourcePixels = new Uint8ClampedArray(outputPixels.length);
    }
    this.sourcePixels.set(outputPixels);

    const sourcePixels = this.sourcePixels;
    const radius = Math.max(0, Math.min(2, Math.round(outlineWidth)));
    const color = parseHexColor(outlineColor);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const outputIndex = (y * width + x) * 4;
        if (sourcePixels[outputIndex + 3] > 0) continue;

        let touchesOpaquePixel = false;
        for (let offsetY = -radius; offsetY <= radius && !touchesOpaquePixel; offsetY += 1) {
          const neighborY = y + offsetY;
          if (neighborY < 0 || neighborY >= height) continue;
          for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) continue;
            const neighborX = x + offsetX;
            if (neighborX < 0 || neighborX >= width) continue;
            const neighborIndex = (neighborY * width + neighborX) * 4;
            if (sourcePixels[neighborIndex + 3] > 0) {
              touchesOpaquePixel = true;
              break;
            }
          }
        }

        if (!touchesOpaquePixel) continue;
        outputPixels[outputIndex] = color.red;
        outputPixels[outputIndex + 1] = color.green;
        outputPixels[outputIndex + 2] = color.blue;
        outputPixels[outputIndex + 3] = 255;
      }
    }
  }
}
