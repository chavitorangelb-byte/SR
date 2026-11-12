// Sella Eventos · "El camino de mesa" · escena determinista en canvas 2D.
// Contrato con render.mjs: window.renderFrame(f, {sub, shutter}) → dataURL PNG. f en cuadros a 60 fps.
// Todo se dibuja en coordenadas de diseño 1080×1920 y se escala a la salida.
const Q = new URLSearchParams(location.search);
const W = +Q.get('w') || 540, H = +Q.get('h') || 960;
const DW = 1080, DH = 1920, S = W / DW;
const UI = Q.get('ui') || '/video/build/ui';

const C = { carbon: '#0f0e0d', marfil: '#f6f1e7', champ: '#e8cf9a', champ2: '#c9a968', champ3: '#9c7d44', luz: '#f7e8c4' };
const SERIF = '"Cormorant Garamond"';

// ───────── utilidades
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (f, a, b) => clamp((f - a) / (b - a));
const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const outCubic = t => 1 - Math.pow(1 - t, 3);
const outQuint = t => 1 - Math.pow(1 - t, 5);
const outBack = (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const img = src => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('no carga ' + src)); i.src = src; });

// ───────── lienzos
const out = mk(W, H); document.body.appendChild(out);
const octx = out.getContext('2d');
const work = mk(W, H), wctx = work.getContext('2d');
const acc = mk(W, H), actx = acc.getContext('2d');
const tel = mk(W, H), tctx = tel.getContext('2d');   // capa del teléfono (plana, antes de la perspectiva)

let ui, pagina, logo, grano, fondo; const sprites = {}, fotos = [];
let SUBPASO = 1 / 8;   // duración de un subcuadro, en cuadros
const medidas = {};

