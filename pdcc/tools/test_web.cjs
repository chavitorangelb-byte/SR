// Prueba funcional + capturas de la página en vista de celular. Uso: node tools/test_web.cjs
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), WEB = path.join(ROOT, 'web'), OUT = path.join(ROOT, 'review', 'web'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname), f = path.join(WEB, p === '/' ? 'index.html' : p); if (!f.startsWith(WEB) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
const res = []; const ok = (n, c, d = '') => { res.push({ n, ok: !!c, d }); console.log(`${c ? 'OK   ' : 'FALLA'} ${n}${d ? ' — ' + d : ''}`); };
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const fallos = []; p.on('requestfailed', r => fallos.push(r.url())); p.on('response', r => r.status() >= 400 && fallos.push(r.url()));
  await p.goto(base + '?demo=1'); await p.waitForTimeout(1800);
  const shot = n => p.screenshot({ path: path.join(OUT, n) });
  await shot('01_portada.jpg');
  ok('Sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  ok('Sin recursos rotos', fallos.length === 0, fallos.join(' | '));
  ok('Fuentes cargadas', await p.evaluate(() => document.fonts.check('700 40px "Barlow Condensed"') && document.fonts.check('500 16px Inter')));
  ok('Sin desborde horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok('El fondo de reflejos pinta algo', await p.evaluate(() => { const c = document.getElementById('reflejos'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false; }));
  ok('Sin azul en colores de la página', await p.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const s = getComputedStyle(el); for (const v of [s.color, s.backgroundColor, s.borderTopColor]) { const m = v.match(/\d+(\.\d+)?/g); if (m && +m[2] > +m[0] + 30 && +m[2] > +m[1] + 30 && (m[3] === undefined || +m[3] > 0.1)) return false; } } return true; }));
  ok('Todos los botones y enlaces miden 44 px o más de alto', await p.evaluate(() => [...document.querySelectorAll('main a, main button, .barra a, .fija button')].every(e => e.getBoundingClientRect().height >= 43.5)));
  const txt = await p.evaluate(() => document.body.innerText);
  for (const [n, re] of [['teléfono', /33\s?1213|3312137910/], ['precios', /\$\s?\d/], ['XPEL', /xpel/i], ['garantía', /garant/i], ['dirección exacta', /Federalistas|Camino Real/i]]) ok(`No se muestra: ${n}`, !re.test(txt));
  for (const f of ['¡El mejor servicio de detailing! Apenas tuvimos el coche y directo con ellos para un PPF completo, sin pensarlo. Su trabajo es excelente, son muy profesionales y sus…', 'me dejaron mi auto mejor que en la entrega, no sabia que se podia ver aun mejor!', 'desde inicio la atención es muy cálida con todo género de…']) ok(`Reseña textual: ${f.slice(0, 34)}…`, txt.includes(f));
  ok('Enlace de Instagram', await p.locator('.barra a.ig').getAttribute('href') === 'https://www.instagram.com/prodetailingcarcare/');
  // recorrido con capturas
  for (const [id, n] of [['nosotros', '02_nosotros'], ['servicios', '03_servicios'], ['resenas', '05_resenas'], ['taller', '06_taller'], ['visitanos', '07_visitanos']]) {
    await p.evaluate(i => document.getElementById(i).scrollIntoView({ behavior: 'instant', block: 'start' }), id); await p.waitForTimeout(1100); await shot(n + '.jpg');
    if (id === 'servicios') { await p.evaluate(() => scrollBy({ top: 620, behavior: 'instant' })); await p.waitForTimeout(1100); await shot('04_servicios_b.jpg'); }
  }
  ok('La barra fija aparece al bajar', await p.evaluate(() => document.getElementById('fija').classList.contains('ver')));
  ok('Las secciones se revelan al hacer scroll', await p.evaluate(() => document.querySelectorAll('.rev.visto').length > 8));
  // flujo de cita completo desde la tarjeta PPF
  await p.evaluate(() => document.getElementById('servicios').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(300);
  await p.locator('[data-cita="PPF"]').click(); await p.waitForTimeout(600);
  ok('Cotizar PPF abre la hoja en el paso 2', await p.locator('fieldset[data-paso="2"]').isVisible());
  ok('Siguiente bloqueado sin elegir', await p.locator('#sig').isDisabled());
  await p.locator('label.op:has-text("Frontal completo")').click(); await p.locator('label.op:has-text("SUV")').click();
  await p.fill('#auto', 'Mazda CX-5 2023'); await shot('08_cita_paso2.jpg');
  ok('Siguiente se habilita', await p.locator('#sig').isEnabled());
  await p.locator('#sig').click(); await p.fill('#nombre', 'Ana'); await p.waitForTimeout(300); await shot('09_cita_paso3.jpg');
  const href = await p.locator('#enviar').getAttribute('href'); const msg = decodeURIComponent(href.split('text=')[1]);
  ok('Enlace de WhatsApp al número del negocio', href.startsWith('https://wa.me/523312137910?text='));
  ok('Mensaje con servicio, cobertura, vehículo y nombre', ['PPF (Frontal completo)', 'SUV · Mazda CX-5 2023', 'Nombre: Ana'].every(s => msg.includes(s)), msg.replace(/\n/g, ' / '));
  const pages = ctx.pages().length; await p.locator('#enviar').click(); await p.waitForTimeout(500);
  ok('Modo demo: no abre WhatsApp y muestra el mensaje', ctx.pages().length === pages && await p.locator('#demo').isVisible()); await shot('10_cita_demo.jpg');
  await p.locator('#atras').click(); await p.locator('#atras').click();
  ok('Atrás regresa al paso 1 con PPF marcado', await p.locator('input[name=srv][value="PPF"]').isChecked());
  await p.locator('label.op:has-text("Corrección de pintura")').click(); await p.locator('#sig').click(); await p.locator('label.op:has-text("Pickup")').click(); await p.locator('#sig').click();
  const m2 = decodeURIComponent((await p.locator('#enviar').getAttribute('href')).split('text=')[1]);
  ok('Cambiar de servicio limpia la cobertura anterior', m2.includes('Servicio: Corrección de pintura\n') && !m2.includes('Frontal'), m2.replace(/\n/g, ' / '));
  await p.locator('#cerrar').click(); ok('La hoja se cierra', !(await p.locator('#cita').evaluate(d => d.open)));
  // sin modo demo, el botón general empieza en el paso 1
  const p2 = await ctx.newPage(); await p2.goto(base); await p2.waitForTimeout(1500); await p2.locator('.portada [data-cita]').click();
  ok('Agenda tu cita (portada) abre en el paso 1', await p2.locator('fieldset[data-paso="1"]').isVisible());
  // pantalla chica y escritorio
  for (const [w, h, n] of [[320, 568, 'chico'], [1280, 800, 'escritorio']]) { const c = await b.newContext({ viewport: { width: w, height: h } }), q = await c.newPage(); await q.goto(base); await q.waitForTimeout(1500); ok(`Sin desborde en ${w} px`, await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await q.screenshot({ path: path.join(OUT, `11_${n}.jpg`) }); await c.close(); }
  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(res, null, 1));
  console.log(`\n${res.filter(r => r.ok).length}/${res.length} pruebas pasan`); await b.close(); srv.close();
})();
