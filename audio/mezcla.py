#!/usr/bin/env python3
"""Mezcla final: voz (~−16 LUFS), música con ducking (≥ 12 dB bajo cada palabra), SFX; master −14 LUFS / −1.25 dBTP.

Entradas: voz/voz_stem_48k.wav, audio/build/musica_stem.wav, audio/build/sfx_stem.wav
Salidas:  audio/build/mezcla_master.wav y audio/build/stems/{voz,musica,sfx}.wav (suman el master antes del limitador)
Requiere: numpy, scipy.
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
B = ROOT / 'audio' / 'build'
(B / 'stems').mkdir(parents=True, exist_ok=True)
SR = 48000
TL = json.loads((ROOT / 'brief' / 'timeline.json').read_text())
N = int(TL['frames'] / TL['fps'] * SR)
MUSICA_DB = -1.0   # nivel de la música fuera de la voz (respecto a su stem)
SFX_DB = 7.0       # los SFX son transitorios cortos
DUCK_MIN = -5.0    # ducking mínimo mientras hay voz
SEP = 12.0         # la música queda al menos 12 dB bajo la voz


def load(p, ch):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).astype(np.float64)
    out = np.zeros((N, ch))
    out[:min(N, len(x))] = x[:N]
    return out


def save(p, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(x.shape[1]), '-i', '-', '-c:a', 'pcm_s24le', str(p)],
                   input=x.astype(np.float32).tobytes(), check=True)


def kweight(x):
    """Aproximación al filtro K (BS.1770): estante agudo +4 dB y pasa altos."""
    b1, a1 = signal.butter(2, 60 / (SR / 2), 'high')
    y = signal.lfilter(b1, a1, x, axis=0)
    b2, a2 = signal.butter(1, 1500 / (SR / 2), 'high')
    return y + 0.585 * signal.lfilter(b2, a2, y, axis=0)


def short_term(x, win=0.4, hop=0.01):
    """Nivel (dB) en ventanas de 400 ms cada 10 ms, de una señal (N, ch) con ponderación K."""
    k = kweight(x)
    p = (k ** 2).sum(axis=1)
    w, h = int(win * SR), int(hop * SR)
    c = np.concatenate([[0], np.cumsum(p)])
    idx = np.arange(0, N, h)
    a = np.clip(idx - w // 2, 0, N)
    b = np.clip(idx + w // 2, 0, N)
    ms = (c[b] - c[a]) / np.maximum(b - a, 1)
    return idx, 10 * np.log10(ms + 1e-12)


def lufs_tp(p):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = r[r.rindex('Summary'):]
    i = float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1))
    tp = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))
    return i, tp


def limiter_tp(x, ceil_db=-1.4, os=4):
    """Limitador de pico verdadero: sobremuestreo ×4, envolvente con anticipación y liberación suave."""
    up = signal.resample_poly(x, os, 1, axis=0)
    thr = 10 ** (ceil_db / 20)
    peak = np.abs(up).max(axis=1)
    g = np.minimum(1.0, thr / np.maximum(peak, 1e-9))
    look = int(0.0015 * SR * os)
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(g, size=2 * look + 1)
    rel = np.exp(-1 / (0.06 * SR * os))
    out = np.empty_like(g)
    cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else rel * cur + (1 - rel) * g[i]
        out[i] = cur
    y = up * out[:, None]
    return signal.resample_poly(y, 1, os, axis=0)[: len(x)]


def main():
    voz_m = load(ROOT / 'voz' / 'voz_stem_48k.wav', 1)[:, 0]
    voz = np.stack([voz_m, voz_m], axis=1) * 10 ** (-3.01 / 20)   # mono al centro, misma sonoridad
    mus = load(B / 'musica_stem.wav', 2) * 10 ** (MUSICA_DB / 20)
    sfx = load(B / 'sfx_stem.wav', 2) * 10 ** (SFX_DB / 20)

    # ---- ducking por frase: música ≥ 12 dB (objetivo 14) bajo el nivel de cada frase, con anticipación ----
    fps = TL['fps']
    idx, lv = short_term(voz)
    _, lm = short_term(mus)
    ts = idx / SR
    need = np.zeros_like(ts)
    frases = []
    for v in TL['voz']:
        a, b = v['f'] / fps, v['termina_f'] / fps
        sel = (ts >= a) & (ts <= b)
        L = 10 * np.log10(np.mean(10 ** (lv[sel] / 10)))   # nivel energético de la frase
        frases.append((a, b, L))
        w = (ts >= a - 0.15) & (ts <= b + 0.2)
        need[w] = np.minimum(need[w], np.minimum(DUCK_MIN, (L - SEP - 2.0) - lm[w]))
    hop = ts[1] - ts[0]
    la = int(round(0.25 / hop))
    need = np.concatenate([need[la:], np.zeros(la)])
    g = np.zeros_like(need)
    cur = 0.0
    a_c, r_c = np.exp(-hop / 0.025), np.exp(-hop / 0.25)
    for i, n in enumerate(need):
        cur = a_c * cur + (1 - a_c) * n if n < cur else r_c * cur + (1 - r_c) * n
        g[i] = cur
    gain = 10 ** (np.interp(np.arange(N), idx, g) / 20)
    mus_d = mus * gain[:, None]

    # comprobación: durante cada frase, la música (ventana de 400 ms) contra el nivel de la frase
    _, lm2 = short_term(mus_d)
    peor = max(float((lm2[(ts >= a) & (ts <= b)] - L).max()) for a, b, L in frases)

    mezcla = voz + mus_d + sfx
    # master a −14 LUFS
    tmp = B / '_pre.wav'
    save(tmp, mezcla)
    i0, _ = lufs_tp(tmp)
    k = 10 ** ((-14.0 - i0) / 20)
    voz, mus_d, sfx, mezcla = voz * k, mus_d * k, sfx * k, mezcla * k
    master = limiter_tp(mezcla, -1.45)
    save(B / 'mezcla_master.wav', master)
    i1, tp1 = lufs_tp(B / 'mezcla_master.wav')
    if i1 < -14.2:  # el limitador quitó algo de sonoridad: un pequeño ajuste y otra pasada
        master = limiter_tp(mezcla * 10 ** ((-14.0 - i1) / 20), -1.45)
        save(B / 'mezcla_master.wav', master)
        i1, tp1 = lufs_tp(B / 'mezcla_master.wav')
    tmp.unlink()
    save(B / 'stems' / 'voz.wav', voz)
    save(B / 'stems' / 'musica.wav', mus_d)
    save(B / 'stems' / 'sfx.wav', sfx)
    iv, _ = lufs_tp(B / 'stems' / 'voz.wav')
    res = {'master_LUFS': i1, 'master_TP_dBFS': tp1, 'voz_LUFS_en_master': iv, 'voz_LUFS_stem': -16.0, 'musica_menos_voz_peor_dB': round(peor, 1)}
    (B / 'mezcla.json').write_text(json.dumps(res, indent=1))
    print(json.dumps(res))


if __name__ == '__main__':
    main()