async function init() {
  const fuentes = [['500', 'normal'], ['600', 'normal'], ['700', 'normal'], ['500', 'italic']];
  for (const [w, st] of fuentes) {
    const ff = new FontFace('Cormorant Garamond', `url(/web/fonts/cormorant-garamond-latin-${w}-${st}.woff2)`, { weight: w, style: st });
    document.fonts.add(await ff.load());
  }
  for (const w of ['500', '600']) document.fonts.add(await new FontFace('Inter', `url(/web/fonts/inter-latin-${w}-normal.woff2)`, { weight: w }).load());
  ui = await (await fetch(UI + '/ui.json')).json();
  pagina = await img(UI + '/pagina.png'); logo = await img('/web/img/logo-circulo.png');
  for (const n of [...ui.cards.map((_, i) => 'card' + i), 'cintillo', 'cta']) sprites[n] = await img(`${UI}/${n}.png`);
  for (const g of ui.figs) fotos.push(await img('/web/' + g.src));
  prepararScroll(); prepararTrazos();
  // grano 2 %, con semilla
  grano = mk(256, 256); const g = grano.getContext('2d'); const id = g.createImageData(256, 256); const r = rng(20261111);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255 | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  // fondo fijo: carbón con luz cálida arriba-izquierda y viñeta
  fondo = mk(W, H); const b = fondo.getContext('2d'); b.scale(S, S);
  b.fillStyle = C.carbon; b.fillRect(0, 0, DW, DH);
  let gr = b.createRadialGradient(120, 260, 0, 120, 260, 1500);
  gr.addColorStop(0, 'rgba(190,146,78,.34)'); gr.addColorStop(.45, 'rgba(120,84,40,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  b.fillStyle = gr; b.fillRect(0, 0, DW, DH);
  gr = b.createRadialGradient(1000, 1750, 0, 1000, 1750, 900);
  gr.addColorStop(0, 'rgba(120,72,36,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  b.fillStyle = gr; b.fillRect(0, 0, DW, DH);
  gr = b.createRadialGradient(540, 960, 600, 540, 960, 1250);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)');
  b.fillStyle = gr; b.fillRect(0, 0, DW, DH);
  prepararTexto();
}

// ───────── texto cinético
// Cada palabra se ajusta a un ancho máximo y se guarda la posición de cada glifo (con su kerning real).
function medir(texto, peso, anchoMax, tamMax, tracking = 0.04) {
  const c = wctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  let tam = tamMax, ancho;
  const calc = () => { c.font = `${peso} ${tam}px ${SERIF}`; c.letterSpacing = `${tam * tracking}px`; ancho = c.measureText(texto).width - tam * tracking; };
  calc(); if (ancho > anchoMax) { tam = Math.floor(tam * anchoMax / ancho); calc(); }
  const gl = [];
  for (let i = 0; i < texto.length; i++) {
    const x0 = i ? c.measureText(texto.slice(0, i)).width : 0;
    c.letterSpacing = '0px'; const w = c.measureText(texto[i]).width; c.letterSpacing = `${tam * tracking}px`;
    gl.push({ ch: texto[i], x: x0, w });
  }
  c.restore();
  return { texto, peso, tam, ancho, gl, cap: tam * 0.63 };
}
function prepararTexto() {
  medidas.tu = medir('TU EVENTO', 600, 780, 190);
  medidas.bien = medir('BIEN SENTADO.', 700, 780, 150, 0.02);
  medidas.tuPones = medir('TÚ PONES', 600, 760, 150);
  medidas.laFiesta = medir('LA FIESTA', 700, 900, 200, 0.02);
  medidas.tel = medir('449 509 3260', 700, 860, 132, 0.01);
  medidas.sella = medir('Sella Eventos', 600, 860, 150, 0);
  medidas.ags = medir('AGUASCALIENTES', 600, 700, 58, 0.22);
  medidas.demo1 = medir('Demo de cortesía de Elevate Negocios', 500, 900, 54, 0);
  medidas.demo2 = medir('pieza no oficial', 500, 900, 54, 0);
}

// ───────── la cinta (camino de mesa)
// Devuelve el estado de la cinta en el cuadro f: extremos, grosor y altura del centro en cada x.
const Y_CINTA = 1010, T_CINTA = 150;
const IMPACTOS = [{ f: 168, x: 330, a: 30 }, { f: 183.5, x: 660, a: 34 }];
function cinta(f) {
  const entra = outQuint(prog(f, 0, 26));
  const adelg = inOut(prog(f, 200, 236));
  const T = lerp(T_CINTA, 14, adelg);
  const yc = lerp(Y_CINTA, 969, adelg);
  const x0 = lerp(-140, 140, adelg);
  const x1 = lerp(lerp(-140, 1240, entra), 940, adelg);
  const flam = Math.exp(-f / 20) * 62;                       // aleteo de tela al cruzar
  const resp = 5 * (1 - adelg) * clamp((f - 40) / 40);        // respiración lenta
  const y = x => {
    let v = yc + flam * Math.sin(x * 0.011 - f * 0.42) + 0.35 * flam * Math.sin(x * 0.023 + f * 0.3);
    v += resp * Math.sin(x * 0.006 + f * 0.035);
    v += 16 * (1 - adelg) * clamp((f - 20) / 50) * Math.sin(Math.PI * clamp((x + 140) / 1380));  // caída por peso
    for (const k of IMPACTOS) if (f >= k.f) {
      const d = f - k.f; v += k.a * (1 - adelg) * Math.exp(-((x - k.x) ** 2) / (2 * 230 ** 2)) * Math.exp(-d / 10) * Math.cos(d * 0.5);
    }
    return v;
  };
  return { x0, x1, T, y, top: x => y(x) - T / 2, adelg };
}

function dibujaCinta(c, f) {
  const k = cinta(f);
  if (k.x1 - k.x0 < 2) return;
  const paso = 12, pts = [];
  for (let x = k.x0; x < k.x1; x += paso) pts.push([x, k.y(x)]);
  pts.push([k.x1, k.y(k.x1)]);
  const h = k.T / 2, redondo = k.adelg;
  const ruta = () => {
    c.beginPath();
    pts.forEach(([x, y], i) => i ? c.lineTo(x, y - h) : c.moveTo(x, y - h));
    const [xe, ye] = pts[pts.length - 1];
    if (redondo > .5) c.arc(xe, ye, h, -Math.PI / 2, Math.PI / 2);
    for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + h);
    if (redondo > .5) c.arc(pts[0][0], pts[0][1], h, Math.PI / 2, -Math.PI / 2);
    c.closePath();
  };
  // sombra de contacto sobre el fondo
  c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = lerp(46, 14, k.adelg); c.shadowOffsetY = lerp(26, 8, k.adelg) * S; c.shadowOffsetX = 10 * S;
  ruta(); c.fillStyle = C.champ2; c.fill(); c.restore();
  // cuerpo: satén con luz arriba
  c.save(); ruta(); c.clip();
  const ym = Y_CINTA - 20, g = c.createLinearGradient(0, k.y(540) - h - 30, 0, k.y(540) + h + 30);
  g.addColorStop(0, '#fbeecb'); g.addColorStop(.22, C.champ); g.addColorStop(.62, '#d3b578'); g.addColorStop(1, '#a8884c');
  c.fillStyle = g; c.fillRect(k.x0 - 20, ym - 400, k.x1 - k.x0 + 40, 900);
  // pliegues: cada tramo se aclara u oscurece según su pendiente (luz arriba-izquierda)
  {
    const pg = c.createLinearGradient(pts[0][0], 0, pts[pts.length - 1][0], 0), ancho = pts[pts.length - 1][0] - pts[0][0];
    for (let i = 0; i < pts.length - 1; i += 2) {
      const j = Math.min(pts.length - 1, i + 2), m = (pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0]), a = clamp(Math.abs(m) * 1.6, 0, .34);
      pg.addColorStop(clamp((pts[i][0] - pts[0][0]) / ancho), m > 0 ? `rgba(60,40,10,${a})` : `rgba(255,248,225,${a})`);
    }
    c.fillStyle = pg; c.fillRect(k.x0 - 20, ym - 400, k.x1 - k.x0 + 40, 900);
  }
  // brillo de satén que viaja por la tela
  if (k.T > 30) {
    const bx = ((f * 9) % 2200) - 500, bg = c.createLinearGradient(bx - 260, 0, bx + 260, 0);
    bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(.5, 'rgba(255,252,240,.26)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = bg; c.fillRect(bx - 260, ym - 400, 520, 900);
    // dobladillo: pespunte cerca de cada orilla
    c.lineWidth = 2; c.setLineDash([10, 7]);
    for (const s of [-1, 1]) {
      c.strokeStyle = s < 0 ? 'rgba(120,92,44,.55)' : 'rgba(110,84,40,.5)';
      c.beginPath(); pts.forEach(([x, y], i) => { const yy = y + s * (h - Math.min(15, k.T * .12)); i ? c.lineTo(x, yy) : c.moveTo(x, yy); }); c.stroke();
    }
    c.setLineDash([]);
  }
  // filo de luz arriba y sombra abajo (grosor de la tela)
  c.lineWidth = Math.max(1.5, k.T * .02); c.strokeStyle = 'rgba(255,250,232,.75)';
  c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y - h + 1) : c.moveTo(x, y - h + 1)); c.stroke();
  c.strokeStyle = 'rgba(80,58,22,.6)';
  c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y + h - 1) : c.moveTo(x, y + h - 1)); c.stroke();
  c.restore();
}

