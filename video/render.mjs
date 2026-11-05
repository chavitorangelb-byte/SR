// Render del video cuadro por cuadro en Chromium (WebGL por CPU) y armado con ffmpeg.
// Uso:
//   node video/render.mjs --desde 144 --hasta 450 --fps 30 --w 540 --h 960 --sub 8 --out review/fase4/prueba_estilo.mp4
//   node video/render.mjs --solo 330 --w 540 --h 960 --out /ruta/cuadro.png      (un cuadro, para revisar)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg('w', 540), H = +arg('h', 960), SUB = +arg('sub', 8), FPS = +arg('fps', 30);
const UI = arg('ui', '/video/build/ui_dsf2');
const OUT = path.resolve(ROOT, arg('out', 'review/fase4/prueba_estilo.mp4'));
const SOLO = arg('solo', null);
const DESDE = +arg('desde', 144), HASTA = +arg('hasta', 450);
const STEP = 60 / FPS;
const SHUTTER = +arg('shutter', STEP * 0.5 * 2) / 2; // 180°: medio intervalo entre cuadros de salida

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('ERROR página:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('consola:', m.text()); });
await page.goto(`${base}/video/render/index.html?w=${W}&h=${H}&ui=${encodeURIComponent(UI)}`);
await page.waitForFunction(() => window.ready || window.initError, null, { timeout: 120000 });
const initError = await page.evaluate(() => window.initError);
if (initError) { console.error(initError); process.exit(1); }

async function frame(f) {
  const url = await page.evaluate(([f, sub, shutter]) => window.renderFrame(f, { sub, shutter }), [f, SUB, SHUTTER]);
  return Buffer.from(url.split(',')[1], 'base64');
}

if (SOLO != null) {
  const t0 = Date.now();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, await frame(+SOLO));
  console.log(`cuadro ${SOLO} → ${path.relative(ROOT, OUT)} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else {
  const dir = path.join(ROOT, 'video', 'build', 'frames_' + path.basename(OUT, path.extname(OUT)));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.floor((HASTA - DESDE) / STEP) + 1;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    fs.writeFileSync(path.join(dir, `${String(i).padStart(5, '0')}.png`), await frame(DESDE + i * STEP));
    if (i % 10 === 0) process.stdout.write(`${i}/${n} (${((Date.now() - t0) / 1000 / (i + 1)).toFixed(2)} s/cuadro) `);
  }
  console.log(`\n${n} cuadros en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const voz = path.join(ROOT, 'voz', 'voz_stem_48k.wav');
  const args = ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.png')];
  if (fs.existsSync(voz)) args.push('-ss', String(DESDE / 60), '-t', String((n) / FPS), '-i', voz);
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (fs.existsSync(voz)) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push(OUT);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  console.log(`→ ${path.relative(ROOT, OUT)}`);
}
await browser.close();
server.close();
