// Fase 2: brief con tiempos por cuadro. Genera brief/timeline.json (lo leen las fases 3–7) y brief/brief_fase2.md.
// Uso: node tools/brief.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'brief');
fs.mkdirSync(OUT, { recursive: true });

const FPS = 60;
const BPM = 98;
const TIEMPO = (60 / BPM) * FPS; // 36.73 cuadros
const COMPAS = TIEMPO * 4; // 146.94 cuadros
const FRAMES = 1680; // 28.0 s
const beat = (k) => Math.round(k * TIEMPO);
const s = (f) => (f / FPS).toFixed(2);

// ------------------------------------------------------------------ Voz (medida en la toma, fase 3 la bloquea)
const toma = JSON.parse(fs.readFileSync(path.join(ROOT, 'voz', 'fuente', 'toma_frases.json'), 'utf8'));
const ENTRA = { L1: 24, L2: 174, L3: 318, L4: 612, L5: 972, L6: 1200, L7: 1458 };
const RECORTE_L7 = 7; // la pausa interna de la L7 pasa de 0.40 s a 0.28 s
const voz = toma.frases.filter((x) => ENTRA[x.id] !== undefined).map((x) => {
  const f0 = ENTRA[x.id];
  const palabras = x.palabras.map((w, i) => ({
    w: w.w,
    f: f0 + Math.round((w.ini - x.ini) * FPS) - (x.id === 'L7' && i >= 2 ? RECORTE_L7 : 0),
  }));
  const dur = x.dur - (x.id === 'L7' ? RECORTE_L7 / FPS : 0);
  return { id: x.id, f: f0, texto: x.texto, toma: { ini: x.ini, fin: x.fin }, dur: +dur.toFixed(3), termina_f: f0 + Math.round(dur * FPS), palabras };
});
const P = Object.fromEntries(voz.map((v) => [v.id, Object.fromEntries(v.palabras.map((w) => [w.w, w.f]))]));

// ------------------------------------------------------------------ Secciones y música
const secciones = [
  { id: 'hook', nombre: 'Hook', f: 0, fin: 146, musica: 'Compás 1 · golpe en f0, cucharas y motivo de glockenspiel' },
  { id: 'llegada', nombre: 'Llegada', f: 147, fin: 293, musica: 'Compás 2 · entra la guitarra de nylon' },
  { id: 'catalogo', nombre: 'Catálogo', f: 294, fin: 587, musica: 'Compases 3–4 · entra el shaker' },
  { id: 'medida', nombre: 'A tu medida', f: 588, fin: 953, musica: 'Compases 5–7½ · lift en f588: bajo cálido y glockenspiel una octava arriba' },
  { id: 'pedido', nombre: 'Pedido', f: 954, fin: 1151, musica: 'Compases 7½–9 · palmas suaves' },
  { id: 'confianza', nombre: 'Confianza y visítanos', f: 1152, fin: 1343, musica: 'Compases 9–10 · todas las capas' },
  { id: 'cierre', nombre: 'Cierre', f: 1344, fin: 1439, musica: 'Se adelgaza; respiro en f1378 (22.96 s)' },
  { id: 'end', nombre: 'End card', f: 1440, fin: FRAMES - 1, musica: 'Golpe grave en f1440 y cadencia final' },
];
const musica = [
  { f: 0, compas: 1, acorde: 'Dmaj9', capas: 'Golpe suave, cucharas y motivo de glockenspiel (3 notas)' },
  { f: beat(4), compas: 2, acorde: 'Bm11', capas: '+ guitarra de nylon en arpegio' },
  { f: beat(8), compas: 3, acorde: 'Gmaj7', capas: '+ shaker en semicorcheas' },
  { f: beat(12), compas: 4, acorde: 'A13sus4 → A', capas: 'Todo lo anterior' },
  { f: beat(16), compas: 5, acorde: 'Dmaj9', capas: 'Lift: + bajo cálido; glockenspiel una octava arriba' },
  { f: beat(20), compas: 6, acorde: 'Bm11', capas: 'Igual' },
  { f: beat(24), compas: 7, acorde: 'Gmaj7', capas: 'Igual' },
  { f: 954, compas: 7.5, acorde: 'Gmaj7', capas: '+ palmas suaves en 2 y 4' },
  { f: beat(28), compas: 8, acorde: 'A13sus4 → A', capas: 'Igual' },
  { f: beat(32), compas: 9, acorde: 'Dmaj9', capas: 'Todas las capas' },
  { f: beat(36), compas: 10, acorde: 'Bm11', capas: 'Se adelgaza desde f1344' },
  { f: 1378, compas: 10.5, acorde: '—', capas: 'Respiro: se van todas las capas; queda una nota de glockenspiel' },
  { f: 1440, compas: 'end', acorde: 'Gmaj7 → A7sus4 → Dmaj9', capas: 'Golpe grave y cadencia final con guitarra y glockenspiel' },
];

