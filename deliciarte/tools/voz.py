#!/usr/bin/env python3
"""Fase 3 · Bloquea la voz de ElevenLabs a la línea de tiempo de DeliciArte.

Uso: python3 deliciarte/tools/voz.py voz/fuente/toma1.mp3 [voz/fuente/toma2.mp3]

- Corta cada toma en sus 8 frases por los silencios (pausas de 0.8 s del guion).
- Sin transcripción automática (los servidores de modelos están bloqueados en este entorno): el guion se conoce,
  así que cada palabra se ubica por sílabas dentro de su frase y su inicio se ajusta al ataque de energía más cercano.
- Elige la toma cuyas frases caben mejor en sus ventanas; coloca cada frase en su cuadro planeado y, si una frase
  no cabe, recorre las siguientes lo mínimo necesario (sin acelerar la voz).
- Procesa la voz (pasa altos, de-esser, compresión suave) y la deja en −16 LUFS: voz/voz_stem_48k.wav.
- Escribe voz/voz.json (cuadro de inicio y fin de cada frase y de cada palabra) para el render, los SFX y la mezcla.
Requiere: numpy, scipy, ffmpeg.
"""
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
FPS = 60
TOTAL_F = 1140

LINEAS = [
    ('L1', 30, 'Sabor inigualable en cada pastel.'),
    ('L2', 204, 'Pasteles personalizados, a tu gusto.'),
    ('L3', 354, 'Diseños únicos para tu celebración.'),
    ('L4', 502, 'Imagina todo esto en tu propia página.'),
    ('L5', 667, 'Y postres para cada antojo.'),
    ('L6', 796, 'Pide por WhatsApp.'),
    ('L7', 862, 'DeliciArte. Pastelería.'),
    ('L8', 990, 'Tu página, desde mil pesos.'),
]
# Ataques medidos a mano en la envolvente de la toma (caídas de 35 dB o más antes de la palabra), en cuadros desde el
# inicio de su frase. Mandan sobre la estimación por sílabas en las palabras que mueven el kinetic.
AJUSTES = {'L1.inigualable': 34, 'L3.celebración': 90, 'L5.cada': 66, 'L5.antojo': 94, 'L7.Pastelería': 72, 'L8.mil': 80, 'L8.pesos': 89}
# sílabas de palabras que el conteo automático no resuelve bien
SILABAS = {'whatsapp': 2, 'deliciarte': 5, 'pastelería': 5, 'únicos': 3, 'celebración': 4, 'personalizados': 6, 'imagina': 4, 'propia': 2, 'página': 3, 'antojo': 3}


def decode(path):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).astype(np.float64)


def write_wav(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s24le', str(path)],
                   input=x.astype(np.float32).tobytes(), check=True)


def silabas(w):
    k = unicodedata.normalize('NFC', w.lower()).strip('.,')
    if k in SILABAS:
        return SILABAS[k]
    # núcleos vocálicos: diptongos cuentan una vez, í/ú acentuadas rompen el diptongo
    s = re.sub(r'[^aeiouáéíóúü]', ' ', k)
    n = 0
    for grupo in s.split():
        n += 1 + sum(1 for c in grupo if c in 'íú') + max(0, len(re.findall(r'[aeoáéó]', grupo)) - 1)
    return max(1, n)


def envolvente(x, hop=0.005):
    h = int(hop * SR)
    n = len(x) // h
    e = np.sqrt((x[: n * h].reshape(n, h) ** 2).mean(axis=1))
    return 20 * np.log10(e + 1e-9), h


