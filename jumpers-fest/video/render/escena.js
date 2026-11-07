// frame(t) determinista del video de Jumpers Fest (60 fps, 1650 cuadros): un solo plano continuo.
// Hook (tubo que escribe en una barra de cristal) → celular 3D de cristal con la página real capturada →
// piezas 3D que se inflan y salen de la pantalla (tarjetas, descripción, botón cojín, postal) → el tubo
// se arquea en un arcoíris pastel 3D → end card con placa blanca y el logo real.
// t en cuadros de 60 fps (puede ser fraccionario). ?fmt=916 (1080 × 1920 de diseño) o ?fmt=11 (1080 × 1080, re-layout propio).
import * as THREE from 'three';
import { typingFrames } from '/brief/tiempos.mjs';

const Q = new URLSearchParams(location.search);
const FMT = Q.get('fmt') || '916';
const W = +(Q.get('w') || 540), H = +(Q.get('h') || (FMT === '11' ? 540 : 960));
const UI = Q.get('ui') || '/build/ui_video';
const TEX = Q.get('tex') || '/review/fase0/texturas_3x';
// ---------- composición por formato (px de diseño, 1080 de ancho) ----------
// 916: vertical 1080 × 1920. 11: cuadrado 1080 × 1080, re-layout propio (no recorte): celular de 800 px de alto,
// el texto a los lados a la misma altura del celular, búsqueda al centro y el cierre al 85 %.
const LAYOUTS = {
  916: { DH: 1920, phoneH: 1152, pose0: [540, 915], hookY: 0, lineas: [860, 948, 1036], xIzq: 64, xDer: 612,
    arco: { cx: 540, cy: 1010, pata: 100, a: 31, R: [386, 318, 250, 182, 114] }, placa: { cx: 540, cy: 1150, w: 640, h: 370, r: 60 }, logoW: 520,
    fin: { y: 1410, legalY: 1500 }, escDesc: 1.9 },
  11: { DH: 1080, phoneH: 800, pose0: [540, 540], hookY: -420, lineas: [485, 573, 661], xIzq: 64, xDer: 540,
    arco: { cx: 540, cy: 500, pata: 85, a: 26, R: [328, 270, 212, 155, 97] }, placa: { cx: 540, cy: 620, w: 544, h: 315, r: 51 }, logoW: 442,
    fin: { y: 852, legalY: 942 }, escDesc: 2.3 },
};
const LAY = LAYOUTS[FMT];
const DW = 1080, DH = LAY.DH, S = W / DW;
const FPS = 60, DEG = Math.PI / 180;

const TL = await (await fetch('/brief/timeline.json')).json();
const META = await (await fetch(`${UI}/meta.json`)).json();
const R = META.rects;

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (f, a, b) => clamp((f - a) / (b - a));
const eOutCubic = (u) => 1 - Math.pow(1 - u, 3);
const eInCubic = (u) => u * u * u;
const eInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eInOutSine = (u) => -(Math.cos(Math.PI * u) - 1) / 2;
const bump = (t, a, b, c, d) => eInOutCubic(seg(t, a, b)) - eInOutCubic(seg(t, c, d));
function spring(ts, k = 170, c = 18) {
  if (ts <= 0) return 0;
  const w0 = Math.sqrt(k), z = c / (2 * Math.sqrt(k));
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * ts) * (Math.cos(wd * ts) + (z * w0 / wd) * Math.sin(wd * ts)); }
  return 1 - Math.exp(-w0 * ts) * (1 + w0 * ts);
}
const springF = (f, f0, k, c) => spring((f - f0) / FPS, k, c);
// "se infla": respuesta a un impulso (sube unos 7 %, baja un poco y se asienta)
const puff = (f, f0, A = 0.12, w = 14, z = 0.35) => { const ts = (f - f0) / FPS; if (ts <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return A * Math.exp(-z * w * ts) * Math.sin(wd * ts); };
function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
function catmull(ctrl, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * (ctrl.length - 1), k = Math.min(ctrl.length - 2, Math.floor(u)), f = u - k;
    const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
    const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * f + (2 * a - 5 * b + 4 * cc - d) * f * f + (-a + 3 * b - 3 * cc + d) * f * f * f);
    out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}
const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [0, 1].map((i) => v * v * v * p0[i] + 3 * v * v * u * p1[i] + 3 * v * u * u * p2[i] + u * u * u * p3[i]); };

// ---------- mundo: 1 unidad = 100 px CSS de la pantalla ----------
const FOV = 22;
const STATUS = 47, VIEW_H = 844;
const SCR = { w: 3.90, h: (STATUS + VIEW_H) / 100, r: 0.50 };
const BODY = { w: 4.32, h: 9.33, r: 0.70, d: 0.30 };
const PXU = LAY.phoneH / BODY.h; // 9:16: el celular mide 1152 px de alto (60 %), 1.236 px de video por px CSS; 1:1: 800 px, 0.857
const VIS_H = DH / PXU;
const DIST = VIS_H / (2 * Math.tan((FOV / 2) * DEG));
const FRONT_Z = BODY.d / 2;
const SCR_Z = FRONT_Z - 0.006;
const pageToLocal = (x, y) => [(x - 195) / 100, SCR.h / 2 - (STATUS + y) / 100];
const D2W = (x, y) => [(x - DW / 2) / PXU, (DH / 2 - y) / PXU];

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
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
// fondo desenfocado para el cristal (σ ≈ 32 px en el cuadro de 1080)
const BW = Math.max(2, Math.round(W / 2)), BH = Math.max(2, Math.round(H / 2));
const rtBack = new THREE.WebGLRenderTarget(BW, BH, rtOpts);
const rtTmp = new THREE.WebGLRenderTarget(BW, BH, { ...rtOpts, depthBuffer: false });
const rtBlur = new THREE.WebGLRenderTarget(BW, BH, { ...rtOpts, depthBuffer: false });
const blurMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: null }, uDir: { value: new THREE.Vector2() }, uSigma: { value: 8 }, uStep: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: 'uniform sampler2D uTex; uniform vec2 uDir; uniform float uSigma; uniform float uStep; varying vec2 vUv; void main(){ vec4 acc = vec4(0.); float ws = 0.; for (int i = -24; i <= 24; i++) { float x = float(i) * uStep; float w = exp(-0.5 * x * x / (uSigma * uSigma)); acc += texture2D(uTex, vUv + uDir * x) * w; ws += w; } gl_FragColor = acc / ws; }',
  depthTest: false, depthWrite: false,
});
const blurScene = quadScene(blurMat);
function blurInto(src, dst) {
  const sigma = (32 * W) / 1080 / 2;
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
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
// estudio claro: cielo blanco cálido, caja de luz arriba a la izquierda y contorno neutro a la derecha
vec3 envLight(vec3 R){
  vec3 c = mix(lin(vec3(0.80, 0.80, 0.79)), lin(vec3(1.0, 0.995, 0.985)), smoothstep(-0.4, 0.8, R.y));
  c += vec3(1.0) * smoothstep(0.86, 0.95, dot(R, normalize(vec3(-0.55, 0.62, 0.56)))) * 0.9;
  c += vec3(0.95) * smoothstep(0.92, 0.985, dot(R, normalize(vec3(0.97, 0.15, -0.05)))) * 0.5;
  return c;
}
`;

// ---------- fondo: blanco cálido con cielo pastel muy claro ----------
const bgMat = new THREE.ShaderMaterial({
  uniforms: { uAspect: { value: W / H }, uSeed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform float uAspect; uniform float uSeed; varying vec2 vUv;
    vec3 blob(vec3 c, vec2 p, vec2 at, float r, vec3 col, float a){ vec2 q = (p - at) * vec2(uAspect, 1.); return mix(c, col, a * exp(-dot(q, q) / r)); }
    void main(){
      vec2 p = vUv;
      vec3 c = mix(lin(vec3(0.969, 0.961, 0.949)), lin(vec3(0.925, 0.949, 0.961)), smoothstep(0.30, 1.0, p.y));
      c = blob(c, p, vec2(0.16, 0.80), 0.050, lin(vec3(0.953, 0.780, 0.812)), 0.16);
      c = blob(c, p, vec2(0.90, 0.64), 0.045, lin(vec3(0.863, 0.804, 0.922)), 0.15);
      c = blob(c, p, vec2(0.74, 0.10), 0.060, lin(vec3(0.804, 0.910, 0.788)), 0.12);
      c = blob(c, p, vec2(0.10, 0.22), 0.040, lin(vec3(0.965, 0.906, 0.659)), 0.10);
      vec2 v = (p - 0.5) * vec2(uAspect, 1.);
      c *= 1.0 - 0.05 * smoothstep(0.35, 0.95, length(v));
      c *= 1.0 + (hash12(gl_FragCoord.xy + uSeed) - 0.5) * 0.02;
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const bgScene = quadScene(bgMat);

// ---------- barra de búsqueda de cristal (hook): desenfoca lo de atrás, satura 140 %, borde de 1 px, ruido 2 % ----------
const BAR = { cx: 540, cy: 960 + LAY.hookY, w: 940, h: 132 };
const barMat = new THREE.ShaderMaterial({
  uniforms: { uC: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2() }, uR: { value: 1 }, uScale: { value: new THREE.Vector2(1, 1) }, uAlpha: { value: 0 }, uBack: { value: rtBlur.texture }, uRes: { value: new THREE.Vector2(W, H) }, uSeed: { value: 0 }, uPx: { value: S } },
  vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform vec2 uC; uniform vec2 uSize; uniform float uR; uniform vec2 uScale; uniform float uAlpha; uniform sampler2D uBack; uniform vec2 uRes; uniform float uSeed; uniform float uPx;
    void main(){
      vec2 p = gl_FragCoord.xy;
      vec2 q = (p - uC) / uScale;
      float d = sdRR(q, uSize * 0.5, uR);
      float ds = sdRR((p - uC - vec2(0., -16. * uPx)) / uScale, uSize * 0.5, uR);
      vec4 col = vec4(lin(vec3(0.106)), (1. - smoothstep(-12. * uPx, 50. * uPx, ds)) * 0.13 * uAlpha);
      if (d < 0.5 * uPx) {
        vec3 back = texture2D(uBack, p / uRes).rgb;
        float l = dot(back, vec3(0.2126, 0.7152, 0.0722));
        back = max(mix(vec3(l), back, 1.4), 0.);
        vec3 g = mix(back, vec3(1.), 0.52);
        float yy = q.y / (uSize.y * 0.5);
        g += vec3(0.05) * smoothstep(0.1, 0.95, yy);
        g *= 1. + (hash12(floor(p) + uSeed) - 0.5) * 0.04;
        float edge = 1. - smoothstep(0., 1.3 * uPx, -d);
        vec3 eCol = mix(lin(vec3(0.66)), vec3(1.), smoothstep(-0.7, 0.7, yy));
        g = mix(g, eCol, edge * 0.85);
        float a = 1. - smoothstep(-0.8 * uPx, 0.5 * uPx, d);
        col = vec4(mix(col.rgb, g, a), max(col.a, a * uAlpha));
      }
      gl_FragColor = col;
    }`,
  transparent: true, depthTest: false, depthWrite: false,
});
const barScene = quadScene(barMat);

