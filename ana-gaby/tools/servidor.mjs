// Servidor estático mínimo para pruebas y capturas (sin dependencias).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp',
};

export function servir(raiz, puerto = 0) {
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.normalize(path.join(raiz, url));
    if (!f.startsWith(path.normalize(raiz))) { res.writeHead(403).end(); return; }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404).end('no'); return; }
      res.writeHead(200, { 'content-type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((ok) => srv.listen(puerto, '127.0.0.1', () => ok({ srv, url: `http://127.0.0.1:${srv.address().port}` })));
}
