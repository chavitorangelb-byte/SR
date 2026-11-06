// Plan de la pantalla del celular: qué le pasa a la página real en cada cuadro (acciones, scrolls y medidas).
// Lo usan video/captura.mjs (para capturar la página) y la escena (para saber dónde está cada pieza y dónde va
// cada toque). Cuadros a 60 fps de brief/timeline.json.

export const VIEWPORT = { width: 390, height: 797 }; // 844 de pantalla − 47 de barra de estado
export const BARRA_ESTADO = 47;
export const DSF = 3;

// Inercia de un scroll con el dedo: arranca rápido, frena y rebota un poco al llegar.
export function curvaScroll(f, { f0, dur, desde, hasta, rebote = 14, asentar = 12 }) {
  if (f <= f0) return desde;
  const s = Math.min(1, (f - f0) / dur);
  const dir = Math.sign(hasta - desde) || 1;
  if (s < 1) {
    const p = 1 - (1 - s) ** 4;
    return desde + (hasta + dir * rebote - desde) * p;
  }
  const r = Math.min(1, (f - f0 - dur) / asentar);
  const e = 0.5 - 0.5 * Math.cos(Math.PI * r);
  return hasta + dir * rebote * (1 - e);
}

// Acciones de la página por cuadro.
// tap: toque visible (el círculo lo dibuja la escena) + estado presionado + pointerdown (onda real) y el click 4 cuadros después.
export const ACCIONES = [
  { f: 188, tipo: 'encender' },
  { f: 296, tipo: 'scroll', dur: 40, hasta: { selector: '#catalogo', margen: 20 } },
  { f: 366, tipo: 'scroll', dur: 24, hasta: { selector: '#tabs', margen: 76 }, rebote: 8 },
  { f: 530, tipo: 'tap', selector: '#tab-pasteles' },
  { f: 590, tipo: 'tap', selector: '#tab-medida' },
  { f: 610, tipo: 'tap', selector: '#subir', archivo: 'assets/pastel_referencia_ilustrado.jpg' },
  { f: 676, tipo: 'llamar', fn: 'fotoLista' },
  // La foto regresa a su hueco 838–860; el scroll empieza después, para que no vuele hacia un hueco que se va.
  { f: 862, tipo: 'scroll', dur: 14, hasta: { selector: '#paso-personas', margen: 150 }, rebote: 6 },
  { f: 878, tipo: 'tap', selector: '#personas label:nth-child(3)' },
  { f: 888, tipo: 'tap', selector: '#btn-fecha' },
  { f: 908, tipo: 'tap', selector: '#cal-rejilla .dia[data-d="14"]' },
  { f: 917, tipo: 'tap', selector: '#horas label:first-child' },
  { f: 926, tipo: 'tap', selector: '#fecha-listo' },
  { f: 937, tipo: 'tap', selector: '#mensaje' },
  // Como en un celular real: al enfocar el campo, la página lo sube arriba del teclado.
  { f: 940, tipo: 'scroll', dur: 14, hasta: { selector: '#paso-mensaje', margen: 300 }, rebote: 4 },
  { f: 952, tipo: 'teclear', texto: 'F' },
  { f: 957, tipo: 'teclear', texto: 'e' },
  { f: 962, tipo: 'sugerencia', texto: 'Feliz ' },
  { f: 967, tipo: 'teclear', texto: 'c' },
  { f: 972, tipo: 'teclear', texto: 'u' },
  { f: 977, tipo: 'sugerencia', texto: 'cumpleaños' },
  { f: 981, tipo: 'desenfocar' },
  { f: 986, tipo: 'scroll', dur: 16, hasta: { selector: '#btn-enviar', margen: 470 }, rebote: 6 },
  // Se presiona y se suelta justo en «mensaje» (f1012): la hoja del mensaje sube con la palabra.
  { f: 1006, tipo: 'presionar', selector: '#btn-enviar' },
  { f: 1014, tipo: 'soltar', selector: '#btn-enviar' },
  { f: 1112, tipo: 'tap', selector: '#hoja-mensaje [data-cerrar]' },
  { f: 1134, tipo: 'scroll', dur: 26, hasta: { selector: '#resenas', margen: 64 } },
  { f: 1180, tipo: 'carrusel', a: 1, dur: 14 },
  { f: 1196, tipo: 'carrusel', a: 2, dur: 14 },
  { f: 1274, tipo: 'carrusel', a: 0, dur: 16 },
  // el scroll al mapa empieza cuando las reseñas del abanico ya regresaron (1276–1292)
  { f: 1294, tipo: 'scroll', dur: 16, hasta: { selector: '#mapa', margen: 96 }, rebote: 8 },
  { f: 1298, tipo: 'visible', selector: '#mapa' },
];

// Qué piezas medir en cada cuadro (rectángulos en px CSS del viewport de la página).
export const MEDIR = {
  chip: '.chip-google',
  tarjetas: '#panel-galletas .tarjeta',
  tabs: '#tabs',
  vista: '#vista',
  fecha: '#btn-fecha',
  mensaje: '#mensaje',
  enviar: '#btn-enviar',
  hoja: '#hoja-mensaje',
  burbuja: '#hm-burbuja',
  resenas: '.resena',
  carrusel: '#carrusel',
  mapa: '#mapa',
  pin: '.pin-onda',
  horario: '#horario h3',
};

// Frases que el betún subraya: [clave, selector del contenedor, texto exacto].
export const TEXTOS = [
  ['frase_mensaje', '#hm-burbuja', 'te mando la foto en este chat.'],
  ['frase_resena', '.resena:first-child blockquote', 'como la imagen que solicites'],
];
