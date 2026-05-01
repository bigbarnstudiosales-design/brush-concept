import { TexturedRoundBrush, type BrushBehavior, type BrushState } from "./brushBehavior";
import { clamp01, colorDistance, mixRgb } from "./colorMath";
import { mixPigmentsAbsorption } from "./pigment";
import { pigmentLibrary, pigmentPalette } from "./pigmentLibrary";
import { PaintSurface } from "./surface";
import { decayBuffer } from "./wetness";
import type { Point, Rgb, ViewMode } from "./types";

const PAPER: Rgb = [0.94, 0.92, 0.86];
const DEFAULT_BRUSH_RADIUS = 34;
const DEFAULT_BRUSH_LOAD = 0.25;
const DEFAULT_MIX = 0.5;
const MIN_BRUSH_RADIUS = 8;
const MAX_BRUSH_RADIUS = 96;
const WETNESS_DECAY = 0.22;

export { pigmentPalette } from "./pigmentLibrary";

export class PaintEngine {
  readonly width: number;
  readonly height: number;
  readonly color: Float32Array;
  readonly wetness: Float32Array;
  readonly load: Float32Array;
  readonly tooth: Float32Array;

  private readonly context: CanvasRenderingContext2D;
  private readonly imageData: ImageData;
  private readonly surface: PaintSurface;
  private mixAmount = DEFAULT_MIX;
  private brush: BrushState = {
    pigment: pigmentLibrary[0],
    carriedColor: pigmentLibrary[0].color,
    carriedLoad: DEFAULT_BRUSH_LOAD,
    radius: DEFAULT_BRUSH_RADIUS,
  };

  viewMode: ViewMode = "color";

  constructor(
    private readonly canvas: HTMLCanvasElement,
    width: number,
    height: number,
    private readonly brushBehavior: BrushBehavior = new TexturedRoundBrush(),
  ) {
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
    this.surface = new PaintSurface(width, height, PAPER);
    this.color = this.surface.color;
    this.wetness = this.surface.wetness;
    this.load = this.surface.load;
    this.tooth = this.surface.tooth;

    this.clear();
  }

  clear(): void {
    this.surface.clear();
    this.render();
  }

  setBrushColor(color: Rgb): void {
    const pigment =
      pigmentLibrary.find((candidate) => colorDistance(candidate.color, color) < 0.001) ?? {
        id: "custom",
        name: "Custom",
        color,
        tintingStrength: 1,
        opacity: 1,
        granulation: 0,
        diffusion: 0.5,
      };

    this.brush = {
      pigment,
      carriedColor: pigment.color,
      carriedLoad: this.brush.carriedLoad,
      radius: this.brush.radius,
    };
  }

  cleanBrush(): void {
    this.brush.carriedColor = this.brush.pigment.color;
    this.brush.carriedLoad = 0;
  }

  setBrushLoad(load: number): void {
    this.brush.carriedLoad = clamp01(load);
    this.brush.carriedColor = this.brush.pigment.color;
  }

  getBrushLoad(): number {
    return this.brush.carriedLoad;
  }

  getBrushRadius(): number {
    return this.brush.radius;
  }

  setBrushRadius(radius: number): void {
    this.brush.radius = Math.min(MAX_BRUSH_RADIUS, Math.max(MIN_BRUSH_RADIUS, radius));
  }

  getMixAmount(): number {
    return this.mixAmount;
  }

  setMixAmount(mixAmount: number): void {
    this.mixAmount = clamp01(mixAmount);
  }

  decay(deltaSeconds: number): void {
    decayBuffer(this.surface.wetness, WETNESS_DECAY, deltaSeconds);
  }

