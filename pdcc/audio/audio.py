#!/usr/bin/env python3
"""Música original, efectos y mezcla para "El reflejo" (120 BPM, La menor, 18.5 s). Todo sintetizado aquí con numpy.

Salidas en audio/build: musica.wav, sfx.wav, voz.wav, mezcla_master.wav (−14 LUFS / −1.25 dBTP) y cues.json.
Cada cue de SFX está atado al cuadro (60 fps) de un movimiento visible de video/render/escena.js.
"""
import json, re, subprocess
from pathlib import Path
import numpy as np

R = Path(__file__).resolve().parent.parent; OUT = R / 'audio' / 'build'
SR, FPS, DUR = 48000, 60, 18.5; N = int(DUR * SR); BEAT = 0.5
rng = np.random.default_rng(11)
tt = lambda d: np.arange(int(d * SR)) / SR
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def filt(x, lo=0, hi=24000, sl=0.25):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo > 0: m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 / sl))
    if hi < 24000: m *= 1 / (1 + (f / hi) ** (2 / sl))
    return np.fft.irfft(X * m, len(x))
def env(d, a=0.003, tau=0.1):
    t = tt(d); return np.minimum(t / a, 1) * np.exp(-t / tau)
def put(buf, x, t0, gain=1.0, pan=0.0):
    i = int(round(t0 * SR));
    if i < 0: x = x[-i:]; i = 0
    x = x[:max(0, N - i)]
    if x.ndim == 1: l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4); x = np.stack([x * l, x * r], 1) * 1.4142
    buf[i:i + len(x)] += x * gain
def reverb(x, tau=0.35, d=1.4, wet=0.25, hi=6000):
    out = x.copy(); t = tt(d)
    for ch in range(2):
        ir = filt(rng.standard_normal(len(t)) * np.exp(-t / tau), 200, hi); ir /= np.sqrt((ir ** 2).sum())
        n = len(x) + len(ir); y = np.fft.irfft(np.fft.rfft(x[:, ch], n) * np.fft.rfft(ir, n), n)[:len(x)]
        out[:, ch] += wet * y
    return out

