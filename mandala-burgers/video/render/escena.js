// Mandala Burgers · motor del video. frame(f) es determinista: todo depende solo del cuadro f (puede ser fraccionario).
import { crearCinta } from './cinta.js';

const Q = new URLSearchParams(location.search);
const W = +Q.get('w') || 540, H = +Q.get('h') || 960, K = W / 1080;
const UI = Q.get('ui') || '/build/ui';

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (f, a, b) => clamp((f - a) / (b - a));
const E = {
  out3: (t) => 1 - (1 - t) ** 3, in3: (t) => t ** 3, io3: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)), outBack: (t, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  io2: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
};
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const mixHex = (a, b, t) => { const A = rgb(a), B = rgb(b); return 'rgb(' + A.map((v, i) => Math.round((v + (B[i] - v) * t) * 255)).join(',') + ')'; };

const COL = { carbon: '#0E0E10', crema: '#F5F2EE', mostaza: '#F5C455', verde: '#A8D44A', naranja: '#F0784C', rosa: '#E872C0', morado: '#8E3FC9', rojo: '#D6232A', azul: '#3D7BD9' };
const PALETA = [COL.mostaza, COL.naranja, COL.rosa, COL.morado, COL.rojo, COL.verde];
const TIPO = [COL.mostaza, COL.verde, COL.naranja, COL.rosa, '#A964E6', '#F0453F'];
const PANES = [['amarillo', COL.mostaza], ['azul', COL.azul], ['rosa', COL.rosa], ['morado', COL.morado], ['rojo', COL.rojo]];

const lienzo = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const cv = lienzo(), ctx = cv.getContext('2d');          // un subcuadro
const acc = lienzo(), actx = acc.getContext('2d');       // acumulación (motion blur)
const pc = lienzo(), pctx = pc.getContext('2d');         // celular, de frente, centrado en (540, 960)
const tmp = lienzo(1, 1), tctx = tmp.getContext('2d');   // sprites con destello
document.body.appendChild(acc);
[ctx, pctx, actx].forEach((c) => { c.imageSmoothingQuality = 'high'; });

let L, IMG = {}, cinta, ruido, semillaLejos;
const cargar = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('no carga ' + src)); i.src = src; });

async function init() {
  const fuentes = [['Fredoka', 600, 'fredoka-latin-600-normal'], ['Nunito', 700, 'nunito-latin-700-normal'], ['Nunito', 800, 'nunito-latin-800-normal']];
  await Promise.all(fuentes.map(async ([fam, w, file]) => { const ff = new FontFace(fam, `url(/web/fonts/${file}.woff2)`, { weight: String(w) }); await ff.load(); document.fonts.add(ff); }));
  L = await (await fetch(UI + '/layout.json')).json();
  await Promise.all(Object.keys(L.sprites).map(async (id) => { IMG[id] = await cargar(`${UI}/${id}.png`); }));
  cinta = crearCinta(W, H, K, PALETA.map(rgb));
  ruido = lienzo(256, 256); const r = ruido.getContext('2d'); const d = r.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.floor(hash(i * 0.37 + 5) * 255); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  r.putImageData(d, 0, 0);
  // semilla de ajonjolí desenfocada (primer plano), prerenderizada
  semillaLejos = lienzo(Math.ceil(160 * K), Math.ceil(160 * K)); const s = semillaLejos.getContext('2d');
  s.filter = `blur(${9 * K}px)`; s.fillStyle = '#F3E6C4'; s.beginPath(); s.ellipse(80 * K, 80 * K, 34 * K, 17 * K, 0, 0, 7); s.fill();
}

// ---------- trazados ----------
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }

// Cristal esmerilado real: desenfoca lo que hay detrás, satura, tiñe, borde de 1 px y ruido.
function cristal(c, lz, x, y, w, h, r, o = {}) {
  const b = (o.blur || 32) * K, pad = b * 2.2;
  c.save(); rr(c, x, y, w, h, r); c.clip();
  const sx = Math.max(0, Math.floor(x * K - pad)), sy = Math.max(0, Math.floor(y * K - pad));
  const sw = Math.min(W - sx, Math.ceil(w * K + pad * 2)), sh = Math.min(H - sy, Math.ceil(h * K + pad * 2));
  if (sw > 0 && sh > 0) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.filter = `blur(${b}px) saturate(140%)`; c.drawImage(lz, sx, sy, sw, sh, sx, sy, sw, sh); c.restore(); }
  const g = c.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, o.t0 || 'rgba(255,255,255,.20)'); g.addColorStop(1, o.t1 || 'rgba(255,255,255,.06)');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.globalAlpha = 0.05; c.globalCompositeOperation = 'overlay'; c.fillStyle = c.createPattern(ruido, 'repeat'); c.fillRect(x, y, w, h);
  c.restore();
  c.save(); rr(c, x + 0.5, y + 0.5, w - 1, h - 1, r);
  const s = c.createLinearGradient(x, y, x, y + h); s.addColorStop(0, 'rgba(255,255,255,.55)'); s.addColorStop(0.5, 'rgba(255,255,255,.14)'); s.addColorStop(1, 'rgba(255,255,255,.28)');
  c.strokeStyle = s; c.lineWidth = Math.max(1, 1 / K); c.stroke(); c.restore();
}

