#!/usr/bin/env python3
"""Hoja de contactos de cuadros clave de un render.

Uso: python3 video/hoja.py <carpeta_cuadros> <desde_t> <paso_t> <salida.jpg> t1[=etiqueta] t2 ... (t en cuadros de 60 fps)
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

carpeta, desde, paso, salida = Path(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
ts = [(float(x.split('=')[0]), x.split('=', 1)[1] if '=' in x else '') for x in sys.argv[5:]]
ims = []
for t, et in ts:
    i = round((t - desde) / paso)
    ims.append((t, et, Image.open(carpeta / f'{i:05d}.png').convert('RGB')))
w, h = ims[0][2].size
cols = min(4, len(ims))
rows = (len(ims) + cols - 1) // cols
pad, top = 10, 26
sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + top + pad) + pad), (20, 21, 16))
d = ImageDraw.Draw(sheet)
try:
    fuente = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except OSError:
    fuente = None
for k, (t, et, im) in enumerate(ims):
    x = pad + (k % cols) * (w + pad)
    y = pad + (k // cols) * (h + top + pad)
    sheet.paste(im, (x, y + top))
    d.text((x + 2, y + 4), f'f{int(t)} · {t / 60:.2f} s' + (f' · {et}' if et else ''), fill=(230, 226, 214), font=fuente)
sheet.save(salida, quality=90)
print(salida, sheet.size)
