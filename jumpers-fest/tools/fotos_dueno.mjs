// Fotos para enviar al dueño: tres láminas de presentación y capturas sueltas en JPG.
// Todo sale de las capturas reales de la página (tools/test_web.mjs → review/fase0/pantallas_3x)
// y el mensaje de ejemplo es el que la prueba de la burbuja verifica (ESPERADO en tools/test_web.mjs).
// Salida: entrega/fotos/
// Uso: node tools/fotos_dueno.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'review', 'fase0', 'pantallas_3x');
const FONTS = path.join(ROOT, 'web', 'fonts');
const LOGO = path.join(ROOT, 'assets', 'derivados', 'logo_jumpers_transparente.png');
const OUT = path.join(ROOT, 'entrega', 'fotos');
fs.mkdirSync(OUT, { recursive: true });

// el mensaje que arma la página con los datos de ejemplo de las capturas (la prueba exige que sea idéntico)
const fuente = fs.readFileSync(path.join(ROOT, 'tools', 'test_web.mjs'), 'utf8');
const solicitud = new Function(`return [${fuente.match(/const ESPERADO = \[([\s\S]*?)\]\.join/)[1]}].join('\\n')`)();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const LAMINAS = [
  { file: '01_asi_se_veria_tu_pagina.jpg', title: 'Así se vería<br>tu página', items: [
    ['01_portada', 'Tu portada', 'Tu logo, «Diversión + elegancia» y el botón para apartar fecha'],
    ['03_catalogo_rainbow', 'Tus inflables', 'Castle Jump, Rainbow Jump y Magic Jump, con tus fotos'],
    ['05_ficha_rainbow', 'La ficha de cada uno', 'Fotos y descripción; medidas, edad y precio los pones tú'],
  ] },
  { file: '02_aparta_tu_fecha_en_un_mensaje.jpg', title: 'Apartan su fecha<br>en un mensaje', items: [
    ['08_aparta_sabado_marcado', '1 · Inflable y fecha', 'Eligen el inflable y el día en el calendario (sin fechas pasadas)'],
    ['09_aparta_datos', '2 · Lugar y horario', 'Colonia o salón, horario y tipo de evento'],
    ['10_aparta_boton_listo', '3 · Un toque y listo', 'Ven su mensaje armado y lo mandan a tu WhatsApp'],
  ] },
  { file: '03_asi_te_llega_cada_solicitud.jpg', title: 'Así te llega<br>cada solicitud', items: [
    ['12_arma_tu_fiesta', 'Arma tu fiesta', 'Un botón para que te pregunten por mobiliario'],
    ['14_pie', 'Tu contacto', 'Tu WhatsApp y tu Instagram, a un toque'],
    [null, 'La solicitud, completa', 'Inflable, fecha, lugar y horario en un solo mensaje (datos de ejemplo)'],
  ] },
];
const SUELTAS = [
  ['01_portada', '01_portada'], ['02_catalogo_castle', '02_catalogo'], ['05_ficha_rainbow', '03_ficha_rainbow_jump'],
  ['07_aparta_calendario', '04_aparta_tu_fecha'], ['10_aparta_boton_listo', '05_mensaje_listo'],
  ['12_arma_tu_fiesta', '06_arma_tu_fiesta'], ['13_como_funciona', '07_como_funciona'], ['14_pie', '08_contacto'],
];

