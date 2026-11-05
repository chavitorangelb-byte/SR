// Reglas de tiempo compartidas por el brief, la captura de la página y el render.

// Cuadro de cada tecla al escribir un texto entre f y f + d (ritmo humano determinista).
export function typingFrames(f, d, text) {
  const n = [...text].length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const base = n === 1 ? f : f + Math.round((i * d) / (n - 1));
    const jitter = [0, 1, -1, 0, 1, 0, -1, 1][i % 8];
    out.push(Math.max(out.length ? out[out.length - 1] + 1 : f, Math.min(f + d, base + (i && i < n - 1 ? jitter : 0))));
  }
  return out;
}
