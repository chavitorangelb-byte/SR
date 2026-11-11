#!/usr/bin/env python3
"""Música, SFX y mezcla de «El vuelo», todo sintetizado en código (sin samples ni soundfonts).

- Música original: 120 BPM, compás de 2.0 s, Do mayor. Pizzicato (Karplus-Strong), marimba, glockenspiel,
  palmas, bajo redondo, escobillas, caja de música y pad. Una capa nueva por sección (ver brief).
- SFX: un cue por movimiento visible, atado a su cuadro de brief/timeline.json. Hoja: audio/hoja_cues.md.
- Mezcla: voz a −16 LUFS, música ≥ 12 dB por debajo de cada palabra (ducking), master −14 LUFS / −1.25 dBTP.
Salida en audio/build/: musica.wav, sfx.wav, voz.wav, mezcla_master.wav. Uso: python3 claudia/audio/audio.py
"""
import json, subprocess
from pathlib import Path
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'build'; OUT.mkdir(parents=True, exist_ok=True)
TL = json.loads((ROOT / 'brief' / 'timeline.json').read_text())
SR, DUR, FPS = 48000, 27.0, 60
N = int(SR * DUR); BEAT = 0.5; BAR = 2.0
rng = np.random.default_rng(11)
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])}
hz = lambda name: 440.0 * 2 ** ((12 * (int(name[-1]) + 1) + NOTE[name[:-1]] - 69) / 12)

def put(buf, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i < 0: return
    x = x[: N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414

def env(n, a=0.002, d=0.3, curve=4.0):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1.0) * np.exp(-t * curve / d)
tt = lambda d: np.arange(int(d * SR)) / SR
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b): return signal.sosfilt(signal.butter(2, [a, b], 'band', fs=SR, output='sos'), x)
noise = lambda d: rng.standard_normal(int(d * SR))

# ---------------- instrumentos ----------------
def pizz(f, d=0.5):      # cuerda pulsada (Karplus-Strong con paso bajo)
    n = int(d * SR); L = int(SR / f); b = lp(rng.uniform(-1, 1, L), 3200); out = np.zeros(n); out[:L] = b
    for i in range(L, n): out[i] = 0.497 * (out[i - L] + out[i - L + 1 if i - L + 1 < i else i - L])
    return lp(out, 4200) * env(n, 0.001, d, 3.0)
def marimba(f, d=0.6):
    t = tt(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 26) + 0.12 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t * 60)) * np.minimum(t / 0.002, 1)
def glock(f, d=1.2):
    t = tt(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 4.5) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 9) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 16)) * np.minimum(t / 0.001, 1)
def musicbox(f, d=1.6):
    t = tt(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) + 0.5 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 8) + 0.15 * np.sin(2 * np.pi * f * 6.3 * t) * np.exp(-t * 20)) * np.minimum(t / 0.0015, 1)
def bass(f, d=0.45):
    t = tt(d); x = np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * t) * np.exp(-t * 9)); return np.tanh(1.4 * x) * np.minimum(t / 0.006, 1) * np.exp(-t * 3.2) * np.minimum((d - t) / 0.03, 1)
def kick(v=1.0):
    t = tt(0.32); ph = 2 * np.pi * (48 * t + (120 - 48) / 28 * (1 - np.exp(-t * 28))); return np.sin(ph) * np.exp(-t * 11) * v
def sub(f, d, a=0.02):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.minimum(t / a, 1) * np.minimum((d - t) / 0.25, 1)
def clap():
    x = np.zeros(int(0.22 * SR))
    for k, dl in enumerate([0, 0.011, 0.023]):
        b = bp(noise(0.12), 900, 3400) * env(int(0.12 * SR), 0.001, 0.07 if k < 2 else 0.14, 4); i = int(dl * SR); x[i:i + len(b)] += b
    return x
def shaker(v=1.0): return hp(noise(0.06), 6000) * env(int(0.06 * SR), 0.004, 0.035, 4) * v
def brush(long=False):
    d = 0.16 if long else 0.07; return bp(noise(d), 2500, 9000) * env(int(d * SR), 0.012 if long else 0.003, d * 0.6, 3)
