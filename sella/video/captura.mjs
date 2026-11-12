// Captura la página real (390×844, DPR 2.5) en piezas para animarla dentro del teléfono:
// pagina.png (página completa sin las piezas que se animan), un sprite por tarjeta/cintillo/botón y ui.json con sus rectángulos.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'video/build/ui');
fs.mkdirSync(out, { recursive: true });
const DPR = 2.5;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR });
await p.goto('file://' + path.join(root, 'web/index.html'));
await p.addStyleTag({ content: `.rev{opacity:1!important;transform:none!important;transition:none!important}
  .camino path{animation:none!important;stroke-dashoffset:0!important} html{scroll-behavior:auto!important}
  .barra,.precio,.cintillo .pct{visibility:hidden!important} *{transition:none!important}` });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
const meta = await p.evaluate(() => {
  const r = e => { const q = (typeof e === 'string' ? document.querySelector(e) : e).getBoundingClientRect(); return [q.x, q.y + scrollY, q.width, q.height]; };
  const cards = [...document.querySelectorAll('.tarjeta')].map(c => ({ r: r(c), precio: c.querySelector('.precio') ? r(c.querySelector('.precio')) : null, valor: +c.dataset.precio || null }));
  const figs = [...document.querySelectorAll('.galeria figure')].map(f => { const i = f.querySelector('img'); return { r: r(f), src: i.getAttribute('src'), pos: getComputedStyle(i).objectPosition }; });
  return { alto: document.documentElement.scrollHeight, logo: r('.hero .logo'), h1: r('.hero h1'), btn: r('.hero .btn'), barra: r('.barra'),
    catKicker: r('#catalogo .kicker'), catH2: r('#catalogo h2'), cards, cintillo: r('.cintillo'), pct: r('.cintillo .pct'),
    galKicker: r('#galeria .kicker'), figs, puntos: r('#puntos'), resena: r('.resena'), cierreH2: r('.cierre h2'), cta: r('#cta') };
});
meta.dpr = DPR;
const sprites = [...Array(meta.cards.length).keys()].map(i => [`card${i}`, p.locator('.tarjeta').nth(i)]).concat([['cintillo', p.locator('.cintillo')], ['cta', p.locator('#cta')]]);
for (const [n, loc] of sprites) await loc.screenshot({ path: path.join(out, n + '.png') });
await p.addStyleTag({ content: `.tarjeta,.cintillo,#cta,.galeria figure,.puntos{visibility:hidden!important}` });
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(300);
await p.screenshot({ path: path.join(out, 'pagina.png'), fullPage: true });
fs.writeFileSync(path.join(out, 'ui.json'), JSON.stringify(meta, null, 1));
console.log('alto', meta.alto, 'tarjetas', meta.cards.length, 'fotos', meta.figs.length, 'cta', meta.cta, 'cintillo', meta.cintillo, 'catH2', meta.catH2, 'galKicker', meta.galKicker, 'card0', JSON.stringify(meta.cards[0]), 'pct', meta.pct, 'fig0', JSON.stringify(meta.figs[0]));
await b.close();
