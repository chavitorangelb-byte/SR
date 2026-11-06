// Silueta del pastel de referencia (para que el betún la trace sobre la foto que sale del celular).
// Renderiza el mismo pastel con la misma cámara en blanco sobre negro y saca el contorno exterior.
// Salida: assets/pastel_contorno.json (px de la imagen de 1080 x 1350, y hacia abajo) + imagen de control.
// Uso: node tools/pastel_contorno.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { servir } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { srv, url } = await servir(ROOT);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await p.goto(`${url}/3d/referencia.html?w=1080&h=1350&dpr=1&mascara=1`);
await p.waitForFunction(() => window.LISTO === true, null, { timeout: 120000 });
const png = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
await b.close(); srv.close();
const tmp = path.join(ROOT, 'video', 'build', '_mascara_pastel.png');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, Buffer.from(png.split(',')[1], 'base64'));
const sal = path.join(ROOT, 'assets', 'pastel_contorno.json');
const control = path.join(ROOT, 'review', 'fase5', 'control_contorno_pastel.jpg');
execFileSync('python3', ['-I', '-c', `
import json, numpy as np
from PIL import Image, ImageDraw
from skimage import measure, morphology
m = np.asarray(Image.open(${JSON.stringify(tmp)}).convert('L')) > 128
m = morphology.closing(morphology.opening(m, morphology.disk(6)), morphology.disk(3))  # sin tallos (muy delgados para el betún), perlas juntas
c = max(measure.find_contours(m.astype(float), 0.5), key=len)  # el contorno exterior es el más largo
pts = [(float(x), float(y)) for y, x in c]
def rdp(p, e):
    if len(p) < 3: return p
    a, b = np.array(p[0]), np.array(p[-1]); ab = b - a; n = np.linalg.norm(ab) or 1
    d = [abs(ab[0]*(q[1]-a[1]) - ab[1]*(q[0]-a[0]))/n for q in p[1:-1]]
    i = int(np.argmax(d)) + 1
    return rdp(p[:i+1], e)[:-1] + rdp(p[i:], e) if d[i-1] > e else [p[0], p[-1]]
if pts[0] == pts[-1]: pts = pts[:-1]
k = max(range(len(pts)), key=lambda i: (pts[i][0]-pts[0][0])**2 + (pts[i][1]-pts[0][1])**2)
pts = rdp(pts[:k+1], 1.2)[:-1] + rdp(pts[k:] + [pts[0]], 1.2)[:-1]  # contorno cerrado: se simplifica en dos mitades
# Empieza arriba a la izquierda del piso de arriba y va en sentido horario (como se trazaría a mano).
ys = [y for _, y in pts]; cy = (min(ys) + max(ys)) / 2
i0 = min(range(len(pts)), key=lambda i: (pts[i][0] - 400) ** 2 + (pts[i][1] - (min(ys) + 120)) ** 2)
pts = pts[i0:] + pts[:i0]
area = sum(pts[i][0]*pts[i-1][1] - pts[i-1][0]*pts[i][1] for i in range(len(pts)))
if area < 0: pts = pts[::-1]
json.dump({'imagen': [1080, 1350], 'puntos': [[round(x, 1), round(y, 1)] for x, y in pts]}, open(${JSON.stringify(sal)}, 'w'))
im = Image.open(${JSON.stringify(path.join(ROOT, 'assets', 'pastel_referencia_ilustrado.jpg'))}).convert('RGB')
d = ImageDraw.Draw(im); d.line(pts + [pts[0]], fill=(242, 130, 160), width=5)
im.thumbnail((540, 675)); im.save(${JSON.stringify(control)}, quality=88)
print(len(pts), 'puntos')
`], { stdio: 'inherit' });
console.log(`✔ ${path.relative(ROOT, sal)}`);