const font = (f) => `url(file://${path.join(FONTS, f)})`;
const css = `
@font-face{font-family:F;font-weight:600;src:${font('fredoka-latin-600-normal.woff2')}}
@font-face{font-family:D;font-weight:400;src:${font('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:500;src:${font('dm-sans-latin-500-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${font('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
body{width:1080px;padding:0 58px 50px;background:#F7F5F2;color:#1B1B1B;font-family:D}
.arco{height:12px;margin:0 -58px 50px;background:linear-gradient(90deg,#F3C7CF 0 20%,#F6E7A8 20% 40%,#CDE8C9 40% 60%,#C6DFEA 60% 80%,#DCCDEB 80%)}
header{display:flex;align-items:center;justify-content:space-between;gap:28px;margin-bottom:46px}
.k{font:600 13px/1 D;letter-spacing:.18em;text-transform:uppercase;color:#66635F}
h1{margin-top:14px;font:600 58px/1.02 F;letter-spacing:-.01em}
header img{width:214px;height:auto;margin-right:-6px}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:40px 34px;align-items:start}
figure{display:grid;gap:18px}
.ph{border-radius:46px;padding:9px;background:#1B1B1B;box-shadow:0 38px 64px -34px rgba(27,27,27,.45)}
.ph img{display:block;width:100%;aspect-ratio:390/844;border-radius:37px}
.chat{width:100%;aspect-ratio:390/844;border-radius:37px;background:#F1EEE9;display:flex;flex-direction:column;overflow:hidden}
.chat .hilo{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:16px}
.chat .barra{display:flex;align-items:center;gap:8px;padding:10px 12px 24px;background:#fff;border-top:1px solid rgba(27,27,27,.07)}
.chat .barra span{flex:1;padding:10px 14px;border-radius:999px;background:#F1EEE9;font:400 12px/1 D;color:#8A8680}
.chat .barra i{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#1B1B1B}
.chat .t{display:flex;align-items:center;gap:10px;padding:26px 16px 12px;background:#fff;border-bottom:1px solid rgba(27,27,27,.07)}
.chat .t i{flex:none;width:34px;height:34px;border-radius:50%;background:conic-gradient(#F3C7CF 0 20%,#F6E7A8 0 40%,#CDE8C9 0 60%,#C6DFEA 0 80%,#DCCDEB 0)}
.chat .t b{display:block;font:600 14px/1.2 D}
.chat .t small{display:block;margin-top:2px;font:400 11.5px/1.2 D;color:#66635F}
.chat .dia{align-self:center;margin:0 0 12px;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.85);font:500 10.5px/1 D;color:#66635F}
.chat .m{align-self:flex-start;max-width:90%;margin-left:12px;background:#fff;border-radius:18px 18px 18px 6px;padding:11px 12px;font:400 12.6px/1.45 D;white-space:pre-wrap;box-shadow:0 1px 2px rgba(27,27,27,.08)}
figcaption b{display:block;font:600 22px/1.2 F}
figcaption span{display:block;margin-top:6px;font:400 15.5px/1.42 D;color:#66635F}
footer{margin-top:46px;padding-top:18px;border-top:1px solid rgba(27,27,27,.1);display:flex;justify-content:space-between;font:400 13px/1.4 D;color:#8A8680}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1000 }, deviceScaleFactor: 2 });
for (const [i, b] of LAMINAS.entries()) {
  const figs = b.items.map(([f, t, d]) => {
    const media = f ? `<div class="ph"><img src="file://${path.join(SHOTS, f + '.png')}"></div>`
      : `<div class="ph"><div class="chat"><div class="t"><i></i><div><b>Solicitud nueva</b><small>desde tu página</small></div></div>`
        + `<div class="hilo"><span class="dia">Datos de ejemplo</span><div class="m">${esc(solicitud)}</div></div>`
        + `<div class="barra"><span>Escribe un mensaje</span><i><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12h13M12.5 6l6 6-6 6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></i></div></div></div>`;
    return `<figure>${media}<figcaption><b>${t}</b><span>${d}</span></figcaption></figure>`;
  }).join('');
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}</style><body><div class="arco"></div>
    <header><div><p class="k">Jumpers Fest Ags · tu página web</p><h1>${b.title}</h1></div><img src="file://${LOGO}" alt="Jumpers Fest"></header>
    <div class="g">${figs}</div>
    <footer><span>Propuesta de Elevate Negocios · demo de cortesía, no oficial</span><span>Vista en celular · ${i + 1}/${LAMINAS.length}</span></footer></body></html>`;
  const tmp = path.join(OUT, `_lamina_${i}.html`);
  fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, b.file), fullPage: true, type: 'jpeg', quality: 90 });
  fs.unlinkSync(tmp);
  console.log(b.file);
}
await browser.close();
// capturas sueltas: la vista de celular 390 × 844 a 3× (1170 × 2532), en JPG
execFileSync('python3', ['-I', '-c', `from PIL import Image\nfor a, b in ${JSON.stringify(SUELTAS)}:\n    Image.open('${SHOTS}/' + a + '.png').convert('RGB').save('${OUT}/pantalla_' + b + '.jpg', quality=90)`]);
console.log(SUELTAS.length, 'capturas sueltas en', path.relative(ROOT, OUT));
