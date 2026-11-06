// Línea de betún: listón con volumen (perfil redondo), brillo húmedo, estrías de la boquilla de estrella
// y sombra suave. Se dibuja avanzando por su largo; la punta lleva la boquilla metálica mientras escribe.
// Las coordenadas son de un plano local (x a la derecha, y arriba): la pantalla del celular, la barra, el cuadro…
import * as THREE from 'three';
import { linealDe } from './util.js';

export const COLOR_BETUN = { base: '#F2B9C3', brillo: '#FFE8EC', sombra: '#C47A88' };

function remuestrear(pts, paso) {
  const out = [pts[0].clone()];
  let resto = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = a.distanceTo(b);
    let t = paso - resto;
    while (t <= d) { out.push(a.clone().lerp(b, t / d)); t += paso; }
    resto = d - (t - paso);
  }
  if (out[out.length - 1].distanceTo(pts[pts.length - 1]) > 0.01) out.push(pts[pts.length - 1].clone());
  return out;
}

// Rectángulo redondeado en sentido horario, empezando arriba a la izquierda (después de la esquina).
export function caminoRect(cx, cy, w, h, r, pasosEsquina = 14) {
  const p = [];
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  const arco = (ox, oy, a0, a1) => { for (let i = 0; i <= pasosEsquina; i++) { const a = a0 + (a1 - a0) * (i / pasosEsquina); p.push(new THREE.Vector2(ox + Math.cos(a) * r, oy + Math.sin(a) * r)); } };
  p.push(new THREE.Vector2(x0 + r, y1));
  p.push(new THREE.Vector2(x1 - r, y1)); arco(x1 - r, y1 - r, Math.PI / 2, 0);
  p.push(new THREE.Vector2(x1, y0 + r)); arco(x1 - r, y0 + r, 0, -Math.PI / 2);
  p.push(new THREE.Vector2(x0 + r, y0)); arco(x0 + r, y0 + r, -Math.PI / 2, -Math.PI);
  p.push(new THREE.Vector2(x0, y1 - r)); arco(x0 + r, y1 - r, Math.PI, Math.PI / 2);
  return p;
}

