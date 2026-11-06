// Kinetic type por glifo: cada letra es un plano con su propia textura (respeta los rasgos de la itálica que
// sobresalen). Entra subiendo 24 px desde desenfoque y opacidad 0, escalonada 28 ms; sale hacia arriba.
// Posición en px del cuadro de diseño (1080 x 1920, y hacia abajo) con y = línea base.
import * as THREE from 'three';
import { clamp, smooth, easeOutBack, linealDe } from './util.js';

const ESCALONADO = 1.68; // 28 ms a 60 fps

export function crearPalabra({ texto, x, y, px, fuente = 'italic 600', familia = 'Cormorant Garamond', color = '#FBF5F3', resolucion = 2, tracking = 0.035 }) {
  const grupo = new THREE.Group();
  grupo.name = `tipo:${texto}`;
  const c = document.createElement('canvas').getContext('2d');
  const tam = px * resolucion;
  c.font = `${fuente} ${tam}px "${familia}"`;
  const glifos = [];
  let pen = 0;
  const chars = [...texto];
  const ancho = (str) => c.measureText(str).width;
  chars.forEach((ch, i) => {
    const prev = chars.slice(0, i).join('');
    const avance = ancho(prev + ch) - ancho(prev);
    if (ch.trim()) {
      const m = c.measureText(ch);
      const pad = Math.ceil(tam * 0.12);
      const izq = Math.ceil(m.actualBoundingBoxLeft), der = Math.ceil(m.actualBoundingBoxRight);
      const asc = Math.ceil(m.actualBoundingBoxAscent), desc = Math.ceil(m.actualBoundingBoxDescent);
      const cw = izq + der + 2 * pad, ch2 = asc + desc + 2 * pad;
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch2;
      const g = cv.getContext('2d');
      g.font = c.font; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
      g.fillText(ch, pad + izq, pad + asc);
      const tex = new THREE.CanvasTexture(cv);
      tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: { map: { value: tex }, opacidad: { value: 0 }, desenfoque: { value: 0 }, color: { value: new THREE.Vector3(...linealDe(color)) } },
        vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`uniform sampler2D map; uniform float opacidad, desenfoque; uniform vec3 color; varying vec2 vUv;
          void main(){ float a = texture2D(map, vUv, desenfoque).a * opacidad; gl_FragColor = vec4(color * a, a); }`,
      });
      const s = 1 / resolucion;
      const plano = new THREE.Mesh(new THREE.PlaneGeometry(cw * s, ch2 * s), mat);
      // Centro del plano en coordenadas de diseño (y hacia abajo) → escena (y hacia arriba, origen al centro).
      const cx = x + pen - (pad + izq) * s + (cw * s) / 2;
      const cy = y - (pad + asc) * s + (ch2 * s) / 2;
      const base = new THREE.Vector3(cx - 540, 960 - cy, 0);
      plano.position.copy(base);
      plano.renderOrder = 20;
      grupo.add(plano);
      glifos.push({ plano, mat, base, i: glifos.length });
    }
    pen += avance / resolucion + tracking * px;
  });
  return { grupo, glifos, ancho: pen };
}

// fEntra: cuadro en que la palabra queda asentada (aterriza); fSale: cuadro en que empieza a salir.
export function animarPalabra(p, f, fEntra, fSale) {
  for (const g of p.glifos) {
    const q = clamp((f - (fEntra - 14 + g.i * ESCALONADO)) / 22);
    const sale = clamp((f - (fSale + g.i * 1.1)) / 15);
    const subida = 24 * (1 - easeOutBack(q, 1.15)) - 20 * sale * sale;
    g.plano.position.set(g.base.x, g.base.y - subida, 0);
    g.mat.uniforms.opacidad.value = smooth(0, 0.55, q) * (1 - smooth(0, 1, sale));
    g.mat.uniforms.desenfoque.value = 3.2 * (1 - smooth(0, 0.75, q)) + 2.4 * sale;
    g.plano.visible = g.mat.uniforms.opacidad.value > 0.002;
  }
}
