import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = '/home/user/SR';
const A = path.join(ROOT, 'assets');
const OUT = path.join(ROOT, 'review', 'fase1');
fs.mkdirSync(OUT, { recursive: true });
const F = (f) => `url(file://${path.join(ROOT, 'web/fonts', f)})`;

const items = [
  ['logo_roma.png', 'Logo oficial', '870 × 870 · transparencia', 'Portada y end card (≤ 600 px)', 'ok'],
  ['arreglo_02_caja_rosas_eucalipto.jpg', '02 · Caja de rosas y eucalipto', '1320 × 1916', 'Portada con su ventana', 'ok'],
  ['arreglo_01_rosas_rojas.jpg', '01 · Rosas rojas', '1320 × 2010', 'Tarjeta 3D grande', 'ok'],
  ['arreglo_03_caja_tulipanes.jpg', '03 · Caja de tulipanes', '400 × 500', 'Tarjeta 3D (≤ 400 px)', 'lim'],
  ['arreglo_04_ramo_kraft_pastel.jpg', '04 · Ramo kraft pastel', '400 × 500', 'Tonos rosas y blush · $1,400', 'lim'],
  ['arreglo_05_tulipanes_y_rosas.jpg', '05 · Tulipanes y rosas', '400 × 500', 'Tonos rosas y blush · $820', 'lim'],
  ['arreglo_06_gerberas_naranjas.jpg', '06 · Gerberas naranjas', '400 × 500', 'Catálogo', 'ok'],
  ['arreglo_07_tulipanes_fucsia.jpg', '07 · Tulipanes fucsia', '400 × 500', 'Catálogo', 'ok'],
  ['arreglo_08_girasoles.jpg', '08 · Girasoles', '400 × 500', 'Tarjeta 3D (≤ 400 px)', 'lim'],
  ['arreglo_09_rosas_con_hortensia.jpg', '09 · Rosas con hortensia', '400 × 500', 'Catálogo', 'ok'],
  ['arreglo_10_rosas_rojo_y_blanco.jpg', '10 · Rosas rojo y blanco', '400 × 500', 'Catálogo', 'ok'],
  ['arreglo_11_mixto_con_gerbera.jpg', '11 · Mixto con gerbera', '400 × 500', 'Catálogo', 'ok'],
  ['post_tonos_rosas_blush_precios.jpg', 'Post de precios', '1320 × 1320', 'Solo referencia, no sale', 'ref'],
];
const missing = [
  ['Clave de ElevenLabs', 'Para la voz (fase 3). Se guarda en el formulario seguro, nunca en el chat.', 'tú'],
  ['Biblioteca de SFX', 'El brief dice "[tu biblioteca de SFX]". Si no hay, los sintetizo en código.', 'tú o yo'],
  ['Refs ref_primersello_XX.png', 'Opcionales. Sin ellas, sigo las proporciones del brief.', 'opcional'],
  ['Logo de Elevate', 'La end card lleva "Elevate Negocios" en texto. Si quieres logo, mándalo.', 'opcional'],
  ['Fotos originales', 'Solo hay miniaturas de Instagram; si la dueña acepta, pedir originales.', 'después'],
];
const tag = { ok: ['Lista', '#ABA987'], lim: ['Lista · tope 400 px', '#E9B7B5'], ref: ['Referencia', 'rgba(245,241,230,.35)'] };
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>
@font-face{font-family:P;font-weight:600;src:${F('playfair-display-latin-600-normal.woff2')}}
@font-face{font-family:D;font-weight:400;src:${F('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${F('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
body{width:1080px;padding:52px 48px 56px;background:radial-gradient(120% 60% at 50% 0%,#33352a,#22231B 60%);color:#F5F1E6;font-family:D}
.k{font:600 12px/1 D;letter-spacing:.18em;text-transform:uppercase;color:#ABA987}
h1{margin-top:12px;font:600 42px/1.04 P;text-transform:uppercase}
h2{margin:44px 0 18px;font:600 24px/1.1 P;text-transform:uppercase}
.g{display:grid;grid-template-columns:repeat(5,1fr);gap:22px 16px;margin-top:30px}
.it .im{height:200px;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.06);display:grid;place-items:center}
.it img{max-width:100%;max-height:100%;object-fit:contain}
.it .logo{background:repeating-conic-gradient(rgba(255,255,255,.07) 0 25%,transparent 0 50%) 0 0/16px 16px}
.it b{display:block;margin-top:10px;font:600 13.5px/1.25 D}
.it span{display:block;margin-top:3px;font:400 12px/1.35 D;color:rgba(245,241,230,.66)}
.it .t{display:inline-block;margin-top:7px;padding:5px 9px;border-radius:999px;font:600 11px/1 D;color:#22231B}
.m{display:grid;gap:10px}
.row{display:grid;grid-template-columns:220px 1fr 90px;gap:16px;align-items:center;padding:14px 18px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
.row b{font:600 15px/1.2 D}.row p{font:400 14px/1.4 D;color:rgba(245,241,230,.75)}.row i{font:600 11px/1 D;font-style:normal;text-transform:uppercase;letter-spacing:.12em;color:#ABA987;text-align:right}
</style><body>
<p class="k">Florería Aguascalientes Roma · Fase 1</p><h1>Inventario de assets</h1>
<div class="g">${items.map(([f, n, px, use, st]) => `<div class="it"><div class="im${f.endsWith('.png') ? ' logo' : ''}"><img src="file://${path.join(A, f)}"></div><b>${n}</b><span>${px}</span><span>${use}</span><span class="t" style="background:${tag[st][1]}">${tag[st][0]}</span></div>`).join('')}</div>
<h2>Lo que falta</h2><div class="m">${missing.map(([a, b, c]) => `<div class="row"><b>${a}</b><p>${b}</p><i>${c}</i></div>`).join('')}</div>
</body></html>`;
const tmp = path.join(OUT, '_inv.html');
fs.writeFileSync(tmp, html);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });
await p.goto('file://' + tmp, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: path.join(OUT, 'inventario_assets.jpg'), fullPage: true, type: 'jpeg', quality: 86 });
fs.unlinkSync(tmp);
await b.close();
console.log('ok');