// ------------------------------------------------------------------ Kinetic type
const tipo = [
  { id: 'K1', texto: 'RECIÉN / HORNEADAS', palabras: [['RECIÉN', beat(13)], ['HORNEADAS', beat(14)]], sale: 566, aterriza: 'el pulso (tiempos 13 y 14): no está en la voz, entra cuando termina la L3', pos: 'Columna derecha · x 680–1040 · y 830 y 910', px: 62 },
  { id: 'K2', texto: 'MÁNDANOS / LA FOTO.', palabras: [['MÁNDANOS', 700], ['LA', P.L4.la], ['FOTO.', P.L4.foto]], sale: 770, aterriza: '«la foto» (L4)', pos: 'Abajo a la derecha · x 610–1040 · y 1340 y 1420', px: 60 },
  { id: 'K3', texto: 'TE LO / HACEMOS / IGUAL.', palabras: [['TE', 776], ['LO', 782], ['HACEMOS', 792], ['IGUAL.', 814]], sale: 844, aterriza: 'la última cereza del pastel 3D (f814)', pos: 'Abajo a la derecha · x 610–1040 · y 1300–1520', px: 56 },
  { id: 'K4', texto: 'TU PEDIDO', palabras: [['TU', 930], ['PEDIDO', 936]], sale: 980, aterriza: 'el tap en «¿Qué dice tu pastel?» (no está en la voz)', pos: 'Columna derecha · x 680–1040 · y 870', px: 62 },
  { id: 'K5', texto: 'EN UN / MENSAJE', palabras: [['EN', P.L5.en], ['UN', P.L5.un], ['MENSAJE', P.L5.mensaje]], sale: 1090, aterriza: '«en un mensaje» (L5)', pos: 'Columna derecha · x 680–1040 · y 830 y 910', px: 62 },
  { id: 'K6', texto: 'HABLAN / POR TI', palabras: [['HABLAN', P.L6.hablan], ['POR TI', P.L6.por]], sale: 1302, aterriza: '«hablan por ti» (L6)', pos: 'Columna derecha · x 680–1040 · y 860 y 940', px: 62 },
  { id: 'K7', texto: 'Así se vería tu página · Elevate Negocios', palabras: [['Así se vería tu página', P.L7['Así']], ['Elevate Negocios', P.L7.Elevate]], sale: FRAMES, aterriza: '«Así se vería» y «Elevate» (L7)', pos: 'End card · centrado · y 1170', px: 40, fuente: 'DM Sans 600' },
];

// ------------------------------------------------------------------ Eventos y cues de sonido (cada cue con su cuadro)
const eventos = [];
const cues = [];
const ev = (f, fin, p, t, sfx = []) => {
  eventos.push({ f, fin, p, t, sfx: sfx.map(([id]) => id) });
  sfx.forEach(([id, cf]) => cues.push({ f: cf ?? f, id }));
};

