// Fotos para enviar a la clienta: láminas de presentación (texto para ella) y capturas sueltas en JPG.
// Usa las capturas reales de la página (tools/test_web.mjs → review/fase0). Salida: entrega/fotos/
// Uso: node tools/fotos_cliente.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'review', 'fase0');
const FONTS = path.join(ROOT, 'web', 'fonts');
const OUT = path.join(ROOT, 'entrega', 'fotos');
fs.mkdirSync(OUT, { recursive: true });

const pedido = fs.readFileSync(path.join(SHOTS, 'mensaje_whatsapp.txt'), 'utf8').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const LAMINAS = [
  { file: '01_asi_se_veria_tu_pagina.jpg', title: 'Así se vería<br>tu página', items: [
    ['01_portada', 'Tu portada', 'Tu logo, tus arreglos y el botón para pedir por WhatsApp'],
    ['02_catalogo', 'Tu catálogo', 'Fotos de tus arreglos, filtros y tamaños S, M y L'],
    ['13_resenas', 'Tus reseñas', 'Lo que tus clientes ya dicen de Roma en Google'],
  ] },
  { file: '02_pedido_en_3_pasos.jpg', title: 'Tus clientes piden<br>en 3 pasos', items: [
    ['07_paso1_tamano_M', '1 · Arreglo y tamaño', 'Eligen el arreglo y si lo quieren chico, mediano o grande'],
    ['09_paso2_lleno', '2 · Entrega', 'A domicilio o pick up, con fecha y mensaje para la tarjeta'],
    ['10_paso3_resumen', '3 · Resumen', 'Revisan todo y te lo mandan a tu WhatsApp'],
  ] },
  { file: '03_asi_te_llega_cada_pedido.jpg', title: 'Así te llega<br>cada pedido', items: [
    ['12_como_funciona', 'Cómo funciona', 'Entrega a domicilio, pick up y anticipo, explicados claro'],
    ['14_ubicacion', 'Visítanos', 'Tu dirección, cómo llegar y tu WhatsApp a un toque'],
    [null, 'El pedido, completo', 'Arreglo, tamaño, fecha, entrega y tarjeta en un solo mensaje (datos de ejemplo)'],
  ] },
];
const SUELTAS = [
  ['01_portada', '01_portada'], ['02_catalogo', '02_catalogo'], ['07_paso1_tamano_M', '03_pedido_paso1_tamano'],
  ['09_paso2_lleno', '04_pedido_paso2_entrega'], ['08_paso2_calendario', '05_pedido_paso2_fecha'], ['10_paso3_resumen', '06_pedido_paso3_resumen'],
  ['12_como_funciona', '07_como_funciona'], ['13_resenas', '08_resenas'], ['14_ubicacion', '09_visitanos'],
];

const font = (f) => `url(file://${path.join(FONTS, f)})`;
const css = `
@font-face{font-family:P;font-weight:600;src:${font('playfair-display-latin-600-normal.woff2')}}
@font-face{font-family:P;font-style:italic;font-weight:500;src:${font('playfair-display-latin-500-italic.woff2')}}
@font-face{font-family:D;font-weight:400;src:${font('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${font('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
body{width:1080px;padding:64px 52px 56px;background:radial-gradient(120% 70% at 50% 0%,#33352a 0%,#22231B 60%);color:#F5F1E6;font-family:D}
header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:44px}
.k{font:600 13px/1 D;letter-spacing:.18em;text-transform:uppercase;color:#ABA987}
h1{margin-top:14px;font:600 52px/1.02 P;text-transform:uppercase;letter-spacing:.01em}
.r{text-align:right;font:500 italic 24px/1.2 P;color:#F5F1E6}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:44px 36px;align-items:start}
figure{display:grid;gap:16px}
.ph{border-radius:38px;padding:7px;background:linear-gradient(160deg,rgba(255,255,255,.22),rgba(255,255,255,.05));box-shadow:0 40px 70px -40px rgba(0,0,0,.9),inset 0 0 0 1px rgba(255,255,255,.14)}
.ph img{display:block;width:100%;border-radius:32px}
.chat{border-radius:38px;padding:22px 16px;min-height:100%;background:#EDE8DA;box-shadow:0 40px 70px -40px rgba(0,0,0,.9);display:flex;flex-direction:column;justify-content:flex-start;gap:12px}
.chat .t{display:flex;align-items:center;gap:10px;padding:0 6px 12px;border-bottom:1px solid rgba(46,45,36,.12);font:600 15px/1.2 D;color:#2E2D24}
.chat .t i{width:30px;height:30px;border-radius:50%;background:#ABA987;display:block}
.chat .m{align-self:flex-start;max-width:96%;background:#fff;border-radius:16px 16px 16px 4px;padding:12px 13px;font:400 13px/1.42 D;color:#2E2D24;white-space:pre-wrap;box-shadow:0 1px 0 rgba(0,0,0,.08)}
figcaption b{display:block;font:600 18px/1.25 D}
figcaption span{display:block;margin-top:5px;font:400 15px/1.4 D;color:rgba(245,241,230,.72)}
footer{margin-top:48px;padding-top:18px;border-top:1px solid rgba(245,241,230,.12);display:flex;justify-content:space-between;font:400 13px/1.4 D;color:rgba(245,241,230,.55)}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1000 }, deviceScaleFactor: 2 });
for (const [i, b] of LAMINAS.entries()) {
  const figs = b.items.map(([f, t, d]) => {
    const media = f ? `<div class="ph"><img src="file://${path.join(SHOTS, f + '.png')}"></div>`
      : `<div class="chat"><div class="t"><i></i>Florería Aguascalientes Roma</div><div class="m">${esc(pedido)}</div></div>`;
    return `<figure>${media}<figcaption><b>${t}</b><span>${d}</span></figcaption></figure>`;
  }).join('');
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}</style><body>
    <header><div><p class="k">Florería Aguascalientes Roma</p><h1>${b.title}</h1></div><div class="r">Spread love,<br>send flowers</div></header>
    <div class="g">${figs}</div>
    <footer><span>Propuesta de Elevate Negocios · demo de cortesía, no oficial</span><span>Vista en celular · ${i + 1}/${LAMINAS.length}</span></footer></body></html>`;
  const tmp = path.join(OUT, `_lamina_${i}.html`);
  fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // la burbuja del chat iguala la altura de las capturas vecinas
  await page.evaluate(() => { const ph = document.querySelector('.ph'); const c = document.querySelector('.chat'); if (ph && c) c.style.height = ph.getBoundingClientRect().height + 'px'; });
  await page.screenshot({ path: path.join(OUT, b.file), fullPage: true, type: 'jpeg', quality: 90 });
  fs.unlinkSync(tmp);
  console.log(b.file);
}
await browser.close();
// capturas sueltas (vista de celular 390 × 844 a 2×): en JPG con Python/PIL
const { execFileSync } = await import('node:child_process');
execFileSync('python3', ['-I', '-c', `from PIL import Image\nfor a, b in ${JSON.stringify(SUELTAS)}:\n    Image.open('${SHOTS}/' + a + '.png').convert('RGB').save('${OUT}/pantalla_' + b + '.jpg', quality=90)`]);
console.log(SUELTAS.length, 'capturas sueltas');
