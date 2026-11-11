#!/usr/bin/env python3
"""Música original, SFX y mezcla de Cata Café. Todo sintetizado en código (sin samples).

Salida en audio/build/: musica_stem.wav, sfx_stem.wav, voz_stem.wav, mezcla_master.wav y sfx_cues.json.
120 BPM: un compás = 2.0 s. Master a −14 LUFS / −1.25 dBTP; la música queda 12 dB o más bajo cada palabra.
"""
import json, re, subprocess
from pathlib import Path
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio/build'; OUT.mkdir(parents=True, exist_ok=True)
SR, DUR, FPS = 48000, 18.0, 60
N = int(SR * DUR)
rng = np.random.default_rng(7)
TL = json.loads((ROOT / 'brief/timeline.json').read_text())
mtof = lambda n: 440 * 2 ** ((n - 69) / 12)
tt = lambda d: np.arange(int(d * SR)) / SR


def put(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    x = x[:N - i] * gain
    buf[i:i + len(x), 0] += x * np.sqrt((1 - pan) / 2) * 1.414
    buf[i:i + len(x), 1] += x * np.sqrt((1 + pan) / 2) * 1.414


def lp(x, fc, order=2): return signal.sosfilt(signal.butter(order, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2): return signal.sosfilt(signal.butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, a, b): return signal.sosfilt(signal.butter(2, [a, b], 'band', fs=SR, output='sos'), x)
def fade(x, a=0.005, r=0.02):
    na, nr = int(a * SR), int(r * SR); x = x.copy(); x[:na] *= np.linspace(0, 1, na); x[-nr:] *= np.linspace(1, 0, nr); return x
def reverb(st, wet=0.25, d=1.4):
    n = int(d * SR); ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / (SR * d / 5))[:, None]
    ir = np.stack([lp(ir[:, 0], 5000), lp(ir[:, 1], 5000)], 1); ir /= np.sqrt((ir ** 2).sum(0))
    w = np.stack([signal.fftconvolve(st[:, k], ir[:, k])[:len(st)] for k in (0, 1)], 1)
    return st + wet * w


# ---------------- música ----------------
def musica():
    m = np.zeros((N, 2))
    CH = [[50, 53, 57, 60, 64], [50, 53, 57, 60, 64], [46, 50, 53, 57, 62], [46, 50, 53, 57, 62], [41, 48, 52, 57, 60], [48, 52, 55, 59, 62], [50, 53, 57, 60, 64], [46, 50, 53, 57, 62], [50, 57, 62]]
    # pad: sierras desafinadas con filtro, ataque lento
    pad = np.zeros((N, 2))
    for b, ch in enumerate(CH):
        d = 2.9 if b < 8 else 2.0; t = tt(d)
        env = np.minimum(t / 0.7, 1) * np.minimum((d - t) / 0.9, 1)
        for k, n in enumerate(ch):
            f = mtof(n)
            for det, pan in ((-7, -0.6), (7, 0.6)):
                x = signal.sawtooth(2 * np.pi * f * 2 ** (det / 1200) * t + k) * 0.5 + np.sin(2 * np.pi * f * t) * 0.6
                put(pad, lp(x, 700 + 500 * (b >= 6)) * env, b * 2.0 - (0.25 if b else 0) if b else 0, 0.05, pan)
    lvl = np.ones(N); t = np.arange(N) / SR
    lvl *= np.where(t < 12, 0.8, 1.0); lvl *= np.where(t > 16, np.exp(-(t - 16) * 1.3), 1)
    m += reverb(pad, 0.35) * lvl[:, None]
    # sub: golpe en 0.0 y nota grave sostenida
    def boom(f0, f1, d, k=6):
        t = tt(d); ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t * k)) / SR
        return np.sin(ph) * np.exp(-t * 3.2 / d * 1.6)
    put(m, boom(95, 37, 1.6) + lp(rng.standard_normal(int(1.6 * SR)), 300) * np.exp(-tt(1.6) * 14) * 0.6, 0.0, 0.75)
    for b, n in enumerate([38, 38, 34, 34, 29 + 12, 36, 38, 34]):
        t = tt(2.0); env = np.minimum(t / 0.08, 1) * np.minimum((2.0 - t) / 0.3, 1)
        put(m, np.sin(2 * np.pi * mtof(n) * t) * env, b * 2.0, 0.16 if b != 7 else 0.09)
    # pluck desde el compás 3: arpegio en corcheas con eco
    pl = np.zeros((N, 2))
    def pluck(f, d=0.5):
        t = tt(d); return sum(np.sin(2 * np.pi * f * h * t) / h * np.exp(-t * (5 + 4 * h)) for h in range(1, 6))
    PAT = [0, 2, 1, 3, 2, 4, 3, 1]
    for b in range(2, 8):
        if b == 7: continue
        ch = CH[b]
        for s in range(8):
            n = ch[PAT[s] % len(ch)] + 12 + (12 if b == 6 and s % 2 else 0)
            put(pl, pluck(mtof(n)), b * 2.0 + s * 0.25, 0.09 * (1.25 if b == 6 else 1) * (1.0 if s % 2 == 0 else 0.75), (-0.5, 0.5)[s % 2])
    for s, n in enumerate([62, 69, 74, 77]): put(pl, pluck(mtof(n), 0.9), 15.0 + s * 0.25, 0.06, (-0.4, 0.4)[s % 2])
    dl = int(0.375 * SR); echo = np.zeros_like(pl); echo[dl:, 0] = pl[:-dl, 1] * 0.38; echo[dl:, 1] = pl[:-dl, 0] * 0.38
    echo[2 * dl:] += pl[:-2 * dl] * 0.16
    m += reverb(pl + echo, 0.22, 1.0)
    # shaker desde el compás 5
    for b in range(4, 7):
        for s in range(16):
            if b == 5 and s >= 8: g = 0.5
            else: g = 1
            d = 0.07; x = hp(rng.standard_normal(int(d * SR)), 6000) * np.exp(-tt(d) * (55 if s % 2 else 38))
            put(m, x, b * 2.0 + s * 0.125, 0.035 * (1.5 if s % 4 == 2 else 1) * g, 0.25)
    # bombo suave (compases 5 y 6) y pleno en el lift (compás 7), con bajo
    def kick(): t = tt(0.3); return np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-t * 28)) / SR) * np.exp(-t * 13)
    for tk in (8.0, 9.0, 10.0): put(m, kick(), tk, 0.22)
    for tk in (12.0, 12.5, 13.0, 13.5): put(m, kick(), tk, 0.42)
    for s in range(8):
        if s % 2: t = tt(0.22); put(m, lp(signal.sawtooth(2 * np.pi * mtof(38) * t), 400) * np.exp(-t * 9), 12.0 + s * 0.25, 0.14)
    # riser 11.0–12.0
    t = tt(1.0); nz = rng.standard_normal(len(t)); r = np.zeros(len(t))
    for i in range(0, len(t), 2400):
        fc = 500 * (14 ** (i / len(t))); r[i:i + 2400] = bp(nz, fc * 0.7, min(fc * 1.4, 20000))[i:i + 2400]
    put(m, r * (t ** 2), 11.0, 0.10); put(m, np.sin(2 * np.pi * np.cumsum(220 * 2 ** (t * 1.5)) / SR) * t ** 2, 11.0, 0.035)
    # platillo suave en la revelación y golpe grave en el corte final
    put(m, hp(rng.standard_normal(int(1.8 * SR)), 5000) * np.exp(-tt(1.8) * 3), 12.0, 0.05, 0.1)
    put(m, boom(80, 31, 2.0, 5) + lp(rng.standard_normal(int(2.0 * SR)), 180) * np.exp(-tt(2.0) * 6) * 0.7, 16.0, 0.8)
    return m


