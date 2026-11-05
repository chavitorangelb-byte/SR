// Prueba funcional + capturas de la página de Florería Roma en vista de celular.
// Uso: node tools/test_web.mjs [carpeta_salida]
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'review', 'fase0'));
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(WEB, p === '/' ? 'index.html' : p);
  if (!file.startsWith(WEB) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'OK ' : 'FALLA'} ${name}${detail ? ' — ' + detail : ''}`); };

const browser = await chromium.launch();
const ctxOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Mexico_City' };

async function settle(page, extra = 120) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'), null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(extra);
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) });
const scrollToEl = (page, sel, offset = 0) => page.evaluate(([s, o]) => {
  const el = document.querySelector(s);
  const y = el.getBoundingClientRect().top + scrollY - o;
  window.scrollTo({ top: y, behavior: 'instant' });
}, [sel, offset]);

// ---------------- Recorrido principal ----------------
{
  const ctx = await browser.newContext(ctxOpts);
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }));
  await ctx.route('https://www.google.com/**', (r) => r.fulfill({ status: 200, body: 'maps' }));
  await ctx.route('https://www.instagram.com/**', (r) => r.fulfill({ status: 200, body: 'ig' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const fontsOk = await page.evaluate(() => document.fonts.check('600 20px "Playfair Display"') && document.fonts.check('400 16px "DM Sans"') && [...document.fonts].filter((f) => f.status === 'loaded').length >= 2);
  check('Fuentes locales cargadas (Playfair Display + DM Sans)', fontsOk);
  await settle(page, 300);
  await shot(page, '01_portada.png');

  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('Sin scroll horizontal en 390 px', hscroll <= 0, `sobrante ${hscroll}px`);

  // Ver catálogo
  await page.tap('.hero-actions .btn-primary');
  await page.waitForTimeout(1200);
  await settle(page);
  const catTop = await page.evaluate(() => document.querySelector('#catalogo .eyebrow').getBoundingClientRect().top);
  check('"Ver catálogo" deja el título del catálogo bajo la barra', catTop > 70 && catTop < 110, `top=${Math.round(catTop)}`);
  await shot(page, '02_catalogo.png');

  const order = () => page.evaluate(() => [...document.querySelectorAll('#grid > *')].map((el) => el.dataset.id || (el.classList.contains('grid-divider') ? '|' : el.classList.contains('grid-note') ? 'nota' : '?')));
  check('Catálogo con 11 arreglos', (await order()).length === 11, (await order()).join(','));

  await page.tap('[data-filter="tulipanes"]');
  await page.waitForTimeout(80);
  await shot(page, '03a_filtro_tulipanes_en_movimiento.png');
  await settle(page, 200);
  await shot(page, '03_filtro_tulipanes.png');
  let o = await order();
  check('Filtro Tulipanes reordena: tulipanes primero', o.slice(0, 4).join(',') === 'tulipanes-y-rosas,caja-de-tulipanes,tulipanes-fucsia,|', o.join(','));

  await page.tap('[data-filter="ramos"]');
  await settle(page, 200);
  await shot(page, '04_filtro_ramos.png');
  o = await order();
  check('Filtro Ramos: 9 ramos, separador, 2 en caja', o.indexOf('|') === 9 && o.slice(10).join(',') === 'caja-de-tulipanes,caja-rosas-eucalipto', o.join(','));

  await page.tap('[data-filter="caja"]');
  await settle(page, 200);
  o = await order();
  check('Filtro En caja', o.slice(0, 3).join(',') === 'caja-de-tulipanes,caja-rosas-eucalipto,|', o.join(','));

  await page.tap('[data-filter="inmediata"]');
  await settle(page, 200);
  await shot(page, '05_filtro_inmediata.png');
  o = await order();
  check('Filtro Inmediata: aviso honesto, sin inventar disponibilidad', o[0] === 'nota' && o[1] === '|', o.slice(0, 3).join(','));

  await page.tap('[data-filter="ramos"]');
  await settle(page, 200);

  // Abrir ficha (paso 1)
  await page.tap('.card[data-id="tulipanes-y-rosas"] .card-hit');
  await page.waitForTimeout(140);
  await shot(page, '06a_abre_ficha_en_movimiento.png');
  await settle(page, 200);
  await shot(page, '06_paso1_ficha.png');
  check('Ficha: nombre y precio publicado', (await page.textContent('#p1Name')) === 'Tulipanes y rosas' && (await page.textContent('#p1Price')) === '$820', await page.textContent('#p1Price'));

  await page.tap('#next');
  await settle(page, 150);
  check('Validación paso 1: pide tamaño', await page.evaluate(() => document.querySelector('#fSize').classList.contains('is-invalid') && window.Roma.step === 1));
  await shot(page, '06b_paso1_error.png');
  await page.tap('[data-seg="size"] [data-value="M"]');
  await settle(page, 150);
  check('Tamaño M seleccionado', await page.evaluate(() => window.Roma.order.size === 'M' && !document.querySelector('#fSize').classList.contains('is-invalid')));
  await shot(page, '07_paso1_tamano_M.png');

  // Paso 2
  await page.tap('#next');
  await settle(page, 200);
  check('Avanza a paso 2', await page.evaluate(() => window.Roma.step === 2));
  await page.tap('#next');
  await settle(page, 150);
  check('Validación paso 2: pide entrega y fecha', await page.evaluate(() => ['fMode', 'fDate'].every((id) => document.getElementById(id).classList.contains('is-invalid')) && window.Roma.step === 2));
  await shot(page, '08a_paso2_errores.png');
  await page.tap('[data-seg="mode"] [data-value="domicilio"]');
  await settle(page, 150);
  await page.tap('#dateBtn');
  await page.waitForTimeout(160);
  await shot(page, '08b_calendario_abriendo.png');
  await settle(page, 300);
  await shot(page, '08_paso2_calendario.png');
  const pastDisabled = await page.evaluate(() => { const b = [...document.querySelectorAll('#calGrid button')]; const t = new Date(); return b.filter((x) => +x.textContent < t.getDate()).every((x) => x.disabled) && b.some((x) => !x.disabled); });
  check('Calendario: días pasados deshabilitados', pastDisabled);
  // elegir pasado mañana
  const target = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 2); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const inMonth = await page.$(`#calGrid [data-date="${target}"]`);
  if (!inMonth) await page.tap('#calNext');
  await page.tap(`#calGrid [data-date="${target}"]`);
  await settle(page, 450);
  await page.tap('#next');
  await settle(page, 150);
  check('Validación: a domicilio exige dirección', await page.evaluate(() => document.getElementById('fAddr').classList.contains('is-invalid')));
  await page.tap('#addr');
  await page.locator('#addr').pressSequentially('Calle de ejemplo 123, Jardines del Sur', { delay: 8 });
  await page.tap('#msg');
  await page.locator('#msg').pressSequentially('Feliz cumpleaños', { delay: 20 });
  await settle(page, 400);
  await shot(page, '09_paso2_lleno.png');
  check('Contador de la tarjeta', (await page.textContent('#msgCount')) === '16');

  // Paso 3
  await page.tap('#next');
  await settle(page, 300);
  check('Avanza a paso 3 (resumen)', await page.evaluate(() => window.Roma.step === 3));
  await shot(page, '10_paso3_resumen.png');
  const href = await page.getAttribute('#send', 'href');
  const text = decodeURIComponent(href.split('?text=')[1] || '');
  check('Enlace a WhatsApp 449 219 0609', href.startsWith('https://wa.me/524492190609?text='));
  check('Mensaje con arreglo, tamaño, precio publicado', text.includes('Tulipanes y rosas (Tonos rosas y blush)') && text.includes('Tamaño: M (mediano)') && text.includes('Precio: $820'));
  check('Mensaje con entrega, fecha, dirección y tarjeta', text.includes('Entrega: A domicilio') && /Fecha: \S+ \d+ de \S+/.test(text) && text.includes('Dirección: Calle de ejemplo 123') && text.includes('“Feliz cumpleaños”'));
  check('Mensaje menciona anticipo del 50 % no reembolsable', text.includes('anticipo del 50 % (no reembolsable)'));
  fs.writeFileSync(path.join(OUT, 'mensaje_whatsapp.txt'), text);

  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.tap('#send')]);
  await popup.waitForLoadState().catch(() => {});
  check('El botón final abre WhatsApp con el pedido escrito', popup.url().startsWith('https://wa.me/524492190609?text='), popup.url().slice(0, 60) + '…');
  await popup.close();
  await settle(page, 700);
  await shot(page, '11_listo.png');
  check('Confirmación "¡Listo!" tras enviar', await page.isVisible('#done'));

  await page.tap('#doneClose');
  await settle(page, 300);
  check('Cierra la hoja y vuelve a la página', await page.evaluate(() => !document.querySelector('#sheet').classList.contains('is-open') && !document.documentElement.classList.contains('is-locked')));

  // Secciones de confianza
  await scrollToEl(page, '#como-funciona', 72);
  await settle(page, 300);
  await shot(page, '12_como_funciona.png');
  await scrollToEl(page, '#resenas', 72);
  await settle(page, 300);
  await shot(page, '13_resenas.png');
  await page.evaluate(() => document.querySelector('#reviews').scrollTo({ left: 9999, behavior: 'instant' }));
  await settle(page, 300);
  await shot(page, '13b_resenas_final.png');
  const reviewsText = await page.$$eval('.review blockquote', (b) => b.map((x) => x.textContent));
  check('Reseñas 1, 3, 4 y 5 en el carrusel', reviewsText.length === 4);
  await scrollToEl(page, '#ubicacion', 72);
  await settle(page, 300);
  await shot(page, '14_ubicacion.png');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await settle(page, 300);
  await shot(page, '15_pie.png');
  await page.screenshot({ path: path.join(OUT, '00_pagina_completa.png'), fullPage: true });

  check('Sin errores de consola', errors.length === 0, errors.join(' | '));
  check('Sin recursos fallidos', failed.length === 0, failed.join(' | '));
  await ctx.close();
}

