import {
  testAbsorptionMixingDarkensComplements,
  testZeroStrengthKeepsBasePigment,
} from "./pigment.test.js";
import { testWetnessBufferKeepsDryPixelsDry, testWetnessDecayReducesValue } from "./wetness.test.js";

const tests = [
  ["absorption pigment mixing darkens complements", testAbsorptionMixingDarkensComplements],
  ["zero strength keeps base pigment", testZeroStrengthKeepsBasePigment],
  ["wetness decay reduces values", testWetnessDecayReducesValue],
  ["wetness buffer keeps dry pixels dry", testWetnessBufferKeepsDryPixelsDry],
] as const;

for (const [name, run] of tests) {
  run();
  console.log(`pass: ${name}`);
}
