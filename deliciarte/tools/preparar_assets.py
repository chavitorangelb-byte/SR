"""Fase 1 · DeliciArte: revisa los assets, aplica recortes y máscaras, y genera el reporte.

Solo recorta, enmascara en círculo o desenfoca zonas con texto. No recolorea ni rellena.
Uso: python3 deliciarte/tools/preparar_assets.py
"""
import json
import os
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(RAIZ, "assets", "originales")
PREP = os.path.join(RAIZ, "assets", "preparados")
REV = os.path.join(RAIZ, "review", "fase1")

# Coordenadas en píxeles del original. "blur": zonas a desenfocar (x0, y0, x1, y1), sigma en px.
TRATAMIENTOS = {
    "00_logo_deliciarte.jpg": {
        "circulo": (405, 407, 388),
        "salida": "00_logo_deliciarte.png",
        "nota": "Círculo recortado casi al borde (radio real ≈410 px, sale de la imagen por los 4 lados) y esquinas grises. "
                "Máscara circular de radio 388 px centrada en (405, 407): conserva el anillo crema completo (llega a 335 px). PNG con transparencia.",
    },
    "01_pastel_personalizado_a.jpg": {
        "recorte": (0, 21, 900, 954),
        "fondo": {"ymax": 340, "smin": 70, "vmin": 60, "semilla": (450, 900), "ytop": 186, "xmin": 0, "sigma": 22, "neon_hasta": 215},
        "nota": "Franja blanca de 20 px arriba (captura). Detrás del pastel se lee parcial su letrero de neón (\"…liciArte\" / \"…TELERIA FI…\"): "
                "se desenfoca el fondo (máscara que sigue la silueta del pastel), queda como bokeh. El personaje se muestra como diseño del local, sin nombrarlo.",
    },
    "02_pastel_rosetas_rosa.jpg": {
        "recorte": (0, 0, 888, 1092),
        "fondo": {"ymax": 520, "smin": 28, "vmin": 90, "semilla": (300, 900), "ytop": 0, "xmin": 430, "sigma": 22},
        "nota": "Neón parcial \"Arte / FINA\" a la derecha del piso superior: se desenfoca el fondo siguiendo la silueta del pastel. Barra de interfaz de 12 px en el borde derecho: se recorta.",
    },
    "03_pastel_cumpleanos_infantil.jpg": {
        "recorte": (0, 0, 885, 1073),
        "blur": [((128, 220, 332, 304), 10), ((552, 200, 750, 310), 10)],
        "nota": "\"Perlita\" en el topper de concha (nombre de personaje o de persona) y el letrero \"La más cool de Bikini Bottom\" (nombre de un lugar de una marca): "
                "se desenfocan. \"Feliz Cumpleaños\" y \"Grande como sus sueños\" se quedan. Barra de interfaz en el borde derecho: se recorta.",
    },
    "04_rollos_canela_horno.jpg": {
        "nota": "Sin texto ni personas. Es la foto más suave (cuadro de video): usarla chica. Ojo: son rollos crudos en molde, todavía sin hornear.",
    },
    "05_pastel_corazon_verde_rosa.jpg": {
        "recorte": (0, 0, 732, 1022),
        "nota": "Texto parcial \"Wit… / …ev\" en el borde derecho del corazón (x ≥ 745): se recorta a 732 px de ancho. Foto algo suave.",
    },
    "06_pastel_crema_dorado.jpg": {
        "nota": "\"Happy Birthday\" escrito con betún: es parte del diseño del pastel, no un nombre ni una marca. Se queda tal cual.",
    },
    "07_pastelitos_cuchareables.jpg": {
        "nota": "La etiqueta del vaso dice \"Chocolate\" con su propio monograma DA: es de ellos, no de un tercero. Se queda.",
    },
}

# Ancho máximo en pantalla (px del cuadro 1080) sin que la foto se vea suave.
MAX_PANTALLA = {
    "00_logo_deliciarte.jpg": 700,
    "01_pastel_personalizado_a.jpg": 760,
    "02_pastel_rosetas_rosa.jpg": 880,
    "03_pastel_cumpleanos_infantil.jpg": 880,
    "04_rollos_canela_horno.jpg": 480,
    "05_pastel_corazon_verde_rosa.jpg": 600,
    "06_pastel_crema_dorado.jpg": 820,
    "07_pastelitos_cuchareables.jpg": 700,
}


def nitidez(img):
    g = np.asarray(img.convert("L"), dtype=np.float32)
    lap = g[1:-1, 1:-1] * 4 - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]
    return float(lap.var())


def etiqueta_nitidez(v):
    return "alta" if v >= 200 else "media" if v >= 90 else "baja"


