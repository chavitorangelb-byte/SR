#!/usr/bin/env python3
"""SFX sintetizados en código: un cue por cada movimiento visible, en su cuadro de brief/timeline.json.

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
DUR = TL['total_f'] / FPS
N = int(DUR * SR)
rng = np.random.default_rng(11)


def _unused_typing_frames(f, d, text):
    """Igual que brief/tiempos.mjs."""
    n = len(text)
    out = []
    for i in range(n):
        base = f if n == 1 else f + round((i * d) / (n - 1))
        jitter = [0, 1, -1, 0, 1, 0, -1, 1][i % 8]
        val = min(f + d, base + (jitter if 0 < i < n - 1 else 0))
        out.append(max(out[-1] + 1 if out else f, val))
    return out


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


# ---------------- biblioteca: nombre → (función(dur_s, idx), ganancia dB, preroll s) ----------------
def sfx(name, d_s, idx):
    if name == 'golpe_suave':
        n = n_(0.35); return norm(np.sin(2 * np.pi * np.cumsum(40 + 30 * dec(n, 0.05)) / SR) * dec(n, 0.12) + 0.2 * low(noise(n), 900) * dec(n, 0.03))
    if name in ('tallo_crece', 'escritura_tallo', 'trazo_contorno'):
        n = n_(max(0.3, d_s)); return norm(grains(n, 1800, 7500, rate=110) * bell(n, 0.35, 1.2))
    if name in ('cristal_aparece', 'logo_aparece', 'texto_aparece'):
        n = n_(1.0); return norm(shimmer(n, base=2300 + 200 * idx, tau=0.55))
    if name == 'cristal_cuerpo':
        n = n_(0.9); return norm(shimmer(n, base=1900, tau=0.6) * 0.7 + body(196, n, 0.4) * att(n, 0.08) * 0.5)
    if name == 'tecla':
        n = n_(0.06); pitch = rng.uniform(0.9, 1.12)
        c = np.zeros(n); k = click(n_(0.003), 2500 * pitch, 7500); c[:len(k)] = k
        return norm(c + 0.6 * body(170 * pitch, n, 0.012) + 0.25 * low(noise(n), 1500) * dec(n, 0.01))
    if name == 'tecla_tactil':
        n = n_(0.04); return norm(np.concatenate([click(n_(0.002), 3000, 9000), np.zeros(n - n_(0.002))]) + 0.4 * body(950, n, 0.008))
    if name == 'enter':
        n = n_(0.4); return norm(np.concatenate([click(n_(0.004), 1500, 6000), np.zeros(n - n_(0.004))]) + 0.8 * body(120, n, 0.03) + 0.35 * band_sweep(500, 1800, n) * bell(n, 0.2))
    if name in ('whoosh_corto', 'logo_giro'):
        n = n_(0.32); return norm(band_sweep(600, 2600, n) * bell(n, 0.45))
    if name == 'celular_se_aleja':
        n = n_(0.7); return norm(band_sweep(900, 220, n, 0.8) * bell(n, 0.3) + 0.3 * body(80, n, 0.3))
    if name == 'pantalla_enciende':
        n = n_(0.7); tt = t_(n); return norm((np.sin(2 * np.pi * 660 * tt) + 0.6 * np.sin(2 * np.pi * 990 * tt)) * att(n, 0.06) * dec(n, 0.25))
    if name in ('logo_pop',):
        n = n_(0.16); return norm(sweep(900, 260, n) * dec(n, 0.04) + 0.3 * np.concatenate([click(n_(0.003), 2000, 8000), np.zeros(n - n_(0.003))]))
    if name == 'boton_pop':
        n = n_(0.5); return norm(np.pad(sweep(720, 210, n_(0.09)) * dec(n_(0.09), 0.03), (0, n - n_(0.09))) + 0.6 * body(120, n, 0.07) + 0.35 * shimmer(n, 2600, tau=0.3))
    if name in ('asienta', 'boton_regresa'):
        n = n_(0.2); return norm(np.sin(2 * np.pi * np.cumsum(60 + 30 * dec(n, 0.04)) / SR) * dec(n, 0.06))
    if name in ('scroll_friccion', 'scroll_corto'):
        n = n_(max(0.25, d_s)); sp = np.exp(-t_(n) / (0.28 * max(0.4, d_s))) * att(n, 0.03)
        return norm((band(noise(n), 250, 2200) * 0.7 + grains(n, 1500, 5000, rate=60) * 0.5) * sp)
    if name == 'tipo_entra':
        n = n_(0.3); return norm(band(noise(n), 3000, 9500) * bell(n, 0.55, 1.5))
    if name == 'tarjeta_sale':
        n = n_(0.3); return norm(np.pad(band(noise(n_(0.04)), 2000, 6000) * np.hanning(n_(0.04)), (0, n - n_(0.04))) + band_sweep(800, 3200, n) * bell(n, 0.4) * 0.8)
    if name == 'tarjeta_regresa':
        n = n_(0.12); return norm(low(noise(n), 2500) * dec(n, 0.012) + 0.7 * body(140, n, 0.03))
    if name == 'aire_flota':
        n = n_(0.8); return norm(band(noise(n), 200, 900) * bell(n, 0.5, 1.2))
    if name == 'aire_push':
        n = n_(0.8); return norm(band_sweep(300, 900, n, 0.9) * bell(n, 0.6, 1.5))
    if name in ('subraya', 'rodea'):
        n = n_(0.22 if name == 'subraya' else 0.36); tt = t_(n)
        return norm(grains(n, 3000, 9000, rate=140, glen=(0.004, 0.012)) * bell(n, 0.4, 1.0) * (1 + 0.5 * np.sin(2 * np.pi * (9 if name == 'rodea' else 14) * tt)))
    if name == 'tap':
        n = n_(0.06); return norm(np.concatenate([click(n_(0.002), 2500, 9000), np.zeros(n - n_(0.002))]) + 0.5 * body(2200, n, 0.006) + 0.5 * body(320, n, 0.012))
    if name == 'filtro':
        n = n_(0.06); x = np.zeros(n); a = body(1600, n_(0.012), 0.004); b = body(2400, n_(0.012), 0.004); x[:len(a)] += a; x[n_(0.02):n_(0.02) + len(b)] += b; return norm(x)
    if name == 'resorte':
        n = n_(0.28); tt = t_(n); return norm(np.sin(2 * np.pi * (420 + 25 * np.sin(2 * np.pi * 18 * tt)) * tt) * dec(n, 0.07))
    if name in ('hoja_abre', 'teclado_sube'):
        n = n_(0.36 if name == 'hoja_abre' else 0.26); return norm(band_sweep(380, 1600, n) * bell(n, 0.35))
    if name in ('hoja_cierra', 'teclado_baja'):
        n = n_(0.36 if name == 'hoja_cierra' else 0.24); return norm(band_sweep(1600, 380, n) * bell(n, 0.25))
    if name == 'paso_desliza':
        n = n_(0.26); return norm(band_sweep(1300, 600, n) * bell(n, 0.4))
    if name == 'swipe':
        n = n_(0.24); return norm(band_sweep(900, 2100, n) * bell(n, 0.4))
    if name in ('detente', 'fecha_elige'):
        n = n_(0.03); return norm(body(1200 if name == 'detente' else 2600, n, 0.004) + 0.4 * np.concatenate([click(n_(0.002), 3000, 9000), np.zeros(n - n_(0.002))]))
    if name == 'toggle':
        n = n_(0.07); x = np.zeros(n); a = body(1800, n_(0.01), 0.003); b = body(1100, n_(0.012), 0.004); x[:len(a)] += a; x[n_(0.03):n_(0.03) + len(b)] += b; return norm(x)
    if name == 'calendario_abre':
        n = n_(0.25); return norm(sweep(320, 180, n) * dec(n, 0.05) + 0.5 * band(noise(n), 800, 3000) * bell(n, 0.3))
    if name == 'calendario_cierra':
        n = n_(0.25); return norm(band(noise(n), 800, 3000) * bell(n, 0.6) * 0.6 + np.pad(sweep(220, 300, n_(0.06)) * dec(n_(0.06), 0.02), (n - n_(0.06), 0)))
    if name in ('cristal_sale', 'cristal_regresa'):
        n = n_(0.6); x = shimmer(n, base=2000 + 300 * idx, tau=0.35) + 0.5 * band_sweep(1200, 4000, n) * bell(n, 0.5)
        return norm(x[::-1] if name == 'cristal_regresa' else x)
    if name == 'lift':
        n = n_(0.7); return norm(band_sweep(500, 5000, n, 0.9) * (np.linspace(0, 1, n) ** 2))
    if name == 'petalo':
        notas = [1046.5, 880.0, 698.5, 784.0, 1174.7]
        return norm(pluck(notas[idx % 5], 0.9))
    if name == 'golpe_grave':
        n = n_(0.6); return norm(low(noise(n), 300) * dec(n, 0.08) + 0.5 * body(70, n, 0.2))
    raise KeyError(name)


GAIN = {  # dB de pico de cada cue
    'golpe_suave': -20, 'tallo_crece': -36, 'escritura_tallo': -34, 'trazo_contorno': -33, 'cristal_aparece': -31, 'logo_aparece': -31,
    'texto_aparece': -34, 'cristal_cuerpo': -27, 'tecla': -25, 'tecla_tactil': -29, 'enter': -22, 'whoosh_corto': -27, 'logo_giro': -26,
    'celular_se_aleja': -25, 'pantalla_enciende': -30, 'logo_pop': -24, 'boton_pop': -19, 'asienta': -26, 'boton_regresa': -25,
    'scroll_friccion': -28, 'scroll_corto': -30, 'tipo_entra': -31, 'tarjeta_sale': -25, 'tarjeta_regresa': -27, 'aire_flota': -34,
    'aire_push': -31, 'subraya': -30, 'rodea': -29, 'tap': -23, 'filtro': -28, 'resorte': -34, 'hoja_abre': -26, 'teclado_sube': -29,
    'hoja_cierra': -26, 'teclado_baja': -29, 'paso_desliza': -28, 'swipe': -27, 'detente': -28, 'fecha_elige': -28, 'toggle': -27,
    'calendario_abre': -27, 'calendario_cierra': -29, 'cristal_sale': -26, 'cristal_regresa': -28, 'lift': -27, 'petalo': -27,
    'golpe_grave': -22,
}
PREROLL = {'lift': 0.7, 'cristal_regresa': 0.35}


# ---------------- sonidos propios de Mandala ----------------
_base_sfx = sfx


def sfx(name, d_s, idx):  # noqa: F811
    if name == 'chispa':
        n = n_(0.35); x = np.zeros(n)
        for _ in range(int(rng.integers(3, 7))):
            k = int(rng.integers(0, n - n_(0.02))); g = click(n_(rng.uniform(0.002, 0.006)), 2500, 11000) * rng.uniform(0.3, 1)
            x[k:k + len(g)] += g
        return norm(x + 0.25 * band(noise(n), 300, 1400) * bell(n, 0.3))
    if name == 'burbuja':
        n = n_(0.14); return norm(sweep(320, 980, n) * bell(n, 0.25, 1.5) + 0.2 * np.concatenate([click(n_(0.003), 2500, 8000), np.zeros(n - n_(0.003))]))
    if name == 'fogata':
        n = n_(1.4); return norm(band(noise(n), 120, 900) * bell(n, 0.25, 1.3) + 0.5 * grains(n, 1500, 6000, rate=25) * bell(n, 0.4))
    return _base_sfx(name, d_s, idx)


GAIN.update({'chispa': -30, 'burbuja': -23, 'fogata': -30})


def cues():
    K = {k['texto']: k['f'] for k in TL['kinetic']}
    out = []
    def c(f, name, d=0, nota=''):
        out.append({'f': int(round(f)), 'name': name, 'd': d, 'nota': nota})
    # cinta: latigazos, trazos y cambios de forma
    c(0, 'swipe', nota='la cinta cruza'); c(8, 'whoosh_corto', nota='retorno de carro'); c(106, 'swipe', nota='salta al celular')
    c(116, 'trazo_contorno', 0.4, 'dibuja el marco'); c(140, 'whoosh_corto', nota='marco a trazo'); c(194, 'subraya', nota='subraya TU PÁGINA')
    c(284, 'rodea', nota='trazo a aro'); c(298, 'resorte', nota='se abre en pétalos'); c(700, 'swipe', nota='sale de la fogata')
    c(738, 'logo_pop', nota='se vuelve el botón'); c(998, 'swipe', nota='sale del botón'); c(1008, 'trazo_contorno', 1.0, 'traza el mapa')
    c(1150, 'whoosh_corto', nota='deja el mapa'); c(1176, 'subraya', nota='subraya EN CELULAR'); c(1296, 'rodea', nota='se enrosca en aro')
    for i in range(5): c(340 + i * 4, 'petalo', nota='pétalo a punto de color')
    # toques en pantalla
    c(102, 'enter', nota='Enter')
    for f in (360, 378, 432, 448): c(f, 'tap', nota='toque en un color'); c(f + 2, 'filtro', nota='filtra el menú')
    c(768, 'tap', nota='toque en WhatsApp'); c(834, 'tap', nota='enviar'); c(1074, 'detente', nota='cae el pin')
    # scroll
    for f, d in ((256, 0.6), (358, 0.3), (504, 0.45), (578, 0.5), (858, 0.45), (990, 0.4), (1150, 0.8)): c(f, 'scroll_friccion', d, 'scroll')
    # clics de glifos: búsqueda y mensaje del chat
    for i in range(38): c(12 + i * (84 / 38), 'tecla', nota='tecla de la búsqueda')
    for i in range(0, 28, 3): c(796 + i * 1.1, 'tecla_tactil', nota='tecla del mensaje')
    # impactos de palabras
    for t, f in K.items():
        partes = t.split('|')
        c(f, 'golpe_suave', nota='palabra ' + partes[0])
    for f, t in ((395, 'CLÁSICO'), (475, 'ATREVIDO'), (646, 'ASADAS'), (777, 'WHATSAPP'), (1050, 'A DOMINGO'), (1387, 'BURGER')): c(f, 'asienta', nota='palabra ' + t)
    # tarjetas y cristal
    c(6, 'cristal_aparece', nota='barra de cristal')
    for f in (361, 379, 382, 433, 436, 449, 452, 455): c(f, 'tarjeta_regresa', nota='tarjeta de burger')
    for f in (870, 906, 942): c(f, 'cristal_aparece', nota='reseña')
    c(1080, 'cristal_cuerpo', nota='tarjeta de horario'); c(1104, 'logo_pop', nota='chip'); c(1116, 'logo_pop', nota='chip')
    # celular e interfaz
    c(144, 'aire_push', nota='el celular gira'); c(150, 'pantalla_enciende'); c(172, 'tarjeta_regresa', nota='encabezado'); c(198, 'tarjeta_regresa', nota='ilustración')
    c(212, 'boton_pop', nota='botón de WhatsApp'); c(250, 'logo_pop', nota='botón flotante'); c(518, 'filtro', nota='Point Dog'); c(574, 'filtro', nota='Frenchies')
    # destellos
    c(8, 'texto_aparece', nota='destello inicial'); c(224, 'texto_aparece', nota='destello del botón'); c(1326, 'logo_aparece', nota='aro con volumen'); c(1500, 'texto_aparece', nota='brillo del botón final')
    # fogata, bombones y chispas
    c(606, 'fogata', nota='fogata'); c(612, 'chispa'); c(640, 'chispa'); c(668, 'chispa'); c(705, 'chispa'); c(690, 'resorte', nota='bombón dorado')
    # chat
    c(774, 'hoja_abre', nota='hoja de chat'); c(790, 'burbuja', nota='burbuja'); c(850, 'hoja_cierra')
    # paneos y risers
    c(1152, 'celular_se_aleja', nota='el celular se desliza'); c(1166, 'swipe', nota='entra el navegador'); c(1236, 'asienta', nota='navegador en su sitio')
    c(288, 'lift', nota='riser a los pétalos'); c(1152, 'lift', nota='riser del lift'); c(1312, 'logo_aparece', nota='logo por máscara')
    # end card
    c(1440, 'cristal_cuerpo', nota='panel final'); c(1460, 'texto_aparece'); c(1478, 'boton_pop', nota='botón final'); c(1500, 'asienta')
    out.sort(key=lambda x: (x['f'], x['name']))
    count = {}
    for x in out:
        x['idx'] = count.get(x['name'], 0); count[x['name']] = x['idx'] + 1
    return out


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
        pan = np.clip(rng.normal(0, 0.12), -0.3, 0.3)
        mix[i0:i0 + n, 0] += x[:n] * np.sqrt(0.5 * (1 - pan))
        mix[i0:i0 + n, 1] += x[:n] * np.sqrt(0.5 * (1 + pan))
    mix = high(mix.T, 60).T
    out = OUT / 'sfx_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(out)],
                   input=mix.astype(np.float32).tobytes(), check=True)
    (OUT / 'sfx_cues.json').write_text(json.dumps(lista, ensure_ascii=False, indent=1))
    hoja = ['# Hoja de cues de SFX · Mandala Burgers', '', f'{len(lista)} cues sintetizados en código, cada uno atado a un cuadro (60 fps).', '', '| Cuadro | Tiempo (s) | Sonido | Movimiento |', '|---|---|---|---|']
    hoja += [f"| f{c['f']} | {c['f'] / FPS:.2f} | {c['name']} | {c['nota']} |" for c in lista]
    (ROOT / 'audio' / 'hoja_cues.md').write_text('\n'.join(hoja) + '\n')
    print(out, len(lista), 'cues', f'pico {20 * np.log10(np.abs(mix).max()):.1f} dBFS')


if __name__ == '__main__':
    main()