# ---------------- SFX ----------------
def s_tick(f=2200): t = tt(0.03); return fade(bp(rng.standard_normal(len(t)), f * 0.7, f * 1.4) * np.exp(-t * 160), 0.001, 0.005)
def s_ting(f): t = tt(0.5); return (np.sin(2 * np.pi * f * t + 2 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 18)) * np.exp(-t * 9)) * 0.7
def s_pop(f): t = tt(0.12); return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.8 * t / 0.12)) / SR) * np.exp(-t * 30)
def s_whoosh(d, f0, f1):
    t = tt(d); nz = rng.standard_normal(len(t)); o = np.zeros(len(t)); st = 1200
    for i in range(0, len(t), st):
        fc = f0 * (f1 / f0) ** (i / len(t)); o[i:i + st] = bp(nz, fc * 0.6, min(fc * 1.6, 20000))[i:i + st]
    return o * np.sin(np.pi * t / d) ** 2
def s_scribble(d):
    t = tt(d); nz = bp(rng.standard_normal(len(t)), 1800, 5200)
    return fade(nz * (0.55 + 0.45 * np.sin(2 * np.pi * (9 + 3 * np.sin(t * 5)) * t)) * np.minimum(t / 0.05, 1), 0.01, 0.08)
def s_thump(f=70): t = tt(0.28); return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-t * 40))) / SR) * np.exp(-t * 16) + lp(rng.standard_normal(len(t)), 600) * np.exp(-t * 50) * 0.5
def s_drop(): t = tt(0.25); return np.sin(2 * np.pi * np.cumsum(500 + 1300 * np.exp(-t * 26)) / SR) * np.exp(-t * 17)
def s_splash(): t = tt(0.6); return hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 9) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
def s_shimmer(d=0.9): t = tt(d); return sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((3136, 3951, 4699, 6272))) * np.sin(np.pi * t / d) ** 2 * 0.25
def s_type(): t = tt(0.09); return lp(rng.standard_normal(len(t)), 1400) * np.exp(-t * 60) + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 45) * 0.8
def s_pour(d): t = tt(d); return fade(bp(rng.standard_normal(len(t)), 700, 2600) * (0.7 + 0.3 * np.sin(2 * np.pi * 13 * t)), 0.15, 0.4)
def s_click(): t = tt(0.05); return np.sin(2 * np.pi * 950 * t) * np.exp(-t * 90) + s_tick(3200).sum() * 0
def s_suck(d): return s_whoosh(d, 5000, 250)[::-1].copy()[::-1] * np.linspace(0.3, 1, int(d * SR)) ** 2

