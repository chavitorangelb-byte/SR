// Escena del video: función determinista por cuadro + acumulación de subcuadros (motion blur y antialias).
// Espacio de diseño: cuadro de 1080 x 1920 (en z = 0 una unidad = 1 px de diseño, y hacia arriba, origen al centro).
// Por ahora cubre el tramo de la prueba de estilo (f190–f490); la fase 5 suma el resto de la línea de tiempo.
import * as THREE from 'three';
import * as U from './util.js';
import { crearFondo, crearEntorno } from './fondo.js';
import { crearTelefono, dibujarSistema, CSS } from './telefono.js';
import { crearBetun, caminoRect } from './betun.js';
import { crearPalabra, animarPalabra } from './texto.js';
import { crearTarjeta3D } from './tarjeta.js';

const D = 3600;
const GRADOS = Math.PI / 180;
let R, escena, cam, fondo, tel, W, H, MED, rtSub, rtAcc, qEscena, qCam, quad, matAcum, matSalida;
const cache = new Map();
let compuesto = '';
const tarjetas = [];
const palabras = [];
let contorno = null, subrayado = null;

async function captura(fc) {
  const f = Math.max(MED.desde, Math.min(MED.hasta, fc));
  if (!cache.has(f)) {
    const r = await fetch(`/video/build/pantalla/f${String(f).padStart(4, '0')}.png`);
    cache.set(f, await createImageBitmap(await r.blob()));
    for (const k of [...cache.keys()]) if (k < f - 3) { cache.get(k).close(); cache.delete(k); }
  }
  return cache.get(f);
}
const med = (fc) => MED.cuadros[Math.max(MED.desde, Math.min(MED.hasta, fc))];

// ------------------------------------------------------------------ montaje
export async function preparar({ ancho, alto, medidas }) {
  W = ancho; H = alto; MED = medidas;
  R = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
  R.setPixelRatio(1);
  R.setSize(W, H);
  R.autoClear = false;
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.NoToneMapping;
  document.body.appendChild(R.domElement);

  escena = new THREE.Scene();
  escena.environment = crearEntorno(R);
  escena.environmentIntensity = 1.0;
  cam = new THREE.PerspectiveCamera(2 * Math.atan(960 / D) / GRADOS, 1080 / 1920, 10, 20000);
  cam.position.set(0, 0, D);

  fondo = crearFondo();
  const zF = -2500, hF = 2 * (D - zF) * (960 / D);
  fondo.scale.set(hF * 0.5625 * 1.15, hF * 1.15, 1);
  fondo.position.z = zF;
  escena.add(fondo);

  escena.add(new THREE.HemisphereLight('#fff4ee', '#3a2027', 1.1));
  const llave = new THREE.DirectionalLight('#fff1e6', 1.8);
  llave.position.set(-0.55, 0.8, 0.65);
  escena.add(llave);

  tel = crearTelefono();
  escena.add(tel.grupo);

  // Betún: contorno del celular (llegada) y subrayado de «5.0 en Google».
  contorno = crearBetun({ puntos: caminoRect(0, 0, tel.Wb + 22, tel.Hb + 22, tel.rb + 11), ancho: 7, nombre: 'contorno' });
  contorno.grupo.position.z = tel.T / 2 + 7;
  tel.grupo.add(contorno.grupo);
  const chip = med(236).chip;
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    pts.push(tel.local(chip[0] + 6 + t * (chip[2] - 12), chip[1] + chip[3] + 7 + 1.4 * Math.sin(t * Math.PI * 2.3)));
  }
  subrayado = crearBetun({ puntos: pts, ancho: 6, nombre: 'subrayado-chip' });
  tel.capa.add(subrayado.grupo);

  // Tarjetas que salen al 3D (Galletas: frasco, caja y chispas), con su borde de conchitas de betún.
  for (const { k, b, l } of CASCADA) {
    const rect = med(l).tarjetas[k];
    const t3d = crearTarjeta3D({ imagen: await captura(l), rect, k: tel.k });
    tel.grupo.add(t3d.grupo);
    tel.capa.add(t3d.sombra);
    const borde = crearBetun({ puntos: caminoRect(0, 0, t3d.W + 6 * tel.k, t3d.H + 6 * tel.k, 25 * tel.k), ancho: 8.5, conchas: true, nombre: `borde-${k}` });
    borde.grupo.position.z = 1.2;
    t3d.grupo.add(borde.grupo);
    tarjetas.push({ k, b, l, t3d, borde });
  }

  // Kinetic type del catálogo (K1).
  for (const [texto, y, fE] of [['RECIÉN', 830, 478], ['HORNEADAS', 910, 514]]) {
    const p = crearPalabra({ texto, x: 688, y, px: 60 });
    escena.add(p.grupo);
    palabras.push({ p, fE, fS: 566 });
  }

  // Acumulación: cada subcuadro se pinta en rtSub (MSAA x4, lineal, media precisión) y se suma en rtAcc.
  rtSub = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, colorSpace: THREE.LinearSRGBColorSpace });
  rtAcc = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, colorSpace: THREE.LinearSRGBColorSpace });
  qEscena = new THREE.Scene();
  qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const vq = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  matAcum = new THREE.ShaderMaterial({
    uniforms: { t: { value: null }, peso: { value: 1 } }, vertexShader: vq,
    fragmentShader: /* glsl */`uniform sampler2D t; uniform float peso; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv) * peso; }`,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  matSalida = new THREE.ShaderMaterial({
    uniforms: { t: { value: rtAcc.texture }, semilla: { value: 0 } }, vertexShader: vq, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */`uniform sampler2D t; uniform float semilla; varying vec2 vUv;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + semilla) * 43758.5453); }
      vec3 aSRGB(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main(){ vec3 c = aSRGB(texture2D(t, vUv).rgb); c += (rnd(gl_FragCoord.xy) - 0.5) / 255.0; gl_FragColor = vec4(c, 1.0); }`,
  });
  quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matAcum);
  quad.frustumCulled = false;
  qEscena.add(quad);
  return { listo: true };
}

