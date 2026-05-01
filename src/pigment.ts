import type { Rgb } from "./types";

const EPSILON = 0.003;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function rgbToAbsorption(color: Rgb): Rgb {
  return [
    -Math.log(Math.max(EPSILON, clamp01(color[0]))),
    -Math.log(Math.max(EPSILON, clamp01(color[1]))),
    -Math.log(Math.max(EPSILON, clamp01(color[2]))),
  ];
}

function absorptionToRgb(absorption: Rgb): Rgb {
  return [
    clamp01(Math.exp(-absorption[0])),
    clamp01(Math.exp(-absorption[1])),
    clamp01(Math.exp(-absorption[2])),
  ];
}

export function mixPigmentsAbsorption(base: Rgb, incoming: Rgb, incomingStrength: number): Rgb {
  const amount = clamp01(incomingStrength);
  const baseAbsorption = rgbToAbsorption(base);
  const incomingAbsorption = rgbToAbsorption(incoming);

  // First-pass pigment approximation:
  // mix in absorption space instead of RGB space. Darker pigments contribute
  // more absorption, which makes complements muddy rather than simply averaging.
  return absorptionToRgb([
    baseAbsorption[0] * (1 - amount) + incomingAbsorption[0] * amount,
    baseAbsorption[1] * (1 - amount) + incomingAbsorption[1] * amount,
    baseAbsorption[2] * (1 - amount) + incomingAbsorption[2] * amount,
  ]);
}

export function mixCarriedPaint(carried: Rgb, pickedUp: Rgb, pickupStrength: number): Rgb {
  return mixPigmentsAbsorption(carried, pickedUp, pickupStrength);
}
