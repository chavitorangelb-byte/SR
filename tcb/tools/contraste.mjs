// Contraste WCAG de los pares de color del demo.  node tools/contraste.mjs
// Normal = texto menor a 24 px (o 18.66 px en negrita): pide 4.5. Grande: pide 3.
const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mezcla = (arriba, alfa, abajo) => arriba.map((c, i) => c * alfa + abajo[i] * (1 - alfa));
const lum = (rgb) => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const razon = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const K = hex('#141414'), Y = hex('#FBC21B'), W = hex('#FFFFFF'), P = hex('#FAF8F2'), S = hex('#E2531B'), ST = hex('#B83A0C'), K2 = hex('#1E1E1E');
const vidrioSobreAmarillo = mezcla(K, .72, Y), vidrioSobreSalsa = mezcla(K, .72, S);   // peor caso detrás del panel del menú
const navSobreAmarillo = mezcla(K, .6, Y), navSobrePapel = mezcla(K, .6, P);
const pares = [
  ['Texto blanco sobre negro', W, K, 4.5],
  ['Texto secundario (blanco 76%) sobre negro', mezcla(W, .76, K), K, 4.5],
  ['Amarillo sobre negro (precios, CHEESE)', Y, K, 4.5],
  ['Negro sobre amarillo (botones, feed, oferta)', K, Y, 4.5],
  ['Texto secundario (negro 80%) sobre amarillo', mezcla(K, .8, Y), Y, 4.5],
  ['Negro sobre papel (cómo llegar)', K, P, 4.5],
  ['Texto secundario (negro 80%) sobre papel', mezcla(K, .8, P), P, 4.5],
  ['Vidrio, peor caso amarillo: texto blanco', W, vidrioSobreAmarillo, 4.5],
  ['Vidrio, peor caso amarillo: texto secundario', mezcla(W, .76, vidrioSobreAmarillo), vidrioSobreAmarillo, 4.5],
  ['Vidrio, peor caso amarillo: botón "Agregar" amarillo', Y, vidrioSobreAmarillo, 4.5],
  ['Vidrio, peor caso salsa: texto secundario', mezcla(W, .76, vidrioSobreSalsa), vidrioSobreSalsa, 4.5],
  ['Sello blanco sobre salsa oscura', W, ST, 4.5],
  ['Nav: blanco sobre vidrio encima de amarillo', W, navSobreAmarillo, 4.5],
  ['Nav: blanco sobre vidrio encima de papel', W, navSobrePapel, 4.5],
  ['Gis rosa sobre negro (reseña)', hex('#FF9CC2'), K, 4.5],
  ['Gis azul sobre negro (reseña)', hex('#7FD6F2'), K, 4.5],
  ['Ruta "app" (blanco 62%) sobre negro', mezcla(W, .62, K), K, 4.5],
  ['Placeholder (blanco 62%) en campos', mezcla(W, .62, mezcla(W, .06, K2)), mezcla(W, .06, K2), 4.5],
  ['Burbuja de WhatsApp: texto claro sobre verde', hex('#EAF7F0'), hex('#0E3B2E'), 4.5],
  ['Video: blanco sobre salsa (solo titulares grandes)', W, S, 3],
];
let mal = 0;
for (const [n, a, b, min] of pares) { const r = razon(a, b), ok = r >= min; if (!ok) mal++; console.log(`${ok ? 'OK   ' : 'FALLA'} ${r.toFixed(2).padStart(5)} : 1  (mín ${min})  ${n}`); }
console.log(mal ? `\n${mal} pares por debajo de AA` : `\n${pares.length}/${pares.length} pares cumplen AA`);
process.exit(mal ? 1 : 0);
