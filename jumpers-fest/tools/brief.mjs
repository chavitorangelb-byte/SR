// Genera brief/timeline.json, brief/brief_fase2.md y voz/guion_elevenlabs.md desde brief/linea.mjs.
// Uso: node tools/brief.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS, BPM, TIEMPO, typingFrames } from '../brief/tiempos.mjs';
import { PROYECTO, FRAMES, SECCIONES, VOZ, TIPO, MUSICA, EVENTOS, SFX_LIB, CAMBIOS } from '../brief/linea.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const s = (f) => (f / FPS).toFixed(2);
const fr = (f, d) => (d ? `f${f}–f${f + d}` : `f${f}`);

// Voz bloqueada (fase 3), si existe: reemplaza entradas y agrega el cuadro de cada palabra.
const lockPath = path.join(ROOT, 'voz', 'voz_bloqueada.json');
const voz = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, 'utf8')) : VOZ;
const locked = voz.every((v) => v.palabras);

// ---- Kinetic type: cada palabra aterriza en su palabra de la voz ----
const linea = (k) => +((k.pos.match(/línea (\d)/) || [0, 9])[1]);
const tipo = TIPO.map((k) => {
  const v = voz.find((x) => x.id === k.voz[0]);
  const w = locked ? v.palabras.find((p) => p.w === k.voz[1]) : null;
  if (locked && !w) throw new Error(`${k.id}: no encontré “${k.voz[1]}” en ${k.voz[0]}`);
  return { ...k, aterriza: locked ? w.f : k.plan, sobre: `“${k.voz[1].replace(/[.,]/g, '')}” (${k.voz[0]}${locked ? `, f${w.f}` : ''})` };
});
const salidas = [...new Set(tipo.map((k) => k.sale))].map((f) => {
  const ks = tipo.filter((k) => k.sale === f).sort((a, b) => linea(a) - linea(b) || a.aterriza - b.aterriza);
  const lineas = [...new Set(ks.map(linea))].map((l) => ks.filter((k) => linea(k) === l).map((k) => k.texto).join(' '));
  return { f, d: 12, p: 'Tipo', t: `“${lineas.join(' / ')}” se desinfla y sale.` };
});
const tipoEventos = [
  ...tipo.map((k) => ({ f: k.aterriza, p: 'Tipo', t: `“${k.texto}” aterriza sobre ${k.sobre} y se infla.`, sfx: k.texto === '+' ? ['pff_corto', 'tipo_infla'] : ['tipo_infla'] })),
  ...salidas,
];
const EV = [...EVENTOS, ...tipoEventos];

// ---- SFX expandidos (la misma regla usará el render) ----
const cues = [];
for (const ev of EV) {
  for (const raw of ev.sfx || []) {
    if (raw.endsWith('*')) {
      const name = raw.slice(0, -1);
      const chars = [...ev.escribe];
      typingFrames(ev.f, ev.d, ev.escribe).forEach((f, i) => cues.push({ f, name, nota: `“${chars[i] === ' ' ? 'espacio' : chars[i]}”` }));
      continue;
    }
    const [name, off] = raw.split('+');
    cues.push({ f: ev.f + (off ? +off : 0), name });
  }
}
cues.sort((a, b) => a.f - b.f || a.name.localeCompare(b.name));
for (const c of cues) if (!SFX_LIB[c.name]) throw new Error(`SFX sin descripción: ${c.name}`);

// ---- Voz ----
const endOf = (v) => (v.termina_f ? v.termina_f / FPS : v.f / FPS + v.max);
const vozMd = [
  locked ? '| # | Entra | Termina | Dura | Frase |' : '| # | En el brief | Entra | Frase | Dura máx. | Termina a más tardar |',
  locked ? '|---|---|---|---|---|' : '|---|---|---|---|---|---|',
  ...voz.map((v) => (locked
    ? `| ${v.id} | ${fr(v.f)} · ${s(v.f)} s | ${fr(v.termina_f)} · ${s(v.termina_f)} s | ${v.dur.toFixed(2)} s | ${v.texto} |`
    : `| ${v.id} | ${v.brief.toFixed(2)} s | ${fr(v.f)} · ${s(v.f)} s | ${v.texto} | ${v.max.toFixed(1)} s | ${endOf(v).toFixed(2)} s |`)),
  '',
  locked ? '**Cuadro de cada palabra**' : 'La voz se bloquea en la fase 3 con la toma real: cada frase en su cuadro y cada palabra con el suyo; el kinetic type y los toques se ajustan a esas palabras.',
  ...(locked ? ['', ...voz.map((v) => `- **${v.id}:** ${v.palabras.map((w) => `${w.w.replace(/[¿?¡!.,]/g, '')} f${w.f}`).join(' · ')}`)] : []),
].join('\n');

