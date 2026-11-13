#!/usr/bin/env python3
"""Música original en código para Maison Rose: 120 BPM, Sol mayor, 23 s. Aire de café parisino.

- Acordeón, celesta, contrabajo y escobillas: compuestos aquí y tocados con FluidR3 GM (licencia MIT) vía FluidSynth.
- Sub del primer tiempo, subida antes del lift y golpe grave del end card: sintetizados aquí.
- Una capa nueva por sección; lift en 3.0 s, respiro en 17.0 s, golpe grave en 20.0 s.

Salida: audio/build/musica_stem.wav (48 kHz estéreo, sin ducking).
Requiere: numpy, scipy, mido, fluidsynth y /usr/share/sounds/sf2/FluidR3_GM.sf2.
"""
import json
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
TL = json.loads((ROOT / 'brief' / 'timeline.json').read_text())
SR, BPM = 48000, 120
BEAT = 60 / BPM
DUR = TL['frames'] / TL['fps']
N = int(DUR * SR)
rng = np.random.default_rng(5)
B_LIFT, B_RESPIRO, B_GOLPE = 6, 34, 40          # en tiempos (0.5 s cada uno)
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def m(name):
    return 12 * (int(name[-1]) + 1) + NOTE[name[:-1]]


# (tiempo inicial, tiempos, bajo, quinta del bajo, voces del acorde)
ACORDES = [
    (0, 4, 'G2', 'D3', ['B3', 'D4', 'E4']),        # G6
    (4, 4, 'E2', 'B2', ['G3', 'B3', 'D4']),        # Em7
    (8, 4, 'A2', 'E3', ['G3', 'C4', 'E4']),        # Am7
    (12, 4, 'D2', 'A2', ['F#3', 'A3', 'C4']),      # D7
    (16, 4, 'G2', 'D3', ['F#3', 'B3', 'D4']),      # Gmaj7
    (20, 2, 'B1', 'F#2', ['A3', 'D#4', 'F#4']),    # B7
    (22, 2, 'E2', 'B2', ['G3', 'B3', 'E4']),       # Em
    (24, 4, 'A2', 'E3', ['G3', 'C4', 'E4']),       # Am7
    (28, 4, 'D2', 'A2', ['F#3', 'C4', 'E4']),      # D9
    (32, 2, 'G2', 'D3', ['F#3', 'B3', 'D4']),      # Gmaj7
    (34, 4, 'G2', 'D3', ['B3', 'D4', 'E4']),       # respiro: G6
    (38, 2, 'D2', 'A2', ['G3', 'C4', 'D4']),       # D7sus
]
# melodía del acordeón: (tiempo, tiempos, nota)
MELODIA = [(6, 1, 'D5'), (7, 1, 'G5'), (8, 1.5, 'B5'), (9.5, .5, 'A5'), (10, 1, 'G5'), (11, 1, 'E5'), (12, 1.5, 'F#5'), (13.5, .5, 'E5'), (14, 2, 'D5'),
           (16, 1, 'B4'), (17, 1, 'D5'), (18, 1.5, 'G5'), (19.5, .5, 'F#5'), (20, 1, 'D#5'), (21, 1, 'F#5'), (22, 2, 'E5'),
           (24, 1, 'C5'), (25, 1, 'E5'), (26, 1.5, 'A5'), (27.5, .5, 'G5'), (28, 1, 'F#5'), (29, 1, 'A5'), (30, 2, 'D5'), (32, 2, 'G5')]


def render_midi(events, program, gain=0.6, channel=0):
    """events: (t0, t1, nota, velocidad) en segundos. Devuelve estéreo (N, 2)."""
    mid = mido.MidiFile(ticks_per_beat=960)
    tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM)))
    tr.append(mido.Message('program_change', program=program, channel=channel, time=0))
    msgs = []
    for t0, t1, n, v in events:
        msgs.append((max(0, t0), 1, mido.Message('note_on', note=n, velocity=int(np.clip(v, 1, 127)), channel=channel)))
        msgs.append((max(0.01, t1), 0, mido.Message('note_off', note=n, velocity=0, channel=channel)))
    msgs.sort(key=lambda x: (x[0], x[1]))
    tick_s = mido.tick2second(1, 960, mido.bpm2tempo(BPM)); last = 0
    for t, _, msg in msgs:
        tick = int(round(t / tick_s)); msg.time = max(0, tick - last); last = max(last, tick); tr.append(msg)
    with tempfile.TemporaryDirectory() as td:
        midp, wavp = Path(td) / 'x.mid', Path(td) / 'x.wav'
        mid.save(midp)
        subprocess.run(['fluidsynth', '-ni', '-q', '-g', str(gain), '-r', str(SR), '-R', '0', '-C', '0', '-F', str(wavp), SF2, str(midp)], check=True, capture_output=True)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wavp), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    out = np.zeros((N, 2), dtype=np.float32); out[:min(N, len(x))] = x[:N]
    return out


