// Fase 4: hoja de contactos de la prueba de estilo (cuadros clave del video + qué revisar en cada uno).
// Uso: node tools/hoja_prueba.mjs   (lee review/fase4/prueba_estilo_540.mp4 y review/fase4/cuadro_1080_f440.png)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'review', 'fase4');
const VIDEO = path.join(DIR, 'prueba_estilo_540.mp4');
const INICIO = 190; // cuadro de la línea de tiempo donde empieza la prueba

const CUADROS = [
  [200, 'Llegada', 'El celular de cristal se asienta y la portada real se enciende'],
  [250, 'Betún', 'Subraya «5.0 en Google» con volumen y brillo húmedo'],
  [292, 'Push-in', 'Acercamiento a la portada sin pasar el detalle de la foto'],
  [326, 'Scroll', 'Inercia con rebote; el celular gira 7° y se va a la izquierda'],
  [352, 'Borde de conchitas', 'El betún decora la primera tarjeta mientras se lee el título'],
  [414, 'Sale al espacio 3D', 'La tarjeta es la misma pieza de la página, con grosor y sombra'],
  [452, 'Cascada', 'Tres tarjetas en profundidad hacia el espacio libre'],
  [488, 'Kinetic type', '«RECIÉN» entra por glifo en el pulso, fuera de la pantalla'],
];

const tmp = path.join(DIR, '_cuadros');
fs.mkdirSync(tmp, { recursive: true });
for (const [f] of CUADROS) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', ((f - INICIO) / 60).toFixed(3), '-i', VIDEO, '-frames:v', '1', path.join(tmp, `f${f}.png`)]);
}
const fuente = (f) => `url(file://${path.join(ROOT, 'web', 'fonts', f)})`;
const css = `
@font-face{font-family:C;font-style:italic;font-weight:600;src:${fuente('cormorant-garamond-latin-600-italic.woff2')}}
@font-face{font-family:D;font-weight:400;src:${fuente('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${fuente('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
html{background:#1E1A1B}
body{width:1080px;padding:52px 48px 48px;background:radial-gradient(120% 900px at 50% 0%,#3A2228 0%,#1E1A1B 62%) no-repeat #1E1A1B;color:#FBF5F3;font-family:D}
.k{font:600 12px/1 D;letter-spacing:.2em;text-transform:uppercase;color:#E6A3B0}
h1{margin:12px 0 6px;font:600 italic 50px/1 C}
.sub{font:400 15px/1.5 D;color:rgba(251,245,243,.66);margin-bottom:30px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:26px 18px}
figure{display:grid;gap:9px}
img{display:block;width:100%;border-radius:12px;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
b{font:600 14px/1.25 D}
span{display:block;font:400 12.5px/1.4 D;color:rgba(251,245,243,.66)}
.det{display:grid;grid-template-columns:1fr 1.25fr;gap:24px;margin-top:34px;align-items:start}
.det img{border-radius:14px}
.det h2{font:600 italic 30px/1.05 C;margin-bottom:12px}
.det p{font:400 14.5px/1.55 D;color:rgba(251,245,243,.78);margin-bottom:10px}
footer{margin-top:30px;padding-top:14px;border-top:1px solid rgba(251,245,243,.12);display:flex;justify-content:space-between;font:400 12px/1.4 D;color:rgba(251,245,243,.5)}
`;
const figs = CUADROS.map(([f, t, d]) => `<figure><img src="file://${path.join(tmp, `f${f}.png`)}"><figcaption><b>${(f / 60).toFixed(2)} s · ${t}</b><span>${d}</span></figcaption></figure>`).join('');
const det = path.join(DIR, 'cuadro_1080_f440.png');
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}</style><body>
<p class="k">Ana Gaby Repostería · Fase 4</p><h1>Prueba de estilo · 3.17–8.17 s</h1>
<p class="sub">540 × 960 a 30 fps, motion blur de 8 subcuadros. La pantalla es la captura real de la página a 3x. Sin música ni SFX todavía (fase 5); se oye la voz.</p>
<section class="g">${figs}</section>
<section class="det"><img src="file://${det}"><div><h2>Detalle a 1080 × 1920 (f440)</h2>
<p>La interfaz se lee nítida y con sus colores exactos: la pantalla no pasa por el tono del render.</p>
<p>El betún tiene volumen, brillo húmedo, estrías de la boquilla y cada concha con cabeza y cola.</p>
<p>Las tarjetas que salen son el recorte exacto de la página: misma foto, mismo texto, más canto blanco y sombra de contacto. La foto nunca pasa de su resolución real.</p>
<p>El cuerpo del celular es cristal con grosor y bisel: refracta el fondo y su reflejo se mueve con la cámara.</p></div></section>
<footer><span>Demo de cortesía de Elevate Negocios · pieza no oficial</span><span>Render en código: Three.js + Playwright + ffmpeg</span></footer>
</body></html>`;
const f = path.join(DIR, '_hoja.html');
fs.writeFileSync(f, html);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 800 }, deviceScaleFactor: 2 });
await p.goto(`file://${f}`);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: path.join(DIR, 'hoja_prueba_estilo.jpg'), fullPage: true, type: 'jpeg', quality: 86 });
await b.close();
fs.unlinkSync(f);
fs.rmSync(tmp, { recursive: true });
console.log('✔ review/fase4/hoja_prueba_estilo.jpg');