// HOOK
ev(0, null, 'Música', 'Golpe en f0: bombo de fieltro, cuchara y Re grave de guitarra de nylon. Fondo chocolate oscuro #2A1C18 con degradado radial hacia la tinta #1E1A1B.', [['golpe_suave', 0]]);
ev(0, 20, '2D', 'Barra de búsqueda de cristal genérica: píldora de 880 × 136 px, centro en y 930, lupa genérica y «Buscar» en DM Sans 40 px al 45 %. Blur 32 px de lo que hay detrás, saturación 140 %, borde de 1 px y ruido 2 %. Entra con 6° de inclinación 3D y se endereza. Sin logo de ningún buscador.', [['cristal_aparece', 2]]);
ev(0, 8, 'Betún', 'La manga (bolsa translúcida con betún rosa y boquilla de estrella metálica) entra por arriba a la derecha y aprieta en f0: se encoge 6 % y sale la primera gota.', [['manga_aprieta', 0]]);
const consulta = 'galletas aguascalientes';
const teclas = [...consulta].map((c, i) => [c === ' ' ? 'espacio' : 'tecla', 6 + Math.round(i * 5.5)]);
ev(6, 128, 'Betún', `Escribe «${consulta}» dentro de la barra con letra de betún (EMS Allure, un solo trazo, 88 px): una letra cada 5.5 cuadros, cada una con su tecla. «Buscar» se desvanece en f6–f14. Volumen, brillo húmedo y estrías de la boquilla.`, [['betun_cremoso', 6], ...teclas]);
ev(0, 146, 'Cámara', 'Push-in lento hacia la barra (1.00 → 1.06) con deriva lateral de 6 px.');
ev(128, 146, 'Betún', 'La manga sube y sale de cuadro; desde aquí solo se ve la punta, que guía la línea.', [['whoosh_corto', 130]]);

// LLEGADA
ev(147, null, '2D', 'Enter: la barra late (1.03) y el texto de betún brilla.', [['enter', 147]]);
ev(150, 186, 'Betún', 'Desde la última letra, la línea corre y dibuja el contorno del celular (597 × 1248 px, centro 540, 924). La barra se encoge y sube hasta salir (f150–f176).', [['trazo_contorno', 150]]);
ev(160, 222, 'Celular', 'El celular de cristal se materializa dentro del contorno, gira de 12° a 0° en Y y se asienta con un rebote leve (f210–f222). El contorno de betún se funde con el bisel.', [['cristal_cuerpo', 162], ['asienta', 214]]);
ev(P.L2.encuentre, null, 'Pantalla', 'Se enciende la pantalla y carga la portada real con su animación de entrada (foto 1.06 → 1, chip «5.0 en Google» y textos que suben), en «encuentre».', [['pantalla_enciende', P.L2.encuentre]]);
ev(236, 258, 'Betún', 'Subraya «5.0 en Google».', [['subrayado', 236]]);
ev(222, 293, 'Cámara', 'Push-in suave a la portada: de 1.43 a 1.85 px por px de interfaz (tope 2.0× por el detalle de la foto).');

// CATÁLOGO
ev(296, 336, 'Pantalla', 'Scroll con inercia de la portada al catálogo (pestaña «Galletas»), con rebote al final.', [['scroll_friccion', 296]]);
ev(300, 336, 'Celular', 'Se corre a la izquierda (centro x 338) y queda en 1.43 px; la columna derecha (x 670–1040) queda libre para el texto.');
const tarjetas = [['Frasco de galletas de corazón', 336], ['Caja de galletas de chocolate', 372], ['Galletas de chispas de chocolate', 408]];
tarjetas.forEach(([nombre, f]) => {
  ev(f, f + 30, 'Betún', `Decora el borde de la tarjeta «${nombre}» con conchitas de betún.`, [['betun_borde', f]]);
  ev(f + 16, f + 104, '3D', `«${nombre}» sale de la pantalla al espacio 3D con su foto (giro 8°, profundidad), flota con sombra de contacto y parallax (foto ≤ 360 px de ancho) y regresa a su lugar en f${f + 84}–f${f + 104}.`, [['tarjeta_sale', f + 16], ['tarjeta_regresa', f + 84]]);
});
ev(530, 575, 'Pantalla', 'Tap en «Pasteles»: la pastilla rosa se desliza y la cuadrícula se reacomoda con resorte.', [['tap', 530], ['pestana_desliza', 532], ['cuadricula', 540]]);

