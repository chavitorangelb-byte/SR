#!/usr/bin/env python3
"""Recorta los assets de Ana Gaby Repostería desde las capturas que mandó Elevate (iPhone 1320x2868).

Fuente: assets/_capturas/*.png (no se versionan: traen nombres y fotos de quienes dejaron reseña).
Salida: assets/*.jpg|png con los nombres del brief + web/img/* para la página.

Reglas:
- Solo recortes del material real del negocio (su Instagram y su ficha de Google). No se redibuja nada.
- Los íconos de Instagram/Google (carrusel, corazón, barra de desplazamiento) se quitan recortando, nunca pintando encima.
- Exposición: niveles suaves solo en luminancia; Cb/Cr intactos, así el color del betún no cambia.
- Nunca se escala por encima de la resolución real (solo se reduce, y únicamente la portada para la web).
- Fuera: fotos con personas, nombres escritos o personajes con licencia.
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CAP = ROOT / "assets" / "_capturas"
OUT = ROOT / "assets"
WEB = ROOT / "web" / "img"

# --- Instagram: rejilla 3:4 de 438x584. Columnas x 0-437 / 441-878 / 882-1319. -----------------
COLS = {0: 0, 1: 441, 2: 882}
TILE_W, TILE_H = 438, 584
# Ventana 4:5 que deja fuera el ícono de carrusel (esquina sup. der., y 20-75) y la barra de iOS (x > 419).
TILE_CROP = (19, 84, 419, 584)  # 400 x 500

# Filas detectadas por las franjas blancas entre mosaicos (ver tools/README en el informe).
IG = [
    # (archivo, captura, columna, y del mosaico, nombre de tarjeta, pestaña)
    ("foto_01_pastel_fresas_crema", "ig_perfil.png", 0, 1780, "Pastel de fresas con crema", "pasteles"),
    ("foto_02_cupcakes_flores", "ig_perfil.png", 1, 1780, "Cupcakes de flores", "postres"),
    ("foto_03_tarta_frutos_rojos", "ig_perfil.png", 2, 1780, "Tarta de frutos rojos", "postres"),
    ("foto_04_frasco_galletas_corazon", "ig_grid_sanvalentin.png", 0, 463, "Frasco de galletas de corazón", "galletas"),
    ("foto_05_caja_galletas_chocolate", "ig_grid_sanvalentin.png", 1, 463, "Caja de galletas de chocolate", "galletas"),
    ("foto_06_galletas_chispas_chocolate", "ig_grid_sanvalentin.png", 2, 1050, "Galletas de chispas de chocolate", "galletas"),
    ("foto_07_galletas_corazon", "ig_grid_sanvalentin.png", 1, 2224, "Galletas con corazón", "galletas"),
    ("foto_08_pastel_san_valentin", "ig_grid_sanvalentin.png", 0, 2224, "Pastel de San Valentín", "pasteles"),
    ("foto_09_mesa_postres", "ig_grid_mesas.png", 0, 1448, "Mesa de postres", "postres"),
    ("foto_10_mesa_postres_pasteles", "ig_grid_mesas.png", 2, 1448, "Pasteles para mesa de postres", "postres"),
]

# --- Ficha de Google (visor de fotos): dos columnas x 12-654 / 666-1308 con esquinas redondeadas. ---
# Recorte 4:5 de 600x750 dentro del mosaico (20 px hacia dentro: sin esquinas ni íconos de Google).
GOOGLE = [
    ("foto_11_pastel_listones", "maps_fotos_1.png", (686, 796, 1286, 1546), "Pastel con moños", "pasteles"),
    ("foto_12_pastel_corazon", "maps_fotos_3.png", (32, 1645, 632, 2395), "Pastel de corazón", "pasteles"),
]

# Su local con el letrero (visor de Google a pantalla completa). Fuera: botones arriba (y < 330),
# íconos de la derecha (y > 2360) y la etiqueta inferior.
LOCAL = ("foto_00_local_letrero", "maps_foto_local.png", (0, 340, 1320, 2340))


def load(name):
    return Image.open(CAP / name).convert("RGB")


def gentle_exposure(img, strength=0.35, lo_t=4.0, hi_t=250.0):
    """Niveles suaves solo en luminancia (Y de YCbCr). Si la foto ya tiene rango, no se toca."""
    ycc = np.asarray(img.convert("YCbCr")).astype(np.float64)
    y = ycc[:, :, 0]
    lo, hi = np.percentile(y, 0.5), np.percentile(y, 99.5)
    if lo <= lo_t + 6 and hi >= hi_t - 6:
        return img, {"lo": round(lo, 1), "hi": round(hi, 1), "aplicada": False}
    stretched = (y - lo) / max(hi - lo, 1) * (hi_t - lo_t) + lo_t
    ycc[:, :, 0] = np.clip(y + strength * (stretched - y), 0, 255)
    out = Image.fromarray(ycc.round().astype(np.uint8), "YCbCr").convert("RGB")
    return out, {"lo": round(lo, 1), "hi": round(hi, 1), "aplicada": True}


def save_jpg(img, path, q=92):
    img.save(path, "JPEG", quality=q, subsampling=0, optimize=True, progressive=True)


def logo():
    """Letrero circular AG: se encuentra el borde del disco sobre la pared y se recorta con máscara suave.

    El disco (gris claro, L~162) está sobre una pared más clara (L~190). Por cada rayo se entra desde la
    pared hacia el centro y se marca el primer cruce del umbral medio: así el aro negro interior no
    confunde la detección. Se saltan los rayos de abajo (30°-150°), donde los ramos tapan el borde.
    En la foto el disco sale un poco ovalado por la perspectiva (más alto que ancho): se ajusta una
    elipse con descarte iterativo de atípicos (la flor rosa toca el borde arriba a la derecha).
    Lo que queda dentro (incluidas las puntas de los ramos) es la foto tal cual: no se repinta nada.
    """
    src = load(LOCAL[1])
    a = np.asarray(src).astype(np.float64)
    L = a[:, :, 0] * 0.299 + a[:, :, 1] * 0.587 + a[:, :, 2] * 0.114
    cx0, cy0 = 745.0, 1057.0

    def lum(r, ang):
        x, y = cx0 + r * math.cos(ang), cy0 + r * math.sin(ang)
        x0, y0 = int(x), int(y)
        fx, fy = x - x0, y - y0
        return (L[y0, x0] * (1 - fx) * (1 - fy) + L[y0, x0 + 1] * fx * (1 - fy)
                + L[y0 + 1, x0] * (1 - fx) * fy + L[y0 + 1, x0 + 1] * fx * fy)

    pts = []
    for k10 in range(0, 3600, 10):
        k = k10 / 10
        if 30 <= k <= 150:
            continue
        ang = math.radians(k)
        wall = np.median([lum(r, ang) for r in range(425, 440)])
        disc = np.median([lum(r, ang) for r in range(355, 370)])
        if wall - disc < 12:
            continue
        thr = (wall + disc) / 2
        rs = np.arange(440, 330, -0.5)
        vs = np.convolve(np.array([lum(r, ang) for r in rs]), np.ones(5) / 5, mode="same")
        for i in range(3, len(rs) - 3):
            if vs[i] < thr and vs[i + 1] < thr and vs[i + 2] < thr:
                r1, r2, v1, v2 = rs[i - 1], rs[i], vs[i - 1], vs[i]
                hit = r1 + (thr - v1) / (v2 - v1) * (r2 - r1) if v2 != v1 else r2
                pts.append((cx0 + hit * math.cos(ang), cy0 + hit * math.sin(ang)))
                break
    P = np.array(pts)
    keep = np.ones(len(P), bool)
    for _ in range(6):  # círculo robusto para separar atípicos
        Q = P[keep]
        A = np.c_[2 * Q[:, 0], 2 * Q[:, 1], np.ones(len(Q))]
        c = np.linalg.lstsq(A, (Q ** 2).sum(1), rcond=None)[0]
        R = math.sqrt(c[2] + c[0] ** 2 + c[1] ** 2)
        res = np.hypot(P[:, 0] - c[0], P[:, 1] - c[1]) - R
        mad = np.median(np.abs(res[keep])) * 1.4826
        keep = np.abs(res) < max(2.0, 3 * mad)
    Q = P[keep]  # elipse alineada a los ejes: A x² + C y² + D x + E y = 1
    M = np.c_[Q[:, 0] ** 2, Q[:, 1] ** 2, Q[:, 0], Q[:, 1]]
    Aa, Cc, Dd, Ee = np.linalg.lstsq(M, np.ones(len(Q)), rcond=None)[0]
    xc, yc = -Dd / (2 * Aa), -Ee / (2 * Cc)
    F = 1 + Aa * xc ** 2 + Cc * yc ** 2
    ax, ay = math.sqrt(F / Aa), math.sqrt(F / Cc)
    rr = np.sqrt(((Q[:, 0] - xc) / ax) ** 2 + ((Q[:, 1] - yc) / ay) ** 2)
    rms = float(np.sqrt(((rr - 1) ** 2).mean())) * ax
    ax_m, ay_m = ax - 2.0, ay - 2.0  # hacia dentro: sin halo de la pared
    x0, y0 = int(math.floor(xc - ax_m)) - 2, int(math.floor(yc - ay_m)) - 2
    x1, y1 = int(math.ceil(xc + ax_m)) + 2, int(math.ceil(yc + ay_m)) + 2
    crop = a[y0:y1, x0:x1].copy()
    h, w = crop.shape[:2]
    ss = 4
    yy, xx = np.mgrid[0:h * ss, 0:w * ss]
    px = x0 + (xx + 0.5) / ss - 0.5
    py = y0 + (yy + 0.5) / ss - 0.5
    inside = ((px - xc) / ax_m) ** 2 + ((py - yc) / ay_m) ** 2 <= 1.0
    alpha = inside.reshape(h, ss, w, ss).mean(axis=(1, 3))
    rgba = np.dstack([crop, alpha * 255]).round().clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT / "logo_letrero_ag.png", optimize=True)
    return {"centro": [round(xc, 1), round(yc, 1)], "semiejes": [round(ax, 1), round(ay, 1)],
            "px": [w, h], "puntos_borde": int(len(Q)), "rms_px": round(rms, 2),
            "nota": "Foto del letrero, no archivo de diseño: suave, con JPEG y las puntas de los ramos abajo."}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    WEB.mkdir(parents=True, exist_ok=True)
    report = {"logo_letrero_ag": logo(), "fotos": {}}

    name, cap, box = LOCAL
    img, info = gentle_exposure(load(cap).crop(box))
    save_jpg(img, OUT / f"{name}.jpg")
    save_jpg(img, WEB / f"{name}.jpg", q=84)
    report["fotos"][name] = {"tarjeta": "Portada", "fuente": cap, "px": list(img.size), **info}

    for name, cap, col, ty, desc, tab in IG:
        tile = load(cap).crop((COLS[col], ty, COLS[col] + TILE_W, ty + TILE_H))
        img, info = gentle_exposure(tile.crop(TILE_CROP))
        save_jpg(img, OUT / f"{name}.jpg")
        save_jpg(img, WEB / f"{name}.jpg", q=88)
        report["fotos"][name] = {"tarjeta": desc, "pestana": tab, "fuente": cap, "px": list(img.size), **info}

    for name, cap, box, desc, tab in GOOGLE:
        img, info = gentle_exposure(load(cap).crop(box))
        save_jpg(img, OUT / f"{name}.jpg")
        save_jpg(img, WEB / f"{name}.jpg", q=86)
        report["fotos"][name] = {"tarjeta": desc, "pestana": tab, "fuente": cap, "px": list(img.size), **info}

    (OUT / "assets_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
