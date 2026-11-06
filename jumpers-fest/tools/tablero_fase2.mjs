// Fase 2: resumen visual de la línea de tiempo (para leer en el celular).
// Uso: node tools/tablero_fase2.mjs → review/fase2/linea_de_tiempo.jpg
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, LANZAR } from './servidor.mjs';
import { SECCIONES } from '../brief/linea.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'review', 'fase2');
fs.mkdirSync(OUT, { recursive: true });
const s = (f) => (f / 60).toFixed(2);
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'brief', 'timeline.json'), 'utf8')); // voz bloqueada y kinetic resuelto
const VOZ = T.voz;

const RESUMEN = {
  hook: { img: null, que: 'El tubo blanco entra con un “pff” y escribe “renta de inflables aguascalientes” en una barra de búsqueda de cristal genérica.', d3: '—' },
  llegada: { img: '01_portada', que: 'Enter. El tubo se infla y traza el contorno del celular de cristal, que rebota y se asienta. Carga la portada real.', d3: 'Celular de cristal' },
  catalogo: { img: '03_catalogo_rainbow', que: 'Scroll a “Nuestros inflables”: las tarjetas se inflan al entrar. Tap en Rainbow Jump: su ficha.', d3: 'Castle, Rainbow y Magic salen al 3D en fila y regresan · la descripción sale a 1.9× para leerse' },
  aparta: { img: '07_aparta_calendario', que: '“Lo quiero”: calendario, sábado 21, “Las Américas”, “4:00 pm” con teclado y la vista previa del mensaje.', d3: 'El botón sale como cojín y hace pop en el lift de 15.00 s' },
  fiesta: { img: '12_arma_tu_fiesta', que: 'Scroll a “Arma tu fiesta” y “Cómo funciona” (eliges, apartas, lo llevamos). El tubo recorre la costura de los pasos.', d3: 'La postal de foto_08 sale grande (2×)' },
  cierre: { img: null, que: 'El celular se aleja a la izquierda; el tubo sube en arco y se infla en un arcoíris pastel de cinco bandas. Respiro en 23.00 s.', d3: 'Arcoíris de vinil' },
  endcard: { img: null, que: 'Golpe grave suave. Bajo el arcoíris, placa blanca con su logo. “Así se vería tu página · Elevate Negocios” y la línea de demo no oficial.', d3: 'Placa con el logo' },
};

const filas = SECCIONES.map((sec) => {
  const r = RESUMEN[sec.id];
  const voz = VOZ.filter((v) => v.f >= sec.f && v.f <= sec.fin).map((v) => `<div class="voz"><b>${s(v.f)} s</b> “${v.texto}”</div>`).join('');
  const tipo = T.tipo.filter((k) => k.aterriza >= sec.f && k.aterriza <= sec.fin).map((k) => `<span class="kt">${k.texto}</span>`).join('');
  const arco = `<svg class="arco" viewBox="0 0 160 100"><g fill="none" stroke-linecap="round" stroke-width="7">${['#F3C7CF', '#F6E7A8', '#CDE8C9', '#C6DFEA', '#DCCDEB'].map((c, i) => { const r = 72 - i * 7.5; return `<path d="M${80 - r} 96 A${r} ${r} 0 0 1 ${80 + r} 96" stroke="${c}"/>`; }).join('')}</g></svg>`;
  const extra = sec.id === 'endcard' ? `<div class="placa"><img src="__URL__web/img/logo_jumpers.png"></div><div class="mini">Así se vería tu página · Elevate Negocios</div>` : '';
  const img = r.img ? `<img src="__URL__review/fase0/pantallas/${r.img}.jpg">` : sec.id === 'hook' ? `<div class="ph hook"></div>` : `<div class="ph arcoiris">${arco}${extra}</div>`;
  return `<section><div class="cel">${img}</div><div class="txt">
    <div class="k">${s(sec.f)}–${s(sec.fin + 1)} s · f${sec.f}–f${sec.fin}</div><h2>${sec.nombre}</h2>
    <p>${r.que}</p>${voz}${tipo ? `<div class="tipo">${tipo}</div>` : ''}<div class="d3"><b>3D</b> ${r.d3}</div>
    <div class="mus">♪ ${sec.musica}</div></div></section>`;
}).join('');

