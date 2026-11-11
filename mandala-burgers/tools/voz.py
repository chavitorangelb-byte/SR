#!/usr/bin/env python3
"""Bloquea la voz a la línea de tiempo de Mandala Burgers.

- Corta la toma en frases (inicio/fin medidos por energía en la toma, silencios a -40 dB).
- Coloca cada frase en su segundo del video y calcula el cuadro de cada palabra.
- Mueve cada palabra del kinetic type al cuadro de su palabra hablada (brief/timeline.json).
- Procesa la voz (pasa altos, de-esser, compresión suave) a -16 LUFS: voz/voz_stem_48k.wav.
- Genera voz/preview_voz_pulso.mp3: la voz en su lugar sobre un pulso a 100 BPM.
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
TL = ROOT / 'brief' / 'timeline.json'
TOMA = ROOT / 'voz' / 'fuente' / 'toma1_hope_eleven_v4.mp3'
SR = 48000
FPS = 60

# id, inicio y fin en la toma (s), segundo del video donde empieza, palabras (texto, inicio en la toma)
CLIPS = [
    ('A', 0.00, 1.70, 0.40, [('Hamburguesas', 0.02), ('de', 0.80), ('colores.', 0.96)]),
    ('B', 2.11, 3.45, 2.50, [('Así', 2.11), ('se', 2.34), ('vería', 2.52), ('tu', 2.87), ('página.', 2.96)]),
    ('C', 3.84, 4.66, 5.00, [('Elige', 3.84), ('tu', 4.10), ('color.', 4.26)]),
    ('D', 5.08, 5.92, 6.40, [("Pa'", 5.08), ('el', 5.20), ('clásico', 5.26)]),
    ('E', 6.23, 7.38, 7.41, [('o', 6.23), ("pa'", 6.42), ('el', 6.66), ('atrevido.', 6.74)]),
    ('F', 7.79, 8.57, 8.60, [('Hotdogs,', 7.79)]),
    ('G', 8.75, 9.34, 9.56, [('papas,', 8.75)]),
    ('H', 9.58, 10.64, 10.32, [('y', 9.58), ('nubes', 9.66), ('asadas', 10.02)]),
    ('I', 10.86, 11.62, 11.48, [('en', 10.86), ('tu', 11.00), ('mesa.', 11.18)]),
    ('J', 12.03, 12.89, 12.60, [('Pide', 12.03), ('por', 12.28), ('WhatsApp,', 12.38)]),
    ('K', 13.07, 13.70, 13.64, [('en', 13.07), ('un', 13.18), ('toque.', 13.32)]),
    ('L1', 14.11, 15.18, 15.50, [('Mandalovers,', 14.11)]),
    ('L2', 15.34, 16.73, 16.86, [('de', 15.34), ('jueves', 15.48), ('a', 15.98), ('domingo.', 16.20)]),
    ('M', 17.12, 18.87, 19.60, [('En', 17.12), ('celular', 17.22), ('y', 17.92), ('en', 18.02), ('computadora.', 18.12)]),
    ('N', 19.28, 20.94, 22.00, [('Color', 19.28), ('en', 19.79), ('cada', 19.96), ('burger.', 20.40)]),
]

# texto del kinetic type -> (clip, índice de la palabra hablada donde aterriza)
KINETIC = {
    'HAMBURGUESAS': ('A', 0), 'DE COLORES': ('A', 1), 'TU PÁGINA': ('B', 3), 'ELIGE': ('C', 0), 'TU COLOR': ('C', 1),
    "PA' EL|CLÁSICO": ('D', 0), "PA' EL|ATREVIDO": ('E', 1), 'HOTDOGS': ('F', 0), 'NUBES|ASADAS': ('H', 1),
    'EN TU MESA': ('I', 0), 'PIDE': ('J', 0), 'POR|WHATSAPP': ('J', 1), 'MANDALOVERS': ('L1', 0),
    'JUEVES|A DOMINGO': ('L2', 1), 'EN CELULAR': ('M', 0), 'EN COMPU': ('M', 2), 'COLOR': ('N', 0), 'EN CADA|BURGER': ('N', 1),
}
PAD_IN, PAD_OUT = 0.015, 0.06


def decode(path):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def write_wav(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'pcm_s24le', str(path)], input=x.astype(np.float32).tobytes(), check=True)


def main():
    tl = json.loads(TL.read_text())
    total = tl['total_f'] / FPS
    src = decode(TOMA)
    stem = np.zeros(int(round(total * SR)), dtype=np.float32)
    voz, pos, prev_end = [], {}, -1.0
    for cid, s0, s1, t, words in CLIPS:
        a, b = max(0, int((s0 - PAD_IN) * SR)), min(len(src), int((s1 + PAD_OUT) * SR))
        clip = src[a:b].copy()
        fi, fo = int(0.008 * SR), int(0.05 * SR)
        clip[:fi] *= np.linspace(0, 1, fi)
        clip[-fo:] *= np.linspace(1, 0, fo)
        at = int((t - PAD_IN) * SR)
        if t < prev_end:
            raise SystemExit(f'{cid}: se encima con la frase anterior ({t:.2f} < {prev_end:.2f})')
        stem[at:at + len(clip)] += clip[: len(stem) - at]
        prev_end = t + (s1 - s0)
        ws = [{'w': w, 'f': int(round((t + ws0 - s0) * FPS))} for w, ws0 in words]
        pos[cid] = ws
        voz.append({'id': cid, 'f': int(round(t * FPS)), 't': t, 'termina_f': int(round(prev_end * FPS)),
                    'dur': round(s1 - s0, 2), 'texto': ' '.join(w for w, _ in words), 'palabras': ws})
    tl['voz'] = voz
    for k in tl['kinetic']:
        cid, i = KINETIC[k['texto']]
        k['f'] = pos[cid][i]['f']
        k['palabra_voz'] = f"{cid}:{pos[cid][i]['w']}"

    raw = ROOT / 'voz' / '_voz_cruda.wav'
    write_wav(raw, stem)
    chain = 'highpass=f=80:poles=2,deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=-22dB:ratio=2.2:attack=6:release=90:makeup=2'
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(raw), '-af', chain + ',loudnorm=I=-16:TP=-2:LRA=7:print_format=json',
                           '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = (f"loudnorm=I=-16:TP=-2:LRA=7:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    out = ROOT / 'voz' / 'voz_stem_48k.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', chain + ',' + ln, '-ar', str(SR), '-c:a', 'pcm_s24le', str(out)], check=True)
    raw.unlink()

    n = len(stem)
    click = np.zeros(n, dtype=np.float32)
    beat = 60 / tl['bpm']
    tt = np.arange(int(0.05 * SR)) / SR
    for k in range(int(total / beat) + 1):
        at = int(k * beat * SR)
        if at >= n:
            break
        strong = k % 4 == 0
        tone = np.sin(2 * np.pi * (1320 if strong else 880) * tt) * np.exp(-tt * 90) * (0.16 if strong else 0.08)
        click[at:at + len(tone)] += tone[: n - at]
    mix = decode(out)[:n]
    mix = mix + click[: len(mix)]
    tmp = ROOT / 'voz' / '_prev.wav'
    write_wav(tmp, mix)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'libmp3lame', '-b:a', '192k', str(ROOT / 'voz' / 'preview_voz_pulso.mp3')], check=True)
    tmp.unlink()

    TL.write_text(json.dumps(tl, ensure_ascii=False, indent=2) + '\n')
    stats = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(out), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
    summary = stats[stats.rindex('Summary'):]
    print(' '.join(l.strip() for l in summary.splitlines() if l.strip().startswith(('I:', 'Peak:'))))
    for v in voz:
        print(v['id'], f"f{v['f']}→f{v['termina_f']}", f"{v['dur']:.2f}s", ' '.join(f"{w['w']}@f{w['f']}" for w in v['palabras']))
    print('kinetic:', ' · '.join(f"{k['texto']}@f{k['f']}" for k in tl['kinetic']))


if __name__ == '__main__':
    main()
