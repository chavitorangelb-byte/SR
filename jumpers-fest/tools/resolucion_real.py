# Mide cuánto detalle real tiene cada asset (las fotos de Instagram suelen venir ampliadas).
# Método: se reduce la foto a una fracción f de su ancho y se vuelve a ampliar; si la diferencia (RMS en gris, 0–255)
# queda por debajo de 1.0, la foto no tenía detalle por encima de ese tamaño. El ancho real ≈ ancho × f mínimo.
# Se valida con una referencia conocida: foto_01 (427 px) ampliada a 1320 px.
# Uso: python3 tools/resolucion_real.py → review/fase1/resolucion_real.json
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'review' / 'fase1'
OUT.mkdir(parents=True, exist_ok=True)
UMBRAL = 1.0
FS = np.round(np.arange(0.20, 1.0001, 0.02), 2)


def perdida(im, f):
    w, h = im.size
    small = im.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS).resize((w, h), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32)
    b = np.asarray(small, dtype=np.float32)
    return float(np.sqrt(((a - b) ** 2).mean()))


def ancho_real(im):
    curva = [(f, perdida(im, f)) for f in FS]
    ok = [f for f, p in curva if p <= UMBRAL]
    f = min(ok) if ok else 1.0
    return f, curva


res = {}
ref = Image.open(ROOT / 'assets' / 'foto_01_rainbow_jumper.jpg').convert('L')
ref = ref.resize((1320, round(ref.height * 1320 / ref.width)), Image.LANCZOS)
f, _ = ancho_real(ref)
res['_referencia'] = {'que_es': 'foto_01 (427 px) ampliada a 1320 px', 'estimado_px': int(round(1320 * float(f))), 'verdadero_px': 427}

for p in sorted((ROOT / 'assets').glob('*.jpg')):
    im = Image.open(p).convert('L')
    f, curva = ancho_real(im)
    w = im.width
    real = w if f >= 0.9 else int(round(w * float(f) / 10) * 10)
    res[p.name] = {
        'nominal': f'{im.width}×{im.height}',
        'real': f'{w} px' if f >= 0.9 else f'{real} px',
        'factor': float(f),
        'ampliada': bool(f < 0.9),
    }
(OUT / 'resolucion_real.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))
for k, v in res.items():
    print(k, v)