def pad(notes, d):
    t = tt(d); x = sum(np.sin(2 * np.pi * hz(n) * (1 + dt) * t + ph) for n in notes for dt, ph in [(-0.0025, 0), (0.0025, 1.3)])
    return lp(x / (2 * len(notes)), 1800) * np.minimum(t / 0.5, 1) * np.minimum((d - t) / 0.6, 1)
def riser(d, f0=400, f1=7000):
    n = int(d * SR); x = noise(d); t = np.arange(n) / n; out = np.zeros(n); B = 2048
    for i in range(0, n, B):
        fc = f0 * (f1 / f0) ** t[i]; seg = x[i:i + B]; out[i:i + B] = bp(np.concatenate([x[max(0, i - B):i], seg]), fc * 0.7, min(fc * 1.4, 20000))[-len(seg):]
    return out * t ** 2.2

CH = {'C': (['C2'], ['C4', 'E4', 'G4', 'C5']), 'Am': (['A1'], ['A3', 'C4', 'E4', 'A4']), 'F': (['F1'], ['F3', 'A3', 'C4', 'F4']), 'G': (['G1'], ['G3', 'B3', 'D4', 'G4'])}
MEL = {'C': [(0, 'E5'), (0.5, 'G5'), (1.5, 'E5'), (2, 'D5'), (3, 'C5'), (3.5, 'D5')], 'Am': [(0, 'E5'), (1, 'C5'), (1.5, 'A4'), (2.5, 'C5'), (3, 'E5')],
       'F': [(0, 'A5'), (0.5, 'G5'), (1, 'F5'), (2, 'C5'), (2.5, 'F5'), (3.5, 'A5')], 'G': [(0, 'G5'), (1, 'D5'), (1.5, 'B4'), (2, 'D5'), (3, 'G5'), (3.5, 'B5')]}
PROG = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'Am', 'G', 'C', 'F', 'C', 'C']   # un acorde por compás de 2 s

