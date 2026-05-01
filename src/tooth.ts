function hashNoise(x: number, y: number, seed: number): number {
  let value = x * 374761393 + y * 668265263 + seed * 362437;
  value = (value ^ (value >> 13)) * 1274126177;
  return ((value ^ (value >> 16)) >>> 0) / 4294967295;
}

export function generateTooth(width: number, height: number, seed = 7): Float32Array {
  const tooth = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const fine = hashNoise(x, y, seed);
      const coarse = hashNoise(Math.floor(x / 4), Math.floor(y / 4), seed + 19);
      tooth[y * width + x] = 0.35 + fine * 0.4 + coarse * 0.25;
    }
  }

  return tooth;
}
