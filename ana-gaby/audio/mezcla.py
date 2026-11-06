#!/usr/bin/env python3
"""Mezcla final del video de Ana Gaby Repostería.

- Voz ~−16 LUFS (stem ya normalizado, mono al centro).
- Música con ducking por PALABRA: en cada palabra, la música (ventana de 400 ms, ponderación K) queda al menos
  12 dB por debajo del nivel de esa palabra (objetivo 14 dB, con anticipación de 250 ms).
- SFX: nivel de diseño de sfx.py; bajan 2 dB mientras hay voz.
- Master −14 LUFS integrado, techo −1.25 dBTP (limitador de pico verdadero con sobremuestreo ×4, techo −1.45).

Entradas: voz/voz_stem_48k.wav, audio/build/musica_stem.wav, audio/build/sfx_stem.wav
Salidas:  audio/build/mezcla_master.wav, audio/build/stems/{voz,musica,sfx}.wav (suman el master antes del limitador)
          y audio/build/mezcla.json (mediciones).
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d

ROOT = Path(__file__).resolve().parent.parent
B = ROOT / 'audio' / 'build'
(B / 'stems').mkdir(parents=True, exist_ok=True)
SR = 48000
TL = json.loads((ROOT / 'brief' / 'timeline.json').read_text())
FPS = TL['fps']
N = int(TL['frames'] / FPS * SR)
MUSICA_DB = 4.5    # la música fuera de la voz (respecto a su stem)
SFX_DB = -1.0      # los SFX respecto a su diseño
SFX_SEP = 6.0      # los SFX al menos 6 dB bajo cada palabra (objetivo 7.5)
SFX_DUCK_MIN = -1.5
SEP = 12.0         # la música al menos 12 dB bajo cada palabra
MARGEN = 2.0       # objetivo: 14 dB
DUCK_MIN = -4.0    # mientras hay voz, la música baja al menos esto


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
    """Aproximación al filtro K (BS.1770): pasa altos y estante agudo +4 dB."""
    b1, a1 = signal.butter(2, 60 / (SR / 2), 'high')
    y = signal.lfilter(b1, a1, x, axis=0)
    b2, a2 = signal.butter(1, 1500 / (SR / 2), 'high')
    return y + 0.585 * signal.lfilter(b2, a2, y, axis=0)


def short_term(x, win=0.4, hop=0.01):
    """Nivel (dB, ~LUFS) en ventanas de 400 ms cada 10 ms."""
    k = kweight(x)
    p = (k ** 2).sum(axis=1)
    w, h = int(win * SR), int(hop * SR)
    c = np.concatenate([[0], np.cumsum(p)])
    idx = np.arange(0, N, h)
    a = np.clip(idx - w // 2, 0, N)
    b = np.clip(idx + w // 2, 0, N)
    ms = (c[b] - c[a]) / np.maximum(b - a, 1)
    return idx, 10 * np.log10(ms + 1e-12) - 0.691


def lufs_tp(p):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = r[r.rindex('Summary'):]
    i = float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1))
    tp = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))
    return i, tp


def limiter_tp(x, ceil_db=-1.45, os=4):
    """Limitador de pico verdadero: sobremuestreo ×4, envolvente con anticipación y liberación suave."""
    up = signal.resample_poly(x, os, 1, axis=0)
    thr = 10 ** (ceil_db / 20)
    peak = np.abs(up).max(axis=1)
    g = np.minimum(1.0, thr / np.maximum(peak, 1e-9))
    look = int(0.0015 * SR * os)
    g = minimum_filter1d(g, size=2 * look + 1)
    rel = np.exp(-1 / (0.06 * SR * os))
    out = np.empty_like(g)
    cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else rel * cur + (1 - rel) * g[i]
        out[i] = cur
    y = up * out[:, None]
    return signal.resample_poly(y, 1, os, axis=0)[: len(x)]


def palabras():
    """(texto, inicio s, fin s) de cada palabra; fin = inicio de la siguiente o fin de la frase."""
    out = []
    for v in TL['voz']:
        ps = v['palabras']
        for k, p in enumerate(ps):
            fin = ps[k + 1]['f'] if k + 1 < len(ps) else v['termina_f']
            out.append((p['w'], p['f'] / FPS, fin / FPS))
    return out


def suavizar(need, hop, ataque=0.025, liberacion=0.25):
    g = np.zeros_like(need)
    cur = 0.0
    a_c, r_c = np.exp(-hop / ataque), np.exp(-hop / liberacion)
    for i, n in enumerate(need):
        cur = a_c * cur + (1 - a_c) * n if n < cur else r_c * cur + (1 - r_c) * n
        g[i] = cur
    return g


def main():
    voz_m = load(ROOT / 'voz' / 'voz_stem_48k.wav', 1)[:, 0]
    voz = np.stack([voz_m, voz_m], axis=1) * 10 ** (-3.01 / 20)   # mono al centro, misma sonoridad
    mus = load(B / 'musica_stem.wav', 2) * 10 ** (MUSICA_DB / 20)
    sfx = load(B / 'sfx_stem.wav', 2) * 10 ** (SFX_DB / 20)

    idx, lv = short_term(voz)
    _, lm = short_term(mus)
    ts = idx / SR
    hop = ts[1] - ts[0]
    PAL = palabras()

    # ---- ducking de la música, palabra por palabra ----
    need = np.zeros_like(ts)
    niveles = []
    for w, a, b in PAL:
        sel = (ts >= a) & (ts <= max(b, a + 0.12))
        L = 10 * np.log10(np.mean(10 ** (lv[sel] / 10)))
        niveles.append(L)
        # el ducking empieza 0.35 s antes de la palabra (anticipación) y se sostiene 0.3 s después
        # (la medición de 400 ms alcanza a ver la música que regresa)
        ventana = (ts >= a - 0.35) & (ts <= b + 0.3)
        need[ventana] = np.minimum(need[ventana], np.minimum(DUCK_MIN, (L - SEP - MARGEN) - lm[ventana]))
    g = suavizar(need, hop)
    mus_d = mus * (10 ** (np.interp(np.arange(N), idx, g) / 20))[:, None]

    # ---- SFX: también por palabra, al menos 6 dB bajo cada una ----
    _, ls = short_term(sfx)
    need_s = np.zeros_like(ts)
    for (w, a, b), L in zip(PAL, niveles):
        ventana = (ts >= a - 0.3) & (ts <= b + 0.25)
        need_s[ventana] = np.minimum(need_s[ventana], np.minimum(SFX_DUCK_MIN, (L - SFX_SEP - 1.5) - ls[ventana]))
    gs = suavizar(need_s, hop, 0.02, 0.2)
    sfx_d = sfx * (10 ** (np.interp(np.arange(N), idx, gs) / 20))[:, None]

    # ---- comprobaciones por palabra: música y SFX contra el nivel de la palabra ----
    _, lm2 = short_term(mus_d)
    _, ls2 = short_term(sfx_d)
    reporte = []
    for (w, a, b), L in zip(PAL, niveles):
        sel = (ts >= a) & (ts <= max(b, a + 0.12))
        reporte.append({'palabra': w, 't': round(a, 2), 'voz_dB': round(L, 1), 'musica_bajo_voz_dB': round(float(L - lm2[sel].max()), 1),
                        'sfx_bajo_voz_dB': round(float(L - ls2[sel].max()), 1)})
    peor_m = min(r['musica_bajo_voz_dB'] for r in reporte)
    peor_s = min(r['sfx_bajo_voz_dB'] for r in reporte)

    mezcla = voz + mus_d + sfx_d
    tmp = B / '_pre.wav'
    save(tmp, mezcla)
    i0, _ = lufs_tp(tmp)
    k = 10 ** ((-14.0 - i0) / 20)
    voz, mus_d, sfx_d, mezcla = voz * k, mus_d * k, sfx_d * k, mezcla * k
    master = limiter_tp(mezcla)
    save(B / 'mezcla_master.wav', master)
    i1, tp1 = lufs_tp(B / 'mezcla_master.wav')
    if abs(i1 + 14.0) > 0.15:  # el limitador movió la sonoridad: un ajuste fino y otra pasada
        master = limiter_tp(mezcla * 10 ** ((-14.0 - i1) / 20))
        save(B / 'mezcla_master.wav', master)
        i1, tp1 = lufs_tp(B / 'mezcla_master.wav')
    tmp.unlink()
    save(B / 'stems' / 'voz.wav', voz)
    save(B / 'stems' / 'musica.wav', mus_d)
    save(B / 'stems' / 'sfx.wav', sfx_d)
    iv, _ = lufs_tp(B / 'stems' / 'voz.wav')
    im, _ = lufs_tp(B / 'stems' / 'musica.wav')
    isf, _ = lufs_tp(B / 'stems' / 'sfx.wav')
    res = {'master_LUFS': i1, 'master_TP_dBFS': tp1, 'voz_LUFS': iv, 'musica_LUFS': im, 'sfx_LUFS': isf,
           'musica_bajo_cada_palabra_peor_dB': peor_m, 'sfx_bajo_cada_palabra_peor_dB': peor_s, 'palabras': reporte}
    (B / 'mezcla.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(json.dumps({k: v for k, v in res.items() if k != 'palabras'}))
    malas = [r for r in reporte if r['musica_bajo_voz_dB'] < SEP]
    if malas:
        print('PALABRAS CON MÚSICA A MENOS DE 12 dB:', malas)


if __name__ == '__main__':
    main()