def sfx():
    C = []  # (cuadro, nombre, sonido, ganancia, pan)
    a = lambda f, name, x, g=0.3, pan=0.0: C.append((f, name, x, g, pan))
    # compás 1
    a(0, 'impacto de la gota', s_thump(90), 0.42); a(0, 'salpicadura', s_splash(), 0.3); a(2, 'anillo', s_whoosh(0.7, 300, 2400), 0.3)
    a(7, 'onda 2', s_whoosh(0.5, 400, 1500), 0.14, -0.3); a(17, 'onda 3', s_whoosh(0.5, 400, 1300), 0.1, 0.3)
    a(24, 'el anillo se vuelve panel', s_whoosh(0.55, 900, 3200), 0.2); a(56, 'panel de cristal 1', s_ting(1568), 0.22)
    a(66, 'gota de rebote', s_drop(), 0.16, 0.1)
    # compás 2
    a(120, 'la gota se estira', s_drop()[::-1].copy(), 0.14); a(126, 'V60 de cristal', s_ting(2093), 0.2, 0.15); a(158, 'V60 asienta', s_pop(500), 0.14)
    a(130, 'hilo del servido', s_pour(1.6), 0.07); a(150, 'el hilo toca el panel', s_drop(), 0.14)
    a(130, 'tipo UN', s_type(), 0.3, -0.2); a(149, 'tipo SOLO', s_type(), 0.3, 0.2); a(166, 'trazo escribe TRAZO', s_scribble(0.45), 0.13)
    a(168, 'trazo escribe el nombre', s_scribble(0.75), 0.12, -0.2); a(198, 'descripción 1', s_tick(), 0.2, -0.3); a(208, 'descripción 2', s_tick(1900), 0.2, -0.3)
    a(214, 'sale UN SOLO TRAZO', s_whoosh(0.3, 2500, 700), 0.14)
    # compás 3
    a(236, 'scroll a métodos', s_whoosh(0.9, 250, 1800), 0.24)
    for f in (240, 270, 300): a(f, 'tick de scroll', s_tick(2600), 0.22, 0.4)
    for i, f in enumerate((252, 270, 288)): a(f, f'panel de método {i + 1}', s_ting((1318, 1568, 1976)[i]), 0.2, (-0.4, 0.4, 0.4)[i])
    for i, f in enumerate((262, 284, 302)): a(f, ('dripper', 'Chemex', 'prensa francesa')[i], s_pop((420, 520, 620)[i]), 0.2, (-0.4, 0.4, 0.4)[i])
    a(268, 'tipo V60', s_type(), 0.22, -0.4); a(299, 'tipo UNA', s_type(), 0.26); a(311, 'tipo PÁGINA', s_type(), 0.32); a(340, 'el hilo llega al borde', s_tick(1500), 0.16)
    # compás 4
    a(348, 'panel de grano', s_ting(1175), 0.2); a(356, 'scroll a grano', s_whoosh(0.8, 250, 1700), 0.24); a(360, 'tick de scroll', s_tick(2600), 0.2, 0.4)
    a(360, 'entra la bolsa', s_whoosh(0.5, 500, 1400), 0.2, -0.4); a(388, 'la bolsa asienta', s_thump(110), 0.3, -0.4)
    a(384, 'el trazo rodea la bolsa', s_scribble(0.8), 0.13, -0.4); a(346, 'sale UNA PÁGINA', s_whoosh(0.3, 2500, 700), 0.12)
    for i in range(5):
        a(432 + i * 2, f'rama {i + 1}', s_drop(), 0.09, 0.1); a(438 + i * 8, f'vasito {ROAST[i]}', s_pop(380 + i * 70), 0.22, 0.2)
        a(444 + i * 8, f'grano en vidrio {i + 1}', s_tick(3400 - i * 300), 0.16, 0.25)
    # compás 5
    a(462, 'sube la barra', s_whoosh(0.5, 200, 700), 0.22); a(476, 'scroll a tarjeta', s_whoosh(0.8, 250, 1700), 0.22); a(486, 'la barra asienta', s_thump(60), 0.3)
    a(482, 'la tarjeta sale de la barra', s_whoosh(0.6, 1500, 4500), 0.16); a(506, 'tipo Cliente frecuente', s_type(), 0.2)
    a(522, 'vuelo de la tarjeta', s_whoosh(0.8, 700, 2600), 0.2, 0.2); a(568, 'la tarjeta aterriza', s_thump(130), 0.28)
    a(562, 'el trazo bordea la tarjeta', s_scribble(0.5), 0.12); a(572, 'brillo de la tarjeta', s_shimmer(0.5), 0.1); a(574, 'baja la barra', s_whoosh(0.5, 700, 200), 0.18)
    # compás 6
    a(598, 'scroll al botón', s_whoosh(0.8, 250, 1700), 0.2); a(606, 'aparece el botón', s_pop(330), 0.24); a(618, 'tipo Hacer pedido', s_type(), 0.2)
    a(630, 'tipo EN EL', s_type(), 0.26); a(657, 'tipo CELULAR', s_type(), 0.34); a(660, 'la cámara se aleja', s_whoosh(1.1, 200, 3000), 0.3)
    a(662, 'el trazo dibuja el teléfono', s_scribble(0.85), 0.12); a(700, 'el texto entra al teléfono', s_whoosh(0.4, 3000, 600), 0.16)
    a(718, 'el teléfono asienta', s_thump(55), 0.3); a(722, 'cristal del teléfono', s_ting(1047), 0.16)
    # compás 7
    a(742, 'el teléfono se desliza', s_whoosh(0.55, 400, 1500), 0.2, -0.3); a(750, 'pulsación', s_click(), 0.4, -0.2); a(750, 'botón hundido', s_thump(150), 0.22, -0.2)
    a(752, 'onda de contacto', s_shimmer(0.8), 0.12, -0.2); a(759, 'segunda onda', s_whoosh(0.6, 800, 2600), 0.1, -0.2); a(752, 'el trazo sale del teléfono', s_scribble(0.5), 0.1)
    a(768, 'chip de horario', s_ting(1568), 0.2, 0.4); a(776, 'texto de horario', s_tick(), 0.18, 0.4); a(786, 'chip de ubicación', s_ting(1760), 0.2, 0.4); a(794, 'texto de ubicación', s_tick(), 0.18, 0.4)
    for i, f in enumerate((798, 813, 828)): a(f, ('Entrada principal', 'Pasaje Arteaga', 'Módulo de cristal')[i], s_pop(440 + i * 110), 0.24, 0.3); a(f + 3, f'texto de ruta {i + 1}', s_tick(2000 + i * 300), 0.14, 0.4)
    # compás 8
    a(840, 'todo se recoge', s_whoosh(0.5, 4000, 300), 0.24); a(846, 'la línea', s_whoosh(0.4, 600, 2400), 0.14); a(862, 'giro de cámara', s_whoosh(1.4, 250, 900), 0.16)
    a(868, 'el trazo escribe Cata Café', s_scribble(1.0), 0.11)
    for i, ch in enumerate('CataCafé'): a(868 + round((i + (i > 3)) * 4.5) + 9, f'letra {ch}', s_tick(1700 + i * 140), 0.13, -0.4 + i * 0.1)
    a(934, 'brillo final', s_shimmer(0.6), 0.07)
    # end card
    a(962, 'línea de la end card', s_tick(1400), 0.14); a(964, 'texto end card 1', s_type(), 0.14); a(974, 'texto end card 2', s_tick(1800), 0.1)
    buf = np.zeros((N, 2))
    for f, name, x, g, pan in C: put(buf, x, f / FPS, g, pan)
    buf = np.tanh(reverb(buf, 0.12, 0.7) * 1.3) / 1.3
    (OUT / 'sfx_cues.json').write_text(json.dumps([{'f': f, 't': round(f / FPS, 3), 'cue': n} for f, n, *_ in sorted(C, key=lambda c: c[0])], ensure_ascii=False, indent=1))
    return buf, len(C)

