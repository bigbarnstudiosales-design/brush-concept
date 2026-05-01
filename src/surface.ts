import { generateTooth } from "./tooth";
import type { Rgb } from "./types";

export interface SurfaceSample {
  color: Rgb;
  wetness: number;
  load: number;
  tooth: number;
}

export class PaintSurface {
  readonly color: Float32Array;
  readonly wetness: Float32Array;
  readonly load: Float32Array;
  readonly tooth: Float32Array;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly paperColor: Rgb,
  ) {
    this.color = new Float32Array(width * height * 3);
    this.wetness = new Float32Array(width * height);
    this.load = new Float32Array(width * height);
    this.tooth = generateTooth(width, height);
  }

  clear(): void {
    for (let index = 0; index < this.width * this.height; index += 1) {
      this.writeColor(index, [0, 0, 0]);
      this.wetness[index] = 0;
      this.load[index] = 0;
    }
  }

  read(index: number): SurfaceSample {
    return {
      color: this.readColor(index),
      wetness: this.wetness[index],
      load: this.load[index],
      tooth: this.tooth[index],
    };
  }

  readColor(index: number): Rgb {
    const colorIndex = index * 3;
    return [this.color[colorIndex], this.color[colorIndex + 1], this.color[colorIndex + 2]];
  }

  writeColor(index: number, color: Rgb): void {
    const colorIndex = index * 3;
    this.color[colorIndex] = color[0];
    this.color[colorIndex + 1] = color[1];
    this.color[colorIndex + 2] = color[2];
  }
}
