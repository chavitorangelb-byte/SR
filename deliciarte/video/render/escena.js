// frame(t) determinista del video de DeliciArte (16 s + 2 s, 60 fps).
// "La línea de betún": un campo de distancia (SDF) en espacio de pantalla, sombreado como tubo de betún,
// que se interpola entre formas (nunca fundidos de opacidad). Una sola cámara para el plano continuo.
// t en cuadros de 60 fps (puede ser fraccionario). ?fmt=916 (1080×1920) o ?fmt=11 (1080×1080).
import * as THREE from 'three';
import { FPS, BEAT, END, FRAMES as FRAMES_T, VOZ, EV, KINETIC } from '/brief/timeline.mjs';

const Q = new URLSearchParams(location.search);
const FMT = Q.get('fmt') || '916';

// ---------- composición por formato (px de diseño, 1080 de ancho) ----------
const LAYOUTS = {
  916: {
    DH: 1920,
    da: { cx: 540, cy: 930, k: 1.35 }, ring: { cx: 540, cy: 930, d: 640 },
    phone: { cx: 540, cy: 1010, h: 1120 }, phone2: { cx: 540, cy: 1070, h: 1080 },
    cards: [{ x: 300, y: 700, z: 2.0 }, { x: 790, y: 1040, z: 2.4 }, { x: 310, y: 1395, z: 2.8 }], card: { w: 370, h: 440 },
    par: { p06: { x: 420, y: 1010, z: 0.8, w: 560, h: 730 }, p02: { x: 780, y: 720, z: -3, w: 400, h: 600 } },
    wall: { w07: { x: 250, y: 1250, z: 1.6, w: 380, h: 392 }, w04: { x: 840, y: 1330, z: 2.2, w: 300, h: 398 } },
    chips: { y: 820, dx: [-300, 0, 300], w: 260, h: 92, z: 2.4, px: 30 },
    btn: { x: 540, y: 1200, w: 760, h: 150, z: 3.2, px: 42 }, under: { y: 1308, w: 620 },
    cierre: { x: 540, y: 1000, d: 560 },
    k: {
      sabor: { x: 540, y: 520, px: 132 }, inig: { x: 540, y: 1370, px: 190 }, gusto: { x: 540, y: 300, px: 92 },
      disenos: { x: 540, y: 330, px: 88 }, celeb: { x: 540, y: 1500, px: 150 },
      propia: { x: 540, y: 300, px: 80 }, pagina: { x: 540, y: 410, px: 120 }, antojo: { x: 540, y: 330, px: 92 },
      marca: { x: 540, y: 300, px: 104 }, past: { x: 540, y: 408, px: 40 },
    },
    end: { logo: { x: 540, y: 430, d: 250 }, l1: { y: 760, px: 44 }, l2: { y: 905, px: 170 }, l3: { y: 1075, px: 44 }, l4: { y: 1215, px: 36 }, l5: { y: 1325, px: 34 }, l6: { y: 1500, px: 24 }, under: { y: 1000, w: 430 } },
  },
  11: {
    DH: 1080,
    da: { cx: 540, cy: 560, k: 0.95 }, ring: { cx: 540, cy: 540, d: 500 },
    phone: { cx: 540, cy: 560, h: 860 }, phone2: { cx: 720, cy: 560, h: 860 },
    cards: [{ x: 190, y: 310, z: 2.0 }, { x: 860, y: 540, z: 2.4 }, { x: 200, y: 820, z: 2.8 }], card: { w: 280, h: 330 },
    par: { p06: { x: 380, y: 560, z: 0.8, w: 430, h: 560 }, p02: { x: 800, y: 470, z: -3, w: 330, h: 494 } },
    wall: { w07: { x: 230, y: 760, z: 1.6, w: 320, h: 330 }, w04: { x: 300, y: 330, z: 2.2, w: 250, h: 332 } },
    chips: { y: 420, dx: [-230, 0, 230], w: 200, h: 76, z: 2.4, px: 24 },
    btn: { x: 540, y: 760, w: 640, h: 140, z: 3.2, px: 36 }, under: { y: 862, w: 560 },
    cierre: { x: 720, y: 560, d: 420 },
    k: {
      sabor: { x: 540, y: 150, px: 100 }, inig: { x: 540, y: 960, px: 140 }, gusto: { x: 540, y: 1010, px: 72 },
      disenos: { x: 540, y: 100, px: 70 }, celeb: { x: 540, y: 990, px: 120 },
      propia: { x: 290, y: 480, px: 64 }, pagina: { x: 290, y: 590, px: 92 }, antojo: { x: 290, y: 545, px: 56 },
      marca: { x: 290, y: 500, px: 76 }, past: { x: 290, y: 590, px: 30 },
    },
    end: { logo: { x: 540, y: 175, d: 190 }, l1: { y: 355, px: 36 }, l2: { y: 470, px: 130 }, l3: { y: 590, px: 36 }, l4: { y: 700, px: 30 }, l5: { y: 790, px: 28 }, l6: { y: 1010, px: 21 }, under: { y: 552, w: 330 } },
  },
};
const LAY = LAYOUTS[FMT];
const DW = 1080, DH = LAY.DH;
const W = +(Q.get('w') || 540), H = +(Q.get('h') || Math.round((540 * DH) / DW));
const S = W / DW; // px de salida por px de diseño
const DEG = Math.PI / 180;

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (f, a, b) => clamp((f - a) / (b - a));
const eOutCubic = (u) => 1 - Math.pow(1 - u, 3);
const eInCubic = (u) => u * u * u;
const eInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eOutExpo = (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
const eInOutSine = (u) => -(Math.cos(Math.PI * u) - 1) / 2;
const eOutBack = (u, s = 1.4) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
function spring(ts, k = 170, c = 18) {
  if (ts <= 0) return 0;
  const w0 = Math.sqrt(k), z = c / (2 * Math.sqrt(k));
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * ts) * (Math.cos(wd * ts) + (z * w0 / wd) * Math.sin(wd * ts)); }
  return 1 - Math.exp(-w0 * ts) * (1 + w0 * ts);
}
const springF = (f, f0, k, c) => spring((f - f0) / FPS, k, c);
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function noise1(x) { const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }

// ---------- voz: cuadro de cada palabra (voz.json de la fase 3 o lo planeado) ----------
let PAL = {};
function palabra(L, w) {
  const k = `${L}.${w}`;
  if (PAL[k] != null) return PAL[k];
  const v = VOZ.find((x) => x.id === L);
  return v.palabras[w] != null ? v.palabras[w] : v.f;
}

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);
const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: true };
const rtSub = new THREE.WebGLRenderTarget(W, H, rtOpts);
const rtAcc = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, depthBuffer: false });
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadGeo = new THREE.PlaneGeometry(2, 2);
const quadScene = (mat) => { const s = new THREE.Scene(); s.add(new THREE.Mesh(quadGeo, mat)); return s; };
const VQ = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

// vidrio esmerilado: lo que hay detrás se renderiza a media resolución y se desenfoca (σ = 34 px en el cuadro de 1080)
const BW = Math.max(2, Math.round(W / 2)), BH = Math.max(2, Math.round(H / 2));
const rtBack = new THREE.WebGLRenderTarget(BW, BH, rtOpts);
const rtTmp = new THREE.WebGLRenderTarget(BW, BH, { ...rtOpts, depthBuffer: false });
const rtBlur = new THREE.WebGLRenderTarget(BW, BH, { ...rtOpts, depthBuffer: false });
const blurMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: null }, uDir: { value: new THREE.Vector2() }, uSigma: { value: 8 }, uStep: { value: 1 } },
  vertexShader: VQ,
  fragmentShader: 'uniform sampler2D uTex; uniform vec2 uDir; uniform float uSigma; uniform float uStep; varying vec2 vUv; void main(){ vec4 acc = vec4(0.); float ws = 0.; for (int i = -24; i <= 24; i++) { float x = float(i) * uStep; float w = exp(-0.5 * x * x / (uSigma * uSigma)); acc += texture2D(uTex, vUv + uDir * x) * w; ws += w; } gl_FragColor = acc / ws; }',
  depthTest: false, depthWrite: false,
});
const blurScene = quadScene(blurMat);
function blurInto(src, dst) {
  const sigma = (34 * W) / 1080 / 2;
  blurMat.uniforms.uSigma.value = sigma; blurMat.uniforms.uStep.value = sigma / 8;
  blurMat.uniforms.uTex.value = src.texture; blurMat.uniforms.uDir.value.set(1 / BW, 0);
  renderer.setRenderTarget(rtTmp); renderer.render(blurScene, quadCam);
  blurMat.uniforms.uTex.value = rtTmp.texture; blurMat.uniforms.uDir.value.set(0, 1 / BH);
  renderer.setRenderTarget(dst); renderer.render(blurScene, quadCam);
}

// ---------- GLSL común ----------
const GLSL = /* glsl */`
float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
// entorno cálido para reflejos (estudio: caja de luz arriba-izquierda, rebote vino abajo)
vec3 envColor(vec3 R){
  vec3 top = vec3(0.16, 0.10, 0.09); vec3 bot = vec3(0.012, 0.003, 0.004);
  vec3 c = mix(bot, top, smoothstep(-0.5, 0.9, R.y));
  vec3 d1 = normalize(vec3(-0.55, 0.62, 0.56));
  c += vec3(1.0, 0.92, 0.82) * smoothstep(0.86, 0.95, dot(R, d1)) * 2.4;
  vec3 d2 = normalize(vec3(0.95, 0.25, -0.05));
  c += vec3(0.95, 0.86, 0.78) * smoothstep(0.93, 0.985, dot(R, d2)) * 1.4;
  vec3 d3 = normalize(vec3(0.1, -0.8, 0.58));
  c += vec3(0.48, 0.12, 0.17) * smoothstep(0.9, 0.99, dot(R, d3)) * 0.6;
  return c;
}
`;

