// Render del video: abre la escena en Chromium (WebGL), pide cada cuadro acumulado y lo manda a ffmpeg.
// Uso:
//   node video/render.mjs --desde 190 --hasta 490 --ancho 540 --alto 960 --fps 30 --sub 8 --out review/fase4/prueba_estilo_540.mp4
//   node video/render.mjs --fotos 240,400,490 --ancho 540 --alto 960 --sub 4      (cuadros sueltos en PNG)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { servir } from '../tools/servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const ANCHO = +arg('ancho', 540), ALTO = +arg('alto', 960), FPS = +arg('fps', 30), SUB = +arg('sub', 8);
const DESDE = +arg('desde', 190), HASTA = +arg('hasta', 490);
const FOTOS = arg('fotos', null);
const OUT = path.resolve(ROOT, arg('out', 'review/fase4/prueba_estilo.mp4'));
// Audio del video: la mezcla final si ya existe (fase 5); si no, la voz sola.
const MEZCLA = path.join(ROOT, 'audio', 'build', 'mezcla_master.wav');
const AUDIO = path.resolve(ROOT, arg('audio', fs.existsSync(MEZCLA) ? MEZCLA : path.join(ROOT, 'voz', 'voz_stem_48k.wav')));
const PASO = 60 / FPS;
const OBTURADOR = PASO * 0.5; // 180°

const { srv, url } = await servir(ROOT);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: ANCHO, height: ALTO } });
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
await page.goto(`${url}/video/render/index.html`);
await page.waitForFunction(() => window.LISTO === true, null, { timeout: 120000 });
const medidas = JSON.parse(fs.readFileSync(path.join(ROOT, 'video', 'build', 'pantalla', 'medidas.json'), 'utf8'));
await page.evaluate(([a, h, m]) => window.API.preparar({ ancho: a, alto: h, medidas: m }), [ANCHO, ALTO, medidas]);
if (errores.length) { console.error(errores); process.exit(1); }

const t0 = Date.now();
if (FOTOS) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  for (const f of FOTOS.split(',').map(Number)) {
    await page.evaluate(([ff, s, o]) => window.API.cuadro(ff, { sub: s, obturador: o }), [f, SUB, OBTURADOR]);
    const crudo = Buffer.from(await page.evaluate(() => window.API.leer()), 'base64');
    const png = OUT.replace(/\.\w+$/, '') + `_f${f}.png`;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${ANCHO}x${ALTO}`, '-i', '-', '-vf', 'vflip', '-frames:v', '1', png], { input: crudo });
    console.log(`✔ ${path.relative(ROOT, png)} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const tmp = OUT.replace(/\.mp4$/, '_sinaudio.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${ANCHO}x${ALTO}`, '-r', String(FPS), '-i', '-',
    '-vf', 'vflip', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  let n = 0;
  for (let f = DESDE; f <= HASTA + 1e-6; f += PASO) {
    await page.evaluate(([ff2, s, o]) => window.API.cuadro(ff2, { sub: s, obturador: o }), [f, SUB, OBTURADOR]);
    const crudo = Buffer.from(await page.evaluate(() => window.API.leer()), 'base64');
    if (!ff.stdin.write(crudo)) await new Promise((r) => ff.stdin.once('drain', r));
    n++;
    if (n % 15 === 0) console.log(`f${f.toFixed(0)} · ${n} cuadros · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  // Audio: el mismo tramo de la mezcla (o de la voz).
  const ini = DESDE / 60, dur = n / FPS;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-ss', ini.toFixed(4), '-t', dur.toFixed(4), '-i', AUDIO,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ac', '2', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT]);
  fs.unlinkSync(tmp);
  console.log(`✔ ${path.relative(ROOT, OUT)}: ${n} cuadros en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
if (errores.length) console.error('Errores:', errores);
await browser.close();
srv.close();
