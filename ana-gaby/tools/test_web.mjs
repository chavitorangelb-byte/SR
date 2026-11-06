// Pruebas de la página de Ana Gaby Repostería en vista de celular (390x844) + capturas para los tableros.
// Uso: node tools/test_web.mjs   → review/fase0/resultados.json, review/fase0/*.png, mensaje_whatsapp.txt
// Reloj fijo: martes 10 de noviembre de 2026, 12:00 pm en Aguascalientes (para que el horario sea reproducible).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'review', 'fase0');
fs.mkdirSync(OUT, { recursive: true });
const PASTEL = path.join(ROOT, 'assets', 'pastel_referencia_ilustrado.jpg');
const RELOJ = new Date('2026-11-10T18:00:00Z'); // 12:00 en America/Mexico_City (UTC-6, sin horario de verano)
const VP = { width: 390, height: 844 };

const RESENAS_BRIEF = [
  'El servicio y la calidad de sus pasteles es perfecto! Siempre deja los pasteles como la imagen que solicites! Y el plus es que son riquísimos! Mega recomendada!',
  'Cada semana voy por uno, son lo mejor. Calidad que se siente en el paladar!! Si dice que pone tal ingrediente es porque sí utiliza eso. 10/10',
  'La atención es excelente pero lo mejor son los productos, yo soy fan de las galletas de Ana Gaby Repostería, sin duda las mejores en Aguascalientes.',
  'Los mejores pasteles personalizados! Quedan hermosos! Los postres más deliciosos!',
  'Si buscas un lugar lleno de calidad, sabor e ingredientes top, este es el lugar!! Las mejores galletas de Aguascalientes.',
  'Me atrajo el olor que salía del lugar, me llevé unas galletas para probarlas; estaban súper ricas y a súper buen precio.',
];
const MENSAJE_ESPERADO = [
  '¡Hola, Ana Gaby! ¿Me podrías ayudar con la cotización de un pastel personalizado?',
  'Tamaño (número de personas): 20 a 30',
  'Diseño: te mando la foto en este chat.',
  'Mensaje del pastel: “Feliz cumpleaños”',
  'Fecha y hora: sábado 14 de noviembre, en la mañana (11:00 am – 2:00 pm)',
  '¡Muchas gracias!',
].join('\n');

