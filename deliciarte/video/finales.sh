#!/usr/bin/env bash
# Fase 7: render final reanudable de un formato (1080 de ancho, 60 fps, 8 subcuadros) y su codificación.
# Uso (desde cualquier carpeta): bash deliciarte/video/finales.sh 916   → entrega/deliciarte_9x16_{master_60fps,whatsapp_30fps}.mp4
#                                bash deliciarte/video/finales.sh 11    → entrega/deliciarte_1x1_{master_60fps,whatsapp_30fps}.mp4
# Si se corta, se vuelve a correr y sigue donde se quedó.
set -euo pipefail
cd "$(dirname "$0")/.."
FMT="$1"
TOTAL=$(node -e "import('./brief/timeline.mjs').then(m=>console.log(m.FRAMES))")
if [ "$FMT" = 916 ]; then H=1920; NOMBRE=deliciarte_9x16; else H=1080; NOMBRE=deliciarte_1x1; fi
DIR="video/build/final_$FMT"
node video/render.mjs --fmt "$FMT" --w 1080 --h "$H" --fps 60 --sub 8 --desde 0 --hasta $((TOTAL - 1)) --cuadros "$DIR"
N=$(find "$DIR" -name '*.png' | wc -l)
if [ "$N" -ne "$TOTAL" ]; then echo "faltan cuadros: $N/$TOTAL"; exit 1; fi
bash video/codificar.sh "$DIR" "$NOMBRE"
echo "FIN_$FMT"
