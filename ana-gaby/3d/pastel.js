// Pastel genérico de dos pisos, hecho en código (Three.js). No es un pastel de Ana Gaby ni una foto:
// es la "foto de referencia" ilustrada que el cliente sube en el paso A tu medida.
// El MISMO modelo se usa para esa foto y para el pastel 3D que se construye piso por piso en el video,
// así los dos son idénticos.
//
// Unidades: 1 = 10 cm aprox. El pastel se apoya en y = 0 (tabla plateada).
// Partes con nombre para animarlas en el video: tabla, piso1, piso1Conchas, piso1Perlas, piso1Guirnaldas,
// piso2, piso2Conchas, piso2Perlas, cerezas.

export const PALETA = {
  betunRosa: '#EDB3BD',
  betunCrema: '#F8E9DF',
  pipingBlanco: '#FFFAF6',
  pipingRosa: '#E39AA8',
  cereza: '#9C0E27',
  tallo: '#4F3A1E',
  plata: '#D5D6DC',
};

export const MEDIDAS = {
  tabla: { r: 1.24, alto: 0.045 },
  piso1: { r: 1.0, alto: 0.8, borde: 0.07 },
  piso2: { r: 0.64, alto: 0.6, borde: 0.055 },
};

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Rayado de peine (betún peinado en vertical), como relieve.
function texturaPeine(THREE) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 8;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 8);
  for (let x = 0; x < 256; x++) {
    const v = 0.5 + 0.5 * Math.cos((x / 256) * Math.PI * 2);
    const s = Math.round(255 * Math.pow(v, 0.8));
    for (let y = 0; y < 8; y++) { const i = (y * 256 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = s; img.data[i + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(64, 1);
  t.anisotropy = 8;
  return t;
}

// Grano fino del betún (para que no se vea plástico).
function texturaGrano(THREE, semilla = 7) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  let s = semilla;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 256 * 256; i++) { const v = 118 + rnd() * 20; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

function matBetun(THREE, color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.56, metalness: 0,
    sheen: 0.6, sheenRoughness: 0.42, sheenColor: new THREE.Color('#ffffff'),
    clearcoat: 0.16, clearcoatRoughness: 0.32,
    ...extra,
  });
}

// Costado del piso: perfil con canto redondeado arriba (el betún nunca tiene esquinas vivas).
function costadoPiso(THREE, r, alto, borde) {
  // De abajo hacia arriba: así el torno genera las caras hacia fuera.
  const pts = [new THREE.Vector2(r - 0.01, 0), new THREE.Vector2(r + 0.004, 0.012), new THREE.Vector2(r, alto * 0.5)];
  const pasos = 10;
  for (let i = 0; i <= pasos; i++) {
    const a = (Math.PI / 2) * (i / pasos);
    pts.push(new THREE.Vector2(r - borde + Math.cos(a) * borde, alto - borde + Math.sin(a) * borde));
  }
  return new THREE.LatheGeometry(pts, 180);
}

// Concha de duya estrella: gota con estrías, cabeza redonda y cola que se monta en la siguiente.
function geomConcha(THREE) {
  const g = new THREE.SphereGeometry(1, 40, 28);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const z = v.z; // eje de la concha (cola en -1, cabeza en +1)
    const radio = 0.32 + 0.68 * smooth(-1.05, 0.25, z) * (1 - 0.12 * smooth(0.4, 1, z));
    const fi = Math.atan2(v.y, v.x);
    const estria = 1 + 0.085 * Math.cos(fi * 9) * smooth(-0.9, 0.6, z) * (1 - smooth(0.75, 1, z));
    v.x *= radio * estria;
    v.y *= radio * estria;
    v.z = z * (z < 0 ? 1.35 : 1);
    // la cola se pega a la superficie (baja hacia el pastel)
    v.x -= 0.18 * smooth(0.2, -1.2, z);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function anilloConchas(THREE, { radio, y, n, escala, color, nombre, inclinacion = 0 }) {
  const geo = geomConcha(THREE);
  const mat = matBetun(THREE, color, { roughness: 0.48, clearcoat: 0.22 });
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.name = nombre;
  const o = new THREE.Object3D();
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    o.position.set(Math.cos(t) * radio, y, Math.sin(t) * radio);
    // x local = hacia fuera, y = arriba, z = tangente (sentido de la duya)
    const fuera = new THREE.Vector3(Math.cos(t), 0, Math.sin(t));
    const arriba = new THREE.Vector3(0, 1, 0);
    const tang = new THREE.Vector3(-Math.sin(t), 0, Math.cos(t));
    const mtx = new THREE.Matrix4().makeBasis(fuera, arriba, tang);
    o.quaternion.setFromRotationMatrix(mtx);
    o.rotateZ(inclinacion);
    o.scale.set(escala[0], escala[1], escala[2]);
    o.updateMatrix();
    m.setMatrixAt(k, o.matrix);
  }
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function anilloPerlas(THREE, { radio, y, n, r, color, nombre }) {
  const geo = new THREE.SphereGeometry(1, 24, 16);
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.5, clearcoatRoughness: 0.2 });
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.name = nombre;
  const o = new THREE.Object3D();
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2 + Math.PI / n;
    o.position.set(Math.cos(t) * radio, y, Math.sin(t) * radio);
    o.scale.setScalar(r);
    o.updateMatrix();
    m.setMatrixAt(k, o.matrix);
  }
  m.castShadow = true;
  return m;
}

