// Captura la página real para el video: una imagen alta con fondo transparente (1080 px de ancho),
// el botón fijo de pedido aparte y la posición exacta de cada elemento. Salida: video/ui/.
import { createRequire } from 'node:module';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), DIR = path.join(ROOT, 'web'), OUT = path.join(ROOT, 'video/ui');
fs.mkdirSync(OUT, { recursive: true });
const TY = { '.html': 'text/html', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { let f = path.join(DIR, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TY[path.extname(f)] }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => server.listen(0, r));
const K = 1080 / 390;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: K, isMobile: true, hasTouch: true, locale: 'es-MX', reducedMotion: 'reduce' });
const p = await ctx.newPage();
await p.clock.install({ time: new Date('2026-11-11T16:30:00Z') }); // miércoles 10:30 en Aguascalientes: "Abierto · cierra 16:00"
await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.waitForLoadState('networkidle'); await p.evaluate(() => document.fonts.ready);
// modo captura: el cristal lo pone el video (desenfoca el campo líquido de verdad), así que aquí va transparente
await p.addStyleTag({ content: `html,body{background:transparent!important}body::before{display:none!important}
  .glass{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;border-color:transparent!important}
  header.top{position:static!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-color:transparent!important}
  .rv{opacity:1!important;transform:none!important}.card::after{display:none!important}.hero .v60{visibility:hidden}` });
const SEL = { demo: '.demo', top: 'header.top', hero: '.hero', logo: '.hero .logo', v60: '.hero .v60', h1: '.hero h1', lema: '.hero p', donde: '.hero .where', btn1: '.hero .cta .pri', btn2: '.hero .cta .sec',
  metSh: '#metodos .sh', met0: '#met3 button:nth-child(1)', met1: '#met3 button:nth-child(2)', met2: '#met3 button:nth-child(3)', chips: '#metChips',
  tueSh: '#tuestes .sh', grind: '.grind', r0: '.roast:nth-child(1)', r1: '.roast:nth-child(2)', r2: '.roast:nth-child(3)', r3: '.roast:nth-child(4)', r4: '.roast:nth-child(5)', escala: '.scale',
  menuSh: '#menu .sh', tabs: '.tabs', menu: '.menu', menuNota: '#precioNota', tarSh: '#tarjeta .sh', card: '.card', tarNota: '#tarjetaNota',
  visSh: '#visita .sh', visita: '.visit', links: '.links', pie: 'footer', bar: '.bar .btn' };
const els = await p.evaluate(([S, K]) => Object.fromEntries(Object.entries(S).map(([k, s]) => { const r = document.querySelector(s).getBoundingClientRect(); return [k, { x: r.x * K, y: (r.y + scrollY) * K, w: r.width * K, h: r.height * K }]; })), [SEL, K]);
els.bar.y = (await p.evaluate(() => document.querySelector('.bar .btn').getBoundingClientRect().y)) * K; // posición dentro de la pantalla (fijo)
await p.locator('.bar .btn').screenshot({ path: path.join(OUT, 'bar.png'), omitBackground: true });
await p.addStyleTag({ content: '.bar,.sheet,.veil{display:none!important}body{padding-bottom:24px!important}' });
// la página completa en una sola pantalla alta (sin coser tramos): así no se duplican ni se mueven elementos
const hCss = await p.evaluate(() => document.documentElement.scrollHeight);
await p.setViewportSize({ width: 390, height: hCss }); await p.clock.runFor(300);
await p.screenshot({ path: path.join(OUT, 'page.png'), omitBackground: true });
fs.copyFileSync(path.join(DIR, 'img/v60.png'), path.join(OUT, 'v60.png'));
const ph = (await p.evaluate(() => document.documentElement.scrollHeight)) * K;
fs.writeFileSync(path.join(OUT, 'ui.json'), JSON.stringify({ vw: 1080, vh: Math.round(844 * K), ph, els }, null, 1));
console.log('página', 1080, '×', Math.round(ph), '·', Object.keys(els).length, 'elementos');
for (const k of ['hero', 'h1', 'v60', 'metSh', 'met0', 'chips', 'tueSh', 'r0', 'r4', 'escala', 'menuSh', 'menu', 'tarSh', 'card', 'tarNota', 'visSh', 'bar', 'top']) console.log(k.padEnd(8), Object.values(els[k]).map((v) => Math.round(v)).join(' '));
await b.close(); server.close();
