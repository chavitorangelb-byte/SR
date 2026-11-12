/* Queso y salsa: formas líquidas como funciones puras (misma entrada = misma forma).
   Las usan la página (ligadas al scroll) y el video (ligadas al tiempo). */
(function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const f = (n) => Math.round(n * 10) / 10;

  /* Una gota: columna que al alargarse adelgaza el cuello y engorda la punta. */
  function gota(x, w, L, y0 = 0) {
    if (L < 0.5) return '';
    const k = clamp(L / (w * 2.2), 0, 1);
    const hn = lerp(w / 2, w * 0.17, k);          // medio ancho del cuello
    const rb = lerp(w / 2, w * 0.44, k);         // radio de la punta
    const ry = Math.min(rb, L);
    const yN = y0 + Math.max(0, L - ry * 3.2) * 0.7 + Math.min(L - ry, ry) * 0.2;
    const yB = y0 + L - ry;
    return `M${f(x - w / 2)},${f(y0)}` +
      `C${f(x - w / 2)},${f(lerp(y0, yN, .5))} ${f(x - hn)},${f(lerp(y0, yN, .5))} ${f(x - hn)},${f(yN)}` +
      `C${f(x - hn)},${f(lerp(yN, yB, .6))} ${f(x - rb)},${f(lerp(yN, yB, .7))} ${f(x - rb)},${f(yB)}` +
      `A${f(rb)},${f(ry)} 0 0 0 ${f(x + rb)},${f(yB)}` +
      `C${f(x + rb)},${f(lerp(yN, yB, .7))} ${f(x + hn)},${f(lerp(yN, yB, .6))} ${f(x + hn)},${f(yN)}` +
      `C${f(x + hn)},${f(lerp(y0, yN, .5))} ${f(x + w / 2)},${f(lerp(y0, yN, .5))} ${f(x + w / 2)},${f(y0)}Z`;
  }

  /* Varias gotas. gotas: [{x, w, len}] en px. p: 0..1 cuánto han escurrido. t: segundos (bamboleo). */
  function goteo(gotas, p, t = 0) {
    let d = '';
    gotas.forEach((g, i) => {
      const retraso = (g.retraso ?? (i % 3) * 0.12);
      const pi = clamp((p - retraso) / (1 - retraso), 0, 1);
      const vivo = 1 + 0.06 * Math.sin(t * 1.3 + i * 1.7);
      d += gota(g.x, g.w, g.len * pi * vivo, g.y || 0);
    });
    return d;
  }

  /* Borde derretido de una sección: banda ondulada + gotas. Ocupa de y=0 hacia abajo. */
  function borde(ancho, base, gotas, p, t = 0) {
    const paso = 12; let d = `M0,0H${f(ancho)}`;
    const y = (x) => base + Math.sin(x * 0.011 + t * 0.6) * base * 0.35 + Math.sin(x * 0.027 - t * 0.4) * base * 0.2;
    d += `V${f(y(ancho))}`;
    for (let x = ancho; x >= 0; x -= paso) d += `L${f(x)},${f(y(x))}`;
    d += `L0,${f(y(0))}Z`;
    return d + goteo(gotas.map(g => ({ ...g, y: y(g.x) - 2 })), p, t);
  }

  /* Reparto determinista de gotas a lo ancho. */
  function repartir(ancho, n, largo, semilla = 1) {
    const r = (i) => { const s = Math.sin(i * 127.1 + semilla * 311.7) * 43758.5453; return s - Math.floor(s); };
    return Array.from({ length: n }, (_, i) => ({
      x: (i + 0.5 + (r(i) - 0.5) * 0.6) * ancho / n,
      w: lerp(22, 54, r(i + 9)) * Math.min(1.4, Math.max(.7, ancho / 900)),
      len: largo * lerp(0.3, 1, r(i + 21)),
      retraso: r(i + 33) * 0.35
    }));
  }

  /* Mancha orgánica cerrada (salsa, queso). */
  function mancha(cx, cy, R, t = 0, semilla = 0, n = 9) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = R * (1 + 0.16 * Math.sin(2 * a + semilla + t * 0.7) + 0.09 * Math.sin(3 * a - semilla * 2 - t * 0.9) + 0.05 * Math.sin(5 * a + t * 1.3));
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {                 // Catmull-Rom cerrado a Bézier
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    return d + 'Z';
  }

  window.TCBLiquid = { gota, goteo, borde, repartir, mancha, clamp, lerp };
})();
