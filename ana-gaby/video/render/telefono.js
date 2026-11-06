// Celular de cristal genérico: cuerpo de cristal con grosor y bisel (refracta lo que tiene detrás), borde negro
// fino alrededor de la pantalla, pantalla con la captura real de la página (sin tono, colores exactos) y un reflejo
// suave encima que se mueve con el giro. Sin marca, sin muesca de ningún fabricante.
import * as THREE from 'three';
import { linealDe } from './util.js';

export const CSS = { ancho: 390, alto: 844, barra: 47 };
export const TEX = { ancho: 1170, alto: 2532 }; // textura de pantalla a 3x

function rectRedondo(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
export { rectRedondo };

const SDF = /* glsl */`
float sdRect(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r; }`;

export function crearTelefono({ k = 1.4333 } = {}) {
  // k = px de diseño (cuadro de 1080 x 1920) por px CSS de la página, con el celular al 65 % del alto.
  const Ws = CSS.ancho * k, Hs = CSS.alto * k;
  const rs = 47 * k; // radio de la pantalla
  const bisel = 24;
  const Wb = Ws + 2 * bisel, Hb = Hs + 2 * bisel, rb = rs + bisel;
  const T = 56; // grosor
  const grupo = new THREE.Group();
  grupo.name = 'telefono';

  // Halo oscuro detrás: separa el celular del fondo.
  const cHalo = document.createElement('canvas');
  cHalo.width = 256; cHalo.height = 512;
  const gh = cHalo.getContext('2d');
  const grd = gh.createRadialGradient(128, 256, 30, 128, 256, 250);
  grd.addColorStop(0, 'rgba(8,5,6,0.55)'); grd.addColorStop(0.6, 'rgba(8,5,6,0.22)'); grd.addColorStop(1, 'rgba(8,5,6,0)');
  gh.fillStyle = grd; gh.fillRect(0, 0, 256, 512);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(Wb * 1.7, Hb * 1.35), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cHalo), transparent: true, depthWrite: false }));
  halo.position.z = -T / 2 - 60;
  halo.renderOrder = -5;
  grupo.add(halo);

  // Cuerpo de cristal (marco con hueco para la pantalla).
  const forma = rectRedondo(Wb, Hb, rb);
  forma.holes.push(rectRedondo(Ws + 28, Hs + 28, rs + 14)); // el bisel encoge el hueco 9 px por lado: queda en Ws + 10
  const geoCuerpo = new THREE.ExtrudeGeometry(forma, { depth: T - 20, bevelEnabled: true, bevelThickness: 10, bevelSize: 9, bevelSegments: 10, curveSegments: 56 });
  geoCuerpo.translate(0, 0, -(T - 20) / 2);
  const cristal = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0, roughness: 0.16, transmission: 1, thickness: 48, ior: 1.5,
    attenuationColor: new THREE.Color('#F2B3C0'), attenuationDistance: 110,
    specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.1,
    sheen: 0.55, sheenColor: new THREE.Color('#FFD9E0'), sheenRoughness: 0.35,
  });
  const cuerpo = new THREE.Mesh(geoCuerpo, cristal);
  grupo.add(cuerpo);

  // Borde negro fino alrededor de la pantalla y fondo del módulo.
  const borde = new THREE.Mesh(new THREE.ShapeGeometry(rectRedondo(Ws + 12, Hs + 12, rs + 6), 48), new THREE.MeshBasicMaterial({ color: new THREE.Color('#0c090a') }));
  borde.position.z = T / 2 - 1.6;
  grupo.add(borde);

  // Pantalla: textura de la página (lienzo 1170 x 2532) con esquinas redondas antialias y encendido.
  const lienzo = document.createElement('canvas');
  lienzo.width = TEX.ancho; lienzo.height = TEX.alto;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, TEX.ancho, TEX.alto);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  const matPantalla = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { map: { value: tex }, tam: { value: new THREE.Vector2(Ws, Hs) }, radio: { value: rs }, encendido: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      ${SDF}
      uniform sampler2D map; uniform vec2 tam; uniform float radio, encendido; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - 0.5) * tam;
        float d = sdRect(p, tam * 0.5, radio);
        float a = 1.0 - smoothstep(-fwidth(d), fwidth(d), d);
        vec3 c = texture2D(map, vUv).rgb * encendido;
        gl_FragColor = vec4(c * a, a);
      }`,
  });
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(Ws, Hs), matPantalla);
  pantalla.position.z = T / 2 - 1;
  pantalla.renderOrder = 2;
  grupo.add(pantalla);

  // Reflejo del cristal frontal: banda diagonal suave que se desplaza con el giro (aditivo, muy tenue).
  const matBrillo = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tam: { value: new THREE.Vector2(Ws, Hs) }, radio: { value: rs }, corrimiento: { value: 0 }, fuerza: { value: 1 }, cLuz: { value: new THREE.Vector3(...linealDe('#fff4ee')) } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      ${SDF}
      uniform vec2 tam; uniform float radio, corrimiento, fuerza; uniform vec3 cLuz; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - 0.5) * tam;
        float d = sdRect(p, tam * 0.5, radio);
        float a = 1.0 - smoothstep(-fwidth(d), fwidth(d), d);
        float x = dot(vUv - 0.5, normalize(vec2(1.0, 1.6))) - corrimiento;
        float banda = exp(-x * x / 0.006) * 0.05 + exp(-(x + 0.16) * (x + 0.16) / 0.0012) * 0.025;
        float velo = 0.012 * smoothstep(0.2, 1.0, vUv.y);
        gl_FragColor = vec4(cLuz * (banda + velo) * a * fuerza, 0.0);
      }`,
  });
  const brillo = new THREE.Mesh(new THREE.PlaneGeometry(Ws, Hs), matBrillo);
  brillo.position.z = T / 2 + 0.8;
  brillo.renderOrder = 6;
  grupo.add(brillo);

  // Capa sobre la pantalla para piezas 2D pegadas a la interfaz (betún, sombras de las tarjetas).
  const capa = new THREE.Group();
  capa.position.z = T / 2 + 0.4;
  grupo.add(capa);

  // px CSS del viewport de la página → coordenadas locales de la pantalla.
  const local = (x, y) => new THREE.Vector2((x - CSS.ancho / 2) * k, (CSS.alto / 2 - (y + CSS.barra)) * k);

  return { grupo, cuerpo, cristal, pantalla, matPantalla, brillo, matBrillo, capa, lienzo, ctx, tex, local, k, Ws, Hs, Wb, Hb, rb, rs, T };
}

