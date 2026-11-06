// Fotos para la clienta: cómo se vería su página en el celular (y en computadora), sección por sección.
// Captura la página real (web/) a 390×797 + barra de estado genérica, DSF 3, con el reloj fijo en martes 12:00
// (abierto), y la monta en un celular genérico sobre fondo de su paleta. Sin logos de terceros.
// Uso: node tools/fotos_cliente.mjs  →  entrega/cliente/*.jpg y entrega/cliente/pantallas/*.jpg
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'entrega', 'cliente');
const PANT = path.join(OUT, 'pantallas');
const TMP = path.join(OUT, '_tmp');
for (const d of [OUT, PANT, TMP]) fs.mkdirSync(d, { recursive: true });
const RELOJ = new Date('2026-11-10T18:00:00Z'); // martes 12:00 en Aguascalientes: «Abierto ahora»
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const { srv, url } = await servir(path.join(ROOT, 'web'));
const browser = await chromium.launch();

// ---------------------------------------------------------------- 1. pantallas del celular
const ctx = await browser.newContext({ viewport: { width: 390, height: 797 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
const page = await ctx.newPage();
await page.clock.setFixedTime(RELOJ);
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
await page.goto(`${url}/?captura=1`);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
});
await page.evaluate(() => window.AnaGaby.encender());
const irY = async (sel, margen) => {
  await page.evaluate(([s, m]) => { const e = document.querySelector(s); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - m); }, [sel, margen]);
  await espera(1400);
};
const foto = async (nombre) => {
  const p = path.join(TMP, `${nombre}.png`);
  await page.screenshot({ path: p });
  return p;
};

const P = {};
await espera(2800);
P.inicio = await foto('inicio');

await irY('#catalogo', 20);
P.catalogo = await foto('catalogo');

// A tu medida: foto subida, 20 a 30 personas, sábado 14 por la mañana y «Feliz cumpleaños»
await page.evaluate(() => window.AnaGaby.irA('medida'));
await espera(500);
await page.setInputFiles('#foto-input', path.join(ROOT, 'assets', 'pastel_referencia_ilustrado.jpg'));
// la página decodifica la foto (asíncrono) y muestra «Preparando tu foto…»; ya cargada, se marca como lista
await page.waitForFunction(() => !document.querySelector('#vista').hidden && document.querySelector('#vista-img').naturalWidth > 0);
await espera(1300);
await page.evaluate(() => window.AnaGaby.fotoLista());
await page.waitForFunction(() => document.querySelector('#vista').classList.contains('lista'));
await espera(700);
await page.click('#personas label:nth-child(3)');
await page.click('#btn-fecha');
await espera(900);
await page.click('#cal-rejilla .dia[data-d="14"]');
await page.click('#horas label:first-child');
await page.click('#fecha-listo');
await espera(900);
await page.fill('#mensaje', 'Feliz cumpleaños');
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await irY('#vista', 112);
P.medida = await foto('a_tu_medida');

// El pedido completo en un mensaje (en esta captura no se abre WhatsApp: se muestra el mensaje)
await page.click('#btn-enviar');
await espera(1500);
P.pedido = await foto('pedido');
await page.click('#hoja-mensaje [data-cerrar]');
await espera(900);

await irY('#resenas', 64);
P.resenas = await foto('resenas');

await page.evaluate(() => document.querySelector('#mapa').classList.add('visible'));
await irY('#mapa', 96);
await espera(800);
P.ubicacion = await foto('ubicacion');
await ctx.close();

// ---------------------------------------------------------------- 2. computadora (1280 px)
const ctxPC = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
const pc = await ctxPC.newPage();
await pc.clock.setFixedTime(RELOJ);
pc.on('pageerror', (e) => errores.push(e.message));
await pc.goto(`${url}/?captura=1`);
await pc.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => null))); });
await pc.evaluate(() => window.AnaGaby.encender());
await espera(2800);
P.pc = path.join(TMP, 'computadora.png');
await pc.screenshot({ path: P.pc });
await ctxPC.close();

