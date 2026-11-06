#!/usr/bin/env python3
"""Música original en código para el video de Ana Gaby Repostería (98 BPM, Re mayor, 28 s).

- Guitarra de nylon y glockenspiel: compuestos aquí y tocados con FluidR3 GM (licencia MIT) vía FluidSynth.
- Cucharas, shaker, palmas suaves, bajo cálido, riser del lift, golpe suave y golpe grave: sintetizados aquí.
- Estructura amarrada a brief/timeline.json: golpe en f0 (cucharas y glockenspiel), guitarra desde el compás 2,
  shaker desde el 3 (catálogo), lift en 9.80 s con bajo cálido y glockenspiel una octava arriba (a tu medida),
  palmas desde 15.90 s (pedido), se adelgaza desde 22.40, respiro en 22.96 y golpe grave en 24.00 con cadencia final.

Salida: audio/build/musica_stem.wav (48 kHz estéreo, sin ducking).
Requiere: numpy, scipy, mido, fluidsynth y /usr/share/sounds/sf2/FluidR3_GM.sf2.
"""
import subprocess
import tempfile
from pathlib import Path

import mido
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'build'
OUT.mkdir(parents=True, exist_ok=True)
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
SR = 48000
BPM = 98
BEAT = 60 / BPM          # 0.612 s
BAR = 4 * BEAT           # 2.449 s
DUR = 28.0
N = int(DUR * SR)
rng = np.random.default_rng(11)
T_LIFT, T_PALMAS, T_ADELGAZA, T_RESPIRO, T_GOLPE = 9.796, 15.90, 22.40, 22.96, 24.00

NOTA = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def m(nombre):
    p, o = nombre[:-1], int(nombre[-1])
    return 12 * (o + 1) + NOTA[p]


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def t_de(compas, tiempo=0.0):
    return (compas - 1) * BAR + tiempo * BEAT


# (compás, tiempo, duración en tiempos, bajo, voces)
ACORDES = [
    (1, 0, 4, 'D2', ['F#3', 'A3', 'C#4', 'E4']),      # Dmaj9
    (2, 0, 4, 'B1', ['D3', 'F#3', 'A3', 'E4']),       # Bm11
    (3, 0, 4, 'G1', ['B3', 'D4', 'F#4', 'A4']),       # Gmaj9
    (4, 0, 2, 'A1', ['D4', 'E4', 'G4', 'B4']),        # A13sus4
    (4, 2, 2, 'A1', ['C#4', 'E4', 'G4', 'A4']),       # A7
    (5, 0, 4, 'D2', ['F#3', 'A3', 'C#4', 'E4']),      # Dmaj9 (lift)
    (6, 0, 4, 'B1', ['D3', 'F#3', 'A3', 'E4']),
    (7, 0, 4, 'G1', ['B3', 'D4', 'F#4', 'A4']),
    (8, 0, 2, 'A1', ['D4', 'E4', 'G4', 'B4']),
    (8, 2, 2, 'A1', ['C#4', 'E4', 'G4', 'A4']),
    (9, 0, 4, 'D2', ['F#3', 'A3', 'C#4', 'E4']),
    (10, 0, 4, 'B1', ['D3', 'F#3', 'A3', 'E4']),      # se corta en el respiro
]
# Cadencia de la end card (nueva rejilla desde el golpe grave).
FINAL = [(T_GOLPE, 2, 'G1', ['B3', 'D4', 'F#4', 'A4']), (T_GOLPE + 2 * BEAT, 2, 'A1', ['D4', 'E4', 'G4', 'B4']), (T_GOLPE + 4 * BEAT, 6, 'D2', ['F#3', 'A3', 'C#4', 'E4'])]


