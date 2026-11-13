// Fotos de la página de MaRe en vista de celular (390×844, x2) + láminas para la dueña. Salida: entrega/fotos/
// Uso: node tools/fotos_pagina.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'entrega', 'fotos'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(ROOT, 'video', 'build', 'pantallas'); fs.mkdirSync(TMP, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('requestfailed', (r) => errs.push('falla ' + r.url()));
await page.goto('file://' + path.join(ROOT, 'web', 'index.html'));
await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const shots = [['01_portada', null], ['02_menu', '#menu'], ['03_cajita', '#cajita'], ['04_lealtad', '#lealtad'], ['05_como_pedir', '#pedir'], ['06_final', 'footer']];
for (const [name, sel] of shots) {
  await page.evaluate((sel) => { if (!sel) return scrollTo(0, 0); const el = document.querySelector(sel); scrollTo(0, el.getBoundingClientRect().top + scrollY - (sel === 'footer' ? 260 : 64)); }, sel);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(TMP, name + '.png') });
}
await page.screenshot({ path: path.join(OUT, 'pagina_completa.jpg'), fullPage: true, type: 'jpeg', quality: 86 });

const font = (f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'video', 'fonts', f)).toString('base64')})`;
const img = (n) => 'data:image/png;base64,' + fs.readFileSync(path.join(TMP, n + '.png')).toString('base64');
const LAM = [
  { file: '01_asi_se_veria_tu_pagina.jpg', title: 'Así se vería<br>tu página', items: [['01_portada', 'Tu portada', 'Tus galletas al frente y el botón para pedir por WhatsApp'], ['02_menu', 'Tu menú', 'Galletas, brownies, brookies, lemonies, cuchareables y pasteles'], ['03_cajita', 'Tu cajita', 'Tus clientes arman su mix: cajita, galletas y toppings']] },
  { file: '02_lealtad_y_pedidos.jpg', title: 'Clientes que<br>regresan', items: [['04_lealtad', 'Tarjeta de lealtad', '5 sellos = 20 % de descuento, explicado claro'], ['05_como_pedir', 'Cómo pedir', 'Anticipación, anticipo y recoger en su fecha'], ['06_final', 'Siempre a la mano', 'WhatsApp e Instagram a un toque']] },
];
const css = `@font-face{font-family:B;font-weight:800;src:${font('baloo-2-latin-800-normal.woff2')}}@font-face{font-family:D;font-weight:500;src:${font('dm-sans-latin-500-normal.woff2')}}@font-face{font-family:D;font-weight:700;src:${font('dm-sans-latin-700-normal.woff2')}}
*{box-sizing:border-box;margin:0}body{width:1080px;padding:64px 52px 60px;background:radial-gradient(120% 70% at 50% 0%,#4A2A1C 0%,#1E120C 62%);color:#FFF8E1;font-family:D}
header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:44px}.k{font:700 14px/1 D;letter-spacing:.18em;text-transform:uppercase;color:#E48BB0}
h1{margin-top:14px;font:800 62px/.98 B}.r{text-align:right;font:700 22px/1.25 D;color:#C9A27A}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:36px}figure{display:grid;gap:16px;align-content:start}
.ph{border-radius:40px;padding:7px;background:linear-gradient(160deg,rgba(255,255,255,.26),rgba(255,255,255,.05));box-shadow:0 40px 70px -40px #000,inset 0 0 0 1px rgba(255,255,255,.16)}
.ph img{display:block;width:100%;border-radius:33px}figcaption b{display:block;font:800 26px/1.05 B;color:#FFF8E1}figcaption span{display:block;margin-top:6px;font:500 17px/1.35 D;color:rgba(255,248,225,.75)}
footer{margin-top:44px;font:500 14px/1 D;color:rgba(255,248,225,.5);text-align:center}`;
const sheet = await browser.newPage({ viewport: { width: 1080, height: 1000 }, deviceScaleFactor: 1 });
for (const l of LAM) {
  await sheet.setContent(`<style>${css}</style><header><div><div class="k">MaRe Repostería · Aguascalientes</div><h1>${l.title}</h1></div><div class="r">Vista en celular</div></header>
  <div class="g">${l.items.map(([n, t, d]) => `<figure><div class="ph"><img src="${img(n)}"></div><figcaption><b>${t}</b><span>${d}</span></figcaption></figure>`).join('')}</div>
  <footer>Demo de cortesía de Elevate Negocios · pieza no oficial</footer>`);
  await sheet.evaluate(() => document.fonts.ready);
  await sheet.screenshot({ path: path.join(OUT, l.file), fullPage: true, type: 'jpeg', quality: 88 });
}
for (const [name] of shots) fs.copyFileSync(path.join(TMP, name + '.png'), path.join(OUT, 'pantalla_' + name + '.png'));
console.log('desborde horizontal:', overflow, 'px · errores:', errs.length ? errs : 'ninguno');
await browser.close();
