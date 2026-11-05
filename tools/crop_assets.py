#!/usr/bin/env python3
"""Recorta los assets de Florería Roma desde las capturas de Instagram (iPhone 1320x2868).

Fuente: assets/_capturas/*.png (capturas que mandó Elevate).
Salida: assets/*.jpg|png con los nombres del brief + web/img/* optimizadas.

Reglas:
- Solo recortes del material real del negocio: no se redibuja nada.
- Se quitan los íconos de la interfaz de Instagram (pin, carrusel, pestañas) recortando, nunca pintando encima.
- Corrección de exposición suave y solo de luminancia (no cambia el tono de las flores).
- Nunca se escala por encima de la resolución real.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CAP = ROOT / "assets" / "_capturas"
OUT = ROOT / "assets"
WEB = ROOT / "web" / "img"

# Rejilla de Instagram en estas capturas: columnas x 0-437 / 441-878 / 882-1319, mosaicos de 438x584.
TILE_W, TILE_H = 438, 584
COLS = {0: 0, 1: 441, 2: 882}

# (archivo, captura, columna, y del mosaico, descripción)
TILES = [
    ("arreglo_03_caja_tulipanes", "ig_perfil_grid1.png", 0, 1930, "Caja de tulipanes"),
    ("arreglo_04_ramo_kraft_pastel", "ig_perfil_grid1.png", 1, 1930, "Ramo kraft pastel"),
    ("arreglo_05_tulipanes_y_rosas", "ig_grid3.png", 2, 484, "Tulipanes y rosas"),
    ("arreglo_06_gerberas_naranjas", "ig_grid3.png", 1, 1071, "Gerberas naranjas"),
    ("arreglo_07_tulipanes_fucsia", "ig_grid3.png", 2, 1658, "Tulipanes fucsia"),
    ("arreglo_08_girasoles", "ig_grid6.png", 0, 387, "Girasoles"),
    ("arreglo_09_rosas_con_hortensia", "ig_grid6.png", 0, 974, "Rosas con hortensia"),
    ("arreglo_10_rosas_rojo_y_blanco", "ig_grid6.png", 1, 1561, "Rosas rojo y blanco"),
    ("arreglo_11_mixto_con_gerbera", "ig_grid6.png", 2, 974, "Mixto con gerbera"),
]
# Recorte 4:5 dentro del mosaico que deja fuera el ícono de pin/carrusel (esquina superior derecha,
# y 20-75) y la barra de desplazamiento de iOS (x > 424).
TILE_CROP = (19, 84, 419, 584)  # 400 x 500

# Fotos grandes (visor de publicación de Instagram). Se deja fuera la UI: botones ... y X arriba,
# corazón/compartir a la derecha abajo, barra inferior.
LARGE = {
    # foto ocupa y 262-2607 a lo ancho; botones arriba hasta y~330; corazón desde y~2367 (x>1180)
    "arreglo_01_rosas_rojas": ("ig_post_rosas_rojas.png", (0, 340, 1320, 2350)),
    # foto ocupa y ~444-2420; corazón en (1186-1258, 2367-2440)
    "arreglo_02_caja_rosas_eucalipto": ("ig_post_caja_ventana.png", (0, None, 1320, 2362)),
}

POST_PRECIOS = ("ig_post_tonos_rosas_blush.png", (0, 774, 1320, 2094))


def load(name):
    return Image.open(CAP / name).convert("RGB")


def photo_top(img, x0=200, x1=900, start=300, end=700):
    """Primera fila con textura (la foto) tras la franja lisa de la UI."""
    a = np.asarray(img).astype(float)
    for y in range(start, end):
        if a[y, x0:x1].std() > 6 and a[y + 2, x0:x1].std() > 6:
            return y + 2
    raise RuntimeError("no se encontró el borde de la foto")


def gentle_exposure(img, strength=0.35, lo_t=4.0, hi_t=250.0):
    """Niveles suaves solo en luminancia (Y de YCbCr). Cb/Cr intactos: el color de las flores no cambia."""
    ycc = np.asarray(img.convert("YCbCr")).astype(np.float64)
    y = ycc[:, :, 0]
    lo, hi = np.percentile(y, 0.5), np.percentile(y, 99.5)
    # Solo corrige si de verdad falta rango; si la foto ya está bien expuesta no la toca.
    if lo <= lo_t + 6 and hi >= hi_t - 6:
        return img, {"lo": round(lo, 1), "hi": round(hi, 1), "applied": False}
    stretched = (y - lo) / max(hi - lo, 1) * (hi_t - lo_t) + lo_t
    y2 = y + strength * (stretched - y)
    ycc[:, :, 0] = np.clip(y2, 0, 255)
    out = Image.fromarray(ycc.round().astype(np.uint8), "YCbCr").convert("RGB")
    return out, {"lo": round(lo, 1), "hi": round(hi, 1), "applied": True}


def save_jpg(img, path, q=92):
    img.save(path, "JPEG", quality=q, subsampling=0, optimize=True, progressive=True)


def logo():
    img = np.asarray(load("ig_logo.png")).astype(np.float64)
    # Ajuste de círculo por rayos desde el centro aproximado (borde olivo -> fondo).
    cx0, cy0 = 659.0, 1261.0
    pts = []
    for k in range(144):
        ang = 2 * math.pi * k / 144
        for r10 in range(3800, 4700):
            r = r10 / 10
            x, y = cx0 + r * math.cos(ang), cy0 + r * math.sin(ang)
            p = img[int(round(y)), int(round(x))]
            if abs(p[0] - 171) + abs(p[1] - 169) + abs(p[2] - 133) > 40:
                pts.append((x, y))
                break
    P = np.array(pts)
    A = np.c_[2 * P[:, 0], 2 * P[:, 1], np.ones(len(P))]
    c = np.linalg.lstsq(A, (P ** 2).sum(1), rcond=None)[0]
    xc, yc = c[0], c[1]
    R = math.sqrt(c[2] + xc ** 2 + yc ** 2)
    r_mask = R - 1.0  # 1 px hacia dentro: sin halo del fondo
    size = int(math.ceil(r_mask)) * 2 + 2
    x0, y0 = int(round(xc - size / 2)), int(round(yc - size / 2))
    crop = img[y0:y0 + size, x0:x0 + size].copy()
    # Máscara antialias con supermuestreo 4x4.
    ss = 4
    yy, xx = np.mgrid[0:size * ss, 0:size * ss]
    px = x0 + (xx + 0.5) / ss - 0.5
    py = y0 + (yy + 0.5) / ss - 0.5
    inside = ((px - xc) ** 2 + (py - yc) ** 2) <= r_mask ** 2
    alpha = inside.reshape(size, ss, size, ss).mean(axis=(1, 3))
    # Descontaminación del borde: los píxeles parciales del borde son olivo puro (no hay letras ahí).
    edge = (alpha > 0) & (alpha < 1)
    crop[edge] = [171, 169, 133]
    rgba = np.dstack([crop, alpha * 255]).round().clip(0, 255).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    out.save(OUT / "logo_roma.png", optimize=True)
    return {"centro": [round(xc, 2), round(yc, 2)], "radio": round(R, 2), "lado_px": size}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    WEB.mkdir(parents=True, exist_ok=True)
    report = {"logo": logo()}

    for name, cap, col, ty, desc in TILES:
        tile = load(cap).crop((COLS[col], ty, COLS[col] + TILE_W, ty + TILE_H))
        img = tile.crop(TILE_CROP)
        img, info = gentle_exposure(img)
        save_jpg(img, OUT / f"{name}.jpg")
        save_jpg(img, WEB / f"{name}.jpg", q=86)
        report[name] = {"desc": desc, "px": list(img.size), **info}

    for name, (cap, box) in LARGE.items():
        src = load(cap)
        x0, y0, x1, y1 = box
        if y0 is None:
            y0 = photo_top(src)
        img = src.crop((x0, y0, x1, y1))
        img, info = gentle_exposure(img)
        save_jpg(img, OUT / f"{name}.jpg")
        report[name] = {"px": list(img.size), "box": [x0, y0, x1, y1], **info}

    # Derivados web de las fotos grandes (sin escalar hacia arriba).
    a01 = Image.open(OUT / "arreglo_01_rosas_rojas.jpg")
    # tarjeta 4:5 centrada en el ramo
    w, h = a01.size
    cw = w - 120
    ch = int(cw * 5 / 4)
    top = 470
    card01 = a01.crop((60, top, 60 + cw, top + ch)).resize((800, 1000), Image.LANCZOS)
    save_jpg(card01, WEB / "arreglo_01_rosas_rojas.jpg", q=86)

    a02 = Image.open(OUT / "arreglo_02_caja_rosas_eucalipto.jpg")
    w, h = a02.size
    # Portada: ventana "Spread love, send flowers" + arreglo. Proporción 358:440.
    pw = w
    ph = int(round(pw * 440 / 358))  # 1320 x 1622: incluye el letrero de la ventana y la caja completa
    hero = a02.crop((0, h - ph, pw, h))
    hero = hero.resize((1074, int(round(1074 * hero.size[1] / hero.size[0]))), Image.LANCZOS)
    save_jpg(hero, WEB / "portada_ventana.jpg", q=84)
    # Tarjeta de catálogo 4:5 centrada en la caja
    cw = 1000
    ch = 1250
    card02 = a02.crop(((w - cw) // 2, h - ch, (w - cw) // 2 + cw, h)).resize((800, 1000), Image.LANCZOS)
    save_jpg(card02, WEB / "arreglo_02_caja_rosas_eucalipto.jpg", q=86)

    # Post de precios: solo referencia, no se muestra.
    cap, box = POST_PRECIOS
    save_jpg(load(cap).crop(box), OUT / "post_tonos_rosas_blush_precios.jpg")

    # Logo para web (se usa a 34-120 px CSS; 3x = 360 px máx.)
    lg = Image.open(OUT / "logo_roma.png")
    lg.resize((432, 432), Image.LANCZOS).save(WEB / "logo_roma.png", optimize=True)
    lg.resize((240, 240), Image.LANCZOS).save(WEB / "logo_roma_240.png", optimize=True)

    (OUT / "assets_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    json.dump(report, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
