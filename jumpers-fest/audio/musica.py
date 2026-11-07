#!/usr/bin/env python3
"""Música original de Jumpers Fest, hecha en código (27.5 s, 112 BPM, Do mayor).

Pop alegre y limpio: ukulele (cuerda pulsada Karplus-Strong), palmas, bajo redondo y bombo de fieltro.
Una capa nueva por sección: glockenspiel en el catálogo (f257), palmas en "Aparta tu fecha" (f579),
cuerdas en pizzicato en el lift de "Arma tu fiesta" (f900). Se adelgaza en el cierre, respira en 23.0 s
y cierra con un golpe grave suave en 24.0 s y el acorde final.
Todo sale de brief/timeline.json (fps, bpm, cuadros). Salida: audio/build/musica_stem.wav (48 kHz, estéreo).
Requiere numpy y scipy.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
B = ROOT / 'audio' / 'build'
B.mkdir(parents=True, exist_ok=True)
TL = json.loads((ROOT / 'brief' / 'timeline.json').read_text())
SR = 48000
FPS, BPM = TL['fps'], TL['bpm']
TOTAL = TL['frames'] / FPS
N = int(TOTAL * SR)
BEAT = 60 / BPM
BAR = 4 * BEAT
RESPIRO = 43 * BEAT          # 23.04 s: la música se detiene
FINAL = 1440 / FPS           # 24.0 s: golpe grave y acorde final


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_of(bar, beat=0.0):
    return (bar - 1) * BAR + beat * BEAT


# ---------------- instrumentos ----------------
def ks(freq, dur, decay=0.9, bright=0.7, seed=0):
    """Cuerda pulsada (Karplus-Strong) afinada con retardo fraccionario; vectorizada por periodo."""
    n = int(dur * SR)
    P = SR / freq
    Ni = int(P)
    w = P - Ni
    rng = np.random.default_rng(seed)
    exc = rng.uniform(-1, 1, Ni + 1)
    b, a = signal.butter(1, min(0.99, 0.08 + bright * 0.8), 'low')
    exc = signal.lfilter(b, a, exc)
    exc -= exc.mean()
    out = np.zeros(n + Ni + 2)
    out[:Ni + 1] = exc
    g = 10 ** (-3.0 / (decay * freq))  # −60 dB en `decay` segundos
    k = Ni + 1
    while k < n:
        e = min(k + Ni, n)
        out[k:e] = g * ((1 - w) * out[k - Ni:e - Ni] + w * out[k - Ni - 1:e - Ni - 1])
        k = e
    y = out[:n]
    att = int(0.002 * SR)
    y[:att] *= np.linspace(0, 1, att)
    return y


def glock(freq, dur=1.8, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for r, amp, d in [(1, 1.0, 1.4), (2.756, 0.32, 0.55), (5.404, 0.16, 0.25), (8.933, 0.07, 0.12)]:
        y += amp * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / d * 3)
    click = np.random.default_rng(int(freq)).normal(0, 1, int(0.003 * SR)) * 0.12
    y[:len(click)] += click * np.linspace(1, 0, len(click))
    att = int(0.001 * SR)
    y[:att] *= np.linspace(0, 1, att)
    return y * vel


def bajo(freq, dur, vel=1.0):
    n = int((dur + 0.08) * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * freq * t) + 0.28 * np.sin(4 * np.pi * freq * t) + 0.10 * np.sin(6 * np.pi * freq * t)
    env = np.minimum(1, t / 0.008) * (0.72 + 0.28 * np.exp(-t / 0.12))
    rel = np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    y = np.tanh(1.4 * y * env * rel) / np.tanh(1.4)
    return y * vel


def bombo(vel=1.0):
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 48 + 72 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.20)
    clk = np.random.default_rng(7).normal(0, 1, n) * np.exp(-t / 0.004) * 0.15
    b, a = signal.butter(2, 2200 / (SR / 2), 'low')
    return (y + signal.lfilter(b, a, clk)) * vel


def palma(seed, vel=1.0):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 1, n)
    env = np.zeros(n)
    for k, d in enumerate([0.0, 0.009, 0.018]):
        env += np.where(t >= d, np.exp(-(t - d) / 0.006), 0) * (0.8 if k < 2 else 1)
    env += np.where(t >= 0.018, np.exp(-(t - 0.018) / 0.07) * 0.35, 0)
    b, a = signal.butter(2, [900 / (SR / 2), 2800 / (SR / 2)], 'band')
    return signal.lfilter(b, a, noise * env) * vel


def shaker(seed, vel=1.0):
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    noise = np.random.default_rng(seed).normal(0, 1, n)
    env = np.minimum(1, t / 0.012) * np.exp(-t / 0.025)
    b, a = signal.butter(2, 5200 / (SR / 2), 'high')
    return signal.lfilter(b, a, noise * env) * vel


def pad(freqs, dur, att=0.6, rel=0.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for i, f in enumerate(freqs):
        for det in (-0.12, 0.12):
            y += np.sin(2 * np.pi * f * (1 + det / 100) * t + i)
    env = np.minimum(1, t / att) * np.clip((dur - t) / rel, 0, 1)
    b, a = signal.butter(2, 2400 / (SR / 2), 'low')
    return signal.lfilter(b, a, y * env) / (2 * len(freqs))


# ---------------- pistas ----------------
class Pista:
    def __init__(self, pan=0.0):
        self.x = np.zeros(N + 4 * SR)
        self.pan = pan

    def add(self, t0, y, gain=1.0):
        i = int(round(t0 * SR))
        if i < 0:
            y = y[-i:]
            i = 0
        j = min(len(self.x), i + len(y))
        self.x[i:j] += y[:j - i] * gain

    def stereo(self):
        x = self.x[:N]
        l, r = np.cos((self.pan + 1) * np.pi / 4), np.sin((self.pan + 1) * np.pi / 4)
        return np.stack([x * l * 1.414, x * r * 1.414], axis=1)


ACORDES = {  # voces de ukulele (MIDI) y raíz del bajo
    1: ('Cadd9', [64, 67, 72, 74], 48), 2: ('G/B', [62, 67, 71, 74], 47), 3: ('Am7', [64, 67, 69, 72], 45),
    4: ('Fmaj7', [64, 65, 69, 72], 53), 5: ('C', [64, 67, 72, 76], 48), 6: ('G', [62, 67, 71, 74], 43),
    7: ('Am7', [64, 67, 69, 72], 45), 8: ('F', [65, 69, 72, 77], 53), 9: ('C/E', [64, 67, 72, 76], 52),
    10: ('Fmaj7', [64, 65, 69, 72], 53), 11: ('Gsus4', [62, 67, 72, 74], 43),
}
GLOCK = {  # compás: [(tiempo dentro del compás, MIDI)]
    3: [(0, 88), (0.5, 91), (1.5, 93), (2.5, 91), (3.0, 93), (3.5, 96)],  # 3.0 y 3.5: salen Castle y Rainbow
    4: [(0, 100), (1.5, 98), (2, 96), (3, 93)],                            # 0: sale Magic
    5: [(0, 91), (1, 88), (2, 91), (2.5, 93), (3, 96)],
    6: [(0, 98), (1, 95), (2, 91), (3, 98)],
    7: [(0, 96), (1, 93), (2, 88), (2.5, 91), (3, 93), (3.5, 96)],
    8: [(0, 89), (1, 93), (2, 96), (3, 93)],
    9: [(0, 91), (1, 88), (2, 96), (3, 91)],
}
PIZZ = {8: [53, 57, 60, 65, 60, 57, 53, 57], 9: [52, 55, 60, 64, 60, 55, 52, 55], 10: [53, 57, 60, 64, 60, 57, 53, 57]}


def rasgueo(pista, t0, notas, abajo=True, vel=1.0, dur=0.9, seed=0):
    orden = notas if abajo else notas[::-1]
    if not abajo:
        orden = orden[:3]
        vel *= 0.7
    for k, m in enumerate(orden):
        y = ks(hz(m), dur, decay=1.1, bright=0.75, seed=seed * 7 + k)
        pista.add(t0 + k * 0.011, y, 0.28 * vel * (0.85 + 0.15 * (k / 3)))


def main():
    uke, glk, bass, kick, clap, pizz, shk, pads = Pista(-0.3), Pista(0.2), Pista(0), Pista(0), Pista(0), Pista(0.35), Pista(0.1), Pista(0)
    patron = [(0, True), (1, True), (1.5, False), (2.5, False), (3, True), (3.5, False)]
    for bar in range(1, 12):
        nombre, voces, raiz = ACORDES[bar]
        b0 = t_of(bar)
        # ukulele: “isla” D-D-U-U-D-U; más suave en el compás 1 y en el cierre
        vel = 0.75 if bar == 1 else 0.6 if bar >= 10 else 1.0
        for i, (bt, abajo) in enumerate(patron):
            t = b0 + bt * BEAT
            if t >= RESPIRO - 0.02:
                continue
            rasgueo(uke, t, voces, abajo, vel, dur=0.9 if bt < 3.5 else 0.6, seed=bar * 10 + i)
        if bar == 7:  # fill hacia el lift: semicorcheas en el tiempo 4
            for k in range(4):
                rasgueo(uke, b0 + (3 + k * 0.25) * BEAT, voces, k % 2 == 0, 0.7, dur=0.25, seed=900 + k)
        # bajo redondo desde el compás 2
        if 2 <= bar <= 10:
            f = hz(raiz)
            notas = [(0, 1.0, f), (1.5, 0.5, f), (2, 1.0, f * 1.5), (3.5, 0.5, f * 2)] if bar <= 9 else [(0, 2.0, f)]
            for bt, d, fr in notas:
                bass.add(b0 + bt * BEAT, bajo(fr, d * BEAT * 0.95), 0.34)
        # bombo de fieltro: 1 y 3; cuatro tiempos en el lift; solo el 1 en el compás 10
        if 2 <= bar <= 7:
            for bt in (0, 2):
                kick.add(b0 + bt * BEAT, bombo(), 0.5)
        elif bar in (8, 9):
            for bt in range(4):
                kick.add(b0 + bt * BEAT, bombo(0.9 if bt % 2 else 1.0), 0.5)
        elif bar == 10:
            kick.add(b0, bombo(0.8), 0.5)
        # palmas en 2 y 4 desde el tiempo 3 del compás 5 (f579)
        if 5 <= bar <= 9:
            for bt in (1, 3):
                t = b0 + bt * BEAT
                if t >= 579 / FPS - 0.01:
                    clap.add(t, palma(bar * 4 + bt), 0.22)
        # glockenspiel desde el catálogo
        for bt, m in GLOCK.get(bar, []):
            glk.add(b0 + bt * BEAT, glock(hz(m)), 0.16)
        # pizzicato desde el lift
        for k, m in enumerate(PIZZ.get(bar, [])):
            pizz.add(b0 + k * 0.5 * BEAT, ks(hz(m), 0.45, decay=0.32, bright=0.35, seed=bar * 50 + k), 0.30)
        # shaker en el lift
        if bar in (8, 9):
            for k in range(16):
                shk.add(b0 + k * 0.25 * BEAT, shaker(bar * 100 + k, 1.0 if k % 2 else 0.55), 0.05)
    # compás 11: Gsus4 sostenido (pad) que se apaga en el respiro
    pads.add(t_of(11), pad([hz(m) for m in (55, 62, 67, 72)], RESPIRO - t_of(11) + 0.05, att=0.9, rel=0.35), 0.10)
    # una nota de glockenspiel por cada banda del arcoíris (f1235, f1245, f1255, f1265, f1275)
    for k, m in enumerate([96, 98, 100, 103, 105]):
        glk.add((1235 + 10 * k) / FPS, glock(hz(m), 1.6, 0.8), 0.13)
    # end card: golpe grave suave (como rebote), acorde final y brillos en “Jumpers” y “Así”
    t_end = FINAL
    kick.add(t_end, bombo(1.2), 0.6)
    bass.add(t_end, bajo(hz(36), 1.6, 1.0), 0.34)
    for k, m in enumerate([60, 64, 67, 72, 74]):
        uke.add(t_end + 0.012 + k * 0.035, ks(hz(m), 3.2, decay=2.6, bright=0.7, seed=1500 + k), 0.24)
    pads.add(t_end, pad([hz(m) for m in (48, 60, 64, 67, 74)], TOTAL - t_end, att=0.25, rel=1.6), 0.11)
    voz = {v['id']: v for v in TL['voz']}
    l6 = {p['w'].strip('.,'): p['f'] / FPS for p in voz['L6']['palabras']}
    glk.add(l6['Jumpers'], glock(hz(96), 2.0, 0.9), 0.14)
    glk.add(l6['Jumpers'] + 0.02, glock(hz(103), 2.0, 0.6), 0.10)
    glk.add(l6['Así'], glock(hz(100), 2.0, 0.6), 0.10)

    # mezcla de la música, reverb corta de sala y ecualización suave
    secas = {'uke': (uke, 1.0), 'glk': (glk, 0.9), 'bass': (bass, 1.0), 'kick': (kick, 1.0), 'clap': (clap, 1.0), 'pizz': (pizz, 0.9), 'shk': (shk, 1.0), 'pad': (pads, 1.0)}
    mix = np.zeros((N, 2))
    wet = np.zeros((N, 2))
    for k, (p, g) in secas.items():
        st = p.stereo() * g
        if k == 'uke':
            b, a = signal.butter(2, 140 / (SR / 2), 'high')
            st = signal.lfilter(b, a, st, axis=0)
        mix += st
        if k in ('uke', 'glk', 'pizz', 'clap', 'pad'):
            wet += st * (0.30 if k == 'glk' else 0.18)
    rng = np.random.default_rng(3)
    L = int(1.6 * SR)
    t = np.arange(L) / SR
    ir = np.stack([rng.normal(0, 1, L), rng.normal(0, 1, L)], axis=1) * np.exp(-t / 0.35)[:, None]
    b, a = signal.butter(1, 5000 / (SR / 2), 'low')
    ir = signal.lfilter(b, a, ir, axis=0)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    rev = np.stack([signal.fftconvolve(wet[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
    mix += rev * 0.55
    # silencio del respiro (23.04–24.0 s): solo queda la cola de la reverb, que se apaga en 0.6 s
    tt = np.arange(N) / SR
    g = np.ones(N)
    corte = (tt >= RESPIRO) & (tt < t_end)
    g[corte] = np.exp(-(tt[corte] - RESPIRO) / 0.22)
    mix *= g[:, None]
    # fundido final
    fin = tt > TOTAL - 0.6
    mix[fin] *= np.clip((TOTAL - tt[fin]) / 0.6, 0, 1)[:, None]
    mix /= max(1e-9, np.abs(mix).max()) / 0.8
    out = B / 'musica_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(out)],
                   input=mix.astype(np.float32).tobytes(), check=True)
    print(f'{out.relative_to(ROOT)} · {TOTAL:.2f} s · {BPM} BPM · respiro {RESPIRO:.2f} s · golpe final {t_end:.2f} s')


if __name__ == '__main__':
    main()
