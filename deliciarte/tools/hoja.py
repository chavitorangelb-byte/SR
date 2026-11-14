#!/usr/bin/env python3
"""Hoja de contactos: cuadros clave de un video (cuadro de 60 fps → tiempo) en un JPG con su etiqueta.

Uso: python3 deliciarte/tools/hoja.py <video.mp4> <salida.jpg> [cuadros separados por coma] [ancho_miniatura] [columnas]
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CLAVE = [12, 90, 160, 196, 290, 420, 540, 690, 790, 900, 1000, 1070]


def main():
    vid, out = sys.argv[1], sys.argv[2]
    cuadros = [int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 and sys.argv[3] else CLAVE
    w = int(sys.argv[4]) if len(sys.argv) > 4 else 270
    cols = int(sys.argv[5]) if len(sys.argv) > 5 else 6
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    ims = []
    with tempfile.TemporaryDirectory() as td:
        for f in cuadros:
            p = Path(td) / f'{f}.png'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{f / 60:.4f}', '-i', vid, '-frames:v', '1', str(p)], check=True)
            ims.append(Image.open(p).convert('RGB'))
    h = int(ims[0].height * w / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    hoja = Image.new('RGB', (cols * w, rows * (h + 26)), (14, 6, 8))
    d = ImageDraw.Draw(hoja)
    for i, (f, im) in enumerate(zip(cuadros, ims)):
        x, y = (i % cols) * w, (i // cols) * (h + 26)
        hoja.paste(im.resize((w, h), Image.LANCZOS), (x, y + 26))
        d.text((x + 6, y + 5), f'f{f} · {f / 60:.2f} s', font=font, fill=(246, 237, 225))
    hoja.save(out, quality=88)
    print(out)


if __name__ == '__main__':
    main()
