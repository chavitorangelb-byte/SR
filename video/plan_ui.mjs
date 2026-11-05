// Guion de la interfaz: qué se hace en la página real y en qué cuadro (60 fps, cuadros del video).
// La captura (video/captura.mjs) ejecuta esto sobre web/index.html con reloj virtual.

export const PANTALLA = { ancho: 390, alto: 880, barraEstado: 47 }; // pantalla del celular en px CSS
export const VIEWPORT = { width: PANTALLA.ancho, height: PANTALLA.alto - PANTALLA.barraEstado }; // 390 × 833
export const FECHA = '2026-11-05T12:00:00-06:00'; // "hoy" dentro de la página (calendario de noviembre 2026)

export const TRIO = ['rosas-rojas', 'caja-de-tulipanes', 'girasoles'];

export const PLAN = [
  // Se enciende la pantalla: arranca el reloj virtual y la entrada real de la portada.
  { f: 196, tipo: 'encender' },
  // Dedo arrastra y suelta: scroll con inercia hasta ver las filas 2 y 3 del catálogo con el precio de la fila 1 arriba.
  { f: 288, tipo: 'scroll', destino: 'catalogo-trio', dur: 64, dedo: { x: 205, y: 640, arrastre: 14, dy: -170 } },
  // Texturas de las tres tarjetas justo antes de que salgan al 3D.
  { f: 357, tipo: 'texturas', cards: TRIO },
  { f: 358, tipo: 'ocultar', cards: TRIO },
  { f: 448, tipo: 'mostrar', cards: TRIO },
];
