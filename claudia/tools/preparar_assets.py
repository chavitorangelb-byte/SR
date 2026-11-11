"""Prepara los assets de Claudia con los nombres del brief.
Uso: python3 -I claudia/tools/preparar_assets.py <carpeta del ZIP extraído> <carpeta con imágenes de facebook-portada.pdf (pdfimages -png)>
Solo recorta y reduce; nunca amplía, retoca ni recolorea."""
import sys, json
from pathlib import Path
from PIL import Image, ImageChops

src, fb = Path(sys.argv[1]), Path(sys.argv[2])
out = Path(__file__).resolve().parents[1] / 'assets'
rep = {}

# Logo: recorte de la portada de Facebook (820x312), solo libélula + nombre + "REPOSTERÍA CASERA".
cover = Image.open(fb / 'i-001.png').convert('RGB')
zona = cover.crop((0, 0, 820, 204))            # deja fuera iconos, @ y teléfono
bbox = ImageChops.difference(zona, Image.new('RGB', zona.size, 'white')).convert('L').point(lambda v: 255 if v > 12 else 0).getbbox()
m = 22
box = (bbox[0] - m, bbox[1] - m // 2, bbox[2] + m, min(204, bbox[3] + m // 2))
logo = cover.crop(box); logo.save(out / 'claudia-logo.png'); rep['claudia-logo.png'] = {'size': logo.size, 'origen': f'facebook-portada.pdf, recorte {box}'}
ins = Image.open(fb / 'i-002.png').convert('RGB'); ins.save(out / 'claudia-insignia.jpg', quality=95); rep['claudia-insignia.jpg'] = {'size': ins.size, 'origen': 'facebook-portada.pdf, foto de perfil'}

fotos = {'01-boda-barra.jpg': ('foto-pastel-boda-barra.jpg', (1200, 1600)), '02-cumpleanos-rosa.jpg': ('foto-pastel-cumpleanos-rosa.jpg', None),
         '03-calavera.jpg': ('foto-pastel-calavera.jpg', None), '04-cupcakes.jpg': ('foto-cupcakes-1.jpg', None)}
for dst, (s, size) in fotos.items():
    im = Image.open(src / 'fotos' / s).convert('RGB'); o = im.size
    if size: im = im.resize(size, Image.LANCZOS)
    im.save(out / dst, quality=93, subsampling=0); rep[dst] = {'size': im.size, 'origen': f'{s} {o}'}
(out / 'assets_report.json').write_text(json.dumps(rep, indent=1, ensure_ascii=False))
print(json.dumps(rep, indent=1, ensure_ascii=False))