def musica():
    m = np.zeros((N, 2))
    put(m, kick(1.0), 0, 0.9); put(m, sub(hz('C2'), 1.9), 0, 0.5)                       # compás 1: golpe + destello
    for k, n in enumerate(['C6', 'E6', 'G6', 'C7', 'E7']): put(m, glock(hz(n)), 0.02 + k * 0.045, 0.16, (k - 2) * 0.25)
    for b in (2, 3): put(m, glock(hz('G6' if b == 2 else 'E6')), b * BEAT, 0.09, 0.3)
    for bar, ch in enumerate(PROG):
        t0 = bar * BAR; root, tones = CH[ch]
        breath = bar == 6; groove = bar >= 1 and not breath and t0 < 23.6; lift = bar in (10, 11)
        if t0 >= 24: break
        for s in range(16):
            ts = t0 + s * BEAT / 4
            if ts >= 23.6: break
            sw = 0.012 if s % 2 else 0
            if groove:
                if s % 2 == 0: put(m, pizz(hz(tones[[0, 2, 1, 3, 2, 1, 3, 2][s // 2]]) * 2), ts, 0.26 if bar < 10 else 0.3, -0.35)       # compás 2: pizzicato
                put(m, shaker(0.5 if s % 4 == 2 else 0.28), ts + sw, 0.2, 0.5)                                                              # y shaker
                if bar >= 2 and s in (0, 6, 10, 14): put(m, bass(hz(root[0]) * (2 if s == 14 else 1) * 2), ts, 0.42)                        # compás 3: bajo redondo
                if bar >= 2 and s in (0, 8): put(m, kick(0.6 if not lift else 0.85), ts, 0.5)
                if lift and s in (4, 12): put(m, kick(0.5), ts, 0.4)
                if bar >= 3 and s in (4, 12): put(m, clap(), ts, 0.16 if not lift else 0.22, 0.1)                                           # compás 4: palmas
                if bar >= 4: put(m, glock(hz(tones[s % 4]) * 4, 0.5), ts, 0.045 if not lift else 0.07, 0.6 - (s % 4) * 0.3)                # compás 5: arpegio de glockenspiel
                if bar >= 5: put(m, brush(s % 8 == 4), ts + sw, 0.2 if s % 2 == 0 else 0.1, -0.5)                                           # compás 6: escobillas
        if groove and bar >= 3:
            for b, n in MEL[ch]:                                                                                                            # compás 4: marimba
                if t0 + b * BEAT < 23.6: put(m, marimba(hz(n)), t0 + b * BEAT, 0.3, 0.15); 
                if lift and t0 + b * BEAT < 23.6: put(m, marimba(hz(n) * 2), t0 + b * BEAT, 0.12, -0.15)
        if breath:                                                                                                                          # compás 7: caja de música y pad
            put(m, pad(tones, 2.3), t0 - 0.1, 0.3)
            for b, n in [(0, 'A5'), (1, 'C6'), (2, 'F5'), (2.5, 'A5'), (3, 'C6'), (3.5, 'E6')]: put(m, musicbox(hz(n)), t0 + b * BEAT, 0.2, 0.2)
        if lift: put(m, pad(tones, min(2.2, 23.6 - t0)), t0, 0.22)
    put(m, riser(2.0), 16.0, 0.07); put(m, riser(1.0, 600, 9000), 19.0, 0.12)                                                               # riser al compás 10 y al lift
    put(m, kick(1.0), 20.0, 0.8); put(m, sub(hz('C2'), 0.9), 20.0, 0.4)
    for k, n in enumerate(['G6', 'C7', 'E7']): put(m, glock(hz(n)), 20.0 + k * 0.05, 0.12, k * 0.3 - 0.3)
    put(m, lp(sub(hz('C2'), 1.0, 0.05), 120), 23.55, 0.5)                                                                                   # respiro: solo sub grave
    put(m, pad(['C4', 'E4', 'G4', 'D5'], 3.0), 24.0, 0.13)                                                                                  # end card
    for b, n in [(0.5, 'E6'), (1.5, 'G6'), (2.5, 'D6'), (3.5, 'C6')]: put(m, musicbox(hz(n)), 24.0 + b * BEAT, 0.12, 0.2)
    put(m, glock(hz('C6'), 1.4) + 0.5 * glock(hz('G6'), 1.4), 26.4, 0.2); put(m, sub(hz('C2'), 0.6, 0.03), 26.4, 0.5)                       # campanada suave con sub grave
    return m

# ---------------- SFX ----------------
def whoosh(d=0.35, f0=500, f1=5000, up=True):
    n = int(d * SR); t = np.arange(n) / n; x = noise(d); out = np.zeros(n); B = 1024
    for i in range(0, n, B):
        u = t[i] if up else 1 - t[i]; fc = f0 * (f1 / f0) ** u; s = x[i:i + B]; out[i:i + B] = bp(np.concatenate([x[max(0, i - B):i], s]), fc * 0.6, min(fc * 1.6, 20000))[-len(s):]
    return out * np.sin(np.pi * t) ** 1.5
def tap(): t = tt(0.05); return np.sin(2 * np.pi * 1900 * t * np.exp(-t * 20)) * np.exp(-t * 90)
def tick(v=0): t = tt(0.025); return np.sin(2 * np.pi * (3100 + 500 * v) * t) * np.exp(-t * 240) + 0.3 * hp(noise(0.025), 5000) * np.exp(-t * 300)
def impact(): t = tt(0.35); return np.sin(2 * np.pi * (60 + 90 * np.exp(-t * 30)) * t) * np.exp(-t * 13) + 0.35 * lp(noise(0.35), 1800) * np.exp(-t * 40)
def stamp(): t = tt(0.3); return np.sin(2 * np.pi * (75 + 140 * np.exp(-t * 45)) * t) * np.exp(-t * 16) + 0.5 * bp(noise(0.3), 300, 2500) * np.exp(-t * 55)
def glass(): t = tt(0.5); return (0.6 * whoosh(0.5, 1800, 7000) + sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 9) for f in (2637, 3520, 4186)) * 0.12)
def sparkle(): t = tt(0.7); return sum(np.sin(2 * np.pi * f * t) * np.exp(-(t - dl).clip(0) * 11) * (t > dl) for f, dl in [(3136, 0), (4186, 0.05), (5274, 0.1), (6272, 0.16)]) * 0.25
def grains(d=0.5, dark=True):
    n = int(d * SR); x = np.zeros(n)
    for _ in range(int(d * 70)):
        i = rng.integers(0, n - 400); g = (lp if dark else hp)(noise(0.008), 2600 if dark else 5000) * np.hanning(384); x[i:i + 384] += g * rng.uniform(0.3, 1)
    return x * np.linspace(1, 0, n) ** 1.2
def ping(f): t = tt(0.4); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 12)
def pop(up=True): t = tt(0.09); f = (500 + 700 * t / 0.09) if up else (1100 - 500 * t / 0.09); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35)
def thud(): t = tt(0.4); return np.sin(2 * np.pi * (52 + 40 * np.exp(-t * 25)) * t) * np.exp(-t * 9)

KIT = {'latigazo': (lambda: whoosh(0.16, 900, 9000), 0.5), 'trazo': (lambda: whoosh(0.9, 1500, 5000) * 0.6 + 0.2 * grains(0.9, False), 0.3), 'linea': (lambda: whoosh(0.28, 1200, 6000), 0.3),
       'tap': (tap, 0.4), 'scroll': (lambda: whoosh(0.5, 300, 2600), 0.42), 'clic': (tick, 0.18), 'impacto': (impact, 0.7), 'estampa': (stamp, 0.7), 'cristal': (glass, 0.3),
       'destello': (sparkle, 0.4), 'migas': (lambda: grains(0.5, True), 0.5), 'azucar': (lambda: grains(0.6, False), 0.3), 'estrella': (None, 0.35), 'burbuja': (pop, 0.45),
       'paneo': (lambda: whoosh(0.9, 120, 900), 0.6), 'riser': (lambda: riser(0.8, 800, 8000), 0.2), 'endcard': (thud, 0.5), 'campanita': (lambda: ping(2093), 0.25)}

def cues():
    c = []   # (cuadro, tipo, descripción, pan)
    A = lambda f, k, d, p=0.0: c.append((f, k, d, p))
    A(0, 'latigazo', 'la línea cruza de lado a lado', 0); A(8, 'destello', 'destello del golpe', 0.4); A(12, 'trazo', 'la línea dibuja el marco del celular', 0); A(50, 'trazo', 'la línea cobra cuerpo: punteada a sólida', 0)
    A(232, 'linea', 'la línea brota del canto y enmarca la foto del héroe', 0.3); A(300, 'linea', 'la línea vuelve a ser barra de scroll', 0.5)
    A(444, 'linea', 'la línea enmarca la foto de Bodas', -0.3); A(492, 'linea', 'la línea salta a Cumpleaños', 0.3); A(560, 'linea', 'la línea enmarca Temáticos', -0.3); A(610, 'linea', 'la línea salta a Cupcakes', 0.3)
    A(120, 'paneo', 'el celular se endereza al frontal', -0.2); A(126, 'tap', 'la pantalla enciende', 0); A(136, 'cristal', 'baja el encabezado con el logo', 0); A(152, 'tap', 'aparece el botón flotante', 0.5)
    A(180, 'tap', 'titular del héroe', -0.2); A(196, 'tap', 'subtítulo', -0.2); A(210, 'burbuja', 'botón Cotiza por WhatsApp', -0.2); A(238, 'scroll', 'la foto del héroe se abre', 0.2); A(268, 'tap', 'sello Hecho en casa', -0.3)
    A(270, 'paneo', 'empuje de cámara al héroe', 0); A(334, 'scroll', 'scroll a Qué hacemos', 0)
    for f, n in [(370, 'Pasteles personalizados'), (442, 'Bodas'), (491, 'Cumpleaños'), (552, 'XV años'), (609, 'Cupcakes'), (652, 'Galletas'), (699, 'Gelatinas')]: A(f, 'burbuja', f'ficha {n}', -0.3)
    for f, n in [(442, 'Bodas'), (491, 'Cumpleaños'), (560, 'Temáticos'), (609, 'Cupcakes')]: A(f + 2, 'cristal', f'tarjeta de galería {n} entra en perspectiva', 0.3); A(f + 12, 'destello', f'destello especular en {n}', 0.3)
    A(522, 'scroll', 'scroll a la segunda fila de la galería', 0); A(354, 'migas', 'migas de PASTELES', 0); A(26, 'azucar', 'azúcar de REPOSTERÍA', 0); A(126, 'azucar', 'azúcar de SOBRE PEDIDO', 0); A(617, 'azucar', 'azúcar de CUPCAKES', 0)
    A(722, 'cristal', 'el encabezado y el botón se retiran', 0); A(736, 'paneo', 'la cámara se aleja: la página completa', 0); A(740, 'azucar', 'cae azúcar glas', -0.4); A(780, 'azucar', 'cae azúcar glas', 0.4); A(808, 'paneo', 'regreso al celular', 0)
    A(846, 'cristal', 'vuelve el encabezado', 0); A(852, 'burbuja', 'vuelve el botón flotante', 0.5); A(892, 'linea', 'la línea viaja al botón de WhatsApp', 0.5); A(905, 'destello', 'la línea se funde con el botón', 0.5)
    A(932, 'burbuja', 'burbuja: Hola, quiero cotizar un pastel', 0.3); A(982, 'burbuja', 'respuesta: Escríbenos por WhatsApp', -0.3); A(976, 'tap', 'toque en el botón de WhatsApp', 0.5); A(994, 'scroll', 'scroll a Reseñas', 0)
    A(1013, 'impacto', 'aparece el 4.7', -0.3)
    for i in range(5): A(1026 + i * 8, 'estrella', f'estrella {i + 1} se llena', -0.2 + i * 0.1)
    A(1040, 'tap', 'frase de la reseña', 0); A(1081, 'tap', '12 reseñas en Google', 0); A(1100, 'scroll', 'scroll a Visítanos', 0); A(1104, 'linea', 'la línea enmarca el mapa', 0); A(1114, 'cristal', 'tarjeta de cristal del horario', 0)
    A(1120, 'trazo', 'la ruta punteada se traza en el mapa', 0); A(1148, 'burbuja', 'cae el pin', 0.2); A(1152, 'tap', 'Aguascalientes', -0.2); A(1130, 'tap', 'Domingo cerrado', -0.2)
    A(1152, 'riser', 'riser al lift', 0); A(1196, 'scroll', 'la página regresa arriba', -0.3); A(1200, 'paneo', 'el celular se hace a un lado', -0.4); A(1206, 'cristal', 'entra el navegador', 0.4); A(1214, 'linea', 'la línea enmarca el navegador', 0.3)
    A(1306, 'scroll', 'scroll en computadora a la galería', 0.3); A(1340, 'paneo', 'ambas pantallas se alejan', 0); A(1350, 'trazo', 'la línea rodea el logo', 0); A(1362, 'campanita', 'aparece el logo', 0); A(1386, 'destello', 'el aro se cierra', 0)
    A(1396, 'riser', 'riser corto al cierre', 0)
    A(1440, 'endcard', 'entra el panel de cristal del end card', 0); A(1442, 'cristal', 'panel de cristal', 0); A(1470, 'tap', 'Repostería casera personalizada · Aguascalientes', 0); A(1488, 'burbuja', 'botón Cotiza por WhatsApp · teléfono', 0); A(1506, 'tap', '@claudia.reposteriacasera', 0); A(1524, 'tap', 'pie de cortesía', 0)
    for k in TL['kinetic']:       # impacto por palabra + clics de glifos
        txt = k['texto'].replace(' / ', ' '); tipo = 'estampa' if 'estampa' in k['entrada'] else 'impacto'
        if k['texto'] == 'REPOSTERÍA / CASERA':
            A(1388, 'impacto', 'impacto: REPOSTERÍA (cierre)', 0); A(1404, 'impacto', 'impacto: CASERA (cierre)', 0)
        elif 'desliza' in k['entrada'] or 'barrido' in k['entrada']: A(k['f'], 'latigazo', f'barrido: {txt}', 0)
        else: A(k['f'] + 5, tipo, f'impacto: {txt}', 0)
        n = len(txt.replace(' ', ''))
        for i in range(0, n, 3 if n > 6 else 2): A(k['f'] + round(i * 1.7), 'clic', f'glifos de {txt} ({i + 1})', (i / max(1, n - 1) - 0.5) * 0.8)
    return sorted(c)

def sfx(cs):
    s = np.zeros((N, 2))
    for i, (f, k, d, p) in enumerate(cs):
        if k == 'estrella': x, g = ping(1568 * 2 ** (int(d.split()[1]) * 2 / 12)), KIT[k][1]
        elif k == 'clic': x, g = tick(i % 3), KIT[k][1]
        else: x, g = KIT[k][0](), KIT[k][1]
        put(s, x / (np.abs(x).max() + 1e-9), f / FPS, g * 0.5, p)
    return s

def wav(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(x.shape[1]), '-i', '-', '-c:a', 'pcm_s24le', str(path)], input=x.astype(np.float32).tobytes(), check=True)
def lufs(path):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = e[e.rindex('Summary'):]; I = float(s.split('I:')[1].split('LUFS')[0]); P = float(s.split('Peak:')[1].split('dBFS')[0]); return I, P
def gain_to(x, path, target):
    wav(path, x); I, _ = lufs(path); return x * 10 ** ((target - I) / 20)

