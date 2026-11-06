// frame(t) determinista del video de Florería Roma (28 s, 60 fps): celular 3D de cristal con la interfaz real,
// piezas 3D (tarjetas, botón, reseñas de cristal), tallo, kinetic type, toques, cierre y end card.
// t en cuadros de 60 fps (puede ser fraccionario). ?fmt=916 (1080×1920) o ?fmt=11 (1080×1080).
import * as THREE from 'three';
import { typingFrames } from '/brief/tiempos.mjs';

const Q = new URLSearchParams(location.search);
const FMT = Q.get('fmt') || '916';
const UI = Q.get('ui') || '/video/build/ui';

// ---------- composición por formato (px de diseño, 1080 de ancho) ----------
const LAYOUTS = {
  916: {
    DH: 1920, phoneH: 1248, phoneCY: 915, shift: 170, side: 62 / 65,
    conf: { s: 58 / 65, cy: 1040 }, cierre: { x: 330, s: 0.57, ry: -18 },
    bar: { cx: 540, cy: 960, w: 900, h: 128, px: 52 },
    t1: { x: 64, y: 905, px: 52 }, t4: { x: 678, y: 905, px: 48 }, t56: { cx: 540, y1: 340, y2: 420, px: 64 },
    t7: { x: 64, y1: 812, y2: 896, px: 64 }, logoSm: { x: 164, y: 640, d: 200 }, logoEnd: { x: 540, y: 820, d: 520 },
    end: { y: 1190, px: 40, legalY: 1470, legalPx: 30 }, focus: { tecla: [540, 960], anticipo: [540, 1000] }, push: [540, 850],
  },
  11: {
    DH: 1080, phoneH: 800, phoneCY: 540, shift: 225, side: 1,
    conf: { s: 1, cy: 540, x: 150 }, cierre: { x: 300, s: 0.78, ry: -16 },
    bar: { cx: 540, cy: 540, w: 860, h: 116, px: 48 },
    t1: { x: 60, y: 560, px: 52 }, t4: { x: 700, y: 560, px: 46 }, t56: { cx: 250, y1: 500, y2: 580, px: 56, left: true },
    t7: { x: 60, y1: 500, y2: 580, px: 58 }, logoSm: { x: 150, y: 330, d: 170 }, logoEnd: { x: 540, y: 430, d: 420 },
    end: { y: 760, px: 38, legalY: 1000, legalPx: 28 }, focus: { tecla: [540, 560], anticipo: [540, 580] }, push: [730, 540],
  },
};
const LAY = LAYOUTS[FMT];
const DW = 1080, DH = LAY.DH;
const W = +(Q.get('w') || 540), H = +(Q.get('h') || Math.round((540 * DH) / DW));
const S = W / DW;
const FPS = 60;
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
function spring(ts, k = 170, c = 18) {
  if (ts <= 0) return 0;
  const w0 = Math.sqrt(k), z = c / (2 * Math.sqrt(k));
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * ts) * (Math.cos(wd * ts) + (z * w0 / wd) * Math.sin(wd * ts)); }
  return 1 - Math.exp(-w0 * ts) * (1 + w0 * ts);
}
const springF = (f, f0, k, c) => spring((f - f0) / FPS, k, c);
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function noise1(x) { const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
const bump = (t, a, b, c, d) => eInOutCubic(seg(t, a, b)) - eInOutCubic(seg(t, c, d)); // sube a→b, baja c→d

// ---------- mundo: 1 unidad = 100 px CSS de la pantalla ----------
const FOV = 22;
const SCR = { w: 3.9, h: 8.8, r: 0.47 };
const BODY = { w: 4.14, h: 9.04, r: 0.58 };
const PXU = LAY.phoneH / BODY.h;          // px de diseño por unidad
const VIS_H = DH / PXU;
const DIST = VIS_H / (2 * Math.tan((FOV / 2) * DEG));
const PHONE_Y = (DH / 2 - LAY.phoneCY) / PXU;
const FRONT_Z = 0.21;
const SCR_Z = 0.206;
const STATUS = 47;
const toWorld = (dx, dy) => new THREE.Vector3((dx - DW / 2) / PXU, (DH / 2 - dy) / PXU, 0);
// coordenadas de la página (viewport CSS) → locales del celular
const pageToLocal = (x, y) => [(x - 195) / 100, SCR.h / 2 - (STATUS + y) / 100];

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
// vidrio esmerilado: lo que hay detrás de las reseñas se renderiza a media resolución y se desenfoca (σ = 32 px en el cuadro de 1080)
const BW = Math.max(2, Math.round(W / 2)), BH = Math.max(2, Math.round(H / 2));
const rtBack = new THREE.WebGLRenderTarget(BW, BH, rtOpts);
const rtTmp = new THREE.WebGLRenderTarget(BW, BH, { ...rtOpts, depthBuffer: false });
const rtBlurA = new THREE.WebGLRenderTarget(BW, BH, { ...rtOpts, depthBuffer: false });
const rtBlurB = new THREE.WebGLRenderTarget(BW, BH, { ...rtOpts, depthBuffer: false });
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
vec3 envColor(vec3 R){
  vec3 top = vec3(0.115, 0.115, 0.095); vec3 bot = vec3(0.006, 0.006, 0.005);
  vec3 c = mix(bot, top, smoothstep(-0.5, 0.9, R.y));
  vec3 d1 = normalize(vec3(-0.55, 0.62, 0.56));
  c += vec3(1.0, 0.93, 0.80) * smoothstep(0.88, 0.95, dot(R, d1)) * 2.6;
  vec3 d2 = normalize(vec3(0.97, 0.18, -0.05));
  c += vec3(0.92, 0.92, 0.88) * smoothstep(0.93, 0.985, dot(R, d2)) * 1.8;
  vec3 d3 = normalize(vec3(0.15, -0.8, 0.58));
  c += vec3(0.55, 0.56, 0.44) * smoothstep(0.93, 0.99, dot(R, d3)) * 0.45;
  return c;
}
`;

// ---------- fondo (olivo oscuro; en la end card se abre a olivo profundo desde el logo) ----------
const bgMat = new THREE.ShaderMaterial({
  uniforms: { uAspect: { value: W / H }, uSeed: { value: 0 }, uWipe: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform float uAspect; uniform float uSeed; uniform float uWipe; uniform vec2 uCenter; varying vec2 vUv;
    vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
    void main(){
      vec2 p = (vUv - vec2(0.5, 0.53)) * vec2(uAspect, 1.);
      float d = length(p);
      vec3 c = mix(lin(vec3(0.180, 0.188, 0.145)), lin(vec3(0.133, 0.137, 0.106)), smoothstep(0.0, 0.55, d));
      c = mix(c, lin(vec3(0.075, 0.078, 0.060)), smoothstep(0.42, 1.05, d));
      vec2 q = (vUv - uCenter) * vec2(uAspect, 1.);
      vec3 olive = mix(lin(vec3(0.435, 0.439, 0.282)), lin(vec3(0.33, 0.335, 0.21)), smoothstep(0.0, 0.95, length((vUv - vec2(0.5, 0.48)) * vec2(uAspect, 1.))));
      float r = uWipe * 1.6;
      c = mix(c, olive, 1. - smoothstep(r - 0.04, r, length(q)));
      c *= 1.0 + (hash12(gl_FragCoord.xy + uSeed) - 0.5) * 0.04;
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const bgScene = quadScene(bgMat);

// ---------- escena 3D ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, W / H, DIST * 0.12, DIST * 1.7);
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
  uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uR: { value: 0.2 }, uBlur: { value: 0.1 }, uOpacity: { value: opacity }, uColor: { value: new THREE.Vector3(0.004, 0.004, 0.003) } },
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + 'uniform vec2 uSize; uniform float uR; uniform float uBlur; uniform float uOpacity; uniform vec3 uColor; varying vec2 vP; void main(){ float d = sdRR(vP, uSize*0.5, uR); float a = 1. - smoothstep(-uBlur, uBlur, d); gl_FragColor = vec4(uColor, a*a*uOpacity); }',
  transparent: true, depthWrite: false,
});
// sombra suave en el plano de la pantalla, escalada para no deformar el radio
function setSoftShadow(mesh, w, h, r, blur, opacity) {
  const W2 = w + blur * 4, H2 = h + blur * 4;
  mesh.scale.set(W2, H2, 1);
  const u = mesh.material.uniforms;
  u.uSize.value.set(w / W2, h / H2); u.uR.value = r / Math.min(W2, H2); u.uBlur.value = blur / Math.min(W2, H2); u.uOpacity.value = opacity;
}

const phone = new THREE.Group();
scene.add(phone);
const dropShadow = new THREE.Mesh(new THREE.PlaneGeometry(BODY.w + 4, BODY.h + 4), softShadowMat(0.5));
dropShadow.material.uniforms.uSize.value.set(BODY.w, BODY.h);
dropShadow.material.uniforms.uR.value = BODY.r;
dropShadow.material.uniforms.uBlur.value = 0.75;
dropShadow.position.set(0.32, -0.5, -0.9);
dropShadow.renderOrder = 0;
phone.add(dropShadow);

const scrCanvas = document.createElement('canvas');
const scrCtx = scrCanvas.getContext('2d');
const scrTex = new THREE.CanvasTexture(scrCanvas);
scrTex.colorSpace = THREE.SRGBColorSpace;
scrTex.anisotropy = 4;
scrTex.minFilter = THREE.LinearMipmapLinearFilter;
const screenMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: scrTex }, uOn: { value: 0 }, uOpacity: { value: 1 }, uSize: { value: new THREE.Vector2(SCR.w, SCR.h) }, uR: { value: SCR.r } },
  vertexShader: 'varying vec2 vUv; varying vec3 vLP; void main(){ vUv = uv; vLP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform sampler2D uTex; uniform float uOn; uniform float uOpacity; uniform vec2 uSize; uniform float uR;
    varying vec2 vUv; varying vec3 vLP;
    void main(){
      float d = sdRR(vLP.xy, uSize * 0.5, uR);
      float a = 1. - smoothstep(-0.006, 0.0, d);
      vec3 c = texture2D(uTex, vUv).rgb;
      c = mix(vec3(0.004, 0.0045, 0.0035), c, uOn);
      vec2 cam = vec2(0., uSize.y * 0.5 - 0.235);
      c = mix(c, vec3(0.002), 1. - smoothstep(0.055, 0.062, length(vLP.xy - cam)));
      gl_FragColor = vec4(c, a * uOpacity);
    }`,
  transparent: true,
});
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), screenMat);
screenMesh.position.z = SCR_Z;
screenMesh.renderOrder = 1;
phone.add(screenMesh);

