# Maison Rose · pieza spec de Elevate Negocios

Demo de cortesía, no oficial: video vertical "El pliegue" y la página que tendría Maison Rose (repostería y panadería francesa, Plaza Periférika, San Jerónimo, Monterrey).

## Estructura
- `prompt/index.html` — el prompt original del video.
- `assets/` — las 11 capturas originales; `assets/recortes/` son los recortes aprobados, a su resolución útil.
- `brief/` — brief de la fase 2, voz bloqueada (fase 3) y `timeline.json` (cuadros de cada frase y palabra).
- `voz/` — guion, toma original y stem procesado a −16 LUFS.
- `video/render/escena.js` — toda la pieza en Canvas 2D: `draw(t)` determinista, 8 subcuadros de motion blur.
- `audio/` — música (FluidSynth + síntesis), 98 SFX y mezcla, todo en código.
- `web/index.html` — la página (un solo HTML con CSS y JS). Datos editables arriba del script: `NEGOCIO` y `MENU`.
- `dist/maison-rose.html` — la página en un solo archivo, con fotos y fuentes incrustadas.
- `review/` — tableros de revisión, preview y pruebas de la página.
- `entrega/` — lo que se le manda a la dueña.

## Comandos
```bash
python3 tools/recortes.py      # recortes de assets
python3 tools/voz.py           # voz a la línea de tiempo → voz/voz_stem_48k.wav y brief/timeline.json
python3 audio/musica.py && python3 audio/sfx.py && python3 audio/mezcla.py
bash video/preview.sh          # cuadros del preview (720 × 1280, 30 fps) en video/build/prev
node tools/fotos.mjs           # prueba la página en 390 × 844, capturas, láminas y dist/
```
Requiere: Node con Playwright, ffmpeg, Python con numpy, scipy, mido y Pillow, FluidSynth con FluidR3_GM.

## Datos
Solo datos publicados por el negocio. La página no muestra precios ("$ —"), teléfono ni horario ("Tu horario aquí") hasta confirmarlos con la dueña. Sin número de WhatsApp configurado, el botón de enviar muestra el mensaje en lugar de abrir WhatsApp.
