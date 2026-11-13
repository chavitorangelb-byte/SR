// Maison Rose · "El pliegue" · escena completa en Canvas 2D, determinista: draw(t) con t en cuadros de 60 fps.
// Un solo plano: una cinta 3D (tira con grosor, sombreada por normal) que se pliega, se vuelve aro del logo,
// marco del teléfono, subrayado del botón y doblez final. Todo en unidades de diseño de 1080 × 1920.
const Q = new URLSearchParams(location.search);
const W = +Q.get('w') || 540, H = +Q.get('h') || 960;
const DW = 1080, DH = 1920, K = W / DW;
const C = { cacao: '#1B1210', crema: '#F3E6D6', rosa: '#E5A898', caramelo: '#C98B4E', choco: '#4A2A1C' };
const SERIF = 'MRSerif', SANS = 'MRSans', SCRIPT = 'MRScript';

const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const g = cv.getContext('2d');
const bcv = new OffscreenCanvas(W, H), bg = bcv.getContext('2d');       // copia desenfocada para el cristal
const acv = new OffscreenCanvas(W, H), ag = acv.getContext('2d');       // acumulador del motion blur

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, m) => a + (b - a) * m;
const pr = (t, a, b) => clamp((t - a) / (b - a));
const eOut = (x) => 1 - Math.pow(1 - x, 3);
const eOut5 = (x) => 1 - Math.pow(1 - x, 5);
const eIn = (x) => x * x * x;
const eIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eBack = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// claves: [[cuadro, valor], ...] con suavizado entre claves
function kf(t, keys, ease = eIO) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return lerp(va, vb, ease(pr(t, a, b))); }
  return keys[keys.length - 1][1];
}
const rgb = (c, l = 1) => `rgb(${clamp(c[0] * l, 0, 255) | 0},${clamp(c[1] * l, 0, 255) | 0},${clamp(c[2] * l, 0, 255) | 0})`;
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }

// ---------- línea de tiempo ----------
let TL, IMG = {};
const S = { pliegues: 30, rev: 120, tel: 180, gal: 360, muro: 540, past: 720, wa: 900, cierre: 1020, end: 1200, fin: 1380 };
const wf = (id, i) => TL.voz.find((v) => v.id === id).palabras[i].f; // cuadro de una palabra de la voz
const GOLPES = [198, 240, 300, 726, 811, 872, 960, 990, 1002, 1200];   // ondas en el campo líquido

// ---------- fondo: un solo campo líquido ----------
let noise;
function makeNoise() {
  const n = new OffscreenCanvas(256, 256), c = n.getContext('2d'), d = c.createImageData(256, 256);
  let s = 1234567;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 1664525 + 1013904223) >>> 0; const v = s >>> 24; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  c.putImageData(d, 0, 0); noise = g.createPattern(n, 'repeat');
}
function fondo(t) {
  g.setTransform(K, 0, 0, K, 0, 0);
  g.fillStyle = C.cacao; g.fillRect(0, 0, DW, DH);
  const blobs = [[0.25, 0.3, 760, '74,42,28', 0.55, 0.011, 0], [0.8, 0.62, 820, '201,139,78', 0.13, 0.008, 2], [0.4, 0.85, 700, '229,168,152', 0.10, 0.013, 4], [0.7, 0.18, 600, '74,42,28', 0.5, 0.009, 1]];
  for (const [bx, by, r, col, a, sp, ph] of blobs) {
    const x = DW * bx + Math.sin(t * sp + ph) * 170, y = DH * by + Math.cos(t * sp * 0.8 + ph) * 210;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, DW, DH);
  }
  for (const f of GOLPES) { // ondas del golpe
    const d = t - f; if (d < 0 || d > 46) continue;
    const m = d / 46, R = 180 + eOut(m) * 900;
    g.strokeStyle = `rgba(243,230,214,${0.10 * (1 - m) * (1 - m)})`; g.lineWidth = 26 * (1 - m) + 2;
    g.beginPath(); g.arc(540, f >= 1200 ? 960 : 980, R, 0, 7); g.stroke();
  }
}
function camara(t) {
  const z = kf(t, [[0, 1], [120, 1.07], [176, 1.07], [200, 1], [360, 1.035], [384, 1], [540, 1.03], [566, 1], [720, 1.04], [900, 1], [1020, 1.05], [1190, 0.97]]);
  const px = kf(t, [[360, 0], [540, -26], [566, 0], [540 + 40, 0], [700, 14], [724, 0]]);
  const sh = GOLPES.reduce((a, f) => { const d = t - f; return d >= 0 && d < 10 ? a + Math.sin(d * 2.4) * (1 - d / 10) * 4 : a; }, 0);
  g.setTransform(K * z, 0, 0, K * z, K * (540 - 540 * z + px), K * (960 - 960 * z + sh));
  return z;
}
function snap(px) { bg.filter = `blur(${px * K}px) saturate(140%)`; bg.drawImage(cv, 0, 0); bg.filter = 'none'; }
// rellena el trazo actual con lo que hay detrás, desenfocado (cristal de verdad), más tinte, ruido y borde
function cristal(path, tint, borde = 'rgba(243,230,214,.42)') {
  g.save(); path(); g.clip();
  const m = g.getTransform(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bcv, 0, 0); g.setTransform(m);
  g.fillStyle = tint; g.fill();
  g.globalAlpha = 0.05; g.fillStyle = noise; g.fill(); g.globalAlpha = 1;
  g.restore();
  path(); g.strokeStyle = borde; g.lineWidth = 1.6; g.stroke();
}