// ---------------- Modo demo: no abre WhatsApp, muestra el mensaje ----------------
{
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  let opened = false;
  ctx.on('page', () => { opened = true; });
  await page.goto(BASE + '?demo=1', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.Roma.openOrder('ramo-kraft-pastel'));
  await settle(page);
  await page.tap('[data-seg="size"] [data-value="L"]');
  await page.tap('#next');
  await settle(page);
  await page.tap('[data-seg="mode"] [data-value="pickup"]');
  await settle(page, 200);
  await page.tap('#dateBtn');
  await settle(page, 200);
  const first = await page.$('#calGrid button:not([disabled])');
  await first.tap();
  await settle(page, 450);
  await shot(page, '16_demo_pickup.png');
  await page.tap('#next');
  await settle(page, 300);
  await page.tap('#send');
  await settle(page, 200);
  await shot(page, '17_demo_vista_previa.png');
  check('Modo demo: muestra vista previa y no abre WhatsApp', (await page.isVisible('#preview')) && !opened);
  const t = await page.textContent('#pvText');
  check('Pick up: sin dirección del cliente, con precio $1,400', t.includes('Pick up') && !t.includes('Dirección') && t.includes('$1,400'));
  await ctx.close();
}

// ---------------- Escritorio ----------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1, locale: 'es-MX' });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await settle(page, 300);
  await shot(page, '18_escritorio.png');
  const hs = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('Escritorio sin scroll horizontal', hs <= 0, `${hs}px`);
  await ctx.close();
}

