// Escritura con betún: convierte texto en trazos (fuente de un solo trazo EMS Allure, o el esqueleto de
// «Ana Gaby Repostería» en Cormorant) y los pipea letra por letra con crearBetun.
import * as THREE from 'three';
import { crearBetun } from './betun.js';
import { clamp } from './util.js';

export async function cargarEMS(url) {
  const doc = new DOMParser().parseFromString(await (await fetch(url)).text(), 'image/svg+xml');
  const font = doc.querySelector('font');
  const upm = +doc.querySelector('font-face').getAttribute('units-per-em');
  const adv0 = +font.getAttribute('horiz-adv-x');
  const glifos = {};
  for (const g of doc.querySelectorAll('glyph')) {
    const u = g.getAttribute('unicode');
    if (u !== null) glifos[u] = { adv: +(g.getAttribute('horiz-adv-x') || adv0), d: g.getAttribute('d') || '' };
  }
  return { upm, glifos };
}

// "M x y L x y … C x1 y1 x2 y2 x y" → lista de polilíneas (unidades de la fuente, y hacia arriba).
function polilineas(d) {
  const t = d.match(/[MLC]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  const out = [];
  let cur = null, cmd = null, i = 0, p = [0, 0];
  const num = () => +t[i++];
  while (i < t.length) {
    if (/[MLC]/i.test(t[i])) cmd = t[i++].toUpperCase();
    if (cmd === 'M') { p = [num(), num()]; cur = [p.slice()]; out.push(cur); cmd = 'L'; }
    else if (cmd === 'L') { p = [num(), num()]; cur.push(p.slice()); }
    else if (cmd === 'C') {
      const c1 = [num(), num()], c2 = [num(), num()], e = [num(), num()];
      for (let k = 1; k <= 8; k++) {
        const s = k / 8, a = (1 - s) ** 3, b = 3 * (1 - s) ** 2 * s, c = 3 * (1 - s) * s * s, dd = s ** 3;
        cur.push([a * p[0] + b * c1[0] + c * c2[0] + dd * e[0], a * p[1] + b * c1[1] + c * c2[1] + dd * e[1]]);
      }
      p = e;
    } else i++;
  }
  return out.filter((l) => l.length > 1);
}

// Trazos del texto: [{ letra, puntos: [[x, y] …] }] en unidades de em (y hacia arriba), y el ancho total en em.
export function trazosEMS(ems, texto) {
  const trazos = [];
  let pen = 0, letra = 0;
  for (const ch of texto) {
    const g = ems.glifos[ch] || ems.glifos['?'];
    for (const l of polilineas(g.d)) trazos.push({ letra, puntos: l.map(([x, y]) => [(pen + x) / ems.upm, y / ems.upm]) });
    pen += g.adv;
    if (ch.trim()) letra++;
  }
  return { trazos, ancho: pen / ems.upm, letras: letra };
}

// Trazos del esqueleto (JSON de tools/esqueleto_nombre.mjs): cada trazo cuenta como su propia "letra".
export function trazosEsqueleto(j) {
  return { trazos: j.trazos.map((p, i) => ({ letra: i, puntos: p })), ancho: j.ancho_em, letras: j.trazos.length };
}

// Arma los listones de betún de un texto. `em`: px por em; (x0, yBase): origen en el plano (y hacia arriba).
// Devuelve { grupo, escribir(f), cabeza } — escribir(f) pipea en orden entre fIni y fFin (por largo de trazo).
export function crearEscritura({ trazos, em, x0, yBase, ancho = 9, fIni, fFin, nombre = 'escritura', boquilla = true }) {
  const grupo = new THREE.Group();
  grupo.name = nombre;
  const piezas = trazos.map((t, i) => {
    const pts = t.puntos.map(([x, y]) => new THREE.Vector2(x0 + x * em, yBase + y * em));
    const b = crearBetun({ puntos: pts, ancho, boquilla, nombre: `${nombre}-${i}` });
    grupo.add(b.grupo);
    return { b, largo: b.largo, pts };
  });
  const total = piezas.reduce((s, p) => s + p.largo, 0);
  let acum = 0;
  for (const p of piezas) { p.desde = acum / total; acum += p.largo; p.hasta = acum / total; }
  const cabeza = new THREE.Vector3();
  return {
    grupo, piezas, cabeza,
    // progreso global 0–1 → cada trazo en su tramo; devuelve si alguno está pipeando (para la manga)
    escribir(q, opacidad = 1) {
      let activo = false;
      for (const p of piezas) {
        const s = clamp((q - p.desde) / Math.max(1e-6, p.hasta - p.desde));
        const pipeando = s > 0 && s < 1;
        p.b.ajustar(s * p.largo, opacidad, pipeando);
        if (pipeando) {
          activo = true;
          // posición de la punta (para que la manga la siga)
          let d = s * p.largo, i = 1;
          while (i < p.pts.length - 1 && d > p.pts[i - 1].distanceTo(p.pts[i])) { d -= p.pts[i - 1].distanceTo(p.pts[i]); i++; }
          const a = p.pts[i - 1], c = p.pts[i];
          const u = clamp(d / Math.max(1e-6, a.distanceTo(c)));
          cabeza.set(a.x + (c.x - a.x) * u, a.y + (c.y - a.y) * u, 0);
        }
      }
      if (!activo && q >= 1) { const u = piezas.at(-1).pts.at(-1); cabeza.set(u.x, u.y, 0); }
      return activo;
    },
    // progreso por letra (la búsqueda: cada letra en su cuadro de tecla)
    total,
  };
}

// Progreso global para escribir letra por letra: la letra i termina en tiempos[i] (cuadros).
export function progresoPorLetras(escritura, trazos, tiempos, f) {
  // fracción del total al terminar cada letra
  const porLetra = [];
  let acum = 0;
  const largos = escritura.piezas.map((p) => p.largo);
  for (let i = 0; i < tiempos.length; i++) {
    trazos.forEach((t, k) => { if (t.letra === i) acum += largos[k]; });
    porLetra.push(acum / escritura.total);
  }
  if (f <= tiempos[0] - 5.5) return 0;
  for (let i = 0; i < tiempos.length; i++) {
    const ini = i === 0 ? tiempos[0] - 5.5 : tiempos[i - 1];
    if (f <= tiempos[i]) {
      const a = i === 0 ? 0 : porLetra[i - 1];
      return a + (porLetra[i] - a) * clamp((f - ini) / (tiempos[i] - ini));
    }
  }
  return 1;
}
