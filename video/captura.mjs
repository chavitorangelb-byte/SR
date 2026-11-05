// Captura determinista de la página real (web/index.html) cuadro por cuadro, con reloj virtual.
// Uso: node video/captura.mjs --desde 196 --hasta 450 --dsf 2 --out video/build/ui
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN, VIEWPORT, FECHA } from './plan_ui.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DESDE = +arg('desde', 196), HASTA = +arg('hasta', 450), DSF = +arg('dsf', 2);
const OUT = path.resolve(ROOT, arg('out', 'video/build/ui'));
const FPS = 60, DT = 1000 / FPS;
fs.mkdirSync(OUT, { recursive: true });

// ---------- runtime dentro de la página: anima por tiempo virtual ----------
const RUNTIME = () => {
  const reg = new Map();
  const done = new WeakSet();
  const tweens = [];
  let vnow = 0;
  const winScrollTo = window.scrollTo.bind(window);
  const elScrollTo = Element.prototype.scrollTo;
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const cur = (t, axis) => (t === window ? (axis === 'top' ? window.scrollY : window.scrollX) : (axis === 'top' ? t.scrollTop : t.scrollLeft));
  function tween(target, opts) {
    for (const axis of ['top', 'left']) {
      if (opts[axis] == null) continue;
      const from = cur(target, axis), to = opts[axis];
      const dist = Math.abs(to - from);
      const dur = Math.min(700, Math.max(320, dist * 0.9));
      for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].target === target && tweens[i].axis === axis) tweens.splice(i, 1);
      tweens.push({ target, axis, from, to, t0: vnow, dur });
    }
  }
  const isSmooth = (a) => a && typeof a === 'object' && a.behavior === 'smooth';
  window.scrollTo = function (a, b) { if (isSmooth(a)) return tween(window, a); return winScrollTo(a, b); };
  window.scrollBy = function (a, b) { if (isSmooth(a)) return tween(window, { top: a.top != null ? window.scrollY + a.top : null, left: a.left != null ? window.scrollX + a.left : null }); return winScrollTo(window.scrollX + (a && a.left || 0), window.scrollY + (a && a.top || 0)); };
  Element.prototype.scrollTo = function (a, b) { if (isSmooth(a)) return tween(this, a); return elScrollTo.call(this, a, b); };
  Element.prototype.scrollBy = function (a) { if (isSmooth(a)) return tween(this, { top: a.top != null ? this.scrollTop + a.top : null, left: a.left != null ? this.scrollLeft + a.left : null }); return elScrollTo.call(this, { top: this.scrollTop + (a && a.top || 0), left: this.scrollLeft + (a && a.left || 0) }); };
  function set(target, axis, v) {
    if (target === window) winScrollTo(axis === 'left' ? v : window.scrollX, axis === 'top' ? v : window.scrollY);
    else elScrollTo.call(target, axis === 'top' ? { top: v } : { left: v });
  }
  function syncAnims() {
    for (const a of document.getAnimations()) {
      if (done.has(a)) continue;
      if (!reg.has(a)) { reg.set(a, { t0: vnow, c0: a.currentTime || 0 }); a.pause(); }
      const r = reg.get(a);
      const elapsed = vnow - r.t0 + r.c0;
      const end = a.effect ? a.effect.getComputedTiming().endTime : 0;
      if (end !== Infinity && elapsed >= end) { a.finish(); done.add(a); reg.delete(a); }
      else a.currentTime = elapsed;
    }
  }
  window.__cap = {
    step(dt) {
      vnow += dt;
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const u = Math.min(1, (vnow - tw.t0) / tw.dur);
        set(tw.target, tw.axis, tw.from + (tw.to - tw.from) * ease(u));
        if (u >= 1) tweens.splice(i, 1);
      }
      syncAnims();
    },
    sync: syncAnims,
    get vnow() { return vnow; },
    setScroll(y) { winScrollTo(0, y); },
  };
};

