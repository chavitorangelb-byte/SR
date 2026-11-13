#!/usr/bin/env python3
"""Recorta los assets del brief desde las capturas (assets/_capturas, no se versionan).
Solo recorte: no se redibuja, recolorea ni reescala nada."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

R = Path(__file__).resolve().parent.parent
C = R / 'assets' / '_capturas'
A = R / 'assets'
CORTES = {
    # nombre: (captura, caja, nota)
    '01_logo_baja_resolucion.jpg': ('IMG_8506_logo_perfil.png', (215, 820, 1105, 1705),
        'Foto de perfil. Círculo ≈ 870 px en la captura (ampliación de pantalla). Dice "DETAILIG" (falta la N).'),
    '01b_logo_flyer_ortografia_correcta.jpg': ('IMG_8507_flyer_ppf.png', (0, 720, 620, 1080),
        'Mismo logo en su flyer de PPF (4-jul-2024, no marcado como IA). Dice "DETAILING". Sin panal.'),
    '02_taller_pared_logo.jpg': ('IMG_8513_taller.png', (330, 335, 1300, 1215),
        'Cuadro de un reel. Sin emblema ni póster en el recorte; la silueta del auto sigue siendo reconocible.'),
    '03_pulido_pintura_roja.jpg': ('IMG_8507_flyer_ppf.png', (612, 1195, 1320, 1710),
        'Foto dentro de un flyer. Zona útil como textura sin faro ni boquilla: (250,120)-(610,400) del recorte.'),
}
rep = {}
for nombre, (cap, caja, nota) in CORTES.items():
    im = Image.open(C / cap).convert('RGB').crop(caja)
    im.save(A / nombre, quality=95)
    rep[nombre] = {'captura': cap, 'caja': caja, 'px': im.size, 'nota': nota}
(A / 'assets_report.json').write_text(json.dumps(rep, ensure_ascii=False, indent=1))

# Tablero de inventario
f = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Medium.otf', 22)
W, H, x = 1900, 640, 30
b = Image.new('RGB', (W, H), (10, 10, 10)); d = ImageDraw.Draw(b)
for nombre, r in rep.items():
    im = Image.open(A / nombre); im.thumbnail((440, 480))
    b.paste(im, (x, 40))
    d.text((x, 540), nombre[:34], font=f, fill=(244, 244, 244))
    d.text((x, 572), f"{r['px'][0]}×{r['px'][1]} px", font=f, fill=(225, 37, 27))
    x += 465
(R / 'review' / 'fase1').mkdir(parents=True, exist_ok=True)
b.save(R / 'review' / 'fase1' / 'inventario_assets.jpg', quality=90)
print(json.dumps({k: v['px'] for k, v in rep.items()}))
