#!/usr/bin/env python3
"""Música original en código para Sella Eventos (100 BPM, Re mayor, 27 s). Todo sintetizado aquí con numpy/scipy.

Capas por sección: pad cálido (0.0) → pulso de marimba (4.8) → bajo y shaker (7.2) → palmas suaves (12.0)
→ arpegio de campanas (16.8) → lift (19.2) → respiro (21.6–24.0) → golpe grave y cola (24.0), cierre en 26.6.
Salida: audio/build/musica_stem.wav (48 kHz estéreo, sin ducking).
"""
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'build'
OUT.mkdir(parents=True, exist_ok=True)
SR, BPM = 48000, 100
BEAT = 60 / BPM
BAR = 4 * BEAT
DUR = 27.0
N = int(DUR * SR)
rng = np.random.default_rng(449)
T_LIFT, T_RESP, T_FIN, T_CIERRE = 19.2, 21.6, 24.0, 26.6
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'])}
m = lambda s: 12 * (int(s[-1]) + 1) + NOTE[s[:-1]]
hz = lambda k: 440.0 * 2 ** ((k - 69) / 12)

# (compás, tiempo, duración en tiempos, bajo, voces)
ACORDES = [
    (1, 0, 4, 'D2', ['F#3', 'A3', 'C#4', 'E4']),    # Dmaj9
    (2, 0, 4, 'B1', ['D3', 'F#3', 'A3', 'C#4']),    # Bm9
    (3, 0, 4, 'G1', ['B3', 'D4', 'F#4', 'A4']),     # Gmaj9
    (4, 0, 2, 'A1', ['D4', 'E4', 'A4']),            # Asus4
    (4, 2, 2, 'A1', ['C#4', 'E4', 'A4']),           # A
    (5, 0, 4, 'D2', ['F#3', 'A3', 'D4', 'E4']),     # Dadd9
    (6, 0, 4, 'F#1', ['A3', 'D4', 'F#4', 'A4']),    # D/F#
    (7, 0, 4, 'G1', ['B3', 'D4', 'F#4', 'A4']),     # Gmaj7
    (8, 0, 2, 'E2', ['G3', 'B3', 'D4', 'F#4']),     # Em9
    (8, 2, 2, 'A1', ['G3', 'C#4', 'E4', 'A4']),     # A7
    (9, 0, 2, 'D2', ['F#3', 'A3', 'D4', 'F#4']),    # D (lift)
    (9, 2, 2, 'B1', ['F#3', 'A3', 'D4', 'F#4']),    # Bm7
    (10, 0, 4, 'G1', ['B3', 'D4', 'A4']),           # Gadd9 (respiro)
    (11, 0, 5, 'D1', ['F#3', 'A3', 'D4', 'E4']),    # Dadd9 (golpe y cola)
]
t_of = lambda bar, beat: (bar - 1) * BAR + beat * BEAT


def put(out, x, t, g=1.0, pan=0.0):
    i0 = int(t * SR)
    if i0 >= N or i0 < 0: return
    n = min(len(x), N - i0)
    out[i0:i0 + n, 0] += x[:n] * g * np.sqrt(0.5 * (1 - pan)) * 1.414
    out[i0:i0 + n, 1] += x[:n] * g * np.sqrt(0.5 * (1 + pan)) * 1.414


def lp(x, f, o=2):
    b, a = signal.butter(o, f / (SR / 2), 'low'); return signal.lfilter(b, a, x, axis=0)


def hp(x, f, o=2):
    b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x, axis=0)


def pad():
    out = np.zeros((N, 2))
    for bar, beat, beats, bass, voces in ACORDES:
        t0, dur = t_of(bar, beat), beats * BEAT + 0.5
        if bar == 11: dur = DUR - t0
        n = int(dur * SR); tt = np.arange(n) / SR
        env = np.clip(tt / 0.5, 0, 1) * np.clip((dur - tt) / 0.7, 0, 1)
        for v in voces:
            f = hz(m(v))
            for c, det in ((0, -0.004), (1, 0.004)):
                x = sum(np.sin(2 * np.pi * f * (1 + det) * h * tt + rng.uniform(0, 6.28)) / h ** 1.6 for h in (1, 2, 3, 4))
                i0 = int(t0 * SR); k = min(n, N - i0)
                out[i0:i0 + k, c] += (x * env)[:k] * 0.1
    return lp(out, 1800)


