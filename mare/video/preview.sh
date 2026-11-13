#!/usr/bin/env bash
# Preview completo: cuadros de video/build/prev (540×960, 30 fps) + mezcla master → entrega/mare-reposteria_preview_9x16.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -v error -y -framerate 30 -i video/build/prev/%05d.png -i audio/build/mezcla_master.wav \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf 17 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 192k -shortest -movflags +faststart \
  entrega/mare-reposteria_preview_9x16.mp4
