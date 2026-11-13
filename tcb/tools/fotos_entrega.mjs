// Fotos de la interfaz para enviarle al dueño (celular, 2x).  node tools/fotos_entrega.mjs
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path';
import { servir } from './shots.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), OUT = path.join(ROOT, 'entrega', 'fotos');
const s = await servir(), url = 'http://localhost:' + s.address().port + '/', b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await c.newPage();
await p.route('**/data.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8').replace('SHOW_PENDIENTES: true', 'SHOW_PENDIENTES: false') }));
const foto = (n) => p.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 90 });
const ir = async (id, extra = 0) => { await p.evaluate(([i, e]) => { const el = document.getElementById(i); scrollTo({ top: el.getBoundingClientRect().top + scrollY - 10 + e, behavior: 'instant' }); }, [id, extra]); await p.waitForTimeout(1600); };
await p.goto(url); await p.waitForTimeout(4000); await foto('01_portada');
for (let y = 0; y < 9000; y += 420) { await p.mouse.wheel(0, 420); await p.waitForTimeout(220); }   // dispara las animaciones de entrada
await ir('menu'); await foto('02_menu');
await p.locator('#panel-burgers [data-add]').nth(1).click(); await p.locator('#panel-burgers [data-add]').first().click();
await p.locator('#tab-fries').click(); await p.waitForTimeout(700); await p.locator('#panel-fries [data-add]').nth(1).click(); await p.waitForTimeout(600);
await foto('03_agregar_al_pedido');
await p.locator('#barra [data-abrir-pedido]').click(); await p.waitForTimeout(700); await p.fill('#nombre', 'Ana'); await p.fill('#notas', 'Una sin tomate, por favor'); await p.locator('#pedidoTitulo').click();
await foto('04_tu_pedido');
await p.locator('#enviar').click(); await p.waitForTimeout(500); await foto('05_mensaje_de_whatsapp');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(3000);
for (let y = 0; y < 9000; y += 420) { await p.mouse.wheel(0, 420); await p.waitForTimeout(220); }
await ir('feed'); await foto('06_fotos');
await p.evaluate(() => { const e = document.getElementById('armado'); scrollTo({ top: e.offsetTop + (e.offsetHeight - innerHeight) * 0.97, behavior: 'instant' }); }); await p.waitForTimeout(1600); await foto('07_burger');
await ir('resenas'); await foto('08_resenas');
await ir('llegar'); await foto('09_como_llegar');
await ir('directo'); await foto('10_sin_comisiones');
await b.close(); s.close(); console.log(fs.readdirSync(OUT).join(' '));
