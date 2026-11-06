// Recorrido de la fase 0 (60 fps): lo que hace un cliente en la página real, cuadro por cuadro.
// En la fase 5 se reemplaza por el guion bloqueado a la voz (mismas acciones, otros cuadros).
export const VIEWPORT = { width: 390, height: 844 };
export const FECHA = '2026-11-06T12:00:00-06:00'; // "hoy" dentro de la página: viernes 6 de noviembre de 2026
export const QUERY = '?demo=1'; // el botón final muestra el mensaje en vez de abrir WhatsApp

export const PLAN = [
  // Portada: entra sola (logo, arcoíris y foto se inflan)
  { f: 96, tipo: 'scroll', destino: { sel: '#inflables', off: 30 }, dur: 62, dedo: { x: 214, y: 660, arrastre: 14 } },
  { f: 176, tipo: 'scroll', destino: { sel: '.card[data-id="rainbow-jump"]', off: -18 }, dur: 56, dedo: { x: 205, y: 690, arrastre: 12 } },
  { f: 250, tipo: 'tap', sel: '.card[data-id="rainbow-jump"] .card-foto' },
  // Ficha abierta: se lee la descripción de su post
  { f: 352, tipo: 'tap', sel: '#fichaQuiero' },
  // La hoja baja, la página baja a "Aparta tu fecha" y se abre el calendario
  { f: 452, tipo: 'tap', sel: '[data-date="2026-11-21"]' },
  { f: 528, tipo: 'tap', sel: '#lugar', teclado: true, subir: '#lugar' },
  { f: 552, tipo: 'tipear', sel: '#lugar', texto: 'Jardines de la Asunción', dur: 100 },
  { f: 652, tipo: 'subir', sel: '#hora' },
  { f: 680, tipo: 'tap', sel: '#hora' },
  { f: 698, tipo: 'tipear', sel: '#hora', texto: '4:00 pm', dur: 40 },
  { f: 752, tipo: 'tecla', ch: '\n', teclado: false },
  { f: 782, tipo: 'tap', sel: '[data-evento="Cumpleaños"]' },
  { f: 822, tipo: 'scroll', destino: { sel: '#enviar', alinear: 'abajo', off: 70 }, dur: 58, dedo: { x: 205, y: 640, arrastre: 12 } },
  { f: 894, tipo: 'tap', sel: '#enviar' },
  // Mensaje listo
  { f: 1010, tipo: 'tap', sel: '#listo .hoja-x' },
  { f: 1050, tipo: 'scroll', destino: { sel: '#fiesta', off: 30 }, dur: 64, dedo: { x: 214, y: 680, arrastre: 14 } },
  { f: 1150, tipo: 'scroll', destino: { sel: '#como-funciona', off: 30 }, dur: 64, dedo: { x: 214, y: 680, arrastre: 14 } },
];
export const ULTIMO = 1260;
