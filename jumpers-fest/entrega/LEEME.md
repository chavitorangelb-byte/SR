# Entrega · Jumpers Fest Ags

Demo de cortesía de Elevate Negocios · pieza no oficial. Todo usa solo lo que Jumpers Fest publicó en @jumpersfestags;
medidas, edades y precios quedan en blanco (`— m`, `—`, `$ —`) hasta confirmarlos con el dueño.

## Para mandar al dueño

- `mensaje_dueno_whatsapp.md`: el texto listo para pegar, el orden de envío, la respuesta si dice que sí, el seguimiento,
  una versión corta para DM de Instagram y lo que falta confirmar.
- `fotos/01_asi_se_veria_tu_pagina.jpg`, `fotos/02_aparta_tu_fecha_en_un_mensaje.jpg`, `fotos/03_asi_te_llega_cada_solicitud.jpg`:
  las tres láminas (2160 px de ancho), hechas con capturas reales de la página.
- `fotos/pantalla_*.jpg`: ocho capturas sueltas de la página en celular (1170 × 2532), de reserva.
- `recorrido_pagina_celular.mp4`: la página real en uso (21 s, 60 fps, sin audio), de reserva.

## Video (27.5 s)

| Archivo | Formato | Uso |
| --- | --- | --- |
| `jumpers-fest_9x16_master_60fps.mp4` | 1080 × 1920, 60 fps, H.264 High CRF 14, AAC 320k | master vertical (Reels, TikTok, Stories) |
| `jumpers-fest_9x16_whatsapp_30fps.mp4` | 1080 × 1920, 30 fps, H.264 `-preset veryfast`, ≤ 4 Mb/s, AAC 128k | el que se manda por WhatsApp |
| `jumpers-fest_1x1_master_60fps.mp4` | 1080 × 1080, 60 fps | master cuadrado (feed), re-layout propio, no recorte |
| `jumpers-fest_1x1_whatsapp_30fps.mp4` | 1080 × 1080, 30 fps, `-preset veryfast` | cuadrado para WhatsApp |

Audio del master: −14 LUFS integrados, pico verdadero −1.5 dBTP; la voz queda en −15.5 LUFS y la música al menos
12.8 dB bajo cada palabra.

## Stems (`stems/`, WAV 48 kHz, 24 bits)

- `voz.wav`, `musica.wav`, `sfx.wav`: ya con ducking y ganancia del master; sumados dan la mezcla antes del limitador.
- `mezcla_master.wav`: la mezcla final del video.

## Página

- `jumpers-fest.html`: la página completa en un solo archivo (fotos y fuentes incluidas). Se abre en cualquier navegador;
  "Aparta tu fecha" arma el mensaje y abre WhatsApp al 449 180 7242 (número de la bio, por confirmar).
- `jumpers-fest-demo.html`: igual, pero el botón final muestra el mensaje en vez de abrir WhatsApp. Es la que conviene
  enseñar en una llamada: no manda nada.

## Rehacer

Todo sale del código del proyecto: `bash video/finales.sh 916` y `bash video/finales.sh 11` (render reanudable en dos
procesos y codificación), `bash tools/entrega.sh` (página, stems, recorrido y fotos), `audio/` para música, SFX y mezcla.
