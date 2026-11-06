// Toques visibles sobre la pantalla: círculo de contacto de 44 px de interfaz, blanco al 35 %,
// que aparece, se sostiene y se abre al soltar. Se suma a la onda y al estado presionado reales de la página.
import * as THREE from 'three';
import { clamp, smooth } from './util.js';

export function crearToques(tel, lista) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const items = lista.map((t) => {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { a: { value: 0 } },
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`uniform float a; varying vec2 vUv;
        void main(){ float r = length(vUv - 0.5) * 2.0; float disco = 1.0 - smoothstep(0.86, 1.0, r); float anillo = smoothstep(0.7, 0.9, r) * (1.0 - smoothstep(0.92, 1.0, r));
          float al = (disco * 0.35 + anillo * 0.25) * a; gl_FragColor = vec4(vec3(1.0) * al, al); }`,
    });
    const m = new THREE.Mesh(geo, mat);
    const p = tel.local(t.x, t.y);
    m.position.set(p.x, p.y, 0.9);
    m.renderOrder = 12;
    m.visible = false;
    tel.capa.add(m);
    return { ...t, m, mat };
  });
  return {
    actualizar(f) {
      for (const t of items) {
        const entra = smooth(t.f - 3, t.f + 2, f), sale = clamp((f - (t.f + 6)) / 10);
        const a = entra * (1 - sale);
        t.m.visible = a > 0.003;
        t.mat.uniforms.a.value = a;
        t.m.scale.setScalar(44 * tel.k * (0.72 + 0.28 * entra + 0.22 * sale));
      }
    },
  };
}