// ───────── palabras
function glifo(c, m, g, x, y, rot, sx, sy, color) {
  c.save(); c.translate(x + g.w / 2, y); c.rotate(rot); c.scale(sx, sy);
  c.font = `${m.peso} ${m.tam}px ${SERIF}`; c.textBaseline = 'alphabetic'; c.letterSpacing = '0px';
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 18; c.shadowOffsetX = 5 * S; c.shadowOffsetY = 9 * S;
  c.fillStyle = color; c.fillText(g.ch, -g.w / 2, 0);
  c.restore();
}
function colorMarfil(c, y, tam) { const g = c.createLinearGradient(0, y - tam * .7, 0, y); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, C.marfil); g.addColorStop(1, '#d9d0bd'); return g; }
function colorChamp(c, y, tam) { const g = c.createLinearGradient(0, y - tam * .7, 0, y); g.addColorStop(0, '#fbeecb'); g.addColorStop(.5, C.champ); g.addColorStop(1, '#b8975a'); return g; }

// "TU EVENTO": sube desde detrás de la cinta como tela que se acomoda; luego cede el lugar.
function tuEvento(c, f, k) {
  const m = medidas.tu, sube = inOut(prog(f, 138, 164));
  const esc = lerp(1, 0.6, sube), base = lerp(0, -196, sube);
  const xi = 540 - m.ancho / 2;
  m.gl.forEach((g, i) => {
    if (g.ch === ' ') return;
    const ini = (i < 2 ? 24 : 30 - 3 * 2) + i * 2;            // "Tu" en el cuadro 24, "evento" en el 30; 33 ms por glifo
    const p = prog(f, ini, ini + 26); if (p <= 0) return;
    const e = outBack(p, 1.15);
    const gx = 540 + (xi + g.x - 540) * esc;
    const apoyo = Math.min(Y_CINTA - T_CINTA / 2 - 6, k.top(xi + g.x + g.w / 2) - 6);
    const y = apoyo + (1 - e) * 150 + base + Math.sin(sube * Math.PI) * -8 * Math.sin(i * 1.3);
    const rot = (1 - outCubic(p)) * (i % 2 ? .1 : -.1);
    c.save(); c.translate(gx, y); c.scale(esc, esc); c.translate(-gx, -y);
    glifo(c, m, g, gx, y, rot, 1, lerp(.82, 1, outCubic(p)), colorMarfil(c, y, m.tam));
    c.restore();
  });
}
// "BIEN SENTADO.": cada palabra cae, pega en la cinta y rebota como silla que aterriza.
function bienSentado(c, f, k) {
  const m = medidas.bien, xi = 540 - m.ancho / 2;
  m.gl.forEach((g, i) => {
    if (g.ch === ' ') return;
    const pal = i < 4 ? 0 : 1, ini = (pal ? 170 : 156) + (i - (pal ? 5 : 0)) * 1.5;
    const d = f - ini; if (d < 0) return;
    const CAE = 12;
    let dy, sy = 1, rot;
    if (d < CAE) { const q = d / CAE; dy = -1150 * (1 - q * q); rot = (pal ? -.07 : .06) * (1 - q); }
    else { const b = d - CAE; dy = -52 * Math.abs(Math.sin(b * .26)) * Math.exp(-b / 9); sy = 1 - .14 * Math.exp(-b / 3.2); rot = .035 * Math.sin(b * .5 + i) * Math.exp(-b / 7); }
    const x = xi + g.x, apoyo = Math.min(Y_CINTA - T_CINTA / 2 - 8, k.top(x + g.w / 2) - 8);
    const y = apoyo + dy;
    // sombra de contacto: crece cuando la letra aterriza
    const cerca = clamp(1 + dy / 240);
    if (cerca > 0 && k.adelg < 1) {
      c.save(); c.globalAlpha = .34 * cerca * (1 - k.adelg); c.fillStyle = '#2a1c06'; c.filter = `blur(${7 * S}px)`;
      c.beginPath(); c.ellipse(x + g.w / 2 + 6, apoyo + 16, g.w * .5 * (.6 + .4 * cerca), 9, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    if (d < CAE) {
      // caída rápida: se reparte en 5 muestras dentro del subcuadro para que el barrido sea continuo
      const v = 2 * 1150 * (d / CAE) / CAE, N = 10;
      c.save(); c.globalAlpha = 1 / N * 1.9;
      for (let j = 0; j < N; j++) glifo(c, m, g, x, y + ((j + .5) / N - .5) * v * SUBPASO, rot, 1, 1, colorChamp(c, y, m.tam));
      c.restore();
    } else glifo(c, m, g, x, y, rot, 1 + (1 - sy) * .6, sy, colorChamp(c, y, m.tam));
  });
}

// ───────── cámara, scroll y marco (un solo plano continuo)
const TEL = { x: 140, y: 95, w: 800, h: 1731, r: 96 };
const K = TEL.w / 390;                       // px de diseño por px CSS de la página
const ANILLO = { cx: 540, cy: 640, d: 350 };  // end card: el marco se cierra en un aro alrededor del logo
function kf(f, keys, ease = inOut) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (f <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return lerp(va, vb, ease((f - a) / (b - a))); }
  return keys[keys.length - 1][1];
}
const camara = f => ({
  z: kf(f, [[432, 1], [504, 1.22], [1152, 1.22], [1204, .7], [1296, .7], [1350, 1.22], [1440, 1.22], [1494, 1]]),
  oy: kf(f, [[432, 0], [504, 125], [1152, 125], [1204, 346], [1296, 346], [1350, -692], [1440, -692], [1494, 0]]),
});
let SCROLL;
function prepararScroll() {
  const sCat = ui.catH2[1] - 100, sCat2 = ui.cards[0].r[1] - 150, sBen = ui.cintillo[1] - 400, sGal = ui.galKicker[1] - 100, sMax = ui.alto - 844;
  SCROLL = [[432, 0], [500, sCat], [590, sCat], [650, sCat2], [770, sCat2], [850, sBen], [950, sBen], [1020, sGal], [1160, sGal], [1300, sMax]];
}
const scroll = f => kf(f, SCROLL);

function marco(f) {
  if (f < 1440) {
    const a = inOut(prog(f, 236, 294));
    return { a, x: TEL.x, y: lerp(962, TEL.y, a), w: TEL.w, h: lerp(14, TEL.h, a), r: lerp(7, TEL.r, a), borde: lerp(14, 13, a), fin: 0 };
  }
  const e = inOut(prog(f, 1440, 1496)), d = ANILLO.d;
  return { a: 1, x: lerp(TEL.x, ANILLO.cx - d / 2, e), y: lerp(TEL.y, ANILLO.cy - d / 2, e), w: lerp(TEL.w, d, e), h: lerp(TEL.h, d, e), r: lerp(TEL.r, d / 2, e), borde: lerp(13, 12, e), fin: e };
}
const giroTel = f => clamp(18 * Math.sin(Math.PI * Math.pow(prog(f, 240, 372), .55)) * (1 - prog(f, 240, 372)) * 1.9, 0, 18);
const escTel = f => lerp(.955, 1, inOut(prog(f, 250, 372)));
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }

