// Captura determinista de la página real (web/index.html) cuadro por cuadro, con reloj virtual.
// Ejecuta video/plan_ui.mjs: taps reales (CDP), scrolls con inercia, teclado genérico, swipe de la hoja,
// carrusel y rebote elástico. Guarda cuadros JPEG + meta.json (scroll, dedo, rectángulos, texturas).
// Uso: node video/captura.mjs --dsf 3 --out video/build/ui [--desde 196 --hasta 1470]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN, VIEWPORT, FECHA, ULTIMO } from './plan_ui.mjs';
import { typingFrames } from '../brief/tiempos.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DSF = +arg('dsf', 3);
const OUT = path.resolve(ROOT, arg('out', 'video/build/ui'));
const DESDE = +arg('desde', 196), HASTA = +arg('hasta', ULTIMO);
const FPS = 60, DT = 1000 / FPS, HOLD = 6;
fs.mkdirSync(OUT, { recursive: true });

import { RUNTIME } from './runtime_captura.mjs';

// ---------- curvas ----------
// Arrastre (el contenido sigue al dedo, acelerando) y luego inercia (ease-out cúbica) con velocidad continua al soltar.
function curvaInercia(s0, s1, dur, A, rebote = 0) {
  const total = s1 + rebote - s0;
  const durIn = rebote ? Math.round(dur * 0.72) : dur;
  const T2 = (durIn - A) / FPS;
  const R = total / (1 + A / (40 * T2));
  const dd = total - R;
  const out = [];
  for (let i = 0; i <= dur; i++) {
    let y;
    if (i <= A) { const u = i / A; y = s0 + dd * u * u; }
    else if (i <= durIn) { const u = (i - A) / (durIn - A); y = s0 + dd + R * (1 - Math.pow(1 - u, 3)); }
    else { const u = (i - durIn) / (dur - durIn); y = s1 + rebote * (1 - (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)); }
    out.push({ y, drag: i <= A ? (i / A) * (i / A) * dd : null });
  }
  return out;
}

// ---------- captura ----------
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
await ctx.addInitScript(RUNTIME);
const page = await ctx.newPage();
ctx.on('page', (p) => { if (p !== page) p.close().catch(() => {}); });
const cdp = await ctx.newCDPSession(page);
const errores = [];
page.on('pageerror', (e) => errores.push(String(e)));
await page.clock.install({ time: new Date(FECHA) });
await page.clock.pauseAt(new Date(FECHA));
await page.goto('file://' + path.join(ROOT, 'web', 'index.html'), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.__cap.sync(); });
await page.addStyleTag({ content: '::-webkit-scrollbar{display:none}' });

const meta = { viewport: VIEWPORT, dsf: DSF, fps: FPS, frames: {}, texturas: {}, rects: {} };
const encender = PLAN.find((a) => a.tipo === 'encender').f;
const pend = new Map(); // cuadro → [funciones]
const later = (f, fn) => { if (!pend.has(f)) pend.set(f, []); pend.get(f).push(fn); };
const dedos = new Map(); // cuadro → {x,y,a,p}
const setDedo = (f, d) => dedos.set(f, d);
let scrollCurve = null, scrollFrom = 0, scrollMax = null;
let carCurve = null, carFrom = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const center = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
const rectOf = (sel) => page.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);

async function tap(f, x, y, after) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 11, radiusY: 11 }] });
  for (let i = 0; i <= HOLD + 6; i++) setDedo(f + i, { x, y, a: i < 2 ? 0.5 + i * 0.25 : i <= HOLD ? 1 : 1 - (i - HOLD) / 6, p: i <= HOLD ? 1 : 0 });
  later(f + HOLD, async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait(90);
    if (after) await after();
  });
}