const resultados = [];
function prueba(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''}`);
}

const { srv, url } = await servir(path.join(ROOT, 'web'));
const browser = await chromium.launch();

async function nuevaPagina({ query = '', dsf = 2, viewport = VP } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf, isMobile: viewport.width < 600, hasTouch: viewport.width < 600, locale: 'es-MX', timezoneId: 'America/Mexico_City', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(RELOJ);
  const errores = [];
  const fallidas = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('requestfailed', (r) => fallidas.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) fallidas.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => { window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); return null; }; });
  await page.goto(`${url}/${query}`);
  await page.waitForFunction(() => document.body.classList.contains('cargada'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600);
  return { ctx, page, errores, fallidas };
}

const foto = (page, nombre) => page.screenshot({ path: path.join(OUT, `${nombre}.png`) });
async function irY(page, selector, margen = 74) {
  await page.evaluate(([s, m]) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - m); }, [selector, margen]);
  await page.waitForTimeout(1300);
}

// ===================================================================================== Página normal
const { ctx, page, errores, fallidas } = await nuevaPagina();

// 1. Carga, fuentes, desborde
const fuentes = await page.evaluate(() => ({
  serif: document.fonts.check('italic 600 20px "Cormorant Garamond"'),
  sans: document.fonts.check('400 16px "DM Sans"') && document.fonts.check('600 16px "DM Sans"'),
  cargadas: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
}));
prueba('Fuentes locales cargadas (Cormorant Garamond itálica y DM Sans)', fuentes.serif && fuentes.sans, fuentes.cargadas.join(' · '));
const anchos = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
prueba('Sin desplazamiento horizontal a 390 px', anchos.sw <= anchos.iw, anchos);

// 2. Portada
const portada = await page.evaluate(() => {
  const r = (s) => document.querySelector(s).getBoundingClientRect();
  return {
    kicker: document.querySelector('.portada .kicker').textContent.trim(),
    google: document.querySelector('.chip-google').innerText.replace(/\s+/g, ' ').trim(),
    h1: document.querySelector('#titulo-portada').textContent.trim(),
    botones: [...document.querySelectorAll('.cta .btn')].map((b) => b.textContent.trim()),
    bajoBotones: Math.max(r('.cta .btn-sec').bottom, r('.cta .btn-pri').bottom),
    foto: document.querySelector('.portada-foto img').naturalWidth,
  };
});
prueba('Portada: foto de su local con el letrero', portada.foto === 1320, `naturalWidth ${portada.foto}`);
prueba('Portada: «Repostería · Los Bosques, Aguascalientes»', portada.kicker === 'Repostería · Los Bosques, Aguascalientes', portada.kicker);
prueba('Portada: «5.0 en Google»', portada.google === '5.0 en Google', portada.google);
prueba('Portada: botones «Ver catálogo» y «Cotiza tu pastel» sin hacer scroll', portada.botones.join('|') === 'Ver catálogo|Cotiza tu pastel' && portada.bajoBotones <= VP.height, `${portada.botones.join(' / ')} · borde inferior ${Math.round(portada.bajoBotones)} px de ${VP.height}`);
await foto(page, '01_portada');

// 3. Catálogo y pestañas
await page.click('.cta .btn-sec');
await page.waitForTimeout(1500);
const enCatalogo = await page.evaluate(() => Math.round(document.querySelector('#catalogo').getBoundingClientRect().top));
prueba('«Ver catálogo» lleva al catálogo', enCatalogo >= 0 && enCatalogo < 140, `catálogo a ${enCatalogo} px del borde superior`);
await irY(page, '#catalogo', 70);
await foto(page, '02_catalogo_galletas');

const CATALOGO = await page.evaluate(() => window.AnaGaby.CATALOGO);
for (const tab of ['pasteles', 'postres', 'galletas']) {
  await page.click(`#tab-${tab}`);
  await page.waitForTimeout(1000);
  const r = await page.evaluate((tab) => {
    const panel = document.querySelector(`#panel-${tab}`);
    const t = document.querySelector(`#tab-${tab}`);
    const p = document.querySelector('.tabs-pastilla');
    return {
      sel: t.getAttribute('aria-selected'),
      activo: panel.classList.contains('activo'),
      nombres: [...panel.querySelectorAll('.tarjeta h3')].map((h) => h.textContent),
      precios: [...panel.querySelectorAll('.precio')].map((h) => h.textContent),
      fotos: [...panel.querySelectorAll('img')].map((i) => i.complete && i.naturalWidth > 0),
      pastilla: Math.abs(p.getBoundingClientRect().left - t.getBoundingClientRect().left) < 1.5 && Math.abs(p.getBoundingClientRect().width - t.getBoundingClientRect().width) < 1.5,
      otrosVisibles: [...document.querySelectorAll('.panel')].filter((x) => x !== panel && getComputedStyle(x).visibility === 'visible').length,
    };
  }, tab);
  const esperados = CATALOGO[tab].map((p) => p.nombre);
  prueba(`Pestaña «${tab}»: tarjetas con sus fotos y nombre genérico`, r.sel === 'true' && r.activo && JSON.stringify(r.nombres) === JSON.stringify(esperados) && r.fotos.every(Boolean) && r.otrosVisibles === 0, r.nombres.join(' · '));
  prueba(`Pestaña «${tab}»: precio con marcador «$ —»`, r.precios.every((x) => x === '$ —'), r.precios.join(' '));
  prueba(`Pestaña «${tab}»: la pastilla rosa queda bajo la pestaña`, r.pastilla);
  if (tab !== 'galletas') await foto(page, `03_catalogo_${tab}`);
}
await page.focus('#tab-galletas');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
const tecla = await page.evaluate(() => [document.activeElement.id, window.AnaGaby.tabActiva]);
prueba('Pestañas con teclado (flecha derecha)', tecla[0] === 'tab-pasteles' && tecla[1] === 'pasteles', tecla.join(' / '));

const pedir = await page.evaluate(() => [...document.querySelectorAll('.pedir')].map((a) => ({ href: a.href, label: a.getAttribute('aria-label') })));
const pedirOk = pedir.every((p) => p.href.startsWith('https://wa.me/524494063325?text=') && decodeURIComponent(p.href.split('text=')[1]).startsWith('¡Hola, Ana Gaby! Me interesa: '));
prueba('Botón de cada tarjeta: WhatsApp con el producto ya escrito', pedirOk && pedir.length === 12, decodeURIComponent(pedir[0].href.split('text=')[1]));