// A TU MEDIDA
ev(590, 677, 'Pantalla', 'Tap en la pestaña «A tu medida» (el acceso a la mano de «Cotiza tu pastel»): cambia el panel y la acuarela pinta «de tu pastel».', [['tap', 590], ['panel_cambia', 592]]);
ev(610, 676, 'Pantalla', 'Tap en «Sube la foto de tu pastel»: entra la vista previa del pastel de referencia con su barra de carga real (1.1 s) y «Foto lista ✓» en f676.', [['tap', 610], ['subir_foto', 612], ['foto_lista', 676]]);
ev(640, 676, 'Celular', 'Baja a 60 % del alto y se corre a la izquierda (x 20–572). La columna derecha (x 600–1040) es para la foto, el pastel y el texto.');
ev(650, 690, '3D', 'La miniatura sale del celular y se acomoda arriba a la derecha (foto 4:5 de 320 × 400 px, x 660–980, y 300–700), con grosor y sombra. Mientras está fuera, su lugar en la pantalla queda rosa palo.', [['foto_sale', 650]]);
ev(P.L4['idéntico'], P.L4.foto, 'Betún', 'Traza el contorno del pastel sobre la foto (silueta de dos pisos y cerezas), de «idéntico» a «foto».', [['betun_trazo', P.L4['idéntico']]]);
ev(724, 814, '3D', 'Debajo de la foto (x 600–1040, y 740–1240) se construye el mismo pastel en 3D, idéntico, piso por piso: tabla f724; piso 1 cae y se asienta f728–f744; conchas y guirnaldas se pipean f744–f766; perlas f762–f770; piso 2 f768–f782; conchas y perlas f782–f794; cinco cerezas caen una por una f794–f814.',
  [['tabla', 724], ['piso_asienta', 744], ['pipeo', 746], ['pipeo', 756], ['piso_asienta', 782], ['pipeo', 786], ...[796, 800, 804, 808, 812].map((f) => ['cereza', f])]);
ev(814, 840, '3D', 'Foto y pastel juntos, idénticos, 0.4 s.');
ev(840, 866, '3D', 'La foto regresa a su lugar en la pantalla y el pastel se encoge hacia ella. El celular vuelve a 65 % (centro x 338) y hace scroll suave hasta «¿Para cuándo?».', [['whoosh_corto', 840], ['scroll_friccion', 848]]);
ev(866, 888, 'Pantalla', 'Tap en «¿Para cuándo?»: sube la hoja del calendario.', [['tap', 866], ['hoja_sube', 868]]);
ev(892, 930, 'Pantalla', 'Tap en el sábado 14 (f892), en «Mañana» (f902) y en «Listo» (f912); la hoja baja.', [['tap', 892], ['tap', 902], ['tap', 912], ['hoja_baja', 914]]);
ev(924, 942, 'Pantalla', 'Tap en «¿Qué dice tu pastel?»: sube un teclado genérico con barra de sugerencias (dibujado en código, no copia ningún sistema).', [['tap', 924], ['teclado_sube', 926]]);
ev(940, 966, 'Pantalla', 'Escribe «Feliz cumpleaños»: F y e, sugerencia «Feliz» (f940, f945, f950); c y u, sugerencia «cumpleaños» (f956, f961, f966).', [['tecla', 940], ['tecla', 945], ['sugerencia', 950], ['tecla', 956], ['tecla', 961], ['sugerencia', 966]]);

// PEDIDO
ev(970, 994, 'Pantalla', 'Baja el teclado y hace scroll con inercia hasta «Enviar por WhatsApp».', [['teclado_baja', 970], ['scroll_friccion', 976]]);
ev(998, 1018, '3D', 'Tap en «Enviar por WhatsApp»: el botón se levanta en 3D con pop (sale con su grosor y sombra) y regresa con su estado presionado real.', [['tap', 998], ['boton_pop', 1000]]);
ev(P.L5.mensaje, 1034, 'Pantalla', 'Sube la hoja «Tu pedido, en un mensaje» con el mensaje armado, en «mensaje».', [['hoja_sube', P.L5.mensaje], ['mensaje', 1030]]);
ev(1040, 1110, 'Cámara', 'Push-in a la burbuja hasta que se lee (2.3 px por px de interfaz). El betún subraya «te mando la foto en este chat.» (f1056–f1080).', [['subrayado', 1056]]);
ev(1112, 1160, 'Pantalla', 'Tap en «Cerrar»: baja la hoja (f1112–f1134) y hace scroll a las reseñas (f1134–f1160).', [['tap', 1112], ['hoja_baja', 1114], ['scroll_friccion', 1134]]);

