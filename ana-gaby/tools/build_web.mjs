// Genera dist/: la página en un solo archivo (fotos y fuentes incrustadas), lista para abrir o subir.
//   dist/ana-gaby-reposteria.html       → página real (el botón final abre WhatsApp a 449 406 3325)
//   dist/ana-gaby-reposteria-demo.html  → modo demo: muestra el mensaje y no le escribe al negocio
// Uso: node tools/build_web.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });

const MIME = { '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
let html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
const usados = new Set();
html = html.replace(/(?<=["'(])((?:img|fonts)\/[\w.-]+\.(?:jpg|png|woff2))(?=["')])/g, (ruta) => {
  usados.add(ruta);
  const b64 = fs.readFileSync(path.join(WEB, ruta)).toString('base64');
  return `data:${MIME[path.extname(ruta)]};base64,${b64}`;
});
if (/(?<=["'(])(?:img|fonts)\//.test(html)) throw new Error('Quedó una ruta sin incrustar');

const real = path.join(DIST, 'ana-gaby-reposteria.html');
fs.writeFileSync(real, html);
const demo = html.replace("const DEMO = params.has('demo');", 'const DEMO = true; // archivo de demostración');
if (demo === html) throw new Error('No se pudo activar el modo demo');
fs.writeFileSync(path.join(DIST, 'ana-gaby-reposteria-demo.html'), demo);
const kb = (f) => `${Math.round(fs.statSync(f).size / 1024)} KB`;
console.log(`${usados.size} archivos incrustados → ${path.relative(ROOT, real)} (${kb(real)}) y versión demo`);