// 4. A tu medida: desde la portada
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.click('#cta-cotiza');
await page.waitForTimeout(1600);
const medida = await page.evaluate(() => ({ tab: window.AnaGaby.tabActiva, top: Math.round(document.querySelector('#tabs').getBoundingClientRect().top), hash: location.hash }));
prueba('«Cotiza tu pastel» abre la pestaña «A tu medida»', medida.tab === 'medida' && medida.top > 40 && medida.top < 160, medida);
await foto(page, '04_medida_vacio');

// 5. Validación
await page.click('#btn-enviar');
await page.waitForTimeout(900);
const val = await page.evaluate(() => ({
  errores: [...document.querySelectorAll('.error')].filter((e) => !e.hidden).map((e) => e.textContent.trim()),
  hoja: document.querySelector('#hoja-mensaje').classList.contains('abierta'),
  abiertos: window.__abiertos.length,
}));
prueba('Validación: no envía sin foto (o idea), personas y fecha', val.errores.length === 3 && !val.hoja && val.abiertos === 0, val.errores.join(' | '));
await irY(page, '#paso-foto', 80);
await foto(page, '05_medida_errores');

// 6. Subir foto
await page.setInputFiles('#foto-input', PASTEL);
await page.waitForFunction(() => !document.querySelector('#vista').hidden);
const subiendo = await page.evaluate(() => document.querySelector('#vista-texto').textContent);
await irY(page, '#paso-foto', 80);
await page.waitForTimeout(400);
const subida = await page.evaluate(() => ({
  visible: !document.querySelector('#vista').hidden && document.querySelector('#vista').getBoundingClientRect().width > 250 && document.querySelector('#vista').getBoundingClientRect().height > 200 && document.querySelector('#subir').getBoundingClientRect().height === 0,
  ancho: document.querySelector('#vista-img').naturalWidth,
  texto: document.querySelector('#vista-texto').textContent,
  error: !document.querySelector('#err-foto').hidden,
}));
prueba('Subir foto: vista previa con barra de carga', subida.visible && subida.ancho === 1080 && subiendo === 'Preparando tu foto…' && subida.texto === 'Foto lista' && !subida.error, `${subiendo} → ${subida.texto} · ${subida.ancho}px`);
await foto(page, '06_medida_foto');

// 7. Personas
await page.click('#personas label:nth-child(3)');
const personas = await page.evaluate(() => window.AnaGaby.estado.personas);
prueba('Personas: chip «20 a 30»', personas === '20 a 30', personas);

// 8. Calendario
await page.click('#btn-fecha');
await page.waitForTimeout(800);
const calendario = await page.evaluate(() => {
  const dias = [...document.querySelectorAll('#cal-rejilla .dia')];
  const d = (n) => dias.find((b) => +b.dataset.d === n);
  return {
    abierta: document.querySelector('#hoja-fecha').classList.contains('abierta'),
    mes: document.querySelector('#cal-mes').textContent,
    pasadosOff: [1, 3, 4, 5, 6, 7, 9].every((n) => d(n).disabled),
    domLunOff: [8, 9, 15, 16, 22, 23, 29, 30].every((n) => d(n).disabled),
    abiertos: [10, 11, 12, 13, 14, 17].every((n) => !d(n).disabled),
    antDeshab: document.querySelector('#cal-ant').disabled,
    horasOff: [...document.querySelectorAll('#horas input')].every((i) => i.disabled),
  };
});
prueba('Calendario: se abre en noviembre 2026', calendario.abierta && calendario.mes === 'noviembre 2026', calendario.mes);
prueba('Calendario: días pasados, domingos y lunes deshabilitados', calendario.pasadosOff && calendario.domLunOff && calendario.abiertos && calendario.antDeshab, calendario);
await page.click('#cal-rejilla .dia[data-d="14"]');
await page.waitForTimeout(300);
const sab = await page.evaluate(() => {
  const [m, t] = document.querySelectorAll('#horas input');
  return { m: m.disabled, t: t.disabled, tm: document.querySelector('#hora-manana').textContent, tt: document.querySelector('#hora-tarde').textContent };
});
prueba('Sábado: solo «Mañana» 11:00 am – 2:00 pm (su horario)', !sab.m && sab.t && sab.tm === '11:00 am – 2:00 pm' && sab.tt === 'Cerrado', sab);
await page.click('#cal-rejilla .dia[data-d="13"]');
await page.waitForTimeout(200);
const vie = await page.evaluate(() => [document.querySelector('#hora-manana').textContent, document.querySelector('#hora-tarde').textContent, document.querySelector('#horas input[value="tarde"]').disabled]);
prueba('Viernes: mañana y tarde según su horario', vie[0] === '11:30 am – 2:30 pm' && vie[1] === '4:30 pm – 7:00 pm' && vie[2] === false, vie.join(' / '));
await page.click('#cal-rejilla .dia[data-d="14"]');
await page.click('#horas label:first-child');
await page.waitForTimeout(400);
await foto(page, '07_fecha_calendario');
await page.click('#fecha-listo');
await page.waitForTimeout(700);
const fechaTxt = await page.evaluate(() => document.querySelector('#fecha-texto').textContent);
prueba('Fecha elegida en el campo', fechaTxt === 'Sábado 14 de noviembre · mañana', fechaTxt);

