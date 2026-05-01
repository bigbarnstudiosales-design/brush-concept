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

function mixRgb(base: Rgb, incoming: Rgb, incomingStrength: number): Rgb {
  const amount = clamp01(incomingStrength);

  return [
    base[0] * (1 - amount) + incoming[0] * amount,
    base[1] * (1 - amount) + incoming[1] * amount,
    base[2] * (1 - amount) + incoming[2] * amount,
  ];
}

function yellowSignal(color: Rgb): number {
  return clamp01((Math.min(color[0], color[1]) - color[2]) / 0.55);
}

function blueSignal(color: Rgb): number {
  return clamp01((color[2] - Math.max(color[0], color[1]) * 0.75) / 0.55);
}

function redSignal(color: Rgb): number {
  const redDominance = color[0] - Math.max(color[1], color[2]) * 1.35;
  return clamp01(redDominance / 0.45);
}

function greenSignal(color: Rgb): number {
  return clamp01((color[1] - Math.max(color[0], color[2]) * 0.72) / 0.5);
}

function correctYellowBlueMix(mixed: Rgb, base: Rgb, incoming: Rgb, amount: number): Rgb {
  const yellowBlue =
    yellowSignal(base) * blueSignal(incoming) + blueSignal(base) * yellowSignal(incoming);
  const balancedMix = 4 * amount * (1 - amount);
  const correction = clamp01(yellowBlue * Math.sqrt(balancedMix) * 0.95);

  if (correction === 0) {
    return mixed;
  }

  return mixRgb(mixed, [0.08, 0.62, 0.12], correction);
}

function correctRedBlueMix(mixed: Rgb, base: Rgb, incoming: Rgb, amount: number): Rgb {
  const redBlue = redSignal(base) * blueSignal(incoming) + blueSignal(base) * redSignal(incoming);
  const balancedMix = 4 * amount * (1 - amount);
  const correction = clamp01(redBlue * balancedMix * 0.7);

  if (correction === 0) {
    return mixed;
  }

  return mixRgb(mixed, [0.48, 0.12, 0.64], correction);
}

function correctRedGreenMud(mixed: Rgb, base: Rgb, incoming: Rgb, amount: number): Rgb {
  const redGreen = redSignal(base) * greenSignal(incoming) + greenSignal(base) * redSignal(incoming);
  const balancedMix = 4 * amount * (1 - amount);
  const correction = clamp01(redGreen * balancedMix * 0.45);

  if (correction === 0) {
    return mixed;
  }

  return mixRgb(mixed, [0.19, 0.16, 0.1], correction);
}

export function mixPigmentsAbsorption(base: Rgb, incoming: Rgb, incomingStrength: number): Rgb {
  const amount = clamp01(incomingStrength);
  const baseAbsorption = rgbToAbsorption(base);
  const incomingAbsorption = rgbToAbsorption(incoming);

  // First-pass pigment approximation:
  // mix in absorption space instead of RGB space. Darker pigments contribute
  // more absorption, which makes complements muddy rather than simply averaging.
  const mixed = absorptionToRgb([
    baseAbsorption[0] * (1 - amount) + incomingAbsorption[0] * amount,
    baseAbsorption[1] * (1 - amount) + incomingAbsorption[1] * amount,
    baseAbsorption[2] * (1 - amount) + incomingAbsorption[2] * amount,
  ]);

  return correctRedGreenMud(correctRedBlueMix(correctYellowBlueMix(mixed, base, incoming, amount), base, incoming, amount), base, incoming, amount);
}

export function mixCarriedPaint(carried: Rgb, pickedUp: Rgb, pickupStrength: number): Rgb {
  return mixPigmentsAbsorption(carried, pickedUp, pickupStrength);
}
