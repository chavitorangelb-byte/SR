#!/usr/bin/env bash
# Fase 7: render final reanudable de un formato (1080 de ancho, 60 fps, 8 subcuadros, dos procesos) y su codificación.
# Uso: bash video/finales.sh 916   → entrega/jumpers-fest_9x16_{master_60fps,whatsapp_30fps}.mp4
#      bash video/finales.sh 11    → entrega/jumpers-fest_1x1_{master_60fps,whatsapp_30fps}.mp4
# Si se corta, se vuelve a correr y sigue donde se quedó (los cuadros hechos se conservan en build/final_<formato>).
set -euo pipefail
cd "$(dirname "$0")/.."
FMT="${1:-916}"
if [ "$FMT" = 916 ]; then H=1920; NOMBRE=jumpers-fest_9x16; else H=1080; NOMBRE=jumpers-fest_1x1; fi
DIR="build/final_$FMT"
R=(node video/render.mjs --fmt "$FMT" --w 1080 --h "$H" --fps 60 --sub 8 --cuadros "$DIR")
"${R[@]}" --desde 0 --hasta 824 & "${R[@]}" --desde 825 --hasta 1649 & wait
N=$(find "$DIR" -name '*.png' | wc -l)
if [ "$N" -ne 1650 ]; then echo "faltan cuadros: $N/1650"; exit 1; fi
bash video/codificar.sh "$DIR" "$NOMBRE"
echo "FIN_$FMT"
