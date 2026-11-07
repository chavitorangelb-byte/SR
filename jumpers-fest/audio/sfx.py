#!/usr/bin/env python3
"""SFX de Jumpers Fest, sintetizados en código (sin bibliotecas de sonidos).

Lee los cues de brief/timeline.json (sfx: cuadro y nombre) y genera cada sonido con ruido filtrado,
barridos de seno, golpes graves y cuerdas pulsadas: aire de inflado, rebote de vinil, tecleo, taps,
scroll con fricción, calendario y el pop del botón. Salida: audio/build/sfx_stem.wav (48 kHz, estéreo).
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
FPS = TL['fps']
N = int(TL['frames'] / FPS * SR)


# ---------------- primitivas ----------------
def ns(n, seed):
    return np.random.default_rng(seed).normal(0, 1, n)


def filt(x, kind, f):
    f = np.atleast_1d(f) / (SR / 2)
    b, a = signal.butter(2, f if len(f) > 1 else f[0], kind)
    return signal.lfilter(b, a, x)


def env(n, att, dec, curva=1.0):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(att, 1e-4)) * np.exp(-np.maximum(0, t - att) / max(dec, 1e-4)) ** curva


def aire(dur, lo, hi, att, dec, seed, barrido=0.0):
    """Ruido en banda (soplo de aire). `barrido` > 0 sube la banda, < 0 la baja, a lo largo del sonido."""
    n = int(dur * SR)
    x = ns(n, seed)
    if barrido:
        partes = 8
        y = np.zeros(n)
        for k in range(partes):
            a, b = k * n // partes, (k + 1) * n // partes
            u = (k + 0.5) / partes
            m = 2 ** (barrido * (u - 0.5))
            seg = filt(x, 'band', [max(40, lo * m), min(20000, hi * m)])[a:b]
            y[a:b] = seg
        x = y
    else:
        x = filt(x, 'band', [lo, hi])
    return x * env(n, att, dec) / 3


def barrido(f0, f1, dur, dec=None, fase=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR + fase)
    return y * (np.exp(-t / dec) if dec else np.ones(n))


def golpe(f0, f1, dur, dec):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / (dur * 0.25))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec) * np.minimum(1, t / 0.002)


def chillido(f0, f1, dur, vib=7.0, prof=0.012):
    """Estiramiento de vinil: seno con vibrato y envolvente suave."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur) * (1 + prof * np.sin(2 * np.pi * vib * t))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return y * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7


def clic(seed, lo=2500, hi=7000, dur=0.004):
    n = int(0.02 * SR)
    x = filt(ns(n, seed), 'band', [lo, hi])
    return x * env(n, 0.0003, dur) / 2