# ============ MÚSICA ============
def musica():
    M = np.zeros((N, 2)); dry = np.zeros((N, 2))
    # progresión, un acorde por compás de 2 s: Am | Am | F | G | Am | F | Dm | E
    CH = [(45, [57, 60, 64]), (45, [57, 60, 64]), (41, [57, 60, 65]), (43, [59, 62, 67]), (45, [57, 60, 64]), (41, [57, 60, 65]), (38, [57, 62, 65]), (40, [56, 59, 64])]
    side = np.ones(N)
    def kick(t0, g=1.0):
        t = tt(0.32); f = 46 + 95 * np.exp(-t / 0.035); ph = 2 * np.pi * np.cumsum(f) / SR
        x = np.sin(ph) * np.exp(-t / 0.11) + 0.25 * filt(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t / 0.006)
        put(dry, np.tanh(x * 1.6), t0, 0.85 * g)
        i = int(t0 * SR); n = int(0.22 * SR); side[i:i + n] = np.minimum(side[i:i + n], 0.35 + 0.65 * np.linspace(0, 1, n)[:max(0, min(n, N - i))] ** 1.5)
    for b in range(28): kick(b * BEAT, 1.0 if b < 28 else 0)        # 0–14 s, a negras
    bass = np.zeros(N); arp = np.zeros((N, 2)); pulse = np.zeros(N); pad = np.zeros((N, 2)); hat = np.zeros((N, 2))
    for bar, (root, tri) in enumerate(CH):
        t0 = bar * 2.0
        if t0 < 14:   # bajo sub: corcheas a contratiempo
            for k in range(8):
                ts = t0 + k * 0.25; t = tt(0.23); f = hz(root - 12)
                x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)) * np.minimum(t / 0.008, 1) * np.exp(-t / 0.16)
                i = int(ts * SR); bass[i:i + len(x)] += x[:N - i] * (1.0 if k % 2 else 0.6)
        if 2 <= t0 < 14:   # pulso + arpegio seco en semicorcheas
            for k in range(8):
                ts = t0 + k * 0.25; t = tt(0.12); f = hz(root + 12)
                x = filt(np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t / 0.04), 150, 1400); i = int(ts * SR); pulse[i:i + len(x)] += x[:N - i] * 0.5
            seq = [0, 1, 2, 1, 0, 2, 1, 2] * 2
            for k in range(16):
                ts = t0 + k * 0.125; note = tri[seq[k]] + (12 if k % 4 == 3 else 0) + 12; t = tt(0.16); f = hz(note)
                x = (np.sin(2 * np.pi * f * t + 1.6 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.03))) * env(0.16, 0.002, 0.05)
                put(arp, x, ts, 0.28 * (1.0 if k % 2 == 0 else 0.6) * (0.6 if t0 < 4 else 1), pan=0.5 * np.sin(k * 1.3))
        if 4 <= t0 < 14:   # hi-hat
            for k in range(16):
                ts = t0 + k * 0.125; x = filt(rng.standard_normal(int(0.06 * SR)), 7000) * env(0.06, 0.001, 0.012 if k % 4 != 2 else 0.035)
                put(hat, x, ts, 0.16 if k % 4 == 2 else 0.06, pan=0.25 if k % 2 else -0.25)
        if 8 <= t0 < 15.5:  # pad de cristal
            d = 2.4; t = tt(d); x = np.zeros((len(t), 2))
            for n_ in tri + [tri[0] + 12, tri[1] + 12]:
                for det, ch in ((-0.06, 0), (0.07, 1)):
                    f = hz(n_ + 12 + det); x[:, ch] += np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * 3.01 * t)) * 0.2
            x *= (np.minimum(t / 0.5, 1) * np.minimum((d - t) / 0.6, 1))[:, None]; put(pad, x, t0, 0.20)
        if 12 <= t0 < 14:  # palmas en 2 y 4
            for k in (1, 3):
                x = filt(rng.standard_normal(int(0.2 * SR)), 900, 5000) * env(0.2, 0.001, 0.045); put(dry, x, t0 + k * BEAT, 0.22)
    # lift: riser de 2 s
    t = tt(2.0); nz = rng.standard_normal(len(t)); ris = np.zeros(len(t))
    for j, fc in enumerate(np.geomspace(500, 9000, 7)): ris += filt(nz, fc, fc * 1.6) * np.clip(1 - abs(t / 2.0 * 6 - j), 0, 1)
    put(M, ris * (t / 2) ** 2, 12.0, 0.20)
    bass = np.tanh(filt(bass, 25, 220) * 1.4) * side; pulse *= side
    put(dry, bass, 0, 0.62); put(dry, pulse, 0, 0.30)
    M += dry + reverb(arp + pad + hat * 0.5, 0.5, 1.6, 0.35) * np.stack([0.6 + 0.4 * side] * 2, 1) + hat * 0.5
    # 14–15.5 se vacía; 15.5–16 respiro
    g = np.ones(N); i14, i155, i16 = int(14 * SR), int(15.5 * SR), int(16 * SR)
    g[i14:i155] = np.linspace(1, 0.0, i155 - i14) ** 1.3; g[i155:] = 0; M *= g[:, None]
    # 16.00 golpe grave + atmósfera mínima
    t = tt(2.4); f = 38 + 30 * np.exp(-t / 0.08); boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55) + 0.5 * filt(rng.standard_normal(len(t)), 60, 500) * np.exp(-t / 0.06)
    hit = np.zeros((N, 2)); put(hit, np.tanh(boom * 1.5), 16.0, 0.9)
    t = tt(2.5); atm = np.zeros((len(t), 2))
    for n_, ch in ((57, 0), (64, 1), (69, 0), (72, 1), (45, 0), (45, 1)): atm[:, ch] += np.sin(2 * np.pi * hz(n_) * t + rng.uniform(0, 6)) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t + n_))
    atm *= (np.minimum(t / 0.6, 1) * np.minimum((2.5 - t) / 0.5, 1))[:, None]; put(hit, atm, 16.0, 0.05)
    return M + reverb(hit, 0.7, 2.0, 0.3, 3000)

# ============ SFX ============
def tick(f=3200, d=0.09): t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.51 * t)) * env(d, 0.001, d / 5)
def ping(m, d=0.7): t = tt(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.08) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.03)) * env(d, 0.002, d / 4)
def whoosh(d=0.5, lo=400, hi=5000, up=True):
    t = tt(d); nz = rng.standard_normal(len(t)); x = np.zeros(len(t)); fs = np.geomspace(lo, hi, 6); pos = (t / d if up else 1 - t / d) * 5
    for j, fc in enumerate(fs): x += filt(nz, fc, fc * 1.7) * np.clip(1 - abs(pos - j), 0, 1)
    return x * np.sin(np.pi * t / d) ** 1.5