def render_midi(eventos, programa, ganancia=0.6):
    """eventos: (t0, t1, nota, velocidad). Devuelve estéreo float32 (N, 2)."""
    mid = mido.MidiFile(ticks_per_beat=960)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM)))
    tr.append(mido.Message('program_change', program=programa, channel=0, time=0))
    tr.append(mido.Message('control_change', control=91, value=0, channel=0, time=0))
    tr.append(mido.Message('control_change', control=93, value=0, channel=0, time=0))
    msgs = []
    for t0, t1, n, v in eventos:
        msgs.append((max(0.0, t0), 1, mido.Message('note_on', note=int(n), velocity=int(np.clip(v, 1, 127)), channel=0)))
        msgs.append((t1, 0, mido.Message('note_off', note=int(n), velocity=0, channel=0)))
    msgs.sort(key=lambda x: (x[0], x[1]))
    tick_s = mido.tick2second(1, 960, mido.bpm2tempo(BPM))
    ultimo = 0
    for t, _, msg in msgs:
        tick = int(round(t / tick_s))
        msg.time = max(0, tick - ultimo)
        ultimo = max(ultimo, tick)
        tr.append(msg)
    with tempfile.TemporaryDirectory() as td:
        midp, wavp = Path(td) / 'x.mid', Path(td) / 'x.wav'
        mid.save(midp)
        subprocess.run(['fluidsynth', '-ni', '-q', '-g', str(ganancia), '-r', str(SR), '-R', '0', '-C', '0', '-F', str(wavp), SF2, str(midp)],
                       check=True, capture_output=True)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wavp), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    out = np.zeros((N, 2), dtype=np.float32)
    out[:min(N, len(x))] = x[:N]
    return out


# ---------------- guitarra de nylon: arpegio con bajo en 1 y 3 (desde el compás 2) ----------------
def guitarra():
    ev = []
    for compas, tiempo, tiempos, bajo, voces in ACORDES:
        if compas < 2:
            continue
        t0 = t_de(compas, tiempo)
        notas = [m(v) for v in voces]
        b = m(bajo) + 12
        patron = [b, notas[1], notas[2], notas[3], notas[0], notas[2], notas[1], notas[3]]
        for i in range(int(tiempos * 2)):
            t = t0 + i * BEAT / 2
            if t >= T_RESPIRO - 0.05:
                break
            n = patron[i % len(patron)]
            vel = (60 if i % 4 == 0 else 48) + (6 if compas >= 5 else 0) + rng.integers(-4, 5)
            ev.append((t + rng.normal(0, 0.006), t + BEAT * 1.6, n, vel))
    for t0, tiempos, bajo, voces in FINAL:  # rasgueo suave de la cadencia
        notas = [m(bajo) + 12] + [m(v) for v in voces]
        for k, n in enumerate(notas):
            ev.append((t0 + 0.018 * k, min(DUR, t0 + tiempos * BEAT + 1.5), n, 62 - 3 * k))
    return render_midi(ev, 24, 0.75)


# ---------------- glockenspiel: motivo de 3 notas y notas sueltas; una octava arriba desde el lift ----------------
def glockenspiel():
    ev = []
    motivo = [(0.0, 'A5'), (0.5, 'F#5'), (1.0, 'D6')]
    for t, n in motivo:
        ev.append((t * BEAT, t * BEAT + 1.2, m(n), 70))
    linea = {2: ['E6', 'C#6'], 3: ['D6', 'B5'], 4: ['C#6', 'A5'], 5: ['F#6', 'E6'], 6: ['D6', 'F#6'], 7: ['B5', 'D6'], 8: ['C#6', 'E6'], 9: ['F#6', 'A6'], 10: ['E6', 'D6']}
    for compas, notas in linea.items():
        for k, n in enumerate(notas):
            t = t_de(compas, 1 + 2 * k)
            if t >= T_RESPIRO - 0.05:
                continue
            mi = m(n) + (12 if compas >= 5 and m(n) < m('F#6') else 0)
            ev.append((t, t + 1.0, mi, 58 + (6 if compas >= 5 else 0)))
    ev.append((T_RESPIRO, T_GOLPE + 0.4, m('A5'), 66))  # la nota que queda sola en el respiro
    for t, n in motivo:  # el motivo vuelve en la end card, sobre el Re final
        t0 = FINAL[2][0] + t * BEAT
        ev.append((t0, t0 + 1.4, m(n), 64))
    return render_midi(ev, 9, 0.5)


# ---------------- percusión y capas sintetizadas ----------------
def env(n, a, d):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / max(a, 1e-4))) * np.exp(-t / d)


