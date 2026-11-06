// Rasteriza «Ana Gaby Repostería» en Cormorant Garamond Itálica SemiBold y saca su esqueleto con tools/esqueleto.py.
// Salida: video/fuentes/nombre_esqueleto.json (+ una imagen de control en review/fase5/).
// Uso: node tools/esqueleto_nombre.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { servir } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEXTO = 'Ana Gaby Repostería';
const EM = 520, BX = 60, BY = 620;

const { srv, url } = await servir(ROOT);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`${url}/video/render/index.html`);
await p.waitForFunction(() => window.LISTO);
const datos = await p.evaluate(([texto, em, bx, by]) => {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = `italic 600 ${em}px "Cormorant Garamond"`;
  const ancho = Math.ceil(g.measureText(texto).width);
  c.width = ancho + bx * 2; c.height = Math.round(by + em * 0.45);
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.font = `italic 600 ${em}px "Cormorant Garamond"`;
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  g.fillText(texto, bx, by);
  return { png: c.toDataURL('image/png'), ancho_em: ancho / em };
}, [TEXTO, EM, BX, BY]);
await b.close(); srv.close();
const tmp = path.join(ROOT, 'video', 'build', '_nombre.png');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, Buffer.from(datos.png.split(',')[1], 'base64'));
const sal = path.join(ROOT, 'video', 'fuentes', 'nombre_esqueleto.json');
execFileSync('python3', ['-I', path.join(ROOT, 'tools', 'esqueleto.py'), tmp, sal, '--em', String(EM), '--base_x', String(BX), '--base_y', String(BY)], { stdio: 'inherit' });
const j = JSON.parse(fs.readFileSync(sal, 'utf8'));
j.texto = TEXTO; j.ancho_em = datos.ancho_em;
fs.writeFileSync(sal, JSON.stringify(j));
// Imagen de control: el texto en gris y los trazos encima, numerados.
execFileSync('python3', ['-I', '-c', `
import json
from PIL import Image, ImageDraw
im = Image.open(${JSON.stringify(tmp)}).convert('RGB').point(lambda v: v * 0.35)
d = ImageDraw.Draw(im)
j = json.load(open(${JSON.stringify(sal)}))
for k, t in enumerate(j['trazos']):
    pts = [(${BX} + x * ${EM}, ${BY} - y * ${EM}) for x, y in t]
    d.line(pts, fill=(242, 130, 160), width=6)
    d.text(pts[0], str(k), fill=(255, 255, 0))
im.thumbnail((1600, 600))
import os; os.makedirs(${JSON.stringify(path.join(ROOT, 'review', 'fase5'))}, exist_ok=True)
im.save(${JSON.stringify(path.join(ROOT, 'review', 'fase5', 'control_esqueleto_nombre.jpg'))}, quality=88)
`]);
console.log(`✔ ${path.relative(ROOT, sal)} · ancho ${datos.ancho_em.toFixed(3)} em`);