// ---------- escena 3D ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, W / H, DIST * 0.1, DIST * 2.5);
camera.position.set(0, 0, DIST);

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
const softShadowMat = (opacity) => new THREE.ShaderMaterial({
  uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uR: { value: 0.2 }, uBlur: { value: 0.1 }, uOpacity: { value: opacity } },
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + 'uniform vec2 uSize; uniform float uR; uniform float uBlur; uniform float uOpacity; varying vec2 vP; void main(){ float d = sdRR(vP, uSize * 0.5, uR); float a = 1. - smoothstep(-uBlur, uBlur, d); gl_FragColor = vec4(lin(vec3(0.106, 0.106, 0.106)), a * a * uOpacity); }',
  transparent: true, depthWrite: false,
});
function setSoftShadow(mesh, w, h, r, blur, opacity) {
  const W2 = w + blur * 4, H2 = h + blur * 4;
  mesh.scale.set(W2, H2, 1);
  const u = mesh.material.uniforms;
  u.uSize.value.set(w / W2, h / H2); u.uR.value = r / Math.min(W2, H2); u.uBlur.value = blur / Math.min(W2, H2); u.uOpacity.value = opacity;
}

// ---------- celular de cristal ----------
const phone = new THREE.Group();
phone.rotation.order = 'YXZ';
scene.add(phone);
const dropShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.28));
dropShadow.position.set(0.36, -0.62, -1.0);
dropShadow.renderOrder = 0;
setSoftShadow(dropShadow, BODY.w, BODY.h, BODY.r, 0.8, 0.28);
phone.add(dropShadow);

