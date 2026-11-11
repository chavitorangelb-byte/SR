// Claudia Repostería Casera · "El vuelo"
// Función determinista frame(f): todo el cuadro sale del número de cuadro (60 fps, admite fracciones para el motion blur).
// Un solo campo de línea (SDF en WebGL) y una sola cámara para todas las escenas.
const $ = (s) => document.querySelector(s);
const FPS = 60, DW = 1080, DH = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (f, a, b) => clamp((f - a) / (b - a));
const eOut = (u) => 1 - Math.pow(1 - u, 3);
const eIn = (u) => u * u * u;
const eIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eExpo = (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const noise1 = (x) => { const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
// resorte subamortiguado 0→1 (t en segundos)
function spring(t, k = 170, c = 16) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k), z = c / (2 * w0);
  if (z >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
}
// keyframes: [[f, v, ease?], ...] (ease aplica al tramo que LLEGA a ese punto)
function kf(f, ks) {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (f <= ks[i][0]) { const u = (f - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0]); return lerp(ks[i - 1][1], ks[i][1], (ks[i][2] || eIO)(u)); }
  }
  return ks[ks.length - 1][1];
}

// ---------- geometría del celular (px de lienzo) ----------
const PH = { x: 134, y: 224, w: 812, h: 1432, cx: 540, cy: 940, sx: 150, sy: 240, sw: 780, sh: 1400 };
const HEADER = 64, VH = 700;

