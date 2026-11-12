// Exporta los objetos dibujados en código (V60, Chemex, prensa, bolsa, vasitos) a PNG transparentes para la página.
import { createRequire } from 'node:module';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), DIR = path.join(ROOT, 'video');
const server = http.createServer((q, r) => { const f = path.join(DIR, new URL(q.url, 'http://x').pathname); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.woff2') ? 'font/woff2' : 'text/html' }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => server.listen(0, r));
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage();
await p.goto(`http://127.0.0.1:${server.address().port}/index.html?w=270&h=480`); await p.waitForFunction(() => window.ready);
const out = await p.evaluate(() => {
  const mkc = (w, h, ox, oy, sc, fn) => { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d'); x.scale(2, 2); x.translate(ox, oy); x.scale(sc, sc); fn(x); return c.toDataURL('image/png'); };
  const o = { v60: mkc(300, 250, 140, 240, 0.72, (c) => v60(c, 0)), chemex: mkc(180, 230, 90, 115, 1, (c) => chemex(c)), prensa: mkc(200, 250, 90, 128, 1, (c) => prensa(c)), bolsa: mkc(300, 340, 150, 300, 0.66, (c) => bolsa(c, -0.17, 0)) };
  ROAST.forEach((r, i) => (o['tueste_' + (i + 1)] = mkc(130, 120, 65, 62, 1.1, (c) => vasito(c, r[1], i))));
  return o;
});
for (const [k, v] of Object.entries(out)) fs.writeFileSync(path.join(ROOT, 'web/img', k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
console.log(Object.keys(out).join(', ')); await b.close(); server.close();