def desenfocar(img, zonas):
    out = img.copy()
    for (x0, y0, x1, y1), sigma in zonas:
        borrosa = img.filter(ImageFilter.GaussianBlur(sigma))
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).rectangle((x0, y0, x1, y1), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(6))
        out = Image.composite(borrosa, out, mask)
    return out


def _bin(m):
    return m.point(lambda v: 255 if v > 127 else 0)


def mascara_fondo(img, f):
    """Fondo = todo lo que no es el pastel, por color (saturación y brillo), arriba de ymax y a la derecha de xmin."""
    hsv = np.asarray(img.convert("HSV")).astype(int)
    cand = Image.fromarray(((hsv[..., 1] > f["smin"]) & (hsv[..., 2] > f["vmin"])).astype(np.uint8) * 255)
    m = cand.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9))  # apertura: quita los trazos del neón
    m = _bin(m.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.MinFilter(11)))  # cierre
    ImageDraw.floodfill(m, f["semilla"], 200)  # el pastel es el componente que toca la semilla
    h = Image.fromarray((np.asarray(m) == 200).astype(np.uint8) * 255).copy()  # copia: fromarray es de solo lectura para floodfill
    W, H = h.size
    for x in range(0, W, 5):  # lo que no conecta con el borde (huecos del pastel) se queda como pastel
        if h.getpixel((x, 0)) == 0:
            ImageDraw.floodfill(h, (x, 0), 128)
    for y in range(0, H, 5):
        for x in (0, W - 1):
            if h.getpixel((x, y)) == 0:
                ImageDraw.floodfill(h, (x, y), 128)
    pastel = Image.fromarray((np.asarray(h) != 128).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))
    bg = np.asarray(pastel) == 0
    bg[f["ymax"]:] = False
    bg[:, : f["xmin"]] = False
    if f["ytop"]:
        bg[: f["ytop"]] = True
    if f.get("neon_hasta"):  # trazos de neón pegados al pastel: claros y sin color
        y1 = f["neon_hasta"]
        neon = (hsv[:y1, :, 1] < 60) & (hsv[:y1, :, 2] > 140)
        bg[:y1] |= np.asarray(Image.fromarray(neon.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
    return Image.fromarray(bg.astype(np.uint8) * 255)


def desenfocar_fondo(img, mask, sigma):
    """Desenfoque normalizado: solo promedia píxeles del fondo, así el color del pastel no se derrama como halo."""
    a = np.asarray(img).astype(np.float32)
    w = (np.asarray(mask) > 127).astype(np.float32)
    wb = np.asarray(Image.fromarray((w * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sigma)), dtype=np.float32) / 255
    canales = []
    for c in range(3):
        num = np.asarray(Image.fromarray((a[..., c] * w).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sigma)), dtype=np.float32) / 255
        canales.append(255 * num / np.maximum(wb, 1e-3))
    borrosa = Image.fromarray(np.clip(np.dstack(canales), 0, 255).astype(np.uint8))
    return Image.composite(borrosa, img, mask.filter(ImageFilter.GaussianBlur(3)))


def preparar(nombre, t):
    img = Image.open(os.path.join(ORIG, nombre)).convert("RGB")
    if "circulo" in t:
        cx, cy, r = t["circulo"]
        s = 4  # máscara supermuestreada para un borde limpio
        m = Image.new("L", (img.width * s, img.height * s), 0)
        ImageDraw.Draw(m).ellipse(((cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s), fill=255)
        m = m.resize(img.size, Image.LANCZOS)
        out = img.convert("RGBA")
        out.putalpha(m)
        return out.crop((cx - r, cy - r, cx + r, cy + r))
    out = desenfocar(img, t.get("blur", []))
    if "fondo" in t:
        out = desenfocar_fondo(out, mascara_fondo(img, t["fondo"]), t["fondo"]["sigma"])
    if "recorte" in t:
        out = out.crop(t["recorte"])
    return out


def tablero(items, ruta):
    f_t = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
    f_n = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    cw, ch, cols = 420, 640, 4
    W, H = cw * cols, 90 + ch * 2
    hoja = Image.new("RGB", (W, H), (36, 8, 14))
    d = ImageDraw.Draw(hoja)
    d.text((20, 18), "DeliciArte · Fase 1 · Inventario de assets", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26), fill=(246, 237, 225))
    d.text((20, 54), "Izquierda: original con zonas marcadas (rojo = se desenfoca, amarillo = lo que se conserva del recorte). Derecha: preparado.", font=f_n, fill=(201, 162, 126))
    for i, it in enumerate(items):
        x, y = (i % cols) * cw, 90 + (i // cols) * ch
        d.rectangle((x + 8, y + 8, x + cw - 8, y + ch - 8), fill=(58, 16, 24), outline=(90, 26, 37))
        orig = Image.open(os.path.join(ORIG, it["archivo"])).convert("RGB")
        dd = ImageDraw.Draw(orig)
        t = TRATAMIENTOS[it["archivo"]]
        for (x0, y0, x1, y1), _ in t.get("blur", []):
            dd.rectangle((x0, y0, x1, y1), outline=(255, 60, 60), width=6)
        if "fondo" in t:
            fm = np.asarray(mascara_fondo(Image.open(os.path.join(ORIG, it["archivo"])).convert("RGB"), t["fondo"])) > 127
            a = np.asarray(orig).copy()
            a[fm] = (a[fm] * 0.45 + np.array([255, 60, 60]) * 0.55).astype(np.uint8)
            orig = Image.fromarray(a)
            dd = ImageDraw.Draw(orig)
        if "recorte" in t:
            dd.rectangle(t["recorte"], outline=(255, 210, 0), width=6)
        if "circulo" in t:
            cx, cy, r = t["circulo"]
            dd.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 210, 0), width=6)
        prep = Image.open(os.path.join(PREP, it["preparado"]))
        for k, im in enumerate((orig, prep)):
            im = im.copy()
            im.thumbnail((190, 300))
            fondo = Image.new("RGB", im.size, (58, 16, 24))
            fondo.paste(im, (0, 0), im if im.mode == "RGBA" else None)
            hoja.paste(fondo, (x + 16 + k * 200, y + 16))
        ty = y + 330
        d.text((x + 18, ty), it["archivo"], font=f_t, fill=(246, 237, 225))
        ty += 28
        lineas = [
            f"Original {it['original_px'][0]}×{it['original_px'][1]} → preparado {it['preparado_px'][0]}×{it['preparado_px'][1]}",
            f"Nitidez: {it['nitidez']} ({it['nitidez_var']:.0f})",
            f"Máximo en pantalla: {it['max_pantalla_px']} px de ancho",
        ]
        for ln in lineas:
            d.text((x + 18, ty), ln, font=f_n, fill=(201, 162, 126))
            ty += 21
        ty += 8
        for ln in envolver(it["nota"], f_n, cw - 40, d):
            d.text((x + 18, ty), ln, font=f_n, fill=(246, 237, 225))
            ty += 20
    hoja.save(ruta, quality=90)


