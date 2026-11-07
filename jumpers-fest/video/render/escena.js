// frame(t) determinista del video de Jumpers Fest (60 fps): celular 3D de cristal con la página real capturada,
// tarjetas que se inflan y salen al espacio 3D, tubo de aire 2D y kinetic type que se infla.
// t en cuadros de 60 fps (puede ser fraccionario). Formato 9:16 (1080 × 1920 de diseño).
import * as THREE from 'three';

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 540), H = +(Q.get('h') || 960);
const UI = Q.get('ui') || '/build/ui_video';
const TEX = Q.get('tex') || '/review/fase0/texturas_3x';
const DW = 1080, DH = 1920, S = W / DW;
const FPS = 60, DEG = Math.PI / 180;

const TL = await (await fetch('/brief/timeline.json')).json();
const META = await (await fetch(`${UI}/meta.json`)).json();

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (f, a, b) => clamp((f - a) / (b - a));
const eOutCubic = (u) => 1 - Math.pow(1 - u, 3);
const eInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eInCubic = (u) => u * u * u;
function spring(ts, k = 170, c = 18) {
  if (ts <= 0) return 0;
  const w0 = Math.sqrt(k), z = c / (2 * Math.sqrt(k));
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * ts) * (Math.cos(wd * ts) + (z * w0 / wd) * Math.sin(wd * ts)); }
  return 1 - Math.exp(-w0 * ts) * (1 + w0 * ts);
}
const springF = (f, f0, k, c) => spring((f - f0) / FPS, k, c);
// "se infla": respuesta a un impulso (sube ~7 %, baja un poco y se asienta)
const puff = (f, f0, A = 0.12, w = 14, z = 0.35) => { const ts = (f - f0) / FPS; if (ts <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return A * Math.exp(-z * w * ts) * Math.sin(wd * ts); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }

// ---------- mundo: 1 unidad = 100 px CSS de la pantalla ----------
const FOV = 22;
const STATUS = 47, VIEW_H = 844;
const SCR = { w: 3.90, h: (STATUS + VIEW_H) / 100, r: 0.50 };
const BODY = { w: 4.32, h: 9.33, r: 0.70, d: 0.30 };
const PXU = 1152 / BODY.h; // el celular mide 1152 px de alto (60 %): 1.236 px de video por px CSS
const VIS_H = DH / PXU;
const DIST = VIS_H / (2 * Math.tan((FOV / 2) * DEG));
const FRONT_Z = BODY.d / 2;
const SCR_Z = FRONT_Z - 0.006;
const pageToLocal = (x, y) => [(x - 195) / 100, SCR.h / 2 - (STATUS + y) / 100];

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
// fondo desenfocado para la refracción del cristal (σ ≈ 32 px en el cuadro de 1080)
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
// estudio claro: cielo blanco cálido, una caja de luz arriba a la izquierda y un contorno neutro a la derecha
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

const phone = new THREE.Group();
phone.rotation.order = 'YXZ';
scene.add(phone);
const dropShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.2));
dropShadow.position.set(0.36, -0.62, -1.0);
dropShadow.renderOrder = 0;
setSoftShadow(dropShadow, BODY.w, BODY.h, BODY.r, 0.8, 0.28);
phone.add(dropShadow);