const statusCanvas = document.createElement('canvas');
statusCanvas.width = 1170; statusCanvas.height = STATUS * 3;
function pintaEstado() {
  const c = statusCanvas.getContext('2d');
  c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, 1170, STATUS * 3);
  c.fillStyle = '#1B1B1B';
  c.font = '600 45px "DM Sans"'; c.textBaseline = 'middle';
  c.fillText('12:00', 84, 80);
  for (let i = 0; i < 4; i++) { const h = 14 + i * 7; c.fillRect(850 + i * 15, 92 - h, 10, h); }
  c.lineWidth = 6; c.strokeStyle = '#1B1B1B'; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(948, 96, 10 + i * 11, -Math.PI * 0.78, -Math.PI * 0.22); c.stroke(); }
  c.lineWidth = 4; c.beginPath(); c.roundRect(992, 64, 66, 32, 9); c.stroke();
  c.fillRect(1061, 74, 5, 12); c.beginPath(); c.roundRect(998, 70, 46, 20, 5); c.fill();
}
pintaEstado();
const statusTex = new THREE.CanvasTexture(statusCanvas);
statusTex.colorSpace = THREE.SRGBColorSpace;
const screenMat = new THREE.ShaderMaterial({
  uniforms: { uOp: { value: 1 }, uA: { value: null }, uB: { value: null }, uMix: { value: 0 }, uStatus: { value: statusTex }, uDim: { value: 1 }, uOn: { value: 0 }, uSize: { value: new THREE.Vector2(SCR.w, SCR.h) }, uR: { value: SCR.r }, uSt: { value: STATUS / (STATUS + VIEW_H) } },
  vertexShader: 'varying vec2 vUv; varying vec3 vLP; void main(){ vUv = uv; vLP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform float uOp; uniform sampler2D uA; uniform sampler2D uB; uniform float uMix; uniform sampler2D uStatus; uniform float uDim; uniform float uOn; uniform vec2 uSize; uniform float uR; uniform float uSt;
    varying vec2 vUv; varying vec3 vLP;
    void main(){
      float d = sdRR(vLP.xy, uSize * 0.5, uR);
      float a = 1. - smoothstep(-0.006, 0.0, d);
      vec3 c;
      if (vUv.y > 1. - uSt) c = texture2D(uStatus, vec2(vUv.x, (vUv.y - (1. - uSt)) / uSt)).rgb * uDim;
      else { vec2 uv = vec2(vUv.x, vUv.y / (1. - uSt)); c = mix(texture2D(uA, uv).rgb, texture2D(uB, uv).rgb, uMix); }
      c = mix(lin(vec3(0.071, 0.075, 0.08)), c, uOn);
      c *= 1. - 0.05 * smoothstep(-0.10, 0.0, d);
      vec2 cam = vec2(0., uSize.y * 0.5 - 0.235);
      c = mix(c, lin(vec3(0.05)), 1. - smoothstep(0.055, 0.062, length(vLP.xy - cam)));
      gl_FragColor = vec4(c, a * uOp);
    }`,
  transparent: true,
});
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), screenMat);
screenMesh.position.z = SCR_Z;
screenMesh.renderOrder = 1;
phone.add(screenMesh);

const BV = 0.08;
const bodyGeo = new THREE.ExtrudeGeometry(rrShape(BODY.w - 2 * BV, BODY.h - 2 * BV, BODY.r - BV), { depth: BODY.d - 2 * BV, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelSegments: 10, curveSegments: 48 });
bodyGeo.translate(0, 0, -(BODY.d - 2 * BV) / 2);
bodyGeo.computeVertexNormals();
const bodyMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 1 }, uScr: { value: new THREE.Vector2(SCR.w, SCR.h) }, uScrR: { value: SCR.r }, uBody: { value: new THREE.Vector2(BODY.w, BODY.h) }, uBodyR: { value: BODY.r }, uGlare: { value: 0 }, uBack: { value: rtBlur.texture }, uRes: { value: new THREE.Vector2(W, H) } },
  vertexShader: /* glsl */`
    varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
    void main(){ vLP = position; vLN = normal; vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: GLSL + /* glsl */`
    uniform float uOpacity; uniform vec2 uScr; uniform float uScrR; uniform vec2 uBody; uniform float uBodyR; uniform float uGlare; uniform sampler2D uBack; uniform vec2 uRes;
    varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
    void main(){
      vec3 N = normalize(vWN); vec3 V = normalize(cameraPosition - vWP);
      float ndv = clamp(dot(N, V), 0., 1.);
      float fres = pow(1. - ndv, 3.);
      float front = smoothstep(0.9, 0.995, normalize(vLN).z);
      float d = sdRR(vLP.xy, uScr * 0.5, uScrR);
      float inScr = 1. - smoothstep(-0.003, 0.003, d);
      vec2 suv = gl_FragCoord.xy / uRes + N.xy * (0.045 - 0.03 * front);
      vec3 bg = texture2D(uBack, suv).rgb;
      vec3 glass = bg * lin(vec3(0.95, 0.972, 0.98));
      vec3 env = envLight(reflect(-V, N));
      vec3 c = mix(glass, env, 0.08 + 0.72 * fres);
      float side = 1. - front;
      c = mix(c, lin(vec3(0.36, 0.39, 0.41)), side * (1. - smoothstep(0.05, 0.6, ndv)) * 0.7);
      float a = mix(0.9, 0.0, inScr * front);
      float rim = (1. - smoothstep(0.0, 0.022, abs(sdRR(vLP.xy, uBody * 0.5 - 0.075, uBodyR - 0.075)))) * front;
      float ring = (1. - smoothstep(0.0, 0.010, abs(d))) * front;
      c = mix(c, vec3(1.), rim * 0.9);
      c = mix(c, lin(vec3(0.55, 0.57, 0.58)), ring * 0.35);
      a = max(a, max(rim * 0.95, ring * 0.5));
      float band = vLP.x * 0.55 + vLP.y * 0.32 + uGlare;
      float glare = exp(-pow(band / 0.5, 2.)) * 0.075 + exp(-pow((band - 1.2) / 0.18, 2.)) * 0.05;
      if (inScr * front > 0.5) { c = vec3(1.); a = glare; }
      gl_FragColor = vec4(c, clamp(a, 0., 1.) * uOpacity);
    }`,
  transparent: true, depthWrite: false,
});
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.renderOrder = 5;
phone.add(bodyMesh);

// ---------- piezas 3D: la misma pieza de la interfaz con grueso de vinil, cojín y sombra ----------
const pieceV = /* glsl */`
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){ vLP = position; vLN = normal; vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const pieceF = GLSL + /* glsl */`
  uniform mat4 modelMatrix;
  uniform sampler2D uTex; uniform vec2 uSize; uniform float uR; uniform float uLift; uniform float uOpacity; uniform vec4 uClip; uniform float uClipAmt;
  uniform float uRimW; uniform float uPillow; uniform vec3 uSide;
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){
    float face = step(0.9, normalize(vLN).z);
    vec2 uv = vec2((vLP.x + uSize.x * .5) / uSize.x, (vLP.y + uSize.y * .5) / uSize.y);
    vec3 tex = texture2D(uTex, uv).rgb;
    // cojín: la cara se curva cerca del borde (normal inclinada); el centro de la interfaz queda plano y nítido
    vec2 hb = uSize * 0.5; float e = 0.01;
    float dE = sdRR(vLP.xy, hb, uR);
    float k = smoothstep(-uRimW, 0., dE);
    vec2 g = vec2(sdRR(vLP.xy + vec2(e, 0.), hb, uR) - sdRR(vLP.xy - vec2(e, 0.), hb, uR), sdRR(vLP.xy + vec2(0., e), hb, uR) - sdRR(vLP.xy - vec2(0., e), hb, uR));
    g = length(g) > 1e-6 ? normalize(g) : vec2(0.);
    vec3 Nl = normalize(mix(vec3(0., 0., 1.), vec3(g * uPillow, 1. - uPillow * 0.3), k * uLift));
    vec3 N = normalize(mix(normalize(vWN), normalize(mat3(modelMatrix) * Nl), face));
    vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
    vec3 V = normalize(cameraPosition - vWP);
    float ndl = clamp(dot(N, L), 0., 1.);
    vec3 Hh = normalize(L + V);
    float spec = pow(clamp(dot(N, Hh), 0., 1.), 60.) * 0.35 + pow(clamp(dot(N, Hh), 0., 1.), 12.) * 0.06;
    vec3 env = envLight(reflect(-V, N));
    float fres = pow(1. - clamp(dot(N, V), 0., 1.), 3.);
    vec3 lit = tex * (0.93 + 0.09 * ndl) + vec3(spec) * uLift + env * fres * 0.10 * uLift;
    vec3 side = uSide * (0.62 + 0.38 * ndl) + env * 0.18 + vec3(spec) * 0.6;
    vec3 c = mix(side, lit, face);
    vec2 p = vLP.xy;
    float inside = step(uClip.x, p.x) * step(p.x, uClip.z) * step(uClip.y, p.y) * step(p.y, uClip.w);
    gl_FragColor = vec4(c, mix(1., inside, uClipAmt) * uOpacity);
  }`;
const texLoader = new THREE.TextureLoader();
const cargando = [];
function cargaTex(url) {
  const tex = texLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cargando.push(new Promise((r) => { tex.onUpdate = r; setTimeout(r, 4000); }));
  return tex;
}
function piezaMesh(tex, w, h, r, grueso, lado = [0.97, 0.965, 0.955]) {
  const bv = Math.min(0.03, grueso / 3);
  const geo = new THREE.ExtrudeGeometry(rrShape(w - 2 * bv, h - 2 * bv, Math.max(0.01, r - bv)), { depth: Math.max(0.002, grueso - 2 * bv), bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 5, curveSegments: 24 });
  geo.translate(0, 0, -grueso + bv);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uSize: { value: new THREE.Vector2(w, h) }, uR: { value: r }, uLift: { value: 0 }, uOpacity: { value: 1 }, uClip: { value: new THREE.Vector4(-99, -99, 99, 99) }, uClipAmt: { value: 0 }, uRimW: { value: 0.22 }, uPillow: { value: 0.55 }, uSide: { value: new THREE.Vector3(...lado.map((v) => Math.pow(v, 2.2))) } },
    vertexShader: pieceV, fragmentShader: pieceF, transparent: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.order = 'YXZ';
  return mesh;
}

// Piezas que salen de la pantalla (cuadros del brief). `to`: punto de flote en coordenadas del celular
// (null = su mismo lugar); `esc`: escala relativa en el aire; `fin`: cuadros después de `vuelve` en que la captura
// vuelve a mostrar la pieza (hasta entonces la pieza 3D la cubre).
const conMargen = (r, px, py) => ({ x: r.x - px, y: r.y - py, w: r.w + 2 * px, h: r.h + 2 * py });
const PIEZAS = [
  { id: 'castle-jump', url: `${TEX}/tarjeta_castle-jump.png`, rect: R['castle-jump'], radio: 30, sale: 354, vuelve: 454, fin: 16, to: [-0.18, 2.35, 1.15], rot: [-5, 8, -3], recorte: true, fase: 0 },
  { id: 'rainbow-jump', url: `${TEX}/tarjeta_rainbow-jump.png`, rect: R['rainbow-jump'], radio: 30, sale: 370, vuelve: 462, fin: 16, to: [0.04, 0.05, 1.85], rot: [-4, 6, -1], recorte: true, fase: 2.1 },
  { id: 'magic-jump', url: `${TEX}/tarjeta_magic-jump.png`, rect: R['magic-jump'], radio: 30, sale: 386, vuelve: 446, fin: 16, to: [0.26, -2.25, 2.55], rot: [-3, 4, 1.5], recorte: true, fase: 4.2 },
  { id: 'descripcion', url: `${TEX}/descripcion_rainbow.png`, rect: conMargen(R.descripcion, 18, 14), radio: 18, sale: 514, vuelve: 562, fin: 14, to: [0, 'arriba', 1.4], rot: [-3, 0, 0], esc: LAY.escDesc, flota: 0.5 },
  { id: 'boton', url: `${TEX}/boton_apartar_whatsapp.png`, rect: R.boton, radio: 29, grueso: 0.20, sale: 868, vuelve: 900, fin: 14, to: [null, 'arriba', 1.1], rot: [-12, 0, 0], esc: 1.14, cojin: true, flota: 0.3, puff: 0.13 },
  { id: 'postal', url: `${TEX}/postal_arma_tu_fiesta.png`, rect: R.postal, radio: 30, sale: 1016, vuelve: 1061, fin: 24, to: [0, -0.2, 2.0], rot: [-3, 10, -4], esc: 2.0 },
];
const pieces = {};
for (const P of PIEZAS) {
  const w = P.rect.w / 100, h = P.rect.h / 100, r = P.radio / 100;
  const tex = cargaTex(P.url);
  const mesh = piezaMesh(tex, w, h, r, P.grueso || 0.08, P.cojin ? [0.16, 0.16, 0.16] : undefined);
  if (P.cojin) { mesh.material.uniforms.uRimW.value = 0.34; mesh.material.uniforms.uPillow.value = 0.9; }
  mesh.renderOrder = 3;
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.3));
  sh.renderOrder = 2;
  phone.add(mesh); phone.add(sh);
  const [cx, cy] = pageToLocal(P.rect.x + P.rect.w / 2, P.rect.y + P.rect.h / 2);
  const tx = P.to[0] == null ? cx : P.to[0];
  const ty = P.to[1] == null ? cy : P.to[1] === 'arriba' ? cy + 0.45 : P.to[1];
  pieces[P.id] = { P, mesh, sh, w, h, r, cx, cy, tx, ty, tz: P.to[2] };
}
const CLIP_PAGE = { x0: 0, y0: 64, x1: 390, y1: VIEW_H };

// ---------- arcoíris inflable 3D (cierre y end card) ----------
const ARCO = LAY.arco;
const BANDA_COL = ['#F3C7CF', '#F6E7A8', '#CDE8C9', '#C6DFEA', '#DCCDEB'];
class CurvaArco extends THREE.Curve {
  constructor(R, pata) { super(); this.R = R; this.pata = pata; this.L = 2 * pata + Math.PI * R; }
  getPoint(u, out = new THREE.Vector3()) {
    const s = u * this.L, R = this.R, p = this.pata;
    if (s < p) return out.set(-R, -p + s, 0);
    if (s > p + Math.PI * R) return out.set(R, -(s - p - Math.PI * R), 0);
    const a = Math.PI - (s - p) / R;
    return out.set(Math.cos(a) * R, Math.sin(a) * R, 0);
  }
}
const vinilV = /* glsl */`
  attribute vec3 aCenter; uniform float uInf;
  varying vec3 vN; varying vec3 vWP; varying vec3 vRad;
  void main(){
    vec3 rad = position - aCenter;
    vRad = normalize(rad);
    vec4 wp = modelMatrix * vec4(aCenter + rad * uInf, 1.);
    vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const vinilF = GLSL + /* glsl */`
  uniform vec3 uColor; uniform float uOpacity;
  varying vec3 vN; varying vec3 vWP; varying vec3 vRad;
  void main(){
    vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vWP);
    vec3 L = normalize(vec3(-0.45, 0.62, 0.64));
    float wrap = clamp((dot(N, L) + 0.4) / 1.4, 0., 1.);
    vec3 Hh = normalize(L + V);
    float spec = pow(clamp(dot(N, Hh), 0., 1.), 46.) * 0.30 + pow(clamp(dot(N, Hh), 0., 1.), 9.) * 0.05;
    float fres = pow(1. - clamp(dot(N, V), 0., 1.), 3.);
    vec3 env = envLight(reflect(-V, N));
    float ndv = clamp(dot(N, V), 0., 1.);
    vec3 c = uColor * mix(0.68, 1.04, wrap) + vec3(spec) + env * fres * 0.08;
    c *= 1. - 0.20 * pow(1. - ndv, 2.5);
    // costura al frente del tubo
    c *= 1. - 0.10 * smoothstep(0.990, 0.999, vRad.z);
    gl_FragColor = vec4(c, uOpacity);
  }`;
const sombraVinilF = /* glsl */`
  uniform float uOpacity; varying vec3 vN; varying vec3 vWP; varying vec3 vRad;
  void main(){ float a = smoothstep(0.0, 0.95, abs(vRad.z)); gl_FragColor = vec4(0.0115, 0.0115, 0.0115, uOpacity * a * a); }`;
const arco = new THREE.Group();
arco.position.set(...D2W(ARCO.cx, ARCO.cy), 0);
scene.add(arco);
const bandas = ARCO.R.map((Rpx, k) => {
  const curva = new CurvaArco(Rpx / PXU, ARCO.pata / PXU);
  const a = ARCO.a / PXU;
  const seg = 180, rad = 22;
  const geo = new THREE.TubeGeometry(curva, seg, a, rad, false);
  const centros = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i <= seg; i++) {
    const c = curva.getPointAt(i / seg);
    for (let j = 0; j <= rad; j++) { const idx = (i * (rad + 1) + j) * 3; centros[idx] = c.x; centros[idx + 1] = c.y; centros[idx + 2] = c.z; }
  }
  geo.setAttribute('aCenter', new THREE.BufferAttribute(centros, 3));
  const col = new THREE.Color(BANDA_COL[k]); // three ya la guarda en lineal (ColorManagement)
  const uni = { uInf: { value: 0 }, uColor: { value: new THREE.Vector3(col.r, col.g, col.b) }, uOpacity: { value: 1 } };
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: vinilV, fragmentShader: vinilF }));
  arco.add(mesh);
  // tapas redondas en las puntas
  const tapas = [0, 1].map((u) => {
    const sg = new THREE.SphereGeometry(a, 22, 14);
    const p = curva.getPointAt(u);
    sg.translate(p.x, p.y, p.z);
    const cc = new Float32Array(sg.attributes.position.count * 3);
    for (let i = 0; i < cc.length; i += 3) { cc[i] = p.x; cc[i + 1] = p.y; cc[i + 2] = p.z; }
    sg.setAttribute('aCenter', new THREE.BufferAttribute(cc, 3));
    const m = new THREE.Mesh(sg, mesh.material);
    arco.add(m);
    return m;
  });
  // sombra suave en el fondo: el mismo tubo, oscuro y corrido
  const sh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uInf: { value: 0 }, uOpacity: { value: 0 } }, vertexShader: vinilV, fragmentShader: sombraVinilF, transparent: true, depthWrite: false }));
  sh.position.set(0.34, -0.50, -1.4);
  sh.scale.set(1.0, 1.0, 0.01);
  sh.renderOrder = -1;
  arco.add(sh);
  return { mesh, tapas, sh, uni };
});

