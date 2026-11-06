// Fondo del video y entorno de reflejos.
// Fondo: tinta cálida #1E1A1B con degradado sutil a rosa muy oscuro #3A2027 (en el hook, chocolate #2A1C18),
// con manchas de luz rosas muy suaves que derivan: le dan al cristal algo que refractar. Ruido del 1 % contra el banding.
import * as THREE from 'three';
import { linealDe } from './util.js';

export function crearFondo(alto) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      cTinta: { value: new THREE.Vector3(...linealDe('#1E1A1B')) },
      cRosa: { value: new THREE.Vector3(...linealDe('#3A2027')) },
      cChoco: { value: new THREE.Vector3(...linealDe('#2A1C18')) },
      cLuz: { value: new THREE.Vector3(...linealDe('#E6A3B0')) },
      choco: { value: 0 },
      t: { value: 0 },
    },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; uniform vec3 cTinta, cRosa, cChoco, cLuz; uniform float choco, t;
      float mancha(vec2 p, vec2 c, float r){ return exp(-dot(p-c,p-c)/(r*r)); }
      void main(){
        vec2 p = vUv; p.x *= 0.5625;
        vec3 base = mix(cTinta, cChoco, choco);
        // degradado: rosa muy oscuro arriba, tinta abajo
        float g = smoothstep(0.15, 1.05, vUv.y);
        vec3 c = mix(base, mix(cRosa, cChoco * 1.15, choco), g * 0.85);
        // manchas de luz (muy suaves)
        float m = mancha(p, vec2(0.12 + 0.03*sin(t*0.21), 0.78 + 0.02*cos(t*0.17)), 0.20) * 0.55
                + mancha(p, vec2(0.48 + 0.02*cos(t*0.13), 0.30 + 0.03*sin(t*0.19)), 0.24) * 0.35
                + mancha(p, vec2(0.36, 0.95), 0.16) * 0.35;
        c += cLuz * m * 0.045;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}

// Entorno de estudio para los reflejos del cristal: cuarto oscuro con paneles de luz suaves.
export function crearEntorno(renderer) {
  const s = new THREE.Scene();
  const cuarto = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#140f10'), side: THREE.BackSide }));
  s.add(cuarto);
  const panel = (w, h, color, intensidad, pos, mira) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensidad), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(...mira);
    s.add(m);
  };
  panel(26, 12, '#fff3ea', 5.0, [-22, 26, 18], [0, 0, 0]); // luz principal cálida arriba a la izquierda
  panel(30, 18, '#fff1ec', 1.1, [-12, 16, 42], [0, 0, 0]); // caja suave detrás de la cámara: el frente del cristal la refleja
  panel(40, 3, '#ffffff', 2.4, [0, 34, 6], [0, 0, 0]); // tira de luz arriba
  panel(10, 28, '#ffd2da', 2.2, [32, 4, 10], [0, 0, 0]); // relleno rosa a la derecha
  panel(18, 6, '#e6a3b0', 1.4, [6, -30, 20], [0, 0, 0]); // rebote rosa abajo
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(s, 0.035).texture;
  pmrem.dispose();
  return tex;
}