def tono(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def mezcla(*partes):
    n = max(len(p) for p, _ in partes)
    y = np.zeros(n)
    for p, g in partes:
        y[:len(p)] += p * g
    return y


# ---------------- sonidos ----------------
CONTADOR = {}


def sonido(nombre, seed):
    k = CONTADOR.get(nombre, 0)
    CONTADOR[nombre] = k + 1
    s = seed
    if nombre == 'golpe_inicio':
        return mezcla((golpe(95, 50, 0.4, 0.18), 1.0), (aire(0.2, 300, 1800, 0.002, 0.04, s), 0.6))
    if nombre == 'pff_aire':
        return aire(0.26, 1200, 7500, 0.008, 0.10, s, barrido=-1.2)
    if nombre == 'pff_corto':
        return aire(0.12, 2000, 9000, 0.004, 0.045, s, barrido=-0.8)
    if nombre == 'tubo_entra':
        return mezcla((aire(0.55, 300, 3200, 0.10, 0.25, s, barrido=1.0), 1.0), (chillido(620, 900, 0.45), 0.05))
    if nombre == 'cristal_infla':
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        g = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in [(2300, 0.22), (3450, 0.15), (5200, 0.09)])
        return mezcla((g * np.minimum(1, t / 0.01) * 0.3, 1.0), (aire(0.25, 1500, 8000, 0.02, 0.08, s), 0.6))
    if nombre == 'tecla':
        r = np.random.default_rng(s)
        return mezcla((clic(s, 1800, 5500, 0.0035), r.uniform(0.75, 1.0)), (golpe(160 + r.uniform(-20, 20), 120, 0.03, 0.012), 0.25))
    if nombre == 'enter':
        return mezcla((clic(s, 1500, 5000, 0.006), 1.2), (golpe(130, 90, 0.08, 0.03), 0.6))
    if nombre == 'desinfla':
        return mezcla((aire(0.5, 400, 2600, 0.02, 0.28, s, barrido=-1.5), 1.0), (chillido(480, 300, 0.35), 0.04))
    if nombre == 'tubo_infla':
        return mezcla((aire(0.55, 300, 2400, 0.22, 0.2, s, barrido=0.8), 1.0), (chillido(220, 420, 0.5), 0.07))
    if nombre == 'trazo_contorno':
        return aire(0.8, 1800, 5000, 0.15, 0.4, s, barrido=0.7) * 0.6
    if nombre == 'cristal_cuerpo':
        n = int(0.9 * SR)
        t = np.arange(n) / SR
        g = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.5) for f in (1180, 1770, 2650)) * np.minimum(1, t / 0.03)
        return mezcla((g * 0.12, 1.0), (aire(0.4, 500, 3000, 0.05, 0.2, s, barrido=0.5), 0.5))
    if nombre == 'rebote_vinil':
        n = int(0.35 * SR)
        t = np.arange(n) / SR
        return golpe(110, 68, 0.35, 0.10) * (1 + 0.25 * np.sin(2 * np.pi * 18 * t))
    if nombre == 'asienta':
        return golpe(135, 95, 0.16, 0.05) * 0.7
    if nombre == 'pantalla_enciende':
        return mezcla((barrido(700, 1500, 0.28, 0.12), 0.25), (aire(0.3, 2000, 9000, 0.05, 0.1, s), 0.4))
    if nombre == 'logo_pop':
        return mezcla((barrido(520, 1150, 0.06, 0.025), 1.0), (clic(s, 2000, 6000, 0.003), 0.8))
    if nombre == 'arcoiris_dibuja':
        y = np.zeros(int(0.4 * SR))
        for j, m in enumerate([84, 86, 88, 91, 93]):
            p = barrido(tono(m), tono(m), 0.25, 0.08)
            i = int(j * 0.028 * SR)
            y[i:i + len(p)] += p[:len(y) - i] * 0.35
        return y
    if nombre == 'foto_infla':
        return mezcla((aire(0.2, 800, 4000, 0.06, 0.08, s, barrido=0.6), 1.0), (barrido(400, 820, 0.07, 0.03), 0.6))
    if nombre in ('scroll_friccion', 'scroll_suave'):
        n = int(0.6 * SR)
        x = filt(ns(n, s), 'low', 1600 if nombre == 'scroll_friccion' else 1100)
        return x * env(n, 0.03, 0.22) * (0.35 if nombre == 'scroll_friccion' else 0.22)
    if nombre == 'tarjeta_infla':
        return mezcla((aire(0.22, 600, 3000, 0.07, 0.08, s, barrido=0.6), 1.0), (chillido(260, 420, 0.2), 0.05))
    if nombre == 'tipo_infla':
        notas = [84, 88, 91, 93, 96, 91, 88, 93, 96, 100, 96, 91]
        m = notas[k % len(notas)]
        return mezcla((aire(0.09, 1500, 6000, 0.01, 0.03, s), 0.8), (barrido(tono(m) * 0.85, tono(m), 0.12, 0.05), 0.35))
    if nombre == 'tarjeta_sale':
        return mezcla((aire(0.4, 400, 2600, 0.12, 0.12, s, barrido=1.6), 1.2), (aire(0.1, 2500, 9000, 0.004, 0.04, s + 1), 0.5))
    if nombre == 'aire_flota':
        n = int(1.0 * SR)
        x = filt(ns(n, s), 'low', 1200)
        t = np.arange(n) / SR
        return x * np.sin(np.pi * t / 1.0) ** 2 * 0.08
    if nombre in ('tarjeta_regresa', 'boton_regresa', 'postal_regresa', 'panel_regresa'):
        return mezcla((golpe(150, 105, 0.14, 0.05), 0.8), (clic(s, 1500, 4000, 0.004), 0.35))
    if nombre == 'tap':
        n = int(0.03 * SR)
        t = np.arange(n) / SR
        return mezcla((clic(s, 3000, 7500, 0.003), 1.0), (np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.006), 0.15))
    if nombre in ('hoja_sube', 'teclado_sube'):
        return aire(0.3 if nombre == 'hoja_sube' else 0.22, 500, 3000, 0.08, 0.1, s, barrido=1.2) * 0.8
    if nombre in ('hoja_baja', 'teclado_baja'):
        return aire(0.3 if nombre == 'hoja_baja' else 0.22, 500, 3000, 0.08, 0.1, s, barrido=-1.2) * 0.8
    if nombre == 'panel_sale':
        return mezcla((aire(0.4, 500, 3000, 0.1, 0.14, s, barrido=1.2), 1.0), (chillido(240, 380, 0.25), 0.04))
    if nombre == 'calendario_abre':
        n = int(0.32 * SR)
        t = np.arange(n) / SR
        trino = filt(ns(n, s), 'band', [2500, 6000]) * (0.5 + 0.5 * np.sin(2 * np.pi * 38 * t)) * env(n, 0.02, 0.1) / 3
        return mezcla((chillido(300, 620, 0.22), 0.06), (trino, 0.8), (aire(0.25, 600, 3000, 0.06, 0.1, s + 2, barrido=1.0), 0.6))
    if nombre == 'calendario_cierra':
        return mezcla((chillido(560, 300, 0.2), 0.05), (aire(0.22, 600, 3000, 0.04, 0.08, s, barrido=-1.0), 0.6))
    if nombre == 'fecha_infla':
        return mezcla((barrido(tono(86), tono(88), 0.15, 0.06), 0.4), (aire(0.1, 1500, 6000, 0.008, 0.04, s), 0.7))
    if nombre == 'boton_infla':
        return mezcla((aire(0.6, 300, 2400, 0.3, 0.2, s, barrido=1.0), 1.2), (chillido(200, 480, 0.5), 0.09), (aire(0.15, 3000, 8000, 0.1, 0.05, s + 3), 0.3))
    if nombre == 'boton_pop':
        return mezcla((golpe(165, 88, 0.22, 0.07), 1.0), (barrido(900, 1550, 0.035, 0.012), 0.6), (aire(0.15, 1000, 6000, 0.002, 0.05, s), 0.8))
    if nombre == 'lift':
        n = int(0.62 * SR)
        t = np.arange(n) / SR
        x = filt(ns(n, s), 'high', 3200) * (t / t[-1]) ** 2.5 * 0.35
        x[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
        return x
    if nombre == 'postal_sale':
        return mezcla((aire(0.5, 300, 2400, 0.15, 0.16, s, barrido=1.8), 1.3), (aire(0.12, 2500, 9000, 0.004, 0.05, s + 1), 0.6))
    if nombre == 'paso_infla':
        m = [84, 88, 91][k % 3]
        return mezcla((aire(0.16, 800, 4000, 0.05, 0.06, s, barrido=0.5), 0.8), (barrido(tono(m) * 0.9, tono(m), 0.14, 0.06), 0.3))
    if nombre == 'costura':
        n = int(0.65 * SR)
        t = np.arange(n) / SR
        return filt(ns(n, s), 'band', [2000, 6000]) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 45 * t))) * env(n, 0.05, 0.3) * 0.08
    if nombre == 'celular_se_aleja':
        return aire(0.95, 250, 3000, 0.08, 0.5, s, barrido=-2.0) * 1.1
    if nombre == 'tubo_arquea':
        return mezcla((chillido(250, 600, 0.9, vib=5), 0.06), (aire(0.9, 300, 2500, 0.3, 0.3, s, barrido=1.0), 0.8))
    if nombre == 'banda_infla':
        m = [84, 86, 88, 91, 93][k % 5]
        return mezcla((aire(0.25, 500, 3000, 0.07, 0.1, s, barrido=0.8), 1.0), (barrido(tono(m) * 0.92, tono(m), 0.2, 0.08), 0.3), (chillido(200 + 30 * k, 320 + 30 * k, 0.2), 0.04))
    if nombre == 'respiro':
        n = int(1.0 * SR)
        t = np.arange(n) / SR
        return filt(ns(n, s), 'low', 800) * np.sin(np.pi * t) ** 2 * 0.05
    if nombre == 'golpe_final':
        return mezcla((golpe(78, 46, 0.8, 0.28), 1.0), (golpe(196, 147, 0.4, 0.12), 0.25))
    if nombre == 'placa_infla':
        return mezcla((aire(0.65, 300, 2200, 0.25, 0.22, s, barrido=0.7), 1.0), (chillido(160, 260, 0.5), 0.06))
    if nombre == 'texto_aparece':
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        return sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.2) for f in (1800, 2700)) * np.minimum(1, t / 0.02) * 0.08
    raise SystemExit(f'SFX sin síntesis: {nombre}')