// CONFIANZA Y VISÍTANOS
ev(1180, 1222, '3D', 'Swipe por las reseñas 1, 2 y 3 (f1180 y f1196): cada tarjeta sale al espacio 3D al pasar y quedan en abanico (−8°, 0°, +8°) delante del celular, legibles. Es la misma tarjeta blanca de la página, ahora con canto de cristal y sombra.', [['swipe', 1180], ['tarjeta_sale', 1184], ['swipe', 1196], ['tarjeta_sale', 1200], ['tarjeta_sale', 1214]]);
ev(1226, 1280, 'Cámara', 'Push-in a la reseña 1 del abanico; el betún subraya «como la imagen que solicites» (f1240–f1270).', [['subrayado', 1240]]);
ev(1282, 1298, '3D', 'Las tres tarjetas regresan al carrusel.', [['tarjeta_regresa', 1282]]);
ev(1298, 1314, 'Pantalla', 'Scroll rápido a «Visítanos».', [['scroll_friccion', 1298]]);
ev(1312, 1330, 'Pantalla', 'Cae el pin en Paseo Sierra Hermosa 111 (animación de la página) con su etiqueta.', [['pin', 1316]]);
ev(1320, 1340, 'Betún', 'Subraya «Martes a sábado».', [['subrayado', 1320]]);

// CIERRE
ev(1344, 1374, 'Celular', 'El celular se aleja hacia la izquierda (escala 45 %, centro x 250, giro 14°); todavía se leen el mapa y «Martes a sábado».', [['whoosh_largo', 1344]]);
ev(1350, 1396, 'Betún', 'Escribe «Lo que ya se antoja» con letra de betún (84 px, x 420–1030, y 860).', [['betun_escribe', 1350]]);
ev(1378, null, 'Música', 'Respiro: se van todas las capas; queda una nota de glockenspiel.');
ev(1398, 1434, 'Betún', 'Escribe «también se busca.» (y 980), en el silencio.', [['betun_escribe', 1398]]);

// END CARD
ev(1440, null, 'Música', 'Golpe grave: bombo, Re grave y sub. El celular sale por la izquierda y la frase sube y se desvanece.', [['golpe_grave', 1440], ['whoosh_corto', 1442]]);
ev(1443, 1533, 'Betún', 'La manga vuelve y escribe «Ana Gaby Repostería» en Cormorant Garamond Itálica (el trazo sigue el esqueleto de cada letra), 112 px, centrada en y 560.', [['manga_aprieta', 1443], ['betun_escribe', 1446]]);
ev(1520, 1556, '2D', 'Debajo aparece el letrero AG sobre una placa de cristal clara (círculo de 400 px con el letrero a 340 px, debajo de su tope de 450) con un barrido de luz.', [['cristal_placa', 1522]]);
ev(1530, null, '2D', 'Línea legal: «Demo de cortesía de Elevate Negocios · pieza no oficial» (DM Sans 26 px al 70 %, y 1520).');
ev(1640, FRAMES - 1, 'Música', 'Acorde final y campanita de glockenspiel; se sostiene hasta f1679.', [['campanita_final', 1640]]);

eventos.sort((a, b) => a.f - b.f);
cues.sort((a, b) => a.f - b.f);
const sfxLib = [...new Set(cues.map((c) => c.id))];
const seccionDe = (f) => secciones.find((x) => f >= x.f && f <= x.fin).id;

const timeline = { fps: FPS, bpm: BPM, frames: FRAMES, tiempo_cuadros: +TIEMPO.toFixed(4), compas_cuadros: +COMPAS.toFixed(3), secciones, voz, tipo, musica, eventos, cues, sfx_lib: sfxLib,
  formato: { principal: '1080x1920', cuadrado: '1080x1080', zona_segura_916: { y_min: 250, y_max: 1580 } },
  notas_voz: [
    'Toma única de ElevenLabs (voz «Hope», eleven v4, MP3 44.1 kHz): la transcripción sin guion coincide palabra por palabra.',
    'L1: se recorta la respiración del inicio (0.05–0.85 s de la toma).',
    'L7: la pausa entre «Repostería.» y «Así» se recorta de 0.40 a 0.28 s.',
  ] };
fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(timeline, null, 1));

