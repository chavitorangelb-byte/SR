// Capturas de revisión de la página en vista de celular (390x844).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('requestfailed', r => errs.push('falló ' + r.url()));
await p.goto('file://' + path.join(root, 'web/index.html'));
await p.waitForTimeout(1800);
const h = await p.evaluate(() => document.documentElement.scrollHeight);
const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
let i = 0;
for (let y = 0; y < h; y += 760) {
  await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(root, `review/fase2/pag_${String(i++).padStart(2, '0')}.png`) });
}
const links = await p.$$eval('.wa-link', a => a.map(x => x.href));
console.log(JSON.stringify({ alto: h, desbordeHorizontal: ov, errores: errs, enlaces: [...new Set(links.map(l => l.split('?')[0]))], n: links.length, capturas: i }));
await b.close();