const VERT = /* glsl */`
  attribute float aS; attribute float aV; attribute float aW; attribute vec2 aN; attribute float aF;
  uniform vec2 desfase;
  varying float vS; varying float vV; varying float vW; varying vec2 vN; varying float vF;
  void main(){ vS = aS; vV = aV; vW = aW; vN = aN; vF = aF; vec3 p = position; p.xy += desfase; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;

const CORTE = /* glsl */`
  uniform float progreso, opacidad;
  varying float vS; varying float vV; varying float vW; varying vec2 vN; varying float vF;
  // Devuelve v corregida por la punta redonda (o descarta lo que todavía no se pipea).
  float puntaRedonda(){
    if (vS > progreso) discard;
    float v = vV;
    float r = vW * 0.5;
    float h = progreso - vS;
    if (h < r) { float dx = (r - h) / r; float rr = 1.0 - dx * dx; if (v * v > rr) discard; v = v / sqrt(max(rr, 1e-3)); }
    return v;
  }`;

export function crearBetun({ puntos, ancho = 6, conchas = false, periodo = null, boquilla = true, nombre = 'betun' }) {
  const paso = Math.max(0.6, ancho * 0.22);
  const P = remuestrear(puntos, paso);
  const n = P.length;
  const s = new Float32Array(n);
  for (let i = 1; i < n; i++) s[i] = s[i - 1] + P[i].distanceTo(P[i - 1]);
  const largo = s[n - 1];
  const lam = periodo || ancho * 1.9;
  const formaEn = (si) => {
    if (!conchas) return 1;
    const x = (si / lam) % 1; // concha: cabeza llena y cola que se adelgaza hacia la siguiente
    return Math.pow(Math.sin(Math.PI * Math.pow(x, 0.5)), 0.8);
  };
  const anchoEn = (si) => (conchas ? ancho * (0.24 + 0.76 * formaEn(si)) : ancho);
  const pad = 1.6;
  const pos = new Float32Array(n * 2 * 3), aS = new Float32Array(n * 2), aV = new Float32Array(n * 2), aW = new Float32Array(n * 2), aN = new Float32Array(n * 2 * 2), aF = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    const t = new THREE.Vector2().subVectors(b, a).normalize();
    const nn = new THREE.Vector2(-t.y, t.x);
    const w = anchoEn(s[i]);
    const half = w / 2 + pad;
    for (let k = 0; k < 2; k++) {
      const sg = k === 0 ? -1 : 1;
      const j = i * 2 + k;
      pos[j * 3] = P[i].x + nn.x * half * sg; pos[j * 3 + 1] = P[i].y + nn.y * half * sg; pos[j * 3 + 2] = 0;
      aS[j] = s[i]; aV[j] = sg * (half / (w / 2)); aW[j] = w; aN[j * 2] = nn.x; aN[j * 2 + 1] = nn.y; aF[j] = formaEn(s[i]);
    }
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  geo.setAttribute('aV', new THREE.BufferAttribute(aV, 1));
  geo.setAttribute('aW', new THREE.BufferAttribute(aW, 1));
  geo.setAttribute('aN', new THREE.BufferAttribute(aN, 2));
  geo.setAttribute('aF', new THREE.BufferAttribute(aF, 1));
  geo.setIndex(idx);

  const comunes = { progreso: { value: 0 }, opacidad: { value: 1 } };
  const premult = { transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
  const matSombra = new THREE.ShaderMaterial({
    ...premult,
    uniforms: { ...comunes, desfase: { value: new THREE.Vector2(ancho * 0.28, -ancho * 0.42) } },
    vertexShader: VERT,
    fragmentShader: /* glsl */`${CORTE}
      void main(){ float v = puntaRedonda(); float a = (1.0 - smoothstep(0.35, 1.08, abs(v))) * 0.34 * opacidad; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }`,
  });
  const matBetun = new THREE.ShaderMaterial({
    ...premult,
    uniforms: {
      ...comunes, desfase: { value: new THREE.Vector2(0, 0) },
      cBase: { value: new THREE.Vector3(...linealDe(COLOR_BETUN.base)) },
      cBrillo: { value: new THREE.Vector3(...linealDe(COLOR_BETUN.brillo)) },
      cSombra: { value: new THREE.Vector3(...linealDe(COLOR_BETUN.sombra)) },
    },
    vertexShader: VERT,
    fragmentShader: /* glsl */`${CORTE}
      uniform vec3 cBase, cBrillo, cSombra;
      void main(){
        float v = puntaRedonda();
        float r = vW * 0.5;
        float aa = 1.4 / max(r, 0.5);
        float borde = 1.0 - smoothstep(1.0 - aa, 1.0 + aa * 0.3, abs(v));
        float vv = clamp(v, -1.0, 1.0);
        float nz = sqrt(max(0.0, 1.0 - vv * vv));
        float estria = sin(vv * 9.42) * 0.22 * nz;                      // estrías rectas de la boquilla de estrella
        vec3 nrm = normalize(vec3(vN * (vv + estria), nz + 0.08));
        vec3 L = normalize(vec3(-0.5, 0.62, 0.8));
        vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
        float dif = clamp(dot(nrm, L), 0.0, 1.0);
        float esp = pow(clamp(dot(nrm, H), 0.0, 1.0), 42.0);          // brillo húmedo
        vec3 c = mix(cSombra, cBase, 0.28 + 0.72 * dif) + cBrillo * esp * 0.95 * (0.55 + 0.45 * vF);
        c *= (0.8 + 0.2 * nz) * (0.72 + 0.28 * smoothstep(0.15, 0.7, vF)); // sombra en la unión de cada concha
        float a = borde * opacidad;
        gl_FragColor = vec4(c * a, a);
      }`,
  });
  const sombra = new THREE.Mesh(geo, matSombra);
  const cuerpo = new THREE.Mesh(geo, matBetun);
  sombra.renderOrder = 7; cuerpo.renderOrder = 8;
  sombra.frustumCulled = cuerpo.frustumCulled = false;
  const grupo = new THREE.Group();
  grupo.name = nombre;
  grupo.add(sombra, cuerpo);

  // Boquilla metálica de estrella (solo mientras pipea).
  let punta = null;
  if (boquilla) {
    const estrella = new THREE.Shape();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2, r = i % 2 ? 0.62 : 1;
      if (i === 0) estrella.moveTo(Math.cos(a) * r, Math.sin(a) * r); else estrella.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const metal = new THREE.MeshStandardMaterial({ color: '#d8d4d6', metalness: 1, roughness: 0.26 });
    const pico = new THREE.Mesh(new THREE.ExtrudeGeometry(estrella, { depth: 1.4, bevelEnabled: false }), metal);
    const cono = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 2.1, 3.2, 24, 1, true), metal);
    cono.rotation.x = Math.PI / 2; cono.position.z = 3.0;
    punta = new THREE.Group();
    const cuerpoPunta = new THREE.Group();
    cuerpoPunta.add(pico, cono);
    cuerpoPunta.rotation.y = -0.6; // inclinada hacia atrás del avance
    punta.add(cuerpoPunta);
    punta.scale.setScalar(ancho * 0.85);
    punta.renderOrder = 9;
    grupo.add(punta);
  }

  const tangenteEn = (si) => {
    let i = 1;
    while (i < n - 1 && s[i] < si) i++;
    return { p: P[i - 1].clone().lerp(P[i], (si - s[i - 1]) / Math.max(1e-6, s[i] - s[i - 1])), t: new THREE.Vector2().subVectors(P[i], P[i - 1]).normalize() };
  };

  return {
    grupo, largo,
    ajustar(progreso, opacidad = 1, mostrarPunta = true) {
      const pr = Math.max(0, Math.min(largo + ancho, progreso));
      matBetun.uniforms.progreso.value = matSombra.uniforms.progreso.value = pr;
      matBetun.uniforms.opacidad.value = matSombra.uniforms.opacidad.value = opacidad;
      grupo.visible = opacidad > 0.001 && pr > 0.01;
      if (punta) {
        const activa = mostrarPunta && pr > 0.5 && pr < largo - 0.5;
        punta.visible = activa && grupo.visible;
        if (activa) {
          const { p, t } = tangenteEn(pr);
          punta.position.set(p.x, p.y, ancho * 0.55);
          punta.rotation.set(0, 0, Math.atan2(t.y, t.x));
        }
      }
    },
  };
}
