#!/usr/bin/env python3
"""Fase 3: bloquea la voz a la línea de tiempo.

- Corta cada frase de la toma con los tiempos medidos (voz/fuente/toma_frases.json): 40 ms antes del inicio real
  (la respiración que abre la toma queda fuera) y 220 ms después del final, con fundidos de 6 y 90 ms.
- L7: la pausa entre «Repostería.» y «Así» baja de 0.40 a 0.28 s (7 cuadros), como pide el brief aprobado.
- Coloca cada frase para que su inicio real caiga exacto en su cuadro de brief/timeline.json.
- Procesa (pasa altos, de-esser, compresión suave) y normaliza en dos pasadas a −16 LUFS: voz/voz_stem_48k.wav.
- Verifica que cada frase arranque en su cuadro (±1) y que nada se encime.
- Genera voz/preview_voz_pulso.mp3: la voz en su lugar sobre un pulso suave a 98 BPM.
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
TL = ROOT / 'brief' / 'timeline.json'
TOMA = ROOT / 'voz' / 'fuente' / 'toma_hope_eleven_v4.mp3'
FRASES = ROOT / 'voz' / 'fuente' / 'toma_frases.json'
OUT = ROOT / 'voz' / 'voz_stem_48k.wav'
PREV = ROOT / 'voz' / 'preview_voz_pulso.mp3'
SR = 48000
PRE, POST = 0.04, 0.22
RECORTE_L7 = 7  # cuadros que se quitan a la pausa interna de la L7
CADENA = ('highpass=f=80:poles=2,deesser=i=0.35:m=0.5:f=0.5,'
          'acompressor=threshold=-22dB:ratio=2.2:attack=6:release=90:makeup=2')


def decode(path):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def write_wav(path, x, sr=SR):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-',
                    '-c:a', 'pcm_s24le', str(path)], input=x.astype(np.float32).tobytes(), check=True)


def tramo(toma, a, b, fade_in=0.006, fade_out=0.09):
    seg = toma[max(0, int(a * SR)):min(len(toma), int(b * SR))].copy()
    fi, fo = int(fade_in * SR), int(fade_out * SR)
    seg[:fi] *= np.linspace(0, 1, fi)
    seg[-fo:] *= np.linspace(1, 0, fo) ** 2
    return seg


def main():
    tl = json.loads(TL.read_text())
    fps, n = tl['fps'], int(round(tl['frames'] / tl['fps'] * SR))
    toma = decode(TOMA)
    medidas = {f['id']: f for f in json.loads(FRASES.read_text())['frases']}
    stem = np.zeros(n + SR, dtype=np.float32)
    colocadas = []
    for v in tl['voz']:
        m = medidas[v['id']]
        t0 = v['f'] / fps  # aquí debe caer el inicio real de la frase
        if v['id'] == 'L7':
            p = m['pausa_interna']
            a = tramo(toma, m['ini'] - PRE, p['desde'] + 0.12, fade_out=0.06)
            b = tramo(toma, p['hasta'] - PRE, m['fin'] + POST, fade_in=0.004)
            at_a = int(round((t0 - PRE) * SR))
            stem[at_a:at_a + len(a)] += a
            t_b = t0 + (p['hasta'] - m['ini']) - RECORTE_L7 / fps
            at_b = int(round((t_b - PRE) * SR))
            stem[at_b:at_b + len(b)] += b
            colocadas.append((v['id'], t0, t_b + (m['fin'] - p['hasta'])))
        else:
            seg = tramo(toma, m['ini'] - PRE, m['fin'] + POST)
            at = int(round((t0 - PRE) * SR))
            stem[at:at + len(seg)] += seg
            colocadas.append((v['id'], t0, t0 + m['dur']))
    stem = stem[:n]

    # Encimes y aire al final
    for (i1, _, f1), (i2, s2, _) in zip(colocadas, colocadas[1:]):
        if f1 + POST > s2 - PRE:
            raise SystemExit(f'{i1} se encima con {i2}')
    if colocadas[-1][2] > n / SR - 0.3:
        raise SystemExit('La L7 termina sin aire')

    raw = ROOT / 'voz' / '_voz_cruda.wav'
    write_wav(raw, stem)
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(raw), '-af',
                           CADENA + ',loudnorm=I=-16:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = (f"loudnorm=I=-16:TP=-2:LRA=7:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', CADENA + ',' + ln, '-ar', str(SR),
                    '-c:a', 'pcm_s24le', str(OUT)], check=True)
    raw.unlink()

    # Verificación independiente del volumen: correlación cruzada de los primeros 0.6 s de cada frase de la toma
    # contra el stem procesado alrededor de su cuadro. El desfase debe ser ≤ 1 cuadro.
    voz = decode(OUT)[:n]
    informe = []
    for v, (_, t0, t1) in zip(tl['voz'], colocadas):
        m = medidas[v['id']]
        ref = toma[int(m['ini'] * SR):int((m['ini'] + 0.6) * SR)]
        busca = int(0.1 * SR)
        a = int(t0 * SR) - busca
        ventana = voz[a:a + len(ref) + 2 * busca]
        env = lambda x: np.convolve(np.abs(x), np.ones(240) / 240, mode='same')  # envolvente de 5 ms
        r, w = env(ref), env(ventana)
        corr = [np.dot(r - r.mean(), w[k:k + len(r)] - w[k:k + len(r)].mean()) for k in range(0, 2 * busca, 24)]
        lag = (int(np.argmax(corr)) * 24 - busca) / SR
        desv = round(lag * fps, 2)
        informe.append({'id': v['id'], 'cuadro': v['f'], 'desfase_cuadros': desv, 'termina_s': round(t1, 3),
                        'termina_cuadro': int(round(t1 * fps))})
        if abs(desv) > 1.0:
            raise SystemExit(f"{v['id']}: arranca {desv} cuadros fuera de su lugar")
        v['bloqueada'] = True

    tl['notas_voz'] = [
        'Toma única de ElevenLabs (voz «Hope», eleven v4): la transcripción sin guion coincide palabra por palabra.',
        'L1: fuera la respiración del inicio de la toma (0.05–0.85 s).',
        'L7: la pausa entre «Repostería.» y «Así» baja de 0.40 a 0.28 s.',
        'Stem: voz/voz_stem_48k.wav, 48 kHz, 24 bits, −16 LUFS (pasa altos 80 Hz, de-esser y compresión 2.2:1).',
    ]
    TL.write_text(json.dumps(tl, ensure_ascii=False, indent=1) + '\n')

    # Preview: voz + pulso suave a 98 BPM (el tiempo fuerte de cada compás más marcado).
    click = np.zeros(n, dtype=np.float32)
    beat = 60 / tl['bpm']
    t = np.arange(int(0.05 * SR)) / SR
    k = 0
    while int(k * beat * SR) < n:
        at = int(k * beat * SR)
        fuerte = k % 4 == 0
        tono = np.sin(2 * np.pi * (1320 if fuerte else 880) * t) * np.exp(-t * 90) * (0.16 if fuerte else 0.08)
        click[at:at + len(tono)] += tono[:n - at]
        k += 1
    tmp = ROOT / 'voz' / '_prev.wav'
    write_wav(tmp, voz + click)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'libmp3lame', '-b:a', '192k', str(PREV)], check=True)
    tmp.unlink()

    stats = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(OUT), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
    resumen = stats[stats.rindex('Summary'):]
    lufs = float(resumen.split('I:')[1].split('LUFS')[0])
    tp = float(resumen.split('Peak:')[1].split('dBFS')[0])
    (ROOT / 'voz' / 'voz_informe.json').write_text(json.dumps({'lufs_integrado': lufs, 'pico_real_dbtp': tp, 'frases': informe},
                                                               ensure_ascii=False, indent=1))
    print(f'Stem: {lufs} LUFS, pico real {tp} dBTP')
    for r in informe:
        print(f"{r['id']}: f{r['cuadro']} → f{r['termina_cuadro']} · desfase {r['desfase_cuadros']:+} cuadros · termina {r['termina_s']} s")


if __name__ == '__main__':
    main()
