// Render del video cuadro por cuadro en Chromium (WebGL por SwiftShader) y armado con ffmpeg.
// Uso:
//   node video/render.mjs --desde 186 --hasta 446 --fps 30 --w 540 --h 960 --sub 8 --out review/fase4/prueba_estilo.mp4
//   node video/render.mjs --solo 390 --w 540 --h 960 --out build/cuadro.png        (un cuadro, para revisar)
//   node video/render.mjs --lista 200,300,400 --out build/cuadros                   (varios cuadros sueltos)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { servir } from '../tools/servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg('w', 540), H = +arg('h', 960), SUB = +arg('sub', 8), FPS = +arg('fps', 30);
const UI = arg('ui', '/build/ui_video');
const OUT = path.resolve(ROOT, arg('out', 'review/fase4/prueba_estilo.mp4'));
const SOLO = arg('solo', null), LISTA = arg('lista', null);
const DESDE = +arg("desde", 0), HASTA = +arg("hasta", 1649);
const STEP = 60 / FPS;
const SHUTTER = +arg('shutter', STEP / 2); // obturador de 180°: medio intervalo entre cuadros de salida
const FMT = arg('fmt', '916'); // 916 = vertical 1080×1920; 11 = cuadrado 1080×1080 (re-layout propio, no recorte)
const CUADROS = arg('cuadros', null); // finales: carpeta persistente, un PNG por cuadro de 60 fps; reanudable

const srv = await servir(ROOT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('ERROR página:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('consola:', m.text()); });
await page.goto(`${srv.url}video/render/index.html?w=${W}&h=${H}&fmt=${FMT}&ui=${encodeURIComponent(UI)}`);
await page.waitForFunction(() => window.ready || window.initError, null, { timeout: 180000 });
const initError = await page.evaluate(() => window.initError);
if (initError) { console.error(initError); process.exit(1); }

async function frame(f) {
  const url = await page.evaluate(([f, sub, shutter]) => window.renderFrame(f, { sub, shutter }), [f, SUB, SHUTTER]);
  return Buffer.from(url.split(',')[1], 'base64');
}

if (LISTA != null) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of LISTA.split(',').map(Number)) fs.writeFileSync(path.join(OUT, `g${f}.png`), await frame(f));
  console.log(`${LISTA.split(',').length} cuadros → ${path.relative(ROOT, OUT)}`);
} else if (SOLO != null) {
  const t0 = Date.now();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, await frame(+SOLO));
  console.log(`cuadro ${SOLO} → ${path.relative(ROOT, OUT)} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (CUADROS != null) {
  // finales por tramos (se pueden correr varios procesos con rangos distintos): si se corta, se vuelve a correr y sigue
  const dir = path.resolve(ROOT, CUADROS);
  fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  let hechos = 0;
  for (let f = DESDE; f <= HASTA; f += STEP) {
    const file = path.join(dir, `${String(f).padStart(5, '0')}.png`);
    if (fs.existsSync(file) && fs.statSync(file).size > 0) continue;
    fs.writeFileSync(file + '.tmp', await frame(f));
    fs.renameSync(file + '.tmp', file);
    if (++hechos % 10 === 0) process.stdout.write(`f${f} (${((Date.now() - t0) / 1000 / hechos).toFixed(2)} s/cuadro) `);
  }
  console.log(`\n${hechos} cuadros nuevos en ${path.relative(ROOT, dir)} en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
} else {
  const dir = path.join(ROOT, 'build', 'frames_' + path.basename(OUT, path.extname(OUT)));
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
  const mezcla = path.join(ROOT, 'audio', 'build', 'mezcla_master.wav');
  const voz = fs.existsSync(mezcla) ? mezcla : path.join(ROOT, 'voz', 'voz_stem_48k.wav');
  const args = ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.png'), '-ss', String(DESDE / 60), '-t', String(n / FPS), '-i', voz,
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT];
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  console.log(`→ ${path.relative(ROOT, OUT)}`);
}
await browser.close();
srv.cerrar();
