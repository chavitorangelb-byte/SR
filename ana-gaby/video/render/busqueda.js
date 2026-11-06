// Barra de búsqueda de cristal genérica (sin logo de ningún buscador): losa de cristal con grosor, cara esmerilada,
// lupa genérica y «Buscar» que se desvanece cuando el betún empieza a escribir.
import * as THREE from 'three';
import { rectRedondo } from './telefono.js';
import { linealDe } from './util.js';

export function crearBusqueda({ ancho = 880, alto = 136 } = {}) {
  const grupo = new THREE.Group();
  grupo.name = 'busqueda';
  const r = alto / 2;
  const geo = new THREE.ExtrudeGeometry(rectRedondo(ancho, alto, r), { depth: 10, bevelEnabled: true, bevelThickness: 5, bevelSize: 5, bevelSegments: 6, curveSegments: 40 });
  geo.translate(0, 0, -15);
  const losa = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.22, transmission: 1, thickness: 18, ior: 1.45,
    attenuationColor: new THREE.Color('#f6d2d8'), attenuationDistance: 160, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.8,
  }));
  grupo.add(losa);

  // Cara esmerilada: blanco translúcido, más claro arriba, borde de 1 px y ruido del 2 %.
  const cara = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { tam: { value: new THREE.Vector2(ancho, alto) }, radio: { value: r }, opacidad: { value: 1 }, brillo: { value: 0 }, cLuz: { value: new THREE.Vector3(...linealDe('#fff6f3')) } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      float sdRect(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r; }
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      uniform vec2 tam; uniform float radio, opacidad, brillo; uniform vec3 cLuz; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - 0.5) * tam;
        float d = sdRect(p, tam * 0.5, radio);
        float a = 1.0 - smoothstep(-fwidth(d), fwidth(d), d);
        float borde = 1.0 - smoothstep(0.0, 1.6, abs(d + 1.0));
        float lleno = 0.10 + 0.06 * vUv.y + 0.02 * (rnd(gl_FragCoord.xy) - 0.5) + 0.08 * brillo;
        float alfa = (lleno + borde * 0.38) * a * opacidad;
        gl_FragColor = vec4(cLuz * alfa, alfa);
      }`,
  }));
  cara.position.z = 0.6;
  cara.renderOrder = 3;
  grupo.add(cara);

  // Lupa genérica y «Buscar» (DM Sans 40 px al 45 %).
  const cv = document.createElement('canvas');
  cv.width = ancho * 2; cv.height = alto * 2;
  const g = cv.getContext('2d');
  g.scale(2, 2);
  g.strokeStyle = 'rgba(255,248,245,0.78)'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.arc(70, alto / 2 - 5, 17, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(83, alto / 2 + 8); g.lineTo(98, alto / 2 + 23); g.stroke();
  const tIcono = new THREE.CanvasTexture(cv);
  tIcono.colorSpace = THREE.SRGBColorSpace;
  const icono = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: tIcono, transparent: true, depthWrite: false }));
  icono.position.z = 0.8; icono.renderOrder = 4;
  grupo.add(icono);
  const cp = document.createElement('canvas');
  cp.width = ancho * 2; cp.height = alto * 2;
  const gp = cp.getContext('2d');
  gp.scale(2, 2);
  gp.font = '400 40px "DM Sans"'; gp.fillStyle = 'rgba(255,248,245,0.45)'; gp.textBaseline = 'middle';
  gp.fillText('Buscar', 128, alto / 2 + 1);
  const tBuscar = new THREE.CanvasTexture(cp);
  tBuscar.colorSpace = THREE.SRGBColorSpace;
  const buscar = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: tBuscar, transparent: true, depthWrite: false }));
  buscar.position.z = 0.9; buscar.renderOrder = 4;
  grupo.add(buscar);

  const texto = new THREE.Group(); // aquí escribe el betún (coordenadas de la barra, origen al centro)
  texto.position.z = 1.4;
  grupo.add(texto);
  return { grupo, losa, cara, icono, buscar, texto, ancho, alto };
}