// ---------- cinta 3D ----------
const F = 2600; // distancia focal de la cámara de la cinta
const LUZ = (() => { const v = [-0.5, -0.72, 0.5], n = Math.hypot(...v); return v.map((x) => x / n); })();
const N = 300;
// polilínea densa del pliegue (serpentina de 4 capas) en coordenadas locales; y hacia abajo
const PL = (() => {
  const Lw = 560, gp = 62, R = gp / 2, p = [];
  const P0 = [-2500, 900], P1 = [-Lw / 2 - 760, 0], P2 = [-Lw / 2, 0];
  for (let i = 0; i <= 120; i++) { const u = i / 120, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; p.push([a * P0[0] + b * P1[0] + c * P2[0], a * P0[1] + b * P1[1] + c * P2[1]]); }
  const marks = [p.length - 1];
  let y = 0, dir = 1;
  for (let L = 0; L < 4; L++) {
    const x0 = -dir * Lw / 2, x1 = dir * Lw / 2 * (L === 3 ? 0.55 : 1);
    for (let i = 1; i <= 40; i++) p.push([lerp(x0, x1, i / 40), y]);
    if (L < 3) { for (let i = 1; i <= 16; i++) { const a = Math.PI / 2 - (i / 16) * Math.PI; p.push([x1 + dir * R * Math.cos(a), y - R + R * Math.sin(a)]); } y -= gp; dir = -dir; }
    marks.push(p.length - 1);
  }
  const s = [0]; for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { p, s, marks: marks.map((i) => s[i]), total: s[s.length - 1], alto: 3 * gp };
})();
function plPoint(sv) {
  const { p, s } = PL; let lo = 0, hi = s.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] <= sv) lo = m; else hi = m; }
  const u = (sv - s[lo]) / (s[hi] - s[lo] || 1); return [lerp(p[lo][0], p[hi][0], u), lerp(p[lo][1], p[hi][1], u)];
}
// puntos de la pila plegada entre dos longitudes de arco, ya girados a la vista (guiñada y picada) y colocados
function pila(sa, sb, cx, cy, sc, yaw = -0.45, pitch = 0.66) {
  const out = [], cy0 = Math.cos(yaw), sy0 = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  for (let i = 0; i < N; i++) {
    const [lx, ly0] = plPoint(lerp(sa, sb, i / (N - 1))); const ly = ly0 + PL.alto / 2;
    const x1 = lx * cy0, z1 = -lx * sy0;                       // guiñada
    const y2 = ly * cp + z1 * sp, z2 = -ly * sp + z1 * cp;      // picada
    const bx = sy0, bz1 = cy0, by = bz1 * sp, bz = bz1 * cp;    // binormal (0,0,1) girada
    out.push({ x: cx + x1 * sc, y: cy + y2 * sc, z: z2 * sc, bx, by, bz });
  }
  return out;
}
// perímetro de un rectángulo redondeado (círculo si r = w/2), desde arriba al centro, en sentido horario; bisel hacia cámara
function marco(cx, cy, w, h, r, bisel = 0.6) {
  r = Math.min(r, w / 2, h / 2); const sw = w - 2 * r, sh = h - 2 * r, q = Math.PI * r / 2, per = 2 * sw + 2 * sh + 4 * q, out = [];
  const cb = Math.cos(bisel), sb = Math.sin(bisel);
  for (let i = 0; i < N; i++) {
    let d = (i / N) * per + sw / 2, x, y, nx, ny; d %= per;
    const segs = [sw, q, sh, q, sw, q, sh, q]; let k = 0; while (d > segs[k]) { d -= segs[k]; k++; }
    const a = d / (q || 1) * Math.PI / 2;
    if (k === 0) { x = -sw / 2 + d; y = -h / 2; nx = 0; ny = -1; }
    else if (k === 1) { x = sw / 2 + r * Math.sin(a); y = -sh / 2 - r * Math.cos(a); nx = Math.sin(a); ny = -Math.cos(a); }
    else if (k === 2) { x = w / 2; y = -sh / 2 + d; nx = 1; ny = 0; }
    else if (k === 3) { x = sw / 2 + r * Math.cos(a); y = sh / 2 + r * Math.sin(a); nx = Math.cos(a); ny = Math.sin(a); }
    else if (k === 4) { x = sw / 2 - d; y = h / 2; nx = 0; ny = 1; }
    else if (k === 5) { x = -sw / 2 - r * Math.sin(a); y = sh / 2 + r * Math.cos(a); nx = -Math.sin(a); ny = Math.cos(a); }
    else if (k === 6) { x = -w / 2; y = sh / 2 - d; nx = -1; ny = 0; }
    else { x = -sw / 2 - r * Math.cos(a); y = -sh / 2 - r * Math.sin(a); nx = -Math.cos(a); ny = -Math.sin(a); }
    out.push({ x: cx + x, y: cy + y, z: 0, bx: nx * cb, by: ny * cb, bz: sb });
  }
  out.cerrado = true; return out;
}
function linea(x0, x1, y, t, amp = 0) {
  const out = [];
  for (let i = 0; i < N; i++) { const u = i / (N - 1); out.push({ x: lerp(x0, x1, u), y: y + Math.sin(u * 9 + t * 0.2) * amp * Math.sin(u * Math.PI), z: Math.sin(u * Math.PI) * 6, bx: 0, by: 0.94, bz: 0.34 }); }
  return out;
}
function mezcla(A, B, m, arco = 0, giro = 0) {
  const out = [], off = Math.round(giro * N);
  for (let i = 0; i < N; i++) {
    const a = A[i], b = B[(i + off + N) % N], u = i / (N - 1);
    let bx = lerp(a.bx, b.bx, m), by = lerp(a.by, b.by, m), bz = lerp(a.bz, b.bz, m); const n = Math.hypot(bx, by, bz) || 1;
    const lift = Math.sin(Math.PI * m) * arco;
    out.push({ x: lerp(a.x, b.x, m) + Math.sin(u * 6.28 + m * 3) * lift * 0.25, y: lerp(a.y, b.y, m) - lift * 0.3, z: lerp(a.z, b.z, m) + lift * Math.sin(u * Math.PI), bx: bx / n, by: by / n, bz: bz / n });
  }
  out.cerrado = m > 0.999 && B.cerrado; return out;
}
function cinta(pts, ancho, { sombra = 0.5, canto = 9, voltea = 0 } = {}) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], w = (typeof ancho === 'function' ? ancho(i / (n - 1)) : ancho) / 2;
    const pj = (x, y, z) => { const s = F / (F - z); return [540 + (x - 540) * s, 960 + (y - 960) * s]; };
    L.push(pj(p.x - p.bx * w, p.y - p.by * w, p.z - p.bz * w)); R.push(pj(p.x + p.bx * w, p.y + p.by * w, p.z + p.bz * w));
  }
  const quads = [], m = pts.cerrado ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n, a = pts[i], b = pts[j];
    let tx = b.x - a.x, ty = b.y - a.y, tz = b.z - a.z; const tl = Math.hypot(tx, ty, tz); if (tl < 1e-4) continue; tx /= tl; ty /= tl; tz /= tl;
    let nx = ty * a.bz - tz * a.by, ny = tz * a.bx - tx * a.bz, nz = tx * a.by - ty * a.bx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const back = nz < 0; if (back) { nx = -nx; ny = -ny; nz = -nz; }
    const d = Math.max(0, nx * LUZ[0] + ny * LUZ[1] + nz * LUZ[2]);
    const spec = Math.pow(d, 14) * 0.5;
    quads.push({ i, j, z: (a.z + b.z) / 2, lum: 0.5 + 0.62 * d + spec, back });
  }
  quads.sort((a, b) => a.z - b.z);
  const poly = (q, dx, dy) => { g.moveTo(L[q.i][0] + dx, L[q.i][1] + dy); g.lineTo(L[q.j][0] + dx, L[q.j][1] + dy); g.lineTo(R[q.j][0] + dx, R[q.j][1] + dy); g.lineTo(R[q.i][0] + dx, R[q.i][1] + dy); g.closePath(); };
  if (sombra > 0) { // sombra de contacto: una sola pasada desenfocada
    g.save(); g.filter = `blur(${16 * K}px)`; g.globalAlpha = sombra; g.fillStyle = '#080403'; g.beginPath(); for (const q of quads) poly(q, 12, 30); g.fill(); g.restore();
  }
  const rosa = [229, 168, 152], cara = [201, 139, 78], cantoC = [150, 92, 52];
  g.lineJoin = 'round';
  for (const q of quads) {
    if (canto > 0) { g.beginPath(); poly(q, 0, canto * 0.5); poly(q, 0, canto); g.fillStyle = rgb(cantoC, 0.55 + q.lum * 0.4); g.fill(); }
    const col = voltea > 0 ? rgb(rosa.map((v, k) => lerp(q.back ? cara[k] : v, v, voltea)), q.lum) : rgb(q.back ? cara : rosa, q.lum);
    g.beginPath(); poly(q, 0, 0); g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 0.9; g.fill(); g.stroke();
  }
  // filo de luz en un borde
  g.beginPath(); for (let i = 0; i < n; i++) { if (i === 0) g.moveTo(L[i][0], L[i][1]); else g.lineTo(L[i][0], L[i][1]); } if (pts.cerrado) g.closePath();
  g.strokeStyle = 'rgba(255,236,226,.55)'; g.lineWidth = 1.4; g.stroke();
}

