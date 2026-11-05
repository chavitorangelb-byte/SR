// frame(t) determinista del video de Florería Roma: celular 3D de cristal con la interfaz real,
// piezas 3D, tallo, kinetic type y toques. t en cuadros de 60 fps (puede ser fraccionario).
import * as THREE from 'three';

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 540), H = +(Q.get('h') || 960);
const UI = Q.get('ui') || '/video/build/ui_dsf2';
const S = W / 1080; // px de diseño (1080 de ancho) → px del lienzo
const FPS = 60;
const DEG = Math.PI / 180;

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (f, a, b) => clamp((f - a) / (b - a));
const eOutCubic = (u) => 1 - Math.pow(1 - u, 3);
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
const srgb = (hex) => new THREE.Color(hex); // THREE.Color guarda lineal (gestión de color activa)

// ---------- mundo: 1 unidad = 100 px CSS de la pantalla ----------
const FOV = 22;
const DIST = 35.78;
const VIS_H = 2 * DIST * Math.tan((FOV / 2) * DEG);
const PXU = 1920 / VIS_H; // px de diseño por unidad
const PHONE_Y = 45 / PXU; // centro del celular en y 915 de 1920
const SCR = { w: 3.9, h: 8.8, r: 0.47 };
const BODY = { w: 4.14, h: 9.04, r: 0.58 };
const FRONT_Z = 0.21;
const SCR_Z = 0.206;
const STATUS = 47;

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

