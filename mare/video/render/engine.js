// MaRe Repostería · "El hilo de chocolate"
// Motor 2.5D determinista: frame(t) → una cámara, un campo líquido (SDF en WebGL) y capas 2D con cristal real.
const Q = new URLSearchParams(location.search);
const W = +Q.get('w') || 540, H = +Q.get('h') || 960, FMT = Q.get('fmt') || '916';
const DW = 1080, DH = FMT === '11' ? 1080 : 1920, S = W / DW;
const SW = { willReadFrequently: true }; // canvas 2D por software: resultado determinista
const COL = { espresso: '#1E120C', choco: '#4A2A1C', kraft: '#C9A27A', rosa: '#E48BB0', crema: '#FFF8E1' };

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (f, a, b) => clamp((f - a) / (b - a));
const eo = (t) => 1 - Math.pow(1 - clamp(t), 3);
const eio = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const ei = (t) => clamp(t) ** 3;
const spring = (t, w = 11, z = 5) => (t <= 0 ? 0 : 1 - Math.exp(-z * t) * Math.cos(w * t));
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// ---------- disposición por formato (coordenadas de diseño) ----------
const L = FMT === '11' ? {
  hit: [900, 330], sheet: { x: 640, y: 560, w: 760, h: 620 }, cutY: 560, stamp: [700, 540, 230],
  phone: { x: 730, y: 540, hw: 215, hh: 455, r: 62 },
  t1: { x: 540, y: 150, px: 110 }, t2: { x: 540, y: 250, px: 78 },
  cards: [{ x: 250, y: 300, sg: -1, k: 0.74 }, { x: 420, y: 600, sg: 1, k: 0.74 }, { x: 240, y: 850, sg: -1, k: 0.74 }],
} : {
  hit: [850, 790], sheet: { x: 540, y: 1095, w: 860, h: 700 }, cutY: 1090, stamp: [540, 1000, 280],
  phone: { x: 540, y: 1010, hw: 280, hh: 595, r: 78 },
  t1: { x: 540, y: 470, px: 176 }, t2: { x: 540, y: 632, px: 124 },
  cards: [{ x: 236, y: 760, sg: -1, k: 1 }, { x: 846, y: 1090, sg: 1, k: 1 }, { x: 270, y: 1385, sg: -1, k: 1 }],
};

// ---------- trayecto del hilo ----------
function buildPath() {
  const s = L.sheet, x0 = s.x - s.w * 0.36, x1 = s.x + s.w * 0.36, top = s.y - s.h * 0.43, step = s.h * 0.145;
  const wp = [[-260, DH + 130, 200], [L.hit[0], L.hit[1], 40]];
  for (let i = 1; i <= 6; i++) wp.push([i % 2 ? x0 : x1, top + step * i + (i === 6 ? -20 : 0), 46]);
  wp.push([s.x + s.w / 2 + 110, L.cutY + 170, 90], [s.x + s.w / 2 + 70, L.cutY, 70], [s.x - s.w / 2 - 150, L.cutY, 90],
    [s.x - s.w / 2 - 170, s.y + s.h * 0.55, 120], [L.stamp[0] - 160, s.y + s.h * 0.66, 130], [L.stamp[0], L.stamp[1] + 240, 120], [L.stamp[0], L.stamp[1], 0]);
  const pts = [[wp[0][0], wp[0][1]]];
  for (let i = 1; i < wp.length - 1; i++) {
    const [ax, ay] = wp[i - 1], [bx, by, rad] = wp[i], [cx, cy] = wp[i + 1];
    const la = Math.hypot(ax - bx, ay - by), lc = Math.hypot(cx - bx, cy - by), r = Math.min(rad, la * 0.45, lc * 0.45);
    const p0 = [bx + (ax - bx) / la * r, by + (ay - by) / la * r], p2 = [bx + (cx - bx) / lc * r, by + (cy - by) / lc * r];
    for (let k = 0; k <= 8; k++) { const t = k / 8, u = 1 - t; pts.push([u * u * p0[0] + 2 * u * t * bx + t * t * p2[0], u * u * p0[1] + 2 * u * t * by + t * t * p2[1]]); }
  }
  pts.push([wp.at(-1)[0], wp.at(-1)[1]]);
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const at = (l) => { l = clamp(l, 0, len.at(-1)); let i = 1; while (i < len.length - 1 && len[i] < l) i++; const t = (l - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]; };
  // longitudes clave: por cercanía a los puntos de paso
  const near = (x, y, from = 0) => { let b = 0, bd = 1e9; for (let i = 0; i < pts.length; i++) { if (len[i] < from) continue; const d = Math.hypot(pts[i][0] - x, pts[i][1] - y); if (d < bd) { bd = d; b = len[i]; } } return b; };
  const lHit = near(L.hit[0], L.hit[1]);
  const lZig = near(wp[7][0], wp[7][1], lHit + 50);
  const lCut0 = near(wp[9][0], wp[9][1], lZig), lCut1 = near(wp[10][0], wp[10][1], lCut0);
  return { pts, len, at, total: len.at(-1), lHit, lZig, lCut0, lCut1 };
}
const PATH = buildPath();
function lineRange(f) {
  const P = PATH;
  let l1, l0;
  if (f < 8) l1 = lerp(P.lHit * 0.3, P.lHit, f / 8);
  else if (f < 104) { const u = (f - 8) / 96; l1 = lerp(P.lHit, P.lZig, 0.86 * eio(u) + 0.14 * u); }
  else if (f < 120) l1 = lerp(P.lZig, P.lCut0, eio((f - 104) / 16));
  else if (f < 134) l1 = lerp(P.lCut0, P.lCut1, eio((f - 120) / 14));
  else l1 = lerp(P.lCut1, P.total, eio(ramp(f, 134, 164)));
  if (f < 8) l0 = Math.max(0, l1 - 900);
  else if (f < 16) l0 = lerp(P.lHit - 900, P.lHit, eo((f - 8) / 8));
  else if (f < 100) l0 = P.lHit;
  else if (f < 122) l0 = lerp(P.lHit, P.lCut0 - 40, eio((f - 100) / 22));
  else if (f < 138) l0 = lerp(P.lCut0 - 40, P.lCut1 - 260, eio((f - 122) / 16));
  else l0 = lerp(P.lCut1 - 260, P.total - 2, eio(ramp(f, 138, 168)));
  return [Math.max(0, Math.min(l0, l1)), l1];
}
function linePoints(f) {
  const [l0, l1] = lineRange(f), P = PATH, out = [];
  const R = FMT === '11' ? 10 : 12.5;
  const rad = (l) => R * (0.45 + 0.55 * clamp((l - l0) / 140)) * (1 + 0.35 * clamp(1 - (l1 - l) / 40));
  const ls = [l0, l1, l0 + 70, l0 + 140, l1 - 40];
  for (let i = 0; i < P.len.length; i++) if (P.len[i] > l0 && P.len[i] < l1) ls.push(P.len[i]);
  ls.sort((a, b) => a - b);
  let cand = ls.filter((l, i) => l >= l0 && l <= l1 && (i === 0 || l - ls[i - 1] > 0.5));
  while (cand.length > 64) cand = cand.filter((_, i) => i % 2 === 0 || i === cand.length - 1);
  for (const l of cand) { const p = P.at(l); out.push([p[0], p[1], rad(l)]); }
  if (out.length === 1) out.push([out[0][0] + 0.01, out[0][1], out[0][2]]);
  return out;
}
const DROPS = (() => { const r = rng(7); return Array.from({ length: 11 }, () => ({ a: r() * Math.PI * 2, v: 14 + r() * 26, r: 7 + r() * 13 })); })();

