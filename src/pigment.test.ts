import assert from "node:assert/strict";
import { mixPigmentsAbsorption } from "./pigment.js";

export function testAbsorptionMixingDarkensComplements(): void {
  const red = [0.9, 0.05, 0.04] as const;
  const green = [0.08, 0.47, 0.2] as const;
  const mixed = mixPigmentsAbsorption(red, green, 0.5);
  const rgbAverage = [(red[0] + green[0]) / 2, (red[1] + green[1]) / 2, (red[2] + green[2]) / 2];

  const mixedBrightness = mixed[0] + mixed[1] + mixed[2];
  const averageBrightness = rgbAverage[0] + rgbAverage[1] + rgbAverage[2];

  assert.ok(mixedBrightness < averageBrightness);
}

export function testZeroStrengthKeepsBasePigment(): void {
  const base = [0.25, 0.4, 0.7] as const;
  const incoming = [0.9, 0.1, 0.1] as const;
  const mixed = mixPigmentsAbsorption(base, incoming, 0);

  assert.deepEqual(mixed.map((value) => Number(value.toFixed(5))), [0.25, 0.4, 0.7]);
}

export function testYellowAndBlueMixTowardGreen(): void {
  const yellow = [0.96, 0.67, 0.08] as const;
  const blue = [0.06, 0.32, 0.75] as const;
  const mixed = mixPigmentsAbsorption(yellow, blue, 0.5);

  assert.ok(mixed[1] > mixed[0]);
  assert.ok(mixed[1] > mixed[2]);
}

export function testIncrementalYellowOverBlueMixesGreen(): void {
  const yellow = [0.96, 0.67, 0.08] as const;
  const blue = [0.06, 0.32, 0.75] as const;
  const mixed = mixPigmentsAbsorption(blue, yellow, 0.18);

  assert.ok(mixed[1] > mixed[0] * 2);
  assert.ok(mixed[1] > mixed[2]);
}

export function testRedAndBlueMixTowardPurple(): void {
  const red = [0.79, 0.08, 0.05] as const;
  const blue = [0.06, 0.32, 0.75] as const;
  const mixed = mixPigmentsAbsorption(red, blue, 0.5);

  assert.ok(mixed[0] > mixed[1]);
  assert.ok(mixed[2] > mixed[1]);
  assert.ok(mixed[0] + mixed[2] > mixed[1] * 3);
}