def zipp(d=0.22, f0=900, f1=5200): t = tt(d); f = f0 * (f1 / f0) ** (t / d); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6 + filt(rng.standard_normal(len(t)), 3000) * 0.3) * np.sin(np.pi * t / d) ** 0.7
def hitx(d=0.7): t = tt(d); f = 60 + 160 * np.exp(-t / 0.03); return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) + filt(rng.standard_normal(len(t)), 800, 9000) * np.exp(-t / 0.02) * 0.8) * 1.5)
def shimmer(d=0.9, base=84): t = tt(d); x = sum(np.sin(2 * np.pi * hz(base + s) * t + rng.uniform(0, 6)) * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(3, 9) * t)) for s in (0, 4, 7, 12, 16, 19)); return x / 6 * np.sin(np.pi * t / d) ** 2
def swell(d=1.2, f=110): t = tt(d); return (filt(rng.standard_normal(len(t)), 150, 2500) * 0.5 + np.sin(2 * np.pi * f * t) * 0.6) * (t / d) ** 3
def subswell(d=0.8): t = tt(d); return np.sin(2 * np.pi * 52 * t) * np.sin(np.pi * t / d) ** 2
def tap(d=0.25): t = tt(d); return (np.sin(2 * np.pi * 1850 * t) * np.exp(-t / 0.03) + np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.05) * 0.6) * np.minimum(t / 0.001, 1)
def pop(d=0.12): t = tt(d); f = 300 + 500 * np.exp(-t / 0.02); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, 0.002, 0.03)
def click(): t = tt(0.05); return filt(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.01) * 0.6
def pulse_ring(d=0.45): t = tt(d); return np.sin(2 * np.pi * (180 + 80 * t / d) * t) * np.sin(np.pi * t / d) ** 1.2 * 0.8 + filt(rng.standard_normal(len(t)), 2000, 7000) * np.sin(np.pi * t / d) ** 3 * 0.15
def powerdown(d=1.0): t = tt(d); f = 420 * (60 / 420) ** (t / d); return filt(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 40, 900) * (1 - t / d) ** 0.7 * np.minimum(t / 0.02, 1)
def pulidora(d=1.5): t = tt(d); x = filt(rng.standard_normal(len(t)), 900, 4200) * (0.7 + 0.3 * np.sin(2 * np.pi * 38 * t)) + 0.25 * np.sin(2 * np.pi * (240 + 60 * t / d) * t); return x * np.minimum(t / 0.15, 1) * np.minimum((d - t) / 0.4, 1) ** 1.5
def aire(d=2.2): t = tt(d); return filt(rng.standard_normal(len(t)), 300, 1800) * np.minimum(t / 0.5, 1) * np.minimum((d - t) / 0.6, 1)

PENT = [81, 84, 86, 88, 91]
C = []  # (cuadro, nombre, movimiento visible, sonido, ganancia, pan)
def cue(f, nombre, mov, x, g=0.3, pan=0.0): C.append((f, nombre, mov, x, g, pan))
cue(0, 'impacto', 'la línea roja irrumpe', hitx(), 0.75)
cue(0, 'whoosh corto', 'la línea se abre de lado a lado', whoosh(0.22, 800, 7000), 0.4)
cue(5, 'zing', 'la línea llega a los bordes', zipp(0.18, 1500, 6500), 0.16)
cue(8, 'aire', 'la línea sube a su posición', whoosh(0.4, 300, 1500, False), 0.14)
cue(30, 'pulidora', 'barrido de la línea sobre el lienzo', pulidora(1.5), 0.13)
for i, f in enumerate(range(36, 116, 8)): cue(f, f'chispa {i+1}', 'aparece una fila de puntos de luz', tick(3600 + 260 * (i % 5), 0.07), 0.07, (-0.6, 0.5, -0.2, 0.7, 0.1)[i % 5])
cue(38, 'tick cristal', 'aterriza DETALLADO', tap(), 0.26, -0.3)
cue(82, 'tick cristal', 'aterriza BOUTIQUE', tap(), 0.26, -0.3)
cue(104, 'swish', 'las palabras se encogen al antetítulo', whoosh(0.3, 900, 4500, False), 0.14)
cue(118, 'tick cristal', 'aterriza ALTO', tap(), 0.22)
cue(127, 'tick cristal', 'aterriza NIVEL', tap(), 0.22)
cue(120, 'sub swell', 'se forma el celular de cristal', subswell(0.8), 0.4)
cue(125, 'barrido', 'la línea sube descubriendo la página', whoosh(1.1, 500, 3800), 0.13)
cue(165, 'glass tap', 'el cristal del celular termina de formarse', tap(0.3), 0.22)
cue(183, 'shimmer', 'aparece el logo', shimmer(0.8), 0.14)
cue(196, 'zip', 'la línea cae al título', zipp(0.3, 4000, 900), 0.14)
cue(222, 'tick', 'la línea se asienta bajo ALTO NIVEL', tick(2400, 0.1), 0.14)
cue(236, 'whoosh', 'la cámara empuja hacia el sello', whoosh(0.7, 250, 2200), 0.16)
for i in range(5):
    cue(240 + i * 6, f'vuelo {i+1}', 'sale un punto de luz', whoosh(0.3, 2000, 7000), 0.05, (-0.7, 0.7, -0.5, 0.6, 0)[i])
    cue(264 + i * 6, f'ping estrella {i+1}', 'el punto se abre en estrella', ping(PENT[i]), 0.18, -0.4 + 0.2 * i)
