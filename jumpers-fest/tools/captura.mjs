// Captura determinista de la página real (web/index.html), cuadro por cuadro a 60 fps, con reloj virtual.
// Toques reales por CDP (touchStart/touchEnd), scroll con arrastre e inercia, teclado genérico y tecleo.
// Guarda JPEG por cuadro + meta.json (scroll, dedo y eventos para los SFX). Son las texturas de la pantalla del celular.
// Uso: node tools/captura.mjs [--plan plan_fase0] [--dsf 3] [--out build/captura_fase0] [--desde 0] [--hasta N]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, LANZAR } from './servidor.mjs';
import { RUNTIME } from './runtime_captura.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const { PLAN, VIEWPORT, FECHA, QUERY, ULTIMO, ENCENDER = 0 } = await import(`./${arg('plan', 'plan_fase0')}.mjs`);
const DSF = +arg('dsf', 3);
const OUT = path.resolve(ROOT, arg('out', 'build/captura_fase0'));
const DESDE = +arg('desde', ENCENDER), HASTA = +arg('hasta', ULTIMO);
const FPS = 60, DT = 1000 / FPS, HOLD = 6;
fs.mkdirSync(OUT, { recursive: true });

// Arrastre (el contenido sigue al dedo, acelerando) y luego inercia con velocidad continua al soltar.
function curvaInercia(s0, s1, dur, A) {
  const total = s1 - s0;
  const T2 = (dur - A) / FPS;
  const R = total / (1 + A / (40 * T2));
  const dd = total - R;
  const out = [];
  for (let i = 0; i <= dur; i++) {
    let y, drag = null;
    if (i <= A) { const u = i / A; y = s0 + dd * u * u; drag = dd * u * u; } else { const u = (i - A) / (dur - A); y = s0 + dd + R * (1 - Math.pow(1 - u, 3)); }
    out.push({ y, drag });
  }
  return out;
}
// Tiempos de tecleo con un poco de irregularidad humana (determinista).
function tiemposTecleo(f0, dur, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const j = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    const jit = (j - Math.floor(j) - 0.5) * 0.5;
    out.push(Math.round(f0 + ((i + 0.5 + jit) * dur) / n));
  }
  return out;
}

const srv = await servir(path.join(ROOT, 'web'));
const browser = await chromium.launch(LANZAR);
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
await ctx.addInitScript(RUNTIME);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const errores = [];
page.on('pageerror', (e) => errores.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
await page.clock.install({ time: new Date(FECHA) });
await page.clock.pauseAt(new Date(FECHA));
await page.goto(srv.url + (QUERY || ''), { waitUntil: 'load' });
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))); });
await page.addStyleTag({ content: '::-webkit-scrollbar{display:none} html{scroll-behavior:auto!important}' });
await page.evaluate(() => window.__cap.sync());

const meta = { viewport: VIEWPORT, dsf: DSF, fps: FPS, fecha: FECHA, encender: ENCENDER, frames: {}, eventos: [], rects: {} };
const pend = new Map();
const later = (f, fn) => { if (!pend.has(f)) pend.set(f, []); pend.get(f).push(fn); };
const dedos = new Map();
const setDedo = (f, d) => dedos.set(f, d);
const evento = (f, tipo, extra = {}) => meta.eventos.push({ f, tipo, ...extra });
let scrollCurve = null, scrollFrom = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const centro = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
const destinoY = (d) => page.evaluate(({ sel, off = 0, alinear = 'arriba' }) => {
  const r = document.querySelector(sel).getBoundingClientRect();
  const top = document.getElementById('topbar').offsetHeight;
  const y = alinear === 'abajo' ? r.bottom + window.scrollY - innerHeight + off
    : alinear === 'centro' ? r.top + window.scrollY - (top + (innerHeight - top - r.height) / 2) + off
    : r.top + window.scrollY - top + off;
  return Math.round(Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight)));
}, d);

async function tocar(f, x, y, despues) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 11, radiusY: 11 }] });
  for (let i = 0; i <= HOLD + 6; i++) setDedo(f + i, { x, y, a: i < 2 ? 0.5 + i * 0.25 : i <= HOLD ? 1 : 1 - (i - HOLD) / 6, p: i <= HOLD ? 1 : 0 });
  later(f + HOLD, async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait(60);
    if (despues) await despues();
  });
}

