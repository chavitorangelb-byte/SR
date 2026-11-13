// Exporta el video a MP4 cuadro por cuadro (determinista).  Uso:  node video/render.mjs [v|h|vh] [--fps 30] [--desde 0 --hasta 36]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
import { servir } from '../tools/shots.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const AQUI = path.dirname(new URL(import.meta.url).pathname), SAL = path.join(AQUI, 'salida'); fs.mkdirSync(SAL, { recursive: true });
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const formatos = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'vh').split('');
const TAM = { v: [1080, 1920, 'vertical'], h: [1920, 1080, 'horizontal'] };
const s = await servir(), b = await chromium.launch();
for (const f of formatos) {
  const [W, H, nombre] = TAM[f], p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto(`http://localhost:${s.address().port}/video/index.html?f=${f}&captura=1`);
  await p.waitForFunction(() => window.__listo === true, null, { timeout: 30000 });
  const fps = Number(arg('fps', await p.evaluate(() => window.__fps))), dur = await p.evaluate(() => window.__dur);
  const t0 = Number(arg('desde', 0)), t1 = Number(arg('hasta', dur)), n = Math.round((t1 - t0) * fps);
  const out = path.join(SAL, arg('salida', `tcb-promo-${nombre}.mp4`));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ini = Date.now();
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.__seek(t), t0 + i / fps);
    const jpg = await p.screenshot({ type: 'jpeg', quality: 97 });
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`${nombre}: cuadro ${i}/${n}  (${((Date.now() - ini) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`listo: ${out}  ${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${n} cuadros a ${fps} fps, ${W}x${H}`);
  await p.close();
}
await b.close(); s.close();