// ---------- cámara ----------
function camera(f) {
  const sh = (f0, amp, w) => (f < f0 ? [0, 0] : [Math.sin((f - f0) * w) * amp * Math.exp(-(f - f0) / 5), Math.cos((f - f0) * w * 1.31) * amp * 0.8 * Math.exp(-(f - f0) / 5)]);
  const a = sh(8, 24, 1.9), b = sh(120, 9, 2.2);
  let zoom = lerp(1.07, 1.0, eo(ramp(f, 0, 110)));
  zoom += 0.035 * eio(ramp(f, 118, 136)) - 0.035 * eio(ramp(f, 150, 176));
  zoom += 0.05 * Math.sin(Math.PI * ramp(f, 162, 186)) * 0.6;
  zoom -= 0.05 * eio(ramp(f, 186, 250));
  zoom += 0.015 * ramp(f, 250, 360);
  zoom += 0.02 * eio(ramp(f, 360, 420)) - 0.02 * eio(ramp(f, 540, 580));
  zoom += 0.03 * eio(ramp(f, 575, 745)) - 0.03 * eio(ramp(f, 745, 790));
  for (const k of [960, 990, 1020]) if (f >= k) zoom += 0.008 * Math.exp(-(f - k) / 4);
  zoom -= 0.07 * eio(ramp(f, 1030, 1190));
  const endk = eio(ramp(f, 1190, 1212));
  zoom = lerp(zoom, 1, endk);
  let sx = a[0] + b[0], sy = a[1] + b[1];
  const extra = [...[390, 405, 420, 435, 450].map((k) => sh(k, 5, 2.4)), sh(1200, 16, 1.9), ...[880, 895, 910].map((k) => sh(k, 3, 2.6)), sh(990, 4, 2.2)];
  for (const e of extra) { sx += e[0]; sy += e[1]; }
  return { x: DW / 2, y: DH / 2 + 10 * Math.sin(f / 90) * (1 - endk), zoom, sx, sy };
}
function applyCam(c, cam) { c.setTransform(S * cam.zoom, 0, 0, S * cam.zoom, S * (DW / 2 + cam.sx - cam.x * cam.zoom), S * (DH / 2 + cam.sy - cam.y * cam.zoom)); }

// ---------- transformación del teléfono (escala, desplazamiento y órbita) ----------
function PT(f) {
  const a = eio(ramp(f, 352, 392)) * (1 - eio(ramp(f, 1018, 1046)));
  const cj = eio(ramp(f, 752, 790)) * (1 - eio(ramp(f, 922, 952)));
  const s = (1 - 0.16 * a) * (1 - 0.12 * cj), dy = 80 * a + 40 * cj;
  const yaw = 0.12 * Math.sin(2 * Math.PI * eio(ramp(f, 575, 748)));
  return { s, dx: 0, dy, yaw };
}
function applyPT(c, f) {
  const T = PT(f), ph = L.phone, cs = Math.cos(T.yaw);
  c.translate(ph.x + T.dx, ph.y + T.dy); c.transform(T.s * cs, T.s * Math.sin(T.yaw) * 0.35, 0, T.s, 0, 0); c.translate(-ph.x, -ph.y);
}