// Barra de estado y barra de inicio genéricas, dibujadas sobre la textura (12:00, señal, batería; sin operador).
export function dibujarSistema(ctx, img) {
  const s = 3;
  ctx.drawImage(img, 0, 0, img.width, 1, 0, 0, TEX.ancho, CSS.barra * s); // continúa el color de la barra de la página
  ctx.drawImage(img, 0, CSS.barra * s);
  ctx.fillStyle = '#1E1A1B';
  ctx.font = `600 ${15.5 * s}px "DM Sans"`;
  ctx.textBaseline = 'middle';
  ctx.fillText('12:00', 30 * s, 25 * s);
  // señal
  for (let i = 0; i < 4; i++) {
    const h = (4 + i * 2.6) * s;
    ctx.beginPath(); ctx.roundRect((300 + i * 5.2) * s, 30 * s - h, 3.2 * s, h, 1 * s); ctx.fill();
  }
  // wifi genérico (tres arcos)
  ctx.lineWidth = 2 * s; ctx.strokeStyle = '#1E1A1B'; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(331 * s, 31 * s, (3 + i * 3.4) * s, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); }
  // batería
  ctx.lineWidth = 1.3 * s; ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.roundRect(346 * s, 19.5 * s, 24 * s, 11.5 * s, 3.2 * s); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.roundRect(348 * s, 21.5 * s, 18 * s, 7.5 * s, 1.8 * s); ctx.fill();
  ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.roundRect(371 * s, 23.5 * s, 1.8 * s, 4 * s, 1 * s); ctx.fill(); ctx.globalAlpha = 1;
  // barra de inicio
  ctx.fillStyle = 'rgba(30,26,27,0.78)';
  ctx.beginPath(); ctx.roundRect((CSS.ancho / 2 - 67) * s, (CSS.alto - 13) * s, 134 * s, 5 * s, 2.5 * s); ctx.fill();
}