// ------------------------------------------------------------------ Brief en Markdown
const L = [];
L.push('# Brief de producción · Ana Gaby Repostería · Fase 2', '');
L.push('Video vertical que le enseña a la dueña cómo se vería su página. Un solo plano continuo, sin cortes, guiado por una línea de betún que sale de una manga pastelera. La interfaz manda; el betún la sirve.', '');
L.push('## Cambios al brief original (para aprobar)', '');
L.push('1. **28 s en vez de 27 s (end card de 4 s).** La L7 completa, «Ana Gaby Repostería. Así se vería con Elevate.», dura 3.34 s en la toma y no cabe entre 24.40 y 27.00. Con 4 s cabe con aire (entra en 24.30 y termina en 27.52), igual que se aprobó en Florería Roma. Si prefieres los 27 s, uso la versión corta que ya viene en la toma («Ana Gaby Repostería, con Elevate.», 2.28 s) y solo cambia la end card.');
L.push('2. **El cierre empieza en 22.40 en vez de 22.80.** «Lo que ya se antoja / también se busca.» son 8 palabras: en 1.2 s no da tiempo de leerlas. Con 1.6 s se escriben y se leen. Para no quitarle tiempo a las reseñas (siguen con sus 3.2 s), el pedido cierra 0.4 s antes (19.20). El respiro (23.00) y el golpe grave (24.00) no se mueven.');
L.push('3. **«HABLAN / POR TI» en vez de «ASÍ HABLAN / DE TI»,** para que cada palabra aterrice en su palabra de la voz («reseñas que hablan por ti»). Es el mismo cambio que se aprobó en Florería Roma.');
L.push('4. **«TU PEDIDO» entra mientras se escribe «Feliz cumpleaños»** (0.8 s en pantalla) y le pasa el relevo a «EN UN MENSAJE», que aterriza en la voz. Juntos serían 5 palabras, más del máximo de 4. «RECIÉN / HORNEADAS» no está en la voz: aterriza en el pulso, justo al terminar la L3.');
L.push('5. **«Feliz cumpleaños» se escribe con sugerencias del teclado** (dos letras y la sugerencia, por palabra): es como se escribe en un celular y cabe en 0.45 s sin verse acelerado.');
L.push('6. **El tap de «Cotiza tu pastel» es en la pestaña «A tu medida».** Lleva al mismo panel; el botón de la portada queda muy arriba en ese momento.');
L.push('7. **Las reseñas salen como la misma tarjeta blanca de la página, con canto de cristal.** El brief pide «tarjetas de cristal» y también que lo que sale de la pantalla sea la misma pieza; así se cumplen las dos cosas.');
L.push('8. **Celular al 65 % del alto (60 % durante la foto y el pastel 3D),** corrido a la izquierda cuando hay texto o piezas 3D a la derecha. Así el botón «Enviar por WhatsApp» nunca cae en los 340 px inferiores.');
L.push('');
L.push('Además: el betún es rosa (como su betún) y la manga completa solo se ve en el hook y en la end card; en medio, la punta guía la línea. El celular no lleva barra de dirección, porque no vamos a inventar un dominio.', '');

L.push('## Especificaciones', '');
L.push(`- **Duración:** ${FRAMES} cuadros a 60 fps (${s(FRAMES)} s): 24 s de pieza y 4 s de end card. A 98 BPM un tiempo son ${TIEMPO.toFixed(2)} cuadros y un compás, ${COMPAS.toFixed(1)}.`);
L.push('- **Formatos:** 9:16 de 1080 × 1920 (principal) y re-layout real a 1:1 de 1080 × 1080. Master a 60 fps y versión H.264 a 30 fps con `-preset veryfast` para WhatsApp.');
L.push('- **Zonas seguras en 9:16:** nada importante arriba de y 250 ni debajo de y 1580. El kinetic type mide 56 px o más y siempre va fuera de la pantalla del celular.');
L.push('- **Paleta:** fondo tinta cálida #1E1A1B con degradado sutil a rosa muy oscuro #3A2027; en el hook, chocolate oscuro #2A1C18. Interfaz: blanco, crema rosado #FBF5F3, rosa acuarela #E6A3B0, rosa caja #E5959A, rosa palo #E9C3B8 y tinta #1E1A1B. Sin azules ni neón.');
L.push('- **Tipografía:** Cormorant Garamond Itálica SemiBold para el kinetic type (mayúsculas) y el nombre de la end card; DM Sans para la interfaz, la barra de búsqueda y la línea legal; EMS Allure (un solo trazo, OFL) para la letra de betún. Todas locales.');
L.push('- **Celular:** cristal con leve tinte rosado, bisel redondeado y grosor visible. Refracta el fondo y su reflejo se mueve con la cámara. Cámara frontal y barra de estado genéricas (12:00, sin operador). Luz cálida arriba a la izquierda, contorno rosa tenue y sombra de contacto suave.');
L.push('- **Betún:** rosa #F2B9C3 con brillo #FFE8EC y sombra #C47A88. Mide 9 px al escribir y 6 px en bordes y subrayados, con volumen (perfil redondo), brillo húmedo y las 6 estrías de la boquilla. Cuando pasa sobre la pantalla sigue la perspectiva del celular.');
L.push('- **Toques:** círculo de contacto de 44 px de interfaz (blanco al 35 %) sobre la onda y el estado presionado reales de la página.');
L.push('- **Cristal:** blur de 28 a 40 px de lo que hay detrás, saturación 140 %, borde de 1 px y ruido del 2 % (barra, celular, placa de la end card y cantos de las reseñas).');
L.push('- **Fotos:** las de Instagram nunca pasan de 400 px de ancho en cuadro; las de su ficha, de 600; push-in a la portada hasta 2.0×; letrero AG a 340 px. Los push-in largos se hacen sobre texto.');
L.push('- **Render:** función determinista frame(t) compartida y supermuestreo temporal de 8 subcuadros para el motion blur.', '');