// 9. Mensaje del pastel
await page.click('#mensaje');
await page.keyboard.type('Feliz cumpleaños', { delay: 20 });
const cont = await page.evaluate(() => document.querySelector('#contador').textContent);
prueba('Mensaje del pastel con contador', cont === '16/40', cont);
await page.evaluate(() => document.activeElement.blur());
await irY(page, '#paso-fecha', 90);
await foto(page, '08_medida_lleno');

// 10. Enviar
await page.click('#btn-enviar');
await page.waitForTimeout(900);
const envio = await page.evaluate(() => ({ abiertos: window.__abiertos, burbuja: document.querySelector('#hm-burbuja').textContent, foto: !document.querySelector('#hm-foto').hidden, sub: document.querySelector('#hm-sub').textContent, abrir: document.querySelector('#hm-abrir').href }));
const textoEnviado = envio.abiertos[0] ? decodeURIComponent(envio.abiertos[0].split('?text=')[1]) : '';
prueba('Enviar: abre WhatsApp a 449 406 3325', envio.abiertos.length === 1 && envio.abiertos[0].startsWith('https://wa.me/524494063325?text='), envio.abiertos[0] ? envio.abiertos[0].slice(0, 60) + '…' : 'no se abrió');
prueba('Enviar: el mensaje sale armado, con «te mando la foto en este chat»', textoEnviado === MENSAJE_ESPERADO, textoEnviado.split('\n').join(' ⏎ '));
prueba('Enviar: hoja «Tu pedido, en un mensaje» con su foto para adjuntar', envio.burbuja === MENSAJE_ESPERADO && envio.foto && envio.abrir === envio.abiertos[0], envio.sub);
fs.writeFileSync(path.join(OUT, 'mensaje_whatsapp.txt'), `${textoEnviado}\n\n${envio.abiertos[0]}\n`);
await foto(page, '09_mensaje');
await page.click('#hm-copiar');
await page.waitForTimeout(500);
const copiado = await page.evaluate(async () => ({ aviso: document.querySelector('#aviso').textContent, clip: await navigator.clipboard.readText().catch(() => null) }));
prueba('Copiar mensaje', copiado.aviso === 'Mensaje copiado' && copiado.clip === MENSAJE_ESPERADO, copiado.aviso);
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
const cerrada = await page.evaluate(() => !document.querySelector('#hoja-mensaje').classList.contains('abierta') && !document.body.classList.contains('hoja-abierta'));
prueba('La hoja se cierra con Escape y regresa el scroll', cerrada);

// 11. Idea sin foto (ruta alterna que ya acepta su plantilla: «idea o insertar imagen»)
const sinFoto = await page.evaluate(() => {
  const A = window.AnaGaby;
  A.estado.foto = null;
  document.querySelector('#notas').value = 'Pastel de chocolate con fresas, tonos rosas';
  const t = A.mensajeMedida();
  return t.includes('Diseño: Pastel de chocolate con fresas, tonos rosas') && !t.includes('te mando la foto');
});
prueba('Sin foto: la idea escrita va como «Diseño»', sinFoto);