// ---- Secciones ----
const secMd = SECCIONES.map((sec) => {
  const rows = [
    ...EV.filter((e) => e.f >= sec.f && e.f <= sec.fin),
    ...voz.filter((v) => v.f >= sec.f && v.f <= sec.fin).map((v) => ({ f: v.f, p: 'Voz', t: `${v.id}: “${v.texto}”` })),
  ].sort((a, b) => a.f - b.f);
  const lines = rows.map((r) => {
    const typing = r.sfx && r.sfx.some((x) => x.endsWith('*'));
    const mine = !r.sfx ? [] : typing
      ? cues.filter((c) => c.f >= r.f && c.f <= r.f + r.d && r.sfx.some((x) => x === c.name + '*'))
      : r.sfx.map((x) => { const [n, o] = x.split('+'); return { name: n, f: r.f + (o ? +o : 0) }; });
    const sfxTxt = !mine.length ? '' : typing ? ` *SFX: ${mine.length} teclas (${fr(mine[0].f)}–${fr(mine[mine.length - 1].f)}).*` : ` *SFX: ${mine.map((c) => `${c.name} (${fr(c.f)})`).join(', ')}.*`;
    return `- **${fr(r.f, r.d)} · ${s(r.f)} s · ${r.p}.** ${r.t}${sfxTxt}`;
  });
  return `### ${sec.nombre} · ${fr(sec.f)}–${fr(sec.fin)} · ${s(sec.f)}–${s(sec.fin + 1)} s\n\n*${sec.musica}.*\n\n${lines.join('\n')}`;
}).join('\n\n');

const tipoMd = ['| # | Palabra | Aterriza | Sobre la voz | Sale | Posición | Tamaño |', '|---|---|---|---|---|---|---|',
  ...tipo.map((k) => `| ${k.id} | ${k.texto} | ${fr(k.aterriza)} · ${s(k.aterriza)} s | ${k.sobre} | ${fr(k.sale)} | ${k.pos} | ${k.px} px |`)].join('\n');

const musMd = ['| Compás | Desde | Acorde | Capas |', '|---|---|---|---|',
  ...MUSICA.map((m) => `| ${m.compas} | ${fr(m.f)} · ${s(m.f)} s | ${m.acorde} | ${m.capas} |`)].join('\n');

const sfxMd = [`**${cues.length} cues** (el mínimo era 70), todos generados en código.`, '', '| # | Cuadro | Cue | Sonido |', '|---|---|---|---|',
  ...cues.map((c, i) => `| ${i + 1} | ${fr(c.f)} · ${s(c.f)} s | ${c.name}${c.nota ? ' ' + c.nota : ''} | ${SFX_LIB[c.name]} |`)].join('\n');

// ---- Verificaciones ----
const checks = [];
const ok = (cond, txt) => checks.push(`- ${cond ? '✅' : '❌'} ${txt}`);
ok(FRAMES === 1620 || (FRAMES === 1650 && endOf(voz.at(-1)) > 26.8), `Duración: ${FRAMES} cuadros (${(FRAMES / FPS).toFixed(1)} s)${FRAMES === 1650 ? ': end card de 3.5 s porque L6 dura ' + voz.at(-1).dur?.toFixed(2) + ' s' : ''}.`);
ok(SECCIONES[0].f === 0 && SECCIONES.at(-1).fin === FRAMES - 1 && SECCIONES.every((x, i) => !i || x.f === SECCIONES[i - 1].fin + 1), 'Las secciones cubren el video sin huecos ni encimes.');
const marcas = { llegada: 2.14, catalogo: 4.28, aparta: 9.64, fiesta: 15.0, cierre: 19.28, endcard: 24.0 };
ok(Object.entries(marcas).every(([id, sec]) => Math.abs(SECCIONES.find((x) => x.id === id).f / FPS - sec) < 0.01), 'Las secciones empiezan en los tiempos del beat sheet (2.14, 4.28, 9.64, 15.00, 19.28 y 24.00 s).');
ok(cues.length >= 70, `SFX: ${cues.length} cues (mínimo 70).`);
const encime = voz.slice(0, -1).filter((v, i) => endOf(v) > voz[i + 1].f / FPS);
ok(!encime.length, encime.length ? `Se enciman frases: ${encime.map((v) => v.id).join(', ')}` : 'Ninguna frase de voz se encima con la siguiente si respeta su duración máxima.');
ok(endOf(voz.at(-1)) <= FRAMES / FPS - 0.2, `La última frase termina ${(FRAMES / FPS - endOf(voz.at(-1))).toFixed(1)} s antes del final.`);
// una palabra se lee desde 6 cuadros antes de aterrizar hasta 10 cuadros después de empezar a salir
let maxWords = 0, cuando = 0;
for (let f = 0; f < FRAMES; f++) {
  const w = tipo.filter((k) => f >= k.aterriza - 6 && f < k.sale + 10).length;
  if (w > maxWords) { maxWords = w; cuando = f; }
}
ok(maxWords <= 4, `Kinetic type: máximo ${maxWords} palabras legibles a la vez (f${cuando}; límite 3 o 4).`);
ok(tipo.every((k) => k.px >= 42), 'Kinetic type de 42 px o más.');
ok(tipo.every((k) => k.aterriza - 14 >= 0 && k.sale > k.aterriza + 20), 'Cada palabra se queda al menos 20 cuadros después de aterrizar.');
if (locked) ok(true, `Kinetic type amarrado a la voz: las ${tipo.length} palabras aterrizan en el cuadro de su palabra (voz/voz_bloqueada.json).`);
const taps = EV.filter((e) => e.sfx && e.sfx[0] === 'tap');
const enTiempo = taps.filter((e) => { const k = e.f / TIEMPO; return Math.abs(k - Math.round(k)) * TIEMPO <= 1; });
ok(enTiempo.length >= Math.ceil(taps.length * 0.6), `Toques sobre un tiempo del compás: ${enTiempo.length} de ${taps.length} (${enTiempo.map((e) => fr(e.f)).join(', ')}).`);
ok(EV.every((e) => e.f + (e.d || 0) < FRAMES), 'Todos los eventos terminan dentro del video.');

