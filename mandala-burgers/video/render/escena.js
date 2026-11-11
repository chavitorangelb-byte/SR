// Mandala Burgers · motor del video. frame(f) es determinista: todo depende solo del cuadro f (puede ser fraccionario).
// Una sola cinta (cinta.js, SDF) y una sola cámara compartidas por todas las escenas. Sin cortes.
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
const bez = (p0, p1, p2, p3, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
const largo = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

const COL = { carbon: '#0E0E10', crema: '#F5F2EE', mostaza: '#F5C455', verde: '#A8D44A', naranja: '#F0784C', rosa: '#E872C0', morado: '#8E3FC9', rojo: '#D6232A', azul: '#3D7BD9' };
const PALETA = [COL.mostaza, COL.naranja, COL.rosa, COL.morado, COL.rojo, COL.verde];
const TIPO = [COL.mostaza, COL.verde, COL.naranja, COL.rosa, '#A964E6', '#F0453F'];
const PANES = [['amarillo', COL.mostaza], ['azul', COL.azul], ['rosa', COL.rosa], ['morado', COL.morado], ['rojo', COL.rojo]];
const WA = new Path2D('M12 2.2a9.7 9.7 0 0 0-8.3 14.7L2.4 21.7l4.9-1.3A9.7 9.7 0 1 0 12 2.2zm0 1.8a7.9 7.9 0 1 1-4.2 14.6l-.3-.2-2.6.7.7-2.5-.2-.3A7.9 7.9 0 0 1 12 4zm-3 3.6c-.2 0-.5.1-.7.4-.3.3-1 .9-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.2 2.4.9 2.9.8 3.4.7.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4l-1.9-.9c-.3-.1-.5-.1-.7.2l-.8 1c-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.1-.3 0-.4.2-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.4-.4-.6-.4z');

const lienzo = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const cv = lienzo(), ctx = cv.getContext('2d');          // un subcuadro
const acc = lienzo(), actx = acc.getContext('2d');       // acumulación (motion blur)
const pc = lienzo(), pctx = pc.getContext('2d');         // celular, de frente, centrado en (540, 960)
const tmp = lienzo(1, 1), tctx = tmp.getContext('2d');   // sprites con destello
document.body.appendChild(acc);
[ctx, pctx, actx].forEach((c) => { c.imageSmoothingQuality = 'high'; });

let L, IMG = {}, NEG, cinta, ruido, semillaLejos;
const cargar = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('no carga ' + src)); i.src = src; });

async function init() {
  const fuentes = [['Fredoka', 600, 'fredoka-latin-600-normal'], ['Nunito', 700, 'nunito-latin-700-normal'], ['Nunito', 800, 'nunito-latin-800-normal']];
  await Promise.all(fuentes.map(async ([fam, w, file]) => { const ff = new FontFace(fam, `url(/web/fonts/${file}.woff2)`, { weight: String(w) }); await ff.load(); document.fonts.add(ff); }));
  L = await (await fetch(UI + '/layout.json')).json();
  NEG = await (await fetch('/config/negocio.json')).json();
  await Promise.all(Object.keys(L.sprites).map(async (id) => { IMG[id] = await cargar(`${UI}/${id}.png`); }));
  IMG._logo = await cargar('/assets/logo-circulo.png'); IMG._desk = await cargar(UI + '/_escritorio.png');
  cinta = crearCinta(W, H, K, PALETA.map(rgb));
  ruido = lienzo(256, 256); const r = ruido.getContext('2d'); const d = r.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.floor(hash(i * 0.37 + 5) * 255); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  r.putImageData(d, 0, 0);
  semillaLejos = lienzo(Math.ceil(160 * K), Math.ceil(160 * K)); const s = semillaLejos.getContext('2d');
  s.filter = `blur(${9 * K}px)`; s.fillStyle = '#F3E6C4'; s.beginPath(); s.ellipse(80 * K, 80 * K, 34 * K, 17 * K, 0, 0, 7); s.fill();
}

// ---------- trazados ----------
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }

// Cristal esmerilado real: desenfoca lo que hay detrás, satura 140 %, tiñe, borde de 1 px y ruido.
function cristal(c, lz, x, y, w, h, r, o = {}) {
  const t = c.getTransform(), sc = t.a / K;
  const b = (o.blur || 32) * K, pad = b * 2.2;
  c.save(); rr(c, x, y, w, h, r); c.clip();
  const X = t.a * x + t.e, Y = t.d * y + t.f, Wd = w * t.a, Hd = h * t.d;
  const sx = Math.max(0, Math.floor(X - pad)), sy = Math.max(0, Math.floor(Y - pad));
  const sw = Math.min(W - sx, Math.ceil(Wd + pad * 2)), sh = Math.min(H - sy, Math.ceil(Hd + pad * 2));
  if (sw > 0 && sh > 0) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.filter = `blur(${b * sc}px) saturate(140%)`; c.drawImage(lz, sx, sy, sw, sh, sx, sy, sw, sh); c.restore(); }
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
  if (Math.abs(ang) < 0.002) { c.translate(cx * K, cy * K); c.scale(esc, esc); c.drawImage(src, -px * K, -py * K); c.restore(); return; }
  const co = Math.cos(ang), si = Math.sin(ang);
  const inv = (u) => (u * D) / (esc * D * co - u * si);
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

// ---------- tiempo de ambiente: todo se detiene en f1404 ----------
const amb = (f) => (f < 1404 ? f : 1404 + (f - 1404) * 0.12);