// ---------- campo líquido (WebGL) ----------
const glc = mk(W, H);
const gl = glc.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
const FS = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes; uniform float uS; uniform vec2 uDC; uniform vec3 uCam; uniform vec2 uShake;
uniform vec3 uP[64]; uniform int uN; uniform vec3 uD[12]; uniform int uND;
uniform vec4 uSc; uniform vec4 uBox; uniform vec2 uBoxR; uniform float uM1, uM2;
uniform vec3 uCol; uniform float uBevel, uSpec; uniform vec4 uBB; uniform vec4 uBA; uniform float uBS; uniform vec4 uU;
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b-a)/k, 0., 1.); return mix(b, a, h) - k*h*(1.-h); }
float fld(vec2 p){
  float d = 1e4;
  if (uN > 0 && p.x > uBB.x && p.y > uBB.y && p.x < uBB.z && p.y < uBB.w) {
    for (int i = 0; i < 63; i++) { if (i >= uN - 1) break;
      vec2 a = uP[i].xy, b = uP[i+1].xy, ba = b - a; float h = clamp(dot(p-a, ba)/max(dot(ba,ba),1e-5), 0., 1.);
      d = min(d, length(p - a - ba*h) - mix(uP[i].z, uP[i+1].z, h)); }
    for (int j = 0; j < 12; j++) { if (j >= uND) break; d = smin(d, length(p - uD[j].xy) - uD[j].z, 16.); }
  }
  if (uM1 > 0.) { vec2 q = p - uSc.xy; float ds = length(q) - uSc.z*(1. + uSc.w*cos(16.*atan(q.y, q.x))); d = uN > 0 ? mix(d, ds, uM1) : ds; }
  if (uM2 > 0.) { vec2 q0 = p - uBox.xy; vec2 ql = vec2(uBA.x*q0.x + uBA.y*q0.y, uBA.z*q0.x + uBA.w*q0.y);
    vec2 q = abs(ql) - uBox.zw + uBoxR.x; float db = (abs(length(max(q,0.)) + min(max(q.x,q.y),0.) - uBoxR.x) - uBoxR.y) * uBS; d = mix(d, db, uM2); }
  if (uU.w > 0.) { vec2 a = uU.xy, b = vec2(uU.z, uU.y), ba = b - a; float h = clamp(dot(p-a, ba)/max(dot(ba,ba),1e-5), 0., 1.); d = min(d, length(p - a - ba*h) - uU.w); }
  return d;
}
void main(){
  vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uS;
  vec2 p = (sp - uDC - uShake) / uCam.z + uCam.xy;
  float k = uS * uCam.z;
  float d = fld(p);
  float a = clamp(0.5 - d*k, 0., 1.);
  float h = clamp(-d/uBevel, 0., 1.); h = sqrt(max(1. - (1.-h)*(1.-h), 0.));
  vec3 n = normalize(vec3(-dFdx(h)*k*uBevel*1.15, dFdy(h)*k*uBevel*1.15, 1.));
  vec3 Lg = normalize(vec3(-0.45, -0.55, 0.7));
  vec3 Hh = normalize(Lg + vec3(0.,0.,1.));
  float diff = max(dot(n, Lg), 0.) / Lg.z;
  float sp0 = pow(Hh.z, 60.);
  float spec = max(pow(max(dot(n, Hh), 0.), 60.) - sp0, 0.);
  vec3 col = uCol*(0.30 + 0.70*diff) + vec3(1.0, 0.95, 0.88)*spec*uSpec;
  float ds = fld(p - vec2(9., 13.));
  float sa = smoothstep(16., -8., ds) * 0.42;
  o = vec4(col*a, a + sa*(1.-a));
}`;
const prog = (() => {
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }'));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  gl.useProgram(p);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const l = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
  return p;
})();
const U = (n) => gl.getUniformLocation(prog, n);
const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const mix3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const C_CHOCO = hex3('#6B3A22'), C_ROSA = [227 / 255, 139 / 255, 177 / 255], C_PERLA = hex3('#FFF3DC');

const PH_OPEN = (f) => eio(ramp(f, 186, 226)) * (1 - eio(ramp(f, 1020, 1058)));
const STAMP_K = (f) => 1 - ei(ramp(f, 1188, 1206));
function fieldState(f, cam) {
  const sk = STAMP_K(f);
  const m1 = sk > 0.004 ? eio(ramp(f, 156, 176)) : 0, m2 = PH_OPEN(f);
  const pop = lerp(0.2, 1, spring(ramp(f, 156, 186) * 1.6, 9, 4.2)) * sk;
  const ph = L.phone, T = PT(f);
  const det = T.s * T.s * Math.cos(T.yaw), M10 = T.s * Math.sin(T.yaw) * 0.35;
  return {
    u: [0, 0, 0, 0], ba: [T.s / det, 0, -M10 / det, T.s * Math.cos(T.yaw) / det], bs: T.s,
    m1, m2, pts: f < 170 ? linePoints(f) : [],
    drops: f >= 8 && f < 36 ? DROPS.map((d) => { const t = f - 8, g = 0.9; return [L.hit[0] + Math.cos(d.a) * d.v * t * 0.9, L.hit[1] + Math.sin(d.a) * d.v * t * 0.9 + g * t * t * 0.5, Math.max(0, d.r * (1 - t / 26))]; }).filter((d) => d[2] > 0.3) : [],
    sc: [L.stamp[0], L.stamp[1], L.stamp[2] * pop, 0.024],
    box: [ph.x + T.dx, ph.y + T.dy, ph.hw, ph.hh], boxR: [ph.r, 7],
    col: mix3(mix3(C_CHOCO, C_ROSA, eio(ramp(f, 158, 174))), C_PERLA, eio(ramp(f, 188, 220)) * (1 - eio(ramp(f, 1020, 1052)))),
    bevel: lerp(lerp(12, 9, m1), 7, m2), spec: lerp(lerp(0.85, 0.12, m1), 0.5, m2),
  };
}
function drawField(st, cam) {
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  if (!st.pts.length && st.m1 <= 0 && st.u[3] <= 0) return false;
  gl.uniform2f(U('uRes'), W, H); gl.uniform1f(U('uS'), S); gl.uniform2f(U('uDC'), DW / 2, DH / 2);
  gl.uniform3f(U('uCam'), cam.x, cam.y, cam.zoom); gl.uniform2f(U('uShake'), cam.sx, cam.sy);
  const P = new Float32Array(64 * 3); st.pts.forEach((p, i) => P.set(p, i * 3)); gl.uniform3fv(U('uP'), P); gl.uniform1i(U('uN'), st.pts.length);
  const D = new Float32Array(12 * 3); st.drops.forEach((p, i) => D.set(p, i * 3)); gl.uniform3fv(U('uD'), D); gl.uniform1i(U('uND'), st.drops.length);
  let bb = [1e9, 1e9, -1e9, -1e9];
  for (const p of [...st.pts, ...st.drops]) { bb[0] = Math.min(bb[0], p[0] - p[2]); bb[1] = Math.min(bb[1], p[1] - p[2]); bb[2] = Math.max(bb[2], p[0] + p[2]); bb[3] = Math.max(bb[3], p[1] + p[2]); }
  const mg = st.m1 > 0 ? 1e5 : 40; gl.uniform4f(U('uBB'), bb[0] - mg, bb[1] - mg, bb[2] + mg, bb[3] + mg);
  gl.uniform4f(U('uSc'), ...st.sc); gl.uniform4f(U('uBox'), ...st.box); gl.uniform2f(U('uBoxR'), ...st.boxR);
  gl.uniform4f(U('uBA'), ...st.ba); gl.uniform1f(U('uBS'), st.bs); gl.uniform4f(U('uU'), ...st.u);
  gl.uniform1f(U('uM1'), st.m1); gl.uniform1f(U('uM2'), st.m2);
  gl.uniform3f(U('uCol'), ...st.col); gl.uniform1f(U('uBevel'), st.bevel); gl.uniform1f(U('uSpec'), st.spec);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return true;
}

// ---------- texturas y assets ----------
const IMG = {};
const loadImg = (k, src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => { IMG[k] = i; ok(); }; i.onerror = () => no(new Error('no carga ' + src)); i.src = src; });
function paperTex(base, seed, n, dark) {
  const c = mk(768, 768), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, 768, 768);
  for (let i = 0; i < n; i++) {
    const px = r() * 768, py = r() * 768, a = r() * Math.PI, l = 6 + r() * 34, li = r() > 0.5;
    x.strokeStyle = li ? `rgba(255,240,215,${(0.03 + r() * 0.06) * (dark ? 0.6 : 1)})` : `rgba(60,30,10,${0.03 + r() * 0.07})`;
    x.lineWidth = 0.6 + r() * 1.1; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + (r() - 0.5) * 8, py + Math.sin(a) * l * 0.5 + (r() - 0.5) * 8, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  for (let i = 0; i < n * 2; i++) { x.fillStyle = r() > 0.5 ? 'rgba(255,240,215,0.05)' : 'rgba(50,25,8,0.06)'; x.fillRect(r() * 768, r() * 768, 1.4, 1.4); }
  return c;
}
function noiseTex() { const c = mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256), r = rng(99); for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; }
let TEX = {}, PAGE = null;
const HDR = { a: document.createElement('canvas'), b: document.createElement('canvas') };
const PAGE_K = 1.15; // la página se dibuja un poco más grande que su tamaño en pantalla para que quede nítida con el zoom

function buildPage() {
  const ph = L.phone, sw = (ph.hw - 22) * 2, ps = S * PAGE_K * (sw / 520);
  const PHH = 3260, photos = [];
  const c = mk(520 * ps, PHH * ps), x = c.getContext('2d');
  x.scale(ps, ps); x.imageSmoothingQuality = 'high';
  x.fillStyle = COL.crema; x.fillRect(0, 0, 520, PHH);
  // héroe (asset 02) bajo el encabezado de cristal
  const im = IMG.a02, hh = 700, sc = Math.max(520 / im.width, hh / im.height), sw2 = 520 / sc, sh2 = hh / sc;
  x.drawImage(im, (im.width - sw2) / 2, (im.height - sh2) * 0.42, sw2, sh2, 0, 0, 520, hh);
  x.fillStyle = COL.choco; x.font = '800 54px "Baloo 2"'; x.textBaseline = 'alphabetic'; x.fillText('Menú', 30, hh + 84);
  x.fillStyle = COL.rosa; x.beginPath(); rr(x, 30, hh + 100, 70, 8, 4); x.fill();
  const items = [['Mega galletas', 'a03', [2, 0, 1220, 623]], ['Monster cookie', 'a04', [1, 1, 1224, 627]], ['Brownies', 'a06', [0, 0, 576, 722]], ['Brookies', 'a07', [0, 0, 719, 840]],
    ['Lemonies', 'a08', [0, 0, 637, 868]], ['Cuchareable', 'a10', [0, 2, 997, 588]], ['Pasteles', 'a09', [0, 0, 1199, 640]]];
  items.forEach(([name, k, src], i) => {
    const y = hh + 140 + i * 290, bw = 460, bh = 200;
    x.fillStyle = 'rgba(74,42,28,0.10)'; x.beginPath(); rr(x, 30, y, bw, bh, 28); x.fill();
    photos.push({ k, src, x: 30, y, bw, bh });
    x.fillStyle = COL.choco; x.font = '700 34px "Baloo 2"'; x.fillText(name, 34, y + bh + 46);
  });
  const fy = hh + 140 + items.length * 290 + 40;
  x.fillStyle = COL.choco; x.font = '800 44px "Baloo 2"'; x.fillText('¿Cómo pedir?', 30, fy);
  x.fillStyle = COL.rosa; x.beginPath(); rr(x, 30, fy + 16, 70, 8, 4); x.fill();
  x.fillStyle = '#6B4A35'; x.font = '500 25px "DM Sans"';
  ['1. Elige en el menú.', '2. Pide con anticipación por', '    Instagram o WhatsApp.', '3. Deja tu anticipo.', '4. Recoge en tu fecha.'].forEach((t, i) => x.fillText(t, 30, fy + 70 + i * 38));
  return { c, ps, sw, photos };
}

// ---------- capas ----------
function drawBG(c, cam) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = COL.espresso; c.fillRect(0, 0, W, H);
  applyCam(c, cam);
  const g = c.createRadialGradient(DW * 0.38, DH * 0.34, 0, DW * 0.5, DH * 0.5, DH * 0.72);
  g.addColorStop(0, 'rgba(92,52,30,0.55)'); g.addColorStop(0.55, 'rgba(60,33,20,0.25)'); g.addColorStop(1, 'rgba(10,5,3,0.55)');
  c.fillStyle = g; c.fillRect(-300, -300, DW + 600, DH + 600);
  c.globalAlpha = 0.5; c.fillStyle = c.createPattern(TEX.dark, 'repeat'); c.fillRect(-300, -300, DW + 600, DH + 600); c.globalAlpha = 1;
}
function drawSheet(c, f) {
  if (f > 178) return;
  const s = L.sheet;
  const inn = 1 + (f > 8 ? 0.012 * Math.exp(-(f - 8) / 6) * Math.cos((f - 8) * 0.9) : 0), out = ei(ramp(f, 160, 178));
  const k = inn * (1 - out);
  if (k <= 0.01) return;
  const cx = lerp(s.x, L.stamp[0], out), cy = lerp(s.y, L.stamp[1], out);
  c.save(); c.translate(cx, cy); c.scale(k, k); c.rotate(lerp(-0.12, 0, Math.min(1, inn)) + out * 0.9); c.translate(-s.x, -s.y);
  const x0 = s.x - s.w / 2, y0 = s.y - s.h / 2;
  const lift = lerp(60, 14, Math.min(1, inn));
  c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = lift * 2.2 * S; c.shadowOffsetX = lift * 0.7 * S; c.shadowOffsetY = lift * S;
  c.fillStyle = COL.kraft; c.beginPath(); rr(c, x0, y0, s.w, s.h, 26); c.fill(); c.restore();
  c.save(); c.beginPath(); rr(c, x0, y0, s.w, s.h, 26); c.clip();
  c.fillStyle = c.createPattern(TEX.kraft, 'repeat'); c.fillRect(x0, y0, s.w, s.h);
  const lg = c.createLinearGradient(x0, y0, x0 + s.w, y0 + s.h); lg.addColorStop(0, 'rgba(255,235,200,0.22)'); lg.addColorStop(1, 'rgba(70,35,10,0.22)');
  c.fillStyle = lg; c.fillRect(x0, y0, s.w, s.h);
  // el corte: el papel se abre y adentro está la galleta (asset 03)
  const open = eo(ramp(f, 123, 140)) * (1 - eio(ramp(f, 150, 166)));
  const im = IMG.a03, pw = s.w, phh = pw * (im.height - 0) / (im.width - 2), g = open * Math.min(phh, s.h * 0.72);
  if (g > 0.5) {
    c.save(); c.beginPath(); c.rect(x0, L.cutY - g / 2, s.w, g); c.clip();
    c.drawImage(im, 2, 0, im.width - 2, im.height, x0, L.cutY - phh / 2 + (1 - open) * 30, pw, phh);
    const ig = c.createLinearGradient(0, L.cutY - g / 2, 0, L.cutY + g / 2);
    ig.addColorStop(0, 'rgba(20,8,2,0.7)'); ig.addColorStop(Math.min(0.2, 26 / g), 'rgba(20,8,2,0)'); ig.addColorStop(1 - Math.min(0.12, 12 / g), 'rgba(20,8,2,0)'); ig.addColorStop(1, 'rgba(20,8,2,0.35)');
    c.fillStyle = ig; c.fillRect(x0, L.cutY - g / 2, s.w, g); c.restore();
    const fh = Math.min(g * 0.17, 34);
    for (const sg of [-1, 1]) {
      const yy = L.cutY + sg * g / 2, fg = c.createLinearGradient(0, yy, 0, yy + sg * fh);
      fg.addColorStop(0, '#E9CBA6'); fg.addColorStop(0.7, '#D8B48B'); fg.addColorStop(1, '#B98F66');
      c.fillStyle = fg; c.fillRect(x0, Math.min(yy, yy + sg * fh), s.w, fh);
      c.fillStyle = 'rgba(40,18,6,0.28)'; c.fillRect(x0, sg < 0 ? yy - fh - 5 : yy + fh, s.w, 5);
    }
  }
  c.restore(); c.restore();
}
function stampLogo(c, f) {
  const a = eo(ramp(f, 166, 182)) * STAMP_K(f); if (a <= 0.003) return;
  const m2 = PH_OPEN(f), ph = L.phone, k = (ph.hw - 22) / 258;
  const R0 = L.stamp[2] * (285 / 408) * lerp(0.2, 1, spring(ramp(f, 156, 186) * 1.6, 9, 4.2)) * (1 + 0.012 * Math.sin(f / 14) * ramp(f, 1066, 1090));
  const x = lerp(L.stamp[0], ph.x - (ph.hw - 22) + 70 * k, m2), y = lerp(L.stamp[1], ph.y - (ph.hh - 22) + 80 * k, m2), R = lerp(R0, 46 * k, m2);
  c.save(); c.beginPath(); c.arc(x, y, R * a, 0, 7); c.clip();
  c.imageSmoothingQuality = 'high'; c.drawImage(IMG.a11, 434 - 285, 435 - 285, 570, 570, x - R, y - R, R * 2, R * 2); c.restore();
}
function glass(c, back, pathFn, opt = {}) {
  // cristal real: desenfoca y satura lo que hay detrás, tinte, brillo, borde de 1 px y ruido al 2 %
  const m = c.getTransform(), blur = (opt.blur || 32) * S * Math.hypot(m.a, m.b) / S;
  c.save(); c.beginPath(); pathFn(c); c.clip(opt.rule || 'nonzero');
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.filter = `blur(${blur.toFixed(2)}px) saturate(140%)`; c.drawImage(back, 0, 0); c.filter = 'none'; c.restore();
  c.fillStyle = opt.tint || 'rgba(255,248,225,0.13)'; c.fill(opt.rule || 'nonzero');
  if (opt.sheen) { c.fillStyle = opt.sheen; c.fill(opt.rule || 'nonzero'); }
  c.globalAlpha = 0.02 * 2; c.globalCompositeOperation = 'overlay'; c.fillStyle = c.createPattern(TEX.noise, 'repeat'); c.fill(opt.rule || 'nonzero');
  c.restore();
  c.save(); c.beginPath(); pathFn(c); c.lineWidth = 1 / (S * Math.hypot(m.a, m.b) / S); c.strokeStyle = opt.edge || 'rgba(255,255,255,0.55)'; c.stroke(); c.restore();
}
function drawPhone(c, back, f) {
  const m2 = PH_OPEN(f); if (m2 <= 0) return;
  const ph = L.phone, iw = ph.hw - 7, ih = ph.hh - 7, sw = ph.hw - 22, sh = ph.hh - 22, sr = ph.r - 22;
  const e = eo(ramp(f, 196, 232)) * (1 - eio(ramp(f, 1018, 1050)));
  if (e <= 0.002) return;
  // bisel de cristal entre el aro y la pantalla
  if (e > 0.02) glass(c, back, (p) => { rr(p, ph.x - iw * e, ph.y - ih * e, iw * 2 * e, ih * 2 * e, (ph.r - 7) * e); rr(p, ph.x - sw * e, ph.y - sh * e, sw * 2 * e, sh * 2 * e, sr * e); }, { rule: 'evenodd', blur: 30, tint: 'rgba(255,248,225,0.20)' });
  c.save(); c.beginPath(); rr(c, ph.x - sw * e, ph.y - sh * e, sw * 2 * e, sh * 2 * e, sr * e); c.clip();
  const k = (sw * 2) / 520, scroll = pageScroll(f);
  c.imageSmoothingQuality = 'high';
  const vis = sh * 2 / k;
  // la página se dibuja en un origen (ox, oy) con kk unidades por unidad de página
  const pageInto = (cc, ox, oy, kk, from, h) => {
    cc.drawImage(PAGE.c, 0, from * PAGE.ps, 520 * PAGE.ps, h * PAGE.ps, ox, oy, 520 * kk, h * kk);
    for (const p of PAGE.photos) {
      if (p.y + p.bh < from || p.y > from + h) continue;
      const g = IMG[p.k], [sx0, sy0, sW, sH] = p.src, s2 = Math.max(p.bw / sW, (p.bh * 1.3) / sH), cw = p.bw / s2, chh = p.bh / s2;
      const u = clamp(((p.y + p.bh / 2) - (scroll + vis / 2)) / vis, -1, 1), sy = sy0 + (sH - chh) * (0.5 + 0.45 * u), sx = sx0 + (sW - cw) / 2;
      const X = ox + p.x * kk, Y = oy + (p.y - from) * kk;
      cc.save(); cc.beginPath(); rr(cc, X, Y, p.bw * kk, p.bh * kk, 28 * kk); cc.clip(); cc.drawImage(g, sx, sy, cw, chh, X, Y, p.bw * kk, p.bh * kk); cc.restore();
    }
  };
  pageInto(c, ph.x - sw, ph.y - sh, k, scroll, vis);
  // encabezado fijo de cristal: se desenfoca en un canvas aparte, sin la órbita de la cámara, y se pega ya transformado
  const hh = 160 * k, pw = Math.round(520 * PAGE.ps), phh = Math.round(160 * PAGE.ps);
  HDR.a.width = pw; HDR.a.height = phh; HDR.b.width = pw; HDR.b.height = phh;
  const ha = HDR.a.getContext('2d', SW), hb = HDR.b.getContext('2d', SW);
  ha.fillStyle = COL.crema; ha.fillRect(0, 0, pw, phh); pageInto(ha, 0, 0, PAGE.ps, scroll, 160);
  hb.fillStyle = COL.crema; hb.fillRect(0, 0, pw, phh);
  hb.filter = `blur(${(26 * PAGE.ps / k).toFixed(2)}px) saturate(140%)`; hb.drawImage(HDR.a, 0, 0); hb.filter = 'none';
  c.save(); c.beginPath(); c.rect(ph.x - sw, ph.y - sh, sw * 2, hh); c.clip();
  c.drawImage(HDR.b, ph.x - sw, ph.y - sh, sw * 2, hh);
  c.fillStyle = 'rgba(255,248,225,0.62)'; c.fillRect(ph.x - sw, ph.y - sh, sw * 2, hh);
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(ph.x - sw, ph.y - sh + hh, sw * 2, 1 / (S * camZoom));
  c.fillStyle = COL.choco; c.font = `700 ${40 * k}px "Baloo 2"`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  kinetic(c, 'MaRe Repostería', ph.x - sw + 136 * k, ph.y - sh + 82 * k, 40 * k, '700', '"Baloo 2"', COL.choco, f, 214, 'rise', null, null, 'left', false);
  kinetic(c, 'Aguascalientes', ph.x - sw + 138 * k, ph.y - sh + 118 * k, 24 * k, '500', '"DM Sans"', '#8A6242', f, 222, 'rise', null, null, 'left', false);
  c.restore();
}
function pageScroll(f) { return 26 * eio(ramp(f, 226, 360)) + 1330 * eio(ramp(f, 585, 742)); }

// tarjetas isométricas de cristal (30°), luz arriba-izquierda
const CARDS = [{ img: 'a03', label: 'MEGA GALLETAS', f: 240, out: 344, pw: 400, crop: [2, 0, 1220, 623] }, { img: 'a06', label: 'BROWNIES', f: 270, out: 350, pw: 290, crop: [0, 60, 576, 600] }, { img: 'a09', label: 'PASTELES', f: 300, out: 356, pw: 400, crop: [0, 0, 1199, 640] }];
function drawCard(c, back, f, i) {
  const cd = CARDS[i], ly = L.cards[i], t = (f - cd.f) / 60; if (t <= 0) return;
  const out = ei(ramp(f, cd.out, cd.out + 22)); if (out >= 1) return;
  const dir = ly.x < DW / 2 ? -1 : 1;
  const s = spring(t * 1.5, 9.5, 5.2), sg = ly.sg, k = ly.k;
  const pw = cd.pw, phh = pw * cd.crop[3] / cd.crop[2], pad = 16, lab = 62, w = pw + pad * 2, h = phh + pad * 2 + lab;
  const depth = (1 - Math.min(1, s)), scale = k * (1 + 0.7 * depth) * (1 + 0.05 * Math.max(0, s - 1) * 4) * (1 + 0.3 * out);
  const cx = ly.x + dir * 950 * out, cy = ly.y - 260 * depth - 180 * out;
  const ax = 0.866, ay = 0.5 * sg * -1;
  // sombra de contacto que crece al aterrizar
  c.save(); c.translate(ly.x + 26, ly.y + h * k * 0.5 + 34); c.scale(1, 0.32);
  const sr = w * k * 0.56 * lerp(0.35, 1, Math.min(1, s)), sgd = c.createRadialGradient(0, 0, 0, 0, 0, sr);
  sgd.addColorStop(0, `rgba(0,0,0,${0.5 * Math.min(1, s) * (1 - out)})`); sgd.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sgd; c.beginPath(); c.arc(0, 0, sr, 0, 7); c.fill(); c.restore();
  c.save(); c.translate(cx, cy); c.transform(ax * scale, ay * scale, 0, scale, 0, 0);
  // grosor: canto del cristal hacia abajo-derecha
  const th = 14;
  for (let j = th; j >= 1; j -= 1) { c.save(); c.translate(-sg * j * 0.5 + j * 0.55, j * 0.9); c.fillStyle = j === th ? 'rgba(20,10,5,0.55)' : `rgba(${200 - j * 5},${170 - j * 5},${140 - j * 5},0.20)`; c.beginPath(); rr(c, -w / 2, -h / 2, w, h, 30); c.fill(); c.restore(); }
  const sheen = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); sheen.addColorStop(0, 'rgba(255,255,255,0.30)'); sheen.addColorStop(0.35, 'rgba(255,255,255,0.05)'); sheen.addColorStop(1, 'rgba(60,30,10,0.12)');
  glass(c, back, (p) => rr(p, -w / 2, -h / 2, w, h, 30), { blur: 34, tint: 'rgba(255,244,222,0.20)', sheen });
  const g = IMG[cd.img];
  c.save(); c.beginPath(); rr(c, -pw / 2, -h / 2 + pad, pw, phh, 18); c.clip(); c.imageSmoothingQuality = 'high';
  c.drawImage(g, ...cd.crop, -pw / 2, -h / 2 + pad, pw, phh); c.restore();
  c.save(); c.beginPath(); rr(c, -pw / 2, -h / 2 + pad, pw, phh, 18); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,0.45)'; c.stroke(); c.restore();
  kinetic(c, cd.label, 0, h / 2 - 24, 40, '800', '"Baloo 2"', COL.crema, f, cd.f + 12, 'rise', null, null, 'center', true);
  c.restore();
}

// ---------- kinetic type por glifo ----------
const LAY = new Map();
function layout(c, text, px, wt, fam) {
  const key = text + px.toFixed(2) + wt + fam; if (LAY.has(key)) return LAY.get(key);
  c.font = `${wt} ${px}px ${fam}`; const g = []; let prev = 0;
  for (let i = 0; i < text.length; i++) { const w = c.measureText(text.slice(0, i + 1)).width; g.push({ ch: text[i], x: prev, w: w - prev }); prev = w; }
  const o = { g, w: prev }; LAY.set(key, o); return o;
}
function kinetic(c, text, x, y, px, wt, fam, color, f, fIn, style, fOut, outStyle, align = 'center', shadow = true) {
  if (f < fIn) return;
  const lay = layout(c, text, px, wt, fam), x0 = align === 'center' ? x - lay.w / 2 : x;
  c.save(); c.font = `${wt} ${px}px ${fam}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  let n = 0;
  lay.g.forEach((gl, i) => {
    if (gl.ch === ' ') return;
    const st = 1.5 * n; n++;              // 25 ms entre glifos
    const t = (f - fIn - st) / 60; if (t < 0) return;
    let dx = 0, dy = 0, sx = 1, sy = 1, rot = 0, clipY = null, r = rng(i * 131 + text.length * 7);
    if (style === 'drop') { const s = spring(t * 1.9, 12, 5); dy = -px * 2.4 * (1 - Math.min(1, s)) - px * 0.10 * Math.max(0, s - 1) * -4; const q = Math.max(0, s - 1); sy = 1 - q * 0.9; sx = 1 + q * 0.7; rot = (r() - 0.5) * 0.5 * (1 - Math.min(1, s)); }
    else if (style === 'rise') { const s = eo(t / 0.26); dy = px * 1.05 * (1 - s); clipY = true; }
    else if (style === 'burst') { const s = spring(t * 1.8, 10, 4.6); sx = sy = s; dy = px * 0.25 * (1 - Math.min(1, s)); rot = (r() - 0.5) * 0.7 * (1 - Math.min(1, s)); }
    if (fOut != null && f >= fOut) {
      const u = (f - fOut - st * 0.6) / 60;
      if (u > 0) {
        if (outStyle === 'fall') { dy += 2600 * u * u + 300 * u; rot += (r() - 0.5) * 6 * u; dx += (r() - 0.5) * 500 * u; }
        else if (outStyle === 'sink') { dy += px * 1.2 * ei(u / 0.22); clipY = true; }
        else if (outStyle === 'shrink') { const q = 1 - ei(u / 0.2); sx *= q; sy *= q; }
      }
    }
    if (sx <= 0.001) return;
    c.save();
    if (clipY) { c.beginPath(); c.rect(x0 + gl.x - px * 0.2, y - px * 1.05, gl.w + px * 0.4, px * 1.3); c.clip(); }
    c.translate(x0 + gl.x + gl.w / 2 + dx, y + dy); c.rotate(rot); c.translate(0, -px * 0.32); c.scale(sx, sy); c.translate(0, px * 0.32);
    if (shadow) { c.fillStyle = 'rgba(20,9,4,0.55)'; c.fillText(gl.ch, -gl.w / 2 + px * 0.022, px * 0.045); }
    c.fillStyle = color; c.fillText(gl.ch, -gl.w / 2, 0);
    c.restore();
  });
  c.restore();
}
function drawType(c, f) {
  // en espacio de pantalla (no sigue el temblor de la cámara)
  c.setTransform(S, 0, 0, S, 0, 0);
  const B = '"Baloo 2"';
  kinetic(c, 'LO MEJOR', L.t1.x, L.t1.y, L.t1.px, '800', B, COL.crema, f, 30, 'drop', 150, 'shrink');
  const wE = layout(c, 'ESTÁ ', L.t2.px, '800', B).w, wA = layout(c, 'ADENTRO', L.t2.px, '800', B).w, x0 = L.t2.x - (wE + wA) / 2;
  kinetic(c, 'ESTÁ', x0, L.t2.y, L.t2.px, '800', B, COL.rosa, f, 73, 'burst', 154, 'shrink', 'left');
  kinetic(c, 'ADENTRO', x0 + wE, L.t2.y, L.t2.px, '800', B, COL.rosa, f, 86, 'rise', 156, 'sink', 'left');
  if (FMT !== '916') return;
  const cr = COL.crema, ro = COL.rosa;
  line(c, f, [['5', 372, 'burst', cr], ['SELLOS', 399, 'rise', cr]], 540, 420, 130, '800', B, 548, 'shrink');
  line(c, f, [['20 %', 452, 'drop', ro]], 540, 640, 180, '800', B, 548, 'shrink');
  line(c, f, [['TU', 668, 'drop', cr], ['PROPIA', 678, 'rise', cr]], 540, 400, 120, '800', B, 742, 'sink');
  line(c, f, [['PÁGINA', 697, 'burst', ro]], 540, 548, 140, '800', B, 742, 'sink');
  line(c, f, [['ELIGE', 762, 'drop', cr], ['TU', 782, 'burst', cr], ['CAJITA', 792, 'rise', ro]], 540, 400, 98, '800', B, 826, 'sink');
  line(c, f, [['ELIGE', 835, 'rise', cr]], 540, 400, 98, '800', B, 922, 'shrink');
  line(c, f, [['TUS', 864, 'drop', ro], ['TOPPINGS', 878, 'burst', ro]], 540, 530, 118, '800', B, 922, 'shrink');
  line(c, f, [['POR', 979, 'rise', cr], ['WHATSAPP', 989, 'burst', ro]], 540, 470, 108, '800', B, 1020, 'sink');
  line(c, f, [['MaRe', 1038, 'drop', ro], ['Repostería', 1065, 'rise', cr]], 540, 1430, 100, '800', B, 1184, 'sink');
  line(c, f, [['Aguascalientes', 1118, 'rise', COL.kraft]], 540, 1516, 56, '700', '"DM Sans"', 1184, 'sink');
}


