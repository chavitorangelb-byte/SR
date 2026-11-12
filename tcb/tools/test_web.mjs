// Pruebas del demo: node tools/test_web.mjs   (carrito, teclado, WhatsApp, banderas, movimiento reducido, sin JS)
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
import { servir } from './shots.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = process.env.OUT || path.join(ROOT, 'review'); fs.mkdirSync(OUT, { recursive: true });
const s = await servir(), url = `http://localhost:${s.address().port}/`;
const b = await chromium.launch(); const res = []; let fallos = 0;
const ok = (n, c, d = '') => { res.push({ prueba: n, ok: !!c, detalle: String(d) }); if (!c) fallos++; console.log((c ? 'OK   ' : 'FALLA') + ' ' + n + (d ? '  · ' + d : '')); };
const nueva = async (o = {}, ruta = '') => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, ...o }); const p = await c.newPage(); const err = []; p.on('pageerror', e => err.push(String(e))); p.on('console', m => m.type() === 'error' && err.push(m.text())); await p.goto(url + ruta); await p.waitForTimeout(o.espera ?? 3500); return { c, p, err }; };

/* ---- 1. Móvil: carga, carrito, mensaje ---- */
{ const { c, p, err } = await nueva();
  ok('sin errores de consola', err.length === 0, err.join(' | '));
  ok('h1 dice el nombre', (await p.locator('h1 .sr').textContent()) === 'The Cheese Burger');
  ok('7 pestañas de menú', (await p.locator('[role=tab]').count()) === 7);
  ok('platillos pintados (burgers = 4)', (await p.locator('#panel-burgers .plato').count()) === 4);
  ok('barra de pedido oculta con carrito vacío', await p.locator('#barra').isHidden());
  await p.locator('#panel-burgers [data-add]').nth(1).click();          // Superbacon
  ok('agregar convierte el botón en contador', (await p.locator('#panel-burgers .plato').nth(1).locator('output').textContent()) === '1');
  ok('el foco queda en "+" tras agregar', await p.evaluate(() => document.activeElement.hasAttribute('data-inc')));
  await p.keyboard.press('Enter');
  ok('cuenta del nav = 2', (await p.locator('.nav__cuenta').textContent()) === '2');
  ok('barra muestra total $300', (await p.locator('#barra [data-total]').textContent()) === '$300');
  ok('aviso para lector de pantalla', (await p.locator('#avisos').textContent()).includes('Superbacon'));
  // opciones: boneless 16 pzas
  await p.locator('#tab-dont-skip').click(); await p.waitForTimeout(600);
  await p.locator('#panel-dont-skip .chip', { hasText: '16 pzas' }).click();
  ok('precio cambia con la opción', (await p.locator('.plato[data-id=boneless] [data-precio]').textContent()) === '$220');
  await p.locator('.plato[data-id=boneless] [data-add]').click();
  ok('total = $520', (await p.locator('#barra [data-total]').textContent()) === '$520');
  await p.screenshot({ path: `${OUT}/estado-barra-pedido.png` });
  // diálogo
  await p.locator('#barra [data-abrir-pedido]').click(); await p.waitForTimeout(600);
  ok('diálogo abierto', await p.evaluate(() => document.getElementById('pedido').open));
  ok('2 líneas en el pedido', (await p.locator('.linea-p').count()) === 2);
  await p.screenshot({ path: `${OUT}/estado-pedido.png` });
  await p.fill('#nombre', 'Salvador'); await p.fill('#notas', 'Sin tomate');
  await p.locator('#enviar').click(); await p.waitForTimeout(300);
  const msg = await p.locator('#burbuja').textContent(), href = await p.locator('#abrirWa').getAttribute('href');
  ok('DEMO_MODE muestra el mensaje antes de WhatsApp', await p.locator('#burbuja').isVisible());
  ok('mensaje lleva productos, total, tipo, nombre y notas', ['2 x Superbacon: $300', '1 x Boneless (16 pzas): $220', 'Total estimado: $520', 'Pedido: Paso a recoger', 'Nombre: Salvador', 'Notas: Sin tomate'].every(t => msg.includes(t)), msg.replace(/\n/g, ' / '));
  ok('enlace wa.me al número del negocio con el texto', href.startsWith('https://wa.me/528181618030?text=') && decodeURIComponent(href.split('text=')[1]) === msg);
  await p.screenshot({ path: `${OUT}/estado-mensaje.png` });
  fs.writeFileSync(`${OUT}/mensaje_whatsapp.txt`, msg);
  await p.locator('#volver').click(); await p.locator('#vaciar').click(); await p.waitForTimeout(300);
  ok('vaciar deja el estado vacío', await p.locator('#pedidoVacio').isVisible());
  await p.screenshot({ path: `${OUT}/estado-vacio.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('Escape cierra el diálogo', !(await p.evaluate(() => document.getElementById('pedido').open)));
  // persistencia
  await p.locator('#tab-burgers').click(); await p.locator('#panel-burgers [data-add]').first().click(); await p.reload(); await p.waitForTimeout(2500);
  ok('el pedido se conserva al recargar', (await p.locator('.nav__cuenta').textContent()) === '1');
  ok('sin desborde horizontal (390)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const chicos = await p.evaluate(() => [...document.querySelectorAll('a, button, input[type=radio] + span')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && e.offsetParent && (r.height < 40 || r.width < 40) && !e.closest('.pie__legal, .feed__nota, .saltar, [hidden]'); }).map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
  ok('áreas táctiles ≥ 40 px', chicos.length === 0, chicos.join(', '));
  await c.close(); }

/* ---- 2. Teclado (escritorio) ---- */
{ const { c, p } = await nueva({ viewport: { width: 1280, height: 800 } });
  await p.keyboard.press('Tab');
  ok('primer Tab = enlace "Saltar al menú"', await p.evaluate(() => document.activeElement.classList.contains('saltar')));
  await p.locator('#tab-burgers').focus(); await p.keyboard.press('ArrowRight');
  ok('flecha derecha cambia de pestaña', await p.evaluate(() => document.activeElement.id === 'tab-pollo' && document.activeElement.getAttribute('aria-selected') === 'true' && !document.getElementById('panel-pollo').hidden && document.getElementById('panel-burgers').hidden));
  await p.keyboard.press('End');
  ok('End va a la última pestaña', await p.evaluate(() => document.activeElement.id === 'tab-mas'));
  await p.keyboard.press('Home');
  const foco = await p.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e); return s.outlineStyle + ' ' + s.outlineWidth; });
  ok('foco visible en pestañas', /solid 3px/.test(foco), foco);
  await p.locator('.nav__pedido').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok('foco dentro del diálogo al abrir', await p.evaluate(() => document.getElementById('pedido').contains(document.activeElement)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('el foco regresa al botón que abrió', await p.evaluate(() => document.activeElement.classList.contains('nav__pedido')));
  ok('imágenes con alt', await p.evaluate(() => [...document.images].every(i => i.hasAttribute('alt'))));
  ok('un solo h1 y títulos en orden', await p.evaluate(() => document.querySelectorAll('h1').length === 1 && [...document.querySelectorAll('h1,h2,h3')].every((h, i, a) => !i || +h.tagName[1] - +a[i - 1].tagName[1] <= 1)));
  await c.close(); }

/* ---- 3. Movimiento reducido ---- */
{ const { c, p, err } = await nueva({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  ok('reduced motion: sin errores', err.length === 0, err.join('|'));
  ok('reduced motion: la burger no fija la pantalla', !(await p.evaluate(() => document.querySelector('.armado').classList.contains('armado--scroll'))));
  ok('reduced motion: título visible sin animar', await p.evaluate(() => [...document.querySelectorAll('.hero .ch')].every(e => getComputedStyle(e).opacity === '1')));
  ok('reduced motion: gotas dibujadas estáticas', await p.evaluate(() => document.querySelector('#heroGoteo path').getAttribute('d').length > 50 && [...document.querySelectorAll('.derretido path')].every(x => (x.getAttribute('d') || '').length > 50)));
  await p.evaluate(() => document.getElementById('armado').scrollIntoView()); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/estado-reduced-motion-burger.png` });
  await c.close(); }

