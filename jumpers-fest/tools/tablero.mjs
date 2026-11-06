// Tableros de revisión de la fase 0: las pantallas capturadas a 3× (review/fase0/pantallas_3x),
// en marcos de celular con su descripción. También guarda cada pantalla en JPG a 2× (review/fase0/pantallas).
// Uso: node tools/tablero.mjs   (después de node tools/test_web.mjs)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, LANZAR } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F0 = path.join(ROOT, 'review', 'fase0');
const SHOTS = path.join(F0, 'pantallas_3x');
const JPG = path.join(F0, 'pantallas');
fs.mkdirSync(JPG, { recursive: true });

const TABLEROS = [
  {
    archivo: 'tablero_1_portada_y_catalogo.jpg', titulo: 'Portada y catálogo',
    sub: 'Lo primero que ve quien busca “renta de inflables aguascalientes”: su logo, su Rainbow Jump y sus tres inflables con foto.',
    pantallas: [
      ['01_portada', 'Portada: logo, Rainbow Jump, “Diversión + elegancia” y los dos botones.'],
      ['02_catalogo_castle', 'Nuestros inflables: cada ficha con foto, medidas, edad y precio por confirmar.'],
      ['03_catalogo_rainbow', 'Rainbow Jump con “Lleno de color”, palabras de su post.'],
      ['05_ficha_rainbow', 'Ficha de Rainbow Jump con la descripción de su post y “Lo quiero”.'],
      ['06_ficha_castle', 'Castle Jump: galería con sus 3 fotos (jardín, terraza y parque).'],
    ],
  },
  {
    archivo: 'tablero_2_aparta_tu_fecha.jpg', titulo: 'Aparta tu fecha',
    sub: '“Lo quiero” baja al formulario con el inflable elegido y el calendario abierto. El último botón abre WhatsApp con la solicitud ya escrita.',
    pantallas: [
      ['07_aparta_calendario', 'Llega con Rainbow Jump elegido y el calendario abierto (hoy marcado, días pasados bloqueados).'],
      ['08_aparta_sabado_marcado', 'Se marca el sábado 21; el calendario se cierra solo.'],
      ['09_aparta_datos', 'Colonia o salón, horario aproximado y tipo de evento (opcional).'],
      ['10_aparta_boton_listo', 'Vista previa del mensaje; el botón se infla cuando todo está completo.'],
      ['11_mensaje_listo', 'Mensaje listo (modo demo). En la página real abre WhatsApp.'],
    ],
  },
  {
    archivo: 'tablero_3_fiesta_como_funciona_pie.jpg', titulo: 'Arma tu fiesta, cómo funciona y contacto',
    sub: 'Mobiliario como pregunta (sin piezas ni precios), tres pasos sin promesas de horario ni flete, y su contacto de la bio.',
    pantallas: [
      ['12_arma_tu_fiesta', '“Pregunta por mobiliario” con la foto del combo y mesitas pastel.'],
      ['13_como_funciona', 'Eliges, apartas, lo llevamos.'],
      ['14_pie', 'WhatsApp de la bio, Instagram y aviso de demo no oficial.'],
      ['15_validacion', 'Validación: si falta algo, se marca y se explica.'],
    ],
  },
];

const srv = await servir(ROOT);
const browser = await chromium.launch(LANZAR);
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });

// pantallas en JPG a 2× para verlas en el celular
for (const f of fs.readdirSync(SHOTS).filter((x) => x.endsWith('.png')).sort()) {
  await page.setViewportSize({ width: 780, height: 1688 });
  await page.setContent(`<body style="margin:0"><img src="${srv.url}review/fase0/pantallas_3x/${f}" style="width:780px;height:1688px;display:block"></body>`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(JPG, f.replace('.png', '.jpg')), type: 'jpeg', quality: 86 });
}

for (const t of TABLEROS) {
  const n = t.pantallas.length;
  const W = 300, GAP = 34, PAD = 64;
  const ancho = PAD * 2 + n * W + (n - 1) * GAP;
  await page.setViewportSize({ width: ancho, height: 1000 });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:Fredoka;font-weight:600;src:url(${srv.url}web/fonts/fredoka-latin-600-normal.woff2)}
    @font-face{font-family:"DM Sans";font-weight:400;src:url(${srv.url}web/fonts/dm-sans-latin-400-normal.woff2)}
    @font-face{font-family:"DM Sans";font-weight:600;src:url(${srv.url}web/fonts/dm-sans-latin-600-normal.woff2)}
    body{margin:0;background:#F7F5F2;font-family:"DM Sans";color:#1B1B1B}
    .t{padding:${PAD - 8}px ${PAD}px 30px}
    .k{font:600 13px/1 "DM Sans";letter-spacing:.16em;text-transform:uppercase;color:#66635F}
    h1{font:600 46px/1.05 Fredoka;margin:12px 0 0}
    .sub{margin-top:10px;font-size:18px;color:#66635F;max-width:900px}
    .fila{display:flex;gap:${GAP}px;padding:6px ${PAD}px ${PAD}px;align-items:flex-start}
    figure{margin:0;width:${W}px}
    .cel{width:${W}px;height:${Math.round(W * 844 / 390)}px;border-radius:38px;padding:9px;background:#1B1B1B;box-shadow:0 30px 50px -30px rgba(27,27,27,.55)}
    .cel img{width:100%;height:100%;border-radius:30px;display:block;object-fit:cover}
    figcaption{margin-top:16px;font-size:15.5px;line-height:1.4;color:#3d3b38}
    figcaption b{display:block;font:600 12px/1 "DM Sans";letter-spacing:.12em;color:#9C9893;margin-bottom:6px}
    .pie{padding:0 ${PAD}px ${PAD - 20}px;font-size:13px;color:#9C9893}
  </style></head><body>
    <div class="t"><div class="k">Jumpers Fest Ags · Fase 0 · vista de celular 390 × 844</div><h1>${t.titulo}</h1><p class="sub">${t.sub}</p></div>
    <div class="fila">${t.pantallas.map(([f, c]) => `<figure><div class="cel"><img src="${srv.url}review/fase0/pantallas_3x/${f}.png"></div><figcaption><b>${f.slice(0, 2)}</b>${c}</figcaption></figure>`).join('')}</div>
    <div class="pie">Demo de cortesía de Elevate Negocios · pieza no oficial. Medidas, edades y precios por confirmar con el dueño.</div>
  </body></html>`;
  await page.setContent(html);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const h = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewportSize({ width: ancho, height: h });
  await page.screenshot({ path: path.join(F0, t.archivo), type: 'jpeg', quality: 88 });
  console.log(t.archivo, `${ancho}×${h}`);
}
await browser.close();
srv.cerrar();
