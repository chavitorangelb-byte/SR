// Captura la página real cuadro por cuadro (60 fps) a 3x: son las texturas de la pantalla del celular.
// Reloj virtual: en cada cuadro se aplican las acciones del plan, se fija el scroll y TODAS las animaciones
// (transiciones CSS, animaciones CSS y WAAPI) se pausan y se colocan en su tiempo exacto. Mismo cuadro → misma imagen.
// Uso: node video/captura.mjs --desde 180 --hasta 480
// Salida: video/build/pantalla/f0180.png … y video/build/pantalla/medidas.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from '../tools/servidor.mjs';
import { VIEWPORT, DSF, ACCIONES, MEDIR, curvaScroll } from './plan.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)) || process.argv[process.argv.indexOf(`--${n}`) + 1]; return a && !String(a).startsWith('--') ? +String(a).split('=').pop() : d; };
const DESDE = arg('desde', 0), HASTA = arg('hasta', 1679);
const OUT = path.join(ROOT, 'video', 'build', 'pantalla');
fs.mkdirSync(OUT, { recursive: true });
const RELOJ = new Date('2026-11-10T18:00:00Z'); // martes 12:00 en Aguascalientes (coincide con la barra de estado)

const { srv, url } = await servir(path.join(ROOT, 'web'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
const page = await ctx.newPage();
await page.clock.setFixedTime(RELOJ);
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
await page.goto(`${url}/?captura=1`);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
  // Reloj virtual de animaciones: cada animación nueva se pausa y se le anota el tiempo en que nació.
  const nacidas = new WeakMap();
  window.__sincronizar = (tms) => {
    for (const a of document.getAnimations()) {
      if (!nacidas.has(a)) { nacidas.set(a, tms); a.pause(); }
      a.currentTime = Math.max(0, tms - nacidas.get(a));
    }
  };
});

const dosRaf = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const pendientes = ACCIONES.filter((a) => a.f <= HASTA).sort((a, b) => a.f - b.f);
const scrolls = [];
const medidas = {};
let y = 0;
const t0 = Date.now();

for (let f = Math.min(DESDE, ...pendientes.map((a) => a.f)); f <= HASTA; f++) {
  const tms = (f / 60) * 1000;
  // 1. Acciones de este cuadro
  while (pendientes.length && pendientes[0].f <= f) {
    const a = pendientes.shift();
    if (a.tipo === 'encender') await page.evaluate(() => window.AnaGaby.encender());
    if (a.tipo === 'scroll') {
      const hasta = await page.evaluate(({ selector, margen }) => Math.round(document.querySelector(selector).getBoundingClientRect().top + scrollY - margen), a.hasta);
      scrolls.push({ f0: a.f, dur: a.dur, desde: y, hasta, ...(a.rebote !== undefined ? { rebote: a.rebote } : {}) });
    }
  }
  // 2. Scroll de este cuadro (inercia y rebote)
  const s = scrolls.at(-1);
  if (s) y = Math.round(curvaScroll(f, s) * DSF) / DSF;
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await dosRaf(); // deja correr IntersectionObserver y el recalculo de estilos
  await page.evaluate((t) => window.__sincronizar(t), tms);
  if (f < DESDE) continue;
  // 3. Medidas de las piezas (px CSS del viewport de la página)
  medidas[f] = await page.evaluate((M) => {
    const r = (el) => { const b = el.getBoundingClientRect(); return [+b.left.toFixed(2), +b.top.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)]; };
    const out = { scrollY };
    for (const [k, sel] of Object.entries(M)) {
      const els = [...document.querySelectorAll(sel)];
      out[k] = els.length === 1 ? r(els[0]) : els.map(r);
    }
    return out;
  }, MEDIR);
  await page.screenshot({ path: path.join(OUT, `f${String(f).padStart(4, '0')}.png`) });
  if ((f - DESDE) % 50 === 0) console.log(`f${f} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
fs.writeFileSync(path.join(OUT, 'medidas.json'), JSON.stringify({ viewport: VIEWPORT, dsf: DSF, desde: DESDE, hasta: HASTA, cuadros: medidas }));
await browser.close();
srv.close();
if (errores.length) { console.error('Errores en la página:', errores); process.exit(1); }
console.log(`✔ ${HASTA - DESDE + 1} cuadros en ${((Date.now() - t0) / 1000).toFixed(0)} s → video/build/pantalla/`);
