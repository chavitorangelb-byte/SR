// Pruebas de la página real (web/index.html) en vista de celular 390×844, más capturas de cada pantalla a 3×.
// Uso: node tools/test_web.mjs            → pruebas + capturas (review/fase0)
//      node tools/test_web.mjs --sin-capturas
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, LANZAR } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'review', 'fase0');
const SHOTS = path.join(OUT, 'pantallas_3x');
fs.mkdirSync(SHOTS, { recursive: true });
const HOY = '2026-11-06T12:00:00-06:00'; // viernes; los sábados de noviembre: 7, 14, 21, 28
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Mexico_City' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CAPTURAS = !process.argv.includes('--sin-capturas');

const resultados = [];
async function prueba(nombre, fn) {
  try {
    const detalle = await fn();
    resultados.push({ ok: true, nombre, detalle: detalle ?? '' });
    console.log('✔', nombre, detalle ? `· ${detalle}` : '');
  } catch (e) {
    resultados.push({ ok: false, nombre, detalle: String(e.message || e) });
    console.log('✘', nombre, '·', e.message || e);
  }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: «${a}» ≠ «${b}»`); };

const srv = await servir(path.join(ROOT, 'web'));
const browser = await chromium.launch(LANZAR);

async function abrir(opts = {}) {
  const ctx = await browser.newContext({ ...CEL, deviceScaleFactor: opts.dsf || 1, ...(opts.ctx || {}) });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await page.clock.setFixedTime(new Date(HOY));
  await page.goto(srv.url + (opts.query || ''), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await wait(opts.espera ?? 1500);
  return { ctx, page, errores };
}
const tap = async (page, sel) => { await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.locator(sel).first().tap(); };
const visible = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden]'); }, sel);
const texto = (page, sel) => page.evaluate((s) => document.querySelector(s).textContent.replace(/\s+/g, ' ').trim(), sel);

const ESPERADO = [
  '¡Hola, Jumpers Fest! Quiero apartar una fecha:',
  '• Inflable: Rainbow Jump',
  '• Fecha: sábado 21 de noviembre de 2026',
  '• Colonia o salón: Jardines de la Asunción',
  '• Horario aproximado: 4:00 pm',
  '• Evento: Cumpleaños',
  'También quiero preguntar por mobiliario.',
  '¿Me confirman disponibilidad y precio? ¡Gracias!',
].join('\n');

// ---------------- Pruebas en 390×844 ----------------
{
  const { ctx, page, errores } = await abrir();

  await prueba('Carga sin errores de consola ni de JavaScript', async () => { assert(errores.length === 0, errores.join(' | ')); });
  await prueba('Fuentes locales cargadas (Fredoka 600 y DM Sans)', async () => {
    const r = await page.evaluate(() => [document.fonts.check('600 20px Fredoka'), document.fonts.check('400 16px "DM Sans"'), document.fonts.check('600 16px "DM Sans"')]);
    assert(r.every(Boolean), JSON.stringify(r));
  });
  await prueba('Idioma, título y noindex (demo no oficial)', async () => {
    const r = await page.evaluate(() => [document.documentElement.lang, document.title, document.querySelector('meta[name=robots]').content]);
    eq(r[0], 'es-MX', 'lang'); assert(r[1].startsWith('Jumpers Fest Ags'), r[1]); assert(r[2].includes('noindex'), r[2]);
    return r[1];
  });
  await prueba('Sin desplazamiento horizontal', async () => {
    const r = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    assert(r[0] <= r[1], r.join(' > '));
  });
  await prueba('Portada completa en la primera pantalla (logo, Rainbow Jump, frase y botones)', async () => {
    const r = await page.evaluate(() => {
      const b = (s) => document.querySelector(s).getBoundingClientRect();
      return {
        logo: document.querySelector('.hero-logo').naturalWidth, foto: document.querySelector('.arco-foto img').naturalWidth,
        h1: document.querySelector('.hero h1').textContent.replace(/\s+/g, ' ').trim(),
        eyebrow: document.querySelector('.hero .eyebrow').textContent.trim(),
        botones: [...document.querySelectorAll('.hero-acciones .btn')].map((x) => x.textContent.trim()),
        fondo: b('.hero-acciones').bottom, logoTop: b('.hero-logo').top,
      };
    });
    assert(r.logo > 0 && r.foto > 0, 'imágenes sin cargar');
    eq(r.h1, 'Diversión + elegancia', 'frase');
    eq(r.eyebrow, 'Inflables monocromáticos · Aguascalientes', 'eyebrow');
    eq(r.botones.join(' | '), 'Ver inflables | Aparta tu fecha', 'botones');
    assert(r.fondo <= 844 && r.logoTop >= 0, `botones terminan en ${r.fondo}px`);
    return `botones terminan en y=${Math.round(r.fondo)} de 844`;
  });
  await prueba('Barra superior oculta arriba y visible al bajar', async () => {
    const a = await visible(page, '#topbar');
    await page.evaluate(() => window.scrollTo(0, 900)); await wait(700);
    const b = await page.evaluate(() => document.getElementById('topbar').classList.contains('on') && getComputedStyle(document.getElementById('topbar')).visibility === 'visible');
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(700);
    assert(!a && b, `arriba=${a} abajo=${b}`);
  });
  await prueba('Catálogo: Castle Jump, Rainbow Jump y Magic Jump con foto, marcadores y "Lo quiero"', async () => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.card')].map((c) => ({
      n: c.querySelector('h3').textContent, img: c.querySelector('img').naturalWidth,
      dd: [...c.querySelectorAll('dd')].map((d) => d.textContent).join(' | '),
      dt: [...c.querySelectorAll('dt')].map((d) => d.textContent).join(' | '),
      q: c.querySelector('[data-quiero]').textContent.trim(),
    })));
    eq(r.map((x) => x.n).join(', '), 'Castle Jump, Rainbow Jump, Magic Jump', 'orden');
    r.forEach((x) => { assert(x.img > 0, x.n + ' sin foto'); eq(x.dd, '— m | — | $ —', x.n); eq(x.dt, 'Medidas | Edad recomendada | Precio', x.n); eq(x.q, 'Lo quiero', x.n); });
  });
  await prueba('Ninguna foto se muestra más grande que su resolución real (px CSS)', async () => {
    const r = await page.evaluate(() => [...document.images].map((i) => ({ s: i.currentSrc.split('/').pop(), w: i.getBoundingClientRect().width, n: i.naturalWidth })).filter((x) => x.w > x.n));
    assert(r.length === 0, JSON.stringify(r));
  });
  await prueba('Cero precios inventados (no aparece "$" seguido de número)', async () => {
    const t = await page.evaluate(() => document.body.innerText);
    assert(!/\$\s?\d/.test(t), 'hay un precio');
  });

  // Fichas
  await prueba('Ficha de Rainbow Jump: foto, descripción de su post y marcadores', async () => {
    await tap(page, '.card[data-id="rainbow-jump"] .card-foto'); await wait(800);
    assert(await visible(page, '#ficha .hoja'), 'la ficha no abrió');
    eq(await texto(page, '#fichaNombre'), 'Rainbow Jump', 'nombre');
    eq(await texto(page, '#fichaDesc'), 'Un brincolín lleno de color, alegría y mucha diversión. Sus tonos vibrantes iluminan cada evento.', 'descripción');
    eq(await texto(page, '#fichaChip'), 'Lleno de color', 'chip');
    eq(await page.evaluate(() => [...document.querySelectorAll('#fichaSpecs dd')].map((d) => d.textContent).join(' | ')), '— m | — | $ —', 'marcadores');
    const scroll = await page.evaluate(() => { const s = document.querySelector('#ficha .hoja-scroll'); return s.scrollHeight - s.clientHeight; });
    await tap(page, '#ficha .hoja-x'); await wait(600);
    assert(!(await visible(page, '#ficha .hoja')), 'no cerró con ×');
    return scroll <= 2 ? 'todo cabe sin desplazar la hoja' : `la hoja desplaza ${scroll}px`;
  });
  await prueba('Ficha de Castle Jump: galería de 3 fotos con puntos; cierra tocando fuera', async () => {
    await tap(page, '.card[data-id="castle-jump"] [data-ficha]'); await wait(800);
    const n = await page.evaluate(() => document.querySelectorAll('#fichaPista img').length);
    eq(n, 3, 'fotos');
    await page.evaluate(() => { const p = document.getElementById('fichaPista'); p.scrollTo({ left: p.clientWidth + 12 }); }); await wait(500);
    const on = await page.evaluate(() => [...document.querySelectorAll('#fichaPuntos i')].findIndex((d) => d.classList.contains('on')));
    eq(on, 1, 'punto activo');
    eq(await page.evaluate(() => document.getElementById('fichaDesc').hidden), true, 'sin descripción inventada');
    await page.mouse.click(195, 12); await wait(600);
    assert(!(await visible(page, '#ficha .hoja')), 'no cerró tocando fuera');
  });
  await prueba('Ficha de Magic Jump: solo nombre e "Inflable monocromático"; cierra con Escape', async () => {
    await tap(page, '.card[data-id="magic-jump"] .card-foto'); await wait(800);
    eq(await texto(page, '#fichaChip'), 'Inflable monocromático', 'chip');
    eq(await page.evaluate(() => document.getElementById('fichaDesc').hidden), true, 'sin descripción');
    await page.keyboard.press('Escape'); await wait(600);
    assert(!(await visible(page, '#ficha .hoja')), 'no cerró con Escape');
  });
  await prueba('"Lo quiero" desde la ficha: baja a Aparta tu fecha, elige el inflable y abre el calendario completo', async () => {
    await tap(page, '.card[data-id="rainbow-jump"] .card-foto'); await wait(800);
    await tap(page, '#fichaQuiero'); await wait(2200);
    const r = await page.evaluate(() => ({
      sel: document.querySelector('.op[aria-pressed="true"]')?.dataset.value,
      cal: !document.getElementById('calCaja').hidden,
      calBottom: document.getElementById('cal').getBoundingClientRect().bottom,
      h2Top: document.getElementById('t-aparta').getBoundingClientRect().top,
      bar: document.getElementById('topbar').getBoundingClientRect().bottom,
    }));
    eq(r.sel, 'rainbow-jump', 'inflable elegido');
    assert(r.cal, 'calendario cerrado');
    assert(r.calBottom <= 844, `el calendario termina en ${r.calBottom}`);
    assert(r.h2Top >= r.bar, `el título queda bajo la barra (${r.h2Top} < ${r.bar})`);
    return `título en y=${Math.round(r.h2Top)}, calendario termina en y=${Math.round(r.calBottom)}`;
  });
  await prueba('Calendario: hoy marcado, días pasados bloqueados, meses y sábado 21 elegido', async () => {
    const r = await page.evaluate(() => ({
      mes: document.getElementById('calMes').textContent,
      hoy: document.querySelector('.cal-dia.hoy')?.dataset.date,
      pasados: [...document.querySelectorAll('.cal-dia')].filter((b) => b.disabled).map((b) => +b.textContent),
      prev: document.getElementById('calPrev').disabled,
    }));
    eq(r.mes, 'Noviembre 2026', 'mes'); eq(r.hoy, '2026-11-06', 'hoy'); eq(r.pasados.join(','), '1,2,3,4,5', 'pasados'); eq(r.prev, true, 'mes anterior');
    await tap(page, '#calNext'); await wait(200);
    eq(await texto(page, '#calMes'), 'Diciembre 2026', 'siguiente');
    await tap(page, '#calPrev'); await wait(200);
    await tap(page, '[data-date="2026-11-21"]'); await wait(1100);
    eq(await texto(page, '#fechaTxt'), 'Sábado 21 de noviembre', 'campo');
    eq(await page.evaluate(() => document.getElementById('calCaja').hidden), true, 'se cierra al elegir');
  });
  await prueba('Mensaje armado en vivo (vista previa) con todos los datos', async () => {
    await page.locator('#lugar').fill('Jardines de la Asunción');
    await page.locator('#hora').fill('4:00 pm');
    await tap(page, '[data-evento="Cumpleaños"]');
    await page.locator('.switch').tap();
    await wait(300);
    eq(await page.evaluate(() => window.__jf.mensaje()), ESPERADO, 'mensaje');
    eq(await page.evaluate(() => document.getElementById('burbuja').textContent), ESPERADO, 'burbuja');
    assert(await page.evaluate(() => document.getElementById('enviar').classList.contains('listo')), 'el botón no se activó');
  });
  await prueba('"Apartar por WhatsApp" abre wa.me/524491807242 con la solicitud escrita', async () => {
    await page.evaluate(() => { window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); return null; }; });
    await tap(page, '#enviar'); await wait(900);
    const u = await page.evaluate(() => window.__abiertos[0]);
    assert(u && u.startsWith('https://wa.me/524491807242?text='), u);
    eq(decodeURIComponent(u.split('?text=')[1]), ESPERADO, 'texto');
    assert(await visible(page, '#listo .hoja'), 'no se mostró "Tu mensaje está listo"');
    eq(await page.evaluate(() => document.getElementById('listoAbrir').href), u, 'botón Abrir WhatsApp');
    return u.slice(0, 60) + '…';
  });
  await prueba('Arma tu fiesta: tarjeta de mobiliario sin piezas ni precios y su enlace de WhatsApp', async () => {
    await page.keyboard.press('Escape'); await wait(500);
    const r = await page.evaluate(() => ({ h: document.querySelector('.postal h3').textContent, p: document.querySelector('.postal p').textContent, href: document.querySelector('[data-wa="mobiliario"]').href, img: document.querySelector('.postal img').naturalWidth }));
    eq(r.h, 'Pregunta por mobiliario', 'título'); eq(r.p, 'Pregúntanos por mobiliario para tu evento.', 'texto'); assert(r.img > 0, 'foto');
    eq(decodeURIComponent(r.href.split('?text=')[1]), '¡Hola, Jumpers Fest! Quiero preguntar por mobiliario para mi evento.', 'mensaje');
  });
  await prueba('Cómo funciona: Eliges, Apartas, Lo llevamos (sin horarios ni costos de flete)', async () => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.paso')].map((p) => p.querySelector('h3').textContent + ': ' + p.querySelector('p').textContent));
    eq(r.map((x) => x.split(':')[0]).join(', '), 'Eliges, Apartas, Lo llevamos', 'pasos');
    assert(!/\d\s?(h|hr|min|horas)|flete|gratis|\$/i.test(r.join(' ')), r.join(' / '));
    return r.join(' / ');
  });
  await prueba('Pie: WhatsApp de la bio, Instagram y aviso de demo no oficial', async () => {
    const r = await page.evaluate(() => ({ wa: document.querySelector('.pie [data-wa]').href, vis: document.getElementById('waVisible').textContent, ig: document.getElementById('igLink').href, legal: document.querySelector('.legal').textContent, bio: document.querySelector('.pie .bio').textContent }));
    assert(r.wa.startsWith('https://wa.me/524491807242?text='), r.wa); eq(r.vis, '449 180 7242', 'número');
    eq(r.ig, 'https://www.instagram.com/jumpersfestags/', 'instagram');
    eq(r.legal, 'Demo de cortesía de Elevate Negocios · página no oficial', 'aviso');
    eq(r.bio, 'Rentamos inflables monocromáticos · Aguascalientes, Mx.', 'bio');
  });
  await prueba('Accesibilidad básica: fotos con texto alternativo, botones con nombre, campos con etiqueta', async () => {
    const r = await page.evaluate(() => {
      const sinAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
      const sinNombre = [...document.querySelectorAll('button, a')].filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim() || b.getAttribute('aria-labelledby'))).length;
      const sinLabel = [...document.querySelectorAll('input')].filter((i) => !(i.labels && i.labels.length)).length;
      return { sinAlt, sinNombre, sinLabel };
    });
    assert(!r.sinAlt && !r.sinNombre && !r.sinLabel, JSON.stringify(r));
  });
  await prueba('Peso de la página (fotos, fuentes y código)', async () => {
    // página nueva sin reloj simulado: se cuentan todas las respuestas que pide al cargar y al bajar
    const c2 = await browser.newContext({ ...CEL });
    const p2 = await c2.newPage();
    const urls = [];
    p2.on('response', (r) => urls.push(r.url()));
    await p2.goto(srv.url); await p2.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await wait(1200);
    await c2.close();
    const files = [...new Set(urls.map((u) => decodeURIComponent(new URL(u).pathname)))].map((p) => path.join(ROOT, 'web', p.endsWith('/') ? p + 'index.html' : p));
    const kb = Math.round(files.reduce((s, f) => s + fs.statSync(f).size, 0) / 1024);
    assert(kb < 1600, kb + ' KB');
    return `${kb} KB en ${files.length} archivos`;
  });
  // Textos visibles para la revisión ortográfica
  const textos = await page.evaluate(() => {
    const t = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) { const s = n.textContent.replace(/\s+/g, ' ').trim(); if (s && !n.parentElement.closest('script,style')) t.add(s); }
    document.querySelectorAll('[alt],[aria-label],[placeholder]').forEach((e) => ['alt', 'aria-label', 'placeholder'].forEach((a) => e.getAttribute(a) && t.add(`[${a}] ${e.getAttribute(a)}`)));
    return [...t];
  });
  fs.writeFileSync(path.join(OUT, 'textos_visibles.txt'), textos.join('\n') + '\n\n--- Mensaje de WhatsApp ---\n' + ESPERADO + '\n');
  await ctx.close();
}

// ---------------- Validación (página nueva) ----------------
{
  const { ctx, page } = await abrir();
  await prueba('Validación: sin datos marca los 4 campos y explica qué falta', async () => {
    await page.evaluate(() => { window.open = () => { throw new Error('no debía abrir'); }; });
    await tap(page, '#enviar'); await wait(700);
    const r = await page.evaluate(() => [...document.querySelectorAll('.invalido .error-msg')].map((e) => e.textContent));
    eq(r.join(' | '), 'Elige un inflable. | Elige una fecha. | Escribe tu colonia o salón. | Escribe un horario aproximado.', 'errores');
    const top = await page.evaluate(() => document.getElementById('c-inflable').getBoundingClientRect().top);
    assert(top > 0 && top < 300, `el primer error quedó en y=${top}`);
    if (CAPTURAS) { await wait(400); }
  });
  await prueba('Validación: los errores se quitan al corregir y el botón se activa al final', async () => {
    await tap(page, '.op[data-value="magic-jump"]'); await wait(200);
    await page.locator('#lugar').fill('Sa'); await wait(100);
    let n = await page.evaluate(() => document.querySelectorAll('.invalido').length);
    eq(n, 2, 'errores restantes (fecha y hora)');
    await tap(page, '#fechaBtn'); await wait(800);
    await tap(page, '[data-date="2026-11-14"]'); await wait(1000);
    await page.locator('#hora').fill('Mediodía');
    await tap(page, '#enviar'); await wait(400);
    n = await page.evaluate(() => [...document.querySelectorAll('.invalido')].map((e) => e.id).join(','));
    eq(n, 'c-lugar', 'colonia muy corta');
    await page.locator('#lugar').fill('Salón Los Arcos'); await wait(100);
    assert(await page.evaluate(() => document.getElementById('enviar').classList.contains('listo')), 'botón sin activar');
  });
  await ctx.close();
}

// ---------------- Modo demo ----------------
{
  const { ctx, page } = await abrir({ query: '?demo=1' });
  await prueba('Modo demo (?demo=1): muestra el mensaje y no abre WhatsApp', async () => {
    await page.evaluate(() => { window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); return null; }; });
    await tap(page, '.card[data-id="castle-jump"] [data-quiero]'); await wait(1800);
    await tap(page, '[data-date="2026-11-28"]'); await wait(1000);
    await page.locator('#lugar').fill('Col. Centro'); await page.locator('#hora').fill('5:00 pm');
    await tap(page, '#enviar'); await wait(900);
    eq(await page.evaluate(() => window.__abiertos.length), 0, 'abrió WhatsApp');
    assert((await texto(page, '#listoTexto')).startsWith('Modo demo'), 'texto demo');
    assert((await texto(page, '#listoBurbuja')).includes('• Inflable: Castle Jump'), 'mensaje');
  });
  await ctx.close();
}

// ---------------- Otros tamaños ----------------
await prueba('Sin desbordes en 360×740, 430×932 y escritorio 1280×800 (tarjetas en 3 columnas)', async () => {
  const out = [];
  for (const vp of [{ width: 360, height: 740 }, { width: 430, height: 932 }, { width: 1280, height: 800 }]) {
    const desk = vp.width > 1000;
    const ctx = await browser.newContext({ ...CEL, viewport: vp, isMobile: !desk, hasTouch: !desk });
    const page = await ctx.newPage();
    await page.goto(srv.url); await wait(900);
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth, cols: getComputedStyle(document.getElementById('cards')).gridTemplateColumns.split(' ').length }));
    assert(r.sw <= r.w, `${vp.width}: scrollWidth ${r.sw}`);
    if (desk) eq(r.cols, 3, 'columnas en escritorio');
    out.push(`${vp.width}px ok`);
    await ctx.close();
  }
  return out.join(', ');
});
await prueba('Movimiento reducido: la página funciona sin animaciones', async () => {
  const ctx = await browser.newContext({ ...CEL, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(srv.url); await wait(300);
  await page.locator('.card[data-id="rainbow-jump"] .card-foto').tap(); await wait(150);
  const ok = await visible(page, '#ficha .hoja');
  await ctx.close();
  assert(ok, 'la ficha no abrió');
});

// ---------------- Capturas a 3× (texturas de la pantalla del celular) ----------------
if (CAPTURAS) {
  const { ctx, page } = await abrir({ dsf: 3, query: '?demo=1', espera: 1800 });
  const shot = async (n, nombre) => { await page.screenshot({ path: path.join(SHOTS, `${n}_${nombre}.png`) }); };
  const scrollA = async (y) => { await page.evaluate((y) => window.scrollTo(0, y), y); await wait(1100); };
  const yDe = (sel, off = 0) => page.evaluate(([s, o]) => Math.round(document.querySelector(s).getBoundingClientRect().top + window.scrollY - 64 + o), [sel, off]);
  await shot('01', 'portada');
  await scrollA(await yDe('#inflables', 30)); await shot('02', 'catalogo_castle');
  await scrollA(await yDe('.card[data-id="rainbow-jump"]', -18)); await shot('03', 'catalogo_rainbow');
  await scrollA(await yDe('.card[data-id="magic-jump"]', -18)); await shot('04', 'catalogo_magic');
  await scrollA(await yDe('.card[data-id="rainbow-jump"]', -18));
  await tap(page, '.card[data-id="rainbow-jump"] .card-foto'); await wait(900); await shot('05', 'ficha_rainbow');
  await tap(page, '#ficha .hoja-x'); await wait(600);
  await tap(page, '.card[data-id="castle-jump"] .card-foto'); await wait(900); await shot('06', 'ficha_castle');
  await tap(page, '#ficha .hoja-x'); await wait(600);
  await tap(page, '.card[data-id="rainbow-jump"] .card-foto'); await wait(900);
  await tap(page, '#fichaQuiero'); await wait(2300); await shot('07', 'aparta_calendario');
  await tap(page, '[data-date="2026-11-21"]'); await wait(450); await shot('08', 'aparta_sabado_marcado');
  await wait(800);
  await page.locator('#lugar').fill('Jardines de la Asunción'); await page.locator('#hora').fill('4:00 pm');
  await tap(page, '[data-evento="Cumpleaños"]'); await wait(300);
  await page.locator('.switch').tap(); await wait(300);
  await scrollA(await yDe('#c-lugar', -16)); await shot('09', 'aparta_datos');
  await scrollA(await page.evaluate(() => Math.round(document.getElementById('enviar').getBoundingClientRect().bottom + window.scrollY - 844 + 60))); await shot('10', 'aparta_boton_listo');
  await tap(page, '#enviar'); await wait(900); await shot('11', 'mensaje_listo');
  await page.keyboard.press('Escape'); await wait(600);
  await scrollA(await yDe('#fiesta', 30)); await shot('12', 'arma_tu_fiesta');
  await scrollA(await yDe('#como-funciona', 30)); await shot('13', 'como_funciona');
  await scrollA(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)); await shot('14', 'pie');
  await ctx.close();
  // validación con errores
  const v = await abrir({ dsf: 3, espera: 1500 });
  await v.page.evaluate(() => { window.open = () => null; });
  await tap(v.page, '#enviar'); await wait(1200);
  await v.page.screenshot({ path: path.join(SHOTS, '15_validacion.png') });
  await v.ctx.close();
  console.log('capturas 3× en', path.relative(ROOT, SHOTS));
}

await browser.close();
srv.cerrar();
const ok = resultados.filter((r) => r.ok).length;
fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify({ fecha_simulada: HOY, viewport: '390x844', ok, total: resultados.length, resultados }, null, 1));
console.log(`\n${ok}/${resultados.length} pruebas aprobadas`);
process.exit(ok === resultados.length ? 0 : 1);