// ───────── piezas de la página
// Tarjeta que se desenrolla de arriba hacia abajo y llega inclinada (toque 3D #2, ≤ 10°), por filas con perspectiva.
function pieza(c, im, dx, dy, dw, dh, tilt, rev, radio) {
  const hv = dh * rev; if (hv < 1) return;
  if (tilt < .08) { c.save(); rr(c, dx, dy, dw, hv + (rev < 1 ? 0 : 0), radio); c.clip(); c.drawImage(im, dx, dy, dw, dh); c.restore(); return; }
  const t = tilt * Math.PI / 180, d = 1500, paso = 2, ky = im.height / dh, cos = Math.cos(t), sin = Math.sin(t);
  const Y = v => { const s = d / (d - v * sin); return [dy + v * cos * s, s]; };
  for (let v = 0; v < hv; v += paso) {
    const [ya, s] = Y(v), [yb] = Y(v + paso), w = dw * s;
    c.drawImage(im, 0, v * ky, im.width, paso * ky, dx + dw / 2 - w / 2, ya, w, yb - ya + .5);
  }
}
function brillo(c, x, y, w, h, radio, p) {
  if (p <= 0 || p >= 1) return;
  c.save(); rr(c, x, y, w, h, radio); c.clip();
  const sx = x + lerp(-w * .5, w * 1.5, inOut(p)), g = c.createLinearGradient(sx - w * .22, 0, sx + w * .22, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,248,228,.34)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.transform(1, 0, -.4, 1, (y + h / 2) * .4, 0); c.fillStyle = g; c.fillRect(x - w, y - 20, w * 3, h + 40); c.restore();
}
const ENTRA = [504, 540, 576, 796, 804, 820, 828];
const ENTRA_CINT = 838;
function numero(c, txt, x, base, alto, f, ini, pop) {
  // sube enmascarado (sin fundido) y remata con un pequeño salto
  const p = prog(f, ini, ini + 10); if (p <= 0) return 0;
  c.save(); c.beginPath(); c.rect(x - 10, base - alto * 1.02, 600, alto * 1.24); c.clip();
  c.translate(x, base + (1 - outCubic(p)) * alto * 1.15); c.scale(pop, pop);
  c.font = `700 ${alto}px ${SERIF}`; c.textBaseline = 'alphabetic'; c.fontVariantNumeric = 'lining-nums';
  c.fillStyle = colorChamp(c, 0, alto); c.fillText(txt, 0, 0); const w = c.measureText(txt).width; c.restore();
  return w * pop;
}