// Proyección en perspectiva por franjas de 1 px (giro sobre un solo eje). src: lienzo con el contenido centrado en (px, py).
function proyectar(c, src, px, py, cx, cy, esc, ang, eje, D, semi) {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  if (Math.abs(ang) < 0.002) {
    c.translate(cx * K, cy * K); c.scale(esc, esc); c.drawImage(src, -px * K, -py * K); c.restore(); return;
  }
  const co = Math.cos(ang), si = Math.sin(ang);
  const inv = (u) => (u * D) / (esc * D * co - u * si);       // destino → fuente, en px de diseño respecto al centro
  const fwd = (x) => (esc * x * co * D) / (D + x * si);
  const lado = eje === 'y' ? [src.width / K, src.height / K, px, py] : [src.height / K, src.width / K, py, px];
  const u0 = fwd(-Math.min(semi, lado[2])), u1 = fwd(Math.min(semi, lado[0] - lado[2]));
  const c0 = eje === 'y' ? cx : cy;
  const i0 = Math.floor((c0 + Math.min(u0, u1)) * K), i1 = Math.ceil((c0 + Math.max(u0, u1)) * K);
  for (let i = i0; i < i1; i++) {
    const xa = inv(i / K - c0), xb = inv((i + 1) / K - c0);
    const xm = (xa + xb) / 2, s = (esc * D) / (D + xm * si);
    const a = (lado[2] + Math.min(xa, xb)) * K, w = Math.abs(xb - xa) * K;
    if (eje === 'y') c.drawImage(src, a, 0, w, src.height, i, (cy - py * s) * K, 1, src.height * s);
    else c.drawImage(src, 0, a, src.width, w, (cx - px * s) * K, i, src.width * s, 1);
  }
  c.restore();
}

