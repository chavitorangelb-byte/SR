#!/usr/bin/env python3
"""Mide la toma de ElevenLabs: inicio y fin reales de cada frase (sin respiraciones) y el tiempo de cada palabra.

Entrada: voz/fuente/toma_hope_eleven_v4.mp3 y voz/fuente/toma_palabras.json (faster-whisper small, sin guion previo).
Salida:  voz/fuente/toma_frases.json

- Inicio de frase: primer tramo de ≥ 80 ms por encima de −30 dB (voz plena) cerca de la primera palabra; luego se
  extiende hacia atrás mientras siga arriba de −40 dB (consonantes suaves), sin cruzar un silencio. Así la respiración
  que abre la toma (0.05–0.85 s, −30 a −50 dB, separada por silencio) queda fuera.
- Fin de frase: último cuadro de 10 ms arriba de −45 dB antes de un silencio de ≥ 0.3 s (incluye la "s" final).
- Palabras: tiempos de la transcripción; la primera palabra de cada frase se ajusta al inicio medido.
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
TOMA = ROOT / 'voz' / 'fuente' / 'toma_hope_eleven_v4.mp3'
PAL = ROOT / 'voz' / 'fuente' / 'toma_palabras.json'
OUT = ROOT / 'voz' / 'fuente' / 'toma_frases.json'
SR = 48000
HOP = 0.01

# Frases del guion, en orden, con cuántas palabras de la transcripción les tocan.
FRASES = [
    ('L1', 'Alguien tiene antojo de galletas.', 5),
    ('L2', 'Que te encuentre a ti.', 5),
    ('L3', 'Tus galletas y pasteles, en tu página.', 7),
    ('L4', 'Y su pastel, idéntico a la foto que te mande.', 10),
    ('L5', 'Todo en un mensaje.', 4),
    ('L6', 'Y con reseñas que hablan por ti.', 7),
    ('L7', 'Ana Gaby Repostería. Así se vería con Elevate.', 7),
    ('L7c', 'Ana Gaby Repostería, con Elevate.', 4),
]
# Palabras del guion (la transcripción dice "Anagavi" por "Ana Gaby": misma pronunciación, se cuenta como 1).
PALABRAS_GUION = {
    'L1': ['Alguien', 'tiene', 'antojo', 'de', 'galletas'],
    'L2': ['Que', 'te', 'encuentre', 'a', 'ti'],
    'L3': ['Tus', 'galletas', 'y', 'pasteles', 'en', 'tu', 'página'],
    'L4': ['Y', 'su', 'pastel', 'idéntico', 'a', 'la', 'foto', 'que', 'te', 'mande'],
    'L5': ['Todo', 'en', 'un', 'mensaje'],
    'L6': ['Y', 'con', 'reseñas', 'que', 'hablan', 'por', 'ti'],
    'L7': ['Ana Gaby', 'Repostería', 'Así', 'se', 'vería', 'con', 'Elevate'],
    'L7c': ['Ana Gaby', 'Repostería', 'con', 'Elevate'],
}


def decode(path):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def main():
    x = decode(TOMA)
    h = int(HOP * SR)
    n = len(x) // h
    db = 20 * np.log10(np.sqrt(np.array([np.mean(x[i * h:(i + 1) * h] ** 2) for i in range(n)])) + 1e-9)
    pal = json.loads(PAL.read_text())['palabras']
    k = 0
    salida = []
    for fid, texto, cuantas in FRASES:
        ws = pal[k:k + cuantas]
        k += cuantas
        guion = PALABRAS_GUION[fid]
        assert len(ws) == len(guion), (fid, [w['w'] for w in ws])
        # Inicio: primer tramo de voz plena desde 0.25 s antes de la segunda palabra hacia atrás hasta la primera.
        busca_desde = int(max(0, (ws[0]['start'] - 0.2)) / HOP)
        busca_hasta = int(ws[1]['start'] / HOP) if len(ws) > 1 else int(ws[0]['end'] / HOP)
        ini = None
        for i in range(busca_desde, max(busca_hasta, busca_desde + 1)):
            if all(db[i:i + 8] > -30):
                ini = i
                break
        if ini is None:
            ini = int(ws[0]['start'] / HOP)
        while ini > 0 and db[ini - 1] > -40:
            ini -= 1
        # Fin: último cuadro arriba de −45 dB antes de 0.3 s de silencio, a partir del final de la última palabra.
        fin = int(ws[-1]['end'] / HOP) - 10
        i = fin
        while i < n:
            if db[i] > -45:
                fin = i
                i += 1
            elif np.all(db[i:i + 30] <= -45) or i + 30 >= n:
                break
            else:
                i += 1
        t_ini, t_fin = round(ini * HOP, 3), round((fin + 1) * HOP, 3)
        palabras = []
        for j, (w, g) in enumerate(zip(ws, guion)):
            s = t_ini if j == 0 else w['start']
            if j > 0:
                # La transcripción le pega a la palabra el silencio previo (p. ej. después de una coma).
                # Pausa real = ≥ 120 ms bajo −45 dB que arranca al inicio de la palabra (los cierres de las
                # oclusivas duran 30–80 ms y no cuentan). La búsqueda no sale del tramo de la propia palabra.
                a = int(s / HOP)
                b = min(int((w['end'] - 0.06) / HOP), n)
                i = a
                while i < b and db[i] > -45 and i - a < 4:
                    i += 1
                k0 = i
                while i < b and db[i] <= -45:
                    i += 1
                if i - k0 >= 12 and i < b:
                    s = i * HOP
            palabras.append({'w': g, 'ini': round(s, 3), 'fin': round(w['end'], 3), 'oido': w['w'], 'p': w['p']})
        salida.append({'id': fid, 'texto': texto, 'ini': t_ini, 'fin': t_fin, 'dur': round(t_fin - t_ini, 3), 'palabras': palabras})
        print(f"{fid:4s} {t_ini:6.2f} → {t_fin:6.2f}  {t_fin - t_ini:4.2f} s  {texto}")
    # Pausa interna de la L7 (entre "Repostería." y "Así").
    l7 = next(f for f in salida if f['id'] == 'L7')
    rep, asi = l7['palabras'][1], l7['palabras'][2]
    corte = int(rep['fin'] / HOP)
    while corte < n and db[corte] > -45:
        corte += 1
    l7['pausa_interna'] = {'desde': round(corte * HOP, 3), 'hasta': asi['ini'], 'dura': round(asi['ini'] - corte * HOP, 3)}
    print('L7 pausa interna', l7['pausa_interna'])
    OUT.write_text(json.dumps({'toma': TOMA.name, 'frases': salida}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