// ---------- fondo ----------
const bgMat = new THREE.ShaderMaterial({
  uniforms: { uAspect: { value: W / H }, uSeed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform float uAspect; uniform float uSeed; varying vec2 vUv;
    vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
    void main(){
      vec2 p = (vUv - vec2(0.5, 0.53)) * vec2(uAspect, 1.);
      float d = length(p);
      vec3 c = mix(lin(vec3(0.180, 0.188, 0.145)), lin(vec3(0.133, 0.137, 0.106)), smoothstep(0.0, 0.55, d));
      c = mix(c, lin(vec3(0.075, 0.078, 0.060)), smoothstep(0.42, 1.05, d));
      c *= 1.0 + (hash12(gl_FragCoord.xy + uSeed) - 0.5) * 0.04;
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const bgScene = quadScene(bgMat);

// ---------- escena 3D ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, W / H, 20, 60);
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

const phone = new THREE.Group();
scene.add(phone);

// sombra de caída detrás del celular
const softShadowMat = (opacity) => new THREE.ShaderMaterial({
  uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uR: { value: 0.2 }, uBlur: { value: 0.1 }, uOpacity: { value: opacity }, uColor: { value: new THREE.Vector3(0.004, 0.004, 0.003) } },
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + 'uniform vec2 uSize; uniform float uR; uniform float uBlur; uniform float uOpacity; uniform vec3 uColor; varying vec2 vP; void main(){ float d = sdRR(vP, uSize*0.5, uR); float a = 1. - smoothstep(-uBlur, uBlur, d); gl_FragColor = vec4(uColor, a*a*uOpacity); }',
  transparent: true, depthWrite: false,
});
const dropShadow = new THREE.Mesh(new THREE.PlaneGeometry(BODY.w + 4, BODY.h + 4), softShadowMat(0.5));
dropShadow.material.uniforms.uSize.value.set(BODY.w, BODY.h);
dropShadow.material.uniforms.uR.value = BODY.r;
dropShadow.material.uniforms.uBlur.value = 0.75;
dropShadow.position.set(0.32, -0.5, -0.9);
dropShadow.renderOrder = 0;
phone.add(dropShadow);

// pantalla: barra de estado + captura real de la página
const scrCanvas = document.createElement('canvas');
const scrCtx = scrCanvas.getContext('2d');
const scrTex = new THREE.CanvasTexture(scrCanvas);
scrTex.colorSpace = THREE.SRGBColorSpace;
scrTex.anisotropy = 4;
scrTex.generateMipmaps = true;
scrTex.minFilter = THREE.LinearMipmapLinearFilter;
const screenMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: scrTex }, uOn: { value: 0 }, uSize: { value: new THREE.Vector2(SCR.w, SCR.h) }, uR: { value: SCR.r } },
  vertexShader: 'varying vec2 vUv; varying vec3 vLP; void main(){ vUv = uv; vLP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: GLSL + /* glsl */`
    uniform sampler2D uTex; uniform float uOn; uniform vec2 uSize; uniform float uR;
    varying vec2 vUv; varying vec3 vLP;
    void main(){
      float d = sdRR(vLP.xy, uSize * 0.5, uR);
      float a = 1. - smoothstep(-0.006, 0.0, d);
      vec3 c = texture2D(uTex, vUv).rgb;
      vec3 off = vec3(0.004, 0.0045, 0.0035);
      c = mix(off, c, uOn);
      vec2 cam = vec2(0., uSize.y * 0.5 - 0.235);
      float hole = 1. - smoothstep(0.055, 0.062, length(vLP.xy - cam));
      c = mix(c, vec3(0.002), hole);
      gl_FragColor = vec4(c, a);
    }`,
  transparent: true,
});
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), screenMat);
screenMesh.position.z = SCR_Z;
screenMesh.renderOrder = 1;
phone.add(screenMesh);

// cuerpo de cristal: bisel, grosor, marco esmerilado con borde de 1 px y reflejos que se mueven con la cámara
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
      float ndv = clamp(dot(N, V), 0., 1.);
      float fres = pow(1. - ndv, 3.5);
      vec3 env = envColor(reflect(-V, N));
      float front = smoothstep(0.9, 0.995, normalize(vLN).z);
      float d = sdRR(vLP.xy, uScr * 0.5, uScrR);
      float inScr = 1. - smoothstep(-0.003, 0.003, d);
      float noise = (hash12(vLP.xy * 900.) - 0.5) * 0.02;
      vec3 frost = vec3(0.105, 0.11, 0.085) + noise;
      vec3 c = mix(frost, env, 0.22 + 0.75 * fres);
      float a = mix(0.5 + 0.45 * fres, mix(0.66, 0.0, inScr), front);
      // borde de 1 px en el límite pantalla/marco y en el contorno exterior
      float ring = (1. - smoothstep(0.0, 0.012, abs(d))) * front;
      float rim = (1. - smoothstep(0.0, 0.018, abs(sdRR(vLP.xy, uBody * 0.5 - 0.1, 0.48)))) * front;
      c += vec3(0.95, 0.94, 0.88) * (ring * 0.10 + rim * 0.75);
      a = max(a, max(ring * 0.25, rim * 0.85));
      c += env * fres * 1.1 * (1. - inScr * front);
      // reflejo del cristal sobre la pantalla: banda diagonal tenue que se desplaza con el giro
      float band = vLP.x * 0.55 + vLP.y * 0.32 + uGlare;
      float glare = exp(-pow(band / 0.55, 2.)) * 0.05 + exp(-pow((band - 1.25) / 0.22, 2.)) * 0.025;
      c = mix(c, vec3(1.), 0.);
      if (inScr * front > 0.5) { c = vec3(1.0, 0.99, 0.96); a = glare; }
      gl_FragColor = vec4(c, clamp(a, 0., 1.) * uOpacity);
    }`,
  transparent: true, depthWrite: false,
});
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.renderOrder = 5;
phone.add(bodyMesh);