// ---------------------------------------------------------------- 3. montajes
const fuente = (f) => `url(file://${path.join(ROOT, 'web', 'fonts', f)})`;
const CSS = `
@font-face{font-family:C;font-style:italic;font-weight:600;src:${fuente('cormorant-garamond-latin-600-italic.woff2')}}
@font-face{font-family:D;font-weight:400;src:${fuente('dm-sans-latin-400-normal.woff2')}}
@font-face{font-family:D;font-weight:600;src:${fuente('dm-sans-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
html,body{width:1080px;overflow:hidden}
body{position:relative;font-family:D;color:#1E1A1B;background:#FBF5F3}
.fondo{position:absolute;inset:0;background:radial-gradient(900px 700px at 50% 62%,#F3D9D6 0%,rgba(243,217,214,0) 70%),linear-gradient(180deg,#FBF5F3 0%,#F8ECE9 100%)}
header{position:relative;text-align:center;padding:0 70px}
.k{font:600 21px/1 D;letter-spacing:.22em;text-transform:uppercase;color:#D9848B}
h1{margin:22px 0 0;font:600 italic 74px/1.02 C;letter-spacing:-.005em}
.sub{margin:20px auto 0;max-width:860px;font:400 29px/1.4 D;color:#6E6264}
footer{position:absolute;left:0;right:0;bottom:46px;text-align:center;font:400 21px/1.3 D;color:#9C9093}
.tel{position:relative;width:calc(var(--w) + 2 * var(--b));margin:0 auto;padding:var(--b);border-radius:calc(var(--r) + var(--b));background:linear-gradient(160deg,#3a3133 0%,#1E1A1B 45%,#141112 100%);
  box-shadow:0 70px 120px -50px rgba(60,30,36,.55),0 30px 60px -30px rgba(60,30,36,.35),inset 0 0 0 2px rgba(255,255,255,.07)}
.pantalla{width:var(--w);border-radius:var(--r);overflow:hidden;background:#FBF5F3}
.barra{height:var(--barra);display:flex;align-items:center;justify-content:space-between;padding:0 calc(var(--w) * .085);font:600 calc(var(--w) * .043)/1 D;letter-spacing:-.01em;background:#FBF5F3}
.barra svg{height:calc(var(--w) * .036);margin-left:calc(var(--w) * .014)}
.pantalla img{display:block;width:100%}
`;
const ICONOS = `<span><svg viewBox="0 0 34 22"><rect x="0" y="14" width="6" height="8" rx="1.5"/><rect x="9" y="10" width="6" height="12" rx="1.5"/><rect x="18" y="5" width="6" height="17" rx="1.5"/><rect x="27" y="0" width="6" height="22" rx="1.5"/></svg><svg viewBox="0 0 30 22"><path d="M15 21.5 10.6 16a7 7 0 0 1 8.8 0Z"/><path d="M5.4 10.9a14.5 14.5 0 0 1 19.2 0l-2.6 3.2a10.4 10.4 0 0 0-14 0Z"/><path d="M.6 5a22 22 0 0 1 28.8 0L27 8a18 18 0 0 0-24 0Z"/></svg><svg viewBox="0 0 46 22"><rect x="1" y="1" width="38" height="20" rx="6" fill="none" stroke="#1E1A1B" stroke-opacity=".4" stroke-width="2"/><rect x="4.5" y="4.5" width="27" height="13" rx="3.5"/><path d="M42 7.5v7a3.6 3.6 0 0 0 0-7Z" fill-opacity=".45"/></svg></span>`;
const telefono = (img, w) => {
  const k = w / 390;
  return `<div class="tel" style="--w:${w}px;--b:${Math.round(18 * k / 1.54)}px;--r:${Math.round(58 * k)}px;--barra:${(47 * k).toFixed(1)}px"><div class="pantalla"><div class="barra"><span>12:00</span>${ICONOS}</div><img src="file://${img}"></div></div>`;
};
const PIE = 'Demo de cortesía de Elevate Negocios · propuesta no oficial para Ana Gaby Repostería';