// ---------- fotos como paneles de cristal ----------
function foto(img, x, y, w, h, r) { // dibuja la foto cubriendo el rectángulo (recorte centrado), con esquinas redondeadas
  const ar = w / h, ia = img.width / img.height; let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ia > ar) { sw = img.height * ar; sx = (img.width - sw) / 2; } else { sh = img.width / ar; sy = (img.height - sh) / 2; }
  g.save(); rr(x, y, w, h, r); g.clip(); g.drawImage(img, sx, sy, sw, sh, x, y, w, h); g.restore();
}
function panel(img, cx, cy, w, o = {}) {
  const h = o.h || w * img.height / img.width, s = o.s ?? 1, r = o.r ?? 30, th = o.th ?? 12, sh = o.sh ?? 1, mk = o.m || [1, 0, 0, 1];
  if (s <= 0.001) return;
  g.save(); g.translate(cx, cy); g.transform(mk[0], mk[1], mk[2], mk[3], 0, 0); g.scale(s * (o.sx ?? 1), s);
  g.save(); g.shadowColor = `rgba(4,2,1,${0.6})`; g.shadowBlur = (26 + 50 * sh) * K; g.shadowOffsetX = 14 * sh * K; g.shadowOffsetY = (10 + 36 * sh) * K; g.fillStyle = '#0d0706'; rr(-w / 2, -h / 2, w, h, r); g.fill(); g.restore();
  for (let i = th; i > 0; i -= 2) { g.fillStyle = i > th * 0.5 ? '#5d4034' : '#b79886'; rr(-w / 2 + i * 0.55, -h / 2 + i, w, h, r); g.fill(); }  // grosor del cristal
  cristal(() => rr(-w / 2, -h / 2, w, h, r), 'rgba(243,230,214,.30)');
  const pad = o.pad ?? 12;
  foto(img, -w / 2 + pad, -h / 2 + pad, w - 2 * pad, h - 2 * pad, Math.max(4, r - pad));
  // reflejo que cruza
  const rf = o.refl ?? 0.3;
  g.save(); rr(-w / 2, -h / 2, w, h, r); g.clip();
  const gx = lerp(-w * 1.2, w * 1.2, rf), gr = g.createLinearGradient(gx - 150, -h / 2, gx + 150, h / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,248,240,.26)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h);
  const top = g.createLinearGradient(0, -h / 2, 0, -h / 2 + 90); top.addColorStop(0, 'rgba(255,255,255,.16)'); top.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = top; g.fillRect(-w / 2, -h / 2, w, 90);
  g.restore();
  g.restore();
}
function logo(cx, cy, d) { // la silueta real, enmascarada en círculo
  if (d < 2) return;
  g.save(); g.beginPath(); g.arc(cx, cy, d / 2, 0, 7); g.clip(); g.drawImage(IMG.logo, cx - d / 2 * 1.012, cy - d / 2 * 1.012, d * 1.024, d * 1.024); g.restore();
  g.beginPath(); g.arc(cx, cy, d / 2, 0, 7); g.strokeStyle = 'rgba(74,42,28,.25)'; g.lineWidth = 1.2; g.stroke();
}