const bodyGeo = new THREE.ExtrudeGeometry(rrShape(BODY.w - 0.2, BODY.h - 0.2, BODY.r - 0.1), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 10, curveSegments: 40 });
bodyGeo.translate(0, 0, -0.11);
bodyGeo.computeVertexNormals();
const bodyMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 1 }, uScr: { value: new THREE.Vector2(SCR.w, SCR.h) }, uScrR: { value: SCR.r }, uBody: { value: new THREE.Vector2(BODY.w, BODY.h) }, uGlare: { value: 0 } },
  vertexShader: /* glsl */`
    varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
    void main(){ vLP = position; vLN = normal; vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: GLSL + /* glsl */`
    uniform float uOpacity; uniform vec2 uScr; uniform float uScrR; uniform vec2 uBody; uniform float uGlare;
    varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
    void main(){
      vec3 N = normalize(vWN); vec3 V = normalize(cameraPosition - vWP);
      float fres = pow(1. - clamp(dot(N, V), 0., 1.), 3.5);
      vec3 env = envColor(reflect(-V, N));
      float front = smoothstep(0.9, 0.995, normalize(vLN).z);
      float d = sdRR(vLP.xy, uScr * 0.5, uScrR);
      float inScr = 1. - smoothstep(-0.003, 0.003, d);
      float noise = (hash12(vLP.xy * 900.) - 0.5) * 0.02;
      vec3 c = mix(vec3(0.105, 0.11, 0.085) + noise, env, 0.22 + 0.75 * fres);
      float a = mix(0.5 + 0.45 * fres, mix(0.66, 0.0, inScr), front);
      float ring = (1. - smoothstep(0.0, 0.012, abs(d))) * front;
      float rim = (1. - smoothstep(0.0, 0.018, abs(sdRR(vLP.xy, uBody * 0.5 - 0.1, 0.48)))) * front;
      c += vec3(0.95, 0.94, 0.88) * (ring * 0.10 + rim * 0.75);
      a = max(a, max(ring * 0.25, rim * 0.85));
      c += env * fres * 1.1 * (1. - inScr * front);
      float band = vLP.x * 0.55 + vLP.y * 0.32 + uGlare;
      float glare = exp(-pow(band / 0.55, 2.)) * 0.05 + exp(-pow((band - 1.25) / 0.22, 2.)) * 0.025;
      if (inScr * front > 0.5) { c = vec3(1.0, 0.99, 0.96); a = glare; }
      gl_FragColor = vec4(c, clamp(a, 0., 1.) * uOpacity);
    }`,
  transparent: true, depthWrite: false,
});
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.renderOrder = 5;
phone.add(bodyMesh);

// ---------- piezas 3D: la misma pieza de la interfaz con grosor y sombra ----------
const pieceV = /* glsl */`
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){ vLP = position; vLN = normal; vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const pieceF = GLSL + /* glsl */`
  uniform sampler2D uTex; uniform vec2 uSize; uniform float uLift; uniform float uGlass; uniform float uOpacity; uniform float uPress;
  uniform sampler2D uBack; uniform vec2 uRes; uniform float uRad;
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){
    vec3 N = normalize(vWN);
    float face = step(0.9, normalize(vLN).z);
    vec2 uv = vec2((vLP.x + uSize.x * .5) / uSize.x, (vLP.y + uSize.y * .5) / uSize.y);
    vec4 tx = texture2D(uTex, uv);
    vec3 tex = tx.rgb;
    vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
    float ndl = clamp(dot(N, L), 0., 1.);
    vec3 V = normalize(cameraPosition - vWP);
    vec3 env = envColor(reflect(-V, N));
    float fres = pow(1. - clamp(dot(N, V), 0., 1.), 3.);
    vec3 lit = tex * (0.9 + 0.12 * ndl) * (1. - 0.08 * uPress) + env * 0.03;
    vec3 side = vec3(0.86, 0.85, 0.81) * (0.45 + 0.55 * ndl) + env * 0.12;
    vec3 c = mix(side, mix(tex, lit, uLift), face);
    float a = 1.;
    if (uGlass > 0.5) {
      // reseña de cristal: el fondo blanco de la tarjeta se vuelve vidrio esmerilado (lo de atrás desenfocado,
      // saturación 140 %, velo claro, grano 2 %, borde de 1 px); el texto y las estrellas quedan sólidos encima
      float lum = dot(tex, vec3(0.299, 0.587, 0.114));
      float ink = 1. - smoothstep(0.78, 0.93, lum);
      vec3 back = texture2D(uBack, gl_FragCoord.xy / uRes).rgb;
      float bl = dot(back, vec3(0.2126, 0.7152, 0.0722));
      back = max(mix(vec3(bl), back, 1.4), 0.);
      vec3 g = mix(back, vec3(0.84, 0.83, 0.77), 0.68);
      g += env * (0.04 + 0.55 * fres);
      g *= 1. + (hash12(floor(gl_FragCoord.xy) + 7.3) - 0.5) * 0.04;
      float dE = sdRR(vLP.xy, uSize * 0.5 - 0.01, uRad);
      float pw = max(fwidth(dE), 1e-5);
      float rim = (1. - smoothstep(0.5, 1.5, abs(dE / pw + 1.))) * face;
      g = mix(g, vec3(1.), rim * 0.7);
      c = mix(g, tex * 0.9, ink * face);
      if (face < 0.5) c = mix(back, vec3(0.92), 0.55) + env * 0.35;
      a = 1.;
      c = mix(tex, c, uLift);
    }
    gl_FragColor = vec4(c, a * uOpacity);
  }`;
const pieces = {};
function makePiece(id, tex, wCss, hCss, radioCss, glass = false) {
  const w = wCss / 100, h = hCss / 100, r = radioCss / 100;
  const geo = new THREE.ExtrudeGeometry(rrShape(w - 0.02, h - 0.02, Math.max(0.02, r - 0.01)), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 16 });
  geo.translate(0, 0, -0.05);
  const mat = new THREE.ShaderMaterial({ uniforms: { uTex: { value: tex }, uSize: { value: new THREE.Vector2(w, h) }, uLift: { value: 0 }, uGlass: { value: glass ? 1 : 0 }, uOpacity: { value: 1 }, uPress: { value: 0 }, uBack: { value: rtBlurA.texture }, uRes: { value: new THREE.Vector2(W, H) }, uRad: { value: Math.max(0.02, r - 0.01) } }, vertexShader: pieceV, fragmentShader: pieceF, transparent: glass });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = glass ? 6 : 3;
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.5));
  sh.renderOrder = 2;
  phone.add(mesh); phone.add(sh);
  pieces[id] = { mesh, sh, w, h, r };
  return pieces[id];
}

