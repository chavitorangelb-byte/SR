# Transcripción con marcas por palabra (sin darle el guion, para verificar lo que dijo la voz).
import json, subprocess, sys, time
import numpy as np
from faster_whisper import WhisperModel
audio, modelo, out = sys.argv[1], sys.argv[2], sys.argv[3]
t0 = time.time()
m = WhisperModel(modelo, device='cpu', compute_type='int8')
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(pcm, dtype=np.float32).copy()
segs, info = m.transcribe(x, language='es', word_timestamps=True, beam_size=5, vad_filter=False, condition_on_previous_text=False)
palabras, texto = [], []
for s in segs:
    texto.append(s.text.strip())
    for w in s.words:
        palabras.append({'w': w.word.strip(), 'start': round(w.start, 3), 'end': round(w.end, 3), 'p': round(w.probability, 3)})
json.dump({'modelo': modelo, 'texto': ' '.join(texto), 'palabras': palabras}, open(out, 'w'), ensure_ascii=False, indent=1)
print(f'{time.time() - t0:.1f} s ·', ' '.join(texto))
