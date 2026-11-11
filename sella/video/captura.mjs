// Captura la página real en vista de celular para usarla dentro del teléfono del video.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'video/build/ui');
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.5 });
await p.goto('file://' + path.join(root, 'web/index.html'));
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(2200);
await p.screenshot({ path: path.join(out, 'hero.png') });
const meta = await p.evaluate(() => {
  const r = s => { const q = document.querySelector(s).getBoundingClientRect(); return [q.x, q.y, q.width, q.height]; };
  return { vw: innerWidth, vh: innerHeight, logo: r('.hero .logo'), h1: r('.hero h1'), btn: r('.hero .btn'), barra: r('.barra') };
});
fs.writeFileSync(path.join(out, 'hero.json'), JSON.stringify(meta));
console.log(meta);
await b.close();
