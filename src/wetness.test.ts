import assert from "node:assert/strict";
import { decayBuffer, decayValue } from "./wetness.js";

export function testWetnessDecayReducesValue(): void {
  const next = decayValue(1, 0.5, 1);

  assert.ok(next < 1);
  assert.ok(next > 0);
}

export function testWetnessBufferKeepsDryPixelsDry(): void {
  const buffer = new Float32Array([1, 0.5, 0]);

  decayBuffer(buffer, 1, 0.25);

  assert.ok(buffer[0] < 1);
  assert.ok(buffer[1] < 0.5);
  assert.equal(buffer[2], 0);
}
