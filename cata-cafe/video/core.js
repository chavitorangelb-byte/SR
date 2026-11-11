// Núcleo compartido: tiempo, cámara única, campo líquido (SDF en WebGL), cristal con blur real y texto por glifo.
'use strict';
const Q = new URLSearchParams(location.search);
const FMT = Q.get('fmt') || '916';
const W = +(Q.get('w') || 540), H = +(Q.get('h') || (FMT === '916' ? 960 : 540));
const DW = 1080, DH = FMT === '916' ? 1920 : 1080, S = W / DW;
const V = FMT === '916';

const COL = { bg: '#120E0B', terra: '#B65832', terraD: '#7A3116', terraL: '#E08A55', crema: '#FBF3D5', kraft: '#B89468', cafe: '#3A1E10' };
const SG = '"Space Grotesk"', IN = 'Inter';

// ---------- tiempo y curvas ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (f, a, b) => clamp((f - a) / (b - a));
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = (t) => 1 - Math.pow(1 - t, 3);
const eo5 = (t) => 1 - Math.pow(1 - t, 5);
const ei = (t) => t * t * t;
const back = (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mixc = (a, b, t) => { // mezcla de colores '#rrggbb'
  const p = (h, i) => parseInt(h.substr(1 + i * 2, 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(lerp(p(a, i), p(b, i), t))).join(',')})`;
};
const rgba = (hex, a) => `rgba(${parseInt(hex.substr(1, 2), 16)},${parseInt(hex.substr(3, 2), 16)},${parseInt(hex.substr(5, 2), 16)},${a})`;

// ---------- cámara única: matriz afín página → cuadro ----------
const C30 = Math.cos(Math.PI / 6);
const flat = (cx, cy, z, sy = DH / 2) => [z, 0, 0, z, DW / 2 - cx * z, sy - cy * z];
const iso = (X0, Y0, s) => [s * C30, s * 0.5, 0, s, X0, Y0];
let CAMKEYS = []; // [f, matriz, curva]
function camAt(f) {
  const K = CAMKEYS;
  if (f <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) {
    if (f <= K[i][0]) { const t = (K[i][2] || eio)(seg(f, K[i - 1][0], K[i][0])); return K[i][1].map((v, j) => lerp(K[i - 1][1][j], v, t)); }
  }
  return K[K.length - 1][1];
}
const P = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const zoomOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

// ---------- lienzos ----------
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const out = document.getElementById('out'); out.width = W; out.height = H;
const octx = out.getContext('2d');
const cA = mk(W, H), A = cA.getContext('2d');   // subcuadro
const cB = mk(W, H), B = cB.getContext('2d');   // fondo (lo que el cristal desenfoca)
const BLQ = 4;                                   // el blur se calcula a 1/4 de resolución
const cBb = mk(Math.ceil(W / BLQ), Math.ceil(H / BLQ)), Bb = cBb.getContext('2d');
const cBb2 = mk(cBb.width, cBb.height), Bb2 = cBb2.getContext('2d');
const cGL = mk(W, H);
const noise = mk(256, 256);
{ const n = noise.getContext('2d'), d = n.createImageData(256, 256); for (let i = 0; i < 65536; i++) { const v = Math.floor(hash(i * 1.37) * 255); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } n.putImageData(d, 0, 0); }

let setM = (c, m) => c.setTransform(m[0] * S, m[1] * S, m[2] * S, m[3] * S, m[4] * S, m[5] * S);
let setD = (c) => c.setTransform(S, 0, 0, S, 0, 0); // coordenadas de diseño (1080 de ancho)

function blurInto(dst, dctx, src, px) {
  dctx.setTransform(1, 0, 0, 1, 0, 0);
  dctx.filter = `blur(${(px * S) / BLQ}px) saturate(1.4)`;
  dctx.drawImage(src, 0, 0, dst.width, dst.height);
  dctx.filter = 'none';
}

// ---------- campo líquido (WebGL): fondo, ondas y SDF con unión suave ----------
const gl = cGL.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
const NR = 8, NB = 20, NC = 8;
const FS = `precision highp float;
uniform vec2 uPx; uniform vec2 uD; uniform float uT;
uniform vec4 uRip[${NR}]; uniform vec3 uBlob[${NB}]; uniform vec4 uCap[${NC}]; uniform float uCapR[${NC}];
uniform vec4 uBox; uniform vec3 uBoxP; uniform vec4 uGlow[4];
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x), mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x), f.y); }
float hgt(vec2 p){ float h=0.;
  for(int i=0;i<${NR};i++){ vec4 r=uRip[i]; if(r.w<=0.) continue; float d=length(p-r.xy); float fr=r.z*7.5;
    float e=exp(-pow((d-fr)/(40.+r.z*0.9),2.)); h+=r.w*sin((d-fr)*0.075)*e*exp(-r.z/55.); }
  return h; }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float sdBox(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
float sdCap(vec2 p, vec2 a, vec2 b, float r){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.); return length(pa-ba*h)-r; }
float field(vec2 p){ float d=1e5;
  for(int i=0;i<${NB};i++){ vec3 b=uBlob[i]; if(b.z<=0.) continue; d=smin(d, length(p-b.xy)-b.z, 26.); }
  for(int i=0;i<${NC};i++){ if(uCapR[i]<=0.) continue; d=smin(d, sdCap(p,uCap[i].xy,uCap[i].zw,uCapR[i]), 22.); }
  if(uBoxP.y>0.){ d=smin(d, abs(sdBox(p-uBox.xy,uBox.zw,uBoxP.x))-uBoxP.y, 14.); }
  return d; }