def envolver(texto, font, ancho, d):
    out, linea = [], ""
    for p in texto.split():
        prueba = (linea + " " + p).strip()
        if d.textlength(prueba, font=font) <= ancho:
            linea = prueba
        else:
            out.append(linea)
            linea = p
    if linea:
        out.append(linea)
    return out


def main():
    os.makedirs(PREP, exist_ok=True)
    os.makedirs(REV, exist_ok=True)
    items = []
    for nombre in sorted(TRATAMIENTOS):
        t = TRATAMIENTOS[nombre]
        orig = Image.open(os.path.join(ORIG, nombre))
        prep = preparar(nombre, t)
        salida = t.get("salida", nombre)
        ruta = os.path.join(PREP, salida)
        sin_cambios = not any(k in t for k in ("circulo", "recorte", "blur", "fondo"))
        if sin_cambios:
            shutil.copyfile(os.path.join(ORIG, nombre), ruta)  # sin recomprimir
        elif salida.endswith(".png"):
            prep.save(ruta, optimize=True)
        else:
            prep.save(ruta, quality=95, subsampling=0)
        v = nitidez(orig)
        items.append({
            "archivo": nombre,
            "preparado": salida,
            "original_px": list(orig.size),
            "preparado_px": list(prep.size),
            "nitidez_var": round(v, 1),
            "nitidez": etiqueta_nitidez(v),
            "max_pantalla_px": MAX_PANTALLA[nombre],
            "recorte": t.get("recorte"),
            "desenfoque": [list(z) + [s] for z, s in t.get("blur", [])],
            "fondo_desenfocado": t.get("fondo"),
            "mascara_circulo": t.get("circulo"),
            "nota": t["nota"],
        })
    with open(os.path.join(RAIZ, "assets", "assets_report.json"), "w", encoding="utf-8") as fh:
        json.dump(items, fh, ensure_ascii=False, indent=2)
    tablero(items, os.path.join(REV, "inventario_assets.jpg"))
    for it in items:
        print(f"{it['archivo']:38s} {it['preparado_px']}  nitidez {it['nitidez']}")


if __name__ == "__main__":
    main()
