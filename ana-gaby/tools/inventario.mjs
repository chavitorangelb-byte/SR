// Fase 1: inventario de assets (calidad y límites de tamaño en el video) y faltantes.
// Uso: node tools/inventario.mjs   → review/fase1/inventario_assets.jpg + inventario.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = path.join(ROOT, 'assets');
const OUT = path.join(ROOT, 'review', 'fase1');
fs.mkdirSync(OUT, { recursive: true });

// Detalle real de cada foto: PSNR al bajarla a la mitad y volverla a subir.
// Si casi no cambia (PSNR alto), la foto no tiene detalle a su resolución nominal: rinde como una más chica.
const medidas = JSON.parse(execFileSync('python3', ['-I', '-c', `
import json, glob, os, numpy as np
from PIL import Image
out = {}
for f in sorted(glob.glob(${JSON.stringify(A)} + '/*.jpg')) + [${JSON.stringify(path.join(A, 'logo_letrero_ag.png'))}]:
    im = Image.open(f).convert('RGB'); g = np.asarray(im.convert('L')).astype(float); h, w = g.shape
    e = np.asarray(im.convert('L').resize((w//2, h//2), Image.LANCZOS).resize((w, h), Image.LANCZOS)).astype(float)
    mse = ((g - e) ** 2).mean()
    out[os.path.basename(f)] = {'px': [w, h], 'psnr_mitad': round(float(10*np.log10(255**2/mse)), 1)}
print(json.dumps(out))
`]).toString());
const util = (f) => {
  const m = medidas[f];
  // Más de 44 dB: casi todo el detalle cabe en la mitad → rinde como ~55 % de su ancho.
  return m.psnr_mitad > 44 ? Math.round(m.px[0] * 0.55 / 10) * 10 : m.px[0];
};

// La portada mide 366 px de interfaz de ancho (390 − 2 × 12): de ahí sale el push-in máximo.
const pushPortada = (util('foto_00_local_letrero.jpg') / 366).toFixed(1);
const items = [
  ['logo_letrero_ag.png', 'Letrero AG (foto recortada)', 'End card, sobre placa de cristal', 'lim', `Foto, no archivo de diseño: blanda y con las puntas de los ramos abajo. Máx. ${util('logo_letrero_ag.png')} px de ancho.`],
  ['foto_00_local_letrero.jpg', '00 · Su local con el letrero', 'Portada dentro del celular', 'lim', `Foto de su ficha, blanda: push-in a la portada hasta ${pushPortada}×.`],
  ['foto_04_frasco_galletas_corazon.jpg', '04 · Frasco de galletas de corazón', 'Galletas · tarjeta que sale en 3D', 'ok', ''],
  ['foto_05_caja_galletas_chocolate.jpg', '05 · Caja de galletas de chocolate', 'Galletas · tarjeta que sale en 3D', 'ok', ''],
  ['foto_06_galletas_chispas_chocolate.jpg', '06 · Galletas de chispas de chocolate', 'Galletas · tarjeta que sale en 3D', 'ok', 'La más nítida del set.'],
  ['foto_07_galletas_corazon.jpg', '07 · Galletas con corazón', 'Galletas · cuadrícula', 'ok', '¿Red velvet? Por confirmar con la dueña.'],
  ['foto_01_pastel_fresas_crema.jpg', '01 · Pastel de fresas con crema', 'Pasteles · cuadrícula', 'ok', 'Un poco más suave que el resto.'],
  ['foto_08_pastel_san_valentin.jpg', '08 · Pastel de San Valentín', 'Pasteles · cuadrícula', 'ok', ''],
  ['foto_11_pastel_listones.jpg', '11 · Pastel con moños', 'Pasteles · cuadrícula', 'ok', 'Agregada de su ficha de Google.'],
  ['foto_12_pastel_corazon.jpg', '12 · Pastel de corazón', 'Pasteles · cuadrícula', 'ok', 'Agregada de su ficha de Google.'],
  ['foto_02_cupcakes_flores.jpg', '02 · Cupcakes de flores', 'Postres · cuadrícula', 'ok', ''],
  ['foto_03_tarta_frutos_rojos.jpg', '03 · Tarta de frutos rojos', 'Postres · cuadrícula', 'ok', ''],
  ['foto_09_mesa_postres.jpg', '09 · Mesa de postres', 'Postres · cuadrícula', 'ok', 'Sin nombres escritos a la vista.'],
  ['foto_10_mesa_postres_pasteles.jpg', '10 · Pasteles para mesa de postres', 'Postres · cuadrícula', 'ok', 'Sin nombres escritos a la vista.'],
  ['pastel_referencia_ilustrado.jpg', 'Pastel de referencia (código)', 'A tu medida: la foto que manda el cliente', 'cod', 'Three.js: el mismo modelo se construye en 3D piso por piso.'],
];

