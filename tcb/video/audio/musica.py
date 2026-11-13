#!/usr/bin/env python3
"""Música original en código para el video de TCB. Solo numpy: sin samples, sin IA, sin stock.

Groove funk a 136 BPM en Mi. La retícula está desfasada 0.3235 s para que los tiempos fuertes
caigan donde pasan cosas en pantalla: primera letra (0.3 s), cada capa de la burger (21.5 s y
cada 0.88 s = 2 tiempos), la etiqueta de la oferta (30.8 s).

Estructura por compás (1 compás = 1.765 s):
  0-2   intro: bajo, hi-hat y bombo suelto      (escena 1, el nombre)
  3-6   groove completo                          (escena 2, tarjetas; platillo en 6.06 s)
  7     subida de ruido, sin batería             (cae el queso, 12.7 s)
  8     respiro: bajo largo y hi-hat             ("cada pedido por app paga comisión")
  9-10  golpe y groove                           (la salsa cubre, 16.2 s)
  11    bombo a tiempo, tensión                  (aparece el piso de la burger)
  12-15 groove + tom en cada capa que cae        (escena 4)
  16-18 groove con acordes arriba; platillo 30.8 (cierre y oferta)
  19    golpe final sostenido y cola hasta 36 s

Salida: audio/musica.wav (48 kHz estéreo, sin bajar bajo la voz; eso lo hace montar_audio.sh).
Uso: python3 video/audio/musica.py
"""
import wave
from pathlib import Path
import numpy as np

SR = 48000
DUR = 36.0
N = int(SR * DUR)
BPM = 136.0
BEAT = 60 / BPM
STEP = BEAT / 4                 # semicorchea
BAR = BEAT * 4
T0 = 0.3235                     # desfase de la retícula
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def poner(buf, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i < 0:
        return
    b = buf[: N - i]
    L[i:i + len(b)] += b * g * (1 - max(0, pan))
    R[i:i + len(b)] += b * g * (1 + min(0, pan))


def env(n, a, d, forma=1.0):
    """Ataque lineal de a s y caída exponencial con constante d s."""
    t = np.arange(n) / SR
    e = np.exp(-t / d) ** forma
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    e[-64:] *= np.linspace(1, 0, 64)
    return e


def pasa_banda(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) * 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


# ---------------- instrumentos ----------------
def bombo(dur=0.32):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.028)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.11)
    clic = rng.standard_normal(n) * np.exp(-t / 0.004) * 0.25
    return np.tanh((x + clic) * 1.6)


def caja(dur=0.26):
    n = int(dur * SR); t = np.arange(n) / SR
    ruido = pasa_banda(rng.standard_normal(n), 1400, 9000) * np.exp(-t / 0.07)
    tono = (np.sin(2 * np.pi * 196 * t) + 0.6 * np.sin(2 * np.pi * 331 * t)) * np.exp(-t / 0.045)
    return np.tanh((ruido * 1.5 + tono * 0.7) * 1.3) * env(n, 0.0005, 1)


def palmada(dur=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    r = pasa_banda(rng.standard_normal(n), 900, 5200)
    e = sum(np.where(t >= d, np.exp(-(t - d) / (0.012 if d < 0.03 else 0.07)), 0) for d in (0, 0.011, 0.023, 0.034))
    return r * e * 0.9


def hat(abierto=False):
    dur = 0.3 if abierto else 0.07
    n = int(dur * SR); t = np.arange(n) / SR
    r = pasa_banda(rng.standard_normal(n), 7000, 16000)
    return r * np.exp(-t / (0.09 if abierto else 0.014)) * env(n, 0.0005, 1)


def tom(m=45, dur=0.42):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(m) * (1 + 0.5 * np.exp(-t / 0.03))
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 1.4) * env(n, 0.001, 0.13)


def platillo(dur=2.4):
    n = int(dur * SR); t = np.arange(n) / SR
    r = pasa_banda(rng.standard_normal(n), 3500, 15000)
    return r * (np.exp(-t / 0.4) * 0.8 + np.exp(-t / 0.03)) * env(n, 0.001, 5) * 0.6


def bajo(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.25 * np.exp(-t * (1.5 + k * 2.2)) for k in range(1, 9))
    x += 0.55 * np.sin(2 * np.pi * f * t)
    e = np.minimum(1, t / 0.004) * np.minimum(1, (dur - t) / 0.02).clip(0)
    return np.tanh(x * 1.2) * e


def tecla(notas, dur, brillo=1.0):
    """Acorde de piano eléctrico: FM sencilla de dos operadores."""
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notas:
        f = hz(m)
        mod = np.sin(2 * np.pi * f * 2 * t) * (2.2 * brillo * np.exp(-t / 0.09) + 0.35)
        x += np.sin(2 * np.pi * f * t + mod) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t))
    return x / len(notas) * env(n, 0.003, dur * 0.55)


