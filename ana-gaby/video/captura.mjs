// Captura la página real cuadro por cuadro (60 fps) a 3x: son las texturas de la pantalla del celular.
// Reloj virtual: en cada cuadro se aplican las acciones del plan, se fijan el scroll y el carrusel y TODAS las
// animaciones (transiciones CSS, animaciones CSS y WAAPI) se pausan y se colocan en su tiempo exacto.
// Mismo cuadro → misma imagen.
// Uso: node video/captura.mjs --desde 0 --hasta 1679        (pantallas)
//      node video/captura.mjs --texturas                      (reseñas completas para las tarjetas 3D)
// Salida: video/build/pantalla/f0000.png …, video/build/pantalla/medidas.json, video/build/texturas/
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from '../tools/servidor.mjs';
import { VIEWPORT, DSF, ACCIONES, MEDIR, TEXTOS, curvaScroll } from './plan.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? +process.argv[i + 1] : d; };
const DESDE = arg('desde', 0), HASTA = arg('hasta', 1679);
const TEXTURAS = process.argv.includes('--texturas');
const OUT = path.join(ROOT, 'video', 'build', TEXTURAS ? 'texturas' : 'pantalla');
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
  document.querySelector('#carrusel').style.scrollSnapType = 'none'; // el carrusel lo mueve el plan, cuadro por cuadro
  const nacidas = new WeakMap();
  window.__sincronizar = (tms) => {
    for (const a of document.getAnimations()) {
      if (!nacidas.has(a)) { nacidas.set(a, tms); a.pause(); }
      a.currentTime = Math.max(0, tms - nacidas.get(a));
    }
  };
  window.__centro = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  window.__rectos = (M) => {
    const r = (el) => { const b = el.getBoundingClientRect(); return [+b.left.toFixed(2), +b.top.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)]; };
    const out = { scrollY, carruselX: document.querySelector('#carrusel').scrollLeft };
    for (const [k, sel] of Object.entries(M)) {
      const els = [...document.querySelectorAll(sel)];
      out[k] = els.length === 1 ? r(els[0]) : els.map(r);
    }
    return out;
  };
  window.__frase = (sel, texto) => {
    const cont = document.querySelector(sel);
    if (!cont) return null;
    const w = document.createTreeWalker(cont, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const i = n.data.indexOf(texto);
      if (i >= 0) {
        const rg = document.createRange();
        rg.setStart(n, i); rg.setEnd(n, i + texto.length);
        return [...rg.getClientRects()].map((b) => [+b.left.toFixed(2), +b.top.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)]);
      }
    }
    return null;
  };
});

const dosRaf = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

if (TEXTURAS) {
  // Reseñas 1–3 completas (en el carrusel solo se ve una a la vez) y dónde cae la frase que subraya el betún.
  await page.evaluate(() => { window.AnaGaby.encender(); });
  await page.evaluate(() => { const s = document.querySelector('#resenas'); window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 64); document.querySelectorAll('.revelar').forEach((e) => e.classList.add('visible')); });
  await page.waitForTimeout(1600);
  const info = {};
  for (let k = 0; k < 3; k++) {
    await page.evaluate((kk) => { const c = document.querySelector('#carrusel'); const rs = c.querySelectorAll('.resena'); c.scrollLeft = rs[kk].offsetLeft - rs[0].offsetLeft; }, k);
    await page.waitForTimeout(300);
    const el = (await page.$$('.resena'))[k];
    await el.screenshot({ path: path.join(OUT, `resena_${k}.png`) });
    info[k] = await page.evaluate((kk) => {
      const card = document.querySelectorAll('.resena')[kk].getBoundingClientRect();
      const fr = kk === 0 ? window.__frase('.resena:first-child blockquote', 'como la imagen que solicites') : null;
      return { tam: [card.width, card.height], frase: fr ? fr.map(([x, y, w, h]) => [x - card.left, y - card.top, w, h]) : null };
    }, k);
  }
  fs.writeFileSync(path.join(OUT, 'texturas.json'), JSON.stringify({ dsf: DSF, resenas: info }, null, 1));
  await browser.close(); srv.close();
  console.log('✔ texturas de reseñas en video/build/texturas/');
  process.exit(0);
}

const pendientes = ACCIONES.filter((a) => a.f <= HASTA).map((a) => ({ ...a })).sort((a, b) => a.f - b.f);
const insertar = (a) => { pendientes.push(a); pendientes.sort((x, y) => x.f - y.f); };
const scrolls = [], carruseles = [];
const medidas = {}, toques = [], teclas = [];
let y = 0, cx = 0;
const t0 = Date.now();