// ---------- fondo ----------
function fondo(f0) {
  const f = amb(f0);
  ctx.fillStyle = COL.carbon; ctx.fillRect(0, 0, 1080, 1920);
  const calido = E.io2(prog(f, 576, 610)) * (1 - E.io2(prog(f, 716, 744)));
  const luz = (x, y, r, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + a); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920); };
  ctx.globalAlpha = 1 - 0.6 * calido; luz(160 + Math.sin(f / 170) * 60, 380 + Math.cos(f / 210) * 50, 900, COL.morado, '3a'); ctx.globalAlpha = 1;
  luz(960 + Math.cos(f / 190) * 70, 1500 + Math.sin(f / 150) * 60, 950, COL.naranja, '2c');
  luz(540, 980, 700, COL.mostaza, '12');
  if (calido > 0) { ctx.globalAlpha = calido; luz(540, 1150, 1000, COL.naranja, '30'); ctx.globalAlpha = 1; }
  const k = cam(f0);
  ctx.save(); ctx.translate(540 - k.x * 0.3, 900 - k.y * 0.3); ctx.rotate(f / 1400); ctx.globalAlpha = 0.07; ctx.strokeStyle = COL.crema; ctx.lineWidth = 2;
  for (const [n, r0, lg, an] of [[16, 300, 250, 62], [12, 190, 150, 50], [24, 560, 200, 46]]) {
    for (let i = 0; i < n; i++) { ctx.save(); ctx.rotate((Math.PI * 2 * i) / n); ctx.beginPath(); ctx.moveTo(0, -r0); ctx.bezierCurveTo(an, -r0 - lg * 0.35, an, -r0 - lg * 0.75, 0, -r0 - lg); ctx.bezierCurveTo(-an, -r0 - lg * 0.75, -an, -r0 - lg * 0.35, 0, -r0); ctx.stroke(); ctx.restore(); }
  }
  ctx.restore();
}
function semillas(f0, capaN) {
  const f = amb(f0), n = capaN ? 7 : 26, par = capaN ? 1.7 : 0.45, c = cam(f0);
  for (let i = 0; i < n; i++) {
    const k = i + capaN * 100;
    const x = ((hash(k) * 1300 + f * (0.25 + hash(k + 9) * 0.5) * (capaN ? 2.2 : 1)) % 1300) - 110 - c.x * par;
    const y = ((hash(k + 3) * 2100 - f * (0.5 + hash(k + 5) * 0.7) * (capaN ? 2 : 1)) % 2100 + 2100) % 2100 - 90 - c.y * par;
    const rot = hash(k + 7) * 6.3 + f * (hash(k + 11) - 0.5) * 0.03;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (capaN) { ctx.globalAlpha = 0.5; const s = 0.8 + hash(k + 13) * 0.9; ctx.scale(s, s); ctx.drawImage(semillaLejos, -80, -80, 160, 160); }
    else { ctx.globalAlpha = 0.16 + hash(k + 2) * 0.22; ctx.fillStyle = '#F3E6C4'; ctx.beginPath(); ctx.ellipse(0, 0, 7 + hash(k + 4) * 5, 3.6 + hash(k + 6) * 2, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}
// chispas de brasero que suben por el escenario durante el respiro
function chispas(f) {
  const a = E.io2(prog(f, 596, 630)) * (1 - E.io2(prog(f, 720, 760))); if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const v = ((f * (0.0028 + hash(i + 40) * 0.0022) + hash(i + 50)) % 1), x = 300 + hash(i + 60) * 480 + Math.sin(v * 7 + i) * 60, y = 1250 - v * 1100;
    const r = (5 - v * 3) * (0.6 + hash(i + 70));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, `rgba(255,190,110,${0.9 * a * (1 - v)})`); g.addColorStop(0.3, `rgba(240,120,76,${0.5 * a * (1 - v)})`); g.addColorStop(1, 'rgba(240,120,76,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  ctx.restore();
}

// ---------- cámara (una sola, compartida) ----------
function cam(f0) {
  const f = amb(f0);
  const z = 1 + 0.02 * E.io2(prog(f, 0, 110)) + 0.03 * E.io2(prog(f, 144, 300)) - 0.012 * E.io2(prog(f, 352, 372))
    + 0.035 * E.io2(prog(f, 576, 700)) - 0.035 * E.io2(prog(f, 716, 760)) + 0.02 * E.io2(prog(f, 1008, 1140)) - 0.058 * E.io3(prog(f, 1152, 1230)) + 0.03 * E.io2(prog(f, 1296, 1404));
  return { z, x: Math.sin(f / 95) * 7, y: Math.cos(f / 120) * 6 - 10 * E.io2(prog(f, 144, 288)) };
}
function capa(c, f, par, fn) {
  const k = cam(f); const z = 1 + (k.z - 1) * par;
  c.save(); c.translate(540, 960); c.scale(z, z); c.translate(-540 - k.x * par, -960 - k.y * par); fn(); c.restore();
}

// ---------- interfaz dentro del celular ----------
const TEL = { hw: 404, hh: 820, r: 98, bisel: 14, cx: 540, cy: 1410 };
const PX0 = 540 - 390, PY0 = 960 - TEL.hh + TEL.bisel;
const SY0 = TEL.cy - TEL.hh + TEL.bisel;                   // borde superior de la pantalla en el escenario (pose final)
const ESTADOS = [[0, 'pre'], [360, 'amarillo'], [378, 'rosa'], [432, 'rojo'], [448, 'morado'], [1150, 'todos']];
const esMenu = (id) => id.startsWith('t-') || id.startsWith('g-') || id.startsWith('gn-');
const rect = (est, id) => (est === 'pre' ? (esMenu(id) ? null : L.estados.todos.rects[id]) : L.estados[est].rects[id]);
const ancla = (est, id, yEsc) => 2 * L.estados[est].rects[id].y - (yEsc - SY0);
const estadoEn = (f) => { let k = 0; while (k + 1 < ESTADOS.length && f >= ESTADOS[k + 1][0]) k++; return k; };
const ENTRA = { 'r-0': 870, 'r-1': 906, 'r-2': 942 };      // reseñas, una por una
const ACENTO = { 'f-pointdog': 518, 'f-frenchies': 574, 'vi-h2': 1016 };

let SCROLLS = null;
function scrollDe(f) {
  if (!SCROLLS) SCROLLS = [[256, 292, ancla('todos', 'col-h2', 1130)], [358, 376, ancla('todos', 'pan-todos', 780)], [504, 532, ancla('morado', 'hd-h2', 775)],
    [578, 608, ancla('morado', 'po-h2', 775)], [858, 886, ancla('morado', 're-h2', 775)], [990, 1014, ancla('morado', 'vi-h2', 775)], [1150, 1200, 0]];
  let v = 0; for (const [a, b, t] of SCROLLS) v = lerp(v, t, E.io2(prog(f, a, b))); return v;
}
const FAB = { x: 852, y: 1492 };                           // centro del botón flotante en el escenario (pose final)
function fabEsc(f) {
  const ent = E.outBack(prog(f, 250, 266), 2.6);
  const sube = E.outBack(prog(f, 748, 760), 2.4) * (1 - prog(f, 772, 780));
  const toque = Math.sin(Math.PI * prog(f, 766, 772)) * 0.16;
  const abre = 1 - E.io3(prog(f, 774, 782)) + E.outBack(prog(f, 852, 868), 2);
  return 0.82 * ent * (1 + 0.42 * sube - toque) * clamp(abre);
}

function sprite(id, x, y, o = {}) {
  const im = IMG[id], sp = L.sprites[id]; if (!im) return;
  const w = sp.w * 2, h = sp.h * 2, al = o.alpha ?? 1; if (al <= 0.003) return;
  const dx = x + sp.dx * 2, dy = y + sp.dy * 2;
  if (!o.destello && !o.pitch && !o.esc && !o.clipY && !o.dy) { pctx.globalAlpha = al; pctx.drawImage(im, dx, dy, w, h); pctx.globalAlpha = 1; return; }
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
const tarjeta3d = (f, f0, d = 16) => { const e = prog(f, f0, f0 + d); return e <= 0 ? null : { alpha: prog(f, f0, f0 + 3), dy: (1 - E.outBack(e, 1.2)) * 150, pitch: -(1 - E.out3(e)) * 0.1745, esc: lerp(0.93, 1, E.out3(e)), destello: prog(f, f0 + 4, f0 + 22) }; };

function pagina(f) {
  pctx.fillStyle = COL.crema; pctx.fillRect(PX0, PY0, 780, 1640);
  const sc = scrollDe(f), k = estadoEn(f);
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
    else if (rb) {                      // entra: tarjeta con inclinación (toque 3D 3) y destello
      p = pos(rb); const f0 = F + 1 + orden.indexOf(id) * 3;
      if (id.startsWith('t-')) { o = tarjeta3d(f, f0); if (!o) continue; }
      else { const e = prog(f, f0, f0 + 12); if (e <= 0) continue; o = { alpha: e, dy: (1 - E.out3(e)) * 40 }; }
    } else {                            // sale: se encoge y se va
      p = pos(ra); const e = E.in3(prog(f, F - 1, F + 6)); if (e >= 1) continue; p[0] -= e * 150; o = { alpha: 1 - e, esc: lerp(1, 0.9, e) };
    }
    const alto = L.sprites[id].h * 2;
    if (p[1] > 1700 || p[1] + alto < 100) continue;
    if (id === 'h1') { const e = prog(f, 190, 206); if (e <= 0) continue; o = { clipY: E.out3(e), dy: (1 - E.out3(e)) * 46, esc: 1 }; }
    if (id === 'sub') { const e = prog(f, 202, 216); if (e <= 0) continue; o = { alpha: e, dy: (1 - E.out3(e)) * 30 }; }
    if (id === 'btn') { const e = prog(f, 212, 228); if (e <= 0) continue; o = { alpha: prog(f, 212, 215), esc: lerp(0.6, 1, E.outBack(e, 2.4)), destello: prog(f, 224, 246) }; }
    if (id === 'lienzo' && f < 300) { o = tarjeta3d(f, 198, 26); if (!o) continue; }
    if (id.startsWith('pan-') && f < 360) {          // los puntos nacen de los pétalos de la cinta
      const i = PANES.findIndex((q) => 'pan-' + q[0] === id); const f0 = i < 0 ? 338 : ATERRIZA(i);
      if (f < f0) continue; o = { esc: lerp(1.18, 1, E.out3(prog(f, f0, f0 + 8))), alpha: 1 };
    }
    if (ENTRA[id]) { o = tarjeta3d(f, ENTRA[id], 18); if (!o) continue; }
    if (ACENTO[id]) { const e = prog(f, ACENTO[id], ACENTO[id] + 20); if (e > 0 && e < 1) o = { esc: 1 + 0.045 * Math.sin(Math.PI * e), destello: e }; }
    sprite(id, p[0], p[1], o);
    if (id.startsWith('pan-') && id.slice(4) === est) {   // anillo de selección del color tocado
      const e = E.outBack(prog(f, F, F + 9), 2.2); pctx.strokeStyle = COL.carbon; pctx.lineWidth = 6; pctx.beginPath(); pctx.arc(p[0] + 50, p[1] + 50, 50 + 10 * e, 0, 7); pctx.globalAlpha = prog(f, F, F + 3); pctx.stroke(); pctx.globalAlpha = 1;
    }
    if (id === 'nubes') {                                 // fogata viva con bombones que se doran
      pctx.save(); pctx.translate(p[0], p[1]); rr(pctx, 0, 0, 716, 472, 52); pctx.clip(); window.dibujarFogata(pctx, 716, 472, f / 60, E.io2(prog(f, 612, 712))); pctx.restore();
    }
    if (id === 'visita') {                                // pin del mapa (la ruta la traza la cinta)
      const e = prog(f, 1074, 1090); if (e > 0) {
        pctx.save(); pctx.translate(p[0] + 206 * 2, p[1] + 126 * 2 - (1 - E.outBack(e, 2.2)) * 260); pctx.scale(2.3, 2.3); pctx.globalAlpha = prog(f, 1074, 1077);
        pctx.fillStyle = 'rgba(0,0,0,.35)'; pctx.beginPath(); pctx.ellipse(0, 2, 12 * e, 4 * e, 0, 0, 7); pctx.fill();
        pctx.fillStyle = COL.rojo; pctx.beginPath(); pctx.moveTo(0, 0); pctx.bezierCurveTo(-22, -26, -20, -52, 0, -52); pctx.bezierCurveTo(20, -52, 22, -26, 0, 0); pctx.fill();
        pctx.fillStyle = COL.crema; pctx.beginPath(); pctx.arc(0, -34, 8, 0, 7); pctx.fill(); pctx.restore();
      }
    }
  }
  const eh = E.out3(prog(f, 172, 186)); if (eh > 0) {       // encabezado fijo
    const y = PY0 - 132 * (1 - eh);
    pctx.fillStyle = 'rgba(245,242,238,.95)'; pctx.fillRect(PX0, y, 780, 128); pctx.fillStyle = 'rgba(14,14,16,.08)'; pctx.fillRect(PX0, y + 127, 780, 2);
    sprite('enc', PX0, y);
  }
  chat(f);
  const fe = fabEsc(f); if (fe > 0.01) sprite('fab', FAB.x - TEL.cx + 540 - 62, FAB.y - TEL.cy + 960 - 62, { esc: fe, alpha: prog(f, 250, 253) });
}

// Hoja de chat que sale del botón de WhatsApp con el mensaje de ejemplo
function chat(f) {
  const e = E.outBack(prog(f, 774, 792), 1.3) * (1 - E.in3(prog(f, 850, 864))); if (e <= 0.001) return;
  const ox = FAB.x - TEL.cx + 540, oy = FAB.y - TEL.cy + 960;
  pctx.fillStyle = `rgba(14,14,16,${0.42 * clamp(e)})`; pctx.fillRect(PX0, PY0, 780, 1640);
  pctx.save(); pctx.translate(ox, oy); pctx.scale(e, e); pctx.translate(-ox, -oy);
  const x = PX0 + 24, y = 600, w = 732, h = 500;
  pctx.shadowColor = 'rgba(0,0,0,.45)'; pctx.shadowBlur = 50 * K; pctx.shadowOffsetY = 20 * K; rr(pctx, x, y, w, h, 56); pctx.fillStyle = '#FFFFFF'; pctx.fill(); pctx.shadowColor = 'transparent';
  pctx.save(); pctx.beginPath(); pctx.arc(x + 76, y + 78, 44, 0, 7); pctx.clip(); pctx.drawImage(IMG._logo, x + 32, y + 34, 88, 88); pctx.restore();
  pctx.textBaseline = 'alphabetic'; pctx.fillStyle = COL.carbon; pctx.font = '600 40px Fredoka'; pctx.fillText(NEG.nombre, x + 140, y + 76);
  pctx.fillStyle = '#5E5A55'; pctx.font = '700 26px Nunito'; pctx.fillText('WhatsApp · ' + NEG.whatsapp_visible, x + 140, y + 112);
  pctx.fillStyle = 'rgba(14,14,16,.08)'; pctx.fillRect(x, y + 150, w, 2);
  const msg = NEG.whatsapp_mensaje, n = clamp(Math.floor((f - 796) / 1.1), 0, msg.length);
  pctx.font = '700 36px Nunito'; const tw = pctx.measureText(msg).width, bw = tw + 64, bx = x + w - 36 - bw, by = y + 196;
  const eb = E.outBack(prog(f, 790, 802), 2); if (eb > 0) {
    pctx.save(); pctx.translate(bx + bw, by + 96); pctx.scale(eb, eb); pctx.translate(-bx - bw, -by - 96);
    pctx.beginPath(); pctx.roundRect(bx, by, bw, 96, [40, 40, 10, 40]); pctx.fillStyle = '#DDF2B2'; pctx.fill();
    pctx.fillStyle = COL.carbon; pctx.fillText(msg.slice(0, n), bx + 32, by + 60);
    if (n >= msg.length) { pctx.strokeStyle = '#6FA53A'; pctx.lineWidth = 4; pctx.lineCap = 'round'; pctx.lineJoin = 'round'; pctx.beginPath(); pctx.moveTo(bx + bw - 54, by + 122); pctx.lineTo(bx + bw - 44, by + 132); pctx.lineTo(bx + bw - 24, by + 110); pctx.moveTo(bx + bw - 40, by + 132); pctx.lineTo(bx + bw - 10, by + 110); pctx.stroke(); }
    pctx.restore();
  }
  rr(pctx, x + 32, y + h - 124, w - 64 - 110, 88, 44); pctx.fillStyle = '#F1EEE9'; pctx.fill();
  pctx.fillStyle = '#9A958E'; pctx.font = '700 30px Nunito'; pctx.fillText('Mensaje', x + 68, y + h - 69);
  pctx.fillStyle = COL.verde; pctx.beginPath(); pctx.arc(x + w - 76, y + h - 80, 44 * (1 + 0.14 * Math.sin(Math.PI * prog(f, 832, 842))), 0, 7); pctx.fill();
  pctx.strokeStyle = COL.carbon; pctx.lineWidth = 6; pctx.lineCap = 'round'; pctx.lineJoin = 'round'; pctx.beginPath(); pctx.moveTo(x + w - 92, y + h - 80); pctx.lineTo(x + w - 62, y + h - 80); pctx.moveTo(x + w - 74, y + h - 92); pctx.lineTo(x + w - 62, y + h - 80); pctx.lineTo(x + w - 74, y + h - 68); pctx.stroke();
  pctx.restore();
}

function celular(f, yaw) {
  pctx.setTransform(K, 0, 0, K, 0, 0); pctx.clearRect(0, 0, 1080, 1920);
  const x = 540 - TEL.hw, y = 960 - TEL.hh, w = TEL.hw * 2, h = TEL.hh * 2;
  const m = E.io3(prog(f, 114, 140));             // nace de la cinta: mismo marco redondeado que crece
  if (m < 1) { const hw = lerp(18, TEL.hw, m) - 4, hh = lerp(18, TEL.hh, m) - 4, r = lerp(18, TEL.r, m); pctx.save(); rr(pctx, 540 - hw, 960 - hh, hw * 2, hh * 2, Math.min(r, hw, hh)); pctx.clip(); }
  rr(pctx, x, y, w, h, TEL.r); const g = pctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#2b2b31'); g.addColorStop(0.5, '#101013'); g.addColorStop(1, '#232328'); pctx.fillStyle = g; pctx.fill();
  pctx.save(); rr(pctx, PX0, PY0, 780, 1612, 84); pctx.clip();
  pctx.fillStyle = '#0a0a0c'; pctx.fillRect(PX0, PY0, 780, 1612);
  const g2 = pctx.createLinearGradient(PX0, PY0, PX0 + 780, PY0 + 900); g2.addColorStop(0, 'rgba(142,63,201,.20)'); g2.addColorStop(1, 'rgba(240,120,76,.05)'); pctx.fillStyle = g2; pctx.fillRect(PX0, PY0, 780, 1612);
  const on = E.io2(prog(f, 148, 180));
  if (on > 0) {
    const R = on * 2000; pctx.save(); pctx.beginPath(); pctx.arc(PX0 + 78, PY0 + 64, R, 0, 7); pctx.clip(); pagina(f);
    if (on < 1) { const g5 = pctx.createRadialGradient(PX0 + 78, PY0 + 64, Math.max(0, R - 150), PX0 + 78, PY0 + 64, R); g5.addColorStop(0, 'rgba(20,16,23,0)'); g5.addColorStop(1, 'rgba(20,16,23,.9)'); pctx.fillStyle = g5; pctx.fillRect(PX0, PY0, 780, 1612); }
    pctx.restore();
  }
  const rf = yaw / 0.314; if (Math.abs(rf) > 0.01) {   // reflejo de cristal al enderezarse (toque 3D 2)
    pctx.globalCompositeOperation = 'screen'; const gx = PX0 + 390 + rf * 900; const g3 = pctx.createLinearGradient(gx - 260, PY0, gx + 260, PY0 + 700);
    g3.addColorStop(0, 'rgba(255,255,255,0)'); g3.addColorStop(0.5, `rgba(255,255,255,${0.22 * Math.min(1, Math.abs(rf) * 2)})`); g3.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = g3; pctx.fillRect(PX0, PY0, 780, 1612); pctx.globalCompositeOperation = 'source-over';
  }
  pctx.restore();
  rr(pctx, 540 - 112, PY0 + 22, 224, 62, 31); pctx.fillStyle = '#050506'; pctx.fill();
  rr(pctx, x + 1.5, y + 1.5, w - 3, h - 3, TEL.r - 1); const g4 = pctx.createLinearGradient(x + w * (0.5 - rf), y, x + w * (0.5 + rf * 0.6) + 300, y + h);
  g4.addColorStop(0, 'rgba(255,255,255,.75)'); g4.addColorStop(0.25, 'rgba(255,255,255,.10)'); g4.addColorStop(0.7, 'rgba(255,255,255,.06)'); g4.addColorStop(1, 'rgba(255,255,255,.45)');
  pctx.strokeStyle = g4; pctx.lineWidth = 3; pctx.stroke();
  rr(pctx, PX0 - 1, PY0 - 1, 782, 1614, 85); pctx.strokeStyle = 'rgba(0,0,0,.8)'; pctx.lineWidth = 2; pctx.stroke();
  if (m < 1) pctx.restore();
}
const s7 = (f) => E.io3(prog(f, 1152, 1236)), rec = (f) => E.io3(prog(f, 1296, 1356));
function telPose(f) {
  const ida = E.out3(prog(f, 142, 158)), vuelta = E.outBack(prog(f, 158, 214), 1.4), a = s7(f), r = rec(f);
  const yaw = 0.314 * ida * (1 - vuelta) - 0.2 * Math.sin(Math.PI * prog(f, 1152, 1236));
  const esc = lerp(lerp(0.9, 1, E.io3(prog(f, 150, 214))), 0.5, a) * (1 - 0.1 * r);
  return { yaw, esc, cx: lerp(TEL.cx + 60 * ida * (1 - vuelta), 262, a), cy: lerp(TEL.cy, 1345, a) + 70 * r };
}
// punto de la pantalla (u, v en px de página a 780) → escenario
const aEscenario = (f, u, v) => { const p = telPose(f); return [p.cx + (u - 390) * p.esc, p.cy + (-TEL.hh + TEL.bisel + v) * p.esc]; };

// Navegador de computadora con la misma página (menú a tres columnas)
function navegador(f) {
  const e = E.out3(prog(f, 1166, 1240)); if (e <= 0) return;
  const r = rec(f), s = (1 - 0.1 * r) * lerp(0.9, 1, e), w = 800, bar = 66, hC = 500;
  const cx = lerp(1640, 628, e), cy = 905 + 60 * r;
  ctx.save(); if (r > 0) ctx.filter = `blur(${9 * r * K}px)`;
  ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-w / 2, -(bar + hC) / 2);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 70 * K; ctx.shadowOffsetY = 34 * K; rr(ctx, 0, 0, w, bar + hC, 30); ctx.fillStyle = '#1c1c20'; ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, 0, 0, w, bar + hC, 30); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, bar); g.addColorStop(0, '#2c2c32'); g.addColorStop(1, '#1b1b1f'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, bar);
  [COL.mostaza, COL.rosa, COL.verde].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(34 + i * 30, bar / 2, 9, 0, 7); ctx.fill(); });
  rr(ctx, 140, 13, w - 190, 40, 20); ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fill();
  ctx.fillStyle = 'rgba(245,242,238,.85)'; ctx.font = '700 22px Nunito'; ctx.textBaseline = 'middle'; ctx.fillText('mandalaburgers.com', 164, 34);
  const im = IMG._desk, alto = (hC / w) * im.width, sy = lerp(0, im.height - alto - 900, E.io2(prog(f, 1236, 1340)));
  ctx.drawImage(im, 0, sy, im.width, alto, 0, bar, w, hC);
  ctx.restore();
  rr(ctx, 0.5, 0.5, w - 1, bar + hC - 1, 30); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