// ---------- logo 3D (cierre y end card) ----------
const logoGroup = new THREE.Group();
scene.add(logoGroup);
let logoMesh = null;
const logoShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.4));
logoShadow.renderOrder = 7;
scene.add(logoShadow);

// ---------- capa 2D ----------
const ov = document.createElement('canvas');
ov.width = W; ov.height = H;
const octx = ov.getContext('2d');
const ovTex = new THREE.CanvasTexture(ov);
ovTex.colorSpace = THREE.SRGBColorSpace;
ovTex.minFilter = THREE.LinearFilter; ovTex.generateMipmaps = false;
const ovScene = quadScene(new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
const accScene = quadScene(new THREE.MeshBasicMaterial({ map: rtSub.texture, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, opacity: 1 }));
const outScene = quadScene(new THREE.MeshBasicMaterial({ map: rtAcc.texture, depthTest: false, depthWrite: false, toneMapped: false }));
const noiseCanvas = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const d = x.createImageData(128, 128); for (let i = 0; i < d.data.length; i += 4) { const v = hash(i * 0.37) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; })();

// ---------- carga ----------
let META = null, TL = null, TYPE = null, TECLAS = null, WORDS = null;
const uiCache = new Map();
async function uiImage(f) {
  const key = Math.round(f);
  if (uiCache.has(key)) return uiCache.get(key);
  const res = await fetch(`${UI}/f${String(key).padStart(4, '0')}.jpg`);
  const bmp = await createImageBitmap(await res.blob());
  uiCache.set(key, bmp);
  if (uiCache.size > 6) { const k0 = uiCache.keys().next().value; uiCache.get(k0).close(); uiCache.delete(k0); }
  return bmp;
}
const TRIO = ['rosas-rojas', 'caja-de-tulipanes', 'girasoles'];
const RES = ['resena1', 'resena3', 'resena4'];
async function init() {
  META = await (await fetch(`${UI}/meta.json`)).json();
  TL = await (await fetch('/brief/timeline.json')).json();
  TYPE = Object.fromEntries(TL.tipo.map((t) => [t.id, t]));
  const evHook = TL.eventos.find((e) => e.escribe === 'florería aguascalientes');
  TECLAS = typingFrames(evHook.f, evHook.d, evHook.escribe);
  WORDS = Object.fromEntries(TL.voz.map((v) => [v.id, v.palabras]));
  scrCanvas.width = Math.round(390 * META.dsf);
  scrCanvas.height = Math.round(880 * META.dsf);
  const loader = new THREE.TextureLoader();
  const load = async (file) => { const t = await loader.loadAsync(`${UI}/${file}`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  for (const id of TRIO) { const t = META.texturas[id]; makePiece(id, await load(t.file), t.rect.w, t.rect.h, 22); }
  { const t = META.texturas.enviar; makePiece('enviar', await load(t.file), t.rect.w, t.rect.h, 17); }
  for (const id of RES) { const t = META.texturas[id]; makePiece(id, await load(t.file), t.rect.w, t.rect.h, 24, true); }
  pieces.resena3.mesh.material.uniforms.uBack.value = rtBlurB.texture;
  // logo: disco con grosor; la cara usa assets/logo_roma.png tal cual
  const logoTex = await new THREE.TextureLoader().loadAsync('/assets/logo_roma.png');
  logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 4;
  const geo = new THREE.CylinderGeometry(1, 1, 0.07, 96, 1);
  geo.rotateX(Math.PI / 2);
  const capMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: logoTex }, uOpacity: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D uTex; uniform float uOpacity; varying vec2 vUv; void main(){ vec4 c = texture2D(uTex, vec2(vUv.y, 1. - vUv.x)); vec3 olive = pow(vec3(0.671, 0.663, 0.529), vec3(2.2)); gl_FragColor = vec4(mix(olive, c.rgb, c.a), uOpacity); }',
    transparent: true,
  });
  const sideMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uOpacity; varying vec3 vN; void main(){ float l = 0.55 + 0.45 * clamp(dot(vN, normalize(vec3(-0.4, 0.6, 0.7))), 0., 1.); gl_FragColor = vec4(pow(vec3(0.58, 0.57, 0.44), vec3(2.2)) * l, uOpacity); }',
    transparent: true,
  });
  logoMesh = new THREE.Mesh(geo, [sideMat, capMat, sideMat]);
  logoMesh.renderOrder = 8;
  logoGroup.add(logoMesh);
  await document.fonts.load('600 52px "Playfair Display"');
  await document.fonts.load('500 52px "DM Sans"');
  await document.fonts.load('600 15px "DM Sans"');
  await document.fonts.load('400 15px "DM Sans"');
  window.ready = true;
}

// ---------- coreografía ----------
const LIFT = {
  'rosas-rojas': { f0: 358, back: 424, dx: -0.12, dy: 0.24, z: 1.35, rx: -7, ry: 11, rz: -3, s: 1.06, ph: 0.0 },
  'caja-de-tulipanes': { f0: 364, back: 428, dx: 0.3, dy: 0.32, z: 0.95, rx: -5, ry: -9, rz: 2.5, s: 1.05, ph: 1.7 },
  girasoles: { f0: 370, back: 432, dx: -0.08, dy: -0.2, z: 1.7, rx: 6, ry: 7, rz: 2, s: 1.06, ph: 3.1 },
};
// reseñas de cristal en abanico (posición final relativa al centro de la pantalla del celular)
const FAN = {
  resena3: { f0: 1080, back: 1162, x: 0, y: 0.32, z: 1.9, rz: 0, ry: 0, s: 0.86, op0: 1 },
  resena1: { f0: 1086, back: 1166, x: -1.45, y: 0.12, z: 1.35, rz: -9, ry: 12, s: 0.74, op0: 0 },
  resena4: { f0: 1092, back: 1170, x: 1.45, y: 0.12, z: 1.35, rz: 9, ry: -12, s: 0.74, op0: 0 },
};
const T_REV_OUT = 1182;
// push-in: la reseña 3 se acerca hasta leer "las flores llegaron frescas" al tamaño de un celular real (~2.4 px por px CSS)
// (posición en el mundo: centrada frente a la cámara, sin heredar el giro del celular)
const PUSH_M = 1.95;
const PUSH_W = [((LAY.push[0] - DW / 2) / PXU) / PUSH_M, ((DH / 2 - LAY.push[1]) / PXU) / PUSH_M, DIST * (1 - 1 / PUSH_M)];

function rectLocal(name) { const r = META.rects[name]; return r; }

