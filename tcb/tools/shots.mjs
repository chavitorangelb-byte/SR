// Capturas de revisión: node tools/shots.mjs [ancho alto nombre] ...  (sirve la carpeta en un puerto local)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = process.env.OUT || path.join(ROOT, 'review'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };
export const servir = () => new Promise(r => { const s = http.createServer((q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { a.writeHead(404); a.end(); } else { a.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); a.end(d); } }); }).listen(0, () => r(s)); });
if (process.argv[1].endsWith('shots.mjs')) {
  const s = await servir(), url = `http://localhost:${s.address().port}/`;
  const tam = process.argv.length > 2 ? [process.argv.slice(2)] : [[1440, 900, 'desk'], [768, 1024, 'tab'], [390, 844, 'movil'], [360, 640, 'chico']];
  const b = await chromium.launch();
  for (const [w, h, n] of tam) {
    const c = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
    const p = await c.newPage(); const err = [];
    p.on('console', m => m.type() === 'error' && err.push(m.text())); p.on('pageerror', e => err.push(String(e)));
    await p.goto(url + (process.env.Q || '')); await p.waitForTimeout(3800);
    await p.screenshot({ path: `${OUT}/${n}-00.png` });
    const H = await p.evaluate(() => document.documentElement.scrollHeight); let i = 1;
    for (let y = 0; y < H; y += Math.round(h * 0.5)) { await p.mouse.wheel(0, Math.round(h * 0.5)); await p.waitForTimeout(260); }
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(400);
    const ids = ['menu', 'feed', 'armado', 'resenas', 'llegar', 'directo', 'oferta'];
    for (const id of ids) { await p.evaluate(i => { const e = document.getElementById(i); if (e && !e.hidden) scrollTo({ top: e.getBoundingClientRect().top + scrollY - 20, behavior: 'instant' }); }, id); await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/${n}-${String(i++).padStart(2, '0')}-${id}.png` }); }
    for (const k of [0.45, 0.62, 0.97]) { await p.evaluate(k => { const e = document.getElementById('armado'); scrollTo({ top: e.offsetTop + (e.offsetHeight - innerHeight) * k, behavior: 'instant' }); }, k); await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/${n}-03-armado-${Math.round(k * 100)}.png` }); }
    await p.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/${n}-99-pie.png` });
    const ov = await p.evaluate(() => { const o = document.documentElement.scrollWidth - innerWidth; const c = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.feed__tira,.tabs,.menu__fondo,.derretido,.muro__garabatos,svg')).slice(0, 5).map(e => e.className || e.tagName); return o + ' ' + c.join('|'); });
    console.log(n, w + 'x' + h, 'alto', H, 'desborde-x', ov, 'errores', err.length, err.slice(0, 4));
    await c.close();
  }
  await b.close(); s.close();
}
