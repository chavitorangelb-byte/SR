# Verificación de la fase 3: envolvente de energía de cada frase de la toma con los inicios de palabra
# de Whisper (gris) y los usados en tools/voz.py (rojo). Uso:
#   python3 tools/envolvente.py voz/fuente/toma1_hope_eleven_v4.mp3 build/envolvente.json
#   python3 tools/plot_envolvente.py build/envolvente.json review/fase3/envolvente_palabras.jpg
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('voz', ROOT / 'tools' / 'voz.py')
voz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voz)
env = json.load(open(sys.argv[1]))
asr = json.load(open(ROOT / 'voz' / 'fuente' / 'toma1_palabras_whisper.json'))
t, db = env['t'], env['db']
H, W = 260, 1500
frases = list(voz.TOMA_FRASES.items())
img = Image.new('RGB', (W, H * len(frases)), 'white')
d = ImageDraw.Draw(img)
for k, (fid, fz) in enumerate(frases):
    a, b = fz['tramos'][0][0] - 0.15, fz['tramos'][-1][1] + 0.15
    y0 = k * H
    X = lambda s: int((s - a) / (b - a) * (W - 40)) + 20
    Y = lambda v: y0 + 30 + int((-15 - max(v, -70)) / 55 * (H - 60))
    for lv in (-30, -45, -60):
        d.line([(20, Y(lv)), (W - 20, Y(lv))], fill=(225, 225, 225))
        d.text((2, Y(lv) - 6), str(lv), fill=(150, 150, 150))
    d.line([(X(tt), Y(v)) for tt, v in zip(t, db) if a <= tt <= b], fill=(30, 30, 30), width=2)
    for w in asr['palabras']:
        if a <= w['start'] <= b:
            d.line([(X(w['start']), y0 + 20), (X(w['start']), y0 + H - 30)], fill=(170, 170, 170))
    for w, s in fz['palabras']:
        d.line([(X(s), y0 + 14), (X(s), y0 + H - 22)], fill=(220, 30, 60), width=2)
        d.text((X(s) + 3, y0 + 4), w.encode('ascii', 'replace').decode(), fill=(220, 30, 60))
    d.text((W - 170, y0 + H - 20), f'{fid} {a:.2f}-{b:.2f} s', fill=(0, 0, 0))
img.save(sys.argv[2], quality=86)
print(sys.argv[2])