function estado(t) {
  const st = { t };
  // ---- celular: pose base por secciones ----
  const vis = eOutCubic(seg(t, 186, 214)) * (1 - eOutCubic(seg(t, 1440, 1458)));
  const settle = springF(t, 186, 120, 13);
  const right = eInOutCubic(seg(t, 300, 334)) - eInOutCubic(seg(t, 560, 576));
  const left = eInOutCubic(seg(t, 584, 608)) - eInOutCubic(seg(t, 706, 730));
  const conf = eInOutCubic(seg(t, 1034, 1062)) - eInOutCubic(seg(t, 1176, 1224));
  const cierre = eInOutCubic(seg(t, 1176, 1224));
  let x = (right - left) * LAY.shift / PXU;
  let y = PHONE_Y;
  let s = lerp(0.965, 1, eOutCubic(seg(t, 186, 238))) * lerp(1, LAY.side, Math.max(right, left));
  s *= lerp(1, LAY.conf.s, conf);
  y = lerp(y, (DH / 2 - LAY.conf.cy) / PXU, conf);
  x = lerp(x, (LAY.conf.x || 0) / PXU, conf);
  let rx = lerp(4, 1, settle);
  let ry = lerp(12, -3, settle) - 3 * right + 6 * left;
  x = lerp(x, LAY.cierre.x / PXU, cierre);
  s = lerp(s, LAY.cierre.s, cierre);
  ry = lerp(ry, LAY.cierre.ry, cierre);
  y = lerp(y, PHONE_Y + 0.25, cierre);
  // respiro: mecerse despacio
  const breath = seg(t, 1380, 1440);
  ry += Math.sin((t - 1380) / 40) * 0.8 * breath;
  x += 0.8 * eInCubic(seg(t, 1440, 1458));
  st.phone = { vis, x, y, s, rx: rx * DEG, ry: ry * DEG };
  st.on = eOutCubic(seg(t, 196, 212));
  st.ui = clamp(Math.round(t), 196, 1470);
  const orb = eInOutSine(seg(t, 388, 432)) - eInOutSine(seg(t, 436, 484));
  st.cam = { yaw: 6 * DEG * orb, push: 1 - 0.045 * orb - 0.02 * breath };

  // ---- push-in (zoom con punto de foco en la pantalla) ----
  const m = rectLocal('mensaje'), an = rectLocal('anticipo'), en = rectLocal('enviar');
  st.focus = null;
  const uT = bump(t, 786, 806, 838, 856);
  const uA = bump(t, 864, 880, 918, 942);
  if (uT > 0) st.focus = { u: uT, z: 1.45, F: pageToLocal(m.x + m.w / 2, m.y + m.h / 2 + 120), D: LAY.focus.tecla };
  else if (uA > 0) st.focus = { u: uA, z: 1.3, F: pageToLocal(195, (an.y + en.y + en.h) / 2), D: LAY.focus.anticipo };

  // ---- tarjetas del catálogo ----
  st.pieces = {};
  for (const id of TRIO) {
    const L = LIFT[id];
    let up = t >= L.f0 ? springF(t, L.f0, 150, 17) : 0;
    if (t >= L.back) up = springF(L.back, L.f0, 150, 17) * (1 - eInOutCubic(seg(t, L.back, L.back + 16)));
    const hv = clamp(up), ts = t / FPS;
    const tx = META.texturas[id].rect;
    const [sx, sy] = pageToLocal(tx.x + tx.w / 2, tx.y + tx.h / 2);
    st.pieces[id] = {
      visible: t >= 358 && t < 448, up, op: 1,
      x: sx + L.dx * up + Math.sin(ts * 1.3 + L.ph) * 0.045 * hv, y: sy + L.dy * up + Math.cos(ts * 1.1 + L.ph) * 0.05 * hv,
      z: SCR_Z + 0.0015 + L.z * up, rx: (L.rx * up + Math.sin(ts * 0.9 + L.ph) * 1.5 * hv) * DEG, ry: (L.ry * up + Math.cos(ts * 0.8 + L.ph) * 2 * hv) * DEG, rz: L.rz * up * DEG,
      s: lerp(1, L.s, up), press: 0,
    };
  }
  // ---- botón "Enviar pedido por WhatsApp" que se levanta en 3D ----
  {
    const tx = META.texturas.enviar.rect;
    const [sx, sy] = pageToLocal(tx.x + tx.w / 2, tx.y + tx.h / 2);
    let up = t >= 892 ? springF(t, 892, 260, 15) : 0;
    const press = bump(t, 905, 908, 909, 914) ;
    if (t >= 908) up = springF(908, 892, 260, 15) * (1 - eInOutCubic(seg(t, 908, 914)));
    st.pieces.enviar = { visible: t >= 892 && t < 914, up, op: 1, x: sx, y: sy + 0.28 * up, z: SCR_Z + 0.0015 + 2.6 * up - 0.6 * press, rx: -14 * up * DEG, ry: 4 * up * DEG, rz: 0, s: lerp(1, 1.12, up) * (1 - 0.06 * press), press };
  }
  // ---- reseñas de cristal en abanico + push-in a "las flores llegaron frescas" ----
  const push = bump(t, 1106, 1146, 1156, 1180);
  for (const id of RES) {
    const A = FAN[id];
    const tx = META.texturas[id].rect;
    const [sx, sy] = pageToLocal(tx.x + tx.w / 2, tx.y + tx.h / 2);
    let up = t >= A.f0 ? springF(t, A.f0, 140, 17) : 0;
    if (t >= A.back) up = springF(A.back, A.f0, 140, 17) * (1 - eInOutCubic(seg(t, A.back, A.back + 14)));
    const hv = clamp(up), ts = t / FPS;
    const p = id === 'resena3' ? push : 0;
    st.pieces[id] = {
      visible: t >= 1080 && t < T_REV_OUT, up, op: lerp(A.op0, 1, clamp(up * 2.5)) * (1 - 0.65 * push * (id !== 'resena3')),
      x: lerp(sx, A.x, up) + Math.sin(ts * 1.2 + A.f0) * 0.03 * hv * (1 - p), y: lerp(sy, A.y, up) + Math.cos(ts * 1.0 + A.f0) * 0.035 * hv * (1 - p),
      z: SCR_Z + 0.0015 + A.z * up, rx: 0, ry: A.ry * up * DEG, rz: A.rz * up * DEG, s: lerp(lerp(1, A.s, up), 1, p), press: 0,
      pushP: eInOutCubic(p), pushW: PUSH_W,
    };
  }
  st.dof = push;

  // ---- logo (cierre → end card) ----
  const lIn = eOutCubic(seg(t, 1352, 1376));
  const lEnd = springF(t, 1440, 120, 14);
  const lm = clamp(eInOutCubic(seg(t, 1438, 1482)));
  const lx = lerp(LAY.logoSm.x, LAY.logoEnd.x, lm);
  const ly = lerp(LAY.logoSm.y, LAY.logoEnd.y, lm);
  const ld = lerp(LAY.logoSm.d, LAY.logoEnd.d, lm);
  st.logo = { vis: t >= 1352, x: lx, y: ly, d: ld * lerp(0.82, 1, lIn), op: lIn, ry: lerp(-22, 0, t < 1440 ? lIn : lEnd) * DEG + (t >= 1440 ? (1 - lEnd) * 22 * DEG : 0) };
  st.wipe = eInOutCubic(seg(t, 1440, 1462));
  return st;
}

const Y = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function aplicar(st) {
  const p = st.phone;
  phone.visible = p.vis > 0.001;
  _e.set(p.rx, p.ry, 0, 'YXZ');
  phone.rotation.copy(_e);
  let s = p.s, pos = new THREE.Vector3(p.x, p.y, 0);
  if (st.focus) {
    const { u, z, F, D } = st.focus;
    const Fl = new THREE.Vector3(F[0], F[1], SCR_Z);
    _q.setFromEuler(_e);
    const base = Fl.clone().multiplyScalar(s).applyQuaternion(_q).add(pos);
    const target = toWorld(D[0], D[1]);
    const desired = base.clone().lerp(target, eInOutCubic(u));
    s = s * lerp(1, z, eInOutCubic(u));
    pos = desired.sub(Fl.clone().multiplyScalar(s).applyQuaternion(_q));
  }
  phone.position.copy(pos);
  phone.scale.setScalar(s);
  bodyMat.uniforms.uOpacity.value = p.vis;
  dropShadow.material.uniforms.uOpacity.value = 0.55 * p.vis;
  screenMat.uniforms.uOn.value = st.on;
  screenMat.uniforms.uOpacity.value = p.vis;
  bodyMat.uniforms.uGlare.value = -1.4 + (p.ry / DEG) * 0.12 + (st.cam.yaw / DEG) * 0.18 + p.x * 0.35;
  const relCam = new THREE.Vector3(-pos.x, 0, DIST * st.cam.push).applyAxisAngle(Y, st.cam.yaw);
  const relLook = new THREE.Vector3(-pos.x, 0, 0).applyAxisAngle(Y, st.cam.yaw);
  camera.position.set(pos.x + relCam.x, 0, relCam.z);
  camera.lookAt(pos.x + relLook.x, 0, relLook.z);
  camera.updateMatrixWorld();
  phone.updateMatrixWorld(true);
  for (const [id, c] of Object.entries(pieces)) {
    const q = st.pieces[id];
    c.mesh.visible = c.sh.visible = !!q && q.visible && p.vis > 0.001;
    if (!c.mesh.visible) continue;
    c.mesh.position.set(q.x, q.y, q.z);
    c.mesh.rotation.set(q.rx, q.ry, q.rz);
    if (q.pushP > 0) {
      // push-in: de la pose del abanico a un punto fijo frente a la cámara, de frente (anula el giro del celular)
      const lt = phone.worldToLocal(new THREE.Vector3(...q.pushW));
      c.mesh.position.lerp(lt, q.pushP);
      c.mesh.quaternion.slerp(phone.quaternion.clone().invert(), q.pushP);
    }
    c.mesh.scale.set(q.s, q.s, lerp(0.15, 1, clamp(q.up * 3)));
    const u = c.mesh.material.uniforms;
    u.uLift.value = clamp(q.up * 2); u.uOpacity.value = q.op * p.vis; u.uPress.value = q.press;
    const hgt = Math.max(0, q.z - SCR_Z);
    c.sh.position.set(q.x + 0.2 * Math.min(hgt, 2.5), q.y - 0.32 * Math.min(hgt, 2.5), SCR_Z + 0.0008);
    setSoftShadow(c.sh, c.w * q.s, c.h * q.s, c.r, 0.03 + 0.2 * Math.min(hgt, 2.5), 0.5 * clamp(q.up * 4) * (1 - 0.25 * Math.min(hgt, 2)) * q.op * (1 - (q.pushP || 0)));
  }
  // logo
  logoGroup.visible = st.logo.vis;
  logoShadow.visible = st.logo.vis;
  if (st.logo.vis) {
    const r = (st.logo.d / 2) / PXU;
    const wpos = toWorld(st.logo.x, st.logo.y).applyAxisAngle(Y, 0);
    wpos.z = 1.2;
    // corrige la perspectiva para que el logo quede en su punto de pantalla
    const k = (DIST - 1.2) / DIST;
    wpos.x *= k; wpos.y *= k;
    logoGroup.position.copy(wpos).add(new THREE.Vector3(camera.position.x, 0, 0).multiplyScalar(0));
    logoGroup.scale.setScalar(r * k);
    logoGroup.rotation.set(0, st.logo.ry, 0);
    for (const mm of logoMesh.material) mm.uniforms.uOpacity.value = st.logo.op;
    logoShadow.position.set(wpos.x + 0.12 * r, wpos.y - 0.18 * r, 0.9);
    setSoftShadow(logoShadow, 2 * r * k, 2 * r * k, r * k, 0.35 * r, 0.42 * st.logo.op);
  }
  bgMat.uniforms.uWipe.value = st.wipe;
  bgMat.uniforms.uCenter.value.set(st.logo.x / DW, 1 - st.logo.y / DH); // el olivo se abre desde el logo
  phone.updateMatrixWorld(true);
  logoGroup.updateMatrixWorld(true);
}