// ---------- piezas 3D: la misma tarjeta de la interfaz con grosor y sombra ----------
const TRIO = ['rosas-rojas', 'caja-de-tulipanes', 'girasoles'];
const LIFT = {
  'rosas-rojas': { f0: 358, back: 424, dx: -0.12, dy: 0.24, z: 1.35, rx: -7, ry: 11, rz: -3, s: 1.06, ph: 0.0 },
  'caja-de-tulipanes': { f0: 364, back: 428, dx: 0.3, dy: 0.32, z: 0.95, rx: -5, ry: -9, rz: 2.5, s: 1.05, ph: 1.7 },
  girasoles: { f0: 370, back: 432, dx: -0.08, dy: -0.2, z: 1.7, rx: 6, ry: 7, rz: 2, s: 1.06, ph: 3.1 },
};
const cardShaderV = /* glsl */`
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){ vLP = position; vLN = normal; vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const cardShaderF = GLSL + /* glsl */`
  uniform sampler2D uTex; uniform vec2 uSize; uniform float uLift;
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLP; varying vec3 vLN;
  void main(){
    vec3 N = normalize(vWN);
    float face = step(0.9, normalize(vLN).z);
    vec2 uv = vec2((vLP.x + uSize.x * .5) / uSize.x, (vLP.y + uSize.y * .5) / uSize.y);
    vec3 tex = texture2D(uTex, uv).rgb;
    vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
    float ndl = clamp(dot(N, L), 0., 1.);
    vec3 V = normalize(cameraPosition - vWP);
    vec3 env = envColor(reflect(-V, N));
    vec3 lit = tex * (0.9 + 0.12 * ndl) + env * 0.03;
    vec3 side = vec3(0.86, 0.85, 0.81) * (0.45 + 0.55 * ndl) + env * 0.12;
    vec3 c = mix(side, mix(tex, lit, uLift), face);
    gl_FragColor = vec4(c, 1.);
  }`;
const cards = {};
const cardShadowGeo = new THREE.PlaneGeometry(1, 1);

// ---------- capa 2D (tallo, tipo, toques, barra de búsqueda) ----------
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
let META = null;
const uiCache = new Map();
async function uiImage(f) {
  const key = Math.round(f);
  if (uiCache.has(key)) return uiCache.get(key);
  const res = await fetch(`${UI}/f${String(key).padStart(4, '0')}.jpg`);
  const bmp = await createImageBitmap(await res.blob());
  uiCache.set(key, bmp);
  if (uiCache.size > 8) { const k0 = uiCache.keys().next().value; uiCache.get(k0).close(); uiCache.delete(k0); }
  return bmp;
}
async function init() {
  META = await (await fetch(`${UI}/meta.json`)).json();
  scrCanvas.width = Math.round(390 * META.dsf);
  scrCanvas.height = Math.round(880 * META.dsf);
  const loader = new THREE.TextureLoader();
  for (const id of TRIO) {
    const t = META.texturas[id];
    const tex = await loader.loadAsync(`${UI}/${t.file}`);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const w = t.rect.w / 100, h = t.rect.h / 100;
    const geo = new THREE.ExtrudeGeometry(rrShape(w - 0.02, h - 0.02, 0.21), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 16 });
    geo.translate(0, 0, -0.05);
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uTex: { value: tex }, uSize: { value: new THREE.Vector2(w, h) }, uLift: { value: 0 } }, vertexShader: cardShaderV, fragmentShader: cardShaderF }));
    mesh.renderOrder = 3;
    const sh = new THREE.Mesh(cardShadowGeo, softShadowMat(0.5));
    sh.material.uniforms.uSize.value.set(w, h);
    sh.material.uniforms.uR.value = 0.22;
    sh.renderOrder = 2;
    phone.add(mesh); phone.add(sh);
    const slot = new THREE.Vector3((t.rect.x + t.rect.w / 2 - 195) / 100, SCR.h / 2 - (STATUS + t.rect.y + t.rect.h / 2) / 100, SCR_Z + 0.0015);
    cards[id] = { mesh, sh, slot, w, h };
  }
  await document.fonts.load('600 52px "Playfair Display"');
  await document.fonts.load('500 52px "DM Sans"');
  await document.fonts.load('600 15px "DM Sans"');
  window.ready = true;
}

// ---------- coreografía: estado en el cuadro t ----------
const T1 = { texto: 'TUS RAMOS,', f: 298, sale: 440, x: 64, y: 905, px: 52 };

function estado(t) {
  const st = {};
  const vis = eOutCubic(seg(t, 186, 214));
  const settle = springF(t, 186, 120, 13);
  const tr = eInOutCubic(seg(t, 300, 334));
  st.phone = {
    vis,
    x: lerp(0, 170 / PXU, tr),
    y: PHONE_Y,
    s: lerp(0.965, 1, eOutCubic(seg(t, 186, 238))) * lerp(1, 62 / 65, tr),
    rx: lerp(4, 1, settle) * DEG,
    ry: (lerp(12, -3, settle) + lerp(0, -3, tr)) * DEG,
  };
  st.on = eOutCubic(seg(t, 196, 212));
  st.ui = clamp(Math.round(t), 196, 450);
  const orb = eInOutSine(seg(t, 388, 432)) - eInOutSine(seg(t, 436, 484));
  st.cam = { yaw: 6 * DEG * orb, push: 1 - 0.045 * orb };
  st.cards = {};
  for (const id of TRIO) {
    const L = LIFT[id];
    let up = t >= L.f0 ? springF(t, L.f0, 150, 17) : 0;
    if (t >= L.back) up = springF(L.back, L.f0, 150, 17) * (1 - eInOutCubic(seg(t, L.back, L.back + 16)));
    const visible = t >= 358 && t < 448;
    const hover = clamp(up);
    const ts = t / FPS;
    st.cards[id] = {
      visible, up,
      dx: L.dx * up + Math.sin(ts * 1.3 + L.ph) * 0.045 * hover,
      dy: L.dy * up + Math.cos(ts * 1.1 + L.ph) * 0.05 * hover,
      z: L.z * up,
      rx: (L.rx * up + Math.sin(ts * 0.9 + L.ph) * 1.5 * hover) * DEG,
      ry: (L.ry * up + Math.cos(ts * 0.8 + L.ph) * 2.0 * hover) * DEG,
      rz: L.rz * up * DEG,
      s: lerp(1, L.s, up),
    };
  }
  return st;
}

function aplicar(st) {
  const p = st.phone;
  phone.visible = p.vis > 0.001;
  phone.position.set(p.x, p.y, 0);
  phone.scale.setScalar(p.s);
  phone.rotation.set(p.rx, p.ry, 0, 'YXZ');
  bodyMat.uniforms.uOpacity.value = p.vis;
  bodyMat.uniforms.uGlare.value = -1.4 + (p.ry / DEG) * 0.12 + (st.cam.yaw / DEG) * 0.18 + p.x * 0.35;
  dropShadow.material.uniforms.uOpacity.value = 0.55 * p.vis;
  screenMat.uniforms.uOn.value = st.on * p.vis;
  const yAxis = new THREE.Vector3(0, 1, 0);
  const relCam = new THREE.Vector3(-p.x, 0, DIST * st.cam.push).applyAxisAngle(yAxis, st.cam.yaw);
  const relLook = new THREE.Vector3(-p.x, 0, 0).applyAxisAngle(yAxis, st.cam.yaw);
  camera.position.set(p.x + relCam.x, 0, relCam.z);
  camera.lookAt(p.x + relLook.x, 0, relLook.z);
  camera.updateMatrixWorld();
  for (const id of TRIO) {
    const c = cards[id], s = st.cards[id];
    c.mesh.visible = c.sh.visible = s.visible && p.vis > 0.001;
    if (!c.mesh.visible) continue;
    c.mesh.position.set(c.slot.x + s.dx, c.slot.y + s.dy, c.slot.z + s.z);
    c.mesh.rotation.set(s.rx, s.ry, s.rz);
    c.mesh.scale.set(s.s, s.s, lerp(0.15, 1, clamp(s.up * 3)));
    c.mesh.material.uniforms.uLift.value = clamp(s.up * 2);
    const hgt = Math.max(0, s.z);
    c.sh.position.set(c.slot.x + s.dx * 0.6 + 0.2 * hgt, c.slot.y + s.dy * 0.6 - 0.32 * hgt, SCR_Z + 0.0008);
    const blur = 0.03 + 0.2 * hgt;
    c.sh.scale.set(c.w * s.s + blur * 4, c.h * s.s + blur * 4, 1);
    c.sh.material.uniforms.uSize.value.set(c.w * s.s / (c.w * s.s + blur * 4), c.h * s.s / (c.h * s.s + blur * 4));
    c.sh.material.uniforms.uR.value = 0.22 / (c.w * s.s + blur * 4);
    c.sh.material.uniforms.uBlur.value = blur / (c.w * s.s + blur * 4);
    c.sh.material.uniforms.uOpacity.value = 0.5 * clamp(s.up * 4) * (1 - 0.25 * hgt);
  }
  phone.updateMatrixWorld(true);
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
async function pantalla(st) {
  if (st.on <= 0) return;
  const img = await uiImage(st.ui);
  const k = META.dsf;
  scrCtx.drawImage(img, 0, STATUS * k);
  barraEstado(scrCtx, k);
  scrCtx.fillStyle = 'rgba(46,45,36,0.82)';
  scrCtx.beginPath(); scrCtx.roundRect((195 - 67) * k, (880 - 13) * k, 134 * k, 5 * k, 2.5 * k); scrCtx.fill();
  scrTex.needsUpdate = true;
}

// ---------- proyección a la capa 2D ----------
const _v = new THREE.Vector3();
function proj(obj, x, y, z) { _v.set(x, y, z).applyMatrix4(obj.matrixWorld).project(camera); return [(_v.x + 1) / 2 * 1080, (1 - _v.y) / 2 * 1920]; }

// contorno del celular (local), por fuera del bisel, empezando a media altura del lado derecho y bajando
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
function slice(pts, a, b) {
  const L = cumLen(pts), out = [];
  const at = (s) => { let i = 1; while (i < L.length - 1 && L[i] < s) i++; const u = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], clamp(u)), lerp(pts[i - 1][1], pts[i][1], clamp(u))]; };
  a = clamp(a, 0, L[L.length - 1]); b = clamp(b, 0, L[L.length - 1]);
  if (b - a < 1) return [];
  out.push(at(a));
  for (let i = 0; i < pts.length; i++) if (L[i] > a && L[i] < b) out.push(pts[i]);
  out.push(at(b));
  return out;
}
const bez = (p0, p1, p2, p3, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, m = 1 - u; return [m * m * m * p0[0] + 3 * m * m * u * p1[0] + 3 * m * u * u * p2[0] + u * u * u * p3[0], m * m * m * p0[1] + 3 * m * m * u * p1[1] + 3 * m * u * u * p2[1] + u * u * u * p3[1]]; });

// guía del tallo en px de diseño: A (sube desde abajo) + B (escribe sobre la barra) + C (rizo) + D (contorno del celular)
function guia(t) {
  const A = bez([540, 2010], [610, 1560], [80, 1320], [150, 1000]);
  const B = Array.from({ length: 41 }, (_, i) => [lerp(150, 930, i / 40), 1000 + Math.sin(i * 0.9) * 5]);
  const D = OUTLINE.map(([x, y]) => proj(phone, x, y, FRONT_Z));
  const R = 40, cx = 930, cy = 1000 - R;
  const loop = Array.from({ length: 33 }, (_, i) => { const a = (i / 32) * Math.PI * 2; return [cx + R * Math.sin(a), cy + R * Math.cos(a)]; });
  const C = [...loop, ...bez([cx, cy + R], [cx + 150, cy + R], [D[0][0] + 10, D[0][1] - 170], D[0], 30).slice(1)];
  const parts = [A, B.slice(1), C.slice(1), densify(D, 10).slice(1)];
  const lens = parts.map((p, i) => cumLen(i ? [parts[i - 1][parts[i - 1].length - 1], ...p] : p).pop());
  return { pts: densify(parts.flat(), 8), lens };
}

function tallo(ctx, t) {
  const { pts, lens } = guia(t);
  const [lA, lB, lC, lD] = lens;
  const total = lA + lB + lC + lD;
  const head = lerp(lA + lB, total, eInOutCubic(seg(t, 148, 206)));
  const tailAB = lerp(0, lA + lB, eInOutCubic(seg(t, 144, 170)));
  const Lvis = lerp(1600, 560, eInOutCubic(seg(t, 192, 244)));
  const tail = Math.max(tailAB, head - Lvis);
  const p = slice(pts, tail, head);
  if (p.length < 2) return;
  // vaivén vivo
  const sw = p.map(([x, y], i) => { const u = i / (p.length - 1); return [x + noise1(t / 45 + i * 0.05) * 2.2 * u, y + noise1(t / 50 + i * 0.05 + 7) * 2.2 * u]; });
  dibujaTallo(ctx, sw, 6.2, 2.3);
}
function dibujaTallo(ctx, p, w0, w1) {
  const n = p.length;
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
  // yema en la punta
  const a = p[Math.max(0, n - 4)];
  const ang = Math.atan2(tip[1] - a[1], tip[0] - a[0]);
  ctx.translate(tip[0], tip[1]); ctx.rotate(ang);
  ctx.beginPath(); ctx.ellipse(2.5, 0, 4.2, 2.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#B4C07E'; ctx.fill();
  ctx.restore();
}

// barra de búsqueda de cristal (final del hook) que se comprime hacia la parte de arriba del celular
function barra(ctx, t) {
  if (t >= 196) return;
  const c = eInOutCubic(seg(t, 146, 182));
  const camPt = proj(phone, 0, SCR.h / 2 - 0.235, FRONT_Z);
  const cx = lerp(540, camPt[0], c), cy = lerp(960, camPt[1], c);
  const w = lerp(900, 64, c), h = lerp(128, 22, c);
  const alpha = 1 - seg(t, 178, 196);
  if (alpha <= 0) return;
  ctx.save();
  ctx.scale(S, S);
  ctx.globalAlpha = alpha;
  const x = cx - w / 2, y = cy - h / 2, r = h / 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(245,241,230,0.15)'); g.addColorStop(1, 'rgba(245,241,230,0.06)');
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30 * (1 - c); ctx.shadowOffsetY = 10 * (1 - c);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip(); ctx.globalAlpha = alpha * 0.02; ctx.fillStyle = ctx.createPattern(noiseCanvas, 'repeat'); ctx.fillRect(x, y, w, h); ctx.restore();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.2; ctx.strokeStyle = `rgba(245,241,230,${0.42 + 0.3 * c})`; ctx.stroke();
  const txt = 1 - eOutCubic(seg(t, 146, 156));
  if (txt > 0) {
    ctx.globalAlpha = alpha * txt;
    ctx.strokeStyle = '#F5F1E6'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x + 70, cy - 4, 15, 0, Math.PI * 2); ctx.moveTo(x + 81, cy + 7); ctx.lineTo(x + 92, cy + 18); ctx.stroke();
    ctx.fillStyle = '#F5F1E6'; ctx.font = '500 52px "DM Sans"'; ctx.textBaseline = 'middle';
    ctx.fillText('florería aguascalientes', x + 122, cy + 2);
    const press = 1 - 0.06 * Math.sin(Math.PI * seg(t, 144, 156));
    ctx.save(); ctx.translate(x + w - 66, cy); ctx.scale(press, press);
    ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fillStyle = 'rgba(245,241,230,0.18)'; ctx.fill();
    ctx.strokeStyle = '#F5F1E6'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(4, -10); ctx.lineTo(14, 0); ctx.lineTo(4, 10); ctx.stroke();
    ctx.restore();
    const rp = seg(t, 144, 172);
    if (rp > 0 && rp < 1) { ctx.globalAlpha = alpha * txt * (1 - rp) * 0.5; ctx.beginPath(); ctx.arc(x + w - 66, cy, 44 + rp * 60, 0, Math.PI * 2); ctx.strokeStyle = '#F5F1E6'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  ctx.restore();
}

// kinetic type: glifo por glifo, desde una máscara, aterriza el primer glifo en f + 14
function tipo(ctx, t, T) {
  if (t < T.f || t > T.sale + 24) return;
  ctx.save();
  ctx.scale(S, S);
  ctx.font = `600 ${T.px}px "Playfair Display"`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#F5F1E6';
  const chars = [...T.texto];
  let x = T.x, gi = 0;
  const em = T.px;
  ctx.beginPath(); ctx.rect(0, T.y - em * 1.05, 1080, em * 1.32); ctx.clip();
  for (const ch of chars) {
    const wch = ctx.measureText(ch).width + em * 0.02;
    if (ch !== ' ') {
      const fi = T.f + gi * 2;
      const u = seg(t, fi, fi + 14);
      const out = seg(t, T.sale + gi * 1, T.sale + gi * 1 + 14);
      const yIn = (1 - eOutExpo(u)) * em * 0.9;
      const yOut = -eInOutCubic(out) * em * 1.1;
      const a = eOutCubic(u) * (1 - eOutCubic(out));
      const blur = (1 - u) * 8 + out * 6;
      if (a > 0.003) {
        ctx.globalAlpha = a;
        ctx.filter = blur > 0.2 ? `blur(${(blur * S).toFixed(2)}px)` : 'none';
        ctx.fillText(ch, x, T.y + yIn + yOut);
      }
      gi++;
    }
    x += wch;
  }
  ctx.filter = 'none';
  ctx.restore();
}

// dedo: círculo de contacto proyectado sobre la pantalla
function dedo(ctx, t) {
  const fr = META.frames[clamp(Math.round(t), 196, 450)];
  if (!fr || !fr.dedo) return;
  const { x, y, a } = fr.dedo;
  const lx = (x - 195) / 100, ly = SCR.h / 2 - (STATUS + y) / 100;
  const pts = Array.from({ length: 24 }, (_, i) => { const ang = (i / 24) * Math.PI * 2; return proj(phone, lx + Math.cos(ang) * 0.22, ly + Math.sin(ang) * 0.22, FRONT_Z + 0.01); });
  ctx.save(); ctx.scale(S, S);
  ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath();
  ctx.shadowColor = `rgba(0,0,0,${0.25 * a})`; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.fillStyle = `rgba(46,45,36,${0.26 * a})`; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function capa2D(t) {
  octx.clearRect(0, 0, W, H);
  barra(octx, t);
  tallo(octx, t);
  tipo(octx, t, T1);
  dedo(octx, t);
  ovTex.needsUpdate = true;
}

// ---------- render de un cuadro con 8 subcuadros (motion blur + antialias temporal) ----------
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
window.renderFrame = async (f, { sub = 8, shutter = 1.0 } = {}) => {
  renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
  accScene.children[0].material.opacity = 1 / sub;
  bgMat.uniforms.uSeed.value = Math.floor(f) * 13.1;
  for (let k = 0; k < sub; k++) {
    const t = f + ((k + 0.5) / sub - 0.5) * shutter;
    const st = estado(t);
    aplicar(st);
    await pantalla(st);
    capa2D(t);
    camera.setViewOffset(W, H, halton(k + 1, 2) - 0.5, halton(k + 1, 3) - 0.5, W, H);
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

init().catch((e) => { window.initError = String(e && e.stack || e); });