void main(){
  vec2 p=vec2(gl_FragCoord.x, uPx.y-gl_FragCoord.y)/uPx*uD;
  vec3 col=vec3(0.0706,0.0549,0.0431);
  float n=vn(p*0.0021+vec2(uT*0.004,-uT*0.003))*.6+vn(p*0.0052-vec2(uT*0.006,0.))*.4;
  col+=vec3(0.085,0.040,0.018)*smoothstep(0.35,0.95,n);
  col+=vec3(0.07,0.035,0.016)*exp(-length((p-vec2(0.,0.))/uD)*2.6);
  for(int i=0;i<4;i++){ vec4 g=uGlow[i]; if(g.w<=0.) continue; float d=length(p-g.xy)/g.z; col+=vec3(0.71,0.345,0.196)*g.w*exp(-d*d*2.2); }
  float e=1.5; float h0=hgt(p); vec2 dh=vec2(hgt(p+vec2(e,0.))-h0, hgt(p+vec2(0.,e))-h0)/e;
  float lit=dot(dh, vec2(-0.7,-0.7));
  col+=vec3(0.98,0.72,0.48)*max(lit,0.)*1.5; col*=1.-clamp(-lit*1.6,0.,0.55);
  float d=field(p);
  if(d<3.){
    vec2 g=vec2(field(p+vec2(1.5,0.))-d, field(p+vec2(0.,1.5))-d)/1.5;
    float inner=clamp(-d/14.,0.,1.);
    vec3 nrm=normalize(vec3(g*(1.-inner*0.75), 0.55+inner));
    vec3 L=normalize(vec3(-0.55,-0.65,0.6));
    float df=max(dot(nrm,L),0.);
    float sp=pow(max(dot(reflect(-L,nrm),vec3(0.,0.,1.)),0.),26.);
    vec3 liq=mix(vec3(0.26,0.10,0.04), vec3(0.74,0.36,0.19), df)+vec3(1.,0.86,0.68)*sp*0.9;
    liq=mix(liq, vec3(0.16,0.06,0.03), smoothstep(-3.5,0.,d)*0.6);
    col=mix(col, liq, smoothstep(1.2,-1.2,d));
  }
  float vg=length((p/uD-.5)*vec2(1.,1.15)); col*=1.-smoothstep(0.45,1.05,vg)*0.55;
  gl_FragColor=vec4(col,1.);
}`;
let glU = null;
(function initGL() {
  if (!gl) { window.initError = 'WebGL no disponible'; return; }
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) window.initError = gl.getShaderInfoLog(o); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(pr, n);
  glU = { px: u('uPx'), d: u('uD'), t: u('uT'), rip: u('uRip'), blob: u('uBlob'), cap: u('uCap'), capR: u('uCapR'), box: u('uBox'), boxP: u('uBoxP'), glow: u('uGlow') };
})();
// st: { rip:[[x,y,edad,amp]], blobs:[[x,y,r]], caps:[[ax,ay,bx,by,r]], box:{x,y,hw,hh,r,th}, glows:[[x,y,radio,fuerza]] } en coordenadas de diseño
function drawField(f, st) {
  const fill = (arr, n, k) => { const a = new Float32Array(n * k); arr.slice(0, n).forEach((v, i) => a.set(v.slice(0, k), i * k)); return a; };
  gl.viewport(0, 0, W, H);
  gl.uniform2f(glU.px, W, H); gl.uniform2f(glU.d, DW, DH); gl.uniform1f(glU.t, f);
  gl.uniform4fv(glU.rip, fill(st.rip, NR, 4)); gl.uniform3fv(glU.blob, fill(st.blobs, NB, 3));
  gl.uniform4fv(glU.cap, fill(st.caps, NC, 4));
  const cr = new Float32Array(NC); st.caps.slice(0, NC).forEach((c, i) => (cr[i] = c[4])); gl.uniform1fv(glU.capR, cr);
  const b = st.box || { x: 0, y: 0, hw: 0, hh: 0, r: 0, th: 0 };
  gl.uniform4f(glU.box, b.x, b.y, b.hw, b.hh); gl.uniform3f(glU.boxP, b.r, b.th, 0);
  gl.uniform4fv(glU.glow, fill(st.glows, 4, 4));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ---------- formas ----------
function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.roundRect(x, y, w, h, r); }

// Panel de cristal. `m` es la matriz vigente (página o diseño). Desenfoca de verdad lo que hay en `blurSrc`.
function glass(c, m, x, y, w, h, r, o = {}) {
  if (w < 2 || h < 2) return;
  const z = zoomOf(m);
  c.save(); setM(c, m); rr(c, x, y, w, h, r); c.clip();
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingQuality = 'high';
  c.drawImage(o.src || cBb, 0, 0, W, H);
  setM(c, m);
  c.fillStyle = o.tint || 'rgba(251,243,213,0.075)'; c.fillRect(x, y, w, h);
  const g = c.createLinearGradient(x, y, x + w * 0.5, y + h);
  g.addColorStop(0, 'rgba(255,246,225,0.16)'); g.addColorStop(0.35, 'rgba(255,246,225,0.03)'); g.addColorStop(1, 'rgba(0,0,0,0.10)');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.045; c.globalCompositeOperation = 'overlay';
  c.fillStyle = c.createPattern(noise, 'repeat'); c.fillRect(0, 0, W, H);
  c.restore();
  // borde de 1 px y brillo de canto arriba-izquierda
  c.save(); setM(c, m); const lw = 1 / (z * S) * Math.max(1, S * 1.6);
  rr(c, x, y, w, h, r); c.lineWidth = lw; c.strokeStyle = o.border || 'rgba(251,243,213,0.30)'; c.stroke();
  const hg = c.createLinearGradient(x, y, x + w * 0.6, y + h * 0.6);
  hg.addColorStop(0, 'rgba(255,250,235,0.75)'); hg.addColorStop(0.3, 'rgba(255,250,235,0)');
  rr(c, x + lw, y + lw, w - 2 * lw, h - 2 * lw, r - lw); c.strokeStyle = hg; c.lineWidth = lw * 1.4; c.stroke();
  c.restore();
}
function shadow(c, m, x, y, w, h, r, k = 1) { // sombra de contacto hacia abajo-derecha (luz arriba-izquierda)
  if (w < 2 || h < 2) return;
  c.save(); setM(c, m); c.filter = `blur(${22 * k * zoomOf(m) * S}px)`; c.fillStyle = 'rgba(0,0,0,0.55)';
  rr(c, x + 10 * k, y + 18 * k, w, h, r); c.fill(); c.restore();
}

// ---------- trazo: línea de café con volumen ----------
// pts: [[x,y],...] ya suavizados; a..b: tramo visible en longitud de arco (px)
function prepPath(raw, step = 6) { // Catmull-Rom → polilínea con longitudes acumuladas
  const pts = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const p0 = raw[Math.max(0, i - 1)], p1 = raw[i], p2 = raw[i + 1], p3 = raw[Math.min(raw.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      pts.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  pts.push(raw[raw.length - 1].slice());
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, L, len: L[L.length - 1], raw };
}
function pointAt(path, s) {
  const { pts, L } = path; s = clamp(s, 0, path.len);
  let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L[mid] <= s) lo = mid; else hi = mid; }
  const t = (s - L[lo]) / Math.max(1e-6, L[hi] - L[lo]);
  return [lerp(pts[lo][0], pts[hi][0], t), lerp(pts[lo][1], pts[hi][1], t)];
}
function lenAtIndex(path, rawIdx) { // longitud de arco en el punto de control rawIdx
  const p = path.raw[rawIdx]; let best = 0, bd = 1e9;
  path.pts.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = i; } });
  return path.L[best];
}
function stroke(c, m, path, a, b, width, o = {}) {
  if (b - a < 0.5) return null;
  const { pts, L } = path; const sub = [pointAt(path, a)];
  for (let i = 0; i < pts.length; i++) if (L[i] > a && L[i] < b) sub.push(pts[i]);
  const end = pointAt(path, b); sub.push(end);
  c.save(); setM(c, m); c.lineCap = 'round'; c.lineJoin = 'round';
  const tr = () => { c.beginPath(); sub.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); };
  const base = o.color || COL.terra;
  tr(); c.lineWidth = width + 3; c.strokeStyle = o.edge || 'rgba(40,14,6,0.85)'; c.stroke();
  tr(); c.lineWidth = width; c.strokeStyle = base; c.stroke();
  if (width > 3) { c.translate(-width * 0.16, -width * 0.2); tr(); c.lineWidth = width * 0.26; c.strokeStyle = o.hi || 'rgba(255,214,170,0.75)'; c.stroke(); }
  c.restore();
  return end;
}
function bead(c, m, x, y, r, color = COL.terra) { // gota con volumen
  if (r < 0.5) return;
  c.save(); setM(c, m);
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#FFD9B0'); g.addColorStop(0.3, color); g.addColorStop(1, '#4A1B0B');
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = g; c.fill(); c.restore();
}

// ---------- texto por glifo ----------
const mctx = mk(4, 4).getContext('2d');
function glyphs(str, font, tracking = 0) {
  mctx.font = font; let x = 0; const out = [];
  for (const ch of str) { const w = mctx.measureText(ch).width; out.push({ ch, x, w }); x += w + tracking; }
  // corrige kerning aproximado con el ancho real
  return { g: out, w: x - tracking };
}
// Entrada por glifo: sube detrás de una máscara (no es un fundido). modo: 'rise' | 'drop' | 'left'
function gtext(c, str, x, y, font, color, f, f0, o = {}) {
  const st = o.stagger ?? 1.6, dur = o.dur ?? 20, size = parseFloat(font.match(/(\d+(\.\d+)?)px/)[1]);
  const G = glyphs(str, font, o.tracking || 0); if (o.align === 'center') x -= G.w / 2; else if (o.align === 'right') x -= G.w;
  if (f < f0) return G.w;
  c.save(); c.font = font; c.fillStyle = color; c.textBaseline = 'alphabetic';
  c.beginPath(); c.rect(x - size * 0.2, y - size * 1.02, G.w + size * 0.4, size * 1.32); c.clip();
  const fx = o.out; // cuadro de salida
  G.g.forEach((g, i) => {
    let p = (o.ease || eo5)(seg(f, f0 + i * st, f0 + i * st + dur));
    let dy = (1 - p) * size * 1.25, dx = 0;
    if (o.mode === 'drop') dy = -(1 - p) * size * 1.25; if (o.mode === 'left') { dx = -(1 - p) * size * 1.2; dy = 0; }
    if (fx != null && f > fx) { const q = ei(seg(f, fx + i * st, fx + i * st + 16)); dy -= q * size * 1.3; }
    if (p <= 0) return;
    c.fillText(g.ch, x + g.x + dx, y + dy);
  });
  c.restore(); return G.w;
}
// Texto que dibuja el trazo: contorno con guion animado y relleno que sube como líquido.
function inkText(c, str, x, y, font, f, f0, o = {}) {
  const st = o.stagger ?? 3, size = parseFloat(font.match(/(\d+(\.\d+)?)px/)[1]);
  const G = glyphs(str, font, o.tracking || 0); if (o.align === 'center') x -= G.w / 2;
  if (f < f0) return G.w;
  c.save(); c.font = font; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  G.g.forEach((g, i) => {
    if (g.ch === ' ') return;
    const a = seg(f, f0 + i * st, f0 + i * st + (o.draw ?? 16)), b = eio(seg(f, f0 + i * st + (o.draw ?? 16) * 0.6, f0 + i * st + (o.draw ?? 16) * 0.6 + (o.fillDur ?? 16)));
    if (a <= 0) return;
    const per = size * 7;
    if (b < 1) { c.setLineDash([per * eio(a), per]); c.lineWidth = o.lw ?? Math.max(2, size * 0.035); c.strokeStyle = o.ink || COL.terraL; c.strokeText(g.ch, x + g.x, y); c.setLineDash([]); }
    if (b > 0) {
      c.save(); c.beginPath();
      const top = y + size * 0.25 - b * size * 1.3;
      c.moveTo(x + g.x - 4, y + size * 0.3); c.lineTo(x + g.x + g.w + 4, y + size * 0.3);
      for (let k = 0; k <= 6; k++) c.lineTo(x + g.x - 4 + (g.w + 8) * (1 - k / 6), top + Math.sin(k * 1.7 + f * 0.25 + i) * size * 0.03 * (1 - b));
      c.lineTo(x + g.x - 4, y + size * 0.3); c.clip();
      c.fillStyle = o.color || COL.crema; c.fillText(g.ch, x + g.x, y); c.restore();
    }
  });
  c.restore(); return G.w;
}
