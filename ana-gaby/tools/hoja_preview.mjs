// Fase 6: hoja de contactos del preview (12 cuadros clave renderizados a 1080 × 1920 + mediciones del audio).
// Uso: node video/render.mjs --fotos 60,176,… --ancho 1080 --alto 1920 --sub 8 --out review/fase6/_cuadros/p.png
//      node tools/hoja_preview.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'review', 'fase6');
const CUAD = path.join(DIR, '_cuadros');

export const CUADROS = [
  [60, 'Hook', 'La manga escribe «galletas aguascalientes» con betún en la barra de cristal'],
  [176, 'Llegada', 'La última letra se vuelve la línea que dibuja el celular'],
  [262, 'Portada', 'Push-in a su portada real; el betún subraya «5.0 en Google»'],
  [420, 'Catálogo', 'Sus tarjetas salen al espacio 3D con borde de conchitas'],
  [705, 'A tu medida', 'La foto de referencia sale y el betún traza el pastel'],
  [826, 'Pastel 3D', 'El mismo pastel de dos pisos, armado en 3D'],
  [965, 'Pedido', 'Personas, fecha y «Feliz cumpleaños» con teclado y sugerencias'],
  [1012, 'Enviar', 'El botón «Enviar por WhatsApp» salta en 3D'],
  [1090, 'Mensaje', 'Push-in al mensaje listo; el betún subraya la frase de la foto'],
  [1262, 'Reseñas', 'Tres reseñas reales en abanico, sin nombres · «HABLAN POR TI»'],
  [1400, 'Cierre', '«Lo que ya se antoja / también se busca.» en letra de betún'],
  [1640, 'End card', 'Su nombre en betún, su letrero en placa de cristal y la leyenda'],
];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mez = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'build', 'mezcla.json'), 'utf8'));
  const cues = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'build', 'cues_sfx.json'), 'utf8'));
  const fuente = (f) => `url(file://${path.join(ROOT, 'web', 'fonts', f)})`;
  const css = `
@font-face{font-family:C;font-style:italic;font-weight:600;src:${fuente('cormorant-garamond-latin-600-italic.woff2')}}
@font-face{font-family:D;font-weight:400;src:${fuente('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${fuente('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
html{background:#1E1A1B}
body{width:1080px;padding:52px 48px 48px;background:radial-gradient(120% 900px at 50% 0%,#3A2228 0%,#1E1A1B 62%) no-repeat #1E1A1B;color:#FBF5F3;font-family:D}
.k{font:600 12px/1 D;letter-spacing:.2em;text-transform:uppercase;color:#E6A3B0}
h1{margin:12px 0 6px;font:600 italic 50px/1 C}
.sub{font:400 15px/1.5 D;color:rgba(251,245,243,.66);margin-bottom:30px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:26px 18px}
figure{display:grid;gap:9px;align-content:start}
img{display:block;width:100%;border-radius:12px;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
b{font:600 14px/1.25 D}
span{display:block;font:400 12.5px/1.4 D;color:rgba(251,245,243,.66)}
.audio{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:34px;padding-top:24px;border-top:1px solid rgba(251,245,243,.12)}
.audio h2{grid-column:1/-1;font:600 italic 30px/1.05 C}
.dato b{display:block;font:600 26px/1.1 D;color:#FBF5F3}
.dato span{margin-top:4px}
footer{margin-top:30px;padding-top:14px;border-top:1px solid rgba(251,245,243,.12);display:flex;justify-content:space-between;font:400 12px/1.4 D;color:rgba(251,245,243,.5)}
`;
  const figs = CUADROS.map(([f, t, d]) => `<figure><img src="file://${path.join(CUAD, `p_f${f}.png`)}"><figcaption><b>${(f / 60).toFixed(2)} s · ${t}</b><span>${d}</span></figcaption></figure>`).join('');
  const datos = [
    [`${mez.master_LUFS.toFixed(1)} LUFS`, 'Master integrado (objetivo −14)'],
    [`${mez.master_TP_dBFS.toFixed(1)} dBTP`, 'Pico verdadero (techo −1.25)'],
    [`${mez.musica_bajo_cada_palabra_peor_dB.toFixed(1)} dB`, 'Música bajo la palabra más justa (mínimo 12)'],
    [`${mez.sfx_bajo_cada_palabra_peor_dB.toFixed(1)} dB`, 'SFX bajo la palabra más justa (mínimo 6)'],
    [`${cues.total} cues`, `${cues.tipos.length} sonidos distintos, todos sintetizados en código`],
    ['98 BPM · Re', 'Música original: guitarra de nylon, cucharas, glockenspiel, shaker, bajo y palmas'],
  ].map(([v, t]) => `<div class="dato"><b>${v}</b><span>${t}</span></div>`).join('');
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}</style><body>
<p class="k">Ana Gaby Repostería · Fase 6</p><h1>Preview completo · 28 s</h1>
<p class="sub">12 cuadros clave renderizados a 1080 × 1920 con motion blur de 8 subcuadros (el preview va a 540 × 960 y 30 fps). La pantalla es la captura real de su página a 3x.</p>
<section class="g">${figs}</section>
<section class="audio"><h2>Audio</h2>${datos}</section>
<footer><span>Demo de cortesía de Elevate Negocios · pieza no oficial</span><span>Render en código: Three.js + Playwright + ffmpeg</span></footer>
</body></html>`;
  const f = path.join(DIR, '_hoja.html');
  fs.writeFileSync(f, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 800 }, deviceScaleFactor: 2 });
  await p.goto(`file://${f}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await p.screenshot({ path: path.join(DIR, 'hoja_preview.jpg'), fullPage: true, type: 'jpeg', quality: 86 });
  await b.close();
  fs.unlinkSync(f);
  console.log('✔ review/fase6/hoja_preview.jpg');
}