const faltantes = [
  ['Clave de ElevenLabs', 'Fase 3', 'tú', 'No hay ninguna guardada en este entorno. Te la pido con el formulario seguro al llegar a la fase 3, nunca por chat. Alternativa: me pasas tú las 2 tomas.'],
  ['Biblioteca de SFX', 'Fase 5', 'tú o yo', 'El brief dice «[tu biblioteca de SFX]» y no hay ninguna en assets/. Si no me pasas una, sintetizo los 70+ cues en código, como en Florería Roma.'],
  ['Capturas ref_primersello_XX.png', 'Fase 4', 'opcional', 'No llegaron. Sin ellas sigo las medidas del brief: celular al 60–75 % de la altura y kinetic fuera de la pantalla.'],
  ['Logo de Elevate Negocios', 'Fase 5', 'opcional', 'No está en assets/. En la end card «Elevate Negocios» va en texto; no invento logos.'],
  ['Logo limpio de Ana Gaby', '—', 'la dueña', 'Solo hay la foto del letrero: va únicamente en la end card. No bloquea el video.'],
];

const recursos = [
  ['Letra de betún', 'EMS Allure, fuente de un solo trazo (licencia OFL), para escribir «galletas aguascalientes». En la end card, el trazo sigue el esqueleto de Cormorant Garamond Itálica.'],
  ['Música 98 BPM', 'Guitarra de nylon y glockenspiel con el soundfont FluidR3 GM (licencia MIT) en FluidSynth; cucharas, shaker, palmas, bajo y golpes sintetizados en código.'],
  ['3D y gráficos', 'Celular de cristal, tarjetas 3D, pastel, betún, teclado y barra de búsqueda: en código (Three.js y canvas). Sin video ni imágenes generadas por IA.'],
];

const limites = [
  ['Celular al 60–75 % de la altura', 'pantalla de 1.3 a 1.6 px por px de interfaz'],
  ['Tarjetas de Instagram (400 px)', 'máx. 400 px en cuadro: push-in con tarjetas hasta 2.5×'],
  ['Fotos de su ficha (600 px)', 'máx. 600 px en cuadro'],
  [`Portada (detalle ~${util('foto_00_local_letrero.jpg')} px)`, `push-in a la portada hasta ${pushPortada}×`],
  [`Letrero AG (detalle ~${util('logo_letrero_ag.png')} px)`, `end card: máx. ${util('logo_letrero_ag.png')} px de ancho`],
  ['Texto de la interfaz', 'vectorial: push-in libre para leer (hasta tamaño de celular real, 2.8×)'],
];

