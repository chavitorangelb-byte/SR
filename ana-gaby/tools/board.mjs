// Tableros de revisión de la fase 0 (vista de celular) a partir de las capturas de tools/test_web.mjs.
// Uso: node tools/board.mjs   → review/fase0/tablero_*.jpg
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'review', 'fase0');
const FONTS = path.join(ROOT, 'web', 'fonts');

const BOARDS = [
  { file: 'tablero_1_portada_catalogo.jpg', title: 'Portada y catálogo', cols: 4, items: [
    ['01_portada', 'Portada', 'Su local con el letrero, 5.0 en Google y el estado en vivo'],
    ['02_catalogo_galletas', 'Catálogo · Galletas', 'Sus fotos, nombre genérico y «$ —»'],
    ['03_catalogo_pasteles', 'Catálogo · Pasteles', 'La cuadrícula se reacomoda con resorte'],
    ['03_catalogo_postres', 'Catálogo · Postres', 'Cupcakes, tarta y mesas de postres'],
  ] },
  { file: 'tablero_2_a_tu_medida.jpg', title: 'A tu medida: de la foto al WhatsApp', cols: 5, items: [
    ['04_medida_vacio', 'Mándanos la foto', 'Los mismos datos que pide su WhatsApp'],
    ['06_medida_foto', 'Foto de referencia', 'Vista previa con barra de carga'],
    ['07_fecha_calendario', 'Fecha y hora', 'Domingo y lunes cerrados, como su horario'],
    ['08_medida_lleno', 'Mensaje del pastel', '«Feliz cumpleaños» con contador'],
    ['09_mensaje', 'Tu pedido, en un mensaje', 'Abre WhatsApp al 449 406 3325 ya escrito'],
  ] },
  { file: 'tablero_3_confianza_visita.jpg', title: 'Confianza, visita y pruebas', cols: 4, items: [
    ['10_resenas', 'Lo que dicen de Ana Gaby', 'Reseñas reales de Google, sin nombres'],
    ['11_visitanos', 'Visítanos', 'Mapa estilizado con pin en Sierra Hermosa 111'],
    ['05_medida_errores', 'Validación', 'No deja enviar sin foto o idea, personas y fecha'],
    ['14_demo', 'Modo demo', 'Muestra el mensaje sin escribirle al negocio'],
  ] },
];

const font = (f) => `url(file://${path.join(FONTS, f)})`;
const css = `
@font-face{font-family:C;font-style:italic;font-weight:600;src:${font('cormorant-garamond-latin-600-italic.woff2')}}
@font-face{font-family:D;font-weight:400;src:${font('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${font('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
html{background:#1E1A1B}
body{width:1080px;padding:56px 52px 54px;background:radial-gradient(120% 900px at 50% 0%,#3A2228 0%,#1E1A1B 62%) no-repeat #1E1A1B;color:#FBF5F3;font-family:D}
header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:40px}
.k{font:600 12px/1 D;letter-spacing:.2em;text-transform:uppercase;color:#E6A3B0}
h1{margin-top:12px;font:600 italic 52px/1 C;letter-spacing:-.01em}
.r{text-align:right;font:400 14px/1.5 D;color:rgba(251,245,243,.62)}
.r b{display:block;font:600 italic 22px/1.2 C;color:#FBF5F3;margin-bottom:4px}
.g{display:grid;gap:40px 26px}
figure{display:grid;gap:14px;align-content:start}
.ph{border-radius:34px;padding:6px;background:linear-gradient(160deg,rgba(255,255,255,.24),rgba(255,255,255,.05));box-shadow:0 40px 70px -40px rgba(0,0,0,.9),inset 0 0 0 1px rgba(255,255,255,.14)}
.ph img{display:block;width:100%;border-radius:29px}
figcaption b{display:block;font:600 15.5px/1.25 D}
figcaption span{display:block;margin-top:4px;font:400 13px/1.4 D;color:rgba(251,245,243,.64)}
footer{margin-top:42px;padding-top:18px;border-top:1px solid rgba(251,245,243,.12);display:flex;justify-content:space-between;font:400 12.5px/1.4 D;color:rgba(251,245,243,.5)}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 600 }, deviceScaleFactor: 2 });
const tmp = path.join(SHOTS, '_tablero_tmp.html');
let n = 0;
for (const b of BOARDS) {
  const figs = b.items.map(([f, t, d]) => `<figure><div class="ph"><img src="file://${path.join(SHOTS, f + '.png')}"></div><figcaption><b>${++n} · ${t}</b><span>${d}</span></figcaption></figure>`).join('');
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}</style><body>
    <header><div><p class="k">Ana Gaby Repostería · Fase 0</p><h1>${b.title}</h1></div>
    <div class="r"><b>Página real en vista de celular</b>390 × 844 · capturas de Playwright</div></header>
    <section class="g" style="grid-template-columns:repeat(${b.cols},1fr)">${figs}</section>
    <footer><span>Demo de cortesía de Elevate Negocios · pieza no oficial</span><span>Datos: Instagram @anagaby.reposteria y su ficha de Google</span></footer>
  </body></html>`;
  fs.writeFileSync(tmp, html);
  await page.goto(`file://${tmp}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const ok = await page.evaluate(() => [...document.images].every((i) => i.naturalWidth > 0) && document.fonts.check('italic 600 20px C'));
  if (!ok) throw new Error(`${b.file}: no cargaron las capturas o las fuentes`);
  await page.screenshot({ path: path.join(SHOTS, b.file), fullPage: true, type: 'jpeg', quality: 86 });
  console.log('✔', b.file);
}
fs.unlinkSync(tmp);
await browser.close();