def frases(x):
    """Devuelve 8 (inicio, fin) en s, buscando el umbral de silencio que da 8 frases."""
    db, h = envolvente(x)
    ref = np.percentile(db[db > -80], 95)
    for thr in np.arange(-38, -60, -2):
        voz = db > ref + thr
        # cerrar huecos menores a 0.28 s (pausas internas, comas)
        k = int(0.28 / (h / SR))
        v = voz.copy()
        i = 0
        while i < len(v):
            if not v[i]:
                j = i
                while j < len(v) and not v[j]:
                    j += 1
                if 0 < i and j < len(v) and j - i < k:
                    v[i:j] = True
                i = j
            else:
                i += 1
        segs = []
        i = 0
        while i < len(v):
            if v[i]:
                j = i
                while j < len(v) and v[j]:
                    j += 1
                if (j - i) * h / SR > 0.15:
                    segs.append((i * h / SR, j * h / SR))
                i = j
            else:
                i += 1
        if len(segs) == 8:
            return segs, db, h
    raise SystemExit(f'No se encontraron 8 frases (última cuenta: {len(segs)}). Revisar la toma.')


def onsets(x, h):
    """Flujo espectral (ataques) por cuadro de 5 ms."""
    f, t, Z = signal.stft(x, SR, nperseg=1024, noverlap=1024 - h)
    mag = np.abs(Z)
    flux = np.maximum(0, np.diff(np.log1p(mag * 50), axis=1)).sum(axis=0)
    return np.concatenate([[0], flux])


def candidatos(x, h, a, b):
    """Inicios de bloques de energía dentro de la frase: el punto donde la envolvente sale de una caída de ≥ 6 dB."""
    db, _ = envolvente(x, h / SR)
    k = np.ones(4) / 4
    db = np.convolve(db, k, 'same')
    i0, i1 = int(a * SR / h), int(b * SR / h)
    out = []
    w = int(0.08 * SR / h)
    for i in range(max(i0 + 2, 1), min(i1 - 2, len(db) - 1)):
        if db[i] <= db[i - 1] and db[i] <= db[i + 1]:
            izq, der = db[max(0, i - w):i].max(), db[i + 1:i + 1 + w].max()
            prof = min(izq, der) - db[i]
            if prof >= 6:
                j = i
                while j < i + w and db[j] < db[i] + prof * 0.5:
                    j += 1
                out.append(j * h / SR)
    return out


def palabras_de(texto, a, b, flux, h, x=None):
    """Reparte las palabras de una frase entre a y b (s) por sílabas y ajusta cada inicio al bloque de energía más cercano."""
    ws = texto.split()
    syl = np.array([silabas(w) for w in ws], dtype=float)
    pausa = np.array([0.12 if re.search(r'[,.]$', w) else 0.0 for w in ws])  # pausa breve tras coma o punto interno
    pausa[-1] = 0
    dur = b - a - pausa.sum()
    est = []
    t = a
    for i, s in enumerate(syl):
        est.append(t)
        t += dur * s / syl.sum() + pausa[i]
    cand = candidatos(x, h, a, b) if x is not None else []
    out = []
    for i, (w, t0) in enumerate(zip(ws, est)):
        if i == 0:
            out.append((w, a))
            continue
        near = [c for c in cand if abs(c - t0) <= 0.16 and c > out[-1][1] + 0.06]
        if near:
            tt = min(near, key=lambda c: abs(c - t0))
        else:
            lo, hi = int((t0 - 0.08) * SR / h), int((t0 + 0.08) * SR / h)
            seg = flux[max(0, lo):max(lo + 1, hi)]
            tt = (max(0, lo) + int(np.argmax(seg))) * h / SR if len(seg) else t0
        tt = max(tt, out[-1][1] + 0.06)
        out.append((w, tt))
    return out