function pantalla(c, f) {
  const sc = scroll(f), X = x => TEL.x + x * K, Y = y => TEL.y + (y - sc) * K, D = ui.dpr;
  const visible = (y, h) => y + h > sc - 40 && y < sc + 884;
  c.drawImage(pagina, 0, sc * D, 390 * D, 844 * D, TEL.x, TEL.y, TEL.w, TEL.h);
  // brillo del botón dorado del hero
  if (sc < 600) brillo(c, X(ui.btn[0]), Y(ui.btn[1]), ui.btn[2] * K, ui.btn[3] * K, ui.btn[3] * K / 2, prog(f, 318, 356));

  // tarjetas
  ui.cards.forEach((cd, i) => {
    const [x, y, w, h] = cd.r, e = ENTRA[i]; if (f < e || !visible(y, h)) return;
    const rev = outCubic(prog(f, e, e + 18)), tilt = 10 * (1 - outCubic(prog(f, e, e + 30)));
    pieza(c, sprites['card' + i], X(x), Y(y), w * K, h * K, tilt, rev, 22 * K);
    brillo(c, X(x), Y(y), w * K, h * K, 22 * K, prog(f, e + 12, e + 44));
    if (i < 3) brillo(c, X(x), Y(y), w * K, h * K, 22 * K, prog(f, 664 + i * 12, 700 + i * 12));
    if (cd.precio) {
      const [px, py, , ph] = cd.precio, alto = 40 * K, base = Y(py) + ph * K * .86;
      const val = Math.round(cd.valor * outCubic(prog(f, e + 16, e + 40)));
      const pop = 1 + .22 * Math.sin(Math.PI * prog(f, e + 38, e + 52));
      const w = numero(c, '$' + val, X(px), base, alto, f, e + 14, pop);
      if (w && f > e + 40) {
        const p = prog(f, e + 40, e + 50);
        c.save(); c.beginPath(); c.rect(X(px), base - 16 * K, 600, 20 * K); c.clip();
        c.font = `500 ${12 * K}px Inter`; c.letterSpacing = `${12 * K * .08}px`; c.fillStyle = 'rgba(246,241,231,.5)';
        c.fillText('RENTA', X(px) + w + 8 * K, base - 1 + (1 - outCubic(p)) * 20 * K); c.restore();
      }
    }
  });
  // la cinta enlaza los tres precios con un trazo continuo
  trazo(c, f, trazos.precios, 700, 792, X(0), Y(0));

  // cintillo de pick up con su 10 %
  { const [x, y, w, h] = ui.cintillo, e = ENTRA_CINT;
    if (f >= e && visible(y, h)) {
      pieza(c, sprites.cintillo, X(x), Y(y), w * K, h * K, 10 * (1 - outCubic(prog(f, e, e + 30))), outCubic(prog(f, e, e + 18)), 22 * K);
      brillo(c, X(x), Y(y), w * K, h * K, 22 * K, prog(f, e + 12, e + 44));
      const [px, py, , ph] = ui.pct, alto = 62 * K, base = Y(py) + ph * K * .9;
      const val = Math.round(10 * outCubic(prog(f, e + 14, e + 40))), pop = 1 + .2 * Math.sin(Math.PI * prog(f, e + 38, e + 54));
      const wn = numero(c, String(val), X(px), base, alto, f, e + 12, pop);
      if (wn) numero(c, '%', X(px) + wn + 3 * K, base - alto * .3, alto * .5, f, e + 20, pop);
      trazo(c, f, trazos.cintillo, 884, 950, X(0), Y(0));
    } }

  // galería: carrusel con paralaje 2.5D (toque 3D #3)
  if (visible(ui.figs[0].r[1], ui.figs[0].r[3])) {
    const [fx, fy, fw, fh] = ui.figs[0].r, pasoG = fw + 12;
    const gs = kf(f, [[1016, 0], [1150, 2 * pasoG], [1215, 2.35 * pasoG]], t => t * t * (3 - 2 * t));
    const orden = ui.figs.map((g, i) => ({ g, i, dx: (fx + i * pasoG + fw / 2 - gs - 195) / 195 })).sort((a, b) => Math.abs(b.dx) - Math.abs(a.dx));
    for (const { g, i, dx } of orden) {
      if (Math.abs(dx) > 2.2) continue;
      const esc = 1 - .1 * Math.min(1, Math.abs(dx)), w = fw * K * esc, h = fh * K * esc;
      const cx = X(195 + dx * 195 * (1 - .06 * Math.min(1, Math.abs(dx)))), cy = Y(fy + fh / 2);
      const x = cx - w / 2, y = cy - h / 2, im = fotos[i];
      c.save(); c.shadowColor = 'rgba(0,0,0,.65)'; c.shadowBlur = 40 * esc * S; c.shadowOffsetY = 22 * S; rr(c, x, y, w, h, 22 * K * esc); c.fillStyle = '#0b0a09'; c.fill(); c.restore();
      c.save(); rr(c, x, y, w, h, 22 * K * esc); c.clip();
      // la foto es más ancha que su marco y se desliza en contra del movimiento (profundidad)
      const k2 = Math.max(w * 1.22 / im.width, h * 1.04 / im.height), iw = im.width * k2, ih = im.height * k2;
      const [pxs, pys] = g.pos.split(' ').map(v => parseFloat(v) / 100);
      c.drawImage(im, x - (iw - w) * clamp(pxs + dx * .42), y - (ih - h) * pys, iw, ih);
      c.fillStyle = `rgba(15,14,13,${.38 * Math.min(1, Math.abs(dx))})`; c.fillRect(x, y, w, h);
      c.restore();
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(246,241,231,.22)'; rr(c, x, y, w, h, 22 * K * esc); c.stroke();
    }
    // puntos
    const act = gs / pasoG; let px = X(195) - (6 * 6 + 5 * 7 + 16) * K / 2; const py = Y(ui.puntos[1]) + 3 * K;
    for (let i = 0; i < 6; i++) {
      const on = clamp(1 - Math.abs(i - act)), w = (6 + 16 * on) * K;
      c.fillStyle = on > .5 ? C.champ : 'rgba(246,241,231,.42)'; rr(c, px, py, w, 6 * K, 3 * K); c.fill(); px += w + 7 * K;
    }
  }

  // botón final con press real
  { const [x, y, w, h] = ui.cta;
    if (visible(y, h)) {
      const d = f - 1368, pr = d < 0 ? 0 : d < 5 ? outCubic(d / 5) : d < 9 ? 1 : 1 - outCubic(clamp((d - 9) / 16));
      const s = 1 - .045 * pr, cx = X(x + w / 2), cy = Y(y + h / 2) + 3 * pr;
      c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
      rr(c, X(x), Y(y), w * K, h * K, h * K / 2); c.save(); c.clip(); c.drawImage(sprites.cta, X(x), Y(y), w * K, h * K);
      c.fillStyle = `rgba(60,40,10,${.26 * pr})`; c.fillRect(X(x), Y(y), w * K, h * K); c.restore(); c.restore();
      brillo(c, X(x), Y(y), w * K, h * K, h * K / 2, prog(f, 1392, 1430));
      // onda del toque
      if (d > 2 && d < 40) { const q = (d - 2) / 38; c.save(); c.lineWidth = 6 * (1 - q) + 1; c.strokeStyle = `rgba(246,241,231,${.7 * (1 - q)})`; c.beginPath(); c.arc(cx + 60, cy, 40 + 260 * outCubic(q), 0, 7); c.stroke(); c.restore(); }
      // dedo de cristal
      const en = outCubic(prog(f, 1338, 1366)), sale = inOut(prog(f, 1382, 1410));
      if (en > 0 && sale < 1) {
        const tx = cx + 60 + (1 - en) * 300 + sale * 340, ty = cy + (1 - en) * 520 + sale * 600, r = 44 * (1 - .14 * pr);
        c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 24 * S; c.shadowOffsetY = 12 * (1 - pr) * S;
        const g = c.createRadialGradient(tx - 14, ty - 16, 2, tx, ty, r); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(246,241,231,.16)');
        c.fillStyle = g; c.beginPath(); c.arc(tx, ty, r, 0, 7); c.fill(); c.restore();
        c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(tx, ty, r, 0, 7); c.stroke();
      }
    } }
}

