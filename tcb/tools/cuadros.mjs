// Hoja de cuadros clave del video: node tools/cuadros.mjs v|h "0.5,2,4,..."  [salida.png]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
import { servir } from './shots.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const f = process.argv[2] || 'v', ts = (process.argv[3] || '1,3,5,7,9,11,13,14.5,16,18,19.5,22,25,27.5,29.5,31,33,35.5').split(',').map(Number);
const out = process.argv[4] || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'review', `video-cuadros-${f}.png`);
const [W, H] = f === 'v' ? [1080, 1920] : [1920, 1080], esc = f === 'v' ? 0.25 : 0.25, cols = f === 'v' ? 6 : 3;
const s = await servir(), b = await chromium.launch(), p = await b.newPage({ viewport: { width: W, height: H } }); const err = [];
p.on('pageerror', e => err.push(String(e))); p.on('console', m => m.type() === 'error' && err.push(m.text()));
await p.goto(`http://localhost:${s.address().port}/video/index.html?f=${f}&captura=1`); await p.waitForFunction(() => window.__listo === true, null, { timeout: 30000 });
const imgs = []; for (const t of ts) { await p.evaluate(t => window.__seek(t), t); imgs.push((await p.screenshot({ type: 'jpeg', quality: 80 })).toString('base64')); }
const p2 = await b.newPage({ viewport: { width: Math.round(cols * (W * esc + 8)), height: Math.round(Math.ceil(ts.length / cols) * (H * esc + 30)) } });
await p2.setContent(`<body style="margin:0;background:#333;display:flex;flex-wrap:wrap;font:14px sans-serif;color:#fff">${imgs.map((d, i) => `<div style="margin:4px"><img src="data:image/jpeg;base64,${d}" width="${W * esc}" height="${H * esc}" style="display:block"><div style="height:22px">${ts[i]} s</div></div>`).join('')}</body>`);
fs.mkdirSync(path.dirname(out), { recursive: true }); await p2.screenshot({ path: out }); console.log('dur', await p.evaluate(() => window.__dur), 'errores', err); await b.close(); s.close();
