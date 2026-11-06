// Fase 7: render final 1080×1920 a 60 fps en trozos paralelos (reanudable: los trozos ya hechos no se repiten),
// luego une los trozos, agrega la mezcla y saca la versión H.264 a 30 fps para redes y WhatsApp.
// Uso: node video/final.mjs [--paralelo 3] [--trozo 210] [--sub 8]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? +process.argv[i + 1] : d; };
const PAR = arg('paralelo', 3), TROZO = arg('trozo', 210), SUB = arg('sub', 8);
const CUADROS = 1680;
const TMP = path.join(ROOT, 'review', 'fase7', '_trozos');
const OUT = path.join(ROOT, 'entrega', 'video');
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const trozos = [];
for (let d = 0; d < CUADROS; d += TROZO) trozos.push({ desde: d, hasta: Math.min(CUADROS - 1, d + TROZO - 1), out: path.join(TMP, `t${String(d).padStart(4, '0')}.mp4`) });
const pendientes = trozos.filter((t) => !fs.existsSync(t.out));
console.log(`${trozos.length} trozos de ${TROZO} cuadros · pendientes ${pendientes.length} · ${PAR} en paralelo · ${SUB} subcuadros`);

const t0 = Date.now();
const correr = (t) => new Promise((ok, mal) => {
  const log = fs.openSync(path.join(TMP, `log_${t.desde}.txt`), 'w');
  const p = spawn('node', [path.join(ROOT, 'video', 'render.mjs'), '--desde', String(t.desde), '--hasta', String(t.hasta), '--fps', '60', '--sub', String(SUB),
    '--ancho', '1080', '--alto', '1920', '--out', t.out], { stdio: ['ignore', log, log] });
  p.on('close', (c) => { fs.closeSync(log); if (c === 0 && fs.existsSync(t.out)) { console.log(`✔ trozo ${t.desde}–${t.hasta} (${((Date.now() - t0) / 60000).toFixed(1)} min)`); ok(); } else mal(new Error(`trozo ${t.desde} salió con ${c}`)); });
});
const cola = [...pendientes];
await Promise.all(Array.from({ length: Math.min(PAR, cola.length) }, async () => { while (cola.length) await correr(cola.shift()); }));

// Unir (solo video), agregar la mezcla y medir
const lista = path.join(TMP, 'lista.txt');
fs.writeFileSync(lista, trozos.map((t) => `file '${t.out}'`).join('\n'));
const video60 = path.join(TMP, 'video60.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-map', '0:v', '-c', 'copy', video60]);
const mezcla = path.join(ROOT, 'audio', 'build', 'mezcla_master.wav');
// Sonoridad integrada y pico verdadero del audio de un archivo (ffmpeg ebur128).
function medirAudio(f) {
  const out = execFileSync('bash', ['-c', `ffmpeg -hide_banner -nostats -i "${f}" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2`]).toString();
  return { i: +(/I:\s+(-?[\d.]+)/.exec(out) || [])[1], tp: +(/Peak:\s+(-?[\d.]+)/.exec(out) || [])[1] };
}
// Si el AAC se pasa del techo (−1.25 dBTP), se baja la mezcla lo justo para esa codificación.
const codificar = (entrada, salida, extra, kbps) => {
  let gan = 0;
  for (let intento = 0; intento < 3; intento++) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', entrada, '-i', mezcla, '-map', '0:v', '-map', '1:a', ...extra, '-af', `volume=${gan}dB`,
      '-c:a', 'aac', '-b:a', `${kbps}k`, '-ar', '48000', '-shortest', '-movflags', '+faststart', salida]);
    const m = medirAudio(salida);
    if (m.tp <= -1.25) return { ...m, gan };
    gan -= m.tp + 1.3;
  }
  throw new Error(`No se logró el techo de pico en ${salida}`);
};
const master = path.join(OUT, 'ana_gaby_9x16_master_60fps.mp4');
const m60 = codificar(video60, master, ['-c:v', 'copy'], 320);
const r30 = path.join(OUT, 'ana_gaby_9x16_30fps.mp4');
const m30 = codificar(master, r30, ['-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p'], 192);
const tam = (f) => `${(fs.statSync(f).size / 1e6).toFixed(1)} MB`;
console.log(`✔ ${path.relative(ROOT, master)} · ${tam(master)} · ${m60.i} LUFS · ${m60.tp} dBTP${m60.gan ? ` (audio ${m60.gan.toFixed(2)} dB)` : ''}`);
console.log(`✔ ${path.relative(ROOT, r30)} · ${tam(r30)} · ${m30.i} LUFS · ${m30.tp} dBTP${m30.gan ? ` (audio ${m30.gan.toFixed(2)} dB)` : ''}`);
console.log(`Total ${((Date.now() - t0) / 60000).toFixed(1)} min`);
