// Fotos de la página para presentar a DeliciArte:
// - review/fotos (entrega/fotos): pantalla_01_inicio.jpg y pantalla_02_postres.jpg (captura plana a 3×, 1170 × 2640)
// - lamina_01..03.jpg: el celular de cristal con la página, en el lenguaje del video (1080 × 1920, 8 subcuadros)
// Uso: node deliciarte/tools/fotos_pagina.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'entrega', 'fotos');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/video/render/index.html`;
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const toJpg = (png, jpg) => { execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-q:v', '2', jpg]); fs.unlinkSync(png); };

async function abrir(q) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('ERROR página:', e.message));
  await page.goto(`${base}?w=1080&h=1920&fmt=916&${q}`);
  await page.waitForFunction(() => window.ready || window.initError, null, { timeout: 120000 });
  return page;
}

// capturas planas
{
  const page = await abrir('');
  const estados = {
    pantalla_01_inicio: { modo: 'pagina', logo: true, hero: true, tiles: [true, true, true, true], chip: 0, filtro: 'todos' },
    pantalla_02_postres: { modo: 'pagina', logo: true, hero: true, tiles: [true, true, true, true], chip: 1, filtro: 'postres', t07: true, t04: true },
  };
  for (const [nombre, sc] of Object.entries(estados)) {
    const url = await page.evaluate((sc) => window.exportPantalla(sc, 3), sc);
    const png = path.join(OUT, nombre + '.png');
    fs.writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
    toJpg(png, path.join(OUT, nombre + '.jpg'));
    console.log(nombre + '.jpg');
  }
  await page.close();
}
// láminas
const LAMINAS = [[1, 640, 'lamina_01_asi_se_veria_tu_pagina'], [2, 740, 'lamina_02_catalogo_por_categorias'], [3, 826, 'lamina_03_pedidos_por_whatsapp']];
for (const [n, f, nombre] of LAMINAS) {
  const page = await abrir(`lamina=${n}`);
  const url = await page.evaluate((f) => window.renderFrame(f, { sub: 8, shutter: 0.5 }), f);
  const png = path.join(OUT, nombre + '.png');
  fs.writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
  toJpg(png, path.join(OUT, nombre + '.jpg'));
  console.log(nombre + '.jpg');
  await page.close();
}
await browser.close();
server.close();