// Guirnaldas de puntitos de betún (lambeth): cuelgan entre dos puntos del costado.
function guirnaldas(THREE, { radio, yArriba, caida, n, puntos, color, nombre }) {
  const geo = new THREE.SphereGeometry(1, 20, 14);
  const mat = matBetun(THREE, color, { roughness: 0.42, clearcoat: 0.25 });
  const total = n * puntos;
  const m = new THREE.InstancedMesh(geo, mat, total);
  m.name = nombre;
  const o = new THREE.Object3D();
  let k = 0;
  for (let s = 0; s < n; s++) {
    const a0 = (s / n) * Math.PI * 2, a1 = ((s + 1) / n) * Math.PI * 2;
    for (let j = 0; j < puntos; j++) {
      const u = (j + 0.5) / puntos;
      const t = a0 + (a1 - a0) * u;
      const panza = Math.sin(Math.PI * u);
      const y = yArriba - caida * panza;
      const rr = radio + 0.012 + 0.02 * panza;
      o.position.set(Math.cos(t) * rr, y, Math.sin(t) * rr);
      const tam = 0.022 + 0.022 * panza;
      o.scale.set(tam * 1.1, tam, tam);
      o.updateMatrix();
      m.setMatrixAt(k++, o.matrix);
    }
  }
  m.castShadow = true;
  return m;
}

function tablaPlateada(THREE) {
  const { r, alto } = MEDIDAS.tabla;
  const forma = new THREE.Shape();
  const n = 34, pasos = 360;
  for (let i = 0; i <= pasos; i++) {
    const t = (i / pasos) * Math.PI * 2;
    const rr = r - 0.045 * Math.pow(Math.abs(Math.cos((t * n) / 2)), 0.6) + 0.02;
    const x = Math.cos(t) * rr, y = Math.sin(t) * rr;
    if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(forma, { depth: alto, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: PALETA.plata, metalness: 1, roughness: 0.32 });
  const m = new THREE.Mesh(geo, mat);
  m.name = 'tabla';
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}

function cereza(THREE, semilla) {
  const grupo = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.085, 48, 32);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    // hoyuelo arriba donde nace el tallo, y una costura apenas marcada
    const hoyo = 0.022 * Math.pow(Math.max(0, n.y), 14);
    const costura = 0.0025 * Math.exp(-Math.pow(n.x * 9, 2)) * (1 - Math.abs(n.y));
    v.multiplyScalar(1 - hoyo / 0.085 - costura / 0.085);
    v.y *= 0.93;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ color: PALETA.cereza, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.2, sheenColor: new THREE.Color('#ff6b7d') });
  const bola = new THREE.Mesh(geo, mat);
  bola.castShadow = true;
  grupo.add(bola);
  const lado = semilla % 2 ? 1 : -1;
  const curva = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0.06, 0),
    new THREE.Vector3(0.008 * lado, 0.12, 0.0),
    new THREE.Vector3(0.035 * lado, 0.18, -0.015),
    new THREE.Vector3(0.075 * lado, 0.205, -0.025),
  );
  const tallo = new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.0085, 10, false),
    new THREE.MeshStandardMaterial({ color: PALETA.tallo, roughness: 0.55 }));
  tallo.castShadow = true;
  grupo.add(tallo);
  return grupo;
}