cue(335, 'whoosh', 'la cámara se abre y la página baja a servicios', whoosh(0.7, 2600, 300, False), 0.2)
cue(345, 'pop', 'entra el botón fijo', pop(), 0.2)
cue(378, 'contacto', 'se detiene en la tarjeta PPF', tap(0.2), 0.12)
cue(392, 'aire', 'scroll hacia polarizado', whoosh(0.8, 400, 1600), 0.09)
cue(440, 'contacto', 'pasa la tarjeta de polarizado', tick(1500, 0.1), 0.09)
cue(478, 'contacto', 'se detiene en nano cerámico', tap(0.2), 0.1)
cue(482, 'whoosh', 'scroll rápido a reseñas', whoosh(0.5, 500, 3200), 0.17)
cue(512, 'contacto', 'se detiene en la calificación', tap(0.2), 0.12)
cue(524, 'aire', 'scroll a la segunda reseña', whoosh(0.45, 400, 1500), 0.09)
cue(550, 'zip', 'la línea subraya la frase', zipp(0.3, 1200, 5200), 0.18, -0.3)
cue(568, 'tick', 'termina el subrayado', tick(2800, 0.09), 0.13, 0.3)
cue(600, 'whoosh', 'scroll al taller', whoosh(0.65, 500, 2800), 0.15)
cue(640, 'contacto', 'se detiene en la foto del taller', tap(0.2), 0.11)
cue(650, 'aire', 'la cámara se aleja', whoosh(0.8, 1800, 300, False), 0.12)
cue(672, 'tick cristal', 'aterriza TU', tap(), 0.2)
cue(690, 'tick cristal', 'aterriza PÁGINA', tap(), 0.24)
cue(708, 'swish', 'sale TU PÁGINA', whoosh(0.28, 1200, 5000), 0.12)
cue(714, 'whoosh', 'la cámara vuelve a acercarse', whoosh(0.5, 300, 2000), 0.13)
cue(716, 'zip', 'la línea entra hacia el botón', zipp(0.35, 800, 4200), 0.16, -0.5)
cue(738, 'tick', 'la línea queda de subrayado del botón', tick(2400, 0.1), 0.15)
cue(780, 'pulso', 'primer pulso del anillo', pulse_ring(), 0.3)
cue(810, 'pulso', 'segundo pulso del anillo', pulse_ring(), 0.34)
cue(810, 'click', 'se presiona el botón', click(), 0.4)
cue(814, 'whoosh', 'sube la hoja de cita', whoosh(0.5, 300, 2400), 0.16)
cue(846, 'contacto', 'la hoja se asienta', tap(0.25), 0.13)
cue(856, 'reverse swell', 'retroceso de cámara', swell(1.2), 0.2)
cue(862, 'power down', 'se apagan las luces', powerdown(1.0), 0.1)
for i, f in enumerate(range(868, 918, 10)): cue(f, f'apagado {i+1}', 'se apaga una franja de puntos', tick(1900 - 260 * i, 0.08), 0.07, -0.5 + 0.25 * i)
cue(896, 'ping', 'queda un solo punto de luz', ping(93, 0.5), 0.12)
cue(932, 'hit', 'el punto se abre en el logo', hitx(0.5), 0.3)
cue(936, 'zing', 'último barrido de la línea', zipp(0.3, 1500, 6000), 0.15)
cue(958, 'tick', 'la línea se asienta bajo el logo', tick(2600, 0.1), 0.1)
cue(960, 'sub drop', 'entra el end card', subswell(0.9), 0.3)
for f, n in ((962, 'PRECIOS ACCESIBLES'), (968, 'DESDE $1,000 PESOS'), (976, 'POR TU PÁGINA'), (990, 'línea del paquete'), (1004, 'firma de Elevate'), (1012, 'leyenda de demo')): cue(f, 'tick suave', f'aterriza {n}', tick(2100, 0.08), 0.07)
cue(978, 'atmósfera', 'end card en reposo', aire(2.2), 0.03)