def ruido_banda(n, lo, hi):
    x = rng.standard_normal(n)
    b, a = signal.butter(2, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def poner(dst, x, t, pan=0.0, g=1.0):
    i = int(round(t * SR))
    if i >= N:
        return
    if i < 0:  # el humanizado puede adelantar el primer golpe antes de 0
        x, i = x[-i:], 0
    x = x[:N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    dst[i:i + len(x), 0] += x * g * l * 1.414
    dst[i:i + len(x), 1] += x * g * r * 1.414


def cuchara(fuerte):
    n = int(0.09 * SR)
    clack = ruido_banda(n, 1800, 7000) * env(n, 0.0004, 0.008)
    t = np.arange(n) / SR
    timbre = np.sin(2 * np.pi * 3150 * t) * env(n, 0.0002, 0.02) * 0.35 + np.sin(2 * np.pi * 4720 * t) * env(n, 0.0002, 0.012) * 0.2
    x = clack + timbre
    if fuerte:  # doble golpe de cucharas (la de arriba y la de abajo)
        x2 = np.zeros(n); d = int(0.022 * SR); x2[d:] = x[:n - d] * 0.7; x = x + x2
    return x * (0.5 if fuerte else 0.28)


def shaker():
    n = int(0.07 * SR)
    return ruido_banda(n, 5200, 14000) * env(n, 0.006, 0.02) * 0.14


def palma():
    n = int(0.25 * SR)
    x = np.zeros(n)
    for k, d in enumerate([0, 0.008, 0.017]):
        i = int(d * SR)
        x[i:] += ruido_banda(n - i, 900, 4200) * env(n - i, 0.0005, 0.012) * (1 - 0.25 * k)
    x += ruido_banda(n, 700, 3000) * env(n, 0.003, 0.09) * 0.25  # cola de cuarto
    return x * 0.22


def bombo(f0=58, f1=42, d=0.42, g=0.9):
    n = int((d + 0.2) * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.05)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, d * 0.45)
    x += ruido_banda(n, 200, 1800) * env(n, 0.0005, 0.01) * 0.25  # fieltro
    return x * g


def bajo_calido(nota, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(nota)
    x = np.sin(2 * np.pi * f * t) + 0.32 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    e = env(n, 0.012, dur * 0.7) * (1 - np.clip((t - (dur - 0.08)) / 0.08, 0, 1))
    b, a = signal.butter(2, 900 / (SR / 2), 'low')
    return signal.lfilter(b, a, x * e) * 0.32


def riser(t0, t1):
    n = int((t1 - t0) * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    tramos = 24
    for k in range(tramos):
        a, b = k * n // tramos, (k + 1) * n // tramos
        fc = 400 + 5200 * (k / tramos) ** 1.6
        bb, aa = signal.butter(2, [fc / (SR / 2), min(fc * 1.8, 20000) / (SR / 2)], 'band')
        out[a:b] = signal.lfilter(bb, aa, x[a:b])
    e = np.linspace(0, 1, n) ** 2.2
    return out * e * 0.16


def brillo(t):
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) for f, d in [(5274, 0.5), (6645, 0.35), (7902, 0.25)])
    return x * env(n, 0.003, 0.6) * 0.035


def kpond(x):
    """Aproximación al filtro K (BS.1770) para medir capas."""
    b1, a1 = signal.butter(2, 60 / (SR / 2), 'high')
    y = signal.lfilter(b1, a1, x, axis=0)
    b2, a2 = signal.butter(1, 1500 / (SR / 2), 'high')
    return y + 0.585 * signal.lfilter(b2, a2, y, axis=0)


def sonoridad(x, t0, t1):
    s = kpond(x[int(t0 * SR):int(t1 * SR)])
    return 10 * np.log10((s ** 2).mean(axis=0).sum() + 1e-12) - 0.691


def capas():
    C = {k: np.zeros((N, 2)) for k in ['guitarra', 'glock', 'cucharas', 'shaker', 'bajo', 'palmas', 'golpes']}
    C['guitarra'] += guitarra()
    C['glock'] += glockenspiel()
    # cucharas: corcheas, dobles en 2 y 4 (desde f0 hasta el respiro); se apagan del 22.40 al respiro
    for k in range(int(T_RESPIRO / (BEAT / 2)) + 1):
        t = k * BEAT / 2
        if t >= T_RESPIRO:
            break
        fuerte = k % 4 == 2
        g = 1.0 if t < T_ADELGAZA else max(0.0, 1 - (t - T_ADELGAZA) / (T_RESPIRO - T_ADELGAZA))
        poner(C['cucharas'], cuchara(fuerte), t + rng.normal(0, 0.003), pan=-0.25 if k % 2 else 0.2, g=g)
    # shaker desde el compás 3 (catálogo)
    for k in range(int((T_RESPIRO - t_de(3)) / (BEAT / 4)) + 1):
        t = t_de(3) + k * BEAT / 4
        if t >= T_ADELGAZA:
            break
        poner(C['shaker'], shaker(), t + rng.normal(0, 0.002), pan=0.45, g=1.0 if k % 2 == 0 else 0.55)
    # bajo cálido desde el lift (blancas en 1 y 3)
    for compas, tiempo, tiempos, bajo, _ in ACORDES:
        t0 = t_de(compas, tiempo)
        if t0 < T_LIFT - 0.01:
            continue
        for b in range(0, int(tiempos), 2):
            t = t0 + b * BEAT
            if t >= T_RESPIRO - 0.05:
                break
            g = 1.0 if t < T_ADELGAZA else 0.5
            poner(C['bajo'], bajo_calido(m(bajo), min(2 * BEAT, T_RESPIRO - t)), t, g=g)
    # bajo de la cadencia final
    poner(C['bajo'], bajo_calido(m('G1'), 2 * BEAT), T_GOLPE, g=1.2)
    poner(C['bajo'], bajo_calido(m('A1'), 2 * BEAT), T_GOLPE + 2 * BEAT, g=1.1)
    poner(C['bajo'], bajo_calido(m('D2'), DUR - (T_GOLPE + 4 * BEAT)), T_GOLPE + 4 * BEAT, g=1.0)
    # palmas suaves en 2 y 4 desde el pedido
    k = 0
    while True:
        t = (2 * k + 1) * BEAT
        k += 1
        if t >= T_ADELGAZA:
            break
        if t >= T_PALMAS:
            poner(C['palmas'], palma(), t, pan=-0.1)
    # golpe suave en f0, riser y brillo del lift, golpe grave del cierre
    poner(C['golpes'], bombo(60, 44, 0.45, 0.5), 0.004)  # golpe suave: no debe llegar al limitador
    poner(C['golpes'], riser(T_LIFT - 0.7, T_LIFT), T_LIFT - 0.7)
    poner(C['golpes'], brillo(T_LIFT), T_LIFT)
    poner(C['golpes'], bombo(52, 34, 0.9, 1.25), T_GOLPE)
    return C


# Ganancias de cada capa (dB). Intro ≈ 4 dB por debajo de la sección completa: el lift suma, no salta.
GANANCIA = {'guitarra': 0.0, 'glock': 8.0, 'cucharas': -6.5, 'shaker': -4.0, 'bajo': -12.5, 'palmas': 5.0, 'golpes': -2.0}


def main():
    import sys
    C = capas()
    if '--capas' in sys.argv:
        for k, x in C.items():
            print(f"{k:9s} intro {sonoridad(x, 0.2, 9.7):6.1f}  medio {sonoridad(x, 9.9, 22.3):6.1f}  final {sonoridad(x, 24.0, 27.5):6.1f}")
    mus = sum(C[k] * 10 ** (GANANCIA[k] / 20) for k in C)
    # final: desvanecer los últimos 0.35 s
    n0 = int((DUR - 0.35) * SR)
    mus[n0:] *= np.linspace(1, 0, N - n0)[:, None]
    # reverb corta de cuarto (convolución con ruido decreciente), mezcla 14 %
    ir_n = int(1.1 * SR)
    ir = rng.standard_normal((ir_n, 2)) * np.exp(-np.arange(ir_n) / SR / 0.32)[:, None]
    b, a = signal.butter(1, 5000 / (SR / 2), 'low')
    ir = signal.lfilter(b, a, ir, axis=0)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    rev = np.stack([signal.fftconvolve(mus[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
    mus = mus * 0.86 + rev * 0.14
    # Sonoridad del stem: −20 LUFS en la sección completa (la mezcla lo baja bajo la voz).
    mus *= 10 ** ((-20 - sonoridad(mus, 9.9, 22.3)) / 20)
    pico = np.abs(mus).max()
    if pico > 0.89:
        mus *= 0.89 / pico
    print(f"sonoridad intro {sonoridad(mus, 0.2, 9.7):.1f} · medio {sonoridad(mus, 9.9, 22.3):.1f} · final {sonoridad(mus, 24.0, 27.5):.1f} · pico {20*np.log10(np.abs(mus).max()):.1f} dBFS")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(OUT / 'musica_stem.wav')],
                   input=mus.astype(np.float32).tobytes(), check=True)
    print('✔ audio/build/musica_stem.wav')


if __name__ == '__main__':
    main()
