#!/usr/bin/env python3
"""Efectos de sonido del video de Ana Gaby Repostería, sintetizados aquí (nada de librerías de sonidos).

Cada cue va al cuadro real de la escena (60 fps):
- toques y teclas de la pantalla: de video/build/pantalla/medidas.json (lo que registró la captura);
- betún, tarjetas, pastel, placa, etc.: de los tiempos de video/render/escena.js (anotados abajo).

Salida: audio/build/sfx_stem.wav (48 kHz estéreo) y audio/build/cues_sfx.json (lista de cues con su cuadro).
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
FPS = 60
DUR = 28.0
N = int(DUR * SR)
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- utilidades
def muestras(seg):
    return max(1, int(round(seg * SR)))


def tiempo(n):
    return np.arange(n) / SR


def env(n, a, d):
    """Ataque exponencial y caída exponencial (segundos)."""
    t = tiempo(n)
    return (1 - np.exp(-t / max(a, 1e-4))) * np.exp(-t / max(d, 1e-4))


def campana(n, pico=0.5, forma=2.0):
    """Envolvente que sube y baja (pico en fracción del largo)."""
    u = np.linspace(0, 1, n)
    sube = np.clip(u / max(pico, 1e-3), 0, 1)
    baja = np.clip((1 - u) / max(1 - pico, 1e-3), 0, 1)
    return np.sin(np.pi / 2 * np.minimum(sube, baja)) ** forma


def banda(x, lo, hi, orden=2):
    hi = min(hi, SR / 2 - 200)
    b, a = signal.butter(orden, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def pasa_bajos(x, fc, orden=2):
    b, a = signal.butter(orden, fc / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def pasa_altos(x, fc, orden=2):
    b, a = signal.butter(orden, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def ruido(n):
    return rng.standard_normal(n)


def ruido_movil(dur, centro, ancho_oct=1.0, color=0.0):
    """Ruido filtrado con un pasa banda que se mueve en el tiempo (máscara espectral sobre STFT).
    centro: (f0, f1) en Hz, se interpola en escala logarítmica; ancho_oct: ancho de la campana en octavas."""
    n = muestras(dur)
    nper = 1024
    _, _, Z = signal.stft(ruido(n + nper), SR, nperseg=nper, noverlap=nper - 128)
    fr = np.fft.rfftfreq(nper, 1 / SR)[:, None]
    u = np.linspace(0, 1, Z.shape[1])[None, :]
    c = np.exp(np.log(centro[0]) + (np.log(centro[1]) - np.log(centro[0])) * u)
    oct_ = np.log2(np.maximum(fr, 20) / c)
    mascara = np.exp(-0.5 * (oct_ / (ancho_oct / 2.355)) ** 2) * (np.maximum(fr, 20) / 1000) ** color
    _, x = signal.istft(Z * mascara, SR, nperseg=nper, noverlap=nper - 128)
    x = x[nper // 2:nper // 2 + n]
    return x / (np.abs(x).max() + 1e-9)


def tono(f, n, d, fase=0.0):
    return np.sin(2 * np.pi * f * tiempo(n) + fase) * np.exp(-tiempo(n) / d)


def chirp(f0, f1, n, d):
    t = tiempo(n)
    f = f1 + (f0 - f1) * np.exp(-t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def normal(x, pico=1.0):
    return x * (pico / (np.abs(x).max() + 1e-9))


# ---------------------------------------------------------------- sonidos (todos mono, pico 1.0)
def s_tecla(variante=0):
    """Tecla suave: clic agudo corto + cuerpo pequeño."""
    n = muestras(0.06)
    r = np.random.default_rng(100 + variante)
    clic = banda(r.standard_normal(n), 2600 + 300 * r.random(), 7000) * env(n, 0.0003, 0.004)
    cuerpo = tono(700 + 120 * r.random(), n, 0.012) * 0.35
    return normal(clic + cuerpo)


def s_espacio():
    n = muestras(0.09)
    clic = banda(ruido(n), 1500, 5000) * env(n, 0.0004, 0.006)
    cuerpo = tono(420, n, 0.02) * 0.5
    return normal(clic + cuerpo)


def s_enter():
    n = muestras(0.18)
    clic = banda(ruido(n), 1800, 6000) * env(n, 0.0004, 0.006)
    golpe = tono(260, n, 0.045) * 0.7 + tono(520, n, 0.02) * 0.2
    return normal(clic * 0.8 + golpe)


def s_tap():
    """Yema sobre cristal: 'tk' corto, sin timbre de botón."""
    n = muestras(0.07)
    clic = banda(ruido(n), 1400, 4200) * env(n, 0.0005, 0.006)
    cuerpo = tono(230, n, 0.018) * 0.45
    return normal(clic + cuerpo)


def s_betun(dur, pulsos=0.0, brillo=1.0, semilla=0):
    """Betún que sale de la manga: crema húmeda (ruido grave modulado) con burbujitas; 'pulsos' = conchas por segundo."""
    n = muestras(dur)
    r = np.random.default_rng(300 + semilla)
    base = pasa_bajos(banda(r.standard_normal(n), 120, 1400), 900)
    lfo = pasa_bajos(r.standard_normal(n), 6) ; lfo = 0.6 + 0.4 * normal(lfo)
    x = base * lfo
    if pulsos > 0:
        t = tiempo(n)
        x *= 0.55 + 0.45 * (0.5 + 0.5 * np.cos(2 * np.pi * pulsos * t)) ** 2
    # burbujitas: chirps cortos ascendentes
    k = int(dur * 9 * brillo)
    for _ in range(k):
        i = r.integers(0, max(1, n - muestras(0.03)))
        m = muestras(0.012 + 0.012 * r.random())
        f0 = 350 + 400 * r.random()
        b = np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f0 * 2.2, m)) / SR) * np.hanning(m) * (0.25 + 0.3 * r.random())
        x[i:i + m] += b * np.abs(base).max() * 2.2
    e = np.minimum(1, tiempo(n) / 0.05) * np.minimum(1, (dur - tiempo(n)) / 0.08)
    return normal(x * e)


def s_manga_aprieta():
    """Apretón de la manga: 'squish' grave con burbuja."""
    n = muestras(0.32)
    x = ruido_movil(0.32, (300, 800), 1.4) * campana(n, 0.25, 1.2)
    m = muestras(0.05)
    burbuja = np.sin(2 * np.pi * np.cumsum(np.linspace(260, 620, m)) / SR) * np.hanning(m)
    x[muestras(0.12):muestras(0.12) + m] += burbuja * 0.6
    return normal(pasa_bajos(x, 2400))


def s_cristal(dur=0.9, f0=1850, brillo=1.0, ataque=0.03, semilla=0):
    """Cristal: parciales inarmónicos con caídas distintas y ataque suave."""
    n = muestras(dur)
    r = np.random.default_rng(500 + semilla)
    x = np.zeros(n)
    for razon, d, g in [(1.0, 0.55, 1.0), (2.32, 0.35, 0.55), (4.25, 0.22, 0.35 * brillo), (6.63, 0.14, 0.2 * brillo)]:
        f = f0 * razon * (1 + 0.003 * r.standard_normal())
        x += g * np.sin(2 * np.pi * f * tiempo(n) + r.random() * 6.28) * np.exp(-tiempo(n) / (d * dur / 0.9))
    x *= 1 - np.exp(-tiempo(n) / ataque)
    return normal(x)


def s_cristal_aparece():
    n = muestras(1.0)
    brillo = s_cristal(1.0, 2350, 1.0, 0.12) * 0.6
    aire = ruido_movil(1.0, (5000, 9000), 1.2) * campana(n, 0.3, 1.5) * 0.35
    return normal(brillo + aire)


def s_cristal_cuerpo():
    """El cuerpo de cristal del celular llega: 'whum' grave + reflejo."""
    n = muestras(0.9)
    whum = chirp(110, 62, n, 0.18) * env(n, 0.03, 0.16)
    aire = ruido_movil(0.9, (900, 2600), 1.6) * campana(n, 0.3, 1.6) * 0.4
    reflejo = s_cristal(0.9, 1560, 0.7, 0.04, 2) * 0.3
    return normal(whum + aire + reflejo)


def s_whoosh(dur, f=(500, 2600), ancho=1.3, pico=0.55):
    n = muestras(dur)
    return normal(ruido_movil(dur, f, ancho, -0.3) * campana(n, pico, 1.6))


def s_pantalla_enciende():
    n = muestras(0.55)
    t = tiempo(n)
    glide = np.sin(2 * np.pi * np.cumsum(420 + 380 * (1 - np.exp(-t / 0.08))) / SR) * env(n, 0.01, 0.16)
    brillo = np.sin(2 * np.pi * 1660 * t) * env(n, 0.02, 0.12) * 0.25
    aire = ruido_movil(0.55, (2500, 6000), 1.4) * campana(n, 0.2, 1.4) * 0.25
    return normal(glide * 0.6 + brillo + aire)


def s_asienta():
    n = muestras(0.3)
    return normal(chirp(150, 90, n, 0.03) * env(n, 0.004, 0.06) + banda(ruido(n), 300, 1600) * env(n, 0.001, 0.012) * 0.2)


def s_subrayado(dur=0.42):
    """El betún subraya: barrido cremoso corto con ligera subida."""
    n = muestras(dur)
    crema = s_betun(dur, 0, 0.6, 11) * 0.7
    barrido = ruido_movil(dur, (700, 1500), 1.2) * campana(n, 0.35, 1.3) * 0.5
    return normal(crema + barrido)


def s_scroll(dur=0.32):
    n = muestras(dur)
    return normal(pasa_altos(ruido_movil(dur, (2600, 4200), 1.6), 1500) * campana(n, 0.25, 1.5))


def s_tarjeta_sale():
    """La tarjeta se despega: 'pop' de succión + swish que sube."""
    n = muestras(0.42)
    pop = chirp(380, 760, muestras(0.05), 0.01) * np.hanning(muestras(0.05))
    x = s_whoosh(0.42, (700, 2300), 1.3, 0.35) * 0.8
    x[:len(pop)] += pop * 0.7
    return normal(x)


def s_tarjeta_regresa():
    """Regresa a su ranura: swish que baja y 'tok' suave al asentar (a los 0.30 s)."""
    dur = 0.42
    n = muestras(dur)
    x = s_whoosh(0.3, (2200, 700), 1.3, 0.75) * 0.7
    x = np.concatenate([x, np.zeros(n - len(x))])
    tok = chirp(330, 210, muestras(0.12), 0.02) * env(muestras(0.12), 0.002, 0.03)
    i = muestras(0.29)
    x[i:i + len(tok)] += tok * 0.8
    return normal(x)


def s_pestana():
    return s_whoosh(0.22, (1400, 2600), 1.0, 0.4) * 0.8


def s_cuadricula():
    """Las fotos del catálogo aparecen: cascada de pops pequeños."""
    n = muestras(0.45)
    x = np.zeros(n)
    for k, f in enumerate([880, 990, 1110, 1320, 1480, 1660]):
        m = muestras(0.05)
        p = np.sin(2 * np.pi * np.cumsum(np.linspace(f * 0.8, f, m)) / SR) * env(m, 0.002, 0.012)
        i = muestras(0.055 * k)
        x[i:i + m] += p * (0.7 + 0.05 * k)
    return normal(x)


def s_panel_cambia():
    x = s_whoosh(0.3, (900, 2000), 1.2, 0.4)
    pop = chirp(300, 520, muestras(0.06), 0.01) * env(muestras(0.06), 0.002, 0.02)
    x[:len(pop)] += pop * 0.5
    return normal(x)


def s_subir_foto():
    n = muestras(0.35)
    a = chirp(500, 700, muestras(0.08), 0.02) * env(muestras(0.08), 0.002, 0.025)
    b = chirp(700, 1050, muestras(0.12), 0.02) * env(muestras(0.12), 0.002, 0.05)
    x = np.zeros(n)
    x[:len(a)] += a
    x[muestras(0.07):muestras(0.07) + len(b)] += b * 0.8
    return normal(x)


def s_chime(notas, d=0.6, sep=0.09, dur=1.2):
    n = muestras(dur)
    x = np.zeros(n)
    for k, f in enumerate(notas):
        i = muestras(sep * k)
        m = n - i
        tt = tiempo(m)
        v = np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) + 0.25 * np.sin(2 * np.pi * 2.76 * f * tt) * np.exp(-tt / (d * 0.3))
        x[i:] += v * (1 - np.exp(-tt / 0.002)) * (0.85 ** k)
    return normal(x)


def s_tabla():
    n = muestras(0.4)
    golpe = tono(190, n, 0.07) + 0.4 * tono(410, n, 0.04) + 0.15 * tono(780, n, 0.025)
    clic = banda(ruido(n), 1200, 4000) * env(n, 0.0005, 0.006) * 0.3
    return normal(golpe * (1 - np.exp(-tiempo(n) / 0.001)) + clic)


def s_piso_asienta():
    """Un piso del pastel cae y asienta: golpe sordo y mullido."""
    n = muestras(0.38)
    golpe = chirp(140, 75, n, 0.04) * env(n, 0.003, 0.08)
    mullido = pasa_bajos(ruido(n), 700) * env(n, 0.002, 0.03) * 0.5
    return normal(golpe + mullido)


def s_pipeo(n_pulsos=6, dur=0.36, semilla=0):
    """Decoración con la manga: tren de apretoncitos (conchas/perlas)."""
    n = muestras(dur)
    r = np.random.default_rng(700 + semilla)
    x = np.zeros(n)
    for k in range(n_pulsos):
        m = muestras(0.045)
        f0 = 300 + 160 * r.random()
        b = pasa_bajos(r.standard_normal(m), 1200) * np.hanning(m) * 0.6
        b += np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f0 * 1.6, m)) / SR) * np.hanning(m) * 0.35
        i = int(k * (n - m) / max(1, n_pulsos - 1))
        x[i:i + m] += b
    return normal(x)


def s_cereza(f=1320):
    """Cereza que cae: 'plip' brillante y una gotita."""
    n = muestras(0.25)
    plip = chirp(f * 1.35, f, n, 0.012) * env(n, 0.0015, 0.05)
    gota = tono(f * 2.1, n, 0.02) * 0.2
    return normal(plip + gota)


def s_hoja(sube=True):
    f = (600, 1800) if sube else (1800, 600)
    return s_whoosh(0.34, f, 1.2, 0.4 if sube else 0.6) * 0.9


def s_teclado(sube=True):
    f = (900, 2200) if sube else (2200, 900)
    return s_whoosh(0.26, f, 1.0, 0.4 if sube else 0.6) * 0.8


def s_sugerencia():
    n = muestras(0.2)
    x = np.zeros(n)
    t = s_tap()
    x[:len(t)] += t * 0.8
    c = s_chime([1975], d=0.08, dur=0.2) * 0.25
    x += c[:n]
    return normal(x)


def s_boton_pop():
    """El botón sale en 3D: pop jugoso + destello de cristal."""
    n = muestras(0.6)
    pop = chirp(900, 320, muestras(0.14), 0.025) * env(muestras(0.14), 0.001, 0.05)
    x = np.zeros(n)
    x[:len(pop)] += pop
    x += s_cristal(0.6, 2100, 0.8, 0.01, 4) * 0.25
    x += s_whoosh(0.6, (800, 2400), 1.2, 0.2) * 0.25
    return normal(x)


def s_mensaje():
    """Mensaje listo (genérico, no es el sonido de ninguna app): dos notas suaves ascendentes."""
    return s_chime([1175, 1568], d=0.18, sep=0.075, dur=0.55)


def s_swipe():
    return s_whoosh(0.26, (1200, 2400), 1.1, 0.45) * 0.85


def s_pin():
    n = muestras(0.45)
    x = np.zeros(n)
    plink = s_chime([1760], d=0.12, dur=0.45) * 0.6
    golpe = chirp(260, 160, muestras(0.1), 0.02) * env(muestras(0.1), 0.002, 0.03)
    x += plink
    x[:len(golpe)] += golpe * 0.7
    return normal(x)


def s_golpe_grave():
    """Golpe grave del cierre (capa de cuerpo; la música pone el bombo)."""
    n = muestras(1.6)
    sub = chirp(70, 41, n, 0.12) * env(n, 0.004, 0.45)
    aire = ruido_movil(1.6, (300, 120), 1.6) * env(n, 0.005, 0.25) * 0.35
    return normal(sub + aire)


def s_cristal_placa():
    n = muestras(1.6)
    x = s_cristal(1.6, 1480, 0.9, 0.08, 6) * 0.7
    x += ruido_movil(1.6, (3000, 7000), 1.3) * campana(n, 0.25, 1.6) * 0.25
    return normal(x)


def s_campanita():
    """Campanita final: tres notas de Re mayor que caben en los 0.45 s que quedan."""
    return s_chime([1175, 1760, 2349], d=0.32, sep=0.06, dur=0.46)


# ---------------------------------------------------------------- lista de cues (cuadro, id, ganancia dB, pan, extra)
def cues():
    med = json.loads((ROOT / 'video' / 'build' / 'pantalla' / 'medidas.json').read_text())
    C = []

    def c(f, ident, db=0.0, pan=0.0, **extra):
        C.append({'f': int(round(f)), 'id': ident, 'db': db, 'pan': pan, **extra})

    # HOOK: golpe suave, manga, cristal de la barra; el betún escribe «galletas aguascalientes» (letra i en 6+5.5·i)
    c(0, 'golpe_suave', -6)
    c(0, 'manga_aprieta', -4)
    c(2, 'cristal_aparece', -11)
    c(6, 'betun_cremoso', -12, dur=(128 - 6) / FPS)
    texto = 'galletas aguascalientes'
    for i, ch in enumerate(texto):
        c(6 + 5.5 * i, 'espacio' if ch == ' ' else 'tecla', -9 if ch == ' ' else -10, pan=-0.25 + 0.5 * i / len(texto), variante=i)
    c(128, 'whoosh_corto', -10, pan=0.2)                      # la manga sale (f128–150)
    c(147, 'enter', -8)
    c(150, 'trazo_contorno', -9, dur=(186 - 150) / FPS)      # conector + anillo del resultado (f150–186)
    c(158, 'cristal_cuerpo', -9, pan=-0.15)                   # llega el celular de cristal
    c(188, 'pantalla_enciende', -10, pan=-0.15)
    c(214, 'asienta', -10, pan=-0.15)
    c(236, 'subrayado', -9, pan=-0.2, dur=(258 - 236) / FPS)  # 5.0 en Google
    # CATÁLOGO
    for b, l in [(336, 392), (376, 416), (404, 444)]:
        c(b, 'betun_borde', -13, pan=0.05, dur=(l - b) / FPS)
        c(l, 'tarjeta_sale', -12, pan=0.2)
        c(l + 40, 'tarjeta_regresa', -10, pan=0.05)
    # Toques de la pantalla (los que registró la captura)
    for t in med['toques']:
        c(t['f'], 'tap', -9, pan=-0.3 + 0.25 * (t['x'] / 390))
    c(532, 'pestana_desliza', -14, pan=-0.2)
    c(540, 'cuadricula', -13, pan=-0.2)
    c(594, 'panel_cambia', -13, pan=-0.2)
    c(614, 'subir_foto', -12, pan=-0.2)
    # A TU MEDIDA
    c(650, 'foto_sale', -10, pan=0.25)
    c(667, 'betun_trazo', -11, pan=0.3, dur=(721 - 667) / FPS)
    c(676, 'foto_lista', -15, pan=-0.2)
    c(724, 'tabla', -10, pan=0.3)
    c(741, 'piso_asienta', -8, pan=0.3)
    c(744, 'pipeo', -12, pan=0.3, n=7, dur=(760 - 744) / FPS, semilla=1)
    c(750, 'pipeo', -14, pan=0.32, n=6, dur=(766 - 750) / FPS, semilla=2)
    c(762, 'pipeo', -15, pan=0.28, n=4, dur=(770 - 762) / FPS, semilla=3)
    c(779, 'piso_asienta', -9, pan=0.3)
    c(782, 'pipeo', -13, pan=0.3, n=5, dur=(790 - 782) / FPS, semilla=4)
    c(788, 'pipeo', -15, pan=0.3, n=4, dur=(794 - 788) / FPS, semilla=5)
    for i, f in enumerate([1175, 1319, 1480, 1568, 1760]):
        c(794 + 4 * i + 3, 'cereza', -13, pan=0.2 + 0.05 * i, freq=f)
    c(838, 'whoosh_corto', -11, pan=0.2)                      # pastel y foto regresan
    # PEDIDO
    # (tiempos de la captura: hojas, teclado y botón siguen a los toques que la provocan)
    toque = {t['selector']: t['f'] for t in med['toques']}
    c(toque['#btn-fecha'] + 4, 'hoja_sube', -12, pan=-0.25)
    c(toque['#fecha-listo'] + 4, 'hoja_baja', -13, pan=-0.25)
    c(toque['#mensaje'] + 2, 'teclado_sube', -13, pan=-0.25)
    for k in med['teclas']:
        c(k['f'], 'sugerencia' if k['tipo'] == 'sugerencia' else 'tecla', -11 if k['tipo'] == 'sugerencia' else -12, pan=-0.25, variante=k['f'])
    c(med['teclas'][-1]['f'] + 4, 'teclado_baja', -13, pan=-0.25)
    fb = toque['#btn-enviar']
    c(fb, 'boton_pop', -7, pan=0.1)
    c(fb + 8, 'hoja_sube', -12, pan=-0.25)
    c(fb + 32, 'mensaje', -13, pan=-0.2)
    c(1066, 'subrayado', -9, pan=-0.2, dur=(1090 - 1066) / FPS)
    c(toque['#hoja-mensaje [data-cerrar]'] + 4, 'hoja_baja', -13, pan=-0.25)
    # scrolls y carrusel de la página (de la captura)
    for sc in med['scrolls']:
        largo = abs(sc['hasta'] - sc['desde'])
        c(sc['f0'], 'scroll_friccion', -14 if largo > 300 else -16, pan=-0.25, dur=min(0.45, sc['dur'] / FPS + 0.1))
    for k, ca in enumerate(med['carruseles']):
        c(ca['f0'], 'swipe', -13 if k < 2 else -15, pan=-0.2)
    # CONFIANZA
    for f in (1184, 1200, 1214):
        c(f, 'tarjeta_sale', -11, pan=0.15)
    c(1240, 'subrayado', -9, pan=0.1, dur=(1270 - 1240) / FPS)
    c(1276, 'tarjeta_regresa', -10, pan=0.0)
    c(1324, 'pin', -11, pan=-0.25)                            # .visible en 1298 + 0.1 s de retraso + caída
    c(1328, 'subrayado', -10, pan=-0.2, dur=(1348 - 1328) / FPS)
    # CIERRE y END CARD
    c(1344, 'whoosh_largo', -11, pan=-0.2)
    c(1350, 'betun_escribe', -12, pan=0.1, dur=(1396 - 1350) / FPS, semilla=21)
    c(1398, 'betun_escribe', -12, pan=0.1, dur=(1434 - 1398) / FPS, semilla=22)
    c(1440, 'golpe_grave', -5)
    c(1440, 'whoosh_corto', -11, pan=-0.3)                    # el celular sale
    c(1443, 'manga_aprieta', -7)
    c(1446, 'betun_escribe', -11, dur=(1533 - 1446) / FPS, semilla=23)
    c(1520, 'cristal_placa', -12)
    c(1652, 'campanita_final', -12)                         # justo al terminar la voz (f1651)
    return sorted(C, key=lambda x: x['f'])


def sonido(cu):
    i = cu['id']
    dur = cu.get('dur')
    if i == 'tecla': return s_tecla(cu.get('variante', 0))
    if i == 'espacio': return s_espacio()
    if i == 'enter': return s_enter()
    if i == 'tap': return s_tap()
    if i == 'golpe_suave': return s_piso_asienta()
    if i == 'manga_aprieta': return s_manga_aprieta()
    if i == 'cristal_aparece': return s_cristal_aparece()
    if i == 'betun_cremoso': return s_betun(dur, 0, 0.5, 1)
    if i == 'whoosh_corto': return s_whoosh(0.4, (500, 2400), 1.3, 0.5)
    if i == 'whoosh_largo': return s_whoosh(0.95, (380, 2000), 1.4, 0.45)
    if i == 'trazo_contorno': return s_subrayado(dur)
    if i == 'cristal_cuerpo': return s_cristal_cuerpo()
    if i == 'pantalla_enciende': return s_pantalla_enciende()
    if i == 'asienta': return s_asienta()
    if i == 'subrayado': return s_subrayado(max(0.3, dur or 0.4))
    if i == 'scroll_friccion': return s_scroll(dur or 0.32)
    if i == 'betun_borde': return s_betun(dur, pulsos=7.0, brillo=0.8, semilla=cu['f'])
    if i == 'tarjeta_sale': return s_tarjeta_sale()
    if i == 'tarjeta_regresa': return s_tarjeta_regresa()
    if i == 'pestana_desliza': return s_pestana()
    if i == 'cuadricula': return s_cuadricula()
    if i == 'panel_cambia': return s_panel_cambia()
    if i == 'subir_foto': return s_subir_foto()
    if i == 'foto_sale': return s_whoosh(0.5, (600, 2600), 1.3, 0.4)
    if i == 'betun_trazo': return s_betun(dur, 0, 0.7, 5)
    if i == 'foto_lista': return s_chime([1319, 1760], d=0.2, sep=0.07, dur=0.6)
    if i == 'tabla': return s_tabla()
    if i == 'piso_asienta': return s_piso_asienta()
    if i == 'pipeo': return s_pipeo(cu.get('n', 6), max(0.12, dur or 0.3), cu.get('semilla', 0))
    if i == 'cereza': return s_cereza(cu.get('freq', 1320))
    if i == 'hoja_sube': return s_hoja(True)
    if i == 'hoja_baja': return s_hoja(False)
    if i == 'teclado_sube': return s_teclado(True)
    if i == 'teclado_baja': return s_teclado(False)
    if i == 'sugerencia': return s_sugerencia()
    if i == 'boton_pop': return s_boton_pop()
    if i == 'mensaje': return s_mensaje()
    if i == 'swipe': return s_swipe()
    if i == 'pin': return s_pin()
    if i == 'betun_escribe': return s_betun(dur, pulsos=0, brillo=0.9, semilla=cu.get('semilla', 0))
    if i == 'golpe_grave': return s_golpe_grave()
    if i == 'cristal_placa': return s_cristal_placa()
    if i == 'campanita_final': return s_campanita()
    raise ValueError(f'Cue sin sonido: {i}')


def main():
    lista = cues()
    sfx = np.zeros((N, 2))
    for cu in lista:
        x = sonido(cu) * 10 ** (cu['db'] / 20)
        i = int(round(cu['f'] / FPS * SR))
        x = x[:max(0, N - i)]
        p = float(np.clip(cu['pan'], -1, 1))
        l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
        sfx[i:i + len(x), 0] += x * l * 1.414
        sfx[i:i + len(x), 1] += x * r * 1.414
    # cuarto pequeño para que todo viva en el mismo espacio (8 %)
    ir_n = int(0.5 * SR)
    ir = rng.standard_normal((ir_n, 2)) * np.exp(-np.arange(ir_n) / SR / 0.12)[:, None]
    ir = pasa_bajos(ir.T, 6000).T
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    rev = np.stack([signal.fftconvolve(sfx[:, k], ir[:, k])[:N] for k in range(2)], axis=1)
    sfx = sfx * 0.92 + rev * 0.08
    # Sin normalizar: las ganancias de cada cue son el diseño; la mezcla fija el nivel del stem.
    pico = np.abs(sfx).max()
    if pico > 0.98:
        print(f'aviso: pico {20 * np.log10(pico):.1f} dBFS, se baja el stem completo')
        sfx *= 0.98 / pico
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(OUT / 'sfx_stem.wav')],
                   input=sfx.astype(np.float32).tobytes(), check=True)
    tipos = sorted({c['id'] for c in lista})
    (OUT / 'cues_sfx.json').write_text(json.dumps({'fps': FPS, 'total': len(lista), 'tipos': tipos, 'cues': [{**c, 't': round(c['f'] / FPS, 3)} for c in lista]}, ensure_ascii=False, indent=1))
    print(f'✔ audio/build/sfx_stem.wav · {len(lista)} cues · {len(tipos)} sonidos distintos')


if __name__ == '__main__':
    main()