// ---------- línea dorada: un solo campo SDF ----------
const lineCv = $('#line');
const gl = lineCv.getContext('webgl2', { premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
const NP = 24;
const FS = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;
uniform vec2 uP[${NP}];
uniform int uN;
uniform float uTLen, uTTh, uTOn;
uniform vec4 uA, uA2, uB, uB2;   // (cx,cy,hw,hh) y (radio, grosor, revelado, solidez)
uniform float uGlow, uCrawl;
float smin(float a, float b, float k){ float h = clamp(.5 + .5*(b-a)/k, 0., 1.); return mix(b, a, h) - k*h*(1.-h); }
float sdRR(vec2 q, vec2 b, float r){ vec2 d = abs(q) - b + r; return length(max(d,0.)) + min(max(d.x,d.y),0.) - r; }
// longitud de arco sobre el perímetro, medida desde el punto medio del lado derecho hacia ambos lados (0..2Lq)
float perim(vec2 q, vec2 b, float r, out float Lq){
  vec2 a = abs(q); vec2 c = b - r; float s;
  Lq = c.y + c.x + 1.5707963*r;
  if (a.x > c.x && a.y > c.y) { float ang = atan(a.y - c.y, a.x - c.x); s = c.y + r*ang; }
  else if (a.x - c.x > a.y - c.y) s = min(a.y, c.y);
  else s = c.y + 1.5707963*r + (c.x - min(a.x, c.x));
  return q.x >= 0. ? s : 2.*Lq - s;
}
float dots(float s, float dPerp, float th, float solid, float sp){
  float local = (fract(s/sp) - .5)*sp;
  float hl = sp*.5*solid;
  return length(vec2(max(abs(local) - hl, 0.), dPerp)) - th;
}
float shape(vec2 p, vec4 A, vec4 A2){
  if (A2.y <= 0.) return 1e4;
  vec2 q = p - A.xy; float Lq;
  float d = abs(sdRR(q, A.zw, A2.x));
  float s = perim(q, A.zw, min(A2.x, min(A.z, A.w)), Lq);
  float lim = A2.z*2.*Lq;
  float over = max(s - lim, 0.);
  float dp = length(vec2(d, over));
  if (A2.w >= .999) return dp - A2.y;
  return dots(min(s, lim) + uCrawl, dp, A2.y, A2.w, 26.);
}
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (1080./uRes.x);
  float dT = 1e4;
  if (uTOn > 0.) {
    float best = 1e9, sBest = 0., acc = 0.;
    for (int i = 0; i < ${NP - 1}; i++) {
      if (i >= uN - 1) break;
      vec2 a = uP[i], b = uP[i+1]; vec2 pa = p - a, ba = b - a; float L = max(length(ba), 1e-4);
      float h = clamp(dot(pa,ba)/(L*L), 0., 1.); float d = length(pa - ba*h);
      if (d < best) { best = d; sBest = acc + h*L; }
      acc += L;
    }
    float u = sBest / max(uTLen, 1.);
    float th = uTTh * mix(.22, 1., smoothstep(0., .65, u));
    float solid = smoothstep(.2, .7, u);
    dT = dots(sBest, best, th, solid, 24.);
  }
  float dA = shape(p, uA, uA2), dB = shape(p, uB, uB2);
  float d = smin(smin(dT, dA, 9.), dB, 9.);
  float a = smoothstep(.9, -.9, d);
  vec2 n = normalize(vec2(dFdx(d), -dFdy(d)) + 1e-6);
  float lit = dot(n, normalize(vec2(-.55, -.83)));
  float prof = clamp(-d/3.5, 0., 1.);
  vec3 col = mix(vec3(.70,.47,.09), vec3(.955,.77,.25), .55 + .45*lit);
  col = mix(col, vec3(.98,.80,.28), prof*.55);
  col += vec3(1.,.95,.74) * pow(max(lit,0.), 2.5) * .5 * (1. - prof);
  col *= 1. + uGlow*.5;
  float g = exp(-max(d,0.)/(13. + 26.*uGlow)) * (.16 + .5*uGlow) * (1. - a);
  o = vec4(col*a + vec3(1.,.70,.22)*g, a);
}`;
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.bindAttribLocation(prog, 0, 'p'); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const U = (n) => gl.getUniformLocation(prog, n);
function drawLine(L) {
  gl.viewport(0, 0, lineCv.width, lineCv.height);
  gl.uniform2f(U('uRes'), lineCv.width, lineCv.height);
  const pts = new Float32Array(NP * 2); let len = 0;
  const n = L.trail ? Math.min(NP, L.trail.length) : 0;
  for (let i = 0; i < n; i++) { pts[i * 2] = L.trail[i][0]; pts[i * 2 + 1] = L.trail[i][1]; if (i) len += Math.hypot(L.trail[i][0] - L.trail[i - 1][0], L.trail[i][1] - L.trail[i - 1][1]); }
  gl.uniform2fv(U('uP[0]'), pts); gl.uniform1i(U('uN'), n); gl.uniform1f(U('uTLen'), len); gl.uniform1f(U('uTTh'), L.trailTh || 0); gl.uniform1f(U('uTOn'), n > 1 ? 1 : 0);
  const S = (name, s) => { gl.uniform4f(U(name), s ? s.cx : 0, s ? s.cy : 0, s ? s.hw : 1, s ? s.hh : 1); gl.uniform4f(U(name + '2'), s ? Math.min(s.r, s.hw, s.hh) : 0, s ? s.th : 0, s ? s.rev : 0, s ? s.solid : 1); };
  S('uA', L.A); S('uB', L.B);
  gl.uniform1f(U('uGlow'), L.glow || 0); gl.uniform1f(U('uCrawl'), L.crawl || 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ---------- partículas (2.5D: lejos, medio, cerca) ----------
const P = { far: $('#pFar').getContext('2d'), mid: $('#pMid').getContext('2d'), near: $('#pNear').getContext('2d') };
const AMB = [];
for (let i = 0; i < 150; i++) AMB.push({ x: hash(i * 3.1) * 1300 - 110, y: hash(i * 7.7) * 2100, r: 0.8 + hash(i * 1.3) * 2.2, sp: 0.25 + hash(i * 5.9) * 0.9, ph: hash(i * 2.2) * 6.28, layer: i % 5 === 0 ? 'near' : i % 2 ? 'far' : 'mid', oro: hash(i * 9.1) > 0.72 });
const SPR = {}; for (const [k, col] of [['oro', '242,194,60'], ['crema', '255,244,220']]) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(0.35, `rgba(${col},.55)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(0, 0, 64, 64); SPR[k] = c; }
const BURSTS = []; // {f, x, y, n, tipo}
function burst(f, x, y, n, tipo = 'oro', fuerza = 1) { BURSTS.push({ f, x, y, n, tipo, fuerza, seed: BURSTS.length * 37.7 }); }
function drawParticles(f, cam) {
  for (const k in P) P[k].clearRect(0, 0, DW, DH);
  for (const a of AMB) {
    const c = P[a.layer], par = a.layer === 'far' ? 0.45 : a.layer === 'mid' ? 1 : 1.7;
    const y = ((a.y + f * a.sp * (a.layer === 'near' ? 1.6 : 0.8)) % 2100) - 90 - (cam.y - 960) * par * 0.4;
    const x = a.x + Math.sin(f * 0.012 * a.sp + a.ph) * 26 - (cam.x - 540) * par * 0.4;
    const tw = 0.55 + 0.45 * Math.sin(f * 0.05 * a.sp + a.ph * 3);
    const r = a.r * (a.layer === 'near' ? 4.6 : a.layer === 'far' ? 1.5 : 1) * (0.9 + 0.1 * cam.z);
    c.globalAlpha = (a.oro ? 0.5 : 0.34) * tw * (a.layer === 'near' ? 0.42 : 1);
    if (a.layer === 'mid') { c.fillStyle = a.oro ? '#F2C23C' : '#FFF4DC'; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); }
    else { const R2 = r * (a.layer === 'near' ? 4.2 : 3); c.drawImage(SPR[a.oro ? 'oro' : 'crema'], x - R2, y - R2, R2 * 2, R2 * 2); }
  }
  const c = P.mid;
  for (let i = 0; i < 150; i++) { // azúcar glas que cae en el respiro (f716–f880)
    const t = (f - 716 - hash(i * 3.3) * 70) / FPS; if (t < 0) continue;
    const y = -40 + t * (300 + hash(i * 6.1) * 420) + 90 * t * t, x = hash(i * 1.9) * 1080 + Math.sin(t * 2.2 + i) * 24;
    if (y > 2000) continue;
    c.globalAlpha = (0.35 + hash(i * 4.4) * 0.5) * (1 - seg(f, 850, 885)); const r = 3 + hash(i * 8.2) * 7;
    c.drawImage(SPR.crema, x - r, y - r, r * 2, r * 2);
  }
  for (const b of BURSTS) {
    const t = (f - b.f) / FPS; if (t < 0 || t > 1.6) continue;
    for (let i = 0; i < b.n; i++) {
      const h1 = hash(b.seed + i * 1.7), h2 = hash(b.seed + i * 4.3), h3 = hash(b.seed + i * 8.9);
      const ang = h1 * 6.283, v = (160 + h2 * 620) * b.fuerza, life = 0.5 + h3 * 1.0;
      if (t > life) continue;
      const drag = 1 - Math.exp(-3.2 * t);
      const x = b.x + Math.cos(ang) * v * drag / 3.2, y = b.y + Math.sin(ang) * v * drag / 3.2 + 520 * t * t * (b.tipo === 'migas' ? 1.5 : 0.5);
      const al = 1 - t / life;
      if (b.tipo === 'migas') { c.globalAlpha = al; c.fillStyle = h3 > 0.5 ? '#C99A4A' : '#8A5A2B'; c.save(); c.translate(x, y); c.rotate(ang + t * 9 * (h2 - 0.5)); c.fillRect(-3 - h2 * 4, -2 - h1 * 3, 6 + h2 * 8, 4 + h1 * 5); c.restore(); }
      else if (b.tipo === 'azucar') { c.globalAlpha = al * 0.9; c.fillStyle = '#FFF9EC'; c.beginPath(); c.arc(x, y, 1.2 + h3 * 2.4, 0, 6.283); c.fill(); }
      else { // brillo dorado de 4 puntas
        const s = (3 + h3 * 9) * al; c.globalAlpha = al; c.fillStyle = h2 > 0.4 ? '#FFE49A' : '#F2C23C';
        c.beginPath(); c.moveTo(x, y - s * 2.2); c.quadraticCurveTo(x, y, x + s * 2.2, y); c.quadraticCurveTo(x, y, x, y + s * 2.2); c.quadraticCurveTo(x, y, x - s * 2.2, y); c.quadraticCurveTo(x, y, x, y - s * 2.2); c.fill();
      }
    }
  }
  for (const k in P) P[k].globalAlpha = 1;
}