const tpl = fs.readFileSync(path.join(ROOT, 'brief', 'plantilla.md'), 'utf8');
const md = tpl.replace('{{cambios}}', CAMBIOS.map((c, i) => `${i + 1}. ${c}`).join('\n')).replace('{{voz}}', vozMd)
  .replace('{{secciones}}', secMd).replace('{{tipo}}', tipoMd).replace('{{musica}}', musMd)
  .replace('{{sfx}}', sfxMd).replace('{{checks}}', checks.join('\n'));
fs.writeFileSync(path.join(ROOT, 'brief', 'brief_fase2.md'), md);
fs.writeFileSync(path.join(ROOT, 'brief', 'timeline.json'), JSON.stringify({ proyecto: PROYECTO, fps: FPS, bpm: BPM, frames: FRAMES, secciones: SECCIONES, voz, tipo, musica: MUSICA, eventos: EV, sfx: cues, sfx_lib: SFX_LIB }, null, 1));

// ---- Guion para ElevenLabs ----
const texto = voz.map((v) => v.texto).join('\n<break time="1.0s" />\n');
const guion = `# Guion para ElevenLabs · Jumpers Fest Ags

- **Voz:** español de México, cálida y alegre, cercana. Ritmo natural, nunca acelerada. Puede ser la misma voz de Roma u otra femenina de ese estilo.
- **Modelo:** el mismo que usaste en Roma (si es Multilingual v2: Stability 45 %, Similarity 75 %, Style 25 %, Speaker boost activado, Speed 1.0).
- **Tomas:** todo el texto en una sola generación, dos veces (2 tomas). Mándame los dos archivos aquí en el chat, en WAV o en MP3 de 192 kbps o más.

## Texto para pegar

\`\`\`
${texto}
\`\`\`

Si usas Eleven v3, quita las etiquetas \`<break>\` y deja una línea en blanco entre frases.

## Dónde va cada frase

Yo corto cada frase y la coloco en su cuadro; no tienes que acomodar nada.

| # | Entra | Frase | Dura máx. |
|---|---|---|---|
${voz.map((v) => `| ${v.id} | ${s(v.f)} s | ${v.texto} | ${(v.max ?? v.dur).toFixed(1)} s |`).join('\n')}

Si una frase dura más, no la aceleres en ElevenLabs: avísame y la acomodo en la edición.

## Pronunciación

- **Jumpers Fest:** si la voz lo lee con jota (“Júmpers”), escribe “Yámpers Fest” solo en el texto que pegas.
- **Elevate:** que suene igual que en el video de Roma; si no, escríbelo como se pronuncia.
- **Aguascalientes** va tal cual.
`;
fs.writeFileSync(path.join(ROOT, 'voz', 'guion_elevenlabs.md'), guion);

console.log(checks.join('\n'));
console.log(`brief/brief_fase2.md · brief/timeline.json · voz/guion_elevenlabs.md · ${cues.length} SFX`);
