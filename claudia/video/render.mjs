// Render cuadro por cuadro en Chromium (Playwright) con supermuestreo temporal y armado con ffmpeg.
//   node claudia/video/render.mjs --desde 0 --hasta 330 --fps 30 --escala 0.5 --out review/fase3/prueba.mp4
//   node claudia/video/render.mjs --lista 8,60,300 --escala 0.5 --out carpeta/      (cuadros sueltos, con motion blur)
//   node claudia/video/render.mjs --desde 0 --hasta 1619 --fps 60 --escala 1 --cuadros video/build/f916   (JPEG por cuadro, reanudable)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = +arg('fps', 30), ESC = +arg('escala', 0.5), SUB = +arg('sub', 8), FMT = arg('fmt', '916');
const DESDE = +arg('desde', 0), HASTA = +arg('hasta', 330), STEP = 60 / FPS, SHUTTER = 0.5 * STEP; // obturador de 180°
const OUT = path.resolve(ROOT, arg('out', 'review/fase3/prueba.mp4'));
const LISTA = arg('lista', null), CUADROS = arg('cuadros', null);
const DW = 1080, DH = FMT === '11' ? 1080 : 1920;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch(); // sin banderas de GPU: es 4 veces más rápido en este entorno
const page = await browser.newPage({ viewport: { width: DW, height: DH }, deviceScaleFactor: ESC });
page.on('pageerror', (e) => console.error('ERROR página:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('consola:', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/video/escena/index.html?fmt=${FMT}`);
await page.waitForFunction(() => window.ready || window.initError, null, { timeout: 120000 });
const err = await page.evaluate(() => window.initError); if (err) { console.error(err); process.exit(1); }
if (arg('info', null)) console.log(JSON.stringify(await page.evaluate(() => ({ SC: window.SC, R: window.R })), null, 0));

async function subs(f, sink) { // 8 subcuadros repartidos en el obturador
  for (let k = 0; k < SUB; k++) {
    await page.evaluate((t) => window.setFrame(t), f + ((k + 0.5) / SUB - 0.5) * SHUTTER);
    sink(await page.screenshot({ type: 'jpeg', quality: 100 }));
  }
}
function ffmpeg(args) { const p = spawn('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: ['pipe', 'inherit', 'inherit'] }); p.done = new Promise((r, j) => p.on('close', (c) => (c ? j(new Error('ffmpeg ' + c)) : r()))); return p; }
const MIX = `tmix=frames=${SUB},select='not(mod(n+1\\,${SUB}))',noise=c0s=5:c0f=t+u`; // promedio de subcuadros + grano fino 2 %
const write = (p, buf) => new Promise((r) => (p.stdin.write(buf) ? r() : p.stdin.once('drain', r)));

const frames = LISTA ? LISTA.split(',').map(Number) : Array.from({ length: Math.floor((HASTA - DESDE) / STEP) + 1 }, (_, i) => DESDE + i * STEP);
const t0 = Date.now();
if (LISTA || CUADROS) {
  const dir = CUADROS ? path.resolve(ROOT, CUADROS) : OUT; fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const f of frames) {
    const file = path.join(dir, CUADROS ? `${String(Math.round(f / STEP)).padStart(5, '0')}.jpg` : `f${f}.png`);
    if (CUADROS && fs.existsSync(file)) continue;
    const p = ffmpeg(['-f', 'image2pipe', '-c:v', 'mjpeg', '-i', '-', '-vf', MIX, '-frames:v', '1', ...(CUADROS ? ['-q:v', '1', '-pix_fmt', 'yuvj444p'] : []), file + (CUADROS ? '.tmp.jpg' : '')]);
    const bufs = []; await subs(f, (b) => bufs.push(b)); for (const b of bufs) await write(p, b); p.stdin.end(); await p.done;
    if (CUADROS) fs.renameSync(file + '.tmp.jpg', file);
    if (++n % 20 === 0) process.stdout.write(`f${f} (${((Date.now() - t0) / 1000 / n).toFixed(2)} s/cuadro) `);
  }
  console.log(`\n${n} cuadros → ${path.relative(ROOT, dir)} en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const voz = path.join(ROOT, 'audio', 'build', 'mezcla_master.wav'); const audio = fs.existsSync(voz) ? voz : path.join(ROOT, 'voz', 'voz_stem_48k.wav');
  const p = ffmpeg(['-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS * SUB), '-i', '-', '-ss', String(DESDE / 60), '-t', String(frames.length / FPS), '-i', audio,
    '-vf', `${MIX},setpts=N/(${FPS}*TB),scale=out_color_matrix=bt709:out_range=tv,format=yuv420p`, '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '15',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT]);
  let n = 0;
  for (const f of frames) { const bufs = []; await subs(f, (b) => bufs.push(b)); for (const b of bufs) await write(p, b); if (++n % 20 === 0) process.stdout.write(`${n}/${frames.length} (${((Date.now() - t0) / 1000 / n).toFixed(2)} s/cuadro) `); }
  p.stdin.end(); await p.done;
  console.log(`\n→ ${path.relative(ROOT, OUT)} · ${frames.length} cuadros en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
await browser.close(); server.close();
