import assert from "node:assert/strict";
import { mixPigmentsAbsorption } from "./pigment.js";

export function testAbsorptionMixingDarkensComplements(): void {
  const red = [0.9, 0.05, 0.04] as const;
  const blue = [0.05, 0.12, 0.85] as const;
  const mixed = mixPigmentsAbsorption(red, blue, 0.5);
  const rgbAverage = [(red[0] + blue[0]) / 2, (red[1] + blue[1]) / 2, (red[2] + blue[2]) / 2];

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