const montar = async (html, nombre, alto) => {
  const f = path.join(TMP, `${nombre}.html`);
  fs.writeFileSync(f, `<!doctype html><html lang="es"><meta charset="utf-8"><style>${CSS}</style><body style="height:${alto}px"><div class="fondo"></div>${html}<footer>${PIE}</footer></body></html>`);
  const p = await browser.newPage({ viewport: { width: 1080, height: alto }, deviceScaleFactor: 1 });
  await p.goto(`file://${f}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await p.screenshot({ path: path.join(OUT, `${nombre}.jpg`), type: 'jpeg', quality: 90 });
  await p.close();
  console.log(`✔ entrega/cliente/${nombre}.jpg`);
};

const SECCIONES = [
  ['01_inicio', P.inicio, 'Tu página, con tu esencia', 'Tu logo, tus fotos y tus 5.0 estrellas de Google desde el primer vistazo.'],
  ['02_catalogo', P.catalogo, 'Tu catálogo, siempre a la mano', 'Galletas, pasteles y postres con tus propias fotos, ordenados por categoría.'],
  ['03_a_tu_medida', P.medida, 'Pasteles a tu medida', 'Tus clientes suben la foto del pastel que quieren y eligen personas, fecha y mensaje.'],
  ['04_pedido_whatsapp', P.pedido, 'Todo el pedido, en un mensaje', 'Te llega a tu WhatsApp ya escrito: tamaño, diseño, mensaje del pastel, fecha y hora.'],
  ['05_resenas', P.resenas, 'Tus reseñas hablan por ti', 'Tus reseñas reales de Google y tu calificación de 5.0, a la vista de todos.'],
  ['06_ubicacion_horario', P.ubicacion, 'Fácil de encontrar', 'Tu dirección en Los Bosques, cómo llegar y tu horario, con aviso de abierto o cerrado.'],
];
for (const [nombre, img, titulo, sub] of SECCIONES) {
  await montar(`<div style="position:absolute;top:104px;left:0;right:0"><header><p class="k">Ana Gaby Repostería · tu página</p><h1>${titulo}</h1><p class="sub">${sub}</p></header></div>
<div style="position:absolute;top:418px;left:0;right:0">${telefono(img, 596)}</div>`, nombre, 1920);
}

// Portada del envío: tres pantallas juntas (4:5, se ve completa en el chat)
await montar(`<div style="position:absolute;top:84px;left:0;right:0"><header><p class="k">Propuesta de cortesía · Elevate Negocios</p><h1 style="font-size:82px">Ana Gaby Repostería</h1><p class="sub" style="margin-top:14px">Así se vería tu página</p></header></div>
<div style="position:absolute;top:400px;left:62px;transform:rotate(-6deg);transform-origin:50% 100%">${telefono(P.catalogo, 300)}</div>
<div style="position:absolute;top:400px;right:62px;transform:rotate(6deg);transform-origin:50% 100%">${telefono(P.medida, 300)}</div>
<div style="position:absolute;top:350px;left:50%;transform:translateX(-50%)">${telefono(P.inicio, 340)}</div>`, '00_portada', 1350);

// Computadora: ventana genérica (sin dirección inventada)
await montar(`<div style="position:absolute;top:150px;left:0;right:0"><header><p class="k">Ana Gaby Repostería · tu página</p><h1>También en computadora</h1><p class="sub">La misma página se acomoda a pantallas grandes.</p></header></div>
<div style="position:absolute;top:520px;left:50px;width:980px;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 60px 110px -50px rgba(60,30,36,.55),0 0 0 1px rgba(30,26,27,.08)">
<div style="height:54px;display:flex;align-items:center;gap:10px;padding:0 22px;background:#F1E6E3"><i style="width:14px;height:14px;border-radius:50%;background:#E5959A"></i><i style="width:14px;height:14px;border-radius:50%;background:#E9C3B8"></i><i style="width:14px;height:14px;border-radius:50%;background:#D8CCCA"></i><span style="margin-left:18px;flex:1;height:30px;border-radius:15px;background:#FBF5F3"></span></div>
<img src="file://${P.pc}" style="display:block;width:100%"></div>`, '07_computadora', 1350);

// Pantallas sueltas (sin montaje), por si se quieren mandar tal cual
for (const [nombre, img] of SECCIONES) {
  const f = path.join(TMP, `suelta_${nombre}.html`);
  fs.writeFileSync(f, `<!doctype html><html lang="es"><meta charset="utf-8"><style>${CSS} html,body{width:390px;height:844px;background:#FBF5F3}</style><body><div class="pantalla" style="--w:390px;--r:0px;--barra:47px;border-radius:0"><div class="barra"><span>12:00</span>${ICONOS}</div><img src="file://${img}"></div></body></html>`);
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await p.goto(`file://${f}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await p.screenshot({ path: path.join(PANT, `${nombre}.jpg`), type: 'jpeg', quality: 92 });
  await p.close();
}
console.log('✔ entrega/cliente/pantallas/ (6 pantallas a 1170×2532)');

await browser.close();
srv.close();
fs.rmSync(TMP, { recursive: true });
if (errores.length) { console.error('Errores en la página:', errores); process.exit(1); }