// ---------- fondo: vino profundo con viñeta y luz cálida arriba-izquierda ----------
const bgMat = new THREE.ShaderMaterial({
  uniforms: { uAspect: { value: W / H }, uSeed: { value: 0 }, uGlow: { value: new THREE.Vector3(0.5, 0.52, 0) } },
  vertexShader: VQ,
  fragmentShader: GLSL + /* glsl */`
    uniform float uAspect; uniform float uSeed; uniform vec3 uGlow; varying vec2 vUv;
    void main(){
      vec2 p = (vUv - vec2(0.5, 0.55)) * vec2(uAspect, 1.);
      float d = length(p);
      vec3 c = mix(lin(vec3(0.200, 0.052, 0.070)), lin(vec3(0.141, 0.031, 0.055)), smoothstep(0.0, 0.6, d));
      c = mix(c, lin(vec3(0.062, 0.012, 0.022)), smoothstep(0.45, 1.1, d));
      vec2 g = (vUv - uGlow.xy) * vec2(uAspect, 1.);
      c += lin(vec3(0.478, 0.122, 0.169)) * 0.55 * uGlow.z * exp(-dot(g, g) / 0.06);
      c *= 1.0 + (hash12(gl_FragCoord.xy + uSeed) - 0.5) * 0.04;
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const bgScene = quadScene(bgMat);

// ---------- cámara y mundo: 1 unidad = 100 px de diseño en el plano z = 0 ----------
const FOV = 22;
const VIS_H = DH / 100;
const DIST = VIS_H / (2 * Math.tan((FOV / 2) * DEG));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, W / H, 1, DIST * 3);
camera.position.set(0, 0, DIST);
const toWorld = (dx, dy, z = 0) => new THREE.Vector3((dx - DW / 2) / 100, (DH / 2 - dy) / 100, z);
const _v = new THREE.Vector3();
function proj(x, y, z) { _v.set(x, y, z).project(camera); return [(_v.x + 1) / 2 * DW, (1 - _v.y) / 2 * DH]; }
function projObj(obj, x, y, z = 0) { _v.set(x, y, z).applyMatrix4(obj.matrixWorld).project(camera); return [(_v.x + 1) / 2 * DW, (1 - _v.y) / 2 * DH]; }

function rrShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// =====================================================================================
// LA LÍNEA DE BETÚN: campo de distancia en pantalla (d con signo hasta el borde del trazo, w = medio grosor)
// =====================================================================================
const FWd = Math.max(2, Math.round(W / 2)), FHd = Math.max(2, Math.round(H / 2));
const FS = FWd / DW; // px del campo por px de diseño
const GSTEP = 8;     // rejilla gruesa (px del campo) para el campo lejano
const CW = Math.ceil(FWd / GSTEP) + 2, CH = Math.ceil(FHd / GSTEP) + 2;
const coarse = new Float32Array(CW * CH * 2);
function makeFieldTex() {
  const data = new Float32Array(FWd * FHd * 2);
  const tex = new THREE.DataTexture(data, FWd, FHd, THREE.RGFormat, THREE.FloatType);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { data, tex };
}
const fieldA = makeFieldTex(), fieldB = makeFieldTex();
const FAR = 4000;

// trazos: [{ p: Float32Array [x0,y0,x1,y1,...] en px de diseño, w: Float32Array medio grosor por punto }]
function buildField(strokes, F, ox, oy) {
  const data = F.data;
  // 1) campo lejano en la rejilla gruesa, con puntos diezmados
  const dec = [];
  for (const s of strokes) {
    const n = s.w.length; if (n < 1) continue;
    const step = Math.max(1, Math.floor(n / 90));
    for (let i = 0; i < n; i += step) dec.push(s.p[2 * i] + ox, s.p[2 * i + 1] + oy, s.w[i]);
    dec.push(s.p[2 * (n - 1)] + ox, s.p[2 * (n - 1) + 1] + oy, s.w[n - 1]);
  }
  const nd = dec.length / 3;
  for (let j = 0; j < CH; j++) {
    const fy = (j - 0.5) * GSTEP; const dy = DH - (fy + 0.5) / FS;
    for (let i = 0; i < CW; i++) {
      const dx = ((i - 0.5) * GSTEP + 0.5) / FS;
      let best = FAR, bw = 4;
      for (let k = 0; k < nd; k++) {
        const ex = dec[3 * k] - dx, ey = dec[3 * k + 1] - dy;
        const d = Math.sqrt(ex * ex + ey * ey) - dec[3 * k + 2];
        if (d < best) { best = d; bw = dec[3 * k + 2]; }
      }
      coarse[2 * (j * CW + i)] = best; coarse[2 * (j * CW + i) + 1] = bw;
    }
  }
  // 2) interpolación bilineal a la resolución del campo
  for (let r = 0; r < FHd; r++) {
    const gy = r / GSTEP + 0.5, j0 = Math.floor(gy), ty = gy - j0;
    for (let c = 0; c < FWd; c++) {
      const gx = c / GSTEP + 0.5, i0 = Math.floor(gx), tx = gx - i0;
      const a = 2 * (j0 * CW + i0), b = a + 2, cc = a + 2 * CW, dd = cc + 2;
      const o = 2 * (r * FWd + c);
      data[o] = (coarse[a] * (1 - tx) + coarse[b] * tx) * (1 - ty) + (coarse[cc] * (1 - tx) + coarse[dd] * tx) * ty;
      data[o + 1] = (coarse[a + 1] * (1 - tx) + coarse[b + 1] * tx) * (1 - ty) + (coarse[cc + 1] * (1 - tx) + coarse[dd + 1] * tx) * ty;
    }
  }
  // 3) banda cercana exacta: distancia a cada segmento menos el medio grosor interpolado
  const BAND = 26; // px de diseño más allá del borde
  for (const s of strokes) {
    const n = s.w.length; if (n < 1) continue;
    const p = s.p, wv = s.w;
    for (let i = 0; i < Math.max(1, n - 1); i++) {
      const i1 = Math.min(n - 1, i + 1);
      const ax = p[2 * i] + ox, ay = p[2 * i + 1] + oy, bx = p[2 * i1] + ox, by = p[2 * i1 + 1] + oy;
      const wa = wv[i], wb = wv[i1];
      const R = Math.max(wa, wb) + BAND;
      const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - R) * FS)), c1 = Math.min(FWd - 1, Math.ceil((Math.max(ax, bx) + R) * FS));
      const rTop = Math.max(0, Math.floor((DH - (Math.max(ay, by) + R)) * FS)), rBot = Math.min(FHd - 1, Math.ceil((DH - (Math.min(ay, by) - R)) * FS));
      const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1e-6;
      for (let r = rTop; r <= rBot; r++) {
        const dy = DH - (r + 0.5) / FS;
        for (let c = c0; c <= c1; c++) {
          const dx = (c + 0.5) / FS;
          const t = clamp(((dx - ax) * vx + (dy - ay) * vy) / L2);
          const ex = dx - ax - vx * t, ey = dy - ay - vy * t;
          const ww = wa + (wb - wa) * t;
          const d = Math.sqrt(ex * ex + ey * ey) - ww;
          const o = 2 * (r * FWd + c);
          if (d < data[o]) { data[o] = d; data[o + 1] = ww; }
        }
      }
    }
  }
  F.tex.needsUpdate = true;
}

// geometría de trazos
function catmull(pts, perSeg = 14) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
function arcLen(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; }
// remuestrea un polilínea a paso constante (px de diseño) → { pts, L }
function resample(pts, step = 5) {
  const L = arcLen(pts), tot = L[L.length - 1];
  const n = Math.max(2, Math.ceil(tot / step) + 1), out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (tot * i) / (n - 1);
    while (j < L.length - 2 && L[j + 1] < s) j++;
    const u = (s - L[j]) / Math.max(1e-6, L[j + 1] - L[j]);
    out.push([lerp(pts[j][0], pts[j + 1][0], u), lerp(pts[j][1], pts[j + 1][1], u)]);
  }
  return { pts: out, tot };
}
// trazo visible entre s0 y s1 (fracciones de longitud), con grosor que se afina en las puntas
function stroke(path, s0, s1, w, { taper0 = 0.06, taper1 = 0.06, head = 0, tf = (x, y) => [x, y] } = {}) {
  const n = path.pts.length;
  const i0 = Math.max(0, Math.floor(s0 * (n - 1))), i1 = Math.min(n - 1, Math.ceil(s1 * (n - 1)));
  if (i1 <= i0 || s1 - s0 <= 1e-4) return null;
  const m = i1 - i0 + 1;
  const p = new Float32Array(2 * m), wv = new Float32Array(m);
  for (let k = 0; k < m; k++) {
    const i = i0 + k, s = i / (n - 1);
    const [x, y] = tf(path.pts[i][0], path.pts[i][1]);
    p[2 * k] = x; p[2 * k + 1] = y;
    const a = taper0 > 0 ? clamp((s - s0) / taper0) : 1, b = taper1 > 0 ? clamp((s1 - s) / taper1) : 1;
    let ww = w * Math.sqrt(Math.min(a, b)) * (0.35 + 0.65 * Math.min(a, b) ** 0.3);
    if (head > 0) ww *= 1 + head * Math.exp(-Math.pow((s1 - s) / 0.012, 2)); // la duya deja una gota en la punta
    wv[k] = Math.max(0.6, ww);
  }
  return { p, w: wv };
}
function ringStroke(cx, cy, r, w, a0 = -Math.PI / 2, frac = 1) {
  const n = Math.max(24, Math.round((2 * Math.PI * r * frac) / 5));
  const p = new Float32Array(2 * (n + 1)), wv = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) { const a = a0 + (2 * Math.PI * frac * i) / n; p[2 * i] = cx + Math.cos(a) * r; p[2 * i + 1] = cy + Math.sin(a) * r; wv[i] = w; }
  return { p, w: wv };
}
function polyStroke(pts, w) {
  const p = new Float32Array(2 * pts.length), wv = new Float32Array(pts.length).fill(w);
  pts.forEach((q, i) => { p[2 * i] = q[0]; p[2 * i + 1] = q[1]; });
  return { p, w: wv };
}
// contorno de un rectángulo redondeado (px de diseño) como polilínea cerrada
function rrPath(cx, cy, w, h, r, step = 5) {
  const pts = [];
  const arc = (x, y, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * Math.PI / 2; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } };
  arc(cx + w / 2 - r, cy - h / 2 + r, -Math.PI / 2);
  arc(cx + w / 2 - r, cy + h / 2 - r, 0);
  arc(cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2);
  arc(cx - w / 2 + r, cy - h / 2 + r, Math.PI);
  pts.push(pts[0].slice());
  return resample(pts, step);
}
// cuadrilátero proyectado (4 esquinas en px de diseño) con esquinas redondeadas aproximadas
function quadPath(c, rad = 24, step = 5) {
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const a = c[(i + 3) % 4], b = c[i], d = c[(i + 1) % 4];
    const la = Math.hypot(a[0] - b[0], a[1] - b[1]), ld = Math.hypot(d[0] - b[0], d[1] - b[1]);
    const ra = Math.min(rad, la / 2), rd = Math.min(rad, ld / 2);
    const pa = [b[0] + (a[0] - b[0]) * ra / la, b[1] + (a[1] - b[1]) * ra / la];
    const pd = [b[0] + (d[0] - b[0]) * rd / ld, b[1] + (d[1] - b[1]) * rd / ld];
    for (let k = 0; k <= 6; k++) { const u = k / 6; pts.push([(1 - u) * (1 - u) * pa[0] + 2 * u * (1 - u) * b[0] + u * u * pd[0], (1 - u) * (1 - u) * pa[1] + 2 * u * (1 - u) * b[1] + u * u * pd[1]]); }
  }
  pts.push(pts[0].slice());
  return resample(pts, step);
}

// ---- la DA: trazo de animación inspirado en su monograma (coordenadas de un lienzo de 600, centro 315, 290) ----
const DA_D = [[345, 145], [318, 170], [300, 215], [287, 265], [272, 320], [255, 362], [232, 394], [195, 414], [140, 418], [100, 400], [88, 373], [110, 349], [160, 338], [220, 345], [272, 366], [322, 392], [382, 409], [442, 404], [492, 377], [528, 323], [545, 255], [530, 185], [490, 131], [420, 96], [320, 80], [220, 86], [150, 110], [113, 150], [108, 200], [128, 240], [172, 264]];
const DA_A1 = [[86, 470], [122, 490], [182, 492], [242, 470], [300, 431], [355, 386], [400, 331], [432, 276], [450, 228]];
const DA_A2 = [[450, 228], [446, 270], [441, 325], [440, 382], [444, 441], [456, 500]];
function daPaths() {
  const { cx, cy, k } = LAY.da;
  const tf = (q) => [cx + (q[0] - 315) * k, cy + (q[1] - 290) * k];
  const D = resample(catmull(DA_D.map(tf), 16), 4);
  const A = resample(catmull(DA_A1.map(tf), 16).concat(catmull(DA_A2.map(tf), 16).slice(1)), 4);
  return { D, A };
}
let DA = null;

// golpe: diagonal que cruza la pantalla
function hookPath() {
  const pts = FMT === '916'
    ? [[-160, 1500], [180, 1330], [540, 1080], [900, 830], [1240, 620]]
    : [[-160, 900], [180, 760], [540, 560], [900, 360], [1240, 200]];
  return resample(catmull(pts, 20), 4);
}
let HOOK = null;

// rosetas: espirales de duya alrededor del anillo
function rosettePath(cx, cy, r, turns = 2.1, rot = 0) {
  const pts = [], n = 90;
  for (let i = 0; i <= n; i++) { const u = i / n, a = rot + u * turns * 2 * Math.PI, rr = r * (0.12 + 0.88 * u); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return resample(pts, 4);
}

// material del campo: tubo de betún crema con brillo, sombra de contacto y ruido líquido durante el morph
const fieldMat = new THREE.ShaderMaterial({
  uniforms: {
    uA: { value: fieldA.tex }, uB: { value: fieldB.tex }, uMix: { value: 0 }, uLiquid: { value: 0 }, uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(W, H) }, uS: { value: S }, uGlow: { value: 0 }, uShadow: { value: 1 }, uOn: { value: 1 }, uSwell: { value: 0 },
  },
  vertexShader: VQ,
  fragmentShader: GLSL + /* glsl */`
    uniform sampler2D uA; uniform sampler2D uB; uniform float uMix; uniform float uLiquid; uniform float uTime;
    uniform vec2 uRes; uniform float uS; uniform float uGlow; uniform float uShadow; uniform float uOn; uniform float uSwell;
    // a la mitad del morph el betún se hincha (gota líquida) para que la forma no se rompa
    vec2 F(vec2 uv){ vec2 a = texture2D(uA, uv).rg; vec2 b = texture2D(uB, uv).rg; vec2 m = mix(a, b, uMix); float sw = uSwell * sin(3.14159 * uMix); return vec2(m.x - sw, m.y + sw); }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 dp = gl_FragCoord.xy / uS; // px de diseño (y hacia arriba)
      vec2 f = F(uv);
      float liq = uLiquid * (vnoise(dp * 0.013 + vec2(uTime * 0.9, -uTime * 0.6)) - 0.5) * 22.;
      float d = f.x + liq, w = max(f.y, 0.6);
      float px = 1.0 / uS;
      float a = (1. - smoothstep(-0.6 * px, 0.6 * px, d)) * uOn;
      // tubo: 0 en el centro, 1 en el borde; normal desde el gradiente del campo
      float c = clamp((d + w) / w, 0., 1.);
      vec2 g = vec2(dFdx(d), dFdy(d));
      vec2 n2 = length(g) > 1e-5 ? normalize(g) : vec2(0.);
      float h = sqrt(max(0., 1. - c * c));
      vec3 N = normalize(vec3(n2 * c, h + 0.05));
      vec3 L = normalize(vec3(-0.5, 0.62, 0.6));
      float dif = clamp(dot(N, L), 0., 1.);
      float spec = pow(clamp(dot(reflect(-L, N), vec3(0., 0., 1.)), 0., 1.), 36.);
      vec3 cream = lin(vec3(0.965, 0.929, 0.882));
      vec3 col = cream * (0.50 + 0.58 * dif) * mix(1.0, 0.80, c * c) + vec3(1.0, 0.97, 0.92) * spec * 0.75;
      col += cream * uGlow * 0.6;
      // sombra de contacto (abajo-derecha)
      vec2 so = vec2(5., -9.) * uS / uRes;
      float ds = F(uv - so).x + liq;
      float sh = (1. - smoothstep(-2., 14., ds)) * 0.42 * uShadow * uOn;
      float outA = a + sh * (1. - a);
      gl_FragColor = vec4(col * a, outA);
    }`,
  transparent: true, depthTest: false, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
});
fieldMat.extensions = { derivatives: true };
const fieldScene = quadScene(fieldMat);

// =====================================================================================
// OBJETOS 3D
// =====================================================================================
const loader = new THREE.TextureLoader();
const loadTex = (url) => new Promise((res, rej) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
const TEX = {};

const softShadowMat = (opacity) => new THREE.ShaderMaterial({
  uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uR: { value: 0.2 }, uBlur: { value: 0.1 }, uOpacity: { value: opacity } },
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + 'uniform vec2 uSize; uniform float uR; uniform float uBlur; uniform float uOpacity; varying vec2 vP; void main(){ float d = sdRR(vP, uSize*0.5, uR); float a = 1. - smoothstep(-uBlur, uBlur, d); gl_FragColor = vec4(vec3(0.012, 0.002, 0.004), a*a*uOpacity); }',
  transparent: true, depthWrite: false,
});
function setSoftShadow(mesh, w, h, r, blur, opacity) {
  const W2 = w + blur * 4, H2 = h + blur * 4;
  mesh.scale.set(W2, H2, 1);
  const u = mesh.material.uniforms;
  u.uSize.value.set(w / W2, h / H2); u.uR.value = r / Math.min(W2, H2); u.uBlur.value = blur / Math.min(W2, H2); u.uOpacity.value = opacity;
}

// ---- logo: disco con el asset 00 (solo se mueve, escala, desenfoca o enmascara) ----
const logoMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: null }, uReveal: { value: 0 }, uOpacity: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform sampler2D uTex; uniform float uReveal; uniform float uOpacity; varying vec2 vUv;
    void main(){
      vec4 t = texture2D(uTex, vUv);
      float r = length(vUv - 0.5) * 2.;
      float px = fwidth(r);
      float m = 1. - smoothstep(uReveal - px, uReveal + px, r);
      gl_FragColor = vec4(t.rgb, t.a * m * uOpacity);
    }`,
  transparent: true, depthWrite: false,
});
logoMat.extensions = { derivatives: true };
const logo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), logoMat);
logo.renderOrder = 9;
scene.add(logo);
const logoShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.5));
logoShadow.renderOrder = 8;
scene.add(logoShadow);

