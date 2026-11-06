// Escena completa del video (28 s, 1680 cuadros a 60 fps): una función determinista por cuadro + acumulación de
// subcuadros con jitter (motion blur y antialias). Espacio de diseño: cuadro de 1080 x 1920 (en z = 0 una unidad =
// 1 px de diseño, y hacia arriba, origen al centro). Los tiempos salen de brief/timeline.json (fase 2) y del plan
// de la pantalla (video/plan.mjs); las piezas 3D que salen de la pantalla son recortes exactos de la captura.
import * as THREE from 'three';
import * as U from './util.js';
import { crearFondo, crearEntorno } from './fondo.js';
import { crearTelefono, dibujarSistema, CSS } from './telefono.js';
import { crearBetun, caminoRect } from './betun.js';
import { crearPalabra, animarPalabra } from './texto.js';
import { crearTarjeta3D } from './tarjeta.js';
import { cargarEMS, trazosEMS, trazosEsqueleto, crearEscritura, progresoPorLetras } from './escritura.js';
import { crearManga } from './manga.js';
import { crearBusqueda } from './busqueda.js';
import { crearToques } from './toques.js';
import { crearTeclado } from './teclado.js';
import { crearPlaca } from './placa.js';
import { crearPastel } from '/3d/pastel.js';

const D = 3600;
const G = Math.PI / 180;
const X = (fx) => fx - 540; // x del cuadro → escena
const Y = (fy) => 960 - fy; // y del cuadro → escena
// Remuestrea una polilínea (THREE.Vector2) a puntos cada `paso` px a lo largo del camino.
function remuestrear(pts, paso) {
  const out = [pts[0].clone()];
  let resto = paso;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    let d = a.distanceTo(b), t0 = 0;
    while (d - t0 >= resto) { t0 += resto; out.push(a.clone().lerp(b, t0 / d)); resto = paso; }
    resto -= d - t0;
  }
  return out;
}
let R, escena, cam, fondo, tel, W, H, MED, TL, rtSub, rtAcc, qEscena, qCam, quad, matAcum, matSalida;
let F_BOTON = 1006; // cuadro en que se presiona «Enviar por WhatsApp» (de la captura)
const cache = new Map();
let compuesto = '';
const S = {}; // piezas de cada sección

async function imagen(url) { return createImageBitmap(await (await fetch(url)).blob()); }
async function captura(fc) {
  const f = Math.max(MED.desde, Math.min(MED.hasta, fc));
  if (!cache.has(f)) {
    cache.set(f, await imagen(`/video/build/pantalla/f${String(f).padStart(4, '0')}.png`));
    for (const k of [...cache.keys()]) if (k < f - 3 || k > f + 40) { cache.get(k).close(); cache.delete(k); }
  }
  return cache.get(f);
}
const med = (fc) => MED.cuadros[Math.max(MED.desde, Math.min(MED.hasta, Math.round(fc)))];
const palabraVoz = (id, w) => TL.voz.find((v) => v.id === id).palabras.find((p) => p.w === w).f;

// Pose de un punto de la pantalla en el mundo (para piezas que salen del celular hacia el cuadro).
function poseEnPantalla(lx, ly, lz) {
  tel.grupo.updateMatrixWorld(true);
  const m = new THREE.Matrix4().multiplyMatrices(tel.grupo.matrixWorld, new THREE.Matrix4().makeTranslation(lx, ly, lz));
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  m.decompose(p, q, s);
  return { p, q, s };
}
function aplicarPose(obj, a, b, t) {
  obj.position.lerpVectors(a.p, b.p, t);
  obj.quaternion.slerpQuaternions(a.q, b.q, t);
  obj.scale.lerpVectors(a.s, b.s, t);
}