def marimba(f, dur=0.5, brillo=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9) + brillo * 0.35 * np.sin(2 * np.pi * f * 3.93 * tt) * np.exp(-tt * 30) + 0.12 * np.sin(2 * np.pi * f * 9.5 * tt) * np.exp(-tt * 60)
    return x * np.clip(tt / 0.002, 0, 1)


def pulso():
    out = np.zeros((N, 2))
    pat = [0, 2, 1, 3, 2, 1, 3, 2]
    for bar, beat, beats, bass, voces in ACORDES:
        if bar < 3 or bar >= 10: continue
        notas = [m(v) for v in voces]
        for i in range(beats * 2):
            t = t_of(bar, beat) + i * BEAT / 2
            if t >= T_RESP: break
            k = notas[pat[i % 8] % len(notas)] + (12 if i % 4 == 2 else 0)
            put(out, marimba(hz(k), 0.5, 1.2 if bar >= 9 else 0.9), t + rng.normal(0, 0.003), (0.2 if i % 2 == 0 else 0.13) * (1.25 if bar >= 9 else 1), 0.25 * np.sin(i * 1.7))
    return out


def campana(f, dur=1.6):
    n = int(dur * SR); tt = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * 3.5 * tt) * np.exp(-tt * 7) * 2.2
    return np.sin(2 * np.pi * f * tt + mod) * np.exp(-tt * 3.4) * np.clip(tt / 0.002, 0, 1)


def campanas():
    out = np.zeros((N, 2))
    for bar, beat, beats, bass, voces in ACORDES:
        if bar < 8 or bar >= 10: continue
        notas = sorted(m(v) + 12 for v in voces)
        esc = notas + [notas[0] + 12, notas[1] + 12]
        for i in range(beats * 4):
            t = t_of(bar, beat) + i * BEAT / 4
            idx = i % len(esc) if (i // len(esc)) % 2 == 0 else len(esc) - 1 - i % len(esc)
            put(out, campana(hz(esc[idx])), t, 0.07 + 0.03 * (i % 4 == 0), 0.5 * np.sin(i * 0.9))
    # notas sueltas en el respiro y brillo final
    for t, nt in ((21.6, 'A5'), (22.2, 'D6'), (22.8, 'F#5'), (23.4, 'E6'), (24.0, 'D6'), (24.02, 'A5'), (24.04, 'F#6')):
        put(out, campana(hz(m(nt)), 2.4), t, 0.1, 0.2)
    return out


def bajo():
    out = np.zeros((N, 2))
    for bar, beat, beats, bass, voces in ACORDES:
        if bar < 4 or bar >= 10: continue
        for b, largo in ((0, 1.4), (1.5, 0.45), (2, 1.4), (3.5, 0.45)):
            if b >= beats: continue
            t = t_of(bar, beat + b)
            if t >= T_RESP: continue
            n = int(largo * BEAT * SR); tt = np.arange(n) / SR; f = hz(m(bass) + (12 if m(bass) < m('E2') else 0))
            x = np.tanh(1.2 * (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt))) * np.clip(tt / 0.012, 0, 1) * np.exp(-tt * 2.2) * np.clip((n / SR - tt) / 0.05, 0, 1)
            put(out, x, t, 0.34)
    return lp(out, 320)


