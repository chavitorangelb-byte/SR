#!/usr/bin/env python3
"""Hoja de contactos: python3 video/hoja.py carpeta salida.jpg [columnas] [ancho]"""
import sys, os, re
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
w = int(sys.argv[4]) if len(sys.argv) > 4 else 300
fs = sorted([f for f in os.listdir(d) if f.endswith('.png')], key=lambda s: int(re.sub(r'\D', '', s)))
ims = [Image.open(os.path.join(d, f)).convert('RGB') for f in fs]
h = round(w * ims[0].height / ims[0].width)
rows = -(-len(ims) // cols)
sheet = Image.new('RGB', (cols * (w + 6) + 6, rows * (h + 24) + 6), (40, 40, 44))
dr = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = 6 + (i % cols) * (w + 6), 6 + (i // cols) * (h + 24)
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y)); dr.text((x + 2, y + h + 4), 'f' + re.sub(r'\D', '', f), fill=(255, 255, 255))
sheet.save(out, quality=85)
