#!/usr/bin/env python3
"""Bloquea la voz a la línea de tiempo.

- Corta la toma de ElevenLabs en sus 9 frases (inicio/fin medidos en la toma).
- Coloca cada frase en su cuadro de brief/timeline.json (voz[].f).
- Calcula el cuadro de cada palabra (transcripción con marcas por palabra) y lo guarda en el timeline.
- Procesa la voz (pasa altos, de-esser, compresión suave) y la deja en −16 LUFS: voz/voz_stem_48k.wav.
- Genera voz/preview_voz_pulso.mp3: la voz en su lugar sobre un pulso suave al BPM del timeline.
"""
import json
import subprocess
import unicodedata
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent  # carpeta claudia/
TL = ROOT / 'brief' / 'timeline.json'
TOMA = ROOT / 'voz' / 'fuente' / 'toma1_hope_eleven_v4.mp3'
PALABRAS = ROOT / 'voz' / 'fuente' / 'toma1_palabras.json'
SR = 48000

# Inicio y fin de cada frase en la toma (s), medidos con energía a −40 dB respecto al pico.
CORTES = [(0.12, 2.64), (3.11, 4.47), (4.86, 9.12), (9.36, 11.66), (11.95, 14.67), (14.99, 16.63), (16.92, 18.93), (19.18, 20.89), (21.22, 22.91)]


def norm(w):
    w = unicodedata.normalize('NFKD', w.lower())
    return ''.join(c for c in w if c.isalnum())


def decode(path):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def write_wav(path, x, sr=SR):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-',
                    '-c:a', 'pcm_s24le', str(path)], input=x.astype(np.float32).tobytes(), check=True)


def main():
    tl = json.loads(TL.read_text())
    fps, total = tl['fps'], tl['total_f'] / tl['fps']
    toma = decode(TOMA)
    words = json.loads(PALABRAS.read_text())['palabras']

    stem = np.zeros(int(round(total * SR)) + SR, dtype=np.float32)
    pre, post = 0.04, 0.22
    for v, (ini, fin) in zip(tl['voz'], CORTES):
        start = v['f'] / fps
        a = max(0, int((ini - pre) * SR))
        b = min(len(toma), int((fin + post) * SR))
        seg = toma[a:b].copy()
        fi, fo = int(0.006 * SR), int(0.09 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fo:] *= np.linspace(1, 0, fo) ** 2
        at = int(round((start - pre) * SR))
        stem[at:at + len(seg)] += seg
        v['toma'] = {'ini': ini, 'fin': fin}
        v['dur'] = round(fin - ini, 3)
        v['termina_f'] = int(round((start + fin - ini) * fps))
        # palabras de esta frase
        ws = [w for w in words if ini - 0.2 <= w['start'] < fin + 0.05]
        # Alinea la transcripción con las palabras del guion (la transcripción a veces parte o escribe distinto).
        asr = [(norm(w['w']), w) for w in ws]
        v['palabras'] = []
        k = 0
        for token in v.get('dicho', v['texto']).split():
            target, acc, first, last = norm(token), '', None, None
            while k < len(asr) and len(acc) < len(target):
                acc += asr[k][0]
                first = first or asr[k][1]
                last = asr[k][1]
                k += 1
            if acc != target:
                raise SystemExit(f"{v['id']}: no coincide “{token}” con la transcripción ({acc})")
            f0 = int(round((start + max(first['start'], ini) - ini) * fps))
            f1 = int(round((start + last['end'] - ini) * fps))
            v['palabras'].append({'w': token, 'f': f0, 'fin': f1})
        if k != len(asr):
            raise SystemExit(f"{v['id']}: sobran palabras transcritas: {[a[0] for a in asr[k:]]}")

    stem = stem[:int(round(total * SR))]
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

    # Vista previa: voz + pulso suave al BPM del timeline (tiempo fuerte de cada compás más marcado)
    n = int(round(total * SR))
    click = np.zeros(n, dtype=np.float32)
    beat = 60 / tl['bpm']
    t = np.arange(int(0.05 * SR)) / SR
    for k in range(int(total / beat) + 1):
        at = int(k * beat * SR)
        if at >= n:
            break
        strong = k % 4 == 0
        tone = np.sin(2 * np.pi * (1320 if strong else 880) * t) * np.exp(-t * 90) * (0.16 if strong else 0.08)
        click[at:at + len(tone)] += tone[: n - at]
    voz = decode(out)[:n]
    mix = voz + click[: len(voz)]
    tmp = ROOT / 'voz' / '_prev.wav'
    write_wav(tmp, mix)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'libmp3lame', '-b:a', '192k', str(ROOT / 'voz' / 'preview_voz_pulso.mp3')], check=True)
    tmp.unlink()

    TL.write_text(json.dumps(tl, ensure_ascii=False, indent=2) + '\n')
    stats = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(out), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
    summary = stats[stats.rindex('Summary'):]
    print(' '.join(l.strip() for l in summary.splitlines() if l.strip().startswith(('I:', 'Peak:'))))
    for v in tl['voz']:
        print(v['id'], f"f{v['f']}→f{v['termina_f']}", f"{v['dur']:.2f}s", ' '.join(f"{w['w']}@f{w['f']}" for w in v['palabras']))


if __name__ == '__main__':
    main()
