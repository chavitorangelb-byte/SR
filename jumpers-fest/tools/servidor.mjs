// Servidor estático mínimo para probar web/ por http (las fuentes no cargan por file:// con crossorigin).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Chromium sin pantalla: con SwiftShader por ANGLE el cristal (backdrop-filter) se desenfoca bien a 2× y 3×;
// con el modo por defecto el texto de atrás sale nítido encima del desenfoque.
export const LANZAR = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

const MIME = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
export function servir(raiz, puerto = 0) {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path.join(raiz, rel.endsWith('/') ? rel + 'index.html' : rel);
      if (!file.startsWith(raiz) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('no'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(puerto, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}/`, cerrar: () => srv.close() }));
  });
}
