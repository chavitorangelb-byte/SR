// Tarjeta del catálogo que sale de la pantalla al espacio 3D. Su cara es el recorte exacto de la captura de la
// página (misma foto, mismo texto, mismos colores); fuera de la pantalla solo gana grosor, canto blanco y sombra.
import * as THREE from 'three';
import { rectRedondo } from './telefono.js';

export function crearTarjeta3D({ imagen, rect, k, dsf = 3, radioCss = 22 }) {
  const [x, y, w, h] = rect;
  const cw = Math.round(w * dsf), ch = Math.round(h * dsf);
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  cv.getContext('2d').drawImage(imagen, x * dsf, y * dsf, w * dsf, h * dsf, 0, 0, cw, ch);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 8;

  const W = w * k, H = h * k, prof = 6 * k, bt = 1.6;
  const uv = {
    generateTopUV(_g, v, a, b, c) { return [a, b, c].map((i) => new THREE.Vector2((v[i * 3] + W / 2) / W, (v[i * 3 + 1] + H / 2) / H)); },
    generateSideWallUV() { return [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1)]; },
  };
  const geo = new THREE.ExtrudeGeometry(rectRedondo(W, H, radioCss * k), { depth: prof, bevelEnabled: true, bevelThickness: bt, bevelSize: 1.2, bevelSegments: 3, curveSegments: 24, UVGenerator: uv });
  geo.translate(0, 0, -(prof + bt)); // la cara queda en z = 0, a ras de la pantalla
  const cara = new THREE.MeshBasicMaterial({ map: tex });
  const canto = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, metalness: 0 });
  const malla = new THREE.Mesh(geo, [cara, canto]);
  const grupo = new THREE.Group();
  grupo.add(malla);

  // Sombra de contacto sobre la pantalla (se abre y se aclara al subir).
  const sc = document.createElement('canvas');
  sc.width = 256; sc.height = Math.round(256 * (H / W));
  const g = sc.getContext('2d');
  g.filter = 'blur(14px)';
  g.fillStyle = 'rgba(40,20,26,1)';
  g.beginPath(); g.roundRect(40, 40, sc.width - 80, sc.height - 80, 26); g.fill();
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.32, H * 1.32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
  sombra.renderOrder = 4;
  return { grupo, malla, sombra, W, H };
}