// ---------- la cinta en el tiempo ----------
const BUSQ = 'hamburguesas de colores aguascalientes';
const BAR = { y: 760, x0: 190 };
let anchoBusq = null; const tamBusq = 34;
function medirBusq() {
  if (anchoBusq) return; ctx.save(); ctx.font = `700 ${tamBusq}px Nunito`; anchoBusq = [0];
  for (let i = 1; i <= BUSQ.length; i++) anchoBusq.push(ctx.measureText(BUSQ.slice(0, i)).width); ctx.restore();
}
const nTecleo = (f) => clamp(Math.floor((f - 12) / (84 / BUSQ.length)) + 1, 0, BUSQ.length);
const barra = (f) => ({ hw: 450 * E.outExpo(prog(f, 5, 22)), hh: lerp(7, 60, E.outBack(prog(f, 8, 24), 1.6)), y: BAR.y - 1100 * E.in3(prog(f, 106, 122)), esc: 1 - 0.05 * Math.sin(Math.PI * prog(f, 102, 110)) });
const FLOR = { x: 250, y: 420 };
const ATERRIZA = (i) => 340 + i * 4;
function destinoPunto(i) { const r = L.estados.todos.rects['pan-' + PANES[i][0]]; return [TEL.cx - 390 + r.x * 2 + 50, SY0 + r.y * 2 + 50 - scrollDe(330)]; }
const LOGO = (f) => { const t = E.io3(prog(f, 1440, 1470)); return { x: 540, y: lerp(650, 596, t), r: lerp(236, 176, t), R: lerp(272, 208, t), w: lerp(38, 28, t) }; };
function rutaMapa(f) {            // ruta del mapa ilustrado en coordenadas del escenario
  const r = L.estados.morado.rects.visita, sc = scrollDe(f);
  const P = (u, v) => aEscenario(f, (r.x + u) * 2, (r.y + v) * 2 - sc);
  return bez(P(4, 124), P(80, 96), P(160, 150), P(250, 118), 12).concat(bez(P(250, 118), P(295, 102), P(322, 98), P(352, 102), 6).slice(1));
}
const subr = (f, y0, fa, fb) => { const pts = []; for (let i = 0; i <= 18; i++) { const t = i / 18; pts.push([200 + t * 680, y0 + Math.sin(t * Math.PI * 2 + f / 22) * 9 - t * 14]); } return { pts, rango: [0, lerp(0.07, 1, E.out3(prog(f, fa, fb)))], w: 22, bandas: 4 }; };