// El grano fino (2 %) se aplica por cuadro de salida en ffmpeg (ver render.mjs).
const ruido = (() => { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); const im = x.createImageData(96, 96); for (let i = 0; i < im.data.length; i += 4) { const v = hash(i * 0.37) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 26; } x.putImageData(im, 0, 0); return `url(${c.toDataURL()})`; })();
document.documentElement.style.setProperty('--ruido', ruido);

// ---------- kinetic type ----------
const KT = [];
// {id, texto, f, fin, x, y (centro), size, maxW, tipo, cls, placa, rot}
function palabra(o) { o.imp = o.imp ?? 5;
  const el = document.createElement('div'); el.className = 'kw ' + (o.cls || '');
  if (o.placa) { const p = document.createElement('div'); p.className = 'placa'; el.appendChild(p); }
  const t = document.createElement('span'); t.className = 'txt'; el.appendChild(t);
  o.gl = [...o.texto].map((ch) => { const g = document.createElement('span'); g.className = 'g'; g.textContent = ch === ' ' ? ' ' : ch; t.appendChild(g); return g; });
  el.style.fontSize = o.size + 'px'; $('#kt').appendChild(el);
  let w = el.getBoundingClientRect().width / window.__dsfFix;
  if (o.maxW && w > o.maxW) { o.size = Math.floor(o.size * o.maxW / w); el.style.fontSize = o.size + 'px'; w = el.getBoundingClientRect().width / window.__dsfFix; }
  o.w = w; o.h = o.size; o.el = el; KT.push(o); return o;
}
function drawKT(f) {
  for (const o of KT) {
    const t = (f - o.f) / FPS, out = seg(f, o.fin, o.fin + 14);
    if (t < -0.02 || out >= 1) { o.el.style.display = 'none'; continue; }
    o.el.style.display = '';
    let tx = o.x - o.w / 2, ty = o.y - o.h / 2, sc = 1, rot = o.rot || 0, op = 1;
    const n = o.gl.length, stg = o.stg || 0.028;
    // sacudida de 2 cuadros en el impacto
    const imp = o.imp ?? 5; const k = f - (o.f + imp);
    if (k >= 0 && k < 2 && (o.tipo === 'golpe' || o.tipo === 'estampa')) { tx += (k < 1 ? 9 : -6); ty += (k < 1 ? -7 : 5); }
    if (o.tipo === 'estampa') { const u = eIn(seg(f, o.f, o.f + imp)); sc = lerp(2.3, 1, u) * (1 + 0.06 * Math.exp(-Math.max(0, t - imp / 60) * 16) * Math.cos(Math.max(0, t - imp / 60) * 38)); rot += lerp(-9, 0, u); op = seg(f, o.f, o.f + 2); }
    if (o.tipo === 'desliza') { const u = eExpo(seg(f, o.f, o.f + 22)); tx += lerp(-900 * (o.dir || 1), 0, u); op = seg(f, o.f, o.f + 3); }
    if (out > 0) { const u = eIn(out); ty -= u * 90; op *= 1 - u; sc *= 1 - 0.06 * u; }
    o.el.style.opacity = op;
    o.el.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sc})`;
    for (let i = 0; i < n; i++) {
      const g = o.gl[i], tg = t - i * stg; let s = '', go = 1;
      if (o.tipo === 'golpe') { // escala 140→100 % con squash
        const u = spring(tg, 420, 22); const e = lerp(1.4, 1, u); const sq = 0.16 * Math.exp(-Math.max(0, tg) * 13) * Math.sin(Math.max(0, tg) * 30);
        s = `scale(${e * (1 + sq)},${e * (1 - sq)})`; go = clamp(tg * 60 / 2);
      } else if (o.tipo === 'rebote') { // cae y rebota
        const u = Math.max(0, tg); const y = -260 * Math.pow(Math.max(0, 1 - u * 5), 2) - 46 * Math.abs(Math.sin(Math.max(0, u - 0.2) * 13)) * Math.exp(-Math.max(0, u - 0.2) * 6);
        const sq = 0.2 * Math.exp(-Math.abs(u - 0.2) * 22);
        s = `translateY(${y}px) scale(${1 + sq},${1 - sq})`; go = clamp(tg * 60 / 2);
      } else if (o.tipo === 'polvo') { // se espolvorea: cae suave y se enfoca
        const u = eOut(clamp(tg / 0.32)); s = `translateY(${lerp(-34, 0, u)}px) scale(${lerp(1.25, 1, u)})`; go = u; g.style.filter = u < 1 ? `blur(${(1 - u) * 9}px)` : '';
      } else if (o.tipo === 'derrite') { // baja como jarabe: estirada y luego en su sitio
        const u = eOut(clamp(tg / 0.5)); s = `translateY(${lerp(-70, 0, u)}px) scale(${lerp(0.9, 1, u)},${lerp(1.9, 1, spring(tg, 120, 14))})`; go = clamp(tg * 8);
      }
      g.style.transform = s; g.style.opacity = go;
    }
  }
}

// ---------- interfaz (iframes con la página real) ----------
let doc, ddoc, R = {}, E = {}, PAGEH = 0, DESK = {};
const el = (id) => E[id];
function measure() {
  doc = $('#ui').contentDocument; doc.documentElement.style.overflow = 'hidden';
  for (const n of doc.querySelectorAll('[data-a]')) { const r = n.getBoundingClientRect(); E[n.dataset.a] = n; R[n.dataset.a] = { x: r.left, y: r.top, w: r.width, h: r.height }; }
  E.page = doc.getElementById('page'); PAGEH = E.page.getBoundingClientRect().height;
  E.stars = [...el('r-estrellas').children];
  ddoc = $('#desk').contentDocument; ddoc.documentElement.style.overflow = 'hidden';
  DESK.page = ddoc.getElementById('page'); DESK.gal = ddoc.querySelector('[data-a="g-kicker"]').getBoundingClientRect().top - 76 - 30;
}
function toStage(id, scroll, fixed = false, pad = 0) {
  const r = R[id]; const y = fixed ? r.y : r.y - scroll;
  return { cx: PH.sx + 2 * (r.x + r.w / 2), cy: PH.sy + 2 * (y + r.h / 2), hw: r.w + pad, hh: r.h + pad };
}
const REPLAY = 846; // tras el respiro, las secciones de abajo vuelven a armarse
function show(id, f, f0, o = {}) {
  const n = el(id); if (!n) return;
  const t = (f - f0) / FPS;
  if (o.re && f < REPLAY) { n.style.opacity = 1; n.style.transform = ''; n.style.clipPath = ''; return; }
  if (t <= 0) { n.style.opacity = 0; return; }
  if (o.tipo === 'pop') { const s = lerp(0.55, 1, spring(t, 300, 17)); n.style.opacity = clamp(t * 12); n.style.transform = `scale(${s})`; }
  else if (o.tipo === 'baja') { n.style.opacity = 1; n.style.transform = `translateY(${lerp(-(o.d || 70), 0, spring(t, 200, 20))}px)`; }
  else if (o.tipo === 'lado') { n.style.opacity = clamp(t * 10); n.style.transform = `translateX(${lerp(o.d || 60, 0, spring(t, 240, 19))}px) scale(${lerp(0.8, 1, spring(t, 240, 19))})`; }
  else { const u = eOut(clamp(t / (o.dur || 0.42))); n.style.opacity = u; n.style.transform = `translateY(${lerp(o.d || 18, 0, u)}px)`; n.style.clipPath = u < 1 ? `inset(0 0 ${(1 - u) * 60}% 0)` : ''; }
}

// ---------- formato ----------
const FMT = new URLSearchParams(location.search).get('fmt') || '916';
const SQ = FMT === '11';
const VIEW = SQ ? { cx: 300, cy: 540, k: 0.7, H: 1080 } : { cx: 540, cy: 960, k: 1, H: 1920 };
// posición de cada palabra: 9:16 y, en 1:1, columna derecha
const kpos = (a, b) => (SQ ? b : a);

// ---------- coreografía ----------
let SC = {}, CFG = {};
function setup() {
  const top = (id) => R[id].y;
  SC.y1 = top('q-kicker') - HEADER - 18;                 // Qué hacemos + primera fila de la galería
  SC.y2 = top('c-cumple') - HEADER - 12;                 // fichas (fila 2) + galería completa
  SC.y3 = top('k-kicker') - HEADER - 26;                 // Cómo cotizar
  SC.y4 = top('r-kicker') - HEADER - 124;                // Reseñas (asoma el botón de cotizar)
  SC.y5 = top('r-caja') - HEADER - 14;                   // Reseñas + Visítanos
  const K = (o, sq) => palabra({ ...o, ...(SQ ? sq : {}) });
  K({ texto: 'REPOSTERÍA', f: 20, fin: 118, x: 540, y: 800, size: 170, maxW: 930, tipo: 'golpe', imp: 6 }, { x: 800, y: 420, maxW: 500 });
  K({ texto: 'CASERA', f: 58, fin: 122, x: 540, y: 972, size: 206, maxW: 930, tipo: 'rebote', cls: 'sol', stg: 0.03 }, { x: 800, y: 540, maxW: 500 });
  K({ texto: 'SOBRE PEDIDO', f: 122, fin: 196, x: 540, y: 1450, size: 78, tipo: 'polvo', placa: true, rot: -3, stg: 0.024 }, { x: 800, y: 700, size: 58 });
  K({ texto: 'TU PÁGINA', f: 218, fin: 262, x: 540, y: 1500, size: 132, tipo: 'estampa', placa: true, rot: -4, cls: 'sol' }, { x: 800, y: 540, size: 96 });
  K({ texto: 'PASTELES', f: 348, fin: 404, x: 540, y: 1480, size: 150, maxW: 880, tipo: 'golpe', placa: true, rot: -3, imp: 6 }, { x: 810, y: 540, maxW: 440 });
  K({ texto: 'CUPCAKES', f: 609, fin: 668, x: 540, y: 318, size: 128, maxW: 820, tipo: 'rebote', placa: true, rot: 2.5, cls: 'sol' }, { x: 810, y: 540, maxW: 440 });
  K({ texto: 'COTIZA', f: 851, fin: 962, x: 540, y: 312, size: 150, tipo: 'estampa', placa: true, rot: -3, cls: 'sol' }, { x: 810, y: 470, size: 110 });
  K({ texto: 'POR WHATSAPP', f: 974, fin: 1010, x: 540, y: 312, size: 104, maxW: 840, tipo: 'desliza', placa: true, rot: 2 }, { x: 810, y: 610, maxW: 440 });
  K({ texto: 'EN CELULAR', f: 1248, fin: 1340, x: 760, y: 1300, size: 96, maxW: 500, tipo: 'desliza', dir: -1 }, { x: 300, y: 960, maxW: 440 });
  K({ texto: 'EN COMPUTADORA', f: 1300, fin: 1342, x: 540, y: 330, size: 108, maxW: 940, tipo: 'desliza', cls: 'sol' }, { x: 760, y: 150, maxW: 560 });
  K({ texto: 'DELICIOSA', f: 1350, fin: 1438, x: 540, y: 1010, size: 150, maxW: 900, tipo: 'derrite', stg: 0.03 }, { x: 540, y: 600, maxW: 560 });
  K({ texto: 'REPOSTERÍA', f: 1382, fin: 1438, x: 540, y: 1180, size: 180, maxW: 950, tipo: 'golpe', imp: 6 }, { x: 540, y: 740, maxW: 760 });
  K({ texto: 'CASERA', f: 1392, fin: 1438, x: 540, y: 1378, size: 250, maxW: 950, tipo: 'rebote', cls: 'sol', stg: 0.03 }, { x: 540, y: 900, maxW: 760 });
  const B = (f, x, y, n, tipo, fz) => burst(f, ...(SQ ? [800, 540] : [x, y]), n, tipo, fz);
  burst(8, ...sxy(946, 940), 46, 'oro', 1.1);
  B(26, 540, 800, 26, 'azucar', 1.2); B(126, 540, 1450, 30, 'azucar', 0.7); B(223, 540, 1500, 24, 'oro', 0.9);
  B(354, 540, 1480, 44, 'migas', 1.1); B(617, 540, 330, 26, 'azucar', 0.9); B(856, 540, 312, 26, 'oro', 0.9);
  B(1388, 540, 1180, 40, 'oro', 1.3); B(1400, 540, 1378, 36, 'azucar', 1.3);
  // end card desde config.json
  $('#e1').innerHTML = `${CFG.descriptor}<small>${CFG.ciudad}</small>`;
  $('#e2 span').textContent = `${CFG.cta} · ${CFG.whatsapp_visible}`;
  $('#e3').textContent = CFG.instagram; $('#e4').textContent = CFG.pie;
  if (!CFG.resena_con_comillas) el('r-frase').textContent = CFG.resena;
}
// mundo → pantalla (cámara única)
let CAM = { x: 540, y: 960, z: 1 };
const sxy = (x, y, c = CAM) => [VIEW.cx + (x - c.x) * c.z * VIEW.k, VIEW.cy + (y - c.y) * c.z * VIEW.k];
const toScreen = (s, c) => { const [cx, cy] = sxy(s.cx, s.cy, c), k = c.z * VIEW.k; return { ...s, cx, cy, hw: s.hw * k, hh: s.hh * k, r: s.r * k, th: s.th * Math.sqrt(k) }; };
const mix = (a, b, u) => { const s = {}; for (const k of ['cx', 'cy', 'hw', 'hh', 'r']) s[k] = lerp(a[k], b[k], u); return s; };
function keys(f, ks) { // morph entre rectángulos redondeados (familia SDF)
  let a = ks[0], b = ks[0];
  for (let i = 1; i < ks.length; i++) { if (f <= ks[i][0]) { a = ks[i - 1]; b = ks[i]; break; } a = b = ks[i]; }
  return mix(a[1], b[1], a === b ? 1 : eIO(seg(f, a[0], b[0])));
}

const F = { stripIn: 736, stripOpen: 772, stripClose: 810, stripOut: 846, s7: 1200, s7b: 1242, rec: 1340, rec2: 1376, end: 1440 };
function scrollAt(f) {
  return kf(f, [[334, 0], [366, SC.y1, eIO], [522, SC.y1], [550, SC.y2, eIO], [760, SC.y2], [836, SC.y3, eIO], [994, SC.y3], [1012, SC.y4, eIO], [1100, SC.y4], [1122, SC.y5, eIO], [1194, SC.y5], [1232, 0, eIO]]);
}
function stripRect(f, scroll) { // región visible de la página en coordenadas de mundo
  const u = Math.min(eIO(seg(f, F.stripIn, F.stripOpen)), 1 - eIO(seg(f, F.stripClose, F.stripOut)));
  const top = lerp(PH.sy, PH.sy - 2 * scroll, u), bot = lerp(PH.sy + PH.sh, PH.sy - 2 * scroll + 2 * PAGEH, u);
  return { u, top, bot };
}
function camera(f) {
  const push = kf(f, [[270, 0], [320, 1, eIO], [330, 1], [362, 0, eIO]]);
  const quiet = 1 - seg(f, 1406, 1420);
  const c = { x: 540 + noise1(f * 0.011) * 5 * quiet, y: lerp(960, 792, push) + noise1(f * 0.009 + 40) * 6 * quiet, z: lerp(1, SQ ? 1.12 : 1.27, push) };
  // respiro: la cámara se aleja hasta ver la página completa
  const sr = stripRect(f, scrollAt(f));
  if (sr.u > 0) { const u = sr.u; const zf = (VIEW.H * 0.8) / (2 * PAGEH) / VIEW.k; c.z = lerp(c.z, zf, u); c.y = lerp(c.y, (sr.top + sr.bot) / 2 + (VIEW.cy - VIEW.H / 2) / (zf * VIEW.k), u); if (SQ) c.x = lerp(c.x, 540 - 240 / (zf * VIEW.k), u); }
  // cierre: en 1:1 la cámara se centra para la composición final
  if (SQ) { const u = eIO(seg(f, F.rec, F.rec2)); c.x = lerp(c.x, 540 - 240 / VIEW.k, u * 0 ) ; }
  return c;
}

function frame(f) {
  const cam = CAM = camera(f), kz = cam.z * VIEW.k;
  const scroll = scrollAt(f);
  $('#bg').style.transform = `translate(${-(cam.x - 540) * 0.25 + noise1(f * 0.004) * 14}px,${-(cam.y - 960) * 0.06}px) scale(${1 + (cam.z - 1) * 0.12})`;
  const [wx, wy] = sxy(0, 0, cam);
  $('#world').style.transform = `translate(${wx}px,${wy}px) scale(${kz})`;

  // --- celular: inclinación en perspectiva (toque 3D) → frontal; en S7 se hace a un lado
  const st = eIO(seg(f, 118, 170));
  const ry = lerp(-18 + noise1(f * 0.02) * 1.2, 0, st), rx = lerp(8, 0, st), rz = lerp(-3, 0, st), psc = lerp(0.9, 1, st);
  const tiltT = st >= 1 ? '' : `perspective(2600px) rotateZ(${rz}deg) rotateX(${rx}deg) rotateY(${ry}deg) scale(${psc})`;
  const side = eIO(seg(f, F.s7, F.s7b)), rec = eIO(seg(f, F.rec, F.rec2)), fin = eIO(seg(f, F.end, F.end + 30));
  const pT = SQ ? { x: lerp(0, -40, side) - 60 * rec, y: 40 * rec, s: lerp(1, 0.9, side) * lerp(1, 0.8, rec) }
    : { x: lerp(0, -250, side) - 60 * rec, y: lerp(0, 330, side) + 120 * rec, s: lerp(1, 0.52, side) * lerp(1, 0.82, rec) };
  const phone = $('#phone');
  phone.style.transform = st < 1 ? tiltT : `translate(${pT.x}px,${pT.y}px) scale(${pT.s})`;
  lineCv.style.transformOrigin = `${sxy(PH.cx, PH.cy)[0]}px ${sxy(PH.cx, PH.cy)[1]}px`;
  lineCv.style.transform = tiltT;
  const sr = stripRect(f, scroll), strip = f >= F.stripIn && f < F.stripOut;
  const mat = eOut(seg(f, 92, 150));
  phone.style.opacity = mat * lerp(1, 0.32, rec) * (1 - fin * 0.6);
  phone.style.filter = rec > 0 ? `blur(${rec * 7}px)` : '';
  const chrome = 1 - sr.u;                                // el cuerpo del celular se desvanece al abrirse la tira
  for (const q of ['.body', '.bisel', '.isla', '.sombra']) phone.querySelector(q).style.opacity = clamp(chrome * 1.6 - 0.3);
  phone.querySelector('.bisel').style.setProperty('--ang', `${200 + ry * 6 + f * 0.25}deg`);
  phone.querySelector('.apagada').style.opacity = 1 - eOut(seg(f, 126, 150));
  const gi = phone.querySelector('.glare i');
  gi.style.transform = `translateX(${lerp(-18, 46, st) + noise1(f * 0.02) * 2}%)`; gi.style.opacity = (1 - seg(f, 160, 176) * 0.75) * chrome;

  // --- página: modo ventana (scroll) o modo tira (página completa)
  const scr = phone.querySelector('.screen'), ifr = $('#ui');
  if (strip) {
    ifr.style.height = PAGEH + 'px'; E.page.style.transform = '';
    ifr.style.transform = `translateY(${-2 * scroll}px) scale(2)`;
    scr.style.overflow = 'visible'; scr.style.background = 'transparent'; scr.style.borderRadius = '0';
    scr.style.clipPath = `inset(${sr.top - PH.sy}px 0 ${PH.sy + PH.sh - sr.bot}px 0 round ${lerp(84, 44, sr.u)}px)`;
  } else {
    ifr.style.height = VH + 'px'; ifr.style.transform = 'scale(2)'; E.page.style.transform = `translateY(${-scroll}px)`;
    scr.style.overflow = 'hidden'; scr.style.background = ''; scr.style.borderRadius = ''; scr.style.clipPath = '';
  }

  // --- la interfaz se arma
  const hdr = el('header');
  if (f < 700) show('header', f, 136, { tipo: 'baja' });
  else { hdr.style.opacity = 1; hdr.style.transform = strip ? '' : `translateY(${-70 * (seg(f, 722, 735) - spring((f - F.stripOut) / FPS, 200, 20))}px)`; }
  show('h-kicker', f, 174); show('h-titulo', f, 180, { dur: 0.5, d: 26 }); show('h-sub', f, 196); show('h-btn', f, 210, { tipo: 'pop' });
  const ft = eIO(seg(f, 236, 264));
  el('h-foto').style.opacity = ft > 0 ? 1 : 0; el('h-foto').style.clipPath = ft < 1 ? `inset(0 0 0 ${(1 - ft) * 100}% round 26px)` : '';
  el('h-foto').firstElementChild.style.transform = `scale(${lerp(1.12, 1, eOut(seg(f, 236, 330)))})`;
  show('h-sello', f, 268, { tipo: 'pop' });
  // botón flotante: siempre visible, salvo en la tira; en S5 la línea se funde con él
  const fab = el('fab');
  if (f < 700) show('fab', f, 152, { tipo: 'pop' });
  else { const hide = strip ? 1 : seg(f, 722, 734) - spring((f - 852) / FPS, 300, 17); const bump = 0.22 * Math.exp(-Math.max(0, f - 905) / 9) * (f >= 905 ? 1 : 0) + 0.2 * Math.exp(-Math.max(0, f - 976) / 8) * (f >= 976 ? 1 : 0); fab.style.opacity = hide >= 1 ? 0 : 1; fab.style.transform = `scale(${Math.max(0, 1 - hide) * (1 + bump)})`; }
  show('q-kicker', f, 350); show('q-titulo', f, 356);
  const chips = { 'c-pasteles': 370, 'c-bodas': 442, 'c-cumple': 491, 'c-xv': 552, 'c-cupcakes': 609, 'c-galletas': 652, 'c-gelatinas': 699 };
  for (const id in chips) show(id, f, chips[id], { tipo: 'pop' });
  show('g-kicker', f, 420); show('g-titulo', f, 426);
  const cards = { g1: 442, g2: 491, g3: 560, g4: 609 };   // cada foto entra con su palabra de la locución
  let ci = 0;
  for (const id in cards) {
    const n = el(id), t = (f - cards[id]) / FPS, dir = ci++ % 2 ? 1 : -1;
    if (t <= 0) { n.style.opacity = 0; continue; }
    const u = spring(t, 110, 15);
    n.style.opacity = clamp(t * 9);
    n.style.transform = u > 0.9995 && t > 1.5 ? '' : `translateY(${lerp(70, 0, u)}px) rotateY(${lerp(10 * dir, 0, u)}deg) rotateX(${lerp(7, 0, u)}deg) scale(${lerp(0.9, 1, u)})`;
    const luz = n.querySelector('.luz'), lu = seg(f, cards[id] + 8, cards[id] + 36);
    luz.style.opacity = Math.sin(lu * Math.PI); luz.style.transform = `translateX(${lerp(-70, 70, lu)}%)`;
  }
  // S5 cotizar
  show('k-yo', f, 932, { tipo: 'lado', re: 1 }); show('k-ella', f, 982, { tipo: 'lado', d: -60, re: 1 });
  // S5 reseñas
  show('r-nota', f, 1013, { tipo: 'pop', re: 1 }); show('r-frase', f, 1040, { re: 1 }); show('r-cuenta', f, 1081, { re: 1 }); show('r-fuente', f, 1084, { re: 1 });
  E.stars.forEach((s, i) => { const f0 = 1026 + i * 8, on = f < REPLAY || f >= f0; s.style.fill = on ? '#F2C23C' : '#e6dcc4'; const t = (f - f0) / FPS; s.style.transform = f >= REPLAY && t > 0 && t < 0.6 ? `scale(${1 + 0.7 * Math.exp(-t * 9) * Math.cos(t * 22)})` : ''; });
  // S6 visítanos
  show('m-mapa', f, 1100, { re: 1, dur: 0.35 });
  el('m-clip').setAttribute('width', f < REPLAY ? 358 : 358 * eIO(seg(f, 1120, 1166)));
  { const t = (f - 1148) / FPS, pin = el('m-pin'); const dy = f < REPLAY ? 0 : t <= 0 ? -200 : -70 * Math.pow(Math.max(0, 1 - t * 5), 2) - 14 * Math.abs(Math.sin(Math.max(0, t - 0.2) * 14)) * Math.exp(-Math.max(0, t - 0.2) * 7); pin.setAttribute('transform', `translate(228 ${80 + dy})`); pin.style.opacity = f < REPLAY || t > 0 ? 1 : 0; }
  show('m-horario', f, 1114, { tipo: 'pop', re: 1 }); show('m-l1', f, 1118, { re: 1 }); show('m-l2', f, 1130, { re: 1 }); show('m-l3', f, 1152, { re: 1 });

  // --- navegador (versión de computadora)
  const br = $('#browser');
  if (f < F.s7 - 2) br.style.display = 'none';
  else {
    br.style.display = '';
    const u = spring((f - F.s7 - 4) / FPS, 90, 15);
    const bT = SQ ? { x: lerp(900, 330, u) + 70 * rec, y: -330 - 20 * rec, s: 0.66 * lerp(1, 0.8, rec) } : { x: lerp(1150, 0, u) + 60 * rec, y: -80 * rec, s: lerp(1, 0.82, rec) };
    br.style.transform = `translate(${bT.x}px,${bT.y}px) scale(${bT.s})`;
    br.style.opacity = lerp(1, 0.32, rec) * (1 - fin * 0.6); br.style.filter = rec > 0 ? `blur(${rec * 7}px)` : '';
    DESK.page.style.transform = `translateY(${-kf(f, [[1306, 0], [1336, DESK.gal, eIO]])}px)`;
    SC.browser = { cx: 540 + bT.x, cy: 756 + bT.y, hw: 480 * bT.s + 5, hh: 326 * bT.s + 5, r: 30 * bT.s };
  }
  // --- tarjeta del logo y end card
  const lc = $('#logoCard'), lt = (f - 1362) / FPS;
  const LC = SQ ? { x: 540 - 240 / VIEW.k, y0: 540 + (330 - 540) / VIEW.k, y1: 540 + (250 - 540) / VIEW.k, s: 0.6 / VIEW.k } : { x: 540, y0: 640, y1: 560, s: 1 };
  LC.xs = SQ ? 540 + (540 - VIEW.cx) / VIEW.k : 540;
  const lcy = lerp(LC.y0, LC.y1, fin), lcs = (lt <= 0 ? 0 : lerp(0.4, 1, spring(lt, 170, 15))) * LC.s;
  lc.style.display = lt <= 0 ? 'none' : ''; { const [X, Y] = sxy(LC.xs, lcy, cam); lc.style.transform = `translate(${X - 200}px,${Y - 200}px) scale(${lcs * kz})`; }
  const end = $('#end');
  if (f < F.end) end.style.display = 'none';
  else {
    end.style.display = '';
    const pu = eOut(seg(f, F.end, F.end + 26));
    end.querySelector('.panel').style.opacity = pu; end.querySelector('.panel').style.transform = `scale(${lerp(0.92, 1, pu)})`;
    [['e1', 1470], ['e2', 1488], ['e3', 1506], ['e4', 1524]].forEach(([id, f0]) => { const n = $('#' + id), t = (f - f0) / FPS; n.style.opacity = clamp(t * 6); n.style.transform = id === 'e2' ? `scale(${lerp(0.7, 1, spring(t, 260, 17))})` : `translateY(${lerp(26, 0, eOut(clamp(t / 0.4)))}px)`; });
  }

  // --- la línea dorada (un solo campo)
  const L = { glow: Math.max(1.6 * (1 - seg(f, 8, 14)) * seg(f, 6, 8), 0.5 * Math.exp(-Math.abs(f - 240) / 10), 0.5 * sr.u, 0.9 * Math.exp(-Math.abs(f - 905) / 8), 0.7 * Math.exp(-Math.abs(f - 1384) / 12)), crawl: f * 0.6 };
  if (f < 20) { // 1) cruza de lado a lado (f0–f8) y la cola la alcanza
    const head = eOut(seg(f, 0, 8)), tail = eIO(seg(f, 3, 18));
    const Bz = (u) => { const a = [-90 / VIEW.k, 1085], b = [470, 880], c = [946, 940]; const v = 1 - u; return sxy(v * v * a[0] + 2 * v * u * b[0] + u * u * c[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c[1], cam); };
    L.trail = []; for (let i = 0; i < NP; i++) L.trail.push(Bz(lerp(tail, Math.max(head, tail + 0.001), i / (NP - 1))));
    L.trailTh = 6.5 * (1 - seg(f, 14, 20)) * Math.sqrt(VIEW.k);
  }
  if (f >= 7) { // 2) marco del celular: punteada → sólida; canto del celular; contorno de la tira
    const ph = { cx: PH.cx + pT.x, cy: PH.cy + pT.y, hw: PH.w / 2 * pT.s, hh: PH.h / 2 * pT.s, r: 100 * pT.s };
    const tira = { cx: PH.cx, cy: (sr.top + sr.bot) / 2, hw: PH.sw / 2 + 9, hh: (sr.bot - sr.top) / 2 + 9, r: lerp(100, 52, sr.u) };
    const a = sr.u > 0 ? mix(ph, tira, Math.min(1, sr.u * 3)) : ph;
    L.A = toScreen({ ...a, rev: eIO(seg(f, 8, 86)), solid: eIO(seg(f, 44, 104)), th: lerp(5.2, 2.6, eIO(seg(f, 120, 170))) * (1 + sr.u * 1.2) * (1 - rec) }, cam);
    if (rec >= 1) L.A = null;
  }
  if (f >= 228) { // 3) cursor: brota del canto, enmarca fotos, hace de barra de scroll, se vuelve botón, traza el mapa, enmarca el navegador y rodea el logo
    const thumb = { cx: PH.sx + PH.sw - 14, cy: PH.sy + 150 + (scroll / (PAGEH - VH)) * 1040, hw: 3.2, hh: 58, r: 3.2 };
    const born = { cx: PH.x + PH.w - 3, cy: thumb.cy, hw: 2, hh: 2, r: 2 };
    const foto = { ...toStage('h-foto', scroll, false, 5), r: 56 };
    const g = ['g1', 'g2', 'g3', 'g4'].map((id) => ({ ...toStage(id, scroll, false, 4), r: 47 }));
    const fb = toStage('fab', 0, true, 0); const fabR = { cx: fb.cx, cy: fb.cy, hw: 74, hh: 74, r: 74 }, fabIn = { ...fabR, hw: 58, hh: 58, r: 58 }, fabOut = { ...fabR, hw: 104, hh: 104, r: 104 };
    const mapa = { ...toStage('m-mapa', scroll, false, 5), r: 52 };
    const nav = SC.browser || thumb;
    const aro = { cx: LC.xs, cy: lcy, hw: 222 * LC.s, hh: 222 * LC.s, r: 222 * LC.s };
    const sideThumb = { cx: thumb.cx + pT.x + (thumb.cx - PH.cx) * (pT.s - 1), cy: PH.cy + pT.y + (thumb.cy - PH.cy) * pT.s, hw: 3.2, hh: 58 * pT.s, r: 3.2 };
    const tiraT = { cx: PH.cx + PH.sw / 2 + 9, cy: (sr.top + sr.bot) / 2, hw: 3, hh: 3, r: 3 };
    const s = keys(f, [[228, born], [238, thumb], [246, thumb], [266, foto], [300, foto], [326, thumb], [440, thumb], [456, g[0]], [488, g[0]], [504, g[1]], [518, g[1]], [532, thumb], [556, thumb], [572, g[2]], [604, g[2]], [620, g[3]], [650, g[3]], [668, thumb],
      [730, thumb], [746, tiraT], [836, tiraT], [852, thumb], [888, thumb], [906, fabR], [916, fabIn], [928, fabR], [970, fabR], [982, fabOut], [992, thumb], [1100, thumb], [1122, mapa], [1190, mapa], [1202, sideThumb], [1210, sideThumb], [F.s7b + 6, nav], [1348, nav], [1386, aro]]);
    let th = 3.3;
    if (f >= 730 && f < 852) th *= 1 - Math.min(seg(f, 730, 746), 1 - seg(f, 836, 852)) * 0.999;
    if (f >= 970 && f < 992) th *= 1 - Math.sin(seg(f, 970, 992) * Math.PI) * 0.6;
    if (f >= 1386) th = lerp(3.3, 6, seg(f, 1386, 1400));
    L.B = toScreen({ ...s, rev: 1, solid: 1, th }, cam);
  }
  drawLine(L);

  $('#flash').style.opacity = 0.9 * seg(f, 7, 8) * (1 - seg(f, 8, 11));
  { const [fx, fy] = sxy(946, 940, cam); $('#flash').style.setProperty('--fx', fx + 'px'); $('#flash').style.setProperty('--fy', fy + 'px'); }
  drawParticles(f, cam);
  drawKT(f);
}

async function init() {
  window.__dsfFix = 1;
  $('#stage').style.height = VIEW.H + 'px';
  for (const c of document.querySelectorAll('canvas.full')) { c.height = VIEW.H; c.style.height = VIEW.H + 'px'; }
  for (const q of ['#kt', '#flash', '#vig', '#end']) $(q).style.height = VIEW.H + 'px';
  if (SQ) { const e = $('#end'); e.style.transformOrigin = '540px 930px'; e.style.transform = 'translateY(-390px) scale(.74)'; }
  CFG = await (await fetch('/config.json')).json();
  await document.fonts.ready;
  for (const id of ['#ui', '#desk']) { const ifr = $(id); if (ifr.contentDocument.readyState !== 'complete') await new Promise((r) => ifr.addEventListener('load', r)); await ifr.contentDocument.fonts.ready; await Promise.all([...ifr.contentDocument.images].map((i) => i.decode().catch(() => {}))); }
  await Promise.all(['600 20px Outfit', '700 20px Outfit', '700 20px Nunito', '800 20px Nunito', 'italic 600 20px "Playfair Display"'].map((s) => document.fonts.load(s)));
  await $('#logoCard img').decode();
  measure(); setup();
  window.SC = SC; window.R = R; window.PAGEH = PAGEH;
  window.setFrame = (f) => frame(f);
  window.setFrame(0);
  window.ready = true;
}
init().catch((e) => { window.initError = String(e.stack || e); });
