// Manga pastelera 3D: bolsa translúcida con betún rosa adentro y boquilla de estrella metálica.
// La punta sigue a la cabeza de la línea de betún; aprieta (se encoge un poco) al empezar.
import * as THREE from 'three';
import { COLOR_BETUN } from './betun.js';

export function crearManga({ largo = 300 } = {}) {
  const grupo = new THREE.Group();
  grupo.name = 'manga';
  const eje = new THREE.Group(); // el eje de la manga es +Y desde la punta
  grupo.add(eje);

  // Perfil de la bolsa: angosta en la boquilla, ancha arriba y fruncida al final.
  const perfil = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const r = 9 + 70 * Math.pow(Math.sin(Math.min(1, t * 1.15) * Math.PI / 2), 1.35) * (t > 0.86 ? 1 - (t - 0.86) * 4.6 : 1);
    perfil.push(new THREE.Vector2(Math.max(6, r), 24 + t * largo));
  }
  const bolsa = new THREE.Mesh(new THREE.LatheGeometry(perfil, 64), new THREE.MeshPhysicalMaterial({
    color: '#fffaf8', roughness: 0.32, metalness: 0, transmission: 0.62, thickness: 6, ior: 1.38,
    transparent: true, opacity: 0.92, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide,
  }));
  eje.add(bolsa);
  const relleno = new THREE.Mesh(new THREE.LatheGeometry(perfil.slice(0, 32).map((v) => new THREE.Vector2(v.x * 0.82, v.y)), 48),
    new THREE.MeshStandardMaterial({ color: COLOR_BETUN.base, roughness: 0.55 }));
  eje.add(relleno);
  // Pliegues sutiles: tiras un poco más opacas a lo largo de la bolsa.
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const tira = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, largo * 0.8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, roughness: 0.4 }));
    tira.position.set(Math.cos(a) * 46, 24 + largo * 0.5, Math.sin(a) * 46);
    eje.add(tira);
  }
  // Boquilla de estrella metálica.
  const estrella = new THREE.Shape();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = i % 2 ? 6.5 : 10;
    if (i === 0) estrella.moveTo(Math.cos(a) * r, Math.sin(a) * r); else estrella.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const metal = new THREE.MeshStandardMaterial({ color: '#dcd8da', metalness: 1, roughness: 0.24 });
  const pico = new THREE.Mesh(new THREE.ExtrudeGeometry(estrella, { depth: 10, bevelEnabled: false }), metal);
  pico.rotation.x = -Math.PI / 2;
  eje.add(pico);
  const cono = new THREE.Mesh(new THREE.CylinderGeometry(10, 15, 22, 32, 1, true), metal);
  cono.position.y = 18;
  eje.add(cono);

  // Inclinación: la punta abajo, la bolsa hacia arriba a la derecha y hacia la cámara.
  eje.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.42, 0.72, 0.55).normalize());
  return {
    grupo, bolsa, relleno, eje,
    // punta: posición de la boquilla en el mundo; aprieta: 0–1
    colocar(punta, aprieta = 0, escala = 1) {
      grupo.position.copy(punta);
      grupo.scale.setScalar(escala);
      const s = 1 - 0.06 * aprieta;
      bolsa.scale.set(s, 1 + 0.02 * aprieta, s);
      relleno.scale.set(s, 1, s);
    },
  };
}