// ---------- end card: placa blanca (cojín) con el logo real ----------
const placaCanvas = document.createElement('canvas');
placaCanvas.width = 1280; placaCanvas.height = 740;
{
  const c = placaCanvas.getContext('2d');
  c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, 1280, 740);
  c.strokeStyle = 'rgba(27,27,27,0.07)'; c.lineWidth = 3; c.setLineDash([]);
  c.beginPath(); c.roundRect(22, 22, 1236, 696, 96); c.stroke();
}
const placaTex = new THREE.CanvasTexture(placaCanvas);
placaTex.colorSpace = THREE.SRGBColorSpace;
const PLACA = LAY.placa;
const placa = piezaMesh(placaTex, PLACA.w / PXU, PLACA.h / PXU, PLACA.r / PXU, 0.22);
placa.material.uniforms.uLift.value = 1; placa.material.uniforms.uRimW.value = 0.42; placa.material.uniforms.uPillow.value = 0.6;
placa.renderOrder = 4;
const placaG = new THREE.Group();
placaG.position.set(...D2W(PLACA.cx, PLACA.cy), 0.7);
placaG.add(placa);
const logoTex = cargaTex('/assets/derivados/logo_jumpers_transparente.png');
const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(LAY.logoW / PXU, (LAY.logoW * 599 / 1030) / PXU), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthWrite: false, toneMapped: false }));
logoMesh.position.z = 0.004;
logoMesh.renderOrder = 6;
placaG.add(logoMesh);
const placaSombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.25));
placaSombra.position.set(0.22, -0.32, -0.6);
setSoftShadow(placaSombra, PLACA.w / PXU, PLACA.h / PXU, PLACA.r / PXU, 0.35, 0.25);
placaG.add(placaSombra);
scene.add(placaG);

