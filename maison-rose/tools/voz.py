#!/usr/bin/env python3
"""Bloquea la voz a la línea de tiempo (brief/timeline.json).

Corta la toma en sus 8 frases (inicio y fin medidos por energía, ventanas de 10 ms),
coloca cada una en su cuadro y calcula el cuadro de cada palabra. Los inicios de palabra
se midieron por energía sobre la toma (sin transcripción automática).
Salida: voz/voz_stem_48k.wav (−16 LUFS) y brief/timeline.json actualizado.
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
TL = ROOT / 'brief' / 'timeline.json'
TOMA = ROOT / 'voz' / 'fuente' / 'toma1_hope_eleven_v4.mp3'
SR = 48000
FPS, FRAMES, BPM = 60, 1380, 120

# (id, cuadro de entrada, texto, [(palabra, segundo en la toma)], fin en la toma)
FRASES = [
    ('L1', 30, 'Cada pliegue cuenta.', [('Cada', 0.12), ('pliegue', 0.54), ('cuenta', 1.07)], 1.63),
    ('L2', 180, 'Hojaldres, berlinesas y pasteles.', [('Hojaldres', 2.15), ('berlinesas', 3.04), ('y', 3.99), ('pasteles', 4.14)], 4.78),
    ('L3', 360, 'Ocho sabores de galletas, recién horneadas.', [('Ocho', 5.12), ('sabores', 5.42), ('de', 5.85), ('galletas', 5.95), ('recién', 6.60), ('horneadas', 7.00)], 7.80),
    ('L4', 552, 'Imagina todo esto en tu propia página.', [('Imagina', 8.06), ('todo', 8.76), ('esto', 8.98), ('en', 9.27), ('tu', 9.45), ('propia', 9.67), ('página', 10.05)], 10.55),
    ('L5', 726, 'Flan parisino. Mille-feuille. Trianon.', [('Flan', 10.87), ('parisino', 11.22), ('Mille-feuille', 12.28), ('Trianon', 13.31)], 13.79),
    ('L6', 924, 'Pide por WhatsApp.', [('Pide', 14.16), ('por', 14.43), ('WhatsApp', 14.72)], 14.96),
    ('L7', 1044, 'Maison Rose. San Jerónimo.', [('Maison', 15.34), ('Rose', 15.90), ('San', 16.51), ('Jerónimo', 16.80)], 17.39),
    ('L8', 1218, 'Tu página, desde mil pesos.', [('Tu', 17.66), ('página', 17.85), ('desde', 18.44), ('mil', 18.85), ('pesos', 19.20)], 19.67),
]
SECCIONES = [('golpe', 0), ('pliegues', 30), ('revelacion', 120), ('telefono', 180), ('galletas', 360), ('muro', 540),
             ('pasteles', 720), ('whatsapp', 900), ('cierre', 1020), ('endcard', 1200)]


def decode(path):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def main():
    toma = decode(TOMA)
    total = FRAMES / FPS
    stem = np.zeros(int(total * SR) + SR, dtype=np.float32)
    voz = []
    pre, post = 0.04, 0.22
    for vid, f, texto, palabras, fin in FRASES:
        ini = palabras[0][1]
        a, b = int((ini - pre) * SR), min(len(toma), int((fin + post) * SR))
        seg = toma[a:b].copy()
        fi, fo = int(0.006 * SR), int(0.09 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fo:] *= np.linspace(1, 0, fo) ** 2
        at = int(round((f / FPS - pre) * SR))
        stem[at:at + len(seg)] += seg
        ws = [{'w': w, 'f': int(round(f + (t - ini) * FPS))} for w, t in palabras]
        voz.append({'id': vid, 'f': f, 'texto': texto, 'toma': {'ini': ini, 'fin': fin}, 'dur': round(fin - ini, 2),
                    'termina_f': int(round(f + (fin - ini) * FPS)), 'palabras': ws})
    for a, b in zip(voz, voz[1:]):
        assert a['termina_f'] < b['f'], (a['id'], 'se encima con', b['id'])
    stem = stem[:int(total * SR)]
    raw = ROOT / 'voz' / '_cruda.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s24le', str(raw)], input=stem.tobytes(), check=True)
    chain = 'highpass=f=80:poles=2,deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=-22dB:ratio=2.2:attack=6:release=90:makeup=2'
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(raw), '-af', chain + ',loudnorm=I=-16:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = (f"loudnorm=I=-16:TP=-2:LRA=7:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    out = ROOT / 'voz' / 'voz_stem_48k.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', chain + ',' + ln, '-ar', str(SR), '-c:a', 'pcm_s24le', str(out)], check=True)
    raw.unlink()
    TL.write_text(json.dumps({'fps': FPS, 'frames': FRAMES, 'bpm': BPM, 'secciones': [{'id': s, 'f': f} for s, f in SECCIONES], 'voz': voz}, ensure_ascii=False, indent=1) + '\n')
    for v in voz:
        print(v['id'], f"f{v['f']}→f{v['termina_f']}", ' '.join(f"{w['w']}@f{w['f']}" for w in v['palabras']))


if __name__ == '__main__':
    main()