// Trazo de cinta que se dibuja de principio a fin (coordenadas CSS de la página).
const trazos = {};
function prepararTrazos() {
  const largo = d => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); return p.getTotalLength(); };
  const u = ui.cards.slice(0, 3).map(cd => { const [x, y, , h] = cd.precio; return { l: x - 2, r: x + 150, y: y + h + 7 }; });
  let d = `M${u[0].l} ${u[0].y} L${u[0].r} ${u[0].y}`;
  d += ` C${u[0].r + 52} ${u[0].y} ${u[1].r + 52} ${u[1].y} ${u[1].r} ${u[1].y} L${u[1].l} ${u[1].y}`;
  d += ` C${u[1].l - 24} ${u[1].y} ${u[2].l - 24} ${u[2].y} ${u[2].l} ${u[2].y} L${u[2].r} ${u[2].y}`;
  trazos.precios = { d, L: largo(d), p2: new Path2D(d) };
  const [x, y, w, h] = ui.cintillo, m = 5, r = 26, a = x - m, b = y - m, ww = w + 2 * m, hh = h + 2 * m;
  d = `M${a + r} ${b} H${a + ww - r} A${r} ${r} 0 0 1 ${a + ww} ${b + r} V${b + hh - r} A${r} ${r} 0 0 1 ${a + ww - r} ${b + hh} H${a + r} A${r} ${r} 0 0 1 ${a} ${b + hh - r} V${b + r} A${r} ${r} 0 0 1 ${a + r} ${b}`;
  trazos.cintillo = { d, L: largo(d), p2: new Path2D(d) };
}
function trazo(c, f, t, a, b, ox, oy) {
  const p = inOut(prog(f, a, b)); if (p <= 0) return;
  c.save(); c.translate(ox, oy); c.scale(K, K);
  c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([t.L * p, t.L * 2]);
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 10 * S; c.shadowOffsetY = 4 * S;
  c.lineWidth = 4.6; c.strokeStyle = C.champ2; c.stroke(t.p2);
  c.shadowColor = 'transparent'; c.lineWidth = 3.2; c.strokeStyle = C.champ; c.stroke(t.p2);
  c.lineWidth = 1; c.strokeStyle = 'rgba(255,250,230,.8)'; c.translate(0, -1); c.stroke(t.p2);
  c.restore();
}

// Barra superior de cristal real: desenfoca lo que tiene detrás.
function barra(c, f, M) {
  const [bx, by, bw, bh] = ui.barra, x = TEL.x + bx * K, y = TEL.y + by * K, w = bw * K, h = bh * K;
  const dev = (px, py) => [M.a * px + M.e, M.d * py + M.f];
  const [x0, y0] = dev(x, y), [x1, y1] = dev(x + w, y + h), mg = 60 * M.a;
  if (y1 < -20 || y0 > H + 20) return;
  c.save(); rr(c, x, y, w, h, h / 2); c.clip();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.filter = `blur(${32 * K * M.a}px) saturate(140%)`;
  c.drawImage(tel, x0 - mg, y0 - mg, x1 - x0 + 2 * mg, y1 - y0 + 2 * mg, x0 - mg, y0 - mg, x1 - x0 + 2 * mg, y1 - y0 + 2 * mg); c.restore();
  const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(246,241,231,.16)'); g.addColorStop(.6, 'rgba(246,241,231,.06)');
  c.fillStyle = 'rgba(20,18,15,.35)'; c.fillRect(x, y, w, h); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(246,241,231,.2)'; rr(c, x, y, w, h, h / 2); c.stroke();
  const cy = y + h / 2, lr = 18 * K;
  c.save(); c.beginPath(); c.arc(x + 10 * K + lr, cy, lr, 0, 7); c.clip(); c.drawImage(logo, x + 10 * K, cy - lr, lr * 2, lr * 2); c.restore();
  c.font = `600 ${19 * K}px ${SERIF}`; c.letterSpacing = `${19 * K * .14}px`; c.textBaseline = 'middle'; c.fillStyle = C.marfil; c.fillText('SELLA', x + 56 * K, cy + 1);
  const pw = 76 * K, ph = 35 * K, px = x + w - 8 * K - pw; c.fillStyle = C.champ; rr(c, px, cy - ph / 2, pw, ph, ph / 2); c.fill();
  c.font = `600 ${13 * K}px Inter`; c.letterSpacing = '0px'; c.textAlign = 'center'; c.fillStyle = '#1b1610'; c.fillText('Cotizar', px + pw / 2, cy + 1);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
}

