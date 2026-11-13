// node render.cjs --s 0.5 --fps 30 --from 0 --to 5 --out build/x.mp4 [--audio wav]   |   --stills 0.02,1.4 --dir review
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const A = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(s => { const [k, ...v] = s.trim().split(' '); return [k, v.join(' ')]; }));
const ROOT = path.resolve(__dirname, '..'), s = +(A.s || 0.5), fps = +(A.fps || 30), sub = +(A.sub || 8);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); p.on('console', m => console.log('[pg]', m.text())); p.on('pageerror', e => { console.error('[err]', e.message); process.exit(1); });
  await p.goto(`http://localhost:${port}/video/render/index.html?s=${s}&sub=${sub}&fmt=${A.fmt || '9x16'}`); await p.waitForFunction('window.ready', null, { timeout: 60000 });
  if (A.stills) {
    fs.mkdirSync(A.dir, { recursive: true });
    for (const t of A.stills.split(',').map(Number)) fs.writeFileSync(path.join(A.dir, `t${t.toFixed(2)}.jpg`), Buffer.from(await p.evaluate(t => shot(t, undefined, 0.93), t), 'base64'));
  } else {
    fs.mkdirSync(path.dirname(A.out), { recursive: true });
    const from = +(A.from || 0), to = +A.to, n = Math.round((to - from) * fps);
    const args = ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', fps, '-c:v', 'png', '-i', '-'];
    if (A.audio) args.push('-ss', from, '-t', to - from, '-i', A.audio, '-c:a', 'aac', '-b:a', '192k');
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', A.crf || 16, '-preset', 'slow', '-movflags', '+faststart', A.out);
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] }); const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const png = Buffer.from(await p.evaluate(([t, sh]) => shot(t, sh), [from + i / fps, 0.5 / fps]), 'base64');
      if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 30 === 0) console.log(`cuadro ${i}/${n} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close(); srv.close();
})();