// ---------- pantalla ----------
function barraEstado(ctx, k) {
  ctx.fillStyle = '#F5F1E6';
  ctx.fillRect(0, 0, 390 * k, STATUS * k);
  ctx.fillStyle = '#2E2D24';
  ctx.font = `600 ${15 * k}px "DM Sans"`;
  ctx.textBaseline = 'middle';
  ctx.fillText('12:00', 30 * k, 25 * k);
  const x0 = 300 * k, y0 = 25 * k;
  for (let i = 0; i < 4; i++) { const h = (4 + i * 2.4) * k; ctx.fillRect(x0 + i * 4.6 * k, y0 + 5 * k - h, 3 * k, h); }
  ctx.strokeStyle = '#2E2D24'; ctx.lineWidth = 1.6 * k; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(333 * k, y0 + 5 * k, (3 + i * 3.4) * k, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); }
  ctx.lineWidth = 1.2 * k;
  ctx.beginPath(); ctx.roundRect(344 * k, y0 - 5.5 * k, 22 * k, 11 * k, 3 * k); ctx.stroke();
  ctx.fillRect(346 * k, y0 - 3.5 * k, 15 * k, 7 * k);
  ctx.fillRect(367 * k, y0 - 2 * k, 1.6 * k, 4 * k);
}
let lastUi = -1;
async function pantalla(st) {
  if (st.on <= 0 || st.ui === lastUi) return;
  lastUi = st.ui;
  const img = await uiImage(st.ui);
  const k = META.dsf;
  scrCtx.drawImage(img, 0, STATUS * k);
  barraEstado(scrCtx, k);
  scrCtx.fillStyle = 'rgba(46,45,36,0.82)';
  scrCtx.beginPath(); scrCtx.roundRect((195 - 67) * k, (880 - 13) * k, 134 * k, 5 * k, 2.5 * k); scrCtx.fill();
  scrTex.needsUpdate = true;
}

// ---------- proyección a la capa 2D (px de diseño) ----------
const _v = new THREE.Vector3();
function proj(obj, x, y, z) { _v.set(x, y, z).applyMatrix4(obj.matrixWorld).project(camera); return [(_v.x + 1) / 2 * DW, (1 - _v.y) / 2 * DH]; }
const projLocal = (lx, ly) => proj(phone, lx, ly, FRONT_Z + 0.004);
const projPage = (x, y) => projLocal(...pageToLocal(x, y));
function projPiece(id, px, py) { // px,py en CSS dentro de la pieza (desde su esquina sup. izq.)
  const c = pieces[id];
  return proj(c.mesh, px / 100 - c.w / 2, c.h / 2 - py / 100, 0.035);
}

const OUTLINE = (() => {
  const w = BODY.w + 0.14, h = BODY.h + 0.14, r = BODY.r + 0.07;
  const pts = [];
  const push = (x, y) => pts.push([x, y]);
  const N = 14;
  const arc = (cx, cy, a0, a1) => { for (let i = 1; i <= N; i++) { const a = lerp(a0, a1, i / N); push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } };
  push(w / 2, 0);
  push(w / 2, -h / 2 + r); arc(w / 2 - r, -h / 2 + r, 0, -Math.PI / 2);
  push(-w / 2 + r, -h / 2); arc(-w / 2 + r, -h / 2 + r, -Math.PI / 2, -Math.PI);
  push(-w / 2, h / 2 - r); arc(-w / 2 + r, h / 2 - r, Math.PI, Math.PI / 2);
  push(w / 2 - r, h / 2); arc(w / 2 - r, h / 2 - r, Math.PI / 2, 0);
  push(w / 2, h / 2 - r - 1.5);
  return pts;
})();
function densify(pts, step = 6) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 1; k <= n; k++) out.push([lerp(x0, x1, k / n), lerp(y0, y1, k / n)]);
  }
  return out;
}
const cumLen = (pts) => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; };
const plen = (pts) => cumLen(pts).pop();
function slice(pts, a, b) {
  const L = cumLen(pts), out = [];
  const total = L[L.length - 1];
  const at = (s) => { let i = 1; while (i < L.length - 1 && L[i] < s) i++; const u = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], clamp(u)), lerp(pts[i - 1][1], pts[i][1], clamp(u))]; };
  a = clamp(a, 0, total); b = clamp(b, 0, total);
  if (b - a < 1) return [];
  out.push(at(a));
  for (let i = 0; i < pts.length; i++) if (L[i] > a && L[i] < b) out.push(pts[i]);
  out.push(at(b));
  return out;
}
const bez = (p0, p1, p2, p3, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, m = 1 - u; return [m * m * m * p0[0] + 3 * m * m * u * p1[0] + 3 * m * u * u * p2[0] + u * u * u * p3[0], m * m * m * p0[1] + 3 * m * m * u * p1[1] + 3 * m * u * u * p2[1] + u * u * u * p3[1]]; });
const ellipse = (cx, cy, rx, ry, a0, turns, n = 60) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 - (i / n) * turns * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });

// guía base del tallo: A (sube) + B (bajo el texto de la barra) + C (rizo) + D (contorno del celular)
const BAR = LAY.bar;
const barX0 = BAR.cx - BAR.w / 2;
const textX0 = barX0 + 122;
function guia() {
  const yb = BAR.cy + 40;
  const A = bez([DW / 2, DH + 90], [DW / 2 + 70, DH * 0.81], [barX0 - 10, BAR.cy + 360], [barX0 + 60, yb]);
  const B = Array.from({ length: 41 }, (_, i) => [lerp(barX0 + 60, barX0 + BAR.w - 60, i / 40), yb + Math.sin(i * 0.9) * 5]);
  const D = OUTLINE.map(([x, y]) => projLocal(x, y));
  const R = 40, cx = barX0 + BAR.w - 60, cy = yb - R;
  const loop = Array.from({ length: 33 }, (_, i) => { const a = (i / 32) * Math.PI * 2; return [cx + R * Math.sin(a), cy + R * Math.cos(a)]; });
  const C = [...loop, ...bez([cx, cy + R], [cx + 150, cy + R], [D[0][0] + 10, D[0][1] - 170], D[0], 30).slice(1)];
  const parts = [A, B.slice(1), C.slice(1), densify(D, 10).slice(1)];
  const lens = parts.map((p, i) => plen(i ? [parts[i - 1][parts[i - 1].length - 1], ...p] : p));
  return { pts: densify(parts.flat(), 8), lens };
}