function capaTelefono(f) {
  const c = tctx, t = marco(f), cam = camara(f);
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  const M = { a: S * cam.z, d: S * cam.z, e: S * 540 * (1 - cam.z), f: S * (960 * (1 - cam.z) + cam.oy) };
  c.setTransform(M.a, 0, 0, M.d, M.e, M.f);
  const { x, y, w, h } = t;
  c.save(); c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = lerp(14, 90, t.a) * S; c.shadowOffsetY = lerp(8, 50, t.a) * S; c.shadowOffsetX = 18 * t.a * S;
  rr(c, x, y, w, h, t.r); c.fillStyle = '#0b0a09'; c.fill(); c.restore();
  if (f < 300) { const k0 = cinta(f); tuEvento(c, f, k0); bienSentado(c, f, k0); }
  c.save(); rr(c, x, y, w, h, t.r); c.clip();
  pantalla(c, f);
  barra(c, f, M);
  if (t.fin > 0) {   // el logo aparece dentro del aro por una máscara circular que crece (sin fundido)
    const r = (ANILLO.d / 2) * outCubic(prog(f, 1448, 1494));
    if (r > 1) { c.save(); c.beginPath(); c.arc(ANILLO.cx, ANILLO.cy, r, 0, 7); c.clip(); c.fillStyle = C.carbon; c.fillRect(0, 0, DW, DH);
      c.drawImage(logo, ANILLO.cx - ANILLO.d / 2, ANILLO.cy - ANILLO.d / 2, ANILLO.d, ANILLO.d); c.restore(); }
  }
  const rp = prog(f, 262, 372);
  if (rp > 0 && rp < 1) {
    const gx = lerp(-500, 1500, outCubic(rp)), g = c.createLinearGradient(gx - 320, 0, gx + 320, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,246,225,${.16 * Math.sin(Math.PI * rp)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.save(); c.transform(1, 0, -.45, 1, 0, 0); c.fillStyle = g; c.fillRect(-400, 0, 2600, DH); c.restore();
  }
  c.lineWidth = 40; c.strokeStyle = 'rgba(0,0,0,.35)'; c.filter = `blur(${12 * S * cam.z}px)`; rr(c, x, y, w, h, t.r); c.stroke(); c.filter = 'none';
  c.restore();
  const g = c.createLinearGradient(x, y, x + w, y + Math.max(h, 40));
  g.addColorStop(0, '#fbeecb'); g.addColorStop(.3, C.champ); g.addColorStop(.7, '#c7a665'); g.addColorStop(1, '#a8884c');
  c.lineWidth = t.borde; c.strokeStyle = g; rr(c, x, y, w, h, t.r); c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,252,238,.8)'; rr(c, x - t.borde / 2 + 1, y - t.borde / 2 + 1, w + t.borde - 2, h + t.borde - 2, t.r + t.borde / 2); c.stroke();
  c.strokeStyle = 'rgba(70,50,18,.7)'; rr(c, x + t.borde / 2 - 1, y + t.borde / 2 - 1, w - t.borde + 2, h - t.borde + 2, Math.max(1, t.r - t.borde / 2)); c.stroke();
}
// Giro en Y con perspectiva real, por columnas (toque 3D #1, ≤ 18°).
function proyectaTelefono(c, f) {
  const th = giroTel(f) * Math.PI / 180, esc = escTel(f);
  if (th < 0.002 && esc > .9995) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(tel, 0, 0); c.restore(); return; }
  const cx = W / 2, cy = H * (TEL.y + TEL.h / 2) / DH, d = 2600 * S, cos = Math.cos(th), sin = Math.sin(th), paso = 2;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingQuality = 'high';
  const X = x => { const u = (x - cx) * esc, z = u * sin, s = d / (d + z); return [cx + u * cos * s, s * esc]; };
  for (let x = 0; x < W; x += paso) { const [xa, sa] = X(x), [xb] = X(x + paso); c.drawImage(tel, x, 0, paso, H, xa, cy - cy * sa, xb - xa + .6, H * sa); }
  c.restore();
}