// ---------- kinetic type por glifo ----------
const medidas = new Map();
function glifos(txt, font, track) {
  const key = font + '|' + track + '|' + txt; if (medidas.has(key)) return medidas.get(key);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = font; const xs = []; let extra = 0;
  for (let i = 0; i < txt.length; i++) { xs.push(g.measureText(txt.slice(0, i)).width + extra); extra += track; }
  const w = g.measureText(txt).width + extra - track; g.restore();
  const m = { xs, w }; medidas.set(key, m); return m;
}
// estilos de entrada: sube (máscara), cae (capa que gira sobre su base), golpe (escala), fondo (viene de profundidad). Salida: se dobla.
function tipo(t, txt, x, y, size, o = {}) {
  const { en = 0, sale = 1e9, estilo = 'sube', fam = SERIF, peso = 800, color = C.crema, track = 0, st = 1.5, dur = 16, italic = false } = o;
  if (t < en || t > sale + 12 + txt.length) return;
  const font = `${italic ? 'italic ' : ''}${peso} ${size}px ${fam}`; const { xs, w } = glifos(txt, font, track);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  g.save(); g.font = font; g.fillStyle = color; g.textBaseline = 'alphabetic';
  if (estilo === 'golpe' || estilo === 'fondo') {
    const m = pr(t, en, en + (estilo === 'fondo' ? 20 : 11)), e = estilo === 'fondo' ? eOut5(m) : eBack(m), sc = estilo === 'fondo' ? lerp(5, 1, e) : lerp(1.9, 1, e);
    g.translate(x, y - size * 0.34); g.scale(sc, sc); g.translate(-x, -(y - size * 0.34));
  }
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i]; if (ch === ' ') continue;
    const gx = x0 + xs[i], a = pr(t, en + i * st, en + i * st + dur), b = pr(t, sale + i * 0.8, sale + i * 0.8 + 9);
    if (a <= 0 || b >= 1) continue;
    g.save();
    if (b > 0) { const yy = y - size * 0.72; g.translate(0, yy); g.scale(1, 1 - eIn(b)); g.translate(0, -yy); }
    if (estilo === 'sube') { g.beginPath(); g.rect(gx - size, y - size * 1.05, size * 3, size * 1.32); g.clip(); g.fillText(ch, gx, y + (1 - eOut5(a)) * size * 1.15); }
    else if (estilo === 'cae') { g.translate(0, y); g.scale(1, Math.max(0.001, eBack(a))); g.translate(0, -y); g.fillText(ch, gx, y); }
    else g.fillText(ch, gx, y);
    g.restore();
  }
  g.restore();
}

function frase(t, full, x, y, size, entradas, o = {}) {
  const font = () => `${o.peso ?? 800} ${size}px ${o.fam ?? SERIF}`; let m = glifos(full, font(), o.track ?? 0);
  if (o.maxw && m.w > o.maxw) { size = Math.floor(size * o.maxw / m.w); m = glifos(full, font(), o.track ?? 0); }
  let i = 0; full.split(' ').forEach((wd, k) => { const e = entradas[k]; tipo(t, wd, x - m.w / 2 + m.xs[i], y, size, { ...o, ...e, align: 'left' }); i += wd.length + 1; });
}