L.push('## Voz', '');
L.push('Toma única de ElevenLabs (voz «Hope», eleven v4). La transcripción sin guion previo coincide palabra por palabra; «Ana Gaby» se oye «Ana Gabi». Las 7 frases caben en su ventana con estos ajustes: se recorta la respiración del inicio de la L1 y la pausa interna de la L7 baja de 0.40 a 0.28 s. En la fase 3 se procesa y se deja en −16 LUFS.', '');
L.push('| # | Entra | Termina | Dura | Frase |', '|---|---|---|---|---|');
voz.forEach((v) => L.push(`| ${v.id} | f${v.f} · ${s(v.f)} s | f${v.termina_f} · ${s(v.termina_f)} s | ${v.dur.toFixed(2)} s | ${v.texto} |`));
L.push('', '**Cuadro de cada palabra**', '');
voz.forEach((v) => L.push(`- **${v.id}:** ${v.palabras.map((w) => `${w.w} f${w.f}`).join(' · ')}`));
L.push('');

L.push('## Línea de tiempo', '');
L.push('En cuadros a 60 fps. Pistas: Cámara, Celular, Pantalla (captura real de la página), 3D (piezas que salen de la pantalla), Betún, Tipo, 2D, Voz y Música.', '');
for (const sec of secciones) {
  L.push(`### ${sec.nombre} · f${sec.f}–f${sec.fin} (${s(sec.f)}–${s(sec.fin + 1)} s)`, '');
  L.push(`*Música: ${sec.musica}.*`, '');
  const filas = [];
  eventos.filter((e) => seccionDe(e.f) === sec.id).forEach((e) => filas.push([e.f, `- **f${e.f}${e.fin ? `–f${e.fin}` : ''} · ${e.p}:** ${e.t}${e.sfx.length ? ` _SFX: ${[...new Set(e.sfx)].map((x) => `${x}${e.sfx.filter((y) => y === x).length > 1 ? ` ×${e.sfx.filter((y) => y === x).length}` : ''}`).join(', ')}._` : ''}`]));
  voz.filter((v) => seccionDe(v.f) === sec.id).forEach((v) => filas.push([v.f, `- **f${v.f}–f${v.termina_f} · Voz:** ${v.id} «${v.texto}»`]));
  tipo.filter((k) => seccionDe(k.palabras[0][1]) === sec.id).forEach((k) => filas.push([k.palabras[0][1] - 0.5, `- **f${k.palabras[0][1]}–f${Math.min(k.sale, FRAMES - 1)} · Tipo:** ${k.palabras.map(([w, f]) => `«${w}» f${f}`).join(' · ')}. ${k.pos}, ${k.px} px. Aterriza en ${k.aterriza}.`]));
  filas.sort((a, b) => a[0] - b[0]).forEach(([, t]) => L.push(t));
  L.push('');
}