// ------------------------------------------------------------------ montaje
export async function preparar({ ancho, alto, medidas }) {
  W = ancho; H = alto; MED = medidas;
  F_BOTON = MED.toques.find((t) => t.selector === '#btn-enviar').f;
  TL = await (await fetch('/brief/timeline.json')).json();
  R = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
  R.setPixelRatio(1); R.setSize(W, H);
  R.autoClear = false;
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.NoToneMapping;
  document.body.appendChild(R.domElement);

  escena = new THREE.Scene();
  escena.environment = crearEntorno(R);
  cam = new THREE.PerspectiveCamera(2 * Math.atan(960 / D) / G, 1080 / 1920, 10, 20000);
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
  const ems = await cargarEMS('/video/fuentes/EMSAllure.svg');

  // ---------------- HOOK: barra de búsqueda de cristal y la manga que escribe «galletas aguascalientes»
  S.busq = crearBusqueda();
  S.busq.grupo.position.set(0, Y(930), 0);
  escena.add(S.busq.grupo);
  const consulta = 'galletas aguascalientes';
  S.qBusq = trazosEMS(ems, consulta);
  const emB = Math.min(84, 700 / S.qBusq.ancho);
  S.escBusq = crearEscritura({ trazos: S.qBusq.trazos, em: emB, x0: -440 + 124, yBase: -10, ancho: 9, fIni: 6, fFin: 128, nombre: 'busqueda', boquilla: false });
  S.busq.texto.add(S.escBusq.grupo);
  S.tiemposBusq = [];
  [...consulta].forEach((c, i) => { if (c.trim()) S.tiemposBusq.push(6 + 5.5 * (i + 1)); });
  S.manga = crearManga();
  escena.add(S.manga.grupo);
  S.mangaPos = new THREE.Vector3();

  // ---------------- LLEGADA: la línea corre desde la última letra y dibuja el contorno del celular
  {
    const fin = new THREE.Vector3();
    const u = S.escBusq.piezas.at(-1).pts.at(-1);
    fin.set(u.x, u.y, 0);
    S.busq.grupo.scale.setScalar(1.06); S.busq.grupo.updateMatrixWorld(true);
    S.busq.texto.localToWorld(fin);
    S.busq.grupo.scale.setScalar(1);
    // Contorno remuestreado cada 8 px; arranca a media altura del lado derecho, junto a la última letra, y corre
    // en sentido horario (baja por la derecha, cruza abajo, sube por la izquierda y cierra arriba).
    const rect = remuestrear(caminoRect(0, 36, tel.Wb + 24, tel.Hb + 24, tel.rb + 12), 8);
    const arranque = new THREE.Vector2((tel.Wb + 24) / 2, 36);
    const i0 = rect.reduce((b, p, i) => (p.distanceTo(arranque) < rect[b].distanceTo(arranque) ? i : b), 0);
    const anillo = rect.slice(i0).concat(rect.slice(0, i0 + 1));
    const puente = [];
    const a = new THREE.Vector2(fin.x, fin.y), c = anillo[0];
    // gancho corto: sale de la «s» hacia arriba a la derecha y entra bajando al contorno
    const m1 = new THREE.Vector2(a.x + 46, a.y + 40), m2 = new THREE.Vector2(c.x, c.y + 70);
    for (let i = 0; i < 16; i++) {
      const t = i / 16, k = 1 - t;
      puente.push(new THREE.Vector2(k ** 3 * a.x + 3 * k * k * t * m1.x + 3 * k * t * t * m2.x + t ** 3 * c.x, k ** 3 * a.y + 3 * k * k * t * m1.y + 3 * k * t * t * m2.y + t ** 3 * c.y));
    }
    S.contorno = crearBetun({ puntos: puente.concat(anillo.slice(1)), ancho: 8, nombre: 'contorno' });
    S.contorno.grupo.position.z = 80;
    escena.add(S.contorno.grupo);
  }
  const chip = med(236).chip;
  const ptsChip = [];
  for (let i = 0; i <= 28; i++) { const t = i / 28; ptsChip.push(tel.local(chip[0] + 6 + t * (chip[2] - 12), chip[1] + chip[3] + 7 + 1.4 * Math.sin(t * Math.PI * 2.3))); }
  S.subChip = crearBetun({ puntos: ptsChip, ancho: 6, nombre: 'subrayado-chip' });
  tel.capa.add(S.subChip.grupo);

  // ---------------- CATÁLOGO: borde de conchitas y tres tarjetas en cascada; «RECIÉN / HORNEADAS»
  S.tarjetas = [];
  for (const { k, b, l } of CASCADA) {
    const rect = med(l).tarjetas[k];
    const t3d = crearTarjeta3D({ imagen: await captura(l), rect, k: tel.k });
    tel.grupo.add(t3d.grupo); tel.capa.add(t3d.sombra);
    const borde = crearBetun({ puntos: caminoRect(0, 0, t3d.W + 6 * tel.k, t3d.H + 6 * tel.k, 25 * tel.k), ancho: 8.5, conchas: true, nombre: `borde-${k}` });
    borde.grupo.position.z = 1.2;
    t3d.grupo.add(borde.grupo);
    S.tarjetas.push({ k, b, l, t3d, borde });
  }
  S.palabras = [];
  const tipo = (texto, x, y, px, fE, fS, op = {}) => { const p = crearPalabra({ texto, x, y, px, ...op }); escena.add(p.grupo); S.palabras.push({ p, fE, fS }); return p; };
  const k1 = TL.tipo.find((t) => t.id === 'K1').palabras;
  tipo('RECIÉN', 688, 830, 60, k1[0][1], 566);
  tipo('HORNEADAS', 688, 905, 60, k1[1][1], 566);

  // ---------------- A TU MEDIDA: la foto sale, el betún traza el pastel y se construye el mismo pastel en 3D
  {
    const rv = med(652).vista;
    // La foto limpia (sin la barra de la página), al tamaño exacto del hueco «vista» de la captura.
    S.foto = crearTarjeta3D({ imagen: await imagen('/video/build/texturas/vista_foto.png'), rect: [0, 0, rv[2], rv[3]], k: tel.k, radioCss: 20 });
    S.foto.grupo.visible = false;
    escena.add(S.foto.grupo);
    S.fotoRect = rv;
    const cont = await (await fetch('/assets/pastel_contorno.json')).json();
    const [wv, hv] = [rv[2], rv[3]];
    const s = wv / 1080, oy = (hv - 1350 * s) / 2;
    const pts = cont.puntos.map(([x, y]) => new THREE.Vector2((x * s - wv / 2) * tel.k, (hv / 2 - (y * s + oy)) * tel.k))
      .filter((p) => Math.abs(p.y) < (hv / 2) * tel.k - 6);
    pts.push(pts[0].clone());
    S.trazoFoto = crearBetun({ puntos: pts, ancho: 6, nombre: 'trazo-pastel' });
    S.trazoFoto.grupo.position.z = 1.4;
    S.foto.grupo.add(S.trazoFoto.grupo);
    S.destinoFoto = { p: new THREE.Vector3(X(820), Y(500), 60), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(2 * G, -8 * G, 2 * G)), s: new THREE.Vector3().setScalar(320 / (wv * tel.k)) };
    // Pastel 3D (mismo modelo que la foto de referencia), inclinado para verse como en la foto.
    S.pastel = crearPastel(THREE);
    S.pastelG = new THREE.Group();
    S.pastelG.add(S.pastel);
    S.pastel.position.y = -0.95;
    S.pastelG.rotation.x = 12.6 * G;
    S.pastelG.position.set(X(820), Y(990), 40);
    S.pastelG.scale.setScalar(150);
    S.pastelG.visible = false;
    escena.add(S.pastelG);
    const pz = {};
    S.pastel.traverse((o) => { if (o.name) pz[o.name] = o; });
    S.pz = pz;
    S.cuentas = Object.fromEntries(['piso1Conchas', 'piso1Perlas', 'piso1Guirnaldas', 'piso2Conchas', 'piso2Perlas'].map((n) => [n, pz[n].count]));
    S.basePisos = { piso1: pz.piso1.position.y, piso2: pz.piso2.position.y };
    S.baseCerezas = pz.cerezas.children.map((c) => c.position.y);
    // sombra de contacto del pastel
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = 128;
    const g = sc.getContext('2d'); const gr = g.createRadialGradient(128, 64, 4, 128, 64, 120);
    gr.addColorStop(0, 'rgba(10,5,6,0.6)'); gr.addColorStop(1, 'rgba(10,5,6,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    S.sombraPastel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    S.sombraPastel.rotation.x = -Math.PI / 2; S.sombraPastel.position.y = -0.94;
    S.pastelG.add(S.sombraPastel);
  }
  const k2 = TL.tipo.find((t) => t.id === 'K2').palabras, k3 = TL.tipo.find((t) => t.id === 'K3').palabras;
  tipo('MÁNDANOS', 610, 1360, 58, k2[0][1], 770);
  tipo('LA FOTO.', 610, 1430, 58, k2[2][1], 770);
  tipo('TE LO', 610, 1330, 56, k3[1][1], 844);
  tipo('HACEMOS', 610, 1398, 56, k3[2][1], 844);
  tipo('IGUAL.', 610, 1466, 56, k3[3][1], 844);
  const k4 = TL.tipo.find((t) => t.id === 'K4').palabras;
  tipo('TU PEDIDO', 688, 870, 60, k4[1][1], 980);
  // Teclado: sube al tocar el campo y baja 4 cuadros después de la última tecla (tiempos de la captura).
  const tMensaje = MED.toques.find((t) => t.selector === '#mensaje').f;
  const tUltima = MED.teclas.at(-1).f;
  S.teclado = crearTeclado(MED.teclas, { sube: [tMensaje + 2, tMensaje + 18], baja: [tUltima + 4, tUltima + 18] });

  // ---------------- PEDIDO: el botón se levanta en 3D; el betún subraya «te mando la foto en este chat.»
  {
    const rb = med(F_BOTON - 1).enviar;
    S.boton = crearTarjeta3D({ imagen: await captura(F_BOTON - 1), rect: rb, k: tel.k, radioCss: rb[3] / 2 });
    S.boton.grupo.visible = false;
    tel.grupo.add(S.boton.grupo); tel.capa.add(S.boton.sombra);
    S.botonRect = rb;
    const fr = med(1066).frase_mensaje || [];
    S.subMensaje = fr.map(([x, y, w, h], i) => {
      const pts = []; for (let j = 0; j <= 20; j++) { const t = j / 20; pts.push(tel.local(x + t * w, y + h + 2 + 1.2 * Math.sin(t * Math.PI * 2 + i))); }
      const b = crearBetun({ puntos: pts, ancho: 5.5, nombre: `sub-mensaje-${i}` }); tel.capa.add(b.grupo); return b;
    });
  }
  const k5 = TL.tipo.find((t) => t.id === 'K5').palabras;
  tipo('EN UN', 688, 830, 60, k5[1][1], 1056);
  tipo('MENSAJE', 688, 905, 60, k5[2][1], 1056);

  // ---------------- CONFIANZA: tres reseñas en abanico, push-in a la frase, «HABLAN / POR TI», pin y horario
  {
    const tx = await (await fetch('/video/build/texturas/texturas.json')).json();
    S.resenas = [];
    for (let k = 0; k < 3; k++) {
      const img = await imagen(`/video/build/texturas/resena_${k}.png`);
      const [w, h] = tx.resenas[k].tam;
      const t3d = crearTarjeta3D({ imagen: img, rect: [0, 0, w, h], k: tel.k, radioCss: 26 });
      t3d.grupo.visible = false;
      tel.grupo.add(t3d.grupo);
      S.resenas.push({ k, t3d, w, h, f0: [1184, 1200, 1214][k], ang: [0, -9, 9][k], z: [236, 200, 214][k] });
    }
    const fr = tx.resenas[0].frase || [];
    S.subResena = fr.map(([x, y, w, h], i) => {
      const r0 = S.resenas[0];
      const pts = []; for (let j = 0; j <= 20; j++) { const t = j / 20; pts.push(new THREE.Vector2((x + t * w - r0.w / 2) * tel.k, (r0.h / 2 - (y + h + 1)) * tel.k + 1.2 * Math.sin(t * Math.PI * 2 + i))); }
      const b = crearBetun({ puntos: pts, ancho: 6, nombre: `sub-resena-${i}` }); b.grupo.position.z = 1.5; r0.t3d.grupo.add(b.grupo); return b;
    });
    const hr = med(1330).horario;
    const ptsH = []; for (let j = 0; j <= 24; j++) { const t = j / 24; ptsH.push(tel.local(hr[0] + t * hr[2], hr[1] + hr[3] + 3 + 1.3 * Math.sin(t * Math.PI * 2.2))); }
    S.subHorario = crearBetun({ puntos: ptsH, ancho: 6.5, nombre: 'sub-horario' });
    tel.capa.add(S.subHorario.grupo);
  }
  const k6 = TL.tipo.find((t) => t.id === 'K6').palabras;
  tipo('HABLAN', 712, 860, 60, k6[0][1], 1302);
  tipo('POR TI', 712, 935, 60, k6[1][1], 1302);

  // ---------------- CIERRE: «Lo que ya se antoja / también se busca.» con letra de betún
  {
    const l1 = trazosEMS(ems, 'Lo que ya se antoja'), l2 = trazosEMS(ems, 'también se busca.');
    const em = Math.min(84, 600 / Math.max(l1.ancho, l2.ancho));
    S.cierre1 = crearEscritura({ trazos: l1.trazos, em, x0: X(424), yBase: Y(860), ancho: 8, fIni: 1350, fFin: 1396, nombre: 'cierre-1' });
    S.cierre2 = crearEscritura({ trazos: l2.trazos, em, x0: X(424), yBase: Y(975), ancho: 8, fIni: 1398, fFin: 1434, nombre: 'cierre-2' });
    escena.add(S.cierre1.grupo, S.cierre2.grupo);
  }

  // ---------------- END CARD: el betún escribe «Ana Gaby Repostería», el letrero en su placa y Elevate
  {
    const j = await (await fetch('/video/fuentes/nombre_esqueleto.json')).json();
    const n = trazosEsqueleto(j);
    const em = 112;
    S.nombre = crearEscritura({ trazos: n.trazos, em, x0: -n.ancho * em / 2, yBase: Y(560), ancho: 10, fIni: 1446, fFin: 1533, nombre: 'nombre', boquilla: false });
    escena.add(S.nombre.grupo);
    S.placa = await crearPlaca({ url: '/assets/logo_letrero_ag.png' });
    S.placa.grupo.position.set(0, Y(880), 0);
    S.placa.grupo.visible = false;
    escena.add(S.placa.grupo);
    const a = crearPalabra({ texto: 'Así se vería tu página', x: 0, y: 1170, px: 44, fuente: '600', familia: 'DM Sans', tracking: 0.005 });
    const e = crearPalabra({ texto: 'Elevate Negocios', x: 0, y: 1242, px: 42, fuente: '600', familia: 'DM Sans', color: '#E6A3B0', tracking: 0.02 });
    a.grupo.position.x = 540 - a.ancho / 2; e.grupo.position.x = 540 - e.ancho / 2;
    escena.add(a.grupo, e.grupo);
    S.palabras.push({ p: a, fE: palabraVoz('L7', 'Así'), fS: 99999 }, { p: e, fE: palabraVoz('L7', 'Elevate'), fS: 99999 });
    const legal = crearPalabra({ texto: 'Demo de cortesía de Elevate Negocios · pieza no oficial', x: 0, y: 1520, px: 26, fuente: '400', familia: 'DM Sans', color: '#B8AEB0', tracking: 0 });
    legal.grupo.position.x = 540 - legal.ancho / 2;
    escena.add(legal.grupo);
    S.legal = legal;
  }

  // Toques: los de la página y los del teclado.
  S.toques = crearToques(tel, [...MED.toques, ...S.teclado.toques()]);
  globalThis.__escena = { S, escena, cam, tel }; // para depurar desde Playwright

  // Acumulación de subcuadros.
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

// ------------------------------------------------------------------ tiempos de piezas
// Tarjetas del catálogo: el betún pipea su borde (b → b+30); despega en l (18 cuadros), flota y regresa en l+40 → l+58.
const CASCADA = [{ k: 0, b: 336, l: 392 }, { k: 1, b: 376, l: 416 }, { k: 2, b: 404, l: 444 }];
const RUMBO = [{ dx: 56, dy: 52, ry: 7, rz: 3, z: 190 }, { dx: 92, dy: 24, ry: 10, rz: 4, z: 240 }, { dx: 64, dy: -46, ry: 6, rz: -3, z: 210 }];
function despegue(f, t) {
  return U.easeOutBack(U.tramo(f, t.l, t.l + 18), 1.25) * (1 - U.easeInOutCubic(U.tramo(f, t.l + 40, t.l + 58)));
}
const fotoFuera = (f) => U.easeInOutCubic(U.tramo(f, 650, 690)) * (1 - U.easeInOutCubic(U.tramo(f, 838, 860)));
// El botón sale en 3D al presionarlo (cuadro de la captura) y regresa al soltarlo, 8 cuadros después.
const botonFuera = (f) => U.easeOutBack(U.tramo(f, F_BOTON, F_BOTON + 8), 1.6) * (1 - U.easeInOutCubic(U.tramo(f, F_BOTON + 8, F_BOTON + 20)));
const resenaFuera = (f, r) => U.easeOutBack(U.tramo(f, r.f0, r.f0 + 16), 1.15) * (1 - U.easeInOutCubic(U.tramo(f, 1276, 1292)));

// ------------------------------------------------------------------ celular
function estadoTelefono(f) {
  const asienta = U.resorte((f - 160) / 60, { w: 7.5, z: 0.6 });
  const izq = U.easeInOutCubic(U.tramo(f, 300, 336));
  const m60 = U.easeInOutCubic(U.tramo(f, 640, 676)) * (1 - U.easeInOutCubic(U.tramo(f, 840, 866)));
  const lejos = U.easeInOutCubic(U.tramo(f, 1344, 1374));
  const sale = U.easeInOutCubic(U.tramo(f, 1440, 1474));
  // Push-ins: portada, burbuja del mensaje y la reseña del abanico (zoom alrededor de un foco de la pantalla).
  const zP = 0.29 * U.easeInOutSine(U.tramo(f, 222, 293)) * (1 - U.easeInOutCubic(U.tramo(f, 296, 336)));
  const zB = 0.6 * U.easeInOutCubic(U.tramo(f, 1056, 1098)) * (1 - U.easeInOutCubic(U.tramo(f, 1110, 1142)));
  const zR = 0.10 * U.easeInOutCubic(U.tramo(f, 1226, 1256)) * (1 - U.easeInOutCubic(U.tramo(f, 1276, 1294)));
  let foco = new THREE.Vector2(0, 0);
  if (zP > 0) foco = tel.local(195, 330);
  else if (zB > 0) { const b = med(Math.min(Math.max(f, 1040), 1110)).burbuja; foco = tel.local(b[0] + b[2] / 2, b[1] + b[3] * 0.62); }
  else if (zR > 0) foco = new THREE.Vector2(-10, 40);
  const zoom = 1 + zP + zB + zR;
  const escBase = (0.94 + 0.06 * asienta) * (1 - 0.077 * m60) * (1 - 0.55 * lejos);
  let x = -188 * izq - 46 * m60;
  x += (-290 - x) * lejos;
  x += (-1100 - x) * sale;
  const y = 36 + 4 * U.ruido(f / 95, 1);
  const g = tel.grupo;
  // En un push-in el celular crece: si su borde izquierdo se acercara a menos de 18 px del borde del cuadro, se
  // corre a la derecha (máximo suave, solo mientras hay zoom) para que la interfaz nunca quede cortada.
  let gx = x + (1 - zoom) * escBase * foco.x;
  const wZoom = U.clamp((zoom - 1) / 0.05, 0, 1);
  if (wZoom > 0) {
    const minX = -540 + 18 + (tel.Wb / 2) * escBase * zoom;
    const suave = (gx + minX + Math.sqrt((gx - minX) ** 2 + 40 * 40)) / 2;
    gx += (suave - gx) * wZoom;
  }
  g.position.set(gx, y + (1 - zoom) * escBase * foco.y, 0);
  g.rotation.set(
    -3 * G * izq * (1 - lejos) + 0.5 * G * U.ruido(f / 110, 3),
    12 * G * (1 - asienta) + 7 * G * izq * (1 - lejos) + 14 * G * lejos + 24 * G * sale + 0.6 * G * U.ruido(f / 150, 4),
    0.35 * G * U.ruido(f / 130, 2),
  );
  g.scale.setScalar(escBase * zoom);
  g.visible = f >= 158 && f < 1476;
  const aparece = U.smooth(158, 192, f);
  tel.cristal.opacity = aparece; tel.cristal.transparent = aparece < 1;
  tel.matPantalla.uniforms.encendido.value = U.smooth(186, 197, f);
  tel.matBrillo.uniforms.corrimiento.value = 0.12 + g.rotation.y * 1.6 + cam.position.x / 900;
}

// ------------------------------------------------------------------ pantalla (captura + barra + huecos + teclado)
async function componerPantalla(f) {
  const fc = Math.round(f);
  const m = med(fc);
  const huecos = [];
  for (const t of S.tarjetas) if (despegue(f, t) > 0.0005) { const [x, y, w, h] = m.tarjetas[t.k]; huecos.push([x, y, w, h, 22, '#FBF5F3']); }
  if (fotoFuera(f) > 0.0005 && m.vista) { const [x, y, w, h] = m.vista; huecos.push([x, y, w, h, 20, '#F3DED8']); }
  if (botonFuera(f) > 0.0005 && m.enviar) { const [x, y, w, h] = m.enviar; huecos.push([x, y, w, h, h / 2, '#FFFFFF']); }
  for (const r of S.resenas) if (resenaFuera(f, r) > 0.0005 && m.resenas) { const [x, y, w, h] = m.resenas[r.k]; if (x > -w && x < 390) huecos.push([x, y, w, h, 26, '#FBF5F3']); }
  const clave = `${fc}|${huecos.map((h) => h.slice(0, 2).map(Math.round).join(':')).join(',')}|${S.teclado.clave(f)}`;
  if (clave === compuesto) return;
  const img = await captura(fc);
  dibujarSistema(tel.ctx, img);
  for (const [x, y, w, h, r, color] of huecos) {
    tel.ctx.fillStyle = color;
    tel.ctx.beginPath(); tel.ctx.roundRect(x * 3 - 2, (y + CSS.barra) * 3 - 2, w * 3 + 4, h * 3 + 4, r * 3); tel.ctx.fill();
  }
  if (S.teclado.activo(f)) S.teclado.dibujar(tel.ctx, f);
  tel.tex.needsUpdate = true;
  compuesto = clave;
}

// ------------------------------------------------------------------ estado por cuadro
async function estado(f) {
  fondo.material.uniforms.t.value = f / 60;
  fondo.material.uniforms.choco.value = 1 - U.smooth(140, 190, f);
  cam.position.set(10 * U.ruido(f / 170, 5), 8 * U.ruido(f / 190, 6), D);
  cam.lookAt(0, 0, 0);
  estadoTelefono(f);
  await componerPantalla(f);

  // HOOK y LLEGADA: barra, escritura, manga, Enter, salida de la barra, contorno
  {
    const b = S.busq.grupo;
    const enter = Math.sin(Math.PI * U.tramo(f, 147, 159));
    const sale = U.easeInOutCubic(U.tramo(f, 148, 172));
    const queda = 1 - U.smooth(150, 167, f);
    b.visible = f < 168;
    b.scale.setScalar((1 + 0.06 * U.clamp(f / 146) + 0.03 * enter) * (1 - 0.08 * sale));
    b.position.y = Y(930) + 200 * sale;
    b.rotation.x = 6 * G * (1 - U.easeOutCubic(U.tramo(f, 0, 20))) - 8 * G * sale;
    S.busq.cara.material.uniforms.opacidad.value = queda;
    S.busq.cara.material.uniforms.brillo.value = enter;
    S.busq.icono.material.opacity = queda;
    S.busq.buscar.material.opacity = (1 - U.smooth(6, 14, f)) * queda;
    S.busq.losa.visible = queda > 0.35;
    const q = progresoPorLetras(S.escBusq, S.qBusq.trazos, S.tiemposBusq, f);
    const pipeando = S.escBusq.escribir(q, queda);
    // manga: sigue a la punta (con un poco de retraso), aprieta en f0 y en cada tecla; sale arriba a la derecha
    const punta = S.busq.texto.localToWorld(S.escBusq.cabeza.clone());
    punta.z += 14;
    const vuela = U.easeInOutCubic(U.tramo(f, 128, 150));
    punta.add(new THREE.Vector3(420 * vuela, 1100 * vuela, 300 * vuela));
    let aprieta = Math.exp(-Math.max(0, f) / 4);
    for (const t of S.tiemposBusq) if (f >= t - 5.5 && f < t) aprieta = Math.max(aprieta, 0.25 * Math.exp(-(f - (t - 5.5)) / 2));
    S.manga.colocar(punta, aprieta, 1.15);
    S.manga.grupo.visible = (f < 150 && pipeando !== undefined) || (f >= 1436 && f < 1560);
    S.contorno.ajustar(U.easeInOutSine(U.tramo(f, 150, 186)) * S.contorno.largo, 1 - U.smooth(188, 210, f));
  }
  S.subChip.ajustar(U.easeInOutSine(U.tramo(f, 236, 258)) * S.subChip.largo, 1 - U.smooth(286, 298, f));

  // CATÁLOGO: tarjetas en cascada
  const fc = Math.round(f);
  for (const t of S.tarjetas) {
    const p = despegue(f, t), r = RUMBO[t.k];
    const centro = (fx) => { const [x, y, w, h] = med(fx).tarjetas[t.k]; return tel.local(x + w / 2, y + h / 2); };
    const ahora = centro(fc), ancla = centro(Math.min(fc, t.l));
    const c = f < t.l ? ahora : ancla.clone().lerp(ahora, U.easeInOutCubic(U.tramo(f, t.l + 40, t.l + 58)));
    const vaiven = Math.sin(((f - t.l) / 60) * Math.PI * 1.1) * p;
    t.t3d.grupo.position.set(c.x + r.dx * p, c.y + r.dy * p + 4 * vaiven, tel.T / 2 + 0.6 + r.z * p);
    t.t3d.grupo.rotation.set((-5 * p + vaiven) * G, r.ry * p * G, r.rz * p * G);
    t.t3d.grupo.scale.setScalar(1 + 0.12 * p);
    t.t3d.malla.visible = p > 0.0005;
    t.t3d.grupo.visible = f >= t.b && f < t.l + 76;
    t.t3d.sombra.position.set(c.x + r.dx * p * 0.4 + 10 * p, c.y + r.dy * p * 0.4 - 16 * p, 0.2);
    t.t3d.sombra.scale.setScalar(1 + 0.22 * p);
    t.t3d.sombra.material.opacity = 0.42 * p * (1 - 0.35 * p);
    t.t3d.sombra.visible = p > 0.0005;
    t.borde.ajustar(U.easeInOutSine(U.tramo(f, t.b, t.b + 30)) * t.borde.largo, 1 - U.smooth(t.l + 58, t.l + 72, f));
  }

  // A TU MEDIDA: foto fuera, trazo, pastel 3D
  {
    const u = fotoFuera(f);
    S.foto.grupo.visible = u > 0.0005;
    if (S.foto.grupo.visible) {
      const m = med(fc).vista || S.fotoRect;
      const c = tel.local(m[0] + m[2] / 2, m[1] + m[3] / 2);
      const a = poseEnPantalla(c.x, c.y, tel.T / 2 + 0.6);
      aplicarPose(S.foto.grupo, a, S.destinoFoto, u);
      S.foto.sombra.visible = false;
    }
    S.trazoFoto.ajustar(U.easeInOutSine(U.tramo(f, palabraVoz('L4', 'idéntico'), palabraVoz('L4', 'foto'))) * S.trazoFoto.largo, 1 - U.smooth(836, 846, f));
    const construye = f >= 724 && f < 866;
    S.pastelG.visible = construye;
    if (construye) {
      const pz = S.pz;
      const encoge = U.easeInOutCubic(U.tramo(f, 840, 864));
      S.pastelG.scale.setScalar(150 * (1 - 0.92 * encoge));
      S.pastelG.position.set(X(820), Y(990) + 420 * encoge, 40);
      S.pastelG.rotation.y = 4 * G * Math.sin(((f - 814) / 60) * Math.PI * 0.6) * U.smooth(814, 830, f);
      pz.tabla.visible = f >= 724;
      pz.tabla.scale.setScalar(0.6 + 0.4 * U.easeOutBack(U.tramo(f, 724, 734), 1.4));
      const cae = (f0, f1) => 1 - U.resorte((f - f0) / 60 * (60 / (f1 - f0)) * 0.9, { w: 9, z: 0.5 });
      pz.piso1.visible = f >= 728;
      pz.piso1.position.y = S.basePisos.piso1 + 3.2 * cae(728, 744);
      pz.piso2.visible = f >= 768;
      pz.piso2.position.y = S.basePisos.piso2 + 2.6 * cae(768, 782);
      const cuenta = (n, f0, f1) => { pz[n].count = Math.round(S.cuentas[n] * U.tramo(f, f0, f1)); pz[n].visible = pz[n].count > 0; };
      cuenta('piso1Conchas', 744, 760); cuenta('piso1Guirnaldas', 750, 766); cuenta('piso1Perlas', 762, 770);
      cuenta('piso2Conchas', 782, 790); cuenta('piso2Perlas', 788, 794);
      pz.cerezas.children.forEach((c, i) => {
        const f0 = 794 + 4 * i;
        c.visible = f >= f0;
        c.position.y = S.baseCerezas[i] + 1.4 * (1 - U.resorte((f - f0) / 20, { w: 10, z: 0.45 }));
      });
    }
  }

  // PEDIDO: botón 3D y subrayado del mensaje
  {
    const p = botonFuera(f);
    S.boton.grupo.visible = p > 0.0005;
    if (S.boton.grupo.visible) {
      const m = med(fc).enviar || S.botonRect;
      const c = tel.local(m[0] + m[2] / 2, m[1] + m[3] / 2);
      S.boton.grupo.position.set(c.x, c.y, tel.T / 2 + 0.6 + 48 * p);
      S.boton.grupo.scale.setScalar(1 + 0.06 * p);
      S.boton.grupo.rotation.set(-4 * G * p, 0, 0);
      S.boton.sombra.visible = true;
      S.boton.sombra.position.set(c.x + 6 * p, c.y - 10 * p, 0.2);
      S.boton.sombra.material.opacity = 0.4 * p;
    } else S.boton.sombra.visible = false;
    const n = S.subMensaje.length;
    S.subMensaje.forEach((b, i) => b.ajustar(U.easeInOutSine(U.tramo(f, 1066 + (i * 24) / n, 1066 + ((i + 1) * 24) / n)) * b.largo, 1 - U.smooth(1110, 1124, f)));
  }

  // CONFIANZA: abanico de reseñas, subrayados
  {
    for (const r of S.resenas) {
      const p = resenaFuera(f, r);
      r.t3d.grupo.visible = p > 0.0005;
      if (!r.t3d.grupo.visible) continue;
      const m = med(Math.min(fc, r.f0 + 2)).resenas[r.k];
      const ini = tel.local(m[0] + m[2] / 2, m[1] + m[3] / 2);
      const regreso = U.easeInOutCubic(U.tramo(f, 1276, 1292));
      const dest0 = med(1292).resenas[0];
      const fin = tel.local(dest0[0] + dest0[2] / 2, dest0[1] + dest0[3] / 2);
      const a = r.ang * G;
      const piv = new THREE.Vector2(-10, -380);
      const pos = new THREE.Vector2(piv.x - Math.sin(a) * 420, piv.y + Math.cos(a) * 420);
      const sube = U.easeOutBack(U.tramo(f, r.f0, r.f0 + 16), 1.15);
      const base = ini.clone().lerp(pos, sube).lerp(fin, regreso);
      const vaiven = Math.sin(((f - r.f0) / 60) * Math.PI * 0.9) * (1 - regreso);
      r.t3d.grupo.position.set(base.x, base.y + 3 * vaiven, tel.T / 2 + 0.6 + r.z * p);
      r.t3d.grupo.rotation.set(-4 * G * p, (r.ang * 0.4) * G * p, a * sube * (1 - regreso));
      r.t3d.grupo.scale.setScalar(1 + (0.86 - 1) * sube * (1 - regreso));
    }
    S.subResena.forEach((b, i) => b.ajustar(U.easeInOutSine(U.tramo(f, 1240 + i * 15, 1255 + i * 15)) * b.largo, 1 - U.smooth(1276, 1284, f)));
    S.subHorario.ajustar(U.easeInOutSine(U.tramo(f, 1328, 1348)) * S.subHorario.largo, 1 - U.smooth(1372, 1388, f));
  }

  // CIERRE
  {
    const sube = U.easeInOutCubic(U.tramo(f, 1440, 1460));
    S.cierre1.grupo.position.y = 120 * sube; S.cierre2.grupo.position.y = 120 * sube;
    S.cierre1.escribir(U.easeInOutSine(U.tramo(f, 1350, 1396)), 1 - sube);
    S.cierre2.escribir(U.easeInOutSine(U.tramo(f, 1398, 1434)), 1 - sube);
  }

  // END CARD
  {
    const q = U.easeInOutSine(U.tramo(f, 1446, 1533));
    S.nombre.escribir(q, 1);
    if (f >= 1436 && f < 1560) {
      const punta = S.nombre.cabeza.clone();
      punta.z = 18;
      const entra = 1 - U.easeOutCubic(U.tramo(f, 1436, 1446)), sale = U.easeInOutCubic(U.tramo(f, 1533, 1556));
      punta.add(new THREE.Vector3(500 * entra + 500 * sale, 300 * entra + 900 * sale, 200 * (entra + sale)));
      S.manga.colocar(punta, Math.exp(-Math.max(0, f - 1443) / 4), 1.25);
    }
    const p = U.easeOutBack(U.tramo(f, 1520, 1556), 1.2);
    S.placa.grupo.visible = f >= 1520;
    S.placa.grupo.scale.setScalar(0.6 + 0.4 * p);
    S.placa.grupo.rotation.y = 22 * G * (1 - p) + 3 * G * Math.sin((f - 1556) / 60);
    S.placa.barrido.material.uniforms.x.value = -0.9 + 1.8 * U.easeInOutSine(U.tramo(f, 1546, 1620));
    for (const g of S.legal.glifos) { g.mat.uniforms.opacidad.value = 0.92 * U.smooth(1530, 1550, f); g.mat.uniforms.desenfoque.value = 0; g.plano.visible = f >= 1530; }
  }

  for (const w of S.palabras) animarPalabra(w.p, f, w.fE, w.fS);
  S.toques.actualizar(f);
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