// 12. Reseñas
await irY(page, '#resenas', 70);
const res = await page.evaluate(() => ({
  textos: [...document.querySelectorAll('.resena blockquote')].map((b) => b.textContent),
  firmas: [...document.querySelectorAll('.resena figcaption')].map((f) => f.textContent.trim()),
  estrellas: [...document.querySelectorAll('.resena figcaption .estrellas')].map((e) => e.children.length),
  todo: document.querySelector('#resenas').innerText,
}));
prueba('Reseñas: las 6 reseñas del brief, texto exacto', JSON.stringify(res.textos) === JSON.stringify(RESENAS_BRIEF), `${res.textos.length} reseñas`);
prueba('Reseñas: 5 estrellas y «Reseña en Google», sin nombres', res.firmas.every((f) => f === 'Reseña en Google') && res.estrellas.every((n) => n === 5) && !/Rocio|Rocío|Diego|Rodrigo|Patricia|Kiara|Cuevas|Padilla|Alonso|Medel/i.test(res.todo), res.firmas[0]);
await foto(page, '10_resenas');
await page.evaluate(() => window.AnaGaby.irResena(1, 'auto'));
await page.waitForTimeout(500);
const r2 = await page.evaluate(() => [window.AnaGaby.resenaActual(), [...document.querySelectorAll('.punto')].findIndex((p) => p.getAttribute('aria-current') === 'true')]);
prueba('Carrusel: deslizar a la reseña 2 actualiza los puntos', r2[0] === 1 && r2[1] === 1, r2.join(' / '));
await page.evaluate(() => window.AnaGaby.irResena(0, 'auto'));