/* ---- 4. Banderas ---- */
{ const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const p2 = await c2.newPage();
  await p2.route('**/data.js', async r => { const t = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8').replace('SHOW_OFFER: true', 'SHOW_OFFER: false').replace('SHOW_DEMO_BADGE: true', 'SHOW_DEMO_BADGE: false').replace('DEMO_MODE: true', 'DEMO_MODE: false').replace('SHOW_PENDIENTES: true', 'SHOW_PENDIENTES: false'); r.fulfill({ body: t, contentType: 'text/javascript' }); });
  await p2.goto(url); await p2.waitForTimeout(3000);
  ok('SHOW_OFFER=false oculta la oferta', await p2.locator('#oferta').isHidden());
  ok('SHOW_DEMO_BADGE=false quita la nota', await p2.locator('#demoBadge').isHidden() && !(await p2.locator('#pieLegal').textContent()).includes('Demo'));
  ok('SHOW_PENDIENTES=false quita "por confirmar"', (await p2.locator('.pend').count()) === 0);
  await p2.locator('#panel-burgers [data-add]').first().click(); await p2.locator('.nav__pedido').click(); await p2.waitForTimeout(400);
  await p2.evaluate(() => { window.__abierto = null; window.open = (u) => { window.__abierto = u; return null; }; });
  await p2.locator('#enviar').click(); const abierto = await p2.evaluate(() => window.__abierto);
  ok('DEMO_MODE=false abre WhatsApp directo', /^https:\/\/wa\.me\/528181618030\?text=/.test(abierto || ''), (abierto || 'nada').slice(0, 50));
  await c2.close(); }

/* ---- 5. Estados de error ---- */
{ const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage();
  await p.route('**/data.js', r => r.abort()); await p.goto(url); await p.waitForTimeout(1500);
  ok('si data.js falla hay mensaje de error con teléfono', (await p.locator('#menuCarga').textContent()).includes('No pudimos cargar el menú'));
  await p.evaluate(() => scrollTo({ top: document.getElementById('menu').offsetTop, behavior: 'instant' })); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/estado-error-menu.png` }); await c.close();
  const c3 = await b.newContext({ viewport: { width: 390, height: 844 } }); const p3 = await c3.newPage();
  await p3.route('**/fotos/*', r => r.abort()); await p3.goto(url); await p3.waitForTimeout(3000);
  await p3.evaluate(() => document.getElementById('feed').scrollIntoView()); await p3.waitForTimeout(1500);
  ok('foto que no carga = placeholder de tablero', (await p3.locator('.foto--falta').count()) >= 1);
  await p3.screenshot({ path: `${OUT}/estado-foto-faltante.png` }); await c3.close();
  const c4 = await b.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false }); const p4 = await c4.newPage(); await p4.goto(url);
  ok('sin JavaScript: título, textos y aviso visibles', await p4.locator('h1').isVisible() && await p4.locator('noscript').count() === 1 && await p4.locator('.hero__sub').isVisible());
  await c4.close(); }

/* ---- 6. Peso ---- */
{ const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage(); let bytes = 0, n = 0; const ext = [];
  p.on('response', async r => { try { const u = new URL(r.url()); if (u.hostname !== 'localhost') ext.push(u.hostname); bytes += (await r.body()).length; n++; } catch (e) {} });
  const t0 = Date.now(); await p.goto(url, { waitUntil: 'load' }); const tLoad = Date.now() - t0; await p.waitForTimeout(1500);
  ok('carga inicial < 700 KB sin comprimir', bytes < 700 * 1024, `${Math.round(bytes / 1024)} KB en ${n} archivos, load ${tLoad} ms`);
  ok('cero peticiones a terceros', ext.length === 0, ext.join(','));
  await c.close(); }

fs.writeFileSync(`${OUT}/resultados.json`, JSON.stringify({ fecha: new Date().toISOString(), total: res.length, fallos, pruebas: res }, null, 1));
console.log(`\n${res.length - fallos}/${res.length} pruebas OK`);
await b.close(); s.close(); process.exit(fallos ? 1 : 0);