// ---------- la forma central: panel → círculo del logo → teléfono → círculo ----------
const TELF = { w: 560, h: 1150, r: 74 };
function telefono(t) { // posición y escala del teléfono
  return {
    cx: 540,
    cy: kf(t, [[360, 920], [386, 1070], [540, 1070], [566, 1100], [704, 1100], [728, 900]]),
    s: kf(t, [[360, 1], [386, 0.62], [540, 0.62], [566, 0.8], [704, 0.8], [728, 1]]),
  };
}
function forma(t) {
  if (t < 146) { const e = eOut5(pr(t, 120, 144)); return { cx: 540, cy: 1212 - 352 * e, w: 620, h: 705 * e, r: 36 }; }
  if (t < 170) { const e = eIO(pr(t, 146, 168)); return { cx: 540, cy: lerp(860, 880, e), w: lerp(620, 400, e), h: lerp(705, 400, e), r: lerp(36, 200, e) }; }
  if (t < 1026) { const e = eIO(pr(t, 170, 196)), p = telefono(t); return { cx: p.cx, cy: lerp(880, p.cy, e), w: lerp(400, TELF.w, e) * (t < 360 ? 1 : p.s), h: lerp(400, TELF.h, e) * (t < 360 ? 1 : p.s), r: lerp(200, TELF.r, e) * (t < 360 ? 1 : p.s), s: t < 360 ? 1 : p.s, abre: e }; }
  const e = eIO(pr(t, 1026, 1062)); return { cx: 540, cy: lerp(900, 820, e), w: lerp(TELF.w, 400, e), h: lerp(TELF.h, 400, e), r: lerp(TELF.r, 200, e), s: 1, abre: 1 - e, cierra: e };
}
const TILES = [['painsuisse', 'Hojaldres'], ['berlinesas', 'Berlinesas'], ['trianon', 'Pasteles']];
const tileX = (i) => -170 + i * 170;
const PASTELES = [['flan', 712], ['millefeuille', 806], ['trianon', 867]];
function contenidoTelefono(t, fm) { // la "página" dentro de la pantalla (coordenadas locales del teléfono)
  const s = fm.s || 1;
  g.save(); rr(fm.cx - fm.w / 2, fm.cy - fm.h / 2, fm.w, fm.h, fm.r); g.clip();
  g.translate(fm.cx, fm.cy); g.scale(s, s);
  const up = t < 1026 ? eIO(pr(t, 704, 728)) : 1;            // en "pasteles" la página se desplaza
  // encabezado: nombre de la página (el logo lo dibuja la capa de marca)
  if (t >= 198 && t < 1040) { const a = eOut5(pr(t, 198, 214)); g.save(); g.beginPath(); g.rect(-280, -400, 560, 70 * a); g.clip(); g.font = `italic 600 46px ${SERIF}`; g.fillStyle = C.crema; g.textAlign = 'center'; g.fillText('Maison Rose', 0, -350); g.restore();
    g.fillStyle = 'rgba(243,230,214,.16)'; g.fillRect(-230 * a, -318, 460 * a, 1.5); }
  // fila de categorías (llegan las tarjetas)
  g.save(); g.translate(0, -420 * up);
  if (t >= 352 && up < 1) for (let i = 0; i < 3; i++) { foto(IMG[TILES[i][0]], tileX(i) - 72, -280, 144, 164, 18); g.font = `600 19px ${SANS}`; g.fillStyle = C.crema; g.textAlign = 'center'; g.fillText(TILES[i][1], tileX(i), -88); }
  // chips de categorías
  const chips = ['HOJALDRES', 'BERLINESAS', 'PASTELES', 'GALLETAS'];
  if (t >= 546 && up < 1) chips.forEach((c, i) => {
    const a = eBack(pr(t, 546 + i * 12, 546 + i * 12 + 12)); if (a <= 0) return;
    const x = i % 2 ? 128 : -128, y = (i < 2 ? 0 : 92) - 20;
    g.save(); g.translate(x, y); g.scale(a, a);
    rr(-116, -34, 232, 68, 34); g.fillStyle = i === 3 ? 'rgba(229,168,152,.92)' : 'rgba(243,230,214,.13)'; g.fill(); g.strokeStyle = 'rgba(243,230,214,.5)'; g.lineWidth = 1.4; g.stroke();
    g.font = `700 24px ${SANS}`; g.fillStyle = i === 3 ? C.cacao : C.crema; g.textAlign = 'center'; g.fillText(c, 0, 9); g.restore();
  });
  // rejilla de productos bajo los chips
  if (t >= 566 && up < 1) { const a = eOut5(pr(t, 566, 590)); const gi = ['galleta_nueces', 'galletas_apiladas', 'hojaldres_fruta', 'conchas'];
    gi.forEach((n, i) => foto(IMG[n], (i % 2 ? 8 : -248), 150 + Math.floor(i / 2) * 250 + (1 - a) * 500, 240, 232, 20)); }
  g.restore();
  // pasteles: la foto gira sobre su eje y por la otra cara llega el siguiente
  if (t >= 706 && t < 1062) {
    let k = 0; for (let i = 0; i < 3; i++) if (t >= PASTELES[i][1] + (i ? 8 : 0)) k = i;
    let sx = 1; for (let i = 1; i < 3; i++) { const d = t - PASTELES[i][1]; if (d >= 0 && d < 16) sx = Math.abs(Math.cos(Math.PI * eIO(d / 16))); }
    const a = eOut5(pr(t, 706, 728)), w = 492, h = 540, y0 = -300 + (1 - a) * 900;
    g.save(); g.translate(0, y0 + h / 2); g.scale(Math.max(0.02, sx), 1); foto(IMG[PASTELES[k][0]], -w / 2, -h / 2, w, h, 26);
    const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, `rgba(27,18,16,${(1 - sx) * 0.7})`); gr.addColorStop(1, `rgba(255,240,230,${(1 - sx) * 0.25})`); rr(-w / 2, -h / 2, w, h, 26); g.fillStyle = gr; g.fill();
    g.restore();
  }
  g.restore();
}

// ---------- botón de WhatsApp ----------
function glifoWA(x, y, r, col) {
  g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = r * 0.17; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.arc(0, 0, r, 2.25, 2.25 + Math.PI * 1.86); g.lineTo(-r * 1.02, r * 1.02); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(-r * 0.42, -r * 0.36); g.quadraticCurveTo(-r * 0.3, r * 0.42, r * 0.44, r * 0.46); g.lineWidth = r * 0.3; g.stroke();
  g.restore();
}
function boton(t) {
  if (t < S.wa || t > 1046) return;
  const a = eOut5(pr(t, 900, 922)), z = eIO(pr(t, 1022, 1044));
  const d = t - 1002, press = d >= 0 && d < 14 ? Math.sin(Math.PI * d / 14) : 0;
  const w = lerp(120, 820, a) * (1 - z), h = lerp(6, 150, a) * (1 - z * 0.96), cy = 1270 + press * 5;
  if (w < 4) return;
  g.save(); g.translate(540, cy); g.scale(1 - press * 0.035, 1 - press * 0.035);
  g.save(); g.shadowColor = 'rgba(4,2,1,.65)'; g.shadowBlur = 60 * K; g.shadowOffsetY = 34 * K * (1 - press * 0.6); g.fillStyle = '#0d0706'; rr(-w / 2, -h / 2, w, h, h / 2); g.fill(); g.restore();
  for (let i = 10; i > 0; i -= 2) { g.fillStyle = i > 5 ? '#5d4034' : '#b79886'; rr(-w / 2 + i * 0.3, -h / 2 + i * (1 - press * 0.7), w, h, h / 2); g.fill(); }
  cristal(() => rr(-w / 2, -h / 2, w, h, h / 2), 'rgba(243,230,214,.20)', 'rgba(255,244,236,.7)');
  g.save(); rr(-w / 2, -h / 2, w, h, h / 2); g.clip();
  const top = g.createLinearGradient(0, -h / 2, 0, h / 2); top.addColorStop(0, 'rgba(255,255,255,.22)'); top.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = top; g.fillRect(-w / 2, -h / 2, w, h);
  if (d >= 0 && d < 26) { const m = d / 26; g.beginPath(); g.arc(120, 0, 30 + eOut(m) * 420, 0, 7); g.fillStyle = `rgba(255,244,236,${0.22 * (1 - m)})`; g.fill(); }
  if (a > 0.9 && z === 0) {
    const ia = eBack(pr(t, 918, 932)); if (ia > 0) { g.save(); g.translate(-316, 0); g.scale(ia, ia); glifoWA(0, 0, 30, C.crema); g.restore(); }
  }
  g.restore(); g.restore();
  if (z === 0) { // cada palabra entra con su palabra de la voz
    const f = `700 50px ${SANS}`, full = 'PIDE POR WHATSAPP', m = glifos(full, f, 2), x0 = 540 - m.w / 2 + 44;
    [['PIDE', 0, wf('L6', 0)], ['POR', 5, wf('L6', 1)], ['WHATSAPP', 9, wf('L6', 2)]].forEach(([wd, i, en]) => tipo(t, wd, x0 + m.xs[i], cy + 18, 50, { en, fam: SANS, peso: 700, track: 2, align: 'left', st: 1.2, dur: 12 }));
  }
}

