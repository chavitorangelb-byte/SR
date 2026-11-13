#!/usr/bin/env python3
"""Bloquea la voz de MaRe a la línea de tiempo.

- Corta la toma de ElevenLabs en sus 8 frases (bordes medidos con silencios a -45 dB).
- Coloca cada frase en su cuadro y calcula el cuadro de cada palabra
  (voz/fuente/toma1_palabras.json: transcripción con inicio por palabra).
- Escribe brief/timeline.json, voz/voz_stem_48k.wav (-16 LUFS) y
  voz/preview_voz_pulso.mp3 (voz sobre un pulso a 120 BPM).
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
TOMA = ROOT / 'voz' / 'fuente' / 'toma1_jessica_eleven_v4.mp3'
PALABRAS = ROOT / 'voz' / 'fuente' / 'toma1_palabras.json'
SR, FPS, BPM, FRAMES = 48000, 60, 120, 1380

SECCIONES = [('golpe', 0, 30), ('zigzag', 30, 120), ('corte', 120, 180), ('telefono', 180, 360),
             ('lealtad', 360, 570), ('menu', 570, 750), ('cajita', 750, 930), ('boton', 930, 1020),
             ('cierre', 1020, 1200), ('endcard', 1200, 1380)]

# (id, cuadro de entrada, texto, inicio y fin en la toma en s)
VOZ = [
    ('L1', 30, 'Lo mejor está adentro.', 0.000, 1.543),
    ('L2', 180, 'Galletas, brownies y pasteles.', 1.953, 4.329),
    ('L3', 372, 'Cinco sellos, y veinte por ciento de descuento.', 4.671, 7.695),
    ('L4', 582, 'Imagina todo esto en tu propia página.', 8.001, 10.460),
    ('L5', 762, 'Elige tu cajita. Elige tus toppings.', 10.784, 13.331),
    ('L6', 936, 'Haz tu pedido por WhatsApp.', 13.598, 14.935),
    ('L7', 1038, 'MaRe Repostería. Aguascalientes.', 15.231, 17.606),
    ('L8', 1224, 'Tu página, desde mil pesos.', 17.873, 20.050),
]


def decode(path):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def write_wav(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'pcm_s24le', str(path)], input=x.astype(np.float32).tobytes(), check=True)


def main():
    total = FRAMES / FPS
    toma = decode(TOMA)
    words = json.loads(PALABRAS.read_text())
    stem = np.zeros(int(round(total * SR)) + SR, dtype=np.float32)
    pre, post = 0.03, 0.20
    voz = []
    for vid, f, texto, ini, fin in VOZ:
        start = f / FPS
        a, b = max(0, int((ini - pre) * SR)), min(len(toma), int((fin + post) * SR))
        seg = toma[a:b].copy()
        fi, fo = int(0.006 * SR), int(0.09 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fo:] *= np.linspace(1, 0, fo) ** 2
        at = int(round(start * SR)) - (int(ini * SR) - a)
        stem[at:at + len(seg)] += seg
        ws = [w for w in words if ini - 0.2 <= w[1] < fin]
        # "veinte por ciento" se transcribe como un solo "20%"
        guion = texto.replace('veinte por ciento', 'veinte_por_ciento').split()
        if len(ws) != len(guion):
            raise SystemExit(f'{vid}: {len(ws)} palabras transcritas contra {len(guion)} del guion')
        pal = []
        for k, (g, w) in enumerate(zip(guion, ws)):
            t0 = max(w[1], ini)
            t1 = ws[k + 1][1] if k + 1 < len(ws) else fin
            pal.append({'w': g.replace('_', ' '), 'f': int(round((start + t0 - ini) * FPS)),
                        'fin': int(round((start + t1 - ini) * FPS))})
        voz.append({'id': vid, 'f': f, 'texto': texto, 'toma': {'ini': ini, 'fin': fin}, 'dur': round(fin - ini, 3),
                    'termina_f': int(round((start + fin - ini) * FPS)), 'palabras': pal})

    stem = stem[:int(round(total * SR))]
    raw = ROOT / 'voz' / '_voz_cruda.wav'
    write_wav(raw, stem)
    chain = 'highpass=f=80:poles=2,deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=-22dB:ratio=2.2:attack=6:release=90:makeup=2'
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(raw), '-af',
                           chain + ',loudnorm=I=-16:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = (f"loudnorm=I=-16:TP=-2:LRA=7:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    out = ROOT / 'voz' / 'voz_stem_48k.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', chain + ',' + ln, '-ar', str(SR),
                    '-c:a', 'pcm_s24le', str(out)], check=True)
    raw.unlink()

    n = int(round(total * SR))
    click = np.zeros(n, dtype=np.float32)
    beat = 60 / BPM
    t = np.arange(int(0.05 * SR)) / SR
    for k in range(int(total / beat) + 1):
        at = int(k * beat * SR)
        if at >= n:
            break
        strong = k % 4 == 0
        tone = np.sin(2 * np.pi * (1320 if strong else 880) * t) * np.exp(-t * 90) * (0.16 if strong else 0.08)
        click[at:at + len(tone)] += tone[: n - at]
    v = decode(out)[:n]
    tmp = ROOT / 'voz' / '_prev.wav'
    write_wav(tmp, v + click[: len(v)])
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'libmp3lame', '-b:a', '192k',
                    str(ROOT / 'voz' / 'preview_voz_pulso.mp3')], check=True)
    tmp.unlink()

    tl = {'fps': FPS, 'bpm': BPM, 'frames': FRAMES,
          'secciones': [{'id': s, 'f0': a, 'f1': b} for s, a, b in SECCIONES], 'voz': voz}
    (ROOT / 'brief' / 'timeline.json').write_text(json.dumps(tl, ensure_ascii=False, indent=2) + '\n')
    stats = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(out), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
    summary = stats[stats.rindex('Summary'):]
    print(' '.join(l.strip() for l in summary.splitlines() if l.strip().startswith(('I:', 'Peak:'))))
    for x in voz:
        print(x['id'], f"f{x['f']}→f{x['termina_f']}", f"{x['dur']:.2f}s", ' '.join(f"{w['w']}@f{w['f']}" for w in x['palabras']))


if __name__ == '__main__':
    main()
