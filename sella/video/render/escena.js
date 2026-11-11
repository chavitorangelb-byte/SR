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

let hero, heroMeta, grano, fondo;
let SUBPASO = 1 / 8;   // duración de un subcuadro, en cuadros
const medidas = {};

async function init() {
  const fuentes = [['500', 'normal'], ['600', 'normal'], ['700', 'normal'], ['500', 'italic']];
  for (const [w, st] of fuentes) {
    const ff = new FontFace('Cormorant Garamond', `url(/web/fonts/cormorant-garamond-latin-${w}-${st}.woff2)`, { weight: w, style: st });
    document.fonts.add(await ff.load());
  }
  hero = await img(UI + '/hero.png');
  heroMeta = await (await fetch(UI + '/hero.json')).json();
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
  for (let i = 0; i < pts.length - 1; i++) {
    const [xa, ya] = pts[i], [xb, yb] = pts[i + 1];
    const m = (yb - ya) / (xb - xa), a = clamp(Math.abs(m) * 1.6, 0, .34);
    c.fillStyle = m > 0 ? `rgba(60,40,10,${a})` : `rgba(255,248,225,${a})`;
    c.fillRect(xa, Math.min(ya, yb) - h - 2, xb - xa + .6, k.T + Math.abs(yb - ya) + 4);
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
      const v = 2 * 1150 * (d / CAE) / CAE, N = 5;
      c.save(); c.globalAlpha = 1 / N * 1.6;
      for (let j = 0; j < N; j++) glifo(c, m, g, x, y + ((j + .5) / N - .5) * v * SUBPASO, rot, 1, 1, colorChamp(c, y, m.tam));
      c.restore();
    } else glifo(c, m, g, x, y, rot, 1 + (1 - sy) * .6, sy, colorChamp(c, y, m.tam));
  });
}

// ───────── teléfono: la cinta se desenrolla y se vuelve su marco
const TEL = { x: 140, y: 95, w: 800, h: 1731, r: 96 };
function telefono(f) {
  const a = inOut(prog(f, 236, 294));
  const top = lerp(962, TEL.y, a), bot = lerp(976, TEL.y + TEL.h, a);
  const giro = 18 * Math.sin(Math.PI * Math.pow(prog(f, 240, 372), .55)) * (1 - prog(f, 240, 372)) * 1.9;   // entra girado y se endereza
  return { a, top, bot, r: lerp(7, TEL.r, a), borde: lerp(14, 13, a), giro: clamp(giro, 0, 18), esc: lerp(.955, 1, inOut(prog(f, 250, 372))) };
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); }

