// Captura la página real (web/index.html) para el video: tira completa, barra, botón fijo, hoja de cita y las cajas del DOM.
// Uso: node captura.cjs  →  video/cap/
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), WEB = path.join(ROOT, 'web'), OUT = path.join(__dirname, 'cap'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname), f = path.join(WEB, p === '/' ? 'index.html' : p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] }); fs.createReadStream(f).pipe(r); });
const CSS = `*{animation:none!important;transition:none!important}html{scroll-behavior:auto!important}
body{background:transparent!important}#reflejos{display:none!important}
.cristal{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;border-color:transparent!important}
.cristal::after{display:none!important}
.portada>*,.rev{opacity:1!important;transform:none!important}.linea{transform:none!important}
.portada .logo,.portada .ante,.portada h1,.portada .linea,.sello b,.sello .estrellas{visibility:hidden}
dialog::backdrop{background:transparent!important;backdrop-filter:none!important}`;
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'es-MX' });
  const nueva = async extra => { const p = await ctx.newPage(); await p.goto(base); await p.addStyleTag({ content: CSS + (extra || '') }); await p.evaluate(async () => { document.querySelectorAll('img').forEach(i => i.loading = 'eager'); document.querySelectorAll('.rev').forEach(e => e.classList.add('visto')); await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => { }))); }); await p.waitForTimeout(400); return p; };
  // 1) tira completa
  let p = await nueva('.barra{visibility:hidden}.fija{display:none!important}');
  const R = await p.evaluate(() => {
    const bx = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; };
    const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], fs = e => parseFloat(getComputedStyle(e).fontSize);
    const cr = qa('main .cristal').map(e => ({ ...bx(e), r: Math.min(parseFloat(getComputedStyle(e).borderTopLeftRadius), e.getBoundingClientRect().height / 2), c: e.className.split(' ')[0] }));
    const pt = [...qa('.resena p')].find(e => e.textContent.includes('me dejaron mi auto')).firstChild, i0 = pt.data.indexOf('me dejaron mi auto'), rg = document.createRange();
    rg.setStart(pt, i0); rg.setEnd(pt, i0 + 'me dejaron mi auto mejor que en la entrega'.length);
    return {
      alto: document.documentElement.scrollHeight, cristal: cr, logo: bx(q('.portada .logo')), ante: { ...bx(q('.ante')), fs: fs(q('.ante')) },
      h1: qa('h1 span').map(s => ({ ...bx(s), fs: fs(s) })), linea: bx(q('.portada .linea')), b50: { ...bx(q('.sello b')), fs: fs(q('.sello b')) },
      estrellas: qa('.sello .estrellas svg').map(bx), sello: bx(q('.sello')), srv: qa('.srv').map(bx), nota: bx(q('.nota')), resenas: qa('.resena').map(bx),
      frase: [...rg.getClientRects()].map(r => ({ x: r.x, y: r.y + scrollY, w: r.width, h: r.height })), taller: bx(q('figure.taller')), sec: Object.fromEntries(qa('section').map(s => [s.id, bx(s).y])),
    };
  });
  await p.screenshot({ path: path.join(OUT, 'tira.png'), fullPage: true, omitBackground: true }); await p.close();
  // 2) barra superior
  p = await nueva('.barra{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}');
  R.barra = await p.evaluate(() => { const r = document.querySelector('.barra').getBoundingClientRect(); return { x: 0, y: 0, w: r.width, h: r.height }; });
  await p.locator('.barra').screenshot({ path: path.join(OUT, 'barra.png'), omitBackground: true });
  // 3) botón fijo
  await p.addStyleTag({ content: '.fija{background:none!important;transform:none!important}.fija .btn::before{display:none!important}' });
  R.fija = await p.evaluate(() => { const r = document.querySelector('.fija .btn').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.locator('.fija .btn').screenshot({ path: path.join(OUT, 'fija.png'), omitBackground: true });
  // 4) hoja de cita en el paso 3 (PPF · Frontal completo · SUV)
  await p.addStyleTag({ content: '.fija{display:none!important}.hoja{animation:none!important}' });
  await p.evaluate(() => document.querySelector('[data-cita="PPF"]').click());
  await p.locator('label.op:has-text("Frontal completo")').click(); await p.locator('label.op:has-text("SUV")').click(); await p.locator('#sig').click(); await p.waitForTimeout(300);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.addStyleTag({ content: 'main,.barra,footer{visibility:hidden!important}' });
  Object.assign(R, await p.evaluate(() => { const v = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }; return { hoja: v(document.querySelector('.hoja')), resumen: v(document.querySelector('#resumen')), enviar: v(document.querySelector('#enviar')), mensaje: document.querySelector('#resumen').textContent }; }));
  await p.locator('.hoja').screenshot({ path: path.join(OUT, 'hoja.png'), omitBackground: true });
  fs.writeFileSync(path.join(OUT, 'cajas.json'), JSON.stringify(R, null, 1));
  console.log('alto', R.alto, '| cristales', R.cristal.length, '| frase', R.frase.length, '| hoja', R.hoja, '| mensaje:', R.mensaje.replace(/\n/g, ' / '));
  console.log(JSON.stringify({ logo: R.logo, ante: R.ante, h1: R.h1, linea: R.linea, sello: R.sello, b50: R.b50, srv: R.srv.map(s => [s.y | 0, s.h | 0]), nota: R.nota, res: R.resenas.map(s => [s.y | 0, s.h | 0]), frase: R.frase, taller: R.taller, fija: R.fija, barra: R.barra, sec: R.sec }));
  await b.close(); srv.close();
})();