ROAST = ['Canela', 'Medio', 'Medio alto', 'City', 'Vienés']


def wav(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(path)], input=x.astype(np.float32).tobytes(), check=True)
def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1])
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)


def main():
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / 'voz/voz_stem_48k.wav'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    v = np.frombuffer(pcm, dtype=np.float32).astype(float)[:N]; v = np.pad(v, (0, N - len(v)))
    voz = np.stack([v, v], 1)
    mus = musica(); fx, ncues = sfx()
    # nivel base: música a −27 LUFS aprox. y SFX algo debajo; luego se agacha bajo la voz
    env = np.abs(signal.hilbert(v)); env = lp(np.maximum(env, 0), 6); env = np.maximum.reduce([env, np.roll(env, int(0.12 * SR)), np.roll(env, -int(0.15 * SR))])
    duck = np.clip(env / 0.05, 0, 1)
    mus *= 10 ** (-3 / 20)
    for depth in (6, 8, 10, 12, 14, 16):
        g = 10 ** (-depth * duck / 20); mm = mus * g[:, None]; ff = fx * (10 ** (-depth * 0.5 * duck / 20))[:, None]
        worst = 99
        for L in TL['voz']:
            ws = L['palabras']
            for i, w in enumerate(ws):
                a = int(w['f'] / FPS * SR); b = int((ws[i + 1]['f'] if i + 1 < len(ws) else L['termina_f']) / FPS * SR); b = min(b, N)
                if b - a < 2000: continue
                worst = min(worst, rms(v[a:b]) - rms(mm[a:b].mean(1)))
        if worst >= 12.5: break
    print(f'{ncues} cues de SFX · ducking de {depth} dB · peor palabra: voz {worst:.1f} dB sobre la música')
    mix = voz + mm + ff
    wav(OUT / 'voz_stem.wav', voz); wav(OUT / 'musica_stem.wav', mm); wav(OUT / 'sfx_stem.wav', ff)
    tmp = OUT / '_mix.wav'; wav(tmp, mix * 0.7)
    I, _ = lufs(tmp); gain = -14.0 - I; lim = 0.80
    for _ in range(4):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', f'volume={gain:.2f}dB,alimiter=limit={lim}:level=0:attack=3:release=60', '-c:a', 'pcm_s24le', str(OUT / 'mezcla_master.wav')], check=True)
        I2, pk = lufs(OUT / 'mezcla_master.wav')
        if abs(I2 + 14) < 0.15 and pk <= -1.25: break
        gain += -14.0 - I2
        if pk > -1.25: lim *= 10 ** ((-1.3 - pk) / 20)
    tmp.unlink()
    for n in ('voz_stem', 'musica_stem', 'sfx_stem', 'mezcla_master'):
        print(n, '%.1f LUFS, pico real %.2f dBTP' % lufs(OUT / f'{n}.wav'))


if __name__ == '__main__':
    main()
