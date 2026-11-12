/* Burger isométrica dibujada en SVG, capa por capa. Sin dependencias.
   TCBBurger.crear(contenedor) devuelve { svg, capas: {id: <g>}, queso(p) }.
   Cada capa es un <g> que quien la usa anima con transform (página: scroll · video: tiempo). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 300, RY = 0.5;                       // centro y achatado de la elipse (vista isométrica)
  const f = (n) => Math.round(n * 10) / 10;

  // contorno: radio en función del ángulo. r(a) = 1 es un círculo perfecto.
  function contorno(R, r = () => 1, n = 72) {
    return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, k = R * r(a); return [Math.cos(a) * k, Math.sin(a) * k * RY]; });
  }
  const poli = (pts, cx, y) => 'M' + pts.map(p => `${f(cx + p[0])},${f(y + p[1])}`).join('L') + 'Z';
  // canto visible de un disco extruido: mitad frontal del contorno, arriba y abajo
  function canto(pts, cx, yTop, h) {
    const frente = pts.slice(0, Math.floor(pts.length / 2) + 1);   // ángulos 0..π = mitad de enfrente, en orden
    return 'M' + frente.map(p => `${f(cx + p[0])},${f(yTop + p[1])}`).join('L') +
      'L' + frente.slice().reverse().map(p => `${f(cx + p[0])},${f(yTop + h + p[1])}`).join('L') + 'Z';
  }
  const el = (tag, attrs, padre) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (padre) padre.appendChild(e); return e; };

  function crear(contenedor, opts = {}) {
    const svg = el('svg', { viewBox: '0 0 600 660', role: 'img', 'aria-label': opts.etiqueta || 'Hamburguesa en vista isométrica: pan brioche, carne, queso, lechuga, tomate y pan' });
    svg.classList.add('burger-iso');
    const capas = {};
    const capa = (id) => (capas[id] = el('g', { class: 'capa', 'data-capa': id }, svg));

    // piso: tablero isométrico
    if (opts.piso !== false) {
      const g = el('g', { class: 'piso' }, svg), n = 9, t = 44, oy = 548;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if ((i + j) % 2) continue;
        const x = CX + (i - j) * t, y = oy + (i + j - (n - 1)) * t * RY;
        const d = Math.hypot(i - (n - 1) / 2, j - (n - 1) / 2);
        if (d > 4.6) continue;
        el('path', { d: `M${x},${y - t * RY}L${x + t},${y}L${x},${y + t * RY}L${x - t},${y}Z`, fill: '#FBC21B', opacity: f(Math.max(.16, 1 - d * 0.2)) }, g);
      }
      capas.piso = g;
    }

    // 1 · pan de abajo
    let g = capa('pan-abajo'), R = 208, y = 474, pts = contorno(R);
    el('path', { d: canto(pts, CX, y, 44), fill: '#C17F33' }, g);
    el('path', { d: canto(contorno(R), CX, y + 30, 14), fill: '#A96A28' }, g);
    el('path', { d: poli(pts, CX, y), fill: '#E9BE7C' }, g);
    el('path', { d: poli(contorno(R - 14), CX, y), fill: '#F3D7A3' }, g);

    // 2 · carne
    g = capa('carne'); R = 222; y = 442;
    pts = contorno(R, a => 1 + 0.018 * Math.sin(7 * a + 1) + 0.012 * Math.sin(13 * a));
    el('path', { d: canto(pts, CX, y, 32), fill: '#4A2817' }, g);
    el('path', { d: poli(pts, CX, y), fill: '#6E3F25' }, g);
    [[-90, -30, 26], [40, 20, 34], [110, -40, 20], [-30, 48, 22], [-140, 20, 16]].forEach(([dx, dy, r]) =>
      el('ellipse', { cx: CX + dx, cy: y + dy * RY * 1.6, rx: r, ry: r * RY, fill: '#5A311C' }, g));

    // 3 · queso: rebanada cuadrada (rombo) con gotas que escurren
    g = capa('queso'); y = 432; const S = 236;
    const esquinas = [[CX - S, y], [CX, y + S * RY], [CX + S, y], [CX, y - S * RY]];
    const gotasG = el('path', { fill: '#E3A60D', class: 'queso__gotas' }, g);
    el('path', { d: `M${CX - S},${y}L${CX},${y + S * RY}L${CX + S},${y}v10L${CX},${y + S * RY + 10}L${CX - S},${y + 10}Z`, fill: '#E3A60D' }, g);
    el('path', { d: 'M' + esquinas.map(p => p.join(',')).join('L') + 'Z', fill: '#FBC21B' }, g);
    el('path', { d: `M${CX - S + 60},${y - 4}L${CX - 10},${y - S * RY + 22}L${CX + 40},${y - S * RY + 46}L${CX - S + 110},${y + 20}Z`, fill: '#FFD75A', opacity: .7 }, g);
    const bordeY = (x) => y + 10 + (S - Math.abs(x - CX)) * RY;      // borde frontal del rombo
    const gotas = [[-178, 20, 26], [-118, 30, 64], [-52, 22, 40], [0, 34, 78], [64, 24, 46], [128, 30, 58], [186, 18, 22]]
      .map(([dx, w, len], i) => ({ x: CX + dx, w, len, y: bordeY(CX + dx) - 3, retraso: (i % 4) * 0.12 }));
    const queso = (p, t = 0) => gotasG.setAttribute('d', window.TCBLiquid.goteo(gotas, p, t));
    queso(1);

    // 4 · lechuga
    g = capa('lechuga'); R = 232; y = 418;
    const riz = (a) => 1 + 0.055 * Math.sin(9 * a) + 0.03 * Math.sin(17 * a + 1.3);
    pts = contorno(R, riz, 144);
    el('path', { d: canto(pts, CX, y, 13), fill: '#5C962F' }, g);
    el('path', { d: poli(pts, CX, y), fill: '#8FC653' }, g);
    el('path', { d: poli(contorno(R - 46, a => 1 + 0.07 * Math.sin(7 * a + 2), 96), CX, y), fill: '#A6D66C' }, g);

    // 5 · tomate: dos rodajas
    g = capa('tomate'); y = 404;
    [[-84, -8, 96], [86, 10, 96]].forEach(([dx, dy, r]) => {
      const p = contorno(r);
      el('path', { d: canto(p, CX + dx, y + dy, 13), fill: '#B3301E' }, g);
      el('path', { d: poli(p, CX + dx, y + dy), fill: '#E24A30' }, g);
      el('path', { d: poli(contorno(r - 16), CX + dx, y + dy), fill: '#EF6C50' }, g);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .4; el('ellipse', { cx: CX + dx + Math.cos(a) * r * .5, cy: y + dy + Math.sin(a) * r * .5 * RY, rx: 9, ry: 4.5, fill: '#F7B59F', transform: `rotate(${f(a * 57.3)} ${f(CX + dx + Math.cos(a) * r * .5)} ${f(y + dy + Math.sin(a) * r * .5 * RY)})` }, g); }
    });

    // 6 · pan de arriba: domo
    g = capa('pan-arriba'); R = 212; y = 396; const ry = R * RY;
    el('path', { d: `M${CX - R},${y}C${CX - R},${y - 196} ${CX + R},${y - 196} ${CX + R},${y}A${R},${ry} 0 0 1 ${CX - R},${y}Z`, fill: '#D48A33' }, g);
    const cid = 'domo' + Math.random().toString(36).slice(2, 7);
    const cp = el('clipPath', { id: cid }, g);
    el('path', { d: `M${CX - R},${y}C${CX - R},${y - 196} ${CX + R},${y - 196} ${CX + R},${y}A${R},${ry} 0 0 1 ${CX - R},${y}Z` }, cp);
    const dentro = el('g', { 'clip-path': `url(#${cid})` }, g);
    el('path', { d: `M${CX - R - 4},${y - 30}A${R + 4},${ry} 0 0 0 ${CX + R + 4},${y - 30}V${y + ry + 4}H${CX - R - 4}Z`, fill: '#B9722A' }, dentro);
    el('ellipse', { cx: CX - 70, cy: y - 122, rx: 96, ry: 30, fill: '#EDB25E', transform: `rotate(-24 ${CX - 70} ${y - 122})` }, dentro);
    el('ellipse', { cx: CX - 84, cy: y - 128, rx: 44, ry: 10, fill: '#F7CF8A', transform: `rotate(-26 ${CX - 84} ${y - 128})` }, dentro);

    contenedor.appendChild(svg);
    return { svg, capas, queso, orden: ['pan-abajo', 'carne', 'queso', 'lechuga', 'tomate', 'pan-arriba'] };
  }

  window.TCBBurger = { crear };
})();
