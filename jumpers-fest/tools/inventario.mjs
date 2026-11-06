// Fase 1: inventario de assets (qué hay, cuánta resolución real tiene cada foto, dónde va y qué falta).
// La resolución real se mide con python3 tools/resolucion_real.py (review/fase1/resolucion_real.json).
// Uso: node tools/inventario.mjs → review/fase1/inventario_assets.jpg
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, LANZAR } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F1 = path.join(ROOT, 'review', 'fase1');
fs.mkdirSync(F1, { recursive: true });
const real = JSON.parse(fs.readFileSync(path.join(F1, 'resolucion_real.json'), 'utf8'));

const A = [
  { f: 'logo_jumpers.jpg', uso: 'Portada, barra, pie y end card. Versión transparente recortada por color (idéntica sobre blanco).', max: '≈ 950 px (end card a ~650 px)', ok: 'Listo' },
  { f: 'foto_01_rainbow_jumper.jpg', uso: 'Portada y Rainbow Jump. Traía una barra oscura en el borde derecho: recortada (queda de 408 px).', max: '≤ 408 px', aviso: 'Chica' },
  { f: 'foto_02_castle_jumper.jpg', uso: 'Galería de Castle Jump.', max: '≤ 425 px', aviso: 'Chica' },
  { f: 'foto_03_castillo_resbaladilla.jpg', uso: 'Magic Jump (por confirmar). Encuadre cerrado; el mismo castillo con resbaladilla se ve completo en foto_05 y foto_08.', max: '≤ 427 px', aviso: 'Chica · confirmar' },
  { f: 'foto_04_castillos_y_arcoiris.jpg', uso: 'Cómo funciona y cierre.', max: '≤ 427 px', aviso: 'Chica' },
  { f: 'foto_05_inflables_parque.jpg', uso: 'Cierre del video, solo pequeña.', max: '≤ 427 × 251 px', aviso: 'Muy chica' },
  { f: 'foto_06_castle_jump_jardin.jpg', uso: 'Tarjeta y ficha de Castle Jump. Mide 1320 px pero viene ampliada unas 2.6 veces; el encuadre de la tarjeta tiene ~420 px de detalle.', max: '≈ 420 px (encuadre de la tarjeta)', aviso: 'Ampliada' },
  { f: 'foto_07_castle_jump_terraza.jpg', uso: 'Galería de Castle Jump. También viene ampliada (unas 2 veces).', max: '≈ 660 px', aviso: 'Ampliada' },
  { f: 'foto_08_combo_mobiliario_infantil.jpg', uso: 'Arma tu fiesta y la postal grande del video. Sin personas (revisada a resolución completa).', max: '≈ 1300 px', ok: 'La mejor' },
];
const FALTA = [
  ['Fotos originales', 'De Rainbow Jump, Magic Jump y Castle Jump, del celular del dueño o guardadas desde cada post (no desde la cuadrícula), de 1080 px o más. Con ellas las tarjetas pueden salir al 3D y acercarse unas 2.5 veces más. Sin ellas, diseño el video dentro de 408–660 px.'],
  ['Biblioteca de SFX', 'El brief dice “[tu biblioteca de SFX]”, pero no llegó ninguna. Si no me mandas una, genero en código los más de 70 cues (pff de aire, rebote de vinil, tecleo, taps, scroll, calendario, pop).'],
  ['Capturas de referencia', 'No venían las ref_primersello_XX.png (opcionales). Sin ellas: celular al ~60 % del alto, que además es lo que permiten las fotos.'],
  ['Voz', 'Como con Roma: en la fase 2 te doy el guion listo para ElevenLabs y tú me subes las 2 tomas. O me das acceso a la API por el formulario seguro y la genero yo.'],
  ['Logo de Elevate (opcional)', 'Para la end card. Si no, “Así se vería tu página · Elevate Negocios” va en texto.'],
];
const CONFIRMAR = [
  'WhatsApp: bio 449 180 7242 (en uso) vs. etiqueta del inflable 449 180 72 47.',
  'Magic Jump = foto_03 (castillo con resbaladilla).',
  'Orden de la página: “Aparta tu fecha” justo después del catálogo.',
];

