#!/usr/bin/env bash
# Mezcla final: la música baja sola cuando entra la voz (sidechain) y se une a los dos videos.
# Uso: bash video/audio/montar_voz.sh && python3 video/audio/musica.py && bash video/audio/montar_audio.sh   (desde tcb/)
set -e
cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error -i audio/musica.wav -i audio/voz-montada.wav -filter_complex \
 "[1:a]asplit=2[vz][llave];[0:a]volume=0.55[mu];[mu][llave]sidechaincompress=threshold=0.02:ratio=9:attack=15:release=420:makeup=1[mud];[mud][vz]amix=inputs=2:normalize=0,alimiter=limit=0.89,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[o]" \
 -map "[o]" -ac 2 audio/mezcla-final.wav
for f in vertical horizontal; do
  ffmpeg -y -loglevel error -i salida/tcb-promo-$f.mp4 -i audio/mezcla-final.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart salida/tcb-promo-$f-final.mp4
done
echo listo
