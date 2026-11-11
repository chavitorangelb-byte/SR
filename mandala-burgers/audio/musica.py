#!/usr/bin/env python3
"""Música original en código para Mandala Burgers: funk-pop juguetón, 100 BPM, Mi mayor, 27 s.

Todo sintetizado aquí (sin samples ni SoundFonts): kick, sub, palmas, hi-hat, bajo redondo, clavinet, acordes,
marimba, pad, melodía, riser y campanada. Una capa nueva por compás (2.4 s), amarrada a brief/timeline.json.

Salida: audio/build/musica_stem.wav (48 kHz estéreo, sin ducking). Requiere numpy y scipy.
"""
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'build'
OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
BEAT = 0.6
BAR = 2.4
STEP = BEAT / 4            # semicorchea
DUR = 27.0
N = int(DUR * SR)
rng = np.random.default_rng(21)
T_RESPIRO2, T_END, T_CAMPANA = 23.4, 24.0, 26.4

NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
m = lambda s: 12 * (int(s[-1]) + 1) + NOTE[s[:-1]]
hz = lambda n: 440.0 * 2 ** ((n - 69) / 12)
# progresión de 4 compases: E – A – C#m – B
ACORDES = [('E', ['E3', 'G#3', 'B3', 'F#4']), ('A', ['E3', 'A3', 'C#4', 'B3']), ('C#', ['E3', 'G#3', 'B3', 'C#4']), ('B', ['F#3', 'B3', 'D#4', 'E4'])]
acorde = lambda bar: ACORDES[(bar - 1) % 4]


def tt(n):
    return np.arange(n) / SR


def lp(x, f, o=2):
    b, a = signal.butter(o, min(f, SR / 2 - 200) / (SR / 2), 'low'); return signal.lfilter(b, a, x)


def hp(x, f, o=2):
    b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)


def bp(x, lo, hi):
    b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return signal.lfilter(b, a, x)


def poner(buf, t, x, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i < 0:
        return
    n = min(len(x), N - i)
    buf[i:i + n, 0] += x[:n] * g * np.sqrt(0.5 * (1 - pan)) * 1.414
    buf[i:i + n, 1] += x[:n] * g * np.sqrt(0.5 * (1 + pan)) * 1.414


def swing(step):            # semicorcheas impares un poco tarde: el groove
    return 0.014 if step % 2 else 0.0


def kick(fuerte=1.0):
    n = int(0.32 * SR); t = tt(n)
    f = 46 + 90 * np.exp(-t * 34)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) + 0.25 * lp(rng.standard_normal(n), 2500) * np.exp(-t * 160)) * fuerte


def palma():
    n = int(0.22 * SR); t = tt(n); x = np.zeros(n)
    for d in (0, 0.011, 0.021):
        k = int(d * SR); e = np.exp(-tt(n - k) * 55); x[k:] += rng.standard_normal(n - k) * e
    return bp(x, 900, 3800) * (1 + 0 * t)


def hat(abierto=False):
    n = int((0.22 if abierto else 0.05) * SR); t = tt(n)
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * (16 if abierto else 85))


def nota_bajo(f, dur):
    n = int(dur * SR); t = tt(n)
    x = np.sin(2 * np.pi * f * t) + 0.35 * signal.sawtooth(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 3.2) * np.minimum(1, (dur - t) / 0.03)
    return np.tanh(1.4 * lp(x, 520 + 900 * np.exp(-3.0), 2)) * env


def nota_clav(f, dur=0.11):
    n = int(dur * SR); t = tt(n)
    x = signal.square(2 * np.pi * f * t, duty=0.22) + 0.5 * signal.square(2 * np.pi * 2 * f * t, duty=0.3)
    return bp(x, 500, 4200) * np.minimum(1, t / 0.002) * np.exp(-t * 26)


def nota_ep(f, dur):          # acordes: piano eléctrico suave (FM sencilla)
    n = int(dur * SR); t = tt(n)
    mod = np.sin(2 * np.pi * f * 2 * t) * 1.2 * np.exp(-t * 5)
    return np.sin(2 * np.pi * f * t + mod) * np.minimum(1, t / 0.008) * np.exp(-t * 2.2) * np.minimum(1, (dur - t) / 0.05)


def nota_marimba(f, dur=0.7):
    n = int(dur * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.3 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 22)) * np.minimum(1, t / 0.003)


def nota_lead(f, dur):
    n = int(dur * SR); t = tt(n); vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.15)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = signal.sawtooth(ph, 0.5) * 0.8 + 0.35 * signal.square(ph * 2, duty=0.5) * 0.3
    return lp(x, 3200) * np.minimum(1, t / 0.012) * np.exp(-t * 2.5) * np.minimum(1, (dur - t) / 0.04)


