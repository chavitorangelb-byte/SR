// Plan de la pantalla del celular: qué le pasa a la página real en cada cuadro (acciones y scroll).
// Lo usan video/captura.mjs (para capturar la página) y la escena (para saber dónde está cada pieza).
// Cuadros a 60 fps de brief/timeline.json.

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

// Acciones de la página por cuadro. `scroll.hasta` se resuelve dentro de la página (selector y margen).
export const ACCIONES = [
  { f: 188, tipo: 'encender' },
  { f: 296, tipo: 'scroll', dur: 40, hasta: { selector: '#catalogo', margen: 20 } },
  // Segundo empujón: deja la cuadrícula completa a la vista antes de que salga la tercera tarjeta.
  { f: 366, tipo: 'scroll', dur: 24, hasta: { selector: '#tabs', margen: 76 }, rebote: 8 },
];

// Qué piezas medir en cada cuadro (rectángulos en px CSS del viewport de la página).
export const MEDIR = {
  chip: '.chip-google',
  tarjetas: '#panel-galletas .tarjeta',
  fotos: '#panel-galletas .tarjeta-foto',
  tabs: '#tabs',
  catalogo: '#catalogo',
};
