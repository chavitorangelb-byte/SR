# Arma un video de revisión con los cuadros de tools/captura.mjs: dibuja el dedo (toques, arrastres y tecleo)
# encima de las texturas limpias y codifica H.264 a 60 fps. Las texturas no se tocan: el dedo solo va en este preview.
# Uso: python3 tools/preview.py build/captura_fase0 review/fase0/recorrido_60fps.mp4 [--ancho 780]
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

src = Path(sys.argv[1])
out = Path(sys.argv[2])
ancho = int(sys.argv[sys.argv.index('--ancho') + 1]) if '--ancho' in sys.argv else 780
meta = json.loads((src / 'meta.json').read_text())
frames = sorted(src.glob('f*.jpg'))
first = Image.open(frames[0])
esc = ancho / meta['viewport']['width']   # px de salida por px CSS
alto = round(meta['viewport']['height'] * esc)
alto += alto % 2

SS = 4  # supermuestreo para un círculo suave


def dedo_sprite(r_css, presionado):
    r = r_css * esc * SS
    s = int(r * 2 + 8 * SS)
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = s / 2
    rr = r * (0.9 if presionado else 1.0)
    d.ellipse((c - rr, c - rr, c + rr, c + rr), fill=(27, 27, 27, 70), outline=(255, 255, 255, 235), width=int(2.2 * esc * SS))
    return im.resize((s // SS, s // SS), Image.LANCZOS)


SPR = {True: dedo_sprite(20, True), False: dedo_sprite(20, False)}

out.parent.mkdir(parents=True, exist_ok=True)
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{ancho}x{alto}', '-r', str(meta['fps']), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)], stdin=subprocess.PIPE)
for fpath in frames:
    f = int(fpath.stem[1:])
    im = Image.open(fpath).convert('RGB').resize((ancho, alto), Image.LANCZOS)
    dd = meta['frames'].get(str(f), {}).get('dedo')
    if dd and dd['a'] > 0.01:
        sp = SPR[bool(dd['p'])].copy()
        a = sp.getchannel('A').point(lambda v: int(v * max(0, min(1, dd['a']))))
        sp.putalpha(a)
        x, y = dd['x'] * esc - sp.width / 2, dd['y'] * esc - sp.height / 2
        im.paste(sp, (round(x), round(y)), sp)
    ff.stdin.write(im.tobytes())
ff.stdin.close()
ff.wait()
print(out, f'{ancho}×{alto}', len(frames), 'cuadros', f'{out.stat().st_size / 1e6:.1f} MB')