NIVEL = {  # ganancia por tipo (dB) dentro del stem de SFX
    'golpe_inicio': 0, 'golpe_final': 0, 'boton_pop': 0, 'rebote_vinil': -2, 'tecla': -9, 'tap': -6, 'enter': -4,
    'scroll_friccion': -8, 'scroll_suave': -10, 'aire_flota': -8, 'respiro': -10, 'costura': -10, 'trazo_contorno': -8,
}
ADELANTO = {'lift': 0.62}  # termina en el cue


def main():
    out = np.zeros((N + SR, 2))
    for i, c in enumerate(TL['sfx']):
        y = sonido(c['name'], 1000 + i)
        y = y / max(1e-9, np.abs(y).max()) * 10 ** (NIVEL.get(c['name'], -3) / 20)
        t0 = c['f'] / FPS - ADELANTO.get(c['name'], 0)
        a = int(round(t0 * SR))
        pan = 0.15 * np.sin(i * 1.7)  # un poco de abertura, sin perder el centro
        l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        j = min(len(out), a + len(y))
        out[a:j, 0] += y[:j - a] * l
        out[a:j, 1] += y[:j - a] * r
    out = out[:N]
    out /= max(1e-9, np.abs(out).max()) / 0.8
    dst = B / 'sfx_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(dst)],
                   input=out.astype(np.float32).tobytes(), check=True)
    print(f'{dst.relative_to(ROOT)} · {len(TL["sfx"])} cues · {len(CONTADOR)} sonidos distintos')


if __name__ == '__main__':
    main()
