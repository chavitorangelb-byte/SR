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

// ---------- runtime dentro de la página ----------
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
      const dur = Math.min(700, Math.max(320, Math.abs(to - from) * 0.9));
      for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].target === target && tweens[i].axis === axis) tweens.splice(i, 1);
      tweens.push({ target, axis, from, to, t0: vnow, dur });
    }
  }
  const isSmooth = (a) => a && typeof a === 'object' && a.behavior === 'smooth';
  window.scrollTo = function (a, b) { if (isSmooth(a)) return tween(window, a); return winScrollTo(a, b); };
  window.scrollBy = function (a, b) { if (isSmooth(a)) return tween(window, { top: a.top != null ? window.scrollY + a.top : null, left: a.left != null ? window.scrollX + a.left : null }); return winScrollTo(window.scrollX + ((a && a.left) || 0), window.scrollY + ((a && a.top) || 0)); };
  Element.prototype.scrollTo = function (a, b) { if (isSmooth(a)) return tween(this, a); return elScrollTo.call(this, a, b); };
  Element.prototype.scrollBy = function (a) { if (isSmooth(a)) return tween(this, { top: a.top != null ? this.scrollTop + a.top : null, left: a.left != null ? this.scrollLeft + a.left : null }); return elScrollTo.call(this, { top: this.scrollTop + ((a && a.top) || 0), left: this.scrollLeft + ((a && a.left) || 0) }); };
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
      if (end !== Infinity && elapsed >= end) { a.finish(); done.add(a); reg.delete(a); } else a.currentTime = elapsed;
    }
  }

  // ---- teclado genérico (solo en captura): español, con ñ y barra de sugerencias ----
  const KB_H = 296;
  let kb = null, kbOn = false, sheetH0 = null;
  const SUG = (w) => {
    const x = w.toLowerCase();
    if (!x) return ['Feliz', 'Para', 'Te'];
    if ('feliz'.startsWith(x) && x.length < 5) return ['Fe', 'Feliz', 'Felicidades'];
    if ('cumpleaños'.startsWith(x)) return [w, 'cumpleaños', 'cumple'];
    return [w, w, w];
  };
  function buildKb() {
    const st = document.createElement('style');
    st.textContent = `
      #kb{position:fixed;left:0;right:0;bottom:0;height:${KB_H}px;z-index:9999;background:#D2D4CD;font-family:"DM Sans",system-ui,sans-serif;transform:translateY(100%);box-shadow:0 -1px 0 rgba(0,0,0,.08)}
      #kb .sug{display:grid;grid-template-columns:1fr 1fr 1fr;height:44px;align-items:center;text-align:center;font-size:17px;color:#2E2D24}
      #kb .sug span{border-right:1px solid rgba(46,45,36,.18);line-height:26px;padding:0 6px;white-space:nowrap;overflow:hidden}
      #kb .sug span:last-child{border-right:0}
      #kb .sug span:nth-child(2){font-weight:600}
      #kb .rows{padding:6px 3px 0;display:grid;gap:10px}
      #kb .row{display:flex;justify-content:center;gap:6px}
      #kb .k{width:33px;height:46px;border-radius:7px;background:#FCFCFA;box-shadow:0 1px 0 rgba(0,0,0,.28);display:grid;place-items:center;font-size:22px;color:#1F1F1A;transition:none}
      #kb .k.esp{background:#B5B8AF;width:46px;font-size:15px}
      #kb .k.space{width:184px;font-size:15px;color:#55554c}
      #kb .k.on{background:#BEC1B8}
      textarea,input{caret-color:transparent!important}`;
    document.head.appendChild(st);
    kb = document.createElement('div');
    kb.id = 'kb';
    const row = (keys) => `<div class="row">${keys.map((k) => (k.length === 1 ? `<span class="k" data-k="${k}">${k}</span>` : k)).join('')}</div>`;
    const shift = '<span class="k esp"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F1F1A" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4l8 8h-4.5v7h-7v-7H4z"/></svg></span>';
    const del = '<span class="k esp"><svg width="22" height="20" viewBox="0 0 26 24" fill="none" stroke="#1F1F1A" stroke-width="1.8" stroke-linejoin="round"><path d="M8 5h15v14H8l-6-7z"/><path d="M12 9l6 6M18 9l-6 6"/></svg></span>';
    kb.innerHTML = `<div class="sug"><span id="kb-sug-0"></span><span id="kb-sug-1"></span><span id="kb-sug-2"></span></div>
      <div class="rows">${row([...'qwertyuiop'])}${row([...'asdfghjklñ'])}${row([shift, ...'zxcvbnm', del])}
      <div class="row"><span class="k esp">123</span><span class="k esp">,</span><span class="k space" data-k=" ">espacio</span><span class="k esp">.</span><span class="k esp">intro</span></div></div>`;
    document.body.appendChild(kb);
    const msg = document.getElementById('msg');
    kb.querySelector('#kb-sug-1').addEventListener('click', () => {
      const s = msg.value.split(' ');
      s[s.length - 1] = document.getElementById('kb-sug-1').textContent;
      msg.value = s.join(' ') + ' ';
      msg.dispatchEvent(new Event('input', { bubbles: true }));
      sug();
    });
    sug();
  }
  function sug() {
    const msg = document.getElementById('msg');
    const last = msg.value.endsWith(' ') ? '' : msg.value.split(' ').pop();
    const s = msg.value && msg.value.endsWith(' ') && /feliz $/i.test(msg.value) ? ['día', 'cumpleaños', 'aniversario'] : SUG(last);
    s.forEach((x, i) => { document.getElementById('kb-sug-' + i).textContent = x; });
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
    setScroll(y, max) {
      if (max != null && y > max) { winScrollTo(0, max); document.body.style.transform = `translateY(${-(y - max)}px)`; }
      else { winScrollTo(0, y); document.body.style.transform = ''; }
    },
    carrusel(left) { const r = document.getElementById('reviews'); r.style.scrollSnapType = 'none'; elScrollTo.call(r, { left }); },
    carruselFin() { document.getElementById('reviews').style.scrollSnapType = ''; },
    teclado(on) {
      if (!kb) buildKb();
      if (on === kbOn) return;
      kbOn = on;
      const sheet = document.getElementById('sheet');
      if (sheetH0 == null) sheetH0 = sheet.getBoundingClientRect().height;
      const opts = { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' };
      kb.animate([{ transform: on ? 'translateY(100%)' : 'translateY(0)' }, { transform: on ? 'translateY(0)' : 'translateY(100%)' }], opts);
      sheet.animate([{ bottom: on ? '0px' : `${KB_H}px`, height: `${on ? sheetH0 : sheetH0 - KB_H}px` }, { bottom: on ? `${KB_H}px` : '0px', height: `${on ? sheetH0 - KB_H : sheetH0}px` }], opts);
      if (on) {
        const pane = document.querySelector('.pane[data-step="2"]');
        const msg = document.getElementById('msg');
        pane.scrollTo({ top: Math.max(0, msg.offsetTop - 70), behavior: 'smooth' });
      } else document.getElementById('msg').blur();
    },
    tecla(ch) {
      const k = kb && kb.querySelector(`[data-k="${ch.toLowerCase()}"]`);
      if (k) { k.classList.add('on'); setTimeout(() => k.classList.remove('on'), 90); }
      sug();
      if (!k) return null;
      const r = k.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    },
    destino(name) {
      const top = document.querySelector('.topbar').offsetHeight;
      const Y = (el) => el.getBoundingClientRect().top + window.scrollY;
      if (name === 'catalogo-trio') {
        const bar = document.querySelector('.filters');
        const meta = document.querySelector('.card[data-id="tulipanes-y-rosas"] .card-meta');
        return Math.round(Y(meta) - (top + bar.offsetHeight + 10));
      }
      if (name === 'como-funciona') return Math.round(Y(document.querySelector('#como-funciona .eyebrow')) - top - 18);
      if (name === 'pick-up') { const el = document.querySelector('#como-funciona .how-item:nth-child(2)'); return Math.round(Y(el) + el.offsetHeight - (innerHeight - 150)); }
      if (name === 'resenas') return Math.round(Y(document.querySelector('#resenas .eyebrow')) - top - 18);
      if (name === 'pie') return document.documentElement.scrollHeight - innerHeight;
      throw new Error('destino ' + name);
    },
    maxScroll() { return document.documentElement.scrollHeight - innerHeight; },
  };
};

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
ctx.on('page', (p) => { if (p !== page) p.close().catch(() => {}); });
const page = await ctx.newPage();
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
      await page.keyboard.insertText(ch);
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
  if (pend.has(f)) { for (const fn of pend.get(f)) await fn(); pend.delete(f); }
  for (const a of PLAN.filter((x) => x.f === f)) await accion(a, f);
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