// ---------- escenas ----------
const CARDS = [
  { img: 'painsuisse', x: 232, y: 650, w: 350, m: [0.9, 0.26, 0, 1], en: 198, de: [-520, -620], lab: 'HOJALDRES', lx: 250, ly: 950 },
  { img: 'berlinesas', x: 852, y: 940, w: 340, m: [0.9, -0.26, 0, 1], en: 240, de: [560, -300], lab: 'BERLINESAS', lx: 800, ly: 1200 },
  { img: 'trianon', x: 250, y: 1260, w: 330, m: [0.9, 0.26, 0, 1], en: 300, de: [-560, 420], lab: 'PASTELES', lx: 262, ly: 1535 },
];
function tarjetas(t) {
  if (t < 198 || t >= 352) return;
  CARDS.forEach((c, i) => {
    if (t < c.en - 10) return;
    const img = IMG[c.img], h0 = c.w * img.height / img.width, a = pr(t, c.en - 10, c.en), e = eIn(a), fly = eIO(pr(t, 326 + i * 5, 348 + i * 2));
    const set = eOut(pr(t, c.en, c.en + 8));
    const tx = 540 + tileX(i), ty = 920 - 280 + 82;
    const x = lerp(lerp(c.x + c.de[0], c.x, e), tx, fly), y = lerp(lerp(c.y + c.de[1], c.y, e), ty, fly);
    const m = c.m.map((v, k) => lerp(v, [1, 0, 0, 1][k], fly));
    const w = lerp(c.w, 144, fly), h = lerp(h0, 164, fly);
    panel(img, x, y, w, { h, m, s: lerp(1.7, 1, e) * (1 + 0.05 * Math.sin(Math.PI * set) * (a >= 1 ? 1 : 0)), sh: lerp(2.2, 1, set) * (1 - fly * 0.8), r: lerp(30, 18, fly), th: lerp(14, 2, fly), pad: lerp(12, 0, fly), refl: pr(t, c.en, c.en + 40) });
    tipo(t, c.lab, c.lx, c.ly, 64, { en: c.en + 2, sale: 322 + i * 2, estilo: i === 1 ? 'cae' : 'sube', dur: 14 });
  });
}
const GAL = [
  { img: 'galleta_nueces', x: 690, y: 1010, w: 440, en: 360, d: 1.0 },
  { img: 'galletas_apiladas', x: 300, y: 1290, w: 380, en: 384, d: 1.5 },
  { img: 'galleta_partida', x: 800, y: 1400, w: 320, en: 408, d: 2.0 },
];
function galletas(t) {
  if (t < 360 || t > 566) return;
  GAL.forEach((p, i) => {
    const a = eOut5(pr(t, p.en, p.en + 26)), z = eIn(pr(t, 522 + i * 5, 546 + i * 5)); if (a <= 0) return;
    const x = lerp(1500 + i * 120, p.x, a) - (t - 360) * 0.16 * p.d - z * 1500, y = p.y + Math.sin(t * 0.03 + i * 2) * 6;
    panel(IMG[p.img], x, y, p.w, { m: [1, lerp(0.14, 0.035, a) * (i % 2 ? -1 : 1), 0, 1], sh: 1 + (1 - a) * 1.2, refl: pr(t, p.en + 4, p.en + 60) });
  });
  tipo(t, 'OCHO', 540, 470, 250, { en: wf('L3', 0), sale: 430, estilo: 'fondo', st: 0.6 });
  tipo(t, 'SABORES', 540, 640, 150, { en: wf('L3', 1), sale: 432, estilo: 'cae' });
  tipo(t, 'GALLETAS', 540, 470, 168, { en: Math.max(444, wf('L3', 3) + 30), sale: 520, estilo: 'golpe', st: 0.5 });
  frase(t, 'RECIÉN HORNEADAS', 540, 610, 92, [{ en: wf('L3', 4), sale: 522 }, { en: wf('L3', 5), sale: 524 }], { color: C.rosa, maxw: 940 });
}
const MURO = [['millefeuille', 150, 800, 1], ['flan', 930, 860, -1], ['hojaldres_fruta', 160, 1350, 1], ['conchas', 925, 1400, -1]];
function muro(t) { // detrás del teléfono
  if (t < 540 || t > 728) return;
  MURO.forEach(([n, x, y, sgn], i) => {
    const a = eBack(pr(t, 542 + i * 8, 566 + i * 8)), z = eIn(pr(t, 700 + i * 3, 722 + i * 3)), k = a * (1 - z); if (k <= 0) return;
    const th = t * 0.022 + i * 1.6;
    panel(IMG[n], lerp(540, x + Math.cos(th) * 20, k), lerp(1100, y + Math.sin(th) * 14, k), 290, { h: 320, m: [0.9, 0.24 * sgn, 0, 1], s: lerp(0.3, 1, k), refl: (t - 540) / 170 + i * 0.2 });
  });
}
function tipoMuro(t) {
  frase(t, 'TU PROPIA', 540, 400, 118, [{ en: wf('L4', 4), sale: 704 }, { en: wf('L4', 5), sale: 706 }]);
  tipo(t, 'PÁGINA', 540, 570, 178, { en: wf('L4', 6), sale: 708, estilo: 'golpe', st: 0.5, color: C.rosa });
}
function tipoPasteles(t) {
  frase(t, 'FLAN PARISINO', 540, 1300, 104, [{ en: wf('L5', 0), sale: 800 }, { en: wf('L5', 1), sale: 802 }], { estilo: 'cae', maxw: 960 });
  frase(t, 'MILLE-FEUILLE', 540, 1300, 104, [{ en: wf('L5', 2), sale: 862 }], { maxw: 960 });
  tipo(t, 'TRIANON', 540, 1300, 128, { en: wf('L5', 3), sale: 896, estilo: 'golpe', st: 0.5 });
}

