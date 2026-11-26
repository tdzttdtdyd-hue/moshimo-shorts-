// シード付き乱数とノイズ（Math.random は使わない）
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hash3 = (x: number, y: number, z: number, seed: number) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const noise3 = (x: number, y: number, z: number, seed = 1) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const n = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  const x00 = lerp(n(0, 0, 0), n(1, 0, 0), xf);
  const x10 = lerp(n(0, 1, 0), n(1, 1, 0), xf);
  const x01 = lerp(n(0, 0, 1), n(1, 0, 1), xf);
  const x11 = lerp(n(0, 1, 1), n(1, 1, 1), xf);
  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf) * 2 - 1;
};

export const fbm3 = (x: number, y: number, z: number, seed = 1, oct = 4) => {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise3(x * f, y * f, z * f, seed + i * 17);
    a *= 0.5;
    f *= 2.03;
  }
  return s;
};

export const noise1 = (t: number, seed = 1) => noise3(t, 0.5, 0.5, seed);
