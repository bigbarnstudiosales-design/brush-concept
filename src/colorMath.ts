import type { Rgb } from "./types";

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function colorDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / Math.sqrt(3);
}

export function mixRgb(base: Rgb, incoming: Rgb, incomingStrength: number): Rgb {
  const amount = clamp01(incomingStrength);

  return [
    base[0] * (1 - amount) + incoming[0] * amount,
    base[1] * (1 - amount) + incoming[1] * amount,
    base[2] * (1 - amount) + incoming[2] * amount,
  ];
}