def pad(notas, t0, dur, buf, g):
    n = int(dur * SR); t = tt(n); x = np.zeros(n)
    for k, s in enumerate(notas):
        f = hz(m(s))
        for det in (-0.004, 0.004):
            x += signal.sawtooth(2 * np.pi * f * (1 + det) * t + k)
    x = lp(x, 1100, 2) * np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)
    poner(buf, t0, x, g * 0.013)


def reverb(x, sec=1.6, mezcla=0.16):
    n = int(sec * SR); t = tt(n); wet = np.zeros_like(x)
    for c in range(2):
        ir = lp(rng.standard_normal(n) * np.exp(-t * 6.9 / sec), 6000, 1); ir /= np.sqrt((ir ** 2).sum())
        wet[:, c] = signal.fftconvolve(x[:, c], ir)[:N]
    return x + wet * mezcla


def main():
    drums, bass, harm, top, fin, fin_sub = (np.zeros((N, 2)) for _ in range(6))
    groove = lambda bar: (2 <= bar <= 4) or (6 <= bar <= 10)

    # compás 1: golpe con kick y sub, destello de sintetizador brillante
    poner(drums, 0, kick(1.3), 0.9)
    n = int(1.6 * SR); t = tt(n)
    poner(bass, 0, np.sin(2 * np.pi * hz(m('E1')) * t) * np.exp(-t * 2.2), 0.3)
    for k, s in enumerate(['E5', 'G#5', 'B5', 'F#6', 'B6', 'E7']):
        nn = int(1.2 * SR); t2 = tt(nn)
        poner(top, 0.02 + k * 0.045, np.sin(2 * np.pi * hz(m(s)) * t2) * np.exp(-t2 * 5) * (1 + 0.3 * np.sin(2 * np.pi * 9 * t2)), 0.07, pan=(k - 2.5) / 4)
    for b in (1, 2, 3):                                   # pulso suave del compás 1
        poner(drums, b * BEAT, kick(0.7), 0.5)

    for bar in range(1, 11):
        t0 = (bar - 1) * BAR; raiz, voces = acorde(bar); lift = bar >= 9
        if bar == 5:                                      # respiro: marimba suave y pad
            arp = ['E4', 'G#4', 'B4', 'F#5', 'B4', 'G#4', 'E4', 'B3']
            for k, s in enumerate(arp):
                poner(top, t0 + k * BEAT / 2, nota_marimba(hz(m(s))), 0.22, pan=(-0.3 if k % 2 else 0.3))
            pad(['E3', 'B3', 'F#4', 'G#4'], t0 - 0.2, BAR + 0.5, harm, 1.0)
            continue
        if not groove(bar):
            continue
        for st in range(16):
            ts = t0 + st * STEP + swing(st)
            if ts >= T_RESPIRO2:
                break
            # batería
            if st in (0, 8) or (st == 10 and bar % 2 == 0) or (lift and st == 6):
                poner(drums, ts, kick(1.0 if st in (0, 8) else 0.75), 0.62 if bar >= 3 else 0.5)
            if st in (4, 12):
                poner(drums, ts, palma(), 0.30 if bar < 7 else 0.36, pan=0.08)
            if bar >= 7 and st in (11, 14, 15) and (bar % 2 == 1 or lift):     # coros de palmas
                poner(drums, ts, palma(), 0.17, pan=(-0.35 if st % 2 else 0.35))
            poner(drums, ts, hat(lift and st == 14), (0.11 if st % 4 == 2 else 0.07 if st % 2 == 0 else 0.035) * (1.25 if lift else 1), pan=0.22)
            # bajo redondo (desde el compás 3)
            if bar >= 3:
                pat = {0: (0, 0.26), 3: (0, 0.12), 6: (12, 0.12), 7: (0, 0.14), 10: (0, 0.2), 12: (7, 0.13), 14: (12, 0.1), 15: (10 if raiz != 'B' else 9, 0.1)}
                if st in pat:
                    semi, dur = pat[st]; f = hz(m(raiz + '1') + (12 if raiz in ('A', 'B') else 12) + semi)
                    poner(bass, ts, nota_bajo(f, dur + 0.05), 0.3)
            # clavinet y acordes (desde el compás 4)
            if bar >= 4 and bar != 5:
                if st in (2, 5, 7, 10, 13, 15):
                    for k, s in enumerate(voces[1:]):
                        poner(harm, ts, nota_clav(hz(m(s) + 12)), 0.075, pan=-0.3 + 0.3 * k)
                if st == 0:
                    for s in voces:
                        poner(harm, ts, nota_ep(hz(m(s)), BAR * 0.9), 0.07)
    # melodía (compases 7 y 8) y a la octava en el lift (9 y 10)
    MEL = {7: ['G#4', None, 'B4', 'C#5', None, 'B4', 'G#4', None], 8: ['F#4', None, 'G#4', 'B4', None, None, 'F#5', None],
           9: ['B4', 'C#5', 'E5', None, 'G#5', None, 'E5', 'C#5'], 10: ['E5', None, 'C#5', 'E5', 'F#5', None, 'E5', None]}
    for bar, notas in MEL.items():
        for k, s in enumerate(notas):
            ts = (bar - 1) * BAR + k * BEAT / 2 + (0.014 if k % 2 else 0)
            if s is None or ts >= T_RESPIRO2:
                continue
            poner(top, ts, nota_lead(hz(m(s)), 0.42), 0.085 if bar < 9 else 0.1)
            if bar >= 9:
                poner(top, ts, nota_marimba(hz(m(s) + 12), 0.4), 0.09, pan=0.3)
    # riser 16.8 → 19.2 (compás 8)
    n = int(2.4 * SR); t = tt(n); u = t / 2.4
    ris = hp(rng.standard_normal(n), 1800) * 0.1 * u ** 2.4 + np.sin(2 * np.pi * np.cumsum(220 * 2 ** (u * 2)) / SR) * 0.035 * u ** 2
    poner(top, 16.8, ris, 1.0)
    poner(drums, 19.2, kick(1.4), 0.85)                   # golpe del lift
    # respiro 23.4 → 24.0: solo sub grave con filtro cerrado; end card 24 → 27: sub y pad tenues
    n = int(3.6 * SR); t = tt(n)
    sub = lp(np.sin(2 * np.pi * hz(m('E1')) * t) + 0.3 * np.sin(2 * np.pi * hz(m('E2')) * t), 140) * np.minimum(1, t / 0.08) * np.minimum(1, (3.6 - t) / 0.4)
    poner(fin_sub, T_RESPIRO2, sub, 0.035)
    pad(['E3', 'B3', 'G#4'], T_END, 3.0, fin, 0.8)
    for k, s in enumerate(['E4', 'B4', 'G#4', 'B4', 'F#5', 'B4']):   # marimba tenue bajo el end card
        poner(fin, T_END + 0.3 + k * BEAT / 2 * 1.0, nota_marimba(hz(m(s))), 0.1, pan=(-0.25 if k % 2 else 0.25))
    # campanada suave con sub grave en el cierre
    n = int(1.2 * SR); t = tt(n); camp = np.zeros(n)
    for f, a, d in ((hz(m('E5')), 1, 3.5), (hz(m('E5')) * 2.76, 0.4, 6), (hz(m('E5')) * 5.4, 0.2, 9), (hz(m('B5')), 0.35, 4)):
        camp += np.sin(2 * np.pi * f * t) * a * np.exp(-t * d)
    poner(fin, T_CAMPANA, camp * np.minimum(1, t / 0.004), 0.08)
    poner(fin_sub, T_CAMPANA, np.sin(2 * np.pi * np.cumsum(41 + 20 * np.exp(-t * 8)) / SR) * np.exp(-t * 2.5), 0.09)

    t = np.arange(N) / SR
    corte = np.where(t < T_RESPIRO2, 1.0, np.exp(-(t - T_RESPIRO2) / 0.05))[:, None]      # todo se detiene en 23.4
    mezcla = (reverb(drums * 0.9 + harm + top, 1.6, 0.15) + bass) * corte + reverb(fin, 1.6, 0.2) + fin_sub
    mezcla = hp(mezcla.T, 30).T
    mezcla *= np.clip((DUR - t) / 0.12, 0, 1)[:, None] * np.clip(t / 0.004, 0, 1)[:, None]
    act = mezcla[: int(T_RESPIRO2 * SR)]
    mezcla *= 10 ** (-19 / 20) / np.sqrt((act ** 2).mean())
    th = 0.5; a = np.abs(mezcla)                           # recorte suave solo de los picos del kick
    mezcla = np.sign(mezcla) * np.where(a > th, th + (0.89 - th) * np.tanh((a - th) / (0.89 - th)), a)
    out = OUT / 'musica_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(out)],
                   input=mezcla.astype(np.float32).tobytes(), check=True)
    print(out, f'pico {20 * np.log10(np.abs(mezcla).max()):.1f} dBFS', f'rms {10 * np.log10((mezcla ** 2).mean()):.1f} dB')


if __name__ == '__main__':
    main()