const srv = await servir(ROOT);
const browser = await chromium.launch(LANZAR);
const page = await browser.newPage({ viewport: { width: 1080, height: 1200 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:Fredoka;font-weight:600;src:url(${srv.url}web/fonts/fredoka-latin-600-normal.woff2)}
  @font-face{font-family:"DM Sans";font-weight:400;src:url(${srv.url}web/fonts/dm-sans-latin-400-normal.woff2)}
  @font-face{font-family:"DM Sans";font-weight:600;src:url(${srv.url}web/fonts/dm-sans-latin-600-normal.woff2)}
  body{margin:0;background:#F7F5F2;font-family:"DM Sans";color:#1B1B1B;width:1080px}
  header{padding:54px 56px 20px}.k{font:600 14px/1 "DM Sans";letter-spacing:.14em;text-transform:uppercase;color:#66635F}
  h1{font:600 52px/1.05 Fredoka;margin:12px 0 0}.sub{margin-top:10px;font-size:20px;color:#66635F}
  section{display:flex;gap:28px;margin:18px 40px;padding:20px;background:#fff;border-radius:30px;box-shadow:0 14px 30px -20px rgba(27,27,27,.35)}
  .cel{flex:none;width:190px;height:411px;border-radius:30px;padding:7px;background:#1B1B1B}
  .cel img{width:100%;height:100%;border-radius:24px;object-fit:cover;display:block}
  .ph{width:100%;height:100%;border-radius:24px;background:#F7F5F2;display:grid;place-items:center}
  .ph.hook::after{content:"renta de inflables aguascalientes";font:500 13px/1.3 "DM Sans";padding:12px 14px;border-radius:99px;background:rgba(255,255,255,.7);box-shadow:inset 0 0 0 1px rgba(27,27,27,.12);margin:0 10px;text-align:center}
  .ph.arcoiris{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}
  .arco{width:150px;height:auto;margin-top:-30px}
  .placa{margin-top:-8px;background:#fff;border-radius:18px;padding:10px 14px;box-shadow:0 12px 20px -12px rgba(27,27,27,.45)}
  .placa img{width:110px;display:block}
  .mini{margin-top:12px;font:600 9.5px/1.3 "DM Sans";text-align:center;padding:0 12px}
  .txt{flex:1;min-width:0}.txt h2{font:600 34px/1.1 Fredoka;margin:8px 0 0}.txt p{margin:10px 0 0;font-size:19px;line-height:1.45}
  .voz{margin-top:12px;font-size:18px;line-height:1.4;padding:10px 14px;border-radius:16px;background:#CDE8C9}.voz b{font-weight:600;margin-right:6px}
  .tipo{margin-top:12px;display:flex;flex-wrap:wrap;gap:8px}.kt{font:600 17px/1 Fredoka;letter-spacing:.04em;padding:9px 14px;border-radius:99px;background:#1B1B1B;color:#fff}
  .d3{margin-top:12px;font-size:17px;color:#3d3b38}.d3 b{font:600 12px/1 "DM Sans";letter-spacing:.12em;background:#F6E7A8;padding:5px 8px;border-radius:8px;margin-right:6px}
  .mus{margin-top:10px;font-size:15px;color:#66635F}
  footer{padding:14px 56px 50px;font-size:15px;color:#9C9893}
</style></head><body>
  <header><div class="k">Jumpers Fest Ags · ${(T.frames / 60).toFixed(1)} s · 60 fps · 112 BPM · voz bloqueada</div><h1>Línea de tiempo</h1>
  <p class="sub">Un solo plano continuo. Todo lo que aparece se infla. Las capturas son de la página real (fase 0).</p></header>
  ${filas.replaceAll('__URL__', srv.url)}
  <footer>Tiempos de voz de la toma 1, bloqueados en la fase 3. Detalle cuadro por cuadro en brief/brief_fase2.md.</footer>
</body></html>`);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
const h = await page.evaluate(() => document.body.scrollHeight);
await page.setViewportSize({ width: 1080, height: h });
await page.screenshot({ path: path.join(OUT, 'linea_de_tiempo.jpg'), type: 'jpeg', quality: 86 });
await browser.close();
srv.cerrar();
console.log('review/fase2/linea_de_tiempo.jpg', `1080×${h}`);
