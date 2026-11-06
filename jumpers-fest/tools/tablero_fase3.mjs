// Fase 3: la voz bloqueada sobre la línea de tiempo (forma de onda, cuadro de cada palabra,
// kinetic type y tiempos del compás). Uso: node tools/tablero_fase3.mjs → review/fase3/voz_bloqueada.jpg
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, LANZAR } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'review', 'fase3');
fs.mkdirSync(OUT, { recursive: true });
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'brief', 'timeline.json'), 'utf8'));
const FPS = T.fps, BEAT = (FPS * 60) / T.bpm;
const s = (f) => (f / FPS).toFixed(2);

// envolvente de la voz: pico por cuadro de video
const SR = 6000;
const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(ROOT, 'voz', 'voz_stem_48k.wav'), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
const spf = SR / FPS;
const env = Array.from({ length: T.frames }, (_, f) => { let m = 0; for (let i = Math.floor(f * spf); i < Math.floor((f + 1) * spf) && i < x.length; i++) m = Math.max(m, Math.abs(x[i])); return m; });

const W = 900;
const card = (v) => {
  const a = Math.max(0, v.f - 12), b = Math.max(v.termina_f + 12, ...T.tipo.filter((k) => k.voz[0] === v.id).map((k) => k.sale + 6));
  const X = (f) => ((f - a) / (b - a)) * W;
  const H = 120, mid = 60;
  let d = `M0 ${mid}`;
  for (let f = a; f <= b; f++) d += ` L${X(f).toFixed(1)} ${(mid - env[f] * 105).toFixed(1)}`;
  for (let f = b; f >= a; f--) d += ` L${X(f).toFixed(1)} ${(mid + env[f] * 105).toFixed(1)}`;
  const beats = [];
  for (let k = Math.ceil(a / BEAT); k * BEAT <= b; k++) beats.push(`<line x1="${X(k * BEAT)}" x2="${X(k * BEAT)}" y1="0" y2="${H}" class="${k % 4 ? 'b' : 'bb'}"/>`);
  const filas = (xs, gap) => { let last = -1e9, fila = 0; return xs.map((xx) => { fila = xx - last < gap ? 1 - fila : 0; last = xx; return fila; }); };
  const fw = filas(v.palabras.map((p) => X(p.f)), 70);
  const words = v.palabras.map((p, i) => `<div class="w${fw[i] ? ' f2' : ''}" style="left:${X(p.f)}px"><span>${p.w.replace(/[.,]/g, '')}</span><i>f${p.f}</i></div>`).join('');
  const ks = T.tipo.filter((k) => k.voz[0] === v.id);
  const fk = filas(ks.map((k) => X(k.aterriza)), 90);
  const kin = ks.map((k, i) => `<div class="k${fk[i] ? ' f2' : ''}" style="left:${X(k.aterriza)}px"><b>${k.texto}</b><i>f${k.aterriza}</i></div>`).join('');
  return `<section><div class="hd"><b>${v.id}</b> f${v.f}–f${v.termina_f} · ${s(v.f)}–${s(v.termina_f)} s · ${v.dur.toFixed(2)} s <em>(máx. ${v.max.toFixed(1)} s)</em></div>
    <p class="tx">“${v.texto}”</p>
    <div class="wave"><svg width="${W}" height="${H}">${beats.join('')}<path d="${d} Z"/></svg>${words}</div>
    ${kin ? `<div class="kin">${kin}</div>` : ''}</section>`;
};

const srv = await servir(ROOT);
const browser = await chromium.launch(LANZAR);
const page = await browser.newPage({ viewport: { width: 1080, height: 1200 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:Fredoka;font-weight:600;src:url(${srv.url}web/fonts/fredoka-latin-600-normal.woff2)}
  @font-face{font-family:"DM Sans";font-weight:400;src:url(${srv.url}web/fonts/dm-sans-latin-400-normal.woff2)}
  @font-face{font-family:"DM Sans";font-weight:600;src:url(${srv.url}web/fonts/dm-sans-latin-600-normal.woff2)}
  body{margin:0;background:#F7F5F2;font-family:"DM Sans";color:#1B1B1B;width:1080px}
  header{padding:54px 56px 16px}.kk{font:600 14px/1 "DM Sans";letter-spacing:.14em;text-transform:uppercase;color:#66635F}
  h1{font:600 52px/1.05 Fredoka;margin:12px 0 0}.sub{margin-top:10px;font-size:19px;color:#66635F;line-height:1.45}
  section{margin:16px 40px;padding:22px 30px 26px;background:#fff;border-radius:28px;box-shadow:0 14px 30px -20px rgba(27,27,27,.35)}
  .hd{font-size:17px;color:#66635F}.hd b{font:600 22px/1 Fredoka;color:#1B1B1B;margin-right:8px}.hd em{font-style:normal;color:#9C9893}
  .tx{margin:8px 0 14px;font-size:21px}
  .wave{position:relative;width:${W}px;height:206px}
  svg{display:block;background:#FBFAF8;border-radius:12px}svg path{fill:#C6DFEA;stroke:#1B1B1B;stroke-width:.6}
  line.b{stroke:rgba(27,27,27,.08)}line.bb{stroke:rgba(27,27,27,.22)}
  .w{position:absolute;top:0;height:150px;border-left:2px solid #1B1B1B}
  .w span{position:absolute;top:124px;left:4px;font:600 15px/1 "DM Sans";white-space:nowrap}
  .w.f2{height:178px}.w.f2 span{top:152px}.w.f2 i{top:172px}
  .w i{position:absolute;top:144px;left:4px;font:400 13px/1 "DM Sans";font-style:normal;color:#66635F}
  .kin{position:relative;height:96px;width:${W}px;margin-top:4px}
  .k.f2{top:48px}
  .k{position:absolute;top:0}.k b{display:inline-block;font:600 15px/1 Fredoka;letter-spacing:.04em;color:#fff;background:#1B1B1B;padding:7px 10px;border-radius:99px;transform:translateX(-50%)}
  .k i{position:absolute;top:32px;left:0;transform:translateX(-50%);font:400 12px/1 "DM Sans";font-style:normal;color:#66635F;white-space:nowrap}
  footer{padding:10px 56px 46px;font-size:15px;color:#9C9893;line-height:1.5}
</style></head><body>
  <header><div class="kk">Jumpers Fest Ags · Fase 3 · voz bloqueada · ${T.frames} cuadros · ${(T.frames / FPS).toFixed(1)} s</div><h1>La voz en su lugar</h1>
  <p class="sub">Toma 1 (“Hope”, eleven v4). Cada frase en su cuadro y cada palabra con el suyo. Las líneas verticales tenues son los tiempos a 112 BPM (más oscuras: inicio de compás). En negro, las palabras del kinetic type, que aterrizan en su palabra.</p></header>
  ${T.voz.map(card).join('')}
  <footer>Voz procesada a −16 LUFS (pico −2 dBFS) en voz/voz_stem_48k.wav. Escúchala sobre el pulso del compás en voz/preview_voz_pulso.mp3.</footer>
</body></html>`);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
const h = await page.evaluate(() => document.body.scrollHeight);
await page.setViewportSize({ width: 1080, height: h });
await page.screenshot({ path: path.join(OUT, 'voz_bloqueada.jpg'), type: 'jpeg', quality: 86 });
await browser.close();
srv.cerrar();
console.log('review/fase3/voz_bloqueada.jpg', `1080×${h}`);
