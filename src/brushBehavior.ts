import { clamp01 } from "./colorMath";
import { hashNoise } from "./tooth";
import type { Point, Rgb, Pigment } from "./types";

export interface BrushState {
  pigment: Pigment;
  carriedColor: Rgb;
  carriedLoad: number;
  radius: number;
}

export interface BrushMark {
  coverage: number;
  drag: number;
  edgeBreakup: number;
  deposit: number;
}

export interface BrushBehavior {
  readonly name: string;
  spacing(radius: number): number;
  jitter?(center: Point, step: number, state: BrushState): Point;
  markAt(x: number, y: number, center: Point, direction: Point, state: BrushState): BrushMark;
  // Optional stroke-continuity pass between stamped dabs. This lets image/stamp
  // brushes create bristle drag or wet paint bridges so strokes feel continuous.
  connectorMarkAt?(x: number, y: number, from: Point, to: Point, direction: Point, state: BrushState): BrushMark;
}

export class TexturedRoundBrush implements BrushBehavior {
  readonly name = "Textured round";

  spacing(radius: number): number {
    return radius * 0.28;
  }

  markAt(x: number, y: number, center: Point, direction: Point, state: BrushState): BrushMark {
    const dx = x - center.x;
    const dy = y - center.y;
    const radiusDistance = Math.hypot(dx, dy) / state.radius;
    const strokeDirection = direction.x === 0 && direction.y === 0 ? { x: 1, y: 0 } : direction;
    const cross = {
      x: -strokeDirection.y,
      y: strokeDirection.x,
    };
    const across = dx * cross.x + dy * cross.y;
    const along = dx * strokeDirection.x + dy * strokeDirection.y;
    const bristleBand = Math.floor((across + state.radius) / Math.max(3, state.radius * 0.1));
    const bristleNoise = hashNoise(bristleBand, Math.floor(along / 10), 43);
    const poreNoise = hashNoise(Math.floor(x / 2), Math.floor(y / 2), 83);
    const skipNoise = hashNoise(Math.floor((x + center.x) / 6), Math.floor((y + center.y) / 6), 131);
    const edgeBreakup = (hashNoise(Math.floor(x / 5), Math.floor(y / 5), 211) - 0.5) * Math.max(0, radiusDistance - 0.58);
    const raggedDistance = radiusDistance + edgeBreakup * 0.08;

    if (raggedDistance > 1) {
      return {
        coverage: 0,
        drag: 0,
        edgeBreakup,
        deposit: 0,
      };
    }

    const falloff = (1 - raggedDistance) ** 1.55;
    const streak = 0.55 + bristleNoise * 0.65;
    const pore = 0.72 + poreNoise * 0.38;
    const drySkip = radiusDistance > 0.35 && skipNoise < 0.12 ? 0.28 : 1;
    const coverage = Math.min(1.2, streak * pore * drySkip);

    return {
      coverage,
      drag: bristleNoise,
      edgeBreakup,
      deposit: clamp01(falloff * coverage),
    };
  }
}

interface BrushBitmap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

function channelAt(bitmap: BrushBitmap, x: number, y: number, channel: number): number {
  const wrappedX = ((Math.floor(x) % bitmap.width) + bitmap.width) % bitmap.width;
  const wrappedY = ((Math.floor(y) % bitmap.height) + bitmap.height) % bitmap.height;
  return bitmap.data[(wrappedY * bitmap.width + wrappedX) * 4 + channel] / 255;
}

function stampMaskAt(bitmap: BrushBitmap, x: number, y: number): number {
  const red = channelAt(bitmap, x, y, 0);
  const green = channelAt(bitmap, x, y, 1);
  const blue = channelAt(bitmap, x, y, 2);
  const alpha = channelAt(bitmap, x, y, 3);
  const brightness = Math.max(red, green, blue);
  const saturation = brightness - Math.min(red, green, blue);

  return clamp01(Math.max(brightness * 0.95, saturation * 1.45) * alpha);
}

