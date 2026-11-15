# Entrega · DeliciArte Pastelería

Demo de cortesía de Elevate Negocios · pieza no oficial y privada. No se publica sin permiso del negocio.

## Video (19 s: 16.5 s + 2.5 s de end card)

| Archivo | Formato | Uso |
| --- | --- | --- |
| `deliciarte_9x16_master_60fps.mp4` | 1080×1920, 60 fps, H.264 High CRF 14, AAC 320k | master vertical (Reels, TikTok, Stories) |
| `deliciarte_9x16_whatsapp_30fps.mp4` | 1080×1920, 30 fps, H.264 `-preset veryfast`, ≤ 4 Mb/s, AAC 128k | enviar por WhatsApp |
| `deliciarte_1x1_master_60fps.mp4` | 1080×1080, 60 fps (re-layout, no recorte) | master cuadrado (feed) |
| `deliciarte_1x1_whatsapp_30fps.mp4` | 1080×1080, 30 fps, `-preset veryfast` | cuadrado para WhatsApp |

**Audio del master:** −14.1 LUFS integrados y pico verdadero de −1.4 dBTP. En cada frase, la música queda al menos 12.7 dB debajo de la voz. La voz se procesó a −16 LUFS como stem; dentro del master, como elemento dominante, suena cerca de −14.

## Stems (`stems/`, WAV 48 kHz, 24 bits)

- `voz.wav`, `musica.wav` y `sfx.wav` ya llevan el ducking y la ganancia del master. Sumados dan la mezcla antes del limitador.
- `mezcla_master.wav` es la mezcla final del video.

## Antes de publicar

- **Fotos:** son capturas de su Instagram. Hay que pedir los originales al negocio, sobre todo de la 04 (rollos de canela) y de la 05 (corazón), que son las más suaves.
- **Logo:** hay que pedirlo en alta resolución. Hoy se usa a 640 px como máximo.
- **Rollos de canela:** en la foto 04 se ven crudos, todavía en el molde.
- **Datos que no aparecen en pantalla:** precios del negocio, teléfono, dirección, horario y usuario de Instagram, porque falta confirmarlos con el dueño.
- **Diseños con personajes:** salen como trabajo del local, sin nombrarlos. Los nombres escritos en los pasteles están desenfocados.

## Rehacer

Todo sale del código de `deliciarte/`. Para los finales: `bash deliciarte/video/finales.sh 916` y `bash deliciarte/video/finales.sh 11` (son reanudables). Para el audio: `python3 deliciarte/audio/{musica,sfx,mezcla}.py`. La voz: `python3 deliciarte/tools/voz.py voz/fuente/toma1_hope_eleven_v4.mp3`, ejecutado desde `deliciarte/`.