def sfx():
    X = np.zeros((N, 2))
    for f, _, _, x, g, pan in C: put(X, x / (np.abs(x).max() + 1e-9), f / FPS, g, pan)
    return reverb(X, 0.25, 0.9, 0.18)

# ============ MEZCLA ============
def wav(p, x): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(x.shape[1]), '-i', '-', '-c:a', 'pcm_s24le', str(p)], input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), check=True)
def lufs(p):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(p), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)[-1])
db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)

if __name__ == '__main__':
    tl = json.loads((R / 'brief/timeline.json').read_text())
    v = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(R / 'voz/voz_stem_48k.wav'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, dtype=np.float32).astype(np.float64)
    v = np.pad(v, (0, max(0, N - len(v))))[:N]; V = np.stack([v, v], 1)
    M, X = musica(), sfx()
    # ducking: envolvente de la voz (ataque 40 ms, sostén 250 ms)
    e = np.abs(v); k = int(0.04 * SR); e = np.convolve(e, np.ones(k) / k, 'same'); act = (e > 10 ** (-38 / 20)).astype(float)
    h = int(0.25 * SR); act = np.minimum(1, np.convolve(act, np.ones(h), 'same')); act = np.convolve(act, np.hanning(int(0.12 * SR)) / np.hanning(int(0.12 * SR)).sum(), 'same')
    # nivel de música: 17 dB de media (mínimo 12 en cada frase) por debajo de la voz mientras habla
    mask = e > 10 ** (-38 / 20); gm = 10 ** ((db(v[mask]) - 17 - db((M * (1 - 0.5 * act)[:, None])[mask].mean(1))) / 20)
    M *= gm * (1 - 0.5 * act)[:, None]; X *= (1 - 0.3 * act)[:, None] * 0.8
    for a, b in [(vz['f'] / FPS + 0.05, vz['f'] / FPS + vz['corte'][1] - vz['corte'][0] - 0.05) for vz in tl['voz']]:
        s = slice(int(a * SR), int(b * SR)); print(f"  voz {a:5.2f}–{b:5.2f} s: música {db(M[s].mean(1)) - db(v[s]):+.1f} dB respecto a la voz")
    mix = V + M + X
    for n, s in (('voz', V), ('musica', M), ('sfx', X)): wav(OUT / f'{n}.wav', s)
    wav(OUT / '_pre.wav', mix); i0, _ = lufs(OUT / '_pre.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / '_pre.wav'), '-af', f'volume={-14 - i0 + 0.4:.2f}dB,alimiter=limit=-1.6dB:level=false:attack=3:release=60', '-ar', '48000', '-c:a', 'pcm_s24le', str(OUT / '_lim.wav')], check=True)
    i1, _ = lufs(OUT / '_lim.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / '_lim.wav'), '-af', f'volume={-14 - i1:.2f}dB', '-c:a', 'pcm_s24le', str(OUT / 'mezcla_master.wav')], check=True)
    (OUT / '_pre.wav').unlink(); (OUT / '_lim.wav').unlink()
    (OUT / 'cues.json').write_text(json.dumps([{'cuadro': f, 't': round(f / FPS, 3), 'sonido': n, 'movimiento': m} for f, n, m, *_ in sorted(C, key=lambda c: c[0])], ensure_ascii=False, indent=1))
    print('cues SFX:', len(C), '| master (LUFS, dBTP):', lufs(OUT / 'mezcla_master.wav'))