// ---------- curvas ----------
// Scroll con dedo: arrastre (el contenido sigue al dedo, acelerando) y luego inercia con resorte críticamente amortiguado.
function curvaScroll(s0, s1, dur, dedo) {
  const A = dedo.arrastre, T2 = (dur - A) / FPS;
  const drag = -dedo.dy;
  const v1 = (2 * drag) / (A / FPS); // velocidad al soltar (derivada de easeInQuad)
  const D = s1 - s0;
  const w = 9;
  const xr = drag - D; // posición relativa al destino al soltar
  const x = (t) => D + (xr + (v1 + w * xr) * t) * Math.exp(-w * t);
  const resid = D - x(T2);
  const out = [];
  for (let i = 0; i <= dur; i++) {
    if (i <= A) { const u = i / A; out.push({ y: s0 + drag * u * u, dedo: { x: dedo.x, y: dedo.y + dedo.dy * u * u, a: 1 } }); continue; }
    const t = (i - A) / FPS;
    const u = (i - A) / (dur - A);
    const corr = resid * u * u * (3 - 2 * u);
    const fade = Math.max(0, 1 - (i - A) / 8);
    out.push({ y: s0 + x(t) + corr, dedo: fade > 0 ? { x: dedo.x, y: dedo.y + dedo.dy - (i - A) * 2, a: fade } : null });
  }
  return out;
}

// ---------- captura ----------
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
await ctx.addInitScript(RUNTIME);
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(String(e)));
await page.clock.install({ time: new Date(FECHA) });
await page.clock.pauseAt(new Date(FECHA));
await page.goto('file://' + path.join(ROOT, 'web', 'index.html'), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.__cap.sync(); });
await page.addStyleTag({ content: '::-webkit-scrollbar{display:none}' });

const meta = { viewport: VIEWPORT, dsf: DSF, fps: FPS, frames: {}, texturas: {} };
const encender = PLAN.find((a) => a.tipo === 'encender').f;
let scrollCurve = null, scrollFrom = 0;

for (let f = encender; f <= HASTA; f++) {
  for (const a of PLAN.filter((x) => x.f === f)) {
    if (a.tipo === 'scroll') {
      const s0 = await page.evaluate(() => window.scrollY);
      const s1 = await page.evaluate((dest) => {
        if (dest === 'catalogo-trio') {
          const bar = document.querySelector('.filters');
          const top = document.querySelector('.topbar').offsetHeight;
          const meta = document.querySelector('.card[data-id="tulipanes-y-rosas"] .card-meta');
          return Math.round(meta.getBoundingClientRect().top + window.scrollY - (top + bar.offsetHeight + 10));
        }
        return 0;
      }, a.destino);
      scrollCurve = curvaScroll(s0, s1, a.dur, a.dedo);
      scrollFrom = f;
    }
    if (a.tipo === 'texturas') {
      for (const id of a.cards) {
        const rect = await page.evaluate((id) => { const r = document.querySelector(`.card[data-id="${id}"]`).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, id);
        // captura la tarjeta completa aunque salga del viewport: la llevo al centro sin tocar el reloj y regreso
        const y0 = await page.evaluate(() => window.scrollY);
        await page.evaluate((id) => { const el = document.querySelector(`.card[data-id="${id}"]`); const r = el.getBoundingClientRect(); window.__cap.setScroll(window.scrollY + r.top - 200); }, id);
        const r2 = await page.evaluate((id) => { const r = document.querySelector(`.card[data-id="${id}"]`).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, id);
        const file = `card_${id}.png`;
        await page.screenshot({ path: path.join(OUT, file), clip: r2, omitBackground: false });
        await page.evaluate((y) => window.__cap.setScroll(y), y0);
        meta.texturas[id] = { file, rect, radio: 22 };
      }
    }
    if (a.tipo === 'ocultar' || a.tipo === 'mostrar') {
      await page.evaluate(([ids, vis]) => ids.forEach((id) => { document.querySelector(`.card[data-id="${id}"]`).style.visibility = vis; }), [a.cards, a.tipo === 'ocultar' ? 'hidden' : '']);
    }
  }
  let dedo = null;
  if (scrollCurve) {
    const i = f - scrollFrom;
    if (i < scrollCurve.length) { await page.evaluate((y) => window.__cap.setScroll(y), scrollCurve[i].y); dedo = scrollCurve[i].dedo; }
    else scrollCurve = null;
  }
  await page.clock.runFor(DT);
  await page.evaluate((dt) => window.__cap.step(dt), DT);
  const scrollY = await page.evaluate(() => window.scrollY);
  meta.frames[f] = { scrollY, dedo };
  if (f >= DESDE) await page.screenshot({ path: path.join(OUT, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
  if (f % 30 === 0) process.stdout.write(`f${f} `);
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
await browser.close();
console.log(`\n${HASTA - DESDE + 1} cuadros en ${path.relative(ROOT, OUT)} · errores: ${errores.length ? errores.join(' | ') : 'ninguno'}`);
