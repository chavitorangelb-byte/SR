// Línea de tiempo de DeliciArte (fuente única para el render, los SFX y la música).
// 60 fps, 120 BPM: 1 tiempo = 30 cuadros, 1 compás = 120 cuadros.
// Bloqueada a la toma real de la voz (fase 3): 16.5 s + 2.5 s de end card = 1140 cuadros.
// Los cuadros de cada palabra salen de voz/voz.json; los de aquí son la referencia planeada.

export const FPS = 60;
export const BPM = 120;
export const BEAT = 30;
export const FRAMES = 1140;
export const END = 990;

export const SECCIONES = [
  { id: 'golpe', f: 0, fin: 29, nombre: 'Golpe: la línea cruza y se corta' },
  { id: 'da', f: 30, fin: 119, nombre: 'La línea escribe la DA · SABOR / inigualable' },
  { id: 'logo', f: 120, fin: 209, nombre: 'DA → círculo del logo → rosetas → pantalla del celular' },
  { id: 'tarjetas', f: 210, fin: 335, nombre: 'Celular de cristal y tres tarjetas isométricas · A TU GUSTO' },
  { id: 'parallax', f: 336, fin: 489, nombre: 'Parallax 06 y 02 · DISEÑOS ÚNICOS / tu celebración' },
  { id: 'pagina', f: 490, fin: 655, nombre: 'Todo entra al celular: su página · TU PROPIA / PÁGINA' },
  { id: 'postres', f: 656, fin: 775, nombre: 'Chips del catálogo y muro de postres · CADA ANTOJO' },
  { id: 'whatsapp', f: 776, fin: 851, nombre: 'Botón de cristal PIDE POR WHATSAPP, la línea es el subrayado' },
  { id: 'cierre', f: 852, fin: 989, nombre: 'El celular se cierra al círculo del logo · DeliciArte / PASTELERÍA' },
  { id: 'end', f: 990, fin: 1139, nombre: 'End card de Elevate' },
];

// Voz: inicio de cada frase (cuadros) con la toma real; voz.json trae el cuadro medido de cada palabra.
export const VOZ = [
  { id: 'L1', f: 30, texto: 'Sabor inigualable en cada pastel.', palabras: { Sabor: 30, inigualable: 56, pastel: 158 } },
  { id: 'L2', f: 204, texto: 'Pasteles personalizados, a tu gusto.', palabras: { Pasteles: 204, personalizados: 232, a: 298, gusto: 320 } },
  { id: 'L3', f: 354, texto: 'Diseños únicos para tu celebración.', palabras: { Diseños: 354, únicos: 380, celebración: 442 } },
  { id: 'L4', f: 502, texto: 'Imagina todo esto en tu propia página.', palabras: { Imagina: 502, propia: 600, página: 625 } },
  { id: 'L5', f: 667, texto: 'Y postres para cada antojo.', palabras: { postres: 680, cada: 733, antojo: 761 } },
  { id: 'L6', f: 796, texto: 'Pide por WhatsApp.', palabras: { Pide: 796, WhatsApp: 830 } },
  { id: 'L7', f: 862, texto: 'DeliciArte. Pastelería.', palabras: { DeliciArte: 862, Pastelería: 934 } },
  { id: 'L8', f: 990, texto: 'Tu página, desde mil pesos.', palabras: { página: 1000, mil: 1070 } },
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
  aPagina: [490, 544],
  chips: [656, 662, 668], lineaChips: [662, 702], chipPostres: 680,
  muro: [696, 748],
  boton: [776, 808], subrayado: [794, 814], pulsos: [810, 840], toque: 840,
  aCierre: [852, 900], logoCierre: [888, 916],
  endCorte: 990, endTextos: [1006, 1014, 1030, 1044, 1054], endSubrayado: [1030, 1052],
};

// Kinetic type: cada palabra aterriza en su palabra de la voz (máximo 3 o 4 palabras en pantalla).
export const KINETIC = [
  { id: 'sabor', texto: 'SABOR', estilo: 'sans', voz: ['L1', 'Sabor'], sale: 112 },
  { id: 'inigualable', texto: 'inigualable', estilo: 'script', voz: ['L1', 'inigualable'], sale: 116 },
  { id: 'gusto', texto: 'A TU GUSTO', estilo: 'sans', voz: ['L2', 'a'], sale: 338 },
  { id: 'disenos', texto: 'DISEÑOS ÚNICOS', estilo: 'sans', voz: ['L3', 'Diseños'], sale: 428 },
  { id: 'celebracion', texto: 'tu celebración', estilo: 'script', voz: ['L3', 'celebración'], sale: 490 },
  { id: 'propia', texto: 'TU PROPIA', estilo: 'sans', voz: ['L4', 'propia'], sale: 650 },
  { id: 'paginaK', texto: 'PÁGINA', estilo: 'sans', voz: ['L4', 'página'], sale: 650 },
  { id: 'antojo', texto: 'CADA ANTOJO', estilo: 'sans', voz: ['L5', 'cada'], sale: 772 },
  { id: 'marca', texto: 'DeliciArte', estilo: 'marca', voz: ['L7', 'DeliciArte'], sale: 980 },
  { id: 'pasteleria', texto: 'PASTELERÍA', estilo: 'caps', voz: ['L7', 'Pastelería'], sale: 980 },
];
