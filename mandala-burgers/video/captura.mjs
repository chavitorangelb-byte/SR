// Captura la página real para el video: cada elemento [data-s] como sprite con fondo transparente,
// más su posición en cada estado del filtro. Salida: build/ui/*.png y build/ui/layout.json
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build', 'ui');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
export function servidor() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await servidor();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const DSF = 2, PAD = 26;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DSF });
  page.on('pageerror', (e) => console.error('ERROR página:', e.message));
  await page.goto(`${base}/web/index.html?captura=1`);
  await page.waitForFunction(() => window.lista);
  const medir = () => page.evaluate(() => {
    const o = {};
    document.querySelectorAll('[data-s]').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width) o[e.dataset.s] = { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; });
    return { rects: o, alto: document.documentElement.scrollHeight };
  });
  const estados = {};
  for (const k of ['todos', 'amarillo', 'azul', 'rosa', 'morado', 'rojo']) { await page.evaluate((k) => filtrar(k), k); estados[k] = await medir(); }
  await page.evaluate(() => filtrar('todos'));
  // vista completa de referencia (para revisar el diseño)
  await page.screenshot({ path: path.join(OUT, '_pagina_completa.png'), fullPage: true });
  await page.addStyleTag({ content: 'html,body{background:transparent!important}[data-s]{visibility:hidden!important}[data-s].solo,[data-s].solo *:not([data-s]){visibility:visible!important}' });
  const alto = estados.todos.alto;
  await page.setViewportSize({ width: 390, height: alto });
  const sprites = {};
  for (const [id, r] of Object.entries(estados.todos.rects)) {
    await page.evaluate((id) => { document.querySelectorAll('.solo').forEach((e) => e.classList.remove('solo')); document.querySelector(`[data-s="${id}"]`).classList.add('solo'); }, id);
    const clip = { x: Math.max(0, r.x - PAD), y: Math.max(0, r.y - PAD), width: 0, height: 0 };
    clip.width = Math.min(390, r.x + r.w + PAD) - clip.x; clip.height = Math.min(alto, r.y + r.h + PAD) - clip.y;
    await page.screenshot({ path: path.join(OUT, id + '.png'), clip, omitBackground: true });
    sprites[id] = { dx: clip.x - r.x, dy: clip.y - r.y, w: clip.width, h: clip.height };
  }
  // versión de computadora: la misma página a 1280 px, menú a tres columnas
  const pd = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  await pd.goto(`${base}/web/index.html?fijo=1`); await pd.waitForFunction(() => window.lista);
  await pd.addStyleTag({ content: '.fab{display:none}.enc{position:relative}' });
  await pd.screenshot({ path: path.join(OUT, '_escritorio.png'), clip: { x: 0, y: 0, width: 1280, height: 2300 }, fullPage: true });
  fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify({ dsf: DSF, ancho: 390, estados, sprites }, null, 1));
  console.log(Object.keys(sprites).length, 'sprites · alto de página', alto);
  await browser.close(); server.close();
}
