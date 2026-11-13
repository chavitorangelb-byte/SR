#!/usr/bin/env bash
# Corta la toma de voz por sus silencios y coloca cada bloque en su segundo del video.
# Uso: bash video/audio/montar_voz.sh   (desde tcb/)
set -e
cd "$(dirname "$0")/.."
V=audio/voz-toma1.mp3
# bloque: inicio_en_toma  fin_en_toma  segundo_en_video
B=("0.00 4.95 0.60" "5.40 10.50 6.40" "10.78 13.48 13.90" "13.72 15.83 16.90" "16.04 22.27 20.80" "22.44 26.51 29.20")
F=""; M=""; i=0
for b in "${B[@]}"; do set -- $b; d=$(awk "BEGIN{print int($3*1000)}"); l=$(awk "BEGIN{print $2-$1-0.06}")
  F+="[0:a]atrim=$1:$2,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=$l:d=0.06,adelay=$d:all=1[a$i];"; M+="[a$i]"; i=$((i+1)); done
ffmpeg -y -loglevel error -i "$V" -filter_complex "${F}${M}amix=inputs=$i:normalize=0,apad=whole_dur=36,atrim=0:36,loudnorm=I=-15:TP=-1.5:LRA=9,aresample=48000[o]" -map "[o]" -ac 2 audio/voz-montada.wav
for f in vertical horizontal; do
  ffmpeg -y -loglevel error -i salida/tcb-promo-$f.mp4 -i audio/voz-montada.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart salida/tcb-promo-$f-con-voz.mp4
done
echo listo