function textureValueAt(bitmap: BrushBitmap, x: number, y: number): number {
  const red = channelAt(bitmap, x, y, 0);
  const green = channelAt(bitmap, x, y, 1);
  const blue = channelAt(bitmap, x, y, 2);
  const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

  return clamp01(0.45 + (1 - luminance) * 0.75);
}

async function loadBitmap(url: string): Promise<BrushBitmap> {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error(`Could not read brush image: ${url}`);
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return {
    width: canvas.width,
    height: canvas.height,
    data: imageData.data,
  };
}

export class ImageStampBrush implements BrushBehavior {
  readonly name = "Image stamp watercolor";

  constructor(
    private readonly stamp: BrushBitmap,
    private readonly texture: BrushBitmap,
  ) {}

  spacing(radius: number): number {
    return radius * 0.28;
  }

  jitter(center: Point, step: number, state: BrushState): Point {
    const amount = state.radius * 0.46;
    const seedX = Math.floor(center.x * 0.37 + step * 19);
    const seedY = Math.floor(center.y * 0.37 - step * 23);

    return {
      x: (hashNoise(seedX, seedY, 401) - 0.5) * amount,
      y: (hashNoise(seedY, seedX, 619) - 0.5) * amount,
    };
  }

  markAt(x: number, y: number, center: Point, direction: Point, state: BrushState): BrushMark {
    const strokeDirection = direction.x === 0 && direction.y === 0 ? { x: 1, y: 0 } : direction;
    const cross = {
      x: -strokeDirection.y,
      y: strokeDirection.x,
    };
    const localX = x - center.x;
    const localY = y - center.y;
    const across = localX * cross.x + localY * cross.y;
    const along = localX * strokeDirection.x + localY * strokeDirection.y;
    const u = (across / (state.radius * 2) + 0.5) * this.stamp.width;
    const v = (along / (state.radius * 2) + 0.5) * this.stamp.height;
    const mask = stampMaskAt(this.stamp, u, v);

    if (mask < 0.05) {
      return {
        coverage: 0,
        drag: 0,
        edgeBreakup: 0,
        deposit: 0,
      };
    }

    const texture = textureValueAt(this.texture, x * 1.7 + u * 0.11, y * 1.7 + v * 0.11);
    const internalVariation = 0.72 + hashNoise(Math.floor(u / 5), Math.floor(v / 5), 307) * 0.4;
    const coverage = clamp01(mask * texture * internalVariation);

    return {
      coverage,
      drag: texture,
      edgeBreakup: 1 - mask,
      deposit: clamp01(coverage ** 1.15),
    };
  }

  connectorMarkAt(x: number, y: number, from: Point, to: Point, direction: Point, state: BrushState): BrushMark {
    const length = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
    const projection = ((x - from.x) * direction.x + (y - from.y) * direction.y) / length;

    if (projection < 0 || projection > 1) {
      return {
        coverage: 0,
        drag: 0,
        edgeBreakup: 0,
        deposit: 0,
      };
    }

    const nearest = {
      x: from.x + direction.x * projection * length,
      y: from.y + direction.y * projection * length,
    };
    const crossDistance = Math.hypot(x - nearest.x, y - nearest.y) / state.radius;

    if (crossDistance > 0.9) {
      return {
        coverage: 0,
        drag: 0,
        edgeBreakup: 0,
        deposit: 0,
      };
    }

    const texture = textureValueAt(this.texture, x * 1.9, y * 1.9);
    const bristle = hashNoise(Math.floor((x * -direction.y + y * direction.x) / 4), Math.floor(projection * 61), 941);
    const centerFalloff = (1 - crossDistance / 0.9) ** 1.35;
    const taper = Math.sin(projection * Math.PI) ** 0.35;
    const coverage = clamp01(centerFalloff * taper * texture * (0.72 + bristle * 0.52));

    return {
      coverage,
      drag: texture,
      edgeBreakup: crossDistance,
      deposit: coverage * 0.62,
    };
  }
}

export async function loadImageStampBrush(stampUrl: string, textureUrl: string): Promise<ImageStampBrush> {
  const [stamp, texture] = await Promise.all([loadBitmap(stampUrl), loadBitmap(textureUrl)]);
  return new ImageStampBrush(stamp, texture);
}