// ---------- capa 2D ----------
const ov = document.createElement('canvas');
ov.width = W; ov.height = H;
const octx = ov.getContext('2d');
const ovTex = new THREE.CanvasTexture(ov);
ovTex.colorSpace = THREE.SRGBColorSpace;
ovTex.minFilter = THREE.LinearFilter; ovTex.generateMipmaps = false;
const ovScene = quadScene(new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
const accScene = quadScene(new THREE.MeshBasicMaterial({ map: rtSub.texture, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false }));
const outScene = quadScene(new THREE.MeshBasicMaterial({ map: rtAcc.texture, depthTest: false, depthWrite: false, toneMapped: false }));

// ---------- texturas de la captura (cuadros de 60 fps) ----------
const capCache = new Map();
async function capTex(f) {
  if (capCache.has(f)) return capCache.get(f);
  const res = await fetch(`${UI}/f${String(f).padStart(4, '0')}.jpg`);
  if (!res.ok) return null;
  const bmp = await createImageBitmap(await res.blob(), { imageOrientation: 'flipY' });
  const t = new THREE.Texture(bmp);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  capCache.set(f, t);
  if (capCache.size > 8) { const k = capCache.keys().next().value; capCache.get(k).dispose(); capCache.get(k).image.close?.(); capCache.delete(k); }
  return t;
}
const F_ON = META.encender;
const F_LAST = Math.max(...Object.keys(META.frames).map(Number));

// ---------- pose del celular (cuadros del brief) ----------
const POSE0 = { cx: LAY.pose0[0], cy: LAY.pose0[1], zoom: 1, rx: 1, ry: -3, rz: 0 };
// encuadre a un punto de la página: el punto queda en (540, yCuadro)
function foco(zoom, pageY, yCuadro = DH / 2) { const F = pageToLocal(195, pageY); return { cx: 540 - zoom * F[0] * PXU, cy: yCuadro + zoom * F[1] * PXU, zoom }; }
const POSES = FMT === '11' ? [
  { f: 257, d: 24, cx: 770, ry: -8 },                                        // a la derecha: "ELIGE / TU INFLABLE" a la izquierda
  { f: 330, d: 38, zoom: 0.82, ry: -3 },
  { f: 450, d: 28, zoom: 1, ry: -8 },
  { f: 500, d: 30, cx: 540, ry: -2 },
  { f: 579, d: 14, cx: 290, ry: 8 },                                         // a la izquierda: "APARTA / EN UN / MENSAJE" a la derecha
  { f: 752, d: 28, ...foco(1.87, 600), ry: 0 },                              // push-in: 1.6 px por px CSS
  { f: 836, d: 30, ...foco(1.75, (R.burbuja.y + R.boton.y + R.boton.h) / 2) }, // vista previa y botón: 1.5
  { f: 900, d: 10, cx: 790, cy: 540, zoom: 1, ry: -8 },                      // "DIVERSIÓN + ELEGANCIA" a la izquierda
  { f: 1008, d: 32, cx: 540, zoom: 0.917, ry: -2 },
  { f: 1061, d: 32, zoom: 1 },
  { f: 1157, d: 58, cx: 280, cy: 860, zoom: 0.53, ry: 20, rz: -5 },
  { f: 1286, d: 44, cx: -240, cy: 1060, zoom: 0.45 },
] : [
  { f: 257, d: 24, cx: 790, ry: -8 },                                        // truck a la derecha: espacio para "TU INFLABLE"
  { f: 330, d: 38, zoom: 0.82, ry: -3 },                                     // se aleja antes de que salgan las tarjetas
  { f: 450, d: 28, zoom: 1, ry: -8 },
  { f: 500, d: 30, cx: 540, ry: -2 },                                        // al centro para la ficha
  { f: 579, d: 14, cx: 290, ry: 8 },                                         // truck a la izquierda: texto a la derecha
  { f: 752, d: 28, ...foco(1.416, 600), ry: 0 },                             // push-in a los campos y al teclado (1.75 px/px CSS)
  { f: 836, d: 30, ...foco(1.214, (R.burbuja.y + R.boton.y + R.boton.h) / 2) }, // vista previa del mensaje y botón (1.5)
  { f: 900, d: 10, cx: 800, cy: 915, zoom: 1, ry: -8 },                      // lift: regresa a 60 % y truck a la derecha
  { f: 1008, d: 32, cx: 540, zoom: 0.917, ry: -2 },                          // postal grande
  { f: 1061, d: 32, zoom: 1 },
  { f: 1157, d: 58, cx: 300, cy: 1450, zoom: 0.53, ry: 20, rz: -5 },         // se aleja abajo a la izquierda
  { f: 1286, d: 44, cx: -260, cy: 1760, zoom: 0.45 },                        // y sale del cuadro
];
function pose(t) {
  const p = { ...POSE0 };
  for (const k of POSES) {
    const e = eInOutCubic(seg(t, k.f, k.f + k.d));
    if (e <= 0) continue;
    for (const key of ['cx', 'cy', 'zoom', 'rx', 'ry', 'rz']) if (k[key] != null) p[key] = lerp(p[key], k[key], e);
  }
  return p;
}

function piezaEstado(pc, t) {
  const P = pc.P;
  const up = springF(t, P.sale, 90, 14);
  const down = springF(t, P.vuelve, 190, 19);
  const u = Math.max(0, up - down);
  const out = t >= P.sale && t < P.vuelve + P.fin;
  const flot = clamp((t - P.sale - 30) / 30) * (1 - seg(t, P.vuelve - 8, P.vuelve)) * (P.flota ?? 1);
  const ph = P.fase ?? 1.3;
  let s = lerp(1, P.esc ?? 1, clamp(u, 0, 1.1)) * (1 + puff(t, P.sale, P.puff ?? 0.085) + puff(t, P.vuelve + 12, 0.05));
  if (P.cojin) s *= (1 - 0.10 * bump(t, 896, 899, 900, 903)) * (1 + puff(t, 900, 0.07, 18, 0.3));
  return {
    out, u, lift: clamp(Math.max(up, 0) - down),
    x: lerp(pc.cx, pc.tx, u) + Math.sin((t / FPS) * 1.6 + ph) * 0.03 * flot,
    y: lerp(pc.cy, pc.ty, u) + Math.sin((t / FPS) * 1.9 + ph) * 0.05 * flot,
    z: pc.tz * u,
    rx: P.rot[0] * u + Math.sin((t / FPS) * 1.4 + ph) * 1.5 * flot,
    ry: P.rot[1] * u,
    rz: P.rot[2] * u + Math.sin((t / FPS) * 1.2 + ph) * 1.2 * flot,
    s, clip: P.recorte ? 1 - clamp((up - 0.06) / 0.3) : 0,
  };
}

// ---------- estado en el tiempo t ----------
function estado(t) {
  const st = {};
  const sp = springF(t, 186, 210, 15.5); // el celular se materializa con resorte de 8 %
  const P = pose(t);
  st.op = eOutCubic(seg(t, 186, 202)) * (1 - seg(t, 1318, 1332));
  st.zoom = P.zoom * lerp(0.92, 1, sp);
  st.ry = P.ry + lerp(13, 0, sp);
  st.rx = P.rx + lerp(3, 0, sp);
  st.rz = P.rz;
  st.cx = P.cx;
  st.cy = P.cy + Math.sin((t / FPS) * 1.3) * 2.5;
  st.on = seg(t, F_ON, F_ON + 6);
  st.dim = 1 - 0.36 * bump(t, 488, 506, 583, 603); // la sombra de la ficha también cubre la barra de estado
  st.glare = -st.ry * DEG * 1.6 + (st.cx - 540) / 600;
  st.piezas = Object.values(pieces).map((pc) => ({ pc, ...piezaEstado(pc, t) }));
  // arcoíris: cada banda se infla de afuera hacia adentro (f1235 + 10 k), luego respira; push-in y órbita leves
  st.bandas = ARCO.R.map((_, k) => springF(t, 1235 + 10 * k, 210, 15.5));
  st.arcoRot = 3 * eInOutSine(seg(t, 1286, 1380));
  st.arcoEsc = (1 + 0.03 * eInOutSine(seg(t, 1286, 1380))) * (1 + 0.008 * Math.sin(Math.max(0, t - 1380) / FPS * 3.2));
  st.placa = springF(t, 1440, 210, 15.5);
  st.logo = springF(t, 1452, 260, 16);
  return st;
}

function aplicar(st) {
  camera.position.set(0, 0, DIST);
  camera.updateMatrixWorld();
  const [px, py] = D2W(st.cx, st.cy);
  phone.position.set(px, py, 0);
  phone.rotation.set(st.rx * DEG, st.ry * DEG, st.rz * DEG);
  phone.scale.setScalar(st.zoom);
  phone.visible = st.op > 0.001;
  phone.updateMatrixWorld();
  bodyMat.uniforms.uOpacity.value = st.op;
  bodyMat.uniforms.uGlare.value = st.glare;
  screenMat.uniforms.uOn.value = st.on;
  screenMat.uniforms.uOp.value = st.op;
  screenMat.uniforms.uDim.value = st.dim;
  dropShadow.material.uniforms.uOpacity.value = 0.28 * st.op;
  const [ax, ay] = pageToLocal(CLIP_PAGE.x0, CLIP_PAGE.y1), [bx, by] = pageToLocal(CLIP_PAGE.x1, CLIP_PAGE.y0);
  for (const c of st.piezas) {
    const p = c.pc;
    p.mesh.visible = c.out && st.op > 0.001; p.sh.visible = p.mesh.visible;
    if (!p.mesh.visible) continue;
    p.mesh.position.set(c.x, c.y, SCR_Z + 0.001 + c.z);
    p.mesh.rotation.set(c.rx * DEG, c.ry * DEG, c.rz * DEG);
    p.mesh.scale.setScalar(c.s);
    const m = p.mesh.material.uniforms;
    m.uLift.value = clamp(c.lift);
    m.uClipAmt.value = c.clip;
    m.uClip.value.set(ax - p.cx, ay - p.cy, bx - p.cx, by - p.cy);
    const hgt = Math.max(0, c.z);
    p.sh.position.set(c.x + hgt * 0.22, c.y - hgt * 0.32, SCR_Z + 0.002);
    p.sh.rotation.set(0, 0, c.rz * DEG);
    setSoftShadow(p.sh, p.w * c.s, p.h * c.s, p.r, 0.06 + hgt * 0.16, 0.34 * clamp(c.lift * 1.5) * (1 - hgt * 0.12));
  }
  // arcoíris
  arco.visible = st.bandas[0] > 0.0005;
  arco.rotation.set(0, st.arcoRot * DEG, 0);
  arco.scale.setScalar(st.arcoEsc);
  bandas.forEach((b, k) => {
    const v = st.bandas[k];
    b.uni.uInf.value = Math.max(0.0001, v);
    b.mesh.visible = v > 0.0005; b.tapas.forEach((m) => { m.visible = b.mesh.visible; });
    b.sh.visible = b.mesh.visible;
    b.sh.material.uniforms.uOpacity.value = 0.16 * clamp(v);
    b.sh.material.uniforms.uInf.value = Math.max(0.0001, v) * 1.35;
  });
  // placa y logo
  placaG.visible = st.placa > 0.0005;
  const sPl = lerp(0.7, 1, st.placa) * (1 + puff(st.t, 1440, 0.05));
  placa.scale.setScalar(sPl);
  placaSombra.scale.x = placaSombra.scale.x; // (tamaño fijo)
  placa.material.uniforms.uOpacity.value = clamp(st.placa * 3);
  placaSombra.material.uniforms.uOpacity.value = 0.25 * clamp(st.placa);
  logoMesh.scale.setScalar(lerp(0.6, 1, st.logo) * sPl);
  logoMesh.material.opacity = clamp(st.logo * 2.5);
}

async function pantalla(t) {
  if (t < F_ON) { const tx = await capTex(F_ON); screenMat.uniforms.uA.value = screenMat.uniforms.uB.value = tx; screenMat.uniforms.uMix.value = 0; return; }
  const fa = clamp(Math.floor(t), F_ON, F_LAST), fb = clamp(fa + 1, F_ON, F_LAST);
  screenMat.uniforms.uA.value = await capTex(fa);
  screenMat.uniforms.uB.value = (await capTex(fb)) || screenMat.uniforms.uA.value;
  screenMat.uniforms.uMix.value = clamp(t - fa);
}

// proyección de un punto local del celular a px de diseño
const _v = new THREE.Vector3();
function proyecta(lx, ly, lz = FRONT_Z) {
  _v.set(lx, ly, lz); phone.localToWorld(_v); _v.project(camera);
  return [(_v.x + 1) / 2 * DW, (1 - _v.y) / 2 * DH];
}
function proyectaObj(obj) {
  obj.getWorldPosition(_v); _v.project(camera);
  return [(_v.x + 1) / 2 * DW, (1 - _v.y) / 2 * DH];
}

// ---------- tubo de aire (2D): una manguera que viene de fuera del cuadro ----------
function contorno(n, m = 0.05) {
  const w = BODY.w / 2 + m, h = BODY.h / 2 + m, r = BODY.r + m;
  const L = [w - r, Math.PI * r / 2, 2 * (h - r), Math.PI * r / 2, 2 * (w - r), Math.PI * r / 2, 2 * (h - r), Math.PI * r / 2, w - r];
  const total = L.reduce((a, b) => a + b, 0);
  const pts = [];
  for (let i = 0; i < n; i++) {
    let s = (i / (n - 1)) * total, k = 0;
    while (k < L.length - 1 && s > L[k]) { s -= L[k]; k++; }
    let x, y;
    if (k === 0) { x = s; y = h; }
    else if (k === 1) { const a = Math.PI / 2 - s / r; x = w - r + Math.cos(a) * r; y = h - r + Math.sin(a) * r; }
    else if (k === 2) { x = w; y = h - r - s; }
    else if (k === 3) { const a = -s / r; x = w - r + Math.cos(a) * r; y = -h + r + Math.sin(a) * r; }
    else if (k === 4) { x = w - r - s; y = -h; }
    else if (k === 5) { const a = -Math.PI / 2 - s / r; x = -w + r + Math.cos(a) * r; y = -h + r + Math.sin(a) * r; }
    else if (k === 6) { x = -w; y = -h + r + s; }
    else if (k === 7) { const a = Math.PI - s / r; x = -w + r + Math.cos(a) * r; y = h - r + Math.sin(a) * r; }
    else { x = -w + r + s; y = h; }
    pts.push([x, y]);
  }
  return pts;
}
const CONTORNO = contorno(400);
const S_INICIO = 0.5587; // borde inferior, cerca de la esquina izquierda: ahí se conecta la manguera
function tramoContorno(a, b, n = 90) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let s = lerp(a, b, i / (n - 1));
    s -= Math.floor(s);
    const k = s * (CONTORNO.length - 1), k0 = Math.floor(k), fr = k - k0;
    const p = CONTORNO[k0], q = CONTORNO[Math.min(CONTORNO.length - 1, k0 + 1)];
    out.push(proyecta(lerp(p[0], q[0], fr), lerp(p[1], q[1], fr)));
  }
  return out;
}
// reposo: la punta toca el borde inferior junto a la esquina y la manguera sale del cuadro abajo a la izquierda
const REPOSO_CTRL = [[-1.55, -4.715], [-2.00, -4.84], [-2.34, -5.02], [-2.70, -5.55], [-3.30, -6.20], [-4.40, -6.70], [-6.20, -7.00], [-9.00, -7.20]];
const NT = 64;
const REPOSO = catmull(REPOSO_CTRL, NT);
// arco del cierre (px de diseño): de la pata izquierda a la derecha, por la línea central de la banda de afuera
const ARCO_PTS = (() => {
  const c = new CurvaArco(ARCO.R[0], ARCO.pata);
  const out = [];
  for (let i = 0; i < NT; i++) { const p = c.getPointAt(i / (NT - 1)); out.push([ARCO.cx + p.x, ARCO.cy - p.y]); }
  return out;
})();
// el tubo escribe: la punta sigue al cursor
const TEXTO_BUSQ = 'renta de inflables aguascalientes';
const T_TECLAS = typingFrames(40, 76, TEXTO_BUSQ);
function letras(t) { let n = 0; for (const f of T_TECLAS) if (t >= f) n++; return n; }
const HY = LAY.hookY; // el hook va centrado en el cuadro: en 1:1 todo sube 420 px
const TXT = { x0: 166, y: 974 + HY, px: 40 };
function cursorX(t) { octx.font = `400 ${TXT.px * S}px "DM Sans"`; return TXT.x0 + octx.measureText(TEXTO_BUSQ.slice(0, letras(t))).width / S; }
function puntaHook(t) {
  if (t < 34) return bez([-140, 1560 + HY], [20, 1250 + HY], [120, 1060 + HY], [150, 1004 + HY], eOutCubic(seg(t, 0, 34)));
  if (t < 40) { const u = eInOutCubic(seg(t, 34, 40)); return [lerp(150, TXT.x0, u), lerp(1004, 1000, u) + HY]; }
  if (t < 116) return [cursorX(t) + 6, 1000 + HY + Math.sin(t * 0.9) * 2];
  const u = eInOutCubic(seg(t, 116, 128));
  const a = [cursorX(116) + 6, 1000 + HY], b = [BAR.cx + BAR.w / 2 - 66, 1000 + HY];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(Math.PI * u) * 40 + 8 * bump(t, 128, 130, 131, 134)];
}
function mangueraHook(tip) {
  return catmull([[-260, 2180 + HY], [-40, 1880 + HY], [lerp(60, tip[0], 0.45), lerp(1560 + HY, tip[1], 0.55)], [tip[0] - 50, tip[1] + 60], tip], NT);
}
function tubo(t) {
  const out = [];
  if (t < 132) { out.push({ pts: mangueraHook(puntaHook(t)).reverse(), w: 26, a: 1 }); return out; }
  const bre = (i) => Math.sin((t / FPS) * 2.2 + i * 0.18) * 0.015;
  const rep = REPOSO.map(([x, y], i) => proyecta(x + bre(i), y + bre(i)));
  if (t < 1165) {
    const wv = 26 + 14 * eInOutCubic(seg(t, 140, 160)) - 14 * eInOutCubic(seg(t, 200, 240));
    if (t < 150) {
      const u = eInOutCubic(seg(t, 132, 150));
      const hk = mangueraHook(puntaHook(131)).reverse();
      out.push({ pts: hk.map((p, i) => [lerp(p[0], rep[i][0], u), lerp(p[1], rep[i][1], u)]), w: wv, a: 1 });
    } else out.push({ pts: rep, w: wv, a: 1 });
    // la punta traza el contorno del celular (f146–f186) y se recoge en la esquina (f186–f226)
    const p = eInOutCubic(seg(t, 146, 186)), q = eInOutCubic(seg(t, 186, 226));
    const len = p * (1 - q);
    if (t >= 146 && len > 0.002) out.push({ pts: tramoContorno(S_INICIO, S_INICIO + len), w: wv, a: 1 });
    return out;
  }
  // cierre: la manguera se suelta del celular y se arquea (f1165–f1235); se desvanece cuando se inflan las bandas
  const u = eInOutCubic(seg(t, 1165, 1235));
  const r2 = rep.slice().reverse();
  const a = 1 - seg(t, 1235, 1258);
  if (a > 0) out.push({ pts: r2.map((p, i) => [lerp(p[0], ARCO_PTS[i][0], u), lerp(p[1], ARCO_PTS[i][1], u)]), w: lerp(26, 34, u), a });
  return out;
}
function dibujaTubo(tb) {
  const c = octx;
  const P = tb.pts.map(([x, y]) => [x * S, y * S]);
  const w = tb.w * S;
  const path = () => { c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length - 1; i++) { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2; c.quadraticCurveTo(P[i][0], P[i][1], mx, my); } c.lineTo(P[P.length - 1][0], P[P.length - 1][1]); };
  c.save();
  c.globalAlpha = tb.a;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.shadowColor = 'rgba(27,27,27,0.20)'; c.shadowBlur = 16 * S; c.shadowOffsetY = 9 * S; c.shadowOffsetX = 3 * S;
  path(); c.strokeStyle = '#D8D3CB'; c.lineWidth = w; c.stroke();
  c.shadowColor = 'transparent';
  [['#E7E3DD', 0.86], ['#F1EEEA', 0.70], ['#F8F7F4', 0.52], ['#FFFFFF', 0.34]].forEach(([col, k]) => { path(); c.strokeStyle = col; c.lineWidth = w * k; c.stroke(); });
  c.save(); c.translate(-0.12 * w, -0.17 * w); path(); c.strokeStyle = 'rgba(255,255,255,0.98)'; c.lineWidth = w * 0.16; c.stroke(); c.restore();
  path(); c.setLineDash([5 * S, 6 * S]); c.strokeStyle = 'rgba(27,27,27,0.13)'; c.lineWidth = 1.6 * S; c.stroke(); c.setLineDash([]);
  c.restore();
}

