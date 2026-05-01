import {
  testAbsorptionMixingDarkensComplements,
  testIncrementalYellowOverBlueMixesGreen,
  testRedAndBlueMixTowardPurple,
  testYellowAndBlueMixTowardGreen,
  testZeroStrengthKeepsBasePigment,
} from "./pigment.test.js";
import { testWetnessBufferKeepsDryPixelsDry, testWetnessDecayReducesValue } from "./wetness.test.js";

const tests = [
  ["absorption pigment mixing darkens complements", testAbsorptionMixingDarkensComplements],
  ["zero strength keeps base pigment", testZeroStrengthKeepsBasePigment],
  ["yellow and blue mix toward green", testYellowAndBlueMixTowardGreen],
  ["incremental yellow over blue mixes green", testIncrementalYellowOverBlueMixesGreen],
  ["red and blue mix toward purple", testRedAndBlueMixTowardPurple],
  ["wetness decay reduces values", testWetnessDecayReducesValue],
  ["wetness buffer keeps dry pixels dry", testWetnessBufferKeepsDryPixelsDry],
] as const;

for (const [name, run] of tests) {
  run();
  console.log(`pass: ${name}`);
}
