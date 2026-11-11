// Render cuadro por cuadro en Chromium y armado con ffmpeg.
//   node render.mjs --fmt 916 --w 540 --lista 0,30,200 --out ../review/f4          (cuadros sueltos)
//   node render.mjs --fmt 916 --w 540 --fps 30 --out ../review/preview_916.mp4     (video; --desde/--hasta)
//   node render.mjs --fmt 916 --w 1080 --desde 0 --hasta 269 --cuadros build/916   (PNG para finales, por tramos)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const DIR = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FMT = arg('fmt', '916'), W = +arg('w', 540), H = FMT === '916' ? (W * 16) / 9 : W, SUB = +arg('sub', 8), FPS = +arg('fps', 60);
const DESDE = +arg('desde', 0), HASTA = +arg('hasta', 1079), STEP = 60 / FPS, SHUTTER = STEP * 0.5;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => { console.error('ERROR página:', e.message); process.exitCode = 1; });
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?fmt=${FMT}&w=${W}&h=${H}`);
await page.waitForFunction(() => window.ready || window.initError, null, { timeout: 60000 });
const err = await page.evaluate(() => window.initError); if (err) { console.error(err); process.exit(1); }
const frame = async (f, type = 'image/png') => Buffer.from((await page.evaluate(([f, sub, shutter, type]) => window.renderFrame(f, { sub, shutter, type }), [f, SUB, SHUTTER, type])).split(',')[1], 'base64');
const out = path.resolve(arg('out', 'out')), lista = arg('lista', null), cuadros = arg('cuadros', null);
const t0 = Date.now();
if (lista) {
  fs.mkdirSync(out, { recursive: true });
  for (const f of lista.split(',').map(Number)) fs.writeFileSync(path.join(out, `${FMT}_f${String(f).padStart(4, '0')}.png`), await frame(f));
} else if (cuadros) {
  fs.mkdirSync(path.resolve(cuadros), { recursive: true });
  for (let f = DESDE; f <= HASTA; f++) fs.writeFileSync(path.join(path.resolve(cuadros), String(f).padStart(5, '0') + '.png'), await frame(f));
} else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', ...(arg('audio', null) ? ['-i', arg('audio'), '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = DESDE; f <= HASTA; f += STEP) { if (!ff.stdin.write(await frame(f, 'image/jpeg'))) await new Promise((r) => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
}
console.log(`listo en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
await browser.close(); server.close();