function capaTelefono(f, t) {
  const c = tctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.setTransform(S, 0, 0, S, 0, 0);
  const x = TEL.x, w = TEL.w, y = t.top, h = t.bot - t.top;
  // sombra del aparato
  c.save(); c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = lerp(14, 90, t.a) * S; c.shadowOffsetY = lerp(8, 50, t.a) * S; c.shadowOffsetX = 18 * t.a * S;
  rr(c, x, y, w, h, t.r); c.fillStyle = '#0b0a09'; c.fill(); c.restore();
  const k0 = cinta(f); tuEvento(c, f, k0); bienSentado(c, f, k0);
  // pantalla: la página real, descubierta por la apertura (sin fundidos)
  c.save(); rr(c, x, y, w, h, t.r); c.clip();
  c.drawImage(hero, TEL.x, TEL.y, TEL.w, TEL.h);
  // barrido de brillo del botón dorado
  const k = TEL.w / heroMeta.vw, [bx, by, bw, bh] = heroMeta.btn.map(v => v * k), p = prog(f, 318, 356);
  if (p > 0 && p < 1) {
    c.save(); rr(c, TEL.x + bx, TEL.y + by, bw, bh, bh / 2); c.clip();
    const sx = TEL.x + bx + lerp(-160, bw + 160, inOut(p)), g = c.createLinearGradient(sx - 90, 0, sx + 90, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.transform(1, 0, -.3, 1, 0, 0); c.fillStyle = g; c.fillRect(TEL.x + bx - 200, TEL.y + by - 20, bw + 900, bh + 40); c.restore();
  }
  // reflejo del cristal: una banda diagonal que cruza al enderezarse
  const rp = prog(f, 262, 372);
  if (rp > 0 && rp < 1) {
    const gx = lerp(-500, 1500, outCubic(rp)), g = c.createLinearGradient(gx - 320, 0, gx + 320, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,246,225,${.16 * Math.sin(Math.PI * rp)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.save(); c.transform(1, 0, -.45, 1, 0, 0); c.fillStyle = g; c.fillRect(-400, 0, 2600, DH); c.restore();
  }
  // sombra interior del marco
  c.lineWidth = 40; c.strokeStyle = 'rgba(0,0,0,.35)'; c.filter = `blur(${12 * S}px)`; rr(c, x, y, w, h, t.r); c.stroke(); c.filter = 'none';
  c.restore();
  // marco champaña con bisel (es la misma cinta)
  const g = c.createLinearGradient(x, y, x + w, y + Math.max(h, 40));
  g.addColorStop(0, '#fbeecb'); g.addColorStop(.3, C.champ); g.addColorStop(.7, '#c7a665'); g.addColorStop(1, '#a8884c');
  c.lineWidth = t.borde; c.strokeStyle = g; rr(c, x, y, w, h, t.r); c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,252,238,.8)'; rr(c, x - t.borde / 2 + 1, y - t.borde / 2 + 1, w + t.borde - 2, h + t.borde - 2, t.r + t.borde / 2); c.stroke();
  c.strokeStyle = 'rgba(70,50,18,.7)'; rr(c, x + t.borde / 2 - 1, y + t.borde / 2 - 1, w - t.borde + 2, h - t.borde + 2, Math.max(1, t.r - t.borde / 2)); c.stroke();
}
// Giro en Y con perspectiva real, por columnas (toque 3D #1, ≤ 18°).
function proyectaTelefono(c, t) {
  const th = t.giro * Math.PI / 180;
  if (th < 0.002 && t.esc > .9995) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(tel, 0, 0); c.restore(); return; }
  const cx = W / 2, cy = H * (TEL.y + TEL.h / 2) / DH, d = 2600 * S, cos = Math.cos(th), sin = Math.sin(th), paso = 2;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingQuality = 'high';
  const X = x => { const u = (x - cx) * t.esc, z = u * sin, s = d / (d + z); return [cx + u * cos * s, s * t.esc]; };
  for (let x = 0; x < W; x += paso) {
    const [xa, sa] = X(x), [xb] = X(x + paso);
    c.drawImage(tel, x, 0, paso, H, xa, cy - cy * sa, xb - xa + .6, H * sa);
  }
  c.restore();
}

// ───────── un subcuadro
function escena(c, f) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(fondo, 0, 0);
  c.setTransform(S, 0, 0, S, 0, 0);
  // destello cálido que acompaña el cruce de la cinta
  const dest = Math.exp(-Math.max(0, f) / 16);
  if (dest > .01) { const g = c.createRadialGradient(540, Y_CINTA, 0, 540, Y_CINTA, 900); g.addColorStop(0, `rgba(232,207,154,${.2 * dest})`); g.addColorStop(1, 'rgba(232,207,154,0)'); c.fillStyle = g; c.fillRect(0, 0, DW, DH); }
  const k = cinta(f), t = telefono(f);
  if (f < 236) { tuEvento(c, f, k); bienSentado(c, f, k); dibujaCinta(c, f); }
  else { capaTelefono(f, t); proyectaTelefono(c, t); }
}

window.renderFrame = async (f, { sub = 8, shutter = 1 } = {}) => {
  SUBPASO = shutter / sub;
  for (let i = 0; i < sub; i++) {
    escena(wctx, f + ((i + .5) / sub - .5) * shutter);
    actx.globalAlpha = 1 / (i + 1); actx.drawImage(work, 0, 0);
  }
  octx.globalAlpha = 1; octx.drawImage(acc, 0, 0);
  // grano 2 %
  const r = rng(Math.floor(f) * 7919 + 13), ox = r() * 256 | 0, oy = r() * 256 | 0;
  octx.save(); octx.globalAlpha = .028; octx.globalCompositeOperation = 'overlay'; octx.fillStyle = octx.createPattern(grano, 'repeat');
  octx.translate(-ox, -oy); octx.fillRect(ox, oy, W, H); octx.restore();
  return out.toDataURL('image/png');
};

init().then(() => { window.ready = true; }).catch(e => { window.initError = String(e && e.stack || e); });