def contrabajo():
    ev = []
    for b0, n, bajo, quinta, _ in ACORDES:
        for k in range(0, n, 2):
            b = b0 + k
            nota = m(bajo) if (k // 2) % 2 == 0 else m(quinta)
            ev.append((b * BEAT, (b + 1.6) * BEAT, nota, 92 if b < B_RESPIRO else 70))
            if B_LIFT <= b < B_RESPIRO and k + 1.5 < n + 0.6:      # nota de paso antes del siguiente tiempo fuerte
                ev.append(((b + 1.5) * BEAT, (b + 1.95) * BEAT, nota + (2 if rng.random() < 0.5 else -1), 62))
    ev.append((B_GOLPE * BEAT, DUR, m('G1'), 110)); ev.append((B_GOLPE * BEAT, DUR, m('G2'), 96))
    return render_midi(ev, 32, 0.7)


def acordeon():
    comp, mel, pad = [], [], []
    for b0, n, _, _, voces in ACORDES:
        if b0 + n <= B_LIFT or b0 >= B_RESPIRO:
            continue
        notas = [m(v) for v in voces]
        for k in range(n):                                    # "pah" a contratiempo: tiempos 2 y 4
            b = b0 + k
            if b >= B_LIFT and b % 2 == 1:
                comp += [(b * BEAT + rng.normal(0, 0.004), (b + 0.42) * BEAT, x, 58 + (8 if 18 <= b < 24 else 0)) for x in notas]
        if 18 <= b0 < 24 or (b0 <= 18 < b0 + n):              # acordeón completo de 9 a 12 s
            a, z = max(b0, 18), min(b0 + n, 24)
            pad += [(a * BEAT, z * BEAT, x + 12, 44) for x in notas[1:]]
    for b, n, nota in MELODIA:
        mel.append((b * BEAT + rng.normal(0, 0.005), (b + n * 0.94) * BEAT, m(nota), 78 if b < 16 else 86))
    return render_midi(comp, 21, 0.5), render_midi(mel, 21, 0.6), render_midi(pad, 21, 0.4)


def celesta():
    ev = [(b * BEAT, (b + 2) * BEAT, m(n), 70) for b, n in [(4, 'G5'), (4.5, 'B5'), (5, 'D6'), (5.5, 'G6')]]      # motivo de la revelación
    for b0, n, _, _, voces in ACORDES:                        # segunda voz desde los 6 s: arpegio a contratiempo
        if b0 < 12 or b0 >= B_RESPIRO:
            continue
        notas = [m(v) + 24 for v in voces]
        for k in range(n * 2):
            if k % 2 == 1:
                ev.append(((b0 + k / 2) * BEAT, (b0 + k / 2 + 0.9) * BEAT, notas[(k // 2) % 3], 46 + (10 if b0 >= 24 else 0)))
    for i, w in enumerate(v for v in TL['voz'] if v['id'] == 'L5'):   # una nota por cada pastel
        for j, k in enumerate([0, 2, 3]):
            t = w['palabras'][k]['f'] / TL['fps']
            ev += [(t, t + 1.6, m(x), 84) for x in [['E6', 'A6'], ['F#6', 'A6'], ['G6', 'B6']][j]]
    arp = ['G5', 'B5', 'D6', 'E6', 'G6', 'E6', 'D6', 'B5', 'G5', 'C6', 'D6', 'G6']
    for i, n in enumerate(arp):                               # respiro
        b = B_RESPIRO + i * 0.5
        ev.append((b * BEAT, (b + 3) * BEAT, m(n), 60))
    ev += [(B_GOLPE * BEAT + 0.03 * i, DUR, m(n), 74) for i, n in enumerate(['G4', 'B4', 'D5', 'E5', 'G5', 'D6'])]   # acorde final
    return render_midi(ev, 8, 0.7)


def escobillas():
    """Caja con escobilla en 2 y 4, platillo cerrado suave en corcheas y bombo; canal de percusión, kit de escobillas."""
    ev = []
    for b in range(B_LIFT, B_RESPIRO):
        t = b * BEAT
        if b % 2 == 1:
            ev.append((t, t + 0.1, 38, 62 + (10 if b >= 30 else 0)))
        ev.append((t, t + 0.05, 42, 40)); ev.append((t + BEAT / 2 + rng.normal(0, 0.004), t + BEAT / 2 + 0.05, 42, 28))
        if b % 2 == 0:
            ev.append((t, t + 0.1, 36, 58 if b < 30 else 96))    # bombo marcado de 15 a 17 s (mueve el subrayado)
    x = render_midi(ev, 40, 0.7, channel=9)
    # barrido de escobilla: ruido filtrado que respira con el compás
    t = np.arange(N) / SR
    nz = rng.standard_normal(N)
    b, a = signal.butter(2, [2500 / (SR / 2), 9000 / (SR / 2)], 'band')
    sw = signal.lfilter(b, a, nz) * (0.55 + 0.45 * np.sin(2 * np.pi * t / BEAT - 1.2)) ** 2
    sw *= ((t >= B_LIFT * BEAT) & (t < B_RESPIRO * BEAT)) * 0.012
    return x + np.stack([sw, sw * 0.8], axis=1)


def golpes():
    out = np.zeros(N)
    n = int(0.9 * SR); tt = np.arange(n) / SR                         # sub del primer tiempo
    out[:n] += np.sin(2 * np.pi * np.cumsum(46 + 44 * np.exp(-tt * 26)) / SR) * np.exp(-tt * 5) * 0.8
    t0, t1 = 2.2, B_LIFT * BEAT                                       # subida antes del lift
    n = int((t1 - t0) * SR); u = np.arange(n) / n
    b, a = signal.butter(2, 2500 / (SR / 2), 'high')
    out[int(t0 * SR):int(t0 * SR) + n] += (signal.lfilter(b, a, rng.standard_normal(n)) * 0.1 + np.sin(2 * np.pi * np.cumsum(300 + 900 * u ** 2) / SR) * 0.1) * u ** 2.2
    n = int(3.0 * SR); tt = np.arange(n) / SR                         # golpe grave del end card
    i0 = int(B_GOLPE * BEAT * SR)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 24 * np.exp(-tt * 6)) / SR) * np.exp(-tt * 1.4)
    out[i0:i0 + n] += sub[: N - i0]
    return np.stack([out, out], axis=1)


def reverb(x, mezcla, sec=1.8):
    n = int(sec * SR); tt = np.arange(n) / SR
    ir = np.zeros((n + int(0.018 * SR), 2))
    b, a = signal.butter(1, 6000 / (SR / 2), 'low')
    for c in range(2):
        ir[int(0.018 * SR):, c] = signal.lfilter(b, a, rng.standard_normal(n) * np.exp(-tt * 6.9 / sec))
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    return x + np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:N] for c in range(2)], axis=1) * mezcla


def nivel(x, db):
    """Lleva una capa a su nivel RMS (parte activa) en dBFS."""
    mono = np.abs(x).max(axis=1); sel = x[mono > mono.max() * 0.05]
    return x * (10 ** (db / 20) / max(np.sqrt((sel ** 2).mean()), 1e-9))


def main():
    comp, mel, pad = acordeon()
    mezcla = reverb(nivel(comp, -30) + nivel(mel, -25) + nivel(pad, -33) + nivel(celesta(), -27) + nivel(escobillas(), -30), 0.22)
    mezcla += nivel(contrabajo(), -24)
    g = golpes()
    mezcla += g * (10 ** (-11 / 20) / np.abs(g).max())
    t = np.arange(N) / SR
    b, a = signal.butter(2, 32 / (SR / 2), 'high')
    mezcla = signal.lfilter(b, a, mezcla, axis=0) * np.clip((DUR - t) / 0.7, 0, 1)[:, None]
    out = OUT / 'musica_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(out)], input=mezcla.astype(np.float32).tobytes(), check=True)
    print(out, f'pico {20 * np.log10(np.abs(mezcla).max()):.1f} dBFS')


if __name__ == '__main__':
    main()
