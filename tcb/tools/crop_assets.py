#!/usr/bin/env python3
"""Recorta logo y fotos de las capturas de Instagram (assets/_capturas, no versionadas)
y genera la textura de grano. Uso: python3 tools/crop_assets.py"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, glob, os, json
R = os.path.join(os.path.dirname(__file__), '..', 'assets')
cap = lambda n: glob.glob(os.path.join(R, '_capturas', f'{n:02d}_*.png'))[0]

def photo_band(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    white = (a.min(axis=2) > 244).mean(axis=1) > 0.97
    best, s = (0, 0), None
    for y, w in enumerate(list(white) + [True]):
        if not w and s is None: s = y
        if w and s is not None:
            if y - s > best[1] - best[0]: best = (s, y)
            s = None
    return best

# nombre, captura, recorte relativo a la foto (x0,y0,x1,y1 en fracción) , alt
FOTOS = [
 ('burger-carne-y-pollo', 2, (0, 0, 1, 1), 'Hamburguesa con carne y pollo empanizado, queso derretido, lechuga y tomate en pan brioche'),
 ('burger-queso-panela',  3, (0, 0, 1, 1), 'Hamburguesa con queso derretido y panela a la plancha, lechuga y tomate, servida con papas a la francesa'),
 ('burgers-para-llevar',  4, (0, 0.05, 0.86, 1), 'Dos hamburguesas con papas a la francesa en sus cajas de The Cheese Burger'),
 ('burger-con-mac',       5, (0, 0, 1, 1), 'Hamburguesa con carne, pollo empanizado y macarrón con queso, junto a una malteada'),
 ('burger-con-papas',     6, (0, 0, 1, 1), 'Hamburguesa con tocino, queso derretido y papas a la francesa dentro del pan'),
 ('burger-guacamole',     7, (0, 0, 1, 1), 'Hamburguesa con guacamole, queso, trozos de carne dorada y aderezo'),
 ('tenders-con-salsa',   10, (0, 0, 1, 1), 'Tender de pollo empanizado bañado en salsa sobre una charola con papas'),
 ('chicken-sandwich',    11, (0, 0, 1, 1), 'Sándwich de pollo empanizado bañado en salsa, con lechuga, en pan brioche'),
]
report = []
for name, n, (fx0, fy0, fx1, fy1), alt in FOTOS:
    im = Image.open(cap(n)).convert('RGB')
    y0, y1 = photo_band(im); W = im.width; H = y1 - y0
    box = (int(fx0 * W), y0 + int(fy0 * H), int(fx1 * W), y0 + int(fy1 * H))
    ph = im.crop(box)
    for w in (1080, 640):
        o = ph.resize((w, round(ph.height * w / ph.width)), Image.LANCZOS)
        o.save(os.path.join(R, 'fotos', f'{name}-{w}.webp'), quality=82 if w == 1080 else 78, method=6)
    report.append(dict(archivo=name, captura=n, w=ph.width, h=ph.height, alt=alt))

# logo: disco negro de la captura del perfil
im = Image.open(cap(1)).convert('RGB'); a = np.asarray(im).astype(int)
dark = a.max(axis=2) < 45
dark[:600] = False; dark[2200:] = False   # fuera barra de estado y botones
ys, xs = np.where(dark); 
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
cx, cy, r = (x0 + x1) / 2, (y0 + y1) / 2, min(x1 - x0, y1 - y0) / 2
S = 4
box = (int(cx - r), int(cy - r), int(cx + r), int(cy + r))
lg = im.crop(box).convert('RGBA'); n = lg.width
m = Image.new('L', (n * S, n * S), 0); ImageDraw.Draw(m).ellipse((S * 3, S * 3, n * S - S * 3, n * S - S * 3), fill=255)
lg.putalpha(m.resize((n, n), Image.LANCZOS))
lg.resize((512, 512), Image.LANCZOS).save(os.path.join(R, 'logo.png'), optimize=True)
lg.resize((192, 192), Image.LANCZOS).save(os.path.join(R, 'logo-192.png'), optimize=True)
report.append(dict(archivo='logo', captura=1, box=[int(v) for v in box]))

# grano: máscara de tinta gastada (alfa), mosaico de 512 px que repite sin costura
rng = np.random.default_rng(7); n = 320
def tile_noise(sigma):
    z = rng.random((n, n)); big = np.tile(z, (3, 3))
    g = Image.fromarray((big * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(sigma))
    g = np.asarray(g).astype(float)[n:2 * n, n:2 * n]
    return (g - g.min()) / (g.max() - g.min())
fine, mid, coarse = tile_noise(0.7), tile_noise(3), tile_noise(14)
v = 0.45 * fine + 0.33 * mid + 0.22 * coarse
hole = np.clip((0.41 + 0.10 * (coarse - 0.5) - v) * 14, 0, 1)      # 1 = tinta perdida
alpha = (255 * (1 - 0.92 * hole)).astype('uint8')
g = Image.new('LA', (n, n), 255); g.putalpha(Image.fromarray(alpha))
g.save(os.path.join(R, 'tex', 'grano.png'), optimize=True)
hole2 = np.clip((0.345 + 0.12 * (coarse - 0.5) - v) * 16, 0, 1)    # versión suave para titulares y gis
g2 = Image.new('LA', (n, n), 255); g2.putalpha(Image.fromarray((255 * (1 - 0.85 * hole2)).astype('uint8')))
g2.save(os.path.join(R, 'tex', 'grano-suave.png'), optimize=True)
json.dump(report, open(os.path.join(R, 'assets_report.json'), 'w'), ensure_ascii=False, indent=1)
print('ok', len(FOTOS), 'fotos')