// ------------------------------------------------------------------ estado por cuadro (f a 60 fps, puede ser fraccionario)
// Cada tarjeta: el betún pipea su borde (t.b → t.b+30); despega en t.l (18 cuadros), flota y regresa
// en t.l+40 → t.l+58 (cascada hacia la derecha, con poco encime). Las tres despegan con la cuadrícula ya quieta.
const CASCADA = [{ k: 0, b: 336, l: 392 }, { k: 1, b: 376, l: 416 }, { k: 2, b: 404, l: 444 }];
function despegue(f, t) {
  const sube = U.easeOutBack(U.tramo(f, t.l, t.l + 18), 1.25);
  const baja = U.easeInOutCubic(U.tramo(f, t.l + 40, t.l + 58));
  return sube * (1 - baja);
}
const RUMBO = [ // hacia dónde flota cada tarjeta (px locales), y su giro
  { dx: 56, dy: 52, ry: 7, rz: 3, z: 190 },
  { dx: 92, dy: 24, ry: 10, rz: 4, z: 240 },
  { dx: 64, dy: -46, ry: 6, rz: -3, z: 210 },
];

async function estado(f) {
  // Fondo
  fondo.material.uniforms.t.value = f / 60;
  fondo.material.uniforms.choco.value = 1 - U.smooth(140, 190, f);

  // Cámara: deriva lenta (el reflejo del cristal se mueve con ella)
  cam.position.set(10 * U.ruido(f / 170, 5), 8 * U.ruido(f / 190, 6), D);
  cam.lookAt(0, 0, 0);

  // Celular: se asienta (12° → 0° con rebote), push-in a la portada, luego a la izquierda y mecido suave.
  const asienta = U.resorte((f - 160) / 60, { w: 7.5, z: 0.6 });
  const pin = U.easeInOutSine(U.tramo(f, 222, 293)) * (1 - U.easeInOutCubic(U.tramo(f, 296, 336)));
  const zoom = 1 + 0.29 * pin;
  const izq = U.easeInOutCubic(U.tramo(f, 300, 336));
  const foco = tel.local(195, 330);
  const g = tel.grupo;
  g.position.set(-188 * izq + (1 - zoom) * foco.x, 36 + (1 - zoom) * foco.y + 4 * U.ruido(f / 95, 1), 0);
  // A la izquierda, el celular gira 7° hacia el centro (se ven el grosor y la refracción) y se inclina 3°.
  g.rotation.set(
    -3 * GRADOS * izq + 0.5 * GRADOS * U.ruido(f / 110, 3),
    12 * GRADOS * (1 - asienta) + 7 * GRADOS * izq + 0.6 * GRADOS * U.ruido(f / 150, 4),
    0.35 * GRADOS * U.ruido(f / 130, 2),
  );
  g.scale.setScalar((0.94 + 0.06 * asienta) * zoom);
  tel.matPantalla.uniforms.encendido.value = U.smooth(186, 197, f);
  tel.matBrillo.uniforms.corrimiento.value = 0.12 + g.rotation.y * 1.6 + cam.position.x / 900;

  // Pantalla: captura del cuadro (60 fps) + barra de estado + huecos de las tarjetas que están fuera.
  const fc = Math.round(f);
  const m = med(fc);
  const fuera = tarjetas.filter((t) => despegue(f, t) > 0.0005).map((t) => t.k);
  const clave = `${fc}|${fuera.join(',')}`;
  if (clave !== compuesto) {
    const img = await captura(fc);
    dibujarSistema(tel.ctx, img);
    for (const k of fuera) {
      const [x, y, w, h] = m.tarjetas[k];
      tel.ctx.fillStyle = '#FBF5F3';
      tel.ctx.beginPath(); tel.ctx.roundRect(x * 3 - 2, (y + CSS.barra) * 3 - 2, w * 3 + 4, h * 3 + 4, 66); tel.ctx.fill();
      tel.ctx.strokeStyle = 'rgba(30,26,27,0.06)'; tel.ctx.lineWidth = 3; tel.ctx.stroke();
    }
    tel.tex.needsUpdate = true;
    compuesto = clave;
  }

  // Betún
  contorno.ajustar(U.easeInOutSine(U.tramo(f, 150, 186)) * contorno.largo, 1 - U.smooth(188, 208, f), false);
  subrayado.ajustar(U.easeInOutSine(U.tramo(f, 236, 258)) * subrayado.largo, 1 - U.smooth(286, 298, f));

  // Tarjetas 3D
  for (const t of tarjetas) {
    const p = despegue(f, t);
    const rumbo = RUMBO[t.k];
    // Base: sobre su hueco; mientras flota queda anclada donde despegó y al regresar vuela al hueco actual.
    const centro = (fc2) => { const [x, y, w, h] = med(fc2).tarjetas[t.k]; return tel.local(x + w / 2, y + h / 2); };
    const ahora = centro(fc);
    const ancla = centro(Math.min(fc, t.l));
    const regreso = U.tramo(f, t.l + 40, t.l + 58);
    const c = f < t.l ? ahora : ancla.clone().lerp(ahora, U.easeInOutCubic(regreso));
    const vaiven = Math.sin(((f - t.l) / 60) * Math.PI * 2 * 0.55) * p;
    t.t3d.grupo.position.set(c.x + rumbo.dx * p, c.y + rumbo.dy * p + 4 * vaiven, tel.T / 2 + 0.6 + rumbo.z * p);
    t.t3d.grupo.rotation.set((-5 * p + 1 * vaiven) * GRADOS, rumbo.ry * p * GRADOS, rumbo.rz * p * GRADOS);
    t.t3d.grupo.scale.setScalar(1 + 0.12 * p);
    t.t3d.grupo.visible = p > 0.0005;
    t.t3d.sombra.position.set(c.x + rumbo.dx * p * 0.4 + 10 * p, c.y + rumbo.dy * p * 0.4 - 16 * p, 0.2);
    t.t3d.sombra.scale.setScalar(1 + 0.22 * p);
    t.t3d.sombra.material.opacity = 0.42 * p * (1 - 0.35 * p);
    t.t3d.sombra.visible = p > 0.0005;
    // El borde de conchitas se pipea sobre la tarjeta en la pantalla y viaja con ella.
    t.borde.ajustar(U.easeInOutSine(U.tramo(f, t.b, t.b + 30)) * t.borde.largo, 1 - U.smooth(t.l + 58, t.l + 72, f));
    if (!t.t3d.grupo.visible) {
      // Mientras está en la pantalla, la tarjeta 3D no se ve pero su borde sí: se pinta sobre la captura.
      t.t3d.grupo.visible = true;
      t.t3d.malla.visible = false;
    } else {
      t.t3d.malla.visible = true;
    }
  }

  for (const w of palabras) animarPalabra(w.p, f, w.fE, w.fS);
}