// ---------- fondo ----------
function fondo(f) {
  ctx.fillStyle = COL.carbon; ctx.fillRect(0, 0, 1080, 1920);
  const luz = (x, y, r, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + a); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920); };
  luz(160 + Math.sin(f / 170) * 60, 380 + Math.cos(f / 210) * 50, 900, COL.morado, '3a');
  luz(960 + Math.cos(f / 190) * 70, 1500 + Math.sin(f / 150) * 60, 950, COL.naranja, '2c');
  luz(540, 980, 700, COL.mostaza, '12');
  // mandala genérico de líneas, muy tenue, gira despacio (capa lejana)
  ctx.save(); ctx.translate(540 - cam(f).x * 0.3, 900 - cam(f).y * 0.3); ctx.rotate(f / 1400); ctx.globalAlpha = 0.07; ctx.strokeStyle = COL.crema; ctx.lineWidth = 2;
  for (const [n, r0, largo, ancho] of [[16, 300, 250, 62], [12, 190, 150, 50], [24, 560, 200, 46]]) {
    for (let i = 0; i < n; i++) { ctx.save(); ctx.rotate((Math.PI * 2 * i) / n); ctx.beginPath(); ctx.moveTo(0, -r0); ctx.bezierCurveTo(ancho, -r0 - largo * 0.35, ancho, -r0 - largo * 0.75, 0, -r0 - largo); ctx.bezierCurveTo(-ancho, -r0 - largo * 0.75, -ancho, -r0 - largo * 0.35, 0, -r0); ctx.stroke(); ctx.restore(); }
  }
  ctx.restore();
}
function semillas(f, capa) {
  // capa 0: lejos, nítidas y pequeñas · capa 1: primer plano, grandes y desenfocadas (desenfoque de campo)
  const n = capa ? 7 : 26, par = capa ? 1.7 : 0.45, c = cam(f);
  for (let i = 0; i < n; i++) {
    const k = i + capa * 100;
    const x = ((hash(k) * 1300 + f * (0.25 + hash(k + 9) * 0.5) * (capa ? 2.2 : 1)) % 1300) - 110 - c.x * par;
    const y = ((hash(k + 3) * 2100 - f * (0.5 + hash(k + 5) * 0.7) * (capa ? 2 : 1)) % 2100 + 2100) % 2100 - 90 - c.y * par;
    const rot = hash(k + 7) * 6.3 + f * (hash(k + 11) - 0.5) * 0.03;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (capa) { ctx.globalAlpha = 0.5; const s = 0.8 + hash(k + 13) * 0.9; ctx.scale(s, s); ctx.drawImage(semillaLejos, -80, -80, 160, 160); }
    else { ctx.globalAlpha = 0.16 + hash(k + 2) * 0.22; ctx.fillStyle = '#F3E6C4'; ctx.beginPath(); ctx.ellipse(0, 0, 7 + hash(k + 4) * 5, 3.6 + hash(k + 6) * 2, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}

// ---------- cámara (una sola, compartida) ----------
function cam(f) {
  const z = 1 + 0.02 * E.io2(prog(f, 0, 110)) + 0.03 * E.io2(prog(f, 144, 300)) - 0.012 * E.io2(prog(f, 352, 372));
  return { z, x: Math.sin(f / 95) * 7, y: Math.cos(f / 120) * 6 - 10 * E.io2(prog(f, 144, 288)) };
}
function capa(c, f, par, fn) {
  const k = cam(f); const z = 1 + (k.z - 1) * par;
  c.save(); c.translate(540, 960); c.scale(z, z); c.translate(-540 - k.x * par, -960 - k.y * par); fn(); c.restore();
}

// ---------- interfaz dentro del celular ----------
const TEL = { hw: 404, hh: 820, r: 98, bisel: 14, cx: 540, cy: 1410 };      // medidas en px de diseño; pantalla de 780 px
const PX0 = 540 - 390, PY0 = 960 - TEL.hh + TEL.bisel;                      // esquina de la pantalla dentro de pc
const ESTADOS = [[0, 'pre'], [360, 'amarillo'], [378, 'rosa'], [432, 'rojo'], [448, 'morado']];
const esMenu = (id) => id.startsWith('t-') || id.startsWith('g-') || id.startsWith('gn-');
const rect = (est, id) => (est === 'pre' ? (esMenu(id) ? null : L.estados.todos.rects[id]) : L.estados[est].rects[id]);
const yCss = (id) => L.estados.todos.rects[id].y;

function scrollDe(f) {
  const a = 2 * yCss('col-h2') - 526;          // el título de la sección sube a media pantalla; el héroe sigue asomando
  const b = 2 * yCss('pan-todos') - 176;       // fila de colores bajo el encabezado
  return lerp(0, a, E.io2(prog(f, 256, 292))) + (b - a) * E.io3(prog(f, 358, 376));
}

function sprite(id, x, y, o = {}) {
  const im = IMG[id], sp = L.sprites[id]; if (!im) return;
  const w = sp.w * 2, h = sp.h * 2, al = o.alpha ?? 1; if (al <= 0.003) return;
  const dx = x + sp.dx * 2, dy = y + sp.dy * 2;
  if (!o.destello && !o.pitch && !o.esc && !o.clipY) { pctx.globalAlpha = al; pctx.drawImage(im, dx, dy, w, h); pctx.globalAlpha = 1; return; }
  tmp.width = Math.ceil(w * K); tmp.height = Math.ceil(h * K);
  tctx.imageSmoothingQuality = 'high'; tctx.drawImage(im, 0, 0, tmp.width, tmp.height);
  if (o.destello != null && o.destello > 0 && o.destello < 1) {
    tctx.globalCompositeOperation = 'source-atop';
    const gx = lerp(-0.5, 1.5, o.destello) * tmp.width; const g = tctx.createLinearGradient(gx - tmp.width * 0.28, 0, gx + tmp.width * 0.28, tmp.height * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    tctx.fillStyle = g; tctx.fillRect(0, 0, tmp.width, tmp.height); tctx.globalCompositeOperation = 'source-over';
  }
  pctx.save(); pctx.globalAlpha = al;
  if (o.clipY != null) { pctx.beginPath(); pctx.rect(dx, dy, w, h * o.clipY); pctx.clip(); }
  proyectar(pctx, tmp, w / 2, h / 2, dx + w / 2, dy + h / 2 + (o.dy || 0), o.esc || 1, o.pitch || 0, 'x', 1500, 2000);
  pctx.restore();
}

function pagina(f) {
  pctx.fillStyle = COL.crema; pctx.fillRect(PX0, PY0, 780, 1640);
  const sc = scrollDe(f);
  let k = 0; while (k + 1 < ESTADOS.length && f >= ESTADOS[k + 1][0]) k++;
  const [F, est] = ESTADOS[k], ant = k ? ESTADOS[k - 1][1] : est;
  const ids = Object.keys(L.sprites).filter((id) => id !== 'enc' && id !== 'fab');
  const orden = ids.filter((id) => rect(est, id) && !rect(ant, id)).sort((a, b) => rect(est, a).y - rect(est, b).y);
  for (const id of ids) {
    const ra = rect(ant, id), rb = rect(est, id);
    if (!ra && !rb) continue;
    const t = E.io3(prog(f, F, F + 14));
    const pos = (r) => [PX0 + r.x * 2, PY0 + r.y * 2 - sc];
    let o = {}, p;
    if (ra && rb) { const a = pos(ra), b = pos(rb); p = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
    else if (rb) {                      // entra: tarjeta con inclinación (toque 3D) y destello
      p = pos(rb); const f0 = F + 5 + orden.indexOf(id) * 4, e = prog(f, f0, f0 + 16); if (e <= 0) continue;
      if (id.startsWith('t-')) o = { alpha: prog(f, f0, f0 + 3), dy: (1 - E.outBack(e, 1.2)) * 150, pitch: -(1 - E.out3(e)) * 0.1745, esc: lerp(0.93, 1, E.out3(e)), destello: prog(f, f0 + 4, f0 + 22) };
      else o = { alpha: e, dy: (1 - E.out3(e)) * 40 };
    } else {                            // sale: barrido rápido hacia la izquierda
      p = pos(ra); const e = E.in3(prog(f, F - 1, F + 7)); if (e >= 1) continue; p[0] -= e * 150; o = { alpha: 1 - e, esc: lerp(1, 0.9, e) };
    }
    if (p[1] > 2000 || p[1] + L.sprites[id].h * 2 < 0) continue;
    // cascada del héroe
    if (id === 'h1') { const e = prog(f, 190, 206); if (e <= 0) continue; o = { clipY: E.out3(e), dy: (1 - E.out3(e)) * 46, esc: 1 }; }
    if (id === 'sub') { const e = prog(f, 202, 216); if (e <= 0) continue; o = { alpha: e, dy: (1 - E.out3(e)) * 30 }; }
    if (id === 'btn') { const e = prog(f, 212, 228); if (e <= 0) continue; o = { alpha: prog(f, 212, 215), esc: lerp(0.6, 1, E.outBack(e, 2.4)), destello: prog(f, 224, 246) }; }
    if (id === 'lienzo') { const e = prog(f, 198, 224); if (e <= 0) continue; o = { alpha: prog(f, 198, 202), dy: (1 - E.outBack(e, 1.1)) * 170, pitch: -(1 - E.out3(e)) * 0.1745, esc: lerp(0.94, 1, E.out3(e)), destello: prog(f, 210, 236) }; }
    if (id.startsWith('pan-') && f < 360) {          // los puntos nacen de los pétalos de la cinta
      const i = PANES.findIndex((q) => 'pan-' + q[0] === id); const f0 = i < 0 ? 338 : ATERRIZA(i);
      if (f < f0) continue; o = { esc: lerp(1.18, 1, E.out3(prog(f, f0, f0 + 8))), alpha: 1 };
    }
    sprite(id, p[0], p[1], o);
    // anillo de selección del color tocado
    if (id.startsWith('pan-') && id.slice(4) === est) {
      const e = E.outBack(prog(f, F, F + 9), 2.2); pctx.strokeStyle = COL.carbon; pctx.lineWidth = 6; pctx.beginPath(); pctx.arc(p[0] + 50, p[1] + 50, 50 + 10 * e, 0, 7); pctx.globalAlpha = prog(f, F, F + 3); pctx.stroke(); pctx.globalAlpha = 1;
    }
  }
  // encabezado fijo
  const eh = E.out3(prog(f, 172, 186)); if (eh > 0) {
    const y = PY0 - 132 * (1 - eh);
    pctx.fillStyle = 'rgba(245,242,238,.94)'; pctx.fillRect(PX0, y, 780, 128); pctx.fillStyle = 'rgba(14,14,16,.08)'; pctx.fillRect(PX0, y + 127, 780, 2);
    sprite('enc', PX0, y);
  }
  // botón flotante de WhatsApp, siempre visible
  const ef = prog(f, 250, 266); if (ef > 0) sprite('fab', PX0 + 780 - 32 - 124, 1050, { esc: lerp(0.3, 1, E.outBack(ef, 2.6)), alpha: prog(f, 250, 253) });
}

function celular(f, yaw) {
  pctx.setTransform(K, 0, 0, K, 0, 0); pctx.clearRect(0, 0, 1080, 1920);
  const x = 540 - TEL.hw, y = 960 - TEL.hh, w = TEL.hw * 2, h = TEL.hh * 2;
  // forma: nace de la cinta (mismo campo de distancia: disco → marco)
  const m = E.io3(prog(f, 114, 140));
  if (m < 1) { const hw = lerp(18, TEL.hw, m) - 4, hh = lerp(18, TEL.hh, m) - 4, r = lerp(18, TEL.r, m); pctx.save(); rr(pctx, 540 - hw, 960 - hh, hw * 2, hh * 2, Math.min(r, hw, hh)); pctx.clip(); }
  rr(pctx, x, y, w, h, TEL.r); const g = pctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#2b2b31'); g.addColorStop(0.5, '#101013'); g.addColorStop(1, '#232328'); pctx.fillStyle = g; pctx.fill();
  // pantalla
  pctx.save(); rr(pctx, PX0, PY0, 780, 1612, 84); pctx.clip();
  pctx.fillStyle = '#0a0a0c'; pctx.fillRect(PX0, PY0, 780, 1612);
  const g2 = pctx.createLinearGradient(PX0, PY0, PX0 + 780, PY0 + 900); g2.addColorStop(0, 'rgba(142,63,201,.20)'); g2.addColorStop(1, 'rgba(240,120,76,.05)'); pctx.fillStyle = g2; pctx.fillRect(PX0, PY0, 780, 1612);
  const on = E.io2(prog(f, 148, 180));
  if (on > 0) {
    const R = on * 2000; pctx.save(); pctx.beginPath(); pctx.arc(PX0 + 78, PY0 + 64, R, 0, 7); pctx.clip(); pagina(f);
    if (on < 1) { const g5 = pctx.createRadialGradient(PX0 + 78, PY0 + 64, Math.max(0, R - 260), PX0 + 78, PY0 + 64, R); g5.addColorStop(0, 'rgba(245,196,85,0)'); g5.addColorStop(0.7, 'rgba(245,196,85,.55)'); g5.addColorStop(1, '#141017'); pctx.fillStyle = g5; pctx.fillRect(PX0, PY0, 780, 1612); }
    pctx.restore();
  }
  // reflejo de cristal que cruza al enderezarse (toque 3D 2)
  const rf = yaw / 0.314; if (Math.abs(rf) > 0.01) {
    pctx.globalCompositeOperation = 'screen'; const gx = PX0 + 390 + rf * 900; const g3 = pctx.createLinearGradient(gx - 260, PY0, gx + 260, PY0 + 700);
    g3.addColorStop(0, 'rgba(255,255,255,0)'); g3.addColorStop(0.5, `rgba(255,255,255,${0.22 * Math.min(1, Math.abs(rf) * 2)})`); g3.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = g3; pctx.fillRect(PX0, PY0, 780, 1612); pctx.globalCompositeOperation = 'source-over';
  }
  pctx.restore();
  // isla y brillo del bisel
  rr(pctx, 540 - 112, PY0 + 22, 224, 62, 31); pctx.fillStyle = '#050506'; pctx.fill();
  rr(pctx, x + 1.5, y + 1.5, w - 3, h - 3, TEL.r - 1); const g4 = pctx.createLinearGradient(x + w * (0.5 - rf), y, x + w * (0.5 + rf * 0.6) + 300, y + h);
  g4.addColorStop(0, 'rgba(255,255,255,.75)'); g4.addColorStop(0.25, 'rgba(255,255,255,.10)'); g4.addColorStop(0.7, 'rgba(255,255,255,.06)'); g4.addColorStop(1, 'rgba(255,255,255,.45)');
  pctx.strokeStyle = g4; pctx.lineWidth = 3; pctx.stroke();
  rr(pctx, PX0 - 1, PY0 - 1, 782, 1614, 85); pctx.strokeStyle = 'rgba(0,0,0,.8)'; pctx.lineWidth = 2; pctx.stroke();
  if (m < 1) pctx.restore();
}
function telPose(f) {
  // se forma de frente, gira hasta 18° y se endereza con un pequeño rebote
  const ida = E.out3(prog(f, 142, 158)), vuelta = E.outBack(prog(f, 158, 214), 1.4);
  const yaw = 0.314 * ida * (1 - vuelta);
  const esc = lerp(0.9, 1, E.io3(prog(f, 150, 214)));
  return { yaw, esc, cx: TEL.cx + 60 * ida * (1 - vuelta), cy: TEL.cy };
}

// ---------- la cinta en el tiempo ----------
const BUSQ = 'hamburguesas de colores aguascalientes';
const BAR = { y: 760, x0: 190 };
let anchoBusq = null, tamBusq = 34;
function medirBusq() {
  if (anchoBusq) return; ctx.save(); ctx.font = `700 ${tamBusq}px Nunito`; anchoBusq = [0];
  for (let i = 1; i <= BUSQ.length; i++) anchoBusq.push(ctx.measureText(BUSQ.slice(0, i)).width); ctx.restore();
}
const nTecleo = (f) => clamp(Math.floor((f - 12) / (84 / BUSQ.length)) + 1, 0, BUSQ.length);
const barra = (f) => ({ hw: 450 * E.outExpo(prog(f, 5, 22)), hh: lerp(7, 60, E.outBack(prog(f, 8, 24), 1.6)), y: BAR.y - 1100 * E.in3(prog(f, 106, 122)), esc: 1 - 0.05 * Math.sin(Math.PI * prog(f, 102, 110)) });
const FLOR = { x: 250, y: 420 };
const ATERRIZA = (i) => 340 + i * 4;
function destinoPunto(i) { const r = L.estados.todos.rects['pan-' + PANES[i][0]]; const p = telPose(999); return [p.cx - 390 + r.x * 2 + 50, p.cy - TEL.hh + TEL.bisel + r.y * 2 + 50 - scrollDe(330)]; }

function cintaEn(f) {
  const fase = f / 46;
  if (f < 98) {            // latigazo, retorno de carro y subrayado que escribe
    const b = barra(f), y = lerp(760, BAR.y + b.hh + 22, E.out3(prog(f, 8, 20)));
    const head = f < 8 ? E.outExpo(prog(f, 0, 8)) : null;
    const xCaret = BAR.x0 + anchoBusq[nTecleo(f)] + 6;
    const bFin = head != null ? head : lerp(1, (Math.max(xCaret, 250) + 80) / 1240, E.io3(prog(f, 8, 15)));
    const a = lerp(0, (BAR.x0 + 80) / 1240, E.io3(prog(f, 7, 14)));
    return { modo: 1, pts: [[-80, y], [1160, y]], rango: [a, bFin], w: lerp(34, 14, E.out3(prog(f, 8, 16))), fase: fase + Math.floor(prog(f, 72, 92) * 9) * 0.5, bandas: 7 };
  }
  const fin = [BAR.x0 + anchoBusq[BUSQ.length] + 6, BAR.y + 82], boton = [918, BAR.y];
  if (f < 106) {           // se recoge en un punto y toca Enter
    const t = E.io3(prog(f, 98, 102)), p = [lerp(fin[0], boton[0], t), lerp(fin[1], boton[1], t)];
    const a = lerp((BAR.x0 + 80) / 1240, (fin[0] + 80) / 1240, E.out3(prog(f, 96, 100)));
    if (f < 100) return { modo: 1, pts: [[-80, fin[1]], [1160, fin[1]]], rango: [a, (fin[0] + 80) / 1240], w: lerp(14, 30, prog(f, 98, 100)), fase, bandas: 7 };
    return { modo: 2, A: { t: 'disco', x: p[0], y: p[1], r: 15 + 9 * Math.sin(Math.PI * prog(f, 102, 106)) }, fase };
  }
  const tp = telPose(f);
  if (f < 114) {           // cometa hacia donde nacerá el celular
    const t = prog(f, 106, 114), h = E.io3(t), tl = E.in3(t);
    return { modo: 1, pts: [boton, [boton[0] - 120, 1000], [tp.cx + 40, tp.cy - 200], [tp.cx, tp.cy]], rango: [tl * 0.98, Math.max(h, 0.02)], w: 34, fase, bandas: 3 };
  }
  const marco = { t: 'marco', x: tp.cx, y: tp.cy, hw: TEL.hw * tp.esc, hh: TEL.hh * tp.esc, r: TEL.r * tp.esc };
  const sub = subrayado(f);
  if (f < 140) {           // disco → marco del celular (interpolación de SDF)
    const m2 = E.io3(prog(f, 114, 140));
    const cre = { t: 'marco', x: tp.cx, y: tp.cy, hw: lerp(18, marco.hw, m2), hh: lerp(18, marco.hh, m2), r: lerp(18, marco.r, m2) };
    return { modo: 2, A: cre, ow: lerp(36, 24, m2), fase: fase + m2 * 2 };
  }
  if (f < 160) return { modo: 3, ...sub, A: marco, m: 1 - E.io3(prog(f, 140, 160)), ow: 24, fase };   // marco → trazo
  if (f < 284) return { modo: 1, ...sub, fase };
  const aro = { t: 'aro', x: FLOR.x, y: FLOR.y, r: 74, w: 30 };
  if (f < 298) return { modo: 3, ...sub, A: aro, m: E.io3(prog(f, 284, 298)), fase };                  // trazo → aro
  // aro → pétalos → puntos de color que vuelan a la interfaz
  const abre = E.outBack(prog(f, 298, 320), 1.5), giro = -0.5 + f / 60;
  const pet = PANES.map(([, c], i) => {
    const ang = giro + (i * Math.PI * 2) / 5, v = E.io3(prog(f, 328 + i * 4, ATERRIZA(i)));
    const o = [FLOR.x + Math.sin(ang) * 86, FLOR.y - Math.cos(ang) * 86], d = destinoPunto(i);
    const arco = Math.sin(Math.PI * v) * 120;
    return { x: lerp(o[0], d[0], v) + arco * 0.4, y: lerp(o[1], d[1], v) - arco, ang: ang * (1 - v), hl: lerp(lerp(40, 78, abre), 50, v), hw: lerp(lerp(30, 34, abre), 50, v), col: rgb(c), fin: f >= ATERRIZA(i) };
  }).filter((p) => !p.fin);
  if (!pet.length) return null;
  return { modo: 2, A: aro, B: { t: 'petalos' }, petalos: pet, m2: clamp(prog(f, 298, 312)), fase };
}
function subrayado(f) {
  const pts = []; for (let i = 0; i <= 18; i++) { const t = i / 18; pts.push([200 + t * 680, 508 + Math.sin(t * Math.PI * 2 + f / 22) * 9 - t * 14]); }
  const b = lerp(0.07, 1, E.out3(prog(f, 194, 214))) * (1 - 0.86 * E.io3(prog(f, 266, 284)));
  return { pts, rango: [0, b], w: 22, bandas: 4 };
}

// ---------- kinetic type ----------
const PALABRAS = [
  { t: 'HAMBURGUESAS', f0: 25, sale: 99, y: 1085, tam: 150, max: 950, ext: COL.naranja, dir: -1 },
  { t: 'DE COLORES', f0: 72, sale: 102, y: 1262, tam: 160, max: 860, multi: true, dir: 1 },
  { t: 'TU PÁGINA', f0: 196, sale: 268, y: 462, tam: 176, max: 800, ext: COL.morado, dir: 1 },
  { t: 'ELIGE', f0: 300, sale: 368, x: 705, y: 400, tam: 136, max: 520, ext: COL.naranja, dir: 1 },
  { t: 'TU COLOR', f0: 316, sale: 371, x: 705, y: 536, tam: 136, max: 560, ext: COL.morado, toque: true, dir: 1 },
  { t: "PA' EL", f0: 384, sale: 440, y: 392, tam: 112, max: 600, ext: COL.naranja, dir: -1 },
  { t: 'CLÁSICO', f0: 395, sale: 443, y: 536, tam: 156, max: 760, col: COL.mostaza, dir: 1 },
  { t: "PA' EL", f0: 456, sale: 9999, y: 392, tam: 112, max: 600, ext: COL.morado, dir: -1 },
  { t: 'ATREVIDO', f0: 475, sale: 9999, y: 536, tam: 156, max: 800, col: '#F0453F', dir: 1 },
];
const medidas = new Map();
function medir(p) {
  if (medidas.has(p)) return medidas.get(p);
  ctx.save(); ctx.font = `600 ${p.tam}px Fredoka`; let w = ctx.measureText(p.t).width; const tam = w > p.max ? (p.tam * p.max) / w : p.tam;
  ctx.font = `600 ${tam}px Fredoka`; const xs = [0]; for (let i = 1; i <= p.t.length; i++) xs.push(ctx.measureText(p.t.slice(0, i)).width); ctx.restore();
  const m = { tam, xs, w: xs[p.t.length] }; medidas.set(p, m); return m;
}
function palabra(p, f) {
  if (f < p.f0 - 1 || f > p.sale + 16) return;
  const m = medir(p), x0 = (p.x ?? 540) - m.w / 2;
  const sal = E.in3(prog(f, p.sale, p.sale + 13));
  let colToque = null; if (p.toque) { let k = 0; while (k + 1 < ESTADOS.length && f >= ESTADOS[k + 1][0]) k++; const q = PANES.find((z) => z[0] === ESTADOS[k][1]); if (q) colToque = q[1]; }
  ctx.save(); ctx.font = `600 ${m.tam}px Fredoka`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  let n = 0;
  for (let i = 0; i < p.t.length; i++) {
    const ch = p.t[i]; if (ch === ' ') continue;
    const t = f - p.f0 - n * 1.6; n++; if (t < 0) continue;      // stagger ≈ 27 ms por glifo
    const e = prog(t, 0, 6), cae = E.out3(e);
    const rebote = t > 6 ? Math.exp(-(t - 6) / 5) * Math.cos((t - 6) * 0.9) : 0;
    const s = lerp(1.4, 1, cae), sx = s * (1 + 0.16 * rebote), sy = s * (1 - 0.2 * rebote);
    const sac = t >= 6 && t < 8 ? (hash(i * 7 + Math.floor(t)) - 0.5) * 12 : 0;   // 2 cuadros de sacudida
    const gx = x0 + (m.xs[i] + m.xs[i + 1]) / 2 + sac + p.dir * sal * 1500 * (1 + n * 0.04), gy = p.y;
    const col = p.multi ? TIPO[(n - 1) % TIPO.length] : (colToque || p.col || COL.crema);
    const ext = p.multi || p.col || colToque ? mixHex(col, '#000000', 0.5) : p.ext;
    ctx.save(); ctx.translate(gx, gy); ctx.scale(sx, sy); ctx.globalAlpha = clamp(t / 2);
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 22 * K; ctx.shadowOffsetY = 16 * K;
    ctx.fillStyle = ext; ctx.fillText(ch, 0, m.tam * 0.062);
    ctx.shadowColor = 'transparent'; ctx.fillStyle = col; ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- barra de búsqueda ----------
function busqueda(f) {
  if (f < 4 || f > 124) return;
  const b = barra(f); if (b.hw < 8) return;
  ctx.save(); ctx.translate(540, b.y); ctx.scale(b.esc, b.esc); ctx.translate(-540, -b.y);
  cristal(ctx, cv, 540 - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2, b.hh, { blur: 34, t0: 'rgba(255,255,255,.22)', t1: 'rgba(255,255,255,.07)' });
  ctx.save(); rr(ctx, 540 - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2, b.hh); ctx.clip();
  const al = prog(f, 12, 18);
  ctx.globalAlpha = al; ctx.strokeStyle = COL.crema; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(138, b.y - 3, 15, 0, 7); ctx.moveTo(149, b.y + 9); ctx.lineTo(160, b.y + 20); ctx.stroke();
  ctx.font = `700 ${tamBusq}px Nunito`; ctx.fillStyle = COL.crema; ctx.textBaseline = 'middle'; ctx.fillText(BUSQ.slice(0, nTecleo(f)), BAR.x0, b.y + 2);
  if (f < 98 && Math.floor(f / 9) % 2 === 0) ctx.fillRect(BAR.x0 + anchoBusq[nTecleo(f)] + 5, b.y - 22, 3, 44);
  const eb = E.outBack(prog(f, 14, 26), 2); ctx.globalAlpha = 1;
  ctx.fillStyle = COL.mostaza; ctx.beginPath(); ctx.arc(918, b.y, 44 * eb * (1 - 0.14 * Math.sin(Math.PI * prog(f, 101, 108))), 0, 7); ctx.fill();
  if (eb > 0.5) { ctx.strokeStyle = COL.carbon; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(903, b.y); ctx.lineTo(932, b.y); ctx.moveTo(921, b.y - 12); ctx.lineTo(933, b.y); ctx.lineTo(921, b.y + 12); ctx.stroke(); }
  ctx.restore(); ctx.restore();
}

function toques(f) {
  const lista = [[102, () => [918, barra(102).y], COL.mostaza]].concat(ESTADOS.slice(1).map(([F, est]) => [F, () => destinoPunto(PANES.findIndex((p) => p[0] === est)).map((v, i) => (i ? v - (scrollDe(F + 20) - scrollDe(330)) * prog(f, F, F + 18) : v)), COL.crema]));
  for (const [F, pos, col] of lista) {
    const t = prog(f, F, F + 16); if (t <= 0 || t >= 1) continue; const [x, y] = pos();
    ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = (1 - t) * 0.9; ctx.lineWidth = lerp(10, 2, t); ctx.beginPath(); ctx.arc(x, y, lerp(30, 130, E.out3(t)), 0, 7); ctx.stroke(); ctx.restore();
  }
}

// ---------- un subcuadro ----------
function subcuadro(f) {
  ctx.setTransform(K, 0, 0, K, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  medirBusq();
  fondo(f); semillas(f, 0);
  capa(ctx, f, 1, () => {
    if (f >= 114) {
      const p = telPose(f); celular(f, p.yaw);
      // sombra de contacto del celular sobre el escenario
      ctx.save(); ctx.filter = `blur(${46 * K}px)`; ctx.fillStyle = 'rgba(0,0,0,.55)'; const m = E.io3(prog(f, 114, 140));
      rr(ctx, p.cx - TEL.hw * p.esc * m + 30, p.cy - TEL.hh * p.esc * m + 50, TEL.hw * 2 * p.esc * m, TEL.hh * 2 * p.esc * m, 90); ctx.fill(); ctx.restore();
      const t = ctx.getTransform(); const cx = (t.a * p.cx + t.e) / K, cy = (t.d * p.cy + t.f) / K;
      proyectar(ctx, pc, 540, 960, cx, cy, p.esc * t.a / K, p.yaw, 'y', 2600, 470);
    }
    busqueda(f);
    const c = cintaEn(f);
    if (c) { cinta.dibujar(c); ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20 * K; ctx.shadowOffsetY = 12 * K; ctx.drawImage(cinta.cv, 0, 0, 1080, 1920); ctx.restore(); }
    toques(f);
  });
  capa(ctx, f, 1.25, () => { for (const p of PALABRAS) palabra(p, f); });
  semillas(f, 1);
  // destello de 3 cuadros en el golpe inicial
  const d = f >= 7 && f < 11.5 ? 1 - Math.abs(f - 9) / 2.5 : 0;
  if (d > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(1000, 760, 0, 1000, 760, 900); g.addColorStop(0, `rgba(255,236,190,${0.75 * d})`); g.addColorStop(1, 'rgba(255,236,190,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
}

function acabado(f) {
  actx.save(); actx.setTransform(K, 0, 0, K, 0, 0);
  const v = actx.createRadialGradient(540, 960, 820, 540, 960, 1320); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.30)'); actx.fillStyle = v; actx.fillRect(0, 0, 1080, 1920);
  actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'overlay'; actx.globalAlpha = 0.085;
  const ox = Math.floor(hash(Math.round(f) + 1) * 256), oy = Math.floor(hash(Math.round(f) + 77) * 256);
  for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) actx.drawImage(ruido, x, y);
  actx.restore();
}

// 8 subcuadros repartidos en el obturador (180°) y promediados: motion blur real
window.renderFrame = function (f, o = {}) {
  const sub = o.sub || 8, sh = o.shutter ?? 0.5;
  actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < sub; i++) {
    subcuadro(f + ((i + 0.5) / sub - 0.5) * sh * 2);
    actx.globalAlpha = 1 / (i + 1); actx.drawImage(cv, 0, 0);
  }
  actx.globalAlpha = 1; acabado(f);
  return acc.toDataURL('image/png');
};

init().then(() => { window.ready = true; }).catch((e) => { window.initError = String(e && e.stack || e); });
