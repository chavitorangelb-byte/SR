#!/usr/bin/env python3
"""Bloquea la voz de Cata Café a la línea de tiempo (60 fps, 120 BPM).

- Corta la toma en frases (bordes medidos con energía a −45 dB) y coloca cada una en su cuadro.
- Calcula el cuadro de cada palabra con voz/fuente/toma1_palabras.json (transcripción con marcas por palabra).
- Escribe brief/timeline.json, voz/voz_stem_48k.wav (−16 LUFS) y voz/preview_voz_pulso.mp3.
"""
import json, re, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
TOMA = ROOT / 'voz/fuente/toma1_hope_eleven_v4.mp3'
SR, FPS, FRAMES = 48000, 60, 1080

# id, cuadro de entrada, (inicio, fin) en la toma, texto
LINEAS = [
    ('L1', 24, (0.126, 3.109), 'Todo buen café empieza con un solo trazo.'),
    ('L2', 237, (3.777, 6.252), 'Y tu negocio, con una página que lo cuente.'),
    ('L3', 417, (6.914, 11.532), 'Tus métodos, tu café en grano y tu tarjeta de puntos, ahora en el celular.'),
    ('L4', 726, (22.909, 24.421), 'Así se vería Cata Café.'),  # versión corta de reserva
    ('L5', 840, (14.773, 16.861), 'Si te gusta, la hacemos realidad.'),
]
SECCIONES = [
    ('hook', 'Hook', 0, 'sub grave y pad'), ('encabezado', 'Encabezado', 120, ''),
    ('metodos', 'Métodos', 240, 'entra el pluck'), ('grano', 'Café en grano o molido', 360, ''),
    ('tarjeta', 'Cliente frecuente', 480, 'entra el shaker'), ('revelacion', 'Revelación', 600, 'riser f660–719'),
    ('pedido', 'Pedido, horario y ubicación', 720, 'lift pleno en f720'),
    ('cierre', 'Cierre', 840, 'respiro f840–899, golpe grave en f960'), ('end', 'End card', 960, 'cola del golpe'),
]


def decode(p):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def main():
    x = decode(TOMA)
    words = json.loads((ROOT / 'voz/fuente/toma1_palabras.json').read_text())['palabras']
    out = np.zeros(FRAMES * SR // FPS, dtype=np.float32)
    voz = []
    for lid, f, (a, b), texto in LINEAS:
        pad = 0.03
        seg = x[int((a - pad) * SR):int((b + 0.12) * SR)].copy()
        n = int(0.02 * SR)
        seg[:n] *= np.linspace(0, 1, n); seg[-n:] *= np.linspace(1, 0, n)
        i0 = int((f / FPS - pad) * SR)
        m = min(len(seg), len(out) - i0)
        out[i0:i0 + m] += seg[:m]
        off = f / FPS - a
        ws = [w for w in words if a - 0.35 <= w['ini'] < b - 0.02]
        toks = texto.split()
        # la transcripción junta "Cata Café" en una palabra
        if len(ws) != len(toks):
            toks = re.sub(r'Cata Café', 'Cata\u00a0Café', texto).split(' ')
        assert len(ws) == len(toks), (lid, [w['w'] for w in ws], toks)
        pal = [{'w': t.strip('.,¿?'), 'f': max(f, round((w['ini'] + off) * FPS))} for t, w in zip(toks, ws)]
        fin = round((b + off) * FPS)
        voz.append({'id': lid, 'f': f, 'texto': texto, 'toma': {'ini': a, 'fin': b}, 'dur': round(b - a, 3),
                    'termina_f': fin, 'palabras': pal})
        print(lid, f'f{f}→f{fin}', f'{b - a:.2f}s', ' '.join(f"{p['w']}@f{p['f']}" for p in pal))
    secs = [{'id': i, 'nombre': n, 'f': f, 'fin': (SECCIONES[k + 1][2] if k + 1 < len(SECCIONES) else FRAMES) - 1, 'musica': m}
            for k, (i, n, f, m) in enumerate(SECCIONES)]
    (ROOT / 'brief/timeline.json').write_text(json.dumps(
        {'fps': FPS, 'bpm': 120, 'frames': FRAMES, 'secciones': secs, 'voz': voz}, ensure_ascii=False, indent=1))

    raw = ROOT / 'voz/_raw.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', str(raw)],
                   input=out.tobytes(), check=True)
    chain = 'highpass=f=80,acompressor=threshold=-22dB:ratio=2.2:attack=8:release=140:makeup=1'
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(raw), '-af', chain + ',ebur128', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])
    gain = -16.0 - lufs
    # segunda pasada: el limitador cambia el nivel, se corrige midiendo el resultado
    r2 = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(raw), '-af', f'{chain},volume={gain:.2f}dB,alimiter=limit=0.84:level=0,ebur128',
                         '-f', 'null', '-'], capture_output=True, text=True).stderr
    gain += -16.0 - float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r2)[-1])
    stem = ROOT / 'voz/voz_stem_48k.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', f'{chain},volume={gain:.2f}dB,alimiter=limit=0.84:level=0',
                    '-c:a', 'pcm_s24le', str(stem)], check=True)
    raw.unlink()
    print(f'voz: {lufs:.1f} LUFS → −16 (ganancia {gain:+.1f} dB)')

    # pulso suave a 120 BPM con acento en cada compás
    t = np.arange(len(out)) / SR
    pulso = np.zeros_like(out)
    for k in range(int(FRAMES / FPS * 2)):
        i = int(k * 0.5 * SR); n = int(0.09 * SR)
        fq, amp = (660, 0.10) if k % 4 == 0 else (440, 0.05)
        tt = np.arange(n) / SR
        pulso[i:i + n] += amp * np.sin(2 * np.pi * fq * tt) * np.exp(-tt * 45)
    pw = ROOT / 'voz/_pulso.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', str(pw)],
                   input=pulso.astype(np.float32).tobytes(), check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(stem), '-i', str(pw), '-filter_complex',
                    'amix=inputs=2:normalize=0', '-b:a', '192k', str(ROOT / 'voz/preview_voz_pulso.mp3')], check=True)
    pw.unlink()


if __name__ == '__main__':
    main()
