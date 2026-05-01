export function decayValue(value: number, decayPerSecond: number, deltaSeconds: number): number {
  if (value <= 0) {
    return 0;
  }

  const retained = Math.exp(-decayPerSecond * deltaSeconds);
  return Math.max(0, value * retained);
}

export function decayBuffer(buffer: Float32Array, decayPerSecond: number, deltaSeconds: number): void {
  const retained = Math.exp(-decayPerSecond * deltaSeconds);

  for (let index = 0; index < buffer.length; index += 1) {
    const next = buffer[index] * retained;
    buffer[index] = next < 0.001 ? 0 : next;
  }
}
