// Línea de tiempo de DeliciArte (fuente única para el render, los SFX y la música).
// 60 fps, 120 BPM: 1 tiempo = 30 cuadros, 1 compás = 120 cuadros. 16 s + 2 s de end card = 1080 cuadros.
// Los cuadros de las palabras de la voz salen de voz.json (fase 3); mientras no exista se usan los planeados.

export const FPS = 60;
export const BPM = 120;
export const BEAT = 30;
export const FRAMES = 1080;
export const END = 960;

export const SECCIONES = [
  { id: 'golpe', f: 0, fin: 29, nombre: 'Golpe: la línea cruza y se corta' },
  { id: 'da', f: 30, fin: 119, nombre: 'La línea escribe la DA · SABOR / inigualable' },
  { id: 'logo', f: 120, fin: 209, nombre: 'DA → círculo del logo → rosetas → pantalla del celular' },
  { id: 'tarjetas', f: 210, fin: 359, nombre: 'Celular de cristal y tres tarjetas isométricas · A TU GUSTO' },
  { id: 'parallax', f: 360, fin: 479, nombre: 'Parallax 06 y 02 · DISEÑOS ÚNICOS / tu celebración' },
  { id: 'pagina', f: 480, fin: 599, nombre: 'Todo entra al celular: su página · TU PROPIA / PÁGINA' },
  { id: 'postres', f: 600, fin: 719, nombre: 'Chips del catálogo y muro de postres · CADA ANTOJO' },
  { id: 'whatsapp', f: 720, fin: 839, nombre: 'Botón de cristal PIDE POR WHATSAPP, la línea es el subrayado' },
  { id: 'cierre', f: 840, fin: 959, nombre: 'El celular se cierra al círculo del logo · DeliciArte / Pastelería' },
  { id: 'end', f: 960, fin: 1079, nombre: 'End card de Elevate' },
];

// Voz planeada (inicio de cada frase en cuadros). voz.json la reemplaza con la toma real.
export const VOZ = [
  { id: 'L1', f: 30, texto: 'Sabor inigualable en cada pastel.', palabras: { Sabor: 30, inigualable: 54, pastel: 100 } },
  { id: 'L2', f: 180, texto: 'Pasteles personalizados, a tu gusto.', palabras: { Pasteles: 180, personalizados: 214, a: 282, gusto: 300 } },
  { id: 'L3', f: 360, texto: 'Diseños únicos para tu celebración.', palabras: { Diseños: 360, únicos: 392, celebración: 438 } },
  { id: 'L4', f: 492, texto: 'Imagina todo esto en tu propia página.', palabras: { Imagina: 492, propia: 576, página: 596 } },
  { id: 'L5', f: 624, texto: 'Y postres para cada antojo.', palabras: { postres: 634, cada: 668, antojo: 684 } },
  { id: 'L6', f: 744, texto: 'Pide por WhatsApp.', palabras: { Pide: 744, WhatsApp: 774 } },
  { id: 'L7', f: 864, texto: 'DeliciArte. Pastelería.', palabras: { DeliciArte: 864, Pastelería: 912 } },
  { id: 'L8', f: 978, texto: 'Tu página, desde mil pesos.', palabras: { página: 984, mil: 1030 } },
];

// Eventos visuales con nombre (el render los usa y los SFX se amarran a ellos).
export const EV = {
  golpe: 0, corte: 24,
  daD: [34, 92], daA: [48, 100],
  saborSale: 112,
  aCirculo: [120, 146], logoAbre: [140, 168], aRosetas: [166, 192], revela02: [184, 212], celularForma: [196, 222],
  iso: [206, 246],
  tarjeta: [240, 270, 300], // estampado de 01, 03, 05 (kicks)
  aParallax: [336, 380],
  liston06: [372, 402], liston02: [408, 436],
  aPagina: [474, 528],
  chips: [606, 612, 618], lineaChips: [612, 652], chipPostres: 640,
  muro: [648, 700],
  boton: [720, 752], subrayado: [740, 762], pulsos: [750, 780, 810], toque: 780,
  aCierre: [836, 884], logoCierre: [872, 900],
  endCorte: 960, endTextos: [966, 974, 990, 1006, 1016], endSubrayado: [992, 1014],
};

// Kinetic type: cada palabra aterriza en su palabra de la voz (máximo 3 o 4 palabras en pantalla).
export const KINETIC = [
  { id: 'sabor', texto: 'SABOR', estilo: 'sans', voz: ['L1', 'Sabor'], sale: 112 },
  { id: 'inigualable', texto: 'inigualable', estilo: 'script', voz: ['L1', 'inigualable'], sale: 116 },
  { id: 'gusto', texto: 'A TU GUSTO', estilo: 'sans', voz: ['L2', 'a'], sale: 352 },
  { id: 'disenos', texto: 'DISEÑOS ÚNICOS', estilo: 'sans', voz: ['L3', 'Diseños'], sale: 424 },
  { id: 'celebracion', texto: 'tu celebración', estilo: 'script', voz: ['L3', 'celebración'], sale: 478 },
  { id: 'propia', texto: 'TU PROPIA', estilo: 'sans', voz: ['L4', 'propia'], sale: 598 },
  { id: 'paginaK', texto: 'PÁGINA', estilo: 'sans', voz: ['L4', 'página'], sale: 598 },
  { id: 'antojo', texto: 'CADA ANTOJO', estilo: 'sans', voz: ['L5', 'cada'], sale: 708 },
  { id: 'marca', texto: 'DeliciArte', estilo: 'marca', voz: ['L7', 'DeliciArte'], sale: 958 },
  { id: 'pasteleria', texto: 'PASTELERÍA', estilo: 'caps', voz: ['L7', 'Pastelería'], sale: 958 },
];
