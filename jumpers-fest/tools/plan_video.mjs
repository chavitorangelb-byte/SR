// Guion de la interfaz para el video (60 fps, cuadros del video): lo que se hace en la página real y en qué cuadro.
// Sigue brief/linea.mjs. La captura (tools/captura.mjs --plan plan_video) lo ejecuta con reloj virtual a 3×.
export const VIEWPORT = { width: 390, height: 844 };
export const FECHA = '2026-11-06T12:00:00-06:00';
export const QUERY = '?demo=1';
export const ENCENDER = 196; // se enciende la pantalla: la página carga y corre su propia entrada

const card = (id) => `.card[data-id="${id}"]`;
export const PLAN = [
  // ---------- Catálogo ----------
  { f: 257, tipo: 'scroll', destino: { sel: '#inflables', off: 30 }, dur: 58, dedo: { x: 214, y: 660, arrastre: 14 } },
  { f: 321, tipo: 'scroll', destino: { sel: card('rainbow-jump'), alinear: 'centro' }, dur: 32, dedo: { x: 205, y: 700, arrastre: 10 } },
  { f: 353, tipo: 'rect', items: { 'castle-jump': card('castle-jump'), 'rainbow-jump': card('rainbow-jump'), 'magic-jump': card('magic-jump') } },
  // las tarjetas salen al 3D: su lugar queda vacío en la captura; regresan cuando la pieza 3D aterriza
  { f: 354, tipo: 'ocultar', sel: card('castle-jump') },
  { f: 370, tipo: 'ocultar', sel: card('rainbow-jump') },
  { f: 386, tipo: 'ocultar', sel: card('magic-jump') },
  { f: 462, tipo: 'mostrar', sel: card('magic-jump') },
  { f: 470, tipo: 'mostrar', sel: card('castle-jump') },
  { f: 478, tipo: 'mostrar', sel: card('rainbow-jump') },
  { f: 482, tipo: 'tap', sel: card('rainbow-jump') + ' .card-foto' },
  // la descripción sale al 3D desde la ficha
  { f: 512, tipo: 'rect', bcr: true, items: { descripcion: '#fichaDesc', ficha: '#ficha .hoja' } },
  { f: 514, tipo: 'ocultar', sel: '#fichaDesc' },
  { f: 576, tipo: 'mostrar', sel: '#fichaDesc' },
  // ---------- Aparta tu fecha ----------
  { f: 579, tipo: 'tap', sel: '#fichaQuiero' },
  { f: 675, tipo: 'tap', sel: '[data-date="2026-11-21"]' },
  { f: 739, tipo: 'tap', sel: '#lugar', teclado: true, subir: '#lugar' },
  { f: 750, tipo: 'tipear', sel: '#lugar', texto: 'Las Américas', dur: 36 },
  { f: 776, tipo: 'subir', sel: '#hora' },
  { f: 804, tipo: 'tap', sel: '#hora' },
  { f: 810, tipo: 'tipear', sel: '#hora', texto: '4:00 pm', dur: 20 },
  { f: 836, tipo: 'tecla', ch: '\n', teclado: false },
  { f: 840, tipo: 'scroll', destino: { sel: '#enviar', alinear: 'abajo', off: 70 }, dur: 22, dedo: { x: 205, y: 640, arrastre: 10 } },
  { f: 864, tipo: 'rect', bcr: true, items: { burbuja: '#burbuja', boton: '#enviar', lugar: '#lugar' } },
  { f: 868, tipo: 'ocultar', sel: '#enviar' },
  { f: 914, tipo: 'mostrar', sel: '#enviar' },
  // ---------- Arma tu fiesta ----------
  { f: 906, tipo: 'scroll', destino: { sel: '#fiesta', off: 30 }, dur: 50, dedo: { x: 214, y: 680, arrastre: 14 } },
  { f: 1012, tipo: 'rect', bcr: true, items: { postal: '.postal' } },
  { f: 1016, tipo: 'ocultar', sel: '.postal' },
  { f: 1085, tipo: 'mostrar', sel: '.postal' },
  { f: 1093, tipo: 'scroll', destino: { sel: '#como-funciona', off: 30 }, dur: 50, dedo: { x: 214, y: 680, arrastre: 14 } },
  { f: 1145, tipo: 'rect', bcr: true, items: { pasos: '.pasos' } },
  // ---------- Cierre: mientras el celular se aleja, la página baja al pie (logo y contacto) ----------
  { f: 1160, tipo: 'scroll', destino: { sel: '#contacto', alinear: 'abajo', off: 0 }, dur: 60, dedo: { x: 200, y: 600, arrastre: 12 }, sinDedo: true },
];
export const ULTIMO = 1340;
