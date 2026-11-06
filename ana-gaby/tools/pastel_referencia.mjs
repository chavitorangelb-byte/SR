// Renderiza la "foto de referencia" del paso A tu medida: un pastel genérico ilustrado en código (Three.js).
// Salida: assets/pastel_referencia_ilustrado.jpg (1080x1350, supermuestreo 2x).
// Uso: node tools/pastel_referencia.mjs [--ang=0]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { servir } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ang = (process.argv.find((a) => a.startsWith('--ang=')) || '--ang=0').split('=')[1];
const salida = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] || path.join(ROOT, 'assets', 'pastel_referencia_ilustrado.jpg');

const { srv, url } = await servir(ROOT);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(m.type(), m.text()); });
const t0 = Date.now();
await page.goto(`${url}/3d/referencia.html?w=1080&h=1350&dpr=2&ang=${ang}`);
await page.waitForFunction(() => window.LISTO === true, null, { timeout: 300000 });
const datos = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
const png = salida.replace(/\.jpg$/, '_2x.png');
fs.writeFileSync(png, Buffer.from(datos.split(',')[1], 'base64'));
await browser.close();
srv.close();
execFileSync('python3', ['-I', '-c', `
from PIL import Image
im = Image.open(${JSON.stringify(png)}).convert('RGB')
im = im.resize((1080, 1350), Image.LANCZOS)
im.save(${JSON.stringify(salida)}, 'JPEG', quality=92, subsampling=0, optimize=True, progressive=True)
print(im.size)
`], { stdio: 'inherit' });
fs.unlinkSync(png);
console.log(`listo en ${((Date.now() - t0) / 1000).toFixed(1)} s → ${path.relative(ROOT, salida)}`);
