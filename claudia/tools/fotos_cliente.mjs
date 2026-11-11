// Capturas de la página para mandarle a la clienta. Uso: node claudia/tools/fotos_cliente.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + path.join(ROOT, 'web', 'index.html'), out = (n) => path.join(ROOT, 'entrega', 'fotos', n);
const browser = await chromium.launch();
const m = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 3 });
await m.goto(url); await m.evaluate(() => document.fonts.ready);
const top = (sel, off) => m.evaluate(([s, o]) => { window.scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY - 64 - o); }, [sel, off]);
const shots = [['01_inicio.jpg', null], ['02_que_hacemos_y_galeria.jpg', ['[data-a="q-kicker"]', 16]], ['03_cotiza_por_whatsapp.jpg', ['[data-a="k-kicker"]', 20]], ['04_resenas_y_ubicacion.jpg', ['[data-a="r-caja"]', 14]]];
for (const [n, s] of shots) { if (s) await top(...s); await m.screenshot({ path: out(n), type: 'jpeg', quality: 92 }); }
const d = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await d.goto(url); await d.evaluate(() => document.fonts.ready);
await d.screenshot({ path: out('05_computadora_inicio.jpg'), type: 'jpeg', quality: 92 });
await d.evaluate(() => window.scrollTo(0, document.querySelector('[data-a="g-kicker"]').getBoundingClientRect().top - 76 - 30));
await d.screenshot({ path: out('06_computadora_galeria.jpg'), type: 'jpeg', quality: 92 });
await browser.close();
