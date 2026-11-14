#!/usr/bin/env python3
"""SFX sintetizados en código para DeliciArte: un cue por cada movimiento visible, amarrado a brief/timeline.json.

Salida: audio/build/sfx_stem.wav (48 kHz estéreo) y audio/build/sfx_cues.json (lista de cues colocados).
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
EV = TL['ev']
KIN = {k['id']: k for k in TL['kinetic']}
rng = np.random.default_rng(31)


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
    return np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f1, n)) / SR)


def band_sweep(f0, f1, n, q=0.6):
    x = noise(n)
    out = np.zeros(n)
    blk = n_(0.005)
    fs = np.geomspace(f0, f1, max(1, n // blk + 1))
    zi = None
    for i, fc in enumerate(fs):
        s = x[i * blk:(i + 1) * blk]
        if not len(s):
            break
        lo, hi = fc * (1 - q / 2), min(fc * (1 + q / 2), SR / 2 - 200)
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


def click(n=None, lo=2000, hi=7000):
    n = n or n_(0.003)
    return band(noise(n) * np.hanning(n), lo, hi)


def pad(x, n):
    return np.pad(x, (0, max(0, n - len(x))))[:n]


def body(freq, n, tau):
    return np.sin(2 * np.pi * freq * t_(n)) * dec(n, tau)


def pluck(freq, sec=0.7, damp=0.995):
    n = n_(sec)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = damp * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return low(out, 5000) * att(n, 0.002)


def norm(x):
    mx = np.abs(x).max()
    return x / mx if mx > 0 else x


# ---------------- biblioteca ----------------
def sfx(name, d_s, idx):
    if name == 'latigazo':      # la línea cruza la pantalla
        n = n_(0.42); return norm(band_sweep(500, 5200, n, 0.8) * bell(n, 0.35, 1.6) + 0.3 * grains(n, 2500, 8000, 120) * bell(n, 0.4))
    if name == 'corte':         # la línea se corta
        n = n_(0.18); return norm(pad(click(n_(0.002), 3000, 10000), n) + 0.7 * body(1800, n, 0.01) + 0.5 * band(noise(n), 900, 4000) * dec(n, 0.02))
    if name == 'chispa':
        n = n_(0.6); return norm(shimmer(n, base=3200, tau=0.22))
    if name == 'retroceso':     # cada mitad se encoge como un elástico
        n = n_(0.22); tt = t_(n); return norm(np.sin(2 * np.pi * (300 + 900 * dec(n, 0.05)) * tt) * dec(n, 0.06) * (1 + 0.4 * np.sin(2 * np.pi * 30 * tt)))
    if name == 'trazo':         # duya: betún que sale (textura húmeda y granulada)
        n = n_(max(0.4, d_s)); tt = t_(n)
        wet = band(noise(n), 300, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 5.5 * tt) ** 2)
        return norm((wet * 0.6 + grains(n, 1500, 6000, rate=90) * 0.5) * bell(n, 0.25, 1.0))
    if name == 'trazo_fino':    # script que se escribe
        n = n_(max(0.3, d_s)); return norm(grains(n, 3000, 9500, rate=150, glen=(0.003, 0.01)) * bell(n, 0.3, 1.0))
    if name == 'glifo':
        n = n_(0.05); p = 1 + 0.06 * (idx % 5)
        return norm(pad(click(n_(0.002), 2500 * p, 9000), n) + 0.5 * body(900 * p, n, 0.01))
    if name == 'tipo_entra':
        n = n_(0.32); return norm(band_sweep(1200, 6000, n, 0.7) * bell(n, 0.65, 1.6))
    if name == 'tipo_sale':
        n = n_(0.26); return norm(band_sweep(5000, 1400, n, 0.7) * bell(n, 0.3, 1.6))
    if name == 'morph':         # morph líquido del betún
        n = n_(max(0.35, d_s)); tt = t_(n)
        gl = np.sin(2 * np.pi * np.cumsum(180 + 120 * np.sin(2 * np.pi * 2.2 * tt)) / SR) * 0.35
        return norm((band_sweep(250, 1300, n, 1.0) * 0.8 + gl) * bell(n, 0.5, 1.3))
    if name == 'anillo':
        n = n_(1.1); return norm(shimmer(n, base=1760 + 120 * idx, k=5, tau=0.5) + 0.3 * body(880, n, 0.3))
    if name == 'revela':
        n = n_(0.9); return norm(shimmer(n, base=2400, tau=0.45) * 0.8 + band_sweep(800, 3000, n) * bell(n, 0.3) * 0.5)
    if name == 'brote':         # rosetas que brotan
        notas = [1396.9, 1568.0, 1760.0, 2093.0, 2349.3]
        n = n_(0.5); return norm(pad(pluck(notas[idx % 5] / 2, 0.5), n) + 0.4 * pad(sweep(400, 1200, n_(0.06)) * dec(n_(0.06), 0.02), n))
    if name == 'liquido':
        n = n_(0.7); return norm(band_sweep(200, 1800, n, 0.9) * bell(n, 0.6, 1.4) + 0.3 * body(110, n, 0.25) * att(n, 0.1))
    if name == 'cristal':       # el cristal se forma
        n = n_(0.9); return norm(shimmer(n, base=1900, tau=0.55) * 0.7 + band_sweep(600, 4000, n) * bell(n, 0.5) * 0.4 + 0.4 * body(196, n, 0.35) * att(n, 0.08))
    if name == 'swoosh':
        n = n_(0.34); return norm(band_sweep(700, 2800, n) * bell(n, 0.45))
    if name == 'orbita':
        n = n_(0.8); return norm(band_sweep(350, 1100, n, 0.9) * bell(n, 0.55, 1.5))
    if name == 'sale':          # tarjeta que sale del celular
        n = n_(0.32); return norm(band_sweep(900, 3600, n) * bell(n, 0.75, 1.6))
    if name == 'estampa':       # golpe de la tarjeta al aterrizar
        n = n_(0.35); return norm(np.sin(2 * np.pi * np.cumsum(70 + 60 * dec(n, 0.03)) / SR) * dec(n, 0.07) + 0.45 * pad(click(n_(0.003), 1800, 7000), n) + 0.25 * shimmer(n, 2600, tau=0.12))
    if name == 'liston':        # el listón rodea la tarjeta
        n = n_(0.4); tt = t_(n); return norm(grains(n, 3000, 9000, rate=140, glen=(0.004, 0.012)) * bell(n, 0.4, 1.0) * (1 + 0.5 * np.sin(2 * np.pi * 11 * tt)))
    if name == 'paso':          # la tarjeta pasa junto a la cámara
        n = n_(0.5); x = band_sweep(1600, 300, n, 0.8) * bell(n, 0.45, 1.4) + 0.3 * low(noise(n), 500) * bell(n, 0.5)
        return norm(x)
    if name == 'hunde':
        n = n_(0.6); return norm(band_sweep(800, 160, n, 0.9) * bell(n, 0.3) + 0.3 * body(70, n, 0.3))
    if name == 'llega':         # panel de cristal que llega desde el fondo
        n = n_(0.7); return norm(band_sweep(300, 1500, n) * bell(n, 0.7, 1.3) * 0.7 + 0.5 * pad(shimmer(n_(0.4), 2200, tau=0.25), n)[::-1][::-1])
    if name == 'aire':
        n = n_(0.9); return norm(band(noise(n), 200, 900) * bell(n, 0.5, 1.2))
    if name == 'sube':
        n = n_(0.55); return norm(band_sweep(250, 1400, n, 0.9) * bell(n, 0.7, 1.3) + 0.3 * body(90, n, 0.2) * att(n, 0.2))
    if name == 'encaja':        # mosaico que se acomoda en la página
        n = n_(0.08); x = np.zeros(n); a = body(1500 + 120 * idx, n_(0.012), 0.004); b = body(2300 + 120 * idx, n_(0.012), 0.004)
        x[:len(a)] += a; x[n_(0.022):n_(0.022) + len(b)] += b; return norm(x + 0.3 * body(160, n, 0.015))
    if name == 'pop':           # chip de cristal que sale
        n = n_(0.22); return norm(pad(sweep(500 + 80 * idx, 1300 + 80 * idx, n_(0.05)) * dec(n_(0.05), 0.02), n) + 0.3 * shimmer(n, 2800, tau=0.1))
    if name == 'onda':          # la línea pasa entre los chips
        n = n_(max(0.5, d_s)); tt = t_(n); return norm(grains(n, 2500, 8000, rate=120) * bell(n, 0.4, 1.0) * (1 + 0.6 * np.sin(2 * np.pi * 4.2 * tt)))
    if name == 'activo':
        n = n_(0.6); tt = t_(n); return norm((np.sin(2 * np.pi * 1318.5 * tt) + 0.5 * np.sin(2 * np.pi * 1975.5 * tt)) * dec(n, 0.18) * att(n, 0.003))
    if name == 'boton':
        n = n_(0.7); return norm(pad(sweep(600, 220, n_(0.1)) * dec(n_(0.1), 0.04), n) * 0.6 + 0.6 * body(110, n, 0.12) + 0.4 * shimmer(n, 2400, tau=0.3) + 0.4 * band_sweep(400, 2500, n) * bell(n, 0.3))
    if name == 'pulso':
        n = n_(0.4); tt = t_(n); return norm(np.sin(2 * np.pi * 880 * tt) * dec(n, 0.09) * 0.5 + 0.5 * shimmer(n, 3000, k=3, tau=0.1))
    if name == 'toque':
        n = n_(0.12); return norm(pad(click(n_(0.002), 2500, 9000), n) + 0.5 * body(2200, n, 0.006) + 0.6 * body(260, n, 0.02))
    if name == 'regresa':
        n = n_(0.4); return norm(band_sweep(2800, 600, n) * bell(n, 0.35))
    if name == 'iris':          # la pantalla se cierra hacia el centro
        n = n_(0.6); return norm(band_sweep(2400, 300, n, 0.8) * bell(n, 0.6, 1.4) + 0.3 * body(140, n, 0.2) * att(n, 0.3))
    if name == 'linea':         # línea de la end card
        n = n_(0.18); return norm(band_sweep(1500, 4000, n) * bell(n, 0.5) * 0.6 + 0.4 * pad(click(n_(0.002), 3000, 9000), n))
    raise KeyError(name)


GAIN = {  # dB de pico de cada cue
    'latigazo': -18, 'corte': -20, 'chispa': -27, 'retroceso': -28, 'trazo': -30, 'trazo_fino': -33, 'glifo': -31, 'tipo_entra': -30,
    'tipo_sale': -32, 'morph': -27, 'anillo': -27, 'revela': -28, 'brote': -26, 'liquido': -27, 'cristal': -25, 'swoosh': -28,
    'orbita': -31, 'sale': -28, 'estampa': -19, 'liston': -29, 'paso': -23, 'hunde': -26, 'llega': -27, 'aire': -34, 'sube': -27,
    'encaja': -27, 'pop': -24, 'onda': -30, 'activo': -26, 'boton': -20, 'pulso': -28, 'toque': -21, 'regresa': -28, 'iris': -26,
    'linea': -31,
}
PREROLL = {'tipo_entra': 0.24, 'sale': 0.22, 'llega': 0.4, 'sube': 0.3, 'paso': 0.2}


def cues():
    """Lista de cues (cuadro, nombre, duración en s) a partir de los eventos y del kinetic."""
    c = []
    add = lambda f, name, d=0.0: c.append({'f': int(round(f)), 'name': name, 'd': d})
    kf = lambda k: KIN[k]['f']
    # golpe
    add(EV['golpe'], 'latigazo'); add(EV['corte'], 'corte'); add(EV['corte'], 'chispa'); add(EV['corte'] + 2, 'retroceso'); add(EV['corte'] + 4, 'retroceso')
    # DA
    add(EV['daD'][0], 'trazo', (EV['daD'][1] - EV['daD'][0]) / FPS); add(EV['daA'][0], 'trazo', (EV['daA'][1] - EV['daA'][0]) / FPS)
    for i in range(5):
        add(kf('sabor') - 6 + i * 1.6 + 7, 'glifo')
    add(kf('inigualable') - 12, 'trazo_fino', 28 / FPS)
    add(KIN['sabor']['sale'], 'tipo_sale'); add(KIN['inigualable']['sale'], 'tipo_sale')
    # logo, rosetas, celular
    add(EV['aCirculo'][0], 'morph', (EV['aCirculo'][1] - EV['aCirculo'][0]) / FPS); add(EV['aCirculo'][1], 'anillo')
    add(EV['logoAbre'][0], 'revela')
    for i in range(5):
        add(EV['aRosetas'][0] + 4 + i * 4, 'brote')
    add(EV['revela02'][0], 'liquido'); add(EV['celularForma'][0], 'cristal'); add(EV['iso'][0], 'swoosh'); add(EV['iso'][0] + 4, 'orbita')
    # tarjetas
    for f in EV['tarjeta']:
        add(f - 18, 'sale'); add(f, 'estampa'); add(f + 2, 'liston')
    add(kf('gusto') - 14, 'tipo_entra'); add(kf('gusto'), 'glifo'); add(KIN['gusto']['sale'], 'tipo_sale')
    # parallax
    add(EV['aParallax'][0], 'hunde')
    for i in range(3):
        add(EV['aParallax'][0] + 10 + i * 6, 'paso')
    add(EV['aParallax'][0] + 4 + 30, 'llega'); add(EV['aParallax'][0] + 14 + 30, 'llega')
    add(EV['liston06'][0], 'liston'); add(EV['liston02'][0], 'liston'); add(372, 'aire'); add(430, 'aire')
    add(kf('disenos') - 14, 'tipo_entra'); add(kf('disenos'), 'glifo'); add(KIN['disenos']['sale'], 'tipo_sale')
    add(kf('celebracion') - 12, 'trazo_fino', 28 / FPS); add(KIN['celebracion']['sale'], 'tipo_sale')
    # página
    a = EV['aPagina'][0]
    add(a, 'sube'); add(a + 32, 'encaja')
    for i, f in enumerate([a + 6 + 30, a + 18 + 30, a + 24 + 30, a + 30 + 30]):
        c.append({'f': f, 'name': 'encaja', 'd': 0, 'idx': i + 1})
    for i in range(5):
        add(a + 4 + i * 6, 'swoosh') if i in (0, 2) else None
    add(kf('propia') - 6 + 7, 'glifo'); add(kf('propia') - 2, 'tipo_entra')
    for i in range(6):
        add(kf('paginaK') - 10 + i * 1.8 + 6, 'glifo')
    add(KIN['propia']['sale'], 'tipo_sale')
    # postres
    for i, f in enumerate(EV['chips']):
        c.append({'f': f, 'name': 'pop', 'd': 0, 'idx': i})
    add(EV['lineaChips'][0], 'onda', (EV['lineaChips'][1] - EV['lineaChips'][0]) / FPS); add(EV['chipPostres'], 'activo')
    add(EV['muro'][0], 'llega'); add(EV['muro'][0] + 8, 'llega')
    for i in range(10):
        add(kf('antojo') - 10 + i * 1.8 + 6, 'glifo')
    add(KIN['antojo']['sale'], 'tipo_sale')
    # WhatsApp
    add(EV['boton'][0], 'regresa'); add(EV['boton'][0] + 30, 'encaja'); add(EV['boton'][0] + 2, 'boton')
    add(EV['subrayado'][0], 'morph', (EV['subrayado'][1] - EV['subrayado'][0]) / FPS)
    for f in EV['pulsos']:
        add(f, 'pulso')
    add(EV['toque'], 'toque')
    # cierre
    add(EV['aCierre'][0], 'regresa'); add(EV['aCierre'][0], 'morph', 26 / FPS); add(EV['aCierre'][0] + 26, 'morph', 20 / FPS)
    add(EV['aCierre'][0] + 24, 'iris'); add(EV['logoCierre'][0], 'revela'); add(EV['logoCierre'][0] + 12, 'anillo')
    add(kf('marca') - 14, 'tipo_entra'); add(kf('pasteleria') - 14, 'tipo_entra')
    # end card
    for f in sorted(set(EV['endTextos'])):
        add(f, 'linea')
    add(EV['endSubrayado'][0], 'morph', (EV['endSubrayado'][1] - EV['endSubrayado'][0]) / FPS)
    c.sort(key=lambda x: (x['f'], x['name']))
    count = {}
    for x in c:
        x.setdefault('idx', count.get(x['name'], 0))
        count[x['name']] = count.get(x['name'], 0) + 1
    return c


def main():
    mix = np.zeros((N, 2))
    lista = cues()
    for c in lista:
        x = sfx(c['name'], c['d'], c['idx']) * 10 ** (GAIN[c['name']] / 20)
        x *= 10 ** (rng.uniform(-1.0, 1.0) / 20)
        i0 = int((c['f'] / FPS - PREROLL.get(c['name'], 0)) * SR)
        if i0 < 0:
            x, i0 = x[-i0:], 0
        n = min(len(x), N - i0)
        if n <= 0:
            continue
        pan = np.clip(rng.normal(0, 0.14), -0.35, 0.35)
        mix[i0:i0 + n, 0] += x[:n] * np.sqrt(0.5 * (1 - pan))
        mix[i0:i0 + n, 1] += x[:n] * np.sqrt(0.5 * (1 + pan))
    mix = high(mix.T, 50).T
    out = OUT / 'sfx_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(out)],
                   input=mix.astype(np.float32).tobytes(), check=True)
    (OUT / 'sfx_cues.json').write_text(json.dumps(lista, ensure_ascii=False, indent=1))
    print(out, len(lista), 'cues', f'pico {20 * np.log10(np.abs(mix).max()):.1f} dBFS')


if __name__ == '__main__':
    main()