// ---- celular de cristal ----
const BODY = { w: 4.14, h: 9.04, r: 0.6 };
const SCR = { w: 3.9, h: 8.8, r: 0.5 };
const phone = new THREE.Group();
scene.add(phone);
const phoneShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.55));
phoneShadow.renderOrder = 0;
phoneShadow.position.set(0.3, -0.45, -0.6);
phone.add(phoneShadow);

const SCR_CSS = { w: 390, h: 880 };
const scrCanvas = document.createElement('canvas');
scrCanvas.width = SCR_CSS.w * 2; scrCanvas.height = SCR_CSS.h * 2;
const scrCtx = scrCanvas.getContext('2d');
const scrTex = new THREE.CanvasTexture(scrCanvas);
scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8; scrTex.minFilter = THREE.LinearMipmapLinearFilter;
const screenMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: scrTex }, uSize: { value: new THREE.Vector2(SCR.w, SCR.h) }, uR: { value: SCR.r }, uReveal: { value: 1 }, uBlobs: { value: [] }, uNB: { value: 0 }, uBlobK: { value: 0.6 } },
  vertexShader: 'varying vec2 vUv; varying vec3 vLP; void main(){ vUv = uv; vLP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform sampler2D uTex; uniform vec2 uSize; uniform float uR; uniform float uReveal; uniform vec3 uBlobs[5]; uniform float uBlobK;
    varying vec2 vUv; varying vec3 vLP;
    float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
    void main(){
      float d = sdRR(vLP.xy, uSize * 0.5, uR);
      float px = fwidth(d);
      float a = 1. - smoothstep(-px, px * 0.2, d);
      // revelado líquido: unión suave de círculos que crecen (las rosetas se dilatan), recortada a la pantalla
      float m = 1e3;
      for (int i = 0; i < 5; i++) m = smin(m, length(vLP.xy - uBlobs[i].xy) - uBlobs[i].z, uBlobK);
      float rev = max(1. - smoothstep(-px, px, m), step(1.5, uReveal));
      vec3 c = texture2D(uTex, vUv).rgb;
      gl_FragColor = vec4(c, a * rev);
    }`,
  transparent: true, depthWrite: false,
});
screenMat.extensions = { derivatives: true };
screenMat.uniforms.uBlobs.value = Array.from({ length: 5 }, () => new THREE.Vector3(0, 0, -1));
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), screenMat);
screenMesh.position.z = 0.115;
screenMesh.renderOrder = 6;
phone.add(screenMesh);

const bodyGeo = new THREE.ExtrudeGeometry(rrShape(BODY.w - 0.2, BODY.h - 0.2, BODY.r - 0.1), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.1, bevelSegments: 10, curveSegments: 40 });
bodyGeo.translate(0, 0, -0.08);
bodyGeo.computeVertexNormals();
const bodyMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 1 }, uScr: { value: new THREE.Vector2(SCR.w, SCR.h) }, uScrR: { value: SCR.r }, uBody: { value: new THREE.Vector2(BODY.w, BODY.h) }, uForm: { value: 1 }, uGlare: { value: 0 }, uBack: { value: rtBlur.texture }, uRes: { value: new THREE.Vector2(W, H) } },
  vertexShader: /* glsl */`
    varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
    void main(){ vLP = position; vLN = normal; vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: GLSL + /* glsl */`
    uniform float uOpacity; uniform vec2 uScr; uniform float uScrR; uniform vec2 uBody; uniform float uForm; uniform float uGlare;
    uniform sampler2D uBack; uniform vec2 uRes;
    varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
    void main(){
      vec3 N = normalize(vWN); vec3 V = normalize(cameraPosition - vWP);
      float fres = pow(1. - clamp(dot(N, V), 0., 1.), 3.2);
      vec3 env = envColor(reflect(-V, N));
      float front = smoothstep(0.9, 0.995, normalize(vLN).z);
      float dB = sdRR(vLP.xy, uBody * 0.5, uBody.x * 0.145);
      // se forma desde el contorno hacia adentro (revelado por distancia, no por opacidad)
      float form = smoothstep(-uForm * 2.4 - 0.02, -uForm * 2.4, dB);
      float d = sdRR(vLP.xy, uScr * 0.5, uScrR);
      float inScr = 1. - smoothstep(-0.003, 0.003, d);
      // marco: vidrio esmerilado (lo de atrás desenfocado, saturación 140 %) con tinte vino
      vec3 back = texture2D(uBack, gl_FragCoord.xy / uRes).rgb;
      float bl = dot(back, vec3(0.2126, 0.7152, 0.0722));
      back = max(mix(vec3(bl), back, 1.4), 0.);
      vec3 glass = mix(back, lin(vec3(0.34, 0.12, 0.15)), 0.35) + env * (0.05 + 0.9 * fres);
      glass *= 1. + (hash12(floor(gl_FragCoord.xy) + 3.1) - 0.5) * 0.04;
      float rim = (1. - smoothstep(0.0, 0.016, abs(dB + 0.012))) * front;
      float ring = (1. - smoothstep(0.0, 0.01, abs(d))) * front;
      vec3 c = glass + vec3(1.0, 0.95, 0.9) * (rim * 0.85 + ring * 0.12);
      float a = mix(0.92, 1.0, fres);
      if (inScr * front > 0.5) {
        float band = vLP.x * 0.55 + vLP.y * 0.32 + uGlare;
        float glare = exp(-pow(band / 0.55, 2.)) * 0.06 + exp(-pow((band - 1.25) / 0.22, 2.)) * 0.03;
        c = vec3(1.0, 0.98, 0.95); a = glare;
      }
      gl_FragColor = vec4(c, clamp(a, 0., 1.) * uOpacity * form);
    }`,
  transparent: true, depthWrite: false,
});
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.renderOrder = 5;
phone.add(bodyMesh);
const glareMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), bodyMat); // brillo sobre la pantalla
glareMesh.visible = false;

