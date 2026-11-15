# DeliciArte Pastelería · video spec de Elevate Negocios

Pieza de cortesía, no oficial: video de 16 s + 2 s de end card (9:16 y 1:1) hecho en código.
El prompt completo está en `prompt/index.html`; el brief, en `brief/brief_fase2.md`.

## Estructura
- `assets/originales/`: los 8 assets tal como llegaron (capturas de Instagram).
- `assets/preparados/`: los que usa el video: recortes, logo en círculo con transparencia y zonas con texto desenfocadas. No se recolorean ni se rellenan.
- `assets/assets_report.json`: medidas, nitidez, tamaño máximo en pantalla y tratamiento de cada asset.
- `brief/timeline.mjs`: la línea de tiempo (cuadros a 60 fps), fuente única para el render, los SFX y la música. `brief/timeline.json` se genera a partir de ella.
- `video/render/escena.js`: `frame(t)` determinista con la línea de betún (campo de distancia sombreado como tubo), el celular de cristal, los paneles, el kinetic type y la end card.
- `video/render.mjs`: render cuadro por cuadro en Chromium (WebGL por CPU), con 8 subcuadros por cuadro.
- `audio/`: música (`musica.py`), SFX (`sfx.py`) y mezcla (`mezcla.py`), todo en código.
- `voz/`: guion para ElevenLabs y, en la fase 3, la toma procesada y `voz.json` con el cuadro de cada palabra.
- `tools/`: preparación de assets, exportación de la línea de tiempo y bloqueo de la voz.
- `review/`: tableros, prueba de estilo y previews.

## Comandos
```bash
python3 deliciarte/tools/preparar_assets.py                     # fase 1
python3 deliciarte/tools/voz.py voz/fuente/toma1.mp3 voz/fuente/toma2.mp3   # fase 3 (desde deliciarte/)
node deliciarte/tools/exportar_timeline.mjs                     # timeline.json (con la voz real si existe)
python3 deliciarte/audio/musica.py && python3 deliciarte/audio/sfx.py && python3 deliciarte/audio/mezcla.py
cd deliciarte && node video/render.mjs --desde 0 --hasta 240 --fps 30 --w 540 --h 960 --out review/fase5/prueba_estilo_540.mp4
```

Requisitos de audio: `pip install scipy mido` y `apt-get install fluidsynth fluid-soundfont-gm`. Para el video: `npm install` dentro de `video/`.

## Estado
- Fases 1, 2, 4 y 5: listas.
- Música y SFX: 110 cues; mezcla final −14.1 LUFS / −1.4 dBTP, música ≥ 12.7 dB bajo cada frase.
- Fases 6 y 7: preview con voz y finales 9:16 y 1:1 (master 60 fps y WhatsApp 30 fps) en `entrega/`.
- Fase 3: voz bloqueada a la toma "Hope" (eleven v4); la pieza quedó en 19 s (16.5 + 2.5).
