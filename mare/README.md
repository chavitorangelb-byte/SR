# MaRe Repostería · pieza spec de Elevate Negocios

Demo de cortesía, no oficial: video vertical "El hilo de chocolate" y la página que tendría MaRe.

## Estructura
- `brief/` — prompt original, brief con tiempos por cuadro (`brief_fase2.md`) y `timeline.json` bloqueado a la voz (23 s, 1380 cuadros a 60 fps).
- `assets/` — los 12 archivos del prompt, sin tocar (el 12 es solo referencia).
- `voz/` — toma de ElevenLabs, guion, stem a −16 LUFS y preview con pulso.
- `video/render/engine.js` — motor determinista `frame(t)`: una cámara, un campo líquido SDF en WebGL, cristal real, isométrico y kinetic type por glifo.
- `audio/audio.py` — música (120 BPM), 105 SFX y mezcla (−14 LUFS, −1.25 dBTP como máximo), todo en código.
- `web/index.html` — la página en vista de celular; `tools/fotos_pagina.mjs` saca las capturas y las láminas.
- `entrega/` — preview, fotos y mensaje para la dueña.

## Comandos
```bash
python3 tools/voz.py                      # corta la voz y escribe brief/timeline.json
python3 audio/audio.py                    # música, SFX y mezcla → audio/build/
node video/render.mjs --cuadros video/build/prev --fps 30 --desde 0 --hasta 1378 --w 540 --h 960   # cuadros del preview
bash video/preview.sh                     # arma entrega/mare-reposteria_preview_9x16.mp4
node tools/fotos_pagina.mjs               # fotos de la página → entrega/fotos/
```

## Pendiente
Finales a 1080×1920 a 60 fps, versión WhatsApp a 30 fps y re-layout 1:1 (el motor ya trae la disposición base del 1:1, pero las escenas de 6 a 23 s solo están compuestas para 9:16).
