#!/usr/bin/env python3
"""Música original en código para el video de Florería Roma (100 BPM, Fa mayor, 28 s).

- Piano con pulsación ligera, pizzicato y cuerdas: compuestos aquí y tocados con FluidR3 GM (licencia MIT) vía FluidSynth.
- Shaker, bajo cálido, golpe suave, riser del lift y golpe grave: sintetizados aquí.
- Estructura amarrada a brief/timeline.json: una capa nueva por sección, lift en 19.20, respiro en 23.00, golpe grave en 24.00.

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
BPM = 100
BEAT = 60 / BPM          # 0.6 s
BAR = 4 * BEAT           # 2.4 s
DUR = 28.0
N = int(DUR * SR)
rng = np.random.default_rng(7)

NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])}


def m(name):
    """'F3' → número MIDI."""
    p, o = name[:-1], int(name[-1])
    return 12 * (o + 1) + NOTE[p]


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# ---------------- armonía (un acorde por medio compás cuando hay flecha) ----------------
# (compás, tiempo inicial, duración en tiempos, bajo, voces)
ACORDES = [
    (1, 0, 4, 'F2', ['A3', 'C4', 'E4', 'G4']),             # Fmaj9
    (2, 0, 4, 'D2', ['F3', 'A3', 'C4', 'E4']),             # Dm9
    (3, 0, 4, 'Bb1', ['D4', 'F4', 'A4', 'C5']),            # B♭maj9
    (4, 0, 2, 'C2', ['F4', 'A4', 'D5']),                   # C6sus4
    (4, 2, 2, 'C2', ['E4', 'G4', 'C5']),                   # C
    (5, 0, 4, 'A1', ['F3', 'C4', 'E4', 'A4']),             # Fmaj7/A
    (6, 0, 4, 'Bb1', ['F3', 'A3', 'D4', 'F4']),            # B♭maj7
    (7, 0, 2, 'G1', ['Bb3', 'D4', 'F4', 'A4']),            # Gm9
    (7, 2, 2, 'C2', ['Bb3', 'D4', 'E4', 'G4']),            # C9
    (8, 0, 2, 'D2', ['F3', 'A3', 'C4', 'E4']),             # Dm9
    (8, 2, 2, 'Bb1', ['F3', 'A3', 'D4', 'F4']),            # B♭maj7
    (9, 0, 4, 'F1', ['A3', 'C4', 'E4', 'G4']),             # Fmaj9 (lift)
    (10, 0, 2, 'Bb1', ['D4', 'F4', 'A4', 'C5']),           # B♭maj9
    (10, 2, 2, 'C2', ['E4', 'G4', 'Bb4', 'D5']),           # C9 (se corta en el respiro)
    (11, 0, 8, 'F1', ['F3', 'A3', 'C4', 'G4']),            # Fadd9 (golpe grave y cola)
]
T_LIFT, T_RESPIRO, T_GOLPE = 19.2, 23.0, 24.0


def t_of(bar, beat):
    return (bar - 1) * BAR + beat * BEAT


# ---------------- MIDI → FluidSynth ----------------
def render_midi(events, program, gain=0.6, reverb=False):
    """events: lista de (t0, t1, nota, velocidad). Devuelve estéreo float32 (N, 2)."""
    mid = mido.MidiFile(ticks_per_beat=960)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM)))
    tr.append(mido.Message('program_change', program=program, channel=0, time=0))
    tr.append(mido.Message('control_change', control=91, value=0, channel=0, time=0))  # sin reverb interna
    tr.append(mido.Message('control_change', control=93, value=0, channel=0, time=0))
    msgs = []
    for t0, t1, n, v in events:
        msgs.append((t0, 1, mido.Message('note_on', note=n, velocity=int(v), channel=0)))
        msgs.append((t1, 0, mido.Message('note_off', note=n, velocity=0, channel=0)))
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
        subprocess.run(['fluidsynth', '-ni', '-q', '-g', str(gain), '-r', str(SR), '-R', '1' if reverb else '0', '-C', '0',
                        '-F', str(wavp), SF2, str(midp)], check=True, capture_output=True)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wavp), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    out = np.zeros((N, 2), dtype=np.float32)
    out[:min(N, len(x))] = x[:N]
    return out


# ---------------- partes ----------------
def piano():
    ev = []
    for bar, beat, beats, bass, voces in ACORDES:
        t0 = t_of(bar, beat)
        notes = [m(v) for v in voces]
        if bar == 11:
            # golpe grave: octavas graves + acorde que se queda sonando
            ev += [(T_GOLPE, DUR, m('F1'), 92), (T_GOLPE, DUR, m('F2'), 84)]
            ev += [(T_GOLPE + 0.02 * i, DUR, n, 66) for i, n in enumerate(notes)]
            continue
        # mano izquierda: bajo suave en el tiempo 1 de cada acorde (desde el compás 1)
        if bar >= 1:
            lh = m(bass) + (12 if bar < 9 else 0)
            ev.append((t0, t0 + beats * BEAT * 0.98, lh, 46 if bar < 9 else 60))
            if bar >= 9:
                ev.append((t0, t0 + beats * BEAT * 0.98, lh + 12, 54))
        # mano derecha: pulsación ligera en corcheas (acorde quebrado), staccato suave
        pattern = [2, 0, 3, 1, 2, 0, 3, 1] if len(notes) >= 4 else [2, 0, 1, 0, 2, 0, 1, 0]
        steps = beats * 2
        for i in range(steps):
            t = t0 + i * BEAT / 2
            if t >= T_RESPIRO:
                break
            n = notes[pattern[i % len(pattern)] % len(notes)]
            vel = 44 + (8 if i % 2 == 0 else 0) + (10 if bar >= 9 else 0)
            dur = BEAT * (0.42 if bar < 9 else 0.6)
            ev.append((t + rng.normal(0, 0.004), t + dur, n, vel + rng.integers(-3, 4)))
        # en el lift, acordes completos en los tiempos 1 y 3
        if bar >= 9:
            for b in range(0, beats, 2):
                t = t0 + b * BEAT
                if t < T_RESPIRO:
                    ev += [(t + 0.01 * k, t + BEAT * 1.9, n, 52) for k, n in enumerate(notes)]
    # golpe suave en f0 y nota que se queda en el respiro
    ev.append((0.0, 1.6, m('F3'), 62))
    ev.append((T_RESPIRO, T_GOLPE + 0.3, m('C6'), 40))
    ev.append((T_RESPIRO + 0.3, T_GOLPE + 0.3, m('G5'), 34))
    return render_midi(ev, program=0, gain=0.55)


def pizzicato():
    ev = []
    motivo = [(0, 0), (0.5, 1), (1.5, 2), (2.5, 3)]  # (tiempo, índice de voz)
    for bar, beat, beats, bass, voces in ACORDES:
        if bar < 2 or bar >= 11:
            continue
        notes = sorted(m(v) for v in voces)
        top = [n + 12 for n in notes[-3:]] + [notes[-1]]
        for tb, idx in motivo:
            if tb >= beats:
                continue
            t = t_of(bar, beat + tb)
            if t >= T_RESPIRO:
                continue
            ev.append((t, t + 0.25, top[idx % len(top)], 58 if bar < 9 else 66))
    return render_midi(ev, program=45, gain=0.5)


def cuerdas():
    ev = []
    for bar, beat, beats, bass, voces in ACORDES:
        t0 = t_of(bar, beat)
        t1 = t0 + beats * BEAT
        if t1 <= 15.2 or t0 >= T_RESPIRO:
            continue
        t0 = max(t0, 15.2)
        t1 = min(t1, T_RESPIRO + 0.15)
        vel = 54 if bar < 9 else 70
        ev += [(t0, t1, m(v) - 12, vel) for v in voces] + [(t0, t1, m(bass) + 24, vel - 6)]
    # cuerdas en el golpe grave
    ev += [(T_GOLPE, DUR, m(v) - 12, 58) for v in ['F3', 'A3', 'C4']]
    return render_midi(ev, program=48, gain=0.42)


def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    e = np.ones(n) * s
    e[:a] = np.linspace(0, 1, a, endpoint=False) if a else e[:a]
    e[a:a + d] = np.linspace(1, s, max(0, min(d, n - a)), endpoint=False)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def bajo():
    out = np.zeros(N)
    for bar, beat, beats, bass, voces in ACORDES:
        if bar < 5 or bar >= 11:
            continue
        for b in range(0, beats, 2):
            t = t_of(bar, beat + b)
            if t >= T_RESPIRO:
                continue
            dur = min(2 * BEAT * 0.95, T_RESPIRO - t)
            n = int(dur * SR)
            tt = np.arange(n) / SR
            f = hz(m(bass) + (12 if m(bass) < m('C2') else 0))
            x = np.sin(2 * np.pi * f * tt) + 0.22 * np.sin(2 * np.pi * 2 * f * tt) + 0.06 * np.sin(2 * np.pi * 3 * f * tt)
            x = np.tanh(1.1 * x) * env_adsr(n, 0.03, 0.3, 0.7, 0.14)
            i0 = int(t * SR)
            out[i0:i0 + n] += x[: N - i0] * 0.24
    b, a = signal.butter(2, 300 / (SR / 2), 'low')
    out = signal.lfilter(b, a, out)
    return np.stack([out, out], axis=1)


def shaker():
    out = np.zeros((N, 2))
    t, k = 4.8, 0
    acc = [0.55, 0.28, 1.0, 0.32]
    b, a = signal.butter(2, [4200 / (SR / 2), 11000 / (SR / 2)], 'band')
    while t < T_RESPIRO:
        n = int(0.07 * SR)
        nz = rng.standard_normal(n)
        e = np.exp(-np.arange(n) / (0.012 * SR)) * (1 - np.exp(-np.arange(n) / (0.0015 * SR)))
        x = signal.lfilter(b, a, nz * e) * acc[k % 4] * (0.9 + 0.2 * rng.random())
        gain = 0.06 * (1.25 if t >= T_LIFT else 1.0)
        i0 = int((t + rng.normal(0, 0.003)) * SR)
        out[i0:i0 + n, 0] += x * gain * 0.75
        out[i0:i0 + n, 1] += x * gain
        t += BEAT / 4
        k += 1
    return out


def golpes():
    out = np.zeros(N)
    # golpe suave en f0: bombo de fieltro
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    f = 52 + 40 * np.exp(-tt * 28)
    out[:n] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * 0.5
    # riser del lift (17.6 → 19.2)
    t0, t1 = 17.6, T_LIFT
    n = int((t1 - t0) * SR)
    tt = np.arange(n) / SR
    u = tt / (t1 - t0)
    nz = rng.standard_normal(n)
    b, a = signal.butter(2, 2500 / (SR / 2), 'high')
    sweep = np.sin(2 * np.pi * np.cumsum(300 + 900 * u ** 2) / SR) * 0.15
    out[int(t0 * SR):int(t0 * SR) + n] += (signal.lfilter(b, a, nz) * 0.12 + sweep) * u ** 2.2
    # golpe grave en 24.00: sub con caída de tono
    n = int(3.6 * SR)
    tt = np.arange(n) / SR
    f = 38 + 22 * np.exp(-tt * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.15) * 0.9
    i0 = int(T_GOLPE * SR)
    out[i0:i0 + n] += sub[: N - i0]
    return np.stack([out, out], axis=1)


def reverb_ir(sec=2.4, pre=0.018):
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


def automatizacion():
    """Ganancia global: entra suave, respira en 23.00 (todo baja salvo la nota que queda) y vuelve con el golpe."""
    t = np.arange(N) / SR
    g = np.ones(N)
    g *= np.clip(t / 0.05, 0, 1)
    return g


def nivel(x, objetivo_db, modo='rms'):
    """Lleva una capa a su nivel: RMS de la parte activa (o pico) en dBFS."""
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
    corte = np.where(t < T_RESPIRO, 1.0, np.where(t < T_GOLPE, np.exp(-(t - T_RESPIRO) / 0.08), 1.0))[:, None]
    p = nivel(piano(), -25)
    z = nivel(pizzicato(), -30) * corte
    s = nivel(cuerdas(), -29)
    b = nivel(bajo(), -31) * corte
    k = nivel(shaker(), -37) * corte
    g = golpes()
    # golpes por separado: suave al inicio, riser y golpe grave con su propio pico
    g0 = g.copy(); g0[int(1.0 * SR):] = 0
    g1 = g.copy(); g1[:int(17.0 * SR)] = 0; g1[int(T_GOLPE * SR):] = 0
    g2 = g.copy(); g2[:int(T_GOLPE * SR)] = 0
    g = nivel(g0, -16, 'pico') + nivel(g1, -22, 'pico') + nivel(g2, -11, 'pico')
    mezcla = con_reverb(p + z + s + b + k, 0.2) + g
    mezcla *= automatizacion()[:, None]
    bh, ah = signal.butter(2, 32 / (SR / 2), 'high')
    mezcla = signal.lfilter(bh, ah, mezcla, axis=0)
    mezcla *= np.clip((DUR - t) / 0.6, 0, 1)[:, None]
    out = OUT / 'musica_stem.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(out)],
                   input=mezcla.astype(np.float32).tobytes(), check=True)
    print(out, f'pico {20 * np.log10(np.abs(mezcla).max()):.1f} dBFS')


if __name__ == '__main__':
    main()