// la cinta según el momento
function cintaEnT(t) {
  const m0 = PL.marks, cy = kf(t, [[120, 960], [146, 1380]]), sc = kf(t, [[120, 1.5], [146, 1]]);
  if (t < 146) {
    // la punta cruza la pantalla en el golpe y deja una capa por tiempo
    const head = kf(t, [[0, m0[0] - 120], [13, m0[1] - 30], [30, m0[1] + 330], [60, m0[2]], [90, m0[3]], [112, m0[4]]], (x) => eIO(x));
    const tail = kf(t, [[92, 0], [118, m0[0] - 40]], eIO);
    return { pts: pila(tail, Math.max(tail + 2, head), 540, cy, sc), w: 190 * sc, sombra: 0.55, canto: 10 };
  }
  const A = pila(m0[0] - 40, PL.total, 540, 1380, 1), fm = forma(t);
  if (t < 172) { const m = eIO(pr(t, 146, 170)); return { pts: mezcla(A, marco(fm.cx, fm.cy, fm.w + 34, fm.h + 34, fm.r + 17), m, 260, 0), w: lerp(190, 30, m), sombra: 0.5, canto: lerp(10, 7, m), voltea: m }; }
  const M = marco(fm.cx, fm.cy, fm.w + 34, fm.h + 34, fm.r + 17);
  const pulso = [960, 990].reduce((a, f) => { const d = t - f; return d >= 0 && d < 12 ? a + Math.sin(Math.PI * d / 12) : a; }, 0);
  const U = linea(250, 830, 1392, t, 3);
  if (t < 934) return { pts: M, w: 30 * (fm.s || 1), sombra: 0.45, canto: 7, voltea: 1 };
  if (t < 1024) { const m = eIO(pr(t, 940, 958)); return { pts: mezcla(M, U, m, 220, 0.5), w: lerp(30, 18, m) * (1 + pulso * 0.55), sombra: 0.5, canto: 6, voltea: 1 }; }
  const m = eIO(pr(t, 1024, 1060)); return { pts: mezcla(U, M, m, 240, 0.5), w: lerp(18, 30, m), sombra: 0.45, canto: 7, voltea: 1 };
}

function endcard(t) {
  if (t < 1192) return;
  const e = eIO(pr(t, 1192, 1216)), xb = lerp(-520, 1700, e), sl = 0.22;
  g.setTransform(K, 0, 0, K, 0, 0);
  g.save(); g.beginPath(); g.moveTo(-10, -10); g.lineTo(xb + DH * sl + 10, -10); g.lineTo(xb + 10, DH + 10); g.lineTo(-10, DH + 10); g.closePath(); g.clip();
  g.fillStyle = C.cacao; g.fillRect(0, 0, DW, DH);
  const gr = g.createRadialGradient(540, 820, 0, 540, 820, 900); gr.addColorStop(0, 'rgba(74,42,28,.75)'); gr.addColorStop(1, 'rgba(74,42,28,0)'); g.fillStyle = gr; g.fillRect(0, 0, DW, DH);
  const en = 1208;
  tipo(t, 'Precios accesibles', 540, 700, 82, { en, st: 0.7, dur: 14, peso: 600 });
  tipo(t, 'desde $1,000 pesos', 540, 808, 82, { en: en + 6, st: 0.7, dur: 14, peso: 800, color: C.rosa });
  tipo(t, 'por tu página', 540, 916, 82, { en: en + 12, st: 0.7, dur: 14, peso: 600 });
  const b = eOut5(pr(t, en + 16, en + 34)); g.fillStyle = C.caramelo; rr(540 - 70 * b, 990, 140 * b, 6, 3); g.fill();
  tipo(t, 'Paquete de 3 videos promocionales: $1,500', 540, 1090, 40, { en: en + 20, fam: SANS, peso: 600, st: 0.35, dur: 12 });
  tipo(t, 'Elevate Negocios · Aguascalientes', 540, 1262, 38, { en: en + 30, fam: SANS, peso: 700, st: 0.35, dur: 12, track: 1 });
  tipo(t, 'Demo de cortesía de Elevate Negocios · pieza no oficial', 540, 1330, 27, { en: en + 38, fam: SANS, peso: 500, st: 0.25, dur: 12, color: 'rgba(243,230,214,.7)' });
  g.restore();
  if (e < 1) { // el último doblez: una banda de cinta que barre el cuadro
    const bw = 300;
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 60 * K; g.shadowOffsetX = -30 * K;
    const band = (x0, x1, fill) => { g.beginPath(); g.moveTo(x0 + DH * sl, -10); g.lineTo(x1 + DH * sl, -10); g.lineTo(x1, DH + 10); g.lineTo(x0, DH + 10); g.closePath(); g.fillStyle = fill; g.fill(); };
    const gg = g.createLinearGradient(xb, 0, xb + bw + DH * sl, 0); gg.addColorStop(0, '#b9713f'); gg.addColorStop(0.18, '#E5A898'); gg.addColorStop(0.55, '#f3c9bb'); gg.addColorStop(1, '#c88f7f');
    band(xb, xb + bw, gg); g.restore(); band(xb - 16, xb, '#96603a');
  }
}

