# Envolvente de energía (dB) cada 10 ms y sus valles, para afinar el inicio de cada palabra.
import json, subprocess, sys
import numpy as np
audio = sys.argv[1]
SR = 48000
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, dtype=np.float32)
hop, win = 480, 1440
n = (len(x) - win) // hop
rms = np.array([np.sqrt(np.mean(x[i*hop:i*hop+win] ** 2) + 1e-12) for i in range(n)])
db = 20 * np.log10(rms + 1e-9)
t = (np.arange(n) * hop + win / 2) / SR
# suavizado leve
k = np.array([1, 2, 3, 2, 1], float); k /= k.sum()
dbs = np.convolve(db, k, mode='same')
# primer y último sonido (umbral −45 dBFS)
on = np.where(dbs > -45)[0]
print(f'primer sonido {t[on[0]]:.3f} s · último {t[on[-1]]:.3f} s · duración {len(x)/SR:.3f} s · pico {dbs.max():.1f} dB')
# valles locales (mínimos con al menos 3 dB de profundidad respecto a sus vecinos a ±60 ms)
vals = []
for i in range(6, n - 6):
    if dbs[i] == dbs[i-6:i+7].min() and (max(dbs[i-6:i].max(), dbs[i+1:i+7].max()) - dbs[i]) > 3:
        vals.append((round(float(t[i]), 3), round(float(dbs[i]), 1)))
json.dump({'t': [round(float(v), 3) for v in t], 'db': [round(float(v), 2) for v in dbs], 'valles': vals}, open(sys.argv[2], 'w'))
print('valles:', ' '.join(f'{a:.2f}({b})' for a, b in vals))
