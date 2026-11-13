#!/usr/bin/env python3
"""Música, SFX y mezcla de MaRe Repostería, todo en código (numpy + scipy).

Música original a 120 BPM (compás = 2.0 s) en Fa mayor: marimba, bajo redondo, palmas, kick y shaker,
una capa nueva por sección, lift en 3.00 s, respiro en 17–20 s y golpe grave en 20.00 s (f1200).
SFX: un cue por movimiento visible, en el cuadro exacto del motor (video/render/engine.js).
Mezcla: voz a -16 LUFS, música con ducking (>= 12 dB bajo la voz en cada palabra), master -14 LUFS / -1.25 dBTP.

Salida en audio/build/: musica_stem.wav, sfx_stem.wav, voz_stem.wav, mezcla_master.wav, sfx_cues.json
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'build'
OUT.mkdir(parents=True, exist_ok=True)
TL = json.loads((ROOT / 'brief' / 'timeline.json').read_text())
SR, FPS = 48000, TL['fps']
DUR = TL['frames'] / FPS
N = int(DUR * SR)
BEAT, BAR = 0.5, 2.0
rng = np.random.default_rng(5)
t_ = lambda n: np.arange(n) / SR
fr = lambda f: f / FPS


def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def noise(n): return rng.standard_normal(n)
def hz(m): return 440 * 2 ** ((m - 69) / 12)


def place(buf, x, t, gain=1.0):
    a = int(round(t * SR))
    if a < 0:
        x, a = x[-a:], 0
    b = min(len(buf), a + len(x))
    if b > a:
        buf[a:b] += x[:b - a] * gain


# ---------------- instrumentos ----------------
def marimba(m, vel=0.6, dur=1.2):
    f = hz(m); n = int(dur * SR); t = t_(n)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / (0.55 * (220 / f) ** 0.35))
         + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.09)
         + 0.12 * np.sin(2 * np.pi * f * 9.24 * t) * np.exp(-t / 0.03))
    click = bp(noise(n), 1500, 6000) * np.exp(-t / 0.004) * 0.25
    att = np.minimum(1, t / 0.002)
    return (x + click) * att * vel


def bass(m, dur, vel=0.7):
    f = hz(m); n = int(dur * SR); t = t_(n)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    env = np.minimum(1, t / 0.012) * np.exp(-t / 0.9) * np.minimum(1, (dur - t) / 0.05).clip(0)
    return lp(x * env, 900) * vel


def kick(vel=0.8):
    n = int(0.45 * SR); t = t_(n)
    ph = 2 * np.pi * np.cumsum(45 + 95 * np.exp(-t / 0.035)) / SR
    return (np.sin(ph) * np.exp(-t / 0.16) + lp(noise(n), 3000) * np.exp(-t / 0.004) * 0.3) * vel


def clap(vel=0.5):
    n = int(0.3 * SR); t = t_(n); x = np.zeros(n)
    for k, d in enumerate([0, 0.011, 0.022]):
        a = int(d * SR); x[a:] += np.exp(-t[:n - a] / (0.006 if k < 2 else 0.07))
    return bp(noise(n), 900, 5000) * x * vel


def shaker(vel=0.25):
    n = int(0.09 * SR); t = t_(n)
    return hp(noise(n), 5000) * np.minimum(1, t / 0.02) * np.exp(-t / 0.03) * vel


def sub(dur=2.4, f0=55, vel=1.0):
    n = int(dur * SR); t = t_(n)
    ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.6 * np.exp(-t / 0.05))) / SR
    return np.sin(ph) * np.exp(-t / (dur / 3.2)) * np.minimum(1, t / 0.004) * vel


# ---------------- música ----------------
# un acorde por compás de 2 s (0..11), golpe en 20.0 s
CH = [('F', 41, [65, 69, 72, 76]), ('Dm', 38, [62, 65, 69, 72]), ('Bb', 34, [62, 65, 70, 74]), ('C', 36, [64, 67, 72, 74]),
      ('F', 41, [65, 69, 72, 76]), ('Dm', 38, [62, 65, 69, 72]), ('Bb', 34, [62, 65, 70, 74]), ('C', 36, [64, 67, 72, 76]),
      ('F', 41, [65, 69, 72, 77]), ('Bb', 34, [65, 70, 74, 77]), ('C', 36, [64, 67, 72, 79]), ('F', 29, [65, 69, 72, 77])]
T_LIFT, T_RESP, T_GOLPE = 3.0, 17.0, 20.0


def musica():
    L = np.zeros(N); R = np.zeros(N)
    def put(x, t, g=1.0, pan=0.0):
        place(L, x, t, g * (1 - max(0, pan))); place(R, x, t, g * (1 + min(0, pan)))
    for bar, (_, root, v) in enumerate(CH):
        t0 = bar * BAR
        if t0 >= T_GOLPE:
            break
        resp = t0 >= T_RESP
        # marimba: arpegio en corcheas desde 0.5 s; en el respiro, trémolo suave del acorde
        pat = [0, 2, 1, 3, 2, 1, 3, 2]
        for i in range(16):
            t = t0 + i * BEAT / 2
            if t < 0.5:
                continue
            if resp:
                if i % 2 == 0:
                    for k, m in enumerate(v):
                        put(marimba(m, 0.10 + 0.02 * k, 1.6), t + 0.012 * k, 1, -0.3 + 0.2 * k)
                continue
            m = v[pat[i % 8]] + (12 if (bar >= 4 and i % 4 == 3) else 0)
            put(marimba(m, 0.34 if i % 2 == 0 else 0.24), t + rng.normal(0, 0.003), 1, 0.25 if i % 2 else -0.25)
        if resp:
            continue
        # contramelodía (menú en adelante, 9.5 s)
        if t0 >= 8.0:
            mel = [v[3] + 12, v[2] + 12, v[1] + 12, v[2] + 12]
            for i, m in enumerate(mel):
                t = t0 + i * BEAT
                if t >= 9.5:
                    put(marimba(m, 0.18, 1.0), t, 1, 0.4)
        # bajo redondo desde el lift
        if t0 >= T_LIFT - 1:
            for b in range(4):
                t = t0 + b * BEAT
                if t >= T_LIFT:
                    put(bass(root + (12 if b == 2 else 0) + (7 if b == 3 else 0), BEAT * 0.9, 0.55), t)
        # kick desde 2.0 s, palmas desde el lift, shaker desde 6.0 s
        for b in range(4):
            t = t0 + b * BEAT
            if t >= 2.0:
                put(kick(0.75 if t >= 15.5 else 0.6), t)
            if t >= T_LIFT and b % 2 == 1:
                put(clap(0.42), t, 1, 0.1)
        for i in range(16):
            t = t0 + i * BEAT / 4
            if t >= 6.0:
                put(shaker(0.16 if i % 2 else 0.22), t, 1, 0.35)
    # golpe del inicio (f8), riser al lift, golpe grave final
    put(sub(1.6, 48, 0.9), fr(8))
    n = int(0.8 * SR); t = t_(n)
    riser = bp(noise(n), 800, 7000) * (t / 0.8) ** 2.5 * 0.35
    put(riser, T_LIFT - 0.8, 1, -0.1)
    put(sub(3.0, 43.65, 1.1), T_GOLPE)
    for k, m in enumerate([41, 53, 60, 65, 69, 72]):
        put(marimba(m, 0.22, 3.0), T_GOLPE + 0.015 * k, 1, -0.2 + 0.08 * k)
    st = np.stack([L, R], 1)
    return st


# ---------------- SFX ----------------
def whoosh(d=0.45, lo=300, hi=3000, rev=False):
    n = int(d * SR); t = t_(n); x = noise(n)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    y = np.zeros(n); seg = 8
    for k in range(seg):
        a, b = k * n // seg, (k + 1) * n // seg
        c = lo * (hi / lo) ** (k / (seg - 1))
        y[a:b] = bp(x, c * 0.7, min(c * 1.6, 20000))[a:b]
    y *= env
    return y[::-1] if rev else y


def tick(f=2600, d=0.05):
    n = int(d * SR); t = t_(n)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + bp(noise(n), 2000, 8000) * np.exp(-t / 0.003) * 0.5)


def thud(f=90, d=0.35):
    n = int(d * SR); t = t_(n)
    ph = 2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-t / 0.02))) / SR
    return np.sin(ph) * np.exp(-t / 0.09) + lp(noise(n), 1800) * np.exp(-t / 0.012) * 0.6


def splat(d=0.18):
    n = int(d * SR); t = t_(n)
    return lp(noise(n), 1400) * np.exp(-t / 0.03) + np.sin(2 * np.pi * 300 * t * (1 - t)) * np.exp(-t / 0.04) * 0.4


def snap():
    n = int(0.12 * SR); t = t_(n)
    return hp(noise(n), 2500) * np.exp(-t / 0.008) + bp(noise(n), 600, 2000) * np.exp(-t / 0.03) * 0.5


def crunch(d=0.35):
    n = int(d * SR); x = np.zeros(n)
    for _ in range(40):
        a = int(rng.uniform(0, 0.8) * n); g = int(rng.uniform(0.003, 0.012) * SR)
        b = min(n, a + g); x[a:b] += noise(b - a) * np.hanning(b - a) * rng.uniform(0.3, 1)
    return bp(x, 900, 7000) * np.exp(-t_(n) / (d * 0.5))


def chime(fs=(1568, 2093, 2637), d=0.9):
    n = int(d * SR); t = t_(n)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t / (0.35 - 0.05 * k)) * (0.6 ** k) for k, f in enumerate(fs))


def pop(f=520, d=0.16):
    n = int(d * SR); t = t_(n)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.8 * np.exp(-t / 0.015))) / SR
    return np.sin(ph) * np.exp(-t / 0.05)


def bubble(d=0.6):
    n = int(d * SR); t = t_(n)
    ph = 2 * np.pi * np.cumsum(180 + 900 * (t / d) ** 1.6 + 60 * np.sin(2 * np.pi * 14 * t)) / SR
    return np.sin(ph) * np.sin(np.pi * t / d) ** 1.5


def add(*xs):
    n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)


def glass_slide(d=0.5):
    return whoosh(d, 1500, 9000) * 0.7 + np.pad(chime((2637, 3520), d * 0.9), (0, int(d * SR) - int(d * 0.9 * SR))) * 0.15


SFX = {'whoosh': lambda: whoosh(), 'whoosh_s': lambda: whoosh(0.28, 600, 5000), 'whoosh_out': lambda: whoosh(0.35, 3000, 400),
       'hit': lambda: thud(70, 0.5), 'splat': splat, 'stroke': lambda: whoosh(0.16, 500, 2500), 'tick': tick,
       'tick_lo': lambda: tick(1700), 'snap': snap, 'crunch': crunch, 'tear': lambda: whoosh(0.3, 2000, 6000) * 0.8,
       'bubble': bubble, 'pop': pop, 'glass': glass_slide, 'chime': chime, 'land': lambda: thud(140, 0.2),
       'stamp': lambda: add(thud(110, 0.3), tick(900, 0.06) * 0.3), 'shimmer': lambda: chime((2093, 2637, 3136, 4186), 1.0),
       'scroll': lambda: tick(3200, 0.03), 'plop': lambda: pop(340, 0.2), 'click': lambda: add(tick(1400, 0.06), thud(200, 0.1) * 0.5),
       'pulse': lambda: pop(160, 0.25), 'golpe': lambda: thud(45, 1.2)}
GAIN = {'whoosh': -16, 'whoosh_s': -20, 'whoosh_out': -18, 'hit': -8, 'splat': -18, 'stroke': -24, 'tick': -27, 'tick_lo': -26,
        'snap': -14, 'crunch': -15, 'tear': -20, 'bubble': -21, 'pop': -15, 'glass': -20, 'chime': -24, 'land': -18, 'stamp': -12,
        'shimmer': -21, 'scroll': -30, 'plop': -16, 'click': -14, 'pulse': -17, 'golpe': -6}


def cues():
    c = [(0, 'whoosh'), (8, 'hit'), (8, 'splat'), (12, 'splat'), (16, 'splat'), (21, 'splat'), (27, 'splat')]
    c += [(f, 'stroke') for f in (24, 40, 56, 72, 88, 104)]
    c += [(f, 'tick') for f in (30, 49, 73, 86)]
    c += [(110, 'whoosh_s'), (120, 'snap'), (123, 'crunch'), (128, 'tear'), (152, 'bubble'), (176, 'pop'),
          (186, 'glass'), (200, 'chime'), (214, 'tick_lo'), (222, 'tick_lo')]
    for f in (240, 270, 300):
        c += [(f - 6, 'whoosh_s'), (f + 18, 'land'), (f + 12, 'tick')]
    c += [(f, 'whoosh_out') for f in (344, 350, 356)]
    c += [(360, 'glass'), (372, 'tick'), (399, 'tick')]
    c += [(f, 'stamp') for f in (390, 405, 420, 435, 450)]
    c += [(452, 'shimmer'), (454, 'tick'), (548, 'whoosh_out'), (575, 'glass')]
    c += [(f, 'scroll') for f in (600, 622, 644, 666, 688, 710, 732)]
    c += [(f, 'tick') for f in (668, 678, 697)]
    c += [(748, 'whoosh'), (770, 'land')]
    c += [(f, 'tick') for f in (762, 782, 792, 835, 864, 878)]
    c += [(f, 'whoosh_s') for f in (842, 848, 854)] + [(f, 'plop') for f in (880, 895, 910)]
    c += [(922, 'whoosh_out'), (934, 'pop'), (944, 'stroke')]
    c += [(f, 'tick') for f in (936, 946, 955, 979, 989)]
    c += [(f, 'pulse') for f in (960, 990, 1020)] + [(990, 'click'), (991, 'shimmer')]
    c += [(1016, 'whoosh_out'), (1020, 'glass'), (1040, 'bubble'), (1066, 'pop')]
    c += [(f, 'tick') for f in (1038, 1065, 1118)]
    c += [(1186, 'whoosh_out'), (1200, 'golpe'), (1200, 'land'), (1289, 'stroke')]
    c += [(f, 'tick_lo') for f in (1206, 1222, 1232, 1270, 1300, 1310)]
    return sorted(c)


def sfx_stem():
    L = np.zeros(N); R = np.zeros(N); lst = []
    for f, k in cues():
        x = SFX[k](); x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (GAIN[k] / 20)
        pre = 0.3 if k.startswith('whoosh') or k == 'glass' else 0.0
        pan = float(np.clip(rng.normal(0, 0.25), -0.5, 0.5))
        place(L, x, fr(f) - pre, 1 - max(0, pan)); place(R, x, fr(f) - pre, 1 + min(0, pan))
        lst.append({'f': f, 'cue': k})
    return np.stack([L, R], 1), lst


# ---------------- mezcla ----------------
def decode(p):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).astype(np.float64)


def write(p, x):
    x = np.atleast_2d(x.T).T if x.ndim == 1 else x
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', str(x.shape[1]), '-i', '-', '-c:a', 'pcm_s24le', str(p)],
                   input=np.ascontiguousarray(x).tobytes(), check=True)


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def main():
    voz = decode(ROOT / 'voz' / 'voz_stem_48k.wav'); voz = np.pad(voz, (0, max(0, N - len(voz))))[:N]
    mus = musica(); fx, lst = sfx_stem()
    # envolvente de la voz para el ducking (ataque 20 ms, liberación 250 ms)
    w = int(0.02 * SR); e = np.sqrt(np.convolve(voz ** 2, np.ones(w) / w, 'same'))
    act = (e > 10 ** (-40 / 20)).astype(float)
    a, r = np.exp(-1 / (0.02 * SR)), np.exp(-1 / (0.25 * SR))
    sm = signal.lfilter([1 - r], [1, -r], act); sm = np.maximum(sm, signal.lfilter([1 - a], [1, -a], act)); sm = np.clip(sm, 0, 1)
    mus *= 10 ** ((-22 - rms_db(mus.mean(1))) / 20)       # cama en huecos
    words = [(w['f'], w['fin']) for v in TL['voz'] for w in v['palabras']]
    duck = 9.0
    for _ in range(12):
        g = 10 ** (-duck * sm / 20)
        m = mus * g[:, None]
        worst = min(rms_db(voz[int(fr(a) * SR):int(fr(b) * SR)]) - rms_db(m[int(fr(a) * SR):int(fr(b) * SR)].mean(1)) for a, b in words if b > a)
        if worst >= 12.5:
            break
        duck += 12.5 - worst + 0.5
    mix = m + fx + voz[:, None]
    write(OUT / 'musica_stem.wav', m); write(OUT / 'sfx_stem.wav', fx); write(OUT / 'voz_stem.wav', voz)
    raw = OUT / '_mix.wav'; write(raw, mix)
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(raw), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,alimiter=limit=0.84:attack=1:release=40:level=false")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', ln, '-ar', str(SR), '-c:a', 'pcm_s24le', str(OUT / 'mezcla_master.wav')], check=True)
    raw.unlink()
    (OUT / 'sfx_cues.json').write_text(json.dumps(lst, indent=1))
    st = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(OUT / 'mezcla_master.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                        capture_output=True, text=True).stderr
    summ = st[st.rindex('Summary'):]
    print('master:', ' '.join(l.strip() for l in summ.splitlines() if l.strip().startswith(('I:', 'Peak:'))))
    print(f'cues SFX: {len(lst)} · ducking {duck:.1f} dB · peor palabra: voz {worst:.1f} dB sobre la música')


if __name__ == '__main__':
    main()
