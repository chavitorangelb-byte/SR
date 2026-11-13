#!/usr/bin/env python3
"""SFX sintetizados en código para Maison Rose: un cue por cada movimiento visible, en su cuadro (60 fps).

Salida: audio/build/sfx_stem.wav (48 kHz estéreo) y audio/build/sfx_cues.json.
Requiere: numpy, scipy.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'build'
OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
TL = json.loads((ROOT / 'brief' / 'timeline.json').read_text())
FPS = TL['fps']
DUR = TL['frames'] / FPS
N = int(DUR * SR)
rng = np.random.default_rng(23)
W = {v['id']: [w['f'] for w in v['palabras']] for v in TL['voz']}   # cuadro de cada palabra de la voz


# ---------------- utilidades de síntesis ----------------
def n_(sec):
    return max(1, int(sec * SR))


def t_(n):
    return np.arange(n) / SR


def noise(n):
    return rng.standard_normal(n)


def band(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def low(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def high(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def dec(n, tau):
    return np.exp(-t_(n) / tau)


def att(n, a):
    return 1 - np.exp(-t_(n) / max(a, 1e-4))


def bell(n, peak=0.5, sharp=2.0):
    u = np.linspace(0, 1, n)
    return np.where(u < peak, (u / peak) ** sharp, ((1 - u) / (1 - peak)) ** sharp)


def sweep(f0, f1, n):
    f = np.geomspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def band_sweep(f0, f1, n, q=0.6):
    """Ruido filtrado por un pasa banda que se desplaza (bloques de 5 ms)."""
    x = noise(n)
    out = np.zeros(n)
    blk = n_(0.005)
    fs = np.geomspace(f0, f1, max(1, n // blk + 1))
    zi = None
    for i, fc in enumerate(fs):
        s = x[i * blk:(i + 1) * blk]
        if not len(s):
            break
        lo, hi = fc * (1 - q / 2), fc * (1 + q / 2)
        b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        y, zi = signal.lfilter(b, a, s, zi=zi)
        out[i * blk:i * blk + len(s)] = y
    return out


def grains(n, lo, hi, rate=80, glen=(0.006, 0.02)):
    out = np.zeros(n)
    k = 0
    while k < n:
        g = n_(rng.uniform(*glen))
        seg = noise(g) * np.hanning(g) * rng.uniform(0.3, 1.0)
        out[k:k + g] += seg[: n - k]
        k += n_(rng.exponential(1 / rate))
    return band(out, lo, hi)


def shimmer(n, base=2100, k=6, tau=0.8):
    tt = t_(n)
    x = np.zeros(n)
    for i in range(k):
        f = base * (1 + i * 0.57 + rng.uniform(-0.03, 0.03))
        x += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6.28)) * (0.8 ** i)
    return x * dec(n, tau) * att(n, 0.02) * (1 + 0.15 * np.sin(2 * np.pi * 7 * tt))


def click(n=n_(0.003), lo=2000, hi=7000):
    return band(noise(n) * np.hanning(n), lo, hi)


def body(freq, n, tau):
    return np.sin(2 * np.pi * freq * t_(n)) * dec(n, tau)


def pluck(freq, sec=0.9, damp=0.996):
    n = n_(sec)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = damp * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return low(out, 5000) * att(n, 0.002)


def norm(x):
    m = np.abs(x).max()
    return x / m if m > 0 else x



def pad(x, n):
    return np.pad(x, (0, max(0, n - len(x))))[:n]


def sfx(name, d, idx):
    if name == 'golpe_suave':
        n = n_(0.5); return norm(np.sin(2 * np.pi * np.cumsum(44 + 36 * dec(n, 0.05)) / SR) * dec(n, 0.16) + 0.2 * low(noise(n), 900) * dec(n, 0.03))
    if name == 'golpe_grave':
        n = n_(1.2); return norm(low(noise(n), 300) * dec(n, 0.08) + 0.8 * body(58, n, 0.35))
    if name == 'whoosh':
        n = n_(max(0.25, d)); return norm(band_sweep(500, 3200, n, 0.8) * bell(n, 0.55, 1.6))
    if name == 'whoosh_baja':
        n = n_(max(0.3, d)); return norm(band_sweep(2600, 420, n, 0.8) * bell(n, 0.3, 1.4))
    if name == 'pliegue':       # la cinta se dobla: tela que gira y un golpe sordo
        n = n_(0.3); return norm(band_sweep(700, 2400, n, 0.9) * bell(n, 0.4) + 0.7 * pad(body(150, n_(0.12), 0.035), n) + 0.3 * grains(n, 2500, 8000, rate=60) * bell(n, 0.5))
    if name == 'crujido':       # hojaldre
        n = n_(0.22); return norm(grains(n, 2600, 9500, rate=170, glen=(0.002, 0.008)) * bell(n, 0.25, 1.2))
    if name == 'galleta':       # se parte
        n = n_(0.28); return norm(pad(click(n_(0.004), 900, 4000), n) + grains(n, 900, 5200, rate=120, glen=(0.004, 0.014)) * dec(n, 0.07) + 0.5 * pad(body(190, n_(0.08), 0.02), n))
    if name == 'tipo_entra':
        n = n_(0.26); return norm(band(noise(n), 3000, 9500) * bell(n, 0.55, 1.5))
    if name == 'tipo_cae':
        n = n_(0.2); return norm(pad(click(n_(0.003), 2000, 7000), n) + 0.7 * body(210, n, 0.03) + 0.4 * band(noise(n), 2500, 8000) * bell(n, 0.2))
    if name == 'golpe_tipo':
        n = n_(0.3); return norm(np.sin(2 * np.pi * np.cumsum(70 + 60 * dec(n, 0.03)) / SR) * dec(n, 0.08) + 0.35 * pad(click(n_(0.004), 1500, 6000), n))
    if name == 'tipo_sale':
        n = n_(0.2); return norm(band_sweep(5000, 1400, n) * bell(n, 0.3))
    if name == 'hoja_abre':
        n = n_(0.4); return norm(band_sweep(380, 1800, n) * bell(n, 0.35))
    if name in ('cristal_aparece', 'logo_aparece'):
        n = n_(1.0); return norm(shimmer(n, base=2300 + 180 * idx, tau=0.5))
    if name == 'cristal_cuerpo':
        n = n_(0.9); return norm(shimmer(n, base=1900, tau=0.6) * 0.7 + body(196, n, 0.4) * att(n, 0.08) * 0.5)
    if name == 'cristal_regresa':
        n = n_(0.6); return norm((shimmer(n, base=2100, tau=0.35) + 0.5 * band_sweep(1200, 4000, n) * bell(n, 0.5))[::-1])
    if name == 'lift':
        n = n_(0.7); return norm(band_sweep(500, 5000, n, 0.9) * (np.linspace(0, 1, n) ** 2))
    if name in ('asienta', 'pulso'):
        n = n_(0.22); return norm(np.sin(2 * np.pi * np.cumsum(62 + 30 * dec(n, 0.04)) / SR) * dec(n, 0.07))
    if name == 'estampa':       # tarjeta de cristal que se estampa
        n = n_(0.6); return norm(np.sin(2 * np.pi * np.cumsum(80 + 70 * dec(n, 0.025)) / SR) * dec(n, 0.09) + 0.5 * pad(click(n_(0.004), 1800, 8000), n) + 0.35 * shimmer(n, 2500 + 150 * idx, tau=0.28))
    if name == 'desliza':       # cristal que se desliza
        n = n_(0.42); return norm(band_sweep(1500, 600, n) * bell(n, 0.35) + 0.25 * shimmer(n, 3000, tau=0.3))
    if name == 'vuelo':
        n = n_(0.3); return norm(band_sweep(700, 3000, n) * bell(n, 0.5))
    if name in ('encaje', 'tap'):
        n = n_(0.07); return norm(pad(click(n_(0.002), 2500, 9000), n) + 0.5 * body(2200, n, 0.006) + 0.5 * body(320, n, 0.014))
    if name == 'pop':
        n = n_(0.16); return norm(sweep(900 + 60 * idx, 260, n) * dec(n, 0.04) + 0.3 * pad(click(n_(0.003), 2000, 8000), n))
    if name == 'chip':
        n = n_(0.07); x = np.zeros(n); a = body(1500 + 150 * idx, n_(0.012), 0.004); b = body(2300 + 150 * idx, n_(0.012), 0.004); x[:len(a)] += a; x[n_(0.02):n_(0.02) + len(b)] += b; return norm(x)
    if name == 'scroll':
        n = n_(0.4); sp = np.exp(-t_(n) / 0.12) * att(n, 0.03); return norm((band(noise(n), 250, 2200) * 0.7 + grains(n, 1500, 5000, rate=60) * 0.5) * sp)
    if name == 'giro':
        n = n_(0.28); return norm(band_sweep(600, 2600, n) * bell(n, 0.45))
    if name == 'campana':
        return norm(pluck([1568.0, 1760.0, 1975.5][idx % 3], 1.0))
    if name == 'boton_pop':
        n = n_(0.5); return norm(pad(sweep(720, 210, n_(0.09)) * dec(n_(0.09), 0.03), n) + 0.6 * body(120, n, 0.07) + 0.35 * shimmer(n, 2600, tau=0.3))
    if name == 'boton_regresa':
        n = n_(0.25); return norm(band_sweep(1600, 380, n) * bell(n, 0.25))
    if name in ('subraya', 'escritura'):
        n = n_(max(0.24, d)); tt = t_(n); return norm(grains(n, 3000, 9000, rate=140, glen=(0.004, 0.012)) * bell(n, 0.4, 1.0) * (1 + 0.5 * np.sin(2 * np.pi * 11 * tt)))
    raise KeyError(name)


GAIN = {'golpe_suave': -18, 'golpe_grave': -19, 'whoosh': -24, 'whoosh_baja': -26, 'pliegue': -22, 'crujido': -27, 'galleta': -22, 'tipo_entra': -32,
        'tipo_cae': -27, 'golpe_tipo': -22, 'tipo_sale': -33, 'hoja_abre': -26, 'cristal_aparece': -31, 'logo_aparece': -30, 'cristal_cuerpo': -27,
        'cristal_regresa': -28, 'lift': -27, 'asienta': -26, 'pulso': -22, 'estampa': -20, 'desliza': -27, 'vuelo': -28, 'encaje': -27, 'tap': -22,
        'pop': -26, 'chip': -28, 'scroll': -28, 'giro': -27, 'campana': -26, 'boton_pop': -20, 'boton_regresa': -26, 'subraya': -29, 'escritura': -31}
PREROLL = {'lift': 0.7, 'cristal_regresa': 0.3}

# (cuadro, nombre, duración en s si aplica, movimiento visible)
CUES = [
    (0, 'golpe_suave', 0, 'golpe del primer tiempo'), (0, 'whoosh', 0.3, 'la cinta cruza la pantalla'), (14, 'pliegue', 0, 'primer doblez'), (20, 'crujido', 0, 'hojaldre'),
    (W['L1'][0], 'tipo_entra', 0, 'CADA'), (46, 'pliegue', 0, 'segundo doblez'), (50, 'crujido', 0, 'hojaldre'), (W['L1'][1], 'tipo_cae', 0, 'PLIEGUE'),
    (76, 'pliegue', 0, 'tercer doblez'), (80, 'crujido', 0, 'hojaldre'), (W['L1'][2], 'golpe_tipo', 0, 'CUENTA'), (96, 'whoosh_baja', 0.35, 'la cola de la cinta se recoge'), (112, 'tipo_sale', 0, 'salen las palabras'),
    (120, 'hoja_abre', 0, 'el pliegue se abre'), (124, 'galleta', 0, 'la galleta partida'), (130, 'cristal_aparece', 0, 'panel de cristal'), (146, 'whoosh', 0.4, 'la cinta rodea el panel'),
    (150, 'desliza', 0, 'el panel se cierra a círculo'), (156, 'logo_aparece', 0, 'se revela la silueta'), (170, 'cristal_cuerpo', 0, 'el círculo se estira a teléfono'),
    (180, 'lift', 0, 'lift'), (194, 'asienta', 0, 'el teléfono se asienta'), (198, 'tipo_entra', 0, 'nombre en la página'),
    (188, 'vuelo', 0, 'tarjeta 1 llega'), (198, 'estampa', 0, 'HOJALDRES se estampa'), (201, 'tipo_entra', 0, 'rótulo HOJALDRES'),
    (230, 'vuelo', 0, 'tarjeta 2 llega'), (240, 'estampa', 0, 'BERLINESAS se estampa'), (243, 'tipo_cae', 0, 'rótulo BERLINESAS'),
    (290, 'vuelo', 0, 'tarjeta 3 llega'), (300, 'estampa', 0, 'PASTELES se estampa'), (303, 'tipo_entra', 0, 'rótulo PASTELES'),
    (322, 'tipo_sale', 0, 'salen los rótulos'), (328, 'giro', 0, 'tarjeta 1 entra a la pantalla'), (333, 'giro', 0, 'tarjeta 2 entra'), (338, 'giro', 0, 'tarjeta 3 entra'), (350, 'encaje', 0, 'la fila de categorías encaja'),
    (W['L3'][0], 'golpe_tipo', 0, 'OCHO'), (360, 'desliza', 0, 'panel de galleta 1'), (362, 'whoosh_baja', 0.4, 'el teléfono se aleja'), (W['L3'][1], 'tipo_cae', 0, 'SABORES'),
    (384, 'desliza', 0, 'panel de galleta 2'), (408, 'desliza', 0, 'panel de galleta 3'), (430, 'tipo_sale', 0, 'sale OCHO SABORES'), (444, 'golpe_tipo', 0, 'GALLETAS'),
    (W['L3'][4], 'tipo_entra', 0, 'RECIÉN'), (W['L3'][5], 'tipo_entra', 0, 'HORNEADAS'), (520, 'tipo_sale', 0, 'salen las palabras'), (524, 'whoosh', 0.3, 'salen los paneles'), (534, 'whoosh', 0.3, 'sale el último panel'),
    (542, 'pop', 0, 'foto del muro 1'), (550, 'pop', 0, 'foto del muro 2'), (558, 'pop', 0, 'foto del muro 3'), (566, 'pop', 0, 'foto del muro 4'),
    (546, 'chip', 0, 'chip HOJALDRES'), (558, 'chip', 0, 'chip BERLINESAS'), (570, 'chip', 0, 'chip PASTELES'), (582, 'chip', 0, 'chip GALLETAS'), (568, 'scroll', 0, 'sube la rejilla de productos'),
    (W['L4'][4], 'tipo_entra', 0, 'TU'), (W['L4'][5], 'tipo_entra', 0, 'PROPIA'), (W['L4'][6], 'golpe_tipo', 0, 'PÁGINA'), (700, 'whoosh_baja', 0.35, 'el muro regresa al teléfono'), (706, 'tipo_sale', 0, 'salen las palabras'),
    (708, 'scroll', 0, 'la página se desplaza al pastel'), (W['L5'][0], 'campana', 0, 'FLAN'), (W['L5'][1], 'tipo_cae', 0, 'PARISINO'), (800, 'tipo_sale', 0, 'sale el nombre'),
    (806, 'giro', 0, 'la foto gira'), (W['L5'][2], 'campana', 0, 'MILLE-FEUILLE'), (862, 'tipo_sale', 0, 'sale el nombre'), (867, 'giro', 0, 'la foto gira'),
    (W['L5'][3], 'campana', 0, 'TRIANON'), (W['L5'][3], 'golpe_tipo', 0, 'TRIANON aterriza'), (896, 'tipo_sale', 0, 'sale el nombre'),
    (900, 'boton_pop', 0, 'el botón de cristal se forma'), (918, 'pop', 0, 'icono de WhatsApp'), (W['L6'][0], 'tipo_entra', 0, 'PIDE'), (W['L6'][1], 'tipo_entra', 0, 'POR'), (W['L6'][2], 'tipo_entra', 0, 'WHATSAPP'),
    (940, 'whoosh', 0.3, 'la cinta deja el marco'), (956, 'subraya', 0.25, 'la cinta subraya el botón'), (960, 'pulso', 0, 'el subrayado pulsa'), (990, 'pulso', 0, 'el subrayado pulsa'), (1002, 'tap', 0, 'toque en el botón'),
    (1022, 'boton_regresa', 0, 'el botón se recoge'), (1026, 'whoosh', 0.5, 'la cinta vuelve a rodear'), (1032, 'cristal_regresa', 0, 'el teléfono se cierra a la silueta'), (W['L7'][0], 'escritura', 0.9, 'se escribe Maison Rose'),
    (1062, 'asienta', 0, 'el logo se asienta'), (W['L7'][2], 'tipo_entra', 0, 'SAN JERÓNIMO'),
    (1192, 'whoosh', 0.45, 'el último doblez barre el cuadro'), (1196, 'pliegue', 0, 'doblez final'), (1200, 'golpe_grave', 0, 'golpe grave'), (1208, 'tipo_entra', 0, 'línea 1 del end card'),
    (1228, 'tipo_entra', 0, 'línea 2'), (1238, 'tipo_entra', 0, 'línea 3'), (1246, 'tipo_entra', 0, 'línea 4'),
]


def main():
    mix = np.zeros((N, 2))
    count = {}
    lista = []
    for f, name, d, que in sorted(CUES, key=lambda c: (c[0], c[1])):
        idx = count.get(name, 0); count[name] = idx + 1
        x = sfx(name, d, idx) * 10 ** (GAIN[name] / 20) * 10 ** (rng.uniform(-1.0, 1.0) / 20)
        i0 = int((f / FPS - PREROLL.get(name, 0)) * SR)
        if i0 < 0:
            x, i0 = x[-i0:], 0
        n = min(len(x), N - i0)
        pan = np.clip(rng.normal(0, 0.12), -0.3, 0.3)
        mix[i0:i0 + n, 0] += x[:n] * np.sqrt(0.5 * (1 - pan))
        mix[i0:i0 + n, 1] += x[:n] * np.sqrt(0.5 * (1 + pan))
        lista.append({'f': f, 's': round(f / FPS, 2), 'name': name, 'movimiento': que})
    mix = high(mix.T, 60).T
    out = OUT / 'sfx_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(out)], input=mix.astype(np.float32).tobytes(), check=True)
    (OUT / 'sfx_cues.json').write_text(json.dumps(lista, ensure_ascii=False, indent=1))
    print(out, len(lista), 'cues', f'pico {20 * np.log10(np.abs(mix).max()):.1f} dBFS')


if __name__ == '__main__':
    main()