// alcances del tallo: subrayados y círculos (en el cuadro de su evento)
function alcances() {
  const r = META.rects;
  // subrayado de derecha a izquierda: empieza por el extremo más cercano al tallo
  const und = (rc, dy = 5) => () => [projPage(rc.x + rc.w + 6, rc.y + rc.h + dy), projPage(rc.x - 6, rc.y + rc.h + dy)];
  // círculo alrededor del botón: sigue a la pieza 3D mientras está levantada
  const circEnviar = () => {
    const R = META.texturas.enviar.rect, vis = pieces.enviar.mesh.visible;
    return ellipse(R.w / 2, R.h / 2, R.w / 2 + 10, R.h / 2 + 10, Math.PI - 0.15, 1.08, 72).map(([x, y]) => (vis ? projPiece('enviar', x, y) : projPage(R.x + x, R.y + y)));
  };
  const circ = (rc, pad = 12, a0 = 0.15) => () => { const c = [rc.x + rc.w / 2, rc.y + rc.h / 2]; return ellipse(c[0], c[1], rc.w / 2 + pad, rc.h / 2 + pad, a0, 1.08, 72).map(([x, y]) => projPage(x, y)); };
  const tallas = META.texturas['rosas-rojas'].partes.tallas;
  return [
    { a: 402, b: 418, back: 430, target: () => [projPiece('rosas-rojas', tallas.x + tallas.w + 6, tallas.y + tallas.h + 4), projPiece('rosas-rojas', tallas.x - 6, tallas.y + tallas.h + 4)] },
    { a: 452, b: 466, back: 478, target: und(r.precio820) },
    { a: 552, b: 574, back: 586, target: circ(r.tarjeta820, 10) },
    { a: 872, b: 896, back: 906, target: () => { const u = und(r.anticipo, 1.5)(); const c = circEnviar(); return [...densify(u, 6), ...bez(u[u.length - 1], [u[u.length - 1][0] - 40, u[u.length - 1][1] + 40], [c[0][0] - 40, c[0][1] - 40], c[0], 16).slice(1), ...c.slice(1)]; }, split: 0.45 },
    { a: 986, b: 1002, back: 1014, target: und(r.entrega) },
    { a: 1020, b: 1034, back: 1046, target: und(r.pickup) },
  ];
}
let ALC = null;

// escritura final "SPREAD LOVE, / SEND FLOWERS" y flor
const T7 = { l1: 'SPREAD LOVE,', l2: 'SEND FLOWERS' };
function medidas7(ctx) {
  ctx.font = `600 ${LAY.t7.px}px "Playfair Display"`;
  const glyphs = [];
  for (const [li, txt] of [[0, T7.l1], [1, T7.l2]]) {
    let x = LAY.t7.x;
    for (const ch of txt) { const w = ctx.measureText(ch).width + LAY.t7.px * 0.02; glyphs.push({ ch, li, x, w }); x += w; }
  }
  const w1 = glyphs.filter((g) => g.li === 0).reduce((s, g) => Math.max(s, g.x + g.w), 0);
  const w2 = glyphs.filter((g) => g.li === 1).reduce((s, g) => Math.max(s, g.x + g.w), 0);
  return { glyphs, w1, w2, flor: [Math.max(w1, w2) + 52, (LAY.t7.y1 + LAY.t7.y2) / 2 - 18] };
}
let M7 = null;
function rutaEscritura(vineTip) {
  const { x } = LAY.t7, y1 = LAY.t7.y1 + 16, y2 = LAY.t7.y2 + 16;
  const a = bez(vineTip, [vineTip[0] - 160, vineTip[1] + 40], [x - 120, y1 - 140], [x - 20, y1], 30);
  const l1 = Array.from({ length: 31 }, (_, i) => [lerp(x - 20, M7.w1 + 14, i / 30), y1 + Math.sin(i * 0.7) * 3]);
  const ret = bez([M7.w1 + 14, y1], [M7.w1 - 40, y1 + 60], [x + 40, y2 - 50], [x - 20, y2], 24);
  const l2 = Array.from({ length: 31 }, (_, i) => [lerp(x - 20, M7.w2 + 14, i / 30), y2 + Math.sin(i * 0.7 + 1) * 3]);
  const f = M7.flor;
  const curl = bez([M7.w2 + 14, y2], [M7.w2 + 60, y2 + 10], [f[0] + 10, f[1] + 60], f, 24);
  const parts = [a, l1.slice(1), ret.slice(1), l2.slice(1), curl.slice(1)];
  const lens = parts.map((p, i) => plen(i ? [parts[i - 1][parts[i - 1].length - 1], ...p] : p));
  return { pts: densify(parts.flat(), 6), lens };
}

function dibujaTallo(ctx, p, w0, w1, alpha = 1) {
  const n = p.length;
  if (n < 2) return;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = lerp(w0, w1, i / (n - 1)) / 2;
    left.push([p[i][0] - dy * w, p[i][1] + dx * w]);
    right.push([p[i][0] + dy * w, p[i][1] - dx * w]);
  }
  ctx.save();
  ctx.scale(S, S);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(...left[0]);
  for (const q of left) ctx.lineTo(...q);
  const tip = p[n - 1];
  ctx.arc(tip[0], tip[1], w1 / 2, 0, Math.PI * 2);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(...right[i]);
  ctx.closePath();
  ctx.fillStyle = '#93A061';
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const q = [lerp(left[i][0], p[i][0], 0.45), lerp(left[i][1], p[i][1], 0.45)]; i ? ctx.lineTo(...q) : ctx.moveTo(...q); }
  ctx.strokeStyle = 'rgba(206,214,166,0.75)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  const a = p[Math.max(0, n - 4)];
  const ang = Math.atan2(tip[1] - a[1], tip[0] - a[0]);
  ctx.translate(tip[0], tip[1]); ctx.rotate(ang);
  ctx.beginPath(); ctx.ellipse(2.5, 0, 4.2, 2.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#B4C07E'; ctx.fill();
  ctx.restore();
}
const sway = (p, t) => p.map(([x, y], i) => { const u = i / Math.max(1, p.length - 1); return [x + noise1(t / 45 + i * 0.05) * 2.2 * u, y + noise1(t / 50 + i * 0.05 + 7) * 2.2 * u]; });

function caretX(t) {
  octx.save();
  octx.font = `500 ${BAR.px}px "DM Sans"`;
  const n = TECLAS.filter((f) => f <= t).length;
  const w = octx.measureText('florería aguascalientes'.slice(0, n)).width;
  octx.restore();
  return textX0 + w;
}

