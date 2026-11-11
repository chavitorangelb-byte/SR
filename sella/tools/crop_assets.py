#!/usr/bin/env python3
"""Recorta los assets de Sella Eventos desde las capturas (iPhone 1320x2868).
Fuente: sella/capturas-originales (no se versionan). Salida: sella/assets.
Solo recortes: no se redibuja ni recolorea nada; la UI de Instagram se deja fuera recortando."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
CAP, OUT = ROOT / "capturas-originales", ROOT / "assets"

FOTOS = {  # nombre: (captura, caja)
    "foto_01_mesas_morado": ("14_ig_post_morado_dorado.png", (0, 322, 1320, 1423)),
    "foto_02_patio_ladrillo": ("13_ig_post_ladrillo.png", (0, 509, 1320, 1616)),
    "foto_03_mesas_azul_blanco": ("12_ig_post_azul_blanco.png", (0, 640, 1320, 1616)),
    "foto_04_mesas_alberca": ("07_foto_alberca.jpg", None),
    "foto_05_patio_mesas_blancas": ("09_ig_patio_mesas_blancas.png", (0, 376, 1320, 2529)),
    "foto_06_mesa_dorado": ("14_ig_post_morado_dorado.png", (0, 1946, 1320, 2723)),
    "foto_07_mesa_infantil_roja_BAJA_RES": ("03_ig_grid1.png", (441, 1026, 879, 1523)),
    "foto_08_sillas_tiffany_flores_BAJA_RES": ("03_ig_grid1.png", (882, 452, 1320, 938)),
}
LOGO = ("01_ig_foto_perfil.png", (659, 1261, 434))  # centro x, y, radio

def main():
    for name, (src, box) in FOTOS.items():
        im = Image.open(CAP / src).convert("RGB")
        if box: im = im.crop(box)
        im.save(OUT / f"{name}.jpg", quality=93)
        print(name, im.size)
    src, (cx, cy, r) = LOGO
    im = Image.open(CAP / src).convert("RGBA").crop((cx - r, cy - r, cx + r, cy + r))
    S = 4
    m = Image.new("L", (2 * r * S, 2 * r * S), 0)
    ImageDraw.Draw(m).ellipse((S * 3, S * 3, 2 * r * S - S * 3, 2 * r * S - S * 3), fill=255)
    im.putalpha(m.resize((2 * r, 2 * r), Image.LANCZOS))
    im.save(OUT / "logo-circulo.png")
    print("logo", im.size)

if __name__ == "__main__":
    main()