// ---------- barra de búsqueda: escala, texto y botón ----------
function barEstado(t) {
  const sIn = springF(t, 12, 210, 15.5);
  const des = eInCubic(seg(t, 131, 157));
  return { sx: lerp(0.86, 1, sIn) * lerp(1, 0.9, des), sy: lerp(0.4, 1, sIn) * lerp(1, 0.2, des), a: seg(t, 12, 20) * (1 - des), press: bump(t, 129, 131, 132, 138) };
}
function dibujaBarra(t, b) {
  if (b.a <= 0.002) return;
  const c = octx;
  c.save();
  c.globalAlpha = b.a;
  c.translate(BAR.cx * S, BAR.cy * S); c.scale(b.sx, b.sy); c.translate(-BAR.cx * S, -BAR.cy * S);
  // lupa de línea
  c.strokeStyle = '#1B1B1B'; c.lineWidth = 3.4 * S; c.lineCap = 'round';
  c.beginPath(); c.arc(116 * S, (954 + HY) * S, 14 * S, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(126 * S, (965 + HY) * S); c.lineTo(138 * S, (977 + HY) * S); c.stroke();
  // texto tecleado y cursor
  const n = letras(t);
  c.fillStyle = '#1B1B1B'; c.font = `400 ${TXT.px * S}px "DM Sans"`; c.textBaseline = 'alphabetic';
  c.fillText(TEXTO_BUSQ.slice(0, n), TXT.x0 * S, TXT.y * S);
  if (t >= 38 && Math.floor((t - 38) / 15) % 2 === 0 && t < 131) { const x = cursorX(t) + 2; c.fillRect(x * S, (TXT.y - 32) * S, 2.6 * S, 40 * S); }
  // botón de flecha (se hunde con el Enter)
  const bx = BAR.cx + BAR.w / 2 - 66, by = BAR.cy, br = 40 * (1 - 0.08 * b.press);
  c.fillStyle = '#1B1B1B'; c.beginPath(); c.arc(bx * S, by * S, br * S, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 3.4 * S;
  c.beginPath(); c.moveTo((bx - 13) * S, by * S); c.lineTo((bx + 13) * S, by * S); c.moveTo((bx + 3) * S, (by - 10) * S); c.lineTo((bx + 13) * S, by * S); c.lineTo((bx + 3) * S, (by + 10) * S); c.stroke();
  if (b.press > 0.01) { c.strokeStyle = `rgba(255,255,255,${0.5 * (1 - b.press)})`; c.lineWidth = 2 * S; c.beginPath(); c.arc(bx * S, by * S, br * (1 + 0.6 * b.press) * S, 0, Math.PI * 2); c.stroke(); }
  c.restore();
}

// ---------- kinetic type ----------
const LINEAS = { 1: LAY.lineas[0], 2: LAY.lineas[1], 3: LAY.lineas[2] };
const PALABRAS = TL.tipo.map((k) => ({ ...k, linea: +((k.pos.match(/línea (\d)/) || [0, 1])[1]), lado: k.pos.startsWith('derecha') ? 'der' : 'izq' }));
function layoutPalabras() {
  for (const k of PALABRAS) {
    const prev = PALABRAS.filter((o) => o !== k && o.sale === k.sale && o.linea === k.linea && o.lado === k.lado && o.aterriza < k.aterriza);
    octx.font = `600 ${k.px * S}px Fredoka`;
    const sp = octx.measureText(' ').width / S;
    let x = k.lado === 'izq' ? LAY.xIzq : LAY.xDer;
    for (const o of prev.sort((a, b) => a.aterriza - b.aterriza)) { octx.font = `600 ${o.px * S}px Fredoka`; x += octx.measureText(o.texto).width / S + sp; }
    k.x = x; k.y = LINEAS[k.linea];
  }
}
function dibujaTipo(t) {
  const c = octx;
  for (const k of PALABRAS) {
    if (t < k.aterriza - 16 || t > k.sale + 16) continue;
    c.font = `600 ${k.px * S}px Fredoka`;
    const chars = [...k.texto];
    const em = k.px * S;
    c.save();
    c.beginPath(); c.rect(0, (k.y - k.px * 0.95) * S, W, k.px * 1.12 * S); c.clip();
    let pre = '';
    chars.forEach((ch, j) => {
      const xg = k.x * S + c.measureText(pre).width;
      pre += ch;
      const L = k.aterriza + j * 1.5;
      const e = seg(t, L - 14, L);
      const sIn = lerp(0.7, 1, springF(t, L - 9, 210, 15.5));
      const ex = seg(t, k.sale + j * 0.75, k.sale + 12 + j * 0.75);
      const alpha = eOutCubic(seg(t, L - 14, L - 5)) * (1 - eInCubic(ex));
      if (alpha <= 0.002) return;
      const dy = 40 * (1 - eOutCubic(e)) * S - 14 * eInCubic(ex) * S;
      const sc = sIn * lerp(1, 0.6, eInCubic(ex));
      const wch = c.measureText(ch).width;
      c.save();
      c.globalAlpha = alpha;
      c.filter = e < 1 ? `blur(${(6 * (1 - e) * S).toFixed(2)}px)` : 'none';
      c.translate(xg + wch / 2, k.y * S + dy - em * 0.35);
      c.scale(sc, sc);
      if (ch === '+') {
        const r = em * 0.36;
        c.fillStyle = '#F3C7CF'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#1B1B1B'; c.fillRect(-r * 0.48, -r * 0.11, r * 0.96, r * 0.22); c.fillRect(-r * 0.11, -r * 0.48, r * 0.22, r * 0.96);
      } else {
        c.fillStyle = '#1B1B1B'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillText(ch, 0, em * 0.35);
      }
      c.restore();
    });
    c.restore();
  }
}

// ---------- toques: contacto de 44 px CSS y onda suave ----------
const TAPS = META.eventos.filter((e) => e.tipo === 'tap');
function circulo(x, y, r, a, relleno = true) {
  octx.save(); octx.globalAlpha = a;
  if (relleno) { octx.fillStyle = 'rgba(27,27,27,0.18)'; octx.beginPath(); octx.arc(x * S, y * S, r * S, 0, Math.PI * 2); octx.fill(); }
  octx.lineWidth = 2.5 * S; octx.strokeStyle = 'rgba(255,255,255,0.95)'; octx.beginPath(); octx.arc(x * S, y * S, r * S, 0, Math.PI * 2); octx.stroke();
  octx.restore();
}
function radioDedo(lx, ly) { const [px] = proyecta(lx, ly, SCR_Z), [qx] = proyecta(lx + 0.22, ly, SCR_Z); return Math.abs(qx - px); }
function dibujaToques(t, st) {
  if (st.op > 0.01 && t < 1160) {
    const d = META.frames[Math.round(t)]?.dedo;
    if (d && d.a > 0.01) {
      const [lx, ly] = pageToLocal(d.x, d.y);
      const [px, py] = proyecta(lx, ly, SCR_Z);
      circulo(px, py, radioDedo(lx, ly) * (d.p ? 0.92 : 1), d.a);
    }
    for (const e of TAPS) {
      const u = (t - e.f - 5) / 22;
      if (u < 0 || u > 1) continue;
      const [lx, ly] = pageToLocal(e.x, e.y);
      const [px, py] = proyecta(lx, ly, SCR_Z);
      circulo(px, py, radioDedo(lx, ly) * (1 + 1.4 * eOutCubic(u)), 0.45 * (1 - u), false);
    }
  }
  // el toque al botón cojín (f896): sobre la pieza 3D
  if (t >= 893 && t < 922) {
    const b = pieces.boton.mesh;
    const [px, py] = proyectaObj(b);
    const r0 = 22 * (PXU / 100) * st.zoom;
    if (t < 905) circulo(px, py, r0 * (t < 900 ? 0.92 : 1), t < 896 ? seg(t, 893, 896) : 1 - seg(t, 900, 905));
    const u = (t - 900) / 22;
    if (u >= 0 && u <= 1) circulo(px, py, r0 * (1 + 1.4 * eOutCubic(u)), 0.45 * (1 - u), false);
  }
}

// ---------- texto de la end card ----------
function dibujaFinal(t) {
  const c = octx;
  const a1 = eOutCubic(seg(t, 1520, 1540));
  if (a1 > 0) {
    c.save(); c.globalAlpha = a1;
    c.font = `600 ${44 * S}px "DM Sans"`; c.fillStyle = '#1B1B1B'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('Así se vería tu página · Elevate Negocios', 540 * S, (LAY.fin.y + 14 * (1 - a1)) * S);
    c.restore();
  }
  const a2 = eOutCubic(seg(t, 1556, 1576));
  if (a2 > 0) {
    c.save(); c.globalAlpha = a2;
    c.font = `400 ${28 * S}px "DM Sans"`; c.fillStyle = '#66635F'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('Demo de cortesía de Elevate Negocios · pieza no oficial', 540 * S, LAY.fin.legalY * S);
    c.restore();
  }
}

function capa2D(t, st) {
  octx.clearRect(0, 0, W, H);
  if (t < 160) dibujaBarra(t, barEstado(t));
  for (const tb of tubo(t)) dibujaTubo(tb);
  dibujaTipo(t);
  dibujaToques(t, st);
  dibujaFinal(t);
  ovTex.needsUpdate = true;
}

// ---------- render de un cuadro con supermuestreo temporal ----------
window.renderFrame = async (f, { sub = 8, shutter = 1.0 } = {}) => {
  renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
  accScene.children[0].material.opacity = 1 / sub;
  bgMat.uniforms.uSeed.value = Math.floor(f) * 13.1;
  barMat.uniforms.uSeed.value = Math.floor(f) * 7.7;
  renderer.setRenderTarget(rtBack); renderer.clear(); renderer.render(bgScene, quadCam);
  blurInto(rtBack, rtBlur);
  for (let k = 0; k < sub; k++) {
    const t = f + ((k + 0.5) / sub - 0.5) * shutter;
    const st = estado(t);
    st.t = t;
    aplicar(st);
    await pantalla(t);
    capa2D(t, st);
    const jx = halton(k + 1, 2) - 0.5, jy = halton(k + 1, 3) - 0.5;
    camera.setViewOffset(W, H, jx, jy, W, H);
    renderer.setRenderTarget(rtSub); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
    renderer.render(bgScene, quadCam);
    if (t < 160) {
      const b = barEstado(t);
      barMat.uniforms.uC.value.set(BAR.cx * S + jx, H - BAR.cy * S - jy);
      barMat.uniforms.uSize.value.set(BAR.w * S, BAR.h * S);
      barMat.uniforms.uR.value = (BAR.h / 2) * S;
      barMat.uniforms.uScale.value.set(b.sx, b.sy);
      barMat.uniforms.uAlpha.value = b.a;
      if (b.a > 0.002) renderer.render(barScene, quadCam);
    }
    renderer.render(scene, camera);
    renderer.render(ovScene, quadCam);
    camera.clearViewOffset();
    renderer.setRenderTarget(rtAcc);
    renderer.render(accScene, quadCam);
  }
  renderer.setRenderTarget(null);
  renderer.clear(true, true, true);
  renderer.render(outScene, quadCam);
  return renderer.domElement.toDataURL('image/png');
};

try {
  await document.fonts.load(`600 ${88 * S}px Fredoka`);
  await document.fonts.load('600 45px "DM Sans"');
  await document.fonts.load(`400 ${40 * S}px "DM Sans"`);
  pintaEstado(); statusTex.needsUpdate = true;
  layoutPalabras();
  await capTex(F_ON);
  await Promise.all(cargando);
  window.ready = true;
} catch (e) {
  window.initError = String(e.stack || e);
}