// 13. Visítanos
await irY(page, '#visitanos', 70);
await page.waitForTimeout(800);
await foto(page, '11_visitanos');
const vis = await page.evaluate(() => ({
  dir: document.querySelector('.direccion').textContent.trim(),
  filas: [...document.querySelectorAll('#horario li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()),
  estado: document.querySelector('#estado').textContent,
  hoy: document.querySelector('#horario li.hoy span').textContent,
  ruta: document.querySelector('#btn-ruta').href,
  tel: document.querySelector('#btn-llamar').href,
  wa: decodeURIComponent(document.querySelector('.visita-acciones [data-wa]').href.split('text=')[1] || ''),
  waNum: document.querySelector('.visita-acciones [data-wa]').href.split('?')[0],
  ig: document.querySelector('#pie-ig').href,
}));
prueba('Visítanos: dirección', vis.dir === 'Paseo Sierra Hermosa 111, Los Bosques, Aguascalientes', vis.dir);
prueba('Visítanos: horario de su Instagram, con «Hoy» en el día actual', JSON.stringify(vis.filas) === JSON.stringify(['Martes a viernes 11:30 am – 2:30 pm 4:30 pm – 7:00 pm', 'Sábado 11:00 am – 2:00 pm', 'Domingo y lunes Cerrado']) && vis.hoy === 'Martes a viernes', `${vis.filas.join(' | ')} · hoy: ${vis.hoy}`);
prueba('Visítanos: estado en vivo (martes 12:00 → abierto)', vis.estado === 'Abierto ahora · cierra a las 2:30 pm', vis.estado);
prueba('Visítanos: botón de WhatsApp, cómo llegar y llamar', vis.waNum === 'https://wa.me/524494063325' && vis.wa === '¡Hola, Ana Gaby! Vi tu página y quiero hacer un pedido.' && vis.ruta.startsWith('https://www.google.com/maps/search/?api=1&query=') && vis.tel === 'tel:+524494063325', `${vis.wa} · ${vis.tel}`);
prueba('Pie: Instagram @anagaby.reposteria', vis.ig === 'https://www.instagram.com/anagaby.reposteria/', vis.ig);

const casos = await page.evaluate(() => {
  const E = (iso) => window.AnaGaby.estadoNegocio(new Date(iso)).texto;
  return {
    'mar 12:00': E('2026-11-10T18:00:00Z'), 'mar 15:00': E('2026-11-10T21:00:00Z'), 'mar 19:30': E('2026-11-11T01:30:00Z'),
    'sáb 13:00': E('2026-11-14T19:00:00Z'), 'sáb 14:30': E('2026-11-14T20:30:00Z'), 'dom 12:00': E('2026-11-15T18:00:00Z'), 'lun 12:00': E('2026-11-16T18:00:00Z'),
    'mar 11:00': E('2026-11-10T17:00:00Z'),
  };
});
const casosOk = casos['mar 12:00'] === 'Abierto ahora · cierra a las 2:30 pm' && casos['mar 15:00'] === 'Cerrado · abre hoy a las 4:30 pm'
  && casos['mar 19:30'] === 'Cerrado · abre mañana a las 11:30 am' && casos['sáb 13:00'] === 'Abierto ahora · cierra a las 2:00 pm'
  && casos['sáb 14:30'] === 'Cerrado · abre el martes a las 11:30 am' && casos['dom 12:00'] === 'Cerrado · abre el martes a las 11:30 am'
  && casos['lun 12:00'] === 'Cerrado · abre mañana a las 11:30 am' && casos['mar 11:00'] === 'Cerrado · abre hoy a las 11:30 am';
prueba('Horario: abierto/cerrado correcto en 8 momentos de la semana', casosOk, casos);

await irY(page, '#horario', 80);
await foto(page, '12_horario');
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(900);
await foto(page, '13_pie');

// 14. Accesibilidad básica
const a11y = await page.evaluate(() => {
  const sinNombre = [...document.querySelectorAll('a, button')].filter((el) => {
    if (el.closest('[aria-hidden="true"]') || el.closest('[inert]')) return false;
    const n = (el.getAttribute('aria-label') || el.textContent || '').trim();
    return !n;
  }).map((el) => el.outerHTML.slice(0, 80));
  const imgsSinAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
  const camposSinEtiqueta = [...document.querySelectorAll('input:not([type=radio]), textarea')].filter((i) => !(i.labels && i.labels.length) && !i.getAttribute('aria-label')).map((i) => i.id);
  return { sinNombre, imgsSinAlt, camposSinEtiqueta };
});
prueba('Accesibilidad: botones y enlaces con nombre, imágenes con alt, campos con etiqueta', !a11y.sinNombre.length && !a11y.imgsSinAlt && !a11y.camposSinEtiqueta.length, a11y);

// Contraste de los pares de color principales (WCAG)
const lum = (hex) => { const c = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mezcla = (fg, a, bg) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(fg.slice(1 + i, 3 + i), 16) * a + parseInt(bg.slice(1 + i, 3 + i), 16) * (1 - a)).toString(16).padStart(2, '0')).join('');
const pares = {
  'tinta sobre crema': ratio('#1E1A1B', '#FBF5F3'),
  'tinta sobre rosa caja (botones)': ratio('#1E1A1B', '#E5959A'),
  'texto secundario (tinta 66 %) sobre crema': ratio(mezcla('#1E1A1B', 0.66, '#FBF5F3'), '#FBF5F3'),
  'texto secundario (tinta 66 %) sobre blanco': ratio(mezcla('#1E1A1B', 0.66, '#FFFFFF'), '#FFFFFF'),
};
prueba('Contraste AA (≥ 4.5:1) en texto y botones', Object.values(pares).every((r) => r >= 4.5), Object.fromEntries(Object.entries(pares).map(([k, v]) => [k, `${v.toFixed(2)}:1`])));

// 15. Palabras visibles para revisión de ortografía
const palabras = await page.evaluate(() => {
  const t = [document.body.innerText, ...[...document.querySelectorAll('[aria-label],[alt],[placeholder],[title]')].map((e) => [e.getAttribute('aria-label'), e.getAttribute('alt'), e.getAttribute('placeholder'), e.getAttribute('title')].filter(Boolean).join(' '))].join(' ');
  return [...new Set(t.toLowerCase().match(/[a-záéíóúüñ]+/gi))].sort();
});
fs.writeFileSync(path.join(OUT, 'palabras.txt'), palabras.join('\n') + '\n');

prueba('Sin errores de JavaScript ni recursos rotos', !errores.length && !fallidas.length, [...errores, ...fallidas].join(' | ') || 'limpio');
await ctx.close();

// ===================================================================================== Modo demo
{
  const { ctx: c2, page: p2 } = await nuevaPagina({ query: '?demo=1#a-tu-medida' });
  const t0 = await p2.evaluate(() => window.AnaGaby.tabActiva);
  prueba('Enlace directo #a-tu-medida abre la pestaña', t0 === 'medida', t0);
  await p2.setInputFiles('#foto-input', PASTEL);
  await p2.click('#personas label:nth-child(2)');
  await p2.evaluate(() => { const A = window.AnaGaby; A.abrirFecha(); A.elegirDia(13); A.elegirHora('tarde'); A.confirmarFecha(); });
  await p2.waitForTimeout(700);
  await p2.fill('#mensaje', 'Feliz cumpleaños');
  await p2.click('#btn-enviar');
  await p2.waitForTimeout(900);
  const demo = await p2.evaluate(() => ({ abiertos: window.__abiertos.length, sub: document.querySelector('#hm-sub').textContent, b: document.querySelector('#hm-burbuja').textContent }));
  prueba('Modo demo (?demo=1): muestra el mensaje y no abre WhatsApp', demo.abiertos === 0 && demo.sub.startsWith('Modo demo') && demo.b.includes('Fecha y hora: viernes 13 de noviembre, en la tarde (4:30 pm – 7:00 pm)'), demo.sub);
  await foto(p2, '14_demo');
  await c2.close();
}

// ===================================================================================== Captura a 3x
{
  const { ctx: c3, page: p3 } = await nuevaPagina({ dsf: 3, query: '?captura=1' });
  const buf = await p3.screenshot({ path: path.join(OUT, '15_captura_3x.png') });
  const ancho = buf.readUInt32BE(16), alto = buf.readUInt32BE(20);
  const fotos = await p3.evaluate(() => [...document.querySelectorAll('img[src]')].filter((i) => i.offsetParent !== null || i.closest('.panel')).map((i) => {
    const r = i.getBoundingClientRect();
    return { src: i.getAttribute('src').split('/').pop(), natural: i.naturalWidth, css: Math.round(r.width) };
  }).filter((x) => x.css > 0));
  const peor = fotos.reduce((m, f) => Math.max(m, (f.css * 3) / f.natural), 0);
  prueba('Captura a 3x (textura del celular del video)', ancho === 1170 && alto === 2532, `${ancho}×${alto} · ampliación máx. de foto a 3x: ${peor.toFixed(2)}×`);
  await c3.close();
}

// ===================================================================================== Pantalla grande
{
  const { ctx: c4, page: p4, errores: e4 } = await nuevaPagina({ viewport: { width: 1280, height: 800 }, dsf: 1 });
  const sw = await p4.evaluate(() => document.documentElement.scrollWidth);
  await foto(p4, '16_escritorio');
  prueba('Responsive: también funciona en pantalla grande (1280 px)', sw <= 1280 && !e4.length, `scrollWidth ${sw}`);
  await c4.close();
}

// ===================================================================================== Archivo único (dist)
{
  const archivo = path.join(ROOT, 'dist', 'ana-gaby-reposteria-demo.html');
  if (fs.existsSync(archivo)) {
    const ctx5 = await browser.newContext({ viewport: VP, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p5 = await ctx5.newPage();
    const e5 = [];
    p5.on('pageerror', (e) => e5.push(e.message));
    p5.on('requestfailed', (r) => e5.push(`falló ${r.url().slice(0, 60)}`));
    await p5.goto(`file://${archivo}`);
    await p5.waitForFunction(() => document.body.classList.contains('cargada'));
    await p5.evaluate(() => document.fonts.ready);
    const r5 = await p5.evaluate(() => ({
      fotos: [...document.querySelectorAll('img[src]')].every((i) => i.complete && i.naturalWidth > 0),
      serif: document.fonts.check('italic 600 20px "Cormorant Garamond"'),
      demo: window.AnaGaby.DEMO,
      externos: [...document.querySelectorAll('img[src], link[href], script[src]')].map((e) => e.getAttribute('src') || e.getAttribute('href')).filter((u) => u && !u.startsWith('data:')).length,
    }));
    prueba('Archivo único (dist) se abre sin internet: fotos, fuentes y modo demo', r5.fotos && r5.serif && r5.demo === true && r5.externos === 0 && !e5.length, r5);
    await ctx5.close();
  }
}

await browser.close();
srv.close();
const ok = resultados.filter((r) => r.ok).length;
fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify({ fecha: new Date().toISOString(), reloj_de_prueba: RELOJ.toISOString(), vista: VP, pasaron: ok, total: resultados.length, resultados }, null, 2));
console.log(`\n${ok}/${resultados.length} pruebas OK`);
process.exit(ok === resultados.length ? 0 : 1);
