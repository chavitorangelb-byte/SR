# Prepara las fotos y el logo de Jumpers Fest para la página (web/img).
# - Recortes por encuadre: nunca se escala por encima de la resolución real (solo se reduce).
# - Exposición: curva suave igual en R, G y B (no toca el tono; el arcoíris conserva sus colores).
# - Logo: se recorta por color (fondo blanco conectado al borde → transparente) sin tocar el trazo.
# Uso: python3 tools/prep_img.py
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets'
OUT = ROOT / 'web' / 'img'
OUT.mkdir(parents=True, exist_ok=True)

MAX_W = 1080  # 360 px CSS × 3 de densidad: más que eso no se ve en ningún celular


def tone(im, gamma=1.0, lift=0.0):
    """Curva suave de exposición, idéntica en los tres canales."""
    if gamma == 1.0 and lift == 0.0:
        return im
    x = np.arange(256) / 255.0
    y = x ** gamma
    y = y + lift * (1 - y) * y * 4  # sube medios sin quemar blancos ni lavar negros
    lut = np.clip(np.round(y * 255), 0, 255).astype(np.uint8).tolist()
    return im.point(lut * 3)


def save(im, name, q=86):
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    path = OUT / name
    im.save(path, quality=q, optimize=True, progressive=True)
    return {'archivo': name, 'px': list(im.size), 'kb': round(path.stat().st_size / 1024)}


def photo(src, box, name, gamma=1.0, lift=0.0, q=86):
    im = Image.open(SRC / src).convert('RGB')
    if box:
        im = im.crop(box)
    im = tone(im, gamma, lift)
    return save(im, name, q)


report = {}
# Rainbow Jump (foto_01, 427×575). La barra oscura del borde derecho (x≥412, y≥478) queda fuera.
report['rainbow_45'] = photo('foto_01_rainbow_jumper.jpg', (0, 28, 408, 538), 'rainbow_45.jpg', 0.97)
report['rainbow_11'] = photo('foto_01_rainbow_jumper.jpg', (0, 66, 408, 474), 'rainbow_11.jpg', 0.97)
# Castle Jump: foto_06 (jardín, 1320×1591, la de mejor resolución) para la ficha; 07 y 02 en la galería.
report['castle_11'] = photo('foto_06_castle_jump_jardin.jpg', (110, 491, 1210, 1591), 'castle_11.jpg', 0.9, 0.03)
report['castle_terraza_11'] = photo('foto_07_castle_jump_terraza.jpg', (60, 0, 1278, 1218), 'castle_terraza_11.jpg', 1.0)
report['castle_parque_11'] = photo('foto_02_castle_jumper.jpg', (0, 36, 425, 461), 'castle_parque_11.jpg', 1.0)
# Magic Jump (foto_03, castillo con resbaladilla: por confirmar con el dueño).
report['magic_11'] = photo('foto_03_castillo_resbaladilla.jpg', (0, 22, 427, 449), 'magic_11.jpg', 0.92, 0.02)
# Arma tu fiesta (foto_08) y foto de grupo (04). foto_05 queda para el cierre del video.
report['fiesta'] = photo('foto_08_combo_mobiliario_infantil.jpg', (0, 40, 1320, 975), 'fiesta_mobiliario.jpg', 0.9, 0.03)
report['todos'] = photo('foto_04_castillos_y_arcoiris.jpg', None, 'todos_castillos_arcoiris.jpg', 0.98)


# ---------- Logo: recorte por color ----------
def key_logo():
    im = Image.open(SRC / 'logo_jumpers.jpg').convert('RGB')
    a = np.asarray(im).astype(np.float32)
    white = a.min(axis=2) >= 236
    # fondo = blanco conectado al borde (relleno por inundación); el blanco dentro de la etiqueta se queda
    h, w = white.shape
    bg = np.zeros_like(white)
    stack = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    while stack:
        y, x = stack.pop()
        if bg[y, x] or not white[y, x]:
            continue
        x0 = x
        while x0 > 0 and white[y, x0 - 1] and not bg[y, x0 - 1]:
            x0 -= 1
        x1 = x
        while x1 < w - 1 and white[y, x1 + 1] and not bg[y, x1 + 1]:
            x1 += 1
        bg[y, x0:x1 + 1] = True
        for yy in (y - 1, y + 1):
            if 0 <= yy < h:
                row = white[yy, x0:x1 + 1] & ~bg[yy, x0:x1 + 1]
                for xx in np.nonzero(row)[0]:
                    stack.append((yy, x0 + xx))
    # borde suavizado: en la franja de 2 px junto al fondo, "color a alfa" contra blanco (desmultiplica)
    bgimg = Image.fromarray((bg * 255).astype(np.uint8))
    near = np.asarray(bgimg.filter(ImageFilter.MaxFilter(5))) > 0
    edge = near & ~bg
    alpha = np.ones((h, w), np.float32)
    alpha[bg] = 0
    da = (255 - a) / 255.0
    ea = np.clip(da.max(axis=2), 0, 1)
    alpha[edge] = ea[edge]
    rgb = a.copy()
    m = edge & (alpha > 0.004)
    rgb[m] = 255 - (255 - a[m]) / alpha[m][:, None]
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).round().astype(np.uint8)
    out = Image.fromarray(rgba, 'RGBA')
    bbox = out.getbbox()
    pad = 6
    out = out.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad)))
    full = ROOT / 'assets' / 'derivados'
    full.mkdir(exist_ok=True)
    out.save(full / 'logo_jumpers_transparente.png', optimize=True)  # resolución completa, para el video
    web = out.resize((720, round(out.height * 720 / out.width)), Image.LANCZOS)  # 240 px CSS × 3
    web.save(OUT / 'logo_jumpers.png', optimize=True)
    # verificación: sobre blanco debe quedar idéntico al original
    comp = Image.new('RGB', out.size, (255, 255, 255))
    comp.paste(out, (0, 0), out)
    orig = im.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad)))
    diff = np.abs(np.asarray(comp).astype(int) - np.asarray(orig).astype(int))
    return {'archivo': 'logo_jumpers.png', 'px': list(web.size), 'completo_px': list(out.size), 'kb': round((OUT / 'logo_jumpers.png').stat().st_size / 1024),
            'dif_max_sobre_blanco': int(diff.max()), 'dif_media': round(float(diff.mean()), 3)}


report['logo'] = key_logo()
(ROOT / 'review' / 'fase0').mkdir(parents=True, exist_ok=True)
(ROOT / 'review' / 'fase0' / 'imagenes.json').write_text(json.dumps(report, indent=1, ensure_ascii=False))
for k, v in report.items():
    print(k, v)