def percusion():
    out = np.zeros((N, 2))
    bb, ab = signal.butter(2, [5000 / (SR / 2), 12000 / (SR / 2)], 'band')
    bc, ac = signal.butter(2, [900 / (SR / 2), 3200 / (SR / 2)], 'band')
    t, k = 7.2, 0
    acc = [0.6, 0.25, 0.9, 0.3]
    while t < T_RESP:   # shaker en semicorcheas
        n = int(0.06 * SR); e = np.exp(-np.arange(n) / (0.011 * SR)) * (1 - np.exp(-np.arange(n) / (0.0015 * SR)))
        put(out, signal.lfilter(bb, ab, rng.standard_normal(n) * e), t + rng.normal(0, 0.003), 0.05 * acc[k % 4] * (1.3 if t >= T_LIFT else 1), 0.3)
        t += BEAT / 4; k += 1
    t = 12.0 + BEAT
    while t < T_RESP:   # palmas suaves en 2 y 4
        n = int(0.16 * SR); x = np.zeros(n)
        for off in (0, 0.009, 0.019):
            i = int(off * SR); x[i:] += rng.standard_normal(n - i) * np.exp(-np.arange(n - i) / (0.02 * SR))
        put(out, signal.lfilter(bc, ac, x), t, 0.045 * (1.4 if t >= T_LIFT else 1), -0.15)
        t += 2 * BEAT
    t = T_LIFT
    while t < T_RESP:   # bombo de fieltro en negras durante el lift
        n = int(0.3 * SR); tt = np.arange(n) / SR
        put(out, np.sin(2 * np.pi * np.cumsum(48 + 60 * np.exp(-tt * 40)) / SR) * np.exp(-tt * 14), t, 0.42)
        t += BEAT
    return out


def golpes():
    out = np.zeros((N, 2))
    def sub(dur, f0, caida, tau):
        n = int(dur * SR); tt = np.arange(n) / SR
        return np.sin(2 * np.pi * np.cumsum(f0 + caida * np.exp(-tt * 8)) / SR) * np.exp(-tt / tau)
    put(out, sub(1.6, 40, 40, 0.5), 0.0, 0.8)                 # golpe del gancho
    n = int(1.2 * SR); u = np.arange(n) / n                   # riser hacia el lift
    put(out, (hp(rng.standard_normal(n), 2500) * 0.12 + np.sin(2 * np.pi * np.cumsum(300 + 1100 * u ** 2) / SR) * 0.12) * u ** 2.2, T_LIFT - 1.2, 0.8)
    put(out, sub(0.7, 44, 50, 0.22), T_LIFT, 0.7)
    put(out, sub(3.0, 37, 24, 0.9), T_FIN, 0.95)              # golpe grave de la end card
    put(out, sub(0.9, 37, 30, 0.25), T_CIERRE, 0.8)           # corte final
    return out


def reverb(x, mezcla=0.22, sec=2.2):
    n = int(sec * SR); tt = np.arange(n) / SR; wet = np.zeros_like(x)
    for c in range(2):
        ir = lp(rng.standard_normal(n) * np.exp(-tt * 6.9 / sec), 6000, 1); ir /= np.sqrt((ir ** 2).sum())
        wet[:, c] = signal.fftconvolve(x[:, c], ir)[:N]
    return x + wet * mezcla


def nivel(x, db):
    mono = np.abs(x).max(axis=1); sel = x[mono > mono.max() * 0.05]
    return x * (10 ** (db / 20) / max(np.sqrt((sel ** 2).mean()), 1e-9))


def main():
    t = np.arange(N) / SR
    resp = np.where(t < T_RESP, 1.0, np.where(t < T_FIN, 0.45 + 0.55 * np.exp(-(t - T_RESP) / 0.25), 1.0))[:, None]   # el pad adelgaza en el respiro
    entra = (0.55 + 0.45 * np.clip((t - 4.8) / 2.4, 0, 1))[:, None]
    mez = nivel(pad(), -27) * resp * entra + nivel(pulso(), -27) + nivel(campanas(), -28) + nivel(bajo(), -29) + nivel(percusion(), -33)
    mez = reverb(mez) + golpes() * 0.5
    mez = hp(mez, 30)
    mez *= np.clip(t / 0.02, 0, 1)[:, None] * np.clip((DUR - t) / 0.35, 0, 1)[:, None]
    out = OUT / 'musica_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(out)], input=mez.astype(np.float32).tobytes(), check=True)
    print(out, f'pico {20 * np.log10(np.abs(mez).max()):.1f} dBFS')


if __name__ == '__main__':
    main()