// ---------- piezas de las escenas 6–23 s ----------
function scallop(c, x, y, r, n = 16, amp = 0.055) {
  for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2, rr2 = r * (1 + amp * Math.cos(n * a)); const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2; i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.closePath();
}
function zig(c, x, y, w, h, n, lw, color) {
  c.save(); c.lineWidth = lw; c.lineCap = c.lineJoin = 'round'; c.strokeStyle = color; c.beginPath();
  for (let i = 0; i <= n; i++) { const px = x - w / 2 + w * i / n, py = y + (i % 2 ? h / 2 : -h / 2); i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.stroke(); c.restore();
}
function slab(c, back, w, h, r, f, tint, th = 14) {
  // canto con grosor hacia abajo-derecha + cristal
  for (let j = th; j >= 1; j--) { c.save(); c.translate(j * 0.55, j * 0.9); c.fillStyle = j === th ? 'rgba(20,10,5,0.5)' : `rgba(${200 - j * 5},${170 - j * 5},${140 - j * 5},0.18)`; c.beginPath(); rr(c, -w / 2, -h / 2, w, h, r); c.fill(); c.restore(); }
  const sheen = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); sheen.addColorStop(0, 'rgba(255,255,255,0.28)'); sheen.addColorStop(0.4, 'rgba(255,255,255,0.04)'); sheen.addColorStop(1, 'rgba(60,30,10,0.14)');
  glass(c, back, (p) => rr(p, -w / 2, -h / 2, w, h, r), { blur: 34, tint, sheen });
}
function tiltIn(c, cx, cy, s, out, dyIn = 700, outTo = [0, -900]) {
  const d = 1 - Math.min(1, s), tl = d + out;
  c.translate(cx + outTo[0] * out, cy + dyIn * d + outTo[1] * out);
  c.rotate(-0.22 * tl); c.transform(1, -0.18 * tl, -0.35 * tl, 1 - 0.2 * tl, 0, 0);
  const k = (1 + 0.05 * Math.max(0, s - 1) * 4) * (1 - 0.55 * out); c.scale(k, k);
}
function contact(c, x, y, w, a) {
  c.save(); c.translate(x, y); c.scale(1, 0.28); const g = c.createRadialGradient(0, 0, 0, 0, 0, w);
  g.addColorStop(0, `rgba(0,0,0,${0.55 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, w, 0, 7); c.fill(); c.restore();
}

// tarjeta de lealtad reconstruida en código (asset 12 solo como referencia de estructura)
function drawLoyalty(c, back, f) {
  const t = (f - 364) / 60; if (t <= 0) return;
  const s = spring(t * 1.4, 9, 5.2), out = eio(ramp(f, 548, 574)); if (out >= 1) return;
  const W2 = 900, H2 = 520, cx = 540, cy = FMT === '11' ? 560 : 1060;
  contact(c, cx + 30, cy + H2 / 2 + 50, W2 * 0.55 * lerp(0.3, 1, Math.min(1, s)), Math.min(1, s) * (1 - out));
  c.save(); tiltIn(c, cx, cy, s, out, 760, [0, -1000]);
  slab(c, back, W2, H2, 42, f, 'rgba(46,24,16,0.42)');
  zig(c, -380, -182, 54, 20, 4, 6, COL.rosa); zig(c, 380, -182, 54, 20, 4, 6, COL.rosa);
  kinetic(c, 'TARJETA DE LEALTAD', 0, -164, 50, '800', '"Baloo 2"', COL.crema, f, 372, 'rise', null, null, 'center', true);
  for (let i = 0; i < 5; i++) {
    const x = -300 + i * 150, y = 6;
    c.save(); c.beginPath(); c.arc(x, y, 60, 0, 7); c.fillStyle = 'rgba(30,16,10,0.30)'; c.fill();
    c.setLineDash([7, 9]); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,248,225,0.45)'; c.stroke(); c.restore();
    const fs = 390 + i * 15, u = (f - fs) / 60; if (u < -0.05) continue;
    const fall = clamp(1 + u / 0.05), sp = u > 0 ? spring(u * 2.2, 13, 6) : 0;
    let k = u <= 0 ? lerp(2.2, 1, fall) : 1 + 0.18 * Math.max(0, 1 - sp) * (u < 0.12 ? 1 : 0) - 0.12 * Math.exp(-u * 30);
    const badge = i === 4 ? eio(ramp(f, 452, 470)) : 0;
    k *= 1 + 0.32 * badge + 0.1 * Math.sin(Math.PI * ramp(f, 452, 470));
    c.save(); c.translate(x, y); c.scale(k, k);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 18 * S * (u > 0 ? 1 : 2.5); c.shadowOffsetY = 8 * S * (u > 0 ? 1 : 3);
    const g = c.createRadialGradient(-18, -22, 4, 0, 0, 66);
    const top = badge > 0 ? mix3(C_ROSA, hex3(COL.choco), badge) : C_ROSA, rgb = (a, m) => `rgb(${a.map((v) => Math.round(v * 255 * m)).join(',')})`;
    g.addColorStop(0, rgb(top, 1.12)); g.addColorStop(0.7, rgb(top, 1)); g.addColorStop(1, rgb(top, 0.78));
    c.fillStyle = g; c.beginPath(); scallop(c, 0, 0, 58, 14, 0.06); c.fill(); c.restore();
    c.lineWidth = 3; c.strokeStyle = badge > 0 ? `rgba(228,139,176,${badge})` : 'rgba(255,255,255,0.35)'; c.beginPath(); scallop(c, 0, 0, 48, 14, 0.06); c.stroke();
    if (badge < 0.5) zig(c, 0, 2, 50, 18, 4, 6, `rgba(255,248,225,${1 - badge * 2})`);
    if (i === 4 && f >= 454) kinetic(c, '20 %', 0, 15, 38, '800', '"Baloo 2"', COL.crema, f, 454, 'burst', null, null, 'center', false);
    c.restore();
  }
  kinetic(c, 'Cada 5 sellos: 20 % de descuento en tu siguiente compra', 0, 160, 28, '500', '"DM Sans"', 'rgba(255,248,225,0.9)', f, 380, 'rise', null, null, 'center', false);
  c.restore();
}

// cajita y toppings
const CHIPS = [{ k: 'a06', src: [60, 330, 420, 360] }, { k: 'a07', src: [40, 230, 330, 330] }, { k: 'a08', src: [200, 300, 360, 360] }];
function drawCajita(c, back, f) {
  const t = (f - 752) / 60; if (t <= 0) return;
  const s = spring(t * 1.4, 9, 5.2), out = ei(ramp(f, 922, 950)); if (out >= 1) return;
  const cx = 540, cy = FMT === '11' ? 560 : 1100, pw = 560, phh = pw * 876 / 826, pad = 18, w = pw + pad * 2, h = phh + pad * 2;
  contact(c, cx + 30, cy + h / 2 + 46, w * 0.6 * lerp(0.3, 1, Math.min(1, s)), Math.min(1, s) * (1 - out));
  c.save(); tiltIn(c, cx, cy, s, out, 760, [0, 260]);
  slab(c, back, w, h, 36, f, 'rgba(255,244,222,0.18)');
  c.save(); c.beginPath(); rr(c, -pw / 2, -phh / 2, pw, phh, 22); c.clip(); c.imageSmoothingQuality = 'high';
  c.drawImage(IMG.a05, 120, 160, 826, 876, -pw / 2, -phh / 2, pw, phh); c.restore();
  c.save(); c.beginPath(); rr(c, -pw / 2, -phh / 2, pw, phh, 22); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,0.45)'; c.stroke(); c.restore();
  CHIPS.forEach((ch, i) => {
    const fi = 842 + i * 6, fd = 880 + i * 15; if (f < fi) return;
    const a0 = [-2.4, -0.7, 0.9][i], orb = (f - fi) / 60, ang = a0 + orb * 1.6, inn = eo(ramp(f, fi, fi + 18));
    let x = Math.cos(ang) * 430 * lerp(1.8, 1, inn), y = Math.sin(ang) * 400 * lerp(1.8, 1, inn) - 40, k = 1;
    const tx = (i - 1) * 140, ty = 90 + (i === 1 ? -40 : 0);
    if (f >= fd - 10) {
      const d = eio(ramp(f, fd - 10, fd)), ux = x, uy = y;
      x = lerp(ux, tx, d); y = lerp(uy, ty, d) - 160 * Math.sin(Math.PI * d) * 0.6; k = lerp(1, 0.62, d);
      if (f >= fd) { const b = (f - fd) / 60; k = 0.62 * (1 + 0.16 * Math.exp(-b * 14) * Math.cos(b * 40)); }
    }
    const r = 82 * k, g = IMG[ch.k];
    c.save(); c.translate(x, y);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20 * S; c.shadowOffsetX = 6 * S; c.shadowOffsetY = 12 * S;
    c.fillStyle = COL.crema; c.beginPath(); c.arc(0, 0, r + 5, 0, 7); c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(0, 0, r, 0, 7); c.clip(); c.drawImage(g, ...ch.src, -r, -r, r * 2, r * 2); c.restore();
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(0, 0, r + 5, 0, 7); c.stroke();
    c.restore();
  });
  c.restore();
}

// botón de cristal con icono de WhatsApp
function waIcon(c, x, y, r) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#25D366'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = r * 0.11; c.beginPath(); c.arc(0, 0, r * 0.58, Math.PI * 0.78, Math.PI * 2.62); c.lineTo(-r * 0.62, r * 0.62); c.closePath(); c.stroke();
  c.fillStyle = '#fff'; c.rotate(-0.75); c.beginPath(); rr(c, -r * 0.27, -r * 0.08, r * 0.54, r * 0.16, r * 0.08); c.fill();
  c.beginPath(); rr(c, -r * 0.33, -r * 0.15, r * 0.16, r * 0.3, r * 0.07); c.fill(); c.beginPath(); rr(c, r * 0.17, -r * 0.15, r * 0.16, r * 0.3, r * 0.07); c.fill();
  c.restore();
}
const BTN = () => ({ x: 540, y: FMT === '11' ? 860 : 1385, w: 680, h: 136 });
function drawButton(c, back, f) {
  const t = (f - 934) / 60; if (t <= 0) return;
  const out = ei(ramp(f, 1016, 1036)); if (out >= 1) return;
  const b = BTN(), s = spring(t * 1.7, 10, 5);
  let k = Math.max(0, s) * (1 - out);
  k *= 1 - 0.07 * Math.sin(Math.PI * ramp(f, 989, 1001));
  for (const kk of [960, 990, 1020]) if (f >= kk) k *= 1 + 0.025 * Math.exp(-(f - kk) / 5);
  if (k <= 0.01) return;
  if (f >= 990 && f < 1024) { const u = ramp(f, 990, 1024); c.save(); c.lineWidth = 10 * (1 - u); c.strokeStyle = `rgba(228,139,176,${0.8 * (1 - u)})`; c.beginPath(); rr(c, b.x - b.w / 2 - 160 * eo(u), b.y - b.h / 2 - 160 * eo(u), b.w + 320 * eo(u), b.h + 320 * eo(u), b.h / 2 + 160 * eo(u)); c.stroke(); c.restore(); }
  contact(c, b.x + 20, b.y + b.h / 2 + 34, b.w * 0.5 * k, k);
  c.save(); c.translate(b.x, b.y); c.scale(k, k);
  slab(c, back, b.w, b.h, b.h / 2, f, 'rgba(228,139,176,0.46)', 10);
  waIcon(c, -b.w / 2 + 82, 0, 44);
  const lay = (w) => layout(c, w, 56, '800', '"Baloo 2"').w, sp = lay(' ');
  const ws = [['HAZ', 936], ['TU', 946], ['PEDIDO', 955]], tot = ws.reduce((a, w) => a + lay(w[0]), 0) + sp * 2;
  let xx = 44 - tot / 2;
  for (const [w, fi] of ws) { kinetic(c, w, xx, 20, 56, '800', '"Baloo 2"', COL.crema, f, fi, 'rise', null, null, 'left', true); xx += lay(w) + sp; }
  c.restore();
}
function underline(f) {
  // la línea de chocolate como subrayado del botón y, al final, de "desde $1,000 pesos"
  const b = BTN();
  if (f >= 944 && f < 1040) {
    const g = eo(ramp(f, 944, 972)), r0 = ei(ramp(f, 1014, 1036));
    let r = 8; for (const kk of [960, 990, 1020]) if (f >= kk) r *= 1 + 0.5 * Math.exp(-(f - kk) / 5);
    const x0 = b.x - 290, len = 580;
    return [x0 + len * r0, b.y + b.h / 2 + 44, x0 + len * g, r];
  }
  if (f >= 1286) {
    const w = layout(mc, 'desde $1,000 pesos', 104, '800', '"Baloo 2"').w, g = eo(ramp(f, 1289, 1312)), y = END.y2 + 30;
    return [540 - w / 2 * g, y, 540 + w / 2 * g, 7 * (1 + 0.4 * Math.exp(-Math.max(0, f - 1300) / 6))];
  }
  return [0, 0, 0, 0];
}

// end card
const END = { plate: 560, y1: 880, y2: 1010, y3: 1092, y4: 1222, y5: 1312, y6: 1420, y7: 1500 };
let PLATE = 'rgb(255,250,236)';
function drawEnd(c, f) {
  if (f < 1198) return;
  const s = spring(((f - 1200) / 60) * 1.6, 10, 5.4), pw = 520, ph2 = pw * 401 / 734;
  c.save(); c.translate(540, END.plate + 260 * (1 - Math.min(1, s))); c.scale(Math.max(0, s), Math.max(0, s)); c.rotate(-0.05 * (1 - Math.min(1, s)));
  c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 50 * S; c.shadowOffsetY = 24 * S;
  c.fillStyle = PLATE; c.beginPath(); rr(c, -pw / 2 - 34, -ph2 / 2 - 30, pw + 68, ph2 + 60, 44); c.fill(); c.restore();
  c.imageSmoothingQuality = 'high'; c.drawImage(IMG.a01, 0, 0, 734, 401, -pw / 2, -ph2 / 2, pw, ph2);
  c.restore();
  const B = '"Baloo 2"', D = '"DM Sans"';
  kinetic(c, 'Precios accesibles', 540, END.y1, 46, '700', D, COL.crema, f, 1206, 'rise', null, null, 'center', false);
  kinetic(c, 'desde $1,000 pesos', 540, END.y2, 104, '800', B, COL.rosa, f, 1270, 'drop', null, null, 'center', true);
  kinetic(c, 'por tu página', 540, END.y3, 46, '700', D, COL.crema, f, 1232, 'rise', null, null, 'center', false);
  kinetic(c, 'Paquete de 3 videos promocionales', 540, END.y4, 38, '700', D, COL.crema, f, 1300, 'rise', null, null, 'center', false);
  kinetic(c, '$1,500', 540, END.y5, 72, '800', B, COL.rosa, f, 1310, 'burst', null, null, 'center', true);
  kinetic(c, 'Elevate Negocios · Aguascalientes', 540, END.y6, 44, '700', B, COL.kraft, f, 1222, 'rise', null, null, 'center', false);
  kinetic(c, 'Demo de cortesía de Elevate Negocios · pieza no oficial', 540, END.y7, 26, '500', D, 'rgba(255,248,225,0.62)', f, 1200, 'rise', null, null, 'center', false);
}

// palabras con coreografía propia, centradas como línea
function line(c, f, list, x, y, px, wt, fam, fOut, outStyle) {
  const sp = layout(c, ' ', px, wt, fam).w, ws = list.map((w) => layout(c, w[0], px, wt, fam).w);
  let xx = x - (ws.reduce((a, b) => a + b, 0) + sp * (list.length - 1)) / 2;
  list.forEach((w, i) => { kinetic(c, w[0], xx, y, px, wt, fam, w[3], f, w[1], w[2], fOut, outStyle, 'left', true); xx += ws[i] + sp; });
}

// ---------- cuadro ----------
const main = mk(W, H), mc = main.getContext('2d', SW);
const snap = mk(W, H), sc2 = snap.getContext('2d', SW);
const acc = mk(W, H), ac = acc.getContext('2d', SW);
let camZoom = 1;
function scene(f) {
  const c = mc, cam = camera(f); camZoom = cam.zoom;
  drawBG(c, cam);
  applyCam(c, cam);
  drawSheet(c, f);
  const fs0 = fieldState(f, cam);
  if (drawField(fs0, cam)) { c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(glc, 0, 0); applyCam(c, cam); }
  c.save(); applyPT(c, f); stampLogo(c, f); c.restore();
  const grab = () => { sc2.setTransform(1, 0, 0, 1, 0, 0); sc2.drawImage(main, 0, 0); };
  if (f > 186 && PH_OPEN(f) > 0) { grab(); applyCam(c, cam); c.save(); applyPT(c, f); drawPhone(c, snap, f); stampLogo(c, f); c.restore(); }
  for (let i = 0; i < 3; i++) if (f > CARDS[i].f && f < CARDS[i].out + 24) { grab(); applyCam(c, cam); drawCard(c, snap, f, i); }
  if (f > 364 && f < 576) { grab(); applyCam(c, cam); drawLoyalty(c, snap, f); }
  if (f > 752 && f < 952) { grab(); applyCam(c, cam); drawCajita(c, snap, f); }
  if (f > 934 && f < 1040) { grab(); applyCam(c, cam); drawButton(c, snap, f); }
  applyCam(c, cam); drawEnd(c, f);
  const u = underline(f);
  if (u[3] > 0) { const st = { pts: [], drops: [], m1: 0, m2: 0, sc: [0, 0, 0, 0], box: [0, 0, 1, 1], boxR: [0, 0], ba: [1, 0, 0, 1], bs: 1, u, col: C_CHOCO, bevel: 7, spec: 0.8 };
    if (drawField(st, cam)) { c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(glc, 0, 0); } }
  drawType(c, f);
  // viñeta y grano fijos
  c.setTransform(1, 0, 0, 1, 0, 0);
  const v = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.34)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
}
window.renderFrame = (f, { sub = 8, shutter = 0.5 } = {}) => {
  ac.setTransform(1, 0, 0, 1, 0, 0); ac.globalAlpha = 1;
  for (let k = 0; k < sub; k++) {
    scene(f + ((k + 0.5) / sub - 0.5) * shutter * 2);
    ac.globalAlpha = 1 / (k + 1); ac.drawImage(main, 0, 0);
  }
  ac.globalAlpha = 1;
  return acc.toDataURL('image/png');
};

(async () => {
  try {
    const A = '/assets/';
    await Promise.all([
      loadImg('a02', A + '02_galletas_sobre_kraft.jpg'), loadImg('a03', A + '03_mega_galletas_corte.jpg'), loadImg('a04', A + '04_monster_cookie_corte.jpg'),
      loadImg('a05', A + '05_cajita_de_galletas.jpg'), loadImg('a06', A + '06_brownies_ganache.jpg'), loadImg('a07', A + '07_brookie_corte.jpg'),
      loadImg('a08', A + '08_lemonies.jpg'), loadImg('a09', A + '09_pasteles_pistache_frambuesa_y_sacher.jpg'), loadImg('a10', A + '10_cuchareable_frambuesa.jpg'),
      loadImg('a11', A + '11_logo_sello_rosa_MaRe.jpg'), loadImg('a01', A + '01_logo_MaRe_reposteria.jpg'),
      ...[['Baloo 2', '700', 'baloo-2-latin-700-normal'], ['Baloo 2', '800', 'baloo-2-latin-800-normal'], ['DM Sans', '500', 'dm-sans-latin-500-normal'], ['DM Sans', '700', 'dm-sans-latin-700-normal']]
        .map(async ([fam, wt, file]) => { const ff = new FontFace(fam, `url(/video/fonts/${file}.woff2)`, { weight: wt }); await ff.load(); document.fonts.add(ff); }),
    ]);
    TEX = { kraft: paperTex(COL.kraft, 11, 5200, false), dark: paperTex('rgba(0,0,0,0)', 23, 3800, true), noise: noiseTex() };
    PAGE = buildPage();
    { const t = mk(4, 4), x = t.getContext('2d'); x.drawImage(IMG.a01, 6, 6, 4, 4, 0, 0, 4, 4); const d = x.getImageData(1, 1, 1, 1).data; PLATE = `rgb(${d[0]},${d[1]},${d[2]})`; }
    const out = document.getElementById('out'); out.width = W; out.height = H;
    window.ready = true;
  } catch (e) { window.initError = String(e && e.stack || e); }
})();
