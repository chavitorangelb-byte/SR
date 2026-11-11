# Mandala Burgers · pieza spec de Elevate Negocios

Demo de cortesía, no oficial: la página renovada de Mandala Burgers ("burgers de colores", Aguascalientes) y el video vertical de 27 s que la presenta. Todo se genera en código.

## Estructura
- `config/negocio.json`: datos de contacto y textos del end card. Se cambian aquí, sin tocar el código.
- `brief/timeline.json`: tiempos por cuadro (60 fps), voz y kinetic type ya bloqueados a la locución.
- `web/`: la página real (`index.html`, filtro por color de pan, enlace `wa.me`), menú (`menu.js`), ilustraciones en código (`ilustra.js`) y fuentes OFL en local (Fredoka y Nunito).
- `video/captura.mjs`: captura la página con Playwright como piezas con fondo transparente (`build/ui`).
- `video/render/`: motor del video. `escena.js` (función de cuadro determinista, 8 subcuadros de motion blur) y `cinta.js` (la cinta por campos de distancia en WebGL2).
- `audio/`: música (`musica.py`), SFX (`sfx.py`, con `hoja_cues.md`) y mezcla (`mezcla.py`), todo sintetizado.
- `voz/`: toma de ElevenLabs y stem colocado en la línea de tiempo (`tools/voz.py`).
- `review/`: pruebas y hojas de contacto por fase.

## Comandos
```bash
cd build && npm i @fontsource/fredoka @fontsource/nunito   # solo para volver a copiar las fuentes
python3 tools/voz.py                 # voz → línea de tiempo
node video/captura.mjs               # página → build/ui
python3 audio/sfx.py && python3 audio/musica.py && python3 audio/mezcla.py
node video/render.mjs --solo 500 --w 1080 --h 1920 --out review/cuadro.png
bash video/paralelo.sh build/frames_preview_540 540 960 30 4   # cuadros en paralelo (reanudable)
```
Requiere Node con Playwright y Chromium, ffmpeg, Python con numpy, scipy y Pillow.

## Datos
Solo datos de su propia página, su perfil de WhatsApp Business y su Instagram (ver `ref/`). Precios del 10-nov-2026: el dueño debe confirmarlos antes de enseñar la pieza. Las fotos de clientes de Google Maps no se usan ni se versionan.
