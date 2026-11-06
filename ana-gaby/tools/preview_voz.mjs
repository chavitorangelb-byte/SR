// Fase 3: preview visual de la voz bloqueada. Línea de tiempo vertical (4 renglones de 7 s) con la forma de onda,
// las secciones, las frases, el texto en pantalla y los momentos clave; un cursor avanza con el audio.
// Salida: review/fase3/linea_voz.jpg y voz/preview_voz.mp4 (1080x1920, 30 fps, voz + pulso a 98 BPM).
// Uso: node tools/preview_voz.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'review', 'fase3');
fs.mkdirSync(OUT, { recursive: true });
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'brief', 'timeline.json'), 'utf8'));
const { fps, frames } = tl;

// Envolvente de la voz por cuadro (RMS de 1/60 s).
const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(ROOT, 'voz', 'voz_stem_48k.wav'), '-ac', '1', '-ar', '12000', '-f', 'f32le', '-'], { maxBuffer: 64 * 1024 * 1024 });
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
const porCuadro = 12000 / fps;
const env = Array.from({ length: frames }, (_, f) => {
  let s = 0;
  const a = Math.floor(f * porCuadro), b = Math.floor((f + 1) * porCuadro);
  for (let i = a; i < b && i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
});
const maxEnv = Math.max(...env);

const POR_RENGLON = 420; // 7 s
const X0 = 60, ANCHO = 960;
const Y0 = 236, ALTO_R = 404;
const RENGLONES = Math.ceil(frames / POR_RENGLON);
const xDe = (f) => X0 + ((f % POR_RENGLON) / POR_RENGLON) * ANCHO;
const rDe = (f) => Math.floor(f / POR_RENGLON);
const COLORES = { hook: '#5A3A2E', llegada: '#5B3540', catalogo: '#6E3B49', medida: '#86465A', pedido: '#6E3B49', confianza: '#5B3540', cierre: '#43303A', end: '#2F2629' };

const MOMENTOS = [
  [0, 'Golpe · aprieta la manga'], [6, 'El betún escribe la búsqueda'], [147, 'Enter'], [160, 'Celular 3D'], [188, 'Portada'],
  [236, '5.0 en Google'], [296, 'Scroll al catálogo'], [352, '3 tarjetas salen en 3D'], [530, 'Tap Pasteles'], [590, 'Tap A tu medida'],
  [650, 'La foto sale'], [667, 'Betún traza el pastel'], [724, 'Pastel 3D piso por piso'], [866, 'Calendario'], [924, 'Teclado'],
  [998, 'Botón 3D'], [1012, 'Mensaje armado'], [1040, 'Push-in al mensaje'], [1180, 'Reseñas en abanico 3D'], [1226, 'Push-in a la reseña'],
  [1312, 'Pin'], [1320, 'Martes a sábado'], [1344, 'El celular se aleja'], [1350, '«Lo que ya se antoja»'], [1378, 'Respiro'],
  [1398, '«también se busca.»'], [1440, 'Golpe grave'], [1443, 'Betún escribe el nombre'], [1520, 'Letrero AG'], [1552, 'Así se vería tu página'],
];

const fuente = (f) => `url(file://${path.join(ROOT, 'web', 'fonts', f)})`;
let html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>
@font-face{font-family:C;font-style:italic;font-weight:600;src:${fuente('cormorant-garamond-latin-600-italic.woff2')}}
@font-face{font-family:D;font-weight:400;src:${fuente('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${fuente('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{position:relative;background:radial-gradient(130% 70% at 50% 0%,#3A2027 0%,#1E1A1B 60%) #1E1A1B;color:#FBF5F3;font-family:D}
.k{position:absolute;left:60px;top:58px;font:600 15px/1 D;letter-spacing:.2em;text-transform:uppercase;color:#E6A3B0}
h1{position:absolute;left:60px;top:84px;font:600 italic 64px/1 C}
.sub{position:absolute;left:60px;top:162px;font:400 21px/1.35 D;color:rgba(251,245,243,.66)}
.ley{position:absolute;right:60px;top:92px;text-align:right;font:400 17px/1.7 D;color:rgba(251,245,243,.66)}
.ley i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:8px;vertical-align:-1px}
.r{position:absolute;left:0;width:1080px}
.t{position:absolute;font:400 14px/1 D;color:rgba(251,245,243,.5)}
.sec{position:absolute;height:30px;border-radius:7px;font:600 14px/30px D;padding:0 9px;white-space:nowrap;overflow:hidden;color:#FBF5F3}
.fr{position:absolute;font:600 italic 23px/1.08 C;color:#FBF5F3}
.fr b{display:block;font:600 12px/1 D;letter-spacing:.12em;color:#E6A3B0;margin-bottom:4px;font-style:normal}
.kt{position:absolute;height:26px;padding:0 9px;border-radius:999px;background:#E5959A;color:#1E1A1B;font:600 13px/26px D;white-space:nowrap;transform:translateX(-4px)}
.ev{position:absolute;font:400 14px/1.2 D;color:rgba(251,245,243,.82);white-space:nowrap}
.ev::before{content:"";position:absolute;left:0;top:-9px;width:1px;height:7px;background:rgba(251,245,243,.5)}
</style><body>
<p class="k">Ana Gaby Repostería · Fase 3</p>
<h1>La voz en su lugar</h1>
<p class="sub">${(frames / fps).toFixed(1)} s · 98 BPM · voz «Hope» a −16 LUFS · 4 renglones de 7 s</p>
<p class="ley"><i style="background:#F2B9C3"></i>Voz &nbsp; <i style="background:#E5959A"></i>Texto en pantalla &nbsp; <i style="background:rgba(251,245,243,.5)"></i>Momento clave</p>`;

for (let r = 0; r < RENGLONES; r++) {
  const y = Y0 + r * ALTO_R;
  const f0 = r * POR_RENGLON, f1 = Math.min(frames, f0 + POR_RENGLON);
  html += `<div class="r" style="top:${y}px;height:${ALTO_R}px">`;
  for (let sgs = 0; sgs <= 7; sgs++) {
    const seg = r * 7 + sgs;
    if (seg > frames / fps) break;
    html += `<span class="t" style="left:${X0 + (sgs / 7) * ANCHO - (sgs ? 8 : 0)}px;top:0">${seg} s</span>`;
  }
  for (const sec of tl.secciones) {
    const a = Math.max(sec.f, f0), b = Math.min(sec.fin + 1, f1);
    if (a >= b) continue;
    const xa = xDe(a), xb = b === f0 + POR_RENGLON ? X0 + ANCHO : xDe(b);
    html += `<span class="sec" style="left:${xa}px;top:22px;width:${xb - xa - 3}px;background:${COLORES[sec.id]}">${sec.nombre}</span>`;
  }
  // Rejilla de tiempos y forma de onda
  let svg = `<svg width="1080" height="110" style="position:absolute;left:0;top:60px">`;
  for (let k = 0; k * tl.tiempo_cuadros < f1; k++) {
    const f = Math.round(k * tl.tiempo_cuadros);
    if (f < f0) continue;
    svg += `<line x1="${xDe(f)}" x2="${xDe(f)}" y1="0" y2="110" stroke="rgba(251,245,243,${k % 4 === 0 ? 0.22 : 0.08})" stroke-width="${k % 4 === 0 ? 1.5 : 1}"/>`;
  }
  let d = '';
  for (let f = f0; f < f1; f++) {
    const h = Math.max(0.6, (env[f] / maxEnv) * 50);
    const xx = xDe(f);
    d += `M${xx.toFixed(1)} ${(55 - h).toFixed(1)}V${(55 + h).toFixed(1)}`;
  }
  svg += `<path d="${d}" stroke="#F2B9C3" stroke-width="1.6"/></svg>`;
  html += svg;
  for (const v of tl.voz) {
    if (rDe(v.f) !== r) continue;
    const ancho = Math.max(150, Math.min(X0 + ANCHO - xDe(v.f), ((v.termina_f - v.f) / POR_RENGLON) * ANCHO + 40));
    html += `<div class="fr" style="left:${xDe(v.f)}px;top:178px;width:${ancho}px"><b>${v.id} · f${v.f}</b>${v.texto}</div>`;
  }
  for (const k of tl.tipo) {
    k.palabras.forEach(([w, f]) => {
      if (rDe(f) !== r) return;
      html += `<span class="kt" data-carril-base="268" data-carril-alto="29" data-carriles="3" style="left:${xDe(f)}px">${w}</span>`;
    });
  }
  MOMENTOS.filter(([f]) => rDe(f) === r).forEach(([f, t]) => {
    html += `<span class="ev" data-carril-base="364" data-carril-alto="20" data-carriles="4" style="left:${xDe(f)}px">${t}</span>`;
  });
  html += '</div>';
}
html += '</body></html>';

const tmp = path.join(OUT, '_linea_tmp.html');
fs.writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(`file://${tmp}`);
await page.evaluate(() => document.fonts.ready);
if (!(await page.evaluate(() => document.fonts.check('italic 600 20px C')))) throw new Error('No cargó Cormorant');
// Acomoda etiquetas en carriles con su ancho real para que no se encimen (por renglón y por tipo).
const encimes = await page.evaluate(() => {
  let sinLugar = 0;
  document.querySelectorAll('.r').forEach((r) => {
    for (const cls of ['kt', 'ev']) {
      const els = [...r.querySelectorAll(`.${cls}`)].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
      if (!els.length) continue;
      const base = +els[0].dataset.carrilBase, alto = +els[0].dataset.carrilAlto, n = +els[0].dataset.carriles;
      const fin = Array(n).fill(-1e9);
      for (const el of els) {
        const x = parseFloat(el.style.left), w = el.offsetWidth;
        let c = fin.findIndex((e) => x >= e + 6);
        if (c < 0) { sinLugar++; c = fin.indexOf(Math.min(...fin)); }
        el.style.top = `${base + c * alto}px`;
        fin[c] = x + w;
      }
    }
  });
  return sinLugar;
});
if (encimes) console.warn(`⚠ ${encimes} etiquetas sin carril libre`);
const png = path.join(OUT, '_linea.png');
await page.screenshot({ path: png });
await browser.close();
fs.unlinkSync(tmp);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-q:v', '3', path.join(OUT, 'linea_voz.jpg')]);

// Video: la imagen + cursor rosa que avanza por renglón + contador de tiempo + audio (voz y pulso).
const yExpr = Array.from({ length: RENGLONES }, (_, r) => r).reduceRight((acc, r) => r === RENGLONES - 1 ? `${Y0 + r * ALTO_R + 16}` : `if(lt(t,${(r + 1) * 7}),${Y0 + r * ALTO_R + 16},${acc})`, '');
const filtro = [
  `[1:v]format=rgba[c]`,
  `[0:v][c]overlay=x='${X0}+mod(t,7)/7*${ANCHO}-2':y='${yExpr}':eval=frame[v1]`,
  `[v1]drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf:text='%{pts\\:hms}':x=60:y=1868:fontsize=26:fontcolor=0xFBF5F3@0.85[v]`,
].join(';');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-framerate', '30', '-i', png,
  '-f', 'lavfi', '-i', `color=c=0xE5959A:s=4x352:r=30`,
  '-i', path.join(ROOT, 'voz', 'preview_voz_pulso.mp3'),
  '-filter_complex', filtro, '-map', '[v]', '-map', '2:a', '-t', String(frames / fps),
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
  path.join(ROOT, 'voz', 'preview_voz.mp4')]);
fs.unlinkSync(png);
const mb = (f) => (fs.statSync(f).size / 1048576).toFixed(1);
console.log(`✔ review/fase3/linea_voz.jpg · voz/preview_voz.mp4 (${mb(path.join(ROOT, 'voz', 'preview_voz.mp4'))} MB)`);
