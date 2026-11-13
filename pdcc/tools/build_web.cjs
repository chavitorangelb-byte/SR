// Genera dist/: la misma página en un solo archivo (fotos y fuentes incrustadas). Uso: node tools/build_web.cjs
const fs = require('fs'), path = require('path'); const ROOT = path.resolve(__dirname, '..'), WEB = path.join(ROOT, 'web'), DIST = path.join(ROOT, 'dist'); fs.mkdirSync(DIST, { recursive: true });
const MIME = { '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const uri = rel => `data:${MIME[path.extname(rel)]};base64,${fs.readFileSync(path.join(WEB, rel)).toString('base64')}`;
let h = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
h = h.replace(/<link rel="preload"[^>]+>\n?/g, '').replace(/url\((fonts\/[\w.-]+)\)/g, (_, r) => `url(${uri(r)})`).replace(/src="(img\/[\w.-]+)"/g, (_, r) => `src="${uri(r)}"`);
if (/(src|href)="(img|fonts)\//.test(h) || /url\(fonts\//.test(h)) throw new Error('Quedaron rutas sin incrustar');
fs.writeFileSync(path.join(DIST, 'pro-detailing.html'), h);
const d = h.replace("const DEMO = new URLSearchParams(location.search).has('demo');", 'const DEMO = true;'); if (d === h) throw new Error('No se pudo fijar el modo demo');
fs.writeFileSync(path.join(DIST, 'pro-detailing-demo.html'), d);
for (const f of fs.readdirSync(DIST)) console.log(f, (fs.statSync(path.join(DIST, f)).size / 1024).toFixed(0) + ' KB');
