// Genera brief/brief_fase2.md y voz/guion_elevenlabs.md desde brief/timeline.json.
// Uso: node tools/brief.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'brief', 'timeline.json'), 'utf8'));
const FPS = T.fps;
const s = (f) => (f / FPS).toFixed(2);
const fr = (f, d) => (d ? `f${f}–f${f + d}` : `f${f}`);

// ---- SFX expandidos (misma regla que usará el render) ----
export function typingFrames(f, d, text) {
  const n = [...text].length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const base = n === 1 ? f : f + Math.round((i * d) / (n - 1));
    const jitter = [0, 1, -1, 0, 1, 0, -1, 1][i % 8];
    out.push(Math.max(out.length ? out[out.length - 1] + 1 : f, Math.min(f + d, base + (i && i < n - 1 ? jitter : 0))));
  }
  return out;
}
const cues = [];
for (const ev of T.eventos) {
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
for (const c of cues) if (!T.sfx_lib[c.name]) throw new Error(`SFX sin descripción: ${c.name}`);

// ---- Tablas ----
const voz = ['| # | Entra | Frase | Dura máx. | Termina a más tardar |', '|---|---|---|---|---|',
  ...T.voz.map((v) => `| ${v.id} | ${fr(v.f)} · ${s(v.f)} s | ${v.texto} | ${v.max.toFixed(1)} s | ${(v.f / FPS + v.max).toFixed(2)} s |`)].join('\n');

const secciones = T.secciones.map((sec) => {
  const rows = [
    ...T.eventos.filter((e) => e.f >= sec.f && e.f <= sec.fin).map((e) => ({ f: e.f, d: e.d, p: e.p, t: e.t, sfx: e.sfx })),
    ...T.voz.filter((v) => v.f >= sec.f && v.f <= sec.fin).map((v) => ({ f: v.f, p: 'Voz', t: `${v.id}: “${v.texto}”` })),
  ].sort((a, b) => a.f - b.f);
  const lines = rows.map((r) => {
    const mine = r.sfx ? cues.filter((c) => (r.sfx.some((x) => x.endsWith('*')) ? c.f >= r.f && c.f <= r.f + (r.d || 0) && r.sfx.some((x) => x.startsWith(c.name)) : r.sfx.some((x) => x.split('+')[0] === c.name && c.f === r.f + (+(x.split('+')[1] || 0))))) : [];
    const typing = r.sfx && r.sfx.some((x) => x.endsWith('*'));
    const sfxTxt = !mine.length ? '' : typing ? ` *SFX: ${mine.length} teclas (${fr(mine[0].f)}–${fr(mine[mine.length - 1].f)}).*` : ` *SFX: ${mine.map((c) => `${c.name} (${fr(c.f)})`).join(', ')}.*`;
    return `- **${fr(r.f, r.d)} · ${s(r.f)} s · ${r.p}.** ${r.t}${sfxTxt}`;
  });
  return `### ${sec.nombre} · ${fr(sec.f)}–${fr(sec.fin)} · ${s(sec.f)}–${s(sec.fin + 1)} s\n\n*${sec.musica}.*\n\n${lines.join('\n')}`;
}).join('\n\n');

const tipo = ['| # | Texto | Entra | Sale | Aterriza en | Posición | Tamaño |', '|---|---|---|---|---|---|---|',
  ...T.tipo.map((t) => `| ${t.id} | ${t.texto} | ${fr(t.f)} · ${s(t.f)} s | ${fr(t.sale)} · ${s(t.sale)} s | ${t.aterriza} | ${t.pos} | ${t.px} px |`)].join('\n');

const musica = ['| Compás | Desde | Acorde | Capas |', '|---|---|---|---|',
  ...T.musica.map((m) => `| ${m.compas} | ${fr(m.f)} · ${s(m.f)} s | ${m.acorde} | ${m.capas} |`)].join('\n');

const sfx = [`**${cues.length} cues** (el mínimo era 70).`, '', '| # | Cuadro | Cue | Sonido |', '|---|---|---|---|',
  ...cues.map((c, i) => `| ${i + 1} | ${fr(c.f)} · ${s(c.f)} s | ${c.name}${c.nota ? ' ' + c.nota : ''} | ${T.sfx_lib[c.name]} |`)].join('\n');

// ---- Verificaciones ----
const checks = [];
const ok = (cond, txt) => checks.push(`- ${cond ? '✅' : '❌'} ${txt}`);
ok(T.frames === 1680, `Duración total: ${T.frames} cuadros (${(T.frames / FPS).toFixed(1)} s).`);
ok(cues.length >= 70, `SFX: ${cues.length} cues (mínimo 70).`);
const last = T.secciones[T.secciones.length - 1];
ok(last.fin === T.frames - 1 && T.secciones.every((x, i) => i === 0 || x.f === T.secciones[i - 1].fin + 1), 'Las secciones cubren el video sin huecos ni encimes.');
const overl = T.voz.slice(0, -1).filter((v, i) => v.f / FPS + v.max > T.voz[i + 1].f / FPS);
ok(!overl.length, overl.length ? `Se enciman frases: ${overl.map((v) => v.id).join(', ')}` : 'Ninguna frase de voz se encima con la siguiente si respeta su duración máxima.');
const lastV = T.voz[T.voz.length - 1];
ok(lastV.f / FPS + lastV.max <= T.frames / FPS - 0.2, `La última frase termina ${(T.frames / FPS - lastV.f / FPS - lastV.max).toFixed(1)} s antes del final.`);
let maxWords = 0;
for (let f = 0; f < T.frames; f++) {
  const w = T.tipo.filter((t) => f >= t.f && f < t.sale).reduce((n, t) => n + t.texto.replace('/', ' ').split(/\s+/).filter(Boolean).length, 0);
  maxWords = Math.max(maxWords, w);
}
ok(maxWords <= 4, `Kinetic type: máximo ${maxWords} palabras en pantalla a la vez (límite 3 o 4).`);
ok(T.tipo.every((t) => t.px >= 42), 'Kinetic type de 42 px o más.');
const outOf = T.eventos.filter((e) => e.f + (e.d || 0) > T.frames);
ok(!outOf.length, 'Todos los eventos terminan dentro del video.');

const tpl = fs.readFileSync(path.join(ROOT, 'brief', 'plantilla.md'), 'utf8');
const md = tpl.replace('{{voz}}', voz).replace('{{secciones}}', secciones).replace('{{tipo}}', tipo)
  .replace('{{musica}}', musica).replace('{{sfx}}', sfx).replace('{{checks}}', checks.join('\n'));
fs.writeFileSync(path.join(ROOT, 'brief', 'brief_fase2.md'), md);

// ---- Guion para ElevenLabs ----
const script = T.voz.map((v) => v.texto).join('\n<break time="1.0s" />\n');
const guion = `# Guion para ElevenLabs · Florería Roma

- **Voz:** femenina, español de México, cálida y cercana. Ritmo natural, nunca acelerada.
- **Modelo:** Eleven Multilingual v2.
- **Ajustes:** Stability 50 %, Similarity 75 %, Style 15 %, Speaker boost activado, Speed 1.0.
- **Tomas:** genera el texto completo dos veces (2 tomas) y mándame los dos archivos aquí en el chat, en WAV o en MP3 de 192 kbps o más.

## Texto para pegar

\`\`\`
${script}
\`\`\`

Si usas Eleven v3, quita las etiquetas \`<break>\` y deja una línea en blanco entre frases.

## Dónde va cada frase

Yo corto cada frase y la coloco en su cuadro; no tienes que acomodar nada.

| # | Entra | Frase | Dura máx. |
|---|---|---|---|
${T.voz.map((v) => `| ${v.id} | ${s(v.f)} s | ${v.texto} | ${v.max.toFixed(1)} s |`).join('\n')}

Si una frase dura más, no la aceleres en ElevenLabs: avísame y la acomodo en la edición.

## Pronunciación

- **WhatsApp** debe sonar "guatsap". Si la voz lo lee raro, escribe "guatsap" en el texto.
- **Elevate:** si no suena como ustedes lo dicen, escríbelo como se pronuncia.
- **Aguascalientes** y **Florería Roma** van tal cual.
`;
fs.mkdirSync(path.join(ROOT, 'voz'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'voz', 'guion_elevenlabs.md'), guion);

console.log(checks.join('\n'));
console.log(`brief/brief_fase2.md · voz/guion_elevenlabs.md · ${cues.length} SFX`);
