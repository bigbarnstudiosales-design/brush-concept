import { mixCarriedPaint, mixPigmentsAbsorption } from "./pigment";
import { generateTooth } from "./tooth";
import { decayBuffer } from "./wetness";
import type { Point, Rgb, ViewMode } from "./types";

interface BrushState {
  color: Rgb;
  carriedColor: Rgb;
  carriedLoad: number;
}

const PAPER: Rgb = [0.94, 0.92, 0.86];
const BRUSH_RADIUS = 18;
const WETNESS_DECAY = 0.22;
const LOAD_DECAY = 0.08;

export const pigmentPalette: Rgb[] = [
  [0.79, 0.08, 0.05],
  [0.96, 0.67, 0.08],
  [0.06, 0.32, 0.75],
  [0.08, 0.47, 0.2],
  [0.42, 0.13, 0.62],
  [0.08, 0.07, 0.05],
];

export class PaintEngine {
  readonly width: number;
  readonly height: number;
  readonly color: Float32Array;
  readonly wetness: Float32Array;
  readonly load: Float32Array;
  readonly tooth: Float32Array;

  private readonly context: CanvasRenderingContext2D;
  private readonly imageData: ImageData;
  private brush: BrushState = {
    color: pigmentPalette[0],
    carriedColor: pigmentPalette[0],
    carriedLoad: 1,
  };

  viewMode: ViewMode = "color";

  constructor(private readonly canvas: HTMLCanvasElement, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Could not create 2D canvas context.");
    }

    this.context = context;
    this.imageData = context.createImageData(width, height);
    this.color = new Float32Array(width * height * 3);
    this.wetness = new Float32Array(width * height);
    this.load = new Float32Array(width * height);
    this.tooth = generateTooth(width, height);

    this.clear();
  }

  clear(): void {
    for (let index = 0; index < this.width * this.height; index += 1) {
      this.writeColor(index, PAPER);
      this.wetness[index] = 0;
      this.load[index] = 0;
    }
    this.render();
  }

  setBrushColor(color: Rgb): void {
    this.brush = {
      color,
      carriedColor: color,
      carriedLoad: 1,
    };
  }

  decay(deltaSeconds: number): void {
    decayBuffer(this.wetness, WETNESS_DECAY, deltaSeconds);
    decayBuffer(this.load, LOAD_DECAY, deltaSeconds);
  }

  stroke(from: Point, to: Point): void {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / (BRUSH_RADIUS * 0.35)));
    const direction = distance > 0 ? { x: (to.x - from.x) / distance, y: (to.y - from.y) / distance } : { x: 0, y: 0 };

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      this.dab(
        {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        },
        direction,
      );
    }
  }

  render(): void {
    const pixels = this.imageData.data;

    for (let index = 0; index < this.width * this.height; index += 1) {
      const pixel = index * 4;
      const colorIndex = index * 3;
      const debugValue =
        this.viewMode === "wetness" ? this.wetness[index] : this.viewMode === "load" ? this.load[index] : this.tooth[index];

      if (this.viewMode === "color") {
        pixels[pixel] = this.toByte(this.color[colorIndex]);
        pixels[pixel + 1] = this.toByte(this.color[colorIndex + 1]);
        pixels[pixel + 2] = this.toByte(this.color[colorIndex + 2]);
      } else if (this.viewMode === "wetness") {
        pixels[pixel] = this.toByte(debugValue * 0.15);
        pixels[pixel + 1] = this.toByte(debugValue * 0.45);
        pixels[pixel + 2] = this.toByte(debugValue);
      } else if (this.viewMode === "load") {
        pixels[pixel] = this.toByte(debugValue);
        pixels[pixel + 1] = this.toByte(debugValue * 0.6);
        pixels[pixel + 2] = this.toByte(debugValue * 0.15);
      } else {
        pixels[pixel] = this.toByte(debugValue);
        pixels[pixel + 1] = this.toByte(debugValue);
        pixels[pixel + 2] = this.toByte(debugValue);
      }

      pixels[pixel + 3] = 255;
    }

    this.context.putImageData(this.imageData, 0, 0);
  }

  private dab(center: Point, direction: Point): void {
    const minX = Math.max(0, Math.floor(center.x - BRUSH_RADIUS));
    const maxX = Math.min(this.width - 1, Math.ceil(center.x + BRUSH_RADIUS));
    const minY = Math.max(0, Math.floor(center.y - BRUSH_RADIUS));
    const maxY = Math.min(this.height - 1, Math.ceil(center.y + BRUSH_RADIUS));

    let pickedColor: Rgb = this.brush.carriedColor;
    let pickupWeight = 0;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - center.x;
        const dy = y - center.y;
        const radiusDistance = Math.hypot(dx, dy) / BRUSH_RADIUS;

        if (radiusDistance > 1) {
          continue;
        }

        const index = y * this.width + x;
        const falloff = (1 - radiusDistance) ** 1.8;
        const toothGrip = this.tooth[index];
        const paintAmount = falloff * toothGrip * (0.12 + this.brush.carriedLoad * 0.2);
        const current = this.readColor(index);

        // A dab does four simple natural-media jobs:
        // 1. Smear the existing wet paint along the stroke direction.
        // 2. Pick up some of the local color into the virtual brush.
        // 3. Deposit carried pigment through the tooth texture.
        // 4. Leave wetness/load behind so later dabs can interact with it.
        const smeared = this.smearFrom(x, y, direction, falloff);
        const wetInfluence = Math.min(1, this.wetness[index] + paintAmount);
        const afterSmear = mixPigmentsAbsorption(current, smeared, wetInfluence * 0.24);
        const afterDeposit = mixPigmentsAbsorption(afterSmear, this.brush.carriedColor, paintAmount);

        this.writeColor(index, afterDeposit);
        this.wetness[index] = Math.min(1, this.wetness[index] + paintAmount * 0.9);
        this.load[index] = Math.min(1, this.load[index] + paintAmount * 0.65);

        pickedColor = mixCarriedPaint(pickedColor, current, falloff * wetInfluence * 0.08);
        pickupWeight += falloff * wetInfluence;
      }
    }

    if (pickupWeight > 0) {
      this.brush.carriedColor = mixCarriedPaint(this.brush.color, pickedColor, Math.min(0.75, pickupWeight / 80));
      this.brush.carriedLoad = Math.max(0.35, this.brush.carriedLoad * 0.985);
    }
  }

  private smearFrom(x: number, y: number, direction: Point, falloff: number): Rgb {
    const distance = 1 + falloff * 7;
    const sourceX = Math.round(x - direction.x * distance);
    const sourceY = Math.round(y - direction.y * distance);

    if (sourceX < 0 || sourceX >= this.width || sourceY < 0 || sourceY >= this.height) {
      return this.readColor(y * this.width + x);
    }

    return this.readColor(sourceY * this.width + sourceX);
  }

  private readColor(index: number): Rgb {
    const colorIndex = index * 3;
    return [this.color[colorIndex], this.color[colorIndex + 1], this.color[colorIndex + 2]];
  }

  private writeColor(index: number, color: Rgb): void {
    const colorIndex = index * 3;
    this.color[colorIndex] = color[0];
    this.color[colorIndex + 1] = color[1];
    this.color[colorIndex + 2] = color[2];
  }

  private toByte(value: number): number {
    return Math.round(Math.min(1, Math.max(0, value)) * 255);
  }
}