// ───────── texto cinético de la segunda mitad
// Letras que suben enmascaradas (sin fundido), una por una.
function sube(c, m, cx, base, f, ini, paso, color, dur = 20) {
  const xi = cx - m.ancho / 2;
  m.gl.forEach((g, i) => {
    if (g.ch === ' ') return; const p = prog(f, ini + i * paso, ini + i * paso + dur); if (p <= 0) return;
    c.save(); c.beginPath(); c.rect(xi + g.x - 30, base - m.tam * .95, g.w + 60, m.tam * 1.22); c.clip();
    glifo(c, m, g, xi + g.x, base + (1 - outCubic(p)) * m.tam * 1.2, 0, 1, 1, typeof color === 'function' ? color(c, base, m.tam) : color);
    c.restore();
  });
}
const ser = rng(4495093260 % 2147483647);
const SERPENTINAS = Array.from({ length: 22 }, (_, i) => ({ a: -Math.PI * (.12 + .76 * ser()), v: 16 + 20 * ser(), w: 34 + 40 * ser(), g: .5 + .4 * ser(), r: ser() * 6, vr: (ser() - .5) * .5, x: 300 + 480 * ser(), col: i % 3 }));
function fiesta(c, f) {
  if (f < 1160 || f > 1360) return;
  const a = medidas.tuPones, b = medidas.laFiesta;
  // "TÚ PONES": cada letra entra deslizándose desde la izquierda y frena, como sillas que se alinean
  const xa = 540 - a.ancho / 2;
  a.gl.forEach((g, i) => {
    if (g.ch === ' ') return; const ini = 1172 + i * 1.6, p = prog(f, ini, ini + 22); if (p <= 0) return;
    const x = xa + g.x - (1 - outBack(p, 1.3)) * 620;
    glifo(c, a, g, x, 430, (1 - outCubic(p)) * -.12, 1, 1, colorMarfil(c, 430, a.tam));
  });
  // "LA FIESTA": cada letra brinca desde abajo con giro, como confeti que cae en su lugar
  const xb = 540 - b.ancho / 2;
  b.gl.forEach((g, i) => {
    if (g.ch === ' ') return; const ini = (i < 2 ? 1192 : 1202 - 3 * 1.8) + i * 1.8, d = f - ini; if (d < 0) return;
    const p = clamp(d / 20), e = outBack(p, 2.2), esc = lerp(.2, 1, e);
    const y = 640 + (1 - e) * 120 - 26 * Math.exp(-d / 9) * Math.abs(Math.sin(d * .32)) * (p >= 1 ? 1 : 0);
    glifo(c, b, g, xb + g.x, y, (1 - outCubic(p)) * (i % 2 ? .5 : -.5), esc, esc, colorChamp(c, y, b.tam));
  });
  // serpentinas de la misma tela champaña
  const d0 = f - 1204;
  if (d0 > 0 && d0 < 110) for (const s of SERPENTINAS) {
    const x = s.x + Math.cos(s.a) * s.v * d0 * Math.exp(-d0 / 60) * 2.2, y = 600 + Math.sin(s.a) * s.v * d0 * 1.5 + s.g * d0 * d0 * .5;
    if (y > 2000) continue;
    c.save(); c.translate(x, y); c.rotate(s.r + s.vr * d0); c.scale(1, Math.cos(d0 * .2 + s.r));
    c.fillStyle = [C.champ, '#fbeecb', '#c7a665'][s.col]; rr(c, -s.w / 2, -7, s.w, 14, 4); c.fill(); c.restore();
  }
}
function telefonoGrande(c, f) {
  // "449 509 3260" en grande bajo el teléfono; se queda para la end card
  if (f < 1344) return;
  const m = medidas.tel, base = kf(f, [[1440, 1500], [1500, 1238]]);
  sube(c, m, 540, base, f, 1344, 1.4, colorChamp, 18);
}
function endCard(c, f) {
  if (f < 1470) return;
  sube(c, medidas.sella, 540, 990, f, 1482, 1.6, colorMarfil, 22);
  // la cinta subraya el nombre
  const p = inOut(prog(f, 1506, 1540));
  if (p > 0) { const w = 300 * p; c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 10 * S; c.shadowOffsetY = 5 * S;
    const g = c.createLinearGradient(0, 1022, 0, 1034); g.addColorStop(0, '#fbeecb'); g.addColorStop(1, '#b8975a'); c.fillStyle = g; rr(c, 540 - w / 2, 1022, w, 11, 5.5); c.fill(); c.restore(); }
  sube(c, medidas.ags, 540, 1108, f, 1516, 1.2, C.champ, 18);
  sube(c, medidas.demo1, 540, 1420, f, 1536, .5, 'rgba(246,241,231,.62)', 18);
  sube(c, medidas.demo2, 540, 1486, f, 1548, .5, 'rgba(246,241,231,.62)', 18);
  // pulso de luz en el golpe final
  const d = f - 1596; if (d > 0) { const a = .12 * Math.exp(-d / 10); const g = c.createRadialGradient(540, 640, 0, 540, 640, 900); g.addColorStop(0, `rgba(232,207,154,${a})`); g.addColorStop(1, 'rgba(232,207,154,0)'); c.fillStyle = g; c.fillRect(0, 0, DW, DH); }
}

// ───────── un subcuadro
function escena(c, f) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(fondo, 0, 0);
  c.setTransform(S, 0, 0, S, 0, 0);
  const dest = Math.exp(-Math.max(0, f) / 16);
  if (dest > .01) { const g = c.createRadialGradient(540, Y_CINTA, 0, 540, Y_CINTA, 900); g.addColorStop(0, `rgba(232,207,154,${.2 * dest})`); g.addColorStop(1, 'rgba(232,207,154,0)'); c.fillStyle = g; c.fillRect(0, 0, DW, DH); }
  if (f < 236) { const k = cinta(f); tuEvento(c, f, k); bienSentado(c, f, k); dibujaCinta(c, f); return; }
  fiesta(c, f);
  capaTelefono(f); proyectaTelefono(c, f);
  c.setTransform(S, 0, 0, S, 0, 0);
  telefonoGrande(c, f);
  endCard(c, f);
}

window.renderFrame = async (f, { sub = 8, shutter = 1 } = {}) => {
  SUBPASO = shutter / sub;
  for (let i = 0; i < sub; i++) {
    escena(wctx, f + ((i + .5) / sub - .5) * shutter);
    actx.globalAlpha = 1 / (i + 1); actx.drawImage(work, 0, 0);
  }
  octx.globalAlpha = 1; octx.drawImage(acc, 0, 0);
  const r = rng(Math.floor(f) * 7919 + 13), ox = r() * 256 | 0, oy = r() * 256 | 0;
  octx.save(); octx.globalAlpha = .028; octx.globalCompositeOperation = 'overlay'; octx.fillStyle = octx.createPattern(grano, 'repeat');
  octx.translate(-ox, -oy); octx.fillRect(ox, oy, W, H); octx.restore();
  return out.toDataURL('image/png');
};

init().then(() => { window.ready = true; }).catch(e => { window.initError = String(e && e.stack || e); });
