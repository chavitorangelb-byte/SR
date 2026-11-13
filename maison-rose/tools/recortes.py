#!/usr/bin/env python3
"""Recortes aprobados en la fase 1 (quita barras, insignias y texto). Sin recolorear. Salida: assets/recortes/."""
from pathlib import Path
from PIL import Image

A = Path(__file__).resolve().parent.parent / 'assets'
# nombre de salida: (archivo, caja izquierda, arriba, derecha, abajo)
R = {
    'logo': ('00_logo_maison_rose_silueta.jpg', None),
    'galleta_nueces': ('01_galleta_chispas_nueces.jpg', (0, 0, 1320, 1750)),
    'galleta_partida': ('02_galleta_chocolate_partida.jpg', (0, 130, 1320, 1630)),
    'trianon': ('03_pastel_trianon_frutos_rojos.jpg', (0, 0, 1320, 1470)),
    'millefeuille': ('04_mille_feuille_corte.jpg', (0, 0, 1320, 1470)),
    'flan': ('05_flan_parisino.jpg', (0, 450, 1215, 1830)),
    'painsuisse': ('06_pain_suisse_hojaldre.jpg', (0, 20, 1320, 1540)),
    'berlinesas': ('07_berlinesas_rellenas.jpg', (60, 520, 1320, 1700)),
    'conchas': ('08_conchas_galleta_chispas.jpg', (60, 140, 1300, 1560)),
    'hojaldres_fruta': ('09_charola_hojaldres_fruta.jpg', (0, 0, 1020, 1260)),
    'galletas_apiladas': ('10_galletas_apiladas_catalogo.jpg', (100, 40, 1100, 1240)),
}
out = A / 'recortes'
out.mkdir(exist_ok=True)
for name, (f, box) in R.items():
    im = Image.open(A / f).convert('RGB')
    if name == 'logo':
        # círculo blanco del perfil: se mide y se recorta al cuadrado que lo contiene; la máscara circular se aplica al dibujar
        import numpy as np
        a = np.asarray(im).astype(int)
        white = (a.min(axis=2) > 248)
        ys, xs = np.where(white)
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        print('círculo del logo', box)
    im = im.crop(box)
    # las capturas tienen la mitad de detalle real: se guardan a 50 % (LANCZOS), que es su resolución útil
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    im.save(out / f'{name}.jpg', quality=92)
    print(name, im.size)