// ------------------------------------------------------------------ cuadro acumulado
export async function cuadro(f, { sub = 8, obturador = 1 } = {}) {
  R.setRenderTarget(rtAcc); R.setClearColor(0x000000, 0); R.clear(true, true, true);
  for (let i = 0; i < sub; i++) {
    const ft = f + ((i + 0.5) / sub - 0.5) * obturador;
    await estado(ft);
    cam.setViewOffset(W, H, U.halton(i + 1, 2) - 0.5, U.halton(i + 1, 3) - 0.5, W, H);
    R.setRenderTarget(rtSub); R.setClearColor(0x000000, 1); R.clear(true, true, true);
    R.render(escena, cam);
    quad.material = matAcum;
    matAcum.uniforms.t.value = rtSub.texture;
    matAcum.uniforms.peso.value = 1 / sub;
    R.setRenderTarget(rtAcc);
    R.render(qEscena, qCam);
  }
  cam.clearViewOffset();
  quad.material = matSalida;
  matSalida.uniforms.semilla.value = (f * 0.618) % 1;
  R.setRenderTarget(null);
  R.clear(true, true, true);
  R.render(qEscena, qCam);
}

export function leer() {
  const gl = R.getContext();
  const buf = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let s = '';
  const paso = 0x8000;
  for (let i = 0; i < buf.length; i += paso) s += String.fromCharCode.apply(null, buf.subarray(i, i + paso));
  return btoa(s);
}