export function crearPastel(THREE) {
  const pastel = new THREE.Group();
  pastel.name = 'pastel';
  const peine = texturaPeine(THREE);
  const grano = texturaGrano(THREE);

  const tabla = tablaPlateada(THREE);
  pastel.add(tabla);
  const y0 = MEDIDAS.tabla.alto + 0.016;

  // --- Piso 1: rosa, peinado en vertical ---
  const P1 = MEDIDAS.piso1;
  const piso1 = new THREE.Group();
  piso1.name = 'piso1';
  piso1.position.y = y0;
  const lado1 = new THREE.Mesh(costadoPiso(THREE, P1.r, P1.alto, P1.borde), matBetun(THREE, PALETA.betunRosa, { bumpMap: peine, bumpScale: 1.1 }));
  const tapa1 = new THREE.Mesh(new THREE.CircleGeometry(P1.r - P1.borde + 0.002, 128).rotateX(-Math.PI / 2).translate(0, P1.alto, 0), matBetun(THREE, PALETA.betunRosa, { bumpMap: grano, bumpScale: 0.35 }));
  [lado1, tapa1].forEach((m) => { m.castShadow = true; m.receiveShadow = true; piso1.add(m); });
  pastel.add(piso1);

  const conchas1 = anilloConchas(THREE, { radio: P1.r + 0.03, y: y0 + 0.055, n: 42, escala: [0.07, 0.068, 0.12], color: PALETA.pipingBlanco, nombre: 'piso1Conchas' });
  const perlas1 = anilloPerlas(THREE, { radio: P1.r - 0.035, y: y0 + P1.alto + 0.006, n: 46, r: 0.03, color: PALETA.pipingBlanco, nombre: 'piso1Perlas' });
  const guir1 = guirnaldas(THREE, { radio: P1.r, yArriba: y0 + P1.alto - 0.1, caida: 0.24, n: 9, puntos: 13, color: PALETA.pipingBlanco, nombre: 'piso1Guirnaldas' });
  pastel.add(conchas1, perlas1, guir1);

  // --- Piso 2: crema, liso ---
  const P2 = MEDIDAS.piso2;
  const y2 = y0 + P1.alto + 0.012;
  const piso2 = new THREE.Group();
  piso2.name = 'piso2';
  piso2.position.y = y2;
  const lado2 = new THREE.Mesh(costadoPiso(THREE, P2.r, P2.alto, P2.borde), matBetun(THREE, PALETA.betunCrema, { bumpMap: grano, bumpScale: 0.3 }));
  const tapa2 = new THREE.Mesh(new THREE.CircleGeometry(P2.r - P2.borde + 0.002, 128).rotateX(-Math.PI / 2).translate(0, P2.alto, 0), matBetun(THREE, PALETA.betunCrema, { bumpMap: grano, bumpScale: 0.3 }));
  [lado2, tapa2].forEach((m) => { m.castShadow = true; m.receiveShadow = true; piso2.add(m); });
  pastel.add(piso2);

  const conchas2 = anilloConchas(THREE, { radio: P2.r + 0.028, y: y2 + 0.05, n: 30, escala: [0.062, 0.06, 0.105], color: PALETA.pipingRosa, nombre: 'piso2Conchas' });
  const perlas2 = anilloPerlas(THREE, { radio: P2.r - 0.03, y: y2 + P2.alto + 0.006, n: 32, r: 0.027, color: PALETA.pipingRosa, nombre: 'piso2Perlas' });
  pastel.add(conchas2, perlas2);

  // --- Cerezas arriba ---
  const cerezas = new THREE.Group();
  cerezas.name = 'cerezas';
  const yTop = y2 + P2.alto + 0.07;
  const n = 5;
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2 + 0.35;
    const c = cereza(THREE, k);
    c.position.set(Math.cos(t) * 0.34, yTop, Math.sin(t) * 0.34);
    c.rotation.y = -t + Math.PI / 2;
    c.name = `cereza${k}`;
    cerezas.add(c);
  }
  pastel.add(cerezas);

  pastel.userData.altura = yTop + 0.3;
  return pastel;
}
