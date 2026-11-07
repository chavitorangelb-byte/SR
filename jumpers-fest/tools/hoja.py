# Hoja de contactos con 12 cuadros clave del preview (fase 6).
# Uso: python3 tools/hoja.py build/frames_preview_540 review/fase6/hoja_12_cuadros.jpg
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

src, out = Path(sys.argv[1]), Path(sys.argv[2])
PASO = 2  # el preview va a 30 fps: un cuadro de salida cada 2 cuadros de 60 fps
CLAVE = [
    (60, 'Hook: el tubo escribe la búsqueda'),
    (166, 'El tubo traza el celular'),
    (232, 'Portada real'),
    (300, '“TU INFLABLE” y catálogo'),
    (430, 'Tarjetas en 3D · “ELIGE”'),
    (540, 'La descripción sale al 3D'),
    (700, '“APARTA / EN UN MENSAJE”'),
    (790, 'Push-in: colonia y teclado'),
    (884, 'El botón se infla como cojín'),
    (1040, 'Postal grande · Arma tu fiesta'),
    (1300, 'El tubo se infla en arcoíris'),
    (1620, 'End card'),
]
try:
    fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
    fnt2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
except OSError:
    fnt = fnt2 = None
cols, w, h = 6, 300, 533
sheet = Image.new('RGB', (cols * (w + 10) + 10, 2 * (h + 64) + 10), (247, 245, 242))
d = ImageDraw.Draw(sheet)
for k, (f, txt) in enumerate(CLAVE):
    im = Image.open(src / f'{f // PASO:05d}.png').convert('RGB').resize((w, h), Image.LANCZOS)
    x = 10 + (k % cols) * (w + 10)
    y = 10 + (k // cols) * (h + 64)
    sheet.paste(im, (x, y + 50))
    d.text((x + 2, y + 4), f'f{f} · {f / 60:.2f} s', fill=(102, 99, 95), font=fnt2)
    d.text((x + 2, y + 24), txt, fill=(27, 27, 27), font=fnt)
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out, quality=88)
print(out, sheet.size)