def main():
    cs = cues()
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / 'voz' / 'voz_stem_48k.wav'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    v = np.frombuffer(pcm, dtype=np.float32).astype(np.float64)[:N]; v = np.pad(v, (0, N - len(v))); voz = np.stack([v, v], 1)
    tmp = OUT / '_t.wav'
    voz = gain_to(voz, tmp, -16.0); v = voz[:, 0]
    mus = gain_to(musica(), tmp, -23.0); fx = gain_to(sfx(cs), tmp, -26.0)
    # ducking: la música baja 8 dB bajo cada palabra y los SFX 4 dB (ataque 40 ms, regreso 280 ms)
    e = np.abs(v); k = int(0.03 * SR); e = np.convolve(e, np.ones(k) / k, 'same'); act = (e > 10 ** (-42 / 20)).astype(float)
    act = np.maximum.reduce([np.roll(act, -int(0.06 * SR)), act]); g = np.zeros(N); a_up, a_dn = 1 - np.exp(-1 / (0.04 * SR)), 1 - np.exp(-1 / (0.28 * SR)); y = 0.0
    for i in range(N): y += (act[i] - y) * (a_up if act[i] > y else a_dn); g[i] = y
    mus_d = mus * (10 ** (-8 * g / 20))[:, None]; fx_d = fx * (10 ** (-4 * g / 20))[:, None]
    fade = np.ones(N); fn = int(0.12 * SR); fade[-fn:] = np.linspace(1, 0, fn) ** 2
    mus_d *= fade[:, None]; fx_d *= fade[:, None]
    mixb = voz + mus_d + fx_d
    wav(OUT / 'voz.wav', voz); wav(OUT / 'musica.wav', mus_d); wav(OUT / 'sfx.wav', fx_d); wav(tmp, mixb)
    ln = 'loudnorm=I=-14:TP=-1.25:LRA=9'
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(tmp), '-af', ln + ':print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', f"{ln}:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,alimiter=limit=-1.3dB:level=false",
                    '-ar', str(SR), '-c:a', 'pcm_s24le', str(OUT / 'mezcla_master.wav')], check=True)
    tmp.unlink()
    # verificación: música vs voz en las ventanas con voz
    w = g > 0.9; rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x[w] ** 2)) + 1e-12)
    print(f'cues SFX: {len(cs)}'); print(f'con voz: voz {rms(voz):.1f} dBFS · música {rms(mus_d):.1f} dBFS · diferencia {rms(voz) - rms(mus_d):.1f} dB')
    for n in ['voz', 'musica', 'sfx', 'mezcla_master']: I, P = lufs(OUT / f'{n}.wav'); print(f'{n}: {I:.1f} LUFS, pico {P:.2f} dBFS')
    conteo = {}
    for _, k, _, _ in cs: conteo[k] = conteo.get(k, 0) + 1
    md = ['# Hoja de cues de SFX · Claudia Repostería Casera', '', f'{len(cs)} cues sintetizados en código (`audio/audio.py`), cada uno atado a su cuadro (60 fps).', '', '| # | Tiempo | Cuadro | Tipo | Movimiento |', '|---|---|---|---|---|']
    md += [f'| {i + 1} | {f / FPS:.2f} s | f{f} | {k} | {d} |' for i, (f, k, d, _) in enumerate(cs)]
    md += ['', '## Reparto', ''] + [f'- {k}: {n}' for k, n in sorted(conteo.items(), key=lambda kv: -kv[1])]
    (ROOT / 'audio' / 'hoja_cues.md').write_text('\n'.join(md) + '\n')

if __name__ == '__main__':
    main()