def subida(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    r = rng.standard_normal(n); X = np.fft.rfft(r); f = np.fft.rfftfreq(n, 1 / SR)
    partes = []
    for k in range(8):                                   # barrido del filtro por tramos
        fc = 400 * (22 ** (k / 7))
        partes.append(np.fft.irfft(X / (1 + (f / fc) ** 4) / (1 + (120 / np.maximum(f, 1)) ** 2), n))
    partes = np.array(partes); pos = t / dur * 7; i0 = np.clip(pos.astype(int), 0, 6); fr = pos - i0
    x = partes[i0, np.arange(n)] * (1 - fr) + partes[i0 + 1, np.arange(n)] * fr
    return x * (t / dur) ** 2.2 * 0.5


# ---------------- composición ----------------
E1, A1, B1, D2, G1 = 28, 33, 35, 38, 31
# (raíz del bajo, voces del acorde) por compás; progresión de 4 compases
PROG = [(E1, [62, 68, 71, 76]),      # E7
        (A1, [61, 67, 69, 76]),      # A7
        (E1, [62, 68, 71, 78]),      # E9
        (B1, [63, 69, 74, 78])]      # B7(#9)
BAJO = {0: 0, 3: 0, 6: 12, 8: 0, 10: 10, 12: 0, 14: 7}       # paso: intervalo sobre la raíz
BOMBO = [0, 7, 10]; CAJA = [4, 12]


def tiempo(c, paso):
    sw = 0.022 if paso % 2 else 0.0                    # swing ligero en las semicorcheas débiles
    return T0 + c * BAR + paso * STEP + sw


def compas(c, bombo_=True, caja_=True, hat_=1.0, bajo_=True, tecla_=0.0, lleno=True):
    raiz, voces = PROG[c % 4]
    for p in range(16):
        if hat_ and p % 2 == 0:
            poner(hat(p == 14 and lleno), tiempo(c, p), 0.16 * hat_ * (1.0 if p % 4 == 0 else 0.6), 0.25)
        if hat_ and lleno and p in (3, 11):
            poner(hat(), tiempo(c, p), 0.07 * hat_, -0.3)
    if bombo_:
        for p in (BOMBO if lleno else [0, 8]):
            poner(bombo(), tiempo(c, p), 0.95)
    if caja_:
        for p in CAJA:
            poner(caja(), tiempo(c, p), 0.55); poner(palmada(), tiempo(c, p), 0.3, -0.15)
    if bajo_:
        for p, iv in BAJO.items():
            largo = STEP * (2.6 if p in (0, 8) else 1.5)
            poner(bajo(raiz + 12 + iv, largo), tiempo(c, p), 0.6)
    if tecla_:
        for p, d in ((2, 1.4), (6, 1.2), (11, 1.2), (14, 1.6)):
            poner(tecla(voces, STEP * d), tiempo(c, p), 0.3 * tecla_, 0.2 if p % 4 else -0.2)


def redoble(c, desde=12):
    for k, p in enumerate(range(desde, 16)):
        poner(caja(), tiempo(c, p), 0.28 + 0.09 * k)


# intro
compas(0, bombo_=False, caja_=False, hat_=0.6, lleno=False); poner(bombo(), tiempo(0, 0), 0.95)
compas(1, caja_=False, hat_=0.8, lleno=False, tecla_=0.5)
compas(2, caja_=False, hat_=1.0, lleno=False, tecla_=0.7)
# entrada del groove a media vuelta del compás 3: cambia la escena en 6.06 s
compas(3, tecla_=0.8); redoble(3, 1); poner(platillo(), tiempo(3, 4), 0.3)
for c in (4, 5, 6):
    compas(c, tecla_=1.0)
redoble(6)
# cae el queso
poner(subida(BAR), tiempo(7, 0), 0.75); compas(7, bombo_=False, caja_=False, hat_=0.0, bajo_=False)
poner(bajo(E1 + 12, BAR * 0.9), tiempo(7, 0), 0.5); poner(platillo(1.6), tiempo(7, 0), 0.22)
# respiro: el problema
poner(bombo(), tiempo(8, 0), 1.0); poner(platillo(), tiempo(8, 0), 0.34)
compas(8, bombo_=False, caja_=False, hat_=0.55, bajo_=False, lleno=False)
poner(bajo(E1 + 12, BAR * 0.48), tiempo(8, 0), 0.6); poner(bajo(G1 + 12, BAR * 0.45), tiempo(8, 8), 0.6)
redoble(8, 13)
# la salsa: vuelve todo
poner(platillo(), tiempo(9, 0), 0.4)
compas(9, tecla_=1.1); compas(10, tecla_=1.1)
# aparece el piso: tensión
compas(11, caja_=False, lleno=False, tecla_=0.5); redoble(11, 10)
# la burger se arma: tom en cada capa (21.50 + 0.882 k)
for c in (12, 13, 14, 15):
    compas(c, tecla_=0.9)
for k in range(6):
    poner(tom(47 - k), 21.5 + k * 2 * BEAT, 0.6, 0.3 * (-1) ** k)
redoble(15)
# cierre
poner(platillo(), tiempo(16, 0), 0.4)
for c in (16, 17, 18):
    compas(c, tecla_=1.25)
poner(platillo(2.0), tiempo(17, 4), 0.34)            # etiqueta de la oferta, 30.8 s
redoble(18, 10)
# golpe final
tf = tiempo(19, 0)
poner(bombo(0.5), tf, 1.0); poner(platillo(3.2), tf, 0.45); poner(bajo(E1 + 12, 1.9), tf, 0.7)
poner(tecla([64, 68, 71, 74, 78], 2.3, 1.3), tf, 0.5)

# ---------------- salida ----------------
mix = np.stack([L, R], axis=1)
t = np.arange(N) / SR
mix *= np.minimum(1, t / 0.02)[:, None] * np.clip((DUR - t) / 0.6, 0, 1)[:, None]
mix = np.tanh(mix * 0.9)                              # limitador suave
mix /= np.abs(mix).max() / 0.89
out = Path(__file__).resolve().parent / 'musica.wav'
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
rms = np.sqrt((mix ** 2).mean())
print(f'ok {out.name}: {DUR:.0f} s, pico {np.abs(mix).max():.2f}, RMS {20 * np.log10(rms):.1f} dBFS')
