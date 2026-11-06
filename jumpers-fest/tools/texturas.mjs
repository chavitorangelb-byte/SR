// Texturas sueltas a 3× de las piezas que en el video salen de la pantalla al espacio 3D:
// la misma pieza de interfaz (misma foto, mismo texto), recortada con esquinas transparentes.
// Guarda review/fase0/texturas_3x/*.png y texturas.json (rectángulo en px CSS, radio de esquina).
// Uso: node tools/texturas.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, LANZAR } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'review', 'fase0', 'texturas_3x');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const srv = await servir(path.join(ROOT, 'web'));
const browser = await chromium.launch(LANZAR);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
const page = await ctx.newPage();
await page.clock.setFixedTime(new Date('2026-11-06T12:00:00-06:00'));
await page.goto(srv.url + '?demo=1', { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await wait(1500);
const info = {};

async function textura(nombre, sel, radio, { quieto = false } = {}) {
  const loc = page.locator(sel).first();
  // a la vista, debajo de la barra superior, y ya "inflada"
  if (!quieto) {
    await page.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); if (!e.closest('.hoja-wrap')) window.scrollTo(0, r.top + window.scrollY - 90); }, sel);
    await wait(1200);
  }
  await page.evaluate(() => { document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent'; });
  const rect = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
  await loc.screenshot({ path: path.join(OUT, `${nombre}.png`), omitBackground: true, animations: 'disabled' });
  await page.evaluate(() => { document.documentElement.style.background = ''; document.body.style.background = ''; });
  info[nombre] = { archivo: `${nombre}.png`, selector: sel, rect_css: rect, radio_css: radio, escala: 3 };
}

for (const id of ['castle-jump', 'rainbow-jump', 'magic-jump']) await textura(`tarjeta_${id}`, `.card[data-id="${id}"]`, 30);
await textura('postal_arma_tu_fiesta', '.postal', 30);
await textura('pasos_como_funciona', '.pasos', 0);
// ficha de Rainbow Jump abierta
await page.evaluate(() => window.scrollTo(0, 0));
await page.locator('.card[data-id="rainbow-jump"] .card-foto').scrollIntoViewIfNeeded();
await page.locator('.card[data-id="rainbow-jump"] .card-foto').tap(); await wait(1000);
await textura('ficha_rainbow_jump', '#ficha .hoja', 32);
await page.keyboard.press('Escape'); await wait(600);
// formulario completo: calendario con el sábado marcado y el botón listo
await page.locator('.card[data-id="rainbow-jump"] [data-quiero]').tap(); await wait(2200);
await textura('calendario', '#cal', 22, { quieto: true });
await page.locator('[data-date="2026-11-21"]').tap(); await wait(60);
await textura('calendario_sabado_21', '#cal', 22, { quieto: true });
await wait(1000);
await page.locator('#lugar').fill('Jardines de la Asunción'); await page.locator('#hora').fill('4:00 pm');
await page.locator('[data-evento="Cumpleaños"]').tap(); await wait(900);
await textura('boton_apartar_whatsapp', '#enviar', 29);
await textura('burbuja_mensaje', '#burbuja', 20);
fs.writeFileSync(path.join(path.dirname(OUT), 'texturas.json'), JSON.stringify(info, null, 1));
await browser.close();
srv.cerrar();
console.log(Object.keys(info).length, 'texturas en', path.relative(ROOT, OUT));