// pantalla: la captura de la página (dos cuadros mezclados para los subcuadros) + barra de estado genérica
const statusCanvas = document.createElement('canvas');
statusCanvas.width = 1170; statusCanvas.height = STATUS * 3;
{
  const c = statusCanvas.getContext('2d');
  c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, 1170, STATUS * 3);
  c.fillStyle = '#1B1B1B';
  c.font = '600 45px "DM Sans"'; c.textBaseline = 'middle';
  c.fillText('12:00', 84, 80);
  // señal, wifi y batería (íconos genéricos)
  for (let i = 0; i < 4; i++) { const h = 14 + i * 7; c.fillRect(850 + i * 15, 92 - h, 10, h); }
  c.lineWidth = 6; c.strokeStyle = '#1B1B1B'; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(948, 96, 10 + i * 11, -Math.PI * 0.78, -Math.PI * 0.22); c.stroke(); }
  c.lineWidth = 4; c.beginPath(); c.roundRect(992, 64, 66, 32, 9); c.stroke();
  c.fillRect(1061, 74, 5, 12); c.beginPath(); c.roundRect(998, 70, 46, 20, 5); c.fill();
}
const statusTex = new THREE.CanvasTexture(statusCanvas);
statusTex.colorSpace = THREE.SRGBColorSpace;
const screenMat = new THREE.ShaderMaterial({
  uniforms: { uOp: { value: 1 }, uA: { value: null }, uB: { value: null }, uMix: { value: 0 }, uStatus: { value: statusTex }, uOn: { value: 0 }, uSize: { value: new THREE.Vector2(SCR.w, SCR.h) }, uR: { value: SCR.r }, uSt: { value: STATUS / (STATUS + VIEW_H) } },
  vertexShader: 'varying vec2 vUv; varying vec3 vLP; void main(){ vUv = uv; vLP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform float uOp; uniform sampler2D uA; uniform sampler2D uB; uniform float uMix; uniform sampler2D uStatus; uniform float uOn; uniform vec2 uSize; uniform float uR; uniform float uSt;
    varying vec2 vUv; varying vec3 vLP;
    void main(){
      float d = sdRR(vLP.xy, uSize * 0.5, uR);
      float a = 1. - smoothstep(-0.006, 0.0, d);
      vec3 c;
      if (vUv.y > 1. - uSt) c = texture2D(uStatus, vec2(vUv.x, (vUv.y - (1. - uSt)) / uSt)).rgb;
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

// cuerpo de cristal: bisel, grueso, refracción del fondo y reflejo que se mueve con la cámara
const B = 0.08;
const bodyGeo = new THREE.ExtrudeGeometry(rrShape(BODY.w - 2 * B, BODY.h - 2 * B, BODY.r - B), { depth: BODY.d - 2 * B, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 10, curveSegments: 48 });
bodyGeo.translate(0, 0, -(BODY.d - 2 * B) / 2);
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
      // refracción: el fondo desenfocado, desplazado por la normal; tinte de cristal muy leve
      vec2 suv = gl_FragCoord.xy / uRes + N.xy * (0.045 - 0.03 * front);
      vec3 bg = texture2D(uBack, suv).rgb;
      vec3 glass = bg * lin(vec3(0.95, 0.972, 0.98));
      vec3 env = envLight(reflect(-V, N));
      vec3 c = mix(glass, env, 0.08 + 0.72 * fres);
      // canto: línea oscura fina por reflexión interna, para que el cristal se lea sobre el fondo claro
      float side = 1. - front;
      c = mix(c, lin(vec3(0.36, 0.39, 0.41)), side * (1. - smoothstep(0.05, 0.6, ndv)) * 0.7);
      float a = mix(0.9, 0.0, inScr * front);
      // brillo del bisel en el contorno del frente y anillo fino alrededor de la pantalla
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

// ---------- piezas 3D: la misma pieza de la interfaz con grueso de vinil y sombra ----------
const pieceF = GLSL + /* glsl */`
  uniform mat4 modelMatrix;
  uniform sampler2D uTex; uniform vec2 uSize; uniform float uR; uniform float uLift; uniform float uOpacity; uniform vec4 uClip; uniform float uClipAmt;
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){
    float face = step(0.9, normalize(vLN).z);
    vec2 uv = vec2((vLP.x + uSize.x * .5) / uSize.x, (vLP.y + uSize.y * .5) / uSize.y);
    vec3 tex = texture2D(uTex, uv).rgb;
    // cojín: la cara se curva un poco cerca del borde (normal inclinada), sin tocar la interfaz del centro
    float dE = sdRR(vLP.xy, uSize * 0.5, uR);
    float rimW = 0.22;
    float k = smoothstep(-rimW, 0., dE);
    vec2 hb = uSize * 0.5; float e = 0.01;
    vec2 g = vec2(sdRR(vLP.xy + vec2(e, 0.), hb, uR) - sdRR(vLP.xy - vec2(e, 0.), hb, uR), sdRR(vLP.xy + vec2(0., e), hb, uR) - sdRR(vLP.xy - vec2(0., e), hb, uR));
    g = length(g) > 1e-6 ? normalize(g) : vec2(0.);
    vec3 Nl = normalize(mix(vec3(0., 0., 1.), vec3(g * 0.55, 0.84), k * uLift));
    vec3 N = normalize(mix(normalize(vWN), normalize(mat3(modelMatrix) * Nl), face));
    vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
    vec3 V = normalize(cameraPosition - vWP);
    float ndl = clamp(dot(N, L), 0., 1.);
    vec3 Hh = normalize(L + V);
    float spec = pow(clamp(dot(N, Hh), 0., 1.), 60.) * 0.35 + pow(clamp(dot(N, Hh), 0., 1.), 12.) * 0.06;
    vec3 env = envLight(reflect(-V, N));
    float fres = pow(1. - clamp(dot(N, V), 0., 1.), 3.);
    vec3 lit = tex * (0.93 + 0.09 * ndl) + vec3(spec) * uLift + env * fres * 0.10 * uLift;
    vec3 side = lin(vec3(0.97, 0.965, 0.955)) * (0.62 + 0.38 * ndl) + env * 0.18 + vec3(spec) * 0.6;
    vec3 c = mix(side, lit, face);
    // recorte a la pantalla mientras la tarjeta todavía está "dentro" del cristal
    vec2 p = vLP.xy;
    float inside = step(uClip.x, p.x) * step(p.x, uClip.z) * step(uClip.y, p.y) * step(p.y, uClip.w);
    float a = mix(1., inside, uClipAmt);
    gl_FragColor = vec4(c, a * uOpacity);
  }`;
const pieceV = /* glsl */`
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){ vLP = position; vLN = normal; vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const pieces = {};
const texLoader = new THREE.TextureLoader();
function makePiece(id, url, rect, radioCss) {
  const w = rect.w / 100, h = rect.h / 100, r = radioCss / 100;
  const bv = 0.025;
  const geo = new THREE.ExtrudeGeometry(rrShape(w - 2 * bv, h - 2 * bv, r - bv), { depth: 0.08 - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 5, curveSegments: 24 });
  geo.translate(0, 0, -0.08 + bv);
  const tex = texLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uSize: { value: new THREE.Vector2(w, h) }, uR: { value: r }, uLift: { value: 0 }, uOpacity: { value: 1 }, uClip: { value: new THREE.Vector4(-99, -99, 99, 99) }, uClipAmt: { value: 0 } },
    vertexShader: pieceV, fragmentShader: pieceF, transparent: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.order = 'YXZ';
  mesh.renderOrder = 3;
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softShadowMat(0.3));
  sh.renderOrder = 2;
  phone.add(mesh); phone.add(sh);
  const [cx, cy] = pageToLocal(rect.x + rect.w / 2, rect.y + rect.h / 2);
  pieces[id] = { mesh, sh, w, h, r, cx, cy, tex };
  return pieces[id];
}

// Coreografía de las tres tarjetas (cuadros de brief/linea.mjs): salen en fila y flotan a tres profundidades.
// Escalera: cada tarjeta queda un poco más al frente y más abajo que la anterior, así se ven las tres fotos.
const TARJETAS = [
  { id: 'castle-jump', sale: 354, vuelve: 454, to: [-0.18, 2.35, 1.15], rot: [-5, 8, -3] },
  { id: 'rainbow-jump', sale: 370, vuelve: 462, to: [0.04, 0.05, 1.85], rot: [-4, 6, -1] },
  { id: 'magic-jump', sale: 386, vuelve: 446, to: [0.26, -2.25, 2.55], rot: [-3, 4, 1.5] },
];
for (const c of TARJETAS) makePiece(c.id, `${TEX}/tarjeta_${c.id}.png`, META.rects[c.id], 30);
// zona visible de la página bajo la barra superior (px CSS del viewport)
const CLIP_PAGE = { x0: 0, y0: 64, x1: 390, y1: VIEW_H };

// ---------- capa 2D (tubo, kinetic type, dedo) ----------
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

// ---------- estado en el tiempo t ----------
function estado(t) {
  const st = {};
  // el celular se materializa (f186–f226) con resorte de 8 % y se asienta en −3° / 1°
  const sp = springF(t, 186, 210, 15.5);
  st.op = eOutCubic(seg(t, 186, 202));
  st.scale = lerp(0.92, 1, sp);
  st.ry = lerp(10, -3, sp);
  st.rx = lerp(4, 1, sp);
  st.rz = 0;
  st.cx = 540; st.cy = 915;
  // truck a la derecha para dejar espacio al texto (f257–f281)
  const tr = eInOutCubic(seg(t, 257, 281));
  st.cx += 250 * tr; st.ry += -5 * tr;
  // dolly hacia atrás (60 % → 54 %) y órbita de 5° mientras flotan las tarjetas; regresa en f450–f478
  const dl = eInOutCubic(seg(t, 330, 368)) - eInOutCubic(seg(t, 450, 478));
  st.dolly = lerp(1, 0.82, dl);
  st.ry += 5 * dl;
  // respiración mínima del celular
  st.cy += Math.sin((t / FPS) * 1.3) * 2.5 * st.op;
  st.on = seg(t, F_ON, F_ON + 6);
  st.glare = -st.ry * DEG * 1.6 + (st.cx - 540) / 600;
  // tarjetas
  st.cards = TARJETAS.map((c) => {
    const up = springF(t, c.sale, 90, 14);
    const down = springF(t, c.vuelve, 190, 19);
    const u = Math.max(0, up - down);
    const out = t >= c.sale && t < c.vuelve + 18;
    const flot = clamp((t - c.sale - 30) / 30) * (1 - seg(t, c.vuelve - 8, c.vuelve));
    const ph = TARJETAS.indexOf(c) * 2.1;
    return {
      id: c.id, out, u,
      lift: clamp(Math.max(up, 0) - down, 0, 1),
      tx: c.to[0], ty: c.to[1],
      fx: Math.sin((t / FPS) * 1.6 + ph) * 0.03 * flot,
      fy: Math.sin((t / FPS) * 1.9 + ph) * 0.05 * flot,
      z: c.to[2] * u,
      rx: c.rot[0] * u + Math.sin((t / FPS) * 1.4 + ph) * 1.5 * flot, ry: c.rot[1] * u, rz: c.rot[2] * u + Math.sin((t / FPS) * 1.2 + ph) * 1.2 * flot,
      s: 1 + puff(t, c.sale, 0.085) + puff(t, c.vuelve + 12, 0.05),
      clip: 1 - clamp((up - 0.06) / 0.3),
    };
  });
  return st;
}

function aplicar(st) {
  camera.position.set(0, 0, DIST / st.dolly);
  camera.updateMatrixWorld();
  phone.position.set((st.cx - 540) / PXU, (960 - st.cy) / PXU, 0);
  phone.rotation.set(st.rx * DEG, st.ry * DEG, st.rz * DEG);
  phone.scale.setScalar(st.scale);
  phone.visible = st.op > 0.001;
  bodyMat.uniforms.uOpacity.value = st.op;
  bodyMat.uniforms.uGlare.value = st.glare;
  screenMat.uniforms.uOn.value = st.on;
  dropShadow.material.uniforms.uOpacity.value = 0.28 * st.op;
  screenMat.uniforms.uOp.value = st.op;
  for (const c of st.cards) {
    const p = pieces[c.id];
    p.mesh.visible = c.out; p.sh.visible = c.out;
    if (!c.out) continue;
    // de su lugar en la pantalla al punto de flote (coordenadas locales del celular)
    const px = lerp(p.cx, c.tx, c.u) + c.fx, py = lerp(p.cy, c.ty, c.u) + c.fy;
    p.mesh.position.set(px, py, SCR_Z + 0.001 + c.z);
    p.mesh.rotation.set(c.rx * DEG, c.ry * DEG, c.rz * DEG);
    p.mesh.scale.setScalar(c.s);
    const m = p.mesh.material.uniforms;
    m.uLift.value = clamp(c.lift);
    m.uClipAmt.value = c.clip;
    const [ax, ay] = pageToLocal(CLIP_PAGE.x0, CLIP_PAGE.y1), [bx, by] = pageToLocal(CLIP_PAGE.x1, CLIP_PAGE.y0);
    m.uClip.value.set(ax - p.cx, ay - p.cy, bx - p.cx, by - p.cy);
    // sombra sobre la pantalla: más grande, suave y corrida cuanto más alto flota
    const hgt = Math.max(0, c.z);
    p.sh.position.set(px + hgt * 0.22, py - hgt * 0.32, SCR_Z + 0.002);
    p.sh.rotation.set(0, 0, c.rz * DEG);
    setSoftShadow(p.sh, p.w * c.s, p.h * c.s, p.r, 0.06 + hgt * 0.16, 0.34 * clamp(c.lift * 1.5) * (1 - hgt * 0.12));
  }
}

async function pantalla(t) {
  if (t < F_ON) { screenMat.uniforms.uA.value = screenMat.uniforms.uB.value = (await capTex(F_ON)); screenMat.uniforms.uMix.value = 0; return; }
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

// ---------- tubo ----------
// contorno del celular (rectángulo redondeado), de arriba al centro en sentido horario
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
const CONTORNO = contorno(240);
// reposo: enrollado junto a la esquina inferior izquierda, por fuera del celular
const REPOSO_CTRL = [[-1.62, -4.92], [-2.02, -4.80], [-2.34, -4.98], [-2.70, -5.55], [-3.30, -6.20], [-4.40, -6.70], [-6.20, -7.00], [-9.00, -7.20]];
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
const REPOSO = catmull(REPOSO_CTRL, 48);
function tubo(t) {
  // f186–f226: el contorno completo se recoge hacia la esquina inferior izquierda; f226–f250: se suelta y se enrolla
  const recoge = eInOutCubic(seg(t, 186, 226));
  const suelta = eInOutCubic(seg(t, 222, 250));
  const s0 = lerp(0, 0.600, recoge), s1 = lerp(1, 0.735, recoge);
  const N = 48;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const s = lerp(s0, s1, i / (N - 1));
    const k = s * (CONTORNO.length - 1), k0 = Math.floor(k), fr = k - k0;
    const a = CONTORNO[k0], b = CONTORNO[Math.min(CONTORNO.length - 1, k0 + 1)];
    const cpt = [lerp(a[0], b[0], fr), lerp(a[1], b[1], fr)];
    const r = REPOSO[i];
    const bre = Math.sin((t / FPS) * 2.2 + i * 0.18) * 0.015 * suelta;
    pts.push([lerp(cpt[0], r[0], suelta) + bre, lerp(cpt[1], r[1], suelta) + bre]);
  }
  const ancho = lerp(40, 26, recoge);
  return { pts: pts.map(([x, y]) => proyecta(x, y)), ancho, op: 1 };
}
function dibujaTubo(tb) {
  const c = octx;
  const P = tb.pts.map(([x, y]) => [x * S, y * S]);
  const w = tb.ancho * S;
  const path = () => { c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length - 1; i++) { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2; c.quadraticCurveTo(P[i][0], P[i][1], mx, my); } c.lineTo(P[P.length - 1][0], P[P.length - 1][1]); };
  c.save();
  c.globalAlpha = tb.op;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.shadowColor = 'rgba(27,27,27,0.20)'; c.shadowBlur = 16 * S; c.shadowOffsetY = 9 * S; c.shadowOffsetX = 3 * S;
  path(); c.strokeStyle = '#D8D3CB'; c.lineWidth = w; c.stroke();
  c.shadowColor = 'transparent';
  // volumen de tubo: del canto (gris cálido) al centro (blanco)
  [['#E7E3DD', 0.86], ['#F1EEEA', 0.70], ['#F8F7F4', 0.52], ['#FFFFFF', 0.34]].forEach(([col, k]) => { path(); c.strokeStyle = col; c.lineWidth = w * k; c.stroke(); });
  // brillo de vinil arriba a la izquierda y costura central punteada
  c.save(); c.translate(-0.12 * w, -0.17 * w); path(); c.strokeStyle = 'rgba(255,255,255,0.98)'; c.lineWidth = w * 0.16; c.stroke(); c.restore();
  path(); c.setLineDash([5 * S, 6 * S]); c.strokeStyle = 'rgba(27,27,27,0.13)'; c.lineWidth = 1.6 * S; c.stroke(); c.setLineDash([]);
  c.restore();
}

// ---------- kinetic type ----------
const LINEAS = { 1: 860, 2: 948, 3: 1036 };
const PALABRAS = TL.tipo.map((k) => ({ ...k, linea: +((k.pos.match(/línea (\d)/) || [0, 1])[1]), lado: k.pos.startsWith('derecha') ? 'der' : 'izq' }));
function layoutPalabras() {
  // x de cada palabra: misma línea y mismo grupo de salida → una después de otra
  octx.font = `600 ${88 * S}px Fredoka`;
  for (const k of PALABRAS) {
    const prev = PALABRAS.filter((o) => o !== k && o.sale === k.sale && o.linea === k.linea && o.lado === k.lado && o.aterriza < k.aterriza);
    octx.font = `600 ${k.px * S}px Fredoka`;
    const sp = octx.measureText(' ').width / S;
    let x = k.lado === 'izq' ? 64 : 612;
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
    // máscara de la línea: los glifos suben desde abajo
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
      c.fillStyle = '#1B1B1B';
      if (ch === '+') {
        // el “+” es un cojín rosa, como en la página
        const r = em * 0.36;
        c.fillStyle = '#F3C7CF'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#1B1B1B'; c.fillRect(-r * 0.48, -r * 0.11, r * 0.96, r * 0.22); c.fillRect(-r * 0.11, -r * 0.48, r * 0.22, r * 0.96);
      } else {
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillText(ch, 0, em * 0.35);
      }
      c.restore();
    });
    c.restore();
  }
}

// ---------- dedo (contacto de 44 px CSS) ----------
function dibujaDedo(t) {
  const f = Math.round(t);
  const d = META.frames[f]?.dedo;
  if (!d || d.a <= 0.01) return;
  const [lx, ly] = pageToLocal(d.x, d.y);
  const [px, py] = proyecta(lx, ly, SCR_Z);
  const [qx] = proyecta(lx + 0.22, ly, SCR_Z);
  const r = Math.abs(qx - px) * S * (d.p ? 0.92 : 1);
  octx.save();
  octx.globalAlpha = d.a;
  octx.fillStyle = 'rgba(27,27,27,0.18)';
  octx.beginPath(); octx.arc(px * S, py * S, r, 0, Math.PI * 2); octx.fill();
  octx.lineWidth = 2.5 * S; octx.strokeStyle = 'rgba(255,255,255,0.95)'; octx.stroke();
  octx.restore();
}

function capa2D(t) {
  octx.clearRect(0, 0, W, H);
  dibujaTubo(tubo(t));
  dibujaTipo(t);
  dibujaDedo(t);
  ovTex.needsUpdate = true;
}

// ---------- render de un cuadro con supermuestreo temporal ----------
window.renderFrame = async (f, { sub = 8, shutter = 1.0 } = {}) => {
  renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
  accScene.children[0].material.opacity = 1 / sub;
  bgMat.uniforms.uSeed.value = Math.floor(f) * 13.1;
  renderer.setRenderTarget(rtBack); renderer.clear(); renderer.render(bgScene, quadCam);
  blurInto(rtBack, rtBlur);
  for (let k = 0; k < sub; k++) {
    const t = f + ((k + 0.5) / sub - 0.5) * shutter;
    const st = estado(t);
    aplicar(st);
    await pantalla(t);
    capa2D(t);
    const jx = halton(k + 1, 2) - 0.5, jy = halton(k + 1, 3) - 0.5;
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

try {
  await document.fonts.load(`600 ${88 * S}px Fredoka`);
  await document.fonts.load('600 45px "DM Sans"');
  layoutPalabras();
  // la barra de estado usa DM Sans: se redibuja con la fuente ya cargada
  {
    const c = statusCanvas.getContext('2d');
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, 400, STATUS * 3);
    c.fillStyle = '#1B1B1B'; c.font = '600 45px "DM Sans"'; c.textBaseline = 'middle'; c.fillText('12:00', 84, 80);
    statusTex.needsUpdate = true;
  }
  await capTex(F_ON);
  await Promise.all(Object.values(pieces).map((p) => new Promise((r) => { if (p.tex.image) r(); else p.tex.onUpdate = r; setTimeout(r, 3000); })));
  window.ready = true;
} catch (e) {
  window.initError = String(e.stack || e);
}
