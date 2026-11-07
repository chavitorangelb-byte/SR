#!/usr/bin/env bash
# Codifica un final a partir de su carpeta de cuadros (60 fps, PNG sRGB) y la mezcla master.
# Uso: bash video/codificar.sh <carpeta_cuadros> <nombre_base>
#   → entrega/<nombre_base>_master_60fps.mp4   (H.264 High, CRF 14, AAC 320k)
#   → entrega/<nombre_base>_whatsapp_30fps.mp4 (H.264 -preset veryfast, ≤ 4 Mb/s, AAC 128k; pares de cuadros promediados)
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="$1"; BASE="$2"
AUD=audio/build/mezcla_master.wav
COLOR=(-colorspace bt709 -color_primaries bt709 -color_trc bt709)
mkdir -p entrega
ffmpeg -y -v error -framerate 60 -i "$DIR/%05d.png" -i "$AUD" -map 0:v -map 1:a \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 14 -profile:v high "${COLOR[@]}" \
  -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart "entrega/${BASE}_master_60fps.mp4"
ffmpeg -y -v error -framerate 60 -i "$DIR/%05d.png" -i "$AUD" -map 0:v -map 1:a \
  -vf "tmix=frames=2,select='mod(n\,2)',setpts=N/(30*TB),scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -r 30 \
  -c:v libx264 -preset veryfast -crf 22 -maxrate 4M -bufsize 8M -profile:v high "${COLOR[@]}" \
  -c:a aac -b:a 128k -ar 48000 -ac 2 -shortest -movflags +faststart "entrega/${BASE}_whatsapp_30fps.mp4"
ls -la "entrega/${BASE}"_*.mp4