// ---------------- Entrada de la portada ----------------
{
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(520);
  await shot(page, '19_entrada_portada.png');
  await settle(page, 200);
  const visible = await page.evaluate(() => ['.hero-media', '.hero-logo', '.hero .lead', '.hero-actions'].every((s) => getComputedStyle(document.querySelector(s)).opacity === '1'));
  check('Entrada de portada termina con todo visible', visible);
  await ctx.close();
}

// ---------------- Archivo único (dist) ----------------
const DIST = path.join(ROOT, 'dist', 'floreria-roma.html');
if (fs.existsSync(DIST)) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('requestfailed', (r) => errs.push('falló ' + r.url().slice(0, 80)));
  await page.goto('file://' + DIST + '?demo=1', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 200);
  const imgsOk = await page.evaluate(() => [...document.images].filter((i) => !i.closest('#sheet')).every((i) => i.complete && i.naturalWidth > 1));
  const fontsOk = await page.evaluate(() => document.fonts.check('600 20px "Playfair Display"') && document.fonts.check('400 16px "DM Sans"'));
  await page.evaluate(() => window.Roma.openOrder('tulipanes-y-rosas'));
  await settle(page, 200);
  const p1 = await page.evaluate(() => document.querySelector('#p1Img').naturalWidth);
  check('Archivo único: fotos, fuentes y ficha funcionan sin servidor', imgsOk && fontsOk && p1 === 400 && errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
const fails = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length - fails.length}/${results.length} pruebas OK`);
process.exit(fails.length ? 1 : 0);
