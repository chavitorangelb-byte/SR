// Guion de la interfaz para el video (60 fps, cuadros del video): lo que se hace en la página real y en qué cuadro.
// Sigue brief/linea.mjs. La captura (tools/captura.mjs --plan plan_video) lo ejecuta con reloj virtual a 3×.
export const VIEWPORT = { width: 390, height: 844 };
export const FECHA = '2026-11-06T12:00:00-06:00';
export const QUERY = '?demo=1';
export const ENCENDER = 196; // se enciende la pantalla: la página carga y corre su propia entrada

const card = (id) => `.card[data-id="${id}"]`;
export const PLAN = [
  // Catálogo
  { f: 257, tipo: 'scroll', destino: { sel: '#inflables', off: 30 }, dur: 58, dedo: { x: 214, y: 660, arrastre: 14 } },
  { f: 321, tipo: 'scroll', destino: { sel: card('rainbow-jump'), alinear: 'centro' }, dur: 32, dedo: { x: 205, y: 700, arrastre: 10 } },
  { f: 353, tipo: 'rect', items: { 'castle-jump': card('castle-jump'), 'rainbow-jump': card('rainbow-jump'), 'magic-jump': card('magic-jump') } },
  // las tarjetas salen al 3D: su lugar queda vacío en la captura
  { f: 354, tipo: 'ocultar', sel: card('castle-jump') },
  { f: 370, tipo: 'ocultar', sel: card('rainbow-jump') },
  { f: 386, tipo: 'ocultar', sel: card('magic-jump') },
  // regresan (la pieza 3D aterriza y la captura vuelve a mostrar la tarjeta)
  { f: 462, tipo: 'mostrar', sel: card('magic-jump') },
  { f: 470, tipo: 'mostrar', sel: card('castle-jump') },
  { f: 478, tipo: 'mostrar', sel: card('rainbow-jump') },
];
export const ULTIMO = 480;
