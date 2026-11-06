# Ana Gaby Repostería · pieza spec de Elevate Negocios

Demo de cortesía, no oficial: la página que tendría Ana Gaby Repostería (Los Bosques, Aguascalientes) y el video vertical de 28 s que la presenta. La interfaz del video se captura de esta misma página.

## Estructura
- `web/index.html`: la página real (un solo HTML responsive con CSS y JS dentro). Los datos editables están arriba del script: `NEGOCIO`, `CATALOGO`, `RESENAS`.
- `web/img`, `web/fonts`: fotos recortadas de su Instagram y de su ficha de Google; fuentes locales (Cormorant Garamond y DM Sans, licencia OFL).
- `dist/ana-gaby-reposteria.html`: la misma página en un solo archivo (fotos y fuentes incrustadas, abre sin internet).
- `dist/ana-gaby-reposteria-demo.html`: igual, en modo demo (muestra el mensaje y no le escribe al negocio).
- `assets/`: recortes con los nombres del brief (`foto_00` … `foto_12`, `logo_letrero_ag.png`) y `pastel_referencia_ilustrado.jpg` (pastel genérico hecho en código para el paso «A tu medida»).
- `3d/pastel.js`: el pastel de dos pisos en Three.js. Es el mismo modelo para la foto de referencia y para el pastel 3D del video.
- `tools/`: scripts reproducibles (recortes, render del pastel, archivo único, pruebas y tableros).
- `review/fase0/`: tableros de revisión, `resultados.json` de las pruebas, el mensaje de WhatsApp generado y la lista de palabras revisadas.

## Comandos
```bash
npm install                          # three.js (solo para el pastel 3D)
python3 tools/crop_assets.py         # requiere las capturas en assets/_capturas (no se versionan)
node tools/pastel_referencia.mjs     # assets/pastel_referencia_ilustrado.jpg
node tools/build_web.mjs             # dist/
node tools/test_web.mjs              # 51 pruebas en 390x844 + capturas en review/fase0
node tools/board.mjs                 # tableros de revisión
node tools/inventario.mjs            # fase 1: inventario de assets, límites de tamaño y faltantes
python3 tools/transcribir.py voz/fuente/toma_hope_eleven_v4.mp3 voz/fuente/toma_palabras.json small   # requiere faster-whisper
python3 tools/voz_medir.py           # inicio/fin reales de cada frase y tiempo de cada palabra → voz/fuente/toma_frases.json
node tools/brief.mjs                 # fase 2: brief/timeline.json y brief/brief_fase2.md
python3 tools/voz.py                 # fase 3: voz bloqueada (voz/voz_stem_48k.wav, −16 LUFS) y preview con pulso; correr después de brief.mjs
node tools/preview_voz.mjs           # fase 3: línea de tiempo con cursor (voz/preview_voz.mp4, review/fase3/linea_voz.jpg)
node video/captura.mjs --desde 190 --hasta 490      # fase 4: la página real cuadro por cuadro a 3x (texturas de la pantalla)
node video/render.mjs --desde 190 --hasta 489 --ancho 540 --alto 960 --fps 30 --sub 8 --out review/fase4/prueba_estilo_540.mp4
node video/render.mjs --fotos 440 --ancho 1080 --alto 1920 --sub 8 --out review/fase4/cuadro_1080.png
node tools/hoja_prueba.mjs           # fase 4: hoja de contactos de la prueba de estilo
node tools/pastel_contorno.mjs       # fase 5: silueta del pastel de referencia que traza el betún (assets/pastel_contorno.json)
node tools/esqueleto_nombre.mjs      # fase 5: «Ana Gaby Repostería» en Cormorant → trazos de betún (video/fuentes/nombre_esqueleto.json)
node video/captura.mjs --desde 0 --hasta 1679      # pantallas de los 28 s (y --texturas: reseñas completas para el abanico)
python3 audio/musica.py              # música original a 98 BPM (audio/build/musica_stem.wav)
python3 audio/sfx.py                 # SFX sintetizados en los cuadros reales (audio/build/sfx_stem.wav y cues_sfx.json)
python3 audio/mezcla.py              # mezcla: ducking por palabra, master −14 LUFS / −1.25 dBTP y stems (audio/build/)
node video/render.mjs --desde 0 --hasta 1678 --ancho 540 --alto 960 --fps 30 --sub 4 --out review/fase6/preview_540.mp4
node tools/hoja_preview.mjs          # fase 6: hoja de 12 cuadros clave (antes: render.mjs --fotos … --ancho 1080 --alto 1920 --sub 8 --out review/fase6/_cuadros/p.png)
```

## Video (fases 4–7)
- `video/plan.mjs`: lo que le pasa a la página en cada cuadro (encender, scrolls con inercia y rebote) y qué piezas medir.
- `video/captura.mjs`: abre la página en `?captura=1` a 390×797 (+47 px de barra de estado = 844) y DSF 3; en cada cuadro aplica el plan y fija todas las animaciones CSS en su tiempo exacto (reloj virtual). Mismo cuadro → misma imagen.
- `video/render/`: escena Three.js con una función determinista por cuadro: fondo, celular de cristal, pantalla (captura sin tono), betún con volumen, tarjetas 3D recortadas de la captura y kinetic type por glifo. Cada cuadro acumula subcuadros con jitter de subpíxel (motion blur y antialias).
- `video/render.mjs`: maneja Chromium, lee cada cuadro y lo manda a ffmpeg; agrega el tramo de la mezcla final (o de la voz, si aún no hay mezcla).
- `video/fuentes/`: EMS Allure (fuente de un solo trazo, OFL) para la letra de betún y el esqueleto del nombre.
- `audio/`: música, SFX y mezcla en código. Los SFX siguen los toques, teclas y scrolls que registra la captura (`video/build/pantalla/medidas.json`).
`?demo=1` activa el modo demo. `?captura=1` deja la página lista para capturarla cuadro por cuadro (sin auto-avances ni scroll suave) y expone `window.AnaGaby`.

## Datos
Solo datos publicados por el negocio:
- Dirección, teléfono 449 406 3325 y 5.0: su ficha de Google.
- WhatsApp: el link de su Instagram (wa.link/1t41vl) abre `api.whatsapp.com/send?phone=5214494063325`, el mismo 449 406 3325.
- Horario: bio de Instagram (martes a viernes 11:30 am – 2:30 pm y 4:30 pm – 7:00 pm; sábado 11:00 am – 2:00 pm; domingo y lunes cerrado).
- Reseñas: texto exacto del brief, sin nombres, firmadas «Reseña en Google».
- Precios sin confirmar: «$ —». Sin número de reseñas, sin envío a domicilio, sin anticipación mínima.