function tallo(ctx, t) {
  if (t >= 1460) return;
  const fade = 1 - seg(t, 1440, 1456);
  const g = guia();
  const [lA, lB, lC, lD] = g.lens;
  const total = lA + lB + lC + lD;
  let pts = g.pts, head, tail;
  if (t < 144) {
    const grow = lA * eOutCubic(seg(t, 0, 42));
    const write = clamp((caretX(t) - (barX0 + 60)) / (BAR.w - 120)) * lB;
    head = t < 46 ? grow : lA + lerp(write, lB, eInOutCubic(seg(t, 126, 142)));
    tail = 0;
  } else {
    head = lerp(lA + lB, total, eInOutCubic(seg(t, 148, 206)));
    const tailAB = lerp(0, lA + lB, eInOutCubic(seg(t, 144, 170)));
    const Lvis = lerp(1600, 560, eInOutCubic(seg(t, 192, 244)));
    tail = Math.max(tailAB, head - Lvis);
  }
  // alcances: el tallo sale de la enredadera, subraya o rodea y regresa
  if (t >= 244 && t < 1188) {
    for (const r of ALC) {
      if (t < r.a || t > r.back + 20) continue;
      const tgt = densify(r.target(), 6);
      const vine = pts[pts.length - 1];
      const conn = bez(vine, [vine[0] - 20, vine[1] + 120], [tgt[0][0] + 90, tgt[0][1] + 50], tgt[0], 28);
      const full = [...pts, ...conn.slice(1), ...tgt.slice(1)];
      const lc = plen(conn), lt = plen(tgt);
      const split = r.split || 0.4;
      const go = t < r.b ? (t - r.a) / (r.b - r.a) : 1;
      let reach = go < split ? lc * eInOutCubic(go / split) : lc + lt * eInOutCubic((go - split) / (1 - split));
      const ret = eInOutCubic(seg(t, r.b + 4, r.back));
      reach = reach * (1 - ret);
      // la marca (subrayado o círculo) se queda y se desvanece
      const done = t < r.b ? Math.max(0, reach - lc) : lt;
      const markA = (1 - seg(t, r.back, r.back + 20));
      if (done > 1 && markA > 0) dibujaTallo(ctx, slice(tgt, 0, done), 2.6, 2.2, markA * fade);
      pts = full; head = total + reach;
      break;
    }
  }
  // cierre: el tallo deja el celular y escribe la frase
  if (t >= 1188) {
    const vineTip = pts[pts.length - 1];
    const w = rutaEscritura(vineTip);
    const [la, l1, lr, l2, lc] = w.lens;
    let hw;
    if (t < 1204) hw = la * eInOutCubic(seg(t, 1188, 1204));
    else if (t < 1262) hw = la + l1 * seg(t, 1204, 1262);
    else if (t < 1266) hw = la + l1 + lr * seg(t, 1262, 1266);
    else if (t < 1322) hw = la + l1 + lr + l2 * seg(t, 1266, 1322);
    else hw = la + l1 + lr + l2 + lc * eOutCubic(seg(t, 1322, 1336));
    pts = [...pts, ...w.pts.slice(1)];
    head = total + hw;
    tail = Math.max(total - 560, head - 700);
    st7.head = hw; st7.w = w;
  }
  const p = slice(pts, tail, head);
  if (p.length >= 2) {
    // la reseña de cristal que viene hacia la cámara tapa al tallo (que va pegado al celular)
    const c = pieces.resena3;
    const tapa = c && c.mesh.visible && c.mesh.position.z > SCR_Z + 0.3;
    if (tapa) {
      const r = META.texturas.resena3.rect;
      const q = [[0, 0], [r.w, 0], [r.w, r.h], [0, r.h]].map(([x, y]) => projPiece('resena3', x, y));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.moveTo(q[0][0] * S, q[0][1] * S); for (const v of q.slice(1)) ctx.lineTo(v[0] * S, v[1] * S); ctx.closePath();
      ctx.clip('evenodd');
    }
    dibujaTallo(ctx, sway(p, t), 6.2, 2.3, fade);
    if (tapa) ctx.restore();
  }
}
const st7 = { head: 0, w: null };

// barra de búsqueda de cristal: aparece, se escribe la búsqueda y se comprime hacia el celular
function barra(ctx, t) {
  if (t < 18 || t >= 196) return;
  const appear = eOutCubic(seg(t, 18, 42));
  const c = eInOutCubic(seg(t, 146, 182));
  const camPt = projLocal(0, SCR.h / 2 - 0.235);
  const cx = lerp(BAR.cx, camPt[0], c), cy = lerp(BAR.cy, camPt[1], c);
  const w = lerp(BAR.w, 64, c) * lerp(0.96, 1, appear), h = lerp(BAR.h, 22, c);
  const alpha = appear * (1 - seg(t, 178, 196));
  if (alpha <= 0) return;
  ctx.save();
  ctx.scale(S, S);
  ctx.globalAlpha = alpha;
  const x = cx - w / 2, y = cy - h / 2, r = h / 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  const gr = ctx.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, 'rgba(245,241,230,0.15)'); gr.addColorStop(1, 'rgba(245,241,230,0.06)');
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30 * (1 - c); ctx.shadowOffsetY = 10 * (1 - c);
  ctx.fillStyle = gr; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); ctx.clip(); ctx.globalAlpha = alpha * 0.02; ctx.fillStyle = ctx.createPattern(noiseCanvas, 'repeat'); ctx.fillRect(x, y, w, h); ctx.restore();
  // borde de 1 px que se dibuja de izquierda a derecha
  const border = seg(t, 18, 40);
  ctx.lineWidth = 1.2; ctx.strokeStyle = `rgba(245,241,230,${0.42 + 0.3 * c})`;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y - 2, (w + 4) * border, h + 4); ctx.clip();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke(); ctx.restore();
  const txt = 1 - eOutCubic(seg(t, 146, 156));
  if (txt > 0) {
    ctx.globalAlpha = alpha * txt;
    ctx.strokeStyle = '#F5F1E6'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x + 70, cy - 4, 15, 0, Math.PI * 2); ctx.moveTo(x + 81, cy + 7); ctx.lineTo(x + 92, cy + 18); ctx.stroke();
    // texto tecleado letra por letra (cada letra con un leve rebote)
    ctx.font = `500 ${BAR.px}px "DM Sans"`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#F5F1E6';
    let xx = textX0;
    const word = 'florería aguascalientes';
    for (let i = 0; i < word.length; i++) {
      const fk = TECLAS[i];
      const ch = word[i];
      const wch = ctx.measureText(ch).width;
      if (t >= fk) {
        const u = seg(t, fk, fk + 5);
        ctx.save(); ctx.globalAlpha = alpha * txt * eOutCubic(u);
        ctx.translate(xx + wch / 2, cy + 2); ctx.scale(lerp(0.82, 1, eOutCubic(u)), lerp(0.82, 1, eOutCubic(u)));
        ctx.fillText(ch, -wch / 2, 0); ctx.restore();
      }
      xx += wch;
    }
    // cursor (parpadea cada 30 cuadros)
    if (t >= 44 && t < 146 && Math.floor((t - 44) / 15) % 2 === 0) { ctx.fillStyle = 'rgba(245,241,230,0.9)'; ctx.fillRect(caretX(t) + 3, cy - 28, 3, 56); }
    // botón de flecha: aparece cuando ya hay búsqueda; se hunde con el enter
    const arr = eOutCubic(seg(t, 96, 110));
    if (arr > 0) {
      const press = 1 - 0.06 * Math.sin(Math.PI * seg(t, 144, 156));
      ctx.save(); ctx.globalAlpha = alpha * txt * arr; ctx.translate(x + w - 66, cy); ctx.scale(press * lerp(0.7, 1, arr), press * lerp(0.7, 1, arr));
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fillStyle = 'rgba(245,241,230,0.18)'; ctx.fill();
      ctx.strokeStyle = '#F5F1E6'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(4, -10); ctx.lineTo(14, 0); ctx.lineTo(4, 10); ctx.stroke();
      ctx.restore();
    }
    const rp = seg(t, 144, 172);
    if (rp > 0 && rp < 1) { ctx.globalAlpha = alpha * txt * (1 - rp) * 0.5; ctx.beginPath(); ctx.arc(x + w - 66, cy, 44 + rp * 60, 0, Math.PI * 2); ctx.strokeStyle = '#F5F1E6'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  ctx.restore();
}

// kinetic type: glifo por glifo, desde una máscara; el primer glifo aterriza en f + 14
function tipo(ctx, t, T, pos) {
  if (!T || t < T.f || t > T.sale + 30) return;
  ctx.save();
  ctx.scale(S, S);
  ctx.font = `600 ${pos.px}px "Playfair Display"`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#F5F1E6';
  const chars = [...T.texto];
  const em = pos.px;
  const widths = chars.map((ch) => ctx.measureText(ch).width + em * 0.02);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = pos.center ? pos.x - total / 2 : pos.x;
  ctx.beginPath(); ctx.rect(0, pos.y - em * 1.05, DW, em * 1.32); ctx.clip();
  let gi = 0;
  chars.forEach((ch, i) => {
    if (ch !== ' ') {
      const fi = T.f + gi * 2;
      const u = seg(t, fi, fi + 14);
      const out = seg(t, T.sale + gi, T.sale + gi + 14);
      const a = eOutCubic(u) * (1 - eOutCubic(out));
      const blur = (1 - u) * 8 + out * 6;
      if (a > 0.003) {
        ctx.globalAlpha = a;
        ctx.filter = blur > 0.2 ? `blur(${(blur * S).toFixed(2)}px)` : 'none';
        ctx.fillText(ch, x, pos.y + (1 - eOutExpo(u)) * em * 0.9 - eInOutCubic(out) * em * 1.1);
      }
      gi++;
    }
    x += widths[i];
  });
  ctx.filter = 'none';
  ctx.restore();
}