function draw(t) {
  fondo(t);
  camara(t);
  const fm = forma(t), enTel = t >= 170 && t < 1062;
  muro(t);
  // texto de los pliegues, detrás de la cinta
  tipo(t, 'CADA', 540, 430, 150, { en: wf('L1', 0), sale: 112, estilo: 'sube' });
  tipo(t, 'PLIEGUE', 540, 580, 150, { en: wf('L1', 1), sale: 114, estilo: 'cae', color: C.rosa });
  tipo(t, 'CUENTA', 540, 1420, 176, { en: wf('L1', 2), sale: 116, estilo: 'golpe', st: 0.5 });
  const ct = cintaEnT(t);
  if (t < 172) cinta(ct.pts, ct.w, ct);
  // forma central
  if (t >= 120) {
    snap(34);
    const path = () => rr(fm.cx - fm.w / 2, fm.cy - fm.h / 2, fm.w, fm.h, fm.r);
    if (fm.h > 4) {
      g.save(); g.shadowColor = 'rgba(4,2,1,.7)'; g.shadowBlur = 80 * K; g.shadowOffsetY = 44 * K; g.shadowOffsetX = 16 * K; g.fillStyle = '#0d0706'; path(); g.fill(); g.restore();
      for (let i = 14; i > 0; i -= 2) { g.fillStyle = i > 7 ? '#4b3229' : '#a58676'; rr(fm.cx - fm.w / 2 + i * 0.5, fm.cy - fm.h / 2 + i, fm.w, fm.h, fm.r); g.fill(); }
      cristal(path, t < 170 ? 'rgba(243,230,214,.28)' : `rgba(27,18,16,${lerp(0.25, 0.6, fm.abre ?? 0)})`);
      if (t < 176) { // la galleta partida y, por máscara circular, la silueta real
        g.save(); path(); g.clip(); foto(IMG.galleta_partida, fm.cx - fm.w / 2 + 12, fm.cy - fm.h / 2 + 12, fm.w - 24, Math.max(1, (fm.w - 24) * 705 / 620), fm.r - 12); g.restore();
        const ir = eIO(pr(t, 154, 172)) * 215;
        if (ir > 0) { g.save(); g.beginPath(); g.arc(fm.cx, fm.cy, ir, 0, 7); g.clip(); g.fillStyle = '#fff'; g.fillRect(fm.cx - 220, fm.cy - 220, 440, 440); logo(fm.cx, fm.cy, 400); g.restore(); }
      }
      if (enTel) contenidoTelefono(t, fm);
      // marca: la silueta va del centro al encabezado de la página y regresa en el cierre
      if (t >= 172) { const a = fm.abre ?? 0, s = fm.s || 1; logo(fm.cx, fm.cy - 445 * s * a + (t >= 1026 ? 0 : 0), lerp(400, 116 * s, a)); }
      // reflejo del cristal
      g.save(); path(); g.clip(); const rf = (t % 400) / 400, gx = lerp(fm.cx - fm.w * 1.3, fm.cx + fm.w * 1.3, rf);
      const gr = g.createLinearGradient(gx - 120, fm.cy - fm.h / 2, gx + 120, fm.cy + fm.h / 2); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,248,240,.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(fm.cx - fm.w / 2, fm.cy - fm.h / 2, fm.w, fm.h); g.restore();
    }
  }
  if (t >= 172) cinta(ct.pts, ct.w, ct);
  if (t >= 198 && t < 566) { snap(30); tarjetas(t); galletas(t); }
  tipoMuro(t); tipoPasteles(t);
  if (t >= S.wa && t < 1046) { snap(30); boton(t); }
  // cierre
  if (t >= 1040 && t < 1216) {
    const a = pr(t, wf('L7', 0), wf('L7', 1) + 26);
    g.save(); g.beginPath(); g.rect(0, 1040, 1080 * eIO(a), 300); g.clip(); g.font = `400 156px ${SCRIPT}`; g.fillStyle = C.crema; g.textAlign = 'center'; g.fillText('Maison Rose', 540, 1240); g.restore();
    tipo(t, 'SAN JERÓNIMO', 540, 1356, 46, { en: wf('L7', 2), fam: SANS, peso: 600, track: 14, st: 2, dur: 14, color: C.rosa });
  }
  endcard(t);
  // grano fino y viñeta
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 0.035; g.globalCompositeOperation = 'overlay'; g.fillStyle = noise; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// supermuestreo temporal: promedio de `sub` subcuadros dentro del obturador
window.renderFrame = (f, { sub = 8, shutter = 0.5 } = {}) => {
  for (let i = 0; i < sub; i++) {
    const t = Math.max(0, f + ((i + 0.5) / sub - 0.5) * 2 * shutter);
    draw(t);
    ag.globalAlpha = 1 / (i + 1); ag.drawImage(cv, 0, 0);
  }
  ag.globalAlpha = 1; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(acv, 0, 0);
  return cv.toDataURL('image/png');
};

(async () => {
  try {
    const fonts = [[SERIF, 'playfair-display-latin-800-normal.woff2', { weight: '800' }], [SERIF, 'playfair-display-latin-600-normal.woff2', { weight: '600' }], [SERIF, 'playfair-display-latin-600-italic.woff2', { weight: '600', style: 'italic' }],
      [SANS, 'dm-sans-latin-500-normal.woff2', { weight: '500' }], [SANS, 'dm-sans-latin-600-normal.woff2', { weight: '600' }], [SANS, 'dm-sans-latin-700-normal.woff2', { weight: '700' }], [SCRIPT, 'parisienne-latin-400-normal.woff2', { weight: '400' }]];
    for (const [fam, file, d] of fonts) { const ff = new FontFace(fam, `url(/web/fonts/${file})`, d); await ff.load(); document.fonts.add(ff); }
    TL = await (await fetch('/brief/timeline.json')).json();
    const names = ['logo', 'galleta_nueces', 'galleta_partida', 'trianon', 'millefeuille', 'flan', 'painsuisse', 'berlinesas', 'conchas', 'hojaldres_fruta', 'galletas_apiladas'];
    await Promise.all(names.map(async (n) => { const im = new Image(); im.src = `/assets/recortes/${n}.jpg`; await im.decode(); IMG[n] = im; }));
    makeNoise();
    window.ready = true;
  } catch (e) { window.initError = String(e && e.stack || e); }
})();
