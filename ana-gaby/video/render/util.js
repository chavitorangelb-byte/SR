// Utilidades deterministas de animación (todo depende solo del cuadro f, nunca del reloj real).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const tramo = (f, f0, f1) => clamp((f - f0) / (f1 - f0));
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeOutQuart = (t) => 1 - (1 - t) ** 4;
export const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutBack = (t, s = 1.4) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
// Resorte amortiguado normalizado (0 → 1) con un rebote leve.
export function resorte(t, { w = 11, z = 0.62 } = {}) {
  if (t <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}
// Ruido de valor 1D suave y determinista (para el mecido del celular y la deriva de cámara).
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
export function ruido(x, semilla = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i + semilla * 57.3), b = hash(i + 1 + semilla * 57.3);
  const u = f * f * (3 - 2 * f);
  return (a + (b - a) * u) * 2 - 1;
}
// Color hex sRGB → lineal (para uniforms de shaders que trabajan en lineal).
export function linealDe(hex) {
  const c = hex.replace('#', '').match(/\w\w/g).map((x) => parseInt(x, 16) / 255);
  return c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
}
// Secuencia de Halton para el jitter de subpíxel de cada subcuadro (antialias temporal).
export function halton(i, base) {
  let f = 1, r = 0;
  while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); }
  return r;
}
