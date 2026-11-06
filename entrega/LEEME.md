# Entrega · Florería Aguascalientes Roma

Demo de cortesía de Elevate Negocios · pieza no oficial.

## Video (28 s)

| Archivo | Formato | Uso |
| --- | --- | --- |
| `floreria-roma_9x16_master_60fps.mp4` | 1080×1920, 60 fps, H.264 alta calidad, AAC 320k | master vertical (Reels, TikTok, Stories) |
| `floreria-roma_9x16_whatsapp_30fps.mp4` | 1080×1920, 30 fps, H.264 `-preset veryfast`, ≤ 4 Mb/s, AAC 128k | enviar por WhatsApp |
| `floreria-roma_1x1_master_60fps.mp4` | 1080×1080, 60 fps | master cuadrado (feed) |
| `floreria-roma_1x1_whatsapp_30fps.mp4` | 1080×1080, 30 fps, `-preset veryfast` | cuadrado para WhatsApp |

Audio del master: −14 LUFS integrados, pico verdadero ≤ −1.25 dBTP; la música queda al menos 12 dB bajo cada palabra.

## Stems (`stems/`, WAV 48 kHz)

- `voz.wav`, `musica.wav`, `sfx.wav`: ya con ducking y ganancia del master; sumados dan la mezcla antes del limitador.
- `mezcla_master.wav`: la mezcla final del video.

## Página

- `floreria-roma.html`: la página completa en un solo archivo (imágenes y fuentes incluidas). Se abre en cualquier navegador; el catálogo arma el pedido y lo manda al WhatsApp de la florería.

## Rehacer

Todo sale del código del repo: `bash video/finales.sh 916` y `bash video/finales.sh 11` (render reanudable y codificación), `audio/` para música, SFX y mezcla.