async function accion(a, f) {
  if (a.tipo === 'scroll') {
    const s0 = await page.evaluate(() => window.scrollY);
    const s1 = await page.evaluate((d) => window.__cap.destino(d), a.destino);
    scrollMax = a.rebote ? await page.evaluate(() => window.__cap.maxScroll()) : null;
    const A = a.dedo ? a.dedo.arrastre : 8;
    scrollCurve = curvaInercia(s0, s1, a.dur, A, a.rebote || 0);
    scrollFrom = f;
    if (a.dedo) {
      for (let i = 0; i <= A + 6; i++) {
        const c = scrollCurve[Math.min(i, A)];
        setDedo(f + i, { x: a.dedo.x, y: a.dedo.y - (c.drag || scrollCurve[A].drag), a: i <= A ? Math.min(1, 0.5 + i * 0.25) : 1 - (i - A) / 6, p: i <= A ? 1 : 0 });
      }
    }
  }
  if (a.tipo === 'carrusel') {
    const c = await page.evaluate((idx) => { const r = document.getElementById('reviews'); const rv = r.querySelectorAll('.review')[idx]; const b = r.getBoundingClientRect(); return { s0: r.scrollLeft, s1: rv.offsetLeft - r.offsetLeft - 16, y: b.y + b.height / 2 }; }, a.indice);
    carCurve = curvaInercia(c.s0, c.s1, a.dur, 8);
    carFrom = f;
    for (let i = 0; i <= 14; i++) { const k = carCurve[Math.min(i, 8)]; setDedo(f + i, { x: 300 - (k.drag || carCurve[8].drag), y: c.y, a: i <= 8 ? Math.min(1, 0.5 + i * 0.25) : 1 - (i - 8) / 6, p: i <= 8 ? 1 : 0 }); }
  }
  if (a.tipo === 'texturas') {
    for (const it of a.items) {
      const info = await page.evaluate(async ([sel, carrusel, partes, frase]) => {
        const el = document.querySelector(sel);
        const r0 = el.getBoundingClientRect();
        const rv = document.getElementById('reviews');
        const left0 = rv.scrollLeft, y0 = window.scrollY;
        if (carrusel) window.__cap.carrusel(el.offsetLeft - rv.offsetLeft - 16);
        let r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight) { window.__cap.setScroll(window.scrollY + r.top - 200); r = el.getBoundingClientRect(); }
        const sub = {};
        for (const [k, s] of Object.entries(partes || {})) { const q = el.querySelector(s).getBoundingClientRect(); sub[k] = { x: q.x - r.x, y: q.y - r.y, w: q.width, h: q.height }; }
        if (frase) {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = walker.nextNode())) {
            const i = n.textContent.indexOf(frase);
            if (i >= 0) { const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + frase.length); const rs = [...rg.getClientRects()]; const x0 = Math.min(...rs.map((q) => q.x)), y1 = Math.min(...rs.map((q) => q.y)), x1 = Math.max(...rs.map((q) => q.right)), y2 = Math.max(...rs.map((q) => q.bottom)); sub.frase = { x: x0 - r.x, y: y1 - r.y, w: x1 - x0, h: y2 - y1, lineas: rs.map((q) => ({ x: q.x - r.x, y: q.y - r.y, w: q.width, h: q.height })) }; break; }
          }
        }
        return { clip: { x: r.x, y: r.y, width: r.width, height: r.height }, rect: { x: r0.x, y: r0.y, w: r0.width, h: r0.height }, sub, left0, y0 };
      }, [it.sel, !!it.carrusel, it.partes, it.frase]);
      const file = `tex_${it.id}.png`;
      await page.screenshot({ path: path.join(OUT, file), clip: info.clip });
      await page.evaluate(([left0, y0, carrusel]) => { if (carrusel) { window.__cap.carrusel(left0); window.__cap.carruselFin(); } window.__cap.setScroll(y0); }, [info.left0, info.y0, !!it.carrusel]);
      meta.texturas[it.id] = { file, rect: info.rect, partes: info.sub };
    }
  }
  if (a.tipo === 'ocultar' || a.tipo === 'mostrar') {
    await page.evaluate(([sels, vis]) => sels.forEach((s) => { document.querySelector(s).style.visibility = vis; }), [a.sel, a.tipo === 'ocultar' ? 'hidden' : '']);
  }
  if (a.tipo === 'rect') meta.rects[a.nombre] = { f, ...(await rectOf(a.sel)) };
  if (a.tipo === 'tap') {
    const c = await center(a.sel);
    if (!c) throw new Error(`No encontré ${a.sel} en f${f}`);
    await tap(f, c.x, c.y, a.teclado ? () => page.evaluate((on) => window.__cap.teclado(on), a.teclado === 'subir') : null);
  }
  if (a.tipo === 'tipear') {
    typingFrames(f, a.dur, a.texto).forEach((fk, i) => later(fk, async () => {
      const ch = [...a.texto][i];
      // escribe en el campo y dispara su evento input real (el mismo que produce el teclado)
      await page.evaluate(([s, c]) => { const e = document.querySelector(s); if (document.activeElement !== e) e.focus({ preventScroll: true }); e.value += c; e.dispatchEvent(new Event('input', { bubbles: true })); }, [a.sel, ch]);
      const k = await page.evaluate((c) => window.__cap.tecla(c), ch);
      if (k) for (let j = 0; j <= 5; j++) setDedo(fk + j, { x: k.x, y: k.y, a: j < 3 ? 1 : 1 - (j - 2) / 4, p: j < 3 ? 1 : 0 });
    }));
  }
  if (a.tipo === 'swipe') {
    const c = await center(a.sel);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 1 }] });
    for (let i = 1; i <= a.dur; i++) {
      const u = i / a.dur, y = c.y + a.dy * u * u;
      later(f + i, async () => { await cdp.send('Input.dispatchTouchEvent', { type: i === a.dur ? 'touchEnd' : 'touchMove', touchPoints: i === a.dur ? [] : [{ x: c.x, y, id: 1 }] }); if (i === a.dur) await wait(60); });
    }
    for (let i = 0; i <= a.dur + 6; i++) { const u = Math.min(1, i / a.dur); setDedo(f + i, { x: c.x, y: c.y + a.dy * u * u, a: i <= a.dur ? 1 : 1 - (i - a.dur) / 6, p: i <= a.dur ? 1 : 0 }); }
  }
}

