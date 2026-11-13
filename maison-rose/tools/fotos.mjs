// Prueba la página en vista de celular (390 × 844), saca las capturas y arma las láminas para la dueña.
// También genera dist/maison-rose.html (un solo archivo con fotos y fuentes incrustadas).
// Uso: node tools/fotos.mjs   → review/web/*.png, entrega/fotos/*.jpg, dist/maison-rose.html
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'review', 'web'), OUT = path.join(ROOT, 'entrega', 'fotos'), FONTS = path.join(ROOT, 'web', 'fonts');
for (const d of [SHOTS, OUT, path.join(ROOT, 'dist')]) fs.mkdirSync(d, { recursive: true });

// ---- archivo único ----
let html = fs.readFileSync(path.join(ROOT, 'web', 'index.html'), 'utf8');
const b64 = (f, mime) => `data:${mime};base64,${fs.readFileSync(path.join(ROOT, 'web', f)).toString('base64')}`;
html = html.replace(/url\((fonts\/[^)]+\.woff2)\)/g, (_, f) => `url(${b64(f, 'font/woff2')})`);
const imgs = [...new Set([...html.matchAll(/img\/([a-z_]+\.jpg)/g)].map((m) => m[1]).concat(fs.readdirSync(path.join(ROOT, 'web', 'img'))))];
html = html.replace(/src="img\/([a-z_]+\.jpg)"/g, (_, f) => `src="${b64('img/' + f, 'image/jpeg')}"`);
html = html.replace('// ===== Fin de datos =====', `const IMGS = {${imgs.map((f) => `'${f}':'${b64('img/' + f, 'image/jpeg')}'`).join(',')}};\n// ===== Fin de datos =====`)
  .replaceAll('src="img/${m.img}"', 'src="${IMGS[m.img]}"');
fs.writeFileSync(path.join(ROOT, 'dist', 'maison-rose.html'), html);

// ---- pruebas y capturas ----
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
const res = [];
const ok = (nombre, cond) => { res.push(`${cond ? 'OK ' : 'FALLA'} ${nombre}`); if (!cond) process.exitCode = 1; };
const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
const quieto = () => page.waitForTimeout(450);

await page.goto('file://' + path.join(ROOT, 'dist', 'maison-rose.html'));
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
ok('sin desborde horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
ok('10 productos en el menú', (await page.locator('.card').count()) === 10);
ok('todas las fotos cargan', await page.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0)));
ok('botones de al menos 40 px', await page.evaluate(() => [...document.querySelectorAll('button,.btn')].filter((b) => b.offsetParent).every((b) => b.getBoundingClientRect().height >= 40)));
await shot('01_portada');
await page.evaluate(() => document.querySelector('#menu').scrollIntoView()); await quieto(); await shot('02_menu');
await page.locator('.chip[data-cat="Pasteles"]').tap(); await quieto();
ok('filtro Pasteles deja 3 productos', (await page.locator('.card:not(.oculta)').count()) === 3);
await page.evaluate(() => document.querySelector('#menu').scrollIntoView()); await quieto(); await shot('03_pasteles');
await page.locator('[data-add="trianon"]').tap(); await page.locator('[data-add="flan"]').tap();
await page.locator('.chip[data-cat="Galletas"]').tap(); await quieto();
await page.locator('[data-add="galletas"]').tap(); await page.locator('[data-add="galletas"]').tap();
ok('el contador marca 4', (await page.locator('#cuenta').textContent()) === '4');
await page.evaluate(() => document.querySelector('#menu').scrollIntoView()); await quieto(); await shot('04_galletas');
await page.locator('.barra [data-abre]').tap(); await quieto();
ok('la hoja de pedido lista 3 productos', (await page.locator('.fila').count()) === 3);
await page.locator('.fila [data-q="1"]').first().tap();
await page.locator('.fila [data-q="-1"]').first().tap();
await page.locator('#nombre').fill('Ana'); await page.locator('#nombre').blur(); await quieto(); await shot('05_pedido');
await page.locator('#enviar').tap(); await quieto();
const msg = await page.locator('.burbuja').textContent();
ok('el mensaje lleva productos, cantidades y nombre', /1 × Trianon/.test(msg) && /1 × Flan parisino/.test(msg) && /2 × Galletas recién horneadas/.test(msg) && /A nombre de: Ana/.test(msg));
fs.writeFileSync(path.join(SHOTS, 'mensaje_whatsapp.txt'), msg + '\n');
await page.evaluate(() => document.querySelector('.hoja').scrollTo(0, 9999)); await quieto(); await shot('06_mensaje');
await page.locator('.velo').tap({ position: { x: 20, y: 20 } }); await quieto();
ok('la hoja se cierra', !(await page.evaluate(() => document.body.classList.contains('abierta'))));
await page.locator('.chip[data-cat="Todo"]').tap();
await page.evaluate(() => document.querySelector('#visitanos').scrollIntoView()); await quieto(); await shot('07_visitanos');
ok('sin errores de consola', errores.length === 0);
fs.writeFileSync(path.join(SHOTS, 'pruebas.txt'), res.join('\n') + '\n' + errores.join('\n'));
console.log(res.join('\n'), errores.join('\n'));

