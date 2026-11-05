// Guion de la interfaz: qué se hace en la página real y en qué cuadro (60 fps, cuadros del video).
// La captura (video/captura.mjs) lo ejecuta sobre web/index.html con reloj virtual.
// Los cuadros coinciden con brief/timeline.json (taps y SFX).

export const PANTALLA = { ancho: 390, alto: 880, barraEstado: 47 }; // pantalla del celular en px CSS
export const VIEWPORT = { width: PANTALLA.ancho, height: PANTALLA.alto - PANTALLA.barraEstado }; // 390 × 833
export const FECHA = '2026-11-05T12:00:00-06:00'; // "hoy" dentro de la página (calendario de noviembre 2026)
export const ULTIMO = 1470; // después de esto el celular ya no se ve

export const TRIO = ['rosas-rojas', 'caja-de-tulipanes', 'girasoles'];
export const RESENAS = ['1', '3', '4'];
const trioSel = TRIO.map((id) => `.card[data-id="${id}"]`);
const resSel = RESENAS.map((n) => `.review[data-review="${n}"]`);

export const PLAN = [
  { f: 196, tipo: 'encender' },
  // Catálogo
  { f: 288, tipo: 'scroll', destino: 'catalogo-trio', dur: 64, dedo: { x: 205, y: 640, arrastre: 14 } },
  { f: 357, tipo: 'texturas', items: TRIO.map((id, i) => ({ id, sel: trioSel[i], partes: { tallas: '.card-sizes' } })) },
  { f: 358, tipo: 'ocultar', sel: trioSel },
  { f: 448, tipo: 'mostrar', sel: trioSel },
  { f: 450, tipo: 'rect', nombre: 'precio820', sel: '.card[data-id="tulipanes-y-rosas"] .price' },
  { f: 470, tipo: 'tap', sel: '[data-filter="tulipanes"]' },
  { f: 522, tipo: 'tap', sel: '[data-filter="ramos"]' },
  { f: 552, tipo: 'rect', nombre: 'tarjeta820', sel: '.card[data-id="tulipanes-y-rosas"]' },
  // Pedido
  { f: 576, tipo: 'tap', sel: '.card[data-id="tulipanes-y-rosas"] .card-media' },
  { f: 618, tipo: 'tap', sel: '[data-seg="size"] [data-value="M"]' },
  { f: 644, tipo: 'tap', sel: '#next' },
  { f: 676, tipo: 'tap', sel: '[data-seg="mode"] [data-value="domicilio"]' },
  { f: 694, tipo: 'tap', sel: '[data-seg="mode"] [data-value="pickup"]' },
  { f: 712, tipo: 'tap', sel: '#dateBtn' },
  { f: 734, tipo: 'tap', sel: '#calGrid [data-date="2026-11-07"]' },
  { f: 778, tipo: 'tap', sel: '#msg', teclado: 'subir' },
  { f: 802, tipo: 'rect', nombre: 'mensaje', sel: '#msg' },
  { f: 794, tipo: 'tipear', texto: 'Feliz cum', dur: 28, sel: '#msg' },
  { f: 826, tipo: 'tap', sel: '#kb-sug-1' },
  { f: 840, tipo: 'tap', sel: '#next', teclado: 'bajar' },
  { f: 872, tipo: 'rect', nombre: 'anticipo', sel: '.deposit strong' },
  { f: 884, tipo: 'rect', nombre: 'enviar', sel: '#send' },
  { f: 891, tipo: 'texturas', items: [{ id: 'enviar', sel: '#send' }] },
  { f: 892, tipo: 'ocultar', sel: ['#send'] },
  { f: 914, tipo: 'mostrar', sel: ['#send'] },
  { f: 916, tipo: 'swipe', sel: '.grabber', dy: 200, dur: 9 },
  // Confianza
  { f: 950, tipo: 'scroll', destino: 'como-funciona', dur: 36, dedo: { x: 200, y: 660, arrastre: 8 } },
  { f: 986, tipo: 'rect', nombre: 'entrega', sel: '#como-funciona .how-item:nth-child(1) h3' },
  { f: 1004, tipo: 'scroll', destino: 'pick-up', dur: 16, dedo: { x: 210, y: 620, arrastre: 6 } },
  { f: 1020, tipo: 'rect', nombre: 'pickup', sel: '#como-funciona .how-item:nth-child(2) h3' },
  { f: 1034, tipo: 'scroll', destino: 'resenas', dur: 26, dedo: { x: 200, y: 650, arrastre: 8 } },
  { f: 1060, tipo: 'carrusel', indice: 1, dur: 18 },
  { f: 1079, tipo: 'texturas', items: RESENAS.map((n, i) => ({ id: `resena${n}`, sel: resSel[i], carrusel: true, frase: n === '3' ? 'las flores llegaron frescas' : null })) },
  { f: 1080, tipo: 'ocultar', sel: resSel },
  { f: 1182, tipo: 'mostrar', sel: resSel },
  // Cierre
  { f: 1184, tipo: 'scroll', destino: 'pie', dur: 40, rebote: 64 },
];