L.push('## Kinetic type', '');
L.push('Por glifo: cada letra sube 24 px desde blur 6 px y opacidad 0, con escalonado de 28 ms y resorte suave; sale hacia arriba en 0.26 s. Cada palabra queda asentada en su cuadro. Máximo 4 palabras en pantalla; nunca encima de la interfaz.', '');
L.push('| # | Texto | Entra / aterriza | Sale | Dónde | Tamaño |', '|---|---|---|---|---|---|');
tipo.forEach((k) => L.push(`| ${k.id} | ${k.texto} | ${k.palabras.map(([w, f]) => `${w} f${f}`).join(' · ')} | ${k.sale >= FRAMES ? 'fin' : `f${k.sale}`} | ${k.pos} | ${k.px} px${k.fuente ? ` (${k.fuente})` : ''} |`));
L.push('');

L.push('## Música', '');
L.push('Original en código, 98 BPM, Re mayor: guitarra de nylon y glockenspiel (soundfont FluidR3 GM, licencia MIT) con percusión de cucharas; una capa nueva por sección. Debajo de cada palabra de la voz la música va al menos 12 dB más baja.', '');
L.push('| Cuadro | Compás | Acorde | Capas |', '|---|---|---|---|');
musica.forEach((m) => L.push(`| f${m.f} · ${s(m.f)} s | ${m.compas} | ${m.acorde} | ${m.capas} |`));
L.push('');

L.push('## Sonido', '');
L.push(`${cues.length} cues, uno por cada movimiento visible, sintetizados en código (no hay biblioteca de SFX en assets/). Mezcla: voz alrededor de −16 LUFS, música al menos 12 dB debajo de cada palabra, master −14 LUFS / −1.25 dBTP.`, '');
const porId = sfxLib.map((id) => `${id} ×${cues.filter((c) => c.id === id).length}`);
L.push(`Biblioteca: ${porId.join(' · ')}.`, '');

L.push('## Re-layout 1:1 (1080 × 1080)', '');
L.push('- Misma línea de tiempo, voz, música y cues; cambia la composición.');
L.push('- Celular al 86 % del alto (929 px), a la izquierda (x 60–490) cuando hay texto; el kinetic type va en la columna derecha (x 530–1020) a 52 px.');
L.push('- Hook: barra de 820 × 124 px centrada. A tu medida: foto arriba a la derecha (240 × 300 px), pastel 3D abajo a la derecha y el texto en la franja de abajo (y 900–1040), con el celular corrido a la izquierda.');
L.push('- End card: nombre en y 300, placa de 300 px en y 380–680, «Así se vería tu página · Elevate Negocios» en y 760 y línea legal en y 1000.', '');

L.push('## Siguiente', '');
L.push('- Fase 3: cortar la toma, recortar la respiración y la pausa de la L7, procesar la voz (−16 LUFS) y entregar un preview con la voz en su lugar sobre un pulso de 98 BPM.');
L.push('- Fase 4: prueba de estilo de 3 a 5 s (celular 3D con la portada real y una tarjeta saliendo al espacio 3D).');
fs.writeFileSync(path.join(OUT, 'brief_fase2.md'), L.join('\n') + '\n');

console.log(`✔ brief/timeline.json: ${eventos.length} eventos, ${cues.length} cues, ${tipo.length} bloques de texto, ${voz.length} frases`);
console.log(`✔ brief/brief_fase2.md`);
// Comprobaciones
const errores = [];
voz.forEach((v, i) => { const sig = voz[i + 1]; if (sig && v.termina_f >= sig.f) errores.push(`${v.id} se encima con ${sig.id}`); });
if (voz.at(-1).termina_f > FRAMES - 20) errores.push('La L7 termina sin aire');
tipo.forEach((k) => { const n = k.texto.replace(/[·/.]/g, ' ').split(/\s+/).filter(Boolean).length; if (k.id !== 'K7' && n > 4) errores.push(`${k.id} tiene ${n} palabras`); });
if (cues.length < 70) errores.push(`Solo ${cues.length} cues`);
cues.forEach((c) => { if (c.f < 0 || c.f >= FRAMES) errores.push(`cue fuera de rango ${c.id} f${c.f}`); });
console.log(errores.length ? `✘ ${errores.join(' | ')}` : '✔ sin encimes de voz, L7 con aire, máx. 4 palabras por bloque, ≥ 70 cues');