// =====================================================================================
// PANELES DE FOTO (losas de cristal con grosor), PASTILLAS DE CRISTAL (chips y botón)
// =====================================================================================
const CREMA = '#F6EDE1', ARENA = '#C9A27E', VINO = '#7A1F2B', ROSA = '#E8A0B4', FONDO = '#24080E';
const LABEL_H = 64; // alto de la franja de etiqueta (px de diseño)
const PV = /* glsl */`
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){ vLP = position; vLN = normal; vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const panelF = GLSL + /* glsl */`
  uniform sampler2D uTex; uniform vec4 uCrop; uniform vec2 uSize; uniform float uR; uniform float uOpacity; uniform float uSheen;
  uniform sampler2D uLabel; uniform float uLabelH; uniform float uLabelOn; uniform sampler2D uBack; uniform vec2 uRes;
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){
    vec3 N = normalize(vWN);
    float face = smoothstep(0.85, 0.95, normalize(vLN).z);
    vec2 uv = clamp((vLP.xy + uSize * 0.5) / uSize, 0., 1.);
    vec3 tex = texture2D(uTex, uCrop.xy + uv * uCrop.zw).rgb;
    vec3 V = normalize(cameraPosition - vWP);
    vec3 env = envColor(reflect(-V, N));
    float fres = pow(1. - clamp(dot(N, V), 0., 1.), 3.);
    vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
    float ndl = clamp(dot(N, L), 0., 1.);
    vec3 c = tex * (0.93 + 0.09 * ndl);
    // canto de cristal: tinte vino, reflejos del estudio
    vec3 side = mix(lin(vec3(0.42, 0.2, 0.22)) * (0.5 + 0.6 * ndl), env, 0.55) + env * fres * 0.8;
    c = mix(side, c, face);
    // borde interior de 1 px y barrido de brillo del vidrio
    float dE = sdRR(vLP.xy, uSize * 0.5 - 0.004, uR);
    float pw = max(fwidth(dE), 1e-5);
    float rim = (1. - smoothstep(0.5, 1.5, abs(dE / pw + 1.))) * face;
    c = mix(c, vec3(1.0, 0.97, 0.93), rim * 0.6);
    float band = (vLP.x * 0.62 + vLP.y * 0.4) / max(uSize.x, uSize.y) - uSheen;
    c += vec3(1., 0.97, 0.93) * exp(-pow(band / 0.07, 2.)) * 0.12 * face;
    c += env * (0.02 + 0.3 * fres) * face;
    // franja de etiqueta: vidrio esmerilado sobre la foto
    if (uLabelOn > 0.5 && face > 0.5 && uv.y < uLabelH) {
      vec3 back = texture2D(uBack, gl_FragCoord.xy / uRes).rgb;
      float bl = dot(back, vec3(0.2126, 0.7152, 0.0722));
      back = max(mix(vec3(bl), back, 1.4), 0.);
      vec3 g = mix(back, lin(vec3(0.30, 0.07, 0.10)), 0.5);
      g *= 1. + (hash12(floor(gl_FragCoord.xy) + 5.7) - 0.5) * 0.04;
      float top = 1. - smoothstep(0.0, 0.004 / uSize.y * 1.5, abs(uv.y - uLabelH));
      vec4 lab = texture2D(uLabel, vec2(uv.x, uv.y / uLabelH));
      g = mix(g, lab.rgb, lab.a);
      c = mix(g, vec3(1.0, 0.96, 0.92), top * 0.5);
    }
    gl_FragColor = vec4(c, uOpacity);
  }`;
const PANELS = {};
function makePanel(id, img, wPx, hPx, label = null) {
  const w = wPx / 100, h = hPx / 100, r = 0.16;
  const geo = new THREE.ExtrudeGeometry(rrShape(w - 0.04, h - 0.04, r - 0.02), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 18 });
  geo.translate(0, 0, -0.1);
  const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
  let labTex = null;
  if (label) {
    // lienzo con el mismo aspecto que la franja (ancho del panel × 64 px) para no deformar el texto
    const k = 1024 / wPx;
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(LABEL_H * k);
    const x = c.getContext('2d');
    x.fillStyle = CREMA; x.textBaseline = 'middle';
    let px = 21 * k; x.font = `500 ${px}px Jost`;
    const tr = 0.16; // tracking en em
    const width = (t) => [...t].reduce((a, ch) => a + x.measureText(ch).width, 0) + tr * px * ([...t].length - 1);
    while (width(label) > 1024 * 0.86 && px > 10 * k) { px -= k; x.font = `500 ${px}px Jost`; }
    let xx = 512 - width(label) / 2;
    for (const ch of label) { x.fillText(ch, xx, c.height / 2 + px * 0.06); xx += x.measureText(ch).width + tr * px; }
    labTex = new THREE.CanvasTexture(c); labTex.colorSpace = THREE.SRGBColorSpace; labTex.anisotropy = 8;
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uCrop: { value: new THREE.Vector4(0, 0, 1, 1) }, uSize: { value: new THREE.Vector2(w, h) }, uR: { value: r - 0.02 }, uOpacity: { value: 1 }, uSheen: { value: -2 },
      uLabel: { value: labTex }, uLabelH: { value: label ? LABEL_H / hPx : 0 }, uLabelOn: { value: label ? 1 : 0 }, uBack: { value: rtBlur.texture }, uRes: { value: new THREE.Vector2(W, H) } },
    vertexShader: PV, fragmentShader: panelF,
  });
  mat.extensions = { derivatives: true };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  const g = new THREE.Group();
  g.add(mesh);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.5));
  sh.renderOrder = 2;
  g.add(sh);
  scene.add(g);
  g.visible = false;
  PANELS[id] = { g, mesh, sh, mat, w, h, r, img, label };
  return PANELS[id];
}
// recorte "cover" de la foto para el aspecto actual del panel (fx, fy: punto de interés)
function setCrop(P, aspect, fx = 0.5, fy = 0.5) {
  const ia = P.img.width / P.img.height;
  let sx = 1, sy = 1;
  if (aspect > ia) sy = ia / aspect; else sx = aspect / ia;
  P.mat.uniforms.uCrop.value.set((1 - sx) * fx, (1 - sy) * (1 - fy), sx, sy);
}

const pillF = GLSL + /* glsl */`
  uniform sampler2D uTex; uniform vec2 uSize; uniform float uR; uniform float uOpacity; uniform float uActive; uniform float uPress; uniform float uGlow;
  uniform sampler2D uBack; uniform vec2 uRes;
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){
    vec3 N = normalize(vWN);
    float face = smoothstep(0.85, 0.95, normalize(vLN).z);
    vec2 uv = clamp((vLP.xy + uSize * 0.5) / uSize, 0., 1.);
    vec3 V = normalize(cameraPosition - vWP);
    vec3 env = envColor(reflect(-V, N));
    float fres = pow(1. - clamp(dot(N, V), 0., 1.), 3.);
    vec3 back = texture2D(uBack, gl_FragCoord.xy / uRes).rgb;
    float bl = dot(back, vec3(0.2126, 0.7152, 0.0722));
    back = max(mix(vec3(bl), back, 1.4), 0.);
    vec3 glass = mix(back, lin(vec3(0.36, 0.09, 0.13)), 0.42) + env * (0.04 + 0.6 * fres);
    glass *= 1. + (hash12(floor(gl_FragCoord.xy) + 9.1) - 0.5) * 0.04;
    vec3 cream = lin(vec3(0.965, 0.929, 0.882)), vino = lin(vec3(0.478, 0.122, 0.169));
    vec3 fill = mix(glass, cream * (0.95 + 0.08 * N.y), uActive);
    float dE = sdRR(vLP.xy, uSize * 0.5 - 0.004, uR);
    float pw = max(fwidth(dE), 1e-5);
    float rim = (1. - smoothstep(0.5, 1.5, abs(dE / pw + 1.))) * face;
    vec4 tx = texture2D(uTex, uv);
    vec3 ink = mix(cream, vino, uActive);
    vec3 c = mix(fill, ink, tx.a * face);
    c = mix(c, vec3(1.0, 0.97, 0.93), rim * 0.75);
    c += cream * uGlow * 0.25 * face;
    c *= 1. - 0.08 * uPress;
    vec3 side = mix(glass, env, 0.5) + env * fres;
    c = mix(side, c, face);
    gl_FragColor = vec4(c, uOpacity);
  }`;
const PILLS = {};
function waIcon(x, cx, cy, r, color) {
  // ícono genérico de WhatsApp: globo de diálogo circular con auricular
  x.save(); x.strokeStyle = color; x.fillStyle = color; x.lineWidth = r * 0.16; x.lineJoin = 'round';
  x.beginPath(); x.arc(cx, cy, r, Math.PI * 0.72, Math.PI * 2.62); x.lineTo(cx - r * 1.05, cy + r * 1.08); x.closePath(); x.stroke();
  x.translate(cx, cy); x.rotate(-0.12); x.scale(r / 50, r / 50);
  x.beginPath();
  x.moveTo(-22, -24); x.quadraticCurveTo(-30, -20, -28, -8); x.quadraticCurveTo(-20, 18, 8, 28); x.quadraticCurveTo(20, 32, 26, 22);
  x.lineTo(26, 16); x.lineTo(14, 9); x.lineTo(7, 14); x.quadraticCurveTo(-8, 7, -13, -7); x.lineTo(-8, -14); x.lineTo(-14, -26); x.closePath(); x.fill();
  x.restore();
}
function makePill(id, wPx, hPx, text, px, icon = false) {
  const w = wPx / 100, h = hPx / 100, r = h / 2;
  const geo = new THREE.ExtrudeGeometry(rrShape(w - 0.04, h - 0.04, r - 0.02), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 5, curveSegments: 24 });
  geo.translate(0, 0, -0.09);
  const k = 2;
  const c = document.createElement('canvas'); c.width = Math.round(wPx * k); c.height = Math.round(hPx * k);
  const x = c.getContext('2d'); x.scale(k, k);
  x.fillStyle = '#fff'; x.textBaseline = 'middle';
  const tr = px * 0.14;
  x.font = `${icon ? 600 : 500} ${px}px Jost`;
  const tw = [...text].reduce((a, ch) => a + x.measureText(ch).width, 0) + tr * ([...text].length - 1);
  const iw = icon ? px * 1.35 : 0, gap = icon ? px * 0.6 : 0;
  let xx = wPx / 2 - (tw + iw + gap) / 2;
  if (icon) { waIcon(x, xx + iw / 2, hPx / 2, px * 0.56, '#fff'); xx += iw + gap; }
  for (const ch of text) { x.fillText(ch, xx, hPx / 2 + px * 0.04); xx += x.measureText(ch).width + tr; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uSize: { value: new THREE.Vector2(w, h) }, uR: { value: r - 0.02 }, uOpacity: { value: 1 }, uActive: { value: 0 }, uPress: { value: 0 }, uGlow: { value: 0 }, uBack: { value: rtBlur.texture }, uRes: { value: new THREE.Vector2(W, H) } },
    vertexShader: PV, fragmentShader: pillF,
  });
  mat.extensions = { derivatives: true };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 7;
  const g = new THREE.Group(); g.add(mesh);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.5)); sh.renderOrder = 6; g.add(sh);
  scene.add(g); g.visible = false;
  PILLS[id] = { g, mesh, sh, mat, w, h, r };
  return PILLS[id];
}

// =====================================================================================
// CAPA 2D (kinetic type) y pantalla del celular
// =====================================================================================
const ov = document.createElement('canvas');
ov.width = W; ov.height = H;
const octx = ov.getContext('2d');
const ovTex = new THREE.CanvasTexture(ov);
ovTex.colorSpace = THREE.SRGBColorSpace; ovTex.minFilter = THREE.LinearFilter; ovTex.generateMipmaps = false;
const ovMat = new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, premultipliedAlpha: false });
const ovScene = quadScene(ovMat);
const accScene = quadScene(new THREE.MeshBasicMaterial({ map: rtSub.texture, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, opacity: 1 }));
const outScene = quadScene(new THREE.MeshBasicMaterial({ map: rtAcc.texture, depthTest: false, depthWrite: false, toneMapped: false }));

function glyphLayout(ctx, text, font, tracking) {
  ctx.font = font;
  const g = [...text];
  const ws = g.map((c) => ctx.measureText(c).width);
  const total = ws.reduce((a, b) => a + b, 0) + tracking * (g.length - 1);
  const xs = []; let x = -total / 2;
  for (let i = 0; i < g.length; i++) { xs.push(x); x += ws[i] + tracking; }
  return { g, ws, xs, total };
}
// sube desde una máscara, glifo por glifo con resorte (stagger 27 ms); sale disparado hacia arriba
function kRise(ctx, t, text, P, fland, fsale, { weight = 500, color = CREMA, track = 0.2 } = {}) {
  const f0 = fland - 6;
  if (t < f0 - 2 || t > fsale + 30) return;
  const px = P.px;
  const font = `${weight} ${px}px Jost`;
  const L = glyphLayout(ctx, text, font, px * track);
  ctx.save(); ctx.font = font; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  const base = P.y + px * 0.36;
  ctx.beginPath(); ctx.rect(0, base - px * 1.1, DW, px * 1.45); ctx.clip();
  L.g.forEach((c, i) => {
    const u = springF(t, f0 + i * 1.6, 220, 19);
    const out = eInCubic(seg(t, fsale + i * 1.4, fsale + 12 + i * 1.4));
    ctx.save();
    ctx.translate(P.x + L.xs[i] + L.ws[i] / 2, base + (1 - u) * px * 1.15 - out * px * 1.25);
    ctx.rotate((1 - u) * 0.12 * (i % 2 ? 1 : -1));
    ctx.fillText(c, -L.ws[i] / 2, 0);
    ctx.restore();
  });
  ctx.restore();
}
// script que se escribe con una máscara que avanza como la duya
function kScript(ctx, t, text, P, fland, fsale, color = ARENA) {
  if (t < fland - 14 || t > fsale + 20) return;
  const px = P.px;
  ctx.save(); ctx.font = `400 ${px}px Sacramento`;
  const wTot = ctx.measureText(text).width;
  const u = eOutCubic(seg(t, fland - 12, fland + 16));
  const out = eInOutCubic(seg(t, fsale, fsale + 16));
  const x0 = P.x - wTot / 2 - px * 0.1;
  const xr = x0 + (wTot + px * 0.4) * u, xl = x0 + (wTot + px * 0.4) * out;
  ctx.beginPath(); ctx.rect(xl, P.y - px * 1.2, Math.max(0, xr - xl), px * 1.8); ctx.clip();
  ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  ctx.translate(0, (1 - u) * 10 - out * 6);
  ctx.fillText(text, P.x - wTot / 2, P.y + px * 0.3);
  ctx.restore();
}
// los glifos se comprimen desde un tracking ancho, del centro hacia afuera, y aterrizan
function kTrack(ctx, t, text, P, fland, fsale, { weight = 500, color = CREMA, from = 0.9, track = 0.16 } = {}) {
  if (t < fland - 16 || t > fsale + 18) return;
  const px = P.px;
  const font = `${weight} ${px}px Jost`;
  const u = eOutExpo(seg(t, fland - 14, fland + 10));
  const out = eInCubic(seg(t, fsale, fsale + 14));
  const L = glyphLayout(ctx, text, font, px * lerp(from, track, u) + out * px * 0.6);
  ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  L.g.forEach((c, i) => {
    const k = Math.abs(i - (L.g.length - 1) / 2);
    const ui = eOutCubic(seg(t, fland - 14 + k * 1.5, fland + 6 + k * 1.5));
    const oi = seg(t, fsale + k * 1.2, fsale + 12 + k * 1.2);
    ctx.globalAlpha = clamp(ui * 1.4) * (1 - oi);
    ctx.save();
    ctx.translate(P.x + L.xs[i] + L.ws[i] / 2, P.y + px * 0.36 + (1 - ui) * px * 0.35 - oi * px * 0.3);
    const sc = lerp(1.25, 1, ui); ctx.scale(sc, sc);
    ctx.fillText(c, -L.ws[i] / 2, 0);
    ctx.restore();
  });
  ctx.restore();
}
// cae glifo por glifo con giro (CADA ANTOJO, PÁGINA)
function kDrop(ctx, t, text, P, fland, fsale, { weight = 600, color = CREMA, track = 0.12 } = {}) {
  if (t < fland - 14 || t > fsale + 18) return;
  const px = P.px;
  const font = `${weight} ${px}px Jost`;
  const L = glyphLayout(ctx, text, font, px * track);
  ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  L.g.forEach((c, i) => {
    const fi = fland - 10 + i * 1.8;
    const u = springF(t, fi, 260, 17);
    const out = eInCubic(seg(t, fsale + i * 0.5, fsale + 9 + i * 0.5));
    if (t < fi) return;
    ctx.save();
    ctx.globalAlpha = clamp((t - fi) / 3) * (1 - out);
    ctx.translate(P.x + L.xs[i] + L.ws[i] / 2, P.y + px * 0.36 - (1 - u) * px * 0.9 + out * px * 0.4);
    ctx.rotate((1 - u) * -0.5);
    ctx.fillText(c, -L.ws[i] / 2, 0);
    ctx.restore();
  });
  ctx.restore();
}
function textTracked(ctx, text, x, y, font, track, align = 'center') {
  ctx.font = font;
  const g = [...text]; const ws = g.map((c) => ctx.measureText(c).width);
  const tot = ws.reduce((a, b) => a + b, 0) + track * (g.length - 1);
  let xx = align === 'center' ? x - tot / 2 : x;
  g.forEach((c, i) => { ctx.fillText(c, xx, y); xx += ws[i] + track; });
  return tot;
}
// end card: cada línea entra desde una máscara
function endCard(ctx, t) {
  if (t < END) return;
  const E = LAY.end;
  const line = (i, text, P, weight, color, track, alpha = 1) => {
    const f = EV.endTextos[i];
    const u = eOutCubic(seg(t, f, f + 14));
    if (u <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha * clamp(u * 1.3); ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
    ctx.beginPath(); ctx.rect(0, P.y - P.px * 1.05, DW, P.px * 1.8); ctx.clip();
    textTracked(ctx, text, DW / 2, P.y + P.px * 0.35 + (1 - u) * P.px * 0.9, `${weight} ${P.px}px Jost`, P.px * track);
    ctx.restore();
  };
  line(0, 'Precios accesibles desde', E.l1, 400, CREMA, 0.04);
  line(1, '$1,000', E.l2, 500, CREMA, 0.02);
  line(1, 'pesos por tu página', E.l3, 400, CREMA, 0.04);
  line(2, 'Paquete de 3 videos promocionales: $1,500', E.l4, 500, ARENA, 0.03);
  line(3, 'Elevate Negocios · Aguascalientes', E.l5, 500, CREMA, 0.12);
  line(4, 'Demo de cortesía de Elevate Negocios · pieza no oficial', E.l6, 400, CREMA, 0.04, 0.62);
}
function chispa(ctx, t, st) {
  if (!st.spark) return;
  const [x, y] = st.spark.x; const u = st.spark.u;
  if (u >= 1) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = lerp(10, 90, eOutCubic(u)), a = (1 - u) * 0.9;
  ctx.strokeStyle = `rgba(255,246,235,${a})`; ctx.lineWidth = 3 * (1 - u) + 0.5;
  for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + 0.6; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * 0.25, y + Math.sin(an) * r * 0.25); ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); ctx.stroke(); }
  ctx.restore();
}
function ondaToque(ctx, t, st) {
  if (!st.ripple) return;
  const u = seg(t, EV.toque, EV.toque + 26);
  if (u <= 0 || u >= 1) return;
  const [x, y] = st.ripple;
  ctx.save(); ctx.strokeStyle = `rgba(246,237,225,${0.55 * (1 - u)})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, lerp(20, 240, eOutCubic(u)), 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = `rgba(246,237,225,${0.22 * (1 - u)})`; ctx.beginPath(); ctx.arc(x, y, 44 * (1 - 0.3 * u), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function capa2D(t, st, dx, dy) {
  const ctx = octx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.setTransform(S, 0, 0, S, dx * S, dy * S);
  const K = LAY.k, KS = Object.fromEntries(KINETIC.map((k) => [k.id, k]));
  chispa(ctx, t, st);
  kRise(ctx, t, 'SABOR', K.sabor, palabra('L1', 'Sabor'), KS.sabor.sale);
  kScript(ctx, t, 'inigualable', K.inig, palabra('L1', 'inigualable'), KS.inigualable.sale);
  kTrack(ctx, t, 'A TU GUSTO', K.gusto, palabra('L2', 'a'), KS.gusto.sale);
  kTrack(ctx, t, 'DISEÑOS ÚNICOS', K.disenos, palabra('L3', 'Diseños'), KS.disenos.sale, { from: 0.7 });
  kScript(ctx, t, 'tu celebración', K.celeb, palabra('L3', 'celebración'), KS.celebracion.sale);
  kRise(ctx, t, 'TU PROPIA', K.propia, palabra('L4', 'propia'), KS.propia.sale, { weight: 400, track: 0.18 });
  kDrop(ctx, t, 'PÁGINA', K.pagina, palabra('L4', 'página'), KS.paginaK.sale);
  kDrop(ctx, t, 'CADA ANTOJO', K.antojo, palabra('L5', 'cada'), KS.antojo.sale, { weight: 500 });
  kTrack(ctx, t, 'DeliciArte', K.marca, palabra('L7', 'DeliciArte'), KS.marca.sale, { weight: 500, from: 0.5, track: 0.03 });
  kTrack(ctx, t, 'PASTELERÍA', K.past, palabra('L7', 'Pastelería'), KS.pasteleria.sale, { weight: 400, color: ARENA, from: 1.4, track: 0.5 });
  ondaToque(ctx, t, st);
  endCard(ctx, t);
  ovTex.needsUpdate = true;
}

// ---------- la "página" de DeliciArte en la pantalla del celular (CSS 390 × 880) ----------
function coverDraw(ctx, img, x, y, w, h, fx = 0.5, fy = 0.5) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) * fx, (img.height - sh) * fy, sw, sh, x, y, w, h);
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
const TILES = [
  { id: '01', x: 20, y: 482, w: 169, h: 150 }, { id: '03', x: 201, y: 482, w: 169, h: 150 },
  { id: '05', x: 20, y: 644, w: 169, h: 150 }, { id: '06', x: 201, y: 644, w: 169, h: 150 },
];
const CHIPS = [{ t: 'PASTELES', x: 24, w: 108 }, { t: 'POSTRES', x: 141, w: 108 }, { t: 'CAFÉ', x: 258, w: 108 }];
const CHIP_Y = 428, CHIP_H = 38;
const BTN_PAGE = { x: 24, y: 812, w: 342, h: 48 };
const HERO = { y: 0, h: 380 };
let scrKey = '';
function pantalla(st) {
  const sc = st.scr; if (!sc) return;
  const key = JSON.stringify(sc);
  if (key === scrKey) return;
  scrKey = key;
  const ctx = scrCtx; const k = 2;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = FONDO; ctx.fillRect(0, 0, SCR_CSS.w, SCR_CSS.h);
  if (sc.modo === 'hero') {
    coverDraw(ctx, IMG.p02, 0, 0, SCR_CSS.w, SCR_CSS.h, 0.04, 0.5);
    const g = ctx.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, 'rgba(36,8,14,0.85)'); g.addColorStop(1, 'rgba(36,8,14,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SCR_CSS.w, 170);
  } else {
    // portada
    if (sc.hero) {
      coverDraw(ctx, IMG.p02, 0, HERO.y, SCR_CSS.w, HERO.h, 0.04, 0.42);
      const g = ctx.createLinearGradient(0, 220, 0, HERO.h);
      g.addColorStop(0, 'rgba(36,8,14,0)'); g.addColorStop(1, 'rgba(36,8,14,1)');
      ctx.fillStyle = g; ctx.fillRect(0, 220, SCR_CSS.w, HERO.h - 220);
      const g2 = ctx.createLinearGradient(0, 0, 0, 130);
      g2.addColorStop(0, 'rgba(36,8,14,0.85)'); g2.addColorStop(1, 'rgba(36,8,14,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, SCR_CSS.w, 130);
    } else {
      rr(ctx, 12, 96, SCR_CSS.w - 24, HERO.h - 110, 18); ctx.fillStyle = 'rgba(246,237,225,0.05)'; ctx.fill();
    }
    ctx.fillStyle = CREMA; ctx.textBaseline = 'alphabetic';
    ctx.font = '400 44px Sacramento'; ctx.textAlign = 'center'; ctx.fillText('sabor inigualable', 195, 356);
    ctx.textAlign = 'left';
    ctx.fillStyle = ARENA; textTracked(ctx, 'PASTELERÍA Y REPOSTERÍA', 195, 404, '500 10.5px Jost', 2.6);
    // chips
    CHIPS.forEach((c, i) => {
      if (sc.chipsFuera && sc.chipsFuera[i]) return;
      const act = sc.chip === i;
      rr(ctx, c.x, CHIP_Y, c.w, CHIP_H, CHIP_H / 2);
      ctx.fillStyle = act ? CREMA : 'rgba(246,237,225,0.07)'; ctx.fill();
      ctx.strokeStyle = act ? CREMA : 'rgba(246,237,225,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = act ? VINO : CREMA; textTracked(ctx, c.t, c.x + c.w / 2, CHIP_Y + 24, '500 12px Jost', 1.6);
    });
    // cuadrícula
    if (sc.filtro === 'postres') {
      [['p07', 'Pastelitos cuchareables', TILES[0], sc.t07], ['p04', 'Rollos de canela', TILES[1], sc.t04]].forEach(([im, lab, T, on]) => {
        rr(ctx, T.x, T.y, T.w, T.h, 14);
        if (on) { ctx.save(); ctx.clip(); coverDraw(ctx, IMG[im], T.x, T.y, T.w, T.h, 0.5, 0.5); const g = ctx.createLinearGradient(0, T.y + T.h - 50, 0, T.y + T.h); g.addColorStop(0, 'rgba(36,8,14,0)'); g.addColorStop(1, 'rgba(36,8,14,0.9)'); ctx.fillStyle = g; ctx.fillRect(T.x, T.y, T.w, T.h); ctx.restore(); ctx.fillStyle = CREMA; ctx.font = '500 12.5px Jost'; ctx.fillText(lab, T.x + 10, T.y + T.h - 12); }
        else { ctx.fillStyle = 'rgba(246,237,225,0.05)'; ctx.fill(); }
      });
    } else {
      TILES.forEach((T, i) => {
        rr(ctx, T.x, T.y, T.w, T.h, 14);
        if (sc.tiles && sc.tiles[i]) { ctx.save(); ctx.clip(); coverDraw(ctx, IMG['p' + T.id], T.x, T.y, T.w, T.h, 0.5, T.id === '01' ? 0.35 : 0.5); ctx.restore(); }
        else { ctx.fillStyle = 'rgba(246,237,225,0.05)'; ctx.fill(); ctx.strokeStyle = 'rgba(246,237,225,0.12)'; ctx.stroke(); }
      });
    }
    // botón de la página
    if (!sc.btnFuera) {
      rr(ctx, BTN_PAGE.x, BTN_PAGE.y, BTN_PAGE.w, BTN_PAGE.h, BTN_PAGE.h / 2);
      ctx.fillStyle = CREMA; ctx.fill();
      ctx.fillStyle = VINO; ctx.font = '600 14px Jost';
      const tw = [...'PIDE POR WHATSAPP'].reduce((a, ch) => a + ctx.measureText(ch).width, 0) + 1.2 * 16;
      const x0 = 195 - (tw + 26) / 2;
      waIcon(ctx, x0 + 9, BTN_PAGE.y + 24, 9, VINO);
      textTracked(ctx, 'PIDE POR WHATSAPP', x0 + 26, BTN_PAGE.y + 29.5, '600 14px Jost', 1.2, 'left');
    }
  }
  // encabezado: el logo (asset 00, solo escalado)
  if (sc.logo) { const d = 64; ctx.drawImage(IMG.logo, 195 - d / 2, 50 - d / 2, d, d); }
  scrTex.needsUpdate = true;
}
// coordenadas de la página (CSS) → locales del celular
const pageToLocal = (x, y) => [(x - SCR_CSS.w / 2) / 100, (SCR_CSS.h / 2 - y) / 100];

// =====================================================================================
// COREOGRAFÍA
// =====================================================================================
function keys(t, ks, ease = eInOutCubic) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [f0, v0] = ks[i], [f1, v1] = ks[i + 1];
    if (t <= f1) return lerp(v0, v1, ease(seg(t, f0, f1)));
  }
  return ks[ks.length - 1][1];
}
const ISO = { ry: -26 * DEG, rx: 8 * DEG };
function rosetteCenters() {
  const { cx, cy, d } = LAY.ring; const R = d * 0.5 + 4;
  return [0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + 0.3; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
}

// celular: posición (px de diseño), z (mundo), escala, giros
function phoneAt(t) {
  const P1 = LAY.phone, P2 = LAY.phone2;
  const s1 = P1.h / (BODY.h * 100), s2 = P2.h / (BODY.h * 100);
  const iso = eInOutCubic(seg(t, EV.iso[0], EV.iso[1]));
  let x = P1.cx, y = P1.cy, z = 0, s = s1, ry = ISO.ry * iso, rx = ISO.rx * iso, vis = true;
  // sale hacia el fondo para el parallax y regresa como la página
  const out = eInCubic(seg(t, EV.aParallax[0], EV.aParallax[0] + 34));
  if (t >= EV.aParallax[0] && t < EV.aPagina[0]) { z = -14 * out; y = P1.cy + 420 * out; ry += -0.3 * out; vis = out < 0.999; }
  if (t >= EV.aPagina[0]) {
    const u = eOutCubic(seg(t, EV.aPagina[0], EV.aPagina[1]));
    x = lerp(P2.cx, P2.cx, u); y = lerp(P2.cy + 300, P2.cy, u); z = lerp(-14, 0, u); s = s2; ry = lerp(ISO.ry - 0.3, 0, u); rx = lerp(ISO.rx, 0, u);
  }
  // cierre: el celular se encoge hacia el anillo del logo
  if (t >= EV.aCierre[0]) {
    const u = eInOutCubic(seg(t, EV.aCierre[0] + 10, EV.aCierre[1]));
    const C = LAY.cierre;
    x = lerp(P2.cx, C.x, u); y = lerp(P2.cy, C.y, u);
    s = lerp(s2, (C.d * 0.62) / (BODY.h * 100), u); z = 0; ry = 0; rx = 0;
    vis = t < EV.logoCierre[1] - 6;
  }
  return { x, y, z, s, ry, rx, vis };
}
const _o = new THREE.Object3D();
function frameObj(p) {
  _o.position.copy(toWorld(p.x, p.y, p.z)); _o.rotation.set(p.rx, p.ry, p.rz || 0); _o.scale.set(p.sx || p.s || 1, p.sy || p.s || 1, p.s || 1);
  _o.updateMatrixWorld(true);
  return _o;
}
function quadOf(p, hw, hh, z) { const o = frameObj(p); return [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => projObj(o, x, y, z)); }
function phoneScreenQuad(t) { const p = phoneAt(t); return quadOf(p, SCR.w / 2, SCR.h / 2, 0.115); }
function phoneBodyQuad(t) { const p = phoneAt(t); return quadOf(p, BODY.w / 2 - 0.02, BODY.h / 2 - 0.02, 0.12); }
// punto local del celular → px de diseño y z de mundo
function phoneLocalToDesign(t, lx, ly) {
  const p = phoneAt(t); const o = frameObj(p);
  const w = new THREE.Vector3(lx, ly, 0.13).applyMatrix4(o.matrixWorld);
  return { x: w.x * 100 + DW / 2, y: DH / 2 - w.y * 100, z: w.z, s: p.s, ry: p.ry, rx: p.rx };
}

// ---------- tarjetas, paneles, muro ----------
const CARD_IDS = ['c01', 'c03', 'c05'];
function cardState(i, t) {
  const id = CARD_IDS[i];
  const fk = EV.tarjeta[i];
  const slot = LAY.cards[i];
  const C = LAY.card;
  if (t < fk - 18) return null;
  const st = { id, x: slot.x, y: slot.y, z: slot.z, w: C.w, h: C.h, ry: ISO.ry, rx: ISO.rx, rz: 0, shadow: 1, sheen: -2 };
  // sale de la pantalla del celular y se estampa en el kick
  const u = seg(t, fk - 18, fk);
  if (u < 1) {
    const e = eInCubic(u);
    const sc = phoneScreenQuad(t); const cx = (sc[0][0] + sc[2][0]) / 2, cy = (sc[0][1] + sc[2][1]) / 2;
    st.x = lerp(cx, slot.x, eOutCubic(u)); st.y = lerp(cy, slot.y, eOutCubic(u)) - Math.sin(Math.PI * u) * 60;
    st.z = lerp(0.3, slot.z + 1.2, e);
    const k = lerp(0.3, 1, eOutCubic(u)); st.w *= k; st.h *= k; st.shadow = 0;
  } else {
    // aterrizaje: baja de z+1.2 a z con rebote, sombra de contacto que crece
    const land = springF(t, fk, 320, 16);
    st.z = slot.z + 1.2 * (1 - land);
    const sq = Math.exp(-(t - fk) / 4) * Math.sin((t - fk) / 2.2) * 0.04;
    st.w *= 1 + sq; st.h *= 1 - sq;
    st.shadow = clamp(land);
    st.sheen = lerp(-1.2, 1.4, seg(t, fk, fk + 26));
  }
  // atraviesa la cámara hacia los lados (parallax)
  const ex = eInCubic(seg(t, EV.aParallax[0] + i * 4, EV.aParallax[0] + 36 + i * 4));
  if (ex > 0) {
    const dir = [[-1.2, -0.6], [1.3, 0.1], [-1.1, 0.8]][i];
    st.x += dir[0] * 900 * ex; st.y += dir[1] * 700 * ex; st.z += 14 * ex; st.ry += 0.4 * ex * dir[0];
  }
  if (ex >= 1 && t < EV.aPagina[0]) return null;
  // regresa a la cuadrícula de la página
  if (t >= EV.aPagina[0]) return toTile(st, t, i, EV.aPagina[0] + 18 + i * 6);
  return st;
}
function toTile(st, t, tileIdx, f0) {
  const u = eInOutCubic(seg(t, f0, f0 + 30));
  const T = TILES[tileIdx];
  const [lx, ly] = pageToLocal(T.x + T.w / 2, T.y + T.h / 2);
  const d = phoneLocalToDesign(t, lx, ly);
  const from = st.from || { x: st.x, y: st.y - 300, z: 6, w: st.w * 1.2, h: st.h * 1.2, ry: 0.3, rx: 0 };
  if (u <= 0 && !st.from) Object.assign(st, from);
  const tw = T.w * d.s * 100 / 100, th = T.h * d.s * 100 / 100;
  st.x = lerp(from.x, d.x, u); st.y = lerp(from.y, d.y, u); st.z = lerp(from.z, d.z + 0.02, u) + Math.sin(Math.PI * u) * 1.5;
  st.w = lerp(from.w, tw, u); st.h = lerp(from.h, th, u); st.ry = lerp(from.ry, d.ry, u); st.rx = lerp(from.rx, d.rx, u);
  st.shadow = 1 - u; st.landed = u >= 1;
  return st.landed ? null : st;
}
function parState(id, t) {
  const P = LAY.par[id];
  const f0 = id === 'p06' ? EV.aParallax[0] + 4 : EV.aParallax[0] + 14;
  if (t < f0) return null;
  const u = eOutCubic(seg(t, f0, f0 + 44));
  const st = { id, x: P.x, y: P.y + (1 - u) * 160, z: lerp(-16, P.z, u), w: P.w, h: P.h, ry: lerp(0.5, id === 'p06' ? 0.12 : -0.14, u), rx: 0.05, rz: 0, shadow: u, sheen: lerp(-1.5, 1.5, seg(t, f0 + 20, f0 + 70)) };
  st.y += Math.sin((t - f0) / 40) * 8;
  if (t >= EV.aPagina[0]) {
    if (id === 'p02') {
      // vuela a la portada de la página
      const v = eInOutCubic(seg(t, EV.aPagina[0], EV.aPagina[0] + 32));
      const [lx, ly] = pageToLocal(SCR_CSS.w / 2, HERO.h / 2);
      const d = phoneLocalToDesign(t, lx, ly);
      st.x = lerp(st.x, d.x, v); st.y = lerp(st.y, d.y, v); st.z = lerp(st.z, d.z + 0.02, v);
      st.w = lerp(P.w, SCR_CSS.w * d.s, v); st.h = lerp(P.h, HERO.h * d.s, v); st.ry = lerp(st.ry, d.ry, v); st.rx = lerp(st.rx, d.rx, v);
      st.shadow = 1 - v; st.fx = 0.04;
      if (v >= 1) return null;
    } else {
      st.from = { ...st };
      return toTile(st, t, 3, EV.aPagina[0] + 6);
    }
  }
  return st;
}
function wallState(id, t) {
  const P = LAY.wall[id];
  const f0 = id === 'w07' ? EV.muro[0] : EV.muro[0] + 8;
  if (t < f0 || t > EV.boton[0] + 34) return null;
  const u = eOutBack(seg(t, f0, f0 + 32), 1.2);
  const ph = phoneAt(t);
  const st = { id, x: lerp(ph.x, P.x, clamp(u)), y: lerp(ph.y, P.y, clamp(u)), z: lerp(-1, P.z, clamp(u)), w: P.w * lerp(0.4, 1, u), h: P.h * lerp(0.4, 1, u), ry: ISO.ry * 0.8, rx: ISO.rx, rz: 0, shadow: clamp(u), sheen: lerp(-1.5, 1.5, seg(t, f0 + 10, f0 + 50)) };
  // órbita suave en isométrico
  const a = (t - f0) / 60 * 1.3 + (id === 'w07' ? 0 : Math.PI);
  st.x += Math.cos(a) * 16; st.y += Math.sin(a) * 10; st.z += Math.sin(a) * 0.3;
  // regresan a la página como los mosaicos del filtro "postres"
  const v = eInOutCubic(seg(t, EV.boton[0], EV.boton[0] + 30));
  if (v > 0) {
    const T = TILES[id === 'w07' ? 0 : 1];
    const [lx, ly] = pageToLocal(T.x + T.w / 2, T.y + T.h / 2);
    const d = phoneLocalToDesign(t, lx, ly);
    st.x = lerp(st.x, d.x, v); st.y = lerp(st.y, d.y, v); st.z = lerp(st.z, d.z + 0.02, v);
    st.w = lerp(st.w, T.w * d.s, v); st.h = lerp(st.h, T.h * d.s, v); st.ry = lerp(st.ry, 0, v); st.rx = lerp(st.rx, 0, v); st.shadow *= 1 - v;
    if (v >= 1) return null;
  }
  return st;
}
function chipState(i, t) {
  const C = LAY.chips; const f0 = EV.chips[i];
  if (t < f0 || t > EV.boton[0] + 26) return null;
  const ph = phoneAt(t);
  const c = CHIPS[i];
  const [lx, ly] = pageToLocal(c.x + c.w / 2, CHIP_Y + CHIP_H / 2);
  const d = phoneLocalToDesign(t, lx, ly);
  const u = springF(t, f0, 200, 17);
  const back = eInOutCubic(seg(t, EV.boton[0], EV.boton[0] + 24));
  const tx = ph.x + C.dx[i], ty = C.y;
  const k = lerp(1, 0, back);
  const uu = clamp(u) * k;
  const act = i === 1 ? eOutCubic(seg(t, EV.chipPostres, EV.chipPostres + 8)) : 0;
  const pop = i === 1 ? Math.exp(-Math.max(0, t - EV.chipPostres) / 5) * (t >= EV.chipPostres ? 0.08 : 0) : 0;
  return { x: lerp(d.x, tx, u * k), y: lerp(d.y, ty, u * k), z: lerp(d.z + 0.02, C.z, uu), s: lerp(c.w * d.s / C.w, 1, uu) * (1 + pop), act, glow: pop * 6, vis: back < 1 };
}
function btnState(t) {
  const B = LAY.btn;
  if (t < EV.boton[0] || t > EV.aCierre[0] + 26) return null;
  const ph = phoneAt(t);
  const [lx, ly] = pageToLocal(BTN_PAGE.x + BTN_PAGE.w / 2, BTN_PAGE.y + BTN_PAGE.h / 2);
  const d = phoneLocalToDesign(t, lx, ly);
  const u = eOutBack(seg(t, EV.boton[0], EV.boton[1]), 1.3);
  const back = eInOutCubic(seg(t, EV.aCierre[0], EV.aCierre[0] + 24));
  const k = clamp(u) * (1 - back);
  const press = Math.exp(-Math.pow((t - EV.toque - 3) / 4, 2));
  const pulse = EV.pulsos.reduce((a, f) => a + (t >= f ? Math.exp(-(t - f) / 7) : 0), 0);
  return { x: lerp(d.x, B.x, k), y: lerp(d.y, B.y, k), z: lerp(d.z + 0.02, B.z, k), s: lerp(BTN_PAGE.w * d.s / B.w, 1, k) * (1 - 0.04 * press), press, glow: pulse * 0.5 };
}

// ---------- campo de la línea por tramo ----------
const outline = (q, rad, w = 3.4) => stroke(quadPath(q, rad, 5), 0, 1, w, { taper0: 0, taper1: 0 });
function panelQuad(p, pad = 16) { return quadOf({ x: p.x, y: p.y, z: p.z, rx: p.rx, ry: p.ry, rz: p.rz, s: 1 }, (p.w / 2 + pad) / 100, (p.h / 2 + pad) / 100, 0.0); }
function campo(t, st) {
  const F = { A: [], B: [], mix: 0, liquid: 0, glow: 0, swell: 0 };
  const ringR = LAY.ring.d * 0.5 + 4;
  const { cx: rcx, cy: rcy } = LAY.ring;
  const morph = (a, b, f0, f1, liquid = 0.8, swell = 16) => { F.A.push(...[].concat(a)); F.B.push(...[].concat(b)); F.mix = eInOutCubic(seg(t, f0, f1)); F.liquid = Math.sin(Math.PI * F.mix) * liquid; F.swell = swell; };
  const scrOutline = () => outline(phoneScreenQuad(t), 50 * phoneAt(t).s * 0.92, 3.2);
  const bodyOutline = () => outline(phoneBodyQuad(t), 60 * phoneAt(t).s * 0.95, 3.6);
  const cardOutline = (i) => { const c = st.cards[i]; return c ? outline(panelQuad(c), 30, 3.4) : null; };
  const parOutline = (id) => { const p = st.par[id]; return p ? outline(panelQuad(p), 30, 3.6) : null; };

  if (t < 34) {
    const head = lerp(0.42, 1.0, eOutExpo(seg(t, 0, 20)));
    const tail = eInCubic(seg(t, 4, 30)) * 0.15;
    if (t < EV.corte) {
      F.A.push(stroke(HOOK, tail, head, 9, { taper0: 0.08, taper1: 0.02 }));
      F.glow = Math.exp(-Math.pow((t - EV.corte + 1) / 2.5, 2)) * 0.8;
    } else {
      const u = eOutCubic(seg(t, EV.corte, 34)), cut = 0.56;
      const a0 = lerp(tail, cut - 0.06, u), a1 = cut - 0.012 - 0.02 * u;
      const b0 = cut + 0.012 + 0.02 * u, b1 = lerp(head, cut + 0.07, u);
      const sA = DA.A.pts[0], sD = DA.D.pts[0];
      const pa = HOOK.pts[Math.round(((a0 + a1) / 2) * (HOOK.pts.length - 1))];
      const pb = HOOK.pts[Math.round(((b0 + b1) / 2) * (HOOK.pts.length - 1))];
      const ea = eInOutCubic(u);
      F.A.push(stroke(HOOK, a0, a1, 9, { taper0: 0.03, taper1: 0.01, tf: (x, y) => [x + (sA[0] - pa[0]) * ea, y + (sA[1] - pa[1]) * ea] }));
      F.A.push(stroke(HOOK, b0, b1, 9, { taper0: 0.01, taper1: 0.03, tf: (x, y) => [x + (sD[0] - pb[0]) * ea, y + (sD[1] - pb[1]) * ea] }));
      F.glow = Math.exp(-Math.pow((t - EV.corte) / 2.5, 2)) * 0.9;
      st.spark = { x: HOOK.pts[Math.round(cut * (HOOK.pts.length - 1))], u: seg(t, EV.corte, EV.corte + 10) };
    }
  } else if (t < EV.aCirculo[0]) {
    const uD = eInOutSine(seg(t, EV.daD[0], EV.daD[1])), uA = eInOutSine(seg(t, EV.daA[0], EV.daA[1]));
    F.A.push(stroke(DA.D, 0, Math.max(0.012, uD), 9.5, { taper0: 0.03, taper1: uD < 1 ? 0.004 : 0.05, head: uD < 1 ? 0.35 : 0 }));
    F.A.push(stroke(DA.A, 0, Math.max(0.03, uA), 9.5, { taper0: 0.06, taper1: uA < 1 ? 0.004 : 0.06, head: uA < 1 ? 0.35 : 0 }));
  } else if (t < EV.aRosetas[0]) {
    morph([stroke(DA.D, 0, 1, 9.5, { taper0: 0.03, taper1: 0.05 }), stroke(DA.A, 0, 1, 9.5, { taper0: 0.06, taper1: 0.06 })], ringStroke(rcx, rcy, ringR, 3.6), EV.aCirculo[0], EV.aCirculo[1], 0.9, 26);
  } else if (t < EV.revela02[0]) {
    const rr0 = 70 * eOutBack(seg(t, EV.aRosetas[0], EV.aRosetas[1]), 1.6);
    const ros = rosetteCenters().map((c, i) => stroke(rosettePath(c[0], c[1], Math.max(8, rr0), 2.2, i * 1.3), 0, 1, 5.5, { taper0: 0.15, taper1: 0.02 }));
    morph(ringStroke(rcx, rcy, ringR, 3.6), ros, EV.aRosetas[0], EV.revela02[0], 0.7, 14);
  } else if (t < EV.celularForma[1] + 4) {
    const ros = rosetteCenters().map((c, i) => stroke(rosettePath(c[0], c[1], 70, 2.2, i * 1.3), 0, 1, 5.5, { taper0: 0.15, taper1: 0.02 }));
    morph(ros, scrOutline(), EV.revela02[0], EV.celularForma[1], 0.8, 18);
  } else if (t < EV.tarjeta[0]) {
    F.A.push(scrOutline());
  } else if (t < EV.aParallax[0]) {
    // listón: salta de tarjeta en tarjeta con morphs líquidos al aterrizar cada una
    const k = t < EV.tarjeta[1] ? 0 : t < EV.tarjeta[2] ? 1 : 2;
    const f = EV.tarjeta[k];
    const from = k === 0 ? scrOutline() : cardOutline(k - 1);
    morph(from, cardOutline(k), f, f + 16, 0.7, 14);
  } else if (t < EV.liston02[0]) {
    morph(cardOutline(2) || parOutline('p06'), parOutline('p06'), EV.aParallax[0], EV.liston06[1], 0.8, 18);
  } else if (t < EV.aPagina[0]) {
    morph(parOutline('p06'), parOutline('p02'), EV.liston02[0], EV.liston02[1], 0.8, 16);
  } else if (t < EV.lineaChips[0]) {
    const from = parOutline('p02') || bodyOutline();
    morph(from, bodyOutline(), EV.aPagina[0], EV.aPagina[1], 0.8, 16);
  } else if (t < EV.subrayado[0]) {
    // la línea pasa entre los chips como un listón ondulado
    const C = LAY.chips, ph = phoneAt(t);
    const pts = [];
    for (let x = -40; x <= DW + 40; x += 10) {
      const rel = (x - ph.x) / Math.abs(C.dx[2] - C.dx[1]);
      pts.push([x, C.y + Math.sin((rel + 0.5) * Math.PI + (t - EV.lineaChips[0]) / 14) * C.h * 0.95]);
    }
    const head = eInOutCubic(seg(t, EV.lineaChips[0] + 6, EV.lineaChips[1]));
    const wave = stroke(resample(pts, 5), 0, Math.max(0.02, head), 4.5, { taper0: 0.04, taper1: head < 1 ? 0.01 : 0.04, head: head < 1 ? 0.3 : 0 });
    morph(bodyOutline(), wave, EV.lineaChips[0], EV.lineaChips[0] + 20, 0.6, 12);
    if (t >= EV.lineaChips[0] + 20) { F.A = [wave]; F.B = []; F.mix = 0; }
  } else if (t < EV.aCierre[0]) {
    const B = LAY.btn, U = LAY.under, ph = phoneAt(t);
    const under = stroke(resample([[B.x - U.w / 2, U.y], [B.x + U.w / 2, U.y]], 5), 0, 1, 5, { taper0: 0.05, taper1: 0.05 });
    const pulse = EV.pulsos.reduce((a, f) => a + (t >= f ? Math.exp(-(t - f) / 6) : 0), 0);
    under.w = under.w.map((w) => w * (1 + 0.7 * pulse));
    F.glow = pulse * 0.5;
    if (t < EV.subrayado[1]) {
      const C = LAY.chips; const pts = [];
      for (let x = -40; x <= DW + 40; x += 10) { const rel = (x - ph.x) / Math.abs(C.dx[2] - C.dx[1]); pts.push([x, C.y + Math.sin((rel + 0.5) * Math.PI + (t - EV.lineaChips[0]) / 14) * C.h * 0.95]); }
      morph(stroke(resample(pts, 5), 0, 1, 4.5, { taper0: 0.04, taper1: 0.04 }), under, EV.subrayado[0], EV.subrayado[1], 0.7, 14);
    } else F.A.push(under);
  } else if (t < EV.endCorte) {
    const C = LAY.cierre;
    const U = LAY.under, ph = phoneAt(t);
    if (t < EV.aCierre[0] + 26) {
      const under = stroke(resample([[LAY.btn.x - U.w / 2, U.y], [LAY.btn.x + U.w / 2, U.y]], 5), 0, 1, 5, { taper0: 0.05, taper1: 0.05 });
      morph(under, bodyOutline(), EV.aCierre[0], EV.aCierre[0] + 26, 0.7, 14);
    } else morph(bodyOutline(), ringStroke(C.x, C.y, C.d * 0.5 + 4, 3.4), EV.aCierre[0] + 26, EV.logoCierre[0] + 8, 0.8, 18);
  } else {
    // end card: el anillo baja y se vuelve el subrayado de $1,000
    const C = LAY.cierre, E = LAY.end;
    const L = logoEnd(t);
    const ring = ringStroke(L.x, L.y, L.d * 0.5 + 4, 3.4 * L.d / C.d);
    const under = stroke(resample([[DW / 2 - E.under.w / 2, E.under.y], [DW / 2 + E.under.w / 2, E.under.y]], 5), 0, 1, 5.5, { taper0: 0.06, taper1: 0.06 });
    morph(ring, under, EV.endSubrayado[0], EV.endSubrayado[1], 0.8, 16);
  }
  F.A = F.A.filter(Boolean); F.B = F.B.filter(Boolean);
  if (!F.B.length) F.mix = 0;
  if (!F.A.length && F.B.length) { F.A = F.B; F.B = []; F.mix = 0; }
  return F;
}

function logoEnd(t) {
  const C = LAY.cierre, E = LAY.end.logo;
  const u = eInOutCubic(seg(t, EV.endCorte, EV.endCorte + 20));
  return { x: lerp(C.x, E.x, u), y: lerp(C.y, E.y, u), d: lerp(C.d, E.d, u) };
}

// devuelve todo lo que cambia con t
function estado(t) {
  const st = { cam: { x: 0, y: 0, z: DIST }, glow: 0, logo: null, phone: null, form: 0, blobs: null, scr: null, cards: [], par: {}, wall: {}, chips: [], btn: null };
  // cámara: una sola, física
  const E = EV;
  st.cam.z = DIST * keys(t, [[0, 1], [30, 1], [200, 0.94], [E.aParallax[0], 0.94], [400, 0.9], [E.aPagina[0], 0.9], [E.aPagina[1], 1.0], [E.boton[0], 1.0], [E.boton[0] + 42, 0.86], [E.aCierre[0], 0.86], [E.aCierre[1], 1.0], [END, 1.0], [FRAMES_T - 1, 0.97]]);
  st.cam.x = keys(t, [[0, 0], [360, 0], [372, -0.5], [E.aPagina[0] - 4, 0.55], [E.aPagina[0] + 26, 0]], eInOutSine);
  const by = (DH / 2 - LAY.btn.y) / 100 * 0.6;
  st.cam.y = keys(t, [[0, 0], [E.boton[0], 0], [E.boton[0] + 42, by], [E.aCierre[0], by], [E.aCierre[1], 0]]);
  st.glow = 0.4 + 0.6 * eOutCubic(seg(t, 0, 40));
  setCam(st.cam); // las proyecciones de este t (contornos, mosaicos) usan la cámara de este t

  // logo: aparece en el anillo, vuela al encabezado (S2); vuelve en el cierre y sube en la end card
  const ringD = LAY.ring.d;
  if (t >= EV.logoAbre[0] - 1 && t < EV.iso[0]) {
    const rev = eOutCubic(seg(t, EV.logoAbre[0], EV.logoAbre[1]));
    const go = eInOutCubic(seg(t, 186, EV.iso[0]));
    const [lx, ly] = pageToLocal(195, 50);
    const d = phoneLocalToDesign(t, lx, ly);
    st.logo = { x: lerp(LAY.ring.cx, d.x, go), y: lerp(LAY.ring.cy, d.y, go), d: lerp(ringD, 64 * d.s, go) * (1 + 0.04 * Math.sin(Math.PI * rev)), rev, z: lerp(0, d.z + 0.03, go) };
  }
  if (t >= EV.logoCierre[0]) {
    const rev = eOutCubic(seg(t, EV.logoCierre[0], EV.logoCierre[1]));
    const L = logoEnd(t);
    st.logo = { x: L.x, y: L.y, d: L.d, rev, z: 0 };
  }

  // celular
  if (t >= EV.aRosetas[0] && t < EV.logoCierre[1]) {
    const p = phoneAt(t);
    if (p.vis) {
      st.phone = p;
      const grow = eInCubic(seg(t, EV.revela02[0], EV.revela02[1]));
      st.blobs = rosetteCenters().map((c) => ({ x: c[0], y: c[1], r: lerp(0, 520, grow) }));
      st.full = grow >= 1;
      if (t >= EV.aCierre[0] + 24) {
        // cierre: la pantalla se cierra como un iris líquido hacia el centro
        const u = eInCubic(seg(t, EV.aCierre[0] + 24, EV.logoCierre[0] + 14));
        st.blobs = [0, 1, 2, 3, 4].map((i) => ({ x: p.x + Math.cos(i * 1.256) * 30 * (1 - u), y: p.y + Math.sin(i * 1.256) * 30 * (1 - u), r: lerp(700, 0, u) }));
        st.full = false;
      }
      st.form = eInOutCubic(seg(t, EV.celularForma[0], EV.celularForma[1]));
      if (t >= EV.aCierre[0]) st.form = 1 - eInOutCubic(seg(t, EV.aCierre[0] + 30, EV.logoCierre[1] - 8));
      const modo = t < EV.aPagina[0] ? 'hero' : 'pagina';
      st.scr = { modo, logo: t >= EV.iso[0] };
      if (modo === 'pagina') {
        st.scr.hero = t >= EV.aPagina[0] + 32;
        st.scr.tiles = [0, 1, 2].map((i) => t >= EV.aPagina[0] + 18 + i * 6 + 30).concat([t >= EV.aPagina[0] + 6 + 30]);
        st.scr.chip = t >= EV.chipPostres ? 1 : 0;
        st.scr.chipsFuera = [0, 1, 2].map((i) => t >= EV.chips[i] && t < EV.boton[0] + 24);
        st.scr.filtro = t >= EV.chipPostres ? 'postres' : 'todos';
        st.scr.t07 = t >= EV.boton[0] + 30; st.scr.t04 = t >= EV.boton[0] + 30;
        st.scr.btnFuera = t >= EV.boton[0] && t < EV.aCierre[0] + 24;
      }
    }
  }

  // tarjetas, paneles, muro, chips, botón
  st.cards = [0, 1, 2].map((i) => cardState(i, t));
  st.par = { p06: parState('p06', t), p02: parState('p02', t) };
  st.wall = { w07: wallState('w07', t), w04: wallState('w04', t) };
  st.chips = [0, 1, 2].map((i) => chipState(i, t));
  st.btn = btnState(t);
  if (st.btn && t >= EV.toque - 2) { const b = st.btn; st.ripple = [b.x, b.y]; }
  st.field = campo(t, st);
  return st;
}

function aplicarPanel(P, p, fx = 0.5, fy = 0.5) {
  if (!p) { P.g.visible = false; return; }
  P.g.visible = true;
  P.g.position.copy(toWorld(p.x, p.y, p.z));
  P.g.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
  P.mesh.scale.set(p.w / 100 / P.w, p.h / 100 / P.h, 1);
  setCrop(P, p.w / p.h, p.fx != null ? p.fx : fx, fy);
  P.mat.uniforms.uSheen.value = p.sheen != null ? p.sheen : -2;
  const sw = p.w / 100, sh = p.h / 100;
  P.sh.position.set(0.12, -0.22, -0.5);
  setSoftShadow(P.sh, sw, sh, 0.16, 0.35, 0.5 * (p.shadow != null ? p.shadow : 1));
}
function aplicarPill(P, p) {
  if (!p || p.vis === false) { P.g.visible = false; return; }
  P.g.visible = true;
  P.g.position.copy(toWorld(p.x, p.y, p.z));
  P.g.rotation.set(0, 0, 0);
  P.g.scale.setScalar(p.s);
  P.mat.uniforms.uActive.value = p.act || 0;
  P.mat.uniforms.uPress.value = p.press || 0;
  P.mat.uniforms.uGlow.value = p.glow || 0;
  P.sh.position.set(0.08, -0.16, -0.4);
  setSoftShadow(P.sh, P.w, P.h, P.r, 0.25, 0.45);
}

function setCam(c) {
  camera.position.set(c.x, c.y, c.z);
  camera.lookAt(c.x, c.y, 0);
  camera.updateMatrixWorld(true);
}
function aplicar(st) {
  setCam(st.cam);
  bgMat.uniforms.uGlow.value.set(0.32, 0.72, st.glow);

  if (st.logo) {
    logo.visible = true; logoShadow.visible = st.logo.rev > 0.01;
    const L = st.logo; const d = L.d / 100;
    logo.position.copy(toWorld(L.x, L.y, L.z)); logo.scale.set(d, d, 1);
    logoMat.uniforms.uReveal.value = L.rev * 1.001;
    logoShadow.position.copy(toWorld(L.x + 10, L.y + 18, L.z - 0.3));
    setSoftShadow(logoShadow, d * 0.96, d * 0.96, d * 0.48, 0.35, 0.45 * L.rev);
  } else { logo.visible = false; logoShadow.visible = false; }

  if (st.phone) {
    phone.visible = true;
    const p = st.phone;
    phone.position.copy(toWorld(p.x, p.y, p.z)); phone.rotation.set(p.rx, p.ry, 0); phone.scale.setScalar(p.s);
    bodyMat.uniforms.uForm.value = st.form;
    bodyMesh.visible = st.form > 0.001;
    setSoftShadow(phoneShadow, BODY.w, BODY.h, BODY.r, 0.5, 0.5 * st.form);
    phone.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(phone.matrixWorld).invert();
    st.blobs.forEach((b, i) => { const w = toWorld(b.x, b.y, 0).applyMatrix4(inv); screenMat.uniforms.uBlobs.value[i].set(w.x, w.y, b.r / 100 / p.s); });
    screenMat.uniforms.uReveal.value = st.full ? 2 : 1;
  } else phone.visible = false;

  CARD_IDS.forEach((id, i) => aplicarPanel(PANELS[id], st.cards[i], 0.5, id === 'c01' ? 0.4 : 0.5));
  aplicarPanel(PANELS.p06, st.par.p06, 0.5, 0.5);
  aplicarPanel(PANELS.p02, st.par.p02, 0.04, 0.5);
  aplicarPanel(PANELS.w07, st.wall.w07);
  aplicarPanel(PANELS.w04, st.wall.w04);
  ['k0', 'k1', 'k2'].forEach((id, i) => aplicarPill(PILLS[id], st.chips[i]));
  aplicarPill(PILLS.btn, st.btn);
}

// =====================================================================================
// RENDER: 8 subcuadros (motion blur + antialias temporal)
// =====================================================================================
const IMG = {};
const loadImg = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
async function init() {
  try { const r = await fetch('/voz/voz.json'); if (r.ok) PAL = (await r.json()).palabras || {}; } catch (e) { /* sin voz: tiempos planeados */ }
  await Promise.all(['300', '400', '500', '600'].map((w) => document.fonts.load(`${w} 40px Jost`)));
  await document.fonts.load('400 40px Sacramento');
  const A = '/assets/preparados/';
  const files = { logo: '00_logo_deliciarte.png', p01: '01_pastel_personalizado_a.jpg', p02: '02_pastel_rosetas_rosa.jpg', p03: '03_pastel_cumpleanos_infantil.jpg', p04: '04_rollos_canela_horno.jpg', p05: '05_pastel_corazon_verde_rosa.jpg', p06: '06_pastel_crema_dorado.jpg', p07: '07_pastelitos_cuchareables.jpg' };
  await Promise.all(Object.entries(files).map(async ([k, f]) => { IMG[k] = await loadImg(A + f); }));
  const lt = new THREE.Texture(IMG.logo); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8; lt.needsUpdate = true;
  logoMat.uniforms.uTex.value = lt;
  const C = LAY.card;
  makePanel('c01', IMG.p01, C.w, C.h, 'PASTELES PERSONALIZADOS');
  makePanel('c03', IMG.p03, C.w, C.h, 'CUMPLEAÑOS');
  makePanel('c05', IMG.p05, C.w, C.h, 'CORAZÓN DE BETÚN');
  makePanel('p06', IMG.p06, LAY.par.p06.w, LAY.par.p06.h);
  makePanel('p02', IMG.p02, LAY.par.p02.w, LAY.par.p02.h);
  makePanel('w07', IMG.p07, LAY.wall.w07.w, LAY.wall.w07.h, 'PASTELITOS CUCHAREABLES');
  makePanel('w04', IMG.p04, LAY.wall.w04.w, LAY.wall.w04.h, 'ROLLOS DE CANELA');
  const K = LAY.chips;
  CHIPS.forEach((c, i) => makePill('k' + i, K.w, K.h, c.t, K.px));
  makePill('btn', LAY.btn.w, LAY.btn.h, 'PIDE POR WHATSAPP', LAY.btn.px, true);
  DA = daPaths(); HOOK = hookPath();
  window.ready = true;
}

const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
const GLASS = () => [bodyMesh, ...Object.values(PILLS).map((p) => p.mesh)];
function drawScene(jx, jy, target) {
  camera.setViewOffset(W, H, jx, jy, W, H);
  renderer.setRenderTarget(target); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
  renderer.render(bgScene, quadCam);
  renderer.render(scene, camera);
  camera.clearViewOffset();
}
window.renderFrame = async (f, { sub = 8, shutter = 1.0 } = {}) => {
  renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
  accScene.children[0].material.opacity = 1 / sub;
  bgMat.uniforms.uSeed.value = Math.floor(f) * 13.1;
  // fondo para el vidrio (una vez por cuadro): la escena sin las piezas de vidrio, desenfocada
  {
    const st = estado(f); aplicar(st); pantalla(st);
    const g = GLASS(), vis = g.map((m) => m.visible);
    g.forEach((m) => { m.visible = false; });
    drawScene(0, 0, rtBack);
    g.forEach((m, i) => { m.visible = vis[i]; });
    blurInto(rtBack, rtBlur);
  }
  for (let k = 0; k < sub; k++) {
    const t = f + ((k + 0.5) / sub - 0.5) * shutter;
    const st = estado(t);
    aplicar(st);
    pantalla(st);
    const jx = halton(k + 1, 2) - 0.5, jy = halton(k + 1, 3) - 0.5;
    const ox = jx / S, oy = jy / S;
    drawScene(jx, jy, rtSub);
    const Fd = st.field;
    if (Fd && Fd.A.length) {
      buildField(Fd.A, fieldA, -ox, -oy);
      if (Fd.mix > 0 && Fd.B.length) buildField(Fd.B, fieldB, -ox, -oy);
      fieldMat.uniforms.uMix.value = Fd.mix > 0 && Fd.B.length ? Fd.mix : 0;
      fieldMat.uniforms.uLiquid.value = Fd.liquid;
      fieldMat.uniforms.uSwell.value = Fd.swell || 0;
      fieldMat.uniforms.uTime.value = t / 30;
      fieldMat.uniforms.uGlow.value = Fd.glow || 0;
      renderer.setRenderTarget(rtSub);
      renderer.render(fieldScene, quadCam);
    }
    capa2D(t, st, -ox, -oy);
    renderer.setRenderTarget(rtSub);
    renderer.render(ovScene, quadCam);
    renderer.setRenderTarget(rtAcc);
    renderer.render(accScene, quadCam);
  }
  renderer.setRenderTarget(null);
  renderer.clear(true, true, true);
  renderer.render(outScene, quadCam);
  return renderer.domElement.toDataURL('image/png');
};


init().catch((e) => { window.initError = String((e && e.stack) || e); });