// ---- láminas ----
const LAMINAS = [
  { file: '01_asi_se_veria_tu_pagina.jpg', title: 'Así se vería<br>tu página', items: [
    ['01_portada', 'Tu portada', 'Tu logo, tus fotos y el botón para pedir por WhatsApp'],
    ['02_menu', 'Tu menú', 'Hojaldres, berlinesas, pasteles, galletas y panes, por categoría'],
    ['03_pasteles', 'Tus pasteles', 'Trianon, mille-feuille y flan parisino, con foto y descripción'],
  ] },
  { file: '02_pedidos_por_whatsapp.jpg', title: 'Tus clientes piden<br>por WhatsApp', items: [
    ['04_galletas', '1 · Eligen', 'Tocan el + de lo que se les antoja'],
    ['05_pedido', '2 · Revisan', 'Ajustan cantidades y ponen su nombre'],
    ['06_mensaje', '3 · Te llega', 'El pedido completo, en un solo mensaje (datos de ejemplo)'],
  ] },
];
const font = (f) => `url(file://${path.join(FONTS, f)})`;
const css = `
@font-face{font-family:P;font-weight:600;src:${font('playfair-display-latin-600-normal.woff2')}}
@font-face{font-family:S;src:${font('parisienne-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:400;src:${font('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${font('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
body{width:1080px;padding:64px 52px 56px;background:radial-gradient(120% 70% at 50% 0%,#3a2319 0%,#1B1210 62%);color:#F3E6D6;font-family:D}
header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:44px}
.k{font:600 13px/1 D;letter-spacing:.18em;text-transform:uppercase;color:#E5A898}
h1{margin-top:14px;font:600 54px/1.04 P}
.r{text-align:right;font:400 44px/1 S;color:#E5A898}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:44px 36px;align-items:start}
figure{display:grid;gap:16px}
.ph{border-radius:38px;padding:7px;background:linear-gradient(160deg,#E5A898,#C98B4E);box-shadow:0 40px 70px -40px rgba(0,0,0,.9)}
.ph img{display:block;width:100%;border-radius:32px}
figcaption b{display:block;font:600 18px/1.25 D}
figcaption span{display:block;margin-top:5px;font:400 15px/1.4 D;color:rgba(243,230,214,.72)}
footer{margin-top:48px;padding-top:18px;border-top:1px solid rgba(243,230,214,.14);display:flex;justify-content:space-between;font:400 13px/1.4 D;color:rgba(243,230,214,.6)}`;
const p2 = await browser.newPage({ viewport: { width: 1080, height: 1000 }, deviceScaleFactor: 2 });
for (const [i, b] of LAMINAS.entries()) {
  const figs = b.items.map(([f, t, d]) => `<figure><div class="ph"><img src="file://${path.join(SHOTS, f + '.png')}"></div><figcaption><b>${t}</b><span>${d}</span></figcaption></figure>`).join('');
  const tmp = path.join(OUT, `_l${i}.html`);
  fs.writeFileSync(tmp, `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}</style><body>
    <header><div><p class="k">Maison Rose · San Jerónimo</p><h1>${b.title}</h1></div><div class="r">Maison Rose</div></header><div class="g">${figs}</div>
    <footer><span>Propuesta de Elevate Negocios · demo de cortesía, no oficial</span><span>Vista en celular · ${i + 1}/${LAMINAS.length}</span></footer></body></html>`);
  await p2.goto('file://' + tmp); await p2.evaluate(() => document.fonts.ready);
  await p2.screenshot({ path: path.join(OUT, b.file), fullPage: true, type: 'jpeg', quality: 90 });
  fs.unlinkSync(tmp);
}
await browser.close();
const sueltas = [['01_portada', '01_portada'], ['02_menu', '02_menu'], ['03_pasteles', '03_pasteles'], ['04_galletas', '04_galletas'], ['05_pedido', '05_pedido'], ['06_mensaje', '06_mensaje_whatsapp'], ['07_visitanos', '07_visitanos']];
execFileSync('python3', ['-I', '-c', `from PIL import Image\nfor a, b in ${JSON.stringify(sueltas)}:\n    Image.open('${SHOTS}/' + a + '.png').convert('RGB').save('${OUT}/pantalla_' + b + '.jpg', quality=90)`]);
console.log('láminas y capturas en entrega/fotos');
