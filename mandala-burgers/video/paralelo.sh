#!/usr/bin/env bash
# Render por tramos en paralelo (reanudable). Uso: bash video/paralelo.sh <carpeta> <w> <h> <fps> <trabajadores> [extra]
set -euo pipefail
cd "$(dirname "$0")"
DIR="$1"; W="$2"; H="$3"; FPS="$4"; NW="${5:-3}"; EXTRA="${6:-}"
TOTAL=1620; PASO=$((60 / FPS)); TRAMO=$(( (TOTAL / NW / PASO + 1) * PASO ))
for i in $(seq 0 $((NW - 1))); do
  A=$((i * TRAMO)); B=$((A + TRAMO - PASO)); [ $B -gt $((TOTAL - PASO)) ] && B=$((TOTAL - PASO))
  node render.mjs --cuadros "$DIR" --desde $A --hasta $B --fps "$FPS" --w "$W" --h "$H" $EXTRA > "/tmp/render_$i.log" 2>&1 &
done
wait
ls "../$DIR" | wc -l