function cintaEn(f) {
  const fase = amb(f) / 46;
  if (f < 98) {            // latigazo, retorno de carro y subrayado que escribe
    const b = barra(f), y = lerp(760, BAR.y + b.hh + 22, E.out3(prog(f, 8, 20)));
    const xCaret = BAR.x0 + anchoBusq[nTecleo(f)] + 6;
    const bFin = f < 8 ? E.outExpo(prog(f, 0, 8)) : lerp(1, (Math.max(xCaret, 250) + 80) / 1240, E.io3(prog(f, 8, 15)));
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
  if (f < 116) {           // salta en arco hacia donde nacerá el celular
    const t = prog(f, 106, 116), pts = bez(boton, [1060, 900], [820, 1500], [tp.cx, tp.cy], 20);
    return { modo: 1, pts, rango: [E.in3(t) * 0.97, lerp(0.03, 1, E.io2(t))], w: lerp(30, 36, t), fase, bandas: 3 };
  }
  const marco = { t: 'marco', x: tp.cx, y: tp.cy, hw: TEL.hw * tp.esc, hh: TEL.hh * tp.esc, r: TEL.r * tp.esc };
  if (f < 140) {           // punto → marco del celular (el mismo campo de distancia que crece)
    const m2 = E.io3(prog(f, 116, 140));
    return { modo: 2, A: { t: 'marco', x: tp.cx, y: tp.cy, hw: lerp(18, marco.hw, m2), hh: lerp(18, marco.hh, m2), r: lerp(18, marco.r, m2) }, ow: lerp(36, 24, m2), fase: fase + m2 * 2 };
  }
  const sub = { ...subr(f, 508, 194, 214) }; sub.rango = [0, sub.rango[1] * (1 - 0.86 * E.io3(prog(f, 266, 284)))];
  if (f < 160) return { modo: 3, ...sub, A: marco, m: 1 - E.io3(prog(f, 140, 160)), ow: 24, fase };   // marco → trazo
  if (f < 284) return { modo: 1, ...sub, fase };
  const aro = { t: 'aro', x: FLOR.x, y: FLOR.y, r: 74, w: 30 };
  if (f < 298) return { modo: 3, ...sub, A: aro, m: E.io3(prog(f, 284, 298)), fase };                  // trazo → aro
  if (f < 362) {           // aro → pétalos → puntos de color que vuelan a la interfaz
    const abre = E.outBack(prog(f, 298, 320), 1.5), giro = -0.5 + f / 60;
    const pet = PANES.map(([, c], i) => {
      const ang = giro + (i * Math.PI * 2) / 5, v = E.io3(prog(f, 328 + i * 4, ATERRIZA(i)));
      const o = [FLOR.x + Math.sin(ang) * 86, FLOR.y - Math.cos(ang) * 86], d = destinoPunto(i), arco = Math.sin(Math.PI * v) * 120;
      return { x: lerp(o[0], d[0], v) + arco * 0.4, y: lerp(o[1], d[1], v) - arco, ang: ang * (1 - v), hl: lerp(lerp(40, 78, abre), 50, v), hw: lerp(lerp(30, 34, abre), 50, v), col: rgb(c), fin: f >= ATERRIZA(i) };
    }).filter((p) => !p.fin);
    if (!pet.length) return null;
    return { modo: 2, A: aro, B: { t: 'petalos' }, petalos: pet, m2: clamp(prog(f, 298, 312)), fase };
  }
  if (f < 700) return null;                                  // la cinta vive en los puntos de color de la interfaz
  const verde = rgb(COL.verde);
  if (f < 762) {           // sale de la fogata y se vuelve el botón de WhatsApp
    const o = aEscenario(f, 390, 2 * L.estados.morado.rects.nubes.y - scrollDe(f) + 250);
    const pts = bez(o, [o[0] - 330, o[1] - 430], [1060, 1120], [FAB.x, FAB.y], 22);
    const r = 62 * fabEsc(f);
    if (f >= 752) return { modo: 2, A: { t: 'disco', x: FAB.x, y: FAB.y, r }, solido: [...verde, 1], fase };
    return { modo: 3, pts, rango: [E.io3(prog(f, 714, 748)) * 0.985, lerp(0.02, 1, E.io2(prog(f, 700, 740)))], w: 26, bandas: 4, A: { t: 'disco', x: FAB.x, y: FAB.y, r: Math.max(r, 51) }, m: E.io3(prog(f, 738, 752)), solido: [...verde, E.io2(prog(f, 730, 750))], fase };
  }
  if (f < 998) return null;                                  // la cinta es el botón
  if (f < 1150) {          // sale del botón y traza la ruta del mapa
    const ruta = rutaMapa(f), ent = bez([FAB.x, FAB.y], [FAB.x - 260, FAB.y - 40], [ruta[0][0] - 190, ruta[0][1] + 190], ruta[0], 10);
    const pts = ent.concat(ruta.slice(1)), frac = largo(ent) / largo(pts);
    const b = lerp(lerp(0.01, frac, E.io2(prog(f, 998, 1010))), 1, E.io2(prog(f, 1008, 1068)));
    const a = lerp(lerp(0, frac, E.io3(prog(f, 1004, 1024))), 0.985, E.in3(prog(f, 1136, 1150)));
    return { modo: 1, pts, rango: [a, b], w: 24, bandas: 5, fase };
  }
  if (f < 1176) {          // deja el mapa y salta a subrayar
    const ini = rutaMapa(1150).at(-1), t = prog(f, 1150, 1176), pts = bez(ini, [ini[0] + 260, ini[1] - 300], [60, 760], [200, 590], 20);
    return { modo: 1, pts, rango: [E.in3(t) * 0.97, lerp(0.02, 1, E.io2(t))], w: 24, bandas: 3, fase };
  }
  const sub2 = subr(f, 590, 1176, 1236), lg = LOGO(f);
  const aro2 = { t: 'aro', x: lg.x, y: lg.y, r: lg.R, w: lg.w };
  if (f < 1296) return { modo: 1, ...sub2, fase };
  if (f < 1330) return { modo: 3, ...sub2, A: aro2, m: E.io3(prog(f, 1296, 1330)), fase };            // trazo → aro del logo
  return { modo: 2, A: aro2, vol: E.io2(prog(f, 1326, 1350)), fase: fase * 1.6 };
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
  { t: "PA' EL", f0: 456, sale: 500, y: 392, tam: 112, max: 600, ext: COL.morado, dir: -1 },
  { t: 'ATREVIDO', f0: 475, sale: 503, y: 536, tam: 156, max: 800, col: '#F0453F', dir: 1 },
  { t: 'HOTDOGS', f0: 516, sale: 600, y: 470, tam: 190, max: 840, ext: COL.rojo, dir: -1, fx: 'estira' },
  { t: 'NUBES', f0: 624, sale: 678, y: 392, tam: 150, max: 700, ext: COL.naranja, dir: -1, fx: 'infla' },
  { t: 'ASADAS', f0: 646, sale: 680, y: 540, tam: 164, max: 760, dir: 1, fx: 'dora' },
  { t: 'EN TU MESA', f0: 689, sale: 742, y: 470, tam: 150, max: 860, ext: COL.naranja, dir: -1 },
  { t: 'PIDE', f0: 756, sale: 850, y: 392, tam: 160, max: 600, ext: COL.verde, dir: -1 },
  { t: 'POR WHATSAPP', f0: 771, sale: 853, y: 536, tam: 140, max: 900, col: COL.verde, dir: 1 },
  { t: 'MANDALOVERS', f0: 930, sale: 1002, y: 470, tam: 150, max: 920, multi: true, dir: -1, fx: 'late' },
  { t: 'JUEVES', f0: 1020, sale: 1140, y: 392, tam: 150, max: 700, ext: COL.rojo, dir: -1, fx: 'pin' },
  { t: 'A DOMINGO', f0: 1050, sale: 1143, y: 540, tam: 150, max: 860, col: COL.mostaza, dir: 1, fx: 'pin' },
  { t: 'EN CELULAR', f0: 1176, sale: 1288, y: 392, tam: 128, max: 760, ext: COL.morado, dir: -1, fx: 'angosto' },
  { t: 'EN COMPU', f0: 1224, sale: 1291, y: 536, tam: 150, max: 860, col: COL.rosa, dir: 1, fx: 'ancho' },
  { t: 'COLOR', f0: 1320, sale: 1438, y: 1190, tam: 270, max: 900, multi: true, dir: -1 },
  { t: 'EN CADA', f0: 1351, sale: 1440, y: 1385, tam: 170, max: 820, ext: COL.naranja, dir: 1 },
  { t: 'BURGER', f0: 1387, sale: 1442, y: 1578, tam: 220, max: 860, col: COL.mostaza, dir: -1 },
];
const medidas = new Map();
function medir(p) {
  if (medidas.has(p)) return medidas.get(p);
  ctx.save(); ctx.font = `600 ${p.tam}px Fredoka`; const w = ctx.measureText(p.t).width; const tam = w > p.max ? (p.tam * p.max) / w : p.tam;
  ctx.font = `600 ${tam}px Fredoka`; const xs = [0]; for (let i = 1; i <= p.t.length; i++) xs.push(ctx.measureText(p.t.slice(0, i)).width); ctx.restore();
  const m = { tam, xs, w: xs[p.t.length] }; medidas.set(p, m); return m;
}
function palabra(p, f) {
  if (f < p.f0 - 1 || f > p.sale + 16) return;
  const m = medir(p), cxp = p.x ?? 540;
  const sal = E.in3(prog(f, p.sale, p.sale + 12));
  let colToque = null; if (p.toque) { const q = PANES.find((z) => z[0] === ESTADOS[estadoEn(f)][1]); if (q) colToque = q[1]; }
  const tw = f - p.f0;
  const abre = p.fx === 'estira' ? lerp(0.5, 1, E.outBack(prog(tw, 0, 16), 2.6)) : 1;                       // HOTDOGS se estira a lo largo
  const ancho = p.fx === 'angosto' ? lerp(0.55, 1, E.outBack(prog(tw, 2, 18), 1.4)) : p.fx === 'ancho' ? lerp(1.5, 1, E.outBack(prog(tw, 2, 18), 1.4)) : 1;
  const late = p.fx === 'late' && tw > 12 ? 1 + 0.05 * Math.max(0, Math.sin(((f - 936) / 36) * Math.PI * 2)) ** 3 : 1;   // late al pulso
  ctx.save(); ctx.font = `600 ${m.tam}px Fredoka`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  ctx.translate(cxp, p.y); ctx.scale(ancho * late, late); ctx.translate(-cxp, -p.y);
  let n = 0;
  for (let i = 0; i < p.t.length; i++) {
    const ch = p.t[i]; if (ch === ' ') continue;
    const t = tw - n * 1.6; n++; if (t < 0) continue;      // stagger ≈ 27 ms por glifo
    const dur = p.fx === 'infla' ? 14 : 6;
    const e = prog(t, 0, dur), cae = p.fx === 'infla' ? E.outBack(e, 2.2) : E.out3(e);
    const rebote = t > dur ? Math.exp(-(t - dur) / 5) * Math.cos((t - dur) * 0.9) : 0;
    const s = p.fx === 'infla' ? lerp(0.4, 1, cae) : lerp(1.4, 1, cae), sx = s * (1 + 0.16 * rebote), sy = s * (1 - 0.2 * rebote);
    const sac = t >= dur && t < dur + 2 ? (hash(i * 7 + Math.floor(t)) - 0.5) * 12 : 0;   // 2 cuadros de sacudida
    const gxBase = (m.xs[i] + m.xs[i + 1]) / 2 - m.w / 2;
    const gx = cxp + gxBase * abre + sac + p.dir * sal * 760 * (1 + n * 0.05);
    let gy = p.y; if (p.fx === 'pin') gy -= (1 - E.outBack(prog(t, 0, 9), 2.4)) * 220; if (p.fx === 'infla') gy += Math.sin(f / 14 + i) * 5;
    let col = p.multi ? TIPO[(n - 1) % TIPO.length] : (colToque || p.col || COL.crema);
    if (p.fx === 'dora') col = mixHex('#FFF6E4', '#E9A23B', E.io2(prog(tw, 8, 34)));                           // ASADAS se dora
    const ext = p.fx === 'dora' ? mixHex('#C9B79A', '#8A4A1E', E.io2(prog(tw, 8, 34))) : p.multi || p.col || colToque ? mixHex(col, '#000000', 0.5) : p.ext;
    ctx.save(); ctx.translate(gx, gy); ctx.scale(sx, sy); ctx.globalAlpha = clamp(t / 2) * (1 - sal * sal);
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 22 * K; ctx.shadowOffsetY = 16 * K;
    ctx.fillStyle = ext; ctx.fillText(ch, 0, m.tam * 0.062);
    ctx.shadowColor = 'transparent'; ctx.fillStyle = col; ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- barra de búsqueda (S1) ----------
function busqueda(f) {
  if (f < 4 || f > 124) return;
  const b = barra(f); if (b.hw < 8) return;
  ctx.save(); ctx.translate(540, b.y); ctx.scale(b.esc, b.esc); ctx.translate(-540, -b.y);
  cristal(ctx, cv, 540 - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2, b.hh, { blur: 34, t0: 'rgba(255,255,255,.22)', t1: 'rgba(255,255,255,.07)' });
  ctx.save(); rr(ctx, 540 - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2, b.hh); ctx.clip();
  ctx.globalAlpha = prog(f, 12, 18); ctx.strokeStyle = COL.crema; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(138, b.y - 3, 15, 0, 7); ctx.moveTo(149, b.y + 9); ctx.lineTo(160, b.y + 20); ctx.stroke();
  ctx.font = `700 ${tamBusq}px Nunito`; ctx.fillStyle = COL.crema; ctx.textBaseline = 'middle'; ctx.fillText(BUSQ.slice(0, nTecleo(f)), BAR.x0, b.y + 2);
  if (f < 98 && Math.floor(f / 9) % 2 === 0) ctx.fillRect(BAR.x0 + anchoBusq[nTecleo(f)] + 5, b.y - 22, 3, 44);
  const eb = E.outBack(prog(f, 14, 26), 2); ctx.globalAlpha = 1;
  ctx.fillStyle = COL.mostaza; ctx.beginPath(); ctx.arc(918, b.y, 44 * eb * (1 - 0.14 * Math.sin(Math.PI * prog(f, 101, 108))), 0, 7); ctx.fill();
  if (eb > 0.5) { ctx.strokeStyle = COL.carbon; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(903, b.y); ctx.lineTo(932, b.y); ctx.moveTo(921, b.y - 12); ctx.lineTo(933, b.y); ctx.lineTo(921, b.y + 12); ctx.stroke(); }
  ctx.restore(); ctx.restore();
}

// ---------- tarjeta de cristal: horario y dirección (S6) ----------
function tarjetaVisita(f) {
  const e = E.outBack(prog(f, 1080, 1098), 1.3), s = E.in3(prog(f, 1140, 1154)); if (e <= 0 || s >= 1) return;
  const x = 100, y = 1270 + (1 - e) * 120 + s * 500, w = 880, h = 318;
  ctx.save(); ctx.globalAlpha = clamp(prog(f, 1080, 1084));
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 60 * K; ctx.shadowOffsetY = 26 * K; rr(ctx, x, y, w, h, 48); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); ctx.restore();
  cristal(ctx, cv, x, y, w, h, 48, { blur: 36, t0: 'rgba(34,28,42,.50)', t1: 'rgba(20,18,26,.66)' });
  ctx.textBaseline = 'middle'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = COL.mostaza; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x + 70, y + 76, 24, 0, 7); ctx.moveTo(x + 70, y + 62); ctx.lineTo(x + 70, y + 76); ctx.lineTo(x + 81, y + 83); ctx.stroke();
  ctx.fillStyle = COL.crema; ctx.font = '800 41px Nunito'; ctx.fillText(NEG.horario_corto, x + 116, y + 78);
  ctx.fillStyle = COL.rojo; ctx.beginPath(); ctx.moveTo(x + 70, y + 190); ctx.bezierCurveTo(x + 44, y + 160, x + 46, y + 132, x + 70, y + 132); ctx.bezierCurveTo(x + 94, y + 132, x + 96, y + 160, x + 70, y + 190); ctx.fill();
  ctx.fillStyle = COL.crema; ctx.beginPath(); ctx.arc(x + 70, y + 153, 8, 0, 7); ctx.fill();
  ctx.font = '800 41px Nunito'; ctx.fillText(NEG.direccion_1, x + 116, y + 160);
  let cxp = x + 116;
  [['Pet friendly', COL.naranja, 1104], ['Tarjetas', COL.mostaza, 1116]].forEach(([t, c, f0]) => {
    ctx.font = '800 32px Nunito'; const tw = ctx.measureText(t).width + 56, k = E.outBack(prog(f, f0, f0 + 12), 2.4);
    if (k > 0) { ctx.save(); ctx.translate(cxp + tw / 2, y + 250); ctx.scale(k, k); rr(ctx, -tw / 2, -32, tw, 64, 32); ctx.fillStyle = c; ctx.fill(); ctx.fillStyle = COL.carbon; ctx.textAlign = 'center'; ctx.fillText(t, 0, 2); ctx.restore(); }
    cxp += tw + 18;
  });
  ctx.restore();
}

// ---------- logo por máscara circular (S7) y end card (S8) ----------
function logo(f) {
  const e = E.out3(prog(f, 1312, 1348)); if (e <= 0) return;
  const lg = LOGO(f);
  ctx.save(); ctx.beginPath(); ctx.arc(lg.x, lg.y, lg.r * e, 0, 7); ctx.clip();
  ctx.fillStyle = COL.crema; ctx.fillRect(lg.x - lg.r, lg.y - lg.r, lg.r * 2, lg.r * 2);
  ctx.drawImage(IMG._logo, lg.x - lg.r, lg.y - lg.r, lg.r * 2, lg.r * 2); ctx.restore();
}
function panelFinal(f) {
  const e = E.io3(prog(f, 1440, 1468)); if (e <= 0) return;
  const lg = LOGO(f), w = 900 * lerp(0.4, 1, e), top = lerp(lg.y - 200, 330, e), bot = lerp(lg.y + 200, 1372, e);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 80 * K; ctx.shadowOffsetY = 30 * K; rr(ctx, 540 - w / 2, top, w, bot - top, 64); ctx.fillStyle = `rgba(0,0,0,${0.4 * e})`; ctx.fill(); ctx.restore();
  cristal(ctx, cv, 540 - w / 2, top, w, bot - top, 64, { blur: 38, t0: 'rgba(30,26,38,.58)', t1: 'rgba(14,14,18,.78)' });
}
function textosFinal(f) {
  if (f < 1456) return;
  const ent = (f0) => { const e = prog(f, f0, f0 + 14); return [clamp(e * 1.6), (1 - E.out3(e)) * 46]; };
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let [a, dy] = ent(1460); ctx.globalAlpha = a;
  ctx.font = '600 60px Fredoka'; let tw = ctx.measureText(NEG.endcard_linea).width; if (tw > 820) ctx.font = `600 ${(60 * 820) / tw}px Fredoka`;
  ctx.fillStyle = COL.crema; ctx.fillText(NEG.endcard_linea, 540, 906 + dy);
  [a, dy] = ent(1468); ctx.globalAlpha = a; ctx.font = '800 42px Nunito'; ctx.fillStyle = COL.mostaza; ctx.fillText(NEG.instagram, 540, 990 + dy);
  const k = E.outBack(prog(f, 1478, 1496), 1.8);
  if (k > 0) {
    ctx.globalAlpha = clamp(prog(f, 1478, 1482)); ctx.save(); ctx.translate(540, 1140); ctx.scale(1.04 * k * (1 + 0.025 * Math.sin((f - 1500) / 9) * prog(f, 1500, 1520)), 1.04 * k);
    ctx.shadowColor = 'rgba(201,138,0,.55)'; ctx.shadowBlur = 40 * K; ctx.shadowOffsetY = 16 * K; rr(ctx, -400, -64, 800, 128, 64); ctx.fillStyle = COL.mostaza; ctx.fill(); ctx.shadowColor = 'transparent';
    rr(ctx, -400, -64, 800, 60, [64, 64, 0, 0]); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
    ctx.font = '800 39px Nunito'; tw = ctx.measureText(NEG.endcard_boton).width; const sc = Math.min(1, 640 / tw);
    ctx.font = `800 ${39 * sc}px Nunito`; tw = ctx.measureText(NEG.endcard_boton).width; ctx.fillStyle = COL.carbon; ctx.fillText(NEG.endcard_boton, 32, 3);
    ctx.save(); ctx.translate(32 - tw / 2 - 66, -27); ctx.scale(2.25, 2.25); ctx.fill(WA); ctx.restore();
    const d = prog(f, 1500, 1528); if (d > 0 && d < 1) { ctx.save(); rr(ctx, -400, -64, 800, 128, 64); ctx.clip(); const gx = lerp(-520, 520, d); const g = ctx.createLinearGradient(gx - 120, -64, gx + 120, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-400, -64, 800, 128); ctx.restore(); }
    ctx.restore();
  }
  [a, dy] = ent(1500); ctx.globalAlpha = a * 0.8; ctx.font = '700 27px Nunito'; ctx.fillStyle = COL.crema; ctx.fillText(NEG.pie_legal, 540, 1300 + dy * 0.4);
  ctx.restore();
}

function toques(f) {
  const lista = [[102, () => [918, barra(102).y], COL.mostaza], [768, () => [FAB.x, FAB.y], COL.verde], [834, () => aEscenario(f, 24 + 732 - 76, 600 - PY0 + 500 - 80), COL.verde]]
    .concat(ESTADOS.slice(1, 5).map(([F, est]) => [F, () => destinoPunto(PANES.findIndex((p) => p[0] === est)).map((v, i) => (i ? v - (scrollDe(F + 20) - scrollDe(330)) * prog(f, F, F + 18) : v)), COL.crema]));
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
    navegador(f);
    if (f >= 114) {
      const p = telPose(f), r = rec(f); celular(f, p.yaw);
      const m = E.io3(prog(f, 114, 140));
      ctx.save(); ctx.filter = `blur(${46 * K}px)`; ctx.fillStyle = 'rgba(0,0,0,.55)';
      rr(ctx, p.cx - TEL.hw * p.esc * m + 30, p.cy - TEL.hh * p.esc * m + 50, TEL.hw * 2 * p.esc * m, TEL.hh * 2 * p.esc * m, 90 * p.esc); ctx.fill(); ctx.restore();
      const t = ctx.getTransform(); const cx = (t.a * p.cx + t.e) / K, cy = (t.d * p.cy + t.f) / K;
      ctx.save(); if (r > 0) ctx.filter = `blur(${9 * r * K}px)`;
      proyectar(ctx, pc, 540, 960, cx, cy, (p.esc * t.a) / K, p.yaw, 'y', 2600, 470); ctx.restore();
    }
    const osc = 0.55 * rec(f) + 0.2 * E.io2(prog(f, 1440, 1470));
    if (osc > 0) { ctx.fillStyle = `rgba(10,9,12,${osc})`; ctx.fillRect(-200, -200, 1480, 2320); }
    chispas(f);
    busqueda(f);
  });
  capa(ctx, f, 1.12, () => tarjetaVisita(f));
  capa(ctx, f, 1, () => {
    panelFinal(f); logo(f);
    const c = cintaEn(f);
    if (c) { cinta.dibujar(c); ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20 * K; ctx.shadowOffsetY = 12 * K; ctx.drawImage(cinta.cv, 0, 0, 1080, 1920); ctx.restore(); }
    textosFinal(f); toques(f);
  });
  capa(ctx, f, 1.25, () => { for (const p of PALABRAS) palabra(p, f); });
  semillas(f, 1);
  const d = f >= 7 && f < 11.5 ? 1 - Math.abs(f - 9) / 2.5 : 0;     // destello de 3 cuadros en el golpe inicial
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
  const sub = o.sub || 8, sh = o.shutter ?? 0.25;
  actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < sub; i++) {
    subcuadro(f + ((i + 0.5) / sub - 0.5) * sh * 2);
    actx.globalAlpha = 1 / (i + 1); actx.drawImage(cv, 0, 0);
  }
  actx.globalAlpha = 1; acabado(f);
  return acc.toDataURL('image/png');
};

init().then(() => { window.ready = true; }).catch((e) => { window.initError = String(e && e.stack || e); });