// "SPREAD LOVE, / SEND FLOWERS": cada glifo se revela cuando pasa la punta del tallo
function escritura(ctx, t) {
  if (t < 1188 || !st7.w) return;
  const fade = 1 - seg(t, 1440, 1454);
  if (fade <= 0) return;
  const [la, l1, lr] = st7.w.lens;
  ctx.save(); ctx.scale(S, S);
  ctx.font = `600 ${LAY.t7.px}px "Playfair Display"`;
  ctx.fillStyle = '#F5F1E6';
  for (const g of M7.glyphs) {
    if (g.ch === ' ') continue;
    const lineStart = g.li === 0 ? la : la + l1 + lr;
    const lineLen = g.li === 0 ? l1 : st7.w.lens[3];
    const x0 = LAY.t7.x - 20, x1 = (g.li === 0 ? M7.w1 : M7.w2) + 14;
    const gate = lineStart + ((g.x + g.w * 0.35 - x0) / (x1 - x0)) * lineLen;
    const u = clamp((st7.head - gate) / 40);
    if (u <= 0) continue;
    ctx.globalAlpha = eOutCubic(u) * fade;
    ctx.fillText(g.ch, g.x, (g.li === 0 ? LAY.t7.y1 : LAY.t7.y2) + (1 - eOutCubic(u)) * 10);
  }
  ctx.restore();
}

function flor(ctx, t) {
  if (t < 1322) return;
  const fade = 1 - seg(t, 1440, 1456);
  if (fade <= 0) return;
  const [fx, fy] = M7.flor;
  ctx.save(); ctx.scale(S, S); ctx.translate(fx, fy);
  ctx.strokeStyle = `rgba(255,255,255,${0.95 * fade})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const f0 = 1326 + k * 6;
    const u = seg(t, f0, f0 + 16);
    if (u <= 0) continue;
    const sc = spring((t - f0) / FPS, 220, 16);
    ctx.save(); ctx.rotate((k * 72 - 90) * DEG);
    ctx.beginPath();
    ctx.ellipse(19 * sc, 0, 13 * sc, 8.5 * sc, 0, Math.PI, Math.PI + Math.PI * 2 * eOutCubic(u), false);
    ctx.stroke(); ctx.restore();
  }
  const cu = eOutCubic(seg(t, 1352, 1362));
  if (cu > 0) { ctx.beginPath(); ctx.arc(0, 0, 3.4 * cu, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${0.95 * fade})`; ctx.fill(); }
  ctx.restore();
}

// dedo: círculo de contacto proyectado sobre la pantalla
function dedo(ctx, t) {
  const fr = META.frames[clamp(Math.round(t), 196, 1470)];
  if (!fr || !fr.dedo || t < 196) return;
  const { x, y, a, p } = fr.dedo;
  const r = 0.22 * (p ? 0.92 : 1.05);
  const [lx, ly] = pageToLocal(x, y);
  const pts = Array.from({ length: 24 }, (_, i) => { const ang = (i / 24) * Math.PI * 2; return projLocal(lx + Math.cos(ang) * r, ly + Math.sin(ang) * r); });
  ctx.save(); ctx.scale(S, S);
  ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath();
  ctx.shadowColor = `rgba(0,0,0,${0.25 * a})`; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.fillStyle = `rgba(46,45,36,${0.26 * a})`; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

// end card: textos
function endCard(ctx, t) {
  if (t < 1520) return;
  ctx.save(); ctx.scale(S, S);
  ctx.textBaseline = 'alphabetic';
  const w1 = WORDS.L7.find((w) => w.w.toLowerCase().startsWith('así'));
  const f0 = (w1 ? w1.f : 1540) - 10;
  const words = 'Así se vería tu página · Elevate Negocios'.split(' ');
  let px = LAY.end.px;
  ctx.font = `600 ${px}px "DM Sans"`;
  let total = ctx.measureText(words.join(' ')).width;
  if (total > 940) { px = Math.floor((px * 940) / total); ctx.font = `600 ${px}px "DM Sans"`; total = ctx.measureText(words.join(' ')).width; }
  let x = DW / 2 - total / 2;
  const sp = ctx.measureText(' ').width;
  words.forEach((wd, i) => {
    const u = seg(t, f0 + i * 3, f0 + i * 3 + 16);
    const ww = ctx.measureText(wd).width;
    if (u > 0) { ctx.globalAlpha = eOutCubic(u); ctx.fillStyle = '#F5F1E6'; ctx.fillText(wd, x, LAY.end.y + (1 - eOutExpo(u)) * 18); }
    x += ww + sp;
  });
  const ul = eOutCubic(seg(t, 1560, 1584));
  if (ul > 0) {
    ctx.globalAlpha = ul * 0.78;
    ctx.font = `400 ${LAY.end.legalPx}px "DM Sans"`;
    const legal = 'Demo de cortesía de Elevate Negocios · pieza no oficial';
    const lw = ctx.measureText(legal).width;
    ctx.fillStyle = '#F5F1E6';
    ctx.fillText(legal, DW / 2 - lw / 2, LAY.end.legalY);
  }
  ctx.restore();
}

function capa2D(t) {
  octx.clearRect(0, 0, W, H);
  if (!M7) M7 = medidas7(octx);
  if (!ALC) ALC = alcances();
  barra(octx, t);
  tallo(octx, t);
  tipo(octx, t, TYPE.T1, LAY.t1);
  tipo(octx, t, TYPE.T2, LAY.t1);
  tipo(octx, t, TYPE.T4, LAY.t4);
  const t56 = LAY.t56;
  tipo(octx, t, TYPE.T5, t56.left ? { x: 60, y: t56.y1, px: t56.px } : { x: t56.cx, y: t56.y1, px: t56.px, center: true });
  tipo(octx, t, TYPE.T6, t56.left ? { x: 60, y: t56.y2, px: t56.px } : { x: t56.cx, y: t56.y2, px: t56.px, center: true });
  escritura(octx, t);
  flor(octx, t);
  dedo(octx, t);
  endCard(octx, t);
  ovTex.needsUpdate = true;
}

// fondo desenfocado para las reseñas de cristal: A sin ninguna reseña (para las laterales), B con las laterales (para la del frente)
async function fondoVidrio(f) {
  const st = estado(f);
  if (!RES.some((id) => st.pieces[id] && st.pieces[id].visible)) return;
  aplicar(st); await pantalla(st);
  const m = RES.map((id) => pieces[id].mesh), vis = m.map((x) => x.visible);
  const pasada = (dst) => {
    renderer.setRenderTarget(rtBack); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
    renderer.render(bgScene, quadCam); renderer.render(scene, camera);
    blurInto(rtBack, dst);
  };
  m.forEach((x) => { x.visible = false; });
  pasada(rtBlurA);
  m[0].visible = vis[0]; m[2].visible = vis[2];
  pasada(rtBlurB);
  m[1].visible = vis[1];
}

// ---------- render: 8 subcuadros (motion blur + antialias temporal + profundidad de campo en el push-in) ----------
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
window.renderFrame = async (f, { sub = 8, shutter = 1.0 } = {}) => {
  renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
  accScene.children[0].material.opacity = 1 / sub;
  bgMat.uniforms.uSeed.value = Math.floor(f) * 13.1;
  await fondoVidrio(f);
  for (let k = 0; k < sub; k++) {
    const t = f + ((k + 0.5) / sub - 0.5) * shutter;
    const st = estado(t);
    aplicar(st);
    await pantalla(st);
    capa2D(t);
    let jx = halton(k + 1, 2) - 0.5, jy = halton(k + 1, 3) - 0.5;
    if (st.dof > 0.01) {
      // apertura: la cámara se mueve en un disco y la vista se corrige para que la reseña 3 quede nítida
      const ang = k * 2.39996, rad = 0.075 * st.dof * Math.sqrt((k + 0.5) / sub);
      const ox = Math.cos(ang) * rad, oy = Math.sin(ang) * rad;
      const target = new THREE.Vector3(); pieces.resena3.mesh.getWorldPosition(target);
      const fd = camera.position.z - target.z;
      const pxPerUnit = (H / 2) / Math.tan((FOV / 2) * DEG) / fd;
      camera.position.x += ox; camera.position.y += oy; camera.updateMatrixWorld();
      jx -= ox * pxPerUnit; jy += oy * pxPerUnit;
    }
    camera.setViewOffset(W, H, jx, jy, W, H);
    renderer.setRenderTarget(rtSub); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
    renderer.render(bgScene, quadCam);
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

init().catch((e) => { window.initError = String((e && e.stack) || e); });