async function accion(a, f) {
  if (a.tipo === 'scroll') {
    const s0 = await page.evaluate(() => window.scrollY);
    const s1 = await destinoY(a.destino);
    const A = a.dedo.arrastre;
    scrollCurve = curvaInercia(s0, s1, a.dur, A);
    scrollFrom = f;
    for (let i = 0; i <= A + 6; i++) {
      const c = scrollCurve[Math.min(i, A)];
      setDedo(f + i, { x: a.dedo.x, y: a.dedo.y - c.drag, a: i <= A ? Math.min(1, 0.5 + i * 0.25) : 1 - (i - A) / 6, p: i <= A ? 1 : 0 });
    }
    evento(f, 'scroll', { de: s0, a: s1, dur: a.dur });
  }
  if (a.tipo === 'tap') {
    const c = await centro(a.sel);
    if (!c) throw new Error(`No encontré ${a.sel} en f${f}`);
    if (c.y < 0 || c.y > VIEWPORT.height) throw new Error(`${a.sel} fuera de pantalla en f${f} (y=${Math.round(c.y)})`);
    evento(f, 'tap', { sel: a.sel, x: c.x, y: c.y });
    await tocar(f, c.x, c.y, async () => {
      if (a.teclado) { await page.evaluate(() => window.__cap.teclado(true)); evento(f + HOLD, 'teclado', { on: true }); }
      if (a.subir) await page.evaluate((s) => window.__cap.subirCampo(s), a.subir);
    });
  }
  if (a.tipo === 'subir') await page.evaluate((s) => window.__cap.subirCampo(s), a.sel);
  // rectángulo de maquetación (sin transformaciones) en px CSS del viewport, para poner la pieza 3D en su lugar
  if (a.tipo === 'rect') {
    for (const [nombre, sel] of Object.entries(a.items)) {
      meta.rects[nombre] = { f, ...(await page.evaluate((s) => {
        const e = document.querySelector(s);
        let x = 0, y = 0;
        for (let n = e; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
        return { x: x - window.scrollX, y: y - window.scrollY, w: e.offsetWidth, h: e.offsetHeight };
      }, sel)) };
    }
  }
  if (a.tipo === 'ocultar' || a.tipo === 'mostrar') {
    await page.evaluate(([s, v]) => { document.querySelector(s).style.visibility = v; }, [a.sel, a.tipo === 'ocultar' ? 'hidden' : '']);
    evento(f, a.tipo, { sel: a.sel });
  }
  if (a.tipo === 'tipear') {
    const chars = [...a.texto];
    tiemposTecleo(f, a.dur, chars.length).forEach((fk, i) => later(fk, async () => {
      const ch = chars[i];
      await page.evaluate(([s, c]) => { const e = document.querySelector(s); if (document.activeElement !== e) e.focus({ preventScroll: true }); e.value += c; e.dispatchEvent(new Event('input', { bubbles: true })); }, [a.sel, ch]);
      const k = await page.evaluate((c) => window.__cap.tecla(c), ch);
      if (k) for (let j = 0; j <= 5; j++) setDedo(fk + j, { x: k.x, y: k.y, a: j < 3 ? 1 : 1 - (j - 2) / 4, p: j < 3 ? 1 : 0 });
      evento(fk, 'tecla', { ch });
    }));
  }
  if (a.tipo === 'tecla') {
    const k = await page.evaluate((c) => window.__cap.tecla(c), a.ch);
    if (k) for (let j = 0; j <= 8; j++) setDedo(f + j, { x: k.x, y: k.y, a: j < 4 ? 1 : 1 - (j - 3) / 5, p: j < 4 ? 1 : 0 });
    evento(f, 'tecla', { ch: a.ch });
    if (a.teclado === false) later(f + 4, async () => { await page.evaluate(() => window.__cap.teclado(false)); evento(f + 4, 'teclado', { on: false }); });
  }
}

const t0 = Date.now();
for (let f = ENCENDER; f <= HASTA; f++) {
  for (const a of PLAN.filter((x) => x.f === f)) await accion(a, f);
  if (pend.has(f)) { for (const fn of pend.get(f)) await fn(); pend.delete(f); }
  if (scrollCurve) {
    const i = f - scrollFrom;
    if (i < scrollCurve.length) await page.evaluate((y) => window.__cap.setScroll(y), scrollCurve[i].y);
    else scrollCurve = null;
  }
  await page.clock.runFor(DT);
  await page.evaluate((dt) => window.__cap.step(dt), DT);
  meta.frames[f] = { scrollY: await page.evaluate(() => window.scrollY), dedo: dedos.get(f) || null };
  if (f >= DESDE) await page.screenshot({ path: path.join(OUT, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
  if (f % 60 === 0) process.stdout.write(`f${f} (${Math.round((Date.now() - t0) / 1000)} s) `);
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
await browser.close();
srv.cerrar();
console.log(`\n${HASTA - DESDE + 1} cuadros ${VIEWPORT.width * DSF}×${VIEWPORT.height * DSF} en ${path.relative(ROOT, OUT)} · errores: ${errores.length ? errores.join(' | ') : 'ninguno'}`);
if (errores.length) process.exit(1);
