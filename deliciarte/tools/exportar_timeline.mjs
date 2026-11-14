// Exporta brief/timeline.mjs (+ voz/voz.json si existe) a brief/timeline.json para los scripts de audio.
// Uso: node deliciarte/tools/exportar_timeline.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS, BPM, FRAMES, END, VOZ, EV, KINETIC } from '../brief/timeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vozPath = path.join(ROOT, 'voz', 'voz.json');
const real = fs.existsSync(vozPath) ? JSON.parse(fs.readFileSync(vozPath, 'utf8')) : null;
const PAL = real ? real.palabras : {};
const palabra = (L, w) => PAL[`${L}.${w}`] ?? VOZ.find((v) => v.id === L).palabras[w] ?? VOZ.find((v) => v.id === L).f;
const voz = VOZ.map((v) => {
  const r = real && real.lineas ? real.lineas.find((x) => x.id === v.id) : null;
  return { id: v.id, texto: v.texto, f: r ? r.f : v.f, termina_f: r ? r.termina_f : v.f + 100, palabras: r ? r.palabras : v.palabras };
});
const kinetic = KINETIC.map((k) => ({ ...k, f: palabra(k.voz[0], k.voz[1]) }));
const out = { fps: FPS, bpm: BPM, frames: FRAMES, end: END, ev: EV, voz, kinetic, voz_real: !!real };
fs.writeFileSync(path.join(ROOT, 'brief', 'timeline.json'), JSON.stringify(out, null, 1));
console.log('brief/timeline.json', real ? '(con la voz real)' : '(voz planeada)');