const fuente = (f) => `url(file://${path.join(ROOT, 'web', 'fonts', f)})`;
const css = `
@font-face{font-family:C;font-style:italic;font-weight:600;src:${fuente('cormorant-garamond-latin-600-italic.woff2')}}
@font-face{font-family:D;font-weight:400;src:${fuente('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${fuente('dm-sans-latin-600-normal.woff2')}}
@font-face{font-family:D;font-weight:700;src:${fuente('dm-sans-latin-700-normal.woff2')}}
*{box-sizing:border-box;margin:0}
html{background:#1E1A1B}
body{width:1080px;padding:54px 50px 50px;background:radial-gradient(120% 900px at 50% 0%,#3A2228 0%,#1E1A1B 62%) no-repeat #1E1A1B;color:#FBF5F3;font-family:D}
header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:34px}
.k{font:600 12px/1 D;letter-spacing:.2em;text-transform:uppercase;color:#E6A3B0}
h1{margin-top:12px;font:600 italic 50px/1 C}
h2{font:600 italic 30px/1 C;margin:38px 0 16px}
.r{text-align:right;font:400 13.5px/1.5 D;color:rgba(251,245,243,.62)}
.g{display:grid;grid-template-columns:repeat(5,1fr);gap:22px 16px}
figure{display:grid;gap:8px;align-content:start}
.ph{position:relative;aspect-ratio:4/5;border-radius:16px;overflow:hidden;background:#2a2325;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.ph img{width:100%;height:100%;object-fit:cover}
.ph.logo img{object-fit:contain;padding:10px;background:#E8E0DC}
.b{position:absolute;left:8px;top:8px;padding:4px 8px;border-radius:999px;font:700 10.5px/1 D;letter-spacing:.06em;text-transform:uppercase}
.ok{background:#E5959A;color:#1E1A1B}.lim{background:#F2D8A7;color:#1E1A1B}.cod{background:#FBF5F3;color:#1E1A1B}
figcaption b{display:block;font:600 13px/1.25 D}
figcaption span{display:block;margin-top:3px;font:400 11.5px/1.35 D;color:rgba(251,245,243,.66)}
figcaption em{display:block;margin-top:4px;font:400 11.5px/1.35 D;font-style:normal;color:#F2D8A7}
table{width:100%;border-collapse:collapse;font:400 13.5px/1.45 D}
td{padding:11px 10px;border-top:1px solid rgba(251,245,243,.12);vertical-align:top}
td:first-child{font-weight:600;width:230px}
td.f{width:74px;color:#E6A3B0;font-weight:600}
td.q{width:86px;color:rgba(251,245,243,.7)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:34px}
.lim2 td:first-child{width:40%}
footer{margin-top:34px;padding-top:16px;border-top:1px solid rgba(251,245,243,.12);display:flex;justify-content:space-between;font:400 12px/1.4 D;color:rgba(251,245,243,.5)}
`;
const etiqueta = { ok: 'Lista', lim: 'Con límite', cod: 'Código' };
const figs = items.map(([f, t, uso, st, nota]) => {
  const m = medidas[f];
  return `<figure><div class="ph${f.endsWith('.png') ? ' logo' : ''}"><img src="file://${path.join(A, f)}"><span class="b ${st}">${etiqueta[st]}</span></div>
  <figcaption><b>${t}</b><span>${m.px[0]} × ${m.px[1]} · rinde ${util(f)} px</span><span>${uso}</span>${nota ? `<em>${nota}</em>` : ''}</figcaption></figure>`;
}).join('');
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}</style><body>
<header><div><p class="k">Ana Gaby Repostería · Fase 1</p><h1>Inventario de assets y faltantes</h1></div>
<div class="r">${items.length} assets en assets/<br>«Rinde» = ancho máximo en el cuadro final sin ampliar</div></header>
<section class="g">${figs}</section>
<h2>Lo que falta</h2><table>${faltantes.map(([a, f, q, d]) => `<tr><td>${a}</td><td class="f">${f}</td><td class="q">${q}</td><td>${d}</td></tr>`).join('')}</table>
<div class="cols">
  <div><h2>Límites en el cuadro (1080 × 1920)</h2><table class="lim2">${limites.map(([a, d]) => `<tr><td>${a}</td><td>${d}</td></tr>`).join('')}</table></div>
  <div><h2>Lo que traigo yo</h2><table class="lim2">${recursos.map(([a, d]) => `<tr><td>${a}</td><td>${d}</td></tr>`).join('')}</table></div>
</div>
<footer><span>Demo de cortesía de Elevate Negocios · pieza no oficial</span><span>Fotos: Instagram @anagaby.reposteria y su ficha de Google</span></footer>
</body></html>`;

const tmp = path.join(OUT, '_inventario_tmp.html');
fs.writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 600 }, deviceScaleFactor: 2 });
await page.goto(`file://${tmp}`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const ok = await page.evaluate(() => [...document.images].every((i) => i.naturalWidth > 0) && document.fonts.check('italic 600 20px C'));
if (!ok) throw new Error('No cargaron las imágenes o las fuentes del tablero');
await page.screenshot({ path: path.join(OUT, 'inventario_assets.jpg'), fullPage: true, type: 'jpeg', quality: 86 });
await browser.close();
fs.unlinkSync(tmp);

fs.writeFileSync(path.join(OUT, 'inventario.json'), JSON.stringify({
  assets: items.map(([f, t, uso, st, nota]) => ({ archivo: f, nombre: t, uso, estado: etiqueta[st], px: medidas[f].px, rinde_px: util(f), psnr_mitad_db: medidas[f].psnr_mitad, nota })),
  faltantes: faltantes.map(([a, f, q, d]) => ({ que: a, fase: f, quien: q, detalle: d })),
  limites: Object.fromEntries(limites),
  recursos: Object.fromEntries(recursos),
}, null, 2));
console.log('✔ review/fase1/inventario_assets.jpg y inventario.json');
