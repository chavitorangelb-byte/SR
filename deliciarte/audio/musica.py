#!/usr/bin/env python3
"""Música original en código para el video de DeliciArte (120 BPM, La bemol mayor, 18 s).

- Piano suave, celesta, pizzicato y cuerdas: compuestos aquí y tocados con FluidR3 GM (licencia MIT) vía FluidSynth.
- Bombo de fieltro, bajo cálido, shaker, riser, sub del golpe inicial y golpe grave: sintetizados aquí.
- Una capa nueva por sección: piano + celesta (0 s), pizzicato (2 s), lift en 3.00 s, cuerdas y bombo (4 s),
  bajo (6 s), shaker (8 s), contramelodía de celesta (10 s), pulsos del botón (12.5 / 13 / 13.5 s),
  respiro (14–16 s) y golpe grave en 16.00 s con cola hasta el final.

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
TL = json.loads((ROOT / 'brief' / 'timeline.json').read_text())
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
SR = 48000
BPM = TL['bpm']
BEAT = 60 / BPM          # 0.5 s
BAR = 4 * BEAT           # 2.0 s
FPS = TL['fps']
DUR = TL['frames'] / FPS  # 18 s
N = int(DUR * SR)
rng = np.random.default_rng(23)
EV = TL['ev']
T_LIFT = 3.0
T_GOLPE = TL['end'] / FPS  # 16.5
T_RESPIRO = T_GOLPE - 1.5
KICK_ON = (4.0, T_RESPIRO)
STAMPS = [f / FPS for f in EV['tarjeta']]
PULSOS = [f / FPS for f in EV['pulsos']]

NOTE = {n: i for i, n in enumerate(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'])}


def m(name):
    p, o = name[:-1], int(name[-1])
    return 12 * (o + 1) + NOTE[p]


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# (compás, tiempo inicial, duración en tiempos, bajo, voces)
ACORDES = [
    (1, 0, 4, 'Ab2', ['C4', 'Eb4', 'G4', 'Bb4']),        # A♭maj9
    (2, 0, 4, 'F2', ['Ab3', 'C4', 'Eb4', 'G4']),         # Fm9
    (3, 0, 4, 'Db2', ['F3', 'Ab3', 'C4', 'Eb4']),        # D♭maj9 (sin 9 en el grave)
    (4, 0, 2, 'Eb2', ['Ab3', 'Bb3', 'Eb4']),             # E♭sus4
    (4, 2, 2, 'Eb2', ['G3', 'Bb3', 'Eb4']),              # E♭
    (5, 0, 4, 'C2', ['Ab3', 'Eb4', 'G4', 'C5']),         # A♭/C
    (6, 0, 4, 'Db2', ['F3', 'Ab3', 'C4', 'F4']),         # D♭maj7
    (7, 0, 2, 'Bb1', ['Db4', 'F4', 'Ab4', 'C5']),        # B♭m9
    (7, 2, 2, 'Eb2', ['Db4', 'F4', 'G4', 'Bb4']),        # E♭9
    (8, 0, 5, 'F2', ['Ab3', 'C4', 'Eb4', 'G4']),         # Fm9 (respiro)
    (9, 0, 4, 'Ab1', ['Ab3', 'C4', 'Eb4', 'Bb4']),       # A♭add9 (golpe grave y cola)
]


def t_of(bar, beat):
    return (bar - 1) * BAR + beat * BEAT


def render_midi(events, program, gain=0.6):
    """events: lista de (t0, t1, nota, velocidad). Devuelve estéreo float32 (N, 2)."""
    mid = mido.MidiFile(ticks_per_beat=960)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM)))
    tr.append(mido.Message('program_change', program=program, channel=0, time=0))
    tr.append(mido.Message('control_change', control=91, value=0, channel=0, time=0))
    tr.append(mido.Message('control_change', control=93, value=0, channel=0, time=0))
    msgs = []
    for t0, t1, n, v in events:
        msgs.append((max(0.0, t0), 1, mido.Message('note_on', note=int(n), velocity=int(np.clip(v, 1, 127)), channel=0)))
        msgs.append((t1, 0, mido.Message('note_off', note=int(n), velocity=0, channel=0)))
    msgs.sort(key=lambda x: (x[0], x[1]))
    tick_s = mido.tick2second(1, 960, mido.bpm2tempo(BPM))
    last = 0
    for t, _, msg in msgs:
        tick = int(round(t / tick_s))
        msg.time = max(0, tick - last)
        last = max(last, tick)
        tr.append(msg)
    with tempfile.TemporaryDirectory() as td:
        midp, wavp = Path(td) / 'x.mid', Path(td) / 'x.wav'
        mid.save(midp)
        subprocess.run(['fluidsynth', '-ni', '-q', '-g', str(gain), '-r', str(SR), '-R', '0', '-C', '0',
                        '-F', str(wavp), SF2, str(midp)], check=True, capture_output=True)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wavp), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    out = np.zeros((N, 2), dtype=np.float32)
    out[:min(N, len(x))] = x[:N]
    return out


def piano():
    ev = []
    for bar, beat, beats, bass, voces in ACORDES:
        t0 = t_of(bar, beat)
        notes = [m(v) for v in voces]
        if bar == 9:
            ev += [(T_GOLPE, DUR, m('Ab1'), 96), (T_GOLPE, DUR, m('Ab2'), 86)]
            ev += [(T_GOLPE + 0.025 * i, DUR, n, 64) for i, n in enumerate(notes)]
            continue
        if bar == 8:
            # el compás 8 sigue con su pulsación hasta el respiro, donde quedan tres notas
            for i in range(int((T_RESPIRO - t0) / (BEAT / 2))):
                t = t0 + i * BEAT / 2
                ev.append((t + rng.normal(0, 0.004), t + BEAT * 0.45, notes[[0, 2, 1, 3][i % 4]], 50 + rng.integers(-3, 4)))
            ev += [(T_RESPIRO, T_GOLPE + 0.2, m('Eb5'), 40), (T_RESPIRO + 0.5, T_GOLPE + 0.2, m('Bb4'), 34), (T_RESPIRO + 1.0, T_GOLPE + 0.2, m('C5'), 30)]
            continue
        lh = m(bass) + 12
        ev.append((t0, t0 + beats * BEAT * 0.98, lh, 48 if bar < 3 else 56))
        pattern = [0, 2, 1, 3, 2, 1, 3, 2] if len(notes) >= 4 else [0, 2, 1, 2, 0, 2, 1, 2]
        for i in range(beats * 2):
            t = t0 + i * BEAT / 2
            n = notes[pattern[i % len(pattern)] % len(notes)]
            vel = 42 + (8 if i % 2 == 0 else 0) + (6 if bar >= 3 else 0)
            ev.append((t + rng.normal(0, 0.004), t + BEAT * 0.45, n, vel + rng.integers(-3, 4)))
    # golpe inicial: La bemol grave en octavas
    ev += [(0.0, 1.8, m('Ab1'), 84), (0.0, 1.8, m('Ab2'), 70)]
    return render_midi(ev, program=0, gain=0.55)


def celesta():
    ev = []
    motivo1 = [(0.0, 'Eb5'), (0.25, 'G5'), (0.5, 'Bb5'), (1.0, 'Ab5'), (1.5, 'Eb5'), (2.0, 'C6'), (2.5, 'Bb5'), (3.0, 'G5')]
    for b, n in motivo1:
        t = 0.5 + b * BEAT  # entra con "Sabor"
        ev.append((t, t + 0.6, m(n), 58))
    contra = [(0, 'C6'), (0.5, 'Bb5'), (1, 'Ab5'), (1.5, 'Eb5'), (2, 'F5'), (2.5, 'Ab5'), (3, 'C6'), (3.5, 'Eb6')]
    for b, n in contra:
        t = t_of(6, b)
        ev.append((t, t + 0.5, m(n), 54))
    # destello en la revelación del celular
    ev += [(T_LIFT + 0.02 * i, T_LIFT + 1.2, m(n), 50) for i, n in enumerate(['Ab5', 'C6', 'Eb6'])]
    return render_midi(ev, program=8, gain=0.5)


def pizzicato():
    ev = []
    motivo = [(0, 0), (1, 2), (1.5, 1), (2, 3), (3, 2)]
    for bar, beat, beats, bass, voces in ACORDES:
        if bar < 2 or bar >= 8:
            continue
        notes = sorted(m(v) for v in voces)
        top = [n + 12 for n in notes[-3:]] + [notes[-1]]
        for tb, idx in motivo:
            if tb >= beats:
                continue
            t = t_of(bar, beat + tb)
            ev.append((t, t + 0.22, top[idx % len(top)], 58 if bar < 5 else 64))
    return render_midi(ev, program=45, gain=0.5)


def cuerdas():
    ev = []
    for bar, beat, beats, bass, voces in ACORDES:
        t0 = t_of(bar, beat)
        t1 = t0 + beats * BEAT
        if t1 <= T_LIFT or t0 >= T_RESPIRO:
            continue
        t0 = max(t0, T_LIFT)
        t1 = min(t1, T_RESPIRO + 0.2)
        vel = 50 if bar < 5 else 62
        ev += [(t0, t1, m(v) - 12, vel) for v in voces] + [(t0, t1, m(bass) + 24, vel - 6)]
    ev += [(T_GOLPE, DUR, m(v) - 12, 56) for v in ['Ab3', 'C4', 'Eb4']]
    return render_midi(ev, program=48, gain=0.42)


def env_adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.ones(n) * s
    e[:a] = np.linspace(0, 1, a, endpoint=False) if a else e[:a]
    e[a:a + d] = np.linspace(1, s, max(0, min(d, n - a)), endpoint=False)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def bajo():
    out = np.zeros(N)
    for bar, beat, beats, bass, voces in ACORDES:
        if bar < 4 or bar >= 8:
            continue
        for b in range(0, beats, 2):
            t = t_of(bar, beat + b)
            dur = 2 * BEAT * 0.95
            n = int(dur * SR)
            tt = np.arange(n) / SR
            f = hz(m(bass) + (12 if m(bass) < m('C2') else 0))
            x = np.sin(2 * np.pi * f * tt) + 0.22 * np.sin(2 * np.pi * 2 * f * tt) + 0.06 * np.sin(2 * np.pi * 3 * f * tt)
            x = np.tanh(1.1 * x) * env_adsr(n, 0.03, 0.3, 0.7, 0.12)
            i0 = int(t * SR)
            out[i0:i0 + n] += x[: N - i0] * 0.24
    b, a = signal.butter(2, 300 / (SR / 2), 'low')
    out = signal.lfilter(b, a, out)
    return np.stack([out, out], axis=1)


def bombo():
    """Bombo de fieltro en cada tiempo de 4 a 14 s; más presente en los estampados y en los pulsos del botón."""
    out = np.zeros(N)
    n = int(0.42 * SR)
    tt = np.arange(n) / SR
    f = 50 + 46 * np.exp(-tt * 30)
    k = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 10)
    clk = np.zeros(n)
    c = rng.standard_normal(int(0.004 * SR)) * np.hanning(int(0.004 * SR))
    b, a = signal.butter(2, [1200 / (SR / 2), 5000 / (SR / 2)], 'band')
    clk[:len(c)] = signal.lfilter(b, a, c) * 0.25
    k = k + clk
    t = KICK_ON[0]
    while t < KICK_ON[1] - 1e-6:
        g = 0.55
        if any(abs(t - s) < 0.01 for s in STAMPS + PULSOS):
            g = 1.0
        elif t >= 12.0:
            g = 0.62
        i0 = int(t * SR)
        out[i0:i0 + n] += k[: N - i0] * g
        t += BEAT
    return np.stack([out, out], axis=1)


def shaker():
    out = np.zeros((N, 2))
    t, k = 8.0, 0
    acc = [0.55, 0.28, 1.0, 0.32]
    b, a = signal.butter(2, [4200 / (SR / 2), 11000 / (SR / 2)], 'band')
    while t < T_RESPIRO:
        n = int(0.06 * SR)
        nz = rng.standard_normal(n)
        e = np.exp(-np.arange(n) / (0.011 * SR)) * (1 - np.exp(-np.arange(n) / (0.0015 * SR)))
        x = signal.lfilter(b, a, nz * e) * acc[k % 4] * (0.9 + 0.2 * rng.random())
        i0 = int((t + rng.normal(0, 0.003)) * SR)
        out[i0:i0 + n, 0] += x * 0.06 * 0.75
        out[i0:i0 + n, 1] += x * 0.06
        t += BEAT / 4
        k += 1
    return out


def golpes():
    out = np.zeros(N)
    # sub del golpe inicial (f0)
    n = int(1.4 * SR)
    tt = np.arange(n) / SR
    f = 40 + 34 * np.exp(-tt * 14)
    out[:n] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2) * 0.9
    # riser hacia el lift (2.2 → 3.0)
    t0, t1 = 2.2, T_LIFT
    n = int((t1 - t0) * SR)
    tt = np.arange(n) / SR
    u = tt / (t1 - t0)
    nz = rng.standard_normal(n)
    b, a = signal.butter(2, 2500 / (SR / 2), 'high')
    sw = np.sin(2 * np.pi * np.cumsum(300 + 1100 * u ** 2) / SR) * 0.15
    out[int(t0 * SR):int(t0 * SR) + n] += (signal.lfilter(b, a, nz) * 0.12 + sw) * u ** 2.2
    # golpe grave en 16.00: sub con caída de tono
    n = int(2.2 * SR)
    tt = np.arange(n) / SR
    f = 36 + 24 * np.exp(-tt * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.3) * 0.9
    i0 = int(T_GOLPE * SR)
    out[i0:i0 + n] += sub[: N - i0]
    return np.stack([out, out], axis=1)


def reverb_ir(sec=2.2, pre=0.018):
    n = int(sec * SR)
    tt = np.arange(n) / SR
    ir = np.zeros((n + int(pre * SR), 2))
    for c in range(2):
        x = rng.standard_normal(n) * np.exp(-tt * 6.9 / sec)
        b, a = signal.butter(1, 6500 / (SR / 2), 'low')
        ir[int(pre * SR):, c] = signal.lfilter(b, a, x)
    return ir / np.sqrt((ir ** 2).sum(axis=0))


def con_reverb(x, mezcla):
    ir = reverb_ir()
    wet = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
    return x + wet * mezcla


def nivel(x, objetivo_db, modo='rms'):
    mono = np.abs(x).max(axis=1)
    if modo == 'pico':
        ref = mono.max()
    else:
        act = np.sqrt((x ** 2).mean(axis=1))
        thr = act.max() * 0.05
        sel = x[mono > thr]
        ref = np.sqrt((sel ** 2).mean()) if len(sel) else 1e-9
    return x * (10 ** (objetivo_db / 20) / max(ref, 1e-9))


def main():
    t = np.arange(N) / SR
    # en el respiro todo se corta salvo las notas que quedan, y regresa con el golpe
    corte = np.where(t < T_RESPIRO, 1.0, np.where(t < T_GOLPE, np.exp(-(t - T_RESPIRO) / 0.09), 1.0))[:, None]
    p = nivel(piano(), -25)
    ce = nivel(celesta(), -29)
    z = nivel(pizzicato(), -30) * corte
    s = nivel(cuerdas(), -29)
    b = nivel(bajo(), -31) * corte
    k = nivel(bombo(), -15, 'pico') * corte
    sh = nivel(shaker(), -37) * corte
    g = golpes()
    g0 = g.copy(); g0[int(1.6 * SR):] = 0
    g1 = g.copy(); g1[:int(2.0 * SR)] = 0; g1[int(T_LIFT * SR):] = 0
    g2 = g.copy(); g2[:int(T_GOLPE * SR)] = 0
    g = nivel(g0, -12, 'pico') + nivel(g1, -22, 'pico') + nivel(g2, -11, 'pico')
    mezcla = con_reverb(p + ce + z + s + b + sh, 0.22) + k + g
    bh, ah = signal.butter(2, 30 / (SR / 2), 'high')
    mezcla = signal.lfilter(bh, ah, mezcla, axis=0)
    mezcla *= np.clip(t / 0.004, 0, 1)[:, None] * np.clip((DUR - t) / 0.5, 0, 1)[:, None]
    out = OUT / 'musica_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(out)],
                   input=mezcla.astype(np.float32).tobytes(), check=True)
    print(out, f'pico {20 * np.log10(np.abs(mezcla).max()):.1f} dBFS')


if __name__ == '__main__':
    main()
