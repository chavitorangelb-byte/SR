#!/usr/bin/env python3
"""Transcribe la toma con tiempos por palabra (faster-whisper, sin guion previo para no "adivinar" palabras).
Uso: python3 tools/transcribir.py voz/fuente/toma_hope_eleven_v4.mp3 voz/fuente/toma_palabras.json small
Requiere: pip install faster-whisper (el modelo se descarga la primera vez)."""
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
ruta, salida, modelo = sys.argv[1], sys.argv[2], sys.argv[3]
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32).copy()
m = WhisperModel(modelo, device='cpu', compute_type='int8')
# Sin prompt: así el reconocimiento no "adivina" las palabras esperadas y se notan errores de pronunciación.
segs, info = m.transcribe(audio, language='es', word_timestamps=True, beam_size=5, vad_filter=False)
palabras, texto = [], []
for s in segs:
    texto.append(s.text.strip())
    for w in s.words:
        palabras.append({'w': w.word.strip(), 'start': round(w.start, 3), 'end': round(w.end, 3), 'p': round(w.probability, 3)})
json.dump({'texto': ' '.join(texto), 'palabras': palabras, 'modelo': f'faster-whisper {modelo}'}, open(salida, 'w'), ensure_ascii=False, indent=1)
print(' '.join(texto))
for p in palabras: print(f"{p['start']:6.2f} {p['end']:6.2f} {p['p']:.2f} {p['w']}")
