#!/usr/bin/env python3
"""Fase 3: bloquea la voz a la línea de tiempo.

- Corta la toma de ElevenLabs en sus 6 frases con los cortes medidos (energía a −50 dBFS, pausas de 90 ms o más).
- Coloca cada frase en su cuadro (brief/timeline.json → voz[].f). En L6 la pausa entre “Jumpers Fest.” y
  “Así se vería con Elevate.” se acorta de 0.32 a 0.26 s (no se acelera la voz).
- Calcula el cuadro de cada palabra. Los inicios salen de la toma: Whisper medium como guía
  (voz/fuente/toma1_palabras_whisper.json) y corregidos a mano con la envolvente de energía, porque
  Whisper se desfasa hasta 0.26 s (ver review/fase3/envolvente_palabras.jpg).
- Procesa la voz (pasa altos, de-esser, compresión suave) a −16 LUFS: voz/voz_stem_48k.wav.
- Escribe voz/voz_bloqueada.json (lo lee tools/brief.mjs) y voz/preview_voz_pulso.mp3 (voz sobre un pulso a 112 BPM).
Uso: python3 tools/voz.py
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
TL = ROOT / 'brief' / 'timeline.json'
TOMA = ROOT / 'voz' / 'fuente' / 'toma1_hope_eleven_v4.mp3'
SR = 48000
GAP_L6 = 0.26  # pausa entre “Jumpers Fest.” y “Así se vería con Elevate.” (en la toma: 0.32 s)

# Por frase: tramos de la toma (s) y el inicio de cada palabra en la toma (s).
TOMA_FRASES = {
    'L1': {'tramos': [(0.06, 2.71)], 'palabras': [('Alguien', 0.06), ('está', 0.46), ('organizando', 0.66), ('una', 1.20), ('fiesta', 1.44), ('en', 1.80), ('Aguascalientes.', 1.90)]},
    'L2': {'tramos': [(3.08, 4.12)], 'palabras': [('Que', 3.08), ('te', 3.28), ('encuentre', 3.50), ('a', 3.86), ('ti.', 3.96)]},
    'L3': {'tramos': [(4.63, 7.38)], 'palabras': [('Tus', 4.63), ('inflables,', 4.86), ('con', 5.88), ('foto,', 6.07), ('para', 6.82), ('elegir.', 6.96)]},
    'L4': {'tramos': [(7.88, 9.81)], 'palabras': [('Y', 7.88), ('su', 8.00), ('fecha,', 8.16), ('apartada', 8.68), ('en', 9.16), ('un', 9.30), ('mensaje.', 9.46)]},
    'L5': {'tramos': [(10.29, 13.07)], 'palabras': [('Diversión', 10.29), ('y', 10.86), ('elegancia,', 10.92), ('en', 11.78), ('una', 12.06), ('sola', 12.36), ('página.', 12.60)]},
    'L6': {'tramos': [(13.43, 14.30), (14.62, 16.34)], 'palabras': [('Jumpers', 13.43), ('Fest.', 13.88), ('Así', 14.62), ('se', 15.04), ('vería', 15.28), ('con', 15.52), ('Elevate.', 15.78)]},
}


def decode(path):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def write_wav(path, x, sr=SR):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-c:a', 'pcm_s24le', str(path)],
                   input=x.astype(np.float32).tobytes(), check=True)


def main():
    tl = json.loads(TL.read_text())
    fps = tl['fps']
    total = tl['frames'] / fps
    toma = decode(TOMA)
    stem = np.zeros(int(round(total * SR)) + SR, dtype=np.float32)
    pre, post = 0.03, 0.20
    out = []
    for v in tl['voz']:
        fz = TOMA_FRASES[v['id']]
        start = v['f'] / fps
        # dónde cae cada tramo en el video
        pos, t_video = [], start
        for k, (a, b) in enumerate(fz['tramos']):
            if k:
                t_video += GAP_L6
            pos.append((a, b, t_video))
            t_video += b - a
        for a, b, tv in pos:
            i0, i1 = max(0, int((a - pre) * SR)), min(len(toma), int((b + post) * SR))
            seg = toma[i0:i1].copy()
            fi, fo = int(0.006 * SR), int(0.09 * SR)
            seg[:fi] *= np.linspace(0, 1, fi)
            seg[-fo:] *= np.linspace(1, 0, fo) ** 2
            at = int(round((tv - pre) * SR))
            stem[at:at + len(seg)] += seg

        def video_t(t):
            for a, b, tv in pos:
                if a - 0.05 <= t <= b + 0.05:
                    return tv + (t - a)
            raise SystemExit(f"{v['id']}: {t} fuera de los tramos")

        fin_video = pos[-1][2] + (pos[-1][1] - pos[-1][0])
        ws = fz['palabras']
        palabras = []
        for i, (w, t) in enumerate(ws):
            t_end = ws[i + 1][1] if i + 1 < len(ws) else fz['tramos'][-1][1]
            # una palabra no termina dentro de la pausa siguiente
            for a, b, _ in pos:
                if a <= t <= b:
                    t_end = min(t_end, b)
            palabras.append({'w': w, 'f': int(round(video_t(t) * fps)), 'fin': int(round(video_t(t_end) * fps))})
        texto = ' '.join(w for w, _ in ws)
        if texto != v['texto']:
            raise SystemExit(f"{v['id']}: las palabras no forman el guion: «{texto}» ≠ «{v['texto']}»")
        out.append({**{k: v[k] for k in ('id', 'f', 'texto', 'max', 'brief') if k in v},
                    'toma': [{'ini': a, 'fin': b} for a, b, _ in pos], 'dur': round(fin_video - start, 3),
                    'termina_f': int(round(fin_video * fps)), 'palabras': palabras})

    stem = stem[:int(round(total * SR))]
    raw = ROOT / 'voz' / '_voz_cruda.wav'
    write_wav(raw, stem)
    chain = 'highpass=f=80:poles=2,deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=-22dB:ratio=2.2:attack=6:release=90:makeup=2'
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(raw), '-af', chain + ',loudnorm=I=-16:TP=-2:LRA=7:print_format=json',
                           '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = (f"loudnorm=I=-16:TP=-2:LRA=7:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    stem_path = ROOT / 'voz' / 'voz_stem_48k.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', chain + ',' + ln, '-ar', str(SR), '-c:a', 'pcm_s24le', str(stem_path)], check=True)
    raw.unlink()

    # Vista previa: voz + pulso suave a 112 BPM (tiempo fuerte de cada compás más marcado).
    # El pulso se detiene en el respiro (23.0 s) y vuelve con el golpe de la end card (24.0 s).
    n = int(round(total * SR))
    pulso = np.zeros(n, dtype=np.float32)
    beat = 60 / tl['bpm']
    tiempos = [k * beat for k in range(44)] + [24.0 + k * beat for k in range(int((total - 24.0) / beat) + 1)]
    for k, tb in enumerate(tiempos):
        fuerte = (k % 4 == 0) if tb < 23.5 else ((k - 44) % 4 == 0)
        i = int(tb * SR)
        L = int(0.06 * SR)
        tt = np.arange(L) / SR
        click = np.sin(2 * np.pi * (880 if fuerte else 660) * tt) * np.exp(-tt * 70) * (0.22 if fuerte else 0.12)
        pulso[i:i + L] += click[:max(0, min(L, n - i))]
    voz = decode(stem_path)[:n]
    mezcla = np.zeros(n, dtype=np.float32)
    mezcla[:len(voz)] += voz
    mezcla += pulso
    prev = ROOT / 'voz' / 'preview_voz_pulso.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '192k', str(prev)],
                   input=mezcla.astype(np.float32).tobytes(), check=True)

    (ROOT / 'voz' / 'voz_bloqueada.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))
    lufs = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(stem_path), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    il = [l for l in lufs.splitlines() if l.strip().startswith('I:')][-1].strip()
    pk = [l for l in lufs.splitlines() if l.strip().startswith('Peak:')][-1].strip()
    for v in out:
        print(f"{v['id']} f{v['f']}–f{v['termina_f']} ({v['dur']:.2f} s): " + ' · '.join(f"{p['w']} f{p['f']}" for p in v['palabras']))
    print(f'voz/voz_stem_48k.wav · {il} · {pk} · voz/preview_voz_pulso.mp3 · voz/voz_bloqueada.json')


if __name__ == '__main__':
    main()
