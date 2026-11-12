#!/usr/bin/env python3
"""Arma la página en un solo archivo (imágenes y fuentes incrustadas): entrega/cata-cafe.html."""
import base64, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / 'web/index.html').read_text()
MIME = {'.png': 'image/png', '.woff2': 'font/woff2'}
def data(m):
    f = ROOT / 'web' / m.group(1)
    return f'data:{MIME[f.suffix]};base64,' + base64.b64encode(f.read_bytes()).decode()
html = re.sub(r'(?<=["(])((?:img|fonts)/[\w.-]+)(?=[")])', data, html)
html = html.replace('`<button class="glass" aria-pressed="false"><img src="img/${IMG[m]}.png" alt="">', '`<button class="glass" aria-pressed="false"><img src="${SRC[IMG[m]]}" alt="">')
html = html.replace('<img src="img/tueste_${i + 1}.png"', '<img src="${SRC[\'tueste_\' + (i + 1)]}"')
src = {n: 'data:image/png;base64,' + base64.b64encode((ROOT / f'web/img/{n}.png').read_bytes()).decode() for n in ['v60', 'chemex', 'prensa'] + [f'tueste_{i}' for i in range(1, 6)]}
import json
html = html.replace('<script>\n// ===== Datos', '<script>\nconst SRC = ' + json.dumps(src) + ';\n// ===== Datos')
assert 'img/' not in html.replace('data:image', ''), 'quedan rutas sin incrustar'
out = ROOT / 'entrega/cata-cafe.html'; out.write_text(html); print(out.name, round(out.stat().st_size / 1024), 'KB')
