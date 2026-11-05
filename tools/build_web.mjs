// Genera dist/floreria-roma.html: la misma página en un solo archivo (fotos y fuentes incrustadas),
// para mandarla por WhatsApp o abrirla en cualquier celular sin servidor.
// Uso: node tools/build_web.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });

const MIME = { '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const cache = new Map();
const dataUri = (rel) => {
  if (!cache.has(rel)) {
    const file = path.join(WEB, rel);
    cache.set(rel, `data:${MIME[path.extname(file)]};base64,${fs.readFileSync(file).toString('base64')}`);
  }
  return cache.get(rel);
};

let html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
// Las precargas de fuentes no hacen falta: van incrustadas.
html = html.replace(/<link rel="preload"[^>]+fonts\/[^>]+>\n?/g, '');
html = html.replace(/url\((fonts\/[\w.-]+\.woff2)\)/g, (_, rel) => `url(${dataUri(rel)})`);
html = html.replace(/(["'(])(img\/[\w.-]+\.(?:jpg|png))(["')])/g, (_, a, rel, b) => `${a}${dataUri(rel)}${b}`);

const left = html.match(/(?:src|href)="(?:img|fonts)\/[^"]+"|'img\/[^']+'/g);
if (left) throw new Error(`Quedaron rutas sin incrustar: ${left.join(', ')}`);

const out = path.join(DIST, 'floreria-roma.html');
fs.writeFileSync(out, html);
console.log(`${path.relative(ROOT, out)} · ${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} MB · ${cache.size} recursos incrustados`);

// Copia para probar en el celular: el botón final muestra el mensaje y no abre el chat de Roma.
const DEMO_FLAG = "const DEMO = params.has('demo');";
if (!html.includes(DEMO_FLAG)) throw new Error('No encontré el interruptor de modo demo');
const demo = path.join(DIST, 'floreria-roma-demo.html');
fs.writeFileSync(demo, html.replace(DEMO_FLAG, 'const DEMO = true;'));
console.log(path.relative(ROOT, demo));