for (let f = encender; f <= HASTA; f++) {
  for (const a of PLAN.filter((x) => x.f === f)) await accion(a, f);
  // después de las acciones: así corren también las tareas que una acción programa para este mismo cuadro
  if (pend.has(f)) { for (const fn of pend.get(f)) await fn(); pend.delete(f); }
  if (scrollCurve) {
    const i = f - scrollFrom;
    if (i < scrollCurve.length) await page.evaluate(([y, m]) => window.__cap.setScroll(y, m), [scrollCurve[i].y, scrollMax]);
    else { scrollCurve = null; scrollMax = null; }
  }
  if (carCurve) {
    const i = f - carFrom;
    if (i < carCurve.length) await page.evaluate((x) => window.__cap.carrusel(x), carCurve[i].y);
    else { await page.evaluate(() => window.__cap.carruselFin()); carCurve = null; }
  }
  await page.clock.runFor(DT);
  await page.evaluate((dt) => window.__cap.step(dt), DT);
  const scrollY = await page.evaluate(() => window.scrollY);
  meta.frames[f] = { scrollY, dedo: dedos.get(f) || null };
  if (f >= DESDE) await page.screenshot({ path: path.join(OUT, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
  if (f % 60 === 0) process.stdout.write(`f${f} `);
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
await browser.close();
console.log(`\n${HASTA - DESDE + 1} cuadros en ${path.relative(ROOT, OUT)} · errores: ${errores.length ? errores.join(' | ') : 'ninguno'}`);