const srv = await servir(ROOT);
const browser = await chromium.launch(LANZAR);
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 }, deviceScaleFactor: 1 });
const tarjeta = (a) => {
  const r = real[a.f];
  const etiqueta = a.ok ? `<span class="tag ok">${a.ok}</span>` : `<span class="tag av">${a.aviso}</span>`;
  return `<figure><div class="img"><img src="${srv.url}assets/${a.f}"></div>
    <figcaption><div class="nom">${a.f}${etiqueta}</div>
    <div class="px">${r.nominal} · detalle real ≈ <b>${r.real}</b></div>
    <p>${a.uso}</p><div class="max">Máximo en el video 1080×1920: <b>${a.max}</b> de ancho</div></figcaption></figure>`;
};
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:Fredoka;font-weight:600;src:url(${srv.url}web/fonts/fredoka-latin-600-normal.woff2)}
  @font-face{font-family:"DM Sans";font-weight:400;src:url(${srv.url}web/fonts/dm-sans-latin-400-normal.woff2)}
  @font-face{font-family:"DM Sans";font-weight:600;src:url(${srv.url}web/fonts/dm-sans-latin-600-normal.woff2)}
  body{margin:0;background:#F7F5F2;font-family:"DM Sans";color:#1B1B1B;width:1500px}
  .t{padding:56px 64px 26px}.k{font:600 13px/1 "DM Sans";letter-spacing:.16em;text-transform:uppercase;color:#66635F}
  h1{font:600 46px/1.05 Fredoka;margin:12px 0 0}.sub{margin-top:10px;font-size:18px;color:#66635F;max-width:1100px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding:0 64px}
  figure{margin:0;background:#fff;border-radius:26px;padding:10px;box-shadow:0 14px 30px -20px rgba(27,27,27,.35)}
  .img{height:250px;border-radius:18px;background:#EFECE7;position:relative;overflow:hidden}
  .img img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
  figcaption{padding:14px 8px 8px}.nom{font:600 15px/1.2 "DM Sans";display:flex;justify-content:space-between;gap:8px;align-items:center}
  .tag{font:600 11.5px/1 "DM Sans";padding:6px 10px;border-radius:99px;white-space:nowrap}.tag.ok{background:#CDE8C9}.tag.av{background:#F6E7A8}
  .px{margin-top:6px;font-size:14px;color:#66635F}figcaption p{margin:8px 0 0;font-size:14.5px;line-height:1.45}
  .max{margin-top:8px;font-size:13.5px;color:#66635F}
  .cols{display:grid;grid-template-columns:1.6fr 1fr;gap:26px;padding:30px 64px 56px}
  .panel{background:#fff;border-radius:26px;padding:26px 28px;box-shadow:0 14px 30px -20px rgba(27,27,27,.35)}
  .panel h2{font:600 28px/1.1 Fredoka;margin:0 0 14px}
  ol{margin:0;padding-left:22px}li{margin:0 0 12px;font-size:15px;line-height:1.45}li b{display:block;font-size:15.5px}
  .nota{margin-top:14px;font-size:14px;color:#66635F}
</style></head><body>
  <div class="t"><div class="k">Jumpers Fest Ags · Fase 1 · revisión de assets</div><h1>Lo que hay y lo que falta</h1>
  <p class="sub">9 archivos. Ninguna foto trae niños ni personas. Todas las fotos salen de Instagram: la medida nominal no es la resolución real, así que la medí foto por foto y de eso sale cuánto pueden crecer en el video.</p></div>
  <div class="grid">${A.map(tarjeta).join('')}</div>
  <div class="cols">
    <div class="panel"><h2>Qué falta</h2><ol>${FALTA.map(([t, d]) => `<li><b>${t}</b>${d}</li>`).join('')}</ol></div>
    <div class="panel"><h2>Por confirmar con el dueño</h2><ol>${CONFIRMAR.map((c) => `<li>${c}</li>`).join('')}</ol>
      <p class="nota">Detalle real: se reduce la foto y se vuelve a ampliar; si casi no cambia, no tenía ese detalle. Referencia: una foto de 427 px ampliada a 1320 px.</p></div>
  </div>
</body></html>`);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
const h = await page.evaluate(() => document.body.scrollHeight);
await page.setViewportSize({ width: 1500, height: h });
await page.screenshot({ path: path.join(F1, 'inventario_assets.jpg'), type: 'jpeg', quality: 88 });
await browser.close();
srv.cerrar();
console.log('review/fase1/inventario_assets.jpg', `1500×${h}`);