for (let f = 0; f <= HASTA; f++) {
  const tms = (f / 60) * 1000;
  while (pendientes.length && pendientes[0].f <= f) {
    const a = pendientes.shift();
    switch (a.tipo) {
      case 'encender': await page.evaluate(() => window.AnaGaby.encender()); break;
      case 'scroll': {
        const hasta = await page.evaluate(({ selector, margen }) => Math.round(document.querySelector(selector).getBoundingClientRect().top + scrollY - margen), a.hasta);
        scrolls.push({ f0: a.f, dur: a.dur, desde: y, hasta, ...(a.rebote !== undefined ? { rebote: a.rebote } : {}) });
        break;
      }
      case 'carrusel': {
        const hasta = await page.evaluate((k) => { const rs = document.querySelectorAll('.resena'); return rs[k].offsetLeft - rs[0].offsetLeft; }, a.a);
        carruseles.push({ f0: a.f, dur: a.dur, desde: cx, hasta, rebote: 10, asentar: 10 });
        break;
      }
      case 'tap': case 'presionar': {
        const [px, py] = await page.evaluate((s) => window.__centro(s), a.selector);
        toques.push({ f: a.f, x: +px.toFixed(1), y: +py.toFixed(1), selector: a.selector });
        await page.evaluate(([s, xx, yy]) => {
          const el = document.querySelector(s);
          el.classList.add('presionado');
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: xx, clientY: yy }));
        }, [a.selector, px, py]);
        if (a.tipo === 'tap') insertar({ f: a.f + 4, tipo: 'soltar', selector: a.selector, archivo: a.archivo });
        break;
      }
      case 'soltar':
        await page.evaluate((s) => document.querySelector(s).classList.remove('presionado'), a.selector);
        if (a.archivo) await page.setInputFiles('#foto-input', path.join(ROOT, a.archivo));
        else await page.evaluate((s) => {
          const el = document.querySelector(s);
          // Un campo de texto se enfoca (anillo de enfoque de la página) y recibe lo que se teclee; lo demás se pulsa.
          if (el.matches('input[type=text],textarea')) { el.focus({ preventScroll: true }); el.classList.add('enfocado'); window.__campo = el; }
          else el.click();
        }, a.selector);
        break;
      case 'llamar': await page.evaluate((fn) => window.AnaGaby[fn](), a.fn); break;
      case 'teclear': case 'sugerencia': {
        teclas.push({ f: a.f, tipo: a.tipo, texto: a.texto });
        await page.evaluate(([tipo, texto]) => {
          const i = window.__campo;
          if (!i) throw new Error('No hay campo enfocado para teclear');
          i.value = tipo === 'teclear' ? i.value + texto : i.value.replace(/\S*$/, '') + texto;
          i.dispatchEvent(new Event('input', { bubbles: true }));
        }, [a.tipo, a.texto]);
        break;
      }
      case 'desenfocar': await page.evaluate(() => { if (window.__campo) { window.__campo.classList.remove('enfocado'); window.__campo.blur(); window.__campo = null; } }); break;
      case 'visible': await page.evaluate((s) => document.querySelector(s).classList.add('visible'), a.selector); break;
      default: throw new Error(`Acción desconocida: ${a.tipo}`);
    }
  }
  const s = scrolls.at(-1);
  if (s) y = Math.round(curvaScroll(f, s) * DSF) / DSF;
  const c = carruseles.at(-1);
  if (c) cx = Math.round(curvaScroll(f, c) * DSF) / DSF;
  await page.evaluate(([yy, xx]) => { window.scrollTo(0, yy); document.querySelector('#carrusel').scrollLeft = xx; }, [y, cx]);
  await dosRaf();
  await page.evaluate((t) => window.__sincronizar(t), tms);
  if (f < DESDE) continue;
  medidas[f] = await page.evaluate(([M, T]) => {
    const out = window.__rectos(M);
    for (const [k, sel, txt] of T) { const fr = window.__frase(sel, txt); if (fr) out[k] = fr; }
    return out;
  }, [MEDIR, TEXTOS]);
  await page.screenshot({ path: path.join(OUT, `f${String(f).padStart(4, '0')}.png`) });
  if ((f - DESDE) % 100 === 0) console.log(`f${f} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
// Si se recapturó un tramo, se conservan las medidas de los demás cuadros.
const archivo = path.join(OUT, 'medidas.json');
let todas = medidas, desdeTotal = DESDE, hastaTotal = HASTA;
if (DESDE > 0 && fs.existsSync(archivo)) {
  const prev = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  todas = { ...prev.cuadros, ...medidas };
  desdeTotal = Math.min(prev.desde, DESDE); hastaTotal = Math.max(prev.hasta, HASTA);
}
const acciones = ACCIONES.filter((x) => x.f <= HASTA).map(({ f, tipo, selector, fn }) => ({ f, tipo, ...(selector ? { selector } : {}), ...(fn ? { fn } : {}) }));
fs.writeFileSync(archivo, JSON.stringify({ viewport: VIEWPORT, dsf: DSF, desde: desdeTotal, hasta: hastaTotal, toques, teclas, scrolls, carruseles, acciones, cuadros: todas }));
await browser.close();
srv.close();
if (errores.length) { console.error('Errores en la página:', errores); process.exit(1); }
console.log(`✔ ${HASTA - DESDE + 1} cuadros en ${((Date.now() - t0) / 1000).toFixed(0)} s → video/build/pantalla/`);
