// Fotos para enviar al negocio: capturas reales de la página (390×844) y una lámina de presentación.
// Uso: node tools/fotos_cliente.mjs  →  entrega/fotos/
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'entrega/fotos');
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
await p.goto('file://' + path.join(ROOT, 'web/index.html'));
await p.addStyleTag({ content: '.rev{opacity:1!important;transform:none!important;transition:none!important}html{scroll-behavior:auto!important}' });
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1800);
const y = await p.evaluate(() => { const t = s => document.querySelector(s).getBoundingClientRect().top + scrollY; return {
  portada: 0, catalogo: t('#catalogo .kicker') - 84, mas: t('.dos') - 80, pickup_galeria: t('.cintillo') - 90, cierre: document.documentElement.scrollHeight }; });
const PANT = [['portada', '01_portada'], ['catalogo', '02_catalogo_precios'], ['mas', '03_mas_mobiliario'], ['pickup_galeria', '04_pickup_y_galeria'], ['cierre', '05_cotiza_por_whatsapp']];
const data = {};
for (const [k, n] of PANT) {
  await p.evaluate(v => scrollTo(0, v), y[k]); await p.waitForTimeout(500);
  const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
  fs.writeFileSync(path.join(OUT, `pantalla_${n}.jpg`), buf); data[k] = 'data:image/jpeg;base64,' + buf.toString('base64');
}
const font = f => `url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'web/fonts', f)).toString('base64')})`;
const items = [['portada', 'Tu portada', 'Tu logo y el botón para cotizar por WhatsApp'], ['catalogo', 'Tu catálogo', 'Fotos reales y los precios que ya publicas'], ['cierre', 'Un toque y te escriben', 'El botón abre tu WhatsApp con el mensaje listo']];
const html = `<style>
@font-face{font-family:C;font-weight:600;src:${font('cormorant-garamond-latin-600-normal.woff2')}}
@font-face{font-family:C;font-style:italic;font-weight:500;src:${font('cormorant-garamond-latin-500-italic.woff2')}}
@font-face{font-family:I;font-weight:400;src:${font('inter-latin-400-normal.woff2')}}
@font-face{font-family:I;font-weight:600;src:${font('inter-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
body{width:1080px;padding:70px 52px 60px;background:radial-gradient(90% 60% at 10% 0%,#3a2c16 0%,#0f0e0d 62%);color:#f6f1e7;font-family:I}
.k{font:600 14px/1 I;letter-spacing:.2em;text-transform:uppercase;color:#e8cf9a}
h1{margin:16px 0 46px;font:600 68px/1 C} h1 em{font:italic 500 68px/1 C;color:#e8cf9a}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.ph{border-radius:40px;padding:6px;background:linear-gradient(150deg,#fbeecb,#c9a968 50%,#a8884c);box-shadow:0 40px 70px -30px rgba(0,0,0,.9)}
.ph img{display:block;width:100%;border-radius:34px}
b{display:block;margin-top:20px;font:600 30px/1.1 C} span{display:block;margin-top:8px;font:400 17px/1.4 I;color:rgba(246,241,231,.7)}
footer{margin-top:44px;font:400 14px/1.5 I;color:rgba(246,241,231,.45)}
</style><div class="k">Sella Eventos · Aguascalientes</div><h1>Así se vería <em>tu página</em></h1>
<div class="g">${items.map(([k, t, d]) => `<figure><div class="ph"><img src="${data[k]}"></div><b>${t}</b><span>${d}</span></figure>`).join('')}</div>
<footer>Demo de cortesía de Elevate Negocios · pieza no oficial</footer>`;
const q = await b.newPage({ viewport: { width: 1080, height: 800 }, deviceScaleFactor: 2 });
await q.setContent(html); await q.evaluate(() => document.fonts.ready); await q.waitForTimeout(400);
await q.screenshot({ path: path.join(OUT, '00_asi_se_veria_tu_pagina.jpg'), type: 'jpeg', quality: 92, fullPage: true });
await b.close(); console.log(fs.readdirSync(OUT).join('\n'));
