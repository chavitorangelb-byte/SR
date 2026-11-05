// Tableros de presentación (vista de celular) a partir de las capturas de tools/test_web.mjs.
// Uso: node tools/board.mjs
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
  { file: 'tablero_1_compra.jpg', title: 'Del catálogo al WhatsApp', items: [
    ['01_portada', 'Portada', 'Logo, su ventana y entregas todos los días'],
    ['04_filtro_ramos', 'Catálogo · filtro Ramos', 'Las tarjetas se reacomodan con resorte'],
    ['07_paso1_tamano_M', 'Paso 1 · arreglo y tamaño', 'S, M o L · $820 es su precio publicado'],
    ['08_paso2_calendario', 'Paso 2 · fecha', 'Calendario propio, sin días pasados'],
    ['09_paso2_lleno', 'Paso 2 · entrega y tarjeta', 'Domicilio o pick up, dirección y mensaje'],
    ['10_paso3_resumen', 'Paso 3 · resumen', 'Anticipo del 50 % y envío por WhatsApp'],
  ] },
  { file: 'tablero_2_confianza.jpg', title: 'Confianza y detalles', items: [
    ['12_como_funciona', 'Cómo funciona', 'Domicilio con su reseña, pick up y anticipo'],
    ['13_resenas', 'Lo que dicen de Roma', 'Reseñas reales de Google, sin nombres'],
    ['14_ubicacion', 'Visítanos', 'Dirección, cómo llegar y WhatsApp'],
    ['05_filtro_inmediata', 'Filtro Inmediata', 'Aviso honesto: no inventa disponibilidad'],
    ['08a_paso2_errores', 'Validación', 'No deja avanzar sin los datos necesarios'],
    ['17_demo_vista_previa', 'Modo demo', 'Muestra el mensaje sin escribirle a Roma'],
  ] },
];

const font = (f) => `url(file://${path.join(FONTS, f)})`;
const css = `
@font-face{font-family:P;font-weight:600;src:${font('playfair-display-latin-600-normal.woff2')}}
@font-face{font-family:P;font-style:italic;font-weight:500;src:${font('playfair-display-latin-500-italic.woff2')}}
@font-face{font-family:D;font-weight:400;src:${font('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${font('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
body{width:1080px;padding:56px 52px 60px;background:radial-gradient(120% 70% at 50% 0%,#33352a 0%,#22231B 60%);color:#F5F1E6;font-family:D}
header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:40px}
.k{font:600 12px/1 D;letter-spacing:.18em;text-transform:uppercase;color:#ABA987}
h1{margin-top:12px;font:600 44px/1.02 P;text-transform:uppercase;letter-spacing:.01em}
.r{text-align:right;font:400 14px/1.5 D;color:rgba(245,241,230,.66)}
.r b{display:block;font:500 italic 20px/1.2 P;color:#F5F1E6;margin-bottom:4px}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:44px 36px}
figure{display:grid;gap:14px}
.ph{border-radius:38px;padding:7px;background:linear-gradient(160deg,rgba(255,255,255,.22),rgba(255,255,255,.05));box-shadow:0 40px 70px -40px rgba(0,0,0,.9),inset 0 0 0 1px rgba(255,255,255,.14)}
.ph img{display:block;width:100%;border-radius:32px}
figcaption b{display:block;font:600 16px/1.25 D}
figcaption span{display:block;margin-top:4px;font:400 13.5px/1.4 D;color:rgba(245,241,230,.66)}
footer{margin-top:44px;padding-top:18px;border-top:1px solid rgba(245,241,230,.12);display:flex;justify-content:space-between;font:400 12.5px/1.4 D;color:rgba(245,241,230,.5)}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1000 }, deviceScaleFactor: 2 });
for (const [i, b] of BOARDS.entries()) {
  const figs = b.items.map(([f, t, d], j) => `<figure><div class="ph"><img src="file://${path.join(SHOTS, f + '.png')}"></div><figcaption><b>${i * 6 + j + 1} · ${t}</b><span>${d}</span></figcaption></figure>`).join('');
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}</style><body>
    <header><div><p class="k">Florería Aguascalientes Roma · Fase 0</p><h1>${b.title}</h1></div>
    <div class="r"><b>Spread love, send flowers</b>Página real en vista de celular · 390 × 844</div></header>
    <div class="g">${figs}</div>
    <footer><span>Demo de cortesía de Elevate Negocios · pieza no oficial</span><span>Capturas automáticas con Playwright · ${i + 1}/2</span></footer></body></html>`;
  const tmp = path.join(SHOTS, `_board_${i}.html`);
  fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(SHOTS, b.file), fullPage: true, type: 'jpeg', quality: 88 });
  fs.unlinkSync(tmp);
  console.log(b.file);
}
await browser.close();
