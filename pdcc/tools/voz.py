#!/usr/bin/env python3
"""Corta la toma en sus 7 frases, las coloca en su cuadro (brief/timeline.json) y deja el stem en −16 LUFS."""
import json, re, subprocess
from pathlib import Path
import numpy as np
R = Path(__file__).resolve().parent.parent
SR = 48000
tl = json.loads((R / 'brief/timeline.json').read_text())
TOMA = R / 'voz/fuente/toma1_adam_eleven_v4.mp3'
def dec(p, af=None):
    c = ['ffmpeg', '-v', 'error', '-i', str(p)] + (['-af', af] if af else []) + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(c, capture_output=True, check=True).stdout, dtype=np.float32).copy()
def wav(p, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s24le', str(p)], input=x.astype(np.float32).tobytes(), check=True)
toma = dec(TOMA, 'highpass=f=75,acompressor=threshold=-20dB:ratio=2.2:attack=8:release=120:makeup=1')
total = tl['frames'] / tl['fps']
stem = np.zeros(int(total * SR), dtype=np.float32)
pre, post = 0.03, 0.12
for v in tl['voz']:
    a, b = int((v['corte'][0] - pre) * SR), int((v['corte'][1] + post) * SR)
    seg = toma[a:b].copy(); fi, fo = int(.005 * SR), int(.08 * SR)
    seg[:fi] *= np.linspace(0, 1, fi); seg[-fo:] *= np.linspace(1, 0, fo) ** 2
    at = int((v['f'] / tl['fps'] - pre) * SR); seg = seg[:len(stem) - at]
    stem[at:at + len(seg)] += seg
    print(v['id'], f"{v['f']/tl['fps']:.2f}–{v['f']/tl['fps'] + v['corte'][1] - v['corte'][0]:.2f} s")
tmp = R / 'voz/_tmp.wav'; wav(tmp, stem)
def lufs(p):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(p), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)[-1])
i, p = lufs(tmp); g = 10 ** ((-16 - i) / 20); stem *= g
wav(R / 'voz/voz_stem_48k.wav', stem); tmp.unlink()
print('stem', lufs(R / 'voz/voz_stem_48k.wav'))