  stroke(from: Point, to: Point): void {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / this.brushBehavior.spacing(this.brush.radius)));
    const direction = distance > 0 ? { x: (to.x - from.x) / distance, y: (to.y - from.y) / distance } : { x: 0, y: 0 };

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const center = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
      const jitter = this.brushBehavior.jitter?.(center, step, this.brush) ?? { x: 0, y: 0 };
      const jitteredCenter = {
        x: center.x + jitter.x,
        y: center.y + jitter.y,
      };

      if (step > 0) {
        const previousT = (step - 1) / steps;
        const previousCenter = {
          x: from.x + (to.x - from.x) * previousT,
          y: from.y + (to.y - from.y) * previousT,
        };
        const previousJitter = this.brushBehavior.jitter?.(previousCenter, step - 1, this.brush) ?? { x: 0, y: 0 };
        this.connectorDab(
          {
            x: previousCenter.x + previousJitter.x,
            y: previousCenter.y + previousJitter.y,
          },
          jitteredCenter,
          direction,
        );
      }

      this.dab(jitteredCenter, direction);
    }
  }

  render(): void {
    const pixels = this.imageData.data;

    for (let index = 0; index < this.width * this.height; index += 1) {
      const pixel = index * 4;
      const colorIndex = index * 3;
      const debugValue =
        this.viewMode === "wetness" ? this.surface.wetness[index] : this.viewMode === "load" ? this.surface.load[index] : this.surface.tooth[index];

      if (this.viewMode === "color") {
        const coverage = this.surface.load[index];
        pixels[pixel] = this.toByte(this.surface.paperColor[0] * (1 - coverage) + this.surface.color[colorIndex] * coverage);
        pixels[pixel + 1] = this.toByte(this.surface.paperColor[1] * (1 - coverage) + this.surface.color[colorIndex + 1] * coverage);
        pixels[pixel + 2] = this.toByte(this.surface.paperColor[2] * (1 - coverage) + this.surface.color[colorIndex + 2] * coverage);
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

  private getEffectiveMix(): number {
    return this.mixAmount === 0 ? 0 : this.mixAmount ** 1.7;
  }

  private getEffectiveSmear(): number {
    return Math.min(0.6, this.getEffectiveMix());
  }

  private dab(center: Point, direction: Point): void {
    const radius = this.brush.radius;
    const minX = Math.max(0, Math.floor(center.x - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(center.x + radius));
    const minY = Math.max(0, Math.floor(center.y - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(center.y + radius));

    if (this.brush.carriedLoad <= 0) {
      return;
    }

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (Math.hypot(x - center.x, y - center.y) > radius) {
          continue;
        }

        const mark = this.brushBehavior.markAt(x, y, center, direction, this.brush);
        if (mark.coverage < 0.08 || mark.deposit <= 0) {
          continue;
        }

        const index = y * this.width + x;
        const sample = this.surface.read(index);
        const existingPaint = clamp01(sample.load);
        const paintAmount = mark.deposit * this.brush.carriedLoad * this.brush.pigment.opacity * 0.34;
        const edgeSample = this.sampleWetEdge(x, y, mark.deposit);
        const colorContrast = existingPaint > 0 ? colorDistance(sample.color, this.brush.carriedColor) : 0;
        const edgeContrast = existingPaint > 0 ? colorDistance(sample.color, edgeSample.color) : 0;
        const boundaryInfluence = clamp01(colorContrast * 2.2 + edgeContrast * 1.4);
        const wetInfluence = clamp01(sample.wetness * 0.72 + sample.load * 0.28 + edgeSample.wetness * 0.45 + edgeSample.load * 0.22);
        const edgeMix = this.getEffectiveMix() * boundaryInfluence * (0.35 + wetInfluence * 0.65);
        const edgeStrength = mark.deposit * existingPaint * edgeMix * (0.08 + mark.drag * 0.1);
        const afterWetEdge = edgeStrength > 0 ? this.mixPaintColor(sample.color, edgeSample.color, edgeStrength) : sample.color;
        const afterDeposit = this.mixCanvasColor(afterWetEdge, this.brush.carriedColor, paintAmount, existingPaint, boundaryInfluence);

        this.surface.writeColor(index, afterDeposit);
        this.surface.wetness[index] = clamp01(sample.wetness + paintAmount * 0.8 + edgeSample.wetness * edgeStrength * 0.08);
        this.surface.load[index] = clamp01(sample.load + paintAmount * (1 - sample.load));
      }
    }
  }

  private connectorDab(from: Point, to: Point, direction: Point): void {
    if (!this.brushBehavior.connectorMarkAt || this.brush.carriedLoad <= 0) {
      return;
    }

    const radius = this.brush.radius;
    const minX = Math.max(0, Math.floor(Math.min(from.x, to.x) - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(from.x, to.x) + radius));
    const minY = Math.max(0, Math.floor(Math.min(from.y, to.y) - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(from.y, to.y) + radius));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const mark = this.brushBehavior.connectorMarkAt(x, y, from, to, direction, this.brush);

        if (mark.coverage < 0.04 || mark.deposit <= 0) {
          continue;
        }

        this.applyMark(x, y, mark);
      }
    }
  }

  private applyMark(x: number, y: number, mark: { deposit: number; drag: number }): void {
    const index = y * this.width + x;
    const sample = this.surface.read(index);
    const existingPaint = clamp01(sample.load);
    const paintAmount = mark.deposit * this.brush.carriedLoad * this.brush.pigment.opacity * 0.34;
    const edgeSample = this.sampleWetEdge(x, y, mark.deposit);
    const colorContrast = existingPaint > 0 ? colorDistance(sample.color, this.brush.carriedColor) : 0;
    const edgeContrast = existingPaint > 0 ? colorDistance(sample.color, edgeSample.color) : 0;
    const boundaryInfluence = clamp01(colorContrast * 2.2 + edgeContrast * 1.4);
    const wetInfluence = clamp01(sample.wetness * 0.72 + sample.load * 0.28 + edgeSample.wetness * 0.45 + edgeSample.load * 0.22);
    const edgeMix = this.getEffectiveMix() * boundaryInfluence * (0.35 + wetInfluence * 0.65);
    const edgeStrength = mark.deposit * existingPaint * edgeMix * (0.08 + mark.drag * 0.1);
    const afterWetEdge = edgeStrength > 0 ? this.mixPaintColor(sample.color, edgeSample.color, edgeStrength) : sample.color;
    const afterDeposit = this.mixCanvasColor(afterWetEdge, this.brush.carriedColor, paintAmount, existingPaint, boundaryInfluence);

    this.surface.writeColor(index, afterDeposit);
    this.surface.wetness[index] = clamp01(sample.wetness + paintAmount * 0.8 + edgeSample.wetness * edgeStrength * 0.08);
    this.surface.load[index] = clamp01(sample.load + paintAmount * (1 - sample.load));
  }

  private sampleWetEdge(x: number, y: number, falloff: number): { color: Rgb; wetness: number; load: number } {
    const radius = Math.max(1, Math.round(1 + falloff * (1 + this.getEffectiveSmear() * 3)));
    let red = 0;
    let green = 0;
    let blue = 0;
    let wetness = 0;
    let load = 0;
    let weight = 0;

    for (let offsetY = -radius; offsetY <= radius; offsetY += radius) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += radius) {
        if (offsetX === 0 && offsetY === 0) {
          continue;
        }

        const sampleX = x + offsetX;
        const sampleY = y + offsetY;

        if (sampleX < 0 || sampleX >= this.width || sampleY < 0 || sampleY >= this.height) {
          continue;
        }

        const sample = this.surface.read(sampleY * this.width + sampleX);

        if (sample.load <= 0) {
          continue;
        }

        const sampleWeight = sample.load * (0.35 + sample.wetness * 0.65);
        red += sample.color[0] * sampleWeight;
        green += sample.color[1] * sampleWeight;
        blue += sample.color[2] * sampleWeight;
        wetness += sample.wetness * sampleWeight;
        load += sample.load * sampleWeight;
        weight += sampleWeight;
      }
    }

    if (weight === 0) {
      const sample = this.surface.read(y * this.width + x);
      return {
        color: sample.color,
        wetness: sample.wetness,
        load: sample.load,
      };
    }

    return {
      color: [red / weight, green / weight, blue / weight],
      wetness: wetness / weight,
      load: load / weight,
    };
  }

  private mixCanvasColor(base: Rgb, incoming: Rgb, amount: number, existingPaint: number, boundaryInfluence: number): Rgb {
    if (existingPaint <= 0) {
      return incoming;
    }

    const effectiveMix = this.getEffectiveMix();
    const coverageBlend = amount / Math.max(0.001, existingPaint + amount);
    const pigmentBlend = coverageBlend * effectiveMix * (0.18 + boundaryInfluence * 0.82);
    const layered = mixRgb(base, incoming, coverageBlend * (1 - effectiveMix) * 0.75);

    if (effectiveMix === 0) {
      return layered;
    }

    return this.mixPaintColor(layered, incoming, pigmentBlend);
  }

  private mixPaintColor(base: Rgb, incoming: Rgb, amount: number): Rgb {
    return mixPigmentsAbsorption(base, incoming, amount);
  }

  private toByte(value: number): number {
    return Math.round(clamp01(value) * 255);
  }
}