def procesar(v):
    b, a = signal.butter(2, 80 / (SR / 2), 'high')
    v = signal.lfilter(b, a, v)
    # de-esser simple: comprime la banda 5–9 kHz cuando sobresale
    bs, as_ = signal.butter(2, [5000 / (SR / 2), 9000 / (SR / 2)], 'band')
    sib = signal.lfilter(bs, as_, v)
    env = np.abs(signal.hilbert(sib))
    env = signal.lfilter([1 - 0.995], [1, -0.995], env)
    thr = np.percentile(env, 98) * 0.6
    g = np.where(env > thr, (thr / np.maximum(env, 1e-9)) ** 0.5, 1.0)
    v = v - sib * (1 - g)
    # compresión suave 2:1 sobre −24 dBFS
    lvl = signal.lfilter([1 - 0.999], [1, -0.999], v ** 2)
    db = 10 * np.log10(lvl + 1e-12)
    gr = np.where(db > -24, (-24 - db) * 0.5, 0.0)
    return v * 10 ** (gr / 20)


def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', r[r.rindex('Summary'):]).group(1))


def main():
    tomas = [Path(p) for p in sys.argv[1:]]
    if not tomas:
        raise SystemExit(__doc__)
    mejor = None
    for p in tomas:
        x = decode(p)
        segs, db, h = frases(x)
        # holgura: cuánto se pasa cada frase de su ventana planeada
        exceso = 0.0
        for k, ((lid, f0, _), (a, b)) in enumerate(zip(LINEAS, segs)):
            nxt = LINEAS[k + 1][1] if k + 1 < len(LINEAS) else TOTAL_F
            exceso += max(0.0, (b - a) - ((nxt - f0) / FPS - 0.1))
        print(p.name, 'frases:', ' '.join(f'{b - a:.2f}' for a, b in segs), f'exceso {exceso:.2f} s')
        if mejor is None or exceso < mejor[0]:
            mejor = (exceso, p, x, segs, h)
    _, p, x, segs, h = mejor
    print('toma elegida:', p.name)
    flux = onsets(x, h)
    stem = np.zeros(int(TOTAL_F / FPS * SR) + SR)
    lineas, PAL = [], {}
    fin_prev = 0
    pre, post = 0.04, 0.2
    for (lid, f0, texto), (a, b) in zip(LINEAS, segs):
        f = max(f0, fin_prev + 6)  # nunca encima de la frase anterior
        dur = b - a
        start = f / FPS
        seg = x[max(0, int((a - pre) * SR)): min(len(x), int((b + post) * SR))].copy()
        fi, fo = int(0.006 * SR), int(0.08 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fo:] *= np.linspace(1, 0, fo) ** 2
        at = int(round((start - pre) * SR))
        stem[at:at + len(seg)] += seg[: len(stem) - at]
        pals = palabras_de(texto, a, b, flux, h, x)
        pf = {}
        for w, tw in pals:
            key = unicodedata.normalize('NFC', w.strip('.,'))
            fr = int(round(f + (tw - a) * FPS))
            if f'{lid}.{key}' in AJUSTES:
                fr = f + AJUSTES[f'{lid}.{key}']
            pf[key] = fr
            PAL[f'{lid}.{key}'] = fr
        termina = int(round(f + dur * FPS))
        lineas.append({'id': lid, 'f': f, 'termina_f': termina, 'dur': round(dur, 3), 'palabras': pf, 'toma': {'ini': round(a, 3), 'fin': round(b, 3)}})
        fin_prev = termina
        if f != f0:
            print(f'  {lid}: se recorre de f{f0} a f{f} para no encimarse')
    v = procesar(stem)
    tmp = ROOT / 'voz' / '_tmp.wav'
    write_wav(tmp, v)
    k = 10 ** ((-16.0 - lufs(tmp)) / 20)
    tmp.unlink()
    write_wav(ROOT / 'voz' / 'voz_stem_48k.wav', v * k)
    (ROOT / 'voz' / 'voz.json').write_text(json.dumps({'toma': p.name, 'lineas': lineas, 'palabras': PAL}, ensure_ascii=False, indent=1))
    for L in lineas:
        print(f"{L['id']} f{L['f']}–f{L['termina_f']} ({L['dur']:.2f} s): " + ' · '.join(f'{w} f{fr}' for w, fr in L['palabras'].items()))


if __name__ == '__main__':
    main()
